import { Effect, ProceduralTexture, Texture, type Scene } from '../core/babylon';

/**
 * Procedural surface textures (3.0; the hard rule: no external art). Sixteen tileable surfaces are drawn on the
 * GPU once at load into two 4 x 4 atlases: `detail` (rgb = albedo variation round 0.5, a = roughness) and
 * `normal` (rg = tangent-space normal, b = height, a = cavity / AO). Every function is periodic over its tile, so
 * triplanar sampling (`SurfacePlugin`) tiles without seams. Size per tile: the Textures setting (1K / 2K / 4K).
 */
export const SURFACE_KINDS = [
  'concrete',
  'concreteFloor',
  'asphalt',
  'gravel',
  'grass',
  'plaster',
  'wood',
  'corrugated',
  'brushed',
  'rust',
  'tile',
  'carpet',
  'brick',
  'checker',
  'rubber',
  'fabric',
] as const;
export type SurfaceKind = (typeof SURFACE_KINDS)[number];
export const SURFACE_ID = Object.fromEntries(SURFACE_KINDS.map((k, i) => [k, i])) as Record<SurfaceKind, number>;

/** Per surface: metres per texture tile, metallic, how strongly the normal map bends the surface. */
export const SURFACE_PARAMS: Record<SurfaceKind, { tile: number; metal: number; bump: number }> = {
  concrete: { tile: 2.5, metal: 0, bump: 0.6 },
  concreteFloor: { tile: 3, metal: 0, bump: 0.45 },
  asphalt: { tile: 2, metal: 0, bump: 0.7 },
  gravel: { tile: 1.6, metal: 0, bump: 1 },
  grass: { tile: 2, metal: 0, bump: 0.8 },
  plaster: { tile: 2.5, metal: 0, bump: 0.5 },
  wood: { tile: 1.6, metal: 0, bump: 0.7 },
  corrugated: { tile: 1.2, metal: 0.35, bump: 1 },
  brushed: { tile: 1, metal: 0.85, bump: 0.25 },
  rust: { tile: 1.5, metal: 0.3, bump: 0.7 },
  tile: { tile: 1.2, metal: 0, bump: 0.8 },
  carpet: { tile: 1, metal: 0, bump: 0.5 },
  brick: { tile: 1.6, metal: 0, bump: 1 },
  checker: { tile: 0.8, metal: 0.8, bump: 1 },
  rubber: { tile: 1, metal: 0, bump: 0.3 },
  fabric: { tile: 0.25, metal: 0, bump: 0.5 },
};

