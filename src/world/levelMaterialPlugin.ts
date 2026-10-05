import { MaterialPluginBase, type Material } from '../core/babylon';

/**
 * Stylised shading for level geometry (world space, no textures): faint 1 m / 4 m grid lines that
 * fade with distance, contact darkening at the base of walls, per-axis face tint and fine speckle.
 * Gives scale cues and depth to flat low-poly colours for almost no cost.
 */
export class LevelMaterialPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'LevelShading', 210, { LEVELSHADING: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'LevelMaterialPlugin';
  }

  override prepareDefines(defines: Record<string, unknown>): void {
    defines.LEVELSHADING = true;
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
#ifdef LEVELSHADING
{
  vec3 lp = vPositionW;
  vec3 ln = normalize(vNormalW);
  vec3 an = abs(ln);
  vec2 luv = an.y > 0.6 ? lp.xz : (an.x > an.z ? lp.zy : lp.xy);
  vec2 lfw = fwidth(luv);
  float fade = 1.0 - smoothstep(0.04, 0.16, max(lfw.x, lfw.y));
  vec2 g1 = abs(fract(luv) - 0.5);
  vec2 g4 = abs(fract(luv * 0.25) - 0.5);
  float l1 = smoothstep(0.465, 0.5, max(g1.x, g1.y));
  float l4 = smoothstep(0.49, 0.5, max(g4.x, g4.y));
  float shade = 1.0 - (l1 * 0.05 + l4 * 0.07) * fade;
  float ao = an.y < 0.6 ? mix(0.7, 1.0, smoothstep(0.0, 0.9, lp.y)) : 1.0;
  float face = an.y > 0.6 ? (ln.y > 0.0 ? 1.04 : 0.8) : (an.x > an.z ? 0.9 : 0.97);
  float speck = 0.97 + 0.06 * fract(sin(dot(floor(lp * 3.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  baseColor.rgb *= shade * ao * face * speck;
}
#endif`,
    };
  }
}
