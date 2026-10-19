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
      await F.page.waitForFunction((n) => (window.__app.current?.shotChanges ?? 0) > n, s0.n, { timeout: 8000, polling: 100 });
      const s1 = await shotOf(F.page);
      assert(s1.n > s0.n && s1.id !== s0.id, `?menuClock=fast changes the shot within a few seconds (${s0.id} -> ${s1.id})`);
      // during a fade the menu still moves: wait for black over the stage, move the focus in that frame
      const r = await F.page.evaluate(
        () =>
          new Promise((res) => {
            const t0 = performance.now();
            const tick = () => {
              const fade = window.__app.current?.shotFade ?? 0;
              if (fade > 0.15) {
                const before = window.__app.nav.focused?.dataset.key;
                window.__app.nav.move('down');
                res({ fade, before, after: window.__app.nav.focused?.dataset.key });
              } else if (performance.now() - t0 > 10000) res({ fade, before: '', after: '' });
              else requestAnimationFrame(tick);
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
      await F.page.waitForTimeout(500);
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
  assert(menuKeys === 'sectorops,coop,loadout,settings,feedback', `the main menu is Sector Ops, Co-op, Loadout, Settings, Feedback (${menuKeys})`);
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
    const keys = await GM(() => [...document.querySelectorAll('.pause-screen .ms-item')].map((b) => b.dataset.key).join(','));
    // (menu-notes A2) no separate Controls item: controls live in Settings > Controls
    assert(keys === 'resume,objectives,settings,report-feedback,quit', `pause items (${keys})`);
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
