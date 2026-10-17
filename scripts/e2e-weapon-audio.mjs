// Weapon sounds (CC0 sprite): the sprite decodes and lines up; the rifle's automatic fire plays one shot per round
// with its brass, the choke keeps the voice count low; a suppressed gun plays its suppressed bank; reload, dry fire and
// a guard's or teammate's shot play; the noise guards hear is unchanged (the sounds are cosmetic). Then the weapon lab
// (`?weaponlab=1`). Proving Grounds, fake gamepad, headless audio.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
const G = (f, a) => page.evaluate(f, a);
/** Run `s` s of game time holding pad buttons; returns the loudest noise radius and the most voices seen. */
const sim = (s, setup) =>
  G(([s, setup]) => new Promise((res) => {
    const app = window.__app;
    const st = app.current;
    let t = 0;
    let noise = 0;
    let voices = 0;
    const orig = st.fixedUpdate.bind(st);
    if (setup) for (const [k, v] of setup) window.__pad.set(k, v);
    st.fixedUpdate = (dt) => {
      orig(dt);
      t += dt;
      noise = Math.max(noise, st.noise);
      voices = Math.max(voices, app.audio['voices']);
      if (t >= s) {
        st.fixedUpdate = orig;
        if (setup) for (const [k] of setup) window.__pad.set(k, 0);
        res({ noise, voices });
      }
    };
  }), [s, setup ?? null]);
