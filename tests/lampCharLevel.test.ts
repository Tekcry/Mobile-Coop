/**
 * (char-shadow-meter S4 triage) With the character contract on (`flags.charShadowLight`), the light field counts the
 * characters' shadows, so the picture's darkness curve must read the shadowed level too: a grey card in a guard's
 * shadow then renders as an unshadowed card at the same field level (light parity). The GPU run before this fix showed
 * the card at field 0.367 rendering at luma 0.366 (an unshadowed 0.40 card reads 0.320): the curve took the unshadowed
 * level. `BakedLamps.charLevel` (GameState sets it with the contract) goes to the shader as `lampDark.w`; the per-lamp
 * loop multiplies the curve's lamp term by the same character shadow (outline map x round capsules) the lit term takes.
 * Flag off (w 0): the curve's lamp term is as before. `e2e-parity` part 4's character-shadow card reads it on the GPU.
 */
import { describe, expect, it } from 'vitest';

describe('LampPlugin character shadows on the darkness curve', () => {
  it('the curve lamp term takes the character shadow only with lampDark.w; the lit term always', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, PBRMaterial } = await import('../src/core/babylon');
    const { LampPlugin } = await import('../src/world/bakedLamps');
    const scene = new Scene(new NullEngine());
    const lamps = { volume: null, moonTex: null, fillTex: {} } as unknown as ConstructorParameters<typeof LampPlugin>[1];
    const code = new LampPlugin(new PBRMaterial('x', scene), lamps).getCustomCode('fragment')!['CUSTOM_FRAGMENT_BEFORE_FINALCOLORCOMPOSITION']!;
    const loop = code.slice(code.indexOf('vec3 nsLampRaw = vec3(0.0);'), code.indexOf('lsum += t1.rgb * k;') + 1);
    // the flag-off back face keeps the old curve term (no shadow work); every other path goes through the shadow
    expect(loop).toMatch(/if \(ndl <= 0\.0 && lampDark\.w < 0\.5\) \{\s+nsLampRaw \+= t1\.rgb \* k;\s+continue;\s+\}/);
    expect(loop).toMatch(/nsLampRaw \+= t1\.rgb \* k \* mix\(1\.0, nsSh, lampDark\.w\);\s+if \(ndl <= 0\.0\) continue;\s+k \*= ndl \* nsSh;/);
    // the outline map and the round capsules both feed nsSh, before the curve term
    const sh = loop.indexOf('nsLampRaw += t1.rgb * k * mix');
    expect(loop.indexOf('nsSh *= nsCharShadow(')).toBeGreaterThan(0);
    expect(loop.indexOf('nsSh *= nsCharShadow(')).toBeLessThan(sh);
    expect(loop.indexOf('nsSh *= lampCapsule(')).toBeGreaterThan(0);
    expect(loop.indexOf('nsSh *= lampCapsule(')).toBeLessThan(sh);
    // no other curve accumulation in the loop, and no lit term without the shadow
    expect(loop.match(/nsLampRaw \+=/g)).toHaveLength(2);
    expect(loop).not.toMatch(/k \*= nsCharShadow|k \*= lampCapsule/);
    scene.dispose();
  });

  it('binds charLevel as lampDark.w (1 on, 0 off)', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, PBRMaterial } = await import('../src/core/babylon');
    const { LampPlugin } = await import('../src/world/bakedLamps');
    const { DARK_DESKTOP } = await import('../src/world/darkCurve');
    const scene = new Scene(new NullEngine());
    // the volume path returns right after the curve's uniforms: the least a bind needs
    const lamps = {
      volume: { grid: { o: [0, 0, 0], cell: 1, dims: [1, 1, 1] }, a: null, b: null },
      volCaps: new Float32Array(8),
      moon: null,
      moonTex: null,
      fill: null,
      fillTex: null,
      level: null,
      doorBase: 0,
      visionGain: 1,
      moonLight: 0,
      skyFlash: 0,
      dark: DARK_DESKTOP,
      darkNow: { ...DARK_DESKTOP },
      illum: new Float32Array(7),
      charLevel: false,
    };
    const plugin = new LampPlugin(new PBRMaterial('y', scene), lamps as unknown as ConstructorParameters<typeof LampPlugin>[1]);
    const seen: Record<string, number[]> = {};
    const ubo = {
      updateFloat4: (n: string, x: number, y: number, z: number, w: number) => void (seen[n] = [x, y, z, w]),
      updateFloatArray: () => {},
      setTexture: () => {},
    };
    plugin.bindForSubMesh(ubo as never, scene, null, null as never);
    expect(seen['lampDark']![3]).toBe(0);
    lamps.charLevel = true;
    plugin.bindForSubMesh(ubo as never, scene, null, null as never);
    expect(seen['lampDark']![3]).toBe(1);
    scene.dispose();
  });
});
