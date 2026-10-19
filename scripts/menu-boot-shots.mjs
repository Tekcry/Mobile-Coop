// (menu-notes note 2 / 4) The menu's load screen and the first frames after it: node scripts/menu-boot-shots.mjs [outDir]
// 1. A fresh launch with the title (`?title=1`): (slice 4a, M2) the boot with the wordmark only (s4-boot), the title's
//    wordmark taking over in the same place (s4-boot-title-up), the reveal and the prompt faded in (s4-prompt); the status
//    lines (hidden on this path) are still logged with their times. Every frame from the reveal for 4 s reads which LOD
//    Wren is drawn at (`MenuState.heroLod`): it must be the close-up LOD (`heroLodWanted`) from the first frame (no pop).
//    (menu-notes slice 4a) Then the dark title (s4-title-dark, and s4-title-dark-stage with the UI hidden: its pixels
//    must be black), a press, stills from just after the press through the goggle strike (flicker done at 2.8 s) (each frozen with `MenuState.debugPause`) and the
//    first main-menu frame (s4-menu-first), with the light read-back (`MenuState.titleLight`) and the audio state.
// 2. A hero close-up (H1, frozen) with the LOD read-back.
// `bootCap=60`: the gate may wait up to 60 s (the 12 s automation cap is for the logic suites).
// Needs a server on E2E_PORT serving dist/. GPU run (Michael's PC): E2E_GPU=1 SHOT_GFX=high. Files: <outDir>/s2-*.png, s4-*.png.
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
  // (menu-notes slice 4a, M2) the launch boot: the NIGHT / SHIFT wordmark only (no status line, no progress line), the
  // title's wordmark taking over in the same place (no jump), the prompt hidden until the gate opens, then faded in
  const wordmark = () =>
    page.evaluate(() => {
      const shown = (sel) => {
        const e = document.querySelector(sel);
        return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
      };
      // (fix round) the text's own box (a Range round the line's text), not the block's: the title card's blocks are as
      // wide as its widest child, the press prompt, so their width differed from the boot's by the prompt's overhang
      // (15 px at 1920 x 1080) while the letters sat in the same place
      const textBox = (sel) => {
        const e = document.querySelector(sel);
        if (!e) return null;
        const r = document.createRange();
        r.selectNodeContents(e);
        return r.getBoundingClientRect();
      };
      const off = (x, y) => {
        const a = textBox(x);
        const b = textBox(y);
        return a && b ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.width - b.width), Math.abs(a.height - b.height)) : -1;
      };
      const press = document.querySelector('.title-screen .ts-press');
      return {
        mark: shown('#boot .boot-mark'),
        status: shown('#boot-status') || shown('#boot .boot-bar') || shown('#boot .boot-title'),
        title: !!document.querySelector('.title-screen'),
        wait: !!document.querySelector('.title-screen.ts-wait'),
        prompt: press ? getComputedStyle(press).filter : '',
        // px between the boot's wordmark and the title's (both lines), -1 when one is missing
        offset: Math.max(off('#boot .boot-mark .ts-l1', '.title-screen .ts-l1'), off('#boot .boot-mark .ts-l2', '.title-screen .ts-l2')),
        done: !!document.getElementById('boot')?.classList.contains('done'),
      };
    });
  let shotBoot = false;
  let shotUnder = false;
  for (let i = 0; i < 2400; i++) {
    const w = await wordmark().catch(() => null);
    if (!w) continue;
    if (w.done) break;
    if (w.status) fail('the launch boot shows a status line, progress line or the ghost wordmark');
    if (!w.mark && !w.title) fail('the launch boot shows no wordmark');
    if (!shotBoot) {
      shotBoot = true;
      await page.screenshot({ path: `${out}/s4-boot.png` });
      console.log(`saved ${out}/s4-boot.png (wordmark only: ${JSON.stringify(w)})`);
    }
    if (w.title && !shotUnder) {
      shotUnder = true;
      await page.screenshot({ path: `${out}/s4-boot-title-up.png` });
      console.log(`saved ${out}/s4-boot-title-up.png (the title's wordmark over the boot's: offset ${w.offset} px, waiting ${w.wait}, prompt filter ${w.prompt})`);
      if (w.offset < 0 || w.offset > 1) fail(`the title's wordmark does not sit on the boot's (offset ${w.offset} px)`);
      if (!w.wait || !w.prompt.includes('opacity(0)')) fail(`the prompt shows before the menu is ready (${w.prompt})`);
    }
    if (i > 2390) break;
    await page.waitForTimeout(50);
  }
  await page.screenshot({ path: `${out}/s4-reveal.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/s4-prompt.png` });
  const pw = await wordmark();
  console.log(`saved ${out}/s4-reveal.png and s4-prompt.png (prompt faded in: ${JSON.stringify(pw)})`);
  // (the fade is 0.9 s: the filter is back to none)
  if (pw.wait || pw.prompt !== 'none') fail(`the prompt did not fade in after the gate (${pw.prompt})`);
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

  // (menu-notes slice 4a, M1) the dark title, the goggle strike after the press, the first main-menu frame (s4-*.png)
  {
    const light = () => page.evaluate(() => window.__app.current?.titleLight);
    const audio = () => page.evaluate(() => ({ ctx: window.__app.audio.ctx?.state ?? 'none', theme: !!window.__app.music.debug.menu }));
    // the stage alone (the UI hidden for one shot): the brightest channel over the frame and the pixels above 2 / 255
    const stage = async (file) => {
      const ids = ['ui-root', 'boot'];
      await page.evaluate((l) => l.forEach((id) => document.getElementById(id)?.style.setProperty('visibility', 'hidden')), ids);
      await page.waitForTimeout(150);
      const buf = await page.screenshot({ path: file });
      await page.evaluate((l) => l.forEach((id) => document.getElementById(id)?.style.removeProperty('visibility')), ids);
      return page.evaluate(async (b64) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let max = 0;
        let lit = 0;
        for (let i = 0; i < d.length; i += 4) {
          const m = Math.max(d[i], d[i + 1], d[i + 2]);
          if (m > max) max = m;
          if (m > 2) lit++;
        }
        return { max, lit };
      }, buf.toString('base64'));
    };
    await page.screenshot({ path: `${out}/s4-title-dark.png` });
    const dk = await light();
    const px = await stage(`${out}/s4-title-dark-stage.png`);
    console.log(`saved ${out}/s4-title-dark.png and s4-title-dark-stage.png (stage pixels: max ${px.max} / 255, ${px.lit} above 2); light ${JSON.stringify(dk)}; audio ${JSON.stringify(await audio())}`);
    if (dk?.phase !== 'dark' || dk.spots !== 0 || dk.lens !== 0 || dk.goggle !== 0) fail(`the title's light is not off (${JSON.stringify(dk)})`);
    if (px.max > 3) fail(`the dark title's stage is not black (max ${px.max} / 255, ${px.lit} pixels above 2)`);
    // the press: the title goes, the goggle strikes (and the theme starts here if autoplay held it back)
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__app.current?.titleLight?.phase !== 'dark', null, { timeout: 5000 }).catch(() => {});
    console.log(`after the press: light ${JSON.stringify(await light())}, audio ${JSON.stringify(await audio())}`);
    // moments of the strike (director seconds after the press), each frozen with the debug pause for its still
    for (const [name, at] of [['press', 0.05], ['flicker-1', 0.24], ['flicker-2', 0.66], ['flicker-3', 0.86], ['flicker-4', 1.7], ['flicker-done', 2.8], ['lights-rising', 3.9]]) {
      const got = await page.evaluate(
        (s) =>
          new Promise((res) => {
            const tick = () => {
              const c = window.__app.current;
              const l = c?.titleLight;
              if (!l || l.phase === 'done' || l.igniteT >= s) {
                if (c) c.debugPause = true;
                res(l);
              } else requestAnimationFrame(tick);
            };
            tick();
          }),
        at,
      );
      await page.waitForTimeout(120);
      await page.screenshot({ path: `${out}/s4-${name}.png` });
      await page.evaluate(() => {
        if (window.__app.current) window.__app.current.debugPause = false;
      });
      console.log(`saved ${out}/s4-${name}.png (at ${got?.igniteT?.toFixed(2)} s: goggle ${got?.glow?.toFixed(2)}, lights ${got?.lit?.toFixed(2)}, phase ${got?.phase})`);
    }
    await page.waitForFunction(() => window.__app.current?.titleLight?.phase === 'done' && window.__app.current?.shotId === 'T2', null, { timeout: 15000 }).catch(() => {});
    const done = await light();
    await page.screenshot({ path: `${out}/s4-menu-first.png` });
    console.log(`saved ${out}/s4-menu-first.png (shot ${await page.evaluate(() => window.__app.current?.shotId)}, light ${JSON.stringify(done)})`);
    if (done?.phase !== 'done' || done.lit !== 1) fail(`the lights did not come up into the main menu (${JSON.stringify(done)})`);
  }

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
