// 3.2.0 phase 1: networked movement state. Two pages over ?net=local, Free Roam on Proving Grounds: the client
// climbs a ladder and a drainpipe, hangs from a pipe and a lip, crawls a
// duct, rides a zipline and rolls; team moves (phase 5: brace + boost, the human ladder, a denial); the host's copy of the client is in the same mode with the hands, feet and head
// within 10 cm of the client's own pose. (test-chores-13) A role-swapped pass at the end: the client leads the leg-up
// (climbs onto the lip) on a bracing host; the client's copy of the host within the same 10 cm.
import { assert } from './e2e-lib.mjs';
import { until, waitSim, waitHostSim, hostAndJoin, localJoints as lj, remoteJoints as rj, allowTeleport, JOINTS, watchTeam, teamLog } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
// (co-op test fix) pauses are game time: the sim runs slower than real time on software GL (e2e-net-lib `waitSim`)
const wait = (ms) => waitSim(ms);
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

// (netmove-compare) The idle cycles (the drawn ready stance's 8 s stagger, the 12 s keyed idle, the breath) run on each
// rig's own AnimGraph clock (`idleT`, started at a random phase; `breathPh`), which is not on the wire: the client's rig
// and the host's copy of it play them at unrelated phases, so a still pose differed by the phase gap (drawn: ankleL
// 7.8 cm alone, 10.7 cm under load). For a compare both graphs are held at the same idle phase, then released.
// The planted feet are history too: each rig's planner leaves a still foot up to PLANNER.idleErr (7.5 cm) off its spot
// before it re-steps, so after the same teleport the two rigs' ankles sat 2.8-7.2 cm apart with the bodies exact
// (drawn, loaded runs). During a compare both planners re-step at the tighter RESTEP.err (2 cm), as after a crouch change.
const PIN_IDLE = (on) => {
  const pin = (rig) => {
    if (!rig) return;
    if (on && !Object.prototype.hasOwnProperty.call(rig, 'animate')) {
      const orig = Object.getPrototypeOf(rig).animate;
      rig.animate = function (dt, s) {
        this.graph.idleT = 1;
        this.graph.breathPh = 0;
        this.planner.restepT = 1.2;
        return orig.call(this, dt, s);
      };
    } else if (!on) delete rig.animate;
  };
  const g = window.__app.current;
  pin(g.player?.rig);
  for (const r of g.net?.remotes?.values?.() ?? []) pin(r.avatar?.rig);
  // (test-chores-13) the client's copies of the host (CoopClient.avatars), for the role-swapped compare
  for (const a of g.net?.avatars?.values?.() ?? []) pin(a.rig);
};
const pinIdle = (on) => Promise.all([A.evaluate(PIN_IDLE, on), B.evaluate(PIN_IDLE, on)]);
/** (netmove-compare) the worst joint error of every compare, printed at the end (the margin under the limit) */
const worstLog = [];

