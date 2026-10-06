// Loadout appearance by controller: parts, colours, locked previews on the operator, rotation, emotes, camo, tag;
// in-game look.
import { launch, frames, press, stick, BTN, focusedText, focusTo, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
const G = (f, a) => page.evaluate(f, a);
let failed = false;
try {
  await G(() => window.__pad.connect());
  await press(page, BTN.LB);
  await focusTo(page, /Loadout/);
  await press(page, BTN.A);
  assert(await G(() => !!document.querySelector('.loadout-screen')), 'Loadout opens');
  // RB twice: Weapons -> Gear -> Appearance; first focus = Build; on to Hair and cycle
  await press(page, BTN.RB);
  await press(page, BTN.RB);
  const tabName = () => G(() => document.querySelector('.loadout-screen .side-nav .tab.active')?.textContent);
  assert((await tabName()) === 'Appearance', `RB reaches Appearance (${await tabName()})`);
  const hair0 = await G(() => window.__app.save.get().avatar.hair);
  await focusTo(page, /^Hair/);
  assert(/Hair/.test(await focusedText(page)), 'focus Hair');
  await press(page, BTN.RIGHT); // the next free hair
  const hair1 = await G(() => window.__app.save.get().avatar.hair);
  assert(hair1 !== hair0, `owned hair saved immediately (${hair0} -> ${hair1})`);
  assert(await G((h) => JSON.parse(window.__app.current.shown)[0].hair === h, hair1), 'the operator shows it at once');
  // on to the first locked one (mohawk at level 1): previewed on the operator, not saved
  let note = '';
  let saved = hair1;
  for (let i = 0; i < 4 && !/Mohawk/.test(note); i++) {
    saved = await G(() => window.__app.save.get().avatar.hair);
    await press(page, BTN.RIGHT);
    note = await G(() => document.querySelector('.tab-panel.active .lock-line')?.textContent ?? '');
  }
  assert(/Mohawk/.test(note), `locked item previews with its requirement ("${note.slice(0, 60)}")`);
  assert(await G(() => JSON.parse(window.__app.current.shown)[0].hair === 'mohawk'), 'the locked hair shows on the operator');
  assert((await G(() => window.__app.save.get().avatar.hair)) === saved, 'locked selection is not saved');
  // skin colour swatch
  const skin0 = await G(() => window.__app.save.get().avatar.colors.skin);
  const sw = await G((c) => { const el = [...document.querySelectorAll('.tab-panel.active .swatch')].find((x) => x.dataset.key?.startsWith('sw-skin-') && !x.dataset.key.endsWith(c)); el.click(); return el.dataset.key; }, skin0);
  const skin1 = await G(() => window.__app.save.get().avatar.colors.skin);
  assert(skin1 !== skin0, `colour swatch applies (${skin0} -> ${skin1}, ${sw})`);
  // rotate preview with the right stick
  const yaw0 = await G(() => window.__app.current.previewYaw);
  await stick(page, 2, 1);
  await stick(page, 2, 1);
  const yaw1 = await G(() => window.__app.current.previewYaw);
  assert(Math.abs(yaw1 - yaw0) > 0.05, `right stick rotates the preview (${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)})`);
  // RB: Tag & Emotes; assign emote slot 1
  await press(page, BTN.RB);
  assert((await tabName()) === 'Tag & Emotes', 'RB reaches Tag & Emotes');
  await focusTo(page, /1 · D-pad right/, 24);
  await press(page, BTN.RIGHT);
  const em = await G(() => window.__app.save.get().emotes[0]);
  assert(!!em, `emote slot 1 set (${em})`);
  assert(await G(() => !!window.__app.current['rig']?.emote), 'preview plays the emote');
  const rnd = await G(() => { const b = [...document.querySelectorAll('.loadout-screen .tab-panel.active .btn')].find((x) => /Random/.test(x.textContent)); b.click(); return window.__app.save.get().profile.name; });
  assert(rnd !== 'Operator', `random callsign (${rnd})`);
  await press(page, BTN.B);
  // locked preview reverted on exit
  assert((await G(() => window.__app.save.get().avatar.hair)) === saved, 'leaving reverts locked previews');
  assert(await G((h) => JSON.parse(window.__app.current.shown)[0].hair === h, saved), 'the menu operator shows the saved look again');

  // camo on the Weapons page (grant a mastery camo first): the operator's weapon takes it at once
  await G(() => window.__app.save.update((d) => { d.weapons.rifle.kills = 12; d.unlocks.push('camo:rifle:woodland'); }));
  await G(() => [...document.querySelectorAll('.main-menu .btn')].find((b) => /Loadout/.test(b.textContent)).click());
  await frames(page, 3);
  const camoRow = await G(() => { const r = document.querySelector('[data-key="camo"]'); r.querySelectorAll('.choice-arrow')[1].click(); return window.__app.save.get().weapons.rifle.camo; });
  assert(camoRow === 'woodland', `camo picker applies (${camoRow})`);
  assert(await G(() => JSON.parse(window.__app.current.shown)[2] === 'woodland'), 'the preview weapon wears it');
  await press(page, BTN.B);

  // in game: avatar look + camo carried, emote on d-pad right
  await G(() => window.__app.screens.top);
  await page.goto(url + '?autostart=proving');
  await page.waitForFunction(() => window.__app?.current?.player, null, { timeout: 60000 });
  await G(() => window.__pad.connect());
  await press(page, BTN.LS);
  const look = await G(() => ({ skin: window.__app.current.opts.look.colors.skin, camo: window.__app.current.opts.loadout[0].pattern?.name }));
  assert(look.skin === skin1 && look.camo === 'camo', `match uses saved avatar + weapon camo (${JSON.stringify(look)})`);
  await press(page, BTN.RIGHT);
  assert(await G(() => !!window.__app.current.player.rig.emote), 'd-pad right plays emote slot 1 in game');
} catch (e) {
  failed = true;
  console.error(String(e));
  await page.screenshot({ path: process.env.SHOT ?? '/tmp/e2e-cosmetics-fail.png' });
} finally {
  console.log(errors.length ? 'console problems:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
}
