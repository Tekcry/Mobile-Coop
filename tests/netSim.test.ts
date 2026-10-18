import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NETSIM_PRESETS, NetSim, netSimPreset } from '../src/net/netSim';

// locomotion step 20b (D11): the network conditions simulator of the ?net=local test transport
describe('NetSim', () => {
  it('typical is 80 ms RTT, 20 ms jitter, 1% loss; unknown names are off', () => {
    expect(netSimPreset('typical')).toEqual({ oneWayMs: 40, jitterMs: 20, loss: 0.01 });
    expect(netSimPreset(null)).toBeNull();
    expect(netSimPreset('')).toBeNull();
    expect(netSimPreset('toString')).toBeNull();
    expect(netSimPreset('bogus')).toBeNull();
  });

  it('is seeded and deterministic', () => {
    const a = new NetSim(NETSIM_PRESETS.typical!, 7);
    const b = new NetSim(NETSIM_PRESETS.typical!, 7);
    const c = new NetSim(NETSIM_PRESETS.typical!, 8);
    const ta = Array.from({ length: 50 }, (_, i) => a.deliverAt('p', i * 16));
    const tb = Array.from({ length: 50 }, (_, i) => b.deliverAt('p', i * 16));
    const tc = Array.from({ length: 50 }, (_, i) => c.deliverAt('p', i * 16));
    expect(ta).toEqual(tb);
    expect(ta).not.toEqual(tc);
  });

  it('delays within one-way +- jitter (plus one retransmit), keeps order per link, never drops', () => {
    const sim = new NetSim(NETSIM_PRESETS.typical!, 3);
    const n = 20000;
    let prev = -Infinity;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const now = i * 50; // one message per 50 ms: head-of-line blocking rarely adds
      const t = sim.deliverAt('host', now);
      expect(t).toBeGreaterThanOrEqual(prev);
      expect(t - now).toBeGreaterThanOrEqual(20);
      expect(t - now).toBeLessThanOrEqual(60 + 100);
      prev = t;
      sum += t - now;
    }
    expect(sim.stats.sent).toBe(n);
    const lossRate = sim.stats.retransmitted / n;
    expect(lossRate).toBeGreaterThan(0.006);
    expect(lossRate).toBeLessThan(0.014);
    expect(sum / n).toBeGreaterThan(39);
    expect(sum / n).toBeLessThan(43);
  });

  it('links are ordered independently', () => {
    const sim = new NetSim({ oneWayMs: 40, jitterMs: 0, loss: 1 }, 1);
    expect(sim.deliverAt('a', 0)).toBe(120);
    expect(sim.deliverAt('a', 1)).toBe(121);
    expect(sim.deliverAt('b', 1)).toBe(121);
    const slow = new NetSim({ oneWayMs: 40, jitterMs: 0, loss: 0 }, 1);
    slow.deliverAt('a', 100);
    expect(slow.deliverAt('a', 0)).toBe(140); // waits for the one before it
    expect(slow.deliverAt('b', 0)).toBe(40);
  });
});

describe('NetSim is unreachable from the shipped path', () => {
  const files = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p.replace(/\\/g, '/')] : [];
    });
  const src = files('src');
  const imports = (f: string, mod: string): boolean => new RegExp(`from\\s+['"][^'"]*\\b${mod}['"]|import\\(\\s*['"][^'"]*\\b${mod}['"]`).test(readFileSync(f, 'utf8'));

  it('only the local test transport imports netSim', () => {
    expect(src.filter((f) => imports(f, 'netSim'))).toEqual(['src/net/localTransport.ts']);
  });

  it('the WebRTC transport has no simulator code path', () => {
    const t = readFileSync('src/net/trysteroTransport.ts', 'utf8');
    expect(t).not.toMatch(/netSim|NetSim|netsim|localTransport/);
  });

  it('the local transport is reached only from coopUi (behind ?net=local), never from outside src/net', () => {
    expect(src.filter((f) => imports(f, 'localTransport'))).toEqual(['src/net/coopUi.ts']);
    expect(readFileSync('src/net/coopUi.ts', 'utf8')).toMatch(/flags\.net === 'local' \? createLocalTransport/);
  });
});
