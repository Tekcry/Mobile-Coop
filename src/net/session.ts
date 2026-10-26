import { EventBus } from '../core/events';
import { flags } from '../core/flags';
import type { WeatherChoice } from '../world/mapDef';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { capacity, parseMessage, PROTOCOL_VERSION, sectorMissionId, type Difficulty, type Msg, type NetMode, type PlayerInfo } from './protocol';
import type { Transport } from './transport';
import type { WeaponId } from '../weapons/weaponDefs';
import { REJOIN_HOLD_S } from '../core/rejoin';
import { MAPS } from '../world/maps';
import type { MissionDef } from '../game/mission/missionDef';
import { CAMPAIGN_PLAYERS, campaignStartBlock, isCampaignMap, isCampaignMission } from '../game/mission/campaign';

/** (mission-rules R4, G2 "2 player coop campaign only", G48 "No bot anywhere") A campaign room holds exactly two,
 *  whatever the mode's `capacity()` (coop4 takes Sector Ops to 4; a campaign room stays 2). */
export const CAMPAIGN_ROOM = CAMPAIGN_PLAYERS;

export interface LocalProfile {
  name: string;
  tag: PlayerInfo['tag'];
  look: AvatarLook;
  loadout: WeaponId[];
}

export interface StartInfo {
  mode: NetMode;
  map: string;
  seed: number;
  difficulty: Difficulty;
  /** Infiltration: the mission ('' otherwise). */
  mission: string;
  weather: WeatherChoice;
  /** Course mode: the bay to start at (1-based, D20). */
  bay?: number;
  /** (mission-framework NET3) Sector Ops: the host's mission (`MissionDef.id`; '' / absent: none). */
  sectorMission?: string;
}

export interface SessionEvents {
  lobby: { players: PlayerInfo[] };
  start: StartInfo;
  game: { msg: Msg; from: string };
  peerLeft: { id: string; name: string };
  /** (marlow-bays R2, host) A joiner dropped mid-match: its slot is held (`PlayerInfo.away`) until it rejoins. */
  away: { id: string; name: string };
  /** (marlow-bays R2, host) A held joiner is back (same player id, new connection). */
  rejoin: { id: string; name: string };
  /**
   * (coop-rejoin, host) The running match went to one player (`start` sent to it alone): a late join, a rejoin, or a
   * reconnect of a player the host never saw drop (a transport that replaced its connection, so no `away`). Its match
   * (re)loads at the course start, so the host decides where it spawns (`CoopHost`).
   */
  late: { id: string };
  hostLeft: Record<string, never>;
  full: Record<string, never>;
}

/**
 * Lobby + message routing for a coop room. The host is authoritative: clients accept lobby/start/
 * snapshot/event/end messages only from the host, and the host accepts gameplay messages only from
 * players in its lobby. No host migration: if the host leaves, the session ends.
 *
 * (marlow-bays R2-R3) Rejoin: a player id outlives its connection. A joiner that drops mid-match keeps its slot
 * (`away`) for `REJOIN_HOLD_S`; its `hello` token (or, in a full room, the only held slot) gives it back: the host
 * aliases the new transport id to the held player id (`alias` / `route`), so the game code never sees the change, and
 * tells the client its id (`you`). A client whose host drops keeps its session open (`hostId` cleared) and takes the
 * next host that opens the room.
 */
export class NetSession {
  readonly events = new EventBus<SessionEvents>();
  readonly players = new Map<string, PlayerInfo>();
  hostId: string | null;
  /** A new room's mode: the campaign, Marlow Yard in Course mode (sector-ops slice 3; `?legacy=1` hosts switch to the parked Hunter). */
  mode: NetMode = 'course';
  map = 'ctcourse';
  difficulty: Difficulty = 'normal';
  mission = '';
  /**
   * (mission-framework NET3) Sector Ops' mission. Host: its own `?mission=` (the mission its mode binds), sent in a
   * sector `start`. Client: the one the host's last `start` carried ('' none), never its own URL's: its start section
   * follows the host's (`CoopClient.placeStart`).
   */
  sectorMission: string;
  weather: WeatherChoice = 'clear';
  /** Course mode: "Start at bay N" (host, 1-based; D20). */
  courseBay = 1;
  /** (coop-rejoin, host) The course bay a match going to one player starts it at: the current bay, so its load lands
   *  near the checkpoint (`CoopHost` sets it); null: the match's start bay. */
  lateBay: (() => number) | null = null;
  phase: 'lobby' | 'playing' = 'lobby';
  private start: StartInfo | null = null;
  private closed = false;
  /** (R2) Client: the player id the host knows us by (`you`); null = the transport id. */
  private pid: string | null = null;
  /** (R2) Host: a rejoined connection's transport id -> its held player id, and back. */
  private readonly alias = new Map<string, string>();
  private readonly route = new Map<string, string>();
  /** (R2) Host: each joiner's rejoin token, and when a held slot went away (ms). */
  private readonly tokOf = new Map<string, string>();
  private readonly awayAt = new Map<string, number>();
  private holdTimer: ReturnType<typeof setInterval> | null = null;
  /** (R2) Client: refused by a full room; that room's lobbies are no longer ours to take. */
  private refused = false;
  /** (PR E fix) Host: removes the pending auto start's listeners (`startWhenUnblocked`); null when none is pending. */
  private autoOff: (() => void) | null = null;

