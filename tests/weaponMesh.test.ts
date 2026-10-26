import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { WEAPONS, modelExtents, type WeaponId } from '../src/weapons/weaponDefs';
import { MESH_IDS, TRI_BUDGET, meshFitsProxy, meshUrl, type WeaponMeshReport } from '../src/weapons/weaponMeshData';

/** The built kit meshes (feature/weapons): scripts/weapons/ writes each GLB with its report beside it. */
const built = MESH_IDS.filter((id) => existsSync(`src/weapons/assets/${id}.glb`));
const report = (id: string): WeaponMeshReport => JSON.parse(readFileSync(`src/weapons/assets/${id}.json`, 'utf8')) as WeaponMeshReport;
const isGun = (id: string): id is WeaponId => id in WEAPONS;

describe('weapon meshes', () => {
  it('finds a GLB by file name only', () => {
    expect(meshUrl('rifle', { './assets/rifle.glb': '/a/rifle-1.glb', './assets/pistolSd.glb': '/a/p.glb' })).toBe('/a/rifle-1.glb');
    expect(meshUrl('knife', { './assets/rifle.glb': '/a/rifle-1.glb' })).toBe('');
  });

  it('the rifle is built', () => {
    expect(built).toContain('rifle');
  });

  it('the guns carry their magazine as a mesh of its own (a reload pulls it: anim-cleanup), the pistol its slide too (piano-knife S4a)', () => {
    const want: Record<string, string[]> = { rifle: ['rifle', 'rifle-mag'], pistolSd: ['pistolSd', 'pistolSd-mag', 'pistolSd-slide'] };
    for (const id of ['rifle', 'pistolSd'].filter((x) => built.includes(x as never))) {
      const glb = readFileSync(`src/weapons/assets/${id}.glb`);
      const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { meshes: { name: string }[] };
      expect(json.meshes.map((m) => m.name)).toEqual(want[id]);
    }
  });

  for (const id of built) {
    describe(id, () => {
      const r = report(id);
      it('stays inside its triangle budget, textures at most 2K, KTX2 only', () => {
        expect(r.triangles).toBeLessThanOrEqual(TRI_BUDGET[id]);
        expect(r.textureSize).toBeLessThanOrEqual(2048);
        const glb = readFileSync(`src/weapons/assets/${id}.glb`);
        const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { images: { mimeType: string }[]; extensionsRequired?: string[] };
        expect(json.images.every((im) => im.mimeType === 'image/ktx2')).toBe(true);
        expect(json.extensionsRequired).toContain('KHR_texture_basisu');
      });
      if (isGun(id)) {
        const def = WEAPONS[id];
        it('was built around the weapon data (hand points, muzzle) and fits its proxy extents', () => {
          expect(r.points.grip).toEqual(def.grip);
          expect(r.points.foregrip).toEqual(def.foregrip);
          expect(r.points.muzzle).toEqual(def.muzzle);
          expect(meshFitsProxy(r, modelExtents(def))).toEqual([]);
        });
        it('the trigger hand is inside the grip, the support hand on the gun, the muzzle at the bore exit', () => {
          expect(r.surface.grip!.inside).toMatch(/grip/);
          expect(r.surface.foregrip!.mm).toBeLessThanOrEqual(10);
          expect(r.surface.muzzle!.inside).toBeNull();
          expect(r.surface.muzzle!.mm).toBeLessThanOrEqual(10);
          expect(Math.abs(r.bounds.max[2] - def.muzzle[2])).toBeLessThan(0.005);
        });
      }
    });
  }
});
