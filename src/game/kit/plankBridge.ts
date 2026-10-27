/**
 * (coop-kit K5a, K5b; PLAN "Design per move" -> "Plank Bridge") Plank Bridge. SIGNOFF: "Both carry a scaffold board and
 * lay it over a gap. Guards notice it." Real-world: a 3.9 m scaffold board (225 x 38 mm, about 20-25 kg) carried end to
 * end at the hip, laid by sliding it out over the gap from the near edge until it bears on the far side, at least 0.3 m
 * bearing each end. K5a: the lift, the carry, the put-down. K5b: the lay, the laid board (its collider is the world
 * piece's, `world/plankBridge.ts`), the done call on a crossing, the guards' notice (`stealthSystems.noticeLaidPlanks`)
 * and the reset hook. Registered with the kit registry at load. Numbers are starting values (G10; BRIEF A17 / M3: the
 * bands stay move constants). Babylon only for the lay search's two ray points (as `pullUp.ts`).
 *
 * Spot (map data, `addKitSpot(b.anchors, spot)`, kitApi.ts): `kind 'plankBridge'`, (`x`, `y`, `z`) the board stack's
 * middle with `y` the floor under it (feet), `yaw` the boards' long axis ((sin yaw, cos yaw)), `w` the board length
 * (default `PLANK.len` 3.9), `h` the stack's top over its floor (default `PLANK.stackH` 0.16: Marlow A2's four layers of
 * 0.04 m boards). One board per spot: the device (`PlankDevice`) is `stack` -> `carried` -> `floor` / `laid`. Devices
 * are added for every spot whatever the flags (both pages list them in the same order: the wire's spot index); only the
 * offers and the host's rule read the id (`flags.kitMoves.has('plankBridge')`).
 *
 * Lift (role b first): free on the ground within `PLANK.endReach` 0.6 m of a board end (on its stack, the floor or laid),
 * a team-mate about, Co-op -> "Co-op: take an end of the board (plank bridge)" -> `plankOffer` (crouched, still, hands on
 * the end; busy). The partner within 0.6 m of the other end -> "Co-op: take the other end (plank bridge)" -> `tmove
 * plankBridge` (`target` the spot index, `s` 1, no claimed point) -> host rule (`checkPlank`): b `brace` + `PLANK_SUB`
 * 1024 offering at that spot (its `s` = -(index + 1)), the board not carried, a on the ground within 0.6 m (+ the host's
 * 0.3 m slack: its view lags) of the other end, same floor +-0.4 m -> `tstart` (paired) -> b `plankLift` / a
 * `plankLiftA` (1.2 s, a leg lift to the hip) -> `plankCarry` / `plankCarryA` (held).
 *
 * Carry: both steer. Each page caps its own body (`carryVelocity`): the stick at `PLANK.carry` 1.2 m/s, the part of it
 * along the line to the partner's seen body clamped so the gap between the two hand points stays within the board's
 * length +-`PLANK.band` 0.25 m; across the line it is free, so the pair turns. So the pair goes at the slower stick.
 * The board is drawn on every page between the two drawn bodies' hand points. B by either -> both `plankDrop` /
 * `plankDropA` (0.8 s, the board lowered where it is: `floor`, liftable again), end `drop`; a hit, a fall, the partner
 * gone or the gap slipping drops it the same way.
 *
 * Lay (K5b): carrying, every `layEvery` each page runs the lay search (`planLay`) from its own body along the carry axis
 * (partner -> self), else from the partner's seen body. It needs the front carrier's feet within `edgeReach` 1.0 m of a
 * near edge (PLAN "both within 1.0 m": an end-to-end carry, so the front carrier, K5b-3) and a far floor in the band:
 * gap `gapMin` 1.0 - `gapMax` 3.3 m, the far floor within `level` 0.3 m under or `probeUp` 0.2 m over the near floor (the
 * probes start under A2's raised panel, Marlow Q1; K5b-4), a far end to rest on, and a clear slide line `slideClear`
 * over the board's line (A2: under the panel; the barrier beside it refuses). The board is centred on the gap: equal
 * bearing each side. A plan -> "Co-op: lay the board over the gap (plank bridge)"; Co-op -> `tmove plankBridge` with
 * `s` = 2 + the axis yaw in turns (K5b-2) and the claimed far end (`lx`, `gy` its floor, `lz`); no plan -> a polite
 * refusal naming why. Host rule (a request with a claimed point is a lay, K5b-1): the pair carrying that board, same
 * floor, the far end level with the front carrier, ahead of it along the carry within reach (bounds, no host rays,
 * K5b-5) -> `tstart` with `l` and `s` -> every page that gets it lays the device from `l`, the yaw and the front
 * carrier's floor (cm) alone (`layPlank`), so both pages agree; both carriers `plankLay` / `plankLayA` (1.6 s, held
 * still) while the drawn board slides from the hands to its laid ends, then free (side a sends 'drop': the host's pair
 * ends). Settled (`slide` 1): `laid`, `opens` + 1, the static collider on (walkable at any pace; no nav link).
 *
 * Done (K5b, host; `kitDone` is a no-op on a client): a player on the laid board's middle (within `gapMin` / 2 of it:
 * over the gap whatever its width) who is then on the ground off the board, past the middle toward the far end on the
 * far floor's level, crossed: `kitDone('plankBridge', spot id, crosser, layer)` (undefined = the host's own player).
 * Each crossing calls it once.
 *
 * Guards (K5b, G403 "Guards notice it"): a laid board is a way left open (G41's door rule), noticed as a held-open
 * shutter (`plankNoticedBy`, `plankNoticePoint`, `plankLookPoint`; `stealthSystems.noticeLaidPlanks`), once per lay
 * (`opens` / `noticed`).
 *
 * Reset (`reset`, `TeamController.resetKit`: both pages' checkpoint resets and the course host's station retry): a local
 * plank move ends and every board goes home. A client page gets no station-retry signal (K5b-6): its board goes home when
 * a mate offers at the stack while it lies elsewhere. A third player's page (K5b-7) does not lay the board.
 *
 * Wire (MoveState): b `brace`, a `boost`, both + `PLANK_SUB`; `s` = -(spot index + 1) offering, (spot index + 1) lifting,
 * carrying and laying, 0 putting it down. Ends travel as the hang-down's (`net.teamHangEnd`): only 'drop'.
 *
 * States (`KIT_POSE_IDS.plankBridge`): b plankOffer, plankLift, plankCarry, plankDrop, plankLay; a plankLiftA,
 * plankCarryA, plankDropA, plankLayA. `plankJoin` is not used: the partner stays free until the host's start.
 * Placeholders (K0): brace, brace, walk, brace, brace; KA5 puts the hands on the board by IK.
 */
import { Vector3 } from '../../core/babylon';
import { hyp2, hyp3 } from '../../core/mathx';
import { flags } from '../../core/flags';
import { TEAM } from '../../config/movement';
import { G } from '../../physics/groups';
import { PLANK_SUB, type TeamDenial, type TeamRequest, type TeamSide } from '../teamMoves';
import { KIT_PAIR, kitDone, kitSpotsOf, type KitSpot } from './kitApi';
import { registerKitMove, type KitDevice, type KitDevices, type KitHost, type KitMove, type KitState } from './registry';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate, TeamStart } from '../teamController';

