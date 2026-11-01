// (CT prototype A3: the CT shuffle 0.35 m/s, peek at once, no pull-away, no SWAT turn, no lean-out, aiming leaves.)
// (clean-up G2b) The Test Chamber carries the solo parts (utostart=studio; the corner takedown with &mode=test).
// Locomotion step 11: back-to-wall. The Chamber: the context press enters within 0.5 m (a 0.2-0.45 s settle onto the
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
    /** (21w) The camera position and whether geometry stands between the head and it. */
    cam() {
      const c = g.player.cam.camera.position;
      const p = g.player.position;
      const head = new V(p.x, p.y + 1.45, p.z);
      return { x: c.x, y: c.y, z: c.z, blocked: !!g.ballistics.ray(head, new V(c.x, c.y, c.z), 1).hit };
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
  const { browser, page, errors } = await launch({ url, params: 'autostart=studio' });
  try {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
    await G(HARNESS);
    const seg = await G(() => window.__w.find(true, 60));
    assert(seg >= 0, `a free high wall in the Test Chamber (${seg})`);
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.35 + 0.7); }, seg);
    await G(() => window.__w.run(0.4, 0, 0, 'cover'));
    assert((await G(() => window.__w.state())).phase === 'off', "no entry from 0.7 m (playtest 2: entry within 0.5 m)");
    // too far: 1.3 m past the body line - no entry
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.35 + 1.3); }, seg);
    await G(() => window.__w.run(0.4, 0, 0, 'cover'));
    let st = await G(() => window.__w.state());
    assert(st.phase === 'off', `no entry from 1.3 m (${st.phase})`);
    // within 0.5 m (playtest 2): settles onto the body line in ~0.2 s
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.35 + 0.4); }, seg);
    await G(() => window.__w.run(1 / 60, 0, 0, 'cover'));
    st = await G(() => window.__w.state());
    assert(st.phase === 'entering', `the context press enters (${st.phase})`);
    await G(() => window.__w.run(0.5));
    st = await G(() => window.__w.state());
    assert(st.phase === 'on' && st.seg === seg && Math.abs(st.dist - st.standoff) < 0.04 && st.pose && st.cam === 'wall', `on the wall: body line ${st.dist.toFixed(3)} m (standoff ${st.standoff.toFixed(3)}), pose + camera preset (${st.cam})`);
    assert(st.cover && st.coverT > 0, `localRef.cover set while on the wall (coverT ${st.coverT.toFixed(2)})`);
    // (A3, G35) slide along (+t = the camera's right when facing the wall) at gear 3 standing: the CT shuffle, 0.35 m/s
    // x 0.9 (gear 3) at full stick (+-10%), quieter than walking; the camera never jumps a frame and never sits in geometry
    // (G6, AUDIT-WALLS row 2, 051917 @ 15.5-18.0) slideStand 0.525 -> 0.39: 0.35 m/s at gear 3 as CT
    await G(() => window.__app.current.player.controller.gears.set(3));
    const SH = 0.39 * 0.9;
    const sl = await G(() => window.__w.run(1.6, 1, 0, null, () => ({ ...window.__w.state(), c: window.__w.cam() })));
    // sample mid-slide, away from the stopping end (the core brakes into the end at 5 m/s^2, A45)
    let km = sl.length - 1;
    while (km > 45 && sl[km].len - 0.22 - sl[km].s <= 0.15) km--;
    const mid = sl[km];
    const pace = (sl[km].along - sl[km - 30].along) / 0.5;
    assert(km > 45 && mid.phase === 'on' && Math.abs(mid.v - SH) < 1e-6 && pace > SH * 0.88 && pace < SH * 1.12, `slides at the CT shuffle (core ${mid.v.toFixed(2)} m/s, body ${pace.toFixed(2)} m/s at ${(km / 60).toFixed(2)} s, ${(mid.len - 0.22 - mid.s).toFixed(2)} m from the end)`);
    const slideNoise = Math.max(...sl.map((x) => x.noise));
    // analog: half stick is slower (past the 0.2 dead band, rescaled)
    // (anim-rework S1) the analogue speed: a 0.5 stick asks for ~1.45 m/s, the sneak (named speed 2; 0.6 is ~1.66, the
    // walk side of the sneak / walk boundary), so the shuffle is the gear-2 factor 0.8 of 0.39, at (0.5 - 0.2) / 0.8 of
    // the deflection
    const half = await G(() => window.__w.run(0.6, -0.5, 0, null, () => window.__w.state()));
    const hv = Math.abs(half[half.length - 1].v);
    const HV = 0.39 * 0.8 * 0.375;
    assert(Math.abs(hv - HV) < 0.01, `analog below full stick: 0.5 stick slides at ${hv.toFixed(3)} m/s (${HV.toFixed(3)})`);
    // crouch on a high wall: the crouch press crouches on the wall (no leave), the crouched pace 0.55 m/s x 0.9 (G6, row 2:
    // 051917 @ 29.07-30.23, the side-on crouch-walk 0.5 m/s at gear 3)
    const cr = await G(() => { window.__w.run(1 / 60, 0, 0, 'crouch'); window.__w.run(0.5); return window.__w.run(1.0, -1, 0, null, () => window.__w.state()); });
    const cm = cr[cr.length - 1];
    const cpace = (cr[cr.length - 1].along - cr[cr.length - 31].along) / -0.5;
    const CH = 0.55 * 0.9;
    assert(cm.phase === 'on' && cm.crouched && (cm.sub & 1) !== 0 && Math.abs(Math.abs(cm.v) - CH) < 1e-6 && cpace > CH * 0.85 && cpace < CH * 1.15, `crouched on a high wall, still on it: 0.5 m/s crouch-walk (core ${Math.abs(cm.v).toFixed(2)}, body ${cpace.toFixed(2)} m/s, sub ${cm.sub})`);
    await G(() => { window.__w.run(1 / 60, 0, 0, 'crouch'); window.__w.run(0.5); });
    st = await G(() => window.__w.state());
    assert(st.phase === 'on' && !st.crouched, `stands again on the wall (${st.phase}, crouched ${st.crouched})`);
    // edge stop at the outside end b (the body's left: WALL_SUB.edgeL 4): pushed 2 s past the end it stays on the wall
    // within 5 cm of the end; pushing on peeks
    const tEdge = (st.len - 0.22 - st.s) / SH + 0.6;
    const ed = await G((t) => window.__w.run(t + 2, 1, 0, null, () => ({ ...window.__w.state(), c: window.__w.cam(), pk: window.__app.current.wallCore.peekOn })), tEdge);
    st = ed[ed.length - 1];
    assert(st.phase === 'on' && st.edge === 1 && (st.sub & 4) !== 0 && Math.abs(st.s - (st.len - 0.22)) < 0.03 && Math.abs(st.along - (st.len - 0.22)) < 0.05 && Math.abs(st.dist - st.standoff) < 0.05, `pushed 2 s past the end: stays on the wall at the end (s ${st.s.toFixed(2)} of ${st.len.toFixed(2)}, edge ${st.edge}, sub ${st.sub}, body at ${st.along.toFixed(3)}, ${st.dist.toFixed(2)} out)`);
    assert(st.pk, `pushing on at the end peeks (peek ${st.pk})`);
    // the camera over the slide and the edge: per-frame step <= 6 cm (the body's pace plus the eased framing), never
    // behind geometry from the head
    const cams = [...sl, ...ed].map((x) => x.c);
    let jump = 0;
    let at = -1;
    for (let k = 1; k < cams.length; k++) {
      if (k === sl.length) continue;
      const d = Math.hypot(cams[k].x - cams[k - 1].x, cams[k].y - cams[k - 1].y, cams[k].z - cams[k - 1].z);
      if (d > jump) (jump = d), (at = k);
    }
    const inGeo = cams.filter((c) => c.blocked).length;
    assert(jump <= 0.06 && inGeo === 0, `camera on the wall: max step ${(jump * 100).toFixed(1)} cm per frame at ${at} (<= 6), ${inGeo} frames behind geometry`);
    // a brush away (0.15 s) never leaves; pulling away held 0.3 s does
    await G(() => window.__w.run(0.6));
    await G(() => window.__w.run(0.15, 0, -1));
    st = await G(() => window.__w.state());
    assert(st.phase === 'on', `a brief pull (0.15 s) stays on the wall (${st.phase})`);
    await G(() => window.__w.run(1.5, 0, -1));
    st = await G(() => window.__w.state());
    assert(st.phase === 'on' && st.cover, `(A3, loco M25) pulling away never leaves the wall (${st.phase}, ${st.last})`);
    // only the button (or aiming) leaves: the button again
    await G(() => window.__w.run(0.3, 0, 0, 'cover'));
    st = await G(() => window.__w.state());
    assert(st.phase !== 'on' && st.phase !== 'entering' && st.last === 'context' && !st.cover, `the button again leaves (${st.phase}, ${st.last})`);
    // free walk at the same gear along the same line: louder than the wall slide
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, 1, 0.35 + 1.2); window.__app.current.player.controller.gears.set(3); }, seg);
    const walk = await G(() => window.__w.run(1.2, 1, 0, null, () => window.__w.state()));
    const walkNoise = Math.max(...walk.map((x) => x.noise));
    assert(slideNoise < walkNoise, `the slide is quieter than walking (crouch band: ${slideNoise.toFixed(2)} m < ${walkNoise.toFixed(2)} m)`);
    // (21w, A83) the stick held into the wall never enters on its own: only the context press does
    await G((i) => { const s = window.__app.current.world.level.coverSegments[i]; window.__w.place(i, s.len / 2, 0.42); }, seg);
    const into = await G(() => window.__w.run(0.8, 0, 1, null, () => window.__w.state().phase));
    assert(into.every((p) => p === 'off'), `the stick into a high face does not enter (${into.find((p) => p !== 'off') ?? 'off'})`);
    await G(() => window.__w.run(0.6, 0, 0, 'cover'));
    st = await G(() => window.__w.state());
    assert(st.phase === 'on', `the context press enters (${st.phase})`);
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
      window.__w.place(i, s.len / 2, 0.35 + 0.4);
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

