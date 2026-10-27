/**
 * (coop-kit K3, PLAN Part 2 "Chimney Pair") Michael's SIGNOFF row: "Both brace back to back in a narrow shaft and climb
 * it together." Two climbers back to back in a 1.2-1.6 m shaft, each pushing the feet and hands on the wall in front,
 * moving in turn; slow. Pure and Babylon-free except the run's kinematic vector (`c.pos.clone()` once per run, as
 * `shutter.ts`); registered with the kit registry at load (teamController's glob loads it).
 *
 * Spot (`addKitSpot`, `kind 'chimneyPair'`): (`x`, `y`, `z`) the shaft floor's centre, `yaw` across it toward the exit
 * wall (across = (sin yaw, cos yaw)), `w` its width, `h` the exit lip over the floor, (`x2`, `z2`) a point on the exit
 * lip. The shaft runs `spotHalf` m either way along from (`x`, `z`) (K3-8). Bands (A12 "Not yet", M3: move constants,
 * logged at setup by `chimneySpotOk`, not enforced, A17): width 1.2-1.6 m, height 3-8 m, the exit beyond the wall face.
 * One `ChimneyDevice` per spot, added for every spot whatever `flags.kitMoves` says (the wire's spot index must match on
 * every page, k0-CHECK-B polish 3); only the offers, the host's rule and the no-split switch read the id. Marked spots
 * only (lead, Doubt 3): no free chimney found by rays until Michael walks it (K3-6 dropped).
 *
 * Offerer (role b, wire `brace` + `CHIMNEY_SUB`): in a spot's shaft, Co-op -> `chimneyOffer` (back to the centre line,
 * facing a wall; B / Co-op / `TEAM.offerTime` lets go) -> the host's start -> `chimneyBrace` (`brace` s) ->
 * `chimneyClimb` (held) -> `chimneyTop` (`top` s, out onto the exit lip) -> free.
 * Joiner (role a, wire `boost` + `CHIMNEY_SUB`): in the same shaft within `joinReach` of an offering mate, Co-op ->
 * `kitRequest` (target = the spot index) -> the host's start -> `chimneyPush` (the brace) -> `chimneyRise` ->
 * `chimneyOut` -> free. `chimneyJoin` is unused (K3-5, K5a's `plankJoin` precedent).
 * Climb: each page moves its own body on its own stick (`climb` m/s up and down), never more than `lead` m above or
 * below the partner's height as last seen (K3-2: both ways), so the pair goes at the slower stick with no new message.
 * Down to the floor with the stick held down: the step off (end 'drop'). Let go (B / Co-op), hit, partner lost or ended:
 * both slide down at `TEAM.ropeDown` and stand (end 'drop'). The top-out is committed (K3-3): a let-go then is ignored.
 * Moved by something else (K1-3: a retry teleport, another override): ends at once (end 'drop'); no `reset` hook on
 * this base (K5b's).
 *
 * The host's rule (`checkChimney`, K3-9: the host trusts the MoveState heights and the claimed spot box): the id on, b
 * offering (`brace` + 256, `s` < 0) with -s in the width band, a on the ground, same floor, within reach, both inside
 * the spot's box (`hostSlack`); a request with no chimney spot is refused (spots only). Paired, no claimed point.
 * Done (`doneBy 'a'`, K3-3): a ends free after its own top-out and sends 'pull' once b's top-out is seen (at once when it
 * already was; else a done watch in `tick`), so neither waits on the lip; the host relays it and calls
 * `kitDone('chimneyPair', spot, a, b)`.
 * Wire `s` (K3-1): `chimneyOffer` -w (the sign tells an offer from a height), brace states 0, climb states the height
 * over the start floor (also while sliding), top states `h` (always over the climb's top + 0.5: "topping out").
 * No split jump inside a spot's shaft while the id is on (K3-7, `splitJump.ts` `setNoSplit`, switched in `tick`).
 * Local pose (placeholders, K0's `KIT_POSE_PLACEHOLDER`): brace states 'brace', climb states 'climb' (the rope's
 * hand-over-hand cycle by height), top states 'climbUp' at k. Numbers are starting values (G10, A17).
 */
