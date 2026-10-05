import './styles.css';
import { App } from './core/app';
import { loadHavok } from './physics/havok';
import { setupServiceWorker, setupRotateOverlay, suppressBrowserGestures, enterFullscreenLandscape, isStandalone } from './pwa/pwa';
import { flags } from './core/flags';
import { MenuState } from './world/menuScene';
import { MainMenuScreen } from './ui/screens/mainMenu';
import { SettingsScreen } from './ui/screens/settingsScreen';
import { GameState, type GameOptions } from './game/gameState';
import { getMap } from './world/maps';
import { requestPersistence } from './save/db';
import { PlayScreen } from './ui/screens/playScreen';

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
  if (flags.debug) app.debug.toggle(true);
  void requestPersistence();

  setBoot(0.35, 'Loading physics…');
  await loadHavok();
  setBoot(0.8, 'Building scene…');

  const goToMenu = (): void => {
    app.screens.clear();
    app.setState(new MenuState(app.engine));
    app.screens.push(new MainMenuScreen(app));
  };

  MainMenuScreen.entries.push(
    (a) => ({
      label: 'Play',
      sub: 'Waves · Mission · Free roam',
      icon: 'play',
      order: 10,
      action: () => a.screens.push(new PlayScreen(a, (o) => startGame(o))),
    }),
    (a) => ({ label: 'Settings', icon: 'gear', order: 80, action: () => a.screens.push(new SettingsScreen(a)) }),
  );

  const startGame = (opts: GameOptions): void => {
    app.screens.clear();
    setBoot(0.5, 'Loading map…');
    document.getElementById('boot')?.classList.remove('done');
    void GameState.create(app, opts, { quit: goToMenu, restart: () => startGame({ ...opts, seed: opts.seed + 1 }) })
      .then((st) => app.setState(st))
      .catch((e: unknown) => {
        console.error(e);
        app.toasts.show('Failed to load map', 'warn');
        goToMenu();
      })
      .finally(() => document.getElementById('boot')?.classList.add('done'));
  };

  if (flags.autostart) startGame({ map: getMap(flags.autostart), mode: flags.mode ?? 'sandbox', seed: 1 });
  else goToMenu();
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
