// Dead Line v2 G1 (Area 1): the greybox boots (`?autostart=dead-line-v2&mode=sandbox`), and the REAL player controller walks the five design
// routes (M, UP, UPQ, BELOW, FP1) to the substation without getting stuck: ladders (M1, M2), downpipes up and down, roof drops, doors and
// the gate. The debug menu teleports to every encounter, checkpoint and spawn; the floor surfaces read as built; rule 27 (the camera boom)
// is re-run in the engine along every walked leg, standing and crouched, tunnel included.
//   node scripts/e2e-dead-line-v2.mjs [url] [--routes=M,BELOW] [--verbose]
// Routes come from the design JSON through the design's own path builder (docs/design/map-dead-line-sim.mjs).
import fs from 'node:fs';
import { launch, frames, assert, BTN } from './e2e-lib.mjs';
import { loadWorld } from '../docs/design/map-dead-line-core.mjs';
import { buildRoute } from '../docs/design/map-dead-line-sim.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const only = (args.find((a) => a.startsWith('--routes=')) ?? '').replace('--routes=', '').split(',').filter(Boolean);
const verbose = args.includes('--verbose');
const D = JSON.parse(fs.readFileSync(new URL('../docs/design/map-dead-line-v2.json', import.meta.url), 'utf8'));
const Y = Object.fromEntries(D.meta.levels.map((l) => [l.id, l.y]));
let failed = false;
const fail = (m) => {
  failed = true;
  console.error('FAIL ' + m);
};
const hyp = (a, b) => Math.sqrt(a * a + b * b);

// ---- the routes as steps -----------------------------------------------------------------------------------------------------------
const W = loadWorld(D);
const linkById = (id) => D.links.find((l) => l.id === id);
function stepsOf(route) {
  const built = buildRoute(W, route, { guardPts: { B: [], G: [], U: [], R: [] } });
  if (built.error) throw new Error(built.error);
  const steps = [];
  let cur = null;
  const start = route.pts[0];
  for (const s of built.segs) {
    if (s.link) {
      cur = null;
      steps.push({ type: 'link', id: s.link, lv: s.lv, from: s.a });
      continue;
    }
    if (s.hold) continue;
    if (!cur || cur.lv !== s.lv) {
      cur = { type: 'walk', lv: s.lv, pts: [s.a] };
      steps.push(cur);
    }
    const last = cur.pts[cur.pts.length - 1];
    if (hyp(last[0] - s.a[0], last[1] - s.a[1]) > 0.05) cur.pts.push(s.a);
    cur.pts.push(s.b);
  }
  // a walk that ends at a ladder link stops 1.2 m short of the shaft: the ladder verb walks the last part (the shaft is a hole)
  steps.forEach((st, i) => {
    const nx = steps[i + 1];
    if (st.type !== 'walk' || !nx || nx.type !== 'link') return;
    const L = linkById(nx.id);
    if (L.kind !== 'ladder') return;
    const near = [L.a, L.b].find((p) => p[0] === nx.lv);
    while (st.pts.length > 1 && hyp(st.pts[st.pts.length - 1][0] - near[1], st.pts[st.pts.length - 1][1] - near[2]) < 1.2) st.pts.pop();
  });
  // and a walk that starts after a ladder link leaves the shaft first: its leading points inside the shaft are dropped
  steps.forEach((st, i) => {
    const pv = steps[i - 1];
    if (st.type !== 'walk' || !pv || pv.type !== 'link') return;
    const L = linkById(pv.id);
    if (L.kind !== 'ladder') return;
    const end = [L.a, L.b].find((p) => p[0] === st.lv);
    while (st.pts.length > 1 && hyp(st.pts[0][0] - end[1], st.pts[0][1] - end[2]) < 1.2) st.pts.shift();
  });
  return { id: route.id, kind: route.kind, start: { lv: start.lv, x: start.x, z: start.z }, steps, segs: built.segs };
}
const routes = D.routes.filter((r) => !only.length || only.includes(r.id)).map(stepsOf);