/** (A3, G36, G137) The edge verb on the Test Chamber: the peek at once at a doorway end, the strict peek camera, the weapon hand on
 *  the open side, and aiming leaves the wall (the lean-out is gone, G52). */
async function edges() {
  const { browser, page, errors } = await launch({ url, params: 'autostart=studio' });
  try {
    const G = (f, a) => page.evaluate(f, a);
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 60000 });
    await G(HARNESS);
    await G(() => window.__w.run(0.1));
    // the doorway: a high segment of the door wall (z 4) with a free outside end
    const d = await G(() => {
      const g = window.__app.current;
      const L = g.wallCore.links;
      const segs = g.world.level.coverSegments;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (s.low || Math.abs(s.az - 4) > 0.4 || Math.abs(s.nz) < 0.99 || s.len < 1.5) continue;
        if (L.kB[i] === 0) return { i, end: 1, len: s.len };
        if (L.kA[i] === 0) return { i, end: -1, len: s.len };
      }
      return null;
    });
    assert(!!d, `the Test Chamber's door wall has a free wall end (${JSON.stringify(d)})`);
    const sx = d.end; // +t is the camera's right when facing the wall
    const k0 = d.end > 0 ? d.len - 0.8 : 0.8;
    await G(([i, k]) => window.__w.place(i, k, 0.35 + 0.4), [d.i, k0]);
    await G(() => window.__w.run(0.6, 0, 0, 'cover'));
    await G((x) => window.__w.run(2.5, x, 0), sx);
    let st = await G(() => window.__w.state());
    assert(st.phase === 'on' && st.edge === d.end && (st.sub & (d.end > 0 ? 4 : 8)) !== 0, `at the doorway edge (edge ${st.edge}, sub ${st.sub})`);
    // peek at once: the stick toward the edge at the end (released first), the head goes out WALL.peekOut, the camera swings
    // 0.4 m. (G6, AUDIT-WALLS row 9, 052021 @ 3.4-4.6) CT leans 10-15 deg (peekLean 0.45 -> 0.2) and the body steps toward the
    // edge: the head ends 0.36 m along the wall from the capsule (0.14 m past the edge), peekOut (the light sample) stays 0.35
    await G(() => window.__w.run(0.3));
    const pk = await G((x) => window.__w.run(0.8, x, 0, null, () => { const g = window.__app.current; const w = g.wallCore; const c = g.player.cam; return { on: w.peekOn, pe: w.peek, ex: Math.hypot(w.exX, w.exZ), cam: c.wallPeek, sub: w.sub(), lean: g.player.pose.lean, peekW: c['peekW'] }; }), sx);
    const kOn = pk.findIndex((p) => p.on);
    const last = pk[pk.length - 1];
    assert(kOn >= 0 && kOn <= 4 && last.pe === 1 && (last.sub & 16) !== 0 && last.cam === 1 && last.ex <= 0.3501 && last.ex > 0.3 && Math.abs(last.lean) > 0.15, `peek at once (step ${kOn}, no hold): head out ${last.ex.toFixed(3)} m, rig lean ${last.lean.toFixed(2)}, camera swing ${last.cam}`);
    // the strict camera: its pivot swing is the 0.4 m, not the old 0.6 m
    const sw = await G(() => { const c = window.__app.current.player.cam; return c.pivot.x === undefined ? 0 : Math.hypot(c.pivot.x - window.__app.current.player.position.x, c.pivot.z - window.__app.current.player.position.z); });
    assert(sw > 0.5 && sw <= 0.8001, `the peek camera pivot sits ${sw.toFixed(3)} m past the body (F1b: 0.6-0.8)`);
    await G(() => window.__w.run(0.5));
    st = await G(() => window.__w.state());
    assert((st.sub & 16) === 0 && st.phase === 'on', `the peek eases back when the stick is released (sub ${st.sub})`);
    // pushing round the corner (toward the edge and into the wall) stays on the wall and peeks
    await G((x) => window.__w.run(1.0, x * 0.8, 0.6), sx);
    st = await G(() => window.__w.state());
    const rpk = await G(() => window.__app.current.wallCore.peekOn);
    assert(st.phase === 'on' && st.edge === d.end && rpk, `pushing round the corner stays on the wall at the edge and peeks (${st.phase}, edge ${st.edge}, peek ${rpk})`);
    // aiming leaves the wall (CT): the aim input ends it, the lean-out is gone
    const aim = await G(() => {
      const g = window.__app.current;
      const st = window.__app.input.state;
      st.set('t', 'ads', true);
      window.__w.run(0.4);
      const r = { phase: g.wallCore.phase, last: g.wallCore.lastLeave, lean: g.wallCore.lean };
      st.set('t', 'ads', false);
      return r;
    });
    assert(aim.phase !== 'on' && aim.phase !== 'entering' && aim.last === 'action' && aim.lean === undefined, `aiming leaves the wall (${aim.phase}, ${aim.last}), no lean-out state`);
    const bad = errors.filter((e) => !/WebGL|GPU stall|swiftshader|favicon/i.test(e));
    assert(bad.length === 0, `no console errors (${bad.slice(0, 2).join(' | ')})`);
  } finally {
    await browser.close();
  }
}

