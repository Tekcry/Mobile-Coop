// CT prototype B1: Marlow Yard (`ctcourse`), the CT training course, on two pages over `?net=local&autostart=ctcourse&mode=course`
// (the first tab hosts, the second joins). Both pages load the map; both walk (teleport) through the eight stations in
// order: station 1 read the three panels, then each station's gate opens and both pages see its door unlock (station 2:
// the real leg-up, station 5: leg-up + ledge relay onto the roof, then the roof plates; the others are still placeholder
// pair plates, hold consoles, the annex's grid lever), then both stand on the airlock pad and the course moves to the
// next bay. (B3) station 3 is the real camera (held jammer, jam and pass), station 4 has a real laser. At the end the course refuses with ONE player in the exit zone and completes only when BOTH are in it (G138).
import { launch, openPage, assert } from './e2e-lib.mjs';
import { until, waitSim, setSimPages, NET_VIEWPORT, LOAD_MS } from './e2e-net-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const PITCH = 22;
const Q = 'net=local&autostart=ctcourse&mode=course';
// (test-speed) `--part=N` runs one station group (the runner runs the three as parallel jobs, like e2e-desktop); named
// alone the suite runs all eight stations. A group after the first starts the course at its first bay (the host
// session's `courseBay`, the lobby's "Start at"); every station still goes through its exit airlock, so the parts
// together cover what the whole run does.
const PART = Number(process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? 0);
const GROUPS = { 1: [1, 3], 2: [4, 5], 3: [6, 8] };
const [FIRST, LAST] = GROUPS[PART] ?? [1, 8];

// (co-op test fix) `until` and the pauses are e2e-net-lib's: polled from Node (G13), timed on both pages' sim clocks
// (the sim runs slower than real time on software GL; a wall-clock timeout expired mid-move, e.g. station 2's leg-up)

const { browser, ctx, page: A, errors: eA } = await launch({ url, params: Q, viewport: NET_VIEWPORT });
let B = null;
let eB = [];
const GA = (f, a) => A.evaluate(f, a);
const GB = (f, a) => B.evaluate(f, a);

// the host page is in the background once the client page opens: a pump steps its sim headless (as e2e-course)
let pumpOn = false;
let pumping = false;
const pump = setInterval(async () => {
  if (!pumpOn || pumping) return;
  pumping = true;
  try {
    await A.evaluate(() => {
      if (window.__raf === undefined) {
        window.__raf = 0;
        const f = () => {
          window.__raf++;
          requestAnimationFrame(f);
        };
        requestAnimationFrame(f);
      }
      const now = performance.now();
      const last = window.__pumpT ?? now;
      const idle = window.__pumpRaf === window.__raf;
      window.__pumpT = now;
      window.__pumpRaf = window.__raf;
      if (idle && window.__app.current) window.__app.loop.stepHeadless(Math.min(0.1, Math.max(1 / 60, (now - last) / 1000)));
    });
  } catch {}
  pumping = false;
}, 40);

// (coop-fix) Is the partner's character drawn on page P: its meshes enabled and visible with real bounds and a finite
// root. On the client the camera first faces the host and two frames render, so it is also in the active meshes and
// the camera frustum (the camera is turned back after).
const avatarDrawn = (P, side) =>
  P.evaluate(async (side) => {
    const g = window.__app.current;
    const a = side === 'client' ? g.net.avatars.values().next().value : g.net.remotes.values().next().value.avatar;
    const c = g.player.cam;
    const was = [c.yaw, c.pitch];
    if (side === 'client') {
      c.yaw = Math.atan2(a.pos.x - g.player.position.x, a.pos.z - g.player.position.z);
      c.pitch = 0;
      await new Promise((r) => { requestAnimationFrame(() => requestAnimationFrame(r)); setTimeout(r, 3000); });
    }
    const cam = g.scene.activeCamera;
    const r = a.rig.root;
    r.computeWorldMatrix(true);
    const ms = a.figure.renderMeshes.filter((m) => m.isEnabled());
    const act = new Set(g.scene.getActiveMeshes().data);
    const info = ms.map((m) => {
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      return { en: m.isEnabled(), vis: m.isVisible && m.visibility > 0, active: act.has(m), inFrustum: cam.isInFrustum(m), size: bb.extendSizeWorld.length() };
    });
    const root = [r.position.x, r.position.y, r.position.z];
    if (side === 'client') [c.yaw, c.pitch] = was;
    const ok = root.every(Number.isFinite) && r.isEnabled() && ms.length > 0 && info.every((i) => i.en && i.vis) && info.some((i) => i.size > 0.5); // the body (about 1 m); small parts such as the lens are a few cm
    return { ok, root, lod: a.figure.current, n: ms.length, info };
  }, side);

const use = (P, id) =>
  P.evaluate((id) => {
    const it = window.__app.current.interactables?.items.find((i) => i.id === id);
    if (!it) return 'missing';
    if (!it.enabled) return 'disabled';
    it.onUse(it);
    return 'ok';
  }, id);
const hostDebug = () => GA(() => window.__course.debug());
async function moveHost(x, z, y = 0.1) {
  await GA(([x, z, y]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y, z), Math.PI / 2); }, [x, z, y]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `course sees the host at ${x}, ${z}`);
}
async function moveClient(x, z, y = 0.1) {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(([x, z, y]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y, z), Math.PI / 2); }, [x, z, y]);
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; const f = window.__course.state.feet; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4 && Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `host sees the client at ${x}, ${z}`);
}
const doorIndex = (cid) => GA((cid) => { const g = window.__app.current; const aid = g.world.layout.course.doors[cid]; return g.world.doors.list.find((d) => d.anchor.id === aid).index; }, cid);

