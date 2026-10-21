// (marlow-bays item 26, the M21 exception: the animation tuner and Anim Studio on a phone; the game stays desktop only)
// The tuner on a phone, logic only (software GL; no visual result is claimed). Three pages:
// 1. Landscape 844 x 390 with touch (Playwright `hasTouch`, `isMobile`): the side drawer is chosen and the canvas gives
//    up its width (she stands in the free area); every visible touch target (tabs, buttons, chips, sliders, steppers,
//    the body map's joints, the playback bar, the handle) is at least the touch target (26b: 34 px; the drawer about
//    38% wide, text 13 px); the panel scrolls;
//    the F3 debug readout is off, the tuner's Settings toggle shows and hides it and F3 still works with a keyboard; a tap
//    on her picks a part; one finger dragged orbits (the view's yaw turns); a pinch zooms (the orbit distance shrinks);
//    two fingers dragged pan (the circled point moves); a touch drag on the panel never moves the camera; the handle
//    collapses and expands the drawer.
//    (26b) A pad press (the fake pad, e2e-lib's `window.__pad`) switches live to the pad density (26 px rows, 11 px text,
//    narrower); a touch switches back.
// 2. Portrait 390 x 844 with touch: the bottom sheet (about 45% high), the canvas above it, targets >= 34 px, the
//    readout off; a pad press: the pad density (the sheet about 40% high).
// 3. Desktop 1280 x 640, no touch: the layout is unchanged (the T2 dock, no phone class, the map's own targets, the
//    readout on in the studio as before).
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const TOUCH = { hasTouch: true, isMobile: true, deviceScaleFactor: 1 };

// Babylon's scene input counts touches against `navigator.maxTouchPoints`, which Chromium's touch emulation sets to 1:
// a second finger logs "Max number of touches exceeded" (a real phone has 5 or more; the tuner's touch camera reads the
// pointer events itself, so the scene input's count is not used). That one emulator note is not counted as an error.
const EMU_NOTE = /Max number of touches exceeded/;
const real = (errors) => errors.filter((e) => !EMU_NOTE.test(e));

async function boot(viewport, context) {
  const r = await launch({ url, params: 'autostart=studio', viewport, context });
  await r.page.waitForFunction(() => !!window.__app?.current?.player && !!window.__studio?.state().active && !!window.__animTune, null, { timeout: 120000 });
  await frames(r.page, 10);
  return r;
}

