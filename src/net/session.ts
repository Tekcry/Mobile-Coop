import { EventBus } from '../core/events';
import type { WeatherChoice } from '../world/mapDef';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { capacity, parseMessage, PROTOCOL_VERSION, type Difficulty, type Msg, type NetMode, type PlayerInfo, type WireCustom } from './protocol';
import { sanitizeCustom, type CustomDifficulty } from '../ai/archetypes';
import type { Transport } from './transport';
import type { WeaponId } from '../weapons/weaponDefs';

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
  /** (locomotion step 19) The host's custom sliders when `difficulty` is 'custom' (null = Normal sliders). */
  custom: CustomDifficulty | null;
  /** Infiltration: the mission ('' otherwise). */
  mission: string;
  weather: WeatherChoice;
  /** Course mode: the bay to start at (1-based, D20). */
  bay?: number;
}

export interface SessionEvents {
  lobby: { players: PlayerInfo[] };
  start: StartInfo;
  game: { msg: Msg; from: string };
  peerLeft: { id: string; name: string };
  hostLeft: Record<string, never>;
  full: Record<string, never>;
}

/**
 * Lobby + message routing for a coop room. The host is authoritative: clients accept lobby/start/
 * snapshot/event/end messages only from the host, and the host accepts gameplay messages only from
 * players in its lobby. No host migration: if the host leaves, the session ends.
 */
export class NetSession {
  readonly events = new EventBus<SessionEvents>();
  readonly players = new Map<string, PlayerInfo>();
  hostId: string | null;
  /** A new room's mode: Infiltration (the host's lobby sets its mission; `?legacy=1` hosts switch to the parked Hunter). */
  mode: NetMode = 'infiltration';
  map = 'warehouse';
  difficulty: Difficulty = 'normal';
  /** (locomotion step 19, D7) The host's custom sliders (host: from its settings; client: from the lobby, read-only). */
  custom: CustomDifficulty | null = null;
  mission = '';
  weather: WeatherChoice = 'clear';
  /** Course mode: "Start at bay N" (host, 1-based; D20). */
  courseBay = 1;
  phase: 'lobby' | 'playing' = 'lobby';
  private start: StartInfo | null = null;
  private closed = false;

