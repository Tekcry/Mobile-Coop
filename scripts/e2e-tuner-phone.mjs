// (marlow-bays item 26, the M21 exception: the animation tuner and Test Chamber on a phone; the game stays desktop only)
// The tuner on a phone, logic only (software GL; no visual result is claimed). Three pages:
// 1. Landscape 844 x 390 with touch (Playwright `hasTouch`, `isMobile`): the side drawer is chosen and the canvas gives
//    up its width (she stands in the free area); every visible touch target (tabs, buttons, sliders, steppers, the
//    playback bar, More, the handle) is at least the touch target (item 29: 30 px; the drawer about 36% wide, text
//    12 px); the panel scrolls;
//    the F3 debug readout is off, the tuner's Settings toggle shows and hides it and F3 still works with a keyboard; a tap
//    on her picks a part; one finger dragged orbits (the view's yaw turns); a pinch zooms (the orbit distance shrinks);
//    two fingers dragged pan (the circled point moves); a touch drag on the panel never moves the camera; the handle
//    collapses and expands the drawer.
//    (marlow-bays item 29: one layout for every input) A pad press changes nothing in the layout (only the hint glyphs);
//    a tap during pad use keeps the pad mode (a touch never changes the input mode).
// 2. Portrait 390 x 844 with touch: the bottom sheet (about 42% high), the canvas above it, targets >= 30 px, the
//    readout off; a pad press changes nothing in the layout.
// 3. Desktop 1280 x 640, no touch: the T2 dock, no phone class, no handle; the readout off in the studio (item 29).
// 4. (item 29: the viewport size alone picks the layout) 1920 x 1080 with touch: the desktop dock (never the sheet), the
//    one-finger orbit works there too (touch gestures in every layout), the readout off (a touch device); resized to an
//    iPad, 1180 x 820 landscape: the dock; 820 x 1180 portrait: the bottom sheet.
import { launch, assert, frames, press } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const TOUCH = { hasTouch: true, isMobile: true, deviceScaleFactor: 1 };

// Babylon's scene input counts touches against `navigator.maxTouchPoints`, which Chromium's touch emulation sets to 1:
// a second finger logs "Max number of touches exceeded" (a real phone has 5 or more; the tuner's touch camera reads the
// pointer events itself, so the scene input's count is not used). That one emulator note is not counted as an error.
const EMU_NOTE = /Max number of touches exceeded/;
const real = (errors) => errors.filter((e) => !EMU_NOTE.test(e));

async function boot(viewport, context) {
  const r = await launch({ url, params: 'autostart=studio&stage=1', viewport, context });
  await r.page.waitForFunction(() => !!window.__app?.current?.player && !!window.__studio?.state().active && !!window.__animTune, null, { timeout: 120000 });
  await frames(r.page, 10);
  return r;
}

