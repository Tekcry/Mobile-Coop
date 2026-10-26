/**
 * Co-op team moves (pure, unit-tested): the CT leg-up (a crouched player offers, the partner runs in and is boosted to a
 * ledge) and the CT ledge relay (a hanging player offers, the partner climbs up the hanging body to the ledge). The
 * rules a request must pass (checked by the host on both players' movement states) and the timing both sides play
 * from the host's start time. (G151: anywhere with room; G180: CT had it; G52's brace is gone.)
 */
import { hyp2 } from '../core/mathx';
import { TEAM } from '../config/movement';
import { ATTACH_SUB } from '../player/moveState';
import type { ThrowSite } from '../world/mapDef';

/** 'boost' = the leg-up; 'ladder' = the ledge relay (the wire names stay, protocol 16); 'throw' = the partner throw (B4, protocol 19); 'hang' = the hang-down (B5, protocol 20). */
export type BuiltinTeamKind = 'boost' | 'ladder' | 'throw' | 'hang' | 'rope';

/**
 * (mission KIT0) The co-op traversal kit's team kinds (PLAN 4a, M5): 'pull' = the pull-up (KIT-PULL, `kit/pullUp.ts`),
 * 'shutter' = hold a shutter while the partner crawls under (KIT-SHUT, `kit/shutter.ts`). Each lives in its own file
 * under `game/kit/` and plugs in through `kit/registry.ts`. (mission NET) They are wire kinds: `TeamKind` takes them.
 */
export type KitKind = 'pull' | 'shutter';
export const KIT_KINDS: readonly KitKind[] = ['pull', 'shutter'];
/** (mission NET) Every team move kind `tmove` / `tstart` carry (protocol.ts): the built-ins and the kit's. */
export type TeamKind = BuiltinTeamKind | KitKind;
export const TEAM_KINDS: readonly TeamKind[] = ['boost', 'ladder', 'throw', 'hang', 'rope', 'pull', 'shutter'];
/** Every team move (the same as `TeamKind` since NET folded the kit into the wire). */
export type TeamMoveKind = TeamKind;

export function isKitKind(k: string): k is KitKind {
  return k === 'pull' || k === 'shutter';
}

/** (mission KIT0) The kit moves' sub bits on the `brace` / `boost` wire modes (after THROW 1, HANG 2, ROPE 4). */
export const PULL_SUB = 8;
export const SHUTTER_SUB = 16;
export const KIT_SUB: Readonly<Record<KitKind, number>> = { pull: PULL_SUB, shutter: SHUTTER_SUB };
/** Any kit sub bit: a `brace` mate with one offers a kit move, never a leg-up / throw / hang / rope. */
export const KIT_SUB_MASK = PULL_SUB | SHUTTER_SUB;

/** (mission KIT0) The host's rule per kit kind, filled by `kit/registry.ts` `registerKitMove` (none = not offering). */
export const KIT_CHECKS: Partial<Record<KitKind, (r: TeamRequest) => TeamDenial | null>> = {};

/** (B7) The `brace` (holder at the top) and `boost` (climber) sub bit for the two-person rope (protocol 22). */
export const ROPE_SUB = 4;

/** (B4) The `brace` mode's sub bit for a STANDING throw offer (a crouched leg-up offer has sub 0). */
export const THROW_SUB = 1;

/** (B5) The `brace` (holder) and `boost` (hanging partner) sub bit for the hang-down. */
export const HANG_SUB = 2;

/** What the host knows of a player for a team move. */
export interface TeamSide {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Movement mode on the wire (`MoveState.m`): a leg-up offer is `brace` (the crouched, hands-cupped pose). */
  mode: string;
  alive: boolean;
  /** Attached anchor id, position along it and attach sub bits (a hanging player's relay offer is `ATTACH_SUB.relay`). */
  anchor?: number;
  s?: number;
  sub?: number;
  /** (mission KIT-SHUT) Crouched (the host's PF.crouch): the shutter's crawl needs it (`kit/shutter.ts`). */
  crouch?: boolean;
}