/** The client's pose mirrored on the host: same mode, joints within `tol` (m). */
async function compare(label, mode, tol = 0.1, joints = JOINTS) {
  await pinIdle(true);
  try {
    await compareAt(label, mode, tol, joints);
  } finally {
    await pinIdle(false);
  }
}
async function compareAt(label, mode, tol, joints) {
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
  // (test-speed) and the host's copy settled too (its joints still for 0.3 s of sim): under load its pose and feet were
  // still on their way when sampled (doorPeek ankle 10.8-12.9 cm in loaded runs, 2-2.5 cm alone)
  for (let k = 0; k < 20; k++) {
    const a = (await remoteJoints()).j;
    await wait(300);
    const b = (await remoteJoints()).j;
    if (Math.max(...joints.map((n) => err(a[n], b[n]))) < 0.01) break;
  }
  await wait(300);
  const [loc, rem] = [await localJoints(), await remoteJoints()];
  const errs = Object.fromEntries(joints.map((n) => [n, +err(loc[n], rem.j[n]).toFixed(3)]));
  const worst = Math.max(...Object.values(errs));
  worstLog.push([label, worst]);
  console.log(`  ${label}: worst joint ${(worst * 100).toFixed(1)} cm (limit ${tol * 100} cm)`);
  if (worst > tol || process.env.LOG) {
    const b = await GB(() => { const g = window.__app.current; const c = g.player.controller; const r = g.player.rig.root; return { pos: [c.pos.x, c.pos.y, c.pos.z], yaw: c.yaw, root: [r.position.x, r.position.y, r.position.z], ry: r.rotation.y, crouch: c.crouchBlend, rig: { kneel: g.player.rig.kneelW ?? null, h: g.player.rig.p.height, build: g.player.rig.p.build, hy: g.player.rig.headNode.getAbsolutePosition().y - r.position.y, lod: g.player.rig.lodSkip, mv: g.net.mvNow, sp: c.speed, Lc: g.player.rig.planner.L.contact, Rc: g.player.rig.planner.R.contact } }; });
    const a = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; const av = r.avatar; const rt = av.rig.root; return { feet: [r.feet.x, r.feet.y, r.feet.z], pos: [av.pos.x, av.pos.y, av.pos.z], root: [rt.position.x, rt.position.y, rt.position.z], ry: rt.rotation.y, st: r.state, rig: { h: av.rig.p.height, build: av.rig.p.build, hy: av.rig.headNode.getAbsolutePosition().y - rt.position.y, lod: av.rig.lodSkip, crouch: av.crouch, sp: av.speed, pins: av.rig.footPins, Lc: av.rig.planner.L.contact, Rc: av.rig.planner.R.contact, moving: av.rig.pin?.moving } }; });
    console.log('  client', JSON.stringify(b), '\n  host', JSON.stringify(a), '\n  joints', JSON.stringify(loc), JSON.stringify(rem.j));
  }
  assert(rem.mode === mode && worst <= tol, `${label}: host mode ${rem.mode}, joints within ${tol * 100} cm (${JSON.stringify(errs)})`);
}

/** (test-chores-13) The client's copy of the host (its first avatar): its move mode and the world positions of `names`. */
const avatarJoints = (names = JOINTS) =>
  GB((names) => {
    const a = window.__app.current.net.avatars.values().next().value;
    const rig = a.rig;
    return { mode: a.mode, j: Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; })) };
  }, names);

/**
 * (test-chores-13) The role-swapped `compare`: the HOST's own pose mirrored on the client (same mode, joints within
 * `tol`), with the same settles. Page A is in the background, stepped by its pump: every host-side wait is a Node-side
 * poll of the host's clock (`waitHostSim`, wall capped), never a promise inside A.
 */
