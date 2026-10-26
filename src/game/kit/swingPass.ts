/**
 * (coop-kit K4, PLAN Part 2 "Swing Pass") Michael's SIGNOFF row: "One, braced on a pipe, swings the partner across a
 * shaft." The anchor braces at an overhead bar on the near edge of a gap; the rider takes the anchor's wrist, steps off
 * and swings across under the bar, lets go past the far edge and lands crouched. Pure and Babylon-free except the run's
 * kinematic vector (`c.pos.clone()` once per run, as `shutter.ts`); registered with the kit registry at load
 * (teamController's glob loads it).
 *
 * Spot (`addKitSpot`, `kind 'swingPass'`; required, the bar is no hand-traverse anchor): (`x`, `z`) the near edge point
 * on the swing line under the bar, `y` the bar's height (absolute; NOT a floor), `yaw` across the gap toward the far
 * side (forward = (sin yaw, cos yaw)), `w` the gap, `y2` the far floor (absolute). Bands (A12 "Not yet", M3: move
 * constants, A17): the gap 2.0-3.5 m and the far floor within 0.4 m of the near one are enforced by the rider's page
 * (a polite refusal) and the host; the bar 2.2-2.8 m (+-0.2 m) over the anchor's feet gates the offer and the host;
 * `swingSpotOk` logs a bad spot at setup. One `SwingDevice` per spot, added for every spot whatever `flags.kitMoves`
 * says (the wire's spot index must match on every page, k0-CHECK-B polish 3); a spot without `w` / `y2` stays listed
 * and inert (one warning). Only the offers and the host's rule read the id.
 *
 * Anchor (role b, wire `brace` + `SWING_SUB`, `s` = spot index + 1): within `anchorReach` of the near edge point,
 * facing the gap, Co-op -> `swingOffer` (onto the stance over `grab`: `anchorBack` behind the edge, `anchorSide` to
 * one side of the swing line, K4-1; B or a hit lets go) -> the host's start -> `swingHold` (held at the stance; before
 * `grip` B / a hit / a shove sends 'drop' and the swing does not start, after it the swing is committed, K4-3) -> the
 * relayed end, or `hold + holdGrace` with none -> free.
 * Rider (role a, wire `boost` + `SWING_SUB`, `s` = spot index + 1): within `riderReach` of an offering anchor, Co-op ->
 * the page's checks (gap, far floor: a polite refusal) -> `kitRequest` (target = the spot index, the claimed landing =
 * the spot's, K4-4) -> the host's start -> `swingRide` (`ride` s on `swingPath`: `grip` onto the step-off point, then
 * the arc across, kinematic, K4-2; committed from the start) -> `swingRelease` (`release` s on `swingLand`, crouched)
 * -> lands crouched on the claimed landing, sends 'pull' -> free. The anchor's 'drop' before `grip` ends the ride where
 * it stands (on the near floor).
 * Moved by something else (K1-3, K4-6: a retry teleport, another override): the body more than `shove` off where the
 * move put it, or its override replaced, ends the move at once.
 *
 * The host's rule (`checkSwing`; K4-7: the host trusts the anchor's MoveState): the spot a usable swing device, b
 * offering at that spot, a on the ground, same floor and in reach, b at the edge, the bar / gap / far floor in band and
 * the claim within `landTol` of the spot's landing. Paired, claims a point; no host rays (the throw's pattern, K4-4).
 * Done (K0's generic pair end, `doneBy 'a'`): the rider's 'pull' at the landing -> `kitDone('swingPass', spot, rider,
 * anchor)` on the host, once per landing. Local pose: K0's placeholders (`swingOffer` / `swingHold` 'hangOffer', the
 * rider the 'vault' traverse). Numbers are starting values (G10, A17).
 */
import { hyp2 } from '../../core/mathx';
import { flags } from '../../core/flags';
import { SWING_SUB, type TeamDenial, type TeamRequest } from '../teamMoves';
import { registerKitMove, type KitDevice, type KitDevices, type KitHost, type KitMove } from './registry';
import { KIT_PAIR, kitSpotsOf, type KitSpot } from './kitApi';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate } from '../teamController';

