import type { App } from '../core/app';
import type { GameOptions, SessionCallbacks } from '../game/gameState';
import { flags } from '../core/flags';
import { h } from '../ui/dom';
import { Screen } from '../ui/screen';
import type { Hint } from '../ui/prompts';
import { button, choice, Dialog } from '../ui/widgets';
import { MAPS, getMap } from '../world/maps';
import { CODE_ALPHABET, makeRoomCode, normalizeRoomCode, type Difficulty, type NetMode, type PlayerInfo } from './protocol';
import { NetSession, type LocalProfile, type StartInfo } from './session';
import type { Transport } from './transport';
import { createLocalTransport } from './localTransport';
import { createTrysteroTransport } from './trysteroTransport';
import { CoopHost } from './coopHost';
import { CoopClient } from './coopClient';

/** What the coop UI needs from the app shell (main.ts), so this module never imports it. */
export interface CoopApi {
  startGame(o: GameOptions, cb: SessionCallbacks): void;
  goToMenu(): void;
  profile(): LocalProfile;
}

const JOIN_TIMEOUT_MS = 15000;
const roomId = (code: string): string => `ss-${code}`;

function isOffline(): boolean {
  return flags.net !== 'local' && typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function openTransport(code: string): Promise<Transport> {
  return flags.net === 'local' ? createLocalTransport(roomId(code)) : createTrysteroTransport(roomId(code));
}

export function shareLink(code: string): string {
  const u = new URL(location.href);
  u.search = '';
  u.searchParams.set('room', code);
  if (flags.net === 'local') u.searchParams.set('net', 'local');
  return u.toString();
}

/**
 * Lives for one room: owns the session, swaps between lobby and match, and handles
 * host-left / match-ended transitions so screens stay simple.
 */
class CoopController {
  inGame = false;
  private lobby: LobbyScreen | null = null;
  private offs: (() => void)[] = [];
  private left = false;

  constructor(
    readonly app: App,
    readonly api: CoopApi,
    readonly session: NetSession,
  ) {
    const ev = session.events;
    this.offs.push(
      ev.on('start', (s) => this.start(s)),
      ev.on('hostLeft', () => this.fail('Host left', 'The host closed the room.')),
      ev.on('full', () => this.fail('Room full', 'That room already has 4 players.')),
      ev.on('lobby', () => {
        // host went back to the lobby while we were still in the match
        if (!session.isHost && this.inGame && session.phase === 'lobby') {
          this.app.toasts.show('Host ended the match');
          this.backToLobby();
        }
      }),
    );
  }

  showLobby(): void {
    this.lobby = new LobbyScreen(this);
    this.app.screens.push(this.lobby);
  }

  private start(s: StartInfo): void {
    if (this.inGame || this.left) return;
    this.inGame = true;
    const session = this.session;
    const map = getMap(s.map);
    this.api.startGame(
      {
        map,
        mode: s.mode,
        seed: s.seed,
        difficulty: s.difficulty,
        net: {
          role: session.role,
          attach: (g) => (session.isHost ? new CoopHost(g, session) : new CoopClient(g, session)),
        },
      },
      { quit: () => void this.leave(), restart: () => this.backToLobby() },
    );
  }

  backToLobby(): void {
    if (this.left) return;
    this.inGame = false;
    if (this.session.isHost) this.session.backToLobby();
    this.api.goToMenu();
    this.showLobby();
  }

  private fail(title: string, msg: string): void {
    if (this.left) return;
    void this.leave(false);
    this.app.screens.push(new Dialog(title, msg, [{ label: 'OK', action: () => {}, primary: true }]));
  }

  async leave(toMenu = true): Promise<void> {
    if (this.left) return;
    this.left = true;
    for (const o of this.offs) o();
    await this.session.leave(this.session.isHost ? 'Host left' : 'left');
    if (toMenu || this.inGame) this.api.goToMenu();
    else if (this.lobby && this.app.screens.top === this.lobby) this.app.screens.pop();
    this.inGame = false;
  }
}

/** Entry screen: host or join, or the offline notice. */
class CoopScreen extends Screen {
  private body: HTMLElement;

  constructor(
    private app: App,
    private api: CoopApi,
  ) {
    super('coop-screen');
    this.body = h('div', { class: 'rows coop-rows' });
    this.el.append(h('div', { class: 'screen-title', text: 'Co-op' }), this.body);
    this.build();
  }

  override onShow(): void {
    this.build();
    this.app.nav.setRoot(this.el, null);
  }

  private build(): void {
    if (isOffline()) {
      this.body.replaceChildren(
        h('div', { class: 'coop-offline' }, h('b', { text: 'Offline' }), h('span', { text: 'Co-op needs an internet connection. Single player works fully offline.' })),
        button('Retry', () => this.build(), { icon: 'wifi', autofocus: true }),
      );
      return;
    }
    this.body.replaceChildren(
      h('div', { class: 'row-note', text: '2-4 players. The host runs the match; others join with the room code.' }),
      button('Host a room', () => void hostRoom(this.app, this.api), { icon: 'wifi', class: 'primary big', autofocus: true }),
      button('Join with code', () => this.app.screens.push(new JoinScreen(this.app, this.api)), { icon: 'user', class: 'big' }),
    );
  }
}

/** Controller-friendly code entry: on-screen keypad plus typing on a keyboard. */
class JoinScreen extends Screen {
  private code = '';
  private slots: HTMLElement[] = [];
  private keyHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Backspace') this.del();
    else if (e.key === 'Enter') this.join();
    else if (e.key.length === 1) this.add(e.key);
  };

  constructor(
    private app: App,
    private api: CoopApi,
    initial = '',
  ) {
    super('coop-screen join-screen');
    const disp = h('div', { class: 'code-display' });
    for (let i = 0; i < 5; i++) {
      const s = h('span', { class: 'code-slot' });
      this.slots.push(s);
      disp.append(s);
    }
    const pad = h('div', { class: 'code-pad', attrs: { 'data-wrap': '' } });
    for (const ch of CODE_ALPHABET) {
      const b = button(ch, () => this.add(ch), { class: 'code-key' });
      pad.append(b);
    }
    pad.append(button('Del', () => this.del(), { class: 'code-key wide' }), button('Join', () => this.join(), { class: 'code-key wide primary' }));
    (pad.firstChild as HTMLElement).dataset.autofocus = '';
    this.el.append(h('div', { class: 'screen-title', text: 'Join room' }), disp, pad);
    for (const ch of initial) this.add(ch);
  }

  override onShow(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  override onHide(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private render(): void {
    this.slots.forEach((s, i) => {
      s.textContent = this.code[i] ?? '';
      s.classList.toggle('next', i === this.code.length);
    });
  }

  private add(ch: string): void {
    const c = ch.toUpperCase();
    if (this.code.length >= 5 || !CODE_ALPHABET.includes(c)) return;
    this.code += c;
    this.render();
  }

  private del(): void {
    this.code = this.code.slice(0, -1);
    this.render();
  }

  private join(): void {
    const code = normalizeRoomCode(this.code);
    if (!code) {
      this.app.toasts.show('Room codes have 5 characters', 'warn');
      return;
    }
    void joinRoom(this.app, this.api, code);
  }

  override hints(): Hint[] {
    return [
      { btn: 'A', label: 'Type' },
      { btn: 'B', label: 'Back' },
    ];
  }
}

const MODE_OPTS: { value: NetMode; label: string }[] = [
  { value: 'wave', label: 'Wave Survival' },
  { value: 'sandbox', label: 'Free Roam' },
];
const DIFF_OPTS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];

class LobbyScreen extends Screen {
  private list: HTMLElement;
  private status: HTMLElement;
  private opts: HTMLElement;
  private actions: HTMLElement;
  private off: (() => void)[] = [];

  constructor(private c: CoopController) {
    super('coop-screen lobby-screen');
    const s = c.session;
    this.status = h('div', { class: 'row-note lobby-status' });
    this.list = h('div', { class: 'lobby-players' });
    this.opts = h('div', { class: 'rows lobby-opts' });
    this.actions = h('div', { class: 'lobby-actions', attrs: { 'data-wrap': '' } });
    this.el.append(
      h('div', { class: 'screen-title', text: `Room ${s.code}` }),
      h('div', { class: 'lobby-body' }, h('div', { class: 'lobby-left' }, this.list, this.status), h('div', { class: 'lobby-right' }, this.opts, this.actions)),
    );
    this.buildOpts();
    this.buildActions();
    this.renderPlayers();
  }

  override initialFocus(): HTMLElement | null {
    return this.actions.querySelector('[data-autofocus]') as HTMLElement | null;
  }

  override onShow(): void {
    const ev = this.c.session.events;
    this.off.push(
      ev.on('lobby', () => {
        this.renderPlayers();
        if (!this.c.session.isHost) this.buildOpts();
        this.buildActions(true);
      }),
      ev.on('peerLeft', ({ name }) => this.c.app.toasts.show(`${name} left`)),
    );
  }

  override onHide(): void {
    for (const o of this.off) o();
    this.off = [];
  }

  override onBack(): boolean {
    this.c.app.screens.push(
      new Dialog('Leave room?', this.c.session.isHost ? 'Everyone in the room will be disconnected.' : 'You can rejoin with the same code.', [
        { label: 'Stay', action: () => {} },
        { label: 'Leave', action: () => void this.c.leave(false), primary: true },
      ]),
    );
    return true;
  }

  private renderPlayers(): void {
    const s = this.c.session;
    const ps = [...s.players.values()].sort((a, b) => Number(b.host) - Number(a.host));
    this.list.replaceChildren(
      ...ps.map((p: PlayerInfo) =>
        h(
          'div',
          { class: `lobby-player${p.id === s.selfId ? ' me' : ''}` },
          h('span', { class: 'lp-dot', style: { background: p.tag.color } }),
          h('span', { class: 'lp-name', text: p.name }),
          h('span', { class: 'lp-tag', text: p.tag.title }),
          h('span', { class: `lp-state ${p.host ? 'host' : p.ready ? 'ready' : ''}`, text: p.host ? 'Host' : p.ready ? 'Ready' : 'Not ready' }),
        ),
      ),
      ...Array.from({ length: Math.max(0, 4 - ps.length) }, () => h('div', { class: 'lobby-player empty', text: 'Open slot' })),
    );
    if (!s.hostId) this.status.textContent = 'Connecting to host…';
    else if (s.isHost) this.status.textContent = ps.length < 2 ? 'Share the code or link to invite players.' : s.allReady ? 'Everyone is ready.' : 'Waiting for players to ready up.';
    else this.status.textContent = s.phase === 'playing' ? 'Match in progress - joining…' : 'Waiting for the host to start.';
  }

  private buildOpts(): void {
    const s = this.c.session;
    const maps = MAPS.filter((m) => m.modes.includes(s.mode));
    if (!s.isHost) {
      const map = MAPS.find((m) => m.id === s.map);
      this.opts.replaceChildren(
        h('div', { class: 'row' }, h('span', { class: 'row-label', text: 'Mode' }), h('span', { text: MODE_OPTS.find((m) => m.value === s.mode)?.label ?? '' })),
        h('div', { class: 'row' }, h('span', { class: 'row-label', text: 'Map' }), h('span', { text: map?.name ?? s.map })),
        h('div', { class: 'row' }, h('span', { class: 'row-label', text: 'Difficulty' }), h('span', { text: DIFF_OPTS.find((d) => d.value === s.difficulty)?.label ?? '' })),
      );
      return;
    }
    if (!maps.some((m) => m.id === s.map)) s.setSettings(s.mode, maps[0]!.id, s.difficulty);
    const set = (mode: NetMode, map: string, d: Difficulty): void => {
      s.setSettings(mode, map, d);
      const idx = Array.from(this.opts.children).indexOf(this.c.app.nav.focused as HTMLElement);
      this.buildOpts();
      const el = this.opts.children[Math.max(0, idx)] as HTMLElement | undefined;
      if (idx >= 0) this.c.app.nav.setRoot(this.el, el ?? null);
    };
    this.opts.replaceChildren(
      choice('Mode', MODE_OPTS, () => s.mode, (v) => set(v, s.map, s.difficulty)),
      choice('Map', maps.map((m) => ({ value: m.id, label: m.name })), () => s.map, (v) => set(s.mode, v, s.difficulty)),
      choice('Difficulty', DIFF_OPTS, () => s.difficulty, (v) => set(s.mode, s.map, v)),
    );
  }

  private buildActions(keepFocus = false): void {
    const s = this.c.session;
    const focusedIdx = keepFocus ? Array.from(this.actions.children).indexOf(this.c.app.nav.focused as HTMLElement) : -1;
    const share = button('Share link', () => void this.share(), { icon: 'wifi' });
    const leave = button('Leave', () => this.onBack(), { icon: 'back' });
    let main: HTMLElement;
    if (s.isHost) {
      const solo = s.players.size < 2;
      main = button('Start match', () => s.startMatch(), {
        icon: 'play',
        class: 'primary big',
        autofocus: true,
        blocked: !solo && !s.allReady ? 'Waiting for players to ready up' : undefined,
      });
    } else {
      const me = s.players.get(s.selfId);
      main = button(me?.ready ? 'Not ready' : 'Ready', () => s.setReady(!me?.ready), { icon: 'play', class: me?.ready ? 'big' : 'primary big', autofocus: true });
      if (!s.hostId) (main as HTMLButtonElement).disabled = true;
    }
    this.actions.replaceChildren(main, share, leave);
    if (focusedIdx >= 0) this.c.app.nav.setRoot(this.el, (this.actions.children[focusedIdx] as HTMLElement) ?? null);
  }

  private async share(): Promise<void> {
    const link = shareLink(this.c.session.code);
    const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: 'Shoulder Strike co-op', url: link });
      else {
        await navigator.clipboard.writeText(link);
        this.c.app.toasts.show('Invite link copied', 'ok');
      }
    } catch {
      this.c.app.toasts.show(`Code: ${this.c.session.code}`);
    }
  }

  override hints(): Hint[] {
    return this.c.session.isHost
      ? [
          { btn: 'A', label: 'Select' },
          { btn: 'B', label: 'Leave' },
        ]
      : [
          { btn: 'A', label: 'Ready' },
          { btn: 'B', label: 'Leave' },
        ];
  }
}