export const PLANK = {
  /** The board's length (m; a 3.9 m scaffold board; a spot's `w` overrides it). */
  len: 3.9,
  /** Its width and thickness (m; 225 x 38 mm). */
  width: 0.225,
  thick: 0.038,
  /** The stack's top over its floor (m; Marlow A2's four layers of 0.04 m; a spot's `h` overrides it). */
  stackH: 0.16,
  /** An end is taken from within this of its end point (m, plan). */
  endReach: 0.6,
  /** The host's extra reach on its lagging view of both players (m). */
  hostSlack: 0.3,
  /** Same floor: the players and the board within this (m). */
  up: 0.4,
  /** The hand point: this toward the partner from the feet (m, plan) and this over them (m; at the hip). */
  hand: 0.35,
  hip: 0.95,
  /** The hand gap stays within the board's length +- this (m). */
  band: 0.25,
  /** Each page keeps this inside the band (m; the partner's page moves one step the other way meanwhile). */
  margin: 0.05,
  /** Carry speed at full stick (m/s). */
  carry: 1.2,
  /** Facing turn rate while carrying (rad/s). */
  turnRate: 2.5,
  /** Out of the band, this fraction of the error comes back per step on each page (the partner's page does its own). */
  fix: 0.5,
  /** The leg lift to the hip and the put-down (s). */
  liftTime: 1.2,
  dropTime: 0.8,
  /** The gap off the band by more than this (m) for `slipTime` (s): the board slips, both put it down. */
  slip: 0.6,
  slipTime: 0.3,
  /** Carrying: the partner's MoveState not carrying this board this long (s): put down (their end lost). */
  lostGrace: 0.5,
  /** Partner: a lift (or lay) request with no start after this (s) is dropped. */
  askWait: 1.0,
  /** The host's pair lasts this (s; a long carry). */
  pairS: 600,
  /** After a section restart remote carries are ignored this long (s). */
  resetHoldOff: 0.5,
  /** Facing follows the walk above this speed (m/s). */
  faceSpeed: 0.15,
  /** (K5b) The lay: slide out and lower (s, plan). */
  layTime: 1.6,
  /** (K5b) The front carrier's feet within this of the near edge (m, plan). */
  edgeReach: 1.0,
  /** (K5b) The gap band (m, plan: 3.9 less 0.3 bearing each end at the top). */
  gapMin: 1.0,
  gapMax: 3.3,
  /** (K5b) The far floor at most this under the near floor (m, plan); over it, at most `probeUp`. */
  level: 0.3,
  /** (K5b) The floor probes start this over the near floor (m): under A2's raised panel (bottom 0.25, Marlow Q1). */
  probeUp: 0.2,
  /** (K5b) The board's slide line this over its line (m): under A2's panel. */
  slideClear: 0.1,
  /** (K5b) The lay search's probe spacing along the carry (m). */
  probeStep: 0.05,
  /** (K5b) Carrying, the lay search runs this often (s). */
  layEvery: 0.2,
  /** (K5b) The host: the claimed far end within this of the carry's axis from the front carrier (rad, 35 deg). */
  layCone: 0.61,
  /** (K5b) Guards: a laid board is seen within this (m) and this facing (cos), as a held-open shutter (`SHUTTER_NOTICE`). */
  noticeRange: 9,
  noticeCos: 0.2,
  /** (K5b) A guard who notices it comes to this far out past its end on his side (m; the shutter's look offset). */
  lookOff: 0.6,
} as const;

/** The board's place: on its stack, carried, put down on a floor, laid over a gap (K5b). */
export type PlankPhase = 'stack' | 'carried' | 'floor' | 'laid';

export interface PlankPoint {
  x: number;
  y: number;
  z: number;
}

/** A spot's board (the kit device). `x`, `y`, `z` the board's middle at its floor (feet height), `yaw` its axis. */
export interface PlankDevice extends KitDevice {
  readonly kind: 'plankBridge';
  /** The board's length (m). */
  readonly len: number;
  /** Its stack (home): the middle at the floor, the axis, the stack top over that floor. */
  readonly hx: number;
  readonly hy: number;
  readonly hz: number;
  readonly hyaw: number;
  readonly stackH: number;
  phase: PlankPhase;
  /** The board's centre-line ends (world): carried, a's hand (`a`) and b's hand (`b`); else where it lies (drawn). */
  readonly a: PlankPoint;
  readonly b: PlankPoint;
  /** Seconds a section restart still ignores remote carries (0 none). */
  holdOff: number;
  /** (K5b) Laid and settled: the collider is on and guards can notice it. */
  laid: boolean;
  /** (K5b) The lay's slide, 0..1 (1 settled): the drawn ends go from `s0` / `s1` to the laid ends `n` / `f`. */
  slide: number;
  readonly s0: PlankPoint;
  readonly s1: PlankPoint;
  /** (K5b) The laid board's near and far ends (centre line). */
  readonly n: PlankPoint;
  readonly f: PlankPoint;
  /** (K5b) End `a` slides to the far end (else to the near end). */
  aFar: boolean;
  /** (K5b) Lays settled (the guards' count) and the count a guard last noticed (-1 none). */
  opens: number;
  noticed: number;
  /** (K5b) The pair that laid it (the start's `a`, `b`). */
  layA: string;
  layB: string;
  /** (K5b) Crossing marks: mates on the board's middle (four id slots, '' free) and the own body. */
  readonly on: string[];
  onSelf: boolean;
}

export function isPlankDevice(d: KitDevice): d is PlankDevice {
  return d.kind === 'plankBridge';
}

/** The board lying at (`x`, `y` floor, `z`) along `yaw`, its underside `top` over the floor. */
function lay(d: PlankDevice, x: number, y: number, z: number, yaw: number, top: number): void {
  const h = d.len / 2;
  const s = Math.sin(yaw) * h;
  const c = Math.cos(yaw) * h;
  const by = y + top + PLANK.thick / 2;
  d.a.x = x - s;
  d.a.y = by;
  d.a.z = z - c;
  d.b.x = x + s;
  d.b.y = by;
  d.b.z = z + c;
  d.x = x;
  d.y = y;
  d.z = z;
  d.yaw = yaw;
}

export function newPlankDevice(s: KitSpot): PlankDevice {
  const len = s.w ?? PLANK.len;
  const d: PlankDevice = {
    id: s.id,
    kind: 'plankBridge',
    x: s.x,
    y: s.y,
    z: s.z,
    yaw: s.yaw,
    reach: len / 2 + PLANK.endReach,
    open: 0,
    user: '',
    len,
    hx: s.x,
    hy: s.y,
    hz: s.z,
    hyaw: s.yaw,
    stackH: s.h ?? PLANK.stackH,
    phase: 'stack',
    a: { x: 0, y: 0, z: 0 },
    b: { x: 0, y: 0, z: 0 },
    holdOff: 0,
    laid: false,
    slide: 1,
    s0: { x: 0, y: 0, z: 0 },
    s1: { x: 0, y: 0, z: 0 },
    n: { x: 0, y: 0, z: 0 },
    f: { x: 0, y: 0, z: 0 },
    aFar: true,
    opens: 0,
    noticed: -1,
    layA: '',
    layB: '',
    on: ['', '', '', ''],
    onSelf: false,
  };
  lay(d, s.x, s.y, s.z, s.yaw, d.stackH);
  return d;
}

/** (K5b) No crossing marks. */
function clearMarks(d: PlankDevice): void {
  for (let i = 0; i < d.on.length; i++) d.on[i] = '';
  d.onSelf = false;
}

/** Back on its stack (a section restart, a station retry). (K5b) Not laid, the guards' mark cleared (`opens` kept). */
export function resetPlank(d: PlankDevice): void {
  d.phase = 'stack';
  d.user = '';
  d.open = 0;
  d.holdOff = PLANK.resetHoldOff;
  d.laid = false;
  d.slide = 1;
  d.noticed = -1;
  d.layA = d.layB = '';
  clearMarks(d);
  lay(d, d.hx, d.hy, d.hz, d.hyaw, d.stackH);
}

/** Put down where it is: each end straight down to `floorY` (the carriers' floor); the device's middle and axis follow. */
export function putPlankDown(d: PlankDevice, floorY: number): void {
  const y = floorY + PLANK.thick / 2;
  d.a.y = y;
  d.b.y = y;
  d.phase = 'floor';
  d.user = '';
  d.open = 0;
  d.laid = false;
  plankMid(d, floorY);
}

/** The device's middle (at `floorY`) and axis from its two ends. */
function plankMid(d: PlankDevice, floorY: number): void {
  d.x = (d.a.x + d.b.x) / 2;
  d.z = (d.a.z + d.b.z) / 2;
  d.y = floorY;
  const dx = d.b.x - d.a.x;
  const dz = d.b.z - d.a.z;
  if (dx * dx + dz * dz > 1e-8) d.yaw = Math.atan2(dx, dz);
}

