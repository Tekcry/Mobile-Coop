/** Pattern ids shared by the shader plugin, avatar patterns and weapon camos. */
export const PATTERN_ID = {
  solid: 0,
  stripes: 1,
  camo: 2,
  digital: 3,
  tiger: 4,
  checker: 5,
  carbon: 6,
  hex: 7,
} as const;
export type PatternName = keyof typeof PATTERN_ID;

/** GLSL for procedural patterns. `p` is the fragment position in part-local metres. */
export const PATTERN_GLSL = /* glsl */ `
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 applyPattern(vec3 c1, vec3 c2, vec4 pat, vec3 p) {
  float id = floor(pat.x + 0.5);
  float s = max(pat.y, 0.01);
  vec3 q = p / s;
  // fold 3D into 2D so every face gets a pattern
  vec2 uv = vec2(q.x + q.z * 0.7, q.y + q.z * 0.3);
  float m = 0.0;
  if (id < 0.5) return c1;
  else if (id < 1.5) m = step(0.5, fract(uv.y * 4.0));
  else if (id < 2.5) {
    float n = pNoise(uv * 3.0) * 0.65 + pNoise(uv * 7.0) * 0.35;
    if (n > 0.62) return c2;
    if (n > 0.46) return mix(c1, c2, 0.45);
    return c1;
  }
  else if (id < 3.5) {
    float n = pHash(floor(uv * 9.0));
    if (n > 0.66) return c2;
    if (n > 0.4) return mix(c1, c2, 0.5);
    return c1;
  }
  else if (id < 4.5) m = step(0.62, fract(uv.y * 3.0 + pNoise(uv * 4.0) * 1.2));
  else if (id < 5.5) m = mod(floor(uv.x * 4.0) + floor(uv.y * 4.0), 2.0);
  else if (id < 6.5) {
    vec2 g = fract(uv * 14.0);
    m = step(0.5, g.x) * 0.6 + step(0.5, g.y) * 0.4;
    return mix(c1, c2, m * 0.5);
  }
  else {
    vec2 h = abs(fract(uv * vec2(5.0, 8.66)) - 0.5);
    m = step(0.42, max(h.x * 1.6, h.y));
  }
  return mix(c1, c2, m);
}
`;
