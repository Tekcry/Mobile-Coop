// TEMPORARY (N3): holstered local TRS after a holster
import { it } from 'vitest';
import { drawHarness } from './helpers/drawHarness';
it.skipIf(!process.env.N3_HOL)('hol', async () => {
  for (const pistol of [false, true]) {
    const h = await drawHarness();
    h.run(40);
    if (pistol) { h.tap('swapNext'); h.run(30); }
    h.tap('draw'); h.run(70); h.tap('draw'); h.run(120);
    const m = h.weapons.current.model;
    const p = m.node.position, q = m.node.rotationQuaternion!;
    console.log('HOL', pistol ? 'pistol' : 'rifle', m.slot, (m.node.parent as { name: string }).name, [p.x, p.y, p.z, q.x, q.y, q.z, q.w].map((v) => v.toFixed(6)).join(','));
    h.dispose();
  }
});
