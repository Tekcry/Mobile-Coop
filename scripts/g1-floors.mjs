// Dead Line G1: a top-down render of each floor beside the design plan PNG.
//   node scripts/g1-floors.mjs [url] [outDir]       (default docs/gates/G1)
// The camera is orthographic, straight down, parked just under the next slab, so everything above it is behind the near plane and
// the picture is a plan cut of that floor (B, G, U) or the roof (R). Then a comparison sheet puts each render beside its plan panel.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { launch, frames, launchOptions } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const outDir = path.resolve(process.argv.filter((a) => !/^https?:/.test(a))[2] ?? 'docs/gates/G1');
fs.mkdirSync(outDir, { recursive: true });
const D = JSON.parse(fs.readFileSync('docs/design/map-dead-line.json', 'utf8'));
const fp = D.meta.footprint;
const M = 1;
const L = fp.x[0] - M;
const R = fp.x[1] + M;
const B = fp.z[0] - M;
const T = fp.z[1] + M;
const PX = 14; // px per metre
const W = Math.round((R - L) * PX);
const H = Math.round((T - B) * PX);
const floors = [
  ['B', -3.3, -0.45],
  ['G', 0, 2.9],
  ['U', 3.3, 6.2],
  ['R', 6.6, 12],
];
const { browser, page } = await launch({ url, params: 'autostart=dead-line&mode=sandbox&gfx=low&platform=desktop', viewport: { width: W, height: H }, touch: false });
await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 180000 });
await frames(page, 60);
const files = [];
for (const [lv, , camY] of floors) {
  await page.evaluate(
    ([L, R, B, T, camY]) => {
      const g = window.__app.current;
      window.__app.loop.manual = true;
      document.querySelectorAll('body > :not(canvas)').forEach((e) => ((e.style.visibility = 'hidden')));
      const cam = g.scene.activeCamera;
      cam.mode = 1;
      cam.orthoLeft = L;
      cam.orthoRight = R;
      cam.orthoBottom = B;
      cam.orthoTop = T;
      cam.minZ = 0.01;
      cam.maxZ = 40;
      cam.position.set((L + R) / 2, camY, (B + T) / 2);
      cam.rotation.set(Math.PI / 2, 0, 0);
      cam.getViewMatrix(true);
      // the player is not part of the plan
      g.player.controller.teleport(new g.player.controller.pos.constructor(-60, 0.05, -37), 0);
    },
    [L, R, B, T, camY],
  );
  await frames(page, 25);
  const f = path.join(outDir, `floor-${lv}.png`);
  await page.locator('canvas').first().screenshot({ path: f });
  files.push([lv, f]);
}
await browser.close();

// the comparison sheet: plan panel (cropped from the design PNG) on the left, the render on the right
const planPng = fs.readFileSync('docs/design/map-dead-line.png').toString('base64');
const renders = files.map(([lv, f]) => [lv, fs.readFileSync(f).toString('base64')]);
// plan panels in the 1192 x 2234 PNG: [x, y, w, h] (8 px per metre, footprint x -61 .. 78 from x 40)
const panels = { B: [40, 69, 1116, 402], G: [40, 556, 1116, 402], U: [40, 1043, 1116, 402], R: [40, 1531, 1116, 402] };
const rows = renders
  .map(
    ([lv, b64]) => `<section><h2>${lv}</h2><div class="r"><div class="plan" style="width:${panels[lv][2]}px;height:${panels[lv][3]}px;background:url(data:image/png;base64,${planPng}) -${panels[lv][0]}px -${panels[lv][1]}px"></div><img width="${panels[lv][2]}" src="data:image/png;base64,${b64}"></div></section>`,
  )
  .join('');
const html = `<!doctype html><meta charset="utf-8"><style>body{margin:8px;background:#fff;font:14px sans-serif}h2{margin:6px 0}.r{display:flex;gap:8px;align-items:flex-start}img,.plan{border:1px solid #888}</style><h1>Dead Line G1: design plan (left) and the built greybox (right), top-down per floor</h1>${rows}`;
const sb = await chromium.launch(launchOptions());
const sp = await sb.newPage({ viewport: { width: 2300, height: 400 } });
await sp.setContent(html);
await sp.waitForTimeout(500);
await sp.screenshot({ path: path.join(outDir, 'floors-vs-plan.png'), fullPage: true });
await sb.close();
console.log('wrote', files.map(([, f]) => path.relative(process.cwd(), f)).join(', '), 'and floors-vs-plan.png');
