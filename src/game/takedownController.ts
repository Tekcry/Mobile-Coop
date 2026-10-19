import { Vector3 } from '../core/babylon';
import type { EnemyDef } from '../ai/enemyDefs';
import type { AlertLevel } from '../ai/alertState';
import type { CharacterRig } from '../player/characterRig';
import type { DamageResult, HitInfo } from './damage';
import { G } from '../physics/groups';
import { hyp2 } from '../core/mathx';
import { approachPoint, GRAB, GRAB_KINDS, pickTakedown, TAKEDOWN, type AttackerState, type TakedownInput, type TakedownPlan } from './takedown';
import { gearCap } from '../player/speedGears';
import type { GameState } from './gameState';
import { grabRule } from '../ai/archetypes';
import type { GrabOpt } from './grabMenu';

/** Noise radii (m): a choke is near silent, a lethal strike a thud. */
const NOISE_CHOKE = 1.2;
const NOISE_STRIKE = 3;
/** Candidates within this (m) are checked (the nearest `TRY`, one line-of-sight ray each). */
const SCAN = 5;
/** Candidates tried per step (nearest first; one ray each). */
const TRY = 3;

/**
 * (3.2.0) A grab from behind: approaching (`hold` false), then holding the guard in front (the operator moves at a
 * walk); (A4, G23) the CT grab menu decides it (knock out, kill, carry; `GameState` feeds `menuPick`) and `strikeT`
 * times the finishing move; `shovePressed` (now: cancel the menu) lets them go staggering.
 */
interface GrabState {
  hold: boolean;
  /** Unused since A4 (the deciding press is the menu). */
  pressT: number;
  /** The finishing strike under way (s; < 0: none). */
  strikeT: number;
}

/** The grab's finishing strike / choke (s). */
const GRAB_STRIKE = 0.5;

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
  releaseTakedown(stagger?: number): void;
  /** (3.2.0) Solid to the operator's body or not (a held hostage). */
  setSolid?(on: boolean): void;
  /** (3.2.0) Upright in the operator's hold (a human shield). */
  holdAsHostage?(): void;
  applyDamage(h: HitInfo): DamageResult;
  knockOut(h: HitInfo): void;
}

/**
 * Runs melee takedowns (phase 4). Each fixed step it finds the takedown on offer (the nearest enemy the geometry
 * allows, `pickTakedown`), shows it as a world prompt on the victim, and on the interact press plays it: the
 * attacker's feet follow an eased path onto the aligned spot (a vault over a low wall, a drop from above), the
 * victim is seized (brain off, a struggle pose, pulled over a lip or through a window), then the strike: tap =
 * non-lethal (a choke, the victim knocked out), held = lethal. Taking damage aborts it (the victim breaks free,
 * alerted).
 */
export class TakedownController {
  /** On offer this step. */
  offer: { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } | null = null;
  /** Running; `decided` once tap / hold is known (released early = non-lethal, held through = lethal). */
  active: { e: TakedownVictim; plan: TakedownPlan; lethal: boolean; decided: boolean; t: number; from: Vector3; vFrom: Vector3; hp: number; grab: GrabState | null } | null = null;
  /** (A4) The grab menu's cancel (let the guard go, staggering) this step (set by GameState). */
  shovePressed = false;
  /** (A4) The grab menu's pick this step (set by GameState, read and cleared by the hold). */
  menuPick: GrabOpt | null = null;
  /** (A4) A carry pick: the body to shoulder once it exists (enemy id, seconds left to find it). */
  private carryId = '';
  private carryT = 0;
  /** Grabs: held / knocked out / killed / shoved (stats, tests). */
  grabs = { held: 0, ko: 0, killed: 0, shoved: 0, lost: 0 };
  /** The press that started it is still held (pad / keyboard). */
  holding = false;
  /** Counts (stats / tests). */
  done = { lethal: 0, nonLethal: 0, aborted: 0, byKind: {} as Record<string, number> };
  private inp: TakedownInput = { state: 'ground', ax: 0, ay: 0, az: 0, vx: 0, vy: 0, vz: 0, vyaw: 0, vCalm: true, los: true };
  private pt = { x: 0, y: 0, z: 0 };
  private kin = new Vector3();
  private eye = new Vector3();
  private head = new Vector3();

