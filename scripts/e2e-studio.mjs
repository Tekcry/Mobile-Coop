// (anim-studio) The Anim Studio: `?autostart=studio` boots the stage with the tuner panel docked and its Studio section;
// the loop player plays a keyed clip in place, paused a key step moves the phase by one key (1 / frames) and the drive
// is on Wren's graph; mirror reaches the drive; a moving state walks the circle; the game speed goes to 2x inside the
// studio; a slider change undoes; a preset saves to the tuner's IndexedDB store and loads back; the pause menu has no
// studio row inside the studio; leaving to the main menu puts the time scale back to 1 and leaves no studio state.
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=studio' });
const G = (f, a) => page.evaluate(f, a);
const st = () => G(() => window.__studio.state());
try {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__studio?.state().active, null, { timeout: 90000 });
  await frames(page, 10);
  const s0 = await G(() => ({
    map: window.__app.current.world.map.id,
    panel: !document.querySelector('.anim-tune').hidden,
    section: !document.querySelector('.anim-tune-studio').hidden,
    entries: window.__studio.entries(),
    menu: !!document.querySelector('.main-menu'),
  }));
  assert(s0.map === 'studio' && s0.panel && s0.section, `the studio boots with the tuner panel and its Studio section (${JSON.stringify({ ...s0, entries: s0.entries.length })})`);
  assert(s0.entries.includes('keyed:walk') && s0.entries.includes('keyed:guard_choke_sag') && s0.entries.includes('state:aimStrafe'), `the loop list has the keyed clips and the states (${s0.entries.length})`);

  // a keyed clip in place: paused, one key forward moves the phase by one key
  await G(() => window.__studio.pick('keyed:walk'));
  await frames(page, 12);
  await G(() => window.__studio.pause());
  await frames(page, 3);
  const a = await st();
  const drive = () => G(() => { const d = window.__app.current.player.rig.graph.drive; return d ? { phase: d.phase, mirror: d.mirror, clip: d.clip?.name ?? '' } : null; });
  const d0 = await drive();
  assert(a.frames === 32 && d0 && d0.clip === 'walk' && (await G(() => window.__app.loop.timeScale)) === 0, `keyed walk on Wren's graph, paused (frames ${a.frames}, drive ${JSON.stringify(d0)})`);
  await G(() => window.__studio.step(1));
  await frames(page, 3);
  const p1 = (await st()).phase;
  await G(() => window.__studio.step(1));
  await frames(page, 3);
  const p2 = (await st()).phase;
  const dp = (((p2 - p1) % 1) + 1) % 1;
  assert(Math.abs(dp - 1 / 32) < 1e-6 && Math.abs(p1 * 32 - Math.round(p1 * 32)) < 1e-6, `a key step moves the phase by one key (${p1.toFixed(4)} -> ${p2.toFixed(4)})`);
  await G(() => window.__studio.step(-1));
  await frames(page, 3);
  assert(Math.abs((await st()).phase - p1) < 1e-6 && Math.abs((await drive()).phase - p1) < 1e-6, 'a key back returns to it (the drive holds the phase)');
  await frames(page, 10);
  assert(Math.abs((await st()).phase - p1) < 1e-6, 'paused, the phase stays');
  await G(() => window.__studio.mirror(true));
  await frames(page, 3);
  assert((await st()).mirror && (await drive()).mirror, 'mirror reaches the drive');
  await G(() => window.__studio.mirror(false));

  // play at 2x (inside the studio only)
  await G(() => window.__studio.play());
  await G(() => window.__studio.speed(2));
  await frames(page, 3);
  assert((await G(() => window.__app.loop.timeScale)) === 2, 'the game speed goes to 2x in the studio');
  await G(() => window.__studio.speed(1));

  // a procedural state walks the circle (synthesised input)
  await G(() => window.__studio.pick('state:walk'));
  await frames(page, 3);
  const w0 = await G(() => { const p = window.__app.current.player.position; return { x: p.x, z: p.z }; });
  await G(() => window.__app.loop.stepHeadless(2));
  await frames(page, 3);
  const w1 = await G(() => { const p = window.__app.current.player.position; return { x: p.x, z: p.z, drive: window.__app.current.player.rig.graph.drive }; });
  const moved = Math.hypot(w1.x - w0.x, w1.z - w0.z);
  assert(moved > 0.5 && w1.drive === null, `state walk moves the player by synthesised input, no drive (${moved.toFixed(2)} m in 2 s)`);
  await G(() => window.__studio.pick('state:idle'));

  // undo a slider change
  const T = () => G(() => window.__animTune.get('walk', 'trackMul'));
  await G(() => window.__animTune.set('walk', 'trackMul', 1.2));
  await G(() => window.__animTune.settle());
  assert((await T()) === 1.2, 'a slider set');
  await G(() => window.__animTune.undo());
  assert((await T()) === 1, `undo puts it back (${await T()})`);
  await G(() => window.__animTune.redo());
  assert((await T()) === 1.2, 'redo sets it again');
  await G(() => window.__animTune.undo());

  // a preset saved by name, stored, loaded back
  await G(() => window.__animTune.presetsLoaded());
  const K = () => G(() => window.__animTune.get('walk', 'kneeOutMul'));
  await G(() => {
    window.__animTune.set('walk', 'kneeOutMul', 1.3);
    window.__animTune.presetSave('e2e studio');
    window.__animTune.set('walk', 'kneeOutMul', 1);
  });
  assert((await K()) === 1 && (await G(() => window.__animTune.presets())).includes('e2e studio'), 'a preset saved by name');
  await G(() => window.__animTune.presetLoad('e2e studio'));
  assert((await K()) === 1.3, `the preset loads back (${await K()})`);
  const readStored = () => G(async () => {
    const dbs = await indexedDB.databases();
    const name = dbs.find((d) => d.name?.endsWith('-animtune'))?.name;
    if (!name) return null;
    const db = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const v = await new Promise((res, rej) => { const r = db.transaction('tune', 'readonly').objectStore('tune').get('presets'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    db.close();
    return v?.presets?.find((p) => p.name === 'e2e studio')?.values?.walk?.kneeOutMul ?? null;
  });
  // (the store writes asynchronously: a few tries)
  let stored = null;
  for (let i = 0; i < 20 && stored !== 1.3; i++) {
    await frames(page, 3);
    stored = await readStored();
  }
  assert(stored === 1.3, `the preset is in the tuner's IndexedDB store (${stored})`);
  await G(() => {
    window.__animTune.presetDelete('e2e studio');
    window.__animTune.set('walk', 'kneeOutMul', 1);
  });

  // pause: no studio row inside the studio; quit to the main menu
  await G(() => window.__app.current.pause());
  await frames(page, 4);
  const keys = await G(() => [...document.querySelectorAll('.pause-screen .ms-item')].map((b) => b.dataset.key).join(','));
  assert(!keys.includes('anim-studio') && keys.includes('quit'), `pause in the studio has no studio row (${keys})`);
  await G(() => document.querySelector('.pause-screen [data-key="quit"]').click());
  await frames(page, 3);
  await G(() => [...document.querySelectorAll('.dialog-buttons .btn')].find((b) => b.textContent === 'Quit').click());
  await page.waitForSelector('.main-menu', { timeout: 60000 });
  await frames(page, 5);
  const after = await G(() => ({
    st: window.__studio.state(),
    ts: window.__app.loop.timeScale,
    free: window.__animTune.freeState().mode,
    panel: document.querySelector('.anim-tune').hidden,
    overlay: document.querySelector('.studio-overlay')?.hidden ?? true,
    row: !!document.querySelector('.main-menu [data-key="anim-studio"]'),
  }));
  assert(!after.st.active && after.st.entry === 'state:idle' && !after.st.turntable && !after.st.mirror && after.ts === 1 && after.free === 'off', `leaving: time scale 1, no studio state (${JSON.stringify({ active: after.st.active, entry: after.st.entry, ts: after.ts, free: after.free })})`);
  assert(after.panel && after.overlay, 'leaving: the panel the studio opened and its overlay are closed');
  assert(after.row, 'the main menu has the Anim Studio (dev) row');
  const bad = errors.filter((e) => !/WebGL|GPU stall|swiftshader|favicon|GL Driver/i.test(e));
  assert(bad.length === 0, `no console errors (${bad.slice(0, 2).join(' | ')})`);
} catch (e) {
  failed = true;
  console.error(String(e?.stack ?? e));
} finally {
  await browser.close();
}
if (failed || process.exitCode) {
  console.error('FAILED');
  process.exit(1);
}
console.log('e2e-studio OK');
