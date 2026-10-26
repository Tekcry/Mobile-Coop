/**
 * (guard-ai seed-random, hard rule 8) The seeded draws that replaced the last `Math.random` in `src/ai`: `seeded01`
 * (radio delays, a drone's start angle) and the per-guard perception stream (`Enemy.senseRng`: the think cadence).
 * Pure: the same keys give the same draw, the streams are apart, and `Math.random` is never called.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { combatSeed, Rng, SEED_DRONE, SEED_RADIO, SEED_SENSE, seeded01 } from '../src/ai/squadRoles';
import { bytesPerCall, inputs, sink } from './helpers/allocPerCall';

const SEED = 0x5eed;

afterEach(() => vi.restoreAllMocks());

describe('seeded01', () => {
  it('is in [0, 1) and the same for the same keys', () => {
    for (let k = 0; k < 200; k++) {
      const v = seeded01(SEED, SEED_RADIO, k);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(seeded01(SEED, SEED_RADIO, k)).toBe(v);
    }
  });

  it('differs across the three streams and across neighbouring keys (1000 keys: no two equal, mean 0.45-0.55)', () => {
    for (const s of [SEED_SENSE, SEED_RADIO, SEED_DRONE]) {
      const seen = new Set<number>();
      let sum = 0;
      for (let k = 0; k < 1000; k++) {
        const v = seeded01(SEED, s, k);
        seen.add(v);
        sum += v;
      }
      expect(seen.size).toBe(1000);
      expect(sum / 1000).toBeGreaterThan(0.45);
      expect(sum / 1000).toBeLessThan(0.55);
    }
    for (let k = 0; k < 100; k++) {
      const a = seeded01(SEED, SEED_SENSE, k);
      const b = seeded01(SEED, SEED_RADIO, k);
      const c = seeded01(SEED, SEED_DRONE, k);
      expect(a === b || b === c || a === c).toBe(false);
    }
  });

  it('the salts are distinct negatives (a real engagement id counts up from 0)', () => {
    const salts = [SEED_SENSE, SEED_RADIO, SEED_DRONE];
    for (const s of salts) expect(s).toBeLessThan(0);
    expect(new Set(salts).size).toBe(3);
  });
});

describe('the seeded paths never call Math.random', () => {
  it('seeded01 and a perception stream: no Math.random, same seed same sequence, cadence in [0.22, 0.30)', () => {
    const spy = vi.spyOn(Math, 'random');
    seeded01(SEED, SEED_RADIO, 3);
    seeded01(SEED, SEED_DRONE, 3);
    const a = new Rng(combatSeed(SEED, SEED_SENSE, 7));
    const b = new Rng(combatSeed(SEED, SEED_SENSE, 7));
    for (let i = 0; i < 100; i++) {
      const x = a.next();
      expect(b.next()).toBe(x);
      const think = 0.22 + x * 0.08;
      expect(think).toBeGreaterThanOrEqual(0.22);
      expect(think).toBeLessThan(0.3);
    }
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('seeded01 allocates nothing', () => {
  it('1000 calls: no bytes per call', async () => {
    const keys = inputs(1000, (k) => k);
    const per = await bytesPerCall(
      (m) => {
        for (let k = 0; k < m; k++) sink[0]! += seeded01(SEED, SEED_RADIO, keys[k]!);
      },
      16,
      { n: 1000 },
    );
    expect(per).toBeLessThan(64);
  });
});
