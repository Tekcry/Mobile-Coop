// 3.6 Phase 1 Step 4b: darkness is dark (bible 1.10 L5 / L7). (clean-up G2c) On the Test Chamber: the 0.12 card is found in its dark
// side room (the annex's dark bay and aisle), the 0.70 card in the lit main room; the thermal door check has one grunt in the dark
// bay. A matte 50% grey card is placed at points whose
// static gameplay level is about 0.12 and 0.70, facing the strongest light there, with the camera 0.8 m in front of it; the final
// pixels (after tone mapping, grade and post) are read back as display luminance and checked against the night-vision targets
// (Epic, night vision on), then the turning check and the thermal checks. (J11 A13) The night-vision-off grey cards moved to
// `e2e-parity.mjs` part 4 (every map, Low and Epic); the helpers live in `parity-lib.mjs`.
// Gameplay is untouched: the card's level is the light field's, which this step does not change.
import { launch, frames, assert } from './e2e-lib.mjs';
import { findCards, measure, pinLights, readRgb, unpinLights } from './parity-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const LOOKS = [
  { name: 'epic', params: 'autostart=chamber&mode=test&gfx=epic' },
].filter((l) => !process.env.LOOK || process.env.LOOK === l.name);
// (`darkCurve.ts` VISION_TARGETS)
const NV = [
  { level: 0.12, min: 0.1, max: 0.45 },
  { level: 0.7, min: 0.7, max: 1 },
];
let failed = false;

/**
 * (LR16-6, G100 / G102) Thermal. The vision button's cut is instant: the first frame drawn after the press is the new
 * mode (no 0.2 s flip). A guard standing behind a shut door shows as a dim blue silhouette over the leaf (the door's
 * centre on screen turns blue against the same view with the guard gone); the door opened, no silhouette (the body
 * itself shows). Render only: nothing here touches gameplay state but the guard's and the player's placement.
 */