export interface TeamRequest {
  kind: TeamMoveKind;
  /** The one asking (the climber) and the braced partner. */
  a: TeamSide;
  b: TeamSide;
  /** A leg-up's target anchor (the ledge, -1 = none); a relay's is the hanger's own ledge (lip, pipe, split; -1 = none) and its grip height over the floor (m). */
  target: number;
  targetUp: number;
  /** Seconds since the requester's last request (rate limit). */
  sinceLast: number;
  /** (B4) A throw's landing (feet), claimed by the runner after its own room check; the host bounds it. */
  land?: { x: number; y: number; z: number };
  /** (coop4 A20) The host's active-move map says the partner is already serving someone else: denied `taken`, before any other check. */
  bBusy?: boolean;
}

export type TeamDenial = 'rate' | 'dead' | 'notMates' | 'notBraced' | 'notOffering' | 'far' | 'busy' | 'noTarget' | 'tooHigh' | 'taken';

/** (coop4 A20, net check M1) Seconds after a hang-down / rope starts before the host reads its climber's wire pose (the
 *  first `pstate` with the move's pose may still be in flight). */
export const OPEN_MOVE_GRACE = 1;

/** (coop4 A20, net check M1) A hang-down / rope still runs while its climber is alive and posed in it (`boost` + HANG_SUB
 *  / ROPE_SUB on the wire for the whole move). False for a missing, dead or released climber: its open-ended busy entry
 *  is over (several client ends send the host nothing). */
export function inOpenMove(climber: TeamSide | null): boolean {
  return !!climber && climber.alive && climber.mode === 'boost' && ((climber.sub ?? 0) & (HANG_SUB | ROPE_SUB)) !== 0;
}

/** The host's check of a team-move request: null = allowed, else why not. */
export function checkTeamRequest(r: TeamRequest): TeamDenial | null {
  if (r.bBusy === true) return 'taken';
  if (r.sinceLast < 1 / TEAM.rate) return 'rate';
  if (!r.a.alive || !r.b.alive) return 'dead';
  if (r.a.id === r.b.id) return 'notMates';
  if (isKitKind(r.kind)) {
    // (mission KIT0) a kit move's own rule (its file, via the registry), before the ground check: the pull-up's
    // partner asks in the air
    const check = KIT_CHECKS[r.kind];
    return check ? check(r) : 'notOffering';
  }
  if (r.a.mode !== 'ground') return 'busy';
  if (r.kind === 'ladder') {
    // the relay: the partner hangs on a ledge and offered it; the climber stands under them
    if (r.b.mode !== 'ledge' || ((r.b.sub ?? 0) & ATTACH_SUB.relay) === 0) return 'notOffering';
    const up = r.b.y - r.a.y;
    if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.relayReach || up < 0.3 || up > TEAM.relayMax) return 'far';
    return r.b.anchor === undefined || r.b.anchor < 0 ? 'noTarget' : null;
  }
  const ropeOffer = r.b.mode === 'brace' && ((r.b.sub ?? 0) & ROPE_SUB) !== 0;
  if (r.kind === 'rope') {
    // (B7) the two-person rope: the partner holds a rope at an edge above; the climber stands at its foot below
    if (!ropeOffer) return 'notOffering';
    const up = r.b.y - r.a.y;
    if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.ropeReach || up < TEAM.ropeMin - 0.4 || up > TEAM.ropeMax + 0.4) return 'far';
    const l = r.land;
    if (!l || !hangPointOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z)) return 'noTarget';
    return null;
  }
  if (ropeOffer) return 'notBraced';
  const hangOffer = r.b.mode === 'brace' && ((r.b.sub ?? 0) & HANG_SUB) !== 0;
  if (r.kind === 'hang') {
    // (B5) the hang-down: the partner crouches at an edge offering it; the hanger is in reach; the hang point is by them
    if (!hangOffer) return 'notOffering';
    if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.hangReach || Math.abs(r.a.y - r.b.y) > 0.4) return 'far';
    const l = r.land;
    if (!l || !hangPointOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z)) return 'noTarget';
    return null;
  }
  if (hangOffer) return 'notBraced';
  if (r.b.mode === 'brace' && ((r.b.sub ?? 0) & KIT_SUB_MASK) !== 0) return 'notBraced'; // (KIT0) offering a kit move
  const throwOffer = r.b.mode === 'brace' && ((r.b.sub ?? 0) & THROW_SUB) !== 0;
  if (r.kind === 'throw') {
    // the throw: the partner stands offering it; the runner is in reach; the landing lies the throw's length past them
    if (!throwOffer) return 'notOffering';
    if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.throwReach || Math.abs(r.a.y - r.b.y) > 0.4) return 'far';
    const l = r.land;
    if (!l) return 'noTarget';
    const dist = throwDistAt(r.b.x, r.b.z, l.x - r.b.x, l.z - r.b.z); // (tallow-fixes A24) a throw site's length, else the standard
    // (TD-b) at a site the host also takes the standard band: its view of the thrower lags the runner's (reach / facing edge)
    if (!throwLandingOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z, dist) && (dist === TEAM.throwDist || !throwLandingOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z))) return 'noTarget';
    return null;
  }
  if (r.b.mode !== 'brace' || throwOffer) return 'notBraced';
  if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.partnerReach || Math.abs(r.a.y - r.b.y) > 0.4) return 'far';
  if (r.kind === 'boost') {
    if (r.target < 0) return 'noTarget';
    if (r.targetUp > TEAM.boostMax) return 'tooHigh';
    if (r.targetUp < TEAM.legUpMin) return 'noTarget';
  }
  return null;
}