// ---- in the page -------------------------------------------------------------------------------------------------------------------------
const install = (page) =>
  page.evaluate((Yl) => {
    const H = {
      Y: Yl,
      g: () => window.__app.current,
      c: () => window.__app.current.player.controller,
      tp(lv, x, z, yaw = 0) {
        const c = H.c();
        c.teleport(new c.pos.constructor(x, Yl[lv] + 0.05, z), yaw);
        H.g().player.cam.yaw = yaw;
      },
      face(yaw) {
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
      attached: () => H.g().traversal.attachCtl.active,
      info() {
        const c = H.c();
        const ac = H.g().traversal.attachCtl;
        return { x: c.pos.x, y: c.pos.y, z: c.pos.z, grounded: c.grounded, attached: ac.active, kind: ac.m.anchor?.kind ?? null, canClimb: ac.canClimb, surface: H.g().surface };
      },
      /** The interact press: open any closed door within reach. */
      doors() {
        const c = H.c();
        const dr = H.g().world.doors;
        for (const d of dr.list) {
          if (d.target !== 0 || d.open > 0.01) continue;
          if (Math.hypot(d.cx - c.pos.x, d.cz - c.pos.z) < 1.7 && Math.abs(d.anchor.hinge.y - c.pos.y) < 1.5) dr.open(d, 'quiet');
        }
      },
      /** Walk the polyline with the controller; returns { ok, why, at }. */
      walk(pts, o = {}) {
        const c = H.c();
        const cam = H.g().player.cam;
        const mag = o.mag ?? 1;
        for (let k = 0; k < pts.length; k++) {
          const [tx, tz] = pts[k];
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
          }
          if (Math.hypot(tx - c.pos.x, tz - c.pos.z) >= tol) {
            H.stick(0, 0);
            return { ok: false, why: `no progress to (${tx.toFixed(1)}, ${tz.toFixed(1)})`, at: [c.pos.x, c.pos.y, c.pos.z] };
          }
        }
        H.stick(0, 0);
        return { ok: true };
      },
    };
    window.__h = H;
    window.__app.loop.manual = true;
    H.g().target.health.invulnerable = true;
  }, Y);

