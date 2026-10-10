// Camera bounds (`?autostart=kestrel&mode=sandbox`): the shoulder camera never sits behind a wall, never shows another room through its near
// plane, stays inside a stair core while climbing it and between floor and ceiling in a low space, and frames the open yard as before.
// Every frame of each run checks, with the camera's own physics world:
//   - a ray from the operator's head to the camera hits nothing (the camera is on the head's side of every surface);
//   - rays from the camera to the four near-plane corners hit nothing (no surface cuts the near plane, so no room behind it shows);
//   - the camera is inside the run's bounds (corridor, stair core, low space), where the run has bounds.
//   node scripts/e2e-camera-bounds.mjs [url] [--verbose]
// Places come from the map's own block file (src/world/maps/kestrel.blocks.json, what the build uses) through kestrelGeo.ts, compiled
// here with esbuild: no map coordinate is typed in this file. The low-space run uses level U when the map has one, else a 1.5 m test box.
import fs from 'node:fs';
import { transformSync } from 'esbuild';
import { launch, frames } from './e2e-lib.mjs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const verbose = args.includes('--verbose');
const A = JSON.parse(fs.readFileSync(new URL('../src/world/maps/kestrel.blocks.json', import.meta.url), 'utf8'));
const esm = (p) => 'data:text/javascript;base64,' + Buffer.from(transformSync(fs.readFileSync(new URL(p, import.meta.url), 'utf8'), { loader: 'ts', format: 'esm' }).code).toString('base64');
const geo = await import(esm('../src/world/maps/kestrelGeo.ts'));
const Y = Object.fromEntries(A.levels.map((l) => [l.id, l.floor]));
let failed = false;
const assert = (cond, msg) => {
  if (cond) console.log('  ok - ' + msg);
  else {
    failed = true;
    console.error('FAIL ' + msg);
  }
};

// Yard framing before this change (measured on d31fbbc, the commit before "camera: respect walls and low spaces"): camera to the
// shoulder point and camera height above the feet, standing still, hip, right shoulder, settled, at these pitches.
const OLD_YARD = [
  { pitch: 0, dist: 2.128, height: 1.541 },
  { pitch: -0.35, dist: 2.128, height: 2.269 },
  { pitch: 0.35, dist: 2.128, height: 0.81 },
];
const YARD_TOL = 0.02;
const BOUND_TOL = 0.02; // a camera this close past a bound's inner face still counts as inside
const LOW_BOX = { len: 8, width: 3, clear: 1.5, slab: 0.3, wall: 0.3 }; // the stand-in low space when the map has no level U

const room = (id) => A.rooms.find((r) => r.id === id);
const rectLen = (r) => Math.max(r.rect[2] - r.rect[0], r.rect[3] - r.rect[1]);
const halfWall = Math.min(...A.walls.map((w) => w.t)) / 2;