import { hyp2 } from '../../core/mathx';
import { flags } from '../../core/flags';
import { TEAM } from '../../config/movement';
import { setNoSplit, type NoSplitBox } from '../../player/splitJump';
import { CHIMNEY_SUB, ROPE_TOP_PATH, ropeTopPath, type TeamDenial, type TeamRequest } from '../teamMoves';
import { ctxText } from '../contextPrompts';
import { registerKitMove, type KitDevice, type KitDevices, type KitHost, type KitMove } from './registry';
import { KIT_PAIR, kitSpotIndex, kitSpotsOf, type KitSpot } from './kitApi';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate } from '../teamController';

export const CHIMNEY = {
  /** The shaft's width band (m; Marlow's A5 gap 1.4). */
  minW: 1.2,
  maxW: 1.6,
  /** The exit lip over the shaft floor (m). */
  minH: 3.0,
  maxH: 8.0,
  /** A spot's shaft half length along (m; KitSpot has no length field, K3-8). */
  spotHalf: 3.0,
  /** Kept in from a spot's walls (m). */
  edge: 0.1,
  /** The same floor (m). */
  up: 0.4,
  /** The joiner within this of the offerer (m, PLAN). */
  joinReach: 1.5,
  /** The host's lagging view of both (m). */
  hostSlack: 0.3,
  /** Each body's root off the centre line toward its own wall (m): backs together. */
  back: 0.15,
  /** The offer's ease onto the line (s). */
  offerSnap: 0.3,
  /** `chimneyBrace` / `chimneyPush`: back to back, feet up onto the own wall (s). */
  brace: 1.0,
  /** Climb speed, up and down (m/s). */
  climb: 0.35,
  /** Never more than this above or below the partner's height as last seen (m). */
  lead: 0.15,
  /** The feet this far under the lip when the hands reach it (m; the climb's top = h - this, as `ropeTopY`). */
  topReach: 1.5,
  /** `chimneyTop` / `chimneyOut`: out onto the exit lip (s). */
  top: 1.2,
  /** Each climber's exit point off the pair's line along the shaft (m; b +, a -; K3-4). */
  outSep: 0.35,
  /** Turn rate to the own wall / the exit (rad/s). */
  turnRate: 6,
  /** The partner not seen in the move this long (s) = lost: the slide. */
  lostGrace: 0.5,
  /** The join request's wait for the start (s). */
  askWait: 1.0,
  /** The stick held down this far at the floor = step off. */
  stepOffY: -0.5,
  /** The body this far from where the move put it (m, horizontal plus vertical) = moved by something else (K1-3). */
  shove: 0.6,
  /** The done watch gives up after this (s). */
  watchMax: 30,
  /** The host's pair time (s): a long climb with pauses. */
  pairS: 600,
} as const;

/** The no-split box's margin past a spot's shaft (m, K3-7). */
const NO_SPLIT_PAD = 0.2;

// ---- the shaft ----

/** A shaft as the move uses it (one preallocated per run). */
export interface ChimneyShaft {
  /** The centre line point at the pair's along. */
  cx: number;
  cz: number;
  /** Across, pointing to the EXIT wall; along = (uz, -ux). */
  ux: number;
  uz: number;
  tx: number;
  tz: number;
  w: number;
  /** The floor (y) and the exit lip over it (m). */
  floor: number;
  h: number;
  /** The exit point across from the centre line (m, > w / 2). */
  ex: number;
  /** The along half length and the centre's offset along from the spot point (m). */
  half: number;
  along: number;
  /** The spot id. */
  id: string;
}

export function newShaft(): ChimneyShaft {
  return { cx: 0, cz: 0, ux: 0, uz: 1, tx: 1, tz: 0, w: 0, floor: 0, h: 0, ex: 0, half: 0, along: 0, id: '' };
}

/** A Chimney Pair spot's live device (`KitDevice` + its shaft). */
export interface ChimneyDevice extends KitDevice {
  readonly kind: 'chimneyPair';
  readonly w: number;
  readonly h: number;
  readonly x2: number;
  readonly z2: number;
  readonly half: number;
  /** Across (to the exit wall) and along. */
  readonly ux: number;
  readonly uz: number;
  readonly tx: number;
  readonly tz: number;
  /** False: the spot misses a field (inert: lists, offers nothing). */
  readonly ok: boolean;
}

export function isChimneyDevice(d: { readonly kind: string }): d is ChimneyDevice {
  return d.kind === 'chimneyPair';
}

