// Kestrel B0 massing walk (`?autostart=kestrel&mode=sandbox`): the block plan as plain volumes. Checks, with the REAL player controller:
// the operator stands on the ground at meta.entry; every zone has a teleport that lands on its floor; a tour from the entry to every
// stair core, up to every level and the roof and back; the camera's two rays (rule 27) along that tour, standing and crouched; and
// the 03B critical path polyline at crouched gear 3 with its walking time.
//   node scripts/e2e-kestrel.mjs [url] [--verbose]
// Everything is read from docs/kestrel/kestrel.blocks.json through the same geometry module the map uses (src/world/maps/kestrelGeo.ts,
// compiled here with esbuild): no coordinate is typed in this file. The only constants are walking offsets and tolerances.
import fs from 'node:fs';
import { transformSync } from 'esbuild';
import { launch, frames } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const verbose = args.includes('--verbose');
const A = JSON.parse(fs.readFileSync(new URL('../docs/kestrel/kestrel.blocks.json', import.meta.url), 'utf8'));
const geoSrc = fs.readFileSync(new URL('../src/world/maps/kestrelGeo.ts', import.meta.url), 'utf8');
const geo = await import('data:text/javascript;base64,' + Buffer.from(transformSync(geoSrc, { loader: 'ts', format: 'esm' }).code).toString('base64'));
const Y = Object.fromEntries(A.levels.map((l) => [l.id, l.floor]));
let failed = false;
/** A check: logged, never thrown, so one failure does not hide the rest. */
const assert = (cond, msg) => {
  if (cond) console.log('  ok - ' + msg);
  else {
    failed = true;
    console.error('FAIL ' + msg);
  }
};

