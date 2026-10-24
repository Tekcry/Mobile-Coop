/**
 * (mission KIT-PULL) The pull-up (PLAN 4a, M3): one player (b, the holder) crouches at a lip and offers; the partner
 * (a) below jumps for the hands, the holder catches in a window around the jump's apex and hauls them up; the partner
 * scrambles over the edge onto the top beside the holder. Registered through the kit registry (`registry.ts`; the team
 * controller loads this file with `import.meta.glob`), so no other file changes.
 *
 * The flow on the shared team clock (the host's start is t = 0 on both pages):
 * - offer (b `pullOffer`, wire `brace` + `PULL_SUB`): crouched at an edge with the partner below at a lip height in
 *   `PULL.min`..`PULL.max` (out of a solo climb, inside a jump + catch). B / Co-op / `TEAM.offerTime` / leaving the
 *   ground cancel it (as the leg-up / hang-down / rope offers).
 * - request: the partner under the holder's hands presses Co-op on the ground; the host's rule is `checkPullRequest`.
 * - jump (a `pullJump`): the game's own jump arc (`LEAP.vy`, gravity 18) under the catch point; b `pullCatch` braced.
 * - catch window (`PULL.catchOpen`..`catchClose` from the start: the feet within `PULL.catchBand` of the apex): the
 *   holder's Co-op in it is the catch (`teamHangEnd('pull')`); a press before it, or none by its end, is a miss
 *   (`teamHangEnd('drop')`). The host relays the verdict (`tend` k) to both (NET: `pullVerdict` on its own clock).
 * - haul (a `pullHang` `PULL.haul` s up to the hands-at-the-lip height; b `pullHaul`, committed), then the scramble
 *   (a `pullScramble` `PULL.scramble` s, the rope top-out's eased path) onto the top beside the holder, crouched.
 * - a miss: the partner finishes the jump and lands on the floor (`PULL.jumpRise` m, no harm: `hangLanding`); the
 *   holder is back in the offer (retry). B while catching lets go (the offer ends, the partner drops).
 * Pure rules first (Babylon-free); the controller side reuses one override and one vector per run (no allocation).
 */
import { Vector3 } from '../../core/babylon';
import { hyp2 } from '../../core/mathx';
import { LEAP, TEAM, WALL_JUMP } from '../../config/movement';
import { G } from '../../physics/groups';
import { REACH } from '../../world/anchors';
import { hangLanding, hangPointOk, PULL_SUB, ropeTopPath, ropeTopY, type TeamDenial, type TeamRequest } from '../teamMoves';
import { registerKitMove, type KitHost, type KitMove } from './registry';
import type { MoveOverride } from '../../player/playerController';
import type { TeamMate, TeamStart } from '../teamController';

/** The airborne controller's gravity (m/s^2; physics/havok.ts:15 `GRAVITY` -18, not imported: it loads Havok). */
const GRAV = 18;
const APEX_T = LEAP.vy / GRAV;
/** The catch window's half width (s): the feet within `CATCH_BAND` m of the jump's apex. */
const CATCH_BAND = 0.15;
const CATCH_HALF = Math.sqrt((2 * CATCH_BAND) / GRAV);

/**
 * The pull-up's numbers (starting values, G10), each from the game's own constants:
 * - `min` 4.3: a lip the partner cannot climb alone: past the solo wall jump (`WALL_JUMP.maxUp` 3.8) by the level
 *   standard's 0.5 margin (LD 11.3, the co-op band `COOP_BAND.min`, ctcourseGreybox.ts:29); lower is a solo climb.
 * - `max` 4.5: the leg-up's top (`TEAM.boostMax`): the pull serves the same co-op lip band (G57, 4.3-4.5).
 * - `jumpReach` 2.7: the partner's hands at the jump (`REACH.grabMax`, a lip a jump grabs); `catchDrop` 1.8 = max -
 *   jumpReach: how far under the edge the holder's hands reach (the holder's catch pose must reach it).
 * - `reach` 1.6: the partner's plan distance to the catch point (`TEAM.relayReach`: a climber under a hanger).
 * - `jumpRise` 0.87 m at `apexT` 0.31 s, back down at `landT` 0.62 s (`LEAP.vy` 5.6, gravity 18).
 * - `catchOpen` 0.18 .. `catchClose` 0.44 s: the feet within 0.15 m of the apex.
 * - `haul` 0.9 s (`TEAM.hangPull`, the hang-down's pull up), `scramble` 1.1 s (`TEAM.ropeTop`, the rope's top-out).
 */
