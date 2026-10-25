import './styles.css';
import { BrightnessScreen } from './ui/screens/brightnessScreen';
import { WEAPON_IDS, type WeaponId } from './weapons/weaponDefs';
import { suitLook } from './progression/suit';
import { parseDifficulty } from './ai/archetypes';
import { MISSIONS, missionById } from './game/missions';
import './cosmetics/catalog';
import { App } from './core/app';
import { LOCO } from './anim/mocap';
import { loadHavok } from './physics/havok';
import { setupServiceWorker, suppressBrowserGestures } from './pwa/pwa';
import { flags } from './core/flags';
import { campaignUnlocked, showEconomy } from './core/legacy';
import { loadRejoin } from './core/rejoin';
import { MenuState } from './world/menuScene';
import { gateLimits } from './world/menuGate';
import { readyCapMs } from './game/mapGate';
import { IGNITE_S } from './world/menuShots';
import { MainMenuScreen } from './ui/screens/mainMenu';
import { TitleScreen } from './ui/screens/titleScreen';
import { SettingsScreen } from './ui/screens/settingsScreen';
import { GameState, type GameOptions, type SessionCallbacks } from './game/gameState';
import { getMap } from './world/maps';
import { courseSoloFlag } from './game/modes/courseMode';
import { requestPersistence } from './save/db';
import { PlayScreen } from './ui/screens/playScreen';
import { LoadoutScreen } from './ui/screens/loadoutScreen';
import { MissionsScreen, FreeRoamScreen, SectorOpsScreen } from './ui/screens/missionsScreen';
import { starsFor, starsText } from './save/sectorRecord';
import { BriefingScreen } from './ui/screens/briefingScreen';

/** (sector-ops M7) The Warehouse op's difficulty stars beside Sector Ops on the main menu, read each time it opens. */
let sectorStars = starsText([false, false, false, false]);

import { KitScreen } from './ui/screens/kitScreen';
import { showSavedOperator } from './ui/screens/operator';
import { profileBadge } from './ui/screens/profileBadge';
import { rewardsPanel } from './ui/screens/rewardsPanel';
import { dataTab } from './ui/screens/dataTab';
import { BENCH, benchPlan, type BenchSession } from './game/benchmark';
import { PRESET_IDS } from './core/quality';
import { feedbackContext, feedbackTab } from './ui/screens/feedbackScreen';
import { CrashLog } from './feedback/crashLog';
import { benchTag } from './ui/benchTag';
import { extraSettingsTabs } from './ui/screens/settingsScreen';
import { applySession, autoGrant, loadoutEntries, lobbyLoadout, type SessionReport } from './progression/profile';
import { camoById } from './cosmetics/catalog';

/** menu-ui MD2: the title screen shows once per launch; `?autostart` skips it, `?title=1` shows it under automation. */
let titleShown = !!flags.autostart;
const titleFlag = new URLSearchParams(location.search).get('title') === '1';

/** (menu-notes note 2) The menu's load screen: each goToMenu / match load counts up (a stale gate does not reveal), the
 *  first menu of the launch, and how long the gate waits before it shows the menu anyway (`gateLimits`: patient while
 *  bytes arrive, a stall or cap ends it so a failed load never strands the player; automation is short, `?bootCap=`). */
let bootGen = 0;
let menuShownOnce = false;
const bootLimits = gateLimits(location.search, !!navigator.webdriver);

function setBoot(progress: number, status: string): void {
  const bar = document.getElementById('boot-progress');
  const st = document.getElementById('boot-status');
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  if (st) st.textContent = status;
}

/** (menu-notes slice 4a, M2) The launch boot (wordmark only, then under the title) is over: later boots (a match load,
 *  the menu after a match) show the ghost, the progress line and the status again. */
function endLaunchBoot(): void {
  document.getElementById('boot')?.classList.remove('launch', 'under');
}

