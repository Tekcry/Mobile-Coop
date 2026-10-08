/**
 * Co-op team moves (3.2.0 phase 5; pure, unit-tested): brace against a wall, a boost up to a lip, the human ladder.
 * The rules a request must pass (checked by the host on both players' movement states) and the timing both sides
 * play from the host's start time.
 */
import { hyp2 } from '../core/mathx';
import { TEAM } from '../config/movement';

export type TeamKind = 'boost' | 'ladder';

/** What the host knows of a player for a team move. */
export interface TeamSide {
  id: string;
  x: number;
  y: number;
  z: number;
  /** Movement mode on the wire (`MoveState.m`). */
  mode: string;
  alive: boolean;
  /** Team (PvP: the same side only; co-op: everyone 0). */
  team: number;
}

export interface TeamRequest {
  kind: TeamKind;
  /** The one asking (the climber) and the braced partner. */
  a: TeamSide;
  b: TeamSide;
  /** A boost's / ladder's target anchor (lip, pipe, split; -1 = none) and its grip height over the floor (m). */
  target: number;
  targetUp: number;
  /** Seconds since the requester's last request (rate limit). */
  sinceLast: number;
}

export type TeamDenial = 'rate' | 'dead' | 'notMates' | 'notBraced' | 'far' | 'busy' | 'noTarget' | 'tooHigh';

/** The host's check of a team-move request: null = allowed, else why not. */
export function checkTeamRequest(r: TeamRequest): TeamDenial | null {
  if (r.sinceLast < 1 / TEAM.rate) return 'rate';
  if (!r.a.alive || !r.b.alive) return 'dead';
  if (r.a.id === r.b.id || r.a.team !== r.b.team) return 'notMates';
  if (r.b.mode !== 'brace') return 'notBraced';
  if (r.a.mode !== 'ground') return 'busy';
  if (hyp2(r.a.x - r.b.x, r.a.z - r.b.z) > TEAM.partnerReach || Math.abs(r.a.y - r.b.y) > 0.4) return 'far';
  if (r.kind === 'boost') {
    if (r.target < 0) return 'noTarget';
    if (r.targetUp > TEAM.boostMax) return 'tooHigh';
  }
  return null;
}

/** Can a player brace here: a team-mate in range, a wall right behind, on the ground and free. */
export function canBrace(mateDist: number, wallBehind: number, grounded: boolean, free: boolean): boolean {
  return grounded && free && mateDist <= TEAM.mateRange && wallBehind <= TEAM.wallBehind;
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
