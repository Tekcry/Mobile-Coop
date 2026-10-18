// slice 6 shots only (the cinematic background): node scripts/menu-shots6.mjs [outDir] [names]
// The title T1 before and after the goggle flickers on, the main menu's opening T2, the equipment macros H1-H6.
// Needs a server on E2E_PORT serving dist/ (`node node_modules/vite/bin/vite.js preview --port 4191 --strictPort --host 127.0.0.1`).
// 1920 x 1080 PNGs. Software GL with `?gfx=min` (Wren's LOD2) by default: framing and light layout only. SHOT_GFX=<preset>
// renders that preset (LOD0, then the hero LOD once loaded); E2E_GPU=1 uses the hardware GPU (Michael's PC).
// SHOT_PREFIX names the files (default `6-hero`). Each shot is frozen at a moment of its pass with `?menuT=`.
import { launch, frames } from './e2e-lib.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/menu-ui/shots';
const only = process.argv[3] ? process.argv[3].split(',') : null;
mkdirSync(out, { recursive: true });
const url = process.env.URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`;
const gfx = process.env.SHOT_GFX ? `&gfx=${process.env.SHOT_GFX}` : '';
const prefix = process.env.SHOT_PREFIX ?? '6-hero';
// [file name, shot, menuT]
const SHOTS = [
  ['T1-dark', 'T1', 0.06],
  ['T1', 'T1', 0.7],
  ['T2', 'T2', 0.6],
  ['H1', 'H1', 0.5],
  ['H2', 'H2', 0.5],
  ['H3', 'H3', 0.5],
  ['H4', 'H4', 0.5],
  ['H5', 'H5', 0.5],
  ['H6', 'H6', 0.5],
].filter(([n]) => !only || only.includes(n));
const HERO = 1 << 0;
const LOD2 = 1 << 3;
const query = (id, t) => `${id === 'T1' ? 'title=1&' : ''}menuShot=${id}&menuT=${t}${gfx}`;
let bad = 0;
// one browser: each shot reloads the page with its query (the Wren files stay in the browser cache)
const { browser, page, errors } = await launch({ url, params: query(SHOTS[0][1], SHOTS[0][2]), viewport: { width: 1920, height: 1080 } });
try {
  for (let i = 0; i < SHOTS.length; i++) {
    const [name, id, t] = SHOTS[i];
    if (i > 0) {
      const u = new URL(page.url());
      await page.goto(`${u.origin}${u.pathname}?${query(id, t)}`);
    }
    await page.waitForSelector(id === 'T1' ? '.title-screen' : '.main-menu .ms-item.focused', { timeout: 120000 });
    await page.evaluate(() => window.__app.input.setMode('kbm'));
    // the best body the preset allows: the hero (or LOD2 under ?gfx=min)
    const want = gfx || process.env.E2E_GPU ? HERO : LOD2;
    await page
      .waitForFunction((b) => ((window.__app.current?.figure?.loaded ?? 0) & b) !== 0, want, { timeout: 90000, polling: 250 })
      .catch(() => console.log(`(${name}: wanted LOD not loaded in time)`));
    await page.waitForTimeout(3000);
    await frames(page, 20);
    const st = await page.evaluate(() => ({ id: window.__app.current?.shotId, loaded: window.__app.current?.figure?.loaded ?? 0 }));
    await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
    console.log(`saved ${out}/${prefix}-${name}.png (shot ${st.id}, LOD mask ${st.loaded.toString(2)})`);
  }
  const e = errors.filter((x) => (x.startsWith('[pageerror]') || x.startsWith('[error]')) && !x.includes('GPU stall') && !x.includes('swiftshader'));
  if (e.length) {
    bad++;
    console.log(e.slice(0, 10).join('\n'));
  }
} finally {
  await browser.close();
}
process.exit(bad ? 1 : 0);
