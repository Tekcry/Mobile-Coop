// Animation audit harness, local player (bible 5.12.2 realism standard, 5.12.4.2, 5.17 D2 no-bobble, D5 modern
// layer). Proving Grounds, headless fixed steps at 60 and 120 Hz render rates. The page only records joint / camera /
// capsule / foot-planner streams every rendered frame; node computes every metric with the pure, unit-tested
// `src/anim/audit/metrics.ts` against `src/anim/audit/limits.ts` (bundled with esbuild at start).
//
//   node scripts/anim-audit.mjs [url] [--quick] [--only=<scenario>] [--out=dir] [--shots] [--strict]
//
//   --quick   flat only, stand 2 / 4 / 6 and crouch 3 at 60 and 120 Hz, plus stop / idle (< 60 s; steps 21-31)
//   --only    run only the scenarios whose name contains this text
//   --out     output folder (default test-results/anim-audit): local.json (per scenario and metric: worst, frame,
//             limit, pass, bible line) and fails.txt (one line per fail)
//   --shots   PNG of the first failing frame per failing scenario (PC only, E2E_GPU=1)
//   --strict  exit 1 on any fail (step 32); by default it reports and exits 0 unless the harness itself errors
//
// Without a url it serves dist/ itself (vite preview on 4173, killed at exit): run `npm run build` first.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './e2e-lib.mjs';

const T0 = Date.now();
const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const flag = (k) => args.includes(`--${k}`);
const urlArg = args.find((a) => !a.startsWith('--'));
const url = urlArg ?? 'http://localhost:4173/';
const QUICK = flag('quick');
const ONLY = opt('only');
const OUT = resolve(opt('out') ?? 'test-results/anim-audit');
const SHOTS = flag('shots');
const STRICT = flag('strict');

// ---------------------------------------------------------------- pure metrics for node
const LIB = resolve('test-results/anim-audit/lib');
execFileSync('node_modules/.bin/esbuild', ['src/anim/audit/metrics.ts', 'src/anim/audit/limits.ts', '--bundle', '--format=esm', `--outdir=${LIB}`, '--log-level=warning'], { stdio: 'inherit' });
const M = await import(pathToFileURL(`${LIB}/metrics.js`).href);
const L = await import(pathToFileURL(`${LIB}/limits.js`).href);

// ---------------------------------------------------------------- server (only when none is up and no url given)
let server = null;
const up = async () => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};
if (!(await up())) {
  if (urlArg) throw new Error(`${url} is not reachable`);
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '4173', '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
  process.on('exit', () => server?.kill());
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) {
    await new Promise((r) => setTimeout(r, 250));
    ok = await up();
  }
  if (!ok) {
    server.kill();
    console.error('preview server did not start (run `npm run build` first)');
    process.exit(2);
  }
}

