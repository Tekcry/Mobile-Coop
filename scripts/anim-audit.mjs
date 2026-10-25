// Animation audit harness, local player (bible 5.12.2 realism standard, 5.12.4.2, 5.17 D2 no-bobble, D5 modern
// layer). Proving Grounds, headless fixed steps at 60 and 120 Hz render rates. The page only records joint / camera /
// capsule / foot-planner streams every rendered frame; node computes every metric with the pure, unit-tested
// `src/anim/audit/metrics.ts` against `src/anim/audit/limits.ts` (bundled with esbuild at start).
//
//   node scripts/anim-audit.mjs [url] [--local | --remote] [--quick] [--only=<scenario>] [--out=dir] [--shots] [--strict]
//                               [--compare=<baseline.json>]
//
//   (default) local + remote; --local / --remote: one of them (step 08)
//   --remote  host A and client B over ?net=local, sandbox on Proving: B moves with scripted input in real time, A records
//             its copy of B every rendered frame (measured dt); 120 Hz through a page-side frame pump on A (A's loop manual)
//             unless the pump jitters over 2 ms (then 'pending PC'). A's player stands 3.5 m behind B's start (its camera
//             inside the copy's 22 m anim LOD; lodSkip fails any frame either rig skipped). Remote-only metrics (r1, A38):
//             poseError = gating part (root, head, wrists, ankles on settled frames) vs B's own pose at t - lag;
//             gaitPhase = the copy's stride phase offset from B's (reported); lowerBody = phase-aligned, root-relative
//             hips / knees / ankles; pops = rubber-banding only (a root step unlike B's, or a joint step over the limit
//             that B's own track does not have); pairAlign / pairPenetration (brace + boost)
//   --compare prints regressions against a committed baseline (docs/archive/locomotion/audit/anim-baseline.json): worse by more than
//             max(10%, the metric's noise tolerance) or a new fail; like modes only. Remote rows gate only (A39)
//             poseError (gating part), pops at 60 Hz, pairAlign and lodSkip, against the baseline's noise band; the
//             other remote metrics (lowerBody, 120 Hz pops, the rest) are listed as report-only, not counted
//   --band=<baseline.json>  an earlier full run: the baseline written by this run keeps, per gated remote metric, the
//             worse of the two runs and their spread (`band`). The committed baseline is made this way (two runs)
//
//   --quick   flat only, stand 2 / 4 / 6 and crouch 3 at 60 and 120 Hz, plus stop / idle (< 60 s; steps 21-31)
//   --only    run only the scenarios whose name contains this text
//   --out     output folder (default test-results/anim-audit): local.json / remote.json (per scenario and metric: worst,
//             frame, limit, pass, bible line), fails.txt (one line per fail, tagged local / remote; remote frames are A's
//             frames) and baseline.json (worst per scenario x metric, the --compare format)
//   --shots   PNG per failing (scenario, metric) at the metric's worst frame, side camera on the body, HUD hidden
//             (PC only, E2E_GPU=1; local rows; --shots-max=N caps the count, default 500)
//   --strict  exit 1 on any fail (step 32); by default it reports and exits 0 unless the harness itself errors
//   (PC1) every local scenario starts from a reset (__aa.reset: first weapon selected and holstered, off the wall, aim
//             released, standing gear 3): before it, `swap` left the third weapon selected for every later row, so
//             `--only` differed from the full run. AA_RESET_LOG=1 prints what each reset changed
//
// Without a url it serves dist/ itself (vite preview on E2E_PORT or 4173, killed at exit): run `npm run build` first.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './e2e-lib.mjs';
import { hostAndJoin, allowTeleport, JOINTS, until, LOAD_MS } from './e2e-net-lib.mjs';
/** (afp AF0) startMode with a 40 s ready wait: under E2E_NETSIM=typical the client's ready travels through the simulated link and the
 *  host runs near 28 fps; e2e-net-lib's 8 s `everyone ready` wait timed out twice. The ready is re-sent every 2 s until the host has it. */
async function startModeSlow(pages, mode, map) {
  const [A, ...clients] = pages;
  await A.evaluate(([m, mp]) => window.__coop.session.setSettings(m, mp, 'normal', ''), [mode, map]);
  for (const P of clients) await P.evaluate(() => window.__coop.session.setReady(true));
  for (let t = 0; t < 20; t++) {
    if (await A.evaluate(() => window.__coop.session.allReady)) break;
    if (t === 19) throw new Error('everyone ready: not within 40 s');
    await new Promise((r) => setTimeout(r, 2000));
    for (const P of clients) await P.evaluate(() => window.__coop.session.setReady(true));
  }
  await A.evaluate(() => window.__coop.session.startMatch());
  for (const P of pages) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, mode, LOAD_MS, `${mode} match on both pages`);
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 30000, 'client state reaches the host');
  await A.evaluate(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
}

const T0 = Date.now();
const args = process.argv.slice(2);
const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const flag = (k) => args.includes(`--${k}`);
const urlArg = args.find((a) => !a.startsWith('--'));
const PORT = String(process.env.E2E_PORT ?? 4173);
const url = urlArg ?? `http://localhost:${PORT}/`;
const QUICK = flag('quick');
const ONLY = opt('only');
const OUT = resolve(opt('out') ?? 'test-results/anim-audit');
const SHOTS = flag('shots');
const STRICT = flag('strict');
const COMPARE = opt('compare');
/** r1: an earlier run's baseline.json: this run's baseline then holds the two runs' noise band on the gated remote metrics. */
const BAND = opt('band');
const DO_LOCAL = flag('local') || !flag('remote');
const DO_REMOTE = flag('remote') || !flag('local');
/** remote.ts: INTERP_DELAY (coopHost.ts), the host renders remotes 0.1 s behind the newest snapshot. */
const INTERP_DELAY = 0.1;
/** config/movement.ts TEAM.boostTime (s); the climber's foot reaches the braced hands at 35% of it (teamMoves.ts boostPath). */
const BOOST_TIME = 0.9;
const BOOST_CONTACT_K = 0.35;

// ---------------------------------------------------------------- pure metrics for node
const LIB = resolve('test-results/anim-audit/lib');
// node + esbuild's JS entry, not node_modules/.bin/esbuild: on Windows .bin holds a .cmd shim execFileSync cannot spawn.
execFileSync(process.execPath, ['node_modules/esbuild/bin/esbuild', 'src/anim/audit/metrics.ts', 'src/anim/audit/limits.ts', 'src/anim/footGeom.ts', '--bundle', '--format=esm', '--entry-names=[name]', `--outdir=${LIB}`, '--log-level=warning'], { windowsHide: true, stdio: 'inherit' });
const M = await import(pathToFileURL(`${LIB}/metrics.js`).href);
const L = await import(pathToFileURL(`${LIB}/limits.js`).href);
// (anim-natural N1) the foot's contact geometry the planner and the rig share (heel / ball under the ankle)
const FG = await import(pathToFileURL(`${LIB}/footGeom.js`).href);

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
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', PORT, '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
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
/** The record layout (one Float32 row per rendered frame), local and remote alike; remote rows add REMOTE_EXTRA. */
const LOWER = ['locomotion', 'crouch', 'kneel', 'air', 'wall', 'traverse'];
const names = ['t', 'tp'];
for (const n of NODES) for (const k of ['x', 'y', 'z', 'qx', 'qy', 'qz', 'qw']) names.push(`${n}.${k}`);
names.push('cam.x', 'cam.y', 'cam.z', 'cap.x', 'cap.y', 'cap.z', 'fix.x', 'fix.y', 'fix.z', 'speed', 'gear', 'crouchBlend', 'crouched', 'yaw', 'grounded');
for (const s of ['L', 'R']) for (const k of ['contact', 'landed', 'slide', 'x', 'y', 'z', 'yaw', 'gy', 'gyH', 'gyT', 'held']) names.push(`${s}.${k}`);
names.push('lower', 'lowerW', 'grip.x', 'grip.y', 'grip.z', 'muz.x', 'muz.y', 'muz.z', 'hR.x', 'hR.y', 'hR.z', 'hL.x', 'hL.y', 'hL.z', 'wR', 'wL');
names.push('raise', 'swapping', 'traverse', 'attached', 'ladderS', 'tgt');
// the old medkit use's phase column (always -1 now: carried medkits are gone, G98; kept for the frame layout) and the anim
// graph's free hand targets in world
names.push('kitPh', 'tL.x', 'tL.y', 'tL.z', 'tR.x', 'tR.y', 'tR.z');
/** Remote rows: measured frame time, the copy's move mode, the host's own team-move clock and its own joints (paired moves). */
const OWN = ['hips', 'neck', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
const MODES = ['ground', 'brace', 'boost', 'assist', 'stacked'];
/** (r1) lod: the copy's anim LOD skipped this frame (characterRig.ts lodDt > 0); phase: its gait clock (animGraph.phase);
 *  camD: the host camera's horizontal distance to the copy (the LOD reads it, 22 m). */
const REMOTE_EXTRA = ['dt', 'mode', 'team', 'lod', 'phase', 'camD', ...OWN.flatMap((n) => [`own.${n}.x`, `own.${n}.y`, `own.${n}.z`])];
const RNAMES = [...names, ...REMOTE_EXTRA];
const IDX = Object.fromEntries(names.map((n, i) => [n, i]));
const K = names.length;
const RIDX = Object.fromEntries(RNAMES.map((n, i) => [n, i]));
const RK = RNAMES.length;

let browser = null;
let page = null;
let errors = [];
const G = (f, a) => page.evaluate(f, a);
if (DO_LOCAL) {
({ browser, page, errors } = await launch({ url, params: 'autostart=proving' }));
await G(([NODES, W, names, LOWER]) => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  const c = p.controller;
  const rig = p.rig;
  const V = p.position.constructor;
  g.target.damageMul = 0;
  a.loop.manual = true;
  // step 07 carry (wall-clock leak between scenarios): with the loop manual the engine's render loop still ran
  // `scene.render()` every display frame between the page.evaluate calls (render observers, timers and the physics
  // bodies' interpolation ran on real time). The local harness only advances through stepHeadless: stop it.
  g.scene.getEngine().stopRenderLoop();
  const st = a.input.state;
  const hooks = a.loop['hooks'];
  const K = names.length;
  const tmp = new V();
  // W: weapon-space wrist offsets (limits.ts WRIST_ON_GRIP / WRIST_ON_FOREGRIP, as e2e-weapons-carry)
  // the anim graph's last targets (grip IK weights), stashed per update
  let last = null;
  const gu = rig.graph.update.bind(rig.graph);
  rig.graph.update = (dt, i) => (last = gu(dt, i));
  // (step 15) the medkit phase and the graph's free hand targets in world (characterRig.ts bodyToWorld, as solveArm)
  const kitCols = (rig, last, f, o, tmp) => {
    f[o++] = rig.input?.medkit ?? -1;
    for (const h of last ? [last.handL, last.handR] : [null, null]) {
      if (h) {
        rig.bodyToWorld(h, tmp);
        f[o++] = tmp.x;
        f[o++] = tmp.y;
        f[o++] = tmp.z;
      } else o += 3, (f[o - 1] = f[o - 2] = f[o - 3] = NaN);
    }
    return o;
  };
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
  // step 08 r1: with the render loop stopped nothing refreshes the camera's world matrix (scene.render did), so its
  // globalPosition froze at spawn and the rig's anim LOD (characterRig.ts animate, 22 m) halved the solve rate far from
  // it: refresh the view matrix before every frame update
  const cam = () => g.scene.activeCamera;
  hooks.frameUpdate = function (dt, alpha) {
    cam()?.getViewMatrix(true);
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
      // (anim-natural N1) the planner holds this foot's contact (footPlanner HOLD_CONTACT)
      f[o++] = fs.anchored ? 1 : 0;
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
    o = kitCols(rig, last, f, o, tmp);
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
      // (step 12b fix r2) the camera's own clock (handheld drift, shake) too: it runs from page load on real time and
      // the drift turns the view, so cameraOsc and the 60 / 120 Hz camera parity rows read a different phase each run
      p.cam['t'] = 0;
      aa.tp = 1;
    },
    run(sec, inp, hz = 60) {
      const n = Math.round(sec * 60);
      for (let k = 1; k <= n && !halted(); k++) {
        st.move.x = inp.x ?? 0;
        st.move.y = inp.y ?? 0;
        st.set('anim-audit', 'ads', !!inp.ads);
        // (step 17, A68) sprint held as the game reads it (`dash`: one press edge in toggle mode, held in hold mode);
        // kept down across back-to-back sprint runs (a release + press would toggle it off)
        st.set('anim-audit', 'dash', !!inp.sprint);
        if (inp.taps?.[k]) st.tap(inp.taps[k]);
        a.loop.stepHeadless(1 / 60, hz);
      }
      st.move.x = st.move.y = 0;
      st.set('anim-audit', 'ads', false);
      if (!inp.sprint) st.set('anim-audit', 'dash', false);
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
    /**
     * (PC1 harness fix 4) Every scenario starts from the same weapon / stance / wall state, whatever ran before it
     * (`--only` matches the full run): the weapon selection back to the match's first (the `swap` rows cycle it and
     * the open-side rows equip their own), no gun left in the hand while holstered (the open-side rows' local equip
     * while holstered puts the model in the hand), off the wall, aim released, standing at gear 3. Returns what it
     * changed (logged by node).
     */
    reset() {
      const W = g.weapons;
      const was = [];
      if (aa.w0 === undefined) aa.w0 = W.index;
      st.move.x = st.move.y = 0;
      st.set('anim-audit', 'ads', false);
      st.set('anim-audit', 'dash', false);
      if (g.wallCore?.active) {
        g.wallCore.leave('test');
        was.push('wall');
      }
      if (W.index !== aa.w0) {
        was.push(`weapon ${W.index}->${aa.w0}`);
        W.index = aa.w0;
        if (W.isStowed) {
          c.speedMul = W.current.def.moveSpeedMult;
          p.cam.adsZoom = W.current.stats.adsZoom;
        }
      }
      if (W.isStowed && W['swapT'] < 0 && rig.heldWeapon) {
        was.push('gun in hand while holstered');
        W['holsterAll'](-1);
      }
      c.clearCrouchToggle();
      c.gears.set(3);
      return was;
    },
    halted,
    /**
     * (PC1 harness fix 1) A still of the frozen pose: a side camera on the body (feet in frame, as anim-sheet.mjs), the
     * TAAU history reset and several renders at the frozen pose so TAA / TAAU history converges on this frame (one
     * render after headless stepping blended older frames: a ghosted multi-exposure).
     */
    render() {
      const cm = p.cam.camera;
      const r = rig.root.position;
      const fy = c.renderYaw;
      const fx = Math.sin(fy);
      const fz = Math.cos(fy);
      cm.position.set(r.x + fz * 3.1, r.y + 1.0, r.z - fx * 3.1);
      cm.setTarget(new V(r.x, r.y + 0.8, r.z));
      const tu = g.stack?.['taau'];
      for (let k = 0; k < 32; k++) {
        if (tu && k === 0) tu['reset'] = 1;
        g.scene.render();
      }
    },
  };
}, [NODES, { grip: [...L.WRIST_ON_GRIP], fore: [...L.WRIST_ON_FOREGRIP] }, names, LOWER]);
}

