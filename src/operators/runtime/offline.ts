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

/** The last warm run (runs queue behind it, one at a time). */
let warm: Promise<number> = Promise.resolve(0);
/** Urls warmed or being warmed this page (a failed run forgets its own, so a later call tries them again). */
const asked = new Set<string>();
/** Urls asked for before a worker controlled the page: warmed at its `controllerchange`. */
const pending = new Set<string>();
let waiting = false;

/**
 * Puts `urls` (same-origin build URLs, `playLodUrls`) into the service worker's cache by fetching each missing one
 * through the controlling worker. Resolves with the number fetched (0: all cached, no worker, or not controlled yet;
 * it then runs again when a worker takes control). Each url once per page; a failed run may run again. (guard-models
 * G7) Later calls with other urls (the guards' LODs, `guardBody.ts`) queue behind the first, in their own order.
 */
export function warmPlayLods(urls: readonly string[]): Promise<number> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || typeof caches === 'undefined') return Promise.resolve(0);
  const sw = navigator.serviceWorker;
  if (!sw.controller) {
    for (const u of urls) if (u) pending.add(u);
    if (!waiting) {
      waiting = true;
      sw.addEventListener('controllerchange', () => {
        waiting = false;
        const list = [...pending];
        pending.clear();
        void warmPlayLods(list);
      }, { once: true });
    }
    return Promise.resolve(0);
  }
  const fresh = urls.filter((u) => u && !asked.has(u));
  if (!fresh.length) return warm;
  for (const u of fresh) asked.add(u);
  warm = warm.then(async () => {
    let n = 0;
    for (const u of fresh) {
      if (await caches.match(u)) continue;
      const r = await fetch(u);
      if (!r.ok) throw new Error(`operator asset ${u}: HTTP ${r.status}`);
      await r.arrayBuffer(); // read to the end: the worker caches the response as it completes
      n++;
    }
    return n;
  }).catch((e: unknown) => {
    for (const u of fresh) asked.delete(u);
    // not an error: the loads themselves report a real failure; this only means the cache is not warm yet (offline,
    // or cut off), and the next start tries again
    if (!leaving) console.info('[operators] offline cache not warmed yet', e);
    return 0;
  });
  return warm;
}
