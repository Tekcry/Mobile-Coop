// Attached traversal on the Proving Grounds course (north east): ladder (bottom / top entry, climb, slide, step
// off), drainpipe to a lip, ledge grab / shimmy / corners / jump across / climb up / lower in / drop, horizontal
// pipe; hands and feet locked on contacts (< 1 cm while gripping); speed bands; touch + keyboard reach the verbs.
import { launch, frames, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;

// page helpers: stepping with a held stick / buttons, measuring contacts on every rendered (120 Hz) frame
await page.evaluate(() => {
  const H = {
    st: () => window.__app.current,
    tp(x, y, z, yaw) {
      const p = H.st().player;
      p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
    },
    /** Step `s` seconds (120 Hz render frames) holding the stick; record contact drift / reach error. */
    run(s, sx = 0, sy = 0, btns = []) {
      const pad = window.__pad;
      pad.axis(0, sx);
      pad.axis(1, -sy);
      for (const b of btns) pad.set(b, 1);
      const st = H.st();
      const rig = st.player.rig;
      const ac = st.traversal.attachCtl;
      const n = Math.round(s * 60);
      const rec = { maxDrift: 0, maxFootDrift: 0, maxReach: 0, frames: 0, attachedFrames: 0 };
      const last = { L: null, R: null, fL: null, fR: null };
      const hand = rig.p.hand.len * 0.45;
      for (let i = 0; i < n; i++) {
        window.__app.loop.stepHeadless(1 / 60, 120);
        rec.frames++;
        if (!ac.active || ac.m.phase !== 'on') {
          last.L = last.R = last.fL = last.fR = null;
          continue;
        }
        rec.attachedFrames++;
        const c = ac.contacts();
        for (const [k, planted, t, wr] of [
          ['L', c.plantedL, c.handL, rig.wristL],
          ['R', c.plantedR, c.handR, rig.wristR],
        ]) {
          if (!planted) {
            last[k] = null;
            continue;
          }
          if (last[k]) rec.maxDrift = Math.max(rec.maxDrift, Math.hypot(t.x - last[k].x, t.y - last[k].y, t.z - last[k].z));
          last[k] = { ...t };
          // the wrist sits a hand-length behind the palm: an arm that cannot reach shows as extra distance
          wr.computeWorldMatrix(true);
          const w = wr.getAbsolutePosition();
          rec.maxReach = Math.max(rec.maxReach, Math.abs(Math.hypot(w.x - t.x, w.y - t.y, w.z - t.z) - hand));
        }
        if (rig.plantL.w > 0.99) {
          for (const [k, planted, t] of [
            ['fL', c.feetPlantedL, c.footL],
            ['fR', c.feetPlantedR, c.footR],
          ]) {
            if (!planted) {
              last[k] = null;
              continue;
            }
            if (last[k]) rec.maxFootDrift = Math.max(rec.maxFootDrift, Math.hypot(t.x - last[k].x, t.y - last[k].y, t.z - last[k].z));
            last[k] = { ...t };
          }
        }
      }
      pad.axis(0, 0);
      pad.axis(1, 0);
      for (const b of btns) pad.set(b, 0);
      return rec;
    },
    /** Tap a pad button for a couple of steps. */
    tap(b) {
      window.__pad.set(b, 1);
      window.__app.loop.stepHeadless(2 / 60, 120);
      window.__pad.set(b, 0);
      window.__app.loop.stepHeadless(2 / 60, 120);
    },
    info() {
      const st = H.st();
      const c = st.player.controller;
      const ac = st.traversal.attachCtl;
      const a = ac.m.anchor;
      return {
        x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, grounded: c.grounded,
        attached: ac.active, kind: a?.kind ?? null, id: a?.id ?? -1, nx: a?.nx ?? 0, nz: a?.nz ?? 0, phase: ac.m.phase, s: ac.m.s, v: ac.m.v,
        held: !!st.player.rig.heldWeapon, cam: st.player.cam.attach, trav: st.player.coverPose.traverse,
        hint: ac.hint ? `${ac.hint.anchor.kind}:${ac.hint.entry}` : null,
        prompt: st.hud.world.label('vault'), jumpPrompt: st.hud.world.label('jumpTo'), dropPrompt: st.hud.world.label('drop'),
        jump: ac.jump ? ac.jump.anchor.id : -1,
      };
    },
  };
  window.__tr = H;
  window.__app.loop.manual = true;
});
/** State, after a rendered frame so world prompts project through the current view. */
const I = async () => {
  await frames(page, 2);
  await page.evaluate(() => window.__app.loop.stepHeadless(1 / 60, 120));
  return page.evaluate(() => window.__tr.info());
};
const run = (s, sx = 0, sy = 0, btns = []) => page.evaluate(([s, sx, sy, b]) => window.__tr.run(s, sx, sy, b), [s, sx, sy, btns]);
/** Hold the stick until no longer attached (or `max` s). */
async function runOff(max, sx, sy) {
  for (let t = 0; t < max; t += 0.25) {
    await run(0.25, sx, sy);
    if (!(await page.evaluate(() => window.__tr.st().traversal.attachCtl.active))) return;
  }
}
const tap = (b) => page.evaluate((b) => window.__tr.tap(b), b);
const tp = (x, y, z, yaw) => page.evaluate(([x, y, z, yaw]) => window.__tr.tp(x, y, z, yaw), [x, y, z, yaw]);
const f2 = (v) => v.toFixed(2);
/** Contacts: planted hands / feet never slide; the arms reach their grips. */
function contacts(r, what) {
  assert(r.maxDrift < 0.01, `${what}: planted hands locked (drift ${(r.maxDrift * 100).toFixed(2)} cm < 1 cm)`);
  assert(r.maxReach < 0.03, `${what}: hands reach their grips (${(r.maxReach * 100).toFixed(1)} cm)`);
}

try {
  await page.evaluate(() => window.__pad.connect());
  await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await run(0.5);

  // --- ladder from the bottom: prompt, attach, climb at 1.6 rungs/s with locked hands and feet, step off the top
  await tp(25.2, 0, 11, Math.PI / 2);
  await run(0.4);
  let i = await I();
  assert(i.hint === 'ladder:bottom' && i.prompt === 'Climb', `ladder offered from the bottom (${i.hint}, prompt "${i.prompt}")`);
  await tap(BTN.Y);
  await run(0.4);
  i = await I();
  assert(i.attached && i.kind === 'ladder', 'Y attaches to the ladder');
  assert(!i.held && i.cam === 'ladder' && i.trav === 'climb', 'weapon stowed, ladder framing, climb pose');
  const s0 = i.s;
  let r = await run(1.5, 0, 1);
  i = await I();
  const rate = (i.s - s0) / 1.5 / 0.3;
  assert(rate > 1.35 && rate < 1.7, `climbs at ~1.6 rungs/s (${rate.toFixed(2)})`);
  contacts(r, 'ladder');
  assert(r.maxFootDrift < 0.01, `ladder: planted feet locked on the rungs (${(r.maxFootDrift * 100).toFixed(2)} cm)`);
  await runOff(8, 0, 1);
  await run(0.5);
  i = await I();
  assert(!i.attached && i.y > 3.5, `steps off at the top onto the tower (y ${f2(i.y)})`);
  await run(1.2);
  i = await I();
  assert(i.held, 'weapon back in the hands after the ladder');

  // --- ladder from the top: turn round and step on, climb down, step off at the bottom
  await tp(26.7, 3.6, 11, -Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ladder:top', `ladder offered from the top (${i.hint})`);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'ladder' && Math.abs(Math.sin(i.yaw) - 1) < 0.1, 'stepped on from the top, turned to face the ladder');
  await runOff(12, 0, -1);
  await run(0.5);
  i = await I();
  assert(!i.attached && i.y < 0.2, `stepped off at the bottom (y ${f2(i.y)})`);

  // --- slide: climb a little, drop slides to the bottom fast
  await tp(25.2, 0, 11, Math.PI / 2);
  await run(0.3);
  await tap(BTN.Y);
  await run(4, 0, 1);
  const hi = (await I()).y;
  await tap(BTN.B);
  r = await run(0.5);
  i = await I();
  assert((hi - i.y) / 0.5 > 2.5 || (!i.attached && i.y < 0.2), `drop slides down the ladder fast (from ${f2(hi)} to ${f2(i.y)} in 0.5 s)`);
  await run(1.5);
  i = await I();
  assert(!i.attached && i.y < 0.2, 'slid to the bottom and stepped off');

  // --- drainpipe: climb, onto the lip at the top, climb up
  await tp(27.8, 0, 8.95, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'pipeV:side', `drainpipe offered (${i.hint})`);
  await tap(BTN.Y);
  await run(0.5);
  const p0 = (await I()).s;
  r = await run(1, 0, 1);
  i = await I();
  assert(i.kind === 'pipeV' && Math.abs((i.s - p0) / 1 - 0.85) < 0.15, `climbs the pipe at ~0.9 m/s (${f2(i.s - p0)})`);
  contacts(r, 'drainpipe');
  r = await run(3, 0, 1);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.nz < -0.9, `at the top of the pipe it takes the tower's lip (${i.kind})`);
  await run(0.5);
  i = await I();
  assert(i.prompt === 'Climb up', `climb up offered on the lip ("${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.2);
  i = await I();
  assert(!i.attached && i.y > 3.5 && i.grounded, `climbed up onto the tower (y ${f2(i.y)})`);

  // --- ledge from below: grab, shimmy at ~1.2 m/s with locked hands, corner, jump across, climb up
  await tp(25.45, 0, 16, Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:below' && i.prompt === 'Grab', `ledge offered from below (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(0.5);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.cam === 'hang' && i.trav === 'hang', 'grabbed the lip: hang pose and framing');
  assert(i.dropPrompt === 'Drop', 'drop offered while hanging');
  const z0 = (await I()).z;
  // camera looks +x: stick left is +z
  r = await run(0.8, -1, 0);
  i = await I();
  const sh = Math.abs(i.z - z0) / 0.8;
  assert(sh > 0.85 && sh < 1.3, `shimmies at ~1.2 m/s (${f2(sh)})`);
  contacts(r, 'shimmy');
  // jump across: hanging near the end, the stick towards the next block shows the target, Y jumps
  const blockB = i.id;
  await run(0.3, -0.7, 0);
  i = await I();
  r = await run(0.25, -1, 0);
  i = await I();
  assert(i.jump >= 0 && i.jumpPrompt === 'Jump', `jump target marked under the stick ("${i.jumpPrompt}")`);
  await page.evaluate(() => { window.__pad.axis(0, -1); });
  await tap(BTN.Y);
  r = await run(1.0, -1, 0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.id !== blockB && i.z > 18.9, `jumped across to the next block (z ${f2(i.z)})`);
  // corner: shimmy on round the outside corner onto the north face
  r = await run(3, -1, 0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.nz > 0.9, `wrapped round the outside corner (normal ${f2(i.nx)}, ${f2(i.nz)})`);
  await tap(BTN.Y);
  await run(1.3);
  i = await I();
  assert(!i.attached && Math.abs(i.y - 2.3) < 0.1 && i.grounded, `climbed up on top (y ${f2(i.y)})`);

  // --- lower into a hang from above: hold drop at the edge; then drop to the ground
  await tp(26.45, 2.3, 16, -Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:above' && i.dropPrompt === 'Hang', `at the edge: holding drop / its prompt hangs (${i.hint}, "${i.dropPrompt}")`);
  await run(0.6, 0, 0, [BTN.B]);
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.y < 1, `holding drop lowered into a hang (y ${f2(i.y)})`);
  await tap(BTN.B);
  await run(1.2);
  i = await I();
  assert(!i.attached && i.y < 0.1 && i.grounded, 'drop lets go to the ground');

  // --- horizontal pipe: grab from below, hand over hand, drop
  await tp(25.5, 0, 23.1, 0);
  await page.evaluate(() => { window.__tr.st().player.cam.yaw = Math.PI / 2; });
  await run(0.4);
  i = await I();
  assert(i.hint === 'pipeH:below', `pipe offered from below (${i.hint})`);
  await tap(BTN.Y);
  await run(0.5);
  const x0 = (await I()).x;
  r = await run(1.2, 0, 1);
  i = await I();
  assert(i.kind === 'pipeH' && (i.x - x0) / 1.2 > 0.7, `hand over hand along the pipe (${f2((i.x - x0) / 1.2)} m/s)`);
  contacts(r, 'pipe');
  await tap(BTN.B);
  await run(1);
  i = await I();
  assert(!i.attached && i.grounded, 'dropped off the pipe');

  // --- keyboard: E attaches (ladder), C lets go of a ledge
  await tp(25.2, 0, 11, Math.PI / 2);
  await run(0.4);
  await page.keyboard.down('KeyE');
  await page.evaluate(() => window.__app.loop.stepHeadless(3 / 60, 120));
  await page.keyboard.up('KeyE');
  await run(0.4);
  i = await I();
  assert(i.attached && i.kind === 'ladder', 'keyboard E climbs onto the ladder');
  await runOff(8, 0, -1);

  // --- touch: tapping the world prompt grabs the ledge
  await tp(25.45, 0, 16, Math.PI / 2);
  await page.evaluate(() => { window.__pad.disconnect(); });
  await page.evaluate(() => window.__app.loop.stepHeadless(0.4, 120));
  await page.evaluate(() => { window.__app.loop.manual = false; });
  await frames(page, 6);
  await page.waitForSelector('.wp-vault.show .wp-body', { timeout: 5000 });
  const box = await (await page.$('.wp-vault.show .wp-body')).boundingBox();
  assert(!!box, 'touch: the grab prompt is on screen');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(900);
  i = await I();
  assert(i.attached && i.kind === 'ledge', 'touch: tapping the prompt grabs the ledge');
  await page.waitForSelector('.wp-drop.show .wp-body', { timeout: 5000 });
  const dbox = await (await page.$('.wp-drop.show .wp-body')).boundingBox();
  assert(!!dbox, 'touch: the drop prompt is on screen');
  await page.touchscreen.tap(dbox.x + dbox.width / 2, dbox.y + dbox.height / 2);
  await page.waitForTimeout(1200);
  i = await I();
  assert(!i.attached, 'touch: tapping drop lets go');

  const errs = errors.filter((e) => !/favicon|DevTools/.test(e));
  assert(errs.length === 0, `no console errors (${errs.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(e.message ?? e);
  console.error('state', JSON.stringify(await I().catch(() => null)));
  if (errors.length) console.error(errors.slice(0, 5).join('\n'));
}
await browser.close();
process.exit(failed ? 1 : 0);
