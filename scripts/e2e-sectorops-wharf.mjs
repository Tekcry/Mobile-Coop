// (mission-framework GB6) e2e-sectorops parts `wharf-tgc` / `wharf-tkl` (run-e2e: `e2e-sectorops:wharf-tgc`, `:wharf-tkl`; PART_SCRIPT
// gives each `--mission=<id>`): Tallow Wharf (`src/world/maps/tallowWharf*.ts`) in co-op, a host page and a client page over `?net=local`.
// Three Grey Coats (W1 -> W4) and Two-Key Ledger (W2 -> W4) are each played from their start section to the extraction and the
// results screen (VICTORY), with one forced co-op move per section done with real pad input on both pages (leg-up, partner throw,
// pull-up; the shutters print SKIP: no `placeShutter` yet, GB-briefs 0.2), a broken rule that restarts the section to its checkpoint
// while the mission carries on (TGC: a decoy interrogated, `namedTarget`; TKL: a guard killed, `noKills`), and the client's mirror of
// the host's mission (`net.mission.runner.doneBits`, the `.mission-hud` rows). Run with no `--mission` it plays both in sequence.
// The guards are frozen and nobody can be hurt (the test reads the mission, not the stealth). Needs `E2E_GPU=1` (laptop queue only).
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { launch, openPage, BTN, assert } from './e2e-lib.mjs';
import { until, waitSim, setSimPages, startMode, NET_VIEWPORT, onHostStep, hostStepResult, watchTeam, teamLog } from './e2e-net-lib.mjs';

const NET3 = true; // NET3 (start.sm) is merged into feature/mission-engine

