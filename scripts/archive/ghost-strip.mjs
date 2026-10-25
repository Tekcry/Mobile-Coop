// Ghost frame strips (ghost-fix, docs/archive/ghost-fix/DIAGNOSIS.md): serves dist/ with `vite preview`, launches ONE headless
// browser on Free Roam (proving, daylight) at the given preset, stops the game's render loop and drives it frame by
// frame itself (sim step, frame update, render: the order of `GameLoop.frame`), reading the canvas back right after each
// render (the DOM HUD is not in the canvas, so no HUD hiding is needed). Strips: `draw` (aim held from holstered, the
// camera still), `aimpan` (aim held, the camera turning: the TAA camera-move test), `holster` (aim released).
// Writes <dir>/<strip>-<NN>-<suffix>.png per frame and <dir>/<strip>-sheet-<suffix>.png per strip, and prints the
// active post pipeline (TAA / TAAU / motion blur) plus per frame the camera's `hasMoved` and whether its position moved.
// Needs a prior `npm run build`. Never headed, no pointer lock.
// Usage: E2E_GPU=1 E2E_PORT=4189 timeout 600 node scripts/archive/ghost-strip.mjs docs/archive/ghost-fix/shots before epic
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from '../e2e-lib.mjs';

const [dir = 'docs/archive/ghost-fix/shots', suffix = 'before', gfx = 'epic'] = process.argv.slice(2);
const PORT = Number(process.env.E2E_PORT ?? 4189);
const URL = `http://127.0.0.1:${PORT}/`;
const COLS = 6;
const TILE_W = 320;
const TILE_H = 180;
// strip name, frames (60 Hz), aim held, camera yaw per frame (rad)
const STRIPS = [
  ['draw', 42, true, 0],
  ['aimpan', 30, true, 0.012],
  ['holster', 36, false, 0],
];

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
let browser = null;
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
const fail = async (msg) => { console.error(`ghost-strip: ${msg}`); try { await browser?.close(); } catch { /* gone */ } stop(); process.exit(2); };
const kill = setTimeout(() => fail('timed out after 600 s'), 600_000);

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { up = (await fetch(URL)).ok; } catch { await new Promise((r) => setTimeout(r, 250)); }
}
if (!up) await fail('preview server did not start (run `npm run build` first)');

const png = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