/**
 * Room for a leg-up offer (G151): the toss needs `TEAM.roomUp` m of free air above the crouched player, and the partner
 * needs somewhere to run in from: at least one of the side clearances (m, 4 directions) of `TEAM.roomSide`.
 */
export function legUpRoom(up: number, sides: ArrayLike<number>): boolean {
  if (up < TEAM.roomUp) return false;
  for (let i = 0; i < sides.length; i++) if (sides[i]! >= TEAM.roomSide) return true;
  return false;
}

/** A ledge grip `up` m over the floor is a leg-up target: out of a jump's reach, inside the boost (G57 band 4.3-4.5 designed). */
export function inBoostBand(up: number): boolean {
  return up >= TEAM.legUpMin && up <= TEAM.boostMax;
}

/** Where along a ledge of length `len` the relay climber hangs beside the hanger at `s` (m): a body width over. */
export function relaySlot(s: number, len: number): number {
  const up = s + TEAM.relaySlide;
  if (up <= len - 0.3) return up;
  return Math.max(Math.min(len, 0.3), s - TEAM.relaySlide);
}

/**
 * The relay climber's feet at `t` seconds (0..`TEAM.relayClimb`): sideways in to the hanger's body, then up beside it to
 * the grip pose (`gx, gy, gz` = the feet's hanging position on the ledge).
 */
export function relayPath(t: number, ax: number, ay: number, az: number, gx: number, gy: number, gz: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const k = Math.max(0, Math.min(1, t / TEAM.relayClimb));
  const s = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));
  const h = s(k / 0.4);
  out.x = ax + (gx - ax) * h;
  out.z = az + (gz - az) * h;
  out.y = ay + (gy - ay) * s(k);
  return out;
}

/**
 * A boost's climber feet at `t` seconds into it (0..`TEAM.boostTime`): in to the braced hands, a foot on them (up to
 * `step` m), then tossed up to the grip (`gx, gy, gz` - the hands' height; the feet hang `hang` m under it).
 */
export function boostPath(t: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, gx: number, gy: number, gz: number, hang: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const k = Math.max(0, Math.min(1, t / TEAM.boostTime));
  const s = (v: number): number => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));
  if (k < 0.35) {
    // in to the cupped hands, a foot up on them
    const u = s(k / 0.35);
    out.x = ax + (bx - ax) * u;
    out.z = az + (bz - az) * u;
    out.y = ay + (by + 0.75 - ay) * u;
    return out;
  }
  // the toss: up past the grip and onto it
  const u = s((k - 0.35) / 0.65);
  const fy = gy - hang;
  out.x = bx + (gx - bx) * u;
  out.z = bz + (gz - bz) * u;
  out.y = by + 0.75 + (fy - (by + 0.75)) * u + Math.sin(Math.PI * u) * 0.35;
  return out;
}

// ---- (CT prototype B4) the partner throw (CT 1.3) ----

/** (tallow-fixes A24) How near the thrower must stand to a throw site's spot (m) for its length to apply. */
export const THROW_SITE_REACH = 1.0;
/** (tallow-fixes A24) The least cosine between a site's facing and the throw direction (about 25 degrees off). */
export const THROW_SITE_COS = 0.9;

/** (Q23, tallow-fixes A24) The current map's throw sites (null = none: the standard throw everywhere). */
let throwSites: readonly ThrowSite[] | null = null;