// (B2) real buttons: the Co-op action is pad RB (5), B (1) crouches, Y (3) climbs up from a hang. A button is held until the
// page's own state shows it was seen (software GL runs a few frames a second; a short press can fall between polls).
const RB = 5;
async function holdUntil(P, btn, cond, what, arg, timeout = 20000) {
  await P.evaluate((b) => window.__pad.set(b, 1), btn);
  try {
    await until(P, cond, arg, timeout, what);
  } finally {
    await P.evaluate((b) => window.__pad.set(b, 0), btn);
  }
}
const padReady = (P) => P.evaluate(() => { window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); window.__app.current.player.controller.clearCrouchToggle(); });
async function crouch(P) {
  // (co-op test fix) a player still crouched from the last station (station 4 ends with the client landing crouched;
  // `padReady` clears the toggle but the body takes a moment to stand) read as "crouches" at once, the B press was let
  // go before it landed and the player then stood up: wait to stand first, then press
  await until(P, () => !window.__app.current.player.controller.crouched, null, 3000, 'stands before the crouch').catch(() => {});
  await holdUntil(P, 1, () => window.__app.current.player.controller.crouched, 'crouches');
  await waitSim(150);
}
/** The client crouches and offers, the host takes the leg-up: the host ends hanging on the ledge in front of the client. */
async function legUp(x, z, what) {
  await moveClient(x, z);
  await moveHost(x - 0.8, z);
  await waitSim(500);
  await padReady(B);
  await padReady(A);
  await crouch(B);
  await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', `${what}: the client offers a leg-up`).catch(async (e) => {
    console.error(await GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ prompt: g.team.prompt, st: g.team.state, crouched: c.crouched, grounded: c.grounded, ov: !!c.override, att: g.traversal.attached, pos: [c.pos.x, c.pos.y, c.pos.z] }); }));
    throw e;
  });
  await until(A, () => !!window.__app.current.team.offer?.boost, null, 8000, `${what}: the host is offered the leg-up`);
  const boosts0 = await GA(() => window.__app.current.team.count.boosts);
  await holdUntil(A, RB, (n) => window.__app.current.team.count.boosts > n, `${what}: the host takes the leg-up`, boosts0);
  await until(A, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, `${what}: the host hangs on the ledge`).catch(async (e) => {
    console.error(await GA(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, cnt: g.team.count, why: g.team.endWhy, att: g.traversal.attach.phase, kind: g.traversal.attach.anchor?.kind, ov: !!c.override, grounded: c.grounded, pos: [c.pos.x, c.pos.y, c.pos.z], alive: g.player.alive }); }));
    throw e;
  });
  const top = await GA(() => window.__app.current.traversal.attach.anchor.top);
  assert(top >= 4.3 && top <= 4.5, `${what}: the leg-up reaches the 4.4 m ledge (${top})`);
  await until(B, () => window.__app.current.team.state === 'none', null, 20000, `${what}: the booster is free again`);
}
/** The hanging host pulls up onto the top. */
async function pullUp(P, what) {
  await holdUntil(P, 3, () => !window.__app.current.traversal.attached, `${what}: pulls up`);
  await until(P, () => window.__app.current.player.controller.grounded, null, 30000, `${what}: stands on top`);
}

// (B3) the held pistol jammer: draw the pistol (switch to it, then X), aim the camera at a device, hold LT (pad 6)
const dev = (P) => P.evaluate(() => window.__ctdev?.debug());
async function drawPistol(P) {
  await padReady(P);
  await P.evaluate(() => { const g = window.__app.current; g.weapons.switchTo(g.weapons.sidearmIndex); });
  await until(P, () => window.__app.current.weapons.current.def.class === 'pistol', null, 20000, 'the pistol is the current gun');
  // hold X until the toggle registers (a slow software-GL frame with the real weapon meshes can span a 250 ms tap)
  await holdUntil(P, 2, () => window.__app.current.weapons.drawPhase === 2, 'the pistol is drawn').catch((e) => diagWeapons(P, e));
}
async function diagWeapons(P, e) {
  console.error(await P.evaluate(() => { const g = window.__app.current; const w = g.weapons; return JSON.stringify({ phase: w.drawPhase, cur: w.current.def.class, stowed: w.isStowed, ads: g.player.ads, wanted: g.player.adsWanted, att: g.traversal.attached, hidden: document.hidden, who: location.search }); }));
  throw e;
}
async function holster(P) {
  await holdUntil(P, 2, () => window.__app.current.weapons.drawPhase === 0, 'the pistol is holstered').catch((e) => diagWeapons(P, e));
}
/** Point the player's camera at a world point (the third-person camera sits off the eye: iterate). */
async function aimAt(P, x, y, z) {
  for (let k = 0; k < 4; k++) {
    await P.evaluate(([x, y, z]) => {
      const g = window.__app.current;
      const c = g.player.cam;
      const p = c.camera.position;
      const dx = x - p.x, dy = y - p.y, dz = z - p.z;
      c.yaw = Math.atan2(dx, dz);
      c.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    }, [x, y, z]);
    await waitSim(120);
  }
}
// (anim-rework slice 1, Michael 2026-10-20: "Another button - what makes sense? RF?") aiming alone no longer jams: the
// pistol aims with LT, then the co-op button (RB, pad 5) held fires the jammer; off lets go of RB first, then LT
const lt = async (P, on) => {
  if (!on) await P.evaluate(() => window.__pad.set(5, 0));
  await P.evaluate((on) => window.__pad.set(6, on ? 1 : 0), on);
  if (on) {
    await waitSim(300);
    await P.evaluate(() => window.__pad.set(5, 1));
  }
};
const sleep = (ms) => waitSim(ms);

