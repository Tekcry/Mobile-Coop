/**
 * Host-side checks for client claims (shots, grenades, end-of-match stats). Pure and unit-tested:
 * no Babylon or DOM, so the rules can be reasoned about in isolation.
 */
import type { WeaponDef } from '../weapons/weaponDefs';
import { computeStats, damageAt, MAX_UPGRADE } from '../weapons/weaponStats';
import { killScore } from '../game/modes/score';
import type { EndStats } from './protocol';
import type { SessionStats } from '../game/modes/gameMode';
import { emptyKinds, ENEMY_KINDS } from '../ai/enemyDefs';
import { hyp2, hyp3 } from '../core/mathx';
import { gearCap } from '../player/speedGears';
import { isAttachedMode, unpackAttachSub, type MoveState } from '../player/moveState';
import { HANG_SUB, ROPE_SUB } from '../game/teamMoves';
import { attachPose, type AttachPose } from '../player/attach';
import type { TraversalAnchors } from '../world/anchors';
import type { SectorRatingWire } from '../game/sectors';
import type { RatingView } from '../ui/hud/ratingCard';
import { unpackRated } from '../game/course/courseWire';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Can player `a` hurt player `b`? Course mode friendly fire (D38): anyone but themselves (a partner hit to zero is
 * downed under co-op rules); plain co-op: never. */
export const playersHostile = (friendlyFire: boolean, a: string, b: string): boolean => friendlyFire && a !== b;

/** Token bucket: `capacity` burst, refilled at `perSecond`. */
export class RateLimiter {
  private tokens: number;
  private last = -Infinity;

  constructor(
    private capacity: number,
    private perSecond: number,
  ) {
    this.tokens = capacity;
  }

  take(now: number, n = 1): boolean {
    if (this.last > -Infinity) this.tokens = Math.min(this.capacity, this.tokens + (now - this.last) * this.perSecond);
    this.last = now;
    if (this.tokens < n) return false;
    this.tokens -= n;
    return true;
  }
}

/** Hits per second a weapon can legitimately land (every pellet hitting), with 30% slack for jitter. */
export function shotLimiter(def: WeaponDef): RateLimiter {
  return new RateLimiter(def.pellets * 3, ((def.rpm / 60) * def.pellets) * 1.3);
}

/** Highest per-hit damage possible with full upgrades and no falloff. */
export function maxHitDamage(def: WeaponDef, head: boolean): number {
  const u = MAX_UPGRADE;
  const st = computeStats(def, { damage: u, magazine: u, recoil: u, reload: u });
  return damageAt(def, st, 0, head) * 1.02;
}

/** Distance of point p from the ray o + d*t (t >= 0), and t. */
export function rayPointDistance(o: V3, d: V3, p: V3): { along: number; perp: number } {
  const px = p.x - o.x;
  const py = p.y - o.y;
  const pz = p.z - o.z;
  const along = Math.max(0, px * d.x + py * d.y + pz * d.z);
  const cx = o.x + d.x * along - p.x;
  const cy = o.y + d.y * along - p.y;
  const cz = o.z + d.z * along - p.z;
  return { along, perp: hyp3(cx, cy, cz) };
}

export interface ShotClaim {
  origin: V3;
  dir: V3;
  part: 'head' | 'body';
}

export type ShotVerdict = { ok: true; distance: number } | { ok: false; reason: 'origin' | 'range' | 'miss' };

/**
 * Geometry check against the (lag-compensated) target position.
 * - the shot must start near the shooter (camera boom / muzzle offset, plus movement since the last state);
 * - it must pass within `tolerance` of the target's body centre (or head for headshots);
 * - and be within weapon range.
 */
export function checkShot(c: ShotClaim, shooterFeet: V3, targetBody: V3, targetHead: V3, range: number, tolerance = 1.1, under = SHOT_UNDER): ShotVerdict {
  const dx = c.origin.x - shooterFeet.x;
  const dz = c.origin.z - shooterFeet.z;
  const dy = c.origin.y - shooterFeet.y;
  if (hyp2(dx, dz) > 3.5 || dy < -under || dy > 3) return { ok: false, reason: 'origin' };
  const aim = c.part === 'head' ? targetHead : targetBody;
  const r = rayPointDistance(c.origin, c.dir, aim);
  if (r.along > range + 2) return { ok: false, reason: 'range' };
  if (r.perp > (c.part === 'head' ? tolerance * 0.7 : tolerance)) return { ok: false, reason: 'miss' };
  return { ok: true, distance: r.along };
}

/** How far under the shooter's feet reference a shot may start (m); (hang-down) head-first under the partner's hands
 *  the feet reference is the turned-over rig root, the pistol held out under the head (`SHOT_UNDER_HANG`). */
