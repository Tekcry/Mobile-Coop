/**
 * (LR16 fix, torch parity) The flashlights drawn as Babylon spot lights - the shadow-mapped ones and any in the light
 * rig's pool, plain or clustered - take the meter's feathered cone (`lampMath.lampCone`, `SPOT_FEATHER`), not
 * Babylon's hard cut: the lamp plugin swaps Babylon's PBR spot-cone calls for `nsSpotFalloff` (`nsLampCone`).
 * Guards the swap against Babylon's own shader text (an upgrade that renames the calls fails here) and evaluates it.
 */
import { describe, expect, it } from 'vitest';
import { LAMP_MATH_GLSL, lampCone, SPOT_EXP } from '../src/world/lampMath';
import { SPOT_FALLOFF_CALL, SPOT_FALLOFF_GLSL, SPOT_FALLOFF_SWAP, spotFeatherStd } from '../src/world/bakedLamps';
import { TORCH } from '../src/world/torches';

/** Babylon's plugin regex injection (`MaterialPluginManager._injectCustomCode`), including its `$n` substitution. */
function inject(code: string, key: string, value: string): string {
  const rx = new RegExp(key.substring(1), 'g');
  let m = rx.exec(code);
  while (m !== null) {
    const hit = m;
    const v = value.replace(/\$(\d+)/g, (_g, n: string) => (Number(n) < hit.length ? hit[Number(n)]! : ''));
    code = code.substring(0, hit.index) + v + '\n' + code.substring(hit.index + hit[0].length);
    rx.lastIndex = hit.index + v.length + 1;
    m = rx.exec(code);
  }
  return code;
}

/** `nsLampCone` (GLSL) run as JS (as `lampFalloff.test.ts` runs it). */
function glslCone(): (ca: number, cut: number, e: number) => number {
  const m = /float nsLampCone\(float ca, float cut, float e\) \{ ([^\n]*) \}\n/.exec(LAMP_MATH_GLSL);
  if (!m) throw new Error('nsLampCone not found');
  const lib = 'const clamp = (x, a, b) => Math.min(b, Math.max(a, x)); const pow = Math.pow; const max = Math.max; ';
  return new Function('ca', 'cut', 'e', lib + m[1]!.replace(/\bfloat /g, 'let ')) as (ca: number, cut: number, e: number) => number;
}

describe('torch cone parity (Babylon spot lights)', () => {
  it("the swap hits every Babylon PBR spot-cone call (lightFragment, clustered), and nothing else", async () => {
    const { lightFragment } = await import('@babylonjs/core/Shaders/ShadersInclude/lightFragment');
    const { pbrClusteredLightingFunctions } = await import('@babylonjs/core/Shaders/ShadersInclude/pbrClusteredLightingFunctions');
    const frag = lightFragment.shader.replace(/\{X\}/g, '3');
    const out = inject(frag, SPOT_FALLOFF_CALL, SPOT_FALLOFF_SWAP);
    expect(out).not.toMatch(/computeDirectionalLightFalloff(_Standard)?\(light/);
    expect(out).not.toContain('undefined');
    expect(out.match(/nsSpotFalloff\(light3\.vLightDirection\.xyz,preInfo\.L,/g)?.length).toBe(1);
    expect(out.match(/nsSpotFalloff_Standard\(light3\.vLightDirection\.xyz,preInfo\.L,/g)?.length).toBe(1);
    // (Babylon's other cone models stay theirs)
    expect(out).toContain('computeDirectionalLightFalloff_GLTF(light3.');
    const cl = inject(pbrClusteredLightingFunctions.shader, SPOT_FALLOFF_CALL, SPOT_FALLOFF_SWAP);
    expect(cl.match(/nsSpotFalloff\(light\.vLightDirection\.xyz,preInfo\.L,/g)?.length).toBe(1);
    expect(cl).not.toMatch(/computeDirectionalLightFalloff\(light/);
    // (the replacement's functions: both overloads, through nsLampCone)
    expect(SPOT_FALLOFF_GLSL).toContain('float nsSpotFalloff(vec3 ld, vec3 l, float cut, float e, float s, float o)');
    expect(SPOT_FALLOFF_GLSL).toContain('float nsSpotFalloff_Standard(vec3 ld, vec3 l, float cut, float e)');
    expect(SPOT_FALLOFF_GLSL.match(/nsLampCone\(dot\(-ld, l\), cut, e\)/g)?.length).toBe(2);
    expect(spotFeatherStd('2')).toContain('nsLampCone(nsCa, light2.vLightDirection.w, light2.vLightData.w)');
  });

  it("the light rig's spot (angle, exponent) through the swap = the meter's torch cone in the feather band", async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, SpotLight, Vector3 } = await import('../src/core/babylon');
    const scene = new Scene(new NullEngine());
    const cosOuter = Math.cos(TORCH.outer);
    // (as `LightRig.place` sets a cone light)
    const sp = new SpotLight('t', new Vector3(0, 0, 0), new Vector3(0, -1, 0), Math.acos(cosOuter) * 2, SPOT_EXP, scene);
    const cut = (sp as unknown as { _cosHalfAngle: number })._cosHalfAngle;
    const cone = glslCone();
    let worst = 0;
    let oldWorst = 0;
    for (let i = 0; i <= 400; i++) {
      const a = (TORCH.outer * 1.05 * i) / 400;
      const ca = Math.cos(a);
      const meter = lampCone(ca, cosOuter, SPOT_EXP);
      worst = Math.max(worst, Math.abs(cone(ca, cut, sp.exponent) - meter));
      // (before: Babylon's standard cone, cos^exp cut at the angle)
      const hard = ca >= cut ? Math.pow(ca, sp.exponent) : 0;
      oldWorst = Math.max(oldWorst, Math.abs(hard - meter));
    }
    expect(worst).toBeLessThan(1e-6);
    // (the gap the fix closes: near full light at the beam's edge)
    expect(oldWorst).toBeGreaterThan(0.8);
    scene.dispose();
  });
});