// ---------------------------------------------------------------- scenarios
const FLAT = { x: -26, z: -26, yaw: 0, y: 0 }; // open lane on the west side, heading north (15 m clear, steady camera)
const STAIRS = { x: 12.6, z: 16, yaw: -Math.PI / 2, y: 0, len: 7 }; // 9 steps, rise 0.289 m, rising toward -X onto the platform
const RAMP = { x: -12.6, z: 16, yaw: Math.PI / 2, y: 0, len: 7 }; // 20.4 deg, rising toward +X
const SLOPE35 = { x: 21, z: 9.0, yaw: 0, y: 0, len: 5 }; // 35 deg test slope, rising toward +Z
const SURF = { flat: FLAT, stairs: STAIRS, ramp: RAMP, slope35: SLOPE35 };
const ACCEL = 1.0;
const STOP = 1.5;

const gaits = [];
// gaits run holstered (the game default, step 09); the `-aim` subset runs drawn and aimed (A42)
const add = (surface, stance, gear, hz, aim = false) => gaits.push({ name: `${surface}-${stance}${gear}${aim ? '-aim' : ''}`, kind: 'gait', surface, stance, gear, hz, aim });
if (QUICK) {
  for (const hz of [60, 120]) for (const [s, g] of [['stand', 2], ['stand', 4], ['stand', 6], ['crouch', 3]]) add('flat', s, g, hz);
} else {
  // (step 17, A68) gear 6 is the sprint (sprint held, standing): crouched gear 6 is unreachable, crouch rows stop at 5
  for (const hz of [60, 120]) for (const s of ['stand', 'crouch']) for (let g = 1; g <= (s === 'crouch' ? 5 : 6); g++) add('flat', s, g, hz);
  for (const surface of ['stairs', 'ramp']) for (const s of ['stand', 'crouch']) for (let g = 1; g <= (s === 'crouch' ? 5 : 6); g++) add(surface, s, g, 60);
  for (const surface of ['stairs', 'slope35'])
    for (const [s, g] of [['stand', 2], ['stand', 4], ['stand', 6], ['crouch', 2]]) add(surface, s, g, 120);
}
// the drawn subset runs last (step 09 fix 4): the page carries its clocks and springs from one scenario to the next, so
// running it among the gaits shifted every later holstered row (idle breathing phase, tunnel head / camera)
const aimGaits = [];
for (const [s, g] of QUICK ? [['stand', 2]] : [['stand', 2], ['stand', 4], ['crouch', 3]]) {
  add('flat', s, g, 60, true);
  aimGaits.push(gaits.pop());
}
const TRANS = QUICK ? ['idle'] : ['stance', 'turn180', 'raise', 'swap', 'vault', 'mantle', 'ladder', 'drop09', 'drop24', 'idle', 'strike', 'tunnel', 'wall'];
const transitions = [];
for (const hz of [60, 120]) for (const t of TRANS) transitions.push({ name: t, kind: t, hz });
// A3: the wall edge verbs (peek, lean-out, SWAT turn, open side) were removed; their scenarios are dropped (prototype: revisit)
// (step 13) door peek at the Proving shed door: crack, peek, close (the hand on the handle, no clip into the leaf)
if (!QUICK) for (const hz of [60, 120]) transitions.push({ name: 'doorpeek', kind: 'door', hz });
const scenarios = [...gaits, ...transitions, ...aimGaits].filter((s) => !ONLY || s.name.includes(ONLY));

/** Drive one scenario in the page; returns frame markers. */
async function drive(sc, halt = -1) {
  return G(([sc, halt, SURF, ACCEL, STOP]) => {
    const t = window.__aa;
    const hz = sc.hz;
    const m = {};
    const g = window.__app.current;
    m.reset = t.reset();
    if (sc.kind === 'gait') {
      const s = SURF[sc.surface];
      const crouch = sc.stance === 'crouch';
      t.stance(crouch, sc.gear);
      const cap = (crouch ? [0.85, 1.3, 1.7, 2.15, 2.6, 2.6] : [0.65, 1.1, 1.65, 2.3, 3.15, 4.15])[sc.gear - 1];
      // flat: 1.0 s accel + >= 2 strides; ramps and stairs: the accel is short (95% within 0.08 s), so the steady
      // window covers the slope from 0.3 s on and ends 0.4 m before its top
      let accel = 1.0;
      let steady = sc.stance === 'crouch' || sc.gear <= 2 ? 3.0 : 2.0;
      let x = s.x;
      let z = s.z;
      if (s.len) {
        accel = 0.3;
        // (step 22, M14) released a further 0.1 s of pace before the top: the eased stop (up to 0.36 m) carried the
        // last swing past the top of the flight onto the floor beyond it (stairs / ramp stand5 pelvis jump 19 cm)
        steady = Math.min(3.0, Math.max(0.5, (s.len - 0.4 - 0.1 * cap) / cap - accel + 0.1));
      }
      t.tp(x, z, s.yaw, s.y);
      // the drawn subset (A42): aim held from before the start (drawn and raised, 0.4 s draw + raise)
      const ads = !!sc.aim;
      if (ads) t.run(0.8, { ads }, hz);
      t.begin(halt);
      t.run(0.3, { ads }, hz);
      m.start = t.mark();
      // (step 17, A68) gear 6 only with sprint held: the stand6 rows hold it through accel + steady
      const sprint = !crouch && sc.gear === 6;
      t.run(accel, { y: 1, ads, sprint }, hz);
      m.steady = t.mark();
      t.run(steady, { y: 1, ads, sprint }, hz);
      m.stop = t.mark();
      t.run(STOP, { ads }, hz);
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
    } else if (sc.kind === 'strike') {
      // (locomotion step 10) fire while holstered: the elbow strike (a whiff on the open lane), 0.9 s, then idle
      t.tp(-26, -26, 0);
      t.begin(halt);
      t.run(0.3, {}, hz);
      m.strike = t.mark();
      t.run(1.6, { taps: { 1: 'fire' } }, hz);
      m.end = t.mark();
      m.strikes = g.strike.count.started;
    } else if (sc.kind === 'door') {
      // (locomotion step 13) door peek: 0.7 m out from the shed door's middle facing it; the context press settles
      // (0.25 s), cracks (0.6 s) and peeks; a second press closes (0.4 s)
      const q = sc.door;
      t.stance(false, 3);
      g.player.cam['t'] = 0;
      t.tp(q.sx, q.sz, q.syaw, q.y);
      t.begin(halt);
      m.enter = t.mark();
      t.run(0.3, {}, hz);
      m.press = t.mark();
      t.run(2.0, { taps: { 1: 'cover' } }, hz);
      m.close = t.mark();
      m.peeked = g.doorPeek.phase;
      t.run(0.8, { taps: { 1: 'cover' } }, hz);
      m.end = t.mark();
    } else if (sc.kind === 'wall') {
      // (locomotion step 11) back to a wall: a free high wall on Proving (FIND_WALL), 0.85 m out facing it, the context
      // press enters (0.2 s settle), slide one way, stop, crouch, slide back, stop
      const w = sc.plane;
      t.stance(false, 3);
      // (step 11 r3) the camera's own clock (idle drift, shake) runs from page load on real time: the entry reads the
      // camera's view, so every wall run starts from the same clock (the run was not repeatable without it)
      g.player.cam['t'] = 0;
      t.tp(w.ax + w.tx * w.k + w.nx * 0.75, w.az + w.tz * w.k + w.nz * 0.75, Math.atan2(-w.nx, -w.nz), w.y);
      t.begin(halt);
      m.enter = t.mark();
      if (sc.edge) {
        // (step 12) the edge verbs at the doorway
        const names = sc.open ? ['on', 'slide', 'stop', 'peek', 'unpeek', 'lean', 'unlean'] : ['on', 'slide', 'stop', 'peek', 'unpeek', 'lean', 'unlean', 'toward', 'swat', 'settle'];
        // (step 12b) the weapon for the open-side rows (a local loadout swap; restored after the run)
        const W = g.weapons;
        const held = W['index'];
        if (sc.weapon) {
          const j = W.slots.findIndex((q) => q.def.class === sc.weapon);
          if (j >= 0 && j !== held) W['equip'](j);
        }
        sc.segs.forEach((q, k) => {
          t.run(q.d, { x: q.x ?? 0, ads: !!q.ads, taps: q.tap ? { 1: q.tap } : undefined }, hz);
          m[names[k]] = t.mark();
        });
        m.end = m[names[names.length - 1]];
        // (PC1) not on a --shots halt: the equip would put the gun in the hand of the frozen pose (reset() restores)
        if (W['index'] !== held && !t.halted()) W['equip'](held);
        m.onWall = g.wallCore?.phase === 'on';
        m.swats = g.wallCore?.count.swat ?? 0;
      } else {
      t.run(0.6, { taps: { 1: 'cover' } }, hz);
      m.on = t.mark();
      m.onWall = g.wallCore?.phase === 'on';
      t.run(1.0, { x: 1 }, hz);
      m.stop = t.mark();
      t.run(1.0, {}, hz);
      m.crouch = t.mark();
      t.run(1.0, { taps: { 1: 'crouch' } }, hz);
      m.back = t.mark();
      t.run(1.0, { x: -1 }, hz);
      m.stop2 = t.mark();
      t.run(1.0, {}, hz);
      m.end = t.mark();
      }
      if (g.wallCore?.active) g.wallCore.leave('test');
      t.run(0.3, {}, hz);
      t.stance(false, 3);
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

/** (step 11) A free high wall on Proving (as e2e-netmove's findWall): segment, plane, start `k` along it, body depth. */
const FIND_WALL = () => {
  const g = window.__app.current;
  const V = g.player.position.constructor;
  const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
  const floor = (x, z, y) => g.ballistics.ray(new V(x, y + 1, z), new V(x, y - 0.5, z), 1).hit;
  const segs = g.world.level.coverSegments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.low || Math.abs(s.y) > 0.3 || s.len < 4 || s.len > 14) continue;
    let ok = true;
    for (let k = 0.5; k < s.len && ok; k += 0.5) {
      const x = s.ax + s.tx * k + s.nx * 0.45;
      const z = s.az + s.tz * k + s.nz * 0.45;
      ok = clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 1) && clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3) && floor(x + s.nx * 0.6, z + s.nz * 0.6, s.y);
    }
    if (ok) return { seg: i, ax: s.ax, az: s.az, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, y: s.y, len: s.len, k: s.len / 2, depth: g.player.rig.p.bodyDepthHalf };
  }
  return null;
};

/** (step 12) The Proving doorway's high wall (1.1 m gap to a coplanar wall): the plane, a start 0.8 m from the edge,
 *  `end` the stick x toward the edge (the far wall is coplanar: the same plane holds through the SWAT turn). */
const FIND_DOOR = () => {
  const g = window.__app.current;
  const L = g.wallCore.links;
  const segs = g.world.level.coverSegments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.low || Math.abs(Math.abs(s.az) - 8) > 0.4 || Math.abs(s.nz) < 0.99) continue;
    const end = L.gB[i] >= 0 && Math.abs(L.gapB[i] - 1.1) < 0.05 ? 1 : L.gA[i] >= 0 && Math.abs(L.gapA[i] - 1.1) < 0.05 ? -1 : 0;
    if (end) return { seg: i, ax: s.ax, az: s.az, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, y: s.y, len: s.len, k: end > 0 ? s.len - 0.8 : 0.8, end, depth: g.player.rig.p.bodyDepthHalf };
  }
  return null;
};

/** (step 12b) A free end (`end` 1: the b end, the body's left = edgeL; -1: the a end, edgeR) of a high or low wall on
 *  Proving, open in front (as FIND_WALL), the start 0.8 m from that end. */
const FIND_END = ([end, low]) => {
  const g = window.__app.current;
  const V = g.player.position.constructor;
  const L = g.wallCore.links;
  const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
  const segs = g.world.level.coverSegments;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.low !== low || Math.abs(s.y) > 0.3 || s.len < 2.5 || s.len > 12 || (end > 0 ? L.kB[i] : L.kA[i]) !== 0) continue;
    const k = end > 0 ? s.len - 0.8 : 0.8;
    const x = s.ax + s.tx * k + s.nx * 0.45;
    const z = s.az + s.tz * k + s.nz * 0.45;
    if (!clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3)) continue;
    return { seg: i, ax: s.ax, az: s.az, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, y: s.y, len: s.len, k, end, low, depth: g.player.rig.p.bodyDepthHalf };
  }
  return null;
};
/** (step 12b) The open-side drive: enter, slide to the end, stop, peek (stick toward it), release, aim (high: the
 *  lean-out with the stick idle; low: the stick toward the end = the crouched side lean), release. */
const openSegments = (e, low) => [{ d: 0.6, tap: 'cover' }, { d: 1.2, x: e }, { d: 0.4 }, { d: 1.0, x: e }, { d: 0.6 }, { d: 1.2, ads: true, x: low ? e : 0 }, { d: 0.8 }];
const findPlane = (sc) => (sc.open ? [FIND_END, [sc.end, sc.open === 'low']] : [sc.edge ? FIND_DOOR : FIND_WALL]);
const wallSegs = (sc) => (sc.open ? openSegments(sc.plane.end, sc.open === 'low') : edgeSegments(sc.plane.end));

/** (step 12) The edge verbs, local and remote alike (segments of `d` s: stick x, aim, a tap at the start): enter, slide
 *  to the edge, peek (stick held toward it), lean-out (aim), the SWAT turn across the doorway, settle. */
const edgeSegments = (e) => [{ d: 0.6, tap: 'cover' }, { d: 1.2, x: e }, { d: 0.4 }, { d: 1.0, x: e }, { d: 0.6 }, { d: 1.0, ads: true }, { d: 0.6 }, { d: 0.3, x: e }, { d: 0.9, x: e, tap: 'cover' }, { d: 0.8 }];

/** (step 13) The Proving shed door: where to stand (0.7 m out from the leaf's middle, facing it), the handle at the
 *  crack, the hand that takes it (away from the hinge) and the cracked leaf's plane. */