// ---------------------------------------------------------------- page recorder + driver
const NODES = ['hips', 'spine', 'torso', 'neck', 'headNode', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'weaponPivot'];
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
const G = (f, a) => page.evaluate(f, a);
const names = await G(([NODES, W]) => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  const c = p.controller;
  const rig = p.rig;
  const V = p.position.constructor;
  g.target.damageMul = 0;
  a.loop.manual = true;
  const st = a.input.state;
  const hooks = a.loop['hooks'];
  const LOWER = ['locomotion', 'crouch', 'kneel', 'air', 'slide', 'wall', 'traverse'];
  const names = ['t', 'tp'];
  for (const n of NODES) for (const k of ['x', 'y', 'z', 'qx', 'qy', 'qz', 'qw']) names.push(`${n}.${k}`);
  names.push('cam.x', 'cam.y', 'cam.z', 'cap.x', 'cap.y', 'cap.z', 'fix.x', 'fix.y', 'fix.z', 'speed', 'gear', 'crouchBlend', 'crouched', 'yaw', 'grounded');
  for (const s of ['L', 'R']) for (const k of ['contact', 'landed', 'slide', 'x', 'y', 'z', 'yaw', 'gy', 'gyH', 'gyT']) names.push(`${s}.${k}`);
  names.push('lower', 'lowerW', 'grip.x', 'grip.y', 'grip.z', 'muz.x', 'muz.y', 'muz.z', 'hR.x', 'hR.y', 'hR.z', 'hL.x', 'hL.y', 'hL.z', 'wR', 'wL');
  names.push('raise', 'swapping', 'traverse', 'attached', 'ladderS', 'tgt');
  const K = names.length;
  const tmp = new V();
  // W: weapon-space wrist offsets (limits.ts WRIST_ON_GRIP / WRIST_ON_FOREGRIP, as e2e-weapons-carry)
  // the anim graph's last targets (grip IK weights), stashed per update
  let last = null;
  const gu = rig.graph.update.bind(rig.graph);
  rig.graph.update = (dt, i) => (last = gu(dt, i));
  // world ground under each ankle: a down-ray against static geometry (not the planner's own ground)
  const eng = g.scene.getPhysicsEngine();
  const rq = { membership: 2, collideWith: 1 };
  const rFrom = new V();
  const rTo = new V();
  const groundAt = (x, y, z) => {
    rFrom.set(x, y + 0.6, z);
    rTo.set(x, y - 1.5, z);
    const h = eng.raycast(rFrom, rTo, rq);
    return h.hasHit ? h.hitPointWorld.y : NaN;
  };
  // heel / toe offsets in each ankle's local frame (metrics solePoints; set by the harness after the rest calibration)
  const sole = { L: [[0, -0.08, -0.06], [0, -0.08, 0.21]], R: [[0, -0.08, -0.06], [0, -0.08, 0.21]] };
  // ground under a sole point: the ankle's world quat applied to the local offset, ray-cast at that point's own x / z
  const groundUnder = (an, q, o) => {
    const tx = 2 * (q.y * o[2] - q.z * o[1]);
    const ty = 2 * (q.z * o[0] - q.x * o[2]);
    const tz = 2 * (q.x * o[1] - q.y * o[0]);
    const px = an.x + o[0] + q.w * tx + (q.y * tz - q.z * ty);
    const pz = an.z + o[2] + q.w * tz + (q.x * ty - q.y * tx);
    return groundAt(px, an.y, pz);
  };
  const aa = { frames: [], rec: false, tp: 0, halt: -1, kinds: new Set(), t: 0 };
  const orig = hooks.frameUpdate;
  hooks.frameUpdate = function (dt, alpha) {
    orig.call(this, dt, alpha);
    aa.t += dt;
    if (!aa.rec || (aa.halt >= 0 && aa.frames.length >= aa.halt)) return;
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) d.computeWorldMatrix?.(true);
    const f = new Float32Array(K);
    let o = 0;
    f[o++] = aa.t;
    f[o++] = aa.tp;
    aa.tp = 0;
    for (const n of NODES) {
      const node = rig[n];
      const pp = node.getAbsolutePosition();
      const q = node.absoluteRotationQuaternion;
      f[o++] = pp.x;
      f[o++] = pp.y;
      f[o++] = pp.z;
      f[o++] = q.x;
      f[o++] = q.y;
      f[o++] = q.z;
      f[o++] = q.w;
    }
    const cp = p.cam.camera.position;
    f[o++] = cp.x;
    f[o++] = cp.y;
    f[o++] = cp.z;
    for (const v of [c.renderPos, c.pos]) {
      f[o++] = v.x;
      f[o++] = v.y;
      f[o++] = v.z;
    }
    f[o++] = c.speed;
    f[o++] = c.gear;
    f[o++] = c.crouchBlend;
    f[o++] = c.crouched ? 1 : 0;
    f[o++] = c.yaw;
    f[o++] = c.grounded ? 1 : 0;
    for (const s of ['L', 'R']) {
      const fs = rig.planner[s];
      f[o++] = fs.contact ? 1 : 0;
      f[o++] = fs.landed ? 1 : 0;
      f[o++] = fs.slide;
      f[o++] = fs.x;
      f[o++] = fs.y;
      f[o++] = fs.z;
      f[o++] = fs.yaw;
      const ak = rig[s === 'L' ? 'ankleL' : 'ankleR'];
      const an = ak.getAbsolutePosition();
      f[o++] = groundAt(an.x, an.y, an.z);
      f[o++] = groundUnder(an, ak.absoluteRotationQuaternion, sole[s][0]);
      f[o++] = groundUnder(an, ak.absoluteRotationQuaternion, sole[s][1]);
    }
    const gr = rig.graph;
    f[o++] = LOWER.indexOf(gr.state);
    f[o++] = gr.weights?.[gr.state] ?? 1;
    const hw = rig.heldWeapon;
    // grip point, muzzle (bore line at the far end), then the wrist targets: the gripping hand on the grip, the
    // other on the foregrip (sides swap when the weapon is in the left hand), each with its IK weight
    const lg = rig.handBlend > 0.5;
    const pts = [
      [rig.grip.x, rig.grip.y, rig.grip.z],
      [0, rig.gunSpan.bore, rig.gunSpan.z1],
      lg ? [rig.foregrip.x + W.fore[0], rig.foregrip.y + W.fore[1], rig.foregrip.z + W.fore[2]] : [rig.grip.x + W.grip[0], rig.grip.y + W.grip[1], rig.grip.z + W.grip[2]],
      lg ? [rig.grip.x - W.grip[0], rig.grip.y + W.grip[1], rig.grip.z + W.grip[2]] : [rig.foregrip.x - W.fore[0], rig.foregrip.y + W.fore[1], rig.foregrip.z + W.fore[2]],
    ];
    if (hw) hw.computeWorldMatrix(true);
    for (const pt of pts) {
      if (hw) {
        tmp.set(pt[0], pt[1], pt[2]);
        V.TransformCoordinatesToRef(tmp, hw.getWorldMatrix(), tmp);
        f[o++] = tmp.x;
        f[o++] = tmp.y;
        f[o++] = tmp.z;
      } else o += 3, (f[o - 1] = f[o - 2] = f[o - 3] = NaN);
    }
    const gw = hw && last ? last.grip : 0;
    const offW = hw && last ? Math.min(1, last.offGrip) * last.grip : 0;
    f[o++] = lg ? offW : gw;
    f[o++] = lg ? gw : offW;
    f[o++] = p.carry.raise;
    f[o++] = g.weapons?.swapping ? 1 : 0;
    // committed traversal (vault, mantle, step, drop: `traversal.kind`) or an attached / traversal pose
    const tk = g.traversal?.kind;
    const moving = (tk && tk !== 'none') || p.pose.traverse !== 'none';
    f[o++] = moving ? 1 : 0;
    if (tk && tk !== 'none') aa.kinds.add(tk);
    else if (p.pose.traverse !== 'none') aa.kinds.add(p.pose.traverse);
    const ac = g.traversal?.attachCtl;
    f[o++] = ac?.active ? 1 : 0;
    f[o++] = ac?.m?.s ?? NaN;
    const mi = c.motionIn;
    f[o++] = mi ? Math.sqrt(mi.vx * mi.vx + mi.vz * mi.vz) : NaN;
    aa.frames.push(f);
  };
  const halted = () => aa.halt >= 0 && aa.frames.length >= aa.halt;
  window.__aa = {
    setSole(L, R) {
      sole.L = L;
      sole.R = R;
    },
    begin(halt = -1) {
      aa.frames = [];
      aa.kinds = new Set();
      aa.halt = halt;
      aa.rec = true;
    },
    mark: () => aa.frames.length,
    end() {
      aa.rec = false;
      const all = new Float32Array(aa.frames.length * K);
      aa.frames.forEach((f, i) => all.set(f, i * K));
      const u8 = new Uint8Array(all.buffer);
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return { b64: btoa(s), n: aa.frames.length, kinds: [...aa.kinds] };
    },
    stance(crouch, gear) {
      if (crouch) c.setCrouchToggle();
      else c.clearCrouchToggle();
      if (gear) c.gears.set(gear);
    },
    tp(x, z, yaw, y = 0) {
      // twice, with the gait clock reset in between: every run from the same clock and pose (60 / 120 Hz parity)
      for (let k = 0; k < 2; k++) {
        c.teleport(new V(x, y, z), yaw);
        p.cam.yaw = yaw;
        p.cam.pitch = 0;
        p.cam.snap();
        st.move.x = st.move.y = 0;
        a.loop.stepHeadless(1.2);
        c.motion.phase = 0;
        c['prevPhase'] = 0;
      }
      // idle clock (breathing, weapon sway; animGraph seeds it at random): every run from the same phase
      rig.graph['idleT'] = 0;
      rig.graph['stillT'] = 0;
      aa.tp = 1;
    },
    run(sec, inp, hz = 60) {
      const n = Math.round(sec * 60);
      for (let k = 1; k <= n && !halted(); k++) {
        st.move.x = inp.x ?? 0;
        st.move.y = inp.y ?? 0;
        st.set('anim-audit', 'ads', !!inp.ads);
        if (inp.taps?.[k]) st.tap(inp.taps[k]);
        a.loop.stepHeadless(1 / 60, hz);
      }
      st.move.x = st.move.y = 0;
      st.set('anim-audit', 'ads', false);
      return aa.frames.length;
    },
    /** Hold `inp` until the capsule lands after being airborne (or `max` s). */
    runUntilLand(max, inp, hz = 60) {
      let air = false;
      for (let k = 0; k < max * 60 && !halted(); k++) {
        st.move.x = inp.x ?? 0;
        st.move.y = inp.y ?? 0;
        a.loop.stepHeadless(1 / 60, hz);
        if (!c.grounded) air = true;
        else if (air) break;
      }
      st.move.x = st.move.y = 0;
      return aa.frames.length;
    },
    render() {
      g.scene.render();
    },
  };
  return names;
}, [NODES, { grip: [...L.WRIST_ON_GRIP], fore: [...L.WRIST_ON_FOREGRIP] }]);
const IDX = Object.fromEntries(names.map((n, i) => [n, i]));
const K = names.length;