/** Station 3: the camera. Seen it raises the alarm stage; the held jammer blinds it on both pages; jam and pass, then swap. */
async function station3(x0) {
  const CAM = [x0 + 8.6, 2.4, 7];
  await moveHost(x0 + 3, 5.5);
  await moveClient(x0 + 3, 8.5);
  await until(A, () => window.__ctdev?.alarm >= 1, null, 90000, 'station 3: the camera sees the pair and raises the alarm stage');
  const d0 = await dev(A);
  assert(d0.alarm >= 1 && d0.cams[0].mode === 'online', `station 3: the camera raised the alarm stage to ${d0.alarm} and the run goes on`);
  await until(B, () => window.__ctdev?.alarm >= 1, null, 8000, 'station 3: the client page knows the alarm stage');
  // (camera-cue) the vision cue is drawn while the camera works, on both pages, and pulses when the camera itself sees someone
  const cueOn = () => { const c = window.__ctdev.debug().cue[0]; return !!c && c.baked && c.tris > 0 && c.a === 1 && c.shown; };
  const cueOff = () => { const c = window.__ctdev.debug().cue[0]; return !!c && c.a === 0 && !c.shown && !c.seen; };
  await until(A, cueOn, null, 10000, 'station 3: the host draws the camera cue');
  await until(B, cueOn, null, 10000, 'station 3: the client draws the camera cue');
  await until(A, () => { const c = window.__ctdev.debug().cue[0]; return c.seen && c.pulse > 0; }, null, 30000, 'station 3: the cue pulses while the camera sees a player');
  // (camera-cue fix) the client derives the pulse itself (the host's sight test on both bodies, nothing sent)
  await until(B, () => { const c = window.__ctdev.debug().cue[0]; return c.seen && c.pulse > 0; }, null, 30000, 'station 3: the cue pulses on the client page too');
  await drawPistol(A);
  await drawPistol(B);
  // the host jams from where it stands (still), aiming at the camera
  await lt(A, true);
  await aimAt(A, ...CAM); // (anim-rework S1) aim once the aim camera is in
  await until(A, () => window.__ctdev.debug().jam[0] === 'cam-s3', null, 20000, 'station 3: the host jams the camera');
  await until(B, () => window.__ctdev.debug().cams[0].mode === 'off', null, 20000, 'station 3: the client page sees the camera blind');
  const dj = await dev(A);
  assert(dj.cams[0].mode === 'off' && dj.charge[0] < 20, `station 3: the jam blinds the camera and drains the charge (${dj.charge[0]})`);
  await until(A, cueOff, null, 3000, "station 3: the jammed camera's cue fades out (host)");
  await until(B, cueOff, null, 3000, "station 3: the jammed camera's cue fades out (client)");
  // the client crosses to the blind spot under it while it is blind
  const al = dj.alarm;
  await moveClient(x0 + 8.0, 7);
  await sleep(2500);
  const dc = await dev(A);
  assert(dc.alarm === al && dc.cams[0].mode === 'off', 'station 3: the client crosses to the blind spot without the camera reacting');
  // swap: the client jams from the pocket, the host lets go and walks over
  await lt(B, true);
  await aimAt(B, ...CAM); // (anim-rework S1) aim once the aim camera is in
  await until(A, () => window.__ctdev.debug().jam[1] === 'cam-s3', null, 20000, 'station 3: the client jams the camera (the host sees it)');
  await lt(A, false);
  await until(A, () => window.__ctdev.debug().jam[0] === '', null, 8000, 'station 3: the host lets go');
  assert((await dev(A)).cams[0].mode === 'off', 'station 3: the camera stays blind while the partner jams');
  await moveHost(x0 + 7.9, 6.2);
  await until(A, () => window.__course.debug().gates['g-s3'], null, 15000, 'station 3: both in the blind spot opens the gate');
  await lt(B, false);
  await until(A, () => window.__ctdev.debug().cams[0].mode === 'online', null, 8000, 'station 3: released, the camera sees again');
  await until(B, () => window.__ctdev.debug().cams[0].mode === 'online', null, 8000, 'station 3: the client page sees it online again');
  await until(A, cueOn, null, 5000, 'station 3: released, the cue fades back in (host)');
  await until(B, cueOn, null, 5000, 'station 3: released, the cue fades back in (client)');
  await holster(A);
  await holster(B);
}

/** Station 4: a laser touch costs health and never ends the run; the held jammer switches the laser off. */
async function laserTest(x0) {
  const hp = () => GB(() => window.__app.current.target.health.hp);
  const hp0 = await hp();
  await moveClient(x0 + 9 - 0.2, 7);
  await until(B, (h) => window.__app.current.target.health.hp < h, hp0, 20000, 'station 4: touching the laser costs the client health');
  const hp1 = await hp();
  assert(hp1 > 0 && hp0 - hp1 >= 10, `station 4: the touch cost health (${hp0} -> ${hp1}) and the run goes on`);
  assert((await dev(A)).hits >= 1, 'station 4: the host counted the touch');
  // the host jams the laser from a few metres back
  await moveClient(x0 + 5, 12.4);
  await moveHost(x0 + 4, 7);
  await drawPistol(A);
  await lt(A, true);
  await aimAt(A, x0 + 9, 0.9, 7); // (anim-rework S1) aim once the aim camera is in
  await until(A, () => window.__ctdev.debug().jam[0] === 'laser-s4', null, 20000, 'station 4: the host jams the laser');
  await until(B, () => window.__ctdev.debug().lasers[0].on === false, null, 8000, 'station 4: the client page sees the laser off');
  const hp2 = await hp();
  await moveClient(x0 + 9 - 0.2, 7);
  await sleep(3000);
  assert((await hp()) === hp2, 'station 4: no cost while the laser is jammed');
  await lt(A, false);
  await until(A, () => window.__ctdev.debug().lasers[0].on === true, null, 8000, 'station 4: released, the laser is on again');
  await until(B, () => window.__ctdev.debug().lasers[0].on === true, null, 8000, 'station 4: the client page sees it on again');
  await holster(A);
}

/**
 * Station 4 (B4): the partner throw. The host stands 1 m before the laser band and offers the throw (RB standing); the
 * client runs in and presses RB: it flies over the beams (no touch), lands crouched on the far side, presses the release
 * there; the band goes off on both pages and the host walks through the beam line without a touch.
 */