const url = process.argv[2] ?? 'http://localhost:4173/';
const MISSION = process.argv.find((a) => a.startsWith('--mission='))?.slice(10);
const IDS = ['threeGreyCoats', 'twoKeyLedger'].filter((id) => !MISSION || id === MISSION);
const PI = Math.PI;
const RB = BTN.RB;
/** The loft storey of W2 (feet height of the lofts and the walkway); `+ 0.1` is the standing spot on it. */
const LOFT = 4.5;
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
    await holdUntil(B, RB, () => ['pullJump', 'pullHang', 'pullScramble'].includes(window.__app.current.team.state), `${c.id}: the client jumps for the hands`);
    await hostStepResult(A, key, 8000, `${c.id}: the host catches`);
    await until(A, () => (window.__app.current.team.__log ?? []).some((e) => e[1] === 'pullHaul'), null, 8000, `${c.id}: the host hauls (pullHaul)`);
    await until(B, (y) => { const k = window.__app.current.player.controller; return k.grounded && k.pos.y > y; }, c.upY, 20000, `${c.id}: the client stands on top (y > ${c.upY})`);
    await until(A, () => window.__app.current.team.state === 'none', null, 8000, `${c.id}: the holder is free once the partner is up`);
    const h = await hostFeet();
    const cl = await clientFeet();
    assert(Math.hypot(h[0] - cl[0], h[2] - cl[2]) < 1.5 && cl[1] > c.upY, `${c.id}: the client is up beside the host (host ${JSON.stringify(h)}, client ${JSON.stringify(cl)})`);
  };
  /** The partner throw (teamMoves `throwLanding`): `c.thrower` (client, standing, facing the runner) and `c.runner` (host), `c.stage` the landing box. */
  const toss = async (c) => {
    await moveClient(c.thrower[0], c.thrower[2], PI, c.thrower[1]);
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
    assert(true, `${c.id}: the host landed on the stage ${JSON.stringify(await hostFeet())}`);
  };

  // ---- readers (host page) ----
  const dbg = () => GA(() => window.__sector.debug());
  const stepDone = (sid) => GA((sid) => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === sid)) & 1; }, sid);
  const fact = (f) => GA((f) => window.__mission.runner.hasFlag(f), f);
  const doneBits = () => GA(() => window.__mission.runner.doneBits);
  const slotAlive = (k) => GA((k) => !!window.__sector['slotEnemy'][k]?.alive, k);
  /** The run sections of the host's map, read once the match is on (`readSec` after `startMode`: before it the host page's
   *  `__app.current` is the menu backdrop, whose map has no `sectors`). */
  let SEC = [];
  const readSec = () => GA(() => window.__app.current.world.map.sectors.map((s) => ({
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
  };
  /** The break line, the restart and the carry-on state (section `i`; `cp` the checkpoint the restart returns to). */
  const restarted = async (i, cp, what) => {
    await until(A, () => window.__sector.debug().restarts === 1, null, 15000, `${what}: the section restarts`);
    const d = await dbg();
    assert(d.index === i && d.phase === 'objective' && d.mission.ruleRestarts === 1, `${what}: back at the section's start, the mission going on (${JSON.stringify([d.index, d.phase, d.mission])})`);
    await until(A, ([x, z]) => { const p = window.__app.current.player.controller.pos; const r = window.__app.current.net.remotes.values().next().value; return Math.hypot(p.x - x, p.z - z) < 2.5 && Math.hypot(r.feet.x - x, r.feet.z - z) < 2.5; }, [cp.x, cp.z], 8000, `${what}: both players at the checkpoint ${cp.x}, ${cp.z}`);
  };
  const noBlips = async () => {
    const n = await GA(() => window.__sector.blips().length);
    assert(n === 0, `no objective blip while a mission runs (${n})`);
  };
  const clientHud = async () => {
    await until(B, () => { const el = document.querySelector('.mission-hud'); return !!el && !el.hidden && el.getBoundingClientRect().width > 0 && el.querySelectorAll('.mh-row').length >= 1; }, null, 8000, 'the client mission HUD shows rows');
    assert(true, 'the client mission HUD shows the objective rows');
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

  try {
    await startMode([A, B], 'sector', 'tallowWharf');
    SEC = await readSec();
    // the host's setup (as e2e-sectorops-mission): guards frozen (never ?sectorGuards=: it would drop Teale, the decoys, the clerk)
    await GA(() => {
      const g = window.__app.current;
      g.enemyMgr.update = () => {};
      if (g.security) g.security.fixedUpdate = () => {};
      window.__mev = [];
      g.events.on('missionEvent', (e) => window.__mev.push(e));
    });
    await padReady(A);
    await padReady(B);

    if (tgc) {
      // ================= Three Grey Coats: W1 -> W2 -> W3 -> W4 =================
      where = 'TGC W1 start';
      const d0 = await dbg();
      assert(d0.index === 0 && d0.mission && d0.mission.id === 'threeGreyCoats' && d0.mission.section === 0, `TGC starts on W1 (${JSON.stringify([d0.index, d0.mission])})`);
      assert((await B.evaluate(() => new URLSearchParams(location.search).get('mission'))) === null, 'the client URL has no mission=');
      const s0 = SEC[0].start2;
      const cf0 = await ownFeetB();
      assert(dist(cf0, s0.x, s0.z) < 2, `the client starts within 2 m of W1 start2 (${JSON.stringify(cf0)})`);
      await noBlips();
      await clientHud();

      where = 'TGC W1';
      console.log('SKIP: shutter w1-shutter is a stand-in until the shutter wiring slice (GB-briefs 0.2)');
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
      await moveHost(18.75, 7.75, 0);
      await sim(5000);
      assert((await stepDone('tgc-2')) === 1 && (await fact('tgc-courier')), 'tgc-2: the courier is learned (step and fact)');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 8000, 'W1: the exit opens');
      await cross(0, 'W1 connector');
      await mirror('W1');

      where = 'TGC W2 throw';
      const dw2 = await dbg();
      assert(dw2.index === 1 && dw2.mission.section === 1, `W2 is the mission's second section (${JSON.stringify([dw2.index, dw2.mission])})`);
      // the pawn taking-in door (W2 bolt 3) is unbolted from the loft side and opened on both pages
      const pb = await useBolt(1, 3);
      await GA((i) => { const w = window.__app.current.world; w.doors.open(w.doors.list[i], 'quiet'); }, pb.door);
      await until(B, (i) => !window.__app.current.world.doors.list[i].anchor.locked, pb.door, 8000, 'the pawn door is unlocked on the client');
      await GB((i) => { const w = window.__app.current.world; w.doors.open(w.doors.list[i], 'quiet'); }, pb.door);
      await until(A, (i) => window.__app.current.world.doors.list[i].open > 0.9, pb.door, 8000, 'the pawn door is open on the host');
      await until(B, (i) => window.__app.current.world.doors.list[i].open > 0.9, pb.door, 8000, 'the pawn door is open on the client');
      await toss({ id: 'w2-throw-pawn', thrower: [50.5, LOFT + 0.1, 69.6], runner: [50.5, LOFT + 0.1, 68.3], stage: [49, 72.5, 52, 73.5] });

      where = 'TGC W2 broken rule';
      // a decoy (Fenn, W2:7) interrogated breaks the named-target rule: the section restarts at its checkpoint, the mission goes on
      await interrogate(7);
      await sim(500);
      const br = await dbg();
      assert(br.mission.breaks === 1 && br.mission.pending === true && br.mission.spook >= 0, `a decoy asked: the rule breaks, the restart pending (${JSON.stringify(br.mission)})`);
      await restarted(1, SEC[0].conn.cp, 'W2 restart');
      assert((await stepDone('tgc-3')) === 0 && (await fact('tgc-courier')), "the restart keeps W1's fact and has tgc-3 not done");
      const bolt = await GA(() => window.__mission.runner.def.steps.find((s) => s.id === 'tgc-3').bolt);
      const teale = await GA(() => { const e = window.__sector['slotEnemy'][6]; return e ? [e.pos.x, e.pos.y, e.pos.z] : null; });
      assert(teale && Math.hypot(teale[0] - bolt[0], teale[2] - bolt[2]) < 1.0, `Teale (the spooked courier) stands at his bolt point ${JSON.stringify(bolt)} (${JSON.stringify(teale)})`);
      await sim(2200);
      await interrogate(6);
      await sim(500);
      assert((await stepDone('tgc-3')) === 1 && (await fact('tgc-chest')) && (await dbg()).mission.breaks === 1, 'Teale asked: tgc-3 done, the chest fact held, no new break');
      assert((await stepDone('tgc-opt')) === 0, 'tgc-opt is left undone');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 8000, 'W2: the exit opens without the optional step');
      await cross(1, 'W2 connector');
      await mirror('W2');

      where = 'TGC W3';
      console.log('SKIP: W3 crossed (TKL covers it)');
      await until(A, () => window.__sector.debug().phase === 'connector', null, 3000, 'W3: no TGC step, the exit is open');
      await cross(2, 'W3 connector');
      await mirror('W3');

      where = 'TGC W4 clerestory';
      console.log('SKIP: shutter w4-shutter is a stand-in until the shutter wiring slice (GB-briefs 0.2)');
      await legUp({ id: 'w4-lip-clerestory', spot: [79, 29.2], yaw: PI, lipY: 4.4 });
      await pullUp(A, 'W4 C9');
      const hf4 = await hostFeet();
      assert(hf4[1] > 4.2, `W4 C9: the host stands in the clerestory (${JSON.stringify(hf4)})`);
      await useItem('W4-obj', 75.5, 0.1, 15, PI);
      await until(A, () => { const m = window.__mission; return (m.runner.doneBits >> m.runner.def.steps.findIndex((s) => s.id === 'tgc-4')) & 1; }, null, 8000, 'tgc-4 is done');
      const mev = await GA(() => window.__mev.slice());
      assert(mev.some((e) => e.name === 'mindersArrive' && e.guardTag === 'tgc-minders' && e.postId === 'w4-quay'), `the minders are sent (${JSON.stringify(mev)})`);
      await mirror('W4');
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
      await noBlips();
      await clientHud();

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

      where = 'TKL W4 jetty';
      console.log('SKIP: shutter w4-shutter is a stand-in until the shutter wiring slice (GB-briefs 0.2)');
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