  constructor(
    readonly transport: Transport,
    readonly role: 'host' | 'client',
    readonly code: string,
    private me: LocalProfile,
    /** (R2) Client: this tab's rejoin token for the room ('' = none). */
    private readonly tok = '',
  ) {
    this.hostId = role === 'host' ? transport.selfId : null;
    // (FLG) as `missionParam()`: no mission id on the wire while `flags.missions` is off
    this.sectorMission = role === 'host' && flags.missions ? sectorMissionId(flags.mission ?? '') : '';
    this.players.set(transport.selfId, { id: transport.selfId, ...me, ready: role === 'host', host: role === 'host', away: false });
    if (role === 'host') this.holdTimer = setInterval(() => this.expireAway(Date.now()), 5000);
    transport.onMessage = (raw, from) => this.receive(raw, from);
    transport.onPeerJoin = (id) => {
      // introduce ourselves to every newcomer
      this.transport.send(this.hello(), id);
      if (this.role === 'host') this.broadcastLobby();
    };
    transport.onPeerLeave = (id) => this.peerLeft(id);
    // clients announce themselves; peers may already be connected
    this.transport.send(this.hello());
  }

  /** Our player id: the transport's, or (a rejoined client) the held slot's the host gave back. */
  get selfId(): string {
    return this.pid ?? this.transport.selfId;
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  /** Our hello; the rejoin token only in the one sent to the host (`withTok`): a broadcast would hand it to anyone in
   *  the room. */
  private hello(withTok = false): Msg {
    return { t: 'hello', v: PROTOCOL_VERSION, name: this.me.name, tag: this.me.tag, look: this.me.look, loadout: this.me.loadout, tok: withTok ? this.tok : '' };
  }

  /** Send to everyone, or to one player id (a rejoined player's current connection). */
  send(msg: Msg, to?: string): void {
    if (!this.closed) this.transport.send(msg, to === undefined ? undefined : (this.route.get(to) ?? to));
  }

  /** Client -> host convenience. */
  toHost(msg: Msg): void {
    if (this.hostId && !this.isHost) this.send(msg, this.hostId);
  }

  private receive(raw: unknown, from: string): void {
    const msg = parseMessage(raw);
    if (!msg || this.closed) return;
    if (this.isHost) this.hostReceive(msg, this.alias.get(from) ?? from, from);
    else this.clientReceive(msg, from);
  }

  /** (R2) The held (away) slot a hello takes back: its token's, or in a full room the only one (a tab closed with its
   *  token). A slot whose player is still connected is never taken. */
  private heldFor(tok: string): string | null {
    let only: string | null = null;
    let held = 0;
    for (const p of this.players.values()) {
      if (p.host || !p.away) continue;
      if (tok && this.tokOf.get(p.id) === tok) return p.id;
      held++;
      only = p.id;
    }
    return held === 1 && this.players.size >= this.cap ? only : null;
  }

  private hostReceive(msg: Msg, from: string, conn: string): void {
    if (msg.t === 'hello') {
      if (msg.v !== PROTOCOL_VERSION) return;
      let pid = from;
      // a fresh connection: the token's held slot (its first, tokenless hello may already have made it a new player,
      // which the held slot replaces), else in a full room the only held slot
      const fresh = this.players.get(conn);
      if (pid === conn && (!fresh || (msg.tok && !fresh.away))) {
        const held = msg.tok ? (this.heldFor(msg.tok) ?? (fresh ? null : this.heldFor(''))) : fresh ? null : this.heldFor('');
        if (held && held !== conn) {
          if (fresh) {
            this.players.delete(conn);
            this.tokOf.delete(conn);
          }
          pid = held;
          // the slot's earlier connection (if it is still around) is stale from here on
          for (const [t, p] of this.alias) if (p === held) this.alias.delete(t);
          this.alias.set(conn, held);
          this.route.set(held, conn);
        }
      }
      if (!this.players.has(pid) && this.players.size >= this.cap) {
        this.send({ t: 'bye', reason: 'Room is full' }, conn);
        return;
      }
      const prev = this.players.get(pid);
      this.players.set(pid, { id: pid, name: msg.name, tag: msg.tag, look: msg.look, loadout: msg.loadout, ready: prev?.ready ?? false, host: false, away: false });
      if (msg.tok) this.tokOf.set(pid, msg.tok);
      this.awayAt.delete(pid);
      this.broadcastLobby();
      // (the broadcast can run a nested hello: a token hello that moved this connection to its held slot wins)
      if (!this.players.has(pid) || (pid === conn && this.alias.has(conn))) return;
      this.send({ t: 'you', id: pid }, pid);
      if (prev?.away) this.events.emit('rejoin', { id: pid, name: msg.name });
      // late join / reconnect during a match
      if (this.phase === 'playing' && this.start) {
        const bay = this.start.mode === 'course' ? this.lateBay?.() : undefined;
        this.send(startMsg(bay ? { ...this.start, bay } : this.start), pid);
        this.events.emit('late', { id: pid });
      }
      return;
    }
    if (!this.players.has(from) || this.players.get(from)!.away) return;
    if (msg.t === 'ready') {
      const p = this.players.get(from)!;
      p.ready = msg.ready;
      this.broadcastLobby();
      return;
    }
    if (msg.t === 'pstate' || msg.t === 'shot' || msg.t === 'blast' || msg.t === 'use' || msg.t === 'td' || msg.t === 'tmove' || msg.t === 'cmove' || msg.t === 'ping' || msg.t === 'gadget' || msg.t === 'door' || msg.t === 'panel' || msg.t === 'ctick' || msg.t === 'jam') {
      this.events.emit('game', { msg, from });
    }
  }

  private clientReceive(msg: Msg, from: string): void {
    if (msg.t === 'you') {
      if (from !== this.hostId || msg.id === this.selfId) return;
      const mine = this.players.get(this.selfId)!;
      this.players.delete(this.selfId);
      this.pid = msg.id === this.transport.selfId ? null : msg.id;
      this.players.set(this.selfId, { ...(this.players.get(this.selfId) ?? mine), ...this.me, id: this.selfId, host: false, away: false });
      this.events.emit('lobby', { players: [...this.players.values()] });
      return;
    }
    if (msg.t === 'lobby') {
      if (this.refused) return;
      const host = msg.players.find((p) => p.host);
      if (!host || host.id !== from) return;
      if (this.hostId && this.hostId !== from) return;
      const fresh = this.hostId === null;
      this.hostId = from;
      // keep our own entry authoritative locally
      const mine = this.players.get(this.selfId)!;
      this.players.clear();
      for (const p of msg.players) this.players.set(p.id, p.id === this.selfId ? { ...p, ...{ name: mine.name, tag: mine.tag, look: mine.look, loadout: mine.loadout } } : p);
      if (!this.players.has(this.selfId)) this.players.set(this.selfId, mine);
      this.mode = msg.mode;
      this.map = msg.map;
      this.difficulty = msg.difficulty;
      this.mission = msg.mission;
      this.weather = msg.weather;
      this.phase = msg.phase;
      this.events.emit('lobby', { players: [...this.players.values()] });
      // a host taken now (the first, or the next after ours left): our hello with the rejoin token, to it alone
      if (fresh) this.send(this.hello(true), from);
      return;
    }
    if (msg.t === 'hello') return; // other clients introducing themselves; the host's lobby is authoritative
    // a full room's host refuses us before we ever see its lobby
    if (msg.t === 'bye' && !this.hostId && /full/i.test(msg.reason)) {
      this.refused = true;
      this.events.emit('full', {});
      return;
    }
    if (from !== this.hostId) return;
    if (msg.t === 'start') {
      this.phase = 'playing';
      this.start = { mode: msg.mode, map: msg.map, seed: msg.seed, difficulty: msg.difficulty, mission: msg.mission, weather: msg.weather, bay: msg.bay ?? 1, ...(msg.sm ? { sectorMission: msg.sm } : {}) };
      // (NET3) the host's sector mission, or none: ours (`?mission=`) never counts
      this.sectorMission = msg.mode === 'sector' ? (msg.sm ?? '') : '';
      this.events.emit('start', this.start);
      return;
    }
    if (msg.t === 'bye') {
      if (/full/i.test(msg.reason)) {
        this.refused = true;
        this.hostId = null;
        this.events.emit('full', {});
      } else {
        // (R3) a host that quits: the session stays open for the next host of the room
        this.hostId = null;
        this.events.emit('hostLeft', {});
      }
      return;
    }
    this.events.emit('game', { msg, from });
  }

  private peerLeft(conn: string): void {
    if (conn === this.hostId && !this.isHost) {
      // (R3) the session stays open: the next host to open the room is taken (`hostId` cleared)
      this.hostId = null;
      this.events.emit('hostLeft', {});
      return;
    }
    const id = this.alias.get(conn) ?? conn;
    this.alias.delete(conn);
    // a connection replaced by a rejoin: nothing left
    const now = this.route.get(id);
    if (now !== undefined && now !== conn) return;
    this.route.delete(id);
    const p = this.players.get(id);
    if (!p) return;
    // (R2) a joiner dropping mid-match keeps its slot, held, until it rejoins or the hold ends
    if (this.isHost && this.phase === 'playing' && !p.host) {
      if (p.away) return;
      p.away = true;
      this.awayAt.set(id, Date.now());
      this.events.emit('away', { id, name: p.name });
      this.broadcastLobby();
      return;
    }
    this.drop(id);
  }

  /** (R2, host) Held slots older than the hold leave for good (called every few seconds; `now` in ms). */
  expireAway(now: number): void {
    for (const [id, at] of this.awayAt) if (now - at > REJOIN_HOLD_S * 1000) this.drop(id);
  }

  private drop(id: string): void {
    const p = this.players.get(id);
    this.awayAt.delete(id);
    this.tokOf.delete(id);
    if (!p) return;
    this.players.delete(id);
    this.events.emit('peerLeft', { id, name: p.name });
    if (this.isHost) this.broadcastLobby();
    else this.events.emit('lobby', { players: [...this.players.values()] });
  }

  broadcastLobby(): void {
    if (!this.isHost) return;
    const players = [...this.players.values()];
    this.send({ t: 'lobby', players, mode: this.mode, map: this.map, difficulty: this.difficulty, phase: this.phase, mission: this.mission, weather: this.weather });
    this.events.emit('lobby', { players });
  }

  setReady(ready: boolean): void {
    const me = this.players.get(this.selfId)!;
    me.ready = ready;
    if (this.isHost) this.broadcastLobby();
    else this.toHost({ t: 'ready', ready });
  }

  setSettings(mode: NetMode, map: string, difficulty: Difficulty, mission = this.mission, weather = this.weather): void {
    if (!this.isHost) return;
    // (PR E fix) another mode, map or mission is a new match, not the one the auto start resumes (a block it lifts, such
    // as a switch off the campaign, would otherwise start it alone at once)
    if (mode !== this.mode || map !== this.map || (mode === 'infiltration' ? mission : '') !== this.mission) this.cancelAutoStart();
    this.mode = mode;
    this.map = map;
    this.difficulty = difficulty;
    this.mission = mode === 'infiltration' ? mission : '';
    this.weather = weather;
    this.broadcastLobby();
  }

  get allReady(): boolean {
    return [...this.players.values()].every((p) => p.ready || p.host);
  }

  /** (mission-rules R4) The room's map's missions (Sector Ops only: no other mode binds a mission). */
  private sectorMissions(): readonly MissionDef[] | undefined {
    if (this.mode !== 'sector') return undefined;
    return MAPS.find((m) => m.id === this.map)?.missions;
  }

  /**
   * (mission-rules R4, BRIEF A9) The room plays the campaign: Sector Ops on a campaign map (Tallow Wharf: every mission
   * campaign, A8) or with a campaign mission picked. A client knows only the map (the host's mission comes with `start`),
   * so its view follows the map; the host decides every start and join.
   */
  get campaign(): boolean {
    const missions = this.sectorMissions();
    return isCampaignMap(missions) || isCampaignMission(missions?.find((m) => m.id === this.sectorMission));
  }

  /** Players this room takes: `CAMPAIGN_ROOM` (2) for the campaign, else the mode's `capacity`. */
  get cap(): number {
    return this.campaign ? CAMPAIGN_ROOM : capacity(this.mode);
  }

  /**
   * (mission-rules R4, G2) Why the host cannot start the campaign now (`CAMPAIGN_PICK_MISSION`: a campaign map with no
   * campaign mission picked; `CAMPAIGN_TWO_PLAYERS`: not exactly two in the room), or null (any other match, as before).
   */
  get campaignBlock(): string | null {
    const missions = this.sectorMissions();
    return missions ? campaignStartBlock(missions, this.sectorMission || null, this.players.size) : null;
  }

  /** Too many players for the chosen mode (co-op takes 4) or for the campaign (2). */
  get overCapacity(): boolean {
    return this.players.size > this.cap;
  }

  /** Host: start the match for everyone; null (and the room stays in the lobby) when it cannot start. */
  startMatch(): StartInfo | null {
    if (!this.isHost) return null;
    // (mission-rules R4, BRIEF A19) a blocked start returns before the phase changes, so the room can still start once
    // the partner is in (before, a lone host was left in `playing` and never started)
    if (this.overCapacity || this.campaignBlock !== null) return null;
    this.phase = 'playing';
    // (NET3) a Sector Ops match carries the host's mission (none: the start as before)
    const sm = this.mode === 'sector' ? this.sectorMission : '';
    this.start = { mode: this.mode, map: this.map, seed: Math.floor(Math.random() * 1e9), difficulty: this.difficulty, mission: this.mission, weather: this.weather, bay: this.mode === 'course' ? this.courseBay : 1, ...(sm ? { sectorMission: sm } : {}) };
    this.send(startMsg(this.start));
    this.broadcastLobby();
    this.events.emit('start', this.start);
    return this.start;
  }

  /**
   * (PR E fix, host) Start the match on our own, once, as soon as the room can: on a lobby change in the lobby phase
   * with `blocked()` null and the room not over capacity, `startMatch` on the next task (after the lobby handler that
   * announced the change). No ready check: it is for a room whose players were mid-match ("Resume hosting": the
   * waiting partner has no Ready button). Mode-agnostic: the caller passes the start block that holds it now. Gone once
   * a match starts (by any route), on another mode / map / mission (`setSettings`), on `cancelAutoStart` and on `leave`;
   * a check that fails when the task runs (the partner dropped again) leaves it pending for the next lobby change.
   */
  startWhenUnblocked(blocked: () => string | null): void {
    if (!this.isHost || this.closed) return;
    this.cancelAutoStart();
    let queued = false;
    const ready = (): boolean => !this.closed && this.phase === 'lobby' && !this.overCapacity && blocked() === null;
    const offLobby = this.events.on('lobby', () => {
      if (queued || !ready()) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        if (this.autoOff === off && ready()) this.startMatch();
      }, 0);
    });
    const offStart = this.events.on('start', () => this.cancelAutoStart());
    const off = (): void => {
      offLobby();
      offStart();
    };
    this.autoOff = off;
  }

  /** (PR E fix) An auto start is pending (`startWhenUnblocked`). */
  get autoStarting(): boolean {
    return this.autoOff !== null;
  }

  /** (PR E fix) Drop the pending auto start, if any. */
  cancelAutoStart(): void {
    const off = this.autoOff;
    this.autoOff = null;
    off?.();
  }

  /** Back to the lobby after a match (host). */
  backToLobby(): void {
    this.phase = 'lobby';
    this.start = null;
    // (R2) no match to hold a slot in
    for (const id of [...this.awayAt.keys()]) this.drop(id);
    for (const p of this.players.values()) if (!p.host) p.ready = false;
    this.broadcastLobby();
  }

  async leave(reason = 'left'): Promise<void> {
    if (this.closed) return;
    if (this.isHost) this.send({ t: 'bye', reason });
    this.closed = true;
    this.cancelAutoStart();
    if (this.holdTimer) clearInterval(this.holdTimer);
    await this.transport.leave().catch(() => {});
    this.events.clear();
  }
}

/** The `start` message for a match ((NET3) `sm` only when a sector mission is set). */
export function startMsg(s: StartInfo): Msg {
  return { t: 'start', mode: s.mode, map: s.map, seed: s.seed, difficulty: s.difficulty, time: 0, mission: s.mission, weather: s.weather, bay: s.bay ?? 1, ...(s.sectorMission ? { sm: s.sectorMission } : {}) };
}
