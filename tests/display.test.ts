import { describe, expect, it } from 'vitest';
import { aspectLabel, classifyGpu, hfovDeg, hudInset, vfovFor } from '../src/core/display';

describe('ultrawide field of view', () => {
  it('is Hor+ from the 16:9 setting: same vertical angle, wider sides', () => {
    const v169 = vfovFor(75, 16 / 9, 120);
    expect(hfovDeg(v169, 16 / 9)).toBeCloseTo(75, 5);
    const v219 = vfovFor(75, 21 / 9, 120);
    expect(v219).toBeCloseTo(v169, 9);
    expect(hfovDeg(v219, 21 / 9)).toBeGreaterThan(85);
  });
  it('turns Vert- at the cap on 32:9', () => {
    const v = vfovFor(100, 32 / 9, 120);
    expect(hfovDeg(v, 32 / 9)).toBeCloseTo(120, 5);
    expect(v).toBeLessThan(vfovFor(100, 16 / 9, 120));
    // a cap under the setting never narrows 16:9
    expect(hfovDeg(vfovFor(110, 16 / 9, 90), 16 / 9)).toBeCloseTo(110, 5);
  });
});

describe('HUD width', () => {
  it('auto centres a 16:9 HUD only above 21:9', () => {
    expect(hudInset(2560, 1440, 'auto')).toBe(0);
    expect(hudInset(3440, 1440, 'auto')).toBe(0);
    expect(hudInset(7680, 2160, 'auto')).toBe(1920);
    expect(hudInset(5120, 1440, 'auto')).toBe(1280);
  });
  it('fixed widths and full', () => {
    expect(hudInset(3440, 1440, '16:9')).toBe(440);
    expect(hudInset(7680, 2160, '21:9')).toBe(1320);
    expect(hudInset(7680, 2160, 'full')).toBe(0);
    expect(hudInset(1920, 1200, '16:9')).toBe(0);
  });
});

describe('display labels and GPU check', () => {
  it('labels common aspects', () => {
    expect(aspectLabel(2560, 1600)).toBe('16:10');
    expect(aspectLabel(3440, 1440)).toBe('21:9');
    expect(aspectLabel(7680, 2160)).toBe('32:9');
    expect(aspectLabel(3840, 2160)).toBe('16:9');
  });
  it('tells the discrete GPU from the integrated one and software GL', () => {
    expect(classifyGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Laptop GPU (0x00002717) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('discrete');
    expect(classifyGpu('ANGLE (Intel, Intel(R) UHD Graphics 770 (0x00004680) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('integrated');
    expect(classifyGpu('ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('integrated');
    expect(classifyGpu('ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('discrete');
    expect(classifyGpu('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe('software');
    expect(classifyGpu('')).toBe('unknown');
  });
});
