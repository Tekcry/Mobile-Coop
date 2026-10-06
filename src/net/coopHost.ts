import { Vector3 } from '../core/babylon';
import { emptyKinds } from '../ai/enemyDefs';
import type { GameState, NetAttachment } from '../game/gameState';
import type { Enemy } from '../ai/enemy';
import type { HitInfo } from '../game/damage';
import type { Interactable } from '../game/interactables';
import type { Blip } from '../ui/hud/minimap';
import type { BlobShadows } from '../vfx/blobShadows';
import { WEAPONS, GRENADE } from '../weapons/weaponDefs';
import { G } from '../physics/groups';
import { Hitboxes } from '../ai/hitboxes';
import { noiseRadius } from '../player/movement';
import { hqStats } from '../progression/suit';
import type { NetSession } from './session';
import { ITEM_KINDS, isPvp, MAX_DOORS, MAX_EVENTS, MAX_ENEMIES, MAX_ITEMS, PF, type EndStats, type EnemyState, type Msg, type NetEvent, type NetItem, type PlayerInfo, type PlayerState } from './protocol';
import { RemoteAvatar } from './remoteAvatar';
import { RemotePlayer } from './remotePlayer';
import { checkBlast, checkShot, maxHitDamage } from './validate';
import { localFlags, htmlToInfo } from './netShared';
import { pickSpawn, PVP, PvpScore, pvpInfo, TEAM_NAMES, type PvpMode, type V2 } from './pvp';
import { hyp2 } from '../core/mathx';

const SNAP_HZ = 15;
const HISTORY_HZ = 20;
const MAX_REWIND = 0.6;
const INTERP_DELAY = 0.1;
/** Items and door states are re-sent at least this often (s), else only when they change. */
const ITEMS_EVERY = 2;
/** Seconds to revive a downed team-mate (HQ medic training divides it). */
const REVIVE_TIME = 2.5;
/** Shot noise radius (m) like the local player's (`GameState` SHOT_NOISE); suppressed shots only raise suspicion. */
const SHOT_NOISE = 28;
/** A client takedown: the victim within this of the client (m), and let go after this long without an outcome (s). */
const TD_REACH = 3;
const TD_MAX = 6;

interface Hist {
  t: number;
  x: number;
  y: number;
  z: number;
  c: number;
}

type Tally = EndStats['players'][string];
const emptyTally = (): Tally => ({ kills: 0, headshots: 0, byKind: emptyKinds(), weaponKills: {} });

/** The enemy alert level on the wire (`EnemyState.al`). */
function alertCode(e: Enemy): number {
  const l = e.level;
  const a = l === 'alert' ? 3 : l === 'searching' ? 2 : l === 'suspicious' || l === 'investigating' ? 1 : 0;
  return a + (e.taken ? 4 : 0);
}

/**
 * Host side of a match. The host runs the full simulation (AI, modes, pickups, objectives) and owns every outcome:
 * client shots are re-checked against lag-compensated positions, client grenades are re-detonated here, health for
 * every player lives here, client uses of objectives / doors / revives and client takedowns are checked for reach.
 * Co-op: a downed player can be revived by a team-mate (an interactable on the body); everyone down hands over to
 * the mode (lives / checkpoint / defeat). PvP: no AI; the score, respawns and the end are run here (`PvpScore`).
 */
export class CoopHost implements NetAttachment {
  private remotes = new Map<string, RemotePlayer>();
  private queue: NetEvent[] = [];
  private time = 0;
  private snapT = 0;
  private histT = 0;
  private noiseT = 0;
  private itemsT = 0;
  private itemsSig = '';
  private doorsSig = '';
  private history = new Map<string, Hist[]>();
  private selfHist: Hist[] = [];
  private tallies = new Map<string, Tally>();
  private offs: (() => void)[] = [];
  private obj = '';
  private info = '';
  private tracerBudget = 0;
  private tmp = new Vector3();
  private tmpB = new Vector3();
  private tmpH = new Vector3();
  /** Revive points on downed players (co-op). */
  private revives = new Map<string, Interactable>();
  /** Enemies seized by a client's takedown: enemy id -> client id and seconds held. */
  private seized = new Map<string, { by: string; t: number }>();
  /** Shot noise edges per client. */
  private firing = new Map<string, number>();
  /** PvP: the score; per player hit volumes the host's own shots resolve against; respawn timers. */
  readonly score: PvpScore | null;
  private pvpBoxes = new Map<string, Hitboxes>();
  private respawnIn = new Map<string, number>();
  private ended = false;
  private infoT = 0;
  private reviveTime: number;

