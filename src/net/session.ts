import { EventBus } from '../core/events';
import type { WeatherChoice } from '../world/mapDef';
import type { AvatarLook } from '../cosmetics/avatarLook';
import { capacity, parseMessage, PROTOCOL_VERSION, type Difficulty, type Msg, type NetMode, type PlayerInfo } from './protocol';
import type { Transport } from './transport';
import type { WeaponId } from '../weapons/weaponDefs';
import { REJOIN_HOLD_S } from '../core/rejoin';
import { isPlayerSlot, PLAYER_SLOTS, SlotTable, type PlayerSlot } from '../game/playerSlots';
import { flags } from '../core/flags';

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
}

/**
 * (J14 R1, PLAN A16) The map a host's room opens on: Marlow Yard (`ctcourse`) is the re-planned yard (`ctcourseReplan`)
 * with `?marlowreplan=1`; every other map, and the flag off, as picked. The client loads the map the host's `start` names.
 */
export function roomMap(map: string, replan = flags.marlowReplan): string {
  return replan && map === 'ctcourse' ? 'ctcourseReplan' : map;
}

/**
 * (J14 R1 fix 8) The map a "Resume hosting" record reopens on: a record kept on the re-planned yard falls back to the
 * built yard when this page has `?marlowreplan=1` off (the re-plan is dark); with the flag on, as `roomMap`.
 */
