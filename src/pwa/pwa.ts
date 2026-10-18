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
