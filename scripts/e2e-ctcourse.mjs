// Marlow Yard (`ctcourse`, marlow-final): the co-op training course on two pages over
// `?net=local&autostart=ctcourse&mode=course` (the first tab hosts, the second joins). The runner (slice 0d) owns the
// shared helpers and the part dispatch; each set's steps live in `scripts/e2e-ctcourse/<set>.mjs` (owned by its set
// slice), called in route order. Between sets both players stand on the holding room's pad: the near door locks behind
// them, the far door unlocks on both pages and the course moves to the next set. Every part checks the join (both
// avatars drawn, the objective line); part 1 also the host-only pause restart at A1; part 4 ends with a revive in the
// cash dock and the both-in exit zone (G138). (slice 9, LD 15) After sets 1, 2, 6 and 8 the client is downed on the set's
// co-op surface (A1 yard, A2 staging, A6 gallery, A8 gallery) and revived from that level (`e2e-ctcourse/revive.mjs`);
// after every set the bay's ghost ledger (detections, alarms, knock-outs, kills, bodies) is logged (report only).
//
// `--part=N` runs one pair of sets (the runner runs the four as parallel jobs): 1 A1-A2, 2 A3-A4, 3 A5-A6, 4 A7-A8
// (SPEC 16). Named alone the suite runs all eight sets. A part after the first starts the course at its first set (the
// host session's `courseBay`, the lobby's "Start at"); every set still ends through its exit holding room, so the parts
// together cover the whole run.
//
// A set module exports `SET` (its id, e.g. 'a3OfficeRange') and `async function walk(t, n)`: `t` is the helper object
// below (`t.A` / `t.B` the host and client pages, `t.until`, `t.assert`, `t.moveHost`, `t.moveClient`, `t.use`, the
// team-move and jammer helpers, `t.point(id)` for the map's debug points, `t.stubWalk(n)` for an unbuilt set). The walk
// starts with the course at that set and must leave both players free to be moved onto the exit pad. The old bunker
// stations' steps (camera hallway, security room, laser and panel, throw, hang-down, scanners, rope) are in git at
// 5920cce5 (scripts/e2e-ctcourse.mjs) for the set slices to adapt.
import { launch, openPage, assert } from './e2e-lib.mjs';
import { until, waitSim, waitHostSim, setSimPages, NET_VIEWPORT, LOAD_MS, onHostStep, offHostStep, hostStepResult } from './e2e-net-lib.mjs';
import * as a1Gate from './e2e-ctcourse/a1Gate.mjs';
import * as a2CarriageShed from './e2e-ctcourse/a2CarriageShed.mjs';
import * as a3OfficeRange from './e2e-ctcourse/a3OfficeRange.mjs';
import * as a4GoodsShed from './e2e-ctcourse/a4GoodsShed.mjs';
import * as a5Substation from './e2e-ctcourse/a5Substation.mjs';
import * as a6PumpHouse from './e2e-ctcourse/a6PumpHouse.mjs';
import * as a7DataHall from './e2e-ctcourse/a7DataHall.mjs';
import * as a8Strongroom from './e2e-ctcourse/a8Strongroom.mjs';
import { SURFACES, reviveOn, freeRevive } from './e2e-ctcourse/revive.mjs';

const SETS = [a1Gate, a2CarriageShed, a3OfficeRange, a4GoodsShed, a5Substation, a6PumpHouse, a7DataHall, a8Strongroom];
const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
/** Revives done this run (each surface and the dock): the end screen's team count. */
let revivesDone = 0;
const Q = 'net=local&autostart=ctcourse&mode=course';
const PART = Number(process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? 0);
const GROUPS = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] };
const [FIRST, LAST] = GROUPS[PART] ?? [1, 8];

// (co-op test fix) `until` and the pauses are e2e-net-lib's: polled from Node (G13), timed on both pages' sim clocks
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

// ------------------------------------------------------------------------------------------------- shared helpers

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
    const ok = root.every(Number.isFinite) && r.isEnabled() && ms.length > 0 && info.every((i) => i.en && i.vis) && info.some((i) => i.size > 0.5);
    return { ok, root, lod: a.figure.current, n: ms.length, info };
  }, side);

