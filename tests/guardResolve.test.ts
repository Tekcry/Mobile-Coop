/**
 * (guard-models G7) The guard file resolver (G4's files, else Wren's stand-in), the tint table (SPEC 8) and the
 * offline-cache url order. Pure: no Babylon.
 */
import { describe, expect, it } from 'vitest';
import { guardPlayUrls, resolveGuardAsset, resolveShieldUrls, type GuardFileData } from '../src/operators/guards/guardAssets';
import { STAND_IN_PREFIX } from '../src/operators/guards/gearMask';
import { createVariant, guardVariant } from '../src/operators/guards/guardVariant';
import { guardTints, srgbToLinear, tintByte, TINT_SLOTS } from '../src/operators/guards/guardTints';
import { FACTIONS } from '../src/ai/factions';
import { guardHelmetDrop, HELMET_STD_DROP } from '../src/ai/helmetDrops';

const WREN: [string, string, string, string] = ['/wren-hero.glb', '/wren-lod0.glb', '/wren-lod1.glb', '/wren-lod2.glb'];
const DATA: GuardFileData = { pieces: ['average', 'average-1', 'helmet_std', 'vest_soft', 'uniform'], tintSlots: 6, refHeight: 1.77 };
const files = (stem: string): Record<string, string> => ({
  [`../assets/guards/${stem}-lod0.glb`]: `/assets/${stem}-lod0-abc.glb`,
  [`../assets/guards/${stem}-lod1.glb`]: `/assets/${stem}-lod1-abc.glb`,
  [`../assets/guards/${stem}-lod2.glb`]: `/assets/${stem}-lod2-abc.glb`,
});

describe('guard file resolver', () => {
  it('no guard files: the stand-in on Wren play LODs (no hero), no problems', () => {
    const a = resolveGuardAsset('average', {}, {}, WREN);
    expect(a.standIn).toBe(true);
    expect(a.problems).toEqual([]);
    expect(a.manifest.id).toBe(`${STAND_IN_PREFIX}average`);
    expect(a.manifest.urls).toEqual(['', WREN[1], WREN[2], WREN[3]]);
    expect(a.manifest.pieces).toEqual(['average']);
  });

  it("G4's four files: the real manifest (urls by LOD, the data's pieces / slots / height)", () => {
    const a = resolveGuardAsset('average', files('guard-average'), { '../assets/guards/guard-average.json': DATA }, WREN);
    expect(a.standIn).toBe(false);
    expect(a.manifest).toEqual({
      id: 'guard-average', base: 'average', urls: ['', '/assets/guard-average-lod0-abc.glb', '/assets/guard-average-lod1-abc.glb', '/assets/guard-average-lod2-abc.glb'],
      pieces: DATA.pieces, tintSlots: 6, refHeight: 1.77,
    });
    // another base's files do not count for this one
    expect(resolveGuardAsset('lean', files('guard-average'), { '../assets/guards/guard-average.json': DATA }, WREN).standIn).toBe(true);
  });

  it('partial or invalid files: the stand-in, with the reasons', () => {
    const f = files('guard-broad');
    delete f['../assets/guards/guard-broad-lod1.glb'];
    const a = resolveGuardAsset('broad', f, { '../assets/guards/guard-broad.json': { ...DATA, pieces: ['broad'] } }, WREN);
    expect(a.standIn).toBe(true);
    expect(a.problems).toEqual(['guard-broad-lod1.glb missing']);
    const noData = resolveGuardAsset('broad', files('guard-broad'), {}, WREN);
    expect(noData.problems).toEqual(['guard-broad.json missing']);
    // the average base's pieces on the broad file: another base's body piece, and broad's own missing
    const bad = resolveGuardAsset('broad', files('guard-broad'), { '../assets/guards/guard-broad.json': DATA }, WREN);
    expect(bad.standIn).toBe(true);
    expect(bad.problems.some((p) => /body piece average is not the base broad/.test(p))).toBe(true);
    expect(bad.problems.some((p) => /body piece broad missing/.test(p))).toBe(true);
  });

  it("the shield's three files, else null (the placeholder part)", () => {
    expect(resolveShieldUrls({})).toBeNull();
    const f = files('guard-shield_riot');
    expect(resolveShieldUrls(f)).toEqual(['', '/assets/guard-shield_riot-lod0-abc.glb', '/assets/guard-shield_riot-lod1-abc.glb', '/assets/guard-shield_riot-lod2-abc.glb']);
    delete f['../assets/guards/guard-shield_riot-lod0.glb'];
    expect(resolveShieldUrls(f)).toBeNull();
  });

  it('offline warm order: every LOD2 first, then LOD0, LOD1; shared (stand-in) urls once; ?gfx=min LOD2 only', () => {
    const a = resolveGuardAsset('average', files('guard-average'), { '../assets/guards/guard-average.json': DATA }, WREN).manifest;
    const s1 = resolveGuardAsset('lean', {}, {}, WREN).manifest;
    const s2 = resolveGuardAsset('broad', {}, {}, WREN).manifest;
    expect(guardPlayUrls([a, s1, s2], false)).toEqual([a.urls[3], WREN[3], a.urls[1], WREN[1], a.urls[2], WREN[2]]);
    expect(guardPlayUrls([a, s1], true)).toEqual([a.urls[3], WREN[3]]);
  });
});

