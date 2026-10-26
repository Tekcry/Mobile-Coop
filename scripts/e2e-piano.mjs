// Piano escape (piano-escape S2, solo): the intro on the stub mill (`?piano=1&autostart=thornbeckMill&mode=sector`),
// the skip to the EMP prompt (hold Start 1 s), the press (pad A) -> every lamp dead, the lightning t0 set, the meter
// dark, input on at the cut; a checkpoint restart never replays the intro, the lamps stay dead and the scene music plays
// on. The sim is driven with `loop.stepHeadless` (input polled each step). S4 extends it with the two-tab co-op run.
// Hooks: window.__piano (the scene's debug()), window.__sector, window.__app.
import { launch, frames, press, BTN, assert } from './e2e-lib.mjs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const PARAMS = 'piano=1&autostart=thornbeckMill&mode=sector';
/** The meter's dark band (`LIGHT.shadow`, src/world/lights.ts). */
const SHADOW = 0.28;

let ok = true;
console.log('piano escape: solo intro, skip, EMP, cut, restart');
const { browser, page, errors } = await launch({ url, params: PARAMS });
const G = (f, a) => page.evaluate(f, a);
const sim = async (s) => {
  for (let t = 0; t < s; t += 0.5) await G((d) => window.__app.loop.stepHeadless(d), Math.min(0.5, s - t));
  await frames(page, 1);
};
const dbg = () => G(() => window.__piano.debug());
try {
  await page.waitForFunction(() => !!window.__app?.current?.player && !!window.__piano && !!window.__sector, null, { timeout: 120000 });
  assert(await G(() => window.__app.current.world.map.id === 'thornbeckMill' && window.__app.current.world.map.scene === 'piano'), 'the stub mill loads as the piano scene');
  // audio unlocked (the piano starts from the intro's 0 s), the pad in
  const vp = page.viewportSize() ?? { width: 1280, height: 640 };
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await G(() => window.__pad.connect());
  await press(page, BTN.LS);
  await sim(0.5);

  // ---- the intro: input held, no guard, no objective yet, the music in the scene
  let d = await dbg();
  assert(d.shot === 'black' || d.shot === 'fadeIn', `the intro starts black (${d.shot}, t ${Number(d.t).toFixed(2)})`);
  assert(d.holdsSpawn && !d.inPlay && !d.pressed, 'guards held and the objective waits until the EMP');
  assert(await G(() => window.__app.current.sceneView?.holdsInput === true && window.__app.current.sceneView?.ownsPause === true), 'the intro holds the input and owns the pause button (its skip)');
  assert(await G(() => window.__app.current.enemyMgr.alive === 0), 'no guard is up in the intro');
  assert(await G(() => window.__app.music.sceneActive === true), 'the scene owns the music (the director muted)');
  const p0 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  await G(() => window.__pad.axis(1, -1));
  await sim(0.6);
  await G(() => window.__pad.axis(1, 0));
  const p1 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  assert(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05, 'the stick moves nobody in the intro');

  // ---- the skip: hold Start 1 s -> the prompt (38 s), not the pause menu
  await G(() => window.__pad.set(9, 1));
  await sim(1.3);
  await G(() => window.__pad.set(9, 0));
  await sim(0.2);
  d = await dbg();
  assert(d.skipped && d.prompt && d.shot === 'prompt', `the Start hold skips to the prompt (${d.shot}, t ${Number(d.t).toFixed(2)})`);
  assert(await G(() => !window.__app.current.menuPaused), 'the hold never opened the pause menu');
  // the prompt has no timer
  await sim(3);
  assert((await dbg()).prompt, 'the prompt waits with no timer');

  // ---- the press: the EMP beat
  await press(page, BTN.A);
  await sim(0.1);
  d = await dbg();
  assert(d.pressed && d.pressedBy === 'local', 'pad A sets off the EMP');
  assert(d.t0 >= 0, `the lightning t0 is the press time (${d.t0})`);
  assert(d.dark, 'the scene dark is on (sceneDark stand-in)');
  assert(await G(() => window.__app.current.world.level.lights.lights.filter((l) => l.electric && l.on && !l.destroyed).length === 0), `every lamp is dead (${d.lampsCut} cut)`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === true), 'input still held in the black-out beat');
  await sim(2.8);
  d = await dbg();
  assert(d.inPlay && d.shot === 'play', `the cut to play at press + 2.5 s (${d.shot})`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === false), 'input on at the cut');
  await sim(0.5);
  const lv = await G(() => window.__app.current.lightLevel);
  assert(lv < SHADOW, `the meter reads dark (${lv.toFixed(3)} < ${SHADOW})`);
  const q0 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  await G(() => window.__pad.axis(1, -1));
  await sim(1);
  await G(() => window.__pad.axis(1, 0));
  const q1 = await G(() => { const p = window.__app.current.player.position; return [p.x, p.z]; });
  assert(Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) > 0.3, 'the stick moves the operator after the cut');

  // ---- a restart: no intro, the lamps stay dead, the music plays on
  const r0 = await G(() => window.__sector.restarts);
  assert(await G(() => window.__sector.restartCheckpoint()), 'the checkpoint restart runs');
  await sim(1.5);
  assert((await G(() => window.__sector.restarts)) === r0 + 1, 'one restart');
  d = await dbg();
  assert(d.shot === 'play' && d.inPlay && !d.holdsSpawn, `the restart never replays the intro (${d.shot})`);
  assert(await G(() => window.__app.current.sceneView?.holdsInput === false), 'input on after the restart');
  assert(await G(() => window.__app.current.world.level.lights.lights.filter((l) => l.electric && l.on && !l.destroyed).length === 0), 'the lamps stay dead after the restart');
  assert(await G(() => window.__app.music.sceneActive === true), 'the scene music plays on through the restart');

  const errs = errors.filter((e) => !/GPU stall|GL Driver/.test(e));
  assert(errs.length === 0, `no console errors${errs.length ? ': ' + errs.join(' | ') : ''}`);
} catch (e) {
  ok = false;
  console.error(e);
}
await browser.close();
if (ok) console.log('piano e2e passed');
process.exit(ok ? 0 : 1);
