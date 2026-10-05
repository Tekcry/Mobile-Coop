// Animation contact sheet: runs a scenario on Proving Grounds and captures frames from a side camera
// that follows the player, then lays them out in a grid (for reviewing blends and timing).
//   node scripts/anim-sheet.mjs out.png <scenario> [frames=12] [interval=0.1] [view=side|front|back|ots]
// Scenarios: walk, start, stop, turn, crouch, cover, peek, reload, swap, grenade, vault, dash, strafe
import { launch } from './e2e-lib.mjs';

const [out = 'sheet.png', scenario = 'walk', framesArg = '12', intervalArg = '0.1', view = 'side'] = process.argv.slice(2);
const FRAMES = Number(framesArg);
const INTERVAL = Number(intervalArg);
const url = process.env.URL ?? 'http://localhost:4173/';

/** Scenario: setup (once) and per-frame input (time t in s since the first frame). */
const SCENARIOS = {
  walk: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 1 }, input: () => ({ y: 1 }) },
  start: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }) },
  stop: { pos: [0, -14], yaw: Math.PI / 2, pre: 2.5, warm: { y: 1 }, input: () => ({ y: 0 }) },
  strafe: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.8, warm: { x: 1 }, input: () => ({ x: 1 }) },
  back: { pos: [0, -14], yaw: Math.PI / 2, pre: 1.8, warm: { y: -1 }, input: () => ({ y: -1 }) },
  turn: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 0 }), at: { 0: 'g.player.cam.yaw = Math.PI;' } },
  crouch: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('crouch');" } },
  dash: { pos: [0, -18], yaw: Math.PI / 2, pre: 0.6, input: () => ({ y: 1 }), at: { 0.1: "a.input.state.tap('dash');" } },
  reload: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('reload');" } },
  swap: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('swapNext');" } },
  grenade: { pos: [0, -14], yaw: Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('grenade');" } },
  cover: { pos: [-3.7, -6], yaw: -Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('cover');" } },
  highcover: { pos: [-8.8, 2.5], yaw: -Math.PI / 2, pre: 0.6, input: () => ({}), at: { 0: "a.input.state.tap('cover');" } },
  peek: { pos: [-8.8, 3.4], yaw: -Math.PI / 2, pre: 0.6, input: (t) => ({ ads: t > 1.2 }), at: { 0: "a.input.state.tap('cover');" } },
  vault: { pos: [-3.8, -6], yaw: -Math.PI / 2, pre: 0.8, input: () => ({}), at: { 0: "a.input.state.tap('jump');" } },
};

const sc = SCENARIOS[scenario];
if (!sc) throw new Error(`unknown scenario ${scenario}`);
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
await page.addStyleTag({ content: '.hud, .touch-layer, .screens { display: none !important; }' });
await page.evaluate(({ pos, yaw, pre }) => {
  const a = window.__app;
  const g = a.current;
  const p = g.player;
  a.loop.manual = true;
  p.controller.teleport(new p.controller.pos.constructor(pos[0], 0, pos[1]), yaw);
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
    const fy = p.controller.renderYaw;
    const fx = Math.sin(fy);
    const fz = Math.cos(fy);
    const off = v === 'front' ? [fx * 3, fz * 3] : v === 'back' ? [-fx * 3, -fz * 3] : [fz * 3.1, -fx * 3.1];
    c.position.set(r.x + off[0], r.y + 1.05, r.z + off[1]);
    c.setTarget(new r.constructor(r.x, r.y + 0.85, r.z));
  };
  a.loop.stepHeadless(0.3);
}, { pos: sc.pos, yaw: sc.yaw, pre: sc.pre });
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
for (let t = 0; t < pre; t += 1 / 60) {
  await setInput(sc.warm ?? {}, null);
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
  const w = Math.round(vp.height * 0.75);
  const buf = await page.screenshot({ clip: { x: Math.round(vp.width / 2 - w / 2), y: 0, width: w, height: vp.height } });
  shots.push({ src: `data:image/png;base64,${buf.toString('base64')}`, label: `${t.toFixed(2)}s ${info}` });
}
const cols = Math.min(6, FRAMES);
const sheet = await browser.newPage({ viewport: { width: cols * 240, height: Math.ceil(FRAMES / cols) * 300 } });
await sheet.setContent(
  `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},240px);font:11px monospace;color:#ddd">` +
    shots.map((s) => `<div style="position:relative"><img src="${s.src}" style="width:240px;height:300px;object-fit:cover"><span style="position:absolute;left:4px;top:4px;background:#000a;padding:1px 3px">${s.label}</span></div>`).join('') +
    '</body>',
);
await sheet.screenshot({ path: out });
console.log(`${scenario}: ${FRAMES} frames -> ${out}`);
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) console.log(real.join('\n'));
await browser.close();
