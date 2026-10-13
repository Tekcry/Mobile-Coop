// Level editor controller test (ED2 Part C, ED3-1 builder camera, ED3-2 hub, wheels, grab, magnet, ghosts; ED2 Part B walk test as the player): every edit step uses the fake gamepad. Starts its own Vite dev server on
// a free port (the editor is dev-only, never in dist/). Never saves. `npm run e2e:editor`; SHOTS=<dir> keeps screenshots.
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { assert, BTN, frames, launchOptions } from './e2e-lib.mjs';

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const port = await freePort();
// ED3-3a: the server reads and saves a copy of the campus in a temp folder, never docs/kestrel
const sandbox = mkdtempSync(path.join(tmpdir(), 'kestrel-e2e-'));
// docs/kestrel as it was before the run (a session's own uncommitted edits are not the test's)
const docsBefore = execSync('git status --porcelain docs/kestrel', { encoding: 'utf8' });
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, KESTREL_EDITOR_SANDBOX: sandbox } });
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
  // a fresh start once per run; a reload keeps the view preferences (the settings test)
  try { if (!sessionStorage.getItem('e2e-kept')) { localStorage.clear(); indexedDB.deleteDatabase('kestrel-editor'); sessionStorage.setItem('e2e-kept', '1'); } } catch {}
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
const presses = async (b, n) => { for (let i = 0; i < n; i++) await press(b); };
const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };
const st = () => E(() => { const ed = window.__editor; return { tool: ed.tool, layout: ed.prefs.layout, walls: ed.model.data.walls.length, ops: ed.model.data.openings.map((o) => o.type), dirty: ed.model.dirty, menu: ed.pad.menu.isOpen ? ed.pad.menu.tab : null, hint: document.getElementById('hint').textContent, status: document.getElementById('status').textContent }; });
const rs = (y) => E((y) => window.__pad.axis(3, y), y);
const menuState = () => E(() => { const m = window.__editor.pad.menu; return { open: m.isOpen, tab: m.tab, index: m.index, tile: document.querySelector('#tileMenu .tile.hl .tn')?.textContent ?? null, tabs: [...document.querySelectorAll('#tileMenu [data-mtab]')].map((b) => b.textContent) }; });
/** Moves the menu highlight with the D-pad until the tile is lit (one press at a time, read back: presses can repeat on slow frames). */
// (ON10: each step holds the D-pad only until the highlight moves, so a slow frame cannot repeat it; the Build tab has 19 tiles)
const stepMenu = (b) => E(async (b) => {
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const probe = () => { const m = window.__editor.pad.menu; return `${m.tab}|${m.index}`; };
  const v0 = probe();
  window.__pad.set(b, 1);
  for (let k = 0; k < 150 && probe() === v0; k++) await raf();
  window.__pad.set(b, 0); await raf(); await raf(); await raf();
}, b);
const toTile = async (name, btn = BTN.RIGHT) => { for (let i = 0; i < 40 && (await menuState()).tile !== name; i++) await stepMenu(btn); return (await menuState()).tile === name; };
/** Lights a card row with the D-pad (read back each press). */
const toRow = async (row) => { for (let i = 0; i < 12 && (await E(() => document.querySelector('#selCard .crow.on')?.dataset.row)) !== row; i++) await press(BTN.DOWN); return (await E(() => document.querySelector('#selCard .crow.on')?.dataset.row)) === row; };
const releaseBtn = async (btn) => { await set(btn, 0); await frames(page, 3); await axes(0, 0); await frames(page, 3); };
const orb = () => E(() => { const c = window.__editor.controls; const p = c.orbit.position(); return { mode: c.mode, walking: c.walking, floor: c.floor, ...c.orbit.s, px: p[0], py: p[1], pz: p[2] }; });
const shown = (id) => E((id) => getComputedStyle(document.getElementById(id)).display !== 'none', id);
const dotText = () => E(() => document.getElementById('reticleText').textContent);
/** Puts the dot (the orbit target) at x, z and lets the magnet settle. */
const dotAt = async (x, z) => { await E(([x, z]) => { const s = window.__editor.controls.orbit.s; s.tx = x; s.tz = z; s.yaw = 0; }, [x, z]); await frames(page, 4); await wait(250); };
const hub = () => E(() => ({ open: window.__editor.pad.hub.isOpen, tab: window.__editor.pad.hub.tab }));

