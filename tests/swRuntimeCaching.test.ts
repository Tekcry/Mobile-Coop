/**
 * (guard-models B1) The service worker's runtime cache rules (`src/pwa/runtimeCaching.ts`) as they land in `dist/sw.js`.
 *
 * workbox-build writes each `urlPattern` function into `sw.js` as its source text (`toString()`), without anything it
 * refers to. A rule that read an imported regex (`GUARD_ASSET_URL`) threw a ReferenceError in the worker for every
 * same-origin request reaching it, so nothing after it (the `operators` rule: Wren's LODs, the level kits) was cached.
 *
 * - Build-free: every `urlPattern` is a RegExp or a function whose source names only its own parameters (and worker
 *   globals); each function is rebuilt from its source in an empty context (what the worker gets) and routed: guard
 *   files to `guards`, weapons to `weapons`, every other GLB to `operators`, the rest and cross-origin files to none.
 * - Built worker (when `dist/sw.js` is newer than the rules): its routes are loaded in an empty context with a stub
 *   workbox and routed the same way; no `GUARD_ASSET_URL` in it, the guard regex literal is.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { GUARD_ASSET_URL } from '../src/pwa/precacheGlobs';
import { RUNTIME_CACHING } from '../src/pwa/runtimeCaching';

const ORIGIN = 'https://example.github.io';
const ASSETS = `${ORIGIN}/Mobile-Coop/assets/`;
const GUARD_DIR = fileURLToPath(new URL('../src/operators/assets/guards/', import.meta.url));
const GUARD_GLBS = readdirSync(GUARD_DIR).filter((f) => f.endsWith('.glb'));

/** Request URL -> the cache it must land in (null: no runtime rule takes it). */
const CASES: [string, string | null][] = [
  ...GUARD_GLBS.map((f): [string, string] => [`${ASSETS}${f.replace(/\.glb$/, '')}-Ab12_cD3.glb`, 'guards']),
  [`${ASSETS}wren-lod0-Gg77Hh88.glb`, 'operators'],
  [`${ASSETS}wren-hero-Gg77Hh88.glb`, 'operators'],
  [`${ASSETS}campus-kit-Xy12.glb`, 'operators'],
  [`${ASSETS}facility-props-Xy12.glb`, 'operators'],
  [`${ASSETS}rifle-Ii99Jj00.glb`, 'weapons'],
  [`${ASSETS}pistolSd-Ii99Jj00.glb`, 'weapons'],
  [`${ASSETS}knife-Ii99Jj00.glb`, 'weapons'],
  [`${ASSETS}guard-x.json`, null],
  // (map-ready S4) the shipped campus lamps and their manifest
  [`${ORIGIN}/Mobile-Coop/bakes/tallowWharf-1x2y3z-s0.bin.gz`, 'bakes'],
  [`${ORIGIN}/Mobile-Coop/preview/bakes/tallowWharf-1x2y3z-s5.bin.gz`, 'bakes'],
  [`${ORIGIN}/Mobile-Coop/bakes/tallowWharf.json`, 'bakes-manifest'],
  ['https://cdn.example.com/bakes/tallowWharf-1x2y3z-s0.bin.gz', null],
  ['https://cdn.example.com/bakes/tallowWharf.json', null],
  [`${ASSETS}index-Q1w2E3r4.js`, null],
  [`${ORIGIN}/Mobile-Coop/index.html`, null],
  ['https://cdn.example.com/assets/guard-average-lod0-Ab12.glb', null],
  ['https://cdn.example.com/assets/wren-lod0-Ab12.glb', null],
];

type Matcher = (o: { url: URL; sameOrigin: boolean; request: object; event: object }) => unknown;
interface Route { match: unknown; cacheName: string }

const isRegExp = (v: unknown): v is RegExp => Object.prototype.toString.call(v) === '[object RegExp]';

/** Workbox's router: the first route that matches wins (a RegExp matches `href`; cross-origin only from index 0). */
function routeOf(routes: readonly Route[], href: string): string | null {
  const url = new URL(href);
  const sameOrigin = url.origin === ORIGIN;
  for (const r of routes) {
    let hit = false;
    if (isRegExp(r.match)) {
      const m = r.match.exec(url.href);
      hit = m !== null && (sameOrigin || m.index === 0);
    } else if (typeof r.match === 'function') {
      hit = Boolean((r.match as Matcher)({ url, sameOrigin, request: {}, event: {} }));
    }
    if (hit) return r.cacheName;
  }
  return null;
}

