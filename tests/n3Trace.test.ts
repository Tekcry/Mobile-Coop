// TEMPORARY (N3 investigation): writes velocity traces of the draw chain to N3_TRACE_OUT.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { drawHarness, speeds, type DrawSample } from './helpers/drawHarness';

const OUT = process.env.N3_TRACE_OUT;

it.skipIf(!OUT)('n3 trace', async () => {
  const lines: string[] = [];
  const dump = (name: string, s: DrawSample[]) => {
    const vw = speeds(s, 'w');
    const vg = speeds(s, 'g');
    const vm = speeds(s, 'm');
    lines.push(`## ${name}`);
    lines.push('ms\tstate\tph\tswap\tswapW\twpPitch\tspYaw\traise\twrist\tgrip\tmuzzle');
    for (let i = 1; i < s.length; i++) {
      const x = s[i]!;
      lines.push(`${Math.round((i) * 1000 / 60)}\t${x.state}\t${x.phase}\t${x.swap.toFixed(3)}\t${x.swapW.toFixed(2)}\t${x.wpPitch.toFixed(3)}\t${x.spYaw.toFixed(3)}\t${x.raise.toFixed(3)}\t${vw[i - 1]!.toFixed(3)}\t${vg[i - 1]!.toFixed(3)}\t${vm[i - 1]!.toFixed(3)}`);
    }
  };
  const scen: [string, (h: Awaited<ReturnType<typeof drawHarness>>) => DrawSample[]][] = [
    ['drawRifleX', (h) => { h.tap('draw'); return h.run(70); }],
    ['drawRifleLT', (h) => { h.hold('ads', true); return h.run(80); }],
    ['holsterRifle', (h) => { h.tap('draw'); h.run(70); h.tap('draw'); return h.run(50); }],
    ['readyToAimRifle', (h) => { h.tap('draw'); h.run(70); h.hold('ads', true); return h.run(50); }],
    ['drawPistolX', (h) => { h.tap('swapNext'); h.run(30); h.tap('draw'); return h.run(70); }],
    ['drawPistolLT', (h) => { h.tap('swapNext'); h.run(30); h.hold('ads', true); return h.run(80); }],
    ['holsterPistol', (h) => { h.tap('swapNext'); h.run(30); h.tap('draw'); h.run(70); h.tap('draw'); return h.run(50); }],
    ['swapRifleToPistol', (h) => { h.tap('draw'); h.run(70); h.tap('swapNext'); return h.run(80); }],
    ['swapPistolToRifle', (h) => { h.tap('swapNext'); h.run(30); h.tap('draw'); h.run(70); h.tap('swapNext'); return h.run(80); }],
  ];
  for (const [name, fn] of scen) {
    const h = await drawHarness();
    h.run(40);
    const pre = h.run(1);
    const s = fn(h);
    dump(name, [...pre, ...s]);
    h.dispose();
  }
  writeFileSync(OUT!, lines.join('\n'));
});
