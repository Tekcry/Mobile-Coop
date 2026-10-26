import type { App } from '../core/app';
import type { WeatherChoice } from '../world/mapDef';
import type { GameOptions, GameState, SessionCallbacks } from '../game/gameState';
import { clearRejoin, rejoinToken, saveRejoin, type RejoinRecord } from '../core/rejoin';
import { flags } from '../core/flags';
import { visibleModes } from '../core/legacy';
import { h } from '../ui/dom';
import { MenuScreen, type LegendItem } from '../ui/menuScreen';
import { Osk } from '../ui/osk';
import { button, choice, describe, Dialog, lockedRow } from '../ui/widgets';
import { MAPS, getMap } from '../world/maps';
import { difficultyRows, DIFFICULTY_OPTS } from '../ui/difficultyRows';
import { MISSIONS, missionById } from '../game/missions';
import { capacity, CODE_ALPHABET, makeRoomCode, normalizeRoomCode, PROTOCOL_VERSION, type Difficulty, type NetMode, type PlayerInfo } from './protocol';
import { NetSession, resumeMap, roomMap, type LocalProfile, type StartInfo } from './session';
import type { Transport } from './transport';
import { createLocalTransport } from './localTransport';
import { createTrysteroTransport } from './trysteroTransport';
import { DIRECTORY_ROOM, DirectoryBrowser, DirectoryPoster, type ListedRoom, type RoomNotice } from './roomDirectory';
import { CoopHost } from './coopHost';
import { CoopClient } from './coopClient';
import { loadCourseRecord, startableBays, type CourseRecord } from '../save/courseRecord';
import { loadSectorRecord, starsOf, starsText, type SectorRecord } from '../save/sectorRecord';
import { courseAllBaysFlag } from '../game/modes/courseMode';
import { registeredBayCount } from '../game/course/courseDef';

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

/** (server browser) The shared directory room of public rooms, on the same relays (`?net=local`: this device). */
async function openDirectory(): Promise<Transport> {
  return flags.net === 'local' ? createLocalTransport(DIRECTORY_ROOM) : createTrysteroTransport(DIRECTORY_ROOM);
}

/** (server browser) The version a public room is listed under: only the same game and protocol see it. */
export const LISTED_VERSION = `${__APP_VERSION__}/p${PROTOCOL_VERSION}`;

export function shareLink(code: string): string {
  const u = new URL(location.href);
  u.search = '';
  u.searchParams.set('room', code);
  if (flags.net === 'local') u.searchParams.set('net', 'local');
  return u.toString();
}

/** (J14 F1, conformance R36) Why the host cannot start Course mode yet (the lobby's status and its Start button). */
export const COURSE_TWO_PLAYERS = 'Marlow Yard needs two players';
/**
 * (J14 F1, R36; Michael ~21:42 "Yes, everywhere now") The one "needs two players" check: Course mode (Marlow Yard in
 * the lobby) never starts with one player, on every build, live included; null when it may. No solo exception: the
 * dev-only `?course=solo` boots the course without the lobby and never reaches this. Mission-rules R4 widens it to the
 * campaign.
 */
export function courseStartBlock(mode: NetMode, players: number): string | null {
  return mode === 'course' && players < 2 ? COURSE_TWO_PLAYERS : null;
}

/**
 * Lives for one room: owns the session, swaps between lobby and match, and handles
 * host-left / match-ended transitions so screens stay simple.
 */
class CoopController {
  inGame = false;
  /** (marlow-bays R3) Client: the host dropped mid-match; the match stays up until a host reopens the room. */
  waiting = false;
  private lobby: LobbyScreen | null = null;
  private offs: (() => void)[] = [];
  private left = false;
  /** (R1) Refreshes the rejoin record while a match runs. */
  private recT: ReturnType<typeof setInterval> | null = null;
  /** (server browser) Host: the room is listed in Browse rooms (default Private). */
  isPublic = false;
  dir: DirectoryPoster | null = null;

  constructor(
    readonly app: App,
    readonly api: CoopApi,
    readonly session: NetSession,
  ) {
    const ev = session.events;
    this.offs.push(
      ev.on('start', (s) => this.start(s)),
      ev.on('hostLeft', () => this.hostLost()),
      ev.on('full', () => this.fail('Room full', 'That room already has its two players. Ask the host to free a slot, or host your own room.')),
      ev.on('lobby', () => {
        // (server browser) the player count changed: the notice now (a full room is taken off)
        this.dir?.post();
        // host went back to the lobby while we were still in the match
        if (!session.isHost && this.inGame && !this.waiting && session.phase === 'lobby') {
          this.app.toasts.show('Host ended the match');
          this.backToLobby();
        }
      }),
    );
  }

