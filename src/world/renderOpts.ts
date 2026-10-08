/**
 * Render options read when materials are made (3.2.2). Set by `App.applyPlatform` before a scene builds its materials.
 */
export const renderOpts = {
  /**
   * PBR image-based light filtered on the fly (the reflection probe's cube is not prefiltered): several cube taps per
   * pixel. Off on phones - the probe's mip chain and its spherical harmonics instead (night maps barely use it).
   */
  iblFilter: true,
  /** Voxel ambient occlusion from the side neighbours only (phones: 4 lookups instead of 12, no worn rims). */
  aoLite: false,
};