/** Use a course item on page P as its own player would ('local' on the host: P1, marlow-bays item 2). */
const use = (P, id) =>
  P.evaluate((id) => {
    const it = window.__app.current.interactables?.items.find((i) => i.id === id);
    if (!it) return 'missing';
    if (!it.enabled) return 'disabled';
    it.onUse(it, 'local');
    return 'ok';
  }, id);
const hostDebug = () => GA(() => window.__course.debug());
async function moveHost(x, z, y = 0.1, yaw = Math.PI / 2) {
  await GA(([x, z, y, yaw]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [x, z, y, yaw]);
  await until(A, ([x, z]) => { const f = window.__course.state.feet; return Math.hypot(f[0] - x, f[2] - z) < 0.4; }, [x, z], 15000, `course sees the host at ${x}, ${z}`);
}
async function moveClient(x, z, y = 0.1, yaw = Math.PI / 2) {
  await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
  await GB(([x, z, y, yaw]) => { const g = window.__app.current; g.team.end(true); g.player.controller.teleport(new g.player.position.constructor(x, y, z), yaw); }, [x, z, y, yaw]);
  await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; const f = window.__course.state.feet; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4 && Math.hypot(f[3] - x, f[5] - z) < 0.4; }, [x, z], 15000, `host sees the client at ${x}, ${z}`);
}
/** The door list index of course door `cid` (the client's `course.wire.locks` lists locked indices). */
const doorIndex = (cid) => GA((cid) => { const g = window.__app.current; const aid = g.world.layout.course.doors[cid]; return g.world.doors.list.find((d) => d.anchor.id === aid).index; }, cid);
/** A map debug point by id (`A3-entry`, `L2`, `dock`): [x, y, z, yaw], or null. */
const point = (id) => GA((id) => { const p = window.__app.current.world.layout.debugPoints?.find((d) => d.id === id); return p ? [p.pos.x, p.pos.y, p.pos.z, p.yaw] : null; }, id);
/** This page's objective step line (the course HUD). */
const stepLine = (P) => P.evaluate(() => document.querySelector('.course-hud .ch-step')?.textContent ?? '');

// (B2) real buttons: the Co-op action is pad RB (5), B (1) crouches, Y (3) climbs up from a hang. A button is held until
// the page's own state shows it was seen (software GL runs a few frames a second; a short press can fall between polls)
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
const P5 = (P, b, v) => P.evaluate(([b, v]) => window.__pad.set(b, v), [b, v]);
async function crouch(P) {
  // (co-op test fix) wait to stand first: a player still crouched read as "crouches" before the B press landed
  await until(P, () => !window.__app.current.player.controller.crouched, null, 3000, 'stands before the crouch').catch(() => {});
  await holdUntil(P, 1, () => window.__app.current.player.controller.crouched, 'crouches');
  await waitSim(150);
}
/** The client crouches at (x, z) and offers, the host (0.8 m behind on -x, or at `from`) takes the leg-up: the host
 *  ends hanging on the lip in front of the client (4.3-4.5 m). */