async function throwOver(x0) {
  const hp = () => GB(() => window.__app.current.target.health.hp);
  await moveClient(x0 + 6.8, 7);
  await moveHost(x0 + 8, 7);
  await sleep(500);
  await padReady(A);
  await padReady(B);
  const hp0 = await hp();
  const hits0 = (await dev(A)).hits;
  await holdUntil(A, RB, () => window.__app.current.team.state === 'throwOffer', 'station 4: the standing host offers the throw');
  await until(B, () => !!window.__app.current.team.offer?.toss, null, 8000, 'station 4: the client is offered the throw');
  const prompt = await GB(() => window.__app.current.team.prompt);
  assert(/throw/i.test(prompt ?? ''), `station 4: the prompt names the move (${prompt})`);
  await holdUntil(B, RB, () => window.__app.current.team.count.throws >= 1, 'station 4: the client is thrown').catch(async (e) => {
    console.error(await GB(() => { const g = window.__app.current; return JSON.stringify({ st: g.team.state, room: g.team.lastThrowRoom, denied: g.team.lastDenied, prompt: g.team.prompt }); }));
    throw e;
  });
  // both views: the client's own arc and the host's view of it go over the beams (feet above the top beam at the line)
  let ownMax = 0;
  let hostMax = 0;
  // (test-speed) the landing deadline is the client's sim time (20 s of game), with a 200 s wall guard
  const t0 = Date.now();
  const s0 = await GB(() => window.__app.current.time);
  for (;;) {
    const [own, st] = await GB(() => { const g = window.__app.current; const c = g.player.controller; return [[c.pos.x, c.pos.y], g.team.state]; });
    const seen = await GA(() => { const r = window.__app.current.net.remotes.values().next().value; return [r.feet.x, r.feet.y]; });
    if (Math.abs(own[0] - (x0 + 9)) < 0.5) ownMax = Math.max(ownMax, own[1]);
    if (Math.abs(seen[0] - (x0 + 9)) < 0.6) hostMax = Math.max(hostMax, seen[1]);
    if (st === 'none' && own[0] > x0 + 10) break;
    if ((await GB(() => window.__app.current.time)) - s0 > 20 || Date.now() - t0 > 200000) throw new Error(`station 4: the throw did not land (${st}, ${own})`);
    await sleep(30);
  }
  await until(B, () => window.__app.current.player.controller.grounded, null, 8000, 'station 4: the client lands on its feet');
  const land = await GB(() => { const g = window.__app.current; const c = g.player.controller; return { x: c.pos.x, y: c.pos.y, crouched: c.crouched, room: g.team.lastThrowRoom }; });
  assert(land.x > x0 + 10 && land.x < x0 + 12.5 && Math.abs(land.y) < 0.3 && land.crouched, `station 4: the client lands crouched past the beams (${JSON.stringify(land)})`);
  assert(ownMax > 1.45 || ownMax === 0, `station 4: the client's own arc clears the top beam at the line (${ownMax.toFixed(2)})`);
  console.log(`  arc at the beam line: client ${ownMax.toFixed(2)} m, host view ${hostMax.toFixed(2)} m`);
  await sleep(600);
  assert((await hp()) === hp0 && (await dev(A)).hits === hits0, 'station 4: the thrown client touched no beam');
  await until(A, () => window.__app.current.team.state === 'none', null, 8000, 'station 4: the thrower is free again');
  // the far-side release
  assert((await dev(A)).lasers[0].on === true, 'station 4: the band is still on before the release');
  await moveClient(x0 + 12, 12.8);
  assert((await use(B, 'c-sw-s4-release')) === 'ok', 'station 4: the client presses the far-side release');
  await until(A, () => window.__course.debug().gates['g-s4'], null, 8000, 'station 4: the release gate is done');
  await until(A, () => window.__ctdev.debug().lasers[0].on === false, null, 8000, 'station 4: the host sees the band off');
  await until(B, () => window.__ctdev.debug().lasers[0].on === false, null, 8000, 'station 4: the client page sees the band off');
  // the host walks through the beam line: no touch
  await moveHost(x0 + 9, 7);
  await sleep(2500);
  assert((await dev(A)).hits === hits0, 'station 4: the host walks through the released band without a touch');
  await moveHost(x0 + 11, 7);
}

/** (B5) The hang-down at station 5: the host crouches at the roof hatch and offers, the client is lowered head-first
 *  through it; the host's stick lowers them to the hack panel; the client presses A on it (the grid opens); the client
 *  presses Co-op and is pulled back up onto the roof. */