/**
 * A spot against the starting bands (A17: logged, not enforced): '' fine, 'fields' (w / h / x2 / z2 missing), 'width'
 * (w outside minW..maxW), 'height' (h outside minH..maxH), 'exit' (the exit point not beyond the shaft's half width).
 */
export function chimneySpotOk(spot: KitSpot): '' | 'fields' | 'width' | 'height' | 'exit' {
  const C = CHIMNEY;
  if (spot.w === undefined || spot.h === undefined || spot.x2 === undefined || spot.z2 === undefined) return 'fields';
  if (spot.w < C.minW - 1e-6 || spot.w > C.maxW + 1e-6) return 'width';
  if (spot.h < C.minH - 1e-6 || spot.h > C.maxH + 1e-6) return 'height';
  const ex = (spot.x2 - spot.x) * Math.sin(spot.yaw) + (spot.z2 - spot.z) * Math.cos(spot.yaw);
  return ex <= spot.w / 2 ? 'exit' : '';
}

/** A spot's device (level load only). */
export function newChimneyDevice(spot: KitSpot): ChimneyDevice {
  const why = chimneySpotOk(spot);
  if (why === 'fields') console.warn(`chimneyPair: spot ${spot.id} misses w / h / x2 / z2: the spot is inert`);
  else if (why !== '') console.warn(`chimneyPair: spot ${spot.id} is outside the starting band (${why})`);
  const ux = Math.sin(spot.yaw);
  const uz = Math.cos(spot.yaw);
  return {
    id: spot.id,
    kind: 'chimneyPair',
    x: spot.x,
    y: spot.y,
    z: spot.z,
    yaw: spot.yaw,
    reach: CHIMNEY.spotHalf,
    open: 0,
    user: '',
    w: spot.w ?? 0,
    h: spot.h ?? 0,
    x2: spot.x2 ?? spot.x,
    z2: spot.z2 ?? spot.z,
    half: CHIMNEY.spotHalf,
    ux,
    uz,
    tx: uz,
    tz: -ux,
    ok: why !== 'fields',
  };
}

/** The shaft of device `d` at the along of (px, pz) (clamped `half - 0.4` from its ends). No allocation. */
export function spotShaft(d: ChimneyDevice, px: number, pz: number, out: ChimneyShaft): ChimneyShaft {
  const lim = Math.max(0, d.half - 0.4);
  const along = Math.max(-lim, Math.min(lim, (px - d.x) * d.tx + (pz - d.z) * d.tz));
  out.ux = d.ux;
  out.uz = d.uz;
  out.tx = d.tx;
  out.tz = d.tz;
  out.cx = d.x + d.tx * along;
  out.cz = d.z + d.tz * along;
  out.along = along;
  out.w = d.w;
  out.h = d.h;
  out.floor = d.y;
  out.half = d.half;
  out.ex = (d.x2 - d.x) * d.ux + (d.z2 - d.z) * d.uz;
  out.id = d.id;
  return out;
}

/** Feet (x, y, z) inside the spot's shaft box (`slack` m wider). No allocation. */
export function inSpot(d: ChimneyDevice, x: number, y: number, z: number, slack: number): boolean {
  const dx = x - d.x;
  const dz = z - d.z;
  return (
    Math.abs(dx * d.ux + dz * d.uz) <= d.w / 2 - CHIMNEY.edge + slack &&
    Math.abs(dx * d.tx + dz * d.tz) <= d.half + slack &&
    Math.abs(y - d.y) <= CHIMNEY.up
  );
}

// ---- the move ----

export interface ChimneyRun {
  dev: ChimneyDevice | null;
  readonly shaft: ChimneyShaft;
  /** +1 faces the exit wall, -1 the other. */
  side: number;
  /** The pin point P (on the floor line), the start point (feet). */
  px: number;
  pz: number;
  sx: number;
  sy: number;
  sz: number;
  /** The own feet y at the start; the height over it; the last climb speed; the top-out's starting slope. */
  floor: number;
  y: number;
  vy: number;
  m0: number;
  readonly path: { rise: number; across: number };
  /** Health at the last step (a drop = hurt). */
  hp: number;
  /** Paired by the host; our end went out (or none is owed); sliding down; the partner seen topping out. */
  paired: boolean;
  sent: boolean;
  slide: boolean;
  partnerOut: boolean;
  /** The partner not seen in the move this long (s); the join request's clock (-1 = none). */
  lostT: number;
  asked: number;
  /** a's done watch (K3-3): armed, the partner's id, its clock, the partner unseen this long, the climb's top. */
  watch: boolean;
  watchId: string;
  watchT: number;
  watchLost: number;
  topY: number;
  /** Where the move put the body last step (the "moved" check) and the override it set. */
  putX: number;
  putY: number;
  putZ: number;
  ov: MoveOverride | null;
  readonly ovKin: MoveOverride;
  /** The level's no-split boxes (one per usable spot) and the switch's last state. */
  readonly noSplit: NoSplitBox[];
  nsOn: boolean;
  nsDirty: boolean;
}

