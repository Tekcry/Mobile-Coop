/**
 * The service worker's precache lists (`vite.config.ts` workbox `globPatterns` / `globIgnores`), kept here so a unit test
 * (`tests/guardAssetsOffline.test.ts`) globs them the way workbox does. No imports: vite.config.ts loads it in Node.
 *
 * (guard-models) The guard figures' files (`src/operators/assets/guards/`: 12 GLBs, ~29 MB, KTX2 textures inside) are
 * never precached: they are fetched on demand, never with `?guardmodels=0` (`flags.guardModels`: `GuardBody`, `warmGuardModels`,
 * the helmet drop's mesh), then kept by the `guards` runtime rule (src/pwa/runtimeCaching.ts). With the flag off nothing
 * asks for them.
 * The `.glb` files are not in `PRECACHE_GLOBS` anyway; the ignores keep them out should a pattern ever take `.glb`.
 */

/** Precached: the app shell, the menu font, the music tracks and the movement / weapon sprites (offline play). */
export const PRECACHE_GLOBS: readonly string[] = [
  '**/*.{js,css,html,wasm,png,svg,webmanifest,json,ttf}',
  '**/music-*.mp3',
  'assets/foley-*.mp3',
  'assets/weapons-*.mp3',
];

/** Never precached (workbox's default `**\/node_modules/**\/*` kept): the guard figures' files. */
export const PRECACHE_IGNORES: readonly string[] = ['**/node_modules/**/*', '**/guard-*.glb', '**/guard-*.ktx2'];

/**
 * A guard figure file (`/assets/guard-<name>-<hash>.glb`). The `guards` runtime rule writes this regex out as a literal
 * (a worker rule cannot refer to an import); tests/swRuntimeCaching.test.ts pins the two equal.
 */
export const GUARD_ASSET_URL = /\/assets\/guard-[^/]+\.glb$/;
