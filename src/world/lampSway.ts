/**
 * (LR16-5b, Michael M14 `BRIEF.md:61`) Swinging pendants on Marlow Yard: a hung fitting sways when a round passes close,
 * a grenade goes off near it or a head bumps it, then settles. Pure (no Babylon, no DOM) and allocation-free on the hot
 * calls. A pendant's live offset is a function of (its kicks, the sim time) only, so the host and a co-op client agree
 * with no per-frame wire: only a kick crosses (`{ e: 'sway' }`, the host's numbers applied verbatim).
 *
 * - Bifilar hang (two parallel cables / rods): the body translates and stays level, so the cone axis never tilts. With
 *   `L` the mean claimed hanger length, `w = sqrt(g / L)`, `wd = sqrt(w^2 - 1 / tau^2)`:
 *   `off(t) = sum_i A_i e^-((t - t_i) / tau) sin(wd (t - t_i)) (cos h_i, sin h_i)` on (x, z), `swy = (swx^2 + swz^2) / 2L`.
 * - A kick of speed v asks `A = v / w`, capped at `maxAmp - E(t0)` (E: the sum of the live envelopes), so `|off| <=
 *   maxAmp` always; under `minAmp` it is dropped (no event). `slots` kicks per pendant in a ring; full: the one with the
 *   smallest envelope at t0 is replaced; an envelope under `RETIRE` contributes nothing and frees its slot.
 * - The ring changes only when a kick is placed (at its own t0), never when it is read, so the same kicks in the same
 *   order give the same ring and the same offsets on every page.
 * - Visibility stays the rest-pose bake (audit `lr16-0-ct-audit.md:81`: the error is acceptable under 0.3 m); the light
 *   field, the baked lamps' data texture, the fittings and the hangers read rest + offset (light parity).
 */
import { hyp2, hyp3 } from '../core/mathx';
import { CANON_MIN_THICK } from '../voxel/lightShapes';
import { FLICKER_STUTTER, findTube, lampMapId } from './lampFlicker';
import type { BoxPiece } from './levelBuilder';
import type { LightDef, LightRegistry } from './lights';

/** The sway's tuning (m, s, m/s). */
export const SWAY = {
  /** The largest offset (m): the visibility stays the rest-pose bake, whose error the audit accepts under 0.3 m. */
  maxAmp: 0.25,
  /** Amplitude e-fold time (s): a full swing is under `still` in ~16 s, "settles in ~15 s". */
  tau: 5,
  /** A round through the fitting (m/s at its centre): a clear swing (0.17 m on the 2.4 m rods) that never hits the cap alone. */
  kickShot: 0.35,
  /** A head bump (m/s): a nudge, smaller than a round. */
  kickBump: 0.25,
  /** A blast at the fitting (m/s), linear to 0 at `blastReach`: a grenade under it swings it to the cap. */
  kickBlast: 0.7,
  /** A blast's reach (m): a grenade's radius-ish; further out the fitting does not visibly move. */
  blastReach: 6,
  /** A round's closest approach to the fitting centre (m) that still kicks it: the wind of a near miss. */
  graze: 0.6,
  /** A round's impact point within this of the fitting centre (m) kicks it away from the impact (ceiling / wall hits). */
  near: 1.5,
  /** A head point within this of the fitting's box (m) bumps it. */
  bumpReach: 0.35,
  /** Least time between two accepted kicks of one pendant (s, host): a burst of fire is one swing, not 10 events. */
  minGap: 0.2,
  /** A kick that would move it less than this (m) is dropped: no visible change, no event. */
  minAmp: 0.005,
  /** Kicks a pendant remembers: a burst plus a grenade; full, the weakest goes. */
  slots: 4,
  /** A pendant whose envelope is over this (m) is moving: its character-shadow slot is held and refreshed every frame. */
  still: 0.01,
  /** A table entry's match tolerance (m, each axis): `lampFlicker.TUBE_TOL`'s rule. */
  tol: 0.05,
} as const;

