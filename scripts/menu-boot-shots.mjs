// (menu-notes note 2 / 4) The menu's load screen and the first frames after it: node scripts/menu-boot-shots.mjs [outDir]
// 1. A fresh launch with the title (`?title=1`): a shot of the load screen on each new status line, the status lines
//    with their times, then shots at the reveal and after the fade. Every frame from the reveal for 4 s reads which LOD
//    Wren is drawn at (`MenuState.heroLod`): it must be the close-up LOD (`heroLodWanted`) from the first frame (no pop).
// 2. A hero close-up (H1, frozen) with the LOD read-back.
// `bootCap=60`: the gate may wait up to 60 s (the 12 s automation cap is for the logic suites).
// Needs a server on E2E_PORT serving dist/. GPU run (Michael's PC): E2E_GPU=1 SHOT_GFX=high. Files: <outDir>/s2-*.png.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { fakePointerLock, launchOptions } from './e2e-lib.mjs';

const out = process.argv[2] ?? 'docs/menu-notes/shots';
mkdirSync(out, { recursive: true });
const base = process.env.URL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4173}/`;
const gfx = process.env.SHOT_GFX ?? 'high';
let bad = 0;
const fail = (m) => {
  bad++;
  console.log(`FAIL ${m}`);
};

const browser = await chromium.launch(launchOptions());
try {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(fakePointerLock);
  // in the page from the first moment: the boot status lines with their times, then from the reveal one record per frame
  // of the LOD drawn
  await ctx.addInitScript(() => {
    const w = window;
    w.__bootLog = [];
    w.__lodLog = [];
    const t0 = performance.now();
    const watch = () => {
      const st = document.getElementById('boot-status');
      const boot = document.getElementById('boot');
      if (!st || !boot) return void requestAnimationFrame(watch);
      let last = '';
      const tick = () => {
        const s = st.textContent ?? '';
        if (s !== last) w.__bootLog.push([Math.round(performance.now() - t0), (last = s)]);
        if (boot.classList.contains('done')) {
          w.__revealAt = Math.round(performance.now() - t0);
          const end = performance.now() + 4000;
          const frame = () => {
            const c = w.__app?.current;
            w.__lodLog.push([c?.heroLod ?? '?', c?.heroLodWanted ?? '?']);
            if (performance.now() < end) requestAnimationFrame(frame);
          };
          return void requestAnimationFrame(frame);
        }
        requestAnimationFrame(tick);
      };
      tick();
    };
    watch();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(`${base}?title=1&bootCap=60&gfx=${gfx}`);
  // a shot of the load screen on each new status line
  const seen = new Set();
  for (let i = 0; i < 1200; i++) {
    const s = await page.evaluate(() => ({ text: document.getElementById('boot-status')?.textContent ?? '', done: !!document.getElementById('boot')?.classList.contains('done') })).catch(() => null);
    if (!s) continue;
    if (s.done) break;
    // (one shot per status, not per megabyte)
    const kind = s.text.replace(/\s*\d+ MB$/, '');
    if (!seen.has(kind)) {
      seen.add(kind);
      const name = kind.replace(/[^a-z]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'boot';
      await page.screenshot({ path: `${out}/s2-load-${name}.png` });
      console.log(`saved ${out}/s2-load-${name}.png ("${s.text}")`);
    }
    await page.waitForTimeout(50);
  }
  await page.screenshot({ path: `${out}/s2-reveal.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/s2-title-after-fade.png` });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => ({ boot: window.__bootLog, at: window.__revealAt, lods: window.__lodLog, gate: window.__app.current?.bootGate, top: window.__app.screens.top?.el.classList[1] }));
  console.log('status lines (ms):', r.boot.map(([t, s]) => `${t} ${s}`).join(' | '));
  console.log(`revealed at ${r.at} ms, gate "${r.gate}", top screen ${r.top}`);
  const kinds = [...new Set(r.lods.map(([a, b]) => `${a}/${b}`))];
  console.log(`LOD drawn / wanted over ${r.lods.length} frames after the reveal: ${kinds.join(', ')}`);
  if (r.gate !== 'ready') fail(`the gate did not report ready (${r.gate})`);
  if (r.top !== 'title-screen') fail(`the title shows after the load screen (${r.top})`);
  if (!r.lods.length || r.lods.some(([a, b]) => a !== b)) fail('Wren is drawn at the close-up LOD on every frame from the reveal');
  if (gfx !== 'min' && r.lods.some(([, b]) => b !== 'hero')) fail('the close-up LOD on a desktop preset is the hero');

  // the hero close-up, frozen
  await page.goto(`${base}?menuShot=H1&menuT=0.5&bootCap=60&gfx=${gfx}`);
  await page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done'), null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const h = await page.evaluate(() => ({ lod: window.__app.current?.heroLod, want: window.__app.current?.heroLodWanted, shot: window.__app.current?.shotId, weapons: window.__app.current?.weaponsReady }));
  await page.screenshot({ path: `${out}/s2-closeup-H1.png` });
  console.log(`saved ${out}/s2-closeup-H1.png (shot ${h.shot}, LOD drawn ${h.lod}, wanted ${h.want}, weapons ${h.weapons})`);
  if (h.lod !== h.want || (gfx !== 'min' && h.lod !== 'hero')) fail(`the close-up draws the hero (${h.lod})`);
  const e = errors.filter((x) => (x.startsWith('[pageerror]') || x.startsWith('[error]')) && !x.includes('GPU stall'));
  if (e.length) fail(`page errors: ${e.slice(0, 5).join(' | ')}`);
} finally {
  await browser.close();
}
console.log(bad ? `${bad} problem(s)` : 'menu boot shots: all good');
process.exit(bad ? 1 : 0);
