import { describe, expect, it } from 'vitest';
import { stageLightKeep, stageLightMeshes } from '../src/anim/studio';
import { newPairRole, pairCycle, pairPose } from '../src/anim/studioPairs';
import { PAIR_STATION } from '../src/anim/studioTraversal';
import { TEAM_MOVES } from '../src/anim/moveTune';
import { pickLod } from '../src/operators/runtime/lodPick';
import { LOD_0, LOD_1, LOD_2, LOD_NAMES } from '../src/operators/runtime/manifest';
import { PLAYER_HEIGHT } from '../src/operators/runtime/playerFigure';

/** (studio-pairs, AUDIT fix 12) The Anim Studio pairs: what the stage lights take, and the puppets' LOD. */

describe('anim studio pairs: the stage lights take her own meshes only', () => {
  it('never an instance: its source is the shared part base, which would light every part instance (the guard)', () => {
    const base = { name: 'part-torso' };
    const base2 = { name: 'part-limbA' };
    const lod0 = { name: 'wren-lod0-0' };
    const lod1 = { name: 'wren-lod1-0' };
    // her figure's meshes, her hidden rig parts (instances of the shared bases), a guard's parts on the same bases
    const hers = [lod0, lod1, { name: 'wren-torso', sourceMesh: base }, { name: 'wren-arm', sourceMesh: base2 }, lod0];
    const guard = [{ name: 'guard-torso', sourceMesh: base }, { name: 'guard-arm', sourceMesh: base2 }];
    const out: (typeof hers)[number][] = [{ name: 'stale' }];
    const got = stageLightMeshes(hers, out);
    expect(got).toBe(out);
    expect(got.map((m) => m.name)).toEqual(['wren-lod0-0', 'wren-lod1-0']);
    // the lit set holds no base and no instance, so no guard part shares a light with her
    for (const g of guard) {
      expect(got.includes(g)).toBe(false);
      expect(got.includes(g.sourceMesh as { name: string })).toBe(false);
    }
    expect(stageLightMeshes([], out)).toEqual([]);
  });
});

describe('anim studio pairs: the puppets stay on one LOD through every loop', () => {
  // the pair view's framing camera (the N4b GPU audit's pair-boost camera: 7 m from the bounds centre, yaw 2.39)
  const CAM = { x: 14 + Math.sin(2.39) * 7, y: 2.17 + 0.5, z: 23.25 + Math.cos(2.39) * 7 };
  const ALL = (1 << LOD_0) | (1 << LOD_1) | (1 << LOD_2);

  /** LOD swaps of each role over two loops at 60 Hz (after its first frame), the figure's pick for distance `dist`. */
  function swaps(dist: (x: number, y: number, z: number) => number, have: number): { move: string; n: number; max: number }[] {
    const out: { move: string; n: number; max: number }[] = [];
    for (const m of TEAM_MOVES) {
      const a = newPairRole();
      const b = newPairRole();
      const cyc = pairCycle(m);
      const cur = [-1, -1];
      let n = 0;
      let max = 0;
      for (let f = 0; f < Math.round(cyc * 120); f++) {
        pairPose(m, f / 60, PAIR_STATION, PLAYER_HEIGHT, a, b);
        const rs = [a, b];
        for (let i = 0; i < 2; i++) {
          const r = rs[i]!;
          const d = dist(r.x, r.y, r.z);
          max = Math.max(max, d);
          const want = pickLod(cur[i]!, d, false, have);
          if (cur[i]! >= 0 && want !== cur[i]) n++;
          cur[i] = want;
        }
      }
      out.push({ move: m, n, max });
    }
    return out;
  }

  it('picked by the framing camera, a puppet crosses the LOD0 / LOD1 edge mid-loop (a LOD first shown draws nothing until it compiles)', () => {
    const s = swaps((x, y, z) => Math.hypot(x - CAM.x, y - CAM.y, z - CAM.z), ALL);
    expect(s.some((r) => r.n > 0)).toBe(true);
  });

  it('the studio picks with no camera: LOD0 throughout, every move, both roles (only a load can change it)', () => {
    const s = swaps(() => 0, ALL);
    for (const r of s) expect(r.n, r.move).toBe(0);
    // before LOD0 loads: the loaded one, held
    expect(swaps(() => 0, 1 << LOD_2).every((r) => r.n === 0)).toBe(true);
    expect(pickLod(LOD_2, 0, false, ALL)).toBe(LOD_0);
  });
});

describe('anim studio pairs: a stage light list stays clean of the shared part bases (fix 12 GPU round)', () => {
  it('drops a pushed part base (it has instances) or instance, keeps her figure and a pushed puppet figure', () => {
    const lod0 = { name: 'wren-lod0-0' };
    const puppet = { name: 'studio-p1-lod0-0', instances: [] as unknown[] };
    const guardTorso = { name: 'guard-torso' };
    // the shared torso base: the guard's torso is one of its instances
    const base = { name: 'part-torso', instances: [guardTorso] as unknown[] };
    const inst = { name: 'studio-p1-part', sourceMesh: base };
    // as the N0 audit's pair rows leave it: her figure, a puppet's figure and the base it pushed for a puppet part
    const list = [lod0, puppet, base, inst];
    const out: object[] = [{ name: 'stale' }];
    expect(stageLightKeep(list, out)).toBe(true);
    expect(out).toEqual([lod0, puppet]);
    // her own list (`stageLightMeshes`) is already clean: nothing dropped, the list copied as it is
    expect(stageLightKeep([lod0, puppet], out)).toBe(false);
    expect(out).toEqual([lod0, puppet]);
    expect(stageLightKeep([], out)).toBe(false);
    expect(out).toEqual([]);
  });

  it('the puppets hook labels LOD index 1 as LOD0 (the audit label `1@8.x` is LOD0, not LOD1)', () => {
    expect(LOD_NAMES[LOD_0]).toBe('lod0');
    expect(LOD_0).toBe(1);
  });
});