/** An envelope under this (m) contributes nothing and frees its slot. */
export const SWAY_RETIRE = 0.002;
/** Gravity (m/s^2). */
const G = 9.81;
/** Ring values per kick: t, A, h, cos h, sin h. */
const KS = 5;
/** Hanger values: pendant index, x, z, top y, bottom y, thickness x, thickness z. */
export const HANGER_STRIDE = 7;
/** A hanger's claim: its centre within the fixture's plan + this (m). */
const PLAN_PAD = 0.1;
/** A hanger's bottom within this above the fixture top (m) (and `BOTTOM_SLACK` below it). */
const BOTTOM_REACH = 0.25;
const BOTTOM_SLACK = 0.02;
/** A hanger is vertical and longer than this (m). */
const HANGER_MIN = 0.3;

/** A kick the host accepted: registry id, sim time, amplitude, heading (rad; (cos h, sin h) on (x, z)). */
export type SwayKick = (id: number, t: number, a: number, h: number) => void;

/** A table entry: the pendant's light position and where it is. */
export interface SwayPendantSpec {
  x: number;
  y: number;
  z: number;
  why: string;
}

/**
 * The swinging pendants per map (ctcourse only). Every entry that matches a fixed light (within `SWAY.tol` on each axis)
 * becomes a pendant; ids are resolved by position at load, the same on both pages. The marlow-final rows (master) match
 * after the master merge; the pre-marlow-final rows (this base) drop out then. Not the S5 roof lamp (flush), not the A8
 * chandeliers (rigid rods), never the LR16-5 stutter tube.
 */
export const SWAY_PENDANTS: Readonly<Record<string, readonly SwayPendantSpec[]>> = {
  ctcourse: [
    { x: 90.5, y: 5.6, z: 31.45, why: 'marlow-final A4 aisle-2 strip (a4GoodsShed.ts:355), 2 cables x +-0.7, L 1.83 m' },
    { x: 100, y: 5.6, z: 31.45, why: 'marlow-final A4 aisle-2 strip (a4GoodsShed.ts:355), 2 cables x +-0.7, L 1.83 m' },
    { x: 94, y: 6.3, z: 46, why: 'marlow-final A4 mezzanine strip (a4GoodsShed.ts:356), 2 cables x +-0.7, L 1.13 m' },
    { x: 99, y: 6.3, z: 46, why: 'marlow-final A4 mezzanine strip (a4GoodsShed.ts:356), 2 cables x +-0.7, L 1.13 m' },
    { x: 41, y: 6.5, z: 12.5, why: 'marlow-final A2 shed strip (a2CarriageShed.ts:242), 2 cables x +-0.6, L 0.93 m' },
    { x: 26, y: 5, z: 7, why: 'pre-marlow-final S2 lamp A (ctcourse.ts pendant), 2 rods x +-0.5, L 2.38 m' },
    { x: 34.5, y: 5, z: 7, why: 'pre-marlow-final S2 lamp B, 2 rods x +-0.5, L 2.38 m' },
    { x: 92, y: 5, z: 7, why: 'pre-marlow-final S5 lamp A, 2 rods x +-0.5, L 2.38 m' },
    { x: 136, y: 5, z: 7, why: 'pre-marlow-final S7 lamp A, 2 rods x +-0.5, L 2.38 m' },
  ],
};

/** One pendant as `SwaySet` takes it: the light and its claimed hangers (x, z, top, bottom, thickness x, z). */
export interface SwayPendant {
  light: LightDef;
  hangers: readonly (readonly [number, number, number, number, number, number])[];
}

/** The live pendants of a level (`LightRegistry.sway`). */
export class SwaySet {
  readonly n: number;
  /** Registry id per pendant. */
  readonly ids: Int32Array;
  /** The fixture centre at rest (x, y, z) and its half sizes, per pendant. */
  readonly centre: Float64Array;
  readonly half: Float64Array;
  /** The mean hanger length (m), the natural and the damped angular frequency (rad/s), per pendant. */
  readonly len: Float64Array;
  readonly w: Float64Array;
  readonly wd: Float64Array;
  /** The kicks: `slots` per pendant, `KS` values each (t, A, h, cos h, sin h); A = 0 an empty slot. */
  readonly ring: Float64Array;
  /** The live offset (x, y, z) and envelope (m) per pendant, at the last tick. */
  readonly off: Float64Array;
  readonly env: Float64Array;
  /** The last accepted kick's time per pendant (host: `SWAY.minGap`). */
  readonly last: Float64Array;
  /** The hangers (`HANGER_STRIDE` each) and how many. */
  readonly hangers: Float64Array;
  readonly hangerCount: number;
  /** A host's accepted kick (the co-op host sends it; solo: unset). Set once, not per frame. */
  onKick: SwayKick | null = null;
  /** Per pendant: written 0 with nothing live (skipped until a kick lands). */
  private readonly quiet: Uint8Array;
  /** The tick's time (s) in, so the call boxes no double (`LightRegistry.tickSway` writes it). */
  readonly time = new Float64Array(1);
  /** Scratch: [0] the envelope sum, [1] the slot to write, [2] a kick's speed, [3] its heading, [4] its time, [5] its
   *  amplitude. */
  private readonly tmp = new Float64Array(6);

