// (mission-framework GB6) e2e-sectorops parts `wharf-tgc` / `wharf-tkl` (run-e2e: `e2e-sectorops:wharf-tgc`, `:wharf-tkl`; PART_SCRIPT
// gives each `--mission=<id>`): Tallow Wharf (`src/world/maps/tallowWharf*.ts`) in co-op, a host page and a client page over `?net=local`.
// Three Grey Coats (W1 -> W4) and Two-Key Ledger (W2 -> W4) are each played from their start section to the extraction and the
// results screen (VICTORY), with one forced co-op move per section done with real pad input on both pages (leg-up, partner throw,
// pull-up; the shutters are walked for real (J9 S4): a lone walk stopped, hold and crawl with pad input, the W1 bar drawn by the one
// through, a frozen guard's notice of a held shutter, and A27 (a restart with the shutter held drops it on both pages)), a broken
// rule that restarts the section to its checkpoint
// while the mission carries on (TGC: a decoy knocked out restarts nothing, Teale knocked out is the protected restart, Teale killed
// and then a decoy read break `namedTarget` and he bolts; TKL: a guard killed, `noKills`), and the client's mirror of the host's
// mission (`net.mission.runner.doneBits`; (mission-rules R8) the objective line and Field Terminal > Objectives on both pages,
// R6's feed: the always-on panel is gone). (mission-rules R7) Both: the host alone cannot start the
// campaign, the lobby on Realistic gives 2 revives, no dog spawns. (tallow E8) The W2 pawn throw is a 5.8 m site throw read
// from the layout's `throwSites` (tallow-fixes A24, TD-b: `team.lastThrowDist`); A30: Two-Key Ledger's W3 bolt 4 bolts the
// roof bulkhead's foot door, Three Grey Coats has no such bolt and the door stands unlocked. Run with no `--mission` it plays both in sequence.
// The guards are frozen and nobody can be hurt (the test reads the mission, not the stealth); the notice still runs (the host's
// `stealth.fixedUpdate` is not stubbed). Needs `E2E_GPU=1` (laptop queue only).
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { launch, openPage, BTN, assert } from './e2e-lib.mjs';
import { until, waitSim, setSimPages, LOAD_MS, NET_VIEWPORT, onHostStep, hostStepResult, watchTeam, teamLog } from './e2e-net-lib.mjs';

const NET3 = true; // NET3 (start.sm) is merged into feature/mission-engine

const url = process.argv[2] ?? 'http://localhost:4173/';
const MISSION = process.argv.find((a) => a.startsWith('--mission='))?.slice(10);
const IDS = ['threeGreyCoats', 'twoKeyLedger'].filter((id) => !MISSION || id === MISSION);
const PI = Math.PI;
const RB = BTN.RB;
/** The loft storey of W2 (feet height of the lofts and the walkway); `+ 0.1` is the standing spot on it. */
const LOFT = 4.5;
/** (tallow-fixes G2 step 3) the reading room's stage past the widened pawn gap, [x0, z0, x1, z1] (`THROW_PAWN.stage`, not on the page). */
const PAWN_STAGE = [50.2, 72.5, 52.2, 73.5];
/** (A30) the W3 roof bulkhead stair's foot door (`w3-bulkhead-foot`, tallowWharfW3.ts): W3 bolt 4 in Two-Key Ledger only. */
const BULKHEAD_FOOT = [112.5, 68];
/** (mission-rules R4) `CAMPAIGN_TWO_PLAYERS` (src/game/mission/campaign.ts): the blocked Start button's text. */
const TWO_PLAYERS = 'Campaign missions need exactly two players';
/** (mission-rules R1) `PROTECTED_LINE` (src/game/mission/missionText.ts) and the named-target rule's `breakLine`. */
const PROTECTED_LINE = 'The man you need is down. Back to the section checkpoint.';
const NAMED_LINE = 'Named target broken. Back to the section checkpoint.';
/** tgc-3's `text` and `boltText` (src/world/maps/tallowWharfMissions.ts). */
const READING_LINE = 'Take the grey coat with the black umbrella in the reading room loft';
const MOVED_LINE = "Take the grey coat with the black umbrella in the clock-mender's back loft";
let failed = false;
const all = [];

/**
 * Host a room on a page with `hostParams`, join it from a second page with `clientParams` (`hostAndJoin`, e2e-net-lib.mjs, with
 * its own URL params on each page: the host gets `mission=`, the client never does).
 */
