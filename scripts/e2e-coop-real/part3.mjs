// e2e-coop-real part 3 (coop-real C2, PLAN slice row "C2 part 3"): R7, the client's tab life, input only.
// Route: Marlow Yard A1 by input (the host's leg-up for the client, the client's climb, hang-drop and yard-side unbolt,
// the wicket, both through L1's airlock), both into A2 (the host leads, > 10 m in). Then on the client page:
//   B1 hidden 5 s (< netdrop): window minimized + `document.hidden` (H1-REPORT "Lifecycle probe", probe 2 pick);
//   B2 frozen past netdrop (CDP `Debugger.pause`: main thread, timers, channel and wire all stop) while the host moves on;
//   B3 reload without autostart (`?net=local&netsim=typical&netdrop=8`), the main menu's "Rejoin <code>" by pad;
//   B4 tab closed, a new tab, the main menu's Co-op > Join with code > the on-screen keyboard by pad.
// B2-B4 then check the placement (L1 slot or within 3 m of the host within 30 s, > 10 m from the lounge spawn), the doors
// and lamps against the host's, a 2 m walk by stick (the host's copy within 0.5 m) and a client door row on the host.
// Host = keyboard + mouse (page A), client = pad (page B). Every action is a lib device helper or a local page-life
// helper (CDP only, listed in docs/coop-real/C2-REPORT.md "lib changes wanted"); every read goes through `L.read` /
// `L.until` and the sweep readers.
import * as L from './lib.mjs';
import * as S from './sweep.mjs';
import { setSimPages } from '../e2e-net-lib.mjs';

export const NAME = 'R7: A1 to A2 by input, client hidden / frozen / reloaded / reopened (B1-B4)';
/** netdrop 8 s (A6): a frozen tab drops as a real WebRTC peer does. realBackground (A7, PLAN-CHECK 6): no background
 *  flags, so a hidden page throttles as in Michael's Chrome (probe 2: minimized rAF 0.6 Hz, timers 8 Hz). */
export const BOOT = { netdrop: 8, realBackground: true };
const NETDROP_S = BOOT.netdrop;

const MS = L.PROMPT_S * 1000;
const T0 = Date.now();
/** A wait that ends in an assert: true when it held in time. */
const ok = (p) => p.then(() => true, () => false);

/** The L1 holding room (HOLD_BOX L1, facility types.ts:116) and its pad (inset 1 m, AIRLOCK_PAD_INSET). */
const L1_BOX = [22, 8, 28, 14];
/** A2 starts at L1's far door wall (x 28); "> 10 m into A2" = x > 38. */
const A2_X0 = 28;
/** Route spots (map data: a1Gate.ts A1_MARK / A1_WALL, facility HOLD_DOORS, a2CarriageShed.ts debug points). */
const MARK = [10.8, 6.0];
const HOST_A2 = [39.2, 12.5];
const HOST_ON = [42.0, 12.5];
const CLIENT_A2 = [31.0, 10.4];

let routeOk = false;

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    console.log(`  [${name}] done ${((Date.now() - t) / 1000).toFixed(1)} s (part ${((Date.now() - T0) / 1000).toFixed(1)} s)`);
    return true;
  } catch (e) {
    L.fail(`${name}: ${String(e?.message ?? e).split('\n')[0]}`);
    return false;
  }
}

// ------------------------------------------------------------------------------------------ page functions (read only)