// ---------------------------------------------------------------- scenarios
const FLAT = { x: -26, z: -26, yaw: 0, y: 0 }; // open lane on the west side, heading north (15 m clear, steady camera)
const STAIRS = { x: 12.6, z: 16, yaw: -Math.PI / 2, y: 0, len: 7 }; // 9 steps, rise 0.289 m, rising toward -X onto the platform
const RAMP = { x: -12.6, z: 16, yaw: Math.PI / 2, y: 0, len: 7 }; // 20.4 deg, rising toward +X
const SLOPE35 = { x: 21, z: 9.0, yaw: 0, y: 0, len: 5 }; // 35 deg test slope, rising toward +Z
const SURF = { flat: FLAT, stairs: STAIRS, ramp: RAMP, slope35: SLOPE35 };
const ACCEL = 1.0;
const STOP = 1.5;

const gaits = [];
const add = (surface, stance, gear, hz) => gaits.push({ name: `${surface}-${stance}${gear}`, kind: 'gait', surface, stance, gear, hz });
if (QUICK) {
  for (const hz of [60, 120]) for (const [s, g] of [['stand', 2], ['stand', 4], ['stand', 6], ['crouch', 3]]) add('flat', s, g, hz);
} else {
  for (const hz of [60, 120]) for (const s of ['stand', 'crouch']) for (let g = 1; g <= 6; g++) add('flat', s, g, hz);
  for (const surface of ['stairs', 'ramp']) for (const s of ['stand', 'crouch']) for (let g = 1; g <= 6; g++) add(surface, s, g, 60);
  for (const surface of ['stairs', 'slope35'])
    for (const [s, g] of [['stand', 2], ['stand', 4], ['stand', 6], ['crouch', 2], ['crouch', 6]]) add(surface, s, g, 120);
}
const TRANS = QUICK ? ['idle'] : ['stance', 'turn180', 'raise', 'swap', 'vault', 'mantle', 'ladder', 'drop09', 'drop24', 'idle', 'tunnel'];
const transitions = [];
for (const hz of [60, 120]) for (const t of TRANS) transitions.push({ name: t, kind: t, hz });
const scenarios = [...gaits, ...transitions].filter((s) => !ONLY || s.name.includes(ONLY));

/** Drive one scenario in the page; returns frame markers. */
async function drive(sc, halt = -1) {
  return G(([sc, halt, SURF, ACCEL, STOP]) => {
    const t = window.__aa;
    const hz = sc.hz;
    const m = {};
    const g = window.__app.current;
    if (sc.kind === 'gait') {
      const s = SURF[sc.surface];
      const crouch = sc.stance === 'crouch';
      t.stance(crouch, sc.gear);
      const cap = (crouch ? [0.5, 0.9, 1.3, 1.8, 2.3, 2.8] : [0.8, 1.3, 2.0, 2.8, 3.8, 5.0])[sc.gear - 1];
      // flat: 1.0 s accel + >= 2 strides; ramps and stairs: the accel is short (95% within 0.08 s), so the steady
      // window covers the slope from 0.3 s on and ends 0.4 m before its top
      let accel = 1.0;
      let steady = sc.stance === 'crouch' || sc.gear <= 2 ? 3.0 : 2.0;
      let x = s.x;
      let z = s.z;
      if (s.len) {
        accel = 0.3;
        steady = Math.min(3.0, Math.max(0.5, (s.len - 0.4) / cap - accel + 0.1));
      }
      t.tp(x, z, s.yaw, s.y);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.start = t.mark();
      t.run(accel, { y: 1 }, hz);
      m.steady = t.mark();
      t.run(steady, { y: 1 }, hz);
      m.stop = t.mark();
      t.run(STOP, {}, hz);
      m.end = t.mark();
      m.cap = cap;
      t.stance(false, 3);
    } else if (sc.kind === 'stance') {
      t.tp(-26, -26, 0);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.down = t.mark();
      t.run(0.8, { taps: { 1: 'crouch' } }, hz);
      m.up = t.mark();
      t.run(0.8, { taps: { 1: 'crouch' } }, hz);
      m.end = t.mark();
      window.__app.current.player.controller.clearCrouchToggle();
    } else if (sc.kind === 'turn180') {
      t.stance(false, 4);
      t.tp(-26, -26, 0);
      t.begin(halt);
      t.run(1.0, { y: 1 }, hz);
      m.rev = t.mark();
      // stick pulled back: the body turns round toward the camera at the travel turn rate
      t.run(0.8, { y: -1 }, hz);
      m.stop = t.mark();
      t.run(1.0, {}, hz);
      m.end = t.mark();
      t.stance(false, 3);
    } else if (sc.kind === 'raise') {
      t.tp(-26, -26, 0);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.raise = t.mark();
      t.run(0.8, { ads: true }, hz);
      m.lower = t.mark();
      t.run(1.0, {}, hz);
      m.end = t.mark();
    } else if (sc.kind === 'swap') {
      t.tp(-26, -26, 0);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.swap = t.mark();
      t.run(2.0, { taps: { 1: 'swapNext' } }, hz);
      t.run(2.0, { taps: { 1: 'swapNext' } }, hz);
      m.end = t.mark();
    } else if (sc.kind === 'vault' || sc.kind === 'mantle') {
      // as e2e-move: teleport, settle 0.5 s, read the offered traversal, one jump press, record. Vault: low cover
      // west of (-3.8, -6); mantle: the 0.9 m block of the step row west of (-19.9, -1.2); both facing -X.
      t.stance(false, 3);
      const p0 = sc.kind === 'vault' ? [-3.8, -6] : [-19.9, -1.2];
      t.tp(p0[0], p0[1], -Math.PI / 2);
      t.run(0.5, {}, hz);
      m.hint = g.traversal?.hint?.kind ?? 'none';
      t.begin(halt);
      t.run(0.2, {}, hz);
      m.jump = t.mark();
      t.run(1.4, { taps: { 1: 'jump' } }, hz);
      t.run(0.8, {}, hz);
      m.end = t.mark();
    } else if (sc.kind === 'ladder') {
      t.tp(25.2, 11, Math.PI / 2);
      t.run(0.4, {}, hz);
      t.begin(halt);
      t.run(0.2, { taps: { 1: 'jump' } }, hz);
      t.run(0.4, {}, hz);
      m.climb = t.mark();
      t.run(1.5, { y: 1 }, hz);
      m.end = t.mark();
      t.run(0.2, { taps: { 1: 'crouch' } }, hz);
    } else if (sc.kind === 'drop09' || sc.kind === 'drop24') {
      t.stance(false, 3);
      if (sc.kind === 'drop09') t.tp(-22, -1.2, Math.PI / 2, 0.9);
      else t.tp(2, 17, 0, 2.6);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.go = t.mark();
      t.runUntilLand(4, { y: 1 }, hz);
      m.land = t.mark();
      t.run(1.2, {}, hz);
      m.end = t.mark();
    } else if (sc.kind === 'idle') {
      t.tp(-26, -26, 0);
      t.begin(halt);
      t.run(0.5, {}, hz);
      m.idle = t.mark();
      t.run(3.0, {}, hz);
      m.end = t.mark();
    } else if (sc.kind === 'tunnel') {
      // crouch tunnel (x -12..-9.5, z -25..-19, roof 1.4 m), walked through crouched at gear 3
      t.stance(true, 3);
      t.tp(-10.75, -27.5, 0);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.start = t.mark();
      t.run(1.0, { y: 1 }, hz);
      m.steady = t.mark();
      t.run(3.0, { y: 1 }, hz);
      m.stop = t.mark();
      t.run(1.5, {}, hz);
      m.end = t.mark();
      t.stance(false, 3);
      m.cap = 1.3;
    }
    return m;
  }, [sc, halt, SURF, ACCEL, STOP]);
}