export const PULL = {
  min: WALL_JUMP.maxUp + 0.5,
  max: TEAM.boostMax,
  jumpReach: REACH.grabMax,
  catchDrop: TEAM.boostMax - REACH.grabMax,
  reach: TEAM.relayReach,
  jumpRise: (LEAP.vy * LEAP.vy) / (2 * GRAV),
  apexT: APEX_T,
  landT: 2 * APEX_T,
  catchBand: CATCH_BAND,
  catchOpen: APEX_T - CATCH_HALF,
  catchClose: APEX_T + CATCH_HALF,
  haul: TEAM.hangPull,
  scramble: TEAM.ropeTop,
  /** (NET) The host's allowance for a client holder's catch on its way in (s): a claim up to `catchClose` + this after
   *  the host's start is a catch (covers a round trip of 300 ms). */
  claimLag: 0.3,
  /** (NET) The partner holds its landing this long for the host's verdict (s): landT + this is past the latest catch the
   *  host takes (catchClose + claimLag 0.74 < 0.87), so a host partner never lands before its verdict. */
  verdictWait: 0.25,
} as const;

// ---- the pure rules ----

export type PullBand = 'low' | 'ok' | 'high';

/** A lip `up` m over the partner's floor: 'low' (a solo climb reaches it), 'ok', 'high' (out of a jump + catch). */
export function pullBand(up: number): PullBand {
  return up < PULL.min ? 'low' : up > PULL.max ? 'high' : 'ok';
}

/** The partner's feet over the take-off floor `t` s into the jump (the game's jump arc; 0 before / after it). */
export function pullJumpY(t: number): number {
  if (t <= 0 || t >= PULL.landT) return 0;
  return LEAP.vy * t - 0.5 * GRAV * t * t;
}

export type PullCatch = 'early' | 'open' | 'late';

/** The holder's Co-op `t` s after the start: before the window, in it (the catch) or past it. */
export function pullCatchAt(t: number): PullCatch {
  return t < PULL.catchOpen ? 'early' : t <= PULL.catchClose ? 'open' : 'late';
}

/**
 * (NET, host) The verdict on the holder's claim `since` s after the host's start: a catch only inside the window, its
 * end widened by `lag` s (the claim's trip to the host); anything else is a miss. (NET2) The open allows one 60 Hz tick:
 * the host holder's own clock leads `since` by a tick (the team controller steps before the host's clock advances), so
 * its catch on the first open frame is a catch; a client's claim only ever arrives later than its press.
 */
export function pullVerdict(since: number, claim: 'pull' | 'drop', lag = 0): 'pull' | 'drop' {
  return claim === 'pull' && since >= PULL.catchOpen - 1 / 60 && since <= PULL.catchClose + lag ? 'pull' : 'drop';
}

/** A missed catch's landing: the jump's own fall (`PULL.jumpRise`), crouched, never harmful (`hangLanding`). */
export function pullMissLanding(): { crouch: true; harm: boolean } {
  return hangLanding(PULL.jumpRise);
}

/**
 * The host's rule for a pull-up request (after the shared rate / alive / self checks): `b` offers it (braced with
 * `PULL_SUB`), `a` asks standing on the ground, the claimed catch point (`land`, at the holder's floor) is by the holder
 * (`hangPointOk`), the lip is in the band (`b` over `a`) and `a` stands within `PULL.reach` of the catch point.
 */
