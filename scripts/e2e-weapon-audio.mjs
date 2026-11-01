// Weapon sounds (CC0 sprite): the sprite decodes and lines up; the rifle's automatic fire plays one shot per round
// with its brass, the choke keeps the voice count low; a suppressed gun plays its suppressed bank; reload, dry fire and
// a guard's or teammate's shot play; the noise guards hear is unchanged (the sounds are cosmetic). Proving Grounds,
// fake gamepad, headless audio.
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
    if (setup) for (const [k, v] of setup) (k === 6 ? window.__app.input.state.set('t', 'ads', !!v) : window.__pad.set(k, v));
    st.fixedUpdate = (dt) => {
      orig(dt);
      t += dt;
      noise = Math.max(noise, st.noise);
      voices = Math.max(voices, app.audio['voices']);
      if (t >= s) {
        st.fixedUpdate = orig;
        if (setup) for (const [k] of setup) (k === 6 ? window.__app.input.state.set('t', 'ads', false) : window.__pad.set(k, 0));
        res({ noise, voices });
      }
    };
  }), [s, setup ?? null]);
const stats = () => G(() => ({ ...window.__app.weaponAudio.stats }));
try {
  await G(() => { window.__pad.connect(); });
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
  // (the sandbox gives infinite ammo, which never spends quiet rounds: switch it off for the quiet-round checks)
  await G(() => { window.__app.current.weapons['infiniteAmmo'] = false; });
  const sdA = await G(() => window.__app.current.weapons.current.sd);
  const sd = await sim(0.3, [[BTN.RT, 1]]);
  await sim(0.5);
  const s2 = await stats();
  const sdB = await G(() => window.__app.current.weapons.current.sd);
  assert(s2.suppressed > s1.suppressed, `a suppressed rifle plays suppressed shots (${s2.suppressed - s1.suppressed})`);
  assert(sd.noise < openNoise, `guards hear the suppressed rifle less (${sd.noise.toFixed(1)} m < ${openNoise.toFixed(1)} m)`);
  assert(sdA - sdB === s2.suppressed - s1.suppressed && sdA - sdB > 0, `each suppressed shot spends a quiet round (${sdA} -> ${sdB})`);
  await page.waitForFunction(() => /^SD \d+$/.test(document.querySelector('.w-sd')?.textContent ?? ''), null, { timeout: 5000 });
  await G(() => { window.__app.current.weapons.current.stats.noise = 1; });

  // (sd-rounds) out of quiet rounds: a suppressed rifle fires open shots and guards hear it like an open gun
  await sim(4);
  await G(() => { const c = window.__app.current.weapons.current; c.stats.noise = 0.45; c.sd = 0; });
  const sp = await sim(0.3, [[BTN.RT, 1]]);
  await sim(0.5);
  const s3o = await stats();
  assert(s3o.suppressed === s2.suppressed, 'out of quiet rounds: open shots');
  assert(sp.noise >= openNoise * 0.9, `guards hear a spent suppressor like an open gun (${sp.noise.toFixed(1)} m >= ${(openNoise * 0.9).toFixed(1)} m)`);
  await G(() => { const c = window.__app.current.weapons.current; c.stats.noise = 1; c.sd = 60; window.__app.current.weapons['infiniteAmmo'] = true; });

  // reload, then dry fire on an empty gun with nothing in reserve
  // (X held 0.4 s with the gun out reloads; A never does: anim-rework S1)
  // (forceAds aims without drawing, so the stance base is still 'holstered': the first X press is spent as the draw
  // (weaponStance.ts), the second hold reloads. A player-drawn gun reloads on the first hold.)
  await sim(0.55, [[BTN.X, 1]]);
  await sim(0.2);
  await sim(0.55, [[BTN.X, 1]]);
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
  // (coop-walk-fixes P7) a partner's suppressed pistol round: its own gun, played suppressed
  await G(() => { const g = window.__app.current; const p = g.player.position; g.events.emit('remoteShot', { cls: 'pistol', x: p.x + 8, y: p.y + 1, z: p.z, gun: 'pistolSd', quiet: true }); });
  await sim(0.2);
  const s6 = await stats();
  assert(s6.remote > s5.remote && s6.remoteSd > s5.remoteSd, `a partner's suppressed round plays suppressed (${s5.remoteSd} -> ${s6.remoteSd})`);
  await frames(page, 3);
  assert(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} catch (e) {
  console.error(e);
  failed = true;
}
await browser.close();
if (failed || process.exitCode) process.exit(1);
console.log('\nweapon audio e2e passed');
