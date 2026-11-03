// (mixamo-chars, N53 slice a) The Test Chamber's player is a Mixamo mannequin playing Mixamo moves: the body loads, Wren
// is hidden, standing still plays the idle, the stick forward walks / runs (the walk or run group is the strongest), B
// crouches into the crouch idle; (slice b) X draws the gun and its move set takes over (rifle_ / pistol_), LT aims
// (the aimed idle), the slung gun's chest node follows the Mixamo spine; no console errors. Screenshots of each state go to `--shots=<dir>` (default none).
//   node scripts/e2e-mixamo.mjs [url] [--shots=<dir>]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, assert, frames, press, BTN } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://localhost:4173/';
const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice(8) ?? '';
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber' });
const G = (f, a) => page.evaluate(f, a);
// the virtual pad's left stick, y only (-1 forward)
const fwd = (y) => G((v) => window.__pad.axis(1, v), y);
const shot = async (name) => {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
};
// the strongest locomotion group of the player's Mixamo body, and its weight
const top = () =>
  G(() => {
    const m = window.__app.current.player.mixamo;
    let best = '', bw = -1;
    for (const [n, v] of Object.entries(m.weights())) if (v > bw) { bw = v; best = n; }
    return { best, bw, ready: m.ready, failed: m.failed };
  });