async function thermalChecks(page, look) {
  const cut = await page.evaluate(() => new Promise((res) => {
    const g = window.__app.current;
    g.vision.set('off');
    g.vision.selected = 'thermal';
    requestAnimationFrame(() => {
      g.vision.toggle();
      const o = g.scene.onAfterRenderObservable.add(() => {
        g.scene.onAfterRenderObservable.remove(o);
        res({ kind: g.post.visionKind, mode: g.vision.mode });
      });
    });
  }));
  assert(cut.kind === 1 && cut.mode === 'thermal', `${look.name}: the vision button cuts to thermal on the first frame (G100) (${JSON.stringify(cut)})`);
  // shut hinged doors with walkable floor 1.2 m behind and 2.2 m in front (either side), nearest the map's middle first
  const cands = await page.evaluate(() => {
    const g = window.__app.current;
    const nav = g.nav;
    const out = [];
    for (const d of g.world.doors.list) {
      const a = d.anchor;
      if (d.open > 0 || a.leaf === 'slide' || a.locked) continue;
      const ex = Math.sin(a.yaw), ez = Math.cos(a.yaw);
      const mx = a.hinge.x + (ex * a.width) / 2, mz = a.hinge.z + (ez * a.width) / 2;
      const walk = (x, z) => {
        const c = nav.cellOf(x, z, a.hinge.y);
        return c >= 0 && nav.isWalkable(c) && Math.abs(nav.height[c] - a.hinge.y) < 0.3;
      };
      for (const s of [1, -1]) {
        const nx = ez * s, nz = -ex * s;
        if (walk(mx + nx * 1.2, mz + nz * 1.2) && walk(mx - nx * 2.2, mz - nz * 2.2) && walk(mx - nx * 1.2, mz - nz * 1.2)) {
          out.push({ i: d.index, mx, mz, y: a.hinge.y, nx, nz });
          break;
        }
      }
    }
    return out.slice(0, 6);
  });
  assert(cands.length > 0, `${look.name}: a shut hinged door with floor on both sides for the thermal check`);
  const place = (c, guardIn) => page.evaluate(([c, guardIn]) => {
    const g = window.__app.current;
    const p = g.player;
    const V = p.position.constructor;
    g.target.health.invulnerable = true;
    // the HUD hidden (the crosshair sits on the read square); the world keeps running
    document.body.classList.add('photo-mode');
    const bd = g.world.level.bounds;
    const es = (g.enemyMgr?.enemies ?? []).filter((e) => e.alive && !e.def.quadruped);
    es.forEach((e, k) => {
      // still, no brain: the interpolation keeps up with the placement
      e.update = () => e.prevPos.copyFrom(e.pos);
      if (k === 0 && guardIn) e.pos.set(c.mx + c.nx * 1.2, c.y, c.mz + c.nz * 1.2);
      else e.pos.set(bd.minX + 1 + k * 0.5, c.y - 40, bd.minZ + 1);
      e.prevPos.copyFrom(e.pos);
    });
    const yaw = Math.atan2(c.nx, c.nz);
    p.controller.teleport(new V(c.mx - c.nx * 2.2, c.y, c.mz - c.nz * 2.2), yaw);
    p.cam.yaw = yaw;
    p.cam.pitch = 0;
    return es.length;
  }, [c, guardIn]);
  const state = (i) => page.evaluate((i) => {
    const g = window.__app.current;
    return { ghosts: g.doorGhosts?.count ?? -1, kind: g.post.visionKind, open: g.world.doors.list[i]?.open };
  }, i);
  // (G2c) a door whose empty leaf reads dark enough: the lit main room's leaf is a brighter blue, so the silhouette's margin over it
  // is smaller (37,36,159 vs 49,46,121 at the chamber door); the annex doors (dark side) read as the Warehouse's did. Each door that
  // shows the silhouette is read, the first with the dim blue margin is the one checked (the last read stands if none has it)
  let hit = null;
  let chest = null;
  let ghost = null;
  let none = null;
  let st0 = null;
  for (const c of cands.slice().sort((a, b) => b.mx - a.mx)) {
    const n = await place(c, true);
    assert(n > 0, `${look.name}: a live guard for the thermal door check`);
    await frames(page, 30);
    const st = await state(c.i);
    if (st.ghosts !== 1) continue;
    // read at the guard's chest as projected on screen (the figure lies on his camera rays), not the screen centre (the
    // camera's pivot sits at head height, off to the shoulder side); the same pixels with him gone
    const ch = await page.evaluate(() => {
      const g = window.__app.current;
      const e = (g.enemyMgr?.enemies ?? []).find((x) => x.alive && !x.def.quadruped);
      const r = e.bodyRig;
      const h = r.hips.getAbsolutePosition();
      const n = r.neck.getAbsolutePosition();
      const V = h.constructor;
      const cam = g.player.cam.camera;
      const eng = g.scene.getEngine();
      const w = eng.getRenderWidth();
      const ht = eng.getRenderHeight();
      const M = cam.getTransformationMatrix();
      const s = V.Project(new V((h.x + n.x) / 2, (h.y + n.y) / 2, (h.z + n.z) / 2), M.constructor.Identity(), M, cam.viewport.toGlobal(w, ht));
      const rect = eng.getRenderingCanvas().getBoundingClientRect();
      return { x: rect.left + (s.x / w) * rect.width, y: rect.top + (s.y / ht) * rect.height };
    });
    const gh = await readRgb(page, 12, ch);
    await place(c, false);
    await frames(page, 30);
    const nn = await readRgb(page, 12, ch);
    hit = c;
    chest = ch;
    ghost = gh;
    none = nn;
    st0 = await state(c.i);
    if (gh[2] - nn[2] > 40 && gh[0] < 70 && gh[1] < 110) break;
  }
  assert(hit, `${look.name}: thermal shows a guard behind a shut door as a silhouette at one of ${cands.length} doors (G102)`);
  console.log(`  ${look.name} thermal at door ${hit.i}: silhouette rgb ${ghost}, guard gone rgb ${none} at chest px ${Math.round(chest.x)},${Math.round(chest.y)} (ghosts ${st0.ghosts})`);
  assert(st0.ghosts === 0, `${look.name}: no silhouette with the guard gone (${JSON.stringify(st0)})`);
  // dim blue, low on the ramp (CT): blue well over the empty door's, not the warm green / yellow of a body in the open
  assert(ghost[2] - none[2] > 40 && ghost[0] < 70 && ghost[1] < 110, `${look.name}: the silhouette reads dim blue over the leaf (${ghost} vs ${none})`);
  // the door opened: no silhouette (the body itself shows)
  await place(hit, true);
  await page.evaluate((i) => { const g = window.__app.current; g.world.doors.setOpen(g.world.doors.list[i], true); }, hit.i);
  await frames(page, 60);
  const st1 = await page.evaluate((i) => ({ ghosts: window.__app.current.doorGhosts?.count ?? -1, open: window.__app.current.world.doors.list[i].open }), hit.i);
  assert(st1.open > 0 && st1.ghosts === 0, `${look.name}: the door open, no silhouette (${JSON.stringify(st1)})`);
  // off: an instant cut back, nothing drawn
  const off = await page.evaluate(() => new Promise((res) => {
    const g = window.__app.current;
    requestAnimationFrame(() => {
      g.vision.toggle();
      const o = g.scene.onAfterRenderObservable.add(() => {
        g.scene.onAfterRenderObservable.remove(o);
        res({ kind: g.post.visionKind, mode: g.vision.mode, ghosts: g.doorGhosts?.count ?? -1 });
      });
    });
  }));
  await page.evaluate(() => document.body.classList.remove('photo-mode'));
  assert(off.kind === 0 && off.mode === 'off' && off.ghosts === 0, `${look.name}: the vision button cuts back to off on the first frame (${JSON.stringify(off)})`);
}

