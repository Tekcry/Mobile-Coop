import { describe, expect, it } from 'vitest';
import { WEAPONS, WEAPON_IDS, modelExtents, type ModelPart, type WeaponId } from '../src/weapons/weaponDefs';
import { assignCarrySlots, carryKind, isBackSlot } from '../src/weapons/carrySlots';

/** Weapon-local extents of one part, as [min, max] per axis. */
function extents(p: ModelPart): { x: [number, number]; y: [number, number]; z: [number, number] } {
  const e = modelExtents({ model: [p] });
  return { x: [e.x0, e.x1], y: [e.y0, e.y1], z: [e.z0, e.z1] };
}

function dims(id: WeaponId): { length: number; height: number; barrel: number; receiver: number } {
  const m = WEAPONS[id].model;
  const e = modelExtents(WEAPONS[id]);
  const barrel = m.find((p) => p.role === 'barrel');
  const receiver = m.find((p) => p.role === 'receiver');
  return { length: e.z1 - e.z0, height: e.y1 - e.y0, barrel: barrel?.size[0] ?? 0, receiver: receiver?.size[0] ?? 0 };
}

// realistic sizes (m): length, barrel diameter, receiver width, height with the magazine (sniper: with scope)
const REAL: Record<WeaponId, [number, number, number, number]> = {
  rifle: [0.84, 0.016, 0.055, 0.24],
  smg: [0.6, 0.014, 0.05, 0.22],
  shotgun: [1.0, 0.022, 0.06, 0.18],
  sniper: [1.15, 0.02, 0.06, 0.2],
  pistol: [0.19, 0.012, 0.03, 0.14],
};

describe('weapon dimensions', () => {
  for (const id of WEAPON_IDS) {
    it(`${id}: realistic length, barrel, receiver and height`, () => {
      const d = dims(id);
      const [len, bar, rec, h] = REAL[id];
      expect(Math.abs(d.length - len)).toBeLessThanOrEqual(len * 0.03);
      expect(Math.abs(d.barrel - bar)).toBeLessThanOrEqual(0.001);
      expect(Math.abs(d.receiver - rec)).toBeLessThanOrEqual(0.002);
      expect(Math.abs(d.height - h)).toBeLessThanOrEqual(h * 0.05);
    });
  }
  it('the muzzle sits at the front of the barrel; the hands sit on the grip and the support point', () => {
    for (const id of WEAPON_IDS) {
      const w = WEAPONS[id];
      const barrel = extents(w.model.find((p) => p.role === 'barrel')!);
      expect(Math.abs(w.muzzle[2] - barrel.z[1])).toBeLessThan(0.02);
      // trigger hand inside the pistol grip part (within 2 cm)
      const g = extents(w.model.find((p) => p.role === 'grip')!);
      const inside = (v: number, r: [number, number]): number => (v < r[0] ? r[0] - v : v > r[1] ? v - r[1] : 0);
      expect(Math.hypot(inside(w.grip[1], g.y), inside(w.grip[2], g.z))).toBeLessThan(0.02);
      // support hand on the gun (within 2 cm of some part; the pistol's cups the grip)
      const near = Math.min(...w.model.map((p) => {
        const e = extents(p);
        return Math.hypot(inside(w.foregrip[0], e.x), inside(w.foregrip[1], e.y), inside(w.foregrip[2], e.z));
      }));
      expect(near).toBeLessThan(0.025);
    }
  });
});

describe('carry slots', () => {
  const item = (id: WeaponId) => ({ cls: WEAPONS[id].class, length: dims(id).length });
  it('kinds: long guns, compact SMG, pistol', () => {
    expect(carryKind('rifle')).toBe('long');
    expect(carryKind('sniper')).toBe('long');
    expect(carryKind('shotgun')).toBe('long');
    expect(carryKind('smg')).toBe('compact');
    expect(carryKind('pistol')).toBe('pistol');
  });
  it('rifle + pistol: the rifle centred on the back, the pistol on the thigh', () => {
    expect(assignCarrySlots([item('rifle'), item('pistol')])).toEqual(['backC', 'thigh']);
  });
  it('SMG + pistol: side sling and thigh', () => {
    expect(assignCarrySlots([item('smg'), item('pistol')])).toEqual(['sling', 'thigh']);
  });
  it('two long guns go left and right', () => {
    expect(assignCarrySlots([item('shotgun'), item('rifle')])).toEqual(['backL', 'backR']);
  });
  it('the full Free Roam loadout: every weapon has its own slot, the longest in the centre', () => {
    const ids: WeaponId[] = ['rifle', 'smg', 'shotgun', 'sniper', 'pistol'];
    const s = assignCarrySlots(ids.map(item));
    expect(new Set(s).size).toBe(5);
    expect(s).not.toContain(null);
    expect(s[ids.indexOf('sniper')]).toBe('backC');
    expect(s[ids.indexOf('smg')]).toBe('sling');
    expect(s[ids.indexOf('pistol')]).toBe('thigh');
    expect(isBackSlot(s[ids.indexOf('rifle')]!) && isBackSlot(s[ids.indexOf('shotgun')]!)).toBe(true);
  });
  it('a second compact or pistol falls back to a free slot', () => {
    expect(assignCarrySlots([item('pistol'), item('pistol')])).toEqual(['thigh', 'sling']);
    expect(assignCarrySlots([item('smg'), item('smg')])).toEqual(['sling', 'backR']);
  });
});
