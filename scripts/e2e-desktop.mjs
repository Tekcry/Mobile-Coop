// Desktop (3.0): auto-detected on a mouse-and-keyboard 1080p window, menus scaled to it, no touch settings or
// controls, Mouse & Keyboard first (rebinding: click, press; a key moves off its old action; Backspace clears; the
// in-game action follows), the Graphics menu (presets, Custom, the frame cap), the interface switch, and the Epic
// renderer booting in a match (clustered lights, shadow casters, the post stack) without console errors.
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
  assert(preset === 'Epic', `Epic by default (${preset})`);
  await G(() => [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Preset/.test(r.textContent)).querySelectorAll('.choice-arrow')[0].click());
  await frames(page, 3);
  // (this page runs ?gfx=min, so the level itself stays minimal; the settings and the menu follow the preset)
  let q = await G(() => ({ p: window.__app.settings.get().video.preset, g: window.__app.settings.get().video.gfx, sh: [...document.querySelectorAll('.tab-panel.active .row-choice')].find((r) => /Shadows/.test(r.textContent)).querySelector('.choice-val').textContent }));
  assert(q.p === 'ultra' && q.g.shadows === 'ultra' && q.g.lights === 24 && q.g.aa === 'msaa' && q.sh === 'Ultra', `a preset sets every feature, the rows follow (${q.p}, shadows ${q.sh})`);
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
  await page.keyboard.press('Escape');
  await frames(page, 3);
  // in a match: the rebound key acts, no touch controls
  await page.goto(url + '?autostart=proving&gfx=min');
  await page.waitForFunction(() => window.__app.current?.player, null, { timeout: 60000 });
  await page.keyboard.down('KeyU');
  await frames(page, 2);
  const rel = await G(() => window.__app.input.state.buttons.reload.down);
  await page.keyboard.up('KeyU');
  assert(rel, 'the rebound key reloads in a match');
  const touchShown = await G(() => { const t = document.querySelector('.touch-layer'); return !!t && getComputedStyle(t).display !== 'none' && !t.hidden; });
  assert(!touchShown, 'no touch controls on desktop');
  // the benchmark: a (shortened) flight, then the result, saved as feedback
  await G(() => {
    window.__bench.seconds = 5;
    window.__bench.warmup = 1;
    window.__app.benchmark();
  });
  await page.waitForFunction(() => /average \d+ fps, 1% low \d+ fps/.test(document.querySelector('.dialog')?.textContent ?? ''), null, { timeout: 120000 });
  const bt = await G(() => ({ text: document.querySelector('.dialog').textContent, hudHidden: document.body.classList.contains('photo-mode') }));
  assert(!bt.hudHidden, `the benchmark reports (${bt.text.match(/Warehouse[^)]*\)/)?.[0]})`);
  await G(() => [...document.querySelectorAll('.dialog .btn')].find((b) => /Save to feedback/.test(b.textContent)).click());
  await page.waitForFunction(() => !!document.querySelector('.main-menu'), null, { timeout: 30000 });
  const saved = await G(async () => (await window.__app.feedback.all()).find((e) => e.category === 'performance')?.text ?? '');
  assert(/Benchmark - Warehouse/.test(saved), 'the result is saved as a performance note');
  const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
  assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await browser.close();

  // the Epic renderer in a match (small window: software GL)
  const e = await launch({ url, params: 'autostart=warehouse&mode=clear&gfx=epic', touch: false, viewport: { width: 640, height: 360 } });
  browser = e.browser;
  await e.page.waitForFunction(() => window.__app.current?.player, null, { timeout: 180000 });
  await frames(e.page, 6);
  const r = await e.page.evaluate(() => {
    const g = window.__app.current;
    const rig = g.world.lightRig;
    return { clustered: rig.clustered, placed: rig.placed, shadowed: rig.shadowed, sun: !!g.world.shadow, pps: g.player.cam.camera._postProcesses.filter(Boolean).map((p) => p.name) };
  });
  assert(r.placed >= 8 && r.shadowed >= 1, `Epic: real lights placed (${r.placed}, ${r.shadowed} with shadows, clustered ${r.clustered})`);
  for (const pp of ['TAA', 'ssao', 'ssr', 'volumetric', 'bloomMerge', 'imageProcessing', 'cinematic']) assert(r.pps.includes(pp), `post stack has ${pp}`);
  assert(r.pps.at(-1) === 'cinematic', 'the grade / goggles pass stays last');
  const eerrs = e.errors.filter((x) => !/GPU stall|GL Driver/.test(x));
  assert(eerrs.length === 0, `Epic renders without console errors${eerrs.length ? ': ' + eerrs.slice(0, 4).join(' | ') : ''}`);
  console.log('desktop e2e passed');
} catch (err) {
  failed = true;
  console.error(err);
}
await browser?.close();
process.exit(failed ? 1 : 0);
