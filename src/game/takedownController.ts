import { Vector3 } from '../core/babylon';
import type { EnemyDef } from '../ai/enemyDefs';
import type { AlertLevel } from '../ai/alertState';
import type { CharacterRig } from '../player/characterRig';
import type { DamageResult, HitInfo } from './damage';
import { G } from '../physics/groups';
import { hyp2 } from '../core/mathx';
import { approachPoint, assistPlanInto, GRAB, GRAB_KINDS, HANG_GRAB, hangHoldPoint, pickTakedownInto, TAKEDOWN, type AttackerState, type TakedownInput, type TakedownPlan } from './takedown';
import { HANG_HEAD } from './teamMoves';
import { gearCap } from '../player/speedGears';
import type { GameState } from './gameState';
import { grabRule } from '../ai/archetypes';
import type { GrabOpt } from './grabMenu';
import { clearGripAxis } from '../player/attachGrips';
import { wrapPi } from '../anim/motion';
import type { MoveOverride } from '../player/playerController';
import { GUARD_INFO_GAP, takeInfo, type GuardInfo } from '../ai/guardInfo';
import { revealIntel, revealJoint } from './intelReveal';
import { jointOf } from './jointInterrogation';
import { CQ, ease, grabStage, holdHandTargets, holdSway, koCurve, type GuardCqMode, type KoState } from './closeQuarters';
import { GRAB_KILL_BLOW, KILL_TAIL_END, killWarp, TAKEDOWN_BLOW, type KillBlow } from '../anim/strikeBody';

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
 * times the finishing move. (Michael 2026-10-20 08:20: "The guard cannot be let go either, only knocked out. Killed, or
 * used as human shield") there is no let-go: the hold ends only in the knockout or the kill (and cleanly when the
 * holder dies, the guard dies to something else, or the match restarts: `abort` / `reset`).
 */
interface GrabState {
  hold: boolean;
  /** Unused since A4 (the deciding press is the menu). */
  pressT: number;
  /** The finishing strike under way (s; < 0: none): the kill (`GRAB.killTime`) or (G7) the knockout that lowers him
   *  (`CQ.koTime`). */
  strikeT: number;
  /** (G7) The guard's facing at the press (he turns into the hold over the pull-in). */
  vYaw0: number;
  /** (G7) Seconds held (the idle sway), the interrogation under way (s; < 0: none). */
  holdT: number;
  interT: number;
  /** (PR 3) The lines his interrogation got, the next to say, and the seconds until it (null: not talking). */
  talk: readonly string[] | null;
  talkI: number;
  talkT: number;
}

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
  /** (PR 3) What INTERROGATE gets out of him (null: nothing, or spent). */
  info?: GuardInfo | null;
  /** Seized: the brain off; (G7) the struggle pose from `delay` s on (the attacker's contact). */
  beginTakedown(choke: boolean, delay?: number): void;
  holdAt(x: number, y: number, z: number, yaw: number): void;
  releaseTakedown(stagger?: number): void;
  /** (3.2.0) Solid to the operator's body or not (a held hostage). */
  setSolid?(on: boolean): void;
  /** (3.2.0) Upright in the operator's hold (a human shield). */
  holdAsHostage?(): void;
  /** (G7) The hold's pose: the knockout's limp `k` and lowering `lower`, the interrogation's progress `k`. */
  holdPose?(mode: GuardCqMode, k: number, lower?: number): void;
  applyDamage(h: HitInfo): DamageResult;
  knockOut(h: HitInfo): void;
}

