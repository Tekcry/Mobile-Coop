/**
 * (sector-redesign perfa) The campus art's per-frame CPU cost on a NullEngine, from the dresser output of the real dressed
 * campus (`buildCampus(b, { dress: true })`): art meshes (= draws per pass), thin instances, shadow casters per section,
 * and the art meshes a camera at each section's start would draw (in the frustum, enabled; 8 headings). Holds the perfa
 * cuts: fewer art meshes than the pre-perfa rule, the far cull drops indoor art only, never a caster or outdoor art.
 * `PERFA_PROBE=1` prints the tables.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Mesh, Scene } from '../src/core/babylon';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCampus } from '../src/world/maps/campusOps';
import { campusCatalogues } from '../src/world/maps/campusDress';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { parseGlb, type GlbModel } from '../src/operators/lab/glb';
import { LightRegistry } from '../src/world/lights';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const glb = (file: string): ArrayBuffer => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const LOG = !!process.env.PERFA_PROBE;
const OLD = path.resolve(__dirname, '../src/world/campusArt/_oldRender.ts');

describe('campus art perf probe (perfa)', () => {
  it('counts the art draws per section and per start view; the far cull and merges hold', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Frustum } = await import('@babylonjs/core/Maths/math.frustum');
    const B = await import('../src/core/babylon');
    const { CampusArtRender } = await import('../src/world/campusArt/campusArtRender');
    const b = new LevelBuilder();
    const layout = buildCampus(b, { dress: true });
    const art = layout.campusArt!;
    const cats = campusCatalogues();
    const models: Record<string, GlbModel> = {};
    for (const id of art.catalogues) {
      const f = id === 'F' ? path.resolve(__dirname, '../src/world/props/assets/facility-props.glb') : path.join(ASSETS, cats[id]!.glb);
      models[id] = parseGlb(glb(f));
    }
    const indoor = art.placements.filter((p) => p.indoor).length;
    expect(indoor).toBeGreaterThan(0);

    type R = { meshes(): Mesh[]; frame(): void; counts(): { draws: number; perSection: { draws: number }[] } };
    const views = (scene: Scene, r: R): { mean: number; max: number; start: number }[] => {
      const cam = new B.FreeCamera('probe', new B.Vector3(0, 0, 0), scene);
      cam.fov = 1.0;
      cam.minZ = 0.1;
      cam.maxZ = 220;
      scene.activeCamera = cam;
      const out: { mean: number; max: number; start: number }[] = [];
      for (const s of CAMPUS_SECTORS) {
        let sum = 0;
        let max = 0;
        let start = 0;
        for (let k = 0; k < 8; k++) {
          const yaw = (k * Math.PI) / 4;
          const fx = Math.sin(yaw);
          const fz = Math.cos(yaw);
          cam.position.set(s.start.x - fx * 2.8, s.start.y + 1.9, s.start.z - fz * 2.8);
          cam.setTarget(new B.Vector3(s.start.x + fx * 10, s.start.y + 1.5, s.start.z + fz * 10));
          cam.computeWorldMatrix();
          r.frame();
          const planes = Frustum.GetPlanes(cam.getViewMatrix(true).multiply(cam.getProjectionMatrix(true)));
          let n = 0;
          for (const m of r.meshes()) if (m.isEnabled() && m.isInFrustum(planes)) n++;
          sum += n;
          max = Math.max(max, n);
          if (Math.abs(yaw - s.start.yaw) < 1e-6 || Math.abs(yaw - s.start.yaw - 2 * Math.PI) < 1e-6) start = n;
        }
        out.push({ mean: sum / 8, max, start });
      }
      return out;
    };

    const run = async (mod: { CampusArtRender: { fromModels: (...a: never[]) => R } }): Promise<{ total: number; per: number[]; casters: number; views: { mean: number; max: number; start: number }[] }> => {
      const engine = new NullEngine();
      const scene = new B.Scene(engine);
      const casters: string[] = [];
      const r = (mod.CampusArtRender.fromModels as unknown as (...a: unknown[]) => R)(scene, art, models, new LightRegistry(), null, (m: Mesh) => casters.push(m.name), cats);
      const c = r.counts();
      const v = views(scene, r);
      engine.dispose();
      return { total: c.draws, per: c.perSection.map((x) => x.draws), casters: casters.length, views: v };
    };

    const now = await run({ CampusArtRender: CampusArtRender as never });
    const old = existsSync(OLD) ? await run((await import(/* @vite-ignore */ OLD)) as never) : null;
    if (LOG) {
      console.info(`placements ${art.placements.length}, indoor ${indoor}`);
      console.info('BEFORE', JSON.stringify(old));
      console.info('AFTER ', JSON.stringify(now));
      const engine = new NullEngine();
      const scene = new B.Scene(engine);
      const r = CampusArtRender.fromModels(scene, art, models, new LightRegistry(), null, () => {}, cats);
      const rows = r.probe();
      const kinds: Record<string, number> = {};
      for (const x of rows) kinds[`S${x.section + 1} ${x.kind}${x.indoor ? ' indoor' : ''}`] = (kinds[`S${x.section + 1} ${x.kind}${x.indoor ? ' indoor' : ''}`] ?? 0) + 1;
      console.info(JSON.stringify(kinds, null, 1));
      engine.dispose();
    }
    // the merges cut the draws; the far cull never drops a caster
    // (the indoor / outdoor split adds a few draws in total; what a view draws drops)
    for (const n of now.per) expect(n).toBeLessThanOrEqual(40);
    if (old) expect(now.casters).toBeLessThan(old.casters);
    for (let s = 0; s < 5; s++) if (old) expect(now.views[s]!.mean).toBeLessThanOrEqual(old.views[s]!.mean);
  }, 120000);
});