/** Shown while the transport connects (WebRTC signalling can take a few seconds). */
class ConnectingScreen extends Screen {
  override readonly showBack = true;
  cancelled = false;
  constructor(text: string) {
    super('coop-screen connecting-screen');
    this.el.append(h('div', { class: 'screen-title', text: 'Co-op' }), h('div', { class: 'coop-connecting', text }));
  }
  override onBack(): boolean {
    this.cancelled = true;
    return false;
  }
}

export let current: CoopController | null = null;

async function connect(app: App, api: CoopApi, code: string, role: 'host' | 'client'): Promise<void> {
  if (isOffline()) {
    app.toasts.show('Offline - co-op unavailable', 'warn');
    return;
  }
  const wait = new ConnectingScreen(role === 'host' ? 'Opening room…' : `Joining ${code}…`);
  app.screens.push(wait);
  let transport: Transport;
  try {
    transport = await openTransport(code);
  } catch (e) {
    console.warn('coop transport failed', e);
    if (app.screens.top === wait) app.screens.pop();
    app.screens.push(new Dialog('Could not connect', 'Co-op signalling is unreachable. Check your connection and try again.', [{ label: 'OK', action: () => {}, primary: true }]));
    return;
  }
  if (wait.cancelled) {
    void transport.leave();
    return;
  }
  if (app.screens.top === wait) app.screens.pop();
  const session = new NetSession(transport, role, code, api.profile());
  const c = new CoopController(app, api, session);
  current = c;
  (window as unknown as { __coop?: CoopController }).__coop = c;
  c.showLobby();
  if (role === 'client') {
    setTimeout(() => {
      if (!session.hostId && current === c && !c.inGame) {
        void c.leave(false).then(() =>
          app.screens.push(new Dialog('No host found', `Nobody is hosting room ${code}. Check the code and that the host is still in the lobby.`, [{ label: 'OK', action: () => {}, primary: true }])),
        );
      }
    }, JOIN_TIMEOUT_MS);
  }
}

export function hostRoom(app: App, api: CoopApi): Promise<void> {
  return connect(app, api, makeRoomCode(), 'host');
}

export function joinRoom(app: App, api: CoopApi, code: string): Promise<void> {
  return connect(app, api, code, 'client');
}

/** Main menu entry point. */
export function openCoop(app: App, api: CoopApi): void {
  app.screens.push(new CoopScreen(app, api));
}

/** Share link entry point (?room=CODE). */
export function openJoinLink(app: App, api: CoopApi, raw: string): void {
  const code = normalizeRoomCode(raw);
  openCoop(app, api);
  if (code) void joinRoom(app, api, code);
  else app.screens.push(new JoinScreen(app, api));
}