async function compareHost(label, mode, tol = 0.1, joints = JOINTS) {
  await pinIdle(true);
  try {
    await until(B, (m) => window.__app.current.net.avatars.values().next().value?.mode === m, mode, 8000, `client sees the host ${label} (${mode})`);
    // the host settled (its joints still for 0.3 s of its own clock)
    let settled = false;
    for (let k = 0; k < 30 && !settled; k++) {
      const a = await lj(A, joints);
      await waitHostSim(A, 300);
      const b = await lj(A, joints);
      const sp = await GA(() => window.__app.current.player.controller.speed);
      settled = sp < 0.05 && Math.max(...joints.map((n) => err(a[n], b[n]))) < 0.01;
    }
    if (!settled) console.log('  (host never settled)', await GA(() => JSON.stringify({ sp: window.__app.current.player.controller.speed, ov: !!window.__app.current.player.controller.override })));
    await wait(800);
    // then the client's copy of it (still for 0.3 s of sim)
    for (let k = 0; k < 20; k++) {
      const a = (await avatarJoints(joints)).j;
      await wait(300);
      const b = (await avatarJoints(joints)).j;
      if (Math.max(...joints.map((n) => err(a[n], b[n]))) < 0.01) break;
    }
    await wait(300);
    const [loc, rem] = [await lj(A, joints), await avatarJoints(joints)];
    const errs = Object.fromEntries(joints.map((n) => [n, +err(loc[n], rem.j[n]).toFixed(3)]));
    const worst = Math.max(...Object.values(errs));
    worstLog.push([label, worst]);
    console.log(`  ${label}: worst joint ${(worst * 100).toFixed(1)} cm (limit ${tol * 100} cm)`);
    if (worst > tol || process.env.LOG) console.log('  host', JSON.stringify(loc), '\n  client copy', JSON.stringify(rem));
    assert(rem.mode === mode && worst <= tol, `${label}: client copy mode ${rem.mode}, joints within ${tol * 100} cm (${JSON.stringify(errs)})`);
  } finally {
    await pinIdle(false);
  }
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
  await GB(() => window.__app.input.state.set('t', 'ads', true));
  await until(A, () => (window.__app.current.net.remotes.values().next().value.state.mv.r ?? 0) > 0.9, null, 6000, 'host sees the split aim');
  await compare('aiming from the split', 'split', 0.1, ['wristR', 'headNode', 'ankleL', 'ankleR']);
  await GB(() => window.__app.input.state.set('t', 'ads', false));
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
  // timestamps taken inside the pages: the client's sim (release to holstered, its own class holster time); the host's receipt of
  // the first dw 0 state (stamped as the packet is buffered) and the frame its copy stows the weapon. Network delivery
  // (VM latency) is not the remote pose's behaviour: the check is the client's holster time plus the host's receipt
  // to stow, against the class's holster (anim-natural N3: 1.0 s rifle / 0.9 s pistol, drawState holsterTimeFor) + 0.1 s
  // interpolation + one host frame.
  await GA(() => {
    const r = window.__app.current.net.remotes.values().next().value;
    const av = r.avatar;
    const t = (window.__holT = { recv: 0, stow: 0, frame: 0, last: 0, gap: 0, frames: 0 });
    const push = av.buf.push.bind(av.buf);
    // (anim-cleanup) gap: the receipt after the last host update; frames: host updates from the receipt to the stow
    av.buf.push = (tm, st) => { if (!t.recv && st?.mv?.dw === 0) { t.recv = performance.now(); t.gap = t.last ? t.recv - t.last : 0; } return push(tm, st); };
    const upd = av.update.bind(av);
    av.update = (dt, rt) => {
      const now = performance.now();
      upd(dt, rt);
      if (t.recv && !t.stow) t.frames++;
      if (t.recv && !t.stow && !av.rig.heldWeapon) { t.stow = now; t.frame = t.last ? now - t.last : 0; av.update = upd; av.buf.push = push; }
      t.last = now;
    };
  });
  await GB(() => new Promise((res) => {
    const st = window.__app.current;
    const t = (window.__holT = { rel: Date.now(), sim: 0, dw0: 0 });
    st.player.forceAds = false;
    // (anim-rework S1) letting go of the aim drops to low ready: an X tap holsters (only from low ready: X from holstered draws)
    if (st.player.stance.base === 'lowReady') window.__app.input.state.tap('draw');
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => {
      orig(dt);
      t.sim += dt;
      // (a 2 s cap of sim: a missed holster fails the timing asserts below instead of hanging the suite)
      if (st.weapons.drawPhase === 0 || t.sim > 2) { t.dw0 = Date.now(); st.fixedUpdate = orig; res(); }
    };
  }));
  await until(A, () => window.__holT.stow > 0, null, 4000, 'host remote stowed');
  const hbT = await GB(() => window.__holT);
  const haT = await GA(() => window.__holT);
  const remMs = haT.stow - haT.recv;
  const holMs = hbT.sim * 1000 + remMs;
  const holClsMs = await GB(() => (window.__app.current.weapons.current.def.class === 'pistol' ? 900 : 1000));
  const limit = holClsMs + 1000 / 60 + 100 + Math.max(1000 / 60, haT.frame);
  console.log(`    holster: client sim ${(hbT.sim * 1000).toFixed(0)} ms (wall ${hbT.dw0 - hbT.rel} ms), host receipt to stow ${remMs.toFixed(0)} ms (host frame ${haT.frame.toFixed(0)} ms, receipt ${haT.gap.toFixed(0)} ms after an update, stowed on update ${haT.frames})`);
  assert(remMs <= 100 + Math.max(1000 / 60, haT.frame) + 1, `the host's copy stows within 0.1 s + one frame of receiving dw 0 (${remMs.toFixed(0)} ms)`);
  assert(holMs <= limit, `holstered: client holster + host receipt to stow ${holMs.toFixed(0)} ms <= ${limit.toFixed(0)} ms (${holClsMs / 1000} s holster + one sim step + 0.1 s + one frame)`);
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

  console.log('team moves (B2): leg-up (host climbs), ledge relay (client climbs the hanging host), denials');
  // the 4.2 m block north of Proving (south face z 27.5, x 2.5..5.5): the booster crouches facing it (Co-op action = pad RB)
  const placeTeam = async (P, x, z, yaw) => P.evaluate(([x, z, yaw]) => { const g = window.__app.current; g.team.end(true); if (g.traversal.attached) g.traversal.detach('drop'); window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); g.player.controller.clearCrouchToggle(); g.player.controller.teleport(new g.player.position.constructor(x, 0.05, z), yaw); g.player.cam.yaw = yaw; }, [x, z, yaw]);
  // a button held until `cond` holds on that page (software GL runs a few frames a second: a short press can fall between polls)
  const holdUntil = async (P, btn, cond, what, arg = null) => {
    await P.evaluate((b) => window.__pad.set(b, 1), btn);
    try { await until(P, cond, arg, 5000, what); } finally { await P.evaluate((b) => window.__pad.set(b, 0), btn); }
  };
  const RB = 5;
  // (co-op test fix) stand first: a player still crouching reads as "crouches" before the B press lands (e2e-ctcourse)
  const crouchOn = async (P) => { await until(P, () => !window.__app.current.player.controller.crouched, null, 3000, 'stands before the crouch').catch(() => {}); await holdUntil(P, 1, () => window.__app.current.player.controller.crouched, 'crouches'); await wait(150); };
  await allowTeleport(A);
  await GB(() => { for (const a of window.__app.current.net.avatars?.values?.() ?? []) a.allowTeleport?.(3); });
  await placeTeam(B, 4, 27.05, 0);
  await placeTeam(A, 4, 26.2, 0);
  await wait(600);
  await crouchOn(B);
  await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', 'client offers a leg-up (crouched + Co-op action)').catch(async (e) => { console.log(await GB(() => { const g = window.__app.current; return JSON.stringify({ st: g.team.state, prompt: g.team.prompt, crouched: g.player.controller.crouched, mates: g.net.teamMates().map((m) => [m.id, m.mode]) }); })); throw e; });
  assert((await GB(() => window.__app.current.team.prompt)) !== null, 'the offerer sees a prompt naming the move');
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'brace', null, 6000, 'host sees the client offering (crouched)');
  // (anim-joints J2, J1 polish 1) the partner's avatar reads the base table and its own team row: the host's copy of the
  // offering client picks `team.boost.b` from the client's move mode on the wire (no wire change), and a base row set
  // there on the host (`__animBase`) turns that copy's elbow by the row's 40 deg
  await until(A, () => { const p = window.__app.current.net.remotes.values().next().value?.avatar.rig.tuneSt?.pick; return !!p && Array.from({ length: p.n }, (_, k) => p.ids[k]).includes('team.boost.b'); }, null, 6000, "host's copy of the offering client picks its team row (team.boost.b)");
  const tel = () => GA(() => { const r = window.__app.current.net.remotes.values().next().value.avatar.rig; const x = r.elbowR.rotationQuaternion; const j = window.__tuneV2.J.elbowR; return { el: [x.x, x.y, x.z, x.w], live: r.tuneSt.joints.live[j], w: r.tuneSt.joints.cur[j * 4 + 3] }; });
  const tang = (a, b) => (2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]))) * 180) / Math.PI;
  const te0 = await tel();
  await GA(() => window.__animBase.setJoint('team.boost.b', 'elbowR', [40, 0, 0]));
  await until(A, (w) => { const r = window.__app.current.net.remotes.values().next().value.avatar.rig; const j = window.__tuneV2.J.elbowR; return Math.abs(r.tuneSt.joints.cur[j * 4 + 3] - w) < 1e-4; }, Math.cos((20 * Math.PI) / 180), 8000, "the host's copy eases onto the base row (40 deg)");
  const te1 = await tel();
  assert(te0.live === 0 && te1.live === 1 && tang(te0.el, te1.el) > 20, `the partner's avatar takes a base row set on the host (team.boost.b elbowR: ${tang(te0.el, te1.el).toFixed(1)} deg)`);
  await GA(() => window.__animBase.reset());
  await until(A, () => !!window.__app.current.team.offer?.boost, null, 4000, 'host is offered the leg-up');
  assert(/leg-up/i.test(await GA(() => window.__app.current.team.prompt ?? '')), 'the partner prompt names the leg-up');
  // (flake-fix) the client's `assist` lasts the boost's 0.9 s of game time: on a loaded page it began and ended before
  // the poll after the host's boost (both pages 4+ s on, "timed out waiting for client assists"). Its states are recorded
  // from here, so the check reads whether it went through `assist`, not whether it is in it at the moment of a poll
  await watchTeam(B);
  await holdUntil(A, RB, () => window.__app.current.team.count.boosts === 1, 'host boosted').catch(async (e) => { console.log(await GA(() => { const g = window.__app.current; const t = g.team; return JSON.stringify({ c: t.count, why: t.lastDenied, st: t.state, offer: !!t.offer, boost: !!t.offer?.boost }); })); throw e; });
  await until(B, () => !!window.__app.current.team.__log?.some((e) => e[1] === 'assist'), null, 4000, 'client assists').catch(async (e) => {
    console.log('    host:', await teamLog(A));
    console.log('    client:', await teamLog(B));
    throw e;
  });
  await until(A, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 20000, 'host on the 4.2 m lip').catch(async (e) => { console.log(await GA(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, cnt: g.team.count, why: g.team.endWhy, att: g.traversal.attach.phase, ak: g.traversal.attach.anchor?.kind, ov: !!c.override, pos: [c.pos.x, c.pos.y, c.pos.z] }); })); throw e; });
  const lipY = await GA(() => window.__app.current.traversal.attach.anchor.top);
  assert(Math.abs(lipY - 4.2) < 0.1, `the leg-up puts the host on the 4.2 m lip (${lipY})`);
  await until(B, () => window.__app.current.team.state === 'none', null, 4000, 'client free after the boost');

  // ledge relay: the host hangs and offers it (Co-op action); the client under it presses and climbs the hanging body
  const lipId = await GA(() => window.__app.current.traversal.attach.anchor.id);
  await placeTeam(B, 4, 26.6, 0);
  await wait(400);
  await holdUntil(A, RB, () => window.__app.current.team.state === 'relayOffer', 'host offers the relay while hanging');
  await until(B, () => { const m = window.__app.current.net.teamMates()[0]; return !!m && m.mode === 'ledge' && (m.sub & 1024) !== 0; }, null, 6000, 'client sees the hanging host offering the relay');
  await until(B, () => !!window.__app.current.team.offer?.relay, null, 4000, 'client is offered the relay');
  assert(/climb/i.test(await GB(() => window.__app.current.team.prompt ?? '')), 'the partner prompt names the relay');
  await holdUntil(B, RB, () => window.__app.current.team.count.ladders === 1, 'client climbs the relay').catch(async (e) => { console.log(await GB(() => { const t = window.__app.current.team; return JSON.stringify({ c: t.count, why: t.lastDenied, st: t.state, offer: !!t.offer }); })); throw e; });
  await until(A, () => window.__app.current.team.state === 'relayHold' || window.__app.current.team.state === 'none', null, 4000, 'host holds still for the relay');
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return r?.avatar.mode === 'boost' && r.avatar.pos.y > 0.8; }, null, 20000, 'host sees the client climbing the hanging body');
  await until(B, (id) => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.id === id, lipId, 30000, 'client hangs on the same ledge').catch(async (e) => { console.log(await GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, cnt: g.team.count, why: g.team.endWhy, att: g.traversal.attach.phase, aid: g.traversal.attach.anchor?.id, ov: !!c.override, grounded: c.grounded, pos: [c.pos.x, c.pos.y, c.pos.z] }); })); console.log(await GA(() => JSON.stringify({ lip: window.__app.current.traversal.attach.anchor?.id, pos: window.__app.current.player.controller.pos, att: window.__app.current.traversal.attach.phase }))); throw e; });
  await until(A, () => window.__app.current.team.state === 'none', null, 4000, 'host free after the relay');
  assert(await GA(() => window.__app.current.traversal.attached), 'the host is still hanging and pulls up next');
  assert(true, 'ledge relay: the client climbs the hanging host to the same ledge');

  // denial: the client offers, the host is offered a leg-up, the client stands down and walks off before the host asks
  await placeTeam(B, 4, 27.05, 0);
  await placeTeam(A, 4, 26.2, 0);
  await wait(600);
  await crouchOn(B);
  await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', 'client offers again');
  await until(A, () => !!window.__app.current.team.offer?.boost, null, 6000, 'host offered a leg-up again');
  const pending = await GA(() => { const o = window.__app.current.team.offer; return { id: o.mate.id, target: o.boost.anchor.id, s: o.boost.s, gy: o.boost.grip.y }; });
  await holdUntil(B, 1, () => window.__app.current.team.state === 'none', 'client stands down (B)');
  // (co-op test fix) B ends the offer but leaves the crouch on: stand up first, or the walk-off runs at the CT crouch
  // speed (1.2 m in 6 s against the 1.55 m asked)
  await GB(() => window.__app.current.player.controller.clearCrouchToggle());
  await GB(() => { window.__pad.axis(1, 1); });
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return r?.state?.mv?.m === 'ground' && r.feet.z < 25.5; }, null, 6000, 'host sees the client walk off').catch(async (e) => { console.log(await GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, ov: !!c.override, crouched: c.crouched, grounded: c.grounded, pos: [c.pos.x, c.pos.y, c.pos.z], axes: navigator.getGamepads()[0]?.axes, att: g.traversal.attached }); })); console.log(await GA(() => { const r = window.__app.current.net.remotes.values().next().value; return JSON.stringify({ m: r?.state?.mv?.m, z: r?.feet.z }); })); throw e; });
  await GB(() => window.__pad.axis(1, 0));
  const deniedBefore = await GA(() => window.__app.current.team.count.denied);
  await GA((p) => window.__app.current.net.teamRequest('boost', p.id, p.target, p.s, p.gy), pending);
  const moved = await GA(() => ({ n: window.__app.current.team.count.denied, why: window.__app.current.team.lastDenied, st: window.__app.current.team.state }));
  assert(moved.n > deniedBefore && moved.st === 'none' && ['notBraced', 'far'].includes(moved.why), `the partner stood down mid-request: denied (${moved.why})`);
  await wait(1100);

  // denials: a relay without a hanging partner, and a leg-up without an offer, are refused by the host; a standing press is a polite refusal
  await GB(() => { const g = window.__app.current; g.traversal.detach('drop'); });
  await wait(800);
  const hostId = await GA(() => window.__coop.session.selfId);
  const before = await GB(() => window.__app.current.team.count.denied);
  await wait(1100);
  await GB((id) => window.__app.current.net.teamRequest('ladder', id, -1, 0, 0), hostId);
  await until(B, (n) => window.__app.current.team.count.denied > n, before, 4000, 'relay request denied');
  const why = await GB(() => window.__app.current.team.lastDenied);
  assert(['notOffering', 'far', 'noTarget', 'busy'].includes(why), `a relay without a hanging partner is denied (${why})`);
  await wait(1100);
  await GB((id) => window.__app.current.net.teamRequest('boost', id, -1, 0, 0), hostId);
  await until(B, (n) => window.__app.current.team.count.denied > n + 1, before, 4000, 'leg-up request denied');
  // prototype: revisit - the standing Co-op press refusal ("Crouch for a leg-up") is not e2e-checked yet (crouch state carries over between placements)
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
  /** Stand the page 0.4 m out from the body line (playtest 2: entry within 0.5 m) at `k` m along it facing it, tap the context action. */
  const toWall = (P, k) => P.evaluate(([i, k]) => {
    const g = window.__app.current;
    const s = g.world.level.coverSegments[i];
    const yaw = Math.atan2(-s.nx, -s.nz);
    g.player.controller.clearCrouchToggle();
    g.player.controller.teleport(new g.player.position.constructor(s.ax + s.tx * k + s.nx * 0.75, s.y + 0.05, s.az + s.tz * k + s.nz * 0.75), yaw);
    g.player.cam.yaw = yaw;
    g.player.cam.pitch = 0;
    // (the stance settles standing first: the entry keeps the stance the player has)
    window.__afterSim(1.0, () => window.__app.input.state.tap('cover'));
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
  // (co-op test fix) the host's copy of the client's feet lags the snapshots: wait for it to settle apart (game time),
  // then measure; a real overlap still fails the assert below
  await until(A, () => { const g = window.__app.current; const r = g.net.remotes.values().next().value; const p = g.player.position; return Math.hypot(p.x - r.feet.x, p.z - r.feet.z) >= 0.6; }, null, 3000, 'the host copy settles apart on the wall').catch(() => {});
  const st = await GA(() => { const g = window.__app.current; const r = g.net.remotes.values().next().value; const p = g.player.position; return { s: g.wallCore.s, seg: g.wallCore.seg, d: Math.hypot(p.x - r.feet.x, p.z - r.feet.z) }; });
  const sb = await GB(() => window.__app.current.wallCore.s);
  assert(st.seg === wseg && Math.abs(st.s - sb) >= 0.6 && st.d >= 0.6, `stacked on one wall: centres ${Math.abs(st.s - sb).toFixed(2)} m apart along it, ${st.d.toFixed(2)} m apart (>= 0.6, no capsule overlap)`);
  for (const P of [A, B]) await P.evaluate(() => { const g = window.__app.current; if (g.wallCore?.active) g.wallCore.leave('test'); });
  await wait(300);
  await GA(() => { const g = window.__app.current; g.player.controller.clearCrouchToggle(); g.player.controller.teleport(new g.player.position.constructor(3, 0.1, 3), 0); });

  // (locomotion step 12; A3: the lean-out and the SWAT turn are gone) the head-first peek at a wall end by the Proving
  // doorway (WALL_SUB.peek) and the weapon hand at a left edge; the host's copy within 10 cm, and the host samples a
  // peeking client's light at its head (light parity)
  console.log('wall edge: peek');
  await reset();
  const door = await GB(() => {
    const g = window.__app.current;
    const L = g.wallCore.links;
    const segs = g.world.level.coverSegments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.low || Math.abs(Math.abs(s.az) - 8) > 0.4 || Math.abs(s.nz) < 0.99) continue;
      if (s.len < 1.5) continue;
      if (L.kB[i] === 0) return { i, end: 1, len: s.len };
      if (L.kA[i] === 0) return { i, end: -1, len: s.len };
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
      g.player.controller.teleport(new g.player.position.constructor(s.ax + s.tx * k + s.nx * 0.75, s.y + 0.05, s.az + s.tz * k + s.nz * 0.75), yaw);
      g.player.cam.yaw = yaw;
      g.player.cam.pitch = 0;
      window.__afterSim(1.0, () => window.__app.input.state.tap('cover'));
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
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; return Math.abs(Math.hypot(r.ref.peekX ?? 0, r.ref.peekZ ?? 0) - 0.35) < 0.01; }, null, 3000, 'host peek offset eased to 0.35 m');
  // (step 12b fix r2, light parity; rig-pose-fix S1 / S4) the host's head point and light sample are the client's sim body
  // head (ref.head, from its MoveState) on the wall, as the client's own light meter reads its sim body head
  // (`PlayerTarget.body`): the two heads agree (the MoveState offset is 0.35 m); the client's rig head is logged beside it
  const pl = await GA(() => { const g = window.__app.current; const r = g.net.remotes.values().next().value; const h = r.headPoint(new g.player.position.constructor()); return { px: r.ref.peekX, pz: r.ref.peekZ, h: [h.x, h.y, h.z], ref: !!r.ref.head, hd: Math.hypot(h.x - r.feet.x, h.z - r.feet.z) }; });
  const plL = await GB(() => { const g = window.__app.current; const p = g.player.position; const h = g.target.body.head; const rh = g.player.rig.posedHead(new p.constructor()); return { h: [h.x, h.y, h.z], hd: Math.hypot(h.x - p.x, h.z - p.z), rig: +Math.hypot(rh.x - h.x, rh.y - h.y, rh.z - h.z).toFixed(3) }; });
  const pd = Math.hypot(pl.h[0] - plL.h[0], pl.h[1] - plL.h[1], pl.h[2] - plL.h[2]);
  console.log(`  peek head samples: local ${plL.hd.toFixed(3)} m out, host ${pl.hd.toFixed(3)} m out, apart ${pd.toFixed(3)} m (local sim head ${plL.rig} m from its rig head)`);
  assert(Math.abs(Math.hypot(pl.px, pl.pz) - 0.35) < 0.01 && pl.ref && pd < 0.05 && plL.hd > 0.1 && pl.hd > 0.1, `the host samples the peeking client's light and head at its sim body head, within 5 cm of the client's own (${JSON.stringify({ pl, plL, pd })})`);
  await GB(() => window.__pad.axis(0, 0));
  await until(B, () => !window.__app.current.wallCore.peekOn && window.__app.current.wallCore.peek === 0, null, 4000, 'client peek eases back');
  // (A3) the weapon hand at a left edge while peeking: WALL_SUB.leftHand (128) reaches the host at the left (b) end only
  await GB((x) => window.__pad.axis(0, x), door.end);
  await until(B, () => window.__app.current.wallCore.peek === 1, null, 4000, 'client peeks again');
  await until(A, (e) => { const mv = window.__app.current.net.remotes.values().next().value?.state?.mv; return !!mv && ((mv.sub & 128) !== 0) === (e > 0) && (mv.sub & 16) !== 0; }, door.end, 5000, 'host sees the peek with the weapon hand of the edge side');
  await GB(() => window.__pad.axis(0, 0));
  await GB(() => { const g = window.__app.current; if (g.wallCore?.active) g.wallCore.leave('test'); });
  await wait(400);
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
    // (A3, G19) A at the door opens the door menu, one step down is Stealth open, A picks it
    const tap = (a) => window.__app.input.state.tap(a);
    window.__afterSim(0.8, () => tap('interact'));
    window.__afterSim(1.3, () => tap('uiDown'));
    window.__afterSim(1.8, () => tap('interact'));
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
  // (A3) the stick pulled back (toward the body) closes the crack
  await GB(() => { window.__pad.connect(); window.__pad.axis(1, 1); });
  await until(B, () => !window.__app.current.world.doors.list[0].cracked || window.__app.current.doorPeek.phase !== 'peek', null, 5000, 'client closes the crack');
  await GB(() => window.__pad.axis(1, 0));
  await until(A, () => !window.__app.current.world.doors.list[0].cracked, null, 5000, 'host clears the crack on close');
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'ground', null, 5000, 'host sees the client back on the ground');

  // (test-chores-13) role-swapped: the leg-up of the team-moves section with the roles turned round. The host braces
  // (the follower) and the CLIENT leads: it asks for the boost and climbs onto the 4.2 m lip. The same checks as that
  // section, from the other page, plus the poses both ways: the host's brace on the client's copy, the client's hang on
  // the host's copy (10 cm, as everywhere above). Host waits are Node-side polls (`until`, `waitHostSim`).
  console.log('role-swapped team move: the client leads the leg-up, the host braces');
  await reset();
  await allowTeleport(A);
  await placeTeam(A, 4, 27.05, 0);
  await placeTeam(B, 4, 26.2, 0);
  await waitHostSim(A, 600);
  await wait(600);
  await crouchOn(A);
  await holdUntil(A, RB, () => window.__app.current.team.state === 'offer', 'host offers a leg-up (crouched + Co-op action)').catch(async (e) => { console.log('    host:', await teamLog(A)); throw e; });
  assert((await GA(() => window.__app.current.team.prompt)) !== null, 'swapped: the offering host sees a prompt naming the move');
  await until(B, () => { const m = window.__app.current.net.teamMates()[0]; return !!m && m.mode === 'brace'; }, null, 6000, 'client sees the host offering (crouched)');
  await compareHost('host brace (offer)', 'brace');
  await until(B, () => !!window.__app.current.team.offer?.boost, null, 4000, 'client is offered the leg-up').catch(async (e) => { console.log('    client:', await teamLog(B)); throw e; });
  assert(/leg-up/i.test(await GB(() => window.__app.current.team.prompt ?? '')), 'swapped: the partner prompt names the leg-up');
  // the host's `assist` lasts the boost's 0.9 s of its game time: recorded, not polled (watchTeam)
  await watchTeam(A);
  const boosts0 = await GB(() => window.__app.current.team.count.boosts);
  await holdUntil(B, RB, (n) => window.__app.current.team.count.boosts > n, 'client boosted', boosts0).catch(async (e) => { console.log('    client:', await teamLog(B)); console.log('    host:', await teamLog(A)); throw e; });
  await until(A, () => !!window.__app.current.team.__log?.some((e) => e[1] === 'assist'), null, 4000, 'host assists').catch(async (e) => {
    console.log('    host:', await teamLog(A));
    console.log('    client:', await teamLog(B));
    throw e;
  });
  await until(B, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 20000, 'client on the 4.2 m lip').catch(async (e) => { console.log('    client:', await teamLog(B)); throw e; });
  const lipY2 = await GB(() => window.__app.current.traversal.attach.anchor.top);
  assert(Math.abs(lipY2 - 4.2) < 0.1, `swapped: the leg-up puts the client on the 4.2 m lip (${lipY2})`);
  await until(A, () => window.__app.current.team.state === 'none', null, 4000, 'host free after the boost');
  await compare('client hang after the swapped leg-up', 'ledge', 0.1, ['wristL', 'wristR', 'headNode']);
  await reset();
  await placeTeam(A, 3, 3, 0);

  const errs =[...eA, ...eB].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  failed = true;
}
if (worstLog.length) {
  const m = worstLog.reduce((a, b) => (b[1] > a[1] ? b : a));
  console.log(`  (netmove-compare) max joint error ${(m[1] * 100).toFixed(1)} cm (${m[0]}) over ${worstLog.length} compares; drawn ${((worstLog.find((w) => w[0] === 'drawn')?.[1] ?? NaN) * 100).toFixed(1)} cm`);
}
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-netmove OK');
