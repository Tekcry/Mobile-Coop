import { Vector3 } from '../core/babylon';
import { hyp2 } from '../core/mathx';
import { G } from '../physics/groups';
import { TEAM } from '../config/movement';
import { findJumpTarget, anchorLength, type JumpTarget } from '../world/anchors';
import { attachPose, GAMEPLAY_HEIGHT } from '../player/attach';
import { ATTACH_SUB } from '../player/moveState';
import { boostPath, inBoostBand, legUpRoom, relayPath, relaySlot, throwArc, throwLanding, throwRoom, THROW_SUB, type TeamKind } from './teamMoves';
import type { GameState } from './gameState';

/** A team-mate as the team moves see them (from the net layer). */
export interface TeamMate {
  id: string;
  pos: Vector3;
  yaw: number;
  /** Their movement mode (`MoveState.m`). */
  mode: string;
  /** Their attached anchor id, position along it and attach sub bits (a hanging mate's relay offer is `ATTACH_SUB.relay`). */
  anchor?: number;
  s?: number;
  sub?: number;
}

/** A team move the host started: `a` climbs, `b` offers (crouched for a leg-up, hanging for a relay). */
export interface TeamStart {
  kind: TeamKind;
  a: string;
  b: string;
  target: number;
  s: number;
  /** (B4) A throw's landing (feet). */
  l?: [number, number, number];
}

export type TeamState = 'none' | 'offer' | 'relayOffer' | 'boost' | 'assist' | 'relayUp' | 'relayHold' | 'throwOffer' | 'throwAssist' | 'throw';

const REFUSE_SHOW = 2;

/**
 * Co-op team moves, the local side (CT prototype B2). The Co-op action (RB / F) starts them (G151: anywhere with room):
 * - crouched on the ground: offer a LEG-UP (`offer`, wire mode `brace`: still, hands cupped). The partner runs in, presses
 *   the Co-op action and is boosted onto the ledge in reach (G57 band); the offerer assists.
 * - standing on the ground: offer the PARTNER THROW (B4, CT 1.3; `throwOffer`, wire mode `brace` + `THROW_SUB`). The
 *   partner runs in, presses the Co-op action and is thrown on over the thrower in an arc (`throw`, wire mode `boost`),
 *   landing `TEAM.throwDist` m past them, crouched. The runner checks the room first (a polite refusal when blocked).
 * - hanging from a ledge: offer the LEDGE RELAY (`relayOffer`: the relay bit in the attach sub). The partner under them
 *   presses the Co-op action and climbs up the hanging body to the same ledge (`relayUp`); the hanger holds still
 *   meanwhile (`relayHold`) and then pulls up with the normal climb.
 * The host checks every request (`teamMoves.ts` `checkTeamRequest`) on both players' movement states. No brace, no stack.
 */
export class TeamController {
  state: TeamState = 'none';
  /** The partner in the current move (or the offering team-mate). */
  partner = '';
  /** What the Co-op action would complete now: a crouched mate offering (a boost target or none) or a hanging mate. */
  offer: { mate: TeamMate; boost: JumpTarget | null; relay: boolean; toss?: boolean } | null = null;
  /** The world prompt now (names the move and who starts it) and where it is drawn; null = none. */
  prompt: string | null = null;
  readonly promptAt = new Vector3();
  /** Seconds into the current committed part. */
  private t = 0;
  private start: TeamStart | null = null;
  private from = new Vector3();
  private kin = new Vector3();
  private pt = { x: 0, y: 0, z: 0 };
  private hp = { x: 0, y: 0, z: 0, yaw: 0 };
  /** Counts (tests): offers, boosts, relays, denials. */
  readonly count = { offers: 0, boosts: 0, ladders: 0, throws: 0, denied: 0, ends: 0 };
  /** (B4) The last throw's landing check ('ok' or why not; tests). */
  lastThrowRoom = '';
  lastDenied = '';
  /** Why the last move ended early (tests, debugging). */
  endWhy = '';
  private refuse = '';
  private refuseT = 0;
  private sides = [0, 0, 0, 0];
  private a = new Vector3();
  private b = new Vector3();
  private land = { x: 0, z: 0, dx: 0, dz: 0 };
  private to = new Vector3();