async function boot(): Promise<void> {
  // (M2) the wordmark-only boot is for a launch that shows the title; any other keeps the status lines
  if (titleShown || (navigator.webdriver && !titleFlag)) endLaunchBoot();
  suppressBrowserGestures();

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const app = new App(canvas);
  // (sw-reload) a new deploy applies only on the title / main menu, never mid-match or in a co-op lobby
  setupServiceWorker({
    onReady: () => app.toasts.show('Ready to play offline', 'ok'),
    probe: () => ({
      menuState: app.current instanceof MenuState,
      booting: app.bootHold,
      topClasses: [...(app.screens.top?.el.classList ?? [])],
      coopOpen: !!document.querySelector('.coop-screen'),
    }),
    onDeferred: () => app.toasts.show('Update ready - restarts at the menu', 'info', 4000),
  });
  (window as unknown as { __app: App }).__app = app;
  // tests: the bundled mission definitions
  (window as unknown as { __missions: typeof MISSIONS }).__missions = MISSIONS;
  // tests (mocap-trial M1): whether the mocap locomotion switch is on for this page (`?mocap=` over the setting), read-only
  (window as unknown as { __mocapOn: () => boolean }).__mocapOn = () => LOCO.mocap;

  setBoot(0.15, 'Loading settings…');
  await app.loadSettings();
  setBoot(0.25, 'Loading profile…');
  app.save.openLoadout = campaignUnlocked(flags.legacy);
  await app.save.load();
  app.save.update((d) => void autoGrant(d));
  extraSettingsTabs.push(feedbackTab, dataTab);
  // 3.1.4 crash log: the last session's heartbeat still "alive" = it died while open (a note), then a new heartbeat
  const crashLog = new CrashLog(() => feedbackContext(app));
  app.crashLog = crashLog;
  void crashLog.recover((e) => app.feedback.save(e)).then((note) => {
    if (note) app.toasts.show('The last session crashed: a report is in Settings > Feedback', 'warn');
    crashLog.start();
  });
  GameState.rewardHook = async (stats, opts) => {
    let report: SessionReport | null = null;
    app.save.update((d) => void (report = applySession(d, stats, opts.difficulty ?? 'normal')));
    await app.save.flush();
    if (report && (report as SessionReport).levelUps > 0) setTimeout(() => app.sfx.levelUp(), 600);
    // (3.5: progression still records; the credits / XP panel is shown only with `?legacy=1`)
    return report && showEconomy(flags.legacy) ? rewardsPanel(report) : null;
  };
  if (flags.debug) app.debug.toggle(true);
  void requestPersistence();

  setBoot(0.35, 'Loading physics…');
  await loadHavok();
  setBoot(0.8, 'Building scene…');

  const goToMenu = (): void => {
    app.screens.clear();
    // (menu-notes note 2) the boot screen stays up until the menu stage is ready to be seen: Wren's close-up LOD loaded
    // and drawn, the weapons in, the first shot's shaders compiled (MenuState.prepare). After a match too.
    const gen = ++bootGen;
    const first = !menuShownOnce;
    menuShownOnce = true;
    const base = first ? 0.8 : 0.1;
    const bootEl = document.getElementById('boot');
    bootEl?.classList.remove('done');
    setBoot(base, 'Loading Wren…');
    app.bootHold = true;
    // (the mission's music fades now; the menu theme decodes during the load and starts as the menu appears)
    if (app.music.state !== 'menu') app.music.stop();
    app.music.preloadMenu();
    // (the match freed before the menu stage is built: its shaders are released with it)
    app.releaseState();
    const ms = new MenuState(app.engine);
    app.setState(ms);
    // (menu-ui slice 6) the cinematic background follows the screen on top: the title holds S1, the lobby keeps the stage
    ms.screenContext = () => {
      const c = app.screens.top?.el.classList;
      // (menu-notes slice 4c) the title pressed (`ts-seq`) reads as the main menu: the goggle strikes while it stays on top
      return c?.contains('title-screen') ? (c.contains('ts-seq') ? 'main' : 'title') : c?.contains('lobby-screen') ? 'lobby' : 'main';
    };
    showSavedOperator(app);
    app.onAvatarStyle = () => {
      // (a new avatar style rebuilds the same request: clear what the preview remembers)
      if (app.current === ms) {
        ms.forget();
        showSavedOperator(app);
      }
    };
    app.crashLog?.stage('menu');
    const menu = new MainMenuScreen(app);
    // (menu-ui MD19: the profile badge only with `?legacy=1`)
    if (flags.legacy) menu.badge.append(profileBadge(app));
    app.screens.push(menu);
    void app.feedback.all().then((all) => menu.setCounter('feedback', all.length ? `${all.length}` : ''));
    void starsFor('warehouseOps').then((st) => {
      sectorStars = starsText(st);
      menu.setCounter('sectorops', sectorStars);
    });
    // menu-ui MD2: the title screen once per launch (not after a match, not under automation unless `?title=1`); Back
    // on the main menu no longer returns to it (menu-notes A1). The brightness calibration follows the title on the
    // first run.
    const brightness = (): void => {
      if (!app.settings.get().video.brightnessSet && !navigator.webdriver && app.screens.top === menu) app.screens.push(new BrightnessScreen(app));
    };
    const titleAllowed = !navigator.webdriver || titleFlag;
    // music project: `?musiclab=1` opens the lab over the menu (debug)
    if (flags.musicLab) void import('./audio/music/musicLab').then((m) => app.screens.push(new m.MusicLabScreen(app)));
    if (flags.foleyLab) void import('./audio/foley/foleyLab').then((m) => app.screens.push(new m.FoleyLabScreen(app)));
    if (flags.weaponLab) void import('./audio/weapons/weaponLab').then((m) => app.screens.push(new m.WeaponLabScreen(app)));
    // 3.6 Step 4b: the brightness calibration, once after the update (skippable; never under automation)
    let title: TitleScreen | null = null;
    if (titleAllowed && !titleShown) {
      titleShown = true;
      // (menu-notes slice 4c, M3) the press: the title's prompt and wordmark fade out and it stays on top (black, no menu,
      // taking every input) while the goggle strikes; the main menu fades in under it over the last of the light rise,
      // then the title pops. A second press skips to the lit menu (A3). The music is untouched (it starts on the press).
      let unsub: (() => void) | null = null;
      const revealMenu = (fadeS: number): void => {
        const el = menu.el;
        el.classList.remove('under');
        // (no `screen-in` slide: the fade is the entrance; the animation comes back once the menu is next covered)
        el.style.animation = 'none';
        if (fadeS > 0 && el.hidden) {
          el.style.opacity = '0';
          el.hidden = false;
          void el.offsetWidth;
          el.style.transition = `opacity ${fadeS.toFixed(2)}s ease-out`;
          el.style.opacity = '1';
        } else {
          el.style.transition = 'none';
          el.style.opacity = '';
          el.hidden = false;
        }
        unsub ??= app.screens.onChange(() => {
          if (!el.hidden && el.isConnected) return;
          el.style.animation = el.style.transition = el.style.opacity = '';
          unsub?.();
        });
      };
      title = new TitleScreen(brightness, {
        maxS: IGNITE_S,
        leftS: () => (app.current === ms ? ms.titleLeftS : 0),
        paused: () => app.current === ms && ms.debugPause,
        skip: () => ms.skipTitle(),
        reveal: revealMenu,
      });
      app.screens.push(title);
      // (menu-notes slice 4a, M2) the title's wordmark takes over from the boot's in the same place: the boot (black, no
      // status) drops under the screens and keeps the stage hidden until the reveal; the prompt fades in then
      bootEl?.classList.add('under');
    } else endLaunchBoot();
    // the reveal: the boot screen fades into the title (or the main menu), the menu takes input and the theme starts;
    // the brightness calibration (first run, no title) waits for it too
    // (prepare never rejects; the catch is a second guard so the boot screen can never be stranded)
    void ms
      .prepare((p, s) => {
        if (gen === bootGen) setBoot(base + (1 - base) * p, s);
      }, bootLimits)
      .catch((e: unknown) => `error: ${e instanceof Error ? e.message : String(e)}`)
      .then((why) => {
        if (gen !== bootGen || app.current !== ms) return;
        // (the boot screen and the input first: nothing below can keep the menu hidden)
        app.bootHold = false;
        title?.arm();
        setBoot(1, 'Ready');
        bootEl?.classList.add('done');
        // (M2) once the boot has faded, later boots show their status again (a match load also ends it at once)
        if (title) setTimeout(() => bootEl?.classList.contains('done') && endLaunchBoot(), 800);
        if (why !== 'ready') {
          const msg = `[menu] the load screen gave up waiting and shows the menu: ${why}`;
          // (under automation a note only: the suites count warnings; the reason is on MenuState.bootGate)
          if (navigator.webdriver) console.info(msg);
          else console.warn(msg);
        }
        app.music.menu();
        if (!title) brightness();
      });
  };

  // menu-ui MD6: the flat main menu. Sector Ops (feature/sector-ops): the main menu is Sector Ops, Co-op, Loadout,
  // Settings and Feedback; Missions, Training and Free roam stay behind `?legacy=1`.
  MainMenuScreen.entries.push(
    (a) => ({
      key: 'sectorops',
      label: 'Sector Ops',
      order: 10,
      counter: () => sectorStars,
      ctx: 'Solo or co-op: the Warehouse in sections, each harder than the last. Objective, then exit. Kills optional. A star for each difficulty completed.',
      action: () => a.screens.push(new SectorOpsScreen(a, (o) => startGame(o))),
    }),
  );
  if (flags.legacy) {
    MainMenuScreen.entries.push(
      (a) => ({
        key: 'missions',
        label: 'Missions',
        order: 12,
        counter: () => `${MISSIONS.length}`,
        ctx: 'The campaign. Pick a mission, read the briefing, choose your way in.',
        action: () => a.screens.push(new MissionsScreen(a, (o) => startGame(o))),
      }),
      () => ({
        key: 'training',
        label: 'Training',
        order: 17,
        ctx: 'Drills on the Fallow bunker course.',
        locked: () => 'The bunker is being rebuilt on the new moves. Training returns after the prototype.',
        action: () => {},
      }),
      (a) => ({
        key: 'freeroam',
        label: 'Free roam',
        order: 18,
        ctx: 'No guards. Explore a map with the full kit.',
        action: () => a.screens.push(new FreeRoamScreen(a, (o) => startGame(o))),
      }),
    );
  }
  MainMenuScreen.entries.push(
    (a) => ({ key: 'loadout', label: 'Loadout', order: 20, ctx: flags.legacy ? 'Weapons, attachments and gadget for the next mission.' : 'The kit issued for the mission: weapons, attachments and gadget.', action: () => a.screens.push(flags.legacy ? new LoadoutScreen(a) : new KitScreen(a)) }),
    (a) => ({ key: 'settings', label: 'Settings', order: 80, ctx: 'Controls, graphics, sound, accessibility and save data.', action: () => a.screens.push(new SettingsScreen(a)) }),
    (a) => ({
      key: 'feedback',
      label: 'Feedback',
      order: 90,
      ctx: 'Playtest notes: write one, read the list, export them.',
      action: () => a.screens.push(new SettingsScreen(a).openTab('feedback')),
    }),
    // (anim-studio) the developer stage: the loop player, the animation tuner and the viewing aids (single player)
    (a) => ({
      key: 'anim-studio',
      label: 'Anim Studio (dev)',
      order: 95,
      ctx: 'Developer tool: a plain stage with Wren, the loop player (every clip and state), the animation tuner, viewing aids and snapshots. Pad and keyboard.',
      action: () => a.studio?.(),
    }),
  );
  if (flags.legacy) {
    MainMenuScreen.entries.push((a) => ({
      key: 'legacy',
      label: 'Legacy',
      order: 70,
      ctx: 'Parked modes: Hunter, Mission and the old Play screen.',
      action: () => a.screens.push(new PlayScreen(a, (o) => startGame(o))),
    }));
  }

  // Coop is optional and isolated: only reached through a dynamic import behind the flag.
  const coopApi = {
    startGame: (o: GameOptions, cb: SessionCallbacks) => startGame(o, cb),
    goToMenu,
    profile: () => {
      const sv = app.save.get();
      return { name: sv.profile.name, tag: sv.profile.tag, look: sv.avatar, loadout: lobbyLoadout(sv, campaignUnlocked(flags.legacy)) };
    },
  };
  const loadCoop = () => import('./net/coopUi');
  if (flags.coop) {
    MainMenuScreen.entries.push((a) => ({
      key: 'coop',
      label: 'Co-op',
      counter: () => (navigator.onLine ? '' : 'Offline'),
      ctx: 'Two players with a room code. The campaign starts at Marlow Yard, the training course. The host can switch to Sector Ops.',
      order: 15,
      action: () =>
        void loadCoop()
          .then((m) => m.openCoop(a, coopApi))
          .catch(() => a.toasts.show('Co-op unavailable', 'warn')),
    }));
    // (marlow-bays R1-R3) the room a player dropped out of or left, for the hold (10 min): one press rejoins it (the
    // joiner) or reopens it from its last checkpoint (the host); the label shows the code
    MainMenuScreen.entries.push((a) => {
      const r = loadRejoin();
      return {
        key: 'rejoin',
        label: r ? (r.role === 'host' ? `Resume hosting ${r.code}` : `Rejoin ${r.code}`) : 'Rejoin',
        ctx: r?.role === 'host' ? `Reopen room ${r.code} and restart the match from its last checkpoint. Your partner rejoins on the code.` : `Rejoin room ${r?.code ?? ''}. The host holds your place for 10 minutes after you drop.`,
        order: 14,
        hidden: () => !loadRejoin(),
        action: () => {
          const now = loadRejoin();
          if (!now) return;
          void loadCoop()
            .then((m) => m.resumeRoom(a, coopApi, now))
            .catch(() => a.toasts.show('Co-op unavailable', 'warn'));
        },
      };
    });
  }

  /** The results screen's Missions / Next: the menu, the missions list, and a mission's briefing when `id` is given. */
  const openMissions = (id?: string): void => {
    goToMenu();
    app.screens.push(new MissionsScreen(app, (o) => startGame(o)));
    const mission = id ? missionById(id) : null;
    if (mission) app.screens.push(new BriefingScreen(app, (o) => startGame(o), { kind: 'mission', mission }));
  };

  const startGame = (base: GameOptions, cbOverride?: SessionCallbacks): void => {
    const sv = app.save.get();
    const skin = (_w: string, camo: string): { colors: ReturnType<typeof camoById>['colors']; pattern?: ReturnType<typeof camoById>['pattern'] } => {
      const c = camoById(camo);
      return c.pattern ? { colors: c.colors, pattern: c.pattern } : { colors: c.colors };
    };
    // single player: the suit worn (its look too), HQ upgrades and the preset's gadget
    const coop = !!base.net;
    const opts: GameOptions = {
      ...base,
      loadout: base.loadout ?? loadoutEntries(sv, base.mode, campaignUnlocked(flags.legacy), skin),
      look: base.look ?? suitLook(sv.avatar, sv.suit.worn),
      suit: base.suit ?? (coop ? undefined : sv.suit.worn),
      hq: base.hq ?? (coop ? undefined : sv.hq),
      gadget: base.gadget ?? sv.presets[sv.preset]?.gadget,
    };
    app.screens.clear();
    // (a menu load screen still waiting is dropped: the match's loading owns the boot screen now)
    bootGen++;
    app.bootHold = false;
    endLaunchBoot();
    setBoot(0.5, 'Loading map…');
    document.getElementById('boot')?.classList.remove('done');
    const b = opts.benchmark;
    const what = b ? `benchmark run ${b.idx + 1}/${b.runs.length}: ${b.runs[b.idx]?.label ?? ''} (${app.quality.level.name})` : `${opts.map.id} / ${opts.mode}`;
    app.crashLog?.stage(`loading ${what}`);
    // (the last match / the menu stage freed first: never two matches in memory; nothing may hold the menu)
    app.onAvatarStyle = null;
    app.releaseState();
    const gen = bootGen;
    void GameState.create(app, opts, cbOverride ?? { quit: goToMenu, restart: () => startGame({ ...base, seed: base.seed + 1 }), missions: () => openMissions(), briefing: (id) => openMissions(id) })
      .then((st) => {
        app.setState(st);
        app.crashLog?.stage(`in ${what}`);
        // (map-ready S2) the state is held behind the boot screen: the load gate (`mapGate.ts`) releases it, then the boot
        // screen goes (`finally`). Never rejects.
        if (flags.mapReady)
          return st.runGate((p, text) => {
            if (gen === bootGen) setBoot(0.5 + 0.5 * p, text);
          }, readyCapMs(location.search));
        return undefined;
      })
      .catch((e: unknown) => {
        console.error(e);
        app.toasts.show('Failed to load map', 'warn');
        if (opts.benchmark) {
          app.quality.setOverride(null, false);
          benchTag(null);
        }
        if (cbOverride) cbOverride.quit();
        else goToMenu();
      })
      // (map-ready S2: a newer load owns the boot screen once this one's gate was closed by it)
      .finally(() => {
        if (!flags.mapReady || gen === bootGen) document.getElementById('boot')?.classList.add('done');
      });
  };

  // (3.1.4: every run in its own match, its settings set before the map loads - a change mid-match is not what a run
  // measures)
  // (3.2.1: Resolutions measures the monitor's resolutions)
  const benchOutput = (): [number, number] => [Math.round(screen.width * devicePixelRatio), Math.round(screen.height * devicePixelRatio)];
  app.benchmark = (kind = 'current') => {
    const s: BenchSession =
      typeof kind === 'string'
        ? { kind, runs: benchPlan(kind, ...benchOutput(), PRESET_IDS, app.quality.level.features, app.settings.get().video.renderScale), idx: 0, lines: [] }
        : kind;
    const run = s.runs[s.idx];
    if (!run) return;
    s.note ??= `fb-bench-${Date.now().toString(36)}`;
    s.started ??= Date.now();
    benchTag(`Run ${s.idx + 1}/${s.runs.length} · ${run.label} · loading`);
    app.quality.setOverride({ preset: run.preset, scale: run.scale, gfx: run.gfx }, false);
    startGame({ map: getMap('warehouse'), mode: 'clear', seed: 1, benchmark: s });
  };
  // (anim-studio) Main menu / Pause > Anim Studio (dev): the studio stage in Free Roam (single player)
  app.studio = () => startGame({ map: getMap('studio'), mode: 'sandbox', seed: 1 });
  // tests: a shorter flight
  (window as unknown as { __bench: typeof BENCH }).__bench = BENCH;
  // tests: start a match from the menu (Free roam left the main menu with sector-ops slice 1; e2e-pad still walks it)
  (window as unknown as { __play: (map: string, mode: GameOptions['mode'], difficulty?: string) => void }).__play = (map, mode, difficulty) =>
    startGame({ map: getMap(map), mode, seed: 1, difficulty: parseDifficulty(difficulty) });

  // dev only (the level editor's walk test): the editor's unsaved campus, fetched before the map builds; the production
  // build drops this branch and its module
  const editorWalk = import.meta.env.DEV && flags.devDraft ? await import('./dev/editorBridge') : null;
  if (editorWalk) await editorWalk.loadDraft();
  // the training course over `?net=local` (dev tabs, tests): the first tab hosts the map's room, the next joins it; the
  // dev solo flag (`&course=solo`) boots it single player instead
  // (sector-ops slice 3: Sector Ops the same way, `?net=local&autostart=warehouseOps&mode=sector`)
  const localMode = flags.mode === 'course' && !courseSoloFlag() ? 'course' : flags.mode === 'sector' ? 'sector' : null;
  const localCourse = !!flags.autostart && !!localMode && flags.coop && flags.net === 'local';
  if (localCourse && localMode) {
    goToMenu();
    const mapId = getMap(flags.autostart!).id;
    void loadCoop()
      .then((m) => m.autoLocalCourse(app, coopApi, mapId, localMode))
      .catch((e: unknown) => {
        console.error(e);
        app.toasts.show('Co-op unavailable', 'warn');
      });
  } else if (flags.autostart) {
    // infiltration: the mission picks its map
    const mission = flags.mode === 'infiltration' ? missionById(flags.mission ?? '') ?? MISSIONS.find((m) => m.map === flags.autostart) ?? MISSIONS[0]! : null;
    startGame({ map: getMap(mission ? mission.map : flags.autostart), mode: flags.mode ?? 'sandbox', seed: 1, difficulty: parseDifficulty(flags.difficulty), missionId: mission?.id, insertion: flags.insertion ?? undefined, weather: flags.weather ?? undefined, loadout: flags.loadout ? flags.loadout.filter((w): w is WeaponId => (WEAPON_IDS as readonly string[]).includes(w)).map((id) => ({ id })) : undefined });
  }
  else goToMenu();
  editorWalk?.attach(app);
  if (flags.coop && flags.room && !flags.autostart) {
    const room = flags.room;
    void loadCoop().then((m) => m.openJoinLink(app, coopApi, room));
  }
  app.start();

  // (menu-notes note 2) the menu's own gate reveals it (goToMenu); a match boot keeps today's order
  if (!menuShownOnce) {
    setBoot(1, 'Ready');
    document.getElementById('boot')?.classList.add('done');
  }
}

boot().catch((err: unknown) => {
  console.error(err);
  endLaunchBoot();
  setBoot(1, `Failed to start: ${err instanceof Error ? err.message : String(err)}`);
});