export function checkPullRequest(r: TeamRequest): TeamDenial | null {
  if (r.b.mode !== 'brace' || ((r.b.sub ?? 0) & PULL_SUB) === 0) return 'notOffering';
  if (r.a.mode !== 'ground') return 'busy';
  const l = r.land;
  if (!l || !hangPointOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z)) return 'noTarget';
  const band = pullBand(r.b.y - r.a.y);
  if (band === 'low') return 'noTarget';
  if (band === 'high') return 'tooHigh';
  if (hyp2(r.a.x - l.x, r.a.z - l.z) > PULL.reach) return 'far';
  return null;
}

// ---- the controller side ----

/** What the pull-up remembers per controller (one per kind per controller). */
export interface PullRun {
  /** The catch point (x / z, just past the edge), the edge's height (the holder's floor), the partner's floor. */
  cx: number;
  cz: number;
  edgeY: number;
  floorY: number;
  /** The partner: the current path's start, the top spot beside the holder, the facing (into the wall). */
  x0: number;
  y0: number;
  z0: number;
  tx: number;
  ty: number;
  tz: number;
  yaw: number;
  /** The holder sent its verdict (catch / miss) for this attempt. */
  sent: boolean;
  /** The partner: the host's verdict (0 none yet, 1 caught, 2 missed); falling from the hang (its speed). */
  verdict: number;
  fall: boolean;
  vy: number;
  /** Counts and the last miss (tests, debugging). */
  catches: number;
  misses: number;
  tops: number;
  lastMiss: '' | 'early' | 'late' | 'cancel' | 'host' | 'gone';
  readonly kin: Vector3;
  readonly ov: MoveOverride;
  readonly path: { rise: number; across: number };
  readonly ra: Vector3;
  readonly rb: Vector3;
}

function newPullRun(): PullRun {
  const kin = new Vector3();
  return {
    cx: 0,
    cz: 0,
    edgeY: 0,
    floorY: 0,
    x0: 0,
    y0: 0,
    z0: 0,
    tx: 0,
    ty: 0,
    tz: 0,
    yaw: 0,
    sent: false,
    verdict: 0,
    fall: false,
    vy: 0,
    catches: 0,
    misses: 0,
    tops: 0,
    lastMiss: '',
    kin,
    ov: { kinematic: kin, yaw: 0, turnRate: 20, crouch: false },
    path: { rise: 0, across: 0 },
    ra: new Vector3(),
    rb: new Vector3(),
  };
}

/** The team controller's drop search (`KitHost.hangPoint`: the hang-down's, reused for the catch point). */
function dropAhead(h: KitHost, px: number, py: number, pz: number, yaw: number): { x: number; z: number; floorY: number } | null {
  return h.hangPoint(px, py, pz, yaw);
}

const smooth5 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10));

/** The holder sends its verdict once per attempt (the host relays it to both as `tend` k). */
function send(h: KitHost, run: PullRun, k: 'pull' | 'drop'): void {
  if (run.sent) return;
  run.sent = true;
  h.g.net?.teamHangEnd?.(k);
}

/** The holder missed (or the host said so): back to the offer, the partner may jump again. */
function missed(h: KitHost, run: PullRun, why: PullRun['lastMiss']): void {
  send(h, run, 'drop');
  run.misses++;
  run.lastMiss = why;
  h.state = 'pullOffer';
  h.t = 0;
  h.partner = '';
}

/** The top spot beside the holder at the edge (`run.edgeY`): a side with floor, else just behind them. */
function topSpot(h: KitHost, run: PullRun, hx: number, hz: number, hyaw: number): void {
  const sx = Math.cos(hyaw);
  const sz = -Math.sin(hyaw);
  const y = run.edgeY;
  for (let i = 0; i < 2; i++) {
    const k = i === 0 ? 0.8 : -0.8;
    const x = hx + sx * k;
    const z = hz + sz * k;
    run.ra.set(x, y + 1.0, z);
    run.rb.set(x, y - 0.4, z);
    const fh = h.g.ballistics.ray(run.ra, run.rb, G.STATIC);
    if (fh.hit && Math.abs(fh.point.y - y) < 0.3) {
      run.tx = x;
      run.ty = fh.point.y;
      run.tz = z;
      return;
    }
  }
  run.tx = hx - Math.sin(hyaw) * 0.6;
  run.ty = y;
  run.tz = hz - Math.cos(hyaw) * 0.6;
}