  constructor(private g: GameState) {}

  /** Attacker state from back-to-wall (step 12: a high wall `wall`, a low one `wallLow`) / traversal. */
  private attackerState(): AttackerState {
    const g = this.g;
    const tr = g.traversal;
    const wc = g.wallCore;
    if (wc && wc.phase === 'on') return wc.low ? 'wallLow' : 'wall';
    if (tr.attached) {
      const ac = tr.attachCtl;
      if (ac.m.phase !== 'on') return 'climb';
      const k = ac.m.kind;
      if (k === 'ledge') return 'hang';
      // (3.2.0) a pipe (hands / legs up, or settled inverted), a split, a rope
      if (k === 'pipeH') return ac.pipe.mode === 'inverted' && !ac.pipe.busy ? 'inverted' : 'pipe';
      if (k === 'split') return 'split';
      if (k === 'rappel') return 'rappel';
      if (k === 'zipline') return 'zipline';
      if (k === 'duct') return 'duct';
      return 'climb';
    }
    if (tr.hintWindow) return 'window';
    return 'ground';
  }

  /** Fixed step, before back-to-wall / traversal: find the offer, run an active takedown. Returns true while one runs. */
  fixedUpdate(dt: number, pressed: boolean, held: boolean): boolean {
    const g = this.g;
    if (this.carryId) this.carryStep(dt);
    if (this.active) {
      this.holding = held;
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

  /** Start the offered takedown now; `lethal` forces the choice (else tap / hold decides). */
  start(lethal?: boolean): void {
    const o = this.offer;
    if (!o || this.active) return;
    const g = this.g;
    const c = g.player.controller;
    // leaving the anchor for moves that carry the attacker; hanging pulls (and an inverted choke) stay put
    if (o.plan.kind !== 'below' && o.plan.kind !== 'window' && o.plan.kind !== 'inverted') {
      if (g.traversal.attached) g.traversal.reset();
    }
    // (3.2.0) from behind on a guard on two legs: a grab, decided by a fresh press while holding them
    const grab = GRAB_KINDS.includes(o.plan.kind) && !o.e.def.quadruped && !o.lethalOnly && lethal === undefined;
    o.e.beginTakedown(lethal !== true);
    this.active = {
      e: o.e,
      plan: o.plan,
      lethal: lethal === true,
      decided: grab || lethal !== undefined,
      t: 0,
      from: c.pos.clone(),
      vFrom: o.e.pos.clone(),
      hp: g.target.health.hp,
      grab: grab ? { hold: false, pressT: -1, strikeT: -1 } : null,
    };
    if (grab) this.grabs.held++;
    this.offer = null;
    g.events.emit('takedown', { phase: 'start', lethal: lethal === true, kind: o.plan.kind });
  }

  /** The nearest candidates (up to `TRY`), nearest first. */
  private cand: (TakedownVictim | null)[] = [null, null, null];
  private candD = [0, 0, 0];

  private find(): { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } | null {
    const g = this.g;
    const vs = g.takedownVictims();
    if (!vs.length) return null;
    const p = g.player.position;
    const cand = this.cand;
    const cd = this.candD;
    cand[0] = cand[1] = cand[2] = null;
    cd[0] = cd[1] = cd[2] = SCAN;
    // a guard in combat who knows this operator is there cannot be taken by surprise (each player separately)
    const known = g.spottedLocal;
    for (let k = 0; k < vs.length; k++) {
      const e = vs[k]!;
      if (!e.alive || e.taken || (known && e.level === 'alert')) continue;
      const d = hyp2(e.pos.x - p.x, e.pos.z - p.z);
      // insertion into the three nearest
      for (let j = 0; j < TRY; j++) {
        if (d < cd[j]!) {
          for (let m = TRY - 1; m > j; m--) {
            cand[m] = cand[m - 1]!;
            cd[m] = cd[m - 1]!;
          }
          cand[j] = e;
          cd[j] = d;
          break;
        }
      }
    }
    // the nearest the geometry allows (a guard behind a wall is passed over for the one below a split / pipe)
    for (let j = 0; j < TRY; j++) {
      const best = cand[j];
      if (!best) break;
      const o = this.tryVictim(best);
      if (o) return o;
    }
    return null;
  }

  private tryVictim(best: TakedownVictim): { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } | null {
    const g = this.g;
    const p = g.player.position;
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
    // (step 12) back to a wall: the face normal, and at an edge the outside end and the way past it
    const wc = g.wallCore;
    const ws = wc && wc.phase === 'on' ? g.world.level.coverSegments[wc.seg] : undefined;
    i.coverNx = ws ? ws.nx : undefined;
    i.coverNz = ws ? ws.nz : undefined;
    const atEdge = !!ws && wc!.edge !== 0;
    i.edgeX = atEdge ? (wc!.edge > 0 ? ws!.bx : ws!.ax) : undefined;
    i.edgeZ = atEdge ? (wc!.edge > 0 ? ws!.bz : ws!.az) : undefined;
    i.edgeTx = atEdge ? wc!.edge * ws!.tx : undefined;
    i.edgeTz = atEdge ? wc!.edge * ws!.tz : undefined;
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
    // (G155) no heavies in the missions: the heavy's frontal rule is off; the enforcer's shield still stops a frontal grab
    const rule = best.def.kind === 'heavy' ? 'ok' : grabRule(best.def.kind, plan.kind);
    return rule === 'no' ? null : { e: best, plan, lethalOnly: rule === 'lethal' };
  }

  /** (locomotion step 18, D7) `gameplay.grabToggle` (local only, D8). */
  grabToggle = true;

  /** Holding a hostage now (the grab past its approach). */
  get hostage(): TakedownVictim | null {
    const a = this.active;
    return a?.grab?.hold ? a.e : null;
  }

  /** The grab: approach, hold (moving slowly), a fresh press to finish it, a shove to let go. */
  private runGrab(dt: number, gr: GrabState): void {
    const g = this.g;
    const a = this.active!;
    const { e, plan } = a;
    const c = g.player.controller;
    a.t += dt / this.handsMul;
    if (!g.player.alive || !e.alive) {
      if (!e.alive) this.grabs.lost++;
      this.abort();
      return;
    }
    if (!gr.hold) {
      // stepping in behind them (hurt on the way: it falls apart)
      if (g.target.health.hp < a.hp - 0.5) {
        this.abort();
        return;
      }
      approachPoint(a.from.x, a.from.y, a.from.z, plan, Math.min(1, a.t / Math.max(0.01, plan.approach)), this.pt);
      this.kin.set(this.pt.x, this.pt.y, this.pt.z);
      c.override = { kinematic: this.kin, yaw: plan.faceYaw, turnRate: 40 };
      e.holdAt(a.vFrom.x, a.vFrom.y, a.vFrom.z, plan.faceYaw);
      if (a.t >= plan.approach) {
        gr.hold = true;
        c.override = null;
        e.setSolid?.(false);
        e.holdAsHostage?.();
      }
      return;
    }
    // holding: a walk at most; the hostage stays in front, facing the way the operator does
    c.speedCap = gearCap(Math.min(c.gear, GRAB.maxGear), c.crouched);
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    e.holdAt(c.pos.x + fx * GRAB.hold, c.pos.y, c.pos.z + fz * GRAB.hold, c.yaw);
    if (gr.strikeT >= 0) {
      gr.strikeT += dt / this.handsMul;
      g.player.pose.melee = a.lethal ? Math.min(1, gr.strikeT / GRAB_STRIKE) : -1;
      if (gr.strikeT >= GRAB_STRIKE) {
        c.speedCap = Infinity;
        this.grabs[a.lethal ? 'killed' : 'ko']++;
        this.finish();
      }
      return;
    }
    if (this.shovePressed) {
      // (A4) the menu's cancel: let them go with a push, staggering, then alert
      c.speedCap = Infinity;
      e.holdAt(c.pos.x + fx * (GRAB.hold + 0.5), c.pos.y, c.pos.z + fz * (GRAB.hold + 0.5), c.yaw);
      this.release();
      e.releaseTakedown(GRAB.shoveStagger);
      this.grabs.shoved++;
      g.events.emit('takedown', { phase: 'abort', lethal: false, kind: 'grab' });
      return;
    }
    // (A4, G23) the CT grab menu's pick: knock out, kill, or carry (a knockout, then the body goes on the shoulder)
    const pick = this.menuPick;
    this.menuPick = null;
    if (pick === 'knockout' || pick === 'kill' || pick === 'carry') {
      a.lethal = pick === 'kill';
      if (a.lethal) e.beginTakedown(false);
      if (pick === 'carry') {
        this.carryId = e.id;
        this.carryT = 1.5;
      }
      gr.strikeT = 0;
    }
  }

  /** (A4) A carry pick: once the knocked-out guard's body exists, the operator shoulders it. */
  private carryStep(dt: number): void {
    const g = this.g;
    this.carryT -= dt;
    const b = g.enemyMgr?.bodies.find((x) => x.enemyId === this.carryId);
    if (b && g.stealth && !g.stealth.carrying && !this.active) {
      g.stealth.pickUpBody(b);
      this.carryId = '';
    } else if (this.carryT <= 0 || !g.stealth) this.carryId = '';
  }

  private run(dt: number): void {
    const g = this.g;
    const a = this.active!;
    if (a.grab) {
      this.runGrab(dt, a.grab);
      return;
    }
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
    if (g.target.health.hp < a.hp - 0.5 || !g.player.alive || !e.alive) {
      this.abort();
      return;
    }
    const total = plan.approach + plan.strike;
    const kAp = plan.approach > 0 ? Math.min(1, a.t / plan.approach) : 1;
    // attacker: along the path onto the aligned spot, facing the victim
    if (plan.kind !== 'below' && plan.kind !== 'window' && plan.kind !== 'inverted') {
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
    const pose = g.player.pose;
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
    // (3.2.0) holding a hostage: the left hand on their shoulder, the right free for the sidearm (until the strike)
    const holdOnly = !!a.grab && a.grab.strikeT < 0;
    const w = holdOnly ? (this.g.player.carry.raise > 0.2 ? 0 : 0.6) : a.lethal ? 0.5 : 1;
    rig.reachR.x = n.x;
    rig.reachR.y = n.y - 0.05;
    rig.reachR.z = n.z;
    rig.reachR.w = w;
    vr.shoulderL.computeWorldMatrix(true);
    const s = vr.shoulderL.getAbsolutePosition();
    rig.reachL.x = s.x;
    rig.reachL.y = s.y;
    rig.reachL.z = s.z;
    rig.reachL.w = holdOnly ? 1 : w * 0.9;
  }

  private release(): void {
    const g = this.g;
    g.player.controller.override = null;
    if (this.active?.grab) {
      g.player.controller.speedCap = Infinity;
      // (a dead hostage's hit volumes are gone)
      if (this.active.e.alive) this.active.e.setSolid?.(true);
    }
    g.player.pose.melee = -1;
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
    const hit = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1, takedown: a.plan.kind };
    if (a.lethal) e.applyDamage(hit);
    else e.knockOut(hit);
    this.done[a.lethal ? 'lethal' : 'nonLethal']++;
    const kind = a.grab ? 'grab' : a.plan.kind;
    this.done.byKind[kind] = (this.done.byKind[kind] ?? 0) + 1;
    const r = a.lethal ? NOISE_STRIKE : NOISE_CHOKE;
    g.enemyMgr?.hear(g.player.position, r);
    g.events.emit('takedown', { phase: 'done', lethal: a.lethal, kind });
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
    this.carryId = '';
    this.menuPick = null;
  }
}
