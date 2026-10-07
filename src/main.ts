import './styles.css';
import { WEAPON_IDS, type WeaponId } from './weapons/weaponDefs';
import { suitLook } from './progression/suit';
import { parseDifficulty } from './ai/archetypes';
import { MISSIONS, missionById } from './game/missions';
import './cosmetics/catalog';
import { App } from './core/app';
import { loadHavok } from './physics/havok';
import { setupServiceWorker, suppressBrowserGestures, enterFullscreenLandscape, isStandalone } from './pwa/pwa';
import { flags } from './core/flags';
import { MenuState } from './world/menuScene';
import { MainMenuScreen } from './ui/screens/mainMenu';
import { SettingsScreen } from './ui/screens/settingsScreen';
import { GameState, type GameOptions, type SessionCallbacks } from './game/gameState';
import { getMap } from './world/maps';
import { requestPersistence } from './save/db';
import { PlayScreen } from './ui/screens/playScreen';
import { LoadoutScreen } from './ui/screens/loadoutScreen';
import { showSavedOperator } from './ui/screens/operator';
import { profileBadge } from './ui/screens/profileBadge';
import { rewardsPanel } from './ui/screens/rewardsPanel';
import { dataTab } from './ui/screens/dataTab';
import { BENCH, benchPlan, type BenchSession } from './game/benchmark';
import { MOBILE_PRESET_IDS, PRESET_IDS } from './core/quality';
import { feedbackContext, feedbackTab } from './ui/screens/feedbackScreen';
import { CrashLog } from './feedback/crashLog';
import { benchTag } from './ui/benchTag';
import { extraSettingsTabs } from './ui/screens/settingsScreen';
import { applySession, autoGrant, loadoutEntries, type SessionReport } from './progression/profile';
import { camoById } from './cosmetics/catalog';
import { setupForcedLandscape, viewHeight, viewWidth } from './core/viewRotation';

function setBoot(progress: number, status: string): void {
  const bar = document.getElementById('boot-progress');
  const st = document.getElementById('boot-status');
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  if (st) st.textContent = status;
}

async function boot(): Promise<void> {
  suppressBrowserGestures();
  // (3.1.6: a phone held upright gets the page turned to landscape; listeners measuring on resize see it turned)
  setupForcedLandscape(() => window.dispatchEvent(new Event('resize')));
  setupServiceWorker(() => app.toasts.show('Ready to play offline', 'ok'));

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const app = new App(canvas);
  (window as unknown as { __app: App }).__app = app;
  // tests: the bundled mission definitions
  (window as unknown as { __missions: typeof MISSIONS }).__missions = MISSIONS;

  setBoot(0.15, 'Loading settings…');
  await app.loadSettings();
  setBoot(0.25, 'Loading profile…');
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
    return report ? rewardsPanel(report) : null;
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
    showSavedOperator(app);
    app.onAvatarStyle = () => {
      // (a new avatar style rebuilds the same request: clear what the preview remembers)
      if (app.current === ms) {
        ms.forget();
        showSavedOperator(app);
      }
    };
    app.music.start();
    app.crashLog?.stage('menu');
    const menu = new MainMenuScreen(app);
    menu.badge.append(profileBadge(app));
    app.screens.push(menu);
  };

  MainMenuScreen.entries.push(
    (a) => ({
      label: 'Play',
      sub: 'Waves · Mission · Free roam',
      icon: 'play',
      order: 10,
      action: () => a.screens.push(new PlayScreen(a, (o) => startGame(o))),
    }),
    (a) => ({ label: 'Loadout', sub: 'Weapons · Gear · Appearance · HQ', icon: 'gun', order: 20, action: () => a.screens.push(new LoadoutScreen(a)) }),
    (a) => ({ label: 'Settings', icon: 'gear', order: 80, action: () => a.screens.push(new SettingsScreen(a)) }),
  );

  // Coop is optional and isolated: only reached through a dynamic import behind the flag.
  const coopApi = {
    startGame: (o: GameOptions, cb: SessionCallbacks) => startGame(o, cb),
    goToMenu,
    profile: () => {
      const sv = app.save.get();
      return { name: sv.profile.name, tag: sv.profile.tag, look: sv.avatar, loadout: [sv.loadout.primary, sv.loadout.secondary] };
    },
  };
  const loadCoop = () => import('./net/coopUi');
  if (flags.coop) {
    MainMenuScreen.entries.push((a) => ({
      label: 'Co-op',
      sub: navigator.onLine ? '2-4 players · Room code' : 'Offline',
      icon: 'wifi',
      order: 15,
      action: () =>
        void loadCoop()
          .then((m) => m.openCoop(a, coopApi))
          .catch(() => a.toasts.show('Co-op unavailable', 'warn')),
    }));
  }

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
      loadout: base.loadout ?? loadoutEntries(sv, base.mode, skin),
      look: base.look ?? suitLook(sv.avatar, sv.suit.worn),
      emotes: sv.emotes,
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
    void GameState.create(app, opts, cbOverride ?? { quit: goToMenu, restart: () => startGame({ ...base, seed: base.seed + 1 }) })
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
  app.benchmark = (kind = 'current') => {
    const s: BenchSession =
      typeof kind === 'string'
        ? { kind, runs: benchPlan(kind, Math.round(viewWidth() * devicePixelRatio), Math.round(viewHeight() * devicePixelRatio), app.platform.platform === 'mobile' ? MOBILE_PRESET_IDS : PRESET_IDS, app.quality.level.features), idx: 0, lines: [] }
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

  if (flags.autostart) {
    // infiltration: the mission picks its map
    const mission = flags.mode === 'infiltration' ? missionById(flags.mission ?? '') ?? MISSIONS.find((m) => m.map === flags.autostart) ?? MISSIONS[0]! : null;
    startGame({ map: getMap(mission ? mission.map : flags.autostart), mode: flags.mode ?? 'sandbox', seed: 1, difficulty: parseDifficulty(flags.difficulty), missionId: mission?.id, insertion: flags.insertion ?? undefined, weather: flags.weather ?? undefined, loadout: flags.loadout ? flags.loadout.filter((w): w is WeaponId => (WEAPON_IDS as readonly string[]).includes(w)).map((id) => ({ id })) : undefined });
  }
  else goToMenu();
  if (flags.coop && flags.room && !flags.autostart) {
    const room = flags.room;
    void loadCoop().then((m) => m.openJoinLink(app, coopApi, room));
  }
  app.start();

  // Fullscreen + landscape lock need a user gesture (Android). iOS uses standalone PWA mode instead.
  // (desktop: fullscreen is the player's choice, Settings > Graphics)
  if (!isStandalone() && app.platform.platform === 'mobile') {
    window.addEventListener('pointerup', () => void enterFullscreenLandscape(), { once: true });
  }

  setBoot(1, 'Ready');
  document.getElementById('boot')?.classList.add('done');
}

boot().catch((err: unknown) => {
  console.error(err);
  setBoot(1, `Failed to start: ${err instanceof Error ? err.message : String(err)}`);
});