export const SWING = {
  /** The anchor offer: the feet within this of the near edge point (m, horizontal). */
  anchorReach: 0.8,
  /** The anchor offer: facing within 60 deg of the spot's yaw (cos). */
  faceCos: 0.5,
  /** The bar this high over the anchor's feet, offer and host (m; the A12 band 2.2-2.8 +-0.2 for the controller's
   *  2-4.5 cm rest gap and floor drift). */
  barLo: 2.0,
  barHi: 3.0,
  /** `swingOffer`: the anchor's move onto its stance (s). */
  grab: 0.4,
  /** The anchor's stance from the near edge point: back from the gap and to one side of the swing line (m, K4-1). */
  anchorBack: 0.6,
  anchorSide: 0.55,
  /** Host: the anchor's feet within this of the near edge point (m). */
  anchorHost: 1.2,
  /** The rider offer: within this of the anchor (m, horizontal). */
  riderReach: 1.5,
  /** The same floor (m). */
  up: 0.4,
  /** Host: its lagging view's reach over the page's (m). */
  hostSlack: 0.3,
  /** The gap band (the spot's `w`, m). */
  gapMin: 2.0,
  gapMax: 3.5,
  /** The far floor against the near floor and the claim's floor (m). */
  level: 0.4,
  /** The landing point this far past the far edge on the line (m). */
  landIn: 0.9,
  /** Host: the claim within this of the spot's landing point (m). */
  landTol: 0.75,
  /** The step-off point this far back from the near edge on the line (m). */
  stepBack: 0.35,
  /** The first part of `swingRide`: onto the step-off point, wrists locked; before its end the swing is not committed
   *  (s). */
  grip: 0.3,
  /** `swingRide` (s). */
  ride: 1.6,
  /** The feet's sag under the arc at mid-gap (m): the pendulum's low point. */
  dip: 0.6,
  /** The hands let go this far past the far edge (m). */
  releaseIn: 0.3,
  /** The feet this high over the far floor at the let-go (m). */
  releaseUp: 0.35,
  /** `swingRelease` (s). */
  release: 0.4,
  /** `swingHold` = ride + release (s). */
  hold: 2.0,
  /** The anchor frees itself this long after `hold` with no end heard (s). */
  holdGrace: 0.6,
  /** The rider's pending request (s). */
  askWait: 1.0,
  /** The body this far from where the move put it (m, horizontal) = moved by something else (a teleport). */
  shove: 0.6,
  /** Band helpers (A12 / A17, `swingSpotOk`): the bar over the floor (m) and the landing's depth (m). */
  bandBarLo: 2.2,
  bandBarHi: 2.8,
  bandLand: 0.75,
} as const;

/** `SwingDevice.user` for the local player (a mate's is their id). */
export const LOCAL_ANCHOR = '@local';

/** A Swing Pass spot's live device (`KitDevice` + its geometry). `y` is the bar's height, not a floor: never use
 *  `KitDevices.near` for it. */
export interface SwingDevice extends KitDevice {
  readonly kind: 'swingPass';
  /** The bar's height (= `y`). */
  readonly barY: number;
  /** The gap (m) and the far floor (absolute); NaN when the spot has none. */
  readonly gap: number;
  readonly farY: number;
  /** Unit forward across the gap (sin yaw, cos yaw). */
  readonly fx: number;
  readonly fz: number;
  /** The landing point: edge + forward x (gap + `landIn`). */
  readonly lx: number;
  readonly lz: number;
  /** False: the spot has no `w` / `y2` (listed, inert). */
  readonly ok: boolean;
}

export function isSwingDevice(d: { readonly kind: string }): d is SwingDevice {
  return d.kind === 'swingPass' && typeof (d as { barY?: unknown }).barY === 'number';
}

// ---- pure helpers (exported for tests; no allocation) ----

/** A point relative to the near edge point: `along` forward (< 0 behind the edge, `gap` at the far edge), `side`
 *  lateral ((cos yaw, -sin yaw), as `pullUp.ts` `topSpot`). */
export interface SwingLocal {
  along: number;
  side: number;
}

export function swingLocal(d: Pick<SwingDevice, 'x' | 'z' | 'fx' | 'fz'>, x: number, z: number, out: SwingLocal): SwingLocal {
  const dx = x - d.x;
  const dz = z - d.z;
  out.along = dx * d.fx + dz * d.fz;
  out.side = dx * d.fz - dz * d.fx;
  return out;
}