// ---- the plan as points -------------------------------------------------------------------------------------------------------------
const OFF = 0.8; // a step either side of an opening
const EDGE = 1.0; // "at the end of a room": this far in from its short edge
const YARD_OFF = 2.0; // clear of a building corner in the yard
const room = (id) => A.rooms.find((r) => r.id === id);
const opening = (id) => A.openings.find((o) => o.id === id);
const centre = (r) => [(r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2];
function openingAt(o) {
  const w = A.walls.find((q) => q.id === o.wall);
  const alongX = w.a[1] === w.b[1];
  const ai = alongX ? 0 : 1;
  const c = w.a[ai] + (w.b[ai] >= w.a[ai] ? 1 : -1) * o.at;
  return { x: alongX ? c : w.a[0], z: alongX ? w.a[1] : c, alongX, line: alongX ? w.a[1] : w.a[0], level: w.level };
}
/** Route builder: points {x, z, y, lv, hop} (hop: a crossing the block plan has no opening for follows this point). */
class Route {
  constructor() {
    this.p = [];
    this.lv = 'G';
    this.y = 0;
  }
  at(x, z, lv = this.lv, y = Y[lv]) {
    this.lv = lv;
    this.y = y;
    this.p.push({ x, z, y, lv, hop: false });
    return this;
  }
  /** Through opening `id`, coming from room `from`: a point either side (`b`, `a` off to skip), `hop` = no real opening (a P04 door). */
  thru(id, from, o = {}) {
    const op = id.startsWith('virtual:') ? o.virt : openingAt(opening(id));
    const fr = room(from);
    const c = centre(fr);
    const side = Math.sign((op.alongX ? c[1] : c[0]) - op.line) || 1;
    const pt = (k) => (op.alongX ? [op.x, op.line + side * k] : [op.line + side * k, op.z]);
    const lv = op.level ?? this.lv;
    if (o.hop) {
      // no opening: the run ends in front of the wall and the next one starts behind it
      this.at(...pt(OFF), lv);
      this.p[this.p.length - 1].hop = true;
      return this.at(...pt(-OFF), lv);
    }
    if (o.b !== false) this.at(...pt(OFF), lv);
    this.p.push({ x: op.x, z: op.z, y: Y[lv], lv, hop: false });
    if (o.a !== false) this.at(...pt(-OFF), lv);
    return this;
  }
  /** The lobby in front of a stair's foot (level `from`) or head (level `to`): a step back from the stair rect's start edge. */
  lobby(id, which) {
    const s = A.stairs.find((q) => q.id === id);
    const lay = geo.stairLayout(A, s);
    const f1 = lay.flights[0];
    const d = [Math.sin(f1.yaw), Math.cos(f1.yaw)];
    const q = which === 'foot' ? lay.foot : lay.head;
    return this.at(q[0] - d[0] * OFF, q[1] - d[1] * OFF, which === 'foot' ? s.from : s.to);
  }
  /** A flight sequence of stair `id`: up goes foot, landing, landing, head; down the reverse. */
  stair(id, dir) {
    const s = A.stairs.find((q) => q.id === id);
    const lay = geo.stairLayout(A, s);
    const f1 = lay.flights[0];
    const d = [Math.sin(f1.yaw), Math.cos(f1.yaw)];
    const y0 = Y[s.from];
    const rise = f1.rise;
    const foot = { x: lay.foot[0], z: lay.foot[1], y: y0, lv: s.from };
    let pts;
    if (lay.landing) {
      const f2 = lay.flights[1];
      const end = [f1.c[0] + (d[0] * f1.len) / 2 + d[0] * 0.5, f1.c[1] + (d[1] * f1.len) / 2 + d[1] * 0.5];
      const turn = [end[0] + (f2.c[0] - f1.c[0]), end[1] + (f2.c[1] - f1.c[1])];
      pts = [foot, { x: end[0], z: end[1], y: y0 + rise, lv: s.from }, { x: turn[0], z: turn[1], y: y0 + rise, lv: s.from }, { x: lay.head[0], z: lay.head[1], y: Y[s.to], lv: s.to }];
    } else pts = [foot, { x: lay.head[0], z: lay.head[1], y: Y[s.to], lv: s.to }];
    if (dir === 'down') pts.reverse();
    for (const q of pts) this.p.push({ ...q, hop: false });
    const last = pts[pts.length - 1];
    this.lv = last.lv;
    this.y = last.y;
    return this;
  }
}
/** The P04 doors the block plan leaves out (03B section 4): a point on the shared edge of two rooms. */
function virtualDoor(a, b) {
  const [A1, B1] = [room(a).rect, room(b).rect];
  const alongX = Math.abs(A1[3] - B1[1]) < 1e-9 || Math.abs(B1[3] - A1[1]) < 1e-9;
  if (alongX) {
    const z = Math.abs(A1[3] - B1[1]) < 1e-9 ? A1[3] : A1[1];
    const lo = Math.max(A1[0], B1[0]);
    const hi = Math.min(A1[2], B1[2]);
    return { alongX: true, x: (lo + hi) / 2, z, line: z, level: room(a).level };
  }
  const x = Math.abs(A1[2] - B1[0]) < 1e-9 ? A1[2] : A1[0];
  const lo = Math.max(A1[1], B1[1]);
  const hi = Math.min(A1[3], B1[3]);
  return { alongX: false, x, z: (lo + hi) / 2, line: x, level: room(a).level };
}

const entry = A.meta.entry;
const dock = openingAt(opening('D-DOCK'));
const fp = A.meta.footprint;

// the tour: entry, front door, main stair, fire stair 2 (down), main stair again, fire stair 1 to the roof and its ground landing, and back
const tour = new Route().at(entry[0], entry[1], 'G');
tour.thru('D-FRONT', 'X-Z1-YARD').thru('D-G20-Z2', 'G-Z2').thru('D-G20-MS', 'G20', { a: false }).stair('S-MAIN', 'up');
tour.thru('D-F-MS', 'F-MS', { b: false }).thru('D-F-FS2', 'F08', { a: false }).stair('S-FS2', 'down');
tour.thru('D-FS2-G', 'G-FS2', { b: false }).thru('D-G20-G22', 'G22').thru('D-G20-MS', 'G20', { a: false }).stair('S-MAIN', 'up');
tour.thru('D-F-MS', 'F-MS', { b: false }).thru('D-F-FS1', 'F08', { a: false }).stair('S-FS1R', 'up');
tour.thru('D-R-BULK', 'R-BULK', { b: false });
const rc = centre(room('R-PLANT-E'));
tour.at(rc[0], rc[1], 'R');
tour.thru('D-R-BULK', 'R-PLANT-E', { a: false }).stair('S-FS1R', 'down').lobby('S-FS1R', 'foot').lobby('S-FS1', 'head').stair('S-FS1', 'down').stair('S-FS1', 'up');
tour.lobby('S-FS1', 'head').thru('D-F-FS1', 'F-FS1', { b: false }).thru('D-F-MS', 'F08', { a: false }).stair('S-MAIN', 'down');
tour.thru('D-G20-MS', 'G-MS', { b: false }).thru('D-G20-Z2', 'G20').thru('D-FRONT', 'G-Z2').at(entry[0], entry[1], 'G');

// the 03B critical path (section 7), leg by leg; the block plan has two walls where P04 puts a door (goods lobby to goods, hall to meet-me): hops
const goodsHop = virtualDoor('G-Z2G', 'G-Z3G');
const meetHop = virtualDoor('G-Z4H', 'G-Z5');
const crit = new Route().at(entry[0], entry[1], 'G');
crit.at(fp[2] + YARD_OFF, fp[1] - YARD_OFF).at(fp[2] + YARD_OFF, dock.z);
crit.thru('D-DOCK', 'X-Z1-EAST').thru('virtual:goods', 'G-Z2G', { virt: goodsHop, hop: true }).thru('D-G20-GDS', 'G-Z3G').thru('D-G20-Z2', 'G20');
const g2 = room('G-Z2').rect;
crit.at(g2[2] - EDGE, centre(room('G-Z2'))[1]); // 1 keycard: G05 at the east end of G-Z2
crit.thru('D-G20-Z2', 'G-Z2', { b: false }).thru('D-G20-Z3P', 'G20');
crit.at(...centre(room('G-Z3P'))); // 2 to 3: G06
crit.thru('D-G20-Z3P', 'G-Z3P', { b: false }).thru('D-G20-MS', 'G20', { a: false }).stair('S-MAIN', 'up');
crit.thru('D-F-MS', 'F-MS', { b: false }).thru('D-F-O', 'F08');
crit.at(room('F-Z3O').rect[0] + EDGE, centre(room('F-Z3O'))[1]); // 3 to 4: the NOC at the west end of F-Z3O
crit.thru('D-F-O', 'F-Z3O', { b: false }).thru('D-F-MS', 'F08', { a: false }).stair('S-MAIN', 'down');
crit.thru('D-G20-MS', 'G-MS', { b: false }).thru('D-G20-MT', 'G20').thru('D-MT-G23', 'G-Z4M').thru('D-G23-H', 'G23'); // 4 to 5: the mantrap, G23, the hall arch
crit.thru('virtual:meet', 'G-Z4H', { virt: meetHop, hop: true });
crit.at(...centre(room('G-Z5'))); // 5 to 6: the tap
crit.thru('virtual:meet', 'G-Z5', { virt: meetHop, hop: true }).thru('D-X-H2', 'G-Z4H'); // 6 to 7: the hall's east fire exit, the strip, the east yard, the east gate
const strip = room('X-Z1-NORTH').rect;
crit.at(fp[2] + YARD_OFF, (strip[1] + strip[3]) / 2).at(opening('D-GATE-E') ? openingAt(opening('D-GATE-E')).x : 0, (strip[1] + strip[3]) / 2);
crit.thru('D-GATE-E', 'X-Z1-YARD');

// ---- route checks that need no browser -------------------------------------------------------------------------------------------------
const len3 = (p, q) => Math.sqrt((q.x - p.x) ** 2 + (q.z - p.z) ** 2 + (q.y - p.y) ** 2);
const planLen = (R) => R.p.reduce((a, p, i) => (i && !R.p[i - 1].hop ? a + Math.hypot(p.x - R.p[i - 1].x, p.z - R.p[i - 1].z) : a), 0);
const wallBoxes = A.walls.flatMap((w) => geo.wallBoxes(A, w).map((b) => ({ ...b, lv: w.level })));
/** Is a walkable point inside a wall box (the operator's body is 0.3 m radius: a point is enough for the polyline, the controller does the rest). */
function inWall(x, z, y, lv) {
  return wallBoxes.some((b) => b.lv === lv && Math.abs(x - b.c[0]) < b.s[0] / 2 && Math.abs(z - b.c[2]) < b.s[2] / 2 && y + 0.5 > b.c[1] - b.s[1] / 2 && y + 0.5 < b.c[1] + b.s[1] / 2);
}
function cleanRoute(R, name) {
  const bad = [];
  for (let i = 1; i < R.p.length; i++) {
    const a = R.p[i - 1];
    const b = R.p[i];
    if (a.hop) continue;
    const n = Math.ceil(len3(a, b) / 0.1);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const lv = t < 0.5 ? a.lv : b.lv;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      if (inWall(x, z, a.y + (b.y - a.y) * t, lv)) {
        bad.push(`${name} ${i} (${a.x.toFixed(1)}, ${a.z.toFixed(1)}) to (${b.x.toFixed(1)}, ${b.z.toFixed(1)}) in a wall at (${x.toFixed(2)}, ${z.toFixed(2)}) on ${lv}`);
        break;
      }
    }
  }
  return bad;
}
{
  const bad = [...cleanRoute(tour, 'tour'), ...cleanRoute(crit, 'critical')];
  for (const b of bad.slice(0, 10)) console.error('  ' + b);
  assert(bad.length === 0, `the tour and the critical path polylines stay out of every wall (${bad.length} legs cross one)`);
  const tl = planLen(crit);
  console.log(`critical path polyline: ${tl.toFixed(1)} m on the plan (03B section 7: 385.1 m), ${crit.p.filter((p) => p.hop).length} P04 hops`);
  assert(Math.abs(tl - 385.1) / 385.1 < 0.08, `the critical path polyline is within 8% of the 03B figure (${tl.toFixed(1)} m)`);
}

