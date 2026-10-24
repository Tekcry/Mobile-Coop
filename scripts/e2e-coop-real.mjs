// e2e-coop-real (coop-real, BRIEF / PLAN in docs/coop-real): the input-only two-page co-op suite on Marlow Yard
// (`?net=local&autostart=ctcourse&mode=course`, the first tab hosts, the second joins), run under E2E_NETSIM=typical with
// the gate (the runner's SUITE_ENV). Every action is real input (host on keyboard + mouse, client on the pad); the suite
// reads the game but never writes it (BRIEF "The input line"; helpers in scripts/e2e-coop-real/lib.mjs).
//
// `--part=N` runs scripts/e2e-coop-real/partN.mjs (each boots its own pair with the module's `BOOT` options and exports
// `async function run(h)`; `h` from lib `bootPair`). No --part: every part file present, in order. Dev parts (not in the
// runner's PARTS): `--part=probe` the lifecycle probe (both flag sets), `--part=smoke` the harness smoke (boot, a client
// walkTo, a pickRow, the mouse and stick aim).
import { existsSync } from 'node:fs';
import * as L from './e2e-coop-real/lib.mjs';
import { probe } from './e2e-coop-real/probe.mjs';
import * as S from './e2e-coop-real/sweep.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PART = process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? '';
const dir = new URL('./e2e-coop-real/', import.meta.url);

async function runPart(n) {
  const file = new URL(`part${n}.mjs`, dir);
  if (!existsSync(file)) throw new Error(`part ${n} is not built yet (scripts/e2e-coop-real/part${n}.mjs)`);
  const mod = await import(file.href);
  console.log(`e2e-coop-real part ${n}${mod.NAME ? `: ${mod.NAME}` : ''}`);
  const h = await L.bootPair(url, mod.BOOT ?? {});
  try {
    await S.installTaps(h.A);
    await S.installTaps(h.B);
    await mod.run(h);
    const errs = L.gameErrors(h);
    L.assert(errs.length === 0, `part ${n}: no console errors (${errs.slice(0, 3).join(' | ')})`);
  } finally {
    await h.close();
  }
}

/** The harness smoke (H1): both pages boot under netsim, the client walks ~6 m by stick, a row runs by input on each
 *  page, the host aims by mouse (also past the viewport edge), the client by stick. */
