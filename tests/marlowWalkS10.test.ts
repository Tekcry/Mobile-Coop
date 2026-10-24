// (marlow-final S10) Michael's walk 4.72: armoured cameras from A3 on (M1) and the set restart's door reset (M3).
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { CameraDevice } from '../src/security/data';
import { SecuritySystem, type SecurityHost } from '../src/security/securitySystem';
import { CameraUnit, nearestHousing } from '../src/security/camera';
import { SectionStartState, type ResetDoor, type ResetDoors } from '../src/game/sectorReset';
import { ARMOURED_FROM_SET, armourCameras } from '../src/world/maps/ctcourseSets/types';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import type { LightRegistry } from '../src/world/lights';

const cam = (id: string, bulletproof?: boolean): CameraDevice => ({ id, kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, reason: 't', ...(bulletproof === undefined ? {} : { bulletproof }) });
const host = { ballistics: { hitDistance: () => Infinity }, players: () => [] } as unknown as SecurityHost;

/** A round along the camera's facing axis, through its housing. */
function shoot(sys: SecuritySystem, i: number): string | null {
  const c = sys.cameras[i]!;
  return sys.shotRay(new Vector3(c.x, c.y, c.z + 5), new Vector3(c.x, c.y, c.z - 5));
}

describe('armoured cameras (M1)', () => {
  it('a round through an armoured housing ricochets: no break, the ricochet hook at the housing', () => {
    const sys = new SecuritySystem({ devices: [cam('a', true)] }, host);
    const at: number[] = [];
    sys.onRicochet = (x, y, z) => at.push(x, y, z);
    expect(shoot(sys, 0)).toBeNull();
    expect(shoot(sys, 0)).toBeNull();
    expect(sys.cameras[0]!.mode).toBe('online');
    expect(sys.ricochets).toBe(2);
    expect(at.slice(0, 3)).toEqual([sys.cameras[0]!.x, sys.cameras[0]!.y, sys.cameras[0]!.z]);
  });

  it('an unarmoured camera still breaks', () => {
    const sys = new SecuritySystem({ devices: [cam('s')] }, host);
    expect(shoot(sys, 0)).toBe('s');
    expect(sys.cameras[0]!.mode).toBe('destroyed');
    expect(sys.ricochets).toBe(0);
  });

  it('the set rule: A3 on armoured, earlier sets shootable, a camera may opt out', () => {
    expect(ARMOURED_FROM_SET).toBe(3);
    expect(armourCameras('a2CarriageShed', [cam('x')])[0]!.bulletproof).toBeUndefined();
    expect(armourCameras('a3OfficeRange', [cam('x')])[0]!.bulletproof).toBe(true);
    expect(armourCameras('a8Strongroom', [cam('x', false)])[0]!.bulletproof).toBe(false);
  });

  it("Marlow Yard's cameras (A3's hall camera and every later one) are armoured", () => {
    const devs = buildCtcourse(new LevelBuilder()).layout.security!.devices;
    expect(devs.find((d) => d.id === 'cam-a3-hall')?.bulletproof).toBe(true);
    expect(devs.length).toBeGreaterThan(0);
    for (const d of devs) expect(d.bulletproof, d.id).toBe(true);
  });
});

describe('set restart doors (M3)', () => {
  interface D extends ResetDoor {
    anchor: { locked: boolean };
  }
  const mk = (target: 0 | 1, locked = false): D => ({ anchor: { locked }, target, cracked: false });
  const reg = { lights: [] } as unknown as LightRegistry;

  it('puts every unlocked door back open or shut as recorded, uncracked; leaves locked ones to the course', () => {
    const list = [mk(0), mk(1), mk(0), mk(0)];
    const doors: ResetDoors<D> = {
      list,
      setOpen: (d, open) => void (d.target = open ? 1 : 0),
      crack: (d, on) => {
        const was = d.cracked;
        d.cracked = on;
        return was !== on;
      },
    };
    const s = new SectionStartState();
    expect(s.applyDoors(doors)).toBe(0); // nothing recorded yet
    s.take(reg, doors);
    list[0]!.target = 1; // a player opened it
    list[1]!.target = 0; // a guard shut it
    list[2]!.cracked = true; // cracked open
    list[3]!.target = 1;
    list[3]!.anchor.locked = true; // the course locked it meanwhile
    expect(s.applyDoors(doors)).toBe(3);
    expect(list.map((d) => d.target)).toEqual([0, 1, 0, 1]);
    expect(list[2]!.cracked).toBe(false);
    expect(s.applyDoors(doors)).toBe(0);
    // the course's restart (`locked`): the locked door shuts as it began too
    expect(s.applyDoors(doors, true)).toBe(1);
    expect(list[3]!.target).toBe(0);
  });
});

describe('(marlow-polish) the client sparks its own round off a bulletproof housing', () => {
  it('nearestHousing (the host shotRay and the client ricochetRay pick): the first housing along the round, destroyed skipped', () => {
    const far = new CameraUnit({ ...cam('far', true), at: [0, -4] }, 0);
    const near = new CameraUnit({ ...cam('near'), at: [0, 4] }, 0);
    const list = [far, near];
    // along -z from z = 10: the near (z 4, shootable) housing first, though the far one is listed first
    expect(nearestHousing(list, near.x, near.y, 10, near.x, near.y, -10)).toBe(near);
    // from the other end: the bulletproof one first (the client sparks)
    expect(nearestHousing(list, far.x, far.y, -10, far.x, far.y, 10)?.def.bulletproof).toBe(true);
    near.destroy();
    expect(nearestHousing(list, near.x, near.y, 10, near.x, near.y, -10)).toBe(far);
    // a round past both housings: none
    expect(nearestHousing(list, 5, 3, 10, 5, 3, -10)).toBeNull();
  });
});
