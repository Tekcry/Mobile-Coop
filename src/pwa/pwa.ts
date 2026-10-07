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
 * iOS Safari supports neither on iPhone; the page is turned to landscape instead (`core/viewRotation.ts`).
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

/** Desktop: fullscreen on / off (no orientation lock). Must be called from a user gesture. */
export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    /* not supported / denied */
  }
}

/** Block browser gestures that fight with game input (pinch zoom, pull-to-refresh, long-press menus). */
export function suppressBrowserGestures(): void {
  const prevent = (e: Event): void => e.preventDefault();
  document.addEventListener('gesturestart', prevent, { passive: false });
  document.addEventListener('contextmenu', prevent);
  document.addEventListener(
    'touchmove',
    (e) => {
      if (canScroll(e.target as HTMLElement | null)) return;
      e.preventDefault();
    },
    { passive: false },
  );
}

/** A touch drag may scroll when it starts inside a `.scrollable` element or any element that overflows and
 *  scrolls (every menu list, tab body and grid), so long menus scroll by touch; anything else is the game's. */
function canScroll(el: HTMLElement | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.classList.contains('scrollable')) return true;
    if (n.classList.contains('touch-layer') || n.tagName === 'CANVAS') return false;
    if (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1) {
      const s = getComputedStyle(n);
      if (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowX === 'auto' || s.overflowX === 'scroll') return true;
    }
  }
  return false;
}