/** The distance between the board's two ends (m; carried: the hand gap). */
export function plankGap(d: PlankDevice): number {
  return hyp3(d.b.x - d.a.x, d.b.y - d.a.y, d.b.z - d.a.z);
}

/** Which end of a lying board (x, z) is within `reach` of: 1 = `a`, 2 = `b`, 0 none. No allocation. */
export function plankEndNear(d: PlankDevice, x: number, z: number, reach: number): 0 | 1 | 2 {
  const ra = hyp2(d.a.x - x, d.a.z - z);
  const rb = hyp2(d.b.x - x, d.b.z - z);
  if (ra <= reach && ra <= rb) return 1;
  return rb <= reach ? 2 : 0;
}

/** (K5b) (x, z) is within `reach` of one of the board's stack (home) ends. No allocation. */
export function plankHomeNear(d: PlankDevice, x: number, z: number, reach: number): boolean {
  const s = Math.sin(d.hyaw) * d.len * 0.5;
  const c = Math.cos(d.hyaw) * d.len * 0.5;
  return hyp2(d.hx - s - x, d.hz - c - z) <= reach || hyp2(d.hx + s - x, d.hz + c - z) <= reach;
}

/** The drawn board's pose (the world piece, `world/plankBridge.ts`): its middle, yaw and pitch from the two ends. */
export interface PlankPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export function plankPose(d: PlankDevice, out: PlankPose): PlankPose {
  const dx = d.b.x - d.a.x;
  const dy = d.b.y - d.a.y;
  const dz = d.b.z - d.a.z;
  const h = hyp2(dx, dz);
  out.x = (d.a.x + d.b.x) / 2;
  out.y = (d.a.y + d.b.y) / 2;
  out.z = (d.a.z + d.b.z) / 2;
  out.yaw = h > 1e-6 ? Math.atan2(dx, dz) : d.yaw;
  // (Babylon's pitch turns +z down for positive angles)
  out.pitch = -Math.atan2(dy, Math.max(h, 1e-6));
  return out;
}

/**
 * The carry's velocity cap (pure; no allocation): our stick velocity (`vx`, `vz`, already at most `PLANK.carry`) with its
 * part along the line to the partner (`ux`, `uz` unit, toward them) clamped so the hand gap `gap` stays within `len` +-
 * (`band` - `margin`) after `dt`; out of the band it comes back `fix` of the error per step, at most `PLANK.carry`.
 * Across the line the stick is kept (the pair turns). Writes `out`.
 */
export function carryVelocity(vx: number, vz: number, ux: number, uz: number, gap: number, len: number, dt: number, out: { x: number; z: number }): { x: number; z: number } {
  const lo = len - PLANK.band + PLANK.margin;
  const hi = len + PLANK.band - PLANK.margin;
  // `d`: our speed toward the partner (the gap closes at d)
  let d = vx * ux + vz * uz;
  const px = vx - d * ux;
  const pz = vz - d * uz;
  const k = 1 / Math.max(dt, 1e-4);
  const dMin = gap > hi ? Math.min(PLANK.carry, (gap - hi) * PLANK.fix * k) : (gap - hi) * k;
  const dMax = gap < lo ? Math.max(-PLANK.carry, (gap - lo) * PLANK.fix * k) : (gap - lo) * k;
  d = Math.max(dMin, Math.min(dMax, d));
  out.x = px + d * ux;
  out.z = pz + d * uz;
  return out;
}

// ---- (K5b) the lay search ----

/** A static ray: the hit distance along the segment (a, b), its length when nothing is hit. */
export type PlankRay = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => number;

/** Why a lay is not possible here ('' = it is). */
export type LayWhy = '' | 'noEdge' | 'wide' | 'narrow' | 'level' | 'blocked' | 'noBearing';

/** A lay plan: the laid board's near and far ends (feet height: the floors) and the gap (m). */
export interface LayPlan {
  why: LayWhy;
  nx: number;
  ny: number;
  nz: number;
  fx: number;
  fy: number;
  fz: number;
  gap: number;
}

export function newLayPlan(): LayPlan {
  return { why: 'noEdge', nx: 0, ny: 0, nz: 0, fx: 0, fy: 0, fz: 0, gap: 0 };
}

/** The polite refusal for each reason (G151, the throw's tone). */
export const LAY_REFUSE: Readonly<Record<Exclude<LayWhy, ''>, string>> = {
  noEdge: 'Bring the board to the edge of a gap to lay it',
  wide: 'The board does not reach across here',
  narrow: 'The gap is too narrow for the board',
  level: 'The far side is not level with this one',
  blocked: 'Something is in the way of the board',
  noBearing: 'There is nothing to rest the far end on',
};

/** A floor under (x, z) in the probe band of floor `y0`: its height, NaN none (a probe from `probeUp` over it). */
function floorAt(ray: PlankRay, x: number, z: number, y0: number, below: number): number {
  const top = y0 + PLANK.probeUp;
  const lo = y0 - below;
  const h = ray(x, top, z, x, lo, z);
  return h < top - lo - 1e-6 ? top - h : NaN;
}

/**
 * The lay search (pure; no allocation): from the front carrier's feet (`px`, `py`, `pz`) along the carry axis (`ux`,
 * `uz` unit, ahead), a board of length `len`. The near floor ends within `edgeReach` (the near edge); past it the first
 * floor not lower than `level` under it is the far edge, `gapMin`-`gapMax` on; the board centred on the gap (equal
 * bearing), its far end on that floor, its slide line clear. Writes `out` (`why` '' = ok).
 */
export function planLay(ray: PlankRay, px: number, py: number, pz: number, ux: number, uz: number, len: number, out: LayPlan): LayPlan {
  const st = PLANK.probeStep;
  out.why = 'noEdge';
  const below = PLANK.level + 0.05;
  // the near floor from a body radius behind the feet (a body may stand out over the edge) until it ends: the near edge
  // `e` (m ahead of the feet)
  let e = NaN;
  const nNear = Math.round((PLANK.edgeReach + st) / st);
  const i0 = -Math.round(0.35 / st);
  for (let i = i0; i <= nNear; i++) {
    if (!Number.isNaN(floorAt(ray, px + ux * i * st, pz + uz * i * st, py, below))) continue;
    if (i === i0) return out;
    e = (i - 0.5) * st;
    break;
  }
  if (Number.isNaN(e) || e > PLANK.edgeReach) return out;
  // past it, the first floor not lower than `level` under the near floor: the far edge (`g` m past the near edge)
  let g = -1;
  let fy = NaN;
  const nFar = Math.round((PLANK.gapMax + st) / st);
  for (let i = 1; i <= nFar; i++) {
    const d = e + i * st;
    const y = floorAt(ray, px + ux * d, pz + uz * d, py, below);
    if (Number.isNaN(y) || y < py - PLANK.level) continue;
    g = (i - 0.5) * st;
    fy = y;
    break;
  }
  const ex = px + ux * e;
  const ez = pz + uz * e;
  if (g < 0) {
    // nothing level within reach: a raised far side or a wall across (the slide line hits it), else too wide
    out.why = slideWhy(ray, ex, ez, ux, uz, PLANK.gapMax + 0.3, py, py) ?? 'wide';
    return out;
  }
  if (g < PLANK.gapMin) {
    out.why = 'narrow';
    return out;
  }
  const dy = fy - py;
  const span = Math.sqrt(Math.max(0, len * len - dy * dy));
  const bear = (span - g) / 2;
  const dn = e - bear;
  const df = dn + span;
  out.nx = px + ux * dn;
  out.ny = py;
  out.nz = pz + uz * dn;
  out.fx = px + ux * df;
  out.fy = fy;
  out.fz = pz + uz * df;
  out.gap = g;
  // the far end rests on that floor
  const rx = out.fx - ux * st;
  const rz = out.fz - uz * st;
  const ry = floorAt(ray, rx, rz, fy, 0.1);
  if (Number.isNaN(ry) || Math.abs(ry - fy) > 0.1) {
    out.why = 'noBearing';
    return out;
  }
  // the board slides out along its line from the near edge to the far end
  out.why = slideWhy(ray, ex, ez, ux, uz, df - e, py, fy) ?? '';
  return out;
}