/** (step 12) Corner takedown on the Test Chamber (test mode): back to a wall at an outside edge, a guard round it -> kind `corner`. */
async function cornerTakedown() {
  const { browser, page } = await launch({ url, params: 'autostart=studio&mode=test' });
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
        // (G2b) a face of the room (the outside of a block that touches the perimeter, or a room-long face, would put the player or the guard outside the room and strand the player)
        if (s.low || s.len < 2 || s.len > 14 || L.kB[i] !== 0 || Math.abs(s.y - g.player.position.y) > 3) continue;
        const mx = s.ax + s.tx * s.len / 2 + s.nx * 0.8;
        const mz = s.az + s.tz * s.len / 2 + s.nz * 0.8;
        if (mx < 0.5 || mx > 27.5 || mz < 0.5 || mz > 27.5) continue;
        window.__w.place(i, s.len - 0.7, 0.35 + 0.45);
        window.__w.run(0.6, 0, 0, 'cover');
        if (g.wallCore.phase !== 'on' || g.wallCore.seg !== i) continue;
        window.__w.run(3.5, 1, 0);
        if (g.wallCore.edge !== 1) continue;
        // a guard round the corner, behind the face plane, facing away along the wall's line
        const x = s.bx + s.tx * 0.7 - s.nx * 0.45;
        const z = s.bz + s.tz * 0.7 - s.nz * 0.45;
        const e = g.enemyMgr.spawn('grunt', new V(x, s.y, z), false, Math.atan2(s.tx, s.tz));
        window.__w.run(2 / 60);
        // (playtest 2) a spawn the level moved off the spot is not round this corner: next face
        if (Math.hypot(e.pos.x - x, e.pos.z - z) > 0.5) { g.enemyMgr.clear(); continue; }
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

// (process audit) the Warehouse flanker section is Hunter AI, parked: `--part=flanker` runs it alone (LEGACY list,
// `npm run e2e:legacy`); the default run is everything else
const flankerOnly = process.argv.includes('--part=flanker');
try {
  if (flankerOnly) {
    console.log('guards flank and flush a wall-held player (Warehouse)');
    await flank();
  } else {
    console.log('back-to-wall on the Test Chamber');
    await proving();
    console.log('edge verb on the Test Chamber: peek at once, strict camera, aiming leaves (A3)');
    await edges();
    console.log('corner takedown from the wall (Test Chamber, test mode, step 12)');
    await cornerTakedown();
  }
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
}
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-wall OK');
