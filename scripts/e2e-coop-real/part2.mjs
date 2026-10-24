// e2e-coop-real part 2 (coop-real C1, brief docs/coop-real/briefs/C1.md): Marlow Yard A1, scripted, input only.
// The client opens the lounge door, S2 lamps shot out by each player (the client's apron flood is the marked KNOWN BUG),
// the client's Unbolt refused from the apron side, and the prompt sweep at three route stops. Host = keyboard + mouse
// (page A), client = pad (page B). Every action is a lib device helper; every read goes through `L.read` / `L.until`
// and the sweep readers.
import * as L from './lib.mjs';
import * as S from './sweep.mjs';

export const NAME = 'A1: client door, S2 lamps, unbolt refusal, prompt sweep';
export const BOOT = {};

const MS = L.PROMPT_S * 1000;
const LOUNGE_DOOR = [6, 11];
const CABIN_DOOR = [8.6, 15.0];
/** A wait that ends in an assert: true when it held in time. */
const ok = (p) => p.then(() => true, () => false);
const T0 = Date.now();

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    console.log(`  [${name}] done ${((Date.now() - t) / 1000).toFixed(1)} s (part ${((Date.now() - T0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    L.fail(`${name}: ${String(e?.message ?? e).split('\n')[0]}`);
  }
}
const hashes = (h) => Promise.all([S.hashState(h.A), S.hashState(h.B)]);
async function diffNote(h, [a0, b0]) {
  const [a1, b1] = await hashes(h);
  return `host keys ${JSON.stringify(S.diffKeys(a0, a1))}, client keys ${JSON.stringify(S.diffKeys(b0, b1))}`;
}

// ------------------------------------------------------------------------------------------ page functions (read only)

function pgDoor(c) {
  const g = window.__app.current;
  const d = g.world.doors.list.find((q) => Math.hypot(q.cx - c[0], q.cz - c[1]) < 0.2);
  return d ? { i: d.index, target: d.target, locked: d.anchor.locked } : null;
}
function pgDoorTarget(a) {
  const g = window.__app.current;
  return g.world.doors.list[a[0]].target === a[1];
}
function pgAimedIn() {
  const g = window.__app.current;
  return { phase: g.weapons.drawPhase, ads: g.player.cam.ads, gun: g.weapons.current.def.id };
}
function pgAimedInOk() {
  const g = window.__app.current;
  return g.weapons.drawPhase === 2 && g.player.cam.ads >= 0.9;
}
function pgLamp(a) {
  const g = window.__app.current;
  const reg = g.world.level.lights;
  let best = null;
  let bd = 1e9;
  for (const l of reg.lights) {
    if (l.group !== a[0]) continue;
    const d = Math.hypot(l.x - a[1], l.z - a[2]);
    if (d < bd) { bd = d; best = l; }
  }
  if (!best || bd > 0.5) return null;
  const f = best.fixture;
  return { id: best.id, aim: [best.x, best.y + (f ? f.oy : 0), best.z], half: f ? [f.sx / 2 + 0.06, f.sy / 2 + 0.06, f.sz / 2 + 0.06] : [0.22, 0.22, 0.22] };
}
function pgLampState(id) {
  const g = window.__app.current;
  const reg = g.world.level.lights;
  const l = reg.lights.find((x) => x.id === id);
  return !l ? -1 : l.destroyed ? 2 : reg.baseOn(l) ? 0 : 1;
}
function pgShotCrosses(box) {
  const g = window.__app.current;
  const s = g.weapons.lastShot;
  if (!s) return { ok: false, why: 'no shot' };
  const a = [s.origin.x, s.origin.y, s.origin.z];
  const d = [s.hit.x - a[0], s.hit.y - a[1], s.hit.z - a[2]];
  let t0 = 0;
  let t1 = 1;
  for (let k = 0; k < 3; k++) {
    const o = a[k] - box.c[k];
    if (Math.abs(d[k]) < 1e-9) {
      if (Math.abs(o) > box.h[k]) return { ok: false, target: s.target };
      continue;
    }
    let ta = (-box.h[k] - o) / d[k];
    let tb = (box.h[k] - o) / d[k];
    if (ta > tb) { const x = ta; ta = tb; tb = x; }
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return { ok: false, target: s.target };
  }
  return { ok: true, t: +t0.toFixed(3), target: s.target };
}
function pgCourse() {
  const k = window.__course.debug();
  return { refusal: k.refusal ?? '', rn: k.rn ?? null, gate: k.gates ? k.gates['g-a1-wicket'] : null };
}
function pgWicketLocked() {
  const g = window.__app.current;
  const aid = g.world.layout.course.doors['A1-wicket'];
  const d = g.world.doors.list.find((x) => x.anchor.id === aid);
  return !!d && window.__course.wire.locks.includes(d.index);
}

// ------------------------------------------------------------------------------------------------------ node helpers

/** Open the door whose centre is `c` by input, unless the host has it open already; returns its index. */
async function openDoor(h, P, who, c, tag) {
  const d = await L.read(h.A, pgDoor, c);
  L.assert(!!d, `${tag}: the door at (${c}) exists on the host`);
  if (d.target === 1) return d.i;
  // (triage 2026-10-25) the row needs only the camera facing the door (dot > 0, gameState.ts:1511-1519): an aim that
  // misses its 0.05 rad is logged, and the row decides (pickRow waits for it and lists the rows it saw)
  await L.aimAt(P, who, [c[0], 1.2, c[1]], { tol: 0.05, maxS: 4 }).catch((e) => console.log(`  (${tag}: ${String(e.message).split('\n')[0]}; trying the row as it faces)`));
  await L.pickRow(P, who, /^Open door$/);
  const got = await ok(L.until(h.A, pgDoorTarget, [d.i, 1], MS, `${tag}: the door opens on the host`));
  L.assert(got, `${tag}: the ${P === h.A ? 'host' : 'client'}'s Open door row opens the door at (${c}) on the host within ${L.PROMPT_S} s`);
  return d.i;
}

