import { MaterialPluginBase, type AbstractMesh, type BaseTexture, type Material, type MaterialDefines, type Scene, type SubMesh, type UniformBuffer } from '../core/babylon';
import { SURFACE_KINDS, SURFACE_PARAMS, type SurfaceAtlas } from '../world/surfaceAtlas';

/** The voxel behind a pixel: brick indirection, then the pool (0 = air). */
const VX_MAT_GLSL = `int vxMat(ivec3 v) {
  ivec3 b = v >> 3;
  ivec3 dims = ivec3(voxDims.xyz);
  if (v.x < 0 || v.y < 0 || v.z < 0 || b.x >= dims.x || b.y >= dims.y || b.z >= dims.z) return 0;
  vec4 ind = texelFetch(voxInd, b, 0);
  int a = int(ind.a * 255.0 + 0.5);
  if (a == 0) return 0;
  if (a == 254) return int(ind.r * 255.0 + 0.5);
  int slot = int(ind.r * 255.0 + 0.5) + int(ind.g * 255.0 + 0.5) * 256 + int(ind.b * 255.0 + 0.5) * 65536;
  ivec3 sp = ivec3(slot - (slot / 64) * 64, (slot / 64) - (slot / 4096) * 64, slot / 4096) * 8 + (v & 7);
  return int(texelFetch(voxPool, sp, 0).r * 255.0 + 0.5);
}`;

/** GLSL constants: per surface (metres per tile, metallic, bump, 0). */
const PARAMS_GLSL = `const vec4 VX_P[16] = vec4[16](${SURFACE_KINDS.map((k) => {
  const p = SURFACE_PARAMS[k];
  return `vec4(${p.tile.toFixed(3)}, ${p.metal.toFixed(3)}, ${p.bump.toFixed(3)}, 0.0)`;
}).join(', ')});`;

export interface VoxelTextures {
  /** Brick indirection (RGBA8, one texel per brick): a = 0 empty, 254 uniform (r = material), 255 explicit (rgb = slot). */
  index: BaseTexture;
  /** Explicit bricks (R8): 64 x 64 slots per layer, 8 x 8 x 8 texels each. */
  pool: BaseTexture;
  /** Palette (RGBA8, 256 x 2): row 0 rgb = sRGB colour, a = surface kind + 16 x emissive level; row 1 r = puddle. */
  palette: BaseTexture;
  /** Voxel (0,0,0) minimum corner, voxel size, brick grid size. */
  origin: [number, number, number];
  size: number;
  bricks: [number, number, number];
  /** Sky visibility (R8, linear; null: open sky everywhere) over `skyOrigin` in `skyCell` cells. */
  sky: BaseTexture | null;
  skyOrigin: [number, number, number];
  skyCell: number;
  skyDims: [number, number, number];
}

/**
 * PBR plugin for voxel chunk meshes (3.0). Meshes carry only flat faces; per pixel the voxel behind the face is
 * looked up in the GPU brickmap (indirection + brick pool) for its palette entry. On top: a per-voxel tone and
 * roughness variation, ambient occlusion and worn convex edges from the neighbouring voxels (`ao`), and the
 * procedural surface atlas as micro detail inside each face (`micro`: albedo variation, roughness, normals,
 * cavity), so a wall reads as concrete, not as cubes. Coarse levels of detail search a few voxels inward
 * (`search`) since their faces sit up to half a coarse voxel off the fine surface.
 */
