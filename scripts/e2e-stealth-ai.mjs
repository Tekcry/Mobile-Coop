// Stealth AI on the night Warehouse (Clear mode, stealth rules): shadow vs light detection, the awareness arc
// warning before detection, no sight through walls, noise -> suspicious -> investigating, the squad radio,
// LKP set + ghost + search that converges and ends, (guard-ai S25) the probable-area search after combat, patrols
// walking their routes.
// (guard-ai S1) Hearing is the coordinated rule the live modes use (`EnemyManager.coordinated`; Clear mode, parked,
// keeps the old one, so the suite turns it on): one guard is sent to a noise, the others turn.
// `node scripts/e2e-stealth-ai.mjs [url] [--only=name]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
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
    // dark racking aisle: a crouched sneak past behind a guard, and crouched still in front at 8 m
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', -14.5, 10, 0);
      t.crouch(true);
      t.tp(-15.2, 6.2, Math.PI / 2);
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
      t.tp(-14.5, 17.5, Math.PI);
      e.yaw = 0;
      let front = 0;
      for (let k = 0; k < 40; k++) {
        t.step(0.1);
        front = Math.max(front, e.meter);
      }
      return { light, max, front, level: e.level };
    });
    assert(r.light < 0.28, `the aisle is in shadow (light ${r.light.toFixed(2)})`);
    assert(r.max < 0.3, `a crouched sneak behind a guard in shadow stays unnoticed (meter max ${r.max.toFixed(2)})`);
    assert(r.front < 0.3, `crouched still in the dark in front at ~7 m stays unnoticed (meter max ${r.front.toFixed(2)}, ${r.level})`);
  });

  await scen('light', async () => {
    // lit factory floor: a walker in a lamp pool is seen; the arc warns first
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(null);
      const e = t.spawn('grunt', 0, 5, Math.PI);
      t.tp(-0.5, -3, 0);
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
        // the same random draws every run (guard reaction jitter): only the vision mode differs
        let seed = 12345;
        Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        t.reset();
        t.light(null);
        g.vision.reset();
        g.vision.set(mode);
        const e = t.spawn('grunt', 0, 5, Math.PI);
        t.tp(-0.5, -3, 0);
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

  await scen('vision-dog', async () => {
    // (step 14) the dog's own body (its humanoid rig is hidden) is warm in thermal, cold otherwise, and cools once dead
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const e = t.spawn('dog', 0, 5, Math.PI);
      // the mode changes at the middle of the goggle flip (fixed step), then the render frame paints
      const frame = () => {
        t.step(0.3);
        for (let k = 0; k < 3; k++) g.frameUpdate(1 / 60, 1);
      };
      g.vision.reset();
      frame();
      const off0 = e.dog.partHeat();
      g.vision.set('thermal');
      frame();
      const on = e.dog.partHeat();
      t.kill(e);
      frame();
      const dead0 = e.dog.partHeat();
      e.dog.downAge = 30 - 0.4;
      frame();
      const dead30 = e.dog.partHeat();
      e.dog.downAge = 61 - 0.4;
      frame();
      const dead61 = e.dog.partHeat();
      g.vision.reset();
      frame();
      return { off0, on, dead0, dead30, dead61, off1: e.dog.partHeat(), vk: g.post.visionKind };
    });
    assert(r.off0 === 0 && r.on > 0.5, `a live dog's part: pattern.w 0 with thermal off, > 0 with it on (${JSON.stringify(r)})`);
    assert(r.dead0 > 0.5 && r.dead30 > 0.3 && r.dead30 < r.dead0 && r.dead61 === 0, `a dead dog cools over 60 s (${JSON.stringify(r)})`);
    assert(r.off1 === 0, `thermal off again: the dog is cold (${JSON.stringify(r)})`);
  });

  await scen('walls', async () => {
    const r = await G(() => {
      const t = window.__t;
      // dispatch guard facing the corridor wall; the player lit, walking, right behind the wall
      t.light(1);
      const e = t.spawn('grunt', -2, -13, 0);
      t.tp(-2, -9.9, Math.PI);
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
      const e = t.spawn('grunt', -14.5, 4 + half * 0.6, 0);
      t.tp(-14.5, 4, 0);
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
      t.tp(-22, -24, 0);
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
      t.tp(-22, -24, 0);
      const P = new t.V(3, 0, 3);
      const gs = [t.spawn('grunt', 3, 5.5, 0), t.spawn('grunt', 7.5, 4, Math.PI / 2), t.spawn('grunt', 0, 7, 0), t.spawn('grunt', 6, -2, Math.PI)];
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

  await scen('radio', async () => {
    // (guard-ai S3, M5) the spotter's call goes to his whole section (this map is one section), staggered by distance
    // once it completes: the near squadmate (~11 m, out of voice) first, the far one (~24 m: the old 22 m radio range
    // did not reach him) later; nobody before the call completes
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const R = em.radioTable;
      t.light(1);
      const a = t.spawn('grunt', 0, 5, Math.PI);
      const b = t.spawn('grunt', 10, 9, Math.PI);
      const far = t.spawn('grunt', -21, 17, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!a.alerted && k++ < 300) t.step(1 / 60);
      const bBefore = b.alerted;
      const pending = em.radioLeft(a);
      // (guard-ai S6) the contact call completing (his command call opens at once, so radioLeft stays > 0)
      const c0 = em.radioNet.completed;
      let time = 0;
      let bT = -1;
      let farT = -1;
      let done = -1;
      while (time < pending + R.staggerMax + 1.5) {
        t.step(0.05);
        time += 0.05;
        if (done < 0 && em.radioNet.completed > c0) done = time;
        if (bT < 0 && b.alerted) bT = time;
        if (farT < 0 && far.alerted) farT = time;
      }
      t.light(null);
      return { a: a.alerted, bBefore, pending, done, bT, farT, max: R.staggerMax, d: [Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z), Math.hypot(far.pos.x - a.pos.x, far.pos.z - a.pos.z)], lkp: em.lkpValid };
    });
    const f = (v) => v.toFixed(2);
    assert(r.a, 'the guard who sees the player is alerted');
    assert(r.pending > 1.5 && !r.bBefore, `the spotter takes a moment to radio it in (${f(r.pending)} s)`);
    assert(r.bT > 0 && r.bT >= r.pending - 0.05, `a squadmate out of voice range joins only once it is called in (at ${f(r.bT)} s, call ${f(r.pending)} s)`);
    assert(r.farT > r.bT, `the far guard of the same section is told too, after the nearer one (${f(r.farT)} > ${f(r.bT)} s; ${r.d.map(f)} m)`);
    assert(r.farT <= r.pending + r.max + 0.3, `everyone within the call + ${r.max} s (${f(r.farT)} s)`);
    assert(r.lkp, 'the sighting sets the last known position');
  });

  await scen('radio window', async () => {
    const r = await G(() => {
      const t = window.__t;
      const em = window.__app.current.enemyMgr;
      t.light(1);
      const a = t.spawn('grunt', 0, 5, Math.PI);
      const b = t.spawn('grunt', 10, 9, Math.PI);
      const near = t.spawn('grunt', 3, 8, Math.PI);
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!a.alerted && k++ < 300) t.step(1 / 60);
      // the guard close by (~4 m, in the open) hears the shout at once (voice: +0.3 s)
      t.step(0.8);
      const nearOn = near.alerted;
      const left = em.radioLeft(a);
      const lost0 = em.radioNet.lost;
      // the spotter is taken out (silently) before the call gets through
      a.knockOut({ amount: 999, point: a.pos.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: a.pos.clone(), impulse: 0 });
      near.knockOut({ amount: 999, point: near.pos.clone(), dir: new t.V(0, 0, 1), part: 'body', kind: 'melee', attackerTeam: 'player', attackerId: 'local', sourcePos: near.pos.clone(), impulse: 0 });
      t.tp(-21, -24, 0);
      t.step(7);
      t.light(null);
      return { nearOn, left, lost: em.radioNet.lost - lost0, b: b.level };
    });
    assert(r.nearOn, 'a squadmate close by joins at once (the shout)');
    assert(r.left > 0.5, `the call is still going out when he is taken out (${r.left.toFixed(2)} s left)`);
    assert(r.lost >= 1, `his call is lost (${r.lost})`);
    assert(r.b !== 'alert', `the spotter taken out before calling it in: nobody else is told (${r.b})`);
  });

  await scen('radio stagger', async () => {
    // (guard-ai S3, M5) five squadmates of one section, out of voice range and facing away: when the spotter's call
    // completes they hear it one at a time, nearest first, over more than a second, all within the call + staggerMax;
    // never all at once
    const r = await G(() => {
      const t = window.__t;
      const em = window.__app.current.enemyMgr;
      const R = em.radioTable;
      t.light(1);
      const a = t.spawn('grunt', 0, 5, Math.PI);
      const os = [t.spawn('grunt', 4, 13, 0), t.spawn('grunt', -7, 14, 0), t.spawn('grunt', 9, 17, 0), t.spawn('grunt', -14, 17, 0), t.spawn('grunt', -21, 17, 0)];
      t.tp(-0.5, 0, 0);
      let k = 0;
      while (!a.alerted && k++ < 300) t.step(1 / 60);
      const before = os.filter((e) => e.alerted).length;
      const pending = em.radioLeft(a);
      // (guard-ai S6) the contact call completing (his command call opens at once, so radioLeft stays > 0)
      const c0 = em.radioNet.completed;
      const at = os.map(() => -1);
      let dist = null;
      let time = 0;
      while (time < pending + R.staggerMax + 1.5) {
        t.step(0.05);
        time += 0.05;
        // distances from the spotter where the call completes (the net sorts by them)
        if (!dist && em.radioNet.completed > c0) dist = os.map((e) => Math.hypot(e.pos.x - a.pos.x, e.pos.y - a.pos.y, e.pos.z - a.pos.z));
        os.forEach((e, i) => {
          if (at[i] < 0 && e.alerted) at[i] = time;
        });
      }
      t.light(null);
      return { before, pending, at, dist, max: R.staggerMax, voice: os.map((e) => Math.hypot(e.pos.x - 0, e.pos.z - 5)) };
    });
    const f = (v) => v.toFixed(2);
    assert(r.before === 0 && r.dist, `nobody else knows at the sighting; the call completes (${r.before}, ${f(r.pending)} s)`);
    assert(r.at.every((x) => x > 0), `all five are told (${r.at.map(f)})`);
    const order = r.dist.map((d, i) => [d, r.at[i]]).sort((p, q) => p[0] - q[0]);
    let ordered = true;
    for (let i = 1; i < order.length; i++) if (!(order[i][1] > order[i - 1][1])) ordered = false;
    assert(ordered, `nearest first, each later than the one before (${order.map((p) => `${f(p[0])} m @ ${f(p[1])} s`).join(', ')})`);
    const first = Math.min(...r.at);
    const last = Math.max(...r.at);
    assert(first >= r.pending, `nobody before the call completes (${f(first)} >= ${f(r.pending)} s)`);
    assert(last - first > 1, `spread over more than a second (${f(last - first)} s)`);
    assert(last <= r.pending + r.max + 0.3, `all within the call + ${r.max} s (${f(last)} <= ${f(r.pending + r.max + 0.3)} s)`);
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
        const e = t.spawn('grunt', 0, 5, Math.PI);
        t.tp(-0.5, 0, 0);
        let k = 0;
        while (!(e.alerted && em.sightT < 0.1) && k++ < 900) {
          t.step(1 / 60);
          g.frameUpdate(1 / 60, 1);
        }
        const seen = { alerted: e.alerted, level: e.level, sightT: +em.sightT.toFixed(2), lkp: em.lkpValid, frames: k, captured: g.ghost.captured };
        const seenAt = { x: em.lkp.x, z: em.lkp.z };
        // vanish behind the dispatch wall (out of sight, far from the last known position). (guard-ai S25b) Behind the
        // z = -18 wall row at (0, -20): 35 m by path, past the probable area's reach (`SEARCH_AREA.max` 20 m + 3; the old
        // (-2, -15) was 19 m by path, inside it, so a searcher could legitimately walk there: S25B-CHECK-B)
        t.light(0);
        t.tp(0, -20, 0);
        const hid = { x: +g.player.position.x.toFixed(2), z: +g.player.position.z.toFixed(2) };
        let ghost = false;
        let searching = false;
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
          if (e.level === 'searching') searching = true;
          closest = Math.min(closest, Math.hypot(e.pos.x - seenAt.x, e.pos.z - seenAt.z));
          if (e.level === 'alert' && e.sinceSeen > 1 && Math.hypot(e.pos.x - 0, e.pos.z + 20) < 2) wallhack = true;
        }
        const lkpNear = Math.hypot(em.lkp.x - seenAt.x, em.lkp.z - seenAt.z);
        // the search ends
        for (let i = 0; i < 50; i++) t.step(1);
        for (let i = 0; i < 5; i++) g.frameUpdate(0.2, 1);
        t.light(null);
        return { seen, why, lkpNear, ghost, searching, closest, wallhack, hid, end: e.level, guard: { x: +e.pos.x.toFixed(1), z: +e.pos.z.toFixed(1) }, lkpAfter: em.lkpValid, ghostAfter: g.ghost.visible };
      } finally {
        Math.random = rnd;
      }
    });
    assert(r.seen.alerted && r.seen.sightT < 0.1, `the guard detects the lit player in front of him (${JSON.stringify(r.seen)})`);
    assert(r.lkpNear < 1.5, `the last known position stays where the player was seen (${r.lkpNear.toFixed(2)} m off)`);
    assert(r.ghost, `the LKP ghost shows once they lose sight (first frame of: ${JSON.stringify(r.why)}, captured ${r.seen.captured})`);
    assert(r.closest < 2.5, `they converge on the last known position (closest ${r.closest.toFixed(2)} m)`);
    assert(r.searching, 'they search from it');
    assert(!r.wallhack, `they never home in on the hidden player (hidden at ${JSON.stringify(r.hid)})`);
    assert(r.end === 'cooldown' || r.end === 'unaware', `the search ends (${r.end}; guard at ${JSON.stringify(r.guard)}, player at ${JSON.stringify(r.hid)})`);
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
          for (const x of xs) gs.push(t.spawn('grunt', x, 5, Math.PI));
          if (gs.some((x) => !x)) return { err: 'a guard did not spawn' };
          const e = gs[0];
          // his eye over his feet, standing (enemy.ts `eye`), for the 'near' sight test below
          const eyeUp = e['eye'](new t.V()).y - e.pos.y;
          t.tp(-0.5, 0, 0);
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
          // (S25-SAI-TRIAGE) out of his sight from his walk (post (0, 5) -> last known position) and round the last
          // known position: an alerted guard sees by line of sight alone, light or not (enemy.ts `updateAwareness`),
          // so a spot he can see from there is no vanish: he sees him again and the last known position moves onto
          // him (the 8bd13e0c pick (-4.75, -2.25) was in view through the 1.1 m gap in the x -4 wall). Eyes on
          // walkable cells only; a static ray to the crouched hips, chest and head, clear as the guard's own losClear
          const eyes = [];
          const ne = Math.max(1, Math.ceil(Math.hypot(Lx, Lz - 5) / 0.5));
          for (let q = 0; q <= ne; q++) eyes.push([(Lx * q) / ne, 5 + ((Lz - 5) * q) / ne]);
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
              // (nor within 3 m of his walk from his post (0, 5) to the last known position: that would pass it too)
              const sx = Lx, sz = Lz - 5;
              const u = Math.max(0, Math.min(1, ((x - 0) * sx + (z - 5) * sz) / Math.max(1e-6, sx * sx + sz * sz)));
              if (Math.hypot(x - u * sx, z - 5 - u * sz) < 3) return;
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
          } else hide = { x: 0, z: -20, far: true };
          // he vanishes: dark, crouched
          t.light(0);
          t.crouch(true);
          // (S25-SAI-TRIAGE 5) 'wall': the player waits out the combat at the far park spot (0, -20) (behind the
          // dispatch walls, as 'three' and 'lkp') and takes the walled spot only once the search starts. His combat
          // route (the seeded cover pick: north-west to about (-2.1, 9.7), then cover at about (1-3.4, 9.5)) saw the
          // walled spot through the x -4 gap at z 8-9.1 (round 4: the LKP moved onto it at 2.2 s). A searcher is calm
          // and sees by the light (0 here), so from then on the spot stays hidden. 'wall' measures the plan and the
          // walk by path from where he lost him, so it needs no particular spot during the fight
          const park = which === 'wall' ? { x: 0, z: -20 } : hide;
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
          // (S25-SAI-TRIAGE 3) a sight resets his `sinceSeen` to 0; it was ~0 at the tp (he watched the lit player till
          // then), so a new sight is a drop, not a low value (round 2 flagged 0.05 s, the clock just counting on)
          let prevSince = e.sinceSeen;
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
            // (or still in sight: 0.2 s on, the clock would be past 0.1 without one)
            if (resight < 0 && e.alerted && (e.sinceSeen < prevSince || (time > 0.2 && e.sinceSeen < 0.1))) resight = r1(time);
            prevSince = e.sinceSeen;
            {
              const lk = em.lkpOf(s);
              if (!lkpMoved && lk && Math.hypot(lk.x - Lx, lk.z - Lz) > 0.5) lkpMoved = { t: r1(time), at: [r1(lk.x), r1(lk.z)] };
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
            if (tS < 0 && e.level === 'alert' && e.sinceSeen > 1 && d < 2) homing = true;
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

  await scen('patrol', async () => {
    const r = await G(() => {
      const t = window.__t;
      t.light(0);
      const e = t.spawn('grunt', -19, -10.5, Math.PI);
      e.setPatrol({ points: [[-19, -10.5], [-12.5, -8.6], [-16.5, -14.8]], wait: 1 });
      t.tp(-22, 16, 0);
      const pts = [];
      for (let i = 0; i < 64; i++) {
        t.step(0.5);
        pts.push([e.pos.x, e.pos.z]);
      }
      t.light(null);
      const near = (x, z) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < 0.8);
      return { a: near(-12.5, -8.6), b: near(-16.5, -14.8), level: e.level };
    });
    assert(r.a && r.b, `an unaware guard walks its route (${r.a} ${r.b})`);
    assert(r.level === 'unaware', `and stays unaware (${r.level})`);
  });

  await scen('bodies', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(0);
      t.tp(-22, -24, 0);
      // lit: a body in the factory floor lamp pool, a guard 9 m away facing it
      const v = t.spawn('grunt', 0, -3, 0);
      t.kill(v);
      const w = t.spawn('grunt', 0.5, 6, Math.PI);
      const mate = t.spawn('grunt', 8, 8, 0);
      // (chain fix) bodiesFound is not reset between scenarios ('radio window' can leave a find behind): count finds
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
      // shadow: a body in the dark aisle, a guard 6 m away facing it
      t.reset();
      t.light(0);
      t.tp(-22, -24, 0);
      const f0 = em.bodiesFound;
      const v2 = t.spawn('grunt', -14.5, 10.5, 0);
      t.kill(v2);
      t.spawn('grunt', -14.5, 16.5, Math.PI);
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
    assert(r.dark === 0, `a body in the dark at 6 m is not found (${r.dark})`);
  });

  await scen('carry', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const st = window.__app.input.state;
      t.light(0);
      const v = t.spawn('grunt', -18, -21, 0);
      t.tp(-18, -23.5, 0);
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
      t.tp(-21.6, -20.2, Math.PI);
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

  await scen('lights', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const reg = g.world.level.lights;
      t.light(0);
      t.tp(-22, -24, 0);
      // shoot out the factory floor lamp at (0, -3): the guard on the factory floor (its room goes dark; he faces away)
      // comes to look with a flashlight. (guard-ai S2: only guards who saw the light go are told: the room they stand
      // in, or the fixture in their sight with a clear line; no more 25 m through walls)
      const e = t.spawn('grunt', 6, 3, 0);
      const lamp = reg.lights.find((l) => l.kind === 'lamp' && l.x === 0 && l.z === -3);
      const before = reg.countOn();
      g.weapons.onRay(new t.V(0, 1.5, -10), new t.V(0, 8.6, 4));
      const out = lamp.destroyed;
      // the far end of another strip (1.2 m from its centre) is a hit too
      const lamp2 = reg.lights.find((l) => l.kind === 'lamp' && l.x === 9 && l.z === -9);
      g.weapons.onRay(new t.V(9, 1, -7.8), new t.V(9, 9, -7.8));
      const end = lamp2.destroyed;
      // (guard-ai S2) the board sends him at once (a light check: investigating); the second lamp, in the corridor
      // behind him, nobody saw: nobody is sent to it
      t.step(2.8);
      const lv = e.level;
      const kind = e.incident >= 0 ? em.board.kindOf(e.incident) : null;
      const goal = [e['lightC'][0], e['lightC'][1]];
      // (3.6: the torch comes on where it is dark at his head - the light field, lamps included - not where the ambient
      // alone is. He walks from the pool of the lamp at (9, 3) (0.44-0.51 at his head: no torch) to the dark lamp at
      // (0, -3) and lights it once he leaves the light, a few metres on at the investigate pace)
      let torch = 0;
      let torchLevel = -1;
      for (let k = 0; k < 150 && !torch; k++) {
        t.step(0.1);
        torch = em.torchesOn;
        if (torch) torchLevel = g.world.lightField.levelAt(e.pos.x, e.pos.y + 1.4, e.pos.z);
      }
      // switch: the floor circuit off at its wall switch
      t.reset();
      t.light(0);
      const e2 = t.spawn('grunt', 4, -2, Math.PI);
      const sw = g.interactables.items.find((i) => i.id === 'switch-4');
      t.tp(sw.pos.x, sw.pos.z + 0.6, Math.PI);
      t.step(0.2);
      const swOffer = g.interactTarget?.label;
      const on0 = reg.countOn();
      window.__app.input.state.tap('interact');
      t.step(0.2);
      const on1 = reg.countOn();
      t.step(2.8);
      const lv2 = e2.level;
      // (guard-ai S15, A42) a switch cut is a fault: the one who saw it walks to the switch to turn it back on (calm)
      const kind2 = e2.incident >= 0 ? em.board.kindOf(e2.incident) : null;
      const brk2 = e2.breakerGroup;
      t.light(null);
      return { before, out, end, lv, kind, goal, torch, torchLevel, swOffer, on0, on1, lv2, kind2, brk2, shot: g.stealth.lightsShot };
    });
    assert(r.out, 'a shot through a bulb puts the light out');
    assert(r.end, 'a shot at the end of a lamp strip puts it out too');
    assert(r.lv === 'investigating', `the guard who saw it go comes to look (${r.lv})`);
    assert(r.kind === 'light' && Math.hypot(r.goal[0], r.goal[1] + 3) < 0.5, `a light check of the lamp in his room, not the one behind the wall (${r.kind}, to ${r.goal})`);
    assert(r.torch >= 1 && r.torchLevel < 0.35, `with a flashlight in the dark (${r.torch} on, light at his head ${r.torchLevel.toFixed(2)})`);
    assert(r.swOffer === 'Lights off', `a wall switch offers lights off (${r.swOffer})`);
    assert(r.on1 < r.on0, `switching turns the room's circuit off (${r.on0} -> ${r.on1})`);
    // (guard-ai S15) was "the room going dark is investigated": a switch off is now a fault he goes to reset, calm
    assert(r.kind2 === 'breaker' && r.brk2 >= 0 && (r.lv2 === 'unaware' || r.lv2 === 'cooldown' || r.lv2 === 'suspicious'), `the room going dark sends him to the switch to reset it, calm (${r.kind2}, circuit ${r.brk2}, ${r.lv2})`);
  });

  await scen('breaker', async () => {
    // (guard-ai S15, stealth over shooting item 8, A42) the factory floor circuit off at its wall switch with two guards
    // on the floor seeing it go (their room goes dark, as in 'light pair'): a fault, not an attack. Exactly one walks to
    // the switch at his patrol pace (never a pair), works it BREAKER.resetT s and the circuit is on again; neither goes
    // past suspicious, both end calm with no task. The same switch again inside BREAKER.repeatT: tampering, the S2 light
    // incident at the switch. Sim-time steps only; Math.random seeded as in 'lkp'.
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const reg = g.world.level.lights;
      const rnd = Math.random;
      let seed = 1515;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      try {
        t.light(0);
        t.tp(-22, -24, 0);
        const sw = g.interactables.items.find((i) => i.id === 'switch-4');
        const grp = g.world.layout.switches[4].group;
        const lamp = reg.lights.find((l) => l.kind === 'lamp' && l.x === 0 && l.z === -3);
        const a = t.spawn('grunt', 4, 1, 0);
        const b = t.spawn('grunt', 3, -6.5, Math.PI / 2);
        a.setPatrol({ points: [[a.pos.x, a.pos.z], [a.pos.x, a.pos.z + 5]], wait: 1 });
        b.setPatrol({ points: [[b.pos.x, b.pos.z], [b.pos.x + 5, b.pos.z]], wait: 1 });
        t.step(0.5);
        const onCircuit = lamp?.group === grp;
        const resets0 = em.breakerResets;
        sw.onUse(sw, 'local');
        const off = !g.stealth.switchOn(grp) && reg.lights.filter((l) => l.group === grp && !l.destroyed).every((l) => !l.on);
        t.step(0.3);
        const walkers = [a, b].map((e) => e.breakerGroup === grp);
        const kinds = [a, b].map((e) => (e.incident >= 0 ? em.board.kindOf(e.incident) : null));
        const w = walkers[0] ? a : walkers[1] ? b : null;
        const rank = { unaware: 0, cooldown: 0, suspicious: 1, investigating: 2, searching: 3, alert: 4 };
        const worst = ['unaware', 'unaware'];
        let tt = 0.3;
        let back = -1;
        let atSwitch = 99;
        let maxSpeed = 0;
        let last = w ? [w.pos.x, w.pos.z] : null;
        for (let k = 0; k < 240 && back < 0; k++) {
          t.step(0.25);
          tt += 0.25;
          [a, b].forEach((e, i) => {
            if (rank[e.level] > rank[worst[i]]) worst[i] = e.level;
          });
          if (w) {
            maxSpeed = Math.max(maxSpeed, Math.hypot(w.pos.x - last[0], w.pos.z - last[1]) / 0.25);
            last = [w.pos.x, w.pos.z];
            atSwitch = Math.min(atSwitch, Math.hypot(w.pos.x - sw.pos.x, w.pos.z - sw.pos.z));
          }
          if (g.stealth.switchOn(grp)) back = tt;
        }
        const relit = reg.lights.filter((l) => l.group === grp && !l.destroyed).every((l) => l.on);
        t.step(1);
        const after = { levels: [a.level, b.level], inc: [a.incident, b.incident], brk: [a.breakerGroup, b.breakerGroup], resets: em.breakerResets - resets0 };
        // the same switch again at once (inside repeatT): tampering, a light check at the switch
        sw.onUse(sw, 'local');
        t.step(0.3);
        const second = [a, b].map((e) => ({ lv: e.level, kind: e.incident >= 0 ? em.board.kindOf(e.incident) : null, brk: e.breakerGroup }));
        const sinceFirst = tt + 1.3;
        t.light(null);
        return { onCircuit, off, walkers, kinds, worst, back, atSwitch, maxSpeed, walkSpeed: w?.def.walkSpeed ?? 0, relit, after, second, sinceFirst, repeatT: em.breakerTable.repeatT };
      } finally {
        Math.random = rnd;
      }
    });
    const f2 = (v) => v.toFixed(2);
    assert(r.onCircuit && r.off, `the switch puts the factory floor circuit out (lamp (0, -3) on it ${r.onCircuit}, all off ${r.off})`);
    assert(r.walkers.filter(Boolean).length === 1, `exactly one of the two who saw it goes to the switch (${JSON.stringify(r.walkers)}, tasks ${JSON.stringify(r.kinds)})`);
    assert(r.kinds.filter((k) => k === 'breaker').length === 1 && !r.kinds.includes('light'), `a breaker fault, not a light check (${JSON.stringify(r.kinds)})`);
    assert(r.maxSpeed < r.walkSpeed * 1.25, `he walks over at his patrol pace (max ${f2(r.maxSpeed)} m/s, walk speed ${f2(r.walkSpeed)})`);
    assert(r.back > 0 && r.atSwitch < 1.6 && r.relit, `he reaches the switch and the circuit is on again (at ${f2(r.back)} s, ${f2(r.atSwitch)} m from it, all lit ${r.relit})`);
    assert(r.worst.every((l) => l === 'unaware' || l === 'cooldown' || l === 'suspicious'), `neither goes past suspicious (${JSON.stringify(r.worst)})`);
    assert(r.after.levels.every((l) => l === 'unaware' || l === 'cooldown') && r.after.inc.every((i) => i === -1) && r.after.brk.every((x) => x === -1), `both calm with no task after (${JSON.stringify(r.after)})`);
    assert(r.after.resets === 1, `one reset (${r.after.resets})`);
    assert(r.sinceFirst < r.repeatT, `the second cut is inside repeatT (${f2(r.sinceFirst)} < ${r.repeatT} s)`);
    assert(r.second.some((s) => s.kind === 'light' && s.lv === 'investigating') && r.second.every((s) => s.brk === -1), `a second cut inside repeatT is tampering: a light incident at the switch (${JSON.stringify(r.second)})`);
  });

  await scen('light pair', async () => {
    // (guard-ai S2, M1 goal 4) three guards near the factory floor lamp at (0, -3); two can see it go (they stand on the
    // floor: their room goes dark), the third is in the racking hall behind the x -4 wall, facing away, inside
    // `INCIDENT.lightPairR` of it. Exactly the two go (a second witness within lightPairR: a pair), check the light
    // and the ring round it, stand down and walk their routes again calm (unaware, not cooldown: "return back to
    // normal"); the third never stirs.
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const I = em.incidentTable;
      const reg = g.world.level.lights;
      t.light(0);
      t.tp(-22, -24, 0);
      const a = t.spawn('grunt', 4, 1, 0);
      const b = t.spawn('grunt', 3, -6.5, Math.PI / 2);
      const c = t.spawn('grunt', -14.5, -1, -Math.PI / 2);
      const ra = [[a.pos.x, a.pos.z], [a.pos.x, a.pos.z + 5]];
      const rb = [[b.pos.x, b.pos.z], [b.pos.x + 5, b.pos.z]];
      a.setPatrol({ points: ra, wait: 1 });
      b.setPatrol({ points: rb, wait: 1 });
      t.step(0.5);
      const lamp = reg.lights.find((l) => l.kind === 'lamp' && l.x === 0 && l.z === -3);
      const cDist = Math.hypot(c.pos.x - lamp.x, c.pos.z - lamp.z);
      const cHome = [c.pos.x, c.pos.z];
      g.weapons.onRay(new t.V(0, 1.5, -10), new t.V(0, 8.6, 4));
      const out = lamp.destroyed;
      t.step(0.3);
      const sent = [a, b, c].map((e) => e.level === 'investigating' && e.incident >= 0);
      const rank = { unaware: 0, cooldown: 0, suspicious: 1, investigating: 2, searching: 3, alert: 4 };
      const worst = ['unaware', 'unaware', 'unaware'];
      const back = [-1, -1];
      const onRoute = [false, false];
      const near = (e, pts) => pts.some((p) => Math.hypot(e.pos.x - p[0], e.pos.z - p[1]) < 1.2);
      let tt = 0.3;
      const reachedLamp = [false, false];
      let cMoved = 0;
      for (let k = 0; k < 240 && !(onRoute[0] && onRoute[1]); k++) {
        t.step(0.5);
        tt += 0.5;
        [a, b, c].forEach((e, i) => {
          if (rank[e.level] > rank[worst[i]]) worst[i] = e.level;
        });
        [a, b].forEach((e, i) => {
          if (Math.hypot(e.pos.x - lamp.x, e.pos.z - lamp.z) < 2.5) reachedLamp[i] = true;
          if (back[i] < 0 && worst[i] === 'investigating' && e.level !== 'investigating') back[i] = tt;
          if (back[i] >= 0 && near(e, i === 0 ? ra : rb)) onRoute[i] = true;
        });
        cMoved = Math.max(cMoved, Math.hypot(c.pos.x - cHome[0], c.pos.z - cHome[1]));
      }
      t.light(null);
      return { out, cDist, pairR: I.lightPairR, sent, worst, back, onRoute, reachedLamp, cMoved, levels: [a.level, b.level, c.level], inc: [a.incident, b.incident], esc: em.board.escalations };
    });
    const f2 = (v) => v.toFixed(2);
    assert(r.out, 'the lamp is shot out');
    assert(r.cDist < r.pairR, `the third guard is inside lightPairR of the lamp (${f2(r.cDist)} < ${r.pairR} m)`);
    assert(r.sent[0] && r.sent[1] && !r.sent[2], `exactly the two who saw it go (${JSON.stringify(r.sent)})`);
    assert(r.worst[2] === 'unaware' && r.cMoved < 1, `the third never stirs (${r.worst[2]}, moved ${f2(r.cMoved)} m)`);
    assert(r.reachedLamp[0] && r.reachedLamp[1], `both walk to the light (${JSON.stringify(r.reachedLamp)})`);
    assert(r.back[0] > 0 && r.back[1] > 0, `both stand down after the check (at ${r.back.map(f2)} s)`);
    assert(r.levels[0] === 'unaware' && r.levels[1] === 'unaware' && r.inc[0] === -1 && r.inc[1] === -1, `calm again, not cautious (${JSON.stringify(r.levels)}, incidents ${r.inc})`);
    assert(r.onRoute[0] && r.onRoute[1], `and back on their routes (${JSON.stringify(r.onRoute)})`);
    assert(r.esc === 0, `nobody went missing (${r.esc} escalations)`);
  });

  await scen('alarm', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const st = window.__app.input.state;
      t.light(0);
      t.tp(-22, 16, 0);
      const e = t.spawn('grunt', 2, 6, 0);
      e.alert();
      const n0 = em.alive;
      let raised = false;
      let tRaise = -1;
      for (let i = 0; i < 100 && !raised; i++) {
        t.step(0.1);
        raised = em.alarmRaised;
        if (raised) tRaise = (i + 1) * 0.1;
      }
      // (guard-ai S6) the panel 6 m off is worked before his command call (contact + report, ~6.5 s) gets through: the
      // panel wins by ~2.5 s at reaction 1. (Stack merge) so the expected order is panel first, with his command call
      // possibly already started (`cmdStarted`); the panel's raise cancels it (`command.raised()`), so it never
      // completes and `alarmBy` stays 'panel'
      const by = em.alarmBy;
      const cmdStarted = em.command.started;
      t.step(0.5);
      const n1 = em.alive;
      // disable a panel first (hold), then nobody can raise it
      t.reset();
      t.light(0);
      const panel = g.interactables.items.find((i) => i.id === 'alarm-1');
      t.tp(panel.pos.x + 0.7, panel.pos.z, -Math.PI / 2);
      t.step(0.2);
      const offer = g.interactTarget?.label;
      st.set('t', 'interact', true);
      t.step(1.5);
      st.set('t', 'interact', false);
      const dis = em.alarms[1].disabled;
      em.alarms[0].disabled = true;
      t.tp(-22, 16, 0);
      const e2 = t.spawn('grunt', 2, 6, 0);
      e2.alert();
      // (guard-ai S6) with both panels off he never runs to one; his command call by radio may still raise it
      let ran = false;
      for (let i = 0; i < 80; i++) {
        t.step(0.1);
        if (e2.runningAlarm) ran = true;
      }
      t.light(null);
      return { raised, tRaise, by, cmdStarted, n0, n1, offer, dis, ran, raised2: em.alarmRaised, by2: em.alarmBy };
    });
    // the panel first (the radio would raise it ~6.5 s after the sighting; a command call already started is fine)
    assert(r.raised && r.by === 'panel', `an alerted guard runs to the alarm panel and raises it before his command call gets through (by '${r.by}' at ${r.tRaise} s, command calls started ${r.cmdStarted})`);
    assert(r.n1 > r.n0, `reinforcements come in (${r.n0} -> ${r.n1})`);
    assert(/Disable alarm/.test(r.offer ?? ''), `the panel can be disabled (${r.offer})`);
    assert(r.dis && !r.ran && r.by2 !== 'panel', `a disabled panel never raises the alarm (ran ${r.ran}, raised ${r.raised2} by '${r.by2}')`);
  });

  await scen('alarm call', async () => {
    // (guard-ai S6, design 7, M4) the alarm by radio, the panels off (only the radio path): (A) the spotter taken out
    // during his contact call: no command call, no alarm, nobody comes; (B) his contact gets through: he holds the
    // command call (RADIO.report x reaction) and the alarm goes off by radio, reinforcements come; (C) the commander
    // taken out during that call: the squadmate still fighting takes it ALARM_CALL.retry s later and it gets through
    const r = await G(() => {
      const t = window.__t;
      const em = window.__app.current.enemyMgr;
      const R = em.radioTable;
      const retry = em.alarmCallTable.retry;
      const off = () => {
        for (const p of em.alarms) p.disabled = true;
      };
      const spot = () => {
        const a = t.spawn('grunt', 0, 5, Math.PI);
        t.tp(-0.5, 0, 0);
        let k = 0;
        while (!a.alerted && k++ < 300) t.step(1 / 60);
        return a;
      };
      const until = (f, max) => {
        let s = 0;
        while (!f() && s < max) {
          t.step(0.05);
          s += 0.05;
        }
        return s;
      };
      const out = {};
      // (A)
      t.light(1);
      off();
      const s0 = em.command.started;
      const a = spot();
      out.aLeft = em.radioLeft(a);
      t.kill(a, true);
      const n0 = em.alive;
      t.step(12);
      Object.assign(out, { aStarted: em.command.started - s0, aRaised: em.alarmRaised, aNew: em.alive - n0 });
      // (B)
      t.reset();
      t.light(1);
      off();
      const b = spot();
      const pending = em.radioLeft(b);
      const tCmd = until(() => em.command.caller === b.num, pending + 2);
      const report = em.radioLeft(b);
      const nb = em.alive;
      const tAl = tCmd + until(() => em.alarmRaised, report + 2);
      t.step(0.5);
      Object.assign(out, { pending, tCmd, report, tAl, bBy: em.alarmBy, bNew: em.alive - nb });
      // (C)
      t.reset();
      t.light(1);
      off();
      const c = spot();
      const mate = t.spawn('grunt', 10, 9, Math.PI);
      until(() => em.command.caller === c.num, em.radioLeft(c) + 2);
      out.cCaller = em.command.caller === c.num;
      t.kill(c, true);
      const tB = until(() => em.command.caller === mate.num, retry + 3);
      const tAl2 = tB + until(() => em.alarmRaised, R.report * 2 + 2);
      t.light(null);
      Object.assign(out, { tB, mateUp: mate.alive && mate.alerted, tAl2, cBy: em.alarmBy, retry, R: R.report });
      return out;
    });
    const f = (v) => v.toFixed(2);
    assert(r.aLeft > 0.3 && r.aStarted === 0 && !r.aRaised && r.aNew === 0, `the spotter taken out during his call (${f(r.aLeft)} s left): no command call, no alarm, nobody comes (${r.aStarted}, ${r.aRaised}, +${r.aNew})`);
    assert(Math.abs(r.tCmd - r.pending) < 0.2, `his contact gets through, then he calls command (${f(r.tCmd)} s, contact ${f(r.pending)} s)`);
    assert(r.report > r.R * 0.5 && Math.abs(r.tAl - r.tCmd - r.report) < 0.2 && r.bBy === 'radio', `the command call (${f(r.report)} s) raises the alarm by radio (at ${f(r.tAl)} s, '${r.bBy}')`);
    assert(r.bNew > 0, `reinforcements come in (+${r.bNew})`);
    assert(r.cCaller && r.mateUp && Math.abs(r.tB - r.retry) < 0.3, `the commander taken out: the squadmate in the fight takes the call ${f(r.tB)} s later (retry ${r.retry} s)`);
    assert(r.cBy === 'radio' && r.tAl2 > r.tB && r.tAl2 - r.tB < r.R * 1.6 + 0.3, `...and it gets through: the alarm ${f(r.tAl2 - r.tB)} s after he took it ('${r.cBy}')`);
  });

  await scen('revive', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      t.light(0);
      t.tp(-22, -24, 0);
      const v = t.spawn('grunt', 0, -3, 0);
      t.kill(v, true);
      const w = t.spawn('grunt', 0.5, 6, Math.PI);
      const n0 = em.alive;
      let woke = false;
      for (let i = 0; i < 200 && !woke; i++) {
        t.step(0.1);
        woke = em.alive > n0;
      }
      const lethal = em.bodies.length;
      // (guard-ai S4, M3, A4) the same guard is back (his key); he and the waker search round the spot, then stay
      // cautious, then calm: sim-stepped, the times read from the caution table
      const C = em.cautionTable;
      const nv = em.enemies.find((e) => e.alive && e !== w);
      const sameKey = !!nv && nv.key === v.key;
      const c0 = nv ? [em.cautionOf(w), em.cautionOf(nv)] : [];
      t.step(C.koSearch - 2);
      const s1 = nv ? [em.awareness.isSearching(w.key), em.awareness.isSearching(nv.key), w.level, nv.level] : [];
      t.step(C.koCautious);
      const s2 = nv ? [em.cautionOf(w), em.cautionOf(nv), w.level, nv.level] : [];
      t.step(4);
      const s3 = nv ? [em.cautionOf(w), em.cautionOf(nv), w.level, nv.level] : [];
      t.light(null);
      return { woke, lethal, wl: w.level, sameKey, c0, s1, s2, s3, holds: em.awareness.holdCount() };
    });
    assert(r.woke, 'a knocked-out guard is woken when a squadmate finds him');
    assert(r.lethal === 0, `and the body is gone (${r.lethal} left)`);
    assert(r.sameKey, 'the woken guard keeps his guard key (the same guard)');
    assert(r.c0[0] === 1 && r.c0[1] === 1 && r.holds === 0, `both turn cautious, timed (no hold) (${r.c0}, holds ${r.holds})`);
    assert(r.s1[0] && r.s1[1] && r.s1[2] === 'searching' && r.s1[3] === 'searching', `both search round the spot (${r.s1})`);
    assert(r.s2[0] === 1 && r.s2[1] === 1 && r.s2[2] === 'cooldown' && r.s2[3] === 'cooldown', `then stay cautious, on edge (${r.s2})`);
    assert(r.s3[0] === 0 && r.s3[1] === 0 && r.s3[2] === 'unaware' && r.s3[3] === 'unaware', `then calm, back to normal (${r.s3})`);
  });

  await scen('witness', async () => {
    // (guard-ai S4, design 4, M1) a kill in view of one calm guard: he turns cautious and radios it; take him out
    // before it gets through and the section stays normal. Let it through: the section is cautious until everyone
    // aware of it is out. A knockout seen: he goes to wake him (timed caution, no hold).
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const R = em.radioTable;
      const three = () => {
        t.reset();
        t.light(0);
        t.tp(-22, -24, 0);
        // the victim in the factory floor lamp pool, the witness 9 m off facing it, a third out of voice range facing away
        const v = t.spawn('grunt', 0, -3, 0);
        const w = t.spawn('grunt', 0.5, 6, Math.PI);
        const f = t.spawn('grunt', 8, 8, 0);
        t.step(0.3);
        return { v, w, f };
      };
      // A: the witness taken out before his report gets through
      let s = three();
      const k0 = em.killsWitnessed;
      t.kill(s.v);
      const a = { seen: em.killsWitnessed - k0, wc: em.cautionOf(s.w), left: em.radioLeft(s.w), fc0: em.cautionOf(s.f) };
      t.step(0.5);
      t.kill(s.w);
      t.step(a.left + R.staggerMax + 1);
      Object.assign(a, { fc: em.cautionOf(s.f), fl: s.f.level, holds: em.awareness.holdCount() });
      // B: the report gets through
      s = three();
      t.kill(s.v);
      const left = em.radioLeft(s.w);
      t.step(left + R.staggerMax + 1);
      const b = { fc: em.cautionOf(s.f), fl: s.f.level, wc: em.cautionOf(s.w) };
      t.kill(s.w);
      b.holdsMid = em.awareness.holdCount();
      b.fcMid = em.cautionOf(s.f);
      t.kill(s.f);
      b.holdsEnd = em.awareness.holdCount();
      // C: a knockout seen
      s = three();
      t.kill(s.v, true);
      let woke = false;
      for (let i = 0; i < 200 && !woke; i++) {
        t.step(0.1);
        woke = em.enemies.some((e) => e.alive && e !== s.w && e !== s.f);
      }
      const c = { woke, wc: em.cautionOf(s.w), fc: em.cautionOf(s.f), holds: em.awareness.holdCount() };
      t.light(null);
      return { a, b, c };
    });
    const { a, b, c } = r;
    assert(a.seen === 1 && a.wc === 2 && a.left > 0, `the witness sees the kill, turns cautious and radios it (seen ${a.seen}, caution ${a.wc}, call ${a.left.toFixed(2)} s)`);
    assert(a.fc0 === 0, `the third guard does not know yet (${a.fc0})`);
    assert(a.fc === 0 && a.fl === 'unaware' && a.holds === 0, `witness taken out before his report: the section stays normal (${a.fc}, ${a.fl}, holds ${a.holds})`);
    assert(b.fc === 2 && b.fl === 'searching' && b.wc === 2, `the report gets through: the third guard is cautious too and (S19) helps search the body (${b.fc}, ${b.fl})`);
    assert(b.holdsMid === 1 && b.fcMid === 2, `the witness out, the third still knows: still cautious (holds ${b.holdsMid}, ${b.fcMid})`);
    assert(b.holdsEnd === 0, `everyone aware is out: the caution is gone (holds ${b.holdsEnd})`);
    assert(c.woke && c.wc === 1 && c.fc === 0 && c.holds === 0, `a knockout seen: the witness wakes him, timed caution, no hold (${c.woke}, ${c.wc}, ${c.fc}, holds ${c.holds})`);
  });

  await scen('surfaces', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      t.light(0);
      const walk = (x, y, z, yaw) => {
        g.player.controller.teleport(new t.V(x, y, z), yaw);
        g.player.cam.yaw = yaw;
        t.step(0.3);
        st.setMove('t', 0, 1); // full stick: max gear 4 (2.3 m/s since step 22); since step 17 a 0.6 stick snaps to the silent gear-2 walk
        let n = 0;
        let surf = '';
        for (let i = 0; i < 12; i++) {
          t.step(0.1);
          n = Math.max(n, g.noise);
          surf = g.surface;
        }
        st.setMove('t', 0, 0);
        t.step(0.4);
        return { n, surf };
      };
      const concrete = walk(8, 0, -5, Math.PI / 2);
      const metal = walk(13.5, 2.6, 14.6, Math.PI / 2);
      const carpet = walk(-2.5, 0, 13.4, 0);
      t.light(null);
      return { concrete, metal, carpet };
    });
    assert(r.concrete.surf === 'concrete' && r.metal.surf === 'metal' && r.carpet.surf === 'carpet', `surfaces under foot (${r.concrete.surf}, ${r.metal.surf}, ${r.carpet.surf})`);
    assert(r.metal.n > r.concrete.n && r.concrete.n > r.carpet.n, `walking is loudest on metal, quietest on carpet (${r.metal.n.toFixed(1)} / ${r.concrete.n.toFixed(1)} / ${r.carpet.n.toFixed(1)} m)`);
  });

  await scen('shots', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      t.light(0);
      t.tp(0, -5, Math.PI);
      const e = t.spawn('grunt', 0, 5, 0);
      t.step(0.3);
      const stats = g.weapons.current.stats;
      const n0 = stats.noise;
      stats.noise = 0.45;
      g.weapons.lastShotNoise = 0.45; // (sd-rounds) onShot reads the fired round's noise, not stats
      g.weapons.events.onShot(g.weapons.current.def);
      t.step(0.2);
      // (guard-ai S1) 10 m of a 12.6 m suppressed report is outside half the reach: he only turns to look
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
      t.tp(0, -5, Math.PI);
      const e2 = t.spawn('grunt', 0, -5 + quarter * 0.7, 0);
      t.step(0.3);
      loudShot();
      t.step(0.2);
      const loud = e2.level;
      // the same report 10 m off (inside half its reach, outside a quarter): he is sent to look, not to a fight
      t.reset();
      t.light(0);
      t.tp(0, -5, Math.PI);
      const e2b = t.spawn('grunt', 0, 5, 0);
      t.step(0.3);
      loudShot();
      t.step(0.2);
      const loudFar = e2b.level;
      t.step(2.6);
      const loudFar2 = e2b.level;
      t.reset();
      t.light(0);
      t.tp(-22, -24, 0);
      const e3 = t.spawn('grunt', 0, 5, 0);
      t.step(0.3);
      g.weapons.onRay(new t.V(-5, 1, 5), new t.V(1.5, 1, 6));
      t.step(0.2);
      const impact = e3.level;
      const impactTurn = e3.turning;
      t.light(null);
      return { supp, suppTurn, supp2, loud, loudFar, loudFar2, impact, impactTurn, quarter };
    });
    assert(r.supp !== 'alert' && r.supp !== 'investigating' && (r.supp === 'suspicious' || r.suppTurn), `a suppressed shot 10 m off only makes a guard turn to look (${r.supp}, turning ${r.suppTurn})`);
    assert(r.suppTurn && r.supp2 !== 'investigating' && r.supp2 !== 'alert', `...he turned, and 2.6 s later he still has not walked over (${r.supp2})`);
    assert(r.loud === 'alert', `a loud shot inside a quarter of its reach puts him in combat (${r.loud}, quarter ${r.quarter.toFixed(2)} m)`);
    assert(r.loudFar === 'suspicious' && r.loudFar2 === 'investigating', `a loud shot 10 m off sends him to look, not to a fight (${r.loudFar} -> ${r.loudFar2})`);
    assert(r.impact === 'suspicious' || r.impact === 'investigating' || r.impactTurn, `a round landing close by is heard (${r.impact}, turning ${r.impactTurn})`);
  });

  await scen('doors', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const doors = g.world.doors;
      const d = doors.nearest(-0.95, 12, 0.5);
      // a closed door blocks sight: a lit walker on the far side is not seen
      t.light(1);
      const e = t.spawn('grunt', -0.95, 15, Math.PI);
      t.tp(-0.95, 9.8, 0);
      let blocked = 0;
      for (let i = 0; i < 20; i++) {
        st.setMove('t', i % 10 < 5 ? 0.5 : -0.5, 0);
        t.step(0.1);
        blocked = Math.max(blocked, e.rate);
      }
      st.setMove('t', 0, 0);
      // opened quietly by hand: a creak (2 m), then he can see through
      t.tp(-0.95, 11.2, 0);
      t.step(0.2);
      // (G5) the CT context menu top right: header INTERACT over the door set
      const offer = [...document.querySelectorAll('.hud-ctx.show .ctx-head, .hud-ctx.show .ctx-row')].filter((x) => x.style.display !== 'none').map((x) => x.textContent).join(' / ');
      g.noise = 0;
      // (A3, G19; G5) a scripted tap at a closed door opens the door set latched; a second tap picks Open (row 1)
      st.tap('interact');
      t.step(0.1);
      const menuOpen = g.doorMenu.open;
      st.tap('interact');
      t.step(0.1);
      // (G6, AUDIT-WALLS row 4, 052349) Open is a short move: the step to the latch side, the leaf 0.8 s after the pick
      // swinging 0.75 s: the creak is heard over the move, the door open by 1.55 s
      let quiet = g.noise;
      for (let i = 0; i < 19; i++) {
        t.step(0.1);
        quiet = Math.max(quiet, g.noise);
      }
      const open = d.open;
      t.tp(-0.95, 9.8, 0);
      let seen = 0;
      for (let i = 0; i < 10; i++) {
        t.step(0.1);
        seen = Math.max(seen, e.rate);
      }
      // (A3, G97) running into a door does nothing special (the door is shut again first)
      doors.close(d, () => false);
      t.step(1.2);
      t.reset();
      t.light(0);
      t.tp(-2.6, 8.2, Math.atan2(1.65, 3.8));
      t.step(0.3);
      st.setMove('t', 0, 1);
      st.tap('dash');
      for (let i = 0; i < 40 && d.target === 0; i++) t.step(0.05);
      const sprintOpened = d.target === 1;
      st.setMove('t', 0, 0);
      // bash from the door menu: loud, and a guard right behind the door is knocked out
      doors.close(d, () => false);
      t.step(1.2);
      t.reset();
      t.light(0);
      t.tp(-0.95, 11.2, 0);
      const behind = t.spawn('grunt', -0.95, 13.1, 0); // 1.1 m behind the leaf: past the 1.0 m a guard pushes a door open from, inside the 1.3 m bash reach
      t.step(0.3);
      g.noise = 0;
      st.tap('interact');
      t.step(0.1);
      const bashOpts = [...g.doorMenu.opts];
      const bi = bashOpts.indexOf('bash');
      for (let i = 0; i < bi; i++) {
        st.tap('uiDown');
        t.step(0.2);
      }
      st.tap('interact');
      t.step(0.1);
      const bash = g.noise;
      t.step(0.3);
      const bashed = d.target === 1;
      const dbg = { bashOpts, bi, menu: g.doorMenu.open, target: d.target, ko: behind.ko, alive: behind.alive };
      const koBehind = !behind.alive && behind.ko;
      // a guard walking his beat through a closed door opens it
      t.reset();
      t.light(0);
      t.tp(-22, -24, 0);
      const w = t.spawn('grunt', -0.95, 14.5, Math.PI);
      w.setPatrol({ points: [[-0.95, 14.5], [-0.95, 8.5]], wait: 1 });
      let through = false;
      for (let i = 0; i < 80 && !through; i++) {
        t.step(0.25);
        through = w.pos.z < 11;
      }
      t.light(null);
      return { dbg, blocked, offer, menuOpen, quiet, open, seen, bash, bashed, sprintOpened, koBehind, through, dOpen: d.target };
    });
    assert(r.blocked === 0, `a closed door blocks sight (${r.blocked.toFixed(2)})`);
    assert(r.offer.startsWith('Interact / Open door / ') && r.offer.includes('Bash door') && r.menuOpen, `at a door: the context menu lists the door set (${r.offer})`);
    assert(r.quiet > 0 && r.quiet <= 2.5, `opening by hand is a quiet creak (${r.quiet.toFixed(1)} m)`);
    assert(r.open === 1 && r.seen > 0, `once open he sees through (seen ${r.seen.toFixed(2)}, open ${r.open}, quiet ${r.quiet})`);
    assert(!r.sprintOpened, 'running into a door does nothing special (G97)');
    assert(r.bashed && r.bash >= 8, `the menu's Bash opens the door, loud (${r.bash.toFixed(1)} m, ${JSON.stringify(r.dbg)})`);
    assert(r.koBehind, 'the bash knocks out a guard right behind the door');
    assert(r.through && r.dOpen === 1, 'a guard walking through opens the door');
  });

  // (ct-toolkit 3.2) the door menu's OPTIC CABLE: kneel, the view under the door on the far side at floor height, the
  // look within its limits, night vision as usual, crouch leaves; the tip is never perceived, the kneeling body is; a
  // sealed door refuses
  await scen('optic cable', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const d = g.world.doors.nearest(-0.95, 12, 0.5);
      const pick = () => {
        st.tap('interact');
        t.step(0.1);
        const opts = [...g.doorMenu.opts];
        const oi = opts.indexOf('optic');
        for (let i = 0; i < oi; i++) {
          st.tap('uiDown');
          t.step(0.2);
        }
        st.tap('interact');
        t.step(0.1);
        return opts;
      };
      t.light(1);
      // a guard 3 m behind the door faces it: he never sees the tip
      const far = t.spawn('grunt', -0.95, 15, Math.PI);
      t.tp(-0.95, 11.2, 0);
      t.step(0.3);
      g.noise = 0;
      const opts = pick();
      const feeding = g.optic.active && !g.optic.viewing;
      t.step(1.3);
      const o = g.optic.core;
      const viewing = g.optic.viewing;
      const cam = g.player.cam.camera.position;
      const camAt = { x: cam.x, y: cam.y - d.anchor.hinge.y, z: cam.z };
      const kneel = { crouched: g.player.controller.crouched, kneeling: g.player.controller.kneeling, still: g.player.controller.speed };
      const feed = document.querySelector('.gadget-feed');
      const feedShown = !!feed && !feed.hidden;
      // the look turns the tip within +-75 deg yaw, -10 .. +60 deg pitch
      st.addLook(2, 2);
      t.step(0.1);
      const yawOff = Math.abs(Math.atan2(Math.sin(o.yaw - o.baseYaw), Math.cos(o.yaw - o.baseYaw)));
      const pitchA = o.pitch;
      st.addLook(-1, -3);
      t.step(0.1);
      const pitchB = o.pitch;
      // night vision toggles as usual in the view
      const nv0 = g.vision.mode;
      st.tap('vision');
      t.step(0.2);
      const nv1 = g.vision.mode;
      st.tap('vision');
      t.step(0.2);
      let farRate = 0;
      for (let i = 0; i < 10; i++) {
        t.step(0.1);
        farRate = Math.max(farRate, far.rate);
      }
      const quiet = g.noise;
      const doorShut = d.target === 0;
      // the kneeling body is perceived as normal: a guard on the near side in the light sees it
      const near = t.spawn('grunt', -0.95, 7.5, 0);
      let nearRate = 0;
      for (let i = 0; i < 10; i++) {
        t.step(0.1);
        nearRate = Math.max(nearRate, near.rate);
      }
      g.optic.reset();
      t.reset();
      t.light(1);
      t.tp(-0.95, 11.2, 0);
      // crouch leaves: pulled out over 0.6 s, the camera back on the body
      g.optic.pick(d.index);
      t.step(1.4);
      const viewing2 = g.optic.viewing;
      st.tap('crouch');
      t.step(0.1);
      const retract = g.optic.core.phase;
      t.step(0.7);
      const done = !g.optic.active;
      const p = g.player.position;
      const camBack = Math.sqrt((cam.x - p.x) ** 2 + (cam.z - p.z) ** 2);
      const camBackY = cam.y - p.y;
      // a sealed door refuses ("Sealed"), nothing starts
      d.anchor.seal = true;
      t.step(0.3);
      pick();
      const sealed = g.optic.refused;
      const sealedActive = g.optic.active;
      d.anchor.seal = false;
      t.light(null);
      return { opts, feeding, viewing, camAt, door: { x: d.cx, z: d.cz }, kneel, feedShown, yawOff, pitchA, pitchB, nv0, nv1, farRate, quiet, doorShut, nearRate, viewing2, retract, done, camBack, camBackY, sealed, sealedActive };
    });
    const deg = 180 / Math.PI;
    assert(r.opts.includes('optic') && r.feeding, `the door menu lists Optic cable and the pick starts the feed (${r.opts})`);
    assert(r.viewing && r.feedShown, `after the 1.2 s feed the view is at the tip with the feed overlay (${r.viewing}, ${r.feedShown})`);
    assert(Math.abs(r.camAt.y - 0.05) < 0.02 && r.camAt.z > r.door.z + 0.25, `the camera sits on the far side at floor height (${JSON.stringify(r.camAt)}, door z ${r.door.z.toFixed(2)})`);
    assert(r.kneel.crouched && r.kneel.kneeling, `the body kneels at the door (${JSON.stringify(r.kneel)})`);
    assert(Math.abs(r.yawOff * deg - 75) < 0.5 && Math.abs(r.pitchA * deg - 60) < 0.5 && Math.abs(r.pitchB * deg + 10) < 0.5, `the look turns the tip within +-75 / -10..+60 deg (yaw ${(r.yawOff * deg).toFixed(1)}, pitch ${(r.pitchA * deg).toFixed(1)} / ${(r.pitchB * deg).toFixed(1)})`);
    assert(r.nv1 !== r.nv0, `night vision toggles in the view (${r.nv0} -> ${r.nv1})`);
    assert(r.farRate === 0 && r.quiet === 0 && r.doorShut, `the tip is never perceived, the cable is silent, the door stays shut (rate ${r.farRate}, noise ${r.quiet})`);
    assert(r.nearRate > 0, `the kneeling body is perceived as normal (${r.nearRate.toFixed(2)})`);
    assert(r.viewing2 && r.retract === 'retract' && r.done, `crouch leaves: pulled out, then done (${r.retract}, ${r.done})`);
    assert(r.camBack < 4 && r.camBackY > 0.3, `the camera is back on the body (${r.camBack.toFixed(2)} m, up ${r.camBackY.toFixed(2)})`);
    assert(r.sealed === 'Sealed' && !r.sealedActive, `a sealed door refuses ("${r.sealed}")`);
  });

  // (locomotion step 12) a peek past a wall edge exposes only the head (guard perception from the real pose, never the
  // camera); (A3: the lean-out is gone)
  await scen('wall peek exposes the head', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const V = t.V;
      const P = window.__pad;
      P.connect();
      t.light(1);
      const segs = g.world.level.coverSegments;
      // (flake-fix) why each tried segment gave no verified spot (printed when none does)
      const diag = [];
      const L = g.wallCore.links;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s.low || s.len < 2 || L.kB[i] !== 0 || Math.abs(s.y) > 0.3) continue;
        if (g.wallCore.active) g.wallCore.leave('test');
        t.step(0.3);
        g.player.controller.clearCrouchToggle();
        const yaw = Math.atan2(-s.nx, -s.nz);
        g.player.controller.teleport(new V(s.ax + s.tx * (s.len - 0.7) + s.nx * 0.75, s.y + 0.05, s.az + s.tz * (s.len - 0.7) + s.nz * 0.75), yaw);
        g.player.cam.yaw = yaw;
        g.player.cam.pitch = 0;
        t.step(0.3);
        window.__app.input.state.tap('cover');
        t.step(0.6);
        if (g.wallCore.phase !== 'on' || g.wallCore.seg !== i) continue;
        P.axis(0, 1);
        t.step(3.0);
        P.axis(0, 0);
        t.step(0.3);
        if (g.wallCore.edge !== 1) continue;
        // a spot round the corner (past the end, behind the face plane) that sees the peeking head and not the chest.
        // A guard's eye is its feet + a constant (enemy.ts `eye`): the offset is read from a grunt spawned on the floor
        // here and cleared at once (the 1.55 m guess was 4 cm low and picked spots that showed a real guard the chest,
        // #65 / #71)
        const pt = new V();
        const eye = new V();
        let eyeUp = 1.55;
        {
          const probe = g.enemyMgr.spawn('grunt', new V(s.bx - s.nx * 2, s.y, s.bz - s.nz * 2), false, 0);
          if (probe) eyeUp = probe['eye'](new V()).y - probe.pos.y;
          g.enemyMgr.clear();
        }
        const place = (x, y, z) => eye.set(x, y + eyeUp, z);
        // clear static lines from `eye` to the chest (aim point) and the head, as the guard's own test (perception
        // losClear: a hit within the slack of the point, 0.3 m chest, 0.2 m head, is clear). `m` only ranks spots: the
        // chest looked at `m` further out past the edge and the head `m` further in
        const see = (m = 0) => {
          const clear = (to, slack) => { const h = g.ballistics.ray(eye, to, 1); return !h.hit || h.distance > Math.hypot(to.x - eye.x, to.y - eye.y, to.z - eye.z) - slack; };
          const chest = clear(g.target.aimPoint(pt).addInPlaceFromFloats(s.tx * m, 0, s.tz * m), 0.3);
          return { chest, head: clear(g.target.headPoint(pt).addInPlaceFromFloats(-s.tx * m, 0, -s.tz * m), 0.2) };
        };
        // (flake-fix, fix round 2) candidate spots: floor points on a 5 cm grid where a guard can stand (a walkable nav
        // cell on this storey; the cell's height is where a guard's feet settle, enemy.ts `move`). The guard is put on
        // the exact point below, not on the cell's centre where the spawn snaps it: the cells are 0.5 m, the wedge that
        // sees the head and not the chest is a few cm wide
        const nav = g.enemyMgr.nav;
        const spots = [];
        for (let ia = 0; ia <= 120; ia++) {
          for (let ib = 0; ib <= 70; ib++) {
            const a = 1 + ia * 0.05;
            const b = 0.5 + ib * 0.05;
            const x = s.bx + s.tx * a - s.nx * b;
            const z = s.bz + s.tz * a - s.nz * b;
            const c = nav.cellOf(x, z, s.y);
            if (!nav.isWalkable(c) || Math.abs(nav.height[c] - s.y) > 0.3) continue;
            spots.push([x, nav.height[c], z]);
          }
        }
        const hidden = spots.filter(([x, y, z]) => { place(x, y, z); const v = see(); return !v.chest && !v.head; });
        P.axis(0, 1);
        // (A3, G36) the peek is at once; the rig's hand switch and lean ease the head out past the edge over about 0.6 s
        t.step(0.9);
        // (flake-fix) the held peek never stands quite still: the pose sways a few mm (the chest point x 3.443 - 3.457 at
        // segment 149, over about 4 s), and a guard samples it at its think ticks (a random phase, 0.22 - 0.30 s apart).
        // The one spot a single look found ([0.25, -11.75]) cleared the chest by about 5 mm, so the guard saw the chest
        // whenever the sway crossed it: "sees the peeking head only" (los true, head false) under load, where the run's
        // history moves the phase. So the target points are read after every fixed step (each is the pose the guards
        // perceive at that step: target.sync runs before the enemies' update), and a spot counts only if it sees the head
        // and not the chest at every step of 2 s of the held peek. Each is ranked by the largest margin (`see(m)`) it held
        // at every step, so the guard goes to the middle of the wedge first
        const MARGINS = [0.03, 0.02, 0.01, 0.005, 0];
        let only = hidden.map((p) => ({ p, k: 0 }));
        let peekOn = true;
        for (let n = 0; n < 120 && only.length; n++) {
          t.step(1 / 60);
          peekOn &&= g.wallCore.peekOn;
          only = only.filter((o) => {
            place(o.p[0], o.p[1], o.p[2]);
            const v = see();
            if (v.chest || !v.head) return false;
            while (o.k < MARGINS.length - 1) {
              const w = see(MARGINS[o.k]);
              if (!w.chest && w.head) break;
              o.k++;
            }
            return true;
          });
        }
        if (!peekOn || !only.length) {
          diag.push({ i, hidden: hidden.length, only: only.length, peekOn });
          P.axis(0, 0);
          t.reset();
          continue;
        }
        only.sort((a, b) => a.k - b.k);
        // (flake-fix, fix round 2) the guard's own perception there, over 2 s more of the held peek. A calm grunt is put on
        // the exact spot (spawned at its cell, then moved there with its post, so it stands still) and made passive: its
        // meter stays at zero, so it never turns to look or walks off, while its think still runs `perceive`, which sets
        // los / losHead as in play. At every step its own eye must see the head and not the chest (else the next spot),
        // and at every one of its thinks over the window (at least 5) it must report the head only
        g.enemyMgr.clear();
        let e = null;
        let peek = null;
        let tried = 0;
        for (; tried < Math.min(8, only.length) && !peek; tried++) {
          const [x, y, z] = only[tried].p;
          e = g.enemyMgr.spawn('grunt', new V(x, y, z), false, Math.atan2(g.player.position.x - x, g.player.position.z - z));
          if (!e) break;
          e.passive = true;
          e.pos.set(x, nav.heightAt(x, z, y), z);
          e['prevPos'].copyFrom(e.pos);
          e['post'] = [x, z];
          e.setPatrol(null);
          const at = e.pos.asArray();
          let held = true;
          let thinks = 0;
          let los = true;
          let head = true;
          let bad = null;
          let lastT = e['thinkT'];
          for (let n = 0; n < 120 && held; n++) {
            t.step(1 / 60);
            e['eye'](eye);
            const v = see();
            held = !v.chest && v.head && g.wallCore.peekOn;
            const tt = e['thinkT'];
            if (tt > lastT) {
              thinks++;
              los &&= e.los;
              head &&= e.losHead;
              if (!(e.los && e.losHead) && !bad) bad = { n, los: e.los, head: e.losHead, lines: v, chestP: g.target.aimPoint(new V()).asArray().map((q) => +q.toFixed(3)), headP: g.target.headPoint(new V()).asArray().map((q) => +q.toFixed(3)) };
            }
            lastT = tt;
          }
          if (held) {
            const moved = Math.hypot(e.pos.x - at[0], e.pos.y - at[1], e.pos.z - at[2]);
            peek = { los, head, thinks, bad, margin: MARGINS[only[tried].k], moved: +moved.toFixed(4), light: g.lightLevel, at: [+x.toFixed(3), +z.toFixed(3)] };
          } else {
            g.enemyMgr.clear();
            e = null;
          }
        }
        if (!peek) {
          diag.push({ i, hidden: hidden.length, only: only.length, tried });
          P.axis(0, 0);
          t.reset();
          continue;
        }
        P.axis(0, 0);
        t.step(0.5);
        const back = { los: e.los };
        if (g.wallCore.active) g.wallCore.leave('test');
        return { i, hidden: hidden.length, only: only.length, tried, peek, back };
      }
      return { only: 0, segs: diag };
    });
    console.log(`  wall peek: ${JSON.stringify(r)}`);
    assert(!!r && r.only > 0, `a peek past the edge exposes the head alone to spots round the corner (${JSON.stringify(r)})`);
    assert(r.peek.los && r.peek.head && r.peek.thinks >= 5, `the guard there sees the peeking head only, at every think over 2 s of the held peek (${JSON.stringify(r.peek)})`);
    assert(!r.back.los, `peek released: hidden again (${JSON.stringify(r.back)})`);
  });

  await scen('vision', async () => {
    // (F1a, G179) the button toggles the wheel's mode (night by default), instant; the wheel picks thermal / electro
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const st = window.__app.input.state;
      const v = g.vision;
      t.light(null);
      // a guard behind the dispatch wall, 8 m away
      t.spawn('grunt', 0, -15, 0);
      t.tp(0, -7, Math.PI);
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

  // (guard-ai S12, A35) a helmeted guard: the first round to the head knocks the helmet off (no damage, he reels, a
  // deflect, the helmet tumbles to the floor and stays), the second kills
  await scen('helmet', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      // the same random draws every run (as 'lkp')
      const rnd = Math.random;
      let seed = 3535;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      try {
        t.light(1);
        em.alarmRaised = true;
        t.tp(-0.5, 0, 0);
        const e = t.spawn('grunt', 0, 5, Math.PI);
        e.setGear({ helmet: true, armour: false });
        t.step(0.1);
        const head = () => ({ amount: 60, point: e.pos.clone(), dir: new t.V(0, 0, 1), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
        const hp = e.health.hp;
        const r1 = e.applyDamage(head());
        const first = { deflect: r1.deflect === true, dealt: r1.dealt, alive: e.alive, hp: e.health.hp, helmet: e.helmet, stagger: +e['stagger'].toFixed(2), alerted: e.alerted, dropped: em.helmetDrops.shown };
        t.step(0.6);
        const d = em.helmetDrops['drops'][0];
        const floor = d ? +(d.m.position.y - e.pos.y).toFixed(3) : 99;
        const r2 = e.applyDamage(head());
        return { hp, first, floor, killed: r2.killed, alive: e.alive, still: em.helmetDrops.shown };
      } finally {
        Math.random = rnd;
      }
    });
    assert(r.first.deflect && r.first.dealt === 0 && r.first.alive && r.first.hp === r.hp, `the first head round is a deflect: no damage, alive (${JSON.stringify(r.first)})`);
    assert(!r.first.helmet && r.first.dropped === 1, `the helmet is knocked off and dropped (${JSON.stringify(r.first)})`);
    assert(r.first.stagger >= 0.85 && r.first.alerted, `he reels (stagger ${r.first.stagger}) and is in combat`);
    assert(r.floor < 0.3, `the helmet lies on the floor after its tumble (${r.floor} m above his feet)`);
    assert(r.killed && !r.alive, 'the second head round kills');
    assert(r.still === 1, 'the dropped helmet stays as a clue');
  });

  // (guard-ai S12, A36) an armoured guard: five rounds to the body leave him alive and unhurt (staggered at most once
  // per 1.5 s); one round to the head kills
  await scen('armour', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const rnd = Math.random;
      let seed = 4646;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      try {
        t.light(1);
        em.alarmRaised = true;
        t.tp(-0.5, 0, 0);
        const e = t.spawn('grunt', 0, 5, Math.PI);
        e.setGear({ helmet: false, armour: true });
        t.step(0.1);
        const shot = (part) => ({ amount: 30, point: e.pos.clone(), dir: new t.V(0, 0, 1), part, kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 });
        const hp = e.health.hp;
        let deflects = 0;
        const staggers = [];
        let clock = 0;
        for (let i = 0; i < 5; i++) {
          const before = e.sinceStagger;
          if (e.applyDamage(shot('body')).deflect) deflects++;
          if (e.sinceStagger < before) staggers.push(+clock.toFixed(2));
          t.step(0.4);
          clock += 0.4;
        }
        const body = { alive: e.alive, hp: e.health.hp, deflects, staggers };
        const killed = e.applyDamage(shot('head')).killed;
        return { hp, body, killed };
      } finally {
        Math.random = rnd;
      }
    });
    assert(r.body.alive && r.body.hp === r.hp && r.body.deflects === 5, `five body rounds: alive, unhurt, five deflects (${JSON.stringify(r.body)})`);
    let gap = 99;
    for (let i = 1; i < r.body.staggers.length; i++) gap = Math.min(gap, r.body.staggers[i] - r.body.staggers[i - 1]);
    assert(r.body.staggers.length >= 1 && r.body.staggers.length <= 2 && gap >= 1.5 - 1e-6, `staggered at most once per 1.5 s (${JSON.stringify(r.body.staggers)})`);
    assert(r.killed, 'one round to the head kills (no helmet)');
  });

  // (guard-ai S14, A40) a radio check misses a squad member taken out unseen: the caller radios "not answering", the
  // section turns cautious on a timed hold (MISSING.cautious), two search the spot; the caller taken during the call:
  // nobody is cautious
  await scen('missed check', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const R = em.radioTable;
      const rnd = Math.random;
      let seed = 1414;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      try {
        // a squad of three facing away from their third (yaw PI = -z), a far guard of the same section; dark, the
        // player far off
        const setup = () => {
          t.light(0);
          t.tp(-22, -24, 0);
          const a = t.spawn('grunt', 0, 5, Math.PI);
          const b = t.spawn('grunt', 6, 5, Math.PI);
          const c = t.spawn('grunt', 10, 9, Math.PI);
          const far = t.spawn('grunt', -21, 17, Math.PI);
          for (const e of [a, b, c]) em.joinSquad(e, 77);
          t.step(0.3);
          return { a, b, c, far };
        };
        const s = setup();
        t.kill(s.c, true);
        t.step(0.2);
        const m0 = em.sectionCounts.missedChecks;
        em.radioCheckNow();
        const caller = em.lastCheckCaller;
        t.step(0.1);
        const inc = [s.a.incident, s.b.incident];
        const kind = s.a.incident >= 0 ? em.board.kindOf(s.a.incident) : null;
        const left = caller ? em.radioLeft(caller) : 0;
        const before = em.cautionOf(s.far);
        t.step(left + R.staggerMax + 0.5);
        const got = {
          far: em.cautionOf(s.far),
          farLeft: em.awareness.alertLeft(s.far.key),
          farKind: em.awareness.alertOf(s.far.key),
          a: em.cautionOf(s.a),
          b: em.cautionOf(s.b),
          missed: em.sectionCounts.missedChecks - m0,
        };
        // the caller taken (silently) during his call
        t.reset();
        const s2 = setup();
        t.kill(s2.c, true);
        t.step(0.2);
        em.radioCheckNow();
        const caller2 = em.lastCheckCaller;
        t.step(0.5);
        const left2 = caller2 ? em.radioLeft(caller2) : 0;
        if (caller2) t.kill(caller2, true);
        t.step(left2 + R.staggerMax + 1);
        const cut = {
          far: em.cautionOf(s2.far),
          alerts: [s2.a, s2.b, s2.far].filter((e) => e.alive && em.awareness.alertLeft(e.key) > 0).length,
        };
        t.light(null);
        return { caller: !!caller, inc, kind, left, before, got, max: em.missingTable.cautious, caller2: !!caller2, left2, cut };
      } finally {
        Math.random = rnd;
      }
    });
    const f = (v) => v.toFixed(2);
    assert(r.caller && r.left > 1.5, `the radio check's caller radios the miss (call ${f(r.left)} s)`);
    assert(r.inc[0] >= 0 && r.inc[0] === r.inc[1] && r.kind === 'missing', `two of his squad search the spot (${r.inc}, ${r.kind})`);
    assert(r.before === 0, 'nobody is cautious before the call gets through');
    assert(r.got.far === 1 && r.got.farKind === 1 && r.got.farLeft > r.max - 10, `the far guard of the section turns cautious, timed (${JSON.stringify(r.got)})`);
    assert(r.got.a >= 1 && r.got.b >= 1, `the squad is cautious too (${r.got.a}, ${r.got.b})`);
    assert(r.got.missed === 1, `one missed check counted (${r.got.missed})`);
    assert(r.caller2 && r.left2 > 0.3, `the second caller is still on the radio when he is taken (${f(r.left2)} s left)`);
    assert(r.cut.far === 0 && r.cut.alerts === 0, `the caller taken during the call: nobody is cautious (${JSON.stringify(r.cut)})`);
  });

  // (guard-ai S14, A41) a loud shot 20 m from one guard (he only turns): he radios "shots fired"; once it gets through a
  // far guard who never heard it turns cautious (SHOTS.cautious) and two go to the spot (lead + cover); a suppressed
  // shot: no call
  await scen('loud shot', async () => {
    const r = await G(() => {
      const t = window.__t;
      const g = window.__app.current;
      const em = g.enemyMgr;
      const R = em.radioTable;
      const rnd = Math.random;
      let seed = 2727;
      Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const fire = (noise) => {
        const st = g.weapons.current.stats;
        const n0 = st.noise;
        st.noise = noise;
        g.weapons.lastShotNoise = noise;
        g.weapons.events.onShot(g.weapons.current.def);
        st.noise = n0;
      };
      try {
        t.light(0);
        t.tp(0, -5, Math.PI);
        // 19 m from the shot along the factory floor, a clear line (tier 1: a turn; the old spot at (-7, 14) was behind
        // the x -4 wall: 0.45 x 28 = 12.6 m reach, never heard), and one ~30 m off (out of its 28 m reach)
        const ear = t.spawn('grunt', 19, -5, 0);
        const far = t.spawn('grunt', -21, 17, Math.PI);
        t.step(0.3);
        const c0 = em.sectionCounts.shotsCalls;
        fire(1);
        const left = em.radioLeft(ear);
        const earLevel = ear.level;
        t.step(0.1);
        const before = em.cautionOf(far);
        t.step(left + R.staggerMax + 0.5);
        const got = {
          far: em.cautionOf(far),
          farKind: em.awareness.alertOf(far.key),
          farLeft: em.awareness.alertLeft(far.key),
          ear: em.cautionOf(ear),
          inc: [ear.incident, far.incident],
          kind: ear.incident >= 0 ? em.board.kindOf(ear.incident) : null,
          calls: em.sectionCounts.shotsCalls - c0,
          alarm: em.alarmRaised,
        };
        // a suppressed shot 8 m from him: he turns, nobody radios
        t.reset();
        t.light(0);
        t.tp(0, -5, Math.PI);
        const ear2 = t.spawn('grunt', 0, 3, 0);
        const far2 = t.spawn('grunt', -21, 17, Math.PI);
        t.step(0.3);
        fire(0.35);
        const supp = { left: em.radioLeft(ear2) };
        t.step(5);
        supp.far = em.cautionOf(far2);
        supp.calls = em.sectionCounts.shotsCalls;
        t.light(null);
        return { left, earLevel, before, got, max: em.shotsTable.cautious, supp };
      } finally {
        Math.random = rnd;
      }
    });
    const f = (v) => v.toFixed(2);
    assert(r.left > 1.5 && r.earLevel !== 'alert', `the guard who heard it (${r.earLevel}) radios it (call ${f(r.left)} s)`);
    assert(r.before === 0, 'the far guard is calm before the call gets through');
    assert(r.got.far === 1 && r.got.farKind === 2 && r.got.farLeft > r.max - 10, `the far guard turns cautious, timed (${JSON.stringify(r.got)})`);
    assert(r.got.inc[0] >= 0 && r.got.inc[0] === r.got.inc[1] && r.got.kind === 'shots', `two go to the spot (${r.got.inc}, ${r.got.kind})`);
    assert(r.got.calls === 1 && !r.got.alarm, `one shots call, no alarm (${r.got.calls}, ${r.got.alarm})`);
    assert(r.supp.left === 0 && r.supp.far === 0 && r.supp.calls === 0, `a suppressed shot: no call, nobody cautious (${JSON.stringify(r.supp)})`);
  });

  const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
  assert(real.length === 0, `no console errors (${real.join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
await browser.close();
process.exit(failed ? 1 : 0);
