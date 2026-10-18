/**
 * Co-op team moves (pure, unit-tested): the CT leg-up (a crouched player offers, the partner runs in and is boosted to a
 * ledge) and the CT ledge relay (a hanging player offers, the partner climbs up the hanging body to the ledge). The
 * rules a request must pass (checked by the host on both players' movement states) and the timing both sides play
 * from the host's start time. (G151: anywhere with room; G178: CT had it; G52's brace is gone.)
 */
import { hyp2 } from '../core/mathx';
import { TEAM } from '../config/movement';
import { ATTACH_SUB } from '../player/moveState';

/** 'boost' = the leg-up; 'ladder' = the ledge relay (the wire names stay, protocol 16); 'throw' = the partner throw (B4, protocol 19); 'hang' = the hang-down (B5, protocol 20). */
export type TeamKind = 'boost' | 'ladder' | 'throw' | 'hang' | 'rope';

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
}

export interface TeamRequest {
  kind: TeamKind;
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
}

export type TeamDenial = 'rate' | 'dead' | 'notMates' | 'notBraced' | 'notOffering' | 'far' | 'busy' | 'noTarget' | 'tooHigh';

/** The host's check of a team-move request: null = allowed, else why not. */
export function checkTeamRequest(r: TeamRequest): TeamDenial | null {
  if (r.sinceLast < 1 / TEAM.rate) return 'rate';
  if (!r.a.alive || !r.b.alive) return 'dead';
  if (r.a.id === r.b.id) return 'notMates';
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
  const throwOffer = r.b.mode === 'brace' && ((r.b.sub ?? 0) & THROW_SUB) !== 0;
  if (r.kind === 'throw') {
    // the throw: the partner stands offering it; the runner is in reach; the landing lies the throw's length past them
    if (!throwOffer) return 'notOffering';
    if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.throwReach || Math.abs(r.a.y - r.b.y) > 0.4) return 'far';
    const l = r.land;
    if (!l || !throwLandingOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z)) return 'noTarget';
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

/**
 * Where a throw lands (feet x / z) and its direction: the runner at (`ax`, `az`) runs into the standing thrower at (`bx`,
 * `bz`) and is thrown on over them, `TEAM.throwDist` m past the thrower along runner -> thrower. A runner right on top of
 * the thrower (closer than 5 cm) is thrown the way the thrower faces (`yaw`).
 */
export function throwLanding(ax: number, az: number, bx: number, bz: number, yaw: number, out: { x: number; z: number; dx: number; dz: number }): { x: number; z: number; dx: number; dz: number } {
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
  out.x = bx + dx * TEAM.throwDist;
  out.z = bz + dz * TEAM.throwDist;
  return out;
}

/** The host's bound on a claimed landing: about the throw's length from the thrower (+-1 m) and within `TEAM.throwDrop` of their floor. */
export function throwLandingOk(bx: number, by: number, bz: number, lx: number, ly: number, lz: number): boolean {
  const d = hyp2(lx - bx, lz - bz);
  return d >= TEAM.throwDist - 1 && d <= TEAM.throwDist + 1 && Math.abs(ly - by) <= TEAM.throwDrop;
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

// ---- (CT prototype B7) the two-person rope (CT 1.4 Belay Line, G178: the climb-a-rope exception) ----

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