async function join(hostParams, clientParams) {
  const { browser, ctx, page: A, errors: eA } = await launch({ url, params: hostParams, viewport: NET_VIEWPORT });
  try {
    await A.click('.main-menu .btn:has-text("Co-op")');
    await A.click('.btn:has-text("Host a room")');
    await until(A, () => !!document.querySelector('.lobby-screen') && !!window.__coop, null, 15000, 'host lobby');
    // (mission-rules R7, R4) the lobby on Sector Ops, Tallow Wharf, Realistic; the host alone cannot start the campaign:
    // `startMatch()` returns null, the room stays in the lobby and the Start button carries the blocked text
    await A.evaluate(() => window.__coop.session.setSettings('sector', 'tallowWharf', 'realistic', ''));
    const alone = await A.evaluate(() => { const s = window.__coop.session; return { start: s.startMatch(), phase: s.phase, n: s.players.size }; });
    assert(alone.start === null && alone.phase === 'lobby' && alone.n === 1, `the host alone cannot start: startMatch() null, the room in the lobby (${JSON.stringify(alone)})`);
    await until(A, (t) => { const b = document.querySelector('.lobby-actions .btn[data-key="start"]'); return !!b && b.classList.contains('blocked') && b.dataset.locked === t; }, TWO_PLAYERS, 8000, 'the Start button shows the blocked text');
    assert(true, `the host's Start button is blocked: "${TWO_PLAYERS}"`);
    const code = await A.evaluate(() => window.__coop.session.code);
    const { page: B, errors: eB } = await openPage(ctx, url, clientParams);
    await B.click('.main-menu .btn:has-text("Co-op")');
    await B.click('.btn:has-text("Join with code")');
    await B.keyboard.type(code.toLowerCase());
    await B.keyboard.press('Enter');
    await until(A, (k) => window.__coop.session.players.size === k, 2, 15000, 'host sees client');
    setSimPages([A, B]);
    return { browser, A, B, errors: [eA, eB] };
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

async function run(id) {
  const tgc = id === 'threeGreyCoats';
  const tag = tgc ? 'TGC' : 'TKL';
  console.log(`\n=== ${id} ===`);
  const { browser, A, B, errors } = await join(`net=local&missions=1&coopkit=1&mission=${id}`, 'net=local&coopkit=1');
  // the host page is pumped headless while the client page is in front (e2e-sectorops `coop`, e2e-ctcourse)
  let pumping = false;
  const pump = setInterval(async () => {
    if (pumping) return;
    pumping = true;
    try {
      await A.evaluate(() => {
        if (window.__raf === undefined) {
          window.__raf = 0;
          const f = () => { window.__raf++; requestAnimationFrame(f); };
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
  const GA = (f, a) => A.evaluate(f, a);
  const GB = (f, a) => B.evaluate(f, a);
  let where = 'start';
  const sim = (ms) => waitSim(ms);

  // ---- helpers (copied from e2e-sectorops.mjs `coop`, with the storey passed where a spot is not on the ground) ----
  const holdUntil = async (P, btn, cond, what, arg, timeout = 20000) => {
    await P.evaluate((b) => window.__pad.set(b, 1), btn);
    try {
      await until(P, cond, arg, timeout, what);
    } finally {
      await P.evaluate((b) => window.__pad.set(b, 0), btn);
    }
  };
  const padReady = (P) => P.evaluate(() => { window.__pad.connect(); for (let i = 0; i < 4; i++) window.__pad.axis(i, 0); for (let i = 0; i < 17; i++) window.__pad.set(i, 0); window.__app.current.player.controller.clearCrouchToggle(); });
  const crouch = async (P) => {
    await until(P, () => !window.__app.current.player.controller.crouched, null, 3000, 'stands before the crouch').catch(() => {});
    await holdUntil(P, BTN.B, () => window.__app.current.player.controller.crouched, 'crouches');
    await sim(150);
  };
  const place = (P, x, y, z, yaw) => P.evaluate(([x, y, z, w]) => { const g = window.__app.current; g.team.end(true); g.traversal.reset(); g.player.controller.teleport(new g.player.position.constructor(x, y, z), w); g.player.cam.yaw = w; g.player.cam.pitch = 0; }, [x, y, z, yaw]);
  const moveHost = async (x, z, yaw, y = 0.1) => {
    await place(A, x, y, z, yaw);
    await until(A, ([x, z]) => { const p = window.__app.current.player.controller.pos; return Math.hypot(p.x - x, p.z - z) < 0.4; }, [x, z], 15000, `the host at ${x}, ${z}`);
  };
  const moveClient = async (x, z, yaw, y = 0.1) => {
    await GA(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
    await place(B, x, y, z, yaw);
    await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.4; }, [x, z], 15000, `the host sees the client at ${x}, ${z}`);
  };
  const hostFeet = () => GA(() => { const p = window.__app.current.player.controller.pos; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; });
  const clientFeet = () => GA(() => { const r = window.__app.current.net.remotes.values().next().value; return [+r.feet.x.toFixed(2), +r.feet.y.toFixed(2), +r.feet.z.toFixed(2)]; });
  const ownFeetB = () => GB(() => { const p = window.__app.current.player.controller.pos; return [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]; });
  /** The client crouches at the lip's spot facing it and offers; the host behind it takes the leg-up (`c.lipY` is the grip height). */
  const legUp = async (c) => {
    const [x, z] = c.spot;
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    await moveClient(x, z, c.yaw);
    await moveHost(x - fx * 0.8, z - fz * 0.8, c.yaw);
    await sim(500);
    await padReady(B);
    await padReady(A);
    await crouch(B);
    await holdUntil(B, RB, () => window.__app.current.team.state === 'offer', `${c.id}: the client offers a leg-up`);
    await until(A, () => !!window.__app.current.team.offer?.boost, null, 8000, `${c.id}: the host is offered the leg-up (a lip in the boost band)`);
    const b0 = await GA(() => window.__app.current.team.count.boosts);
    await holdUntil(A, RB, (n) => window.__app.current.team.count.boosts > n, `${c.id}: the host takes the leg-up`, b0);
    await until(A, () => { const t = window.__app.current.traversal; return t.attach.phase === 'on' && t.attach.anchor?.kind === 'ledge'; }, null, 12000, `${c.id}: the host hangs on the lip`);
    const a = await GA(() => { const an = window.__app.current.traversal.attach.anchor; return { id: an.id, grip: an.kind === 'ledge' ? an.top : an.hangHeight }; });
    assert(Math.abs(a.grip - c.lipY) < 0.1, `${c.id}: the client's leg-up puts the host on the ${c.lipY} m lip (${a.grip}, host ${JSON.stringify(await hostFeet())})`);
    await until(B, () => window.__app.current.team.state === 'none', null, 20000, `${c.id}: the booster is free again`);
    return a;
  };
  /** The hanging host pulls itself up (the pad's Y) and stands on top. */
  const pullUp = async (P, what) => {
    await holdUntil(P, BTN.Y, () => !window.__app.current.traversal.attached, `${what}: pulls up`);
    await until(P, () => window.__app.current.player.controller.grounded, null, 30000, `${what}: stands on top`);
  };
  /**
   * The pull-up (pullUp.ts): the host holder crouched at the edge offers, the client below jumps for the hands and the host's
   * catch press is made by a host step hook inside the catch window (0.18-0.44 s); `c.holder` / `c.partner` are [x, y, z].
   */
  const pull = async (c) => {
    await moveClient(c.partner[0], c.partner[2], 0, c.partner[1]);
    await moveHost(c.holder[0], c.holder[2], PI, c.holder[1]);
    await sim(500);
    await padReady(B);
    await padReady(A);
    await crouch(A);
    await watchTeam(A);
    await watchTeam(B);
    await holdUntil(A, RB, () => window.__app.current.team.state === 'pullOffer', `${c.id}: the host offers the pull-up`);
    // arm the host step hook BEFORE the client presses (5 = BTN.RB; the catch window is 0.18-0.44 s)
    const key = await onHostStep(A, (g, _a, st) => {
      const t = g.team;
      if (t.state === 'pullCatch' && t.t >= 0.22 && !st.down) {
        window.__pad.set(5, 1);
        st.down = 1;
      } else if (st.down && ++st.down > 3) {
        window.__pad.set(5, 0);
        return t.state;
      }
    });
    // (wharf e2e fix) the client presses only once it sees the holder's offer (brace + PULL_SUB 8 on the wire): a press before
    // it arrives is the client's own standing offer (the throw, or a "no room" refusal under the jetty) and the hold eats it
    await until(B, () => (window.__app.current.net?.teamMates?.() ?? []).some((m) => m.mode === 'brace' && ((m.sub ?? 0) & 8) !== 0), null, 8000, `${c.id}: the client sees the pull-up offer`);
    await holdUntil(B, RB, () => ['pullJump', 'pullHang', 'pullScramble'].includes(window.__app.current.team.state), `${c.id}: the client jumps for the hands`);
    await hostStepResult(A, key, 8000, `${c.id}: the host catches`);
    await until(A, () => (window.__app.current.team.__log ?? []).some((e) => e[1] === 'pullHaul'), null, 8000, `${c.id}: the host hauls (pullHaul)`);
    await until(B, (y) => { const k = window.__app.current.player.controller; return k.grounded && k.pos.y > y; }, c.upY, 20000, `${c.id}: the client stands on top (y > ${c.upY})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 8000, `${c.id}: the holder is free once the partner is up`);
    const h = await hostFeet();
    const cl = await clientFeet();
    assert(Math.hypot(h[0] - cl[0], h[2] - cl[2]) < 1.5 && cl[1] > c.upY, `${c.id}: the client is up beside the host (host ${JSON.stringify(h)}, client ${JSON.stringify(cl)})`);
  };
  /**
   * The partner throw (teamMoves `throwLanding`): `c.thrower` (client, standing, facing the runner) and `c.runner` (host), `c.stage` the landing box.
   * `c.dist` (a site throw, tallow-fixes A24): the site needs the thrower within 1.0 m and the throw within about 25 degrees of
   * its facing, so the host must see the client within 0.15 m of the spot; after the landing the host's `team.lastThrowDist`
   * is the site's length and the landing lies `c.dist` +- 1 m from the thrower spot.
   */
  const toss = async (c) => {
    await moveClient(c.thrower[0], c.thrower[2], PI, c.thrower[1]);
    if (c.dist !== undefined) await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.15; }, [c.thrower[0], c.thrower[2]], 15000, `${c.id}: the host sees the client within 0.15 m of the thrower spot`);
    await moveHost(c.runner[0], c.runner[2], 0, c.runner[1]);
    await sim(500);
    await padReady(B);
    await padReady(A);
    await watchTeam(A);
    await watchTeam(B);
    await holdUntil(B, RB, () => window.__app.current.team.state === 'throwOffer', `${c.id}: the client offers the throw (a standing player facing away from the drop)`);
    await until(A, () => !!window.__app.current.team.offer?.toss, null, 8000, `${c.id}: the host is offered the throw`);
    const n0 = await GA(() => window.__app.current.team.count.throws);
    await holdUntil(A, RB, (n) => window.__app.current.team.count.throws > n, `${c.id}: the host takes the throw`, n0);
    await until(A, ([x0, z0, x1, z1, y]) => { const k = window.__app.current.player.controller; const p = k.pos; return k.grounded && p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1 && Math.abs(p.y - y) < 0.3; }, [c.stage[0], c.stage[1], c.stage[2], c.stage[3], LOFT], 20000, `${c.id}: the host lands on the stage`);
    const hf = await hostFeet();
    assert(true, `${c.id}: the host landed on the stage ${JSON.stringify(hf)}`);
    if (c.dist !== undefined) {
      const td = await GA(() => window.__app.current.team.lastThrowDist);
      const ld = Math.hypot(hf[0] - c.thrower[0], hf[2] - c.thrower[2]);
      assert(Math.abs(td - c.dist) < 0.01, `${c.id}: lastThrowDist ${+td.toFixed(3)} (the site's ${c.dist})`);
      assert(Math.abs(ld - c.dist) <= 1, `${c.id}: the landing is ${ld.toFixed(2)} m from the thrower spot (${c.dist} +- 1)`);
    }
  };

  // ---- readers (host page) ----
  const dbg = () => GA(() => window.__sector.debug());
  const stepDone = (sid) => GA((sid) => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === sid)) & 1; }, sid);
  /** Wait (host page, polled from here) until step `sid` is done, as `stepDone` reads it. */
  const stepDoneWithin = async (sid, ms, what) => {
    const t0 = Date.now();
    while ((await stepDone(sid)) !== 1) {
      if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${what}`);
      await new Promise((r) => setTimeout(r, 100));
    }
  };
  const fact = (f) => GA((f) => window.__mission.runner.hasFlag(f), f);
  const doneBits = () => GA(() => window.__mission.runner.doneBits);
  const slotAlive = (k) => GA((k) => !!window.__sector['slotEnemy'][k]?.alive, k);
  /** The map's sections (read once the match runs: `__app.current` is null in the lobby). */
  let SEC = null;
  const readSectors = () => GA(() => window.__app.current.world.map.sectors.map((s) => ({
    id: s.id,
    start: s.start,
    start2: s.start2 ?? null,
    conn: s.connector ? { box: s.connector.box, floorY: s.connector.floorY, cp: s.connector.checkpoint } : null,
    ext: s.extract ? { box: s.extract.box, floorY: s.extract.floorY } : null,
    pair: s.pairGates?.[0] ? { a: s.pairGates[0].a.at, b: s.pairGates[0].b.at } : null,
    yard: s.intel?.find((n) => n.grants === 'tkl-4-yard')?.box ?? null,
  })));
  const dist = (p, x, z) => Math.hypot(p[0] - x, p[2] - z);
  const mid = (box) => [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];

  /** Use an item as its onUse does (the host page): within reach, then `onUse(it, 'local')`. */
  const useItem = async (iid, x, y, z, yaw) => {
    await moveHost(x, z, yaw, y);
    await sim(400);
    const ok = await GA((k) => { const g = window.__app.current; const it = g.interactables.items.find((q) => q.id === k); if (!it || !it.enabled) return false; it.onUse(it, 'local'); return true; }, iid);
    assert(ok, `${iid} is used`);
  };
  /** Unbolt bolt `k` of run section `sec` from its unbolting side (`boltInfo`): 0.8 m out on the `side`, facing the door. */
  const useBolt = async (sec, k) => {
    const b = (await GA(() => window.__sector.boltInfo())).find((q) => q.sec === sec && q.k === k);
    assert(!!b, `bolt ${sec}-${k} exists`);
    const y = await GA((i) => window.__app.current.interactables.items.find((q) => q.id === i)?.pos.y ?? 0, b.id);
    await useItem(b.id, b.at[0] + b.side[0] * 0.8, y + 0.1, b.at[1] + b.side[1] * 0.8, Math.atan2(-b.side[0], -b.side[1]));
    await until(A, ([s, i]) => { const q = window.__sector.boltInfo().find((x) => x.sec === s && x.k === i); return !!q && !q.shut && q.locked === false; }, [sec, k], 8000, `bolt ${sec}-${k} is drawn and its door unlocked`);
    return b;
  };
  /** The host's `boltInfo()` entry of run section `sec` whose `at` is within 0.3 m of (x, z) (undefined: none). */
  const boltAt = async (sec, x, z) => (await GA(() => window.__sector.boltInfo())).find((q) => q.sec === sec && Math.hypot(q.at[0] - x, q.at[1] - z) < 0.3);
  /** (A30) The door index on page `P` whose centre is within 1.0 m of (x, z) with its hinge under 1 m (the foot leaf, not the roof's at 8.4). */
  const footDoor = (P, x, z) => P.evaluate(([x, z]) => window.__app.current.world.doors.list.findIndex((d) => Math.hypot(d.cx - x, d.cz - z) < 1.0 && d.anchor.hinge.y < 1), [x, z]);
  /** Decoy / target interrogated: the `intel` event `revealIntel` raises, with the guard's id (gameEvents.ts). */
  const interrogate = async (k) => {
    const ok = await GA((k) => { const e = window.__sector['slotEnemy'][k]; if (!e) return false; window.__app.current.events.emit('intel', { lines: [], codes: [], eid: e.id }); return true; }, k);
    assert(ok, `slot ${k} is interrogated`);
  };
  /** The client's mirror of the host's mission: its `doneBits` equals the host's (coopClient.ts:126). */
  const mirror = async (what) => {
    for (let i = 0; ; i++) {
      const hb = await doneBits();
      try {
        await until(B, (b) => window.__app.current.net.mission.runner?.doneBits === b, hb, 8000, `the client mirrors the steps (${what})`);
        break;
      } catch (e) {
        if (i >= 1) throw e;
      }
    }
    assert(true, `the client mirrors the host's steps after ${what}`);
  };
  /** Both players into run section `i`'s connector box, then on into section `i + 1` (the cycle waits on the next lamp bake). */
  const cross = async (i, what) => {
    const c = SEC[i].conn;
    const [cx, cz] = mid(c.box);
    await moveHost(cx, cz, 0, c.floorY + 0.1);
    await moveClient(cx, cz, 0, c.floorY + 0.1);
    await until(A, (n) => window.__sector.debug().index === n, i + 1, 60000, `${what}: the connector cycles into section ${i + 2}`);
    assert(true, `${what}: on into run section ${i + 1}`);
    await noDogs(`${what}: section ${i + 2}`);
  };
  /** (mission-rules R3 / R7) No live guard of kind `dog` (`Enemy.def.kind`) on the host. */
  const noDogs = async (what) => {
    const n = await GA(() => window.__app.current.enemyMgr.enemies.filter((e) => e.alive && e.def.kind === 'dog').length);
    assert(n === 0, `${what}: no live guard of kind dog (${n})`);
  };
  /**
   * (mission-rules R7) The host takes down the live section's guard `k` by his Enemy id (`slotEnemy[k].id`, found in
   * `enemyMgr.enemies`) with the TKL kill hook (`applyDamage`); `ko`: a knock-out (`nonLethal`: `Enemy.knockOut` sets `ko`).
   * The engine's kill test is `!alive && !ko`.
   */
  const down = async (k, ko, who) => {
    const id = await GA((k) => window.__sector['slotEnemy'][k]?.id ?? null, k);
    assert(!!id, `${who} (slot ${k}) is spawned (${id})`);
    const hit = await GA(([id, ko]) => {
      const g = window.__app.current;
      const e = g.enemyMgr.enemies.find((q) => q.id === id);
      if (!e || !e.alive) return false;
      e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1, nonLethal: ko });
      return true;
    }, [id, ko]);
    assert(hit, `${who} (${id}) is ${ko ? 'knocked out' : 'killed'} by the host`);
    await until(A, ([k, ko]) => { const e = window.__sector['slotEnemy'][k]; return !!e && !e.alive && e.ko === ko; }, [k, ko], 8000, `${who} is down (${ko ? 'ko' : 'a kill: !alive && !ko'})`);
  };
  /** The host's banners as `g.hud.banner` raised them ([title, sub], recorded from the setup on). */
  const bannerCount = (title, sub) => GA(([t, s]) => window.__banners.filter((b) => b[0] === t && b[1] === s).length, [title, sub]);
  /**
   * (mission-rules R8, HG7) The objective line (`.hud-objective`, not its hint line `.hud-objective-hint`: hud.ts) reads
   * `text` on host and client (each page's own current step, missionFeed.ts); hints are off by default, so no hint text.
   */
  const objLineIs = async (text, what) => {
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      await until(P, (t) => document.querySelector('.hud-objective:not(.hud-objective-hint)')?.textContent === t, text, 8000, `${what}: the ${who}'s objective line reads "${text}"`);
      const hint = await P.evaluate(() => document.querySelector('.hud-objective-hint')?.textContent ?? '');
      assert(hint === '', `${what}: no hint line on the ${who} with hints off (${JSON.stringify(hint)})`);
    }
    assert(true, `${what}: the objective line reads "${text}" on host and client`);
  };
  /**
   * (mission-rules R8, HG8) Field Terminal > Objectives on page `P` (pauseScreen.ts `ObjectivesScreen`): its rows as
   * `{ cls, label, ctr }` (`obj-note` / `obj-done` / `obj-current` / `obj-todo`; the counter "Rule" / "Done" / "Current" /
   * "To do"), then Back and Resume (in co-op the match keeps running behind the menu).
   */
  const fieldRows = async (P, who) => {
    await P.evaluate(() => window.__app.current.pause());
    await until(P, () => !!document.querySelector('.pause-screen [data-key="objectives"]'), null, 8000, `the ${who}'s pause menu opens`);
    await P.evaluate(() => { const b = document.querySelector('.pause-screen [data-key="objectives"]'); window.__app.nav.focus(b); b.click(); });
    await until(P, () => document.querySelectorAll('.objectives-screen .ms-item').length > 0, null, 8000, `the ${who}'s Objectives screen opens`);
    const rows = await P.evaluate(() => [...document.querySelectorAll('.objectives-screen .ms-item')].map((b) => ({ cls: [...b.classList].find((c) => c.startsWith('obj-')) ?? '', label: b.querySelector('.btn-label')?.textContent ?? '', ctr: b.querySelector('.ms-ctr')?.textContent ?? '' })));
    await P.evaluate(() => document.querySelector('.objectives-screen [data-legend="back"]').click());
    await until(P, () => !!document.querySelector('.pause-screen [data-key="resume"]') && !document.querySelector('.objectives-screen'), null, 8000, `the ${who} is back on the pause menu`);
    await P.evaluate(() => document.querySelector('.pause-screen [data-key="resume"]').click());
    await until(P, () => !document.querySelector('.pause-screen'), null, 8000, `the ${who}'s pause menu closes`);
    // (R8 polish) and the game is no longer menu-paused (gameState.ts `menuPaused`) before the run goes on
    await until(P, () => !window.__app.current.menuPaused, null, 8000, `the ${who}'s game is no longer menu-paused`);
    return rows;
  };
  /** The current step reads `text` on both objective lines, and both field menus list the rule first and that step current. */
  const currentIs = async (text, what) => {
    await objLineIs(text, what);
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      const rows = await fieldRows(P, who);
      const cur = rows.filter((r) => r.cls === 'obj-current');
      assert(rows[0]?.cls === 'obj-note' && rows[0]?.ctr === 'Rule' && cur.length === 1 && cur[0].label === text && cur[0].ctr === 'Current', `${what}: the ${who}'s Objectives list the rule first and "${text}" current (${JSON.stringify(rows)})`);
    }
  };
  /**
   * (mission-rules R8) The host's current mission step line (missionFeed `missionCurrentStep` for the whole team: the
   * campaign's steps are team `all`, so the line is the step's text, or its `boltText` once its spook fact is held).
   */
  const currentLine = () => GA(() => {
    const r = window.__mission.runner;
    const sec = r.def.sections[r.section];
    const i = r.def.steps.findIndex((q, k) => q.section === sec && !q.optional && r.isOpen(k));
    const q = r.def.steps[i];
    if (!q) return null;
    return q.kind === 'interrogate' && q.bolt && q.boltText && r.hasFlag(`${q.id}-spooked`) ? q.boltText : q.text;
  });
  /** The run's guard `k` of the live section: [x, y, z], alive, ko (null: none). */
  const guardAt = (k) => GA((k) => { const e = window.__sector['slotEnemy'][k]; return e ? { p: [e.pos.x, e.pos.y, e.pos.z], alive: e.alive, ko: e.ko } : null; }, k);
  /** A restart's hold is over: no restart pending (`SectorMission.holding`) and the rules live again (`RuleTracker.held`). */
  const holdOver = (what) => until(A, () => !window.__mission.holding && !window.__mission.tracker.held, null, 8000, `${what}: the restart hold is over`);
  /**
   * The break line, the restart and the carry-on state (section `i`; `cp` the checkpoint the restart returns to); `n`: the
   * run's restarts (`SectorMode.restarts`) and the mission's (`SectorMission.ruleRestarts`) after this one.
   */
  const restarted = async (i, cp, what, n = 1) => {
    await until(A, (n) => window.__sector.debug().restarts === n, n, 15000, `${what}: the section restarts`);
    const d = await dbg();
    assert(d.index === i && d.phase === 'objective' && d.mission.ruleRestarts === n, `${what}: back at the section's start, the mission going on (${JSON.stringify([d.index, d.phase, d.mission])})`);
    await until(A, ([x, z]) => { const p = window.__app.current.player.controller.pos; const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(p.x - x, p.z - z) < 2.5 && Math.hypot(r.feet.x - x, r.feet.z - z) < 2.5; }, [cp.x, cp.z], 8000, `${what}: both players at the checkpoint ${cp.x}, ${cp.z}`);
  };
  /** (mission-rules R8) The objective line on host and client is the mission's current step, and so is the field menu's. */
  const clientHud = async (what) => {
    const line = await currentLine();
    assert(!!line, `${what}: the mission has a current step (${line})`);
    await currentIs(line, what);
  };
  /** Both in the W4 extraction box: the mission is finished, doneBits as expected, the results screen reads VICTORY. */
  const extract = async (mask, want, what) => {
    where = `${what}: extraction`;
    await until(A, () => window.__sector.debug().phase === 'extract', null, 8000, `${what}: the extraction is open`);
    const e = SEC[3].ext;
    const [ex, ez] = mid(e.box);
    await moveHost(ex, ez, 0, e.floorY + 0.1);
    await moveClient(ex, ez, 0, e.floorY + 0.1);
    await until(A, () => window.__mission.runner.finished, null, 20000, `${what}: the mission is finished`);
    const bits = await doneBits();
    assert((bits & mask) === want, `${what}: the steps done are the mission's own, the optional one clear (doneBits ${bits})`);
    await until(B, () => window.__app.current.net.mission.runner?.finished === true, null, 8000, `${what}: the client's runner is finished too`);
    await A.waitForSelector('.results-screen', { timeout: 15000 });
    const res = await GA(() => document.querySelector('.results-title')?.textContent ?? '');
    assert(res === 'VICTORY', `${what}: the op ends cleared (${res})`);
  };

  // ---- (tallow S4, J9) the shutters (src/game/kit/shutter.ts, src/world/shutterDoor.ts) ----
  /**
   * Page `P`'s shutter `id`: the kit device (`g.team.devices`: phase, open, user, visible, opens, noticed) and its curtain slot
   * (`world.shutters.slots`, private, read at runtime: open, bottom), with the page's team state.
   */
  const shutterState = (P, id) => P.evaluate((id) => {
    const g = window.__app.current;
    const d = g.team.devices.list.find((q) => q.id === id && q.kind === 'shutter');
    const s = g.world.shutters?.slots?.find((q) => q.spec.id === id);
    return {
      dev: d ? { x: d.x, y: d.y, z: d.z, yaw: d.yaw, phase: d.phase, open: d.open, user: d.user, visible: d.visible, opens: d.opens, noticed: d.noticed } : null,
      slot: s ? { open: s.open, bottom: s.bottom } : null,
      state: g.team.state,
    };
  }, id);
  /** `shutterLocal`'s `across` of (x, z) from shutter `id` (the host's device): (x - d.x) sin yaw + (z - d.z) cos yaw, + = the normal's side. */
  const side = async (id, x, z) => {
    const d = (await shutterState(A, id)).dev;
    if (!d) throw new Error(`no shutter device ${id} on the host`);
    return (x - d.x) * Math.sin(d.yaw) + (z - d.z) * Math.cos(d.yaw);
  };
  /** Page `P`'s `across` from shutter `id` of its own player (`self`) or of its remote (the host's view of the client). */
  const ACROSS_ON = ([id, self]) => {
    const g = window.__app.current;
    const d = g.team.devices.list.find((q) => q.id === id);
    const p = self ? g.player.controller.pos : g.net.remotes.values().next().value.feet;
    return (p.x - d.x) * Math.sin(d.yaw) + (p.z - d.z) * Math.cos(d.yaw);
  };
  const acrossOn = (P, id, self) => P.evaluate(ACROSS_ON, [id, self]);
  /**
   * A pad walk on page `P` to (x, z) (the axis pattern of e2e-move.mjs:172): every ~100 ms `cam.yaw` toward the target
   * (atan2(dx, dz)) with the stick forward (`__pad.axis(1, -1)`, eased under 1.5 m) until within 0.35 m; the stick is always
   * zeroed in `finally`. Then the host sees its player (or the client, its remote feet) there.
   */
  const walkTo = async (P, x, z, what, timeout = 12000) => {
    const t0 = await P.evaluate(() => window.__app.current.time);
    const wall0 = Date.now();
    try {
      for (;;) {
        const r = await P.evaluate(([x, z]) => {
          const g = window.__app.current;
          const p = g.player.controller.pos;
          const dx = x - p.x;
          const dz = z - p.z;
          const d = Math.hypot(dx, dz);
          window.__pad.axis(0, 0);
          if (d < 0.35) window.__pad.axis(1, 0);
          else {
            g.player.cam.yaw = Math.atan2(dx, dz);
            window.__pad.axis(1, -Math.max(0.5, Math.min(1, d / 1.5)));
          }
          return { d, t: g.time };
        }, [x, z]);
        if (r.d < 0.35) break;
        if ((r.t - t0) * 1000 > timeout || Date.now() - wall0 > Math.max(timeout * 4, 60000)) throw new Error(`timed out waiting for ${what}: the walk to ${x}, ${z} (${r.d.toFixed(2)} m left)`);
        await new Promise((res) => setTimeout(res, 100));
      }
    } finally {
      await P.evaluate(() => { window.__pad.axis(0, 0); window.__pad.axis(1, 0); }).catch(() => {});
    }
    if (P === B) await until(A, ([x, z]) => { const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(r.feet.x - x, r.feet.z - z) < 0.5; }, [x, z], 8000, `${what}: the host sees the client at ${x}, ${z}`);
    else await until(A, ([x, z]) => { const p = window.__app.current.player.controller.pos; return Math.hypot(p.x - x, p.z - z) < 0.5; }, [x, z], 8000, `${what}: the host at ${x}, ${z}`);
    assert(true, `${what}: walked with the pad to ${x}, ${z}`);
  };
  /** The host alone at (x, z) facing the shut shutter walks into it for 1.5 s sim: grounded, still on his side, |across| >= 0.2. */
  const loneWalk = async (id, x, z, yaw, what) => {
    await moveHost(x, z, yaw);
    await padReady(A);
    await sim(300);
    const a0 = await side(id, x, z);
    try {
      await GA((w) => { window.__app.current.player.cam.yaw = w; window.__pad.axis(0, 0); window.__pad.axis(1, -1); }, yaw);
      await sim(1500);
    } finally {
      await GA(() => { window.__pad.axis(0, 0); window.__pad.axis(1, 0); }).catch(() => {});
    }
    await sim(300);
    const grounded = await GA(() => window.__app.current.player.controller.grounded);
    const p = await hostFeet();
    const a = await side(id, p[0], p[2]);
    assert(grounded && Math.sign(a) === Math.sign(a0) && Math.abs(a) >= 0.2, `${what}: a lone player walking into the closed shutter stays on his side (across ${a.toFixed(2)})`);
  };
  /** Both pages show shutter `id` at its gap: the device open >= 0.85 (`SHUTTER.crawlGap`) and the curtain body's bottom >= 0.75. */
  const atGap = async (id, what) => {
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      await until(P, (id) => { const g = window.__app.current; const d = g.team.devices.list.find((q) => q.id === id); const s = g.world.shutters?.slots?.find((q) => q.spec.id === id); return !!d && !!s && d.open >= 0.85 && s.bottom >= 0.75; }, id, 8000, `${what}: the ${who} shows ${id} at its gap`);
    }
  };
  /**
   * Hold and crawl with pad input (`c = { id, holder: 'client' | 'host', hold: [x, z, yaw], crawl: [x, z, yaw], during?, note? }`):
   * each placed on its own near side (the only move before the crawl), the holder grips (RB) and holds, both pages at the gap,
   * `during` (the notice check), the crawler crouches and crawls (RB) to the far side, the holder lets go (RB), both curtains shut.
   */
  const shutterCross = async (c) => {
    const hostHolds = c.holder === 'host';
    const H = hostHolds ? A : B;
    const C = hostHolds ? B : A;
    const crawler = hostHolds ? 'client' : 'host';
    const [hx, hz, hyaw] = c.hold;
    const [cx, cz, cyaw] = c.crawl;
    if (hostHolds) {
      await moveHost(hx, hz, hyaw);
      await moveClient(cx, cz, cyaw);
    } else {
      await moveClient(hx, hz, hyaw);
      await moveHost(cx, cz, cyaw);
    }
    // each one's near side: the crawler's start side (TGC W4: the holder is on the other one, shed two)
    const nearH = Math.sign(await side(c.id, hx, hz));
    const near = Math.sign(await side(c.id, cx, cz));
    assert(nearH !== 0 && near !== 0, `${c.id}: the holder and the crawler start off the plane (${nearH}, ${near})`);
    await sim(500);
    await padReady(A);
    await padReady(B);
    await holdUntil(H, RB, () => window.__app.current.team.state === 'shutterOffer', `${c.id}: the ${c.holder} grips the shutter`);
    await until(H, () => window.__app.current.team.state === 'shutterHold', null, 6000, `${c.id}: the ${c.holder} holds it at the gap`);
    await atGap(c.id, c.id);
    await c.during?.();
    await crouch(C);
    await holdUntil(C, RB, () => window.__app.current.team.state === 'crawlUnder', `${c.id}: the ${crawler} crawls under`);
    await until(C, () => window.__app.current.team.state === 'none', null, 8000, `${c.id}: the ${crawler}'s crawl ends`);
    // the host reads the crawler (its own player, or the client's remote feet); a client crawler's own page too
    // (`until` sends the condition as text: the across is written out, as ACROSS_ON)
    await until(A, ([id, self, near]) => {
      const g = window.__app.current;
      const d = g.team.devices.list.find((q) => q.id === id);
      const p = self ? g.player.controller.pos : g.net.remotes.values().next().value.feet;
      return ((p.x - d.x) * Math.sin(d.yaw) + (p.z - d.z) * Math.cos(d.yaw)) * near <= -0.5;
    }, [c.id, !hostHolds, near], 8000, `${c.id}: the host sees the ${crawler} on the far side`);
    const ca = await acrossOn(A, c.id, !hostHolds);
    if (hostHolds) {
      const own = await acrossOn(B, c.id, true);
      assert(own * near <= -0.5, `${c.id}: the client's own page has it on the far side (across ${own.toFixed(2)})`);
    }
    const ha = await acrossOn(A, c.id, hostHolds);
    assert(ha * nearH > 0, `${c.id}: the ${c.holder} is still on the near side (across ${ha.toFixed(2)})`);
    await holdUntil(H, RB, () => window.__app.current.team.state !== 'shutterHold', `${c.id}: the ${c.holder} lets go`);
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      await until(P, (id) => { const g = window.__app.current; const d = g.team.devices.list.find((q) => q.id === id); const s = g.world.shutters?.slots?.find((q) => q.spec.id === id); return !!d && !!s && d.phase === 'closed' && d.open === 0 && s.open === 0 && s.bottom === 0; }, c.id, 4000, `${c.id}: the ${who}'s shutter is shut again`);
    }
    assert(true, `${c.id}: ${c.holder} held, ${crawler} crawled through (across ${ca.toFixed(2)}), both curtains at the gap then shut${c.note ?? ''}`);
  };
  /**
   * (A27, the lead's P1 add) After a section restart: on both pages every shutter shut (phase closed, open 0, no user, not
   * visible, the curtain at 0) and no team move; then 3 s sim on the host, sampled every ~100 ms: no shutter noticed and no live
   * guard `heard` with his stimulus within 1.5 m of a shutter. The largest `open` the host saw is printed.
   */
  const shuttersBack = async (what) => {
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      await until(P, () => {
        const g = window.__app.current;
        const ds = g.team.devices.list.filter((d) => d.kind === 'shutter');
        const ss = g.world.shutters?.slots ?? [];
        return ds.length === 2 && ss.length === 2 && ds.every((d) => d.phase === 'closed' && d.open === 0 && d.user === '' && !d.visible) && ss.every((s) => s.open === 0 && s.bottom === 0) && g.team.state === 'none';
      }, null, 8000, `${what}: every shutter shut and nobody at a bar on the ${who}`);
    }
    const t0 = await GA(() => window.__app.current.time);
    const wall0 = Date.now();
    let big = 0;
    for (;;) {
      const s = await GA(() => {
        const g = window.__app.current;
        const ds = g.team.devices.list.filter((d) => d.kind === 'shutter');
        const heard = g.enemyMgr.enemies.filter((e) => e.alive && e.heard && ds.some((d) => Math.hypot(e.stimulus[0] - d.x, e.stimulus[1] - d.z) < 1.5)).map((e) => e.id);
        return { t: g.time, open: Math.max(0, ...ds.map((d) => d.open)), noticed: ds.filter((d) => d.noticed !== -1).map((d) => `${d.id} ${d.noticed}`), heard };
      });
      big = Math.max(big, s.open);
      if (s.noticed.length || s.heard.length) assert(false, `${what}: a shutter was noticed after the restart (noticed ${JSON.stringify(s.noticed)}, heard at a shutter ${JSON.stringify(s.heard)}, largest open seen ${big.toFixed(2)})`);
      if (s.t - t0 >= 3 || Date.now() - wall0 > 60000) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(true, `${what}: both curtains shut on host and client, no lift run, no guard noticed a shutter for 3 s (largest open seen ${big.toFixed(2)})`);
  };
  /**
   * The notice set-up for shutter `id`: the live, not alerted guard of the live section's slot `k` (the first slot from `k`
   * whose feet are within 1 m of the shutter's floor; one `hear` can reach: not melee, not passive) placed at `at` facing the
   * shutter (`yaw`, which `noticeOpenShutters` reads), `heard` / `hasStimulus` false, `meter` 0; every other live guard within
   * 12 m (plan) of the shutter faces directly away (the facing rule fails: nobody else takes the one notice). Guards stay frozen.
   */
  const noticeCheck = async (id, k, at) => {
    const r = await GA(([id, k, at]) => {
      const g = window.__app.current;
      const d = g.team.devices.list.find((q) => q.id === id);
      const slots = window.__sector['slotEnemy'];
      let e = null;
      for (let j = k; j < slots.length && !e; j++) {
        const q = slots[j];
        if (q && q.alive && !q.alerted && !q.passive && !q.def.melee && Math.abs(q.pos.y - d.y) < 1) e = q;
      }
      if (!e) return null;
      e.pos.set(at[0], e.pos.y, at[1]);
      e.yaw = Math.atan2(d.x - at[0], d.z - at[1]);
      e.heard = false;
      e.hasStimulus = false;
      e.meter = 0;
      const away = [];
      for (const o of g.enemyMgr.enemies) {
        if (o === e || !o.alive) continue;
        const dx = o.pos.x - d.x;
        const dz = o.pos.z - d.z;
        if (Math.hypot(dx, dz) > 12) continue;
        o.yaw = Math.atan2(dx, dz);
        away.push(o.id);
      }
      return { id: e.id, slot: slots.indexOf(e), away, pending: window.__sector['pending']?.length ?? -1 };
    }, [id, k, at]);
    assert(!!r, `${id}: a live, calm guard of the section (slot ${k} on) to notice it`);
    assert(true, `${id}: guard ${r.id} (slot ${r.slot}) placed at ${JSON.stringify(at)} facing the shutter; turned away: ${JSON.stringify(r.away)}; guards not yet spawned: ${r.pending}`);
    return r.id;
  };
  /** 1.5 s sim with shutter `id` shut: the host device's `opens` unchanged and `noticed` -1. */
  const shutQuiet = async (id, what) => {
    const o0 = (await shutterState(A, id)).dev.opens;
    await sim(1500);
    const s = (await shutterState(A, id)).dev;
    assert(s.opens === o0 && s.noticed === -1 && !s.visible, `${what}: shut, nobody notices it (opens ${s.opens}, noticed ${s.noticed})`);
  };
  /**
   * `shutterCross`'s `during` for the notice: the host device's `noticed === opens` within 4 s, then guard `gid` has `heard`,
   * his stimulus within 0.05 m of (sx, sz) (`SHUTTER_LOOK_OFF` 0.6 off the plane on his own side, S2 fix1) and `meter` > 0.
   */
  const noticeDuring = (id, gid, sx, sz, tagLine, room) => async () => {
    await until(A, (id) => { const d = window.__app.current.team.devices.list.find((q) => q.id === id); return !!d && d.opens > 0 && d.noticed === d.opens; }, id, 4000, `${tagLine}: a guard notices the held shutter`);
    const e = await GA((gid) => { const e = window.__app.current.enemyMgr.enemies.find((q) => q.id === gid); return e ? { heard: e.heard, sx: e.stimulus[0], sz: e.stimulus[1], meter: e.meter, x: e.pos.x, z: e.pos.z } : null; }, gid);
    assert(!!e, `${tagLine}: guard ${gid} is there`);
    const own = Math.sign(await side(id, e.x, e.z)) === Math.sign(await side(id, e.sx, e.sz));
    assert(e.heard && Math.hypot(e.sx - sx, e.sz - sz) <= 0.05 && e.meter > 0 && own, `${tagLine} notice: guard ${gid} heard the held shutter at (${e.sx.toFixed(2)}, ${e.sz.toFixed(2)}), on his own side (${room}); shut: no notice (meter ${e.meter.toFixed(2)})`);
  };

  try {
    // (mission-rules R7) the start with the client in. On this base a room made with "Host a room" does not start on its own
    // once the partner is in (only "Resume hosting" holds a blocked start), so the client readies and the host starts, as
    // `startMode` (e2e-net-lib.mjs) does, with the lobby kept on Realistic (`startMode` would set Normal)
    if ((await GA(() => window.__coop.session.phase)) === 'lobby') {
      await GB(() => window.__coop.session.setReady(true));
      await until(A, () => window.__coop.session.allReady && window.__coop.session.campaignBlock === null, null, 8000, 'the client is ready, the campaign start unblocked');
      const st = await GA(() => window.__coop.session.startMatch());
      assert(!!st && st.mode === 'sector' && st.map === 'tallowWharf' && st.difficulty === 'realistic', `two players in: the host starts the campaign on Realistic (${JSON.stringify(st)})`);
    } else console.log('  the match started on its own once the client was in');
    for (const P of [A, B]) await until(P, () => window.__app.current?.opts?.mode === 'sector' && !!window.__app.current.net && !window.__app.current.isEnded, null, LOAD_MS, 'sector match on both pages');
    await until(A, () => [...window.__app.current.net.remotes.values()].every((r) => r.state), null, 15000, 'client state reaches the host');
    await GA(() => { window.__app.current.target.damageMul = 0; for (const r of window.__app.current.net.remotes.values()) r.damageMul = 0; });
    // (mission-rules R5, G126) a campaign mission's revives: 2 at every difficulty (CoopHost `revivesLeft`)
    const rv = await GA(() => ({ diff: window.__coop.session.difficulty, left: window.__app.current.net.revivesLeft() }));
    assert(rv.diff === 'realistic' && rv.left === 2, `net.revivesLeft() is 2 with the lobby on Realistic (${JSON.stringify(rv)})`);
    // the host's setup (as e2e-sectorops-mission): guards frozen (never ?sectorGuards=: it would drop Teale, the decoys, the clerk)
    await GA(() => {
      const g = window.__app.current;
      g.enemyMgr.update = () => {};
      if (g.security) g.security.fixedUpdate = () => {};
      window.__mev = [];
      g.events.on('missionEvent', (e) => window.__mev.push(e));
      // (mission-rules R7) every banner the host raises (the section banners, SECTION RESTART, RULE BROKEN)
      window.__banners = [];
      const banner = g.hud.banner.bind(g.hud);
      g.hud.banner = (title, sub = '', ms) => { window.__banners.push([title, sub]); banner(title, sub, ms); };
    });
    // (R7 polish) the client's banners too: the host relays each one (coopHost `hud.banner` -> a `banner` event) and the
    // client shows it (coopClient `case 'banner'`)
    await GB(() => {
      const g = window.__app.current;
      window.__banners = [];
      const banner = g.hud.banner.bind(g.hud);
      g.hud.banner = (title, sub = '', ms) => { window.__banners.push([title, sub]); banner(title, sub, ms); };
    });
    SEC = await readSectors();
    // (tallow S4, S1 check-a P1) the shutters' world wiring: the host's curtains (spec order) shut on its nav grid, none on the
    // client (no grid there); on both pages each shutter is one always-shut light leaf past the doors and one kit device
    const wire = [];
    for (const [P, who] of [[A, 'host'], [B, 'client']]) {
      wire.push(await P.evaluate((who) => {
        const w = window.__app.current.world;
        return { who, ids: (w.shutters?.slots ?? []).map((s) => s.spec.id), nav: w.shutters?.navClosures.length ?? -1, light: w.lightDoors.length, doors: w.doors.list.length, devs: window.__app.current.team.devices.list.filter((d) => d.kind === 'shutter').length };
      }, who));
    }
    const [wh, wc] = wire;
    assert(JSON.stringify(wh.ids) === JSON.stringify(['w1-shutter', 'w4-shutter']) && wh.nav === 2 && wc.nav === 0 && wire.every((q) => q.light === q.doors + 2 && q.devs === 2), `the shutters are wired: host slots ${JSON.stringify(wh.ids)}, nav closures host ${wh.nav} / client ${wc.nav}, light leaves = doors + 2 and two shutter devices on both pages (${JSON.stringify(wire)})`);
    await padReady(A);
    await padReady(B);
    await noDogs(`${tag} start`);

    if (tgc) {
      // ================= Three Grey Coats: W1 -> W2 -> W3 -> W4 =================
      where = 'TGC W1 start';
      const d0 = await dbg();
      assert(d0.index === 0 && d0.mission && d0.mission.id === 'threeGreyCoats' && d0.mission.section === 0, `TGC starts on W1 (${JSON.stringify([d0.index, d0.mission])})`);
      assert((await B.evaluate(() => new URLSearchParams(location.search).get('mission'))) === null, 'the client URL has no mission=');
      const s0 = SEC[0].start2;
      const cf0 = await ownFeetB();
      assert(dist(cf0, s0.x, s0.z) < 2, `the client starts within 2 m of W1 start2 (${JSON.stringify(cf0)})`);
      await clientHud(`${tag} start`);

      where = 'TGC W1';
      await legUp({ id: 'w1-lip-steps', spot: [4, 13.5], yaw: 0, lipY: 4.5 });
      await pullUp(A, 'W1 C1');
      const hf1 = await hostFeet();
      assert(hf1[1] > 4.3, `W1 C1: the host stands on the gallery lip (${JSON.stringify(hf1)})`);
      // tgc-1: the three coats under the clock
      await moveHost(22, 41, 0);
      await sim(1500);
      assert((await fact('tgc-1')) && (await stepDone('tgc-1')) === 1, 'tgc-1: the coats are found (fact and step)');
      // tgc-2: the tally book on the gallery, then the tea-stall talk
      await useItem('c-sintel-0-1', 3.6, 4.6, 50.6, -PI / 2);
      // (E8 spot audit) 0.75 m north of the old (18.75, 7.75), which stood inside the stall's urn crates (x 18-19.6, z 6.6-8,
      // since GB1); still in the tea-stall overhear box (x 17.5-20, z 6.5-9)
      await moveHost(18.75, 8.5, 0);
      await sim(5000);
      assert((await stepDone('tgc-2')) === 1 && (await fact('tgc-courier')), 'tgc-2: the courier is learned (step and fact)');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 8000, 'W1: the exit opens');
      // (tallow S4, J9) C2: the fish hall shutter is the section's forced exit (SPEC :226); SPEC C2 "B holds, A crawls, then A
      // lifts the bar for B": the client holds, the host crawls, draws the hall back door's bar (W1 bolt 1) and the client walks
      // through it. Nobody is placed across the shutter: the host crawls, the client comes through the door.
      where = 'TGC W1 shutter';
      await loneWalk('w1-shutter', 22, 56.8, 0, 'W1 C2');
      // the notice: a guard on the hall side (the -normal side, where the pre-fix look point was wrong), 4.6 m off
      const g1 = await noticeCheck('w1-shutter', 0, [22, 53]);
      await shutQuiet('w1-shutter', 'W1 C2 before the lift');
      await shutterCross({ id: 'w1-shutter', holder: 'client', hold: [21.2, 57.4, 0], crawl: [22.8, 57.3, 0], during: noticeDuring('w1-shutter', g1, 22, 57.4, 'W1', 'hall') });
      // the bar: W1 bolt 1, unbolted from the passage side (useBolt's spot is there: no shutter is crossed), then the door
      // opened on both pages (the E8 pawn-door lines' pattern)
      const bb = await boltAt(0, 30, 58);
      assert(!!bb && bb.k === 1, `the hall back door is W1 bolt 1 (${JSON.stringify(bb)})`);
      const hb = await useBolt(0, bb.k);
      await GA((i) => { const w = window.__app.current.world; w.doors.open(w.doors.list[i], 'quiet'); }, hb.door);
      await until(B, (i) => !window.__app.current.world.doors.list[i].anchor.locked, hb.door, 8000, 'the hall back door is unlocked on the client');
      await GB((i) => { const w = window.__app.current.world; w.doors.open(w.doors.list[i], 'quiet'); }, hb.door);
      await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.9, hb.door, 8000, 'the hall back door is open on the host');
      await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.9, hb.door, 8000, 'the hall back door is open on the client');
      // the client walks from the bar along the hall to the back door and through it (the spot audit proves the legs clear)
      await padReady(B);
      await walkTo(B, 30, 56.8, 'W1 C2: the client to the hall back door');
      await walkTo(B, 30, 59.3, 'W1 C2: the client through the hall back door');
      const w1h = await hostFeet();
      const w1c = await clientFeet();
      assert(w1h[2] > 58.3 && w1c[2] > 58.3, `W1 C2: the host crawled, drew the bar, the client came through the back door; no teleport across the shutter (host ${JSON.stringify(w1h)}, client ${JSON.stringify(w1c)})`);
      await cross(0, 'W1 connector');
      await mirror('W1');

      where = 'TGC W2 throw';
      const dw2 = await dbg();
      assert(dw2.index === 1 && dw2.mission.section === 1, `W2 is the mission's second section (${JSON.stringify([dw2.index, dw2.mission])})`);
      // the pawn taking-in door is unbolted from the loft side and opened on both pages: W2 bolt 2 since A29 removed the
      // clock-mender's slot (EGRESS section 2, "W2 2 (was 3)"), found by G2's door point (51.2, 67.45)
      const pk2 = await boltAt(1, 51.2, 67.45);
      assert(!!pk2 && pk2.k === 2, `the pawn taking-in door is W2 bolt 2 (${JSON.stringify(pk2)})`);
      const pb = await useBolt(1, pk2.k);
      await GA((i) => { const w = window.__app.current.world; w.doors.open(w.doors.list[i], 'quiet'); }, pb.door);
      await until(B, (i) => !window.__app.current.world.doors.list[i].anchor.locked, pb.door, 8000, 'the pawn door is unlocked on the client');
      await GB((i) => { const w = window.__app.current.world; w.doors.open(w.doors.list[i], 'quiet'); }, pb.door);
      await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.9, pb.door, 8000, 'the pawn door is open on the host');
      await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.9, pb.door, 8000, 'the pawn door is open on the client');
      // (tallow-fixes A24, TD-b) the pawn throw is a site throw: the spot and length are read from the built layout, no fallback
      const ps = await GA(() => window.__app.current.world.layout.throwSites?.find((s) => Math.hypot(s.x - 51.2, s.z - 67.2) < 1.0) ?? null);
      assert(!!ps && ps.dist === 5.8 && Math.abs(ps.dx) < 0.01 && Math.abs(ps.dz - 1) < 0.01, `the pawn throw site: dist 5.8, runner -> thrower +z (${JSON.stringify(ps)})`);
      await toss({ id: 'w2-throw-pawn', thrower: [ps.x, LOFT + 0.1, ps.z], runner: [ps.x - ps.dx * 1.3, LOFT + 0.1, ps.z - ps.dz * 1.3], stage: PAWN_STAGE, dist: 5.8 });

      // (mission-rules R7, J7 PLAN section 3 R7) in this order: a decoy knocked out, Teale knocked out (the protected restart,
      // A2 / #372 M6), Teale killed (RULE BROKEN, he bolts), a decoy read (RULE BROKEN again); W2 guard indexes
      // (tallowWharfSectors.ts): 6 Teale, 7 Fenn, 8 Garrow
      const T3 = await GA(() => window.__mission.runner.stepIndex('tgc-3'));
      const bolt = await GA(() => window.__mission.runner.def.steps.find((s) => s.id === 'tgc-3').bolt);
      const table = await GA(() => { const s = window.__app.current.world.map.sectors[1].guards[6]; return [s.x, s.z]; });
      const cp2 = SEC[0].conn.cp;

      where = 'TGC W2 decoy knocked out';
      await down(7, true, 'Fenn (decoy, W2:7)');
      await sim(1000);
      const fk = await dbg();
      assert(fk.restarts === 0 && fk.mission.ruleRestarts === 0 && fk.mission.breaks === 0 && fk.mission.protectedRestarts === 0 && fk.mission.pending === false, `a decoy knocked out (Fenn): no restart, no break (${JSON.stringify(fk.mission)})`);

      where = 'TGC W2 Teale knocked out';
      await down(6, true, 'Teale (W2:6)');
      await until(A, () => window.__sector.debug().mission.protectedRestarts === 1, null, 8000, 'Teale knocked out before he talked: the protected restart');
      const pk = await dbg();
      assert(pk.mission.line === PROTECTED_LINE && pk.mission.breaks === 0 && pk.mission.spook === -1, `Teale knocked out: "${PROTECTED_LINE}", no break, no spook (${JSON.stringify(pk.mission)})`);
      assert((await bannerCount('SECTION RESTART', PROTECTED_LINE)) === 1, 'Teale knocked out: the SECTION RESTART banner');
      await until(B, (s) => window.__banners.filter((b) => b[0] === 'SECTION RESTART' && b[1] === s).length === 1, PROTECTED_LINE, 8000, 'Teale knocked out: the client gets one SECTION RESTART banner');
      assert(true, 'Teale knocked out: the SECTION RESTART banner on the client too');
      await restarted(1, cp2, 'W2 protected restart', 1);
      // (R8 polish) the restart itself raises no second SECTION RESTART banner on the client
      const cb1 = await GB((s) => window.__banners.filter((b) => b[0] === 'SECTION RESTART' && b[1] === s).length, PROTECTED_LINE);
      assert(cb1 === 1, `after the protected restart the client still has exactly one SECTION RESTART banner (${cb1})`);
      // (tallow S4, A27 cheap check) a restart leaves every shutter shut on both pages, no lift run, nothing noticed
      await shuttersBack('TGC W2 restart');
      const ak = await dbg();
      assert(ak.mission.breaks === 0 && ak.mission.spook === -1 && ak.mission.line === PROTECTED_LINE, `the protected restart: ruleRestarts 1, breaks 0, spook -1 (${JSON.stringify(ak.mission)})`);
      await until(A, (i) => window.__mission.runner.isOpen(i), T3, 8000, 'tgc-3 is open after the protected restart');
      await until(A, () => { const e = window.__sector['slotEnemy'][6]; return !!e && e.alive && !e.ko; }, null, 8000, 'Teale is back, alive and not knocked out');
      const tk = await guardAt(6);
      assert(Math.hypot(tk.p[0] - table[0], tk.p[2] - table[1]) < 1.5 && Math.hypot(tk.p[0] - bolt[0], tk.p[2] - bolt[2]) > 5, `Teale is back at his reading-room table ${JSON.stringify(table)}, more than 5 m from the bolt point ${JSON.stringify(bolt)} (${JSON.stringify(tk)})`);
      // (R8 polish) the Objectives row check inside currentIs is what gives this line check its teeth: the objective line
      // alone could still show the step from before the restart
      await currentIs(READING_LINE, 'after the protected restart');

      where = 'TGC W2 Teale killed';
      await holdOver('the protected restart');
      await down(6, false, 'Teale (W2:6)');
      await until(A, () => window.__sector.debug().mission.breaks === 1, null, 8000, 'Teale killed before he talked: the named-target rule breaks');
      const bk = await dbg();
      assert(bk.mission.line === NAMED_LINE && bk.mission.spook === T3 && bk.mission.protectedRestarts === 1, `Teale killed: "${NAMED_LINE}", spook = tgc-3 (${T3}) (${JSON.stringify(bk.mission)})`);
      assert((await bannerCount('RULE BROKEN', NAMED_LINE)) === 1, 'Teale killed: the RULE BROKEN banner');
      await restarted(1, cp2, 'W2 rule restart (Teale killed)', 2);
      const ab = await dbg();
      assert(ab.mission.breaks === 1 && ab.mission.spook === T3, `the rule restart: ruleRestarts 2, breaks 1, spook ${T3} (${JSON.stringify(ab.mission)})`);
      await until(A, (i) => window.__mission.runner.isOpen(i), T3, 8000, 'tgc-3 is open after the rule restart');
      await until(A, ([x, z]) => { const e = window.__sector['slotEnemy'][6]; return !!e && e.alive && !e.ko && Math.hypot(e.pos.x - x, e.pos.z - z) < 1; }, [bolt[0], bolt[2]], 8000, 'Teale (alive) at his bolt point after the kill');
      assert(true, `Teale (alive) stands within 1 m of the bolt point ${JSON.stringify(bolt)} (${JSON.stringify(await guardAt(6))})`);
      // (R8 polish) as above: the Objectives rows must list the moved line as the one current step
      await currentIs(MOVED_LINE, 'after the kill');

      where = 'TGC W2 decoy read';
      await holdOver('the kill restart');
      await interrogate(8);
      await until(A, () => window.__sector.debug().mission.breaks === 2, null, 8000, 'a decoy read (Garrow): the named-target rule breaks again');
      const gk = await dbg();
      assert(gk.mission.line === NAMED_LINE && gk.mission.spook === T3, `Garrow read: "${NAMED_LINE}" again, spook = tgc-3 (${JSON.stringify(gk.mission)})`);
      assert((await bannerCount('RULE BROKEN', NAMED_LINE)) === 2, 'Garrow read: a second RULE BROKEN banner');
      await restarted(1, cp2, 'W2 rule restart (Garrow read)', 3);
      assert((await dbg()).mission.breaks === 2, 'the decoy read restart: breaks 2');
      await until(A, ([x, z]) => { const e = window.__sector['slotEnemy'][6]; return !!e && e.alive && !e.ko && Math.hypot(e.pos.x - x, e.pos.z - z) < 1; }, [bolt[0], bolt[2]], 8000, 'Teale still at his bolt point after the decoy read');
      assert(true, `Teale still within 1 m of the bolt point (${JSON.stringify(await guardAt(6))})`);
      await currentIs(MOVED_LINE, 'after the decoy read (the moved line unchanged)');
      assert((await stepDone('tgc-3')) === 0 && (await fact('tgc-courier')), "the restarts keep W1's fact and have tgc-3 not done");

      where = 'TGC W2 Teale asked';
      await holdOver('the decoy read restart');
      await interrogate(6);
      await stepDoneWithin('tgc-3', 8000, 'Teale asked: tgc-3 is done');
      assert((await stepDone('tgc-3')) === 1 && (await fact('tgc-chest')) && (await dbg()).mission.breaks === 2, 'Teale asked: tgc-3 done, the chest fact held, no new break');
      assert((await stepDone('tgc-opt')) === 0, 'tgc-opt is left undone');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 8000, 'W2: the exit opens without the optional step');
      await cross(1, 'W2 connector');
      await mirror('W2');

      where = 'TGC W3';
      console.log('SKIP: W3 crossed (TKL covers it)');
      // (mission-rules R7, R2) the W3 banner names TGC's step there (none: the title only), never TKL's ledger
      await until(A, () => window.__banners.some((b) => b[0].startsWith('SECTION 3')), null, 8000, 'the W3 section banner');
      const b3 = await GA(() => window.__banners.filter((b) => b[0].startsWith('SECTION 3')).pop());
      assert(!/ledger/i.test(`${b3[0]} ${b3[1]}`), `the W3 banner on TGC does not contain "ledger" (${JSON.stringify(b3)})`);
      // (A30) Three Grey Coats fits no bulkhead foot bolt: no W3 bolt 4, none at the foot door, the door unlocked on both pages
      const w3b = (await GA(() => window.__sector.boltInfo())).filter((q) => q.sec === 2);
      assert(!w3b.some((q) => q.k === 4) && !w3b.some((q) => Math.hypot(q.at[0] - BULKHEAD_FOOT[0], q.at[1] - BULKHEAD_FOOT[1]) < 0.3), `A30 TGC: no W3 bolt 4 and none at the bulkhead foot (${JSON.stringify(w3b.map((q) => [q.k, q.at]))})`);
      for (const [P, who] of [[A, 'host'], [B, 'client']]) {
        const fd = await footDoor(P, BULKHEAD_FOOT[0], BULKHEAD_FOOT[1]);
        const lk = await P.evaluate((i) => window.__app.current.world.doors.list[i]?.anchor.locked ?? null, fd);
        assert(fd >= 0 && lk === false, `A30 TGC: the bulkhead foot door (${fd}) is unlocked on the ${who} (${lk})`);
      }
      assert(true, 'A30 TGC: no W3 bolt 4, the bulkhead foot door unlocked on host and client');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 3000, 'W3: no TGC step, the exit is open');
      await cross(2, 'W3 connector');
      await mirror('W3');

      where = 'TGC W4 clerestory';
      await legUp({ id: 'w4-lip-clerestory', spot: [79, 29.2], yaw: PI, lipY: 4.4 });
      await pullUp(A, 'W4 C9');
      const hf4 = await hostFeet();
      assert(hf4[1] > 4.2, `W4 C9: the host stands in the clerestory (${JSON.stringify(hf4)})`);
      await useItem('W4-obj', 75.5, 0.1, 15, PI);
      await until(A, () => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === 'tgc-4')) & 1; }, null, 8000, 'tgc-4 is done');
      // (wharf e2e fix) the step's events are raised on the mission's next host tick, not inside the item's use
      await until(A, () => window.__mev.some((e) => e.name === 'mindersArrive'), null, 3000, 'the minders event').catch(() => {});
      const mev = await GA(() => window.__mev.slice());
      assert(mev.some((e) => e.name === 'mindersArrive' && e.guardTag === 'tgc-minders' && e.postId === 'w4-quay'), `the minders are sent (${JSON.stringify(mev)})`);
      await mirror('W4');
      // (tallow S4, J9) C8 on Three Grey Coats: off TGC's route (SPEC :334, Three Grey Coats never needs shed two's shutter),
      // walked so both shutters are walked on this mission (lead ruling 1: a device check, not a route). After the objective
      // the host holds from shed two (moved there from shed three on the shed side) and the client crawls in from the apron,
      // so the pair leaves through shed two to the jetty.
      where = 'TGC W4 shutter';
      await shutterCross({ id: 'w4-shutter', holder: 'host', hold: [91.2, 27.4, 0], crawl: [92.8, 28.7, PI], note: ' (TGC: a device check, off the route, SPEC :334)' });
      const w4h = await hostFeet();
      const w4c = await clientFeet();
      assert(w4h[2] < 27.9 && w4c[2] < 27.9, `W4 C8 (TGC): both in shed two before the extraction (host ${JSON.stringify(w4h)}, client ${JSON.stringify(w4c)})`);
      // tgc-1, 2, 3, 4, 5 = bits 0, 1, 2, 4, 5 (value 55); tgc-opt (bit 3, value 8) clear
      await extract(63, 55, 'TGC W4');
    } else {
      // ================= Two-Key Ledger: W2 -> W3 -> W4 =================
      where = 'TKL W2 start';
      const d0 = await dbg();
      assert(d0.index === 1 && d0.mission && d0.mission.id === 'twoKeyLedger' && d0.mission.section === 0, `TKL starts on W2 (${JSON.stringify([d0.index, d0.mission])})`);
      const hs = await hostFeet();
      assert(dist(hs, SEC[1].start.x, SEC[1].start.z) < 2, `the host starts within 2 m of W2 start (${JSON.stringify(hs)})`);
      assert((await B.evaluate(() => new URLSearchParams(location.search).get('mission'))) === null, 'the client URL has no mission=');
      const s1 = SEC[1].start2;
      if (NET3) {
        const cf = await ownFeetB();
        assert(dist(cf, s1.x, s1.z) < 2.0, `the client starts in W2 without ?mission= (${JSON.stringify(cf)})`);
      } else {
        console.log('SKIP (until NET3 merges): client start section without ?mission=');
        await moveClient(s1.x, s1.z, s1.yaw);
      }
      await clientHud(`${tag} start`);

      where = 'TKL W2 pull';
      await pull({ id: 'w2-pull-east', holder: [73.5, LOFT + 0.1, 59.35], partner: [73.5, 0.1, 58.3], upY: 4.3 });
      // tkl-1: the night clerk's call, overheard from the walkway
      await moveHost(61, 60.5, PI, LOFT + 0.1);
      await sim(5000);
      assert((await stepDone('tkl-1')) === 1 && (await fact('tkl-gate-code')), 'tkl-1: the gate code is overheard (step and fact)');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 8000, 'W2: the exit opens');
      await cross(1, 'W2 connector');
      await mirror('W2');

      where = 'TKL W3 keypad and broken rule';
      const dw3 = await dbg();
      assert(dw3.index === 2 && dw3.mission.section === 1, `W3 is the mission's second section (${JSON.stringify([dw3.index, dw3.mission])})`);
      // (A30) Two-Key Ledger fits the roof bulkhead's foot bolt (W3 bolt 4): shut, its door locked on host and client (both
      // pages build the same map, so the door index is the same)
      const fb = await boltAt(2, BULKHEAD_FOOT[0], BULKHEAD_FOOT[1]);
      assert(!!fb && fb.k === 4 && fb.shut === true && fb.locked === true, `A30 TKL: the bulkhead foot is W3 bolt 4, shut and locked on the host (${JSON.stringify(fb)})`);
      await until(B, (i) => window.__app.current.world.doors.list[i]?.anchor.locked === true, fb.door, 8000, 'A30 TKL: the bulkhead foot door is locked on the client');
      assert(true, 'A30 TKL: W3 bolt 4 (the bulkhead foot) shut, its door locked on host and client');
      await useItem('c-skey-2-0', 112, 0.1, 51.1, 0);
      await until(A, () => window.__sector.debug().keypads[2][0] === true, null, 8000, 'the east gate keypad opens');
      await until(A, () => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === 'tkl-2')) & 1; }, null, 8000, 'tkl-2 is done');
      // a kill breaks No kills: the line, then the section restarts at its checkpoint and the mission goes on
      await GA(() => {
        const g = window.__app.current;
        const e = window.__sector['slotEnemy'][0];
        e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
      });
      await sim(500);
      const br = await dbg();
      assert(br.mission.breaks === 1 && br.mission.line === 'No kills broken. Back to the section checkpoint.', `a kill breaks No kills (${JSON.stringify(br.mission)})`);
      await restarted(2, SEC[1].conn.cp, 'W3 restart');
      const dk = await dbg();
      assert((await stepDone('tkl-2')) === 0 && dk.keypads[2][0] === false && (await fact('tkl-gate-code')) && (await slotAlive(0)), "the restart: tkl-2 back, the keypad locked, W2's fact kept, the watchman alive");

      where = 'TKL W3 keys';
      await sim(2200);
      await useItem('c-skey-2-0', 112, 0.1, 51.1, 0);
      await until(A, () => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === 'tkl-2')) & 1; }, null, 8000, 'tkl-2 is done again');
      // tkl-3: both strongroom keys inside the 1.0 s window, the host's turn and the client's in one host evaluate
      const pg = SEC[2].pair;
      await moveHost(pg.a[0], pg.a[1], PI);
      await moveClient(pg.b[0], pg.b[1], PI);
      await GA(() => {
        const g = window.__app.current;
        const t = window.__sector.team;
        const cid = g.playerRefsInto([])[1].id;
        t.turnKey(2, 0, true, 'local');
        t.turnKey(2, 0, false, cid);
      });
      await until(A, () => window.__sector.debug().pairGates[2][0] === true, null, 8000, 'the strongroom gate opens');
      await until(A, () => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === 'tkl-3')) & 1; }, null, 8000, 'tkl-3 is done');
      // (wharf e2e fix) the step's events are raised on the mission's next host tick
      await until(A, () => window.__mev.some((e) => e.name === 'telltale'), null, 3000, 'the telltale event').catch(() => {});
      const mev = await GA(() => window.__mev.slice());
      assert(mev.some((e) => e.name === 'telltale' && e.guardTag === 'w3-lodge-porter' && e.postId === 'w3-passage'), `the lodge porter is sent (${JSON.stringify(mev)})`);

      where = 'TKL W3 chute';
      // the ledger, then the chute: leg-up C7, the hatch from inside, the drop into the coal yard
      await useItem('W3-obj', 101, 0.1, 61.5, 0);
      await legUp({ id: 'w3-lip-chute', spot: [97.1, 53.2], yaw: PI, lipY: 4.4 });
      await pullUp(A, 'W3 C7');
      const hf3 = await hostFeet();
      assert(hf3[1] > 4.2, `W3 C7: the host stands in the coal chute (${JSON.stringify(hf3)})`);
      await useBolt(2, 0);
      // into the coal yard (inside the tkl-4-yard overhear box: x stays 0.3 m inside its east edge)
      const yx = Math.min(97.1, Math.max(SEC[2].yard[0], SEC[2].yard[2]) - 0.3);
      await moveHost(yx, 48.5, PI);
      await sim(1500);
      assert((await stepDone('tkl-4')) === 1, 'tkl-4: the ledger is out and the yard heard (step)');
      await useBolt(2, 1);
      await moveClient(90, 46, 0);
      await until(A, () => window.__sector.debug().phase === 'connector', null, 8000, 'W3: the exit opens');
      await cross(2, 'W3 connector');
      await mirror('W3');

      // (tallow S4, J9) C8: shed two's shutter from the apron / back lane (SPEC C8 "B holds, A crawls"): the client holds, the
      // host crawls into shed two (then the jetty pull's holder), after a lone walk into it and A27's held restart
      where = 'TKL W4 shutter';
      await loneWalk('w4-shutter', 92, 29.4, PI, 'W4 C8');
      // A27 (lead ruling 2: TKL's rule is noKills, mission scope; any kill restarts the current section): the client lifts and
      // holds, no crawl; the host kills a W4 guard; the restart drops the held shutter on both pages and ends the hold
      where = 'TKL W4 held restart';
      await moveClient(91.2, 28.7, PI);
      await sim(500);
      await padReady(B);
      await holdUntil(B, RB, () => window.__app.current.team.state === 'shutterOffer', 'W4 A27: the client grips the shutter');
      await until(B, () => window.__app.current.team.state === 'shutterHold', null, 6000, 'W4 A27: the client holds it at the gap');
      await atGap('w4-shutter', 'W4 A27');
      await down(0, false, 'W4 guard 0');
      // TKL's W3 restart was the first
      await restarted(3, SEC[2].conn.cp, 'W4 rule restart (shutter held)', 2);
      await shuttersBack('TKL W4 restart with the shutter held');
      await holdOver('the W4 restart');
      assert(true, 'A27: the section restart dropped the held shutter on host and client and ended the hold');
      where = 'TKL W4 shutter';
      // the notice: a guard in shed two (the -normal side)
      const g4 = await noticeCheck('w4-shutter', 0, [92, 23]);
      await shutQuiet('w4-shutter', 'W4 C8 before the lift');
      await shutterCross({ id: 'w4-shutter', holder: 'client', hold: [91.2, 28.7, PI], crawl: [92.8, 28.8, PI], during: noticeDuring('w4-shutter', g4, 92, 27.4, 'W4', 'shed two') });
      // the pull as before: the host on the jetty top came through shed two and its canal door; the client's canal-bed spot is
      // not across a shutter
      where = 'TKL W4 jetty';
      await pull({ id: 'w4-pull-jetty', holder: [73.5, 0.1, 6.35], partner: [73.5, -4.3, 5.3], upY: -0.3 });
      await mirror('W4');
      // tkl-1, 2, 3, 4, 5 = bits 0, 1, 2, 3, 5 (value 47); tkl-opt (bit 4, value 16) clear
      await extract(63, 47, 'TKL W4');
    }
    console.log(`${tag}: ${id} done`);
  } catch (e) {
    failed = true;
    console.error(`FAIL (${tag}, ${where}): ${String(e)}`);
    console.error(`team host: ${await teamLog(A).catch((x) => `n/a ${x}`)}`);
    console.error(`team client: ${await teamLog(B).catch((x) => `n/a ${x}`)}`);
    await B.screenshot({ path: process.env.SHOT ?? joinPath(tmpdir(), `e2e-sectorops-wharf-${id}-fail.png`) }).catch(() => {});
  } finally {
    clearInterval(pump);
    all.push(...errors[0].map((m) => `${tag} host ${m}`), ...errors[1].map((m) => `${tag} client ${m}`));
    await browser.close();
  }
}

if (!IDS.length) {
  console.error(`unknown --mission=${MISSION} (threeGreyCoats | twoKeyLedger)`);
  failed = true;
}
for (const id of IDS) {
  try {
    await run(id);
  } catch (e) {
    failed = true;
    console.error(`FAIL (${id}, setup): ${String(e)}`);
  }
}
console.log(all.length ? 'console problems:\n' + all.join('\n') : 'no console errors');
process.exit(failed || all.length ? 1 : 0);