// ---- in the page -----------------------------------------------------------------------------------------------------------------------
const install = (page) =>
  page.evaluate(() => {
    const H = {
      g: () => window.__app.current,
      c: () => window.__app.current.player.controller,
      onStep: null,
      tp(x, y, z, yaw = 0) {
        const c = H.c();
        c.teleport(new c.pos.constructor(x, y + 0.05, z), yaw);
        H.g().player.cam.yaw = yaw;
        H.g().player.cam.pitch = 0;
        H.g().player.cam.snap();
      },
      step(n = 1) {
        for (let i = 0; i < n; i++) {
          window.__app.loop.stepHeadless(1 / 60, 120);
          if (H.onStep) H.onStep();
        }
      },
      stick(x, y) {
        window.__pad.axis(0, x);
        window.__pad.axis(1, -y);
      },
      walk(pts) {
        const c = H.c();
        const cam = H.g().player.cam;
        for (const [tx, tz] of pts) {
          let still = 0;
          let last = [c.pos.x, c.pos.z];
          for (let it = 0; it < 60 * 40; it++) {
            const dx = tx - c.pos.x;
            const dz = tz - c.pos.z;
            if (Math.hypot(dx, dz) < 0.5) break;
            cam.yaw = Math.atan2(dx, dz);
            H.stick(0, 1);
            H.step(1);
            if (it % 45 === 44) {
              still = Math.hypot(c.pos.x - last[0], c.pos.z - last[1]) < 0.15 ? still + 1 : 0;
              last = [c.pos.x, c.pos.z];
              if (still >= 3) {
                H.stick(0, 0);
                return `stuck walking to (${tx.toFixed(1)}, ${tz.toFixed(1)}) at (${c.pos.x.toFixed(1)}, ${c.pos.y.toFixed(1)}, ${c.pos.z.toFixed(1)})`;
              }
            }
          }
        }
        H.stick(0, 0);
        return null;
      },
    };
    const g = H.g();
    const eng = g.scene.getPhysicsEngine();
    const V = H.c().pos.constructor;
    const rr = g.player.cam.rr;
    const q = { membership: 2, collideWith: 1 }; // G.PLAYER against G.STATIC, as the camera
    const a = new V();
    const b = new V();
    const head = new V();
    const HEAD_STAND = 1.6; // standHeight 1.75 less a hand
    const HEAD_CROUCH = 1.0; // crouchHeight 1.15 less a hand
    const hitRay = (p0, p1) => {
      rr.reset();
      eng.raycastToRef(p0, p1, rr, q);
      return rr.hasHit;
    };
    /** One frame's check: '' or the first fault. `bounds`: {minX, maxX, minZ, maxZ, minY, maxY} (any may be missing). */
    H.check = (bounds) => {
      const cam = g.player.cam;
      const p = cam.camera.position;
      // the head: on the capsule's axis, a hand under the top of the standing or crouched capsule (always in the operator's own space)
      const c = H.c();
      head.set(c.renderPos.x, c.renderPos.y + HEAD_STAND + (HEAD_CROUCH - HEAD_STAND) * c.crouchBlend, c.renderPos.z);
      const at = () => ` cam (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}) head (${head.x.toFixed(2)}, ${head.y.toFixed(2)}, ${head.z.toFixed(2)})`;
      if (hitRay(head, p)) return `behind a surface (head-to-camera ray hits at ${rr.hitPoint.x.toFixed(2)}, ${rr.hitPoint.y.toFixed(2)}, ${rr.hitPoint.z.toFixed(2)})` + at();
      // near plane corners
      const n = cam.camera.minZ;
      const hh = n * Math.tan(cam.camera.fov / 2);
      const hw = hh * g.scene.getEngine().getAspectRatio(cam.camera);
      const yaw = cam.camera.rotation.y;
      const f = cam.forward;
      const rx = Math.cos(yaw);
      const rz = -Math.sin(yaw);
      // up = forward x right
      const ux = f.y * rz;
      const uy = f.z * rx - f.x * rz;
      const uz = -f.y * rx;
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        b.set(p.x + f.x * n + rx * hw * sx + ux * hh * sy, p.y + f.y * n + uy * hh * sy, p.z + f.z * n + rz * hw * sx + uz * hh * sy);
        a.copyFrom(p);
        if (hitRay(a, b)) return `near plane cut by a surface (corner ${sx},${sy})` + at();
      }
      if (bounds) {
        const t = 0.02;
        if (bounds.minX !== undefined && (p.x < bounds.minX - t || p.x > bounds.maxX + t || p.z < bounds.minZ - t || p.z > bounds.maxZ + t)) {
          // outside in plan is allowed only where the line from the head leaves the space through one of its openings (`gaps`)
          const through = (bounds.gaps ?? []).some((q) => {
            const h0 = q.alongX ? head.z : head.x;
            const h1 = q.alongX ? p.z : p.x;
            if ((h0 - q.line) * (h1 - q.line) > 0) return false;
            const k = (q.line - h0) / (h1 - h0 || 1e-9);
            const u = q.alongX ? head.x + (p.x - head.x) * k : head.z + (p.z - head.z) * k;
            const y = head.y + (p.y - head.y) * k;
            return u > q.lo && u < q.hi && y > q.y0 && y < q.y1;
          });
          if (!through) return 'outside the space in plan, not through an opening' + at();
        }
        if (bounds.minY !== undefined && p.y < bounds.minY - t) return `below the floor bound ${bounds.minY.toFixed(2)}` + at();
        if (bounds.maxY !== undefined && p.y > bounds.maxY + t) return `above the ceiling bound ${bounds.maxY.toFixed(2)}` + at();
      }
      return '';
    };
    /** Counts every frame checked while `active()` holds; keeps the first few faults. */
    H.watch = (bounds, active = () => true) => {
      const w = { frames: 0, bad: 0, first: [], minClear: Infinity };
      H.onStep = () => {
        if (!active()) return;
        w.frames++;
        const r = H.check(typeof bounds === 'function' ? bounds() : bounds);
        if (r) {
          w.bad++;
          if (w.first.length < 4) w.first.push(r);
        }
      };
      H.watched = w;
      return w;
    };
    H.unwatch = () => {
      H.onStep = null;
      return H.watched;
    };
    window.__h = H;
    window.__app.loop.manual = true;
    g.target.health.invulnerable = true;
  });

