import { Vector3 } from '../core/babylon';
import type { EnemyDef } from '../ai/enemyDefs';
import type { AlertLevel } from '../ai/alertState';
import type { CharacterRig } from '../player/characterRig';
import type { DamageResult, HitInfo } from './damage';
import { G } from '../physics/groups';
import { hyp2 } from '../core/mathx';
import { approachPoint, pickTakedown, TAKEDOWN, type AttackerState, type TakedownInput, type TakedownPlan } from './takedown';
import type { GameState } from './gameState';
import { grabRule } from '../ai/archetypes';

/** Noise radii (m): a choke is near silent, a lethal strike a thud. */
const NOISE_CHOKE = 1.2;
const NOISE_STRIKE = 3;
/** Candidates within this (m) are checked (one line-of-sight ray per step, the nearest). */
const SCAN = 5;

/** What a takedown needs from its victim: an `Enemy`, or a co-op client's puppet of the host's enemy. */
export interface TakedownVictim {
  readonly id: string;
  readonly pos: Vector3;
  readonly yaw: number;
  readonly alive: boolean;
  readonly def: EnemyDef;
  readonly alerted: boolean;
  readonly level: AlertLevel;
  readonly bodyRig: CharacterRig;
  taken: boolean;
  beginTakedown(choke: boolean): void;
  holdAt(x: number, y: number, z: number, yaw: number): void;
  releaseTakedown(): void;
  applyDamage(h: HitInfo): DamageResult;
  knockOut(h: HitInfo): void;
}

/**
 * Runs melee takedowns (phase 4). Each fixed step it finds the takedown on offer (the nearest enemy the geometry
 * allows, `pickTakedown`), shows it as a world prompt on the victim, and on the interact press plays it: the
 * attacker's feet follow an eased path onto the aligned spot (a vault over low cover, a drop from above), the
 * victim is seized (brain off, a struggle pose, pulled over a lip or through a window), then the strike: tap =
 * non-lethal (a choke, the victim knocked out), held = lethal. Taking damage aborts it (the victim breaks free,
 * alerted). A melee takedown earns an Execute charge.
 */
export class TakedownController {
  /** On offer this step. */
  offer: { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } | null = null;
  /** Running; `decided` once tap / hold is known (released early = non-lethal, held through = lethal). */
  active: { e: TakedownVictim; plan: TakedownPlan; lethal: boolean; decided: boolean; t: number; from: Vector3; vFrom: Vector3; hp: number } | null = null;
  /** The press that started it is still held (pad / keyboard, or the touch prompt). */
  holding = false;
  /** Counts (stats / tests). */
  done = { lethal: 0, nonLethal: 0, aborted: 0, byKind: {} as Record<string, number> };
  private inp: TakedownInput = { state: 'ground', ax: 0, ay: 0, az: 0, vx: 0, vy: 0, vz: 0, vyaw: 0, vCalm: true, los: true };
  private pt = { x: 0, y: 0, z: 0 };
  private kin = new Vector3();
  private eye = new Vector3();
  private head = new Vector3();

  constructor(private g: GameState) {}

  /** Attacker state from cover / traversal. */
  private attackerState(): AttackerState {
    const g = this.g;
    const tr = g.traversal;
    if (tr.attached) {
      const k = tr.attachCtl.m.kind;
      if (k === 'ledge' || k === 'pipeH') return 'hang';
      if (k === 'zipline') return 'zipline';
      if (k === 'duct') return 'duct';
      return 'climb';
    }
    if (g.cover.inCover) return g.cover.low ? 'lowCover' : 'highCover';
    if (tr.hintWindow) return 'window';
    return 'ground';
  }

  /** Fixed step, before cover / traversal: find the offer, run an active takedown. Returns true while one runs. */
  fixedUpdate(dt: number, pressed: boolean, held: boolean): boolean {
    const g = this.g;
    if (this.active) {
      this.holding = held || this.touchHeld;
      this.run(dt);
      return true;
    }
    this.offer = g.player.alive && !g.stealth?.carrying ? this.find() : null;
    // starts on the press; whether it is lethal is decided as it goes (held through `lethalHold` = lethal)
    if (this.offer && pressed) {
      this.holding = true;
      this.start();
    }
    return this.active !== null;
  }