/** The partner's body on its kinematic path this step. */
function place(h: KitHost, run: PullRun, x: number, y: number, z: number, crouch: boolean): void {
  run.kin.set(x, y, z);
  run.ov.yaw = run.yaw;
  run.ov.crouch = crouch;
  h.g.player.controller.override = run.ov;
}

/** The partner under an offering holder: the prompt, and on Co-op the request (or a polite refusal). */
function partnerIdle(h: KitHost, m: TeamMate, coopPressed: boolean): boolean {
  const c = h.g.player.controller;
  if (!h.prompt) {
    h.prompt = "Co-op: jump for your partner's hands (pull-up)";
    h.promptAt.set(m.pos.x, m.pos.y - 0.6, m.pos.z);
  }
  if (!coopPressed) return false;
  const p = dropAhead(h, m.pos.x, m.pos.y, m.pos.z, m.yaw);
  if (!p) h.refused('No edge in front of your partner');
  else if (hyp2(p.x - c.pos.x, p.z - c.pos.z) > PULL.reach) h.refused("Get under your partner's hands");
  else h.kitRequest('pull', m.id, -1, 0, m.pos.y, p.x, p.z);
  return true;
}

/** Plan distance from a mate to the holder within which the pull-up is in play (the catch point lies ahead of them). */
const NEAR = PULL.reach + TEAM.hangProbe + 0.2;

