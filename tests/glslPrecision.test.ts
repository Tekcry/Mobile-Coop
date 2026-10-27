import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The `uniform ... sampler2D` lines of a shader source. */
const samplerLines = (src: string): string[] => src.split('\n').map((l) => l.trim()).filter((l) => /^uniform\s.*\bsampler2D\b/.test(l));

/** A `const NAME = \`...\`;` GLSL block of a source file (shaders kept out of the ShadersStore). */
function constBlock(file: string, name: string): string {
  const src = readFileSync(file, 'utf8');
  const at = src.indexOf(`const ${name} = \``);
  expect(at).toBeGreaterThanOrEqual(0);
  const end = src.indexOf('`;', at + name.length + 10);
  return src.slice(at, end);
}

describe('(LR16-L Part B) GLSL precision for Low / phones', () => {
  it('B1: every sampler2D reading depth or HDR colour in the post chain is highp', async () => {
    const { Effect } = await import('../src/core/babylon');
    await import('../src/vfx/taau');
    await import('../src/vfx/postStack');
    await import('../src/vfx/cinematicPost');
    await import('../src/vfx/paniniPass');
    const expected: Record<string, number> = {
      taauFragmentShader: 3, // textureSampler, historySampler, depthSampler
      volumetricFragmentShader: 2, // textureSampler, depthSampler
      cinematicFragmentShader: 4, // textureSampler, glowSampler, exposureSampler, depthSampler (thermal-read)
      paniniFragmentShader: 1, // textureSampler
    };
    for (const [name, n] of Object.entries(expected)) {
      const src = Effect.ShadersStore[name];
      expect(src, name).toBeTypeOf('string');
      const lines = samplerLines(src!);
      expect(lines.length, name).toBe(n);
      for (const l of lines) expect(l, name).toMatch(/^uniform highp sampler2D /);
    }
    // night bloom's bright pass and auto-gain measure read the HDR scene
    for (const name of ['BRIGHT', 'MEASURE']) {
      const lines = samplerLines(constBlock('src/vfx/nightBloom.ts', name));
      expect(lines, name).toEqual(['uniform highp sampler2D src;']);
    }
  });

  it('B2: the lamp loop and the volume mix state precision highp int', async () => {
    const { LAMP_GLSL, MIX_GLSL } = await import('../src/world/bakedLamps');
    expect(LAMP_GLSL.startsWith('precision highp int;')).toBe(true);
    expect(MIX_GLSL).toContain('precision highp int;');
  });

  it("B3: the surface normal's slope step is capped at Medium's", async () => {
    const { Effect } = await import('../src/core/babylon');
    await import('../src/world/surfaceAtlas');
    const src = Effect.ShadersStore['surfaceNormalPixelShader'];
    expect(src).toBeTypeOf('string');
    expect(src).toContain('float e = min(texel, 1.0 / 512.0) * 4.0;');
  });
});