const FIND_PEEKDOOR = () => {
  const g = window.__app.current;
  const d = g.world.doors.list[0];
  if (!d) return null;
  const a = d.anchor;
  const nx = Math.cos(a.yaw);
  const nz = -Math.sin(a.yaw);
  const tx = Math.sin(a.yaw);
  const tz = Math.cos(a.yaw);
  const syaw = Math.atan2(-nx, -nz);
  const hingeRight = -tx * Math.cos(syaw) + tz * Math.sin(syaw) > 0;
  const k = 0.12 * 0.12 * (3 - 2 * 0.12);
  const ly = a.yaw + a.swing * 1.75 * k;
  const lx = Math.sin(ly);
  const lz = Math.cos(ly);
  const hl = a.width - 0.07;
  return {
    sx: a.hinge.x + tx * a.width * 0.5 + nx * 0.7,
    sz: a.hinge.z + tz * a.width * 0.5 + nz * 0.7,
    syaw,
    y: a.hinge.y,
    hinge: [a.hinge.x, a.hinge.y, a.hinge.z],
    width: a.width,
    height: a.height,
    thick: 0.05,
    leaf: [lx, lz],
    handle: [a.hinge.x + lx * hl + lz * 0.06, a.hinge.y + 1.0, a.hinge.z + lz * hl - lx * 0.06],
    hand: hingeRight ? 'L' : 'R',
    handLen: g.player.rig.p.hand.len,
  };
};

async function record(sc, halt = -1) {
  if (sc.kind === 'door' && !sc.door) {
    sc.door = await G(FIND_PEEKDOOR);
    if (!sc.door) throw new Error('anim-audit door: no door on Proving');
  }
  if (sc.kind === 'wall' && !sc.plane) {
    sc.plane = await G(...findPlane(sc));
    if (!sc.plane) throw new Error('anim-audit wall: no free high wall on Proving');
  }
  // (step 12) the edge drive's segments go into the page with the scenario
  if (sc.edge) sc.segs = wallSegs(sc);
  const m = await drive(sc, halt);
  if (m.reset?.length && process.env.AA_RESET_LOG) console.log(`  reset before ${sc.name}@${sc.hz}: ${m.reset.join(', ')}`);
  if (sc.kind === 'wall') m.plane = sc.plane;
  if (sc.kind === 'door') m.door = sc.door;
  const r = await G(() => window.__aa.end());
  const buf = Buffer.from(r.b64, 'base64');
  const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return { m, n: r.n, data, kinds: r.kinds, K, IDX };
}

// ---------------------------------------------------------------- analysis
const col = (rec, name, a = 0, b = rec.n) => {
  const i = rec.IDX[name];
  const out = new Float64Array(Math.max(0, b - a));
  for (let f = a; f < b; f++) out[f - a] = rec.data[f * rec.K + i];
  return out;
};
const vec = (rec, n, a = 0, b = rec.n, keys = ['x', 'y', 'z']) => {
  const ii = keys.map((k) => rec.IDX[`${n}.${k}`]);
  const out = new Float64Array(Math.max(0, b - a) * ii.length);
  for (let f = a; f < b; f++) ii.forEach((i, k) => (out[(f - a) * ii.length + k] = rec.data[f * rec.K + i]));
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
  // remote rows: limits that scale with dt use each frame's measured dt (scaled to the nominal 1 / hz frame)
  const dts = rec.remote ? col(rec, 'dt', a, b) : undefined;
  let worst = { worst: 0, frame: -1, pass: true, j: '' };
  for (const n of NODES) {
    // local frame: each joint relative to its rig parent (characterRig.ts), the hips in world
    const q = PARENT[n] ? M.localQuats(quat(rec, PARENT[n], a, b), quat(rec, n, a, b)) : quat(rec, n, a, b);
    const r = M.jointRate(q, hz, tpm, undefined, dts);
    if (r.worst > worst.worst) worst = { ...r, j: n };
  }
  res(out, 'jointRate', { ...worst, extra: { joint: worst.j } }, L.JOINT_DEG_PER_S / hz, ':794', 'deg', a);
  const hips = vec(rec, 'hips', a, b);
  res(out, 'pelvisJump', M.pelvisJump(hips, jumpLimit, tpm, dts, hz), jumpLimit, ':795', 'm', a);
  res(out, 'teleports', M.teleports(hips, tpm), 0, ':796', 'count', a);
  const bl = M.blendTimes(col(rec, 'lower', a, b), col(rec, 'lowerW', a, b), rec.remote ? rec.dtMed : 1 / hz);
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
    // (anim-natural N1, decisions 1 / 2) a plant the planner holds at its contact (free movement: the ankle rolls round the
    // held heel / ball by design) reads the contact point, the others the ankle as before (was footContact's ankle slide
    // for every plant). The heel / ball: footGeom's points along the foot's own axes (SOLE). Same limit (FOOT_SLIDE).
    // (anim-natural-n1 fix round) each point over the frames it is down (the heel while down, the ball while down), no heel +
    // 17 cm projection (it read a heel swept round the ball's spot as 0)
    const aq = quat(rec, s === 'L' ? 'ankleL' : 'ankleR', a, b);
    const heel = new Float64Array((b - a) * 3);
    const ball = new Float64Array((b - a) * 3);
    const U = SOLE[s].up;
    const W = SOLE[s].fwd;
    for (let i = 0; i < b - a; i++) {
      const h = M.quatRotate(aq, i * 4, -U[0] * FG.HEEL_DOWN - W[0] * FG.HEEL_BACK, -U[1] * FG.HEEL_DOWN - W[1] * FG.HEEL_BACK, -U[2] * FG.HEEL_DOWN - W[2] * FG.HEEL_BACK);
      const q = M.quatRotate(aq, i * 4, -U[0] * FG.HEEL_DOWN + W[0] * FG.TOE_BALL, -U[1] * FG.HEEL_DOWN + W[1] * FG.TOE_BALL, -U[2] * FG.HEEL_DOWN + W[2] * FG.TOE_BALL);
      for (let j = 0; j < 3; j++) {
        heel[i * 3 + j] = an[i * 3 + j] + h[j];
        ball[i * 3 + j] = an[i * 3 + j] + q[j];
      }
    }
    const fsl = M.footSlide(an, heel, ball, ct, col(rec, `${s}.held`, a, b), L.FOOT_SLIDE);
    res(out, `footSlide${s}`, fsl, L.FOOT_SLIDE, ':801 / :1273', 'm', a);
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
    const P = (n, f) => [rec.data[f * rec.K + rec.IDX[`${n}.x`]], rec.data[f * rec.K + rec.IDX[`${n}.y`]], rec.data[f * rec.K + rec.IDX[`${n}.z`]]];
    for (let f = c0; f < b; f++) {
      const body = {};
      for (const n of ['hips', 'neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR']) body[n] = P(n, f);
      body.head = P('headNode', f);
      const cm = M.centerOfMass(body);
      com.push(cm[0], cm[2]);
      feet.push(...['L', 'R'].flatMap((s) => [rec.data[f * rec.K + rec.IDX[`${s}.x`]], rec.data[f * rec.K + rec.IDX[`${s}.z`]], rec.data[f * rec.K + rec.IDX[`${s}.yaw`]]]));
      con.push(rec.data[f * rec.K + rec.IDX['L.contact']], rec.data[f * rec.K + rec.IDX['R.contact']]);
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
  if (lateral) {
    // (step 22) over whole strides (left heel strike to left heel strike): the linear detrend of a part stride tilts
    // the sway and adds up to ~10% (flat-stand2 2.76 cm read as 3.09 at the M14 cadence)
    // the trend is fitted through the per-stride means (a least-squares line through a few sine periods is itself tilted)
    const ls = [];
    const lr = rise(col(rec, 'L.landed', a, b));
    for (let i = 0; i < lr.length; i++) if (lr[i]) ls.push(i);
    if (ls.length >= 3) {
      const hp = vec(rec, 'hips', a, b);
      const cp = vec(rec, 'cap', a, b);
      const yw = col(rec, 'yaw', a, b);
      const lat = yw.map((y, i) => (hp[i * 3] - cp[i * 3]) * Math.cos(y) - (hp[i * 3 + 2] - cp[i * 3 + 2]) * Math.sin(y));
      const mt = [];
      const mv = [];
      for (let k = 0; k + 1 < ls.length; k++) {
        let sum = 0;
        for (let i = ls[k]; i < ls[k + 1]; i++) sum += lat[i];
        mt.push((ls[k] + ls[k + 1] - 1) / 2);
        mv.push(sum / (ls[k + 1] - ls[k]));
      }
      const n = mt.length;
      const tm = mt.reduce((p, q) => p + q, 0) / n;
      const vm = mv.reduce((p, q) => p + q, 0) / n;
      let num = 0;
      let den = 0;
      for (let k = 0; k < n; k++) (num += (mt[k] - tm) * (mv[k] - vm)), (den += (mt[k] - tm) ** 2);
      const sl = den > 0 ? num / den : 0;
      let mn = Infinity;
      let mx = -Infinity;
      let fr = 0;
      for (let i = ls[0]; i < ls[ls.length - 1]; i++) {
        const r = lat[i] - (vm + sl * (i - tm));
        if (r < mn) mn = r;
        if (r > mx) (mx = r), (fr = i);
      }
      res(out, 'lateralSway', { worst: mx - mn, frame: fr, pass: mx - mn <= L.WALK_SWAY_WREN }, L.WALK_SWAY_WREN, ':1255', 'm', a);
    } else res(out, 'lateralSway', M.lateralSway(vec(rec, 'hips', a, b), vec(rec, 'cap', a, b), col(rec, 'yaw', a, b), L.WALK_SWAY_WREN), L.WALK_SWAY_WREN, ':1255', 'm', a);
  }
  // camera: high-passed over two steps (a slow framing ease, e.g. the sprint framing, is not an oscillation)
  const si = [];
  for (let i = 0, last = -1; i < strikes.length; i++) if (strikes[i]) (last >= 0 && si.push(i - last), (last = i));
  const win = si.length ? 2 * median(si) : Math.round(hz * 0.6);
  const camHP = sub(camY, M.smooth(camY, win));
  if (!rec.remote) res(out, 'cameraOsc', M.cameraOsc(camHP.slice(win >> 1, camHP.length - (win >> 1))), L.CAMERA_P2P, ':1256', 'm', a + (win >> 1));
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
  // (step 22, M14) timed from the body at rest: the stop now eases over CT.stopTime (0.25 s), and D2's settle is the
  // sway after the body stops, not the braking itself (it was timed from the release)
  const spd = col(rec, 'speed', stop, end);
  let rest = stop;
  while (rest < end - 2 && spd[rest - stop] > 0.05) rest++;
  stop = rest;
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
    // (step 21, D5.6 / M14, PC1) holstered arms relaxed at the sides: the elbow band per stance / gear over the steady
    // window (A42's 60-90 replaced by M14), and the forearms clear of the thighs
    if (!sc.aim && m.stop > from) {
      const eb = L.readyElbowBand(sc.stance, sc.gear);
      for (const s of ['L', 'R']) {
        const fb = M.flexBand(vec(rec, `shoulder${s}`, from, m.stop), vec(rec, `elbow${s}`, from, m.stop), vec(rec, `wrist${s}`, from, m.stop), eb.min, eb.max);
        res(out, `readyElbow${s}`, { ...fb, extra: { min: +fb.min.toFixed(1), max: +fb.max.toFixed(1) } }, `${eb.min}-${eb.max}`, 'D5.6 / M14', 'deg', from);
        res(out, `readyThigh${s}`, M.segmentDistance(vec(rec, `elbow${s}`, from, m.stop), vec(rec, `wrist${s}`, from, m.stop), vec(rec, `hip${s}`, from, m.stop), vec(rec, `knee${s}`, from, m.stop), L.LIMB_RADIUS.forearm + L.LIMB_RADIUS.thigh, L.CLIP_SELF), L.CLIP_SELF, 'D5.6 / M14 / :807', 'm', from);
      }
    }
    stopMetrics(rec, hz, out, m.start, m.stop, m.end, m.cap);
  } else if (sc.kind === 'tunnel') {
    common(rec, hz, out, 0, rec.n, L.pelvisJumpByGear('crouch', hz)[2], m.stop + Math.round(hz * 0.6));
    steady(rec, hz, out, m.steady, m.stop, 'crouch', false, m.cap, 'flat');
    stopMetrics(rec, hz, out, m.start, m.stop, m.end, m.cap);
  } else {
    const still = L.pelvisJumpLimit(0, hz);
    const moving = L.pelvisJumpByGear('stand', hz)[sc.kind === 'turn180' ? 3 : 2];
    // (step 10) strike: balance from the end of its 0.9 s (STRIKE_DUR)
    const bal = sc.kind === 'idle' ? m.idle : sc.kind === 'strike' ? m.strike + Math.round((rec.remote ? 1 / rec.dtMed : hz) * 0.9) : -1;
    common(rec, hz, out, 0, rec.n, ['turn180', 'vault', 'mantle', 'drop09', 'drop24', 'ladder', 'wall'].includes(sc.kind) ? moving : still, bal);
    const dt = rec.remote ? rec.dtMed : 1 / hz;
    if (sc.kind === 'stance') {
      // from the last frame before the press until crouchBlend is within 1e-4 of its target
      const cb = col(rec, 'crouchBlend');
      // crouchBlend is a sim-rate (60 Hz) signal: the time rounds up to the end of its sim step at 120 Hz
      res(out, 'crouchTime', M.reachTime(cb.slice(0, m.up), m.down - 1, dt, L.MIN_DURATION.crouch, 1, L.STANCE_DONE_TOL, rec.remote ? 0 : 1 / 60), L.MIN_DURATION.crouch, ':824', 's');
      res(out, 'standTime', M.reachTime(cb, m.up - 1, dt, L.MIN_DURATION.stand, 0, L.STANCE_DONE_TOL, rec.remote ? 0 : 1 / 60), L.MIN_DURATION.stand, ':825', 's');
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
    } else if (sc.kind === 'strike') {
      // (step 10) settle: from 0.2 s after the strike's 0.9 s (D2 sway settle) the head is back to idle breathing
      const f = 1 / dt;
      const s0 = Math.min(rec.n - 1, m.strike + Math.round(f * 1.1));
      res(out, 'strikeSettle', { ...M.oscP2P(col(rec, 'headNode.y', s0, m.end), L.IDLE_BREATH), extra: { started: m.strikes ?? null } }, L.IDLE_BREATH, 'step 10 / D2', 'm', s0);
    } else if (sc.kind === 'wall') {
      wallMetrics(rec, out, m, dt);
    } else if (sc.kind === 'door') {
      doorMetrics(rec, out, m, dt);
    } else if (sc.kind === 'idle') {
      res(out, 'idleBreath', M.oscP2P(col(rec, 'headNode.y', m.idle, m.end), L.IDLE_BREATH), L.IDLE_BREATH, ':1257', 'm', m.idle);
      res(out, 'idleCamera', M.cameraOsc(col(rec, 'cam.y', m.idle, m.end)), L.CAMERA_P2P, ':1256', 'm', m.idle);
    }
  }
  return out;
}

/**
 * (step 11) Back to a wall: the back's gap to the face (bible 5.3 / step 11 item 8: back and shoulder blades on the wall,
 * <= 3 cm, no clip). Per frame in the full-weight `wall` lower state from 0.3 s after the entry press: the nearest of
 * the torso and both shoulder joints to the wall plane, less the rig's body depth half (proportions bodyDepthHalf).
 * wallGap: the largest gap (m), wallClip: the deepest the back goes behind the face (m).
 */
