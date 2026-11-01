// Every placed traversal anchor on every listed map is usable: standing at its natural approach (ladder foot, under a pipe,
// at a vent, beside a window, at a zipline's high end) the traverse prompt offers it and Y engages it. Also counts
// the hangable lips per map (generated ledges). `node scripts/e2e-anchors.mjs [url] [--only=map]`
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
// (G2b) the Test Chamber (studio, plain: no animation stage) is the map: the Warehouse (Hunter) is parked, and Marlow Yard
// (`ctcourse`) places no anchors yet (its walls are team moves and generated lips). Add `ctcourse` when it places one;
// `--only=warehouse` still runs the parked map by hand.
const PARKED = { warehouse: ['warehouse', 'clear'] };
const MAPS = [['studio', 'sandbox'], ...(PARKED[only] ? [PARKED[only]] : [])];
// anchors.ts REACH.zip: a zipline's high end is grabbed within this (plan) of it
const ZIP_REACH = 1.3;
let failed = false;
for (const [map, mode] of MAPS) {
  if (only && only !== map) continue;
  const { browser, page, errors } = await launch({ url, params: `autostart=${map}&mode=${mode}` });
  try {
    await frames(page, 10);
    const res = await page.evaluate((zipReach) => {
      const a = window.__app;
      const g = a.current;
      const p = g.player;
      const c = p.controller;
      const st = a.input.state;
      const V = p.position.constructor;
      a.loop.manual = true;
      // keep enemies out of it (they would shoot, and one beyond a window offers a takedown instead): freeze the
      // AI and mark them taken
      if (g.enemyMgr)
        for (const e of g.enemyMgr.enemies) {
          e.update = () => {};
          e.taken = true;
        }
      g.target.health.invulnerable = true;
      const L = g.world.level.anchors;
      const out = [];
      const tp = (x, y, z, yaw) => {
        g.traversal.reset();
        st.releaseAll();
        c.teleport(new V(x, y, z), yaw);
        p.cam.yaw = yaw;
        p.cam.pitch = 0;
        a.loop.stepHeadless(0.35, 120);
      };
      const floorAt = (x, z, yFrom) => {
        const h = g.ballistics.ray(new V(x, yFrom, z), new V(x, yFrom - 8, z), 1);
        return h.hit ? h.point.y : null;
      };
      const tryIt = (name, a0, x, z, yFrom, yaw, check, double = false) => {
        const fy = floorAt(x, z, yFrom);
        if (fy === null) return out.push({ name, ok: false, why: 'no floor at the approach' });
        tp(x, fy + 0.02, z, yaw);
        const offered = check();
        st.tap('jump');
        // (3.2.0: a split is a double jump - the second press in the air)
        if (double) {
          a.loop.stepHeadless(0.08, 120);
          st.tap('jump');
        }
        a.loop.stepHeadless(0.4, 120);
        const engaged = g.traversal.attachCtl.active || g.traversal.attachCtl.vent !== null || g.traversal.kind !== 'none';
        out.push({ name, ok: offered && engaged, why: `offered ${offered} engaged ${engaged}` });
        g.traversal.reset();
        a.loop.stepHeadless(0.2, 120);
      };
      const hintIs = (id) => () => g.traversal.attachCtl.hint?.anchor.id === id;
      for (const l of L.ladders) {
        const fx = Math.sin(l.facing);
        const fz = Math.cos(l.facing);
        tryIt(`ladder ${l.id} bottom`, l, l.base.x - fx * 0.6, l.base.z - fz * 0.6, l.base.y + 1, l.facing, hintIs(l.id));
        tryIt(`ladder ${l.id} top`, l, l.top.x + fx * 0.25, l.top.z + fz * 0.25, l.top.y + 1, l.facing + Math.PI, hintIs(l.id));
      }
      for (const pv of L.pipesV) tryIt(`drainpipe ${pv.id}`, pv, pv.base.x - Math.sin(pv.side) * 0.55, pv.base.z - Math.cos(pv.side) * 0.55, pv.base.y + 1, pv.side, hintIs(pv.id));
      for (const ph of L.pipesH) {
        // under the pipe where the floor puts it within reach (the middle, else nearer an end: a pipe out from a deck)
        let mx = (ph.a.x + ph.b.x) / 2;
        let mz = (ph.a.z + ph.b.z) / 2;
        for (const t of [0.5, 0.1, 0.9, 0.02, 0.98]) {
          const x = ph.a.x + (ph.b.x - ph.a.x) * t;
          const z = ph.a.z + (ph.b.z - ph.a.z) * t;
          const fy = floorAt(x, z, ph.hangHeight - 0.3);
          if (fy !== null && ph.hangHeight - fy <= 2.6 && ph.hangHeight - fy >= 1.6) {
            mx = x;
            mz = z;
            break;
          }
        }
        tryIt(`pipe ${ph.id}`, ph, mx, mz, ph.hangHeight - 0.3, Math.atan2(ph.b.x - ph.a.x, ph.b.z - ph.a.z) + Math.PI / 2, hintIs(ph.id));
      }
      for (const z of L.ziplines) {
        const dx = z.b.x - z.a.x;
        const dz = z.b.z - z.a.z;
        const l = Math.hypot(dx, dz);
        const ux = dx / l;
        const uz = dz / l;
        // the first stand behind the high end, within the grab's reach (REACH.zip in plan), whose floor puts the cable
        // 1.5-2.6 over the feet (anchors.ts reach): 0.7, 1.0, 1.2 back, straight or 0.4 to either side
        let at = null;
        for (const back of [0.7, 1.0, 1.2]) {
          for (const side of [0, -0.4, 0.4]) {
            if (at || Math.hypot(back, side) > zipReach) continue;
            const x = z.a.x - ux * back - uz * side;
            const zz = z.a.z - uz * back + ux * side;
            const fy = floorAt(x, zz, z.a.y - 1.2);
            if (fy !== null && z.a.y - fy >= 1.5 && z.a.y - fy <= 2.6) at = [x, zz];
          }
        }
        if (!at) out.push({ name: `zipline ${z.id}`, ok: false, why: 'no floor 1.5-2.6 under the cable within reach of its high end' });
        else tryIt(`zipline ${z.id}`, z, at[0], at[1], z.a.y - 1.2, Math.atan2(dx, dz), hintIs(z.id));
      }
      for (const d of L.ducts) {
        const e = d.entry;
        tryIt(`duct ${d.id}`, d, e.pos.x + e.nx * 0.6, e.pos.z + e.nz * 0.6, e.pos.y, Math.atan2(-e.nx, -e.nz), hintIs(d.id));
      }
      for (const w of L.windows) {
        const nx = Math.sin(w.yaw);
        const nz = Math.cos(w.yaw);
        // a side is approachable on foot when its floor is 0.3-1.3 under the sill (the vault's window)
        const footSide = [-1, 1].some((sd) => {
          const fy = floorAt(w.c.x + nx * 0.85 * sd, w.c.z + nz * 0.85 * sd, w.sillHeight - 0.3);
          return fy !== null && w.sillHeight - fy >= 0.3 && w.sillHeight - fy <= 1.3;
        });
        if (footSide) {
          for (const sd of [-1, 1]) tryIt(`window ${w.id} ${sd < 0 ? 'front' : 'back'}`, w, w.c.x + nx * 0.85 * sd, w.c.z + nz * 0.85 * sd, w.sillHeight - 0.3, Math.atan2(-nx * sd, -nz * sd), () => g.traversal.hintWindow?.id === w.id);
          continue;
        }
        // a rope-only window (no floor in reach of the sill on either side): down the rappel whose rope passes it, hook
        // on, lower to the sill - 0.6, the "Kick through" prompt, kick, the glass breaks
        const name = `window ${w.id} (from the rope)`;
        const rope = L.rappels.find((r) => {
          if (Math.abs(nx * r.nx + nz * r.nz) < 0.9) return false;
          const off = (r.top.x - w.c.x) * r.nx + (r.top.z - w.c.z) * r.nz;
          const lat = Math.abs((r.top.x - w.c.x) * -r.nz + (r.top.z - w.c.z) * r.nx);
          return off >= -0.2 && off <= 1.4 && lat <= Math.max(1.5, w.w / 2) && r.top.y - r.length < w.sillHeight - 0.6 && r.top.y > w.sillHeight;
        });
        if (!rope) {
          out.push({ name, ok: false, why: 'no floor in reach of the sill and no rope passes it' });
          continue;
        }
        const fy = floorAt(rope.top.x - rope.nx * 0.4, rope.top.z - rope.nz * 0.4, rope.top.y + 1);
        if (fy === null) {
          out.push({ name, ok: false, why: `no floor at rope ${rope.id}'s hook-on point` });
          continue;
        }
        tp(rope.top.x - rope.nx * 0.4, fy + 0.02, rope.top.z - rope.nz * 0.4, Math.atan2(rope.nx, rope.nz));
        st.tap('jump');
        a.loop.stepHeadless(1.0, 120);
        const ac = g.traversal.attachCtl;
        const hooked = ac.active && ac.m.anchor?.id === rope.id;
        // along the wall to the window, then down the rope to the sill - 0.6
        const lat = (w.c.x - rope.top.x) * -rope.nz + (w.c.z - rope.top.z) * rope.nx;
        let beside = false;
        for (const u of [lat, -lat]) {
          if (!hooked || beside) continue;
          ac.u = u;
          for (let k = 0; k < 60 && !beside; k++) {
            ac.m.s = Math.max(0, Math.min(rope.length - 0.3, ac.m.s + (c.pos.y - (w.sillHeight - 0.6)) * 0.8));
            a.loop.stepHeadless(0.1, 120);
            beside = ac.ropeWindow?.id === w.id && Math.abs(c.pos.y - (w.sillHeight - 0.6)) < 0.25;
          }
        }
        const prompt = g.hud.world.label('vault');
        st.tap('jump');
        a.loop.stepHeadless(1.2, 120);
        const broken = w.open || g.world.breakables.isOpen(`glass:${w.id}`);
        out.push({ name, ok: hooked && beside && prompt === 'Kick through' && broken && !ac.active, why: `rope ${rope.id} hooked ${hooked} beside ${beside} prompt "${prompt}" broken ${broken} feet ${c.pos.y.toFixed(2)}` });
        g.traversal.reset();
        a.loop.stepHeadless(0.2, 120);
      }
      // (3.2.0) split jump gaps: between the walls at the middle, facing along the corridor
      for (const sg of L.splits) {
        const s0 = sg.len / 2;
        tryIt(`split ${sg.id}`, sg, sg.a.x + sg.tx * s0, sg.a.z + sg.tz * s0, sg.a.y + 1, Math.atan2(sg.tx, sg.tz), () => g.traversal.attachCtl.split?.anchor.id === sg.id, true);
      }
      // (3.2.0 phase 3) rappel points from the roof facing out, fences from their first side
      for (const r of L.rappels) tryIt(`rappel ${r.id}`, r, r.top.x - r.nx * 0.4, r.top.z - r.nz * 0.4, r.top.y + 1, Math.atan2(r.nx, r.nz), hintIs(r.id));
      for (const f of L.fences) {
        const mx = (f.a.x + f.b.x) / 2;
        const mz = (f.a.z + f.b.z) / 2;
        tryIt(`fence ${f.id}`, f, mx + f.nx * 0.55, mz + f.nz * 0.55, f.a.y + 1, Math.atan2(-f.nx, -f.nz), hintIs(f.id));
      }
      const lips = L.ledges.filter((l) => l.canHang).length;
      const climbable = L.ledges.filter((l) => l.canHang && l.canClimbUp).length;
      const tops = [...new Set(L.ledges.filter((l) => l.canHang).map((l) => Math.round(l.top * 100) / 100))];
      return { out, lips, climbable, tops, placed: L.all.length - L.ledges.length };
    }, ZIP_REACH);
    console.log(`${map}: ${res.placed} placed anchors, ${res.lips} hangable lips (${res.climbable} with room to climb up)`);
    for (const r of res.out) assert(r.ok, `${map}: ${r.name} (${r.why})`);
    assert(res.lips >= 6, `${map}: lips to hang from (${res.lips})`);
    // (G2b) the Test Chamber's three lip heights: the team block and fin 4.4, the ledge wall and block B 2.4, the platform 3.0
    if (map === 'studio') for (const t of [4.4, 2.4, 3]) assert(res.tops.includes(t), `studio: a hangable lip at ${t} m (lips at ${res.tops.join(', ')})`);
    const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    assert(real.length === 0, `${map}: no console errors (${real.join(' | ')})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
  }
  await browser.close();
}
process.exit(failed ? 1 : 0);
