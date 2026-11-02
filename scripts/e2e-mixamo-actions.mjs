// (mixamo-chars, N53 slice e) The Test Chamber player's action moves: with the pose forced (the systems that set it in
// play are the traversal, the strike and the grenade), hanging plays `hang_idle`, a climb-up `hang_climb_up` pinned to
// its progress, a ladder `ladder`, a takedown strike `strike_elbow`, a throw `throw`, a carried body the carry set; each
// action fades back to the locomotion when it ends. Screenshots of each to `--shots=<dir>`.
//   node scripts/e2e-mixamo-actions.mjs [url] [--shots=<dir>]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://localhost:4173/';
const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice(8) ?? '';
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber' });
const G = (f, a) => page.evaluate(f, a);
const shot = async (name) => {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
};
// holds pose fields on the player every frame (before the rig animates) until `release`
const hold = (fields) =>
  G((f) => {
    const g = window.__app.current;
    window.__mxHold?.();
    // (the game rewrites these every step: each is pinned with a fixed property while held; the throw clock is the
    // player's own, the rest the player's pose)
    const owner = (k) => (k === 'grenadeT' ? g.player : g.player.pose);
    for (const [k, v] of Object.entries(f)) Object.defineProperty(owner(k), k, { get: () => v, set() {}, configurable: true });
    window.__mxHold = () => {
      const rest = { grenadeT: -1, melee: -1, traverse: 'none', traverseT: 0, carryBody: false, carrySide: 0 };
      for (const k of Object.keys(f)) {
        delete owner(k)[k];
        owner(k)[k] = rest[k];
      }
      window.__mxHold = null;
    };
  }, fields);
const release = () => G(() => window.__mxHold?.());
const top = () =>
  G(() => {
    let best = '', bw = -1;
    for (const [n, v] of Object.entries(window.__app.current.player.mixamo.weights())) if (v > bw) { bw = v; best = n; }
    return { best, bw };
  });
try {
  await page.waitForFunction(() => window.__app?.current?.player?.mixamo?.ready, null, { timeout: 90000 });
  await frames(page, 20);
  const cases = [
    ['hang', { traverse: 'hang', traverseT: 0 }, 'hang_idle'],
    ['climb-up', { traverse: 'climbUp', traverseT: 0.5 }, 'hang_climb_up'],
    ['ladder', { traverse: 'climb', traverseT: 0 }, 'ladder'],
    ['strike', { melee: 0.4 }, 'strike_elbow'],
    ['throw', { grenadeT: 0.3 }, 'throw'],
    ['carry', { carryBody: true, carrySide: 1 }, 'carry_idle'],
  ];
  for (const [name, fields, clip] of cases) {
    await hold(fields);
    await frames(page, 30);
    const t = await top();
    console.log(name, JSON.stringify(t));
    await shot(`a-${name}`);
    await release();
    // the systems put the fields back next step; clear them in case none does here
    await G((f) => { const g = window.__app.current; for (const k of Object.keys(f)) { if (k === 'grenadeT') g.player.grenadeT = -1; else if (k === 'carryBody') g.player.pose.carryBody = false; else if (k === 'traverse') g.player.pose.traverse = 'none'; else if (k === 'melee') g.player.pose.melee = -1; } }, fields);
    await frames(page, 30);
    const back = await top();
    assert(t.best === clip, `${name} plays ${clip} (${t.best} ${t.bw.toFixed(2)})`);
    assert(back.best === 'idle', `after ${name} the idle is back (${back.best})`);
  }
  const bad = errors.filter((e) => !/WebGL|GPU stall|GL Driver/i.test(e));
  if (bad.length) console.log('console errors:\n  ' + bad.join('\n  '));
  assert(bad.length === 0, `${bad.length} console errors`);
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
}
await browser.close();
console.log(failed ? 'e2e-mixamo-actions: FAIL' : 'e2e-mixamo-actions: PASS');
process.exit(failed ? 1 : 0);
