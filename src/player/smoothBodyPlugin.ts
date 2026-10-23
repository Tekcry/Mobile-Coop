import { MaterialPluginBase, type AbstractMesh, type Material, type MaterialDefines, type Scene } from '../core/babylon';

/**
 * (guard-render S1) Merged smooth bodies (`SmoothBody`) shade as their instances did: the pattern and surface plugins
 * take their object space from `position * scale(finalWorld)` and the raw `normal`, which on a skinned merged mesh
 * are joint space and the bone's scale. Each vertex carries the instance's own (`ppos`: the unit position times the
 * instance's world scale; `pnrm`: the unit normal); this runs after both (priority 220) and puts them back.
 */
export class SmoothBodyPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'SmoothBody', 220, { SMOOTHBODY: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'SmoothBodyPlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.SMOOTHBODY = !!mesh?.isVerticesDataPresent?.('ppos');
  }

  override getAttributes(attributes: string[]): void {
    attributes.push('ppos', 'pnrm');
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'vertex') return null;
    return {
      CUSTOM_VERTEX_DEFINITIONS: `
#ifdef SMOOTHBODY
attribute vec3 ppos;
attribute vec3 pnrm;
#endif`,
      CUSTOM_VERTEX_MAIN_END: `
#ifdef SMOOTHBODY
#ifdef PATTERNS
vPatPos = ppos;
#endif
#if defined(SURFACES) && defined(SURF_OBJECT)
vSurfPos = ppos;
vSurfNrm = pnrm;
#endif
#endif`,
    };
  }
}
