// 3.2.0 phase 1: networked movement state. Two pages over ?net=local, Free Roam on Proving Grounds: the client
// takes low cover (and peeks over), high cover (and leans out at an edge), climbs a ladder and a drainpipe, hangs from a pipe and a lip, crawls a
// duct, rides a zipline and rolls; team moves (phase 5: brace + boost, the human ladder, a denial); the host's copy of the client is in the same mode with the hands, feet and head
// within 10 cm of the client's own pose. PvP (Team Deathmatch): a host shot at a client hanging off a lip hits
// the posed head.
import { launch, openPage, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;

async function until(page, fn, arg, timeout = 15000, what = 'condition') {
  try {
    await page.waitForFunction(fn, arg, { timeout, polling: 100 });
  } catch {
    throw new Error(`timed out waiting for ${what}`);
  }
}

const { browser, ctx, page: A, errors: eA } = await launch({ url, params: 'net=local' });
let B = null;
let eB = [];
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);
const pages = () => [A, B];

// joint world positions of a rig (wrists, ankles, head)
const JOINTS = ['wristL', 'wristR', 'ankleL', 'ankleR', 'headNode'];
const localJoints = () =>
  GB((names) => {
    const rig = window.__app.current.player.rig;
    return Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; }));
  }, JOINTS);
const remoteJoints = () =>
  GA((names) => {
    const r = window.__app.current.net.remotes.values().next().value;
    const rig = r.avatar.rig;
    return { mode: r.avatar.mode, j: Object.fromEntries(names.map((n) => { rig[n].computeWorldMatrix(true); const p = rig[n].getAbsolutePosition(); return [n, [p.x, p.y, p.z]]; })) };
  }, JOINTS);
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
  if (!settled) console.log('  (client never settled)', await GB(() => JSON.stringify({ sp: window.__app.current.player.controller.speed, cover: window.__app.current.cover.state, axes: navigator.getGamepads()[0]?.axes, ov: !!window.__app.current.player.controller.override })));
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
    const b = await GB(() => { const g = window.__app.current; const c = g.player.controller; const r = g.player.rig.root; return { pos: [c.pos.x, c.pos.y, c.pos.z], yaw: c.yaw, root: [r.position.x, r.position.y, r.position.z], ry: r.rotation.y, crouch: c.crouchBlend, rig: { lift: g.player.rig.lift, curl: g.player.rig.curl, mode: g.player.rig.coverMode, top: g.player.rig.coverTop, kneel: g.player.rig.kneelW ?? null, h: g.player.rig.p.height, build: g.player.rig.p.build, hy: g.player.rig.headNode.getAbsolutePosition().y - r.position.y, lod: g.player.rig.lodSkip, mv: g.net.mvNow, sp: c.speed, Lc: g.player.rig.planner.L.contact, Rc: g.player.rig.planner.R.contact } }; });
    const a = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; const av = r.avatar; const rt = av.rig.root; return { feet: [r.feet.x, r.feet.y, r.feet.z], pos: [av.pos.x, av.pos.y, av.pos.z], root: [rt.position.x, rt.position.y, rt.position.z], ry: rt.rotation.y, st: r.state, rig: { lift: av.rig.lift, curl: av.rig.curl, mode: av.rig.coverMode, top: av.rig.coverTop, h: av.rig.p.height, build: av.rig.p.build, hy: av.rig.headNode.getAbsolutePosition().y - rt.position.y, lod: av.rig.lodSkip, crouch: av.crouch, sp: av.speed, pins: av.rig.footPins, fp: r.state.mv.fp, Lc: av.rig.planner.L.contact, Rc: av.rig.planner.R.contact, moving: av.rig.pin?.moving } }; });
    console.log('  client', JSON.stringify(b), '\n  host', JSON.stringify(a), '\n  joints', JSON.stringify(loc), JSON.stringify(rem.j));
  }
  assert(rem.mode === mode && worst <= tol, `${label}: host mode ${rem.mode}, joints within ${tol * 100} cm (${JSON.stringify(errs)})`);
}

/** Attach the client to the first anchor of `kind` (optionally filtered) at its middle, wait until it is on. */
async function attach(kind, at = 0.5, entry = 'side') {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
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
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(() => {
    const g = window.__app.current;
    if (g.traversal.attached) g.traversal.detach('drop');
    g.cover.reset();
    g.player.controller.clearCrouchToggle();
    g.player.controller.teleport(new g.player.position.constructor(0, 0.1, 0), 0);
  });
  await wait(600);
}