mkdirSync(dir, { recursive: true });
try {
  const l = await launch({ url: URL, params: `autostart=proving&mode=sandbox&gfx=${gfx}`, viewport: { width: 1280, height: 720 } });
  browser = l.browser;
  const page = l.page;
  await page.waitForFunction(() => globalThis.__app?.current?.player && globalThis.__app.current.stack && globalThis.__app.current.scene.isReady(), null, { timeout: 180_000 });
  await page.waitForTimeout(4000);

  // take the loop over: no more rAF frames; each `__gs.frame` is one sim step + frame update + render + readback
  const info = await page.evaluate(([cols, tw, th]) => {
    const a = globalThis.__app;
    const g = a.current;
    const engine = g.scene.getEngine();
    engine.stopRenderLoop();
    if (g.target) g.target.damageMul = 0;
    const cam = g.player.cam.camera;
    const st = a.input.state;
    const s = g.stack;
    const sheet = document.createElement('canvas');
    const ctx = sheet.getContext('2d');
    const last = cam.position.clone();
    const lastR = cam.rotation.clone();
    let lastFov = cam.fov;
    globalThis.__gs = {
      start(n) {
        sheet.width = cols * tw;
        sheet.height = Math.ceil(n / cols) * th;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, sheet.width, sheet.height);
      },
      /** One frame; `full` returns the full-size PNG, `tile` the sheet slot (-1 none). */
      frame(aim, yaw, full, tile) {
        st.move.x = st.move.y = 0;
        st.set('carry', 'ads', aim);
        if (yaw) st.addLook(yaw, 0);
        a.loop.stepHeadless(1 / 60, 60);
        engine.beginFrame();
        g.scene.render();
        engine.endFrame();
        const c = engine.getRenderingCanvas();
        const moved = !cam.position.equals(last) || !cam.rotation.equals(lastR) || cam.fov !== lastFov;
        last.copyFrom(cam.position);
        lastR.copyFrom(cam.rotation);
        lastFov = cam.fov;
        const out = { hasMoved: cam.hasMoved, moved, ads: g.player.ads, drawPhase: g.weapons?.draw?.phase ?? null, url: null };
        if (tile >= 0) {
          ctx.drawImage(c, (tile % cols) * tw, Math.floor(tile / cols) * th, tw, th);
          ctx.fillStyle = '#ff0';
          ctx.font = '14px monospace';
          ctx.fillText(`${tile} ${out.hasMoved ? 'M' : '-'}${out.moved ? 'm' : '-'}`, (tile % cols) * tw + 4, Math.floor(tile / cols) * th + 16);
        }
        if (full) out.url = c.toDataURL('image/png');
        return out;
      },
      sheet() {
        return sheet.toDataURL('image/png');
      },
    };
    const v = a.settings.get().video;
    const taa = s.taa;
    return {
      preset: v.preset,
      upscalerSetting: v.upscaler,
      renderScale: v.renderScale,
      hdr: s.hdr,
      taa: taa ? { samples: taa.samples, factor: taa._taaThinPostProcess?.factor ?? taa.factor, clampHistory: taa.clampHistory, reprojectHistory: taa.reprojectHistory, disableOnCameraMove: taa.disableOnCameraMove, msaaSamples: taa.msaaSamples } : null,
      taau: s.taau ? { scale: s.taau.scale } : null,
      motionBlur: s.motion ? { strength: s.motion.motionStrength, samples: s.motion.motionBlurSamples, objectBased: s.motion.isObjectBased } : null,
      geometryBuffer: !!s.gbr,
      prePass: !!g.scene.prePassRenderer?.enabled,
      weapon: g.weapons?.current?.def?.id ?? null,
    };
  }, [COLS, TILE_W, TILE_H]);
  console.log(`pipeline ${JSON.stringify(info)}`);

  const step = (aim, yaw, full, tile) => page.evaluate(([a, y, f, t]) => globalThis.__gs.frame(a, y, f, t), [aim, yaw, full, tile]);
  // settle holstered, still, with the history built up as in play
  for (let i = 0; i < 90; i++) await step(false, 0, false, -1);
  for (const [name, n, aim, yaw] of STRIPS) {
    // aimpan starts from a settled aim; holster from a settled aim too
    if (name !== 'draw') for (let i = 0; i < 60; i++) await step(true, 0, false, -1);
    await page.evaluate((k) => globalThis.__gs.start(k), n);
    const log = [];
    for (let i = 0; i < n; i++) {
      const r = await step(aim, yaw, true, i);
      writeFileSync(`${dir}/${name}-${String(i).padStart(2, '0')}-${suffix}.png`, png(r.url));
      log.push(`${r.hasMoved ? 'M' : '-'}${r.moved ? 'm' : '-'}`);
    }
    writeFileSync(`${dir}/${name}-sheet-${suffix}.png`, png(await page.evaluate(() => globalThis.__gs.sheet())));
    // per frame: M = camera.hasMoved (TAA resets on it), m = the camera position / rotation / fov really changed; "-m" frames blend stale history
    console.log(`${name} ${n} frames  ${log.join(' ')}`);
    if (name === 'aimpan' || name === 'draw') for (let i = 0; i < 30; i++) await step(true, 0, false, -1);
  }
  if (l.errors.length) console.log(l.errors.join('\n'));
} catch (e) {
  await fail(String(e?.stack ?? e));
}
clearTimeout(kill);
await browser.close();
stop();
process.exit(0);
