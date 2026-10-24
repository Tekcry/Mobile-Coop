/**
 * (lr16pol B, lr15-check 1 + lr16t check A 7) Fences, ropes, the rope line and bullet decals take the level's material
 * kind (`world/levelLitMaterial.ts`): PBR with the level's settings where the level is PBR, so the lamp plugin's torch
 * loop (`LAMP_TORCH` / `LAMP_TSHADOW`, PBR only) lights them; the standard material on the standard / `?gfx=min` path.
 * The fence (inside `LevelBuilder.build`, which needs Havok) is covered by `e2e-lightbake` and the laptop look shots.
 */
import { describe, expect, it } from 'vitest';

async function scene(pbrLevel: boolean | null) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, PBRMaterial, StandardMaterial } = await import('../src/core/babylon');
  const { markLampLevel } = await import('../src/world/bakedLamps');
  const s = new Scene(new NullEngine());
  // the level material as `LevelBuilder.build` makes it: PBR + marked with an atlas, standard (unmarked) without
  if (pbrLevel === true) markLampLevel(new PBRMaterial('levelMat-t', s));
  if (pbrLevel === false) new StandardMaterial('levelMat-t', s);
  return s;
}

describe('level-lit small surfaces (lr16pol B)', () => {
  it('levelIsPbr: only a marked PBR level material counts', async () => {
    const { PBRMaterial } = await import('../src/core/babylon');
    const { levelIsPbr } = await import('../src/world/levelLitMaterial');
    const a = await scene(true);
    expect(levelIsPbr(a)).toBe(true);
    const b = await scene(false);
    expect(levelIsPbr(b)).toBe(false);
    // an unmarked PBR material (a prop, a door) does not make the level PBR
    const c = await scene(null);
    new PBRMaterial('doorMat', c);
    expect(levelIsPbr(c)).toBe(false);
    for (const s of [a, b, c]) s.getEngine().dispose();
  });

  it('levelPbrMaterial: the level settings, the colour linearised', async () => {
    const { Color3 } = await import('../src/core/babylon');
    const { levelPbrMaterial } = await import('../src/world/levelLitMaterial');
    const s = await scene(true);
    const m = levelPbrMaterial('t', s, new Color3(0.5, 0.25, 1));
    expect(m.metallic).toBe(0);
    expect(m.roughness).toBe(1);
    expect(m.usePhysicalLightFalloff).toBe(false);
    expect(m.directIntensity).toBeCloseTo(Math.PI, 12);
    expect(m.environmentIntensity).toBeCloseTo(0.6, 12);
    expect(m.realTimeFiltering).toBe(true);
    expect(m.albedoColor.r).toBeCloseTo(0.5 ** 2.2, 6);
    expect(m.albedoColor.g).toBeCloseTo(0.25 ** 2.2, 6);
    expect(m.albedoColor.b).toBeCloseTo(1, 6);
    s.getEngine().dispose();
  });

  it('ropes, rope line and decals: PBR on a PBR level (the torch loop compiles), standard on the standard path', async () => {
    const { PBRMaterial, StandardMaterial, Vector3 } = await import('../src/core/babylon');
    const { Ropes } = await import('../src/world/ropes');
    const { RopeLine } = await import('../src/game/ropeLine');
    const { Vfx } = await import('../src/vfx/vfx');
    const { LampPlugin } = await import('../src/world/bakedLamps');
    const lamps = { volume: null, moonTex: null, fillTex: null, torchDraw: new Float32Array(64), torchShadows: { on: true }, doorSlots: 4, atlasPages: 1 } as unknown as ConstructorParameters<typeof LampPlugin>[1];
    const torchDefines = (m: InstanceType<typeof PBRMaterial> | InstanceType<typeof StandardMaterial>): Record<string, unknown> => {
      const d: Record<string, unknown> = {};
      new LampPlugin(m, lamps).prepareDefines(d as never, m.getScene(), {} as never);
      return d;
    };
    for (const pbr of [true, false]) {
      const s = await scene(pbr);
      const kind = pbr ? PBRMaterial : StandardMaterial;
      const ropes = new Ropes(s);
      ropes.set('a', 0, 2, 0, 0, 0, 1);
      const rope = s.getMaterialByName('ropeMat')!;
      expect(rope).toBeInstanceOf(kind);
      new RopeLine(s);
      const line = s.getMaterialByName('ropeLineMat')!;
      expect(line).toBeInstanceOf(kind);
      const vfx = new Vfx(s);
      vfx.decal(new Vector3(0, 1, 0), new Vector3(0, 0, 1));
      const decal = s.getMaterialByName('decalMat')!;
      expect(decal).toBeInstanceOf(kind);
      // kept from the standard material: the decal's depth offset and its freeze
      expect(decal.zOffset).toBe(-2);
      expect(decal.isFrozen).toBe(true);
      for (const m of [rope, line, decal] as (InstanceType<typeof PBRMaterial> | InstanceType<typeof StandardMaterial>)[]) {
        // not the level: the night-vision body fill cap stays on them
        expect((m.metadata as { lampLevel?: boolean } | null)?.lampLevel ?? false).toBe(false);
        if (pbr) {
          const p = m as InstanceType<typeof PBRMaterial>;
          expect(p.directIntensity).toBeCloseTo(Math.PI, 12);
          expect(p.roughness).toBe(1);
          expect(p.metallic).toBe(0);
        }
        expect(torchDefines(m)).toMatchObject({ LAMP_TORCH: pbr, LAMP_TSHADOW: pbr, LAMP_LEVEL: false });
      }
      // the authored colours, linearised on the PBR path
      if (pbr) {
        const r = rope as InstanceType<typeof PBRMaterial>;
        expect(r.albedoColor.r).toBeCloseTo((0x4a / 255) ** 2.2, 6);
        expect((line as InstanceType<typeof PBRMaterial>).albedoColor.g).toBeCloseTo(0.45 ** 2.2, 6);
        expect((decal as InstanceType<typeof PBRMaterial>).albedoColor.b).toBeCloseTo(0.09 ** 2.2, 6);
      } else {
        expect((rope as InstanceType<typeof StandardMaterial>).diffuseColor.r).toBeCloseTo(0x4a / 255, 6);
        expect((line as InstanceType<typeof StandardMaterial>).diffuseColor.g).toBeCloseTo(0.45, 6);
        expect((decal as InstanceType<typeof StandardMaterial>).diffuseColor.b).toBeCloseTo(0.09, 6);
      }
      vfx.dispose();
      s.getEngine().dispose();
    }
  });
});
