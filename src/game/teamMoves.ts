/**
 * Co-op team moves (pure, unit-tested): the CT leg-up (a crouched player offers, the partner runs in and is boosted to a
 * ledge) and the CT ledge relay (a hanging player offers, the partner climbs up the hanging body to the ledge). The
 * rules a request must pass (checked by the host on both players' movement states) and the timing both sides play
 * from the host's start time. (G151: anywhere with room; G178: CT had it; G52's brace is gone.)
 */
import { hyp2 } from '../core/mathx';
import { TEAM } from '../config/movement';
import { ATTACH_SUB } from '../player/moveState';

/** 'boost' = the leg-up; 'ladder' = the ledge relay (the wire names stay, protocol 16). */
export type TeamKind = 'boost' | 'ladder';

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
  if (r.b.mode !== 'brace') return 'notBraced';
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
