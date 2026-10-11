// Level editor controller test (ED2 Part C): every edit step uses the fake gamepad. Starts its own Vite dev server on
// a free port (the editor is dev-only, never in dist/). Never saves. `npm run e2e:editor`; SHOTS=<dir> keeps screenshots.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { assert, BTN, frames, launchOptions } from './e2e-lib.mjs';

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const port = await freePort();
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('vite did not start')), 60000);
  vite.stdout.on('data', (b) => { if (/ready in/.test(String(b))) { clearTimeout(t); res(); } });
});
const shots = process.env.SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
let saves = 0;
page.on('request', (r) => { if (r.url().includes('/__editor/save')) saves++; });
await page.addInitScript(() => {
  try { localStorage.clear(); indexedDB.deleteDatabase('kestrel-editor'); } catch {}
  const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: false, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: { playEffect: async () => { window.__rumbles = (window.__rumbles ?? 0) + 1; return 'complete'; } } };
  window.__pad = {
    connect() { pad.connected = true; },
    set(i, v) { pad.buttons[i] = { pressed: v > 0.5, touched: v > 0, value: v }; },
    axis(i, v) { pad.axes[i] = v; },
  };
  navigator.getGamepads = () => [pad.connected ? pad : null, null, null, null];
});

const E = (f, a) => page.evaluate(f, a);
const set = (b, v) => E(([b, v]) => window.__pad.set(b, v), [b, v]);
const axes = (x, y) => E(([x, y]) => { window.__pad.axis(0, x); window.__pad.axis(1, y); }, [x, y]);
const press = async (b) => { await set(b, 1); await frames(page, 3); await set(b, 0); await frames(page, 3); };
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
const st = () => E(() => { const ed = window.__editor; return { tool: ed.tool, layout: ed.prefs.layout, walls: ed.model.data.walls.length, ops: ed.model.data.openings.map((o) => o.type), dirty: ed.model.dirty, crumb: ed.pad.radial?.isOpen ? ed.pad.radial.breadcrumb.join(' > ') : null, hint: document.getElementById('hint').textContent, status: document.getElementById('status').textContent }; });
/** Holds Y, points the stick at each angle in turn (resting past the dwell), then releases Y. */
const radial = async (...angles) => {
  await set(BTN.Y, 1);
  await page.waitForFunction(() => window.__editor.pad.menuOpen, null, { timeout: 5000 }).catch(() => {});
  for (const [i, a] of angles.entries()) {
    const r = (a * Math.PI) / 180;
    await axes(Math.sin(r), -Math.cos(r));
    // each angle but a leaf at the end opens a submenu after the dwell (polled: frames are slow under software GL)
    await page.waitForFunction((n) => (window.__editor.pad.radial?.breadcrumb.length ?? 0) >= n, i + 1, { timeout: 4000 }).catch(() => {});
    await wait(120);
  }
};
const release = async () => { await set(BTN.Y, 0); await frames(page, 3); await axes(0, 0); await frames(page, 3); };

let failed = false;
try {
  await page.goto(`http://localhost:${port}/editor.html`);
  await page.waitForFunction(() => window.__editor?.pad && window.__editor.view.scene.meshes.some((m) => m.isReady(true)), null, { timeout: 90000 });
  await E(() => { const ed = window.__editor; ed.setLayout('3d'); ed.setLevel('G'); ed.controls.overlook(20, 20, 0, 30); });
  await E(() => window.__pad.connect());
  await press(BTN.LB);
  assert((await E(() => window.__editor.pad.device)) === 'pad', 'pad input switches the hint bar to the pad');
  assert(/Y hold/.test((await st()).hint), `hint bar shows pad buttons ("${(await st()).hint.slice(0, 80)}")`);
  await shot('hint-idle');

  console.log('radial: Build > Wall');
  await radial(45);
  await shot('radial-root');
  assert((await st()).crumb === 'Build', `dwell on Build opens it (${(await st()).crumb})`);
  await shot('radial-build');
  await shot('hint-menu');
  await axes(1, 0);
  await wait(150);
  await release();
  let s = await st();
  assert(s.tool === 'wall' && s.crumb === null, `release picks Wall (tool ${s.tool})`);

  console.log('draw a 6 m wall with the pad alone');
  const walls0 = s.walls;
  await press(BTN.A);
  for (let i = 0; i < 12; i++) await press(BTN.RIGHT);
  await shot('hint-draw');
  await press(BTN.A);
  const w = await E(() => { const ws = window.__editor.model.data.walls; const w = ws[ws.length - 1]; return { n: ws.length, len: Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), dz: w.b[1] - w.a[1] }; });
  assert(w.n === walls0 + 1 && Math.abs(w.len - 6) < 1e-6 && Math.abs(w.dz) < 1e-6, `a 6 m east-west wall (${w.n - walls0} new, ${w.len} m)`);

  console.log('undo with X, redo with X held');
  await press(BTN.X);
  assert((await st()).walls === walls0, 'X undoes the wall');
  await set(BTN.X, 1);
  await wait(700);
  await set(BTN.X, 0);
  await frames(page, 3);
  assert((await st()).walls === walls0 + 1, 'X held redoes it');

  console.log('View cycles 3D, Both, Plan');
  const seen = [];
  for (let i = 0; i < 3; i++) { await press(BTN.SELECT); seen.push((await st()).layout); }
  assert(seen.join(',') === 'both,plan,3d', `View cycles (${seen})`);

  console.log('Build > Door > Double door, placed with A');
  await radial(45, 180, 144);
  assert((await st()).crumb === 'Build > Door', `nested submenus (${(await st()).crumb})`);
  await shot('radial-door');
  await release();
  s = await st();
  assert(s.tool === 'door' && (await E(() => document.getElementById('doorType').value)) === 'double', `picked the double door (tool ${s.tool})`);
  const ops0 = s.ops.length;
  await press(BTN.A);
  s = await st();
  assert(s.ops.length === ops0 + 1 && s.ops[s.ops.length - 1] === 'double', `A places a double door on the new wall (${s.status})`);
  assert(saves === 0 && s.dirty > 0, `nothing saved (${saves} saves, ${s.dirty} unsaved steps)`);

  console.log('B puts the tool down; Y tap repeats it');
  await press(BTN.B);
  assert((await st()).tool === 'select', 'B: back to select');
  await press(BTN.Y);
  assert((await st()).tool === 'door', 'Y tap: the last tool again');
  await press(BTN.B);
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: path.join(shots ?? process.env.TEMP ?? '/tmp', 'e2e-editor-fail.png') }).catch(() => {});
} finally {
  const bad = errors.filter((e) => !/GPU stall|swiftshader|GL Driver/i.test(e));
  console.log(bad.length ? 'console problems:\n' + bad.join('\n') : 'no console errors');
  await browser.close();
  vite.kill();
  process.exit(failed || bad.length ? 1 : 0);
}