/** Aim in and shoot at `lamp` until a round's segment crosses its fixture box (3 rounds at most). */
async function shootLamp(h, P, who, lamp, tag) {
  let hit = { ok: false };
  let k = 0;
  await L.hold(P, who, 'ads', true);
  try {
    L.assert(await ok(L.until(P, pgAimedInOk, null, 4000, `${tag} setup: aimed in`)), `${tag} setup: aimed in (drawn, ads >= 0.9)`);
    const a = await L.read(P, pgAimedIn);
    L.assert(a.gun === 'pistolSd', `${tag} setup: the pistolSd is in hand (${a.gun})`);
    while (k < 3 && !hit.ok) {
      await L.aimAt(P, who, lamp.aim, { tol: 0.012, maxS: 8 });
      await L.fireOne(P, who);
      k++;
      hit = await L.read(P, pgShotCrosses, { c: lamp.aim, h: lamp.half });
      console.log(`  ${tag}: round ${k}: ${JSON.stringify(hit)}`);
    }
  } finally {
    await L.hold(P, who, 'ads', false);
  }
  L.assert(hit.ok, `${tag} setup: a round's segment crosses the lamp's fixture box (${k} rounds)`);
}

/** Latch both pages' view of lamp `id` over one prompt window; 2 = shot. */
async function bothShot(h, id) {
  let sa = -1;
  let sb = -1;
  await L.waitHostSim(h.A, MS, async () => {
    if (sa !== 2) sa = await L.read(h.A, pgLampState, id);
    if (sb !== 2) sb = await L.read(h.B, pgLampState, id);
  });
  return [sa, sb];
}

const SKIP = (p) =>
  /kill|knock ?out|choke|neck|lethal/i.test(p.label) ||
  (p.src === 'world' && !S.WORLD_PROMPT_INPUT[p.id]) ||
  (p.src === 'world' && p.id === 'takedown') ||
  /^(grab character|takedown|team takedown|bluff|drop attack|interrogate)$/i.test(p.label) ||
  /^(bash door|optic cable|open door stealth)$/i.test(p.label);

// ------------------------------------------------------------------------------------------------------------- run

