// (CT prototype G8) Gait measurements of Wren's rig joints over a cycle, in the body frame (x right, y up, z forward,
// metres): track width, knee separation, elbow out from the shoulder, wrist swing, stride, pelvis height / bob / sway,
// torso lean, head bob, cadence; still poses (`still`) report the breathing / sway cycle of the pelvis and the head.
// Serves dist/ itself (run `npm run build` first). Logic only: software GL is fine (E2E_PORT, default 4195).
//   node scripts/anim-keys/measure.mjs [scenario ...]     (walk jog sprint sneak crouchwalk crouchrun crouchidle)
// Prints one JSON line per scenario (and writes them to MEASURE_OUT when set).
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { launch, waitOperator } from '../e2e-lib.mjs';

const PORT = Number(process.env.E2E_PORT ?? 4195);
const SC = {
  walk: { y: 0.5, warm: 2.5, span: 2.4 },
  jog: { y: 1, warm: 1.5, span: 1.6, pos: [-8, -14] },
  sprint: { y: 1, warm: 1.2, span: 1.2, pos: [-14, -14], at0: "a.input.state.tap('dash');" },
  run: { y: 1, warm: 1.5, span: 1.2, pos: [-16, -14], params: '&gear=5' },
  crouchrun5: { y: 1, warm: 1.5, span: 1.2, pos: [-12, -14], params: '&gear=5', at0: "a.input.state.tap('crouch');" },
  sneak: { y: 0.4, warm: 1.5, span: 2.4, at0: "a.input.state.tap('crouch');" },
  crouchwalk: { y: 0.7, warm: 1.5, span: 2.0, at0: "a.input.state.tap('crouch');" },
  crouchrun: { y: 1, warm: 1.5, span: 1.6, pos: [-8, -14], at0: "a.input.state.tap('crouch');" },
  crouchidle: { y: 0, warm: 3.0, span: 8.0, still: true, at0: "a.input.state.tap('crouch');" },
  idle: { y: 0, warm: 3.0, span: 8.0, still: true },
};
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SC);
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
process.on('exit', () => server.kill());
await new Promise((r) => setTimeout(r, 2500));
const lines = [];
for (const name of names) {
  const sc = SC[name];
  const { browser, page } = await launch({ url: `http://127.0.0.1:${PORT}/`, params: 'autostart=proving' + (sc.params ?? '') });
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
  await waitOperator(page, 1, 60000);
  const res = await page.evaluate(({ sc }) => {
    const a = window.__app;
    const g = a.current;
    const p = g.player;
    a.loop.manual = true;
    const V = p.controller.pos.constructor;
    const yaw0 = Math.PI / 2;
    const pos = sc.pos ?? [0, -14];
    p.controller.teleport(new V(pos[0], 0, pos[1]), yaw0);
    p.cam.yaw = yaw0;
    p.cam.pitch = 0;
    a.loop.stepHeadless(0.3);
    const s = a.input.state;
    if (sc.at0) new Function('a', 'g', sc.at0)(a, g);
    const set = () => { s.move.x = 0; s.move.y = sc.y; };
    for (let t = 0; t < sc.warm; t += 1 / 60) { set(); a.loop.stepHeadless(1 / 60, 120); }
    const r = p.rig;
    const N = ['hips', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
    const rows = [];
    let contacts = 0;
    let lastL = r.planner.L.contact;
    for (let t = 0; t < sc.span; t += 1 / 60) {
      set();
      a.loop.stepHeadless(1 / 60, 120);
      const yaw = r.root.rotation.y;
      const fx = Math.sin(yaw), fz = Math.cos(yaw);
      const rp = r.root.position;
      const row = { t, cL: r.planner.L.contact, cR: r.planner.R.contact, speed: p.controller.speed };
      for (const k of N) {
        // world matrices from the root down (a headless step does not render)
        const chain = [];
        for (let n = r[k]; n; n = n.parent) chain.unshift(n);
        for (const n of chain) n.computeWorldMatrix(true);
        const w = r[k].getAbsolutePosition();
        const dx = w.x - rp.x, dz = w.z - rp.z;
        row[k] = [dx * fz - dz * fx, w.y - rp.y, dx * fx + dz * fz];
      }
      if (row.cL && !lastL) contacts++;
      lastL = row.cL;
      rows.push(row);
    }
    return { rows, contacts, hipHalf: r.p.hipHalf, shoulderHalf: r.p.shoulderHalf };
  }, { sc });
  await browser.close();
  const { rows, hipHalf } = res;
  const rng = (f) => { let lo = Infinity, hi = -Infinity; for (const q of rows) { const v = f(q); lo = Math.min(lo, v); hi = Math.max(hi, v); } return hi - lo; };
  const mean = (f, keep = () => true) => { let s = 0, n = 0; for (const q of rows) if (keep(q)) { s += f(q); n++; } return n ? s / n : NaN; };
  const max = (f) => rows.reduce((m, q) => Math.max(m, f(q)), -Infinity);
  const min = (f) => rows.reduce((m, q) => Math.min(m, f(q)), Infinity);
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const out = { scenario: name, speed: r3(mean((q) => q.speed)) };
  // feet: the lateral distance between the ankle centres (track) and each ankle out from the midline in stance
  out.trackW = r3(mean((q) => q.ankleR[0] - q.ankleL[0]));
  out.trackHipW = r3(out.trackW / (2 * hipHalf));
  out.ankleOutStance = r3((mean((q) => -q.ankleL[0], (q) => q.cL) + mean((q) => q.ankleR[0], (q) => q.cR)) / 2);
  out.kneeSep = r3(mean((q) => q.kneeR[0] - q.kneeL[0]));
  out.kneeSepMin = r3(min((q) => q.kneeR[0] - q.kneeL[0]));
  // knee out of the hip-ankle line (positive: bowed out)
  const bow = (h, k, an, sgn) => sgn * (k[0] - (h[0] + an[0]) / 2);
  out.kneeBow = r3(mean((q) => (bow(q.hipL, q.kneeL, q.ankleL, -1) + bow(q.hipR, q.kneeR, q.ankleR, 1)) / 2));
  // elbows: out from the shoulder joint and from the chest centre line
  out.elbowOut = r3(mean((q) => ((q.shoulderL[0] - q.elbowL[0]) + (q.elbowR[0] - q.shoulderR[0])) / 2));
  out.elbowOutMax = r3(max((q) => Math.max(q.shoulderL[0] - q.elbowL[0], q.elbowR[0] - q.shoulderR[0])));
  out.elbowFromMid = r3(mean((q) => (q.elbowR[0] - q.elbowL[0]) / 2));
  out.wristFromMid = r3(mean((q) => (q.wristR[0] - q.wristL[0]) / 2));
  // swing: the wrist fore-aft range relative to the pelvis, the elbow bend (deg)
  out.wristSwing = r3((rng((q) => q.wristL[2] - q.hips[2]) + rng((q) => q.wristR[2] - q.hips[2])) / 2);
  const ang = (a, b, c) => { const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]; const d = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / Math.sqrt((u[0] ** 2 + u[1] ** 2 + u[2] ** 2) * (v[0] ** 2 + v[1] ** 2 + v[2] ** 2)); return 180 - (Math.acos(Math.max(-1, Math.min(1, d))) * 180) / Math.PI; };
  out.elbowFlex = Math.round(mean((q) => (ang(q.shoulderL, q.elbowL, q.wristL) + ang(q.shoulderR, q.elbowR, q.wristR)) / 2));
  out.elbowFlexMax = Math.round(max((q) => Math.max(ang(q.shoulderL, q.elbowL, q.wristL), ang(q.shoulderR, q.elbowR, q.wristR))));
  out.kneeFlexStance = Math.round(mean((q) => ang(q.hipL, q.kneeL, q.ankleL), (q) => q.cL));
  out.kneeFlexMax = Math.round(max((q) => ang(q.hipL, q.kneeL, q.ankleL)));
  out.stride = r3(rng((q) => q.ankleL[2] - q.hips[2]));
  out.pelvisY = r3(mean((q) => q.hips[1]));
  out.pelvisBob = r3(rng((q) => q.hips[1]));
  out.pelvisSway = r3(rng((q) => q.hips[0]));
  out.headBob = r3(rng((q) => q.headNode[1]));
  out.torsoLean = Math.round(mean((q) => (Math.atan2(q.neck[2] - q.hips[2], q.neck[1] - q.hips[1]) * 180) / Math.PI));
  out.cadence = r3((res.contacts * 2) / (rows.length / 60));
  if (sc.still) {
    // breathing / sway: the period of the head height (mean crossings) and its amplitude
    const hy = rows.map((q) => q.headNode[1]);
    const m = hy.reduce((s, v) => s + v, 0) / hy.length;
    const ups = [];
    for (let i = 1; i < hy.length; i++) if (hy[i - 1] < m && hy[i] >= m) ups.push(i / 60);
    out.breathPeriod = ups.length > 1 ? r3((ups[ups.length - 1] - ups[0]) / (ups.length - 1)) : null;
    out.breathAmp = r3(rng((q) => q.headNode[1]));
    const sx = rows.map((q) => q.headNode[0]);
    const mx = sx.reduce((s, v) => s + v, 0) / sx.length;
    const ux = [];
    for (let i = 1; i < sx.length; i++) if (sx[i - 1] < mx && sx[i] >= mx) ux.push(i / 60);
    out.swayPeriod = ux.length > 1 ? r3((ux[ux.length - 1] - ux[0]) / (ux.length - 1)) : null;
    out.swayAmp = r3(rng((q) => q.headNode[0]));
  }
  console.log(JSON.stringify(out));
  lines.push(out);
}
if (process.env.MEASURE_OUT) writeFileSync(process.env.MEASURE_OUT, JSON.stringify(lines, null, 1));
server.kill();
process.exit(0);
