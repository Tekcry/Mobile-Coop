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

/** (step 12) The edge verbs on Proving: peek, lean-out aim and fire (high wall, the doorway edge), over-the-top aim on a
 *  low wall, SWAT across the 1.1 m close-quarters doorway, the step round the corner. */
async function edges() {
  const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
  try {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
    await G(HARNESS);
    await G(() => window.__w.run(0.1));
    // the doorway: a high segment whose outside end has a SWAT target 1.1 m across
    const d = await G(() => {
      const g = window.__app.current;
      const L = g.wallCore.links;
      const segs = g.world.level.coverSegments;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s.low || Math.abs(Math.abs(s.az) - 8) > 0.4 || Math.abs(s.nz) < 0.99) continue;
        if (L.gB[i] >= 0 && Math.abs(L.gapB[i] - 1.1) < 0.05) return { i, end: 1, gap: L.gapB[i], to: L.gB[i], len: s.len };
        if (L.gA[i] >= 0 && Math.abs(L.gapA[i] - 1.1) < 0.05) return { i, end: -1, gap: L.gapA[i], to: L.gA[i], len: s.len };
      }
      return null;
    });
    assert(!!d, `the Proving doorway has a SWAT target across 1.1 m (${JSON.stringify(d)})`);
    const sx = d.end; // +t is the camera's right when facing the wall
    const k0 = d.end > 0 ? d.len - 0.8 : 0.8;
    await G(([i, k]) => window.__w.place(i, k, 0.35 + 0.5), [d.i, k0]);
    await G(() => window.__w.run(0.6, 0, 0, 'cover'));
    await G((x) => window.__w.run(1.0, x, 0), sx);
    let st = await G(() => window.__w.state());
    assert(st.phase === 'on' && st.edge === d.end && (st.sub & (d.end > 0 ? 4 : 8)) !== 0, `at the doorway edge (edge ${st.edge}, sub ${st.sub})`);
    // peek: the stick toward the edge held at the end 0.2 s (released first: the slide there held it already); the camera
    // swings, the head goes out <= 0.25 m
    await G(() => window.__w.run(0.3));
    const pk = await G((x) => window.__w.run(0.6, x, 0, null, () => { const w = window.__app.current.wallCore; return { on: w.peekOn, pe: w.peek, ex: Math.hypot(w.exX, w.exZ), cam: window.__app.current.player.cam.wallPeek, sub: w.sub(), lean: window.__app.current.player.pose.lean, s: w.s }; }), sx);
    const kOn = pk.findIndex((p) => p.on);
    const last = pk[pk.length - 1];
    assert(kOn >= 11 && kOn <= 16 && last.pe === 1 && (last.sub & 16) !== 0 && last.cam === 1 && last.ex <= 0.2501 && Math.abs(last.lean) > 0.3, `peek after 0.2 s held at the end (step ${kOn}): head out ${last.ex.toFixed(3)} m, rig lean ${last.lean.toFixed(2)}, camera swing ${last.cam}`);
    await G(() => window.__w.run(0.3));
    st = await G(() => window.__w.state());
    assert((st.sub & 16) === 0 && st.phase === 'on', `the peek eases back when the stick is released (sub ${st.sub})`);
    // lean-out aim: the body steps 0.35 m past the edge, the weapon draws, fire lands only when drawn; back in 0.25 s
    const ln = await G(() => {
      const g = window.__app.current;
      const st = window.__app.input.state;
      const w = g.wallCore;
      const s0 = w.s;
      st.set('t', 'ads', true);
      const tr = window.__w.run(0.6, 0, 0, null, () => `${((window.__w.state().along - s0) * w.edge).toFixed(2)}/${w.s.toFixed(2)}/${w.leanS.toFixed(2)}/${g.player.controller.speed.toFixed(1)}`);
      const r = { lk: w.lk, lean: w.lean, past: (window.__w.state().along - s0) * w.edge, sub: w.sub(), side: g.player.cam.wallSide, tr: tr.filter((_, k) => k % 4 === 0).join(' ') };
      const mag0 = g.weapons.current.mag;
      st.set('t', 'fire', true);
      window.__w.run(0.3);
      st.set('t', 'fire', false);
      r.fired = mag0 - g.weapons.current.mag;
      st.set('t', 'ads', false);
      window.__w.run(0.25 + 2 / 60);
      r.leanAfter = w.lean;
      r.lkAfter = w.lk;
      r.backAt = Math.abs(window.__w.state().along - s0);
      return r;
    });
    assert(ln.lk === 1 && ln.lean === 1 && Math.abs(ln.past - 0.35) < 0.06 && (ln.sub & 32) !== 0, `lean-out aim: the body ${ln.past.toFixed(3)} m past the edge (lk ${ln.lk}, sub ${ln.sub}) ${ln.tr}`);
    assert(ln.fired > 0, `fires while leaning out, drawn (${ln.fired} rounds)`);
    assert(ln.leanAfter === 0 && ln.lkAfter === 0 && ln.backAt < 0.1, `back in 0.25 s after the release (lean ${ln.leanAfter}, ${ln.backAt.toFixed(3)} m off)`);
    // SWAT turn: the context press with the stick toward the gap: crouched, committed, ends on the far wall
    await G((x) => window.__w.run(0.3, x, 0), sx);
    const sw = await G(([x, to]) => {
      const g = window.__app.current;
      const w = g.wallCore;
      window.__w.run(1 / 60, x, 0, 'cover');
      const r = { phase: w.phase, dur: w.swatDur, crouched: g.player.controller.crouched };
      const tr = window.__w.run(0.75, 0, 0, null, () => ({ ph: w.phase, n: g.noise, mode: g.moveState?.m ?? g['localMove']?.m }));
      r.noise = Math.max(...tr.map((p) => p.n));
      r.end = w.phase;
      r.seg = w.seg;
      r.to = to;
      r.dist = window.__w.state().dist;
      return r;
    }, [sx, d.to]);
    assert(sw.phase === 'swat' && Math.abs(sw.dur - Math.max(0.5, Math.min(0.8, (1.1 / 2.4) * 1.15))) < 0.01, `SWAT starts (${sw.phase}, ${sw.dur.toFixed(3)} s)`);
    assert(sw.end === 'on' && sw.seg === d.to && Math.abs(sw.dist - 0.35) < 0.08, `SWAT ends on the far wall (${sw.end}, seg ${sw.seg} / ${d.to}, ${sw.dist.toFixed(3)} m out)`);
    // step round the corner: the stick toward the edge and into the wall for 0.3 s leaves
    await G(() => window.__w.run(0.3, 0, 0, 'cover'));
    await G(([i, k]) => window.__w.place(i, k, 0.35 + 0.5), [d.i, k0]);
    await G(() => window.__w.run(0.6, 0, 0, 'cover'));
    await G((x) => window.__w.run(1.0, x, 0), sx);
    await G((x) => window.__w.run(0.45, x * 0.8, 0.6), sx);
    st = await G(() => window.__w.state());
    assert(st.phase !== 'on' && st.last === 'round', `stepping round the corner leaves the wall (${st.phase}, ${st.last})`);
    // a low wall: aim rises over the top (lean kind 2, standing)
    const lo = await G(() => {
      const g = window.__app.current;
      const segs = g.world.level.coverSegments;
      const p = g.player.position;
      const i = segs.findIndex((s) => s.low && s.len >= 3.5 && Math.abs(s.y - p.y) < 0.3);
      const s = segs[i];
      window.__w.place(i, s.len / 2, 0.35 + 0.5);
      window.__w.run(0.6, 0, 0, 'cover');
      const st = window.__app.input.state;
      st.set('t', 'ads', true);
      window.__w.run(0.6);
      const w = g.wallCore;
      const r = { i, phase: w.phase, lk: w.lk, crouched: g.player.controller.crouched };
      st.set('t', 'ads', false);
      window.__w.run(0.4);
      r.after = g.player.controller.crouched;
      return r;
    });
    assert(lo.phase === 'on' && lo.lk === 2 && !lo.crouched && lo.after, `low wall: aim rises over the top (lk ${lo.lk}, standing ${!lo.crouched}), crouched again after (${lo.after})`);
    const bad = errors.filter((e) => !/WebGL|GPU stall|swiftshader|favicon/i.test(e));
    assert(bad.length === 0, `no console errors (${bad.slice(0, 2).join(' | ')})`);
  } finally {
    await browser.close();
  }
}

