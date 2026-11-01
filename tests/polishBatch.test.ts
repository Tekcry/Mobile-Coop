// (sector-redesign polish batch, docs/sector-redesign/checks/polish-batch.md) The pure parts of the polish fixes: the
// glass masks (blast, gadget flight, host LOS, HUD exposure), the crate event never dropped at the host's queue cap,
// the door peek's floor gap, and a round taking the nearest camera housing on its line.
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { G, MASK, glassMembership } from '../src/physics/groups';
import { MAX_EVENTS, eventQueueKeeps } from '../src/net/protocol';
import { DOOR_PEEK, doorPeekEligible, type PeekDoor } from '../src/world/doorPeek';
import { segmentHousingT } from '../src/security/camera';
import type { CameraDevice } from '../src/security/data';
import { SecuritySystem, type SecurityHost } from '../src/security/securitySystem';
import type { PlayerRef } from '../src/ai/enemy';

const clear = glassMembership('clear', false);
const frosted = glassMembership('frosted', false);
const armoured = glassMembership('clear', true);

describe('polish 14-19: glass in the remaining rays', () => {
  it('a blast and a thrown gadget stop on every pane; the grenade body does too', () => {
    for (const m of [clear, frosted, armoured]) {
      expect(MASK.BLAST & m).not.toBe(0);
      expect(MASK.GADGET_FLIGHT & m).not.toBe(0);
      expect(MASK.PROJECTILE_COLLIDE & m).not.toBe(0);
    }
    expect(MASK.BLAST & G.STATIC).not.toBe(0);
    expect(MASK.GADGET_FLIGHT & G.STATIC).not.toBe(0);
  });

  it('the host LOS of a client round stops on armour only, as the round itself (PLAYER_SHOT)', () => {
    expect(MASK.HOST_LOS & armoured).not.toBe(0);
    expect(MASK.HOST_LOS & clear).toBe(0);
    expect(MASK.HOST_LOS & frosted).toBe(0);
    for (const m of [clear, frosted, armoured]) expect((MASK.HOST_LOS & m) !== 0).toBe((MASK.PLAYER_SHOT & m) !== 0);
  });

  it('the HUD exposure ray reads guard sight: frosted blocks, clear and armoured clear see', () => {
    expect(MASK.SIGHT & frosted).not.toBe(0);
    expect(MASK.SIGHT & clear).toBe(0);
    expect(MASK.SIGHT & armoured).toBe(0);
  });
});

describe('polish 8: the host event queue never drops a crate fill', () => {
  const crate = { e: 'crate', player: 'C1', id: 's1-crate', fill: true } as const;
  const banner = { e: 'banner', title: 'x', sub: 'y' } as const;
  it('other events stop at the cap, a crate event passes it', () => {
    expect(eventQueueKeeps(0, banner)).toBe(true);
    expect(eventQueueKeeps(MAX_EVENTS * 2 - 1, banner)).toBe(true);
    expect(eventQueueKeeps(MAX_EVENTS * 2, banner)).toBe(false);
    expect(eventQueueKeeps(MAX_EVENTS * 2, crate)).toBe(true);
    expect(eventQueueKeeps(MAX_EVENTS * 5, { ...crate, fill: false })).toBe(true);
  });
});

describe('polish 3: no door peek from a walkway over the door', () => {
  const door: PeekDoor = { anchor: { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 1, height: 2.1, swing: 1, locked: false }, target: 0, cx: 0, cz: 0.5 };
  const FACE = -Math.PI / 2;
  it('on the floor it is offered; 4.4 above (a cable basket) it is not; without a height the old test holds', () => {
    expect(doorPeekEligible(door, false, 0.6, 0.5, FACE, true, false, 0)).toBe(true);
    expect(doorPeekEligible(door, false, 0.6, 0.5, FACE, true, false, DOOR_PEEK.floorGap - 0.05)).toBe(true);
    expect(doorPeekEligible(door, false, 0.6, 0.5, FACE, true, false, 4.4)).toBe(false);
    expect(doorPeekEligible(door, false, 0.6, 0.5, FACE, true, false, -4.4)).toBe(false);
    expect(doorPeekEligible(door, false, 0.6, 0.5, FACE, true, false)).toBe(true);
  });
});

describe('polish 11: a round takes the nearest camera housing on its line', () => {
  const near: CameraDevice = { id: 'near', kind: 'camera', level: 'ground', at: [0, 2], y: 2.8, facing: 0, aim: 6, reason: 't' };
  const far: CameraDevice = { ...near, id: 'far', at: [0, -2], bulletproof: true };
  const host: SecurityHost = {
    ballistics: { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) } as unknown as SecurityHost['ballistics'],
    players: () => [] as PlayerRef[],
  };
  const from = new Vector3(0, 2.8, 6);
  const to = new Vector3(0, 2.8, -6);

  it('segmentHousingT gives the entry parameter, -1 on a miss', () => {
    const t = segmentHousingT({ x: 0, y: 2.8, z: 2, yaw: 0 }, 0, 2.8, 6, 0, 2.8, -6);
    expect(t).toBeGreaterThan(0.25);
    expect(t).toBeLessThan(0.34);
    expect(segmentHousingT({ x: 0, y: 2.8, z: 2, yaw: 0 }, 1, 2.8, 6, 1, 2.8, -6)).toBe(-1);
  });

  it('a far bulletproof camera listed first no longer shields the near one', () => {
    const sys = new SecuritySystem({ devices: [far, near] }, host);
    let ric = 0;
    sys.onRicochet = () => ric++;
    expect(sys.shotRay(from, to)).toBe('near');
    expect(ric).toBe(0);
    // the near one gone, the next round ricochets off the far one
    expect(sys.shotRay(from, to)).toBeNull();
    expect(ric).toBe(1);
  });

  it('a near bulletproof camera shields a far shootable one, whatever the list order', () => {
    const sys = new SecuritySystem({ devices: [{ ...far, bulletproof: false, id: 'far2' }, { ...near, bulletproof: true }] }, host);
    expect(sys.shotRay(from, to)).toBeNull();
    expect(sys.cameras.every((c) => c.mode !== 'destroyed')).toBe(true);
  });
});
