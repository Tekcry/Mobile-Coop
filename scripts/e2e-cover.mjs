// Cover system on Proving Grounds (fake gamepad + keyboard; A cover, B crouch, Y traverse, L3 sprint):
// snap side-on, strafe + edge stop, turn-and-swap, kneel, aim over low cover, blind fire, B keeps
// cover, A leaves, Y vaults, lean in place at a high-cover edge with shoulder swap, stand / crouch at
// high cover and a crouched edge peek, outside-corner swing, inside corner, SWAT turn, cover-to-cover
// with A to the marked cover (only while looking at it with the stick held towards it; slide-in, marker on the
// target), never an automatic snap, world prompts on
// the surfaces (take cover / vault / cover badge / cover-to-cover, low on the surface, tapped by touch),
// the touch action button only for "use", keyboard Space.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
const G = (f, a) => page.evaluate(f, a);
const P = () => G(() => { const g = window.__app.current; const c = g.player.controller; const pose = g.player.coverPose; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, crouched: c.crouched, kneel: c.kneeling, state: g.cover.state, low: g.cover.low, seg: g.cover.seg?.id ?? -1, piece: g.cover.seg?.piece ?? -1, nx: g.cover.seg?.nx ?? 0, nz: g.cover.seg?.nz ?? 0, face: g.cover.faceDir, wall: pose.wallSide, lean: pose.lean, shoulder: g.player.cam.shoulder, spread: g.weapons.spreadMul }; });
const tp = (x, z, yaw) => G(([x, z, yaw]) => { const g = window.__app.current; g.cover.reset(); const p = g.player; p.controller.teleport(new p.controller.pos.constructor(x, 0, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; }, [x, z, yaw]);
/** Run simulated time with sticks/buttons set, then release them. */
async function sim(seconds, { lx = 0, ly = 0, buttons = [] } = {}) {
  await G(([lx, ly, b]) => { window.__pad.axis(0, lx); window.__pad.axis(1, ly); for (const i of b) window.__pad.set(i, 1); }, [lx, ly, buttons]);
  await G((s) => new Promise((res) => {
    const st = window.__app.current; let t = 0;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; res(); } };
  }), seconds);
  await G((b) => { window.__pad.axis(0, 0); window.__pad.axis(1, 0); for (const i of b) window.__pad.set(i, 0); }, buttons);
  await frames(page, 2);
}
async function takeCover() {
  await press(page, BTN.A);
  await sim(0.8);
}
const near = (a, b, e) => Math.abs(a - b) <= e;
try {
  await G(() => window.__pad.connect());
  await press(page, BTN.RS);
  await sim(0.4);

  console.log('low cover');
  // low cover at x=-5 (faces at x = -4.7 / -5.3), z -8..-4; stand east of it facing west
  await tp(-3.7, -6, -Math.PI / 2);
  await sim(0.3);
  const cand = await G(() => !!window.__app.current.cover.candidate);
  assert(cand, 'cover candidate found in reach');
  await frames(page, 3);
  const prompt = await G(() => { const e = document.querySelector('.wp-cover.show'); return e ? { text: e.textContent, tf: e.style.transform } : null; });
  assert(prompt && /take cover/i.test(prompt.text), `take cover prompt shows on the surface (${JSON.stringify(prompt)})`);
  const promptY = +(/,\s*([\d.]+)vh/.exec(prompt.tf)?.[1] ?? 0);
  assert(promptY > 55, `the prompt sits low on the surface, below the crosshair (${promptY}vh)`);
  assert(!(await G(() => document.querySelector('.hud-cover, .hud-cover-state, .hud-action'))), 'no centre-screen cover prompt or badge');
  await takeCover();
  let c = await P();
  assert(c.state === 'in' && c.low && c.crouched, `A snaps into low cover crouched (${JSON.stringify(c)})`);
  assert(near(c.x, -4.7 + 0.35, 0.08), `flush with standoff (x=${c.x.toFixed(2)})`);
  assert(Math.abs(Math.sin(c.yaw)) < 0.3 && c.wall !== 0, `side-on: faces along the face, shoulder to the wall (yaw ${c.yaw.toFixed(2)}, wall side ${c.wall})`);
  await sim(0.4);
  assert((await P()).kneel, 'kneels behind low cover when still');
  await frames(page, 3);
  const badge = await G(() => document.querySelector('.wp-state.show')?.textContent ?? '');
  assert(badge === '', `no cover badge on the wall in use (${badge})`);
  const vaultP = await G(() => document.querySelector('.wp-vault.show')?.textContent ?? '');
  assert(/vault/i.test(vaultP), `vault prompt on the low cover (${vaultP})`);
  assert(!(await G(() => document.querySelector('.wp-cover.show'))), 'no take-cover prompt while in cover');
  // strafe right on screen (camera faces -x, so right is +z) to the far edge
  await sim(4.6, { lx: 1 });
  c = await P();
  assert(c.state === "in" && near(c.z, -4.45, 0.08), `strafes along the face and stops a step back from the edge (${JSON.stringify(c)}, ${await G(() => window.__app.current.cover.sm.reason)})`);
  assert(near(c.x, -4.35, 0.08), `keeps the standoff while moving (x=${c.x.toFixed(2)})`);
  const faceRight = c.face;
  const swaps0 = await G(() => window.__app.current.cover.swaps);
  await sim(1.55, { lx: -1 });
  const swapping = (await G(() => window.__app.current.cover.swaps)) === swaps0 + 1;
  c = await P();
  assert(swapping && c.face === -faceRight, `reversing plays a turn-and-swap (face ${faceRight} -> ${c.face})`);
  assert(c.z < -4.6, `strafes back (z=${c.z.toFixed(2)})`);
  // 3.2.0: the speed gear sets the pace along the wall (capped at a cover jog): gear 1 creeps, gear 6 hurries
  const coverPeak = async (gear) => {
    await tp(-3.7, -6, -Math.PI / 2);
    await G((g) => window.__app.current.player.controller.gears.set(g), gear);
    await sim(0.3);
    await takeCover();
    const r = await G(() => new Promise((res) => {
      const st = window.__app.current;
      const c = st.player.controller;
      const orig = st.fixedUpdate.bind(st);
      let t = 0;
      let peak = 0;
      window.__pad.axis(0, 1);
      st.fixedUpdate = (dt) => {
        orig(dt);
        t += dt;
        if (st.cover.state === 'in') peak = Math.max(peak, c.speed);
        if (t >= 1.2) { st.fixedUpdate = orig; window.__pad.axis(0, 0); res({ peak, state: st.cover.state }); }
      };
    }));
    await sim(0.3);
    return r;
  };
  const slowC = await coverPeak(1);
  const fastC = await coverPeak(6);
  await G(() => window.__app.current.player.controller.gears.set(4));
  assert(slowC.state === 'in' && fastC.state === 'in' && near(slowC.peak, 0.5, 0.12) && fastC.peak > 1.5 && fastC.peak < 1.95, `cover strafe by gear: gear 1 ${slowC.peak.toFixed(2)} m/s, gear 6 ${fastC.peak.toFixed(2)} m/s (crouched 0.5 / 1.8 cap)`);
  await tp(-3.7, -6, -Math.PI / 2);
  await sim(0.3);
  await takeCover();
  // aim over the top
  await sim(0.5, { buttons: [BTN.LT] });
  await G(() => window.__pad.set(6, 1));
  await sim(0.3);
  c = await P();
  assert(c.state === 'peek' && c.crouched, `aiming over low cover stays crouched (${c.state}, crouched ${c.crouched})`);
  const head = await G(() => { const p = window.__app.current.player; return p.rig.headNode.getAbsolutePosition().y - p.position.y; });
  assert(head < 1.45, `only the head and gun come over the top, not a full stand (head centre ${head.toFixed(2)} m)`);
  await G(() => window.__pad.set(6, 0));
  await sim(0.3);
  c = await P();
  assert(c.state === 'in' && c.crouched, 'release drops back down');
  // blind fire
  await G(() => window.__pad.set(7, 1));
  await sim(0.3);
  c = await P();
  assert(c.state === 'blind' && c.spread === 3 && c.crouched, `fire without aiming = blind fire, crouched (${JSON.stringify(c)})`);
  await G(() => window.__pad.set(7, 0));
  await sim(0.5);
  c = await P();
  assert(c.state === 'in', 'blind fire ends when the trigger is released');
  // B is stance only: low cover stays crouched in cover
  await press(page, BTN.B);
  await sim(0.4);
  c = await P();
  assert(c.state === 'in' && c.crouched, `B keeps low cover (crouched) (${c.state})`);
  // leave with A: no stray crouch toggle
  await press(page, BTN.A);
  await sim(0.4);
  c = await P();
  assert(c.state === 'none' && !c.crouched, `A leaves cover standing (${c.state}, crouched ${c.crouched})`);
  // vault
  await takeCover();
  await press(page, BTN.Y);
  await sim(0.9);
  c = await P();
  assert(c.state === 'none' && c.x < -5.4 && Math.abs(c.y) < 0.15, `Y vaults over low cover (x=${c.x.toFixed(2)} y=${c.y.toFixed(2)})`);

  console.log('high cover');
  // high cover at x=-10 (faces x = -9.75 / -10.25), z 0..4; stand east facing west
  await tp(-8.8, 2.5, -Math.PI / 2);
  await sim(0.3);
  await takeCover();
  c = await P();
  assert(c.state === 'in' && !c.low && !c.crouched, `snaps into high cover standing (${JSON.stringify(c)})`);
  await sim(1.5, { lx: 1 });
  c = await P();
  const sh0 = c.shoulder;
  await G(() => window.__pad.set(6, 1));
  await sim(0.8);
  c = await P();
  assert(c.state === 'peek' && c.lean !== 0 && c.z < 4.0 && c.z > 3.4, `aim at the edge leans out in place, capsule still in cover (z=${c.z.toFixed(2)}, lean ${c.lean})`);
  const peekShoulder = c.shoulder;
  await G(() => window.__pad.set(6, 0));
  await sim(0.8);
  c = await P();
  assert(c.state === 'in' && c.z < 4.0 && c.lean === 0, `releasing aim leans back into cover (z=${c.z.toFixed(2)})`);
  assert(c.shoulder === sh0, `shoulder restored after peeking (peek ${peekShoulder}, now ${c.shoulder})`);
  // B at high cover: crouch behind it, peek round the edge crouched, B again stands
  await press(page, BTN.B);
  await sim(0.6);
  c = await P();
  assert(c.state === 'in' && !c.low && c.crouched, `B crouches behind high cover, still in cover (${c.state}, crouched ${c.crouched})`);
  await G(() => window.__pad.set(6, 1));
  await sim(0.8);
  c = await P();
  assert(c.state === 'peek' && c.lean !== 0 && c.crouched, `crouched peek round the high-cover edge (lean ${c.lean}, crouched ${c.crouched})`);
  await G(() => window.__pad.set(6, 0));
  await sim(0.6);
  await press(page, BTN.B);
  await sim(0.6);
  c = await P();
  assert(c.state === 'in' && !c.crouched, `B again stands behind high cover (${c.state})`);

  console.log('outside corner');
  // building 10 x 6 at (0,16): +x face at x=5 (z 13..19); corner to the +z face at z=19
  await tp(5.9, 17.5, -Math.PI / 2);
  await sim(0.3);
  await takeCover();
  c = await P();
  const seg0 = c.seg;
  assert(c.state === 'in' && !c.low, `snaps to the building wall (${JSON.stringify(c)})`);
  // pushing against the edge offers the corner (prompt on the edge); it never swings on its own
  let offered = false;
  for (let i = 0; i < 20 && !offered; i++) {
    await sim(0.35, { lx: 1 });
    await G(() => window.__pad.axis(0, 1));
    await frames(page, 4);
    offered = await G(() => window.__app.current.cover.cornerSide !== 0);
  }
  const cornerP = await G(() => document.querySelector('.wp-corner.show')?.textContent ?? '');
  await sim(1.0, { lx: 1 });
  c = await P();
  assert(offered && /corner/i.test(cornerP) && c.seg === seg0, `pushing against the edge shows the corner prompt and never swings on its own (${cornerP}, seg ${c.seg})`);
  // A while pushing swings round it
  await sim(0.8, { lx: 1, buttons: [BTN.A] });
  await sim(0.5);
  c = await P();
  assert(c.state === 'in' && c.seg !== seg0 && near(c.z, 19.35, 0.1), `A while pushing against the edge swings round the outside corner onto the next face (seg ${seg0}->${c.seg}, z=${c.z.toFixed(2)})`);

  console.log('inside corner');
  // building shell: north wall z=-18 (inner face z=-18.2) meets the east wall x=24 (inner face x=23.8)
  await tp(22.2, -19.0, 0);
  await sim(0.3);
  await takeCover();
  c = await P();
  const segN = c.seg;
  assert(c.state === 'in' && !c.low && c.nz < -0.9, `snaps to the inner north wall (${JSON.stringify(c)})`);
  await sim(4.0, { lx: 1 });
  await sim(1.0);
  c = await P();
  assert(c.state === 'in' && c.seg !== segN && c.nx < -0.9 && near(c.x, 23.8 - 0.35, 0.12), `pushing into the inside corner turns onto the adjoining wall (seg ${segN}->${c.seg}, x=${c.x.toFixed(2)})`);

  console.log('SWAT turn');
  // low cover east face x=-4.7, z -8..-4; in line beyond a 1.6 m gap: z -2.4..0
  await tp(-3.7, -5, -Math.PI / 2);
  await sim(0.3);
  await takeCover();
  await sim(2.8, { lx: 1 });
  c = await P();
  const piece0 = c.piece;
  // a cover-to-cover target needs intent: look towards the next cover and hold the stick that way
  const noLook = await G(() => { const t = window.__app.current.cover.target; return t ? t.kind : 'none'; });
  assert(noLook === 'none', `no cover-to-cover target without looking at it and holding the stick towards it (${noLook})`);
  await G(() => { const p = window.__app.current.player; p.cam.yaw = 0; window.__pad.axis(1, -1); });
  await G((s) => new Promise((res) => {
    const st = window.__app.current; let t = 0;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; res(); } };
  }), 0.3);
  const swat = await G(() => { const t = window.__app.current.cover.target; return t ? t.kind : 'none'; });
  await G(() => { window.__pad.axis(1, -1); });
  await press(page, BTN.LS);
  let sawCrouchedDash = false;
  for (let i = 0; i < 12; i++) {
    await sim(0.1, { ly: -1 });
    const q = await P();
    if (q.state === 'dash' && q.crouched) sawCrouchedDash = true;
  }
  await sim(0.6);
  c = await P();
  assert(swat === 'swat' && sawCrouchedDash, `at the edge with cover in line beyond a gap: SWAT turn, low (target ${swat})`);
  assert(c.state === 'in' && c.piece !== piece0 && c.z > -2.4, `SWAT turn lands in the next cover (z=${c.z.toFixed(2)})`);

  console.log('cover-to-cover');
  // from the low cover's east face, look at the low wall to the south (north face z=-11.7)
  await tp(-3.7, -6, -Math.PI / 2);
  await sim(0.3);
  await takeCover();
  await G(() => { const p = window.__app.current.player; p.cam.yaw = Math.atan2(-2 - p.position.x, -11.35 - p.position.z); });
  await sim(0.4);
  const lookOnly = await G(() => !!window.__app.current.cover.target);
  assert(!lookOnly, 'looking at another cover alone marks nothing (the stick must be held towards it too)');
  // hold the stick towards it (camera forward) for longer than the sticky exit: stays in cover, target marked
  await G(() => window.__pad.axis(1, -1));
  await G((s) => new Promise((res) => {
    const st = window.__app.current; let t = 0;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t >= s) { st.fixedUpdate = orig; res(); } };
  }), 0.6);
  await frames(page, 3);
  const tgt = await G(() => { const t = window.__app.current.cover.target; return t ? { kind: t.kind, x: t.x, z: t.z, st: window.__app.current.cover.state } : null; });
  const marker = await G(() => !!document.querySelector('.wp-move.show'));
  assert(tgt && tgt.kind === 'dash' && tgt.st === 'in' && marker, `looking at it + stick held towards it: target marked, still in cover, marker on it (${JSON.stringify(tgt)}, marker ${marker})`);
  await press(page, BTN.A);
  await G(() => window.__pad.axis(1, 0));
  let slid = false;
  let dashed = false;
  for (let i = 0; i < 25; i++) {
    await sim(0.1);
    const q = await G(() => ({ st: window.__app.current.cover.state, slide: window.__app.current.player.coverPose.slide }));
    if (q.st === 'dash') dashed = true;
    if (q.slide >= 0) slid = true;
    if (dashed && q.st === 'in') break;
  }
  c = await P();
  assert(dashed && slid && c.state === 'in' && c.nz > 0.9 && c.low, `A runs to the marked cover and slides in (${JSON.stringify({ dashed, slid, state: c.state, nz: c.nz })})`);

  console.log('prompt taps (touch)');
  const tapPrompt = (id) => G((id) => { const e = document.querySelector(`.wp-${id}.show`); if (!e) return false; e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); e.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); return true; }, id);
  assert(!(await tapPrompt('state')), 'no cover badge on the wall in use (nothing to tap)');
  await G(() => window.__app.current.cover.reset());
  await tp(-3.7, -6, -Math.PI / 2);
  await sim(0.3);
  await frames(page, 3);
  assert(await tapPrompt('cover'), 'take cover prompt is tappable');
  await sim(0.9);
  assert((await P()).state === 'in', 'tapping the take cover prompt takes cover');
  await frames(page, 3);
  assert(await tapPrompt('vault'), 'vault prompt is tappable in low cover');
  await sim(1.2);
  c = await P();
  assert(c.state === 'none' && c.x < -5.3, `tapping vault vaults the low cover (x=${c.x.toFixed(2)})`);

  console.log('manual cover only + touch button');
  // walking and sprinting straight into a wall never snaps to it
  await tp(-2.6, -6, -Math.PI / 2);
  await sim(2.0, { ly: -1 });
  c = await P();
  assert(c.state === 'none', `walking into cover does not take it (${c.state})`);
  await tp(-1.2, -6, -Math.PI / 2);
  await press(page, BTN.LS);
  await sim(1.5, { ly: -1 });
  c = await P();
  assert(c.state === 'none', `sprinting into cover does not take it (${c.state})`);
  await sim(0.5);
  await tp(-3.7, -6, -Math.PI / 2);
  await sim(0.3);
  await takeCover();
  const btn = await G(() => { const t = window.__app.input.touch; const c = t.actionContext; return { ctx: c ? `${c.action}:${c.label}` : 'none', hidden: t.elements.get('action').classList.contains('tc-hidden') }; });
  assert(btn.ctx === 'none' && btn.hidden, `touch action button hidden with nothing to use (cover / vault are world prompts) (${JSON.stringify(btn)})`);
  // keyboard Space toggles out
  await page.keyboard.press('Space');
  await sim(0.3);
  assert((await P()).state === 'none', 'keyboard Space leaves cover');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: '/tmp/e2e-cover-fail.png' });
}
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
await browser.close();
process.exit(failed ? 1 : 0);