const verbs = (page) =>
  page.evaluate(() => {
    const H = window.__h;
    const ladders = () => H.g().world.level.anchors.ladders;
    const pipes = () => H.g().world.level.anchors.pipesV;
    /** The ladder whose base is in the link's shaft. */
    H.ladderAt = (cx, cz, yLow) => ladders().find((q) => Math.abs(q.base.y - yLow) < 0.05 && Math.abs(q.base.x - cx) <= 0.7 && Math.abs(q.base.z - cz) <= 0.7);
    /** The closed cast-iron covers are walkable plates; lifting them is mission logic (a later stage), so the test lifts them by dropping their colliders. */
    H.liftCovers = () => {
      const lvl = H.g().world.level;
      const idx = [];
      let n = 0;
      for (const b of lvl.boxes) {
        if (!b.collide) continue;
        if (b.color === '#2e3236') idx.push(n);
        n++;
      }
      for (const i of idx.reverse()) lvl.body.shape.removeChild(i);
      return idx.length;
    };
    H.pipeAt = (x) => pipes().find((q) => Math.abs(q.base.x - x) < 0.4);
    H.climbLadder = (cx, cz, yLow, up) => {
      const l = H.ladderAt(cx, cz, yLow);
      if (!l) return { ok: false, why: 'no ladder anchor at the shaft' };
      const c = H.c();
      const fx = Math.sin(l.facing);
      const fz = Math.cos(l.facing);
      if (up) {
        const sx = l.base.x - fx * 0.35;
        const sz = l.base.z - fz * 0.35;
        const w = H.walk([[sx, sz]]);
        if (!w.ok) return { ok: false, why: 'to the ladder foot: ' + w.why, at: w.at };
        c.teleport(new c.pos.constructor(sx, c.pos.y, sz), l.facing);
        H.face(l.facing);
        H.step(15);
        H.tap(3);
        H.step(20);
        if (!H.attached()) return { ok: false, why: 'the ladder did not take the climber (Y at the foot)', at: [c.pos.x, c.pos.y, c.pos.z] };
        H.stick(0, 1);
        for (let i = 0; i < 60 * 14 && H.attached(); i++) H.step(1);
        H.stick(0, 0);
      } else {
        const sx = l.top.x + fx * 0.35;
        const sz = l.top.z + fz * 0.35;
        const w = H.walk([[sx, sz]]);
        if (!w.ok) return { ok: false, why: 'to the ladder top: ' + w.why, at: w.at };
        c.teleport(new c.pos.constructor(sx, c.pos.y, sz), l.facing + Math.PI);
        H.face(l.facing + Math.PI);
        H.step(15);
        H.tap(3);
        H.step(30);
        if (!H.attached()) return { ok: false, why: 'the ladder did not take the climber (Y at the top)', at: [c.pos.x, c.pos.y, c.pos.z] };
        H.stick(0, -1);
        for (let i = 0; i < 60 * 14 && H.attached(); i++) H.step(1);
        H.stick(0, 0);
      }
      H.step(40);
      return { ok: true };
    };
    /** Up a downpipe: stand 0.5 m in front, Y, climb, Y at the top over the lip. */
    H.pipeUp = (x, yTop) => {
      const p = H.pipeAt(x);
      if (!p) return { ok: false, why: 'no downpipe anchor at x ' + x };
      const c = H.c();
      const sx = p.base.x;
      const sz = p.base.z - Math.cos(p.side) * 0.5;
      const w = H.walk([[sx, sz]], { tol: 0.2 });
      if (!w.ok) return { ok: false, why: 'to the pipe foot: ' + w.why, at: w.at };
      c.teleport(new c.pos.constructor(sx, c.pos.y, sz), p.side);
      H.face(p.side);
      H.step(24);
      H.tap(3);
      H.step(36);
      if (!H.attached()) return { ok: false, why: 'the downpipe did not take the climber', at: [c.pos.x, c.pos.y, c.pos.z] };
      for (let k = 0; k < 40 && H.attached() && !H.g().traversal.attachCtl.canClimb; k++) {
        H.stick(0, 1);
        H.step(30);
      }
      H.stick(0, 0);
      for (let k = 0; k < 8 && H.attached(); k++) {
        H.tap(3);
        H.stick(0, 1);
        H.step(72);
      }
      H.stick(0, 0);
      H.step(48);
      if (H.attached() || Math.abs(c.pos.y - yTop) > 0.7) return { ok: false, why: `not up on the roof (y ${c.pos.y.toFixed(2)}, attached ${H.attached()})`, at: [c.pos.x, c.pos.y, c.pos.z] };
      return { ok: true };
    };
    /** Down a downpipe: lower onto the eave lip at its x (hold B), shimmy onto the pipe, climb down. */
    H.pipeDown = (x, yTop) => {
      const p = H.pipeAt(x);
      if (!p) return { ok: false, why: 'no downpipe anchor at x ' + x };
      const c = H.c();
      const eaveZ = p.base.z + 0.58; // on the eave (0.6 m deep), 0.02 in from its front
      const w = H.walk([[p.base.x, eaveZ]], { tol: 0.15 });
      if (!w.ok) return { ok: false, why: 'to the roof edge: ' + w.why, at: w.at };
      c.teleport(new c.pos.constructor(p.base.x, c.pos.y, eaveZ), p.side + Math.PI);
      H.face(p.side + Math.PI);
      H.step(24);
      H.btn(1, 1);
      H.step(72);
      H.btn(1, 0);
      H.step(48);
      if (!H.attached()) return { ok: false, why: 'did not lower onto the eave lip', at: [c.pos.x, c.pos.y, c.pos.z] };
      let onPipe = H.g().traversal.attachCtl.m.anchor?.kind === 'pipeV';
      for (const dir of [1, -1]) {
        for (let k = 0; k < 12 && !onPipe; k++) {
          H.stick(dir, 0);
          H.step(18);
          H.stick(0, 0);
          onPipe = H.g().traversal.attachCtl.m.anchor?.kind === 'pipeV';
        }
        if (onPipe) break;
      }
      if (!onPipe) return { ok: false, why: 'did not swing from the lip onto the downpipe', at: [c.pos.x, c.pos.y, c.pos.z] };
      H.step(30);
      H.stick(0, -1);
      for (let k = 0; k < 40 && H.attached(); k++) H.step(30);
      H.stick(0, 0);
      H.step(48);
      if (H.attached() || c.pos.y > 0.4) return { ok: false, why: `not down on the street (y ${c.pos.y.toFixed(2)})`, at: [c.pos.x, c.pos.y, c.pos.z] };
      return { ok: true };
    };
  });

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

