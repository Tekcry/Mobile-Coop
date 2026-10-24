/**
 * (locomotion step 10) The elbow strike (bible 5.4): `fire` pressed while holstered. A committed move: the press plays
 * the anticipation at once; solo and the co-op host start it themselves (the same check as a client's,
 * `checkCommitted`, no message), a client asks the host (`cmove`) and aligns to its start time (`cstart {t0}`) or
 * blends back with no hit (`cdeny`, or no reply in 0.4 s). Contact is resolved only where the guards live (solo,
 * host) at t0 + 0.12 s: reach and cone again, then one-hit knock-out, noise 4 m.
 */
import { Vector3 } from '../core/babylon';
import { gearCap } from '../player/speedGears';
import { STRIKE, STRIKE_DUR, STRIKE_WHIFF_DUR, strikePhase, strikeReach, strikeTargetable } from './elbowStrike';
import { strikeSimSet, strikeWarp } from '../anim/strikeBody';
import type { CDenyReason } from './committedMoves';
import type { GameState } from './gameState';

/** (anim-n4d, n4c polish 7) After an accept's rewind the pose clock gains on `t` this much per second (its lead
 *  drains at half pace: the posed phase still moves on, never back). */
const LEAD_CATCH = 0.5;

export class StrikeController {
  /** Seconds into the running strike (-1 = none). */
  t = -1;
  /** Target guard id ('' = a whiff). */
  tid = '';
  /** Request id (wraps at 65536). */
  id = 0;
  /** Host approved (solo / host: at once). */
  approved = false;
  /** Contact resolved (or skipped). */
  resolved = false;
  /** Denied / timed out / interrupted: blending back (s left; -1 = not). */
  back = -1;
  private backFrom = 0;
  private hp0 = 0;
  private queued = false;
  /** (anim-n4d, n4c polish 7) The pose clock's lead on `t` (s): a co-op client's accept rewinds `t` onto the host's
   *  clock (gameplay unchanged); the pose (and the wire's `ph`) keeps its place and `t` catches up (`LEAD_CATCH`). */
  private lead = 0;
  /** False on a co-op client: the host resolves contact. */
  authority = true;
  /** (anim-rework S1, M3) The running strike is the lethal one (RT / LMB held holstered); false = the knockout (an RT /
   *  LMB tap, KBM Z). Solo and the host
   *  resolve it; a client's strike is a knockout on the host (the wire carries no lethal flag: stub). */
  lethal = false;
  /** Tests: hold the strike at this phase (-1 = off). */
  freezeAt = -1;
  /** Counts and the last denial (tests, HUD). */
  count = { started: 0, ko: 0, stagger: 0, miss: 0, denied: 0 };
  lastDenied = '';
  /** Sim seconds from the last denial to the strike's end (tests: back to `ground` within 0.3 s). */
  lastBackT = -1;
  private sinceDeny = -1;

  constructor(private g: GameState) {}

  get active(): boolean {
    return this.t >= 0;
  }

  /** MoveState phase 0..1 (blending back after a denial): the pose clock (`t` plus the accept's `lead`). */
  get ph(): number {
    if (this.t < 0) return 0;
    if (this.back >= 0) return this.backFrom * (this.back / STRIKE.blendBack);
    return strikePhase(this.t + this.lead);
  }

  /** May a strike start now: alive, holstered, on the ground and free (not attached, traversing, in a takedown,
   *  a team move or carrying). */
  canStart(): boolean {
    const g = this.g;
    const tr = g.traversal;
    return (
      g.player.alive &&
      g.weapons.drawPhase === 0 &&
      !g.weapons.reloadBusy &&
      g.player.controller.grounded &&
      !tr.attached &&
      !tr.committed &&
      !g.takedown.active &&
      !g.team.active &&
      !(g.carrier?.carrying ?? false)
    );
  }

