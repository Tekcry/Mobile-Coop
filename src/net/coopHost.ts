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
import { defaultHq, hqStats } from '../progression/suit';
import type { NetSession } from './session';
import { TickLimiter, type CourseWire } from '../game/course/courseWire';
import { ITEM_KINDS, isPvp, MAX_DOORS, MAX_EVENTS, MAX_ENEMIES, MAX_ITEMS, PF, type EndStats, type EnemyState, type Msg, type NetEvent, type NetItem, type PlayerInfo, type PlayerState, wirePlayerState } from './protocol';
import { RemoteAvatar } from './remoteAvatar';
import { RemotePlayer } from './remotePlayer';
import { PartnerBlocker, partnerPassable } from './partnerBlocker';
import { checkBlast, checkShot, hostShotAllowed, hostShotWeapon, maxHitDamage } from './validate';
import { localFlags, htmlToInfo } from './netShared';
import { pickSpawn, playersHostile, PVP, PvpScore, pvpInfo, TEAM_NAMES, type PvpMode, type V2 } from './pvp';
import { hyp2 } from '../core/mathx';
import { localMoveState } from '../game/localMoveState';
import { emptyMoveState, moveChanged } from '../player/moveState';
import { hostCrackOk } from '../world/doorPeek';
import { GRAB } from '../game/takedown';
import { PvpVictim } from './pvpVictim';
import { checkTeamRequest, type TeamKind, type TeamSide } from '../game/teamMoves';
import { checkCommitted, type CKind, type CTargetView } from '../game/committedMoves';
import { STRIKE, STRIKE_DUR } from '../game/elbowStrike';
import { addKit, MEDKIT, MedkitUse, SELF_TARGET } from '../game/medkit';
import type { PickupKind } from '../game/pickups';
import type { TeamMate } from '../game/teamController';
import type { PlayerRef } from '../ai/enemy';

/** (3.2.0) A PvP takedown's end: the attacker within this of the victim (m, horizontal / vertical). */
const PTD_REACH = 2.5;
const PTD_HEIGHT = 5.5;
import type { CharacterRig } from '../player/characterRig';

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
/** Two takedowns by different players this close together (s) make a dual takedown. */
const DUAL_WINDOW = 1.5;