function pgCourseDoor(cid) {
  const g = window.__app.current;
  const aid = g.world.layout.course.doors[cid];
  const d = g.world.doors.list.find((q) => q.anchor.id === aid);
  return d ? { i: d.index, cx: d.cx, cz: d.cz, target: d.target, locked: !!d.anchor.locked } : null;
}
function pgDoorTarget(a) {
  return window.__app.current.world.doors.list[a[0]].target === a[1];
}
function pgCrouched(on) {
  const c = window.__app.current.player.controller;
  return (c.crouched && c.crouchIntent && !c.autoCrouch) === on;
}
function pgTeam() {
  const t = window.__app.current.team;
  return { state: t.state, boost: !!t.offer?.boost, boosts: t.count.boosts };
}
function pgTeamState(s) {
  return window.__app.current.team.state === s;
}
function pgOfferBoost() {
  return !!window.__app.current.team.offer?.boost;
}
function pgBoosted(n) {
  return window.__app.current.team.count.boosts > n;
}
function pgHang() {
  const g = window.__app.current;
  const t = g.traversal;
  const a = t.attach.anchor;
  const p = g.player.controller.pos;
  return { attached: t.attached, phase: t.attach.phase, kind: a?.kind ?? null, nx: a?.nx ?? null, top: a?.top ?? null, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), grounded: g.player.controller.grounded };
}
function pgHangOn() {
  const t = window.__app.current.traversal;
  return t.attached && t.attach.phase === 'on' && t.attach.anchor?.kind === 'ledge';
}
function pgAttached(on) {
  return window.__app.current.traversal.attached === on;
}
function pgOnTop() {
  const g = window.__app.current;
  return !g.traversal.attached && g.player.controller.grounded && g.player.controller.pos.y > 4.0;
}
function pgLanded() {
  const g = window.__app.current;
  const c = g.player.controller;
  return !g.traversal.attached && c.grounded && c.pos.y < 0.3;
}
function pgGate(id) {
  return !!window.__course.debug().gates?.[id];
}
function pgCourseHost() {
  const k = window.__course.debug();
  const g = window.__app.current;
  return { bay: k.bay, checkpoint: k.checkpoint, restarts: g.mode?.restarts ?? null, air: k.air?.L1 ?? null };
}
function pgBay(n) {
  const k = window.__course.debug();
  return k.bay === n && k.checkpoint === 'L1';
}
function pgSpawns() {
  return window.__app.current.world.layout.playerSpawns.slice(0, 2).map((s) => [s.pos.x, s.pos.z]);
}
/** The client page's session and place: its player id, transport id, feet, match, top screen. */
function pgClient() {
  const g = window.__app?.current;
  const s = window.__coop?.session;
  const p = g?.player?.position;
  return {
    id: s?.selfId ?? null,
    tid: s?.transport?.selfId ?? null,
    code: s?.code ?? null,
    inMatch: !!g?.net && g?.opts?.mode === 'course',
    alive: !!g?.player?.alive,
    x: p ? +p.x.toFixed(2) : null,
    z: p ? +p.z.toFixed(2) : null,
    top: window.__app?.screens?.top?.el?.className ?? null,
  };
}
/** The host's view of its client: remote ids, the (only) remote's feet and whether it has a state. */
function pgHostRemote() {
  const net = window.__app.current?.net;
  const rs = net?.remotes ? [...net.remotes.entries()] : [];
  const r = rs[0]?.[1];
  return { ids: rs.map((e) => e[0]), x: r ? +r.feet.x.toFixed(2) : null, z: r ? +r.feet.z.toFixed(2) : null, state: !!r?.state };
}
function pgHostHasClient() {
  const net = window.__app.current?.net;
  return !!net?.remotes && net.remotes.size === 1 && [...net.remotes.values()].every((r) => r.state);
}
function pgHostRemoteNear(a) {
  const net = window.__app.current?.net;
  const r = net?.remotes ? [...net.remotes.values()][0] : null;
  return !!r && Math.hypot(r.feet.x - a[0], r.feet.z - a[1]) < 0.5;
}
/** Placed (B2-B4): in the course match, alive, inside L1 (the checkpoint's slots) or within 3 m of the host's feet. */
function pgPlaced(a) {
  const g = window.__app?.current;
  if (!g?.net || g.opts?.mode !== 'course' || !g.player?.alive) return false;
  const p = g.player.position;
  const inL1 = p.x > a.box[0] && p.x < a.box[2] && p.z > a.box[1] && p.z < a.box[3];
  return inL1 || Math.hypot(p.x - a.host[0], p.z - a.host[1]) <= 3;
}
function pgPauseOpen() {
  return !!document.querySelector('.pause-screen');
}
function pgPauseClosed() {
  return !document.querySelector('.pause-screen');
}
function pgMenuTop() {
  const t = window.__app?.screens?.top?.el;
  return { cls: t?.className ?? null, rejoin: document.querySelector('.main-menu [data-key="rejoin"]')?.textContent?.trim() ?? null, coop: !!document.querySelector('.main-menu [data-key="coop"]') };
}
function pgOskAt(sel) {
  const t = document.querySelector(sel);
  const f = window.__app.nav.focused;
  if (!t) return null;
  const a = t.getBoundingClientRect();
  const b = f?.getBoundingClientRect?.();
  return { on: f === t, dx: b ? a.x - b.x : 0, dy: b ? a.y - b.y : 0, f: f?.textContent?.trim().slice(0, 12) ?? '' };
}
function pgCodeTyped() {
  return [...document.querySelectorAll('.join-screen .code-slot')].map((s) => s.textContent).join('');
}
function pgCodeLen(n) {
  return [...document.querySelectorAll('.join-screen .code-slot')].map((s) => s.textContent).join('').length > n;
}
function pgTopHas(cls) {
  return !!window.__app?.screens?.top?.el?.classList.contains(cls);
}

