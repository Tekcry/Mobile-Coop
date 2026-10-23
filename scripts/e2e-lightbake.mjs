// 3.6 Phase 1 Step 1: the canonical light bake is the same on every preset. The Warehouse under `?gfx=min`,
// `?gfx=low` and `?gfx=epic` bakes the same shapes and gives the same lamp / moon / ambient bytes (cache keys
// and a content hash), and every config baked something; Epic draws the baked lamps.
// smooth-world: the same with voxels on (`?gfx=epic&voxels=1`) as off (the smooth default): one bake, and both Epic paths
// draw it through the lamp plugin on every PBR material; Ray traced reflections fall back to screen space without voxels.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const CONFIGS = [
  ['gfx=min', 'gfx=min'],
  ['gfx=low', 'gfx=low'],
  ['gfx=epic', 'gfx=epic'],
  ['gfx=epic&voxels=1', 'gfx=epic&voxels=1'],
];
let failed = false;
const infos = [];
// one browser per config, side by side: each has its own profile, so every config bakes cold (a shared cache would make the later
// configs read the first one's bytes and the comparison below prove nothing)
await Promise.all(CONFIGS.map(async ([name, q], k) => {
  const { browser, page, errors } = await launch({ url, params: `${q}&autostart=warehouse&mode=clear`, viewport: { width: 640, height: 360 } });
  try {
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 240000 });
    // (materials made after the load get the lamp plugin on the next frame)
    await frames(page, 6);
    // (gpu-tests) on a hardware GPU 6 frames pass in ~0.1 s while loaders still make materials: wait (5 s cap) until
    // every PBR material has the plugin, so a material made just before the read is not counted unplugged (a real miss
    // still fails the assert). (load-latent-ui1) 120 s cap: four browsers bake side by side, and under CPU load the
    // loaders and the next frame ran past 5 s
    // (marlow-final e2e-fix4) and the PBR count unchanged over ~1 s: the laptop GPU run read 10 / 11 (a loader made a
    // material between this wait and the read; a desktop run reads 20 / 20 once loading ends)
    await page.waitForFunction(() => {
      const pbr = window.__app.current.world.scene.materials.filter((m) => m.getClassName() === 'PBRMaterial');
      const ok = pbr.every((m) => !!m.pluginManager?.getPlugin('BakedLamps'));
      const s = (window.__lbStable ??= { n: -1, k: 0 });
      s.k = ok && pbr.length === s.n ? s.k + 1 : 0;
      s.n = pbr.length;
      return s.k >= 4;
    }, null, { timeout: 120000, polling: 250 }).catch(() => {});
    const read = () => page.evaluate(() => {
      const w = window.__app.current.world;
      const q = window.__app.quality.level;
      const pbr = w.scene.materials.filter((m) => m.getClassName() === 'PBRMaterial');
      return { ...w.lightInfo(), minimal: !!q.minimal, voxels: !!w.voxels, lamps: !!w.lamps, pbr: pbr.length, plugged: pbr.filter((m) => !!m.pluginManager?.getPlugin('BakedLamps')).length, unplugged: pbr.filter((m) => !m.pluginManager?.getPlugin('BakedLamps')).map((m) => m.name).join(',') };
    });
    let info = await read();
    // (a material made just before the read gets the plugin on the next frame: read again; a real miss stays unplugged)
    for (let t = 0; t < 3 && info.plugged !== info.pbr; t++) {
      await frames(page, 6);
      info = await read();
    }
    if (name === 'gfx=epic') {
      // (fix round) the level material compiles the lamp plugin with LAMP_LEVEL (no night-vision body fill cap); no other
      // material does (bodies, weapons and props keep the cap)
      const lvl = await page.evaluate(async () => {
        const scene = window.__app.current.scene;
        const read = () => {
          let level = null;
          let sky = null;
          let others = 0;
          for (const m of scene.meshes) {
            const sm = m.subMeshes?.[0];
            const fx = sm?.effect;
            const mat = sm?.getMaterial?.();
            if (!fx || !fx.isReady() || !mat || !fx.defines.includes('#define BAKED_LAMPS')) continue;
            const has = fx.defines.includes('#define LAMP_LEVEL');
            if (mat.name.startsWith('levelMat-')) {
              level = has;
              sky = fx.defines.includes('#define LAMP_SKY');
            }
            else if (has) others++;
          }
          return { level, sky, others };
        };
        let r = read();
        for (let i = 0; i < 60 && r.level === null; i++) {
          await new Promise((res) => setTimeout(res, 500));
          r = read();
        }
        return r;
      });
      info.lampLevel = lvl;
      // the smooth default at Ray traced: no voxel world to trace, so screen space reflections run instead (no crash)
      await page.evaluate(() => window.__app.settings.update((d) => { d.video.preset = 'custom'; d.video.gfx.reflections = 'rt'; d.video.adaptive = false; }));
      // (load-latent-ui1) was a fixed 1.5 s wall wait: under CPU load the frame rebuilding the pipeline had not run.
      // Wait (60 s cap) for the fallback, then read; a real miss still fails the assert. Epic already runs SSR, so the
      // wait also needs the stack rebuilt with Ray traced (its settings key), or it would pass before the switch
      await page.waitForFunction(() => {
        const g = window.__app.current;
        const n = g.player.cam.camera._postProcesses.filter(Boolean).map((p) => p.name);
        return String(g.stack?.key ?? '').includes('"reflections":"rt"') && n.includes('ssr') && !n.includes('rtReflect');
      }, null, { timeout: 60000 }).catch(() => {});
      const pps = await page.evaluate(() => window.__app.current.player.cam.camera._postProcesses.filter(Boolean).map((p) => p.name));
      info.rtFallback = pps.includes('ssr') && !pps.includes('rtReflect');
      info.pps = pps.join(',');
    }
    infos[k] = [name, info];
    console.log(`  ${name}: shapes ${info.shapes} hash ${info.hash} lamps ${info.lights} (${(info.lampBytes / 1e6).toFixed(1)} MB) moon ${info.moonCells} cells, bake ${Math.round(info.ms)} ms, voxels ${info.voxels}, baked lamps drawn ${info.lamps}`);
    const bad = errors.filter((e) => !/favicon|net::ERR|WebSocket|webrtc/i.test(e));
    assert(bad.length === 0, `${name}: no console errors${bad.length ? ': ' + bad.slice(0, 3).join(' | ') : ''}`);
  } catch (e) {
    failed = true;
    console.error(`${name}: ${String(e)}`);
  }
  await browser.close();
}));
try {
  assert(infos.filter(Boolean).length === CONFIGS.length, 'every config booted the Warehouse');
  const ref = infos[0][1];
  assert(ref.lights > 0 && ref.lampBytes > 0 && ref.moonCells > 0 && !!ref.hash, `the bake is not empty (${ref.lights} lamps, ${ref.lampBytes} bytes, ${ref.moonCells} moon cells)`);
  for (const [name, i] of infos) {
    assert(i.shapes === ref.shapes, `${name}: the canonical shapes are the same (${i.shapes})`);
    assert(i.lampKey === ref.lampKey && i.moonKey === ref.moonKey, `${name}: the lamp and moon bake keys are the same`);
    assert(i.hash === ref.hash, `${name}: the visibility data hash is the same (${i.hash})`);
  }
  const epic = infos.find(([n]) => n === 'gfx=epic')[1];
  const vox = infos.find(([n]) => n === 'gfx=epic&voxels=1')[1];
  assert(!epic.voxels && vox.voxels, `Epic is smooth by default, voxels only with ?voxels=1 (${epic.voxels}, ${vox.voxels})`);
  for (const [n, i] of [['gfx=epic', epic], ['gfx=epic&voxels=1', vox]]) {
    assert(i.lamps, `${n}: draws the bake (the baked lamps)`);
    assert(i.pbr > 0 && i.plugged === i.pbr, `${n}: the lamp plugin is on every PBR material (${i.plugged} / ${i.pbr}${i.unplugged ? `; unplugged: ${i.unplugged}` : ''})`);
  }
  assert(epic.lampLevel?.sky === true, `smooth Epic: the level material takes the voxel walls' fill and probe light by sky visibility (LAMP_SKY, ${JSON.stringify(epic.lampLevel)})`);
  assert(epic.lampLevel?.level === true && epic.lampLevel.others === 0, `smooth Epic: only the level material compiles LAMP_LEVEL (${JSON.stringify(epic.lampLevel)})`);
  assert(epic.rtFallback, `smooth Epic at Ray traced falls back to screen space reflections (${epic.pps})`);
} catch (e) {
  failed = true;
  console.error(String(e));
}
if (failed) {
  console.log('FAILED');
  process.exit(1);
}