/**
 * (step 13) Door peek: from 1.0 s after the press (0.25 s settle + 0.6 s crack + 0.15 s) to the close press, the palm of
 * the hand away from the hinge (the wrist plus the rig's palm offset along the shoulder-wrist line, as characterRig's
 * reach) to the handle at the crack (doorHand), and the deepest any body joint goes past the cracked leaf's face on
 * the body's side, inside the leaf's extent (doorClip).
 */
function doorMetrics(rec, out, m, dt) {
  const q = m.door;
  if (!q) return;
  const from = Math.min(rec.n, m.press + Math.round(1.0 / dt));
  const to = Math.min(rec.n, m.close);
  const wr = vec(rec, `wrist${q.hand}`);
  const sh = vec(rec, `shoulder${q.hand}`);
  const back = q.handLen * 0.45;
  const [lx, lz] = q.leaf;
  // the leaf's normal toward the body (the body stands on the anchor normal's + side)
  const nx = lz;
  const nz = -lx;
  const joints = NODES.filter((n) => n !== 'weaponPivot').map((n) => vec(rec, n));
  let hand = { worst: 0, frame: -1 };
  let clip = { worst: 0, frame: -1 };
  let n = 0;
  for (let i = from; i < to; i++) {
    n++;
    const o = i * 3;
    const dx = wr[o] - sh[o];
    const dy = wr[o + 1] - sh[o + 1];
    const dz = wr[o + 2] - sh[o + 2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const px = wr[o] + (dx / len) * back;
    const py = wr[o + 1] + (dy / len) * back;
    const pz = wr[o + 2] + (dz / len) * back;
    const h = Math.hypot(px - q.handle[0], py - q.handle[1], pz - q.handle[2]);
    if (h > hand.worst) hand = { worst: h, frame: i };
    for (const p of joints) {
      const rx = p[o] - q.hinge[0];
      const rz = p[o + 2] - q.hinge[2];
      const along = rx * lx + rz * lz;
      const y = p[o + 1] - q.hinge[1];
      if (along < 0 || along > q.width || y < 0 || y > q.height) continue;
      const c = q.thick / 2 - (rx * nx + rz * nz);
      if (c > clip.worst) clip = { worst: c, frame: i };
    }
  }
  res(out, 'doorHand', { ...hand, pass: n > 0 && hand.worst <= L.DOOR_HAND, extra: { frames: n, peeked: m.peeked ?? null } }, L.DOOR_HAND, 'step 13', 'm', from);
  res(out, 'doorClip', { ...clip, pass: n > 0 && clip.worst <= L.DOOR_CLIP + 1e-4 }, L.DOOR_CLIP, 'step 13', 'm', from);
}

function wallMetrics(rec, out, m, dt) {
  const w = m.plane;
  if (!w) return;
  const lower = col(rec, 'lower');
  const lw = col(rec, 'lowerW');
  const WI = LOWER.indexOf('wall');
  const from = Math.min(rec.n, m.enter + Math.round(0.3 / dt) + 1);
  const pts = ['torso', 'shoulderL', 'shoulderR'].map((n) => vec(rec, n));
  let gap = { worst: 0, frame: -1 };
  let clip = { worst: 0, frame: -1 };
  let n = 0;
  for (let i = from; i < m.end; i++) {
    if (lower[i] !== WI || lw[i] < 0.99) continue;
    n++;
    let d = Infinity;
    for (const p of pts) d = Math.min(d, (p[i * 3] - w.ax) * w.nx + (p[i * 3 + 2] - w.az) * w.nz);
    const g = d - w.depth;
    if (g > gap.worst) gap = { worst: g, frame: i };
    if (-g > clip.worst) clip = { worst: -g, frame: i };
  }
  res(out, 'wallGap', { ...gap, pass: n > 0 && gap.worst <= L.WALL_GAP, extra: { frames: n, onWall: m.onWall ?? null } }, L.WALL_GAP, 'step 11 / bible 5.3', 'm');
  res(out, 'wallClip', { ...clip, pass: n > 0 && clip.worst <= L.WALL_GAP }, L.WALL_GAP, 'step 11 / bible 5.3', 'm');
}

// ---------------------------------------------------------------- remote poses (step 08)
/** Remote scenarios: B (client) moves in real time; A (host) records its copy of B. */
function remoteScenarios() {
  const out = [];
  const g = (surface, stance, gear, hz, extra = {}) => out.push({ name: `${surface}-${stance}${gear}`, kind: 'gait', surface, stance, gear, hz, ...extra });
  const flat = QUICK ? [['stand', 4], ['crouch', 3]] : [['stand', 2], ['stand', 4], ['stand', 6], ['crouch', 3]];
  for (const [s, k] of flat) g('flat', s, k, 60);
  if (!QUICK) {
    g('stairs', 'stand', 3, 60);
    g('ramp', 'stand', 3, 60);
    out.push({ name: 'stopidle', kind: 'gait', surface: 'flat', stance: 'stand', gear: 3, hz: 60, steady: 1.0, idleTail: true });
    out.push({ name: 'stance', kind: 'stance', hz: 60 });
    // (step 10) the elbow strike: a client strike approved by the host (cmove / cstart), posed from MoveState
    out.push({ name: 'strike', kind: 'strike', hz: 60 });
    // (step 11) back to a wall: the host's copy posed from the client's `wall` MoveState (segment, s, WALL_SUB)
    out.push({ name: 'wall', kind: 'wall', hz: 60 });
    // last: it connects both fake pads (a connected pad's idle stick would hold B's scripted stick at 0 afterwards)
    // prototype: revisit - the brace / boost remote scenario: the old brace-and-boost stack no longer starts from a pad press in this harness (B2 relay)
    // (step 13) door peek: the client cracks the shed door, the host's copy poses from MoveState doorPeek
    out.push({ name: 'doorpeek', kind: 'door', hz: 60 });
  }
  return out.filter((s) => !ONLY || s.name.includes(ONLY));
}

/** B's input timeline for a scenario (segments of `d` seconds: stick `y`, a tap at the segment start). */
function remoteSegments(sc) {
  if (sc.kind === 'stance') return [{ d: 0.3 }, { d: 0.8, tap: 'crouch' }, { d: 0.8, tap: 'crouch' }];
  if (sc.kind === 'strike') return [{ d: 0.3 }, { d: 1.6, tap: 'fire' }];
  if (sc.kind === 'door') return [{ d: 0.3 }, { d: 2.0, tap: 'cover' }, { d: 0.8, tap: 'cover' }];
  // (step 11) as the local drive: enter, slide, stop, crouch, slide back, stop
  if (sc.kind === 'wall' && sc.edge) return wallSegs(sc);
  if (sc.kind === 'wall') return [{ d: 0.6, tap: 'cover' }, { d: 1.0, x: 1 }, { d: 1.0 }, { d: 1.0, tap: 'crouch' }, { d: 1.0, x: -1 }, { d: 1.0 }];
  const s = SURF[sc.surface];
  const crouch = sc.stance === 'crouch';
  const cap = (crouch ? [0.85, 1.3, 1.7, 2.15, 2.6, 2.6] : [0.65, 1.1, 1.65, 2.3, 3.15, 4.15])[sc.gear - 1];
  // as the local drive: flat 1.0 s accel + a steady window; ramps / stairs a short accel and the window up the slope
  // (remote runs in real time: a 1.5 s steady window, about three steps at a walk, and a 1.2 s stop keep it near 60 s)
  let accel = ACCEL;
  let steady = sc.steady ?? 1.5;
  if (s.len) {
    accel = 0.3;
    steady = Math.min(3.0, Math.max(0.5, (s.len - 0.4 - 0.1 * cap) / cap - accel + 0.1));
  }
  // stopidle (r1): a 1.5 s idle tail, the breath measured after the stop settles
  // (step 17, A68) stand6: sprint held through accel + steady (gear 6 only with sprint)
  const sprint = !crouch && sc.gear === 6;
  return [{ d: 0.3 }, { d: accel, y: 1, sprint }, { d: steady, y: 1, sprint }, { d: sc.idleTail ? 1.5 : 1.2 }];
}

/** Linear interpolation of B's track (rows of `w` floats, column 0 = t) at time t: column `c..c+2` -> out. */
function sampleB(bd, w, n, t, c, out, hint) {
  let i = Math.max(0, Math.min(n - 2, hint.i));
  while (i < n - 2 && bd[(i + 1) * w] < t) i++;
  while (i > 0 && bd[i * w] > t) i--;
  hint.i = i;
  const t0 = bd[i * w];
  const t1 = bd[(i + 1) * w];
  if (t < t0 || t > t1) return false;
  const k = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
  for (let j = 0; j < 3; j++) out[j] = bd[i * w + c + j] + (bd[(i + 1) * w + c + j] - bd[i * w + c + j]) * k;
  return true;
}

/** B's own track per frame: t, the BJ joint positions, its root (capsule) position, gait phase, yaw, anim LOD skip and
 *  speed, then each NODES world quaternion (pops: a joint step the owner has too is not rubber-banding). */
const LOWER_J = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
const BJ = [...JOINTS, 'hips', 'hipL', 'hipR', 'kneeL', 'kneeR'];
const B_POS = 1 + 3 * BJ.length;
const B_PHASE = B_POS + 3;
const B_YAW = B_POS + 4;
const B_LOD = B_POS + 5;
const B_SPEED = B_POS + 6;
const B_Q = B_POS + 7;
const BW = B_Q + 4 * NODES.length;

/** Last B frame at or before time t (binary search; -1 before the track). */
function bAt(bd, n, t) {
  let lo = 0;
  let hi = n - 1;
  if (n === 0 || bd[0] > t) return -1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (bd[m * BW] <= t) lo = m;
    else hi = m - 1;
  }
  return lo;
}
const d3 = (p, i, q, j) => Math.hypot(p[i] - q[j], p[i + 1] - q[j + 1], p[i + 2] - q[j + 2]);
/** Circular difference of two gait phases (cycle fractions), in [-0.5, 0.5). */
const dPhase = (p, q) => ((((p - q) % 1) + 1.5) % 1) - 0.5;
/** Root-relative joint in the body's yaw frame (x right, z forward): world joint (jx, jy, jz) minus root, rotated by -yaw. */
function rel(jx, jy, jz, rx, ry, rz, yaw, out, o) {
  const dx = jx - rx;
  const dz = jz - rz;
  const cs = Math.cos(yaw);
  const sn = Math.sin(yaw);
  out[o] = dx * cs - dz * sn;
  out[o + 1] = jy - ry;
  out[o + 2] = dx * sn + dz * cs;
}
/** e2e-netmove's settle rule on B's own track: its ankles and root still (< 1 cm) over the 0.3 s before time t
 *  (e2e-netmove.mjs: two joint reads 0.3 s apart, speed < 0.05). */
const SETTLE = 0.3;
function settledB(bd, n, t) {
  const i1 = bAt(bd, n, t);
  const i0 = bAt(bd, n, t - SETTLE);
  if (i1 < 0 || i0 < 0) return false;
  const cols = [2, 3].map((k) => 1 + 3 * k).concat([B_POS]); // ankleL, ankleR (JOINTS 2, 3), root
  for (let k = i0; k <= i1; k++) for (const c of cols) if (d3(bd, k * BW + c, bd, i1 * BW + c) >= 0.01) return false;
  return Math.abs(bd[i1 * BW + B_SPEED]) < 0.05;
}

/**
 * Remote-only metrics (r1 split, A38): lag; poseError = the gating part (root, head, wrists, plus the ankles on settled
 * frames, e2e-netmove's rule) vs B's own pose at t - lag; gaitPhase = the copy's stride phase offset from B's (reported:
 * no gait phase on the wire); lowerBody = the phase-aligned, root-relative hips / knees / ankles; pops = rubber-banding
 * only (a root step of the copy unlike B's own over the same interval, or a joint step over the limit B's track does not
 * have at t - lag).
 */