/**
 * A spot against the starting bands (A17: logged at setup; the offer and the host enforce the gap and the far floor):
 * '' fine, 'missing' no `w` / `y2`, 'gap' `w` outside `gapMin..gapMax`, 'bar' the bar over the far floor outside
 * `bandBarLo - level .. bandBarHi + level` (the near floor is unknown at setup: the far floor stands in).
 */
export function swingSpotOk(spot: KitSpot): '' | 'missing' | 'gap' | 'bar' {
  const S = SWING;
  if (spot.w === undefined || spot.y2 === undefined) return 'missing';
  if (spot.w < S.gapMin - 1e-6 || spot.w > S.gapMax + 1e-6) return 'gap';
  const bar = spot.y - spot.y2;
  if (bar < S.bandBarLo - S.level - 1e-6 || bar > S.bandBarHi + S.level + 1e-6) return 'bar';
  return '';
}

/** A spot's device (level load only). */
export function newSwingDevice(spot: KitSpot): SwingDevice {
  const why = swingSpotOk(spot);
  if (why === 'missing') console.warn(`swingPass: spot ${spot.id} misses w / y2: the spot is inert`);
  else if (why !== '') console.warn(`swingPass: spot ${spot.id} is outside the starting band (${why})`);
  const fx = Math.sin(spot.yaw);
  const fz = Math.cos(spot.yaw);
  const ok = why !== 'missing';
  const gap = spot.w ?? NaN;
  const far = ok ? gap + SWING.landIn : 0;
  return {
    id: spot.id,
    kind: 'swingPass',
    x: spot.x,
    y: spot.y,
    z: spot.z,
    yaw: spot.yaw,
    reach: SWING.anchorReach,
    open: 0,
    user: '',
    barY: spot.y,
    gap,
    farY: spot.y2 ?? NaN,
    fx,
    fz,
    lx: spot.x + fx * far,
    lz: spot.z + fz * far,
    ok,
  };
}

export interface SwingPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * The rider's feet at `k` = 0..1 of `swingRide`: with `kg = grip / ride`, up to `kg` from the start (`sx, sy, sz`) to
 * the step-off point (edge - forward x `stepBack`, feet `y0`); then, `u = (k - kg) / (1 - kg)`, horizontally from the
 * step-off point to the release point (edge + forward x (gap + `releaseIn`)), the feet `y0 + (y1 + releaseUp - y0) u
 * - dip sin(PI v)`, `v` = the along over the gap clamped 0..1 (the sag only over the gap: never under a slab).
 */
export function swingPath(k: number, sx: number, sy: number, sz: number, d: Pick<SwingDevice, 'x' | 'z' | 'fx' | 'fz' | 'gap'>, y0: number, y1: number, out: SwingPoint): SwingPoint {
  const S = SWING;
  const kg = S.grip / S.ride;
  const bx = d.x - d.fx * S.stepBack;
  const bz = d.z - d.fz * S.stepBack;
  if (k <= kg) {
    const e = kg > 0 ? Math.max(0, k) / kg : 1;
    out.x = sx + (bx - sx) * e;
    out.y = sy + (y0 - sy) * e;
    out.z = sz + (bz - sz) * e;
    return out;
  }
  const u = Math.min(1, (k - kg) / (1 - kg));
  const a0 = -S.stepBack;
  const a1 = d.gap + S.releaseIn;
  const along = a0 + (a1 - a0) * u;
  const v = d.gap > 0 ? Math.max(0, Math.min(1, along / d.gap)) : 0;
  out.x = d.x + d.fx * along;
  out.z = d.z + d.fz * along;
  out.y = y0 + (y1 + S.releaseUp - y0) * u - S.dip * Math.sin(Math.PI * v);
  return out;
}

/** The let-go at `u` = 0..1 of `swingRelease`: horizontally from the release point to the landing (`lx, lz`; the
 *  device's by default), the feet `y1 + releaseUp (1 - u^2)`. */
