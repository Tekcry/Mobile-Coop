// Offline + persistence hardening:
//  1. First load online installs the service worker and precaches the whole build.
//  2. With the network cut, a reload (and a deep link with ?autostart) still boots and plays.
//  3. An old (v1) save written straight into IndexedDB is migrated on boot, backed up, and kept after reload.
//  4. Co-op shows its offline state instead of blocking anything.
//  5. (operators 11e fix r1, A109) Wren offline: one online start that reaches the menu with the worker in control
//     leaves her play LODs in the `operators` cache, and the offline match's player has her drawn (LOD2 loaded).
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const all = [];
const { browser, ctx, page, errors } = await launch({ url, params: '' });
const G = (f, a) => page.evaluate(f, a);
const booted = () => page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
try {
  console.log('service worker precache');
  await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready, null, { timeout: 30000 });
  await G(() => navigator.serviceWorker.ready);
  // the precache install finishes asynchronously: wait for the wasm + main chunks to be cached
  await page.waitForFunction(async () => {
    const names = await caches.keys();
    let n = 0;
    let wasm = false;
    for (const name of names) {
      const keys = await (await caches.open(name)).keys();
      n += keys.length;
      if (keys.some((r) => r.url.endsWith('.wasm'))) wasm = true;
    }
    return n >= 15 && wasm;
  }, null, { timeout: 60000, polling: 500 });
  // every file in the generated precache manifest must be in the cache (incl. the lazy co-op chunks)
  const res = await G(async () => {
    const sw = await (await fetch('sw.js')).text();
    const want = [...new Set([...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]))];
    const have = new Set();
    for (const name of await caches.keys()) for (const r of await (await caches.open(name)).keys()) have.add(new URL(r.url).pathname.replace(/^.*?\/(assets|icons)\//, '$1/').replace(/^\//, ''));
    const missing = want.filter((u) => ![...have].some((h) => h.endsWith(u)));
    return { want: want.length, missing };
  });
  assert(res.want >= 15 && res.missing.length === 0, `all ${res.want} precache entries cached (missing: ${res.missing.join(', ') || 'none'})`);
  // make sure the page is controlled (claim) before going offline
  if (!(await G(() => !!navigator.serviceWorker.controller))) {
    await page.reload();
    await booted();
  }
  assert(await G(() => !!navigator.serviceWorker.controller), 'page is controlled by the service worker');
  // (A109) once the worker controls the page, the game warms Wren's play LODs into its runtime cache (`?gfx=min`:
  // LOD2; the menu's own fetch ran before the worker took control, so it never reached the cache)
  // (sw-reload: the worker no longer reloads the page on activation, registerType 'prompt'; the wait is still retried
  // until its one 60 s deadline in case a reload ends it - the warm then runs again on the new page)
  const warmBy = Date.now() + 60000;
  let warm = null;
  let warmErr = '';
  while (!warm && Date.now() < warmBy) {
    warm = await page.waitForFunction(async () => {
      if (!(await caches.has('operators'))) return null;
      const keys = await (await caches.open('operators')).keys();
      const lod2 = keys.map((r) => r.url).find((u) => /\/wren-lod2[^/]*\.glb$/.test(u));
      return lod2 ? { lod2, n: keys.length } : null;
    }, null, { timeout: Math.max(1000, warmBy - Date.now()), polling: 500 }).then((h) => h.jsonValue()).catch(async (e) => {
      warmErr = String(e).split('\n')[0];
      await booted().catch(() => {});
      return null;
    });
  }
  if (!warm && warmErr) console.log(`  (warm wait: ${warmErr})`);
  assert(!!warm, `Wren's LOD2 is in the offline cache after one online start (${warm ? `${warm.n} entr${warm.n === 1 ? 'y' : 'ies'}` : 'missing'})`);
  // the menu body's load is done before the network goes (nothing in flight to cut off)
  await page.waitForFunction(() => {
    const f = window.__app?.current?.figure ?? null; // the menu stage's preview body (MenuState)
    return !f || (f.loaded & 8) !== 0;
  }, null, { timeout: 30000 }).catch(() => {});
  // (test-speed) and the menu theme's decode (its fetch reaches the worker's cache): going offline mid-fetch logged
  // "music menu TypeError: Failed to fetch" once (PR #34 full run, 2026-10-20)
  await page.waitForFunction(() => (window.__app?.music?.debug?.ready ?? '').split(',').includes('menu'), null, { timeout: 30000, polling: 200 }).catch(() => {});
  // (gm-polish) the menu warms every guard file play fetches (`warmGuardFiles`, after Wren's chain): the three bases'
  // LOD2 and the shield's LOD1 in the `guards` cache (and each base's LOD0 + LOD1 without `?gfx=min`: 10 files; this
  // page runs `?gfx=min`, launch adds it: 4), so the offline match below draws guard figures from it.
  // (gm-polish fix) polled with `page.evaluate` + a pause, not `waitForFunction`: Playwright never awaits a
  // waitForFunction predicate, so an async one counts its Promise as truthy and settles on its FIRST result (null
  // here: the suite failed in 8 s, never waiting). Retried to one deadline; the last error is printed.
  const guardsBy = Date.now() + 90000;
  let guards = null;
  let guardsSeen = [];
  let guardsErr = '';
  while (!guards && Date.now() < guardsBy) {
    const got = await G(async () => {
      const min = /[?&]gfx=min/.test(location.search);
      if (!(await caches.has('guards'))) return { min, names: [] };
      return { min, names: (await (await caches.open('guards')).keys()).map((r) => r.url.slice(r.url.lastIndexOf('/') + 1)) };
    }).catch(async (e) => {
      guardsErr = String(e).split('\n')[0];
      await booted().catch(() => {});
      return null;
    });
    if (got) {
      guardsSeen = got.names;
      const lod2 = got.names.filter((n) => /^guard-(average|lean|broad)-lod2/.test(n)).length;
      if (lod2 === 3 && got.names.some((n) => /^guard-shield_riot-lod1/.test(n)) && got.names.length >= (got.min ? 4 : 10)) guards = got.names;
    }
    if (!guards) await page.waitForTimeout(500);
  }
  const lod2s = guardsSeen.filter((n) => /^guard-(average|lean|broad)-lod2/.test(n)).length;
  assert(!!guards, `the menu warmed the guard files into the offline cache (${guardsSeen.length} files, ${lod2s} LOD2${guards ? '' : `: ${guardsSeen.join(', ') || 'none'}${guardsErr ? `; last error: ${guardsErr}` : ''}`})`);

  console.log('offline boot');
  await ctx.setOffline(true);
  await page.reload();
  await booted();
  const status = await G(() => document.getElementById('boot-status')?.textContent ?? '');
  assert(!/Failed/.test(status), `boots offline (${status})`);
  assert(await G(() => !!document.querySelector('.main-menu')), 'main menu offline');
  // (clean-up G2c) the guard match is the Test Chamber's test mode with its five squad guards (was the Warehouse mission); the
  // Infiltration match below stays on the Warehouse (the Infiltration mode goes in stage H)
  await page.goto(url + '?autostart=studio&mode=test&guards=1&gfx=min');
  await booted();
  // (load-latent-ui2) the match loads (shaders compile on the loading screen): 120 s, as the other match loads
  await page.waitForFunction(() => window.__app?.current?.enemyMgr, null, { timeout: 120000 });
  await G(() => window.__app.loop.stepHeadless(8));
  const alive = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive > 0, `a match runs offline (${alive} enemies)`);
  assert((await G(() => window.__app.current.hud['objective'].textContent)) === '', 'the test mode has no objective');
  // (A109) the player's body is Wren, loaded from the cache with no network (LOD2 = bit 1 << 3)
  // (load-latent-ui2) 120 s here and for the Infiltration player: the KTX2 transcode runs on the main thread, slow on a
  // loaded CPU
  const wren = await page.waitForFunction(() => {
    const f = window.__app.current.player.figure;
    return (f.loaded & 8) !== 0 ? { loaded: f.loaded, current: f.current } : null;
  }, null, { timeout: 120000, polling: 250 }).then((h) => h.jsonValue()).catch(() => null);
  assert(!!wren, `the offline player is Wren, drawn from the cache (loaded ${wren ? wren.loaded.toString(2) : 'none'}, LOD2 bit set)`);
  // (gm-polish) and the guards are their figures from the cache, not the merged body (LOD2 bit; the menu's warm)
  const gfig = await page.waitForFunction(() => {
    const figs = window.__app.current.enemyMgr.enemies.map((e) => e.gbody?.figure).filter((f) => f && !f.isDisposed);
    return figs.length && figs.every((f) => (f.loaded & 8) !== 0) ? figs.length : null;
  }, null, { timeout: 120000, polling: 250 }).then((h) => h.jsonValue()).catch(() => null);
  assert(!!gfig, `the offline guards draw their figures from the cache (${gfig ?? 'not all'} with LOD2)`);
  // an Infiltration mission (Warehouse) offline: objectives, guards, the download runs at the terminal
  await page.goto(url + '?autostart=warehouse&mode=infiltration&gfx=min');
  await booted();
  await page.waitForFunction(() => window.__app?.current?.mode?.id === 'infiltration', null, { timeout: 120000 });
  await G(() => window.__app.loop.stepHeadless(3));
  const inf = await G(() => ({ obj: window.__app.current.hud['objective'].textContent, guards: window.__app.current.enemyMgr.alive }));
  assert(inf.obj.length > 0 && inf.guards > 0, `an Infiltration mission runs offline ("${inf.obj}", ${inf.guards} guards)`);
  // (A109) Wren from the cache here too; her load (the KTX2 transcode runs on the main thread) is done before the
  // backgrounding check, so that check times the pause, not the transcode
  const infWren = await page.waitForFunction(() => (window.__app.current.player.figure.loaded & 8) !== 0, null, { timeout: 120000, polling: 250 }).then(() => true).catch(() => false);
  assert(infWren, 'the Infiltration player is Wren, drawn from the cache (LOD2)');

  console.log('backgrounding');
  await G(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForSelector('.pause-screen', { timeout: 5000 });
  assert(!(await G(() => window.__app.current.simulating)), 'switching away pauses the match');
  await G(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  console.log('co-op offline state');
  await page.goto(url + '?gfx=min');
  await booted();
  await G(() => window.dispatchEvent(new Event('offline')));
  await page.click('.main-menu .btn:has-text("Co-op")');
  await page.waitForSelector('.coop-offline', { timeout: 8000 });
  assert(true, 'co-op shows offline and does not block');
  await ctx.setOffline(false);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: '/tmp/e2e-offline-fail.png' }).catch(() => {});
} finally {
  all.push(...errors);
  await browser.close();
}

