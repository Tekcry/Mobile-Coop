import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LightRegistry } from '../src/world/lights';
import { SectionStartState, type ResetDoor, type ResetDoors } from '../src/game/sectorReset';
import { strikeTargetable } from '../src/game/elbowStrike';
import { ENEMIES } from '../src/ai/enemyDefs';
import { ENEMY_KINDS } from '../src/ai/enemyDefs';
import { WIRE_CAMERAS, liveCameraPeak, validateSecurity, type CameraDevice } from '../src/security/data';
import { SECURITY_LIMITS } from '../src/config/security';

// (sector-redesign slice 0) engine prerequisites: restart resets lamps and doors (G22), dogs cannot be palm-struck
// (G20 / G42), the camera cap per live section (G1)

interface TDoor extends ResetDoor {
  anchor: { locked: boolean };
}
function doors(n: number): ResetDoors<TDoor> & { list: TDoor[] } {
  const list: TDoor[] = Array.from({ length: n }, () => ({ anchor: { locked: false }, target: 0 as 0 | 1, cracked: false }));
  return {
    list,
    setOpen: (d, open) => {
      d.target = open ? 1 : 0;
    },
    crack: (d, on) => {
      if (d.cracked === on) return false;
      d.cracked = on;
      return true;
    },
  };
}

describe('SectionStartState (G22: a section restart resets lamps and doors)', () => {
  it('puts back switched, shot and jammed lamps and open / shut / cracked doors; leaves locked doors and torches', () => {
    const reg = new LightRegistry();
    const a = reg.add({ x: 0, y: 3, z: 0, group: 1 });
    const b = reg.add({ x: 5, y: 3, z: 0, group: 1 });
    const c = reg.add({ x: 9, y: 3, z: 0 });
    const off = reg.add({ x: 12, y: 3, z: 0, on: false });
    const torch = reg.add({ x: 0, y: -50, z: 0, kind: 'flashlight', on: false });
    const ds = doors(4);
    ds.list[1]!.target = 1;
    const st = new SectionStartState();
    // nothing recorded yet: nothing to put back
    expect(st.apply(reg, ds)).toEqual({ lights: 0, doors: 0 });
    st.take(reg, ds);
    // the section is played: a circuit switched off, a lamp shot, a jam running on the off lamp... and back on
    reg.setGroup(1, false);
    reg.destroy(c.id);
    reg.jamStart(off.id);
    reg.jamLit(off.id, false);
    reg.setOn(torch.id, true);
    ds.list[0]!.target = 1;
    ds.list[1]!.target = 0;
    ds.list[2]!.cracked = true;
    ds.list[3]!.anchor.locked = true;
    ds.list[3]!.target = 0;
    const r = st.apply(reg, ds);
    expect(r).toEqual({ lights: 3, doors: 3 });
    expect([a.on, b.on, c.on, c.destroyed]).toEqual([true, true, true, false]);
    // the jammed lamp keeps the jam's dark until it ends, then takes its start state (off)
    expect(off.on).toBe(false);
    reg.jamEnd(off.id);
    expect(off.on).toBe(false);
    // the guard's torch is the guards' (not recorded)
    expect(torch.on).toBe(true);
    expect(ds.list.map((d) => d.target)).toEqual([0, 1, 0, 0]);
    expect(ds.list[2]!.cracked).toBe(false);
    // a second restart with nothing changed puts back nothing
    expect(st.apply(reg, ds)).toEqual({ lights: 0, doors: 0 });
  });

  it('a lamp on at the start but jammed dark at the restart comes back on when the jam ends', () => {
    const reg = new LightRegistry();
    const l = reg.add({ x: 0, y: 3, z: 0, group: 2 });
    const st = new SectionStartState();
    st.take(reg, doors(0));
    reg.jamStart(l.id);
    reg.jamLit(l.id, false);
    reg.setGroup(2, false);
    st.apply(reg, doors(0));
    expect(l.on).toBe(false);
    reg.jamEnd(l.id);
    expect(l.on).toBe(true);
  });

  it('a lamp shot out before the section began stays out', () => {
    const reg = new LightRegistry();
    const l = reg.add({ x: 0, y: 3, z: 0 });
    reg.destroy(l.id);
    const st = new SectionStartState();
    st.take(reg, doors(0));
    expect(st.apply(reg, doors(0))).toEqual({ lights: 0, doors: 0 });
    expect(l.destroyed).toBe(true);
  });
});

describe('palm strike targets (G42, G20)', () => {
  it('every human guard can be struck; a dog never', () => {
    for (const k of ENEMY_KINDS) expect(strikeTargetable(ENEMIES[k]), k).toBe(k !== 'dog');
  });
});

describe('camera cap per live section (G1)', () => {
  const cam = (id: string, section?: number): CameraDevice => ({ id, kind: 'camera', level: 'g', at: [0, 0], y: 3, facing: 0, reason: 'r', ...(section !== undefined ? { section } : {}) });
  it('counts untagged cameras plus the busiest section', () => {
    expect(liveCameraPeak([])).toBe(0);
    expect(liveCameraPeak([cam('a'), cam('b', 0), cam('c', 0), cam('d', 1)])).toBe(3);
  });

  it('12 per section passes where 12 per map did not; 13 in one section, or more than the wire carries, fails', () => {
    expect(SECURITY_LIMITS.cameras).toBe(12);
    const two = [...Array.from({ length: 8 }, (_, i) => cam(`a${i}`, 0)), ...Array.from({ length: 8 }, (_, i) => cam(`b${i}`, 1))];
    expect(validateSecurity({ devices: two })).toEqual([]);
    const one = Array.from({ length: 13 }, (_, i) => cam(`c${i}`, 0));
    expect(validateSecurity({ devices: one }).join()).toMatch(/SN60/);
    const wide = Array.from({ length: 17 }, (_, i) => cam(`w${i}`, i % 5));
    expect(validateSecurity({ devices: wide }).join()).toMatch(/co-op wire/);
  });

  it('the wire limit mirrors the protocol (SEC_CAMS)', () => {
    const src = readFileSync(new URL('../src/net/protocol.ts', import.meta.url), 'utf8');
    const m = /const SEC_CAMS = (\d+);/.exec(src);
    expect(m && Number(m[1])).toBe(WIRE_CAMERAS);
  });
});