async function record(sc, halt = -1) {
  const m = await drive(sc, halt);
  const r = await G(() => window.__aa.end());
  const buf = Buffer.from(r.b64, 'base64');
  const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return { m, n: r.n, data, kinds: r.kinds };
}

// ---------------------------------------------------------------- analysis
const col = (rec, name, a = 0, b = rec.n) => {
  const i = IDX[name];
  const out = new Float64Array(Math.max(0, b - a));
  for (let f = a; f < b; f++) out[f - a] = rec.data[f * K + i];
  return out;
};
const vec = (rec, n, a = 0, b = rec.n, keys = ['x', 'y', 'z']) => {
  const ii = keys.map((k) => IDX[`${n}.${k}`]);
  const out = new Float64Array(Math.max(0, b - a) * ii.length);
  for (let f = a; f < b; f++) ii.forEach((i, k) => (out[(f - a) * ii.length + k] = rec.data[f * K + i]));
  return out;
};
const quat = (rec, n, a, b) => vec(rec, n, a, b, ['qx', 'qy', 'qz', 'qw']);
const sub = (x, y) => x.map((v, i) => v - y[i]);
const or = (x, y) => x.map((v, i) => (v || y[i] ? 1 : 0));
/** Rising edges of a 0 / 1 stream: one heel strike per foot per landing. */
const rise = (x) => x.map((v, i) => (v && !(i > 0 && x[i - 1]) ? 1 : 0));
/** Per-frame lerp of two vector streams. */
const lerpS = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
const median = (x) => [...x].filter(Number.isFinite).sort((p, q) => p - q)[x.length >> 1] ?? 0;
const mean = (x) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);

let FOOT_REF = 0.08;
let FOOT = { len: 0.27, width: 0.1 };
/** The foot's forward / up axes in each ankle's local frame, calibrated on the flat rest stance (as FOOT_REF). */
const SOLE = { L: { fwd: [0, 0, 1], up: [0, 1, 0] }, R: { fwd: [0, 0, 1], up: [0, 1, 0] } };
/** Rig parent of each recorded node (characterRig.ts); the hips are measured in world. */
const PARENT = { spine: 'hips', torso: 'spine', neck: 'torso', headNode: 'neck', shoulderL: 'torso', shoulderR: 'torso', elbowL: 'shoulderL', elbowR: 'shoulderR', wristL: 'elbowL', wristR: 'elbowR', hipL: 'hips', hipR: 'hips', kneeL: 'hipL', kneeR: 'hipR', ankleL: 'kneeL', ankleR: 'kneeR', weaponPivot: 'torso' };
/** Neutral low-ready grip: elbow-to-wrist relative rotation per hand, recorded at harness start (as FOOT_REF). */
const WRIST_NEUTRAL = { L: [0, 0, 0, 1], R: [0, 0, 0, 1] };
const NOT_MEASURED = { clipBody: 'not measured: covered by e2e-clip', clipWeapon: 'not measured: covered by e2e-clip' };
const res = (into, key, r, limit, line, unit = 'm', off = 0) =>
  (into[key] = { worst: r.worst, frame: r.frame >= 0 ? r.frame + off : -1, limit, pass: !!r.pass, line, unit, ...(r.extra ?? {}) });