  /** The nearest live, unseized guard in reach and cone of the camera's facing (null = a whiff). */
  pickTarget(): string {
    const g = this.g;
    const pp = g.player.position;
    const yaw = g.player.cam.yaw;
    let best = '';
    let bestD = Infinity;
    for (const e of g.takedownVictims()) {
      // (G42) dogs cannot be palm-struck: never picked (the strike whiffs past them)
      if (!e.alive || e.taken || !strikeTargetable(e.def)) continue;
      if (Math.abs(e.pos.y - pp.y) > 1) continue;
      const d = strikeReach(e.pos.x - pp.x, e.pos.z - pp.z, yaw);
      if (d >= 0 && d < bestD) {
        bestD = d;
        best = e.id;
      }
    }
    return best;
  }

  /** Start a strike (the press; tests may name the target). */
  begin(target?: string): boolean {
    if (this.active || !this.canStart()) return false;
    const g = this.g;
    this.tid = target ?? this.pickTarget();
    this.t = 0;
    this.lead = 0;
    this.back = -1;
    this.resolved = false;
    this.approved = false;
    this.queued = false;
    this.sinceDeny = -1;
    this.id = (this.id + 1) & 0xffff;
    this.hp0 = g.target.health.hp;
    this.count.started++;
    // the body turns to the guard (the hip turn carries the rest)
    if (this.tid) {
      const e = this.find(this.tid);
      if (e) g.player.controller.yaw = Math.atan2(e.pos.x - g.player.position.x, e.pos.z - g.player.position.z);
    }
    if (g.net?.commitRequest) g.net.commitRequest('strike', this.id, this.tid);
    else this.approved = true;
    return true;
  }

  /** Host: approved; `elapsed` = host-now - t0 (s). */
  accepted(id: number, elapsed: number): void {
    if (!this.active || id !== this.id || this.back >= 0) return;
    this.approved = true;
    // (never ahead of the local clock: the press started it before t0, so only a late estimate of the host's
    // clock reads further on); (anim-n4d) the pose keeps its place: the rewind goes into the lead
    const t = Math.max(0, Math.min(this.t, elapsed));
    this.lead += this.t - t;
    this.t = t;
  }

  /** Host: refused (or interrupted); blend back with no hit. */
  denied(id: number, reason: CDenyReason | string): void {
    if (!this.active || id !== this.id) return;
    this.cancel(reason);
  }

  private cancel(reason: string): void {
    if (this.back >= 0) return;
    this.count.denied++;
    this.lastDenied = reason;
    this.backFrom = this.ph;
    this.back = STRIKE.blendBack;
    this.resolved = true;
    this.sinceDeny = 0;
  }

  /** Fixed step (before the player's movement). */
  fixedUpdate(dt: number, pressed: boolean, lethal = false): void {
    const g = this.g;
    // (anim-natural N4c) the tuner's Elbow strike follow: the local player's elbow arc (this strike or a takedown's
    // blow, both posed by `melee`) as it stood after the last step
    strikeSimSet(g.player.pose.melee >= 0);
    if (pressed) this.lethal = lethal;
    if (!this.active) {
      // (F1b) no swing at nothing: the press only starts a strike when a guard is in reach
      if (pressed && this.pickTarget() !== '') this.begin();
      if (!this.active) {
        if (this.wasActive) g.player.pose.melee = -1;
        this.wasActive = false;
        return;
      }
    } else if (pressed && this.t >= STRIKE.hitAt && this.back < 0) this.queued = true;
    this.wasActive = true;
    if (this.sinceDeny >= 0) this.sinceDeny += dt;
    if (!g.player.alive) return this.end();
    // movement locked to gear 1 (the root never lunges: no root motion is added)
    const c = g.player.controller;
    c.speedCap = Math.min(c.speedCap, gearCap(1, c.crouched));
    if (this.back >= 0) {
      this.back -= dt;
      if (this.back <= 0) return this.end();
    } else {
      const frozen = this.freezeAt >= 0 && strikePhase(this.t) >= this.freezeAt;
      if (!frozen) {
        this.t += dt;
        this.lead = Math.max(0, this.lead - dt * LEAD_CATCH);
      }
      if (!this.approved && this.t > STRIKE.replyTimeout) this.cancel('timeout');
      // the host decides interruptions: damage before contact cancels it
      else if (this.authority && !this.resolved && g.target.health.hp < this.hp0) {
        this.cancel('hit');
        g.net?.commitCancel?.(this.id, 'hit');
      } else if (this.authority && !this.resolved && this.t >= STRIKE.hitAt) {
        this.resolved = true;
        const p = g.player.position;
        this.applyHit('local', p, g.player.controller.yaw, g.player.cam.yaw, this.tid, STRIKE.contactSlack);
      }
      if (this.t >= (this.tid ? STRIKE_DUR : STRIKE_WHIFF_DUR)) return this.end();
    }
    // (anim-n4c M1) the pose plays the arc warped onto the hit (strikeWarp): the elbow lands at `STRIKE.hitAt`
    g.player.pose.melee = strikeWarp(this.ph);
  }

