// Night vision shots (nv-pass): serves dist/ with `vite preview`, one headless browser per map and preset, each row shot
// with vision off and night vision on, then one labelled contact sheet per preset: <dir>/sheet-<suffix>-<gfx>.png.
// Needs a prior `npm run build`. GPU: E2E_GPU=1 on port 4189. Never headed, no pointer lock.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 1500 node scripts/archive/nv-shots.mjs docs/archive/nv-pass/shots before epic,medium,min
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { launch } from '../e2e-lib.mjs';

const [dir = 'docs/archive/nv-pass/shots', suffix = 'after', gfxList = 'epic,medium,min'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;

// map query, then rows: name, player feet [x, y, z], camera [x, y, z], target [x, y, z]
const MAPS = [
  ['autostart=ctcourse&mode=course', [
    ['yard-s1-bay', [3.5, 0, 12.8], [0.8, 2.2, 1.5], [9, 0.8, 9]],
    ['yard-s3-camera', [52, 0, 7], [46.5, 1.9, 3], [52.6, 1.8, 7]],
    ['yard-s5-backroom', [102.4, 0, 1.0], [103.6, 2.6, 5.5], [102.4, 1.2, 0.3]],
    ['yard-s7-stair', [145, 0, 1], [146, 2.6, 5], [142.5, 1.6, 1]],
    ['yard-look', [64, 0, 7], [60, 5.5, 13], [75, 0, 3]],
  ]],
  ['autostart=warehouseOps&mode=sector&sectorGuards=4', [
    ['wh-yard', [0, 0, -22], [-6, 2.5, -25], [2, 1, -21]],
    ['wh-goods-in', [-16, 0, -13], [-21, 2.2, -16.5], [-14, 1, -12]],
    ['wh-corridor', [0, 0, -12.3], [-6, 1.9, -12.3], [2, 1, -12.3]],
    ['wh-workshop', [14, 0, -13], [10, 2.2, -16.5], [16, 1, -12]],
  ]],
];

// vite --strictPort exits silently when the port is taken, and the other server would answer: refuse up front
if (await fetch(URL).then(() => true, () => false)) { console.error(`nv-shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`nv-shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 1500 s'), 1_500_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
console.log('nv-shots: served build verified');

mkdirSync(dir, { recursive: true });
for (const gfx of gfxList.split(',')) {
  const shots = [];
  let last = null;
  for (const [mi, [query, rows]] of MAPS.entries()) {
    const l = await launch({ url: URL, params: `${query}&gfx=${gfx}` });
    browser = l.browser;
    const page = l.page;
    try {
      await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
      await page.waitForTimeout(3000);
      for (const [name, p, c, t] of rows) {
        for (const mode of ['off', 'night']) {
          await page.evaluate(async ([p, c, t, mode]) => {
            const g = globalThis.__app.current;
            const V = g.player.position.constructor;
            g.photoFreeze(false);
            document.body.classList.remove('photo-mode');
            g.player.controller.teleport(new V(p[0], p[1], p[2]), Math.PI / 2);
            g.vision.set(mode);
            await new Promise((res) => setTimeout(res, 900));
            g.photoFreeze(true);
            document.body.classList.add('photo-mode');
            const cam = g.photoCamera();
            cam.position.set(c[0], c[1], c[2]);
            cam.setTarget(new V(t[0], t[1], t[2]));
            for (let i = 0; i < 40 && !g.scene.isReady(); i++) await new Promise((res) => setTimeout(res, 250));
            await new Promise((res) => setTimeout(res, 2000));
          }, [p, c, t, mode]);
          const file = `${dir}/${name}-${mode}-${suffix}-${gfx}.png`;
          await page.screenshot({ path: file });
          shots.push([`${name} ${mode} (${suffix}, ${gfx})`, file]);
          console.log(file);
        }
      }
      if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
    } catch (e) {
      console.error(`nv-shots ${query} ${gfx}: ${String(e?.message ?? e)}`);
    }
    if (mi < MAPS.length - 1) { await browser.close(); browser = null; } else last = l;
  }
  // the contact sheet: rows of [off, night] pairs, labelled
  const sp = await last.ctx.newPage();
  const cells = shots.map(([label, f]) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${label}</figcaption></figure>`).join('');
  await sp.setViewportSize({ width: 1600, height: 400 });
  await sp.setContent(`<style>body{margin:0;background:#111;color:#ddd;font:14px sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}</style><main>${cells}</main>`);
  await sp.waitForTimeout(500);
  await sp.screenshot({ path: `${dir}/sheet-${suffix}-${gfx}.png`, fullPage: true });
  console.log(`${dir}/sheet-${suffix}-${gfx}.png`);
  await browser.close();
  browser = null;
}
clearTimeout(kill);
stop();
process.exit(0);
