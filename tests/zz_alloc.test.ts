import { it } from 'vitest';
import { FLICKER_STUTTER, FLICKER_FIRE, flickerValue, lampSeed } from '../src/world/lampFlicker';
import { LightRegistry } from '../src/world/lights';
import { bytesPerCall, inputs, sink } from './helpers/allocPerCall';
it('a', async () => {
  const T = inputs(2000, (k) => 100 + k / 60);
  const mk = (mode: number, n: number) => { const r = new LightRegistry(); for (let k = 0; k < n; k++) { r.add({ x: k, y: 3, z: 0 }); r.setFlicker(k, mode); } return r; };
  const r1 = mk(FLICKER_STUTTER, 1), r2 = mk(FLICKER_FIRE, 1), r3 = mk(FLICKER_STUTTER, 4);
  const A = await bytesPerCall((n) => { for (let i = 0; i < n; i++) r1.tickFlicker(T[i]!); }, 0);
  const B = await bytesPerCall((n) => { for (let i = 0; i < n; i++) r2.tickFlicker(T[i]!); }, 0);
  const C = await bytesPerCall((n) => { for (let i = 0; i < n; i++) r3.tickFlicker(T[i]!); }, 0);
  const D = await bytesPerCall((n) => { for (let i = 0; i < n; i++) sink[0] = flickerValue(FLICKER_FIRE, T[i]!, lampSeed(5, 3)); }, 0);
  console.info('stut1', A, 'fire1', B, 'stut4', C, 'fv', D);
});