export function swingLand(u: number, d: Pick<SwingDevice, 'x' | 'z' | 'fx' | 'fz' | 'gap' | 'lx' | 'lz'>, y1: number, out: SwingPoint, lx = d.lx, lz = d.lz): SwingPoint {
  const S = SWING;
  const e = Math.max(0, Math.min(1, u));
  const a = d.gap + S.releaseIn;
  const rx = d.x + d.fx * a;
  const rz = d.z + d.fz * a;
  out.x = rx + (lx - rx) * e;
  out.z = rz + (lz - rz) * e;
  out.y = y1 + S.releaseUp * (1 - e * e);
  return out;
}

// ---- the move ----

export interface SwingRun {
  dev: SwingDevice | null;
  /** The device's spot index (the wire's `s` - 1). */
  idx: number;
  /** Anchor: the stance's side of the swing line (+1 / -1) and the stance. */
  side: number;
  stX: number;
  stZ: number;
  /** The run's start (feet). */
  sx: number;
  sy: number;
  sz: number;
  /** Anchor: seconds onto the stance (offer and hold, one clock). */
  gt: number;
  /** Rider: the near floor, the far floor (the claim's) and the landing (the claim). */
  y0: number;
  y1: number;
  lx: number;
  lz: number;
  /** Where the move put the body last step (horizontal; the "moved" check) and the override it set. */
  px: number;
  pz: number;
  ov: MoveOverride | null;
  /** Health at the last step (a drop = hurt). */
  hp: number;
  /** Rider: the pending request's clock (-1 none). */
  asked: number;
  /** Paired by the host's start; our end went out. */
  paired: boolean;
  sent: boolean;
  /** Scratch (no allocation per step). */
  readonly loc: SwingLocal;
  readonly pt: SwingPoint;
  /** The overrides (one object each, reused; `kinematic` is the controller's own vector type, cloned once). */
  readonly ovAnchor: MoveOverride;
  readonly ovRide: MoveOverride;
}

function newRun(): SwingRun {
  return {
    dev: null,
    idx: -1,
    side: 1,
    stX: 0,
    stZ: 0,
    sx: 0,
    sy: 0,
    sz: 0,
    gt: 0,
    y0: 0,
    y1: 0,
    lx: 0,
    lz: 0,
    px: 0,
    pz: 0,
    ov: null,
    hp: NaN,
    asked: -1,
    paired: false,
    sent: false,
    loc: { along: 0, side: 0 },
    pt: { x: 0, y: 0, z: 0 },
    ovAnchor: { yaw: 0, turnRate: 12, crouch: false },
    ovRide: { yaw: 0, turnRate: 12, crouch: false },
  };
}

/** A mate anchoring a Swing Pass (offering or holding): `brace` + the sub bit. */
function anchorMate(m: TeamMate): boolean {
  return m.mode === 'brace' && ((m.sub ?? 0) & SWING_SUB) !== 0;
}

function prompt(h: KitHost, text: string, x: number, y: number, z: number): void {
  h.prompt = text;
  h.promptAt.set(x, y, z);
}

function netEnd(h: KitHost, k: 'pull' | 'drop'): void {
  h.g.net?.teamHangEnd?.(k);
}

/** Our end to the host, once per run. */
function sendEnd(h: KitHost, run: SwingRun, k: 'pull' | 'drop'): void {
  if (run.sent) return;
  run.sent = true;
  netEnd(h, k);
}

/** Drive the body to feet (x, y, z) through `ov` (kinematic) and remember where it was put. */
function put(h: KitHost, run: SwingRun, ov: MoveOverride, x: number, y: number, z: number): void {
  const c = h.g.player.controller;
  if (!ov.kinematic) ov.kinematic = c.pos.clone();
  ov.kinematic.set(x, y, z);
  c.override = ov;
  run.ov = ov;
  run.px = x;
  run.pz = z;
}

/** K1-3 / K4-6: something else moved the body (a retry teleport) or replaced the override. */
function moved(h: KitHost, run: SwingRun): boolean {
  const c = h.g.player.controller;
  return c.override !== run.ov || hyp2(c.pos.x - run.px, c.pos.z - run.pz) > SWING.shove;
}

/** A mate anchors at device index `i` already. No allocation. */
function taken(h: KitHost, i: number): boolean {
  const ms = h.mates();
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (anchorMate(m) && Math.round(m.s ?? 0) === i + 1) return true;
  }
  return false;
}

