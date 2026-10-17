// Dead Line G1: the greybox boots (`?autostart=dead-line&mode=sandbox`), the debug menu teleports, and the REAL player controller
// walks the main route and every alternative to the end without getting stuck; rule 27 (the camera boom) is re-run in the engine.
//   node scripts/e2e-dead-line.mjs [url] [--routes=M,S-LEDGE] [--verbose]
// Routes come from the design JSON through the design's own path builder (docs/design/map-dead-line-sim.mjs): each route is a list
// of walked polylines and link crossings. The walker holds the stick towards the next point with the camera turned that way,
// opens a door when one is in reach (the interact press), and takes each link with the controller's own verbs: stairs and ramps
// by walking, ladders with Y then the stick, drops by walking off the edge, the beam and the ledge by walking, crawls through the vents.
import fs from 'node:fs';
import { launch, frames, assert, BTN } from './e2e-lib.mjs';
import { loadWorld } from '../docs/design/map-dead-line-core.mjs';
import { buildRoute } from '../docs/design/map-dead-line-sim.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const only = (args.find((a) => a.startsWith('--routes=')) ?? '').replace('--routes=', '').split(',').filter(Boolean);
const verbose = args.includes('--verbose');
const D = JSON.parse(fs.readFileSync(new URL('../docs/design/map-dead-line.json', import.meta.url), 'utf8'));
const Y = Object.fromEntries(D.meta.levels.map((l) => [l.id, l.y]));
let failed = false;
const fail = (m) => {
  failed = true;
  console.error('FAIL ' + m);
};

// ---- the routes as steps -----------------------------------------------------------------------------------------------------------
const W = loadWorld(D);
function stepsOf(route) {
  const built = buildRoute(W, route, { guardPts: { B: [], G: [], U: [], R: [], T: [] } });
  if (built.error) throw new Error(built.error);
  const steps = [];
  let cur = null;
  const start = route.pts[0];
  for (const s of built.segs) {
    if (s.link) {
      cur = null;
      steps.push({ type: 'link', id: s.link, lv: s.lv, from: s.a, end: s.linkEnd });
      continue;
    }
    if (s.hold) continue;
    if (!cur || cur.lv !== s.lv) {
      cur = { type: 'walk', lv: s.lv, pts: [s.a] };
      steps.push(cur);
    }
    const last = cur.pts[cur.pts.length - 1];
    if (Math.hypot(last[0] - s.a[0], last[1] - s.a[1]) > 0.05) cur.pts.push(s.a);
    cur.pts.push(s.b);
  }
  return { id: route.id, kind: route.kind, start: { lv: start.lv, x: start.x, z: start.z }, steps };
}

const routes = D.routes.filter((r) => !only.length || only.includes(r.id)).map(stepsOf);

// ---- in the page -------------------------------------------------------------------------------------------------------------------------
const install = (page) =>
  page.evaluate((Yl) => {
    const H = {
      Y: Yl,
      g: () => window.__app.current,
      c: () => window.__app.current.player.controller,
      log: [],
      tp(lv, x, z, yaw = 0) {
        const c = H.c();
        c.teleport(new c.pos.constructor(x, Yl[lv] + 0.05, z), yaw);
        H.g().player.cam.yaw = yaw;
      },
      step(n = 1) {
        for (let i = 0; i < n; i++) window.__app.loop.stepHeadless(1 / 60, 120);
      },
      stick(x, y) {
        window.__pad.axis(0, x);
        window.__pad.axis(1, -y);
      },
      btn(b, v) {
        window.__pad.set(b, v);
      },
      tap(b) {
        H.btn(b, 1);
        H.step(2);
        H.btn(b, 0);
        H.step(2);
      },
      /** The interact press: open any closed door within reach. */
      doors() {
        const c = H.c();
        const dr = H.g().world.doors;
        for (const d of dr.list) {
          if (d.target !== 0 || d.open > 0.01) continue;
          if (Math.hypot(d.cx - c.pos.x, d.cz - c.pos.z) < 1.7 && Math.abs(d.anchor.hinge.y - (c.pos.y)) < 1.5) dr.open(d, 'quiet');
        }
      },
      /** Walk the polyline with the controller; returns { ok, why, at }. */
      walk(pts, o = {}) {
        const c = H.c();
        const cam = H.g().player.cam;
        const mag = o.mag ?? 1;
        for (let k = 0; k < pts.length; k++) {
          const [tx, tz] = pts[k];
          let best = Infinity;
          let still = 0;
          let last = [c.pos.x, c.pos.z];
          const lastPt = k === pts.length - 1;
          const tol = o.tol ?? (lastPt ? 0.45 : 0.55);
          for (let it = 0; it < 60 * 40; it++) {
            const dx = tx - c.pos.x;
            const dz = tz - c.pos.z;
            const d = Math.hypot(dx, dz);
            if (d < tol) break;
            if (o.stopOnFall && c.pos.y < o.stopOnFall) {
              H.stick(0, 0);
              return { ok: true, fell: true };
            }
            cam.yaw = Math.atan2(dx, dz);
            H.stick(0, Math.min(1, mag));
            if (it % 8 === 0) H.doors();
            H.step(1);
            if (it % 45 === 44) {
              const m = Math.hypot(c.pos.x - last[0], c.pos.z - last[1]);
              still = m < 0.2 ? still + 1 : 0;
              last = [c.pos.x, c.pos.z];
              if (still >= 3) {
                H.stick(0, 0);
                return { ok: false, why: `stuck walking to (${tx.toFixed(1)}, ${tz.toFixed(1)})`, at: [c.pos.x, c.pos.y, c.pos.z] };
              }
            }
            if (d < best) best = d;
          }
          if (Math.hypot(tx - c.pos.x, tz - c.pos.z) >= tol) {
            H.stick(0, 0);
            return { ok: false, why: `no progress to (${tx.toFixed(1)}, ${tz.toFixed(1)})`, at: [c.pos.x, c.pos.y, c.pos.z] };
          }
        }
        H.stick(0, 0);
        return { ok: true };
      },
      anchors() {
        const a = H.g().world.level.anchors;
        return a;
      },
    };
    window.__h = H;
    window.__app.loop.manual = true;
    H.g().target.health.invulnerable = true;
  }, Y);