/** Shared GLSL: periodic noise and the sixteen surfaces (height h, detail rgb, roughness). */
const LIB = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// value noise periodic over 'per' cells
float pnoise(vec2 p, float per) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(mod(i, per));
  float b = hash(mod(i + vec2(1.0, 0.0), per));
  float c = hash(mod(i + vec2(0.0, 1.0), per));
  float d = hash(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 uv, float base, int oct) {
  float s = 0.0; float a = 0.5; float per = base;
  for (int i = 0; i < 6; i++) {
    if (i >= oct) break;
    s += a * pnoise(uv * per, per);
    per *= 2.0; a *= 0.5;
  }
  return s;
}
// cellular (Worley) distance, periodic
float cells(vec2 uv, float per) {
  vec2 p = uv * per; vec2 i = floor(p); vec2 f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 h = hash2(mod(i + o, per));
    d = min(d, length(o + h - f));
  }
  return d;
}
// one surface at uv (0..1 over the tile): height, detail colour, roughness
void surf(int k, vec2 uv, out float h, out vec3 col, out float rough) {
  float n = fbm(uv, 4.0, 5);
  float fine = pnoise(uv * 64.0, 64.0);
  h = 0.5; col = vec3(0.5); rough = 0.8;
  if (k == 0) { // concrete wall: blotches, pores, stains
    float st = fbm(uv + 3.1, 2.0, 4);
    h = 0.5 + (n - 0.5) * 0.18 - step(0.9, fine) * 0.12;
    col = vec3(0.47 + (n - 0.5) * 0.1 - smoothstep(0.55, 0.8, st) * 0.05);
    rough = 0.82 + fine * 0.1;
  } else if (k == 1) { // concrete floor: smoother, polished wear, hairline cracks
    float cr = smoothstep(0.02, 0.0, abs(fbm(uv + 7.3, 3.0, 4) - 0.5));
    h = 0.5 + (n - 0.5) * 0.1 - cr * 0.08;
    col = vec3(0.47 + (n - 0.5) * 0.08 - cr * 0.06);
    rough = mix(0.62, 0.88, fbm(uv + 1.7, 2.0, 3)) + fine * 0.04;
  } else if (k == 2) { // asphalt: grain and aggregate
    float g = pnoise(uv * 128.0, 128.0);
    h = 0.5 + (g - 0.5) * 0.4;
    col = vec3(0.4 + g * 0.16 + (n - 0.5) * 0.1);
    rough = 0.88 + g * 0.08;
  } else if (k == 3) { // gravel: stones
    float c = cells(uv, 24.0);
    h = 0.3 + (1.0 - c) * 0.6;
    col = vec3(0.38 + (1.0 - c) * 0.22) * vec3(1.0, 0.97, 0.92) + (hash(floor(uv * 24.0)) - 0.5) * 0.08;
    rough = 0.92;
  } else if (k == 4) { // grass: blades
    float b = pnoise(vec2(uv.x * 96.0, uv.y * 24.0), 96.0);
    h = 0.4 + b * 0.4;
    col = vec3(0.42 + b * 0.18 + (n - 0.5) * 0.15);
    rough = 0.9;
  } else if (k == 5) { // plaster / stucco
    h = 0.5 + (pnoise(uv * 48.0, 48.0) - 0.5) * 0.25 + (n - 0.5) * 0.1;
    col = vec3(0.47 + (n - 0.5) * 0.12);
    rough = 0.88;
  } else if (k == 6) { // wood planks along u
    float plank = floor(uv.y * 6.0);
    float off = hash(vec2(plank, 3.0));
    float gap = smoothstep(0.0, 0.025, fract(uv.y * 6.0)) * smoothstep(0.0, 0.025, 1.0 - fract(uv.y * 6.0));
    float grain = sin((uv.y * 6.0 + pnoise(vec2(uv.x * 8.0 + off * 8.0, plank), 8.0) * 0.6) * 60.0) * 0.5 + 0.5;
    h = 0.35 + gap * (0.4 + grain * 0.15);
    col = vec3(0.42 + grain * 0.1 + (off - 0.5) * 0.14) * gap + vec3(0.2) * (1.0 - gap);
    rough = 0.62 + grain * 0.12;
  } else if (k == 7) { // corrugated painted metal: ribs, worn paint
    float rib = sin(uv.x * 6.2831853 * 10.0) * 0.5 + 0.5;
    float wear = smoothstep(0.62, 0.78, fbm(uv + 2.2, 3.0, 5));
    h = 0.3 + rib * 0.5;
    col = mix(vec3(0.5 + (n - 0.5) * 0.08), vec3(0.33, 0.3, 0.28), wear);
    rough = mix(0.5, 0.8, wear);
  } else if (k == 8) { // brushed metal: streaks
    float s = pnoise(vec2(uv.x * 4.0, uv.y * 256.0), 256.0);
    h = 0.5 + (s - 0.5) * 0.08;
    col = vec3(0.47 + s * 0.06);
    rough = 0.28 + s * 0.12;
  } else if (k == 9) { // rust: blotchy oxide over steel
    float r = smoothstep(0.35, 0.7, fbm(uv, 3.0, 6));
    h = 0.5 + (fine - 0.5) * 0.3 * r;
    col = mix(vec3(0.5), vec3(0.62, 0.38, 0.24), r) + (fine - 0.5) * 0.06;
    rough = mix(0.45, 0.92, r);
  } else if (k == 10) { // tiles with grout
    vec2 t = fract(uv * 4.0);
    float grout = smoothstep(0.0, 0.03, t.x) * smoothstep(0.0, 0.03, t.y) * smoothstep(0.0, 0.03, 1.0 - t.x) * smoothstep(0.0, 0.03, 1.0 - t.y);
    float tv = hash(floor(uv * 4.0));
    h = 0.35 + grout * 0.3;
    col = mix(vec3(0.3), vec3(0.5 + (tv - 0.5) * 0.06 + (n - 0.5) * 0.04), grout);
    rough = mix(0.85, 0.18 + fine * 0.08, grout);
  } else if (k == 11) { // carpet: fibres
    float f = pnoise(uv * 200.0, 200.0);
    h = 0.5 + (f - 0.5) * 0.3;
    col = vec3(0.47 + (f - 0.5) * 0.1 + (n - 0.5) * 0.06);
    rough = 0.98;
  } else if (k == 12) { // brick, running bond
    vec2 b = uv * vec2(4.0, 8.0);
    b.x += mod(floor(b.y), 2.0) * 0.5;
    vec2 f = fract(b);
    float mortar = smoothstep(0.0, 0.06, f.x) * smoothstep(0.0, 0.1, f.y) * smoothstep(0.0, 0.06, 1.0 - f.x) * smoothstep(0.0, 0.1, 1.0 - f.y);
    float bv = hash(mod(floor(b), vec2(4.0, 8.0)));
    h = 0.3 + mortar * (0.45 + (n - 0.5) * 0.1);
    col = mix(vec3(0.6), vec3(0.45 + (bv - 0.5) * 0.14 + (fine - 0.5) * 0.06), mortar);
    rough = 0.9;
  } else if (k == 13) { // checker plate
    vec2 p = fract(uv * 8.0) - 0.5;
    float a = mod(floor(uv.x * 8.0) + floor(uv.y * 8.0), 2.0) > 0.5 ? 1.0 : -1.0;
    float d = abs(p.x * 0.8 + a * p.y * 1.6);
    float lug = smoothstep(0.12, 0.05, d) * smoothstep(0.42, 0.3, length(p));
    h = 0.4 + lug * 0.45;
    col = vec3(0.48 + lug * 0.06 + (n - 0.5) * 0.06);
    rough = 0.35 + (n - 0.5) * 0.2;
  } else if (k == 14) { // rubber / plastic
    h = 0.5 + (fine - 0.5) * 0.06;
    col = vec3(0.5 + (n - 0.5) * 0.05);
    rough = 0.62;
  } else { // fabric weave
    vec2 w = uv * 64.0;
    float wx = sin(w.x * 3.14159) * 0.5 + 0.5;
    float wy = sin(w.y * 3.14159) * 0.5 + 0.5;
    float over = mod(floor(w.x) + floor(w.y), 2.0);
    h = 0.3 + mix(wx, wy, over) * 0.5;
    col = vec3(0.47 + (h - 0.5) * 0.12 + (n - 0.5) * 0.06);
    rough = 0.95;
  }
}
// the tile a pixel of the atlas belongs to and its uv inside (a padded border repeats the edge)
void atlasCell(vec2 vUV, out int k, out vec2 uv) {
  vec2 g = vUV * 4.0;
  vec2 cell = floor(g);
  k = int(cell.y) * 4 + int(cell.x);
  uv = fract(g);
}
`;

Effect.ShadersStore['surfaceDetailPixelShader'] = `
precision highp float;
varying vec2 vUV;
${LIB}
void main(void) {
  int k; vec2 uv; atlasCell(vUV, k, uv);
  float h; vec3 col; float rough;
  surf(k, uv, h, col, rough);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(rough, 0.02, 1.0));
}`;

Effect.ShadersStore['surfaceNormalPixelShader'] = `
precision highp float;
varying vec2 vUV;
uniform float texel;
${LIB}
void main(void) {
  int k; vec2 uv; atlasCell(vUV, k, uv);
  float h; vec3 col; float rough;
  float e = texel * 4.0;
  surf(k, uv, h, col, rough);
  float hx; float hy; vec3 c2; float r2;
  surf(k, fract(uv + vec2(e, 0.0)), hx, c2, r2);
  surf(k, fract(uv + vec2(0.0, e)), hy, c2, r2);
  vec3 nrm = normalize(vec3((h - hx) * 2.5, (h - hy) * 2.5, 1.0));
  // cavity: lower than the local average reads darker (baked AO)
  float avg = (h + hx + hy) / 3.0;
  float ao = clamp(0.75 + h * 0.5 - (avg - h) * 2.0, 0.0, 1.0);
  gl_FragColor = vec4(nrm.xy * 0.5 + 0.5, h, ao);
}`;

/** The two atlases (one per scene; regenerated when the Textures setting changes the tile size). */
export class SurfaceAtlas {
  detail!: ProceduralTexture;
  normal!: ProceduralTexture;
  private tile = 0;

  constructor(
    private scene: Scene,
    tileSize: number,
    aniso = 8,
  ) {
    this.setSize(tileSize, aniso);
  }

  /** Pixels per tile (the atlas is 4x, capped by the GPU) and anisotropic filtering; true when redrawn (frozen
   *  materials using it must re-bind). */
  setSize(tileSize: number, aniso: number, force = false): boolean {
    const changed = force || tileSize !== this.tile;
    if (changed) {
      this.tile = tileSize;
      this.detail?.dispose();
      this.normal?.dispose();
      const size = Math.min(this.scene.getEngine().getCaps().maxTextureSize, tileSize * 4);
      const make = (name: string, shader: string): ProceduralTexture => {
        const t = new ProceduralTexture(name, size, shader, this.scene, null, true, false);
        t.refreshRate = 0; // drawn once
        t.wrapU = Texture.WRAP_ADDRESSMODE;
        t.wrapV = Texture.WRAP_ADDRESSMODE;
        return t;
      };
      this.detail = make('surfaceDetail', 'surfaceDetail');
      this.normal = make('surfaceNormal', 'surfaceNormal');
      this.normal.setFloat('texel', 1 / (size / 4));
    }
    this.detail.anisotropicFilteringLevel = aniso;
    this.normal.anisotropicFilteringLevel = aniso;
    return changed;
  }

  dispose(): void {
    this.detail.dispose();
    this.normal.dispose();
  }
}