function newRun(): ChimneyRun {
  return {
    dev: null,
    shaft: newShaft(),
    side: 1,
    px: 0,
    pz: 0,
    sx: 0,
    sy: 0,
    sz: 0,
    floor: 0,
    y: 0,
    vy: 0,
    m0: 0,
    path: { rise: 0, across: 0 },
    hp: NaN,
    paired: false,
    sent: false,
    slide: false,
    partnerOut: false,
    lostT: 0,
    asked: -1,
    watch: false,
    watchId: '',
    watchT: 0,
    watchLost: 0,
    topY: 0,
    putX: 0,
    putY: 0,
    putZ: 0,
    ov: null,
    ovKin: { yaw: 0, turnRate: CHIMNEY.turnRate, crouch: false },
    noSplit: [],
    nsOn: false,
    nsDirty: true,
  };
}

const EMPTY: readonly NoSplitBox[] = [];

function isBrace(state: string): boolean {
  return state === 'chimneyBrace' || state === 'chimneyPush';
}

function isTop(state: string): boolean {
  return state === 'chimneyTop' || state === 'chimneyOut';
}

/** A mate in the Chimney Pair move (either role). */
function chimneyMate(m: TeamMate): boolean {
  return (m.mode === 'brace' || m.mode === 'boost') && ((m.sub ?? 0) & CHIMNEY_SUB) !== 0;
}

/** A mate offering a chimney (its `s` is -width; a height is never negative). */
function offeringMate(m: TeamMate): boolean {
  return m.mode === 'brace' && ((m.sub ?? 0) & CHIMNEY_SUB) !== 0 && (m.s ?? 0) < 0;
}

function mateIn(h: KitHost, id: string): TeamMate | null {
  const ms = h.mates();
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i]!;
    if (m.id === id && chimneyMate(m)) return m;
  }
  return null;
}

function prompt(h: KitHost, text: string): void {
  const c = h.g.player.controller;
  h.prompt = text;
  h.promptAt.set(c.pos.x, c.pos.y + 1.8, c.pos.z);
}

function netEnd(h: KitHost, k: 'pull' | 'drop'): void {
  h.g.net?.teamHangEnd?.(k);
}

/** Our 'drop' to the host, once per run. */
function sendDrop(h: KitHost, run: ChimneyRun): void {
  if (run.sent) return;
  run.sent = true;
  netEnd(h, 'drop');
}

/** The usable chimney device whose box holds (x, y, z); null none. */
function deviceAt(h: KitHost, x: number, y: number, z: number, slack: number): ChimneyDevice | null {
  const list = h.devices.list;
  for (let i = 0; i < list.length; i++) {
    const d = list[i]!;
    if (isChimneyDevice(d) && d.ok && inSpot(d, x, y, z, slack)) return d;
  }
  return null;
}

/** The pin point from the shaft and the side. */
function pinPoint(run: ChimneyRun): void {
  const s = run.shaft;
  run.px = s.cx + s.ux * run.side * CHIMNEY.back;
  run.pz = s.cz + s.uz * run.side * CHIMNEY.back;
}

/** Facing the own wall. */
function wallYaw(run: ChimneyRun): number {
  return Math.atan2(run.side * run.shaft.ux, run.side * run.shaft.uz);
}

/** Drive the body to feet (x, y, z) facing `yaw` (kinematic) and remember where it was put. */
function put(h: KitHost, run: ChimneyRun, x: number, y: number, z: number, yaw: number): void {
  const c = h.g.player.controller;
  const ov = run.ovKin;
  if (!ov.kinematic) ov.kinematic = c.pos.clone();
  ov.kinematic.set(x, y, z);
  ov.yaw = yaw;
  c.override = ov;
  run.ov = ov;
  run.putX = x;
  run.putY = y;
  run.putZ = z;
}

