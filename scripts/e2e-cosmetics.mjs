// Loadout appearance by controller: parts, colours, locked previews on the operator, rotation, emotes, camo, tag;
// in-game look.
import { launch, frames, press, stick, BTN, focusedText, focusTo, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
const G = (f, a) => page.evaluate(f, a);
let failed = false;
try {
  await G(() => window.__pad.connect());
  const key = () => G(() => window.__app.nav.focused?.dataset.key ?? '');
  const shown = () => G(() => JSON.parse(window.__app.current.shown));
  const focusedCls = () => G(() => window.__app.nav.focused?.className ?? '');
  await press(page, BTN.LB);
  await focusTo(page, /Loadout/);
  await press(page, BTN.A);
  assert(await G(() => !!document.querySelector('.loadout-screen')), 'Loadout opens');
  await focusTo(page, /Appearance/);
  await press(page, BTN.A);
  await focusTo(page, /^Hair/);
  assert((await key()) === 'part-hair', `focus Hair (${await key()})`);
  await press(page, BTN.A);
  const hair0 = await G(() => window.__app.save.get().avatar.hair);
  // focus the next owned hair: previewed on the operator; A wears it
  for (let i = 0; i < 12 && !/m-owned/.test(await focusedCls()); i++) await press(page, BTN.DOWN);
  const hair1 = (await key()).slice(4);
  assert((await shown())[0].hair === hair1 && (await G(() => window.__app.save.get().avatar.hair)) === hair0, `focusing an owned hair previews it (${hair0} -> ${hair1}), not saved yet`);
  await press(page, BTN.A);
  assert((await G(() => window.__app.save.get().avatar.hair)) === hair1, 'A wears it (saved)');
  // on to a locked one: previewed on the operator with its requirement, never saved
  for (let i = 0; i < 14 && !/m-locked|m-buyable/.test(await focusedCls()); i++) await press(page, BTN.DOWN);
  const locked = (await key()).slice(4);
  const note = await G(() => document.querySelector('.lo-detail .lock')?.textContent ?? '');
  assert(locked && (await shown())[0].hair === locked && /Level|cr/.test(note), `a locked hair previews with what it needs (${locked}: "${note}")`);
  assert((await G(() => window.__app.save.get().avatar.hair)) === hair1, 'the locked one is not saved');
  await press(page, BTN.B);
  assert((await shown())[0].hair === hair1, 'going back drops the preview');
  // colours
  await focusTo(page, /Colours/, 16);
  await press(page, BTN.A);
  const skin0 = await G(() => window.__app.save.get().avatar.colors.skin);
  const sw = await G((c) => { const el = [...document.querySelectorAll('.loadout-screen .swatch')].find((x) => x.dataset.key?.startsWith('sw-skin-') && !x.dataset.key.endsWith(c)); el.click(); return el.dataset.key; }, skin0);
  const skin1 = await G(() => window.__app.save.get().avatar.colors.skin);
  assert(skin1 !== skin0 && (await shown())[0].colors.skin === skin1, `colour swatch applies on the operator (${skin0} -> ${skin1}, ${sw})`);
  // rotate preview with the right stick
  const yaw0 = await G(() => window.__app.current.previewYaw);
  await stick(page, 2, 1);
  await stick(page, 2, 1);
  const yaw1 = await G(() => window.__app.current.previewYaw);
  assert(Math.abs(yaw1 - yaw0) > 0.05, `right stick rotates the preview (${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)})`);
  await press(page, BTN.B);
  await press(page, BTN.B);
  // tag & emotes: assign emote slot 1
  await focusTo(page, /Tag & emotes/);
  await press(page, BTN.A);
  await focusTo(page, /1 · View hold/, 24);
  await press(page, BTN.RIGHT);
  const em = await G(() => window.__app.save.get().emotes[0]);
  assert(!!em, `emote slot 1 set (${em})`);
  assert(await G(() => !!window.__app.current['rig']?.emote), 'preview plays the emote');
  const rnd = await G(() => { const b = [...document.querySelectorAll('.loadout-screen .lo-form .btn')].find((x) => /Random/.test(x.textContent)); b.click(); return window.__app.save.get().profile.name; });
  assert(rnd !== 'Operator', `random callsign (${rnd})`);
  await press(page, BTN.B);
  await press(page, BTN.B);
  assert((await shown())[0].hair === hair1, 'the menu operator shows the saved look');

  // camo: the secondary (552) customised; focusing a camo previews it, A equips it
  await G(() => window.__app.save.update((d) => { d.weapons.rifle.kills = 12; d.unlocks.push('camo:rifle:woodland'); }));
  await focusTo(page, /Loadout/);
  await press(page, BTN.A);
  await focusTo(page, /Secondary/);
  await press(page, BTN.Y);
  await focusTo(page, /^Camo/, 30);
  await press(page, BTN.A);
  for (let i = 0; i < 8 && (await key()) !== 'camo-woodland'; i++) await press(page, BTN.DOWN);
  assert((await shown())[1] === 'rifle' && (await shown())[2] === 'woodland', 'the preview weapon wears the focused camo');
  await press(page, BTN.A);
  assert((await G(() => window.__app.save.get().weapons.rifle.camo)) === 'woodland', 'A equips it');
  for (let i = 0; i < 4; i++) await press(page, BTN.B);

  // in game: avatar look + camo carried, emote 1 on View held (3.2.0; the d-pad is the speed gear, gadget and wheel)
  await G(() => window.__app.screens.top);
  await page.goto(url + '?autostart=proving&gfx=min');
  await page.waitForFunction(() => window.__app?.current?.player, null, { timeout: 60000 });
  await G(() => window.__pad.connect());
  await press(page, BTN.LS);
  const look = await G(() => ({ skin: window.__app.current.opts.look.colors.skin, camo: window.__app.current.opts.loadout.find((e) => e.id === 'rifle')?.pattern?.name }));
  assert(look.skin === skin1 && look.camo === 'camo', `match uses saved avatar + weapon camo (${JSON.stringify(look)})`);
  await G(() => window.__pad.set(8, 1));
  // (the hold is read from the polls: on a slow software-GL frame it lands late)
  await page.waitForFunction(() => !!window.__app.current.player.rig.emote, null, { timeout: 6000 }).catch(() => {});
  const emoted = await G(() => !!window.__app.current.player.rig.emote);
  await G(() => window.__pad.set(8, 0));
  assert(emoted, 'View held plays emote slot 1 in game');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-cosmetics-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}
