import { describe, expect, it } from 'vitest';
import { animTuneAllowed } from '../src/ui/tunerGate';
import { MAPS, DEV_MAPS, getMap } from '../src/world/maps';
import { STUDIO_MAP_ID } from '../src/anim/studio';
import { STUDIO_MAP_ID as TINY_ID } from '../src/anim/studioMapId';
import { LevelBuilder } from '../src/world/levelBuilder';
import { studio } from '../src/world/maps/studio';

/** (G1) The Test Chamber: the animation tuner opens there only; the map is a dev scene with a spot for each of two players. */
describe('Test Chamber: the animation tuner gate', () => {
  it('opens on the studio map only', () => {
    expect(animTuneAllowed('studio')).toBe(true);
    expect(animTuneAllowed(STUDIO_MAP_ID)).toBe(true);
  });

  it('is shut on every playable map, in a menu (no map) and on an unknown id', () => {
    for (const m of MAPS) expect(animTuneAllowed(m.id)).toBe(false);
    expect(animTuneAllowed(undefined)).toBe(false);
    expect(animTuneAllowed(null)).toBe(false);
    expect(animTuneAllowed('')).toBe(false);
    expect(animTuneAllowed('Studio')).toBe(false);
    expect(animTuneAllowed('proving')).toBe(false);
  });

  it('the studio id is one constant, kept as the internal id (scripts, saves and ?autostart=studio use it)', () => {
    expect(TINY_ID).toBe('studio');
    expect(STUDIO_MAP_ID).toBe(TINY_ID);
  });
});

describe('Test Chamber: the map', () => {
  it('is named Test Chamber, keeps the id studio, and stays out of MAPS (in DEV_MAPS; getMap finds it)', () => {
    expect(studio.id).toBe('studio');
    expect(studio.name).toBe('Test Chamber');
    expect(studio.description).not.toMatch(/anim studio/i);
    expect(MAPS.some((m) => m.id === 'studio')).toBe(false);
    expect(DEV_MAPS).toContain(studio);
    expect(getMap('studio')).toBe(studio);
  });

  it('has a spawn for each of the two players: 2 m apart, clear of every solid prop', () => {
    const b = new LevelBuilder();
    const lay = studio.build(b, 0);
    expect(lay.playerSpawns).toHaveLength(2);
    const [a, p] = lay.playerSpawns;
    expect(Math.hypot(p!.pos.x - a!.pos.x, p!.pos.z - a!.pos.z)).toBeCloseTo(2, 6);
    expect(p!.pos.y).toBe(a!.pos.y);
    for (const s of lay.playerSpawns) {
      // a solid box standing on the floor (not the roof slab) within 1 m of the spot (footprint grown by 1 m) would crowd the player
      const crowded = b.boxes.some((x) => x.collide && x.c[1] + x.s[1] / 2 > 0.3 && x.c[1] - x.s[1] / 2 < 2 && Math.abs(s.pos.x - x.c[0]) < x.s[0] / 2 + 1 && Math.abs(s.pos.z - x.c[2]) < x.s[2] / 2 + 1);
      expect(crowded).toBe(false);
    }
  });
});