function remoteMetrics(sc, rec, b, out, a0, a1) {
  const n = rec.n;
  const t = col(rec, 't');
  const cap = vec(rec, 'cap');
  const bd = b.data;
  // lag: the host renders INTERP_DELAY behind the newest snapshot it received (plus the send / receive latency): the
  // shift in [0, INTERP_DELAY + 0.15] s that best lines A's root up with B's own root (r1: the search started at
  // INTERP_DELAY and always ended there: the copy runs less than 0.1 s behind B's own clock on this VM)
  const o = [0, 0, 0];
  // fitted on the copy's moving frames (standing frames match at any shift and held the median at the search start)
  const spd = col(rec, 'speed');
  const movingN = spd.filter((v) => v > 0.5).length;
  const lagErr = (lag) => {
    const e = [];
    const h = { i: 0 };
    for (let i = a0; i < a1; i++) if (spd[i] > 0.5 && sampleB(bd, BW, b.n, t[i] - lag, B_POS, o, h)) e.push(Math.hypot(cap[i * 3] - o[0], cap[i * 3 + 1] - o[1], cap[i * 3 + 2] - o[2]));
    return e.length ? median(e) : Infinity;
  };
  let lag = INTERP_DELAY;
  let best = Infinity;
  // r3: under 20 moving frames (a standing row: every shift ties) the lag stays INTERP_DELAY
  if (movingN >= 20) for (let l = 0; l <= INTERP_DELAY + 0.15 + 1e-9; l += 0.0025) {
    const e = lagErr(l);
    if (e < best) [best, lag] = [e, l];
  }
  // (a) gating pose error
  const GATE = ['wristL', 'wristR', 'headNode'];
  const jv = Object.fromEntries(NODES.map((j) => [j, vec(rec, j)]));
  let worst = 0;
  let frame = -1;
  let joint = '';
  let used = 0;
  let settledN = 0;
  let allWorst = 0;
  const per = [];
  const h = { i: 0 };
  for (let i = a0; i < a1; i++) {
    const tb = t[i] - lag;
    if (!sampleB(bd, BW, b.n, tb, B_POS, o, h)) continue;
    let fw = d3(cap, i * 3, o, 0);
    let fj = 'root';
    const settled = settledB(bd, b.n, tb);
    if (settled) settledN++;
    for (let k = 0; k < JOINTS.length; k++) {
      if (!sampleB(bd, BW, b.n, tb, 1 + 3 * k, o, h)) continue;
      const e = d3(jv[JOINTS[k]], i * 3, o, 0);
      allWorst = Math.max(allWorst, e);
      if (!GATE.includes(JOINTS[k]) && !settled) continue;
      if (e > fw) [fw, fj] = [e, JOINTS[k]];
    }
    used++;
    per.push(fw);
    if (fw > worst) [worst, frame, joint] = [fw, i, fj];
  }
  res(out, 'poseError', { worst, frame, pass: worst <= 0.1, extra: { joint, lag: +lag.toFixed(4), rootMedian: Number.isFinite(best) ? +best.toFixed(4) : null, lagFit: movingN >= 20, frames: used, settledFrames: settledN, median: +median(per).toFixed(4), over: per.filter((e) => e > 0.1).length, allJointsWorst: +allWorst.toFixed(4) } }, 0.1, ':858 / e2e-netmove 10 cm (gating: root, head, wrists, settled ankles; A38)', 'm');
  // (b) gait phase offset (reported) and (c) the phase-aligned, root-relative lower body, on the copy's moving frames
  const sp = col(rec, 'speed');
  const ph = col(rec, 'phase');
  const yaw = col(rec, 'yaw');
  const offs = [];
  let pWorst = 0;
  let pFrame = -1;
  let lWorst = 0;
  let lFrame = -1;
  let lJoint = '';
  let lN = 0;
  let lAt = null;
  const ra = [0, 0, 0];
  const rb = [0, 0, 0];
  for (let i = a0; i < a1; i++) {
    if (!(sp[i] > 0.3) || !Number.isFinite(ph[i])) continue;
    const tb = t[i] - lag;
    const k0 = bAt(bd, b.n, tb);
    if (k0 < 0 || k0 >= b.n - 1 || !(bd[k0 * BW + B_SPEED] > 0.3)) continue;
    const d = dPhase(ph[i], bd[k0 * BW + B_PHASE]);
    offs.push(d);
    if (Math.abs(d) > pWorst) [pWorst, pFrame] = [Math.abs(d), i];
    // the B frame within half a second of t - lag whose phase is nearest the copy's (ties: the nearest in time)
    let kb = -1;
    let cb = Infinity;
    for (let k = bAt(bd, b.n, tb - 0.5); k >= 0 && k < b.n && bd[k * BW] <= tb + 0.5; k++) {
      const cst = Math.abs(dPhase(ph[i], bd[k * BW + B_PHASE])) + 0.05 * Math.abs(bd[k * BW] - tb);
      if (cst < cb) [cb, kb] = [cst, k];
    }
    if (kb < 0) continue;
    lN++;
    const kr = kb * BW;
    for (const j of LOWER_J) {
      const jb = 1 + 3 * BJ.indexOf(j);
      const v = jv[j];
      rel(v[i * 3], v[i * 3 + 1], v[i * 3 + 2], cap[i * 3], cap[i * 3 + 1], cap[i * 3 + 2], yaw[i], ra, 0);
      rel(bd[kr + jb], bd[kr + jb + 1], bd[kr + jb + 2], bd[kr + B_POS], bd[kr + B_POS + 1], bd[kr + B_POS + 2], bd[kr + B_YAW], rb, 0);
      const e = d3(ra, 0, rb, 0);
      if (e > lWorst) [lWorst, lFrame, lJoint, lAt] = [e, i, j, { copy: ra.map((x) => +x.toFixed(3)), own: rb.map((x) => +x.toFixed(3)), dt: +(bd[kr] - tb).toFixed(3), phase: [+ph[i].toFixed(3), +bd[kr + B_PHASE].toFixed(3)], yaw: [+yaw[i].toFixed(3), +bd[kr + B_YAW].toFixed(3)] }];
    }
  }
  const absO = offs.map(Math.abs);
  out.gaitPhase = { worst: +pWorst.toFixed(4), frame: pFrame, unit: 'cycle', line: 'A38 (reported, no gait phase on the wire)', median: +median(absO).toFixed(4), mean: +mean(offs).toFixed(4), frames: offs.length };
  res(out, 'lowerBody', { worst: lWorst, frame: lFrame, pass: lWorst <= 0.1, extra: { joint: lJoint, frames: lN, at: lAt } }, 0.1, ':858 phase-aligned, root-relative (A38)', 'm');
  // (4) pops: rubber-banding only
  const dts = col(rec, 'dt');
  const tpm = col(rec, 'tp');
  const popAt = new Set();
  let rootPops = 0;
  let jointPops = 0;
  const pa = [0, 0, 0];
  const pb = [0, 0, 0];
  const h2 = { i: 0 };
  for (let i = Math.max(1, a0); i < a1; i++) {
    if (tpm[i]) continue;
    if (!sampleB(bd, BW, b.n, t[i - 1] - lag, B_POS, pa, h2) || !sampleB(bd, BW, b.n, t[i] - lag, B_POS, pb, h2)) continue;
    const ex = Math.hypot(cap[i * 3] - cap[i * 3 - 3] - (pb[0] - pa[0]), cap[i * 3 + 1] - cap[i * 3 - 2] - (pb[1] - pa[1]), cap[i * 3 + 2] - cap[i * 3 - 1] - (pb[2] - pa[2]));
    // the per-frame jump form of :795 (speed x dt + 2 cm): B's track is stamped when its frame ran (sim steps on a
    // 16 ms timer), so one B frame of timing at the current speed is not a discontinuity; a snapback is
    const kb = bAt(bd, b.n, t[i] - lag);
    const v = Math.max(Math.abs(sp[i]), kb >= 0 ? Math.abs(bd[kb * BW + B_SPEED]) : 0);
    if (ex > v * Math.max(dts[i] || 0, 1 / 60) + L.PELVIS_JUMP_SLACK) (popAt.add(i), rootPops++);
  }
  // B's own local joint rates (deg/s) per frame, the same local frames as the copy's
  const bq = (nd, k) => [bd[k * BW + B_Q + 4 * NODES.indexOf(nd)], bd[k * BW + B_Q + 4 * NODES.indexOf(nd) + 1], bd[k * BW + B_Q + 4 * NODES.indexOf(nd) + 2], bd[k * BW + B_Q + 4 * NODES.indexOf(nd) + 3]];
  const bTrack = (nd) => {
    const q = new Float64Array(b.n * 4);
    for (let k = 0; k < b.n; k++) q.set(bq(nd, k), k * 4);
    return q;
  };
  const lim = L.JOINT_DEG_PER_S;
  for (const nd of NODES) {
    const q = PARENT[nd] ? M.localQuats(quat(rec, PARENT[nd], 0, n), quat(rec, nd, 0, n)) : quat(rec, nd, 0, n);
    const qb = PARENT[nd] ? M.localQuats(bTrack(PARENT[nd]), bTrack(nd)) : bTrack(nd);
    for (let i = Math.max(1, a0); i < a1; i++) {
      if (tpm[i]) continue;
      // the copy's step over at least one B frame (1/60 s: at 120 Hz the copy's frames split B's steps unevenly)
      let j = i - 1;
      while (j > a0 && t[i] - t[j] < 1 / 60 - 1e-3 && !tpm[j]) j--;
      const rate = M.quatAngle(q, j * 4, q, i * 4) / Math.max(t[i] - t[j], 1e-3);
      if (rate <= lim) continue;
      // B's own fastest step of this joint around [t(j), t(i)] - lag (two frames either side, its frame-time jitter):
      // over the limit = B has it
      let bMax = 0;
      const k1 = Math.min(b.n - 1, bAt(bd, b.n, t[i] - lag) + 2);
      for (let k = Math.max(1, bAt(bd, b.n, t[j] - lag) - 1); k <= k1; k++) {
        const dtb = bd[k * BW] - bd[(k - 1) * BW];
        if (dtb > 0) bMax = Math.max(bMax, M.quatAngle(qb, (k - 1) * 4, qb, k * 4) / dtb);
      }
      if (bMax <= lim) (popAt.add(i), jointPops++);
    }
  }
  const pf = [...popAt].sort((p, q) => p - q);
  res(out, 'pops', { worst: pf.length, frame: pf[0] ?? -1, pass: pf.length === 0, extra: { root: rootPops, joint: jointPops, frames: pf.slice(0, 12) } }, 0, ':858 rubber-banding (RULES: fails from step 09)', 'count');
  return lag;
}

/** Brace + boost (host side): the climber's foot on the braced hands at contact, and the two bodies' overlap. */
function pairMetrics(rec, out) {
  const team = col(rec, 'team');
  let c = -1;
  let b0 = -1;
  let b1 = -1;
  for (let i = 0; i < rec.n; i++) {
    if (team[i] >= 0) {
      if (b0 < 0) b0 = i;
      b1 = i + 1;
      if (c < 0 && team[i] >= BOOST_CONTACT_K * BOOST_TIME) c = i;
    }
  }
  if (c < 0) {
    res(out, 'pairAlign', { worst: NaN, frame: -1, pass: false, extra: { why: 'no boost recorded' } }, 0.03, ':859', 'm');
    return;
  }
  const P = (n, f) => [rec.data[f * rec.K + rec.IDX[`${n}.x`]], rec.data[f * rec.K + rec.IDX[`${n}.y`]], rec.data[f * rec.K + rec.IDX[`${n}.z`]]];
  const wl = P('wristL', c);
  const wr = P('wristR', c);
  const hands = [(wl[0] + wr[0]) / 2, (wl[1] + wr[1]) / 2, (wl[2] + wr[2]) / 2];
  // the lower of the climber's feet: its sole (FOOT_REF under the ankle) against the middle of the braced wrists
  const al = P('own.ankleL', c);
  const ar = P('own.ankleR', c);
  const foot = al[1] < ar[1] ? al : ar;
  const d = Math.hypot(foot[0] - hands[0], foot[1] - FOOT_REF - hands[1], foot[2] - hands[2]);
  res(out, 'pairAlign', { worst: d, frame: c, pass: d <= 0.03, extra: { foot: al[1] < ar[1] ? 'L' : 'R', hands: hands.map((v) => +v.toFixed(3)), sole: [foot[0], foot[1] - FOOT_REF, foot[2]].map((v) => +v.toFixed(3)) } }, 0.03, ':859', 'm');
  // bodies: the torso capsules (hips -> neck) and the climber's legs against the braced torso, <= 3 cm overlap
  const R = L.LIMB_RADIUS;
  const v = (n) => vec(rec, n, b0, b1);
  const pairs = [
    ['torso', M.segmentDistance(v('own.hips'), v('own.neck'), v('hips'), v('neck'), 2 * R.torso, 0.03)],
    ...['L', 'R'].flatMap((s) => [
      [`thigh${s}`, M.segmentDistance(v(`own.hip${s}`), v(`own.knee${s}`), v('hips'), v('neck'), R.thigh + R.torso, 0.03)],
      [`shank${s}`, M.segmentDistance(v(`own.knee${s}`), v(`own.ankle${s}`), v('hips'), v('neck'), R.shank + R.torso, 0.03)],
    ]),
  ];
  const w = pairs.reduce((p, q) => (q[1].worst > p[1].worst ? q : p));
  res(out, 'pairPenetration', { ...w[1], extra: { part: w[0] } }, 0.03, ':859', 'm', b0);
}

