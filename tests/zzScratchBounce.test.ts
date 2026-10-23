import { it } from 'vitest';
import { slabRoom, wallRoom } from './helpers/bounceRoom';

it('scratch: wall and slab numbers', () => {
  const out: string[] = [];
  for (const off of [0.15, 0.4, 0.65, 0.9]) {
    const wx = 10 + off;
    for (const d of [1, 2]) {
      const { field: f } = wallRoom(wx, d);
      const behind = [0.15, 0.3, 0.5].map((t) => {
        let m = 0;
        for (let z = 0.5; z < 10; z += 0.5) for (let y = 0.25; y <= 1.501; y += 0.25) m = Math.max(m, f.bounceAt(wx + 0.2 + t, y, z));
        return m;
      });
      let lit = 0;
      let litMin = 9;
      for (let y = 0.25; y <= 2.501; y += 0.25) { const v = f.bounceAt(wx - 0.25, y, 5); lit += v; litMin = Math.min(litMin, v); }
      lit /= 9;
      const g = f.bounce;
      const ci = Math.floor(wx + 0.1 - g.origin[0]) + g.n[0] * (Math.floor(1.5 - g.origin[1]) + g.n[1] * Math.floor(5 - g.origin[2]));
      out.push(`wall ${wx.toFixed(2)}-${(wx + 0.2).toFixed(2)} lamp ${d} m: straddle ${(g.g[ci]! / 255).toFixed(3)} behind ${behind.map((v) => v.toFixed(3)).join(' / ')} | lit face y1.5 ${f.bounceAt(wx - 0.25, 1.5, 5).toFixed(3)} mean(0.25-2.5) ${lit.toFixed(3)} min ${litMin.toFixed(3)} total y1.5 ${f.levelAt(wx - 0.25, 1.5, 5).toFixed(3)}`);
    }
  }
  for (const off of [0.15, 0.4, 0.65, 0.9]) {
    const sy = 3 + off;
    const { field: f } = slabRoom(sy);
    const above = [0.15, 0.3, 0.5].map((t) => {
      let m = 0;
      for (let z = 0.5; z < 10; z += 0.5) for (let x = 0.5; x < 10; x += 0.5) m = Math.max(m, f.bounceAt(x, sy + 0.2 + t, z));
      return m;
    });
    out.push(`slab ${sy.toFixed(2)}-${(sy + 0.2).toFixed(2)}: above ${above.map((v) => v.toFixed(3)).join(' / ')} | ceiling under (0.25) ${f.bounceAt(5, sy - 0.25, 5).toFixed(3)} floor ${f.levelAt(5, 0.25, 5).toFixed(3)}`);
  }
  console.info(out.join('\n'));
}, 300_000);