async function hangDown(x0) {
  const hatchZ1 = 1.55;
  const hx = x0 + 14.4;
  await GA(([x, z]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, 4.5, z), Math.PI); }, [hx, hatchZ1 + 0.45]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [hx, hatchZ1 + 0.45], 15000, 'course sees the host at the hatch');
  await moveClient(hx, hatchZ1 + 1.4, 4.5);
  await waitSim(500);
  await padReady(A);
  await padReady(B);
  await crouch(A);
  await holdUntil(A, RB, () => window.__app.current.team.state === 'hangOffer', 'station 5: the host offers the hang-down at the hatch').catch(async (e) => {
    console.error(await GA(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ prompt: g.team.prompt, st: g.team.state, crouched: c.crouched, yaw: c.yaw, pos: [c.pos.x, c.pos.y, c.pos.z] }); }));
    throw e;
  });
  await until(B, () => !!window.__app.current.team.offer?.hang, null, 8000, 'station 5: the client is offered the hang-down');
  const prompt = await GB(() => window.__app.current.team.prompt);
  assert(/hang-down/.test(prompt ?? ''), `station 5: the client's prompt names the move (${prompt})`);
  await holdUntil(B, RB, () => window.__app.current.team.count.hangs >= 1, 'station 5: the client takes the hang-down');
  await until(B, () => window.__app.current.team.state === 'hanging', null, 15000, 'station 5: the client hangs head-first in the hatch');
  await until(A, () => window.__app.current.team.state === 'hangHold', null, 8000, 'station 5: the host holds');
  const hi = await GB(() => { const g = window.__app.current; return { y: g.player.controller.pos.y, tumble: g.player.pose.tumble, near: g.interactables?.nearest(g.player.position)?.id ?? '' }; });
  assert(hi.y > 2.8 && hi.y < 4.4 && hi.tumble > 3, `station 5: the client hangs head-first under the roof (root y ${hi.y.toFixed(2)}, tumble ${hi.tumble.toFixed(2)})`);
  assert(hi.near !== 'c-sw-s5-hack', 'station 5: the panel is out of reach at the starting height');
  // the remote views: the host sees the client hanging turned over, the client sees the host holding
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; const mv = r.state?.mv; return mv?.m === 'boost' && (mv.sub & 2) !== 0 && r.feet.y > 2.5 && r.feet.y < 4.4; }, null, 8000, 'station 5: the host sees the client hanging');
  await until(B, () => window.__app.current.net.teamMates().some((m) => m.mode === 'brace' && (m.sub & 2) !== 0), null, 8000, 'station 5: the client sees the host holding');
  // the holder's stick lowers the partner (stick down)
  await A.evaluate(() => window.__pad.axis(1, 1));
  try {
    await until(B, () => window.__app.current.interactables?.nearest(window.__app.current.player.position)?.id === 'c-sw-s5-hack', null, 20000, 'station 5: the holder lowers the client to the panel');
  } finally {
    await A.evaluate(() => window.__pad.axis(1, 0));
  }
  const d = await GA(() => window.__app.current.team.hang.depth);
  assert(d > 2.2 && d <= 2.5, `station 5: lowered to ${d.toFixed(2)} m under the edge`);
  // A on the panel, hanging
  await B.evaluate(() => window.__pad.set(0, 1));
  try {
    await until(A, () => window.__course.debug().gates['g-s5-grid'], null, 10000, 'station 5: the hanging client hacks the panel (A), the grid opens');
  } finally {
    await B.evaluate(() => window.__pad.set(0, 0));
  }
  // pulled back up (the client's Co-op)
  await holdUntil(B, RB, () => window.__app.current.team.count.pulls >= 1, 'station 5: the client is pulled back up');
  await until(A, () => window.__app.current.team.state === 'none', null, 8000, 'station 5: the holder is free');
  const up = await GB(() => { const g = window.__app.current; return { y: g.player.controller.pos.y, tumble: g.player.pose.tumble, st: g.team.state }; });
  assert(up.y > 4.2 && up.tumble === 0 && up.st === 'none', `station 5: the client is back on the roof, upright (y ${up.y.toFixed(2)})`);
}

/**
 * (B7) Station 7: the two-person rope. The client boosts the host onto the 4.4 m wall (no door, nobody left below to boost
 * the client); the host stands on top facing back and drops the rope (real RB); the client takes it at the foot (RB) and
 * climbs (stick up); the host lets go part way (RB) and the client slides down safely; again, and the client climbs to the
 * top and tops out beside the host; both go on over the far side.
 */
async function station7(x0) {
  await legUp(x0 + 8.0, 3, 'station 7');
  await pullUp(A, 'station 7 host');
  // the host on the wall top facing back down at the client (yaw -PI/2 = -x), standing
  const hx = x0 + 8.8;
  await GA(([x, z]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, 4.5, z), -Math.PI / 2); }, [hx, 3]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4 && f[1] > 4.2; }, [hx, 3], 15000, 'course sees the host on the wall top');
  await moveClient(x0 + 7.6, 3);
  await waitSim(500);
  await padReady(A);
  await padReady(B);
  const offer = async (what) => {
    await holdUntil(A, RB, () => window.__app.current.team.state === 'ropeOffer', `station 7: the host drops the rope (${what})`).catch(async (e) => {
      console.error(await GA(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ prompt: g.team.prompt, st: g.team.state, crouched: c.crouched, grounded: c.grounded, yaw: c.yaw, pos: [c.pos.x, c.pos.y, c.pos.z] }); }));
      throw e;
    });
    await until(B, () => !!window.__app.current.team.offer?.rope, null, 8000, `station 7: the client is offered the rope (${what})`);
    const n0 = await GB(() => window.__app.current.team.count.ropes);
    await holdUntil(B, RB, (n) => window.__app.current.team.count.ropes > n, `station 7: the client takes the rope (${what})`, n0).catch(async (e) => {
      console.error(await GB(() => { const g = window.__app.current; return JSON.stringify({ prompt: g.team.prompt, st: g.team.state, denied: g.team.lastDenied, cnt: g.team.count }); }));
      throw e;
    });
    await until(A, () => window.__app.current.team.state === 'ropeHold', null, 8000, `station 7: the host holds the rope (${what})`);
  };
  await offer('first');
  const prompt = await GB(() => window.__app.current.team.prompt);
  assert(/rope/i.test(prompt ?? ''), `station 7: the climber's prompt names the rope (${prompt})`);
  // part way up, then the holder lets go: the climber slides down to the floor (never stranded)
  await B.evaluate(() => window.__pad.axis(1, -1));
  try {
    await until(B, () => window.__app.current.player.controller.pos.y > 1.2, null, 30000, 'station 7: the client climbs the rope');
  } finally {
    await B.evaluate(() => window.__pad.axis(1, 0));
  }
  await until(A, () => { const r = window.__app.current.net.remotes.values().next().value; const mv = r.state?.mv; return mv?.m === 'boost' && (mv.sub & 4) !== 0 && r.feet.y > 0.8; }, null, 8000, 'station 7: the host sees the client on the rope');
  await holdUntil(A, RB, () => window.__app.current.team.state === 'none', 'station 7: the host lets go of the rope');
  await until(B, () => window.__app.current.team.count.slides >= 1 && window.__app.current.team.state === 'none', null, 20000, 'station 7: the client slides down safely');
  const down = await GB(() => { const g = window.__app.current; return { y: g.player.controller.pos.y, hp: g.target.health.hp, alive: g.player.alive }; });
  assert(down.y < 0.3 && down.alive, `station 7: let go, the client is back on the floor unharmed (y ${down.y.toFixed(2)})`);
  // again, all the way up: tops out beside the holder
  await waitSim(1200);
  await padReady(A);
  await padReady(B);
  await offer('second');
  // (test-speed) the stick lets go on the step the climber tops out (the page's own fixed step), not when the next poll
  // from here sees it: under load that was a second of game time later, and the client walked on off the far side
  await B.evaluate(() => {
    const st = window.__app.current;
    const t0 = st.team.count.tops;
    const orig = st.fixedUpdate.bind(st);
    st.fixedUpdate = (dt) => {
      orig(dt);
      if (st.team.count.tops > t0) {
        window.__pad.axis(1, 0);
        st.fixedUpdate = orig;
      }
    };
    window.__pad.axis(1, -1);
  });
  try {
    await until(B, () => window.__app.current.team.count.tops >= 1, null, 40000, 'station 7: the client climbs to the top and tops out').catch(async (e) => {
      console.error(await GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, cnt: g.team.count, why: g.team.endWhy, rope: g.team.rope, pos: [c.pos.x, c.pos.y, c.pos.z] }); }));
      throw e;
    });
  } finally {
    await B.evaluate(() => window.__pad.axis(1, 0));
  }
  await until(A, () => window.__app.current.team.state === 'none', null, 8000, 'station 7: the holder is free once the partner is up');
  await waitSim(400);
  const up = await GB(() => { const g = window.__app.current; const c = g.player.controller; return { y: c.pos.y, x: c.pos.x, st: g.team.state }; });
  assert(up.y > 4.2 && up.st === 'none', `station 7: the client stands on the wall top beside the holder (y ${up.y.toFixed(2)})`);
  console.log(`  rope: client topped out at x ${up.x.toFixed(2)} y ${up.y.toFixed(2)}`);
}

