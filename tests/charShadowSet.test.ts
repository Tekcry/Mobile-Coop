import { describe, expect, it } from 'vitest';
import { atlasSize, CHAR_SHADOW, CHAR_SHADOW_DISK, CHAR_SHADOW_EVERY, CHAR_SHADOW_KERNEL, CHAR_SHADOW_PRESET, CHAR_SHADOW_TAPS, charFilterTexels, charPenumbra, charShadowEvery, charShadowSpec, charShadowTaps, casterInReach, coneCovers, doorSphere, FIT, fitCone, fittedSpheres, LampSlotPicker, spheresHold, tileX, tileY } from '../src/world/charShadowSet';
import { CHAR_SHADOW_GLSL } from '../src/world/charShadows';
import { GRAPHICS_PRESETS, MIN_FEATURES, PRESET_IDS, qualityLevel, shadowSpec } from '../src/core/quality';
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
  it('maps on every preset (LR16-7: Low / Medium one slot), none with shadows off; the override wins', () => {
    expect(CHAR_SHADOW_PRESET.low).toEqual({ lamps: 1, tile: 256 });
    expect(CHAR_SHADOW_PRESET.medium).toEqual({ lamps: 1, tile: 512 });
    expect(CHAR_SHADOW_PRESET.off.lamps).toBe(0);
    expect(CHAR_SHADOW_PRESET.high.lamps).toBeGreaterThanOrEqual(2);
    expect(CHAR_SHADOW_PRESET.epic.lamps).toBeLessThanOrEqual(CHAR_SHADOW.maxSlots);
    for (const id of PRESET_IDS) {
      const q = qualityLevel(id, GRAPHICS_PRESETS[id]);
      expect(q.shadow.charLamps > 0, id).toBe(true);
      expect(qualityLevel(id, GRAPHICS_PRESETS[id], false, 1, 0, 'off').shadow.charLamps, id).toBe(0);
      expect(qualityLevel(id, GRAPHICS_PRESETS[id], false, 1, 0, 'on').shadow.charLamps, id).toBeGreaterThan(0);
    }
    expect(charShadowSpec('low', 'on')).toEqual({ ...CHAR_SHADOW_PRESET.low });
    expect(charShadowSpec('off', 'on')).toEqual({ ...CHAR_SHADOW_PRESET.high });
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

describe('LR16f character shadow softness (contact hardening)', () => {
  it('the kernel is fixed, in the unit disc, and every prefix the shader takes is spread', () => {
    expect(CHAR_SHADOW_DISK.length).toBe(CHAR_SHADOW_KERNEL * 2);
    for (let i = 0; i < CHAR_SHADOW_KERNEL; i++) expect(Math.hypot(CHAR_SHADOW_DISK[i * 2]!, CHAR_SHADOW_DISK[i * 2 + 1]!)).toBeLessThanOrEqual(1);
    // each count the shader reads (blocker search = half, filter = the tier's): no two taps bunched together
    for (const n of [4, 6, 8, 12, 16]) {
      let min = Infinity;
      let cx = 0;
      let cy = 0;
      for (let i = 0; i < n; i++) {
        cx += CHAR_SHADOW_DISK[i * 2]! / n;
        cy += CHAR_SHADOW_DISK[i * 2 + 1]! / n;
        for (let j = 0; j < i; j++) min = Math.min(min, Math.hypot(CHAR_SHADOW_DISK[i * 2]! - CHAR_SHADOW_DISK[j * 2]!, CHAR_SHADOW_DISK[i * 2 + 1]! - CHAR_SHADOW_DISK[j * 2 + 1]!));
      }
      expect(min, `prefix ${n}`).toBeGreaterThan(1.4 / Math.sqrt(n));
      expect(Math.hypot(cx, cy), `prefix ${n} centroid`).toBeLessThan(0.35);
    }
    // the shader embeds exactly these taps: no per-frame jitter (no time / frame / random input)
    expect(CHAR_SHADOW_GLSL).toContain(`vec2(${CHAR_SHADOW_DISK[0]!.toFixed(4)}, ${CHAR_SHADOW_DISK[1]!.toFixed(4)})`);
    expect(CHAR_SHADOW_GLSL).toContain(`const vec2 CS_DISK[${CHAR_SHADOW_KERNEL}]`);
    expect(CHAR_SHADOW_GLSL).not.toMatch(/time|frame|rand|noise/i);
  });

  it('the penumbra is 0 at contact, grows with the receiver-blocker gap, and is capped', () => {
    expect(charPenumbra(3, 3)).toBe(0);
    expect(charPenumbra(3, 3.2)).toBe(0);
    let prev = -1;
    // receiver on the floor 4 m from the lamp, the blocker moving up from the feet (4 m) to near the lamp
    for (let db = 4; db >= 0.5; db -= 0.1) {
      const p = charPenumbra(4, db);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    expect(prev).toBe(CHAR_SHADOW.maxPenumbra);
    // feet (gap ~0.05 m) sharp, the head (gap ~1.7 m, 2.3 m from the lamp) soft
    expect(charPenumbra(4, 3.95)).toBeLessThan(0.005);
    expect(charPenumbra(4, 2.3)).toBeGreaterThan(0.05);
    // in texels: the floor at contact, wider with the gap, never past the cap
    const sx = 1 / Math.tan(0.6);
    expect(charFilterTexels(charPenumbra(4, 3.95), 4, sx, 1024)).toBe(CHAR_SHADOW.minTexels);
    expect(charFilterTexels(charPenumbra(4, 2.3), 4, sx, 1024)).toBeGreaterThan(5);
    expect(charFilterTexels(10, 4, sx, 1024)).toBe(CHAR_SHADOW.maxTexels);
    let t = 0;
    for (let db = 4; db >= 0.5; db -= 0.25) {
      const v = charFilterTexels(charPenumbra(4, db), 4, sx, 1024);
      expect(v).toBeGreaterThanOrEqual(t);
      t = v;
    }
  });

  it('taps are gated by the preset (picture only): 4 / 4 / 8 / 12 / 16, none without maps', () => {
    expect(CHAR_SHADOW_TAPS).toEqual({ off: 0, low: 4, medium: 4, high: 8, ultra: 12, epic: 16 });
    for (const q of ['off', 'low', 'medium', 'high', 'ultra', 'epic'] as const) {
      const p = CHAR_SHADOW_PRESET[q];
      expect(charShadowTaps(p.lamps, p.tile), q).toBe(CHAR_SHADOW_TAPS[q]);
      expect(CHAR_SHADOW_TAPS[q]).toBeLessThanOrEqual(CHAR_SHADOW_KERNEL);
      expect(CHAR_SHADOW_TAPS[q] % 2, q).toBe(0);
    }
    // the override 'on' with shadows off takes High's maps and High's taps
    const forced = charShadowSpec('off', 'on');
    expect(charShadowTaps(forced.lamps, forced.tile)).toBe(CHAR_SHADOW_TAPS.high);
    expect(charShadowTaps(0, 0)).toBe(0);
  });

  it('the pure math is allocation-free', async () => {
    const bytes = await bytesPerCall((m) => {
      let s = 0;
      for (let i = 0; i < m; i++) s += charFilterTexels(charPenumbra(4, 2 + (i % 7) * 0.1), 4, 1.5, 1024) + charShadowTaps(3, 1024);
      return s;
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });
});

describe('LR16-7 character shadows on every tier', () => {
  it('Low / Medium: one slot, the nearest lamp, every 2nd frame; High up unchanged', () => {
    for (const q of ['off', 'low', 'medium', 'high', 'ultra', 'epic'] as const) {
      const p = CHAR_SHADOW_PRESET[q];
      expect(charShadowEvery(p.lamps, p.tile), q).toBe(p.lamps > 0 ? CHAR_SHADOW_EVERY[q] : 1);
    }
    expect(CHAR_SHADOW_EVERY.low).toBe(2);
    expect(CHAR_SHADOW_EVERY.medium).toBe(2);
    // the one slot takes the nearest lit lamp in reach
    const L = lamps([6, 4, 0, 8], [1, 4, 0, 8], [3, 4, 0, 8]);
    const p = new LampSlotPicker();
    p.setSlots(CHAR_SHADOW_PRESET.medium.lamps);
    p.update(L, allLit(3), 3, focusAt(0, 0, 0), 2, 0.2);
    expect(p.slotLamp[0]).toBe(1);
    expect(p.slotOf(0)).toBe(-1);
    expect(p.slotOf(2)).toBe(-1);
    const base = charShadowEvery(CHAR_SHADOW_PRESET.medium.lamps, CHAR_SHADOW_PRESET.medium.tile);
    expect(p.refreshEvery(0, 1, base)).toBe(2);
    expect(p.refreshEvery(0, 2, base)).toBe(4);
    // High's near slot still refreshes every frame
    expect(p.refreshEvery(0, 1, charShadowEvery(CHAR_SHADOW_PRESET.high.lamps, CHAR_SHADOW_PRESET.high.tile))).toBe(1);
  });

  it('one slot: the atlas is the one tile (slot 0 at the origin); 2+ slots keep the 2 x 2 layout', () => {
    expect(atlasSize(256, 1)).toBe(256);
    expect(atlasSize(512, 1)).toBe(512);
    expect(atlasSize(512, 2)).toBe(1024);
    expect(atlasSize(1024)).toBe(2048);
    expect(tileX(0, 256)).toBe(0);
    expect(tileY(0, 256)).toBe(0);
  });

  it('textures: a tier with maps takes no more lamp shadow samplers than Epic (the e2e-lightbake 16 check)', () => {
    // the atlas is one sampler on any tier with maps; the rest of the lamp-shadow pool is the rig's casters
    const epic = shadowSpec('epic');
    for (const q of ['low', 'medium', 'high', 'ultra', 'epic'] as const) {
      const s = shadowSpec(q);
      expect(s.charLamps, q).toBeGreaterThan(0);
      expect(s.casters, q).toBeLessThanOrEqual(epic.casters);
      expect(s.cascades, q).toBeLessThanOrEqual(epic.cascades);
    }
  });

  it('the tier lookups are allocation-free', async () => {
    const bytes = await bytesPerCall((m) => {
      let s = 0;
      for (let i = 0; i < m; i++) s += charShadowEvery(1, 256 << (i & 1)) + charShadowTaps(1, 512) + atlasSize(512, 1 + (i & 1));
      return s;
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });
});

describe('LR16-3 dynamic occluders in the character shadow casters', () => {
  it('a leaf or prop joins only within the lamp reach plus its own radius', () => {
    expect(casterInReach(0, 3, 0, 6, 5, 3, 0, 0.9)).toBe(true);
    expect(casterInReach(0, 3, 0, 6, 6.8, 3, 0, 0.9)).toBe(true);
    expect(casterInReach(0, 3, 0, 6, 7.0, 3, 0, 0.9)).toBe(false);
    expect(casterInReach(0, 3, 0, 6, 4, 8, 3, 0.9)).toBe(false);
  });
  it('the reach test is allocation-free', async () => {
    const bytes = await bytesPerCall((k) => (casterInReach(0, 3, 0, 6, k % 9, 3, 0, 0.9) ? 1 : 0), 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });
});

describe('LR16 fix: door / prop spheres in the slot cone fit (LR16-3)', () => {
  const door = { hinge: { x: 2, y: 0, z: -1 }, width: 1.2, height: 2.1 };
  it("a door's sphere holds its leaf at any swing", () => {
    const o = new Float32Array(4);
    doorSphere(door, o);
    for (let yaw = 0; yaw < Math.PI * 2; yaw += 0.7)
      for (let sw = 0; sw <= Math.PI; sw += 0.1)
        for (const t of [0, 0.5, 1])
          for (const y of [0, door.height]) {
            const x = door.hinge.x + Math.sin(yaw + sw) * door.width * t;
            const z = door.hinge.z + Math.cos(yaw + sw) * door.width * t;
            expect(Math.hypot(x - o[0]!, y - o[1]!, z - o[2]!)).toBeLessThanOrEqual(o[3]! + 1e-5);
          }
  });
  it('a leaf nearer the lamp than the guard: with its sphere in the fit the cone and near plane hold it', () => {
    // (lamp 3 m up at the origin; a guard 4 m off; an open leaf 1.5 m off on the other side)
    const sp = new Float32Array(16);
    sp.set([4, 1, 0, 0.6], 0);
    const d = new Float32Array(4);
    doorSphere({ hinge: { x: -1.5, y: 0, z: 0.5 }, width: 0.9, height: 2.1 }, d);
    const charOnly = new Float32Array(FIT.size);
    expect(fitCone(0, 3, 0, sp, 1, charOnly)).toBe(true);
    // (before: the guard's fit cut the leaf - outside the cone)
    expect(coneCovers(charOnly, 0, 3, 0, d[0]!, d[1]!, d[2]!, d[3]!)).toBe(false);
    sp.set(d, 4);
    const both = new Float32Array(FIT.size);
    expect(fitCone(0, 3, 0, sp, 2, both)).toBe(true);
    const dist = Math.hypot(d[0]!, d[1]! - 3, d[2]!);
    expect(both[FIT.near]!).toBeLessThan(dist - d[3]!);
    if (!both[FIT.partial]) expect(coneCovers(both, 0, 3, 0, d[0]!, d[1]!, d[2]!, d[3]!)).toBe(true);
    // (the guard stays covered)
    expect(coneCovers(both, 0, 3, 0, 4, 1, 0, 0.6)).toBe(true);
  });
  it('doorSphere is allocation-free', async () => {
    const o = new Float32Array(4);
    const bytes = await bytesPerCall((k) => {
      door.hinge.x = k % 7;
      doorSphere(door, o);
      return o[3]!;
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });
});