/** The slide line from the near edge point (`ex`, `ez`, floor `y0`) `dist` ahead (to floor `y1`): null clear, else
 *  'level' (a floor over `probeUp` just past the hit: a raised far side) or 'blocked'. */
function slideWhy(ray: PlankRay, ex: number, ez: number, ux: number, uz: number, dist: number, y0: number, y1: number): LayWhy | null {
  const c = PLANK.slideClear;
  const bx = ex + ux * dist;
  const bz = ez + uz * dist;
  const ay = y0 + c;
  const by = y1 + c;
  const segLen = Math.sqrt(dist * dist + (by - ay) * (by - ay));
  const h = ray(ex, ay, ez, bx, by, bz);
  if (h >= segLen - 1e-6) return null;
  const at = (h / Math.max(segLen, 1e-6)) * dist + 0.1;
  const x = ex + ux * at;
  const z = ez + uz * at;
  const hh = ray(x, y0 + 2, z, x, y0 - PLANK.level - 0.05, z);
  const top = y0 + 2 - hh;
  return hh < 2 + PLANK.level + 0.05 - 1e-6 && top > y0 + PLANK.probeUp + 1e-3 ? 'level' : 'blocked';
}

/** The ray the move hands `planLay` (the game's static world; two scratch points, no allocation per call). */
const RA = new Vector3();
const RB = new Vector3();
let RAY_G: KitHost['g'] | null = null;
const plankRay: PlankRay = (ax, ay, az, bx, by, bz) => {
  RA.set(ax, ay, az);
  RB.set(bx, by, bz);
  return RAY_G!.ballistics.hitDistance(RA, RB, G.STATIC);
};

/** The wire's lay phase: `s` = 2 + the board's axis yaw (near -> far) in turns, [0, 1) in 1e-5 steps (K5b-2). */
export function layS(yaw: number): number {
  let t = yaw / (2 * Math.PI);
  t -= Math.floor(t);
  t = Math.round(t * 1e5) / 1e5;
  return 2 + (t >= 1 ? 0 : t);
}

/** The axis yaw a lay's `s` carries. */
export function layYaw(s: number): number {
  return (s - 2) * 2 * Math.PI;
}

/**
 * (K5b) Lay the device from the start alone (both pages agree): far end `l` (its floor), the axis `yaw`, near floor
 * `y0`; the near end the board's length back (3D length `len`). The drawn ends slide from where they are (`slide` 0).
 */
export function layPlank(d: PlankDevice, l: readonly [number, number, number], yaw: number, y0: number, a: string, b: string): void {
  const ux = Math.sin(yaw);
  const uz = Math.cos(yaw);
  const dy = l[1] - y0;
  const span = Math.sqrt(Math.max(0, d.len * d.len - dy * dy));
  const t = PLANK.thick / 2;
  d.f.x = l[0];
  d.f.y = l[1] + t;
  d.f.z = l[2];
  d.n.x = l[0] - ux * span;
  d.n.y = y0 + t;
  d.n.z = l[2] - uz * span;
  copy(d.s0, d.a);
  copy(d.s1, d.b);
  d.aFar = hyp2(d.a.x - d.f.x, d.a.z - d.f.z) <= hyp2(d.b.x - d.f.x, d.b.z - d.f.z);
  d.phase = 'laid';
  d.laid = false;
  d.slide = 0;
  d.user = '';
  d.open = 0;
  d.holdOff = 0;
  d.layA = a;
  d.layB = b;
  clearMarks(d);
  d.x = (d.n.x + d.f.x) / 2;
  d.y = y0;
  d.z = (d.n.z + d.f.z) / 2;
  d.yaw = yaw;
}

/** (K5b) The lay's slide on every page: the drawn ends toward the laid ones; settled -> `laid`, `opens` + 1. */
export function slidePlank(d: PlankDevice, dt: number): void {
  d.slide = Math.min(1, d.slide + dt / PLANK.layTime);
  const k = smooth(d.slide);
  const ta = d.aFar ? d.f : d.n;
  const tb = d.aFar ? d.n : d.f;
  d.a.x = d.s0.x + (ta.x - d.s0.x) * k;
  d.a.y = d.s0.y + (ta.y - d.s0.y) * k;
  d.a.z = d.s0.z + (ta.z - d.s0.z) * k;
  d.b.x = d.s1.x + (tb.x - d.s1.x) * k;
  d.b.y = d.s1.y + (tb.y - d.s1.y) * k;
  d.b.z = d.s1.z + (tb.z - d.s1.z) * k;
  if (d.slide >= 1 && !d.laid) {
    d.laid = true;
    d.opens++;
  }
}

// ---- (K5b) crossing ----

const CROSS_NONE = 0;
const CROSS_ON = 1;
const CROSS_DONE = 2;

/**
 * (K5b) One player at feet (x, y, z) (`ground`: standing on something) against a laid board, `marked` when last seen on
 * its middle: CROSS_ON on (or still crossing), CROSS_DONE crossed to the far floor, CROSS_NONE neither. Pure.
 */
export function crossStep(d: PlankDevice, x: number, y: number, z: number, ground: boolean, marked: boolean): number {
  const n = d.n;
  const f = d.f;
  const ax = f.x - n.x;
  const az = f.z - n.z;
  const hl = Math.max(hyp2(ax, az), 1e-6);
  const ux = ax / hl;
  const uz = az / hl;
  const rx = x - n.x;
  const rz = z - n.z;
  const u = rx * ux + rz * uz;
  const v = Math.abs(rz * ux - rx * uz);
  const k = Math.max(0, Math.min(1, u / hl));
  const top = n.y + (f.y - n.y) * k + PLANK.thick / 2;
  const on = u >= 0 && u <= hl && v <= PLANK.width / 2 + 0.3 && Math.abs(y - top) <= 0.3;
  const mid = hl / 2;
  const half = PLANK.gapMin / 2;
  if (on && Math.abs(u - mid) <= half) return CROSS_ON;
  if (!marked) return CROSS_NONE;
  if (y < top - PLANK.level - 0.7) return CROSS_NONE;
  if (on || !ground) return CROSS_ON;
  if (u >= mid + half && y >= f.y - PLANK.thick / 2 - PLANK.level) return CROSS_DONE;
  return u <= mid - half ? CROSS_NONE : CROSS_ON;
}

/** The layer to name for a crossing by `crosser` (the other of the pair, else its b); undefined = the host's own. */
function layerOf(d: PlankDevice, crosser: string, self: string): string | undefined {
  const l = crosser === d.layA ? d.layB : crosser === d.layB ? d.layA : d.layB;
  return l === '' || l === self ? undefined : l;
}

/** (K5b) The host's crossings on a laid board (every fixed step; no allocation): the own body and each mate. */
function crossings(h: KitHost, run: PlankRun, d: PlankDevice): void {
  const g = h.g;
  if (g.puppet) return;
  const c = g.player.controller;
  if (g.player.alive) {
    const r = crossStep(d, c.pos.x, c.pos.y, c.pos.z, c.grounded, d.onSelf);
    d.onSelf = r === CROSS_ON;
    if (r === CROSS_DONE) kitDone(g, 'plankBridge', d.id, undefined, layerOf(d, run.self, run.self));
  } else d.onSelf = false;
  const ms = h.mates();
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    let slot = -1;
    for (let i = 0; i < d.on.length; i++) if (d.on[i] === m.id) slot = i;
    const r = crossStep(d, m.pos.x, m.pos.y, m.pos.z, m.mode === 'ground', slot >= 0);
    if (r === CROSS_ON) {
      if (slot < 0) for (let i = 0; i < d.on.length && slot < 0; i++) if (d.on[i] === '') d.on[slot = i] = m.id;
      continue;
    }
    if (slot >= 0) d.on[slot] = '';
    if (r === CROSS_DONE) kitDone(g, 'plankBridge', d.id, m.id, layerOf(d, m.id, run.self));
  }
}

