// (sector-redesign E8, A95 / A96: stealth over shooting) Bulletproof and thermal cameras: a round ricochets off a
// bulletproof housing and the camera stays live; jam, desk and console (power) still blind it; a thermal camera sees
// exactly as today's IR camera (the lamps never mattered), only its LED differs (render, not tested here).
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { CAMERA } from '../src/config/security';
import { CameraUnit } from '../src/security/camera';
import { validateSecurity, type CameraDevice } from '../src/security/data';
import { SecuritySystem, cameraSight, type SecurityEvent, type SecurityHost } from '../src/security/securitySystem';
import { deskCamMode, DESK_LOOP, DESK_OFF } from '../src/game/sectorDesks';
import { cameraOff } from '../src/game/course/securityRoom';
import type { PlayerRef } from '../src/ai/enemy';

const base: CameraDevice = { id: 'c', kind: 'camera', level: 'ground', at: [0, 0], y: 2.8, facing: 0, aim: 6, reason: 't' };
const armoured: CameraDevice = { ...base, id: 'armoured', bulletproof: true };
const thermal: CameraDevice = { ...base, id: 'thermal', thermal: true };
const open = { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) };

/** A walking body 8 m in front of the cameras (inside their 12 m range). */
function player(): PlayerRef {
  return {
    id: 'local',
    feet: new Vector3(0, 0, 8),
    speed: 1.3,
    crouched: false,
    target: { alive: true, headPoint: (v: Vector3) => v.set(0, 1.6, 8), aimPoint: (v: Vector3) => v.set(0, 1.6, 8) },
  } as unknown as PlayerRef;
}

function system(devs: CameraDevice[]): { sys: SecuritySystem; events: SecurityEvent[]; ricochets: number[][] } {
  const host: SecurityHost = { ballistics: open as unknown as SecurityHost['ballistics'], players: () => [player()] };
  const sys = new SecuritySystem({ devices: devs }, host);
  const events: SecurityEvent[] = [];
  const ricochets: number[][] = [];
  sys.onEvent = (e) => events.push(e);
  sys.onRicochet = (x, y, z) => ricochets.push([x, y, z]);
  return { sys, events, ricochets };
}

/** A round straight down the facing axis through the housing at (0, 2.8, 0). */
const shoot = (sys: SecuritySystem): string | null => sys.shotRay(new Vector3(0, 2.8, 5), new Vector3(0, 2.8, -5));

describe('(E8) bulletproof cameras', () => {
  it('a bulletproof camera survives a hit: no destroy, no cameraDown, a ricochet at the lens, still seeing', () => {
    const { sys, events, ricochets } = system([armoured]);
    for (let i = 0; i < 5; i++) expect(shoot(sys)).toBeNull();
    const c = sys.cameras[0]!;
    expect(c.mode).toBe('online');
    expect(c.sees).toBe(true);
    expect(events.filter((e) => e.kind === 'cameraDown')).toEqual([]);
    expect(ricochets.length).toBe(5);
    expect(ricochets[0]).toEqual([c.x, c.y, c.z]);
    // it keeps watching: the meter fills on the body in front of it
    sys.fixedUpdate(1 / CAMERA.thinkHz);
    expect(sys.meterOf('armoured', 'local')!.meter).toBeGreaterThan(0);
  });

  it('a normal camera still breaks on a hit (cameraDown, blind, no ricochet)', () => {
    const { sys, events, ricochets } = system([base]);
    expect(shoot(sys)).toBe('c');
    expect(sys.cameras[0]!.mode).toBe('destroyed');
    expect(events.some((e) => e.kind === 'cameraDown' && e.camera === 'c')).toBe(true);
    expect(ricochets).toEqual([]);
  });

  it('a round that misses the housing does nothing to either kind', () => {
    const { sys, ricochets } = system([armoured]);
    expect(sys.shotRay(new Vector3(0.4, 2.8, 5), new Vector3(0.4, 2.8, -5))).toBeNull();
    expect(ricochets).toEqual([]);
  });

  it('the jammer, a desk loop / off and a console power-off still blind a bulletproof camera', () => {
    const c = new CameraUnit(armoured, 0);
    const head = new Vector3(0, 1.6, 8);
    expect(cameraSight(c, head, false, 1.3, open)).toBeGreaterThan(0);
    // jammed (ctDevices.applyJam: a jam phase is the blind input), a desk off, a console flag set: off
    expect(deskCamMode(true, 0)).toBe('off');
    expect(deskCamMode(false, DESK_OFF)).toBe('off');
    expect(cameraOff({ ...armoured, offFlag: 'power' }, (f) => f === 'power')).toBe(true);
    c.setMode('off');
    expect(c.sees).toBe(false);
    expect(cameraSight(c, head, false, 1.3, open)).toBe(0);
    c.setMode(deskCamMode(false, DESK_LOOP));
    expect(c.mode).toBe('looped');
    expect(cameraSight(c, head, false, 1.3, open)).toBe(0);
    c.setMode('online');
    expect(cameraSight(c, head, false, 1.3, open)).toBeGreaterThan(0);
  });

  it('the host never lists a shot bulletproof camera as destroyed (no wire change: the client mirrors the host)', () => {
    const { sys } = system([armoured, { ...base, id: 'plain', at: [5, 0] }]);
    shoot(sys);
    sys.shotRay(new Vector3(5, 2.8, 5), new Vector3(5, 2.8, -5));
    // ctDevices.destroyedIds reads exactly this: the cameras in mode 'destroyed'
    expect(sys.cameras.filter((c) => c.mode === 'destroyed').map((c) => c.def.id)).toEqual(['plain']);
  });
});

describe('(E8) thermal cameras', () => {
  it('a thermal camera sees exactly as an IR one: same rate, same meter (lamps never enter the camera test)', () => {
    const a = new CameraUnit(base, 0);
    const b = new CameraUnit(thermal, 0);
    for (const z of [3, 6, 9, 11.5]) {
      const head = new Vector3(0, 1.6, z);
      expect(cameraSight(b, head, false, 1.3, open)).toBe(cameraSight(a, head, false, 1.3, open));
      expect(cameraSight(b, head, true, 0, open)).toBe(cameraSight(a, head, true, 0, open));
    }
    const plain = system([base]).sys;
    const hot = system([thermal]).sys;
    for (let i = 0; i < 6; i++) {
      plain.fixedUpdate(1 / CAMERA.thinkHz);
      hot.fixedUpdate(1 / CAMERA.thinkHz);
    }
    expect(hot.meterOf('thermal', 'local')!.meter).toBe(plain.meterOf('c', 'local')!.meter);
  });

  it('the flags pass security validation', () => {
    expect(validateSecurity({ devices: [armoured, { ...thermal, bulletproof: true, id: 'both' }] })).toEqual([]);
  });
});