  /** (server browser) The room's notice now: null when not listed (private, full, left). */
  private notice(): RoomNotice | null {
    const s = this.session;
    if (!this.isPublic || this.left || !s.isHost) return null;
    const players = [...s.players.values()].filter((p) => !p.away).length;
    const cap = capacity(s.mode);
    if (s.players.size >= cap) return null;
    return { code: s.code, map: s.map, mode: s.mode, v: LISTED_VERSION, players, cap, host: s.players.get(s.selfId)?.name ?? 'Operator' };
  }

  /** (server browser) Host: list the room in Browse rooms, or take it off. */
  setPublic(on: boolean): Promise<void> {
    if (!this.session.isHost || this.left) return Promise.resolve();
    this.isPublic = on;
    return this.syncDir();
  }

  private dirBusy: Promise<void> | null = null;

  /** (server browser) One directory open or close at a time (Trystero shares one room per id), until the poster matches
   *  `isPublic` (fast toggles and a leave mid-open end right). */
  private syncDir(): Promise<void> {
    if (this.dirBusy) return this.dirBusy;
    const run = async (): Promise<void> => {
      for (;;) {
        const want = this.isPublic && !this.left;
        if (want && !this.dir) {
          let t: Transport;
          try {
            t = await openDirectory();
          } catch {
            this.isPublic = false;
            this.app.toasts.show('Could not reach the room list', 'warn');
            this.lobby?.el.querySelectorAll('.row-choice').forEach((r) => r.dispatchEvent(new Event('widget-refresh')));
            return;
          }
          if (this.isPublic && !this.left) this.dir = new DirectoryPoster(t, () => this.notice());
          else await t.leave().catch(() => {});
        } else if (!want && this.dir) {
          const d = this.dir;
          this.dir = null;
          await d.close();
        } else return;
      }
    };
    this.dirBusy = run().finally(() => (this.dirBusy = null));
    return this.dirBusy;
  }

  showLobby(): void {
    this.lobby = new LobbyScreen(this);
    this.app.screens.push(this.lobby);
  }

  /** The running match, if this room has one on screen. */
  private game(): GameState | null {
    const g = this.app.current as GameState | null;
    return this.inGame && g && 'isEnded' in g && g.net ? g : null;
  }

  /**
   * (marlow-bays R3) The host left or dropped. In the lobby the room is gone (as before); in a match the joiner waits on
   * the code for the host to reopen it ("Resume hosting"), which restarts the match from its last checkpoint here too.
   */
  private hostLost(): void {
    if (!this.inGame) {
      this.fail('Host left', 'The host closed the room or the connection dropped. Rejoin with the same code if the host is still there.');
      return;
    }
    if (this.waiting) return;
    this.waiting = true;
    this.game()?.hud.setNetNotice(`Host disconnected - waiting (${this.session.code})`);
    this.app.toasts.show(`Host disconnected. Waiting for them to resume room ${this.session.code}.`, 'warn');
  }

  /** (R1) The record the main menu reads: refreshed every 2 s while a match runs; gone once it ends. */
  private record(): void {
    const g = this.game();
    if (!g) return;
    if (g.isEnded) {
      clearRejoin();
      return;
    }
    const s = this.session;
    const r: RejoinRecord = { code: s.code, role: s.role, at: Date.now(), mode: s.mode, map: s.map, difficulty: s.difficulty, mission: s.mission, weather: s.weather, bay: g.mode?.resumeBay?.() ?? s.courseBay };
    saveRejoin(r);
  }

  private start(s: StartInfo): void {
    if (this.left) return;
    // (R3) a host that reopened the room starts the match again from its checkpoint: the waiting joiner reloads it
    if (this.inGame && !this.waiting) return;
    this.waiting = false;
    this.inGame = true;
    if (!this.recT) this.recT = setInterval(() => this.record(), 2000);
    const session = this.session;
    const mission = s.mode === 'infiltration' ? missionById(s.mission) : null;
    const map = getMap(mission?.map ?? s.map);
    this.api.startGame(
      {
        map,
        mode: s.mode,
        seed: s.seed,
        difficulty: s.difficulty,
        missionId: mission?.id,
        weather: map.weathers?.includes(s.weather) ? s.weather : undefined,
        courseBay: s.mode === 'course' ? (s.bay ?? 1) : undefined,
        net: {
          role: session.role,
          code: session.code,
          attach: (g) => (session.isHost ? new CoopHost(g, session) : new CoopClient(g, session)),
        },
      },
      { quit: () => void this.leave(), restart: () => this.backToLobby(), lobby: () => this.backToLobby() },
    );
  }