// ---- (K5b) guards ----

/** (Guard AI hook) Where a guard looks to see the laid board: its middle, a little over its top. */
export function plankNoticePoint(d: PlankDevice, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  out.x = (d.a.x + d.b.x) / 2;
  out.y = (d.a.y + d.b.y) / 2 + 0.2;
  out.z = (d.a.z + d.b.z) / 2;
  return out;
}

const NOTICE_AT = { x: 0, y: 0, z: 0 };

/**
 * A guard at (`ex`, `ey`, `ez`) facing `yaw` notices a laid board (G403, as a held-open shutter: `shutterNoticedBy`'s
 * rule): laid, within `noticeRange` of its notice point, the same storey (1.5 m of its floor), facing it. The sight
 * line is the caller's. Pure; no allocation.
 */
export function plankNoticedBy(d: PlankDevice, ex: number, ey: number, ez: number, yaw: number): boolean {
  if (!d.laid) return false;
  const p = plankNoticePoint(d, NOTICE_AT);
  const dx = p.x - ex;
  const dz = p.z - ez;
  const dist = hyp2(dx, dz);
  if (dist > PLANK.noticeRange || Math.abs(d.y - ey) > 1.5) return false;
  return dist <= 0.5 || (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / dist >= PLANK.noticeCos;
}

/** Where a guard who noticed it goes to look: the board's end nearer him, `lookOff` further out (off the board, his side). */
export function plankLookPoint(d: PlankDevice, ex: number, ez: number, out: { x: number; z: number }): { x: number; z: number } {
  const na = hyp2(d.a.x - ex, d.a.z - ez) <= hyp2(d.b.x - ex, d.b.z - ez);
  const p = na ? d.a : d.b;
  const q = na ? d.b : d.a;
  const dx = p.x - q.x;
  const dz = p.z - q.z;
  const l = Math.max(hyp2(dx, dz), 1e-6);
  out.x = p.x + (dx / l) * PLANK.lookOff;
  out.z = p.z + (dz / l) * PLANK.lookOff;
  return out;
}

// ---- the host's rule ----

/** (K5b) Side `s` carries the board at spot index `i` in wire mode `mode`. */
function sideCarries(s: TeamSide, i: number, mode: string): boolean {
  return s.mode === mode && ((s.sub ?? 0) & PLANK_SUB) !== 0 && Math.abs((s.s ?? 0) - i - 1) < 0.01;
}

/** (K5b) The host's rule for a lay: the pair carrying that board, its claimed far end `l` level and ahead in reach. */
function checkLay(r: TeamRequest, d: PlankDevice, l: { x: number; y: number; z: number }): TeamDenial | null {
  if (d.phase !== 'carried') return 'busy';
  const a = r.a;
  const b = r.b;
  const i = r.target;
  if (!((sideCarries(a, i, 'brace') && sideCarries(b, i, 'boost')) || (sideCarries(a, i, 'boost') && sideCarries(b, i, 'brace')))) return 'notOffering';
  if (Math.abs(a.y - b.y) > PLANK.up) return 'far';
  const da = hyp2(l.x - a.x, l.z - a.z);
  const db = hyp2(l.x - b.x, l.z - b.z);
  const front = da <= db ? a : b;
  const rear = da <= db ? b : a;
  const df = Math.min(da, db);
  if (l.y - front.y > PLANK.probeUp + 1e-3 || front.y - l.y > PLANK.level + 1e-3) return 'noTarget';
  const lo = (d.len + PLANK.gapMin) / 2 - 0.3;
  const hi = (d.len + PLANK.gapMax) / 2 + PLANK.edgeReach + PLANK.hostSlack;
  if (df < lo || df > hi) return 'far';
  const ax = front.x - rear.x;
  const az = front.z - rear.z;
  const al = hyp2(ax, az);
  if (al < 1e-3 || ((l.x - front.x) * ax + (l.z - front.z) * az) / (al * df) < Math.cos(PLANK.layCone)) return 'far';
  return null;
}

/** The host's rule: a lift (`a` takes the other end of the board `b` offers at the request's spot), or (K5b) with a
 *  claimed point, a lay (`checkLay`). */
export function checkPlank(r: TeamRequest): TeamDenial | null {
  if (!flags.kitMoves.has('plankBridge')) return 'notOffering';
  const spot = r.spot;
  if (!spot || spot.kind !== 'plankBridge') return 'noTarget';
  const d = spot as PlankDevice;
  if (r.land) return checkLay(r, d, r.land);
  const a = r.a;
  const b = r.b;
  if (b.mode !== 'brace' || ((b.sub ?? 0) & PLANK_SUB) === 0 || Math.abs((b.s ?? 0) + r.target + 1) > 0.01) return 'notOffering';
  if (d.phase === 'carried' || (d.phase === 'laid' && !d.laid)) return 'busy';
  if (a.mode !== 'ground') return 'busy';
  if (Math.abs(a.y - b.y) > PLANK.up || Math.abs(a.y - d.y) > PLANK.up) return 'far';
  const reach = PLANK.endReach + PLANK.hostSlack;
  const eb = plankEndNear(d, b.x, b.z, reach);
  const ea = plankEndNear(d, a.x, a.z, reach);
  if (eb === 0 || ea === 0 || ea === eb) return 'far';
  return null;
}

// ---- the move ----

const OFFER: KitState = 'plankOffer';

function lifting(state: string): boolean {
  return state === 'plankLift' || state === 'plankLiftA';
}

function carrying(state: string): boolean {
  return state === 'plankCarry' || state === 'plankCarryA';
}

function dropping(state: string): boolean {
  return state === 'plankDrop' || state === 'plankDropA';
}

function laying(state: string): boolean {
  return state === 'plankLay' || state === 'plankLayA';
}

/** In the pair with the board up or going down (the board follows this page's two bodies). */
function holding(state: string): boolean {
  return lifting(state) || carrying(state) || dropping(state);
}

export interface PlankRun {
  dev: PlankDevice | null;
  /** The device's spot index (the wire's). */
  idx: number;
  /** Role: 'b' offered first, 'a' took the other end. */
  role: 'a' | 'b';
  /** Paired by the host; our end sent (or the host's / partner's end came). */
  paired: boolean;
  sent: boolean;
  /** Health at the last step (a drop = hurt). */
  hp: number;
  /** Partner: seconds since the lift request (-1 none). */
  asked: number;
  /** Carrying: the partner not seen carrying this long (s); the gap off the band this long (s). */
  lostT: number;
  slipT: number;
  /** The board's ends where it lay at the lift (ours, the partner's) and where they were at the put-down. */
  readonly mine0: PlankPoint;
  readonly their0: PlankPoint;
  readonly mineD: PlankPoint;
  readonly theirD: PlankPoint;
  /** The carriers' floor (m; the put-down's). */
  floorY: number;
  /** (K5b) This page's player id (the start's; '' before one). */
  self: string;
  /** (K5b) Carrying: seconds to the next lay search; the last plan and whether it can be laid; a lay request's age (s,
   *  -1 none). */
  layT: number;
  readonly plan: LayPlan;
  planOk: boolean;
  layAsked: number;
  /** Scratch and the override (one object, reused). */
  readonly v: { x: number; z: number };
  readonly ov: MoveOverride;
}

function newRun(): PlankRun {
  return {
    dev: null,
    idx: -1,
    role: 'b',
    paired: false,
    sent: false,
    hp: NaN,
    asked: -1,
    lostT: 0,
    slipT: 0,
    mine0: { x: 0, y: 0, z: 0 },
    their0: { x: 0, y: 0, z: 0 },
    mineD: { x: 0, y: 0, z: 0 },
    theirD: { x: 0, y: 0, z: 0 },
    floorY: 0,
    self: '',
    layT: 0,
    plan: newLayPlan(),
    planOk: false,
    layAsked: -1,
    v: { x: 0, z: 0 },
    ov: { velocity: { x: 0, z: 0 }, yaw: 0, turnRate: PLANK.turnRate, crouch: false },
  };
}

/** A mate offering at spot index `i` (`brace` + the bit, `s` = -(i + 1)). */
function offeringAt(m: TeamMate, i: number): boolean {
  return m.mode === 'brace' && ((m.sub ?? 0) & PLANK_SUB) !== 0 && Math.abs((m.s ?? 0) + i + 1) < 0.01;
}

/** A mate lifting or carrying spot index `i` (`s` = i + 1), in `mode` (b `brace`, a `boost`). */
function carryingAt(m: TeamMate, i: number, mode: string): boolean {
  return m.mode === mode && ((m.sub ?? 0) & PLANK_SUB) !== 0 && Math.abs((m.s ?? 0) - i - 1) < 0.01;
}

function netEnd(h: KitHost, k: 'pull' | 'drop'): void {
  h.g.net?.teamHangEnd?.(k);
}

function prompt(h: KitHost, text: string, x: number, y: number, z: number): void {
  h.prompt = text;
  h.promptAt.set(x, y, z);
}

function copy(p: PlankPoint, q: PlankPoint): void {
  p.x = q.x;
  p.y = q.y;
  p.z = q.z;
}

/** Our end (`mine`) and the partner's (`their`) of the device by role (a holds `a`, b holds `b`). */
function mineOf(run: PlankRun, d: PlankDevice): PlankPoint {
  return run.role === 'a' ? d.a : d.b;
}

function theirOf(run: PlankRun, d: PlankDevice): PlankPoint {
  return run.role === 'a' ? d.b : d.a;
}

function smooth(k: number): number {
  const t = Math.max(0, Math.min(1, k));
  return t * t * (3 - 2 * t);
}

/**
 * The local pair's board (every fixed step from `tick`): between our hand point and the partner's (their seen feet);
 * blended from where it lay while lifting, lowered from where it was while putting down. No allocation.
 */
function localEnds(h: KitHost, run: PlankRun, d: PlankDevice): void {
  const st = h.state;
  const mine = mineOf(run, d);
  const their = theirOf(run, d);
  if (dropping(st)) {
    const k = smooth(h.t / PLANK.dropTime);
    const y = run.floorY + PLANK.thick / 2;
    mine.x = run.mineD.x;
    mine.z = run.mineD.z;
    mine.y = run.mineD.y + (y - run.mineD.y) * k;
    their.x = run.theirD.x;
    their.z = run.theirD.z;
    their.y = run.theirD.y + (y - run.theirD.y) * k;
    return;
  }
  const p = h.g.player.controller.pos;
  const q = h.partnerPos();
  if (!q) return;
  const dx = q.x - p.x;
  const dz = q.z - p.z;
  const dd = hyp2(dx, dz);
  const ux = dd > 1e-6 ? dx / dd : Math.sin(d.yaw);
  const uz = dd > 1e-6 ? dz / dd : Math.cos(d.yaw);
  mine.x = p.x + ux * PLANK.hand;
  mine.y = p.y + PLANK.hip;
  mine.z = p.z + uz * PLANK.hand;
  their.x = q.x - ux * PLANK.hand;
  their.y = q.y + PLANK.hip;
  their.z = q.z - uz * PLANK.hand;
  if (lifting(st)) {
    const k = smooth(h.t / PLANK.liftTime);
    mine.x = run.mine0.x + (mine.x - run.mine0.x) * k;
    mine.y = run.mine0.y + (mine.y - run.mine0.y) * k;
    mine.z = run.mine0.z + (mine.z - run.mine0.z) * k;
    their.x = run.their0.x + (their.x - run.their0.x) * k;
    their.y = run.their0.y + (their.y - run.their0.y) * k;
    their.z = run.their0.z + (their.z - run.their0.z) * k;
  }
  d.phase = 'carried';
  plankMid(d, (p.y + q.y) / 2);
}

/** A board two mates carry on this page (neither is us): between their hand points. */
function remoteEnds(d: PlankDevice, ma: TeamMate, mb: TeamMate): void {
  const dx = mb.pos.x - ma.pos.x;
  const dz = mb.pos.z - ma.pos.z;
  const dd = hyp2(dx, dz);
  const ux = dd > 1e-6 ? dx / dd : Math.sin(d.yaw);
  const uz = dd > 1e-6 ? dz / dd : Math.cos(d.yaw);
  d.a.x = ma.pos.x + ux * PLANK.hand;
  d.a.y = ma.pos.y + PLANK.hip;
  d.a.z = ma.pos.z + uz * PLANK.hand;
  d.b.x = mb.pos.x - ux * PLANK.hand;
  d.b.y = mb.pos.y + PLANK.hip;
  d.b.z = mb.pos.z - uz * PLANK.hand;
  d.phase = 'carried';
  d.user = mb.id;
  plankMid(d, (ma.pos.y + mb.pos.y) / 2);
}

/** (K5b, K5b-6) A mate offers at board `i` by its stack while this page has it lying elsewhere: the host put it home
 *  (a station retry this page had no word of). */
function homeOffer(d: PlankDevice, i: number, ms: readonly TeamMate[]): boolean {
  const reach = PLANK.endReach + PLANK.hostSlack;
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (offeringAt(m, i) && plankEndNear(d, m.pos.x, m.pos.z, reach) === 0 && plankHomeNear(d, m.pos.x, m.pos.z, reach)) return true;
  }
  return false;
}

