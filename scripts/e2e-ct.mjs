// 3.2.0 Chaos Theory moves on the Proving Grounds CT course (north): split jump (prompt, the committed jump, feet
// braced on the walls, sidearm aim and fire with the aim band, drop, jump up to the lips), wall jump (straight up a
// wall and the inside-corner kick), horizontal pipe sub-states (legs up + the slow shimmy with the feet higher,
// inverted + sidearm aim and fire, curl up, back to the hands, the drop-and-flip landing on the feet; damage
// mid-change falls back to the hands); rappel (hook on, rope speeds, kick out + sideways, sidearm, kick through a window,
// unhook near the floor); fence (bullets / sight pass, stops the body, climb / shimmy speeds, rattle above gear 3,
// flip over).
import { launch, frames, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;

await page.evaluate(() => {
  const H = {
    st: () => window.__app.current,
    tp(x, y, z, yaw) {
      const st = H.st();
      st.traversal.reset();
      st.cover.reset();
      const p = st.player;
      p.controller.teleport(new p.controller.pos.constructor(x, y, z), yaw);
      p.cam.yaw = yaw;
      p.cam.pitch = 0;
    },
    /** Step `s` seconds (120 Hz frames) holding the stick / buttons. */
    run(s, sx = 0, sy = 0, btns = []) {
      const pad = window.__pad;
      pad.axis(0, sx);
      pad.axis(1, -sy);
      for (const b of btns) pad.set(b, 1);
      window.__app.loop.stepHeadless(s, 120);
      pad.axis(0, 0);
      pad.axis(1, 0);
      for (const b of btns) pad.set(b, 0);
    },
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
      const rig = st.player.rig;
      const w = st.weapons;
      return {
        x: c.pos.x, y: c.pos.y, z: c.pos.z, yaw: c.yaw, grounded: c.grounded,
        attached: ac.active, kind: a?.kind ?? null, id: a?.id ?? -1, top: a?.top ?? 0, nz: a?.nz ?? 0, phase: ac.m.phase, s: ac.m.s, entry: ac.m.entry,
        pipe: ac.pipe.mode, pipeBusy: ac.pipe.busy, trav: st.player.coverPose.traverse, tumble: st.player.coverPose.tumble,
        hint: ac.hint ? `${ac.hint.anchor.kind}:${ac.hint.entry}` : null,
        prompt: st.hud.world.label('vault'), drop: st.hud.world.label('drop'), jump: ac.jump ? ac.jump.anchor.kind : null,
        plantL: [rig.plantL.x, rig.plantL.y, rig.plantL.z, rig.plantL.w], plantR: [rig.plantR.x, rig.plantR.y, rig.plantR.z, rig.plantR.w],
        held: rig.heldWeapon ? true : false, cls: w.current.def.class, mag: w.current.mag, raise: st.player.carry.raise, ads: st.player.ads, stowed: w.isStowed,
        camYaw: st.player.cam.yaw, camPitch: st.player.cam.pitch, camRoll: st.player.cam.camera?.rotation?.z ?? 0,
        landing: c.lastLanding, fall: c.lastFall, landings: c.landings,
        split: !!ac.split, leaps: st.traversal.leaps, face: ac.m.face,
        u: ac.u, swing: ac.swingT, window: ac.ropeWindow ? ac.ropeWindow.id : -1, noise: st.noise, gear: c.gear, tkind: st.traversal.kind,
      };
    },
  };
  window.__ct = H;
  window.__app.loop.manual = true;
});
const I = async () => {
  await frames(page, 2);
  await page.evaluate(() => window.__app.loop.stepHeadless(1 / 60, 120));
  return page.evaluate(() => window.__ct.info());
};
const run = (s, sx = 0, sy = 0, btns = []) => page.evaluate(([s, sx, sy, b]) => window.__ct.run(s, sx, sy, b), [s, sx, sy, btns]);
const tap = (b) => page.evaluate((b) => window.__ct.tap(b), b);
const tp = (x, y, z, yaw) => page.evaluate(([x, y, z, yaw]) => window.__ct.tp(x, y, z, yaw), [x, y, z, yaw]);
const f2 = (v) => (+v).toFixed(2);

