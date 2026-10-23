import { describe, expect, it } from 'vitest';
import { atlasSize, CHAR_SHADOW, CHAR_SHADOW_PRESET, charShadowSpec, coneCovers, FIT, fitCone, fittedSpheres, LampSlotPicker, spheresHold, tileX, tileY } from '../src/world/charShadowSet';
import { GRAPHICS_PRESETS, MIN_FEATURES, PRESET_IDS, qualityLevel } from '../src/core/quality';
import { bytesPerCall } from './helpers/allocPerCall';

/** Lamps as the picker reads them: x, y, z, radius. */
function lamps(...l: [number, number, number, number][]): Float32Array {
  const a = new Float32Array(l.length * 4);
  l.forEach((v, i) => a.set(v, i * 4));
  return a;
}
const allLit = (n: number): Uint8Array => new Uint8Array(n).fill(1);
const focusAt = (x: number, y: number, z: number): Float32Array => new Float32Array([x, y, z, x, y + 2, z - 3]);

describe('LR14 character shadow presets', () => {
  it('maps from High up, capsules at Low / Medium; the override wins', () => {
    expect(CHAR_SHADOW_PRESET.low.lamps).toBe(0);
    expect(CHAR_SHADOW_PRESET.medium.lamps).toBe(0);
    expect(CHAR_SHADOW_PRESET.high.lamps).toBeGreaterThanOrEqual(2);
    expect(CHAR_SHADOW_PRESET.epic.lamps).toBeLessThanOrEqual(CHAR_SHADOW.maxSlots);
    for (const id of PRESET_IDS) {
      const q = qualityLevel(id, GRAPHICS_PRESETS[id]);
      const on = id === 'high' || id === 'ultra' || id === 'epic';
      expect(q.shadow.charLamps > 0, id).toBe(on);
      expect(qualityLevel(id, GRAPHICS_PRESETS[id], false, 1, 0, 'off').shadow.charLamps, id).toBe(0);
      expect(qualityLevel(id, GRAPHICS_PRESETS[id], false, 1, 0, 'on').shadow.charLamps, id).toBeGreaterThan(0);
    }
    expect(charShadowSpec('low', 'on')).toEqual({ ...CHAR_SHADOW_PRESET.high });
    // the test path (`?gfx=min`) never takes them
    expect(qualityLevel('custom', MIN_FEATURES, true, 1, 0, 'on').shadow.charLamps).toBe(0);
  });

  it('atlas: 2 x 2 tiles, one per slot', () => {
    expect(atlasSize(512)).toBe(1024);
    const seen = new Set<string>();
    for (let s = 0; s < CHAR_SHADOW.maxSlots; s++) {
      expect(tileX(s, 512) + 512).toBeLessThanOrEqual(1024);
      expect(tileY(s, 512) + 512).toBeLessThanOrEqual(1024);
      seen.add(`${tileX(s, 512)},${tileY(s, 512)}`);
    }
    expect(seen.size).toBe(CHAR_SHADOW.maxSlots);
  });
});

