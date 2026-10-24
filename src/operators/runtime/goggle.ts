/**
 * Goggle states (step 11d, pure). G73 (Michael): on the brow with a dim glow when vision is off, over the eyes with the
 * full glow when it is on. No dev switch: every Wren body runs this (D31 / G123). The pose follows the vision image on
 * screen (`VisionState.shown`), so the body's goggle changes at the middle of the flip, as the picture does; the glow
 * eases between dim and full. The co-op partner's vision is not sent, so a remote Wren stays stowed and dim.
 *
 * Geometry: a LOD file may carry a `_GOGGLE` class per vertex (0 body, 1 in use, 2 stowed; the asset follow-up in
 * docs/operators-runtime/DESIGN.md). `partitionGoggle` orders each primitive's triangles [stowed][body][in use], so
 * either state is one contiguous index range: the state swap moves a sub-mesh's start and count, no upload, no draw.
 */

export type GogglePose = 'stowed' | 'inUse';

/** Glow levels as a fraction of the lens material's own emissive (the asset's full glow, D13). */
export const GOGGLE_GLOW = { dim: 0.3, full: 1, easeS: 0.15 } as const;

export class GoggleState {
  pose: GogglePose = 'stowed';
  /** Current glow, 0..1 of the lens's emissive. */
  glow: number = GOGGLE_GLOW.dim;

  /** Advance with the vision mode on screen; returns true when the pose changed this call. */
  update(shown: string, dt: number): boolean {
    const want: GogglePose = shown === 'off' ? 'stowed' : 'inUse';
    const changed = want !== this.pose;
    this.pose = want;
    const target = want === 'inUse' ? GOGGLE_GLOW.full : GOGGLE_GLOW.dim;
    const step = GOGGLE_GLOW.easeS > 0 ? (dt / GOGGLE_GLOW.easeS) * (GOGGLE_GLOW.full - GOGGLE_GLOW.dim) : 1;
    this.glow = this.glow < target ? Math.min(target, this.glow + step) : Math.max(target, this.glow - step);
    return changed;
  }

  /** Stowed and dim at once (respawn, a new match). */
  reset(): void {
    this.pose = 'stowed';
    this.glow = GOGGLE_GLOW.dim;
  }
}

/**
 * Gear offset for the goggle (marlow-bays item 22: track B's gear-offset rows drive it). Per pose, a move in metres and
 * a turn in degrees (pitch about +X, yaw about +Y, roll about +Z) in the head frame (game frame: +X right, +Y up, +Z
 * forward), applied about the goggle's own pivot after its rest pose. Identity by default; the figure reads it each
 * frame (anim-skeleton S2: the goggle parts ride their own skin joints under the head).
 */
export interface GoggleOffset {
  x: number;
  y: number;
  z: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export const GOGGLE_OFFSET: Readonly<Record<GogglePose, GoggleOffset>> = {
  stowed: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
  inUse: { x: 0, y: 0, z: 0, pitch: 0, yaw: 0, roll: 0 },
};

/** Sets one pose's goggle offset in place (no allocation). */
export function setGoggleOffset(pose: GogglePose, x: number, y: number, z: number, pitch: number, yaw: number, roll: number): void {
  const o = GOGGLE_OFFSET[pose];
  o.x = x;
  o.y = y;
  o.z = z;
  o.pitch = pitch;
  o.yaw = yaw;
  o.roll = roll;
}

/** True when a pose's offset is the identity (the figure then leaves the goggle joint at its rest pose). */
export function goggleOffsetIdentity(pose: GogglePose): boolean {
  const o = GOGGLE_OFFSET[pose];
  return o.x === 0 && o.y === 0 && o.z === 0 && o.pitch === 0 && o.yaw === 0 && o.roll === 0;
}

export interface GogglePartition {
  /** Triangle indices ordered [stowed][body][in use]. */
  indices: Uint32Array;
  stowed: number;
  body: number;
  inUse: number;
  /** Triangles whose vertices disagree on the class (drawn as body). */
  mixed: number;
}

/** Orders a primitive's triangles by goggle class (`cls` per vertex; absent = all body). Load time only. */
export function partitionGoggle(indices: Uint32Array, cls?: Uint8Array): GogglePartition {
  const n = indices.length / 3;
  if (!cls) return { indices, stowed: 0, body: indices.length, inUse: 0, mixed: 0 };
  const tri = new Uint8Array(n);
  let mixed = 0;
  const count = [0, 0, 0];
  for (let t = 0; t < n; t++) {
    const a = cls[indices[t * 3]!] ?? 0;
    const b = cls[indices[t * 3 + 1]!] ?? 0;
    const c = cls[indices[t * 3 + 2]!] ?? 0;
    let k = a === b && b === c && a <= 2 ? a : 0;
    if (!(a === b && b === c)) mixed++;
    if (k > 2) k = 0;
    tri[t] = k;
    count[k]!++;
  }
  const out = new Uint32Array(indices.length);
  // slots: stowed (2) first, body (0), in use (1) last
  const start = [count[2]!, count[2]! + count[0]!, 0];
  for (let t = 0; t < n; t++) {
    const s = start[tri[t]!]!++;
    out[s * 3] = indices[t * 3]!;
    out[s * 3 + 1] = indices[t * 3 + 1]!;
    out[s * 3 + 2] = indices[t * 3 + 2]!;
  }
  return { indices: out, stowed: count[2]! * 3, body: count[0]! * 3, inUse: count[1]! * 3, mixed };
}

/** The index range to draw for a pose: [start, count]. Written into `out` (no allocation). */
export function goggleRange(p: GogglePartition, pose: GogglePose, out: [number, number]): [number, number] {
  if (pose === 'stowed') {
    out[0] = 0;
    out[1] = p.stowed + p.body;
  } else {
    out[0] = p.stowed;
    out[1] = p.body + p.inUse;
  }
  return out;
}

/**
 * (G135) Each player's goggle light is its own colour: the partner beacon. While every player is Wren (G123) the colour
 * follows the player slot, not the operator: slot 0 (the host, and solo) keeps Wren's own green lens; slot 1 (the
 * partner) is cyan (ops A112: cyan, not amber, because amber is the HUD's exposure warning and green / amber is the
 * pair red-green colour blindness confuses). Slots 2-3 exist only because the legacy lobby still takes 4 (G132: two
 * humans). Linear emissive RGB at the full glow, each about the green's luminance so the beacons read alike in the dark.
 */
export const GOGGLE_COLOURS: readonly (readonly [number, number, number])[] = [
  [0.3, 0.85, 0.16], // green: Wren's lens (the asset's own emissive)
  [0.08, 0.78, 1.0], // cyan
  [1.0, 0.45, 0.9], // magenta (legacy 3rd)
  [0.78, 0.74, 0.68], // warm white (legacy 4th)
];

/** The goggle colour for a player slot (0 = host / solo); out-of-range slots wrap. */
export function goggleColour(slot: number): readonly [number, number, number] {
  const n = GOGGLE_COLOURS.length;
  const i = Number.isInteger(slot) && slot > 0 ? slot % n : 0;
  return GOGGLE_COLOURS[i]!;
}