  backToLobby(): void {
    if (this.left) return;
    this.inGame = false;
    this.waiting = false;
    this.stopRecord();
    clearRejoin();
    if (this.session.isHost) this.session.backToLobby();
    this.api.goToMenu();
    this.showLobby();
  }

  private fail(title: string, msg: string): void {
    if (this.left) return;
    void this.leave(false);
    this.app.screens.push(new Dialog(title, msg, [{ label: 'OK', action: () => {}, primary: true }]));
  }

  private stopRecord(): void {
    if (this.recT) clearInterval(this.recT);
    this.recT = null;
  }

  async leave(toMenu = true): Promise<void> {
    if (this.left) return;
    // (R1) leaving a running match keeps its record: the main menu offers the room again for the hold
    this.record();
    this.stopRecord();
    this.left = true;
    // (server browser) off the list
    void this.syncDir();
    for (const o of this.offs) o();
    await this.session.leave(this.session.isHost ? 'Host left' : 'left');
    if (toMenu || this.inGame) this.api.goToMenu();
    else if (this.lobby && this.app.screens.top === this.lobby) this.app.screens.pop();
    this.inGame = false;
  }
}

/** Entry screen: host or join, or the offline notice (menu-ui step 09). */
class CoopScreen extends MenuScreen {
  private list: HTMLElement;

  constructor(
    private app: App,
    private api: CoopApi,
  ) {
    super('coop-screen', ['Co-op', 'Lobby']);
    this.list = h('div', { class: 'menu-list ms-list coop-rows', attrs: { 'data-wrap': '' } });
    this.body.append(this.list);
    this.build();
  }

  override onShow(): void {
    this.build();
    this.app.nav.setRoot(this.el, null);
  }

  private item(label: string, key: string, ctx: string, fn: () => void, autofocus = false): HTMLElement {
    const b = button(label, fn, { class: 'menu-item ms-item', autofocus, key });
    b.dataset.ctx = `<p>${ctx}</p>`;
    return b;
  }

  private build(): void {
    if (isOffline()) {
      this.list.replaceChildren(
        h('div', { class: 'coop-offline' }, h('b', { text: 'Offline' }), h('span', { text: 'Co-op needs an internet connection. Single player works fully offline.' })),
        this.item('Retry', 'retry', 'Check the connection again.', () => this.build(), true),
      );
      return;
    }
    this.list.replaceChildren(
      this.item('Host a room', 'host', 'Open a room for one other player. You choose the mission and difficulty; the room code appears in the lobby.', () => void hostRoom(this.app, this.api), true),
      this.item('Join with code', 'join', 'Enter the five character code the host shows in their lobby.', () => this.app.screens.push(new JoinScreen(this.app, this.api))),
      this.item('Browse rooms', 'browse', 'Public rooms of this version, live. Pick one to join it by its code.', () => this.app.screens.push(new BrowseScreen(this.app, this.api))),
    );
  }
}

/** Controller-friendly code entry: the on-screen keyboard (menu-ui MD3) plus typing on a keyboard. */
class JoinScreen extends MenuScreen {
  private code = '';
  private slots: HTMLElement[] = [];
  private osk: Osk;

  constructor(
    private app: App,
    private api: CoopApi,
    initial = '',
  ) {
    super('coop-screen join-screen', ['Join', 'Room']);
    const disp = h('div', { class: 'code-display' });
    for (let i = 0; i < 5; i++) {
      const s = h('span', { class: 'code-slot' });
      this.slots.push(s);
      disp.append(s);
    }
    this.osk = new Osk({
      chars: CODE_ALPHABET,
      cols: 8,
      maxLen: 5,
      doneLabel: 'Join',
      get: () => this.code,
      onChange: (v) => {
        this.code = v;
        this.render();
      },
      onDone: () => this.join(),
      onCancel: () => this.manager.back(this),
      onReject: (r) => this.app.toasts.show(r, 'warn'),
    });
    this.body.append(h('div', { class: 'join-note', text: 'Room codes have 5 characters' }), disp, this.osk.el);
    for (const ch of initial) this.osk.type(ch);
    this.render();
  }

  override legend(): LegendItem[] {
    return [
      { act: 'back', label: 'Back' },
      { act: 'confirm', label: 'Type', keys: 'A-Z' },
      { act: 'x', label: 'Delete', keys: 'Bksp' },
      { act: 'start', label: 'Join', keys: 'Enter' },
    ];
  }

  override onX(): void {
    this.osk.del();
  }

  override onStart(): void {
    this.join();
  }

  override onShow(): void {
    this.osk.attach(true);
  }

  override onHide(): void {
    this.osk.attach(false);
  }