describe('LR14 lamp slot picker', () => {
  it('takes the nearest lit lamps in reach, keeps slots stable, lets a dark lamp go at once', () => {
    const L = lamps([0, 4, 0, 8], [6, 4, 0, 8], [30, 4, 0, 8], [3, 4, 3, 8]);
    const lit = allLit(4);
    const p = new LampSlotPicker();
    p.setSlots(2);
    p.update(L, lit, 4, focusAt(0, 0, 0), 2, 0.016);
    expect([...p.slotLamp.slice(0, 2)].sort()).toEqual([0, 3]);
    expect(p.slotOf(2)).toBe(-1);
    const s0 = p.slotOf(0);
    // a dark lamp leaves on the next frame, not at the next pick
    lit[0] = 0;
    p.update(L, lit, 4, focusAt(0, 0, 0), 2, 0.016);
    expect(p.slotOf(0)).toBe(-1);
    for (let i = 0; i < 20; i++) p.update(L, lit, 4, focusAt(0, 0, 0), 2, 0.016);
    expect(p.slotOf(1)).toBe(s0);
    expect(p.slotOf(3)).toBeGreaterThanOrEqual(0);
  });

  it('hysteresis: walking between two equal lamps does not flip the set every pick', () => {
    // three lamps in a row, two slots; the player sways around x = 6, where lamps 0 and 2 are equally far
    const L = lamps([0, 4, 0, 10], [6, 4, 0, 10], [12, 4, 0, 10]);
    const lit = allLit(3);
    const p = new LampSlotPicker();
    p.setSlots(2);
    let changes = 0;
    let v = p.version;
    for (let f = 0; f < 600; f++) {
      const x = 6 + Math.sin(f * 0.05) * 0.8;
      p.update(L, lit, 3, new Float32Array([x, 0, 0]), 1, 1 / 60);
      if (p.version !== v) changes++;
      v = p.version;
    }
    // (without the 25% margin the second slot flipped between lamps 0 and 2 at every crossing: about 9 here)
    expect(changes).toBeLessThanOrEqual(2);
    // a real move does change it: walk to x = 14
    for (let f = 0; f < 120; f++) p.update(L, lit, 3, new Float32Array([14, 0, 0]), 1, 1 / 60);
    expect(p.slotOf(2)).toBeGreaterThanOrEqual(0);
    expect(p.slotOf(1)).toBeGreaterThanOrEqual(0);
  });

  it('a newcomer must be 25% nearer, and a held lamp keeps its slot 0.5 s at least', () => {
    const L = lamps([0, 3, 0, 12], [5, 3, 0, 12]);
    const lit = allLit(2);
    const p = new LampSlotPicker();
    p.setSlots(1);
    p.update(L, lit, 2, new Float32Array([1, 0, 0]), 1, 0.2);
    expect(p.slotLamp[0]).toBe(0);
    for (let i = 0; i < 10; i++) p.update(L, lit, 2, new Float32Array([2.6, 0, 0]), 1, 0.2);
    // (2.6: lamp 1 is slightly nearer, inside the margin)
    expect(p.slotLamp[0]).toBe(0);
    // far past the margin it moves (after the hold)
    for (let i = 0; i < 10; i++) p.update(L, lit, 2, new Float32Array([5, 0, 0]), 1, 0.2);
    expect(p.slotLamp[0]).toBe(1);
    // and right after a take, a better lamp waits for the hold
    const q = new LampSlotPicker();
    q.setSlots(1);
    q.update(L, lit, 2, new Float32Array([1, 0, 0]), 1, 0.6);
    for (let i = 0; i < 10 && q.slotLamp[0] !== 1; i++) q.update(L, lit, 2, new Float32Array([5, 0, 0]), 1, 0.6);
    expect(q.slotLamp[0]).toBe(1);
    const before = q.version;
    q.update(L, lit, 2, new Float32Array([0, 0, 0]), 1, 0.11);
    expect(q.slotLamp[0]).toBe(1);
    expect(q.version).toBe(before);
  });

  it('out of reach: no slot; fewer slots release the extra lamps', () => {
    const L = lamps([0, 4, 0, 5], [40, 4, 0, 5]);
    const p = new LampSlotPicker();
    p.setSlots(4);
    p.update(L, allLit(2), 2, new Float32Array([0, 0, 0]), 1, 0.2);
    expect(p.slotOf(0)).toBeGreaterThanOrEqual(0);
    expect(p.slotOf(1)).toBe(-1);
    p.setSlots(0);
    expect(p.slotOf(0)).toBe(-1);
  });

  it('far slots refresh every 2nd frame, scaled by the governor', () => {
    const L = lamps([0, 4, 0, 20], [12, 4, 0, 20]);
    const p = new LampSlotPicker();
    p.setSlots(2);
    p.update(L, allLit(2), 2, new Float32Array([0, 0, 0]), 1, 0.2);
    expect(p.refreshEvery(p.slotOf(0))).toBe(1);
    expect(p.refreshEvery(p.slotOf(1))).toBe(2);
    expect(p.refreshEvery(p.slotOf(1), 2)).toBe(4);
  });

  it('allocation-free per frame (picker update and cone fit)', async () => {
    const n = 60;
    const L = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) L.set([(i % 10) * 4, 4, Math.floor(i / 10) * 4, 7], i * 4);
    const lit = allLit(n);
    const p = new LampSlotPicker();
    p.setSlots(4);
    const focus = new Float32Array(6);
    const sph = new Float32Array(40 * 4);
    for (let c = 0; c < 40; c++) sph.set([(c % 8) * 0.7, 1, Math.floor(c / 8) * 0.6, 0.3], c * 4);
    const out = new Float32Array(FIT.size);
    const bytes = await bytesPerCall((k) => {
      for (let i = 0; i < k; i++) {
        focus[0] = (i % 37) * 0.9;
        focus[2] = (i % 23) * 0.9;
        p.update(L, lit, n, focus, 2, 0.05);
        fitCone(10, 4, 10, sph, 40, out);
      }
    }, 16, { n: 2000 });
    // (no object, closure or vector: at most one boxed double a call; a {x, y, z} reads 48-64 B)
    expect(bytes).toBeLessThanOrEqual(16);
  });
});