export const SHOT_UNDER = 1;
export const SHOT_UNDER_HANG = 2.2;

/** Grenade detonations must be near the thrower (throw range + roll) and rate-limited. */
export function checkBlast(p: V3, shooterFeet: V3): boolean {
  return hyp2(p.x - shooterFeet.x, p.z - shooterFeet.z) < 38 && Math.abs(p.y - shooterFeet.y) < 15;
}

type PlayerEnd = EndStats['players'][string];

/**
 * Clamp a host-reported result to what is physically possible in `time` seconds: kill rate,
 * headshots <= kills, per-kind/per-weapon totals <= kills, and a score bounded by the best possible kill scores
 * (tier 2, what Mission and Infiltration score at).
 */
export function clampEnd(stats: EndStats, time: number): EndStats {
  const t = Math.max(0, time);
  const players: EndStats['players'] = {};
  let totalKills = 0;
  for (const [id, p] of Object.entries(stats.players)) {
    const kills = Math.min(p.kills, Math.ceil(t * 1.5) + 2);
    totalKills += kills;
    const headshots = Math.min(p.headshots, kills);
    const byKind = { ...p.byKind };
    let sum = 0;
    for (const k of ENEMY_KINDS) {
      byKind[k] = Math.max(0, Math.min(byKind[k], kills - sum));
      sum += byKind[k];
    }
    const weaponKills: Record<string, number> = {};
    let wsum = 0;
    for (const [w, n] of Object.entries(p.weaponKills)) {
      const c = Math.max(0, Math.min(n, kills - wsum));
      weaponKills[w] = c;
      wsum += c;
    }
    players[id] = { kills, headshots, byKind, weaponKills } satisfies PlayerEnd;
  }
  const maxScore = totalKills * killScore('heavy', true, 2);
  return { ...stats, score: Math.min(stats.score, maxScore), players };
}

/** Build the local SessionStats for rewards from the host's (clamped) end report. */
export function coopSessionStats(base: SessionStats, end: EndStats, selfId: string): SessionStats {
  const me = end.players[selfId];
  return {
    ...base,
    won: end.won,
    score: end.score,
    kills: me?.kills ?? 0,
    headshots: me?.headshots ?? 0,
    byKind: me ? { ...me.byKind } : emptyKinds(),
    weaponKills: me ? { ...me.weaponKills } : {},
  };
}

/** Speed tolerance over a gear's pace (3.2.0 phase 1). */
export const MOVE_TOLERANCE = 1.15;
/** Anything else a client claims (falls, zipline, committed moves) (m/s). */
export const MAX_FREE_SPEED = 11;

/**
 * The fastest horizontal pace a client's state allows (m/s): free movement on the ground within its speed gear's
 * pace + `MOVE_TOLERANCE` (no sprint, protocol 14); everything driven by traversal or in the air
 * keeps the general cap.
 */
export function moveSpeedCap(mv: MoveState | undefined, crouched: boolean, driven: boolean, grounded: boolean): number {
  if (!mv || mv.m !== 'ground' || driven || !grounded) return MAX_FREE_SPEED;
  const pace = gearCap(mv.g, crouched);
  return pace * MOVE_TOLERANCE;
}

/** Furthest an attached client may be from where its anchor puts it (m). */
export const ATTACH_SLACK = 0.5;

/**
 * An attached client's feet against its anchor at `s`: null when within `ATTACH_SLACK` (or not settled on it), else
 * the point to clamp to (the anchor's pose, so a remote can never float off the ladder / lip it claims).
 */
export function attachedClamp(mv: MoveState | undefined, anchors: TraversalAnchors, feet: V3, height = 1.75, out: AttachPose = { x: 0, y: 0, z: 0, yaw: 0 }): AttachPose | null {
  if (!mv || !isAttachedMode(mv.m)) return null;
  const a = anchors.all[mv.a];
  if (!a) return null;
  const sub = unpackAttachSub(mv.sub);
  // blending on / off (or between a pipe's sub-states): the feet travel between the ground and the anchor
  if (sub.phase !== 'on' || sub.pipeTo) return null;
  // (a rope kicked out swings off the wall)
  if (a.kind === 'rappel' && mv.ph > 0) return null;
  const p = attachPose(a, mv.s, sub.face, height, out, a.kind === 'pipeH' ? sub.pipe : 'hands', mv.u ?? 0);
  return hyp3(feet.x - p.x, feet.y - p.y, feet.z - p.z) > ATTACH_SLACK ? p : null;
}

/**
 * (step 09, D8) The weapon a client may hold: `w` if it is in its validated lobby loadout, else the last valid id
 * (`last`; the loadout's first entry before any). An empty loadout (none sent) keeps the claim.
 */
