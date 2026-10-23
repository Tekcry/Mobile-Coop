// Marlow Yard shots (marlow-final 0d; course-ready S2 before): serves dist/ with `vite preview`, launches ONE headless
// browser, visits every shot vantage of the map (`SHOT_VANTAGES` in src/world/maps/ctcourse.ts: the facility's and each
// set part's `shotVantages`, read through Vite's SSR loader, so a set slice adds its shots in its own file), writes
// <dir>/<name>-<suffix>.png and prints `name meter field`. A row fails when |meter - field| > 0.02. Needs a prior
// `npm run build`. Never headed, no pointer lock. GPU shots run on the laptop through Character Build (4189).
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs docs/marlow-final/shots after [prefix]
//   prefix: only the vantages whose name starts with it (`a3-`, `f-`); default every vantage.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/marlow-final/shots', suffix = 'after', prefix = ''] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;

// name, player feet [x, y, z], camera [x, y, z], target [x, y, z]: from the map's own list
const ssr = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let ROWS = [];
try {
  const { SHOT_VANTAGES } = await ssr.ssrLoadModule('/src/world/maps/ctcourse.ts');
  ROWS = SHOT_VANTAGES.filter((v) => v.name.startsWith(prefix)).map((v) => [v.name, v.feet, v.cam, v.target]);
} finally {
  await ssr.close();
}
if (!ROWS.length) {
  console.error(`shots-ctcourse: no shot vantage starts with '${prefix}'`);
  process.exit(2);
}

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`shots-ctcourse: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 900 s'), 900_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
// a server already on the port (our --strictPort one then exits) would be shot instead of this build
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');

mkdirSync(dir, { recursive: true });
let bad = 0;
try {
  const l = await launch({ url: URL, params: 'autostart=ctcourse&mode=course&gfx=epic' });
  browser = l.browser;
  const page = l.page;
  await page.waitForFunction(() => globalThis.__app?.current?.world?.lightField, null, { timeout: 180_000 });
  await page.waitForTimeout(3000);
  for (const [name, p, c, t] of ROWS) {
    const r = await page.evaluate(async ([p, c, t]) => {
      const g = globalThis.__app.current;
      const V = g.player.position.constructor;
      g.photoFreeze(false);
      document.body.classList.remove('photo-mode');
      g.team?.end?.(true);
      g.player.controller.teleport(new V(p[0], p[1], p[2]), Math.PI / 2);
      // the meter updates every 0.1 s of sim time, and at Epic boot 800 ms of wall time can be under 0.1 s of sim:
      // wait for 0.3 s of sim time (the game clock), with a 20 s wall-time cap
      const t0 = g.time;
      const w0 = performance.now();
      while (g.time - t0 < 0.3 && performance.now() - w0 < 20000) await new Promise((res) => setTimeout(res, 50));
      const meter = g.lightLevel;
      const field = g.world.lightField.bodyLevel(p[0], p[1], p[2], 1.7);
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      const cam = g.photoCamera();
      cam.position.set(c[0], c[1], c[2]);
      cam.setTarget(new V(t[0], t[1], t[2]));
      for (let i = 0; i < 40 && !g.scene.isReady(); i++) await new Promise((res) => setTimeout(res, 250));
      await new Promise((res) => setTimeout(res, 2500));
      return { meter, field, lamps: !!g.world.lamps };
    }, [p, c, t]);
    await page.screenshot({ path: `${dir}/${name}-${suffix}.png` });
    const ok = Math.abs(r.meter - r.field) <= 0.02 && r.lamps;
    if (!ok) bad++;
    console.log(`${name} ${r.meter.toFixed(3)} ${r.field.toFixed(3)}${r.lamps ? '' : ' NO-BAKED-LAMPS'}${ok ? '' : ' FAIL'}`);
  }
  if (l.errors.length) console.log(l.errors.join('\n'));
} catch (e) {
  await fail(String(e?.stack ?? e));
}
clearTimeout(kill);
await browser.close();
stop();
process.exit(bad ? 1 : 0);