async function legUp(x, z, what, from = [x - 0.8, z]) {
  await moveClient(x, z);
  await moveHost(from[0], from[1]);
  await waitSim(500);
  await padReady(B);
  await padReady(A);
  await crouch(B);
  await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', `${what}: the client offers a leg-up`);
  await until(A, () => !!window.__app.current.team.offer?.boost, null, 8000, `${what}: the host is offered the leg-up`);
  const boosts0 = await GA(() => window.__app.current.team.count.boosts);
  await holdUntil(A, RB, (n) => window.__app.current.team.count.boosts > n, `${what}: the host takes the leg-up`, boosts0);
  await until(A, () => window.__app.current.traversal.attach.phase === 'on' && window.__app.current.traversal.attach.anchor?.kind === 'ledge', null, 12000, `${what}: the host hangs on the ledge`);
  const top = await GA(() => window.__app.current.traversal.attach.anchor.top);
  assert(top >= 4.3 && top <= 4.5, `${what}: the leg-up reaches the 4.4 m lip (${top})`);
  await until(B, () => window.__app.current.team.state === 'none', null, 20000, `${what}: the booster is free again`);
}
/** The hanging player on page P pulls up onto the top. */
async function pullUp(P, what) {
  await holdUntil(P, 3, () => !window.__app.current.traversal.attached, `${what}: pulls up`);
  await until(P, () => window.__app.current.player.controller.grounded, null, 30000, `${what}: stands on top`);
}
// (B3) the held pistol jammer: draw the pistol (switch to it, then X), aim the camera at a device, LT then RB held
const dev = (P) => P.evaluate(() => window.__ctdev?.debug());
async function diagWeapons(P, e) {
  console.error(await P.evaluate(() => { const g = window.__app.current; const w = g.weapons; return JSON.stringify({ phase: w.drawPhase, cur: w.current.def.class, stowed: w.isStowed, ads: g.player.ads, att: g.traversal.attached }); }));
  throw e;
}
async function drawPistol(P) {
  await padReady(P);
  await P.evaluate(() => { const g = window.__app.current; g.weapons.switchTo(g.weapons.sidearmIndex); });
  await until(P, () => window.__app.current.weapons.current.def.class === 'pistol', null, 20000, 'the pistol is the current gun');
  await holdUntil(P, 2, () => window.__app.current.weapons.drawPhase === 2, 'the pistol is drawn').catch((e) => diagWeapons(P, e));
}
async function holster(P) {
  await holdUntil(P, 2, () => window.__app.current.weapons.drawPhase === 0, 'the pistol is holstered').catch((e) => diagWeapons(P, e));
}
/** Point the player's camera at a world point (the third-person camera sits off the eye: iterate). */
async function aimAt(P, x, y, z) {
  for (let k = 0; k < 4; k++) {
    await P.evaluate(([x, y, z]) => {
      const c = window.__app.current.player.cam;
      const p = c.camera.position;
      const dx = x - p.x, dy = y - p.y, dz = z - p.z;
      c.yaw = Math.atan2(dx, dz);
      c.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    }, [x, y, z]);
    await waitSim(120);
  }
}
// (anim-rework slice 1) the pistol aims with LT, the co-op button (RB) held fires the jammer; off lets go of RB first
const lt = async (P, on) => {
  if (!on) await P.evaluate(() => window.__pad.set(5, 0));
  await P.evaluate((on) => window.__pad.set(6, on ? 1 : 0), on);
  if (on) {
    await waitSim(300);
    await P.evaluate(() => window.__pad.set(5, 1));
  }
};

/**
 * The stub walk (slice 0d, every unbuilt set): both pages show the set's step line, both players step in at
 * `A<n>-entry` and walk on to `A<n>-mid`, and there both pages read the same baked light level (light parity) in the
 * lit band. The runner then moves them onto the exit pad.
 */
async function stubWalk(n) {
  const bay = `A${n}`;
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => /Cross to the next holding room|out to the cash dock/.test(document.querySelector('.course-hud .ch-step')?.textContent ?? ''), null, 15000, `${bay}: the ${tag} sees the set's step line`);
  const entry = await point(`${bay}-entry`);
  const mid = await point(`${bay}-mid`);
  assert(!!entry && !!mid, `${bay}: the map has its entry and middle points`);
  await moveHost(entry[0], entry[2], 0.1, entry[3]);
  await moveClient(entry[0] + 0.8, entry[2] + 0.8, 0.1, entry[3]);
  await moveHost(mid[0], mid[2], 0.1, entry[3]);
  await moveClient(mid[0] + 1.0, mid[2], 0.1, entry[3]);
  const field = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.lightField?.bodyLevel(x, 0, z, 1.7) ?? -1, [x, z]);
  const [la, lb] = [await field(A, mid[0], mid[2]), await field(B, mid[0], mid[2])];
  assert(la >= 0.4 && Math.abs(la - lb) < 0.01, `${bay}: the middle reads lit and the same on both pages (host ${la.toFixed(3)}, client ${lb.toFixed(3)})`);
}

/** Both onto the pad of set n's exit holding room: the near door locks behind, the far door unlocks on both pages and
 *  the course moves to set n + 1. */
