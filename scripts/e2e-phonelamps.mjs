// 3.6 Phase 1 Step 4: the phone light look draws the field. The lamps come from the baked light volume on the
// standard materials (no plain lamp lights), the ambient grid is the fill, the moon is baked, flashlights keep at most
// two plain lights, and the grade lifts black (readable darkness). A probe behind a wall from a lamp reads dark on the
// GPU (the volume's cell) as in the light field; a point in the lamp's view reads lit in both.
import { launch, frames, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PHONE = 'detect=1&platform=mobile&renderer=Apple%20GPU&gfx=user';
let failed = false;

async function boot(map) {
  const p = await launch({ url, params: `${PHONE}&autostart=${map}&mode=${map === 'warehouse' ? 'clear' : 'sandbox'}`, touch: false, viewport: { width: 640, height: 360 } });
  await p.page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 240000 });
  await frames(p.page, 12);
  return p;
}

try {
  const { browser, page, errors } = await boot('warehouse');
  const r = await page.evaluate(() => {
    const a = window.__app;
    const g = a.current;
    const w = g.world;
    const q = a.quality.level;
    const L = w.lamps;
    const level = w.level.meshes[0]?.material;
    const plugin = level?.pluginManager?.getPlugin?.('BakedLamps');
    const rig = w.lightRig;
    return {
      lite: !!q.lite,
      lamps: !!L,
      volume: !!L?.volume,
      fill: !!L?.fillTex,
      moon: !!L?.moonTex,
      levelMat: level?.getClassName(),
      plugin: !!plugin,
      hemi: w.hemi.intensity,
      pool: rig['pool'].length + rig['shadowPool'].length,
      floor: g.post.darkFloor,
      mixes: L?.volume?.mixes ?? 0,
    };
  });
  assert(r.lite && r.lamps && r.volume, `phone light look: the lamps from the light volume (${JSON.stringify(r)})`);
  assert(r.levelMat === 'StandardMaterial' && r.plugin, 'the volume is on the standard level material');
  assert(r.fill && r.moon && r.hemi === 0, 'the ambient grid is the fill (hemisphere off) and the moon is baked');
  assert(r.pool <= 2, `at most two plain lights, for the flashlights (${r.pool})`);
  assert(r.floor > 0, `readable darkness: the grade lifts black (${r.floor})`);
  assert(r.mixes >= 1, `the volume was mixed (${r.mixes})`);
  // probes: per lamp, a point it would light by the formula but a wall hides (the field's lamp part ~0), and one in
  // full view; the GPU volume's cell agrees
  const p = await page.evaluate(() => {
    const w = window.__app.current.world;
    const f = w.lightField;
    const B = w.lightBake.lamps;
    const L = B.baked.lights;
    const n = B.baked.ids.length;
    const lampSum = (x, y, z) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += f.lampAt(i, x, y, z);
      return s;
    };
    let dark = null;
    let lit = null;
    for (let i = 0; i < n && !(dark && lit); i++) {
      const lx = L[i * 10], ly = L[i * 10 + 1], lz = L[i * 10 + 2], r = L[i * 10 + 3];
      for (let dx = -r; dx <= r && !(dark && lit); dx += 0.6) {
        for (let dz = -r; dz <= r && !(dark && lit); dz += 0.6) {
          const x = lx + dx, z = lz + dz, y = 1.0;
          const d = Math.hypot(dx, y - ly, dz);
          if (d > r * 0.6 || d < 1) continue;
          const vis = f.visAt(i, x, y, z);
          const sum = lampSum(x, y, z);
          // (cells well inside the free space: a solid neighbour's value bleeds into a cell next to a wall)
          if (!dark && vis === 0 && sum === 0 && f.visAt(i, x + 0.4, y, z) === 0 && f.visAt(i, x - 0.4, y, z) === 0 && f.visAt(i, x, y, z + 0.4) === 0 && f.visAt(i, x, y, z - 0.4) === 0) dark = { i, x, y, z, sum };
          if (!lit && vis >= 0.99 && sum > 0.4) lit = { i, x, y, z, sum };
        }
      }
    }
    const read = (o) => (o ? { ...o, cell: w.lamps.volumeAt(o.x, o.y, o.z) } : null);
    return { dark: read(dark), lit: read(lit) };
  });
  console.log('  probes:', JSON.stringify(p));
  assert(p.dark && p.dark.cell, 'found a point behind a wall from a lamp, inside the volume');
  assert(p.dark.cell.a[0] + p.dark.cell.a[1] + p.dark.cell.a[2] <= 6, `behind the wall the volume reads dark (${p.dark.cell.a.slice(0, 3)}; the field's lamp light ${p.dark.sum.toFixed(3)})`);
  assert(p.lit && p.lit.cell && p.lit.cell.a[0] + p.lit.cell.a[1] + p.lit.cell.a[2] > 60, `in the lamp's view it reads lit (${p.lit?.cell?.a.slice(0, 3)}; field ${p.lit?.sum.toFixed(2)})`);
  const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc/i.test(e));
  assert(bad.length === 0, `warehouse: no console errors${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
} catch (e) {
  failed = true;
  console.error(String(e));
}

try {
  const { browser, page, errors } = await boot('proving');
  const r = await page.evaluate(() => ({ lite: !!window.__app.quality.level.lite, floor: window.__app.current.post.darkFloor }));
  assert(r.lite && r.floor > 0, 'Proving Grounds: the phone light look boots (no lamps there)');
  const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc/i.test(e));
  assert(bad.length === 0, `proving: no console errors${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
} catch (e) {
  failed = true;
  console.error(String(e));
}
if (failed) {
  console.log('FAILED');
  process.exit(1);
}
