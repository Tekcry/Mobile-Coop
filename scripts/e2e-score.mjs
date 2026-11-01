// The score in the game (music V4, 2026-10-16): the menu theme starts on the title screen (at once, or on the first input when autoplay is blocked; menu-notes); in a
// match the music is silent while nobody is aware of you, turns Cautious when a guard is suspicious, and on a guard's
// alert plays the spotted hit into "Alert, under fire". Headless (null audio sink); the music state is read from
// window.__app.music (state and debug), which only reports.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const G = (page, f, a) => page.evaluate(f, a);
const becomes = (page, fn, arg, ms = 20000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const unlock = async (page) => {
  const vp = page.viewportSize() ?? { width: 1280, height: 640 };
  await page.mouse.click(vp.width / 2, vp.height / 2);
};

async function menu() {
  console.log('\n-- menu');
  const { browser, page, errors } = await launch({ url });
  let ok = true;
  try {
    await page.waitForFunction(() => window.__app?.music?.state === 'menu', null, { timeout: 90000 });
    await frames(page, 3);
    await unlock(page);
    assert(await becomes(page, () => window.__app.audio.ctx?.state === 'running'), 'the first click unlocks audio');
    assert(await becomes(page, () => window.__app.music.debug.menu, null, 60000), 'the menu theme plays');
    assert(await G(page, () => window.__app.music.debug.ready === 'menu'), 'only the menu track is decoded on the menu');
    // a match starts: the menu theme fades from full, never from part-way down (a ramp anchored on an old event cuts)
    const fade = await G(page, async () => {
      const m = window.__app.music;
      const g = m.score.menuV.gain.gain;
      m.mission();
      m.update(0.016, 'calm');
      await new Promise((r) => setTimeout(r, 300));
      const v = g.value;
      m.menu();
      return v;
    });
    assert(fade > 0.8, `entering a match the menu theme fades smoothly (gain ${fade.toFixed(2)} after 0.3 s of a 4 s fade)`);
    const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
    assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  } catch (e) {
    ok = false;
    console.error(e);
  }
  await browser.close();
  return ok;
}

async function match() {
  // (clean-up G2c) the Test Chamber in the test mode with its five squad guards (was the Warehouse in Clear)
  console.log('\n-- match (Test Chamber)');
  const { browser, page, errors } = await launch({ url, params: 'autostart=studio&mode=test&guards=1' });
  let ok = true;
  try {
    await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 120000 });
    await unlock(page);
    assert(await becomes(page, () => window.__app.audio.ctx?.state === 'running'), 'audio unlocked');
    assert(await becomes(page, () => window.__app.music.debug.ready === 'alert,caution,evade,spotted', null, 90000), 'the mission tracks decode in the background');
    assert(await G(page, () => window.__app.music.state) === 'calm', 'Calm while nobody is aware (silence)');
    assert(await G(page, () => !window.__app.music.debug.caution && !window.__app.music.debug.alert), 'nothing plays in Calm');
    // a guard grows suspicious: the music turns Cautious after its short debounce
    await G(page, () => {
      const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive);
      e.aware.set('suspicious');
    });
    assert(await becomes(page, () => window.__app.music.state === 'caution'), 'a suspicious guard: Cautious');
    assert(await G(page, () => window.__app.music.debug.caution), 'the Cautious track plays');
    // a guard goes to alert: the spotted hit and Alert at once
    await G(page, () => {
      const e = window.__app.current.enemyMgr.enemies.find((x) => x.alive);
      e.aware.set('alert');
    });
    assert(await becomes(page, () => window.__app.music.state === 'alert', null, 5000), 'a guard on alert: Alert');
    assert(await G(page, () => window.__app.music.debug.alert && window.__app.music.debug.evade), 'Alert and its Evasion mix run together');
    const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
    assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
  } catch (e) {
    ok = false;
    console.error(e);
  }
  await browser.close();
  return ok;
}

const a = await menu();
const b = await match();
if (a && b) console.log('score e2e passed');
process.exit(a && b ? 0 : 1);
