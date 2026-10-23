import { it } from 'vitest';
import { slabRoom, wallRoom } from './helpers/bounceRoom';

it('scratch: sweep', () => {
  const out: string[] = [];
  let worst = 0;
  for (let k = 0; k < 20; k++) {
    const wx = 10 + k * 0.05;
    for (const d of [1, 2]) {
      const { field: f } = wallRoom(wx, d);
      let m = 0;
      for (const t of [0.1, 0.15, 0.3, 0.5, 1]) for (let z = 0.5; z < 10; z += 0.5) for (let y = 0.25; y <= 2.751; y += 0.25) m = Math.max(m, f.bounceAt(wx + 0.2 + t, y, z));
      let lit = 9;
      for (let y = 0.25; y <= 2.501; y += 0.25) lit = Math.min(lit, f.bounceAt(wx - 0.25, y, 5));
      worst = Math.max(worst, m);
      out.push(`wx ${wx.toFixed(2)} d ${d}: behind max ${m.toFixed(3)} lit-face min ${lit.toFixed(3)}`);
    }
  }
  for (let k = 0; k < 20; k++) {
    const sy = 3 + k * 0.05;
    const { field: f } = slabRoom(sy, 3);
    let m = 0;
    for (const t of [0.1, 0.15, 0.3, 0.5]) for (let z = 0.5; z < 10; z += 0.5) for (let x = 0.5; x < 10; x += 0.5) m = Math.max(m, f.bounceAt(x, sy + 0.2 + t, z));
    out.push(`slab ${sy.toFixed(2)}: above max ${m.toFixed(3)} ceiling ${f.bounceAt(5, sy - 0.25, 5).toFixed(3)}`);
  }
  console.info(out.join('\n') + `\nworst ${worst}`);
}, 300_000);
