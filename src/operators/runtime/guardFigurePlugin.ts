import { MaterialPluginBase, type AbstractMesh, type Material, type MaterialDefines, type Scene } from '../../core/babylon';

/**
 * (guard-models G5) The guard figure's per-vertex `gvis` (RGBA8 normalised, `gearMask.ts`) on the guard base's one
 * operator PBR material, main pass only. No new samplers: the tint mask is the albedo atlas's alpha (G4 bakes it; 1 =
 * tinted), read from the albedo sample the PBR shader already takes.
 * - albedo x the vertex's slot tint (rgb, sRGB bytes) where the mask is set;
 * - the hit flash (a below 255) blends the albedo towards white, as `SmoothBody.setFlash`;
 * - a hidden piece (a = 0) collapses to a degenerate point (clip-space zero). The guard's index buffer leaves hidden
 *   pieces out as well, which is what hides them in the shadow maps and the G-buffer (their shaders run no plugins).
 * A mesh without `gvis` (any other operator body) compiles without it.
 */
export class GuardFigurePlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'GuardFigure', 230, { GUARDFIG: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'GuardFigurePlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.GUARDFIG = !!mesh?.isVerticesDataPresent?.('gvis');
  }

  override getAttributes(attributes: string[]): void {
    attributes.push('gvis');
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
#ifdef GUARDFIG
attribute vec4 gvis;
varying vec4 vGvis;
#endif`,
        CUSTOM_VERTEX_MAIN_END: `
#ifdef GUARDFIG
vGvis = gvis;
gl_Position *= step(0.5 / 255.0, gvis.a);
#endif`,
      };
    }
    if (shaderType === 'fragment') {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef GUARDFIG
varying vec4 vGvis;
#endif`,
        CUSTOM_FRAGMENT_UPDATE_ALPHA: `
#ifdef GUARDFIG
#ifdef ALBEDO
float gTintMask = albedoTexture.a;
#else
float gTintMask = 1.0;
#endif
surfaceAlbedo *= mix(vec3(1.0), toLinearSpace(vGvis.rgb), gTintMask);
surfaceAlbedo = mix(surfaceAlbedo, vec3(1.0), clamp((1.0 - vGvis.a) * (255.0 / 254.0), 0.0, 1.0));
#endif`,
      };
    }
    return null;
  }
}