/**
 * Runs melee takedowns (phase 4). Each fixed step it finds the takedown on offer (the nearest enemy the geometry
 * allows, `pickTakedownInto`), shows it as a world prompt on the victim, and on the interact press plays it: the
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
  /** (A4) The grab menu's pick this step (set by GameState, read and cleared by the hold). */
  menuPick: GrabOpt | null = null;
  /** (A4) A carry pick: the body to shoulder once it exists (enemy id, seconds left to find it). */
  private carryId = '';
  private carryT = 0;
  /** Grabs: held / knocked out / killed / shoved (stats, tests). */
  grabs = { held: 0, ko: 0, killed: 0, shoved: 0, lost: 0, interrogated: 0 };
  /** The press that started it is still held (pad / keyboard). */
  holding = false;
  /** (anim-n4d) The lethal blow's own phase (0..1, the kill at 1; -1 none): the wire's `ph` (`localMoveState`). The
   *  pose plays it through `killWarp`. */
  blowPh = -1;
  /** (anim-n4d, M1) After a kill: the blow's follow-through, pose only (the blow's phase past 1, up to
   *  `KILL_TAIL_END`; -1 none), and which blow. */
  tailU = -1;
  private tailB: KillBlow = TAKEDOWN_BLOW;
  /** Counts (stats / tests). */
  done = { lethal: 0, nonLethal: 0, aborted: 0, byKind: {} as Record<string, number> };
  private inp: TakedownInput = { state: 'ground', ax: 0, ay: 0, az: 0, vx: 0, vy: 0, vz: 0, vyaw: 0, vCalm: true, los: true };
  private pt = { x: 0, y: 0, z: 0 };
  private kin = new Vector3();
  private eye = new Vector3();
  private head = new Vector3();
  /** (player-hygiene S3) The offer scan's scratch plan and its `victimTo` buffer, and the one offer object (`offer`
   *  points at it while a takedown is on offer; `e` is set before it is ever exposed): no plan, offer or vector literal
   *  per step. */
  private readonly scanPlan: TakedownPlan = { kind: 'behind', alignX: 0, alignY: 0, alignZ: 0, faceYaw: 0, approach: 0, arc: 0, strike: 0, victimTo: null };
  private readonly scanTo = { x: 0, y: 0, z: 0 };
  private readonly scanOffer: { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } = { e: null as unknown as TakedownVictim, plan: this.scanPlan, lethalOnly: false };
  /** (player-hygiene S3) The started takedown's own copy of the offered plan and its `victimTo` (the next scan
   *  overwrites `scanPlan`). */
  private readonly activePlan: TakedownPlan = { kind: 'behind', alignX: 0, alignY: 0, alignZ: 0, faceYaw: 0, approach: 0, arc: 0, strike: 0, victimTo: null };
  private readonly activeTo = { x: 0, y: 0, z: 0 };
  /** (G7) The controller override, reused (no object per step). */
  private ov: MoveOverride = { kinematic: undefined, yaw: 0, turnRate: 40, crouch: false };
  private ko: KoState = { limp: 0, lower: 0, bend: 0 };
  private hp = { x: 0, y: 0, z: 0 };
  private hl = { x: 0, y: 0, z: 0 };
  /** (G7) The hero's bend (rad, spine forward), pelvis drop (m) and the hold's side sway (m) this step: the anim graph
   *  eases them (GameState hands them to the player pose). */
  bend = 0;
  bendDrop = 0;
  sway = 0;
  /** (G7) The attacker is stepping in under the override this step (the legs take steps from his speed). */
  stepping = false;

  constructor(private g: GameState) {}

  /** (G7) The grab menu may show: holding, no finisher or interrogation under way. */
  get menuReady(): boolean {
    const gr = this.active?.grab;
    return !!gr && gr.hold && gr.strikeT < 0 && gr.interT < 0;
  }

  /** (G7) The MoveState numbers of a hold (`localMoveState` mode `grab`): `ph` the finisher's / interrogation's
   *  progress, `sub` bit 1 the kill, bit 2 interrogating. Remotes and the co-op host pose from them. */
  grabWire(out: { ph: number; sub: number }): void {
    const gr = this.active?.grab;
    out.ph = 0;
    out.sub = 0;
    if (!gr) return;
    if (gr.strikeT >= 0) {
      const lethal = this.active!.lethal;
      out.ph = Math.min(1, gr.strikeT / (lethal ? GRAB.killTime : CQ.koTime));
      out.sub = lethal ? 1 : 0;
    } else if (gr.interT >= 0) {
      out.ph = Math.min(1, gr.interT / CQ.interrogate);
      out.sub = 2;
    }
  }

  /** The attacker driven onto (x, y, z) facing `yaw`; `stand` (the grab) brings him out of a crouch. */
  private override(x: number, y: number, z: number, yaw: number, stand: boolean): void {
    this.kin.set(x, y, z);
    const ov = this.ov;
    ov.kinematic = this.kin;
    ov.yaw = yaw;
    ov.crouch = stand ? false : undefined;
    this.g.player.controller.override = ov;
  }

  /** Attacker state from back-to-wall (step 12: a high wall `wall`, a low one `wallLow`) / traversal. */
  private attackerState(): AttackerState {
    const g = this.g;
    const tr = g.traversal;
    // (hang-down) head-first under the partner's hands (a team move, not an attach)
    if (g.team.hangActs) return 'hangDown';
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
    this.bend = this.bendDrop = this.sway = 0;
    this.stepping = false;
    if (this.tailU >= 0) this.killTail(dt);
    if (this.carryId) this.carryStep(dt);
    if (this.active) {
      this.holding = held;
      this.run(dt);
      return true;
    }
    this.offer = g.player.alive && !g.carrier?.carrying ? this.find() : null;
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
    // (player-hygiene S3) the started takedown's own plan: a copy of the offer's (the scan's scratch is never mutated)
    const plan = this.activePlan;
    const op = o.plan;
    plan.kind = op.kind;
    plan.alignX = op.alignX;
    plan.alignY = op.alignY;
    plan.alignZ = op.alignZ;
    plan.faceYaw = op.faceYaw;
    plan.approach = op.approach;
    plan.arc = op.arc;
    plan.strike = op.strike;
    if (op.victimTo) {
      const to = this.activeTo;
      to.x = op.victimTo.x;
      to.y = op.victimTo.y;
      to.z = op.victimTo.z;
      plan.victimTo = to;
    } else plan.victimTo = null;
    // leaving the anchor for moves that carry the attacker; hanging pulls (and an inverted choke) stay put
    const hangDown = plan.kind === 'hangDown';
    if (plan.kind !== 'below' && plan.kind !== 'window' && plan.kind !== 'inverted' && !hangDown) {
      if (g.traversal.attached) g.traversal.reset();
    }
    // (3.2.0) from behind on a guard on two legs: a grab, decided by a fresh press while holding them
    const grab = GRAB_KINDS.includes(plan.kind) && !o.e.def.quadruped && !o.lethalOnly && lethal === undefined;
    // (G7, AUDIT-WALLS row 5) the grab steps in over 0.42 s (CT 110936: 1.5 m in 0.35-0.45 s), rising out of a crouch
    // (hang-down) from the hang the hands reach down to him (`HANG_GRAB.reach`), the body stays where it hangs
    if (grab && hangDown) plan.approach = HANG_GRAB.reach;
    else if (grab) {
      plan.approach = GRAB.approach;
      c.standUp();
    }
    // (G7) the victim struggles from the contact, not the press
    // (coop-walk-fixes P6) the partner's hostage stays in the partner's hold: not seized here; the net layer is told
    const assist = plan.kind === 'assist';
    if (assist) g.net?.assistTakedown?.(o.e, 'start', false);
    else o.e.beginTakedown(lethal !== true, plan.approach);
    this.active = {
      e: o.e,
      plan,
      lethal: lethal === true,
      decided: grab || lethal !== undefined,
      t: 0,
      from: c.pos.clone(),
      vFrom: o.e.pos.clone(),
      hp: g.target.health.hp,
      grab: grab ? { hold: false, pressT: -1, strikeT: -1, vYaw0: o.e.yaw, holdT: 0, interT: -1, talk: null, talkI: 0, talkT: 0 } : null,
    };
    if (grab) this.grabs.held++;
    this.offer = null;
    g.events.emit('takedown', { phase: 'start', lethal: lethal === true, kind: plan.kind });
  }

  /** The nearest candidates (up to `TRY`), nearest first. */
  private cand: (TakedownVictim | null)[] = [null, null, null];
  private candD = [0, 0, 0];

  private find(): { e: TakedownVictim; plan: TakedownPlan; lethalOnly: boolean } | null {
    const g = this.g;
    const vs = g.takedownVictims();
    if (!vs.length) return null;
    // (hang-down) lowered, pulled up or dropped: nothing (settled, `attackerState` 'hangDown')
    if (g.team.hangingDown && !g.team.hangActs) return null;
    const p = g.player.position;
    const cand = this.cand;
    const cd = this.candD;
    cand[0] = cand[1] = cand[2] = null;
    cd[0] = cd[1] = cd[2] = SCAN;
    // a guard in combat who knows this operator is there cannot be taken by surprise (each player separately)
    const known = g.spottedLocal;
    const net = g.net;
    for (let k = 0; k < vs.length; k++) {
      const e = vs[k]!;
      // (coop-walk-fixes P6) a guard the partner holds as a hostage is on offer (the team takedown), taken or alert
      // (G348) a dog: no takedown of any kind, from any state
      if (!e.alive || e.def.quadruped || ((e.taken || (known && e.level === 'alert')) && !(net?.partnerHolds?.(e) ?? false))) continue;
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
    // (coop-walk-fixes P6) the partner's hostage: the team takedown from the ground (or a wall), chest to chest sight
    if (g.net?.partnerHolds?.(best)) {
      if (i.state !== 'ground' && i.state !== 'wall') return null;
      this.eye.set(p.x, p.y + 1.2, p.z);
      this.head.set(best.pos.x, best.pos.y + 1.2, best.pos.z);
      // (player-hygiene S3) the shorter sight check: the first hit's distance, or the segment's (no hit), allocates nothing
      const los = g.ballistics.hitDistance(this.eye, this.head, G.STATIC) > Vector3.Distance(this.eye, this.head) - 0.2;
      if (!assistPlanInto(p.x, p.y, p.z, best.pos.x, best.pos.y, best.pos.z, los, this.scanPlan)) return null;
      const so = this.scanOffer;
      so.e = best;
      so.lethalOnly = false;
      return so;
    }
    i.ax = p.x;
    // (hang-down) the hanging head's height (the rig root is the turned-over feet reference)
    i.ay = i.state === 'hangDown' ? p.y - HANG_HEAD : p.y;
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
    // (hang-down: from the hanging head; no dog is taken from the hang)
    if (i.state === 'hangDown' && best.def.quadruped) return null;
    this.eye.set(p.x, p.y + (i.state === 'hang' ? 2.05 : i.state === 'hangDown' ? 0.05 - HANG_HEAD : 1.2), p.z);
    // (the plan's align is the attacker's own spot; from the hang it is never used: the body stays where it hangs)
    this.head.set(best.pos.x, best.pos.y + 1.2, best.pos.z);
    i.los = g.ballistics.hitDistance(this.eye, this.head, G.STATIC | G.GLASS) > Vector3.Distance(this.eye, this.head) - 0.2;
    if (!pickTakedownInto(i, this.scanPlan, this.scanTo)) return null;
    const plan = this.scanPlan;
    // archetypes: an enforcer's shield stops a grab from the front, a heavy only falls to a strike there
    // (G155) no heavies in the missions: the heavy's frontal rule is off; the enforcer's shield still stops a frontal grab
    // (hang-down) from over the head: no shield or frontal rule applies
    const rule = best.def.kind === 'heavy' || plan.kind === 'hangDown' ? 'ok' : grabRule(best.def.kind, plan.kind);
    if (rule === 'no') return null;
    const so = this.scanOffer;
    so.e = best;
    so.lethalOnly = rule === 'lethal';
    return so;
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
    if (this.active!.plan.kind === 'hangDown') {
      this.runHangGrab(dt, gr);
      return;
    }
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
      const stage = grabStage(a.t, plan.approach, GRAB.pull);
      approachPoint(a.from.x, a.from.y, a.from.z, plan, Math.min(1, a.t / Math.max(0.01, plan.approach)), this.pt);
      this.override(this.pt.x, this.pt.y, this.pt.z, plan.faceYaw, true);
      if (stage === 0) {
        this.stepping = true;
        // (G7) he has not noticed yet: where he stood, facing his own way
        e.holdAt(a.vFrom.x, a.vFrom.y, a.vFrom.z, gr.vYaw0);
        return;
      }
      // (G7, row 5, 110936 @ 6.4-7.0) the pull-in: arm round the neck, the guard drawn back off his feet against the
      // chest (from where he stood to the hold, turning to the operator's facing), flailing
      const k = ease((a.t - plan.approach) / GRAB.pull);
      const fx = Math.sin(plan.faceYaw);
      const fz = Math.cos(plan.faceYaw);
      const hx = plan.alignX + fx * GRAB.hold + fz * GRAB.side;
      const hz = plan.alignZ + fz * GRAB.hold - fx * GRAB.side;
      const dy = gr.vYaw0 + wrapPi(plan.faceYaw - gr.vYaw0) * k;
      e.holdAt(a.vFrom.x + (hx - a.vFrom.x) * k, a.vFrom.y, a.vFrom.z + (hz - a.vFrom.z) * k, dy);
      this.bend = CQ.holdBend * k;
      if (stage === 2) {
        gr.hold = true;
        c.override = null;
        e.setSolid?.(false);
        e.holdAsHostage?.();
      }
      return;
    }
    // holding: (G7, row 11) a slow walk at most (CT 0.7 m/s); the hostage stays in front, facing the way the operator
    // does, the pair swaying a little while still (row 19)
    c.speedCap = Math.min(gearCap(c.gear, c.crouched), GRAB.speedCap);
    gr.holdT += dt;
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    const sw = holdSway(gr.holdT, 1 - Math.min(1, c.speed / 0.3));
    e.holdAt(c.pos.x + fx * GRAB.hold + fz * (sw + GRAB.side), c.pos.y, c.pos.z + fz * GRAB.hold - fx * (sw + GRAB.side), c.yaw);
    this.bend = CQ.holdBend;
    this.sway = sw;
    if (gr.strikeT >= 0) {
      gr.strikeT += dt / this.handsMul;
      if (a.lethal) {
        // (anim-n4d, M1) the arc's contact on the kill (`killWarp`); the wire keeps the raw phase (`grabWire`)
        g.player.pose.melee = killWarp(Math.min(1, gr.strikeT / GRAB.killTime), GRAB_KILL_BLOW);
        if (gr.strikeT >= GRAB.killTime) {
          c.speedCap = Infinity;
          this.grabs.killed++;
          this.finish();
        }
        return;
      }
      // (G7, row 20, 110936 @ 37.0-38.2) the knockout: he goes limp and is lowered in front, the operator bent over
      // him with both hands still on him; he stands up again once the guard is down (the anim graph eases the bend)
      g.player.pose.melee = -1;
      c.speedCap = 0;
      const ko = koCurve(Math.min(1, gr.strikeT / CQ.koTime), this.ko);
      e.holdPose?.('ko', ko.limp, ko.lower);
      this.bend = CQ.holdBend + (CQ.koBend - CQ.holdBend) * ko.bend;
      this.bendDrop = CQ.koDrop * ko.bend;
      if (gr.strikeT >= CQ.koTime) {
        c.speedCap = Infinity;
        this.grabs.ko++;
        this.finish();
      }
      return;
    }
    if (this.holdTalk(dt, gr, e)) return;
    this.holdPick(gr, true);
  }

  /** (G7, PR 3) The interrogation under way (true: it ran this step), then the lines it got, said one by one. */
  private holdTalk(dt: number, gr: GrabState, e: TakedownVictim): boolean {
    const g = this.g;
    if (gr.interT >= 0) {
      // ("Missing entirely": interrogate, 052607 @ 7-8) the free hand at his jaw, his head turned to the operator;
      // the hold goes on (and the menu) after it
      gr.interT += dt;
      e.holdPose?.('interrogate', Math.min(1, gr.interT / CQ.interrogate));
      if (gr.interT >= CQ.interrogate) {
        gr.interT = -1;
        e.holdAsHostage?.();
        this.grabs.interrogated++;
        // (PR 3) what he knows, said as his own lines (subtitle, `GUARD_INFO_GAP` apart); a guard with nothing says
        // nothing new. Spent here: he gives no menu again, and the hold goes on.
        const info = e.info ?? null;
        const lines = takeInfo(e);
        if (lines) {
          gr.talk = lines;
          gr.talkI = 0;
          gr.talkT = 0;
        } else if (!g.puppet) g.hud.feedItem('Interrogated: nothing new'); // a client: the host's feed answers
        if (!g.puppet) revealIntel(g, e.pos, info, e.id); // (spare 9) the client's intel comes from the host; (EN2) `eid` for a mission's named target
        // (joint-interrogation, G148) the host's own read with a partner's live bluff: the joint lines too. Host / solo
        // holder only (a client holder's read is the host's `seized` path; solo has no `net`, so no bluff)
        if (!g.puppet && lines && g.net?.jointLive?.(e, jointOf(info))) revealJoint(g, e.pos, jointOf(info));
      }
      return true;
    }
    if (gr.talk) {
      gr.talkT -= dt;
      if (gr.talkT <= 0) {
        g.hud.barks.say(e.id, gr.talk[gr.talkI]!, false);
        gr.talkT = GUARD_INFO_GAP;
        if (++gr.talkI >= gr.talk.length) gr.talk = null;
      }
    }
    return false;
  }

  /** (A4, G23) The held guard's pick this step: knock out, kill, carry (`carryOk`: a knockout, then the body goes on
   *  the shoulder; from the hang-down a plain knockout), interrogate. */
  private holdPick(gr: GrabState, carryOk: boolean): void {
    const a = this.active!;
    const e = a.e;
    // (A4, G23) the CT grab menu's pick: knock out, kill, or carry (a knockout, then the body goes on the shoulder)
    const pick = this.menuPick;
    this.menuPick = null;
    if (pick === 'knockout' || pick === 'kill' || pick === 'carry') {
      a.lethal = pick === 'kill';
      // (G7) the kill's struggle blends from the hold (a fresh seize snapped the arms to the rest pose first)
      if (a.lethal) {
        if (e.holdPose) e.holdPose('seizedLethal', 0);
        else e.beginTakedown(false);
      }
      if (pick === 'carry' && carryOk) {
        this.carryId = e.id;
        this.carryT = 1.5;
      }
      gr.strikeT = 0;
    } else if (pick === 'interrogate') gr.interT = 0;
  }

  /**
   * (hang-down) The grab from the co-op hang-down: the hands reach down (`HANG_GRAB.reach`), the guard is lifted to them
   * (`HANG_GRAB.lift`), then held in front of the chest under the hanging head (following the holder's depth). Then the
   * held rules as on the ground (Michael 08:10-08:25; anim-rework S1): RT tap knocks him out, RT hold kills (the neck
   * snap), interrogate when he knows something, the aim makes him a shield; no let-go. The body never moves (the team
   * move owns it). (A4) The hang ending first (pulled up, dropped, the hold lost) knocks him out at once.
   */
  private runHangGrab(dt: number, gr: GrabState): void {
    const g = this.g;
    const a = this.active!;
    const { e, plan } = a;
    a.t += dt / this.handsMul;
    if (!g.player.alive || !e.alive) {
      if (!e.alive) this.grabs.lost++;
      this.abort();
      return;
    }
    if (!gr.hold && g.target.health.hp < a.hp - 0.5) {
      this.abort();
      return;
    }
    if (!g.team.hangActs) {
      // (A4) KO by default: a neck snap under way ends as the kill, anything else as the knockout
      a.lethal = a.lethal && gr.strikeT >= 0;
      this.grabs[a.lethal ? 'killed' : 'ko']++;
      this.finish();
      return;
    }
    const p = g.player.position;
    const at = hangHoldPoint(p.x, p.z, p.y - HANG_HEAD, plan.faceYaw, a.vFrom.y, this.pt);
    if (!gr.hold) {
      if (a.t < plan.approach) {
        e.holdAt(a.vFrom.x, a.vFrom.y, a.vFrom.z, gr.vYaw0);
        return;
      }
      // lifted to the hands, turned with his back to the hanging body
      const k = ease((a.t - plan.approach) / HANG_GRAB.lift);
      e.holdAt(a.vFrom.x + (at.x - a.vFrom.x) * k, a.vFrom.y + (at.y - a.vFrom.y) * k, a.vFrom.z + (at.z - a.vFrom.z) * k, gr.vYaw0 + wrapPi(plan.faceYaw - gr.vYaw0) * k);
      if (k >= 1) {
        gr.hold = true;
        e.setSolid?.(false);
        e.holdAsHostage?.();
      }
      return;
    }
    gr.holdT += dt;
    if (gr.strikeT >= 0) {
      gr.strikeT += dt / this.handsMul;
      if (a.lethal) {
        // the neck snap
        e.holdAt(at.x, at.y, at.z, plan.faceYaw);
        if (gr.strikeT >= GRAB.killTime) {
          this.grabs.killed++;
          this.finish();
        }
        return;
      }
      // the choke: limp, let down onto his floor
      const ko = koCurve(Math.min(1, gr.strikeT / CQ.koTime), this.ko);
      e.holdPose?.('ko', ko.limp, ko.lower);
      e.holdAt(at.x, at.y + (a.vFrom.y - at.y) * ko.limp, at.z, plan.faceYaw);
      if (gr.strikeT >= CQ.koTime) {
        this.grabs.ko++;
        this.finish();
      }
      return;
    }
    e.holdAt(at.x, at.y, at.z, plan.faceYaw);
    if (this.holdTalk(dt, gr, e)) return;
    this.holdPick(gr, false);
  }

  /** (anim-n4d, M1) The kill blow's follow-through and return after the kill (pose only; gameplay is done): the blow's
   *  phase runs on from 1 at its nominal pace. A new takedown or a strike takes the arc over; a death ends it. */
  private killTail(dt: number): void {
    const g = this.g;
    if (this.active || g.strike.active) {
      this.tailU = -1;
      return;
    }
    this.tailU += dt / this.tailB.dur;
    if (this.tailU >= KILL_TAIL_END || !g.player.alive) {
      this.tailU = -1;
      g.player.pose.melee = -1;
      return;
    }
    g.player.pose.melee = killWarp(this.tailU, this.tailB);
  }

  /** (A4) A carry pick: once the knocked-out guard's body exists, the operator shoulders it. */
  private carryStep(dt: number): void {
    const g = this.g;
    this.carryT -= dt;
    // (player-hygiene S3) an index loop, the first match (no closure per step)
    const bs = g.enemyMgr?.bodies;
    let b: NonNullable<typeof bs>[number] | undefined;
    if (bs) {
      for (let k = 0; k < bs.length; k++) {
        if (bs[k]!.enemyId === this.carryId) {
          b = bs[k];
          break;
        }
      }
    }
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
    a.t += dt / this.handsMul;
    const assist = plan.kind === 'assist';
    // tap or hold: let go before `lethalHold` = non-lethal, still held then = lethal
    if (!a.decided) {
      if (!this.holding) a.decided = true;
      else if (a.t >= TAKEDOWN.lethalHold) {
        a.decided = true;
        a.lethal = true;
        if (!assist) e.beginTakedown(false);
      }
    }
    // hurt mid-move (or the victim died to something else): it falls apart; (P6) the partner's hold ended first too
    if (g.target.health.hp < a.hp - 0.5 || !g.player.alive || !e.alive || (assist && !(g.net?.partnerHolds?.(e) ?? false))) {
      this.abort();
      return;
    }
    const hangDown = plan.kind === 'hangDown';
    // (hang-down, A4) the hang ended under a quick takedown (pulled up, dropped): it ends at once as decided, a knockout
    // when not yet decided
    if (hangDown && !g.team.hangActs) {
      if (!a.decided) a.lethal = false;
      a.decided = true;
      this.finish();
      return;
    }
    const total = plan.approach + plan.strike;
    const kAp = plan.approach > 0 ? Math.min(1, a.t / plan.approach) : 1;
    // attacker: along the path onto the aligned spot, facing the victim
    if (plan.kind !== 'below' && plan.kind !== 'window' && plan.kind !== 'inverted' && !hangDown) {
      approachPoint(a.from.x, a.from.y, a.from.z, plan, kAp, this.pt);
      this.override(this.pt.x, this.pt.y, this.pt.z, plan.faceYaw, false);
      this.stepping = kAp < 1;
    }
    // victim: held (behind / front: turned so the attacker is where the plan says), pulled where planned; (P6) the
    // partner's hostage stays where his holder has him
    const vt = plan.victimTo;
    if (!assist) {
      const kPull = vt ? Math.min(1, a.t / Math.max(0.01, TAKEDOWN.pullTime)) : 0;
      const vx = vt ? a.vFrom.x + (vt.x - a.vFrom.x) * kPull : a.vFrom.x;
      const vy = vt ? a.vFrom.y + (vt.y - a.vFrom.y) * kPull * kPull : a.vFrom.y;
      const vz = vt ? a.vFrom.z + (vt.z - a.vFrom.z) * kPull : a.vFrom.z;
      e.holdAt(vx, vy, vz, plan.kind === 'front' ? plan.faceYaw + Math.PI : plan.faceYaw);
    }
    // the strike / choke pose
    const ks = (a.t - plan.approach) / plan.strike;
    const pose = g.player.pose;
    this.blowPh = a.lethal && ks >= 0 ? Math.min(1, ks) : -1;
    // (anim-n4d, M1) the arc's contact on the kill (`killWarp`), the follow-through after it (`killTail`)
    // (hang-down) no elbow arc upside down: the hands on his neck (`frameUpdate`)
    pose.melee = hangDown ? -1 : killWarp(this.blowPh, TAKEDOWN_BLOW);
    // (never finishes before the choice is made)
    if (a.t >= total && (a.decided || a.t >= TAKEDOWN.lethalHold)) this.finish();
  }

  /** Render frame: the attacker's hands on the victim (neck / shoulders) for a choke. */
  frameUpdate(): void {
    const a = this.active;
    const rig = this.g.player.rig;
    // (course-restart-hold) a victim gone since the last tick (disposed, killed): no hands on him; the tick aborts
    if (!a || !a.e.alive) return;
    const vr = a.e.bodyRig;
    vr.neck.computeWorldMatrix(true);
    const n = vr.neck.getAbsolutePosition();
    // (anim-cleanup) a guard's neck and shoulder are not a grip axis
    clearGripAxis(rig.reachR);
    clearGripAxis(rig.reachL);
    if (a.grab) {
      this.grabHands(a.grab, n.x, n.y, n.z);
      return;
    }
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

  /**
   * (G7, AUDIT-WALLS rows 5, 19, 20) The hands on a grabbed guard: reaching in over the end of the approach; then the
   * left forearm across his throat (the hand at his right collarbone, in front of the neck), the right hand on his
   * right shoulder (holstered; a drawn sidearm keeps the hand on the gun); through the knockout both stay on him as he
   * is lowered; interrogating, the left hand goes to his jaw.
   */
  private grabHands(gr: GrabState, nx: number, ny: number, nz: number): void {
    const a = this.active!;
    const rig = this.g.player.rig;
    const vr = a.e.bodyRig;
    const yaw = a.e.yaw;
    const s = Math.sin(yaw);
    const c = Math.cos(yaw);
    const contact = a.t >= a.plan.approach;
    const on = gr.hold || contact ? 1 : ease((a.t / Math.max(0.01, a.plan.approach) - 0.55) / 0.45);
    vr.shoulderR.computeWorldMatrix(true);
    const sr = vr.shoulderR.getAbsolutePosition();
    const hl = this.hl;
    const hp = this.hp;
    holdHandTargets(nx, ny, nz, sr.x, sr.y, sr.z, yaw, hl, hp);
    if (gr.interT >= 0) {
      const k = Math.min(1, gr.interT / CQ.interrogate);
      const e = ease(k / 0.12) * (1 - ease((k - 0.85) / 0.15));
      vr.headNode.computeWorldMatrix(true);
      const h = vr.headNode.getAbsolutePosition();
      hl.x += (h.x + s * 0.09 - hl.x) * e;
      hl.y += (h.y - 0.07 - hl.y) * e;
      hl.z += (h.z + c * 0.09 - hl.z) * e;
    }
    rig.reachL.x = hl.x;
    rig.reachL.y = hl.y;
    rig.reachL.z = hl.z;
    rig.reachL.w = on;
    const drawn = this.g.weapons.drawPhase !== 0;
    rig.reachR.x = hp.x;
    rig.reachR.y = hp.y;
    rig.reachR.z = hp.z;
    // (the kill's blow is the right arm's elbow arc: the hand leaves the shoulder for it)
    rig.reachR.w = drawn || (gr.strikeT >= 0 && a.lethal) ? 0 : on * 0.9;
  }

  private release(): void {
    const g = this.g;
    // (hang-down) only our own override: from the hang the team move's holds the body
    if (g.player.controller.override === this.ov) g.player.controller.override = null;
    if (this.active?.grab) {
      g.player.controller.speedCap = Infinity;
      // (a dead hostage's hit volumes are gone)
      if (this.active.e.alive) this.active.e.setSolid?.(true);
    }
    g.player.pose.melee = -1;
    this.blowPh = -1;
    const rig = g.player.rig;
    rig.reachL.w = rig.reachR.w = 0;
    this.active = null;
  }

  private finish(): void {
    const g = this.g;
    const a = this.active!;
    const e = a.e;
    this.release();
    // (anim-n4d, M1) the blow's contact landed on the kill: its follow-through plays on (pose only)
    const hangDown = a.plan.kind === 'hangDown';
    if (a.lethal && !hangDown) {
      this.tailB = a.grab ? GRAB_KILL_BLOW : TAKEDOWN_BLOW;
      this.tailU = 1;
      g.player.pose.melee = killWarp(1, this.tailB);
    }
    if (a.plan.kind === 'assist') {
      // (coop-walk-fixes P6) the team takedown: the host applies it (its own at once; a client's after its check) and
      // ends the partner's hold; the noise and the credit (a dual takedown) are the host's too
      g.net?.assistTakedown?.(e, 'done', a.lethal);
      this.done[a.lethal ? 'lethal' : 'nonLethal']++;
      this.done.byKind.assist = (this.done.byKind.assist ?? 0) + 1;
      g.events.emit('takedown', { phase: 'done', lethal: a.lethal, kind: 'assist' });
      return;
    }
    e.taken = false;
    e.bodyRig.emote = null;
    const dir = new Vector3(Math.sin(a.plan.faceYaw), 0, Math.cos(a.plan.faceYaw));
    const hit = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1, takedown: a.plan.kind };
    if (a.lethal) e.applyDamage(hit);
    else e.knockOut(hit);
    this.done[a.lethal ? 'lethal' : 'nonLethal']++;
    const kind = a.grab ? (hangDown ? 'hangGrab' : 'grab') : a.plan.kind;
    this.done.byKind[kind] = (this.done.byKind[kind] ?? 0) + 1;
    const r = a.lethal ? NOISE_STRIKE : NOISE_CHOKE;
    // (guard-ai S26) his own noise: it locates him
    g.enemyMgr?.hear(g.player.position, r, 'noise', null, g.localId);
    g.events.emit('takedown', { phase: 'done', lethal: a.lethal, kind });
  }

  /** Interrupted: the victim breaks free (staggered, alert). */
  abort(): void {
    const a = this.active;
    if (!a) return;
    this.release();
    // (P6) the partner's hostage was never seized here: the partner keeps him
    if (a.plan.kind === 'assist') this.g.net?.assistTakedown?.(a.e, 'abort', a.lethal);
    else if (a.e.alive) a.e.releaseTakedown();
    this.done.aborted++;
    this.g.events.emit('takedown', { phase: 'abort', lethal: a.lethal, kind: a.plan.kind });
  }

  /** (strike-pops, n4d polish 1) End a kill's follow-through now (the arc back to none): `reset`, and the respawn
   *  through `StrikeController.reset` (a bay or section restart moves the player: no tail on the restarted player). */
  endTail(): void {
    if (this.tailU < 0) return;
    this.tailU = -1;
    this.g.player.pose.melee = -1;
  }

  reset(): void {
    this.abort();
    this.endTail();
    this.offer = null;
    this.holding = false;
    this.carryId = '';
    this.menuPick = null;
  }
}
