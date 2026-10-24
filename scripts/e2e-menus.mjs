// Menu parity (menu-ui steps 03 and 05, SPEC 4 and 9): the main menu and GAME / SETTINGS driven by keyboard, mouse and a
// fake pad - default focus, moves (arrows, WASD, d-pad), wrap, confirm (Enter, Space, click, A), Back targets (Esc,
// Backspace, B, mouse button 4, the legend), every legend item by click, tabs (Q / E, LB / RB, header and glyph clicks)
// with focus memory, cyclers and sliders (hold accelerates), Defaults (Cancel first), a locked row, the remap capture
// (Esc / Start cancel), and a device switch that moves no element (bounding boxes within 0.5 px).
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
// (slice 6) the parity checks hold the cheapest background shot (T2) so a software-GL frame rate never starves the
// input timing; the cinematic block below launches its own pages for the cycling, the hooks and reduced motion
const { browser, page, errors } = await launch({ url, params: 'menuShot=T2', viewport: { width: 1920, height: 1080 } });
const G = (f, a) => page.evaluate(f, a);
const key = async (k) => {
  await page.keyboard.press(k);
  await frames(page, 3);
};
const fk = () => G(() => window.__app.nav.focused?.dataset.key ?? '(none)');
const top = () => G(() => window.__app.screens.top?.el.classList[1] ?? '(none)');
const tab = () => G(() => document.querySelector('.settings-screen .tab.active')?.textContent ?? '');
const centre = (sel) => G((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
const hover = async (sel) => {
  const [x, y] = await centre(sel);
  await page.mouse.move(x - 3, y, { steps: 1 });
  await page.mouse.move(x, y, { steps: 2 });
  await frames(page, 2);
};
const clickAt = async (sel) => {
  const [x, y] = await centre(sel);
  await page.mouse.move(x, y, { steps: 2 });
  await page.mouse.click(x, y);
  await frames(page, 3);
};
const mouseBack = async () => {
  await G(() => document.body.dispatchEvent(new PointerEvent('pointerdown', { button: 3, pointerType: 'mouse', bubbles: true })));
  await G(() => document.body.dispatchEvent(new PointerEvent('pointerup', { button: 3, pointerType: 'mouse', bubbles: true })));
  await frames(page, 3);
};
const boxes = (scope) =>
  G((s) => [...document.querySelectorAll(`${s} .ms-lg, ${s} [data-focus], ${s} .ms-bump, ${s} .tab`)].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }), scope);
// (slice 6) a short settle after each switch: two frames are only ~100 ms at a fast frame rate, inside the menu's CSS
// transitions, so the boxes were read mid-transition
const sameBoxes = async (scope) => {
  await G(() => window.__app.input.setMode('kbm'));
  await frames(page, 2);
  await page.waitForTimeout(400);
  const a = await boxes(scope);
  await G(() => window.__app.input.setMode('gamepad'));
  await frames(page, 2);
  await page.waitForTimeout(400);
  const b = await boxes(scope);
  await G(() => window.__app.input.setMode('kbm'));
  await frames(page, 2);
  const moved = a.filter((r, i) => !b[i] || r.some((v, j) => Math.abs(v - b[i][j]) > 0.5)).length;
  return { n: a.length, moved: a.length === b.length ? moved : -1 };
};