const takeLink = async (page, L, s) => {
  // the near end is the one the operator stands at: the route builder reports a link's level and position as the near end for a forced link
  // and as the arrival end for a link it chose itself, so the engine position decides
  const pos = await page.evaluate(() => { const c = window.__h.c(); return [c.pos.x, c.pos.y, c.pos.z]; });
  const ends = [L.a, L.b];
  const score = (p) => Math.abs(Y[p[0]] - pos[1]) * 10 + hyp(p[1] - pos[0], p[2] - pos[2]);
  const near = ends.slice().sort((p, q) => score(p) - score(q))[0];
  const far = ends.find((p) => p !== near);
  const up = Y[far[0]] > Y[near[0]];
  const lowLv = up ? near[0] : far[0];
  switch (L.kind) {
    case 'ladder':
      return page.evaluate(([cx, cz, yl, u]) => window.__h.climbLadder(cx, cz, yl, u), [L.a[1], L.a[2], Y[lowLv], up]);
    case 'pipe': {
      const lo = Y[L.a[0]] <= Y[L.b[0]] ? L.a : L.b;
      return up ? page.evaluate(([x, yt]) => window.__h.pipeUp(x, yt), [lo[1], Y.U]) : page.evaluate(([x, yt]) => window.__h.pipeDown(x, yt), [lo[1], Y.U]);
    }
    case 'drop':
      return page.evaluate(([to]) => {
        const c = window.__h.c();
        const r = window.__h.walk([[to[1], to[2]]], { stopOnFall: c.pos.y - 0.8 });
        window.__h.step(90);
        return r;
      }, [far]);
    default:
      return { ok: false, why: `link kind ${L.kind} (${L.id}) not walked yet` };
  }
};

