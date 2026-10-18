import { Vector3 } from '../core/babylon';
import type { GameState, NetAttachment } from '../game/gameState';
import type { Blip } from '../ui/hud/minimap';
import type { BlobShadows } from '../vfx/blobShadows';
import { Ragdoll } from '../ai/ragdoll';
import { BUDGET } from '../physics/groups';
import { BODY } from '../ai/bodies';
import type { HitInfo } from '../game/damage';
import { Interactables, type Interactable } from '../game/interactables';
import type { NetSession } from './session';
import { PF, type EndStats, type Msg, type NetEvent, type NetItem, type PlayerState, wirePlayerState } from './protocol';
import { ClockSync } from './interp';
import type { CKind } from '../game/committedMoves';
import { RemoteAvatar } from './remoteAvatar';
import { setPlayerGlow } from '../operators/runtime/playerFigure';
import { EnemyPuppet } from './enemyPuppet';
import { PartnerTarget } from './partnerTarget';
import { PartnerBlocker, partnerPassable } from './partnerBlocker';
import type { TeamMate } from '../game/teamController';
import type { TeamKind } from '../game/teamMoves';
import { clampEnd, clientForcedHolster, coopSessionStats } from './validate';
import { applyCourseWire, clientCourseFrame, clientCourseSummary, courseStartPos, disposeClientCourse } from '../game/modes/courseMode';
import { isClientVerb, type ClientVerb } from '../game/course/courseWire';
import { CourseFeed } from '../game/course/courseFeed';
import { infoToHtml, localFlags } from './netShared';
import { hyp3 } from '../core/mathx';
import { localMoveState } from '../game/localMoveState';
import { dropBadWallMove, emptyMoveState, moveChanged } from '../player/moveState';
import { CrackPrediction } from '../world/doorPeek';

const SEND_HZ = 20;
const INTERP_DELAY = 0.12;

/**
 * Client side of a match. Only the local player is simulated (predicted); enemies, modes, pickups, objectives, doors
 * and health come from host snapshots. Own hits are resolved against local puppets (course: the partner's hit volumes)
 * for instant feedback and sent to the host for the real outcome; objectives, doors and revives are used through
 * mirrored interactables (`use`); takedowns seize a puppet here and the host's enemy there (`td`).
 */
