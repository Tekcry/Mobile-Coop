// Stealth AI on the Test Chamber (map `studio`, `mode=test`, the dark annex east of the main room): the core guard play. Seeing:
// shadow vs light detection (the real lamp L0 and the 0.12 dark bay), the awareness arc warning before detection, vision modes
// not changing detection, no sight through walls, the vision-mode buttons. Hearing: noise -> suspicious -> investigating, one
// guard of several sent to a noise, shots (suppressed, loud, an impact). Search: LKP set + ghost + search that converges and
// ends, (guard-ai S25) the probable-area search after combat, (guard-ai S26) noise heard in a search and in a fight. Bodies: found
// in the light and not in the dark, carried and hidden.
// (guard-ai S1) Hearing is the coordinated rule the live modes use (`EnemyManager.coordinated`; the test mode sets it).
// (clean-up G2d, decision N18) Moved off the Warehouse to the Test Chamber (positions: docs/plan/TEST-CHAMBER-SPEC.md 3.1 and
// section 9). The detail tests of systems later phases rework (radio, alarms, lamps and switches, doors, patrols, squad roles,
// armour, surfaces, the dog, the context prompts, the character shadows and more) were dropped; they are in git history.
// `node scripts/e2e-stealth-ai.mjs [url] [--only=name]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=studio&mode=test' });
const G = (f, a) => page.evaluate(f, a);
try {
  await frames(page, 10);
  await G(() => {
    const a = window.__app;
    const g = a.current;
    a.loop.manual = true;
    g.target.health.invulnerable = true;
    g.mode.pending.length = 0;
    const em = g.enemyMgr;
    em.clear();
    em.coordinated = true;
    const V = g.player.position.constructor;
    const st = a.input.state;
    const c = g.player.controller;
    // helpers kept on window for the scenarios
    window.__t = {
      V,
      reset() {
        em.clear();
        em.coordinated = true;
        // (an alarm in an earlier scenario queues Hunter's reinforcements)
        g.mode.pending.length = 0;
        em.lkpValid = false;
        em.sightT = 99;
        em.alarmRaised = false;
        em.alarmBy = '';
        for (const p of em.alarms) p.disabled = false;
        for (const it of g.interactables.items) if (it.kind === 'alarm') { it.done = false; g.interactables.setEnabled(it, true); }
        const reg = g.world.level.lights;
        for (const l of reg.lights) {
          if (l.kind === 'flashlight') continue;
          l.destroyed = false;
          l.on = true;
        }
        reg.version++;
        // (guard-ai S15) the wall switches read their circuits again (a switch left off by a scenario is on again)
        g.stealth.syncSwitches();
        if (g.stealth.carry) g.stealth.dropCarried();
        // doors shut again
        const doors = g.world.doors;
        for (const d of doors.list) {
          d.open = 0;
          d.target = 0;
          doors['write'](d);
          doors['addBody'](d);
        }
        doors['mesh']?.thinInstanceBufferUpdated('matrix');
        g.noise = 0;
        g.player.controller.override = null;
        g.traversal.reset();
        st.releaseAll();
        st.setMove('t', 0, 0);
        c['crouchToggled'] = false;
        g.player.light = undefined;
        delete g.localRef.lightOverride;
      },
      tp(x, z, yaw) {
        c.teleport(new V(x, 0, z), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
      },
      spawn(kind, x, z, yaw) {
        return em.spawn(kind, new V(x, 0, z), false, yaw);
      },
      crouch(v) {
        c['crouchToggled'] = v;
      },
      /** Pin the player's light level (else it is sampled from the lamps). */
      light(v) {
        g['updateLight'] = v === null ? Object.getPrototypeOf(g)['updateLight'] : () => (g.localRef.light = g.lightLevel = v);
      },
      step(s) {
        a.loop.stepHeadless(s, 120);
      },
      kill(e, knockOut = false) {
        const h = { amount: 999, point: e.pos.clone(), dir: new V(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: e.pos.clone(), impulse: 1 };
        if (knockOut) e.knockOut(h);
        else e.applyDamage(h);
      },
    };
  });
  const scen = async (name, f) => {
    if (only && !name.includes(only)) return;
    console.log(name);
    await G(() => window.__t.reset());
    await f();
  };

  await scen('shadow', async () => {
    // the Test Chamber's dark annex (zone 0.12): a crouched sneak past behind a guard, and crouched still in front at 8 m
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', 34.5, 2.0, 0);
      t.crouch(true);
      t.tp(31.5, 0.8, Math.PI / 2);
      t.step(0.6);
      const light = g.lightLevel;
      let max = 0;
      const st = window.__app.input.state;
      st.setMove('t', 0, 0.5);
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        max = Math.max(max, e.meter);
      }
      st.setMove('t', 0, 0);
      // in front, crouched and still in the dark
      t.tp(34.5, 9.5, Math.PI);
      e.yaw = 0;
      let front = 0;
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        front = Math.max(front, e.meter);
      }
      return { light, max, front, level: e.level };
    });
    assert(r.light < 0.28, `the dark bay is in shadow (light ${r.light.toFixed(2)})`);
    assert(r.max < 0.3, `a crouched sneak behind a guard in shadow stays unnoticed (meter max ${r.max.toFixed(2)})`);
    assert(r.front < 0.3, `crouched still in the dark in front at ~7 m stays unnoticed (meter max ${r.front.toFixed(2)}, ${r.level})`);
  });

  await scen('light', async () => {
    // the hall under the real lamp L0: a walker in the lamp pool is seen; the arc warns first
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', 32.3, 15.5, 0);
      t.tp(32.3, 23.5, Math.PI);
      t.step(0.4);
      const light = g.lightLevel;
      const st = window.__app.input.state;
      let firstArc = -1;
      let alertAt = -1;
      for (let k = 0; k < 240 && alertAt < 0; k++) {
        st.setMove('t', k % 60 < 30 ? 0.6 : -0.6, 0);
        t.step(1 / 60);
        window.__app.current.frameUpdate(1 / 60, 1);
        if (firstArc < 0 && g.hud.arcs.shown > 0) firstArc = k / 60;
        if (e.alerted) alertAt = k / 60;
      }
      st.setMove('t', 0, 0);
      return { light, firstArc, alertAt, red: g.hud.arcs.anyRed };
    });
    assert(r.light > 0.6, `the lamp pool lights the player (${r.light.toFixed(2)})`);
    assert(r.alertAt > 0 && r.alertAt < 3, `walking in the light in view at 8 m is detected (${r.alertAt.toFixed(2)} s)`);
    assert(r.firstArc >= 0 && r.alertAt - r.firstArc > 0.25, `the awareness arc shows first (arc at ${r.firstArc.toFixed(2)} s, detected at ${r.alertAt.toFixed(2)} s)`);
  });

  await scen('vision-detect', async () => {
    // (step 14) vision is rendering only: the same scripted approach is detected on the same frame with thermal (and
    // electro) on as off (the light level is sampled, not pinned)
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const rnd = Math.random;
      const run = (mode) => {
        // the same random draws every run (anything left on Math.random): only the vision mode differs
        let seed = 12345;
        Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        t.reset();
        t.light(null);
        g.vision.reset();
        g.vision.set(mode);
        const e = t.spawn('grunt', 32.3, 15.5, 0);
        // (guard-ai seed-random) his think cadence comes from his own seeded stream (keyed by his spawn number, new
        // each run), not Math.random: pin it so the three runs think on the same frames
        e.senseRng.reseed(12345);
        e.thinkT = 0;
        t.tp(32.3, 23.5, Math.PI);
        t.step(0.4);
        g.frameUpdate(0.4, 1);
        let alertAt = -1;
        for (let k = 0; k < 240 && alertAt < 0; k++) {
          st.setMove('t', k % 60 < 30 ? 0.6 : -0.6, 0);
          t.step(1 / 60);
          g.frameUpdate(1 / 60, 1);
          if (e.alerted) alertAt = k;
        }
        st.setMove('t', 0, 0);
        const out = { mode: g.vision.shown, vk: g.post.visionKind, alertAt, light: +g.lightLevel.toFixed(3) };
        g.vision.reset();
        g.frameUpdate(1 / 60, 1);
        return out;
      };
      try {
        return { off: run('off'), thermal: run('thermal'), electro: run('electro') };
      } finally {
        Math.random = rnd;
      }
    });
    assert(r.off.alertAt > 0, `the approach is detected with vision off (${JSON.stringify(r.off)})`);
    assert(r.thermal.vk === 1 && Math.abs(r.thermal.alertAt - r.off.alertAt) <= 1, `thermal on: detected on the same frame +-1 (${JSON.stringify(r)})`);
    assert(r.electro.vk === 2 && Math.abs(r.electro.alertAt - r.off.alertAt) <= 1, `electro on: detected on the same frame +-1 (${JSON.stringify(r)})`);
  });

  await scen('walls', async () => {
    const r = await G(() => {
      const t = window.__t;
      // a guard in the store facing partition A's wall; the player lit, walking, right behind the wall (3.1 m)
      t.light(1);
      const e = t.spawn('grunt', 30.3, 12.8, 0);
      t.tp(30.3, 15.9, Math.PI);
      const st = window.__app.input.state;
      const g = window.__app.current;
      let max = 0;
      let arcs = 0;
      let meter = 0;
      for (let k = 0; k < 30; k++) {
        st.setMove('t', k % 10 < 5 ? 0.7 : -0.7, 0);
        t.step(0.1);
        g.frameUpdate(0.1, 1);
        // sight only (footsteps are heard through the wall, rightly)
        max = Math.max(max, e.rate);
        meter = Math.max(meter, e.meter);
        arcs = Math.max(arcs, g.hud.arcs.shown);
      }
      st.setMove('t', 0, 0);
      t.light(null);
      return { max, level: e.level, arcs, meter };
    });
    assert(r.max === 0, `no sight through walls (sight rate ${r.max.toFixed(2)}, ${r.level})`);
    assert(r.arcs === 0, `a guard who only hears you through a wall shows no arc (meter ${r.meter.toFixed(2)}, ${r.arcs} arcs)`);
  });

  await scen('noise', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const H = g.enemyMgr.hearingTable;
      // (guard-ai S1) a lone guard inside half the reach (the investigate tier, `HEARING.investigateDb`) is sent; the
      // reach is 9 m, so half is ~4.5 m: he stands 0.6 of that from the player (was 6 m, now only a turn)
      const half = 9 * Math.pow(10, -H.investigateDb / 20);
      t.light(0);
      const e = t.spawn('grunt', 33, 4 + half * 0.6, 0);
      t.tp(33, 4, 0);
      t.step(0.3);
      g.enemyMgr.hear(g.player.position, 9);
      t.step(0.2);
      const l1 = e.level;
      const z0 = e.pos.z;
      // it looks for ALERT.hearLook (2.4 s) before walking over
      for (let k = 0; k < 11; k++) {
        g.enemyMgr.hear(g.player.position, 9);
        t.step(0.25);
      }
      const l2 = e.level;
      t.tp(3, 2.5, 0);
      t.step(2);
      t.light(null);
      return { l1, l2, moved: z0 - e.pos.z, half };
    });
    assert(r.l1 === 'suspicious', `a noise makes a guard inside half its reach suspicious (${r.l1}, half ${r.half.toFixed(2)} m)`);
    assert(r.l2 === 'investigating', `more noise: it investigates (${r.l2})`);
    assert(r.moved > 0.8, `it walks over to the noise (${r.moved.toFixed(2)} m)`);
  });

  await scen('one investigates', async () => {
    // (guard-ai S1, M1 goal 1) four guards inside half the reach of a breaking bottle (15 m, the investigate tier):
    // exactly one, the nearest, walks over; the others turn to look (at most suspicious) and stay at their posts
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const H = em.hearingTable;
      const R = 15;
      const half = R * Math.pow(10, -H.investigateDb / 20);
      t.light(0);
      t.tp(3, 2.5, 0);
      const P = new t.V(32.3, 0, 21);
      const gs = [t.spawn('grunt', 32.3, 23.5, 0), t.spawn('grunt', 35.5, 22.5, Math.PI / 2), t.spawn('grunt', 29.3, 25, 0), t.spawn('grunt', 35.5, 16.5, Math.PI)];
      t.step(0.3);
      const home = gs.map((e) => [e.pos.x, e.pos.z]);
      const dist = gs.map((e) => Math.hypot(e.pos.x - P.x, e.pos.y - P.y, e.pos.z - P.z));
      let nearest = 0;
      for (let k = 1; k < gs.length; k++) if (dist[k] < dist[nearest]) nearest = k;
      em.hear(P, R);
      t.step(0.1);
      const reacted = gs.filter((e) => e.turning || e.level !== 'unaware').length;
      let investigators = 0;
      const moved = gs.map(() => 0);
      const worst = gs.map(() => 'unaware');
      const rank = { unaware: 0, cooldown: 0, suspicious: 1, investigating: 2, searching: 3, alert: 4 };
      // ALERT.hearLook (2.4 s) of looking, then the one sent walks over; the others calm down
      for (let s = 0; s < 60; s++) {
        t.step(0.1);
        gs.forEach((e, k) => {
          moved[k] = Math.max(moved[k], Math.hypot(e.pos.x - home[k][0], e.pos.z - home[k][1]));
          if (rank[e.level] > rank[worst[k]]) worst[k] = e.level;
        });
      }
      investigators = worst.filter((l) => l === 'investigating').length;
      t.light(null);
      return { half, dist, nearest, reacted, investigators, worst, moved, sent: worst[nearest] };
    });
    const f2 = (v) => v.toFixed(2);
    assert(r.dist.every((d) => d < r.half), `all four guards are inside half the bottle's reach (${r.dist.map(f2)} < ${f2(r.half)} m)`);
    assert(r.reacted >= 3, `they all hear it (${r.reacted} of 4 turn or look)`);
    assert(r.investigators === 1 && r.sent === 'investigating', `exactly one investigates, the nearest (${JSON.stringify(r.worst)}, nearest #${r.nearest})`);
    const others = r.worst.filter((_, k) => k !== r.nearest);
    assert(others.every((l) => l === 'unaware' || l === 'suspicious' || l === 'cooldown'), `the others reach at most suspicious (${JSON.stringify(others)})`);
    const otherMoves = r.moved.filter((_, k) => k !== r.nearest);
    assert(otherMoves.every((m) => m < 1), `the others stay at their posts (${otherMoves.map(f2)} m)`);
    assert(r.moved[r.nearest] > 0.5, `the one sent walks over (${f2(r.moved[r.nearest])} m)`);
  });

  await scen('lkp', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      // (guard-ai chain fix) the same random draws every run (think ticks, reaction and radio jitter): unseeded, the
      // laptop run on 62884858 missed the ghost on a build where it passed before (test code only in between)
      const rnd = Math.random;
      let seed = 4242;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      try {
        t.light(1);
        // no alarm run (Hunter would bring the doubled hostiles in hunting, and they find you)
        em.alarmRaised = true;
        const e = t.spawn('grunt', 32.3, 15.5, 0);
        t.tp(32.3, 20.5, Math.PI);
        let k = 0;
        while (!(e.alerted && em.sightT < 0.1) && k++ < 900) {
          t.step(1 / 60);
          g.frameUpdate(1 / 60, 1);
        }
        const seen = { alerted: e.alerted, level: e.level, sightT: +em.sightT.toFixed(2), lkp: em.lkpValid, frames: k, captured: g.ghost.captured };
        const seenAt = { x: em.lkp.x, z: em.lkp.z };
        // vanish to the main room's south-west corner (HIDE_FAR, out of sight, far from the last known position). (guard-ai
        // S25b) 35 m by path from the spot in the hall (S) through the annex door, past the probable area's reach
        // (`SEARCH_AREA.max` 20 m + 3: a searcher could legitimately walk to a spot inside it: S25B-CHECK-B)
        t.light(0);
        t.tp(3, 2.5, 0);
        const hid = { x: +g.player.position.x.toFixed(2), z: +g.player.position.z.toFixed(2) };
        let ghost = false;
        let searching = false;
        let searchAt = -1;
        let closest = 99;
        let wallhack = false;
        // why no ghost, if none: the first frame each condition of `updateStealthHud`'s show held
        const why = { lost: -1, hunting: -1, lkp: -1, show: -1 };
        for (let i = 0; i < 500; i++) {
          // (the mode's later squads stay out of it: this is about the one guard)
          for (const x of em.enemies) if (x !== e) x.passive = true;
          t.step(0.05);
          g.frameUpdate(0.05, 1);
          if (why.lost < 0 && em.sightT > 0.6) why.lost = i;
          if (why.hunting < 0 && em.hunting) why.hunting = i;
          if (why.lkp < 0 && em.lkpValid) why.lkp = i;
          if (why.show < 0 && g.ghost.show) why.show = i;
          if (g.ghost.visible) ghost = true;
          if (e.level === 'searching' && !searching) {
            searching = true;
            searchAt = (i + 1) * 0.05;
          }
          closest = Math.min(closest, Math.hypot(e.pos.x - seenAt.x, e.pos.z - seenAt.z));
          if (e.level === 'alert' && e.sinceSeen > 1 && Math.hypot(e.pos.x - 3, e.pos.z - 2.5) < 2) wallhack = true;
        }
        const lkpNear = Math.hypot(em.lkp.x - seenAt.x, em.lkp.z - seenAt.z);
        // the search ends: it runs its length (`ALERT.searchTime` 60 s) from when it started, then he calms. (guard-ai
        // walk 4.82 item 2) He no longer sits in cover until the 12 s lost-sight cap: he closes on the last known
        // position first and the search starts on arrival, so it starts later than the old fixed 25 + 50 s window
        // allowed for. Stepped until the level leaves the fight / search, bounded by the search's own length + 5 s (a
        // search that never ends, or one that restarts, still fails here).
        for (let i = 0; i < 120 && (e.level === 'alert' || e.level === 'searching') && !(e.level === 'searching' && e.aware.t >= 65); i++) t.step(1);
        const endT = e.aware.t;
        for (let i = 0; i < 5; i++) g.frameUpdate(0.2, 1);
        t.light(null);
        return { seen, why, lkpNear, ghost, searching, searchAt, endT, closest, wallhack, hid, end: e.level, guard: { x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1) }, lkpAfter: em.lkpValid, ghostAfter: g.ghost.visible };
      } finally {
        Math.random = rnd;
      }
    });
    assert(r.seen.alerted && r.seen.sightT < 0.1, `the guard detects the lit player in front of him (${JSON.stringify(r.seen)})`);
    assert(r.lkpNear < 1.5, `the last known position stays where the player was seen (${r.lkpNear.toFixed(2)} m off)`);
    assert(r.ghost, `the LKP ghost shows once they lose sight (first frame of: ${JSON.stringify(r.why)}, captured ${r.seen.captured})`);
    assert(r.closest < 2.5, `they converge on the last known position (closest ${r.closest.toFixed(2)} m)`);
    assert(r.searching, `they search from it (from ${r.searchAt.toFixed(2)} s after he vanished)`);
    assert(!r.wallhack, `they never home in on the hidden player (hidden at ${JSON.stringify(r.hid)})`);
    assert(r.end === 'cooldown' || r.end === 'unaware', `the search ends (${r.end}; started ${r.searchAt.toFixed(2)} s after he vanished, ${r.endT.toFixed(0)} s in that level at the end; guard at ${JSON.stringify(r.guard)}, player at ${JSON.stringify(r.hid)})`);
    assert(!r.lkpAfter && !r.ghostAfter, 'the LKP and its ghost clear afterwards');
  });

  // (guard-ai S25, A151) The probable-area search after combat (S25.md "e2e", S25B-CHECK-B.md draft). One sighting of
  // the lit player as 'lkp', then three runs, each picking its spot in the browser from the game's own data (the
  // intruder's chase field, the baked light, the level cover, `em.searchAreaTable`), so nothing hangs on hand-measured
  // light. 'near': crouched in the dark spot 5-7.5 m by path from the last known position that the plan's own score
  // ranks best: a searcher walks there (or finds him) within 20 s of the search starting (combat allowed). 'wall':
  // 4-9 m straight but more than `max` + 3 m by path (a room round a wall): no plan point there, no searcher within 4 m
  // of it, no searcher farther from the last known position by path than R + 1 m. 'three': three searchers take three
  // different spots. Sim-time steps, Math.random seeded per run.
  await scen('search area', async () => {
    const run = (which) =>
      G((which) => {
        const t = window.__t;
        const g = window.__app.current;
        const em = g.enemyMgr;
        const nav = em.nav;
        const SA = em.searchAreaTable;
        // ('three': three guards spread out and one reaches the annex door, from where HIDE_FAR (3, 2.5) is in sight across the main
        // room, so the three hide in the crouch tunnel (1.5, 13), whose east wall hides it from there)
        const lf = g.world.lightField;
        const rnd = Math.random;
        let seed = which === 'near' ? 4242 : which === 'wall' ? 4343 : 4444;
        Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const r1 = (v) => (Number.isFinite(v) ? +v.toFixed(1) : String(v));
        try {
          t.reset();
          t.light(1);
          // no alarm run (Hunter's reinforcements would find him)
          em.alarmRaised = true;
          const gs = [];
          const xs = which === 'three' ? [0, 1.5, -1.5] : [0];
          // the guards' post P (32.3, 15.5), the lit spot S (32.3, 20.5), the park HIDE_FAR (3, 2.5)
          const POST = { x: 32.3, z: 15.5 };
          for (const x of xs) gs.push(t.spawn('grunt', 32.3 + x, 15.5, 0));
          if (gs.some((x) => !x)) return { err: 'a guard did not spawn' };
          const e = gs[0];
          // his eye over his feet, standing (enemy.ts `eye`), for the 'near' sight test below
          const eyeUp = e['eye'](new t.V()).y - e.pos.y;
          t.tp(32.3, 20.5, Math.PI);
          let k = 0;
          while (!(gs.every((x) => x.alerted) && em.sightT < 0.1) && k++ < 900) {
            t.step(1 / 60);
            g.frameUpdate(1 / 60, 1);
          }
          // a few frames more: his intruder's chase field is built round the last known position
          for (let i = 0; i < 10; i++) {
            t.step(1 / 60);
            g.frameUpdate(1 / 60, 1);
          }
          const s = e.hunt;
          const L = s >= 0 ? em.lkpOf(s) : null;
          const seen = { alerted: gs.map((x) => x.alerted), hunt: gs.map((x) => x.hunt), stealth: em.stealth, sightT: r1(em.sightT), frames: k, lkp: L ? [r1(L.x), r1(L.z)] : null };
          if (!L) return { seen, err: `no last known position for his intruder (hunt ${s})` };
          const Lx = L.x;
          const Ly = L.y;
          const Lz = L.z;
          const f = em.flowOf(s);
          const ownField = f !== em['flowField'];
          const cell = nav.cell;
          const storey = (c) => Math.abs(nav.cellHeight(c) - Ly) < 1.5;
          const pathAt = (x, z) => {
            const c = nav.cellOf(x, z, Ly);
            return c >= 0 && nav.isWalkable(c) ? f[c] * cell : Infinity;
          };
          let hide = null;
          // (S25-SAI-TRIAGE) out of his sight from his walk (post P -> last known position) and round the last
          // known position: an alerted guard sees by line of sight alone, light or not (enemy.ts `updateAwareness`),
          // so a spot he can see from there is no vanish: he sees him again and the last known position moves onto
          // him (the 8bd13e0c pick (-4.75, -2.25) was in view through the 1.1 m gap in the x -4 wall). Eyes on
          // walkable cells only; a static ray to the crouched hips, chest and head, clear as the guard's own losClear
          const eyes = [];
          const ne = Math.max(1, Math.ceil(Math.hypot(Lx - POST.x, Lz - POST.z) / 0.5));
          for (let q = 0; q <= ne; q++) eyes.push([POST.x + ((Lx - POST.x) * q) / ne, POST.z + ((Lz - POST.z) * q) / ne]);
          for (let q = 0; q < 8; q++) eyes.push([Lx + 1.5 * Math.cos((q * Math.PI) / 4), Lz + 1.5 * Math.sin((q * Math.PI) / 4)]);
          const eyeV = eyes.filter(([x, z]) => nav.isWalkable(nav.cellOf(x, z, Ly))).map(([x, z]) => new t.V(x, Ly + eyeUp, z));
          const toV = new t.V();
          const inSight = (x, y, z) => {
            for (const ev of eyeV) {
              for (const h of [0.6, 0.95, 1.2]) {
                toV.set(x, y + h, z);
                const r = g.ballistics.ray(ev, toV, 1);
                if (!r.hit || r.distance > Math.hypot(toV.x - ev.x, toV.y - ev.y, toV.z - ev.z) - 0.3) return true;
              }
            }
            return false;
          };
          if (which === 'near') {
            // the plan's own candidates in the band (cover at its position, dark cells), scored by its own table
            let best = -Infinity;
            const consider = (c, cover, lx, lz) => {
              if (c < 0 || !nav.isWalkable(c) || !storey(c)) return;
              const p = f[c] * cell;
              if (!(p >= 5 && p <= 7.5)) return;
              const l = lf.levelAt(lx, nav.cellHeight(c) + SA.sampleY, lz);
              if (!(l < SA.dark)) return;
              const sc = SA.wDark * (1 - l / SA.dark) + (cover ? SA.wCover : 0) - SA.wNear * Math.min(1, p / SA.max);
              if (sc <= best) return;
              const [x, z] = nav.center(c);
              // (not so near the last known position that walking to it passes the spot anyway)
              if (Math.hypot(x - Lx, z - Lz) < 3) return;
              // (nor within 3 m of his walk from his post to the last known position: that would pass it too)
              const sx = Lx - POST.x, sz = Lz - POST.z;
              const u = Math.max(0, Math.min(1, ((x - POST.x) * sx + (z - POST.z) * sz) / Math.max(1e-6, sx * sx + sz * sz)));
              if (Math.hypot(x - POST.x - u * sx, z - POST.z - u * sz) < 3) return;
              if (inSight(x, nav.cellHeight(c), z)) return;
              best = sc;
              hide = { x, z, path: r1(p), straight: r1(Math.hypot(x - Lx, z - Lz)), light: +l.toFixed(3), cover, score: +sc.toFixed(2) };
            };
            const cs = em.coverSet;
            for (let j = 0; j < cs.n; j++) {
              if (Math.hypot(cs.x[j] - Lx, cs.z[j] - Lz) > 9) continue;
              consider(nav.nearestWalkable(cs.x[j], cs.z[j], 2, cs.y[j]), true, cs.x[j], cs.z[j]);
            }
            for (let c = 0; c < nav.walk.length; c++) {
              if (nav.walk[c] !== 1) continue;
              const [x, z] = nav.center(c);
              if (Math.hypot(x - Lx, z - Lz) <= 8) consider(c, false, x, z);
            }
            if (!hide) return { seen, ownField, err: 'no dark spot 5-7.5 m by path from the last known position' };
          } else if (which === 'wall') {
            // (S25-SAI-TRIAGE 4) 4-9 m straight, on his floor, the most round a wall: the largest path - straight, at
            // least 4 m (finite: a room reached round a wall), out of his sight. The old pick wanted path > max + 3
            // (23 m): from (-0.5, 0) the warehouse has no such floor cell (scratch nav probe: the floor within 9 m
            // straight is <= ~16 m by path; the only > 23 m cells are the x -8.5 rack top, 2.8 m up by its ladder),
            // so the run never got past its pick. The 'wall' asserts are by path over the whole plan (every point
            // within R + 0.5 m, no searcher past R + 1 m), not about this spot; it stages the player round a wall
            let best = -Infinity;
            for (let c = 0; c < nav.walk.length; c++) {
              if (nav.walk[c] !== 1 || !storey(c)) continue;
              const p = f[c] * cell;
              if (!Number.isFinite(p)) continue;
              const [x, z] = nav.center(c);
              const d = Math.hypot(x - Lx, z - Lz);
              if (d < 4 || d > 9 || p - d < 4 || p - d <= best) continue;
              if (inSight(x, nav.cellHeight(c), z)) continue;
              best = p - d;
              hide = { x, z, path: r1(p), straight: r1(d) };
            }
            if (!hide) return { seen, ownField, err: 'no floor spot 4-9 m straight, >= 4 m longer by path, out of his sight, from the last known position' };
          } else hide = { x: 1.5, z: 13, far: true };
          // he vanishes: dark, crouched
          t.light(0);
          t.crouch(true);
          // (S25-SAI-TRIAGE 5) 'wall': the player waits out the combat at the far park spot HIDE_FAR (3, 2.5) (the main room's corner, behind the
          // annex walls, as 'three' and 'lkp') and takes the walled spot only once the search starts. His combat
          // route (the seeded cover pick: north-west to about (-2.1, 9.7), then cover at about (1-3.4, 9.5)) saw the
          // walled spot through the x -4 gap at z 8-9.1 (round 4: the LKP moved onto it at 2.2 s). A searcher is calm
          // and sees by the light (0 here), so from then on the spot stays hidden. 'wall' measures the plan and the
          // walk by path from where he lost him, so it needs no particular spot during the fight
          // (walk 4.82 laptop triage 2) 'near' too: with walk 4.82 item 2 a guard whose call is through leaves cover and
          // moves up on the last known position while still in combat; from there (about (-4.8, 0.4) at 10.6 s) he saw
          // the near spot 4.3 m off. The near intent (the plan ranks the dark spot near the last known position and a
          // searcher reaches it) is about the search, so the spot is taken when the search starts
          const park = which === 'wall' || which === 'near' ? { x: 3, z: 2.5 } : hide;
          t.tp(park.x, park.z, 0);
          // (S25-SAI-TRIAGE 2) the body follows the tp before the first sim step: the rig (and so the target's chest and
          // head, `PlayerTarget.sync` in the fixed step) is placed in `frameUpdate` (player.ts root.position), so the
          // first step after a bare tp let him see the chest still at the lit spot and report the feet, already at the
          // hide spot: the last known position leaked onto the player (both laptop runs: LKP = the hide spot from 0.1 s)
          g.frameUpdate(1 / 60, 1);
          const at = { x: r1(g.player.position.x), z: r1(g.player.position.z) };
          let time = 0;
          let tS = -1;
          let closest = 99;
          let closestT = -1;
          let found = -1;
          let homing = false;
          let maxPath = 0;
          let maxPathAt = null;
          let builtAt = -2;
          // (S25-SAI-TRIAGE) he sees him again after the tp (alerted: line of sight alone), and his walk, once a second
          let resight = -1;
          // (S25-SAI-TRIAGE 3) a new sight is a drop, not a low value (round 2 flagged 0.05 s, the clock just counting on)
          // (rig-pose-fix fix round 2) read from his perception, not from `sinceSeen`: he perceives every 0.22-0.30 s
          // (enemy.ts `thinkT`) and holds `los` in between, so `sinceSeen` stays 0 for up to 0.3 s after the tp on the
          // sighting made before it (the lit spot: the last known position does not move). `lastSeenT` is reset only by
          // a perceive that has him in line of sight, so a drop is a sighting made after the tp. (The sim body follows
          // the tp the same step: tests/playerTargetTeleport.test.ts.)
          let prevSeenT = e['lastSeenT'];
          let lkpMoved = null;
          const trace = [];
          // ('near') the first plan built in the search, and the nearest a searcher comes to the spot from then on
          let tP = -1;
          let closestP = 99;
          let closestPT = -1;
          const plans = [];
          const claims = gs.map(() => []);
          for (let i = 0; i < 1600; i++) {
            for (const x of em.enemies) if (!gs.includes(x)) x.passive = true;
            t.step(0.05);
            g.frameUpdate(0.05, 1);
            time += 0.05;
            if (tS < 0 && e.level === 'searching') {
              tS = time;
              if (park !== hide) {
                t.tp(hide.x, hide.z, 0);
                g.frameUpdate(1 / 60, 1);
              }
            }
            // (still in sight: every perceive with him in view resets it, at most 0.3 s apart, so that is a drop too)
            // (walk 4.82 laptop triage 2) the premise is the fight: once the search runs, a find is a pass ('near' found)
            const seenT = e['lastSeenT'];
            if (tS < 0 && resight < 0 && e.alerted && seenT < prevSeenT) resight = +time.toFixed(2);
            prevSeenT = seenT;
            {
              const lk = em.lkpOf(s);
              if (tS < 0 && !lkpMoved && lk && Math.hypot(lk.x - Lx, lk.z - Lz) > 0.5) lkpMoved = { t: r1(time), at: [r1(lk.x), r1(lk.z)] };
            }
            if (i % 20 === 0) {
              const lk = em.lkpOf(s);
              trace.push([r1(time), e.level, r1(e.pos.x), r1(e.pos.z), lk ? [r1(lk.x), r1(lk.z)] : null, e.onPlan]);
            }
            const p0 = em.plans[s];
            if (p0.builtAt !== builtAt && p0.builtAt >= 0) {
              builtAt = p0.builtAt;
              const pts = [];
              for (let q = 0; q < p0.n; q++) {
                // each point's path from the last known position (his intruder's chase field), for the 'wall' bound
                const pc = nav.nearestWalkable(p0.x[q], p0.z[q], 2, Ly);
                const pp = pc >= 0 ? f[pc] * cell : Infinity;
                pts.push([r1(p0.x[q]), r1(p0.z[q]), +p0.score[q].toFixed(2), r1(pp)]);
              }
              if (tP < 0 && tS >= 0) tP = time;
              plans.push({ t: r1(time - Math.max(0, tS)), c: [r1(p0.cx), r1(p0.cz)], R: r1(em['planR'][s]), pts });
            }
            for (let gi = 0; gi < gs.length; gi++) {
              const q = p0.claimOf(gs[gi].num);
              if (q < 0) continue;
              const pt = [r1(p0.x[q]), r1(p0.z[q])];
              const v = claims[gi];
              const last = v[v.length - 1];
              if (!last || last[0] !== pt[0] || last[1] !== pt[1]) v.push(pt);
            }
            const d = Math.hypot(e.pos.x - hide.x, e.pos.z - hide.z);
            // (homing: on the player where he really is, the park spot before the search)
            if (tS < 0 && e.level === 'alert' && e.sinceSeen > 1 && Math.hypot(e.pos.x - g.player.position.x, e.pos.z - g.player.position.z) < 2) homing = true;
            if (tS >= 0) {
              if (d < closest) {
                closest = d;
                closestT = time - tS;
              }
              if (found < 0 && e.level === 'alert' && e.sinceSeen < 1) found = time - tS;
              if (tP >= 0 && d < closestP) {
                closestP = d;
                closestPT = time - tP;
              }
              for (const x of gs) {
                const p = pathAt(x.pos.x, x.pos.z);
                if (Number.isFinite(p) && p > maxPath) {
                  maxPath = p;
                  maxPathAt = [r1(x.pos.x), r1(x.pos.z), r1(time - tS)];
                }
              }
            }
            // ('near', S25-SAI-TRIAGE 2) 20 s from his first plan point: the search's first point is the last known
            // position (ai.md, S25), and in this staging he took cover ~9.5 m off during combat, so the walk back and
            // the look there are not the plan's to answer for
            if (which === 'near' && tS >= 0 && ((tP >= 0 && time - tP > 20) || time - tS > 45 || closestP < 1.5 || found >= 0)) break;
            if (which === 'wall' && tS >= 0 && time - tS > 20) break;
            if (which === 'three' && tS >= 0 && (claims.every((v) => v.length > 0) || time - tS > 40)) break;
          }
          const level = gs.map((x) => x.level);
          t.crouch(false);
          t.light(null);
          return {
            seen,
            ownField,
            hide,
            at,
            tS: r1(tS),
            closest: r1(closest),
            closestT: r1(closestT),
            tP: tP >= 0 ? r1(tP - tS) : -1,
            closestP: r1(closestP),
            closestPT: r1(closestPT),
            found: r1(found),
            homing,
            maxPath: r1(maxPath),
            maxPathAt,
            plans,
            claims,
            level,
            guard: [r1(e.pos.x), r1(e.pos.z)],
            atEnd: { x: r1(g.player.position.x), z: r1(g.player.position.z) },
            onPlan: gs.map((x) => x.onPlan),
            resight,
            lkpMoved,
            trace,
          };
        } finally {
          Math.random = rnd;
        }
      }, which);
    const near2 = (pts, x, z) => pts.reduce((m, p) => Math.min(m, Math.hypot(p[0] - x, p[1] - z)), 99);

    // --- near: the dark spot 6 m by path is checked early ---
    const a = await run('near');
    const sa = JSON.stringify({ seen: a.seen, hide: a.hide, at: a.at, tS: a.tS, guard: a.guard, claims: a.claims, level: a.level });
    assert(!a.err, `near: ${a.err ?? 'the run picks its spot and completes'} (${JSON.stringify(a)})`);
    assert(a.seen.stealth && a.seen.alerted[0] && a.seen.hunt[0] >= 0, `near: the guard detects the lit player and hunts his intruder (${sa})`);
    assert(a.ownField, `near: his intruder has his own chase field (${sa})`);
    // (S25-SAI-TRIAGE) the vanish holds: out of his sight after the tp (else the last known position moves onto him)
    assert(a.resight < 0, `near: after the tp he never sees him again (seen at ${a.resight} s; ${sa}; walk ${JSON.stringify(a.trace)})`);
    assert(!a.lkpMoved, `near: his last known position stays where he lost him (moved ${JSON.stringify(a.lkpMoved)}; ${sa}; walk ${JSON.stringify(a.trace)})`);
    assert(a.tS > 0 && a.plans.length > 0 && a.plans[0].pts.length > 0, `near: the search starts and asks the plan, built (${sa}; plans ${JSON.stringify(a.plans)}; walk ${JSON.stringify(a.trace)})`);
    const nearA = Math.min(...a.plans.map((p) => near2(p.pts, a.hide.x, a.hide.z)));
    assert(nearA <= 3, `near: a plan point within 3 m of the dark spot (nearest ${nearA.toFixed(1)} m; ${sa}; plans ${JSON.stringify(a.plans)})`);
    assert(a.closestP <= 1.5 || a.found >= 0, `near: a searcher comes to the dark spot within 20 s of his first plan point (closest ${a.closestP} m at ${a.closestPT} s after it, the plan at ${a.tP} s into the search; found ${a.found}; ${sa}; plans ${JSON.stringify(a.plans)}; walk ${JSON.stringify(a.trace)})`);
    assert(!a.homing, `near: before the search he never homes in on the hidden player (${sa})`);

    // --- wall: the room behind a wall is not searched first ---
    const b = await run('wall');
    const sb = JSON.stringify({ seen: b.seen, hide: b.hide, at: b.at, tS: b.tS, guard: b.guard, claims: b.claims, level: b.level, maxPathAt: b.maxPathAt });
    assert(!b.err, `wall: ${b.err ?? 'the run picks its spot and completes'} (${JSON.stringify(b)})`);
    // (S25-SAI-TRIAGE 4) the paths below are from where he lost him: that position must hold
    assert(!b.lkpMoved && b.resight < 0, `wall: he never sees him again and his last known position stays (moved ${JSON.stringify(b.lkpMoved)}, seen ${b.resight}; ${sb}; walk ${JSON.stringify(b.trace)})`);
    assert(b.tS > 0 && b.plans.length > 0, `wall: the search starts and asks the plan (${sb}; plans ${JSON.stringify(b.plans)})`);
    // (S25B-RECHECK: cells 1-3 m from the walled pocket are inside R by path, so "no point near it" fails on correct
    // behaviour; the rule is "by path, not straight": every plan point is within R + 0.5 m by path)
    const overR = b.plans.flatMap((p) => p.pts.filter((q) => !(Number(q[3]) <= p.R + 0.5)).map((q) => ({ pt: q, R: p.R })));
    assert(overR.length === 0, `wall: every plan point is within R + 0.5 m by path, never a room reached round a wall (${JSON.stringify(overR)}; hide ${JSON.stringify(b.hide)}; plans ${JSON.stringify(b.plans)})`);
    console.log(`    (wall: the spot ${JSON.stringify(b.hide)}; closest searcher ${b.closest} m at ${b.closestT} s)`);
    const rB = Math.max(...b.plans.map((p) => p.R));
    assert(b.maxPath <= rB + 1, `wall: no searcher farther from the last known position by path than R + 1 m (max ${b.maxPath} m at ${JSON.stringify(b.maxPathAt)}, R ${rB}; ${sb})`);

    // --- three: three searchers, three different spots ---
    const c = await run('three');
    const sc = JSON.stringify({ seen: c.seen, at: c.at, tS: c.tS, claims: c.claims, level: c.level, onPlan: c.onPlan });
    assert(!c.err, `three: ${c.err ?? 'the run completes'} (${JSON.stringify(c)})`);
    assert(c.seen.hunt.every((h) => h === c.seen.hunt[0] && h >= 0), `three: all three hunt the one intruder (${sc})`);
    assert(c.plans.length > 0 && c.plans[0].pts.length >= 3, `three: the plan has at least three points (${JSON.stringify(c.plans)})`);
    assert(c.claims.every((v) => v.length > 0), `three: each searcher takes a plan point (${sc}; plans ${JSON.stringify(c.plans)})`);
    const firsts = c.claims.map((v) => v[0]);
    let apart = 99;
    for (let i = 0; i < firsts.length; i++) for (let j = i + 1; j < firsts.length; j++) apart = Math.min(apart, Math.hypot(firsts[i][0] - firsts[j][0], firsts[i][1] - firsts[j][1]));
    assert(apart >= 3, `three: their first plan points are three different spots, >= 3 m apart (closest pair ${apart.toFixed(1)} m; ${sc})`);
  });

  // (guard-ai S26, A155-A158, CT rule 8) Guards hear in a search and in a fight (S26.md "e2e"; the 'lkp' pattern: one
  // grunt sees the lit player, seeded Math.random, sim-time steps, the other guards passive). The player then goes dark
  // and far (the 'lkp' hide spot HIDE_FAR in the main room, 35 m by path), so nothing but the noise reaches the guard;
  // the noise is fired through the public API as the game does for a footstep: `em.hear(feet, reach, 'noise', null,
  // localId)`. There is no sprint (CT prototype M1): the loudest step on foot is the full-stick jog, so its reach is
  // MEASURED from the game first (`g.noise` over a real full-stick walk, no guards yet, on the surface `g.surface`
  // names) and the step spot is picked (nav cells round the guard; the game's own `tierOf` for walls and masking; the
  // floor surface read from the level's surface areas) inside that reach. 'search': he is `searching` after combat, the
  // step is 1.5 m - reach away, outside his search spot: within 3 s his `searchSpot` is within 1.5 m of it, within 15 s
  // he comes within 2 m of it, slot 0 `locT` < 0.5 and `seenT` > 1 right after (located, not seen), the board's last
  // known position is the step. 'wall': a spot behind a wall that is inside the open reach but outside the wall's
  // (`tierOf` 0, its ratio to the open reach is the wall factor): no re-aim in 5 s, the board unmoved. 'combat': he is in
  // combat and has lost his target: `em.lkp` is the step within 1 s, `sightT` not reset (heard, not seen).
  await scen('heard in a search (guard-ai S26)', async () => {
    const run = (which) =>
      G((which) => {
        const t = window.__t;
        const g = window.__app.current;
        const em = g.enemyMgr;
        const nav = em.nav;
        const H = em.hearingTable;
        const st = window.__app.input.state;
        const rnd = Math.random;
        let seed = which === 'search' ? 4242 : which === 'wall' ? 4343 : 4444;
        Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const r1 = (v) => (Number.isFinite(v) ? +v.toFixed(1) : String(v));
        const r2 = (v) => (Number.isFinite(v) ? +v.toFixed(2) : String(v));
        try {
          // --- the step's reach, from the game: a real full-stick walk, no guards yet ---
          t.reset();
          t.light(0);
          t.tp(32.3, 20.5, 0);
          t.step(1);
          g.noise = 0;
          st.setMove('t', 0, 1);
          let n = 0;
          for (let i = 0; i < 12; i++) {
            t.step(0.1);
            n = Math.max(n, g.noise);
          }
          const calibSurf = g.surface;
          st.setMove('t', 0, 0);
          t.step(0.5);
          if (!(n > 1.5)) return { err: `the full-stick step is not audible (noise ${n}, surface ${calibSurf})` };
          // --- the 'lkp' sighting ---
          t.reset();
          t.light(1);
          // no alarm run (Hunter's reinforcements would find him)
          em.alarmRaised = true;
          const e = t.spawn('grunt', 32.3, 15.5, 0);
          if (!e) return { err: 'the guard did not spawn' };
          t.tp(32.3, 20.5, Math.PI);
          let k = 0;
          while (!(e.alerted && em.sightT < 0.1) && k++ < 900) {
            t.step(1 / 60);
            g.frameUpdate(1 / 60, 1);
          }
          for (let i = 0; i < 10; i++) {
            t.step(1 / 60);
            g.frameUpdate(1 / 60, 1);
          }
          const id = g.localRef.id;
          const b = em.intruders;
          const slot = b.slotFor(id);
          const seen = { alerted: e.alerted, level: e.level, stealth: em.stealth, coordinated: em.coordinated, sightT: r1(em.sightT), frames: k, slot, valid: slot >= 0 ? b.valid[slot] : -1, n: r2(n), surf: calibSurf };
          if (!(e.alerted && slot >= 0 && b.valid[slot] === 1)) return { seen, err: 'the guard did not detect the lit player (no intruder slot)' };
          // he vanishes: dark, crouched, far off in the main room's corner HIDE_FAR (nothing but the noise reaches the guard)
          t.light(0);
          t.crouch(true);
          t.tp(3, 2.5, 0);
          const tick = () => {
            // (the mode's later squads stay out of it: this is about the one guard)
            for (const x of em.enemies) if (x !== e) x.passive = true;
            t.step(0.05);
            g.frameUpdate(0.05, 1);
          };
          // --- spots: nav cells round the guard, inside the step's reach, picked with the game's own hearing ---
          const floor = g.world.map.theme.floor ?? 'concrete';
          const surfAt = (x, y, z) => {
            let best = floor;
            let top = -Infinity;
            for (const a of g.world.level.surfaces) {
              if (x < a.minX || x > a.maxX || z < a.minZ || z > a.maxZ || Math.abs(y - a.top) > 0.35 || a.top <= top) continue;
              top = a.top;
              best = a.kind;
            }
            return best;
          };
          const idx = () => em.enemies.indexOf(e);
          const probe = (x, y, z, reach) => {
            em['hearRoom'](em.enemies.length);
            const i = idx();
            const d = Math.hypot(e.pos.x - x, e.pos.y - y, e.pos.z - z);
            const tier = em['tierOf'](e, i, new t.V(x, y, z), reach, d, false);
            return { tier, d, r: em['hearR'][i] };
          };
          const segD = (px, pz, ax, az, bx, bz) => {
            const sx = bx - ax;
            const sz = bz - az;
            const u = Math.max(0, Math.min(1, ((px - ax) * sx + (pz - az) * sz) / Math.max(1e-6, sx * sx + sz * sz)));
            return Math.hypot(px - ax - u * sx, pz - az - u * sz);
          };
          // 'step': the farthest cell the step is heard at (tier >= 1: anywhere inside the effective reach, A156);
          // 'wall': a cell inside the open reach (the same noise with no wall) that a wall takes it out of (tier 0)
          const pick = (mode, S, lk) => {
            let best = null;
            let cands = 0;
            const R = n + 0.6;
            const y0 = e.pos.y;
            for (let dx = -R; dx <= R; dx += nav.cell) {
              for (let dz = -R; dz <= R; dz += nav.cell) {
                const c = nav.cellOf(e.pos.x + dx, e.pos.z + dz, y0);
                if (c < 0 || !nav.isWalkable(c) || Math.abs(nav.cellHeight(c) - y0) > 1) continue;
                const [x, z] = nav.center(c);
                const d = Math.hypot(x - e.pos.x, z - e.pos.z);
                if (d < 1.5 || d > n + 0.3) continue;
                // (the reach was measured on this surface)
                if (surfAt(x, nav.cellHeight(c), z) !== calibSurf) continue;
                // (outside his search spot, and not on his way to it: walking there must not pass the step)
                if (S && (Math.hypot(x - S[0], z - S[1]) < 3 || segD(x, z, e.pos.x, e.pos.z, S[0], S[1]) < 2)) continue;
                if (lk && Math.hypot(x - lk.x, z - lk.z) < 1.5) continue;
                // ('wall', G2d: not a spot his own search plan visits: the cell behind H1 is the plan's top point, so his spot
                // came within 1.5 m of it with no noise at all)
                if (mode === 'wall') {
                  const pl = em.plans[slot];
                  let nearPlan = false;
                  for (let q = 0; q < pl.n && !nearPlan; q++) nearPlan = Math.hypot(pl.x[q] - x, pl.z[q] - z) < 3;
                  if (nearPlan) continue;
                }
                let ok = false;
                if (mode === 'step') {
                  const p = probe(x, y0, z, n);
                  ok = p.tier >= 1 && d <= p.r - 0.25;
                } else {
                  // masking at him only (no ray: the reach is far beyond the distance), then the real reach
                  const open = n * (probe(x, y0, z, 1000).r / 1000);
                  const p = probe(x, y0, z, n);
                  ok = p.tier === 0 && p.r < open * 0.7 && d < open - 0.25;
                }
                if (!ok) continue;
                cands++;
                if (!best || d > best.d) best = { x, z, d };
              }
            }
            return best ? { ...best, cands } : null;
          };
          const fire = (P) => {
            em.hear(new t.V(P.x, e.pos.y, P.z), n, 'noise', null, id);
          };
          const spot = [0, 0];

          if (which === 'combat') {
            // in combat, his target gone from his sight (a think tick later)
            for (let i = 0; i < 40 && e.alerted && e.seesTarget; i++) tick();
            if (!e.alerted || e.seesTarget) return { seen, err: `combat: not in combat without a line to his target (alerted ${e.alerted}, sees ${e.seesTarget}, level ${e.level})` };
            const L = em.lkpOf(slot);
            const lk = { x: L.x, z: L.z };
            const P = pick('step', null, lk);
            if (!P) return { seen, err: `combat: no spot the step is heard at (reach ${r2(n)} m, guard ${r1(e.pos.x)},${r1(e.pos.z)})` };
            const sight0 = em.sightT;
            fire(P);
            let lkpMin = Math.hypot(em.lkp.x - P.x, em.lkp.z - P.z);
            for (let i = 0; i < 20; i++) {
              tick();
              lkpMin = Math.min(lkpMin, Math.hypot(em.lkp.x - P.x, em.lkp.z - P.z));
            }
            return { seen, P, lk, lkpMin: r2(lkpMin), lkpFrom: r2(Math.hypot(P.x - lk.x, P.z - lk.z)), sight0: r2(sight0), sight1: r2(em.sightT), seenT: r2(b.seenT[slot]), locT: r2(b.locT[slot]), heardAt: r2(e.heardAt), alerted: e.alerted, level: e.level, valid: em.lkpValid };
          }

          // --- searching: after combat, the walk on to the last known position and the sweep round it ---
          let tS = -1;
          for (let i = 0; i < 600; i++) {
            tick();
            if (e.level === 'searching') {
              tS = (i + 1) * 0.05;
              break;
            }
          }
          if (tS < 0) return { seen, err: `he never searched within 30 s (level ${e.level})` };
          // a second on: he is walking to a spot
          for (let i = 0; i < 20; i++) tick();
          if (e.level !== 'searching') return { seen, err: `searching: he stopped searching within a second (level ${e.level})` };
          const S = e.searchSpot([0, 0]);
          const info = { tS: r1(tS), combatSearch: e.inCombatSearch, guard: [r1(e.pos.x), r1(e.pos.z)], spot: [r1(S[0]), r1(S[1])] };
          const L0 = em.lkpOf(slot);
          const lkp0 = { x: L0.x, z: L0.z };
          const locBefore = r2(b.locT[slot]);
          let P = null;
          let moved = false;
          if (which === 'search') {
            P = pick('step', S, null);
            if (!P) return { seen, info, err: `search: no spot outside his search spot the step is heard at (reach ${r2(n)} m)` };
          } else {
            P = pick('wall', S, null);
            if (!P) {
              // none by where he stands: stand him (searching, his spot kept) at a cell with a wall near, in the open
              const home = { x: e.pos.x, y: e.pos.y, z: e.pos.z };
              outer: for (let dx = -8; dx <= 8; dx += 1.5) {
                for (let dz = -8; dz <= 8; dz += 1.5) {
                  const c = nav.cellOf(home.x + dx, home.z + dz, home.y);
                  if (c < 0 || !nav.isWalkable(c) || Math.abs(nav.cellHeight(c) - home.y) > 1) continue;
                  const [x, z] = nav.center(c);
                  e.pos.set(x, nav.heightAt(x, z, home.y), z);
                  P = pick('wall', S, null);
                  if (P) {
                    moved = true;
                    break outer;
                  }
                }
              }
              if (!P) {
                e.pos.set(home.x, home.y, home.z);
                return { seen, info, err: `wall: no spot behind a wall inside the open reach (${r2(n)} m) round him or within 8 m of him` };
              }
              e['prevPos'].copyFrom(e.pos);
            }
          }
          const d0 = Math.hypot(e.pos.x - P.x, e.pos.z - P.z);
          const lvl0 = e.level;
          fire(P);
          const after = { locT: r2(b.locT[slot]), seenT: r1(b.seenT[slot]), heardAt: r2(e.heardAt), lkpAt: r2(Math.hypot(em.lkp.x - P.x, em.lkp.z - P.z)), lkpMoved: r2(Math.hypot(em.lkp.x - lkp0.x, em.lkp.z - lkp0.z)) };
          let spotMin = 99;
          let spotT = -1;
          let closest = d0;
          let closestT = 0;
          const watch = (tt, spotWindow) => {
            if (tt <= spotWindow) {
              e.searchSpot(spot);
              const ds = Math.hypot(spot[0] - P.x, spot[1] - P.z);
              spotMin = Math.min(spotMin, ds);
              if (spotT < 0 && ds <= 1.5) spotT = tt;
            }
            const dd = Math.hypot(e.pos.x - P.x, e.pos.z - P.z);
            if (dd < closest) {
              closest = dd;
              closestT = tt;
            }
          };
          watch(0, 3);
          const secs = which === 'search' ? 15 : 5;
          for (let i = 1; i <= secs * 20; i++) {
            tick();
            watch(i * 0.05, which === 'search' ? 3 : secs);
          }
          const end = { locT: r2(b.locT[slot]), seenT: r1(b.seenT[slot]), heardAt: r2(e.heardAt), lkpMoved: r2(Math.hypot(em.lkp.x - lkp0.x, em.lkp.z - lkp0.z)), level: e.level };
          return { seen, info, P: { x: r1(P.x), z: r1(P.z), d: r2(P.d ?? d0), cands: P.cands }, d0: r2(d0), moved, lvl0, locBefore, after, end, spotMin: r2(spotMin), spotT: r2(spotT), closest: r2(closest), closestT: r1(closestT) };
        } finally {
          Math.random = rnd;
          st.setMove('t', 0, 0);
          t.crouch(false);
          t.light(null);
        }
      }, which);

    // --- search: he walks to the step ---
    const a = await run('search');
    const sa = JSON.stringify({ seen: a.seen, info: a.info, P: a.P, d0: a.d0, locBefore: a.locBefore, after: a.after });
    assert(!a.err, `search: ${a.err} (${JSON.stringify(a)})`);
    assert(a.seen.stealth && a.seen.coordinated, `search: the stealth, coordinated brain (${sa})`);
    assert(a.info.combatSearch, `search: his search follows combat (${sa})`);
    assert(a.locBefore > 1, `search: before the step his intruder was last located more than a second ago (${sa})`);
    assert(a.spotT >= 0 && a.spotMin <= 1.5 && a.spotT <= 3, `search: within 3 s his search spot is within 1.5 m of the step (closest ${a.spotMin} m, at ${a.spotT} s; ${sa})`);
    assert(a.after.heardAt < 3, `search: he re-aimed on the noise (his own re-aim clock ${a.after.heardAt}; ${sa})`);
    assert(a.closest < 2, `search: within 15 s he comes within 2 m of the step (closest ${a.closest} m at ${a.closestT} s; ${sa})`);
    assert(a.after.locT < 0.5, `search: the noise locates its maker: locT ${a.after.locT} s (${sa})`);
    assert(a.after.seenT > 1, `search: heard, not seen: seenT ${a.after.seenT} s (${sa})`);
    assert(a.after.lkpAt <= 0.5, `search: his last known position is the step (${a.after.lkpAt} m off; ${sa})`);
    console.log(`    (search: step ${a.P.d} m off, his spot on it after ${a.spotT} s, closest ${a.closest} m at ${a.closestT} s; reach ${a.seen.n} m on ${a.seen.surf})`);

    // --- wall: behind a wall, inside the open reach, he does not turn ---
    const w = await run('wall');
    const sw = JSON.stringify({ seen: w.seen, info: w.info, P: w.P, d0: w.d0, moved: w.moved, locBefore: w.locBefore, after: w.after, end: w.end });
    assert(!w.err, `wall: ${w.err} (${JSON.stringify(w)})`);
    assert(w.lvl0 === 'searching', `wall: he is searching when it sounds (${sw})`);
    assert(w.after.heardAt > 50 && w.end.heardAt > 50, `wall: no re-aim in 5 s (his re-aim clock ${w.after.heardAt} / ${w.end.heardAt}; ${sw})`);
    assert(w.spotMin > 1.5, `wall: his search spot never goes to the step (closest ${w.spotMin} m; ${sw})`);
    assert(w.end.locT > 1 && w.end.lkpMoved < 0.05, `wall: the board did not move (locT ${w.end.locT}, last known position moved ${w.end.lkpMoved} m; ${sw})`);

    // --- combat: he has lost his target and hears him: his last known position is the step ---
    const c = await run('combat');
    const sc = JSON.stringify({ seen: c.seen, P: c.P, lk: c.lk, lkpFrom: c.lkpFrom, lkpMin: c.lkpMin, sight0: c.sight0, sight1: c.sight1, seenT: c.seenT, locT: c.locT, heardAt: c.heardAt, level: c.level });
    assert(!c.err, `combat: ${c.err} (${JSON.stringify(c)})`);
    assert(c.lkpFrom > 1, `combat: the step is away from the old last known position (${c.lkpFrom} m; ${sc})`);
    assert(c.lkpMin <= 0.5, `combat: within 1 s the last known position is the step (${c.lkpMin} m off; ${sc})`);
    assert(c.sight1 >= c.sight0 - 0.05 && c.seenT >= c.sight0 - 0.05, `combat: heard, not seen: sightT not reset (${c.sight0} -> ${c.sight1}, seenT ${c.seenT}; ${sc})`);
    assert(c.locT < 1.1, `combat: the noise located him (locT ${c.locT}; ${sc})`);
  });

  await scen('bodies', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(0);
      t.tp(3, 2.5, 0);
      // lit: a body in the hall's lamp pool (S8, under L0), a guard 4.5 m away facing it
      const v = t.spawn('grunt', 32.3, 23.5, 0);
      t.kill(v);
      const w = t.spawn('grunt', 32.3, 19, 0);
      const mate = t.spawn('grunt', 35.5, 26.5, 0);
      // (chain fix) bodiesFound is not reset between scenarios (an earlier scenario can leave a find behind): count finds
      // from here, and only w's find of this body counts
      const f00 = em.bodiesFound;
      const ob = em.onBodyFound;
      let finder = null;
      em.onBodyFound = (e, b) => { if (finder === null) finder = e === w ? 'w' : e === mate ? 'mate' : String(e.id); ob?.(e, b); };
      let found = false;
      for (let i = 0; i < 40 && !found; i++) {
        t.step(0.1);
        found = em.bodiesFound > f00;
      }
      em.onBodyFound = ob;
      const lw = w.level;
      // (guard-ai S4) the finder is held cautious at once and radios it; the mate (out of voice range) learns of it
      // when the report gets through: cautious; (guard-ai S19, walk 4.72 G3) and, calm and in range, the board sends him
      // to hurry over and help search the body
      const cw = em.cautionOf(w);
      const left = em.radioLeft(w);
      const cmate0 = em.cautionOf(mate);
      const helps0 = em.bodyHelps;
      t.step(left + em.radioTable.staggerMax + 0.5);
      const lmate = mate.level;
      const cmate = em.cautionOf(mate);
      const helps = em.bodyHelps - helps0;
      // shadow: a body in the dark bay, a guard 3.5 m away facing it
      t.reset();
      t.light(0);
      t.tp(3, 2.5, 0);
      const f0 = em.bodiesFound;
      const v2 = t.spawn('grunt', 34.5, 3, 0);
      t.kill(v2);
      t.spawn('grunt', 34.5, 6.5, Math.PI);
      t.step(5);
      const dark = em.bodiesFound - f0;
      t.light(null);
      return { found, lw, lmate, dark, bodies: em.bodies.length, cw, left, cmate0, cmate, finder, helps };
    });
    assert(r.found, 'a body in the light is found');
    assert(r.finder === 'w', `the guard facing it is the finder (${r.finder})`);
    assert(r.lw === 'searching', `the finder searches (${r.lw})`);
    assert(r.cw === 2 && r.left > 0, `the finder is held cautious and radios it (caution ${r.cw}, call ${r.left.toFixed(2)} s)`);
    assert(r.cmate0 === 0, `the mate does not know before the report gets through (${r.cmate0})`);
    assert(r.cmate === 2 && r.lmate === 'searching' && r.helps === 1, `the report gets through: the mate is cautious and (S19) hurries over to help search the body (${r.cmate}, ${r.lmate}, sent ${r.helps})`);
    assert(r.dark === 0, `a body in the dark at 3.5 m is not found (${r.dark})`);
  });

  await scen('carry', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const st = window.__app.input.state;
      t.light(0);
      // (x 33.5, not the spec's 30.3: walking on with the body from there came within 1.5 m of the dumpster's hiding spot, so the
      // interact hid the body instead of putting it down)
      const v = t.spawn('grunt', 33.5, 3.5, 0);
      t.tp(33.5, 1.0, 0);
      t.step(0.2);
      t.kill(v);
      t.step(4);
      const b = em.bodies[0];
      t.tp(b.pos.x, b.pos.z - 0.9, 0);
      t.step(0.2);
      const offer = g.interactTarget?.label;
      st.tap('interact');
      t.step(0.1);
      const carrying = !!g.stealth.carry;
      const stowed = g.weapons.stowed;
      // (G7, AUDIT-WALLS row 6, 110936 @ 39.5-42.6) the lift onto the shoulder takes 2.0 s (was instant): no walking in it
      const lifting = g.stealth.busy;
      t.step(2.0);
      const lifted = !!g.stealth.carry && !g.stealth.busy;
      st.setMove('t', 0, 1);
      st.tap('dash');
      t.step(1.5);
      const speed = g.player.controller.speed;
      st.setMove('t', 0, 0);
      t.step(0.3);
      // put down, pick up again, then into the dumpster
      st.tap('interact');
      t.step(2.5);
      const dropped = !g.stealth.carry && em.bodies[0]?.present;
      const b2 = em.bodies[0];
      t.tp(b2.pos.x - 0.8, b2.pos.z, Math.PI / 2);
      t.step(0.2);
      st.tap('interact');
      t.step(0.2);
      const again = !!g.stealth.carry;
      t.step(2.0);
      t.tp(30.3, 6.05, 0);
      t.step(0.2);
      const hideOffer = g.interactTarget?.label;
      st.tap('interact');
      t.step(0.2);
      t.light(null);
      return { offer, carrying, stowed, lifting, lifted, speed, dropped, again, hideOffer, hidden: g.stealth.bodiesHidden, present: em.bodies.filter((x) => x.present).length };
    });
    assert(r.offer === 'Pick up body', `standing at a body offers to pick it up (${r.offer})`);
    assert(r.carrying && r.stowed, 'picking it up puts it on the shoulder and stows the weapon');
    assert(r.lifting && r.lifted, `the pick-up is a 2.0 s lift onto the shoulder (${r.lifting} / ${r.lifted})`);
    // (G7, row 7, 110936 @ 44.0-45.5: CT 0.4-0.8 m/s; was < 2.4 against the old 2.2 cap)
    assert(r.speed > 0.3 && r.speed < 0.85, `carrying is a slow walk, no sprint (${r.speed.toFixed(2)} m/s)`);
    assert(r.dropped, 'it can be put down again');
    assert(r.again, 'and picked up again');
    assert(r.hideOffer === 'Hide body', `at the dumpster: hide it (${r.hideOffer})`);
    assert(r.hidden === 1 && r.present === 0, 'hidden bodies are gone for good');
  });

  await scen('shots', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(0);
      t.tp(32.3, 27.2, Math.PI);
      const e = t.spawn('grunt', 32.3, 20.2, Math.PI);
      t.step(0.3);
      const stats = g.weapons.current.stats;
      const n0 = stats.noise;
      stats.noise = 0.45;
      g.weapons.lastShotNoise = 0.45; // (sd-rounds) onShot reads the fired round's noise, not stats
      g.weapons.events.onShot(g.weapons.current.def);
      t.step(0.2);
      // (guard-ai S1) 7 m of a 12.6 m suppressed report is outside half the reach (6.3 m): he only turns to look
      const supp = e.level;
      const suppTurn = e.turning;
      // (S1 check fix 2) read again after ALERT.hearLook: the old "everyone walks over" rule would have him
      // investigating by now
      t.step(2.6);
      const supp2 = e.level;
      stats.noise = n0;
      // (guard-ai S1) a loud report is combat only inside a quarter of its reach (`HEARING.combatDb`, 28 m -> ~7 m)
      const N = g.constructor.NOISE;
      const H = g.enemyMgr.hearingTable;
      const quarter = N.shot * Math.pow(10, -H.combatDb / 20);
      const loudShot = () => {
        // (an unsuppressed report: the issued Hush 9 SD is quiet)
        const st2 = g.weapons.current.stats;
        const n1 = st2.noise;
        st2.noise = 1;
        g.weapons.lastShotNoise = 1;
        g.weapons.events.onShot(g.weapons.current.def);
        st2.noise = n1;
      };
      t.reset();
      t.light(0);
      t.tp(32.3, 27.2, Math.PI);
      const e2 = t.spawn('grunt', 32.3, 27.2 - quarter * 0.7, Math.PI);
      t.step(0.3);
      loudShot();
      t.step(0.2);
      const loud = e2.level;
      // the same report 8 m off (inside half its reach, outside a quarter): he is sent to look, not to a fight
      t.reset();
      t.light(0);
      t.tp(32.3, 27.2, Math.PI);
      const e2b = t.spawn('grunt', 32.3, 19.2, Math.PI);
      t.step(0.3);
      loudShot();
      t.step(0.2);
      const loudFar = e2b.level;
      t.step(2.6);
      const loudFar2 = e2b.level;
      t.reset();
      t.light(0);
      t.tp(3, 2.5, 0);
      // the round lands on H1's west face (x 34.35), 2.3 m from the guard
      const e3 = t.spawn('grunt', 32.0, 21.5, 0);
      t.step(0.3);
      g.weapons.onRay(new t.V(29, 1, 21.5), new t.V(34.3, 1, 21.5));
      t.step(0.2);
      const impact = e3.level;
      const impactTurn = e3.turning;
      t.light(null);
      return { supp, suppTurn, supp2, loud, loudFar, loudFar2, impact, impactTurn, quarter };
    });
    assert(r.supp !== 'alert' && r.supp !== 'investigating' && (r.supp === 'suspicious' || r.suppTurn), `a suppressed shot 7 m off only makes a guard turn to look (${r.supp}, turning ${r.suppTurn})`);
    assert(r.suppTurn && r.supp2 !== 'investigating' && r.supp2 !== 'alert', `...he turned, and 2.6 s later he still has not walked over (${r.supp2})`);
    assert(r.loud === 'alert', `a loud shot inside a quarter of its reach puts him in combat (${r.loud}, quarter ${r.quarter.toFixed(2)} m)`);
    assert(r.loudFar === 'suspicious' && r.loudFar2 === 'investigating', `a loud shot 8 m off sends him to look, not to a fight (${r.loudFar} -> ${r.loudFar2})`);
    assert(r.impact === 'suspicious' || r.impact === 'investigating' || r.impactTurn, `a round landing close by is heard (${r.impact}, turning ${r.impactTurn})`);
  });

  await scen('vision', async () => {
    // (F1a, G179) the button toggles the wheel's mode (night by default), instant; the wheel picks thermal / electro
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const v = g.vision;
      t.light(null);
      // a guard at P, 5 m from the player in the hall
      t.spawn('grunt', 32.3, 15.5, 0);
      t.tp(32.3, 20.5, Math.PI);
      t.step(0.2);
      const press = () => {
        st.tap('vision');
        t.step(0.05);
        g.frameUpdate(0.05, 1);
      };
      press();
      const night = { mode: v.mode, nv: g.post['nv'], hud: document.querySelector('.tac-vision')?.textContent };
      press();
      const off = { mode: v.mode, hud: document.querySelector('.tac-vision')?.textContent, vk: g.post.visionKind };
      const nvOff = g.post['nv'];
      v.select('thermal');
      press();
      const thermal = { mode: v.mode, vk: g.post.visionKind, nv: g.post['nv'] };
      v.select('electro');
      const electro = { mode: v.mode, vk: g.post.visionKind };
      g.frameUpdate(0.05, 1);
      electro.vk = g.post.visionKind;
      press();
      return { thermal, electro, night, off, nvOff };
    });
    assert(r.night.mode === 'night' && r.night.nv > 0.9 && r.night.hud === 'NV', `the goggles button: night vision first, at once (${JSON.stringify(r.night)})`);
    assert(r.off.mode === 'off' && r.off.hud === '' && r.off.vk === 0, `then off (${JSON.stringify(r.off)})`);
    assert(r.thermal.mode === 'thermal' && r.thermal.vk === 1 && r.thermal.nv < 0.01, `the wheel picked thermal, the button turns it on (${JSON.stringify(r.thermal)})`);
    assert(r.electro.mode === 'electro' && r.electro.vk === 2, `picking electro with the goggles on switches at once (${JSON.stringify(r.electro)})`);
    assert(r.nvOff < 0.01, `night vision is off (${r.nvOff})`);
  });

  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
