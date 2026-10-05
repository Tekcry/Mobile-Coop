import { Vector3 } from '../core/babylon';
import type { GameState, NetAttachment } from '../game/gameState';
import type { Enemy } from '../ai/enemy';
import type { HitInfo } from '../game/damage';
import type { Blip } from '../ui/hud/minimap';
import { WEAPONS, GRENADE } from '../weapons/weaponDefs';
import { G } from '../physics/groups';
import type { NetSession } from './session';
import { MAX_EVENTS, MAX_ENEMIES, PF, type EndStats, type EnemyState, type Msg, type NetEvent, type PlayerInfo, type PlayerState } from './protocol';
import { RemoteAvatar } from './remoteAvatar';
import { RemotePlayer } from './remotePlayer';
import { checkBlast, checkShot, maxHitDamage } from './validate';
import { localFlags, htmlToInfo } from './netShared';

const SNAP_HZ = 15;
const HISTORY_HZ = 20;
const MAX_REWIND = 0.6;
const INTERP_DELAY = 0.1;

interface Hist {
  t: number;
  x: number;
  y: number;
  z: number;
  c: number;
}

type Tally = EndStats['players'][string];
const emptyTally = (): Tally => ({ kills: 0, headshots: 0, byKind: { grunt: 0, runner: 0, heavy: 0 }, weaponKills: {} });

/**
 * Host side of a coop match. The host runs the full simulation (AI, waves, pickups) and owns
 * every outcome: client shots are re-checked against lag-compensated enemy positions, client
 * grenades are re-detonated here, and health for every player lives here.
 */
