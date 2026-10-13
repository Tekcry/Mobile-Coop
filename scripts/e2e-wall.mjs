// Locomotion step 11: back-to-wall. Proving Grounds: the context press enters within 0.9 m (a 0.2-0.45 s settle onto the
// body line), the stick slides along the wall at the gear's pace (gear <= 4) and quieter than walking, the slide
// stops at an outside end (edge flag), pulling the stick away leaves; MoveState `wall` from the core. Warehouse
// (Clear): a guard in combat against a player held on a wall gets the flanker assignment and lobs a grenade to
// flush them out (the AI reads `localRef.cover`, restored from step 05).
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;

/** In the page: helpers on window.__w (manual loop, a free wall face found by rays). */
const HARNESS = () => {
  const a = window.__app;
  const g = a.current;
  a.loop.manual = true;
  const V = g.player.position.constructor;
  const free = (x, z, y0) => {
    const h = g.ballistics.ray(new V(x, y0 + 1.0, z), new V(x, y0 - 0.5, z), 1);
    return h.hit;
  };
  const clear = (x0, z0, x1, z1, y) => !g.ballistics.ray(new V(x0, y, z0), new V(x1, y, z1), 1).hit;
  window.__w = {
    find(near, maxD) {
      const segs = g.world.level.coverSegments;
      const p = g.player.position;
      let best = -1;
      let bd = Infinity;
      segs.forEach((s, i) => {
        if (s.low || Math.abs(s.y - p.y) > 0.3 || s.len < 3 || s.len > 14 || s.nextA < 0 || s.nextB < 0) return;
        for (const k of [0.5, s.len / 2, s.len - 0.5]) {
          const x = s.ax + s.tx * k + s.nx * 0.45;
          const z = s.az + s.tz * k + s.nz * 0.45;
          if (!clear(x, z, x + s.nx * 3, z + s.nz * 3, s.y + 1) || !clear(x, z, x + s.nx * 3, z + s.nz * 3, s.y + 0.3) || !free(x + s.nx * 0.6, z + s.nz * 0.6, s.y)) return;
        }
        // the ends: the body line runs past them clear (no neighbour blocking the edge)
        for (const k of [-0.2, s.len + 0.2]) if (!free(s.ax + s.tx * k + s.nx * 0.45, s.az + s.tz * k + s.nz * 0.45, s.y)) return;
        const d = near ? Math.hypot(s.ax + s.tx * s.len / 2 - p.x, s.az + s.tz * s.len / 2 - p.z) : 0;
        if (d < bd && d < maxD) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    /** Stand `out` m in front of segment i at `k` m along it, facing the wall (camera too). */
    place(i, k, out) {
      const s = g.world.level.coverSegments[i];
      const yaw = Math.atan2(-s.nx, -s.nz);
      g.player.controller.clearCrouchToggle();
      g.player.controller.teleport(new V(s.ax + s.tx * k + s.nx * out, s.y + 0.05, s.az + s.tz * k + s.nz * out), yaw);
      g.player.cam.yaw = yaw;
      g.player.cam.pitch = 0;
      a.loop.stepHeadless(0.3, 120);
    },
    run(sec, mx = 0, my = 0, tap = null, probe = null) {
      const st = a.input.state;
      if (tap) st.tap(tap);
      const out = [];
      for (let t = 0; t < sec - 1e-6; t += 1 / 60) {
        st.move.x = mx;
        st.move.y = my;
        a.loop.stepHeadless(1 / 60, 120);
        if (probe) out.push(probe());
      }
      st.move.x = st.move.y = 0;
      return out;
    },
    state() {
      const w = g.wallCore;
      const c = g.player.controller;
      const s = w && w.seg >= 0 ? g.world.level.coverSegments[w.seg] : null;
      const p = g.player.position;
      const dist = s ? (p.x - s.ax) * s.nx + (p.z - s.az) * s.nz : NaN;
      const along = s ? (p.x - s.ax) * s.tx + (p.z - s.az) * s.tz : NaN;
      return { phase: w?.phase ?? 'none', seg: w?.seg ?? -1, s: w?.s ?? 0, edge: w?.edge ?? 0, sub: w?.sub() ?? 0, dist, along, speed: c.speed, crouched: c.crouched, noise: g.noise, v: w?.v ?? 0, cover: !!g['localRef'].cover, coverT: g['localRef'].coverT, standoff: w?.standoff ?? 0, len: s?.len ?? 0, pose: g.player.pose.wall, cam: g.player.cam.attach, last: w?.lastLeave ?? '' };
    },
  };
};

async function proving() {
  const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
  try {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
    await G(HARNESS);
    const seg = await G(() => window.__w.find(true, 60));
    assert(seg >= 0, `a free high wall on Proving (${seg})`);
    // too far: 1.3 m past the body line - no entry
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.35 + 1.3); }, seg);
    await G(() => window.__w.run(0.4, 0, 0, 'cover'));
    let st = await G(() => window.__w.state());
    assert(st.phase === 'off', `no entry from 1.3 m (${st.phase})`);
    // within 0.9 m: settles onto the body line in 0.2 s
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.35 + 0.6); }, seg);
    await G(() => window.__w.run(1 / 60, 0, 0, 'cover'));
    st = await G(() => window.__w.state());
    assert(st.phase === 'entering', `the context press enters (${st.phase})`);
    await G(() => window.__w.run(0.5));
    st = await G(() => window.__w.state());
    assert(st.phase === 'on' && st.seg === seg && Math.abs(st.dist - st.standoff) < 0.04 && st.pose && st.cam === 'wall', `on the wall: body line ${st.dist.toFixed(3)} m (standoff ${st.standoff.toFixed(3)}), pose + camera preset (${st.cam})`);
    assert(st.cover && st.coverT > 0, `localRef.cover set while on the wall (coverT ${st.coverT.toFixed(2)})`);
    // slide along (+t = the camera's right when facing the wall) at gear 3 standing (2.0 m/s); quieter than walking
    await G(() => window.__app.current.player.controller.gears.set(3));
    const s0 = st.s;
    const sl = await G(() => window.__w.run(1.0, 1, 0, null, () => window.__w.state()));
    // sample mid-slide, away from the stopping end: the core brakes into the end at 5 m/s^2 (A45), so the cap is read at
    // the last sample with more than 0.5 m to the end (stopping distance at 2 m/s is 0.4 m), 0.5 s or more into the slide
    let km = sl.length - 1;
    while (km > 30 && sl[km].len - 0.22 - sl[km].s <= 0.5) km--;
    const mid = sl[km];
    // pace over the 0.5 s before that sample from the body's own track along the wall (the controller's speed includes
    // the body-line correction)
    const pace = (sl[km].along - sl[km - 30].along) / 0.5;
    assert(km > 30 && mid.phase === 'on' && Math.abs(mid.v - 2.0) < 1e-6 && pace > 1.8 && pace < 2.15, `slides at the gear 3 cap (core ${mid.v.toFixed(2)} m/s, body ${pace.toFixed(2)} m/s at ${(km / 60).toFixed(2)} s, ${(mid.len - 0.22 - mid.s).toFixed(2)} m from the end)`);
    const slideNoise = Math.max(...sl.map((x) => x.noise));
    const g4 = await G(() => { window.__app.current.player.controller.gears.set(6); return window.__w.run(0.6, 1, 0, null, () => window.__w.state()); });
    const v6 = Math.max(...g4.map((x) => Math.abs(x.v)));
    const p6 = (g4[g4.length - 1].along - g4[11].along) / ((g4.length - 12) / 60);
    assert(v6 <= 2.8 + 1e-6 && (p6 < 2.95 || g4[g4.length - 1].edge !== 0), `gear 6 is capped at gear 4 on the wall (core ${v6.toFixed(2)}, body ${p6.toFixed(2)} m/s <= 2.8)`);
    // edge stop at the outside end b (the body's left: WALL_SUB.edgeL 4)
    const ed = await G(() => window.__w.run(5, 1, 0, null, () => window.__w.state()));
    st = ed[ed.length - 1];
    assert(st.phase === 'on' && st.edge === 1 && (st.sub & 4) !== 0 && Math.abs(st.s - (st.len - 0.22)) < 0.03 && Math.abs(st.along - st.s) < 0.08, `stops at the outside end (s ${st.s.toFixed(2)} of ${st.len.toFixed(2)}, edge ${st.edge}, sub ${st.sub}, body at ${st.along.toFixed(2)}, ${st.dist.toFixed(2)} out)`);
    // pull away (stick back = out of the wall) for 0.15 s: leaves
    await G(() => window.__w.run(0.35, 0, -1));
    st = await G(() => window.__w.state());
    assert(st.phase !== 'on' && st.phase !== 'entering' && st.last === 'pull' && !st.cover, `pulling away leaves (${st.phase}, ${st.last})`);
    // free walk at the same gear along the same line: louder than the wall slide
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, 1, 0.35 + 1.2); window.__app.current.player.controller.gears.set(3); }, seg);
    const walk = await G(() => window.__w.run(1.2, 1, 0, null, () => window.__w.state()));
    const walkNoise = Math.max(...walk.map((x) => x.noise));
    assert(slideNoise < walkNoise, `the slide is quieter than walking (crouch band: ${slideNoise.toFixed(2)} m < ${walkNoise.toFixed(2)} m)`);
    // the stick held into the wall for 0.35 s enters too
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.42); }, seg);
    const into = await G(() => window.__w.run(0.6, 0, 1, null, () => window.__w.state().phase));
    const k = into.findIndex((p) => p !== 'off');
    assert(k >= 18 && k <= 26, `the stick into a high face enters after 0.35 s (step ${k})`);
    await G(() => window.__w.run(0.3, 0, 0, 'cover'));
    st = await G(() => window.__w.state());
    assert(st.phase !== 'on' && st.last === 'context', `the context press again leaves (${st.last})`);
    const bad = errors.filter((e) => !/WebGL|GPU stall|swiftshader|favicon/i.test(e));
    assert(bad.length === 0, `no console errors (${bad.slice(0, 2).join(' | ')})`);
  } finally {
    await browser.close();
  }
}