  constructor(pendants: readonly SwayPendant[]) {
    const n = pendants.length;
    this.n = n;
    this.ids = new Int32Array(n);
    this.centre = new Float64Array(n * 3);
    this.half = new Float64Array(n * 3);
    this.len = new Float64Array(n);
    this.w = new Float64Array(n);
    this.wd = new Float64Array(n);
    this.ring = new Float64Array(n * SWAY.slots * KS);
    this.off = new Float64Array(n * 3);
    this.env = new Float64Array(n);
    this.last = new Float64Array(n).fill(-Infinity);
    this.quiet = new Uint8Array(n).fill(1);
    let nh = 0;
    for (const p of pendants) nh += p.hangers.length;
    this.hangerCount = nh;
    this.hangers = new Float64Array(nh * HANGER_STRIDE);
    let h = 0;
    for (let k = 0; k < n; k++) {
      const p = pendants[k]!;
      const l = p.light;
      const f = l.fixture;
      this.ids[k] = l.id;
      this.centre[k * 3] = l.x;
      this.centre[k * 3 + 1] = l.y + (f ? f.oy : 0);
      this.centre[k * 3 + 2] = l.z;
      this.half[k * 3] = f ? f.sx / 2 : 0.1;
      this.half[k * 3 + 1] = f ? f.sy / 2 : 0.1;
      this.half[k * 3 + 2] = f ? f.sz / 2 : 0.1;
      let sum = 0;
      for (const g of p.hangers) {
        const o = h * HANGER_STRIDE;
        this.hangers[o] = k;
        for (let j = 0; j < 6; j++) this.hangers[o + 1 + j] = g[j]!;
        sum += g[2] - g[3];
        h++;
      }
      const L = p.hangers.length ? Math.max(0.2, sum / p.hangers.length) : 1;
      this.len[k] = L;
      this.w[k] = Math.sqrt(G / L);
      this.wd[k] = Math.sqrt(G / L - 1 / (SWAY.tau * SWAY.tau));
    }
  }

  /** The pendant index of registry id `id`, or -1. */
  indexOf(id: number): number {
    const ids = this.ids;
    for (let k = 0; k < ids.length; k++) if (ids[k] === id) return k;
    return -1;
  }

  /** A pendant's moving now (its envelope over `SWAY.still`, at the last tick). */
  moving(k: number): boolean {
    return this.env[k]! > SWAY.still;
  }

  /**
   * The offsets at time `time[0]` (s): each pendant's `off` / `env` and its light's `swx, swy, swz`. A pendant with
   * nothing live is skipped after one write of 0. True when a light's offset moved. No allocation.
   */
  tick(lights: readonly LightDef[]): boolean {
    const t = this.time[0]!;
    const ring = this.ring;
    const S = SWAY.slots;
    let moved = false;
    for (let k = 0; k < this.n; k++) {
      if (this.quiet[k]) continue;
      const wd = this.wd[k]!;
      let sx = 0;
      let sz = 0;
      let e = 0;
      let live = false;
      for (let j = 0; j < S; j++) {
        const o = (k * S + j) * KS;
        const A = ring[o + 1]!;
        if (!(A > 0)) continue;
        const dt = t - ring[o]!;
        // (a kick from the host's future: the client's clock is behind; it starts when the clock gets there)
        if (dt < 0) {
          live = true;
          continue;
        }
        const en = A * Math.exp(-dt / SWAY.tau);
        if (en < SWAY_RETIRE) continue;
        live = true;
        const s = en * Math.sin(wd * dt);
        sx += s * ring[o + 3]!;
        sz += s * ring[o + 4]!;
        e += en;
      }
      const sy = (sx * sx + sz * sz) / (2 * this.len[k]!);
      if (!live) this.quiet[k] = 1;
      this.off[k * 3] = sx;
      this.off[k * 3 + 1] = sy;
      this.off[k * 3 + 2] = sz;
      this.env[k] = e;
      const l = lights[this.ids[k]!];
      if (l && (l.swx !== sx || l.swy !== sy || l.swz !== sz)) {
        l.swx = sx;
        l.swy = sy;
        l.swz = sz;
        moved = true;
      }
    }
    return moved;
  }