export const PULL_UP: KitMove<PullRun> = {
  kind: 'pull',
  times: { pullCatch: PULL.catchClose, pullHaul: PULL.haul + PULL.scramble, pullJump: PULL.landT, pullHang: PULL.haul, pullScramble: PULL.scramble },
  paired: true,
  claimsPoint: true,
  newRun: newPullRun,
  check: checkPullRequest,

  idle(h, run, coopPressed, free) {
    if (!free) return null;
    const c = h.g.player.controller;
    const ms = h.mates();
    // the partner's side: a mate above us offering the pull-up
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      if (m.mode !== 'brace' || ((m.sub ?? 0) & PULL_SUB) === 0) continue;
      const up = m.pos.y - c.pos.y;
      if (up < PULL.min - 0.4 || up > PULL.max + 0.4 || hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z) > NEAR) continue;
      return partnerIdle(h, m, coopPressed);
    }
    // the holder's side: crouched (by choice) at an edge with a mate below at the band
    if (!(c.crouched && c.crouchIntent && !c.autoCrouch)) return null;
    let below: TeamMate | null = null;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i]!;
      const up = c.pos.y - m.pos.y;
      if (up >= PULL.min - 0.4 && up <= PULL.max + 0.4 && hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z) <= NEAR) {
        below = m;
        break;
      }
    }
    if (!below) return null;
    const p = dropAhead(h, c.pos.x, c.pos.y, c.pos.z, c.yaw);
    if (!p || !Number.isFinite(p.floorY) || pullBand(c.pos.y - p.floorY) !== 'ok' || Math.abs(below.pos.y - p.floorY) > 0.4) return null;
    if (!h.prompt) {
      h.prompt = 'Co-op: offer a pull-up (catch your partner as they jump)';
      h.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
    }
    if (!coopPressed) return false;
    run.cx = p.x;
    run.cz = p.z;
    run.edgeY = c.pos.y;
    run.floorY = p.floorY;
    run.sent = false;
    h.state = 'pullOffer';
    h.t = 0;
    h.count.offers++;
    h.partner = '';
    return true;
  },

  begin(h, run, s: TeamStart, self) {
    const c = h.g.player.controller;
    run.sent = false;
    run.verdict = 0;
    run.fall = false;
    run.vy = 0;
    if (s.a === self && s.l) {
      // the partner: jump at once for the hands over the catch point `l` (x, the edge's y, z)
      h.partner = s.b;
      h.state = 'pullJump';
      h.t = 0;
      run.cx = s.l[0];
      run.edgeY = s.l[1];
      run.cz = s.l[2];
      run.x0 = c.pos.x;
      run.y0 = c.pos.y;
      run.z0 = c.pos.z;
      run.floorY = c.pos.y;
      // facing the wall: from the catch point to the holder (else from us to the catch point)
      const hp = h.partnerPos();
      const hyaw = h.partnerYaw();
      if (hp && hyp2(hp.x - run.cx, hp.z - run.cz) > 0.05) run.yaw = Math.atan2(hp.x - run.cx, hp.z - run.cz);
      else run.yaw = Math.atan2(run.cx - run.x0, run.cz - run.z0);
      topSpot(h, run, hp ? hp.x : run.cx, hp ? hp.z : run.cz, Number.isFinite(hyaw) ? hyaw : run.yaw + Math.PI);
      place(h, run, run.x0, run.y0, run.z0, false);
    } else if (s.b === self) {
      if (h.state === 'pullOffer') {
        h.partner = s.a;
        h.state = 'pullCatch';
        h.t = 0;
      } else send(h, run, 'drop'); // no longer offering: the partner falls back at once
    }
  },

  step(h, run, dt, coopPressed, bPressed) {
    const g = h.g;
    const c = g.player.controller;
    h.t += dt;
    switch (h.state) {
      case 'pullOffer':
        // crouched at the edge, braced; the partner jumps (B / Co-op / the timeout / leaving the ground end it)
        h.hold();
        h.prompt = 'Pull-up offered: your partner jumps, Co-op to catch';
        h.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
        if (bPressed || coopPressed || h.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          h.end(false);
        }
        return;
      case 'pullCatch': {
        h.hold();
        if (!h.partnerPos()) {
          h.endWhy = 'pull: partner gone';
          run.lastMiss = 'gone';
          h.end(true);
          return;
        }
        const at = pullCatchAt(h.t);
        h.prompt = at === 'open' ? 'Co-op: catch!' : 'Catch: Co-op as your partner reaches your hands (B lets go)';
        h.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
        if (bPressed) {
          // let go: the offer ends, the partner drops back
          send(h, run, 'drop');
          run.lastMiss = 'cancel';
          c.swallowCrouch = true;
          h.end(false);
        } else if (coopPressed && at === 'open') {
          send(h, run, 'pull');
          run.catches++;
          h.state = 'pullHaul';
          h.t = 0;
        } else if (coopPressed) missed(h, run, 'early');
        else if (at === 'late') missed(h, run, 'late');
        return;
      }
      case 'pullHaul':
        // committed: haul the partner up to the lip, braced while they scramble over
        h.hold();
        h.prompt = null;
        if (!h.partnerPos()) {
          h.endWhy = 'pull: partner gone';
          h.end(true);
        } else if (h.t >= PULL.haul + PULL.scramble) h.end(false);
        return;
      case 'pullJump': {
        h.prompt = null;
        if (run.verdict === 1 && !run.fall) {
          // caught: up to the hands from where we are
          run.x0 = c.pos.x;
          run.y0 = c.pos.y;
          run.z0 = c.pos.z;
          h.state = 'pullHang';
          h.t = 0;
          place(h, run, run.x0, run.y0, run.z0, false);
          g.player.pose.traverse = 'hang';
          g.player.pose.traverseT = 0;
          return;
        }
        let y: number;
        if (run.fall) {
          // let go from the hang: a plain fall to the floor
          run.vy += GRAV * dt;
          y = Math.max(run.floorY, c.pos.y - run.vy * dt);
          place(h, run, c.pos.x, y, c.pos.z, true);
        } else {
          // the jump under the catch point; a miss comes back down on the same arc
          const e = smooth5(h.t / PULL.apexT);
          y = run.floorY + pullJumpY(h.t);
          place(h, run, run.x0 + (run.cx - run.x0) * e, y, run.z0 + (run.cz - run.z0) * e, false);
        }
        g.player.pose.traverse = 'hop';
        g.player.pose.traverseT = Math.min(1, h.t / PULL.landT);
        if (run.fall ? y <= run.floorY + 1e-3 : h.t >= PULL.landT) {
          // (NET) landed with no verdict yet: held on the floor for it a moment (the holder's catch may still be on
          // its way through the host); then a miss, said to the host so a catch arriving after this lets go
          if (!run.fall && run.verdict === 0) {
            if (h.t < PULL.landT + PULL.verdictWait) return;
            send(h, run, 'drop');
          }
          // back on the floor: missed (or dropped)
          if (!run.fall) run.misses++;
          h.endWhy = run.fall ? 'pull: dropped from the hang' : 'pull: missed catch';
          if (run.fall) c.setCrouchToggle();
          h.end(false);
        }
        return;
      }
      case 'pullHang': {
        // hauled up the wall by the hands to the lip; the holder gone (left the session) lets go at once
        h.prompt = null;
        if (!h.partnerPos()) {
          run.fall = true;
          run.vy = 0;
          h.state = 'pullJump';
          h.t = 0;
          return;
        }
        const k = Math.min(1, h.t / PULL.haul);
        const e = smooth5(k);
        const hy = ropeTopY(run.edgeY);
        place(h, run, run.x0 + (run.cx - run.x0) * e, run.y0 + (hy - run.y0) * e, run.z0 + (run.cz - run.z0) * e, false);
        g.player.pose.traverse = 'hang';
        g.player.pose.traverseT = k;
        if (k >= 1) {
          run.x0 = run.cx;
          run.y0 = hy;
          run.z0 = run.cz;
          h.state = 'pullScramble';
          h.t = 0;
        }
        return;
      }
      case 'pullScramble': {
        // over the edge onto the top beside the holder (the rope top-out's eased path, from still)
        h.prompt = null;
        const k = Math.min(1, h.t / PULL.scramble);
        const p = ropeTopPath(k, 0, run.path);
        place(h, run, run.x0 + (run.tx - run.x0) * p.across, run.y0 + (run.ty - run.y0) * p.rise, run.z0 + (run.tz - run.z0) * p.across, false);
        g.player.pose.traverse = 'climbUp';
        g.player.pose.traverseT = k;
        if (k >= 1) {
          run.tops++;
          c.setCrouchToggle();
          h.end(false);
        }
        return;
      }
      default:
        h.end(true);
    }
  },

  ended(h, run, k) {
    switch (h.state) {
      case 'pullOffer':
        // the end of an earlier attempt (the pair is gone): the offer stands
        return;
      case 'pullCatch':
        // the partner left (no k) ends it; the host's miss puts the offer back
        if (k === undefined) h.end(false);
        else if (k === 'drop') missed(h, run, 'host');
        return;
      case 'pullHaul':
        if (k === undefined) {
          h.endWhy = 'pull: partner gone';
          h.end(true);
        } else if (k === 'drop') {
          // the host refused the catch (late on its clock): back to the offer
          run.catches--;
          missed(h, run, 'host');
        }
        return;
      case 'pullJump':
        if (run.verdict === 0) run.verdict = k === 'pull' ? 1 : 2;
        return;
      case 'pullHang':
        // the holder left mid-haul: let go
        if (k === undefined) {
          run.fall = true;
          run.vy = 0;
          h.state = 'pullJump';
          h.t = 0;
        }
        return;
      default:
        // the scramble is over the edge already: it finishes
        return;
    }
  },

  end(h, run) {
    const g = h.g;
    const c = g.player.controller;
    // the holder leaving the catch unsent (dead, gone): the partner must not wait for it
    if (h.state === 'pullCatch') send(h, run, 'drop');
    if (c.override === run.ov) c.override = null;
    const tr = g.player.pose.traverse;
    if (tr === 'hop' || tr === 'hang' || tr === 'climbUp') g.player.pose.traverse = 'none';
  },
};

registerKitMove(PULL_UP);