interface Hist {
  t: number;
  x: number;
  y: number;
  z: number;
  c: number;
  /** (3.2.0) The posed head and pelvis (players: hanging, crawling, peeking), NaN when not recorded. */
  hx: number;
  hy: number;
  hz: number;
  bx: number;
  by: number;
  bz: number;
  /** (3.2.0) Movement mode at the time (players), '' for enemies. */
  m: string;
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
  /** The remotes' refs in join order, kept on join / leave so `g.remotePlayers()` never allocates. */
  private readonly remoteRefs: PlayerRef[] = [];
  /** The solo accessor this host replaced (restored on dispose). */
  private readonly soloRemotes: () => readonly PlayerRef[];
  private queue: NetEvent[] = [];
  private time = 0;
  private snapT = 0;
  private histT = 0;
  private noiseT = 0;
  private itemsT = 0;
  private itemsSig = '';
  private doorsSig = '';
  private bodiesSig = '';
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
  private seized = new Map<string, { by: string; t: number; hostage?: boolean }>();
  /** Shot noise edges per client. */
  private firing = new Map<string, number>();
  /** PvP: the score; per player hit volumes the host's own shots resolve against; respawn timers. */
  readonly score: PvpScore | null;
  private pvpBoxes = new Map<string, Hitboxes>();
  /** Course mode (D38): team damage on through the PvP hit paths, co-op rules otherwise (downed, revivable, no frags). */
  private readonly ff: boolean;
  /** Course mode: `ctick` rate limit per client. */
  private ctickLim = new Map<string, TickLimiter>();
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
    this.ff = mode === 'course';
    if (this.ff) g.target.friendly = (h) => this.friendly(h, s.selfId);
    this.reviveTime = REVIVE_TIME / hqStats(g.opts.hq ?? defaultHq()).reviveSpeed;
    this.soloRemotes = g.remotePlayers;
    g.remotePlayers = () => this.remoteRefs;
    if (this.score) {
      this.score.add(s.selfId, s.players.get(s.selfId)?.team ?? 0);
      g.target.friendly = (h) => this.friendly(h, s.selfId);
      // (3.2.0) the host's own takedowns on opponents (drop / ledge pull / inverted)
      g.takedownVictims = () => this.pvpVictimList();
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

  /** Can `a` hurt `b`? PvP: the match's sides; course mode (D38): anyone but themselves; co-op: never. */
  private hostile(a: string, b: string): boolean {
    return playersHostile(this.score, this.ff, a, b);
  }

  /** PvP and course mode: hits that do not hurt `victim` (its own; a team-mate's in team PvP). */
  private friendly(h: HitInfo, victim: string): boolean {
    if (h.attackerTeam !== 'player') return false;
    return !this.hostile(this.who(h.attackerId), victim);
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
    // the host's own gas / flash / EMP / noisemaker: everyone sees it
    g.gadgets.onLocal = (kind, at) => {
      if (kind === 'gas' || kind === 'flash' || kind === 'emp' || kind === 'noise') this.push({ e: 'gadget', player: this.s.selfId, kind, x: at.x, y: at.y, z: at.z });
    };
    this.offs.push(
      g.events.on('takedown', (e) => {
        if (e.phase === 'done') this.takedownDone(this.s.selfId);
      }),
    );
  }

  /** Takedowns finished by two players within `DUAL_WINDOW` s: a dual takedown. */
  private lastTd: { by: string; t: number } | null = null;
  /** Dual takedowns this match (tests). */
  duals = 0;

  private takedownDone(by: string): void {
    const l = this.lastTd;
    if (l && l.by !== by && this.time - l.t <= DUAL_WINDOW) {
      const sub = `${this.name(l.by)} + ${this.name(by)}`;
      this.g.hud.banner('DUAL TAKEDOWN', sub, 1800);
      this.push({ e: 'banner', title: 'DUAL TAKEDOWN', sub });
      this.duals++;
      this.g.style.record('takedownNonLethal', this.g.detected);
      this.lastTd = null;
      return;
    }
    this.lastTd = { by, t: this.time };
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
    r.loadout = p.loadout;
    if (sc || this.ff) {
      r.friendly = (h) => this.friendly(h, p.id);
      if (sc) r.allowTeleport(3);
      // the host's own shots hit opponents (course mode: the partner) through their own hit volumes (head / body)
      if (this.hostile(this.s.selfId, p.id)) this.pvpBoxes.set(p.id, new Hitboxes(g.scene, g.registry, r, 1, 'average'));
      r.shootable = this.ff;
    }
    // (T5b2, D49) a partner (anyone but a PvP opponent) blocks the host's body as the host blocks theirs on the client;
    // course friendly fire's hit boxes then take bullets only
    if (!sc || !sc.hostile(this.s.selfId, p.id)) {
      r.blocker = new PartnerBlocker(g.scene, p.id);
      this.pvpBoxes.get(p.id)?.setSolid(false);
    }
    this.remotes.set(p.id, r);
    this.remoteRefs.push(r.ref);
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
    const i = this.remoteRefs.indexOf(r.ref);
    if (i >= 0) this.remoteRefs.splice(i, 1);
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
        r.accept({ ...msg.s, id: from }, this.time, this.g.world.level.anchors, this.g.world.level.coverSegments, this.g.world.doors.list.length);
        r.avatar.buf.push(performance.now() / 1000, r.state!);
        if (msg.s.mv) this.g.mode?.onRemoteMove?.(r.id, msg.s.mv.m);
        break;
      case 'shot':
        if ((this.score || this.ff) && (msg.target === this.s.selfId || this.remotes.has(msg.target))) this.onPlayerShot(r, msg);
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
      case 'door':
        this.onDoorCrack(r, msg.i, msg.crack);
        break;
      case 'ctick': {
        let lim = this.ctickLim.get(r.id);
        if (!lim) this.ctickLim.set(r.id, (lim = new TickLimiter()));
        if (r.alive && lim.take(this.time)) this.g.mode?.onRemoteVerb?.(r.id, msg.verb);
        break;
      }
      case 'td':
        this.onTakedown(r, msg);
        break;
      case 'ptd':
        this.onPvpTakedown(r.id, msg.target, msg.kind);
        break;
      case 'tmove':
        this.onTeamMove(r.id, msg.kind, msg.partner, msg.target, msg.s, msg.gy);
        break;
      case 'cmove':
        this.onCommitted(r.id, msg.kind, msg.id, msg.target);
        break;
      case 'gadget': {
        // thrown from near the sender, one a second at most
        const last = this.gadgetAt.get(r.id) ?? -9;
        if (!r.alive || this.time - last < 1 || hyp2(msg.x - r.feet.x, msg.z - r.feet.z) > 40) return;
        this.gadgetAt.set(r.id, this.time);
        this.g.gadgets.remoteEffect(msg.kind, new Vector3(msg.x, msg.y, msg.z));
        this.g.mode?.onRemoteGadget?.(r.id, msg.kind);
        this.push({ e: 'gadget', player: r.id, kind: msg.kind, x: msg.x, y: msg.y, z: msg.z });
        break;
      }
      case 'ping': {
        // one a second at most, from somewhere near the sender
        const last = this.pingAt.get(r.id) ?? -9;
        if (this.time - last < 0.8 || hyp2(msg.x - r.feet.x, msg.z - r.feet.z) > 150) return;
        this.pingAt.set(r.id, this.time);
        this.push({ e: 'ping', player: r.id, x: msg.x, y: msg.y, z: msg.z, target: msg.target });
        this.g.addPing(r.id, msg.x, msg.y, msg.z, msg.target, this.color(r.id));
        break;
      }
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
    // course mode: what the item does is the client's (a door it opens is its door verb, DECISIONS A23)
    const mode = this.g.mode;
    mode?.onRemoteUse?.(r.id, true);
    if (it.onUse) it.onUse(it, r.id);
    else mode?.onInteract?.(it);
    mode?.onRemoteUse?.(r.id, false);
  }

  /** Course mode: the course state, locks and lights to every client. */
  course(w: CourseWire): void {
    this.s.send({ t: 'course', ...w });
  }

  /** (locomotion step 13) A client's door-peek crack: in reach (door centre within 1.5 m of its feet), closed and
   *  unlocked; the same `Doors.crack` the host's own player uses. A request on an open door is ignored. */
  private onDoorCrack(r: RemotePlayer, i: number, on: boolean): void {
    const doors = this.g.world.doors;
    const d = doors.list[i];
    if (!r.alive || !d || Math.abs(d.anchor.hinge.y - r.feet.y) > 2) return;
    if (!hostCrackOk(d, r.feet.x, r.feet.z, on)) {
      if (d.target === 0) r.violations++;
      return;
    }
    doors.crack(d, on);
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
      if (!r.alive || (held && held.by !== r.id) || (!held && e.taken) || (r.ref.spotted && e.level === 'alert') || hyp2(e.pos.x - r.feet.x, e.pos.z - r.feet.z) > TD_REACH) {
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
    this.takedownDone(r.id);
    this.g.mode?.onRemoteTakedown?.(r.id, m.kind ?? '');
  }

  // --- (3.2.0 phase 5) team moves ---

  /** Team-mates of the host (co-op: every other player; TDM: the same side). */
  /** (3.2.0 phase 5) The host's own team-move requests go through the same check as the clients'. */
  teamRequest(kind: TeamKind, partner: string, target: number, ss: number, gy: number): void {
    this.onTeamMove(this.s.selfId, kind, partner, target, ss, gy);
  }

  teamEnd(): void {
    this.onTeamMove(this.s.selfId, 'end', '', -1, 0, 0);
  }

  /** (step 11, D8) Clients with their back to segment `seg` (metres along it) for the host's own stacking. */
  wallOthers(seg: number, out: Float64Array): number {
    let n = 0;
    for (const r of this.remotes.values()) {
      const mv = r.state?.mv;
      if (n < out.length && r.alive && mv?.m === 'wall' && mv.a === seg) out[n++] = mv.s;
    }
    return n;
  }

  private mateOut: TeamMate[] = [];
  teamMates(): readonly TeamMate[] {
    const out = this.mateOut;
    out.length = 0;
    for (const r of this.remotes.values()) {
      if (!r.alive || (this.score && this.score.hostile(this.s.selfId, r.id))) continue;
      out.push({ id: r.id, pos: r.avatar.pos, yaw: r.avatar.yaw, mode: r.state?.mv?.m ?? 'ground' });
    }
    return out;
  }

  /** Pairs in a human ladder (each id -> the other). */
  private teamPairs = new Map<string, string>();
  private teamLast = new Map<string, number>();
  private teamMv = emptyMoveState();

  private teamSide(id: string): TeamSide | null {
    const self = id === this.s.selfId;
    const r = self ? null : this.remotes.get(id);
    if (!self && !r) return null;
    const p = self ? this.g.player.position : r!.feet;
    const mode = self ? localMoveState(this.g, this.teamMv).m : (r!.state?.mv?.m ?? 'ground');
    const team = this.score ? (this.s.players.get(id)?.team ?? 0) : 0;
    return { id, x: p.x, y: p.y, z: p.z, mode, alive: self ? this.g.player.alive : r!.alive, team };
  }

  /** A team-move request (a client's `tmove`, or the host's own): checked on both players' states, then started. */
  private onTeamMove(by: string, kind: 'boost' | 'ladder' | 'end', partner: string, target: number, ss: number, gy: number): void {
    const self = this.s.selfId;
    if (kind === 'end') {
      const other = this.teamPairs.get(by);
      if (!other) return;
      this.teamPairs.delete(by);
      this.teamPairs.delete(other);
      this.s.send({ t: 'tend', a: by, b: other });
      if (other === self) this.g.team.ended();
      return;
    }
    const a = this.teamSide(by);
    const b = this.teamSide(partner);
    const deny = (reason: string): void => {
      this.s.send({ t: 'tdeny', a: by, reason });
      if (by === self) this.g.team.denied(reason);
    };
    if (!a || !b) return deny('far');
    const anchor = target >= 0 ? this.g.world.level.anchors.get(target) : null;
    const now = this.time;
    const why = checkTeamRequest({ kind, a, b, target: anchor ? target : -1, targetUp: gy - b.y, sinceLast: now - (this.teamLast.get(by) ?? -99) });
    this.teamLast.set(by, now);
    if (why) return deny(why);
    if (kind === 'ladder') {
      this.teamPairs.set(by, partner);
      this.teamPairs.set(partner, by);
    }
    const start = { kind, a: by, b: partner, target: anchor ? target : -1, s: ss, t0: now };
    this.s.send({ t: 'tstart', ...start });
    if (by === self || partner === self) this.g.team.begin(start, self);
    this.g.mode?.onTeamMove?.(by === self ? undefined : by, partner === self ? undefined : partner);
  }

  // --- (locomotion step 10, A5 / H3) committed moves: the elbow strike ---

  private commitLast = new Map<string, number>();
  /** The last committed-move decision (tests, debugging). */
  lastCommit = '';
  /** Clients' strikes the host is running: contact at t0 + 0.5 s, done at t0 + 0.9 s. */
  private strikes = new Map<string, { id: number; target: string; t0: number; hp0: number; hit: boolean }>();

  /** The host's own request: the same check, no message (the start / refusal still goes out to everyone). */
  commitRequest(kind: CKind, id: number, target: string): void {
    this.onCommitted(this.s.selfId, kind, id, target);
  }

  /** The host's own strike or medkit was interrupted (damage). */
  commitCancel(id: number, reason: string, kind: CKind = 'strike'): void {
    if (reason === 'hit') this.s.send({ t: 'cdeny', a: this.s.selfId, id, kind, reason: 'hit' });
  }

  // --- (locomotion step 15) medkits: host-authoritative counts and heals ---

  /** Clients' medkit uses the host runs on their health (heal over 1.5 s, damage interrupts). */
  private medkits = new Map<string, { id: number; use: MedkitUse; last: PlayerState | null; states: number; seen: boolean }>();

  /** A remote's kits (first read: the host's carry for its difficulty). */
  private kitsOf(r: RemotePlayer): number {
    if (r.mk < 0) r.mk = this.g.medkit.max;
    return r.mk;
  }

  /** A wall medkit used by client `who`: one kit up to the carry max. */
  giveMedkit(who: string): boolean {
    const r = this.remotes.get(who);
    if (!r) return false;
    const n = this.kitsOf(r);
    if (n >= this.g.medkit.max) return false;
    r.mk = addKit(n, this.g.medkit.max);
    return true;
  }

  /** Clients' medkits: done (a kit spent), interrupted by damage (spent, `cdeny hit`), or cancelled by the client
   *  (its MoveState left `medkit`: the heal so far taken back, not spent; A56). The cancel is read only from snapshots
   *  that arrived after the start (a fixed host-time grace raced the client's 20 Hz pstate under load), and not in the
   *  last `hostEndSlack` s, where the client's own end may arrive first. */
  private runMedkits(dt: number): void {
    for (const [by, k] of this.medkits) {
      const r = this.remotes.get(by);
      if (!r) {
        this.medkits.delete(by);
        continue;
      }
      const st = r.state;
      if (st && st !== k.last) {
        k.last = st;
        k.states++;
        if (st.mv?.m === 'medkit') k.seen = true;
        else if ((k.seen || k.states >= MEDKIT.hostStates) && k.use.t < MEDKIT.time - MEDKIT.hostEndSlack) {
          k.use.cancel(r.health);
          this.medkits.delete(by);
          continue;
        }
      }
      const res = k.use.step(dt, r.health);
      if (res === 'run') continue;
      this.medkits.delete(by);
      r.mk = Math.max(0, this.kitsOf(r) - 1);
      if (res === 'hit') this.s.send({ t: 'cdeny', a: by, id: k.id, kind: 'medkit', reason: 'hit' });
    }
  }

  private onCommitted(by: string, kind: CKind, id: number, target: string): void {
    const self = by === this.s.selfId;
    const r = self ? null : this.remotes.get(by);
    if (!self && !r) return;
    const now = this.time;
    const feet = self ? this.g.player.position : r!.feet;
    let tv: CTargetView | null = null;
    // (step 15) a medkit's target is a player (self only is wired: '' or the requester's own id; H2 a team-mate)
    if (kind === 'medkit') {
      if (target && target !== by) tv = { alive: false, seized: false, ko: false, dist: Infinity };
    } else if (target) {
      const e = this.g.enemyMgr?.enemies.find((x) => x.id === target);
      tv = e ? { alive: e.alive, seized: e.taken || this.seized.has(e.id), ko: e.ko, dist: hyp2(e.pos.x - feet.x, e.pos.z - feet.z) } : { alive: false, seized: false, ko: false, dist: Infinity };
    }
    const alive = self ? this.g.player.alive : r!.alive;
    const mode = self ? 'ground' : (r!.state?.mv?.m ?? 'ground');
    const active = !self && (this.strikes.has(by) || this.medkits.has(by));
    const hp = self ? this.g.target.health : r!.health;
    const why = checkCommitted({
      kind,
      alive,
      downed: !alive,
      mode,
      active,
      sinceLast: now - (this.commitLast.get(by) ?? -99),
      target: tv,
      slack: self ? 0 : STRIKE.lagSlack,
      kits: self ? this.g.medkit.kits : this.kitsOf(r!),
      hp: hp.hp,
      maxHp: hp.maxHp,
    });
    this.commitLast.set(by, now);
    this.lastCommit = `${kind} ${target || '-'} ${why ?? 'ok'} (${mode}${active ? ', running' : ''})`;
    if (why) {
      this.s.send({ t: 'cdeny', a: by, id, kind, reason: why });
      if (self && kind === 'strike') this.g.strike.denied(id, why);
      if (self && kind === 'medkit') this.g.medkit.denied(id, why);
      return;
    }
    this.s.send({ t: 'cstart', kind, a: by, id, target, t0: now });
    if (kind === 'medkit') {
      if (self) this.g.medkit.accepted(id, 0);
      else {
        const use = new MedkitUse();
        use.start(SELF_TARGET, r!.health.hp);
        this.medkits.set(by, { id, use, last: r!.state, states: 0, seen: false });
      }
      return;
    }
    if (kind !== 'strike') return;
    if (self) this.g.strike.accepted(id, 0);
    else this.strikes.set(by, { id, target, t0: now, hp0: r!.health.hp, hit: false });
  }

  /** Clients' strikes: interrupted by damage before contact, contact at t0 + 0.5 s (reach and cone again). */
  private runStrikes(): void {
    for (const [by, k] of this.strikes) {
      const r = this.remotes.get(by);
      const el = this.time - k.t0;
      if (!r || !r.alive || el >= STRIKE_DUR) {
        this.strikes.delete(by);
        continue;
      }
      if (k.hit) continue;
      if (r.health.hp < k.hp0) {
        k.hit = true;
        this.s.send({ t: 'cdeny', a: by, id: k.id, kind: 'strike', reason: 'hit' });
        continue;
      }
      if (el < STRIKE.hitAt) continue;
      k.hit = true;
      const yaw = r.state?.yaw ?? 0;
      this.g.strike.applyHit(by, r.feet, yaw, yaw + (r.state?.mv?.ay ?? 0), k.target, STRIKE.lagSlack);
    }
  }

  /** (3.2.0) PvP: hostile players as takedown victims for the host's own takedowns. */
  private pvpVictims = new Map<string, PvpVictim>();
  private pvpVictimOut: PvpVictim[] = [];
  private pvpVictimList(): readonly PvpVictim[] {
    const out = this.pvpVictimOut;
    out.length = 0;
    const sc = this.score;
    if (!sc) return out;
    for (const r of this.remotes.values()) {
      if (!sc.hostile(this.s.selfId, r.id)) continue;
      let v = this.pvpVictims.get(r.id);
      if (!v) this.pvpVictims.set(r.id, (v = new PvpVictim(r.id, r.avatar, (target, kind) => this.onPvpTakedown(this.s.selfId, target, kind))));
      out.push(v.sync());
    }
    return out;
  }

  /**
   * (3.2.0) A PvP takedown finished (a client's `ptd`, or the host's own): an opponent, both alive, the attacker within
   * reach of the victim (a drop lands beside them; a lip pull / an inverted choke is right above / below) - then it
   * is a kill.
   */
  private onPvpTakedown(by: string, target: string, kind: string): void {
    const sc = this.score;
    if (!sc || !sc.hostile(by, target) || (kind !== 'drop' && kind !== 'below' && kind !== 'inverted')) return;
    const self = this.s.selfId;
    const attacker = by === self ? null : this.remotes.get(by);
    if (by !== self && (!attacker || !attacker.alive)) return;
    if (by === self && !this.g.player.alive) return;
    const victim = target === self ? null : this.remotes.get(target);
    if (target !== self && (!victim || !victim.alive)) return;
    if (target === self && !this.g.player.alive) return;
    const af = attacker ? attacker.feet : this.g.player.position;
    const vf = victim ? victim.feet : this.g.player.position;
    if (hyp2(af.x - vf.x, af.z - vf.z) > PTD_REACH || Math.abs(af.y - vf.y) > PTD_HEIGHT) {
      if (attacker) attacker.violations++;
      return;
    }
    const hit: HitInfo = {
      amount: 9999,
      point: vf.clone(),
      dir: new Vector3(vf.x - af.x, 0, vf.z - af.z).normalize(),
      part: 'body',
      kind: 'melee',
      attackerTeam: 'player',
      attackerId: by,
      sourcePos: af.clone(),
      impulse: 1,
      takedown: kind,
    };
    const res = victim ? victim.applyDamage(hit) : this.g.target.applyDamage(hit);
    if (res.dealt > 0) this.push({ e: 'hitConfirm', player: by, kind: res.killed ? 'kill' : 'hit' });
  }

  private release(eid: string): void {
    this.seized.delete(eid);
    const e = this.g.enemyMgr?.enemies.find((x) => x.id === eid);
    if (e?.alive) e.releaseTakedown();
  }

  /** Position of `h` at host time `t` (lag compensation). */
  private rewindHist(h: Hist[] | undefined, t: number, out: Vector3): { crouch: number; posed: boolean } | null {
    if (!h || !h.length) return null;
    const tt = Math.max(this.time - MAX_REWIND, Math.min(this.time, t));
    let a = h[0]!;
    let b = h[h.length - 1]!;
    if (tt >= b.t) {
      out.set(b.x, b.y, b.z);
      this.rwHead.set(b.hx, b.hy, b.hz);
      this.rwBody.set(b.bx, b.by, b.bz);
      return { crouch: b.c, posed: !Number.isNaN(b.hx) };
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
    this.rwHead.set(a.hx + (b.hx - a.hx) * k, a.hy + (b.hy - a.hy) * k, a.hz + (b.hz - a.hz) * k);
    this.rwBody.set(a.bx + (b.bx - a.bx) * k, a.by + (b.by - a.by) * k, a.bz + (b.bz - a.bz) * k);
    return { crouch: a.c + (b.c - a.c) * k, posed: !Number.isNaN(a.hx) && !Number.isNaN(b.hx) };
  }

  /** The rewound posed head / pelvis (`rewindHist`, when `posed`). */
  private rwHead = new Vector3();
  private rwBody = new Vector3();

  /** Shared checks: geometry against the rewound target, line of sight, the damage cap. Returns the damage. */
  private judge(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>, feet: Vector3, crouch: number, scale: number, posed = false): number {
    const def = WEAPONS[m.w];
    // (3.2.0) a player's posed head / pelvis when recorded (hanging off a lip, crawling, leaning out), else by stance
    const body = posed ? this.tmpB.copyFrom(this.rwBody).addInPlaceFromFloats(0, 0.12, 0) : this.tmpB.copyFrom(feet).addInPlaceFromFloats(0, (crouch > 0.5 ? 0.7 : 1.0) * scale, 0);
    const head = posed ? this.tmpH.copyFrom(this.rwHead) : this.tmpH.copyFrom(feet).addInPlaceFromFloats(0, (crouch > 0.5 ? 1.15 : 1.62) * scale, 0);
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
    return Math.min(m.dmg, maxHitDamage(def, m.part === 'head', !this.score));
  }

  private onShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!r.alive || this.score) return;
    const enemy = this.g.enemyMgr?.enemies.find((e) => e.id === m.target);
    if (!enemy || !enemy.alive) return;
    // (step 09, D8) no hip fire: the host's draw phase for the shooter must be drawn
    // (fix 3) and only with the weapon it holds or one from its lobby loadout (the rate limit and damage read m.w)
    if (!hostShotAllowed(r.state?.mv?.dw) || !hostShotWeapon(m.w, r.state?.w, r.loadout) || !r.takeShot(m.w, this.time)) return;
    const feet = new Vector3();
    const pose = this.rewindHist(this.history.get(enemy.id), m.rt, feet);
    if (!pose) enemy.center(feet).addInPlaceFromFloats(0, -1, 0);
    const dmg = this.judge(r, m, feet, pose?.crouch ?? 0, enemy.def.scale);
    if (dmg <= 0) return;
    const aim = (m.part === 'head' ? this.tmpH : this.tmpB).clone();
    enemy.applyDamage({ amount: dmg, point: aim, dir: new Vector3(m.dx, m.dy, m.dz), part: m.part, kind: 'bullet', attackerTeam: 'player', attackerId: r.id, weapon: m.w, sourcePos: new Vector3(m.ox, m.oy, m.oz), impulse: WEAPONS[m.w].impulse });
  }

  /** PvP and course mode: a client's hit on another player (the host or a client), rewound to what the shooter saw. */
  private onPlayerShot(r: RemotePlayer, m: Extract<Msg, { t: 'shot' }>): void {
    if (!r.alive || !this.hostile(r.id, m.target)) return;
    const self = m.target === this.s.selfId;
    const victim = self ? null : this.remotes.get(m.target)!;
    if (self ? !this.g.player.alive : !victim!.alive) return;
    // (step 09, D8) no hip fire: the host's draw phase for the shooter must be drawn
    // (fix 3) and only with the weapon it holds or one from its lobby loadout (the rate limit and damage read m.w)
    if (!hostShotAllowed(r.state?.mv?.dw) || !hostShotWeapon(m.w, r.state?.w, r.loadout) || !r.takeShot(m.w, this.time)) return;
    const feet = new Vector3();
    const pose = this.rewindHist(self ? this.selfHist : victim!.history, m.rt, feet);
    if (!pose) feet.copyFrom(self ? this.g.player.position : victim!.feet);
    const dmg = this.judge(r, m, feet, pose?.crouch ?? 0, 1, pose?.posed ?? false);
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

  /** The host's own movement state (sent in every snapshot; a change sends a snapshot at once). */
  private mvNow = emptyMoveState();
  private mvSent = emptyMoveState();

  private selfState(): PlayerState {
    const g = this.g;
    const p = g.player;
    const c = p.controller;
    const th = g.target.health;
    return {
      mv: localMoveState(g, this.mvNow),
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
      mk: this.g.medkit.kits,
    };
  }

  private pingAt = new Map<string, number>();
  private gadgetAt = new Map<string, number>();

  private color(id: string): string {
    return this.s.players.get(id)?.tag.color ?? '#4fdc7c';
  }

  /** The host's own ping: shown here and sent to everyone. */
  ping(x: number, y: number, z: number, target: string): void {
    const me = this.s.selfId;
    this.push({ e: 'ping', player: me, x, y, z, target });
    this.g.addPing(me, x, y, z, target, this.color(me));
  }

  /** Usable things clients mirror (bodies and hiding spots stay with whoever is carrying). */
  private items(): NetItem[] {
    const out: NetItem[] = [];
    // course devices (`c-` ids: switches, levers, pickups, bolts, the finish) first, so the cap never drops them (D48:
    // a map's door items filled the list before them and the client saw no course prompts)
    const list = this.g.interactables?.items ?? [];
    for (let pass = 0; pass < 2; pass++) {
      for (const it of list) {
        if (out.length >= MAX_ITEMS) break;
        if (it.id.startsWith('c-') !== (pass === 0)) continue;
        const k = it.kind as NetItem['k'];
        if (!ITEM_KINDS.includes(k)) continue;
        out.push({ id: it.id, k, x: it.pos.x, y: it.pos.y, z: it.pos.z, yaw: it.node.rotation.y, label: it.label.slice(0, 24), hold: it.holdTime, reach: it.reach ?? 1.8, on: it.enabled && !it.done });
      }
    }
    return out;
  }

  private doors(): number[] {
    const out: number[] = [];
    for (const d of this.g.world.doors.list) if (d.target === 1 && out.length < MAX_DOORS) out.push(d.index);
    return out;
  }

  /** (step 13) Cracked doors (door peek), capped at MAX_DOORS. */
  private cracked(): number[] {
    const out: number[] = [];
    for (const d of this.g.world.doors.list) if (d.cracked && out.length < MAX_DOORS) out.push(d.index);
    return out;
  }

  private snapshot(): void {
    const players: PlayerState[] = [this.selfState()];
    for (const r of this.remotes.values()) {
      if (!r.state) continue;
      players.push({ ...r.state, x: r.feet.x, y: r.feet.y, z: r.feet.z, hp: r.health.hp, mk: this.kitsOf(r), f: ((r.alive ? r.state.f & ~PF.dead : r.state.f | PF.dead) & ~PF.spotted) | (r.ref.spotted ? PF.spotted : 0) });
    }
    const enemies: EnemyState[] = [];
    for (const e of this.g.enemyMgr?.enemies ?? []) {
      if (!e.alive || enemies.length >= MAX_ENEMIES) continue;
      enemies.push({ id: e.id, k: e.def.kind, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, st: e.crouchBlend > 0.5 ? 2 : e.aiming ? 1 : 0, hp: e.health.fraction, al: alertCode(e) });
    }
    const snap: Extract<Msg, { t: 'snap' }> = { t: 'snap', time: this.time, players: players.map(wirePlayerState), enemies, obj: this.obj, info: this.info, pk: this.g.pickups?.mask ?? 0 };
    // items and doors when they change (and every few seconds for late joiners)
    const items = this.items();
    const doors = this.doors();
    // bodies still lying (not carried off, hidden or revived): clients keep those ragdolls
    const bodies: string[] = [];
    for (const b of this.g.enemyMgr?.bodies ?? []) if (b.enemyId && !b.hidden && !b.carried && bodies.length < MAX_ENEMIES) bodies.push(b.enemyId);
    const bsig = bodies.join();
    const isig = items.map((i) => `${i.id}${i.on ? 1 : 0}${i.label}`).join();
    const dcr = this.cracked();
    const dsig = `${doors.join()}/${dcr.join()}`;
    if (isig !== this.itemsSig || dsig !== this.doorsSig || bsig !== this.bodiesSig || this.itemsT <= 0) {
      this.itemsSig = isig;
      this.doorsSig = dsig;
      this.bodiesSig = bsig;
      this.itemsT = ITEMS_EVERY;
      snap.items = items;
      snap.doors = doors;
      snap.dcr = dcr;
      snap.bodies = bodies;
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
    const push = (h: Hist[], x: number, y: number, z: number, c: number, rig: CharacterRig | null = null, m = ''): void => {
      const e: Hist = { t: this.time, x, y, z, c, hx: NaN, hy: NaN, hz: NaN, bx: NaN, by: NaN, bz: NaN, m };
      if (rig) {
        const hp = rig.headNode.getAbsolutePosition();
        const bp = rig.hips.getAbsolutePosition();
        e.hx = hp.x;
        e.hy = hp.y;
        e.hz = hp.z;
        e.bx = bp.x;
        e.by = bp.y;
        e.bz = bp.z;
      }
      h.push(e);
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
      push(this.selfHist, p.x, p.y, p.z, this.g.player.controller.crouchBlend, this.g.player.rig, this.mvNow.m);
      for (const r of this.remotes.values()) push(r.history, r.feet.x, r.feet.y, r.feet.z, r.crouched ? 1 : 0, r.avatar.rig, r.avatar.mode);
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
      if (steps && (st.f & PF.silent) === 0 && (st.f & PF.grounded) !== 0) {
        // (step 11) a back-to-wall slide is heard at the crouch band (bible 5.3)
        const n = noiseRadius(r.ref.speed, (st.f & PF.crouch) !== 0 || st.mv?.m === 'wall', (st.f & PF.sprint) !== 0);
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
    if (this.strikes.size) this.runStrikes();
    if (this.medkits.size) this.runMedkits(dt);
    this.itemsT -= dt;
    for (const r of this.remotes.values()) r.update(dt);
    // revive points follow the bodies; client-held enemies are let go if the client never finishes
    for (const [id, it] of this.revives) {
      const r = this.remotes.get(id);
      const at = id === this.s.selfId ? this.g.player.position : r?.feet;
      if (at) it.pos.copyFrom(at);
      if (id === this.s.selfId ? this.g.player.alive : !r || r.alive) this.dropRevive(id);
    }
    for (const r of this.remotes.values()) r.ref.shield = null;
    for (const [eid, s] of this.seized) {
      s.t += dt;
      const by = this.remotes.get(s.by);
      // (3.2.0) a client holding the guard as a hostage: kept in front of them (and a shield) for as long as it lasts
      const mv = by?.state?.mv;
      if (by && by.alive && mv?.m === 'grab' && mv.tid === eid) {
        const e = this.g.enemyMgr?.enemies.find((x) => x.id === eid);
        if (e && e.alive) {
          s.t = 0;
          const yaw = by.state!.yaw;
          if (!s.hostage) {
            s.hostage = true;
            e.holdAsHostage();
            e.setSolid(false);
          }
          e.holdAt(by.feet.x + Math.sin(yaw) * GRAB.hold, by.feet.y, by.feet.z + Math.cos(yaw) * GRAB.hold, yaw);
          by.ref.shield = e;
          continue;
        }
      }
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
    // the host's own mode / sub-state changed (a ladder, a vault): snapshot now
    const mv = localMoveState(this.g, this.mvNow);
    if (moveChanged(this.mvSent, mv)) {
      Object.assign(this.mvSent, mv);
      this.mvSent.c = mv.c ? { ...mv.c } : undefined;
      this.snapT = 0;
    }
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

  private readonly posedHeadTmp = new Vector3();
  frameUpdate(dt: number): void {
    const now = performance.now() / 1000 - INTERP_DELAY;
    for (const r of this.remotes.values()) {
      r.avatar.update(dt, now);
      if (r.alive) {
        const rig = r.avatar.rig;
        rig.hips.computeWorldMatrix(true);
        rig.headNode.computeWorldMatrix(true);
        r.followPose(rig.hips.getAbsolutePosition(), rig.headNode.getAbsolutePosition());
        // (step 12b fix r2, light parity) on a wall: perception's head point and the light meter read the posed head
        r.setPosedHead(r.state?.mv?.m === 'wall' ? rig.posedHead(this.posedHeadTmp) : null);
      } else r.setPosedHead(null);
      r.blocker?.sync(r.avatar.pos, r.crouched, r.alive && !partnerPassable(r.avatar.mode));
      const hb = this.pvpBoxes.get(r.id);
      if (!hb) continue;
      if (!r.alive) {
        hb.setEnabled(false);
        continue;
      }
      hb.setEnabled(true);
      const rig = r.avatar.rig;
      rig.hips.computeWorldMatrix(true);
      rig.headNode.computeWorldMatrix(true);
      hb.sync(r.avatar.pos, rig.headNode.getAbsolutePosition(), rig.hips.getAbsolutePosition());
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

  pickers(): { id: string; feet: Vector3; needs: (k: PickupKind) => boolean }[] {
    const out = [];
    for (const r of this.remotes.values()) {
      if (!r.alive) continue;
      out.push({ id: r.id, feet: r.feet, needs: (k: PickupKind) => (k === 'medkit' ? this.kitsOf(r) < this.g.medkit.max : true) });
    }
    return out;
  }

  onPickup(kind: PickupKind, who: string): void {
    const r = this.remotes.get(who);
    if (!r) return;
    // (step 15) a medkit crate: one kit up to the carry max (host-authoritative)
    if (kind === 'medkit') r.mk = addKit(this.kitsOf(r), this.g.medkit.max);
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
    this.remoteRefs.length = 0;
    this.g.remotePlayers = this.soloRemotes;
    this.g.gadgets.onLocal = null;
  }
}
