// Animation contact sheet: runs a scenario on Proving Grounds and captures frames from a side camera
// that follows the player, then lays them out in a grid (for reviewing blends and timing).
//   node scripts/anim-sheet.mjs out.png <scenario> [frames=12] [interval=0.1] [view=side|front|back|ots]
// Scenarios: aim, walk, jog, sneak, crouchrun, sprint, start, stop, crouchstop, walkstop, turn, crouch, reload, swap, grenade,
// vault, dash, strafe; back to a wall (step 11): wall, wallcrouch, wallslide, wallslideleft, walledge, walledgeleft, lowwall
// (edge peek / lean both edges arrive with step 12); aimed edge lean-outs (PC1): walledgeaim, walledgeleftaim and their
// pistol variants walledgeaimp, walledgeleftaimp. reload and swap run drawn (aim held: step 09 holsters by default);
// holsterswap is the holstered swap; turn is a movement turn (the body turns, the sheet camera stays put)
import { launch, waitOperator } from './e2e-lib.mjs';

const [out = 'sheet.png', scenario = 'walk', framesArg = '12', intervalArg = '0.1', view = 'side'] = process.argv.slice(2);
const FRAMES = Number(framesArg);
const INTERVAL = Number(intervalArg);
const url = process.env.URL ?? `http://localhost:${process.env.E2E_PORT ?? 4173}/`;

/** Scenario: setup (once) and per-frame input (time t in s since the first frame). */
const SCENARIOS = {
  walk: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 0.5 }, input: () => ({ y: 0.5 }) },
  jog: { pos: [-8, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }) },
  sneak: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 0.4 }, input: () => ({ y: 0.4 }), at0: "a.input.state.tap('crouch');" },
  crouchrun: { pos: [-8, -14], yaw: Math.PI / 2, pre: 1.5, warm: { y: 1 }, input: () => ({ y: 1 }), at0: "a.input.state.tap('crouch');" },
  sprint: { pos: [-14, -14], yaw: Math.PI / 2, pre: 1.2, warm: { y: 1 }, input: () => ({ y: 1 }), at0: "a.input.state.tap('dash');" },
  start: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }) },
  stop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 1 }, input: () => ({ y: 0 }) },
  // 3.2.0: the Chaos Theory stop holds the stride (crouched, and from a slow walk)
  crouchstop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 1 }, input: () => ({ y: 0 }), at0: "a.input.state.tap('crouch');" },
  walkstop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.3, warm: { y: 0.5 }, input: () => ({ y: 0 }) },
  strafe: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.8, warm: { x: 1 }, input: () => ({ x: 1 }) },
  back: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.8, warm: { y: -1 }, input: () => ({ y: -1 }) },
  // (PC1) a movement turn: the stick asks for a heading 90 deg right of the body (a slow walk that way); the sheet
  // camera stays where it started (fixCam) so the body is seen turning
  turn: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, fixCam: true, input: (t) => ({ x: t < 0.9 ? 0.45 : 0 }) },
  crouch: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('crouch');" } },
  dash: { pos: [0, -18], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }), at: { 0.1: "a.input.state.tap('dash');" } },
  // (PC1) drawn first: aim held from the warm-up (step 09 holsters by default), then the reload (mag set to 1: a full
  // mag ignores the press) / swap
  reload: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "g.weapons.current.mag = 1; a.input.state.tap('reload');" } },
  swap: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.0, warm: { ads: true }, input: () => ({ ads: true }), at: { 0: "a.input.state.tap('swapNext');" } },
  holsterswap: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('swapNext');" } },
  grenade: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('grenade');" } },
  // (locomotion step 11) back to a wall: `wall` places the player 0.85 m out from a free wall on Proving (high, or a
  // low one), facing it, `k` m along it (negative: from the far end); the context press enters during the warm-up
  wall: { wall: { low: false, k: 2.5 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: () => ({}) },
  wallcrouch: { wall: { low: false, k: 2.5 }, pre: 1.8, preAt: { 0.1: "a.input.state.tap('cover');", 0.8: "a.input.state.tap('crouch');" }, input: () => ({}) },
  wallslide: { wall: { low: false, k: 2.5 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: (t) => ({ x: t < 1.2 ? 1 : 0 }) },
  wallslideleft: { wall: { low: false, k: -2.5 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: (t) => ({ x: t < 1.2 ? -1 : 0 }) },
  walledge: { wall: { low: false, k: -1.2 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: () => ({ x: 1 }) },
  walledgeleft: { wall: { low: false, k: 1.2 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: () => ({ x: -1 }) },
  // (PC1) at the edge (slid there in the warm-up, stick released), then aim: the lean-out with its edge grip
  walledgeaim: { wall: { low: false, k: -1.2 }, pre: 2.6, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 2.2 ? 1 : 0 }), input: () => ({ ads: true }) },
  walledgeleftaim: { wall: { low: false, k: 1.2 }, pre: 2.6, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 2.2 ? -1 : 0 }), input: () => ({ ads: true }) },
  walledgeaimp: { weapon: 'pistol', wall: { low: false, k: -1.2 }, pre: 2.6, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 2.2 ? 1 : 0 }), input: () => ({ ads: true }) },
  walledgeleftaimp: { weapon: 'pistol', wall: { low: false, k: 1.2 }, pre: 2.6, preAt: { 0.1: "a.input.state.tap('cover');" }, warm: (t) => ({ x: t > 0.6 && t < 2.2 ? -1 : 0 }), input: () => ({ ads: true }) },
  lowwall: { wall: { low: true, k: 0.8 }, pre: 1.2, preAt: { 0.1: "a.input.state.tap('cover');" }, input: (t) => ({ x: t > 0.6 && t < 1.2 ? 1 : 0 }) },
  aim: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({ ads: true }) },
  vault: { pos: [-3.8, -6], yaw: -Math.PI / 2, pre: 0.8, input: () => ({}), at: { 0: "a.input.state.tap('jump');" } },
};

