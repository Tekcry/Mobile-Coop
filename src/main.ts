import './styles.css';
import { BrightnessScreen } from './ui/screens/brightnessScreen';
import { WEAPON_IDS, type WeaponId } from './weapons/weaponDefs';
import { suitLook } from './progression/suit';
import { parseDifficulty } from './ai/archetypes';
import { MISSIONS, missionById } from './game/missions';
import './cosmetics/catalog';
import { App } from './core/app';
import { loadHavok } from './physics/havok';
import { setupServiceWorker, suppressBrowserGestures } from './pwa/pwa';
import { flags } from './core/flags';
import { campaignUnlocked, showEconomy } from './core/legacy';
import { MenuState } from './world/menuScene';
import { MainMenuScreen } from './ui/screens/mainMenu';
import { TitleScreen } from './ui/screens/titleScreen';
import { SettingsScreen } from './ui/screens/settingsScreen';
import { GameState, type GameOptions, type SessionCallbacks } from './game/gameState';
import { getMap } from './world/maps';
import { courseSoloFlag } from './game/modes/courseMode';
import { requestPersistence } from './save/db';
import { PlayScreen } from './ui/screens/playScreen';
import { LoadoutScreen } from './ui/screens/loadoutScreen';
import { MissionsScreen, FreeRoamScreen } from './ui/screens/missionsScreen';
import { BriefingScreen } from './ui/screens/briefingScreen';

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

function setBoot(progress: number, status: string): void {
  const bar = document.getElementById('boot-progress');
  const st = document.getElementById('boot-status');
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  if (st) st.textContent = status;
}

