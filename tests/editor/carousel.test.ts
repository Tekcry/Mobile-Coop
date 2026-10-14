import { describe, expect, it } from 'vitest';
import { carAxis, carFamilies, carNextFamily, carNextVersion, carouselFade, carouselSlots, carouselWindow, carWhere, wrapIndex } from '../../src/editor/carousel';
import { groupFittings } from '../../src/editor/lightCatalogue';
import { groupPresets } from '../../src/editor/catalogue';
import { catEntry, familyTypes } from '../../src/editor/openingCatalogue';
import { SEC_TOOLS } from '../../src/editor/securityCatalogue';

describe('type carousel (Michael 2026-10-14)', () => {
  it('wraps indices both ways', () => {
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(12, 5)).toBe(2);
    expect(wrapIndex(3, 0)).toBe(0);
  });

  it('fits an odd number of items in one row, the lit one wider, at least one, at most the max', () => {
    expect(carouselSlots(1000, 118, 4, 7)).toBe(7);
    expect(carouselSlots(600, 118, 4, 7)).toBe(3);
    expect(carouselSlots(610, 118, 4, 7)).toBe(5);
    expect(carouselSlots(50, 118, 4, 7)).toBe(1);
    // the lit one up to 300 px: 300 + 2 x 2 x 136 = 844 takes five, not seven
    expect(carouselSlots(844, 132, 4, 7, 300)).toBe(5);
    expect(carouselSlots(843, 132, 4, 7, 300)).toBe(3);
    expect(carouselSlots(5000, 132, 4, 8, 300)).toBe(7);
  });

  it('centres the current item with as many neighbours each side, wrapping', () => {
    expect(carouselWindow(10, 0, 5)).toEqual([
      { i: 8, off: -2 },
      { i: 9, off: -1 },
      { i: 0, off: 0 },
      { i: 1, off: 1 },
      { i: 2, off: 2 },
    ]);
    expect(carouselWindow(10, 9, 3).map((s) => s.i)).toEqual([8, 9, 0]);
    expect(carouselWindow(10, -1, 3).map((s) => s.i)).toEqual([8, 9, 0]);
    // an even slot count still centres (one less)
    expect(carouselWindow(10, 0, 4).map((s) => s.off)).toEqual([-1, 0, 1]);
  });

  it('a short odd list shows each item once; a short even one the opposite item at both ends, still centred', () => {
    expect(carouselWindow(3, 1, 7).map((s) => s.i)).toEqual([0, 1, 2]);
    expect(carouselWindow(2, 0, 7)).toEqual([
      { i: 1, off: -1 },
      { i: 0, off: 0 },
      { i: 1, off: 1 },
    ]);
    expect(carouselWindow(4, 1, 7).map((s) => s.i)).toEqual([3, 0, 1, 2, 3]);
    expect(carouselWindow(1, 0, 7)).toEqual([{ i: 0, off: 0 }]);
    expect(carouselWindow(0, 0, 7)).toEqual([]);
  });

  it('greys the neighbours and fades toward the ends, the centre full', () => {
    expect(carouselFade(0, 3)).toBe(1);
    expect(carouselFade(1, 3)).toBe(0.8);
    expect(carouselFade(1, 3)).toBeGreaterThan(carouselFade(2, 3));
    expect(carouselFade(-2, 3)).toBe(carouselFade(2, 3));
    expect(carouselFade(3, 3)).toBe(0.3);
    expect(carouselFade(9, 3)).toBe(0.3);
    expect(carouselFade(1, 1)).toBe(0.8);
  });

  it('groups entries into families by series, in first-appearance order', () => {
    expect(carFamilies(['a', undefined, 'a', 'b', undefined, 'b'])).toEqual([[0, 2], [1], [3, 5], [4]]);
    expect(carFamilies([])).toEqual([]);
    const fams = [[0, 2], [1], [3, 5], [4]];
    expect(carWhere(fams, 5)).toEqual({ f: 2, v: 1 });
    expect(carWhere(fams, 9)).toEqual({ f: 0, v: 0 });
    // left / right: the next family's first version, wrapping
    expect(carNextFamily(fams, 2, 1)).toBe(1);
    expect(carNextFamily(fams, 0, -1)).toBe(4);
    // up / down: the next version in the family, wrapping; one version stays
    expect(carNextVersion(fams, 0, 1)).toBe(2);
    expect(carNextVersion(fams, 2, 1)).toBe(0);
    expect(carNextVersion(fams, 3, -1)).toBe(5);
    expect(carNextVersion(fams, 1, 1)).toBe(1);
    expect(carAxis(2, 5)).toBe('version');
    expect(carAxis(1, 5)).toBe('group');
    expect(carAxis(1, 0)).toBeNull();
  });

  it("derives the catalogues' families from their data", () => {
    const fam = (keys: (string | undefined)[], names: string[]): string[][] => carFamilies(keys).filter((m) => m.length > 1).map((m) => m.map((i) => names[i]!));
    const interior = groupFittings('interior');
    expect(fam(interior.map((f) => f.series), interior.map((f) => f.name))).toEqual([['Troffer 600 x 600', 'Troffer 1200 x 300']]);
    const plant = groupFittings('plant');
    expect(fam(plant.map((f) => f.series), plant.map((f) => f.name))).toEqual([['Round bulkhead', 'Oval bulkhead']]);
    const goods = groupPresets('goodsIn');
    expect(fam(goods.map((p) => p.series), goods.map((p) => p.name))).toEqual([['Pallet', 'Pallet stack'], ['Crate 1.0 m', 'Crate 1.2 m']]);
    const yard = groupPresets('yard');
    expect(fam(yard.map((p) => p.series), yard.map((p) => p.name))).toEqual([['Wheelie bin 240 L', 'Bulk bin 1100 L']]);
    const doors = familyTypes('door');
    expect(fam(doors.map((t) => catEntry(t).series), doors.map((t) => catEntry(t).name))).toEqual([['Sliding glass door (automatic)', 'Sliding glass door (card)']]);
    const wins = familyTypes('window');
    expect(fam(wins.map((t) => catEntry(t).series), wins.map((t) => catEntry(t).name))).toEqual([['Fixed window', 'Frosted fixed window']]);
    expect(fam(SEC_TOOLS.map((t) => t.kind), SEC_TOOLS.map((t) => t.name))).toEqual([['Fixed camera', 'Pan camera'], ['Card reader', 'Keypad']]);
  });
});
