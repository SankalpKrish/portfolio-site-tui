struct Particle {
  pos: vec2<f32>,
  vel: vec2<f32>,
  color: vec3<f32>,
}

struct Uniforms {
  time:    f32,
  phase:   f32,
  mouse:   vec2<f32>,
  attract: f32,
  aspect:  f32,
  _pad1:   f32,
  textRect: vec4<f32>,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform>       uniforms:  Uniforms;

struct VSOut {
  @builtin(position) pos:   vec4<f32>,
  @location(0)       color: vec3<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  let p = particles[vi];
  let ndc = p.pos * 2.0 - vec2(1.0);
  var out: VSOut;
  out.pos   = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  out.color = p.color;
  return out;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  return vec4(in.color, 0.75);
}
