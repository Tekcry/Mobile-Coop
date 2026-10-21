import { it } from 'vitest';
import { drawHarness } from './helpers/drawHarness';
import { DRAW_CUR, drawPath } from '../src/anim/drawMotion';
it.skipIf(!process.env.N3_DBG)('dbg', async () => {
  const h = await drawHarness();
  h.run(40);
  h.tap('draw');
  h.run(70);
  h.tap('swapNext');
  for (let i = 0; i < 56; i++) {
    const s = h.step();
    const pv = h.rig.weaponPivot.getAbsolutePosition();
    const u = (s.swap - 0.38) / 0.62;
    const w = h.rig.wristR.getAbsolutePosition();
    if (i >= 36 && i <= 50) console.log(i, s.gun, s.swap.toFixed(3), u.toFixed(3), drawPath(u, DRAW_CUR.pistol).toFixed(3), 'piv', pv.x.toFixed(3), pv.y.toFixed(3), pv.z.toFixed(3), 'grip', s.gx.toFixed(3), s.gy.toFixed(3), s.gz.toFixed(3), 'wr', w.x.toFixed(3), w.y.toFixed(3), w.z.toFixed(3), h.rig.gunPush.toFixed(3));
  }
  h.dispose();
});
