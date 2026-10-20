// (#67 parked, 2026-10-21) Diagnostic probe, not a suite: the e2e-stealth-ai "wall peek exposes the head" scenario on
// cover segment 149 of the Warehouse, printing per 0.1 s the head, chest, hips and ankles along the edge (m past it) and
// how many spots see the head alone. `E2E_PORT=4192 node scripts/run-e2e.mjs probe-wall-peek` (needs a build).
// docs/anim-rework/S2B-REPORT.md "#67 parked".
import { launch, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const { browser, page } = await launch({ url, params: 'autostart=warehouse&mode=clear' });
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
    const V = g.player.position.constructor;
    const st = a.input.state;
    const c = g.player.controller;
    // helpers kept on window for the scenarios
    window.__t = {
      V,
      reset() {
        em.clear();
        // (an alarm in an earlier scenario queues Hunter's reinforcements)
        g.mode.pending.length = 0;
        em.lkpValid = false;
        em.sightT = 99;
        em.alarmRaised = false;
        for (const p of em.alarms) p.disabled = false;
        for (const it of g.interactables.items) if (it.kind === 'alarm') { it.done = false; g.interactables.setEnabled(it, true); }
        const reg = g.world.level.lights;
        for (const l of reg.lights) {
          if (l.kind === 'flashlight') continue;
          l.destroyed = false;
          l.on = true;
        }
        reg.version++;
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
  await G(() => window.__t.reset());
  const r = await G(() => {
    const t = window.__t;
    const g = window.__app.current;
    const V = t.V;
    const P = window.__pad;
    P.connect();
    t.light(1);
    const segs = g.world.level.coverSegments;
    const L = g.wallCore.links;
    const out = [];
    for (let i = 149; i <= 149; i++) {
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
      const row = { i, phase: g.wallCore.phase, seg: g.wallCore.seg };
      out.push(row);
      if (g.wallCore.phase !== 'on' || g.wallCore.seg !== i) continue;
      P.axis(0, 1);
      t.step(3.0);
      P.axis(0, 0);
      t.step(0.3);
      row.edge = g.wallCore.edge;
      if (g.wallCore.edge !== 1) continue;
      const pt = new V();
      let gx = 0, gz = 0;
      const see = () => {
        const eye = new V(gx, s.y + 1.55, gz);
        const clear = (to, slack) => { const h = g.ballistics.ray(eye, to, 1); return !h.hit || h.distance > Math.hypot(to.x - eye.x, to.y - eye.y, to.z - eye.z) - slack; };
        return { chest: clear(g.target.aimPoint(pt).clone(), 0.3), head: clear(g.target.headPoint(pt).clone(), 0.2) };
      };
      const rel = () => {
        const h = g.target.headPoint(new V()), c = g.target.aimPoint(new V()), f = g.player.position;
        const f3 = (p) => [+((p.x - s.bx) * s.tx + (p.z - s.bz) * s.tz).toFixed(3), +(p.y - s.y).toFixed(3), +((p.x - s.bx) * s.nx + (p.z - s.bz) * s.nz).toFixed(3)];
        const R = g.player.rig, gr = R.graph; const J = (n) => { n.computeWorldMatrix(true); return f3(n.getAbsolutePosition()); }; return { head: f3(h), chest: f3(c), feet: f3(f), hips: J(R.hips), aL: J(R.ankleL), aR: J(R.ankleR), kW: +gr.keyW.toFixed(3), kWl: +gr.keyWallS.toFixed(3), mW: +gr.moveW.toFixed(3), pel: Array.from(gr.out.keyed.pel).map((x) => +x.toFixed(3)), lean: +(gr.leanBody?.v ?? NaN) };
      };
      const spots = [];
      for (let a = 1; a <= 7; a += 0.25) for (let b = 0.5; b <= 4; b += 0.25) spots.push([s.bx + s.tx * a - s.nx * b, s.bz + s.tz * a - s.nz * b]);
      row.pre = rel();
      const hidden = spots.filter(([x, z]) => { gx = x; gz = z; const v = see(); return !v.chest && !v.head; });
      row.hidden = hidden.length;
      P.axis(0, 1);
      const trace = [];
      for (let k = 0; k < 9; k++) { t.step(0.1); const q = rel(); trace.push(JSON.stringify(q)); }
      row.trace = trace;
      row.peekOn = g.wallCore.peekOn;
      row.post = rel();
      row.headOnly = hidden.filter(([x, z]) => { gx = x; gz = z; const v = see(); return !v.chest && v.head; }).length;
      row.bothSeen = hidden.filter(([x, z]) => { gx = x; gz = z; const v = see(); return v.chest && v.head; }).length;
      row.chestOnly = hidden.filter(([x, z]) => { gx = x; gz = z; const v = see(); return v.chest && !v.head; }).length;
      row.onlyAt = hidden.filter(([x, z]) => { gx = x; gz = z; const v = see(); return !v.chest && v.head; }).map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);
      row.seg = { bx: s.bx, bz: s.bz, tx: s.tx, tz: s.tz, nx: s.nx, nz: s.nz, y: s.y };
      P.axis(0, 0);
      t.reset();
    }
    return out;
  });
  for (const x of r) console.log(JSON.stringify(x));
} finally {
  await browser.close();
}