/** Continuity, contact, ROM, self clip, balance over frames a..b. */
function common(rec, hz, out, a, b, jumpLimit, balanceFrom = -1) {
  const tpm = col(rec, 'tp', a, b);
  let worst = { worst: 0, frame: -1, pass: true, j: '' };
  for (const n of NODES) {
    // local frame: each joint relative to its rig parent (characterRig.ts), the hips in world
    const q = PARENT[n] ? M.localQuats(quat(rec, PARENT[n], a, b), quat(rec, n, a, b)) : quat(rec, n, a, b);
    const r = M.jointRate(q, hz, tpm);
    if (r.worst > worst.worst) worst = { ...r, j: n };
  }
  res(out, 'jointRate', { ...worst, extra: { joint: worst.j } }, L.JOINT_DEG_PER_S / hz, ':794', 'deg', a);
  const hips = vec(rec, 'hips', a, b);
  res(out, 'pelvisJump', M.pelvisJump(hips, jumpLimit, tpm), jumpLimit, ':795', 'm', a);
  res(out, 'teleports', M.teleports(hips, tpm), 0, ':796', 'count', a);
  const bl = M.blendTimes(col(rec, 'lower', a, b), col(rec, 'lowerW', a, b), 1 / hz);
  if (bl.blends) res(out, 'blend', bl, `${L.BLEND_MIN}-${L.BLEND_MAX}`, ':797', 's', a);
  for (const s of ['L', 'R']) {
    const an = vec(rec, s === 'L' ? 'ankleL' : 'ankleR', a, b);
    // planted on the ground only: the planner's contacts are not the feet in the air, on a ladder or in a traversal clip
    const gr = col(rec, 'grounded', a, b);
    const tv = col(rec, 'traverse', a, b);
    const at = col(rec, 'attached', a, b);
    const ct = col(rec, `${s}.contact`, a, b).map((v, i) => (v && gr[i] && !tv[i] && !at[i] ? 1 : 0));
    // ground = world down-rays under the heel and the toe (stairs treads, slopes), not the planner's own ground
    // float / sink on the lowest sole point (heel or toe along the foot's own axes), not the ankle height
    // each point against the ground ray-cast at its own x / z (slopes, stair nosings): the clearance, ground 0
    const gnd = { heel: col(rec, `${s}.gyH`, a, b), toe: col(rec, `${s}.gyT`, a, b) };
    const sole = M.soleLowY(an, quat(rec, s === 'L' ? 'ankleL' : 'ankleR', a, b), SOLE[s].fwd, SOLE[s].up, FOOT.len, L.FOOT_BACK, FOOT_REF, gnd);
    const fc = M.footContact(an, new Float64Array(b - a), ct, FOOT_REF, undefined, sole);
    res(out, `footSlide${s}`, fc, L.FOOT_SLIDE, ':801 / :1273', 'm', a);
    res(out, `footFloat${s}`, fc.float, L.FOOT_FLOAT, ':801', 'm', a);
    res(out, `footSink${s}`, fc.sink, L.FOOT_SINK, ':801', 'm', a);
  }
  res(out, 'gripR', M.handContact(vec(rec, 'wristR', a, b), vec(rec, 'hR', a, b), col(rec, 'wR', a, b)), L.HAND_GRIP, ':802', 'm', a);
  res(out, 'gripL', M.handContact(vec(rec, 'wristL', a, b), vec(rec, 'hL', a, b), col(rec, 'wL', a, b)), L.HAND_GRIP, ':802', 'm', a);
  // body forward (+Z of the hips) for knee hyperextension
  const hq = quat(rec, 'hips', a, b);
  const fwd = new Float64Array((b - a) * 3);
  for (let i = 0; i < b - a; i++) fwd.set(M.quatRotate(hq, i * 4, 0, 0, 1), i * 3);
  for (const s of ['L', 'R']) {
    const kn = M.romAngles(vec(rec, `hip${s}`, a, b), vec(rec, `knee${s}`, a, b), vec(rec, `ankle${s}`, a, b), fwd);
    res(out, `knee${s}`, kn, `${L.ROM.flexMax} / hyper ${L.ROM.hyperMax}`, ':812', 'deg', a);
    out[`knee${s}`].hyper = kn.hyper.worst;
    res(out, `elbow${s}`, M.romAngles(vec(rec, `shoulder${s}`, a, b), vec(rec, `elbow${s}`, a, b), vec(rec, `wrist${s}`, a, b)), L.ROM.flexMax, ':812', 'deg', a);
    const eq = quat(rec, `elbow${s}`, a, b);
    const wq = quat(rec, `wrist${s}`, a, b);
    const flex = [];
    const side = [];
    for (let i = 0; i < b - a; i++) {
      const [fx, sz] = M.relFlexSide(eq, i * 4, wq, i * 4, WRIST_NEUTRAL[s]);
      flex.push(fx);
      side.push(sz);
    }
    res(out, `wristFlex${s}`, M.romLimit(flex, L.ROM.wristFlex), L.ROM.wristFlex, ':813', 'deg', a);
    res(out, `wristSide${s}`, M.romLimit(side, L.ROM.wristSide), L.ROM.wristSide, ':813', 'deg', a);
  }
  const tq = quat(rec, 'torso', a, b);
  const headq = quat(rec, 'headNode', a, b);
  const neck = [];
  const spine = [];
  for (let i = 0; i < b - a; i++) {
    neck.push((M.wrapPi(M.heading(headq, i * 4) - M.heading(tq, i * 4)) * 180) / Math.PI);
    spine.push((M.wrapPi(M.heading(tq, i * 4) - M.heading(hq, i * 4)) * 180) / Math.PI);
  }
  res(out, 'neckTwist', M.romLimit(neck, L.ROM.neckTwist), L.ROM.neckTwist, ':814', 'deg', a);
  res(out, 'spineTwist', M.romLimit(spine, L.ROM.spineTwist), L.ROM.spineTwist, ':815', 'deg', a);
  res(out, 'selfThighs', M.segmentDistance(vec(rec, 'hipL', a, b), vec(rec, 'kneeL', a, b), vec(rec, 'hipR', a, b), vec(rec, 'kneeR', a, b), 2 * L.LIMB_RADIUS.thigh, L.CLIP_SELF), L.CLIP_SELF, ':807', 'm', a);
  res(out, 'selfShanks', M.segmentDistance(vec(rec, 'kneeL', a, b), vec(rec, 'ankleL', a, b), vec(rec, 'kneeR', a, b), vec(rec, 'ankleR', a, b), 2 * L.LIMB_RADIUS.shank, L.CLIP_SELF), L.CLIP_SELF, ':807', 'm', a);
  // arms and the held weapon vs the torso capsule (hips -> neck); the upper arm from ARM_TORSO_SKIP down (the
  // shoulder joint itself sits in the torso capsule)
  const hipsV = vec(rec, 'hips', a, b);
  const neckV = vec(rec, 'neck', a, b);
  const R = L.LIMB_RADIUS;
  for (const s of ['L', 'R']) {
    const sh = vec(rec, `shoulder${s}`, a, b);
    const el = vec(rec, `elbow${s}`, a, b);
    res(out, `selfUpperArm${s}`, M.segmentDistance(lerpS(sh, el, L.ARM_TORSO_SKIP), el, hipsV, neckV, R.upperArm + R.torso, L.CLIP_SELF), L.CLIP_SELF, ':807', 'm', a);
    res(out, `selfForearm${s}`, M.segmentDistance(el, vec(rec, `wrist${s}`, a, b), hipsV, neckV, R.forearm + R.torso, L.CLIP_SELF), L.CLIP_SELF, ':807', 'm', a);
  }
  res(out, 'selfWeapon', M.segmentDistance(vec(rec, 'grip', a, b), vec(rec, 'muz', a, b), hipsV, neckV, R.weapon + R.torso, L.CLIP_SELF), L.CLIP_SELF, ':807', 'm', a);
  if (balanceFrom >= 0 && balanceFrom < b) {
    const c0 = Math.max(a, balanceFrom);
    const com = [];
    const feet = [];
    const con = [];
    const P = (n, f) => [rec.data[f * K + IDX[`${n}.x`]], rec.data[f * K + IDX[`${n}.y`]], rec.data[f * K + IDX[`${n}.z`]]];
    for (let f = c0; f < b; f++) {
      const body = {};
      for (const n of ['hips', 'neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR']) body[n] = P(n, f);
      body.head = P('headNode', f);
      const cm = M.centerOfMass(body);
      com.push(cm[0], cm[2]);
      feet.push(...['L', 'R'].flatMap((s) => [rec.data[f * K + IDX[`${s}.x`]], rec.data[f * K + IDX[`${s}.z`]], rec.data[f * K + IDX[`${s}.yaw`]]]));
      con.push(rec.data[f * K + IDX['L.contact']], rec.data[f * K + IDX['R.contact']]);
    }
    res(out, 'balance', M.balanceMargin(com, feet, con, FOOT), L.BALANCE_MARGIN, ':818', 'm', c0);
  }
}

