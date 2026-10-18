// 3.2.0 phase 1: networked movement state. Two pages over ?net=local, Free Roam on Proving Grounds: the client
// climbs a ladder and a drainpipe, hangs from a pipe and a lip, crawls a
// duct, rides a zipline and rolls; team moves (phase 5: brace + boost, the human ladder, a denial); the host's copy of the client is in the same mode with the hands, feet and head
// within 10 cm of the client's own pose.
import { assert } from './e2e-lib.mjs';
import { until, hostAndJoin, localJoints as lj, remoteJoints as rj, allowTeleport, JOINTS } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;

console.log('host opens a room, client joins');
const { browser, A, B, pages: P2, errors: [eA, eB], startMode } = await hostAndJoin(url, 2);
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);
const pages = () => P2;

// joint world positions of a rig (wrists, ankles, head)
const localJoints = () => lj(B);
const remoteJoints = () => rj(A);
const err = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The client's pose mirrored on the host: same mode, joints within `tol` (m). */
async function compare(label, mode, tol = 0.1, joints = JOINTS) {
  await until(A, (m) => window.__app.current.net.remotes.values().next().value?.avatar.mode === m, mode, 8000, `host sees ${label} (${mode})`);
  // the client settled (its joints still for 0.3 s), then interpolation on the host
  let settled = false;
  for (let k = 0; k < 30 && !settled; k++) {
    const a = await localJoints();
    await wait(300);
    const b = await localJoints();
    const sp = await GB(() => window.__app.current.player.controller.speed);
    settled = sp < 0.05 && Math.max(...JOINTS.map((n) => err(a[n], b[n]))) < 0.01;
  }
  if (!settled) console.log('  (client never settled)', await GB(() => JSON.stringify({ sp: window.__app.current.player.controller.speed, axes: navigator.getGamepads()[0]?.axes, ov: !!window.__app.current.player.controller.override })));
  await wait(800);
  // attached: the host's copy settled onto the owner's planted grips too (one limb at a time after 0.25 s still; the
  // host page is in the background, its frames throttled, so two foot swings after a climb can take seconds)
  await A.waitForFunction(() => {
    const r = window.__app.current.net.remotes.values().next().value;
    const gp = r?.state.mv?.gp;
    if (!gp) return true;
    const g = r.avatar.grips;
    const ls = [g.hands.L, g.hands.R, g.feet.L, g.feet.R];
    return ls.every((l, i) => l.swing < 0 && (gp[i] === null || Number.isNaN(gp[i]) || Math.abs(l.at - gp[i]) < 0.01));
  }, null, { timeout: 8000, polling: 100 }).catch(() => {});
  await wait(300);
  const [loc, rem] = [await localJoints(), await remoteJoints()];
  const errs = Object.fromEntries(joints.map((n) => [n, +err(loc[n], rem.j[n]).toFixed(3)]));
  const worst = Math.max(...Object.values(errs));
  if (worst > tol || process.env.LOG) {
    const b = await GB(() => { const g = window.__app.current; const c = g.player.controller; const r = g.player.rig.root; return { pos: [c.pos.x, c.pos.y, c.pos.z], yaw: c.yaw, root: [r.position.x, r.position.y, r.position.z], ry: r.rotation.y, crouch: c.crouchBlend, rig: { kneel: g.player.rig.kneelW ?? null, h: g.player.rig.p.height, build: g.player.rig.p.build, hy: g.player.rig.headNode.getAbsolutePosition().y - r.position.y, lod: g.player.rig.lodSkip, mv: g.net.mvNow, sp: c.speed, Lc: g.player.rig.planner.L.contact, Rc: g.player.rig.planner.R.contact } }; });
    const a = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; const av = r.avatar; const rt = av.rig.root; return { feet: [r.feet.x, r.feet.y, r.feet.z], pos: [av.pos.x, av.pos.y, av.pos.z], root: [rt.position.x, rt.position.y, rt.position.z], ry: rt.rotation.y, st: r.state, rig: { h: av.rig.p.height, build: av.rig.p.build, hy: av.rig.headNode.getAbsolutePosition().y - rt.position.y, lod: av.rig.lodSkip, crouch: av.crouch, sp: av.speed, pins: av.rig.footPins, Lc: av.rig.planner.L.contact, Rc: av.rig.planner.R.contact, moving: av.rig.pin?.moving } }; });
    console.log('  client', JSON.stringify(b), '\n  host', JSON.stringify(a), '\n  joints', JSON.stringify(loc), JSON.stringify(rem.j));
  }
  assert(rem.mode === mode && worst <= tol, `${label}: host mode ${rem.mode}, joints within ${tol * 100} cm (${JSON.stringify(errs)})`);
}

/** Attach the client to the first anchor of `kind` (optionally filtered) at its middle, wait until it is on. */
async function attach(kind, at = 0.5, entry = 'side') {
  await allowTeleport(A);
  const ok = await GB(([kind, at, entry]) => {
    const g = window.__app.current;
    g.traversal.detach?.('drop');
    const all = g.world.level.anchors.all.filter((a) => a.kind === kind && (kind !== 'ledge' || (a.canHang && a.len > 2)));
    const a = all[0];
    if (!a) return false;
    const len = kind === 'ledge' ? a.len : kind === 'ladder' || kind === 'pipeV' ? a.top.y - a.base.y : kind === 'pipeH' ? Math.hypot(a.b.x - a.a.x, a.b.z - a.a.z) : 1;
    return g.traversal.attachTo(a, kind === 'duct' ? 1 : len * at, entry, 1);
  }, [kind, at, entry]);
  if (!ok) throw new Error(`client could not attach to a ${kind}`);
  await until(B, () => { const m = window.__app.current.traversal.attach; return m.phase === 'on'; }, null, 8000, `client on the ${kind}`);
  await wait(400);
}

/** Let the client go of whatever it holds and stand it on open floor. */
async function reset() {
  await allowTeleport(A);
  await GB(() => {
    const g = window.__app.current;
    if (g.traversal.attached) g.traversal.detach('drop');
    g.player.controller.clearCrouchToggle();
    g.player.controller.teleport(new g.player.position.constructor(0, 0.1, 0), 0);
  });
  await wait(600);
}

