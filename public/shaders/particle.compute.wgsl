struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
  color: vec3<f32>,
}

struct Uniforms {
  time:    f32,
  phase:   f32, // 1.0 = text, 2.0 = Sans logo, 3.0 = disperse
  mouse:   vec2<f32>,
  attract: f32,
  aspect:  f32,
  _pad1:   f32,
  textRect: vec4<f32>, // x: left, y: top, z: width, w: height
}

struct SansTarget {
  pos: vec2<f32>,
  color: vec3<f32>,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform>             uniforms:  Uniforms;
@group(0) @binding(2) var<storage, read>       targets:   array<vec2<f32>>;
@group(0) @binding(3) var<storage, read>       sansTargets: array<SansTarget>;

fn hash(n: u32) -> f32 {
  var x = n;
  x ^= x >> 16u;
  x *= 0x45d9f3bu;
  x ^= x >> 16u;
  return f32(x) / 4294967295.0;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if i >= arrayLength(&particles) { return; }

  var p = particles[i];

  // 1. Noise drift (only active in Phase 2 and 3)
  var noise_scale = 0.0;
  if uniforms.phase == 2.0 {
    noise_scale = 0.0005;
  } else if uniforms.phase == 3.0 {
    noise_scale = 0.003;
  }
  let nx = hash(i * 1973u + u32(uniforms.time * 100.0)) * 2.0 - 1.0;
  let ny = hash(i * 9277u + u32(uniforms.time * 100.0)) * 2.0 - 1.0;
  p.vel += vec2(nx, ny) * noise_scale;

  // 3. Multi-phase Target convergence & Color shifts
  let spd = length(p.vel);
  let lavender = vec3(0.706, 0.749, 0.996); // #b4befe
  let teal     = vec3(0.580, 0.886, 0.835); // #94e2d5

  if uniforms.phase == 1.0 {
    // Phase 1: Lock exactly on absolute screen coordinates!
    if uniforms.attract > 0.0 {
      let t = targets[i % arrayLength(&targets)];
      let target_pos = t;
      p.vel += (target_pos - p.pos) * uniforms.attract * 0.05;
    }

    // Pure white particles to match DOM text perfectly
    p.color = vec3<f32>(1.0, 1.0, 1.0);

  } else if uniforms.phase == 2.0 {
    // Phase 2: Converge on the Sans sprite. Targets already arrive as
    // viewport fractions with the sprite sitting on whole device pixels, so no
    // per-axis rescale happens here: a fractional one is what smeared the
    // mascot into horizontal scanlines.
    let sans = sansTargets[i % arrayLength(&sansTargets)];
    let target_pos = sans.pos;
    
    let toTarget = target_pos - p.pos;
    let distSq = dot(toTarget, toTarget);
    
    if distSq < 0.000025 { // snap proximity check (0.005 units)
      p.pos = target_pos;
      p.vel = vec2<f32>(0.0, 0.0);
    } else {
      if uniforms.attract > 0.0 {
        p.vel += toTarget * uniforms.attract * 0.08;
      }
    }

    // Dynamically blend colors to match the actual Sans logo image colors!
    p.color = mix(p.color, sans.color, 0.03);

  } else {
    // Phase 3: Disperse particles, keeping them pure white
    p.color = vec3<f32>(1.0, 1.0, 1.0);
  }

  // 4. Update position & velocity with dynamic speed limits
  p.vel *= 0.96;
  let current_spd = length(p.vel);
  var max_spd = 0.008;
  if uniforms.phase == 2.0 {
    max_spd = 0.010;
  } else if uniforms.phase == 3.0 {
    max_spd = 0.016;
  }
  if current_spd > max_spd { p.vel = normalize(p.vel) * max_spd; }
  p.pos += p.vel * 0.016 * 60.0;

  // Wrap
  if p.pos.x < 0.0 { p.pos.x += 1.0; }
  if p.pos.x > 1.0 { p.pos.x -= 1.0; }
  if p.pos.y < 0.0 { p.pos.y += 1.0; }
  if p.pos.y > 1.0 { p.pos.y -= 1.0; }

  particles[i] = p;
}
