// Every placed traversal anchor on every listed map is usable: standing at its natural approach (ladder foot, under a pipe,
// at a vent, beside a window, at a zipline's high end) the traverse prompt offers it and Y engages it. Also counts
// the hangable lips per map (generated ledges). `node scripts/e2e-anchors.mjs [url] [--only=map]`
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
const MAPS = [
  ['proving', 'sandbox'],
  ['warehouse', 'clear'],
];
let failed = false;
for (const [map, mode] of MAPS) {
  if (only && only !== map) continue;
  const { browser, page, errors } = await launch({ url, params: `autostart=${map}&mode=${mode}` });
  try {
    await page.waitForTimeout(1000);
    const res = await page.evaluate(() => {
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
        g.cover.reset();
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
      const tryIt = (name, a0, x, z, yFrom, yaw, check) => {
        const fy = floorAt(x, z, yFrom);
        if (fy === null) return out.push({ name, ok: false, why: 'no floor at the approach' });
        tp(x, fy + 0.02, z, yaw);
        const offered = check();
        st.tap('jump');
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
        tryIt(`zipline ${z.id}`, z, z.a.x - (dx / l) * 0.7, z.a.z - (dz / l) * 0.7, z.a.y - 1.2, Math.atan2(dx, dz), hintIs(z.id));
      }
      for (const d of L.ducts) {
        const e = d.entry;
        tryIt(`duct ${d.id}`, d, e.pos.x + e.nx * 0.6, e.pos.z + e.nz * 0.6, e.pos.y, Math.atan2(-e.nx, -e.nz), hintIs(d.id));
      }
      for (const w of L.windows) {
        const nx = Math.sin(w.yaw);
        const nz = Math.cos(w.yaw);
        for (const sd of [-1, 1]) tryIt(`window ${w.id} ${sd < 0 ? 'front' : 'back'}`, w, w.c.x + nx * 0.85 * sd, w.c.z + nz * 0.85 * sd, w.sillHeight - 0.3, Math.atan2(-nx * sd, -nz * sd), () => g.traversal.hintWindow?.id === w.id);
      }
      // (3.2.0) split jump gaps: between the walls at the middle, facing along the corridor
      for (const sg of L.splits) {
        const s0 = sg.len / 2;
        tryIt(`split ${sg.id}`, sg, sg.a.x + sg.tx * s0, sg.a.z + sg.tz * s0, sg.a.y + 1, Math.atan2(sg.tx, sg.tz), hintIs(sg.id));
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
      return { out, lips, climbable, placed: L.all.length - L.ledges.length };
    });
    console.log(`${map}: ${res.placed} placed anchors, ${res.lips} hangable lips (${res.climbable} with room to climb up)`);
    for (const r of res.out) assert(r.ok, `${map}: ${r.name} (${r.why})`);
    assert(res.lips > 10, `${map}: lips to hang from (${res.lips})`);
    const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
    assert(real.length === 0, `${map}: no console errors (${real.join(' | ')})`);
  } catch (e) {
    failed = true;
    console.error(String(e));
  }
  await browser.close();
}
process.exit(failed ? 1 : 0);