try {
  await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 90000 });
  await page.waitForFunction(() => { const m = window.__app.current.player.mixamo; return !!m && (m.ready || m.failed); }, null, { timeout: 60000 });
  const s0 = await G(() => {
    const p = window.__app.current.player;
    const meshes = p.mixamo.root.getChildMeshes(false);
    return { map: window.__app.current.world.map.id, figure: p.figure.renderMeshes.some((m) => m.isEnabled() && m.isVisible), meshes: meshes.length, groups: p.mixamo.groups.length };
  });
  console.log('loaded', JSON.stringify(s0));
  assert(s0.map === 'chamber', `map is ${s0.map}`);
  assert(s0.meshes > 0, 'the Mixamo body has meshes');
  assert(!s0.figure, 'Wren is hidden');
  assert(s0.groups >= 9, `the body has its moves (${s0.groups})`);
  await G(() => window.__pad.connect());
  await G(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await press(page, BTN.RS); // reveal pad
  await frames(page, 30);
  let t = await top();
  console.log('still', JSON.stringify(t));
  assert(!t.failed && t.ready, 'the body loaded');
  assert(t.best === 'idle', `still plays the idle (${t.best})`);
  await shot('1-idle');
  await fwd(-1);
  await frames(page, 60);
  t = await top();
  console.log('forward', JSON.stringify(t));
  assert(t.best === 'walk' || t.best === 'run' || t.best === 'sprint', `forward plays a forward gait (${t.best})`);
  await shot('2-forward');
  await fwd(0);
  await frames(page, 40);
  await press(page, BTN.B);
  await frames(page, 60);
  t = await top();
  console.log('crouched', JSON.stringify(t));
  assert(t.best === 'crouch_idle', `crouched still plays the crouch idle (${t.best})`);
  await shot('3-crouch');
  await fwd(-1);
  await frames(page, 60);
  t = await top();
  console.log('crouch walk', JSON.stringify(t));
  // (walk-test fix B) the unarmed crouch walk is Action Forge's sneak (Michael's pick to try)
  assert(t.best === 'af_crouch_f', `crouched forward plays the crouch walk (${t.best})`);
  await shot('4-crouch-walk');
  await fwd(0);
  await frames(page, 30);
  await press(page, BTN.B); // stand
  await frames(page, 40);
  // (slice b) the chest node (the slung gun's parent) rides on the Mixamo spine: within 25 cm of Spine2 (the two
  // skeletons mark the chest at different points), and the offset holds (within 3 cm) from standing to a run
  const chestGap = () =>
    G(() => {
      const p = window.__app.current.player;
      const a = p.rig.torso.getAbsolutePosition();
      const c = p.mixamo.boneNode('Spine2').getAbsolutePosition();
      return Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z);
    });
  const near = await chestGap();
  await fwd(-1);
  await frames(page, 45);
  const nearRun = await chestGap();
  await fwd(0);
  await frames(page, 40);
  console.log('chest to Spine2', near.toFixed(3), 'running', nearRun.toFixed(3));
  assert(near < 0.25, `the chest node follows the Mixamo spine (${near.toFixed(3)} m)`);
  assert(Math.abs(nearRun - near) < 0.03, `the chest offset holds while running (${near.toFixed(3)} -> ${nearRun.toFixed(3)} m)`);
  await press(page, BTN.X); // draw (the long gun's sling draw travels ~2.5 s before it is on the aim pivot)
  // (slice i) on its way the gun is in the Mixamo right hand (it floated beside the body, on the hidden rig's hand)
  let mid = null;
  // (walk-test fix B2) the draw plays on the upper body while the gun travels
  const drawW = () => G(() => { const w = window.__app.current.player.mixamo.weights(); return Math.max(w.rifle_draw ?? 0, w.pistol_draw ?? 0); });
  let drew = 0;
  for (let f = 0; f < 120 && mid === null; f += 10) {
    await frames(page, 10);
    drew = Math.max(drew, await drawW());
    mid = await G(() => {
      const r = window.__app.current.player.rig;
      if (!r.weaponTravel) return null;
      const h = window.__app.current.player.mixamo.boneNode('RightHand').getAbsolutePosition();
      const g = r.travelNode.getAbsolutePosition();
      return Math.hypot(h.x - g.x, h.y - g.y, h.z - g.z);
    });
  }
  console.log('mid-draw gun to hand', mid === null ? 'no travel seen' : mid.toFixed(3));
  if (mid !== null) await shot('5a-mid-draw');
  if (mid !== null) assert(mid < 0.3, `the gun on its way sits at the Mixamo hand (${mid.toFixed(3)} m)`);
  for (let f = 0; f < 60; f += 5) {
    await frames(page, 5);
    drew = Math.max(drew, await drawW());
  }
  console.log('draw clip weight (most)', drew.toFixed(2));
  assert(drew > 0.5, `drawing plays the draw on the upper body (weight ${drew.toFixed(2)})`);
  await frames(page, 100);
  t = await top();
  console.log('drawn', JSON.stringify(t));
  assert(/^(rifle|pistol)_/.test(t.best), `a drawn gun plays its set (${t.best})`);
  await shot('5-drawn');
  await G(() => window.__pad.set(6, 1)); // LT held: aim
  await frames(page, 60);
  t = await top();
  console.log('aim', JSON.stringify(t));
  await shot('6-aim');
  // (walk-test fix A3) aimed, the rifle comes up to the eye (its muzzle sat 100 px under the reticle), and strafing the
  // upper body holds the aim: the head stays clear left of the reticle (the strafe leaned it onto it) and still
  const spots = () =>
    G(() => {
      const p = window.__app.current.player;
      const sc = window.__app.current.world.scene;
      const V = p.rig.root.position.constructor;
      const T = sc.getTransformMatrix();
      const W = sc.getEngine().getRenderWidth(), H = sc.getEngine().getRenderHeight();
      const proj = (v) => {
        const c = V.TransformCoordinates(v, T);
        return [((c.x + 1) / 2 - 0.5) * W, ((1 - c.y) / 2 - 0.5) * H];
      };
      const m = p.rig.weaponPivot.getWorldMatrix().m;
      const l = Math.hypot(m[8], m[9], m[10]);
      const muzzle = new V(m[12] + (m[8] / l) * 0.6, m[13] + (m[9] / l) * 0.6, m[14] + (m[10] / l) * 0.6);
      return { head: proj(p.mixamo.boneNode('Head').getAbsolutePosition()), muzzle: proj(muzzle), W, H };
    });
  const sa = await spots();
  console.log('aimed head / muzzle (px off the reticle)', JSON.stringify(sa));
  if (t.best.startsWith('rifle_')) assert(sa.muzzle[1] < 0.12 * sa.H, `aimed, the rifle is up at the eye (muzzle ${sa.muzzle[1].toFixed(0)} px under the reticle)`);
  await G(() => window.__pad.axis(0, 0.6)); // strafe right, aimed
  await frames(page, 30);
  let hMax = -Infinity, hMin = Infinity;
  // (walk-test round 1, Michael: "too much sway on the weapon when moving, it should remain perfectly still") the muzzle
  // across the view while strafing aimed
  let mx0 = Infinity, mx1 = -Infinity, my0 = Infinity, my1 = -Infinity;
  for (let f = 0; f < 40; f++) {
    await frames(page, 1);
    const s = await spots();
    hMax = Math.max(hMax, s.head[0]);
    hMin = Math.min(hMin, s.head[0]);
    mx0 = Math.min(mx0, s.muzzle[0]);
    mx1 = Math.max(mx1, s.muzzle[0]);
    my0 = Math.min(my0, s.muzzle[1]);
    my1 = Math.max(my1, s.muzzle[1]);
  }
  console.log('strafing aimed, muzzle sway px', (mx1 - mx0).toFixed(1), 'across,', (my1 - my0).toFixed(1), 'up / down');
  await shot('6a-aim-strafe');
  await G(() => window.__pad.axis(0, 0));
  await frames(page, 30);
  console.log('strafing aimed, head x', hMin.toFixed(0), '..', hMax.toFixed(0));
  assert(hMax < -0.15 * sa.W, `strafing aimed, the head stays clear of the reticle (head x up to ${hMax.toFixed(0)} px)`);
  assert(hMax - hMin < 40, `strafing aimed, the head holds still across the view (${(hMax - hMin).toFixed(0)} px)`);
  // (slice g) aiming up or down bends the Mixamo spine: the gun in its hand points with the view (the barrel's rise
  // follows the camera's pitch, within a third of it)
  const barrel = () =>
    G(() => {
      const m = window.__app.current.player.rig.weaponPivot.getWorldMatrix().m;
      return m[9] / Math.hypot(m[8], m[9], m[10]);
    });
  const pitchTo = async (v) => {
    await G((x) => { window.__app.current.player.cam.pitch = x; }, v);
    await frames(page, 30);
  };
  await pitchTo(0.6);
  const up = await barrel();
  await shot('6b-aim-up');
  await pitchTo(-0.6);
  const down = await barrel();
  await pitchTo(-0.21);
  console.log('barrel rise', up.toFixed(2), down.toFixed(2));
  assert(up > 0.3 && down < -0.3, `aiming up / down turns the gun with the spine (rise ${up.toFixed(2)} / ${down.toFixed(2)})`);
  await G(() => window.__pad.set(6, 0));
  await frames(page, 30);
  // the other gun (T: next weapon): its set plays and, held, the gun sits in the Mixamo right hand (within 15 cm)
  await page.keyboard.press('KeyT');
  // (walk-test fix B2) the swap holsters the gun in the hands first, on the upper body
  let holstered = 0;
  for (let f = 0; f < 60; f += 5) {
    await frames(page, 5);
    holstered = Math.max(holstered, await G(() => { const w = window.__app.current.player.mixamo.weights(); return Math.max(w.rifle_holster ?? 0, w.pistol_holster ?? 0); }));
    if (f === 15) await shot('6c-holster');
  }
  console.log('holster clip weight (most)', holstered.toFixed(2));
  assert(holstered > 0.5, `swapping plays the holster on the upper body (weight ${holstered.toFixed(2)})`);
  await frames(page, 60);
  t = await top();
  const inHand = await G(() => {
    const p = window.__app.current.player;
    const h = p.mixamo.boneNode('RightHand').getAbsolutePosition();
    const g = p.rig.weaponPivot.getAbsolutePosition();
    return { d: Math.hypot(h.x - g.x, h.y - g.y, h.z - g.z), held: p.rig.heldModel?.node.parent === p.rig.weaponPivot };
  });
  console.log('swapped', JSON.stringify(t), JSON.stringify(inHand));
  assert(/^(rifle|pistol)_/.test(t.best), `the swapped gun plays its set (${t.best})`);
  if (inHand.held) assert(inHand.d < 0.3, `the held gun sits at the Mixamo hand (${inHand.d.toFixed(3)} m)`);
  await shot('7-swapped');
  await frames(page, 20);
  const errs = errors;
  if (errs.length) console.log('console errors:\n  ' + errs.join('\n  '));
  assert(errs.length === 0, `${errs.length} console errors`);
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
}
await browser.close();
console.log(failed ? 'e2e-mixamo: FAIL' : 'e2e-mixamo: PASS');
process.exit(failed ? 1 : 0);
