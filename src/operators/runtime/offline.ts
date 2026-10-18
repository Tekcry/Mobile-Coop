/**
 * (operators step 11e fix r1, A109 / A110) Wren offline. No Babylon.
 *
 * - `warmPlayLods`: the service worker caches the operator GLBs at runtime (vite.config.ts `runtimeCaching`, cache
 *   `operators`) only when a fetch goes through it. The first online visit loads Wren before the worker controls the
 *   page, so those fetches miss the cache. Once a worker controls the page (now, or at its `controllerchange`), each
 *   play LOD not yet in the cache is fetched once through it, so one online start that reaches the main menu leaves
 *   the play LODs cached for offline play. The hero stays on demand (cached the first time a close-up asks for it).
 * - `pageLeaving`: true from `pagehide` until a `pageshow`: a load cut off by the page unloading (reload, navigation)
 *   is abandoned, not failed, and is not reported.
 */

let leaving = false;
let listening = false;

function listen(): void {
  if (listening || typeof addEventListener !== 'function') return;
  listening = true;
  addEventListener('pagehide', () => { leaving = true; });
  addEventListener('pageshow', () => { leaving = false; });
}
listen();

/** The page is unloading (a load failing now was cut off, not broken). */
export function pageLeaving(): boolean {
  return leaving;
}

let warm: Promise<number> | null = null;
let waiting = false;

/**
 * Puts `urls` (same-origin build URLs, `playLodUrls`) into the service worker's cache by fetching each missing one
 * through the controlling worker. Resolves with the number fetched (0: all cached, no worker, or not controlled yet;
 * it then runs again when a worker takes control). Once per page; a failed run may run again.
 */
export function warmPlayLods(urls: readonly string[]): Promise<number> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof caches === 'undefined') return Promise.resolve(0);
  const sw = navigator.serviceWorker;
  if (!sw.controller) {
    if (!waiting) {
      waiting = true;
      sw.addEventListener('controllerchange', () => { waiting = false; void warmPlayLods(urls); }, { once: true });
    }
    return Promise.resolve(0);
  }
  if (!warm) {
    warm = (async () => {
      let n = 0;
      for (const u of urls) {
        if (!u || (await caches.match(u))) continue;
        const r = await fetch(u);
        if (!r.ok) throw new Error(`operator asset ${u}: HTTP ${r.status}`);
        await r.arrayBuffer(); // read to the end: the worker caches the response as it completes
        n++;
      }
      return n;
    })().catch((e: unknown) => {
      warm = null;
      // not an error: the loads themselves report a real failure; this only means the cache is not warm yet (offline,
      // or cut off), and the next start tries again
      if (!leaving) console.info('[operators] offline cache not warmed yet', e);
      return 0;
    });
  }
  return warm;
}
