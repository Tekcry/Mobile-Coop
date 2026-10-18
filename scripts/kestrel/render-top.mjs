// Kestrel B0: a top-down render of the built massing walk, one image per level, beside the block plan (docs/kestrel/plans/blocks-<L>.png).
//   node scripts/kestrel/render-top.mjs [url] [outDir] [planDir]     (defaults: http://127.0.0.1:4179/, docs/kestrel/builds, docs/kestrel/plans)
// Writes <outDir>/B0-<L>.png for each level L of the arch file: the plan on the left, the render on the right, the same metres.
// A level is a section cut: the camera is parked just under the slab above it, so only what stands on that level is in front of it
// (the cut heights come from the file: the next level's floor minus the slab; the top level has no cut). The camera is a perspective one
// 220 m up with a narrow field of view (an orthographic projection renders wrongly through this game's post stack), as scripts/g1v2-plan.mjs does.
// Adapted from scripts/g1v2-plan.mjs (Michael's exception to RULES section 4). Needs a built dist/ served at the url (npm run build, then
// `npx vite preview --port 4179`), or run it through nothing else: it opens no server of its own.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { launch, frames, launchOptions } from '../e2e-lib.mjs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const url = args.find((a) => /^https?:/.test(a)) ?? 'http://127.0.0.1:4179/';
const rest = args.filter((a) => !/^https?:/.test(a));
const outDir = path.resolve(rest[0] ?? 'docs/kestrel/builds');
const planDir = path.resolve(rest[1] ?? 'docs/kestrel/plans');
fs.mkdirSync(outDir, { recursive: true });
const A = JSON.parse(fs.readFileSync(new URL('../../docs/kestrel/kestrel.blocks.json', import.meta.url), 'utf8'));
const [X0, Z0, X1, Z1] = A.meta.site;
const PX = 12; // pixels per metre in the render
const W = Math.round((X1 - X0) * PX);
const H = Math.round((Z1 - Z0) * PX);
const SLAB = 0.3; // as src/world/maps/kestrelGeo.ts
const CUT_MARGIN = 0.05;
const levels = [...A.levels].sort((a, b) => a.floor - b.floor);
/** Camera cut height for a level: under the next level's slab, or none for the top one. */
const cutOf = (l) => {
  const up = levels.find((u) => u.floor > l.floor);
  return up ? up.floor - SLAB - CUT_MARGIN : Math.max(...levels.map((q) => q.floor + q.height)) + 4;
};

const { browser, page } = await launch({ url, params: 'autostart=kestrel&mode=sandbox&gfx=low&platform=desktop&fullbright=1', viewport: { width: W, height: H }, touch: false });
const files = [];
try {
  await page.waitForFunction(() => window.__app.current?.world, null, { timeout: 180000 });
  const mid = [(X0 + X1) / 2, (Z0 + Z1) / 2]; // the lit volume follows the player: stand mid-site
  await page.evaluate(([x, z]) => { const c = window.__app.current.player.controller; c.teleport(new c.pos.constructor(x, 0.05, z), 0); }, mid);
  await frames(page, 240);
  for (const l of levels) {
    await page.evaluate(
      ([L, R, B, T, camY, mid]) => {
        const g = window.__app.current;
        window.__app.loop.manual = true;
        document.querySelectorAll('body > :not(canvas)').forEach((e) => (e.style.visibility = 'hidden'));
        const cam = g.scene.activeCamera;
        const HH = 220;
        g.scene.fogMode = 0;
        // the sun's shadow frustum covers a few tens of metres round the player: outside it the world is dark, so no shadows in a plan view
        for (const lt of g.scene.lights) {
          lt.shadowEnabled = false;
          lt.getShadowGenerator?.()?.dispose();
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
        g.player.controller.teleport(new g.player.controller.pos.constructor(mid[0], 0.05, mid[1]), 0);
      },
      [X0, X1, Z0, Z1, cutOf(l), mid],
    );
    await page.evaluate(() => { const sc = window.__app.current.scene; for (let i = 0; i < 4; i++) sc.render(); });
    await frames(page, 5);
    const f = path.join(outDir, `render-${l.id}.png`);
    await page.locator('canvas').first().screenshot({ path: f });
    files.push([l, f]);
  }
} finally {
  await browser.close();
}

// the sheets: the plan scaled to the render's height on the left, the render on the right (the plan keeps its callout column; its map panel is not aligned to the render's pixels)
const sb = await chromium.launch(launchOptions());
const b64 = (f) => fs.readFileSync(f).toString('base64');
const out = [];
for (const [l, f] of files) {
  const planFile = path.join(planDir, `blocks-${l.id}.png`);
  if (!fs.existsSync(planFile)) {
    console.error(`no plan ${planFile}: render only`);
  }
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:8px;background:#fff;font:14px sans-serif}h1{font-size:16px;margin:0 0 6px}.row{display:flex;gap:10px;align-items:flex-start}img{border:1px solid #888;display:block}</style>
<h1>Kestrel B0, level ${l.id} (${l.name}, floor ${l.floor} m): block plan (left) and the built massing, top-down section (right)</h1>
<div class="row">${fs.existsSync(planFile) ? `<img height="${H}" src="data:image/png;base64,${b64(planFile)}">` : ''}<img width="${W}" height="${H}" src="data:image/png;base64,${b64(f)}"></div>`;
  const sp = await sb.newPage({ viewport: { width: 400, height: 400 } });
  await sp.setContent(html);
  await sp.waitForTimeout(500);
  const o = path.join(outDir, `B0-${l.id}.png`);
  await sp.screenshot({ path: o, fullPage: true });
  await sp.close();
  out.push(o);
}
await sb.close();
for (const [, f] of files) fs.rmSync(f, { force: true });
console.log('wrote', out.map((o) => path.relative(process.cwd(), o)).join(', '));