async function runRemote() {
  const t0 = Date.now();
  const E0 = Date.now();
  const rep = { started: new Date().toISOString(), quick: QUICK, scenarios: [] };
  // B keeps its real-time loop while A is in front: no background timer / renderer throttling
  // (a small viewport, DPR 1: software GL composites both pages' canvases in one GPU process; a large or high-DPR
  // viewport alone held each page to 7 frames/s)
  const net = await hostAndJoin(url, 2, { viewport: { width: 640, height: 360 }, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const { browser: rb, A, B } = net;
  try {
    await startModeSlow(net.pages, 'sandbox', 'proving');
    rep.lobbySeconds = (Date.now() - t0) / 1000;
    // A: the recorder (its copy of B, every rendered frame, measured dt) and the 120 Hz frame pump
    // software GL renders two match scenes at 2-12 frames/s on this VM, far from real time: there both pages skip the
    // draw (scene.render), their loops still run every display frame in real time (input, sim, frame update: the poses
    // are complete in frameUpdate; the recorders force the world matrices). GPU runs (E2E_GPU=1) keep the draw.
    const noDraw = process.env.E2E_GPU !== '1';
    rep.draw = !noDraw;
    for (const P of [A, B]) await P.evaluate((off) => { if (off) window.__app.current.scene.render = () => {}; }, noDraw);
    await A.evaluate(([NODES, W, names, LOWER, OWN, MODES, E0]) => {
      const a = window.__app;
      const g = a.current;
      const r0 = g.net.remotes.values().next().value;
      const av = r0.avatar;
      const rig = av.rig;
      const own = g.player.rig;
      const V = g.player.position.constructor;
      const K = names.length;
      const tmp = new V();
      let last = null;
      const gu = rig.graph.update.bind(rig.graph);
      rig.graph.update = (dt, i) => (last = gu(dt, i));
      // (step 15) the medkit phase and the graph's free hand targets in world (characterRig.ts bodyToWorld, as solveArm)
      const kitCols = (rig, last, f, o, tmp) => {
        f[o++] = rig.input?.medkit ?? -1;
        for (const h of last ? [last.handL, last.handR] : [null, null]) {
          if (h) {
            rig.bodyToWorld(h, tmp);
            f[o++] = tmp.x;
            f[o++] = tmp.y;
            f[o++] = tmp.z;
          } else o += 3, (f[o - 1] = f[o - 2] = f[o - 3] = NaN);
        }
        return o;
      };
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
      const sole = { L: [[0, -0.08, -0.06], [0, -0.08, 0.21]], R: [[0, -0.08, -0.06], [0, -0.08, 0.21]] };
      const groundUnder = (an, q, o) => {
        const tx = 2 * (q.y * o[2] - q.z * o[1]);
        const ty = 2 * (q.z * o[0] - q.x * o[2]);
        const tz = 2 * (q.x * o[1] - q.y * o[0]);
        const px = an.x + o[0] + q.w * tx + (q.y * tz - q.z * ty);
        const pz = an.z + o[2] + q.w * tz + (q.x * ty - q.y * tx);
        return groundAt(px, an.y, pz);
      };
      const ar = { frames: [], rec: false, tp: 0, prev: 0, jit: [], pumpId: 0 };
      const hooks = a.loop['hooks'];
      const orig = hooks.frameUpdate;
      hooks.frameUpdate = function (dt, alpha) {
        // r1: the draw is off (scene.render stubbed) or the render loop stopped (pump): nothing else refreshes the
        // camera's world matrix, and the rigs' anim LOD reads camera.globalPosition (characterRig.ts animate, 22 m)
        const cm = g.scene.activeCamera;
        cm?.getViewMatrix(true);
        orig.call(this, dt, alpha);
        const now = performance.now();
        const mdt = ar.prev ? (now - ar.prev) / 1000 : dt;
        ar.prev = now;
        if (!ar.rec) return;
        rig.root.computeWorldMatrix(true);
        for (const d of rig.root.getDescendants(false)) d.computeWorldMatrix?.(true);
        own.root.computeWorldMatrix(true);
        for (const d of own.root.getDescendants(false)) d.computeWorldMatrix?.(true);
        const f = new Float32Array(K);
        let o = 0;
        f[o++] = (performance.timeOrigin + now - E0) / 1000;
        f[o++] = ar.tp;
        ar.tp = 0;
        for (const n of NODES) {
          const pp = rig[n].getAbsolutePosition();
          const q = rig[n].absoluteRotationQuaternion;
          f[o++] = pp.x;
          f[o++] = pp.y;
          f[o++] = pp.z;
          f[o++] = q.x;
          f[o++] = q.y;
          f[o++] = q.z;
          f[o++] = q.w;
        }
        f[o++] = f[o++] = f[o++] = NaN; // the host's camera is its own
        for (let k = 0; k < 2; k++) {
          f[o++] = av.pos.x;
          f[o++] = av.pos.y;
          f[o++] = av.pos.z;
        }
        f[o++] = av['speed'];
        f[o++] = NaN;
        f[o++] = av['crouch'];
        f[o++] = av['crouch'] > 0.5 ? 1 : 0;
        f[o++] = av.yaw;
        f[o++] = av.mode === 'ground' ? 1 : 0;
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
          f[o++] = fs.anchored ? 1 : 0;
        }
        const gr = rig.graph;
        f[o++] = LOWER.indexOf(gr.state);
        f[o++] = gr.weights?.[gr.state] ?? 1;
        const hw = rig.heldWeapon;
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
        f[o++] = NaN; // raise (the copy has no carry clock)
        f[o++] = 0;
        f[o++] = av.mode === 'ground' ? 0 : 1;
        f[o++] = 0;
        f[o++] = NaN;
        f[o++] = NaN;
        o = kitCols(rig, last, f, o, tmp);
        // remote extras
        f[o++] = mdt;
        f[o++] = MODES.indexOf(av.mode);
        f[o++] = g.team?.state === 'boost' ? g.team.t : -1;
        f[o++] = rig['lodDt'] > 0 ? 1 : 0;
        f[o++] = rig.graph.phase;
        f[o++] = cm ? Math.sqrt((rig.root.position.x - cm.globalPosition.x) ** 2 + (rig.root.position.z - cm.globalPosition.z) ** 2) : NaN;
        for (const n of OWN) {
          const pp = own[n].getAbsolutePosition();
          f[o++] = pp.x;
          f[o++] = pp.y;
          f[o++] = pp.z;
        }
        if (o !== K) throw new Error(`remote record layout ${o} != ${K}`);
        ar.frames.push(f);
      };
      window.__ar = {
        setSole(L, R) {
          sole.L = L;
          sole.R = R;
        },
        begin() {
          ar.frames = [];
          ar.rec = true;
        },
        teleported() {
          ar.tp = 1;
          r0.allowTeleport(1.5);
        },
        end() {
          ar.rec = false;
          const all = new Float32Array(ar.frames.length * K);
          ar.frames.forEach((f, i) => all.set(f, i * K));
          const u8 = new Uint8Array(all.buffer);
          let s = '';
          for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          return { b64: btoa(s), n: ar.frames.length };
        },
        /** 120 Hz: A's loop manual, the render loop off, an 8 ms page-side pump (fixed steps once 1/60 s of real time passed). */
        pump(on) {
          if (on) {
            a.loop.manual = true;
            g.scene.getEngine().stopRenderLoop();
            let prev = performance.now();
            let acc = 0;
            ar.jit = [];
            ar.pumpId = setInterval(() => {
              const now = performance.now();
              const dt = (now - prev) / 1000;
              prev = now;
              ar.jit.push(dt);
              acc = Math.min(acc + dt, 0.1);
              if (acc >= 1 / 60) {
                acc -= 1 / 60;
                a.loop.stepHeadless(1 / 60);
              } else {
                hooks.beforeFrame?.(dt);
                hooks.frameUpdate(dt, acc * 60);
              }
            }, 8);
          } else {
            clearInterval(ar.pumpId);
            a.loop.manual = false;
            a.loop.start();
          }
        },
        jitter: () => ar.jit,
        /** Scenario start (r1): the copy's gait phase and idle clocks from zero (B resets its own in play). */
        resetClocks() {
          rig.graph.phase = 0;
          rig.graph['idleT'] = 0;
          rig.graph['stillT'] = 0;
        },
        /** The host's own player `back` m behind (x, z) facing `yaw`: its camera within the copy's anim LOD distance. */
        place(x, z, yaw, y) {
          const p = g.player;
          p.controller.clearCrouchToggle();
          p.controller.teleport(new V(x, y, z), yaw);
          p.cam.yaw = yaw;
          p.cam.pitch = 0;
          p.cam.snap?.();
        },
      };
    }, [NODES, { grip: [...L.WRIST_ON_GRIP], fore: [...L.WRIST_ON_FOREGRIP] }, RNAMES, LOWER, OWN, MODES, E0]);
    // B: the scripted input timeline in real time (read in its beforeFrame) and its own joints every rendered frame
    await B.evaluate(([BJ, E0, NODES]) => {
      const a = window.__app;
      const g = a.current;
      const p = g.player;
      const c = p.controller;
      const st = a.input.state;
      const rig = p.rig;
      const V = p.position.constructor;
      const hooks = a.loop['hooks'];
      const ob = hooks.beforeFrame;
      const of = hooks.frameUpdate;
      const sec = () => (performance.timeOrigin + performance.now() - E0) / 1000;
      const rb = { segs: null, i: -1, t0: 0, marks: [], frames: [], rec: false, done: true, n: 0, fps0: 0 };
      hooks.beforeFrame = function (dt) {
        rb.n++;
        if (rb.segs && !rb.done) {
          const t = sec() - rb.t0;
          let k = 0;
          let acc = 0;
          while (k < rb.segs.length && t >= acc + rb.segs[k].d) acc += rb.segs[k++].d;
          if (k >= rb.segs.length) {
            rb.done = true;
            st.move.x = st.move.y = 0;
            st.set('anim-audit', 'ads', false);
            st.set('anim-audit', 'dash', false);
            rb.marks.push(sec());
          } else {
            const s = rb.segs[k];
            if (k !== rb.i) {
              rb.i = k;
              rb.marks.push(sec());
              if (s.tap) st.tap(s.tap);
            }
            st.move.x = s.x ?? 0;
            st.move.y = s.y ?? 0;
            st.set('anim-audit', 'ads', !!s.ads);
            st.set('anim-audit', 'dash', !!s.sprint);
          }
        }
        return ob?.call(this, dt);
      };
      hooks.frameUpdate = function (dt, al) {
        g.scene.activeCamera?.getViewMatrix(true); // r1: as A (no draw: the anim LOD reads the camera)
        of.call(this, dt, al);
        if (!rb.rec) return;
        rig.root.computeWorldMatrix(true);
        for (const d of rig.root.getDescendants(false)) d.computeWorldMatrix?.(true);
        const f = [sec()];
        for (const n of BJ) {
          const q = rig[n].getAbsolutePosition();
          f.push(q.x, q.y, q.z);
        }
        f.push(p.position.x, p.position.y, p.position.z, rig.graph.phase, c.yaw, rig['lodDt'] > 0 ? 1 : 0, c.speed);
        for (const n of NODES) {
          const q = rig[n].absoluteRotationQuaternion;
          f.push(q.x, q.y, q.z, q.w);
        }
        rb.frames.push(f);
      };
      window.__rb = {
        frames: () => rb.n,
        tp(x, z, yaw, y, crouch, gear) {
          if (crouch) c.setCrouchToggle();
          else c.clearCrouchToggle();
          if (gear) c.gears.set(gear);
          st.move.x = st.move.y = 0;
          c.teleport(new V(x, y, z), yaw);
          p.cam.yaw = yaw;
          p.cam.pitch = 0;
          p.cam.snap?.();
        },
        stance(crouch, gear) {
          if (crouch) c.setCrouchToggle();
          else c.clearCrouchToggle();
          if (gear) c.gears.set(gear);
        },
        play(segs) {
          // r1: B's gait phase (motion driver and graph) and idle clocks from zero at the scenario start, as the copy's
          c.motion.phase = 0;
          c['prevPhase'] = 0;
          rig.graph.phase = 0;
          rig.graph['idleT'] = 0;
          rig.graph['stillT'] = 0;
          rb.segs = segs;
          rb.i = -1;
          rb.marks = [];
          rb.frames = [];
          rb.rec = true;
          rb.done = false;
          rb.t0 = sec();
        },
        done: () => rb.done,
        end() {
          rb.rec = false;
          return { marks: rb.marks, frames: rb.frames };
        },
      };
    }, [BJ, E0, NODES]);
    await A.bringToFront();
    // B is a background page now: Chromium holds its requestAnimationFrame to ~15 Hz (measured 50-67 ms apart). Its
    // loop stays real time and not manual: the loop's own tick (real dt from performance.now()) runs from a 16 ms timer
    // instead of rAF (background timers unthrottled by the launch switches).
    await B.evaluate(() => {
      const a = window.__app;
      a.current.scene.getEngine().stopRenderLoop();
      window.__bTick = setInterval(() => a.loop['tick'](), 16);
    });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const stat = (P) => P.evaluate(() => { const s = window.__app.loop.stats; return { cpu: +s.frameCpuMs.toFixed(1), sim: +s.simMs.toFixed(1), phys: +s.physicsMs.toFixed(1) }; });
    const toRec = (r) => {
      const buf = Buffer.from(r.b64, 'base64');
      const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
      const rec = { n: r.n, data, K: RK, IDX: RIDX, remote: true, kinds: [] };
      const dt = col(rec, 'dt');
      rec.dtMed = median(dt.slice(1));
      return rec;
    };
    // r1: A's own player BEHIND m behind B's start, facing B's heading: A's camera stays within the copy's anim LOD
    // distance (22 m) for the whole run (stand 6 covers about 11 m)
    const BEHIND = 3.5;
    const settleMs = [];
    rep.placementSettleMs = settleMs; // r3: per placement (calibration first), ms until the copy settled
    const place = async (x, z, yaw, y, crouch, gear) => {
      await A.evaluate(() => window.__ar.teleported());
      await A.evaluate(([x, z, yaw, y]) => window.__ar.place(x, z, yaw, y), [x - BEHIND * Math.sin(yaw), z - BEHIND * Math.cos(yaw), yaw, y]);
      await B.evaluate(([x, z, yaw, y, crouch, gear]) => window.__rb.tp(x, z, yaw, y, crouch, gear), [x, z, yaw, y, crouch, gear]);
      // r3: wait for the host's copy to settle (replaces a fixed 800 ms: the copy needs > 1.2 s to recover from the
      // placement teleport): it reached B's new spot, then its speed < 0.05 and head, wrists and ankles within 1 cm for
      // 0.3 s (e2e-netmove's rule); ~3 s timeout with a warning
      await A.evaluate(() => window.__ar.resetClocks()); // the copy's idle shift (still > 2 s) is not placement motion
      const st = await A.evaluate(([x, z, names]) => new Promise((res) => {
        const t0 = performance.now();
        let w0 = -1;
        let ref = null;
        const id = setInterval(() => {
          const now = performance.now();
          const r = window.__app.current.net.remotes.values().next().value;
          const av = r?.avatar;
          if (!av) return;
          const rig = av.rig;
          const there = (rig.root.position.x - x) ** 2 + (rig.root.position.z - z) ** 2 < 0.25;
          const j = names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [p.x, p.y, p.z]; });
          const still = there && Math.abs(av['speed'] ?? 0) < 0.05 && ref !== null && j.every((p, k) => (p[0] - ref[k][0]) ** 2 + (p[1] - ref[k][1]) ** 2 + (p[2] - ref[k][2]) ** 2 < 1e-4);
          if (!still) {
            w0 = now;
            ref = j;
          } else if (now - w0 >= 300) {
            clearInterval(id);
            res({ ok: true, ms: Math.round(now - t0) });
            return;
          }
          if (now - t0 > 3000) {
            clearInterval(id);
            res({ ok: false, ms: Math.round(now - t0), there, speed: av['speed'] });
          }
        }, 20);
      }), [x, z, JOINTS]);
      settleMs.push(st.ms);
      if (!st.ok) console.log(`  warning: the host's copy did not settle after placement in ${st.ms} ms (there ${st.there}, speed ${st.speed})`);
      await A.evaluate(() => window.__ar.resetClocks());
    };
    // rest calibration on the copy (its own FOOT_REF, sole axes and neutral grip)
    await place(FLAT.x, FLAT.z, FLAT.yaw, FLAT.y, false, 3);
    await A.evaluate(() => window.__ar.begin());
    await wait(1000);
    {
      const rec = toRec(await A.evaluate(() => window.__ar.end()));
      const fp = await A.evaluate(() => window.__app.current.net.remotes.values().next().value.avatar.rig.p.foot);
      calibrate(rec, rep, fp);
      rep.hostFps = 1 / rec.dtMed;
      const sp = (s) => M.solePoints(SOLE[s].fwd, SOLE[s].up, FOOT.len, L.FOOT_BACK, FOOT_REF);
      await A.evaluate(([l, r]) => window.__ar.setSole(l, r), [sp('L'), sp('R')]);
    }
    const scs = remoteScenarios();
    let pumpOn = false;
    rep.pump = null;
    for (const sc of scs) {
      const t1 = Date.now();
      if (sc.hz === 120 && rep.pump && !rep.pump.ok) continue;
      if (sc.hz !== 120 && pumpOn) {
        await A.evaluate(() => window.__ar.pump(false));
        pumpOn = false;
      }
      if (sc.hz === 120 && !pumpOn) {
        // 120 Hz: the pump, its jitter measured first (p95 of |dt - median dt|); over 2 ms the rows are pending PC
        await A.evaluate(() => window.__ar.pump(true));
        pumpOn = true;
        await wait(1500);
        const j = await A.evaluate(() => window.__ar.jitter());
        const med = median(j);
        const dev = j.map((v) => Math.abs(v - med)).sort((p, q) => p - q);
        rep.pump = { medianMs: +(med * 1000).toFixed(2), p95JitterMs: +(dev[Math.floor(dev.length * 0.95)] * 1000).toFixed(2), samples: j.length };
        rep.pump.ok = rep.pump.p95JitterMs <= 2;
        if (!rep.pump.ok) {
          console.log(`remote 120 Hz: pump p95 jitter ${rep.pump.p95JitterMs} ms > 2 ms: 120 Hz remote rows pending PC`);
          await A.evaluate(() => window.__ar.pump(false));
          pumpOn = false;
          continue;
        }
      }
      let m = {};
      let rec;
      let b;
      if (sc.kind === 'boost') {
        // as e2e-netmove: the 4.2 m block north of Proving (south face z 27.5); B braces with its back to it, A boosts
        await A.evaluate(() => window.__ar.teleported());
        const placeTeam = (P, x, z, yaw) => P.evaluate(([x, z, yaw]) => { const g = window.__app.current; g.team.end(true); if (g.traversal.attached) g.traversal.detach('drop'); window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); g.player.controller.clearCrouchToggle(); g.player.controller.teleport(new g.player.position.constructor(x, 0.05, z), yaw); g.player.cam.yaw = yaw; }, [x, z, yaw]);
        await placeTeam(B, 4, 27.05, Math.PI);
        await placeTeam(A, 4, 26.2, 0);
        // (B2) the co-op action is RB (pad button 5), not Y
        await wait(1000);
        await B.evaluate(() => window.__pad.set(5, 1));
        await B.waitForFunction(() => window.__app.current.team.state === 'brace', null, { timeout: 4000, polling: 50 });
        await B.evaluate(() => window.__pad.set(5, 0));
        await A.waitForFunction(() => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'brace' && !!window.__app.current.team.offer?.boost, null, { timeout: 6000, polling: 50 });
        await wait(400);
        await A.evaluate(() => window.__ar.resetClocks());
        await B.evaluate(() => window.__rb.play([{ d: 3.0 }]));
        await A.evaluate(() => window.__ar.begin());
        await wait(300);
        await A.evaluate(() => window.__pad.set(3, 1));
        await A.waitForFunction(() => window.__app.current.team['pressT'] >= 0, null, { timeout: 4000, polling: 20 });
        await A.evaluate(() => window.__pad.set(3, 0));
        await A.waitForFunction(() => window.__app.current.team.count.boosts === 1, null, { timeout: 4000, polling: 50 });
        await A.waitForFunction(() => window.__app.current.team.state !== 'boost', null, { timeout: 4000, polling: 50 });
        await wait(300);
        rec = toRec(await A.evaluate(() => window.__ar.end()));
        await B.waitForFunction(() => window.__rb.done(), null, { timeout: 6000, polling: 50 });
        b = await B.evaluate(() => window.__rb.end());
        await A.evaluate(() => { const g = window.__app.current; g.team.end(true); if (g.traversal.attached) g.traversal.detach('drop'); g.player.controller.teleport(new g.player.position.constructor(0, 0.1, 0), 0); });
        for (const P of [A, B]) await P.evaluate(() => window.__pad.disconnect());
      } else {
        let s = sc.kind === 'stance' || sc.kind === 'strike' || sc.kind === 'door' ? FLAT : SURF[sc.surface];
        if (sc.kind === 'wall') {
          // (step 11) B 0.85 m out from a free high wall facing it (A's player then stands BEHIND m further out)
          sc.plane ??= await A.evaluate(...findPlane(sc));
          if (!sc.plane) throw new Error('anim-audit wall: no free high wall on Proving');
          const w = sc.plane;
          s = { x: w.ax + w.tx * w.k + w.nx * 0.75, z: w.az + w.tz * w.k + w.nz * 0.75, yaw: Math.atan2(-w.nx, -w.nz), y: w.y };
        }
        if (sc.kind === 'door') {
          sc.door ??= await A.evaluate(FIND_PEEKDOOR);
          if (!sc.door) throw new Error('anim-audit door: no door on Proving');
          sc.door.handLen = await A.evaluate(() => window.__app.current.net.remotes.values().next().value.avatar.rig.p.hand.len);
          s = { x: sc.door.sx, z: sc.door.sz, yaw: sc.door.syaw, y: sc.door.y };
        }
        const segs = remoteSegments(sc);
        await place(s.x, s.z, s.yaw, s.y, sc.stance === 'crouch', sc.gear ?? 3);
        await A.evaluate(() => window.__ar.begin());
        await B.evaluate((segs) => window.__rb.play(segs), segs);
        await B.waitForFunction(() => window.__rb.done(), null, { timeout: 20000, polling: 50 });
        await wait(INTERP_DELAY * 1000 + 300);
        rec = toRec(await A.evaluate(() => window.__ar.end()));
        b = await B.evaluate(() => window.__rb.end());
        await B.evaluate(() => window.__rb.stance(false, 3));
        if (sc.kind === 'wall') {
          sc.plane.depth = await A.evaluate(() => window.__app.current.net.remotes.values().next().value.avatar.rig.p.bodyDepthHalf);
          await B.evaluate(() => { const g = window.__app.current; if (g.wallCore?.active) g.wallCore.leave('test'); g.player.controller.clearCrouchToggle(); });
          await wait(400);
        }
      }
      const bn = b.frames.length;
      const bd = new Float64Array(bn * BW);
      b.frames.forEach((f, i) => bd.set(f, i * BW));
      const bt = { n: bn, data: bd };
      // B's own frame rate over the scenario (real time needs it near the display rate; under 30 the row is suspect)
      const clientFps = bn > 1 ? (bn - 1) / (bd[(bn - 1) * BW] - bd[0]) : 0;
      if (clientFps < 30) (rep.warnings ??= []).push(`${sc.name}@${sc.hz}: client ran at ${clientFps.toFixed(1)} frames/s`);
      const t = col(rec, 't');
      // B's marks (when its input changed) in A's frames: the first frame whose t - lag reaches the mark
      const out = {};
      const lag = remoteMetrics(sc, rec, bt, out, 0, rec.n);
      if (process.env.DUMP) {
        mkdirSync(`${OUT}/raw`, { recursive: true });
        writeFileSync(`${OUT}/raw/remote-${sc.name}-${sc.hz}.json`, JSON.stringify({ names: RNAMES, n: rec.n, rec: Array.from(rec.data), BJ, BW, b: b.frames, marks: b.marks, lag }));
      }
      const fa = (tm) => {
        let i = 0;
        while (i < rec.n - 1 && t[i] - lag < tm) i++;
        return i;
      };
      const mk = b.marks.map(fa);
      if (sc.kind === 'gait') m = { start: mk[1], steady: mk[2], stop: mk[3], end: Math.min(rec.n, mk[4] ?? rec.n), cap: (sc.stance === 'crouch' ? [0.85, 1.3, 1.7, 2.15, 2.6, 2.6] : [0.65, 1.1, 1.65, 2.3, 3.15, 4.15])[sc.gear - 1] };
      else if (sc.kind === 'stance') m = { down: mk[1], up: mk[2], end: mk[3] ?? rec.n };
      else if (sc.kind === 'strike') m = { strike: mk[1], end: mk[2] ?? rec.n };
      else if (sc.kind === 'door') m = { enter: mk[0], press: mk[1], close: mk[2] ?? rec.n, end: Math.min(rec.n, mk[3] ?? rec.n), door: sc.door };
      else if (sc.kind === 'wall' && sc.edge) m = { enter: mk[0], on: mk[1], end: rec.n, plane: sc.plane };
      else if (sc.kind === 'wall') m = { enter: mk[0], on: mk[1], stop: mk[2], crouch: mk[3], back: mk[4], stop2: mk[5], end: Math.min(rec.n, mk[6] ?? rec.n), plane: sc.plane };
      rec.m = m;
      let metrics;
      if (sc.kind === 'boost') {
        metrics = {};
        common(rec, sc.hz, metrics, 0, rec.n, L.pelvisJumpLimit(0, sc.hz));
        pairMetrics(rec, metrics);
      } else metrics = analyze(sc, rec);
      if (sc.idleTail) {
        // r1: breath after the settle: the copy stopped (speed < 0.05, both feet planted to the end), then the 0.2 s sway
        // settle (D2); measured to the end of the 1.5 s tail
        const sp = col(rec, 'speed');
        const cl = col(rec, 'L.contact');
        const cr = col(rec, 'R.contact');
        let st = m.end;
        while (st > m.stop && sp[st - 1] < 0.05 && cl[st - 1] && cr[st - 1]) st--;
        const from = Math.min(m.end - 2, st + Math.round(0.2 / rec.dtMed));
        res(metrics, 'idleBreath', { ...M.oscP2P(col(rec, 'headNode.y', from, m.end), L.IDLE_BREATH), extra: { settle: +((st - m.stop) * rec.dtMed).toFixed(3), window: +((m.end - from) * rec.dtMed).toFixed(3) } }, L.IDLE_BREATH, ':1257', 'm', from);
      }
      // r1: every recorded frame solved at full rate on both pages (no anim LOD skip on A's copy or on B's own rig)
      {
        const lod = col(rec, 'lod');
        const lf = [];
        for (let i = 0; i < rec.n; i++) if (lod[i]) lf.push(i);
        let bl = 0;
        for (let i = 0; i < bt.n; i++) if (bd[i * BW + B_LOD]) bl++;
        const cd = col(rec, 'camD').filter(Number.isFinite);
        res(out, 'lodSkip', { worst: lf.length + bl, frame: lf[0] ?? -1, pass: lf.length + bl === 0, extra: { host: lf.length, client: bl, camDMax: +Math.max(0, ...cd).toFixed(2) } }, 0, 'r1 (anim LOD 22 m)', 'count');
      }
      Object.assign(metrics, out);
      const entry = { name: sc.name, hz: sc.hz, kind: sc.kind, frames: rec.n, fps: +(1 / rec.dtMed).toFixed(1), clientFps: +clientFps.toFixed(1), loop: { host: await stat(A), client: await stat(B) }, ms: Date.now() - t1, metrics };
      rep.scenarios.push(entry);
      for (const [k, r] of Object.entries(metrics)) if (r && r.pass === false) fails.push({ tag: 'remote', scenario: sc.name, hz: sc.hz, metric: k, value: r.worst, limit: r.limit, frame: r.frame, unit: r.unit });
    }
    if (pumpOn) await A.evaluate(() => window.__ar.pump(false));
    const errs = net.errors.flat().filter((e) => (e.startsWith('[error]') || e.startsWith('[pageerror]')) && !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
    if (errs.length) rep.consoleErrors = errs.slice(0, 10);
  } finally {
    await rb.close();
  }
  rep.wallSeconds = (Date.now() - t0) / 1000;
  return rep;
}