export function resumeMap(map: string, replan = flags.marlowReplan): string {
  return !replan && map === 'ctcourseReplan' ? 'ctcourse' : roomMap(map, replan);
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
  map = roomMap('ctcourse');
  difficulty: Difficulty = 'normal';
  mission = '';
  weather: WeatherChoice = 'clear';
  /** Course mode: "Start at bay N" (host, 1-based; D20). */
  courseBay = 1;
  /** (coop4 D4, FOLDED-PLAN J4) Host: a room cap below the mode's, set by what is played (a campaign mission is exactly
   *  2 players, G2); 0 = the mode's `capacity`. Host side only: a client's lobby still shows the mode's slots. */
  roomCap = 0;
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
  /** (coop4 A19, host) The slot rules: the host 0, a joiner the lowest free slot, a held player keeps its slot until its
   *  rejoin or the hold ends, a lobby leave frees it, compacted at `startMatch`. `PlayerInfo.slot` mirrors it. */
  private readonly slots = new SlotTable(PLAYER_SLOTS);
  /** (coop4 A18, host) Connections that got the lobby instead of a refusal (a tokenless first hello while two or more
   *  slots are held: the token goes only to a host the page knows, so it learns this one first). */
  private readonly probed = new Set<string>();

  constructor(
    readonly transport: Transport,
    readonly role: 'host' | 'client',
    readonly code: string,
    private me: LocalProfile,
    /** (R2) Client: this tab's rejoin token for the room ('' = none). */
    private readonly tok = '',
  ) {
    this.hostId = role === 'host' ? transport.selfId : null;
    // (coop4) a client's own slot is the host's to give (its lobby); 1 until then
    this.players.set(transport.selfId, { id: transport.selfId, ...me, ready: role === 'host', host: role === 'host', away: false, slot: role === 'host' ? 0 : 1 });
    if (role === 'host') {
      this.slots.host(transport.selfId);
      this.holdTimer = setInterval(() => this.expireAway(Date.now()), 5000);
    }
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

  /** (coop4 A19) Player `id`'s slot this match (host: the slot table; client: the host's lobby), -1 when not in the
   *  room. Allocates nothing. */
  slotOf(id: string): PlayerSlot | -1 {
    if (this.isHost) return this.slots.slotOf(id);
    const s = this.players.get(id)?.slot;
    return isPlayerSlot(s) ? s : -1;
  }

  /** (coop4) Our own slot: the host 0; a client the one the host's lobby gives us (1 until it arrives). */
  get selfSlot(): PlayerSlot {
    const s = this.slotOf(this.selfId);
    if (s === -1) return this.isHost ? 0 : 1;
    return s;
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
            this.slots.release(conn);
          }
          pid = held;
          // the slot's earlier connection (if it is still around) is stale from here on
          for (const [t, p] of this.alias) if (p === held) this.alias.delete(t);
          this.alias.set(conn, held);
          this.route.set(held, conn);
        }
      }
      // (coop4 A19) a new player takes the lowest free slot; a held one (its rejoin) or a known one keeps its own
      const slot = !this.players.has(pid) && this.players.size >= this.cap ? -1 : this.slots.assign(pid);
      if (slot < 0) {
        // (coop4 A18) two or more slots held: a page's first hello is tokenless (its token goes only to the host it
        // knows), so it gets the lobby once (it learns the host and sends its token); its next tokenless hello is refused
        if (!msg.tok && this.slots.heldCount() >= 2 && !this.probed.has(conn)) {
          this.probed.add(conn);
          this.send(this.lobbyMsg(this.bySlot()), conn);
          return;
        }
        // (coop4) the refusal names the room's mode: the refused page shows its cap
        this.send({ t: 'bye', reason: 'Room is full', mode: this.mode }, conn);
        return;
      }
      this.slots.unhold(pid);
      const prev = this.players.get(pid);
      this.players.set(pid, { id: pid, name: msg.name, tag: msg.tag, look: msg.look, loadout: msg.loadout, ready: prev?.ready ?? false, host: false, away: false, slot });
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
      // (coop4) the refusing room's mode (its cap shows on the "Room full" text)
      if (msg.mode) this.mode = msg.mode;
      this.events.emit('full', {});
      return;
    }
    if (from !== this.hostId) return;
    if (msg.t === 'start') {
      this.phase = 'playing';
      this.start = { mode: msg.mode, map: msg.map, seed: msg.seed, difficulty: msg.difficulty, mission: msg.mission, weather: msg.weather, bay: msg.bay ?? 1 };
      this.events.emit('start', this.start);
      return;
    }
    if (msg.t === 'bye') {
      if (/full/i.test(msg.reason)) {
        this.refused = true;
        this.hostId = null;
        if (msg.mode) this.mode = msg.mode;
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
    this.probed.delete(conn);
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
      // (coop4 A18) its slot is kept for the rejoin
      this.slots.hold(id);
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
    // (coop4 A19) a lobby leave or a hold's end frees the slot for the next joiner
    if (this.isHost) this.slots.release(id);
    this.events.emit('peerLeft', { id, name: p.name });
    if (this.isHost) this.broadcastLobby();
    else this.events.emit('lobby', { players: [...this.players.values()] });
  }

  /** (coop4, host) The players in slot order, each `slot` from the table (the lobby list: its order is the slot order,
   *  so a peer without slots reads the same from the list order). A new array (lobby changes only). */
  private bySlot(): PlayerInfo[] {
    const out = [...this.players.values()];
    for (const p of out) p.slot = Math.max(0, this.slots.slotOf(p.id));
    // insertion sort over <= MAX_PLAYERS entries
    for (let i = 1; i < out.length; i++) {
      const p = out[i]!;
      let j = i - 1;
      while (j >= 0 && out[j]!.slot > p.slot) {
        out[j + 1] = out[j]!;
        j--;
      }
      out[j + 1] = p;
    }
    return out;
  }

  private lobbyMsg(players: PlayerInfo[]): Msg {
    return { t: 'lobby', players, mode: this.mode, map: this.map, difficulty: this.difficulty, phase: this.phase, mission: this.mission, weather: this.weather };
  }

  broadcastLobby(): void {
    if (!this.isHost) return;
    const players = this.bySlot();
    this.send(this.lobbyMsg(players));
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
    this.mode = mode;
    // (J14 R1) the lobby's Marlow Yard pick opens the re-planned yard with the flag on
    this.map = roomMap(map);
    this.difficulty = difficulty;
    this.mission = mode === 'infiltration' ? mission : '';
    this.weather = weather;
    this.broadcastLobby();
  }

  get allReady(): boolean {
    return [...this.players.values()].every((p) => p.ready || p.host);
  }

  /** Players this room takes: the mode's `capacity`, or `roomCap` when that is lower (coop4 D4). */
  get cap(): number {
    const m = capacity(this.mode);
    return this.roomCap > 0 ? Math.min(this.roomCap, m) : m;
  }

  /** Too many players for the chosen mode (co-op takes 4) or the room cap. */
  get overCapacity(): boolean {
    return this.players.size > this.cap;
  }

  /** Host: start the match for everyone. */
  startMatch(): StartInfo | null {
    if (!this.isHost) return null;
    this.phase = 'playing';
    if (this.overCapacity) return null;
    // (coop4 A19) slots close their gaps at a match start (in slot order; the host stays 0), then never move in it
    const order: string[] = [];
    for (const p of this.bySlot()) order.push(p.id);
    this.slots.compact(order);
    this.start = { mode: this.mode, map: this.map, seed: Math.floor(Math.random() * 1e9), difficulty: this.difficulty, mission: this.mission, weather: this.weather, bay: this.mode === 'course' ? this.courseBay : 1 };
    this.send(startMsg(this.start));
    this.broadcastLobby();
    this.events.emit('start', this.start);
    return this.start;
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
    if (this.holdTimer) clearInterval(this.holdTimer);
    await this.transport.leave().catch(() => {});
    this.events.clear();
  }
}

/** The `start` message for a match. */
function startMsg(s: StartInfo): Msg {
  return { t: 'start', mode: s.mode, map: s.map, seed: s.seed, difficulty: s.difficulty, time: 0, mission: s.mission, weather: s.weather, bay: s.bay ?? 1 };
}