const sc = SCENARIOS[scenario];
if (!sc) throw new Error(`unknown scenario ${scenario}`);
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
// (operators 11e) Wren's LOD0 on screen before anything is measured or drawn
await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 300000 });
await waitOperator(page);
// (PC1) the toasts too ("Ready to play offline", graphics tier)
await page.addStyleTag({ content: 'body > :not(#game), .hud, .screens, .toasts, .toast { display: none !important; }' });
await page.evaluate(({ pos, yaw, wall, fixCam, weapon }) => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  a.loop.manual = true;
  const V = p.controller.pos.constructor;
  let y = 0;
  if (wall) {
    // a wall segment with open floor in front of it (as e2e-netmove's findWall), low or high as asked
    const clear = (x0, z0, x1, z1, h) => !g.ballistics.ray(new V(x0, h, z0), new V(x1, h, z1), 1).hit;
    const floor = (x, z, h) => g.ballistics.ray(new V(x, h + 1, z), new V(x, h - 0.5, z), 1).hit;
    const segs = g.world.level.coverSegments;
    let found = null;
    for (const s of segs) {
      if (s.low !== wall.low || Math.abs(s.y) > 0.3 || s.len < (wall.low ? 2 : 4) || s.len > 14) continue;
      let ok = true;
      for (let k = 0.5; k < s.len && ok; k += 0.5) {
        const x = s.ax + s.tx * k + s.nx * 0.45;
        const z = s.az + s.tz * k + s.nz * 0.45;
        ok = clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 0.3) && (wall.low || clear(x, z, x + s.nx * 2.5, z + s.nz * 2.5, s.y + 1)) && floor(x + s.nx * 0.6, z + s.nz * 0.6, s.y);
      }
      if (ok) { found = s; break; }
    }
    if (!found) throw new Error(`no free ${wall.low ? 'low' : 'high'} wall on Proving`);
    const k = wall.k < 0 ? found.len + wall.k : wall.k;
    pos = [found.ax + found.tx * k + found.nx * 0.85, found.az + found.tz * k + found.nz * 0.85];
    yaw = Math.atan2(-found.nx, -found.nz);
    y = found.y + 0.05;
  }
  // (PC1) a weapon other than the first: selected holstered (as a holstered swap), drawn by the scenario's aim
  if (weapon) {
    const W = g.weapons;
    const j = W.slots.findIndex((q) => q.def.class === weapon);
    if (j < 0) throw new Error('no ' + weapon + ' in the loadout');
    W.index = j;
    p.controller.speedMul = W.current.def.moveSpeedMult;
    p.cam.adsZoom = W.current.stats.adsZoom;
  }
  p.controller.teleport(new V(pos[0], y, pos[1]), yaw);
  p.cam.yaw = yaw;
  p.cam.pitch = 0;
  window.__camHold = true;
  const origUpdate = p.cam.update.bind(p.cam);
  // camera: follow the player from the chosen view after the normal update
  p.cam.update = (dt, feet, crouch) => {
    origUpdate(dt, feet, crouch);
    const v = window.__view ?? 'side';
    if (v === 'ots') return;
    const c = p.cam.camera;
    const r = p.rig.root.position;
    const fy = fixCam ? yaw : p.controller.renderYaw;
    const fx = Math.sin(fy);
    const fz = Math.cos(fy);
    const off = v === 'front' ? [fx * 3, fz * 3] : v === 'back' ? [-fx * 3, -fz * 3] : [fz * 3.1, -fx * 3.1];
    c.position.set(r.x + off[0], r.y + 1.05, r.z + off[1]);
    c.setTarget(new r.constructor(r.x, r.y + 0.85, r.z));
  };
  a.loop.stepHeadless(0.3);
}, { pos: sc.pos ?? [0, 0], yaw: sc.yaw ?? 0, wall: sc.wall ?? null, fixCam: !!sc.fixCam, weapon: sc.weapon ?? null });
await page.evaluate((v) => (window.__view = v), view);

