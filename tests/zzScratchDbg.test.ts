import { it } from 'vitest';
import { wallRoom } from './helpers/bounceRoom';

it('scratch: dbg', () => {
  const out: string[] = [];
  const wx = 10.8;
  const { field: f } = wallRoom(wx, 1);
  const g = f.bounce;
  for (let y = 0.25; y <= 2.501; y += 0.25) out.push(`y ${y}: ${f.bounceAt(wx - 0.25, y, 5).toFixed(3)}`);
  for (const cx of [9, 10, 11]) for (const cy of [0, 1, 2]) {
    const i = cx - g.origin[0] + g.n[0] * (cy - g.origin[1] + g.n[1] * (5 - g.origin[2]));
    const e = g.bits[i]!;
    out.push(`  cell x ${cx} y${cy} z5: g ${g.g[i]} edges ${e & 7} t+x ${(e >> 3) & 3} t-x ${(e >> 5) & 3} t+y ${(e >> 8) & 3} t-y ${(e >> 10) & 3} t+z ${(e >> 12) & 3} t-z ${(e >> 14) & 3}`);
  }
  console.info(out.join('\n'));
});
