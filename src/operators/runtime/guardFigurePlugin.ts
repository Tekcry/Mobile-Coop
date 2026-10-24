import { MaterialPluginBase, type AbstractMesh, type Material, type MaterialDefines, type Scene } from '../../core/babylon';

/**
 * (guard-models G5) The guard figure's per-vertex `gvis` (RGBA8 normalised, `gearMask.ts`) on the guard base's one
 * operator PBR material, main pass only. No new samplers: the tint mask is the albedo atlas's alpha (G4 bakes it; 1 =
 * tinted), read from the albedo sample the PBR shader already takes.
 * - albedo x the vertex's slot tint (rgb, sRGB bytes) where the mask is set;
 * - the hit flash (a's low 4 bits, below 255) blends the albedo towards the warm white of `SmoothBody.setFlash`
 *   (`flashColors`); the thermal heat (a's high 4 bits) blends the final colour towards white, as Wren's overlay but
 *   in the guard's one draw (no overlay pass: one draw per guard in every vision mode);
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
varying vec4 vGfig;
#endif`,
        // a = 255 - (heat level x 16 + flash level), levels 0..15 (gearMask visibleAlpha); 0 = hidden.
        // (G7b) ONE vec4 varying (the PBR shader sits near the varying limit on mobile GPUs): rgb the tint, w the heat
        // level plus the flash level / 16 (the fragment splits it again: `guardFx`)
        CUSTOM_VERTEX_MAIN_END: `
#ifdef GUARDFIG
float gFx = floor((1.0 - gvis.a) * 255.0 + 0.5);
float gHeat = floor(gFx / 16.0);
vGfig = vec4(gvis.rgb, gHeat + (gFx - gHeat * 16.0) / 16.0);
gl_Position *= step(0.5 / 255.0, gvis.a);
#endif`,
      };
    }
    if (shaderType === 'fragment') {
      return {
        // (G7b) the packed varying split again: vGvis the tint (rgb), vGfx (flash, heat) 0..1 as before. Flash and heat
        // are the same on every vertex of a figure, so the interpolated w is exact; the 0.5 / 16 margins absorb rounding.
        CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef GUARDFIG
varying vec4 vGfig;
vec2 guardFx(float w) {
  float h = floor(w + 0.5 / 16.0);
  return vec2(floor((w - h) * 16.0 + 0.5), h) / 15.0;
}
#define vGvis vGfig.rgb
#define vGfx guardFx(vGfig.w)
#endif`,
        CUSTOM_FRAGMENT_UPDATE_ALPHA: `
#ifdef GUARDFIG
#ifdef ALBEDO
float gTintMask = albedoTexture.a;
#else
float gTintMask = 1.0;
#endif
surfaceAlbedo *= mix(vec3(1.0), toLinearSpace(vGvis), gTintMask);
surfaceAlbedo = mix(surfaceAlbedo, vec3(1.0, 0.92, 0.85), vGfx.x);
#endif`,
        // thermal warmth: the lit colour towards white, as Wren's figure's white overlay but in the same draw
        CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
#ifdef GUARDFIG
finalColor.rgb = mix(finalColor.rgb, vec3(1.0), vGfx.y);
#endif`,
      };
    }
    return null;
  }
}