/** D2 / D5 steady-state metrics over frames a..b (pelvis and camera relative to the smoothed capsule, detrended). */
function steady(rec, hz, out, a, b, band, lateral, cap, surface) {
  // (smoothed over the whole record, then cut: a window cut at the edges would bias a ramp)
  const capY = M.smooth(col(rec, 'cap.y'), Math.round(hz * 0.5)).slice(a, b);
  const pelY = sub(col(rec, 'hips.y', a, b), capY);
  const headY = sub(col(rec, 'headNode.y', a, b), capY);
  const camY = sub(col(rec, 'cam.y', a, b), capY);
  const strikes = or(rise(col(rec, 'L.landed', a, b)), rise(col(rec, 'R.landed', a, b)));
  const ps = M.pelvisPerStride(pelY, strikes, L.PELVIS_P2P[band]);
  res(out, 'pelvisP2P', { ...ps, extra: { band, steps: ps.steps, badSteps: ps.badSteps, firstBad: ps.firstBad >= 0 ? ps.firstBad + a : -1 } }, L.PELVIS_P2P[band], ':1253', 'm', a);
  const hq = quat(rec, 'headNode', a, b);
  const pitch = [];
  const roll = [];
  for (let i = 0; i < b - a; i++) {
    const [p, r] = M.pitchRoll(hq, i * 4);
    pitch.push(p);
    roll.push(r);
  }
  const hv = M.headVsPelvis(headY, pelY, pitch, roll);
  res(out, 'headTravel', { ...hv, extra: { pelvis: hv.pelvis } }, 'pelvis p2p', ':1254 / :1275', 'm', a);
  res(out, 'headPitch', hv.pitch, L.HEAD_ANGLE_P2P, ':1254', 'deg', a);
  res(out, 'headRoll', hv.roll, L.HEAD_ANGLE_P2P, ':1254', 'deg', a);
  if (lateral) res(out, 'lateralSway', M.lateralSway(vec(rec, 'hips', a, b), vec(rec, 'cap', a, b), col(rec, 'yaw', a, b), L.WALK_SWAY), L.WALK_SWAY, ':1255', 'm', a);
  // camera: high-passed over two steps (a slow framing ease, e.g. the sprint framing, is not an oscillation)
  const si = [];
  for (let i = 0, last = -1; i < strikes.length; i++) if (strikes[i]) (last >= 0 && si.push(i - last), (last = i));
  const win = si.length ? 2 * median(si) : Math.round(hz * 0.6);
  const camHP = sub(camY, M.smooth(camY, win));
  res(out, 'cameraOsc', M.cameraOsc(camHP.slice(win >> 1, camHP.length - (win >> 1))), L.CAMERA_P2P, ':1256', 'm', a + (win >> 1));
  const sp = col(rec, 'speed', a, b);
  const target = median(sp);
  out.speed = { value: target, cap };
  if (surface !== 'flat') res(out, 'stairsPelvisDrop', M.stairsPelvisDrop(col(rec, 'hips.y', a, b), L.pelvisJumpLimit(cap, hz)), L.pelvisJumpLimit(cap, hz), ':1279', 'm', a);
  return target;
}

/**
 * Root overshoot from the input frame `a` through the stop (the acceleration included) against the commanded gear
 * cap `cap` (the controller has no slope speed factor; its per-frame motion target `tgt` is recorded for reference:
 * the driver's stride modulation runs about 2.5% either side of it, inside the cap); weapon + kit settle after the
 * release (stop..end).
 */
function stopMetrics(rec, hz, out, a, stop, end, cap) {
  const yaw = col(rec, 'yaw', stop - 1, stop)[0];
  const ro = M.rootOvershoot(col(rec, 'speed', a, end), cap, vec(rec, 'fix', a, end), 0, stop - a, Math.sin(yaw), Math.cos(yaw));
  res(out, 'rootOvershoot', { ...ro, extra: { backstep: ro.backstep } }, `${L.OVERSHOOT_RATIO} x / backstep ${L.BACKSTEP}`, ':1271', 'ratio', a);
  // the held weapon's grip point in the chest (torso) frame: distance from where it rests
  const gp = vec(rec, 'grip', stop, end);
  const tp = vec(rec, 'torso', stop, end);
  const tq = quat(rec, 'torso', stop, end);
  const n = end - stop;
  if (!Number.isFinite(gp[0])) return;
  const rel = [];
  for (let i = 0; i < n; i++) {
    const q = [-tq[i * 4], -tq[i * 4 + 1], -tq[i * 4 + 2], tq[i * 4 + 3]];
    rel.push(M.quatRotate(q, 0, gp[i * 3] - tp[i * 3], gp[i * 3 + 1] - tp[i * 3 + 1], gp[i * 3 + 2] - tp[i * 3 + 2]));
  }
  // rest = a line fitted per axis over the last half (breathing drifts the grip slowly in the chest frame: it is
  // the rest moving, not sway), extrapolated back over the settle
  const h0 = Math.floor(n * 0.5);
  const fit = [0, 1, 2].map((k) => {
    const ys = rel.slice(h0).map((v) => v[k]);
    const r = M.detrend(ys);
    const b0 = ys[0] - r[0];
    const slope = ys.length > 1 ? ys[1] - r[1] - b0 : 0;
    return (i) => b0 + slope * (i - h0);
  });
  const d = rel.map((v, i) => Math.sqrt((v[0] - fit[0](i)) ** 2 + (v[1] - fit[1](i)) ** 2 + (v[2] - fit[2](i)) ** 2));
  const st = M.settleTime(d, 0, 1 / hz, L.SETTLE_TIME, L.SETTLE_EPS, 0, Math.round(L.BREATH_FILTER_S * hz));
  res(out, 'weaponSettle', { ...st, extra: { second: st.second } }, L.SETTLE_TIME, ':1257', 's', stop);
}

/** Slopes / stairs: the steady window starts one stride (two heel strikes) after the capsule starts climbing. */
function climbStart(rec, hz, start, stop) {
  const cy = col(rec, 'cap.y');
  const y0 = cy[start];
  let c = start;
  while (c < stop && cy[c] - y0 < 0.02) c++;
  const st = or(rise(col(rec, 'L.landed')), rise(col(rec, 'R.landed')));
  let k = 0;
  for (let i = c + 1; i < stop; i++) if (st[i] && ++k === 3) return i;
  return Math.min(stop, c + Math.round(hz * 0.8));
}