/**
 * Every board on this page, each fixed step (`tick`: whatever the state, alive or not): ours follows our pair; one two
 * mates carry (a `brace` and a `boost` mate with `s` = its index + 1) follows them; one carried by nobody any more is
 * put down where it is. (K5b) A laid board slides to its laid ends, then the host watches it for crossings; a board
 * lying away from its stack goes home when a mate offers at the stack. A restart's hold-off ignores remote carries.
 * Allocation-free.
 */
export function syncPlanks(h: KitHost, run: PlankRun, dt: number): void {
  const list = h.devices.list;
  const ms = h.mates();
  for (let i = 0; i < list.length; i++) {
    const d0 = list[i]!;
    if (!isPlankDevice(d0)) continue;
    const d = d0;
    if (d.holdOff > 0) d.holdOff = Math.max(0, d.holdOff - dt);
    if (d === run.dev && holding(h.state)) {
      localEnds(h, run, d);
      continue;
    }
    if ((d.phase === 'laid' || d.phase === 'floor') && homeOffer(d, i, ms)) {
      resetPlank(d);
      d.holdOff = 0;
      continue;
    }
    if (d.phase === 'laid') {
      if (d.slide < 1) slidePlank(d, dt);
      else crossings(h, run, d);
      continue;
    }
    let ma: TeamMate | null = null;
    let mb: TeamMate | null = null;
    for (let j = 0; j < ms.length && d.holdOff <= 0; j++) {
      const m = ms[j]!;
      if (!mb && carryingAt(m, i, 'brace')) mb = m;
      else if (!ma && carryingAt(m, i, 'boost')) ma = m;
    }
    if (ma && mb) remoteEnds(d, ma, mb);
    else if (d.phase === 'carried') putPlankDown(d, d.y);
  }
}

/** A section restart or a station retry: a local plank move ends, every board back on its stack (the `reset` hook). */
export function resetPlanks(h: KitHost, run: PlankRun): void {
  if (run.dev && (h.state === OFFER || holding(h.state) || laying(h.state))) {
    h.endWhy = 'plank: restart';
    h.end(true);
  }
  run.layAsked = -1;
  run.planOk = false;
  const l = h.devices.list;
  for (let i = 0; i < l.length; i++) {
    const d = l[i]!;
    if (isPlankDevice(d)) resetPlank(d);
  }
}

/** Held still (crouched while offering), facing `yaw`. */
function still(h: KitHost, run: PlankRun, yaw: number, crouch: boolean): void {
  const ov = run.ov;
  ov.velocity!.x = 0;
  ov.velocity!.z = 0;
  ov.yaw = yaw;
  ov.crouch = crouch;
  h.g.player.controller.override = ov;
  h.g.player.pose.traverse = 'brace';
}