// ------------------------------------------------------------------------------------------------------ local helpers
// (page life by CDP and menu input; wanted in lib.mjs, docs/coop-real/C2-REPORT.md "lib changes wanted")

/** CDP: the window of page P to `state` ('minimized' / 'normal'): both tabs of the pair share one window (probe). */
async function windowState(P, state) {
  const s = await L.cdp(P);
  const { targetInfo } = await s.send('Target.getTargetInfo');
  const { windowId } = await s.send('Browser.getWindowForTarget', { targetId: targetInfo.targetId });
  await s.send('Browser.setWindowBounds', { windowId, bounds: { windowState: state } });
}

/** B1 (probe 2 pick): hide the client as a background tab: `document.hidden` + visibilitychange (the game's own hidden
 *  path: the co-op pause menu, the bgTick worker runs its sim) and the window minimized (rAF stops, timers run).
 *  The host shares the window: its rAF stalls too and the pump steps it (it stands for Michael's visible host window).
 *  Returns the restore. */
async function hideReal(P) {
  await L.spoofHidden(P, true);
  await windowState(P, 'minimized');
  return async () => {
    await windowState(P, 'normal');
    await L.spoofHidden(P, false);
  };
}

/** B2 (probe 2 pick): stop page P's main thread (`Debugger.pause`: rAF, timers, worker messages, BroadcastChannel and
 *  the wire all 0). Never read P (no evaluate, no `until` with P a clock page) until the resume. Returns the resume. */
async function freeze(P) {
  const s = await L.cdp(P);
  await s.send('Debugger.enable');
  await s.send('Debugger.pause');
  return async () => {
    await s.send('Debugger.resume').catch(() => {});
    await s.send('Debugger.disable').catch(() => {});
  };
}

/** Crouch (on) or stand (off) by a crouch press (the toggle default), pressed again until the page shows it. */
async function setCrouch(P, who, on) {
  for (let n = 0; n < 3; n++) {
    if (await L.read(P, pgCrouched, on)) return;
    await L.tap(P, who, 'crouch');
    if (await ok(L.until(P, pgCrouched, on, 1500, 'crouch toggles'))) return;
  }
  L.assert(await L.read(P, pgCrouched, on), `${who} ${on ? 'crouches' : 'stands up'} by the crouch press`);
}

/** Past the title (one press; its light-up sequence `ts-seq` is left to run, so no press lands on the menu under it)
 *  and the first-run brightness screen (Done) to the main menu, by `who`'s input. */
async function toMainMenu(P, who) {
  const w0 = Date.now();
  let s = null;
  while (Date.now() - w0 < 30000) {
    s = await L.read(P, pgMenuTop);
    if (s.cls && /\bmain-menu\b/.test(s.cls) && s.coop) return s;
    if (s.cls && /title-screen/.test(s.cls) && !/ts-seq/.test(s.cls)) await L.tap(P, who, 'confirm');
    else if (s.cls && /brightness-screen/.test(s.cls)) await L.tap(P, who, 'confirm');
    await L.sleep(500);
  }
  throw new Error(`the main menu never came up by ${who} presses (top ${JSON.stringify(s)})`);
}

/** Focus the menu element `sel` (L.menuFocus) and confirm it. */
async function menuPick(P, who, sel) {
  const f = await L.menuFocus(P, who, sel);
  await L.tap(P, who, 'confirm');
  return f;
}

/** Type `code` on the join screen's on-screen keyboard (a data-grid): the D-pad steps the focus onto each key by its
 *  place on screen, A types it; then Start joins. */
