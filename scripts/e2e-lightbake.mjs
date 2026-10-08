// 3.6 Phase 1 Step 1: the canonical light bake is the same on every device. The Warehouse under `?gfx=min`, the phone
// look, `?gfx=low` and `?gfx=epic` bakes the same shapes and gives the same lamp / moon / ambient bytes (cache keys
// and a content hash), and every config baked something (a phone no longer skips the bake).
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const CONFIGS = [
  ['gfx=min', 'gfx=min&platform=desktop'],
  ['phone look', 'detect=1&platform=mobile&renderer=Apple%20GPU&gfx=user'],
  ['gfx=low', 'gfx=low&platform=desktop'],
  ['gfx=epic', 'gfx=epic&platform=desktop'],
];
let failed = false;
const infos = [];
for (const [name, q] of CONFIGS) {
  const { browser, page, errors } = await launch({ url, params: `${q}&autostart=warehouse&mode=clear`, touch: false, viewport: { width: 640, height: 360 } });
  try {
    await page.waitForFunction(() => !!window.__app?.current?.world, null, { timeout: 240000 });
    const info = await page.evaluate(() => {
      const w = window.__app.current.world;
      const q = window.__app.quality.level;
      return { ...w.lightInfo(), lite: !!q.lite, minimal: !!q.minimal, voxels: !!w.voxels, lamps: !!w.lamps };
    });
    infos.push([name, info]);
    console.log(`  ${name}: shapes ${info.shapes} hash ${info.hash} lamps ${info.lights} (${(info.lampBytes / 1e6).toFixed(1)} MB) moon ${info.moonCells} cells, bake ${Math.round(info.ms)} ms, voxels ${info.voxels}, baked lamps drawn ${info.lamps}`);
    const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc/i.test(e));
    assert(bad.length === 0, `${name}: no console errors${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
  } catch (e) {
    failed = true;
    console.error(`${name}: ${String(e)}`);
  }
  await browser.close();
}
try {
  assert(infos.length === CONFIGS.length, 'every config booted the Warehouse');
  const ref = infos[0][1];
  assert(ref.lights > 0 && ref.lampBytes > 0 && ref.moonCells > 0 && !!ref.hash, `the bake is not empty (${ref.lights} lamps, ${ref.lampBytes} bytes, ${ref.moonCells} moon cells)`);
  for (const [name, i] of infos) {
    assert(i.shapes === ref.shapes, `${name}: the canonical shapes are the same (${i.shapes})`);
    assert(i.lampKey === ref.lampKey && i.moonKey === ref.moonKey, `${name}: the lamp and moon bake keys are the same`);
    assert(i.hash === ref.hash, `${name}: the visibility data hash is the same (${i.hash})`);
  }
  assert(infos.find(([n]) => n === 'phone look')[1].lite && infos.find(([n]) => n === 'phone look')[1].lamps, 'the phone look draws the bake (the lamp volume, 3.6 Step 4)');
} catch (e) {
  failed = true;
  console.error(String(e));
}
if (failed) {
  console.log('FAILED');
  process.exit(1);
}
