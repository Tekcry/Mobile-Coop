import type { Transport } from './transport';

/**
 * (server browser, BRIEF item 28, prototype) Public rooms. A host that sets its room Public posts a notice (code, map,
 * mode, version, players) into one shared directory room on the same signalling relays as every co-op room (Trystero /
 * Nostr; no server): to everyone every `NOTICE_EVERY_S`, to a newcomer at once, and a `gone` when the room is full or
 * closed. A browser (Co-op > Browse rooms) joins the directory room, asks, and lists the live notices of its own
 * version; a notice not refreshed for `NOTICE_TTL_S` drops out. Joining is by the code, as today. Pure: any `Transport`
 * (the tests' hub, `?net=local`'s BroadcastChannel, Trystero).
 */
export const DIRECTORY_ROOM = 'ss-directory-v1';
export const NOTICE_EVERY_S = 30;
export const NOTICE_TTL_S = 75;
/** Rooms a browser lists at most (a flood of codes is ignored past it). */
export const MAX_LISTED = 50;

export interface RoomNotice {
  code: string;
  /** The map id and the mode (labels are the browser's own). */
  map: string;
  mode: string;
  /** The game version and protocol (`4.42.0/p27`): other versions are hidden. */
  v: string;
  players: number;
  cap: number;
  /** The host's name (shown in the list). */
  host: string;
}

export type DirMsg = ({ t: 'room' } & RoomNotice) | { t: 'gone'; code: string } | { t: 'ask' };

const CODE = /^[A-Z0-9]{5}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const V = /^[0-9A-Za-z.\-/]{1,24}$/;
const int = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/** Validate a directory message (everything from a peer is untrusted). */
export function parseDirMsg(raw: unknown): DirMsg | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;
  if (m.t === 'ask') return { t: 'ask' };
  if (m.t === 'gone') return typeof m.code === 'string' && CODE.test(m.code) ? { t: 'gone', code: m.code } : null;
  if (m.t !== 'room') return null;
  const players = int(m.players, 0, 8);
  const cap = int(m.cap, 1, 8);
  if (typeof m.code !== 'string' || !CODE.test(m.code) || typeof m.map !== 'string' || !ID.test(m.map) || typeof m.mode !== 'string' || !ID.test(m.mode)) return null;
  if (typeof m.v !== 'string' || !V.test(m.v) || players === null || cap === null) return null;
  const host = typeof m.host === 'string' ? m.host.replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 16) : '';
  return { t: 'room', code: m.code, map: m.map, mode: m.mode, v: m.v, players, cap, host: host || 'Operator' };
}

/** A public room's notice poster. `notice()` reads the room now (null: not public now, e.g. full). */
export class DirectoryPoster {
  private timer: ReturnType<typeof setInterval>;
  /** The notice last posted ('' = none, or a `gone` was sent). */
  posted = '';
  private closed = false;

  constructor(
    private readonly t: Transport,
    private readonly notice: () => RoomNotice | null,
  ) {
    t.onMessage = (raw, from) => {
      const m = parseDirMsg(raw);
      if (m?.t === 'ask') this.post(from);
    };
    t.onPeerJoin = (id) => this.post(id);
    t.onPeerLeave = null;
    this.timer = setInterval(() => this.post(), NOTICE_EVERY_S * 1000);
    this.post();
  }

  /** Post now (to one peer, or everyone): the notice, or a `gone` once the room stops being listed. */
  post(to?: string): void {
    if (this.closed) return;
    const n = this.notice();
    if (n) {
      const m: DirMsg = { t: 'room', ...n };
      this.t.send(m, to);
      this.posted = n.code;
    } else if (this.posted) {
      this.t.send({ t: 'gone', code: this.posted });
      this.posted = '';
    }
  }

  /** The room closed or went private: `gone`, then off the directory. */
  async close(): Promise<void> {
    if (this.closed) return;
    const n = this.notice();
    const code = this.posted || n?.code || '';
    this.closed = true;
    clearInterval(this.timer);
    if (code) {
      this.t.send({ t: 'gone', code });
      // (the send is async on Trystero: a moment before the links close; a browser also drops a leaving host's rooms)
      await new Promise((r) => setTimeout(r, 250));
    }
    await this.t.leave().catch(() => {});
  }
}

export interface ListedRoom extends RoomNotice {
  /** When the notice last arrived (ms). */
  at: number;
  /** The peer that posted it: only it can refresh or remove the code. */
  from: string;
}

/** The browser's side: the live notices of one version, newest first. */
export class DirectoryBrowser {
  private readonly rooms = new Map<string, ListedRoom>();
  onChange: (() => void) | null = null;
  private closed = false;

  constructor(
    private readonly t: Transport,
    private readonly version: string,
    private readonly now: () => number = () => Date.now(),
  ) {
    t.onMessage = (raw, from) => this.receive(raw, from);
    // hosts answer an ask with their notice; a newcomer host posts on its own
    t.onPeerJoin = (id) => t.send({ t: 'ask' }, id);
    // a host gone from the directory takes its rooms with it
    t.onPeerLeave = (id) => {
      let any = false;
      for (const [code, r] of this.rooms) if (r.from === id && this.rooms.delete(code)) any = true;
      if (any) this.onChange?.();
    };
    t.send({ t: 'ask' });
  }

  private receive(raw: unknown, from: string): void {
    const m = parseDirMsg(raw);
    if (!m || this.closed || m.t === 'ask') return;
    const code = m.code;
    const had = this.rooms.get(code);
    // a code belongs to the peer that listed it: no one else can refresh, fake or remove it
    if (had && had.from !== from) return;
    if (m.t === 'gone') {
      if (this.rooms.delete(code)) this.onChange?.();
      return;
    }
    const { t: _t, ...n } = m;
    void _t;
    if (n.v !== this.version || n.players >= n.cap) {
      if (this.rooms.delete(code)) this.onChange?.();
      return;
    }
    if (!had && this.rooms.size >= MAX_LISTED) return;
    this.rooms.set(code, { ...n, at: this.now(), from });
    this.onChange?.();
  }

  /** The live rooms (an expired notice drops out here). */
  list(): ListedRoom[] {
    const now = this.now();
    for (const [code, r] of this.rooms) if (now - r.at > NOTICE_TTL_S * 1000) this.rooms.delete(code);
    return [...this.rooms.values()].sort((a, b) => b.at - a.at);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.onChange = null;
    await this.t.leave().catch(() => {});
  }
}