async function oskType(P, who, code) {
  await L.until(P, () => !!document.querySelector('.join-screen .osk'), null, 6000, 'the join screen opens');
  for (let i = 0; i < code.length; i++) {
    const sel = `.join-screen .osk [data-key="k-${code[i]}"]`;
    for (let n = 0; ; n++) {
      const s = await L.read(P, pgOskAt, sel);
      if (!s) throw new Error(`no on-screen key for "${code[i]}"`);
      if (s.on) break;
      if (n > 30) throw new Error(`the ${who} focus never reached key "${code[i]}" (on "${s.f}")`);
      await L.tap(P, who, Math.abs(s.dy) > 4 ? (s.dy > 0 ? 'down' : 'up') : s.dx > 0 ? 'right' : 'left');
      await L.sleep(60);
    }
    await L.tap(P, who, 'confirm');
    await L.until(P, pgCodeLen, i, 3000, `key "${code[i]}" types`);
  }
  const typed = await L.read(P, pgCodeTyped);
  L.assert(typed === code, `B4 setup: the code typed by ${who} on the on-screen keyboard (${typed}, room ${code})`);
  await L.tap(P, who, 'pause');
}

// ------------------------------------------------------------------------------------------------------ route helpers

/** Open course door `cid` by `who`'s row on page P (already standing in reach), unless the host has it open. */
async function openDoor(h, P, who, cid, tag) {
  const d = await L.read(h.A, pgCourseDoor, cid);
  L.assert(!!d, `${tag}: the ${cid} door exists on the host`);
  if (d.target === 1) return d;
  // (triage 2026-10-25) the door rows come only within 1.6 m of the door's centre, facing it (gameState.ts
  // doorMenuCandidate); a stand point 1.4 m off with a 0.3 m walk tolerance left the host 1.6-1.7 m off L1-near on the
  // desktop run ("rows: []"): step in to 1.0 m on the actor's side, along the axis it is furthest off, first
  const m = await L.me(P);
  const dx = m.x - d.cx;
  const dz = m.z - d.cz;
  if (Math.hypot(dx, dz) > 1.25) {
    const stand = Math.abs(dx) >= Math.abs(dz) ? [d.cx + Math.sign(dx) * 1.0, d.cz] : [d.cx, d.cz + Math.sign(dz) * 1.0];
    await L.walkTo(P, who, stand, { tol: 0.2, maxS: 6, creep: 1.5, what: `${tag}: ${who} steps up to ${cid}` });
  }
  await L.aimAt(P, who, [d.cx, 1.2, d.cz], { tol: 0.05, maxS: 4 }).catch((e) => console.log(`  (${tag}: ${String(e.message).split('\n')[0]}; trying the row as it faces)`));
  await L.pickRow(P, who, /^Open door$/);
  const got = await ok(L.until(h.A, pgDoorTarget, [d.i, 1], MS, `${tag}: ${cid} opens on the host`));
  L.assert(got, `${tag}: the ${P === h.A ? 'host' : 'client'}'s Open door row opens ${cid} on the host within ${L.PROMPT_S} s`);
  return d;
}

/** Face the camera along +x (east) at eye height: the keyboard walk then goes straight through a doorway. */
const faceEast = (P, who) =>
  L.me(P).then((m) => L.aimAt(P, who, [m.x + 10, m.y + 1.5, m.z], { tol: 0.05, maxS: 4 }).catch((e) => console.log(`  (face east: ${String(e.message).split('\n')[0]})`)));