  /** The live envelopes' sum at `tmp[4]` (s) into `tmp[0]`, and the slot a new kick takes into `tmp[1]` (a free one, else the
   *  smallest envelope's). Placement-only: reading never changes the ring. */
  private scan(k: number): void {
    const t = this.tmp[4]!;
    const ring = this.ring;
    const S = SWAY.slots;
    let sum = 0;
    let free = -1;
    let small = 0;
    let least = Infinity;
    for (let j = 0; j < S; j++) {
      const o = (k * S + j) * KS;
      const A = ring[o + 1]!;
      const dt = t - ring[o]!;
      const en = !(A > 0) ? 0 : dt < 0 ? A : A * Math.exp(-dt / SWAY.tau);
      if (en < SWAY_RETIRE) {
        if (free < 0) free = j;
        continue;
      }
      sum += en;
      if (en < least) {
        least = en;
        small = j;
      }
    }
    this.tmp[0] = sum;
    this.tmp[1] = free >= 0 ? free : small;
  }

  /** A kick at `tmp[4]` (t), amplitude `tmp[5]`, heading `tmp[3]` into the slot `scan` chose. */
  private place(k: number): void {
    const tmp = this.tmp;
    const t = tmp[4]!;
    const a = tmp[5]!;
    const h = tmp[3]!;
    const o = (k * SWAY.slots + tmp[1]!) * KS;
    const ring = this.ring;
    ring[o] = t;
    ring[o + 1] = a;
    ring[o + 2] = h;
    ring[o + 3] = Math.cos(h);
    ring[o + 4] = Math.sin(h);
    this.quiet[k] = 0;
  }

  /** Host / solo: a kick of speed `tmp[2]` (m/s) along heading `tmp[3]` at `tmp[4]`: capped, placed, reported. True when
   *  accepted. (Doubles in and out through `tmp`: a non-inlined call boxes none.) */
  private kick(k: number): boolean {
    const tmp = this.tmp;
    const t = tmp[4]!;
    if (t - this.last[k]! < SWAY.minGap) return false;
    this.scan(k);
    const a = Math.min(tmp[2]! / this.w[k]!, SWAY.maxAmp - tmp[0]!);
    if (!(a >= SWAY.minAmp)) return false;
    tmp[5] = a;
    this.place(k);
    this.last[k] = t;
    this.onKick?.(this.ids[k]!, t, a, tmp[3]!);
    return true;
  }

  /** A received kick (co-op client), verbatim: no cap, no gap (the host's numbers are final; the same order gives the
   *  same ring). Unknown ids are ignored. */
  apply(id: number, t: number, a: number, h: number): void {
    const k = this.indexOf(id);
    if (k < 0 || !(a > 0)) return;
    const tmp = this.tmp;
    tmp[3] = h;
    tmp[4] = t;
    tmp[5] = a;
    this.scan(k);
    this.place(k);
    if (t > this.last[k]!) this.last[k] = t;
  }