function analyze(sc, rec) {
  const out = {};
  const hz = sc.hz;
  const m = rec.m;
  if (sc.kind === 'gait') {
    const jl = L.pelvisJumpByGear(sc.stance, hz)[sc.gear - 1];
    common(rec, hz, out, 0, rec.n, jl, m.stop + Math.round(hz * 0.6));
    const band = L.gaitBand(sc.stance, sc.gear);
    const from = sc.surface === 'flat' ? m.steady : climbStart(rec, hz, m.start, m.stop);
    out.window = { from, to: m.stop };
    if (m.stop - from >= Math.round(hz * 0.3)) steady(rec, hz, out, from, m.stop, band, sc.stance === 'stand' && sc.gear <= 3, m.cap, sc.surface);
    else out.window.short = true;
    stopMetrics(rec, hz, out, m.start, m.stop, m.end, m.cap);
  } else if (sc.kind === 'tunnel') {
    common(rec, hz, out, 0, rec.n, L.pelvisJumpByGear('crouch', hz)[2], m.stop + Math.round(hz * 0.6));
    steady(rec, hz, out, m.steady, m.stop, 'crouch', false, m.cap, 'flat');
    stopMetrics(rec, hz, out, m.start, m.stop, m.end, m.cap);
  } else {
    const still = L.pelvisJumpLimit(0, hz);
    const moving = L.pelvisJumpByGear('stand', hz)[sc.kind === 'turn180' ? 3 : 2];
    common(rec, hz, out, 0, rec.n, ['turn180', 'vault', 'mantle', 'drop09', 'drop24', 'ladder'].includes(sc.kind) ? moving : still, sc.kind === 'idle' ? m.idle : -1);
    const dt = 1 / hz;
    if (sc.kind === 'stance') {
      // from the last frame before the press until crouchBlend is within 1e-4 of its target
      const cb = col(rec, 'crouchBlend');
      // crouchBlend is a sim-rate (60 Hz) signal: the time rounds up to the end of its sim step at 120 Hz
      res(out, 'crouchTime', M.reachTime(cb.slice(0, m.up), m.down - 1, dt, L.MIN_DURATION.crouch, 1, L.STANCE_DONE_TOL, 1 / 60), L.MIN_DURATION.crouch, ':824', 's');
      res(out, 'standTime', M.reachTime(cb, m.up - 1, dt, L.MIN_DURATION.stand, 0, L.STANCE_DONE_TOL, 1 / 60), L.MIN_DURATION.stand, ':825', 's');
    } else if (sc.kind === 'turn180') {
      const yaw = col(rec, 'yaw');
      const y0 = yaw[m.rev - 1];
      let done = false;
      const turning = yaw.map((v, i) => {
        if (i < m.rev || done) return 0;
        if (Math.abs(M.wrapPi(v - y0 - Math.PI)) < (10 * Math.PI) / 180) done = true;
        return done ? 0 : 1;
      });
      res(out, 'turn180Time', M.durationOf(turning, dt, L.MIN_DURATION.turn180), L.MIN_DURATION.turn180, ':826', 's');
    } else if (sc.kind === 'raise') {
      const r = col(rec, 'raise');
      // from the last frame before the ADS input until raise >= RAISE_DONE
      res(out, 'raiseTime', M.reachTime(r.slice(0, m.lower).map((v) => Math.min(v, L.RAISE_DONE)), m.raise - 1, dt, L.MIN_DURATION.raise, L.RAISE_DONE, 0), L.MIN_DURATION.raise, ':830', 's');
    } else if (sc.kind === 'swap') {
      res(out, 'swapTime', M.durationOf(col(rec, 'swapping'), dt, L.MIN_DURATION.swap), L.MIN_DURATION.swap, ':831', 's');
    } else if (sc.kind === 'vault' || sc.kind === 'mantle') {
      const tr = col(rec, 'traverse');
      const kind = rec.kinds.join('+') || 'none';
      const lim = sc.kind === 'mantle' ? L.MIN_DURATION.mantle : L.MIN_DURATION.vault;
      res(out, `${sc.kind}Time`, { ...M.durationOf(tr, dt, lim), extra: { move: kind, hint: m.hint } }, lim, ':827-828', 's');
    } else if (sc.kind === 'ladder') {
      const s = col(rec, 'ladderS', m.climb, m.end);
      const fin = [...s].filter(Number.isFinite);
      const rate = fin.length > 1 ? (fin[fin.length - 1] - fin[0]) / (fin.length * dt) : 0;
      const rung = rate > 0 ? 0.3 / rate : 0;
      const at = col(rec, 'attached');
      res(out, 'rungTime', { worst: rung, frame: m.climb, pass: rung >= L.MIN_DURATION.rung, extra: { attached: Math.max(...at) > 0 } }, L.MIN_DURATION.rung, ':829', 's');
    } else if (sc.kind === 'drop09' || sc.kind === 'drop24') {
      // A35: camera 0 or 1 damped dips, never a rebound; pelvis exactly 1 dip (D5.3 compression)
      const dc = M.landingDip(col(rec, 'cam.y'), m.land, 0);
      const dp = M.landingDip(col(rec, 'hips.y'), m.land, 1);
      res(out, 'landingDipCamera', { ...dc, extra: { dips: dc.dips } }, `0-${L.LANDING_DIPS} dip / ${L.LANDING_REBOUND}`, ':1256 / A35', 'm');
      res(out, 'landingDipPelvis', { ...dp, extra: { dips: dp.dips } }, `${L.LANDING_DIPS} dip / ${L.LANDING_REBOUND}`, ':1256 / A35', 'm');
      out.fell = { value: col(rec, 'cap.y', m.go, m.go + 1)[0] - col(rec, 'cap.y', m.land, m.land + 1)[0] };
    } else if (sc.kind === 'idle') {
      res(out, 'idleBreath', M.oscP2P(col(rec, 'headNode.y', m.idle, m.end), L.IDLE_BREATH), L.IDLE_BREATH, ':1257', 'm', m.idle);
      res(out, 'idleCamera', M.cameraOsc(col(rec, 'cam.y', m.idle, m.end)), L.CAMERA_P2P, ':1256', 'm', m.idle);
    }
  }
  return out;
}