async function smoke() {
  const t0 = Date.now();
  const h = await L.bootPair(url, {});
  try {
    await S.installTaps(h.A);
    await S.installTaps(h.B);
    console.log(`smoke: pair booted in ${((Date.now() - t0) / 1000).toFixed(1)} s (netsim ${process.env.E2E_NETSIM ?? 'off'})`);
    const net = await L.read(h.B, () => ({ sim: !!globalThis.__netsim, webdriver: navigator.webdriver }));
    L.assert(net.sim === !!process.env.E2E_NETSIM && net.webdriver === false, `both pages boot by URL (client netsim ${net.sim}, webdriver ${net.webdriver})`);
    // (triage 2026-10-25) the lounge door (centre (6, 11), a1Gate.ts:167) is closed at the start and the straight line to
    // A1-mid crosses it (laptop: "stuck at 5.61, 10.36"): the client opens it by its row first (pickRow + watchdog on
    // the host's door key), then walks ~5 m through it to the apron by the left stick (two legs, the PLAN gate on the time)
    const mid = await L.point(h.B, 'A1-mid');
    L.assert(!!mid, 'the A1-mid debug point exists');
    await L.walkTo(h.B, 'pad', [4.8, 11.5], { tol: 0.3, maxS: 8 });
    await L.aimAt(h.B, 'pad', [6, 1.2, 11], { tol: 0.05, maxS: 4 });
    const door = await S.runRow(h, h.B, 'pad', /^Open door$/, { noise: await S.controlWindow(h, 1) });
    console.log(`  (client lounge door: ${JSON.stringify(door.host)} on the host)`);
    const s0 = await L.me(h.B);
    const legs = [[7.0, 11.2], [mid[0] + 0.5, mid[2] - 0.8]];
    const d0 = Math.hypot(legs[0][0] - s0.x, legs[0][1] - s0.z) + Math.hypot(legs[1][0] - legs[0][0], legs[1][1] - legs[0][1]);
    const t0w = s0.t;
    const w = await L.walkPath(h.B, 'pad', legs, { via: 0.6, tol: 0.3, maxS: 12 });
    const tAll = +((await L.me(h.B)).t - t0w).toFixed(2);
    L.assert(w.d <= 0.3, `client walkPath by stick: ${d0.toFixed(1)} m through the lounge door to ${w.d} m off in ${tAll} sim s (last leg ${w.t} s; gate: <= 0.3 m, <= 8 s: ${tAll <= 8 ? 'in' : 'OVER'})`);
    // host walk by keys to the same area (through the open door)
    const a0 = await L.me(h.A);
    const hw = await L.walkPath(h.A, 'kbm', [[4.8, 10.6], [7.0, 11.0], [mid[0] - 1.5, mid[2] + 1]], { via: 0.6, tol: 0.5, maxS: 20 });
    console.log(`  (host walkTo by WASD from ${a0.x.toFixed(1)}, ${a0.z.toFixed(1)}: ${JSON.stringify(hw)})`);
    // a row on each page: the nearest enabled item, walked up to by input
    for (const [P, who, tag] of [[h.B, 'pad', 'client'], [h.A, 'kbm', 'host']]) {
      const near = await L.read(P, () => {
        const g = window.__app.current;
        const p = g.player.position;
        const its = (g.interactables?.items ?? []).filter((i) => i.enabled).map((i) => ({ id: i.id, label: i.label, x: i.pos.x, z: i.pos.z, d: Math.hypot(i.pos.x - p.x, i.pos.z - p.z), r: i.radius ?? null }));
        its.sort((a, b) => a.d - b.d);
        return { me: [p.x, p.z], its: its.slice(0, 4) };
      });
      console.log(`  (${tag} nearest items: ${JSON.stringify(near.its)})`);
      const it = near.its[0];
      if (!it) {
        L.fail(`${tag}: no enabled item to try a row on`);
        continue;
      }
      const ux = (near.me[0] - it.x) / (it.d || 1);
      const uz = (near.me[1] - it.z) / (it.d || 1);
      await L.walkTo(P, who, [it.x + ux * 0.9, it.z + uz * 0.9], { tol: 0.35, maxS: 25, what: `${tag} walks up to ${it.id}` }).catch((e) => console.log(`  (${e.message})`));
      const rows = await L.ctxRows(P);
      console.log(`  (${tag} rows at ${it.id}: ${JSON.stringify(rows.rows.map((r) => r.label))}, team prompt ${JSON.stringify(rows.team)})`);
      if (!rows.count) {
        L.fail(`${tag}: no row offered beside ${it.id}`);
        continue;
      }
      const label = rows.rows[rows.count - 1].label;
      const noise = await S.controlWindow(h);
      const r = await S.runRow(h, P, who, new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), { noise });
      L.assert(r.row.label === label, `${tag} pickRow by ${who} ran "${r.row.label}" (row ${r.row.index + 1} of ${rows.count}); expected keys moved (host ${JSON.stringify(r.host)}, client ${JSON.stringify(r.client)})`);
    }
    // aim: the client's camera onto the host's head by the right stick; the host's 100 deg to the right by the mouse
    const hostHead = await L.read(h.A, () => { const p = window.__app.current.player.position; return [p.x, p.y + 1.6, p.z]; });
    const ab = await L.aimAt(h.B, 'pad', hostHead, { tol: 0.02 }).catch((e) => ({ r: e.message }));
    console.log(`  (client aimAt by stick: ${JSON.stringify(ab)})`);
    const me = await L.me(h.A);
    const yaw = me.yaw + (100 * Math.PI) / 180;
    const aa = await L.aimAt(h.A, 'kbm', [me.x + Math.sin(yaw) * 10, me.y + 1.5, me.z + Math.cos(yaw) * 10], { tol: 0.02 }).catch((e) => ({ r: e.message }));
    console.log(`  (host aimAt by mouse, 100 deg right, past the viewport edge: ${JSON.stringify(aa)})`);
    L.assert(ab.r === 'ok' && aa.r === 'ok', 'aimAt by stick and by mouse both converge');
    // (lead note) one aimed shot each: LT / right button held to ADS, then the trigger / left button
    for (const [P, who, tag] of [[h.B, 'pad', 'client'], [h.A, 'kbm', 'host']]) {
      const f = await L.fireOne(P, who, 4000, { ads: true });
      L.assert(f.ads && f.after > f.before, `${tag} fires one aimed round by ${who} (ADS ${f.ads}, shots ${f.before} -> ${f.after})`);
    }
    // (lead note) the co-op pause-menu restart by keys on the host; the client stays in the match
    await L.waitHostSim(h.A, 500);
    const r0 = await L.read(h.A, () => window.__app.current.time);
    await L.pauseRestart(h.A, 'kbm');
    await L.inMatch(h.B, 'client after the host restart');
    const r1 = await L.read(h.A, () => ({ t: window.__app.current.time, top: window.__app.screens.top?.el?.className ?? null }));
    console.log(`  (host pause restart: sim ${r0.toFixed(1)} -> ${r1.t.toFixed(1)}, top screen ${r1.top})`);
    L.assert(r1.top === null, 'host "Restart at checkpoint" by keys: back in play, the client still in the match');
    const errs = L.gameErrors(h);
    L.assert(errs.length === 0, `smoke: no console errors (${errs.slice(0, 3).join(' | ')})`);
  } finally {
    await h.close();
  }
  console.log(`smoke: ${((Date.now() - t0) / 1000).toFixed(1)} s wall`);
}

try {
  if (PART === 'probe') {
    for (const realBackground of [false, true]) await probe(url, { realBackground });
  } else if (PART === 'smoke') await smoke();
  else if (PART) await runPart(PART);
  else for (let n = 1; existsSync(new URL(`part${n}.mjs`, dir)); n++) await runPart(String(n));
} catch (e) {
  console.error(e);
  L.run.failed = true;
}
S.knownBugSummary();
if (L.run.failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log(`e2e-coop-real${PART ? ` part ${PART}` : ''} OK`);
process.exit(0);
