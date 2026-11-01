// Desktop (3.0): a mouse-and-keyboard 1080p window, menus scaled to it, Mouse & Keyboard first (rebinding: click, press; a key moves off its old action; Backspace clears; the
// in-game action follows), the Graphics menu (presets, Custom, the frame cap), and the Epic
// renderer booting in a match (clustered lights, shadow casters, the post stack) without console errors; 16:10,
// 21:9 and 32:9 windows (centred menus, the HUD inset, Hor+ up to the FOV cap).
// (voxel-retire: parts 3 and 4 run the smooth renderer; the voxel look is gone)
// (clean-up G2c) Every part's match is on the Test Chamber (chamber): the benchmark flies its rooms in the test mode (part 1), the
// ultrawide pages stand in its plain room (2), the Epic part spawns two alerted guards in its dark bay to light their torches (3).
import { launch, assert, frames, GPU } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// `--part=N[,M]` runs only those sections (the runner starts 1 to 4 side by side: each is its own browser; no argument: all four, as before)
const PARTS = (process.argv.find((a) => a.startsWith('--part='))?.slice(7) ?? '1,2,3,4').split(',');
const part = (n) => PARTS.includes(String(n));
let failed = false;
let browser;
try {
  if (part(1)) {
  // a 1920 x 1080 mouse-and-keyboard window
  const l = await launch({ url, params: '', viewport: { width: 1920, height: 1080 } });
  browser = l.browser;
  const { page, errors } = l;
  const G = (f, a) => page.evaluate(f, a);
  const click = (sel, text) => G(([s, t]) => [...document.querySelectorAll(s)].filter((e) => !e.closest('[hidden]')).find((e) => !t || new RegExp(t).test(e.textContent)).click(), [sel, text]);
  await wait(500);
  const plat = await G(() => ({ scale: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim() }));
  assert(plat.scale === '1.5', `menus scale to 1080p (x${plat.scale})`);
  const menuBox = await G(() => document.querySelector('.main-menu .menu-item').getBoundingClientRect().height);
  assert(menuBox > 45, `menu rows are big enough to read at 1080p (${menuBox.toFixed(0)} px)`);
  await click('.main-menu .btn', 'Settings');
  await frames(page, 4);
  const tabs = await G(() => [...document.querySelectorAll('.settings-screen .tab')].map((t) => t.dataset.tab));
  assert(tabs[0] === 'controls', `Controls first (${tabs.join(',')})`);
  // (menu-ui slice 2) the key list lives on CONTROLS / REMAP, keyboard and mouse first on a keyboard
  await click('.settings-screen .tab-panel.active .btn', '^Remap controls');
  await frames(page, 3);
  assert((await G(() => document.querySelector('.controls-screen .tab.active')?.dataset.tab)) === 'kbm', 'Remap opens on Keyboard and mouse');
  // rebind reload to U
  await click('.kb-key[data-bind="reload:0"]');
  await frames(page, 2);
  const listening = await G(() => document.querySelector('.kb-key[data-bind="reload:0"]').classList.contains('listening'));
  assert(listening, 'clicking a key waits for the new one');
  await page.keyboard.press('KeyU');
  await frames(page, 2);
  let k = await G(() => ({ r: window.__app.settings.get().keys.reload, label: document.querySelector('.kb-key[data-bind="reload:0"]').textContent }));
  assert(k.r[0] === 'KeyU' && k.label === 'U', `reload rebound to U (${k.label})`);
  // (locomotion step 18, D7) a key already in use is shared and warned about: G (gadget) onto reload's second slot
  await click('.kb-key[data-bind="reload:1"]');
  await page.keyboard.press('KeyG');
  await frames(page, 2);
  k = await G(() => ({ r: window.__app.settings.get().keys.reload, g: window.__app.settings.get().keys.gadget, toast: document.querySelector('.toasts')?.textContent ?? '', rows: [...document.querySelectorAll('.bind-row.conflict')].map((r) => r.dataset.row).sort().join() }));
  assert(k.r.join() === 'KeyU,KeyG' && k.g.join() === 'KeyG' && /also Quick-use selected gadget/.test(k.toast) && k.rows === 'gadget,reload', `a key in use is shared with a conflict warning (${k.toast.trim()}; rows ${k.rows})`);
  await click('.kb-key[data-bind="reload:1"]');
  await page.keyboard.press('Backspace');
  await frames(page, 2);
  k = await G(() => window.__app.settings.get().keys.reload);
  assert(k.join() === 'KeyU', 'Backspace clears a slot');
  await click('.kb-key[data-bind="gadget:0"]');
  await page.keyboard.press('KeyG');
  await frames(page, 2);
  // Graphics: presets and Custom, the frame cap (Esc back to Settings first)
  await page.keyboard.press('Escape');
  await frames(page, 3);
  await click('.settings-screen .tab', 'Graphics');
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
    assert(Math.abs(applied.s - hOf(second) / monH) < 1e-6 && applied.r === second.replace(' x ', 'x') && !applied.dyn && /Reverting to .* in 10 s/.test(applied.msg), `a pick applies at once and asks to keep it (${JSON.stringify(applied)})`);
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
  // in a match: the rebound key acts
  await page.goto(url + '?autostart=chamber&gfx=min');
  await page.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 60000 });
  await page.keyboard.down('KeyU');
  await frames(page, 2);
  const rel = await G(() => window.__app.input.state.buttons.reload.down);
  await page.keyboard.up('KeyU');
  assert(rel, 'the rebound key reloads in a match');
  // the benchmark: a (shortened) flight, then the result, saved as feedback
  // (software GL renders the Test Chamber at ~1 fps: a 2 s flight is ~10 frames)
  await G(() => {
    window.__bench.seconds = 2;
    window.__bench.warmup = 0.5;
    window.__app.benchmark();
  });
  await page.waitForFunction(() => /average \d+ fps, 1% low \d+ fps/.test(document.querySelector('.dialog')?.textContent ?? ''), null, { timeout: 240000 });
  const bt = await G(() => ({ text: document.querySelector('.dialog').textContent, hudHidden: document.body.classList.contains('photo-mode') }));
  assert(!bt.hudHidden, `the benchmark reports (${bt.text.match(/Test Chamber[^)]*\)/)?.[0]})`);
  // (3.1.2: saved on its own as it finishes; the report scrolls inside the dialog and has Copy text)
  const saved = await G(async () => (await window.__app.feedback.all()).find((e) => e.category === 'performance')?.text ?? '');
  assert(/Benchmark - Test Chamber/.test(saved), 'the result is saved as a performance note without a tap');
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
  // 3.1.7: no match outlives its scene (the shader cache held every one until memory ran out)
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
    // (load-latent-ui2) up to 60 s, a count after every 2 rendered frames: the release runs on the page's frames, which a
    // loaded CPU slows far past the old fixed 20 x 500 ms
    const result = { value: await count() };
    for (const t0 = Date.now(); result.value !== 0 && Date.now() - t0 < 60000; ) {
      await Promise.race([frames(page, 2), page.waitForTimeout(1000)]); // rAF stops on a hidden page: never hang past the cap
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
  // (load-audit) wait for the crash itself (not a fixed 2 s) and close the dead page before the new one: under load
  // the new page's goto hung past 120 s, the crashed renderer not yet torn down when it opened
  const crashed = page.waitForEvent('crash', { timeout: 60000 }).catch(() => null);
  // (the command never answers: the page is gone)
  await Promise.race([cdp.send('Page.crash').catch(() => undefined), wait(2000)]);
  assert(!!(await crashed), 'the page crashed (Page.crash)');
  await page.close().catch(() => undefined);
  const p2 = await page.context().newPage();
  await p2.goto(url + '?gfx=min');
  // (load-audit) the crash-log page's menu waits (after the load and the reload): 60 s, as smoke's boot wait
  await p2.waitForSelector('.main-menu', { timeout: 60000 });
  const crashes = async () => p2.evaluate(async () => (await window.__app.feedback.all()).filter((e) => /^Crash report/.test(e.text)).map((e) => e.text));
  let cr = [];
  for (let i = 0; i < 40 && !cr.length; i++) {
    cr = await crashes();
    if (!cr.length) await wait(100);
  }
  assert(cr.length === 1 && /crash test: run 2\/9/.test(cr[0]), `a crash leaves a report naming what was running (${cr[0]?.slice(0, 160)})`);
  await p2.reload();
  await p2.waitForSelector('.main-menu', { timeout: 60000 });
  await wait(800);
  assert((await crashes()).length === 1, 'a reload is not reported as a crash');
  await browser.close();

  }

  if (part(2)) {
  // aspects (16:10, 21:9, 32:9): menus a centred 16:9 layout, the HUD inset on 32:9, Hor+ up to the FOV cap
  for (const [w, hh, label] of [[1280, 800, '16:10'], [2520, 1080, '21:9'], [2560, 720, '32:9']]) {
    const a = await launch({ url, params: '', viewport: { width: w, height: hh } });
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
    await P.goto(url + '?autostart=chamber&mode=sandbox&gfx=min');
    // (load-latent-ui2) 120 s, as the other match loads: the shaders compile on the loading screen first
    await P.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 120000 });
    await GA(() => window.__app.settings.update((d) => { d.video.fovH = 100; d.video.maxFov = 120; }));
    await frames(P, 4);
    const v = await GA(() => {
      const cam = window.__app.current.player.cam.camera;
      const aspect = window.__app.engine.getAspectRatio(cam);
      const hdeg = (2 * Math.atan(Math.tan(cam.fov / 2) * aspect) * 180) / Math.PI;
      const vit = document.querySelector('.hud-vitals').getBoundingClientRect();
      const wp = document.querySelector('.hud-weapon').getBoundingClientRect();
      const inset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-inset'));
      return { hdeg, aspect, vit: vit.left, wp: wp.right, nomap: !document.querySelector('.hud-minimap, .minimap, .hud-compass'), inset, W: innerWidth };
    });
    if (label === '32:9') {
      assert(Math.abs(v.hdeg - 120) < 1, `32:9: Hor+ stops at the widest FOV (${v.hdeg.toFixed(1)} deg)`);
      assert(v.inset === 640 && v.vit >= 640 && v.wp <= v.W - 640 + 1, `32:9: HUD panels in a centred 16:9 (inset ${v.inset}, vitals x ${v.vit.toFixed(0)}, weapon panel right ${v.wp.toFixed(0)})`);
    } else {
      const want = (2 * Math.atan(Math.tan(Math.atan(Math.tan((100 * Math.PI) / 360) * (9 / 16))) * v.aspect) * 180) / Math.PI;
      assert(Math.abs(v.hdeg - want) < 1 && v.inset === 0, `${label}: Hor+ (${v.hdeg.toFixed(1)} deg), HUD full width`);
    }
    assert(v.nomap, 'no minimap or compass (G339)');
    if (process.env.SHOTS) await P.screenshot({ path: `${process.env.SHOTS}/desk-${label.replace(':', 'x')}-game.png` });
    const ae = a.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
    assert(ae.length === 0, `${label}: no console errors${ae.length ? ': ' + ae.slice(0, 3).join(' | ') : ''}`);
    await browser.close();
  }

  // 3.1 Auto graphics: from the GPU's name (software GL = Low), else measured on the menu stage
  {
    // (the software renderer is named explicitly: with E2E_GPU=1 the real name is the PC's RTX)
    const d = await launch({ url, params: 'detect=1&renderer=Google%20SwiftShader', viewport: { width: 1280, height: 720 } });
    browser = d.browser;
    await d.page.waitForFunction(() => window.__app?.settings.get().video.device.source !== 'none', null, { timeout: 60000 });
    const v = await d.page.evaluate(() => window.__app.settings.get().video);
    assert(v.auto && v.device.source === 'gpu' && v.device.tier === 'low' && v.preset === 'low', `Auto: a software renderer starts on Low by its name (${JSON.stringify(v.device)}, ${v.preset})`);
    await browser.close();
    // (the measuring: a GPU the tables do not know)
    const c = await launch({ url, params: 'detect=1&renderer=Mystery%20GPU%2042', viewport: { width: 960, height: 540 } });
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

  }

  if (part(3)) {
  // the Epic renderer in a match (small window: software GL)
  const e = await launch({ url, params: 'autostart=chamber&mode=test&gfx=epic', viewport: { width: 640, height: 360 } });
  browser = e.browser;
  await e.page.waitForFunction(() => !!window.__app.current?.player, null, { timeout: 180000 });
  await frames(e.page, 6);
  const r = await e.page.evaluate(() => {
    const g = window.__app.current;
    const rig = g.world.lightRig;
    return { clustered: rig.clustered, placed: rig.placed, shadowed: rig.shadowed, sun: !!g.world.shadow, pps: g.player.cam.camera._postProcesses.filter(Boolean).map((p) => p.name) };
  });
  // (operators 11e fix r1) Wren's checks below need a LOD on screen: wait for the first (LOD2)
  await e.page.waitForFunction(() => window.__app.current.player.figure.current >= 0, null, { timeout: 60000 }).catch(() => {});
  const ch = await e.page.evaluate(async () => {
    const g = window.__app.current;
    // (operators 11e, G123) the player is Wren (her own skinned model, no voxel body): the voxel bodies are the guards'
    const pr = g.player.rig;
    const wren = { voxel: !!pr.voxel, partsHidden: pr.parts.every((m) => !m.isEnabled() || !m.isVisible), figure: !!g.player.figure };
    // (operators 11e fix r1) Wren, driven directly: the camera fade's head hide scales her shown LOD's head joint to 0
    // and back to 1; a vision mode on brings the goggle into use with a brighter lens than 'off' (G73). The player's own
    // frame sets both back from the camera and the vision state next frame.
    const f = g.player.figure;
    const cam = g.scene.activeCamera;
    const lod = f.current >= 0 ? f.lods[f.current] : null;
    const headNode = lod && lod.head >= 0 ? lod.nodes[lod.head] : null;
    const sc = () => (headNode ? [headNode.scaling.x, headNode.scaling.y, headNode.scaling.z] : null);
    f.setHeadVisible(false);
    const headOff = sc();
    f.setHeadVisible(true);
    const headOn = sc();
    const glowOf = () => { const m = f.current >= 0 ? f.lods[f.current]?.glowMat : null; return m ? m.emissiveColor.r + m.emissiveColor.g + m.emissiveColor.b : -1; };
    f.setVision('night', 1);
    f.update(cam);
    const visionOn = { glow: glowOf(), pose: f.goggle.pose };
    f.setVision('off', 1);
    f.update(cam);
    const visionOff = { glow: glowOf(), pose: f.goggle.pose };
    const wrenHead = { lod: f.current, headOff, headOn };
    const wrenGoggle = { on: visionOn, off: visionOff };
    return {
      wrenHead,
      wrenGoggle,
      wren,
    };
  });
  assert(ch.wren.partsHidden && ch.wren.figure, `the player is Wren: the rig's parts unseen (${JSON.stringify(ch.wren)})`);
  const zero = (v) => !!v && v.every((x) => x === 0);
  const one = (v) => !!v && v.every((x) => x === 1);
  assert(ch.wrenHead.lod >= 0 && zero(ch.wrenHead.headOff) && one(ch.wrenHead.headOn), `the camera head fade hides Wren's head (LOD ${ch.wrenHead.lod}: head joint scale ${JSON.stringify(ch.wrenHead.headOff)} hidden, ${JSON.stringify(ch.wrenHead.headOn)} shown)`);
  assert(ch.wrenGoggle.on.pose === 'inUse' && ch.wrenGoggle.off.pose === 'stowed' && ch.wrenGoggle.off.glow > 0 && ch.wrenGoggle.on.glow > ch.wrenGoggle.off.glow * 1.5, `a vision mode brings Wren's goggle down with a brighter lens (on ${ch.wrenGoggle.on.pose} ${ch.wrenGoggle.on.glow.toFixed(3)}, off ${ch.wrenGoggle.off.pose} ${ch.wrenGoggle.off.glow.toFixed(3)})`);
  // weapons (feature/weapons): the kit's baked meshes render, casting shadows
  const wp = await e.page.evaluate(async () => {
    const g = window.__app.current;
    const models = g.weapons.slots.map((s) => s.model).filter(Boolean);
    // the baked meshes load after the match starts
    for (let t = 0; t < 600 && models.some((m) => !m.mesh); t++) await new Promise((r) => setTimeout(r, 100));
    const casters = g.world.lightRig.casters;
    return {
      n: models.length,
      meshes: models.filter((m) => m.mesh).map((m) => m.def.id),
      hidden: models.every((m) => m.parts.every((p) => !p.isVisible || !p.isEnabled(false))),
      cast: models.every((m) => m.renderMeshes.length > 0 && m.renderMeshes.every((x) => casters.includes(x))),
    };
  });
  assert(wp.n > 0 && wp.cast, `the loadout's weapons render and cast shadows (${wp.meshes.join(', ')} baked)`);
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
    const off = (L.lampBase + i * L.lampTexels + 1) * 4;
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
  // (PC1 fix) the near level chunks once reached 17 textures with the guards alerted and stopped drawing. (LR16t) With
  // the torch shadow atlas on, no flashlight takes the rig's shadow pool (capped at 0): every torch on is drawn by the
  // baked lamps (up to the map's torch slots: TORCH_DRAW_SLOTS = 4 by default, Warehouse sets none; piano SO3
  // `MapDef.torchSlots` up to 16) and shadowed through ONE atlas sampler. Alert them and count again.
  // (G2c) the test mode places no guards: two stand in the annex's dark bay (ambient 0.12, a head well under TORCH_DARK 0.35) and alert;
  // they face each other 3.2 m apart and stand still, the operator between them (a character in a torch's cone is what its shadow map renders)
  await e.page.evaluate(() => {
    const g = window.__app.current;
    const V = g.player.position.constructor;
    g.player.controller.teleport(new V(32, 0, 4.6), 0);
    for (const [x, z, yaw] of [[32, 3, 0], [32, 6.2, Math.PI]]) {
      const en = g.enemyMgr.spawn('grunt', new V(x, 0, z), false, yaw);
      en.alert();
      en.update = () => en.prevPos.copyFrom(en.pos);
    }
  });
  await frames(e.page, 240);
  tex = await texProbe();
  for (let i = 0; i < 120 && tex.pending > 0; i++) {
    await wait(500);
    tex = await texProbe();
  }
  const ts = await e.page.evaluate(() => {
    const g = window.__app.current;
    const w = g.world;
    return { atlas: !!w.torchShadows?.on, pool: w.lightRig.shadowSlots, drawn: w.lightRig.drawnTorches, on: g.enemyMgr.torchesOn, copies: w.torchShadows?.copies ?? 0, stats: w.torchShadows?.stats?.() ?? null };
  });
  assert(ts.atlas, 'Epic: the torch shadow atlas is on (world.torchShadows.on)');
  assert(ts.pool === 0, `torch atlas on: no flashlight takes the rig's shadow pool (${ts.pool} shadow slots)`);
  assert(ts.on > 0 && ts.drawn === Math.min(4, ts.on), `alerted guards' torches all drawn by the baked lamps (${ts.drawn} drawn of ${ts.on} on, up to 4)`);
  assert(ts.copies > 0, `the torch shadow maps copied into the atlas (${ts.copies} copies, stats ${JSON.stringify(ts.stats)})`);
  assert(tex.pending === 0 && tex.max <= 16, `Epic, guards alerted: every material shader within 16 textures (${tex.max}, ${tex.who}, ${tex.pending} pending)`);
  for (const pp of ['TAA', 'ssao', 'ssr', 'volumetric', 'bloomMerge', 'imageProcessing', 'cinematic']) assert(r.pps.includes(pp), `post stack has ${pp}`);
  assert(r.pps.at(-1) === 'cinematic', 'the grade / goggles pass stays last');
  const eerrs = e.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(eerrs.length === 0, `Epic renders without console errors${eerrs.length ? ': ' + eerrs.slice(0, 4).join(' | ') : ''}`);
  await browser.close();

  }

  if (part(4)) {
  // 3.0 phase 5: TAAU, Panini, the Ray traced setting (screen space since voxel-retire; the saved settings, changed in the match)
  const u = await launch({ url, params: 'autostart=chamber&gfx=user', viewport: { width: 640, height: 360 } });
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
  assert(p5.pps.includes('ssr') && !p5.pps.includes('rtReflect'), `Ray traced runs screen space reflections (${p5.pps.join(',')})`);
  assert(p5.pps[0] === 'volumetric' && p5.pps[1] === 'taau' && !p5.pps.includes('TAA'), `TAAU leads the chain after the low-resolution fog pass and replaces TAA (${p5.pps.slice(0, 3).join(',')})`);
  assert(p5.scene > 0 && Math.abs(p5.scene / p5.canvas - 0.67) < 0.02, `TAAU: the scene at 67% of the native canvas (${p5.scene} of ${p5.canvas})`);
  assert(p5.pps.includes('panini') && p5.pps.at(-1) === 'cinematic', `Panini on, the grade pass still last (${p5.panini})`);
  await u.page.screenshot({ path: process.env.SHOT_P5 ?? '/tmp/e2e-p5.png', timeout: 600000 });
  // 3.1 frame governor: Adaptive detail on, software GL misses every frame - it steps down (TAAU input smaller)
  await u.page.evaluate(() => window.__app.settings.update((d) => void (d.video.adaptive = true)));
  if (!GPU) await u.page.waitForFunction(() => window.__app.quality.governor.level >= 3, null, { timeout: 300000 });
  else {
    // (load-latent-ui2) a hardware GPU rarely misses a 640x360 frame, so real misses come only under load (the wait timed
    // out at 300 s on the 4090): up to 20 s of real frames first, then missed frames (3 x budget) fed through the quality
    // manager's own frame path - the check is "missed frames step the detail down", governor -> applyAdaptive -> TAAU
    await u.page.waitForFunction(() => window.__app.quality.governor.level >= 3, null, { timeout: 20000, polling: 100 }).catch(() => {});
    await u.page.evaluate(() => {
      const q = window.__app.quality;
      for (let i = 0; i < 600 && q.governor.level < 3; i++) q.frame(q.budgetMs * 3, 1, true);
    });
  }
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
  // 3.6 desktop blur: with ray tracing off, depth of field's depth pass pauses when not aiming; the field must then be
  // fully sharp (it blurred the whole frame off the paused depth), and only open while that depth renders
  const df = await u.page.evaluate(async () => {
    const a = window.__app;
    const g = a.current;
    const scene = g.scene;
    const wait = (n) => new Promise((r) => { let k = 0; const o = scene.onAfterRenderObservable.add(() => { if (++k >= n) { scene.onAfterRenderObservable.remove(o); r(); } }); });
    a.quality.setOverride({ preset: 'high', scale: null, gfx: { reflections: 'off' } });
    await wait(4);
    const s = g.stack;
    const dof = () => s.def.depthOfField;
    const own = s.dofDepth && s.dofDepth !== s.depth ? s.dofDepth : null;
    const idle = { fStop: dof().fStop, depth: own?.enabled ?? null };
    // every frame while aiming and after: never a shallow field without a live depth
    let bad = 0, aimed = 1e9, frames = 0;
    const o = scene.onBeforeRenderObservable.add(() => {
      frames++;
      const f = dof().fStop;
      aimed = Math.min(aimed, f);
      if (f < 1e6 && own && !own.enabled) bad++;
    });
    g.player.forceAds = true;
    const t0 = performance.now();
    while (dof().fStop > 4 && performance.now() - t0 < 120000) await wait(1);
    g.player.forceAds = false;
    const t1 = performance.now();
    while (dof().fStop < 1e6 && performance.now() - t1 < 120000) await wait(1);
    await wait(2);
    scene.onBeforeRenderObservable.remove(o);
    const back = { fStop: dof().fStop, depth: own?.enabled ?? null };
    a.quality.setOverride(null);
    return { own: !!own, idle, aimed, bad, frames, back };
  });
  assert(df.own && df.idle.fStop >= 1e6 && df.idle.depth === false, `RT off, not aiming: depth of field fully sharp with its depth paused (${JSON.stringify(df)})`);
  assert(df.aimed < 4 && df.bad === 0, `aiming opens the field only while its depth renders (${JSON.stringify(df)})`);
  assert(df.back.fStop >= 1e6 && df.back.depth === false, `after aiming: sharp again, depth paused (${JSON.stringify(df)})`);
  const uerrs = u.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(uerrs.length === 0, `ray traced + TAAU + Panini render without console errors${uerrs.length ? ': ' + uerrs.slice(0, 4).join(' | ') : ''}`);
  }
  console.log('desktop e2e passed');
} catch (err) {
  failed = true;
  console.error(err);
}
await browser?.close();
process.exit(failed ? 1 : 0);