console.log('old save migration on boot');
{
  const { browser: br, page: pg, errors: er } = await launch({ url, params: '' });
  try {
    // write a v1 save directly into IndexedDB (as an old build would have), then reload
    await pg.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
    await pg.evaluate(async () => {
      // the running page must not flush its own profile over the old save on unload (pagehide flush)
      window.__app.save.readOnly = true;
      const V1 = { version: 1, name: 'Veteran', xp: 4321, money: 950, unlocked: ['weapon:rifle', 'weapon:pistol', 'weapon:smg'], upgrades: { rifle: { damage: 2, magazine: 1, recoil: 0, reload: 3 } } };
      await new Promise((res, rej) => {
        const r = indexedDB.open('shoulder-strike', 1);
        r.onsuccess = () => {
          const tx = r.result.transaction('profile', 'readwrite');
          tx.objectStore('profile').put(V1, 'main');
          tx.oncomplete = () => {
            r.result.close();
            res();
          };
          tx.onerror = () => rej(tx.error);
        };
        r.onerror = () => rej(r.error);
      });
    });
    await pg.reload();
    await pg.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
    const s = await pg.evaluate(() => window.__app.save.get());
    assert(s.version >= 4, `migrated to v${s.version}`);
    assert(s.profile.xp === 4321 && s.profile.credits === 950, 'xp and credits kept');
    // (the SMG was deleted with the CT kit, G115: the v8 -> v9 step drops its unlock)
    assert(s.weapons.rifle.upgrades.damage === 2 && s.unlocks.includes('weapon:rifle') && !s.unlocks.includes('weapon:smg'), 'upgrades and unlocks kept, the deleted gun dropped');
    assert(s.avatar.body === 'average', 'new fields defaulted');
    const backups = await pg.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('shoulder-strike', 1);
      r.onsuccess = () => {
        const q = r.result.transaction('backups').objectStore('backups').getAllKeys();
        q.onsuccess = () => res(q.result.length);
      };
    }));
    assert(backups >= 1, `pre-migration backup kept (${backups})`);
    await pg.evaluate(() => window.__app.save.flush());
    await pg.reload();
    await pg.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 60000 });
    assert((await pg.evaluate(() => window.__app.save.get().profile.xp)) === 4321, 'migrated save persists across reloads');
  } catch (e) {
    failed = true;
    console.error(String(e));
  } finally {
    all.push(...er);
    await br.close();
  }
}

const real = all.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext|Failed to load resource|net::ERR_INTERNET_DISCONNECTED/i.test(e));
if (real.length) {
  failed = true;
  console.error('console errors:\n' + real.join('\n'));
} else console.log('no console errors');
process.exit(failed ? 1 : 0);
