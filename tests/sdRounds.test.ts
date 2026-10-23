import { describe, expect, it } from 'vitest';
import { addSd, sdHud, sdOpenNoise, sdStart, spendShot, type SdSlot } from '../src/weapons/sdRounds';
import type { WeaponId } from '../src/weapons/weaponDefs';

// (sd-rounds) limited suppressor ammo: a count of quiet rounds per suppressed gun; at 0 the gun fires at its open noise

const slot = (id: WeaponId, noise: number, sd: number): SdSlot => ({ def: { id }, stats: { noise }, sd });

describe('sdRounds', () => {
  it('start counts and spent noise', () => {
    expect(sdStart('rifle')).toBe(60);
    expect(sdStart('pistolSd')).toBe(45);
    expect(sdOpenNoise('pistolSd')).toBe(0.8);
    expect(sdOpenNoise('rifle')).toBe(1);
  });

  it('spendShot: a suppressed pistol is quiet until its rounds run out, then loud', () => {
    const s = slot('pistolSd', 0.35, 2);
    expect(spendShot(s, false)).toBe(0.35);
    expect(s.sd).toBe(1);
    expect(spendShot(s, false)).toBe(0.35);
    expect(s.sd).toBe(0);
    expect(spendShot(s, false)).toBe(0.8);
    expect(s.sd).toBe(0);
  });

  it('spendShot: an open gun spends nothing; a suppressed rifle spends one', () => {
    const open = slot('rifle', 1, 60);
    expect(spendShot(open, false)).toBe(1);
    expect(open.sd).toBe(60);
    const sup = slot('rifle', 0.45, 60);
    expect(spendShot(sup, false)).toBe(0.45);
    expect(sup.sd).toBe(59);
  });

  it('spendShot: infinite ammo never spends quiet rounds', () => {
    const s = slot('pistolSd', 0.35, 2);
    expect(spendShot(s, true)).toBe(0.35);
    expect(s.sd).toBe(2);
  });

  it('addSd: a pickup refills a fraction of the start count, capped; unlimited guns are unchanged', () => {
    const a = slot('pistolSd', 0.35, 0);
    addSd(a, 0.5);
    expect(a.sd).toBe(23);
    const b = slot('pistolSd', 0.35, 40);
    addSd(b, 0.5);
    expect(b.sd).toBe(45);
    const c = slot('pistolSd', 0.35, Infinity);
    addSd(c, 0.5);
    expect(c.sd).toBe(Infinity);
  });

  it('sdHud: the count for a suppressed gun with a limit, else -1', () => {
    expect(sdHud(slot('pistolSd', 0.35, 7), false)).toBe(7);
    expect(sdHud(slot('pistolSd', 0.35, 7), true)).toBe(-1);
    expect(sdHud(slot('rifle', 1, 60), false)).toBe(-1);
    expect(sdHud(slot('pistolSd', 0.35, Infinity), false)).toBe(-1);
  });
});
