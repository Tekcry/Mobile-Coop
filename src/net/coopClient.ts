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
import { isPvp, type EndStats, type Msg, type NetEvent, type NetItem, type PlayerState, type ScoreLine } from './protocol';
import { ClockSync } from './interp';
import { RemoteAvatar } from './remoteAvatar';
import { EnemyPuppet } from './enemyPuppet';
import { PvpTarget } from './pvpTarget';
import { pvpInfo, type PvpMode } from './pvp';
import { clampEnd, coopSessionStats } from './validate';
import { infoToHtml, localFlags } from './netShared';
import { hyp3 } from '../core/mathx';

const SEND_HZ = 20;
const INTERP_DELAY = 0.12;

/**
 * Client side of a match. Only the local player is simulated (predicted); enemies, modes, pickups, objectives, doors
 * and health come from host snapshots. Own hits are resolved against local puppets (PvP: opponents' hit volumes)
 * for instant feedback and sent to the host for the real outcome; objectives, doors and revives are used through
 * mirrored interactables (`use`); takedowns seize a puppet here and the host's enemy there (`td`).
 */
export class CoopClient implements NetAttachment {
  private avatars = new Map<string, RemoteAvatar>();
  private puppets = new Map<string, EnemyPuppet>();
  private puppetList: EnemyPuppet[] = [];
  private targets = new Map<string, PvpTarget>();
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
  private readonly pvp: PvpMode | null;
  private score: ScoreLine[] = [];
  private deaths = 0;

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    this.pvp = isPvp(g.opts.mode) ? (g.opts.mode as PvpMode) : null;
    this.offs.push(s.events.on('game', ({ msg }) => this.receive(msg)));
    g.explosions.onLocalBlast = (p) => {
      this.lastBlast = { p: p.clone(), t: this.time };
      s.toHost({ t: 'blast', x: p.x, y: p.y, z: p.z });
    };
    g.onEmote = (id) => s.toHost({ t: 'emote', id });
    // our gas / flash / EMP / noisemaker: the host applies it to the guards
    g.gadgets.onLocal = (kind, at) => {
      if (kind === 'gas' || kind === 'flash' || kind === 'emp' || kind === 'noise') s.toHost({ t: 'gadget', kind, x: at.x, y: at.y, z: at.z });
    };
    g.takedownVictims = () => this.puppetList;
    if (!this.pvp && g.opts.mode !== 'sandbox') {
      this.ints = new Interactables(g.scene, g.world.parts);
      (g as { interactables: Interactables | null }).interactables = this.ints;
    }
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
      case 'end':
        this.onEndMsg(msg.stats);
        break;
    }
  }

  /** Opponent in this match? (PvP: free-for-all everyone, team deathmatch the other side) */
  private hostile(id: string): boolean {
    if (!this.pvp) return false;
    if (this.pvp === 'ffa') return true;
    return (this.s.players.get(id)?.team ?? 0) !== (this.s.players.get(this.s.selfId)?.team ?? 0);
  }

  private avatar(st: PlayerState): RemoteAvatar | null {
    let a = this.avatars.get(st.id);
    if (!a) {
      const info = this.s.players.get(st.id);
      if (!info) return null;
      const g = this.g;
      a = new RemoteAvatar(g.world, g.vfx, g.ballistics, info);
      a.onFire = (cls, at) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z });
      if (this.pvp === 'tdm' && !this.hostile(st.id)) a.markTeam(info.team);
      this.avatars.set(st.id, a);
      if (this.hostile(st.id)) {
        const t = new PvpTarget(g.scene, g.registry, st.id, a);
        t.onShot = (h) => this.sendShot(st.id, h);
        this.targets.set(st.id, t);
      }
    }
    return a;
  }

  private dropAvatar(id: string): void {
    this.avatars.get(id)?.dispose();
    this.avatars.delete(id);
    this.targets.get(id)?.dispose();
    this.targets.delete(id);
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
        np.onTakedown = (ph, lethal) => this.s.toHost({ t: 'td', target: np.id, ph, lethal });
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
    if (m.doors) this.syncDoors(m.doors);
    if (m.bodies) {
      // carried off, hidden or revived on the host (snaps and events arrive in order, so a kept body is listed)
      for (const id of [...this.kept.keys()]) if (!m.bodies.includes(id)) this.dropBody(id);
    }
    if (m.obj !== this.obj) {
      this.obj = m.obj;
      g.hud.setObjective(m.obj);
    }
    if (this.pvp) {
      if (m.score) this.score = m.score;
      g.hud.setModeInfo(pvpInfo(this.pvp, this.score, this.s.selfId, m.tl ?? 0));
    } else if (m.info !== this.info) {
      this.info = m.info;
      g.hud.setModeInfo(infoToHtml(m.info));
    }
  }

  /** Mirror the host's usable things: create / move / enable; gone from the list = removed. */
  private syncItems(list: NetItem[]): void {
    const ints = this.ints;
    if (!ints) return;
    const keep = new Set<string>();
    for (const n of list) {
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

  private syncDoors(open: number[]): void {
    const doors = this.g.world.doors;
    for (const d of doors.list) doors.setOpen(d, open.includes(d.index));
  }

  /** Host-authoritative health for the local player. */
  private applySelf(p: PlayerState): void {
    const g = this.g;
    const h = g.target.health;
    h.hp = p.hp;
    h.shield = p.sh;
    if (p.hp <= 0 && g.player.alive) {
      g.player.alive = false;
      if (!this.pvp) g.hud.banner('DOWN', g.opts.mode === 'sandbox' ? 'Respawning…' : 'A team-mate can revive you', 2500);
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
      ex: h.execute === true,
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
          g.app.input.rumble(0.5, 0.8, 120);
          g.hud.feedItem(`${p?.def.name ?? 'Hostile'} ${e.head ? 'headshot' : 'down'}`, 'kill');
        } else {
          g.hud.feedItem(`${this.name(e.by)}: ${p?.def.name ?? 'hostile'} ${e.head ? 'headshot' : 'down'}`);
        }
        break;
      }
      case 'frag': {
        if (e.victim === me) this.deaths++;
        if (e.by === me && e.victim !== me) {
          g.hud.hitMarker('kill');
          g.app.sfx.hitMarker('kill');
          g.app.input.rumble(0.5, 0.8, 120);
          g.hud.feedItem(`${this.name(e.victim)} eliminated${e.head ? ' (headshot)' : ''}`, 'kill');
        } else if (e.victim === me) g.hud.banner('ELIMINATED', e.by === me ? '' : `by ${this.name(e.by)}`, 2500);
        else g.hud.feedItem(e.by === e.victim ? `${this.name(e.victim)} died` : `${this.name(e.by)} > ${this.name(e.victim)}`);
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
        g.hud.feedItem(e.kind === 'health' ? '+50 health' : 'Ammo refilled');
        break;
      case 'emote':
        if (e.player !== me) this.avatars.get(e.player)?.emote(e.id);
        break;
      case 'hurt': {
        if (e.player !== me) break;
        const pp = g.player.position;
        g.hud.damageFrom(Math.atan2(e.x - pp.x, e.z - pp.z) - g.player.cam.yaw);
        g.player.cam.shake(e.boom ? 0.5 : 0.12);
        g.app.input.rumble(0.6, 0.3, 90);
        g.app.sfx.playerHurt();
        break;
      }
      case 'revive':
        if (e.player !== me) break;
        g.cover.reset();
        g.traversal.reset();
        g.player.controller.teleport(new Vector3(e.x, e.y, e.z), g.player.cam.yaw);
        g.target.revive();
        if (!this.pvp) g.hud.banner('BACK IN', '', 1500);
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
    if (this.pvp) {
      const team = this.s.players.get(this.s.selfId)?.team ?? 0;
      end.won = end.winner !== '' && (end.winner === this.s.selfId || end.winner === `team${team}`);
    }
    Object.assign(this.g.stats, coopSessionStats(this.g.stats, end, this.s.selfId));
    if (this.pvp) this.g.stats.deaths = this.deaths;
    this.g.endSession(end.won, end.subtitle);
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 1 / SEND_HZ;
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    this.s.toHost({
      t: 'pstate',
      s: {
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
        sh: g.target.health.shield,
      },
    });
  }

  frameUpdate(dt: number): void {
    const t = this.renderTime;
    for (const a of this.avatars.values()) a.update(dt, t);
    for (const tg of this.targets.values()) tg.sync();
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

  /** Own ping: shown at once, the host relays it. */
  ping(x: number, y: number, z: number, target: string): void {
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
    for (const [id, a] of this.avatars) if (!this.hostile(id)) out.push({ x: a.pos.x, z: a.pos.z, kind: 'ally' });
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