/** The board's middle as a facing from (x, z). */
function yawTo(d: PlankDevice, x: number, z: number): number {
  return Math.atan2(d.x - x, d.z - z);
}

/** Lifting / carrying: our velocity (stick or none) capped to the board; facing the partner (lift) or the walk. The gap. */
function drive(h: KitHost, run: PlankRun, dt: number, stick: boolean): number {
  const d = run.dev!;
  const c = h.g.player.controller;
  const q = h.partnerPos();
  if (!q) return NaN;
  const dx = q.x - c.pos.x;
  const dz = q.z - c.pos.z;
  const dd = hyp2(dx, dz);
  const ux = dd > 1e-6 ? dx / dd : Math.sin(d.yaw);
  const uz = dd > 1e-6 ? dz / dd : Math.cos(d.yaw);
  const gap = dd - 2 * PLANK.hand;
  let vx = 0;
  let vz = 0;
  if (stick) {
    const w = c.wishDir;
    const m = hyp2(w.x, w.z);
    const s = m > 1 ? PLANK.carry / m : PLANK.carry;
    vx = w.x * s;
    vz = w.z * s;
  }
  const v = carryVelocity(vx, vz, ux, uz, gap, d.len, dt, run.v);
  const ov = run.ov;
  ov.velocity!.x = v.x;
  ov.velocity!.z = v.z;
  ov.crouch = false;
  ov.turnRate = PLANK.turnRate;
  if (!stick) ov.yaw = Math.atan2(ux, uz);
  else if (hyp2(v.x, v.z) > PLANK.faceSpeed) ov.yaw = Math.atan2(v.x, v.z);
  else ov.yaw = c.yaw;
  c.override = ov;
  h.g.player.pose.traverse = stick ? 'none' : 'brace';
  return gap;
}

/** Put it down: both hold still while the board is lowered (`send`: tell the host, our own B / hit / loss). */
function startDrop(h: KitHost, run: PlankRun, send: boolean, why: string): void {
  const d = run.dev!;
  copy(run.mineD, mineOf(run, d));
  copy(run.theirD, theirOf(run, d));
  run.floorY = d.y;
  if (send && run.paired && !run.sent) netEnd(h, 'drop');
  run.sent = true;
  h.endWhy = why;
  h.state = run.role === 'b' ? 'plankDrop' : 'plankDropA';
  h.t = 0;
}

/** The partner (a mate) still in our move: lifting / carrying our board. */
function partnerCarrying(h: KitHost, run: PlankRun): boolean {
  const ms = h.mates();
  const mode = run.role === 'a' ? 'brace' : 'boost';
  for (let i = 0; i < ms.length; i++) if (ms[i]!.id === h.partner && carryingAt(ms[i]!, run.idx, mode)) return true;
  return false;
}

/** (K5b) The lay search on this page: from our body ahead (axis partner -> us), else from the partner's (us -> it). */
function searchLay(h: KitHost, run: PlankRun): boolean {
  const c = h.g.player.controller;
  const q = h.partnerPos();
  const d = run.dev;
  if (!q || !d) return false;
  const dx = c.pos.x - q.x;
  const dz = c.pos.z - q.z;
  const dd = hyp2(dx, dz);
  if (dd < 1e-3) return false;
  RAY_G = h.g;
  const p = planLay(plankRay, c.pos.x, c.pos.y, c.pos.z, dx / dd, dz / dd, d.len, run.plan);
  if (p.why === 'noEdge') planLay(plankRay, q.x, q.y, q.z, -dx / dd, -dz / dd, d.len, run.plan);
  RAY_G = null;
  return run.plan.why === '';
}

/** (K5b) Carrying: the lay prompt, its search and its request on Co-op (a polite refusal when it cannot be laid). */
function layStepCarry(h: KitHost, run: PlankRun, dt: number, coopPressed: boolean): void {
  const c = h.g.player.controller;
  if (run.layAsked >= 0) {
    if ((run.layAsked += dt) <= PLANK.askWait) {
      prompt(h, 'Laying the board...', c.pos.x, c.pos.y + 1.9, c.pos.z);
      return;
    }
    run.layAsked = -1;
  }
  if ((run.layT -= dt) <= 0 || coopPressed) {
    run.layT = PLANK.layEvery;
    run.planOk = searchLay(h, run);
  }
  if (coopPressed) {
    const p = run.plan;
    if (run.planOk) {
      run.layAsked = 0;
      h.kitRequest('plankBridge', h.partner, run.idx, layS(Math.atan2(p.fx - p.nx, p.fz - p.nz)), p.fy, p.fx, p.fz);
      prompt(h, 'Laying the board...', c.pos.x, c.pos.y + 1.9, c.pos.z);
      return;
    }
    if (p.why !== '') h.refused(LAY_REFUSE[p.why]);
  }
  prompt(h, run.planOk ? 'Co-op: lay the board over the gap (plank bridge)' : 'Carrying the board: B puts it down', c.pos.x, c.pos.y + 1.9, c.pos.z);
}

function offerStep(h: KitHost, run: PlankRun, coopPressed: boolean, bPressed: boolean): void {
  const d = run.dev!;
  const c = h.g.player.controller;
  still(h, run, yawTo(d, c.pos.x, c.pos.z), true);
  const hp = h.health();
  const hurt = hp < run.hp;
  run.hp = hp;
  if (bPressed) c.swallowCrouch = true;
  if (hurt || !c.grounded || coopPressed || bPressed || h.t > TEAM.offerTime || d.phase === 'carried' || (d.phase === 'laid' && !d.laid)) {
    h.endWhy = hurt || !c.grounded ? 'plank: disturbed' : 'plank: let go';
    h.end(hurt);
    return;
  }
  prompt(h, 'Holding an end: your partner takes the other end (B lets go)', c.pos.x, c.pos.y + 1.5, c.pos.z);
}

/** (K5b) Laying: held still facing along the board while it slides out; then free (side a frees the host's pair). */
function layStep(h: KitHost, run: PlankRun): void {
  const d = run.dev!;
  still(h, run, d.yaw, false);
  h.prompt = null;
  if (h.t < PLANK.layTime) return;
  if (run.role === 'a' && run.paired && !run.sent) {
    run.sent = true;
    netEnd(h, 'drop');
  }
  h.endWhy = '';
  h.end(false);
}

function pairStep(h: KitHost, run: PlankRun, dt: number, coopPressed: boolean, bPressed: boolean): void {
  const d = run.dev!;
  const c = h.g.player.controller;
  const st = h.state;
  if (laying(st)) return layStep(h, run);
  if (dropping(st)) {
    still(h, run, c.yaw, false);
    h.prompt = null;
    if (h.t >= PLANK.dropTime) {
      // (K5b) a lay that started meanwhile wins: the board is laid on both pages
      if (d.phase !== 'laid') putPlankDown(d, run.floorY);
      h.endWhy = '';
      h.end(false);
    }
    return;
  }
  const lift = lifting(st);
  const gap = drive(h, run, dt, !lift);
  const hp = h.health();
  const hurt = hp < run.hp;
  run.hp = hp;
  if (bPressed) c.swallowCrouch = true;
  if (Number.isNaN(gap)) return startDrop(h, run, true, 'plank: partner gone');
  if (hurt || !c.grounded) return startDrop(h, run, true, 'plank: disturbed');
  if (bPressed) return startDrop(h, run, true, 'plank: put down');
  if (lift) {
    h.prompt = null;
    if (h.t >= PLANK.liftTime) {
      h.state = run.role === 'b' ? 'plankCarry' : 'plankCarryA';
      h.t = 0;
      run.lostT = 0;
      run.slipT = 0;
      run.layT = 0;
      run.planOk = false;
      run.layAsked = -1;
    }
    return;
  }
  // carrying: the partner must still carry it (their MoveState), and the board must not slip from the hands
  if (partnerCarrying(h, run)) run.lostT = 0;
  else if ((run.lostT += dt) > PLANK.lostGrace) return startDrop(h, run, true, 'plank: partner let go');
  const off = Math.abs(gap - d.len) - PLANK.band;
  if (off > PLANK.slip) {
    if ((run.slipT += dt) > PLANK.slipTime) return startDrop(h, run, true, 'plank: slipped');
  } else run.slipT = 0;
  layStepCarry(h, run, dt, coopPressed);
}