const camVerb = (page) =>
  page.evaluate(() => {
    const H = window.__h;
    const g = H.g();
    const eng = g.scene.getPhysicsEngine();
    const rr = g.player.cam.rr; // the camera's own raycast result (a PhysicsRaycastResult)
    const V = H.c().pos.constructor;
    const from = new V();
    const to = new V();
    const q = { membership: 2, collideWith: 1 };
    const hit = (ax, ay, az, bx, by, bz) => {
      from.set(ax, ay, az);
      to.set(bx, by, bz);
      rr.reset();
      eng.raycastToRef(from, to, rr, q);
      return rr.hasHit;
    };
    /** The shoulder camera's two rays (`shoulderCamera.ts`): pivot to the shoulder point, then the full boom back along the view. */
    H.camHits = (lv, x, z, fx, fz, crouch) => {
      const C = { pivotStand: 1.62, pivotCrouch: 1.18, height: -0.08, shoulderHip: 0.62, boomHip: 2.2 };
      const l = Math.hypot(fx, fz) || 1;
      fx /= l;
      fz /= l;
      const rx = fz;
      const rz = -fx;
      const y = H.Y[lv] + (crouch ? C.pivotCrouch : C.pivotStand);
      const sy = y + C.height;
      const sx = x + rx * C.shoulderHip;
      const sz = z + rz * C.shoulderHip;
      const pt = () => ` at (${rr.hitPoint.x.toFixed(2)}, ${rr.hitPoint.y.toFixed(2)}, ${rr.hitPoint.z.toFixed(2)})`;
      if (hit(x, y, z, sx, sy, sz)) return 'shoulder' + pt();
      if (hit(sx, sy, sz, sx - fx * C.boomHip, sy, sz - fz * C.boomHip)) return 'boom' + pt();
      return null;
    };
  });
const call = (page, fn, ...a) => page.evaluate(([f, ar]) => window.__h[f](...ar), [fn, a]);

