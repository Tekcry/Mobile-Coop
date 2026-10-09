// 3.6 Phase 1 Step 4b: darkness is dark (bible 1.10 L5 / L7). On the Warehouse, a matte 50% grey card is placed at
// points whose static gameplay level is about 0.12, 0.27, 0.40 and 0.70, facing the strongest light there, with the
// camera 0.8 m in front of it; the final pixels (after tone mapping, grade and post) are read back as display luminance
// (Rec. 709 luma, 0..1) and checked against the targets - on the phone light look and at Epic, night vision off and on.
// Gameplay is untouched: the card's level is the light field's, which this step does not change.
import { launch, frames, assert, GPU } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const LOOKS = [
  { name: 'phone', params: 'detect=1&platform=mobile&renderer=Apple%20GPU&gfx=user&autostart=warehouse&mode=clear' },
  { name: 'epic', params: 'autostart=warehouse&mode=clear&gfx=epic&platform=desktop' },
].filter((l) => !process.env.LOOK || process.env.LOOK === l.name);
// (bible L5; `darkCurve.ts` DARK_TARGETS / VISION_TARGETS)
const TARGETS = [
  { level: 0.12, min: 0, max: 0.04 },
  { level: 0.27, min: 0, max: 0.09 },
  { level: 0.4, min: 0.12, max: 0.35 },
  { level: 0.7, min: 0.45, max: 1 },
];
const NV = [
  { level: 0.12, min: 0.25, max: 0.45 },
  { level: 0.7, min: 0.9, max: 1 },
];
let failed = false;

/** Find a probe point per target level, face it to its strongest light, and park the operator out of the way. */
async function findProbes(page) {
  return page.evaluate((levels) => {
    const g = window.__app.current;
    const w = g.world;
    const f = w.lightField;
    const nav = g.nav;
    const B = w.lightBake.lamps;
    const L = B ? B.baked.lights : new Float32Array(0);
    const n = B ? B.baked.ids.length : 0;
    const sun = w.map.theme.sunDir;
    const sl = Math.hypot(sun[0], sun[1], sun[2]);
    const moonDir = [-sun[0] / sl, -sun[1] / sl, -sun[2] / sl];
    const moonL = w.lightBake.moonLight;
    const bd = w.level.bounds;
    const walk = (x, z) => {
      const c = nav.cellOf(x, z, 0);
      return c >= 0 && nav.isWalkable(c) && Math.abs(nav.height[c]) < 0.3;
    };
    const chars = [g.player.position, ...(g.enemyMgr?.enemies ?? []).filter((e) => e.alive).map((e) => e.pos)];
    const far = (x, z) => chars.every((c) => Math.hypot(c.x - x, c.z - z) > 4);
    const y = 1.0;
    const out = [];
    for (const target of levels) {
      let best = null;
      for (let x = bd.minX + 1; x < bd.maxX - 1; x += 0.5) {
        for (let z = bd.minZ + 1; z < bd.maxZ - 1; z += 0.5) {
          if (!walk(x, z) || !far(x, z)) continue;
          const lv = f.levelAt(x, y, z);
          const err = Math.abs(lv - target);
          if (err > 0.03 || (best && err >= best.err)) continue;
          // a steady spot (the card is 0.3 m)
          let steady = true;
          for (const [dx, dz] of [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) if (Math.abs(f.levelAt(x + dx, y, z + dz) - lv) > 0.03) steady = false;
          if (!steady) continue;
          // the strongest light: a lamp, the moon, or none (the fill)
          let dir = null;
          let top = 0.02;
          for (let i = 0; i < n; i++) {
            const c = f.lampAt(i, x, y, z);
            if (c <= top) continue;
            const lx = L[i * 10] - x, ly = L[i * 10 + 1] - y, lz = L[i * 10 + 2] - z;
            const d = Math.hypot(lx, ly, lz);
            top = c;
            dir = [lx / d, ly / d, lz / d];
          }
          const moon = moonL * f.moonAt(x, y, z);
          if (moon > top) dir = moonDir;
          if (!dir) {
            for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) {
              const dx = Math.cos((a * Math.PI) / 4), dz = Math.sin((a * Math.PI) / 4);
              if (walk(x + dx * 0.8, z + dz * 0.8) && walk(x + dx * 0.4, z + dz * 0.4)) {
                dir = [dx, 0, dz];
                break;
              }
            }
            if (!dir) continue;
          }
          // the camera 0.8 m along it: in free space (walkable below it, under 2.2 m, in the light's view)
          const cx = x + dir[0] * 0.8, cy = y + dir[1] * 0.8, cz = z + dir[2] * 0.8;
          if (cy > 2.2 || !walk(cx, cz) || Math.abs(f.levelAt(cx, cy, cz) - lv) > 0.25) continue;
          best = { target, err, x, y, z, level: lv, dir, cam: [cx, cy, cz], light: moon > 0.02 && dir === moonDir ? 'moon' : top > 0.02 ? 'lamp' : 'fill' };
        }
      }
      out.push(best);
    }
    return out;
  }, TARGETS.map((t) => t.level));
}

