// (mixamo-chars, N53 slice c) Test Chamber guards draw as the Mixamo Swat: a spawned grunt's body loads, the merged body
// goes, his rig's head node (his eye) rides within 12 cm of the Swat's Head bone, he plays a Mixamo move; (walk-test fix
// B2) killed, the Swat stays and lies with the ragdoll, and picked up the carried body is the Swat too; no console errors.
//   node scripts/e2e-mixamo-guards.mjs [url] [--shots=<dir>]
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, assert, frames } from './e2e-lib.mjs';

const url = process.argv.find((a) => /^https?:/.test(a)) ?? 'http://localhost:4173/';
const shots = process.argv.find((a) => a.startsWith('--shots='))?.slice(8) ?? '';
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const { browser, page, errors } = await launch({ url, params: 'autostart=chamber&mode=test&guards=1' });
const G = (f, a) => page.evaluate(f, a);
const shot = async (name) => {
  if (shots) await page.screenshot({ path: join(shots, `${name}.png`) });
};
try {
  await page.waitForFunction(() => !!window.__app?.current?.enemyMgr && !!window.__app.current.player, null, { timeout: 90000 });
  // one grunt, calm, 4 m in front of the player, facing him
  await G(() => {
    const g = window.__app.current;
    const em = g.enemyMgr;
    em.clear();
    const p = g.player.position;
    const V = p.constructor;
    const yaw = g.player.controller.yaw ?? 0;
    const x = p.x + Math.sin(yaw) * 4, z = p.z + Math.cos(yaw) * 4;
    const e = em.spawn('grunt', new V(x, 0, z), false, yaw + Math.PI);
    if (e) {
      e.passive = true;
      e.setPatrol(null);
    }
  });
  await page.waitForFunction(() => { const b = window.__app.current.enemyMgr.enemies[0]?.gbody; return !!b && (!b.mixamo || b.mixamo.ready || b.mixamo.failed); }, null, { timeout: 60000 });
  await frames(page, 60);
  const s = await G(() => {
    const e = window.__app.current.enemyMgr.enemies[0];
    const b = e.gbody, m = b.mixamo;
    if (!m) return { mixamo: false };
    const head = m.boneNode('Head').getAbsolutePosition();
    const eye = e.rig.headNode.getAbsolutePosition();
    let best = '', bw = -1;
    for (const [n, v] of Object.entries(m.weights())) if (v > bw) { bw = v; best = n; }
    return {
      mixamo: true, ready: m.ready, failed: m.failed, model: m.model, shown: b.shown,
      merged: e.rig.renderMeshes.some((x) => x.isEnabled()),
      eyeToHead: Math.hypot(head.x - eye.x, head.y - eye.y, head.z - eye.z), best, headY: head.y - e.rig.root.getAbsolutePosition().y,
    };
  });
  console.log('guard', JSON.stringify(s));
  assert(s.mixamo, 'the chamber guard has a Mixamo body');
  assert(s.ready && !s.failed && s.model === 'swat', 'it loaded the Swat');
  assert(!s.merged, 'the merged body is hidden');
  assert(s.eyeToHead < 0.12, `his head node (eye) rides on the Swat head (${s.eyeToHead.toFixed(3)} m)`);
  assert(s.headY > 1.3 && s.headY < 1.95, `the Swat stands at guard height (head ${s.headY.toFixed(2)} m)`);
  assert(s.best !== '', `he plays a Mixamo move (${s.best})`);
  await shot('g1-guard');
  // (walk-test fix B2) killed: the Swat stays and lies with the ragdoll (its bones follow the rig's joints)
  await G(() => {
    const e = window.__app.current.enemyMgr.enemies[0];
    const V = e.rig.root.position.constructor;
    e.killOutright({ amount: 999, point: e.rig.headNode.getAbsolutePosition().clone(), dir: new V(0, 0, 1), part: 'body' });
  });
  await frames(page, 30);
  await shot('g2-falling');
  await frames(page, 240);
  // the Swat's joints against the rig's (m), its head over the lie's pelvis (m), the merged body hidden
  const fit = (b) => {
    const m = b.gbody?.mixamo, r = b.view;
    if (!m || !r) return null;
    const gap = (bone, node) => { const a = m.boneNode(bone).getAbsolutePosition(), c = node.getAbsolutePosition(); return Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z); };
    return {
      leading: m.leading, shown: m.root.isEnabled(), merged: r.renderMeshes.some((x) => x.isEnabled()),
      hips: gap('Hips', r.hips), head: gap('Head', r.headNode), handL: gap('LeftHand', r.wristL), footR: gap('RightFoot', r.ankleR),
      headUp: m.boneNode('Head').getAbsolutePosition().y - b.pos.y,
    };
  };
  const d = await G((fs) => {
    const b = (window.__app.current.enemyMgr.bodies ?? [])[0];
    return b ? eval(fs)(b) : null;
  }, `(${fit})`);
  console.log('down', JSON.stringify(d));
  await shot('g2-down');
  assert(d && d.leading && d.shown && !d.merged, `the dead guard keeps the Swat body, posed by his rig (${JSON.stringify(d)})`);
  assert(d.hips < 0.15 && d.head < 0.25, `the Swat lies with the ragdoll (hips ${d.hips.toFixed(2)}, head ${d.head.toFixed(2)} m off)`);
  assert(d.handL < 0.3 && d.footR < 0.3, `its limbs follow the ragdoll's (hand ${d.handL.toFixed(2)}, foot ${d.footR.toFixed(2)} m off)`);
  assert(Math.abs(d.headUp) < 0.6, `lying, not standing (head ${d.headUp.toFixed(2)} m over the pelvis)`);
  // picked up: the carried body's fresh rig gets a Swat posed by the rig from the start
  await G(() => {
    const g = window.__app.current;
    g.enemyMgr.bodies[0].pickUp(g.player.rig.torso, 0.18, 0.12);
  });
  await page.waitForFunction(() => { const m = window.__app.current.enemyMgr.bodies[0]?.gbody?.mixamo; return !!m && (m.ready || m.failed); }, null, { timeout: 30000 });
  await frames(page, 30);
  const c = await G((fs) => eval(fs)(window.__app.current.enemyMgr.bodies[0]), `(${fit})`);
  console.log('carried', JSON.stringify(c));
  await shot('g3-carried');
  assert(c && c.leading && c.shown && !c.merged, `the carried body is the Swat (${JSON.stringify(c)})`);
  assert(c.hips < 0.15 && c.head < 0.25, `the carried Swat lies over the shoulder with the rig (hips ${c.hips.toFixed(2)}, head ${c.head.toFixed(2)} m off)`);
  if (errors.length) console.log('console errors:\n  ' + errors.join('\n  '));
  assert(errors.length === 0, `${errors.length} console errors`);
} catch (e) {
  failed = true;
  console.error('FAIL', e.message);
}
await browser.close();
console.log(failed ? 'e2e-mixamo-guards: FAIL' : 'e2e-mixamo-guards: PASS');
process.exit(failed ? 1 : 0);
