/**
 * (coop-kit K5a, PLAN "Design per move" -> "Plank Bridge") Plank Bridge, lift and carry. SIGNOFF: "Both carry a scaffold
 * board and lay it over a gap. Guards notice it." Real-world: a 3.9 m scaffold board (225 x 38 mm, about 20-25 kg)
 * carried end to end at the hip. K5a is the lift, the carry, the put-down and the restart reset; the lay, the laid
 * board's collider, the done call and the guards' notice are K5b (this file and `world/plankBridge.ts`). Pure and
 * Babylon-free; registered with the kit registry at load. Numbers are starting values (G10; BRIEF A17: the A12 bands
 * stay move constants until Michael answers).
 *
 * Spot (map data, `addKitSpot(b.anchors, spot)`, kitApi.ts): `kind 'plankBridge'`, (`x`, `y`, `z`) the board stack's
 * middle with `y` the floor under it (feet), `yaw` the boards' long axis ((sin yaw, cos yaw)), `w` the board length
 * (default `PLANK.len` 3.9), `h` the stack's top over its floor (default `PLANK.stackH` 0.16: Marlow A2's four layers of
 * 0.04 m boards). Band (K5b's lay): gap 1.0-3.3 m, edges level within +-0.3 m, the stack within 15 m walk of the gap.
 * One board per spot: the device (`PlankDevice`) is `stack` -> `carried` -> `floor` (-> `laid`, K5b). Devices are added
 * for every spot whatever the flags (both pages list them in the same order: the wire's spot index); only the offers
 * and the host's rule read the id (`flags.kitMoves.has('plankBridge')`).
 *
 * Lift (role b first): free on the ground within `PLANK.endReach` 0.6 m of a board end, a team-mate about, Co-op ->
 * "Co-op: take an end of the board (plank bridge)" -> `plankOffer` (crouched, still, hands on the end; busy). The
 * partner within 0.6 m of the other end -> "Co-op: take the other end (plank bridge)" -> `tmove plankBridge` (`target`
 * the spot index, `s` 1 = lift) -> host rule (`checkPlank`): b `brace` + `PLANK_SUB` 1024 offering at that spot (its
 * `s` = -(index + 1)), the board on its stack or the floor, a on the ground within 0.6 m (+ the host's 0.3 m slack: its
 * view lags) of the other end, same floor +-0.4 m -> `tstart` (paired) -> b `plankLift` / a `plankLiftA` (1.2 s, a leg
 * lift to the hip; the board blends from where it lay to the hands) -> `plankCarry` / `plankCarryA` (held).
 *
 * Carry: both steer. Each page caps its own body (`carryVelocity`): the stick at `PLANK.carry` 1.2 m/s, the part of it
 * along the line to the partner's seen body clamped so the gap between the two hand points stays within the board's
 * length +-`PLANK.band` 0.25 m (`PLANK.margin` inside it for the other page's step), out of the band it comes back at
 * most `PLANK.fix` of the error per step; across the line it is free, so the pair turns. The facing follows the walk at
 * `PLANK.turnRate`. So the pair goes at the slower stick. Hands busy (weapons off). The board is drawn on every page
 * between the two drawn bodies' hand points (`PLANK.hand` toward the partner, `PLANK.hip` up), no board pose on the
 * wire. B by either -> both `plankDrop` / `plankDropA` (0.8 s, the board lowered where it is: `floor`, liftable again),
 * end `drop`; a hit, a fall, the partner gone or no longer carrying (`PLANK.lostGrace`), or the gap slipping past
 * `PLANK.slip` drops it the same way; downed or dead the controller ends the move and the board is down at once.
 *
 * Wire (MoveState): b `brace`, a `boost`, both + `PLANK_SUB`; `s` = -(spot index + 1) offering, (spot index + 1) lifting
 * and carrying (1 for a level's first device), 0 putting it down. Another page (a third player, or the host of two
 * clients) draws the board between a `brace` and a `boost` mate carrying the same index. Ends travel as the hang-down's
 * (`net.teamHangEnd`): only 'drop' in K5a. Pair time `PLANK.pairS` (`KIT_PAIR`), done side a (K5b's done is the host's
 * tick on a crossing, `kitDone`).
 *
 * Section restart (the `resetKit` pattern, J9 S1): the move hears `checkpointRestart` (`GameState.checkpointReset`, the
 * host's and the client's on the banner) and `resetPlanks` ends a local plank move and puts every board back on its
 * stack; remote carries are ignored for `PLANK.resetHoldOff` (their MoveState lags the banner).
 *
 * States (`KIT_POSE_IDS.plankBridge`): b plankOffer, plankLift, plankCarry, plankDrop (plankLay K5b); a plankLiftA,
 * plankCarryA, plankDropA (plankLayA K5b). `plankJoin` is not used: the partner stays free until the host's start (the
 * shutter crawler's pattern). Placeholders (K0): brace, brace, walk, brace; KA5 puts the hands on the board by IK.
 */