/** A1 to L1 to A2 by input (PLAN C2: "A1 by input to L1, both into A2 (host leads)"). */
async function toA2(h) {
  const { A, B } = h;
  const via = { via: 0.6, tol: 0.3, maxS: 20 };
  // the lounge door (closed at the start), the host's row
  await L.walkTo(A, 'kbm', [4.8, 10.6], { tol: 0.3, maxS: 10 });
  await openDoor(h, A, 'kbm', 'A1-lounge', 'route');
  // the host on the striped mark from the west (facing the wall), the client 0.9 m behind it on -x (the leg-up)
  await L.walkPath(A, 'kbm', [[7.2, 11.2], [9.2, 7.2], [9.6, 6.0], MARK], { ...via, tol: 0.25 });
  await L.walkPath(B, 'pad', [[5.0, 11.4], [7.2, 11.6], [8.6, 7.4], [8.9, 6.0], [9.9, 6.0]], { ...via, tol: 0.2 });
  await setCrouch(A, 'kbm', true);
  await L.holdUntil(A, 'kbm', 'coop', pgTeamState, 'offer', 'route: the host offers a leg-up (crouched, F)', 6000);
  await L.until(B, pgOfferBoost, null, 8000, 'route: the client is offered the leg-up');
  const b0 = (await L.read(B, pgTeam)).boosts;
  await L.holdUntil(B, 'pad', 'coop', pgBoosted, b0, 'route: the client takes the leg-up (RB)', 8000);
  await L.until(B, pgHangOn, null, 12000, 'route: the client hangs on the lip');
  const lip = await L.read(B, pgHang);
  L.assert(lip.kind === 'ledge' && lip.nx < -0.9 && lip.top >= 4.3 && lip.top <= 4.5, `route: the leg-up hangs the client on the apron-face lip (${JSON.stringify(lip)})`);
  await L.until(A, pgTeamState, 'none', 20000, 'route: the booster is free again');
  // the client climbs up (Y), lowers into a hang on the yard face (B held at the edge) and lets go (B again)
  await L.holdUntil(B, 'pad', 'jump', pgAttached, false, 'route: the client pulls up (Y)', 20000);
  await L.until(B, pgOnTop, null, 30000, 'route: the client stands on the wall top');
  let low = await ok(L.holdUntil(B, 'pad', 'crouch', pgAttached, true, 'route: the client lowers into a hang (B held)', 4000));
  if (!low) {
    // the climb left the body facing off the yard lip or out of its 0.7 m reach: a short creep east, then hold again
    const at = await L.read(B, pgHang);
    console.log(`  (route: no lower from ${JSON.stringify(at)}; creeping east)`);
    await L.walkTo(B, 'pad', [12.08, at.z], { tol: 0.12, maxS: 4, creep: 1.5 }).catch((e) => console.log(`  (${e.message})`));
    low = await ok(L.holdUntil(B, 'pad', 'crouch', pgAttached, true, 'route: the client lowers into a hang (B held, again)', 4000));
  }
  const hang = await L.read(B, pgHang);
  L.assert(low && hang.kind === 'ledge' && hang.nx > 0.9, `route: holding B at the edge lowers the client into a hang on the yard face (${JSON.stringify(hang)})`);
  await L.until(B, pgHangOn, null, 10000, 'route: the hang settles');
  await L.waitHostSim(B, 300);
  await L.holdUntil(B, 'pad', 'crouch', pgAttached, false, 'route: the client lets go (B)', 10000);
  await L.until(B, pgLanded, null, 6000, 'route: the client lands in the yard');
  const land = await L.read(B, pgHang);
  L.assert(land.x > 12.3, `route: the client is in the yard (${JSON.stringify(land)})`);
  // the yard-side bolt and the wicket, the client's rows
  await L.walkPath(B, 'pad', [[13.4, 8.0], [13.2, 11.0]], { ...via, tol: 0.25 });
  const wk = await L.read(h.A, pgCourseDoor, 'A1-wicket');
  await L.aimAt(B, 'pad', [wk.cx, 1.2, wk.cz], { tol: 0.05, maxS: 4 }).catch((e) => console.log(`  (route: ${String(e.message).split('\n')[0]})`));
  await L.pickRow(B, 'pad', /^Unbolt$/);
  L.assert(await ok(L.until(h.A, pgGate, 'g-a1-wicket', 6000, 'route: the wicket bolt opens')), 'route: the client\'s yard-side Unbolt opens the wicket bolt on the host');
  await openDoor(h, B, 'pad', 'A1-wicket', 'route');
  // the host through the wicket, both to L1's near door
  await setCrouch(A, 'kbm', false);
  await L.walkPath(A, 'kbm', [[10.2, 9.0], [10.6, 11.0]], via);
  await faceEast(A, 'kbm');
  await L.walkPath(B, 'pad', [[14.6, 12.2]], via);
  await L.walkPath(A, 'kbm', [[13.6, 11.0], [20.6, 11.0]], via);
  await L.walkPath(B, 'pad', [[20.2, 12.4]], via);
  await openDoor(h, A, 'kbm', 'L1-near', 'route');
  // both on L1's pad: the airlock cycles (4 s), the checkpoint is L1, A2 starts
  await faceEast(A, 'kbm');
  await L.walkPath(A, 'kbm', [[23.0, 11.0], [24.4, 10.4]], via);
  await L.walkPath(B, 'pad', [[21.0, 11.3], [23.0, 11.3], [25.6, 11.8]], via);
  const cyc = await ok(L.until(h.A, pgBay, 1, 20000, 'route: L1 cycles'));
  L.assert(cyc, `route: both on L1's pad cycle the airlock: the course at A2, checkpoint L1 (host ${JSON.stringify(await L.read(h.A, pgCourseHost))})`);
  // into A2 crouched (being spotted restarts A2, SPOT_FAIL), the host leads > 10 m in, the client by the entry
  await L.walkTo(A, 'kbm', [26.6, 11.0], { tol: 0.3, maxS: 8 });
  await openDoor(h, A, 'kbm', 'L1-far', 'route');
  await setCrouch(A, 'kbm', true);
  await setCrouch(B, 'pad', true);
  const r0 = (await L.read(h.A, pgCourseHost)).restarts;
  await faceEast(A, 'kbm');
  await L.walkPath(A, 'kbm', [[29.6, 11.0], [33.5, 12.5], HOST_A2], { ...via, maxS: 30 });
  await L.walkPath(B, 'pad', [[29.4, 11.2], CLIENT_A2], { ...via, maxS: 30 });
  const k = await L.read(h.A, pgCourseHost);
  const hm = await L.me(h.A);
  L.assert(
    k.checkpoint === 'L1' && hm.x - A2_X0 > 10 && k.restarts === r0,
    `route: before any drop the host's checkpoint is L1 and the host is > 10 m into A2 (checkpoint ${k.checkpoint}, ${(hm.x - A2_X0).toFixed(1)} m in, set restarts ${r0} -> ${k.restarts})`,
  );
}