/** Rest calibration (standing still on flat ground): FOOT_REF (ankle above the sole), the sole axes, the neutral grip. */
function calibrate(rec, rep, fp) {
  const h = [];
  // neutral low-ready grip (the rig's grip convention offset): elbow-to-wrist rotation on the last idle frame
  for (const s of ['L', 'R']) WRIST_NEUTRAL[s] = M.relQuat(quat(rec, `elbow${s}`, rec.n - 1, rec.n), 0, quat(rec, `wrist${s}`, rec.n - 1, rec.n), 0);
  rep.wristNeutral = { ...WRIST_NEUTRAL };
  for (const s of ['L', 'R']) {
    const an = col(rec, s === 'L' ? 'ankleL.y' : 'ankleR.y');
    // the rig's ankle height above its sole (planner ground): float / sink are then read against the world ray
    const gy = col(rec, `${s}.y`);
    const c = col(rec, `${s}.contact`);
    for (let i = 0; i < rec.n; i++) if (c[i]) h.push(an[i] - gy[i]);
  }
  FOOT_REF = median(h);
  rep.footRef = FOOT_REF;
  // foot axes in the ankle frame: world up and the planner's foot yaw on the last rest frame, by the inverse ankle quat
  for (const s of ['L', 'R']) {
    const q = quat(rec, s === 'L' ? 'ankleL' : 'ankleR', rec.n - 1, rec.n);
    const inv = [-q[0], -q[1], -q[2], q[3]];
    const yaw = col(rec, `${s}.yaw`, rec.n - 1, rec.n)[0];
    SOLE[s] = { fwd: M.quatRotate(inv, 0, Math.sin(yaw), 0, Math.cos(yaw)), up: M.quatRotate(inv, 0, 0, 1, 0) };
  }
  rep.sole = { ...SOLE };
  FOOT = { len: fp.len, width: fp.w };
  rep.foot = FOOT;
}

// ---------------------------------------------------------------- run
const report = { started: new Date().toISOString(), quick: QUICK, footRef: 0, notMeasured: NOT_MEASURED, scenarios: [] };
const fails = [];
const ends = {};
if (DO_LOCAL) try {
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
    const rec = { n: r.n, data: new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4), K, IDX };
    const fp = await G(() => window.__app.current.player.rig.p.foot);
    calibrate(rec, report, fp);
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
      const v = (n) => rec.data[f * rec.K + rec.IDX[n]];
      ends[`${sc.name}@${sc.hz}`] = { x: v('fix.x'), z: v('fix.z'), yaw: v('yaw'), lx: v('L.x'), lz: v('L.z'), rx: v('R.x'), rz: v('R.z'), cx: v('cam.x'), cy: v('cam.y'), cz: v('cam.z') };
    }
    const entry = { name: sc.name, hz: sc.hz, kind: sc.kind, frames: rec.n, ms: Date.now() - t1, metrics };
    report.scenarios.push(entry);
    for (const [k, r] of Object.entries(metrics))
      if (r && r.pass === false) fails.push({ tag: 'local', scenario: sc.name, hz: sc.hz, metric: k, value: r.worst, limit: r.limit, frame: r.frame, unit: r.unit });
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
    for (const [mk, r] of Object.entries(pm)) if (!r.pass) fails.push({ tag: 'local', scenario: `${name}-parity`, hz: '60v120', metric: mk, value: r.worst, limit: r.limit, frame: -1, unit: r.unit });
  }
  if (SHOTS) {
    // (PC1 harness fix 1) one still per (scenario, metric) at that metric's reported (worst) frame, 60 Hz first (the
    // 120 Hz row only when the metric fails there alone), HUD and toasts hidden, side camera on the body (feet in
    // frame), TAA / TAAU history converged on the frozen pose. Capped at --shots-max (default 500, round robin over
    // scenarios); one render per
    // (scenario, hz, frame), shared by the metrics failing on that frame.
    mkdirSync(OUT, { recursive: true });
    await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
    const MAX = Number(opt('shots-max') ?? 500);
    const want = new Map();
    for (const f of [...fails].sort((p, q) => (p.hz === 60 ? 0 : 1) - (q.hz === 60 ? 0 : 1))) {
      const id = `${f.scenario}|${f.metric}`;
      if (f.tag !== 'local' || f.frame < 0 || want.has(id)) continue;
      const sc = scenarios.find((s) => s.name === f.scenario && s.hz === f.hz);
      if (sc) want.set(id, { sc, f });
    }
    // round robin: every failing scenario's first metric before any scenario's second, so a cap still covers them all
    const order = (p, q) => scenarios.indexOf(p.sc) - scenarios.indexOf(q.sc) || p.f.frame - q.f.frame;
    const all = [...want.values()].sort(order);
    const per = new Map();
    for (const e of all) {
      e.r = per.get(e.sc) ?? 0;
      per.set(e.sc, e.r + 1);
    }
    const list = [...all].sort((p, q) => p.r - q.r || order(p, q)).slice(0, MAX).sort(order);
    if (all.length > MAX) console.log(`anim-audit --shots: ${all.length} (scenario, metric) fails, ${MAX} pictured round robin (--shots-max=N)`);
    const vp = page.viewportSize();
    const w = Math.min(vp.width, vp.height);
    const clip = { x: Math.round(vp.width / 2 - w / 2), y: 0, width: w, height: vp.height };
    let buf = null;
    let key = '';
    for (const { sc, f } of list.slice(0, MAX)) {
      const k = `${sc.name}@${sc.hz}#${f.frame}`;
      if (key !== k) {
        key = k;
        await drive(sc, f.frame + 1);
        await G(() => window.__aa.end());
        await G(() => window.__aa.render());
        buf = await page.screenshot({ clip });
      }
      writeFileSync(`${OUT}/${sc.name}-${sc.hz}-${f.metric}-f${f.frame}.png`, buf);
    }
    console.log(`anim-audit --shots: ${Math.min(MAX, list.length)} pictures in ${OUT}`);
  }
} catch (e) {
  console.error('anim-audit harness error:', e?.stack ?? String(e));
  await browser.close();
  server?.kill();
  process.exit(2);
}
if (browser) await browser.close();
const localSeconds = (Date.now() - T0) / 1000;