async function flank() {
  const { browser, page } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
  try {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
    await G(HARNESS);
    await G(() => { const g = window.__app.current; g.target.health.invulnerable = true; g.mode.pending.length = 0; g.enemyMgr.clear(); });
    const seg = await G(() => window.__w.find(false, Infinity));
    assert(seg >= 0, `a free high wall on Warehouse (${seg})`);
    const r = await G((i) => {
      const g = window.__app.current;
      const s = g.world.level.coverSegments[i];
      window.__w.place(i, s.len / 2, 0.35 + 0.5);
      window.__w.run(0.4, 0, 0, 'cover');
      const V = g.player.position.constructor;
      const em = g.enemyMgr;
      // two riflemen in combat out in front of the wall, 10-12 m away
      const spawn = (k, d) => {
        const e = em.spawn('grunt', new V(s.ax + s.tx * k + s.nx * d, s.y, s.az + s.tz * k + s.nz * d), true, Math.atan2(-s.nx, -s.nz));
        e.grenadeCd = 0;
        return e;
      };
      const es = [spawn(s.len / 2, 11), spawn(Math.max(0.5, s.len / 2 - 2), 12)];
      let throws = 0;
      for (const e of es) {
        const ctx = e.ctx ?? e['ctx'];
        const orig = ctx.throwGrenade;
        ctx.throwGrenade = (...args) => {
          throws++;
          return orig(...args);
        };
      }
      let flanker = false;
      let maxT = 0;
      for (let t = 0; t < 14 && !(flanker && throws > 0); t += 1 / 60) {
        // the player stays on the wall (grenades or not)
        if (!g.wallCore.active) window.__w.run(1 / 60, 0, 0, 'cover');
        else a2();
        maxT = Math.max(maxT, g['localRef'].coverT);
        if (em.flanker && es.includes(em.flanker)) flanker = true;
      }
      function a2() { window.__app.loop.stepHeadless(1 / 60, 120); }
      return { flanker, throws, maxT, on: g.wallCore.active, us: es.map((e) => e.def.usesCover) };
    }, seg);
    assert(r.maxT > 4 && r.flanker, `held on a wall > 4 s: a flanker is assigned (${JSON.stringify(r)})`);
    assert(r.throws > 0, `held on a wall > 6 s: a guard lobs a grenade to flush the player (${JSON.stringify(r)})`);
  } finally {
    await browser.close();
  }
}

try {
  console.log('back-to-wall on Proving');
  await proving();
  console.log('guards flank and flush a wall-held player (Warehouse)');
  await flank();
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
}
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-wall OK');