/** (tallow-fixes A24) Sets the map's throw sites (setup time only; null or an empty list = none). */
export function setThrowSites(list: readonly ThrowSite[] | null): void {
  throwSites = list && list.length > 0 ? list : null;
}

/** (tallow-fixes TD-b) Clears the throw sites only when `list` is the one set (identity): a new controller may start
 *  before the old one is disposed (a bench hand-off), and the old dispose must not clear the new map's sites. */
export function clearThrowSites(list: readonly ThrowSite[]): void {
  if (throwSites === list) throwSites = null;
}

/**
 * (Q23, tallow-fixes A24) The throw length (m) for a thrower at (`bx`, `bz`) throwing along (`dx`, `dz`) (any length): the
 * nearest throw site within `THROW_SITE_REACH` whose facing is within `THROW_SITE_COS` of the direction gives its `dist`;
 * none (no sites, or a direction under 1e-6) gives `TEAM.throwDist`. Pure and allocation-free.
 */
export function throwDistAt(bx: number, bz: number, dx: number, dz: number): number {
  const list = throwSites;
  if (list === null) return TEAM.throwDist;
  const len = hyp2(dx, dz);
  if (len < 1e-6) return TEAM.throwDist;
  let best: number = TEAM.throwDist;
  let bestD = Infinity;
  for (let i = 0; i < list.length; i++) {
    const s = list[i]!;
    const d = hyp2(bx - s.x, bz - s.z);
    if (d > THROW_SITE_REACH || d >= bestD) continue;
    const sl = hyp2(s.dx, s.dz);
    if (sl < 1e-6 || (s.dx * dx + s.dz * dz) / (sl * len) < THROW_SITE_COS) continue;
    best = s.dist;
    bestD = d;
  }
  return best;
}

/**
 * Where a throw lands (feet x / z) and its direction: the runner at (`ax`, `az`) runs into the standing thrower at (`bx`,
 * `bz`) and is thrown on over them, `dist` m (default `TEAM.throwDist`; a throw site's length via `throwDistAt`) past the
 * thrower along runner -> thrower. A runner right on top of the thrower (closer than 5 cm) is thrown the way the thrower
 * faces (`yaw`).
 */
export function throwLanding(ax: number, az: number, bx: number, bz: number, yaw: number, out: { x: number; z: number; dx: number; dz: number }, dist: number = TEAM.throwDist): { x: number; z: number; dx: number; dz: number } {
  let dx = bx - ax;
  let dz = bz - az;
  const d = hyp2(dx, dz);
  if (d < 0.05) {
    dx = Math.sin(yaw);
    dz = Math.cos(yaw);
  } else {
    dx /= d;
    dz /= d;
  }
  out.dx = dx;
  out.dz = dz;
  out.x = bx + dx * dist;
  out.z = bz + dz * dist;
  return out;
}

/** The host's bound on a claimed landing: about the throw's length `dist` (default `TEAM.throwDist`; a throw site's
 *  length via `throwDistAt`) from the thrower (+-1 m) and within `TEAM.throwDrop` of their floor. */
export function throwLandingOk(bx: number, by: number, bz: number, lx: number, ly: number, lz: number, dist: number = TEAM.throwDist): boolean {
  const d = hyp2(lx - bx, lz - bz);
  return d >= dist - 1 && d <= dist + 1 && Math.abs(ly - by) <= TEAM.throwDrop;
}

/**
 * The thrown player's feet at `t` s into the throw (0..`TEAM.throwTime`): a straight line from the start to the landing
 * with a parabola of `TEAM.throwApex` m on top (highest half way), landing on the feet.
 */
export function throwArc(t: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, out: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const k = Math.max(0, Math.min(1, t / TEAM.throwTime));
  out.x = x0 + (x1 - x0) * k;
  out.z = z0 + (z1 - z0) * k;
  out.y = y0 + (y1 - y0) * k + 4 * TEAM.throwApex * k * (1 - k);
  return out;
}

/** The thrown player's vertical speed (m/s) at `t` s into the throw (`throwArc`'s y over time; < 0 = descending). */
export function throwArcVy(t: number, y0: number, y1: number): number {
  const k = Math.max(0, Math.min(1, t / TEAM.throwTime));
  return (y1 - y0 + 4 * TEAM.throwApex * (1 - 2 * k)) / TEAM.throwTime;
}