/** K1-3: something else moved the body (a retry teleport) or replaced the override. */
function moved(h: KitHost, run: ChimneyRun): boolean {
  const c = h.g.player.controller;
  return c.override !== run.ov || hyp2(c.pos.x - run.putX, c.pos.z - run.putZ) + Math.abs(c.pos.y - run.putY) > CHIMNEY.shove;
}

function pose(h: KitHost, traverse: 'brace' | 'climb' | 'climbUp', t: number): void {
  const p = h.g.player.pose;
  p.traverse = traverse;
  p.traverseT = t;
}

function startSlide(h: KitHost, run: ChimneyRun, why: string): void {
  if (!run.slide) h.endWhy = why;
  run.slide = true;
  sendDrop(h, run);
}

/** The join: a mate offering in a spot's shaft that also holds us. */
function joinIdle(h: KitHost, run: ChimneyRun, coopPressed: boolean, free: boolean): boolean | null {
  const c = h.g.player.controller;
  const ms = h.mates();
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i]!;
    if (!offeringMate(m)) continue;
    if (hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z) > CHIMNEY.joinReach || Math.abs(m.pos.y - c.pos.y) > CHIMNEY.up) continue;
    const d = deviceAt(h, m.pos.x, m.pos.y, m.pos.z, CHIMNEY.hostSlack);
    if (!d || !inSpot(d, c.pos.x, c.pos.y, c.pos.z, 0)) continue;
    if (!free) return null;
    if (run.asked >= 0) {
      prompt(h, 'Bracing...');
      return false;
    }
    prompt(h, ctxText('Co-op: climb the shaft back to back (chimney pair)', 'Chimney climb'));
    if (!coopPressed) return false;
    run.asked = 0;
    h.kitRequest('chimneyPair', m.id, kitSpotIndex(h.devices.list, d.id), 0, c.pos.y);
    return true;
  }
  return null;
}

/** The offer: in a spot's shaft, brace for the partner. */
function offerIdle(h: KitHost, run: ChimneyRun, coopPressed: boolean): boolean | null {
  const c = h.g.player.controller;
  const d = deviceAt(h, c.pos.x, c.pos.y, c.pos.z, 0);
  if (!d) return null;
  prompt(h, ctxText('Co-op: brace for a chimney climb (chimney pair)', 'Brace for a chimney climb'));
  if (!coopPressed) return false;
  spotShaft(d, c.pos.x, c.pos.z, run.shaft);
  run.dev = d;
  run.side = Math.sin(c.yaw) * d.ux + Math.cos(c.yaw) * d.uz < 0 ? -1 : 1;
  pinPoint(run);
  run.sx = c.pos.x;
  run.sy = c.pos.y;
  run.sz = c.pos.z;
  run.floor = c.pos.y;
  run.y = 0;
  run.hp = h.health();
  run.paired = run.sent = run.slide = run.partnerOut = false;
  h.partner = '';
  h.state = 'chimneyOffer';
  h.t = 0;
  h.count.offers++;
  put(h, run, c.pos.x, c.pos.y, c.pos.z, wallYaw(run));
  return true;
}

/** The host's rule (the shared rate / alive / self checks and the id gate are done). */
export function checkChimney(r: TeamRequest): TeamDenial | null {
  const C = CHIMNEY;
  if (!flags.kitMoves.has('chimneyPair')) return 'notOffering';
  const a = r.a;
  const b = r.b;
  const bs = b.s ?? 0;
  if (b.mode !== 'brace' || ((b.sub ?? 0) & CHIMNEY_SUB) === 0 || !(bs < 0)) return 'notOffering';
  if (-bs < C.minW - 0.02 || -bs > C.maxW + 0.02) return 'notBraced';
  if (a.mode !== 'ground') return 'busy';
  if (Math.abs(a.y - b.y) > C.up || hyp2(a.x - b.x, a.z - b.z) > C.joinReach + C.hostSlack) return 'far';
  // marked spots only (lead, Doubt 3): a request without a chimney spot is not a chimney here
  const sp = r.spot;
  if (!sp || !isChimneyDevice(sp)) return 'noTarget';
  if (!inSpot(sp, a.x, a.y, a.z, C.hostSlack) || !inSpot(sp, b.x, b.y, b.z, C.hostSlack)) return 'far';
  return null;
}