  constructor(
    private g: GameState,
    private s: NetSession,
  ) {
    const mode = g.opts.mode;
    this.score = isPvp(mode) ? new PvpScore(mode as PvpMode) : null;
    this.reviveTime = REVIVE_TIME / hqStats(g.opts.hq ?? { radar: 0, sonar: 0, marks: 0, restock: 0, revive: 0 }).reviveSpeed;
    g.remotePlayers = () => {
      const out = [];
      for (const r of this.remotes.values()) out.push(r.ref);
      return out;
    };
    if (this.score) {
      this.score.add(s.selfId, s.players.get(s.selfId)?.team ?? 0);
      g.target.friendly = (h) => this.friendly(h, s.selfId);
      // spread the players over the spawns from the start
      const at = this.spawnFor(s.selfId);
      g.player.controller.teleport(at, g.player.cam.yaw);
    }
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
    if (this.score) this.updatePvpHud();
  }

  /** Attacker id on the wire ('local' / '' = the host). */
  private who(id: string): string {
    return id === 'local' || id === '' ? this.s.selfId : id;
  }

  /** PvP: hits that do not hurt `victim` (its own, a team-mate's). */
  private friendly(h: HitInfo, victim: string): boolean {
    if (h.attackerTeam !== 'player') return false;
    return !this.score!.hostile(this.who(h.attackerId), victim);
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
      // the local player's own DOWN / respawn banners stay local
      if (title !== 'DOWN' && title !== 'ELIMINATED') this.push({ e: 'banner', title, sub });
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

  /** PvP: a spawn away from `id`'s opponents (player and enemy spawns are the candidates). */
  private spawnFor(id: string): Vector3 {
    const L = this.g.world.layout;
    const cands: Vector3[] = [...L.playerSpawns.map((p) => p.pos), ...L.enemySpawns];
    const foes: V2[] = [];
    const allies: V2[] = [];
    const sc = this.score!;
    const add = (pid: string, p: Vector3, alive: boolean): void => {
      if (pid === id || !alive) return;
      (sc.hostile(pid, id) ? foes : allies).push({ x: p.x, z: p.z });
    };
    add(this.s.selfId, this.g.player.position, this.g.player.alive);
    for (const r of this.remotes.values()) add(r.id, r.feet, r.alive);
    return cands[pickSpawn(cands, foes, sc.mode === 'tdm' ? allies : [], Math.random())]!.clone();
  }

  private addRemote(p: PlayerInfo): void {
    const g = this.g;
    const avatar = new RemoteAvatar(g.world, g.vfx, g.ballistics, p);
    avatar.onFire = (cls, at) => g.events.emit('remoteShot', { cls, x: at.x, y: at.y, z: at.z });
    const sc = this.score;
    if (sc) sc.add(p.id, p.team);
    const r = new RemotePlayer(g.scene, g.registry, p.id, avatar, sc ? this.spawnFor(p.id) : this.spawnPoint(this.remotes.size + 1));
    r.onDamaged = (h) => this.push({ e: 'hurt', player: p.id, x: h.sourcePos.x, z: h.sourcePos.z, boom: h.kind === 'explosion' });
    r.onDeath = () => this.onRemoteDeath(r);
    if (sc) {
      r.friendly = (h) => this.friendly(h, p.id);
      r.allowTeleport(3);
      // the host's own shots hit opponents through their own hit volumes (head / body)
      if (sc.hostile(this.s.selfId, p.id)) this.pvpBoxes.set(p.id, new Hitboxes(g.scene, g.registry, r, 1, 'average'));
    }
    this.remotes.set(p.id, r);
    if (!this.tallies.has(p.id)) this.tallies.set(p.id, emptyTally());
  }

  private removeRemote(id: string): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.pvpBoxes.get(id)?.dispose();
    this.pvpBoxes.delete(id);
    this.dropRevive(id);
    for (const [eid, s] of this.seized) if (s.by === id) this.release(eid);
    r.dispose();
    this.remotes.delete(id);
    // a leaver can end a co-op match if everyone left standing is down
    if (this.g.mode && !this.g.anyPlayerAlive()) this.g.mode.onPlayerDeath();
  }

