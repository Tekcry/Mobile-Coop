// Dead Line v2 G1 (Area 1): a top-down render of the built greybox beside the design plan (docs/design/dead-line-v2-area1.svg).
//   node scripts/g1v2-plan.mjs [url] [outDir]       (default docs/gates/dead-line-v2-G1)
// The plan is 1 m = 10 px with x 0..206 east and z 56..0 north up (its map panel starts at px 60, 70). The camera is orthographic, straight down,
// at the same scale: "top" sees everything from above (roofs, deck tops, block tops); "tunnel" is parked just under the street slab so only the
// cable tunnel (floor, walls, bearers) is in front of it. The sheet stacks the plan, the top render and the tunnel render with their x aligned.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { launch, frames, launchOptions } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const outDir = path.resolve(process.argv.filter((a) => !/^https?:/.test(a))[2] ?? 'docs/gates/dead-line-v2-G1');
fs.mkdirSync(outDir, { recursive: true });
const X0 = 0;
const X1 = 206;
const Z0 = 0;
const Z1 = 56;
const PX = 10;
const W = (X1 - X0) * PX;
const H = (Z1 - Z0) * PX;
const views = [
  ['top', 13.2],
  ['tunnel', -2.05],
];
const { browser, page } = await launch({ url, params: 'autostart=dead-line-v2&mode=sandbox&gfx=low&platform=desktop', viewport: { width: W, height: H }, touch: false });
await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 180000 });
// the level streams round the player: stand mid-lane and let it settle before the camera is parked
await page.evaluate(() => { const c = window.__app.current.player.controller; c.teleport(new c.pos.constructor(103, 0.05, 15), 0); });
await frames(page, 240);
const files = [];
for (const [name, camY] of views) {
  await page.evaluate(
    ([L, R, B, T, camY]) => {
      const g = window.__app.current;
      window.__app.loop.manual = true;
      document.querySelectorAll('body > :not(canvas)').forEach((e) => (e.style.visibility = 'hidden'));
      // (an orthographic projection renders wrongly through this game's post stack: a perspective camera 220 m up with a narrow field of view
      // is the plan view to within the parallax of the tallest block, 11 m, at the edge: under 5 m. The tunnel view clips everything above its cut with the near plane.)
      const cam = g.scene.activeCamera;
      const HH = 220;
      g.scene.fogMode = 0;
      // the sun's shadow frustum covers a few tens of metres round the player: outside it the world is dark, so no shadows in a plan view
      for (const l of g.scene.lights) {
        l.shadowEnabled = false;
        l.getShadowGenerator?.()?.dispose();
      }
      cam.mode = 0;
      cam.fovMode = 0;
      cam.fov = 2 * Math.atan((T - B) / 2 / HH);
      cam.minZ = HH - camY;
      cam.maxZ = HH + 120;
      cam.position.set((L + R) / 2, HH, (B + T) / 2);
      cam.rotation.set(Math.PI / 2, 0, 0);
      cam.getViewMatrix(true);
      cam.getProjectionMatrix(true);
      // the player stands mid-lane (the level's chunks near the player are lit and loaded)
      g.player.controller.teleport(new g.player.controller.pos.constructor(103, 0.05, 15), 0);
    },
    [X0, X1, Z0, Z1, camY],
  );
  await page.evaluate(() => { const sc = window.__app.current.scene; for (let i = 0; i < 4; i++) sc.render(); });
  await frames(page, 5);
  const f = path.join(outDir, `render-${name}.png`);
  await page.locator('canvas').first().screenshot({ path: f });
  files.push([name, f]);
}
await browser.close();

// the plan as a picture, then the sheet: plan, top render, tunnel render (x aligned: the plan's map panel starts at px 60)
const sb = await chromium.launch(launchOptions());
const svgPage = await sb.newPage({ viewport: { width: 2160, height: 1140 } });
await svgPage.goto(pathToFileURL(path.resolve('docs/design/dead-line-v2-area1.svg')).href);
await svgPage.waitForTimeout(300);
const planFile = path.join(outDir, 'plan.png');
await svgPage.screenshot({ path: planFile });
const b64 = (f) => fs.readFileSync(f).toString('base64');
const panel = (title, f) => `<section><h2>${title}</h2><img style="margin-left:60px" width="${W}" src="data:image/png;base64,${b64(f)}"></section>`;
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:8px;background:#fff;font:14px sans-serif}h2{margin:6px 60px}img{border:1px solid #888;display:block}section{margin-bottom:10px}</style>
<h1 style="margin-left:60px">Dead Line v2 Area 1: design plan (top) and the built greybox (below), same scale and x alignment (1 m = 10 px, x 0 to 206 m)</h1>
<section><h2>Plan (docs/design/dead-line-v2-area1.svg)</h2><img style="margin-left:0" width="2160" src="data:image/png;base64,${b64(planFile)}"></section>
${files.map(([n, f]) => panel(n === 'top' ? 'Render, top-down: everything from above (z 56 at the top, 0 at the bottom)' : 'Render, top-down: the cable tunnel (cut just under the street slab)', f)).join('')}`;
const sp = await sb.newPage({ viewport: { width: 2200, height: 400 } });
await sp.setContent(html);
await sp.waitForTimeout(600);
await sp.screenshot({ path: path.join(outDir, 'topdown-vs-plan.png'), fullPage: true });
await sb.close();
console.log('wrote', files.map(([, f]) => path.relative(process.cwd(), f)).join(', '), 'plan.png and topdown-vs-plan.png');