  private wasActive = false;

  private end(): void {
    if (this.sinceDeny >= 0) this.lastBackT = this.sinceDeny;
    this.t = -1;
    this.lead = 0;
    this.back = -1;
    this.sinceDeny = -1;
    this.g.player.pose.melee = -1;
    const again = this.queued;
    this.queued = false;
    if (again && this.pickTarget() !== '') this.begin();
  }

  private find(id: string): { readonly id: string; readonly pos: Vector3; readonly yaw: number } | null {
    for (const e of this.g.takedownVictims()) if (e.id === id) return e;
    return null;
  }

  /**
   * Contact (solo / host only), for the local player or a client (`by`): the guard still in reach (+ `slack`) and
   * in the cone of the body or the aim, then the result table. Returns what happened.
   */
  applyHit(by: string, at: Vector3, bodyYaw: number, aimYaw: number, tid: string, slack: number): 'ko' | 'stagger' | 'miss' {
    const g = this.g;
    const em = g.enemyMgr;
    let res: 'ko' | 'stagger' | 'miss' = 'miss';
    const e = tid && em ? em.enemies.find((x) => x.id === tid) : undefined;
    // (G42) a dog is never knocked out by the strike, whoever named it (a client's request too)
    if (e && e.alive && !e.taken && strikeTargetable(e.def) && Math.abs(e.pos.y - at.y) <= 1) {
      const dx = e.pos.x - at.x;
      const dz = e.pos.z - at.z;
      if (strikeReach(dx, dz, bodyYaw, slack) >= 0 || strikeReach(dx, dz, aimYaw, slack) >= 0) {
        // (G42 / G155) one hit knocks out any guard from any side; (F1a) the lethal strike (the local player's RT) kills
        res = 'ko';
        const dir = new Vector3(dx, 0, dz).normalize();
        const h = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: by, sourcePos: at.clone(), impulse: 1, takedown: 'strike' as const };
        if (this.lethal && by === 'local') e.killOutright(h);
        else e.knockOut(h);
        em!.hear(at, STRIKE.noise);
      }
    }
    this.count[res]++;
    if (by === 'local') g.events.emit('strike', { result: res });
    return res;
  }

  /** The respawn (a death, a bay or section restart): no strike, and the `melee` arc at rest. (strike-pops, n4d polish 1)
   *  A kill's follow-through plays the same arc (`TakedownController.tailU`, up to 0.31 s after the kill); the restart
   *  sites only reset a takedown still running, so a restart within the tail moved the player with the arm still
   *  swinging: it ends here too. */
  reset(): void {
    this.g.takedown.endTail();
    this.t = -1;
    this.lead = 0;
    this.back = -1;
    this.queued = false;
    this.lethal = false;
    this.wasActive = false;
    this.g.player.pose.melee = -1;
    strikeSimSet(false); // (anim-n4c) the tuner's Elbow strike follow
  }
}