/** The rider offer: an anchoring mate in reach at a usable swing device. */
function riderIdle(h: KitHost, run: SwingRun, coopPressed: boolean, free: boolean): boolean | null {
  const S = SWING;
  const c = h.g.player.controller;
  const list = h.devices.list;
  const ms = h.mates();
  for (let j = 0; j < ms.length; j++) {
    const m = ms[j]!;
    if (!anchorMate(m)) continue;
    const s = Math.round(m.s ?? 0);
    if (s < 1 || s > list.length) continue;
    const d0 = list[s - 1]!;
    if (!isSwingDevice(d0) || !d0.ok) continue;
    const d = d0;
    if (hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z) > S.riderReach || Math.abs(m.pos.y - c.pos.y) > S.up) continue;
    if (!free) return null;
    if (run.asked >= 0) {
      prompt(h, "Taking your partner's wrist...", c.pos.x, c.pos.y + 1.8, c.pos.z);
      return false;
    }
    prompt(h, 'Co-op: get swung across (swing pass)', c.pos.x, c.pos.y + 1.8, c.pos.z);
    if (!coopPressed) return false;
    // the page's own checks first: a polite refusal, no request
    if (d.gap > S.gapMax) h.refused('The gap is too wide to swing across');
    else if (d.gap < S.gapMin) h.refused('The gap is narrow enough to jump');
    else if (Math.abs(d.farY - c.pos.y) > S.level) h.refused('The far side is not level with this one');
    else {
      h.kitRequest('swingPass', m.id, s - 1, 0, d.farY, d.lx, d.lz);
      run.asked = 0;
    }
    return true;
  }
  return null;
}

/** The anchor offer: the nearest usable swing device's near edge, facing the gap, under the bar, not taken. */
function anchorIdle(h: KitHost, run: SwingRun, coopPressed: boolean): boolean | null {
  const S = SWING;
  const c = h.g.player.controller;
  const list = h.devices.list;
  let best: SwingDevice | null = null;
  let bi = -1;
  let bd = Infinity;
  for (let i = 0; i < list.length; i++) {
    const d0 = list[i]!;
    if (!isSwingDevice(d0) || !d0.ok) continue;
    const d = d0;
    const r = hyp2(d.x - c.pos.x, d.z - c.pos.z);
    const up = d.barY - c.pos.y;
    if (r > d.reach || r >= bd || up < S.barLo || up > S.barHi || Math.cos(c.yaw - d.yaw) < S.faceCos || taken(h, i)) continue;
    bd = r;
    best = d;
    bi = i;
  }
  if (!best) return null;
  const d = best;
  prompt(h, 'Co-op: brace on the pipe (swing pass)', d.x, d.barY - 0.3, d.z);
  if (!coopPressed) return false;
  swingLocal(d, c.pos.x, c.pos.z, run.loc);
  run.dev = d;
  run.idx = bi;
  run.side = run.loc.side < 0 ? -1 : 1;
  // the stance: back from the edge, to one side of the swing line (lateral = (fz, -fx))
  run.stX = d.x - d.fx * S.anchorBack + d.fz * S.anchorSide * run.side;
  run.stZ = d.z - d.fz * S.anchorBack - d.fx * S.anchorSide * run.side;
  run.sx = c.pos.x;
  run.sy = c.pos.y;
  run.sz = c.pos.z;
  run.gt = 0;
  run.hp = h.health();
  run.paired = false;
  run.sent = false;
  run.ovAnchor.yaw = d.yaw;
  d.user = LOCAL_ANCHOR;
  h.partner = '';
  h.state = 'swingOffer';
  h.t = 0;
  h.count.offers++;
  put(h, run, run.ovAnchor, c.pos.x, c.pos.y, c.pos.z);
  return true;
}