  /** Suit gloves: takedowns take this much of the time. */
  handsMul = 1;

  /** Touch: the takedown prompt is pressed (starts it) / released. */
  touchHeld = false;
  touchPress(down: boolean): void {
    this.touchHeld = down;
    if (down && !this.active) {
      this.holding = true;
      this.start();
    }
  }

  /** Start the offered takedown now; `lethal` forces the choice (else tap / hold decides). */
  start(lethal?: boolean): void {
    const o = this.offer;
    if (!o || this.active) return;
    // a heavy can only be struck down from the front (no choke through the plates)
    if (o.lethalOnly) lethal = true;
    const g = this.g;
    const c = g.player.controller;
    // leaving cover / the anchor for moves that carry the attacker; hanging pulls stay on the lip
    if (o.plan.kind !== 'below' && o.plan.kind !== 'window') {
      if (g.traversal.attached) g.traversal.reset();
      if (g.cover.inCover) g.cover.reset();
    }
    o.e.beginTakedown(lethal !== true);
    this.active = { e: o.e, plan: o.plan, lethal: lethal === true, decided: lethal !== undefined, t: 0, from: c.pos.clone(), vFrom: o.e.pos.clone(), hp: g.target.health.hp + g.target.health.shield };
    this.offer = null;
    g.events.emit('takedown', { phase: 'start', lethal: lethal === true, kind: o.plan.kind });
  }