/**
 * (throw-ko, CT: the thrown partner landing on a guard knocks him out) Whether the thrown player's feet at (`fx`, `fy`,
 * `fz`), moving at `vy` m/s vertically, come down on a guard whose feet are at (`gx`, `gy`, `gz`): descending, within
 * `TEAM.throwKoReach` across and between `TEAM.throwKoLow` and `TEAM.throwKoHigh` over his feet (head / shoulders).
 */
export function throwKoHit(fx: number, fy: number, fz: number, vy: number, gx: number, gy: number, gz: number): boolean {
  if (!(vy < 0)) return false;
  const up = fy - gy;
  if (up < TEAM.throwKoLow || up > TEAM.throwKoHigh) return false;
  return hyp2(fx - gx, fz - gz) <= TEAM.throwKoReach;
}

export type ThrowRoom = 'ok' | 'arc' | 'floor' | 'head';

/**
 * Room for a throw (G151, polite refusal): `arcClear` nothing solid along the flight (the caller samples it), `floorDy`
 * the landing floor's height over the thrower's floor (NaN = no floor found), `headroom` free air over the landing (m).
 */
export function throwRoom(arcClear: boolean, floorDy: number, headroom: number): ThrowRoom {
  if (!arcClear) return 'arc';
  if (!Number.isFinite(floorDy) || Math.abs(floorDy) > TEAM.throwDrop) return 'floor';
  if (headroom < 1.2) return 'head';
  return 'ok';
}

// ---- (CT prototype B5) the hang-down (CT 1.5 Drop Line) ----

/** The hanging head's height under the rig root when the body is turned over (m at 1.75 m: 1.75 - 2 x the tumble pivot). */
export const HANG_HEAD = 0.62;

/** The holder's bound on a claimed hang point: within `TEAM.hangProbe` + 0.6 m of the holder and at their floor height. */
export function hangPointOk(bx: number, by: number, bz: number, hx: number, hy: number, hz: number): boolean {
  return hyp2(hx - bx, hz - bz) <= TEAM.hangProbe + 0.6 && Math.abs(hy - by) <= 0.4;
}

/** The deepest the head may go under an edge at `edgeY` over a floor at `floorY` (head 0.3 m off the floor; NaN floor = the most). */
export function hangDepthMax(edgeY: number, floorY: number): number {
  const room = Number.isFinite(floorY) ? edgeY - floorY - 0.3 : Infinity;
  return Math.max(TEAM.hangMin, Math.min(TEAM.hangMax, room));
}

/** The holder's stick moves the depth (`stickY` > 0, forward = up), `TEAM.hangRate` m/s, inside `TEAM.hangMin`..`max`. */
export function hangDepth(depth: number, stickY: number, dt: number, max: number = TEAM.hangMax): number {
  const d = depth - stickY * TEAM.hangRate * dt;
  return Math.max(TEAM.hangMin, Math.min(max, d));
}

/** The hanging player's rig root (feet reference) for the head `depth` m under an edge at `edgeY` (turned over, the head is lowest). */
export function hangRootY(edgeY: number, depth: number): number {
  return edgeY - depth + HANG_HEAD;
}

/** The hanging player's own depth eases to the holder's (as received) at the holder's rate: no snapping on the wire's steps. */
export function hangFollow(cur: number, target: number, dt: number): number {
  const step = TEAM.hangRate * 1.5 * dt;
  return Math.abs(target - cur) <= step ? target : cur + Math.sign(target - cur) * step;
}

/**
 * An interactable within the hanging player's reach (the game's own rule on the feet reference: 1.8 m across, 1.5 m up
 * or down): the panel at (`px`, `py`, `pz`) from a hang at (`hx`, `hz`) under an edge at `edgeY` with the head `depth` down.
 */
export function hangReaches(hx: number, hz: number, edgeY: number, depth: number, px: number, py: number, pz: number): boolean {
  return hyp2(px - hx, pz - hz) < 1.8 && Math.abs(py - hangRootY(edgeY, depth)) < 1.5;
}

export type HangEnd = 'pull' | 'drop';

/**
 * How a hang-down ends (either player's press): the Co-op action pulls the partner back up beside the holder; the
 * holder's release (B) drops them to the floor under the hang. Only the holder can drop the partner.
 */