/** A 360 degree turn on the spot in `frames` steps with the pitch swinging up and down; returns the watch result. */
const turn = (page, yaw0, bounds, frames = 180) =>
  page.evaluate(
    ([y0, bd, n]) => {
      const H = window.__h;
      const cam = H.g().player.cam;
      H.watch(bd);
      for (let i = 0; i <= n; i++) {
        cam.yaw = y0 + (2 * Math.PI * i) / n;
        cam.pitch = 0.45 * Math.sin((4 * Math.PI * i) / n);
        H.step(1);
      }
      cam.pitch = 0;
      return H.unwatch();
    },
    [yaw0, bounds, frames],
  );
const report = (name, w) => {
  console.log(`${name}: ${w.frames} frames, ${w.bad} bad`);
  for (const f of w.first) console.log('    ' + f);
  return w.bad === 0 && w.frames > 0;
};

// ---- run -------------------------------------------------------------------------------------------------------------------------------
{
  const { browser, page, errors } = await launch({ url, params: 'autostart=kestrel&mode=sandbox' });
  try {
    await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 120000 });
    await frames(page, 20);
    await page.evaluate(() => window.__pad.connect());
    await page.evaluate(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
    await install(page);

    // 1. corridor: hugging each long wall of the longest ground-floor corridor, facing along it, turning through 360 degrees, each shoulder
    {
      const cor = A.rooms.filter((r) => r.kind === 'corridor' && r.level === 'G').sort((p, q) => rectLen(q) - rectLen(p))[0];
      const [x0, z0, x1, z1] = cor.rect;
      const alongX = x1 - x0 >= z1 - z0;
      const inset = halfWall + BOUND_TOL;
      const bounds = { minX: x0 + inset, maxX: x1 - inset, minZ: z0 + inset, maxZ: z1 - inset };
      let all = true;
      for (const side of [-1, 1])
        for (const sh of [1, -1]) {
          const mid = alongX ? (x0 + x1) / 2 : (z0 + z1) / 2;
          const wallLine = alongX ? (side < 0 ? z0 : z1) : side < 0 ? x0 : x1;
          const off = wallLine - side * (halfWall + 0.6);
          const [px, pz] = alongX ? [mid, off] : [off, mid];
          const toWall = alongX ? (side < 0 ? Math.PI : 0) : side < 0 ? -Math.PI / 2 : Math.PI / 2;
          const along = alongX ? Math.PI / 2 : 0;
          const w = await page.evaluate(
            ([px, pz, y, toWall, sh]) => {
              const H = window.__h;
              H.tp(px, y, pz, toWall);
              H.g().player.cam.shoulder = sh;
              H.step(30);
              // press into the wall
              H.stick(0, 1);
              H.step(40);
              H.stick(0, 0);
              H.step(20);
              const c = H.c();
              return [c.pos.x, c.pos.z];
            },
            [px, pz, Y.G, toWall, sh],
          );
          const res = await turn(page, along, bounds);
          const ok = report(`  ${cor.id} against the ${side < 0 ? 'low' : 'high'} wall at (${w[0].toFixed(2)}, ${w[1].toFixed(2)}), ${sh > 0 ? 'right' : 'left'} shoulder`, res);
          all &&= ok;
        }
      assert(all, `corridor ${cor.id}: hugging both walls and turning 360 degrees on each shoulder, the camera never sits behind a wall, cuts one with its near plane or leaves the corridor`);
      await page.evaluate(() => (window.__h.g().player.cam.shoulder = 1));
    }

    // 2. stair cores: walking up each stair, from the first step to the head, the camera stays inside the core
    for (const s of A.stairs) {
      const lay = geo.stairLayout(A, s);
      const f1 = lay.flights[0];
      const d = [Math.sin(f1.yaw), Math.cos(f1.yaw)];
      const cx = (s.rect[0] + s.rect[2]) / 2;
      const cz = (s.rect[1] + s.rect[3]) / 2;
      const core = A.rooms.find((r) => r.level === s.from && r.rect[0] <= cx && r.rect[2] >= cx && r.rect[1] <= cz && r.rect[3] >= cz);
      const inset = halfWall - BOUND_TOL;
      // the core's openings (a flight that starts at the core wall looks back through its door)
      const gaps = [];
      for (const o of A.openings) {
        const w = A.walls.find((q) => q.id === o.wall);
        if (!w || (w.level !== s.from && w.level !== s.to)) continue;
        const alongX = w.a[1] === w.b[1];
        const line = alongX ? w.a[1] : w.a[0];
        const onEdge = alongX ? line === core.rect[1] || line === core.rect[3] : line === core.rect[0] || line === core.rect[2];
        if (!onEdge) continue;
        const ai = alongX ? 0 : 1;
        const c = w.a[ai] + (w.b[ai] >= w.a[ai] ? 1 : -1) * o.at;
        const lv = A.levels.find((l) => l.id === w.level);
        gaps.push({ alongX, line, lo: c - o.w / 2, hi: c + o.w / 2, y0: lv.floor + (o.sill ?? 0), y1: lv.floor + (o.sill ?? 0) + (o.h ?? w.h) });
      }
      const bounds = { minX: core.rect[0] + inset, maxX: core.rect[2] - inset, minZ: core.rect[1] + inset, maxZ: core.rect[3] - inset, gaps };
      const pts = [];
      if (lay.landing) {
        const f2 = lay.flights[1];
        const end = [f1.c[0] + (d[0] * f1.len) / 2 + d[0] * 0.5, f1.c[1] + (d[1] * f1.len) / 2 + d[1] * 0.5];
        pts.push(end, [end[0] + (f2.c[0] - f1.c[0]), end[1] + (f2.c[1] - f1.c[1])]);
      }
      pts.push(lay.head);
      // start on the first step (the flight's foot edge is on the core wall line for some stairs)
      const start = [lay.foot[0] + d[0] * 0.4, lay.foot[1] + d[1] * 0.4];
      const lo = Y[s.from] + 0.2;
      const hi = Y[s.to] - 0.2;
      const res = await page.evaluate(
        ([start, y0, yaw, pts, bounds, lo, hi]) => {
          const H = window.__h;
          H.tp(start[0], y0, start[1], yaw);
          H.step(30);
          const c = H.c();
          H.watch(bounds, () => c.pos.y > lo && c.pos.y < hi);
          const why = H.walk(pts);
          const w = H.unwatch();
          w.why = why;
          return w;
        },
        [start, Y[s.from], f1.yaw, pts, bounds, lo, hi],
      );
      const ok = report(`  ${s.id} (${s.from} to ${s.to}) in ${core.id}`, res);
      assert(!res.why, `${s.id}: the operator walks up the stair${res.why ? ': ' + res.why : ''}`);
      assert(ok, `${s.id}: walking up, the camera stays inside the core ${core.id} and never behind or through a wall`);
    }

    // 3. a low space: level U if the map has it, else a 1.5 m test box in the yard
    {
      const yard = A.rooms.filter((r) => r.level === 'G' && /yard/i.test(r.name)).sort((p, q) => (q.rect[2] - q.rect[0]) * (q.rect[3] - q.rect[1]) - (p.rect[2] - p.rect[0]) * (p.rect[3] - p.rect[1]))[0];
      const uLevel = A.levels.find((l) => l.id === 'U');
      let space;
      if (uLevel) {
        const r = A.rooms.filter((q) => q.level === 'U').sort((p, q) => rectLen(q) - rectLen(p))[0];
        const above = A.levels.filter((l) => l.floor > uLevel.floor).sort((p, q) => p.floor - q.floor)[0];
        const ceil = r.ceiling !== undefined ? uLevel.floor + r.ceiling : above.floor - geo.SLAB;
        space = { name: `level U (${r.id})`, rect: r.rect, floor: uLevel.floor, ceil };
      } else {
        console.log('level U not built yet, rerun after B0');
        const cx = (yard.rect[0] + yard.rect[2]) / 2;
        const cz = (yard.rect[1] + yard.rect[3]) / 2;
        const B = LOW_BOX;
        const rect = [cx - B.len / 2, cz - B.width / 2, cx + B.len / 2, cz + B.width / 2];
        await page.evaluate(
          ([rect, y, B]) => {
            const g = window.__h.g();
            const scene = g.scene;
            const nodes = [...scene.transformNodes, ...scene.meshes];
            const lvl = nodes.find((n) => n.physicsBody && n.physicsBody.shape);
            const Body = lvl.physicsBody.constructor;
            const Shape = Object.getPrototypeOf(lvl.physicsBody.shape.constructor);
            const V = g.player.controller.pos.constructor;
            const box = (cx, cy, cz, sx, sy, sz) => {
              const node = new lvl.constructor('cam-lowbox', scene);
              const shape = new Shape({ type: 3, parameters: { center: new V(cx, cy, cz), extents: new V(sx, sy, sz) } }, scene);
              shape.filterMembershipMask = 1;
              shape.filterCollideMask = ~1;
              const body = new Body(node, 0, false, scene);
              body.shape = shape;
            };
            const [x0, z0, x1, z1] = rect;
            const mx = (x0 + x1) / 2;
            box(mx, y + B.clear + B.slab / 2, (z0 + z1) / 2, x1 - x0, B.slab, z1 - z0 + 2 * B.wall);
            box(mx, y + B.clear / 2, z0 - B.wall / 2, x1 - x0, B.clear, B.wall);
            box(mx, y + B.clear / 2, z1 + B.wall / 2, x1 - x0, B.clear, B.wall);
          },
          [rect, Y.G, B],
        );
        space = { name: 'test box 1.5 m', rect, floor: Y.G, ceil: Y.G + B.clear };
      }
      const [x0, z0, x1, z1] = space.rect;
      const alongX = x1 - x0 >= z1 - z0;
      const bounds = { minY: space.floor + 0.05, maxY: space.ceil - 0.05 };
      const mid = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
      const a = alongX ? [x0 + 1, mid] : [mid, z0 + 1];
      const b = alongX ? [x1 - 1, mid] : [mid, z1 - 1];
      const res = await page.evaluate(
        ([a, b, y, bounds, rect]) => {
          const H = window.__h;
          const c = H.c();
          const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
          // crouch outside the low space, then enter
          H.tp(a[0] - Math.sin(yaw) * 1.5, y, a[1] - Math.cos(yaw) * 1.5, yaw);
          c.setCrouchToggle();
          H.step(10);
          c.gears.gear = 3;
          H.step(30);
          const inside = () => c.pos.x > rect[0] && c.pos.x < rect[2] && c.pos.z > rect[1] && c.pos.z < rect[3];
          H.watch(bounds, inside);
          let why = H.walk([a, b]);
          // turn at the far end and walk back, then turn on the spot in the middle
          const cam = H.g().player.cam;
          for (let i = 0; i <= 120; i++) {
            cam.yaw = yaw + (2 * Math.PI * i) / 120;
            cam.pitch = 0.5 * Math.sin((4 * Math.PI * i) / 120);
            H.step(1);
          }
          cam.pitch = 0;
          why ??= H.walk([[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]]);
          for (let i = 0; i <= 120; i++) {
            cam.yaw = yaw + (2 * Math.PI * i) / 120;
            cam.pitch = -0.6 * Math.sin((2 * Math.PI * i) / 120);
            H.step(1);
          }
          cam.pitch = 0;
          const w = H.unwatch();
          w.why = why;
          w.crouched = c.crouched;
          return w;
        },
        [a, b, space.floor, bounds, space.rect],
      );
      const ok = report(`  ${space.name}, floor ${space.floor.toFixed(2)}, ceiling ${space.ceil.toFixed(2)}`, res);
      assert(!res.why && res.crouched, `${space.name}: the operator crawls its length crouched${res.why ? ': ' + res.why : ''}`);
      assert(ok, `${space.name}: crouched, walking its length and turning, the camera stays between floor and ceiling every frame and never behind or through a surface`);
      await page.evaluate(() => {
        window.__h.c().clearCrouchToggle();
        window.__h.step(30);
      });
    }

    // 4. the open yard: framing distance and height as before this change (within 2%)
    {
      const yard = A.rooms.filter((r) => r.level === 'G' && /yard/i.test(r.name)).sort((p, q) => (q.rect[2] - q.rect[0]) * (q.rect[3] - q.rect[1]) - (p.rect[2] - p.rect[0]) * (p.rect[3] - p.rect[1]))[0];
      // a third of the way along the yard, clear of the test box in its middle
      const px = yard.rect[0] + (yard.rect[2] - yard.rect[0]) / 3;
      const pz = (yard.rect[1] + yard.rect[3]) / 2;
      const rows = await page.evaluate(
        ([px, y, pz, pitches]) => {
          const H = window.__h;
          const out = [];
          for (const pitch of pitches)
            for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
              H.tp(px, y, pz, yaw);
              const cam = H.g().player.cam;
              cam.pitch = pitch;
              H.step(240);
              const p = cam.camera.position;
              const s = cam.shoulderPt;
              out.push({ pitch, yaw, dist: Math.hypot(p.x - s.x, p.y - s.y, p.z - s.z), height: p.y - H.c().renderPos.y, boom: cam.boomActual });
            }
          H.g().player.cam.pitch = 0;
          return out;
        },
        [px, Y.G, pz, OLD_YARD.map((o) => o.pitch)],
      );
      let worst = 0;
      for (const r of rows) {
        const ref = OLD_YARD.find((o) => o.pitch === r.pitch);
        const e = Math.max(Math.abs(r.dist - ref.dist) / ref.dist, Math.abs(r.height - ref.height) / ref.height);
        worst = Math.max(worst, e);
        if (verbose || e > YARD_TOL) console.log(`    pitch ${r.pitch} yaw ${r.yaw.toFixed(2)}: distance ${r.dist.toFixed(3)} (old ${ref.dist}), height ${r.height.toFixed(3)} (old ${ref.height})`);
      }
      console.log(`  yard: ${rows.length} poses, worst difference ${(worst * 100).toFixed(2)}% ` + rows.slice(0, 3).map((r) => `[pitch ${r.pitch}: ${r.dist.toFixed(3)} m, ${r.height.toFixed(3)} m]`).join(' '));
      assert(worst <= YARD_TOL, `open yard: camera distance and height within 2% of the old framing (worst ${(worst * 100).toFixed(2)}%)`);
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
console.log('e2e-camera-bounds OK');