export function hostWeapon<W extends string>(w: W, loadout: readonly W[], last: W | null): W {
  if (!loadout.length || loadout.includes(w)) return w;
  return last ?? loadout[0]!;
}

/**
 * (step 09, D8) The draw phase the host allows a client: forced 0 (holstered) while its hands are busy in the host's
 * view - attached with a holster (every anchor kind; the one-handed sidearm from a split, a rappel or an inverted
 * pipe is the exception), in a takedown (a hostage keeps the sidearm), in a team move with busy hands (braced,
 * boosting, the bottom of the human ladder; the hang-down's hanging partner keeps the sidearm) - or downed.
 */
export function hostDrawPhase(mv: MoveState | undefined, downed: boolean): number {
  if (!mv || !hostHandsFree(mv, downed)) return 0;
  return Math.max(0, Math.min(3, Math.round(mv.dw)));
}

/** (step 09) The host's busy-hands rule alone (the mode, not `dw`): false forces holstered (see hostDrawPhase). */
export function hostHandsFree(mv: MoveState, downed: boolean): boolean {
  if (downed) return false;
  const m = mv.m;
  // (hang-down, A6) head-first under the partner's hands: the pistol one-handed (the brace holding them stays busy)
  if (m === 'boost' && (mv.sub & HANG_SUB) !== 0 && (mv.sub & ROPE_SUB) === 0) return true;
  if (m === 'brace' || m === 'boost' || (m === 'stacked' && mv.sub !== 1)) return false;
  if (m === 'takedown') return false;
  if (isAttachedMode(m)) {
    return m === 'split' || m === 'rappel' || (m === 'pipeH' && unpackAttachSub(mv.sub).pipe === 'inverted');
  }
  return true;
}

/** (step 09, D8) No hip fire on the host either: a client shot counts only while the host's draw phase is drawn. */
export function hostShotAllowed(dw: number | undefined): boolean {
  return dw === 2;
}

/**
 * (step 09 fix 3, D8) The weapon a client shot counts with: only the one the host holds for it (`held`, the validated
 * `PlayerState.w`) or one in its validated lobby loadout. Anything else (a stronger gun claimed per shot) is refused
 * before the rate limit and damage read `WEAPONS[w]`.
 */
export function hostShotWeapon<W extends string>(w: W, held: W | undefined, loadout: readonly W[]): boolean {
  return (held !== undefined && w === held) || loadout.includes(w);
}

/**
 * (step 09 fix 2, D8) The echoed draw phase 0 is a host force (not latency) only when the host's busy-hands rule, run on
 * this client's current MoveState mode and the host's downed view, also forces it while the local weapon is out. A draw the host
 * simply has not seen yet mirrors as drawn and is never cancelled.
 */
export function clientForcedHolster(echoedDw: number, localDw: number, localMv: MoveState, downed: boolean): boolean {
  return echoedDw === 0 && localDw !== 0 && !hostHandsFree(localMv, downed);
}

/**
 * (section-rating S3) The client's view of the host's last rating (`rt`, already clamped by the parser) for the HUD card:
 * the section's id and title come from this map's own sector list. Null when none is rated yet (`sec` -1) or the index
 * is not one of ours (a mismatched map is not shown).
 */
export function ratingViewFromWire(rt: SectorRatingWire, defs: readonly { id: string; name: string }[]): RatingView | null {
  if (rt.sec < 0) return null;
  const d = defs[rt.sec];
  if (!d) return null;
  return {
    sectionId: d.id,
    title: d.name,
    marks: rt.marks & 15,
    synced: rt.synced,
    grant: { gadget: rt.gadget, syringe: rt.syringe, medkit: rt.medkit, alarmStep: rt.alarmStep },
  };
}

/**
 * (marlow-polish) A late joiner's / reloaded rejoiner's results lines from the `sector` message's `rh` (already clamped
 * by the parser): one view per rated section of this map, in index order, skipping `skip` (the section `rt` carries,
 * pushed on its own). No grant: those were given before we came.
 */
export function ratingViewsFromRh(rh: readonly number[], skip: number, defs: readonly { id: string; name: string }[]): RatingView[] {
  const out: RatingView[] = [];
  for (let i = 0; i < rh.length && i < defs.length; i++) {
    if (i === skip) continue;
    const r = unpackRated(rh[i]!);
    if (!r) continue;
    const d = defs[i]!;
    out.push({ sectionId: d.id, title: d.name, marks: r.marks, synced: r.synced, grant: { gadget: 0, syringe: 0, medkit: 0, alarmStep: 0 } });
  }
  return out;
}
