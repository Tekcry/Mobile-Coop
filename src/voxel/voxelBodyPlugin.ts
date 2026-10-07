import { MaterialPluginBase, type AbstractMesh, type Material, type MaterialDefines, type Scene } from '../core/babylon';

/**
 * Voxel characters / weapons (3.0): per-voxel shading on the merged greedy-meshed bodies. Each vertex carries `vox`,
 * its position in the part's own voxel grid (half a voxel inside the face, plus a per-part seed), so the fragment knows
 * which voxel it is on: a hashed tone per voxel and a fine dark seam between voxels (faded out once voxels get smaller
 * than a few pixels).
 */
export class VoxelBodyPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'VoxelBody', 210, { VOXBODY: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'VoxelBodyPlugin';
  }

  override isCompatible(shaderLanguage: number): boolean {
    return shaderLanguage === 0;
  }

  override prepareDefines(defines: MaterialDefines, _scene: Scene, mesh: AbstractMesh): void {
    defines.VOXBODY = !!mesh?.isVerticesDataPresent?.('vox');
  }

  override getAttributes(attributes: string[]): void {
    attributes.push('vox');
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType === 'vertex') {
      return {
        CUSTOM_VERTEX_DEFINITIONS: `
#ifdef VOXBODY
attribute vec3 vox;
varying vec3 vVox;
#endif`,
        CUSTOM_VERTEX_MAIN_END: `
#ifdef VOXBODY
vVox = vox;
#endif`,
      };
    }
    if (shaderType === 'fragment') {
      const tone = `
#ifdef VOXBODY
{
  vec3 vq = floor(vVox);
  float vh = fract(sin(dot(vq, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  vec3 vf = fract(vVox);
  vec3 ve = min(vf, 1.0 - vf);
  // the axis along the face normal sits at 0.5: only the in-plane edges count
  float vm = min(min(ve.x < 0.49 ? ve.x : 1.0, ve.y < 0.49 ? ve.y : 1.0), ve.z < 0.49 ? ve.z : 1.0);
  vec3 vw = fwidth(vVox);
  float vpx = max(max(vw.x, vw.y), vw.z);
  float vseam = mix(0.8, 1.0, smoothstep(0.0, max(vpx * 1.2, 0.05), vm));
  float vk = mix(0.93 + 0.14 * vh, 1.0, smoothstep(0.35, 0.7, vpx));
  VOXTARGET *= vk * mix(vseam, 1.0, smoothstep(0.2, 0.45, vpx));
}
#endif`;
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
#ifdef VOXBODY
varying vec3 vVox;
#endif`,
        CUSTOM_FRAGMENT_UPDATE_DIFFUSE: tone.replace('VOXTARGET', 'baseColor.rgb'),
        CUSTOM_FRAGMENT_UPDATE_ALBEDO: tone.replace('VOXTARGET', 'surfaceAlbedo'),
      };
    }
    return null;
  }
}