/** (step 12) Corner takedown on Warehouse: back to a wall at an outside edge, a guard round it -> kind `corner`. */
async function cornerTakedown() {
  const { browser, page } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
  try {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForFunction(() => !!window.__app?.current?.enemyMgr, null, { timeout: 60000 });
    await G(HARNESS);
    await G(() => { const g = window.__app.current; g.target.health.invulnerable = true; g.mode.pending.length = 0; g.enemyMgr.clear(); window.__w.run(0.1); });
    const r = await G(() => {
      const g = window.__app.current;
      const segs = g.world.level.coverSegments;
      const L = g.wallCore.links;
      const V = g.player.position.constructor;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s.low || s.len < 2 || L.kB[i] !== 0 || Math.abs(s.y - g.player.position.y) > 3) continue;
        window.__w.place(i, s.len - 0.7, 0.35 + 0.5);
        window.__w.run(0.6, 0, 0, 'cover');
        if (g.wallCore.phase !== 'on' || g.wallCore.seg !== i) continue;
        window.__w.run(1.0, 1, 0);
        if (g.wallCore.edge !== 1) continue;
        // a guard round the corner, behind the face plane, facing away along the wall's line
        const x = s.bx + s.tx * 0.7 - s.nx * 0.45;
        const z = s.bz + s.tz * 0.7 - s.nz * 0.45;
        const e = g.enemyMgr.spawn('grunt', new V(x, s.y, z), false, Math.atan2(s.tx, s.tz));
        window.__w.run(2 / 60);
        const offer = g.takedown.offer;
        if (!offer || offer.e !== e) { g.enemyMgr.clear(); continue; }
        const kind = offer.plan.kind;
        window.__w.run(1 / 60, 0, 0, 'interact');
        const active = !!g.takedown.active;
        window.__w.run(1.5);
        return { i, kind, active, wallAfter: g.wallCore.phase };
      }
      return null;
    });
    assert(!!r && r.kind === 'corner' && r.active, `a guard round the edge offers the corner takedown and it runs (${JSON.stringify(r)})`);
  } finally {
    await browser.close();
  }
}

try {
  console.log('back-to-wall on Proving');
  await proving();
  console.log('guards flank and flush a wall-held player (Warehouse)');
  await flank();
  console.log('edge verbs on Proving: peek, lean-out aim, SWAT, round the corner, over the top (step 12)');
  await edges();
  console.log('corner takedown from the wall (Warehouse, step 12)');
  await cornerTakedown();
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
}
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-wall OK');
