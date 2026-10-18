// CT prototype B1: Marlow Yard (`ctcourse`), the CT training course, on two pages over `?net=local&autostart=ctcourse&mode=course`
// (the first tab hosts, the second joins). Both pages load the map; both walk (teleport) through the eight stations in
// order: station 1 read the three panels, then each station's placeholder gate (pair plates, hold consoles, the annex's
// grid lever) opens and both pages see its door unlock, then both stand on the airlock pad and the course moves to the
// next bay. At the end the course refuses with ONE player in the exit zone and completes only when BOTH are in it (G138).
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const PITCH = 22;
const Q = 'net=local&autostart=ctcourse&mode=course';

// (G13) polled from here: the in-page polling does not run on a background page
async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(`!!(${fn})(${JSON.stringify(arg) ?? 'undefined'})`).catch(() => false)) return;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

const { browser, ctx, page: A, errors: eA } = await launch({ url, params: Q });
let B = null;
let eB = [];
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);

// the host page is in the background once the client page opens: a pump steps its sim headless (as e2e-course)
let pumpOn = false;
let pumping = false;
const pump = setInterval(async () => {
  if (!pumpOn || pumping) return;
  pumping = true;
  try {
    await A.evaluate(() => {
      if (window.__raf === undefined) {
        window.__raf = 0;
        const f = () => {
          window.__raf++;
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      }
      const now = performance.now();
      const last = window.__pumpT ?? now;
      const idle = window.__pumpRaf === window.__raf;
      window.__pumpT = now;
      window.__pumpRaf = window.__raf;
      if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
    });
  } catch {}
  pumping = false;
}, 40);

const use = (P, id) =>
  P.evaluate((id) => {
    const it = window.__app.current.interactables?.items.find((i) => i.id === id);
    if (!it) return 'missing';
    if (!it.enabled) return 'disabled';
    it.onUse(it);
    return 'ok';
  }, id);
const hostDebug = () => GA(() => window.__course.debug());
async function moveHost(x, z) {
  await GA(([x, z]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, 0.1, z), Math.PI / 2); }, [x, z]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `course sees the host at ${x}, ${z}`);
}
async function moveClient(x, z) {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(([x, z]) => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(x, 0.1, z), Math.PI / 2); }, [x, z]);
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; const f = window.__course.state.feet; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4 && Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `host sees the client at ${x}, ${z}`);
}
const doorIndex = (cid) => GA((cid) => { const g = window.__app.current; const aid = g.world.layout.course.doors[cid]; return g.world.doors.list.find((d) => d.anchor.id === aid).index; }, cid);

/** Open a station's placeholder gate: plates A (host, south wall) and B (client, north wall), or a held console. */
async function openGate(n, i) {
  const x0 = PITCH * i;
  const door = `S${n}-door`;
  if (n === 2 || n === 4 || n === 5 || n === 6) {
    await moveHost(x0 + 5, 1.6);
    await moveClient(x0 + 5, 12.4);
    // pressed together inside the 1 s pair window
    const [ra, rb] = await Promise.all([use(A, `c-sw-s${n}-a`), use(B, `c-sw-s${n}-b`)]);
    assert(ra === 'ok' && rb === 'ok', `station ${n}: both plates pressed (${ra}, ${rb})`);
    await until(A, (g) => window.__course.debug().gates[g], `g-s${n}`, 8000, `station ${n} pair gate opens`);
  } else {
    await moveHost(x0 + 5, 1.6);
    await moveClient(x0 + 5, 4);
    assert((await use(A, `c-h-s${n}`)) === 'ok', `station ${n}: the host holds the console`);
    await until(A, (g) => window.__course.debug().gates[g], `g-s${n}`, 8000, `station ${n} hold gate opens`);
  }
  if (n === 5) {
    await moveHost(x0 + 11, 12.4);
    assert((await use(A, 'c-sw-s5-hack')) === 'ok', 'station 5: the grid computer is hacked');
    await until(A, () => window.__course.debug().gates['g-s5-grid'], null, 8000, 'the grid gate opens');
  }
  const di = await doorIndex(door);
  await until(B, (i) => !window.__course.wire.locks.includes(i), di, 8000, `client sees ${door} unlock`);
}

/** Both onto the airlock pad after bay index i: the course moves to bay i + 1. */
async function throughAirlock(i) {
  const x = PITCH * i + 19;
  await moveHost(x, 6.5);
  await moveClient(x, 7.6);
  await until(A, (b) => window.__course.debug().bay === b, i + 1, 90000, `the course reaches station ${i + 2}`);
}

try {
  console.log('walk URL: host and client on Marlow Yard');
  await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
  const opened = await openPage(ctx, url, Q);
  B = opened.page;
  eB = opened.errors;
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'ctcourse', null, 60000, `${tag} in the ctcourse match`);
  pumpOn = true;
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 20000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 30000, 'client has the course state');
  assert((await hostDebug()).bay === 0, 'the course starts at station 1');
  await GA(() => { window.__app.current.target.damageMul = 0; });

  console.log('station 1: the three panels, both players');
  for (const k of [1, 2, 3]) {
    await moveHost(4 * k, 12.4);
    await moveClient(4 * k, 12.4);
    assert((await use(A, `c-sw-p${k}`)) === 'ok' && (await use(B, `c-sw-p${k}`)) === 'ok', `panel ${k} read by both`);
  }
  await throughAirlock(0);

  for (let n = 2; n <= 8; n++) {
    const i = n - 1;
    console.log(`station ${n}: placeholder gate`);
    await openGate(n, i);
    if (n < 8) await throughAirlock(i);
  }

  console.log('exit zone: both must be in it');
  const zx = PITCH * 7 + 13.5;
  await moveHost(zx, 7);
  await moveClient(PITCH * 7 + 12, 1.5);
  await new Promise((r) => setTimeout(r, 600));
  assert(!(await GA(() => window.__app.current.isEnded)), 'one player in the exit zone does not end the course');
  await moveClient(zx + 0.5, 6);
  await until(A, () => window.__app.current.isEnded, null, 15000, 'the course ends with both in the zone');
  assert(true, 'both players in the exit zone complete the course');

  const errs = [...eA, ...eB].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  try {
    console.error('host', JSON.stringify(await hostDebug()));
    if (B) console.error('client', JSON.stringify(await GB(() => window.__course?.debug?.())));
  } catch {}
  failed = true;
}
clearInterval(pump);
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-ctcourse OK');