  // --- downed / revive (co-op) and eliminations (PvP) ---

  private anyoneUp(except: string): boolean {
    if (except !== this.s.selfId && this.g.player.alive) return true;
    for (const r of this.remotes.values()) if (r.id !== except && r.alive) return true;
    return false;
  }

  private onRemoteDeath(r: RemotePlayer): void {
    if (this.score) {
      this.eliminated(r.id, r.lastHit);
      this.respawnIn.set(r.id, PVP.respawn);
      return;
    }
    this.g.hud.feedItem(`${r.avatar.info.name} is down`, 'warn');
    if (!this.g.mode) {
      this.respawnIn.set(r.id, 3); // free roam
      return;
    }
    if (this.anyoneUp(r.id) && this.g.interactables) this.addRevive(r.id, r.feet, r.avatar.info.name);
    else this.g.mode.onPlayerDeath();
  }

  /** A revive point on a downed player (held by a team-mate). */
  private addRevive(id: string, at: Vector3, name: string): void {
    const ints = this.g.interactables;
    if (!ints || this.revives.has(id)) return;
    const it = ints.add(`revive-${id}`, 'revive', at, `Revive ${name}`, this.reviveTime);
    it.reach = 1.6;
    ints.setEnabled(it, true);
    it.onUse = () => this.reviveOne(id, null);
    this.revives.set(id, it);
  }

  private dropRevive(id: string): void {
    const it = this.revives.get(id);
    if (!it) return;
    this.g.interactables?.remove(it);
    this.revives.delete(id);
  }

  /** Bring `id` back where it lies (or at `at`). */
  private reviveOne(id: string, at: Vector3 | null): void {
    this.dropRevive(id);
    if (id === this.s.selfId) {
      if (this.g.player.alive) return;
      if (at) this.g.player.controller.teleport(at, this.g.player.cam.yaw);
      this.g.target.revive();
      this.g.hud.banner('BACK IN', '', 1500);
      return;
    }
    const r = this.remotes.get(id);
    if (!r || r.alive) return;
    const p = at ?? r.feet.clone();
    r.revive(p, this.score ? PVP.protect : 2);
    this.push({ e: 'revive', player: id, x: p.x, y: p.y, z: p.z });
    if (!this.score) this.g.hud.feedItem(`${r.avatar.info.name} is back in`);
  }

  /** PvP: credit the elimination, tell everyone. */
  private eliminated(victim: string, h: HitInfo | null): void {
    const sc = this.score!;
    const by = h ? this.who(h.attackerId) : victim;
    const head = h?.part === 'head';
    sc.frag(victim, by);
    this.push({ e: 'frag', victim, by, head });
    this.showFrag(victim, by, head);
    const st = this.g.stats;
    if (victim === this.s.selfId) st.deaths = (st.deaths ?? 0) + 1;
    if (by !== victim && sc.hostile(by, victim)) {
      if (by === this.s.selfId) {
        st.kills++;
        if (head) st.headshots++;
        const w = h?.weapon;
        if (w) st.weaponKills[w] = (st.weaponKills[w] ?? 0) + 1;
      } else {
        const t = this.tallies.get(by);
        if (t) {
          t.kills++;
          if (head) t.headshots++;
          if (h?.weapon) t.weaponKills[h.weapon] = (t.weaponKills[h.weapon] ?? 0) + 1;
        }
      }
    }
    this.updatePvpHud();
  }

  private name(id: string): string {
    return this.s.players.get(id)?.name ?? 'Operator';
  }

  private showFrag(victim: string, by: string, head: boolean): void {
    const hud = this.g.hud;
    const me = this.s.selfId;
    if (by === me && victim !== me) {
      hud.hitMarker('kill');
      this.g.app.sfx.hitMarker('kill');
      hud.feedItem(`${this.name(victim)} eliminated${head ? ' (headshot)' : ''}`, 'kill');
    } else if (victim === me) {
      hud.banner('ELIMINATED', by === me ? '' : `by ${this.name(by)}`, 2500);
    } else hud.feedItem(by === victim ? `${this.name(victim)} died` : `${this.name(by)} > ${this.name(victim)}`);
  }

