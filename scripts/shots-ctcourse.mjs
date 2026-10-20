// Marlow Yard light shots (course-ready S2, docs/course-ready/LIGHT.md 4b): serves dist/ with `vite preview`, launches ONE
// headless browser, visits every row, writes <dir>/<name>-<suffix>.png and prints `name meter field`.
// A row fails when |meter - field| > 0.02. Needs a prior `npm run build`. Never headed, no pointer lock.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/shots-ctcourse.mjs docs/course-ready/shots after
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/course-ready/shots', suffix = 'after'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;

// name, player feet [x, y, z], camera [x, y, z], target [x, y, z]
const ROWS = [
  ['s1-bay', [3.5, 0, 12.8], [0.8, 2.2, 1.5], [9, 0.8, 9]],
  ['a1-airlock', [19.5, 0, 7], [16.7, 1.8, 4.5], [21.8, 0.6, 8]],
  ['s2-wall', [29.4, 0, 7], [26, 2.4, 2.5], [31, 2.6, 7]],
  ['s2-top', [31, 4.5, 7], [27.5, 6.0, 9.5], [31.5, 4.8, 7]],
  ['s3-camera', [52, 0, 7], [46.5, 1.9, 3], [52.6, 1.8, 7]],
  ['s4-laser', [73.4, 0, 7], [70, 2.0, 2], [75, 0.9, 7]],
  ['s4-release', [78, 0, 12.8], [75.8, 1.9, 9], [78, 1.3, 13.8]],
  ['s5-roof', [99, 4.5, 3.6], [97.2, 6.6, 1.0], [100.5, 4.4, 7]],
  ['s5-hatch', [102.4, 4.5, 2.3], [101, 6.2, 4.6], [102.4, 4.4, 1.3]],
  ['s5-backroom', [102.4, 0, 1.0], [103.6, 2.6, 5.5], [102.4, 1.2, 0.3]],
  ['s5-medkit', [103, 0, 12.8], [101.2, 1.8, 9], [103, 1.2, 13.6]],
  ['s6-scanner-a', [115, 0, 1.0], [112.5, 1.8, 4.5], [115, 1.4, 0.2]],
  ['s6-scanner-b', [115, 0, 13.0], [112.5, 1.8, 9.5], [115, 1.4, 13.8]],
  ['s7-rope', [141, 4.5, 7], [137, 3.6, 3.2], [141, 4.6, 7]],
  ['s7-stair', [145, 0, 1], [146, 2.6, 5], [142.5, 1.6, 1]],
  ['s8-exit', [167.5, 0, 7], [164, 2.2, 2.5], [167.5, 0.4, 7]],
  ['yard-look', [64, 0, 7], [60, 5.5, 13], [75, 0, 3]],
];

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
      await new Promise((res) => setTimeout(res, 800));
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
