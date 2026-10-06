// Weapon clipping sweep (Proving Grounds): every frame of movement and cover scenarios, points along the held
// gun are checked against the world (chest -> stock, then along the gun: blocked = through a wall) and against
// the legs (thigh / calf capsules). Bars: no frame with the gun > 2 cm into the world; legs graze <= 2.5 cm.
// Scenarios: walking / crouch-walking along a wall both sides, sprint, crouch run, high cover idle / moving /
// turn-and-swap / crouched / reload / swap, edge peeks with aim sweeps from back across the cover round past
// the edge (both edges, standing and crouched; stepping out as needed), fire from an edge, low cover idle /
// moving / reload / aim over / edge peek / vault.  `node scripts/e2e-clip.mjs [url] [--only=name] [--log]`
import { launch, assert } from './e2e-lib.mjs';

const url = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'http://localhost:4173/';
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7) ?? '';
const log = process.argv.includes('--log');
const { browser, page, errors } = await launch({ url, params: 'autostart=proving' });
let failed = false;
try {
await page.waitForTimeout(1200);
const res = await page.evaluate(([only, log]) => {
  window.__dbg = log;
  const a = window.__app, g = a.current, p = g.player, c = p.controller, st = a.input.state, V = p.position.constructor, rig = p.rig;
  const tmp = new V(), o = new V();
  const legSeg = [[rig.hipL, rig.kneeL, 0.075], [rig.kneeL, rig.ankleL, 0.05], [rig.hipR, rig.kneeR, 0.075], [rig.kneeR, rig.ankleR, 0.05]];
  const segDist = (P, A, B) => { const abx = B.x - A.x, aby = B.y - A.y, abz = B.z - A.z; const t = Math.max(0, Math.min(1, ((P.x - A.x) * abx + (P.y - A.y) * aby + (P.z - A.z) * abz) / (abx * abx + aby * aby + abz * abz || 1))); return Math.hypot(P.x - A.x - abx * t, P.y - A.y - aby * t, P.z - A.z - abz * t); };
  const check = (acc) => {
    const node = rig.heldWeapon; if (!node) return;
    const def = g.weapons.current.def;
    let z0 = 0; for (const q of def.model) z0 = Math.min(z0, q.pos[2] - q.size[2] / 2);
    const z1 = def.muzzle[2];
    const m = node.getWorldMatrix();
    rig.torso.computeWorldMatrix(true); o.copyFrom(rig.torso.getAbsolutePosition()); o.y += 0.1;
    let pen = 0, leg = 9;
    const knees = legSeg.map(([A, B, r]) => [A.getAbsolutePosition().clone(), B.getAbsolutePosition().clone(), r]);
    // the stock is held at the body: chest -> stock, then along the gun to each point
    const butt = V.TransformCoordinates(new V(0, def.muzzle[1], z0), m);
    const hb = g.ballistics.ray(o, butt, 1);
    if (hb.hit) pen = Math.max(pen, V.Distance(hb.point, butt));
    for (let z = z0; z <= z1 + 1e-6; z += 0.06) {
      V.TransformCoordinatesToRef(tmp.set(0, def.muzzle[1], z), m, tmp);
      const h = g.ballistics.ray(hb.hit ? o : butt, tmp, 1);
      if (h.hit) pen = Math.max(pen, V.Distance(h.point, tmp));
      for (const [A, B, r] of knees) leg = Math.min(leg, segDist(tmp, A, B) - r - 0.012);
    }
    acc.n++;
    if (pen > 0.02) { acc.wall++; if (window.__dbg) acc.log.push(`t ${acc.n} pen ${(pen*100).toFixed(0)} st ${g.cover.state} lean ${p.rig.graph.leanOut.toFixed(2)} raise ${p.carry.raise.toFixed(2)} side ${g.cover['peekSide']} kind ${g.cover.peekKind} aim ${(p.cam.yaw).toFixed(2)} body ${c.yaw.toFixed(2)} hand ${p.rig.leftHanded} step ${g.cover.stepOut.toFixed(2)} clear ${p.coverPose.gunClear} ` + (() => { const sg = g.cover.seg; if (!sg) return ''; const S = (P) => ((P.x - sg.ax) * sg.tx + (P.z - sg.az) * sg.tz).toFixed(2); const mz = V.TransformCoordinates(new V(0, def.muzzle[1], z1), m); const bt = V.TransformCoordinates(new V(0, def.muzzle[1], z0), m); return `len ${sg.len.toFixed(2)} body s ${S(p.position)} butt s ${S(bt)} muzzle s ${S(mz)} eye s ${S(p.rig.headNode.getAbsolutePosition())} | n ${sg.nx.toFixed(2)},${sg.nz.toFixed(2)} t ${sg.tx.toFixed(2)},${sg.tz.toFixed(2)} depth ${sg.depth.toFixed(2)}`; })()); }
    acc.maxPen = Math.max(acc.maxPen, pen);
    if (leg < 0) { acc.leg++; if (window.__dbg) acc.log.push(`t ${acc.n} LEG ${(leg*100).toFixed(1)} st ${g.cover.state} lean ${p.rig.graph.leanOut.toFixed(2)} hand ${p.rig.leftHanded} hs ${p.rig['handSwap'].toFixed(2)} clear ${p.coverPose.gunClear} body ${c.yaw.toFixed(2)} aim ${p.cam.yaw.toFixed(2)} crouch ${c.crouched} turn ${p.coverPose.turn.toFixed(2)}`); }
    acc.minLeg = Math.min(acc.minLeg, leg);
  };
  const tp = (x, z, yaw) => { g.cover.reset(); st.releaseAll(); if (c.crouched) c['crouchToggled'] = false; c.teleport(new V(x, 0, z), yaw); p.cam.yaw = yaw; p.cam.pitch = 0; a.loop.stepHeadless(0.5, 120); };
  const run = (sec, f) => { const acc = { n: 0, wall: 0, maxPen: 0, leg: 0, minLeg: 9, log: [] }; let t = 0; while (t < sec) { f?.(t); a.loop.stepHeadless(1 / 30, 120); t += 1 / 30; check(acc); } return acc; };
  const move = (x, y) => st.setMove('t', x, y);
  const S = {
    'walk wall left': () => { tp(-8.3, 0.5, 0); return run(2.5, () => move(0, 0.5)); },
    'walk wall right': () => { tp(-8.3, 4.5, Math.PI); return run(2.5, () => move(0, 0.5)); },
    'crouchwalk wall left': () => { tp(-8.3, 0.5, 0); st.tap('crouch'); return run(2.5, () => move(0, 0.6)); },
    'sprint': () => { tp(0, -14, Math.PI / 2); st.tap('dash'); return run(2, () => move(0, 1)); },
    'crouch run': () => { tp(0, -14, Math.PI / 2); st.tap('crouch'); return run(2, () => move(0, 1)); },
    'high cover idle': () => { tp(-8.8, 2.5, -Math.PI / 2); st.tap('cover'); return run(2); },
    'high cover move L': () => { tp(-8.8, 2.5, -Math.PI / 2); st.tap('cover'); run(1); return run(2, () => move(-1, 0)); },
    'high cover move R': () => { tp(-8.8, 2.5, -Math.PI / 2); st.tap('cover'); run(1); return run(2, () => move(1, 0)); },
    'high cover crouched': () => { tp(-8.8, 2.5, -Math.PI / 2); st.tap('cover'); run(1); st.tap('crouch'); return run(2, (t) => move(t < 1 ? -1 : 1, 0)); },
    'high cover reload': () => { tp(-8.8, 2.5, -Math.PI / 2); st.tap('cover'); run(1); st.tap('reload'); return run(2.5); },
    'high cover swap': () => { tp(-8.8, 2.5, -Math.PI / 2); st.tap('cover'); run(1); st.tap('swapNext'); return run(1.5); },
    'high peek R': () => { tp(-8.8, 3.4, -Math.PI / 2); st.tap('cover'); run(1.2); st.set('t', 'ads', true); const r = run(1.5); st.set('t', 'ads', false); return r; },
    'high peek sweep R': () => { tp(-8.8, 3.4, -Math.PI / 2); st.tap('cover'); run(1.2); st.set('t', 'ads', true); const r = run(4, (t) => { p.cam.yaw = -Math.PI / 2 + (-0.3 + (t / 4) * 1.9); }); st.set('t', 'ads', false); return r; },
    'high peek sweep L': () => { tp(-8.8, 0.6, -Math.PI / 2); st.tap('cover'); run(1.2); st.set('t', 'ads', true); const r = run(4, (t) => { p.cam.yaw = -Math.PI / 2 - (-0.3 + (t / 4) * 1.9); }); st.set('t', 'ads', false); return r; },
    'high peek crouch R': () => { tp(-8.8, 3.4, -Math.PI / 2); st.tap('cover'); run(1.2); st.tap('crouch'); run(0.5); st.set('t', 'ads', true); const r = run(4, (t) => { p.cam.yaw = -Math.PI / 2 + (-0.3 + (t / 4) * 1.9); }); st.set('t', 'ads', false); return r; },
    'high peek fire R': () => { tp(-8.8, 3.4, -Math.PI / 2); st.tap('cover'); run(1.2); p.cam.yaw = -Math.PI / 2 + 0.2; st.set('t', 'fire', true); const r = run(1.5); st.set('t', 'fire', false); return r; },
    'low edge peek': () => { tp(-3.7, -4.6, -Math.PI / 2); st.tap('cover'); run(1.2); p.cam.yaw = -Math.PI / 2 + 0.9; st.set('t', 'ads', true); const r = run(3, (t) => { p.cam.yaw = -Math.PI / 2 + 0.9 - t * 0.4; }); st.set('t', 'ads', false); return r; },
    'low cover idle': () => { tp(-3.7, -6, -Math.PI / 2); st.tap('cover'); return run(2); },
    'low cover move': () => { tp(-3.7, -6, -Math.PI / 2); st.tap('cover'); run(1); return run(3, (t) => move(t < 1.5 ? 1 : -1, 0)); },
    'low cover reload': () => { tp(-3.7, -6, -Math.PI / 2); st.tap('cover'); run(1); st.tap('reload'); return run(2.5); },
    'low over aim': () => { tp(-3.7, -6, -Math.PI / 2); st.tap('cover'); run(1); st.set('t', 'ads', true); const r = run(1.5); st.set('t', 'ads', false); return r; },
    'low vault': () => { tp(-3.7, -6, -Math.PI / 2); st.tap('cover'); run(1); st.tap('jump'); return run(1.5); },
  };
  const out = [];
  for (const [k, f] of Object.entries(S)) {
    if (only && !k.includes(only)) continue;
    const r = f();
    move(0, 0); st.releaseAll();
    out.push({ name: k, ...r, text: `${k.padEnd(22)} frames ${String(r.n).padStart(3)}  wall ${String(r.wall).padStart(3)} (max ${(r.maxPen * 100).toFixed(1)} cm)  legs ${String(r.leg).padStart(3)} (min clear ${(r.minLeg * 100).toFixed(1)} cm)` + (r.log.length ? '\n  ' + r.log.join('\n  ') : '') });
  }
  return out;
}, [only, log]);
for (const r of res) {
  console.log(r.text);
  assert(r.wall === 0, `${r.name}: the gun never goes into the world (${r.wall} frames, max ${(r.maxPen * 100).toFixed(1)} cm)`);
  assert(r.minLeg > -0.025, `${r.name}: the gun clears the legs (min ${(r.minLeg * 100).toFixed(1)} cm)`);
}
} catch (e) {
  failed = true;
  console.error(String(e));
}
const real = errors.filter((e) => !/GPU stall|WebGL|swiftshader|Automatic fallback|AudioContext/i.test(e));
if (real.length) {
  failed = true;
  console.error(real.join('\n'));
} else console.log('no console errors');
await browser.close();
process.exit(failed ? 1 : 0);
