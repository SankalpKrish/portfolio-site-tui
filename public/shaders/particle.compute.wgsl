struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
}

struct Uniforms {
  time:    f32,
  scroll:  f32,
  mouse:   vec2<f32>,
  attract: f32,
  canvas:  vec2<f32>,
  _pad:    vec2<f32>,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform>             uniforms:  Uniforms;
@group(0) @binding(2) var<storage, read>       targets:   array<vec2<f32>>;

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

  // Noise drift
  let nx = hash(i * 1973u + u32(uniforms.time * 100.0)) * 2.0 - 1.0;
  let ny = hash(i * 9277u + u32(uniforms.time * 100.0)) * 2.0 - 1.0;
  p.vel += vec2(nx, ny) * 0.002;

  // Mouse attraction within radius
  let toMouse = uniforms.mouse - p.pos;
  if dot(toMouse, toMouse) < 0.04 {
    p.vel += normalize(toMouse) * 0.004;
  }

  // SDF target convergence on load
  if uniforms.attract > 0.0 {
    let t = targets[i % arrayLength(&targets)];
    p.vel += (t - p.pos) * uniforms.attract * 0.05;
  }

  p.vel *= 0.96;
  let spd = length(p.vel);
  if spd > 0.008 { p.vel = normalize(p.vel) * 0.008; }
  p.pos += p.vel * 0.016 * 60.0;

  // Wrap
  if p.pos.x < 0.0 { p.pos.x += 1.0; }
  if p.pos.x > 1.0 { p.pos.x -= 1.0; }
  if p.pos.y < 0.0 { p.pos.y += 1.0; }
  if p.pos.y > 1.0 { p.pos.y -= 1.0; }

  particles[i] = p;
}