import { hyp2, hyp3 } from '../../core/mathx';
import { flags } from '../../core/flags';
import { TEAM } from '../../config/movement';
import { PLANK_SUB, type TeamDenial, type TeamRequest } from '../teamMoves';
import { KIT_PAIR, kitSpotsOf, type KitSpot } from './kitApi';
import { registerKitMove, type KitDevice, type KitDevices, type KitHost, type KitMove, type KitState } from './registry';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate } from '../teamController';

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
  /** Partner: a lift request with no start after this (s) is dropped. */
  askWait: 1.0,
  /** The host's pair lasts this (s; a long carry). */
  pairS: 600,
  /** After a section restart remote carries are ignored this long (s). */
  resetHoldOff: 0.5,
  /** Facing follows the walk above this speed (m/s). */
  faceSpeed: 0.15,
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
  /** The board's centre-line ends (world): carried, a's hand (`a`) and b's hand (`b`); else where it lies. */
  readonly a: PlankPoint;
  readonly b: PlankPoint;
  /** Seconds a section restart still ignores remote carries (0 none). */
  holdOff: number;
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
  };
  lay(d, s.x, s.y, s.z, s.yaw, d.stackH);
  return d;
}

/** Back on its stack (a section restart). */
export function resetPlank(d: PlankDevice): void {
  d.phase = 'stack';
  d.user = '';
  d.open = 0;
  d.holdOff = PLANK.resetHoldOff;
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

// ---- the host's rule ----

/** The host's rule for a lift (`a` takes the other end of the board `b` offers at the request's spot). */
export function checkPlank(r: TeamRequest): TeamDenial | null {
  if (!flags.kitMoves.has('plankBridge')) return 'notOffering';
  const spot = r.spot;
  if (!spot || spot.kind !== 'plankBridge') return 'noTarget';
  const d = spot as PlankDevice;
  const a = r.a;
  const b = r.b;
  if (b.mode !== 'brace' || ((b.sub ?? 0) & PLANK_SUB) === 0 || Math.abs((b.s ?? 0) + r.target + 1) > 0.01) return 'notOffering';
  if (d.phase === 'carried' || d.phase === 'laid') return 'busy';
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
  /** Hooked to the restart event (once per controller). */
  hooked: boolean;
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
    hooked: false,
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

/**
 * Every board on this page, each fixed step (`tick`: whatever the state, alive or not): ours follows our pair; one two
 * mates carry (a `brace` and a `boost` mate with `s` = its index + 1) follows them; one carried by nobody any more is
 * put down where it is. A restart's hold-off ignores remote carries. Allocation-free.
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
    if (d.phase === 'laid') continue;
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

/** A section restart: a local plank move ends, every board back on its stack (`checkpointRestart`). */
export function resetPlanks(h: KitHost, run: PlankRun): void {
  if (run.dev && (h.state === OFFER || holding(h.state))) {
    h.endWhy = 'plank: restart';
    h.end(true);
  }
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

function offerStep(h: KitHost, run: PlankRun, coopPressed: boolean, bPressed: boolean): void {
  const d = run.dev!;
  const c = h.g.player.controller;
  still(h, run, yawTo(d, c.pos.x, c.pos.z), true);
  const hp = h.health();
  const hurt = hp < run.hp;
  run.hp = hp;
  if (bPressed) c.swallowCrouch = true;
  if (hurt || !c.grounded || coopPressed || bPressed || h.t > TEAM.offerTime || d.phase === 'carried' || d.phase === 'laid') {
    h.endWhy = hurt || !c.grounded ? 'plank: disturbed' : 'plank: let go';
    h.end(hurt);
    return;
  }
  prompt(h, 'Holding an end: your partner takes the other end (B lets go)', c.pos.x, c.pos.y + 1.5, c.pos.z);
}

function pairStep(h: KitHost, run: PlankRun, dt: number, bPressed: boolean): void {
  const d = run.dev!;
  const c = h.g.player.controller;
  const st = h.state;
  if (dropping(st)) {
    still(h, run, c.yaw, false);
    h.prompt = null;
    if (h.t >= PLANK.dropTime) {
      putPlankDown(d, run.floorY);
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
  prompt(h, 'Carrying the board: B puts it down', c.pos.x, c.pos.y + 1.9, c.pos.z);
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
    if ((d.phase !== 'stack' && d.phase !== 'floor') || Math.abs(c.pos.y - d.y) > PLANK.up) continue;
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

export const PLANK_MOVE: KitMove<PlankRun> = {
  kind: 'plankBridge',
  times: { plankLift: PLANK.liftTime, plankLiftA: PLANK.liftTime, plankDrop: PLANK.dropTime, plankDropA: PLANK.dropTime },
  paired: true,
  claimsPoint: false,
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
    d.user = s.b;
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
    else pairStep(h, run, dt, bPressed);
  },

  ended(h, run) {
    // the partner put it down or the host ended it: put down too (already going down: nothing)
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
  },

  wireS(h, run) {
    if (h.state === OFFER) return -(run.idx + 1);
    return lifting(h.state) || carrying(h.state) ? run.idx + 1 : 0;
  },

  setupDevices(h, run, devices: KitDevices, level) {
    run.dev = null;
    // every spot, whatever the flags: both pages list the devices in the same order (the wire's spot index)
    const spots = kitSpotsOf(level, 'plankBridge');
    for (let i = 0; i < spots.length; i++) devices.add(newPlankDevice(spots[i]!));
    if (!run.hooked) {
      run.hooked = true;
      // (the `resetKit` pattern) a section restart puts the boards back; one listener per controller, for its life
      h.g.events?.on('checkpointRestart', () => resetPlanks(h, run));
    }
  },
};

KIT_PAIR.plankBridge = { pairS: PLANK.pairS, doneBy: 'a' };

registerKitMove(PLANK_MOVE);