  /**
   * A round from a to b against pendant `k` (its fitting where it hangs now): the speed into `tmp[2]` and the heading
   * into `tmp[3]`; false when it does not kick. A closest approach under `graze` kicks along the round's heading, an impact
   * within `near` away from the impact; the larger wins. No allocation.
   */
  private shotProbe(k: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    const cx = this.centre[k * 3]! + this.off[k * 3]!;
    const cy = this.centre[k * 3 + 1]! + this.off[k * 3 + 1]!;
    const cz = this.centre[k * 3 + 2]! + this.off[k * 3 + 2]!;
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len2 = dx * dx + dy * dy + dz * dz;
    let u = len2 > 1e-12 ? ((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / len2 : 0;
    u = u < 0 ? 0 : u > 1 ? 1 : u;
    const px = ax + dx * u;
    const pz = az + dz * u;
    const d = hyp3(cx - px, cy - (ay + dy * u), cz - pz);
    let v = 0;
    let h = 0;
    if (d < SWAY.graze) {
      v = SWAY.kickShot * (1 - d / SWAY.graze);
      // along the round's horizontal heading; a vertical round pushes it off its line
      h = hyp2(dx, dz) > 1e-6 ? Math.atan2(dz, dx) : hyp2(cx - px, cz - pz) > 1e-6 ? Math.atan2(cz - pz, cx - px) : 0;
    }
    const di = hyp3(cx - bx, cy - by, cz - bz);
    if (di < SWAY.near) {
      const vi = SWAY.kickShot * (1 - di / SWAY.near);
      if (vi > v) {
        v = vi;
        h = hyp2(cx - bx, cz - bz) > 1e-6 ? Math.atan2(cz - bz, cx - bx) : hyp2(dx, dz) > 1e-6 ? Math.atan2(dz, dx) : 0;
      }
    }
    this.tmp[2] = v;
    this.tmp[3] = h;
    return v > 0;
  }

  /** Would a round from a to b kick pendant `k` (a client asks the host only then)? No allocation. */
  shotKicks(k: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number): boolean {
    return this.shotProbe(k, ax, ay, az, bx, by, bz);
  }

  /** Host / solo: a round from a to b at `t` kicks every pendant it passes or lands near. Returns the kicks accepted. */
  shotKick(ax: number, ay: number, az: number, bx: number, by: number, bz: number, t: number): number {
    this.tmp[4] = t;
    let n = 0;
    for (let k = 0; k < this.n; k++) if (this.shotProbe(k, ax, ay, az, bx, by, bz) && this.kick(k)) n++;
    return n;
  }

  /** Host: a client's checked round (`sw-<id>`) kicks pendant `k` only. True when accepted. */
  shotKickOne(k: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, t: number): boolean {
    if (k < 0 || k >= this.n) return false;
    this.tmp[4] = t;
    return this.shotProbe(k, ax, ay, az, bx, by, bz) && this.kick(k);
  }

  /** Host / solo: a blast at (x, y, z) kicks every pendant within `blastReach`, away from it. Returns the kicks. */
  blastKick(x: number, y: number, z: number, t: number): number {
    const tmp = this.tmp;
    tmp[4] = t;
    let n = 0;
    for (let k = 0; k < this.n; k++) {
      const cx = this.centre[k * 3]! + this.off[k * 3]!;
      const cy = this.centre[k * 3 + 1]! + this.off[k * 3 + 1]!;
      const cz = this.centre[k * 3 + 2]! + this.off[k * 3 + 2]!;
      const d = hyp3(cx - x, cy - y, cz - z);
      if (d >= SWAY.blastReach) continue;
      tmp[2] = SWAY.kickBlast * (1 - d / SWAY.blastReach);
      tmp[3] = hyp2(cx - x, cz - z) > 1e-6 ? Math.atan2(cz - z, cx - x) : 0;
      if (this.kick(k)) n++;
    }
    return n;
  }

  /** Host / solo: head points (x, y, z each, `n` of them): one within `bumpReach` of a fixture's box bumps it away from
   *  the nearest head, at the last tick's time (`time[0]`: bumps are sampled right after `tickSway`). Returns the kicks. */
  bumpKick(pts: Float32Array, n: number): number {
    const tmp = this.tmp;
    tmp[4] = this.time[0]!;
    let kicks = 0;
    for (let k = 0; k < this.n; k++) {
      const cx = this.centre[k * 3]! + this.off[k * 3]!;
      const cy = this.centre[k * 3 + 1]! + this.off[k * 3 + 1]!;
      const cz = this.centre[k * 3 + 2]! + this.off[k * 3 + 2]!;
      const hx = this.half[k * 3]!;
      const hy = this.half[k * 3 + 1]!;
      const hz = this.half[k * 3 + 2]!;
      let best: number = SWAY.bumpReach;
      let bi = -1;
      for (let i = 0; i < n; i++) {
        const qx = Math.abs(pts[i * 3]! - cx) - hx;
        const qy = Math.abs(pts[i * 3 + 1]! - cy) - hy;
        const qz = Math.abs(pts[i * 3 + 2]! - cz) - hz;
        const d = hyp3(qx > 0 ? qx : 0, qy > 0 ? qy : 0, qz > 0 ? qz : 0);
        if (d < best) {
          best = d;
          bi = i;
        }
      }
      if (bi < 0) continue;
      const px = pts[bi * 3]!;
      const pz = pts[bi * 3 + 2]!;
      tmp[2] = SWAY.kickBump * (1 - best / SWAY.bumpReach);
      tmp[3] = hyp2(cx - px, cz - pz) > 1e-6 ? Math.atan2(cz - pz, cx - px) : 0;
      if (this.kick(k)) kicks++;
    }
    return kicks;
  }

  /** The envelope bound (m) of pendant `k` at `t` (tests, tools): the sum of its live kicks' `A e^-(dt / tau)`. */
  envelopeAt(k: number, t: number): number {
    this.tmp[4] = t;
    this.scan(k);
    return this.tmp[0]!;
  }
}

/**
 * The hangers of a pendant (`light`, a fixture box): thin (`CANON_MIN_THICK`, so already out of the light bake),
 * vertical boxes over the fixture (centre within its plan + 0.1 m, bottom within 0.25 m above its top). With two or more
 * they are hidden (`visible = false`: the light rig draws them with the swing) and returned as (x, z, top, bottom,
 * thickness x, thickness z); with fewer nothing is touched and the list is empty. Load time.
 */
export function claimHangers(boxes: BoxPiece[], light: LightDef): [number, number, number, number, number, number][] {
  const f = light.fixture;
  if (!f) return [];
  const top = light.y + f.oy + f.sy / 2;
  const found: number[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i]!;
    if (b.visible === false || b.glass || b.detail) continue;
    if (Math.min(b.s[0], b.s[1], b.s[2]) >= CANON_MIN_THICK || b.s[1] <= HANGER_MIN || Math.abs(b.pitch) > 1e-3) continue;
    if (Math.abs(b.c[0] - light.x) > f.sx / 2 + PLAN_PAD || Math.abs(b.c[2] - light.z) > f.sz / 2 + PLAN_PAD) continue;
    const bottom = b.c[1] - b.s[1] / 2;
    if (bottom < top - BOTTOM_SLACK || bottom > top + BOTTOM_REACH) continue;
    found.push(i);
  }
  if (found.length < 2) return [];
  return found.map((i) => {
    const b = boxes[i]!;
    b.visible = false;
    const th = Math.min(b.s[0], b.s[2]);
    return [b.c[0], b.c[2], b.c[1] + b.s[1] / 2, b.c[1] - b.s[1] / 2, th, th];
  });
}

/**
 * A map's swinging pendants (`World.create`, after `applyMapFlicker`, BEFORE `b.build` so the hidden hangers never
 * mesh): every `SWAY_PENDANTS` entry matching a fixed light with a fixture box becomes a pendant and claims its hangers;
 * one claiming fewer than two is dropped with a warning (never a lamp swinging under static cables). Sets
 * `lights.sway` (null on a map without one). Returns it.
 */
export function applyMapSway(b: { boxes: BoxPiece[]; lights: LightRegistry }, mapId: string): SwaySet | null {
  const reg = b.lights;
  const list = SWAY_PENDANTS[lampMapId(mapId)];
  reg.sway = null;
  if (!list) return null;
  const out: SwayPendant[] = [];
  for (const spec of list) {
    const id = findTube(reg, spec);
    if (id < 0) continue;
    const l = reg.lights[id]!;
    if (out.some((p) => p.light === l)) continue;
    if (!l.fixture || l.fixture.model || reg.flickerMode(id) === FLICKER_STUTTER) {
      console.warn(`lampSway: ${mapId} light ${id} at (${spec.x}, ${spec.y}, ${spec.z}) is not a hung fixture box: no sway`);
      continue;
    }
    const hangers = claimHangers(b.boxes, l);
    if (hangers.length < 2) {
      console.warn(`lampSway: ${mapId} light ${id} at (${spec.x}, ${spec.y}, ${spec.z}) claims ${hangers.length} hangers: no sway`);
      continue;
    }
    out.push({ light: l, hangers });
  }
  if (!out.length) return null;
  reg.sway = new SwaySet(out);
  return reg.sway;
}