  private render(): void {
    this.slots.forEach((s, i) => {
      s.textContent = this.code[i] ?? '';
      s.classList.toggle('next', i === this.code.length);
    });
  }

  private join(): void {
    const code = normalizeRoomCode(this.code);
    if (!code) {
      this.app.toasts.show('Room codes have 5 characters', 'warn');
      return;
    }
    void joinRoom(this.app, this.api, code);
  }
}

const MODE_OPTS: { value: NetMode; label: string }[] = [
  { value: 'course', label: 'Campaign' },
  { value: 'sector', label: 'Sector Ops' },
  { value: 'clear', label: 'Hunter' },
  { value: 'infiltration', label: 'Infiltration' },
  { value: 'sandbox', label: 'Free Roam' },
];
/** The campaign's first (and for now only) level: Marlow Yard in Course mode (sector-ops M1). */
const CAMPAIGN_MAP = 'ctcourse';
/**
 * (sector-ops slice 3) The campaign and Sector Ops; Hunter, Infiltration and Free Roam only with `?legacy=1` (the mode
 * already set stays listed).
 */
function lobbyModes(current: NetMode): typeof MODE_OPTS {
  const shown = flags.legacy ? visibleModes(MODE_OPTS, true) : MODE_OPTS.filter((m) => m.value === 'course' || m.value === 'sector');
  const cur = MODE_OPTS.find((m) => m.value === current);
  return cur && !shown.includes(cur) ? [...shown, cur] : shown;
}
/**
 * The maps the host can pick for a mode: the campaign is Marlow Yard only (the course lab and bunker with `?legacy=1`).
 * (J14 R1 fix 8) With `?marlowreplan=1` that is the re-planned yard (`roomMap`), so it is offered and named once.
 */
function lobbyMaps(mode: NetMode): typeof MAPS {
  const all = MAPS.filter((m) => m.modes.includes(mode));
  if (mode !== 'course' || flags.legacy) return all;
  const campaign = roomMap(CAMPAIGN_MAP);
  return all.filter((m) => m.id === campaign);
}
const WEATHER_LABEL: Record<WeatherChoice, string> = { clear: 'Clear', rain: 'Rain', fog: 'Fog' };
const MISSION_OPTS = MISSIONS.map((m) => ({ value: m.id, label: m.name }));

class LobbyScreen extends MenuScreen {
  private list: HTMLElement;
  private status: HTMLElement;
  private opts: HTMLElement;
  private actions: HTMLElement;
  private head: HTMLElement;
  private off: (() => void)[] = [];
  private known = new Set<string>();

  constructor(private c: CoopController) {
    super('coop-screen lobby-screen', ['Co-op', 'Lobby']);
    const s = c.session;
    this.head = h('div', { class: 'screen-title lobby-head', text: `Room ${s.code}` });
    this.status = h('div', { class: 'row-note lobby-status' });
    this.list = h('div', { class: 'lobby-players' });
    this.opts = h('div', { class: 'lobby-opts' });
    this.actions = h('div', { class: 'lobby-actions' });
    this.body.append(this.head, this.list, this.status, h('div', { class: 'rows ms-rows lobby-rows', attrs: { 'data-wrap': '' } }, this.opts, this.actions));
    this.buildOpts();
    this.buildActions();
    this.renderPlayers();
  }

  override legend(): LegendItem[] {
    return [
      { act: 'back', label: 'Leave' },
      { act: 'confirm', label: 'Select' },
      { act: 'y', label: 'Share code' },
    ];
  }

  override onAlt(): void {
    void this.share();
  }

  override initialFocus(): HTMLElement | null {
    return this.actions.querySelector('[data-autofocus]') as HTMLElement | null;
  }