/** The host's rule (the shared rate / alive / self checks and the id gate are done, K0). No allocation. */
export function checkSwing(r: TeamRequest): TeamDenial | null {
  const S = SWING;
  const d = r.spot;
  if (!d || !isSwingDevice(d) || !d.ok) return 'noTarget';
  const a = r.a;
  const b = r.b;
  if (b.mode !== 'brace' || ((b.sub ?? 0) & SWING_SUB) === 0 || Math.round(b.s ?? 0) !== r.target + 1) return 'notOffering';
  if (a.mode !== 'ground') return 'busy';
  if (Math.abs(a.y - b.y) > S.up || hyp2(a.x - b.x, a.z - b.z) > S.riderReach + S.hostSlack || hyp2(b.x - d.x, b.z - d.z) > S.anchorHost) return 'far';
  const bar = d.barY - b.y;
  if (bar < S.barLo || bar > S.barHi) return 'noTarget';
  if (!(d.gap >= S.gapMin && d.gap <= S.gapMax)) return 'noTarget';
  if (!(Math.abs(d.farY - b.y) <= S.level)) return 'noTarget';
  const l = r.land;
  if (!l || hyp2(l.x - d.lx, l.z - d.lz) > S.landTol || !(Math.abs(l.y - d.farY) <= S.level)) return 'noTarget';
  return null;
}

/** The anchor's feet: eased from the start onto the stance over `grab` (smoothstep), then held there. */
function anchorPut(h: KitHost, run: SwingRun, dt: number): void {
  run.gt += dt;
  const k = Math.min(1, run.gt / SWING.grab);
  const e = k * k * (3 - 2 * k);
  put(h, run, run.ovAnchor, run.sx + (run.stX - run.sx) * e, run.sy, run.sz + (run.stZ - run.sz) * e);
}

function anchorStep(h: KitHost, run: SwingRun, d: SwingDevice, dt: number, bPressed: boolean): void {
  const hp = h.health();
  const hurt = hp < run.hp;
  if (!Number.isNaN(hp)) run.hp = hp;
  anchorPut(h, run, dt);
  if (h.state === 'swingOffer') {
    prompt(h, 'Braced on the pipe: B lets go', d.x, d.barY - 0.3, d.z);
    if (bPressed || hurt) {
      h.endWhy = hurt ? 'swing: hurt' : '';
      h.end(false);
    }
    return;
  }
  // swingHold: the arm on its own clock, matched to the rider's by the shared start
  h.prompt = null;
  if (h.t < SWING.grip) {
    // K4-3: before the step-off a let-go or a hit stops it (the swing does not start)
    if (bPressed || hurt) {
      h.endWhy = hurt ? 'swing: hurt' : 'swing: let go';
      sendEnd(h, run, 'drop');
      h.end(true);
    }
    return;
  }
  if (h.t >= SWING.hold + SWING.holdGrace) {
    // no end heard: free (sends nothing; the host's pair lapses on its time)
    h.endWhy = 'swing: no end heard';
    h.end(false);
  }
}

function riderStep(h: KitHost, run: SwingRun, d: SwingDevice): void {
  const S = SWING;
  const g = h.g;
  const c = g.player.controller;
  h.prompt = null;
  if (h.state === 'swingRide') {
    const k = Math.min(1, h.t / S.ride);
    const p = swingPath(k, run.sx, run.sy, run.sz, d, run.y0, run.y1, run.pt);
    put(h, run, run.ovRide, p.x, p.y, p.z);
    g.player.pose.traverse = 'vault';
    g.player.pose.traverseT = k;
    if (h.t >= S.ride) {
      run.ovRide.crouch = true;
      h.state = 'swingRelease';
      h.t = 0;
    }
    return;
  }
  // swingRelease: let go, land crouched on the claimed landing
  const u = Math.min(1, h.t / S.release);
  const p = swingLand(u, d, run.y1, run.pt, run.lx, run.lz);
  put(h, run, run.ovRide, p.x, p.y, p.z);
  g.player.pose.traverse = 'vault';
  g.player.pose.traverseT = u;
  if (h.t >= S.release) {
    put(h, run, run.ovRide, run.lx, run.y1, run.lz);
    sendEnd(h, run, 'pull');
    c.setCrouchToggle();
    h.endWhy = '';
    h.end(false);
  }
}

function isAnchorState(state: string): boolean {
  return state === 'swingOffer' || state === 'swingHold';
}