async function boot(): Promise<void> {
  suppressBrowserGestures();
  setupServiceWorker(() => app.toasts.show('Ready to play offline', 'ok'));

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const app = new App(canvas);
  (window as unknown as { __app: App }).__app = app;
  // tests: the bundled mission definitions
  (window as unknown as { __missions: typeof MISSIONS }).__missions = MISSIONS;

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
    // (the match freed before the menu stage is built: its shaders are released with it)
    app.releaseState();
    const ms = new MenuState(app.engine);
    app.setState(ms);
    // (menu-ui slice 6) the cinematic background follows the screen on top: the title holds S1, the lobby keeps the stage
    ms.screenContext = () => {
      const c = app.screens.top?.el.classList;
      return c?.contains('title-screen') ? 'title' : c?.contains('lobby-screen') ? 'lobby' : 'main';
    };
    showSavedOperator(app);
    app.onAvatarStyle = () => {
      // (a new avatar style rebuilds the same request: clear what the preview remembers)
      if (app.current === ms) {
        ms.forget();
        showSavedOperator(app);
      }
    };
    app.music.menu();
    app.crashLog?.stage('menu');
    const menu = new MainMenuScreen(app);
    // (menu-ui MD19: the profile badge only with `?legacy=1`)
    if (flags.legacy) menu.badge.append(profileBadge(app));
    app.screens.push(menu);
    void app.feedback.all().then((all) => menu.setCounter('feedback', all.length ? `${all.length}` : ''));
    // menu-ui MD2: the title screen once per launch (not after a match, not under automation unless `?title=1`); Back
    // on the main menu returns to it. The brightness calibration follows the title on the first run.
    const brightness = (): void => {
      if (!app.settings.get().video.brightnessSet && !navigator.webdriver && app.screens.top === menu) app.screens.push(new BrightnessScreen(app));
    };
    const titleAllowed = !navigator.webdriver || titleFlag;
    MainMenuScreen.onBackToTitle = titleAllowed ? () => app.screens.push(new TitleScreen(() => {})) : null;
    // music project: `?musiclab=1` opens the lab over the menu (debug)
    if (flags.musicLab) void import('./audio/music/musicLab').then((m) => app.screens.push(new m.MusicLabScreen(app)));
    if (flags.foleyLab) void import('./audio/foley/foleyLab').then((m) => app.screens.push(new m.FoleyLabScreen(app)));
    if (flags.weaponLab) void import('./audio/weapons/weaponLab').then((m) => app.screens.push(new m.WeaponLabScreen(app)));
    // 3.6 Step 4b: the brightness calibration, once after the update (skippable; never under automation)
    if (titleAllowed && !titleShown) {
      titleShown = true;
      app.screens.push(new TitleScreen(brightness));
    } else brightness();
  };

  // menu-ui MD6: the flat main menu. Until the Missions / Training / Free roam screens exist (steps 07+), Missions and
  // Free roam open the Play screen preset to that mode. Continue waits for a mission checkpoint save (hidden until then).
  MainMenuScreen.entries.push(
    (a) => ({
      key: 'missions',
      label: 'Missions',
      order: 10,
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
    (a) => ({ key: 'loadout', label: 'Loadout', order: 20, ctx: flags.legacy ? 'Weapons, attachments and gadget for the next mission.' : 'The kit issued for the mission: weapons, attachments and gadget.', action: () => a.screens.push(flags.legacy ? new LoadoutScreen(a) : new KitScreen(a)) }),
    (a) => ({ key: 'settings', label: 'Settings', order: 80, ctx: 'Controls, graphics, sound, accessibility and save data.', action: () => a.screens.push(new SettingsScreen(a)) }),
    (a) => ({
      key: 'feedback',
      label: 'Feedback',
      order: 90,
      ctx: 'Playtest notes: write one, read the list, export them.',
      action: () => a.screens.push(new SettingsScreen(a).openTab('feedback')),
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
      ctx: 'Two to four players with a room code. The Fallow bunker is the co-op tutorial.',
      order: 15,
      action: () =>
        void loadCoop()
          .then((m) => m.openCoop(a, coopApi))
          .catch(() => a.toasts.show('Co-op unavailable', 'warn')),
    }));
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
    setBoot(0.5, 'Loading map…');
    document.getElementById('boot')?.classList.remove('done');
    const b = opts.benchmark;
    const what = b ? `benchmark run ${b.idx + 1}/${b.runs.length}: ${b.runs[b.idx]?.label ?? ''} (${app.quality.level.name})` : `${opts.map.id} / ${opts.mode}`;
    app.crashLog?.stage(`loading ${what}`);
    // (the last match / the menu stage freed first: never two matches in memory; nothing may hold the menu)
    app.onAvatarStyle = null;
    app.releaseState();
    void GameState.create(app, opts, cbOverride ?? { quit: goToMenu, restart: () => startGame({ ...base, seed: base.seed + 1 }), missions: () => openMissions(), briefing: (id) => openMissions(id) })
      .then((st) => {
        app.setState(st);
        app.crashLog?.stage(`in ${what}`);
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
      .finally(() => document.getElementById('boot')?.classList.add('done'));
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
  // tests: a shorter flight
  (window as unknown as { __bench: typeof BENCH }).__bench = BENCH;

  // dev only (the level editor's walk test): the editor's unsaved campus, fetched before the map builds; the production
  // build drops this branch and its module
  const editorWalk = import.meta.env.DEV && flags.devDraft ? await import('./dev/editorBridge') : null;
  if (editorWalk) await editorWalk.loadDraft();
  // the training course over `?net=local` (dev tabs, tests): the first tab hosts the map's room, the next joins it; the
  // dev solo flag (`&course=solo`) boots it single player instead
  const localCourse = !!flags.autostart && flags.mode === 'course' && flags.coop && flags.net === 'local' && !courseSoloFlag();
  if (localCourse) {
    goToMenu();
    const mapId = getMap(flags.autostart!).id;
    void loadCoop()
      .then((m) => m.autoLocalCourse(app, coopApi, mapId))
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

  setBoot(1, 'Ready');
  document.getElementById('boot')?.classList.add('done');
}

boot().catch((err: unknown) => {
  console.error(err);
  setBoot(1, `Failed to start: ${err instanceof Error ? err.message : String(err)}`);
});
