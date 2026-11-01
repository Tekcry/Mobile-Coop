// Tracked GPU look script: Warehouse lamps shots (warehouse-lamps, PR #59): the Sector Ops warehouse at Epic, vision off, four photo-freeze views:
// the ceiling fittings of sections 1, 2 and 3 seen from below (are any floating?) and one under the translucent roof
// sheets. Records draw calls per view, one PNG per view and one labelled sheet: <dir>/sheet-lamps-epic.png.
// Serves dist/ with `vite preview` (needs a prior `npm run build`). GPU: E2E_GPU=1 on port 4189. Never headed.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 1200 node scripts/lamps-shots.mjs docs/archive/warehouse-lamps/shots
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { launch } from './e2e-lib.mjs';

const [dir = 'docs/archive/warehouse-lamps/shots'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const GFX = 'epic';
// The whole warehouse is built at once (a section change only moves guards and doors), so every view is a teleport.
const QUERY = 'autostart=warehouse&mode=clear';

// name, player feet [x, y, z], camera [x, y, z], target [x, y, z]; lamp positions are the S*_LIGHT_PASS tables
const ROWS = [
  // S1 workshop (room x 8-24, z -18 - -8.8; the old spot, x 6, was the office corridor behind a wall): camera at the west end, clear of the desk (12.5, -14) and lockers (8.45, -16.6); pendants (11.5, 4, -12.5), (17.5, 4, -12.5), (22.8, 4, -11.6) and the catwalk lamps at y 5.1 (z -9.7)
  ['s1-workshop-ceiling', [10.5, 0, -16], [10.5, 1.7, -16], [18, 3.6, -12.5]],
  // S2 aisle x -12.6: pendants (-12.6, 2.6, -3.6), (-12.6, 3, 3), (-12, 3, 12.7), roof-strip lamps beyond (y 5.8)
  ['s2-aisle-ceiling', [-12.5, 0, -5.4], [-12.5, 1.7, -5.4], [-12.4, 3.4, 8]],
  // S3 assembly hall: lamps (4, 3.6, 7), (7.2, 3.6, 9.6), (5, 4.4, 10.6), (-1, 3.6, 10.8)
  ['s3-hall-ceiling', [1.5, 0, 4], [1.5, 1.7, 4], [6, 3.9, 9]],
  // under the roof sheet strip z 10.8 - 12 (top y 6.28) with the S3 lamps (13.2, 5.4, 10.8), (13.8, 5.8, 12.6), (16.9, 5.6, 12.9)
  ['s3-under-roof-sheets', [14, 0, 8], [14, 4.0, 8], [15, 6.1, 11.6]],
];

// vite --strictPort exits silently when the port is taken, and the other server would answer: refuse up front
if (await fetch(URL).then(() => true, () => false)) { console.error(`lamps-shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`lamps-shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 1200 s'), 1_200_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
console.log('lamps-shots: served build verified');

mkdirSync(dir, { recursive: true });
const l = await launch({ url: URL, params: `${QUERY}&gfx=${GFX}` });
browser = l.browser;
const page = l.page;
const shots = [];
try {
  await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
  await page.waitForTimeout(3000);
  for (const [name, p, c, t] of ROWS) {
    const draws = await page.evaluate(async ([p, c, t]) => {
      const g = globalThis.__app.current;
      const V = g.player.position.constructor;
      g.photoFreeze(false);
      document.body.classList.remove('photo-mode');
      g.player.controller.teleport(new V(p[0], p[1], p[2]), Math.PI / 2);
      g.vision.set('off');
      await new Promise((res) => setTimeout(res, 900));
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      const cam = g.photoCamera();
      cam.position.set(c[0], c[1], c[2]);
      cam.setTarget(new V(t[0], t[1], t[2]));
      for (let i = 0; i < 40 && !g.scene.isReady(); i++) await new Promise((res) => setTimeout(res, 250));
      await new Promise((res) => setTimeout(res, 2000));
      // draw calls of the frozen view: the median of a few frames
      const eng = g.scene.getEngine();
      const n = [];
      // the counter only grows here (nothing resets it per frame): take per-frame deltas
      await new Promise((res) => requestAnimationFrame(res));
      let prev = eng._drawCalls.current;
      for (let i = 0; i < 7; i++) {
        await new Promise((res) => requestAnimationFrame(res));
        const cur = eng._drawCalls.current;
        n.push(cur >= prev ? cur - prev : cur);
        prev = cur;
      }
      n.sort((a, b) => a - b);
      return n[3];
    }, [p, c, t]);
    const file = `${dir}/lamps-${name}-${GFX}.png`;
    await page.screenshot({ path: file });
    shots.push([`${name} (${GFX}, ${draws} draws)`, file]);
    console.log(`${name} draws=${draws}`);
  }
  if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
} catch (e) {
  await fail(`${QUERY} ${GFX}: ${String(e?.message ?? e)}`);
}
// the contact sheet: a labelled 2-column grid
const sp = await l.ctx.newPage();
const cells = shots.map(([label, f]) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${label}</figcaption></figure>`).join('');
await sp.setViewportSize({ width: 1600, height: 400 });
await sp.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}</style><main>${cells}</main>`);
await sp.waitForTimeout(500);
await sp.screenshot({ path: `${dir}/sheet-lamps-${GFX}.png`, fullPage: true });
console.log(`${dir}/sheet-lamps-${GFX}.png`);
await browser.close();
browser = null;
clearTimeout(kill);
stop();
process.exit(0);