/** Render the card at a probe and read the final pixels' display luminance (centre 10 x 10). */
async function measure(page, p, nv) {
  await page.evaluate(([p, nv]) => {
    const g = window.__app.current;
    const w = g.world;
    window.__probe?.dispose();
    window.__probe = w.addLightProbe(p.x, p.y, p.z, p.dir[0], p.dir[1], p.dir[2]);
    const cam = g.photoCamera();
    cam.position.set(p.cam[0], p.cam[1], p.cam[2]);
    cam.setTarget(window.__probe.position);
    if (w.lamps) w.lamps.visionGain = nv ? 8 : 1;
    g.post.setNightVision(nv ? 1 : 0);
  }, [p, nv]);
  // settle: the post stack (TAAU history, bloom) converges over wall-clock time, not frames: at 120 Hz 30 frames is a quarter second
  // (software GL took minutes for them). Read until three reads in a row agree within 0.5%, at least 30 frames, at most 8 s.
  // (software GL: a frame takes seconds, so 30 frames already outlast any convergence: one read, as before)
  // (a probe's card and a lamp's shadow maps use shaders the first time they are drawn here: a hardware driver compiles them for seconds
  // while the frames run on, and a read in that window is the unlit or half-lit card, never the converged one - wait until the scene is ready)
  for (let i = 0; i < 120 && !(await page.evaluate(() => window.__app.current.scene.isReady())); i++) await new Promise((r) => setTimeout(r, 250));
  await frames(page, 30);
  let last = await readLuma(page);
  let stable = GPU ? 0 : 3;
  for (let t0 = Date.now(); stable < 3 && Date.now() - t0 < 8000; ) {
    await frames(page, 10);
    const cur = await readLuma(page);
    stable = Math.abs(cur.luma - last.luma) < 0.005 ? stable + 1 : 0;
    last = cur;
  }
  return last;
}

async function readLuma(page) {
  // the final image as the screen shows it (the HUD hidden), centre 10 x 10, decoded in the page
  const vp = page.viewportSize();
  const png = await page.screenshot({ clip: { x: Math.floor(vp.width / 2) - 5, y: Math.floor(vp.height / 2) - 5, width: 10, height: 10 } });
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
    const c = new OffscreenCanvas(img.width, img.height);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, img.width, img.height).data;
    const n = img.width * img.height;
    let s = 0;
    for (let i = 0; i < n; i++) s += 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];
    return { luma: s / n / 255, rgb: [px[0], px[1], px[2]] };
  }, png.toString('base64'));
}

for (const look of LOOKS) {
  try {
    const { browser, page, errors } = await launch({ url, params: look.params, touch: false, viewport: { width: 640, height: 360 } });
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 240000 });
    await frames(page, 20);
    const info = await page.evaluate(() => {
      const w = window.__app.current.world;
      return { lamps: !!w.lamps, std: !!w.lamps?.standardLook, dark: w.lamps?.dark };
    });
    assert(info.lamps, `${look.name}: the baked lamps (and the darkness curve) are on (${JSON.stringify(info)})`);
    const probes = await findProbes(page);
    await page.evaluate((off) => {
      const g = window.__app.current;
      g.photoFreeze(true);
      document.body.classList.add('photo-mode');
      // (report only: the look before Step 4b - no curve, the old phone floor)
      if (off && g.world.lamps) {
        g.world.lamps.dark = { centre: 0.33, steep: 8, floor: 1, top: 1 };
        if (g.world.lamps.standardLook) g.post.setDarkFloor(0.045);
      }
      g.player.rig.setEnabled(false);
      for (const e of g.enemyMgr?.enemies ?? []) e.bodyRig?.setEnabled(false);
    }, !!process.env.DARK_OFF);
    const rows = [];
    for (let k = 0; k < TARGETS.length; k++) {
      const t = TARGETS[k];
      const p = probes[k];
      assert(p, `${look.name}: a probe point near level ${t.level}`);
      const off = await measure(page, p, false);
      const on = NV.find((v) => v.level === t.level) ? await measure(page, p, true) : null;
      rows.push({ t, p, off, on });
      console.log(`  ${look.name} level ${p.level.toFixed(3)} (${p.light}) at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}: ${(off.luma * 100).toFixed(1)}%${on ? `, night vision ${(on.luma * 100).toFixed(1)}%` : ''} rgb ${off.rgb}`);
    }
    if (process.env.REPORT) {
      console.log(JSON.stringify(rows));
    } else {
      for (const { t, p, off, on } of rows) {
        assert(off.luma >= t.min - 1e-3 && off.luma <= t.max + 1e-3, `${look.name}: level ${p.level.toFixed(2)} shows ${(off.luma * 100).toFixed(1)}% (target ${t.min * 100}-${t.max * 100}%)`);
        const v = NV.find((n) => n.level === t.level);
        if (v && on) assert(on.luma >= v.min - 1e-3 && on.luma <= v.max + 1e-3, `${look.name} night vision: level ${p.level.toFixed(2)} shows ${(on.luma * 100).toFixed(1)}% (target ${v.min * 100}-${v.max * 100}%)`);
      }
    }
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
      g.vision.set('off');
      return { moved, n, night: g.vision.night, bloom };
    });
    assert(mv.bloom.runs >= mv.n - 2 && mv.bloom.glow && mv.bloom.scale > 0, `${look.name}: night vision's bloom runs every frame (${JSON.stringify(mv.bloom)})`);
    assert(mv.night > 0.5 && mv.moved >= mv.n - 1, `${look.name}: turning in night vision, every frame reads as moving (${JSON.stringify(mv)})`);
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
