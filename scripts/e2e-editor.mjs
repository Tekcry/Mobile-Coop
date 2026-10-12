// Level editor controller test (ED2 Part C, ED3-1 builder camera, ED3-2 hub, wheels, grab, magnet, ghosts; ED2 Part B walk test as the player): every edit step uses the fake gamepad. Starts its own Vite dev server on
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
const st = () => E(() => { const ed = window.__editor; return { tool: ed.tool, layout: ed.prefs.layout, walls: ed.model.data.walls.length, ops: ed.model.data.openings.map((o) => o.type), dirty: ed.model.dirty, crumb: ed.pad.radial?.isOpen ? ed.pad.radial.breadcrumb.join(' > ') : null, hint: document.getElementById('hint').textContent, status: document.getElementById('status').textContent }; });
/** Holds a wheel button (Y: Build, RB: Selection), points the stick at each angle in turn (resting past the dwell). */
const wheel = async (btn, ...angles) => {
  await set(btn, 1);
  await page.waitForFunction(() => window.__editor.pad.menuOpen, null, { timeout: 5000 }).catch(() => {});
  for (const [i, a] of angles.entries()) {
    const r = (a * Math.PI) / 180;
    await axes(Math.sin(r), -Math.cos(r));
    // each angle but a leaf at the end opens a submenu after the dwell (polled: frames are slow under software GL)
    await page.waitForFunction((n) => (window.__editor.pad.radial?.breadcrumb.length ?? 0) >= n, i + 1, { timeout: 4000 }).catch(() => {});
    await wait(120);
  }
};
const radial = (...angles) => wheel(BTN.Y, ...angles);
const releaseBtn = async (btn) => { await set(btn, 0); await frames(page, 3); await axes(0, 0); await frames(page, 3); };
const release = () => releaseBtn(BTN.Y);
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
  assert(/Y hold/.test((await st()).hint), `hint bar shows pad buttons ("${(await st()).hint.slice(0, 80)}")`);
  await shot('hint-idle');

  console.log('Build wheel (Y): what to make only; Wall');
  await set(BTN.Y, 1);
  await page.waitForFunction(() => window.__editor.pad.menuOpen, null, { timeout: 5000 });
  const root = await E(() => window.__editor.pad.radial.ring.map((n) => n.name));
  assert(root.join(',') === 'Select,Room,Wall,Door,Window,Measure' && !root.some((n) => ['View', 'Level', 'File', 'Walk', 'Undo'].includes(n)), `Build wheel root has no View, Level, File, Walk or Undo (${root.join(', ')})`);
  await axes(Math.sin((120 * Math.PI) / 180), -Math.cos((120 * Math.PI) / 180));
  await wait(150);
  await shot('radial-build');
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
    await set(BTN.SELECT, 1);
    await wait(600);
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

  console.log('Build > Door > Double door: its ghost on the wall, placed with A');
  await radial(180, 144);
  assert((await st()).crumb === 'Door', `Door opens its submenu (${(await st()).crumb})`);
  await shot('radial-door');
  await release();
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

  console.log('B puts the tool down; Y tap repeats it');
  await press(BTN.B);
  assert((await st()).tool === 'select', 'B: back to select');
  await press(BTN.Y);
  assert((await st()).tool === 'door', 'Y tap: the last tool again');
  await press(BTN.B);
  console.log('pad tool bar, level, dot, display, quick walk, go to the selection');
  await press(BTN.RIGHT);
  await wait(250);
  s = await st();
  const lit = await E(() => document.querySelector('#toolBar .slot.on')?.dataset.slot);
  assert(s.tool === 'room' && lit === 'room', `D-pad right from Select lights Room on the tool bar (tool ${s.tool}, lit ${lit})`);
  const startText = await dotText();
  assert(/A: start a room here/.test(startText), `Room tool: the start marker's words ("${startText.slice(-22)}")`);
  await press(BTN.B);
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
  // ED3-pad1: L3 while walking runs (the game's sprint) and keeps walking; B is the way back
  {
    await press(BTN.LS);
    await wait(200);
    const pos = () => E(() => { const p = window.__editor.view.camera.position; return { x: p.x, z: p.z }; });
    const stride = async () => { const a = await pos(); await axes(0, -1); await wait(500); await axes(0, 0); await frames(page, 2); const b = await pos(); return Math.hypot(b.x - a.x, b.z - a.z); };
    const slow = await stride();
    await press(BTN.LS);
    const r = await E(() => ({ walking: window.__editor.controls.walking, run: window.__editor.controls.padRun, hint: document.getElementById('hint').textContent }));
    const fast = await stride();
    await press(BTN.LS);
    const r2 = await E(() => ({ walking: window.__editor.controls.walking, run: window.__editor.controls.padRun }));
    await press(BTN.B);
    await wait(200);
    const out = await E(() => window.__editor.controls.walking);
    assert(r.walking && r.run && r2.walking && !r2.run && !out && /LS click running, B back/.test(r.hint) && slow > 0.05 && fast > slow * 1.5, `quick walk: L3 runs and keeps walking (stride ${slow.toFixed(2)} -> ${fast.toFixed(2)} m), L3 again walks, B ends it`);
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
  assert(/A: Move$/.test(mid), `the dot at the room's centre says "A: Move" ("${mid.slice(-12)}")`);
  await dotAt(room.rect[2] - 0.2, room.cz);
  const edge = await dotText();
  assert(/Stretch east edge/.test(edge) && (await E(() => window.__editor.view.scene.getMeshByName('mark 0')?.isEnabled())), `0.2 m inside the east edge: "Stretch east edge", the edge lit ("${edge.slice(-24)}")`);
  await shot('edge-lit');
  await press(BTN.A);
  await presses(BTN.RIGHT, 2);
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
  await presses(BTN.RIGHT, 2);
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

  console.log('Selection wheel (RB held)');
  await E(() => window.__editor.select(null));
  await set(BTN.RB, 1);
  await wait(700);
  const none = await E(() => ({ open: window.__editor.pad.menuOpen, status: document.getElementById('status').textContent }));
  await releaseBtn(BTN.RB);
  assert(!none.open && /Select something first/.test(none.status), `RB held with nothing selected opens nothing ("${none.status}")`);
  await E((id) => window.__editor.select(`rooms:${id}`), room.id);
  await set(BTN.RB, 1);
  await page.waitForFunction(() => window.__editor.pad.menuOpen, null, { timeout: 5000 });
  const selRing = await E(() => window.__editor.pad.radial.ring.map((n) => n.name));
  await shot('selection-wheel');
  await releaseBtn(BTN.RB);
  assert(selRing.join(',') === 'Move,Properties,Duplicate,Rotate 90,Copy,Copy to level above,Change type,Delete' && !(await E(() => window.__editor.pad.menuOpen)), `with a room selected: ${selRing.join(', ')}; release in the centre closes it`);
  const door = await E(() => { const ed = window.__editor; const o = ed.model.data.openings.find((q) => q.type === 'door' && ed.levelOf('openings', q) === 'G'); ed.select(`openings:${o.id}`); return o.id; });
  const h0 = await E(() => window.__editor.model.history.length);
  await wheel(BTN.RB, 216, 72);
  await releaseBtn(BTN.RB);
  const dt1 = await E((id) => ({ type: window.__editor.model.get('openings', id).type, h: window.__editor.model.history.length }), door);
  await press(BTN.X);
  const dt2 = await E((id) => window.__editor.model.get('openings', id).type, door);
  assert(dt1.type === 'double' && dt1.h === h0 + 1 && dt2 === 'door', `Change type on a door to Double door is one undo step (${dt1.type}, ${dt1.h - h0} step, undo -> ${dt2})`);

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
  assert(pic.svg && /Build wheel/.test(pic.text) && /Selection wheel/.test(pic.text), 'Help tab shows the controller picture with labels');
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
  await set(BTN.RB, 1);
  await page.waitForFunction(() => window.__editor.pad.menuOpen, null, { timeout: 15000 });
  const wKinds = await E(() => (window.__editor.pad.radial.ring.find((n) => n.name === 'Change type')?.children ?? []).map((n) => n.name));
  await releaseBtn(BTN.RB);
  // (releasing in the middle picks Move: put it back, keep the wall selected)
  await E((id) => { const ed = window.__editor; if (ed.drag) ed.endDrag(true); ed.select(`walls:${id}`); }, wWid);
  const wh0 = (await edState()).h;
  await E(() => window.__editor.pad.changeType('balustrade'));
  const wCt = await E((id) => ({ h: window.__editor.model.history.length, kind: window.__editor.model.get('walls', id).kind }), wWid);
  await page.keyboard.press('Control+z'); await frames(page, 2);
  const wBack = await E((id) => window.__editor.model.get('walls', id).kind, wWid);
  assert(wKinds.includes('balustrade') && wCt.kind === 'balustrade' && wCt.h === wh0 + 1 && wBack === 'interior', `Change type on a wall offers balustrade (${wKinds.join(', ')}) and is one undo step`);

  console.log('pad screen: nothing overlaps, the hint bar is one line (ED3-pad1)');
  await press(BTN.LB);
  await E((id) => window.__editor.select(`walls:${id}`), wWid);
  for (const minimap of [false, true]) {
  await E((on) => { const ed = window.__editor; ed.prefs.layout = '3d'; ed.prefs.minimap = on; ed.applyLayout?.(); }, minimap);
  for (const [vw, vh] of [[1280, 720], [1024, 600], [932, 430]]) {
    await page.setViewportSize({ width: vw, height: vh });
    await wait(400);
    await frames(page, 4);
    const r = await E(() => {
      const ids = ['padStrip', 'toolBar', 'selCard', 'reticleText', 'hint', ...(window.__editor.isMinimap() ? ['planWrap'] : [])];
      const box = {};
      for (const id of ids) {
        const el = document.getElementById(id);
        const b = el.getBoundingClientRect();
        if (getComputedStyle(el).display !== 'none' && b.width > 0 && el.offsetParent !== null) box[id] = [b.left, b.top, b.right, b.bottom];
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
    assert(r.shown.includes('toolBar') && r.shown.includes('selCard') && r.hits.length === 0 && !r.hintCut && !r.hintTall && r.slots >= 6 && r.cut.length === 0 && /^Interior wall /.test(r.card),
      `${vw} x ${vh}${minimap ? ', small plan' : ''}: ${r.shown.length} pad panels, overlaps [${r.hits.join(', ')}], hint one line uncut (${!r.hintCut && !r.hintTall}), ${r.slots} tool slots, cut names [${r.cut.join(', ')}], card "${r.card.slice(0, 40)}"`);
    await shot(`pad-screen-${vw}x${vh}${minimap ? '-small-plan' : ''}`);
  }
  }
  await page.setViewportSize({ width: 1600, height: 900 });
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
  process.exit(failed || bad.length ? 1 : 0);
}