let failed = false;
try {
  await page.goto(`http://localhost:${port}/editor.html`);
  await page.waitForFunction(() => window.__editor?.pad && window.__editor.view.scene.meshes.some((m) => m.isReady(true)), null, { timeout: 90000 });
  await E(() => { const ed = window.__editor; ed.setLayout('3d'); ed.setLevel('G'); ed.controls.overlook(20, 20, 0, 30); });
  await E(() => window.__pad.connect());
  await press(BTN.LB);
  assert((await E(() => window.__editor.pad.device)) === 'pad', 'pad input switches the hint bar to the pad');
  assert((await E(() => window.__editor.controls.mode)) === 'orbit', 'pad input starts the builder camera');
  assert(/A Select\s+Y Menu\s+X Undo\s+LS click Walk\s+Menu Hub/.test((await st()).hint), `hint bar shows the pad's building words ("${(await st()).hint.slice(0, 80)}")`);
  await shot('hint-idle');

  console.log('tile menu (Y tap): tabs, D-pad and A pick Wall, Y closes (ON0a)');
  await press(BTN.Y);
  let ms = await menuState();
  assert(ms.open && ms.tab === 'Build' && ms.tabs.join(',') === 'Build,Openings,View', `Y tap opens the menu on Build; nothing selected: no Selected tab (${ms.tabs.join(', ')})`);
  assert(/D-pad Move\s+A Pick\s+LB \/ RB Tab\s+B Close/.test((await st()).hint), `menu hint bar ("${(await st()).hint.slice(0, 60)}")`);
  await press(BTN.RB);
  const tabR = (await menuState()).tab;
  await press(BTN.LB);
  await press(BTN.LB);
  const tabL = (await menuState()).tab;
  await press(BTN.RB);
  assert(tabR === 'Openings' && tabL === 'View' && (await menuState()).tab === 'Build', `RB / LB change tab, wrapping (${tabR}, ${tabL})`);
  await shot('menu-build');
  await press(BTN.Y);
  assert(!(await menuState()).open && !(await shown('tileMenu')), 'Y again closes it');
  await press(BTN.Y);
  const i0 = (await menuState()).index;
  await axes(1, 0);
  await page.waitForFunction((i) => window.__editor.pad.menu.index !== i, i0, { timeout: 5000 }).catch(() => {});
  await axes(0, 0);
  await frames(page, 3);
  const i1 = (await menuState()).index;
  assert(i1 !== i0, `the left stick moves the tile highlight (${i0} -> ${i1})`);
  assert(await toTile('Wall'), 'the D-pad reaches the Wall tile');
  await press(BTN.A);
  let s = await st();
  assert(s.tool === 'wall' && s.menu === null && !(await shown('tileMenu')), `A picks Wall and closes the menu (tool ${s.tool})`);
  const bar1 = await E(() => [...document.querySelectorAll('#toolBar .slot')].map((e) => `${e.dataset.slot}${e.classList.contains('on') ? '*' : ''}`).join());
  assert(bar1 === 'wall*', `the tool bar shows the active tool only (${bar1})`);

  console.log('draw a 6 m wall with the pad alone');
  const walls0 = s.walls;
  const drawFrom = await orb();
  await press(BTN.A);
  // (ON0b: the grid is 0.1 m; 60 D-pad steps overshoot when frames are slow, so the end is set on the dot)
  await dotAt(Math.round(drawFrom.tx * 10) / 10 + 6, Math.round(drawFrom.tz * 10) / 10);
  await shot('hint-draw');
  await press(BTN.A);
  // ON1: A ends this wall and starts the next (a chain); B ends the chain
  await press(BTN.B);
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

  console.log('View tap: top-down and back; View hold cycles 3D, Both, Plan');
  const pitch0 = await E(() => window.__editor.controls.pitch);
  await press(BTN.SELECT);
  await wait(600);
  const td = await E(() => ({ pitch: window.__editor.controls.pitch, strip: document.getElementById('padStrip').textContent }));
  assert(Math.abs(td.pitch - 1.55) < 0.05 && /Top-down/.test(td.strip), `View tap: top-down (pitch ${td.pitch.toFixed(3)})`);
  await press(BTN.SELECT);
  await wait(600);
  const pitch1 = await E(() => window.__editor.controls.pitch);
  assert(Math.abs(pitch1 - pitch0) < 0.01, `View tap again: back (pitch ${pitch1.toFixed(3)})`);
  const seen = [];
  for (let i = 0; i < 3; i++) {
    // (ON3: held only until the layout changes, so a slow frame cannot make it a second hold or a tap)
    const lay0 = (await st()).layout;
    await set(BTN.SELECT, 1);
    await page.waitForFunction((l) => window.__editor.prefs.layout !== l, lay0, { timeout: 5000 }).catch(() => {});
    await set(BTN.SELECT, 0);
    await frames(page, 3);
    seen.push((await st()).layout);
    if (seen.length === 2) {
      await wait(300);
      const mark = await E(() => !!document.getElementById('padMark'));
      assert(mark, 'Plan only shows the dot on the plan');
      await shot('pad-plan-only');
    }
  }
  assert(seen.join(',') === 'both,plan,3d', `View hold cycles (${seen})`);

  console.log('Openings tab > Double door: its ghost on the wall, placed with A');
  await press(BTN.Y);
  await press(BTN.RB);
  assert((await menuState()).tab === 'Openings' && (await toTile('Double door')), 'Openings tab: the Double door tile');
  await shot('menu-openings');
  await press(BTN.A);
  s = await st();
  assert(s.tool === 'door' && (await E(() => document.getElementById('doorType').value)) === 'double', `picked the double door (tool ${s.tool})`);
  await frames(page, 4);
  await wait(200);
  const ghostText = await dotText();
  assert(/A: place Double door on /.test(ghostText) && (await E(() => window.__editor.view.scene.getMeshByName('mark 0')?.isEnabled())), `the door ghost and its words before A ("${ghostText.slice(0, 80)}")`);
  await shot('door-ghost');
  const ops0 = s.ops.length;
  await press(BTN.A);
  s = await st();
  assert(s.ops.length === ops0 + 1 && s.ops[s.ops.length - 1] === 'double', `A places a double door on the new wall (${s.status})`);
  assert(saves === 0 && s.dirty > 0, `nothing saved (${saves} saves, ${s.dirty} unsaved steps)`);

  console.log('Door tool far from any wall: red dot, "Move onto a wall", A adds nothing');
  const far = await E(() => {
    const ed = window.__editor;
    const ws = ed.model.data.walls.filter((w) => w.level === 'G');
    const dist = (w, x, z) => { const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], L = Math.hypot(dx, dz) || 1; const s = Math.max(0, Math.min(L, ((x - w.a[0]) * dx + (z - w.a[1]) * dz) / L)); return Math.hypot(x - (w.a[0] + (dx * s) / L), z - (w.a[1] + (dz * s) / L)); };
    for (let x = 2; x < 110; x += 1) for (let z = 2; z < 80; z += 1) if (ws.every((w) => dist(w, x, z) >= 3)) return [x, z];
    return null;
  });
  await dotAt(far[0], far[1]);
  const farText = await dotText();
  const ops1 = (await st()).ops.length;
  await press(BTN.A);
  assert(/Move onto a wall/.test(farText) && (await E(() => document.getElementById('reticle').classList.contains('bad'))) && (await st()).ops.length === ops1, `3 m from any wall: "${farText.slice(-20)}", red dot, A adds nothing`);

  console.log('D-pad left / right flip the tool type; B puts the tool down');
  await E(() => window.__editor.select(null));
  await press(BTN.RIGHT);
  const dtR = await E(() => document.getElementById('doorType').value);
  await press(BTN.LEFT);
  const dtL = await E(() => document.getElementById('doorType').value);
  assert(dtR === 'glass-door' && dtL === 'double' && (await st()).tool === 'door', `door tool: D-pad right / left flip the door type (${dtR}, ${dtL}); the tool stays`);
  await press(BTN.B);
  assert((await st()).tool === 'select', 'B: back to select');
  console.log('pad tool bar, level, dot, display, quick walk, go to the selection');
  await E(() => window.__editor.pad.runMenu('room.walls'));
  await wait(250);
  s = await st();
  const lit = await E(() => document.querySelector('#toolBar .slot.on')?.dataset.slot);
  assert(s.tool === 'room' && lit === 'room', `the Room tile lights Room on the tool bar (tool ${s.tool}, lit ${lit})`);
  const startText = await dotText();
  assert(/A: start a room here/.test(startText), `Room tool: the start marker's words ("${startText.slice(-22)}")`);
  await press(BTN.B);
  await E(() => window.__editor.select(null));
  const up = await E(() => { const ed = window.__editor; const ls = ed.model.data.levels.slice().sort((a, b) => a.floor - b.floor); const i = ls.findIndex((l) => l.id === ed.view.level); return ls[i + 1] ? { y: ed.viewFloor(ls[i + 1].id), id: ls[i + 1].id, floor: ed.floor(ls[i + 1].id) } : null; });
  await press(BTN.UP);
  await wait(500);
  let o = await orb();
  assert(up !== null && Math.abs(o.floorY - up.y) < 0.01, `D-pad up raises the dot to the next level's floor (${o.floorY.toFixed(2)} m, expected ${up.y})`);
  await press(BTN.DOWN);
  await wait(500);
  const t0 = await orb();
  const text0 = await dotText();
  await axes(1, 0);
  await wait(500);
  await axes(0, 0);
  await frames(page, 3);
  await wait(150);
  o = await orb();
  const text1 = await dotText();
  assert(Math.hypot(o.tx - t0.tx, o.tz - t0.tz) > 0.5 && text1 !== text0, `left stick moves the dot (${Math.hypot(o.tx - t0.tx, o.tz - t0.tz).toFixed(1)} m; "${text0.slice(0, 18)}" -> "${text1.slice(0, 18)}")`);
  const displays = [];
  for (let i = 0; i < 3; i++) { await press(BTN.RS); displays.push(await E(() => window.__editor.view.vis.preset)); }
  assert([...new Set(displays)].sort().join(',') === 'single,upTo,whole', `R3 cycles the three level displays (${displays})`);
  const qw = async (start, how, end = BTN.B, endHow = 'B') => {
    const before = await orb();
    await start();
    await wait(200);
    const mid = await orb();
    const hidden = !(await shown('toolBar')) && !(await shown('reticle'));
    await press(end);
    await wait(200);
    const after = await orb();
    const err = Math.hypot(after.px - before.px, after.py - before.py, after.pz - before.pz);
    assert(mid.walking && hidden && after.mode === 'orbit' && err < 0.01 && (await shown('toolBar')), `${how} starts a quick walk (tool bar hidden), ${endHow} ends it, orbit restored (${err.toFixed(4)} m)`);
  };
  await qw(() => press(BTN.LS), 'L3');
  // ON0b: L3 tap starts a quick walk that runs (the walk's RUN speed); L3 again walks slowly and back; B ends it
  {
    await press(BTN.LS);
    await wait(200);
    const pos = () => E(() => { const p = window.__editor.view.camera.position; return { x: p.x, z: p.z }; });
    const stride = async () => { const a = await pos(); const t0 = await E(() => performance.now()); await axes(0, -1); await wait(500); await axes(0, 0); const t1 = await E(() => performance.now()); await frames(page, 2); const b = await pos(); return Math.hypot(b.x - a.x, b.z - a.z) / ((t1 - t0) / 1000); };
    const r0 = await E(() => ({ walking: window.__editor.controls.walking, run: window.__editor.controls.padRun, hint: document.getElementById('hint').textContent }));
    const fast = await stride();
    await press(BTN.LS);
    const r1 = await E(() => ({ walking: window.__editor.controls.walking, run: window.__editor.controls.padRun }));
    const slow = await stride();
    await press(BTN.LS);
    const r2 = await E(() => ({ walking: window.__editor.controls.walking, run: window.__editor.controls.padRun }));
    await press(BTN.B);
    await wait(200);
    const out = await E(() => window.__editor.controls.walking);
    // (speeds in m/s from wall-clock time: running 4.5, walking 1.6; a slow headless frame only shortens the stride)
    assert(r0.walking && r0.run && /running, LS click slow walk/.test(r0.hint) && r1.walking && !r1.run && r2.run && !out && fast > 2 && fast < 5 && slow < 2 && fast > slow * 1.8, `quick walk: L3 starts it running (${fast.toFixed(2)} m/s, RUN 4.5), L3 walks slowly (${slow.toFixed(2)} m/s), L3 runs again, B ends it`);
  }
  await qw(async () => { await press(BTN.START); await E(() => window.__editor.pad.hub.setTab('Play')); await press(BTN.A); }, 'the hub\'s Play > Quick walk');
  console.log('quick walk: A does nothing; D-pad up / down changes floor');
  const qa = await E(() => { const ed = window.__editor; return { sel: ed.selected, tool: ed.tool, dirty: ed.model.dirty }; });
  const q0 = await orb();
  await press(BTN.LS);
  await wait(200);
  await press(BTN.A);
  const qb = await E(() => { const ed = window.__editor; return { sel: ed.selected, tool: ed.tool, dirty: ed.model.dirty, walking: ed.controls.walking }; });
  assert(qb.walking && qb.sel === qa.sel && qb.tool === qa.tool && qb.dirty === qa.dirty, 'A does nothing while walking (still walking; selection, tool, unsaved count unchanged)');
  await press(BTN.UP);
  await wait(200);
  const q1 = await E(() => ({ floor: window.__editor.controls.floor, level: window.__editor.view.level }));
  await press(BTN.DOWN);
  await wait(200);
  const q2 = await E(() => ({ floor: window.__editor.controls.floor, level: window.__editor.view.level, g: window.__editor.floor('G') }));
  await press(BTN.UP);
  await wait(200);
  assert(q1.level === up.id && Math.abs(q1.floor - up.floor) < 1e-6 && q2.level === 'G' && Math.abs(q2.floor - q2.g) < 1e-6, `D-pad up / down while walking moves the walk to the next / previous floor (${q1.level} ${q1.floor} m, ${q2.level} ${q2.floor} m)`);
  await press(BTN.B);
  await wait(400);
  const q3 = await orb();
  assert(q3.mode === 'orbit' && Math.abs(q3.floorY - up.y) < 0.01 && Math.hypot(q3.tx - q0.tx, q3.tz - q0.tz) < 0.01, `ending the walk leaves the orbit on that level's floor (${q3.floorY.toFixed(2)} m) with x, z restored`);
  await press(BTN.DOWN);
  await wait(400);
  // a room on G with clear space around its east edge and its middle (no other snap point within 0.7 m)
  const room = await E(() => {
    const ed = window.__editor;
    const cs = ed.pad.candidates();
    const clear = (id, x, z, sameX) => cs.every((c) => c.kind !== 'point' || c.owner === `rooms:${id}` || (sameX && Math.abs(c.p[0] - x - 0.2) < 1e-6) || Math.hypot(c.p[0] - x, c.p[1] - z) > 0.7);
    const r = ed.model.data.rooms.find((q) => {
      const [x0, z0, x1, z1] = q.rect;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      return q.level === 'G' && x0 > 5 && x1 - x0 >= 3 && z1 - z0 >= 3 && x1 - x0 !== z1 - z0 && clear(q.id, x1 - 0.2, cz, true) && clear(q.id, cx, cz, false);
    });
    ed.select(`rooms:${r.id}`);
    return { id: r.id, rect: r.rect.slice(), cx: (r.rect[0] + r.rect[2]) / 2, cz: (r.rect[1] + r.rect[3]) / 2 };
  });
  await press(BTN.RB);
  await wait(600);
  o = await orb();
  assert(Math.abs(o.tx - room.cx) < 0.01 && Math.abs(o.tz - room.cz) < 0.01, `RB goes to the selected room's centre (${o.tx.toFixed(2)}, ${o.tz.toFixed(2)})`);
  await wait(200);
  const card = await E(() => document.getElementById('selCard').textContent);
  assert((await shown('selCard')) && card.includes(room.id), `the selection card names the room ("${card.slice(0, 60)}")`);
  await shot('pad-3d-bar-card');
  await press(BTN.SELECT);
  await wait(500);
  await shot('pad-top-down');
  await press(BTN.SELECT);
  await wait(500);

  console.log('edge-aware grab: stretch an edge, move from the middle');
  await dotAt(room.cx, room.cz);
  const mid = await dotText();
  assert(/A: Move( \(\d+ shared walls? stays?\))?$/.test(mid), `the dot at the room's centre says "A: Move" ("${mid.slice(-12)}")`);
  await dotAt(room.rect[2] - 0.2, room.cz);
  const edge = await dotText();
  assert(/Stretch east edge/.test(edge) && (await E(() => window.__editor.view.scene.getMeshByName('mark 0')?.isEnabled())), `0.2 m inside the east edge: "Stretch east edge", the edge lit ("${edge.slice(-24)}")`);
  await shot('edge-lit');
  await press(BTN.A);
  await presses(BTN.RIGHT, 10);
  await press(BTN.A);
  let rr = await E((id) => window.__editor.model.get('rooms', id).rect.slice(), room.id);
  assert(Math.abs(rr[2] - room.rect[2] - 1) < 1e-6 && rr[0] === room.rect[0], `A, 1 m east, A: the east edge moved 1 m, the west did not (${room.rect[2]} -> ${rr[2]})`);
  await press(BTN.X);

  console.log('RB tap while grabbing turns the room; B puts it back');
  await dotAt(room.cx, room.cz);
  await press(BTN.A);
  await press(BTN.RB);
  await frames(page, 3);
  rr = await E((id) => window.__editor.model.get('rooms', id).rect.slice(), room.id);
  const w0 = room.rect[2] - room.rect[0], d0 = room.rect[3] - room.rect[1];
  const turned = Math.abs(rr[2] - rr[0] - d0) < 1e-6 && Math.abs(rr[3] - rr[1] - w0) < 1e-6;
  await press(BTN.B);
  rr = await E((id) => window.__editor.model.get('rooms', id).rect.slice(), room.id);
  assert(turned && rr.join() === room.rect.join(), `RB tap while grabbing swaps width and depth (${w0} x ${d0}); B puts it back`);

  console.log('wall end: stretch this end');
  const wall = await E(() => {
    const ed = window.__editor;
    const w = ed.model.data.walls.find((q) => q.level === 'G' && q.a[1] === q.b[1] && q.b[0] - q.a[0] >= 3);
    ed.select(`walls:${w.id}`);
    return { id: w.id, a: w.a.slice(), b: w.b.slice() };
  });
  await dotAt(wall.a[0] + 0.2, wall.a[1]);
  const endText = await dotText();
  await press(BTN.A);
  await presses(BTN.RIGHT, 10);
  await press(BTN.A);
  const wa = await E((id) => { const w = window.__editor.model.get('walls', id); return { a: w.a.slice(), b: w.b.slice() }; }, wall.id);
  assert(/Stretch this end/.test(endText) && Math.abs(wa.a[0] - wall.a[0] - 1) < 1e-6 && wa.b.join() === wall.b.join(), `a wall end stretches the same way ("${endText.slice(-22)}", end a ${wall.a[0]} -> ${wa.a[0]})`);
  await press(BTN.X);

  console.log('magnet: snaps onto a wall end exactly and rumbles once; not with LB held');
  await press(BTN.B);
  const end = await E(() => {
    const cs = window.__editor.pad.candidates();
    const pts = cs.filter((c) => c.kind === 'point');
    for (const c of pts) {
      if (!c.key.startsWith('end:')) continue;
      const q = [c.p[0] + 0.3, c.p[1]];
      if (pts.every((o) => (o.p[0] === c.p[0] && o.p[1] === c.p[1]) || Math.hypot(o.p[0] - q[0], o.p[1] - q[1]) > 0.75)) return c.p.slice();
    }
    return null;
  });
  await dotAt(end[0] + 3, end[1] + 3);
  const rum0 = await E(() => window.__rumbles ?? 0);
  await dotAt(end[0] + 0.3, end[1]);
  const snapped = await E(() => ({ p: window.__editor.pad.point(), m: window.__editor.pad.magnet?.label, rum: window.__rumbles ?? 0 }));
  assert(snapped.p[0] === end[0] && snapped.p[1] === end[1] && snapped.rum === rum0 + 1, `0.3 m from a wall end the dot snaps onto it exactly (${snapped.m}, ${snapped.p}) and rumbles once (${snapped.rum - rum0})`);
  await dotAt(end[0] + 3, end[1] + 3);
  await set(BTN.LB, 1);
  await dotAt(end[0] + 0.3, end[1]);
  const free = await E(() => ({ p: window.__editor.pad.point(), m: window.__editor.pad.magnet }));
  await set(BTN.LB, 0);
  assert(!free.m && Math.abs(free.p[0] - end[0] - 0.3) < 1e-6, `with LB held it does not snap (${free.p})`);

  console.log('Selected tab, RB hold free; the selection card on the D-pad (ON0a)');
  await E(() => window.__editor.select(null));
  await press(BTN.Y);
  const noSel = (await menuState()).tabs;
  await press(BTN.B);
  await E((id) => window.__editor.select(`rooms:${id}`), room.id);
  await set(BTN.RB, 1);
  await wait(700);
  const rbOpen = await E(() => window.__editor.pad.menuOpen);
  await releaseBtn(BTN.RB);
  await press(BTN.Y);
  for (let i = 0; i < 6 && (await menuState()).tab !== 'Selected'; i++) await press(BTN.LB);
  const selTiles = await E(() => [...document.querySelectorAll('#tileMenu .tile .tn')].map((e) => e.textContent));
  await shot('menu-selected');
  await press(BTN.B);
  assert(!noSel.includes('Selected') && !rbOpen && selTiles.join(',') === 'Move,Duplicate,Rotate 90,Copy,Copy to level above,Split,Rename id,Change type,Properties,Delete', `Selected tab with a room: ${selTiles.join(', ')}; none without a selection; RB held opens nothing`);
  const door = await E(() => { const ed = window.__editor; const o = ed.model.data.openings.find((q) => q.type === 'door' && ed.levelOf('openings', q) === 'G'); ed.select(`openings:${o.id}`); return { id: o.id, w: o.w }; });
  await frames(page, 3);
  assert(/D-pad Edit\s+A Grab\s+Y Menu\s+B Clear\s+RB Go to/.test((await st()).hint), `selection hint bar ("${(await st()).hint.slice(0, 70)}")`);
  const lv0 = await E(() => window.__editor.view.level);
  const h0 = await E(() => window.__editor.model.history.length);
  await press(BTN.RIGHT);
  await wait(250);
  const dt1 = await E((id) => ({ type: window.__editor.model.get('openings', id).type, h: window.__editor.model.history.length, lit: document.querySelector('#selCard .crow.on')?.dataset.row, level: window.__editor.view.level }), door.id);
  await shot('card-type-lit');
  assert(dt1.type === 'fire-door' && dt1.h === h0 + 1 && dt1.lit === 'type' && dt1.level === lv0, `D-pad right on the card's Type row: door -> ${dt1.type}, ${dt1.h - h0} undo step, Type lit, level unchanged`);
  assert(await toRow('w'), 'D-pad down reaches the Width row');
  for (let i = 0; i < 3; i++) await press(BTN.RIGHT);
  const w3 = await E((id) => window.__editor.model.get('openings', id).w, door.id);
  assert(Math.abs(w3 - door.w - 0.3) < 1e-6, `Width: right three times = +0.3 m (${door.w} -> ${w3})`);
  await press(BTN.B);
  const leave = await E(() => ({ editing: window.__editor.pad.cardEditing, sel: window.__editor.selected }));
  assert(!leave.editing && !!leave.sel, 'B leaves the card and keeps the selection');
  await E((h) => { const ed = window.__editor; while (ed.model.history.length > h) ed.undo(); }, h0);
  const back = await E((id) => window.__editor.model.get('openings', id), door.id);
  assert(back.type === 'door' && back.w === door.w, `undo puts the door back (${back.type}, ${back.w} m)`);

  console.log('View tab: Ghost and Exploded (one tile press each), the gap with left / right');
  await E(() => { const v = window.__editor.view.vis; v.ghost = false; v.exploded = false; window.__editor.select(null); });
  await press(BTN.Y);
  for (let i = 0; i < 6 && (await menuState()).tab !== 'View'; i++) await press(BTN.LB);
  assert(await toTile('Ghost other levels', BTN.DOWN), 'the Ghost row');
  await press(BTN.A);
  assert(await toTile('Exploded', BTN.DOWN), 'the Exploded row');
  await press(BTN.A);
  const gap0 = await E(() => window.__editor.view.vis.gap);
  await press(BTN.RIGHT);
  const vv = await E(() => ({ ghost: window.__editor.view.vis.ghost, exploded: window.__editor.view.vis.exploded, gap: window.__editor.view.vis.gap, open: window.__editor.pad.menu.isOpen }));
  await shot('menu-view');
  assert(vv.ghost && vv.exploded && vv.gap === gap0 + 0.5 && vv.open, `View tab: Ghost on, Exploded on, right moves the gap ${gap0} -> ${vv.gap} m; the menu stays open`);
  await press(BTN.B);
  await E(() => { const ed = window.__editor; ed.view.vis.ghost = false; ed.view.vis.exploded = false; ed.view.vis.gap = 3; ed.applyVis(); });

  console.log('the hub (Menu)');
  await press(BTN.B);
  await press(BTN.START);
  let hb = await hub();
  assert(hb.open, `Menu opens the hub (${hb.tab})`);
  await E(() => window.__editor.pad.hub.setTab('Play'));
  await press(BTN.RB);
  const t1 = (await hub()).tab;
  await press(BTN.LB);
  await press(BTN.LB);
  const t2 = (await hub()).tab;
  assert(t1 === 'File' && t2 === 'Help', `RB / LB change tabs, wrapping (Play -> ${t1}; back twice -> ${t2})`);
  const pic = await E(() => ({ svg: !!document.getElementById('padPicture'), text: document.getElementById('padPicture')?.textContent ?? '' }));
  assert(pic.svg && /tile menu/.test(pic.text) && /selection card/.test(pic.text) && !/wheel/i.test(pic.text), 'Help tab shows the controller picture with labels (no wheel words)');
  await shot('hub-help');
  await press(BTN.LB);
  await press(BTN.LB);
  await press(BTN.LB);
  assert((await hub()).tab === 'Levels', 'LB from Help reaches Levels');
  const target = await E(() => { const ls = window.__editor.model.data.levels.slice().sort((a, b) => b.floor - a.floor); const i = ls.findIndex((l) => l.id !== 'G'); return { i, id: ls[i].id }; });
  await presses(BTN.DOWN, target.i);
  const ticks = await E(() => document.querySelectorAll('#hubPanel input[data-level]').length);
  await shot('hub-levels');
  await press(BTN.A);
  assert((await E(() => window.__editor.view.level)) === target.id && ticks > 0, `Levels tab: A on a level edits it (${target.id}); the Levels panel is there too (${ticks} level ticks)`);
  await E(() => window.__editor.setLevel('G'));
  console.log('File tab: undo back to an older line');
  await press(BTN.B);
  const before = await E((id) => { const ed = window.__editor; ed.select(`rooms:${id}`); return { h: ed.model.history.length, rect: ed.model.get('rooms', id).rect.slice() }; }, room.id);
  await E(() => { const ed = window.__editor; ed.nudge([0.5, 0]); ed.nudge([0, 0.5]); });
  await press(BTN.START);
  await E(() => window.__editor.pad.hub.setTab('File'));
  await presses(BTN.DOWN, 3);
  await press(BTN.A);
  const asked = await E(() => document.getElementById('ask').textContent);
  await press(BTN.A);
  const after = await E((id) => ({ h: window.__editor.model.history.length, rect: window.__editor.model.get('rooms', id).rect.slice(), open: window.__editor.pad.hub.isOpen }), room.id);
  assert(/Undo back to here/.test(asked) && after.h === before.h && after.rect.join() === before.rect.join() && after.open, `two edits, A on the older line, yes: the undo history is back to before (${after.h}) and the room where it was`);
  console.log('Checks tab: A on a line goes there');
  await page.waitForFunction(() => window.__editor.lastChecks, null, { timeout: 60000 });
  await E(() => window.__editor.pad.hub.setTab('Checks'));
  const prob = await E(() => {
    const ed = window.__editor;
    const lines = ed.problemLines();
    const ids = ['rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids'].flatMap((c) => ed.model.list(c).map((e) => e.id));
    return lines.findIndex((l) => ids.some((id) => new RegExp(`(^|[^A-Za-z0-9-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^A-Za-z0-9-])`).test(l.text)));
  });
  await E(() => window.__editor.select(null));
  await presses(BTN.DOWN, prob + 1);
  await press(BTN.A);
  const went = await E(() => ({ open: window.__editor.pad.hub.isOpen, sel: window.__editor.selected }));
  assert(prob >= 0 && !went.open && !!went.sel, `Checks tab: A on line ${prob + 1} closes the hub and selects ${went.sel}`);
  console.log('the sticks in the hub: the left moves a row and pushes a slider, the right scrolls (decision 8b)');
  await press(BTN.START);
  await E(() => window.__editor.pad.hub.setTab('Checks'));
  await wait(200);
  let scrollIn = await E(() => { const h = document.getElementById('hub'); h.scrollTop = 0; return h.scrollHeight > h.clientHeight + 50 ? 'Checks' : ''; });
  if (!scrollIn) { await E(() => window.__editor.pad.hub.setTab('Help')); scrollIn = 'Help'; await wait(200); await E(() => { document.getElementById('hub').scrollTop = 0; }); }
  await rs(1);
  await wait(500);
  await rs(0);
  const scrolled = await E(() => document.getElementById('hub').scrollTop);
  assert(scrolled > 40, `the right stick scrolls the ${scrollIn} list (${Math.round(scrolled)} px)`);
  await E(() => window.__editor.pad.hub.setTab('Settings'));
  await frames(page, 3);
  await axes(0, 1);
  await page.waitForFunction(() => document.querySelector('#hub .padfocus')?.dataset.row === 'set.speed', null, { timeout: 5000 }).catch(() => {});
  await axes(0, 0);
  await frames(page, 3);
  const rowNow = await E(() => document.querySelector('#hub .padfocus')?.dataset.row);
  const sp0 = await E(() => window.__editor.pad.settings.stickSpeed);
  await axes(1, 0);
  await page.waitForFunction((v) => window.__editor.pad.settings.stickSpeed > v, sp0, { timeout: 5000 }).catch(() => {});
  await axes(0, 0);
  await frames(page, 3);
  const sp1 = await E(() => window.__editor.pad.settings.stickSpeed);
  assert(rowNow === 'set.speed' && sp1 > sp0, `Settings: the left stick moves to Stick speed and pushes it (${sp0} -> ${sp1})`);
  await E(() => { const p = window.__editor.pad; p.settings = { ...p.settings, stickSpeed: 1 }; p.savePrefs(); });
  await press(BTN.B);

  console.log('Settings: rumble off survives a reload; B closes');
  await press(BTN.START);
  await E(() => window.__editor.pad.hub.setTab('Settings'));
  await press(BTN.A);
  const rumble = await E(() => window.__editor.pad.settings.rumble);
  await press(BTN.B);
  assert(!rumble && !(await hub()).open, 'Settings: A turns rumble off; B closes the hub');

  console.log('pad screen: toolbars hidden, status strip, mouse brings them back');
  const ui = () => E(() => ({ bar: getComputedStyle(document.getElementById('bar')).display, strip: document.getElementById('padStrip').textContent, shown: getComputedStyle(document.getElementById('padStrip')).display }));
  await press(BTN.LB);
  await wait(400);
  let u = await ui();
  assert(u.bar === 'none' && u.shown === 'block' && /Editing/.test(u.strip) && /Unsaved/.test(u.strip), `pad screen (toolbar ${u.bar}, strip "${u.strip.slice(0, 60)}")`);
  await shot('pad-screen');
  await page.mouse.move(100, 400);
  await page.mouse.move(400, 500, { steps: 4 });
  await wait(200);
  u = await ui();
  assert(u.bar !== 'none' && u.shown === 'none', `mouse brings the toolbars back (${u.bar})`);
  assert(saves === 0, `nothing saved (${saves} saves)`);
  await page.reload();
  await page.waitForFunction(() => window.__editor?.pad, null, { timeout: 90000 });
  assert((await E(() => window.__editor.pad.settings.rumble)) === false, 'the rumble setting survives a reload');

  console.log('Walk test as the player (ED2 Part B)');
  if (await E(() => !document.getElementById('ask').classList.contains('hidden'))) await page.click('#discard');
  // (the reload above disconnected the fake pad)
  await E(() => window.__pad.connect());
  await press(BTN.LB);
  const gf = () => page.frames().find((f) => f.url().includes('editorDraft=1'));
  const walkIs = (s, ms = 60000) => page.waitForFunction((s) => window.__editor.walk.state === s, s, { timeout: ms });
  const dot = (x, z, yaw, level = 'G') => E(([x, z, yaw, level]) => { const ed = window.__editor; ed.setLevel(level); if (ed.controls.mode !== 'orbit') ed.enterOrbit(); const s = ed.controls.orbit.s; s.tx = x; s.tz = z; s.yaw = yaw; }, [x, z, yaw, level]).then(() => frames(page, 4));
  const player = () => gf().evaluate(() => { const g = window.__app.current; const p = g.player.position; return { x: p.x, y: p.y, z: p.z, yaw: g.player.cam.yaw, pyaw: g.player.controller.yaw }; });
  const edState = () => E(() => { const ed = window.__editor; const o = ed.controls.orbit.s; return { h: ed.model.history.length, dirty: ed.model.dirty, level: ed.view.level, tx: o.tx, tz: o.tz, mode: ed.controls.mode, shown: document.getElementById('gameWalk')?.style.opacity === '1', loads: ed.walk.loads, last: ed.walk.last }; });
  const turnDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  // every frame: the walk state, whether the game is shown, and the editor camera
  await E(() => { window.__swap = []; const step = () => { const ed = window.__editor; const f = document.getElementById('gameWalk'); window.__swap.push({ st: ed.walk.state, op: f ? f.style.opacity : '', cam: ed.controls.pose().pos }); requestAnimationFrame(step); }; requestAnimationFrame(step); });
  const backCheck = async (how, before) => {
    await walkIs('warm', 20000);
    await page.waitForFunction(() => !window.__editor.controls.blend && window.__swap.at(-1).st === 'warm', null, { timeout: 20000 });
    // the first frame drawn after the game reported back
    const first = await E(() => { const s = window.__swap; let i = s.length - 1; while (i > 0 && s[i - 1].st === 'warm') i--; return s[i]; });
    const a = await edState();
    const d = Math.hypot(...first.cam.map((v, i) => v - a.last.cam.pos[i]));
    assert(d < 0.1, `${how}: the editor camera's first frame is the game camera (${d.toFixed(3)} m)`);
    assert(!a.shown && a.level === a.last.level && Math.hypot(a.tx - a.last.x, a.tz - a.last.z) < 0.5 && a.h === before.h && a.dirty === before.dirty, `${how}: game hidden, editing ${a.level}, orbit on the player, undo ${a.h} and unsaved ${a.dirty} unchanged`);
  };

  await dot(83, 43, 0.5);
  await press(BTN.START);
  await E(() => window.__editor.pad.hub.setTab('Play'));
  await press(BTN.DOWN);
  const before1 = await edState();
  await press(BTN.A);
  await walkIs('open', 90000);
  let p = await player();
  assert(Math.hypot(p.x - 83, p.z - 43) < 0.5 && Math.abs(p.y) < 0.3 && turnDiff(p.yaw, 0.5) < 0.0873, `Hub > Play > Walk test: the player stands at the dot in the data hall (x ${p.x.toFixed(2)}, z ${p.z.toFixed(2)}, y ${p.y.toFixed(2)}, facing ${p.yaw.toFixed(2)})`);
  const swap = await E(() => { const s = window.__swap; const i = s.findIndex((f) => f.op === '1'); return { early: s.some((f) => f.op === '1' && f.st !== 'open'), atShow: s[i]?.cam, game: window.__editor.walk.last.cam.pos }; });
  const dIn = Math.hypot(...swap.atShow.map((v, i) => v - swap.game[i]));
  assert(!swap.early && dIn < 0.1, `seamless in: the game shows only after it reports ready, the editor camera on the game camera (${dIn.toFixed(3)} m)`);
  const readout = await gf().evaluate(() => document.getElementById('walkReadout')?.textContent ?? '');
  assert(/x 83\.0, z 43\.0, Ground floor/.test(readout) && /Doors are open gaps/.test(readout), `corner readout ("${readout}")`);
  await shot('walk-game');
  const dressing = await gf().evaluate(() => window.__app.current.world.level.boxes.filter((b) => b.detail).length);
  assert(dressing === 0, `ON0b: the Kestrel walk test builds no generated wall or floor dressing (${dressing} detail pieces)`);
  await gf().evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F10', key: 'F10' })));
  await backCheck('F10', before1);
  await shot('walk-back');

  console.log('second walk, no edits: the warm game teleports; the pause screen comes back');
  const loads1 = (await edState()).loads;
  await dot(80, 40, -1);
  await page.keyboard.press('Tab');
  await walkIs('open', 30000);
  p = await player();
  assert((await edState()).loads === loads1 && Math.hypot(p.x - 80, p.z - 40) < 0.5 && turnDiff(p.yaw, -1) < 0.0873, `Tab: no reload (${loads1} loads), the player moved to the new dot (x ${p.x.toFixed(2)}, z ${p.z.toFixed(2)})`);
  const before2 = await edState();
  await gf().evaluate(() => window.__app.current.pause());
  await gf().click('text=Back to editor');
  await backCheck('pause screen Back to editor', before2);

  console.log('a wall moved 1 m without saving reaches the game; a sealed room is a valid start');
  const moved = await E(() => {
    const ed = window.__editor;
    const doors = new Set(ed.model.list('openings').map((o) => o.wall));
    const w = ed.model.list('walls').find((q) => q.level === 'G' && q.kind === 'interior' && q.a[1] === q.b[1] && Math.abs(q.a[0] - q.b[0]) > 3 && !doors.has(q.id));
    const before = ed.model.snapshot('walls', w.id);
    ed.model.commit(`e2e moved ${w.id}`, [{ coll: 'walls', id: w.id, before, after: { ...before, a: [before.a[0], before.a[1] + 1], b: [before.b[0], before.b[1] + 1] } }]);
    const roomsWithDoor = new Set(ed.model.list('openings').flatMap((o) => o.between ?? []));
    const sealed = ed.model.list('rooms').find((r) => r.level === 'G' && r.kind !== 'zone' && !roomsWithDoor.has(r.id) && r.rect[2] - r.rect[0] > 2 && r.rect[3] - r.rect[1] > 2);
    return { id: w.id, z: before.a[1] + 1, oldZ: before.a[1], lo: Math.min(w.a[0], w.b[0]), hi: Math.max(w.a[0], w.b[0]), sealed: sealed ? { id: sealed.id, x: (sealed.rect[0] + sealed.rect[2]) / 2, z: (sealed.rect[1] + sealed.rect[3]) / 2 } : null };
  });
  const sealed = moved.sealed ?? { id: 'none', x: 83, z: 43 };
  await dot(sealed.x, sealed.z, 0);
  await page.keyboard.press('Tab');
  await walkIs('open', 90000);
  p = await player();
  const coll = await gf().evaluate((m) => window.__app.current.world.level.boxes.filter((b) => b.collide && Math.abs(b.c[2] - m.z) < 0.01 && b.c[0] > m.lo && b.c[0] < m.hi && b.c[1] < 4.2).length, moved);
  const disk = await E(async (id) => (await (await fetch('/__editor/campus')).json()).walls.find((w) => w.id === id).a[1], moved.id);
  assert((await edState()).loads === loads1 + 1 && coll > 0 && disk === moved.oldZ, `wall ${moved.id} moved 1 m: the game reloaded and collides at z ${moved.z} (${coll} boxes); the file on disk still has z ${disk}`);
  assert(Math.hypot(p.x - sealed.x, p.z - sealed.z) < 0.5, `a room with no door (${sealed.id}) is a valid start (x ${p.x.toFixed(2)}, z ${p.z.toFixed(2)})`);
  const before3 = await edState();
  await gf().evaluate(() => { window.__pad.connect(); window.__pad.set(8, 1); window.__pad.set(9, 1); });
  await backCheck('View + Menu held', before3);
  await gf().evaluate(() => { window.__pad.set(8, 0); window.__pad.set(9, 0); });
  await frames(page, 4);

  console.log('ON0b: L3 held 0.6 s starts the walk test at the dot (a corridor, plain walls)');
  await dot(22, 41.75, Math.PI / 2);
  // (the editor reads the pad again only once the swap back is over and every button was let go)
  await page.waitForFunction(() => !window.__editor.walk.blocking && !window.__editor.controls.blend, null, { timeout: 20000 });
  await frames(page, 6);
  // (ON10: held until the walk starts, not for a fixed time, so a slow frame cannot cut the hold short; at most 6 s)
  const holdL3 = () => E(async (b) => {
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const t0 = performance.now();
    window.__pad.set(b, 1);
    while (window.__editor.walk.state === 'warm' && performance.now() - t0 < 6000) await raf();
    window.__pad.set(b, 0); await raf(); await raf();
    return window.__editor.walk.state !== 'warm';
  }, BTN.LS);
  for (let i = 0; i < 3 && !(await holdL3()); i++) { console.log('  (L3 hold not seen: once more)'); await frames(page, 10); }
  await walkIs('open', 90000);
  p = await player();
  const before4 = await edState();
  assert(Math.hypot(p.x - 22, p.z - 41.75) < 0.5 && !(await E(() => window.__editor.quickWalking)), `L3 held: the walk test as the player at the dot in the spine corridor (x ${p.x.toFixed(2)}, z ${p.z.toFixed(2)}), no quick walk`);
  await wait(600);
  await shot('walk-corridor-plain');
  await gf().evaluate(() => { window.__pad.connect(); window.__pad.set(8, 1); window.__pad.set(9, 1); });
  await backCheck('View + Menu held (corridor)', before4);
  await gf().evaluate(() => { window.__pad.set(8, 0); window.__pad.set(9, 0); });
  await frames(page, 4);

  console.log('Shift+Tab: quick walk; B ends it');
  await page.keyboard.press('Shift+Tab');
  await frames(page, 3);
  const qWalk = await E(() => window.__editor.quickWalking);
  await press(BTN.B);
  assert(qWalk && !(await E(() => window.__editor.quickWalking)), 'Shift+Tab starts the quick walk (as L3); B ends it');

  console.log('unsaved count is the net change; balustrade');
  await page.keyboard.press('Control+z'); await frames(page, 2);
  const wd0 = (await edState()).dirty;
  assert(wd0 === 0, `undoing the wall move brings the unsaved count back to 0 (${wd0})`);
  const wNudge = () => E(() => { const ed = window.__editor; const r = ed.model.list('rooms').find((q) => q.level === 'G' && q.kind !== 'zone'); const b = ed.model.snapshot('rooms', r.id); ed.model.commit('e2e nudge', [{ coll: 'rooms', id: r.id, before: b, after: { ...b, rect: [b.rect[0] + 0.5, b.rect[1], b.rect[2] + 0.5, b.rect[3]] } }]); });
  await wNudge();
  await wNudge();
  const wc2 = (await edState()).dirty;
  await page.keyboard.press('Control+z'); await frames(page, 2);
  const wc1 = (await edState()).dirty;
  await page.keyboard.press('Control+z'); await frames(page, 2);
  const wc0 = (await edState()).dirty;
  await E(() => window.__editor.updateBar());
  const wTitle = await E(() => document.getElementById('save').title);
  // (only with nothing to save: the test never writes the file)
  if (wc0 === 0) await E(() => window.__editor.save());
  const wStatus = await E(() => document.getElementById('status').textContent);
  assert(wc2 === 2 && wc1 === 1 && wc0 === 0 && wTitle === 'Nothing to save' && /Nothing new to save/.test(wStatus) && saves === 0, `two edits ${wc2}, undo ${wc1}, undo ${wc0}; Save title "${wTitle}", "${wStatus}", ${saves} saves`);
  const wWid = await E(() => { const ed = window.__editor; const w = ed.model.list('walls').find((q) => q.kind === 'interior'); ed.select(`walls:${w.id}`); return w.id; });
  // (Ctrl+Z handed the editor to the keyboard: one pad press takes it back)
  await press(BTN.LB);
  // the card's Type row steps through the wall kinds: right four times from interior reaches balustrade
  const wh = await E(() => window.__editor.model.history.length);
  const wKinds = await E(() => { const p = window.__editor.pad; p.editCard('type'); return true; });
  const kinds = [];
  // (each step holds the D-pad only until the kind changes, so a slow frame cannot repeat it; ON9)
  for (let i = 0; i < 4; i++) {
    kinds.push(await E(async ([id, b]) => {
      const ed = window.__editor; const raf = () => new Promise((r) => requestAnimationFrame(r)); const k0 = ed.model.get('walls', id).kind;
      window.__pad.set(b, 1);
      for (let k = 0; k < 150 && ed.model.get('walls', id).kind === k0; k++) await raf();
      window.__pad.set(b, 0); await raf(); await raf(); await raf();
      return ed.model.get('walls', id).kind;
    }, [wWid, BTN.RIGHT]));
  }
  await E(([id, h]) => { const ed = window.__editor; while (ed.model.history.length > h) ed.undo(); ed.pad.cardEditing = false; ed.select(`walls:${id}`); }, [wWid, wh]);
  const wh0 = (await edState()).h;
  await E(() => window.__editor.pad.changeType('balustrade'));
  const wCt = await E((id) => ({ h: window.__editor.model.history.length, kind: window.__editor.model.get('walls', id).kind }), wWid);
  await page.keyboard.press('Control+z'); await frames(page, 2);
  const wBack = await E((id) => window.__editor.model.get('walls', id).kind, wWid);
  assert(wKinds && kinds.includes('balustrade') && wCt.kind === 'balustrade' && wCt.h === wh0 + 1 && wBack === 'interior', `the card's Type row steps a wall through ${kinds.join(', ')}; Change type is one undo step`);

  console.log('pad screen: nothing overlaps, the hint bar is one line (ED3-pad1)');
  await press(BTN.LB);
  await E((id) => window.__editor.select(`walls:${id}`), wWid);
  for (const minimap of [false, true]) {
  await E((on) => { const ed = window.__editor; ed.prefs.layout = '3d'; ed.prefs.minimap = on; ed.applyLayout?.(); }, minimap);
  for (const [vw, vh] of [[1280, 720], [1024, 600], [932, 430]]) for (const mode of ['', 'card', 'menu']) {
    await page.setViewportSize({ width: vw, height: vh });
    await E((m) => { const p = window.__editor.pad; if (m === 'card') p.editCard('type'); else p.cardEditing = false; if (m === 'menu') p.toggleMenu(); }, mode);
    await wait(400);
    await frames(page, 4);
    const r = await E(() => {
      const ids = ['padStrip', 'toolBar', 'selCard', 'reticleText', 'hint', 'tileMenu', ...(window.__editor.isMinimap() ? ['planWrap'] : [])];
      const box = {};
      for (const id of ids) {
        const el = document.getElementById(id);
        const b = el.getBoundingClientRect();
        if (getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && b.width > 0 && el.offsetParent !== null) box[id] = [b.left, b.top, b.right, b.bottom];
      }
      const hits = [];
      const k = Object.keys(box);
      for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
        const [a, c] = [box[k[i]], box[k[j]]];
        if (a[0] < c[2] - 0.5 && c[0] < a[2] - 0.5 && a[1] < c[3] - 0.5 && c[1] < a[3] - 0.5) hits.push(`${k[i]}/${k[j]}`);
      }
      const hint = document.getElementById('hint');
      const line = parseFloat(getComputedStyle(hint).lineHeight) || parseFloat(getComputedStyle(hint).fontSize) * 1.3;
      const cut = [...document.querySelectorAll('#toolBar .slot b, #toolBar .slot small')].filter((e) => e.scrollWidth > e.clientWidth + 0.5).map((e) => e.textContent);
      return { shown: k, hits, hintCut: hint.scrollWidth > hint.clientWidth + 0.5, hintTall: hint.clientHeight > line * 1.6 + 20, slots: document.querySelectorAll('#toolBar .slot').length, cut, hint: hint.textContent, card: document.getElementById('selCard').textContent };
    });
    const want = mode === 'menu' ? r.shown.includes('tileMenu') && !r.shown.includes('selCard') : r.shown.includes('toolBar') && r.shown.includes('selCard') && r.slots === 1 && /^Interior wall /.test(r.card) && (mode !== 'card' || !r.shown.includes('reticleText'));
    assert(want && r.hits.length === 0 && !r.hintCut && !r.hintTall && r.cut.length === 0,
      `${vw} x ${vh}${minimap ? ', small plan' : ''}${mode ? `, ${mode === 'menu' ? 'menu open' : 'card editing'}` : ''}: ${r.shown.length} pad panels, overlaps [${r.hits.join(', ')}], hint one line uncut (${!r.hintCut && !r.hintTall}), ${r.slots} tool slot, cut names [${r.cut.join(', ')}], card "${r.card.slice(0, 40)}"`);
    if (mode === 'card' && vw === 1280 && !minimap) await shot('card-editing');
    await shot(`pad-screen-${vw}x${vh}${minimap ? '-small-plan' : ''}${mode ? `-${mode}` : ''}`);
    await E(() => { const p = window.__editor.pad; p.closeMenu(); p.cardEditing = false; });
  }
  }
  await page.setViewportSize({ width: 1600, height: 900 });

  console.log('rooms make walls, walls follow rooms, Split (ED3-3a)');
  await E(() => { const ed = window.__editor; ed.prefs.minimap = false; ed.setLayout('both'); ed.select(null); ed.setLevel('G'); });
  await press(BTN.LB);
  // an empty patch on the ground floor: no wall within a metre of a 10 x 8 box
  const spot = await E(() => {
    const ws = window.__editor.model.data.walls.filter((w) => w.level === 'G');
    for (let z = 4; z < 70; z += 1) for (let x = 4; x < 100; x += 1) {
      const clear = ws.every((w) => Math.max(w.a[0], w.b[0]) < x - 1 || Math.min(w.a[0], w.b[0]) > x + 11 || Math.max(w.a[1], w.b[1]) < z - 1 || Math.min(w.a[1], w.b[1]) > z + 9);
      if (clear) return [x, z];
    }
    return null;
  });
  assert(!!spot, `an empty patch on the ground floor at ${spot}`);
  const cnt = () => E(() => { const ed = window.__editor; return { rooms: ed.model.data.rooms.length, walls: ed.model.data.walls.length, h: ed.model.history.length, dirty: ed.model.dirty }; });
  const c0 = await cnt();
  await E(() => window.__editor.pad.runMenu('room.walls'));
  await page.waitForFunction(() => !!document.querySelector('#toolBar [data-slot="room"] small'), null, { timeout: 10000 }).catch(() => {});
  const bar = await E(() => document.querySelector('#toolBar [data-slot="room"] small')?.textContent);
  // (corners set on the dot directly: D-pad steps follow the camera and the magnet)
  const drawRoom = async (x, z) => {
    await dotAt(x, z);
    await press(BTN.A);
    await dotAt(x + 4, z + 3);
    await press(BTN.A);
    return E(() => { const rs = window.__editor.model.data.rooms; return rs[rs.length - 1]; });
  };
  const r1 = await drawRoom(spot[0], spot[1]);
  const c1 = await cnt();
  assert(r1.rect.join() === [spot[0], spot[1], spot[0] + 4, spot[1] + 3].join() && c1.rooms === c0.rooms + 1 && c1.walls === c0.walls + 4 && c1.h === c0.h + 1 && bar === 'With walls', `a room drawn with walls: 1 room, ${c1.walls - c0.walls} walls, ${c1.h - c0.h} undo step; tool bar says "${bar}" (${r1.rect})`);
  await shot('room-with-walls');
  const r2 = await drawRoom(r1.rect[2], r1.rect[1]);
  const c2 = await cnt();
  assert(c2.walls === c1.walls + 3 && r2.rect[0] === r1.rect[2] && r2.rect[1] === r1.rect[1], `a second room against it makes 3 new walls (${c2.walls - c1.walls}; ${r2.rect})`);
  const wallAt = (x, r) => E(([x, r]) => window.__editor.model.data.walls.find((w) => w.level === 'G' && w.a[0] === x && w.b[0] === x && Math.min(w.a[1], w.b[1]) <= r[1] && Math.max(w.a[1], w.b[1]) >= r[3])?.id, [x, r]);
  const shared = await wallAt(r1.rect[2], r1.rect);
  await E(() => window.__editor.setTool('select'));
  // stretch the shared edge 1 m east: the wall moves, both rooms resize
  await E((id) => window.__editor.select(`rooms:${id}`), r1.id);
  await dotAt(r1.rect[2] - 0.2, (r1.rect[1] + r1.rect[3]) / 2);
  await page.waitForFunction(() => /Stretch east edge/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
  const edgeWords = await dotText();
  await shot('stretch-also-resizes');
  await press(BTN.A);
  await dotAt(r1.rect[2] + 1, (r1.rect[1] + r1.rect[3]) / 2);
  await press(BTN.A);
  const s1 = await E(([a, b, w]) => { const m = window.__editor.model; return { a: m.get('rooms', a).rect, b: m.get('rooms', b).rect, w: m.get('walls', w), status: document.getElementById('status').textContent }; }, [r1.id, r2.id, shared]);
  assert(/Stretch east edge \(also resizes /.test(edgeWords) && s1.a[2] === r1.rect[2] + 1 && s1.b[0] === r1.rect[2] + 1 && s1.w.a[0] === r1.rect[2] + 1 && s1.w.b[0] === r1.rect[2] + 1, `stretching the shared side moves the wall and resizes both rooms ("${edgeWords.slice(-40)}"; ${s1.a} / ${s1.b}; "${s1.status.slice(0, 100)}")`);
  // move the first room 1 m west: its own walls go, the shared wall stays
  const ownWest = await wallAt(s1.a[0], s1.a);
  await dotAt((s1.a[0] + s1.a[2]) / 2, (s1.a[1] + s1.a[3]) / 2);
  await page.waitForFunction(() => /A: Move/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
  const moveText = await dotText();
  await press(BTN.A);
  await dotAt((s1.a[0] + s1.a[2]) / 2 - 1, (s1.a[1] + s1.a[3]) / 2);
  await press(BTN.A);
  const s2 = await E(([a, w, o]) => { const m = window.__editor.model; return { a: m.get('rooms', a).rect, w: m.get('walls', w), o: m.get('walls', o) }; }, [r1.id, shared, ownWest]);
  assert(/Move \(1 shared wall stays\)/.test(moveText) && s2.a[0] === s1.a[0] - 1 && s2.w.a[0] === s1.w.a[0] && s2.o.a[0] === s1.a[0] - 1, `moving the first room takes its walls and leaves the shared one ("${moveText.slice(-30)}"; west wall ${s1.a[0]} -> ${s2.o.a[0]}, shared ${s2.w.a[0]})`);
  // Split the second room across its middle
  await E((id) => window.__editor.select(`rooms:${id}`), r2.id);
  const b2 = await E((id) => window.__editor.model.get('rooms', id).rect, r2.id);
  await E(() => window.__editor.pad.runMenu('sel.split'));
  await dotAt(b2[0] + 1.5, (b2[1] + b2[3]) / 2);
  await page.waitForFunction(() => /split here|Too close/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
  const splitWords = await dotText();
  await shot('split-ghost');
  const c3 = await cnt();
  await press(BTN.A);
  const c4 = await cnt();
  const parts = await E((id) => { const m = window.__editor.model; const n = m.get('rooms', id).name; return m.data.rooms.filter((r) => r.id === id || r.name === `${n} 2`).map((r) => r.rect); }, r2.id);
  assert(/A: split here/.test(splitWords) && c4.rooms === c3.rooms + 1 && c4.walls === c3.walls + 1 && c4.h === c3.h + 1 && parts.length === 2, `Split makes 2 rooms and 1 wall in one undo step ("${splitWords.slice(-50)}"; ${parts.map((p) => p.join(' ')).join(' | ')})`);
  await E(() => window.__editor.setLayout('plan'));
  await wait(1200);
  await shot('split-plan');
  await E(() => window.__editor.setLayout('both'));
  // walls follow rooms off: stretching moves no wall
  await E(() => window.__editor.setWallsFollow(false));
  const wallsBefore = await E(() => JSON.stringify(window.__editor.model.data.walls));
  await E((id) => window.__editor.select(`rooms:${id}`), r2.id);
  const b3 = await E((id) => window.__editor.model.get('rooms', id).rect, r2.id);
  await dotAt(b3[0] + 0.2, (b3[1] + b3[3]) / 2);
  await press(BTN.A);
  await dotAt(b3[0] - 1, (b3[1] + b3[3]) / 2);
  await press(BTN.A);
  const off = await E(([id, wb]) => ({ rect: window.__editor.model.get('rooms', id).rect, same: JSON.stringify(window.__editor.model.data.walls) === wb }), [r2.id, wallsBefore]);
  await E(() => window.__editor.setWallsFollow(true));
  assert(off.same && off.rect[0] === b3[0] - 1, `with "Walls follow rooms" off the room stretches alone (${off.rect}; walls unchanged ${off.same})`);
  // undo everything: back to the file
  const undone = await E(() => { const ed = window.__editor; let n = 0; while (ed.model.dirty > 0 && n < 30) { ed.undo(); n++; } return { n, dirty: ed.model.dirty, rooms: ed.model.data.rooms.length, walls: ed.model.data.walls.length }; });
  assert(undone.dirty === 0 && undone.rooms === c0.rooms && undone.walls === c0.walls, `undo ${undone.n} times: unsaved 0, rooms and walls as in the file`);

  console.log('ON0b: 0.1 m nudges, a wall gap and Close gap, square corners in 3D, LB + right stick height');
  {
    await E(() => { const ed = window.__editor; ed.setLayout('3d'); ed.select(null); ed.setTool('select'); });
    const [sx, sz] = [spot[0] + 2, spot[1] + 2];
    // an L of two walls drawn with the pad; then the second is set 0.04 m short of the first in the data (the grid is 0.1)
    const drawWall = async (a, b) => {
      await E(() => window.__editor.pad.runMenu('build.wall'));
      await dotAt(a[0], a[1]);
      await press(BTN.A);
      await dotAt(b[0], b[1]);
      await press(BTN.A);
      await press(BTN.B);
      return E(() => { const ws = window.__editor.model.data.walls; return ws[ws.length - 1]; });
    };
    const wA = await drawWall([sx, sz], [sx + 4, sz]);
    const wB = await drawWall([sx + 4, sz + 3], [sx + 4, sz + 0.5]);
    await E(() => window.__editor.setTool('select'));
    await E(([id, z]) => { const ed = window.__editor; const b = ed.model.snapshot('walls', id); ed.commit([{ coll: 'walls', id, before: b, after: { ...b, b: [b.b[0], z] } }]); }, [wB.id, sz + 0.04]);
    await frames(page, 4);
    const g1 = await E((id) => ({ gaps: window.__editor.gapsOf(id).map((g) => `${g.dist}`), lines: window.__editor.problemLines().filter((l) => l.text.startsWith('Gap')).map((l) => l.text) }), wB.id);
    await E((id) => window.__editor.select(`walls:${id}`), wB.id);
    await frames(page, 3);
    const tiles = await E(() => window.__editor.pad.menuInput().sel?.gap);
    // the corner close up, from the south-west
    const look = () => E(([x, z]) => { const ed = window.__editor; ed.controls.mode = 'fly'; ed.view.camera.position.set(x + 6.5, 7.5, z - 8); ed.controls.lookAt(x, 0.5, z); }, [sx + 4, sz]);
    await look();
    await frames(page, 4);
    await shot('corner-gap-before');
    assert(g1.gaps.join() === '0.04' && g1.lines.some((l) => l.startsWith('Gap 0.04 m: ') && l.includes(wA.id) && l.includes(wB.id)) && tiles === true, `a wall end 0.04 m short of a corner: "Gap 0.04 m" in the checks, Close gap on the Selected tab (${g1.lines.join('; ')})`);
    await E(() => window.__editor.pad.runMenu('sel.closeGap'));
    await frames(page, 4);
    const fixed = await E((id) => ({ b: window.__editor.model.get('walls', id).b, gaps: window.__editor.gapsOf(id).length }), wB.id);
    // 3D: the two walls' boxes overlap at the corner, each reaching the other's outer face
    const bounds = await E(([a, b]) => {
      const sc = window.__editor.view.scene;
      const bb = (id) => { const ms = sc.meshes.filter((m) => m.name === `wall ${id}`); const lo = [Infinity, Infinity], hi = [-Infinity, -Infinity]; for (const m of ms) { m.computeWorldMatrix(true); m.refreshBoundingInfo(); const bi = m.getBoundingInfo().boundingBox; lo[0] = Math.min(lo[0], bi.minimumWorld.x); lo[1] = Math.min(lo[1], bi.minimumWorld.z); hi[0] = Math.max(hi[0], bi.maximumWorld.x); hi[1] = Math.max(hi[1], bi.maximumWorld.z); } return { lo, hi, n: ms.length }; };
      return { a: bb(a.id), b: bb(b.id), ta: a.t, tb: b.t };
    }, [wA, wB]);
    await look();
    await frames(page, 4);
    await shot('corner-joined-after');
    const ex = sx + 4 + bounds.tb / 2;
    const ez = sz - bounds.ta / 2;
    assert(fixed.b[1] === sz && fixed.gaps === 0 && Math.abs(bounds.a.hi[0] - ex) < 0.01 && Math.abs(bounds.b.lo[1] - ez) < 0.01, `Close gap: the end sits on the corner; in 3D both walls reach the outside corner (${bounds.a.hi[0].toFixed(3)} / ${ex}, ${bounds.b.lo[1].toFixed(3)} / ${ez}), no gap`);
    // a 0.3 m nudge is three 0.1 m D-pad steps
    await E(() => { const ed = window.__editor; if (ed.controls.mode !== 'orbit') ed.enterOrbit(); });
    await E((id) => window.__editor.select(`walls:${id}`), wA.id);
    await dotAt(sx + 2, sz);
    await page.waitForFunction(() => /A: Move/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const nb = await E((id) => window.__editor.model.get('walls', id).a.slice(), wA.id);
    await press(BTN.A);
    // each step: hold the D-pad only until the wall moves (in the page), so a slow frame cannot repeat it
    for (let i = 0; i < 3; i++) {
      await E(async ([, b]) => {
        const pc = window.__editor.pad; const o0 = pc.offset.join(); const raf = () => new Promise((r) => requestAnimationFrame(r));
        window.__pad.set(b, 1);
        for (let k = 0; k < 120 && pc.offset.join() === o0; k++) await raf();
        window.__pad.set(b, 0); await raf(); await raf();
      }, [0, BTN.RIGHT]);
    }
    await press(BTN.A);
    const na = await E((id) => window.__editor.model.get('walls', id).a.slice(), wA.id);
    assert(Math.abs(na[0] - nb[0] - 0.3) < 1e-6 && na[1] === nb[1], `three D-pad nudges move the wall 0.3 m (${nb[0]} -> ${na[0]})`);
    // LB + right stick up: the camera rises without tilting; the hint bar says so while LB is held
    await E(() => window.__editor.select(null));
    const h0 = await orb();
    await set(BTN.LB, 1);
    await frames(page, 3);
    const lbHint = await E(() => document.getElementById('hint').textContent);
    await rs(-1);
    // (held until it has risen a metre: slow headless frames are capped at 0.05 s each)
    await page.waitForFunction((y) => window.__editor.controls.orbit.position()[1] > y + 1, h0.py, { timeout: 8000 }).catch(() => {});
    await rs(0);
    await wait(400);
    await set(BTN.LB, 0);
    await frames(page, 3);
    const h1 = await orb();
    assert(/Height/.test(lbHint) && h1.py > h0.py + 1 && Math.abs(h1.pitch - h0.pitch) < 1e-9 && Math.hypot(h1.px - h0.px, h1.pz - h0.pz) < 0.05, `LB + right stick up raises the camera ${(h1.py - h0.py).toFixed(2)} m, tilt unchanged; hint "${lbHint.slice(0, 40)}"`);
    const left = await E(() => { const ed = window.__editor; let n = 0; while (ed.model.dirty > 0 && n < 30) { ed.undo(); n++; } return ed.model.dirty; });
    assert(left === 0, 'ON0b steps undone: back to the file');
  }

  console.log('ON1: wall chains, door centring and distances, live sizes, guide lines');
  {
    await E(() => { const ed = window.__editor; ed.prefs.minimap = false; ed.setLayout('both'); ed.select(null); ed.setTool('select'); ed.setLevel('G'); if (ed.controls.mode !== 'orbit') ed.enterOrbit(); });
    // an empty patch: no wall or room edge within a metre of a 16 x 6 box
    const free = await E(() => {
      const ed = window.__editor;
      const ws = ed.model.data.walls.filter((w) => w.level === 'G');
      const rs = ed.model.data.rooms.filter((r) => r.level === 'G');
      for (let z = 4; z < 70; z += 1) for (let x = 4; x < 100; x += 1) {
        const clear = ws.every((w) => Math.max(w.a[0], w.b[0]) < x - 1 || Math.min(w.a[0], w.b[0]) > x + 17 || Math.max(w.a[1], w.b[1]) < z - 1 || Math.min(w.a[1], w.b[1]) > z + 7)
          && rs.every((r) => {
            // no room edge crosses the box (a big room around it all is fine)
            const [x0, z0, x1, z1] = r.rect;
            const hitX = (v) => v >= x - 1 && v <= x + 17 && z1 >= z - 1 && z0 <= z + 7;
            const hitZ = (v) => v >= z - 1 && v <= z + 7 && x1 >= x - 1 && x0 <= x + 17;
            return !hitX(x0) && !hitX(x1) && !hitZ(z0) && !hitZ(z1);
          });
        if (clear) return [x, z];
      }
      return null;
    });
    assert(!!free, `ON1: an empty patch at ${free}`);
    const [x, z] = free;
    const n0 = await E(() => ({ walls: window.__editor.model.data.walls.length, h: window.__editor.model.history.length }));
    const chainN = () => E(() => window.__editor.chain.walls.length);
    await E(() => window.__editor.pad.runMenu('build.wall'));
    await dotAt(x, z);
    await press(BTN.A);
    await dotAt(x + 5, z);
    await press(BTN.A);
    await dotAt(x + 5, z + 4);
    await press(BTN.A);
    const hintChain = (await st()).hint;
    // X removes the last finished wall; the wall being drawn starts again from its start
    await press(BTN.X);
    const afterX = await chainN();
    await dotAt(x + 5, z + 4);
    await press(BTN.A);
    await dotAt(x, z + 4);
    await page.waitForFunction(() => /length 5 m.*chain: 3 walls, 14 m/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const chainWords = await dotText();
    await shot('on1-chain-drawing');
    await press(BTN.A);
    await dotAt(x, z);
    await press(BTN.A);
    const n1 = await E(() => { const ed = window.__editor; const j = ed.model.journal; return { walls: ed.model.data.walls.length, h: ed.model.history.length, text: j[j.length - 1]?.text, drag: !!ed.drag, chain: ed.chain.walls.length }; });
    assert(afterX === 1 && /A Next wall/.test(hintChain) && /X Remove last/.test(hintChain) && /B End chain/.test(hintChain) && /LB Fine/.test(hintChain), `ON1: X removes the last wall while chaining (${afterX} left); hint "${hintChain}"`);
    assert(/length 5 m/.test(chainWords) && /chain: 3 walls, 14 m/.test(chainWords), `ON1: the dot shows the wall length and the chain while drawing ("${chainWords}")`);
    assert(n1.walls === n0.walls + 4 && n1.h === n0.h + 1 && n1.text === 'Added 4 walls (a chain, 18 m)' && !n1.drag && n1.chain === 0, `ON1: a 3-wall run closed on its first point: ${n1.walls - n0.walls} walls, ${n1.h - n0.h} undo step, "${n1.text}"`);
    await E(() => window.__editor.undo());
    const n2 = await E(() => window.__editor.model.data.walls.length);
    await E(() => window.__editor.redo());
    assert(n2 === n0.walls, `ON1: one undo takes the whole chain away (${n0.walls + 4} -> ${n2})`);

    // door centring: the south wall runs x .. x + 5 between the two corner walls: its clear middle is x + 2.5
    const south = await E(([x, z]) => window.__editor.model.data.walls.find((w) => w.a[0] === x && w.a[1] === z && w.b[0] === x + 5 && w.b[1] === z)?.id, [x, z]);
    await E(() => window.__editor.pad.runMenu('door.door'));
    await dotAt(x + 2.8, z);
    await page.waitForFunction(() => /Centred/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const doorWords = await dotText();
    await shot('on1-door-centred');
    await press(BTN.A);
    const door = await E((id) => { const os = window.__editor.model.data.openings; const o = os[os.length - 1]; return { wall: o.wall, at: o.at, w: o.w }; }, south);
    const dm = /Centred, ([\d.]+) m \| ([\d.]+) m/.exec(doorWords);
    assert(!!south && door.wall === south && Math.abs(door.at - 2.5) <= 0.01 && !!dm && dm[1] === dm[2], `ON1: a door placed near the middle sits centred between the cross walls (at ${door.at} m of 5 m; "${doorWords.slice(0, 90)}")`);

    // live size words while drawing a room
    await E(() => window.__editor.pad.runMenu('room.none'));
    await dotAt(x + 9, z + 1);
    await press(BTN.A);
    await dotAt(x + 13, z + 4);
    await page.waitForFunction(() => /4 x 3 m, 12 m2/.test(document.getElementById('reticleText').textContent) && [...document.querySelectorAll('#padGhost text.live')].some((t) => /4 x 3 m, 12 m2/.test(t.textContent)), null, { timeout: 5000 }).catch(() => {});
    const roomWords = await dotText();
    const planText = await E(() => [...document.querySelectorAll('#padGhost text.live')].map((t) => t.textContent).join(' | '));
    await press(BTN.B);
    assert(/4 x 3 m, 12 m2/.test(roomWords) && /4 x 3 m, 12 m2/.test(planText), `ON1: live room size at the dot and on the plan ("${roomWords.slice(0, 60)}", plan "${planText.slice(0, 40)}")`);

    // a guide line while the magnet holds a snap (a wall end of the chain)
    await E(() => window.__editor.pad.runMenu('select'));
    await dotAt(x + 0.2, z + 0.15);
    await page.waitForFunction(() => document.querySelectorAll('#padGhost line.guide').length > 0, null, { timeout: 5000 }).catch(() => {});
    const guide = await E(() => ({ snap: window.__editor.pad.magnet?.label ?? null, plan: document.querySelectorAll('#padGhost line.guide').length, marks: window.__editor.view.scene.meshes.filter((m) => m.isEnabled() && /mark/i.test(m.name)).length }));
    await dotAt(x + 2.5, z + 2);
    await page.waitForFunction(() => document.querySelectorAll('#padGhost line.guide').length === 0, null, { timeout: 5000 }).catch(() => {});
    const guideOff = await E(() => document.querySelectorAll('#padGhost line.guide').length);
    assert(guide.snap === 'Wall end' && guide.plan === 2 && guideOff === 0, `ON1: guide lines while snapped (${guide.snap}: ${guide.plan} on the plan, ${guide.marks} marks in 3D), gone when the snap lets go (${guideOff})`);
    const left = await E(() => { const ed = window.__editor; let n = 0; while (ed.model.dirty > 0 && n < 30) { ed.undo(); n++; } return ed.model.dirty; });
    assert(left === 0, 'ON1 steps undone: back to the file');
  }

  console.log('ON2: a dogleg main stair from Ground to First with the pad, its well, the walk test; a level above the roof and back');
  {
    await E(() => { const ed = window.__editor; ed.prefs.minimap = false; ed.setLayout('both'); ed.select(null); ed.setTool('select'); ed.setLevel('G'); if (ed.controls.mode !== 'orbit') ed.enterOrbit(); });
    const text0 = await E(() => JSON.stringify(window.__editor.model.data, null, 1));
    const h0 = await E(() => window.__editor.model.history.length);
    // first (frames are quicker before the walk test warms the game): a level above the roof with the pad (Levels tab: Add a level above, a name from the list), deleted again, then undone
    await E(() => { const ed = window.__editor; ed.select(null); ed.setTool('select'); ed.setLevel('R'); });
    await press(BTN.START);
    await E(() => window.__editor.pad.hub.setTab('Levels'));
    // (each step holds the D-pad only until the focus moves, so a slow frame cannot repeat it; ON9)
    const hubStep = (btn) => E(async (b) => { const raf = () => new Promise((r) => requestAnimationFrame(r)); const f = () => document.querySelector('#hub .padfocus')?.dataset.row ?? ''; const r0 = f(); window.__pad.set(b, 1); for (let k = 0; k < 150 && f() === r0; k++) await raf(); window.__pad.set(b, 0); await raf(); await raf(); await raf(); }, btn);
    const toHubRow = async (row, btn = BTN.DOWN) => { for (let i = 0; i < 40 && (await E(() => document.querySelector('#hub .padfocus')?.dataset.row)) !== row; i++) await hubStep(btn); return (await E(() => document.querySelector('#hub .padfocus')?.dataset.row)) === row; };
    assert(await toHubRow('lv.addAbove'), 'ON2: the Levels tab has "Add a level above Roof"');
    await shot('on2-levels');
    await press(BTN.A);
    await page.waitForFunction(() => window.__editor.pad.names.isOpen, null, { timeout: 5000 }).catch(() => {});
    const pick = await E(() => document.querySelector('#namePick .np-item.hl')?.textContent ?? '');
    await press(BTN.A);
    await page.waitForFunction(() => window.__editor.pad.hub.isOpen && window.__editor.model.data.levels.length === 8, null, { timeout: 5000 }).catch(() => {});
    const added = await E(() => { const ed = window.__editor; const l = ed.model.data.levels.at(-1); return { n: ed.model.data.levels.length, id: l.id, name: l.name, floor: l.floor, height: l.height, editing: ed.view.level, opt: [...document.getElementById('level').options].some((o) => o.value === l.id) }; });
    assert(added.n === 8 && added.name === pick && Math.abs(added.floor - 9.5) < 1e-6 && Math.abs(added.height - 1.1) < 1e-6 && added.editing === added.id && added.opt, `ON2: a level "${added.name}" (${added.id}) above the roof at ${added.floor} m, storey ${added.height} m from its neighbour; editing it; in the level list`);
    assert(await toHubRow('lv.delete'), 'ON2: the Levels tab has "Delete"');
    await press(BTN.A);
    await page.waitForFunction(() => !document.getElementById('ask').classList.contains('hidden'), null, { timeout: 5000 }).catch(() => {});
    const askText = await E(() => document.getElementById('ask').textContent);
    await press(BTN.A);
    await page.waitForFunction(() => window.__editor.model.data.levels.length === 7, null, { timeout: 5000 }).catch(() => {});
    const afterDel = await E(() => ({ n: window.__editor.model.data.levels.length, editing: window.__editor.view.level }));
    assert(/Delete level .* With it go nothing on it/.test(askText) && afterDel.n === 7 && afterDel.editing === 'R', `ON2: Delete asks first ("${askText.slice(0, 80)}"), the level goes, editing drops to the roof`);
    await press(BTN.B);
    await E(() => { window.__editor.undo(); window.__editor.undo(); });
    const back = await E(() => JSON.stringify(window.__editor.model.data, null, 1));
    assert(back === text0, 'ON2: after undo the campus text is byte-identical');
    await E(() => { const ed = window.__editor; ed.setLevel('G'); ed.select(null); });
    // an empty patch 4.5 x 6.5 m inside a ground room with a first-floor room over it: no wall, stair or hole on G or F near it
    const spot = await E(() => {
      const d = window.__editor.model.data;
      const hit = (r, a) => r[0] < a[2] && r[2] > a[0] && r[1] < a[3] && r[3] > a[1];
      const inside = (r, a) => a[0] >= r[0] && a[1] >= r[1] && a[2] <= r[2] && a[3] <= r[3];
      for (const needF of [true, false])
        for (let z = 31; z < 58; z += 0.5) for (let x = 5; x < 98; x += 0.5) {
          const box = [x - 0.6, z - 0.6, x + 4.3, z + 6.6];
          if (d.walls.some((w) => (w.level === 'G' || w.level === 'F') && hit([Math.min(w.a[0], w.b[0]) - 0.3, Math.min(w.a[1], w.b[1]) - 0.3, Math.max(w.a[0], w.b[0]) + 0.3, Math.max(w.a[1], w.b[1]) + 0.3], box))) continue;
          if (d.stairs.some((s) => hit(s.rect, box)) || d.voids.some((v) => (v.level === 'G' || v.level === 'F') && hit(v.rect, box))) continue;
          if (!d.rooms.some((r) => r.level === 'G' && inside(r.rect, box))) continue;
          if (needF && !d.rooms.some((r) => r.level === 'F' && inside(r.rect, box))) continue;
          // no room edge crosses the box (the magnet would pull the dot onto it)
          const crosses = (r) => { const [x0, z0, x1, z1] = r.rect; const inX = (v) => v > box[0] && v < box[2] && z1 > box[1] && z0 < box[3]; const inZ = (v) => v > box[1] && v < box[3] && x1 > box[0] && x0 < box[2]; return inX(x0) || inX(x1) || inZ(z0) || inZ(z1); };
          if (d.rooms.some((r) => (r.level === 'G' || r.level === 'F') && crosses(r))) continue;
          return { x, z };
        }
      return null;
    });
    assert(!!spot, 'ON2: an empty patch for the stair');
    const { x, z } = spot;
    await press(BTN.Y);
    assert(await toTile('Stair: Main dogleg'), 'ON2: the Build tab has the Stair: Main dogleg tile');
    await press(BTN.A);
    assert((await st()).tool === 'stair', 'ON2: A picks the Stair tool');
    await dotAt(x, z);
    await page.waitForFunction(() => /start corner of a stair/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const startWords = await dotText();
    await press(BTN.A);
    await dotAt(x + 0.3, z + 3);
    await page.waitForFunction(() => /25 risers/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    await press(BTN.A);
    await page.waitForFunction(() => window.__editor.stairDraw?.phase === 'proposed' && /A: accept/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const ghost = await E(() => ({ words: document.getElementById('reticleText').textContent, phase: window.__editor.stairDraw?.phase, id: window.__editor.stairDraw?.id }));
    await shot('on2-stair-ghost');
    assert(/start corner of a stair \(Main dogleg\) to First/.test(startWords) && ghost.phase === 'proposed' && /25 risers of 0\.168 m, going 0\.285 m, 2 flights \(13 \+ 12\), landing 2 m/.test(ghost.words), `ON2: the proposal in words before A accepts ("${ghost.words.slice(0, 140)}")`);
    await press(BTN.A);
    await page.waitForFunction((id) => !window.__editor.stairDraw && !!window.__editor.model.get('stairs', id), ghost.id, { timeout: 5000 }).catch(() => {});
    const made = await E((id) => {
      const ed = window.__editor;
      const s = ed.model.get('stairs', id);
      const well = s && ed.model.data.voids.find((v) => v.kind === 'stairwell' && v.level === 'F' && v.rect.join() === s.rect.join());
      return { s, well: well?.id ?? null, h: ed.model.history.length, mesh: ed.view.scene.meshes.some((m) => m.name === `stair ${id}` && m.isEnabled()), sel: ed.selected, card: document.getElementById('selCard').textContent };
    }, ghost.id);
    assert(!!made.s && made.s.from === 'G' && made.s.to === 'F' && made.s.layout === 'dogleg' && made.s.kind === 'main' && made.s.risers === 25 && made.s.rect[0] === x && made.s.rect[1] === z && made.s.up === 'N', `ON2: A accepts a 25-riser main dogleg G to F from the corner (${JSON.stringify(made.s?.rect)}, climbs ${made.s?.up})`);
    assert(!!made.well && made.h === h0 + 1 && made.mesh && made.sel === `stairs:${ghost.id}` && /Fits: 25 risers/.test(made.card), `ON2: its stairwell ${made.well} is on First in the same undo step; drawn in 3D; selected, the card says it fits ("${made.card.slice(0, 80)}")`);
    await E(([x, z]) => { const o = window.__editor.controls.orbit.s; o.tx = x + 2; o.tz = z + 3; o.yaw = 0.6; o.dist = 12; o.pitch = 1.05; }, [x, z]);
    await frames(page, 10);
    await shot('on2-stair-3d');

    // the walk test builds it from the same data: the game's collision has the flights and the landing up to First
    const foot = await E((id) => { const ed = window.__editor; const s = ed.model.get('stairs', id); return [s.rect[0] + 0.9, s.rect[1] + 0.3]; }, ghost.id);
    await dot(foot[0], foot[1], 0);
    await page.keyboard.press('Tab');
    await walkIs('open', 90000);
    p = await player();
    const flights = await gf().evaluate((r) => window.__app.current.world.level.boxes.filter((b) => b.collide && b.c[0] > r[0] && b.c[0] < r[2] && b.c[2] > r[1] && b.c[2] < r[3] && b.c[1] > 0.2).map((b) => +(b.c[1] + b.s[1] / 2).toFixed(2)), made.s.rect);
    const high = flights.filter((y) => y > 3).length;
    assert(Math.abs(p.y) < 0.3 && flights.length >= 3 && high > 0, `ON2: the walk test stands at the stair foot (y ${p.y.toFixed(2)}) and collides with its flights and landing (${flights.length} pieces, ${high} reaching above 3 m)`);
    const beforeW = await edState();
    await gf().evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F10', key: 'F10' })));
    await backCheck('F10 after the stair', beforeW);
    await E(() => window.__editor.undo());
    const gone = await E((id) => ({ s: !!window.__editor.model.get('stairs', id), text: JSON.stringify(window.__editor.model.data, null, 1) }), ghost.id);
    assert(!gone.s && gone.text === text0, 'ON2: one undo takes the stair and its well away (the file as before)');

    await E(() => window.__editor.setLevel('G'));
  }

  console.log('ON9: a card sliding glass door at Building A, a fire door one-way out, a frosted window with blinds closed, a Type flip, a save, the walk test door');
  {
    await E(() => { const ed = window.__editor; ed.prefs.minimap = false; ed.setLayout('both'); ed.select(null); ed.setTool('select'); ed.setLevel('G'); if (ed.controls.mode !== 'orbit') ed.enterOrbit(); });
    // holds a D-pad button only until what it moves changes (the menu highlight or the card's lit row), so a slow frame cannot repeat it
    const hold = (btn, what) => E(async ([b, what]) => {
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const probe = () => {
        if (what === 'menu') { const m = window.__editor.pad.menu; return `${m.tab}|${m.index}`; }
        const r = document.querySelector('#selCard .crow.on');
        return r ? `${r.dataset.row}|${r.querySelector('b').textContent}` : '';
      };
      const v0 = probe();
      window.__pad.set(b, 1);
      for (let k = 0; k < 150 && probe() === v0; k++) await raf();
      window.__pad.set(b, 0); await raf(); await raf(); await raf();
    }, [btn, what]);
    const litRow = () => E(() => document.querySelector('#selCard .crow.on')?.dataset.row ?? '');
    // down to the row; if the card stops (its last row) before it, back up (ON10: a row passed on a slow frame is found)
    const toRowHeld = async (row) => {
      for (const btn of [BTN.DOWN, BTN.UP]) {
        for (let i = 0; i < 24 && (await litRow()) !== row; i++) {
          const was = await litRow();
          await hold(btn, 'card');
          if ((await litRow()) === was && was) break;
        }
      }
      return (await litRow()) === row;
    };
    const tileTo = async (name) => {
      for (let i = 0; i < 8 && (await menuState()).tab !== 'Openings'; i++) await hold(BTN.RB, 'menu');
      for (let i = 0; i < 20 && (await menuState()).tile !== name; i++) await hold(BTN.RIGHT, 'menu');
      return (await menuState()).tile === name;
    };
    // Building A's entrance wall (the wall of the front entrance RA03); a spot on it clear of its openings and of cross walls
    const entWall = await E(() => window.__editor.model.data.openings.find((o) => o.id === 'RA03')?.wall ?? null);
    assert(!!entWall, `ON9: Building A's entrance wall (${entWall})`);
    const freeSpot = () => E((id) => {
      const d = window.__editor.model.data;
      const w = d.walls.find((q) => q.id === id);
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      const dir = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
      const segD = (p, q) => { const dx = q.b[0] - q.a[0]; const dz = q.b[1] - q.a[1]; const l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((p[0] - q.a[0]) * dx + (p[1] - q.a[1]) * dz) / l2)); return Math.hypot(p[0] - q.a[0] - dx * t, p[1] - q.a[1] - dz * t); };
      for (let s = 3; s < L - 3; s += 0.5) {
        const p = [w.a[0] + dir[0] * s, w.a[1] + dir[1] * s];
        if (d.openings.filter((o) => o.wall === id).some((o) => Math.abs(o.at - s) < o.w / 2 + 2.6)) continue;
        if (d.walls.some((q) => q.level === w.level && q.id !== id && segD(p, q) < 2)) continue;
        return p;
      }
      return null;
    }, entWall);
    const lastOf = (type) => E((t) => { const os = window.__editor.model.data.openings.filter((o) => o.type === t); return os[os.length - 1] ?? null; }, type);
    const place = async (tile, type) => {
      const n0 = await E((t) => window.__editor.model.data.openings.filter((o) => o.type === t).length, type);
      await E(() => { window.__editor.select(null); window.__editor.setTool('select'); });
      await press(BTN.Y);
      const ok = await tileTo(tile);
      if (tile === 'Sliding glass door (card)') await shot('on9-openings-tab');
      await press(BTN.A);
      const spot = await freeSpot();
      if (!ok || !spot) return null;
      await dotAt(spot[0], spot[1]);
      await page.waitForFunction((t) => document.getElementById('reticleText').textContent.includes(`A: place ${t}`), tile, { timeout: 5000 }).catch(() => {});
      // LB held: no centring between the cross walls (the spot was picked clear of the openings already there)
      await set(BTN.LB, 1);
      await frames(page, 2);
      await press(BTN.A);
      await set(BTN.LB, 0);
      await frames(page, 3);
      await page.waitForFunction(([t, n]) => window.__editor.model.data.openings.filter((o) => o.type === t).length > n, [type, n0], { timeout: 5000 }).catch(() => {});
      return lastOf(type);
    };

    const card = await place('Sliding glass door (card)', 'slide-card');
    assert(!!card && card.wall === entWall && card.door?.reader === 'card' && card.locked === true, `ON9: Openings tab > Sliding glass door (card) placed on Building A's entrance wall, card reader and locked by default (${JSON.stringify(card?.door)})`);
    await E(() => window.__editor.setTool('select'));
    await E((id) => window.__editor.select(`openings:${id}`), card.id);
    await frames(page, 3);
    assert(await toRowHeld('level'), 'ON9: D-pad down reaches the Card level row');
    for (let i = 0; i < 6 && (await E((id) => window.__editor.model.get('openings', id).door.level, card.id)) !== 2; i++) await hold(BTN.RIGHT, 'card');
    await page.waitForFunction(() => /Level 2/.test(document.querySelector('#selCard .crow.on b')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const cardRowsText = await E(() => [...document.querySelectorAll('#selCard .crow')].map((r) => r.dataset.row).join(','));
    await shot('on9-door-card');
    const c2 = await E((id) => { const ed = window.__editor; const o = ed.model.get('openings', id); const on = (n) => ed.view.scene.meshes.some((m) => m.name === `opening ${id} ${n}` && m.isEnabled()); return { door: o.door, sign: on('sign'), reader: on('reader'), marks: on('marks') }; }, card.id);
    assert(c2.door.level === 2 && c2.door.reader === 'card' && !/hinge/.test(cardRowsText) && /stack/.test(cardRowsText) && c2.sign && c2.reader && c2.marks, `ON9: Card level 2 with a card reader; no Hinge row on a sliding door (rows ${cardRowsText}); 3D draws the level plate, the reader and the track`);
    await press(BTN.B);

    const fire = await place('Fire door', 'fire-door');
    const inner = await E((o) => { const d = window.__editor.model.data; return o.between.find((id) => { const r = d.rooms.find((q) => q.id === id); return r && !['yard', 'lane', 'roof'].includes(r.kind); }) ?? null; }, fire);
    assert(!!fire && fire.door?.oneWay === inner && fire.door?.swing === fire.between.find((b) => b !== inner) && fire.door?.closer === true, `ON9: a fire door is one-way out by default: free from ${inner}, swings out to ${fire?.door?.swing}, self-closing`);

    const win = await place('Frosted fixed window', 'window-frosted');
    assert(!!win && win.glass?.kind === 'frosted', `ON9: a frosted window placed (${JSON.stringify(win?.glass)})`);
    await E(() => window.__editor.setTool('select'));
    await E((id) => window.__editor.select(`openings:${id}`), win.id);
    await frames(page, 3);
    assert(await toRowHeld('blinds'), 'ON9: the window card has a Blinds row');
    for (let i = 0; i < 6 && (await E((id) => window.__editor.model.get('openings', id).glass.blinds, win.id)) !== 'closed'; i++) await hold(BTN.LEFT, 'card');
    const w2 = await E((id) => ({ g: window.__editor.model.get('openings', id).glass, blinds: window.__editor.view.scene.meshes.some((m) => m.name === `opening ${id} blinds` && m.isEnabled()) }), win.id);
    assert(w2.g.blinds === 'closed' && w2.blinds, `ON9: blinds closed on the frosted window, drawn in 3D (${JSON.stringify(w2.g)})`);
    await press(BTN.B);

    // the Type row flips within the family: a door stays a door
    await E((id) => window.__editor.select(`openings:${id}`), card.id);
    await frames(page, 3);
    const hT = await E(() => window.__editor.model.history.length);
    await hold(BTN.RIGHT, 'card');
    const flipped = await E((id) => ({ o: window.__editor.model.get('openings', id), lit: document.querySelector('#selCard .crow.on')?.dataset.row, h: window.__editor.model.history.length }), card.id);
    assert(flipped.o.type === 'slide' && flipped.lit === 'type' && flipped.h === hT + 1 && flipped.o.door.level === 2, `ON9: D-pad right on Type: Sliding glass door (card) -> ${flipped.o.type} (a door), the card level kept`);
    await press(BTN.B);
    await E(() => window.__editor.undo());
    assert((await E((id) => window.__editor.model.get('openings', id).type, card.id)) === 'slide-card', 'ON9: undo puts the card door back');

    // the plan's symbols: framed on the new doors
    await E((id) => { const ed = window.__editor; ed.select(`openings:${id}`); ed.frameSelected(); }, fire.id);
    await page.waitForFunction(() => (document.querySelector('#planSvg svg')?.innerHTML.match(/#5b8fb9/g) ?? []).length > 0, null, { timeout: 15000 }).catch(() => {});
    await wait(500);
    await shot('on9-plan-symbols');
    const planHatch = await E(() => (document.querySelector('#planSvg svg')?.innerHTML.match(/#5b8fb9/g) ?? []).length);
    assert(planHatch > 0, `ON9: the plan draws glass hatching (${planHatch} hatch lines)`);

    // saved to the sandbox with the new data fields
    await E(() => window.__editor.saveNow());
    await page.waitForFunction(() => /Saved \d+ change/.test(document.getElementById('status').textContent), null, { timeout: 120000 });
    const saved = JSON.parse(readFileSync(path.join(sandbox, 'docs/kestrel/kestrel.campus.blocks.json'), 'utf8'));
    const so = (id) => saved.openings.find((o) => o.id === id);
    assert(so(card.id)?.door?.level === 2 && so(fire.id)?.door?.oneWay === inner && so(win.id)?.glass?.blinds === 'closed', 'ON9: the sandbox file has the card level, the one-way side and the closed blinds');

    // the walk test builds the fire door as the game's hinged door
    const walkAt = await E(([id, inner]) => {
      const d = window.__editor.model.data;
      const o = d.openings.find((q) => q.id === id);
      const w = d.walls.find((q) => q.id === o.wall);
      const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      const dir = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
      const c = [w.a[0] + dir[0] * o.at, w.a[1] + dir[1] * o.at];
      const r = d.rooms.find((q) => q.id === inner);
      const n = [-dir[1], dir[0]];
      const s = c[0] + n[0] * 2 > r.rect[0] && c[0] + n[0] * 2 < r.rect[2] && c[1] + n[1] * 2 > r.rect[1] && c[1] + n[1] * 2 < r.rect[3] ? 1 : -1;
      return { spawn: [c[0] + n[0] * 2 * s, c[1] + n[1] * 2 * s], ends: [[w.a[0] + dir[0] * (o.at - o.w / 2), w.a[1] + dir[1] * (o.at - o.w / 2)], [w.a[0] + dir[0] * (o.at + o.w / 2), w.a[1] + dir[1] * (o.at + o.w / 2)]] };
    }, [fire.id, inner]);
    await dot(walkAt.spawn[0], walkAt.spawn[1], 0);
    await page.keyboard.press('Tab');
    await page.waitForFunction(() => /stage DR/.test(document.getElementById('status').textContent), null, { timeout: 5000 }).catch(() => {});
    const drNote = await E(() => document.getElementById('status').textContent);
    await walkIs('open', 90000);
    const gameDoors = await gf().evaluate(() => window.__app.current.world.level.anchors.doors.map((a) => [a.hinge.x, a.hinge.z, a.width]));
    const hinged = gameDoors.some(([x, z]) => walkAt.ends.some((e) => Math.hypot(e[0] - x, e[1] - z) < 0.6));
    assert(hinged && /Sliding and glass doors open in the game from stage DR/.test(drNote), `ON9: the walk test builds the fire door as a hinged game door (${gameDoors.length} doors in the game); the status says "${drNote.slice(0, 90)}"`);
    const beforeW = await edState();
    await gf().evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F10', key: 'F10' })));
    await backCheck('F10 after ON9', beforeW);
    await E(() => window.__editor.setLevel('G'));
  }

  console.log('ON10: a gable roof on the gatehouse (A twice), Type to hip and overhang 0.6 on the D-pad; a flat roof with a parapet; the walk test player stands on it');
  {
    await E(() => { const ed = window.__editor; ed.prefs.minimap = false; ed.setLayout('both'); ed.select(null); ed.setTool('select'); ed.setLevel('G'); if (ed.controls.mode !== 'orbit') ed.enterOrbit(); });
    // holds a D-pad button only until what it moves changes (the menu highlight or the card's lit row and value)
    const hold = (btn, what) => E(async ([b, what]) => {
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const probe = () => {
        if (what === 'menu') { const m = window.__editor.pad.menu; return `${m.tab}|${m.index}`; }
        const r = document.querySelector('#selCard .crow.on');
        return r ? `${r.dataset.row}|${r.querySelector('b').textContent}` : '';
      };
      const v0 = probe();
      window.__pad.set(b, 1);
      for (let k = 0; k < 150 && probe() === v0; k++) await raf();
      window.__pad.set(b, 0); await raf(); await raf(); await raf();
    }, [btn, what]);
    const litRow = () => E(() => document.querySelector('#selCard .crow.on')?.dataset.row ?? '');
    // down to the row; if the card stops (its last row) before it, back up (ON10: a row passed on a slow frame is found)
    const toRowHeld = async (row) => {
      for (const btn of [BTN.DOWN, BTN.UP]) {
        for (let i = 0; i < 24 && (await litRow()) !== row; i++) {
          const was = await litRow();
          await hold(btn, 'card');
          if ((await litRow()) === was && was) break;
        }
      }
      return (await litRow()) === row;
    };
    const roofTile = async (name) => {
      for (let i = 0; i < 8 && (await menuState()).tab !== 'Build'; i++) await hold(BTN.RB, 'menu');
      for (let i = 0; i < 30 && (await menuState()).tile !== name; i++) await hold(BTN.RIGHT, 'menu');
      return (await menuState()).tile === name;
    };
    const roofs = () => E(() => window.__editor.model.data.roofs ?? []);
    // holds a D-pad button only until the roof's field changes in the data (the card redraws a frame later)
    const holdRoof = (btn, id, field) => E(async ([b, id, field]) => {
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const probe = () => JSON.stringify(window.__editor.model.get('roofs', id)?.[field]);
      const v0 = probe();
      window.__pad.set(b, 1);
      for (let k = 0; k < 150 && probe() === v0; k++) await raf();
      window.__pad.set(b, 0); await raf(); await raf(); await raf();
    }, [btn, id, field]);
    const pickTool = async (name) => {
      await E(() => { window.__editor.select(null); window.__editor.setTool('select'); });
      await press(BTN.Y);
      const ok = await roofTile(name);
      await press(BTN.A);
      return ok && (await E(() => window.__editor.tool)) === 'roof';
    };

    // a gable roof on the gatehouse: the Roof: Gable tile, A twice on the gatehouse takes its room and walls
    const gh = await E(() => window.__editor.model.data.rooms.find((r) => r.name === 'Gatehouse')?.rect ?? null);
    assert(!!gh && (await pickTool('Roof: Gable')), `ON10: Build tab > Roof: Gable picks the Roof tool (gatehouse ${JSON.stringify(gh)})`);
    await dotAt((gh[0] + gh[2]) / 2, (gh[1] + gh[3]) / 2);
    await page.waitForFunction(() => /A: start a gable roof here; A twice: on the Gatehouse/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const reticle = await E(() => document.getElementById('reticleText').textContent);
    const n0 = (await roofs()).length;
    await press(BTN.A);
    await press(BTN.A);
    await page.waitForFunction((n) => (window.__editor.model.data.roofs ?? []).length > n, n0, { timeout: 5000 }).catch(() => {});
    const g = (await roofs()).at(-1);
    assert(!!g && g.type === 'gable' && g.pitch === 25 && g.base === 3 && JSON.stringify(g.rect) === JSON.stringify([0.775, 7.775, 5.725, 11.725]) && /A twice: on the Gatehouse/.test(reticle), `ON10: A twice on the gatehouse puts a gable roof on its walls (${JSON.stringify(g?.rect)}, pitch ${g?.pitch}, eaves ${g?.base} m); the reticle said "${reticle}"`);
    await E((id) => { const ed = window.__editor; ed.setTool('select'); ed.select(`roofs:${id}`); }, g.id);
    await page.waitForFunction(() => /Ridge 3\.92 m/.test(document.querySelector('#selCard [data-roof]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const foot = await E(() => document.querySelector('#selCard [data-roof]')?.textContent ?? '');
    assert(/walkable up to the game limit of 50 degrees/.test(foot), `ON10: the card's foot gives the ridge and the game's slope limit ("${foot}")`);
    // the D-pad: Type right flips gable to hip (the pitch stays); the Overhang row to 0.6 m
    const h0 = await E(() => window.__editor.model.history.length);
    await holdRoof(BTN.RIGHT, g.id, 'type');
    await page.waitForFunction((id) => window.__editor.model.get('roofs', id)?.type === 'hip', g.id, { timeout: 5000 }).catch(() => {});
    const hip = await E((id) => window.__editor.model.get('roofs', id), g.id);
    assert(hip.type === 'hip' && hip.pitch === 25 && (await litRow()) === 'type', `ON10: D-pad right on the Type row: gable to ${hip.type}, pitch ${hip.pitch} kept`);
    assert(await toRowHeld('overhang'), 'ON10: D-pad down reaches the Overhang row');
    for (let i = 0; i < 6 && (await E((id) => window.__editor.model.get('roofs', id).overhang, g.id)) < 0.6 - 1e-6; i++) await holdRoof(BTN.RIGHT, g.id, 'overhang');
    await page.waitForFunction(() => /0\.6 m/.test(document.querySelector('#selCard .crow.on b')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const rowsShown = await E(() => [...document.querySelectorAll('#selCard .crow')].map((r) => r.dataset.row).join(','));
    const hip2 = await E((id) => ({ r: window.__editor.model.get('roofs', id), h: window.__editor.model.history.length, mesh: window.__editor.view.scene.meshes.some((m) => m.name === `roof ${id}` && m.isEnabled()) }), g.id);
    assert(hip2.r.overhang === 0.6 && hip2.r.type === 'hip' && hip2.h > h0 && hip2.mesh && !/,ridge,|,fall,/.test(`,${rowsShown},`), `ON10: overhang ${hip2.r.overhang} m on the hip roof, drawn in 3D; the card shows only the hip's settings (${rowsShown})`);
    await press(BTN.B);
    await E(([x, z]) => { const o = window.__editor.controls.orbit.s; o.tx = x; o.tz = z; o.yaw = 0.7; o.dist = 14; o.pitch = 0.7; }, [(gh[0] + gh[2]) / 2, (gh[1] + gh[3]) / 2]);
    await frames(page, 10);
    await shot('on10-gatehouse-hip');

    // a flat roof with a parapet on a test outline: an empty patch, A at two corners
    const patch = await E(() => {
      const d = window.__editor.model.data;
      const near = (r, x, z, w, h) => r[0] < x + w + 1 && r[2] > x - 1 && r[1] < z + h + 1 && r[3] > z - 1;
      const ws = d.walls.filter((w) => w.level === 'G');
      for (let z = 14; z < 70; z += 1) for (let x = 6; x < 100; x += 1) {
        const clear = ws.every((w) => Math.max(w.a[0], w.b[0]) < x - 1 || Math.min(w.a[0], w.b[0]) > x + 9 || Math.max(w.a[1], w.b[1]) < z - 1 || Math.min(w.a[1], w.b[1]) > z + 7)
          && ![...d.stairs.map((s) => s.rect), ...d.voids.map((v) => v.rect), ...(d.roofs ?? []).map((r) => r.rect)].some((r) => near(r, x, z, 8, 6));
        if (clear) return [x, z];
      }
      return null;
    });
    assert(!!patch && (await pickTool('Roof: Flat')), `ON10: Roof: Flat picked; an empty patch at ${patch}`);
    const n1 = (await roofs()).length;
    await dotAt(patch[0], patch[1]);
    await press(BTN.A);
    await dotAt(patch[0] + 8, patch[1] + 6);
    await press(BTN.A);
    await page.waitForFunction((n) => (window.__editor.model.data.roofs ?? []).length > n, n1, { timeout: 5000 }).catch(() => {});
    const flat = (await roofs()).at(-1);
    assert(!!flat && flat.type === 'flat' && flat.edge === 'parapet' && flat.parapet === 1.1 && flat.base === 4.2 && Math.abs(flat.rect[2] - flat.rect[0] - 8) < 0.15 && Math.abs(flat.rect[3] - flat.rect[1] - 6) < 0.15, `ON10: a flat roof with a 1.1 m parapet on the test outline, eaves at the top of Ground (${JSON.stringify(flat?.rect)}, ${flat?.base} m)`);
    await E(() => window.__editor.setTool('select'));

    // the walk test: the roof is collision the player stands on
    const fc = [(flat.rect[0] + flat.rect[2]) / 2, (flat.rect[1] + flat.rect[3]) / 2];
    await dot(fc[0], fc[1], 0);
    await page.keyboard.press('Tab');
    await walkIs('open', 90000);
    const onRoof = await gf().evaluate(async ([x, y, z]) => {
      const a = window.__app;
      const c = a.current.player.controller;
      c.teleport(new c.pos.constructor(x, y + 0.6, z), 0);
      for (let i = 0; i < 90; i++) await new Promise((r) => requestAnimationFrame(r));
      const p = a.current.player.position;
      const slab = a.current.world.level.boxes.filter((b) => b.collide && Math.abs(b.c[1] + b.s[1] / 2 - y) < 0.02 && Math.abs(b.c[0] - x) < 5 && Math.abs(b.c[2] - z) < 4).length;
      return { y: p.y, x: p.x, z: p.z, slab };
    }, [fc[0], flat.base, fc[1]]);
    assert(Math.abs(onRoof.y - flat.base) < 0.2 && onRoof.slab > 0, `ON10: the walk test player stands on the flat roof (feet ${onRoof.y.toFixed(2)} m, roof ${flat.base} m, ${onRoof.slab} slab pieces)`);
    await shot('on10-walk-roof');
    const beforeW = await edState();
    await gf().evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F10', key: 'F10' })));
    await backCheck('F10 after the roof', beforeW);

    // screenshots: four small roofs in 3D (mono, gable, sawtooth, curved) and the plan's symbols
    const row = await E(() => {
      const d = window.__editor.model.data;
      const ws = d.walls.filter((w) => w.level === 'G');
      const taken = [...d.stairs.map((s) => s.rect), ...d.voids.map((v) => v.rect), ...(d.roofs ?? []).map((r) => r.rect)];
      for (let z = 14; z < 70; z += 1) for (let x = 6; x < 80; x += 1) {
        const clear = ws.every((w) => Math.max(w.a[0], w.b[0]) < x - 1 || Math.min(w.a[0], w.b[0]) > x + 31 || Math.max(w.a[1], w.b[1]) < z - 1 || Math.min(w.a[1], w.b[1]) > z + 7)
          && !taken.some((r) => r[0] < x + 32 && r[2] > x - 1 && r[1] < z + 8 && r[3] > z - 1);
        if (clear) return [x, z];
      }
      return null;
    });
    assert(!!row, `ON10: an empty row for four small roofs at ${row}`);
    await E(([x, z]) => {
      const ed = window.__editor;
      ed.setLevel('G');
      const types = ['mono', 'gable', 'sawtooth', 'curved'];
      for (let i = 0; i < 4; i++) {
        ed.setTool('roof');
        ed.setRoofType(types[i]);
        ed.toolDown(x + i * 8, z, 0, 0, 'pad', false);
        ed.moveDrag(x + i * 8 + 6, z + 6, false);
        ed.endDrag(false);
      }
      ed.setTool('select');
      ed.select(null);
      const o = ed.controls.orbit.s; o.tx = x + 15; o.tz = z + 3; o.yaw = 0.5; o.dist = 30; o.pitch = 0.6;
    }, row);
    await frames(page, 12);
    await shot('on10-roof-types');
    const kinds = await E(() => (window.__editor.model.data.roofs ?? []).map((r) => r.type).join(','));
    assert(/mono,gable,sawtooth,curved$/.test(kinds), `ON10: four small roofs drawn with the tool's types (${kinds})`);
    await E(() => { const ed = window.__editor; ed.setLayout('plan'); ed.select(`roofs:${ed.model.data.roofs.at(-3).id}`); ed.frameSelected(); });
    await page.waitForFunction(() => (document.querySelector('#planSvg svg')?.innerHTML.match(/data-id="roofs:/g) ?? []).length >= 4, null, { timeout: 15000 }).catch(() => {});
    await wait(500);
    await shot('on10-plan-roofs');
    const planRoofs = await E(() => (document.querySelector('#planSvg svg')?.innerHTML.match(/data-id="roofs:/g) ?? []).length);
    assert(planRoofs >= 4, `ON10: the plan draws the roofs with their ridge lines and heights (${planRoofs} roofs on Ground)`);
    await E(() => { const ed = window.__editor; ed.select(null); ed.setLayout('both'); ed.setLevel('G'); });
  }

  // ---------- ON3: ease of use ----------
  {
    console.log('ON3: Checks: A on a line naming a room selects and frames it; red markers while Checks is open');
    /** Moves the hub focus one row (held only until the focus moves, so a slow frame cannot repeat it). */
    const stepHub = (b) => E(async (b) => {
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const probe = () => document.querySelector('#hub .padfocus')?.dataset.row ?? '';
      const v0 = probe();
      window.__pad.set(b, 1);
      for (let k = 0; k < 150 && probe() === v0; k++) await raf();
      window.__pad.set(b, 0); await raf(); await raf(); await raf();
    }, b);
    const focusRow = () => E(() => document.querySelector('#hub .padfocus')?.dataset.row ?? '');
    await E(() => { const ed = window.__editor; ed.setLayout('both'); ed.select(null); ed.setLevel('G'); ed.setTool('select'); });
    await press(BTN.LB);
    // a room problem: raise one room's shortest-side rule past its size (check A04 names the room first)
    const pr = await E(() => {
      const ed = window.__editor;
      const r = ed.model.data.rooms.find((q) => q.level === 'G' && typeof q.minShort === 'number' && q.kind !== 'zone');
      const b = ed.model.snapshot('rooms', r.id);
      ed.commit([{ coll: 'rooms', id: r.id, before: b, after: { ...b, minShort: 99 } }]);
      ed.runChecks(false);
      return { id: r.id, level: r.level, c: [(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2] };
    });
    await page.waitForFunction((id) => window.__editor.problemLines().some((l) => l.text.includes(`${id} clear`)), pr.id, { timeout: 60000 });
    const lineAt = await E((id) => window.__editor.problemLines().findIndex((l) => l.text.includes(`${id} clear`)), pr.id);
    await press(BTN.START);
    await E(() => window.__editor.pad.hub.setTab('Checks'));
    await page.waitForFunction(() => window.__editor.overlays.markersShown > 0, null, { timeout: 10000 }).catch(() => {});
    const marks3d = await E(() => window.__editor.overlays.markersShown);
    for (let i = 0; i < lineAt + 3 && (await focusRow()) !== `prob.${lineAt}`; i++) await stepHub(BTN.DOWN);
    const lit = await focusRow();
    await press(BTN.A);
    await page.waitForFunction(([x, z]) => { const s = window.__editor.controls.orbit.s; return Math.abs(s.tx - x) < 1 && Math.abs(s.tz - z) < 1; }, pr.c, { timeout: 10000 }).catch(() => {});
    const went = await E(() => { const ed = window.__editor; const s = ed.controls.orbit.s; return { open: ed.pad.hub.isOpen, sel: ed.selected, level: ed.view.level, tx: s.tx, tz: s.tz, marks: ed.overlays.markersShown }; });
    assert(lit === `prob.${lineAt}` && !went.open && went.sel === `rooms:${pr.id}` && went.level === pr.level && Math.abs(went.tx - pr.c[0]) < 1 && Math.abs(went.tz - pr.c[1]) < 1, `ON3: Checks > A on the line naming ${pr.id}: hub closed, ${went.sel} selected, the dot at ${went.tx.toFixed(1)}, ${went.tz.toFixed(1)} (room centre ${pr.c})`);
    assert(marks3d > 0 && went.marks === 0, `ON3: red problem markers in 3D while the Checks tab is open (${marks3d}), none once it closes (${went.marks})`);
    await E(() => { const ed = window.__editor; ed.tab = 'checks'; ed.openDrawer(); ed.renderPanel(); });
    await page.waitForFunction(() => window.__editor.overlays.markersShown > 0 && document.querySelectorAll('#planSvg .probMark').length > 0, null, { timeout: 10000 }).catch(() => {});
    const panelMarks = await E(() => ({ m: window.__editor.overlays.markersShown, plan: document.querySelectorAll('#planSvg .probMark').length, links: document.querySelectorAll('#panel [data-go]').length, none: (document.getElementById('panel').textContent.match(/no place to go/g) ?? []).length }));
    await shot('on3-problem-markers');
    assert(panelMarks.m > 0 && panelMarks.plan > 0 && panelMarks.links > 0, `ON3: the Checks panel open: ${panelMarks.m} markers in 3D, ${panelMarks.plan} on the plan, ${panelMarks.links} lines you can click (${panelMarks.none} with no place to go)`);
    await E(() => window.__editor.select(null));
    await E(() => document.querySelector('#panel [data-go]').click());
    const clicked = await E(() => window.__editor.selected);
    assert(!!clicked, `ON3: a click on a Checks panel line selects what it names (${clicked})`);
    await E(() => { const ed = window.__editor; ed.undo(); ed.tab = 'props'; ed.renderPanel(); ed.select(null); });

    console.log('ON3: floating room names and the scale figure');
    await page.keyboard.press('KeyL');
    await page.keyboard.press('KeyK');
    await press(BTN.LB);
    await E(([x, z]) => { const ed = window.__editor; ed.setLayout('3d'); ed.setLevel('G'); const o = ed.controls.orbit.s; o.tx = x; o.tz = z; o.dist = 22; o.pitch = 0.75; o.yaw = 0.4; }, pr.c);
    await page.waitForFunction(() => window.__editor.overlays.namesShown > 0 && window.__editor.overlays.figureTop > 0, null, { timeout: 10000 }).catch(() => {});
    const nm = await E(() => { const o = window.__editor.overlays; return { n: o.namesShown, top: o.figureTop, texts: [...document.querySelectorAll('#roomNames .rname')].filter((d) => d.style.display !== 'none').map((d) => d.textContent).slice(0, 4) }; });
    await shot('on3-floating-names');
    assert(nm.n > 0 && Math.abs(nm.top - 1.75) < 0.01, `ON3: L shows ${nm.n} room names in 3D (${nm.texts.join(', ')}); K stands a ${nm.top.toFixed(2)} m figure at the dot`);
    await E(() => { const ed = window.__editor; ed.setLevel('B'); const o = ed.controls.orbit.s; o.dist = 140; o.pitch = 0.3; });
    await wait(1500);
    const fewer = await E(() => window.__editor.overlays.namesShown);
    assert(fewer < nm.n, `ON3: names hide beyond 40 m and on hidden levels (${fewer} shown from far away on the level below, was ${nm.n})`);
    await E(() => { const ed = window.__editor; ed.setNames(false); ed.setFigure(false); ed.setLevel('G'); ed.setLayout('both'); });

    console.log('ON3: Save shows the summary; Cancel writes nothing');
    const saves0 = saves;
    const sv = await E(() => { const ed = window.__editor; const r = ed.model.data.rooms.find((q) => q.level === 'G' && q.kind !== 'zone'); ed.select(`rooms:${r.id}`); ed.nudge([0.5, 0]); ed.select(null); window.__saveDone = false; void ed.save().then(() => { window.__saveDone = true; }); return { dirty: ed.model.dirty, h: ed.model.history.length }; });
    await page.waitForFunction(() => !document.getElementById('ask').classList.contains('hidden') && /Save\?/.test(document.getElementById('ask').textContent), null, { timeout: 60000 });
    const askText = await E(() => document.getElementById('ask').textContent);
    await shot('on3-save-summary');
    await press(BTN.LB);
    await press(BTN.B);
    await page.waitForFunction(() => window.__saveDone, null, { timeout: 10000 }).catch(() => {});
    const afterCancel = await E(() => ({ dirty: window.__editor.model.dirty, status: document.getElementById('status').textContent, hidden: document.getElementById('ask').classList.contains('hidden') }));
    assert(/\d+ rooms? (moved|resized)/.test(askText) && /new check problem/i.test(askText) && afterCancel.hidden && afterCancel.dirty === sv.dirty && saves === saves0 && /nothing written/.test(afterCancel.status), `ON3: Save shows "${askText.slice(0, 120)}"; Cancel writes nothing (saves ${saves - saves0}, unsaved ${afterCancel.dirty})`);
    await E(() => window.__editor.undo());

    console.log('ON3: Find a room by name and land on it');
    const target = await E(() => {
      const ed = window.__editor;
      const rs = ed.model.data.rooms.filter((r) => r.level !== 'G' && r.name && r.name.length > 4);
      const names = ed.model.data.rooms.map((r) => (r.name ?? '').toLowerCase());
      const r = rs.find((q) => names.filter((n) => n.includes(q.name.toLowerCase())).length === 1 && !ed.model.data.stairs.some((s) => (s.name ?? '').toLowerCase().includes(q.name.toLowerCase())));
      return r ? { id: r.id, name: r.name, level: r.level } : null;
    });
    assert(!!target, `ON3: a room with a name of its own off Ground to find (${target?.name})`);
    await E(() => { window.__editor.setLevel('G'); window.__editor.select(null); });
    await page.keyboard.press('Control+KeyK');
    await page.waitForFunction(() => window.__editor.find.isOpen && document.activeElement?.id === 'findInput', null, { timeout: 5000 });
    await page.keyboard.type(target.name.toLowerCase());
    await page.waitForFunction((n) => document.querySelector('#findBox .fb-list .np-item')?.textContent.startsWith(n), target.name, { timeout: 5000 });
    await press(BTN.Y);
    await page.waitForFunction(() => window.__editor.find.mode === 'list', null, { timeout: 5000 }).catch(() => {});
    await press(BTN.A);
    const found = await E(() => ({ open: window.__editor.find.isOpen, sel: window.__editor.selected, level: window.__editor.view.level }));
    assert(!found.open && found.sel === `rooms:${target.id}` && found.level === target.level, `ON3: Ctrl+K, "${target.name.toLowerCase()}", Y then A: on ${found.level} with ${found.sel} selected`);
    await E(() => { window.__editor.select(null); window.__editor.setLevel('G'); });

    console.log('ON3: box select two rooms with the pad and move them as one edit');
    const pair = await E(() => {
      const d = window.__editor.model.data;
      // two rooms side by side (east-west, up to a wall's width apart), the pair's box at most 1200 m2
      const rs = d.rooms.filter((r) => r.level === 'G' && r.kind !== 'yard' && r.kind !== 'lane');
      for (const a of rs) for (const b of rs) {
        if (a === b || b.rect[0] < a.rect[2] - 1e-6 || b.rect[0] - a.rect[2] > 0.6) continue;
        if (Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[1], b.rect[1]) < 1) continue;
        const box = [Math.min(a.rect[0], b.rect[0]), Math.min(a.rect[1], b.rect[1]), Math.max(a.rect[2], b.rect[2]), Math.max(a.rect[3], b.rect[3])];
        if ((box[2] - box[0]) * (box[3] - box[1]) > 1200) continue;
        return { a: a.id, b: b.id, box, ca: [(a.rect[0] + a.rect[2]) / 2, (a.rect[1] + a.rect[3]) / 2], ra: a.rect.slice(), rb: b.rect.slice() };
      }
      return null;
    });
    assert(!!pair, `ON3: two rooms side by side on Ground (${pair?.a}, ${pair?.b})`);
    await E(() => { const ed = window.__editor; ed.setLayout('3d'); ed.select(null); const o = ed.controls.orbit.s; o.dist = 40; o.pitch = 1.2; });
    // LB held: the magnet stays off, so the dot stays exactly where it is put; a dot put while the camera was still
    // settling (an ease from Find, the builder camera starting again) is put again until it stays
    await set(BTN.LB, 1);
    await frames(page, 6);
    const dotSure = async (x, z) => {
      for (let i = 0; i < 4; i++) {
        await dotAt(x, z);
        if (await E(([x, z]) => { const s = window.__editor.controls.orbit.s; return Math.abs(s.tx - x) < 0.05 && Math.abs(s.tz - z) < 0.05; }, [x, z])) return;
      }
    };
    await dotSure(pair.box[0] - 0.2, pair.box[1] - 0.2);
    await set(BTN.A, 1);
    await frames(page, 4);
    await dotSure(pair.box[2] + 0.2, pair.box[3] + 0.2);
    await frames(page, 4);
    await set(BTN.A, 0);
    await frames(page, 4);
    const grp = await E(() => window.__editor.group.slice());
    const boxWhy = await E(() => `${document.getElementById('status').textContent}; selected ${window.__editor.selected}; dot ${window.__editor.controls.orbit.s.tx.toFixed(1)}, ${window.__editor.controls.orbit.s.tz.toFixed(1)}`);
    assert(grp.includes(`rooms:${pair.a}`) && grp.includes(`rooms:${pair.b}`), `ON3: hold A and move the dot: the box selects ${grp.length} things (${grp.filter((k) => k.startsWith('rooms:')).join(', ')}) [${boxWhy}]`);
    const h0 = await E(() => window.__editor.model.history.length);
    await dotSure(pair.ca[0], pair.ca[1]);
    await press(BTN.A);
    let how = 'A on a member';
    if (!(await E(() => !!window.__editor.groupDrag))) {
      how = 'Selected > Move';
      await E(() => window.__editor.pad.runMenu('sel.move'));
    }
    await dotSure(pair.ca[0] + 2, pair.ca[1]);
    await frames(page, 4);
    await press(BTN.A);
    const moved = await E(([a, b]) => { const ed = window.__editor; return { h: ed.model.history.length, ra: ed.model.get('rooms', a).rect.slice(), rb: ed.model.get('rooms', b).rect.slice(), drag: !!ed.groupDrag, text: ed.model.history.at(-1)?.text }; }, [pair.a, pair.b]);
    await shot('on3-box-moved');
    assert(!moved.drag && moved.h === h0 + 1 && Math.abs(moved.ra[0] - pair.ra[0] - 2) < 0.01 && Math.abs(moved.rb[0] - pair.rb[0] - 2) < 0.01 && Math.abs(moved.ra[1] - pair.ra[1]) < 0.01, `ON3: ${how}, the dot 2 m east, A: both rooms 2 m east in one undo step ("${moved.text}")`);
    await set(BTN.LB, 0);
    await E(() => window.__editor.undo());
    const back = await E(([a, b]) => { const ed = window.__editor; return { h: ed.model.history.length, ra: ed.model.get('rooms', a).rect.slice(), rb: ed.model.get('rooms', b).rect.slice() }; }, [pair.a, pair.b]);
    assert(back.h === h0 && back.ra.join() === pair.ra.join() && back.rb.join() === pair.rb.join(), 'ON3: one undo puts both rooms back');
    await E(() => { const ed = window.__editor; ed.select(null); ed.setLayout('both'); });
  }

  // ---------- ON4: objects ----------
  console.log('ON4: objects: a rack row of 10 and a second row with an aisle in the data hall, a crate in the yard, a desk turned; stealth view; walk test collision and crouch cover');
  {
    await E(() => { const ed = window.__editor; ed.prefs.minimap = false; ed.setLayout('both'); ed.select(null); ed.setTool('select'); ed.setLevel('G'); if (ed.controls.mode !== 'orbit') ed.enterOrbit(); });
    // holds a D-pad button only until the menu highlight moves (a slow frame cannot repeat it)
    const hold = (btn) => E(async (b) => {
      const raf = () => new Promise((r) => requestAnimationFrame(r));
      const probe = () => { const m = window.__editor.pad.menu; return `${m.tab}|${m.index}|${document.querySelector('#tileMenu .tile.hl .tn')?.textContent ?? ''}`; };
      const v0 = probe();
      window.__pad.set(b, 1);
      for (let k = 0; k < 150 && probe() === v0; k++) await raf();
      window.__pad.set(b, 0); await raf(); await raf(); await raf();
    }, btn);
    const toTab = async (tab) => { for (let i = 0; i < 8 && (await menuState()).tab !== tab; i++) await hold(BTN.RB); return (await menuState()).tab === tab; };
    const toTileHeld = async (name, btn = BTN.RIGHT) => { for (let i = 0; i < 40 && (await menuState()).tile !== name; i++) await hold(btn); return (await menuState()).tile === name; };
    /** Y, the Objects tab, A on the group tile (the menu stays), the preset's tile, A: the Object tool with that preset. */
    const pickObject = async (group, name, shotName) => {
      await E(() => { window.__editor.select(null); window.__editor.setTool('select'); });
      await press(BTN.Y);
      let ok = await toTab('Objects');
      ok = ok && (await toTileHeld(group));
      await press(BTN.A);
      await page.waitForFunction((g) => window.__editor.pad.menu.isOpen && document.querySelector('#tileMenu .tile.lit .tn')?.textContent === g, group, { timeout: 5000 }).catch(() => {});
      ok = ok && (await toTileHeld(name));
      if (shotName) await shot(shotName);
      await press(BTN.A);
      return ok && (await E(() => window.__editor.tool)) === 'object' && (await E(() => window.__editor.objPreset.name)) === name;
    };
    const objs = () => E(() => window.__editor.model.data.objects ?? []);
    const waitObjs = (n) => page.waitForFunction((n) => (window.__editor.model.data.objects ?? []).length > n, n, { timeout: 5000 }).catch(() => {});

    // an empty bay in the data hall for two 6 m rows 1.8 m apart (clear of walls and objects)
    const bay = await E(() => {
      const d = window.__editor.model.data;
      const hall = d.rooms.find((r) => r.name === 'Data Hall').rect;
      const ws = d.walls.filter((w) => w.level === 'G');
      const taken = (d.objects ?? []).filter((o) => o.level === 'G').map((o) => o.rect);
      for (let x = hall[0] + 2; x + 8 < hall[2]; x += 1) for (let z = hall[1] + 3; z + 6 < hall[3]; z += 1) {
        const box = [x - 1, z - 1.5, x + 7, z + 4.5];
        const clear = ws.every((w) => Math.max(w.a[0], w.b[0]) < box[0] || Math.min(w.a[0], w.b[0]) > box[2] || Math.max(w.a[1], w.b[1]) < box[1] || Math.min(w.a[1], w.b[1]) > box[3])
          && !taken.some((r) => r[0] < box[2] && r[2] > box[0] && r[1] < box[3] && r[3] > box[1]);
        if (clear) return [x, z];
      }
      return null;
    });
    assert(!!bay && (await pickObject('Data hall', 'Rack row', 'on4-object-menu')), `ON4: Objects tab > Data hall > Rack row picks the Object tool (bay at ${bay})`);
    const n0 = (await objs()).length;
    await dotAt(bay[0], bay[1]);
    await press(BTN.A);
    await dotAt(bay[0] + 6, bay[1]);
    await page.waitForFunction(() => /10 units, 6 m/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const drawWords = await dotText();
    await press(BTN.A);
    await waitObjs(n0);
    const row1 = (await objs()).at(-1);
    const w1 = row1 ? row1.rect[2] - row1.rect[0] : 0;
    assert(!!row1 && row1.preset === 'rack-row' && Math.abs(w1 - 6) < 1e-6 && Math.abs(row1.rect[3] - row1.rect[1] - 1.2) < 1e-6 && row1.h === 2 && /10 units, 6 m/.test(drawWords), `ON4: A, A draws a rack row of 10 racks, 6 x 1.2 m, 2 m high (${JSON.stringify(row1?.rect)}); the dot said "${drawWords}"`);
    // the second row 1.8 m across the aisle: the dot gives the aisle against the facts while drawing
    const z2 = bay[1] + 3;
    await dotAt(bay[0], z2);
    await press(BTN.A);
    await dotAt(bay[0] + 6, z2);
    await page.waitForFunction(() => /aisle 1\.8 m clear/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    const aisleDot = await dotText();
    const redDot = await E(() => document.getElementById('reticle').classList.contains('bad'));
    await press(BTN.A);
    await waitObjs(n0 + 1);
    const row2 = (await objs()).at(-1);
    await E((id) => { const ed = window.__editor; ed.setTool('select'); ed.select(`objects:${id}`); }, row2.id);
    await page.waitForFunction(() => /aisle 1\.8 m clear/.test(document.querySelector('#selCard [data-aisle]')?.textContent ?? ''), null, { timeout: 5000 }).catch(() => {});
    const card = await E(() => ({ aisle: document.querySelector('#selCard [data-aisle]')?.textContent ?? '', badges: document.querySelector('#selCard [data-badges]')?.textContent ?? '' }));
    assert(/aisle 1\.8 m clear/.test(aisleDot) && !redDot && card.aisle === `aisle 1.8 m clear to ${row1.id}` && /Full cover/.test(card.badges), `ON4: the second row: the dot said "${aisleDot}" (not red); the card "${card.aisle}", badges "${card.badges}"`);
    await E(([x, z]) => { const ed = window.__editor; ed.select(null); const o = ed.controls.orbit.s; o.tx = x + 3; o.tz = z + 1.5; o.yaw = 0.6; o.dist = 16; o.pitch = 0.9; ed.view.vis.section = 1.2; ed.applyVis(true); }, bay);
    await frames(page, 10);
    await shot('on4-data-hall-rows');
    await E(() => { const ed = window.__editor; ed.view.vis.section = 0; ed.applyVis(true); });

    // a crate and a desk in the yard: an empty patch clear of walls, objects and roofs
    const yard = await E(() => {
      const d = window.__editor.model.data;
      const ws = d.walls.filter((w) => w.level === 'G');
      const taken = [...(d.objects ?? []).filter((o) => o.level === 'G').map((o) => o.rect), ...(d.roofs ?? []).map((r) => r.rect), ...d.voids.map((v) => v.rect), ...d.stairs.map((s) => s.rect)];
      const yards = d.rooms.filter((r) => r.level === 'G' && r.kind === 'yard');
      for (const y of yards) for (let x = y.rect[0] + 2; x + 7 < y.rect[2]; x += 1) for (let z = y.rect[1] + 2; z + 4 < y.rect[3]; z += 1) {
        const box = [x - 1.5, z - 1.5, x + 6, z + 2.5];
        const clear = ws.every((w) => Math.max(w.a[0], w.b[0]) < box[0] || Math.min(w.a[0], w.b[0]) > box[2] || Math.max(w.a[1], w.b[1]) < box[1] || Math.min(w.a[1], w.b[1]) > box[3])
          && !taken.some((r) => r[0] < box[2] && r[2] > box[0] && r[1] < box[3] && r[3] > box[1]);
        if (clear) return [x, z];
      }
      return null;
    });
    assert(!!yard && (await pickObject('Goods-in', 'Crate 1.2 m')), `ON4: Objects tab > Goods-in > Crate 1.2 m (yard patch at ${yard})`);
    const n1 = (await objs()).length;
    await dotAt(yard[0], yard[1]);
    await page.waitForFunction(() => /A: place Crate 1\.2 m/.test(document.getElementById('reticleText').textContent), null, { timeout: 5000 }).catch(() => {});
    await press(BTN.A);
    await waitObjs(n1);
    const crate = (await objs()).at(-1);
    assert(!!crate && crate.preset === 'crate-1.2' && Math.abs(crate.rect[2] - crate.rect[0] - 1.2) < 1e-6 && crate.h === 1.2 && Math.abs((crate.rect[0] + crate.rect[2]) / 2 - yard[0]) < 0.11, `ON4: A places a 1.2 m crate at the dot in the yard (${JSON.stringify(crate?.rect)})`);
    // a desk turned a quarter: RB turns the ghost, A places it
    assert(await pickObject('Office and security', 'Desk'), 'ON4: Objects tab > Office and security > Desk');
    await dotAt(yard[0] + 4, yard[1]);
    await press(BTN.RB);
    await page.waitForFunction(() => window.__editor.objYaw === 90, null, { timeout: 5000 }).catch(() => {});
    const n2 = (await objs()).length;
    await press(BTN.A);
    await waitObjs(n2);
    const desk = (await objs()).at(-1);
    assert(!!desk && desk.preset === 'desk' && desk.yaw === 90 && Math.abs(desk.rect[2] - desk.rect[0] - 0.8) < 1e-6 && Math.abs(desk.rect[3] - desk.rect[1] - 1.6) < 1e-6, `ON4: RB turns the desk 90 degrees before A places it (yaw ${desk?.yaw}, ${JSON.stringify(desk?.rect)})`);
    await E(() => { const ed = window.__editor; ed.objYaw = 0; ed.setTool('select'); ed.select(null); });

    // the stealth view: Y > View > Stealth view; objects tinted in 3D and on the plan
    await press(BTN.Y);
    const stTab = await toTab('View');
    // (the View tab is one column: down moves, left / right change values)
    const stTile = await toTileHeld('Stealth view', BTN.DOWN);
    await press(BTN.A);
    await press(BTN.B);
    await page.waitForFunction(() => (document.querySelector('#planSvg svg')?.querySelectorAll('g[data-id^="objects:"] rect[style]').length ?? 0) >= 4, null, { timeout: 15000 }).catch(() => {});
    const sv = await E(() => ({ on: window.__editor.stealth, tinted: window.__editor.view.stealthTinted, plan: document.querySelector('#planSvg svg')?.querySelectorAll('g[data-id^="objects:"] rect[style]').length ?? 0, badges: window.__editor.overlays.badgesShown }));
    assert(stTab && stTile && sv.on && sv.tinted >= 4 && sv.plan >= 4, `ON4: View > Stealth view on: ${sv.tinted} objects tinted in 3D, ${sv.plan} on the plan; ${sv.badges} badge icons`);
    await E(([x, z]) => { const ed = window.__editor; const o = ed.controls.orbit.s; o.tx = x + 3; o.tz = z + 1.5; o.yaw = 0.6; o.dist = 16; o.pitch = 0.9; ed.view.vis.section = 1.2; ed.applyVis(true); }, bay);
    await frames(page, 10);
    await shot('on4-stealth-view');
    await E(() => { const ed = window.__editor; ed.view.vis.section = 0; ed.applyVis(true); });

    // the walk test: the rack row is collision; the player crouches behind the crate
    await dot((crate.rect[0] + crate.rect[2]) / 2, crate.rect[1] - 1, 0);
    await page.keyboard.press('Tab');
    await walkIs('open', 90000);
    const walk = await gf().evaluate(async ([row, crate]) => {
      const a = window.__app;
      const g = a.current;
      const p = g.player;
      const c = p.controller;
      const V = p.position.constructor;
      const st = a.input.state;
      const boxes = g.world.level.boxes;
      const has = (o) => boxes.some((b) => b.collide && Math.abs(b.c[0] - (o.rect[0] + o.rect[2]) / 2) < 0.01 && Math.abs(b.c[2] - (o.rect[1] + o.rect[3]) / 2) < 0.01 && Math.abs(b.s[1] - o.h) < 0.01);
      a.loop.manual = true;
      const tp = (x, z, yaw) => { c.teleport(new V(x, 0.05, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; p.cam.snap(); st.move.x = st.move.y = 0; a.loop.stepHeadless(0.5); };
      const run = (sec, y) => { for (let k = 0; k < Math.round(sec * 60); k++) { st.move.x = 0; st.move.y = y; a.loop.stepHeadless(1 / 60); } st.move.x = st.move.y = 0; };
      // walk north (yaw 0 faces +z) into the row from 1.5 m south of its middle
      const mx = (row.rect[0] + row.rect[2]) / 2;
      tp(mx, row.rect[1] - 1.5, 0);
      const z0 = p.position.z;
      run(2.5, 1);
      const z1 = p.position.z;
      // crouch behind the crate's south face
      const cx = (crate.rect[0] + crate.rect[2]) / 2;
      tp(cx, crate.rect[1] - 0.45, 0);
      st.tap('crouch');
      a.loop.stepHeadless(0.8);
      const crouched = c.crouched;
      const top = c.crouchBlend;
      const pz = p.position.z;
      st.tap('crouch');
      a.loop.stepHeadless(0.6);
      a.loop.manual = false;
      return { rowBox: has(row), crateBox: has(crate), z0, z1, crouched, blend: top, pz };
    }, [row1, crate]);
    const stopAt = row1.rect[1];
    assert(walk.rowBox && walk.z1 - walk.z0 > 0.3 && walk.z1 < stopAt - 0.2, `ON4: the walk test builds the rack row as a solid box (${walk.rowBox}); walking north the player stops at it (z ${walk.z0.toFixed(2)} to ${walk.z1.toFixed(2)}, row face ${stopAt})`);
    assert(walk.crateBox && walk.crouched && walk.blend > 0.99 && crate.h > 1.15 && walk.pz < crate.rect[1], `ON4: the player crouches behind the crate (crouched ${walk.crouched}, blend ${walk.blend.toFixed(2)}, crate top ${crate.h} m over the 1.15 m crouch, z ${walk.pz.toFixed(2)} south of ${crate.rect[1]})`);
    const beforeW = await edState();
    await gf().evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F10', key: 'F10' })));
    await backCheck('F10 after the objects', beforeW);
    await E(() => { const ed = window.__editor; ed.setStealth(false); ed.select(null); ed.setTool('select'); ed.setLayout('both'); ed.setLevel('G'); });
  }

  console.log('saves go to the sandbox, never docs/kestrel (ED3-3a); the save summary first (ON3)');
  await E(() => { const ed = window.__editor; ed.select(`rooms:${ed.model.data.rooms.find((r) => r.level === 'G').id}`); ed.nudge([0.5, 0]); });
  await E(() => { void window.__editor.save(); });
  await page.waitForFunction(() => !document.getElementById('ask').classList.contains('hidden') && /Save\?/.test(document.getElementById('ask').textContent), null, { timeout: 60000 });
  await press(BTN.A);
  await page.waitForFunction(() => /Saved \d+ change/.test(document.getElementById('status').textContent), null, { timeout: 120000 });
  const gitDocs = execSync('git status --porcelain docs/kestrel', { encoding: 'utf8' }) === docsBefore ? '' : 'changed';
  const sandFile = path.join(sandbox, 'docs/kestrel/kestrel.campus.blocks.json');
  const sandSaved = existsSync(sandFile) && /level editor/.test(readFileSync(sandFile, 'utf8'));
  assert(gitDocs === '' && sandSaved && existsSync(path.join(sandbox, 'docs/kestrel/plans')), `a save writes the sandbox copy and its plans; docs/kestrel unchanged ("${gitDocs}")`);
} catch (e) {

  failed = true;
  console.error(String(e));
  console.error(await E(() => { const ed = window.__editor; const f = document.getElementById('gameWalk'); return JSON.stringify({ walk: ed?.walk?.state, hub: ed?.pad?.hub?.isOpen, status: document.getElementById('status')?.textContent, src: f?.src, boot: f?.contentDocument?.getElementById('boot')?.textContent?.trim().slice(0, 120), game: !!f?.contentWindow?.__app?.current }); }).catch((x) => String(x)));
  await page.screenshot({ path: path.join(shots ?? process.env.TEMP ?? '/tmp', 'e2e-editor-fail.png') }).catch(() => {});
} finally {
  const bad = errors.filter((e) => !/GPU stall|swiftshader|GL Driver/i.test(e));
  console.log(bad.length ? 'console problems:\n' + bad.join('\n') : 'no console errors');
  await browser.close();
  vite.kill();
  try { rmSync(sandbox, { recursive: true, force: true }); } catch {}
  process.exit(failed || bad.length ? 1 : 0);
}