const setInput = async (inp, code) =>
  page.evaluate(([inp, code]) => {
    const a = window.__app;
    const g = a.current;
    const s = a.input.state;
    s.move.x = inp.x ?? 0;
    s.move.y = inp.y ?? 0;
    if (inp.ads) s.set('sheet-ads', 'ads', true);
    else s.set('sheet-ads', 'ads', false);
    if (code) new Function('a', 'g', code)(a, g);
  }, [inp, code ?? null]);
const step = (sec) => page.evaluate((sec) => window.__app.loop.stepHeadless(sec, 120), sec);

// warm up into the scenario
const pre = sc.pre;
const warm = (t) => (typeof sc.warm === 'function' ? sc.warm(t) : sc.warm ?? {});
if (sc.at0) await setInput(warm(0), sc.at0);
const preAt = sc.preAt ?? {};
for (let t = 0; t < pre; t += 1 / 60) {
  await setInput(warm(t), Object.entries(preAt).find(([k]) => Math.abs(Number(k) - t) < 1 / 120)?.[1] ?? null);
  await step(1 / 60);
}
const shots = [];
const at = sc.at ?? {};
let t = 0;
for (let f = 0; f < FRAMES; f++) {
  // run the interval in small steps, firing timed events
  const end = t + (f === 0 ? 0 : INTERVAL);
  while (t < end - 1e-6) {
    const code = Object.entries(at).find(([k]) => Math.abs(Number(k) - t) < 1 / 120)?.[1];
    await setInput(sc.input(t), code);
    await step(1 / 60);
    t += 1 / 60;
  }
  if (f === 0 && at[0]) await setInput(sc.input(0), at[0]);
  const info = await page.evaluate(() => {
    const g = window.__app.current;
    const c = g.player.controller;
    const r = g.player.rig;
    return `${c.motion.state} ${c.speed.toFixed(2)} ${r.planner.L.contact ? 'L' : '-'}${r.planner.R.contact ? 'R' : '-'}`;
  });
  await new Promise((r) => setTimeout(r, 30));
  const vp = page.viewportSize();
  // (PC1) ots: the whole frame (the centre crop showed only the forearm under ADS); the other views: a body portrait
  const w = view === 'ots' ? vp.width : Math.round(vp.height * 0.75);
  const buf = await page.screenshot({ clip: { x: Math.round(vp.width / 2 - w / 2), y: 0, width: w, height: vp.height } });
  shots.push({ src: `data:image/png;base64,${buf.toString('base64')}`, label: `${t.toFixed(2)}s ${info}` });
}
const cols = Math.min(6, FRAMES);
const [cw, ch] = view === 'ots' ? [400, 225] : [240, 300];
const sheet = await browser.newPage({ viewport: { width: cols * cw, height: Math.ceil(FRAMES / cols) * ch } });
await sheet.setContent(
  `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},${cw}px);font:11px monospace;color:#ddd">` +
    shots.map((s) => `<div style="position:relative"><img src="${s.src}" style="width:${cw}px;height:${ch}px;object-fit:cover"><span style="position:absolute;left:4px;top:4px;background:#000a;padding:1px 3px">${s.label}</span></div>`).join('') +
    '</body>',
);
await sheet.screenshot({ path: out });
console.log(`${scenario}: ${FRAMES} frames -> ${out}`);
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) console.log(real.join('\n'));
await browser.close();
