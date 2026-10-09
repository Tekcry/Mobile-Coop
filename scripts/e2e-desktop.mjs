// Desktop (3.0): auto-detected on a mouse-and-keyboard 1080p window, menus scaled to it, no touch settings or
// controls, Mouse & Keyboard first (rebinding: click, press; a key moves off its old action; Backspace clears; the
// in-game action follows), the Graphics menu (presets, Custom, the frame cap), the interface switch, and the Epic
// renderer booting in a match (clustered lights, shadow casters, the post stack) without console errors; 16:10,
// 21:9 and 32:9 windows (centred menus, the HUD inset, Hor+ up to the FOV cap).
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
let browser;
try {
  // no ?platform=: detection on its own (no touch points, a fine pointer, 1920 x 1080)
  const l = await launch({ url, params: '', touch: false, viewport: { width: 1920, height: 1080 } });
  browser = l.browser;
  const { page, errors } = l;
  const G = (f, a) => page.evaluate(f, a);
  const click = (sel, text) => G(([s, t]) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]')).find((e) => !t || new RegExp(t).test(e.textContent)).click(), [sel, text]);
  await wait(500);
  const plat = await G(() => ({ cls: document.body.className, scale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(), p: window.__app.platform }));
  assert(plat.p.platform === 'desktop' && /platform-desktop/.test(plat.cls), `a mouse-and-keyboard window is desktop (${plat.p.reason})`);
  assert(plat.scale === '1.5', `menus scale to 1080p (x${plat.scale})`);
  const menuBox = await G(() => document.querySelector('.main-menu .menu-item').getBoundingClientRect().height);
  assert(menuBox > 45, `menu rows are big enough to read at 1080p (${menuBox.toFixed(0)} px)`);
  await click('.main-menu .btn', 'Settings');
  await frames(page, 4);
  const tabs = await G(() => [...document.querySelectorAll('.settings-screen .tab')].map((t) => t.dataset.tab));
  assert(tabs[0] === 'kbm' && !tabs.includes('touch'), `Mouse & Keyboard first, no Touch tab (${tabs.join(',')})`);
  // rebind reload to U
  await click('.kb-key[data-bind="reload:0"]');
  await frames(page, 2);
  const listening = await G(() => document.querySelector('.kb-key[data-bind="reload:0"]').classList.contains('listening'));
  assert(listening, 'clicking a key waits for the new one');
  await page.keyboard.press('KeyU');
  await frames(page, 2);
  let k = await G(() => ({ r: window.__app.settings.get().keys.reload, label: document.querySelector('.kb-key[data-bind="reload:0"]').textContent }));
  assert(k.r[0] === 'KeyU' && k.label === 'U', `reload rebound to U (${k.label})`);
  // a key already in use moves over: G (gadget) onto reload's second slot
  await click('.kb-key[data-bind="reload:1"]');
  await page.keyboard.press('KeyG');
  await frames(page, 2);
  k = await G(() => ({ r: window.__app.settings.get().keys.reload, g: window.__app.settings.get().keys.gadget, toast: document.querySelector('.toasts')?.textContent ?? '' }));
  assert(k.r.join() === 'KeyU,KeyG' && k.g.length === 0 && /moved from Gadget/.test(k.toast), `a key in use moves over (${k.toast.trim()})`);
  await click('.kb-key[data-bind="reload:1"]');
  await page.keyboard.press('Backspace');
  await frames(page, 2);
  k = await G(() => window.__app.settings.get().keys.reload);
  assert(k.join() === 'KeyU', 'Backspace clears a slot');
  await click('.kb-key[data-bind="gadget:0"]');
  await page.keyboard.press('KeyG');
  await frames(page, 2);
  // Graphics: presets and Custom, the frame cap
  await click('.tab', 'Graphics');
  await frames(page, 3);
  const preset = await G(() => [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelector('.choice-val').textContent);
  // (3.1: Auto by default; under automation without ?detect=1 it keeps the 3.0 default, Epic)
  const pv = await G(() => ({ auto: window.__app.settings.get().video.auto, p: window.__app.settings.get().video.preset }));
  assert(/^Auto/.test(preset) && pv.auto && pv.p === 'epic', `Auto by default (${preset}, ${JSON.stringify(pv)})`);
  // Auto -> Low -> Medium -> High -> Ultra
  for (let i = 0; i < 4; i++) {
    await G(() => [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelectorAll('.choice-arrow')[1].click());
    await frames(page, 2);
  }
  await frames(page, 2);
  // (this page runs ?gfx=min, so the level itself stays minimal; the settings and the menu follow the preset)
  let q = await G(() => ({ p: window.__app.settings.get().video.preset, g: window.__app.settings.get().video.gfx, sh: [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Shadows/.test(r.textContent)).querySelector('.choice-val').textContent }));
  assert(q.p === 'ultra' && q.g.shadows === 'ultra' && q.g.lights === 20 && q.g.aa === 'taa' && q.g.volLights === 8 && q.sh === 'Ultra', `a preset sets every feature, the rows follow (${q.p}, shadows ${q.sh})`);
  // (3.1: a preset also sets its render scale with TAAU; Epic is native)
  const disp = await G(() => ({ s: window.__app.settings.get().video.renderScale, u: window.__app.settings.get().video.upscaler }));
  assert(disp.s === 0.9 && disp.u === 'taau', `Ultra renders at 90% with TAAU (${JSON.stringify(disp)})`);
  assert(!(await G(() => window.__app.settings.get().video.auto)), 'picking a preset turns Auto off');
  await G(() => [...document.querySelectorAll('.tab-panel.active .row-toggle')].find((r) => /Bloom/.test(r.textContent)).click());
  await frames(page, 2);
  q = await G(() => ({ p: window.__app.settings.get().video.preset, shown: [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelector('.choice-val').textContent }));
  assert(q.p === 'custom' && q.shown === 'Custom', 'changing a feature makes it Custom');
  await G(() => window.__app.settings.update((d) => { d.video.fpsCap = 30; }));
  const cap = await G(() => window.__app.loop.fpsCap);
  assert(cap === 30, 'the frame-rate cap reaches the loop');
  await G(() => window.__app.settings.update((d) => { d.video.fpsCap = 0; }));
  // the interface switch: Mobile brings the touch settings back
  await G(() => window.__app.settings.update((d) => { d.video.platform = 'mobile'; }));
  await frames(page, 4);
  const mob = await G(() => ({ cls: document.body.classList.contains('platform-mobile'), tabs: [...document.querySelectorAll('.settings-screen .tab')].map((t) => t.dataset.tab) }));
  assert(mob.cls && mob.tabs.includes('touch') && !mob.tabs.includes('kbm'), `Interface: Mobile (${mob.tabs.join(',')})`);
  await G(() => window.__app.settings.update((d) => { d.video.platform = 'auto'; }));
  await frames(page, 4);
  // 3.1.7 Resolution (desktop): the monitor's resolutions (3.2.1); a pick applies at once, Keep keeps it, no answer reverts in 15 s
  {
    const openRes = () => G(() => [...document.querySelectorAll('.settings-screen .btn')].find((b) => /^Resolution:/.test(b.textContent)).click());
    const pickRes = (re) => G((src) => [...document.querySelectorAll('.res-dialog .btn')].find((b) => new RegExp(src).test(b.textContent)).click(), re);
    const scale0 = await G(() => window.__app.settings.get().video.renderScale);
    await G(() => window.__app.settings.update((d) => { d.video.dynamicRes = true; }));
    await openRes();
    await page.waitForSelector('.res-dialog');
    // (3.2.1: the monitor's standard resolutions - a 1920 x 1080 screen: 1920 x 1080 (native), 1600 x 900, 1366 x 768,
    // 1280 x 720)
    const opts = await G(() => [...document.querySelectorAll('.res-dialog .btn')].map((b) => b.textContent));
    const mon = await G(() => `${Math.round(screen.width * devicePixelRatio)} x ${Math.round(screen.height * devicePixelRatio)}`);
    assert(opts.length >= 3 && opts[0] === `${mon} (native)` && opts.every((o) => /^\d+ x \d+( \(native\))?$/.test(o)), `Resolution lists the monitor's resolutions (${opts.join(' | ')})`);
    const second = opts[1];
    const last = opts.at(-1);
    const hOf = (o) => Number(o.split(' x ')[1]);
    const monH = Number(mon.split(' x ')[1]);
    await pickRes(`^${second}$`);
    await page.waitForFunction(() => /Keep this resolution/.test(document.querySelector('.dialog-title')?.textContent ?? ''));
    const applied = await G(() => ({ s: window.__app.settings.get().video.renderScale, r: window.__app.settings.get().video.resolution, dyn: window.__app.settings.get().video.dynamicRes, msg: document.querySelector('.dialog-msg').textContent }));
    assert(Math.abs(applied.s - hOf(second) / monH) < 1e-6 && applied.r === second.replace(' x ', 'x') && !applied.dyn && /Reverting to .* in 15 s/.test(applied.msg), `a pick applies at once and asks to keep it (${JSON.stringify(applied)})`);
    await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Keep/.test(b.textContent)).click());
    await page.waitForTimeout(1500);
    const kept = await G(() => ({ r: window.__app.settings.get().video.resolution, row: [...document.querySelectorAll('.settings-screen .btn')].find((b) => /^Resolution:/.test(b.textContent)).textContent }));
    assert(kept.r === second.replace(' x ', 'x') && kept.row.includes(second), `Keep keeps it, the row shows it (${kept.row})`);
    await openRes();
    await page.waitForSelector('.res-dialog');
    await pickRes(`^${last}$`);
    await page.waitForFunction(() => /Keep this resolution/.test(document.querySelector('.dialog-title')?.textContent ?? ''));
    assert((await G(() => window.__app.settings.get().video.resolution)) === last.replace(' x ', 'x'), 'the second pick applies');
    await page.waitForFunction(() => !document.querySelector('.dialog-title'), null, { timeout: 25000 });
    const back = await G(() => window.__app.settings.get().video.resolution);
    assert(back === second.replace(' x ', 'x'), `no answer for 15 s puts the last resolution back (${back})`);
    await G(() => window.__app.settings.update((d) => { d.video.resolution = ''; }));
    await G((v) => window.__app.settings.update((d) => { d.video.renderScale = v; }), scale0);
  }
  await page.keyboard.press('Escape');
  await frames(page, 3);
  // in a match: the rebound key acts, no touch controls
  await page.goto(url + '?autostart=proving&gfx=min');
  await page.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 60000 });
  await page.keyboard.down('KeyU');
  await frames(page, 2);
  const rel = await G(() => window.__app.input.state.buttons.reload.down);
  await page.keyboard.up('KeyU');
  assert(rel, 'the rebound key reloads in a match');
  const touchShown = await G(() => { const t = document.querySelector('.touch-layer'); return !!t && getComputedStyle(t).display !== 'none' && !t.hidden; });
  assert(!touchShown, 'no touch controls on desktop');
  // the benchmark: a (shortened) flight, then the result, saved as feedback
  // (software GL renders the Warehouse at ~1 fps: a 2 s flight is ~10 frames)
  await G(() => {
    window.__bench.seconds = 2;
    window.__bench.warmup = 0.5;
    window.__app.benchmark();
  });
  await page.waitForFunction(() => /average \d+ fps, 1% low \d+ fps/.test(document.querySelector('.dialog')?.textContent ?? ''), null, { timeout: 240000 });
  const bt = await G(() => ({ text: document.querySelector('.dialog').textContent, hudHidden: document.body.classList.contains('photo-mode') }));
  assert(!bt.hudHidden, `the benchmark reports (${bt.text.match(/Warehouse[^)]*\)/)?.[0]})`);
  // (3.1.2: saved on its own as it finishes; the report scrolls inside the dialog and has Copy text)
  const saved = await G(async () => (await window.__app.feedback.all()).find((e) => e.category === 'performance')?.text ?? '');
  assert(/Benchmark - Warehouse/.test(saved), 'the result is saved as a performance note without a tap');
  const dlg = await G(() => {
    const m = document.querySelector('.dialog-msg');
    const cs = getComputedStyle(m);
    return { scroll: cs.overflowY, copy: [...document.querySelectorAll('.dialog .btn')].some((b) => /Copy text/.test(b.textContent)) };
  });
  assert(dlg.scroll === 'auto' && dlg.copy, `the report scrolls and offers Copy text (${JSON.stringify(dlg)})`);
  await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Done/.test(b.textContent)).click());
  await page.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 30000 });
  // every preset (3.1 ladder, desktop: Low .. Epic): five flights, one line each
  await G(() => window.__app.benchmark('presets'));
  await page.waitForFunction(() => (document.querySelector('.dialog')?.textContent?.match(/average \d+ fps/g) ?? []).length === 5, null, { timeout: 480000 });
  const lines = await G(() => window.__app.current.benchmarkLines.map((l) => l.split(':')[0]));
  assert(lines.length === 5 && ['low', 'medium', 'high', 'ultra', 'epic'].every((p, i) => new RegExp(p, 'i').test(lines[i])), `every preset runs in turn (${lines.join(' | ')})`);
  await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Done/.test(b.textContent)).click());
  await page.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 30000 });
  // 3.1.4: every run loads its own match (its settings set before the load); a sameMatch run goes on in the last
  // one; the diagnosis runs rebuild the post stack / the shadows mid-match
  const bm = await G(async () => {
    const app = window.__app;
    // (a WeakSet: the test must not keep the matches alive itself)
    const seen = new WeakSet();
    let matches = 0;
    const tags = new Set();
    let partial = '';
    const run = (label, extra) => ({ label, preset: null, scale: null, seconds: 2, sustained: false, ...extra });
    app.benchmark({ kind: 'features', runs: [run('current settings'), run('without bloom', { gfx: { bloom: false } }), run('post rebuilt', { rebuild: 'post' }), run('shadows rebuilt', { rebuild: 'shadows', sameMatch: true })], idx: 0, lines: [] });
    await new Promise((r) => {
      const t = setInterval(() => {
        const c = app.current;
        if (c?.benchmarkLines && !seen.has(c)) {
          seen.add(c);
          matches++;
          window.__gsProto ??= Object.getPrototypeOf(c);
        }
        const tg = document.getElementById('bench-tag')?.textContent;
        if (tg) tags.add(tg.replace(/ · \d+ fps| · warming up| · loading/, ''));
        if (!partial) void app.feedback.all().then((l) => (partial = l.find((e) => /runs so far/.test(e.text))?.text.split(' - ')[0] ?? ''));
        if (/average \d+ fps/.test(document.querySelector('.dialog')?.textContent ?? '')) {
          clearInterval(t);
          r();
        }
      }, 50);
    });
    const c = app.current;
    return { matches, lines: c.benchmarkLines.map((l) => l.split(':')[0]), builds: c.stack.builds, ov: !!app.quality.ov, tags: [...tags], partial, tagLeft: !!document.getElementById('bench-tag') };
  });
  assert(bm.matches === 3 && bm.lines.length === 4 && /post rebuilt/.test(bm.lines[2]) && /shadows rebuilt/.test(bm.lines[3]) && bm.builds === 2, `one match per run, the rebuild runs in the last (${JSON.stringify(bm)})`);
  await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Done/.test(b.textContent)).click());
  await page.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 30000 });
  assert(!(await G(() => !!window.__app.quality.ov)), 'the benchmark leaves no override behind');
  // 3.1.7: no match outlives its scene (the shader cache held every one: the phone ran out of memory)
  {
    const leak = await page.context().newCDPSession(page);
    // (the release is asynchronous: a slow renderer takes seconds to drop the last match, so count until it reaches 0 or stays)
    const count = async () => {
      await leak.send('HeapProfiler.collectGarbage');
      const { result: proto } = await leak.send('Runtime.evaluate', { expression: 'window.__gsProto', objectGroup: 'leak' });
      const { objects } = await leak.send('Runtime.queryObjects', { prototypeObjectId: proto.objectId, objectGroup: 'leak' });
      const { result: r } = await leak.send('Runtime.callFunctionOn', { objectId: objects.objectId, functionDeclaration: 'function(){return this.length}', returnByValue: true, objectGroup: 'leak' });
      await leak.send('Runtime.releaseObjectGroup', { objectGroup: 'leak' });
      return r.value;
    };
    const result = { value: await count() };
    for (let i = 0; i < 20 && result.value !== 0; i++) {
      await page.waitForTimeout(500);
      result.value = await count();
    }
    assert(result.value === 0, `no match is kept in memory after it ends (${result.value} left)`);
  }
  assert(bm.tags.includes('Run 2/4 · without bloom') && bm.tags.includes('Run 4/4 · shadows rebuilt') && !bm.tagLeft, `the run tag names each run, gone at the end (${bm.tags.join(' | ')})`);
  assert(/^Benchmark \(\d of 4 runs so far\)$/.test(bm.partial), `the note is saved after every run (${bm.partial})`);
  // (the hardware driver warns once per released match: Babylon polls a program the match's teardown already deleted)
  const errs = errors.filter((e) => !/GPU stall|GL Driver|glGetProgramiv: Program object expected/.test(e));
  assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  // 3.1.4 crash log: a page that dies while open leaves a note for the next start; a reload is a clean close
  await G(() => window.__app.crashLog.stage('crash test: run 2/9'));
  const cdp = await page.context().newCDPSession(page);
  // (the command never answers: the page is gone)
  await Promise.race([cdp.send('Page.crash').catch(() => undefined), wait(2000)]);
  const p2 = await page.context().newPage();
  await p2.goto(url + '?gfx=min');
  await p2.waitForSelector('.main-menu');
  const crashes = async () => p2.evaluate(async () => (await window.__app.feedback.all()).filter((e) => /^Crash report/.test(e.text)).map((e) => e.text));
  let cr = [];
  for (let i = 0; i < 40 && !cr.length; i++) {
    cr = await crashes();
    if (!cr.length) await wait(100);
  }
  assert(cr.length === 1 && /crash test: run 2\/9/.test(cr[0]), `a crash leaves a report naming what was running (${cr[0]?.slice(0, 160)})`);
  await p2.reload();
  await p2.waitForSelector('.main-menu');
  await wait(800);
  assert((await crashes()).length === 1, 'a reload is not reported as a crash');
  await browser.close();

  // aspects (16:10, 21:9, 32:9): menus a centred 16:9 layout, the HUD inset on 32:9, Hor+ up to the FOV cap
  for (const [w, hh, label] of [[1280, 800, '16:10'], [2520, 1080, '21:9'], [2560, 720, '32:9']]) {
    const a = await launch({ url, params: '', touch: false, viewport: { width: w, height: hh } });
    browser = a.browser;
    const P = a.page;
    const GA = (f, x) => P.evaluate(f, x);
    await P.waitForSelector('.main-menu');
    await frames(P, 3);
    const m = await GA(() => {
      const r = document.querySelector('.screens').getBoundingClientRect();
      const it = document.querySelector('.main-menu .menu-item').getBoundingClientRect();
      return { cx: r.left + r.width / 2, w: r.width, h: r.height, item: it.left, W: innerWidth, H: innerHeight };
    });
    assert(Math.abs(m.cx - m.W / 2) < 2 && m.w <= m.H * (16 / 9) + 2 && m.h >= m.H - 2, `${label}: menus a centred layout (${m.w.toFixed(0)} x ${m.h.toFixed(0)} in ${m.W} x ${m.H})`);
    assert(m.item >= (m.W - m.w) / 2 - 1, `${label}: the menu sits inside it (x ${m.item.toFixed(0)})`);
    if (process.env.SHOTS) await P.screenshot({ path: `${process.env.SHOTS}/desk-${label.replace(':', 'x')}-menu.png` });
    await P.goto(url + '?autostart=warehouse&mode=sandbox&gfx=min');
    await P.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 60000 });
    await GA(() => window.__app.settings.update((d) => { d.video.fovH = 100; d.video.maxFov = 120; }));
    await frames(P, 4);
    const v = await GA(() => {
      const cam = window.__app.current.player.cam.camera;
      const aspect = window.__app.engine.getAspectRatio(cam);
      const hdeg = (2 * Math.atan(Math.tan(cam.fov / 2) * aspect) * 180) / Math.PI;
      const vit = document.querySelector('.hud-vitals').getBoundingClientRect();
      const mm = document.querySelector('.hud-minimap').getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-inset'));
      return { hdeg, aspect, vit: vit.left, mm: mm.right, inset, W: innerWidth };
    });
    if (label === '32:9') {
      assert(Math.abs(v.hdeg - 120) < 1, `32:9: Hor+ stops at the widest FOV (${v.hdeg.toFixed(1)} deg)`);
      assert(v.inset === 640 && v.vit >= 640 && v.mm <= v.W - 640 + 1, `32:9: HUD panels in a centred 16:9 (inset ${v.inset}, vitals x ${v.vit.toFixed(0)}, minimap right ${v.mm.toFixed(0)})`);
    } else {
      const want = (2 * Math.atan(Math.tan(Math.atan(Math.tan((100 * Math.PI) / 360) * (9 / 16))) * v.aspect) * 180) / Math.PI;
      assert(Math.abs(v.hdeg - want) < 1 && v.inset === 0, `${label}: Hor+ (${v.hdeg.toFixed(1)} deg), HUD full width`);
    }
    if (process.env.SHOTS) await P.screenshot({ path: `${process.env.SHOTS}/desk-${label.replace(':', 'x')}-game.png` });
    const ae = a.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
    assert(ae.length === 0, `${label}: no console errors${ae.length ? ': ' + ae.slice(0, 3).join(' | ') : ''}`);
    await browser.close();
  }

  // 3.1 Auto graphics: from the GPU's name (software GL = Low), else measured on the menu stage
  {
    // (the software renderer is named explicitly: with E2E_GPU=1 the real name is the PC's RTX)
    const d = await launch({ url, params: 'detect=1&platform=desktop&renderer=Google%20SwiftShader', touch: false, viewport: { width: 1280, height: 720 } });
    browser = d.browser;
    await d.page.waitForFunction(() => window.__app?.settings.get().video.device.source !== 'none', null, { timeout: 60000 });
    const v = await d.page.evaluate(() => window.__app.settings.get().video);
    assert(v.auto && v.device.source === 'gpu' && v.device.tier === 'low' && v.preset === 'low', `Auto: a software renderer starts on Low by its name (${JSON.stringify(v.device)}, ${v.preset})`);
    await browser.close();
    // (3.3: phones have one fixed look - the measuring is a desktop GPU the tables do not know)
    const c = await launch({ url, params: 'detect=1&platform=desktop&renderer=Mystery%20GPU%2042', touch: false, viewport: { width: 960, height: 540 } });
    browser = c.browser;
    await c.page.waitForFunction(() => window.__app?.detecting, null, { timeout: 60000 });
    const during = await c.page.evaluate(() => window.__app.quality.level.name);
    await c.page.waitForFunction(() => window.__app.settings.get().video.device.source === 'calibrated', null, { timeout: 60000 });
    const cv = await c.page.evaluate(() => ({ v: window.__app.settings.get().video, toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '), ov: window.__app.quality.level.name }));
    assert(['low', 'medium', 'high', 'ultra', 'epic'].includes(cv.v.device.tier) && cv.v.auto && cv.v.preset === cv.v.device.tier, `Auto: an unknown GPU is measured on the menu stage (${during} first, then ${cv.v.device.tier})`);
    // (all toasts: on a fast renderer the service worker's "Ready to play offline" is still up beside the result)
    assert(/for this device/.test(cv.toast), `the result is shown (${cv.toast})`);
    // (the settings save is debounced: wait until IndexedDB has the result; page.evaluate awaits the promise,
    // waitForFunction would take the promise itself as truthy)
    const saved = () => c.page.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('shoulder-strike');
      r.onsuccess = () => {
        try {
          const q = r.result.transaction('kv').objectStore('kv').get('settings');
          q.onsuccess = () => res(q.result?.video?.device?.source === 'calibrated');
          q.onerror = () => res(false);
        } catch {
          res(false);
        }
      };
      r.onerror = () => res(false);
    }));
    for (let i = 0; i < 60 && !(await saved()); i++) await new Promise((r) => setTimeout(r, 500));
    assert(await saved(), 'the detection is saved');
    await c.page.reload();
    await c.page.waitForFunction(() => window.__app?.current, null, { timeout: 60000 });
    await frames(c.page, 90);
    const again = await c.page.evaluate(() => ({ det: window.__app.detecting, v: window.__app.settings.get().video }));
    assert(!again.det && again.v.device.source === 'calibrated' && again.v.preset === cv.v.device.tier, `the same device is not measured again (${JSON.stringify({ det: again.det, device: again.v.device, preset: again.v.preset })})`);
    await browser.close();
  }

  // 3.4 the phone look: no detection, one fixed look in a match - the light renderer (the blockout's boxes in
  // standard materials, smooth characters, no post stack, no shadow maps), native, 60 fps (30 at the governor's last
  // level); then the 3.3 voxel look (the Phone check's comparison run): 75% through TAAU, the lamps as one light
  // volume, plain voxels, no bloom
  {
    const p = await launch({ url, params: 'detect=1&platform=mobile&renderer=Apple%20GPU&gfx=user&autostart=warehouse&mode=clear', touch: false, viewport: { width: 640, height: 360 } });
    browser = p.browser;
    await p.page.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 240000 });
    await frames(p.page, 6);
    const lt = await p.page.evaluate(() => {
      const a = window.__app;
      const g = a.current;
      const q = a.quality.level;
      const e = a.engine;
      return { det: a.detecting, source: a.settings.get().video.device.source, phone: q.phone, lite: q.lite, up: q.upscale, cap: a.loop.fpsCap, gov: a.quality.governor.level, pps: g.player.cam.camera._postProcesses.filter(Boolean).map((x) => x.name), voxels: !!g.world.voxels, lamps: !!g.world.lamps, mat: g.world.level.meshes[0]?.material?.getClassName(), body: !!g.player.rig.voxel, sun: q.shadow.sun, casters: q.shadow.casters, scale: e.getRenderWidth() / Math.round(e.getRenderingCanvas().clientWidth * devicePixelRatio) };
    });
    assert(!lt.det && lt.source === 'none', `phone: nothing detected or measured (${lt.source})`);
    assert(lt.phone && lt.lite && lt.up === 1 && [60, 30].includes(lt.cap), `phone: the light look, native, capped at ${lt.cap} (governor level ${lt.gov})`);
    // (a match starts native; software GL is slow, so the governor may already have stepped: the canvas follows it)
    assert(Math.abs(lt.scale - [1, 0.92, 0.84, 0.75][Math.min(3, lt.gov)]) < 0.02, `phone: the canvas at the governor's step (x${lt.scale.toFixed(2)}, level ${lt.gov})`);
    assert(!lt.voxels && lt.lamps && lt.mat === 'StandardMaterial' && !lt.body, `phone: the blockout in standard materials, smooth characters, the lamps from the baked volume (3.6) (${JSON.stringify(lt)})`);
    assert(!lt.sun && lt.casters === 0 && !lt.pps.some((n) => /taau|ssao|bloom|default|volum/i.test(n)), `phone: no shadow maps, no post stack (${lt.pps.join(',')})`);
    // the governor steps the canvas: 100 -> 92 -> 84 -> 75%, then 30 fps
    const steps = await p.page.evaluate(() => {
      const a = window.__app;
      const e = a.engine;
      const out = [];
      for (let i = 0; i < 4; i++) {
        let n = 0;
        while (!a.quality.governor.frame(60, 16.7) && n++ < 400);
        a.quality['applyAdaptive']();
        out.push({ l: a.quality.governor.level, s: +(e.getRenderWidth() / Math.round(e.getRenderingCanvas().clientWidth * devicePixelRatio)).toFixed(2), cap: a.loop.fpsCap });
      }
      return out;
    });
    const last = steps[steps.length - 1];
    assert(steps.every((x) => x.s >= 0.74) && last.l === 4 && last.cap === 30 && steps[2].s < 0.8, `phone: the governor steps the resolution to 75%, then 30 fps (${JSON.stringify(steps)})`);
    // the 3.3 voxel look, as the Phone check's comparison run starts it
    await p.page.evaluate(() => {
      window.__bench.seconds = 60;
      window.__app.benchmark({ kind: 'phone', runs: [{ label: 'voxel look', preset: null, scale: 0.75, seconds: 60, sustained: false, look: 'voxel' }], idx: 0, lines: [] });
    });
    await p.page.waitForFunction(() => !!window.__app.current?.player && window.__app.current.opts?.benchmark && !window.__app.quality.level.lite, null, { timeout: 240000 });
    await frames(p.page, 6);
    const ph = await p.page.evaluate(() => {
      const a = window.__app;
      const g = a.current;
      const q = a.quality.level;
      const pps = g.player.cam.camera._postProcesses.filter(Boolean).map((x) => x.name);
      const src = g.world.voxels?.meshes.find((m) => m.isEnabled() && m.subMeshes?.[0]?.effect)?.subMeshes[0].effect.fragmentSourceCode ?? '';
      return { det: a.detecting, source: a.settings.get().video.device.source, phone: q.phone, up: q.upscale, cap: a.loop.fpsCap, gov: a.quality.governor.level, vol: !!g.world.lamps?.volume, pps, src: src.length, ao: src.includes('float occ'), micro: src.includes('vxTap('), volShader: src.includes('lampVolA') && !src.includes('lampCapsule(lp, t0.xyz'), bloom: q.features.bloom, cascades: q.shadow.cascades, ctx: g.feedbackContext().spikes };
    });
    assert(ph.phone && ph.up === 0.75, `phone voxel look: 75% (TAAU) (governor level ${ph.gov})`);
    assert(ph.pps.includes('taau') && !ph.bloom && ph.cascades === 1, `phone voxel look: TAAU, no bloom, one moon cascade (${ph.pps.join(',')})`);
    assert(ph.vol && ph.volShader, 'phone voxel look: the lamps mixed into one light volume (two taps, no per-lamp loop in the shader)');
    assert(ph.src > 0 && !ph.ao && !ph.micro, 'phone voxel look: plain voxel surfaces (no AO, no surface taps)');
    assert(/spikes|no spikes/.test(ph.ctx), `phone: the spike log (${ph.ctx})`);
    // a switch re-mixes the volume on the GPU, at once
    const mix = await p.page.evaluate(() => {
      const g = window.__app.current;
      const reg = g.world.level.lights;
      const L = g.world.lamps;
      const n0 = L.volume.mixes;
      const grp = reg.lights.find((l) => l.group != null && l.kind !== 'flashlight').group;
      reg.setGroup(grp, false);
      L.frame();
      const n1 = L.volume.mixes;
      reg.setGroup(grp, true);
      L.frame();
      return { n0, n1, n2: L.volume.mixes };
    });
    assert(mix.n1 === mix.n0 + 1 && mix.n2 === mix.n1 + 1, `phone voxel look: a light switch re-mixes the volume (${JSON.stringify(mix)})`);
    const pe = p.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
    assert(pe.length === 0, `phone: no console errors${pe.length ? ': ' + pe.slice(0, 3).join(' | ') : ''}`);
    await browser.close();
  }

  // the Epic renderer in a match (small window: software GL)
  const e = await launch({ url, params: 'autostart=warehouse&mode=clear&gfx=epic&platform=desktop', touch: false, viewport: { width: 640, height: 360 } });
  browser = e.browser;
  await e.page.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 180000 });
  await frames(e.page, 6);
  const r = await e.page.evaluate(() => {
    const g = window.__app.current;
    const rig = g.world.lightRig;
    const vx = g.world.voxels;
    return { clustered: rig.clustered, placed: rig.placed, shadowed: rig.shadowed, sun: !!g.world.shadow, pps: g.player.cam.camera._postProcesses.filter(Boolean).map((p) => p.name), vox: vx && { ...vx.stats, size: vx.lv.size, levels: vx.materials.length, casters: vx.meshes.filter((m) => rig.casters.includes(m)).length, meshes: vx.meshes.length } };
  });
  assert(r.vox && r.vox.size === 0.05 && r.vox.levels === 3 && r.vox.chunks > 20 && r.vox.quads > 1000, `Epic: the Warehouse in 5 cm voxels, three levels of detail (${JSON.stringify(r.vox)})`);
  assert(r.vox.casters === r.vox.meshes, 'every voxel chunk casts shadows');
  // the voxel shading made it into the compiled PBR shader (tone, AO, micro detail; not the cheap path's code)
  const shaded = await e.page.evaluate(() => {
    const w = window.__app.current.world;
    const src = (v) => v?.meshes.find((m) => m.isEnabled() && m.subMeshes?.[0]?.effect)?.subMeshes[0].effect.fragmentSourceCode ?? '';
    return [src(w.voxels), src(w.voxelsFine)].map((s) => s.includes('m = vxMat(v)') && s.includes('vxAmbient ='));
  });
  assert(shaded.every(Boolean), `voxel chunks compile the full voxel shading (${shaded})`);
  const art = await e.page.evaluate(() => {
    const w = window.__app.current.world;
    return { fine: w.voxelsFine && { size: w.voxelsFine.lv.size, chunks: w.voxelsFine.stats.chunks }, sky: !!w.voxels.skyTex, inside: w.voxels.skyAt(5, 1.2, 0), yard: w.voxels.skyAt(2, 1.2, -21.5), roofIn: w.voxels.roofAt(5, 0), roofYard: w.voxels.roofAt(2, -21.5), palette: w.voxels.lv.palette.length };
  });
  assert(art.fine && art.fine.size === 0.025 && art.fine.chunks > 5, `props on a 2.5 cm layer (${JSON.stringify(art.fine)})`);
  assert(art.sky && art.inside < 0.5 && art.yard > 0.8, `the sky is baked: dark under the roof, open in the yard (${art.inside.toFixed(2)} / ${art.yard.toFixed(2)})`);
  assert(art.roofIn > 5 && art.roofYard < 1, `rain stops at the roof, falls to the ground in the yard (${art.roofIn} / ${art.roofYard})`);
  assert(art.palette > 40, `the art layer's materials (${art.palette} palette entries)`);
  // GI per lamp circuit (Epic): baked, in the shader (3.2: the circuits mixed into one texture), and a switched-off
  // circuit takes its bounce light away (the mix's sum drops, and comes back)
  const gi = await e.page.evaluate(() => {
    const w = window.__app.current.world;
    const vx = w.voxels;
    const src = vx.meshes.find((m) => m.isEnabled() && m.subMeshes?.[0]?.effect)?.subMeshes[0].effect.fragmentSourceCode ?? '';
    const reg = w.level.lights;
    const l = reg.lights.find((x, i) => w.giSlotOf?.[i] >= 0 && x.group >= 0 && x.on);
    const sum = () => vx.giMix.reduce((a, v, i) => (i % 4 === 3 ? a : a + v), 0);
    const before = sum();
    if (l) reg.setGroup(l.group, false);
    w.frame(window.__app.current.player.position, 0);
    const after = sum();
    if (l) reg.setGroup(l.group, true);
    w.frame(window.__app.current.player.position, 0);
    return { groups: vx.giGroups, shader: src.includes('voxGi'), before, after, back: sum() };
  });
  assert(gi.groups > 1 && gi.shader, `GI baked per lamp circuit and in the voxel shader (${gi.groups} circuits)`);
  assert(gi.before > 0 && gi.after < gi.before && gi.back === gi.before, `a switched-off circuit takes its bounce light away (${gi.before} -> ${gi.after} -> ${gi.back})`);
  // voxel characters (3.0 phase 3): one skinned voxel body per character, the smooth parts unseen
  const ch = await e.page.evaluate(async () => {
    const g = window.__app.current;
    const rigs = [g.player.rig, ...g.enemyMgr.enemies.map((x) => x.rig).filter((r) => r && !r.isDog)];
    const casters = g.world.lightRig.casters;
    // bones follow the joints: each bone = its node relative to the root
    const err = (r) => {
      const v = r.voxel;
      const inv = r.root.getWorldMatrix().clone().invert();
      let worst = 0;
      v.bones.forEach((b, i) => { const m = v.nodes[i].getWorldMatrix().multiply(inv).m; const l = b.getLocalMatrix().m; for (let k = 12; k < 15; k++) worst = Math.max(worst, Math.abs(m[k] - l[k])); });
      return worst;
    };
    const p = g.player.rig;
    const lens0 = p.voxel.meshes[1].getVerticesData('color').slice();
    p.setLensGlow(true);
    const lensChanged = p.voxel.meshes[1].getVerticesData('color').some((c, i) => Math.abs(c - lens0[i]) > 1e-3);
    p.setLensGlow(false);
    p.setHeadVisible(false);
    const headHidden = !p.voxel.meshes[1].isVisible && p.voxel.meshes[0].isVisible;
    p.setHeadVisible(true);
    // a ragdoll still drives its voxel body (the joints re-parented onto physics nodes)
    const victim = g.enemyMgr.enemies.find((x) => x.rig?.voxel);
    const P = g.player.position.constructor;
    victim.applyDamage({ amount: 99999, point: victim.pos.clone(), dir: new P(0, 0, 1), part: 'body', kind: 'bullet', attackerTeam: 'player', attackerId: 'test', sourcePos: victim.pos.clone(), impulse: 1 });
    const body = g.enemyMgr.bodies.at(-1);
    await new Promise((res) => { let n = 0; const o = g.scene.onAfterRenderObservable.add(() => { if (++n >= 3) { o.remove(); res(); } }); });
    const rag = body?.['rig'];
    return {
      n: rigs.length,
      voxel: rigs.filter((r) => r.voxel).length,
      hidden: rigs.every((r) => r.parts.every((m) => !m.isVisible)),
      cast: rigs.every((r) => r.voxel.meshes.every((m) => casters.includes(m))),
      quads: p.voxel.meshes[0].getTotalIndices() / 6,
      err: Math.max(...rigs.map(err)),
      ragErr: rag?.voxel ? err(rag) : -1,
      lensChanged,
      headHidden,
    };
  });
  assert(ch.voxel === ch.n && ch.hidden, `every character is a voxel body, the smooth parts unseen (${ch.voxel} / ${ch.n})`);
  assert(ch.cast, 'voxel bodies cast shadows');
  assert(ch.quads > 500, `the operator in 2 cm voxels (${ch.quads} quads)`);
  assert(ch.err < 1e-3 && ch.ragErr >= 0 && ch.ragErr < 1e-3, `bones follow the joints, ragdolls too (${ch.err.toExponential(1)}, ${ch.ragErr.toExponential(1)})`);
  assert(ch.lensChanged && ch.headHidden, 'lens glow and the camera head fade reach the voxels');
  // voxel weapons and chips (3.0 phase 4)
  const wp = await e.page.evaluate(() => {
    const g = window.__app.current;
    const models = g.weapons.slots.map((s) => s.model).filter(Boolean);
    const casters = g.world.lightRig.casters;
    // a shot into the wall in front: the struck voxel turns to the chip colour
    const vx = g.world.voxels;
    const P = g.player.position.constructor;
    const o = g.player.position.add(new P(0, 1.2, 0));
    const f = g.player.cam.forward;
    const end = o.add(new P(f.x, 0, f.z).normalize().scale(30));
    const h = g.ballistics.ray(o, end, 1);
    let chipped = null;
    if (h.hit) {
      const color = g.ballistics.onWorldHit?.(h.point, h.normal) ?? null;
      const lv = (g.world.voxelsFine && g.world.voxelsFine.brickmap.get(...[0, 1, 2].map((a) => Math.floor((h.point.asArray()[a] - h.normal.asArray()[a] * g.world.voxelsFine.lv.size * 0.5 - g.world.voxelsFine.lv.origin[a]) / g.world.voxelsFine.lv.size))) ? g.world.voxelsFine : vx);
      const at = [0, 1, 2].map((a) => Math.floor((h.point.asArray()[a] - h.normal.asArray()[a] * lv.lv.size * 0.5 - lv.lv.origin[a]) / lv.lv.size));
      chipped = { color, now: lv.brickmap.get(...at), chip: lv.lv.chip };
    }
    return {
      n: models.length,
      voxel: models.filter((m) => m.voxel).length,
      hidden: models.every((m) => m.parts.every((p) => !p.isVisible)),
      cast: models.every((m) => m.voxel.meshes.every((x) => casters.includes(x))),
      quads: models.map((m) => m.voxel.meshes[0].getTotalIndices() / 6),
      chipped,
    };
  });
  assert(wp.n > 0 && wp.voxel === wp.n && wp.hidden && wp.cast, `the loadout's weapons are voxel models casting shadows (${wp.voxel} / ${wp.n}, ${wp.quads} quads)`);
  assert(wp.chipped && wp.chipped.color && wp.chipped.now === wp.chipped.chip, `a shot chips the struck voxel (${JSON.stringify(wp.chipped)})`);
  // 3.2 baked lamps: every fixed light baked and drawn by the lamp plugin; the rig's pools only take flashlights;
  // a shot-out lamp goes dark at once
  const lb = await e.page.evaluate(async () => {
    const g = window.__app.current;
    const w = g.world;
    const L = w.lamps;
    const reg = w.level.lights;
    if (!L) return null;
    const fixed = reg.lights.filter((l) => l.kind !== 'flashlight').length;
    const rigIds = [...w.lightRig.pool, ...w.lightRig.shadowPool].map((s) => s.id).filter((id) => id >= 0);
    const i = L.order.findIndex((id) => reg.lights[id].destructible && reg.lights[id].on);
    const off = (L.lampBase + i * 6 + 1) * 4;
    const lit = () => L.buf[off] + L.buf[off + 1] + L.buf[off + 2];
    const before = lit();
    reg.destroy(L.order[i]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const pbr = g.scene.materials.filter((m) => m.getClassName() === 'PBRMaterial');
    return { n: L.ids.size, fixed, leak: rigIds.filter((id) => L.ids.has(id)).length, pool: w.lightRig.pool.length, shadows: w.lightRig.shadowPool.length, before, after: lit(), ms: Math.round(L.bakeMs), dims: L.atlasDims, pbr: pbr.length, plugged: pbr.filter((m) => !!m.pluginManager?.getPlugin('BakedLamps')).length };
  });
  assert(lb && lb.n > 0 && lb.n === lb.fixed && lb.leak === 0 && lb.pool <= 4 && lb.shadows <= 2, `Epic: every fixed light baked, the rig holds only flashlights (${JSON.stringify(lb)})`);
  assert(lb && lb.pbr > 0 && lb.plugged === lb.pbr, `the lamp plugin is on every PBR material (${lb?.plugged} / ${lb?.pbr})`);
  assert(lb && lb.before > 0 && lb.after === 0, `a shot-out lamp goes dark in the baked lighting (${lb?.before} -> ${lb?.after}); bake ${lb?.ms} ms`);
  // 3.1.7: every material fits WebGL's guaranteed 16 textures per shader (software GL allows 32; on the laptop's
  // D3D11 an Epic level shader with 8 soft lamp shadows failed: the level drew black under the fog).
  // An effect's sampler list is trimmed to the textures its program uses only once it has compiled (an uncompiled one
  // lists every candidate: partSkinMat showed 61). D3D11 takes several seconds on the voxel characters' shaders, so
  // the check waits for the effects of every drawn mesh, then counts.
  const texProbe = () => e.page.evaluate(() => {
    const scene = window.__app.current.scene;
    let max = 0;
    let who = '';
    let pending = 0;
    for (const m of scene.meshes) {
      if (!m.isEnabled() || !m.isVisible) continue;
      for (const sm of m.subMeshes ?? []) {
        if (!sm.getMaterial?.() || !sm.effect) continue;
        if (!sm.effect.isReady()) {
          pending++;
          continue;
        }
        const n = sm.effect._samplerList?.length ?? 0;
        if (n > max) {
          max = n;
          who = sm.getMaterial().name;
        }
      }
    }
    return { max, who, pending };
  });
  let tex = await texProbe();
  for (let i = 0; i < 120 && tex.pending > 0; i++) {
    await wait(500);
    tex = await texProbe();
  }
  assert(tex.pending === 0, `Epic: every drawn mesh's shader compiled (${tex.pending} pending)`);
  assert(tex.max > 0 && tex.max <= 16, `Epic: every material shader within 16 textures (${tex.max}, ${tex.who})`);
  for (const pp of ['TAA', 'ssao', 'ssr', 'volumetric', 'bloomMerge', 'imageProcessing', 'cinematic']) assert(r.pps.includes(pp), `post stack has ${pp}`);
  assert(r.pps.at(-1) === 'cinematic', 'the grade / goggles pass stays last');
  const eerrs = e.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(eerrs.length === 0, `Epic renders without console errors${eerrs.length ? ': ' + eerrs.slice(0, 4).join(' | ') : ''}`);
  await browser.close();

  // 3.0 phase 5: ray-traced reflections, TAAU, Panini (the saved settings, changed in the match)
  const u = await launch({ url, params: 'autostart=warehouse&gfx=user&platform=desktop', touch: false, viewport: { width: 640, height: 360 } });
  browser = u.browser;
  await u.page.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 180000 });
  await frames(u.page, 3);
  await u.page.evaluate(() => window.__app.settings.update((d) => { d.video.preset = 'custom'; d.video.gfx.reflections = 'rt'; d.video.gfx.rtRes = 'half'; d.video.upscaler = 'taau'; d.video.renderScale = 0.67; d.video.panini = 0.5; d.video.adaptive = false; }));
  await frames(u.page, 4);
  const p5 = await u.page.evaluate(() => {
    const a = window.__app;
    const cam = a.current.player.cam.camera;
    const pps = cam._postProcesses.filter(Boolean);
    const taau = pps.find((p) => p.name === 'taau');
    return { pps: pps.map((p) => p.name), canvas: a.engine.getRenderWidth(), scene: taau?.inputTexture?.width ?? 0, level: a.quality.level.upscale, panini: a.quality.level.panini };
  });
  assert(p5.pps.includes('rtReflect') && p5.pps.includes('rtComposite') && !p5.pps.includes('ssr'), `Ray traced: the reflection passes replace screen space (${p5.pps.join(',')})`);
  assert(p5.pps[0] === 'volumetric' && p5.pps[1] === 'taau' && !p5.pps.includes('TAA'), `TAAU leads the chain after the low-resolution fog pass and replaces TAA (${p5.pps.slice(0, 3).join(',')})`);
  assert(p5.scene > 0 && Math.abs(p5.scene / p5.canvas - 0.67) < 0.02, `TAAU: the scene at 67% of the native canvas (${p5.scene} of ${p5.canvas})`);
  assert(p5.pps.includes('panini') && p5.pps.at(-1) === 'cinematic', `Panini on, the grade pass still last (${p5.panini})`);
  await u.page.screenshot({ path: process.env.SHOT_P5 ?? '/tmp/e2e-p5.png', timeout: 600000 });
  // 3.1 frame governor: Adaptive detail on, software GL misses every frame - it steps down (TAAU input smaller)
  await u.page.evaluate(() => window.__app.settings.update((d) => void (d.video.adaptive = true)));
  await u.page.waitForFunction(() => window.__app.quality.governor.level >= 3, null, { timeout: 300000 });
  await frames(u.page, 3);
  const gv = await u.page.evaluate(() => {
    const a = window.__app;
    const taau = a.current.player.cam.camera._postProcesses.filter(Boolean).find((p) => p.name === 'taau');
    return { level: a.quality.governor.level, scene: taau?.inputTexture?.width ?? 0, canvas: a.engine.getRenderWidth(), detail: a.quality.detail, line: a.debug.extra.get('governor')?.() ?? '' };
  });
  assert(gv.scene / gv.canvas < 0.6 && gv.detail.scale < 1 && /governor L\d/.test(gv.line), `the governor steps down when frames are missed (level ${gv.level}: TAAU input ${gv.scene} of ${gv.canvas})`);
  // 3.1.3: the post stack rebuilt mid-match (Feature costs runs): the frozen materials re-read their setup, then freeze
  // again; fog / TAAU get a live depth pass even where depth of field had paused the camera's one
  const rb = await u.page.evaluate(async () => {
    const a = window.__app;
    const scene = a.current.scene;
    const wait = (n) => new Promise((r) => { let k = 0; const o = scene.onAfterRenderObservable.add(() => { if (++k >= n) { scene.onAfterRenderObservable.remove(o); r(); } }); });
    const frozen = () => scene.materials.filter((m) => m.isFrozen).length;
    a.quality.setOverride({ preset: 'high', scale: null });
    await wait(3);
    const before = frozen();
    const builds = a.current.stack.builds;
    a.quality.setOverride({ preset: 'high', scale: null, gfx: { ao: false, reflections: 'off' } });
    const thawed = frozen();
    const dr = Object.values(scene._depthRenderer ?? {})[0];
    let depthFrames = 0;
    const o = dr?.getDepthMap().onAfterRenderObservable.add(() => depthFrames++);
    await wait(4);
    if (o) dr.getDepthMap().onAfterRenderObservable.remove(o);
    const after = frozen();
    a.quality.setOverride(null);
    return { rebuilt: a.current.stack.builds > builds, before, thawed, after, depthFrames, enabled: dr?.enabled ?? null };
  });
  assert(rb.rebuilt && rb.before > 0 && rb.thawed < rb.before && rb.after >= rb.before, `a rebuilt post stack refreshes the frozen materials, then freezes them again (${JSON.stringify(rb)})`);
  assert(rb.enabled === true && rb.depthFrames >= 3, `without the G-buffer the fog / TAAU depth pass renders every frame (${JSON.stringify(rb)})`);
  const uerrs = u.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(uerrs.length === 0, `ray traced + TAAU + Panini render without console errors${uerrs.length ? ': ' + uerrs.slice(0, 4).join(' | ') : ''}`);
  console.log('desktop e2e passed');
} catch (err) {
  failed = true;
  console.error(err);
}
await browser?.close();
process.exit(failed ? 1 : 0);