// ---- link verbs (page side, one evaluate each) ----------------------------------------------------------------------------------------
const verbs = (page) =>
  page.evaluate(() => {
    const H = window.__h;
    const attached = () => H.g().traversal.attachCtl.active;
    H.ladder = (id, lvTo, endXZ) => {
      const a = H.anchors().ladders;
      const c = H.c();
      const [ex, ez] = endXZ;
      // the ladder whose base or top is nearest the link's near end: the link end that is on the player's side
      const up0 = H.Y[lvTo] > c.pos.y + 1;
      const cand = a
        .map((l, i) => ({ l, i, d: up0 ? Math.hypot(l.base.x - c.pos.x, l.base.z - c.pos.z) + 50 * Math.abs(l.base.y - c.pos.y) : Math.hypot(l.top.x - c.pos.x, l.top.z - c.pos.z) + 50 * Math.abs(l.top.y - c.pos.y) }))
        .sort((p, q) => p.d - q.d)[0];
      if (!cand) return { ok: false, why: 'no ladder anchors' };
      const l = cand.l;
      const up = H.Y[lvTo] > c.pos.y + 1;
      const fx = Math.sin(l.facing);
      const fz = Math.cos(l.facing);
      if (up) {
        // stand in front of the rungs (0.35 off), face them, Y, hold the stick forward
        const sx = l.base.x - fx * 0.35;
        const sz = l.base.z - fz * 0.35;
        const w = H.walk([[sx, sz]]);
        if (!w.ok) return { ok: false, why: 'to the ladder foot: ' + w.why, at: w.at };
        c.teleport(new c.pos.constructor(sx, c.pos.y, sz), l.facing);
        H.g().player.cam.yaw = l.facing;
        H.step(15);
        H.tap(3);
        H.step(20);
        if (!attached()) return { ok: false, why: 'the ladder did not take the climber (Y at the foot)', at: [c.pos.x, c.pos.y, c.pos.z] };
        H.stick(0, 1);
        for (let i = 0; i < 60 * 14 && attached(); i++) H.step(1);
        H.stick(0, 0);
      } else {
        // down: stand beyond the top, face the ladder, Y, stick back
        const sx = l.top.x + fx * 0.35;
        const sz = l.top.z + fz * 0.35;
        const w = H.walk([[sx, sz]]);
        if (!w.ok) return { ok: false, why: 'to the ladder top: ' + w.why, at: w.at };
        H.g().player.cam.yaw = l.facing + Math.PI;
        H.step(15);
        H.tap(3);
        H.step(30);
        if (!attached()) return { ok: false, why: 'the ladder did not take the climber (Y at the top)', at: [c.pos.x, c.pos.y, c.pos.z] };
        H.stick(0, -1);
        for (let i = 0; i < 60 * 14 && attached(); i++) H.step(1);
        H.stick(0, 0);
      }
      H.step(40);
      void ex;
      void ez;
      return { ok: true };
    };
  });

await 0;
const crawlVerb = (page) =>
  page.evaluate(() => {
    const H = window.__h;
    H.crawl = (dest) => {
      const c = H.c();
      const attached = () => H.g().traversal.attachCtl.active;
      const ducts = H.anchors().ducts;
      const d = ducts
        .map((q) => ({ q, d: Math.hypot(q.entry.pos.x - c.pos.x, q.entry.pos.z - c.pos.z) + 4 * Math.abs(q.entry.pos.y - 0.45 - c.pos.y) }))
        .sort((p, r) => p.d - r.d)[0]?.q;
      if (!d) return { ok: false, why: 'no duct anchors' };
      const e = d.entry.pos;
      const n = d.entry;
      // into the pit (a drop), then up to the vent
      const lowFloor = e.y - 0.45;
      if (lowFloor < c.pos.y - 0.7) {
        const r = H.walk([[e.x + n.nx * 0.7, e.z + n.nz * 0.7]], { stopOnFall: c.pos.y - 0.6, tol: 0.12 });
        if (!r.ok) return { ok: false, why: 'into the pit: ' + r.why, at: r.at };
        H.step(60);
        if (c.pos.y > lowFloor + 0.4) return { ok: false, why: `did not drop into the pit (y ${c.pos.y.toFixed(2)})`, at: [c.pos.x, c.pos.y, c.pos.z] };
      }
      const sx = e.x + n.nx * 0.45;
      const sz = e.z + n.nz * 0.45;
      const w = H.walk([[sx, sz]]);
      if (!w.ok) return { ok: false, why: 'to the vent: ' + w.why, at: w.at };
      const yaw = Math.atan2(-n.nx, -n.nz);
      H.g().player.cam.yaw = yaw;
      c.teleport(new c.pos.constructor(c.pos.x, c.pos.y, c.pos.z), yaw);
      H.step(20);
      H.tap(3);
      for (let i = 0; i < 90 && !attached(); i++) H.step(1);
      if (!attached()) return { ok: false, why: 'the vent did not take the crawler (kick)', at: [c.pos.x, c.pos.y, c.pos.z] };
      H.stick(0, 1);
      for (let i = 0; i < 60 * 40 && attached(); i++) H.step(1);
      H.stick(0, 0);
      H.step(60);
      void dest;
      return attached() ? { ok: false, why: 'still in the duct after 40 s' } : { ok: true };
    };
  });
await crawlVerb;