// ---- run -------------------------------------------------------------------------------------------------------------------------------
{
  const { browser, page, errors } = await launch({ url, params: 'autostart=dead-line-v2&mode=sandbox' });
  try {
    await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 120000 });
    await frames(page, 20);
    await page.evaluate(() => window.__pad.connect());
    await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
    await install(page);
    await verbs(page);
    await camVerb(page);
    const boot = await page.evaluate(() => {
      const g = window.__app.current;
      return { map: g.world.map.id, mode: g.opts.mode, grounded: g.player.controller.grounded, x: g.player.controller.pos.x, z: g.player.controller.pos.z };
    });
    assert(boot.map === 'dead-line-v2' && boot.mode === 'sandbox' && boot.grounded, `autostart=dead-line-v2 loads the v2 map and the operator stands on a floor (${JSON.stringify(boot)})`);

    let covers = 0;
    for (const r of routes) {
      if (r.id === 'BELOW' && !covers) covers = await page.evaluate(() => window.__h.liftCovers());
      await page.evaluate(([lv, x, z]) => window.__h.tp(lv, x, z, Math.PI), [r.start.lv, r.start.x, r.start.z]);
      await page.evaluate(() => window.__h.step(30));
      let ok = true;
      let why = '';
      let n = 0;
      for (const s of r.steps) {
        n++;
        let res;
        if (s.type === 'walk') {
          const next = r.steps[n];
          const toDrop = next && next.type === 'link' && linkById(next.id)?.kind === 'drop';
          res = await page.evaluate(([pts, so]) => window.__h.walk(pts, so ? { stopOnFall: so } : {}), [s.pts, toDrop ? Y[s.lv] - 0.8 : 0]);
          if (res.ok) {
            const y = await page.evaluate(() => window.__h.c().pos.y);
            if (!res.fell && Math.abs(y - Y[s.lv]) > 0.7 && !toDrop) res = { ok: false, why: `on the wrong level after the walk (y ${y.toFixed(2)}, expected ${Y[s.lv]})` };
          }
        } else res = await takeLink(page, linkById(s.id), s);
        if (verbose) console.log(r.id, n, s.type, s.id ?? '', JSON.stringify(res), await page.evaluate(() => { const c = window.__h.c(); return [c.pos.x, c.pos.y, c.pos.z].map((v) => +v.toFixed(2)).join(', '); }));
        if (!res.ok) {
          ok = false;
          why = `step ${n} (${s.type}${s.id ? ' ' + s.id : ''} on ${s.lv}): ${res.why} at ${res.at ? res.at.map((v) => v.toFixed(1)).join(', ') : '?'}`;
          break;
        }
      }
      const end = await page.evaluate(() => { const c = window.__h.c(); return [c.pos.x, c.pos.y, c.pos.z]; });
      const last = r.steps[r.steps.length - 1];
      const goal = last.type === 'walk' ? last.pts[last.pts.length - 1] : null;
      if (ok && goal && hyp(end[0] - goal[0], end[2] - goal[1]) > 1.0) {
        ok = false;
        why = `ended at (${end[0].toFixed(1)}, ${end[2].toFixed(1)}), not the route end (${goal[0]}, ${goal[1]})`;
      }
      console.log(`${ok ? 'PASS' : 'FAIL'} route ${r.id}${ok ? ` (${n} steps, ends at ${end.map((v) => v.toFixed(1)).join(', ')})` : ': ' + why}`);
      if (!ok) failed = true;
    }

    // floor surfaces in the engine: the corrugated roof reads metal, the felt roofs wood, the vent grating grate, the street concrete
    {
      const at = async (lv, x, z) => {
        await page.evaluate(([lv, x, z]) => window.__h.tp(lv, x, z, 0), [lv, x, z]);
        await page.evaluate(() => window.__h.step(30));
        return page.evaluate(() => window.__h.info().surface);
      };
      const sM = await at('U', 155, 23.5);
      const sW = await at('U', 40, 23.5);
      const vg = D.acoustic[0];
      const sG = await at('G', vg.emit[1], vg.emit[2]);
      const sC = await at('G', 40, 15);
      assert(sM === 'metal' && sW === 'wood' && sG === 'grate' && sC === 'concrete', `surfaces read metal / wood / grate / concrete (${sM} / ${sW} / ${sG} / ${sC})`);
    }

    // the debug menu: F3, Teleport, then every encounter, checkpoint and spawn puts the operator on a floor at that spot
    {
      await page.evaluate(() => { window.__app.loop.manual = false; });
      await page.keyboard.press('F3');
      await frames(page, 3);
      assert(await page.evaluate(() => !!document.querySelector('.debug-warp-btn')), 'the debug overlay has a Teleport button on this map');
      await page.evaluate(() => document.querySelector('.debug-warp-btn').click());
      const pts = await page.evaluate(() => window.__app.current.world.layout.debugPoints.map((p) => ({ group: p.group, label: p.label, x: p.pos.x, y: p.pos.y, z: p.pos.z })));
      const want = { Encounter: D.encounters.length, Checkpoint: D.checkpoints.length, Spawn: D.spawns.length };
      for (const [g, n] of Object.entries(want)) assert(pts.filter((p) => p.group === g).length === n, `${n} ${g} teleports (${pts.filter((p) => p.group === g).length})`);
      let bad = 0;
      for (const p of pts) {
        await page.evaluate((l) => [...document.querySelectorAll('[data-tp]')].find((e) => e.dataset.tp === l).click(), p.label);
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

    // rule 27 in the engine: the camera's two rays every 1 m along every walked leg, standing and crouched
    {
      let n = 0;
      let nB = 0;
      const hits = [];
      for (const r of D.routes.map(stepsOf)) {
        const ends = r.steps.filter((q) => q.type === 'link').flatMap((q) => {
          const L = linkById(q.id);
          return L ? [L.a, L.b] : [];
        });
        // the design's own sampling (map-dead-line-v2-analysis.mjs 11): every 1 m along the walked legs, facing the route heading from 2 m behind to 2 m ahead
        const walk = [];
        for (const sg of r.segs) {
          if (sg.link || sg.hold) {
            walk.push(null);
            continue;
          }
          const len = hyp(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]);
          for (let d = 0; d < len; d += 0.25) walk.push([sg.lv, sg.a[0] + ((sg.b[0] - sg.a[0]) * d) / len, sg.a[1] + ((sg.b[1] - sg.a[1]) * d) / len]);
        }
        const samples = [];
        for (let k = 0; k < walk.length; k += 4) {
          const p = walk[k];
          if (!p) continue;
          let a = k;
          let b = k;
          while (a > 0 && walk[a - 1] && walk[a - 1][0] === p[0] && k - a < 8) a--;
          while (b < walk.length - 1 && walk[b + 1] && walk[b + 1][0] === p[0] && b - k < 8) b++;
          const fx = walk[b][1] - walk[a][1];
          const fz = walk[b][2] - walk[a][2];
          if (hyp(fx, fz) < 1e-6) continue;
          const [lv, x, z] = p;
          if (ends.some((e) => e[0] === lv && hyp(e[1] - x, e[2] - z) < 1.5)) continue;
          samples.push([lv, x, z, fx, fz]);
        }
        const res = await page.evaluate((ss) => {
          const out = [];
          for (const [lv, x, z, fx, fz] of ss) for (const cr of [false, true]) out.push([lv, x, z, cr, window.__h.camHits(lv, x, z, fx, fz, cr)]);
          return out;
        }, samples);
        n += res.length;
        nB += res.filter((q) => q[0] === 'B').length;
        for (const [lv, x, z, cr, h] of res) if (h) hits.push(`${r.id} ${lv} (${x.toFixed(1)}, ${z.toFixed(1)}) ${cr ? 'crouched' : 'standing'} ${h}`);
      }
      console.log(`rule 27 (engine): ${n} camera tests (${nB} in the tunnel), ${hits.length} collisions`);
      for (const h of hits.slice(0, 40)) console.log('  hit ' + h);
      if (hits.length) fail(`rule 27: ${hits.length} camera collisions`);
    }
    const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
    assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await browser.close();
}
void BTN;

if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-dead-line-v2 OK');
