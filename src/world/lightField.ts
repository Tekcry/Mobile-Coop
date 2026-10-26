/**
 * The light field (3.6, pure; bible 5.1, L1-L5): the one answer to "how lit is this point" for all gameplay - the
 * player's meter, guards' perception of players and bodies, the torch rule. It reads the canonical bake
 * (`lightBake.ts`: lamp visibility boxes, moon visibility, the ambient grid) and the registry's live state (on,
 * destroyed, EMP), with the formula the renderers use (`lampMath.ts`):
 *
 *   level = ambient grid + bounce grid (LR16-1, the lit lamps' one-bounce fill, never blended across a wall:
 *           `BounceGrid.sampleInto`) + (moon + lightning flash) x moon visibility + sum over the
 *           lamps listed for the point's 2 m column (as the shaders list them) of `LAMP_LEVEL_GAIN` x intensity x
 *           falloff x cone x baked visibility, with closed doors cutting lamps
 *
 * Visibility is read trilinearly between cell centres and clamped to each box, as the GPU samples the atlas. Lights
 * that are not baked (flashlights) come from `dynamicAt` with the caller's ray test. Everything is allocation-free.
 *
 * (char-shadow-meter, G352) `totalAt` / `bodyLevel` with a character contract (`charOccluders.ts`) scale each member
 * of the gameplay lamp set - a column lamp giving at least `CHAR_LIGHT.minLevel` at the point, the moon (from
 * `moonFar` m along its direction), every non-baked light - by the soft capsules between it and the point, the
 * picture's `lampCapsule` formula. Fixed by map data and the synced light state only; never a graphics preset.
 */
import { AMBIENT_CELL } from './ambientGrid';
import { BounceGrid } from './bounceGrid';
import { LAMP_CONE_COS, LAMP_EXP, LAMP_FEATHER, LAMP_LEVEL_GAIN, PHOTO_NEAR2, PHOTO_NUM, SPOT_EXP, SPOT_FEATHER, torchCut } from './lampMath';
import { hyp3 } from '../core/mathx';
import type { LightBake } from './lightBake';
import { lightTerm, type LightDef, type LightRegistry, type Occluder } from './lights';
import { CHAR_LIGHT, type CharOccluders } from './charOccluders';
import { BOX_STRIDE, LAMP_CELL, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_STRIDE, lampGrid, lampGridBase, type LampResult } from '../voxel/lampBake';

/** (piano SO3) A `beamCut` torch's cut at a point: `torchCut` at its reach (capped at the radius), as the picture's
 *  `writeTorchDraw` / torch loop cut it. Allocation-free. */
function beamCutAt(l: LightDef, x: number, y: number, z: number): number {
  return torchCut(hyp3(x - l.x, y - l.y, z - l.z), Math.min(l.reach ?? l.radius, l.radius));
}

/** A door leaf as the field needs it (`Doors.list` entries fit): shut for light when `open` is `DOOR_SHUT` or less. */
export interface FieldDoor {
  anchor: { hinge: { x: number; y: number; z: number }; yaw: number; width: number; height: number };
  open: number;
}

/**
 * (sector-batch, G41 "one 15% threshold for light, sound and sight") A door open this far or less stops light: in the
 * field (`doorBlocks`), the bake's shut flags the shaders read (`BakedLamps`) and the torch shadow set
 * (`pickTorchDoors`). The same number as `DOOR.driveShut` (`world/doors.ts`, where a stick-driven door turns from a
 * crack into a real opening; `tests/doorLight.test.ts` pins them equal). A peek crack keeps `open` 0.
 */
export const DOOR_SHUT = 0.15;
/** Doors per door texel of the GPU's lamp data (`lampDoorLists`' default list length). */
export const DOORS_PER_LAMP = 4;
/** (LR15, shadow audit 2) Doors a baked lamp tests: two door texels in the GPU's lamp data, so a 5th-8th shut door in a
 *  lamp's view stops its light in the meter and on screen alike (the field tests the same list). */
export const DOORS_PER_LAMP_ACCURATE = 8;

/** Lamp `i`'s baked visibility at a point (0..1), read as `LightField.visAt` reads it. */
export type BakeVisSampler = (i: number, x: number, y: number, z: number) => number;

/** (shadow audit) A sampler over a bake result's visibility boxes (load time: one small table). */
export function bakeVisSampler(r: LampResult): BakeVisSampler {
  const B = r.boxes;
  const n = B.length / BOX_STRIDE;
  const at = new Float64Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    at[i] = s;
    s += B[i * BOX_STRIDE + 3]! * B[i * BOX_STRIDE + 4]! * B[i * BOX_STRIDE + 5]!;
  }
  return (i, x, y, z) => {
    const o = i * BOX_STRIDE;
    return trilinear(r.vis, at[i]!, B[o]!, B[o + 1]!, B[o + 2]!, B[o + 3]!, B[o + 4]!, B[o + 5]!, LAMP_CELL, x, y, z);
  };
}

/**
 * (shadow audit) Can lamp `i` see door `d`'s doorway at all? Nine points over the leaf's plane (a fifth, half and four
 * fifths of its width and height), each also 0.1 m to either side, against the lamp's baked visibility (the doorway is
 * air in the bake). A doorway the lamp cannot see passes none of its light, so its leaf needs no slot.
 */