async function throughHoldingRoom(n) {
  const i = n - 1;
  const a = await GA((i) => window.__app.current.world.layout.course.def.airlocks[i], i);
  const cx = (a.box[0] + a.box[2]) / 2;
  const cz = (a.box[1] + a.box[3]) / 2;
  await moveHost(cx - 0.6, cz - 0.6);
  await moveClient(cx + 0.6, cz + 0.6);
  await until(A, (b) => window.__course.debug().bay === b, n, 90000, `the course reaches set ${n + 1} (${a.id} cycled)`);
  const near = await doorIndex(a.nearDoor);
  const far = await doorIndex(a.farDoor);
  await until(B, ([nd, fd]) => window.__course.wire.locks.includes(nd) && !window.__course.wire.locks.includes(fd), [near, far], 15000, `the client sees ${a.nearDoor} locked and ${a.farDoor} open`);
}

/** The set helpers a set module's `walk(t, n)` gets. */
const t = {
  get A() {
    return A;
  },
  get B() {
    return B;
  },
  GA, GB, until, assert, waitSim, sleep: waitSim, use, hostDebug, moveHost, moveClient, doorIndex, point, stepLine,
  RB, holdUntil, padReady, P5, crouch, legUp, pullUp, dev, drawPistol, holster, aimAt, lt, avatarDrawn, stubWalk,
  // (load-audit, load-latent-net) host-clock windows and presses on the host's own fixed step (synced pairs)
  waitHostSim, onHostStep, offHostStep, hostStepResult,
};

/** (B8, G126) The finale in the cash dock: the client goes down and the host revives it inside the 30 s window. */
async function reviveInDock() {
  const dock = await point('dock');
  await moveHost(dock[0] - 3.4, dock[2] - 1);
  await moveClient(dock[0] - 2.8, dock[2] - 1);
  // (slice 9) the A8 gallery revive came first: free one of the team's two revives (a test hook, the rule unchanged)
  const used0 = await freeRevive(GA);
  const clientId = await GB(() => window.__coop.session.selfId);
  await GA((id) => {
    const g = window.__app.current;
    const r = g.net.remotes.get(id);
    const V = g.player.position.constructor;
    r.damageMul = 1;
    r.protectT = 0;
    r.applyDamage({ amount: 1000, point: r.feet.clone(), sourcePos: r.feet.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'explosion', attackerTeam: 'enemy', attackerId: '' });
  }, clientId);
  const hostT = () => GA(() => window.__app.current.time);
  const tDown = await hostT();
  await until(B, () => !window.__app.current.player.alive, null, 5000, 'finale: the client is down');
  await until(B, () => /DOWN - revive in \d+ s/.test(document.querySelector('.hud-down-timer')?.textContent ?? ''), null, 8000, 'finale: the downed client sees the revive countdown');
  // (load-latent-net) 2.5 s of the host's clock (the window runs there; `waitSim` counts the slower client clock, and
  // under load 3-5x more host time passed)
  const w8 = await waitHostSim(A, 2500);
  assert(w8 >= 2500, `finale: the pause ran 2.5 s on the host's clock (${w8.toFixed(0)} ms)`);
  const left = await GA((id) => window.__app.current.net.reviveClock.remaining(id), clientId);
  console.log(`  (finale: ${((await hostT()) - tDown).toFixed(2)} s of host time from the downing to the read)`);
  assert(left > 15 && left < 30, `finale: the 30 s window runs on the host (sim time) (${left.toFixed(1)} s left)`);
  await GA((id) => { const it = window.__app.current.interactables.items.find((i) => i.id === `revive-${id}`); it.onUse(it); }, clientId);
  await until(B, () => window.__app.current.player.alive, null, 8000, 'finale: the host revives the client inside 30 s');
  await until(B, () => getComputedStyle(document.querySelector('.hud-down-timer')).display === 'none', null, 8000, 'finale: the countdown is gone');
  const used = await GA(() => window.__app.current.net.reviveClock.used);
  assert(used === used0 + 1, `finale: one revive of two used (${used0} -> ${used})`);
  revivesDone++;
}