describe('guard tint table (SPEC 8)', () => {
  const slot = (name: string): number => TINT_SLOTS.indexOf(name);
  const rgb = (t: Uint8Array, name: string): number[] => Array.from(t.slice(slot(name) * 3, slot(name) * 3 + 3));
  const lin = (hex: string, i: number): number => srgbToLinear(parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255);
  const own = { torso: '#665544', helmet: '#112233' };

  it("SPEC's example: urban torso #3b4048 -> linear (0.044, 0.051, 0.065) -> tint (0.11, 0.13, 0.16), sRGB bytes", () => {
    expect([0, 1, 2].map((i) => lin('#3b4048', i))).toEqual([expect.closeTo(0.044, 3), expect.closeTo(0.051, 3), expect.closeTo(0.065, 3)]);
    const v = createVariant();
    v.jitter = 0;
    const t = guardTints(v, 'grunt', 'urban', own, new Uint8Array(18));
    expect(rgb(t, 'uniform')).toEqual([0, 1, 2].map((i) => tintByte(lin('#3b4048', i) / 0.4)));
    expect([0, 1, 2].map((i) => lin('#3b4048', i) / 0.4)).toEqual([expect.closeTo(0.11, 2), expect.closeTo(0.13, 2), expect.closeTo(0.16, 2)]);
    // decoding as the plugin does (pow 2.2) lands back on the tint within a byte's step
    const back = rgb(t, 'uniform').map((b) => (b / 255) ** 2.2);
    back.forEach((x, i) => expect(x).toBeCloseTo(lin('#3b4048', i) / 0.4, 2));
  });

  it('slot sources: faction backpack for kit; heavy / enforcer #14161a, officer his own helmet colour; kind torso for runner and officer', () => {
    const v = createVariant();
    v.jitter = 0;
    const f = FACTIONS.desert;
    const g = guardTints(v, 'grunt', 'desert', own, new Uint8Array(18));
    expect(rgb(g, 'kit')).toEqual([0, 1, 2].map((i) => tintByte(lin(f.backpack, i) / 0.4)));
    expect(rgb(g, 'headwear')).toEqual([0, 1, 2].map((i) => tintByte(lin(f.helmet, i) / 0.4)));
    expect(rgb(guardTints(v, 'heavy', 'desert', own, new Uint8Array(18)), 'headwear')).toEqual([0, 1, 2].map((i) => tintByte(lin('#14161a', i) / 0.4)));
    const o = guardTints(v, 'officer', 'desert', own, new Uint8Array(18));
    expect(rgb(o, 'headwear')).toEqual([0, 1, 2].map((i) => tintByte(lin(own.helmet, i) / 0.4)));
    expect(rgb(o, 'uniform')).toEqual([0, 1, 2].map((i) => tintByte(lin(own.torso, i) / 0.4)));
    expect(rgb(guardTints(v, 'runner', 'desert', own, new Uint8Array(18)), 'uniform')).toEqual(rgb(o, 'uniform'));
    expect(rgb(g, 'none')).toEqual([255, 255, 255]);
  });

  it('skin and hair from the variant (tone / colour over their neutral), fabric jitter +-6 %, slots past six white', () => {
    const v = guardVariant(17, 'grunt', 'ctcourse', createVariant());
    v.skinTone = 3;
    v.hairColour = 'grey';
    v.jitter = 0.06;
    const t = guardTints(v, 'grunt', 'urban', own, new Uint8Array(24));
    expect(rgb(t, 'skin')).toEqual([0.17, 0.07, 0.035].map((x) => tintByte(x / 0.75)));
    expect(rgb(t, 'hair')).toEqual([0.58, 0.57, 0.55].map((x) => tintByte(x / 0.6)));
    expect(rgb(t, 'uniform')).toEqual([0, 1, 2].map((i) => tintByte((lin(FACTIONS.urban.torso, i) / 0.4) * 1.06)));
    expect(Array.from(t.slice(18))).toEqual([255, 255, 255, 255, 255, 255]);
  });
});

describe("the figure's dropped helmet (A6)", () => {
  it("helmet_std's drop box (G3) scaled to the guard's height, for every kind", () => {
    expect(guardHelmetDrop(HELMET_STD_DROP.refHeight, [0, 0, 0])).toEqual([HELMET_STD_DROP.w, HELMET_STD_DROP.h, HELMET_STD_DROP.d]);
    const d = guardHelmetDrop(1.83, [0, 0, 0]);
    expect(d[0]).toBeCloseTo(HELMET_STD_DROP.w * (1.83 / 1.77), 9);
  });
});
