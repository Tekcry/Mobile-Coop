import { describe, expect, it } from 'vitest';
import { GRENADE, validateWeaponDefs, WEAPONS, WEAPON_IDS } from '../src/weapons/weaponDefs';
import { computeStats, damageAt, dps, falloffMult, MAX_UPGRADE, recoilKick, playerSpreadDeg, sampleSpread, spreadDeg } from '../src/weapons/weaponStats';
import raw from '../src/config/weapons.json';

describe('weapon data', () => {
  it('all five weapons validate', () => {
    expect(Object.keys(WEAPONS).sort()).toEqual([...WEAPON_IDS].sort());
    expect(GRENADE.fuse).toBeGreaterThan(0);
  });
  it('rejects broken content', () => {
    const bad = structuredClone(raw) as Record<string, Record<string, unknown>>;
    bad.rifle!.rpm = 'fast';
    expect(() => validateWeaponDefs(bad)).toThrow(/rifle\.rpm/);
    const bad2 = structuredClone(raw) as Record<string, Record<string, unknown>>;
    bad2.rifle!.falloffEnd = 1;
    expect(() => validateWeaponDefs(bad2)).toThrow(/falloffEnd/);
  });
  it('the CT kit (G76): an automatic rifle and a semi-automatic pistol, the rifle the higher DPS', () => {
    expect(WEAPONS.rifle.fireMode).toBe('auto');
    expect(WEAPONS.pistolSd.fireMode).toBe('semi');
    const d = (id: keyof typeof WEAPONS) => dps(WEAPONS[id], computeStats(WEAPONS[id]));
    expect(d('rifle')).toBeGreaterThan(d('pistolSd'));
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
    const five = { ...WEAPONS.pistolSd, magSize: 5 };
    const s = computeStats(five, { damage: 0, magazine: 2, recoil: 0, reload: 0 });
    expect(s.magSize).toBe(7);
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

import { Health } from '../src/game/health';

describe('health', () => {
  it('health has no regeneration: 10 s of update-free time after damage leaves hp unchanged', () => {
    const h = new Health(100);
    expect(h.damage(70)).toBe(70);
    expect(h.hp).toBe(30);
    expect((h as unknown as { update?: unknown }).update).toBeUndefined();
    expect(h.hp).toBe(30);
  });
  it('damage clamps at 0, heal clamps at maxHp', () => {
    const h = new Health(100);
    expect(h.damage(40)).toBe(40);
    h.heal(500);
    expect(h.hp).toBe(100);
    expect(h.damage(250)).toBe(100);
    expect(h.hp).toBe(0);
  });
  it('dies at zero and ignores further damage', () => {
    const h = new Health(30);
    h.damage(100);
    expect(h.alive).toBe(false);
    expect(h.damage(5)).toBe(0);
  });
});

import { DRAW_DRAWING, DRAW_HOLSTERED, fireReady } from '../src/weapons/drawState';

describe('step 09: no hip fire, ADS spread', () => {
  it('no shot while holstered or raising', () => {
    expect(fireReady(DRAW_HOLSTERED, 1)).toBe(false);
    expect(fireReady(DRAW_DRAWING, 1)).toBe(false);
  });
  it('spread table: crouched still < still < moving, monotonic in speed, ADS base', () => {
    for (const id of WEAPON_IDS) {
      const def = WEAPONS[id];
      const s = computeStats(def);
      const crouchStill = playerSpreadDeg(def, s, true, 0, 0);
      const still = playerSpreadDeg(def, s, false, 0, 0);
      expect(still).toBeCloseTo(Math.min(def.maxSpread, s.spreadAds), 6);
      expect(crouchStill).toBeCloseTo(Math.min(def.maxSpread, s.spreadAds * 0.7), 6);
      expect(crouchStill).toBeLessThan(still);
      let prev = still;
      for (const v of [0.5, 1, 2, 2.8]) {
        const m = playerSpreadDeg(def, s, false, v, 0);
        expect(m).toBeGreaterThan(prev - 1e-9);
        prev = m;
      }
      expect(playerSpreadDeg(def, s, false, 2.8, 0)).toBeGreaterThan(still);
      // gear 4 cap: faster adds nothing more
      expect(playerSpreadDeg(def, s, false, 5, 0)).toBeCloseTo(playerSpreadDeg(def, s, false, 2.8, 0), 6);
      // hip-fire attachment mods do not reach the player
      const laser = computeStats(def, undefined, { damage: 1, magSize: 1, recoil: 1, spreadHip: 0.5, spreadAds: 1, adsZoom: 1, reload: 1, noise: 1 });
      expect(playerSpreadDeg(def, laser, false, 0, 0)).toBeCloseTo(still, 6);
    }
  });
});

import { G, MASK } from '../src/physics/groups';

describe('rig-pose-fix S7: ragdolls out of player rounds (audit G18)', () => {
  it('a player round passes a ragdoll (visual, per machine), as the host LOS of a client round does; it still stops on guards, props and walls', () => {
    expect(MASK.PLAYER_SHOT & G.RAGDOLL).toBe(0);
    expect(MASK.HOST_LOS & G.RAGDOLL).toBe(0);
    for (const g of [G.STATIC, G.PROP, G.ENEMY_HITBOX, G.GLASS_ARMOURED]) expect(MASK.PLAYER_SHOT & g).not.toBe(0);
  });
});
