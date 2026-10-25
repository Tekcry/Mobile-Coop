// Traversal and wall contact sheets of Wren (feature/anim-cleanup slice 3): each move from e2e-clip's set-ups on
// Proving, frames at the given times, a camera beside her (her right, out from the anchor) after the game's camera.
//   E2E_GPU=1 node scripts/anim-cleanup/traverse-shots.mjs <outDir> [move ...]   (serves dist/ on E2E_PORT, 4189)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { launch, waitOperator } from '../e2e-lib.mjs';

const PORT = Number(process.env.E2E_PORT ?? 4189);
const out = process.argv[2] ?? 'docs/archive/anim-cleanup/audit/traverse';
const only = process.argv.slice(3);
mkdirSync(out, { recursive: true });

// set-up: [x, y, z, yaw] (e2e-clip), input per frame, frame times (s), camera [right, up, forward, target up] in her frame
const MOVES = {
  'ladder-climb': { at: [25.2, 0, 11, Math.PI / 2], tap: 'jump', move: [0, 1], times: [0.6, 1.4, 2.4, 3.6], cam: [1.4, 1.2, -0.6, 1.0] },
  'ladder-dense': { at: [25.2, 0, 11, Math.PI / 2], tap: 'jump', move: [0, 1], times: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4], cam: [1.4, 1.2, -0.6, 1.0] },
  'ladder-slide': { at: [26.7, 3.6, 11, -Math.PI / 2], tap: 'jump', move: [0, -1], times: [0.5, 1.2, 2.0], cam: [1.4, 0.4, -0.6, 0.6] },
  'drainpipe': { at: [27.8, 0, 8.95, 0], tap: 'jump', move: [0, 1], times: [0.6, 1.6, 3.0], cam: [1.3, 1.1, -0.7, 1.0] },
  'hang-shimmy': { at: [25.45, 0, 16, Math.PI / 2], tap: 'jump', move: [1, 0], times: [0.5, 1.2, 2.2], cam: [1.2, 0.6, -1.4, 1.4] },
  'hang-climb': { at: [25.45, 0, 16, Math.PI / 2], tap: 'jump', tap2: [0.6, 'jump'], times: [0.4, 0.9, 1.3, 1.8], cam: [1.6, 1.0, -0.8, 1.4] },
  // (ct-prototype D+E) dense frames: the climb-up's three phases, the shimmy's reaches, the drainpipe's legs
  'hang-climb-dense': { at: [25.45, 0, 16, Math.PI / 2], tap: 'jump', tap2: [0.6, 'jump'], times: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.7], cam: [2.4, 0.9, -1.2, 0.8] },
  'hang-shimmy-dense': { at: [25.45, 0, 16, Math.PI / 2], tap: 'jump', move: [1, 0], times: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4], cam: [1.2, 0.6, -1.4, 1.4] },
  'drainpipe-dense': { at: [27.8, 0, 8.95, 0], tap: 'jump', move: [0, 1], times: [1.0, 1.2, 1.4, 1.6, 1.8, 2.0], cam: [2.0, 0.5, -1.6, 0.7] },
  'pipe-hands': { at: [25.5, 0, 23.1, 0], camYaw: Math.PI / 2, tap: 'jump', move: [0, 1], times: [0.5, 1.2, 2.0], cam: [1.6, 0.4, 0.4, 1.6] },
  'duct': { at: [21.75, 3.2, -5, Math.PI / 2], tap: 'jump', move: [0, 1], times: [1.0, 2.5], cam: [1.2, 0.6, 0.3, 0.3] },
  'window-vault': { at: [26, 0, -9.2, 0], tap: 'jump', times: [0.25, 0.55, 0.9], cam: [1.8, 1.0, 0.2, 0.8] },
  'zipline': { at: [26.5, 3.6, 10.2, Math.PI], tap: 'jump', times: [0.4, 1.0, 1.8], cam: [1.6, 1.0, 0.0, 1.1] },
  'rappel': { at: [24, 'RH', 27.0, Math.PI], tap: 'jump', move: [0, -1], times: [0.8, 1.6, 2.6], cam: [-1.5, 1.1, -0.2, 1.0] },
  'fence': { at: [-9, 0, 25.4, 0], tap: 'jump', move: [0, 1], times: [0.6, 1.2, 2.0], cam: [1.4, 1.4, -0.8, 1.3] },
  'wall-stand': { at: [-8.3, 0, 0.5, 0], wall: true, times: [0.8], cam: [0.3, 1.4, 1.8, 1.0] },
  'wall-crouch': { at: [-8.3, 0, 0.5, 0], wall: true, crouch: true, times: [0.8], cam: [0.3, 1.0, 1.8, 0.6] },
  'wall-slide': { at: [-8.3, 0, 0.5, 0], wall: true, move: [1, 0], times: [0.6, 1.2], cam: [0.3, 1.4, 1.8, 1.0] },
};

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 2500));
const { browser, page, errors } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: 'autostart=proving', viewport: { width: 1280, height: 720 } });
const report = {};
try {
  await waitOperator(page, 1, 180000);
  await page.evaluate(() => {
    const a = window.__app;
    a.loop.manual = true;
    const g = a.current;
    const p = g.player;
    const V = p.position.constructor;
    g.target.damageMul = 0;
    document.querySelectorAll('.hud, .hud-root, #hud').forEach((e) => (e.style.visibility = 'hidden'));
    const orig = p.cam.update.bind(p.cam);
    p.cam.update = (dt, feet, crouch) => {
      orig(dt, feet, crouch);
      const v = window.__cam;
      if (!v) return;
      const c = p.cam.camera;
      const r = p.rig.root.position;
      const y = window.__camYaw ?? p.controller.renderYaw;
      const fx = Math.sin(y), fz = Math.cos(y);
      c.position.set(r.x + fz * v[0] + fx * v[2], r.y + v[1], r.z - fx * v[0] + fz * v[2]);
      c.setTarget(new V(r.x, r.y + v[3], r.z));
    };
  });
  for (const [name, m] of Object.entries(MOVES)) {
    if (only.length && !only.includes(name)) continue;
    await page.evaluate((m) => {
      const a = window.__app;
      const g = a.current;
      const p = g.player;
      const c = p.controller;
      const st = a.input.state;
      const V = p.position.constructor;
      g.traversal.reset();
      st.releaseAll();
      if (c.crouched) c.clearCrouchToggle();
      const y = m.at[1] === 'RH' ? 5.7 : m.at[1];
      c.teleport(new V(m.at[0], y, m.at[2]), m.at[3]);
      p.cam.yaw = m.camYaw ?? m.at[3];
      p.cam.pitch = 0;
      window.__cam = null;
      window.__camYaw = m.at[3];
      a.loop.stepHeadless(0.5, 120);
      if (m.crouch) c.setCrouchToggle();
      if (m.wall) st.tap('dash');
      if (m.tap) st.tap(m.tap);
      window.__t = 0;
    }, m);
    const shots = [];
    for (const t of m.times) {
      const info = await page.evaluate(([m, t]) => {
        const a = window.__app;
        const g = a.current;
        const st = a.input.state;
        while (window.__t < t - 1e-6) {
          if (m.tap2 && Math.abs(window.__t - m.tap2[0]) < 1 / 60) st.tap(m.tap2[1]);
          st.setMove('t', m.move?.[0] ?? 0, m.move?.[1] ?? 0);
          a.loop.stepHeadless(1 / 30, 120);
          window.__t += 1 / 30;
        }
        window.__cam = m.cam;
        a.loop.stepHeadless(1 / 120, 120);
        const r = g.player.rig;
        // Wren's palm centre (her wrist joint + the rest-frame palm offset, handFrame.ts) against the rig's world grip
        // point for each hand: the contact error, and the palm normal's angle to the grip direction
        const V = g.player.position.constructor;
        const H = { L: { palm: [0.00372, -0.04769, 0.00084], n: [0.9529, 0.06913, -0.2953] }, R: { palm: [-0.00372, -0.04769, 0.00084], n: [-0.9529, 0.06913, -0.2953] } };
        const contact = {};
        for (const [s, wr, rc] of [['L', r.wristL, r.reachL], ['R', r.wristR, r.reachR]]) {
          if (!rc || rc.w < 0.5) continue;
          const m = wr.computeWorldMatrix(true);
          const pw = V.TransformCoordinates(new V(...H[s].palm), m);
          const nw = V.TransformNormal(new V(...H[s].n), m).normalize();
          const tgt = new V(rc.x, rc.y, rc.z);
          const d = tgt.subtract(pw);
          // (check fix r1) the palm against the real geometry's solved point (rig.gripError), not the raw target
          const ge = r.gripError?.(s === 'R' ? 1 : -1);
          // skin clearance from the anchor's own geometry: the palm centre to the grip line (a lip: to its edge point),
          // less the radius and the palm's 14 mm depth (0 = on the surface, negative = into it)
          let skin = null;
          if (rc.cx !== undefined && (rc.ax || rc.ay || rc.az)) {
            const q = new V(pw.x - rc.cx, pw.y - rc.cy, pw.z - rc.cz);
            if (!rc.hook) { const k = q.x * rc.ax + q.y * rc.ay + q.z * rc.az; q.set(q.x - k * rc.ax, q.y - k * rc.ay, q.z - k * rc.az); }
            skin = Math.round((q.length() - (rc.rad ?? 0) - 0.014) * 1000);
          }
          contact[s] = { skinMm: skin, geomMm: ge === null || ge === undefined ? null : Math.round(ge * 1000), targetMm: Math.round(d.length() * 1000), palmToTargetDeg: Math.round((Math.acos(Math.max(-1, Math.min(1, V.Dot(nw, d.normalize())))) * 180) / Math.PI) };
        }
        const cc = g.traversal.attachCtl?.active ? g.traversal.attachCtl.contacts() : null;
        if (cc) { if (contact.L) contact.L.planted = cc.plantedL; if (contact.R) contact.R.planted = cc.plantedR; }
        return { contact, kind: g.traversal.attachCtl?.m?.kind ?? g.traversal.kind ?? '-', phase: g.traversal.attachCtl?.m?.phase ?? '-', wall: g.wallCore?.phase ?? '-', grip: [r.handGrip.l, r.handGrip.r] };
      }, [m, t]);
      await page.evaluate(() => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))));
      const file = path.join(out, `${name}-${t.toFixed(1)}.png`);
      await page.screenshot({ path: file });
      shots.push({ t, file: path.basename(file), ...info });
      await page.evaluate(() => { window.__cam = null; });
    }
    report[name] = shots;
    console.log(name, JSON.stringify(shots.map((s) => `${s.t}:${s.kind}/${s.phase} grip ${s.grip.map((x) => x.toFixed(1))} ${JSON.stringify(s.contact)}`)));
  }
  writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 1));
  console.log(errors.length ? errors.join('\n') : 'no console errors');
} finally {
  await browser.close();
  server.kill();
}
