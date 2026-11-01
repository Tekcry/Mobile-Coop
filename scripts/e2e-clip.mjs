// Weapon clipping sweep (the Test Chamber, G2b): every frame of movement scenarios, points along the held
// gun are checked against the world (chest -> stock, then along the gun: blocked = through a wall) and against
// the legs (thigh / calf capsules). Bars: no frame with the gun > 2 cm into the world; legs graze <= 2.5 cm.
// Scenarios: walking / crouch-walking along a wall both sides, sprint, crouch run; (anim-rework S4) crouched holstered (the knee hand, arms vs legs).  `node scripts/e2e-clip.mjs [url] [--only=name] [--log]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
const log = process.argv.includes('--log');
const { browser, page, errors } = await launch({ url, params: 'autostart=studio' });
let failed = false;
try {
// (the sim advances only through stepHeadless: on a hardware GPU the live loop would run ~150 steps of the match in the wait below, a different
// starting state each run, where software GL ran one or two)
await page.evaluate(() => { window.__app.loop.manual = true; });
await frames(page, 10);
const res = await page.evaluate(([only, log]) => {
  window.__dbg = log;
  const a = window.__app, g = a.current, p = g.player, c = p.controller, st = a.input.state, V = p.position.constructor, rig = p.rig;
  const tmp = new V(), o = new V();
  const headR = rig['p'].head.h * 0.95 / 2;
  const legSeg = [[rig.hipL, rig.kneeL, 0.075], [rig.kneeL, rig.ankleL, 0.05], [rig.hipR, rig.kneeR, 0.075], [rig.kneeR, rig.ankleR, 0.05]];
  const segDist = (P, A, B) => { const abx = B.x - A.x, aby = B.y - A.y, abz = B.z - A.z; const t = Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby + (P.z - A.z) * abz) / (abx * abx + aby * aby + abz * abz || 1))); return Math.hypot(P.x - A.x - abx * t, P.y - A.y - aby * t, P.z - A.z - abz * t); };
  const check = (acc) => {
    const node = rig.heldWeapon; if (!node) return;
    const def = g.weapons.current.def;
    const z0 = rig.gunSpan.z0;
    const z1 = def.muzzle[2];
    const m = node.getWorldMatrix();
    rig.torso.computeWorldMatrix(true); o.copyFrom(rig.torso.getAbsolutePosition()); o.y += 0.1;
    let pen = 0, leg = 9, head = 9, chest = 9;
    const knees = legSeg.map(([A, B, r]) => [A.getAbsolutePosition().clone(), B.getAbsolutePosition().clone(), r]);
    rig.headNode.computeWorldMatrix(true);
    const hc = rig.headNode.getAbsolutePosition().clone();
    rig.neck.computeWorldMatrix(true);
    const nk = rig.neck.getAbsolutePosition().clone();
    const pv = rig.hips.getAbsolutePosition().clone();
    // the weapon's real extents (rotated parts included), as the rig uses them
    const top = rig.gunSpan.top;
    // the stock is held at the body: chest -> stock, then along the gun to each point
    const butt = V.TransformCoordinates(new V(0, def.muzzle[1], z0), m);
    const hb = g.ballistics.ray(o, butt, 1);
    if (hb.hit) pen = Math.max(pen, V.Distance(hb.point, butt));
    for (let z = z0; z <= z1 + 1e-6; z += 0.06) {
      V.TransformCoordinatesToRef(tmp.set(0, def.muzzle[1], z), m, tmp);
      const h = g.ballistics.ray(hb.hit ? o : butt, tmp, 1);
      if (h.hit) pen = Math.max(pen, V.Distance(h.point, tmp));
      for (const [A, B, r] of knees) leg = Math.min(leg, segDist(tmp, A, B) - r - 0.012);
      // own body: the gun's bore line and top edge against the head ball and the trunk (pelvis -> neck)
      for (const yy of [def.muzzle[1], top]) {
        V.TransformCoordinatesToRef(tmp.set(0, yy, z), m, tmp);
        head = Math.min(head, V.Distance(tmp, hc) - headR);
        const dc = segDist(tmp, pv, nk) - 0.1;
        if (dc < chest) { chest = dc; acc.chestAt = z; }
      }
    }
    if (window.__dbg && (head < -0.01 || chest < -0.02)) acc.log.push(`t ${acc.n} HEAD ${(head * 100).toFixed(1)} TRUNK ${(chest * 100).toFixed(1)} lean ${p.rig.graph.leanOut.toFixed(2)} push ${(p.rig.gunPush * 100).toFixed(1)} raise ${p.carry.raise.toFixed(2)} w ${g.weapons.current?.def?.id} sw ${g.weapons.swapT?.toFixed?.(2)} travel ${!!g.weapons.current?.model?.travelling} pitch ${p.cam.pitch.toFixed(2)}`);
    // limbs: elbows outside the trunk, knees and feet never through each other (positions forced fresh)
    for (const n of [rig.hipL, rig.kneeL, rig.ankleL, rig.hipR, rig.kneeR, rig.ankleR, rig.shoulderL, rig.elbowL, rig.shoulderR, rig.elbowR]) n.computeWorldMatrix(true);
    for (const e of [rig.elbowL, rig.elbowR]) acc.minElbow = Math.min(acc.minElbow, segDist(e.getAbsolutePosition(), pv, nk) - 0.1);
    const kd = V.Distance(rig.kneeL.getAbsolutePosition(), rig.kneeR.getAbsolutePosition());
    if (window.__dbg && kd < 0.09) acc.log.push(`t ${acc.n} KNEES ${(kd * 100).toFixed(1)} body ${c.yaw.toFixed(2)} speed ${c.speed.toFixed(2)} motion ${c['motion']?.state ?? ''} crouch ${c.crouched} lean ${p.rig.graph.leanOut.toFixed(2)}`);
    acc.minKnees = Math.min(acc.minKnees, kd);
    acc.minFeet = Math.min(acc.minFeet, V.Distance(rig.ankleL.getAbsolutePosition(), rig.ankleR.getAbsolutePosition()));
    acc.minHead = Math.min(acc.minHead, head);
    acc.minChest = Math.min(acc.minChest, chest);
    acc.n++;
    if (pen > 0.02) { acc.wall++; if (window.__dbg) acc.log.push(`t ${acc.n} pen ${(pen*100).toFixed(0)} w ${g.weapons.current?.def?.id ?? g.weapons.slots?.[g.weapons.index]?.def?.id} sw ${g.weapons.swapT?.toFixed?.(2)} stow ${g.weapons.stowed} raise ${p.carry.raise.toFixed(2)} aim ${(p.cam.yaw).toFixed(2)} body ${c.yaw.toFixed(2)}`); }
    acc.maxPen = Math.max(acc.maxPen, pen);
    if (leg < 0) { acc.leg++; if (window.__dbg) acc.log.push(`t ${acc.n} LEG ${(leg*100).toFixed(1)} lean ${p.rig.graph.leanOut.toFixed(2)} body ${c.yaw.toFixed(2)} aim ${p.cam.yaw.toFixed(2)} crouch ${c.crouched}`); }
    acc.minLeg = Math.min(acc.minLeg, leg);
  };
  // traversal: no part of the body (trunk, head, thighs, calves, upper arms) goes into the world: each sample point
  // is raycast from the hips; a hit before the point is how far it is inside (hands and feet are on the grips and
  // rungs, so the forearms and feet are left out)
  const bodyPts = [[rig.hips, rig.neck, 0.12], [rig.hipL, rig.kneeL, 0.07], [rig.kneeL, rig.ankleL, 0.05], [rig.hipR, rig.kneeR, 0.07], [rig.kneeR, rig.ankleR, 0.05], [rig.shoulderL, rig.elbowL, 0.045], [rig.shoulderR, rig.elbowR, 0.045]];
  const from = new V(), pt = new V();
  const bodyCheck = (acc) => {
    for (const n of [rig.hips, rig.spine, rig.torso, rig.neck, rig.headNode, rig.hipL, rig.kneeL, rig.ankleL, rig.hipR, rig.kneeR, rig.ankleR, rig.shoulderL, rig.elbowL, rig.shoulderR, rig.elbowR]) n.computeWorldMatrix(true);
    from.copyFrom(rig.hips.getAbsolutePosition());
    let pen = 0;
    let where = '';
    for (const [A, B, r] of bodyPts) {
      const a0 = A.getAbsolutePosition(), b0 = B.getAbsolutePosition();
      // a calf stops short of the ankle (the foot is on the floor / rung)
      const last = B === rig.ankleL || B === rig.ankleR ? 3 : 4;
      for (let k = 0; k <= last; k++) {
        V.LerpToRef(a0, b0, k / 4, pt);
        const h = g.ballistics.ray(from, pt, 1);
        if (h.hit) { const d = V.Distance(h.point, pt) - r * 0.5; if (d > pen) { pen = d; where = B.name; } }
      }
    }
    const hc = rig.headNode.getAbsolutePosition();
    const hh = g.ballistics.ray(from, hc, 1);
    if (hh.hit) { const d = V.Distance(hh.point, hc); if (d > pen) { pen = d; where = 'head'; } }
    for (const n of [rig.kneeL, rig.kneeR, rig.ankleL, rig.ankleR]) n.computeWorldMatrix(true);
    const kd = V.Distance(rig.kneeL.getAbsolutePosition(), rig.kneeR.getAbsolutePosition());
    if (window.__dbg && kd < 0.09) acc.log.push(`t ${acc.n} KNEES ${(kd * 100).toFixed(1)} feet ${c.pos.y.toFixed(2)} trav ${g.traversal.attachCtl.m.kind}/${g.traversal.attachCtl.m.phase} v ${g.traversal.attachCtl.m.v.toFixed(2)} pose ${p.pose.traverse}`);
    acc.minKnees = Math.min(acc.minKnees, kd);
    // (anim-bake-targets) Michael's 2026-10-22 tune (idle trackMul 0.05): the first frame after a teleport still shows the
    // standing stance of the scenario before (ankles ~3 cm apart), not the climb: the feet count from the second frame
    if (acc.n > 0) acc.minFeet = Math.min(acc.minFeet, V.Distance(rig.ankleL.getAbsolutePosition(), rig.ankleR.getAbsolutePosition()));
    acc.n++;
    acc.maxBody = Math.max(acc.maxBody ?? 0, pen);
    if (pen > 0.03) { acc.body = (acc.body ?? 0) + 1; if (window.__dbg) acc.log.push(`t ${acc.n} BODY ${(pen * 100).toFixed(1)} at ${where} feet ${c.pos.x.toFixed(2)},${c.pos.y.toFixed(2)},${c.pos.z.toFixed(2)} trav ${g.traversal.attachCtl.m.kind}/${g.traversal.attachCtl.m.phase} kind ${g.traversal.kind} wall ${g.wallCore?.phase ?? '-'}`); }
  };
  const runBody = (sec, f) => { const acc = { n: 0, wall: 0, maxPen: 0, leg: 0, minLeg: 9, minHead: 9, minChest: 9, minElbow: 9, minKnees: 9, minFeet: 9, body: 0, maxBody: 0, log: [] }; let t = 0; while (t < sec) { f?.(t); a.loop.stepHeadless(1 / 30, 120); t += 1 / 30; bodyCheck(acc); check(acc); } return acc; };
  const merge = (r, r2) => { r.n += r2.n; r.body += r2.body; r.maxBody = Math.max(r.maxBody, r2.maxBody); r.minKnees = Math.min(r.minKnees, r2.minKnees); r.minFeet = Math.min(r.minFeet, r2.minFeet); r.log.push(...r2.log); return r; };
  const tpY = (x, y, z, yaw) => { g.traversal.reset(); st.releaseAll(); c.teleport(new V(x, y, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; a.loop.stepHeadless(0.5, 120); };
  const T = {
    'ladder climb': () => { tpY(3.8, 0, 9, -Math.PI / 2); st.tap('jump'); return runBody(7, () => move(0, 1)); },
    'ladder down + slide': () => { tpY(2.35, 3.0, 9, Math.PI / 2); st.tap('jump'); const r = runBody(2.5, () => move(0, -1)); move(0, 0); st.tap('drop'); const r2 = runBody(2); return merge(r, r2); },
    'drainpipe + lip': () => { tpY(3.55, 0, 10.4, -Math.PI / 2); st.tap('jump'); const r = runBody(5, () => move(0, 1)); st.tap('jump'); const r2 = runBody(1.5); return merge(r, r2); },
    'hang shimmy + corner': () => { tpY(4, 0, 24.4, 0); st.tap('jump'); runBody(0.5); return runBody(4.5, (t) => move(t < 1 ? 1 : -1, 0)); },
    'hang climb up': () => { tpY(4, 0, 24.4, 0); st.tap('jump'); runBody(0.6); st.tap('jump'); return runBody(1.6); },
    'pipe hand over hand': () => { tpY(25.2, 0, 6.5, Math.PI / 2); p.cam.yaw = 0; st.tap('jump'); return runBody(3, () => move(0, 1)); },
    // (G2b) the floor duct (`ducts[0]`, x 21-25 at z 14) and the booth's roof duct, a ceiling vent over the booth (`ducts[1]`, 0.75 m of crawl)
    // (the far grate is opened first: the controller unscrews it at the path's end, and until then the head, 0.5 m ahead of the feet, reads the closed grate)
    'duct crawl + vent': () => { tpY(20.4, 0, 14, Math.PI / 2); g.world.breakables.open(`grate:${g.world.level.anchors.ducts[0].id}:exit`, 'unscrew'); st.tap('jump'); runBody(0.8); return runBody(8, () => move(0, 1)); },
    'booth vent drop': () => { tpY(27.5, 4.42, 26.7, -Math.PI / 2); st.tap('jump'); runBody(0.8); return runBody(8, () => move(0, 1)); },
    'window vault': () => { tpY(18, 0, 2.8, 0); st.tap('jump'); return runBody(1.5); },
    'zipline': () => { tpY(5.3, 2.42, 26.4, Math.PI); st.tap('jump'); return runBody(3); },
    'landing roll': () => { tpY(20, 3.4, 21, 0); return runBody(2); },
  };
  const tp = (x, z, yaw) => { st.releaseAll(); if (c.crouched) c['crouchToggled'] = false; c.teleport(new V(x, 0, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; a.loop.stepHeadless(0.5, 120); };
  const run = (sec, f) => { const acc = { n: 0, wall: 0, maxPen: 0, leg: 0, minLeg: 9, minHead: 9, minChest: 9, minElbow: 9, minKnees: 9, minFeet: 9, log: [] }; let t = 0; while (t < sec) { f?.(t); a.loop.stepHeadless(1 / 30, 120); t += 1 / 30; check(acc); } return acc; };
  const move = (x, y) => st.setMove('t', x, y);
  // (anim-rework S4) holstered limbs against the body (no gun to check): each forearm (elbow -> wrist, sampled) and upper
  // arm against both thighs and the trunk, the knees and feet apart; the knee hand rests on its knee, so a graze up to
  // 3 cm reads as contact, deeper as through. The limbs taper (radius at the start and at the end of each segment: the
  // upper arm 4.5 -> 4 cm, the forearm 4 -> 2.5 cm at the wrist, the thigh 7.5 -> 5 cm at the knee)
  const armSeg = [[rig.shoulderL, rig.elbowL, 0.045, 0.04], [rig.elbowL, rig.wristL, 0.04, 0.025], [rig.shoulderR, rig.elbowR, 0.045, 0.04], [rig.elbowR, rig.wristR, 0.04, 0.025]];
  /** Distance from P to the segment A -> B minus its tapered radius (r0 at A, r1 at B). */
  const taper = (P, A, B, r0, r1) => { const abx = B.x - A.x, aby = B.y - A.y, abz = B.z - A.z; const t = Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby + (P.z - A.z) * abz) / (abx * abx + aby * aby + abz * abz || 1))); return Math.hypot(P.x - A.x - abx * t, P.y - A.y - aby * t, P.z - A.z - abz * t) - (r0 + (r1 - r0) * t); };
  const ap = new V();
  const limbCheck = (acc) => {
    for (const n of [rig.hips, rig.neck, rig.hipL, rig.kneeL, rig.ankleL, rig.hipR, rig.kneeR, rig.ankleR, rig.shoulderL, rig.elbowL, rig.wristL, rig.shoulderR, rig.elbowR, rig.wristR]) n.computeWorldMatrix(true);
    const pv = rig.hips.getAbsolutePosition();
    const nk = rig.neck.getAbsolutePosition();
    let worst = 9;
    let where = '';
    for (const [A, B, r0, r1] of armSeg) {
      const a0 = A.getAbsolutePosition(), b0 = B.getAbsolutePosition();
      for (let k = 0; k <= 4; k++) {
        V.LerpToRef(a0, b0, k / 4, ap);
        const r = r0 + ((r1 - r0) * k) / 4;
        for (const [H, K] of [[rig.hipL, rig.kneeL], [rig.hipR, rig.kneeR]]) {
          const d = taper(ap, H.getAbsolutePosition(), K.getAbsolutePosition(), 0.075, 0.05) - r;
          if (d < worst) { worst = d; where = B.name + ' / thigh'; }
        }
        // the upper arm hangs beside the trunk (the shoulder joint itself sits on it: from a third of the way down)
        if (B === rig.elbowL || B === rig.elbowR ? k >= 2 : true) {
          const d = segDist(ap, pv, nk) - 0.1 - r;
          if (d < worst) { worst = d; where = B.name + ' / trunk'; }
        }
      }
    }
    if (window.__dbg && worst < -0.03) acc.log.push(`t ${acc.n} LIMB ${(worst * 100).toFixed(1)} at ${where} crouch ${c.crouched} speed ${c.speed.toFixed(2)}`);
    // (anim-natural N2, #138 fix round 4) where the least clearance was (report only: the GPU run cannot be replayed headless)
    if (worst < acc.minLimb) acc.minAt = `${where} frame ${acc.n}`;
    acc.minLimb = Math.min(acc.minLimb, worst);
    acc.minKnees = Math.min(acc.minKnees, V.Distance(rig.kneeL.getAbsolutePosition(), rig.kneeR.getAbsolutePosition()));
    acc.minFeet = Math.min(acc.minFeet, V.Distance(rig.ankleL.getAbsolutePosition(), rig.ankleR.getAbsolutePosition()));
    acc.n++;
  };
  const runLimbs = (sec, f) => { const acc = { n: 0, minLimb: 9, minKnees: 9, minFeet: 9, log: [] }; let t = 0; while (t < sec) { f?.(t); a.loop.stepHeadless(1 / 30, 120); t += 1 / 30; limbCheck(acc); } return acc; };
  const L = {
    // (anim-rework S4) crouched holstered: down into the squat (the hands onto the knees), its idle, the sneak, the crouch
    // walk and run, a stop back into the squat, up to standing
    'crouched holstered': () => {
      tp(9, 20, Math.PI / 2);
      p.stance.holster();
      runLimbs(0.6);
      st.tap('crouch');
      const parts = [runLimbs(3.0), runLimbs(1.5, () => move(0, 0.4)), runLimbs(1.5, () => move(0, 0.8)), runLimbs(1.2, () => move(0, 1))];
      move(0, 0);
      parts.push(runLimbs(1.5));
      st.tap('crouch');
      parts.push(runLimbs(1.0));
      const r = parts[0];
      r.minAt = `part 0 ${r.minAt}`;
      for (const [i, r2] of parts.slice(1).entries()) {
        if (r2.minLimb < r.minLimb) r.minAt = `part ${i + 1} ${r2.minAt}`;
        r.n += r2.n;
        r.log.push(...r2.log);
        for (const k of ['minLimb', 'minKnees', 'minFeet']) r[k] = Math.min(r[k], r2[k]);
      }
      return r;
    },
  };
  const S = {
    'aim every weapon': () => { tp(9, 20, Math.PI / 2); const acc = run(0.1); for (let i = 0; i < g.weapons.slots.length; i++) { st.tap('swapNext'); run(1.2); st.set('t', 'ads', true); const r = run(1.6, (t) => { p.cam.pitch = -0.7 + t * 0.9; }); st.set('t', 'ads', false); for (const k of ['n', 'wall', 'leg']) acc[k] += r[k]; acc.maxPen = Math.max(acc.maxPen, r.maxPen); acc.minLeg = Math.min(acc.minLeg, r.minLeg); acc.minHead = Math.min(acc.minHead, r.minHead); acc.minChest = Math.min(acc.minChest, r.minChest); if (r.chestAt !== undefined && r.minChest <= acc.minChest) acc.chestAt = r.chestAt; acc.log.push(...r.log); } p.cam.pitch = 0; return acc; },
    'aim walking + crouched': () => { tp(9, 20, Math.PI / 2); st.set('t', 'ads', true); const r1 = run(1.5, () => move(0.7, 0.7)); st.tap('crouch'); const r2 = run(1.5, () => move(-0.7, 0.5)); st.set('t', 'ads', false); r1.n += r2.n; r1.minHead = Math.min(r1.minHead, r2.minHead); r1.minChest = Math.min(r1.minChest, r2.minChest); r1.minLeg = Math.min(r1.minLeg, r2.minLeg); r1.wall += r2.wall; r1.leg += r2.leg; return r1; },
    'walk wall left': () => { tp(11.6, 24.3, Math.PI / 2); return run(2.5, () => move(0, 0.5)); },
    'walk wall right': () => { tp(16.4, 24.3, -Math.PI / 2); return run(2.5, () => move(0, 0.5)); },
    'crouchwalk wall left': () => { tp(11.6, 24.3, Math.PI / 2); st.tap('crouch'); return run(2.5, () => move(0, 0.6)); },
    // (anim-rework S3) the sling draw (LT from holstered, M2: off the sling under the arm, up into the shoulder), the glide
    // strafing both ways and backing up, then low ready (LT let go) into a crouch and back up drawn
    'sling draw + glide': () => {
      tp(9, 20, Math.PI / 2);
      // (anim-natural N3) the holster takes 1.0 s and the hand lets go over 0.4 s more; the LT sling draw takes 1.5 s:
      // holstered before LT, drawn before the glide (the old 0.8 s / 1.0 s waits pressed LT mid-holster and glided mid-draw)
      p.stance.holster();
      run(1.8);
      st.set('t', 'ads', true);
      const r = run(1.7);
      const parts = [run(1.2, () => move(1, 0)), run(1.2, () => move(-1, 0)), run(1.0, () => move(0, -1))];
      st.set('t', 'ads', false);
      move(0, 0);
      parts.push(run(0.6));
      st.tap('crouch');
      parts.push(run(0.8));
      st.tap('crouch');
      parts.push(run(0.8));
      for (const r2 of parts) {
        r.n += r2.n;
        r.wall += r2.wall;
        r.leg += r2.leg;
        r.maxPen = Math.max(r.maxPen, r2.maxPen);
        for (const k of ['minLeg', 'minHead', 'minChest', 'minElbow', 'minKnees', 'minFeet']) r[k] = Math.min(r[k], r2[k]);
      }
      return r;
    },
    'sprint': () => { tp(9, 20, Math.PI / 2); st.tap('dash'); return run(2, () => move(0, 1)); },
    'crouch run': () => { tp(9, 20, Math.PI / 2); st.tap('crouch'); return run(2, () => move(0, 1)); },
  };
  const out = [];
  for (const [k, f] of Object.entries(T)) {
    if (only && !k.includes(only)) continue;
    const r = f();
    move(0, 0); st.releaseAll();
    out.push({ name: k, trav: true, ...r, text: `${k.padEnd(22)} frames ${String(r.n).padStart(3)}  body ${String(r.body).padStart(3)} (max ${(r.maxBody * 100).toFixed(1)} cm)  knees ${(r.minKnees * 100).toFixed(1)} feet ${(r.minFeet * 100).toFixed(1)}` + (r.log.length ? '\n  ' + r.log.join('\n  ') : '') });
  }
  g.traversal.reset();
  for (const [k, f] of Object.entries(L)) {
    if (only && !k.includes(only)) continue;
    const r = f();
    move(0, 0); st.releaseAll();
    out.push({ name: k, limb: true, ...r, text: `${k.padEnd(22)} frames ${String(r.n).padStart(3)}  arms vs thighs / trunk min ${(r.minLimb * 100).toFixed(1)} cm (${r.minAt ?? ''})  knees ${(r.minKnees * 100).toFixed(1)} feet ${(r.minFeet * 100).toFixed(1)}` + (r.log.length ? '\n  ' + r.log.join('\n  ') : '') });
  }
  for (const [k, f] of Object.entries(S)) {
    if (only && !k.includes(only)) continue;
    const r = f();
    move(0, 0); st.releaseAll();
    out.push({ name: k, ...r, text: `${k.padEnd(22)} frames ${String(r.n).padStart(3)}  wall ${String(r.wall).padStart(3)} (max ${(r.maxPen * 100).toFixed(1)} cm)  legs ${String(r.leg).padStart(3)} (min clear ${(r.minLeg * 100).toFixed(1)} cm)  head ${(r.minHead * 100).toFixed(1)}  trunk ${(r.minChest * 100).toFixed(1)} cm (z ${(r.chestAt ?? 0).toFixed(2)})  elbow ${(r.minElbow * 100).toFixed(1)} knees ${(r.minKnees * 100).toFixed(1)} feet ${(r.minFeet * 100).toFixed(1)}` + (r.log.length ? '\n  ' + r.log.join('\n  ') : '') });
  }
  return out;
}, [only, log]);
for (const r of res) {
  console.log(r.text);
  if (r.limb) {
    assert(r.n > 0 && r.minLimb > -0.03, `${r.name}: the arms and hands never go through the thighs or the trunk (min ${(r.minLimb * 100).toFixed(1)} cm)`);
    assert(r.minKnees > 0.09, `${r.name}: the knees never knock through each other (min ${(r.minKnees * 100).toFixed(1)} cm apart)`);
    assert(r.minFeet > 0.06, `${r.name}: the feet never cross through each other (min ${(r.minFeet * 100).toFixed(1)} cm apart)`);
    continue;
  }
  if (r.trav) {
    assert(r.body === 0, `${r.name}: no part of the body goes into the world (${r.body} frames, max ${(r.maxBody * 100).toFixed(1)} cm)`);
    assert(r.minKnees > 0.09, `${r.name}: the knees never knock through each other (min ${(r.minKnees * 100).toFixed(1)} cm apart)`);
    assert(r.minFeet > 0.06, `${r.name}: the feet never cross through each other (min ${(r.minFeet * 100).toFixed(1)} cm apart)`);
    continue;
  }
  assert(r.wall === 0, `${r.name}: the gun never goes into the world (${r.wall} frames, max ${(r.maxPen * 100).toFixed(1)} cm)`);
  assert(r.minLeg > -0.025, `${r.name}: the gun clears the legs (min ${(r.minLeg * 100).toFixed(1)} cm)`);
  assert(r.minHead > -0.01, `${r.name}: the gun clears the head (min ${(r.minHead * 100).toFixed(1)} cm)`);
  assert(r.minKnees > 0.09, `${r.name}: the knees never knock through each other (min ${(r.minKnees * 100).toFixed(1)} cm apart)`);
  assert(r.minFeet > 0.06, `${r.name}: the feet never cross through each other (min ${(r.minFeet * 100).toFixed(1)} cm apart)`);
  assert(r.minElbow > -0.03, `${r.name}: the elbows stay outside the trunk (min ${(r.minElbow * 100).toFixed(1)} cm)`);
  assert(r.minChest > -0.02, `${r.name}: the gun clears the trunk (min ${(r.minChest * 100).toFixed(1)} cm)`);
}
} catch (e) {
  failed = true;
  console.error(String(e));
}
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
await browser.close();
process.exit(failed ? 1 : 0);