export class CoopClient implements NetAttachment {
  private avatars = new Map<string, RemoteAvatar>();
  private puppets = new Map<string, EnemyPuppet>();
  private puppetList: EnemyPuppet[] = [];
  private targets = new Map<string, PartnerTarget>();
  /** (T5b2, D49) The co-op partners' bodies (every non-opponent): they block the local player as he blocks them. */
  private blockers: { id: string; a: RemoteAvatar; b: PartnerBlocker }[] = [];
  private ragdolls: Ragdoll[] = [];
  /** Bodies the host still has lying, by enemy id (dropped when its `snap.bodies` leaves one out). */
  private kept = new Map<string, Ragdoll>();
  private dying: EnemyPuppet[] = [];
  private clock = new ClockSync();
  private sendT = 0;
  private time = 0;
  private offs: (() => void)[] = [];
  private obj = '';
  private info = '';
  private ended = false;
  private lastBlast: { p: Vector3; t: number } | null = null;
  private ints: Interactables | null = null;
  private items = new Map<string, Interactable>();

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    this.offs.push(s.events.on('game', ({ msg }) => this.receive(msg)));
    // (G135) the goggle colours follow the host's player order (host green, us cyan as the partner)
    this.recolour();
    this.offs.push(s.events.on('lobby', () => this.recolour()));
    if (g.opts.mode === 'course') {
      // a bay-N start (D20): beside the host in that bay's entry airlock, before our first `pstate` (the host takes a
      // first state anywhere)
      const at = courseStartPos(g, g.opts.courseBay ?? 1, 1);
      if (at) g.player.controller.teleport(at, g.player.cam.yaw);
      const feed = new CourseFeed(g, true);
      this.feed = feed;
      this.offs.push(g.events.on('takedown', (e) => {
        if (e.phase === 'start') this.tdKind = e.kind;
      }));
      this.offs.push(() => feed.dispose(), () => disposeClientCourse(g));
    }
    g.explosions.onLocalBlast = (p) => {
      this.lastBlast = { p: p.clone(), t: this.time };
      s.toHost({ t: 'blast', x: p.x, y: p.y, z: p.z });
    };
    // (locomotion step 10) the host resolves committed moves (strike contact) on its guards
    g.strike.authority = false;
    // our gas / flash / EMP / noisemaker: the host applies it to the guards
    g.gadgets.onLocal = (kind, at) => {
      if (kind === 'gas' || kind === 'flash' || kind === 'emp' || kind === 'noise') s.toHost({ t: 'gadget', kind, x: at.x, y: at.y, z: at.z });
    };
    g.takedownVictims = () => this.puppetList;
    // wall medkit stations are the host's, mirrored (the host heals: health is host-authoritative)
    const own = g.interactables;
    if (own) for (const it of own.items.filter((x) => x.kind === 'medkitWall')) own.remove(it);
    if (g.opts.mode !== 'sandbox' || !own) {
      this.ints = new Interactables(g.scene, g.world.parts);
      (g as { interactables: Interactables | null }).interactables = this.ints;
    } else this.ints = own;
    // (free roam mirrors only the host's wall medkits)
    if (g.opts.mode === 'sandbox') this.mirrorOnly = 'medkitWall';
    g.hud.setObjective('Connecting to host…');
  }

  private get renderTime(): number {
    return this.clock.now(performance.now() / 1000) - INTERP_DELAY;
  }

  private receive(msg: Msg): void {
    if (this.ended) return;
    switch (msg.t) {
      case 'snap':
        this.onSnap(msg);
        break;
      case 'ev':
        for (const e of msg.events) this.onEvent(e);
        break;
      case 'course':
        applyCourseWire(this.g, msg);
        break;
      case 'end':
        this.onEndMsg(msg.stats);
        break;
      // (3.2.0 phase 5) team moves the host started / refused / ended for this player
      case 'tstart':
        if (msg.a === this.s.selfId || msg.b === this.s.selfId) this.g.team.begin(msg, this.s.selfId);
        break;
      case 'tdeny':
        if (msg.a === this.s.selfId) this.g.team.denied(msg.reason);
        break;
      // (locomotion step 10, A5) this player's committed move started at host time t0 / refused / interrupted
      case 'cstart':
        if (msg.a !== this.s.selfId) break;
        if (msg.kind === 'strike') this.g.strike.accepted(msg.id, this.clock.now(performance.now() / 1000) - msg.t0);
        break;
      case 'cdeny':
        if (msg.a !== this.s.selfId) break;
        if (msg.kind === 'strike') this.g.strike.denied(msg.id, msg.reason);
        break;
      case 'tend':
        if (msg.a === this.s.selfId || msg.b === this.s.selfId) this.g.team.ended();
        break;
    }
  }

  /** (3.2.0 phase 5) Team-mates for team moves (co-op: every other player; TDM: the same side). */
  teamRequest(kind: TeamKind, partner: string, target: number, ss: number, gy: number): void {
    this.s.toHost({ t: 'tmove', kind, partner, target, s: ss, gy });
  }

  /** (locomotion step 10, A5) Ask the host for a committed move. */
  commitRequest(kind: CKind, id: number, target: string): void {
    this.s.toHost({ t: 'cmove', kind, id, target });
  }

  teamEnd(): void {
    this.s.toHost({ t: 'tmove', kind: 'end', partner: '', target: -1, s: 0, gy: 0 });
  }

  /** (step 11, D8) The other players with their back to segment `seg` (metres along it), from their MoveStates. */
  wallOthers(seg: number, out: Float64Array): number {
    let n = 0;
    for (const a of this.avatars.values()) {
      const mv = a.buf.latest()?.mv;
      if (n < out.length && !a.dead && mv?.m === 'wall' && mv.a === seg) out[n++] = mv.s;
    }
    return n;
  }

  private mateOut: TeamMate[] = [];
  teamMates(): readonly TeamMate[] {
    const out = this.mateOut;
    out.length = 0;
    for (const [id, a] of this.avatars) {
      if (a.dead) continue;
      out.push({ id, pos: a.pos, yaw: a.yaw, mode: a.mode, anchor: a.anchor, s: a.s, sub: a.sub });
    }
    return out;
  }

  private avatar(st: PlayerState): RemoteAvatar | null {
    let a = this.avatars.get(st.id);
    if (!a) {
      const info = this.s.players.get(st.id);
      if (!info) return null;
      const g = this.g;
      a = new RemoteAvatar(g.world, g.vfx, g.ballistics, info);
      a.onFire = (cls, at) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z });
      this.avatars.set(st.id, a);
      setPlayerGlow(a.figure, [...this.s.players.values()], st.id);
      // course mode (D38): the partner can be shot (the host decides the damage, co-op rules)
      if (g.opts.mode === 'course') {
        const t = new PartnerTarget(g.scene, g.registry, st.id, a);
        t.onShot = (h) => this.sendShot(st.id, h);
        this.targets.set(st.id, t);
        // a partner's hit boxes take bullets only: its body is the blocker below (the same on the host)
        t.setSolid(false);
      }
      this.blockers.push({ id: st.id, a, b: new PartnerBlocker(g.scene, st.id) });
    }
    return a;
  }

  /** (G135) Every body's goggle colour from its player slot: the partner beacon. */
  private recolour(): void {
    const ps = [...this.s.players.values()];
    setPlayerGlow(this.g.player.figure, ps, this.s.selfId);
    for (const [id, a] of this.avatars) setPlayerGlow(a.figure, ps, id);
  }

  private dropAvatar(id: string): void {
    this.avatars.get(id)?.dispose();
    this.avatars.delete(id);
    this.targets.get(id)?.dispose();
    this.targets.delete(id);
    const i = this.blockers.findIndex((e) => e.id === id);
    if (i >= 0) {
      this.blockers[i]!.b.dispose();
      this.blockers.splice(i, 1);
    }
  }

  private onSnap(m: Extract<Msg, { t: 'snap' }>): void {
    const g = this.g;
    this.clock.observe(m.time, performance.now() / 1000);
    const seen = new Set<string>();
    for (const p of m.players) {
      if (p.id === this.s.selfId) {
        this.applySelf(p);
        continue;
      }
      seen.add(p.id);
      // (step 11 r3) a wall segment outside this level: the copy poses as ground, never from a stale face
      dropBadWallMove(p, g.world.level.coverSegments.length);
      this.avatar(p)?.buf.push(m.time, p);
    }
    for (const id of [...this.avatars.keys()]) if (!seen.has(id)) this.dropAvatar(id);
    const live = new Set<string>();
    for (const e of m.enemies) {
      live.add(e.id);
      let p = this.puppets.get(e.id);
      if (!p) {
        const np = new EnemyPuppet(g.scene, g.world, g.registry, e.id, e.k);
        np.onShot = (h) => this.sendShot(np.id, h);
        // the kind of our own takedown (its 'start' event) goes with the result: the host ticks the course verb (A23)
        np.onTakedown = (ph, lethal) => this.s.toHost(ph === 'done' && this.tdKind ? { t: 'td', target: np.id, ph, lethal, kind: this.tdKind } : { t: 'td', target: np.id, ph, lethal });
        this.puppets.set(e.id, np);
        p = np;
      }
      p.stale = 0;
      p.buf.push(m.time, e);
    }
    // enemies the host no longer reports (despawned without a kill event)
    for (const [id, p] of this.puppets) {
      if (!live.has(id) && !p.dead && (p.stale += 1 / 15) > 0.5) {
        p.dispose();
        this.puppets.delete(id);
      }
    }
    this.puppetList = [...this.puppets.values()];
    g.pickups?.setMask(m.pk);
    if (m.items) this.syncItems(m.items);
    if (m.doors) this.syncDoors(m.doors, m.dcr ?? []);
    if (m.bodies) {
      // carried off, hidden or revived on the host (snaps and events arrive in order, so a kept body is listed)
      for (const id of [...this.kept.keys()]) if (!m.bodies.includes(id)) this.dropBody(id);
    }
    if (m.obj !== this.obj) {
      this.obj = m.obj;
      g.hud.setObjective(m.obj);
    }
    if (m.info !== this.info) {
      this.info = m.info;
      g.hud.setModeInfo(infoToHtml(m.info));
    }
  }

  /** Mirror the host's usable things: create / move / enable; gone from the list = removed. */
  /** (step 15) Sandbox: mirror only this item kind into the client's own interactables. */
  private mirrorOnly: NetItem['k'] | null = null;

  private syncItems(list: NetItem[]): void {
    const ints = this.ints;
    if (!ints) return;
    const keep = new Set<string>();
    for (const n of list) {
      if (this.mirrorOnly && n.k !== this.mirrorOnly) continue;
      keep.add(n.id);
      let it = this.items.get(n.id);
      if (!it) {
        it = ints.add(n.id, n.k, new Vector3(n.x, n.y, n.z), n.label, n.hold, n.yaw);
        it.reach = n.reach;
        const id = n.id;
        it.onUse = () => this.s.toHost({ t: 'use', id });
        this.items.set(n.id, it);
      }
      it.pos.set(n.x, n.y, n.z);
      it.node.position.set(n.x, n.y, n.z);
      it.label = n.label;
      if (n.k === 'medkitWall') it.done = !n.on;
      // your own revive point is for the others
      const on = n.on && n.id !== `revive-${this.s.selfId}`;
      if (it.enabled !== on) ints.setEnabled(it, on);
      if (!on) it.progress = 0;
    }
    for (const [id, it] of this.items) {
      if (keep.has(id)) continue;
      ints.remove(it);
      this.items.delete(id);
    }
  }

  private syncDoors(open: number[], cracked: readonly number[]): void {
    const doors = this.g.world.doors;
    const pred = (this.crackPred ??= new CrackPrediction(doors.list.length));
    for (const d of doors.list) {
      doors.setOpen(d, open.includes(d.index));
      // (step 13) the host's cracks (door peek); a local prediction holds for about a round trip (fix r1)
      if (d.target === 0) doors.crack(d, pred.resolve(d.index, cracked.includes(d.index), this.time));
    }
  }

  /** (step 13 fix r1) The local crack predictions against the snapshots' `dcr`. */
  private crackPred: CrackPrediction | null = null;

  /** (locomotion step 13) Ask the host to crack door `i` (or close its crack); predicted locally by the caller. */
  doorCrack(i: number, on: boolean): void {
    (this.crackPred ??= new CrackPrediction(this.g.world.doors.list.length)).predict(i, on, this.time);
    this.s.toHost({ t: 'door', i, crack: on });
  }

  /** Host-authoritative health for the local player. */
  /** The host says guards in combat know this operator is there. */
  private selfSpotted = false;

  spotted(): boolean {
    return this.selfSpotted;
  }

  private applySelf(p: PlayerState): void {
    this.selfSpotted = (p.f & PF.spotted) !== 0;
    const g = this.g;
    // (step 09, D8) the host forced holstered (busy hands, downed): only when its own rule on this client's current
    // MoveState agrees, so an echo that has not caught up with a draw yet (latency) never cancels it (fix 2)
    if (p.mv && clientForcedHolster(p.mv.dw, g.weapons.drawPhase, this.mvNow, p.hp <= 0)) g.weapons.forceHolster();
    const h = g.target.health;
    h.hp = p.hp;
    if (p.hp <= 0 && g.player.alive) {
      g.player.alive = false;
      g.hud.banner('DOWN', g.opts.mode === 'sandbox' ? 'Respawning…' : 'A team-mate can revive you', 2500);
    }
  }

  private sendShot(target: string, h: HitInfo): void {
    const o = h.sourcePos;
    const dx = h.point.x - o.x;
    const dy = h.point.y - o.y;
    const dz = h.point.z - o.z;
    const len = hyp3(dx, dy, dz) || 1;
    this.s.toHost({
      t: 'shot',
      w: h.weapon ?? this.g.weapons.current.def.id,
      ox: o.x,
      oy: o.y,
      oz: o.z,
      dx: dx / len,
      dy: dy / len,
      dz: dz / len,
      target,
      part: h.part,
      rt: Math.max(0, this.renderTime),
      dist: len,
      dmg: Math.min(1000, h.amount),
    });
  }

  private name(id: string): string {
    return this.s.players.get(id)?.name ?? 'Operator';
  }

  private onEvent(e: NetEvent): void {
    const g = this.g;
    const me = this.s.selfId;
    switch (e.e) {
      case 'tracer': {
        const a = new Vector3(e.ax, e.ay, e.az);
        g.vfx.tracer(a, new Vector3(e.bx, e.by, e.bz), e.c, 0.02);
        g.vfx.muzzleFlash(a, 0.2);
        g.events.emit('remoteShot', { cls: 'rifle', x: a.x, y: a.y, z: a.z });
        // nearest puppet gets the firing pose
        let best: EnemyPuppet | null = null;
        let bd = 2.5;
        for (const p of this.puppets.values()) {
          const d = Vector3.Distance(p.pos, a);
          if (d < bd) {
            bd = d;
            best = p;
          }
        }
        best?.fired();
        break;
      }
      case 'boom': {
        const pos = new Vector3(e.x, e.y, e.z);
        const lb = this.lastBlast;
        if (lb && this.time - lb.t < 1.5 && Vector3.Distance(lb.p, pos) < 2) break; // already shown locally
        g.vfx.explosion(pos, e.r * 0.5);
        g.explosions.onExplode?.(pos, e.r);
        break;
      }
      case 'kill': {
        const p = this.puppets.get(e.enemy);
        if (p) {
          if (g.takedown.active?.e === p) g.takedown.abort();
          const rig = p.die();
          if (rig) {
            // the oldest kept body makes room (as the host's BODY.max does)
            if (this.kept.size >= BODY.max) this.dropBody(this.kept.keys().next().value!);
            const falling = this.ragdolls.filter((r) => !r.done && !r.settled).length;
            if (falling < BUDGET.maxRagdolls) {
              const away = p.pos.subtract(g.player.position);
              away.y = 0;
              away.normalize().scaleInPlace(12).addInPlaceFromFloats(0, 3, 0);
              const r = new Ragdoll(g.scene, rig, away, true);
              this.ragdolls.push(r);
              this.kept.set(e.enemy, r);
            } else rig.dispose();
          } else this.dying.push(p);
          this.puppets.delete(e.enemy);
          this.puppetList = [...this.puppets.values()];
        }
        if (e.by === me) {
          g.hud.hitMarker('kill');
          g.app.sfx.hitMarker('kill');
          g.app.input.haptic('kill');
          g.hud.feedItem(`${p?.def.name ?? 'Hostile'} ${e.head ? 'headshot' : 'down'}`, 'kill');
        } else {
          g.hud.feedItem(`${this.name(e.by)}: ${p?.def.name ?? 'hostile'} ${e.head ? 'headshot' : 'down'}`);
        }
        break;
      }
      case 'tdDenied': {
        if (e.player !== me) break;
        const p = this.puppets.get(e.enemy);
        if (p && g.takedown.active?.e === p) g.takedown.abort();
        p?.deny();
        break;
      }
      case 'banner':
        g.hud.banner(e.title, e.sub);
        break;
      case 'feed':
        g.hud.feedItem(e.text);
        break;
      case 'pickup':
        if (e.player !== me) break;
        if (e.kind === 'ammo') g.weapons.addAmmo(0.5);
        g.events.emit('pickup', { kind: e.kind });
        g.hud.feedItem('Ammo refilled');
        break;
      case 'hurt': {
        if (e.player !== me) break;
        const pp = g.player.position;
        g.hud.damageFrom(Math.atan2(e.x - pp.x, e.z - pp.z) - g.player.cam.yaw);
        g.player.cam.shake(e.boom ? 0.5 : 0.12);
        g.app.input.haptic('hurt');
        g.app.sfx.playerHurt();
        break;
      }
      case 'revive':
        if (e.player !== me) break;
        g.player.controller.override = null;
        g.traversal.reset();
        g.player.controller.teleport(new Vector3(e.x, e.y, e.z), g.player.cam.yaw);
        g.target.revive();
        g.hud.banner('BACK IN', '', 1500);
        break;
      case 'hitConfirm':
        break;
      case 'gadget':
        if (e.player !== me) g.gadgets.remoteEffect(e.kind, new Vector3(e.x, e.y, e.z));
        break;
      case 'ping':
        if (e.player !== me) g.addPing(e.player, e.x, e.y, e.z, e.target, this.s.players.get(e.player)?.tag.color ?? '#4fdc7c');
        break;
    }
  }

  private onEndMsg(raw: EndStats): void {
    this.ended = true;
    const end = clampEnd(raw, this.time);
    Object.assign(this.g.stats, coopSessionStats(this.g.stats, end, this.s.selfId));
    if (this.inCourse) this.g.stats.course = clientCourseSummary(this.g) ?? undefined;
    this.g.endSession(end.won, end.subtitle);
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.sendT -= dt;
    // the movement state: a new mode or sub-state (a ladder, a vault) goes out at once, not on the next tick
    const mv = localMoveState(this.g, this.mvNow);
    if (this.feed) {
      // drillDetect derives every verb; only the local-only ones go to the host (it derives the rest, C10)
      const out = this.feed.step();
      for (let i = 0; i < out.length; i++) {
        const v = out[i]!;
        if (isClientVerb(v)) this.ctick(v);
      }
    }
    const changed = moveChanged(this.mvSent, mv);
    if (this.sendT > 0 && !changed) return;
    this.sendT = 1 / SEND_HZ;
    Object.assign(this.mvSent, mv);
    this.mvSent.c = mv.c ? { ...mv.c } : undefined;
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    this.s.toHost({
      t: 'pstate',
      s: wirePlayerState({
        id: this.s.selfId,
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        yaw: c.yaw,
        pitch: p.cam.pitch,
        speed: c.speed,
        f: localFlags(g),
        w: g.weapons.current.def.id,
        hp: g.target.health.hp,
        mv,
      }),
    });
  }

  /** The movement state this step and the last one sent (change detection). */
  private mvNow = emptyMoveState();
  private mvSent = emptyMoveState();

  frameUpdate(dt: number): void {
    if (this.inCourse) clientCourseFrame(this.g, dt);
    const t = this.renderTime;
    for (const a of this.avatars.values()) a.update(dt, t);
    for (const tg of this.targets.values()) tg.sync();
    for (let i = 0; i < this.blockers.length; i++) {
      const e = this.blockers[i]!;
      e.b.sync(e.a.pos, (e.a.flags & PF.crouch) !== 0, !e.a.dead && !partnerPassable(e.a.mode));
    }
    for (const p of this.puppetList) p.update(dt, t);
    for (const p of this.dying) p.settle(dt);
    for (let i = this.ragdolls.length - 1; i >= 0; i--) {
      const r = this.ragdolls[i]!;
      r.update(dt);
      if (r.done) this.ragdolls.splice(i, 1);
    }
  }

  private dropBody(id: string): void {
    const r = this.kept.get(id);
    if (!r) return;
    this.kept.delete(id);
    r.dispose();
  }

  onLocalDeath(): boolean {
    return true;
  }

  /** Course mode: a verb only this client sees (C10); the host rate-limits and ticks it. */
  private ctick(verb: ClientVerb): void {
    if (this.inCourse) this.s.toHost({ t: 'ctick', verb });
  }
  /** Course mode (CT prototype B3): the held jammer's target for the host. */
  sendJam(tgt: string): void {
    if (this.inCourse) this.s.toHost({ t: 'jam', tgt });
  }
  private get inCourse(): boolean {
    return this.g.opts.mode === 'course';
  }
  /** Course mode: the local drill feed (C10). */
  private feed: CourseFeed | null = null;
  /** Course mode: the kind of our last takedown (sent with its `td` result). */
  private tdKind = '';

  /** Own ping: shown at once, the host relays it. */

  ping(x: number, y: number, z: number, target: string): void {
    this.feed?.ping();
    const me = this.s.selfId;
    this.s.toHost({ t: 'ping', x, y, z, target });
    this.g.addPing(me, x, y, z, target, this.s.players.get(me)?.tag.color ?? '#4fdc7c');
  }

  shadows(b: BlobShadows): void {
    for (const a of this.avatars.values()) b.add(a.pos.x, a.pos.y, a.pos.z, 0.42);
    for (const p of this.puppetList) if (p.alive) b.add(p.pos.x, p.pos.y, p.pos.z, 0.4 * p.def.scale);
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const a of this.avatars.values()) out.push({ x: a.pos.x, z: a.pos.z, kind: 'ally' });
    return out;
  }

  dispose(): void {
    for (const o of this.offs) o();
    for (const id of [...this.avatars.keys()]) this.dropAvatar(id);
    for (const p of this.puppets.values()) p.dispose();
    for (const p of this.dying) p.dispose();
    for (const r of this.ragdolls) r.dispose();
    this.puppets.clear();
    this.puppetList = [];
    this.dying.length = 0;
    this.ragdolls.length = 0;
    this.kept.clear();
    this.ints?.dispose();
    this.g.explosions.onLocalBlast = null;
    this.g.gadgets.onLocal = null;
  }
}