function offerStep(h: KitHost, run: ChimneyRun, coopPressed: boolean, bPressed: boolean): void {
  const c = h.g.player.controller;
  if (moved(h, run)) {
    h.endWhy = 'chimney: moved';
    h.end(false);
    return;
  }
  const k = Math.min(1, h.t / CHIMNEY.offerSnap);
  put(h, run, run.sx + (run.px - run.sx) * k, run.floor, run.sz + (run.pz - run.sz) * k, wallYaw(run));
  pose(h, 'brace', 0);
  prompt(h, ctxText('Braced in the shaft: your partner presses Co-op (B lets go)', 'Braced\nwaiting for your partner'));
  if (bPressed || coopPressed || h.t > TEAM.offerTime) {
    c.swallowCrouch = bPressed;
    h.end(false);
  }
}

function braceStep(h: KitHost, run: ChimneyRun, coopPressed: boolean, bPressed: boolean): void {
  const c = h.g.player.controller;
  if (run.slide) {
    h.end(false);
    return;
  }
  const k = Math.min(1, h.t / CHIMNEY.brace);
  const e = k * k * (3 - 2 * k);
  put(h, run, run.sx + (run.px - run.sx) * e, run.sy + (run.floor - run.sy) * e, run.sz + (run.pz - run.sz) * e, wallYaw(run));
  pose(h, 'brace', 0);
  h.prompt = null;
  if (bPressed || coopPressed) {
    if (bPressed) c.swallowCrouch = true;
    h.endWhy = 'chimney: let go';
    sendDrop(h, run);
    h.end(false);
    return;
  }
  if (k >= 1) {
    h.state = h.state === 'chimneyBrace' ? 'chimneyClimb' : 'chimneyRise';
    h.t = 0;
  }
}

function slideStep(h: KitHost, run: ChimneyRun, dt: number): void {
  run.y = Math.max(0, run.y - TEAM.ropeDown * dt);
  put(h, run, run.px, run.floor + run.y, run.pz, wallYaw(run));
  pose(h, 'climb', 0);
  h.prompt = null;
  if (run.y <= 0) h.end(false);
}

function climbStep(h: KitHost, run: ChimneyRun, dt: number, coopPressed: boolean, bPressed: boolean, moveY: number): void {
  const C = CHIMNEY;
  const c = h.g.player.controller;
  const top = run.topY;
  // the partner's height as last seen (a negative `s` is its stale offer); topping out lifts the cap for good
  const m = mateIn(h, h.partner);
  let ps = NaN;
  if (m) {
    const s = m.s ?? 0;
    if (s > top + 0.5) run.partnerOut = true;
    ps = Math.max(0, s);
    run.lostT = 0;
  } else if (!run.partnerOut) {
    run.lostT += dt;
    if (run.lostT > C.lostGrace) startSlide(h, run, 'chimney: partner lost');
  }
  if (!run.slide && (bPressed || coopPressed)) {
    if (bPressed) c.swallowCrouch = true;
    startSlide(h, run, 'chimney: let go');
  }
  if (run.slide) {
    slideStep(h, run, dt);
    return;
  }
  const v = moveY * C.climb;
  let ny = Math.max(0, Math.min(top, run.y + v * dt));
  let wait = false;
  if (!run.partnerOut && !Number.isNaN(ps)) {
    // K3-2: the lead cap both ways; the clamp's own change is speed limited (no snap when the band moves)
    const lo = ps - C.lead;
    const hi = ps + C.lead;
    wait = (v > 0 && ny > hi) || (v < 0 && ny < lo);
    const cy = Math.max(lo, Math.min(hi, ny));
    const lim = Math.max(C.climb, TEAM.ropeDown) * dt;
    ny = Math.max(0, Math.min(top, run.y + Math.max(-lim, Math.min(lim, cy - run.y))));
  }
  run.vy = (ny - run.y) / dt;
  run.y = ny;
  put(h, run, run.px, run.floor + run.y, run.pz, wallYaw(run));
  pose(h, 'climb', (((run.y / 0.7) % 1) + 1) % 1);
  prompt(h, wait ? 'Wait for your partner' : ctxText('Chimney climb: stick up or down together (B lets go)', 'Chimney climb\nstick up or down together'));
  if (run.y <= 0 && moveY <= C.stepOffY) {
    // the step off at the floor
    h.endWhy = 'chimney: stepped off';
    sendDrop(h, run);
    h.end(false);
    return;
  }
  if (run.y >= top - 1e-3) {
    h.state = h.state === 'chimneyClimb' ? 'chimneyTop' : 'chimneyOut';
    h.t = 0;
    const rise = run.shaft.h - top;
    run.m0 = run.vy > 0 && rise > 0.05 ? (run.vy * ROPE_TOP_PATH.riseEnd * C.top) / rise : 0;
  }
}