  private find(): { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } | null {
    const g = this.g;
    const vs = g.takedownVictims();
    if (!vs.length) return null;
    const p = g.player.position;
    let best: TakedownVictim | null = null;
    let bd = SCAN;
    // a guard in combat who knows this operator is there cannot be taken by surprise (each player separately)
    const known = g.spottedLocal;
    for (let k = 0; k < vs.length; k++) {
      const e = vs[k]!;
      if (!e.alive || e.taken || (known && e.level === 'alert')) continue;
      const d = hyp2(e.pos.x - p.x, e.pos.z - p.z);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    if (!best) return null;
    const i = this.inp;
    i.state = this.attackerState();
    i.ax = p.x;
    i.ay = p.y;
    i.az = p.z;
    i.vx = best.pos.x;
    i.vy = best.pos.y;
    i.vz = best.pos.z;
    i.vyaw = best.yaw;
    i.vCalm = !best.alerted && best.level !== 'searching';
    const seg = g.cover.seg;
    i.coverNx = seg?.nx;
    i.coverNz = seg?.nz;
    const w = g.traversal.hintWindow;
    i.winNx = w ? Math.sin(w.yaw) : undefined;
    i.winNz = w ? Math.cos(w.yaw) : undefined;
    // line of sight chest to chest (one ray)
    // (hanging: from over the lip, where the hands are)
    this.eye.set(p.x, p.y + (i.state === 'hang' ? 2.05 : 1.2), p.z);
    this.head.set(best.pos.x, best.pos.y + 1.2, best.pos.z);
    const h = g.ballistics.ray(this.eye, this.head, G.STATIC);
    i.los = !h.hit || h.distance > Vector3.Distance(this.eye, this.head) - 0.2;
    const plan = pickTakedown(i);
    if (!plan) return null;
    // archetypes: an enforcer's shield stops a grab from the front, a heavy only falls to a strike there
    const rule = grabRule(best.def.kind, plan.kind);
    return rule === 'no' ? null : { e: best, plan, lethalOnly: rule === 'lethal' };
  }

  private run(dt: number): void {
    const g = this.g;
    const a = this.active!;
    const { e, plan } = a;
    const c = g.player.controller;
    a.t += dt / this.handsMul;
    // tap or hold: let go before `lethalHold` = non-lethal, still held then = lethal
    if (!a.decided) {
      if (!this.holding) a.decided = true;
      else if (a.t >= TAKEDOWN.lethalHold) {
        a.decided = true;
        a.lethal = true;
        e.beginTakedown(false);
      }
    }
    // hurt mid-move (or the victim died to something else): it falls apart
    if (g.target.health.hp + g.target.health.shield < a.hp - 0.5 || !g.player.alive || !e.alive) {
      this.abort();
      return;
    }
    const total = plan.approach + plan.strike;
    const kAp = plan.approach > 0 ? Math.min(1, a.t / plan.approach) : 1;
    // attacker: along the path onto the aligned spot, facing the victim
    if (plan.kind !== 'below' && plan.kind !== 'window') {
      approachPoint(a.from.x, a.from.y, a.from.z, plan, kAp, this.pt);
      this.kin.set(this.pt.x, this.pt.y, this.pt.z);
      c.override = { kinematic: this.kin, yaw: plan.faceYaw, turnRate: 40 };
    }
    // victim: held (behind / front: turned so the attacker is where the plan says), pulled where planned
    const vt = plan.victimTo;
    const kPull = vt ? Math.min(1, a.t / Math.max(0.01, TAKEDOWN.pullTime)) : 0;
    const vx = vt ? a.vFrom.x + (vt.x - a.vFrom.x) * kPull : a.vFrom.x;
    const vy = vt ? a.vFrom.y + (vt.y - a.vFrom.y) * kPull * kPull : a.vFrom.y;
    const vz = vt ? a.vFrom.z + (vt.z - a.vFrom.z) * kPull : a.vFrom.z;
    e.holdAt(vx, vy, vz, plan.kind === 'front' ? plan.faceYaw + Math.PI : plan.faceYaw);
    // the strike / choke pose
    const ks = (a.t - plan.approach) / plan.strike;
    const pose = g.player.coverPose;
    pose.melee = a.lethal && ks >= 0 ? Math.min(1, ks) : -1;
    // (never finishes before the choice is made)
    if (a.t >= total && (a.decided || a.t >= TAKEDOWN.lethalHold)) this.finish();
  }

  /** Render frame: the attacker's hands on the victim (neck / shoulders) for a choke. */
  frameUpdate(): void {
    const a = this.active;
    const rig = this.g.player.rig;
    if (!a) return;
    const vr = a.e.bodyRig;
    vr.neck.computeWorldMatrix(true);
    const n = vr.neck.getAbsolutePosition();
    const w = a.lethal ? 0.5 : 1;
    rig.reachR.x = n.x;
    rig.reachR.y = n.y - 0.05;
    rig.reachR.z = n.z;
    rig.reachR.w = w;
    vr.shoulderL.computeWorldMatrix(true);
    const s = vr.shoulderL.getAbsolutePosition();
    rig.reachL.x = s.x;
    rig.reachL.y = s.y;
    rig.reachL.z = s.z;
    rig.reachL.w = w * 0.9;
  }

  private release(): void {
    const g = this.g;
    g.player.controller.override = null;
    g.player.coverPose.melee = -1;
    const rig = g.player.rig;
    rig.reachL.w = rig.reachR.w = 0;
    this.active = null;
  }

  private finish(): void {
    const g = this.g;
    const a = this.active!;
    const e = a.e;
    this.release();
    e.taken = false;
    e.bodyRig.emote = null;
    const dir = new Vector3(Math.sin(a.plan.faceYaw), 0, Math.cos(a.plan.faceYaw));
    const hit = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 };
    if (a.lethal) e.applyDamage(hit);
    else e.knockOut(hit);
    this.done[a.lethal ? 'lethal' : 'nonLethal']++;
    this.done.byKind[a.plan.kind] = (this.done.byKind[a.plan.kind] ?? 0) + 1;
    g.marks.earn();
    const r = a.lethal ? NOISE_STRIKE : NOISE_CHOKE;
    g.enemyMgr?.hear(g.player.position, r);
    g.events.emit('takedown', { phase: 'done', lethal: a.lethal, kind: a.plan.kind });
  }

  /** Interrupted: the victim breaks free (staggered, alert). */
  abort(): void {
    const a = this.active;
    if (!a) return;
    this.release();
    if (a.e.alive) a.e.releaseTakedown();
    this.done.aborted++;
    this.g.events.emit('takedown', { phase: 'abort', lethal: a.lethal, kind: a.plan.kind });
  }

  reset(): void {
    this.abort();
    this.offer = null;
    this.holding = false;
    this.touchHeld = false;
  }
}
