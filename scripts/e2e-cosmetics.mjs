// Customiser by controller: parts, colours, locked previews, rotation, emotes, camo, tag; in-game look.
import { launch, frames, press, stick, BTN, focusedText, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url });
const G = (f, a) => page.evaluate(f, a);
let failed = false;
try {
  await G(() => window.__pad.connect());
  await press(page, BTN.LB);
  for (let i = 0; i < 6 && !/Customise/.test(await focusedText(page)); i++) await press(page, BTN.DOWN);
  await press(page, BTN.A);
  assert(await G(() => !!document.querySelector('.customize-screen')), 'Customise opens');
  // Body tab: first focus = Body choice; go to Hair and cycle
  const hair0 = await G(() => window.__app.save.get().avatar.hair);
  await press(page, BTN.DOWN);
  await press(page, BTN.DOWN);
  assert(/Hair/.test(await focusedText(page)), 'focus Hair');
  await press(page, BTN.RIGHT); // the next free hair
  const hair1 = await G(() => window.__app.save.get().avatar.hair);
  assert(hair1 !== hair0, `owned hair saved immediately (${hair0} -> ${hair1})`);
  // on to the first locked one (mohawk at level 1)
  let note = '';
  let saved = hair1;
  for (let i = 0; i < 4 && !note; i++) {
    saved = await G(() => window.__app.save.get().avatar.hair);
    await press(page, BTN.RIGHT);
    note = await G(() => document.querySelector('.lock-note')?.textContent ?? '');
  }
  assert(/Mohawk/.test(note) && /preview only/.test(note), `locked item previews with a note ("${note.slice(0, 60)}")`);
  assert((await G(() => window.__app.save.get().avatar.hair)) === saved, 'locked selection is not saved');
  // skin colour swatch
  await press(page, BTN.DOWN);
  const skin0 = await G(() => window.__app.save.get().avatar.colors.skin);
  if ((await G(() => document.querySelector('.focused')?.dataset.color)) === skin0) await press(page, BTN.LEFT);
  await press(page, BTN.A);
  const skin1 = await G(() => window.__app.save.get().avatar.colors.skin);
  assert(skin1 !== skin0, `colour swatch applies (${skin0} -> ${skin1})`);
  // rotate preview with the right stick
  const yaw0 = await G(() => window.__app.current.previewYaw);
  await stick(page, 2, 1);
  await stick(page, 2, 1);
  const yaw1 = await G(() => window.__app.current.previewYaw);
  assert(Math.abs(yaw1 - yaw0) > 0.05, `right stick rotates the preview (${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)})`);
  // tabs to Emotes (RB x6) and assign slot 1
  for (let i = 0; i < 6; i++) await press(page, BTN.RB);
  assert((await G(() => document.querySelector('.customize-screen .tab.active')?.textContent)) === 'Emotes', 'RB reaches Emotes tab');
  await press(page, BTN.RIGHT);
  const em = await G(() => window.__app.save.get().emotes[0]);
  assert(!!em, `emote slot 1 set (${em})`);
  assert(await G(() => !!window.__app.current['rig']?.emote), 'preview plays the emote');
  // Tag tab: title / emblem
  await press(page, BTN.LB);
  assert((await G(() => document.querySelector('.customize-screen .tab.active')?.textContent)) === 'Tag', 'LB back to Tag tab');
  const rnd = await G(() => { const b = [...document.querySelectorAll('.customize-screen .tab-panel.active .btn')].find((x) => /Random/.test(x.textContent)); b.click(); return window.__app.save.get().profile.name; });
  assert(rnd !== 'Operator', `random callsign (${rnd})`);
  await press(page, BTN.B);
  // locked preview reverted on exit
  assert((await G(() => window.__app.save.get().avatar.hair)) === saved, 'leaving reverts locked previews');

  // camo in armory (grant a mastery camo first)
  await G(() => window.__app.save.update((d) => { d.weapons.rifle.kills = 12; d.unlocks.push('camo:rifle:woodland'); }));
  await G(() => [...document.querySelectorAll('.main-menu .btn')].find((b) => /Armory/.test(b.textContent)).click());
  await frames(page, 3);
  const camoRow = await G(() => { const r = [...document.querySelectorAll('.armory-screen .row-choice')].find((x) => /Camo/.test(x.textContent)); r.querySelectorAll('.choice-arrow')[1].click(); return window.__app.save.get().weapons.rifle.camo; });
  assert(camoRow === 'woodland', `armory camo picker applies (${camoRow})`);
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