  constructor(private g: GameState) {}

  /** Team-mates from the net layer (none in single player). */
  private mates(): readonly TeamMate[] {
    return this.g.net?.teamMates?.() ?? [];
  }

  /** In a team move that owns the body (an offer waiting on the ground or a hang offer is not: the player stays free). */
  get active(): boolean {
    return this.state !== 'none' && this.state !== 'relayOffer';
  }

  /** The hanger is held still while the partner climbs. */
  get hangLock(): boolean {
    return this.state === 'relayHold';
  }

  get busy(): boolean {
    return this.active && this.state !== 'offer';
  }

  /** Free air over the head and the four side clearances (m): the leg-up's room (G151). */
  private room(): boolean {
    const g = this.g;
    const c = g.player.controller;
    this.a.set(c.pos.x, c.pos.y + 1.0, c.pos.z);
    this.b.set(c.pos.x, c.pos.y + 1.0 + TEAM.roomUp + 0.4, c.pos.z);
    const hu = g.ballistics.ray(this.a, this.b, G.STATIC);
    // the ray starts 1.0 up; the toss needs the air over the crouched head (1.05)
    const up = hu.hit ? hu.distance + 1.0 - 1.05 : Infinity;
    for (let i = 0; i < 4; i++) {
      const yaw = c.yaw + (i * Math.PI) / 2;
      this.b.set(c.pos.x + Math.sin(yaw) * (TEAM.roomSide + 0.3), c.pos.y + 0.8, c.pos.z + Math.cos(yaw) * (TEAM.roomSide + 0.3));
      this.a.set(c.pos.x, c.pos.y + 0.8, c.pos.z);
      const h = g.ballistics.ray(this.a, this.b, G.STATIC);
      this.sides[i] = h.hit ? h.distance : Infinity;
    }
    return legUpRoom(up, this.sides);
  }

  private refused(text: string): void {
    this.refuse = text;
    this.refuseT = REFUSE_SHOW;
    this.g.app.toasts.show(text, 'warn');
  }

  /** Hanging on a ledge, settled (not blending on or off). */
  private hanging(): boolean {
    const t = this.g.traversal;
    return t.attached && t.attach.kind === 'ledge' && t.attach.phase === 'on';
  }

