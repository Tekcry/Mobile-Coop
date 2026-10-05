import { MaterialPluginBase, type Material, type MaterialDefines, type Scene, type AbstractMesh } from '../core/babylon';
import { PATTERN_GLSL } from './patterns';

/**
 * StandardMaterial plugin adding per-instance procedural patterns. Instances carry
 * `pattern` (x = id, y = scale in metres) and `color2` (secondary colour). Pattern space is the
 * part's local position scaled by its world scale, so stripes keep a constant size on any part.
 */
export class PatternPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'Pattern', 200, { PATTERNS: false });
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
        CUSTOM_FRAGMENT_UPDATE_DIFFUSE: `
#ifdef PATTERNS
baseColor.rgb = applyPattern(baseColor.rgb, vColor2.rgb, vPattern, vPatPos);
#endif`,
      };
    }
    return null;
  }
}