// ------------------------------------------------------------------------------------------------------ B checks

/** 2 m by the client's stick toward an open spot of its area (L1 or the A2 entry), then the host's copy within 0.5 m. */
async function walk2m(h, tag) {
  const c = await L.read(h.B, pgClient);
  // (triage 2026-10-25) a client still in the yard (west of L1's near door: the route stopped there) walks on the yard
  // line it came in by, not into L1 through a closed door (desktop run: "stuck at 21.43, 11.98")
  const spots = c.x < L1_BOX[0] ? [[16.0, 12.3], [18.0, 12.4], [14.6, 12.2]] : c.x < A2_X0 ? [[26.6, 11.0], [23.4, 11.0], [25.0, 12.6]] : [[33.5, 12.5], [30.5, 11.0], [36.0, 12.5]];
  const s = spots.find((p) => Math.hypot(p[0] - c.x, p[1] - c.z) >= 2.3) ?? spots[0];
  const d = Math.hypot(s[0] - c.x, s[1] - c.z);
  const to = [c.x + ((s[0] - c.x) * 2) / d, c.z + ((s[1] - c.z) * 2) / d];
  const w = await L.walkTo(h.B, 'pad', to, { tol: 0.3, maxS: 8, what: `${tag}: the client walks 2 m by stick` });
  const at = await L.read(h.B, pgClient);
  const moved = Math.hypot(at.x - c.x, at.z - c.z);
  const near = await ok(L.until(h.A, pgHostRemoteNear, [at.x, at.z], 3000, `${tag}: the host's copy of the client follows`));
  const hr = await L.read(h.A, pgHostRemote);
  L.assert(moved >= 1.6 && near, `${tag}: the client walks 2 m by stick (${moved.toFixed(2)} m in ${w.t} s) and the host's copy is within 0.5 m (client ${at.x}, ${at.z}; host's copy ${hr.x}, ${hr.z})`);
}