export const SWING_MOVE: KitMove<SwingRun> = {
  kind: 'swingPass',
  times: { swingRide: SWING.ride, swingRelease: SWING.release, swingHold: SWING.hold },
  paired: true,
  claimsPoint: true,
  // a hand on the bar: weapons and interact off while offering
  busyOffer: true,
  newRun,
  check: checkSwing,

  tick(_h, run, dt) {
    if (run.asked >= 0 && (run.asked += dt) > SWING.askWait) run.asked = -1;
  },

  idle(h, run, coopPressed, free) {
    if (!flags.kitMoves.has('swingPass')) return null;
    const ride = riderIdle(h, run, coopPressed, free);
    if (ride !== null) return ride;
    return free ? anchorIdle(h, run, coopPressed) : null;
  },

  begin(h, run, s, self) {
    const c = h.g.player.controller;
    if (s.b === self) {
      if (h.state !== 'swingOffer' || !run.dev) {
        // let go meanwhile: the host's pair ends at once (the rider stays on the near side), we stay as we are
        h.endWhy = 'swing: not offering';
        netEnd(h, 'drop');
        return;
      }
      h.partner = s.a;
      h.state = 'swingHold';
      h.t = 0;
      run.paired = true;
      run.sent = false;
      return;
    }
    run.asked = -1;
    const d0 = s.target >= 0 ? h.devices.list[s.target] : undefined;
    const l = s.l;
    if (!d0 || !isSwingDevice(d0) || !d0.ok || !l) {
      h.endWhy = 'swing: no device';
      h.end(true);
      return;
    }
    run.dev = d0;
    run.idx = s.target;
    run.sx = c.pos.x;
    run.sy = c.pos.y;
    run.sz = c.pos.z;
    run.y0 = c.pos.y;
    run.y1 = l[1];
    run.lx = l[0];
    run.lz = l[2];
    run.hp = h.health();
    run.paired = true;
    run.sent = false;
    run.ovRide.yaw = d0.yaw;
    run.ovRide.crouch = false;
    h.partner = s.b;
    h.state = 'swingRide';
    h.t = 0;
    put(h, run, run.ovRide, c.pos.x, c.pos.y, c.pos.z);
  },

  step(h, run, dt, _coopPressed, bPressed) {
    h.t += dt;
    const d = run.dev;
    if (!d) {
      h.endWhy = 'swing: no device';
      h.end(true);
      return;
    }
    if (moved(h, run)) {
      h.endWhy = 'swing: moved';
      h.end(true);
      return;
    }
    // B never toggles the crouch while the move holds the body (the rider lands crouched)
    if (bPressed) h.g.player.controller.swallowCrouch = true;
    if (isAnchorState(h.state)) anchorStep(h, run, d, dt, bPressed);
    else riderStep(h, run, d);
  },

  ended(h, run, k) {
    if (isAnchorState(h.state)) {
      // the landing ('pull'), a drop or a plain end: free
      run.sent = true;
      h.end(false);
      return;
    }
    // the rider: the anchor's 'drop' (or an end) before the step-off stops it where it stands; after it, committed
    if (h.state === 'swingRide' && h.t < SWING.grip && k !== 'pull') {
      h.endWhy = 'swing: anchor let go';
      run.sent = true;
      h.end(true);
    }
  },

  end(h, run) {
    const d = run.dev;
    if (isAnchorState(h.state)) {
      if (d && d.user === LOCAL_ANCHOR) d.user = '';
      // a paired anchor before the step-off that has not said so: the swing does not start (K4-3)
      if (h.state === 'swingHold' && run.paired && h.t < SWING.grip) sendEnd(h, run, 'drop');
    } else {
      const p = h.g.player.pose;
      if (p.traverse === 'vault') p.traverse = 'none';
    }
    const c = h.g.player.controller;
    if (run.ov && c.override === run.ov) c.override = null;
    run.ovRide.crouch = false;
    run.dev = null;
    run.ov = null;
    run.asked = -1;
    run.paired = false;
  },

  wireS(_h, run) {
    return run.dev ? run.idx + 1 : 0;
  },

  setupDevices(_h, run, devices: KitDevices, level) {
    run.dev = null;
    run.ov = null;
    run.asked = -1;
    const spots = kitSpotsOf(level, 'swingPass');
    for (let i = 0; i < spots.length; i++) devices.add(newSwingDevice(spots[i]!));
  },
};

KIT_PAIR.swingPass = { pairS: SWING.ride + SWING.release + 3, doneBy: 'a' };
registerKitMove(SWING_MOVE);
