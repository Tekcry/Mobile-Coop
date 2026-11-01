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

  it('(G2b) has five enemy spawns, two dummies and the props clear of every solid box, a nav seed on the ledge wall and tight cam spaces for the booth and the tunnel', () => {
    const b = new LevelBuilder();
    const lay = studio.build(b, 0);
    expect(lay.enemySpawns).toHaveLength(5);
    expect(lay.dummies).toHaveLength(2);
    expect(lay.dummies![1]!.strafe).toBeGreaterThan(0);
    expect(lay.props.map((p) => p.kind)).toEqual(['smallCrate', 'crate', 'barrel', 'explosiveBarrel', 'explosiveBarrel']);
    // (a sloped slab's footprint is shorter than its length: its true footprint is the 2.5 m run, so the slopes are left out here)
    const solid = b.boxes.filter((x) => x.collide && x.pitch === 0 && x.c[1] + x.s[1] / 2 > 0.3 && x.c[1] - x.s[1] / 2 < 2);
    const inside = (px: number, pz: number, m: number): boolean => solid.some((x) => Math.abs(px - x.c[0]) < x.s[0] / 2 + m && Math.abs(pz - x.c[2]) < x.s[2] / 2 + m);
    for (const e of lay.enemySpawns) expect(inside(e.x, e.z, 0.5), `enemy spawn ${e.x}, ${e.z}`).toBe(false);
    for (const d of lay.dummies!) expect(inside(d.pos.x, d.pos.z, 0.5), `dummy ${d.pos.x}, ${d.pos.z}`).toBe(false);
    for (const p of lay.props) expect(inside(p.pos.x, p.pos.z, 0.3), `prop ${p.kind}`).toBe(false);
    expect(lay.navSeeds).toHaveLength(1);
    expect(lay.navSeeds![0]!.y).toBeCloseTo(2.4, 6);
    expect(lay.camSpaces!.map((c) => c.size)).toEqual(['tight', 'tight']);
    expect(lay.camSize).toBe('open');
  });});