const stats = () => G(() => ({ ...window.__app.weaponAudio.stats }));
try {
  await G(() => { window.__pad.connect(); window.__app.settings.update((s) => { s.gamepad.aimAssist = 'off'; }); });
  // (no hip fire on the locomotion branch: aim held, the gun drawn; harmless where hip fire exists)
  await G(() => { window.__app.current.player.forceAds = true; window.__app.loop.stepHeadless(0.8); });
  await press(page, BTN.LS);
  // a key press is the user gesture that starts WebAudio (F8 is bound to nothing)
  await page.keyboard.press('F8');
  await page.waitForFunction(() => window.__app.weaponAudio.stats.loaded || window.__app.weaponAudio.stats.failed, null, { timeout: 30000 });
  const s0 = await stats();
  assert(s0.loaded && !s0.failed, `weapon sprite decoded (${s0.decodeMs} ms)`);
  assert(Math.abs(s0.shift) < 0.06, `sprite alignment shift ${(s0.shift * 1000).toFixed(1)} ms is small`);
  await sim(0.4);
  assert((await G(() => window.__app.current.weapons.current.def.id)) === 'rifle', 'the sandbox starts with the rifle');

  // automatic fire: one shot per round, brass for each, the choke keeps voices down
  const mag0 = await G(() => window.__app.current.weapons.current.mag);
  const auto = await sim(0.8, [[BTN.RT, 1]]);
  await sim(0.8);
  const mag1 = await G(() => window.__app.current.weapons.current.mag);
  const s1 = await stats();
  const fired = mag0 - mag1;
  assert(fired >= 4, `the rifle fires automatically (${fired} rounds)`);
  assert(s1.shots - s0.shots === fired, `one recorded shot per round (${s1.shots - s0.shots} / ${fired})`);
  assert(s1.casings - s0.casings >= fired - 1, `brass lands for each round (${s1.casings - s0.casings})`);
  assert(s1.suppressed === s0.suppressed, 'the open rifle is not suppressed');
  assert(auto.voices < 24, `automatic fire stays light on voices (most ${auto.voices})`);
  const openNoise = auto.noise;

  // the same rifle with a suppressor: its suppressed bank, and the guards hear less (the noise model, unchanged)
  // (let the open shots' noise die away first)
  await sim(4);
  await G(() => { window.__app.current.weapons.current.stats.noise = 0.45; });
  const sd = await sim(0.3, [[BTN.RT, 1]]);
  await sim(0.5);
  const s2 = await stats();
  assert(s2.suppressed > s1.suppressed, `a suppressed rifle plays suppressed shots (${s2.suppressed - s1.suppressed})`);
  assert(sd.noise < openNoise, `guards hear the suppressed rifle less (${sd.noise.toFixed(1)} m < ${openNoise.toFixed(1)} m)`);
  await G(() => { window.__app.current.weapons.current.stats.noise = 1; });

  // reload, then dry fire on an empty gun with nothing in reserve
  await press(page, BTN.X);
  await sim(0.3);
  const s3 = await stats();
  assert(s3.reloads > s2.reloads, 'a reload plays the handling');
  await sim(2.5);
  await G(() => { const c = window.__app.current.weapons.current; c.mag = 0; c.reserve = 0; window.__app.current.weapons['infiniteAmmo'] = false; });
  // (raise to fire: aim, then pull; the trigger is live only once the gun is up, so pull again until it clicks)
  for (let i = 0; i < 8 && (await stats()).dry === s3.dry; i++) {
    await sim(0.4, [[BTN.LT, 1]]);
    await sim(0.1, [[BTN.LT, 1], [BTN.RT, 1]]);
    await sim(0.2);
  }
  const s4 = await stats();
  const w = await G(() => { const ws = window.__app.current.weapons; return { reloading: ws.reloading, mag: ws.current.mag, id: ws.current.def.id }; });
  assert(s4.dry > s3.dry, `an empty gun clicks dry (${JSON.stringify(w)})`);
  await G(() => { const c = window.__app.current.weapons.current; c.mag = 30; c.reserve = 90; });

  // a teammate's shot 20 m away (the same path guards' shots take)
  await G(() => { const g = window.__app.current; const p = g.player.position; g.events.emit('remoteShot', { cls: 'rifle', x: p.x + 20, y: p.y + 1, z: p.z }); });
  await sim(0.2);
  const s5 = await stats();
  assert(s5.remote > s4.remote, 'a shot 20 m away plays from the sprite');
  await frames(page, 3);
  assert(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();

// the weapon lab (`?weaponlab=1`): every gun fires; burst and auto, suppressed, distances, reloads and brass play
if (!failed) {
  const lab = await launch({ url, params: 'weaponlab=1' });
  try {
    const p = lab.page;
    await p.waitForSelector('.weapon-lab', { timeout: 90000 });
    const click = (text) => p.locator('.weapon-lab .btn').filter({ hasText: new RegExp(`^${text}`) }).first().click();
    const shots = () => p.evaluate(() => window.__app.weaponAudio.stats.shots + window.__app.weaponAudio.stats.remote);
    await click('Fire');
    await p.waitForFunction(() => window.__app.weaponAudio.stats.loaded, null, { timeout: 30000 });
    const gunBtns = p.locator('.weapon-lab .lab-gun .btn');
    const guns = await gunBtns.count();
    const campaign = await p.locator('.weapon-lab .lab-gun').first().locator('.btn').count();
    assert(guns === 16 && campaign === 6, `the lab lists every gun, the campaign's six first (${guns}, ${campaign})`);
    for (let i = 0; i < guns; i++) {
      const n0 = await shots();
      await gunBtns.nth(i).click();
      await click('Fire');
      await p.waitForFunction((n) => window.__app.weaponAudio.stats.shots + window.__app.weaponAudio.stats.remote > n, n0, { timeout: 5000 });
    }
    assert(true, 'every gun fires in the lab');
    await click('Auto');
    const a0 = await shots();
    await click('Fire');
    await p.waitForTimeout(1300);
    assert((await shots()) - a0 >= 5, `auto fires a run (${(await shots()) - a0} shots)`);
    await click('Suppressed');
    await click('Guard 18');
    await click('Single');
    const r0 = await p.evaluate(() => ({ ...window.__app.weaponAudio.stats }));
    await click('Fire');
    await click('Reload');
    await click('Empty reload');
    await click('Brass');
    await click('Dry fire');
    await p.waitForTimeout(400);
    const r1 = await p.evaluate(() => ({ ...window.__app.weaponAudio.stats }));
    assert(r1.remote > r0.remote && r1.reloads - r0.reloads === 2 && r1.casings > r0.casings && r1.dry > r0.dry, `the lab plays a guard shot, reloads, brass and dry fire (${JSON.stringify({ remote: r1.remote - r0.remote, reloads: r1.reloads - r0.reloads, casings: r1.casings - r0.casings, dry: r1.dry - r0.dry })})`);
    await click('Old synth');
    await click('Fire');
    await p.waitForTimeout(200);
    assert(lab.errors.length === 0, `lab: no console errors${lab.errors.length ? ': ' + lab.errors.join(' | ') : ''}`);
  } catch (e) {
    console.error(e);
    failed = true;
  }
  await lab.browser.close();
}
if (failed || process.exitCode) process.exit(1);
console.log('\nweapon audio e2e passed');