export class VoxelPlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private tex: VoxelTextures,
    private atlas: SurfaceAtlas | null,
    private search: number,
    private ao: boolean,
    private micro: boolean,
  ) {
    super(material, 'Voxels', 180, { VOXELS: false, VOXEL_AO: false, VOXEL_MICRO: false });
    this._enable(true);
  }

  /** On a PBR material (else the cheap standard path: the palette colour per voxel only). Read from the material,
   *  not a field: the base constructor already collects the shader code, before a subclass field is set. */
  private get pbr(): boolean {
    return this._material.getClassName() === 'PBRMaterial';
  }

  /** Rain: upward faces darken and turn glossy (0..1; only where the sky reaches). */
  wet = 0;
  /** The fill light the hemisphere gave (the voxels take it themselves, scaled by sky visibility): sky (above) and
   *  ground (below) colour x intensity. */
  skyFill: [number, number, number] = [0, 0, 0];
  groundFill: [number, number, number] = [0, 0, 0];

  override getClassName(): string {
    return 'VoxelPlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.VOXELS = !!mesh;
    defines.VOXEL_AO = this.ao;
    defines.VOXEL_MICRO = this.micro && !!this.atlas;
  }

  override getSamplers(samplers: string[]): void {
    samplers.push('voxInd', 'voxPool', 'voxPal', 'vxDetail', 'vxNormal', 'voxSky');
  }

  override getUniforms(): { ubo?: { name: string; size: number; type: string }[]; fragment?: string } {
    return {
      ubo: [
        { name: 'voxOrigin', size: 3, type: 'vec3' },
        { name: 'voxInfo', size: 4, type: 'vec4' },
        { name: 'voxDims', size: 4, type: 'vec4' },
        { name: 'voxSkyO', size: 4, type: 'vec4' },
        { name: 'voxSkyD', size: 4, type: 'vec4' },
        { name: 'voxSkyFill', size: 4, type: 'vec4' },
        { name: 'voxGroundFill', size: 4, type: 'vec4' },
      ],
      fragment: '#ifdef VOXELS\nuniform vec3 voxOrigin;\nuniform vec4 voxInfo;\nuniform vec4 voxDims;\nuniform vec4 voxSkyO;\nuniform vec4 voxSkyD;\nuniform vec4 voxSkyFill;\nuniform vec4 voxGroundFill;\n#endif',
    };
  }

  override bindForSubMesh(ubo: UniformBuffer, _scene: Scene, _engine: unknown, _subMesh: SubMesh): void {
    const t = this.tex;
    ubo.updateFloat3('voxOrigin', t.origin[0], t.origin[1], t.origin[2]);
    ubo.updateFloat4('voxInfo', t.size, this.search, this.wet, 0);
    ubo.updateFloat4('voxDims', t.bricks[0], t.bricks[1], t.bricks[2], 0);
    ubo.updateFloat4('voxSkyO', t.skyOrigin[0], t.skyOrigin[1], t.skyOrigin[2], t.skyCell);
    ubo.updateFloat4('voxSkyD', t.skyDims[0], t.skyDims[1], t.skyDims[2], 0);
    ubo.updateFloat4('voxSkyFill', this.skyFill[0], this.skyFill[1], this.skyFill[2], 0);
    ubo.updateFloat4('voxGroundFill', this.groundFill[0], this.groundFill[1], this.groundFill[2], 0);
    if (t.sky) ubo.setTexture('voxSky', t.sky);
    ubo.setTexture('voxInd', t.index);
    ubo.setTexture('voxPool', t.pool);
    ubo.setTexture('voxPal', t.palette);
    if (this.atlas) {
      ubo.setTexture('vxDetail', this.atlas.detail);
      ubo.setTexture('vxNormal', this.atlas.normal);
    }
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    if (!this.pbr) {
      // standard material (`?gfx=min`): gamma-space palette colour with the per-voxel tone, nothing else
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef VOXELS
uniform highp sampler3D voxInd;
uniform highp sampler3D voxPool;
uniform highp sampler2D voxPal;
${VX_MAT_GLSL}
#endif`,
        CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
#ifdef VOXELS
{
  vec3 gn = normalize(vNormalW);
  vec3 an = abs(gn);
  ivec3 ax = an.x >= an.y && an.x >= an.z ? ivec3(int(sign(gn.x)), 0, 0) : (an.y >= an.z ? ivec3(0, int(sign(gn.y)), 0) : ivec3(0, 0, int(sign(gn.z))));
  ivec3 v = ivec3(floor((vPositionW - voxOrigin) / voxInfo.x - vec3(ax) * 0.5));
  int m = vxMat(v);
  float hv = fract(sin(dot(vec3(v), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  baseColor.rgb = texelFetch(voxPal, ivec2(m, 0), 0).rgb * (0.92 + 0.16 * hv);
}
#endif`,
      };
    }
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef VOXELS
uniform highp sampler3D voxInd;
uniform highp sampler3D voxPool;
uniform highp sampler2D voxPal;
uniform highp sampler3D voxSky;
float vxVis = 1.0;
vec3 vxAmbient = vec3(0.0);
#ifdef VOXEL_MICRO
uniform sampler2D vxDetail;
uniform sampler2D vxNormal;
${PARAMS_GLSL}
vec4 vxTap(sampler2D s, int k, vec2 uv) {
  vec2 cell = vec2(float(k - (k / 4) * 4), float(k / 4));
  vec2 f = clamp(fract(uv), 0.004, 0.996);
  return textureGrad(s, (cell + f) * 0.25, dFdx(uv) * 0.25, dFdy(uv) * 0.25);
}
#endif
float vxRough = 0.85;
float vxMetal = 0.0;
vec3 vxEmissive = vec3(0.0);
${VX_MAT_GLSL}
float vxSolid(ivec3 v) { return vxMat(v) != 0 ? 1.0 : 0.0; }
#endif`,
      CUSTOM_FRAGMENT_UPDATE_ALPHA: `
#ifdef VOXELS
{
  vec3 gn = normalize(vNormalW);
  vec3 an = abs(gn);
  ivec3 ax = an.x >= an.y && an.x >= an.z ? ivec3(int(sign(gn.x)), 0, 0) : (an.y >= an.z ? ivec3(0, int(sign(gn.y)), 0) : ivec3(0, 0, int(sign(gn.z))));
  vec3 gp = (vPositionW - voxOrigin) / voxInfo.x;
  ivec3 v = ivec3(floor(gp - vec3(ax) * 0.5));
  int m = 0;
  for (int i = 0; i < 6; i++) {
    m = vxMat(v);
    if (m != 0 || float(i + 1) >= voxInfo.y) break;
    v -= ax;
  }
  vec4 pal = texelFetch(voxPal, ivec2(m, 0), 0);
  int pa = int(pal.a * 255.0 + 0.5);
  int kind = pa - (pa / 16) * 16;
  float emis = float(pa / 16) / 15.0;
  vec3 base = pow(pal.rgb, vec3(2.2));
  // per voxel: a small tone and roughness variation (hashed from its coordinates)
  float hv = fract(sin(dot(vec3(v), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  base *= 0.92 + 0.16 * hv;
  vxRough = 0.85 + (hv - 0.5) * 0.12;
  float shade = 1.0;
#ifdef VOXEL_AO
  {
    // the face's two in-plane axes and where the pixel sits on its voxel face (0..1)
    ivec3 t1 = ax.x != 0 ? ivec3(0, 1, 0) : ivec3(1, 0, 0);
    ivec3 t2 = ax.z != 0 ? ivec3(0, 1, 0) : ivec3(0, 0, 1);
    vec3 fv = fract(gp);
    float f1 = dot(fv, vec3(t1));
    float f2 = dot(fv, vec3(t2));
    ivec3 e = v + ax;
    // ambient occlusion: solid voxels beside the air in front of the face (sides, then corners)
    float s1n = vxSolid(e - t1), s1p = vxSolid(e + t1), s2n = vxSolid(e - t2), s2p = vxSolid(e + t2);
    float c00 = vxSolid(e - t1 - t2), c10 = vxSolid(e + t1 - t2), c01 = vxSolid(e - t1 + t2), c11 = vxSolid(e + t1 + t2);
    float occ = s1n * (1.0 - f1) + s1p * f1 + s2n * (1.0 - f2) + s2p * f2;
    occ += 0.5 * (c00 * (1.0 - f1) * (1.0 - f2) + c10 * f1 * (1.0 - f2) + c01 * (1.0 - f1) * f2 + c11 * f1 * f2);
    shade *= 1.0 - 0.22 * occ;
    // convex edges: the voxel's neighbour in the plane is air - a worn, lighter rim near that side
    float r = 0.0;
    r += (1.0 - vxSolid(v - t1)) * smoothstep(0.78, 1.0, 1.0 - f1);
    r += (1.0 - vxSolid(v + t1)) * smoothstep(0.78, 1.0, f1);
    r += (1.0 - vxSolid(v - t2)) * smoothstep(0.78, 1.0, 1.0 - f2);
    r += (1.0 - vxSolid(v + t2)) * smoothstep(0.78, 1.0, f2);
    shade *= 1.0 + 0.12 * min(r, 1.0);
    vxRough = mix(vxRough, vxRough * 0.8, min(r, 1.0));
  }
#endif
#ifdef VOXEL_MICRO
  {
    vec4 sp = VX_P[kind];
    vec3 spos = vPositionW / sp.x;
    vec2 uv = ax.x != 0 ? spos.zy : (ax.y != 0 ? spos.xz : spos.xy);
    vec4 d = vxTap(vxDetail, kind, uv);
    vec4 nn = vxTap(vxNormal, kind, uv);
    vec2 tn = nn.xy * 2.0 - 1.0;
    vec3 pert = ax.x != 0 ? vec3(0.0, tn.y, tn.x) : (ax.y != 0 ? vec3(tn.x, 0.0, tn.y) : vec3(tn.x, tn.y, 0.0));
    normalW = normalize(normalW + pert * sp.z * 0.7);
    base *= (0.5 + (d.rgb - 0.5) * 0.45) * 2.0 * mix(1.0, nn.a, 0.3);
    vxRough = clamp(mix(vxRough, d.a, 0.6) + (hv - 0.5) * 0.08, 0.05, 1.0);
    vxMetal = sp.y;
  }
#endif
  // open sky: baked per 0.5 m cell, sampled a little off the face (indoors stays dark but under the skylights)
  if (voxSkyO.w > 0.0) vxVis = texture(voxSky, (vPositionW + gn * voxSkyO.w * 0.6 - voxSkyO.xyz) / (voxSkyO.w * voxSkyD.xyz)).r;
  // rain: upward faces open to the sky darker and glossy; puddles (palette row 1) a mirror
  float pud = texelFetch(voxPal, ivec2(m, 1), 0).r;
  float wet = voxInfo.z * smoothstep(0.55, 0.92, gn.y) * smoothstep(0.35, 0.8, vxVis) * (1.0 + pud * 0.6);
  base *= mix(1.0, 0.62, min(wet, 1.0));
  vxRough = mix(vxRough, 0.04, min(wet * 0.85, 1.0));
  surfaceAlbedo = base * shade;
  vxEmissive = base * emis * 4.0;
  // the hemisphere's fill, which the voxels take themselves: sky from above, ground from below, by how open it is
  vxAmbient = mix(voxGroundFill.rgb, voxSkyFill.rgb, normalW.y * 0.5 + 0.5) * (0.12 + 0.88 * vxVis) * surfaceAlbedo * shade;
}
#endif`,
      CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: `
#ifdef VOXELS
metallicRoughness.r = vxMetal;
metallicRoughness.g = clamp(vxRough, 0.04, 1.0);
#endif`,
      CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION: `
#ifdef VOXELS
finalEmissive += vxEmissive;
finalDiffuse += vxAmbient;
#ifdef REFLECTION
// the probe sees the hall from its middle: reflections and irradiance fade where the sky (and the open hall) is hidden
float vxRefl = 0.35 + 0.65 * vxVis;
finalIrradiance *= vxRefl;
finalRadianceScaled *= vxRefl;
#endif
#endif`,
    };
  }
}