/** A client door row on L1's far door (from the side the client is on) moves that door on the host. */
async function doorRow(h, tag) {
  const d = await L.read(h.A, pgCourseDoor, 'L1-far');
  const c = await L.read(h.B, pgClient);
  const stand = c.x < A2_X0 ? [d.cx - 1.0, d.cz] : [d.cx + 1.0, d.cz];
  await L.walkTo(h.B, 'pad', stand, { tol: 0.3, maxS: 12, what: `${tag}: the client walks to L1's far door` });
  await L.aimAt(h.B, 'pad', [d.cx, 1.2, d.cz], { tol: 0.05, maxS: 4 }).catch((e) => console.log(`  (${tag}: ${String(e.message).split('\n')[0]})`));
  const t0 = (await L.read(h.A, pgCourseDoor, 'L1-far')).target;
  const row = await L.pickRow(h.B, 'pad', /^(Open|Close) door$/);
  const got = await ok(L.until(h.A, pgDoorTarget, [d.i, t0 === 1 ? 0 : 1], MS, `${tag}: the host's L1 far door moves`));
  L.assert(got, `${tag}: the client's "${row.label}" row on L1's far door moves the host's door within ${L.PROMPT_S} s (target ${t0} -> ${(await L.read(h.A, pgCourseDoor, 'L1-far')).target})`);
}

/** Doors and lamps on the client equal the host's (the hash's `d.*` and `lamps` keys), within 5 host s. */
async function sameWorld(h, tag) {
  let diff = [];
  for (let i = 0; i < 20; i++) {
    const [a, b] = await Promise.all([S.hashState(h.A), S.hashState(h.B)]);
    diff = S.diffKeys(a, b).filter((k) => k.startsWith('d.') || k === 'lamps').map((k) => `${k} host ${a[k]} client ${b[k]}`);
    if (!diff.length) break;
    await L.waitHostSim(h.A, 250);
  }
  L.assert(diff.length === 0, `${tag}: the client's doors and lamps match the host's (${diff.slice(0, 6).join('; ') || 'all equal'})`);
}

/**
 * B2-B4 after the client came back (`w0`: wall ms it started): placed at L1 (the checkpoint's slot) or within 3 m of
 * the host within 30 s, > 10 m from the lounge spawn, the host has it, doors / lamps match, a 2 m walk, a door row.
 */
async function placedChecks(h, tag, w0) {
  const host = await L.me(h.A);
  const placed = await ok(L.until(h.B, pgPlaced, { box: L1_BOX, host: [host.x, host.z] }, 30000, `${tag}: the client is placed`));
  const c = await L.read(h.B, pgClient).catch(() => null);
  const secs = ((Date.now() - w0) / 1000).toFixed(1);
  L.assert(placed, `${tag}: placed at L1 slot 1 or within 3 m of the host within 30 s (client ${JSON.stringify(c)}, host at ${host.x.toFixed(1)}, ${host.z.toFixed(1)}, ${secs} s wall)`);
  const sp = await L.read(h.A, pgSpawns);
  const dl = Math.min(...sp.map((p) => Math.hypot(p[0] - c.x, p[1] - c.z)));
  L.assert(dl > 10, `${tag}: the client is > 10 m from the lounge spawn (${dl.toFixed(1)} m at ${c.x}, ${c.z})`);
  const has = await ok(L.until(h.A, pgHostHasClient, null, 8000, `${tag}: the host has the client again`));
  L.assert(has, `${tag}: the host runs the client again (${JSON.stringify(await L.read(h.A, pgHostRemote))})`);
  await S.installTaps(h.B);
  await sameWorld(h, tag);
  await walk2m(h, tag);
  await doorRow(h, tag);
}

// ------------------------------------------------------------------------------------------------------------- run