function plankIdle(h: KitHost, run: PlankRun, coopPressed: boolean, free: boolean): boolean | null {
  if (!flags.kitMoves.has('plankBridge') || !free) return null;
  const c = h.g.player.controller;
  const list = h.devices.list;
  const ms = h.mates();
  for (let i = 0; i < list.length; i++) {
    const d0 = list[i]!;
    if (!isPlankDevice(d0)) continue;
    const d = d0;
    // (K5b) a settled laid board can be lifted again from either end
    if ((d.phase !== 'stack' && d.phase !== 'floor' && !d.laid) || Math.abs(c.pos.y - d.y) > PLANK.up) continue;
    const mine = plankEndNear(d, c.pos.x, c.pos.z, PLANK.endReach);
    if (mine === 0) continue;
    let mate: TeamMate | null = null;
    let taken = false;
    for (let j = 0; j < ms.length; j++) {
      const m = ms[j]!;
      if (!offeringAt(m, i) || Math.abs(m.pos.y - d.y) > PLANK.up) continue;
      const e = plankEndNear(d, m.pos.x, m.pos.z, PLANK.endReach + PLANK.hostSlack);
      if (e !== 0 && e !== mine) mate = m;
      else if (e === mine) taken = true;
    }
    const px = c.pos.x;
    const py = c.pos.y;
    const pz = c.pos.z;
    if (mate) {
      if (run.asked >= 0) {
        prompt(h, 'Taking the other end...', px, py + 1.2, pz);
        return false;
      }
      prompt(h, 'Co-op: take the other end (plank bridge)', px, py + 1.2, pz);
      if (!coopPressed) return false;
      run.asked = 0;
      h.kitRequest('plankBridge', mate.id, i, 1, py);
      return true;
    }
    if (taken) return null;
    prompt(h, 'Co-op: take an end of the board (plank bridge)', px, py + 1.2, pz);
    if (!coopPressed) return false;
    run.dev = d;
    run.idx = i;
    run.role = 'b';
    run.paired = run.sent = false;
    run.hp = h.health();
    h.partner = '';
    h.state = OFFER;
    h.t = 0;
    h.count.offers++;
    still(h, run, yawTo(d, px, pz), true);
    return true;
  }
  return null;
}

/** (K5b) The host started a lay: every page that gets it lays the device; a carrier of it goes `plankLay(A)`. */
function beginLay(h: KitHost, run: PlankRun, s: TeamStart, self: string): void {
  const d0 = s.target >= 0 ? h.devices.list[s.target] : undefined;
  run.layAsked = -1;
  if (!d0 || !isPlankDevice(d0) || !s.l) return;
  const d = d0;
  const c = h.g.player.controller;
  // the near floor: the front carrier's feet as this page sees them (still while laying: both pages agree), in cm
  const other = s.a === self ? s.b : s.a;
  let y0 = c.pos.y;
  const ms = h.mates();
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (m.id === other && hyp2(m.pos.x - s.l[0], m.pos.z - s.l[2]) < hyp2(c.pos.x - s.l[0], c.pos.z - s.l[2])) y0 = m.pos.y;
  }
  layPlank(d, s.l, layYaw(s.s), Math.round(y0 * 100) / 100, s.a, s.b);
  if (run.dev !== d || !(carrying(h.state) || lifting(h.state))) return;
  h.partner = other;
  run.paired = true;
  run.sent = false;
  h.state = run.role === 'b' ? 'plankLay' : 'plankLayA';
  h.t = 0;
}

export const PLANK_MOVE: KitMove<PlankRun> = {
  kind: 'plankBridge',
  times: { plankLift: PLANK.liftTime, plankLiftA: PLANK.liftTime, plankDrop: PLANK.dropTime, plankDropA: PLANK.dropTime, plankLay: PLANK.layTime, plankLayA: PLANK.layTime },
  paired: true,
  // (K5b-1) a lay claims its far end (`TeamRequest.land`, the start's `l`); a lift claims none
  claimsPoint: true,
  // the offer's hands are on the board: weapons and interact stay off
  busyOffer: true,
  newRun,
  check: checkPlank,

  tick(h, run, dt) {
    if (run.asked >= 0 && (run.asked += dt) > PLANK.askWait) run.asked = -1;
    syncPlanks(h, run, dt);
    h.g.world?.planks?.update(h.devices.list);
  },

  idle(h, run, coopPressed, free) {
    return plankIdle(h, run, coopPressed, free);
  },

  begin(h, run, s, self) {
    run.self = self;
    if (s.s >= 2 && s.l) return beginLay(h, run, s, self);
    const c = h.g.player.controller;
    run.asked = -1;
    const d0 = s.target >= 0 ? h.devices.list[s.target] : undefined;
    const b = s.b === self;
    h.partner = b ? s.a : s.b;
    if (!d0 || !isPlankDevice(d0)) {
      // the host named no board on this page: tell it, stay free (the partner's page puts its end down)
      h.endWhy = 'plank: no device';
      netEnd(h, 'drop');
      if (h.state === OFFER) h.end(true);
      return;
    }
    const d = d0;
    run.dev = d;
    run.idx = s.target;
    run.role = b ? 'b' : 'a';
    run.paired = true;
    run.sent = false;
    run.hp = h.health();
    run.lostT = 0;
    run.slipT = 0;
    // where it lay: our end the nearer one
    const ea = hyp2(d.a.x - c.pos.x, d.a.z - c.pos.z) <= hyp2(d.b.x - c.pos.x, d.b.z - c.pos.z);
    copy(run.mine0, ea ? d.a : d.b);
    copy(run.their0, ea ? d.b : d.a);
    d.phase = 'carried';
    d.laid = false;
    d.user = s.b;
    clearMarks(d);
    h.state = b ? 'plankLift' : 'plankLiftA';
    h.t = 0;
  },

  step(h, run, dt, coopPressed, bPressed) {
    h.t += dt;
    if (!run.dev) {
      h.endWhy = 'plank: no device';
      h.end(true);
      return;
    }
    if (h.state === OFFER) offerStep(h, run, coopPressed, bPressed);
    else pairStep(h, run, dt, coopPressed, bPressed);
  },

  ended(h, run) {
    // the partner put it down or the host ended it: put down too (already going down, or laying: nothing)
    if (lifting(h.state) || carrying(h.state)) startDrop(h, run, false, 'plank: partner put it down');
    else if (h.state === OFFER) {
      run.paired = false;
      h.partner = '';
    }
  },

  end(h, run) {
    const d = run.dev;
    if (d && holding(h.state)) {
      // ended mid-move (downed, a restart, a new move): the board is down at once where it is
      if (d.phase === 'carried') putPlankDown(d, dropping(h.state) ? run.floorY : d.y);
      if (run.paired && !run.sent) {
        run.sent = true;
        netEnd(h, 'drop');
      }
    }
    run.dev = null;
    run.paired = false;
    run.asked = -1;
    run.layAsked = -1;
  },

  wireS(h, run) {
    if (h.state === OFFER) return -(run.idx + 1);
    return lifting(h.state) || carrying(h.state) || laying(h.state) ? run.idx + 1 : 0;
  },

  setupDevices(_h, run, devices: KitDevices, level) {
    run.dev = null;
    // every spot, whatever the flags: both pages list the devices in the same order (the wire's spot index)
    const spots = kitSpotsOf(level, 'plankBridge');
    for (let i = 0; i < spots.length; i++) devices.add(newPlankDevice(spots[i]!));
  },

  reset(h, run) {
    resetPlanks(h, run);
  },
};

KIT_PAIR.plankBridge = { pairS: PLANK.pairS, doneBy: 'a' };

registerKitMove(PLANK_MOVE);
