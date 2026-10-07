import { MaterialPluginBase, type AbstractMesh, type Material, type MaterialDefines, type Scene, type SubMesh, type UniformBuffer } from '../core/babylon';
import { SURFACE_KINDS, SURFACE_PARAMS, type SurfaceAtlas } from './surfaceAtlas';

/** GLSL constants: per surface (metres per tile, metallic, bump, 0). */
const PARAMS_GLSL = `const vec4 SURF_P[16] = vec4[16](${SURFACE_KINDS.map((k) => {
  const p = SURFACE_PARAMS[k];
  return `vec4(${p.tile.toFixed(3)}, ${p.metal.toFixed(3)}, ${p.bump.toFixed(3)}, 0.0)`;
}).join(', ')});`;

/**
 * PBR plugin: the procedural surface atlases (`SurfaceAtlas`) mapped triplanar - world space for the level (a
 * per-instance `surf` id), object space scaled by the instance for characters / weapons (`pattern.z` carries the
 * id) - into albedo detail, roughness, metallic, a normal perturbation (UDN blend) and baked cavity. The instance
 * colour stays the base colour; the atlas only varies it round it.
 */
export class SurfacePlugin extends MaterialPluginBase {
  constructor(
    material: Material,
    private atlas: SurfaceAtlas,
    private space: 'world' | 'object',
  ) {
    super(material, 'Surfaces', 190, { SURFACES: false, SURF_OBJECT: false });
    this._enable(true);
  }

  /** Rain: upward-facing surfaces darken and turn glossy (0..1; world space only). */
  wet = 0;

  override getClassName(): string {
    return 'SurfacePlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.SURFACES = !!mesh;
    defines.SURF_OBJECT = this.space === 'object';
  }

  override getSamplers(samplers: string[]): void {
    samplers.push('surfDetail', 'surfNormal');
  }

  override getAttributes(attributes: string[]): void {
    if (this.space === 'world') attributes.push('surf');
  }

  override getUniforms(): { ubo?: { name: string; size: number; type: string }[]; fragment?: string } {
    return {
      ubo: [
        { name: 'surfMix', size: 1, type: 'float' },
        { name: 'surfWet', size: 1, type: 'float' },
      ],
      fragment: '#ifdef SURFACES\nuniform float surfMix;\nuniform float surfWet;\n#endif',
    };
  }

  override bindForSubMesh(ubo: UniformBuffer, _scene: Scene, _engine: unknown, _subMesh: SubMesh): void {
    ubo.updateFloat('surfMix', 1);
    ubo.updateFloat('surfWet', this.wet);
    ubo.setTexture('surfDetail', this.atlas.detail);
    ubo.setTexture('surfNormal', this.atlas.normal);
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
#ifdef SURFACES
#ifdef SURF_OBJECT
varying vec3 vSurfPos;
varying vec3 vSurfNrm;
varying float vSurf;
#else
attribute float surf;
varying float vSurf;
#endif
#endif`,
        CUSTOM_VERTEX_MAIN_END: `
#ifdef SURFACES
#ifdef SURF_OBJECT
vSurfPos = position * vec3(length(finalWorld[0].xyz), length(finalWorld[1].xyz), length(finalWorld[2].xyz));
vSurfNrm = normal;
#ifdef INSTANCES
vSurf = pattern.z;
#else
vSurf = 15.0;
#endif
#else
vSurf = surf;
#endif
#endif`,
      };
    }
    if (shaderType === 'fragment') {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef SURFACES
uniform sampler2D surfDetail;
uniform sampler2D surfNormal;
varying float vSurf;
#ifdef SURF_OBJECT
varying vec3 vSurfPos;
varying vec3 vSurfNrm;
#endif
${PARAMS_GLSL}
vec4 sfD = vec4(0.5, 0.5, 0.5, 0.8);
float sfMetal = 0.0;
float sfAo = 1.0;
vec4 sfTap(sampler2D s, int k, vec2 uv) {
  vec2 cell = vec2(float(k - (k / 4) * 4), float(k / 4));
  vec2 f = clamp(fract(uv), 0.004, 0.996);
  return textureGrad(s, (cell + f) * 0.25, dFdx(uv) * 0.25, dFdy(uv) * 0.25);
}
#endif`,
        // after the normal is final (before lights, reflectivity): sample, perturb the normal, tint the albedo
        CUSTOM_FRAGMENT_UPDATE_ALPHA: `
#ifdef SURFACES
{
  int sk = int(clamp(vSurf + 0.5, 0.0, 15.0));
  vec4 sp = SURF_P[sk];
#ifdef SURF_OBJECT
  vec3 sn = normalize(vSurfNrm);
  vec3 spos = vSurfPos / sp.x;
#else
  vec3 sn = normalize(vNormalW);
  vec3 spos = vPositionW / sp.x;
#endif
  vec3 sw = pow(abs(sn), vec3(4.0));
  sw /= (sw.x + sw.y + sw.z);
  vec2 uvX = spos.zy; vec2 uvY = spos.xz; vec2 uvZ = spos.xy;
  sfD = sfTap(surfDetail, sk, uvX) * sw.x + sfTap(surfDetail, sk, uvY) * sw.y + sfTap(surfDetail, sk, uvZ) * sw.z;
  vec4 nX = sfTap(surfNormal, sk, uvX);
  vec4 nY = sfTap(surfNormal, sk, uvY);
  vec4 nZ = sfTap(surfNormal, sk, uvZ);
  sfAo = nX.a * sw.x + nY.a * sw.y + nZ.a * sw.z;
  vec2 tX = nX.xy * 2.0 - 1.0; vec2 tY = nY.xy * 2.0 - 1.0; vec2 tZ = nZ.xy * 2.0 - 1.0;
  // UDN triplanar: each projection's tangent normal swizzled onto its axis
  vec3 pert = vec3(0.0, tX.y, tX.x) * sw.x + vec3(tY.x, 0.0, tY.y) * sw.y + vec3(tZ.x, tZ.y, 0.0) * sw.z;
#ifndef SURF_OBJECT
  normalW = normalize(normalW + pert * sp.z * surfMix);
#endif
  sfMetal = sp.y;
  surfaceAlbedo *= mix(vec3(1.0), (0.5 + (sfD.rgb - 0.5) * 0.5) * 2.0 * mix(1.0, sfAo, 0.35), surfMix);
#ifndef SURF_OBJECT
  // rain: what faces the sky darkens and goes glossy, more in the low spots (cavity) - puddles for the reflections
  float swet = surfWet * smoothstep(0.55, 0.92, sn.y);
  if (swet > 0.0) {
    float pool = smoothstep(0.45, 0.25, sfAo) * 0.5 + 0.5;
    surfaceAlbedo *= mix(1.0, 0.62, swet);
    sfD.a = mix(sfD.a, 0.06, swet * pool);
  }
#endif
}
#endif`,
        CUSTOM_FRAGMENT_UPDATE_METALLICROUGHNESS: `
#ifdef SURFACES
metallicRoughness.r = sfMetal;
metallicRoughness.g = clamp(sfD.a, 0.04, 1.0);
#endif`,
      };
    }
    return null;
  }
}
