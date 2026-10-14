import { MaterialPluginBase, type Material, type MaterialDefines, type Scene, type AbstractMesh } from '../core/babylon';
import { PATTERN_GLSL } from './patterns';

/**
 * StandardMaterial / PBRMaterial plugin adding per-instance procedural patterns. Instances carry
 * `pattern` (x = id, y = scale in metres) and `color2` (secondary colour). Pattern space is the
 * part's local position scaled by its world scale, so stripes keep a constant size on any part.
 *
 * (Step 14) `pattern.w` is a render-only emissive flag (0 = none): thermal vision's warm bodies and electro vision's
 * live devices set it from gameState's render frame (`CharacterRig.setHeat`, electro devices); it adds a white glow
 * to the lit colour, which the post pass's ramp then colours. Gameplay never reads it.
 */
export class PatternPlugin extends MaterialPluginBase {
  /** PBR (its final colour is \`finalColor\`) or StandardMaterial (\`color\`). */
  private readonly pbr: boolean;

  constructor(material: Material) {
    super(material, 'Pattern', 200, { PATTERNS: false });
    this.pbr = material.getClassName() === 'PBRMaterial';
    this._enable(true);
  }

  override getClassName(): string {
    return 'PatternPlugin';
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.PATTERNS = !!mesh;
  }

  override getAttributes(attributes: string[]): void {
    attributes.push('pattern', 'color2');
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0; // GLSL (WebGL)
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
#ifdef PATTERNS
attribute vec4 pattern;
attribute vec4 color2;
varying vec4 vPattern;
varying vec4 vColor2;
varying vec3 vPatPos;
#endif`,
        CUSTOM_VERTEX_MAIN_END: `
#ifdef PATTERNS
vPattern = pattern;
vColor2 = color2;
vPatPos = position * vec3(length(finalWorld[0].xyz), length(finalWorld[1].xyz), length(finalWorld[2].xyz));
#endif`,
      };
    }
    if (shaderType === 'fragment') {
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef PATTERNS
varying vec4 vPattern;
varying vec4 vColor2;
varying vec3 vPatPos;
${PATTERN_GLSL}
#endif`,
        // StandardMaterial: the diffuse colour; PBR (3.0): the albedo (the secondary colour arrives in linear space)
        CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
#ifdef PATTERNS
baseColor.rgb = applyPattern(baseColor.rgb, vColor2.rgb, vPattern, vPatPos);
#endif`,
        CUSTOM_FRAGMENT_UPDATE_ALBEDO: `
#ifdef PATTERNS
surfaceAlbedo = applyPattern(surfaceAlbedo, vColor2.rgb, vPattern, vPatPos);
#endif`,
        // (step 14) the vision glow: StandardMaterial adds it to the lit colour before fog, PBR to its final colour
        ...(this.pbr ? {} : { CUSTOM_FRAGMENT_BEFORE_FOG: `
#ifdef PATTERNS
color.rgb += vec3(max(vPattern.w, 0.0));
#endif` }),
        ...(this.pbr ? { CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR: `
#ifdef PATTERNS
finalColor.rgb += vec3(max(vPattern.w, 0.0));
#endif` } : {}),
      };
    }
    return null;
  }
}