// ---- run -------------------------------------------------------------------------------------------------------------------------------
const results = [];
let camReport = null;
const stepsOf_all = () => (only.length ? D.routes : D.routes).map(stepsOf);
{
  const { browser, page, errors } = await launch({ url, params: 'autostart=dead-line&mode=sandbox' });
  try {
    await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 120000 });
    await frames(page, 20);
    await page.evaluate(() => window.__pad.connect());
    await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
    await install(page);
    await verbs(page);
    await crawlVerb(page);
    await camVerb(page);
    const boot = await page.evaluate(() => {
      const g = window.__app.current;
      return { map: g.world.map.id, mode: g.opts.mode, grounded: g.player.controller.grounded, y: g.player.controller.pos.y };
    });
    assert(boot.map === 'dead-line' && boot.mode === 'sandbox' && boot.grounded, `autostart=dead-line loads the map and the operator stands on a floor (${JSON.stringify(boot)})`);

    for (const r of routes) {
      await call(page, 'tp', r.start.lv, r.start.x, r.start.z, 0);
      await call(page, 'step', 30);
      let ok = true;
      let why = '';
      let n = 0;
      for (const s of r.steps) {
        n++;
        let res;
        if (s.type === 'walk') {
          const next = r.steps[n];
          const toDrop = next && next.type === 'link' && D.links.find((l) => l.id === next.id)?.kind === 'drop';
          res = await page.evaluate(([pts, so]) => window.__h.walk(pts, so ? { stopOnFall: so } : {}), [s.pts, toDrop ? Y[s.lv] - 0.8 : 0]);
          if (res.ok) {
            const y = await page.evaluate(() => window.__h.c().pos.y);
            if (!res.fell && Math.abs(y - Y[s.lv]) > 0.7 && !toDrop) res = { ok: false, why: `on the wrong level after the walk (y ${y.toFixed(2)}, expected ${Y[s.lv]})` };
          }
        } else {
          const L = D.links.find((l) => l.id === s.id);
          res = await takeLink(page, L, s);
        }
        if (verbose) console.log(r.id, n, s.type, s.id ?? '', JSON.stringify(res));
        if (!res.ok) {
          ok = false;
          why = `step ${n} (${s.type}${s.id ? ' ' + s.id : ''} on ${s.lv}): ${res.why} at ${res.at ? res.at.map((v) => v.toFixed(1)).join(', ') : '?'}`;
          break;
        }
      }
      results.push({ id: r.id, ok, why });
      console.log(`${ok ? 'PASS' : 'FAIL'} route ${r.id}${ok ? '' : ': ' + why}`);
      if (!ok) failed = true;
    }
    // the debug menu: F3, Teleport, then every chapter start, spawn and objective puts the operator on a floor at that spot
    {
      await page.evaluate(() => { window.__app.loop.manual = false; });
      await page.keyboard.press('F3');
      await frames(page, 3);
      assert(await page.evaluate(() => !!document.querySelector('.debug-warp-btn')), 'the debug overlay has a Teleport button on this map');
      await page.evaluate(() => document.querySelector('.debug-warp-btn').click());
      const pts = await page.evaluate(() => window.__app.current.world.layout.debugPoints.map((p) => ({ group: p.group, label: p.label, x: p.pos.x, y: p.pos.y, z: p.pos.z })));
      const want = { Chapter: 8, Spawn: 4, Objective: D.objectives.length };
      for (const [g, n] of Object.entries(want)) assert(pts.filter((p) => p.group === g).length === n, `${n} ${g} teleports (${pts.filter((p) => p.group === g).length})`);
      let bad = 0;
      for (const p of pts) {
        await page.evaluate((l) => document.querySelector(`[data-tp="${l}"]`).click(), p.label);
        await frames(page, 25);
        const at = await page.evaluate(() => { const c = window.__app.current.player.controller; return { x: c.pos.x, y: c.pos.y, z: c.pos.z, g: c.grounded }; });
        const near = Math.hypot(at.x - p.x, at.z - p.z) < 0.7 && Math.abs(at.y - p.y) < 0.8 && at.g;
        if (!near) {
          bad++;
          console.error(`  teleport ${p.group} ${p.label}: wanted (${p.x}, ${p.y}, ${p.z}) got (${at.x.toFixed(2)}, ${at.y.toFixed(2)}, ${at.z.toFixed(2)}) grounded ${at.g}`);
        }
      }
      assert(bad === 0, `every teleport (${pts.length}) lands on a floor at its spot (${bad} off)`);
      await page.evaluate(() => { window.__app.loop.manual = true; });
    }
    // the vent duct VDUCT (no route walks it): crawl from the north corridor into the Control room
    {
      await call(page, 'tp', 'U', 32, 9.6, Math.PI);
      await call(page, 'step', 40);
      const r = await page.evaluate(() => window.__h.crawl([32, 2.5]));
      const at = await page.evaluate(() => { const c = window.__h.c(); return [c.pos.x, c.pos.y, c.pos.z]; });
      assert(r.ok && at[2] < 3.7 && Math.abs(at[1] - Y.U) < 0.7, `VDUCT carries the crawler from the north corridor into the Control room (${JSON.stringify(r)}, ${at.map((v) => v.toFixed(1))})`);
    }
    // rule 27 in the engine: the camera's two rays every 1 m along every walked leg, standing and crouched
    {
      const all = stepsOf_all();
      let n = 0;
      const hits = [];
      for (const r of all) {
        const ends = r.steps.filter((q) => q.type === 'link').flatMap((q) => {
          const L = D.links.find((l) => l.id === q.id);
          return L ? [L.a, L.b] : [];
        });
        const samples = [];
        for (const st of r.steps) {
          if (st.type !== 'walk') continue;
          for (let i = 1; i < st.pts.length; i++) {
            const a = st.pts[i - 1];
            const b = st.pts[i];
            const fx = b[0] - a[0];
            const fz = b[1] - a[1];
            const len = Math.hypot(fx, fz);
            if (len < 1e-6) continue;
            for (let d = 0; d <= len; d += 1) {
              const x = a[0] + (fx * d) / len;
              const z = a[1] + (fz * d) / len;
              if (ends.some((e) => e[0] === st.lv && Math.hypot(e[1] - x, e[2] - z) < 1.5)) continue;
              samples.push([st.lv, x, z, fx, fz]);
            }
          }
        }
        const res = await page.evaluate((ss) => {
          const out = [];
          for (const [lv, x, z, fx, fz] of ss) for (const cr of [false, true]) out.push([lv, x, z, cr, window.__h.camHits(lv, x, z, fx, fz, cr)]);
          return out;
        }, samples);
        n += res.length;
        for (const [lv, x, z, cr, h] of res) if (h) hits.push(`${r.id} ${lv} (${x.toFixed(1)}, ${z.toFixed(1)}) ${cr ? 'crouched' : 'standing'} ${h}`);
      }
      console.log(`rule 27 (engine): ${n} camera tests, ${hits.length} collisions`);
      for (const h of hits.slice(0, 40)) console.log('  hit ' + h);
      if (hits.length) fail(`rule 27: ${hits.length} camera collisions`);
      camReport = { n, hits };
    }
    const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
    assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await browser.close();
}

