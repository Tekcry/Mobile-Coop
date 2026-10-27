
#ifdef LAMP_TSHADOW
uniform highp sampler2D lampTsAtlas;
const vec2 TS_DISK[16] = vec2[16](vec2(-0.0623, 0.0658), vec2(0.7423, -0.6329), vec2(-0.5581, -0.7901), vec2(0.7648, 0.5020), vec2(-0.2144, 0.9728), vec2(-0.8872, -0.1767), vec2(-0.6277, 0.4273), vec2(0.1116, -0.7450), vec2(0.2431, 0.5950), vec2(0.4780, 0.0686), vec2(-0.3827, -0.4098), vec2(0.9034, -0.0428), vec2(-0.2022, 0.5054), vec2(0.1285, -0.3143), vec2(-0.4743, 0.0866), vec2(0.2890, 0.9441));
float nsTorchShadow(int s, vec3 p, vec3 gn, vec3 lpos) {
  vec4 P = lampTsP[s];
  if (P.w < 0.5) return 0.0;
  if (P.w > 1.5) return 1.0;
  vec3 q = p + gn * (0.0200 + 0.0040 * length(lpos - p));
  mat4 M = mat4(lampTsM[s * 4], lampTsM[s * 4 + 1], lampTsM[s * 4 + 2], lampTsM[s * 4 + 3]);
  vec4 c = M * vec4(q, 1.0);
  if (c.w <= 1e-4) return 1.0;
  vec2 uv = c.xy / c.w;
  if (abs(uv.x) >= 1.0 || abs(uv.y) >= 1.0) return 0.0;
  float z = (lampTsI.w * c.z + P.x) / P.y - P.z;
  if (z <= 0.0) return 1.0;
  float T = lampTsI.x;
  int n = int(lampTsI.y + 0.5);
  int nb = n / 2;
  vec2 org = vec2(float(s - (s / 2) * 2), float(s / 2)) * T;
  vec2 f = (uv * 0.5 + 0.5) * T;
  vec2 hiT = vec2(T - 1.0);
  float span = max(P.y - 2.0 * P.x, 0.01);
  float dr = c.w;
  float sx = length(vec3(M[0][0], M[1][0], M[2][0]));
  float tpm = 0.5 * T * sx / max(dr, 0.1500);
  float nearB = max(P.x, 0.1500);
  float sr = clamp(min(0.2500, 0.0500 * max(dr - nearB, 0.0) / nearB) * tpm, 1.5000, 16.0000);
  float zb = 0.0;
  float nbk = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= nb) break;
    float d = texelFetch(lampTsAtlas, ivec2(org + clamp(floor(f + TS_DISK[i] * sr), vec2(0.0), hiT)), 0).r;
    if (d < z) {
      zb += d;
      nbk += 1.0;
    }
  }
  if (nbk < 0.5) return 1.0;
  float db = clamp(dr - (z + P.z - zb / nbk) * span, nearB, max(dr, nearB));
  float r = clamp(min(0.2500, 0.0500 * (dr - db) / db) * tpm, 1.5000, 16.0000);
  float lit = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= n) break;
    lit += step(z, texelFetch(lampTsAtlas, ivec2(org + clamp(floor(f + TS_DISK[i] * r), vec2(0.0), hiT)), 0).r);
  }
  return mix(0.00, 1.0, lit / float(max(n, 1)));
}
bool nsTorchDoors(vec3 a, vec3 p, vec4 td) {
  for (int k = 0; k < 4; k++) {
    float did = td[k];
    if (did < 0.5) break;
    int db = int(lampMore.x) + (int(did + 0.5) - 1) * 2;
    if (nsDoorBlocks(a, p, lampTexel(db), lampTexel(db + 1))) return true;
  }
  return false;
}
#endif

#ifdef LAMP_TSHADOW
vec3 nsTorches(vec3 p, vec3 n, vec3 gn) {
  vec3 s = vec3(0.0);
  for (int c = 0; c < 4; c++) {
    vec4 ta = lampTorch[c * 4];
    if (ta.w <= 0.0) continue;
    vec4 tc = lampTorch[c * 4 + 2];
    vec3 L = ta.xyz - p;
    float d = length(L);
    if (d >= tc.w) continue;
    L /= max(d, 1e-4);
    vec4 tb = lampTorch[c * 4 + 1];
    float ca = d < 1e-4 ? 1.0 : dot(-L, tb.xyz);
    if (ca <= tb.w) continue;
    float ndl = dot(n, L);
    if (ndl <= 0.0) continue;
    if (nsTorchDoors(ta.xyz, p, lampTorch[c * 4 + 3])) continue;
    float sh = nsTorchShadow(c, p, gn, ta.xyz);
    if (sh <= 0.0) continue;
    s += tc.rgb * ((1.0 - d / tc.w) * nsLampCone(ca, tb.w, 2.0) * sh * ndl);
  }
  return s;
}
#else
vec3 nsTorches(vec3 p, vec3 n, vec3 gn) {
  vec3 s = vec3(0.0);
  for (int c = 0; c < 4; c++) {
    vec4 ta = lampTorch[c * 4];
    if (ta.w <= 0.0) continue;
    vec4 tc = lampTorch[c * 4 + 2];
    vec3 L = ta.xyz - p;
    float d = length(L);
    if (d >= ta.w || d >= tc.w) continue;
    L /= max(d, 1e-4);
    vec4 tb = lampTorch[c * 4 + 1];
    float ca = d < 1e-4 ? 1.0 : dot(-L, tb.xyz);
    if (ca <= tb.w) continue;
    float ndl = dot(n, L);
    if (ndl <= 0.0) continue;
    s += tc.rgb * ((1.0 - d / tc.w) * nsLampCone(ca, tb.w, 2.0) * min(1.0, (ta.w - d) / 0.20) * ndl);
  }
  return s;
}
#endif
