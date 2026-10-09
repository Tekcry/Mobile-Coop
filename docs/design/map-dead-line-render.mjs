// Dead Line: runs the checks and writes the SVG, the PNG (headless Chromium), the tables (map-dead-line.md) and the validation
// (map-dead-line-validation.md) from map-dead-line.json.
// Run: node docs/design/map-dead-line-render.mjs [--no-png]   (needs the guard cost file map-dead-line-guard-cost.json; see map-dead-line-guard-cost.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { analyse } from './map-dead-line-analysis.mjs';
import { buildSvg } from './map-dead-line-svg.mjs';
import { writeDocs } from './map-dead-line-docs.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const P = (f) => path.join(here, f);
const R = analyse();
const { svg, W, H } = buildSvg(R);
fs.writeFileSync(P('map-dead-line.svg'), svg);
console.log('svg', W, 'x', H);
writeDocs(R, P);
if (!process.argv.includes('--no-png')) {
  try {
    process.env.E2E_GPU = process.env.E2E_GPU ?? '1';
    const { chromium } = await import('playwright-core');
    const lib = await import(pathToFileURL(path.resolve(here, '../../scripts/e2e-lib.mjs')).href);
    const browser = await chromium.launch(lib.launchOptions());
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(`<!doctype html><body style="margin:0">${svg}</body>`);
    await page.screenshot({ path: P('map-dead-line.png'), clip: { x: 0, y: 0, width: W, height: H } });
    await browser.close();
    console.log('PNG written', W, 'x', H);
  } catch (e) {
    console.log('PNG failed:', e.message);
  }
}