/** The names a function's source uses that are not its parameters, keywords or worker globals. */
const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'void', 'new', 'return', 'const', 'let', 'if', 'else']);
const WORKER_GLOBALS = new Set(['self', 'location', 'URL', 'RegExp', 'Boolean', 'String']);
function freeNames(src: string): string[] {
  const arrow = src.indexOf('=>');
  const params = new Set((arrow >= 0 ? src.slice(0, arrow) : src.slice(0, src.indexOf(')') + 1)).match(/[A-Za-z_$][\w$]*/g) ?? []);
  const body = (arrow >= 0 ? src.slice(arrow + 2) : src.slice(src.indexOf(')') + 1))
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '""')
    .replace(/\/(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n[])+\/[dgimsuy]*/g, '0');
  const out = new Set<string>();
  for (const m of body.matchAll(/(?<![.\w$])[A-Za-z_$][\w$]*/g)) {
    const n = m[0];
    if (!params.has(n) && !KEYWORDS.has(n) && !WORKER_GLOBALS.has(n) && n !== 'function') out.add(n);
  }
  return [...out];
}

/** Each rule as the worker gets it: a function rebuilt from its source text in an empty context, a RegExp as is. */
const serialised: Route[] = RUNTIME_CACHING.map((r) => ({
  match: typeof r.urlPattern === 'function' ? runInNewContext(`(${r.urlPattern.toString()})`, {}) : r.urlPattern,
  cacheName: r.options?.cacheName ?? '',
}));

describe('service worker runtime rules: self-contained', () => {
  it('every urlPattern is a RegExp or a function that names only its own parameters', () => {
    expect(RUNTIME_CACHING.length).toBe(5);
    for (const r of RUNTIME_CACHING) {
      if (isRegExp(r.urlPattern)) continue;
      expect(typeof r.urlPattern).toBe('function');
      expect([r.options?.cacheName, freeNames(String(r.urlPattern))]).toEqual([r.options?.cacheName, []]);
    }
  });

  it('the name check and the empty-context rebuild both catch an outer name (the B1 shape)', () => {
    const b1 = '({ url, sameOrigin }) => sameOrigin && GUARD_ASSET_URL.test(url.pathname)';
    expect(freeNames(b1)).toEqual(['GUARD_ASSET_URL']);
    const rebuilt = runInNewContext(`(${b1})`, {}) as Matcher;
    expect(() => rebuilt({ url: new URL(`${ASSETS}wren-lod0-Gg77Hh88.glb`), sameOrigin: true, request: {}, event: {} })).toThrow(/GUARD_ASSET_URL/);
    expect(freeNames('({ url, sameOrigin }) => sameOrigin && /\\/assets\\/guard-[^/]+\\.glb$/.test(url.pathname)')).toEqual([]);
  });

  it('rebuilt from source in an empty context, every rule runs and routes each file to its cache', () => {
    for (const [href, cache] of CASES) expect([href, routeOf(serialised, href)]).toEqual([href, cache]);
  });

  it('the guards rule is GUARD_ASSET_URL written out', () => {
    const guards = RUNTIME_CACHING.find((r) => r.options?.cacheName === 'guards');
    expect(String(guards?.urlPattern)).toContain(GUARD_ASSET_URL.source);
  });
});

const SW = fileURLToPath(new URL('../dist/sw.js', import.meta.url));
const RULES = fileURLToPath(new URL('../src/pwa/runtimeCaching.ts', import.meta.url));
const freshBuild = existsSync(SW) && statSync(SW).mtimeMs >= statSync(RULES).mtimeMs;

describe('service worker runtime rules: the built dist/sw.js', () => {
  it.skipIf(!freshBuild)('loads its routes in an empty context and routes each file to its cache', () => {
    const src = readFileSync(SW, 'utf8');
    expect(src).not.toContain('GUARD_ASSET_URL');
    expect(src).toContain(GUARD_ASSET_URL.source);
    // a stub workbox: registerRoute records (matcher, handler); every other export is a constructor keeping its options
    const routes: Route[] = [];
    function Stub(this: { opts: unknown }, opts: unknown): void { this.opts = opts; }
    const workbox = new Proxy({}, {
      get: (_t, k) => (k === 'registerRoute'
        ? (match: unknown, handler?: { opts?: { cacheName?: string } }) => {
          if (isRegExp(match) || typeof match === 'function') routes.push({ match, cacheName: handler?.opts?.cacheName ?? '' });
        }
        : Stub),
    });
    let factory: ((wb: unknown) => void) | null = null;
    const define = (_deps: unknown, f: (wb: unknown) => void): void => { factory = f; };
    runInNewContext(src, { self: { define, addEventListener: () => undefined }, define });
    expect(factory).not.toBeNull();
    (factory as unknown as (wb: unknown) => void)(workbox);
    expect(routes.map((r) => r.cacheName)).toEqual(['bakes', 'bakes-manifest', 'weapons', 'guards', 'operators']);
    for (const [href, cache] of CASES) expect([href, routeOf(routes, href)]).toEqual([href, cache]);
  });
});
