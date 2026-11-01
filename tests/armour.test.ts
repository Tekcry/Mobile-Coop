/**
 * E10 armoured routes (A97; docs/sector-redesign/checks/e10-armour.md): armoured glass is its own collision bit
 * (`G.GLASS_ARMOURED`) in the player and enemy shot masks and not in the sight mask, so a round stops on a clear
 * armoured pane while a guard still sees through it; an armoured door leaf carries the same bit (no penetration).
 */
import { describe, expect, it } from 'vitest';
import { G, MASK, doorMembership, glassMembership, isArmoured } from '../src/physics/groups';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { SightWorld } from '../src/game/sectorCheck';
import { losClear } from '../src/ai/perception';

/** A stand-in ray: the pane is hit when the cast mask asks for one of its bits (as Havok's filter does). */
const pane = (bits: number) => ({ ray: (_a: unknown, _b: unknown, mask: number) => ({ hit: (mask & bits) !== 0, distance: 2 }) });
const eye = { x: -2, y: 1.55, z: 0 };
const to = { x: 2, y: 1.2, z: 0 };

describe('E10 armoured glass: the collision bit', () => {
  it('G.GLASS_ARMOURED is a free bit (1 << 14), no other group shares it', () => {
    expect(G.GLASS_ARMOURED).toBe(1 << 14);
    for (const [k, v] of Object.entries(G)) if (k !== 'GLASS_ARMOURED') expect(v & G.GLASS_ARMOURED, k).toBe(0);
  });

  it('armoured panes: bullets stop (player and enemy), clear sees, frosted does not, hearing a wall, bodies stop, the camera passes', () => {
    const clear = glassMembership('clear', true);
    const frosted = glassMembership('frosted', true);
    for (const m of [clear, frosted]) {
      expect(MASK.PLAYER_SHOT & m, 'player bullets').not.toBe(0);
      expect(MASK.ENEMY_SHOT & m, 'enemy bullets').not.toBe(0);
      expect(isArmoured(m)).toBe(true);
      expect(MASK.HEARING & m, 'hearing').not.toBe(0);
      expect(MASK.PLAYER_COLLIDE & m, 'player body').not.toBe(0);
      expect(MASK.PROJECTILE_COLLIDE & m, 'grenades').not.toBe(0);
      expect(MASK.WORLD & m, 'camera boom').toBe(0);
      expect(G.STATIC & m, 'level probes / light occluder / nav down-cast').toBe(0);
    }
    expect(MASK.SIGHT & clear, 'armoured clear glass: sight passes').toBe(0);
    expect(MASK.SIGHT & frosted, 'armoured frosted glass: sight blocked').not.toBe(0);
    // plain panes keep E2's rule: bullets pass
    expect(glassMembership('clear', false)).toBe(G.GLASS);
    expect(glassMembership('frosted', false)).toBe(G.GLASS | G.GLASS_FROSTED);
    expect(MASK.PLAYER_SHOT & glassMembership('clear', false)).toBe(0);
    expect(MASK.ENEMY_SHOT & glassMembership('frosted', false)).toBe(0);
    expect(isArmoured(G.GLASS | G.GLASS_FROSTED)).toBe(false);
  });

  it('a shot ray stops at an armoured clear pane while a guard sight ray passes it (losClear)', () => {
    const p = pane(glassMembership('clear', true));
    expect(p.ray(eye, to, MASK.PLAYER_SHOT).hit).toBe(true);
    expect(p.ray(eye, to, MASK.ENEMY_SHOT).hit).toBe(true);
    expect(losClear(p, eye, to, 0.1)).toBe(true);
    // a plain clear pane: shot and sight both pass
    const q = pane(glassMembership('clear', false));
    expect(q.ray(eye, to, MASK.ENEMY_SHOT).hit).toBe(false);
    expect(losClear(q, eye, to, 0.1)).toBe(true);
  });

  it('door leaves: always G.STATIC (rounds and sight stop); armoured adds the armour bit (no penetration)', () => {
    expect(doorMembership(false)).toBe(G.STATIC);
    expect(doorMembership(true)).toBe(G.STATIC | G.GLASS_ARMOURED);
    expect(isArmoured(doorMembership(false))).toBe(false);
    expect(isArmoured(doorMembership(true))).toBe(true);
    expect(MASK.SIGHT & doorMembership(true)).not.toBe(0);
  });
});

describe('E10 armoured glass: the pane piece', () => {
  it('LevelBuilder.glass(..., { armoured }) flags the piece; light and sector sight as a plain pane', () => {
    const plain = new LevelBuilder();
    const arm = new LevelBuilder();
    for (const b of [plain, arm]) b.box(0, 1.5, 5, 0.2, 3, 4, '#888888');
    const p0 = plain.glass(0, -2, 0, 2, 3, 0, 'clear');
    const p1 = arm.glass(0, -2, 0, 2, 3, 0, 'clear', undefined, { armoured: true });
    expect(p0.armoured).toBeUndefined();
    expect(p1.armoured).toBe(true);
    expect({ ...p1, armoured: undefined }).toEqual({ ...p0, armoured: undefined });
    // light passes: the canonical light shapes are the same as with a plain pane
    expect(canonicalLightShapes(arm.boxes, arm.cylinders, 'armourTest', false)).toEqual(canonicalLightShapes(plain.boxes, plain.cylinders, 'armourTest', false));
    // the sector checks: clear armoured glass sees, stops a body
    const w = new SightWorld(arm.boxes, []);
    expect(w.clear(-1, 1.55, 0, 1, 1.55, 0)).toBe(true);
    expect(w.blocked(0.1, 0, 0)).toBe(true);
  });

  it('LevelBuilder.door(..., { armoured }) flags the anchor; a plain door has no flag', () => {
    const b = new LevelBuilder();
    const d0 = b.door(0, 0, 0, 1.2, 0);
    const d1 = b.door(4, 0, 0, 1.2, 0, { armoured: true });
    expect(d0.armoured).toBeUndefined();
    expect(d1.armoured).toBe(true);
  });
});

