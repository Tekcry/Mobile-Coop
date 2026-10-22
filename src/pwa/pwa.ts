import { registerSW } from 'virtual:pwa-register';
import { contextFrom, decideUpdate, type ScreenFacts } from './updatePolicy';

export interface ServiceWorkerHooks {
  /** the whole build is precached (first install) */
  onReady?: () => void;
  /** (sw-reload) what the game shows now; without it a new build waits for the next launch */
  probe?: () => ScreenFacts;
  /** (sw-reload) a new build is waiting and will apply at the menu (told once, never during the boot) */
  onDeferred?: () => void;
}

/** How often a waiting update re-reads the screen (ms). */
const UPDATE_POLL_MS = 1000;

/**
 * Registers the service worker (precache of the whole build for offline play). (sw-reload) `registerType: 'prompt'`:
 * a new deploy's worker waits and never reloads the page by itself; it is activated (and the page reloaded) only when
 * `updatePolicy` says the player is on the title or main menu with no match and no co-op screen, or on the next launch
 * once every window is closed. A worker another window activated takes this page over silently (no reload) and the
 * reload waits for the menu the same way.
 */
export function setupServiceWorker(hooks: ServiceWorkerHooks = {}): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  let waiting = false;
  let takenOver = false;
  let applying = false;
  let told = false;
  let reloading = false;
  let timer = 0;
  const tick = (): void => {
    const facts = hooks.probe?.();
    if (!facts || applying) return;
    const d = decideUpdate(contextFrom(waiting, facts));
    if (d === 'apply') {
      applying = true;
      window.clearInterval(timer);
      if (takenOver) {
        reloading = true;
        window.location.reload();
      } else void update(true);
    } else if (d === 'defer' && !told && !facts.booting) {
      told = true;
      hooks.onDeferred?.();
    }
  };
  const pend = (): void => {
    if (waiting) return;
    waiting = true;
    timer = window.setInterval(tick, UPDATE_POLL_MS);
    tick();
  };
  const update = registerSW({
    immediate: true,
    onOfflineReady() {
      hooks.onReady?.();
    },
    onNeedRefresh: pend,
    // (a no-op so the plugin never reloads by itself; its `controlling` event misses pages with no controller at load)
    onNeedReload() {},
  });
  // (sw-reload fix r1) the new worker controls the page: our own SKIP_WAITING (reload now) or another window's (wait
  // for the menu). The first claim of a page that had no worker (first install, hard reload) is not an update.
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    const was = controlled;
    controlled = !!navigator.serviceWorker.controller;
    if (!was || reloading) return;
    if (applying) {
      reloading = true;
      window.location.reload();
    } else {
      takenOver = true;
      pend();
    }
  });
}

/** Fullscreen on / off. Must be called from a user gesture. */
export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* not supported / denied */
  }
}

/** Block browser gestures that fight with game input (trackpad pinch zoom, the right-click menu). */
export function suppressBrowserGestures(): void {
  const prevent = (e: Event): void => e.preventDefault();
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('contextmenu', prevent);
}
