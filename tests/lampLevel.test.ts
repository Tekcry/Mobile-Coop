/**
 * smooth-world fix round: the level's own material (marked by `LevelBuilder.build` with `markLampLevel`) compiles the
 * lamp plugin with `LAMP_LEVEL`, so night vision's body fill cap (`BODY_FILL`) leaves the smooth level's fill whole;
 * bodies, weapons and props (unmarked) keep the cap. `e2e-lightbake` checks the real level material in the app.
 */
import { describe, expect, it } from 'vitest';

describe('LampPlugin LAMP_LEVEL', () => {
  it('only a marked material gets LAMP_LEVEL; the shader keeps the cap for the rest', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, PBRMaterial } = await import('../src/core/babylon');
    const { LampPlugin, markLampLevel, isLampLevel } = await import('../src/world/bakedLamps');
    const scene = new Scene(new NullEngine());
    const lamps = { volume: null, moonTex: null, fillTex: {} } as unknown as ConstructorParameters<typeof LampPlugin>[1];
    const level = new PBRMaterial('levelMat-test', scene);
    level.metadata = { other: 1 };
    markLampLevel(level);
    const body = new PBRMaterial('part', scene);
    expect(isLampLevel(level)).toBe(true);
    expect((level.metadata as { other: number }).other).toBe(1);
    expect(isLampLevel(body)).toBe(false);
    const mesh = {} as never;
    const read = (m: InstanceType<typeof PBRMaterial>): Record<string, unknown> => {
      const p = new LampPlugin(m, lamps);
      const d: Record<string, unknown> = {};
      p.prepareDefines(d as never, scene, mesh);
      return d;
    };
    expect(read(level)).toMatchObject({ BAKED_LAMPS: true, LAMP_FILL: true, LAMP_LEVEL: true });
    expect(read(body)).toMatchObject({ BAKED_LAMPS: true, LAMP_FILL: true, LAMP_LEVEL: false });
    const code = new LampPlugin(new PBRMaterial('x', scene), lamps).getCustomCode('fragment')!['CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION']!;
    expect(code).toMatch(/#ifdef LAMP_LEVEL\s+float nsBF = 1\.0;\s+#else\s+float nsBF = nsBodyFill/);
    scene.dispose();
  });
});
