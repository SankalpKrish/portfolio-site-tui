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

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform>       uniforms:  Uniforms;

struct VSOut {
  @builtin(position) pos:   vec4<f32>,
  @location(0)       speed: f32,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  let p = particles[vi];
  let ndc = p.pos * 2.0 - vec2(1.0);
  var out: VSOut;
  out.pos   = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  out.speed = length(p.vel) / 0.008;
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  let lavender = vec3(0.706, 0.749, 0.996); // #b4befe
  let teal     = vec3(0.580, 0.886, 0.835); // #94e2d5
  let col = mix(lavender, teal, in.speed);
  return vec4(col, 0.75);
}