try {
  console.log('walk URL: host and client on Marlow Yard');
  await until(A, () => window.__coop?.session?.isHost === true, null, 30000, 'first tab hosts');
  // (the match starts once the client tab joins: the start set is set before it opens)
  if (FIRST > 1) await GA((n) => (window.__coop.session.courseBay = n), FIRST);
  const opened = await openPage(ctx, url, Q);
  B = opened.page;
  eB = opened.errors;
  setSimPages([A, B]);
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) await until(P, () => window.__app.current?.opts?.mode === 'course' && !!window.__app.current.net && window.__app.current.opts.map?.id === 'ctcourse', null, LOAD_MS, `${tag} in the ctcourse match`);
  pumpOn = true;
  await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state) && !!window.__course?.state, null, 20000, 'host course running');
  await until(B, () => !!window.__course?.wire, null, 30000, 'client has the course state');
  assert((await hostDebug()).bay === FIRST - 1, `the course starts at set ${FIRST}`);
  // a part starting past set 1 spawns at its bay: the spawn's 2 s protection ends at damageMul 1, so wait it out first
  // (as the restart step below does; S-e2e-fix.md)
  await waitSim(2200);
  await GA(() => { window.__app.current.target.damageMul = 0; });
  // (coop-fix) the joiner draws the host's character, and its objective line leaves "Connecting to host"
  await until(B, () => window.__app.current.net.avatars.size === 1, null, 10000, 'client has the host avatar');
  await until(B, () => window.__app.current.net.avatars.values().next().value.figure.current >= 0, null, 20000, 'host figure LOD shown on the client');
  const visB = await avatarDrawn(B, 'client');
  assert(visB.ok, `host avatar drawn on the client (${JSON.stringify(visB)})`);
  assert(visB.info.some((i) => i.inFrustum && i.active), `host avatar in the client camera's view (${JSON.stringify(visB)})`);
  const objB = await GB(() => window.__app.current.hud.objectiveText);
  assert(!/Connecting to host/.test(objB), `connecting label gone once in game (${objB})`);
  // (G339) Marlow Yard keeps its drill marker and pings but draws no minimap or compass, on either page
  for (const [P, tag] of [[A, 'host'], [B, 'client']]) assert(await P.evaluate(() => !document.querySelector('.hud-minimap, .minimap, .hud-compass')), `no minimap or compass (G339) on the ${tag}`);
  await until(A, () => window.__app.current.net.remotes.values().next().value.avatar.figure.current >= 0, null, 20000, 'client figure LOD shown on the host');
  const visA = await avatarDrawn(A, 'host');
  assert(visA.ok, `client avatar drawn on the host (${JSON.stringify(visA)})`);

  if (FIRST === 1) {
    // (marlow-bays items 3-4, A1-A2) the pause menu: the host has "Restart at checkpoint" and "Return to lobby"; the
    // client sees both disabled, "Host only"; the host's restart (a confirm opening on Stay) brings the client back too
    console.log('pause: restart at checkpoint (host only) brings both players back to the start');
    const rows = (P) => P.evaluate(() => ['restart-checkpoint', 'return-lobby'].map((k) => { const b = document.querySelector(`.pause-screen [data-key="${k}"]`); return b ? { k, blocked: b.classList.contains('blocked'), sub: b.querySelector('.btn-sub')?.textContent ?? '' } : { k, missing: true }; }));
    await GA(() => window.__app.current.pause());
    await GB(() => window.__app.current.pause());
    await waitSim(200);
    const ra = await rows(A);
    const rb = await rows(B);
    assert(ra.every((r) => !r.missing && !r.blocked), `the host's pause has live restart and lobby rows (${JSON.stringify(ra)})`);
    assert(rb.every((r) => !r.missing && r.blocked && r.sub === 'Host only'), `the client's pause shows them disabled, "Host only" (${JSON.stringify(rb)})`);
    await GB(() => document.querySelector('.pause-screen [data-key="restart-checkpoint"]').click());
    await waitSim(200);
    assert(await GB(() => !!window.__app.screens.top?.el.classList.contains('pause-screen')), "the client's disabled row does nothing");
    await GB(() => window.__app.screens.top.resume());
    const mid = await point('A1-mid');
    await moveClient(mid[0], mid[2]);
    await GA(() => { const b = document.querySelector('.pause-screen [data-key="restart-checkpoint"]'); window.__app.nav.focus(b); b.click(); });
    await waitSim(200);
    const dlg = await GA(() => ({ top: !!window.__app.screens.top?.el.classList.contains('dialog-screen'), f: window.__app.nav.focused?.textContent ?? '' }));
    assert(dlg.top && /Stay/.test(dlg.f), `the restart confirm opens on Stay (${JSON.stringify(dlg)})`);
    await GA(() => [...document.querySelectorAll('.dialog-buttons .btn')].find((b) => /Restart/.test(b.textContent)).click());
    const cp = await GA(() => { const p = window.__course.checkpointPos(); return [p.x, p.z]; });
    await until(B, ([x, z]) => { const p = window.__app.current.player.position; return Math.hypot(p.x - x, p.z - z) < 2.5; }, cp, 15000, 'the host restart brings the client back to the checkpoint');
    assert((await hostDebug()).bay === 0 && (await GA(() => !document.querySelector('.pause-screen'))), 'the restart keeps set 1 and closes the host pause');
    // the respawn's 2 s spawn protection ends at damageMul 1: the run keeps the host unhurt as before
    await waitSim(2200);
    await GA(() => { window.__app.current.target.damageMul = 0; });
  }

  for (let n = FIRST; n <= LAST; n++) {
    const mod = SETS[n - 1];
    console.log(`set ${n} (${mod.SET})`);
    await until(A, (b) => window.__course.debug().bay === b, n - 1, 15000, `the course is at set ${n}`);
    await mod.walk(t, n);
    const led = await GA((i) => { const s = window.__course.state.stats?.[i]; return s ? { detections: s.detections, alarms: s.alarms, knockouts: s.knockouts, kills: s.kills, bodies: s.bodies } : null; }, n - 1);
    console.log(`  (ghost ledger A${n} after the walk: ${JSON.stringify(led)})`);
    if (SURFACES[n]) revivesDone += await reviveOn(t, SURFACES[n]);
    if (n < 8) await throughHoldingRoom(n);
  }

  // (stealth-pays S1) an interrogation's code flag reaches the course state through the mode hook `revealIntel` calls
  // (`g.mode.onIntelCode`); the real grab-and-interrogate chain is e2e-takedown's `grab-interrogate-intel`
  {
    const r = await GA(() => {
      const m = window.__app.current.mode;
      const s = window.__course.state;
      const before = s.hasFlag('e2e-course-code');
      m.onIntelCode('e2e-course-code');
      m.onIntelCode('e2e-course-code');
      return { before, after: s.hasFlag('e2e-course-code') };
    });
    assert(!r.before && r.after, `stealth-pays: an interrogation code sets the course flag (${JSON.stringify(r)})`);
  }

  if (LAST === 8) {
    console.log('finale: a revive in the cash dock, then both must be in the exit zone');
    await reviveInDock();
    const z = await GA(() => window.__app.current.world.layout.course.def.exitZone.box);
    const zx = (z[0] + z[2]) / 2;
    const zz = (z[1] + z[3]) / 2;
    const dock = await point('dock');
    await moveHost(zx, zz);
    await moveClient(dock[0] - 3.4, dock[2] - 1);
    await waitSim(600);
    assert(!(await GA(() => window.__app.current.isEnded)), 'one player in the exit zone does not end the course');
    await moveClient(zx + 0.5, zz + 0.5);
    await until(A, () => window.__app.current.isEnded, null, 15000, 'the course ends with both in the zone');
    assert(true, 'both players in the exit zone complete the course');
    const sum = await GA(() => { const c = window.__app.current.stats.course; return c ? { time: c.team.time, alarms: c.team.alarms, revives: c.team.revives } : null; });
    assert(!!sum && sum.time > 0 && sum.revives === revivesDone, `the end screen has the time, alarms and revives (${JSON.stringify(sum)}, ${revivesDone} done)`);
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
console.log(`e2e-ctcourse${PART ? ` part ${PART} (sets ${FIRST}-${LAST})` : ''} OK`);