function topStep(h: KitHost, run: ChimneyRun): void {
  const C = CHIMNEY;
  const s = run.shaft;
  const b = h.state === 'chimneyTop';
  const m = mateIn(h, h.partner);
  if (m && (m.s ?? 0) > run.topY + 0.5) run.partnerOut = true;
  const k = Math.min(1, h.t / C.top);
  const p = ropeTopPath(k, run.m0, run.path);
  const off = C.outSep * (b ? 1 : -1);
  const ex = s.cx + s.ux * s.ex + s.tx * off;
  const ez = s.cz + s.uz * s.ex + s.tz * off;
  const y0 = run.floor + run.topY;
  put(h, run, run.px + (ex - run.px) * p.across, y0 + (run.floor + s.h - y0) * p.rise, run.pz + (ez - run.pz) * p.across, Math.atan2(s.ux, s.uz));
  pose(h, 'climbUp', k);
  h.prompt = null;
  if (k < 1) return;
  run.sent = true;
  h.endWhy = '';
  if (!b) {
    // a: done once b's top-out is seen (now, or by the done watch)
    if (run.partnerOut) netEnd(h, 'pull');
    else {
      run.watch = true;
      run.watchId = h.partner;
      run.watchT = 0;
      run.watchLost = 0;
    }
  }
  h.end(false);
}

/** a's done watch (K3-3), every tick while armed and free. */
function watchTick(h: KitHost, run: ChimneyRun, dt: number): void {
  if (h.state !== 'none') {
    run.watch = false;
    return;
  }
  run.watchT += dt;
  const m = mateIn(h, run.watchId);
  if (m) {
    run.watchLost = 0;
    if ((m.s ?? 0) > run.topY + 0.5) run.partnerOut = true;
  } else if (!run.partnerOut) run.watchLost += dt;
  if (run.partnerOut) {
    run.watch = false;
    netEnd(h, 'pull');
  } else if (run.watchLost > CHIMNEY.lostGrace || run.watchT > CHIMNEY.watchMax) run.watch = false;
}

