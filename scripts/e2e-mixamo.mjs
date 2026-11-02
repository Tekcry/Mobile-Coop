// (mixamo-chars, N53 slice a) The Test Chamber's player is a Mixamo mannequin playing Mixamo moves: the body loads, Wren
// is hidden, standing still plays the idle, the stick forward walks / runs (the walk or run group is the strongest), B
// crouches into the crouch idle; no console errors. Screenshots of each state go to `--shots=<dir>` (default none).
//   node scripts/e2e-mixamo.mjs [url] [--shots=<dir>]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, assert, frames, press, BTN } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://localhost:4173/';
const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice(8) ?? '';
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber' });
const G = (f, a) => page.evaluate(f, a);
// the virtual pad's left stick, y only (-1 forward)
const fwd = (y) => G((v) => window.__pad.axis(1, v), y);
const shot = async (name) => {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
};
// the strongest locomotion group of the player's Mixamo body, and its weight
const top = () =>
  G(() => {
    const m = window.__app.current.player.mixamo;
    let best = '', bw = -1;
    for (const g of m.loco) if (g && g.weight > bw) { bw = g.weight; best = g.name.split(':').pop(); }
    return { best, bw, ready: m.ready, failed: m.failed };
  });
try {
  await page.waitForFunction(() => !!window.__app?.current?.player, null, { timeout: 90000 });
  await page.waitForFunction(() => { const m = window.__app.current.player.mixamo; return !!m && (m.ready || m.failed); }, null, { timeout: 60000 });
  const s0 = await G(() => {
    const p = window.__app.current.player;
    const meshes = p.mixamo.root.getChildMeshes(false);
    return { map: window.__app.current.world.map.id, figure: p.figure.renderMeshes.some((m) => m.isEnabled() && m.isVisible), meshes: meshes.length, groups: p.mixamo.groups.length };
  });
  console.log('loaded', JSON.stringify(s0));
  assert(s0.map === 'chamber', `map is ${s0.map}`);
  assert(s0.meshes > 0, 'the Mixamo body has meshes');
  assert(!s0.figure, 'Wren is hidden');
  assert(s0.groups >= 9, `the body has its moves (${s0.groups})`);
  await G(() => window.__pad.connect());
  await G(() => window.__app.settings.update((d) => { d.gamepad.curve = 'linear'; d.gamepad.deadzoneLeft = 0; }));
  await press(page, BTN.RS); // reveal pad
  await frames(page, 30);
  let t = await top();
  console.log('still', JSON.stringify(t));
  assert(!t.failed && t.ready, 'the body loaded');
  assert(t.best === 'idle', `still plays the idle (${t.best})`);
  await shot('1-idle');
  await fwd(-1);
  await frames(page, 60);
  t = await top();
  console.log('forward', JSON.stringify(t));
  assert(t.best === 'walk' || t.best === 'run' || t.best === 'sprint', `forward plays a forward gait (${t.best})`);
  await shot('2-forward');
  await fwd(0);
  await frames(page, 40);
  await press(page, BTN.B);
  await frames(page, 60);
  t = await top();
  console.log('crouched', JSON.stringify(t));
  assert(t.best === 'crouch_idle', `crouched still plays the crouch idle (${t.best})`);
  await shot('3-crouch');
  await fwd(-1);
  await frames(page, 60);
  t = await top();
  console.log('crouch walk', JSON.stringify(t));
  assert(t.best === 'crouch_walk', `crouched forward plays the crouch walk (${t.best})`);
  await shot('4-crouch-walk');
  await fwd(0);
  const errs = errors;
  if (errs.length) console.log('console errors:\n  ' + errs.join('\n  '));
  assert(errs.length === 0, `${errs.length} console errors`);
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
}
await browser.close();
console.log(failed ? 'e2e-mixamo: FAIL' : 'e2e-mixamo: PASS');
process.exit(failed ? 1 : 0);