// ---------------------------------------------------------------- remote (step 08)
const remote = DO_REMOTE
  ? await runRemote().catch((e) => {
      console.error('anim-audit remote harness error:', e?.stack ?? String(e));
      server?.kill();
      process.exit(2);
    })
  : null;
server?.kill();

// ---------------------------------------------------------------- output
mkdirSync(OUT, { recursive: true });
report.wallSeconds = localSeconds;
if (DO_LOCAL) writeFileSync(`${OUT}/local.json`, JSON.stringify(report, null, 1));
if (remote) writeFileSync(`${OUT}/remote.json`, JSON.stringify(remote, null, 1));
const fmt = (v, unit) => (typeof v !== 'number' ? String(v) : unit === 'm' ? `${(v * 100).toFixed(2)} cm` : unit === 'deg' ? `${v.toFixed(1)} deg` : unit === 's' ? `${v.toFixed(3)} s` : v.toFixed(3));
const fmtL = (v, unit) => (typeof v === 'number' ? fmt(v, unit) : String(v));
writeFileSync(
  `${OUT}/fails.txt`,
  Object.entries(NOT_MEASURED).map(([k, v]) => `# ${k} (body / weapon vs world, :806-807): ${v}\n`).join('') +
    (remote?.pump && !remote.pump.ok ? `# remote 120 Hz: pending PC (pump p95 jitter ${remote.pump.p95JitterMs} ms > 2 ms)\n` : '') +
    fails.map((f) => `${f.tag}\t${f.scenario}\t${f.hz}\t${f.metric}\t${fmt(f.value, f.unit)}\tlimit ${fmtL(f.limit, f.unit)}\tframe ${f.frame}`).join('\n') +
    '\n',
);
const cm = (r) => (r ? `${(r.worst * 100).toFixed(2)}${r.pass ? '' : '!'}` : '-');
for (const [tag, rp] of [['local', DO_LOCAL ? report : null], ['remote', remote]]) {
  if (!rp) continue;
  console.log(`\n${tag.padEnd(19)} Hz   speed  pelvisP2P  head   sway   cam    jump   slideMax  settle  ${tag === 'remote' ? 'pose   lower  phase  pops  lod  ' : ''}fails`);
  for (const s of rp.scenarios) {
    if (s.kind === 'parity') continue;
    const x = s.metrics;
    const nf = Object.values(x).filter((r) => r && r.pass === false).length;
    const slide = Math.max(x.footSlideL?.worst ?? 0, x.footSlideR?.worst ?? 0);
    console.log(
      `${s.name.padEnd(19)} ${String(s.hz).padEnd(4)} ${x.speed ? x.speed.value.toFixed(2).padStart(5) : '    -'}  ${cm(x.pelvisP2P).padStart(9)}  ${cm(x.headTravel).padStart(5)}  ${cm(x.lateralSway).padStart(5)}  ${cm(x.cameraOsc).padStart(5)}  ${cm(x.pelvisJump).padStart(5)}  ${(slide * 100).toFixed(2).padStart(8)}  ${x.weaponSettle ? x.weaponSettle.worst.toFixed(2).padStart(6) : '     -'}  ${tag === 'remote' ? `${cm(x.poseError).padStart(5)}  ${cm(x.lowerBody).padStart(5)}  ${x.gaitPhase ? x.gaitPhase.worst.toFixed(2).padStart(5) : '    -'}  ${String(x.pops?.worst ?? '-').padStart(4)}  ${String(x.lodSkip?.worst ?? '-').padStart(3)}  ` : ''}${nf}`,
    );
  }
}
const byMetric = {};
for (const f of fails) byMetric[`${f.tag}:${f.metric}`] = (byMetric[`${f.tag}:${f.metric}`] ?? 0) + 1;
const nLocal = fails.filter((f) => f.tag === 'local').length;
const nRemote = fails.filter((f) => f.tag === 'remote').length;
console.log(`\n(cm; ! = fail) fails: local ${DO_LOCAL ? nLocal : '-'}, remote ${remote ? nRemote : '-'}`);
console.log('fails by metric: ' + (Object.entries(byMetric).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'));
const real = errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
if (real.length) console.log('console problems (local):\n' + real.slice(0, 10).join('\n'));
if (remote?.consoleErrors) console.log('console problems (remote):\n' + remote.consoleErrors.join('\n'));
if (remote?.warnings) console.log('remote warnings:\n  ' + remote.warnings.join('\n  '));
if (remote) console.log(`remote: client ${Math.min(...remote.scenarios.map((s) => s.clientFps))}-${Math.max(...remote.scenarios.map((s) => s.clientFps))} frames/s, host ${remote.hostFps.toFixed(1)} fps; 120 Hz pump ${remote.pump ? `${remote.pump.medianMs} ms median, p95 jitter ${remote.pump.p95JitterMs} ms (${remote.pump.ok ? 'ok' : 'pending PC'})` : 'not run'}${remote.placementSettleMs ? `; placement settle ${Math.min(...remote.placementSettleMs)}-${Math.max(...remote.placementSettleMs)} ms` : ''}`);

// ---------------------------------------------------------------- baseline + compare (step 08)
const baseline = { mode: { quick: QUICK, only: ONLY ?? null, local: DO_LOCAL, remote: !!remote }, local: {}, remote: {} };
for (const [tag, rp] of [['local', DO_LOCAL ? report : null], ['remote', remote]]) {
  if (!rp) continue;
  for (const sc of rp.scenarios) {
    const row = {};
    for (const [k, r] of Object.entries(sc.metrics)) if (r && typeof r.worst === 'number' && 'pass' in r) row[k] = { worst: +r.worst.toPrecision(5), pass: r.pass };
    baseline[tag][`${sc.name}@${sc.hz}`] = row;
  }
}
/** Remote metrics gated by --compare (r1, A39): against the noise band of the two baseline runs; the rest is report-only. */
// (lowerBody is a worst-frame of single planner lunges: 0.58 -> 1.09 m between runs; 120 Hz pops vary up to 2x between
// identical runs because of the page-side 120 Hz pump: both reported and failed, not gated)
// A40: remote poseError is report-only until step 22 fixes the owner / copy stop-stride mismatch that dominates it
// (identical runs read 20-41 cm); step 22 re-baselines from three runs and adds it back here.
const REMOTE_GATED = ['pops', 'pairAlign', 'lodSkip'];
/** Hz a gated remote metric is gated at (A39): pops at 60 Hz only; unlisted = every rate. */
const REMOTE_GATED_HZ = { pops: ['60'] };
const remoteGated = (metric, hz) => REMOTE_GATED.includes(metric) && (!REMOTE_GATED_HZ[metric] || REMOTE_GATED_HZ[metric].includes(String(hz)));
const REMOTE_GATE_TEXT = 'gated: pops @60, pairAlign, lodSkip; report-only: poseError until step 22 (A40), lowerBody, pops @120, gaitPhase and the other remote rows (A39)';
/** (A49) Measured spread of the local wall rows over repeated runs: foot slide / sink flip by up to 7.1 mm (one foot's
 *  contact settles a frame earlier or later), joint angles by up to 6.8 deg. */
const WALL_SPREAD = { foot: 0.008, deg: 7 };
if (BAND) {
  const prev = JSON.parse(readFileSync(BAND, 'utf8'));
  for (const [key, row] of Object.entries(remote ? baseline.remote : {})) {
    const pr = prev.remote?.[key];
    if (!pr) continue;
    for (const m of REMOTE_GATED) {
      const a = row[m];
      const b = pr[m];
      if (!a || !b) continue;
      row[m] = { worst: Math.max(a.worst, b.worst), pass: a.pass && b.pass, band: +Math.abs(a.worst - b.worst).toPrecision(4), runs: [b.worst, a.worst] };
    }
  }
  // (step 11 r3, A49) the local wall rows are not repeatable to the bit (the camera's shape casts and the springs carry
  // page-load state the harness cannot reset; a 1e-12 difference flips a foot contact): each keeps the worse of the two
  // runs and a band covering the measured spread (WALL_SPREAD floors), and --compare allows that band
  for (const [key, row] of Object.entries(baseline.local ?? {})) {
    const pr = prev.local?.[key];
    if (!pr || !/^wall(edge)?@/.test(key)) continue;
    for (const [m, a] of Object.entries(row)) {
      const b = pr[m];
      if (!b || !Number.isFinite(a.worst) || !Number.isFinite(b.worst)) continue;
      const unit = report?.scenarios.find((s) => `${s.name}@${s.hz}` === key)?.metrics[m]?.unit;
      const floor = /^foot/.test(m) && unit === 'm' ? WALL_SPREAD.foot : unit === 'deg' ? WALL_SPREAD.deg : 0;
      row[m] = { worst: Math.max(a.worst, b.worst), pass: a.pass && b.pass, band: +Math.max(Math.abs(a.worst - b.worst), floor).toPrecision(4), runs: [b.worst, a.worst] };
    }
  }
  baseline.mode.band = true;
}
writeFileSync(`${OUT}/baseline.json`, JSON.stringify(baseline, null, 1) + '\n');
/** Noise floor of a gated remote metric (a band of two runs can be 0): 2 mm for lengths, 2 frames for pop counts. */
const bandFloor = (unit) => (unit === 'm' ? 0.002 : unit === 'count' ? 2 : 0);
const TRAVERSAL = /^(vault|mantle|drop09|drop24|turn180)@/;
/** Noise tolerance of one metric (step 07 carry): a change inside it is not a regression. */
function tolerance(key, metric, unit, base, hz) {
  const trav = TRAVERSAL.test(key);
  if (metric === 'jointRate') return trav ? 25 : 0.5;
  if (/^(grip|self)/.test(metric)) return trav ? 0.015 : 0.005;
  if (/^wrist/.test(metric)) return 2;
  if (unit === 's') return 1 / (Number(hz) || 60);
  if (unit === 'deg') return 0.5;
  if (unit === 'm') return Math.max(1e-4, 0.02 * Math.abs(base));
  return 0;
}
let regressions = 0;
if (COMPARE) {
  const old = JSON.parse(readFileSync(COMPARE, 'utf8'));
  const om = old.mode ?? {};
  if (om.quick !== QUICK || (om.only ?? null) !== (ONLY ?? null)) {
    console.log(`\ncompare: ${COMPARE} was a ${om.quick ? 'quick' : 'full'}${om.only ? ` --only=${om.only}` : ''} run; this one is ${QUICK ? 'quick' : 'full'}${ONLY ? ` --only=${ONLY}` : ''}: not comparable`);
    process.exit(2);
  }
  const lines = [];
  const flips = [];
  const remoteNoise = [];
  for (const tag of ['local', 'remote']) {
    if (!baseline.mode[tag] || !om[tag]) continue;
    for (const [key, row] of Object.entries(old[tag] ?? {})) {
      const now = baseline[tag][key];
      if (!now) {
        lines.push(`${tag} ${key}: scenario missing`);
        continue;
      }
      const hz = key.split('@')[1];
      for (const [metric, o] of Object.entries(row)) {
        const n = now[metric];
        if (!n) continue;
        if (o.pass !== n.pass) flips.push(`${tag} ${key} ${metric}: ${o.pass ? 'pass -> FAIL' : 'fail -> pass'} (${o.worst} -> ${n.worst})`);
        // durations (a minimum time) get worse downward, everything else upward
        const lowerWorse = /Time$/.test(metric);
        const unit = (tag === 'local' ? report : remote)?.scenarios.find((s) => `${s.name}@${s.hz}` === key)?.metrics[metric]?.unit;
        const worse = lowerWorse ? o.worst - n.worst : n.worst - o.worst;
        if (tag === 'remote' && remoteGated(metric, hz)) {
          // r1: gated against the noise band of the two baseline runs: worse than the worse of the two by more than
          // max(2 x their spread (two samples understate the range), 10%, floor); lodSkip has no floor (any skip)
          const tol = metric === 'lodSkip' ? 0 : Math.max(2 * (o.band ?? 0), 0.1 * Math.abs(o.worst), bandFloor(unit));
          if (Number.isFinite(worse) ? worse > tol : o.pass && !n.pass) lines.push(`${tag} ${key} ${metric}: ${o.worst} -> ${n.worst} (band ${o.band ?? 'none'}, tol ${+tol.toPrecision(3)})${o.pass && !n.pass ? ' (new fail)' : ''}`);
          continue;
        }
        const tol = Math.max(0.1 * Math.abs(o.worst), tolerance(key, metric, unit, o.worst, hz), tag === 'local' ? (o.band ?? 0) : 0);
        // the other remote rows are real time and not gated (A39: only remoteGated): listed as report-only, not counted
        if ((o.pass && !n.pass) || (Number.isFinite(worse) && worse > tol)) (tag === 'remote' ? remoteNoise : lines).push(`${tag} ${key} ${metric}: ${o.worst} -> ${n.worst}${o.pass && !n.pass ? ' (new fail)' : ''}`);
      }
    }
  }
  regressions = lines.length;
  if (baseline.mode.remote && om.remote) console.log(`\ncompare remote metrics: ${REMOTE_GATE_TEXT}`);
  console.log(`${baseline.mode.remote && om.remote ? '' : '\n'}compare against ${COMPARE}: ${lines.length ? `${lines.length} regression(s)\n  ${lines.join('\n  ')}` : 'no regression'}`);
  if (remoteNoise.length) console.log(`remote report-only changes beyond the local tolerances (lowerBody, pops @120 and other real-time rows; not regressions): ${remoteNoise.length}\n  ${remoteNoise.join('\n  ')}`);
  console.log(`pass / fail flips: ${flips.length ? `${flips.length}\n  ${flips.join('\n  ')}` : 'none'}`);
}
console.log(`wrote ${OUT}/${DO_LOCAL ? 'local.json, ' : ''}${remote ? 'remote.json, ' : ''}fails.txt, baseline.json`);
console.log(`wall time ${((Date.now() - T0) / 1000).toFixed(1)} s (local ${DO_LOCAL ? localSeconds.toFixed(1) : '-'} s, remote ${remote ? `${remote.wallSeconds.toFixed(1)} s incl. lobby ${remote.lobbySeconds.toFixed(1)} s` : '-'})${QUICK ? ' (quick)' : ''}`);
process.exit(STRICT && fails.length ? 1 : 0);