try {
  await page.evaluate(() => window.__pad.connect());
  await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await run(0.5);

  console.log('split jump');
  // corridor along x between walls at z 24 / 25.6 (faces 24.15 / 25.45), x 8..12
  await tp(10, 0, 24.8, Math.PI / 2);
  await run(0.4);
  let i = await I();
  assert(i.prompt === 'Split jump (double jump)' && i.split, `split shown facing along the corridor ("${i.prompt}")`);
  await tp(10, 0, 24.8, 0);
  await run(0.4);
  i = await I();
  assert(!i.split, 'not offered facing a wall');
  await tp(10, 0, 24.8, Math.PI / 2);
  await run(0.4);
  // (3.2.0) a double jump: the first Y jumps, the second in the air braces in the split
  await tap(BTN.Y);
  i = await I();
  assert(!i.attached && !i.grounded && i.leaps > 0, `one Y: a jump (leaps ${i.leaps}, grounded ${i.grounded})`);
  await tap(BTN.Y);
  await run(0.2);
  i = await I();
  assert(i.attached && i.kind === 'split' && i.phase === 'enter', `a second Y in the air jumps into the split (${i.kind} ${i.phase})`);
  await run(0.4);
  i = await I();
  assert(i.phase === 'on' && Math.abs(i.y - 2.5) < 0.05 && i.trav === 'split', `braced with the feet line 2.5 m up (y ${f2(i.y)}, ${i.trav})`);
  const walls = [24.15, 25.45];
  const onWall = (p) => p[3] > 0.99 && Math.abs(p[1] - 2.5) < 0.05 && walls.some((w) => Math.abs(p[2] - w) < 0.08);
  assert(onWall(i.plantL) && onWall(i.plantR) && Math.abs(i.plantL[2] - i.plantR[2]) > 1.1, `feet planted on the two walls (${i.plantL.map(f2)} / ${i.plantR.map(f2)})`);
  assert(i.stowed && !i.held, 'weapon stowed while braced');
  // stick does nothing (no travel)
  const x0 = i.x;
  await run(0.6, 0, 1);
  i = await I();
  assert(Math.abs(i.x - x0) < 0.01 && i.attached, `no travel along the split (${f2(i.x - x0)} m)`);
  // aim: the sidearm comes out one-handed; the aim stays within 100 deg of the corridor and -85..+30 pitch
  await page.evaluate(() => window.__pad.set(6, 1));
  await run(0.8);
  i = await I();
  assert(i.ads && i.cls === 'pistol' && i.held && i.raise > 0.9, `LT draws and raises the sidearm (${i.cls}, raise ${f2(i.raise)})`);
  const mag0 = i.mag;
  await page.evaluate(() => { const c = window.__app.current.player.cam; c.yaw += 2.6; c.pitch = 1.2; });
  await run(0.05);
  i = await I();
  const dYaw = Math.atan2(Math.sin(i.camYaw - Math.PI / 2), Math.cos(i.camYaw - Math.PI / 2));
  assert(Math.abs(dYaw) <= (100 * Math.PI) / 180 + 0.01 && i.camPitch <= (30 * Math.PI) / 180 + 0.01, `aim held within the band (yaw ${f2((dYaw * 180) / Math.PI)} deg, pitch ${f2((i.camPitch * 180) / Math.PI)} deg)`);
  await page.evaluate(() => { const c = window.__app.current.player.cam; c.yaw = Math.PI / 2; c.pitch = -0.3; });
  await run(0.3, 0, 0, [7]);
  i = await I();
  assert(i.mag < mag0 && i.attached, `RT fires from the split (mag ${mag0} -> ${i.mag})`);
  await page.evaluate(() => window.__pad.set(6, 0));
  await run(1.0);
  i = await I();
  assert(i.stowed && i.attached, 'letting go of aim stows it again, still braced');
  // B drops (a landing)
  const land0 = i.landings;
  await tap(BTN.B);
  await run(1.2);
  i = await I();
  assert(!i.attached && i.grounded && Math.abs(i.y) < 0.1 && i.landings > land0, `B drops out to the floor (y ${f2(i.y)}, landing ${i.landing} ${f2(i.fall)} m)`);
  // Y from the split up to the lips over it
  await tp(10, 0, 24.8, Math.PI / 2);
  await run(0.4);
  await tap(BTN.Y);
  await tap(BTN.Y);
  await run(0.9);
  i = await I();
  assert(i.kind === 'split' && i.jump === 'ledge', `a lip in reach above the split (${i.jump})`);
  await tap(BTN.Y);
  await run(1.0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && Math.abs(i.top - 4.3) < 0.05, `Y jumps up from the split to a lip (${i.kind}, top ${f2(i.top)})`);
  await tap(BTN.B);
  await run(1.5);

  console.log('manual jump (3.2.0)');
  // open floor: up and down again (the pace carried)
  await tp(0, 0, 4, 0);
  await run(0.4);
  let ly = 0;
  await page.evaluate(() => window.__app.input.state.tap('leap'));
  for (let k = 0; k < 12; k++) {
    await run(0.05);
    ly = Math.max(ly, (await I()).y);
  }
  await run(0.8);
  i = await I();
  assert(ly > 0.6 && ly < 1.0 && i.grounded && !i.attached, `Jump: up ${f2(ly)} m and down again`);
  // under the 2.5 m pipe: the hands take it
  await tp(0.5, 0, 23, Math.PI / 2);
  await run(0.4);
  await page.evaluate(() => window.__app.input.state.tap('leap'));
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'pipeH', `Jump under a pipe grabs it (${i.kind})`);
  await tap(BTN.B);
  await run(1.0);
  // at the 2.3 m hang block (x 26..29, z 14.5..17.5): the lip
  await tp(27.5, 0, 13.8, 0);
  await run(0.4);
  await page.evaluate(() => window.__app.input.state.tap('leap'));
  await run(0.8);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && Math.abs(i.top - 2.3) < 0.05, `Jump at a lip grabs it (${i.kind}, top ${f2(i.top)})`);
  await tap(BTN.B);
  await run(1.0);
  // beside the tower's drainpipe (27.8, 9.42, on its south face): it is grabbed in the air
  await tp(27.8, 0, 8.9, 0);
  await run(0.4);
  await page.evaluate(() => window.__app.input.state.tap('leap'));
  await run(0.6);
  i = await I();
  assert(i.attached && i.kind === 'pipeV', `Jump at a drainpipe grabs it (${i.kind})`);
  await tap(BTN.B);
  await run(1.5);

  console.log('wall jump');
  // the 3.3 m block (z 24..27): facing its south face from 0.7 m
  await tp(17.5, 0, 23.3, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:wall' && i.prompt === 'Wall jump', `wall jump offered under the 3.3 m lip (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(0.3);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && i.entry === 'wall' && i.trav === 'wallKick', `the kick (${i.kind} ${i.entry} ${i.trav})`);
  await run(0.6);
  i = await I();
  assert(i.phase === 'on' && Math.abs(i.top - 3.3) < 0.05 && Math.abs(i.y - (3.3 - 1.9)) < 0.08, `hanging from the lip after the wall jump (y ${f2(i.y)})`);
  await tap(BTN.B);
  await run(1.2);
  // a standing grab lip is not a wall jump; 2 m out is too far
  await tp(17.5, 0, 22.2, 0);
  await run(0.4);
  i = await I();
  assert(i.hint !== 'ledge:wall', `too far from the wall: no wall jump (${i.hint})`);
  // inside corner: facing the 4.5 m wall west of the block, the block's south lip side-on beside it
  await tp(16.55, 0, 23.45, -Math.PI / 2);
  await run(0.4);
  i = await I();
  assert(i.hint === 'ledge:wall', `inside corner kick offered (${i.hint})`);
  await tap(BTN.Y);
  await run(1.0);
  i = await I();
  assert(i.attached && i.kind === 'ledge' && Math.abs(i.top - 3.3) < 0.05 && i.nz < -0.9, `kicked off the corner onto the block's south lip (top ${f2(i.top)}, nz ${f2(i.nz)})`);
  await tap(BTN.B);
  await run(1.2);

  console.log('pipe legs up / inverted');
  // pipe along x at z 23, 2.5 m up (x -3..3.5)
  await tp(0.5, 0, 22.7, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'pipeH:below', `pipe offered (${i.hint})`);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.kind === 'pipeH' && i.pipe === 'hands' && i.prompt === 'Legs up', `hanging by the hands, Y offers legs up ("${i.prompt}")`);
  // (3.2.0) facing along the pipe (+-x), not across it; held back against the facing it turns round
  assert(Math.abs(Math.sin(i.yaw)) > 0.99, `hanging facing along the pipe (yaw ${f2(i.yaw)})`);
  {
    await page.evaluate(() => { window.__app.current.player.cam.yaw = 0; });
    const face0 = i.face;
    await run(0.5, -face0, 0);
    i = await I();
    assert(i.face === -face0 && Math.abs(Math.sin(i.yaw)) > 0.99 && i.attached, `held back along the pipe: turned round (face ${face0} -> ${i.face})`);
    await run(0.4);
  }
  const handsFeet = i.y;
  await tap(BTN.Y);
  await run(0.25);
  i = await I();
  assert(i.pipeBusy && i.attached, 'legs up is a committed change');
  await run(0.5);
  i = await I();
  assert(i.pipe === 'legsUp' && i.trav === 'pipeLegs' && Math.abs(i.tumble + Math.PI / 2) < 0.01, `legs up over the pipe (${i.trav}, tumble ${f2(i.tumble)})`);
  assert(i.plantL[1] > handsFeet + 0.6 && i.plantL[3] > 0.99, `feet up over the pipe (feet ${f2(i.plantL[1])} m vs ${f2(handsFeet)} m hanging)`);
  const s0 = i.s;
  await run(1.0, 1, 0);
  i = await I();
  const sp = Math.abs(i.s - s0);
  assert(sp > 0.35 && sp < 0.6, `legs-up shimmy at ~0.5 m/s (${f2(sp)} m in 1 s)`);
  assert(i.prompt === 'Invert' && i.drop === 'Hands', `prompts: Y invert, B hands ("${i.prompt}" / "${i.drop}")`);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.pipe === 'inverted' && i.trav === 'pipeInv' && Math.abs(i.tumble - Math.PI) < 0.01, `inverted by the knees (${i.trav}, tumble ${f2(i.tumble)})`);
  assert(Math.abs(i.camRoll) < 0.05, `the camera stays upright (roll ${f2(i.camRoll)})`);
  const s1 = i.s;
  await run(0.6, 1, 0);
  i = await I();
  assert(Math.abs(i.s - s1) < 0.01, 'no travel inverted');
  await page.evaluate(() => window.__pad.set(6, 1));
  await run(0.9);
  i = await I();
  assert(i.ads && i.cls === 'pistol' && i.raise > 0.9, `LT aims the sidearm inverted (raise ${f2(i.raise)})`);
  const m1 = i.mag;
  await run(0.3, 0, 0, [7]);
  i = await I();
  assert(i.mag < m1, `RT fires inverted (mag ${m1} -> ${i.mag})`);
  const spread = await page.evaluate(() => window.__app.current.weapons.attachSpread);
  assert(Math.abs(spread - 1.3) < 1e-6, `inverted spread x1.3 (${spread})`);
  await page.evaluate(() => window.__pad.set(6, 0));
  await run(0.8);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.pipe === 'legsUp', `Y curls back up (${i.pipe})`);
  await tap(BTN.B);
  await run(0.7);
  i = await I();
  assert(i.pipe === 'hands' && Math.abs(i.tumble) < 0.01 && i.attached, `B back to the hands (${i.pipe})`);
  // damage mid-change falls back to the hands
  await tap(BTN.Y);
  await run(0.15);
  await page.evaluate(() => window.__app.current.traversal.attachCtl.onHit());
  await run(0.1);
  i = await I();
  assert(i.pipe === 'hands' && !i.pipeBusy, `damage mid-change: back to the hands (${i.pipe})`);
  // inverted, B: drop and flip to the feet
  await tap(BTN.Y);
  await run(0.7);
  await tap(BTN.Y);
  await run(0.8);
  i = await I();
  assert(i.pipe === 'inverted', 'inverted again');
  const l0 = i.landings;
  await tap(BTN.B);
  await run(0.25);
  i = await I();
  assert(i.tumble > Math.PI && i.attached, `B flips over (tumble ${f2(i.tumble)})`);
  await run(1.0);
  i = await I();
  assert(!i.attached && i.grounded && Math.abs(i.tumble) < 0.01 && i.landings > l0 && Math.abs(i.y) < 0.1, `lands on the feet (landing ${i.landing}, ${f2(i.fall)} m)`);

  console.log('rappel');
  // the rappel house (x 21.5..26.5, z 26.5..29.5, roof 5.7): on the roof at the south edge, facing out
  await tp(24, 5.72, 26.9, Math.PI);
  await run(0.4);
  i = await I();
  assert(i.hint === 'rappel:above' && i.prompt === 'Rappel', `rappel offered at the roof edge (${i.hint}, "${i.prompt}")`);
  await tap(BTN.Y);
  await run(1.0);
  i = await I();
  assert(i.attached && i.kind === 'rappel' && i.phase === 'on' && Math.abs(i.y - 4.7) < 0.1, `hooked on and over the edge (y ${f2(i.y)})`);
  assert(Math.cos(i.yaw) > 0.95, `facing the wall (yaw ${f2(i.yaw)})`);
  // (look at the wall: the prompts are on the body)
  await page.evaluate(() => { window.__app.current.player.cam.yaw = 0; });
  let y0 = i.y;
  await run(1.0, 0, -1);
  i = await I();
  assert(y0 - i.y > 1.3 && y0 - i.y < 1.75, `descends ~1.6 m/s (${f2(y0 - i.y)} m in 1 s)`);
  y0 = i.y;
  await run(1.0, 0, 1);
  i = await I();
  assert(i.y - y0 > 0.8 && i.y - y0 < 1.15, `climbs ~1.0 m/s (${f2(i.y - y0)} m in 1 s)`);
  y0 = i.y;
  await run(0.5, 0, -1, [BTN.LS]);
  i = await I();
  assert(y0 - i.y > 1.0, `sprint held: a fast descent (${f2(y0 - i.y)} m in 0.5 s)`);
  // kick out, sideways with the stick
  assert(i.prompt === 'Kick out', `Y offers a kick out ("${i.prompt}")`);
  const z0 = i.z;
  const u0 = i.u;
  await page.evaluate(() => { window.__pad.axis(0, 1); window.__pad.set(3, 1); window.__app.loop.stepHeadless(2 / 60, 120); window.__pad.set(3, 0); });
  await run(0.45, 1, 0);
  i = await I();
  assert(z0 - i.z > 0.9 && i.swing > 0, `swung out from the wall (${f2(z0 - i.z)} m)`);
  await run(0.7);
  i = await I();
  assert(Math.abs(i.z - z0) < 0.05 && Math.abs(i.u - u0) > 0.5, `back on the wall, moved sideways (${f2(i.u - u0)} m)`);
  // the sidearm off the rope: the body turns round to aim out (looking out over the yard)
  await page.evaluate(() => { window.__app.current.player.cam.yaw = Math.PI; window.__pad.set(6, 1); });
  await run(0.9);
  i = await I();
  assert(i.ads && i.cls === 'pistol' && i.raise > 0.9 && Math.cos(i.yaw) < -0.5, `LT aims the sidearm out from the rope (yaw ${f2(i.yaw)})`);
  const mr = i.mag;
  await run(0.3, 0, 0, [7]);
  i = await I();
  assert(i.mag < mr, `RT fires from the rope (${mr} -> ${i.mag})`);
  await page.evaluate(() => { window.__pad.set(6, 0); window.__app.current.player.cam.yaw = 0; });
  await run(0.8);
  // over to the window (sideways back to the middle), down to its height: kick through it
  await page.evaluate(() => { window.__app.current.traversal.attachCtl.u = 0; });
  for (let k = 0; k < 40; k++) {
    i = await I();
    if (i.window >= 0) break;
    await run(0.1, 0, i.y > 1.2 ? -1 : 1);
  }
  assert(i.window >= 0 && i.prompt === 'Kick through', `a window beside the rope ("${i.prompt}", feet ${f2(i.y)})`);
  await tap(BTN.Y);
  await run(1.2);
  i = await I();
  const broken = await page.evaluate(() => window.__app.current.world.breakables.isOpen(`glass:${window.__app.current.world.level.anchors.windows.find((w) => Math.abs(w.c.z - 26.5) < 0.1 && Math.abs(w.c.x - 24) < 0.1).id}`));
  assert(!i.attached && i.grounded && i.z > 26.8 && broken, `kicked through the window into the room (z ${f2(i.z)}, glass broken ${broken})`);
  // unhook near the floor
  await tp(24, 5.72, 26.9, Math.PI);
  await run(0.4);
  await tap(BTN.Y);
  await run(1.0);
  await page.evaluate(() => { window.__app.current.traversal.attachCtl.u = 1.2; window.__app.current.player.cam.yaw = 0; });
  i = await I();
  assert(!i.drop, `no unhook high up ("${i.drop}")`);
  await run(2.2, 0, -1);
  i = await I();
  assert(i.drop === 'Unhook' && i.y < 2.05, `Unhook offered near the floor (feet ${f2(i.y)})`);
  await tap(BTN.B);
  await run(1.0);
  i = await I();
  assert(!i.attached && i.grounded, 'B unhooks to the floor');
  await page.evaluate(() => { window.__app.current.world.ropes.flush(); });

  console.log('fence');
  // chain-link fence along x at z 26 (x -12..-6), 2.6 m
  await tp(-9, 0, 25.3, 0);
  await run(0.4);
  i = await I();
  assert(i.hint === 'fence:side' && i.prompt === 'Climb', `fence offered (${i.hint}, "${i.prompt}")`);
  const see = await page.evaluate(() => {
    const g = window.__app.current;
    const V = g.player.position.constructor;
    const shot = g.ballistics.ray(new V(-9, 1.2, 24), new V(-9, 1.2, 28), 169).hit;
    const sight = g.ballistics.ray(new V(-9, 1.6, 24), new V(-9, 1.6, 28), 1).hit;
    return { shot, sight };
  });
  assert(!see.shot && !see.sight, `bullets and sight pass through it (${JSON.stringify(see)})`);
  // walking into it stops the body
  await run(1.0, 0, 1);
  i = await I();
  assert(i.z < 25.9, `the fence stops the body (z ${f2(i.z)})`);
  await tp(-9, 0, 25.3, 0);
  await run(0.3);
  await tap(BTN.Y);
  await run(0.5);
  i = await I();
  assert(i.attached && i.kind === 'fence', 'Y grabs the fence');
  // gear 4 (above the quiet gears) rattles
  y0 = i.y;
  await run(0.5, 0, 1);
  i = await I();
  assert(i.noise >= 3.9 && i.y - y0 > 0.35, `climbing at gear ${i.gear} rattles (${f2(i.noise)} m), ~0.9 m/s (${f2(i.y - y0)} m in 0.5 s)`);
  await page.evaluate(() => { window.__app.current.player.controller.gears.gear = 3; });
  await run(0.25, 0, -1);
  await run(0.3, 0, -0.5);
  i = await I();
  assert(i.attached && i.noise < 0.5, `gear 3: quiet (${f2(i.noise)} m, still on it ${i.attached})`);
  const fx0 = i.x;
  await run(1.0, 1, 0);
  i = await I();
  assert(Math.abs(i.x - fx0) > 0.45 && Math.abs(i.x - fx0) < 0.7, `shimmies ~0.6 m/s (${f2(Math.abs(i.x - fx0))} m)`);
  await run(2.0, 0, 1);
  i = await I();
  assert(i.prompt === 'Flip over', `at the top: flip over ("${i.prompt}", feet ${f2(i.y)})`);
  await tap(BTN.Y);
  await run(1.2);
  i = await I();
  assert(!i.attached && i.grounded && i.z > 26.4 && Math.abs(i.y) < 0.1, `flipped over to the far side (z ${f2(i.z)})`);
  await page.evaluate(() => { window.__app.current.player.controller.gears.gear = 4; });

  const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-ct OK');