export class CoopHost implements NetAttachment {
  private remotes = new Map<string, RemotePlayer>();
  private queue: NetEvent[] = [];
  private time = 0;
  private snapT = 0;
  private histT = 0;
  private history = new Map<string, Hist[]>();
  private tallies = new Map<string, Tally>();
  private offs: (() => void)[] = [];
  private obj = '';
  private info = '';
  private tracerBudget = 0;
  private tmp = new Vector3();
  private tmpB = new Vector3();
  private tmpH = new Vector3();

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    g.remotePlayers = () => {
      const out = [];
      for (const r of this.remotes.values()) out.push(r.ref);
      return out;
    };
    for (const p of s.players.values()) if (p.id !== s.selfId) this.addRemote(p);
    this.offs.push(
      s.events.on('lobby', ({ players }) => {
        for (const p of players) if (p.id !== s.selfId && !this.remotes.has(p.id)) this.addRemote(p);
        for (const id of [...this.remotes.keys()]) if (!players.some((p) => p.id === id)) this.removeRemote(id);
      }),
      s.events.on('peerLeft', ({ id, name }) => {
        this.removeRemote(id);
        g.app.toasts.show(`${name} left`, 'warn');
      }),
      s.events.on('game', ({ msg, from }) => this.receive(msg, from)),
    );
    this.hookHud();
    this.hookCombat();
  }

  private hookHud(): void {
    const hud = this.g.hud;
    const setObjective = hud.setObjective.bind(hud);
    hud.setObjective = (t) => {
      this.obj = t;
      setObjective(t);
    };
    const setModeInfo = hud.setModeInfo.bind(hud);
    hud.setModeInfo = (html) => {
      this.info = htmlToInfo(html);
      setModeInfo(html);
    };
    const banner = hud.banner.bind(hud);
    hud.banner = (title, sub = '', ms) => {
      this.push({ e: 'banner', title, sub });
      banner(title, sub, ms);
    };
  }

  private hookCombat(): void {
    const g = this.g;
    const em = g.enemyMgr;
    if (em) {
      const prevKilled = em.onKilled;
      em.onKilled = (e, h) => {
        prevKilled?.(e, h);
        this.onKill(e, h);
      };
      const prevShot = em.onEnemyShot;
      em.onEnemyShot = (e, from, to) => {
        prevShot?.(e, from, to);
        if (this.tracerBudget-- > 0) {
          this.push({ e: 'tracer', ax: from.x, ay: from.y, az: from.z, bx: to.x, by: to.y, bz: to.z, c: e.def.weapon?.tracer ?? '#ffd27a' });
        }
      };
    }
    const prevBoom = g.explosions.onExplode;
    g.explosions.onExplode = (pos, r) => {
      prevBoom?.(pos, r);
      this.push({ e: 'boom', x: pos.x, y: pos.y, z: pos.z, r });
    };
    g.onEmote = (id) => this.push({ e: 'emote', player: this.s.selfId, id });
  }

  private push(e: NetEvent): void {
    if (this.queue.length < MAX_EVENTS * 2) this.queue.push(e);
  }

  private spawnPoint(i: number): Vector3 {
    const sp = this.g.world.layout.playerSpawns;
    return (sp[i % sp.length] ?? sp[0]!).pos;
  }

  private addRemote(p: PlayerInfo): void {
    const g = this.g;
    const avatar = new RemoteAvatar(g.world, g.vfx, g.ballistics, p);
    avatar.onFire = (cls, at) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z });
    const r = new RemotePlayer(g.scene, g.registry, p.id, avatar, this.spawnPoint(this.remotes.size + 1));
    r.onDamaged = (h) => this.push({ e: 'hurt', player: p.id, x: h.sourcePos.x, z: h.sourcePos.z, boom: h.kind === 'explosion' });
    r.onDeath = () => this.onRemoteDeath(r);
    this.remotes.set(p.id, r);
    if (!this.tallies.has(p.id)) this.tallies.set(p.id, emptyTally());
  }

  private removeRemote(id: string): void {
    const r = this.remotes.get(id);
    if (!r) return;
    r.dispose();
    this.remotes.delete(id);
    // a leaver can end a wave match if everyone left standing is down
    if (this.g.mode && !this.g.anyPlayerAlive()) this.g.mode.onPlayerDeath();
  }

  private onRemoteDeath(r: RemotePlayer): void {
    this.g.hud.feedItem(`${r.avatar.info.name} is down`, 'warn');
    if (this.g.mode) this.g.mode.onPlayerDeath();
    else setTimeout(() => this.revive(r), 3000); // sandbox
  }

  private revive(r: RemotePlayer): void {
    if (!this.remotes.has(r.id) || r.alive) return;
    const at = this.spawnPoint([...this.remotes.keys()].indexOf(r.id) + 1);
    r.revive(at);
    this.push({ e: 'revive', player: r.id, x: at.x, y: at.y, z: at.z });
  }

  private onKill(e: Enemy, h: HitInfo): void {
    const by = h.attackerId === 'local' || h.attackerId === '' ? this.s.selfId : h.attackerId;
    this.push({ e: 'kill', enemy: e.id, kind: e.def.kind, by, head: h.part === 'head' });
    this.history.delete(e.id);
    const t = this.tallies.get(by);
    if (t && by !== this.s.selfId) {
      t.kills++;
      t.byKind[e.def.kind]++;
      if (h.part === 'head') t.headshots++;
      if (h.weapon) t.weaponKills[h.weapon] = (t.weaponKills[h.weapon] ?? 0) + 1;
      this.g.hud.feedItem(`${this.remotes.get(by)?.avatar.info.name ?? 'Ally'}: ${e.def.name} ${h.part === 'head' ? 'headshot' : 'down'}`);
    }
  }

  // --- incoming ---

  private receive(msg: Msg, from: string): void {
    const r = this.remotes.get(from);
    if (!r) return;
    switch (msg.t) {
      case 'pstate':
        r.accept({ ...msg.s, id: from }, this.time);
        r.avatar.buf.push(performance.now() / 1000, r.state!);
        break;
      case 'shot':
        this.onShot(r, msg);
        break;
      case 'blast':
        if (r.alive && checkBlast(msg, r.feet) && r.takeBlast(this.time)) {
          this.g.explosions.explode(new Vector3(msg.x, msg.y, msg.z), GRENADE.radius, GRENADE.damage, GRENADE.force, 'player', from);
        }
        break;
      case 'emote':
        if (r.alive) {
          r.avatar.emote(msg.id);
          this.push({ e: 'emote', player: from, id: msg.id });
        }
        break;
    }
  }

  /** Position of an enemy at host time `t` from the history ring (lag compensation). */
  private rewind(id: string, t: number, out: Vector3): { crouch: number } | null {
    const h = this.history.get(id);
    if (!h || !h.length) return null;
    const tt = Math.max(this.time - MAX_REWIND, Math.min(this.time, t));
    let a = h[0]!;
    let b = h[h.length - 1]!;
    if (tt >= b.t) {
      out.set(b.x, b.y, b.z);
      return { crouch: b.c };
    }
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1]!.t <= tt) {
        a = h[i - 1]!;
        b = h[i]!;
        break;
      }
    }
    const k = b.t > a.t ? Math.max(0, Math.min(1, (tt - a.t) / (b.t - a.t))) : 0;
    out.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k);
    return { crouch: a.c + (b.c - a.c) * k };
  }

  private onShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!r.alive) return;
    const enemy = this.g.enemyMgr?.enemies.find((e) => e.id === m.target);
    if (!enemy || !enemy.alive) return;
    if (!r.takeShot(m.w, this.time)) return;
    const def = WEAPONS[m.w];
    const feet = this.tmp;
    const pose = this.rewind(enemy.id, m.rt, feet);
    if (!pose) enemy.center(feet).addInPlaceFromFloats(0, -1, 0);
    const sc = enemy.def.scale;
    const body = this.tmpB.copyFrom(feet).addInPlaceFromFloats(0, (pose && pose.crouch > 0.5 ? 0.7 : 1.0) * sc, 0);
    const head = this.tmpH.copyFrom(feet).addInPlaceFromFloats(0, (pose && pose.crouch > 0.5 ? 1.15 : 1.62) * sc, 0);
    const origin = { x: m.ox, y: m.oy, z: m.oz };
    const verdict = checkShot({ origin, dir: { x: m.dx, y: m.dy, z: m.dz }, part: m.part }, r.feet, body, head, def.range, 1.1 * sc);
    if (!verdict.ok) {
      r.violations++;
      return;
    }
    // line of sight against level geometry (props/characters do not block validation)
    const o = new Vector3(m.ox, m.oy, m.oz);
    const aim = m.part === 'head' ? head : body;
    const los = this.g.ballistics.ray(o, aim, G.STATIC);
    if (los.hit && los.distance < Vector3.Distance(o, aim) - 0.4) return;
    const dmg = Math.min(m.dmg, maxHitDamage(def, m.part === 'head'));
    if (dmg <= 0) return;
    enemy.applyDamage({
      amount: dmg,
      point: aim.clone(),
      dir: new Vector3(m.dx, m.dy, m.dz),
      part: m.part,
      kind: 'bullet',
      attackerTeam: 'player',
      attackerId: r.id,
      weapon: m.w,
      sourcePos: o,
      impulse: def.impulse,
    });
  }

  // --- outgoing ---

  private selfState(): PlayerState {
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    const th = g.target.health;
    return {
      id: this.s.selfId,
      x: p.position.x,
      y: p.position.y,
      z: p.position.z,
      yaw: c.yaw,
      pitch: p.cam.pitch,
      speed: c.speed,
      f: localFlags(g),
      w: g.weapons.current.def.id,
      hp: th.hp,
      sh: th.shield,
    };
  }

  private snapshot(): void {
    const players: PlayerState[] = [this.selfState()];
    for (const r of this.remotes.values()) {
      if (!r.state) continue;
      players.push({ ...r.state, x: r.feet.x, y: r.feet.y, z: r.feet.z, hp: r.health.hp, sh: r.health.shield, f: r.alive ? r.state.f & ~PF.dead : r.state.f | PF.dead });
    }
    const enemies: EnemyState[] = [];
    for (const e of this.g.enemyMgr?.enemies ?? []) {
      if (!e.alive || enemies.length >= MAX_ENEMIES) continue;
      enemies.push({ id: e.id, k: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, st: e.crouchBlend > 0.5 ? 2 : e.aiming ? 1 : 0, hp: e.health.fraction });
    }
    this.s.send({ t: 'snap', time: this.time, players, enemies, obj: this.obj, info: this.info, pk: this.g.pickups?.mask ?? 0 });
    if (this.queue.length) {
      this.s.send({ t: 'ev', events: this.queue.splice(0, MAX_EVENTS) });
    }
  }

  private recordHistory(): void {
    for (const e of this.g.enemyMgr?.enemies ?? []) {
      if (!e.alive) continue;
      let h = this.history.get(e.id);
      if (!h) this.history.set(e.id, (h = []));
      h.push({ t: this.time, x: e.pos.x, y: e.pos.y, z: e.pos.z, c: e.crouchBlend });
      if (h.length > HISTORY_HZ * 1.2) h.shift();
    }
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    for (const r of this.remotes.values()) r.update(dt);
    this.histT -= dt;
    if (this.histT <= 0) {
      this.histT = 1 / HISTORY_HZ;
      this.recordHistory();
    }
    this.snapT -= dt;
    if (this.snapT <= 0) {
      this.snapT = 1 / SNAP_HZ;
      this.tracerBudget = 10;
      this.snapshot();
    }
  }

  frameUpdate(dt: number): void {
    const now = performance.now() / 1000 - INTERP_DELAY;
    for (const r of this.remotes.values()) r.avatar.update(dt, now);
  }

  onLocalDeath(): boolean {
    return false;
  }

  reviveAll(): void {
    for (const r of this.remotes.values()) if (!r.alive) this.revive(r);
  }

  pickers(): { id: string; feet: Vector3; needs: (k: 'ammo' | 'health') => boolean }[] {
    const out = [];
    for (const r of this.remotes.values()) {
      if (!r.alive) continue;
      out.push({ id: r.id, feet: r.feet, needs: (k: 'ammo' | 'health') => (k === 'health' ? r.health.hp < r.health.maxHp : true) });
    }
    return out;
  }

  onPickup(kind: 'ammo' | 'health', who: string): void {
    const r = this.remotes.get(who);
    if (!r) return;
    if (kind === 'health') r.health.heal(50);
    this.push({ e: 'pickup', player: who, kind });
  }

  blips(): Blip[] {
    const out: Blip[] = [];
    for (const r of this.remotes.values()) out.push({ x: r.feet.x, z: r.feet.z, kind: 'ally' });
    return out;
  }

  onEnd(won: boolean, subtitle: string): void {
    const st = this.g.stats;
    const players: EndStats['players'] = {
      [this.s.selfId]: { kills: st.kills, headshots: st.headshots, byKind: { ...st.byKind }, weaponKills: { ...st.weaponKills } },
    };
    for (const [id, t] of this.tallies) if (this.remotes.has(id)) players[id] = t;
    // flush pending events (kill feed, banners) before the result
    this.snapshot();
    this.s.send({ t: 'end', stats: { won, subtitle, waves: st.waves, score: st.score, players } });
  }

  dispose(): void {
    for (const o of this.offs) o();
    for (const r of this.remotes.values()) r.dispose();
    this.remotes.clear();
    this.g.remotePlayers = () => [];
  }
}

