// Offline + persistence hardening:
//  1. First load online installs the service worker and precaches the whole build.
//  2. With the network cut, a reload (and a deep link with ?autostart) still boots and plays.
//  3. An old (v1) save written straight into IndexedDB is migrated on boot, backed up, and kept after reload.
//  4. Co-op shows its offline state instead of blocking anything.
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

  console.log('offline boot');
  await ctx.setOffline(true);
  await page.reload();
  await booted();
  const status = await G(() => document.getElementById('boot-status')?.textContent ?? '');
  assert(!/Failed/.test(status), `boots offline (${status})`);
  assert(await G(() => !!document.querySelector('.main-menu')), 'main menu offline');
  await page.goto(url + '?autostart=warehouse&mode=wave&gfx=min');
  await booted();
  await page.waitForFunction(() => window.__app?.current?.enemyMgr, null, { timeout: 60000 });
  await G(() => window.__app.loop.stepHeadless(8));
  const alive = await G(() => window.__app.current.enemyMgr.alive);
  assert(alive > 0, `wave match runs offline (${alive} enemies)`);
  // an Infiltration mission (Warehouse) offline: objectives, guards, the download runs at the terminal
  await page.goto(url + '?autostart=warehouse&mode=infiltration&gfx=min');
  await booted();
  await page.waitForFunction(() => window.__app?.current?.mode?.id === 'infiltration', null, { timeout: 60000 });
  await G(() => window.__app.loop.stepHeadless(3));
  const inf = await G(() => ({ obj: window.__app.current.hud['objective'].textContent, guards: window.__app.current.enemyMgr.alive }));
  assert(inf.obj.length > 0 && inf.guards > 0, `an Infiltration mission runs offline ("${inf.obj}", ${inf.guards} guards)`);

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
    assert(s.weapons.rifle.upgrades.damage === 2 && s.unlocks.includes('weapon:smg'), 'upgrades and unlocks kept');
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