// ---- in the page -----------------------------------------------------------------------------------------------------------------------
const install = (page) =>
  page.evaluate((Yl) => {
    const H = {
      Y: Yl,
      g: () => window.__app.current,
      c: () => window.__app.current.player.controller,
      tp(x, y, z, yaw = 0) {
        const c = H.c();
        c.teleport(new c.pos.constructor(x, y + 0.05, z), yaw);
        H.g().player.cam.yaw = yaw;
      },
      step(n = 1) {
        for (let i = 0; i < n; i++) window.__app.loop.stepHeadless(1 / 60, 120);
      },
      stick(x, y) {
        window.__pad.axis(0, x);
        window.__pad.axis(1, -y);
      },
      info() {
        const c = H.c();
        return { x: c.pos.x, y: c.pos.y, z: c.pos.z, grounded: c.grounded, crouched: c.crouched, speed: c.speed };
      },
      /** Walk the polyline with the controller; returns { ok, why, at, steps }. */
      walk(pts, o = {}) {
        const c = H.c();
        const cam = H.g().player.cam;
        let steps = 0;
        for (let k = 0; k < pts.length; k++) {
          const [tx, tz] = pts[k];
          let still = 0;
          let last = [c.pos.x, c.pos.z];
          const lastPt = k === pts.length - 1;
          const tol = lastPt ? 0.45 : 0.55;
          for (let it = 0; it < 60 * 60; it++) {
            const dx = tx - c.pos.x;
            const dz = tz - c.pos.z;
            if (Math.hypot(dx, dz) < tol) break;
            cam.yaw = Math.atan2(dx, dz);
            H.stick(0, 1);
            H.step(1);
            steps++;
            if (it % 45 === 44) {
              still = Math.hypot(c.pos.x - last[0], c.pos.z - last[1]) < 0.15 ? still + 1 : 0;
              last = [c.pos.x, c.pos.z];
              if (still >= 3) {
                H.stick(0, 0);
                return { ok: false, why: `stuck walking to (${tx.toFixed(1)}, ${tz.toFixed(1)})`, at: [c.pos.x, c.pos.y, c.pos.z], steps };
              }
            }
          }
          if (Math.hypot(tx - c.pos.x, tz - c.pos.z) >= tol) {
            H.stick(0, 0);
            return { ok: false, why: `no progress to (${tx.toFixed(1)}, ${tz.toFixed(1)})`, at: [c.pos.x, c.pos.y, c.pos.z], steps };
          }
        }
        H.stick(0, 0);
        return { ok: true, steps };
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
    const rr = g.player.cam.rr;
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
    /** The shoulder camera's two rays (`shoulderCamera.ts`): pivot to the shoulder point, then the full boom back along the view (floor y = the surface under the operator). */
    H.camHits = (floorY, x, z, fx, fz, crouch) => {
      const C = { pivotStand: 1.62, pivotCrouch: 1.18, height: -0.08, shoulderHip: 0.62, boomHip: 2.2 };
      const l = Math.hypot(fx, fz) || 1;
      fx /= l;
      fz /= l;
      const rx = fz;
      const rz = -fx;
      const y = floorY + (crouch ? C.pivotCrouch : C.pivotStand);
      const sy = y + C.height;
      const sx = x + rx * C.shoulderHip;
      const sz = z + rz * C.shoulderHip;
      const pt = () => ` at (${rr.hitPoint.x.toFixed(2)}, ${rr.hitPoint.y.toFixed(2)}, ${rr.hitPoint.z.toFixed(2)})`;
      if (hit(x, y, z, sx, sy, sz)) return 'shoulder' + pt();
      if (hit(sx, sy, sz, sx - fx * C.boomHip, sy, sz - fz * C.boomHip)) return 'boom' + pt();
      return null;
    };
  });

/** Splits a route at its hops into runs; each run is a list of points. */
function runs(R) {
  const out = [[]];
  for (const p of R.p) {
    out[out.length - 1].push(p);
    if (p.hop) out.push([]);
  }
  return out.filter((r) => r.length);
}

/** Walks a route run by run (a hop is a teleport over the missing door); returns { ok, why, steps, hops }. A chunk ends where the level changes (a stair arrival): the floor under the operator is checked there. */
async function walkRoute(page, R, name) {
  let steps = 0;
  let hops = 0;
  const rs = runs(R);
  for (let r = 0; r < rs.length; r++) {
    const run = rs[r];
    let chunk = [];
    for (let i = 1; i < run.length; i++) {
      chunk.push(run[i]);
      if (run[i].lv === run[i - 1].lv && i < run.length - 1) continue;
      const last = run[i];
      const res = await page.evaluate((pts) => window.__h.walk(pts), chunk.map((p) => [p.x, p.z]));
      steps += res.steps;
      if (!res.ok) return { ok: false, why: `${name} run ${r} to (${last.x.toFixed(1)}, ${last.z.toFixed(1)}) on ${last.lv}: ${res.why} at ${res.at.map((v) => v.toFixed(1)).join(', ')}`, steps, hops };
      const y = await page.evaluate(() => window.__h.c().pos.y);
      if (Math.abs(y - last.y) > 0.7) return { ok: false, why: `${name} run ${r} reached (${last.x.toFixed(1)}, ${last.z.toFixed(1)}) at y ${y.toFixed(2)}, expected ${last.y.toFixed(2)} (${last.lv})`, steps, hops };
      chunk = [];
    }
    if (r < rs.length - 1) {
      // the hop: step through the wall to the point the route continues from
      const nxt = rs[r + 1][0];
      await page.evaluate(([x, y, z]) => window.__h.tp(x, y, z, 0), [nxt.x, nxt.y, nxt.z]);
      await page.evaluate(() => window.__h.step(20));
      hops++;
    }
  }
  return { ok: true, steps, hops };
}

// ---- run -------------------------------------------------------------------------------------------------------------------------------
{
  const { browser, page, errors } = await launch({ url, params: 'autostart=kestrel&mode=sandbox' });
  try {
    await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 120000 });
    await frames(page, 20);
    await page.evaluate(() => window.__pad.connect());
    await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
    await install(page);
    await camVerb(page);
    const boot = await page.evaluate(() => {
      const g = window.__app.current;
      const c = g.player.controller;
      return { map: g.world.map.id, mode: g.opts.mode, grounded: c.grounded, x: c.pos.x, y: c.pos.y, z: c.pos.z };
    });
    const dEntry = Math.hypot(boot.x - entry[0], boot.z - entry[1]);
    assert(boot.map === 'kestrel' && boot.mode === 'sandbox' && boot.grounded && Math.abs(boot.y - Y.G) < 0.3 && dEntry < 0.7, `autostart=kestrel loads the map and the operator stands on the ground ${dEntry.toFixed(2)} m from meta.entry (${JSON.stringify(boot)})`);

    // a teleport to every zone lands on its floor (a lift shaft, a hole on its only level, has none)
    {
      const pts = await page.evaluate(() => window.__app.current.world.layout.debugPoints.map((p) => ({ id: p.id, label: p.label, x: p.pos.x, y: p.pos.y, z: p.pos.z })));
      const shafts = A.rooms.filter((r) => A.voids.some((v) => v.level === r.level && v.rect[0] <= r.rect[0] && v.rect[1] <= r.rect[1] && v.rect[2] >= r.rect[2] && v.rect[3] >= r.rect[3]) && !A.stairs.some((s) => (s.from === r.level || s.to === r.level) && s.rect[0] < r.rect[2] && s.rect[2] > r.rect[0] && s.rect[1] < r.rect[3] && s.rect[3] > r.rect[1]));
      assert(pts.length === A.rooms.length - shafts.length && A.rooms.every((r) => shafts.some((q) => q.id === r.id) || pts.some((p) => p.id === r.id)), `a teleport for each of the ${A.rooms.length - shafts.length} zones (${shafts.map((s) => s.id).join(', ')} is a shaft): ${pts.length}`);
      let bad = 0;
      for (const p of pts) {
        await page.evaluate(([x, y, z]) => window.__h.tp(x, y, z, 0), [p.x, p.y, p.z]);
        await page.evaluate(() => window.__h.step(45));
        const at = await page.evaluate(() => window.__h.info());
        const near = Math.hypot(at.x - p.x, at.z - p.z) < 0.7 && Math.abs(at.y - p.y) < 0.8 && at.grounded;
        if (!near) {
          bad++;
          console.error(`  teleport ${p.label}: wanted (${p.x}, ${p.y}, ${p.z}) got (${at.x.toFixed(2)}, ${at.y.toFixed(2)}, ${at.z.toFixed(2)}) grounded ${at.grounded}`);
        }
      }
      assert(bad === 0, `every zone teleport (${pts.length}) lands on a floor at its spot (${bad} off)`);
    }

    // the tour with the real controller (standing, the spawn gear)
    {
      await page.evaluate(([x, y, z]) => window.__h.tp(x, y, z, 0), [entry[0], Y.G, entry[1]]);
      await page.evaluate(() => { window.__h.c().clearCrouchToggle(); window.__h.step(30); });
      const t0 = Date.now();
      const res = await walkRoute(page, tour, 'tour');
      const sim = res.steps / 60;
      console.log(`tour: ${(tour.p.length)} points, ${planLen(tour).toFixed(0)} m on the plan, ${sim.toFixed(0)} s of play, ${((Date.now() - t0) / 1000).toFixed(0)} s wall clock`);
      assert(res.ok, `the real controller walks the tour from the entry to every stair core, up to F and the roof and back${res.ok ? '' : ': ' + res.why}`);
      const end = await page.evaluate(() => window.__h.info());
      assert(Math.hypot(end.x - entry[0], end.z - entry[1]) < 1.0 && Math.abs(end.y - Y.G) < 0.7, `the tour ends back at the entry (${end.x.toFixed(1)}, ${end.z.toFixed(1)})`);
    }

    // rule 27 in the engine: the camera's two rays every 1 m along the tour, standing and crouched. Heading = the route from 2 m behind to 2 m ahead
    // (the design tools' own sampling), the surface under the operator interpolated along stair flights.
    {
      const dense = [];
      for (let i = 1; i < tour.p.length; i++) {
        const a = tour.p[i - 1];
        const b = tour.p[i];
        if (a.hop) continue;
        const L = len3(a, b);
        for (let d = 0; d < L; d += 0.25) dense.push({ y: a.y + ((b.y - a.y) * d) / L, x: a.x + ((b.x - a.x) * d) / L, z: a.z + ((b.z - a.z) * d) / L, seg: i });
      }
      const samples = [];
      for (let k = 0; k < dense.length; k += 4) {
        const p = dense[k];
        const lo = dense[Math.max(0, k - 8)];
        const hi = dense[Math.min(dense.length - 1, k + 8)];
        const fx = hi.x - lo.x;
        const fz = hi.z - lo.z;
        if (Math.hypot(fx, fz) < 0.3) continue;
        samples.push([p.y, p.x, p.z, fx, fz]);
      }
      const res = await page.evaluate((ss) => {
        const out = [];
        for (const [fy, x, z, fx, fz] of ss) for (const cr of [false, true]) out.push([fy, x, z, cr, window.__h.camHits(fy, x, z, fx, fz, cr)]);
        return out;
      }, samples);
      // places the block plan knows it cannot pass rule 27 until P04 draws real doors and stairs: the dog-leg cores, the spawn half a metre from the fence,
      // doors narrower than twice the shoulder offset (the 1.2 m fire doors), and openings within the A07 corner rule of a wall end (accepted by Michael until P04)
      const SHOULDER = 0.62;
      const CORNER = 1.5;
      const NEAR = 3;
      const wallLen = (w) => Math.abs(w.b[0] - w.a[0]) + Math.abs(w.b[1] - w.a[1]);
      const tight = A.openings.filter((o) => {
        const w = A.walls.find((q) => q.id === o.wall);
        return o.w < SHOULDER * 2 + 0.2 || o.at - o.w / 2 < CORNER || wallLen(w) - o.at - o.w / 2 < CORNER;
      });
      const tightAt = tight.map((o) => ({ id: o.id, ...openingAt(o) }));
      const known = (x, z, fy) => {
        if (A.stairs.some((q) => x > q.rect[0] - 0.5 && x < q.rect[2] + 0.5 && z > q.rect[1] - 0.5 && z < q.rect[3] + 0.5)) return 'stair core';
        if (Math.hypot(x - entry[0], z - entry[1]) < NEAR) return 'spawn by the fence';
        return tightAt.some((q) => Math.abs(Y[q.level] - fy) < 2.5 && Math.hypot(x - q.x, z - q.z) < NEAR) ? 'tight opening' : '';
      };
      const hits = res.filter((q) => q[4]).map(([fy, x, z, cr, h]) => ({ txt: `y ${fy.toFixed(1)} (${x.toFixed(1)}, ${z.toFixed(1)}) ${cr ? 'crouched' : 'standing'} ${h}`, why: known(x, z, fy) }));
      const open = hits.filter((h) => !h.why);
      const by = {};
      for (const h of hits) if (h.why) by[h.why] = (by[h.why] ?? 0) + 1;
      console.log(`rule 27 (engine): ${res.length} camera tests along the tour, ${hits.length} collisions: ${Object.entries(by).map(([k, v]) => `${v} at ${k}`).join(', ')}, ${open.length} elsewhere`);
      for (const h of open.slice(0, 40)) console.log('  hit ' + h.txt);
      if (verbose) for (const h of hits.filter((q) => q.why)) console.log(`  known (${h.why}) ${h.txt}`);
      console.log(`  tight openings (findings for P04): ${tight.map((o) => o.id).join(', ')}`);
      assert(open.length === 0, `camera rays along the tour: 0 collisions outside the known tight places (${open.length}); ${hits.length - open.length} inside them go to P04`);
    }

    // the 03B critical path at crouched gear 3
    {
      await page.evaluate(([x, y, z]) => window.__h.tp(x, y, z, 0), [entry[0], Y.G, entry[1]]);
      await page.evaluate(() => {
        const c = window.__h.c();
        c.setCrouchToggle();
        c.gears.gear = 3;
        window.__h.step(30);
      });
      const res = await walkRoute(page, crit, 'critical path');
      const sim = res.steps / 60;
      const info = await page.evaluate(() => window.__h.c().gears.gear + ' ' + window.__h.c().crouched);
      const speed = 1.3; // GEARS.crouch[2]
      const hopM = crit.p.reduce((a, p, i) => (p.hop && crit.p[i + 1] ? a + Math.hypot(crit.p[i + 1].x - p.x, crit.p[i + 1].z - p.z) : a), 0);
      console.log(`critical path at crouched gear 3 (${info}): ${res.steps ? sim.toFixed(0) : '?'} s walked + ${(hopM / speed).toFixed(1)} s over ${res.hops} missing P04 doors = ${(sim + hopM / speed).toFixed(0)} s (${((sim + hopM / speed) / 60).toFixed(1)} min); ${planLen(crit).toFixed(1)} m on the plan`);
      assert(res.ok, `the real controller walks the 03B critical path crouched at gear 3${res.ok ? '' : ': ' + res.why}`);
      if (verbose) console.log(JSON.stringify(res));
    }

    const errs = errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e));
    assert(errs.length === 0, `no console errors (${errs.slice(0, 3).join(' | ')})`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await browser.close();
}

if (failed) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-kestrel OK');
