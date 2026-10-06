import './styles.css';
import { parseDifficulty } from './ai/archetypes';
import './cosmetics/catalog';
import { App } from './core/app';
import { loadHavok } from './physics/havok';
import { setupServiceWorker, setupRotateOverlay, suppressBrowserGestures, enterFullscreenLandscape, isStandalone } from './pwa/pwa';
import { flags } from './core/flags';
import { MenuState } from './world/menuScene';
import { MainMenuScreen } from './ui/screens/mainMenu';
import { SettingsScreen } from './ui/screens/settingsScreen';
import { GameState, type GameOptions, type SessionCallbacks } from './game/gameState';
import { getMap } from './world/maps';
import { requestPersistence } from './save/db';
import { PlayScreen } from './ui/screens/playScreen';
import { ArmoryScreen } from './ui/screens/armoryScreen';
import { StoreScreen } from './ui/screens/storeScreen';
import { profileBadge } from './ui/screens/profileBadge';
import { rewardsPanel } from './ui/screens/rewardsPanel';
import { dataTab } from './ui/screens/dataTab';
import { extraSettingsTabs } from './ui/screens/settingsScreen';
import { applySession, autoGrant, loadoutEntries, type SessionReport } from './progression/profile';
import { CustomizeScreen } from './ui/screens/customizeScreen';
import { camoById } from './cosmetics/catalog';

function setBoot(progress: number, status: string): void {
  const bar = document.getElementById('boot-progress');
  const st = document.getElementById('boot-status');
  if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
  if (st) st.textContent = status;
}

async function boot(): Promise<void> {
  suppressBrowserGestures();
  setupRotateOverlay();
  setupServiceWorker(() => app.toasts.show('Ready to play offline', 'ok'));

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const app = new App(canvas);
  (window as unknown as { __app: App }).__app = app;

  setBoot(0.15, 'Loading settings…');
  await app.loadSettings();
  setBoot(0.25, 'Loading profile…');
  await app.save.load();
  app.save.update((d) => void autoGrant(d));
  extraSettingsTabs.push(dataTab);
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
    const ms = new MenuState(app.engine);
    app.setState(ms);
    const sv = app.save.get();
    ms.setAvatar(sv.avatar, sv.loadout.primary, sv.weapons[sv.loadout.primary].camo);
    app.onAvatarStyle = () => {
      const v = app.save.get();
      if (app.current === ms) ms.setAvatar(v.avatar, v.loadout.primary, v.weapons[v.loadout.primary].camo);
    };
    app.music.start();
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
    (a) => ({ label: 'Armory', sub: 'Loadout · Upgrades', icon: 'gun', order: 20, action: () => a.screens.push(new ArmoryScreen(a)) }),
    (a) => ({ label: 'Customise', sub: 'Avatar · Tag · Emotes', icon: 'user', order: 25, action: () => a.screens.push(new CustomizeScreen(a)) }),
    (a) => ({ label: 'Store', sub: 'Unlocks', icon: 'trophy', order: 30, action: () => a.screens.push(new StoreScreen(a)) }),
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
    const opts: GameOptions = { ...base, loadout: base.loadout ?? loadoutEntries(sv, base.mode, skin), look: base.look ?? sv.avatar, emotes: sv.emotes };
    app.screens.clear();
    setBoot(0.5, 'Loading map…');
    document.getElementById('boot')?.classList.remove('done');
    void GameState.create(app, opts, cbOverride ?? { quit: goToMenu, restart: () => startGame({ ...base, seed: base.seed + 1 }) })
      .then((st) => app.setState(st))
      .catch((e: unknown) => {
        console.error(e);
        app.toasts.show('Failed to load map', 'warn');
        if (cbOverride) cbOverride.quit();
        else goToMenu();
      })
      .finally(() => document.getElementById('boot')?.classList.add('done'));
  };

  if (flags.autostart) startGame({ map: getMap(flags.autostart), mode: flags.mode ?? 'sandbox', seed: 1, difficulty: parseDifficulty(flags.difficulty) });
  else goToMenu();
  if (flags.coop && flags.room && !flags.autostart) {
    const room = flags.room;
    void loadCoop().then((m) => m.openJoinLink(app, coopApi, room));
  }
  app.start();

  // Fullscreen + landscape lock need a user gesture (Android). iOS uses standalone PWA mode instead.
  if (!isStandalone()) {
    window.addEventListener('pointerup', () => void enterFullscreenLandscape(), { once: true });
  }

  setBoot(1, 'Ready');
  document.getElementById('boot')?.classList.add('done');
}

boot().catch((err: unknown) => {
  console.error(err);
  setBoot(1, `Failed to start: ${err instanceof Error ? err.message : String(err)}`);
});