export function hangEndOf(holder: boolean, coopPressed: boolean, bPressed: boolean): HangEnd | null {
  if (coopPressed) return 'pull';
  if (bPressed && holder) return 'drop';
  return null;
}

/** A head-first drop from the hang (head `fall` m over the floor): lands crouched; no harm under 3 m (and the game has no fall damage). */
export function hangLanding(fall: number): { crouch: true; harm: boolean } {
  return { crouch: true, harm: fall >= 3 };
}

// ---- (CT prototype B7) the two-person rope (CT 1.4 Belay Line, G180: the climb-a-rope exception) ----

export type RopeRoom = 'ok' | 'noFloor' | 'short' | 'deep';

/**
 * Room to drop a rope (G151, polite refusal): the floor under the edge (`floorY`, NaN = none found) must lie between
 * `TEAM.ropeMin` (lower is a jump's or a hang's) and `TEAM.ropeMax` (the rope's length) under the edge at `edgeY`.
 */
export function ropeRoom(edgeY: number, floorY: number): RopeRoom {
  if (!Number.isFinite(floorY)) return 'noFloor';
  const d = edgeY - floorY;
  if (d < TEAM.ropeMin) return 'short';
  if (d > TEAM.ropeMax) return 'deep';
  return 'ok';
}

/** The climber's feet when the hands reach the edge (the top-out starts there). */
export function ropeTopY(edgeY: number): number {
  return edgeY - 1.5;
}

/** The climber's own stick (`stickY` > 0 = up) moves the feet along the rope, inside the floor .. the top. */
export function ropeClimb(y: number, stickY: number, dt: number, floorY: number, topY: number): number {
  const v = stickY > 0 ? stickY * TEAM.ropeUp : stickY * TEAM.ropeDown;
  return Math.max(floorY, Math.min(topY, y + v * dt));
}

/** Let go (or the holder let go): the climber slides down the rope to the floor, never falls. */
export function ropeSlide(y: number, dt: number, floorY: number): number {
  return Math.max(floorY, y - TEAM.ropeSlide * dt);
}

/**
 * How a rope ends: reaching the top = `pull` (topped out, the holder is free); a Co-op or B press from either = `drop`
 * (the holder lets go / the climber lets go: the climber slides down safely).
 */
export function ropeEndOf(atTop: boolean, coopPressed: boolean, bPressed: boolean): HangEnd | null {
  if (atTop) return 'pull';
  if (coopPressed || bPressed) return 'drop';
  return null;
}

// ---- (team-climb) the rope's top-out: the root path, the hands on the lip ----

const smooth01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** Quintic smoothstep (still and with no acceleration at both ends), clamped. */
const smooth5 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));

/**
 * The rope top-out's root path over its time `TEAM.ropeTop` (k 0..1): two quintic shares, each still (no speed and no
 * acceleration) where it starts and ends, so the root never pops: the rise onto the top over k 0..`riseEnd` (the rope
 * climb's speed carried in) and the move in over it from k `acrossStart` (the feet over the face's plane only once the
 * rise is done). The climber is already pulled in to `pullOut` m off the face (a hang's body line, `HANG.out`, so the
 * hands reach the lip) on the rope's last `pullIn` m (`ropeClimbPull`). Was: e = smoothstep(k), the rise `min(1, 1.7 e)`
 * stopped dead at k 0.56 (a 5.7 cm velocity step in a 60 Hz frame) and the move in `(e - 0.4) / 0.6` started with a
 * jump, over 0.9 s; no 0.9 s path keeps every frame's velocity change under 0.5 cm (the 1.5 m rise alone needs ~0.75 s
 * at that limit), hence `TEAM.ropeTop` 1.1 s.
 */
export const ROPE_TOP_PATH = { riseEnd: 0.68, acrossStart: 0.325, pullIn: 0.6, pullOut: 0.22 };

/**
 * The rope top-out's path shares at `k`: `rise` (0..1 of the feet up to the top) and `across` (0..1 of the move to the
 * top-out spot). `m0` the rise's starting slope in its own time (the rope climb's speed carried in: v riseEnd
 * `TEAM.ropeTop` / the rise's height; 0 = from still), clamped 0..1 (the rise stays monotone and under 1). No allocation.
 */