  private updatePvpHud(): void {
    const sc = this.score;
    if (!sc) return;
    this.g.hud.setModeInfo(pvpInfo(sc.mode, sc.lines(), this.s.selfId, sc.timeLeft));
    this.g.hud.setObjective(sc.mode === 'tdm' ? `Team deathmatch - first to ${sc.limit}` : `Free-for-all - first to ${sc.limit}`);
  }

  private onKill(e: Enemy, h: HitInfo): void {
    const by = this.who(h.attackerId);
    this.push({ e: 'kill', enemy: e.id, kind: e.def.kind, by, head: h.part === 'head' });
    this.history.delete(e.id);
    this.seized.delete(e.id);
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
        if (this.score && (msg.target === this.s.selfId || this.remotes.has(msg.target))) this.onPlayerShot(r, msg);
        else this.onShot(r, msg);
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
      case 'use':
        this.onUse(r, msg.id);
        break;
      case 'td':
        this.onTakedown(r, msg);
        break;
    }
  }

  /** A client used a mirrored item: it must be usable, and in reach of where the host has the client. */
  private onUse(r: RemotePlayer, id: string): void {
    if (!r.alive) return;
    const it = this.g.interactables?.items.find((i) => i.id === id);
    if (!it || !it.enabled || it.done) return;
    if (hyp2(it.pos.x - r.feet.x, it.pos.z - r.feet.z) > (it.reach ?? 1.8) + 0.75 || Math.abs(it.pos.y - r.feet.y) > 2) {
      r.violations++;
      return;
    }
    if (it.kind === 'revive' && it.id === `revive-${r.id}`) return;
    if (it.onUse) it.onUse(it);
    else this.g.mode?.onInteract?.(it);
  }

  /** A client's takedown on a host enemy: seize it (in reach, calm or not facing), finish it, or let go. */
  private onTakedown(r: RemotePlayer, m: Extract<Msg, { t: 'td' }>): void {
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === m.target);
    const deny = (): void => this.push({ e: 'tdDenied', player: r.id, enemy: m.target });
    if (!e || !e.alive) {
      if (m.ph === 'start') deny();
      return;
    }
    const held = this.seized.get(e.id);
    if (m.ph === 'start') {
      if (!r.alive || (held && held.by !== r.id) || (!held && e.taken) || hyp2(e.pos.x - r.feet.x, e.pos.z - r.feet.z) > TD_REACH) {
        deny();
        return;
      }
      e.beginTakedown(!m.lethal);
      this.seized.set(e.id, { by: r.id, t: 0 });
      return;
    }
    if (!held || held.by !== r.id) return;
    this.seized.delete(e.id);
    if (m.ph === 'abort') {
      e.releaseTakedown();
      return;
    }
    e.taken = false;
    e.bodyRig.emote = null;
    const dir = new Vector3(e.pos.x - r.feet.x, 0, e.pos.z - r.feet.z).normalize();
    const hit = { amount: 9999, point: e.pos.clone(), dir, part: 'body' as const, kind: 'melee' as const, attackerTeam: 'player' as const, attackerId: r.id, sourcePos: r.feet.clone(), impulse: 1 };
    if (m.lethal) e.applyDamage(hit);
    else e.knockOut(hit);
    this.g.enemyMgr?.hear(r.feet, m.lethal ? 3 : 1.2);
  }

  private release(eid: string): void {
    this.seized.delete(eid);
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === eid);
    if (e?.alive) e.releaseTakedown();
  }

  /** Position of `h` at host time `t` (lag compensation). */
  private rewindHist(h: Hist[] | undefined, t: number, out: Vector3): { crouch: number } | null {
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

  /** Shared checks: geometry against the rewound target, line of sight, the damage cap. Returns the damage. */
  private judge(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>, feet: Vector3, crouch: number, scale: number): number {
    const def = WEAPONS[m.w];
    const body = this.tmpB.copyFrom(feet).addInPlaceFromFloats(0, (crouch > 0.5 ? 0.7 : 1.0) * scale, 0);
    const head = this.tmpH.copyFrom(feet).addInPlaceFromFloats(0, (crouch > 0.5 ? 1.15 : 1.62) * scale, 0);
    const verdict = checkShot({ origin: { x: m.ox, y: m.oy, z: m.oz }, dir: { x: m.dx, y: m.dy, z: m.dz }, part: m.part }, r.feet, body, head, def.range, 1.1 * scale);
    if (!verdict.ok) {
      r.violations++;
      return 0;
    }
    // line of sight against level geometry (props/characters do not block validation)
    const o = this.tmp.set(m.ox, m.oy, m.oz);
    const aim = m.part === 'head' ? head : body;
    const los = this.g.ballistics.ray(o, aim, G.STATIC);
    if (los.hit && los.distance < Vector3.Distance(o, aim) - 0.4) return 0;
    return Math.min(m.dmg, maxHitDamage(def, m.part === 'head'));
  }

  private onShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!r.alive || this.score) return;
    const enemy = this.g.enemyMgr?.enemies.find((e) => e.id === m.target);
    if (!enemy || !enemy.alive) return;
    if (!r.takeShot(m.w, this.time)) return;
    const feet = new Vector3();
    const pose = this.rewindHist(this.history.get(enemy.id), m.rt, feet);
    if (!pose) enemy.center(feet).addInPlaceFromFloats(0, -1, 0);
    const dmg = this.judge(r, m, feet, pose?.crouch ?? 0, enemy.def.scale);
    if (dmg <= 0) return;
    const aim = (m.part === 'head' ? this.tmpH : this.tmpB).clone();
    enemy.applyDamage({ amount: dmg, point: aim, dir: new Vector3(m.dx, m.dy, m.dz), part: m.part, kind: 'bullet', attackerTeam: 'player', attackerId: r.id, weapon: m.w, sourcePos: new Vector3(m.ox, m.oy, m.oz), impulse: WEAPONS[m.w].impulse });
  }

  /** PvP: a client's hit on another player (the host or a client), rewound to what the shooter saw. */
  private onPlayerShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    const sc = this.score!;
    if (!r.alive || !sc.hostile(r.id, m.target)) return;
    const self = m.target === this.s.selfId;
    const victim = self ? null : this.remotes.get(m.target)!;
    if (self ? !this.g.player.alive : !victim!.alive) return;
    if (!r.takeShot(m.w, this.time)) return;
    const feet = new Vector3();
    const pose = this.rewindHist(self ? this.selfHist : victim!.history, m.rt, feet);
    if (!pose) feet.copyFrom(self ? this.g.player.position : victim!.feet);
    const dmg = this.judge(r, m, feet, pose?.crouch ?? 0, 1);
    if (dmg <= 0) return;
    const hit: HitInfo = {
      amount: dmg,
      point: (m.part === 'head' ? this.tmpH : this.tmpB).clone(),
      dir: new Vector3(m.dx, m.dy, m.dz),
      part: m.part,
      kind: 'bullet',
      attackerTeam: 'player',
      attackerId: r.id,
      weapon: m.w,
      sourcePos: new Vector3(m.ox, m.oy, m.oz),
      impulse: WEAPONS[m.w].impulse,
    };
    const res = self ? this.g.target.applyDamage(hit) : victim!.applyDamage(hit);
    if (res.dealt > 0) this.push({ e: 'hitConfirm', player: r.id, kind: res.killed ? 'kill' : m.part === 'head' ? 'head' : 'hit' });
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

  /** Usable things clients mirror (bodies and hiding spots stay with whoever is carrying). */
  private items(): NetItem[] {
    const out: NetItem[] = [];
    for (const it of this.g.interactables?.items ?? []) {
      if (out.length >= MAX_ITEMS) break;
      const k = it.kind as NetItem['k'];
      if (!ITEM_KINDS.includes(k)) continue;
      out.push({ id: it.id, k, x: it.pos.x, y: it.pos.y, z: it.pos.z, yaw: it.node.rotation.y, label: it.label.slice(0, 24), hold: it.holdTime, reach: it.reach ?? 1.8, on: it.enabled && !it.done });
    }
    return out;
  }

  private doors(): number[] {
    const out: number[] = [];
    for (const d of this.g.world.doors.list) if (d.target === 1 && out.length < MAX_DOORS) out.push(d.index);
    return out;
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
      enemies.push({ id: e.id, k: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, st: e.crouchBlend > 0.5 ? 2 : e.aiming ? 1 : 0, hp: e.health.fraction, al: alertCode(e) });
    }
    const snap: Extract<Msg, { t: 'snap' }> = { t: 'snap', time: this.time, players, enemies, obj: this.obj, info: this.info, pk: this.g.pickups?.mask ?? 0 };
    // items and doors when they change (and every few seconds for late joiners)
    const items = this.items();
    const doors = this.doors();
    const isig = items.map((i) => `${i.id}${i.on ? 1 : 0}${i.label}`).join();
    const dsig = doors.join();
    if (isig !== this.itemsSig || dsig !== this.doorsSig || this.itemsT <= 0) {
      this.itemsSig = isig;
      this.doorsSig = dsig;
      this.itemsT = ITEMS_EVERY;
      snap.items = items;
      snap.doors = doors;
    }
    if (this.score) {
      snap.score = this.score.lines();
      snap.tl = this.score.timeLeft;
    }
    this.s.send(snap);
    if (this.queue.length) {
      this.s.send({ t: 'ev', events: this.queue.splice(0, MAX_EVENTS) });
    }
  }

  private recordHistory(): void {
    const push = (h: Hist[], x: number, y: number, z: number, c: number): void => {
      h.push({ t: this.time, x, y, z, c });
      if (h.length > HISTORY_HZ * 1.2) h.shift();
    };
    for (const e of this.g.enemyMgr?.enemies ?? []) {
      if (!e.alive) continue;
      let h = this.history.get(e.id);
      if (!h) this.history.set(e.id, (h = []));
      push(h, e.pos.x, e.pos.y, e.pos.z, e.crouchBlend);
    }
    if (this.score) {
      const p = this.g.player.position;
      push(this.selfHist, p.x, p.y, p.z, this.g.player.controller.crouchBlend);
      for (const r of this.remotes.values()) push(r.history, r.feet.x, r.feet.y, r.feet.z, r.crouched ? 1 : 0);
    }
  }

  /** Enemies hear the clients too: footsteps by speed and stance, shots by their weapon (suppressed = suspicion). */
  private remoteNoise(dt: number): void {
    const em = this.g.enemyMgr;
    if (!em) return;
    this.noiseT -= dt;
    const steps = this.noiseT <= 0;
    if (steps) this.noiseT = 0.25;
    for (const r of this.remotes.values()) {
      const st = r.state;
      if (!r.alive || !st) continue;
      if (steps) {
        const n = noiseRadius(r.ref.speed, (st.f & PF.crouch) !== 0, (st.f & PF.sprint) !== 0);
        if (n > 0) em.hear(r.feet, n);
      }
      const t = (this.firing.get(r.id) ?? 0) - dt;
      if (st.f & PF.firing && t <= 0) {
        this.firing.set(r.id, 0.4);
        const quiet = (st.f & PF.quiet) !== 0;
        if (quiet) em.hear(r.feet, SHOT_NOISE * 0.5);
        else em.noise(r.feet, SHOT_NOISE * (WEAPONS[st.w].noise ?? 1));
      } else this.firing.set(r.id, t);
    }
  }

  fixedUpdate(dt: number): void {
    this.time += dt;
    this.itemsT -= dt;
    for (const r of this.remotes.values()) r.update(dt);
    // revive points follow the bodies; client-held enemies are let go if the client never finishes
    for (const [id, it] of this.revives) {
      const r = this.remotes.get(id);
      const at = id === this.s.selfId ? this.g.player.position : r?.feet;
      if (at) it.pos.copyFrom(at);
      if (id === this.s.selfId ? this.g.player.alive : !r || r.alive) this.dropRevive(id);
    }
    for (const [eid, s] of this.seized) {
      s.t += dt;
      const by = this.remotes.get(s.by);
      if (s.t > TD_MAX || !by || !by.alive) this.release(eid);
    }
    this.remoteNoise(dt);
    for (const [id, t] of this.respawnIn) {
      const left = t - dt;
      if (left > 0) {
        this.respawnIn.set(id, left);
        continue;
      }
      this.respawnIn.delete(id);
      if (this.score) this.reviveOne(id, this.spawnFor(id));
      else this.reviveOne(id, this.spawnPoint([...this.remotes.keys()].indexOf(id) + 1));
    }
    if (this.score && !this.ended) this.pvpStep(dt);
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

  private pvpStep(dt: number): void {
    const sc = this.score!;
    sc.elapsed += dt;
    this.infoT -= dt;
    if (this.infoT <= 0) {
      this.infoT = 0.25;
      this.updatePvpHud();
    }
    if (!sc.over) return;
    this.ended = true;
    const lead = sc.leader();
    const [a, b] = sc.teams as [number, number];
    const sub =
      sc.mode === 'tdm'
        ? lead.id === ''
          ? `Draw ${a}-${b}`
          : `${TEAM_NAMES[lead.id === 'team0' ? 0 : 1]} wins ${Math.max(a, b)}-${Math.min(a, b)}`
        : lead.id === ''
          ? 'Draw'
          : `${this.name(lead.id)} wins with ${lead.score}`;
    this.g.endSession(sc.won(this.s.selfId), sub);
  }

  frameUpdate(dt: number): void {
    const now = performance.now() / 1000 - INTERP_DELAY;
    for (const r of this.remotes.values()) {
      r.avatar.update(dt, now);
      const hb = this.pvpBoxes.get(r.id);
      if (!hb) continue;
      if (!r.alive) {
        hb.setEnabled(false);
        continue;
      }
      hb.setEnabled(true);
      r.avatar.rig.headNode.computeWorldMatrix(true);
      hb.sync(r.avatar.pos, r.avatar.rig.headNode.getAbsolutePosition());
    }
  }

  shadows(b: BlobShadows): void {
    for (const r of this.remotes.values()) {
      const p = r.avatar.pos;
      b.add(p.x, p.y, p.z, 0.42);
    }
  }

  onLocalDeath(): boolean {
    const g = this.g;
    if (this.score) {
      this.eliminated(this.s.selfId, g.target.lastHit);
      g.target.lastHit = null;
      g.scheduleRespawn(this.spawnFor(this.s.selfId), PVP.respawn);
      return true;
    }
    if (!g.mode) return false;
    // co-op: someone can still come and get you
    if (this.anyoneUp(this.s.selfId) && g.interactables) {
      g.hud.banner('DOWN', 'A team-mate can revive you', 3000);
      this.addRevive(this.s.selfId, g.player.position, this.name(this.s.selfId));
      return true;
    }
    return false;
  }

  /** The host respawned at a checkpoint (co-op): everyone down comes back beside it. */
  onRespawn(at: Vector3): void {
    if (this.score) return;
    let i = 1;
    for (const r of this.remotes.values()) {
      if (r.alive) continue;
      this.reviveOne(r.id, at.add(new Vector3(Math.sin(i * 2.1) * 1.2, 0, Math.cos(i * 2.1) * 1.2)));
      i++;
    }
  }

  reviveAll(): void {
    for (const r of this.remotes.values()) if (!r.alive) this.reviveOne(r.id, this.spawnPoint([...this.remotes.keys()].indexOf(r.id) + 1));
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
    const sc = this.score;
    for (const r of this.remotes.values()) {
      if (sc && sc.hostile(this.s.selfId, r.id)) continue;
      out.push({ x: r.feet.x, z: r.feet.z, kind: 'ally' });
    }
    return out;
  }

  onEnd(won: boolean, subtitle: string): void {
    const st = this.g.stats;
    const players: EndStats['players'] = {
      [this.s.selfId]: { kills: st.kills, headshots: st.headshots, byKind: { ...st.byKind }, weaponKills: { ...st.weaponKills } },
    };
    for (const [id, t] of this.tallies) if (this.remotes.has(id)) players[id] = t;
    const winner = this.score ? this.score.leader().id : '';
    // flush pending events (kill feed, banners) before the result
    this.snapshot();
    this.s.send({ t: 'end', stats: { won, subtitle, waves: st.waves, score: st.score, players, winner } });
  }

  dispose(): void {
    for (const o of this.offs) o();
    for (const hb of this.pvpBoxes.values()) hb.dispose();
    this.pvpBoxes.clear();
    for (const r of this.remotes.values()) r.dispose();
    this.remotes.clear();
    this.g.remotePlayers = () => [];
  }
}