for (const look of LOOKS) {
  try {
    const { browser, page, errors } = await launch({ url, params: look.params, viewport: { width: 640, height: 360 } });
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 240000 });
    await frames(page, 20);
    const info = await page.evaluate(() => {
      const w = window.__app.current.world;
      return { lamps: !!w.lamps, dark: w.lamps?.dark };
    });
    assert(info.lamps, `${look.name}: the baked lamps (and the darkness curve) are on (${JSON.stringify(info)})`);
    // (A7) every moving light held still for the search and the reads; one card each for the 0.12 and 0.70 rows, whole bounds
    await pinLights(page);
    // (G2c) the 0.12 row in the dark side room (the zone's fill: x 29.5 and up, clear of the divider's ambient grid edge), the 0.70 row in the main room
    const probes = [
      ...(await findCards(page, { rect: [29.5, 0.5, 35.8, 13.5], rows: [NV[0].level], perRow: 1 })),
      ...(await findCards(page, { rect: [1, 1, 27, 27], rows: [NV[1].level], perRow: 1 })),
    ];
    await page.evaluate((off) => {
      const g = window.__app.current;
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      // (report only: the look before Step 4b - no curve)
      if (off && g.world.lamps) g.world.lamps.dark = { centre: 0.33, steep: 8, floor: 1, top: 1 };
      g.player.rig.setEnabled(false);
      for (const e of g.enemyMgr?.enemies ?? []) e.bodyRig?.setEnabled(false);
    }, !!process.env.DARK_OFF);
    // night vision on only (the night-vision-off cards are e2e-parity part 4)
    const rows = [];
    for (const v of NV) {
      const p = probes.find((c) => c.row === v.level);
      assert(p, `${look.name}: a probe point near level ${v.level}`);
      const on = await measure(page, p, true);
      rows.push({ v, p, on });
      console.log(`  ${look.name} level ${p.level.toFixed(3)} (${p.light}) at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: night vision ${(on.luma * 100).toFixed(1)}% rgb ${on.rgb}`);
    }
    if (process.env.REPORT) {
      console.log(JSON.stringify(rows));
    } else {
      for (const { v, p, on } of rows) assert(on.luma >= v.min - 1e-3 && on.luma <= v.max + 1e-3, `${look.name} night vision: level ${p.level.toFixed(2)} shows ${(on.luma * 100).toFixed(1)}% (target ${v.min * 100}-${v.max * 100}%)`);
    }
    await unpinLights(page);
    // (Step 4b fix) a moving camera reads as moving with night vision on: the glare must not read the camera's matrices
    // before the render, or TAA blends stale history (the smear Michael saw on desktop)
    const mv = await page.evaluate(async () => {
      const g = window.__app.current;
      g.photoFreeze(false);
      document.body.classList.remove('photo-mode');
      g.vision.set('night');
      const runs0 = g.nightBloom.runs;
      const cam = g.player.cam;
      let moved = 0, n = 0;
      await new Promise((res) => setTimeout(res, 400));
      const obs = g.scene.onAfterRenderObservable.add(() => {
        n++;
        if (g.scene.activeCamera?.hasMoved) moved++;
        cam.yaw += 0.02;
      });
      await new Promise((res) => {
        const o = g.scene.onAfterRenderObservable.add(() => {
          if (n >= 20) {
            g.scene.onAfterRenderObservable.remove(o);
            res();
          }
        });
      });
      g.scene.onAfterRenderObservable.remove(obs);
      const bloom = { runs: g.nightBloom.runs - runs0, glow: !!g.nightBloom.glow, scale: g.nightBloom.glowScale };
      const night = g.vision.night;
      g.vision.set('off');
      return { moved, n, night, bloom };
    });
    assert(mv.bloom.runs >= mv.n - 2 && mv.bloom.glow && mv.bloom.scale > 0, `${look.name}: night vision's bloom runs every frame (${JSON.stringify(mv.bloom)})`);
    assert(mv.night > 0.5 && mv.moved >= mv.n - 1, `${look.name}: turning in night vision, every frame reads as moving (${JSON.stringify(mv)})`);
    // (G2c) the thermal door check needs a guard: one grunt in the dark bay (test mode places none)
    const spawned = await page.evaluate(() => {
      const g = window.__app.current;
      const V = g.player.position.constructor;
      return !!g.enemyMgr?.spawn('grunt', new V(34, 0, 4), false, 0);
    });
    assert(spawned, `${look.name}: one grunt spawned in the dark bay`);
    await thermalChecks(page, look);
    // (the hardware driver warns about a program a disposed probe's material had in flight: Babylon polls it once more; e2e-desktop filters it too)
    const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc|glGetProgramiv: Program object expected/i.test(e));
    assert(bad.length === 0, `${look.name}: no console errors${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
    await browser.close();
  } catch (e) {
    failed = true;
    console.error(String(e));
  }
}
if (failed) {
  console.log('FAILED');
  process.exit(1);
}
