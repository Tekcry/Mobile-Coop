// slice 6 shots only (the cinematic background): node scripts/menu-shots6.mjs [outDir] [names]
// The title T1 before and after the goggle flickers on, the main menu's opening T2, the equipment macros H1-H6, and
// (menu-notes slice 3) the weapon shots W1 (rifle, low ready) and W2 (pistol, compressed ready).
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
  // (menu-notes slice 3) the rifle and the pistol in her hands
  ['W1', 'W1', 0.5],
  ['W2', 'W2', 0.5],
  // (menu-notes slice 4b) the candidate tactical shots (not in the live deck; `?menuShot=X1` etc.)
  ...['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].map((x) => [x, x, 0.5]),
].filter(([n]) => !only || only.includes(n));
const HERO = 1 << 0;
const LOD2 = 1 << 3;
// (menu-notes slice 4a) T1-dark is the title (dark until a press); T1 lit is the shot held over the main menu
const query = (name, id, t) => `${name === 'T1-dark' ? 'title=1&' : ''}menuShot=${id}&menuT=${t}${gfx}`;
let bad = 0;
// one browser: each shot reloads the page with its query (the Wren files stay in the browser cache)
const { browser, page, errors } = await launch({ url, params: query(...SHOTS[0]), viewport: { width: 1920, height: 1080 } });
try {
  for (let i = 0; i < SHOTS.length; i++) {
    const [name, id, t] = SHOTS[i];
    if (i > 0) {
      const u = new URL(page.url());
      await page.goto(`${u.origin}${u.pathname}?${query(name, id, t)}`);
    }
    await page.waitForSelector(name === 'T1-dark' ? '.title-screen' : '.main-menu .ms-item.focused', { timeout: 120000 });
    await page.evaluate(() => window.__app.input.setMode('kbm'));
    // the best body the preset allows: the hero (or LOD2 under ?gfx=min)
    const want = gfx || process.env.E2E_GPU ? HERO : LOD2;
    await page
      .waitForFunction((b) => ((window.__app.current?.figure?.loaded ?? 0) & b) !== 0, want, { timeout: 90000, polling: 250 })
      .catch(() => console.log(`(${name}: wanted LOD not loaded in time)`));
    // (menu-notes slice 3) the Blender weapon meshes (the proxy parts stay hidden in the void until they load)
    await page
      .waitForFunction(() => window.__app.current?.weaponsReady === true, null, { timeout: 60000, polling: 250 })
      .catch(() => console.log(`(${name}: weapon meshes not loaded in time)`));
    await page.waitForTimeout(3000);
    await frames(page, 20);
    const st = await page.evaluate(() => ({ id: window.__app.current?.shotId, loaded: window.__app.current?.figure?.loaded ?? 0, lod: window.__app.current?.heroLod }));
    await page.screenshot({ path: `${out}/${prefix}-${name}.png`, timeout: 180000 }); // software GL under load is slow
    console.log(`saved ${out}/${prefix}-${name}.png (shot ${st.id}, LOD mask ${st.loaded.toString(2)}, drawn ${st.lod})`);
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
