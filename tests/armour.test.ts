/**
 * E10 armoured routes (A97; docs/sector-redesign/checks/e10-armour.md): armoured glass is its own collision bit
 * (`G.GLASS_ARMOURED`) in the player and enemy shot masks and not in the sight mask, so a round stops on a clear
 * armoured pane while a guard still sees through it; an armoured door leaf carries the same bit (no penetration). The
 * campus S4 / S5 pieces are built armoured where the data says, and each one's quiet bypass sits on a route whose walked
 * legs up to it have a path on the guards' runtime nav grid.
 */
import { describe, expect, it } from 'vitest';
import { G, MASK, doorMembership, glassMembership, isArmoured } from '../src/physics/groups';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { SightWorld } from '../src/game/sectorCheck';
import { losClear } from '../src/ai/perception';
import { campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { S4_ARMOURED, type ArmourPiece } from '../src/world/maps/campusS4Data';
import { S5_ARMOURED } from '../src/world/maps/campusS5Data';
import { hyp2 } from '../src/core/mathx';
import { runtimeNav } from './helpers/runtimeNav';

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

// ---- the campus data (S4, S5)
const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const spawn = lay.playerSpawns[0]!.pos;
const nav = runtimeNav(b, spawn, campusOps.navLayers ?? 3, lay.navSeeds ?? []);
const doorCentre = (d: (typeof b.anchors.doors)[number]): [number, number] => [d.hinge.x + Math.sin(d.yaw) * d.width * 0.5, d.hinge.z + Math.cos(d.yaw) * d.width * 0.5];
/** Plan distance from (x, z) to the segment p-q. */
const segDist = (x: number, z: number, p: readonly number[], q: readonly number[]): number => {
  const dx = q[0]! - p[0]!;
  const dz = q[1]! - p[1]!;
  const l2 = dx * dx + dz * dz;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((x - p[0]!) * dx + (z - p[1]!) * dz) / l2)) : 0;
  return hyp2(x - (p[0]! + dx * t), z - (p[1]! + dz * t));
};
const TABLES: [number, ArmourPiece[]][] = [
  [3, S4_ARMOURED],
  [4, S5_ARMOURED],
];

describe('E10 campus armoured routes (A97)', () => {
  it('the built campus has exactly the armoured pieces the S4 / S5 tables list (none in S1-S3)', () => {
    const doors = b.anchors.doors.filter((d) => d.armoured);
    const panes = b.boxes.filter((p) => p.armoured);
    const listed = [...S4_ARMOURED, ...S5_ARMOURED];
    expect(doors.length).toBe(listed.filter((a) => a.kind === 'door').length);
    expect(panes.length).toBe(listed.filter((a) => a.kind === 'glass').length);
    for (const a of listed) {
      if (a.kind === 'door') {
        const d = doors.find((q) => hyp2(doorCentre(q)[0] - a.at[0], doorCentre(q)[1] - a.at[1]) < 0.2);
        expect(d, a.id).toBeTruthy();
      } else {
        const p = panes.find((q) => {
          const half = q.s[2] / 2;
          const ex = Math.sin(q.yaw) * half;
          const ez = Math.cos(q.yaw) * half;
          return segDist(a.at[0], a.at[1], [q.c[0] - ex, q.c[2] - ez], [q.c[0] + ex, q.c[2] + ez]) < 0.2 && Math.abs(q.c[1] - q.s[1] / 2 - (a.y ?? 0)) < 0.05;
        });
        expect(p, a.id).toBeTruthy();
        expect(p!.glass, a.id).toBe('clear');
      }
    }
    // S1-S3 unchanged: every armoured piece sits in S4 (x > -10) or S5 (x < -26) footprints, z 16..48
    for (const d of doors) expect(doorCentre(d)[1] >= 16 && doorCentre(d)[1] <= 48, `door ${d.id}`).toBe(true);
    for (const p of panes) expect(p.c[2] >= 16 && p.c[2] <= 48).toBe(true);
  });

  for (const [s, table] of TABLES) {
    it(`S${s + 1}: each armoured piece names its loud route and ONE quiet bypass on a route whose legs to the objective avoid it`, () => {
      const sec = CAMPUS_SECTORS[s]!;
      const ids = new Set<string>();
      for (const a of table) {
        expect(ids.has(a.id), a.id).toBe(false);
        ids.add(a.id);
        expect(sec.routes.some((r) => r.name === a.loud), `${a.id} loud`).toBe(true);
        const r = sec.routes.find((q) => q.name === a.bypass.route);
        expect(r, `${a.id} bypass route`).toBeTruthy();
        expect(a.bypass.route, a.id).not.toBe(a.loud);
        expect(a.bypass.name.length, a.id).toBeGreaterThan(8);
        // the bypass is on its route (plan within 0.6 m of a leg up to the objective, on that leg's floor)
        let leg = -1;
        for (let i = 0; i < r!.obj && leg < 0; i++) {
          const p = r!.pts[i]!;
          const q = r!.pts[i + 1]!;
          const y = a.bypass.y ?? 0;
          if (segDist(a.bypass.at[0], a.bypass.at[1], p, q) <= 0.6 && (Math.abs((p[2] ?? 0) - y) < 0.3 || Math.abs((q[2] ?? 0) - y) < 0.3)) leg = i;
        }
        expect(leg, `${a.id}: ${a.bypass.name} on ${a.bypass.route}`).toBeGreaterThanOrEqual(0);
        // the route never passes the armoured piece before the objective (plan > 1.2 m)
        for (let i = 0; i < r!.obj; i++) expect(segDist(a.at[0], a.at[1], r!.pts[i]!, r!.pts[i + 1]!), `${a.id} leg ${i}`).toBeGreaterThan(1.2);
      }
    });

    it(`S${s + 1}: every walked leg of each bypass route up to its bypass has a path on the runtime nav grid`, () => {
      const sec = CAMPUS_SECTORS[s]!;
      const fails: string[] = [];
      for (const a of table) {
        const r = sec.routes.find((q) => q.name === a.bypass.route)!;
        // up to the leg after the bypass point (the bypass itself is walked into and out of)
        let last = r.obj;
        for (let i = 0; i < r.obj; i++) {
          if (segDist(a.bypass.at[0], a.bypass.at[1], r.pts[i]!, r.pts[i + 1]!) <= 0.6) {
            last = Math.min(r.obj, i + 1);
            break;
          }
        }
        for (let i = 0; i < last; i++) {
          if ((r.climbs ?? []).includes(i)) continue;
          const p = r.pts[i]!;
          const q = r.pts[i + 1]!;
          if (!nav.findPath([p[0], p[1]], [q[0], q[1]], 200000, p[2] ?? 0, q[2] ?? 0)) fails.push(`${a.id} ${r.name} leg ${i} ${JSON.stringify([p, q])}`);
        }
      }
      expect(fails).toEqual([]);
    });
  }
});