export async function run(h) {
  routeOk = await step('route A1 -> L1 -> A2', () => toA2(h));

  await step('B1 hidden 5 s', async () => {
    const c0 = await L.read(h.B, pgClient);
    const r0 = await L.read(h.A, pgHostRemote);
    L.assert(c0.inMatch && r0.ids.length === 1 && c0.top === null, `B1 setup: the client is in play (no screen over it) and the host runs it (${JSON.stringify({ c0, r0 })})`);
    const restore = await hideReal(h.B);
    let lost = 0;
    const w0 = Date.now();
    try {
      while (Date.now() - w0 < 5000) {
        const r = await L.read(h.A, pgHostRemote);
        if (!r.ids.includes(c0.id)) lost++;
        await L.sleep(400);
      }
    } finally {
      await restore();
    }
    const paused = await ok(L.until(h.B, pgPauseOpen, null, 3000, 'B1: the hidden page opened its pause menu'));
    if (paused) await L.holdUntil(h.B, 'pad', 'back', pgPauseClosed, null, 'B1: the pause menu closes by B', 4000);
    const c1 = await L.read(h.B, pgClient);
    L.assert(paused && c1.top === null, `B1: the hide opened the co-op pause menu and B closes it (opened ${paused}, top now ${c1.top})`);
    const r1 = await L.read(h.A, pgHostRemote);
    L.assert(c1.inMatch && c1.id === c0.id && c1.tid === c0.tid && lost === 0 && r1.ids.includes(c0.id), `B1: same session after 5 s hidden (client ${c0.id} -> ${c1.id}, transport ${c0.tid} -> ${c1.tid}; host polls without the client ${lost}; host remotes ${JSON.stringify(r1.ids)})`);
    const moved = Math.hypot(c1.x - c0.x, c1.z - c0.z);
    L.assert(moved <= 0.5, `B1: the client's position is kept within 0.5 m (${moved.toFixed(2)} m: ${c0.x}, ${c0.z} -> ${c1.x}, ${c1.z})`);
    await walk2m(h, 'B1');
  });

  const skip = (tag) => L.fail(`${tag}: skipped - the route to A2 failed (no L1 checkpoint to rejoin at)`);

  if (!routeOk) skip('B2');
  else
    await step('B2 frozen past netdrop', async () => {
      const c0 = await L.read(h.B, pgClient);
      // only the host's clock counts while the client is stopped (a read of a paused page waits for its resume)
      setSimPages([h.A]);
      const resume = await freeze(h.B);
      let dropped = false;
      const w0 = Date.now();
      try {
        await L.walkTo(h.A, 'kbm', HOST_ON, { tol: 0.3, maxS: 10, what: 'B2: the host moves on' }).catch((e) => console.log(`  (${e.message})`));
        while (Date.now() - w0 < (NETDROP_S + 2.5) * 1000) {
          if (!(await L.read(h.A, pgHostRemote)).ids.includes(c0.id)) dropped = true;
          await L.sleep(400);
        }
        if (!(await L.read(h.A, pgHostRemote)).ids.includes(c0.id)) dropped = true;
      } finally {
        await resume();
        setSimPages([h.A, h.B]);
      }
      console.log(`  (B2: frozen ${((Date.now() - w0) / 1000).toFixed(1)} s wall; the host dropped the client: ${dropped})`);
      L.assert(dropped, `B2 setup: the host drops the client frozen past netdrop ${NETDROP_S} s`);
      await placedChecks(h, 'B2', Date.now());
    });

  if (!routeOk) skip('B3');
  else
    await step('B3 reload, Rejoin by pad', async () => {
      await L.reloadClient(h, { menu: true });
      const w0 = Date.now();
      const m = await toMainMenu(h.B, 'pad');
      L.assert(/^Rejoin [A-Z0-9]{5}$/.test(m.rejoin ?? ''), `B3 setup: the reloaded tab's main menu offers "Rejoin <code>" (${JSON.stringify(m)})`);
      await menuPick(h.B, 'pad', '.main-menu [data-key="rejoin"]');
      const inM = await ok(L.inMatch(h.B, 'B3: the rejoined client', L.LOAD_MS));
      L.assert(inM, `B3: "${m.rejoin}" by pad takes the client back into the match (${JSON.stringify(await L.read(h.B, pgClient))})`);
      await L.padReady(h.B);
      await placedChecks(h, 'B3', w0);
    });

  if (!routeOk) skip('B4');
  else
    await step('B4 new tab, Join by code by pad', async () => {
      const code = (await L.read(h.A, pgClient)).code;
      await L.reopenClient(h, { menu: true });
      const w0 = Date.now();
      await toMainMenu(h.B, 'pad');
      await menuPick(h.B, 'pad', '.main-menu [data-key="coop"]');
      await L.until(h.B, pgTopHas, 'coop-screen', 6000, 'B4 setup: the co-op screen opens');
      await menuPick(h.B, 'pad', '.coop-screen [data-key="join"]');
      await oskType(h.B, 'pad', code);
      const inM = await ok(L.inMatch(h.B, 'B4: the new tab', L.LOAD_MS));
      L.assert(inM, `B4: Join with code ${code} by pad takes the new tab into the match (${JSON.stringify(await L.read(h.B, pgClient))})`);
      await L.padReady(h.B);
      await placedChecks(h, 'B4', w0);
    });

  console.log(`part 3 run ${((Date.now() - T0) / 1000).toFixed(1)} s (boot excluded)`);
}
