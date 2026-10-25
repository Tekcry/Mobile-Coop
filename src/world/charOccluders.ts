/**
 * (char-shadow-meter S1, J16) The character-occluder contract: one sim capsule per character (players, guards, dogs,
 * bodies) in fixed typed arrays, read by the light meter (`LightField` with a contract), the picture's round shadows
 * and Guard AI's shadow cues. Pure: no Babylon, no graphics state, no allocation after construction.
 *
 * INTERFACE COMMIT: the bodies of `transmitInto`, `capsuleTransmit` and `LAMP_CAPSULE_GLSL` are stubs (no shadow);
 * the next S1 commit fills them.
 */

/** Capsules in a contract and floats per capsule: ax ay az bx by bz r kind. */
export const OCC = { max: 64, stride: 8 } as const;
/** A capsule's character kind (the 8th float, and the high half of its owner key). */
export const OCC_KIND = { player: 1, guard: 2, dog: 3, body: 4 } as const;
/** The soft capsule (the GLSL `lampCapsule`): umbra floor, own-surface radius (x r), soft edge (r x penR + metres behind
 *  x penBehind), and the holder reach (m past r) inside which a light is never shadowed by that character. */
export const CAPSULE = { floor: 0.15, self: 1.6, penR: 0.35, penBehind: 0.12, holder: 0.6 } as const;
/** The gameplay lamp set: a baked lamp gets the character term where it gives at least `minLevel`; at most `maxLamps`
 *  lamps per point; the moon is a source `moonFar` metres along its direction. */
export const CHAR_LIGHT = { minLevel: 0.04, maxLamps: Infinity, moonFar: 60 } as const;

/** A capsule's owner key: kind << 16 | index (never -1, the "skip nothing" key). */
export function occKey(kind: number, index: number): number {
  return (kind << 16) | (index & 0xffff);
}

export class CharOccluders {
  readonly cap = new Float32Array(OCC.max * OCC.stride);
  readonly owner = new Int32Array(OCC.max);
  n = 0;
  /** Bumped by each `clear` (one per fill). */
  version = 0;
  /** `transmitInto`'s result. */
  t = 1;

  clear(): void {
    this.n = 0;
    this.version++;
  }

  /** One capsule, foot (a) to head (b), radius r; its slot, or -1 when the contract is full. */
  add(kind: number, index: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number): number {
    if (this.n >= OCC.max) return -1;
    const i = this.n++;
    const o = i * OCC.stride;
    const c = this.cap;
    c[o] = ax;
    c[o + 1] = ay;
    c[o + 2] = az;
    c[o + 3] = bx;
    c[o + 4] = by;
    c[o + 5] = bz;
    c[o + 6] = r;
    c[o + 7] = kind;
    this.owner[i] = occKey(kind, index);
    return i;
  }

  /** Product of `capsuleTransmit` over the capsules between (px,py,pz) and the source (sx,sy,sz), `skip` excluded; into `t`. */
  transmitInto(_sx: number, _sy: number, _sz: number, _px: number, _py: number, _pz: number, _skip: number): void {
    this.t = 1;
  }
}

/** How much of a light at (lx,ly,lz) reaches (px,py,pz) past one capsule (CAPSULE.floor..1). */
export function capsuleTransmit(_px: number, _py: number, _pz: number, _lx: number, _ly: number, _lz: number, _ax: number, _ay: number, _az: number, _bx: number, _by: number, _bz: number, _r: number): number {
  return 1;
}

/** The GLSL `lampCapsule`, built from `CAPSULE`. */
export const LAMP_CAPSULE_GLSL = '';