export function ropeTopPath(k: number, m0: number, out: { rise: number; across: number }): { rise: number; across: number } {
  const P = ROPE_TOP_PATH;
  const s = Math.max(0, Math.min(1, k / P.riseEnd));
  // quintic Hermite: 0 -> 1, slope m0 -> 0, no acceleration at either end; s (1 - s)^3 (1 + 3 s) carries the start slope
  const c = 1 - s;
  out.rise = smooth5(s) + Math.max(0, Math.min(1, m0)) * s * c * c * c * (1 + 3 * s);
  out.across = smooth5((k - P.acrossStart) / (1 - P.acrossStart));
  return out;
}

/** The share (0..1) of the pull in to the face with the feet `below` m under the rope's top (by height: the climb's stick
 *  and the slide drive it, so it never pops on its own). */
export function ropeClimbPull(below: number): number {
  return smooth5(1 - below / ROPE_TOP_PATH.pullIn);
}

/**
 * The rope top-out's hands on the lip (visual). The hands start for the lip on the rope's last `pre` m (to `preW` of the
 * way at its top: at most 0.5 as the top-out starts, so characterRig's `ledgeClimb`, decided on a climbUp's first frame
 * from the grip weights, stays false and the team clip plays), are on it by k `inK`, hold it while the body rises over
 * them and leave it as the arms run out (`liftOff` of the arm: the rig eases each palm off towards its shoulder), the
 * weight then let go over `span` from `k0`.
 */
export const ROPE_TOP_HANDS = { pre: 0.2, preW: 0.4, inK: 0.2, k0: 0.3, span: 0.3, liftOff: 0.8 };

/** The grip weight on the rope `below` m under its top (the hands starting for the lip). */
export function ropeClimbGripW(below: number): number {
  const H = ROPE_TOP_HANDS;
  return H.preW * smooth01(1 - below / H.pre);
}

/** The grip weight at the top-out's `k`. */
export function ropeTopGripW(k: number): number {
  const H = ROPE_TOP_HANDS;
  return (H.preW + (1 - H.preW) * smooth01(k / H.inK)) * (1 - smooth01((k - H.k0) / H.span));
}

/** A ray into the level for the lip search, (a -> b): the hit's share of the way (> 1: no hit) and its normal into `n`. */
export type LipRay = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, n: { x: number; y: number; z: number }) => number;

/** The lip a rope goes over: a point on its edge, its outward face normal (horizontal, unit); `ok` false = none found. */
export interface RopeLip {
  ok: boolean;
  x: number;
  y: number;
  z: number;
  nx: number;
  nz: number;
}

export function newRopeLip(): RopeLip {
  return { ok: false, x: 0, y: 0, z: 0, nx: 0, nz: 0 };
}

const lipN = { x: 0, y: 0, z: 0 };

/**
 * The lip in front of a climber at (`bx`, `bz`) facing `yaw`, its edge between `yLo` and `yHi`: forward rays (1.5 m)
 * from the top down every 0.1 m; the first that meets a face (its normal level) has the edge just over it, the top's
 * height then from a ray down just in from the face. No face (a hatch, an overhang): the first top under rays down
 * along the facing. Once per move (the rays may allocate in the caller).
 */
export function findRopeLip(ray: LipRay, bx: number, bz: number, yaw: number, yLo: number, yHi: number, out: RopeLip): boolean {
  out.ok = false;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const sx = bx - fx * 0.1;
  const sz = bz - fz * 0.1;
  let px = 0, pz = 0, nx = 0, nz = 0, h = NaN;
  for (let y = yHi; y >= yLo - 1e-6; y -= 0.1) {
    const t = ray(sx, y, sz, bx + fx * 1.5, y, bz + fz * 1.5, lipN);
    if (t > 1 || Math.abs(lipN.y) > 0.5) continue;
    const l = hyp2(lipN.x, lipN.z) || 1;
    nx = lipN.x / l;
    nz = lipN.z / l;
    px = sx + (bx + fx * 1.5 - sx) * t;
    pz = sz + (bz + fz * 1.5 - sz) * t;
    h = y;
    break;
  }
  if (Number.isNaN(h)) {
    // no face ahead: the first top under the facing
    for (let d = 0; d <= 1.5 + 1e-6; d += 0.05) {
      const x = bx + fx * d;
      const z = bz + fz * d;
      const t = ray(x, yHi, z, x, yLo, z, lipN);
      if (t > 1) continue;
      px = bx + fx * Math.max(0, d - 0.025);
      pz = bz + fz * Math.max(0, d - 0.025);
      nx = -fx;
      nz = -fz;
      h = yHi + (yLo - yHi) * t;
      break;
    }
    if (Number.isNaN(h)) return false;
    out.y = h;
  } else {
    // the top's height just in from the face, over the hit
    const x = px - nx * 0.06;
    const z = pz - nz * 0.06;
    const t = ray(x, h + 0.4, z, x, h - 0.2, z, lipN);
    out.y = t <= 1 ? h + 0.4 - 0.6 * t : h + 0.05;
  }
  out.x = px;
  out.z = pz;
  out.nx = nx;
  out.nz = nz;
  out.ok = true;
  return true;
}