async function takeLink(page, L, s) {
  // the step's `from` is where the link arrives (the far end, on the level the route continues on)
  const ends = [L.a, L.b].filter((p) => p[0] === s.lv).sort((p, q) => Math.hypot(p[1] - s.from[0], p[2] - s.from[1]) - Math.hypot(q[1] - s.from[0], q[2] - s.from[1]));
  const target = ends[0];
  const lvTo = target[0];
  switch (L.kind) {
    case 'stairs-open': {
      return page.evaluate(([to]) => window.__h.walk([[to[1], to[2]]]), [target]);
    }
    case 'ladder':
      return page.evaluate(([id, lv, e]) => window.__h.ladder(id, lv, e), [L.id, lvTo, [target[1], target[2]]]);
    case 'drop':
      return page.evaluate(([to]) => {
        const c = window.__h.c();
        const r = window.__h.walk([[to[1], to[2]]], { stopOnFall: c.pos.y - 0.8 });
        window.__h.step(90);
        return r;
      }, [target]);
    case 'beam':
    case 'ledge':
      return page.evaluate(([to, m]) => window.__h.walk([[to[1], to[2]]], { mag: m }), [target, L.kind === 'beam' ? 0.4 : 0.5]);
    case 'crawl': {
      const r = await page.evaluate(([d]) => window.__h.crawl(d), [[target[1], target[2]]]);
      if (!r.ok) return r;
      // the tunnels end in a pit: climb out (VDUCT ends in a room)
      const y = await page.evaluate(() => window.__h.c().pos.y);
      if (y < Y[target[0]] - 0.7) return page.evaluate(([id, lv, e]) => window.__h.ladder(id, lv, e), [L.id, target[0], [target[1], target[2]]]);
      return r;
    }
    default:
      return { ok: false, why: `link kind ${L.kind} (${L.id}) not walked yet` };
  }
}
void BTN;

if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-dead-line OK');