/** Every visible touch target in the panel smaller than `min` px (either side), with what it is. */
const smallTargets = (page, min) =>
  page.evaluate((min) => {
    const root = document.querySelector('.anim-tune');
    const sel = '.tt-tab, .tt-btn, .tt-chip, .tt-grp, .tt-x, .tt-pin, .tt-opt, .anim-tune-handle, input[type=range], input[type=number], input[type=search], label.tt-field, .anim-tune-map circle.hit';
    const bad = [];
    let n = 0;
    for (const e of root.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      n++;
      // a slider and a text field are wide; only their height counts across
      const wide = e.matches('input[type=range], input[type=search], label.tt-field');
      if (r.height < min - 0.5 || (!wide && r.width < min - 0.5)) bad.push(`${e.tagName.toLowerCase()}.${String(e.className?.baseVal ?? e.className).split(' ')[0]} "${(e.textContent ?? '').trim().slice(0, 16)}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    return { n, bad };
  }, min);

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

/** (26b) A pad press: the fake pad connected, the D-pad up held two frames (the input layer's last input: the pad). */
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
    assert(lay.font >= 12 && lay.font <= 13 && !p0.pad && p0.target >= 32 && p0.target <= 36 && Math.abs(p0.width - 844 * 0.38) < 4, `touch density: text ${lay.font} px, targets ${p0.target} px, the drawer ${p0.width} px (${((p0.width / 844) * 100).toFixed(0)}%)`);
    assert(!p0.debug && !lay.overlay && !p0.debugBox, `the F3 debug readout is off on a phone (${JSON.stringify({ debug: p0.debug, overlay: lay.overlay })})`);

    // the touch targets on the View (playback bar, the loop list) and Body (map, part list, sliders) tabs
    for (const tab of ['view', 'body', 'settings']) {
      await G((t) => window.__animTune.tab(t), tab);
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

    // the readout: the Settings toggle shows and hides it; F3 (a keyboard) still toggles it and the box follows
    await G(() => window.__animTune.tab('settings'));
    await frames(page, 2);
    const boxAt = async () => G(() => {
      const l = document.querySelector('.anim-tune-debugreadout')?.closest('label');
      l?.scrollIntoView({ block: 'center' });
      const r = l?.getBoundingClientRect();
      return r ? { x: r.left + 12, y: r.top + r.height / 2 } : null;
    });
    const b1 = await boxAt();
    assert(!!b1, 'the Settings tab has the debug readout toggle');
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
      const r = document.querySelector('.anim-tune .tt-title').getBoundingClientRect();
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
    // (26b) a pad press: the pad density, live; a touch: back to the touch density
    await G(() => window.__animTune.tab('body'));
    await frames(page, 2);
    const rt = await rowSizes(page);
    await padPress(page);
    const pp = await phone(page);
    const rp = await rowSizes(page);
    const cp = await G(() => window.__app.canvas.getBoundingClientRect().right);
    assert(pp.pad && pp.target === 26 && pp.font >= 11 && pp.font <= 12 && Math.abs(pp.width - 844 * 0.34) < 4 && pp.dockW === pp.width && Math.abs(cp - (844 - pp.width)) < 1 && rp.cls.includes('tt-ppad') && rp.body.includes('input-gamepad'), `a pad press switches to the pad density live (${JSON.stringify({ pad: pp.pad, target: pp.target, font: pp.font, width: pp.width, dock: pp.dockW })})`);
    assert(rp.n > 3 && rp.hi <= 30 && rp.hi < rt.hi && rp.font === pp.font, `pad rows about 26 px (tallest ${rp.hi.toFixed(0)} px, touch ${rt.hi.toFixed(0)} px; ${rp.n} rows, text ${rp.font} px)`);
    await page.touchscreen.tap(Math.round(cx * 0.3), 20);
    await frames(page, 4);
    const pt = await phone(page);
    const rt2 = await rowSizes(page);
    assert(!pt.pad && pt.target === p0.target && pt.width === p0.width && pt.dockW === p0.width && !rt2.cls.includes('tt-ppad') && Math.abs(rt2.hi - rt.hi) < 1, `a touch switches back to the touch density (${pt.target} px, ${pt.width} px, rows ${rt2.hi.toFixed(0)} px)`);
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
    await G(() => window.__animTune.fold(true));
    await frames(page, 3);
    const f = await G(() => ({ ...window.__animTune.phone(), top: document.querySelector('.anim-tune').getBoundingClientRect().top, ch: window.__app.canvas.getBoundingClientRect().height }));
    await G(() => window.__animTune.fold(false));
    assert(Math.abs(p.height - 844 * 0.45) < 4 && p.target === 34 && !p.pad, `touch: the sheet ${p.height} px (${((p.height / 844) * 100).toFixed(0)}%), targets ${p.target} px`);
    await padPress(page);
    const pp = await phone(page);
    const rp = await rowSizes(page);
    const ch = await G(() => window.__app.canvas.getBoundingClientRect().bottom);
    assert(pp.pad && pp.target === 26 && Math.abs(pp.height - 844 * 0.4) < 4 && pp.dockH === pp.height && Math.abs(ch - (844 - pp.height)) < 1 && rp.hi <= 30, `portrait pad: the sheet ${pp.height} px, rows ${rp.hi.toFixed(0)} px, text ${rp.font} px`);
    await page.touchscreen.tap(195, 30);
    await frames(page, 4);
    const pt = await phone(page);
    assert(!pt.pad && pt.height === p.height, `portrait: a touch switches back (${pt.height} px)`);
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
      const hit = document.querySelector('.anim-tune-map [data-part="kneeL"] circle.hit');
      return {
        ...window.__animTune.phone(),
        cls: el.className,
        width: r.width,
        right: r.right,
        font: el.style.fontSize,
        cRight: c.right,
        cH: c.height,
        hitR: hit?.getAttribute('r'),
        handle: getComputedStyle(document.querySelector('.anim-tune-handle')).display,
        docked: document.body.classList.contains('tt-docked'),
        dockedB: document.body.classList.contains('tt-docked-b'),
        overlay: !document.querySelector('.debug-overlay').hidden,
        vh: innerHeight,
      };
    });
    // T2's desktop size at 1280 x 640, Medium: font round(19 * 0.75) = 14 px, width min(1280 * 0.34, 14 * 25) = 350 px
    assert(d.mode === 'desktop' && !d.cls.includes('tt-phone') && d.font === '14px' && Math.abs(d.width - 350) < 1 && Math.abs(d.right - 1280) < 1, `desktop: the T2 layout (${d.mode}, font ${d.font}, width ${d.width.toFixed(0)})`);
    assert(d.docked && !d.dockedB && d.dockW === 350 && d.dockH === 0 && d.cRight <= 1280 - 350 + 1 && Math.abs(d.cH - d.vh) < 1, `desktop: the T2 dock beside the panel (${d.dockW} px, canvas right ${d.cRight.toFixed(0)})`);
    assert(d.hitR === '8' && d.handle === 'none' && d.overlay && d.debugBox, `desktop: the map's own targets, no handle, the readout on in the studio as before (r ${d.hitR}, handle ${d.handle}, overlay ${d.overlay})`);
    assert(real(errors).length === 0, `no console errors (desktop): ${real(errors).slice(0, 3).join(' | ')}`);
  } catch (e) {
    console.error(e);
    failed = true;
  } finally {
    await browser.close();
  }
}

if (failed) process.exit(1);
console.log('e2e-tuner-phone: all checks passed');