  override onShow(): void {
    // back from a course's results: read the course record again (the bays just finished are offered, D20)
    if (this.courseRec !== undefined) this.courseRec = null;
    if (this.c.session.isHost && this.c.session.mode === 'course') this.buildOpts();
    const ev = this.c.session.events;
    this.known = new Set(this.c.session.players.keys());
    this.off.push(
      ev.on('lobby', () => {
        this.toastJoined();
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

  private toastJoined(): void {
    const s = this.c.session;
    for (const p of s.players.values()) {
      if (!this.known.has(p.id) && p.id !== s.selfId) this.c.app.toasts.show(`${p.name} joined`, 'ok');
    }
    this.known = new Set(s.players.keys());
  }

  override onBack(): boolean {
    this.c.app.screens.push(
      new Dialog('Leave room?', this.c.session.isHost ? 'Everyone in the room will be disconnected.' : 'You can rejoin with the same code.', [
        { label: 'Stay', action: () => {}, safe: true },
        { label: 'Leave', action: () => void this.c.leave(false), primary: true },
      ]),
    );
    return true;
  }

  private renderPlayers(): void {
    const s = this.c.session;
    const ps = [...s.players.values()].sort((a, b) => Number(b.host) - Number(a.host));
    // (G2) two players: two slots, whatever the mode's wire cap is
    const slots = Math.max(2, ps.length);
    const hostName = ps.find((p) => p.host)?.name ?? '';
    this.head.textContent = `Room ${s.code} · ${s.isHost ? 'you host' : hostName ? `host: ${hostName}` : 'connecting'}`;
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
      ...Array.from({ length: Math.max(0, slots - ps.length) }, () => h('div', { class: 'lobby-player empty', text: 'Open slot' })),
    );
    const cap = capacity(s.mode);
    if (!s.hostId) this.status.textContent = 'Connecting to host…';
    else if (s.overCapacity) this.status.textContent = `${MODE_OPTS.find((m) => m.value === s.mode)?.label} takes ${cap} players - pick another mode or wait for someone to leave.`;
    else if (s.isHost) this.status.textContent = ps.length < 2 ? `${courseStartBlock(s.mode, ps.length) ? `${COURSE_TWO_PLAYERS}. ` : ''}Share the code to invite your partner.` : s.allReady ? 'Everyone is ready.' : 'Waiting for players to ready up.';
    else this.status.textContent = s.phase === 'playing' ? 'Match in progress - joining…' : 'Waiting for the host to start.';
  }

  private buildOpts(): void {
    const s = this.c.session;
    const maps = MAPS.filter((m) => m.modes.includes(s.mode));
    const infil = s.mode === 'infiltration';
    if (!s.isHost) {
      const map = MAPS.find((m) => m.id === s.map);
      const lr = (k: string, v: string): HTMLElement => lockedRow(k, v, 'Set by the host.', `The host chooses the ${k.toLowerCase()}.`);
      this.opts.replaceChildren(
        lr('Mode', MODE_OPTS.find((m) => m.value === s.mode)?.label ?? ''),
        infil ? lr('Mission', missionById(s.mission)?.name ?? '') : lr('Map', map?.name ?? s.map),
        lr('Difficulty', DIFFICULTY_OPTS.find((d) => d.value === s.difficulty)?.label ?? ''),
        ...(map?.weathers ? [lr('Weather', WEATHER_LABEL[s.weather])] : []),
      );
      return;
    }
    if (infil) {
      const m = missionById(s.mission) ?? MISSIONS[0]!;
      if (s.mission !== m.id || s.map !== m.map) s.setSettings(s.mode, m.map, s.difficulty, m.id);
    } else if (!maps.some((m) => m.id === s.map)) s.setSettings(s.mode, (lobbyMaps(s.mode)[0] ?? maps[0]!).id, s.difficulty);
    // the host's pick (a map already set that the list leaves out, by a test or a dev tab, stays listed)
    const cur = maps.find((m) => m.id === s.map);
    const pick = lobbyMaps(s.mode);
    const shownMaps = cur && !pick.includes(cur) ? [...pick, cur] : pick;
    const set = (mode: NetMode, map: string, d: Difficulty, mission = s.mission): void => {
      s.setSettings(mode, map, d, mission);
      const idx = Array.from(this.opts.children).indexOf(this.c.app.nav.focused as HTMLElement);
      this.buildOpts();
      this.renderPlayers();
      this.buildActions(true);
      const el = this.opts.children[Math.max(0, idx)] as HTMLElement | undefined;
      if (idx >= 0) this.c.app.nav.setRoot(this.el, el ?? null);
    };
    this.opts.replaceChildren(
      choice('Mode', lobbyModes(s.mode), () => s.mode, (v) => set(v, MAPS.find((m) => m.id === s.map)?.modes.includes(v) ? s.map : (lobbyMaps(v)[0]?.id ?? s.map), s.difficulty, v === 'infiltration' ? (s.mission || MISSIONS[0]!.id) : '')),
      infil
        ? choice('Mission', MISSION_OPTS, () => s.mission, (v) => set(s.mode, missionById(v)?.map ?? s.map, s.difficulty, v))
        : choice('Map', shownMaps.map((m) => ({ value: m.id, label: this.mapLabel(m.id, m.name) })), () => s.map, (v) => set(s.mode, v, s.difficulty)),
      // the host's difficulty row updates in place (no rebuild)
      ...difficultyRows(
        () => s.difficulty,
        (v) => s.setSettings(s.mode, s.map, v),
        () => this.renderPlayers(),
      ),
      ...(MAPS.find((m) => m.id === s.map)?.weathers
        ? [
            choice(
              'Weather',
              (MAPS.find((m) => m.id === s.map)!.weathers ?? []).map((w) => ({ value: w, label: WEATHER_LABEL[w] })),
              () => s.weather,
              (v) => {
                s.setSettings(s.mode, s.map, s.difficulty, s.mission, v);
                this.renderPlayers();
              },
            ),
          ]
        : []),
      ...(s.mode === 'course' ? [this.bayChoice()] : []),
      // (server browser) listed in Browse rooms or not (default Private: only the code brings anyone in)
      choice(
        'Room',
        [
          { value: 'private', label: 'Private' },
          { value: 'public', label: 'Public' },
        ],
        () => (this.c.isPublic ? 'public' : 'private'),
        (v) => void this.c.setPublic(v === 'public'),
      ),
    );
    // the host's rows describe themselves in the context panel
    for (const r of Array.from(this.opts.children) as HTMLElement[]) {
      const label = r.querySelector('.row-label')?.textContent ?? '';
      if (label === 'Room') describe(r, label, 'Private: only players with the code can join. Public: the room is listed under Co-op > Browse rooms until it is full.');
      else describe(r, label, `Choose the ${label.toLowerCase()}. The other player sees it but cannot change it.`);
    }
  }

  /** Course mode: "Start at bay N" for the bays in the host's course record (every bay with the dev flag; D20, C9). */
  private bayChoice(): HTMLElement {
    const s = this.c.session;
    if (this.courseRec === null) {
      this.courseRec = undefined;
      void loadCourseRecord().then((r) => {
        this.courseRec = r;
        if (this.c.session.mode === 'course') this.buildOpts();
      });
    }
    const entry = this.courseRec?.courses[s.map];
    // (marlow-final N8) the dev flag offers the course's own bays (its registered definition), not an assumed 9
    const bays = startableBays(entry, courseAllBaysFlag(), courseAllBaysFlag() ? registeredBayCount(s.map) : 0);
    if (!bays.includes(s.courseBay)) s.courseBay = 1;
    return choice('Start at', bays.map((n) => ({ value: String(n), label: n === 1 ? 'Bay 1' : `Bay ${n}${entry?.bays[n - 1] ? ` (${entry.bays[n - 1]})` : ''}` })), () => String(s.courseBay), (v) => {
      s.courseBay = Number(v) || 1;
    });
  }
  /** (sector-ops M7) Sector Ops: the host's map row shows each op's difficulty stars (the host's record). */
  private mapLabel(id: string, name: string): string {
    if (this.c.session.mode !== 'sector') return name;
    if (this.sectorRec === null) {
      this.sectorRec = undefined;
      void loadSectorRecord().then((r) => {
        this.sectorRec = r;
        if (this.c.session.mode === 'sector') this.buildOpts();
      });
    }
    return this.sectorRec ? `${name}  ${starsText(starsOf(this.sectorRec, id))}` : name;
  }
  /** The host's Sector Ops record (null: not read yet; undefined: loading). */
  private sectorRec: SectorRecord | null | undefined = null;
  /** The host's course record (null: not read yet; undefined: loading). */
  private courseRec: CourseRecord | null | undefined = null;

  private buildActions(keepFocus = false): void {
    const s = this.c.session;
    let focusedIdx = keepFocus ? Array.from(this.actions.children).indexOf(this.c.app.nav.focused as HTMLElement) : -1;
    // the main button was disabled while connecting: move focus onto it once usable
    if ((this.actions.firstChild as HTMLButtonElement | null)?.disabled) focusedIdx = 0;
    const share = button('Share code', () => void this.share(), { icon: 'wifi', desc: 'Copies an invite link with the room code. The other player can also type the code under Join with code.' });
    const leave = button('Leave', () => this.onBack(), { icon: 'back', desc: 'Leave the room.' });
    let main: HTMLElement;
    if (s.isHost) {
      const solo = s.players.size < 2;
      main = button('Start mission', () => s.startMatch(), {
        icon: 'play',
        class: 'primary big',
        autofocus: true,
        key: 'start',
        desc: 'Start the mission for everyone in the room.',
        // (J14 F1, R36) Course mode needs two players
        blocked: s.overCapacity ? `Too many players for this mode (${capacity(s.mode)})` : (courseStartBlock(s.mode, s.players.size) ?? (!solo && !s.allReady ? 'Waiting for players to ready up' : undefined)),
      });
    } else {
      const me = s.players.get(s.selfId);
      main = button(me?.ready ? 'Not ready' : 'Ready', () => s.setReady(!me?.ready), {
        icon: 'play',
        class: me?.ready ? 'big' : 'primary big',
        autofocus: true,
        key: 'ready',
        desc: 'Tell the host you are ready. The host starts the mission once everyone is.',
      });
      if (!s.hostId) (main as HTMLButtonElement).disabled = true;
    }
    this.actions.replaceChildren(main, share, leave);
    if (focusedIdx >= 0) this.c.app.nav.setRoot(this.el, (this.actions.children[focusedIdx] as HTMLElement) ?? null);
  }

  private async share(): Promise<void> {
    const link = shareLink(this.c.session.code);
    const nav = navigator as Navigator & { share?: (d: { title: string; url: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: 'Night Shift co-op', url: link });
      else {
        await navigator.clipboard.writeText(link);
        this.c.app.toasts.show('Invite link copied', 'ok');
      }
    } catch {
      this.c.app.toasts.show(`Code: ${this.c.session.code}`);
    }
  }

}

/** (server browser) Co-op > Browse rooms: the public rooms of this version, live; a pick joins by the code. */
class BrowseScreen extends MenuScreen {
  private list: HTMLElement;
  private browser: DirectoryBrowser | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;
  private opening = false;

  constructor(
    private app: App,
    private api: CoopApi,
  ) {
    super('coop-screen browse-screen', ['Browse', 'Rooms']);
    this.list = h('div', { class: 'menu-list ms-list browse-rows', attrs: { 'data-wrap': '' } });
    this.body.append(h('div', { class: 'join-note', text: 'Public rooms of this version. Rooms list themselves when the host sets Room: Public.' }), this.list);
    this.render();
  }

  override onShow(): void {
    this.render();
    if (!this.browser && !this.opening) void this.open();
    if (this.tick) clearInterval(this.tick);
    this.tick = setInterval(() => this.render(), 5000);
  }

  override onHide(): void {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
    const b = this.browser;
    this.browser = null;
    void b?.close();
  }

  private async open(): Promise<void> {
    this.opening = true;
    let t: Transport;
    try {
      t = await openDirectory();
    } catch {
      this.opening = false;
      this.app.toasts.show('Could not reach the room list', 'warn');
      return;
    }
    this.opening = false;
    // left before the list opened
    if (this.manager.top !== this) {
      void t.leave();
      return;
    }
    this.browser = new DirectoryBrowser(t, LISTED_VERSION);
    this.browser.onChange = () => this.render();
    this.render();
  }

  /** A pick: off the directory first (it reopens if the join comes back here), then join by the code. */
  private join(code: string): void {
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
    const b = this.browser;
    this.browser = null;
    void b?.close();
    void joinRoom(this.app, this.api, code);
  }

  private row(r: ListedRoom): HTMLElement {
    const map = MAPS.find((m) => m.id === r.map)?.name ?? r.map;
    const mode = MODE_OPTS.find((m) => m.value === r.mode)?.label ?? r.mode;
    const b = button(`${r.code} · ${map}`, () => this.join(r.code), { class: 'menu-item ms-item', key: `room-${r.code}`, sub: `${mode} · host ${r.host}` });
    b.append(h('span', { class: 'ms-ctr', text: `${r.players} / ${r.cap}` }));
    b.dataset.ctx = `<p>Join ${r.host}'s room ${r.code} (${map}, ${mode}).</p>`;
    return b;
  }

  private render(): void {
    const rooms = this.browser?.list() ?? [];
    const keep = (this.app.nav.focused as HTMLElement | null)?.dataset.key ?? null;
    const rows = rooms.map((r) => this.row(r));
    if (!rows.length) {
      const empty = button(this.browser ? 'No public rooms yet' : 'Looking for rooms…', () => {}, { class: 'menu-item ms-item', key: 'none' });
      empty.dataset.ctx = '<p>Rooms appear here live when a host of this version sets Room: Public.</p>';
      rows.push(empty);
    }
    this.list.replaceChildren(...rows);
    if (this.manager?.top === this) {
      const again = keep ? this.list.querySelector<HTMLElement>(`[data-key="${keep}"]`) : null;
      this.app.nav.setRoot(this.el, again ?? (this.list.firstElementChild as HTMLElement | null));
    }
  }
}

/** Shown while the transport connects (WebRTC signalling can take a few seconds). */
class ConnectingScreen extends MenuScreen {
  cancelled = false;
  constructor(text: string) {
    super('coop-screen connecting-screen', ['Co-op', 'Lobby']);
    const cancel = button('Cancel', () => this.manager.back(this), { class: 'menu-item ms-item', autofocus: true, key: 'cancel' });
    this.body.append(h('div', { class: 'coop-connecting', text }), h('div', { class: 'menu-list ms-list' }, cancel));
  }
  override onBack(): boolean {
    this.cancelled = true;
    return false;
  }
}

export let current: CoopController | null = null;

async function connect(app: App, api: CoopApi, code: string, role: 'host' | 'client', resume: RejoinRecord | null = null): Promise<void> {
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
  const session = new NetSession(transport, role, code, api.profile(), role === 'client' ? rejoinToken(code) : '');
  if (role === 'host' && resume) {
    // (marlow-bays R3) "Resume hosting": the same room, the same match, from its last checkpoint; the joiner (waiting on
    // the code, or rejoining from its menu) takes the match as it starts
    // (set directly: a lobby broadcast before the start would send a waiting joiner to the lobby)
    session.mode = resume.mode;
    // (J14 R1 fix 8) a record on the re-planned yard reopens on the built yard with the flag off here
    session.map = resumeMap(resume.map);
    session.difficulty = resume.difficulty;
    session.mission = resume.mode === 'infiltration' ? resume.mission : '';
    session.weather = resume.weather;
    session.courseBay = resume.bay;
    adopt(app, api, session);
    session.startMatch();
    return;
  }
  // a new room starts on the campaign, Marlow Yard in Course mode (sector-ops slice 3); `?legacy=1` keeps the parked Hunter
  if (role === 'host') {
    if (flags.legacy) session.setSettings('clear', 'warehouse', session.difficulty);
    else session.setSettings('course', CAMPAIGN_MAP, session.difficulty, '');
  }
  const c = adopt(app, api, session);
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

/** The room's controller and lobby for a connected session. */
function adopt(app: App, api: CoopApi, session: NetSession): CoopController {
  const c = new CoopController(app, api, session);
  current = c;
  (window as unknown as { __coop?: CoopController }).__coop = c;
  c.showLobby();
  return c;
}

/** `?net=local` autostart: how long a new tab listens for a host's lobby before it hosts itself (ms). */
const AUTO_PROBE_MS = 1500;

/** The fixed room code of a map's `?net=local` autostart room (every tab with the same URL finds the same room). */
export function autoRoomCode(map: string): string {
  let h = 2166136261;
  for (let i = 0; i < map.length; i++) h = Math.imul(h ^ map.charCodeAt(i), 16777619) >>> 0;
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += CODE_ALPHABET[h % CODE_ALPHABET.length]!;
    h = Math.floor(h / CODE_ALPHABET.length) + 7919 * (i + 1);
  }
  return s;
}

/**
 * `?net=local&autostart=<map>&mode=course` (dev builds and tests, same-device tabs only): the first tab hosts the map's
 * fixed room with Course mode set, every later tab joins it and readies; the host starts the course once a partner is
 * in and everyone is ready (once: a later match starts from the lobby as usual).
 */
export async function autoLocalCourse(app: App, api: CoopApi, map: string, mode: 'course' | 'sector' = 'course'): Promise<void> {
  const code = autoRoomCode(map);
  // a client session hears an open room's lobby (the host answers its hello) within the probe window
  const probe = new NetSession(createLocalTransport(roomId(code)), 'client', code, api.profile(), rejoinToken(code));
  let full = false;
  probe.events.on('full', () => (full = true));
  await new Promise((r) => setTimeout(r, AUTO_PROBE_MS));
  if (full) {
    await probe.leave();
    app.screens.push(new Dialog('Room full', `The local course room ${code} already has its players.`, [{ label: 'OK', action: () => {}, primary: true }]));
    return;
  }
  if (probe.hostId) {
    adopt(app, api, probe);
    probe.setReady(true);
    return;
  }
  await probe.leave();
  const session = new NetSession(createLocalTransport(roomId(code)), 'host', code, api.profile());
  session.setSettings(mode, map, session.difficulty, '');
  adopt(app, api, session);
  const off = session.events.on('lobby', () => {
    if (session.phase !== 'lobby' || session.players.size < 2 || !session.allReady || session.overCapacity) return;
    off();
    // (after the lobby handler that announced the partner: the match starts on the next task)
    setTimeout(() => session.startMatch(), 0);
  });
}

export function hostRoom(app: App, api: CoopApi): Promise<void> {
  return connect(app, api, makeRoomCode(), 'host');
}

export function joinRoom(app: App, api: CoopApi, code: string): Promise<void> {
  return connect(app, api, code, 'client');
}

/** (marlow-bays R1-R3) The main menu's "Rejoin <code>" (joiner) / "Resume hosting <code>" (host). */
export function resumeRoom(app: App, api: CoopApi, r: RejoinRecord): Promise<void> {
  return r.role === 'host' ? connect(app, api, r.code, 'host', r) : joinRoom(app, api, r.code);
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

