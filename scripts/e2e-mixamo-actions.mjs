// (mixamo-chars, N53 slice e) The Test Chamber player's action moves: with the pose forced (the systems that set it in
// play are the traversal, the strike and the grenade), hanging plays `hang_idle`, a climb-up `hang_climb_up` pinned to
// its progress, a ladder `ladder`, a takedown strike `strike_elbow`, a throw `throw`, a carried body the carry set, (slice f)
// a vault, a drop (fall), a roll, a crawl and back to the wall; each
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
      const rest = { grenadeT: -1, melee: -1, traverse: 'none', traverseT: 0, carryBody: false, carrySide: 0, wall: false };
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
    // (slice f)
    ['vault', { traverse: 'vault', traverseT: 0.4 }, 'vault'],
    ['fall', { traverse: 'drop', traverseT: 0 }, 'fall'],
    ['roll', { traverse: 'roll', traverseT: 0.5 }, 'roll'],
    ['crawl', { traverse: 'crawl', traverseT: 0 }, 'crawl'],
    ['wall', { wall: true }, 'wall_idle'],
    // (slice i)
    ['pipe climb', { traverse: 'pipeClimb', traverseT: 0 }, 'rope_climb'],
    ['pipe legs', { traverse: 'pipeLegs', traverseT: 0 }, 'hang_idle'],
    ['wall kick', { traverse: 'wallKick', traverseT: 0.4 }, 'wall_kick'],
    ['rappel', { traverse: 'rappel', traverseT: 0 }, 'team_rope'],
    ['split', { traverse: 'split', traverseT: 0 }, 'fall'],
    ['brace', { traverse: 'brace', traverseT: 0 }, 'team_lift'],
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
  // (slice h) a timed action follows the game's progress (it stood on one frame while pinned at rate 0): the climb-up's
  // hips at 10% and 90% of the move differ
  const hipsY = () => G(() => { const p = window.__app.current.player; return p.mixamo.boneNode('Hips').getAbsolutePosition().y - p.controller.pos.y; });
  await hold({ traverse: 'climbUp', traverseT: 0.1 });
  await frames(page, 30);
  const early = await hipsY();
  await hold({ traverse: 'climbUp', traverseT: 0.9 });
  await frames(page, 10);
  const late = await hipsY();
  // (slice i) at its very end the clip shows its last frame, not its first again (the clip loops)
  await hold({ traverse: 'climbUp', traverseT: 1 });
  await frames(page, 10);
  const end = await hipsY();
  await release();
  console.log('climb-up hips at the end', end.toFixed(2));
  assert(Math.abs(end - late) < 0.25, `the climb-up ends on its last frame (hips ${late.toFixed(2)} at 90%, ${end.toFixed(2)} at 100%)`);
  await G(() => { window.__app.current.player.pose.traverse = 'none'; });
  console.log('climb-up hips', early.toFixed(2), late.toFixed(2));
  assert(Math.abs(late - early) > 0.2, `the climb-up follows its progress (hips ${early.toFixed(2)} -> ${late.toFixed(2)} m)`);
  // (slice h) the team moves: the team input fed to the player's team pose (as GameState writes it in a real move)
  await G(() => {
    const tp = window.__app.current.player.teamPose;
    tp.__orig ??= tp.begin.bind(tp);
    tp.begin = (dt, i, rp, rig) => tp.__orig(dt, window.__ti ? Object.assign({}, i, window.__ti) : i, rp, rig);
  });
  const team = [
    ['leg-up offer', { move: 'boost', role: 'b', k: -1 }, 'team_lift', (h) => h < 0.7],
    ['leg-up drive', { move: 'boost', role: 'b', k: 1 }, 'team_lift', (h) => h > 0.85],
    ['hang-down holder', { move: 'hang', role: 'b', k: 1 }, 'team_brace', null],
    ['rope holder', { move: 'rope', role: 'b', k: 1 }, 'team_rope', null],
    ['rope climber', { move: 'rope', role: 'a', k: 1 }, 'rope_climb', null],
  ];
  for (const [name, ti, clip, hipsOk] of team) {
    await G((x) => { window.__ti = x; }, ti);
    await frames(page, 30);
    const t = await top();
    const h = await hipsY();
    console.log(name, JSON.stringify(t), 'hips', h.toFixed(2));
    await shot(`t-${name.replace(/ /g, '-')}`);
    assert(t.best === clip, `${name} plays ${clip} (${t.best} ${t.bw.toFixed(2)})`);
    if (hipsOk) assert(hipsOk(h), `${name}: hips at ${h.toFixed(2)} m`);
  }
  await G(() => { window.__ti = null; });
  await frames(page, 30);
  const after = await top();
  assert(after.best === 'idle', `after the team moves the idle is back (${after.best})`);
  // (slice i) hanging inverted on a pipe the body turns over with the rig's tumble: the feet above the head
  await hold({ traverse: 'pipeInv', traverseT: 0, tumble: Math.PI });
  await frames(page, 60);
  const inv = await G(() => { const m = window.__app.current.player.mixamo; return { foot: m.boneNode('LeftFoot').getAbsolutePosition().y, head: m.boneNode('Head').getAbsolutePosition().y }; });
  await shot('a-pipe-inverted');
  await release();
  await G(() => { const p = window.__app.current.player.pose; p.traverse = 'none'; p.tumble = 0; });
  await frames(page, 40);
  const upright = await G(() => { const m = window.__app.current.player.mixamo; return { foot: m.boneNode('LeftFoot').getAbsolutePosition().y, head: m.boneNode('Head').getAbsolutePosition().y }; });
  assert(inv.foot > inv.head + 0.5, `inverted on a pipe the body is turned over (feet ${inv.foot.toFixed(2)}, head ${inv.head.toFixed(2)})`);
  assert(upright.head > upright.foot + 1, `back upright after (head ${upright.head.toFixed(2)}, feet ${upright.foot.toFixed(2)})`);
  // (slice i) our own player down: the body lies (`downed_lie`); back up, the idle
  await G(() => { window.__app.current.player.alive = false; });
  await frames(page, 30);
  const down = await top();
  await shot('d-downed');
  await G(() => { window.__app.current.player.alive = true; });
  await frames(page, 30);
  const up = await top();
  assert(down.best === 'downed_lie', `our own player down lies (${down.best})`);
  assert(up.best === 'idle', `back up, the idle is back (${up.best})`);
  const bad =errors.filter((e) => !/WebGL|GPU stall|GL Driver/i.test(e));
  if (bad.length) console.log('console errors:\n  ' + bad.join('\n  '));
  assert(bad.length === 0, `${bad.length} console errors`);
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
}
await browser.close();
console.log(failed ? 'e2e-mixamo-actions: FAIL' : 'e2e-mixamo-actions: PASS');
process.exit(failed ? 1 : 0);
