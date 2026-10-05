import { registerSW } from 'virtual:pwa-register';

/** Registers the service worker (precache of the whole build for offline play). */
export function setupServiceWorker(onReady?: () => void): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  registerSW({
    immediate: true,
    onOfflineReady() {
      onReady?.();
    },
  });
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Request fullscreen + landscape lock. Must be called from a user gesture.
 * iOS Safari supports neither on iPhone; the rotate overlay and standalone PWA mode cover it.
 */
export async function enterFullscreenLandscape(): Promise<void> {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  try {
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }
  } catch {
    /* not supported / denied */
  }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch {
    /* not supported */
  }
}

/** Shows a "rotate your device" overlay while in portrait on touch devices. */
export function setupRotateOverlay(): void {
  const el = document.getElementById('rotate-overlay');
  if (!el) return;
  const mq = window.matchMedia('(orientation: portrait) and (pointer: coarse)');
  const update = (): void => {
    el.hidden = !mq.matches;
  };
  mq.addEventListener('change', update);
  update();
}

/** Block browser gestures that fight with game input (pinch zoom, pull-to-refresh, long-press menus). */
export function suppressBrowserGestures(): void {
  const prevent = (e: Event): void => e.preventDefault();
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('contextmenu', prevent);
  document.addEventListener(
    'touchmove',
    (e) => {
      if ((e.target as HTMLElement | null)?.closest('.scrollable')) return;
      e.preventDefault();
    },
    { passive: false },
  );
}