try {
  await page.waitForSelector('.main-menu .ms-item.focused', { timeout: 60000 });
  // (ipad-fit) the version label sits fully inside the viewport
  const verBox = await G(() => {
    const r = document.querySelector('.main-menu .version').getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight };
  });
  assert(verBox.l >= 0 && verBox.t >= 0 && verBox.r <= verBox.w && verBox.b <= verBox.h, 'the version label is fully inside the viewport (' + JSON.stringify(verBox) + ')');
  await frames(page, 5);
  // (menu-notes notes 2 / 4) the load screen held the menu until Wren's close-up LOD was drawn (`?gfx=min`: LOD2)
  const gate = await G(() => { const s = window.__app.current; return { gate: s.bootGate, lod: s.heroLod, want: s.heroLodWanted, hold: window.__app.bootHold }; });
  console.log(`load screen gate: ${gate.gate}`);
  // ('ready', or the 12 s automation cap: software GL under load may not finish compiling in time, so a cap expiry is
  // logged, not failed; an error, a stall or a stranded hold fails)
  assert((gate.gate.startsWith('ready') || /^timeout: .*cap of 12 s/.test(gate.gate)) && gate.lod === gate.want && !gate.hold, `load screen: the menu shows with Wren's close-up LOD drawn (${JSON.stringify(gate)})`);

  console.log('main menu: keyboard');
  assert((await fk()) === 'sectorops', `default focus Sector Ops (${await fk()})`);
  await key('ArrowDown');
  const k1 = await fk();
  await key('KeyS');
  const k2 = await fk();
  await key('KeyW');
  assert(k1 !== 'sectorops' && k2 !== k1 && (await fk()) === k1, `arrows and WASD move the focus (${k1}, ${k2}, back to ${await fk()})`);
  await key('ArrowUp');
  await key('ArrowUp');
  const wrapped = await fk();
  assert(wrapped === (await G(() => [...document.querySelectorAll('.main-menu .ms-item')].at(-1).dataset.key)), `up from the first item wraps to the last (${wrapped})`);
  for (let i = 0; i < 10 && (await fk()) !== 'settings'; i++) await key('ArrowUp');
  await key('Space');
  assert((await top()) === 'settings-screen', 'Space confirms (Settings opens)');
  await key('Backspace');
  assert((await top()) === 'main-menu' && (await fk()) === 'settings', `Backspace returns, focus restored on Settings (${await fk()})`);
  await key('Enter');
  assert((await top()) === 'settings-screen', 'Enter confirms');
  await key('Escape');
  assert((await top()) === 'main-menu', 'Esc returns to the main menu');

  console.log('main menu: mouse');
  await hover('.main-menu [data-key="loadout"]');
  assert((await fk()) === 'loadout', `hover moves the focus (${await fk()})`);
  await clickAt('.main-menu [data-key="settings"]');
  assert((await top()) === 'settings-screen', 'a click confirms the item under the cursor');
  await mouseBack();
  assert((await top()) === 'main-menu' && (await fk()) === 'settings', 'mouse button 4 is Back');
  const mm = await sameBoxes('.main-menu');
  assert(mm.n >= 6 && mm.moved === 0, `main menu: a device switch moves nothing (${mm.n} boxes, ${mm.moved} moved)`); // (5 items since 4.7.0 + the Select legend; menu-notes A1 dropped Back)
  // (menu-notes A1) the root menu has no Back legend item and Back does nothing (no way back to the title)
  assert(await G(() => !document.querySelector('.main-menu .ms-lg[data-legend="back"]')), 'the root menu legend has no Back item');
  await key('Escape');
  assert((await top()) === 'main-menu', 'Back on the root menu stays on the main menu');
  // every legend item by click: Select opens the focused item
  await clickAt('.main-menu .ms-lg[data-legend="confirm"]');
  assert((await top()) === 'settings-screen', 'the Select legend confirms the focused item');

  console.log('settings: tabs, rows, legend');
  assert((await tab()) === 'Controls' && (await fk()) === 'remap', `Controls first, Remap focused (${await tab()}, ${await fk()})`);
  const ctx = await G(() => ({ shown: !document.querySelector('.settings-screen .ms-ctx').hidden, t: document.querySelector('.settings-screen .ms-ctx').textContent }));
  assert(ctx.shown && /Remap controls/.test(ctx.t) && ctx.t.length > 30, `the focused row's description is in the context panel (${ctx.t.slice(0, 60)})`);
  const missing = await G(() => [...document.querySelectorAll('.settings-screen .tab-panel [data-focus]')].filter((e) => !e.dataset.ctx && !e.closest('.feedback-list')).map((e) => e.dataset.key));
  assert(missing.length === 0, `every row has a description (${missing.join(', ')})`);
  for (let i = 0; i < 8 && (await fk()) !== 'crouch'; i++) await key('ArrowDown');
  assert((await fk()) === 'crouch', 'focus on Crouch');
  await key('KeyE');
  assert((await tab()) === 'Gameplay', 'E: next tab');
  await key('KeyQ');
  assert((await tab()) === 'Controls' && (await fk()) === 'crouch', `Q: back to Controls, its focus remembered (${await fk()})`);
  // a cycler: arrows, A / D, Enter, Space, click the row, click the arrows
  const ct = () => G(() => window.__app.settings.get().gameplay.crouchToggle);
  const c0 = await ct();
  await key('ArrowRight');
  const c1 = await ct();
  await key('KeyD');
  const c2 = await ct();
  await key('Enter');
  const c3 = await ct();
  await key('Space');
  const c4 = await ct();
  assert(c1 !== c0 && c2 === c0 && c3 !== c0 && c4 === c0, `cycler: right, D, Enter and Space each step it (${[c0, c1, c2, c3, c4]})`);
  await clickAt('.settings-screen [data-key="crouch"] .choice-arrow:last-child');
  const c5 = await ct();
  await clickAt('.settings-screen [data-key="crouch"] .row-label');
  assert(c5 !== c0 && (await ct()) === c0 && (await fk()) === 'crouch', 'cycler: clicking the arrow and the row step it');
  // Defaults: X / R opens the confirm with Cancel focused; Esc keeps everything; Reset restores the tab
  await key('ArrowRight');
  const changed = await ct();
  await key('KeyR');
  let dg = await G(() => ({ d: !!document.querySelector('.dialog-screen'), t: document.querySelector('.dialog-title')?.textContent, f: window.__app.nav.focused?.textContent }));
  assert(dg.d && /Reset Controls to defaults/.test(dg.t) && /Cancel/.test(dg.f), `R: Defaults asks first, Cancel focused (${JSON.stringify(dg)})`);
  await key('Escape');
  assert(!(await G(() => !!document.querySelector('.dialog-screen'))) && (await ct()) === changed, 'Esc in the dialog is Cancel: nothing reset');
  await clickAt('.settings-screen .ms-lg[data-legend="x"]');
  assert(await G(() => !!document.querySelector('.dialog-screen')), 'the Defaults legend item opens the same dialog');
  await key('ArrowRight');
  await key('Enter');
  assert((await ct()) === true && (await top()) === 'settings-screen', 'Reset restores the tab defaults');
  // tab clicks: the RB glyph, a header, the LB legend item
  await clickAt('.settings-screen .ms-bump[data-bump="rb"]');
  assert((await tab()) === 'Gameplay', 'clicking the RB glyph: next tab');
  // (anim-fix-pass AF5, BRIEF A1) mocap is the only player path: no "Mocap locomotion" row
  const gp = await G(() => [...document.querySelectorAll('.settings-screen .tab-panel [data-focus]')].filter((e) => e.offsetParent).map((e) => e.textContent ?? ''));
  assert(gp.length >= 2 && !gp.some((t) => /mocap/i.test(t)), `Gameplay has no Mocap locomotion row (${gp.length} rows: ${gp.map((t) => t.slice(0, 20)).join(' | ')})`);
  await clickAt('.settings-screen .tab[data-tab="access"]');
  assert((await tab()) === 'Accessibility' && (await fk()) === 'subtitles', `clicking a header opens that tab, first row focused (${await fk()})`);
  await key('Enter');
  const toast = await G(() => document.querySelector('.toasts')?.textContent ?? '');
  assert(/always on/.test(toast) && (await fk()) === 'subtitles', 'a locked row stays focusable and toasts its reason');
  await clickAt('.settings-screen .ms-lg[data-legend="lb"]');
  assert((await tab()) === 'Audio', 'the LB legend item: previous tab');
  const st = await sameBoxes('.settings-screen');
  assert(st.n > 6 && st.moved === 0, `settings: a device switch moves nothing (${st.n} boxes, ${st.moved} moved)`);
  await clickAt('.settings-screen .ms-lg[data-legend="back"]');
  assert((await top()) === 'main-menu', 'the Back legend item returns to the main menu');

  console.log('settings: pad');
  await G(() => window.__pad.connect());
  await press(page, BTN.A);
  assert((await top()) === 'settings-screen' && (await G(() => document.body.classList.contains('input-gamepad'))), 'A opens Settings, glyphs switch to the pad');
  await press(page, BTN.START);
  assert((await top()) === 'settings-screen', 'Start is not Back outside pause');
  await press(page, BTN.RB);
  await press(page, BTN.RB);
  assert((await tab()) === 'Graphics', 'RB twice: Graphics');
  await press(page, BTN.X);
  dg = await G(() => ({ d: !!document.querySelector('.dialog-screen'), f: window.__app.nav.focused?.textContent }));
  await press(page, BTN.B);
  assert(dg.d && /Cancel/.test(dg.f) && !(await G(() => !!document.querySelector('.dialog-screen'))), 'X: Defaults, Cancel focused; B cancels');
  await press(page, BTN.RB);
  assert((await tab()) === 'Audio', 'RB: Audio');
  await press(page, BTN.DOWN);
  assert((await fk()) === 'effects', `d-pad down: Effects (${await fk()})`);
  // hold right: repeats after 0.4 s, x5 steps after 1 s (SPEC 4.2)
  await G(() => {
    window.__fast = 0;
    window.__app.nav.focused.addEventListener('nav-adjust', (e) => void (window.__fast += e.detail.fast ? 1 : 0));
    window.__app.settings.update((d) => void (d.audio.sfx = 0));
    window.__holdFrames = 0;
    const tick = () => { window.__holdFrames++; if (window.__holdFrames < 1e6) requestAnimationFrame(tick); };
    tick();
  });
  // wait on the condition, not wall time: the repeat runs on frames, which stall under load
  await G((b) => window.__pad.set(b, 1), BTN.RIGHT);
  await page
    .waitForFunction(() => window.__fast > 0 && window.__app.settings.get().audio.sfx > 0.2, null, { timeout: 15000, polling: 100 })
    .catch(() => {});
  await G((b) => window.__pad.set(b, 0), BTN.RIGHT);
  await frames(page, 3);
  const hold = await G(() => ({ fast: window.__fast, v: window.__app.settings.get().audio.sfx, frames: window.__holdFrames, shot: window.__app.current?.shotId, fade: window.__app.current?.shotFade }));
  assert(hold.fast > 0 && hold.v > 0.2, `holding right repeats and accelerates (${JSON.stringify(hold)})`);
  await press(page, BTN.B);
  assert((await top()) === 'main-menu', 'B returns to the main menu');

  console.log('remap: keyboard Esc and pad Start cancel a capture');
  await press(page, BTN.A);
  for (let i = 0; i < 6 && (await tab()) !== 'Controls'; i++) await press(page, BTN.LB);
  await G(() => [...document.querySelectorAll('.settings-screen .tab-panel.active .btn')].find((b) => /Remap controls/.test(b.textContent)).click());
  await frames(page, 3);
  assert((await top()) === 'controls-screen' && (await G(() => document.querySelector('.controls-screen .tab.active')?.dataset.tab)) === 'pad', 'Remap opens on the current device (Controller)');
  await press(page, BTN.A);
  assert(await G(() => window.__app.input.gamepad.capturing && !!document.querySelector('.cap-overlay')), 'A starts a capture with the overlay');
  await press(page, BTN.START);
  await frames(page, 3);
  assert(!(await G(() => window.__app.input.gamepad.capturing)) && (await top()) === 'controls-screen', 'Start cancels it, the screen stays');
  await press(page, BTN.RB);
  await G(() => window.__app.input.setMode('kbm'));
  await G(() => window.__app.nav.focus(document.querySelector('.controls-screen .tab-panel.active .kb-key[data-bind="coop:0"]')));
  await key('Enter');
  const capK = await G(() => window.__app.input.kbm.capturing);
  await key('Escape');
  const after = await G(() => ({ cap: window.__app.input.kbm.capturing, ping: window.__app.settings.get().keys.coop.join() }));
  assert(capK && !after.cap && after.ping === 'KeyF,PageDown' && (await top()) === 'controls-screen', `keyboard: Esc cancels a capture (${JSON.stringify(after)})`);
  const rm = await sameBoxes('.controls-screen');
  assert(rm.n > 10 && rm.moved === 0, `remap: a device switch moves nothing (${rm.n} boxes, ${rm.moved} moved)`);
  await key('Escape');
  assert((await top()) === 'settings-screen', 'Esc: Remap back to Settings');

  // slice 6: the cinematic background - the shot hook, the fast clock, navigation during a fade, reduced motion
  console.log('cinematic background');
  const shotOf = (P) => P.evaluate(() => ({ id: window.__app.current?.shotId, n: window.__app.current?.shotChanges ?? -1, fade: window.__app.current?.shotFade ?? 0 }));
  assert(/^(T2|H[1-6]|W[1-3])$/.test((await shotOf(page)).id), `the main menu runs a cinematic shot (${(await shotOf(page)).id})`);
  {
    const F = await launch({ url, params: 'menuShot=H3', viewport: { width: 1280, height: 720 } });
    try {
      await F.page.waitForSelector('.main-menu .ms-item.focused', { timeout: 60000 });
      await frames(F.page, 30);
      const s = await shotOf(F.page);
      assert(s.id === 'H3', `?menuShot=H3 reports H3 through the debug hook (${s.id})`);
      const pe = F.errors.filter((e) => (e.startsWith('[pageerror]') || e.startsWith('[error]')) && !e.includes('GPU stall') && !e.includes('swiftshader'));
      assert(!pe.length, `no page errors (${pe.join(' | ')})`);
    } finally {
      await F.browser.close();
    }
  }
  {
    const F = await launch({ url, params: 'menuClock=fast', viewport: { width: 1280, height: 720 } });
    try {
      await F.page.waitForSelector('.main-menu .ms-item.focused', { timeout: 60000 });
      const s0 = await shotOf(F.page);
      // (load-latent-ui1) was 8 s of wall time: under CPU load few frames ran and the menu clock (clamped frame dt) had not
      // reached the next shot. 8 s of frame time (summed min(dt, 0.1), as the loop clamps it), 120 s real-time cap; the
      // assert below fails a miss. The cap is also a timer, in case rAF stops
      await F.page.evaluate((n) => new Promise((res) => {
        const w0 = performance.now();
        let last = w0;
        let sum = 0;
        const cap = setTimeout(res, 120000);
        const tick = (t) => {
          sum += Math.min(Math.max(t - last, 0) / 1000, 0.1);
          last = t;
          if ((window.__app.current?.shotChanges ?? 0) > n || sum >= 8 || t - w0 > 120000) {
            clearTimeout(cap);
            res();
          } else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }), s0.n);
      const s1 = await shotOf(F.page);
      assert(s1.n > s0.n && s1.id !== s0.id, `?menuClock=fast changes the shot within a few seconds (${s0.id} -> ${s1.id})`);
      // during a fade the menu still moves: wait for black over the stage, move the focus in that frame
      const r = await F.page.evaluate(
        () =>
          new Promise((res) => {
            // (load-latent-ui1) gives up after 10 s of frame time (summed min(dt, 0.1)), not 10 s of wall time: under CPU
            // load the menu clock ran slower than the wall. 120 s real-time cap (also a timer, in case rAF stops)
            const t0 = performance.now();
            let last = t0;
            let sum = 0;
            const cap = setTimeout(() => res({ fade: window.__app.current?.shotFade ?? 0, before: '', after: '' }), 120000);
            const tick = () => {
              const now = performance.now();
              sum += Math.min(Math.max(now - last, 0) / 1000, 0.1);
              last = now;
              const fade = window.__app.current?.shotFade ?? 0;
              if (fade > 0.15) {
                clearTimeout(cap);
                const before = window.__app.nav.focused?.dataset.key;
                window.__app.nav.move('down');
                res({ fade, before, after: window.__app.nav.focused?.dataset.key });
              } else if (sum >= 10 || now - t0 > 120000) {
                clearTimeout(cap);
                res({ fade, before: '', after: '' });
              } else requestAnimationFrame(tick);
            };
            tick();
          }),
      );
      assert(r.fade > 0.15 && r.before && r.after && r.before !== r.after, `the menu is navigable during a transition (fade ${r.fade.toFixed(2)}, ${r.before} -> ${r.after})`);
      await F.page.keyboard.press('ArrowDown');
      await frames(F.page, 3);
      assert((await F.page.evaluate(() => window.__app.nav.focused?.dataset.key)) !== r.after, 'a key press still moves the focus');
      // reduced motion: S1 held, no changes, no fade
      await F.page.emulateMedia({ reducedMotion: 'reduce' });
      await F.page.reload();
      await F.page.waitForSelector('.main-menu .ms-item.focused', { timeout: 60000 });
      await F.page.waitForTimeout(3000);
      const rm = await shotOf(F.page);
      assert(rm.id === 'T2' && rm.n === 0 && rm.fade === 0, `reduced motion holds T2 (${JSON.stringify(rm)})`);
      const pe = F.errors.filter((e) => (e.startsWith('[pageerror]') || e.startsWith('[error]')) && !e.includes('GPU stall') && !e.includes('swiftshader'));
      assert(!pe.length, `no page errors (${pe.join(' | ')})`);
    } finally {
      await F.browser.close();
    }
  }
  // (menu-notes slice 4a, M1) the title in full darkness until the press; the press strikes the goggle, then the lights
  // come up and T2 opens the main menu (light state read back from MenuState.titleLight; pixels are a GPU check)
  {
    const F = await launch({ url, params: 'title=1', viewport: { width: 1280, height: 720 } });
    try {
      await F.page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done') && window.__app.screens.top?.el.classList.contains('title-screen'), null, { timeout: 90000 });
      // (M2) the prompt has faded in after the load (the wordmark-only boot itself: menu-boot-shots.mjs)
      await F.page.waitForFunction(() => getComputedStyle(document.querySelector('.title-screen .ts-press')).filter === 'none', null, { timeout: 10000, polling: 100 }).catch(() => {});
      const pr = await F.page.evaluate(() => ({ wait: !!document.querySelector('.title-screen.ts-wait'), f: getComputedStyle(document.querySelector('.title-screen .ts-press')).filter }));
      assert(!pr.wait && pr.f === 'none', `the press prompt fades in once the menu is ready (${JSON.stringify(pr)})`);
      const tl = () => F.page.evaluate(() => window.__app.current?.titleLight);
      const dk = await tl();
      assert(dk?.phase === 'dark' && dk.lit === 0 && dk.glow === 0 && dk.spots === 0 && dk.hemi === 0 && dk.ambient === 0 && dk.clear === 0 && dk.goggle === 0 && dk.lens === 0, `the title is dark: no light, no goggle (${JSON.stringify(dk)})`);
      await F.page.keyboard.press('Space');
      await F.page.waitForFunction(() => window.__app.current?.titleLight?.phase !== 'dark', null, { timeout: 10000 }).catch(() => {});
      // (slice 4c, M3) the title stays on top as a clear layer (prompt and wordmark fading out), no menu under it, while
      // the goggle strikes; the music is not asked to start again (it began on the press)
      // (test-speed) the fade is real time: wait for it (or the strike's end) instead of a fixed 0.5 s that a loaded
      // machine's slow frames did not cover (card opacity 0.57, 2026-10-20)
      await F.page.waitForFunction(() => getComputedStyle(document.querySelector('.title-screen .ts-card')).opacity === '0' || window.__app.current?.titleLight?.phase === 'done', null, { timeout: 8000, polling: 100 }).catch(() => {});
      const sq = await F.page.evaluate(() => ({
        phase: window.__app.current?.titleLight?.phase,
        top: window.__app.screens.top?.el.classList[1],
        seq: window.__app.screens.top?.seqPhase,
        card: getComputedStyle(document.querySelector('.title-screen .ts-card')).opacity,
        menu: document.querySelector('.main-menu')?.hidden,
      }));
      assert((sq.phase === 'ignite' || sq.phase === 'done') && sq.top === 'title-screen' && sq.seq === 'seq' && sq.menu === true, `the press strikes the goggle in the dark with no menu UI (${JSON.stringify(sq)})`);
      assert(sq.card === '0' || sq.phase === 'done', `the prompt and wordmark have faded out (${sq.card})`);
      // the menu is in once the lights are up (input blocked until then)
      await F.page.waitForFunction(() => window.__app.screens.top?.el.classList.contains('main-menu'), null, { timeout: 60000 }).catch(() => {});
      const up = await tl();
      const sid = await F.page.evaluate(() => window.__app.current?.shotId);
      const topIn = await F.page.evaluate(() => window.__app.screens.top?.el.classList[1]);
      assert(topIn === 'main-menu' && up?.phase === 'done' && up.lit === 1 && up.spots > 0 && sid === 'T2', `then the lights are up, T2 opens and the main menu is in (${topIn}, ${JSON.stringify(up)}, ${sid})`);
    } finally {
      await F.browser.close();
    }
  }
  // (slice 4c fix, A3) a mouse start then Enter during the black: the skip lands on the lit menu, nothing opened
  {
    const F = await launch({ url, params: 'title=1', viewport: { width: 1280, height: 720 } });
    try {
      await F.page.waitForFunction(() => document.getElementById('boot')?.classList.contains('done') && window.__app.screens.top?.el.classList.contains('title-screen'), null, { timeout: 90000 });
      await F.page.waitForTimeout(1000);
      await F.page.click('.title-screen .ts-press');
      await F.page.waitForTimeout(400);
      await F.page.keyboard.press('Enter');
      await F.page.waitForFunction(() => window.__app.screens.top?.el.classList.contains('main-menu'), null, { timeout: 10000 }).catch(() => {});
      await F.page.waitForTimeout(300);
      const s = await F.page.evaluate(() => ({ top: window.__app.screens.top?.el.classList[1], depth: window.__app.screens.depth, f: window.__app.nav.focused?.dataset.key, phase: window.__app.current?.titleLight?.phase }));
      assert(s.top === 'main-menu' && s.depth === 1 && s.f === 'sectorops' && s.phase === 'done', `click to start, Enter skips to the lit main menu and opens nothing (${JSON.stringify(s)})`);
    } finally {
      await F.browser.close();
    }
  }

  // slice 4 (sector-ops slice 1): Sector Ops and its briefing, the issued kit; Missions, Training and Free roam only
  // with ?legacy=1 (e2e-park)
  await key('Escape');
  assert((await top()) === 'main-menu', 'Esc: Settings back to the main menu');
  const menuKeys = await G(() => [...document.querySelectorAll('.main-menu .ms-item')].map((b) => b.dataset.key).join(','));
  // (anim-studio) the developer row Anim Studio (dev) last
  assert(menuKeys === 'sectorops,coop,loadout,settings,feedback,anim-studio', `the main menu is Sector Ops, Co-op, Loadout, Settings, Feedback, Anim Studio (dev) (${menuKeys})`);
  // (marlow-bays R1) no rejoin row without a room; a room left in the last 10 minutes shows "Rejoin <code>" after Co-op
  const rj = await G(() => {
    sessionStorage.setItem('ns-rejoin', JSON.stringify({ code: 'ABCDE', role: 'client', at: Date.now(), mode: 'course', map: 'ctcourse', difficulty: 'normal', mission: '', weather: 'clear', bay: 2 }));
    window.__app.screens.top.onShow();
    const keys = [...document.querySelectorAll('.main-menu .ms-item')].map((b) => b.dataset.key).join(',');
    const label = document.querySelector('.main-menu [data-key="rejoin"] .btn-label')?.textContent ?? '';
    return { keys, label };
  });
  assert(rj.keys === 'sectorops,rejoin,coop,loadout,settings,feedback,anim-studio' && rj.label === 'Rejoin ABCDE', `a left room shows Rejoin <code> on the main menu (${JSON.stringify(rj)})`);
  await G(() => {
    sessionStorage.removeItem('ns-rejoin');
  });
  await G(() => window.__app.nav.focus(document.querySelector('.main-menu [data-key="sectorops"]')));
  await key('Enter');
  // (sector-ops M7) Sector Ops opens the op list: the Warehouse with its four difficulty stars
  assert((await top()) === 'sectorops-screen' && (await fk()) === 'op-warehouseOps', `Enter opens the op list on the Warehouse (${await top()}, ${await fk()})`);
  const opStars = await G(() => document.querySelector('.sectorops-screen [data-op="warehouseOps"] .ms-ctr')?.textContent ?? '');
  assert(/^[★☆]{4}$/.test(opStars), `the op shows four difficulty stars (${opStars})`);
  await key('Enter');
  assert((await top()) === 'briefing-screen' && (await fk()) === 'deploy', `the op opens the Sector Ops briefing on Start (${await fk()})`);
  const nSec = await G(() => document.querySelectorAll('.briefing-screen .br-obj li').length);
  assert(nSec >= 3, `the briefing lists the sectors (${nSec})`);
  const diff0 = await G(() => document.querySelector('.briefing-screen [data-diff="choice"] .choice-val').textContent);
  await key('ArrowUp');
  await key('ArrowUp');
  assert((await fk()) === 'difficulty', `Up reaches Difficulty (${await fk()})`);
  await key('ArrowRight');
  const diff1 = await G(() => document.querySelector('.briefing-screen [data-diff="choice"] .choice-val').textContent);
  assert(diff0 === 'Normal' && diff1 === 'Realistic' && (await G(() => document.querySelectorAll('.briefing-screen [data-diff]:not([data-diff="choice"])').length)) === 0, `four fixed levels, no Custom (${diff0} -> ${diff1})`);
  await key('ArrowLeft');
  await G(() => window.__app.input.setMode('gamepad'));
  await press(page, BTN.B);
  await frames(page, 3);
  assert((await top()) === 'sectorops-screen', 'B: Briefing back to the op list');
  await press(page, BTN.B);
  await frames(page, 3);
  assert((await top()) === 'main-menu', 'B: the op list back to the main menu');
  await G(() => window.__app.input.setMode('kbm'));
  await G(() => window.__app.nav.focus(document.querySelector('.main-menu [data-key="loadout"]')));
  await key('Enter');
  assert((await top()) === 'kit-screen', 'Loadout opens the issued kit');
  const kitCtx = await G(() => document.querySelector('.kit-screen .ms-ctx')?.textContent ?? '');
  assert(/Power/.test(kitCtx) && /Not selectable/.test(kitCtx), 'the kit context shows stat bars and says it is fixed');
  await key('Escape');
  assert((await top()) === 'main-menu', 'Esc: kit back to the main menu');
  // slice 5: the field terminal pause, objectives, quit confirm, controller disconnect, results
  console.log('pause (slice 5)');
  // (havok-stall) the menu page is done: it leaves its 1920 x 1080 backdrop for a blank page, so on software GL its
  // renderer no longer shares the CPU with the match page's (which ran at about 1.5 frames a second beside it on the
  // desktop, 2.5-4 alone; the suite then ran past the runner's 600 s limit inside the tuner-camera block)
  await page.goto('about:blank');
  const M = await launch({ url, params: 'autostart=warehouse&mode=infiltration&mission=warehouse-courier&insertion=lot' });
  try {
    const P = M.page;
    const GM = (f, a) => P.evaluate(f, a);
    const mtop = () => GM(() => window.__app.screens.top?.el.classList[1] ?? '(none)');
    const mkey = (k) => GM(() => window.__app.nav.focused?.dataset.key ?? '(none)');
    await P.waitForFunction(() => window.__app.current?.player, null, { timeout: 90000 });
    await frames(P, 30);
    await GM(() => window.__app.current.pause());
    await frames(P, 4);
    assert((await mtop()) === 'pause-screen' && (await mkey()) === 'resume', 'pause opens on the field terminal with Resume focused');
    assert(await GM(() => getComputedStyle(document.querySelector('.hud')).display === 'none'), 'the HUD hides while paused');
    // (ipad-fit) the room line (a co-op room's pause) wraps in its own block: inside the viewport, off the help box
    await GM(() => {
      const n = document.createElement('div');
      n.className = 'ms-note ps-room';
      n.textContent = 'Room ABCDE. If either player drops, rejoin from the main menu with this code.';
      document.querySelector('.pause-screen .ms-body').append(n);
    });
    const roomFit = await GM(() => {
      const r = document.querySelector('.pause-screen .ps-room').getBoundingClientRect();
      const c = document.querySelector('.pause-screen .ms-ctx').getBoundingClientRect();
      const inside = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      const apart = r.right <= c.left || r.left >= c.right || r.bottom <= c.top || r.top >= c.bottom || c.width === 0;
      return { inside, apart, w: r.width, h: r.height };
    });
    assert(roomFit.inside && roomFit.apart, 'the pause room line sits inside the viewport and clear of the help box (' + JSON.stringify(roomFit) + ')');
    await GM(() => document.querySelector('.pause-screen .ps-room').remove());
    const keys = await GM(() => [...document.querySelectorAll('.pause-screen .ms-item')].map((b) => b.dataset.key).join(','));
    // (menu-notes A2) no separate Controls item: controls live in Settings > Controls
    // (anim-tuner pass 3) the dev row "Animation tuner (dev)" before Quit (Up from Resume still wraps to Quit)
    // (batch-23) no Anim Studio row in the pause menu: the studio opens from the main menu only
    assert(keys === 'resume,objectives,settings,report-feedback,anim-tuner,quit', `pause items (${keys})`);
    assert(!keys.includes('anim-studio') && keys.includes('anim-tuner'), `the pause menu has Animation tuner (dev) and no Anim Studio row (${keys})`);
    await GM(() => { const b = document.querySelector('.pause-screen [data-key="objectives"]'); window.__app.nav.focus(b); b.click(); });
    await frames(P, 3);
    const objs = await GM(() => [...document.querySelectorAll('.objectives-screen .ms-item')].map((b) => b.textContent));
    assert((await mtop()) === 'objectives-screen' && objs.length >= 2 && objs.some((t) => /Current/.test(t)), `Objectives lists the mission with a current one (${objs.length})`);
    await GM(() => document.querySelector('.objectives-screen [data-legend="back"]').click());
    await frames(P, 3);
    assert((await mtop()) === 'pause-screen' && (await mkey()) === 'objectives', 'Back from Objectives returns with focus kept');
    await GM(() => document.querySelector('.pause-screen [data-key="quit"]').click());
    await frames(P, 3);
    assert(await GM(() => document.querySelector('.dialog-buttons .btn.focused, .dialog-buttons .btn[data-focused]')?.textContent === 'Stay' || window.__app.nav.focused?.textContent === 'Stay'), 'Quit confirm opens on Stay');
    await GM(() => window.__app.screens.top.onBack());
    await frames(P, 3);
    assert((await mtop()) === 'pause-screen', 'Stay (Back) keeps the pause menu');
    // Start resumes; the simulation runs and the HUD is back
    await GM(() => window.__app.screens.top.onStart());
    await frames(P, 4);
    assert((await GM(() => window.__app.current.simulating)) && (await GM(() => getComputedStyle(document.querySelector('.hud')).display !== 'none')), 'Start resumes with the HUD back');
    // a controller dropping out mid-match opens pause with the reconnect line; a reconnect clears it
    await GM(() => { window.__pad.connect(); window.__app.input.setMode('gamepad'); });
    await frames(P, 4);
    await GM(() => window.__pad.disconnect());
    await frames(P, 6);
    const note = await GM(() => document.querySelector('.pause-screen .ps-notice:not([hidden])')?.textContent ?? '');
    assert(/Controller disconnected/.test(note), `controller disconnect opens pause with a reconnect line (${note})`);
    await GM(() => window.__pad.connect());
    await frames(P, 6);
    assert(!(await GM(() => !!document.querySelector('.pause-screen .ps-notice:not([hidden])'))), 'a reconnect clears the line');
    await GM(() => window.__app.screens.top.resume());
    await frames(P, 4);
    // (tuner-ui) the tuner by pad: Pause > Animation tuner (A) takes the pad on the Body tab's first picker and the game
    // holds still (pause while tuning); every value shows without touching it, readable on dark; the hint strip sits
    // under the rows; LB / RB cycle the tabs (wrapping); A opens a drop-down list (the D-pad moves, B backs out, A picks:
    // the state changes and the focus steps on to the sliders); A edits a slider (right / left adjust), B cancels, A
    // keeps, X resets; B from a slider goes back to the picker; Y opens the menu, B closes it; RT switches the state; RB
    // reaches Keys; the left stick does not reach the game; View hands the pad to the game (running) and back (held);
    // Menu (Start) closes and the game runs
    await GM(() => window.__app.current.pause());
    await frames(P, 4);
    await GM(() => window.__app.nav.focus(document.querySelector('.pause-screen [data-key="anim-tuner"]')));
    await press(P, BTN.A);
    await frames(P, 3);
    const tpad = () => GM(() => window.__animTune.pad());
    const tScale = () => GM(() => window.__app.loop.timeScale);
    const tp0 = await tpad();
    assert(tp0.mode === 'tuner' && tp0.tab === 'body' && /^(part|lv):/.test(tp0.key) && (await GM(() => !document.querySelector('.anim-tune').hidden)), `tuner: Pause > Animation tuner by pad opens it on the Body tab's picker (${JSON.stringify(tp0)})`);
    assert(tp0.frozen && (await tScale()) === 0, `tuner: the game holds still while the tuner has the pad (scale ${await tScale()})`);
    const tvis = await GM(() => {
      const nums = [...document.querySelectorAll('.anim-tune-tab:not([hidden]) .anim-tune-num')].filter((e) => e.offsetParent);
      const c = nums[0] ? getComputedStyle(nums[0]) : null;
      const rgb = (s) => (s?.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number).reduce((a, b) => a + b, 0);
      const btn = [...document.querySelectorAll('.anim-tune-tab:not([hidden]) .tt-btn')].find((b) => b.offsetParent && !b.closest('.tt-focus'));
      const hb = document.querySelector('.anim-tune-hints').getBoundingClientRect();
      const bb = document.querySelector('.anim-tune-body').getBoundingClientRect();
      return { n: nums.length, vals: nums.map((e) => e.value), fg: rgb(c?.color), btnFg: rgb(btn && getComputedStyle(btn).color), btnBg: rgb(btn && getComputedStyle(btn).backgroundColor), hintTop: hb.top, bodyBottom: bb.bottom, hintH: hb.height };
    });
    assert(tvis.n > 0 && tvis.vals.every((v) => v !== '' && Number.isFinite(Number(v))), `tuner: every value shows without touching it (${tvis.n} rows: ${tvis.vals.slice(0, 4).join(', ')})`);
    assert(tvis.fg > 450 && tvis.btnFg > 450 && tvis.btnBg < 300, `tuner: values and buttons are light on dark (value ${tvis.fg}, button ${tvis.btnFg} on ${tvis.btnBg})`);
    assert(tvis.hintH > 10 && tvis.hintTop >= tvis.bodyBottom - 0.5, `tuner: the hint strip is reserved space under the rows (${tvis.hintTop.toFixed(1)} >= ${tvis.bodyBottom.toFixed(1)})`);
    // LB / RB cycle the tabs
    const tabSeq = [];
    for (const b of [BTN.RB, BTN.LB, BTN.LB, BTN.LB, BTN.RB, BTN.RB]) {
      await press(P, b);
      tabSeq.push((await tpad()).tab);
    }
    // (marlow-bays item 29) no Settings tab (More holds it): LB from View wraps to the last tab
    const tLast = (await GM(() => window.__animTune.tabs())).slice(-1)[0];
    assert(tabSeq.join(',') === `hands,body,view,${tLast},view,body` && tLast !== 'settings', `tuner: LB / RB cycle the tabs and wrap (${tabSeq.join(',')})`);
    // the drop-down: the state picker opens as a list, B backs out, A picks and the focus steps on
    for (let i = 0; i < 4 && !(await tpad()).key.startsWith('lv:body:'); i++) await press(P, BTN.DOWN);
    const g0 = await GM(() => window.__animTune.group('body'));
    await press(P, BTN.A);
    const dl = await tpad();
    const dlShown = await GM(() => { const l = document.querySelector('.anim-tune-drop-list'); return l.hidden ? 0 : l.children.length; });
    assert(dl.list && dlShown >= 10 && dl.key === 'lv:body:0', `tuner: A opens the state list where you can see the choices (${JSON.stringify({ key: dl.key, list: dl.list, shown: dlShown })})`);
    await press(P, BTN.DOWN);
    const dl1 = await tpad();
    await press(P, BTN.B);
    assert(dl1.listIndex === Math.min(dl.listIndex + 1, dl.listLength - 1) && !(await tpad()).list && (await GM(() => window.__animTune.group('body'))) === g0, `tuner: the D-pad moves in the list, B backs out with nothing changed (${dl.listIndex} -> ${dl1.listIndex})`);
    await press(P, BTN.A);
    if (dl.listIndex === dl.listLength - 1) await press(P, BTN.UP);
    else await press(P, BTN.DOWN);
    await press(P, BTN.A);
    const g1 = await GM(() => window.__animTune.group('body'));
    const tpk = await tpad();
    assert(g1 !== g0 && !tpk.list && tpk.key.startsWith('s:body:'), `tuner: A picks the state and the focus steps on to its sliders (${g0} -> ${g1}, ${tpk.key})`);
    const ts = await tpad();
    const tv = () => GM((q) => window.__animTune.get(q.group, q.id), ts);
    const tv0 = await tv();
    // (marlow-bays item 29) no edit mode: on a slider the D-pad right / left (and the left stick) change the value and
    // the focus stays
    await press(P, BTN.RIGHT);
    if ((await tv()) === tv0) await press(P, BTN.LEFT); // at the top of its range
    const tv1 = await tv();
    assert(tv1 !== tv0 && (await tpad()).key === ts.key && !(await tpad()).editing, `tuner: right / left on a slider change its value, the focus stays (${tv0} -> ${tv1})`);
    await GM(() => window.__pad.axis(0, -1));
    await frames(P, 20);
    await GM(() => window.__pad.axis(0, 0));
    await frames(P, 3);
    assert((await tv()) !== tv1 && (await tpad()).key === ts.key, `tuner: the left stick left changes the value (${tv1} -> ${await tv()})`);
    await press(P, BTN.X);
    assert((await tv()) === tv0, `tuner: X resets the row (${await tv()})`);
    await press(P, BTN.Y);
    const tm = await tpad();
    assert(tm.menu && tm.key.startsWith('m:'), `tuner: Y opens the menu (${tm.key})`);
    await press(P, BTN.B);
    assert(!(await tpad()).menu && (await tpad()).key === ts.key, 'tuner: B closes the menu, the focus comes back');
    await press(P, BTN.B);
    assert((await tpad()).key === 'lv:body:0', `tuner: B from a slider goes back to the state picker (${(await tpad()).key})`);
    // (item 29) the triggers and the right stick are the camera: the state stays, the orbit starts
    const s1 = await tpad();
    await press(P, BTN.RT);
    await GM(() => window.__pad.axis(2, 1));
    await frames(P, 10);
    await GM(() => window.__pad.axis(2, 0));
    await frames(P, 3);
    const s2 = await tpad();
    const fv = await GM(() => window.__animTune.freeState());
    assert(s2.sectionGroup === s1.sectionGroup && s2.key === s1.key && fv.mode === 'orbit' && fv.pad === 'tuner', `tuner: RT and the right stick move the camera (orbit), never the state or the focus (${s1.sectionGroup} -> ${s2.sectionGroup}, ${JSON.stringify(fv)})`);
    await GM(() => window.__animTune.free('off'));
    // RB steps through the tabs and reaches Keys
    let tpW = await tpad();
    for (let k = 0; k < 12 && tpW.tab !== 'keys'; k++) {
      await press(P, BTN.RB);
      tpW = await tpad();
    }
    assert(tpW.tab === 'keys' && String(await GM(() => window.__animTune.group('keys'))).startsWith('key.'), `tuner: the pad reaches the Keys tab (${JSON.stringify(tpW)})`);
    await GM(() => window.__pad.axis(1, -1));
    await frames(P, 8);
    const tMove = await GM(() => window.__app.input.state.move.y);
    await GM(() => window.__pad.axis(1, 0));
    await frames(P, 3);
    assert(tMove === 0, `tuner: the left stick does not reach the game while the tuner has the pad (${tMove})`);
    await press(P, BTN.SELECT);
    await frames(P, 3);
    assert((await tpad()).mode === 'game' && !(await tpad()).frozen && (await tScale()) === 1, `tuner: View hands the pad to the game and it runs (scale ${await tScale()})`);
    await press(P, BTN.SELECT);
    await frames(P, 3);
    const fz = await tpad();
    assert(fz.mode === 'tuner' && fz.frozen && (await tScale()) === 0, `tuner: View back to the tuner holds the game still (${JSON.stringify(fz)}, scale ${await tScale()})`);
    await press(P, BTN.START);
    await frames(P, 3);
    const tp2 = await tpad();
    assert(tp2.mode === 'off' && (await GM(() => document.querySelector('.anim-tune').hidden)) && (await tScale()) === 1, `tuner: Menu closes it and the game runs (${tp2.mode}, scale ${await tScale()})`);
    // (tuner-camera) the camera state's distance slider pulls the follow camera in live; its reset puts it back
    // (havok-stall) the settles run on the sim clock (frame updates without rendering), not 360 rendered frames
    const settle = async (s) => {
      await GM((t) => window.__app.loop.stepHeadless(t), s);
      await frames(P, 2);
    };
    await settle(0.5);
    const camG = await GM(() => window.__animTune.state.cam);
    const camBoom = () => GM(() => window.__app.current.player.cam.boomActual);
    const cb0 = await camBoom();
    await GM((g) => window.__animTune.set(g, 'camBoomAdd', -0.8), camG);
    await settle(3);
    const cb1 = await camBoom();
    await GM((g) => window.__animTune.set(g, 'camBoomAdd', 0), camG);
    await settle(6);
    const cb2 = await camBoom();
    assert(camG.startsWith('cam.') && (cb1 < cb0 - 0.3 || cb0 < 1.2), `tuner: a camera distance slider (${camG}) pulls the camera in live (${cb0.toFixed(2)} -> ${cb1.toFixed(2)} m)`);
    assert(Math.abs(cb2 - cb0) < 0.05, `tuner: the camera slider's reset puts the distance back (${cb0.toFixed(2)} -> ${cb2.toFixed(2)} m)`);
    // (anim-weight) the Weight section is on the panel and its follow group is written every frame
    const wsec = await GM(() => ({ ids: window.__animTune.sections(), g: window.__animTune.state.weight ?? '', rows: !!document.querySelector('.anim-tune-rows-weight') }));
    assert(wsec.ids.includes('weight') && wsec.g.startsWith('weight.') && wsec.rows, `tuner: the Weight section is listed and follows its group (${JSON.stringify(wsec)})`);
    // (tuner-v2 wiring) the Joints / Hands & feet / IK strength / Weapon sections are in the panel; a joint slider set
    // through the panel (the active state's group) reaches item 1's table; its reset puts it back
    const v2 = await GM(() => {
      const panel = document.querySelector('.anim-tune');
      const secs = ['joint', 'hand', 'ik', 'weapon', 'step', 'keys'].filter((k) => panel.querySelector(`.anim-tune-pick-${k}`) && panel.querySelector(`.anim-tune-rows-${k}`));
      const g = window.__animTune.state.joint;
      const pick = panel.querySelector('.anim-tune-pick-joint');
      if (pick && g) {
        pick.value = g;
        pick.dispatchEvent(new Event('change'));
      }
      const input = panel.querySelector(`input[data-group="${g}"][data-id="elbowR_x"]`);
      if (input) {
        input.value = '12';
        input.dispatchEvent(new Event('input'));
      }
      return { secs: secs.join(','), g, body: window.__animTune.state.body, input: !!input };
    });
    await frames(P, 3);
    const v2Table = () => GM((b) => window.__tuneV2.jointsGet(b, window.__tuneV2.J.elbowR, 0), v2.body);
    const v2a = await v2Table();
    await GM((g) => window.__animTune.set(g, 'elbowR_x', 0), v2.g);
    await frames(P, 3);
    const v2b = await v2Table();
    assert(v2.secs === 'joint,hand,ik,weapon,step,keys', `tuner: the tuner-v2 sections are in the panel (${v2.secs})`);
    assert(v2.input && v2a === 12 && v2b === 0, `tuner: a Joints slider set in the panel (${v2.g}) reaches the joint table (${v2a}), its reset puts it back (${v2b})`);
    // (pass 2) free view, fly: the view moves with the pad, the player does not; off gives the game view back. (marlow-bays
    // item 29) the pad stays on the panel: RT flies forward (the left stick is the panel's)
    const fvRead = () =>
      GM(() => {
        const g = window.__app.current;
        const c = g.player.cam;
        const v = (p) => ({ x: p.x, y: p.y, z: p.z });
        return { cam: v(c.camera.position), game: v(c.gamePos), feet: v(g.player.position) };
      });
    const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    await GM(() => window.__app.debug.animTune.show());
    await frames(P, 3);
    const fv0 = await fvRead();
    await GM(() => window.__animTune.free('fly'));
    await frames(P, 3);
    const fvs = await GM(() => window.__animTune.freeState());
    await GM(() => window.__pad.set(7, 1));
    await frames(P, 40);
    await GM(() => window.__pad.set(7, 0));
    await frames(P, 2);
    const fv1 = await fvRead();
    assert(fvs.mode === 'fly' && fvs.pad === 'tuner' && dist3(fv1.cam, fv0.cam) > 0.5, `tuner: free view fly moves the view (${JSON.stringify(fvs)}, ${dist3(fv1.cam, fv0.cam).toFixed(2)} m)`);
    assert(dist3(fv1.feet, fv0.feet) < 0.05 && dist3(fv1.game, fv0.cam) < 0.05, `tuner: in fly the player and the game view stay (${dist3(fv1.feet, fv0.feet).toFixed(3)} / ${dist3(fv1.game, fv0.cam).toFixed(3)} m)`);
    await GM(() => window.__animTune.free('off'));
    await frames(P, 3);
    const fv2 = await fvRead();
    assert(dist3(fv2.cam, fv2.game) < 1e-6 && dist3(fv2.cam, fv0.cam) < 0.05, `tuner: free view off restores the game camera (${dist3(fv2.cam, fv0.cam).toFixed(3)} m)`);
    // (pass 2) the barrel marker is a 2D overlay: no scene meshes
    // (fix round) by name, not by count: a lazily made effect mesh would flake a count
    await GM(() => window.__animTune.marker(true));
    await frames(P, 10);
    const mk1 = await GM(() => ({ n: window.__app.current.scene.meshes.filter((m) => m.name.startsWith('anim-tune-barrel')).length, el: !!document.querySelector('.anim-tune-marker-overlay') }));
    await GM(() => window.__animTune.marker(false));
    assert(mk1.n === 0 && mk1.el, `tuner: the barrel marker makes no scene meshes and draws on its overlay (${mk1.n} marker meshes, overlay ${mk1.el})`);
    await GM(() => window.__app.debug.animTune.hide());
    await frames(P, 2);
    // (LR16a, one light model) Pause > Settings > Gameplay: no Lamp falloff row, no `lampFalloff` setting or match mode
    await GM(() => window.__app.current.pause());
    await frames(P, 4);
    await GM(() => { const b = document.querySelector('.pause-screen [data-key="settings"]'); window.__app.nav.focus(b); b.click(); });
    await frames(P, 4);
    await GM(() => document.querySelector('.settings-screen .tab[data-tab="gameplay"]').click());
    await frames(P, 3);
    const lf0 = await GM(() => ({ row: !!document.querySelector('.settings-screen [data-key="lamp-falloff"]'), key: 'lampFalloff' in window.__app.settings.get().gameplay, mode: 'lampFalloff' in window.__app.current }));
    assert(!lf0.row && !lf0.key && !lf0.mode, `one light model: no Lamp falloff row, setting or match mode (${JSON.stringify(lf0)})`);
    await GM(() => document.querySelector('.settings-screen .ms-lg[data-legend="back"]').click());
    await frames(P, 3);
    await GM(() => window.__app.screens.top.resume?.());
    await frames(P, 4);
    // results
    await GM(() => {
      const g = window.__app.current;
      g.stats.missionId = 'warehouse-courier';
      g.stats.rating = 2;
      g.style.kills = 2; // G146: one kill costs the no-kills star
      g.stats.kills = 2;
      g.stats.bonuses = ['No alarms'];
      g.endSession(true, 'done');
    });
    await P.waitForSelector('.results-screen', { timeout: 60000 }); // a hang guard: a 1.8 s timer, then a push; frames stall under load
    await frames(P, 4);
    const res = await GM(() => ({
      keys: [...document.querySelectorAll('.results-screen .ms-item')].map((b) => b.dataset.key).join(','),
      focus: window.__app.nav.focused?.dataset.key,
      stars: document.querySelector('.mission-rating')?.textContent ?? '',
      earned: document.querySelectorAll('.results-screen .rs-earned li').length,
      lines: [...document.querySelectorAll('.results-screen .rs-earned li')].map((l) => l.textContent).join('|'),
      bonus: document.querySelector('.results-screen .rs-bonus')?.textContent ?? '',
      title: document.querySelector('.results-title')?.textContent,
    }));
    assert(res.title === 'VICTORY' && /★★☆/.test(res.stars) && res.earned === 3, `results: outcome, stars and what earned them (${res.stars}, ${res.earned} lines)`);
    assert(/★ +All primary objectives complete.★ +No alarms raised.☆ +Kills: 2/.test(res.lines) && /Bonus: No alarms/.test(res.bonus), `G146 lines and bonus (${res.lines}; ${res.bonus})`);
    assert(/retry/.test(res.keys) && /missions/.test(res.keys) && /quit/.test(res.keys), `results items (${res.keys}, focus ${res.focus})`);
  } finally {
    await M.browser.close();
  }
  // (marlow-bays item 29, Michael's touch scope "Menus + camera") touch outside the tuner: a tap presses a menu item and
  // the Back button; in play a finger dragged on the game view looks around (no movement); the on-screen pause button
  // shows only after a touch, a tap on it pauses, a tap on Resume resumes; a key press hides it again
  console.log('game touch (item 29)');
  const T = await launch({ url, params: 'menuShot=T2', viewport: { width: 1280, height: 720 }, context: { hasTouch: true } });
  try {
    const P = T.page;
    const GT = (f, a) => P.evaluate(f, a);
    const ttop = () => GT(() => window.__app.screens.top?.el.classList[1] ?? '(none)');
    const tapSel = async (sel) => {
      const c = await GT((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
      assert(!!c, `touch: ${sel} is on screen`);
      await P.touchscreen.tap(c[0], c[1]);
      await frames(P, 4);
    };
    await P.waitForFunction(() => window.__app?.screens?.top?.el.classList.contains('main-menu'), null, { timeout: 90000 });
    await frames(P, 6);
    await tapSel('.main-menu [data-key="settings"]');
    await P.waitForFunction(() => (window.__app.screens.top?.el.classList[1] ?? '(none)') === 'settings-screen', null, { timeout: 3000 }).catch(() => {}); // (gpu-waits sweep)
    assert((await ttop()) === 'settings-screen', `a tap opens Settings (${await ttop()})`);
    await tapSel('.settings-screen [data-legend="back"]');
    await P.waitForFunction(() => (window.__app.screens.top?.el.classList[1] ?? '(none)') === 'main-menu', null, { timeout: 3000 }).catch(() => {}); // (gpu-waits sweep)
    assert((await ttop()) === 'main-menu', `a tap on the Back legend returns to the main menu (${await ttop()})`);
    // in play
    await P.goto(`${url}?autostart=warehouse&mode=infiltration&mission=warehouse-courier&insertion=lot`);
    await P.waitForFunction(() => window.__app.current?.player && window.__app.current.simulating, null, { timeout: 120000 });
    await frames(P, 30);
    const shown = () => GT(() => getComputedStyle(document.querySelector('.touch-pause')).display !== 'none');
    assert(!(await shown()), 'no pause button before a touch');
    const yaw = () => GT(() => window.__app.current.player.cam.camera.rotation.y);
    const pos = () => GT(() => { const p = window.__app.current.player.rig.root.position; return { x: p.x, z: p.z }; });
    const cdp = await T.ctx.newCDPSession(P);
    const y0 = await yaw();
    const p0 = await pos();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 500, y: 400, id: 1 }] });
    for (let k = 1; k <= 8; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 500 + k * 25, y: 400, id: 1 }] });
      await frames(P, 1);
    }
    // (gpu-tests-3) hold still before the lift: on a fast GPU the 200 px drag takes ~80 ms, Chrome flings it, and the
    // next touch only cancels the fling, so the pause button's first tap was lost (a zero-velocity release flings nothing)
    for (let k = 0; k < 3; k++) {
      await new Promise((r) => setTimeout(r, 60));
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 700, y: 400, id: 1 }] });
    }
    await new Promise((r) => setTimeout(r, 150));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await frames(P, 6);
    const y1 = await yaw();
    const p1 = await pos();
    const turned = Math.abs(Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0)));
    const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
    assert(turned > 0.2 && moved < 0.05, `a drag on the game view looks around (${turned.toFixed(2)} rad) and never moves her (${moved.toFixed(3)} m)`);
    assert(await shown(), 'after a touch the pause button shows');
    // (menus-tap-wait) the tap reaches the game as `state.tap('pause')`, handled on a later sim step: wait for the screen
    // (3 s cap) instead of reading it after 4 frames (train 9 laptop run: "((none))" under the full parallel load)
    // (load-latent-ui1) the 3 s cap was wall time: under CPU load it ran out after a handful of frames. Now at least 30
    // checks 2 frames apart AND at least 3 s (never shorter than before), 60 s real-time cap
    const untilTop = async (want, more = async () => true) => {
      const t0 = Date.now();
      for (let i = 0; (i < 30 || Date.now() - t0 < 3000) && Date.now() - t0 < 60000; i++) {
        if ((await ttop()) === want && (await more())) break;
        await frames(P, 2);
      }
    };
    await tapSel('.touch-pause');
    await untilTop('pause-screen');
    assert((await ttop()) === 'pause-screen', `a tap on the pause button pauses (${await ttop()})`);
    await tapSel('.pause-screen [data-key="resume"]');
    const sim = () => GT(() => window.__app.current.simulating);
    await untilTop('(none)', sim);
    assert((await ttop()) === '(none)' && (await sim()), 'a tap on Resume resumes');
    await P.keyboard.press('Shift');
    await frames(P, 3);
    await P.waitForFunction(() => getComputedStyle(document.querySelector('.touch-pause')).display === 'none', null, { timeout: 3000 }).catch(() => {}); // (gpu-waits sweep)
    assert(!(await shown()), 'a key press hides the pause button');
    const bad = T.errors.filter((e) => e.startsWith('[error]') || e.startsWith('[pageerror]'));
    assert(bad.length === 0, `no console errors (game touch): ${bad.slice(0, 3).join(' | ')}`);
  } finally {
    await T.browser.close();
  }
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? join(tmpdir(), 'e2e-menus-fail.png') }).catch(() => {});
} finally {
  const bad = errors.filter((e) => !e.includes('GPU stall') && !e.includes('swiftshader'));
  console.log(bad.length ? 'console problems:\n' + bad.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || bad.some((e) => e.startsWith('[error]') || e.startsWith('[pageerror]')) ? 1 : 0);
}