  /**
   * Fixed step (before traversal). `coopPressed` the Co-op action, `bPressed` the crouch / B control (cancels an offer).
   * Returns true when the team move took the press.
   */
  fixedUpdate(dt: number, coopPressed: boolean, bPressed: boolean): boolean {
    const g = this.g;
    const c = g.player.controller;
    if (!g.player.alive) {
      if (this.state !== 'none') this.end(true);
      this.prompt = null;
      return false;
    }
    if (this.refuseT > 0) this.refuseT -= dt;
    this.prompt = this.refuseT > 0 ? this.refuse : null;
    if (this.prompt) this.promptAt.set(c.pos.x, c.pos.y + 1.9, c.pos.z);
    switch (this.state) {
      case 'none':
        return this.idle(coopPressed);
      case 'offer':
        // crouched, still, hands cupped; the partner comes to us (B stands up, a timeout lets go)
        this.t += dt;
        this.hold();
        this.prompt = 'Leg-up offered: waiting for your partner';
        this.promptAt.set(c.pos.x, c.pos.y + 1.5, c.pos.z);
        if (bPressed || coopPressed || this.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          this.end(false);
        }
        return true;
      case 'relayOffer':
        // hanging, still free to pull up; letting go or climbing ends the offer
        this.t += dt;
        this.prompt = 'Relay offered: waiting for your partner';
        this.promptAt.set(c.pos.x, c.pos.y + 0.6, c.pos.z);
        if (!this.hanging() || coopPressed || this.t > TEAM.offerTime) this.end(false);
        return coopPressed;
      case 'assist':
        // lifting the climber: the boost's time, then free
        this.t += dt;
        this.hold();
        if (this.t >= TEAM.boostTime) this.end(false);
        return true;
      case 'relayHold':
        // the partner climbs our body: hold the hang still, then the normal pull-up is ours
        this.t += dt;
        if (this.t >= TEAM.relayClimb + 0.25 || !this.partnerPos()) this.end(false);
        return true;
      case 'throwOffer':
        // standing still, ready to throw; the partner runs in (B / Co-op cancels, a timeout lets go)
        this.t += dt;
        c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0, crouch: false };
        this.prompt = 'Throw offered: your partner runs in and presses Co-op';
        this.promptAt.set(c.pos.x, c.pos.y + 1.9, c.pos.z);
        if (bPressed || coopPressed || this.t > TEAM.offerTime || !c.grounded) {
          c.swallowCrouch = bPressed;
          this.end(false);
        }
        return true;
      case 'throwAssist':
        // throwing: held still for the flight
        this.t += dt;
        c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0, crouch: false };
        if (this.t >= TEAM.throwTime) this.end(false);
        return true;
      case 'throw':
        this.runThrow(dt);
        return true;
      case 'boost':
        this.runBoost(dt);
        return true;
      case 'relayUp':
        this.runRelay(dt);
        return true;
    }
  }

  /** No move running: find what a Co-op press would complete, show the prompt, start an offer on a press. */
  private idle(coopPressed: boolean): boolean {
    const g = this.g;
    const c = g.player.controller;
    this.offer = null;
    const mates = this.mates();
    if (!mates.length || g.takedown.active || g.strike.active) return false;
    const free = !g.traversal.committed && !g.traversal.attached && c.grounded && !c.override;
    let near = Infinity;
    for (const m of mates) near = Math.min(near, hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z));
    if (free) {
      // a mate crouched in reach (a leg-up) or hanging right over us (the relay)
      let bd: number = TEAM.relayReach;
      for (const m of mates) {
        const d = hyp2(m.pos.x - c.pos.x, m.pos.z - c.pos.z);
        const toss = m.mode === 'brace' && ((m.sub ?? 0) & THROW_SUB) !== 0;
        if (toss && d < TEAM.throwReach && Math.abs(m.pos.y - c.pos.y) < 0.4 && d < bd) {
          bd = d;
          this.offer = { mate: m, boost: null, relay: false, toss: true };
        } else if (!toss && m.mode === 'brace' && d < TEAM.partnerReach && Math.abs(m.pos.y - c.pos.y) < 0.4 && d < bd) {
          bd = d;
          this.offer = { mate: m, boost: this.boostTarget(m), relay: false };
        } else if (m.mode === 'ledge' && ((m.sub ?? 0) & ATTACH_SUB.relay) !== 0 && d < bd && m.pos.y - c.pos.y > 0.3 && m.pos.y - c.pos.y < TEAM.relayMax) {
          bd = d;
          this.offer = { mate: m, boost: null, relay: true };
        }
      }
    }
    const o = this.offer;
    if (o) {
      this.prompt = o.toss ? 'Co-op: get thrown over (partner throw)' : o.relay ? 'Co-op: climb your partner up to the ledge' : o.boost ? 'Co-op: take the leg-up' : 'Leg-up offered: no ledge in reach here';
      this.promptAt.set(o.mate.pos.x, o.mate.pos.y + (o.relay ? 0.5 : o.toss ? 1.9 : 1.3), o.mate.pos.z);
      if (coopPressed) {
        if (o.toss) this.requestThrow(o.mate);
        else if (o.relay) this.request('ladder', o.mate.id, o.mate.anchor ?? -1, o.mate.s ?? 0, 0);
        else if (o.boost) this.request('boost', o.mate.id, o.boost.anchor.id, o.boost.s, o.boost.grip.y);
        else this.refused('No ledge to boost to here');
      }
      return coopPressed;
    }
    // start one: hanging = the relay; crouched on the ground = the leg-up; standing = the partner throw (B4)
    if (this.hanging()) {
      if (near < 12 && !this.prompt) {
        this.prompt = 'Co-op: offer a ledge relay';
        this.promptAt.set(c.pos.x, c.pos.y + 0.6, c.pos.z);
      }
      if (coopPressed) {
        this.state = 'relayOffer';
        this.t = 0;
        this.count.offers++;
        this.partner = '';
        return true;
      }
      return false;
    }
    if (!free) return false;
    // the standing offer is named only with the partner close by (else it would sit over the head all the time)
    if (near < (c.crouched ? 12 : 4) && !this.prompt) {
      this.prompt = c.crouched ? 'Co-op: offer a leg-up' : 'Co-op: offer a partner throw (crouch for a leg-up)';
      this.promptAt.set(c.pos.x, c.pos.y + (c.crouched ? 1.5 : 1.9), c.pos.z);
    }
    if (!coopPressed) return false;
    if (c.crouched) {
      if (!this.room()) this.refused('No room for a leg-up here');
      else {
        this.state = 'offer';
        this.t = 0;
        this.count.offers++;
        this.partner = '';
      }
      return true;
    }
    // standing: the partner throw (B4) - free air over the thrower; where the runner lands is checked on their side
    if (!this.throwRoomUp()) this.refused('No room for a throw here');
    else {
      this.state = 'throwOffer';
      this.t = 0;
      this.count.offers++;
      this.partner = '';
    }
    return true;
  }

  /** Free air over the standing thrower (the runner goes over their head). */
  private throwRoomUp(): boolean {
    const g = this.g;
    const c = g.player.controller;
    this.a.set(c.pos.x, c.pos.y + 1.0, c.pos.z);
    this.b.set(c.pos.x, c.pos.y + 1.0 + TEAM.throwUp, c.pos.z);
    return !g.ballistics.ray(this.a, this.b, G.STATIC).hit;
  }

  /**
   * The runner's side of a throw (G151): the landing past the thrower, nothing solid along the arc (sampled at the feet
   * and the head), a floor there within reach and head room over it. Asks the host when it fits, else a polite refusal.
   */
  private requestThrow(m: TeamMate): void {
    const g = this.g;
    const c = g.player.controller;
    const l = throwLanding(c.pos.x, c.pos.z, m.pos.x, m.pos.z, m.yaw, this.land);
    const by = m.pos.y;
    // the landing floor: down from well over the landing spot
    this.a.set(l.x, by + TEAM.throwDrop + 1.6, l.z);
    this.b.set(l.x, by - TEAM.throwDrop - 0.2, l.z);
    const fh = g.ballistics.ray(this.a, this.b, G.STATIC);
    const floorY = fh.hit ? fh.point.y : NaN;
    let head = 0;
    if (fh.hit) {
      this.a.set(l.x, floorY + 0.1, l.z);
      this.b.set(l.x, floorY + 0.1 + 1.8, l.z);
      const hh = g.ballistics.ray(this.a, this.b, G.STATIC);
      head = hh.hit ? hh.distance : 1.8;
    }
    // the arc, in 8 legs, at the feet (+0.3) and the head (+1.6)
    let clear = fh.hit;
    const y1 = fh.hit ? floorY : by;
    for (let i = 0; i < 8 && clear; i++) {
      for (let k = 0; k < 2 && clear; k++) {
        const off = k === 0 ? 0.3 : 1.6;
        throwArc((i / 8) * TEAM.throwTime, c.pos.x, c.pos.y, c.pos.z, l.x, y1, l.z, this.pt);
        this.a.set(this.pt.x, this.pt.y + off, this.pt.z);
        throwArc(((i + 1) / 8) * TEAM.throwTime, c.pos.x, c.pos.y, c.pos.z, l.x, y1, l.z, this.pt);
        this.b.set(this.pt.x, this.pt.y + off, this.pt.z);
        if (g.ballistics.ray(this.a, this.b, G.STATIC).hit) clear = false;
      }
    }
    const room = throwRoom(clear, floorY - by, head);
    this.lastThrowRoom = room;
    if (room !== 'ok') {
      this.refused(room === 'floor' ? 'No floor to land on there' : 'No room for the throw there');
      return;
    }
    this.partner = m.id;
    this.g.net?.teamRequest?.('throw', m.id, -1, 0, floorY, l.x, l.z);
  }

  /** Crouched, still, back to the cupped-hands pose. */
  private hold(): void {
    const c = this.g.player.controller;
    c.override = { velocity: { x: 0, z: 0 }, yaw: c.yaw, turnRate: 0, crouch: true };
    this.g.player.pose.traverse = 'brace';
  }

  /** The lip / pipe / split a leg-up from this offering mate reaches (from the toss apex, in the boost band). */
  private boostTarget(m: TeamMate): JumpTarget | null {
    const g = this.g;
    const floor = m.pos.y;
    // searched from 1.15 m under the highest boost (a jump takes lips up to 1.2 m above): lips out of a wall jump's reach.
    // Any way round the offering mate (G151: anywhere), the way they face first.
    const apex = { x: m.pos.x, y: floor + TEAM.boostMax - 1.15, z: m.pos.z };
    for (let i = 0; i < 4; i++) {
      const yaw = m.yaw + (i * Math.PI) / 2;
      const t = findJumpTarget(g.world.level.anchors, apex, -1, Math.sin(yaw), Math.cos(yaw), 1, 2.2, 0.2);
      if (t && inBoostBand(t.grip.y - floor)) return t;
    }
    return null;
  }

  private request(kind: TeamKind, partner: string, target: number, s: number, gripY: number): void {
    this.partner = partner;
    this.g.net?.teamRequest?.(kind, partner, target, s, gripY);
  }

  /** The host started a team move this player is part of. */
  begin(s: TeamStart, self: string): void {
    const g = this.g;
    const c = g.player.controller;
    this.start = s;
    this.t = 0;
    this.from.copyFrom(c.pos);
    const boost = s.kind === 'boost';
    if (s.kind === 'throw') {
      if (s.a === self && s.l) {
        this.partner = s.b;
        this.state = 'throw';
        this.to.set(s.l[0], s.l[1], s.l[2]);
        this.count.throws++;
      } else if (s.b === self) {
        this.partner = s.a;
        this.state = 'throwAssist';
      }
      return;
    }
    if (s.a === self) {
      this.partner = s.b;
      this.state = boost ? 'boost' : 'relayUp';
      if (boost) this.count.boosts++;
      else this.count.ladders++;
    } else if (s.b === self) {
      this.partner = s.a;
      this.state = boost ? 'assist' : 'relayHold';
    }
  }

  /** The host refused a request. */
  denied(reason: string): void {
    this.count.denied++;
    this.lastDenied = reason;
    this.refused(
      reason === 'far' ? 'Too far from your partner for that' : reason === 'noTarget' || reason === 'tooHigh' ? 'No ledge to reach from here' : reason === 'notBraced' || reason === 'notOffering' ? 'Your partner is no longer offering' : 'Not now',
    );
  }

  /** The partner (or the host) ended the move. */
  ended(): void {
    if (this.state === 'relayUp') {
      this.endWhy = 'relay: partner ended it';
      this.end(true);
    }
    else if (this.state === 'relayHold') this.end(false);
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
      this.endWhy = !p ? 'boost: no partner' : 'boost: no anchor';
      this.end(true);
      return;
    }
    this.t += dt;
    const h = GAMEPLAY_HEIGHT;
    const hang = attachPose(a, s.s, 1, h, this.hp);
    const gy = hang.y + 1.9 * (h / 1.75);
    boostPath(this.t, this.from.x, this.from.y, this.from.z, p.x, p.y, p.z, hang.x, gy, hang.z, 1.9 * (h / 1.75), this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: hang.yaw, turnRate: 20 };
    g.player.pose.traverse = 'climbUp';
    g.player.pose.traverseT = Math.min(1, this.t / TEAM.boostTime);
    if (this.t >= TEAM.boostTime) {
      c.override = null;
      g.player.pose.traverse = 'none';
      this.state = 'none';
      this.start = null;
      if (!g.traversal.attachCtl.attachTo(a, s.s, 'side', 1, 0.15)) this.endWhy = 'boost: attach refused';
    }
  }

  /** The thrown player: the arc over the thrower to the landing, then on the feet, crouched (B4). */
  private runThrow(dt: number): void {
    const g = this.g;
    const c = g.player.controller;
    this.t += dt;
    throwArc(this.t, this.from.x, this.from.y, this.from.z, this.to.x, this.to.y, this.to.z, this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z), turnRate: 20 };
    g.player.pose.traverse = 'vault';
    g.player.pose.traverseT = Math.min(1, this.t / TEAM.throwTime);
    if (this.t >= TEAM.throwTime) {
      c.override = null;
      g.player.pose.traverse = 'none';
      c.setCrouchToggle();
      this.state = 'none';
      this.start = null;
    }
  }

  /** Climber of the ledge relay: up the hanging partner's body to the same ledge, then hang beside them. */
  private runRelay(dt: number): void {
    const g = this.g;
    const s = this.start!;
    const c = g.player.controller;
    const a = g.world.level.anchors.get(s.target);
    if (!this.partnerPos() || !a) {
      this.endWhy = 'relay: no partner or anchor';
      this.end(true);
      return;
    }
    this.t += dt;
    const s2 = relaySlot(s.s, anchorLength(a));
    const hang = attachPose(a, s2, 1, GAMEPLAY_HEIGHT, this.hp);
    relayPath(this.t, this.from.x, this.from.y, this.from.z, hang.x, hang.y, hang.z, this.pt);
    this.kin.set(this.pt.x, this.pt.y, this.pt.z);
    c.override = { kinematic: this.kin, yaw: hang.yaw, turnRate: 20 };
    g.player.pose.traverse = 'climbUp';
    g.player.pose.traverseT = Math.min(1, this.t / TEAM.relayClimb);
    if (this.t >= TEAM.relayClimb) {
      c.override = null;
      g.player.pose.traverse = 'none';
      this.state = 'none';
      this.start = null;
      if (!g.traversal.attachCtl.attachTo(a, s2, 'side', 1, 0.15)) this.endWhy = 'relay: attach refused';
    }
  }

  /** Back to free movement. */
  end(_aborted: boolean): void {
    const g = this.g;
    if (this.state !== 'none') this.count.ends++;
    this.state = 'none';
    this.start = null;
    this.offer = null;
    if (this.state === 'none' && g.player.controller.override && !g.traversal.attached) g.player.controller.override = null;
    if (g.player.pose.traverse === 'climbUp' || g.player.pose.traverse === 'brace' || g.player.pose.traverse === 'vault') g.player.pose.traverse = 'none';
  }

  /** Movement mode on the wire for this state (null: the regular one; a hanging offer rides the attach sub bit). */
  get mode(): 'brace' | 'boost' | null {
    switch (this.state) {
      case 'offer':
      case 'assist':
      case 'throwOffer':
      case 'throwAssist':
        return 'brace';
      case 'boost':
      case 'relayUp':
      case 'throw':
        return 'boost';
      default:
        return null;
    }
  }

  /** (B4) The team mode's sub on the wire: `THROW_SUB` for the throw (offer, throwing, thrown), else 0. */
  get wireSub(): number {
    return this.state === 'throwOffer' || this.state === 'throwAssist' || this.state === 'throw' ? THROW_SUB : 0;
  }

  /** The attach sub bits to add while hanging (the relay offer, held while the partner climbs). */
  get attachBits(): number {
    return this.state === 'relayOffer' || this.state === 'relayHold' ? ATTACH_SUB.relay : 0;
  }
}