try {
  console.log('host opens a room, client joins');
  await A.click('.main-menu .btn:has-text("Co-op")');
  await A.click('.btn:has-text("Host a room")');
  await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
  const code = await GA(() => window.__coop.session.code);
  const opened = await openPage(ctx, url, 'net=local');
  B = opened.page;
  eB = opened.errors;
  await B.click('.main-menu .btn:has-text("Co-op")');
  await B.click('.btn:has-text("Join with code")');
  await B.keyboard.type(code.toLowerCase());
  await B.keyboard.press('Enter');
  await until(A, () => window.__coop.session.players.size === 2, null, 15000, 'host sees client');

  async function startMode(mode, map) {
    await GA(([m, mp]) => window.__coop.session.setSettings(m, mp, 'normal', ''), [mode, map]);
    await GB(() => window.__coop.session.setReady(true));
    await until(A, () => window.__coop.session.allReady, null, 8000, 'everyone ready');
    await GA(() => window.__coop.session.startMatch());
    for (const P of pages()) await until(P, (m) => window.__app.current?.opts?.mode === m && !!window.__app.current.net && !window.__app.current.isEnded, mode, 40000, `${mode} match on both pages`);
    await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 15000, 'client state reaches the host');
    await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
  }

  await startMode('sandbox', 'proving');
  const mv = await GA(() => window.__app.current.net.remotes.values().next().value.state.mv);
  assert(mv && mv.m === 'ground', `the client's move state reaches the host (${JSON.stringify(mv)})`);

  console.log('cover');
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  // low cover at x = -5 (faces x -4.7 / -5.3, z -8..-4): east of it facing west
  await GB(() => { const g = window.__app.current; g.cover.reset(); window.__pad.connect(); g.player.controller.teleport(new g.player.position.constructor(-3.7, 0, -6), -Math.PI / 2); g.player.cam.yaw = -Math.PI / 2; });
  await wait(500);
  for (let k = 0; k < 5; k++) {
    await GB(() => window.__pad.set(0, 1));
    await wait(250);
    await GB(() => window.__pad.set(0, 0));
    await wait(700);
    if (await GB(() => window.__app.current.cover.state !== 'none')) break;
  }
  await until(B, () => window.__app.current.cover.state === 'in', null, 6000, 'client in low cover');
  await wait(1000);
  // (feet in cover come from each rig's own foot planner: where it stepped on the way in)
  await compare('low cover', 'cover', 0.1, ['headNode', 'wristL', 'wristR']);
  const sub = await GA(() => window.__app.current.net.remotes.values().next().value.state.mv.sub);
  assert((sub & 1) === 1, `low cover bit set (${sub})`);
  // aim over the top (LT)
  await GB(() => window.__pad.set(6, 1));
  await until(B, () => window.__app.current.player.coverPose.peekOver > 0.9, null, 6000, 'client peeks over');
  await until(A, () => (window.__app.current.net.remotes.values().next().value.state.mv.sub & 4) !== 0, null, 6000, 'host sees the over-peek');
  await compare('peek over low cover', 'cover', 0.1, ['headNode', 'wristL', 'wristR']);
  await GB(() => window.__pad.set(6, 0));
  await reset();

  console.log('high cover + edge peek');
  // high cover at x = -10 (faces x -9.75 / -10.25), z 0..4: east of it facing west
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(() => { const g = window.__app.current; g.player.controller.teleport(new g.player.position.constructor(-8.8, 0, 2.5), -Math.PI / 2); g.player.cam.yaw = -Math.PI / 2; });
  await wait(500);
  for (let k = 0; k < 5; k++) {
    await GB(() => window.__pad.set(0, 1));
    await wait(250);
    await GB(() => window.__pad.set(0, 0));
    await wait(700);
    if (await GB(() => window.__app.current.cover.state !== 'none')) break;
  }
  await until(B, () => window.__app.current.cover.state === 'in' && !window.__app.current.cover.low, null, 6000, 'client in high cover');
  await compare('high cover', 'cover', 0.1, ['headNode', 'wristL', 'wristR']);
  // to the +z edge, aim: a lean out round it
  await GB(() => window.__pad.axis(0, 1));
  await wait(1500);
  await GB(() => { window.__pad.axis(0, 0); window.__pad.set(6, 1); });
  await until(B, () => window.__app.current.cover.state === 'peek', null, 6000, 'client peeks round the edge');
  await until(A, () => (window.__app.current.net.remotes.values().next().value.state.mv.sub & (64 | 128)) !== 0 || Math.abs(window.__app.current.net.remotes.values().next().value.state.mv.ph - 0.5) > 0.2, null, 6000, 'host sees the edge peek');
  await compare('edge peek at high cover', 'cover', 0.1, ['headNode', 'wristL', 'wristR']);
  await GB(() => window.__pad.set(6, 0));
  await reset();

  console.log('attached states');
  await attach('ladder');
  await compare('ladder', 'ladder');
  // climb a second, stop, compare again (both grip sets step from the same rung grid)
  await GB(() => window.__pad.axis(1, -1));
  await wait(900);
  await GB(() => window.__pad.axis(1, 0));
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
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
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
    console.log(await GB(() => { const g = window.__app.current; const ac = g.traversal.attachCtl; return JSON.stringify({ kind: ac.m.kind, phase: ac.m.phase, pipe: ac.pipe.mode, jump: ac.jump?.anchor.kind ?? null, offer: !!g.takedown.offer, exec: g.execute.ready, it: !!g.interactTarget }); }));
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

  console.log('committed moves: a forward roll');
  // sprint (gear 6) along open floor, tap crouch
  await GB(() => { const g = window.__app.current; g.player.controller.gears.gear = 6; g.player.controller.teleport(new g.player.position.constructor(0, 0.1, 0), 0); g.player.cam.yaw = 0; window.__pad.axis(1, -1); });
  await wait(900);
  await GA(() => { window.__seen = new Set(); const r = window.__app.current.net.remotes.values().next().value; const tick = () => { window.__seen.add(r.avatar.mode); if (window.__seen.size < 50) requestAnimationFrame(tick); }; tick(); });
  // crouch (B) held 0.1 s of sim time
  await GB(() => new Promise((res) => {
    const st = window.__app.current;
    const orig = st.fixedUpdate.bind(st);
    let t = 0;
    window.__pad.set(1, 1);
    st.fixedUpdate = (dt) => { orig(dt); t += dt; if (t > 0.1) { window.__pad.set(1, 0); st.fixedUpdate = orig; res(); } };
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
  const placeTeam = async (P, x, z, yaw) => P.evaluate(([x, z, yaw]) => { const g = window.__app.current; g.team.end(true); g.cover.reset(); if (g.traversal.attached) g.traversal.detach('drop'); window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); g.player.controller.teleport(new g.player.position.constructor(x, 0.05, z), yaw); g.player.cam.yaw = yaw; }, [x, z, yaw]);
  const brace = async (P, label) => {
    await P.evaluate(() => window.__pad.set(3, 1));
    await until(P, () => window.__app.current.team.state === 'brace', null, 4000, `${label} braces`).catch(async (e) => { console.log(await P.evaluate(() => { const g = window.__app.current; return JSON.stringify({ mates: g.net.teamMates().map((m) => [m.id, m.pos.x, m.pos.z, m.mode]), pos: g.player.controller.pos, yaw: g.player.controller.yaw }); })); throw e; });
    await P.evaluate(() => window.__pad.set(3, 0));
  };
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
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
  await until(A, () => window.__app.current.team.count.boosts === 1, null, 4000, 'host boosted').catch(async (e) => { console.log(await GA(() => { const g = window.__app.current; const t = g.team; return JSON.stringify({ c: t.count, why: t.lastDenied, st: t.state, offer: !!t.offer, boost: !!t.offer?.boost, pressT: t['pressT'], td: !!g.takedown.offer, ex: g.execute.ready, it: !!g.interactTarget, trav: g.traversal.kind, att: g.traversal.attached, hint: g.traversal.attachCtl.hint?.anchor.kind ?? null, pad: navigator.getGamepads()[0]?.buttons[3]?.pressed, mode: g.app.input.mode }); })); throw e; });
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

  console.log('PvP: a client hanging off a lip is hit in the posed head');
  await GA(() => window.__coop.backToLobby());
  for (const P of pages()) await until(P, () => !!document.querySelector('.lobby-screen') && !window.__coop.inGame, null, 15000, 'back in the lobby');
  await startMode('tdm', 'warehouse');
  await attach('ledge');
  await until(A, () => window.__app.current.net.remotes.values().next().value?.avatar.mode === 'ledge', null, 8000, 'host sees the hang');
  await wait(700);
  // (the posed hit volumes settle over a few seconds of real time: sample until the head is hit, up to 8 s - a fixed 700 ms wait passed or failed by luck on a fast renderer)
  const takeShot = () => GA(() => {
    const g = window.__app.current;
    const r = g.net.remotes.values().next().value;
    const head = r.avatar.rig.headNode.getAbsolutePosition().clone();
    // from 3 m out from the wall the lip faces, level with the head
    const V = head.constructor;
    let best = null;
    for (let k = 0; k < 16 && !best; k++) {
      const a = (k / 16) * Math.PI * 2;
      const from = new V(head.x + Math.sin(a) * 3, head.y, head.z + Math.cos(a) * 3);
      const h = g.ballistics.ray(from, head.add(head.subtract(from).normalize().scale(0.5)), 169); // MASK.PLAYER_SHOT
      if (h.hit && h.target === r) best = { part: h.part, d: +h.point.subtract(head).length().toFixed(3) };
    }
    const hb = g.net.pvpBoxes.get(r.id);
    const bn = hb['bodyNode'];
    const hips = r.avatar.rig.hips.getAbsolutePosition();
    return { best, feetY: r.feet.y, head: [head.x, head.y, head.z].map((v) => +v.toFixed(3)), hips: [hips.x, hips.y, hips.z].map((v) => +v.toFixed(3)), bn: [bn.position.x, bn.position.y, bn.position.z].map((v) => +v.toFixed(3)), q: bn.rotationQuaternion && [bn.rotationQuaternion.x, bn.rotationQuaternion.y, bn.rotationQuaternion.z, bn.rotationQuaternion.w].map((v) => +v.toFixed(3)) };
  });
  let shot = await takeShot();
  for (let i = 0; i < 16 && !(shot.best && shot.best.part === 'head' && shot.best.d < 0.2); i++) {
    await wait(500);
    shot = await takeShot();
  }
  assert(shot.best && shot.best.part === 'head' && shot.best.d < 0.2, `a shot at the hanging client's head hits the head (${JSON.stringify(shot)})`);

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
