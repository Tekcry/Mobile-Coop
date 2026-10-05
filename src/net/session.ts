import { EventBus } from '../core/events';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { parseMessage, PROTOCOL_VERSION, MAX_PLAYERS, type Difficulty, type Msg, type NetMode, type PlayerInfo } from './protocol';
import type { Transport } from './transport';

export interface LocalProfile {
  name: string;
  tag: PlayerInfo['tag'];
  look: AvatarLook;
}

export interface StartInfo {
  mode: NetMode;
  map: string;
  seed: number;
  difficulty: Difficulty;
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
  mode: NetMode = 'wave';
  map = 'depot';
  difficulty: Difficulty = 'normal';
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
    return { t: 'hello', v: PROTOCOL_VERSION, name: this.me.name, tag: this.me.tag, look: this.me.look };
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
      if (!this.players.has(from) && this.players.size >= MAX_PLAYERS) {
        this.send({ t: 'bye', reason: 'Room is full' }, from);
        return;
      }
      const prev = this.players.get(from);
      this.players.set(from, { id: from, name: msg.name, tag: msg.tag, look: msg.look, ready: prev?.ready ?? false, host: false });
      this.broadcastLobby();
      // late join / reconnect during a match
      if (this.phase === 'playing' && this.start) this.send({ t: 'start', ...this.start, time: 0 }, from);
      return;
    }
    if (!this.players.has(from)) return;
    if (msg.t === 'ready') {
      const p = this.players.get(from)!;
      p.ready = msg.ready;
      this.broadcastLobby();
      return;
    }
    if (msg.t === 'pstate' || msg.t === 'shot' || msg.t === 'emote' || msg.t === 'blast') {
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
      for (const p of msg.players) this.players.set(p.id, p.id === this.selfId ? { ...p, ...{ name: mine.name, tag: mine.tag, look: mine.look } } : p);
      if (!this.players.has(this.selfId)) this.players.set(this.selfId, mine);
      this.mode = msg.mode;
      this.map = msg.map;
      this.difficulty = msg.difficulty;
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
      this.start = { mode: msg.mode, map: msg.map, seed: msg.seed, difficulty: msg.difficulty };
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
    this.send({ t: 'lobby', players, mode: this.mode, map: this.map, difficulty: this.difficulty, phase: this.phase });
    this.events.emit('lobby', { players });
  }

  setReady(ready: boolean): void {
    const me = this.players.get(this.selfId)!;
    me.ready = ready;
    if (this.isHost) this.broadcastLobby();
    else this.toHost({ t: 'ready', ready });
  }

  setSettings(mode: NetMode, map: string, difficulty: Difficulty): void {
    if (!this.isHost) return;
    this.mode = mode;
    this.map = map;
    this.difficulty = difficulty;
    this.broadcastLobby();
  }

  get allReady(): boolean {
    return [...this.players.values()].every((p) => p.ready || p.host);
  }

  /** Host: start the match for everyone. */
  startMatch(): StartInfo | null {
    if (!this.isHost) return null;
    this.phase = 'playing';
    this.start = { mode: this.mode, map: this.map, seed: Math.floor(Math.random() * 1e9), difficulty: this.difficulty };
    this.send({ t: 'start', ...this.start, time: 0 });
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