describe('LR14 cone fit', () => {
  it('covers every caster sphere, points at them, near plane in front of the nearest', () => {
    const sph = new Float32Array([2, 0, 0, 0.3, -1, 0, 1, 0.3, 0.5, 0.5, -2, 0.4]);
    const out = new Float32Array(FIT.size);
    expect(fitCone(0, 4, 0, sph, 3, out)).toBe(true);
    expect(out[FIT.dy]!).toBeLessThan(-0.8);
    expect(out[FIT.partial]).toBe(0);
    for (let c = 0; c < 3; c++) expect(coneCovers(out, 0, 4, 0, sph[c * 4]!, sph[c * 4 + 1]!, sph[c * 4 + 2]!, sph[c * 4 + 3]!)).toBe(true);
    // something off to the side is not covered
    expect(coneCovers(out, 0, 4, 0, 6, 4, 0, 0.3)).toBe(false);
    expect(out[FIT.near]!).toBeGreaterThanOrEqual(CHAR_SHADOW.minNear);
    expect(out[FIT.near]!).toBeLessThan(3.5);
  });

  it('casters on both sides of a wall lamp: a partial fit, capped', () => {
    const sph = new Float32Array([4, 1.5, 0, 0.4, -4, 1.5, 0, 0.4]);
    const out = new Float32Array(FIT.size);
    expect(fitCone(0, 2.5, 0, sph, 2, out)).toBe(true);
    expect(out[FIT.partial]).toBe(1);
    expect(out[FIT.half]).toBe(CHAR_SHADOW.maxHalf);
  });

  it('nothing to fit: no casters, or the lamp inside the caster', () => {
    const out = new Float32Array(FIT.size);
    expect(fitCone(0, 0, 0, new Float32Array(0), 0, out)).toBe(false);
    expect(fitCone(0, 1, 0, new Float32Array([0, 1, 0, 0.5]), 1, out)).toBe(false);
  });

  it('(lrpolish) a capsule is dropped only for a caster the map was fitted around', async () => {
    // lamp at (0, 3, 0); caster A 2 m out (fitted), caster B with the lamp inside its sphere (skipped by fitCone)
    const src = new Float32Array([2, 1, 0, 0.9, 0.2, 2.6, 0, 0.9]);
    const dst = new Float32Array(8);
    const k = fittedSpheres(0, 3, 0, src, 2, dst);
    expect(k).toBe(1);
    expect(spheresHold(dst, k, 2, 0.9, 0)).toBe(true);
    // B's capsule stays (polish 4); a caster never listed - past MAX_SPHERES, or newly in reach - stays too (5, 6)
    expect(spheresHold(dst, k, 0.2, 2.5, 0)).toBe(false);
    expect(spheresHold(dst, k, -3, 1, 0)).toBe(false);
    // nothing copied yet: nothing held
    expect(spheresHold(dst, 0, 2, 0.9, 0)).toBe(false);
    const bytes = await bytesPerCall((m) => {
      for (let i = 0; i < m; i++) {
        fittedSpheres(0, 3, 0, src, 2, dst);
        spheresHold(dst, 1, 2, 0.9, 0);
      }
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });
});
