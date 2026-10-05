import { describe, expect, it } from 'vitest';
import { GRENADE, validateWeaponDefs, WEAPONS, WEAPON_IDS } from '../src/weapons/weaponDefs';
import { computeStats, damageAt, dps, falloffMult, MAX_UPGRADE, recoilKick, sampleSpread, spreadDeg } from '../src/weapons/weaponStats';
import raw from '../src/config/weapons.json';

describe('weapon data', () => {
  it('all five weapons validate', () => {
    expect(Object.keys(WEAPONS).sort()).toEqual([...WEAPON_IDS].sort());
    expect(GRENADE.fuse).toBeGreaterThan(0);
  });
  it('rejects broken content', () => {
    const bad = structuredClone(raw) as Record<string, Record<string, unknown>>;
    bad.smg!.rpm = 'fast';
    expect(() => validateWeaponDefs(bad)).toThrow(/smg\.rpm/);
    const bad2 = structuredClone(raw) as Record<string, Record<string, unknown>>;
    bad2.rifle!.falloffEnd = 1;
    expect(() => validateWeaponDefs(bad2)).toThrow(/falloffEnd/);
  });
  it('roles: shotgun fires pellets, sniper is a projectile and hits hardest per shot', () => {
    expect(WEAPONS.shotgun.pellets).toBeGreaterThan(1);
    expect(WEAPONS.sniper.kind).toBe('projectile');
    const perShot = (id: keyof typeof WEAPONS) => WEAPONS[id].damage * WEAPONS[id].pellets;
    for (const id of WEAPON_IDS) if (id !== 'sniper') expect(perShot('sniper')).toBeGreaterThan(perShot(id));
  });
  it('SMG has the highest close range DPS, pistol the lowest of the automatics/primary', () => {
    const d = (id: keyof typeof WEAPONS) => dps(WEAPONS[id], computeStats(WEAPONS[id]));
    expect(d('smg')).toBeGreaterThan(d('rifle'));
    expect(d('rifle')).toBeGreaterThan(d('pistol'));
  });
});

describe('weapon stats maths', () => {
  const rifle = WEAPONS.rifle;
  it('falloff is 1 before start, min after end, linear between', () => {
    expect(falloffMult(rifle, 0)).toBe(1);
    expect(falloffMult(rifle, rifle.falloffStart)).toBe(1);
    expect(falloffMult(rifle, 1000)).toBe(rifle.minDamageMult);
    const mid = (rifle.falloffStart + rifle.falloffEnd) / 2;
    expect(falloffMult(rifle, mid)).toBeCloseTo((1 + rifle.minDamageMult) / 2);
  });
  it('headshots multiply damage', () => {
    const s = computeStats(rifle);
    expect(damageAt(rifle, s, 5, true)).toBeCloseTo(rifle.damage * rifle.headMult);
  });
  it('upgrades apply per level and clamp at max', () => {
    const base = computeStats(rifle);
    const up = computeStats(rifle, { damage: 2, magazine: 1, recoil: 5, reload: 3 });
    expect(up.damage).toBeCloseTo(base.damage * 1.12);
    expect(up.magSize).toBe(base.magSize + 3);
    expect(up.recoilPitch).toBeCloseTo(base.recoilPitch * 0.6);
    expect(up.reloadTime).toBeCloseTo(base.reloadTime * 0.79);
    const over = computeStats(rifle, { damage: 99, magazine: -3, recoil: 0, reload: 0 });
    expect(over.damage).toBeCloseTo(base.damage * (1 + 0.06 * MAX_UPGRADE));
    expect(over.magSize).toBe(base.magSize);
  });
  it('small magazines still gain at least one round per level', () => {
    const s = computeStats(WEAPONS.sniper, { damage: 0, magazine: 2, recoil: 0, reload: 0 });
    expect(s.magSize).toBe(WEAPONS.sniper.magSize + 2);
  });
  it('spread: ADS tighter than hip, movement and bloom widen, capped', () => {
    const s = computeStats(rifle);
    expect(spreadDeg(rifle, s, 1, 0, 0)).toBeLessThan(spreadDeg(rifle, s, 0, 0, 0));
    expect(spreadDeg(rifle, s, 0, 1, 0)).toBeGreaterThan(spreadDeg(rifle, s, 0, 0, 0));
    expect(spreadDeg(rifle, s, 0, 1, 100)).toBe(rifle.maxSpread);
  });
  it('recoil pattern cycles', () => {
    const s = computeStats(rifle);
    const n = rifle.recoilPattern.length;
    expect(recoilKick(rifle, s, n)).toEqual(recoilKick(rifle, s, 0));
  });
  it('spread samples stay inside the cone', () => {
    const t = Math.tan((3 * Math.PI) / 180);
    for (let i = 0; i < 50; i++) {
      const v = sampleSpread(3, Math.random(), Math.random());
      expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(t + 1e-9);
    }
  });
});

import { computeAssist } from '../src/weapons/aimAssist';
import { Health } from '../src/game/health';

describe('aim assist', () => {
  const near = [{ yaw: 0.03, pitch: 0, distance: 15 }];
  it('off does nothing', () => {
    expect(computeAssist('off', 0, 0, near, 1, true, true, 1 / 60)).toEqual({ lookScale: 1, dYaw: 0, dPitch: 0, target: -1 });
  });
  it('slows look near a target and pulls towards it while moving', () => {
    const r = computeAssist('standard', 0, 0, near, 0.5, false, false, 1 / 60);
    expect(r.lookScale).toBeLessThan(1);
    expect(r.dYaw).toBeGreaterThan(0);
    expect(r.dYaw).toBeLessThan(0.03);
  });
  it('no pull without input or movement', () => {
    const r = computeAssist('standard', 0, 0, near, 0, false, false, 1 / 60);
    expect(r.dYaw).toBe(0);
  });
  it('snaps on ADS within cone, ignores far-off targets', () => {
    expect(computeAssist('high', 0, 0, near, 0, false, true, 1 / 60).dYaw).toBeCloseTo(0.03 * 0.85);
    const far = [{ yaw: 1.2, pitch: 0, distance: 10 }];
    expect(computeAssist('high', 0, 0, far, 1, true, true, 1 / 60).target).toBe(-1);
  });
  it('higher levels assist more', () => {
    const lo = computeAssist('low', 0, 0, near, 1, true, false, 1 / 60);
    const hi = computeAssist('high', 0, 0, near, 1, true, false, 1 / 60);
    expect(hi.dYaw).toBeGreaterThan(lo.dYaw);
    expect(hi.lookScale).toBeLessThan(lo.lookScale);
  });
});

describe('health and shield', () => {
  it('shield absorbs first and regenerates after a delay', () => {
    const h = new Health(100, 50, 4, 25);
    expect(h.damage(70)).toBe(70);
    expect(h.shield).toBe(0);
    expect(h.hp).toBe(80);
    h.update(3);
    expect(h.shield).toBe(0);
    h.update(1.5);
    expect(h.shield).toBeGreaterThan(0);
    h.update(10);
    expect(h.shield).toBe(50);
  });
  it('dies at zero and ignores further damage', () => {
    const h = new Health(30);
    h.damage(100);
    expect(h.alive).toBe(false);
    expect(h.damage(5)).toBe(0);
  });
});
