import { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import { G } from '../physics/groups';
import { TEAM } from '../config/movement';
import { findJumpTarget, type JumpTarget } from '../world/anchors';
import { attachPose } from '../player/attach';
import { boostPath, canBrace, type TeamKind } from './teamMoves';
import type { GameState } from './gameState';

/** A team-mate as the team moves see them (from the net layer). */
export interface TeamMate {
  id: string;
  pos: Vector3;
  yaw: number;
  /** Their movement mode (`MoveState.m`). */
  mode: string;
}

/** A team move the host started: `a` climbs, `b` is braced; the boost's target anchor and where on it. */
export interface TeamStart {
  kind: TeamKind;
  a: string;
  b: string;
  target: number;
  s: number;
}

export type TeamState = 'none' | 'brace' | 'boost' | 'assist' | 'ladderUp' | 'top' | 'bottom';

/**
 * Co-op team moves (3.2.0 phase 5), the local side: brace against a wall (hold Y with a team-mate near), ask a braced
 * team-mate for a boost (tap Y) or the human ladder (hold Y), and play what the host starts: the climber's step-up
 * and toss onto the target anchor, or the climb onto the shoulders and the top (aim / fire, Y grabs a lip in reach,
 * B hops down); the braced player assists, or holds still as the bottom (B ends it). The host checks every request
 * (`teamMoves.ts` `checkTeamRequest`) on both players' movement states.
 */
export class TeamController {
  state: TeamState = 'none';
  /** The partner in the current move (or the braced team-mate on offer). */
  partner = '';
  /** What a Y press would ask for now (a braced team-mate in reach) and that mate. */
  offer: { mate: TeamMate; boost: JumpTarget | null } | null = null;
  /** Seconds into the current committed part (boost, climbing up). */
  private t = 0;
  private start: TeamStart | null = null;
  private from = new Vector3();
  private kin = new Vector3();
  private pt = { x: 0, y: 0, z: 0 };
  /** The Y press being timed near a braced mate: tap = boost, held = ladder (s; < 0 none). */
  private pressT = -1;
  /** Counts (tests): braces, boosts, ladders, denials. */
  readonly count = { braces: 0, boosts: 0, ladders: 0, denied: 0, ends: 0 };
  lastDenied = '';
  private a = new Vector3();
  private b = new Vector3();

  constructor(private g: GameState) {}

  /** Team-mates from the net layer (none in single player). */
  private mates(): readonly TeamMate[] {
    return this.g.net?.teamMates?.() ?? [];
  }

  get active(): boolean {
    return this.state !== 'none';
  }

  /** Busy with a move (not just braced): traversal / cover / takedowns stand aside. */
  get busy(): boolean {
    return this.state !== 'none' && this.state !== 'brace';
  }

  /** Distance (m) to a wall straight behind the body (from the hips), or Infinity. */
  private wallBehind(): number {
    const g = this.g;
    const c = g.player.controller;
    const bx = -Math.sin(c.yaw);
    const bz = -Math.cos(c.yaw);
    this.a.set(c.pos.x, c.pos.y + 1.0, c.pos.z);
    this.b.set(c.pos.x + bx * (TEAM.wallBehind + 0.3), c.pos.y + 1.0, c.pos.z + bz * (TEAM.wallBehind + 0.3));
    const h = g.ballistics.ray(this.a, this.b, G.STATIC);
    return h.hit ? h.distance : Infinity;
  }

  /**
   * Fixed step (before traversal). `yPressed` / `yHeld` / `yHeldT` the Y control, `bPressed` the B control. Returns
   * true when the team move took Y this step (traversal then gets no press).
   */
  fixedUpdate(dt: number, yPressed: boolean, yHeld: boolean, yHeldT: number, bPressed: boolean): boolean {
    const g = this.g;
    const c = g.player.controller;
    const mates = this.mates();
    if (!g.player.alive) {
      if (this.state !== 'none') this.end(true);
      return false;
    }
    switch (this.state) {
      case 'none': {
        this.offer = null;
        if (!mates.length || g.traversal.active || g.cover.state !== 'none' || g.takedown.active || !c.grounded) return false;
        // a braced team-mate in reach, facing them: boost (tap) / ladder (hold)
        let best: TeamMate | null = null;
        let bd: number = TEAM.partnerReach;
        for (const m of mates) {
          if (m.mode !== 'brace') continue;
          const d = hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z);
          if (d < bd && Math.abs(m.pos.y - c.pos.y) < 0.4) {
            bd = d;
            best = m;
          }
        }
        if (best) {
          this.offer = { mate: best, boost: this.boostTarget(best) };
          if (yPressed) this.pressT = 0;
          if (this.pressT >= 0) {
            this.pressT += dt;
            if (!yHeld) {
              this.pressT = -1;
              if (this.offer.boost) this.request('boost', best.id, this.offer.boost);
            } else if (this.pressT >= TEAM.braceHold) {
              this.pressT = -1;
              this.request('ladder', best.id, null);
            }
          }
          return this.pressT >= 0 || yPressed;
        }
        this.pressT = -1;
        // brace: Y held with a team-mate near and a wall right behind
        if (yHeld && yHeldT >= TEAM.braceHold) {
          let near = Infinity;
          for (const m of mates) near = Math.min(near, hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z));
          if (canBrace(near, this.wallBehind(), c.grounded, !c.override)) {
            this.state = 'brace';
            this.count.braces++;
            return true;
          }
        }
        return false;
      }
      case 'brace':
        this.hold();
        if (bPressed) {
          c.swallowCrouch = true;
          this.end(false);
        }
        return true;
      case 'assist':
        // lifting the climber: the boost's time, then free
        this.t += dt;
        this.hold();
        if (this.t >= TEAM.boostTime) this.end(false);
        return true;
      case 'bottom':
        // the climber gone (left, down): stand up
        if (!this.partnerPos()) {
          this.end(true);
          return false;
        }
        this.hold();
        if (bPressed) {
          c.swallowCrouch = true;
          this.g.net?.teamEnd?.();
          this.end(false);
        }
        return true;
      case 'boost':
        this.runBoost(dt);
        return true;
      case 'ladderUp':
      case 'top':
        this.runTop(dt, yPressed, bPressed);
        return true;
    }
  }

  /** Braced: still, back to the wall, hands cupped. */
  private hold(): void {
    const c = this.g.player.controller;
    c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0 };
    this.g.player.coverPose.traverse = 'brace';
  }

  /** The lip / pipe / split a boost from this mate would toss onto (from the toss apex, at most `TEAM.boostMax` up). */
  private boostTarget(m: TeamMate): JumpTarget | null {
    const g = this.g;
    const floor = m.pos.y;
    // the braced mate's back is to the wall: the toss goes over them towards it
    const dx = -Math.sin(m.yaw);
    const dz = -Math.cos(m.yaw);
    // searched from 1.15 m under the highest boost (a jump takes lips up to 1.2 m above, and those at least 0.4 m
    // above when pushing up): lips 3.75-4.5 m up, the ones out of a wall jump's reach
    const apex = { x: m.pos.x, y: floor + TEAM.boostMax - 1.15, z: m.pos.z };
    const t = findJumpTarget(g.world.level.anchors, apex, -1, dx, dz, 1, 2.2, 0.2);
    if (!t || t.grip.y - floor > TEAM.boostMax || t.grip.y - floor < 2.4) return null;
    return t;
  }

  private request(kind: TeamKind, partner: string, t: JumpTarget | null): void {
    this.partner = partner;
    this.g.net?.teamRequest?.(kind, partner, t ? t.anchor.id : -1, t ? t.s : 0, t ? t.grip.y : 0);
  }

  /** The host started a team move this player is part of. */
  begin(s: TeamStart, self: string): void {
    const g = this.g;
    const c = g.player.controller;
    this.start = s;
    this.t = 0;
    this.from.copyFrom(c.pos);
    if (s.a === self) {
      this.partner = s.b;
      this.state = s.kind === 'boost' ? 'boost' : 'ladderUp';
      if (s.kind === 'boost') this.count.boosts++;
      else this.count.ladders++;
      g.cover.reset();
    } else if (s.b === self) {
      this.partner = s.a;
      this.state = s.kind === 'boost' ? 'assist' : 'bottom';
    }
  }

  /** The host refused a request. */
  denied(reason: string): void {
    this.count.denied++;
    this.lastDenied = reason;
    this.pressT = -1;
  }

  /** The partner (or the host) ended the move. */
  ended(): void {
    if (this.state === 'top' || this.state === 'ladderUp') this.hopDown();
    else if (this.state === 'bottom') this.end(false);
  }

  private partnerPos(): Vector3 | null {
    for (const m of this.mates()) if (m.id === this.partner) return m.pos;
    return null;
  }

  /** Climber: the step-up and toss, then onto the anchor. */
  private runBoost(dt: number): void {
    const g = this.g;
    const s = this.start!;
    const c = g.player.controller;
    const p = this.partnerPos();
    const a = g.world.level.anchors.get(s.target);
    if (!p || !a) {
      this.end(true);
      return;
    }
    this.t += dt;
    const h = g.player.rig.height;
    const hang = attachPose(a, s.s, 1, h, { x: 0, y: 0, z: 0, yaw: 0 });
    const gy = hang.y + 1.9 * (h / 1.75);
    boostPath(this.t, this.from.x, this.from.y, this.from.z, p.x, p.y, p.z, hang.x, gy, hang.z, 1.9 * (h / 1.75), this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: hang.yaw, turnRate: 20 };
    g.player.coverPose.traverse = 'climbUp';
    g.player.coverPose.traverseT = Math.min(1, this.t / TEAM.boostTime);
    if (this.t >= TEAM.boostTime) {
      c.override = null;
      g.player.coverPose.traverse = 'none';
      this.state = 'none';
      this.start = null;
      g.traversal.attachCtl.attachTo(a, s.s, 'side', 1, 0.15);
    }
  }

  /** Climber of the human ladder: up onto the shoulders, then the top (aim / fire; Y grabs a lip, B hops down). */
  private runTop(dt: number, yPressed: boolean, bPressed: boolean): void {
    const g = this.g;
    const c = g.player.controller;
    const p = this.partnerPos();
    if (!p) {
      this.hopDown();
      return;
    }
    const top = p.y + TEAM.ladderFeet;
    if (this.state === 'ladderUp') {
      this.t += dt;
      const k = Math.min(1, this.t / TEAM.ladderClimb);
      const e = k * k * (3 - 2 * k);
      this.kin.set(this.from.x + (p.x - this.from.x) * e, this.from.y + (top - this.from.y) * Math.min(1, e * 1.3), this.from.z + (p.z - this.from.z) * e);
      c.override = { kinematic: this.kin, yaw: c.yaw, turnRate: 10 };
      g.player.coverPose.traverse = 'climbUp';
      g.player.coverPose.traverseT = k;
      if (k >= 1) {
        this.state = 'top';
        g.player.coverPose.traverse = 'none';
      }
      return;
    }
    // standing on the shoulders: free to turn and aim, the body stays on them
    this.kin.set(p.x, top, p.z);
    c.override = { kinematic: this.kin, yaw: g.player.cam.yaw, turnRate: 12 };
    if (bPressed) {
      c.swallowCrouch = true;
      this.g.net?.teamEnd?.();
      this.hopDown();
      return;
    }
    if (yPressed) {
      // a lip / pipe in reach overhead (up to `TEAM.ladderGrab` over the floor)
      const at = { x: p.x, y: top + 1.75, z: p.z };
      const t = findJumpTarget(g.world.level.anchors, at, -1, Math.sin(c.yaw), Math.cos(c.yaw), 1, 1.6, 0.2);
      if (t && t.grip.y - p.y <= TEAM.ladderGrab + 0.2) {
        this.g.net?.teamEnd?.();
        this.end(false);
        g.traversal.attachCtl.attachTo(t.anchor, t.s, 'side', 1, 0.25);
      }
    }
  }

  /** Off the shoulders: a hop down beside them. */
  private hopDown(): void {
    const g = this.g;
    const c = g.player.controller;
    this.end(false);
    c.launch(Math.sin(c.yaw) * -1.5, 1.5, Math.cos(c.yaw) * -1.5);
  }

  /** Back to free movement. */
  end(_aborted: boolean): void {
    const g = this.g;
    if (this.state !== 'none') this.count.ends++;
    this.state = 'none';
    this.start = null;
    this.offer = null;
    this.pressT = -1;
    g.player.controller.override = null;
    if (g.player.coverPose.traverse === 'climbUp' || g.player.coverPose.traverse === 'brace') g.player.coverPose.traverse = 'none';
  }

  /** Movement mode on the wire for this state (null: the regular one). */
  get mode(): 'brace' | 'boost' | 'stacked' | null {
    switch (this.state) {
      case 'brace':
      case 'assist':
        return 'brace';
      case 'boost':
        return 'boost';
      case 'ladderUp':
      case 'top':
      case 'bottom':
        return 'stacked';
      default:
        return null;
    }
  }
}