  constructor(
    readonly transport: Transport,
    readonly role: 'host' | 'client',
    readonly code: string,
    private me: LocalProfile,
  ) {
    this.hostId = role === 'host' ? transport.selfId : null;
    this.players.set(transport.selfId, { id: transport.selfId, ...me, ready: role === 'host', host: role === 'host' });
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

  get selfId(): string {
    return this.transport.selfId;
  }

  get isHost(): boolean {
    return this.role === 'host';
  }

  private hello(): Msg {
    return { t: 'hello', v: PROTOCOL_VERSION, name: this.me.name, tag: this.me.tag, look: this.me.look, loadout: this.me.loadout };
  }

  send(msg: Msg, to?: string): void {
    if (!this.closed) this.transport.send(msg, to);
  }

  /** Client -> host convenience. */
  toHost(msg: Msg): void {
    if (this.hostId && !this.isHost) this.send(msg, this.hostId);
  }

  private receive(raw: unknown, from: string): void {
    const msg = parseMessage(raw);
    if (!msg || this.closed) return;
    if (this.isHost) this.hostReceive(msg, from);
    else this.clientReceive(msg, from);
  }

  private hostReceive(msg: Msg, from: string): void {
    if (msg.t === 'hello') {
      if (msg.v !== PROTOCOL_VERSION) return;
      if (!this.players.has(from) && this.players.size >= capacity(this.mode)) {
        this.send({ t: 'bye', reason: 'Room is full' }, from);
        return;
      }
      const prev = this.players.get(from);
      this.players.set(from, { id: from, name: msg.name, tag: msg.tag, look: msg.look, loadout: msg.loadout, ready: prev?.ready ?? false, host: false });
      this.broadcastLobby();
      // late join / reconnect during a match
      if (this.phase === 'playing' && this.start) this.send(startMsg(this.start), from);
      return;
    }
    if (!this.players.has(from)) return;
    if (msg.t === 'ready') {
      const p = this.players.get(from)!;
      p.ready = msg.ready;
      this.broadcastLobby();
      return;
    }
    if (msg.t === 'pstate' || msg.t === 'shot' || msg.t === 'blast' || msg.t === 'use' || msg.t === 'td' || msg.t === 'tmove' || msg.t === 'cmove' || msg.t === 'ping' || msg.t === 'gadget' || msg.t === 'door' || msg.t === 'ctick') {
      this.events.emit('game', { msg, from });
    }
  }

  private clientReceive(msg: Msg, from: string): void {
    if (msg.t === 'lobby') {
      const host = msg.players.find((p) => p.host);
      if (!host || host.id !== from) return;
      if (this.hostId && this.hostId !== from) return;
      this.hostId = from;
      // keep our own entry authoritative locally
      const mine = this.players.get(this.selfId)!;
      this.players.clear();
      for (const p of msg.players) this.players.set(p.id, p.id === this.selfId ? { ...p, ...{ name: mine.name, tag: mine.tag, look: mine.look, loadout: mine.loadout } } : p);
      if (!this.players.has(this.selfId)) this.players.set(this.selfId, mine);
      this.mode = msg.mode;
      this.map = msg.map;
      this.difficulty = msg.difficulty;
      this.custom = fromWire(msg.dc);
      this.mission = msg.mission;
      this.weather = msg.weather;
      this.phase = msg.phase;
      this.events.emit('lobby', { players: [...this.players.values()] });
      return;
    }
    if (msg.t === 'hello') return; // other clients introducing themselves; the host's lobby is authoritative
    // a full room's host refuses us before we ever see its lobby
    if (msg.t === 'bye' && !this.hostId && /full/i.test(msg.reason)) {
      this.events.emit('full', {});
      return;
    }
    if (from !== this.hostId) return;
    if (msg.t === 'start') {
      this.phase = 'playing';
      this.start = { mode: msg.mode, map: msg.map, seed: msg.seed, difficulty: msg.difficulty, custom: msg.difficulty === 'custom' ? fromWire(msg.dc) : null, mission: msg.mission, weather: msg.weather, bay: msg.bay ?? 1 };
      this.events.emit('start', this.start);
      return;
    }
    if (msg.t === 'bye') {
      if (/full/i.test(msg.reason)) this.events.emit('full', {});
      else this.events.emit('hostLeft', {});
      return;
    }
    this.events.emit('game', { msg, from });
  }

  private peerLeft(id: string): void {
    const p = this.players.get(id);
    if (id === this.hostId && !this.isHost) {
      this.events.emit('hostLeft', {});
      return;
    }
    if (!p) return;
    this.players.delete(id);
    this.events.emit('peerLeft', { id, name: p.name });
    if (this.isHost) this.broadcastLobby();
    else this.events.emit('lobby', { players: [...this.players.values()] });
  }

  broadcastLobby(): void {
    if (!this.isHost) return;
    const players = [...this.players.values()];
    this.send({ t: 'lobby', players, mode: this.mode, map: this.map, difficulty: this.difficulty, phase: this.phase, mission: this.mission, weather: this.weather, ...this.wireDc() });
    this.events.emit('lobby', { players });
  }

  setReady(ready: boolean): void {
    const me = this.players.get(this.selfId)!;
    me.ready = ready;
    if (this.isHost) this.broadcastLobby();
    else this.toHost({ t: 'ready', ready });
  }

  /** (locomotion step 19) Host: the custom sliders sent with Custom (its own stored values); re-broadcasts the lobby. */
  setCustom(c: CustomDifficulty | null): void {
    if (!this.isHost) return;
    this.custom = c ? sanitizeCustom(c) : null;
    this.broadcastLobby();
  }

  /** `dc` for `lobby` / `start` (only with Custom). */
  private wireDc(): { dc?: WireCustom } {
    if (this.difficulty !== 'custom') return {};
    return { dc: toWire(this.custom) };
  }

  setSettings(mode: NetMode, map: string, difficulty: Difficulty, mission = this.mission, weather = this.weather): void {
    if (!this.isHost) return;
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

  /** Too many players for the chosen mode (co-op takes 4). */
  get overCapacity(): boolean {
    return this.players.size > capacity(this.mode);
  }

  /** Host: start the match for everyone. */
  startMatch(): StartInfo | null {
    if (!this.isHost) return null;
    this.phase = 'playing';
    if (this.overCapacity) return null;
    this.start = { mode: this.mode, map: this.map, seed: Math.floor(Math.random() * 1e9), difficulty: this.difficulty, custom: this.difficulty === 'custom' ? this.custom : null, mission: this.mission, weather: this.weather, bay: this.mode === 'course' ? this.courseBay : 1 };
    this.send(startMsg(this.start));
    this.broadcastLobby();
    this.events.emit('start', this.start);
    return this.start;
  }

  /** Back to the lobby after a match (host). */
  backToLobby(): void {
    this.phase = 'lobby';
    this.start = null;
    for (const p of this.players.values()) if (!p.host) p.ready = false;
    this.broadcastLobby();
  }

  async leave(reason = 'left'): Promise<void> {
    if (this.closed) return;
    if (this.isHost) this.send({ t: 'bye', reason });
    this.closed = true;
    await this.transport.leave().catch(() => {});
    this.events.clear();
  }
}

/** A received `dc` as custom sliders (null when absent). */
function fromWire(dc: WireCustom | undefined): CustomDifficulty | null {
  return dc ? { base: dc.b, perception: dc.p, aim: dc.a, alarm: dc.t } : null;
}

/** Custom sliders on the wire (null = Normal sliders). */
function toWire(c: CustomDifficulty | null): WireCustom {
  const v = c ?? sanitizeCustom(null);
  return { b: v.base, p: v.perception, a: v.aim, t: v.alarm };
}

/** The `start` message for a match (`dc` only with Custom). */
function startMsg(s: StartInfo): Msg {
  return { t: 'start', mode: s.mode, map: s.map, seed: s.seed, difficulty: s.difficulty, time: 0, mission: s.mission, weather: s.weather, bay: s.bay ?? 1, ...(s.difficulty === 'custom' ? { dc: toWire(s.custom) } : {}) };
}