/**
 * (B6) Station 6: the paired scanners. Both at their panels light the ready lights on both pages. A late hack (the client
 * starts only once the host's is ready) resets both and costs the client health; then both start together and the door opens.
 */
async function station6(x0) {
  await moveHost(x0 + 5, 1.6);
  await moveClient(x0 + 5, 12.4);
  await until(A, () => window.__ctdev.debug().scan?.ready, null, 8000, 'station 6: both at their scanners light the ready light');
  await until(B, () => window.__ctdev.debug().scan?.occ === 3, null, 8000, 'station 6: the client page shows the ready light');
  const hp = () => GB(() => window.__app.current.target.health.hp);
  const hp0 = await hp();
  assert((await use(A, 'c-sw-s6-a')) === 'ok', 'station 6: the host starts the hack at scanner A');
  await until(B, () => window.__ctdev.debug().scan.ph[0] === 'hacking', null, 8000, 'station 6: the client page sees scanner A hacking');
  // (test-speed) the late press goes in on the client's own frame that first sees scanner A ready, not after polls from
  // here (the sync window is 1.5 s of game time; under load the polls took longer, the window ran out and the press
  // counted as a lone start, "-1:alone", with no cost)
  await GB(() => {
    window.__s6 = { ready: false, use: '' };
    const f = () => {
      if (window.__ctdev?.debug().scan?.ph[0] === 'ready') {
        window.__s6.ready = true;
        const it = window.__app.current.interactables?.items.find((i) => i.id === 'c-sw-s6-b');
        window.__s6.use = !it ? 'missing' : !it.enabled ? 'disabled' : (it.onUse(it), 'ok');
      } else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  await until(A, () => window.__ctdev.debug().scan.ph[0] === 'ready', null, 15000, 'station 6: the host hack finishes (ready)');
  await until(B, () => window.__s6.ready, null, 8000, 'station 6: the client page sees scanner A ready');
  assert((await GB(() => window.__s6.use)) === 'ok', 'station 6: the client starts late');
  await until(B, (h) => window.__app.current.target.health.hp < h, hp0, 20000, 'station 6: the late hack costs the client health').catch(async (e) => {
    // (test-speed) failed once under load (part 3, 2026-10-20): the scanners' state and both hp at the timeout
    console.error(JSON.stringify({ host: (await dev(A)).scan, client: await GB(() => ({ hp: window.__app.current.target.health.hp, scan: window.__ctdev?.debug().scan })), hp0 }));
    throw e;
  });
  const hp1 = await hp();
  const d1 = (await dev(A)).scan;
  assert(d1.fails >= 1 && !(await GA(() => window.__course.debug().gates['g-s6'])), `station 6: out of sync, the door stays shut (${d1.last})`);
  assert(hp1 > 0 && hp0 - hp1 >= 9 && hp0 - hp1 <= 10, `station 6: the failed hack cost ${hp0 - hp1} HP (${hp0} -> ${hp1}), the run goes on`);
  await until(A, () => { const s = window.__ctdev.debug().scan; return s.ph[0] === 'idle' && s.ph[1] === 'idle'; }, null, 8000, 'station 6: both scanners reset (host)');
  await until(B, () => { const s = window.__ctdev.debug().scan; return s.ph[0] === 'idle' && s.ph[1] === 'idle'; }, null, 8000, 'station 6: both scanners reset (client page)');
  const [ra, rb] = await Promise.all([use(A, 'c-sw-s6-a'), use(B, 'c-sw-s6-b')]);
  assert(ra === 'ok' && rb === 'ok', `station 6: both start the hacks together (${ra}, ${rb})`);
  await until(A, () => window.__course.debug().gates['g-s6'], null, 15000, 'station 6: both hacks inside the window open the door');
  await until(B, () => { const s = window.__ctdev.debug().scan; return s.ph[0] === 'done' && s.ph[1] === 'done'; }, null, 8000, 'station 6: the client page sees both scanners done');
  assert((await hp()) >= hp1, 'station 6: the synced hack cost nothing');
}

/** Open a station's gate (B2: the leg-up wall and the relay roof are real; the rest are placeholders): plates A (host, south wall) and B (client, north wall), or a held console. */
async function openGate(n, i) {
  const x0 = PITCH * i;
  const door = `S${n}-door`;
  if (n === 2) {
    // the real wall (4.4 m, bolted door): the client boosts the host, the host crosses and unbolts the door from the far side
    await legUp(x0 + 8.0, 3, 'station 2');
    await pullUp(A, 'station 2 host');
    const topY = await GA(() => window.__app.current.player.controller.pos.y);
    assert(topY > 4.2, `station 2: the host stands on the wall top (${topY})`);
    await moveHost(x0 + 10.2, 7);
    const nearPress = await use(B, 'c-g-s2');
    assert(nearPress === 'ok', 'station 2: the client tries the bolt from the near side');
    assert(!(await GA(() => window.__course.debug().gates['g-s2'])), 'station 2: the bolt refuses a press from the near side');
    assert((await use(A, 'c-g-s2')) === 'ok', 'station 2: the host unbolts the door from the far side');
    await until(A, () => window.__course.debug().gates['g-s2'], null, 8000, 'station 2: the bolt gate opens');
    await moveClient(x0 + 7.5, 7);
  } else if (n === 5) {
    // the roof: leg-up one, relay the other, both press the roof plates together
    await legUp(x0 + 8.0, 3.6, 'station 5');
    const lipId = await GA(() => window.__app.current.traversal.attach.anchor.id);
    await moveClient(x0 + 8.0, 3.6);
    await waitSim(400);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'relayOffer', 'station 5: the hanging host offers the relay');
    await until(B, () => !!window.__app.current.team.offer?.relay, null, 8000, 'station 5: the client is offered the relay');
    await holdUntil(B, RB, () => window.__app.current.team.count.ladders >= 1, 'station 5: the client climbs the relay');
    await until(B, (id) => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.id === id, lipId, 40000, 'station 5: the client hangs on the same ledge').catch(async (e) => {
      console.error(await GB(() => { const g = window.__app.current; const c = g.player.controller; return JSON.stringify({ st: g.team.state, cnt: g.team.count, why: g.team.lastDenied, endWhy: g.team.endWhy, att: g.traversal.attach.phase, aid: g.traversal.attach.anchor?.id, ov: !!c.override, grounded: c.grounded, pos: [c.pos.x, c.pos.y, c.pos.z], alive: g.player.alive, prompt: g.team.prompt }); }));
      console.error(await GA(() => { const g = window.__app.current; const a = g.traversal.attach; return JSON.stringify({ aid: a.anchor?.id, s: a.s, len: a.anchor?.len, top: a.anchor?.top }); }));
      throw e;
    });
    await until(A, () => window.__app.current.team.state === 'none' && window.__app.current.traversal.attached, null, 8000, 'station 5: the host is free and still hanging');
    await pullUp(A, 'station 5 host');
    await pullUp(B, 'station 5 client');
    await moveHost(x0 + 11, 3.6, 4.5);
    await moveClient(x0 + 11, 10.4, 4.5);
    const [ra, rb] = await Promise.all([use(A, 'c-sw-s5-a'), use(B, 'c-sw-s5-b')]);
    assert(ra === 'ok' && rb === 'ok', `station 5: both roof plates pressed (${ra}, ${rb})`);
    await until(A, () => window.__course.debug().gates['g-s5'], null, 8000, 'station 5: the roof pair gate opens');
  } else if (n === 3) {
    await station3(x0);
  } else if (n === 4) {
    await laserTest(x0);
    await throwOver(x0);
    return;
  } else if (n === 7) {
    // (B7) the rope wall has no door: the airlock waits for both
    await station7(x0);
    return;
  } else if (n === 6) {
    // (B6) the paired scanners: a late hack fails with a health cost, then both in sync open the door
    await station6(x0);
  } else if (n === 8) {
    // (B8) the final beat: no console, no door; a downed client is revived by the host inside the 30 s window
    await station8(x0);
    return;
  } else {
    await moveHost(x0 + 5, 1.6);
    await moveClient(x0 + 5, 4);
    assert((await use(A, `c-h-s${n}`)) === 'ok', `station ${n}: the host holds the console`);
    await until(A, (g) => window.__course.debug().gates[g], `g-s${n}`, 8000, `station ${n} hold gate opens`);
  }
  if (n === 5) await hangDown(x0);
  const di = await doorIndex(door);
  await until(B, (i) => !window.__course.wire.locks.includes(i), di, 8000, `client sees ${door} unlock`);
}

/**
 * (B8, G126) Station 8: the doorway is open (no console, no door). The client goes down; its HUD counts the 30 s
 * revive window down; the host revives it inside the window; the revive counts on the course tally.
 */
async function station8(x0) {
  assert(!(await GA(() => 'c-h-s8' in (window.__course.layout.devices ?? {}))), 'station 8: no placeholder console');
  await moveHost(x0 + 6, 7);
  await moveClient(x0 + 6.6, 7);
  const clientId = await GB(() => window.__coop.session.selfId);
  await GA((id) => {
    const g = window.__app.current;
    const r = g.net.remotes.get(id);
    const V = g.player.position.constructor;
    r.damageMul = 1;
    r.protectT = 0;
    r.applyDamage({ amount: 1000, point: r.feet.clone(), sourcePos: r.feet.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'explosion', attackerTeam: 'enemy', attackerId: '' });
  }, clientId);
  await until(B, () => !window.__app.current.player.alive, null, 5000, 'station 8: the client is down');
  await until(B, () => /DOWN - revive in \d+ s/.test(document.querySelector('.hud-down-timer')?.textContent ?? ''), null, 8000, 'station 8: the downed client sees the revive countdown');
  await waitSim(2500);
  const left = await GA((id) => window.__app.current.net.reviveClock.remaining(id), clientId);
  assert(left > 15 && left < 30, `station 8: the 30 s window runs on the host (sim time) (${left.toFixed(1)} s left)`);
  await GA((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === `revive-${id}`); it.onUse(it); }, clientId);
  await until(B, () => window.__app.current.player.alive, null, 8000, 'station 8: the host revives the client inside 30 s');
  await until(B, () => getComputedStyle(document.querySelector('.hud-down-timer')).display === 'none', null, 8000, 'station 8: the countdown is gone');
  const used = await GA(() => window.__app.current.net.reviveClock.used);
  assert(used === 1, `station 8: one revive of two used (${used})`);
}

/** Both onto the airlock pad after bay index i: the course moves to bay i + 1. */
async function throughAirlock(i) {
  const x = PITCH * i + 19;
  await moveHost(x, 6.5);
  await moveClient(x, 7.6);
  await until(A, (b) => window.__course.debug().bay === b, i + 1, 90000, `the course reaches station ${i + 2}`);
}

try {
  console.log('walk URL: host and client on Marlow Yard');
  await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
  // (the match starts once the client tab joins: the start bay is set before it opens)
  if (FIRST > 1) await GA((n) => (window.__coop.session.courseBay = n), FIRST);
  const opened = await openPage(ctx, url, Q);
  B = opened.page;
  eB = opened.errors;
  setSimPages([A, B]);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'ctcourse', null, LOAD_MS, `${tag} in the ctcourse match`);
  pumpOn = true;
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 20000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 30000, 'client has the course state');
  assert((await hostDebug()).bay === FIRST - 1, `the course starts at station ${FIRST}`);
  await GA(() => { window.__app.current.target.damageMul = 0; });
  // (coop-fix) the joiner draws the host's character, and its objective line leaves "Connecting to host" (Marlow Yard
  // sets no objective: the host's empty one must still replace the placeholder)
  await until(B, () => window.__app.current.net.avatars.size === 1, null, 10000, 'client has the host avatar');
  await until(B, () => window.__app.current.net.avatars.values().next().value.figure.current >= 0, null, 20000, 'host figure LOD shown on the client');
  const visB = await avatarDrawn(B, 'client');
  assert(visB.ok, `host avatar drawn on the client (${JSON.stringify(visB)})`);
  assert(visB.info.some((i) => i.inFrustum && i.active), `host avatar in the client camera's view (${JSON.stringify(visB)})`);
  const objB = await GB(() => window.__app.current.hud.objectiveText);
  assert(!/Connecting to host/.test(objB), `connecting label gone once in game (${objB})`);
  await until(A, () => window.__app.current.net.remotes.values().next().value.avatar.figure.current >= 0, null, 20000, 'client figure LOD shown on the host');
  const visA = await avatarDrawn(A, 'host');
  assert(visA.ok, `client avatar drawn on the host (${JSON.stringify(visA)})`);

  if (FIRST === 1) {
    console.log('station 1: one optional panel; the client reads it, the host skips it, nobody is gated');
    await moveClient(3.5, 12.4);
    assert((await use(B, 'c-sw-p1')) === 'ok', 'the client reads the station 1 panel');
    assert((await hostDebug()).bay === 0, 'reading a panel does not move the course on');
    await throughAirlock(0);
  }

  for (let n = Math.max(2, FIRST); n <= LAST; n++) {
    const i = n - 1;
    console.log(`station ${n}: ${n === 8 ? 'final beat (B8): revive, then both in the exit zone' : [2, 3, 4, 5, 6, 7].includes(n) ? 'real moves' : 'placeholder gate'}`);
    if (n === 7) console.log('  (B7) leg-up, the two-person rope: let go part way (slide down), then climbed to the top');
    if (n === 5) console.log('  (B5) leg-up, relay, roof plates, then the hang-down through the hatch: hack the panel, pulled back up');
    if (n === 4) console.log('  (B4) laser touch, jammer, then the partner throw over the band and the far-side release');
    await openGate(n, i);
    if (n < 8) await throughAirlock(i);
  }

  if (LAST === 8) {
    console.log('exit zone: both must be in it');
    const zx = PITCH * 7 + 13.5;
    await moveHost(zx, 7);
    await moveClient(PITCH * 7 + 12, 1.5);
    await waitSim(600);
    assert(!(await GA(() => window.__app.current.isEnded)), 'one player in the exit zone does not end the course');
    await moveClient(zx + 0.5, 6);
    await until(A, () => window.__app.current.isEnded, null, 15000, 'the course ends with both in the zone');
    assert(true, 'both players in the exit zone complete the course');
    const sum = await GA(() => { const c = window.__app.current.stats.course; return c ? { time: c.team.time, alarms: c.team.alarms, revives: c.team.revives } : null; });
    assert(!!sum && sum.time > 0 && sum.revives === 1, `the end screen has the time, alarms and revives (${JSON.stringify(sum)})`);
  }

  const errs = [...eA, ...eB].filter((e) => !/WebGL|GPU stall|swiftshader|Trystero|Nostr|ERR_|favicon/i.test(e));
  assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
} catch (e) {
  console.error(e);
  try {
    console.error('host', JSON.stringify(await hostDebug()));
    if (B) console.error('client', JSON.stringify(await GB(() => window.__course?.debug?.())));
  } catch {}
  failed = true;
}
clearInterval(pump);
await browser.close();
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log(`e2e-ctcourse${PART ? ` part ${PART} (stations ${FIRST}-${LAST})` : ''} OK`);