/** Every visible touch target in the panel smaller than `min` px (either side), with what it is. */
const smallTargets = (page, min) =>
  page.evaluate((min) => {
    const root = document.querySelector('.anim-tune');
    const sel = '.tt-tab, .tt-btn, .tt-grp, .tt-x, .tt-opt, .tt-more-h, .anim-tune-handle, input[type=range], input[type=number], label.tt-field';
    const bad = [];
    let n = 0;
    for (const e of root.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      n++;
      // a slider and a text field are wide; only their height counts across
      const wide = e.matches('input[type=range], label.tt-field, .tt-more-h');
      if (r.height < min - 0.5 || (!wide && r.width < min - 0.5)) bad.push(`${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).split(' ')[0]} "${(e.textContent ?? '').trim().slice(0, 16)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    return { n, bad };
  }, min);

/** (tuner-clarity S4) The Now playing line: its text, whether it sits inside the panel's width and below the tabs. */
const playingLine = (page) =>
  page.evaluate(() => {
    const e = document.querySelector('.anim-tune-playing');
    const p = document.querySelector('.anim-tune').getBoundingClientRect();
    const t = document.querySelector('.anim-tune-tabs').getBoundingClientRect();
    if (!e) return { text: '', shown: false, inside: false, below: false };
    const r = e.getBoundingClientRect();
    return { text: e.textContent ?? '', shown: r.width > 0 && r.height > 0, inside: r.left >= p.left - 0.5 && r.right <= p.right + 0.5, below: r.top >= t.bottom - 1, r: { l: r.left, r: r.right, t: r.top, pl: p.left, pr: p.right, tb: t.bottom } };
  });

/** (26b) The tallest visible slider row and the panel's font (px). */
const rowSizes = (page) =>
  page.evaluate(() => {
    let hi = 0;
    let n = 0;
    for (const r of document.querySelectorAll('.anim-tune .tt-row')) {
      const b = r.getBoundingClientRect();
      if (b.height === 0) continue;
      n++;
      hi = Math.max(hi, b.height);
    }
    return { n, hi, font: parseFloat(getComputedStyle(document.querySelector('.anim-tune')).fontSize), cls: document.querySelector('.anim-tune').className, body: document.body.className };
  });

/** A pad press: the fake pad connected, the D-pad up held two frames (the input layer's last input: the pad). */
async function padPress(page) {
  await page.evaluate(() => { window.__pad.connect(); window.__pad.set(12, 1); });
  await frames(page, 3);
  await page.evaluate(() => window.__pad.set(12, 0));
  await frames(page, 4);
}

const phone = (page) => page.evaluate(() => window.__animTune.phone());
const core = (page) => page.evaluate(() => { const f = window.__app.current.player.cam.free; return f ? { yaw: f.yaw, pitch: f.pitch, dist: f.dist, panX: f.panX, panZ: f.panZ, height: f.height, mode: window.__animTune.freeState().mode } : { mode: window.__animTune.freeState().mode }; });

/** A touch gesture through the DevTools protocol (multi-touch: Playwright's touchscreen is one finger). `paths`: per
 *  finger, [x0, y0, x1, y1]; moved together in `steps`, a rendered frame between steps. */
async function gesture(page, cdp, paths, steps = 8) {
  const at = (k) => paths.map((p, id) => ({ x: p[0] + ((p[2] - p[0]) * k) / steps, y: p[1] + ((p[3] - p[1]) * k) / steps, id }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
  await frames(page, 1);
  for (let k = 1; k <= steps; k++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(k) });
    await frames(page, 1);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await frames(page, 3);
}

const angle = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** (item 29 phase 2, the phone bug: the tabs and the playback bar scrolled away under the header) The panel scrolled to
 *  its end (`scroll`; false: as it is): the active tab and the Play button still show at the top, nothing over them. */
const topBlock = (page, scroll = true) =>
  page.evaluate((scroll) => {
    const el = document.querySelector('.anim-tune');
    if (scroll) el.scrollTop = el.scrollHeight;
    const pr = el.getBoundingClientRect();
    const hit = (sel) => {
      const e = el.querySelector(sel);
      if (!e) return { ok: false, top: -1 };
      const r = e.getBoundingClientRect();
      const h = document.elementFromPoint(r.left + Math.min(12, r.width / 2), r.top + r.height / 2);
      return { ok: !!h && e.contains(h), top: Math.round(r.top - pr.top) };
    };
    const out = { st: Math.round(el.scrollTop), tab: hit('.tt-tab.active'), play: hit('.studio-play') };
    if (scroll) el.scrollTop = 0;
    return out;
  }, scroll);

/**
 * (flake fix, train 54) The pad's focus walked down the open tab one D-pad press at a time until the drawer has scrolled
 * (`max` presses at most): the top block (`topBlock`, as it is) and the focused row's place in the panel, after each press.
 * Each press is held for exactly ONE input poll (e2e-lib `press`): a hold of rendered frames lost presses when the frame
 * limiter skipped polls (a release never polled reads as one long hold) or stepped twice on the wall-clock repeat under
 * load, so a fixed count of 10 ended anywhere (the drawer unscrolled, st 0, on the laptop's train 54 run).
 */
async function padWalk(page, b, max) {
  let out = null;
  for (let i = 0; i < max; i++) {
    await press(page, b);
    const tb = await topBlock(page, false);
    const f = await page.evaluate(() => {
      const el = document.querySelector('.anim-tune');
      const m = el.querySelector('.tt-focus');
      if (!m) return null;
      const pr = el.getBoundingClientRect();
      const r = m.getBoundingClientRect();
      const play = el.querySelector('.studio-play')?.getBoundingClientRect();
      // shows: inside the panel's view, below the playback bar (nothing sticky over it)
      return { top: Math.round(r.top - pr.top), bottom: Math.round(r.bottom - pr.top), shows: r.bottom <= pr.bottom + 1 && (!play || r.top >= play.bottom - 1) };
    });
    out = { ...tb, focus: f, presses: i + 1 };
    if (tb.st > 0) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// 1. Landscape phone
// ---------------------------------------------------------------------------------------------------------------
{
  const { browser, ctx, page, errors } = await boot({ width: 844, height: 390 }, TOUCH);
  const G = (f, a) => page.evaluate(f, a);
  try {
    const p0 = await phone(page);
    const lay = await G(() => {
      const el = document.querySelector('.anim-tune');
      const p = el.getBoundingClientRect();
      const c = window.__app.canvas.getBoundingClientRect();
      return { cls: el.className, pLeft: p.left, pRight: p.right, pTop: p.top, pBottom: p.bottom, cRight: c.right, cLeft: c.left, font: parseFloat(getComputedStyle(el).fontSize), vw: innerWidth, vh: innerHeight, overlay: !document.querySelector('.debug-overlay').hidden };
    });
    assert(p0.mode === 'drawer' && lay.cls.includes('tt-drawer') && lay.cls.includes('tt-phone'), `landscape phone: the side drawer (${p0.mode}, ${lay.cls})`);
    assert(Math.abs(lay.pRight - lay.vw) < 1 && lay.pTop <= 0.5 && Math.abs(lay.pBottom - lay.vh) < 1 && p0.dockW === p0.width && lay.cRight <= lay.pLeft + 1 && lay.cLeft === 0, `the drawer is full height on the right and the canvas ends where it starts (she keeps ${lay.cRight.toFixed(0)} of ${lay.vw} px; dock ${p0.dockW})`);
    assert(lay.font === 12 && p0.target === 30 && Math.abs(p0.width - 844 * 0.36) < 4, `one density: text ${lay.font} px, targets ${p0.target} px, the drawer ${p0.width} px (${((p0.width / 844) * 100).toFixed(0)}%)`);
    assert(!p0.debug && !lay.overlay && !p0.debugBox, `the F3 debug readout is off on a phone (${JSON.stringify({ debug: p0.debug, overlay: lay.overlay })})`);

    // the touch targets on the View (playback bar, the loop list) and Body (the "what" row, sliders) tabs, and More open
    for (const tab of ['view', 'body', 'more']) {
      if (tab === 'more') await G(() => window.__animTune.more(true));
      else await G((t) => window.__animTune.tab(t), tab);
      await frames(page, 2);
      const t = await smallTargets(page, p0.target);
      assert(t.n > 5 && t.bad.length === 0, `${tab} tab: every touch target >= ${p0.target} px (${t.n} checked${t.bad.length ? `; small: ${t.bad.slice(0, 6).join(', ')}` : ''})`);
    }
    // scrolling inside the drawer
    const sc = await G(() => {
      const el = document.querySelector('.anim-tune');
      window.__animTune.tab('body');
      const can = el.scrollHeight > el.clientHeight + 10;
      el.scrollTop = 120;
      const moved = el.scrollTop > 0;
      el.scrollTop = 0;
      return { can, moved, oy: getComputedStyle(el).overflowY, ta: getComputedStyle(el).touchAction };
    });
    assert(sc.can && sc.moved && sc.oy === 'auto' && sc.ta.includes('pan-y'), `the drawer scrolls inside itself (${JSON.stringify(sc)})`);
    const tb = await topBlock(page);
    assert(tb.st > 40 && tb.tab.ok && tb.play.ok && tb.tab.top < 80, `scrolled to its end, the drawer keeps the tabs and the playback bar at the top (${JSON.stringify(tb)})`);
    // (tuner-clarity S4) the Now playing line shows in the drawer, inside its width, below the tabs
    const pl = await playingLine(page);
    assert(/^Now playing/.test(pl.text) && pl.shown && pl.inside && pl.below, `the drawer shows the Now playing line inside its width, below the tabs (${JSON.stringify(pl)})`);

    // the readout: More's toggle shows and hides it; F3 (a keyboard) still toggles it and the box follows
    await G(() => window.__animTune.more(true));
    await frames(page, 2);
    const boxAt = async () => G(() => {
      const l = document.querySelector('.anim-tune-debugreadout')?.closest('label');
      l?.scrollIntoView({ block: 'center' });
      const r = l?.getBoundingClientRect();
      return r ? { x: r.left + 12, y: r.top + r.height / 2 } : null;
    });
    const b1 = await boxAt();
    assert(!!b1, 'More has the debug readout toggle');
    await page.touchscreen.tap(b1.x, b1.y);
    await frames(page, 3);
    const d1 = await G(() => ({ ...window.__animTune.phone(), overlay: !document.querySelector('.debug-overlay').hidden }));
    await page.touchscreen.tap(b1.x, b1.y);
    await frames(page, 3);
    const d2 = await G(() => ({ ...window.__animTune.phone(), overlay: !document.querySelector('.debug-overlay').hidden }));
    assert(d1.debug && d1.overlay && d1.debugBox && !d2.debug && !d2.overlay && !d2.debugBox, `the tuner's toggle shows and hides the readout (on ${d1.overlay}, off ${!d2.overlay})`);
    await page.keyboard.press('F3');
    await frames(page, 2);
    const d3 = await phone(page);
    await page.keyboard.press('F3');
    await frames(page, 2);
    const d4 = await phone(page);
    assert(d3.debug && d3.debugBox && !d4.debug && !d4.debugBox, `F3 still toggles it with a keyboard, the box follows (${d3.debug}, ${d4.debug})`);

    // a tap on her picks a part (the head marker's place on the canvas)
    await G(() => window.__animTune.tab('body'));
    await G(() => window.__animTune.part('headNode'));
    await frames(page, 4);
    const headAt = await G(() => {
      const m = window.__animTune.selected().mark;
      const c = window.__app.canvas.getBoundingClientRect();
      return m.shown ? { x: c.left + m.ax, y: c.top + m.ay } : null;
    });
    await G(() => window.__animTune.part(''));
    await frames(page, 2);
    assert(!!headAt && headAt.x < lay.pLeft, `the head marker is on the canvas (${JSON.stringify(headAt)})`);
    await page.touchscreen.tap(headAt.x, headAt.y);
    await frames(page, 3);
    const tp = await G(() => ({ ...window.__animTune.partState(), taps: window.__animTune.phone().taps }));
    assert(tp.part === 'headNode' && tp.taps === 1, `a tap on her head picks the head (${tp.part}, ${tp.label}, taps ${tp.taps})`);
    await G(() => window.__animTune.part(''));

    const cdp = await ctx.newCDPSession(page);
    const cx = Math.round(lay.pLeft * 0.5);
    const cy = Math.round(lay.vh * 0.5);
    // one finger dragged: the orbit turns
    const c0 = await core(page);
    const yaw0 = await G(() => window.__app.current.player.cam.camera.rotation.y);
    await gesture(page, cdp, [[cx - 100, cy, cx + 60, cy]]);
    const c1 = await core(page);
    const yaw1 = await G(() => window.__app.current.player.cam.camera.rotation.y);
    const g1 = (await phone(page)).gesture;
    assert(c1.mode === 'orbit' && g1 === 'orbit' && angle(yaw1, yaw0) > 0.3, `one finger dragged orbits the camera (${c0.mode} -> ${c1.mode}, camera yaw ${angle(yaw1, yaw0).toFixed(2)} rad, gesture ${g1})`);
    const tapsAfter = (await phone(page)).taps;
    assert(tapsAfter === 1, `a drag is no tap (${tapsAfter})`);
    // a pinch (fingers apart): the orbit distance shrinks
    await gesture(page, cdp, [[cx - 30, cy, cx - 120, cy], [cx + 30, cy, cx + 120, cy]]);
    const c2 = await core(page);
    const g2 = (await phone(page)).gesture;
    assert(g2 === 'pinch' && c2.dist < c1.dist * 0.7 && angle(c2.yaw, c1.yaw) < 0.01, `a pinch zooms in (distance ${c1.dist.toFixed(2)} -> ${c2.dist.toFixed(2)} m, gesture ${g2}, yaw kept)`);
    // two fingers dragged together: the circled point pans
    await gesture(page, cdp, [[cx - 60, cy, cx + 40, cy], [cx + 60, cy, cx + 160, cy]]);
    const c3 = await core(page);
    const g3 = (await phone(page)).gesture;
    const panned = Math.hypot(c3.panX - c2.panX, c3.panZ - c2.panZ);
    assert(g3 === 'pan' && panned > 0.05 && Math.abs(c3.dist - c2.dist) < 1e-6 && angle(c3.yaw, c2.yaw) < 0.01, `two fingers dragged pan the target (${panned.toFixed(3)} m, gesture ${g3}, distance and yaw kept)`);
    // a touch drag on the panel never moves the camera
    const onPanel = await G(() => {
      const r = document.querySelector('.anim-tune .anim-tune-tabs').getBoundingClientRect();
      return { x: Math.round(r.left + 10), y: Math.round(r.top + r.height / 2) };
    });
    await gesture(page, cdp, [[onPanel.x, onPanel.y, onPanel.x - 150, onPanel.y + 20]]);
    await gesture(page, cdp, [[onPanel.x, onPanel.y + 60, onPanel.x - 100, onPanel.y + 60], [onPanel.x + 80, onPanel.y + 60, onPanel.x + 200, onPanel.y + 80]]);
    const c4 = await core(page);
    assert(angle(c4.yaw, c3.yaw) < 1e-6 && Math.abs(c4.dist - c3.dist) < 1e-6 && c4.panX === c3.panX && c4.panZ === c3.panZ, `touches on the panel never move the camera (yaw ${angle(c4.yaw, c3.yaw).toExponential(1)}, distance ${c3.dist.toFixed(2)} -> ${c4.dist.toFixed(2)})`);

    // the handle collapses and expands the drawer (the canvas takes the whole screen while collapsed)
    const hAt = await G(() => { const r = document.querySelector('.anim-tune-handle').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
    await page.touchscreen.tap(hAt.x, hAt.y);
    await frames(page, 3);
    const f1 = await G(() => ({ ...window.__animTune.phone(), cw: window.__app.canvas.getBoundingClientRect().width, text: document.querySelector('.anim-tune-handle').textContent }));
    await page.touchscreen.tap(hAt.x, hAt.y);
    await frames(page, 3);
    const f2 = await phone(page);
    assert(hAt.h >= p0.target - 0.5 && f1.folded && f1.dockW === 0 && Math.abs(f1.cw - lay.vw) < 1 && f1.text === 'Show panel' && !f2.folded && f2.dockW === p0.width, `the handle collapses (canvas ${f1.cw.toFixed(0)} px, "${f1.text}") and expands the drawer (dock ${f2.dockW})`);
    // (item 29) one layout for every input: a pad press changes nothing in the layout (only the hint glyphs); a tap
    // during pad use keeps the pad mode
    await G(() => window.__animTune.tab('body'));
    await frames(page, 2);
    const rt = await rowSizes(page);
    await padPress(page);
    const pp = await phone(page);
    const rp = await rowSizes(page);
    assert(rp.body.includes('input-gamepad') && pp.target === p0.target && pp.font === p0.font && pp.width === p0.width && pp.dockW === p0.width && Math.abs(rp.hi - rt.hi) < 1 && rp.font === rt.font, `a pad press keeps the layout (${JSON.stringify({ target: pp.target, font: pp.font, width: pp.width, rows: [rt.hi, rp.hi] })})`);
    await page.touchscreen.tap(Math.round(cx * 0.3), 20);
    await frames(page, 4);
    const rt2 = await rowSizes(page);
    assert(rt2.body.includes('input-gamepad') && Math.abs(rt2.hi - rt.hi) < 1, `a tap during pad use keeps the pad mode and the layout (${rt2.body})`);
    // (phase 2) the pad's focus walked down the Body tab scrolls the drawer: the tabs and the playback bar still show
    const tp2 = await padWalk(page, 13, 40);
    assert(tp2.st > 0 && tp2.tab.ok && tp2.play.ok && !!tp2.focus?.shows, `pad focus down the Body tab: the drawer scrolled, the focused row shows below the tabs and playback bar, which show (${JSON.stringify(tp2)})`);
    assert(real(errors).length === 0, `no console errors (landscape): ${real(errors).slice(0, 3).join(' | ')}`);
  } catch (e) {
    console.error(e);
    failed = true;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Portrait phone
// ---------------------------------------------------------------------------------------------------------------
{
  const { browser, page, errors } = await boot({ width: 390, height: 844 }, TOUCH);
  const G = (f, a) => page.evaluate(f, a);
  try {
    const p = await phone(page);
    const lay = await G(() => {
      const el = document.querySelector('.anim-tune');
      const r = el.getBoundingClientRect();
      const c = window.__app.canvas.getBoundingClientRect();
      return { cls: el.className, top: r.top, left: r.left, width: r.width, bottom: r.bottom, cBottom: c.bottom, cWidth: c.width, vw: innerWidth, vh: innerHeight, overlay: !document.querySelector('.debug-overlay').hidden };
    });
    assert(p.mode === 'sheet' && lay.cls.includes('tt-sheet'), `portrait phone: the bottom sheet (${p.mode})`);
    assert(lay.left === 0 && Math.abs(lay.width - lay.vw) < 1 && Math.abs(lay.bottom - lay.vh) < 1 && Math.abs(lay.top - (lay.vh - p.height)) < 1 && p.dockH === p.height && p.dockW === 0 && lay.cBottom <= lay.top + 1 && Math.abs(lay.cWidth - lay.vw) < 1, `the sheet spans the bottom and the canvas ends above it (she keeps ${lay.cBottom.toFixed(0)} of ${lay.vh} px; dock ${p.dockH})`);
    assert(!p.debug && !lay.overlay, 'the debug readout is off (portrait)');
    for (const tab of ['view', 'body']) {
      await G((t) => window.__animTune.tab(t), tab);
      await frames(page, 2);
      const t = await smallTargets(page, p.target);
      assert(t.n > 5 && t.bad.length === 0, `portrait ${tab} tab: every touch target >= ${p.target} px (${t.n} checked${t.bad.length ? `; small: ${t.bad.slice(0, 6).join(', ')}` : ''})`);
    }
    await G(() => window.__animTune.tab('body'));
    await frames(page, 2);
    const tb = await topBlock(page);
    assert(tb.st > 40 && tb.tab.ok && tb.play.ok, `portrait: scrolled to its end, the sheet keeps the tabs and the playback bar at its top (${JSON.stringify(tb)})`);
    // (tuner-clarity S4) the Now playing line shows in the sheet, inside its width, below the tabs
    const pl = await playingLine(page);
    assert(/^Now playing/.test(pl.text) && pl.shown && pl.inside && pl.below, `the sheet shows the Now playing line inside its width, below the tabs (${JSON.stringify(pl)})`);
    await G(() => window.__animTune.fold(true));
    await frames(page, 3);
    const f = await G(() => ({ ...window.__animTune.phone(), top: document.querySelector('.anim-tune').getBoundingClientRect().top, ch: window.__app.canvas.getBoundingClientRect().height }));
    await G(() => window.__animTune.fold(false));
    assert(Math.abs(p.height - 844 * 0.42) < 4 && p.target === 30, `the sheet ${p.height} px (${((p.height / 844) * 100).toFixed(0)}%), targets ${p.target} px`);
    await padPress(page);
    const pp = await phone(page);
    const ch = await G(() => window.__app.canvas.getBoundingClientRect().bottom);
    assert(pp.target === p.target && pp.height === p.height && pp.dockH === pp.height && Math.abs(ch - (844 - pp.height)) < 1, `portrait: a pad press keeps the sheet (${pp.height} px)`);
    assert(f.folded && f.dockH === 0 && f.top > lay.vh - 140 && Math.abs(f.ch - lay.vh) < 1, `collapsed, the sheet is its header at the bottom and the canvas the whole screen (top ${f.top.toFixed(0)}, canvas ${f.ch.toFixed(0)})`);
    assert(real(errors).length === 0, `no console errors (portrait): ${real(errors).slice(0, 3).join(' | ')}`);
  } catch (e) {
    console.error(e);
    failed = true;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Desktop: unchanged
// ---------------------------------------------------------------------------------------------------------------
{
  const { browser, page, errors } = await boot({ width: 1280, height: 640 }, {});
  const G = (f, a) => page.evaluate(f, a);
  try {
    const d = await G(() => {
      const el = document.querySelector('.anim-tune');
      const r = el.getBoundingClientRect();
      const c = window.__app.canvas.getBoundingClientRect();
      return {
        ...window.__animTune.phone(),
        cls: el.className,
        width: r.width,
        right: r.right,
        font: el.style.fontSize,
        cRight: c.right,
        cH: c.height,
        handle: getComputedStyle(document.querySelector('.anim-tune-handle')).display,
        docked: document.body.classList.contains('tt-docked'),
        dockedB: document.body.classList.contains('tt-docked-b'),
        map: !!document.querySelector('.anim-tune-map'),
        overlay: !document.querySelector('.debug-overlay').hidden,
        vh: innerHeight,
      };
    });
    // T2's desktop size at 1280 x 640, Medium: font round(19 * 0.75) = 14 px, width min(1280 * 0.34, 14 * 25) = 350 px
    assert(d.mode === 'desktop' && !d.cls.includes('tt-phone') && d.font === '14px' && Math.abs(d.width - 350) < 1 && Math.abs(d.right - 1280) < 1, `desktop: the T2 layout (${d.mode}, font ${d.font}, width ${d.width.toFixed(0)})`);
    assert(d.docked && !d.dockedB && d.dockW === 350 && d.dockH === 0 && d.cRight <= 1280 - 350 + 1 && Math.abs(d.cH - d.vh) < 1, `desktop: the T2 dock beside the panel (${d.dockW} px, canvas right ${d.cRight.toFixed(0)})`);
    assert(d.handle === 'none' && !d.overlay && !d.debugBox && !d.map, `desktop: no handle, no body map, the readout off in the studio (item 29) (handle ${d.handle}, overlay ${d.overlay})`);
    assert(real(errors).length === 0, `no console errors (desktop): ${real(errors).slice(0, 3).join(' | ')}`);
  } catch (e) {
    console.error(e);
    failed = true;
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// 4. (item 29) The viewport size alone picks the layout: a touchscreen at desktop size, then iPad sizes
// ---------------------------------------------------------------------------------------------------------------
{
  const { browser, ctx, page, errors } = await boot({ width: 1920, height: 1080 }, { hasTouch: true, deviceScaleFactor: 1 });
  const G = (f, a) => page.evaluate(f, a);
  const look = () =>
    G(() => {
      const el = document.querySelector('.anim-tune');
      const r = el.getBoundingClientRect();
      const c = window.__app.canvas.getBoundingClientRect();
      return { ...window.__animTune.phone(), cls: el.className, right: r.right, bottom: r.bottom, top: r.top, cRight: c.right, cBottom: c.bottom, vw: innerWidth, vh: innerHeight, docked: document.body.classList.contains('tt-docked'), overlay: !document.querySelector('.debug-overlay').hidden, touch: navigator.maxTouchPoints };
    });
  try {
    const d = await look();
    assert(d.touch > 0 && d.mode === 'desktop' && !d.cls.includes('tt-phone') && !d.cls.includes('tt-sheet') && d.docked && d.dockW > 0 && d.cRight <= 1920 - d.dockW + 1, `1920 x 1080 with touch: the desktop dock, never the sheet (${JSON.stringify({ mode: d.mode, touch: d.touch, dock: d.dockW })})`);
    // one finger dragged on her: the orbit (the touch camera in the desktop layout too)
    const cdp = await ctx.newCDPSession(page);
    const yaw0 = await G(() => window.__app.current.player.cam.camera.rotation.y);
    const cx = Math.round((1920 - d.dockW) * 0.5);
    await gesture(page, cdp, [[cx - 150, 540, cx + 90, 540]]);
    const yaw1 = await G(() => window.__app.current.player.cam.camera.rotation.y);
    const c1 = await core(page);
    assert(c1.mode === 'orbit' && angle(yaw1, yaw0) > 0.3 && (await phone(page)).gesture === 'orbit', `desktop layout: one finger dragged orbits (${angle(yaw1, yaw0).toFixed(2)} rad)`);
    // iPad landscape: the dock
    await page.setViewportSize({ width: 1180, height: 820 });
    await frames(page, 6);
    const a = await look();
    assert(a.mode === 'desktop' && a.docked && Math.abs(a.right - 1180) < 1 && Math.abs(a.bottom - 820) < 1, `1180 x 820 (iPad landscape): the desktop dock, full height (${JSON.stringify({ mode: a.mode, bottom: a.bottom })})`);
    // iPad portrait: the bottom sheet (the dock would take most of the width), no gap under it
    await page.setViewportSize({ width: 820, height: 1180 });
    await frames(page, 6);
    const b = await look();
    assert(b.mode === 'sheet' && b.cls.includes('tt-sheet') && Math.abs(b.bottom - 1180) < 1 && Math.abs(b.top - (1180 - b.height)) < 1 && b.cBottom <= b.top + 1, `820 x 1180 (iPad portrait): the bottom sheet at the bottom edge, the canvas above it (${JSON.stringify({ mode: b.mode, top: b.top, bottom: b.bottom, h: b.height })})`);
    assert(real(errors).length === 0, `no console errors (touch desktop, iPad): ${real(errors).slice(0, 3).join(' | ')}`);
  } catch (e) {
    console.error(e);
    failed = true;
  } finally {
    await browser.close();
  }
}

if (failed) process.exit(1);
console.log('e2e-tuner-phone: all checks passed');