/** A hand target on a lip (a CharacterRig `reachL / R`, loosely typed). */
export interface LipHand {
  x: number;
  y: number;
  z: number;
  w: number;
  ax?: number;
  ay?: number;
  az?: number;
  rad?: number;
  hook?: number;
  cx?: number;
  cy?: number;
  cz?: number;
  liftOff?: number;
}

/**
 * Both hands' targets on `lip` for a body at (`bx`, `bz`) facing `yaw`, `half` either side of the body along the edge
 * (the ledge hang's 0.25 m at Wren's height), each a lip ("hook") grip: the palm 4 cm in from the edge, the edge under
 * it, the edge's axis, lifting off as the arm runs out (`ROPE_TOP_HANDS.liftOff`), weight `w`. No allocation.
 */
export function ropeLipHands(lip: RopeLip, bx: number, bz: number, yaw: number, half: number, w: number, L: LipHand, R: LipHand): void {
  // along the edge: perpendicular to the face normal; the right hand on the body's right
  let ax = -lip.nz;
  let az = lip.nx;
  if (ax * Math.cos(yaw) - az * Math.sin(yaw) < 0) {
    ax = -ax;
    az = -az;
  }
  const s = (bx - lip.x) * ax + (bz - lip.z) * az;
  for (let i = 0; i < 2; i++) {
    const t = i === 0 ? L : R;
    const o = s + (i === 0 ? -half : half);
    const ex = lip.x + ax * o;
    const ez = lip.z + az * o;
    t.cx = ex;
    t.cy = lip.y;
    t.cz = ez;
    t.x = ex - lip.nx * 0.04;
    t.y = lip.y;
    t.z = ez - lip.nz * 0.04;
    t.ax = ax;
    t.ay = 0;
    t.az = az;
    t.rad = 0;
    t.hook = 1;
    t.liftOff = ROPE_TOP_HANDS.liftOff;
    t.w = w;
  }
}

/** (team-climb) A partner's rope climb as another page sees it: in the top-out yet, and its hands' grip weight now. */
export interface RopeSeen {
  top: boolean;
  w: number;
}

/** The most a seen climber's grip weight moves (per s) and the most it has as its top-out starts (`ledgeClimb`). */
export const ROPE_SEEN = { rate: 1 / 0.12, firstW: 0.45 };

/**
 * One frame of a partner's rope climb on another page (remoteAvatar; nothing on the wire): its feet `feetY` against the
 * rope's top under the lip at `lipY` tell the top-out (the feet past the rope's top, its wire phase `ph` reset), whose
 * phase is then `ph`; the hands' grip weight as the owner's (`ropeClimbGripW` / `ropeTopGripW`), eased (the snapshots'
 * phase steps) and at most `ROPE_SEEN.firstW` on the top-out's first frame. No allocation.
 */
export function ropeSeenStep(s: RopeSeen, feetY: number, lipY: number, ph: number, dt: number): RopeSeen {
  const below = ropeTopY(lipY) - feetY;
  const first = !s.top && below < -0.02 && ph < 0.35;
  if (first) s.top = true;
  const want = s.top ? ropeTopGripW(ph) : below < ROPE_TOP_HANDS.pre ? ropeClimbGripW(Math.max(0, below)) : 0;
  const step = ROPE_SEEN.rate * dt;
  let w = want > s.w + step ? s.w + step : want < s.w - step ? s.w - step : want;
  if (first) w = Math.min(w, ROPE_SEEN.firstW);
  s.w = w;
  return s;
}
