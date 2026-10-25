/**
 * (map-ready S4) The campus lamps shipped pre-built (`world/shippedBake.ts`, `scripts/prebake/`; brief
 * `docs/map-ready/briefs/S4.md`).
 * - Keys (A16): the match seed leaves the lamp and moon keys (the same bytes for every seed); a moved lamp is a new key.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { LAMP_STRIDE } from '../src/voxel/lampBake';
import { bakedLights, bakeLevelLight, lampKeyOf, moonKeyOf } from '../src/world/lightBake';
import { campusOps } from '../src/world/maps/campusOps';
import { applyMapFlicker } from '../src/world/lampFlicker';
import { applyMapSway } from '../src/world/lampSway';
import { dressingOn } from '../src/world/detailPass';

/** A small room with two lamps (a fast bake). */
function room() {
  const b = new LevelBuilder();
  b.box(4, -0.1, 4, 8, 0.2, 8, '#888');
  b.box(-0.1, 1.5, 4, 0.2, 3, 8, '#888');
  b.box(8.1, 1.5, 4, 0.2, 3, 8, '#888');
  b.box(4, 1.5, -0.1, 8, 3, 0.2, '#888');
  b.box(4, 1.5, 8.1, 8, 3, 0.2, '#888');
  b.box(4, 0.5, 4, 1, 1, 1, '#888');
  for (const [x, z] of [[2, 2], [6, 5]] as const) b.lights.add({ x, y: 2.6, z, radius: 3, intensity: 1 });
  b.lights.ambient = 0.2;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'key-room', false);
  return { b, set };
}

/** campusOps' fixed lights as `World.create` builds them for `seed` (no Babylon: `prepare` is the light set's part). */
function campusKey(seed: number): string {
  const b = new LevelBuilder();
  campusOps.build(b, seed);
  applyMapFlicker(b.lights, 'campusOps', seed);
  applyMapSway(b, 'campusOps');
  const { light } = b.prepare('campusOps', { dressing: dressingOn(campusOps) });
  return lampKeyOf('campusOps', light.hash, bakedLights(b.lights).lights);
}

describe('shipped bake: keys (A16)', () => {
  it('two seeds of the same layout bake under one lamp key and one moon key', async () => {
    const keys: string[] = [];
    for (const seed of [1, 2]) {
      const { b, set } = room();
      const r = await bakeLevelLight({ mapId: 'key-room', seed, shapes: set.shapes, shapesHash: set.hash, lo: set.lo, hi: set.hi, reg: b.lights, sunDir: [0.3, -1, 0.2], moonLight: 0.1 });
      expect(r.source).toBe('baked');
      expect(r.lampKey).not.toContain(`:${seed}:`);
      keys.push(`${r.lampKey}|${r.moonKey}`);
    }
    expect(keys[0]).toBe(keys[1]);
  }, 120_000);

  it('a moved lamp gives a new lamp key; the moon key follows only the shapes and the direction', () => {
    const { b, set } = room();
    const L = bakedLights(b.lights).lights;
    const k0 = lampKeyOf('key-room', set.hash, L);
    const moved = L.slice();
    moved[LAMP_STRIDE] = moved[LAMP_STRIDE]! + 0.25;
    expect(lampKeyOf('key-room', set.hash, moved)).not.toBe(k0);
    expect(lampKeyOf('key-room', set.hash, L.slice())).toBe(k0);
    expect(lampKeyOf('other', set.hash, L)).not.toBe(k0);
    expect(moonKeyOf('key-room', set.hash, [0, 1, 0])).toBe(moonKeyOf('key-room', set.hash, [0, 1, 0]));
    expect(moonKeyOf('key-room', set.hash, [0, 1, 0])).not.toBe(moonKeyOf('key-room', set.hash, [0.1, 0.99, 0]));
  });

  it('a map without fixed lights has no lamp key and reads `none`', async () => {
    const b = new LevelBuilder();
    b.box(2, -0.1, 2, 4, 0.2, 4, '#888');
    b.lights.ambient = 0.3;
    const set = canonicalLightSet(b.boxes, b.cylinders, 'dark-room', false);
    const r = await bakeLevelLight({ mapId: 'dark-room', seed: 3, shapes: set.shapes, shapesHash: set.hash, lo: set.lo, hi: set.hi, reg: b.lights, sunDir: [0, -1, 0], moonLight: 0 });
    expect(r.lampKey).toBeNull();
    expect(r.source).toBe('none');
  }, 60_000);

  it('campusOps: a co-op match (any seed) and a solo restart (seed + 1) share the shipped lamp key', () => {
    expect(campusKey(2)).toBe(campusKey(1));
    expect(campusKey(987654)).toBe(campusKey(1));
  }, 120_000);
});