export function doorSeen(seen: BakeVisSampler, i: number, d: FieldDoor): boolean {
  const a = d.anchor;
  const ux = Math.sin(a.yaw);
  const uz = Math.cos(a.yaw);
  for (let p = 0; p < 3; p++) {
    const s = a.width * (p === 0 ? 0.2 : p === 1 ? 0.5 : 0.8);
    for (let q = 0; q < 3; q++) {
      const y = a.hinge.y + a.height * (q === 0 ? 0.2 : q === 1 ? 0.5 : 0.8);
      for (let side = -1; side <= 1; side++) {
        const x = a.hinge.x + ux * s + uz * side * 0.1;
        const z = a.hinge.z + uz * s - ux * side * 0.1;
        if (seen(i, x, y, z) > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Per baked lamp (`LAMP_STRIDE` lights), the doors whose leaf can come between it and what it lights - the leaf's
 * middle within the lamp's reach plus the leaf's width - nearest first, up to `slots` (-1: none; `DOORS_PER_LAMP_ACCURATE`). The
 * shaders and the field read this one list. (shadow audit) With `seen` (the bake's visibility) the doors whose doorway
 * the lamp cannot see (`doorSeen`) are left out, so a lamp with more doors in reach than slots keeps the ones that can
 * cut its light.
 */
export function lampDoorLists(lights: Float32Array, doors: readonly FieldDoor[], seen?: BakeVisSampler, slots = DOORS_PER_LAMP): Int16Array {
  const n = lights.length / LAMP_STRIDE;
  const out = new Int16Array(n * slots).fill(-1);
  const near: { k: number; d: number }[] = [];
  for (let i = 0; i < n; i++) lampDoorListInto(out, i, lights, doors, seen, slots, near);
  return out;
}

/** (section-bake) Lamp `i`'s row of `lampDoorLists` written into `out` (a lamp that landed after the load). */
export function lampDoorListInto(out: Int16Array, i: number, lights: Float32Array, doors: readonly FieldDoor[], seen: BakeVisSampler | undefined, slots: number, near: { k: number; d: number }[] = []): void {
  const o = i * LAMP_STRIDE;
  near.length = 0;
  for (let k = 0; k < doors.length; k++) {
    const a = doors[k]!.anchor;
    const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
    const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
    const dx = cx - lights[o]!;
    const dy = a.hinge.y + a.height * 0.5 - lights[o + 1]!;
    const dz = cz - lights[o + 2]!;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < lights[o + 3]! + a.width && (!seen || doorSeen(seen, i, doors[k]!))) near.push({ k, d });
  }
  near.sort((p, q) => p.d - q.d);
  for (let j = 0; j < slots; j++) out[i * slots + j] = j < near.length ? near[j]!.k : -1;
}

/** Per baked lamp, unpacked: x, y, z, reach, axis dx, dy, dz, cos cut, exponent, then its visibility grid as `triInto`
 *  reads one (vis offset, box ox, oy, oz, nx, ny, nz, cell) from `LG`. */
const LS = 17;
/** Where a lamp's grid parameters start in its `LS` row. */
const LG = 9;

export class LightField {
  /** Registry ids of the baked lamps, in bake order. */
  private readonly ids: Int32Array;
  private readonly lamp: Float64Array;
  /** Registry id -> 1 when baked (the rest are dynamic). */
  private readonly isBaked: Uint8Array;
  /** (char-shadow-meter) Registry id -> bake index (-1 not baked), for `sourceAt`. */
  private readonly bakeIdx: Int32Array;
  private readonly grid: { data: Uint8Array; cols: number; rows: number } | null;
  private readonly gx: number;
  private readonly gz: number;
  /** `lampDoorLists` for the baked lamps. */
  private readonly lampDoors: Int16Array;
  /** (char-shadow-meter) The moon's and the ambient fill's grids as `triInto` reads them (at 0, origin, counts, cell;
   *  fixed by the bake), so no grid parameter crosses a call as a double. */
  private readonly moonG: Float64Array | null;
  private readonly ambG: Float64Array | null;
  /** (LR15) Door slots per lamp, as the shaders' two door texels. */
  private readonly doorSlots = DOORS_PER_LAMP_ACCURATE;
  /** (LR16-1) The lit lamps' one-bounce fill on the ambient grid's cells; `BakedLamps` packs the same bytes. */
  readonly bounce: BounceGrid;

  constructor(
    readonly bake: LightBake | null,
    private readonly reg: LightRegistry,
    private readonly doors: readonly FieldDoor[] = [],
  ) {
    const lamps = bake?.lamps ?? null;
    const n = lamps ? lamps.baked.ids.length : 0;
    this.ids = new Int32Array(n);
    this.lamp = new Float64Array(n * LS);
    this.isBaked = new Uint8Array(Math.max(1, reg.lights.length + 64));
    this.bakeIdx = new Int32Array(this.isBaked.length).fill(-1);
    let at = 0;
    for (let i = 0; i < n; i++) {
      const L = lamps!.baked.lights;
      const B = lamps!.r.boxes;
      const li = i * LAMP_STRIDE;
      const bi = i * BOX_STRIDE;
      const o = i * LS;
      const id = lamps!.baked.ids[i]!;
      this.ids[i] = id;
      this.isBaked[id] = 1;
      this.bakeIdx[id] = i;
      const spot = L[li + 7]! > -1.5;
      this.lamp[o] = L[li]!;
      this.lamp[o + 1] = L[li + 1]!;
      this.lamp[o + 2] = L[li + 2]!;
      this.lamp[o + 3] = L[li + 3]!;
      this.lamp[o + 4] = L[li + 4]!;
      this.lamp[o + 5] = L[li + 5]!;
      this.lamp[o + 6] = L[li + 6]!;
      this.lamp[o + 7] = spot ? L[li + 7]! : LAMP_CONE_COS;
      this.lamp[o + 8] = spot ? SPOT_EXP : LAMP_EXP;
      this.lamp[o + 9] = at;
      for (let k = 0; k < 6; k++) this.lamp[o + 10 + k] = B[bi + k]!;
      this.lamp[o + 16] = LAMP_CELL;
      at += B[bi + 3]! * B[bi + 4]! * B[bi + 5]!;
    }
    this.grid = lamps && bake ? lampGrid(lamps.baked.lights, bake.lo, bake.hi) : null;
    this.lampDoors = lamps ? lampDoorLists(lamps.baked.lights, doors, bakeVisSampler(lamps.r), this.doorSlots) : new Int16Array(0);
    this.gx = bake?.lo[0] ?? 0;
    this.gz = bake?.lo[2] ?? 0;
    const m = bake?.moon;
    this.moonG = m ? Float64Array.of(0, m.origin[0], m.origin[1], m.origin[2], m.n[0], m.n[1], m.n[2], m.cell) : null;
    const ag = bake?.ambient;
    this.ambG = ag ? Float64Array.of(0, ag.origin[0], ag.origin[1], ag.origin[2], ag.n[0], ag.n[1], ag.n[2], AMBIENT_CELL) : null;
    this.bounce = new BounceGrid(lamps?.r.bounce, lamps ? lamps.baked.ids : [], bake ? bake.ambient : { origin: [0, 0, 0], n: [1, 1, 1] });
    this.bounce.sync(reg);
    // (section-bake) lamps still baking: each landing batch gets its door lists and the bounce grows (the visibility is
    // read in place from the shared result)
    const sb = bake?.sections;
    if (sb && !sb.done && lamps) sb.onLand((ls, k) => this.landed(ls, k));
  }

  /** (section-bake) Lamps `ls[0 .. k)` landed in the bake: their door lists from their visibility, the bounce re-joined. */
  private landed(ls: Int32Array, k: number): void {
    const lamps = this.bake?.lamps;
    if (!lamps) return;
    const seen = bakeVisSampler(lamps.r);
    for (let j = 0; j < k; j++) lampDoorListInto(this.lampDoors, ls[j]!, lamps.baked.lights, this.doors, seen, this.doorSlots);
    if (lamps.r.bounce) this.bounce.adopt(lamps.r.bounce, ls, k);
  }

  /**
   * Scratch result of the private `*Into` steps. (They write here rather than return: V8 boxes a double returned from
   * a call it does not inline, 16 bytes each; a number field is updated in place. Only the public calls return one.)
   */
  private res = 0;
  /** (char-shadow-meter) Scratch: the point's column lamps (bake indices) and their terms (`columnInto`). */
  private readonly colLamp = new Int32Array(LAMP_GRID_SLOTS);
  private readonly colLv = new Float64Array(LAMP_GRID_SLOTS);
  /** (char-shadow-meter) Scratch: the member level `pushRes` inserts (a typed-array slot: no double crosses the call). */
  private readonly pushLv = new Float64Array(1);
  /** (char-shadow-meter) Scratch: the query point (x, y, z) the private steps read (`moonInto`, `columnInto`,
   *  `lampInto`, `visInto`, `triInto`, `dynTermInto`), written once by the call that takes the point. As arguments it
   *  boxed: V8 boxes a double passed to a call it does not inline, and which calls it inlines moves with the version's
   *  budget (A1 node22 fix: Node 22 left `moonInto`, `dynTermInto` and `lampInto` out of line in `sourcesInto`, 90.4 B
   *  a query against 58.8 on Node 24; with the point, the door segment and the grids in slots, 16.4 and 0.0). */
  private readonly pt = new Float64Array(3);
  /** (char-shadow-meter) Scratch: the segment ax, ay, az, bx, by, bz `doorBlocksOne` tests, for the same reason. */
  private readonly seg = new Float64Array(6);

  /** (piano SO5) The lightning flash's gameplay level now (`Lightning.levelAt`; 0 between flashes and on maps without
   *  lightning), added to the moon's level wherever the sky is seen. */
  private flash = 0;

  /** (piano SO5) Set the flash level for this sim step, before the meter and guards sample (`GameState.updateLight`).
   *  With 0 every query is today's to the bit. */
  setFlash(level: number): void {
    this.flash = level > 0 ? level : 0;
  }

  /** (piano SO5) The flash level set for this step. */
  get flashLevel(): number {
    return this.flash;
  }

  /** Static light at a point: ambient + moon (+ a lightning flash) + the baked lamps (closed doors applied). 0..1. */
  levelAt(x: number, y: number, z: number): number {
    this.levelInto(x, y, z);
    return this.res;
  }

  /** One baked lamp's gameplay light at a point (intensity x falloff x cone x visibility, doors applied). */
  lampAt(i: number, x: number, y: number, z: number): number {
    const pt = this.pt;
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
    this.lampInto(i);
    return this.res;
  }

  /** Baked visibility of lamp `i` at a point (0..1): trilinear between cell centres, clamped to its box. */
  visAt(i: number, x: number, y: number, z: number): number {
    const pt = this.pt;
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
    this.visInto(i);
    return this.res;
  }

  /** (LR16-1) The one-bounce fill at a point (0..1): the bounce grid read by `BounceGrid.sampleInto` (the walls kept),
   *  as `levelAt` adds it. */
  bounceAt(x: number, y: number, z: number): number {
    this.bounceInto(x, y, z);
    return this.res;
  }

  /** Moon visibility at a point (0..1); outside the grid the sky is open. */
  moonAt(x: number, y: number, z: number): number {
    const pt = this.pt;
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
    this.moonInto();
    return this.res;
  }

  /** Lights that are not baked (flashlights, anything added after the bake), each tested with `occluded`. 0..1. */
  dynamicAt(x: number, y: number, z: number, occluded?: Occluder): number {
    this.dynamicInto(x, y, z, occluded);
    return this.res;
  }

  /**
   * Everything at a point: `levelAt` + `dynamicAt`, clamped. (char-shadow-meter) With a contract `chars`, each member
   * of the gameplay lamp set (the column's lamps giving at least `CHAR_LIGHT.minLevel` here, the moon, the non-baked
   * lights) is scaled by the characters between it and the point (`CharOccluders.transmitInto`, `skip` the sampled
   * character's owner key); without one (or `null`) it is today's value to the bit.
   */
  totalAt(x: number, y: number, z: number, occluded?: Occluder, chars: CharOccluders | null = null, skip = -1): number {
    this.totalInto(x, y, z, occluded, chars, skip);
    return this.res;
  }

  /**
   * (char-shadow-meter) The gameplay set at a point (the members `totalAt` gives the character term), strongest first:
   * registry light ids (-1 the moon) into `ids`, their terms (no character term) into `lv`; returns the count (<= max).
   * A member with a zero term is left out. For ShadowCues (S3); no allocation.
   */
  sourcesInto(x: number, y: number, z: number, ids: Int32Array, lv: Float32Array, max: number, occluded?: Occluder): number {
    let n = 0;
    if (max <= 0) return 0;
    // (the point for the steps below: no double crosses their calls)
    const pt = this.pt;
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
    const b = this.bake;
    // (piano SO5) the sky term: the moon plus the lightning flash now, through the same visibility
    const sky = b ? b.moonLight + this.flash : 0;
    if (b && sky > 0) {
      this.moonInto();
      const m = sky * this.res;
      if (m > 0) {
        this.pushLv[0] = m;
        n = this.pushRes(ids, lv, n, max, -1);
      }
    }
    const cn = this.columnInto();
    for (let s = 0; s < cn; s++) {
      const L = this.colLv[s]!;
      if (L >= CHAR_LIGHT.minLevel && this.inLampSet(s, cn)) {
        this.pushLv[0] = L;
        n = this.pushRes(ids, lv, n, max, this.ids[this.colLamp[s]!]!);
      }
    }
    const ls = this.reg.lights;
    for (let i = 0; i < ls.length; i++) {
      if (i < this.isBaked.length && this.isBaked[i]) continue;
      this.dynTermInto(i, occluded);
      if (this.res > 0) {
        this.pushLv[0] = this.res;
        n = this.pushRes(ids, lv, n, max, i);
      }
    }
    return n;
  }

  /** (char-shadow-meter) One set member's term at a point (no character term): registry id `id` (-1 the moon), as
   *  `totalAt` sums it; 0 where it does not reach (a wall, a closed door, its visibility, off). */
  sourceAt(id: number, x: number, y: number, z: number, occluded?: Occluder): number {
    const pt = this.pt;
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
    if (id === -1) {
      const b = this.bake;
      const sky = b ? b.moonLight + this.flash : 0;
      if (!b || !(sky > 0)) return 0;
      this.moonInto();
      return sky * this.res;
    }
    if (id < 0) return 0;
    if (id < this.isBaked.length && this.isBaked[id]) {
      this.lampInto(this.bakeIdx[id]!);
      return this.res;
    }
    this.dynTermInto(id, occluded);
    return this.res;
  }

  /** (char-shadow-meter S3b) The point the Q calls read: x, y, z. A caller through an interface (`ShadowCues`'
   *  `CueField`) is not inlined, so V8 boxes each double argument it passes (16 B); written into these slots, nothing
   *  crosses the call as a double. */
  readonly qp = new Float64Array(3);
  /** (S3b) The Q calls' level (never a returned double). */
  readonly qr = new Float64Array(1);

  /** (S3b) `sourcesInto` at `qp`: the same steps, the same lists and count. */
  sourcesQ(ids: Int32Array, lv: Float32Array, max: number, occluded?: Occluder): number {
    let n = 0;
    if (max <= 0) return 0;
    // (the point for the steps below, copied once into `pt`: no double crosses their calls)
    const q = this.qp;
    const pt = this.pt;
    pt[0] = q[0]!;
    pt[1] = q[1]!;
    pt[2] = q[2]!;
    const b = this.bake;
    // (piano SO5) the sky term: the moon plus the lightning flash now, through the same visibility
    const sky = b ? b.moonLight + this.flash : 0;
    if (b && sky > 0) {
      this.moonInto();
      const m = sky * this.res;
      if (m > 0) {
        this.pushLv[0] = m;
        n = this.pushRes(ids, lv, n, max, -1);
      }
    }
    const cn = this.columnInto();
    for (let s = 0; s < cn; s++) {
      const L = this.colLv[s]!;
      if (L >= CHAR_LIGHT.minLevel && this.inLampSet(s, cn)) {
        this.pushLv[0] = L;
        n = this.pushRes(ids, lv, n, max, this.ids[this.colLamp[s]!]!);
      }
    }
    const ls = this.reg.lights;
    for (let i = 0; i < ls.length; i++) {
      if (i < this.isBaked.length && this.isBaked[i]) continue;
      this.dynTermInto(i, occluded);
      if (this.res > 0) {
        this.pushLv[0] = this.res;
        n = this.pushRes(ids, lv, n, max, i);
      }
    }
    return n;
  }

  /** (S3b) `sourceAt` at `qp`, into `qr[0]`. */
  sourceQ(id: number, occluded?: Occluder): void {
    const q = this.qp;
    const pt = this.pt;
    pt[0] = q[0]!;
    pt[1] = q[1]!;
    pt[2] = q[2]!;
    const r = this.qr;
    if (id === -1) {
      const b = this.bake;
      const sky = b ? b.moonLight + this.flash : 0;
      if (!b || !(sky > 0)) {
        r[0] = 0;
        return;
      }
      this.moonInto();
      r[0] = sky * this.res;
      return;
    }
    if (id < 0) {
      r[0] = 0;
      return;
    }
    if (id < this.isBaked.length && this.isBaked[id]) {
      this.lampInto(this.bakeIdx[id]!);
      r[0] = this.res;
      return;
    }
    this.dynTermInto(id, occluded);
    r[0] = this.res;
  }

  /** (S3b) `totalAt` at `qp` (with the contract `chars`, `skip` the sampled character's owner key), into `qr[0]`. */
  totalQ(occluded: Occluder | undefined, chars: CharOccluders | null, skip: number): void {
    const q = this.qp;
    this.totalInto(q[0]!, q[1]!, q[2]!, occluded, chars, skip);
    this.qr[0] = this.res;
  }

  /**
   * How lit a standing or crouched body is: the brighter of the chest and head samples, so a head poking out of a
   * shadow into a lamp's pool shows. `height` is the head height above the feet (crouch lowers it). (locomotion step
   * 12) `hx`, `hz`: the head's horizontal offset from the feet (a peek past a wall edge), so the head is sampled where
   * it is (light parity, bible 5.1).
   */
  bodyLevel(x: number, feetY: number, z: number, height: number, occluded?: Occluder, hx = 0, hz = 0, chars: CharOccluders | null = null, skip = -1): number {
    this.totalInto(x, feetY + height * 0.6, z, occluded, chars, skip);
    const chest = this.res;
    if (chest >= 1) return 1;
    this.totalInto(x + hx, feetY + height * 0.95, z + hz, occluded, chars, skip);
    const head = this.res;
    return chest > head ? chest : head;
  }

  private totalInto(x: number, y: number, z: number, occluded: Occluder | undefined, ch: CharOccluders | null = null, skip = -1): void {
    this.levelInto(x, y, z, ch, skip);
    const s = this.res;
    if (s >= 1) {
      this.res = 1;
      return;
    }
    this.dynamicInto(x, y, z, occluded, ch, skip);
    const v = s + this.res;
    this.res = v > 1 ? 1 : v;
  }

  /** (char-shadow-meter) The `pt` point's 2 m column: its lamps' bake indices into `colLamp`, their terms into `colLv`;
   *  returns how many (0 outside the grid or without a bake). */
  private columnInto(): number {
    const g = this.grid;
    if (!g) return 0;
    const q = Math.floor((this.pt[0]! - this.gx) / LAMP_GRID);
    const r = Math.floor((this.pt[2]! - this.gz) / LAMP_GRID);
    if (q < 0 || r < 0 || q >= g.cols || r >= g.rows) return 0;
    const base = lampGridBase(g.cols, q, r);
    let n = 0;
    for (let s = 0; s < LAMP_GRID_SLOTS; s++) {
      const fid = g.data[base + s]!;
      if (fid === 0) break;
      this.colLamp[n] = fid - 1;
      n++;
    }
    for (let s = 0; s < n; s++) {
      this.lampInto(this.colLamp[s]!);
      this.colLv[s] = this.res;
    }
    return n;
  }

  /** (char-shadow-meter, BRIEF A1's undo) Column lamp `s` of `n` is among the `CHAR_LIGHT.maxLamps` strongest set
   *  members there (ties: the earlier slot); always true while the cap is unlimited. */
  private inLampSet(s: number, n: number): boolean {
    const cap = CHAR_LIGHT.maxLamps;
    if (!(cap < n)) return true;
    const L = this.colLv[s]!;
    let rank = 0;
    for (let k = 0; k < n; k++) {
      const M = this.colLv[k]!;
      if (M >= CHAR_LIGHT.minLevel && (M > L || (M === L && k < s))) rank++;
    }
    return rank < cap;
  }

  /** (char-shadow-meter) Insert (id, `pushLv[0]`) into the strongest-first lists of `n` entries, keeping at most `max`
   *  (ties: the earlier member first); returns the new count. (No double crosses the call.) */
  private pushRes(ids: Int32Array, lv: Float32Array, n: number, max: number, id: number): number {
    const level = this.pushLv[0]!;
    let j = n < max ? n : max;
    // (a member no stronger than the last kept one when full: dropped)
    if (j === max && !(level > lv[max - 1]!)) return n;
    while (j > 0 && level > lv[j - 1]!) {
      if (j < max) {
        ids[j] = ids[j - 1]!;
        lv[j] = lv[j - 1]!;
      }
      j--;
    }
    ids[j] = id;
    lv[j] = level;
    return n < max ? n + 1 : max;
  }

  /** (char-shadow-meter) Baked lamp `i`'s position now (a swinging pendant's offset applied, as `lampInto`) into
   *  `out[0..3)`. */
  private lampPosInto(i: number, out: Float64Array): void {
    const l = this.reg.lights[this.ids[i]!]!;
    const o = i * LS;
    out[0] = this.lamp[o]! + l.swx;
    out[1] = this.lamp[o + 1]! + l.swy;
    out[2] = this.lamp[o + 2]! + l.swz;
  }

  private levelInto(x: number, y: number, z: number, ch: CharOccluders | null = null, skip = -1): void {
    const b = this.bake;
    // (no bake: the registry's ambient; every light is dynamic)
    if (!b) {
      this.res = this.reg.ambientAt(x, y, z);
      return;
    }
    const pt = this.pt;
    pt[0] = x;
    pt[1] = y;
    pt[2] = z;
    // (shadow audit) the ambient fill read trilinearly, as the shaders' bilinear `lampAmb` texture reads it
    this.triInto(b.ambient.data, this.ambG!, 0);
    let v = this.res;
    // (LR16-1) the lit lamps' bounce: the same cells, read without blending across a wall (fix round), as the shader
    // reads the fill texture's green channel
    if (this.bounce.active) {
      this.bounceInto(x, y, z);
      v += this.res;
    }
    // (piano SO5) the sky term: the moon plus the lightning flash now (`setFlash`), through the moon's visibility, so a
    // window lets a flash in, a closed room stays dark and a character between shadows it (the moon's set member, -1)
    const sky = b.moonLight + this.flash;
    if (sky > 0) {
      this.moonInto();
      let m = sky * this.res;
      // (char-shadow-meter) the moon's source: `moonFar` m along its direction from the point
      if (ch !== null && m > 0) {
        const d = b.moon.dir;
        const far = CHAR_LIGHT.moonFar;
        // (`ch.transmitInto` through its `q` slots: no double crosses a call, so nothing is boxed)
        const q = ch.q;
        q[0] = x + d[0] * far;
        q[1] = y + d[1] * far;
        q[2] = z + d[2] * far;
        q[3] = x;
        q[4] = y;
        q[5] = z;
        ch.transmitQ(skip);
        m *= ch.t;
      }
      v += m;
    }
    // (char-shadow-meter) with a contract: the column's set lamps scaled by the characters between
    if (ch !== null) {
      const n = this.columnInto();
      for (let s = 0; s < n; s++) {
        let L = this.colLv[s]!;
        if (L >= CHAR_LIGHT.minLevel && this.inLampSet(s, n)) {
          this.lampPosInto(this.colLamp[s]!, ch.q);
          const q = ch.q;
          q[3] = x;
          q[4] = y;
          q[5] = z;
          ch.transmitQ(skip);
          L *= ch.t;
        }
        v += L;
        if (v >= 1) {
          this.res = 1;
          return;
        }
      }
      this.res = v < 0 ? 0 : v > 1 ? 1 : v;
      return;
    }
    const g = this.grid;
    if (g) {
      const q = Math.floor((x - this.gx) / LAMP_GRID);
      const r = Math.floor((z - this.gz) / LAMP_GRID);
      if (q >= 0 && r >= 0 && q < g.cols && r < g.rows) {
        const base = lampGridBase(g.cols, q, r);
        for (let s = 0; s < LAMP_GRID_SLOTS; s++) {
          const fid = g.data[base + s]!;
          if (fid === 0) break;
          this.lampInto(fid - 1);
          v += this.res;
          if (v >= 1) {
            this.res = 1;
            return;
          }
        }
      }
    }
    this.res = v < 0 ? 0 : v > 1 ? 1 : v;
  }

  /** Baked lamp `i`'s term at the `pt` point into `res`. */
  private lampInto(i: number): void {
    this.res = 0;
    const l = this.reg.lights[this.ids[i]!];
    if (!l || !l.on || l.destroyed || l.intensity <= 0) return;
    const pt = this.pt;
    const x = pt[0]!;
    const y = pt[1]!;
    const z = pt[2]!;
    const o = i * LS;
    const P = this.lamp;
    // (LR16-5b) where it hangs now: a swinging pendant's offset (0 for every other lamp), as the data texture's t0;
    // its visibility stays the rest bake, read at the receiver point (`visInto`)
    const lx = P[o]! + l.swx;
    const ly = P[o + 1]! + l.swy;
    const lz = P[o + 2]! + l.swz;
    // falloff x cone: `lampMath.photoTerm` (`photoFalloff` x the feathered `lampCone`, LR16b) written out (this path
    // must not box a returned double; change both together - the brute-force tests in `tests/lightField.test.ts` /
    // `lampFalloff.test.ts` compare them)
    const vx = x - lx;
    const vy = y - ly;
    const vz = z - lz;
    const rr = P[o + 3]!;
    if (vx > rr || vx < -rr || vy > rr || vy < -rr || vz > rr || vz < -rr) return;
    const d = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (d >= rr) return;
    const q = (d * d) / (rr * rr);
    const w = 1 - q * q;
    let t = (PHOTO_NUM / (d * d + PHOTO_NEAR2)) * w * w;
    if (d >= 1e-4) {
      const ca = (vx * P[o + 4]! + vy * P[o + 5]! + vz * P[o + 6]!) / d;
      const cut = P[o + 7]!;
      if (ca <= cut) return;
      const c = ca > 1e-4 ? ca : 1e-4;
      const e = P[o + 8]!;
      t *= e === 1 ? c : e === 2 ? c * c : Math.pow(c, e);
      // (LR16b) the feathered edge: a smoothstep over `coneFeather(e)` x (1 - cut)
      const band = (e < 1.5 ? LAMP_FEATHER : SPOT_FEATHER) * (1 - cut);
      const ft = band > 1e-6 ? (ca - cut) / band : 1;
      if (ft < 1) t *= ft * ft * (3 - 2 * ft);
    }
    this.visInto(i);
    const vis = this.res;
    this.res = 0;
    if (vis <= 0) return;
    // (the lamp's own door list, as the shaders test it)
    const ns = this.doorSlots;
    const sg = this.seg;
    sg[0] = lx;
    sg[1] = ly;
    sg[2] = lz;
    sg[3] = x;
    sg[4] = y;
    sg[5] = z;
    for (let j = 0; j < ns; j++) {
      const k = this.lampDoors[i * ns + j]!;
      if (k < 0) break;
      if (this.doorBlocksOne(k)) return;
    }
    // (LR16-5) x the lamp's live flicker (1 steady), the value the shader's lamp colour carries
    this.res = LAMP_LEVEL_GAIN * l.intensity * l.flicker * t * vis;
  }

  /** Lamp `i`'s baked visibility at the `pt` point into `res`. */
  private visInto(i: number): void {
    this.triInto(this.bake!.lamps!.r.vis, this.lamp, i * LS + LG);
  }

  /** The bounce grid (synced to the registry first: one compare when nothing changed) into `res`. */
  private bounceInto(x: number, y: number, z: number): void {
    const bg = this.bounce;
    if (!bg.active) {
      this.res = 0;
      return;
    }
    bg.sync(this.reg);
    bg.sampleInto(x, y, z);
    this.res = bg.out;
  }

  /** Moon visibility at the `pt` point into `res`. */
  private moonInto(): void {
    const m = this.bake?.moon;
    const G = this.moonG;
    if (!m || !G) {
      this.res = 1;
      return;
    }
    const x = this.pt[0]!;
    const y = this.pt[1]!;
    const z = this.pt[2]!;
    const c = G[7]!;
    if (x < G[1]! || z < G[3]! || x > G[1]! + G[4]! * c || z > G[3]! + G[6]! * c || y > G[2]! + G[5]! * c) {
      this.res = 1;
      return;
    }
    this.triInto(m.vis, G, 0);
  }

  /** `trilinear` at the `pt` point into `res`, the grid's at, ox, oy, oz, nx, ny, nz, cell read from `g[k ..]`. */
  private triInto(v: Uint8Array, g: Float64Array, k: number): void {
    const at = g[k]!;
    const ox = g[k + 1]!;
    const oy = g[k + 2]!;
    const oz = g[k + 3]!;
    const nx = g[k + 4]!;
    const ny = g[k + 5]!;
    const nz = g[k + 6]!;
    const c = g[k + 7]!;
    const x = this.pt[0]!;
    const y = this.pt[1]!;
    const z = this.pt[2]!;
    let u = (x - ox) / c - 0.5;
    let w = (y - oy) / c - 0.5;
    let s = (z - oz) / c - 0.5;
    u = u < 0 ? 0 : u > nx - 1 ? nx - 1 : u;
    w = w < 0 ? 0 : w > ny - 1 ? ny - 1 : w;
    s = s < 0 ? 0 : s > nz - 1 ? nz - 1 : s;
    const x0 = Math.floor(u);
    const y0 = Math.floor(w);
    const z0 = Math.floor(s);
    const x1 = x0 + 1 < nx ? x0 + 1 : x0;
    const y1 = y0 + 1 < ny ? y0 + 1 : y0;
    const z1 = z0 + 1 < nz ? z0 + 1 : z0;
    const fx = u - x0;
    const fy = w - y0;
    const fz = s - z0;
    const r0 = at + nx * (y0 + ny * z0);
    const r1 = at + nx * (y1 + ny * z0);
    const r2 = at + nx * (y0 + ny * z1);
    const r3 = at + nx * (y1 + ny * z1);
    const a = v[r0 + x0]! + (v[r0 + x1]! - v[r0 + x0]!) * fx;
    const b = v[r1 + x0]! + (v[r1 + x1]! - v[r1 + x0]!) * fx;
    const e = v[r2 + x0]! + (v[r2 + x1]! - v[r2 + x0]!) * fx;
    const f = v[r3 + x0]! + (v[r3 + x1]! - v[r3 + x0]!) * fx;
    const ab = a + (b - a) * fy;
    const ef = e + (f - e) * fy;
    this.res = (ab + (ef - ab) * fz) / 255;
  }

  /** The non-baked lights (every light, without a bake), into `res`. */
  private dynamicInto(x: number, y: number, z: number, occluded: Occluder | undefined, ch: CharOccluders | null = null, skip = -1): void {
    let v = 0;
    const ls = this.reg.lights;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]!;
      if (i < this.isBaked.length && this.isBaked[i]) continue;
      if (!l.on || l.destroyed || l.intensity <= 0) continue;
      // (LR16 fix) a fixed lamp photometric, a flashlight linear: `lights.lightTerm`, as `contribution`
      let t = LAMP_LEVEL_GAIN * l.intensity * l.flicker * lightTerm(l, x, y, z);
      if (t <= 0.01) continue;
      if (l.beamCut) {
        // (piano SO3) a torch with no shadow map: the picture's own cut at the beam's reach, not the ray test
        t *= beamCutAt(l, x, y, z);
        if (t <= 0.01) continue;
      } else if (occluded && occluded(l, x, y, z)) continue;
      if (this.doors.length && this.doorBlocks(l.x, l.y, l.z, x, y, z)) continue;
      // (char-shadow-meter) every non-baked light is in the set (a flashlight's holder is never its shadow: A5)
      if (ch !== null) {
        const q = ch.q;
        q[0] = l.x;
        q[1] = l.y;
        q[2] = l.z;
        q[3] = x;
        q[4] = y;
        q[5] = z;
        ch.transmitQ(skip);
        t *= ch.t;
      }
      v += t;
      if (v >= 1) {
        this.res = 1;
        return;
      }
    }
    this.res = v < 0 ? 0 : v;
  }

  /** (char-shadow-meter) Non-baked light `i`'s term at the `pt` point as `dynamicInto` sums it (0 when it is left
   *  out), into `res`. */
  private dynTermInto(i: number, occluded: Occluder | undefined): void {
    this.res = 0;
    const l = this.reg.lights[i];
    if (!l || !l.on || l.destroyed || l.intensity <= 0) return;
    const pt = this.pt;
    const x = pt[0]!;
    const y = pt[1]!;
    const z = pt[2]!;
    let t = LAMP_LEVEL_GAIN * l.intensity * l.flicker * lightTerm(l, x, y, z);
    if (t <= 0.01) return;
    if (l.beamCut) {
      // (piano SO3) as `dynamicInto`
      t *= beamCutAt(l, x, y, z);
      if (t <= 0.01) return;
    } else if (occluded && occluded(l, x, y, z)) return;
    if (this.doors.length) {
      const sg = this.seg;
      sg[0] = l.x;
      sg[1] = l.y;
      sg[2] = l.z;
      sg[3] = x;
      sg[4] = y;
      sg[5] = z;
      if (this.segBlocked()) return;
    }
    this.res = t;
  }

  /** A closed door leaf between (ax, ay, az) and (bx, by, bz)? */
  doorBlocks(ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const sg = this.seg;
    sg[0] = ax;
    sg[1] = ay;
    sg[2] = az;
    sg[3] = bx;
    sg[4] = by;
    sg[5] = bz;
    return this.segBlocked();
  }

  /** `doorBlocks` for the segment in `seg`. */
  private segBlocked(): boolean {
    for (let i = 0; i < this.doors.length; i++) if (this.doorBlocksOne(i)) return true;
    return false;
  }

  /** Door `i`'s leaf, if closed, across the segment in `seg` (the same test as `nsDoorBlocks` in the shaders). */
  private doorBlocksOne(i: number): boolean {
    const d = this.doors[i]!;
    if (d.open > DOOR_SHUT) return false;
    const sg = this.seg;
    const ax = sg[0]!;
    const ay = sg[1]!;
    const az = sg[2]!;
    const bx = sg[3]!;
    const by = sg[4]!;
    const bz = sg[5]!;
    const a = d.anchor;
    const ux = Math.sin(a.yaw);
    const uz = Math.cos(a.yaw);
    // the leaf's plane: through the hinge, along u; its normal is (uz, -ux)
    const sa = (ax - a.hinge.x) * uz - (az - a.hinge.z) * ux;
    const sb = (bx - a.hinge.x) * uz - (bz - a.hinge.z) * ux;
    if ((sa > 0 && sb > 0) || (sa < 0 && sb < 0) || sa === sb) return false;
    const t = sa / (sa - sb);
    const px = ax + (bx - ax) * t - a.hinge.x;
    const py = ay + (by - ay) * t;
    const pz = az + (bz - az) * t - a.hinge.z;
    const s = px * ux + pz * uz;
    return s >= 0 && s <= a.width && py >= a.hinge.y && py <= a.hinge.y + a.height;
  }
}

/**
 * Trilinear read of a byte grid (x fastest) starting at `at`, minimum corner (ox, oy, oz), counts (nx, ny, nz),
 * cell `c`: between cell centres, clamped to the grid as a clamped linear texture is. 0..1.
 */
export function trilinear(v: Uint8Array, at: number, ox: number, oy: number, oz: number, nx: number, ny: number, nz: number, c: number, x: number, y: number, z: number): number {
  let u = (x - ox) / c - 0.5;
  let w = (y - oy) / c - 0.5;
  let s = (z - oz) / c - 0.5;
  u = u < 0 ? 0 : u > nx - 1 ? nx - 1 : u;
  w = w < 0 ? 0 : w > ny - 1 ? ny - 1 : w;
  s = s < 0 ? 0 : s > nz - 1 ? nz - 1 : s;
  const x0 = Math.floor(u);
  const y0 = Math.floor(w);
  const z0 = Math.floor(s);
  const x1 = x0 + 1 < nx ? x0 + 1 : x0;
  const y1 = y0 + 1 < ny ? y0 + 1 : y0;
  const z1 = z0 + 1 < nz ? z0 + 1 : z0;
  const fx = u - x0;
  const fy = w - y0;
  const fz = s - z0;
  const r0 = at + nx * (y0 + ny * z0);
  const r1 = at + nx * (y1 + ny * z0);
  const r2 = at + nx * (y0 + ny * z1);
  const r3 = at + nx * (y1 + ny * z1);
  const a = v[r0 + x0]! + (v[r0 + x1]! - v[r0 + x0]!) * fx;
  const b = v[r1 + x0]! + (v[r1 + x1]! - v[r1 + x0]!) * fx;
  const e = v[r2 + x0]! + (v[r2 + x1]! - v[r2 + x0]!) * fx;
  const f = v[r3 + x0]! + (v[r3 + x1]! - v[r3 + x0]!) * fx;
  const ab = a + (b - a) * fy;
  const ef = e + (f - e) * fy;
  return (ab + (ef - ab) * fz) / 255;
}
