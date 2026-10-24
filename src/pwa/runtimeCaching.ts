/**
 * The service worker's runtime cache rules (`vite.config.ts` workbox `runtimeCaching`), kept here so a unit test
 * (`tests/swRuntimeCaching.test.ts`) checks them the way they land in `dist/sw.js`.
 *
 * SELF-CONTAINED RULES ONLY. workbox-build writes each `urlPattern` function into `sw.js` as its source text
 * (`toString()`); nothing it refers to goes with it. So a `urlPattern` is a RegExp literal or a function that uses only
 * its own arguments and inline literals: no imported or outer name (guard-models B1: a rule that read an imported regex
 * threw a ReferenceError in the worker for every same-origin request reaching it, so nothing after it was ever cached).
 * Runtime imports are not allowed in this file; type imports are erased.
 *
 * (operators 11e, A98 / A99) The operator bodies (Wren's LOD0-2 for play, the hero for the menu and close cameras) are
 * too big to precache (hero 55 MB, LOD0 18 MB): each is cached the first time it is fetched through the worker, then
 * served from the cache. The first visit loads Wren before the worker controls the page, so once it does the game
 * fetches each missing play LOD through it (A109, operators/runtime/offline.ts): one online start that reaches the menu
 * leaves LOD0-2 cached for offline play; the hero is cached the first time a close-up asks for it. Same origin only; a
 * new build's hashed files replace the old ones (8 entries = two builds of four files). Workbox takes the first rule
 * that matches, so the narrower rules come before `operators`.
 */
import type { VitePWAOptions } from 'vite-plugin-pwa';

type RuntimeCaching = NonNullable<NonNullable<VitePWAOptions['workbox']>['runtimeCaching']>;

export const RUNTIME_CACHING: RuntimeCaching = [
  // (feature/weapons) the kit's weapon meshes (rifle, pistolSd, knife: 0.6-7 MB each) in a cache of their own, so they
  // never push Wren's LODs out of hers (6 entries = two builds of three files)
  {
    urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/(rifle|pistolSd|knife)-[^/]+\.glb$/.test(url.pathname),
    handler: 'CacheFirst',
    options: {
      cacheName: 'weapons',
      expiration: { maxEntries: 6 },
      cacheableResponse: { statuses: [200] },
    },
  },
  // (guard-models G7) the guard figures (three bases x LOD0-2 + the shield's three, `guard-*.glb`) in a cache of their
  // own, so they never push Wren's LODs out of hers (24 entries = two builds of twelve files); warmed like hers
  // (`warmPlayLods`, guardBody.ts: LOD2 first; every play file at the menu, `warmGuardFiles`). Never filled with
  // ?guardmodels=0 (flag off: no guard file is
  // fetched, none precached). The regex is `GUARD_ASSET_URL` (src/pwa/precacheGlobs.ts) written out: the test pins them
  // equal.
  {
    urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/guard-[^/]+\.glb$/.test(url.pathname),
    handler: 'CacheFirst',
    options: {
      cacheName: 'guards',
      expiration: { maxEntries: 24 },
      cacheableResponse: { statuses: [200] },
    },
  },
  {
    urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/[^/]+\.glb$/.test(url.pathname),
    handler: 'CacheFirst',
    options: {
      cacheName: 'operators',
      expiration: { maxEntries: 8 },
      cacheableResponse: { statuses: [200] },
    },
  },
];