export async function run(h) {
  await step('client door', async () => {
    await L.walkTo(h.B, 'pad', [4.8, 11.5], { tol: 0.3, maxS: 8 });
    await openDoor(h, h.B, 'pad', LOUNGE_DOOR, 'client door');
  });

  await step('S2 client', async () => {
    await L.walkPath(h.B, 'pad', [[7.2, 11.4], [9.0, 11.0]], { via: 0.6, tol: 0.3, maxS: 12 });
    const flood = await L.read(h.B, pgLamp, [11, 10.25, 14.75]);
    L.assert(!!flood, 'S2 client setup: the apron flood (group 11) exists');
    await shootLamp(h, h.B, 'pad', flood, 'S2 client');
    await S.knownBug('S2', 'F1a/F1b', { expect: /S2 client: the client's round shoots out the apron flood/ }, async () => {
      const [sa, sb] = await bothShot(h, flood.id);
      L.assert(sa === 2 && sb === 2, `S2 client: the client's round shoots out the apron flood (group 11, light ${flood.id}) on both pages within ${L.PROMPT_S} s (host ${sa}, client ${sb}; 2 = shot)`);
    });
  });

  await step('S2 host', async () => {
    await L.walkTo(h.A, 'kbm', [4.5, 10.6], { tol: 0.3, maxS: 8 });
    const cove = await L.read(h.A, pgLamp, [10, 4.5, 12.5]);
    L.assert(!!cove, 'S2 host setup: the lounge cove lamp (group 10) exists');
    await shootLamp(h, h.A, 'kbm', cove, 'S2 host');
    const [sa, sb] = await bothShot(h, cove.id);
    L.assert(sa === 2 && sb === 2, `S2 host: the host's round shoots out the lounge cove (group 10, light ${cove.id}) on both pages within ${L.PROMPT_S} s (host ${sa}, client ${sb}; 2 = shot)`);
  });

  await step('unbolt', async () => {
    await L.walkTo(h.B, 'pad', [11.2, 11.0], { tol: 0.25, maxS: 8 });
    const c0 = await L.read(h.B, pgCourse);
    const h0 = await hashes(h);
    await L.pickRow(h.B, 'pad', /^Unbolt$/);
    let host = null;
    let cl = null;
    await L.waitHostSim(h.A, MS, async () => {
      host = await L.read(h.A, pgCourse);
      cl = await L.read(h.B, pgCourse);
    });
    const locked = await L.read(h.B, pgWicketLocked);
    L.assert(
      host.refusal === 'Bolted from the other side' && host.gate === false && cl.rn === c0.rn + 1 && cl.refusal === 'Bolted from the other side' && locked,
      `unbolt: the client's Unbolt from the apron is refused (host refusal "${host.refusal}", gate ${host.gate}, client refusal counter ${c0.rn} -> ${cl.rn}, wicket locked on the client ${locked}; ${await diffNote(h, h0)})`,
    );
  });

  const via = { via: 0.6, tol: 0.3, maxS: 15 };

  await step('sweep stop 1', async () => {
    await L.walkTo(h.A, 'kbm', [4.9, 10.5], via);
    await L.walkPath(h.B, 'pad', [[7.2, 11.2], [4.9, 11.5]], via);
    await S.sweepStop(h, 'A1 lounge door', { headings: 4, skip: SKIP });
  });

  await step('sweep stop 2', async () => {
    await openDoor(h, h.A, 'kbm', LOUNGE_DOOR, 'stop 2 setup');
    await L.walkPath(h.A, 'kbm', [[7.2, 11.2], [8.2, 13.9]], via);
    await L.walkPath(h.B, 'pad', [[7.2, 11.4], [9.0, 13.9]], via);
    await S.sweepStop(h, 'A1 cabin door', { headings: 4, skip: SKIP });
  });

  await step('sweep stop 3', async () => {
    await openDoor(h, h.A, 'kbm', CABIN_DOOR, 'stop 3 setup');
    // (triage 2026-10-25) both stand > 1.3 m from the cabin door centre (8.6, 15.0): a door does not close while anyone
    // is within DOOR.clearance 0.75 m of its centre (doors.ts:47, :229-230), and the brief's spots (0.81 / 0.87 m, walk
    // tol 0.25) left the client's "Close door" refused and swept dead. Host by switch-0 (0.81 m), client by the counter
    // (switch-1 is out of reach here; the client's "Lights off" is swept at stop 2).
    await L.walkPath(h.A, 'kbm', [[8.6, 14.4], [8.6, 15.5], [7.6, 15.9]], { via: 0.5, tol: 0.25, maxS: 10 });
    await L.walkPath(h.B, 'pad', [[8.6, 14.4], [8.6, 15.5], [8.3, 16.4]], { via: 0.5, tol: 0.25, maxS: 10 });
    await S.sweepStop(h, 'A1 cabin inside', { headings: 4, skip: SKIP });
  });

  console.log(`part 2 run ${((Date.now() - T0) / 1000).toFixed(1)} s (boot excluded)`);
}