export const CHIMNEY_MOVE: KitMove<ChimneyRun> = {
  kind: 'chimneyPair',
  times: { chimneyBrace: CHIMNEY.brace, chimneyPush: CHIMNEY.brace, chimneyTop: CHIMNEY.top, chimneyOut: CHIMNEY.top },
  paired: true,
  claimsPoint: false,
  // the offer pins the offerer on the shaft's line: weapons and interact stay off
  busyOffer: true,
  newRun,
  check: checkChimney,

  tick(h, run, dt) {
    if (run.asked >= 0 && (run.asked += dt) > CHIMNEY.askWait) run.asked = -1;
    // K3-7: no solo split jump in a spot's shaft while the id is on (the switch only on a change or a new level)
    const on = flags.kitMoves.has('chimneyPair');
    if (on !== run.nsOn || run.nsDirty) {
      setNoSplit(on ? run.noSplit : EMPTY);
      run.nsOn = on;
      run.nsDirty = false;
    }
    if (run.watch) watchTick(h, run, dt);
  },

  idle(h, run, coopPressed, free) {
    if (!flags.kitMoves.has('chimneyPair')) return null;
    const join = joinIdle(h, run, coopPressed, free);
    if (join !== null) return join;
    return free ? offerIdle(h, run, coopPressed) : null;
  },

  begin(h, run, s, self) {
    const c = h.g.player.controller;
    run.asked = -1;
    if (s.b === self) {
      if (h.state !== 'chimneyOffer') {
        // cancelled meanwhile: the host's pair ends at once, we stay free
        h.endWhy = 'chimney: not offering';
        netEnd(h, 'drop');
        run.sent = true;
        return;
      }
      h.partner = s.a;
      h.state = 'chimneyBrace';
    } else {
      const list = h.devices.list;
      const d0 = s.target >= 0 ? list[s.target] : undefined;
      const mb = mateIn(h, s.b);
      if (!d0 || !isChimneyDevice(d0) || !mb) {
        h.endWhy = 'chimney: no shaft';
        netEnd(h, 'drop');
        run.sent = true;
        return;
      }
      const d = d0;
      spotShaft(d, mb.pos.x, mb.pos.z, run.shaft);
      run.dev = d;
      // back to back: we face the wall b's back is to
      run.side = Math.sin(mb.yaw) * d.ux + Math.cos(mb.yaw) * d.uz < 0 ? 1 : -1;
      h.partner = s.b;
      h.state = 'chimneyPush';
    }
    run.floor = c.pos.y;
    run.y = 0;
    run.vy = 0;
    run.topY = run.shaft.h - CHIMNEY.topReach;
    run.paired = true;
    run.sent = false;
    run.slide = false;
    run.partnerOut = false;
    run.lostT = 0;
    run.sx = c.pos.x;
    run.sy = c.pos.y;
    run.sz = c.pos.z;
    run.hp = h.health();
    pinPoint(run);
    h.t = 0;
    put(h, run, c.pos.x, c.pos.y, c.pos.z, wallYaw(run));
  },

  step(h, run, dt, coopPressed, bPressed, moveY) {
    h.t += dt;
    if (!run.dev) {
      h.endWhy = 'chimney: no device';
      h.end(true);
      return;
    }
    if (h.state === 'chimneyOffer') {
      offerStep(h, run, coopPressed, bPressed);
      return;
    }
    if (moved(h, run)) {
      h.endWhy = 'chimney: moved';
      h.end(true);
      return;
    }
    if (isTop(h.state)) {
      topStep(h, run);
      return;
    }
    const hp = h.health();
    if (hp < run.hp) startSlide(h, run, 'chimney: hurt');
    if (!Number.isNaN(hp)) run.hp = hp;
    if (isBrace(h.state)) braceStep(h, run, coopPressed, bPressed);
    else climbStep(h, run, dt, coopPressed, bPressed, moveY);
  },

  ended(h, run) {
    // committed: a top-out finishes whatever comes (K3-3)
    if (isTop(h.state)) return;
    run.sent = true;
    if (h.state === 'chimneyOffer' || isBrace(h.state)) h.end(false);
    else if (!run.slide) {
      h.endWhy = 'chimney: partner ended';
      run.slide = true;
    }
  },

  end(h, run, aborted) {
    if (aborted && run.paired && !run.sent) {
      run.sent = true;
      netEnd(h, 'drop');
    }
    const c = h.g.player.controller;
    if (run.ov && c.override === run.ov) c.override = null;
    const p = h.g.player.pose;
    if (p.traverse === 'brace' || p.traverse === 'climb' || p.traverse === 'climbUp') p.traverse = 'none';
    run.dev = null;
    run.ov = null;
    run.paired = false;
    run.slide = false;
  },

  wireS(h, run) {
    const st = h.state;
    if (st === 'chimneyOffer') return -run.shaft.w;
    if (isBrace(st)) return 0;
    if (isTop(st)) return run.shaft.h;
    return run.y;
  },

  setupDevices(_h, run, devices: KitDevices, level) {
    run.dev = null;
    run.ov = null;
    run.watch = false;
    run.noSplit.length = 0;
    run.nsDirty = true;
    const spots = kitSpotsOf(level, 'chimneyPair');
    for (let i = 0; i < spots.length; i++) {
      const d = newChimneyDevice(spots[i]!);
      devices.add(d);
      if (!d.ok) continue;
      run.noSplit.push({ x: d.x, z: d.z, ux: d.ux, uz: d.uz, across: d.w / 2 + NO_SPLIT_PAD, along: d.half + NO_SPLIT_PAD, y0: d.y - 0.5, y1: d.y + d.h });
    }
  },
};

KIT_PAIR.chimneyPair = { pairS: CHIMNEY.pairS, doneBy: 'a' };
registerKitMove(CHIMNEY_MOVE);
