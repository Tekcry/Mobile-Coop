// Selection wheel shots (wheel-ui): serves dist/ with `vite preview`, opens Marlow Yard, holds the wheel open (as
// e2e-gadgets does) with the FPS banner on and a segment highlighted, and shoots it at 16:9 and 2.17:1 (phone landscape):
// <dir>/wheel-<suffix>-<w>x<h>.png. Needs a prior `npm run build`. GPU: E2E_GPU=1 on port 4189. Never headed.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 900 node scripts/archive/wheel-shots.mjs docs/wheel-ui/shots after
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { launch } from '../e2e-lib.mjs';

const [dir = 'docs/wheel-ui/shots', suffix = 'after'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const SIZES = [
  [1920, 1080],
  [2170, 1000],
];

// vite --strictPort exits silently when the port is taken, and the other server would answer: refuse up front
if (await fetch(URL).then(() => true, () => false)) { console.error(`wheel-shots: port ${PORT} already in use`); process.exit(2); }
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`wheel-shots: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 900 s'), 900_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');
if (server.exitCode !== null) await fail('own preview server exited (port taken?)');
if ((await (await fetch(URL)).text()) !== readFileSync('dist/index.html', 'utf8')) await fail('served index.html is not this dist');
console.log('wheel-shots: served build verified');

mkdirSync(dir, { recursive: true });
let bad = 0;
for (const [w, h] of SIZES) {
  const l = await launch({ url: URL, params: 'autostart=ctcourse&mode=course', viewport: { width: w, height: h } });
  browser = l.browser;
  const page = l.page;
  try {
    await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.world, null, { timeout: 180_000 });
    await page.waitForTimeout(3000);
    const info = await page.evaluate(async () => {
      const a = globalThis.__app;
      const g = a.current;
      const st = a.input.state;
      a.debug.toggle(true, true); // Settings > Show FPS overlay
      a.input.setMode('gamepad');
      st.set('t', 'gadgetWheel', true); // held past the tap window: the live loop opens the wheel
      for (let i = 0; i < 20 && !g.gadgets.wheelOpen; i++) await new Promise((res) => setTimeout(res, 100));
      // highlight a gadget (the flashbang when the kit has one), as the stick would
      const ring = g.gadgets.ring;
      let idx = ring.findIndex((s) => s.kind === 'gadget' && s.id === 'flash');
      if (idx < 0) idx = Math.min(1, ring.length - 1);
      const ang = (idx / ring.length) * Math.PI * 2;
      // (sector-fixes W) the pad's stick position is the cursor (absolute; let go = the vision slot)
      st.stick.x = Math.sin(ang);
      st.stick.y = Math.cos(ang);
      await new Promise((res) => setTimeout(res, 1500));
      const rr = document.querySelector('.selection-wheel .sw-ring')?.getBoundingClientRect();
      return { open: g.gadgets.wheelOpen, seg: g.gadgets.sel.seg, d: rr ? Math.round(rr.width) : 0, fps: document.querySelector('.debug-overlay pre')?.textContent ?? '' };
    });
    const file = `${dir}/wheel-${suffix}-${w}x${h}.png`;
    await page.screenshot({ path: file });
    console.log(`${file}  open ${info.open}  seg ${info.seg}  diameter ${info.d}px  banner "${info.fps}"`);
    if (!info.open) bad++;
    if (l.errors.length) console.log(l.errors.slice(0, 5).join('\n'));
  } catch (e) {
    bad++;
    console.error(`wheel-shots ${w}x${h}: ${String(e?.message ?? e)}`);
  }
  await browser.close();
  browser = null;
}
clearTimeout(kill);
stop();
process.exit(bad ? 1 : 0);