try {
  await startMode('sandbox', 'proving');
  const mv = await GA(() => window.__app.current.net.remotes.values().next().value.state.mv);
  assert(mv && mv.m === 'ground', `the client's move state reaches the host (${JSON.stringify(mv)})`);

  await GB(() => window.__pad.connect());
  console.log('attached states');
  await attach('ladder');
  await compare('ladder', 'ladder');
  // climb a second, stop, compare again (both grip sets step from the same rung grid)
  // (a climb of 0.6 m, stopped in the very fixed step it is reached - not a fixed time on a ladder only 2.6 m long: the same second
  // takes the client off the top when its frames run fast, and a stick released after the page polled is a step late too)
  await GB(() => new Promise((res) => {
    const st = window.__app.current;
    const m = st.traversal.attach;
    const s0 = m.s;
    const orig = st.fixedUpdate.bind(st);
    window.__pad.axis(1, -1);
    st.fixedUpdate = (dt) => {
      orig(dt);
      if (m.s - s0 >= 0.6) { window.__pad.axis(1, 0); st.fixedUpdate = orig; res(); }
    };
  }));
  await wait(500);
  await compare('ladder after a climb', 'ladder');
  await reset();
  await attach('pipeV');
  await compare('drainpipe', 'pipeV');
  await reset();
  await attach('pipeH');
  await compare('horizontal pipe', 'pipeH', 0.1, ['wristL', 'wristR', 'headNode']);
  await reset();
  await attach('ledge');
  await compare('ledge hang', 'ledge', 0.1, ['wristL', 'wristR', 'headNode']);
  await reset();
  await attach('duct');
  await compare('duct crawl', 'duct', 0.1, ['wristL', 'wristR', 'headNode']);
  await reset();
  await GB(() => { const g = window.__app.current; const z = g.world.level.anchors.all.find((a) => a.kind === 'zipline'); g.traversal.attachTo(z, 0.3, 'side', 1); });
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'zipline', null, 8000, 'host sees the zipline');
  assert(true, 'zipline mode mirrored');
  await until(B, () => !window.__app.current.traversal.attached, null, 12000, 'zipline ends');
  await reset();

  console.log('3.2.0 phase 2: split, wall jump, pipe legs up / inverted');
  const tapB = async (b) => { await GB((b) => window.__pad.set(b, 1), b); await wait(250); await GB((b) => window.__pad.set(b, 0), b); await wait(300); };
  /** Press until the client reacts (a real-time press can land on a slow frame). */
  const pressUntil = async (b, fn) => {
    for (let k = 0; k < 4; k++) {
      await tapB(b);
      if (await GB(fn)) return;
    }
  };
  const attachedNow = () => window.__app.current.traversal.attached;
  await allowTeleport(A);
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(10, 0, 24.8), Math.PI / 2); g.player.cam.yaw = Math.PI / 2; });
  await wait(600);
  await until(B, () => window.__app.current.traversal.attachCtl.split?.anchor.kind === 'split', null, 5000, 'split offered');
  // (3.2.0) a double jump: Y jumps, Y again in the air 0.1 s later braces (timed in the client's own fixed steps)
  await GB(() => new Promise((res) => {
    const st = window.__app.current;
    const inp = window.__app.input.state;
    const orig = st.fixedUpdate.bind(st);
    let n = 0;
    inp.tap('jump');
    st.fixedUpdate = (dt) => {
      // (the press before the step that reads it: edges are consumed after each step)
      if (n === 6) inp.tap('jump');
      orig(dt);
      n++;
      if (n >= 40) {
        st.fixedUpdate = orig;
        res();
      }
    };
  }));
  await until(B, () => window.__app.current.traversal.attach.kind === 'split' && window.__app.current.traversal.attach.phase === 'on', null, 6000, 'client in the split').catch(async (e) => {
    console.log(await GB(() => { const g = window.__app.current; const t = g.traversal; return JSON.stringify({ leaps: t.leaps, split: !!t.attachCtl.split, att: t.attached, kind: t.attach.kind, pos: [g.player.position.x, g.player.position.y, g.player.position.z], grounded: g.player.controller.grounded, mode: window.__app.input.mode }); }));
    throw e;
  });
  await compare('split', 'split');
  // the sidearm aimed from it
  await GB(() => window.__pad.set(6, 1));
  await until(A, () => (window.__app.current.net.remotes.values().next().value.state.mv.r ?? 0) > 0.9, null, 6000, 'host sees the split aim');
  await compare('aiming from the split', 'split', 0.1, ['wristR', 'headNode', 'ankleL', 'ankleR']);
  await GB(() => window.__pad.set(6, 0));
  await reset();
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(17.5, 0, 23.3), 0); g.player.cam.yaw = 0; });
  await wait(600);
  await until(B, () => window.__app.current.traversal.attachCtl.hint?.entry === 'wall', null, 5000, 'wall jump offered');
  await GA(() => { window.__seen = new Set(); const r = window.__app.current.net.remotes.values().next().value; const tick = () => { window.__seen.add(r.avatar.mode); if (window.__seen.size < 50) requestAnimationFrame(tick); }; tick(); });
  await pressUntil(3, attachedNow);
  await until(A, () => window.__seen.has('wallJump'), null, 6000, 'host sees the wall jump');
  assert(true, 'wall jump mode mirrored');
  await compare('hanging after the wall jump', 'ledge', 0.1, ['wristL', 'wristR', 'headNode']);
  await reset();
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(0.5, 0, 22.7), 0); g.player.cam.yaw = 0; });
  await wait(600);
  await until(B, () => window.__app.current.traversal.attachCtl.hint?.anchor.kind === 'pipeH', null, 5000, 'pipe offered');
  await pressUntil(3, attachedNow);
  await until(B, () => window.__app.current.traversal.attach.phase === 'on', null, 5000, 'on the pipe');
  // (a real-time press can land on a busy frame: press again until the change starts)
  const pipeUp = async (want) => {
    for (let k = 0; k < 4; k++) {
      await tapB(3);
      if (await GB((w) => { const p = window.__app.current.traversal.attachCtl.pipe; return p.busy || p.mode === w; }, want)) return;
    }
  };
  await pipeUp('legsUp');
  await until(B, () => window.__app.current.traversal.attachCtl.pipe.mode === 'legsUp' && !window.__app.current.traversal.attachCtl.pipe.busy, null, 5000, 'legs up').catch(async (e) => {
    console.log(await GB(() => { const g = window.__app.current; const ac = g.traversal.attachCtl; return JSON.stringify({ kind: ac.m.kind, phase: ac.m.phase, pipe: ac.pipe.mode, jump: ac.jump?.anchor.kind ?? null, offer: !!g.takedown.offer, it: !!g.interactTarget }); }));
    throw e;
  });
  await compare('pipe legs up', 'pipeH', 0.1, ['wristL', 'wristR', 'ankleL', 'ankleR', 'headNode']);
  await pipeUp('inverted');
  await until(B, () => window.__app.current.traversal.attachCtl.pipe.mode === 'inverted' && !window.__app.current.traversal.attachCtl.pipe.busy, null, 5000, 'inverted');
  await compare('pipe inverted', 'pipeH', 0.1, ['ankleL', 'ankleR', 'headNode']);
  const hb = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; const h = r.avatar.rig.headNode.getAbsolutePosition(); return { head: h.y, feet: r.feet.y }; });
  const hipsY = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; r.avatar.rig.hips.computeWorldMatrix(true); return r.avatar.rig.hips.getAbsolutePosition().y; });
  assert(hb.head < hipsY - 0.5, `the host poses the client upside down (head ${hb.head.toFixed(2)} m, hips ${hipsY.toFixed(2)} m)`);
  await reset();

  console.log('3.2.0 phase 3: rappel, fence');
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(24, 5.72, 26.9), Math.PI); g.player.cam.yaw = Math.PI; });
  await wait(600);
  await until(B, () => window.__app.current.traversal.attachCtl.hint?.anchor.kind === 'rappel', null, 5000, 'rappel offered');
  await pressUntil(3, attachedNow);
  await until(B, () => window.__app.current.traversal.attach.phase === 'on', null, 6000, 'on the rope');
  await GB(() => { window.__pad.axis(1, 1); });
  await wait(800);
  await GB(() => { window.__pad.axis(1, 0); window.__app.current.traversal.attachCtl.u = 0.6; });
  await compare('rappel', 'rappel', 0.1, ['wristL', 'wristR', 'ankleL', 'ankleR', 'headNode']);
  const rope = await GA(() => window.__app.current.world.ropes['keys'].filter((k) => k && k.startsWith('remote')).length);
  assert(rope === 1, `the host draws the client's rope (${rope})`);
  await reset();
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(-9, 0.1, 25.3), 0); g.player.cam.yaw = 0; });
  await wait(600);
  await until(B, () => window.__app.current.traversal.attachCtl.hint?.anchor.kind === 'fence', null, 5000, 'fence offered');
  await pressUntil(3, attachedNow);
  await GB(() => { window.__pad.axis(1, -1); });
  await wait(700);
  await GB(() => { window.__pad.axis(1, 0); });
  await compare('fence', 'fence', 0.1, ['wristL', 'wristR', 'ankleL', 'ankleR', 'headNode']);
  await reset();

  console.log('drawn state (step 09): aim draws (weapon in hand on the host), release holsters');
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(0, 0.1, 0), 0); g.player.cam.yaw = 0; g.player.forceAds = true; });
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return !!r && r.state?.mv?.dw === 2 && !!r.avatar.rig.heldWeapon; }, null, 6000, 'host remote has the weapon in hand');
  await compare('drawn', 'ground');
  // timestamps taken inside the pages: the client's sim (release to holstered, its own 0.4 s); the host's receipt of
  // the first dw 0 state (stamped as the packet is buffered) and the frame its copy stows the weapon. Network delivery
  // (VM latency) is not the remote pose's behaviour: the check is the client's holster time plus the host's receipt
  // to stow, against the 0.4 s holster + 0.1 s interpolation + one host frame.
  await GA(() => {
    const r = window.__app.current.net.remotes.values().next().value;
    const av = r.avatar;
    const t = (window.__holT = { recv: 0, stow: 0, frame: 0, last: 0 });
    const push = av.buf.push.bind(av.buf);
    av.buf.push = (tm, st) => { if (!t.recv && st?.mv?.dw === 0) t.recv = performance.now(); return push(tm, st); };
    const upd = av.update.bind(av);
    av.update = (dt, rt) => {
      const now = performance.now();
      upd(dt, rt);
      if (t.recv && !t.stow && !av.rig.heldWeapon) { t.stow = now; t.frame = t.last ? now - t.last : 0; av.update = upd; av.buf.push = push; }
      t.last = now;
    };
  });
  await GB(() => new Promise((res) => {
    const st = window.__app.current;
    const t = (window.__holT = { rel: Date.now(), sim: 0, dw0: 0 });
    st.player.forceAds = false;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => {
      orig(dt);
      t.sim += dt;
      if (st.weapons.drawPhase === 0) { t.dw0 = Date.now(); st.fixedUpdate = orig; res(); }
    };
  }));
  await until(A, () => window.__holT.stow > 0, null, 4000, 'host remote stowed');
  const hbT = await GB(() => window.__holT);
  const haT = await GA(() => window.__holT);
  const remMs = haT.stow - haT.recv;
  const holMs = hbT.sim * 1000 + remMs;
  const limit = 400 + 1000 / 60 + 100 + Math.max(1000 / 60, haT.frame);
  console.log(`    holster: client sim ${(hbT.sim * 1000).toFixed(0)} ms (wall ${hbT.dw0 - hbT.rel} ms), host receipt to stow ${remMs.toFixed(0)} ms (host frame ${haT.frame.toFixed(0)} ms)`);
  assert(remMs <= 100 + Math.max(1000 / 60, haT.frame) + 1, `the host's copy stows within 0.1 s + one frame of receiving dw 0 (${remMs.toFixed(0)} ms)`);
  assert(holMs <= limit, `holstered: client holster + host receipt to stow ${holMs.toFixed(0)} ms <= ${limit.toFixed(0)} ms (0.4 s holster + one sim step + 0.1 s + one frame)`);
  await compare('holstered', 'ground');
  await reset();

  console.log('committed moves: a forward roll');
  // sprint (gear 6) along open floor, tap crouch
  await GB(() => { const g = window.__app.current; g.player.controller.gears.gear = 5; g.player.controller.teleport(new g.player.position.constructor(0, 0.1, 0), 0); g.player.cam.yaw = 0; window.__pad.axis(1, -1); });
  await wait(900);
  await GA(() => { window.__seen = new Set(); const r = window.__app.current.net.remotes.values().next().value; const tick = () => { window.__seen.add(r.avatar.mode); if (window.__seen.size < 50) requestAnimationFrame(tick); }; tick(); });
  // crouch (B) HELD 0.3 s of sim time (G32: a held crouch at a run rolls)
  await GB(() => new Promise((res) => {
    const st = window.__app.current;
    const orig = st.fixedUpdate.bind(st);
    let t = 0;
    window.__pad.set(1, 1);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t > 0.3) { window.__pad.set(1, 0); st.fixedUpdate = orig; res(); } };
  }));
  await until(B, () => window.__app.current.traversal.forwardRolls > 0, null, 4000, 'client rolls').catch(async (e) => {
    console.log(await GB(() => { const c = window.__app.current.player.controller; return JSON.stringify({ gear: c.gear, sp: c.speed, crouched: c.crouched, grounded: c.grounded, ov: !!c.override, ads: window.__app.current.player.ads }); }));
    throw e;
  });
  await GB(() => window.__pad.axis(1, 0));
  await until(A, () => window.__seen.has('roll'), null, 6000, 'host sees the roll');
  assert(true, 'host replays the roll');
  await reset();

  console.log('team moves: brace + boost (host climbs), human ladder (client climbs), denial');
  // the 4.2 m block north of Proving (south face z 27.5, x 2.5..5.5): the bottom braces with its back to it
  const placeTeam = async (P, x, z, yaw) => P.evaluate(([x, z, yaw]) => { const g = window.__app.current; g.team.end(true); if (g.traversal.attached) g.traversal.detach('drop'); window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); g.player.controller.teleport(new g.player.position.constructor(x, 0.05, z), yaw); g.player.cam.yaw = yaw; }, [x, z, yaw]);
  const brace = async (P, label) => {
    await P.evaluate(() => window.__pad.set(3, 1));
    await until(P, () => window.__app.current.team.state === 'brace', null, 4000, `${label} braces`).catch(async (e) => { console.log(await P.evaluate(() => { const g = window.__app.current; return JSON.stringify({ mates: g.net.teamMates().map((m) => [m.id, m.pos.x, m.pos.z, m.mode]), pos: g.player.controller.pos, yaw: g.player.controller.yaw }); })); throw e; });
    await P.evaluate(() => window.__pad.set(3, 0));
  };
  await allowTeleport(A);
  await GB(() => { for (const a of window.__app.current.net.avatars?.values?.() ?? []) a.allowTeleport?.(3); });
  await placeTeam(B, 4, 27.05, Math.PI);
  const posB = () => GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify([c.pos.x.toFixed(2), c.pos.z.toFixed(2), g.traversal.kind, !!c.override, g.player.alive]); });
  if (process.env.LOG) console.log('B after tp', await posB());
  await placeTeam(A, 4, 26.2, 0);
  if (process.env.LOG) console.log('B after A tp', await posB());
  await wait(600);
  if (process.env.LOG) console.log(await GB(() => { const c = window.__app.current.player.controller; return JSON.stringify({ pos: c.pos, yaw: c.yaw, sp: c.speed, axes: navigator.getGamepads()[0]?.axes }); }));
  await brace(B, 'client');
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'brace', null, 6000, 'host sees the client braced');
  await until(A, () => !!window.__app.current.team.offer?.boost, null, 4000, 'host offered a boost').catch(async (e) => { console.log(await GA(() => JSON.stringify(window.__app.current.team.offer && { mate: window.__app.current.team.offer.mate.id }))); throw e; });
  // (Y held until the host's frame sees the press: a page in the background polls the pad slowly)
  await GA(() => window.__pad.set(3, 1));
  await until(A, () => window.__app.current.team['pressT'] >= 0, null, 4000, 'host sees Y');
  await GA(() => window.__pad.set(3, 0));
  await until(A, () => window.__app.current.team.count.boosts === 1, null, 4000, 'host boosted').catch(async (e) => { console.log(await GA(() => { const g = window.__app.current; const t = g.team; return JSON.stringify({ c: t.count, why: t.lastDenied, st: t.state, offer: !!t.offer, boost: !!t.offer?.boost, pressT: t['pressT'], td: !!g.takedown.offer, it: !!g.interactTarget, trav: g.traversal.kind, att: g.traversal.attached, hint: g.traversal.attachCtl.hint?.anchor.kind ?? null, pad: navigator.getGamepads()[0]?.buttons[3]?.pressed, mode: g.app.input.mode }); })); throw e; });
  await until(B, () => window.__app.current.team.state === 'assist', null, 4000, 'client assists');
  await until(A, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 6000, 'host on the 4.2 m lip');
  const lipY = await GA(() => window.__app.current.traversal.attach.anchor.top);
  assert(Math.abs(lipY - 4.2) < 0.1, `the boost puts the host on the 4.2 m lip (${lipY})`);
  await until(B, () => window.__app.current.team.state === 'none', null, 4000, 'client free after the boost');

  // swap: the host braces, the client asks for the human ladder (Y held) and grabs the lip from the shoulders
  await GA(() => { const g = window.__app.current; g.traversal.detach('drop'); });
  await wait(800);
  await placeTeam(A, 4, 27.05, Math.PI);
  await placeTeam(B, 4, 26.2, 0);
  await wait(600);
  await brace(A, 'host');
  await until(B, () => !!window.__app.current.team.offer, null, 6000, 'client offered the host');
  await GB(() => window.__pad.set(3, 1));
  await until(B, () => window.__app.current.team.state === 'ladderUp' || window.__app.current.team.state === 'top', null, 4000, 'client climbs onto the shoulders');
  await GB(() => window.__pad.set(3, 0));
  await until(A, () => window.__app.current.team.state === 'bottom', null, 4000, 'host is the bottom');
  await until(B, () => window.__app.current.team.state === 'top', null, 4000, 'client on top');
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return r?.avatar.mode === 'stacked' && r.avatar.pos.y > 1.2; }, null, 6000, 'host sees the client on its shoulders');
  // free to aim up there; Y grabs the lip
  await GB(() => { window.__app.current.player.cam.yaw = 0; window.__pad.set(3, 1); });
  await wait(250);
  await GB(() => window.__pad.set(3, 0));
  await until(B, () => window.__app.current.traversal.attach.phase !== 'none' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 6000, 'client grabs the lip from the top');
  await until(A, () => window.__app.current.team.state === 'none', null, 4000, 'host free once the client is off');
  assert(true, 'human ladder: the client climbs the braced host, the host sees it stacked, Y grabs the lip from the top');

  // denial: the client braces, the host is offered a boost, the client lets go and walks off before the host asks
  await placeTeam(B, 4, 27.05, Math.PI);
  await placeTeam(A, 4, 26.2, 0);
  await wait(600);
  await brace(B, 'client (again)');
  await until(A, () => !!window.__app.current.team.offer?.boost, null, 6000, 'host offered a boost again');
  const pending = await GA(() => { const o = window.__app.current.team.offer; return { id: o.mate.id, target: o.boost.anchor.id, s: o.boost.s, gy: o.boost.grip.y }; });
  await GB(() => { window.__pad.set(1, 1); });
  // (held until the brace ends: software GL runs these pages at a few frames a second, a 150 ms press can fall
  // between two polls)
  await until(B, () => window.__app.current.team.state === 'none', null, 4000, 'client lets go of the brace');
  await GB(() => { window.__pad.set(1, 0); window.__pad.axis(1, -1); });
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return r?.state?.mv?.m === 'ground' && r.feet.z < 25.5; }, null, 6000, 'host sees the client walk off');
  await GB(() => window.__pad.axis(1, 0));
  const deniedBefore = await GA(() => window.__app.current.team.count.denied);
  await GA((p) => window.__app.current.net.teamRequest('boost', p.id, p.target, p.s, p.gy), pending);
  const moved = await GA(() => ({ n: window.__app.current.team.count.denied, why: window.__app.current.team.lastDenied, st: window.__app.current.team.state }));
  assert(moved.n > deniedBefore && moved.st === 'none' && ['notBraced', 'far'].includes(moved.why), `the partner moved away mid-request: denied (${moved.why})`);
  await wait(1100);

  // denials: the host refuses a request without a braced partner
  await GB(() => { const g = window.__app.current; g.traversal.detach('drop'); });
  await wait(800);
  const hostId = await GA(() => window.__coop.session.selfId);
  const before = await GB(() => window.__app.current.team.count.denied);
  await wait(1100);
  await GB((id) => window.__app.current.net.teamRequest('boost', id, -1, 0, 0), hostId);
  await until(B, (n) => window.__app.current.team.count.denied > n, before, 4000, 'request denied');
  const why = await GB(() => window.__app.current.team.lastDenied);
  assert(['notBraced', 'far', 'noTarget', 'busy'].includes(why), `a request without a braced partner is denied (${why})`);
  await reset();

  // (locomotion step 11) back to a wall: the host's copy in mode wall, joints within 10 cm, its `s` within 5 cm of the
  // client's; crouched; two players stacked on one wall >= 0.6 m apart (D8)
  console.log('back to a wall');
  await reset();
  const findWall = () => {
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
      if (ok) return i;
    }
    return -1;
  };
  const wseg = await GB(findWall);
  assert(wseg >= 0, `a free high wall on Proving (${wseg})`);
  /** Stand the page 0.5 m out from the wall at `k` m along it facing it, tap the context action. */
  const toWall = (P, k) => P.evaluate(([i, k]) => {
    const g = window.__app.current;
    const s = g.world.level.coverSegments[i];
    const yaw = Math.atan2(-s.nx, -s.nz);
    g.player.controller.clearCrouchToggle();
    g.player.controller.teleport(new g.player.position.constructor(s.ax + s.tx * k + s.nx * 0.85, s.y + 0.05, s.az + s.tz * k + s.nz * 0.85), yaw);
    g.player.cam.yaw = yaw;
    g.player.cam.pitch = 0;
    // (the stance settles standing first: the entry keeps the stance the player has)
    setTimeout(() => window.__app.input.state.tap('cover'), 1000);
  }, [wseg, k]);
  await allowTeleport(A);
  await toWall(B, 2);
  await until(B, () => window.__app.current.wallCore?.phase === 'on', null, 6000, 'client on the wall');
  // standing first (the entry keeps the stance the client had)
  if (await GB(() => (window.__app.current.wallCore.sub() & 1) !== 0)) {
    await GB(() => window.__app.input.state.tap('crouch'));
    await until(B, () => (window.__app.current.wallCore.sub() & 1) === 0 && window.__app.current.player.controller.crouchBlend < 0.01, null, 3000, 'client standing on the wall');
  }
  await compare('wall', 'wall');
  const wallS = async () => [await GB(() => window.__app.current.wallCore.s), await GA(() => window.__app.current.net.remotes.values().next().value.avatar.wallS)];
  let [sl, sr] = await wallS();
  assert(Math.abs(sl - sr) <= 0.05, `the host's copy is at s ${sr.toFixed(3)} (client ${sl.toFixed(3)}), within 5 cm`);
  await GB(() => window.__app.input.state.tap('crouch'));
  await until(B, () => (window.__app.current.wallCore.sub() & 1) !== 0 && window.__app.current.player.controller.crouchBlend > 0.99, null, 3000, 'client crouched on the wall');
  await wait(600);
  await compare('wall crouch', 'wall');
  [sl, sr] = await wallS();
  assert(Math.abs(sl - sr) <= 0.05, `crouched: the host's copy at s ${sr.toFixed(3)} (client ${sl.toFixed(3)})`);
  // stacking: the host enters the same wall 0.3 m from the client: kept >= 0.62 m apart along it
  await toWall(A, sl + 0.3);
  await until(A, () => window.__app.current.wallCore?.phase === 'on', null, 6000, 'host on the wall');
  await wait(800);
  const st = await GA(() => { const g = window.__app.current; const r = g.net.remotes.values().next().value; const p = g.player.position; return { s: g.wallCore.s, seg: g.wallCore.seg, d: Math.hypot(p.x - r.feet.x, p.z - r.feet.z) }; });
  const sb = await GB(() => window.__app.current.wallCore.s);
  assert(st.seg === wseg && Math.abs(st.s - sb) >= 0.6 && st.d >= 0.6, `stacked on one wall: centres ${Math.abs(st.s - sb).toFixed(2)} m apart along it, ${st.d.toFixed(2)} m apart (>= 0.6, no capsule overlap)`);
  for (const P of [A, B]) await P.evaluate(() => { const g = window.__app.current; if (g.wallCore?.active) g.wallCore.leave('test'); });
  await wait(300);
  await GA(() => { const g = window.__app.current; g.player.controller.clearCrouchToggle(); g.player.controller.teleport(new g.player.position.constructor(3, 0.1, 3), 0); });

  // (locomotion step 12) the edge verbs at the Proving doorway (1.1 m gap): the head-first peek (WALL_SUB.peek), the
  // lean-out with the aim (`lk` 1) and the SWAT turn (the host replays the commit and lands it on the far wall); the
  // host's copy within 10 cm each time, and the host samples a peeking client's light at its head (light parity)
  console.log('wall edge: peek, lean, swat');
  await reset();
  const door = await GB(() => {
    const g = window.__app.current;
    const L = g.wallCore.links;
    const segs = g.world.level.coverSegments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.low || Math.abs(Math.abs(s.az) - 8) > 0.4 || Math.abs(s.nz) < 0.99) continue;
      if (L.gB[i] >= 0 && Math.abs(L.gapB[i] - 1.1) < 0.05) return { i, end: 1, to: L.gB[i], len: s.len };
      if (L.gA[i] >= 0 && Math.abs(L.gapA[i] - 1.1) < 0.05) return { i, end: -1, to: L.gA[i], len: s.len };
    }
    return null;
  });
  assert(!!door, `the Proving doorway (${JSON.stringify(door)})`);
  const toEdge = async () => {
    await allowTeleport(A);
    await GB(([i, k]) => {
      const g = window.__app.current;
      const s = g.world.level.coverSegments[i];
      const yaw = Math.atan2(-s.nx, -s.nz);
      window.__pad.connect();
      for (let j = 0; j < 4; j++) window.__pad.axis(j, 0);
      g.player.controller.clearCrouchToggle();
      g.player.controller.teleport(new g.player.position.constructor(s.ax + s.tx * k + s.nx * 0.85, s.y + 0.05, s.az + s.tz * k + s.nz * 0.85), yaw);
      g.player.cam.yaw = yaw;
      g.player.cam.pitch = 0;
      setTimeout(() => window.__app.input.state.tap('cover'), 1000);
    }, [door.i, door.end > 0 ? door.len - 0.8 : 0.8]);
    await until(B, () => window.__app.current.wallCore?.phase === 'on', null, 6000, 'client on the doorway wall');
    if (await GB(() => (window.__app.current.wallCore.sub() & 1) !== 0)) {
      await GB(() => window.__app.input.state.tap('crouch'));
      await until(B, () => (window.__app.current.wallCore.sub() & 1) === 0 && window.__app.current.player.controller.crouchBlend < 0.01, null, 3000, 'client standing on the doorway wall');
    }
    // slide to the edge, then release
    await GB((x) => window.__pad.axis(0, x), door.end);
    await until(B, (e) => window.__app.current.wallCore.edge === e, door.end, 6000, 'client at the doorway edge');
    await wait(400);
    await GB(() => window.__pad.axis(0, 0));
    await wait(300);
  };
  await toEdge();
  // peek: the stick toward the edge held (the client is stopped on the end)
  await GB((x) => window.__pad.axis(0, x), door.end);
  await until(B, () => window.__app.current.wallCore.peekOn && window.__app.current.wallCore.peek === 1, null, 4000, 'client peeks');
  await until(A, () => (window.__app.current.net.remotes.values().next().value?.state?.mv?.sub & 16) !== 0, null, 5000, 'host sees the peek bit');
  // (step 21w, M14) edge stop: the stick still pushed past the end, the client stays on the wall at the end and the
  // host's copy stands there too (under 10 cm)
  {
    await wait(600);
    const [el, er] = await wallS();
    const on = await GB(() => window.__app.current.wallCore.phase === 'on' && window.__app.current.wallCore.atEnd);
    assert(on && Math.abs(el - er) <= 0.1, `edge stop: pushed past the end the client stays on the wall at the end (${on}), host's copy at s ${er.toFixed(3)} (client ${el.toFixed(3)}, <= 10 cm)`);
  }
  await compare('wall peek', 'wall');
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return Math.abs(Math.hypot(r.ref.peekX ?? 0, r.ref.peekZ ?? 0) - 0.25) < 0.01; }, null, 3000, 'host peek offset eased to 0.25 m');
  // (step 12b fix r2, light parity) the host's head point and light sample are its posed copy's head (ref.head) on
  // the wall, as the local light meter reads the local posed head: the two heads agree (the MoveState offset is 0.25 m)
  const pl = await GA(() => { const g = window.__app.current; const r = g.net.remotes.values().next().value; const h = r.headPoint(new g.player.position.constructor()); return { px: r.ref.peekX, pz: r.ref.peekZ, h: [h.x, h.y, h.z], ref: !!r.ref.head, hd: Math.hypot(h.x - r.feet.x, h.z - r.feet.z) }; });
  const plL = await GB(() => { const g = window.__app.current; const p = g.player.position; const h = g.player.rig.posedHead(new p.constructor()); return { h: [h.x, h.y, h.z], hd: Math.hypot(h.x - p.x, h.z - p.z) }; });
  const pd = Math.hypot(pl.h[0] - plL.h[0], pl.h[1] - plL.h[1], pl.h[2] - plL.h[2]);
  console.log(`  peek head samples: local ${plL.hd.toFixed(3)} m out, host ${pl.hd.toFixed(3)} m out, apart ${pd.toFixed(3)} m`);
  assert(Math.abs(Math.hypot(pl.px, pl.pz) - 0.25) < 0.01 && pl.ref && pd < 0.05 && plL.hd > 0.1 && pl.hd > 0.1, `the host samples the peeking client's light and head at its posed head, within 5 cm of the client's own (${JSON.stringify({ pl, plL, pd })})`);
  await GB(() => window.__pad.axis(0, 0));
  await until(B, () => !window.__app.current.wallCore.peekOn && window.__app.current.wallCore.peek === 0, null, 4000, 'client peek eases back');
  // lean-out: aim held at the edge (lk 1), the body 0.35 m past it
  await GB(() => window.__app.input.state.set('t', 'ads', true));
  await until(B, () => window.__app.current.wallCore.lk === 1 && window.__app.current.wallCore.lean === 1, null, 4000, 'client leans out');
  await until(A, () => window.__app.current.net.remotes.values().next().value?.state?.mv?.lk === 1, null, 5000, 'host sees lk 1');
  await compare('wall lean', 'wall');
  const [lsl, lsr] = await wallS();
  assert(Math.abs(lsl + (await GB(() => window.__app.current.wallCore.leanS)) - lsr) <= 0.05, `leaning: the host's copy at s ${lsr.toFixed(3)} (client ${lsl.toFixed(3)} + lean), within 5 cm`);
  await GB(() => window.__app.input.state.set('t', 'ads', false));
  await until(B, () => window.__app.current.wallCore.lk === 0 && window.__app.current.wallCore.lean === 0, null, 4000, 'client back in');
  await until(A, () => !window.__app.current.net.remotes.values().next().value?.state?.mv?.lk, null, 5000, 'host sees lk 0');
  // SWAT: the context press with the stick toward the gap; the host replays the commit and settles on the far wall
  await GA(() => { window.__seen = new Set(); const r = window.__app.current.net.remotes.values().next().value; const tick = () => { window.__seen.add(r.avatar.mode); if (window.__seen.size < 50) requestAnimationFrame(tick); }; tick(); });
  // (step 12 r1, D8) the SWAT turn mid-move: both pages record root and joints each frame by the turn's phase k (the
  // client's swatT / swatDur, the host's replay t / dur); host samples at k 0.15-0.85 are compared with the client's
  // pose interpolated to the same k
  const swRec = ([host, names]) => {
    window.__sw = [];
    const t0 = performance.now();
    // the host page renders in the background (throttled frames): sample right after each of the copy's updates
    if (host) {
      const av = window.__app.current.net.remotes.values().next().value.avatar;
      const orig = av.update;
      av.update = function (dt, rt) {
        orig.call(this, dt, rt);
        const rp = this.replay;
        if (rp && rp.path === 'swat') {
          const j = {};
          for (const n of names) { this.rig[n].computeWorldMatrix(true); const p = this.rig[n].getAbsolutePosition(); j[n] = [p.x, p.y, p.z]; }
          const r = this.rig.root.position;
          window.__sw.push({ k: Math.min(1, rp.t / rp.c.dur), mode: this.mode, root: [r.x, r.y, r.z], j });
        }
        if (performance.now() - t0 > 20000) this.update = orig;
      };
      return;
    }
    const tick = () => {
      const g = window.__app.current;
      if (!g) return;
      let k = -1;
      let rig = null;
      let mode = '';
      if (host) {
        const av = g.net.remotes.values().next().value?.avatar;
        const rp = av?.replay;
        if (av && rp && rp.path === 'swat') { k = Math.min(1, rp.t / rp.c.dur); rig = av.rig; mode = av.mode; }
      } else if (g.wallCore?.phase === 'swat' && g.wallCore.swatDur > 0) {
        k = Math.min(1, g.wallCore.swatT / g.wallCore.swatDur);
        rig = g.player.rig;
        mode = g.net?.mvNow?.m ?? '';
      }
      if (rig) {
        const j = {};
        for (const n of names) { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); j[n] = [p.x, p.y, p.z]; }
        const r = rig.root.position;
        window.__sw.push({ k, mode, root: [r.x, r.y, r.z], j });
      }
      if (performance.now() - t0 < 10000) requestAnimationFrame(tick);
    };
    tick();
  };
  await GA(swRec, [true, JOINTS]);
  await GB(swRec, [false, JOINTS]);
  await GB((x) => window.__pad.axis(0, x), door.end);
  await wait(200);
  await GB(() => window.__app.input.state.tap('cover'));
  await until(B, () => window.__app.current.wallCore.count.swat > 0, null, 4000, 'client starts the SWAT turn');
  await GB(() => window.__pad.axis(0, 0));
  await until(B, (to) => window.__app.current.wallCore.phase === 'on' && window.__app.current.wallCore.seg === to, door.to, 4000, 'client on the far wall');
  await until(A, () => window.__seen.has('swat'), null, 6000, 'host replays the swat');
  await until(A, (to) => window.__app.current.net.remotes.values().next().value?.state?.mv?.a === to, door.to, 6000, 'host sees the far wall');
  {
    const sB = (await GB(() => window.__sw)).sort((a, b) => a.k - b.k);
    const sA = (await GA(() => window.__sw)).filter((s) => s.k >= 0.15 && s.k <= 0.85);
    const lerp = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
    /** The client's pose at phase k (linear between its two nearest frames). */
    const at = (k) => {
      let i = sB.findIndex((s) => s.k >= k);
      if (i < 0) i = sB.length - 1;
      const b = sB[i];
      const a = sB[Math.max(0, i - 1)];
      const u = b.k > a.k ? Math.max(0, Math.min(1, (k - a.k) / (b.k - a.k))) : 0;
      return { root: lerp(a.root, b.root, u), j: Object.fromEntries(JOINTS.map((n) => [n, lerp(a.j[n], b.j[n], u)])) };
    };
    let rootW = 0;
    let jointW = 0;
    let jointN = '';
    for (const s of sA) {
      const c = at(s.k);
      rootW = Math.max(rootW, Math.hypot(s.root[0] - c.root[0], s.root[2] - c.root[2]));
      for (const n of JOINTS) {
        const e = err(s.j[n], c.j[n]);
        if (e > jointW) { jointW = e; jointN = `${n} @k ${s.k.toFixed(2)}`; }
      }
    }
    const modes = [...new Set(sA.map((s) => s.mode))];
    console.log(`    swat mid-move: ${sB.length} client / ${sA.length} host frames (k 0.15-0.85), root ${(rootW * 100).toFixed(1)} cm, worst joint ${(jointW * 100).toFixed(1)} cm (${jointN})`);
    assert(sB.length >= 5 && sA.length >= 1 && modes.length === 1 && modes[0] === 'swat' && rootW <= 0.1, `swat mid-move: the host's copy in mode swat (${modes.join(',')}), root within 10 cm of the client's at the same phase (${(rootW * 100).toFixed(1)} cm)`);
    // joints <= 10 cm mid-move is a D8 deviation carried to step 27 (REVIEW-NOTES) when over: reported, not gated
    if (jointW > 0.1) console.log(`    (D8 deviation, step 27: swat mid-move joints ${(jointW * 100).toFixed(1)} cm > 10 cm)`);
  }
  await compare('swat (settled on the far wall)', 'wall');
  const [ssl, ssr] = await wallS();
  assert(Math.abs(ssl - ssr) <= 0.05, `after the SWAT turn: the host's copy at s ${ssr.toFixed(3)} on the far wall (client ${ssl.toFixed(3)})`);
  await GB(() => { const g = window.__app.current; if (g.wallCore?.active) g.wallCore.leave('test'); });
  await wait(300);
  await GB(() => { const g = window.__app.current; g.player.controller.clearCrouchToggle(); g.player.controller.teleport(new g.player.position.constructor(3, 0.1, 3), 0); });
  // (locomotion step 12b, D9 / D10) the open side at a left edge (WALL_SUB.leftHand 128: the mirrored grip, the
  // pistol and the rifle) and the crouched side lean past a low-wall end (`lk` 1 with `low`): the host's copy within
  // 10 cm, the weapon in its left hand
  console.log('wall edge open side and low side lean (12b)');
  const leftEdge = async (low) => {
    const at = await GB((low) => {
      const g = window.__app.current;
      const L = g.wallCore.links;
      const segs = g.world.level.coverSegments;
      const p = g.player.position;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s.low !== low || s.len < 2.5 || s.len > 12 || Math.abs(s.y - p.y) > 0.3 || L.kB[i] !== 0) continue;
        return { i, len: s.len };
      }
      return null;
    }, low);
    assert(!!at, `a ${low ? 'low' : 'high'} wall with a free left end on Proving (${JSON.stringify(at)})`);
    await allowTeleport(A);
    await GB(([i, k]) => {
      const g = window.__app.current;
      if (g.wallCore?.active) g.wallCore.leave('test');
      const s = g.world.level.coverSegments[i];
      const yaw = Math.atan2(-s.nx, -s.nz);
      window.__pad.connect();
      for (let j = 0; j < 4; j++) window.__pad.axis(j, 0);
      g.player.controller.clearCrouchToggle();
      g.player.controller.teleport(new g.player.position.constructor(s.ax + s.tx * k + s.nx * 0.85, s.y + 0.05, s.az + s.tz * k + s.nz * 0.85), yaw);
      g.player.cam.yaw = yaw;
      g.player.cam.pitch = 0;
      setTimeout(() => window.__app.input.state.tap('cover'), 1000);
    }, [at.i, at.len - 0.8]);
    await until(B, (i) => window.__app.current.wallCore?.phase === 'on' && window.__app.current.wallCore.seg === i, at.i, 6000, 'client on the wall');
    if (!low && (await GB(() => (window.__app.current.wallCore.sub() & 1) !== 0))) {
      await GB(() => window.__app.input.state.tap('crouch'));
      await until(B, () => (window.__app.current.wallCore.sub() & 1) === 0 && window.__app.current.player.controller.crouchBlend < 0.01, null, 3000, 'client standing on the wall');
    }
    await GB(() => window.__pad.axis(0, 1));
    await until(B, () => window.__app.current.wallCore.edge === 1, null, 6000, 'client at the left edge');
    // (G13) the stick held until the body is at the end (the lean-out needs it there), not a fixed 400 ms
    await until(B, () => window.__app.current.wallCore.atEnd, null, 4000, 'client at the end of the wall');
    await wait(100);
    // high wall: the aim alone leans out; low wall: the stick held toward the end with the aim (the side lean)
    if (!low) await GB(() => window.__pad.axis(0, 0));
    await wait(300);
    await GB(() => window.__app.input.state.set('t', 'ads', true));
    await until(B, () => { const w = window.__app.current.wallCore; return w.lk === 1 && w.lean === 1 && w.leftHand; }, null, 4000, 'client leans out at the left edge');
    await until(A, (low) => { const mv = window.__app.current.net.remotes.values().next().value?.state?.mv; return !!mv && mv.lk === 1 && (mv.sub & 128) !== 0 && ((mv.sub & 64) !== 0) === low; }, low, 5000, 'host sees lk 1 + leftHand');
  };
  const leanBack = async () => {
    await GB(() => { window.__app.input.state.set('t', 'ads', false); window.__pad.axis(0, 0); });
    await until(B, () => window.__app.current.wallCore.lk === 0 && window.__app.current.wallCore.lean === 0, null, 4000, 'client back in');
    await GB(() => { const g = window.__app.current; if (g.wallCore?.active) g.wallCore.leave('test'); });
    await wait(400);
  };
  const hands = async () => [await GB(() => window.__app.current.player.rig.weaponHand), await GA(() => window.__app.current.net.remotes.values().next().value.avatar.rig.weaponHand)];
  await reset();
  // the weapon in hand: the case runs with the current one. The host takes any weapon id from the client's lobby
  // loadout (hostWeapon), so the remote pose follows the same leftHand bit for either weapon; the per-weapon open side
  // (pistol and rifle, both edges, high and low wall) is covered locally by e2e-wall
  const cls = await GB(() => window.__app.current.weapons.current.def.class);
  await leftEdge(false);
  await compare(`wall lean left edge (${cls})`, 'wall');
  const [hl, hr] = await hands();
  assert(hl === -1 && hr === -1, `${cls}: the weapon in the left hand, local ${hl}, the host's copy ${hr}`);
  await leanBack();
  await leftEdge(true);
  await compare('low wall side lean', 'wall');
  const lowHead = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; const av = r.avatar; const s = window.__app.current.world.level.coverSegments[r.state.mv.a]; return { head: av.rig.headNode.getAbsolutePosition().y - s.y, top: s.height }; });
  assert(lowHead.head < lowHead.top || lowHead.top < 1.07, `low wall side lean: the host's copy head at ${lowHead.head.toFixed(3)} m, under the top ${lowHead.top.toFixed(2)} m (A51)`);
  // (step 12b fix r2, light parity) one head sample per remote: the host's headPoint (perception) and its light sample
  // are the posed copy's head, within 2 cm of the local player's light-meter head sample (its posed head)
  const hsL = await GB(() => { const g = window.__app.current; const s = g.world.level.coverSegments[g.wallCore.seg]; const h = g.player.rig.posedHead(new g.player.position.constructor()); return { y: h.y - s.y, top: s.height }; });
  const hsH = await GA(() => { const g = window.__app.current; const r = g.net.remotes.values().next().value; const s = g.world.level.coverSegments[r.state.mv.a]; const V = g.player.position.constructor; const hp = r.headPoint(new V()); const ph = r.avatar.rig.posedHead(new V()); return { y: hp.y - s.y, posed: ph.y - s.y, ref: !!r.ref.head, light: r.ref.head ? r.ref.head.y - s.y : null }; });
  console.log(`  low wall (${hsL.top.toFixed(2)} m) head samples: local ${hsL.y.toFixed(3)} m, host headPoint ${hsH.y.toFixed(3)} m, host light ${hsH.light?.toFixed(3)} m, host posed copy ${hsH.posed.toFixed(3)} m`);
  assert(hsH.ref && Math.abs(hsH.y - hsH.posed) < 0.02 && hsH.light !== null && Math.abs(hsH.light - hsH.y) < 1e-6, `the host's head point and light sample are its posed copy's head (${JSON.stringify(hsH)})`);
  assert(Math.abs(hsL.y - hsH.y) < 0.02, `low wall head samples: local ${hsL.y.toFixed(3)} m vs host ${hsH.y.toFixed(3)} m within 2 cm`);
  await leanBack();
  await GB(() => { const g = window.__app.current; g.player.controller.clearCrouchToggle(); g.player.controller.teleport(new g.player.position.constructor(3, 0.1, 3), 0); });

  // (locomotion step 10) the elbow strike: held mid-strike (a test freeze before contact), the host's copy in mode
  // strike with the joints within 10 cm; a refused strike (a target the host does not have) blends back to ground
  console.log('elbow strike');
  await reset();
  await wait(400);
  const sOk = await GB(() => { const g = window.__app.current; g.strike.freezeAt = 0.4; return g.strike.begin(''); });
  assert(sOk, 'the client strikes while holstered (a whiff)');
  await until(B, () => window.__app.current.strike.approved, null, 5000, 'host approves the strike (cstart)');
  await compare('strike', 'strike');
  await GB(() => { window.__app.current.strike.freezeAt = -1; });
  await until(B, () => !window.__app.current.strike.active, null, 5000, 'strike ends');
  await wait(500);
  // (step 10 check) the host's record of the last strike ends before the refused one is asked for
  await until(A, () => window.__app.current.net['strikes'].size === 0, null, 10000, 'host strike record ends');
  const sd0 = await GB(() => window.__app.current.strike.count.denied);
  await GB(() => window.__app.current.strike.begin('nobody'));
  await until(B, (n) => window.__app.current.strike.count.denied > n && !window.__app.current.strike.active, sd0, 5000, 'strike denied');
  const sdn = await GB(() => ({ why: window.__app.current.strike.lastDenied, back: window.__app.current.strike.lastBackT, mode: window.__app.current.net.mvNow?.m }));
  assert(sdn.why === 'noTarget' && sdn.back <= 0.3, `denied (${sdn.why}): no hit, back to ground in ${sdn.back.toFixed(2)} s`);
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'ground', null, 5000, 'host sees the client on the ground again');

  // (locomotion step 13) door peek: the client cracks the Proving shed door; the host's copy poses in mode doorPeek
  // (joints within 10 cm) and the host's leaf is drawn at the crack
  console.log('doorPeek');
  await reset();
  await allowTeleport(A);
  const dOk = await GB(() => {
    const g = window.__app.current;
    const d = g.world.doors.list[0];
    if (!d) return false;
    const an = d.anchor;
    const nx = Math.cos(an.yaw);
    const nz = -Math.sin(an.yaw);
    const mx = an.hinge.x + Math.sin(an.yaw) * an.width * 0.5;
    const mz = an.hinge.z + Math.cos(an.yaw) * an.width * 0.5;
    const yaw = Math.atan2(-nx, -nz);
    g.player.controller.clearCrouchToggle();
    g.player.controller.teleport(new g.player.position.constructor(mx + nx * 0.7, an.hinge.y + 0.05, mz + nz * 0.7), yaw);
    g.player.cam.yaw = yaw;
    g.player.cam.pitch = 0;
    setTimeout(() => window.__app.input.state.tap('cover'), 800);
    return true;
  });
  assert(dOk, 'Proving has a door');
  await until(B, () => window.__app.current.doorPeek.phase === 'peek', null, 6000, 'client peeks at the door');
  await until(A, () => window.__app.current.world.doors.list[0].cracked, null, 5000, 'host cracks the door');
  await compare('doorPeek', 'doorPeek');
  await wait(800);
  const dcA = await GA(() => { const d = window.__app.current.world.doors.list[0]; return { ajar: d.ajar, target: d.target, open: d.open, body: !!d.body }; });
  const dcB = await GB(() => { const d = window.__app.current.world.doors.list[0]; return { ajar: d.ajar, cracked: d.cracked }; });
  assert(Math.abs(dcA.ajar - 0.12) <= 0.05 && Math.abs(dcA.ajar - dcB.ajar) <= 0.05 && dcA.target === 0 && dcA.body, `host leaf at the crack (host ${dcA.ajar.toFixed(3)}, client ${dcB.ajar.toFixed(3)}, ${JSON.stringify(dcA)})`);
  await GB(() => window.__app.input.state.tap('cover'));
  await until(A, () => !window.__app.current.world.doors.list[0].cracked, null, 5000, 'host clears the crack on close');
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'ground', null, 5000, 'host sees the client back on the ground');

  const errs = [...eA, ...eB].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-netmove OK');