// ---------------------------------------------------------------- run
const report = { started: new Date().toISOString(), quick: QUICK, footRef: 0, notMeasured: NOT_MEASURED, scenarios: [] };
const fails = [];
const ends = {};
try {
  // rest ankle height above the sole (the planner's ground) and the neutral grip: standing still on flat ground
  await G(() => {
    const t = window.__aa;
    t.stance(false, 3);
    t.tp(-26, -26, 0);
    t.begin();
    t.run(1.0, {});
  });
  {
    const r = await G(() => window.__aa.end());
    const buf = Buffer.from(r.b64, 'base64');
    const rec = { n: r.n, data: new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4) };
    const h = [];
    // neutral low-ready grip (the rig's grip convention offset): elbow-to-wrist rotation on the last idle frame
    for (const s of ['L', 'R']) WRIST_NEUTRAL[s] = M.relQuat(quat(rec, `elbow${s}`, rec.n - 1, rec.n), 0, quat(rec, `wrist${s}`, rec.n - 1, rec.n), 0);
    report.wristNeutral = WRIST_NEUTRAL;
    for (const s of ['L', 'R']) {
      const an = col(rec, s === 'L' ? 'ankleL.y' : 'ankleR.y');
      // the rig's ankle height above its sole (planner ground): float / sink are then read against the world ray
      const gy = col(rec, `${s}.y`);
      const c = col(rec, `${s}.contact`);
      for (let i = 0; i < rec.n; i++) if (c[i]) h.push(an[i] - gy[i]);
    }
    FOOT_REF = median(h);
    report.footRef = FOOT_REF;
    // foot axes in the ankle frame: world up and the planner's foot yaw on the last rest frame, by the inverse ankle quat
    for (const s of ['L', 'R']) {
      const q = quat(rec, s === 'L' ? 'ankleL' : 'ankleR', rec.n - 1, rec.n);
      const inv = [-q[0], -q[1], -q[2], q[3]];
      const yaw = col(rec, `${s}.yaw`, rec.n - 1, rec.n)[0];
      SOLE[s] = { fwd: M.quatRotate(inv, 0, Math.sin(yaw), 0, Math.cos(yaw)), up: M.quatRotate(inv, 0, 0, 1, 0) };
    }
    report.sole = SOLE;
    const fp = await G(() => window.__app.current.player.rig.p.foot);
    FOOT = { len: fp.len, width: fp.w };
    report.foot = FOOT;
    const sp = (s) => M.solePoints(SOLE[s].fwd, SOLE[s].up, FOOT.len, L.FOOT_BACK, FOOT_REF);
    await G(([l, r]) => window.__aa.setSole(l, r), [sp('L'), sp('R')]);
  }
  for (const sc of scenarios) {
    const t1 = Date.now();
    const rec = await record(sc);
    if ((sc.kind === 'vault' || sc.kind === 'mantle') && !rec.kinds.includes(sc.kind))
      throw new Error(`${sc.name} @${sc.hz}: expected traversal '${sc.kind}' never recorded (hint ${rec.m.hint}, kinds ${rec.kinds.join('+') || 'none'})`);
    const metrics = analyze(sc, rec);
    if (process.env.DUMP) {
      mkdirSync(`${OUT}/raw`, { recursive: true });
      writeFileSync(`${OUT}/raw/${sc.name}-${sc.hz}.bin`, Buffer.from(rec.data.buffer, rec.data.byteOffset, rec.data.byteLength));
      writeFileSync(`${OUT}/raw/names.json`, JSON.stringify({ names, markers: { ...(JSON.parse(existsSync(`${OUT}/raw/names.json`) ? readFileSync(`${OUT}/raw/names.json`, 'utf8') : '{}').markers ?? {}), [`${sc.name}-${sc.hz}`]: rec.m } }));
    }
    if (sc.kind === 'gait' && sc.surface === 'flat') {
      const f = rec.n - 1;
      const v = (n) => rec.data[f * K + IDX[n]];
      ends[`${sc.name}@${sc.hz}`] = { x: v('fix.x'), z: v('fix.z'), yaw: v('yaw'), lx: v('L.x'), lz: v('L.z'), rx: v('R.x'), rz: v('R.z'), cx: v('cam.x'), cy: v('cam.y'), cz: v('cam.z') };
    }
    const entry = { name: sc.name, hz: sc.hz, kind: sc.kind, frames: rec.n, ms: Date.now() - t1, metrics };
    report.scenarios.push(entry);
    for (const [k, r] of Object.entries(metrics))
      if (r && r.pass === false) fails.push({ scenario: sc.name, hz: sc.hz, metric: k, value: r.worst, limit: r.limit, frame: r.frame, unit: r.unit });
  }
  // :854 frame-rate parity: the same flat run at 60 and 120 Hz ends in the same place
  for (const [k, a] of Object.entries(ends)) {
    if (!k.endsWith('@60')) continue;
    const b = ends[k.replace('@60', '@120')];
    if (!b) continue;
    const name = k.replace('@60', '');
    const P = L.PARITY;
    const d = (p, q) => Math.hypot(a[p] - b[p], a[q] - b[q]);
    const pm = {
      parityRoot: { worst: d('x', 'z'), frame: -1, limit: P.root, pass: d('x', 'z') <= P.root, line: ':854', unit: 'm' },
      parityYaw: { worst: Math.abs(M.wrapPi(a.yaw - b.yaw)), frame: -1, limit: P.yaw, pass: Math.abs(M.wrapPi(a.yaw - b.yaw)) <= P.yaw, line: ':854', unit: 'rad' },
      parityFeet: { worst: Math.max(d('lx', 'lz'), d('rx', 'rz')), frame: -1, limit: P.feet, pass: Math.max(d('lx', 'lz'), d('rx', 'rz')) <= P.feet, line: ':854', unit: 'm' },
      parityCamH: { worst: d('cx', 'cz'), frame: -1, limit: P.camH, pass: d('cx', 'cz') <= P.camH, line: ':854', unit: 'm' },
      parityCamV: { worst: Math.abs(a.cy - b.cy), frame: -1, limit: P.camV, pass: Math.abs(a.cy - b.cy) <= P.camV, line: ':854', unit: 'm' },
    };
    report.scenarios.push({ name: `${name}-parity`, hz: '60v120', kind: 'parity', metrics: pm });
    for (const [mk, r] of Object.entries(pm)) if (!r.pass) fails.push({ scenario: `${name}-parity`, hz: '60v120', metric: mk, value: r.worst, limit: r.limit, frame: -1, unit: r.unit });
  }
  if (SHOTS) {
    mkdirSync(OUT, { recursive: true });
    const seen = new Set();
    for (const f of fails) {
      const sc = scenarios.find((s) => s.name === f.scenario && s.hz === f.hz);
      if (!sc || f.frame < 0 || seen.has(`${sc.name}@${sc.hz}`)) continue;
      seen.add(`${sc.name}@${sc.hz}`);
      await drive(sc, f.frame + 1);
      await G(() => window.__aa.end());
      await G(() => window.__aa.render());
      await page.screenshot({ path: `${OUT}/${sc.name}-${sc.hz}-${f.metric}-f${f.frame}.png` });
    }
  }
} catch (e) {
  console.error('anim-audit harness error:', e?.stack ?? String(e));
  await browser.close();
  server?.kill();
  process.exit(2);
}
await browser.close();
server?.kill();

// ---------------------------------------------------------------- output
mkdirSync(OUT, { recursive: true });
report.wallSeconds = (Date.now() - T0) / 1000;
writeFileSync(`${OUT}/local.json`, JSON.stringify(report, null, 1));
const fmt = (v, unit) => (typeof v !== 'number' ? String(v) : unit === 'm' ? `${(v * 100).toFixed(2)} cm` : unit === 'deg' ? `${v.toFixed(1)} deg` : unit === 's' ? `${v.toFixed(3)} s` : v.toFixed(3));
const fmtL = (v, unit) => (typeof v === 'number' ? fmt(v, unit) : String(v));
writeFileSync(
  `${OUT}/fails.txt`,
  Object.entries(NOT_MEASURED).map(([k, v]) => `# ${k} (body / weapon vs world, :806-807): ${v}\n`).join('') +
    fails.map((f) => `${f.scenario}\t${f.hz}\t${f.metric}\t${fmt(f.value, f.unit)}\tlimit ${fmtL(f.limit, f.unit)}\tframe ${f.frame}`).join('\n') +
    '\n',
);
const cm = (r) => (r ? `${(r.worst * 100).toFixed(2)}${r.pass ? '' : '!'}` : '-');
console.log('\nscenario            Hz   speed  pelvisP2P  head   sway   cam    jump   slideMax  settle  fails');
for (const s of report.scenarios) {
  if (s.kind === 'parity') continue;
  const x = s.metrics;
  const nf = Object.values(x).filter((r) => r && r.pass === false).length;
  const slide = Math.max(x.footSlideL?.worst ?? 0, x.footSlideR?.worst ?? 0);
  console.log(
    `${s.name.padEnd(19)} ${String(s.hz).padEnd(4)} ${x.speed ? x.speed.value.toFixed(2).padStart(5) : '    -'}  ${cm(x.pelvisP2P).padStart(9)}  ${cm(x.headTravel).padStart(5)}  ${cm(x.lateralSway).padStart(5)}  ${cm(x.cameraOsc).padStart(5)}  ${cm(x.pelvisJump).padStart(5)}  ${(slide * 100).toFixed(2).padStart(8)}  ${x.weaponSettle ? x.weaponSettle.worst.toFixed(2).padStart(6) : '     -'}  ${nf}`,
  );
}
const byMetric = {};
for (const f of fails) byMetric[f.metric] = (byMetric[f.metric] ?? 0) + 1;
console.log(`\n(cm; ! = fail) ${report.scenarios.length} scenario rows, ${fails.length} fails`);
console.log('fails by metric: ' + (Object.entries(byMetric).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'));
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
if (real.length) console.log('console problems:\n' + real.slice(0, 10).join('\n'));
console.log(`wrote ${OUT}/local.json, ${OUT}/fails.txt`);
console.log(`wall time ${report.wallSeconds.toFixed(1)} s${QUICK ? ' (quick)' : ''}`);
process.exit(STRICT && fails.length ? 1 : 0);
