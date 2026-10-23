import { describe, expect, it } from 'vitest';
import { OPTIC } from '../src/config/tools';
import { clampTipPitch, clampTipYaw, emptyOpticPlace, OpticCore, opticPlace, opticRefusal, opticSide } from '../src/player/opticCable';

const DEG = Math.PI / 180;
/** A 0.9 m door along +z from (0, 0, 0) (yaw 0): its normal is +x. */
const door = { hinge: { x: 0, y: 0, z: 0 }, yaw: 0, width: 0.9, locked: false };

describe('optic cable refusal (ct-toolkit 3.2)', () => {
  it('a closed, unlocked door with a clear gap takes the cable', () => {
    expect(opticRefusal(door, 0, true)).toBeNull();
  });
  it('a sealed door refuses first, whatever else holds', () => {
    expect(opticRefusal({ ...door, seal: true }, 0, true)).toBe('Sealed');
    expect(opticRefusal({ ...door, seal: true, locked: true }, 1, false)).toBe('Sealed');
  });
  it('an open door, a locked door and a blocked gap refuse', () => {
    expect(opticRefusal(door, 1, true)).toBe('Door open');
    expect(opticRefusal({ ...door, locked: true }, 0, true)).toBe('Locked');
    expect(opticRefusal(door, 0, false)).toBe('No gap');
  });
});

describe('optic cable placement', () => {
  it('the side follows the leaf normal', () => {
    expect(opticSide(door, 1, 0.4)).toBe(1);
    expect(opticSide(door, -1, 0.4)).toBe(-1);
  });
  it('kneels on the body side, the tip past the far face at floor height, looking away from the body', () => {
    const p = opticPlace({ ...door, hinge: { x: 0, y: 2, z: 0 } }, 1.2, 0.3, 0.025, emptyOpticPlace());
    expect(p.side).toBe(1);
    expect(p.kx).toBeCloseTo(OPTIC.kneel);
    expect(p.kz).toBeCloseTo(0.45);
    expect(p.tx).toBeCloseTo(-(0.025 + OPTIC.past));
    expect(p.tz).toBeCloseTo(0.45);
    expect(p.ty).toBeCloseTo(2 + OPTIC.height);
    expect(p.gx).toBeCloseTo(-0.025);
    // facing -x: atan2(-1, 0)
    expect(p.yaw).toBeCloseTo(-Math.PI / 2);
  });
  it('from the other side the tip and the look flip', () => {
    const p = opticPlace(door, -1, 0.3, 0.025, emptyOpticPlace());
    expect(p.side).toBe(-1);
    expect(p.kx).toBeCloseTo(-OPTIC.kneel);
    expect(p.tx).toBeCloseTo(0.025 + OPTIC.past);
    expect(p.yaw).toBeCloseTo(Math.PI / 2);
  });
  it('a turned door: the tip stays on the leaf middle line', () => {
    const a = { ...door, yaw: Math.PI / 2 }; // along +x, normal -z
    const p = opticPlace(a, 0.4, 1, 0.025, emptyOpticPlace());
    expect(p.side).toBe(-1);
    expect(p.tx).toBeCloseTo(0.45);
    expect(p.tz).toBeCloseTo(-(0.025 + OPTIC.past));
    expect(p.yaw).toBeCloseTo(Math.PI);
  });
});

describe('optic cable look limits', () => {
  it('yaw within +-75 deg of the centre, across the wrap', () => {
    expect(clampTipYaw(0.5, 0)).toBeCloseTo(0.5);
    expect(clampTipYaw(100 * DEG, 0)).toBeCloseTo(75 * DEG);
    expect(clampTipYaw(-100 * DEG, 0)).toBeCloseTo(-75 * DEG);
    expect(clampTipYaw(Math.PI - 0.1 + 0.3, Math.PI - 0.1)).toBeCloseTo(Math.PI + 0.2);
  });
  it('pitch from -10 to +60 deg', () => {
    expect(clampTipPitch(-0.5)).toBeCloseTo(-10 * DEG);
    expect(clampTipPitch(2)).toBeCloseTo(60 * DEG);
    expect(clampTipPitch(0.3)).toBeCloseTo(0.3);
  });
});

describe('OpticCore states', () => {
  const run = (c: OpticCore, s: number, leave = false, abort = false): void => {
    const n = Math.round(s * 60);
    for (let i = 0; i < n; i++) c.update(1 / 60, leave, abort);
  };
  it('feeds in for 1.2 s, then views; the look turns the tip within its limits', () => {
    const c = new OpticCore();
    c.place.yaw = 1;
    expect(c.start(3)).toBe(true);
    expect(c.start(4)).toBe(false);
    expect(c.door).toBe(3);
    c.look(0.3, 0.3);
    expect(c.yaw).toBe(1); // no look while feeding
    run(c, 1.1);
    expect(c.phase).toBe('feed');
    run(c, 0.15);
    expect(c.viewing).toBe(true);
    expect(c.views).toBe(1);
    // per-frame look deltas (a single delta past pi would wrap)
    for (let i = 0; i < 40; i++) c.look(0.1, 0.1);
    expect(c.yaw).toBeCloseTo(1 + OPTIC.yaw);
    expect(c.pitch).toBeCloseTo(OPTIC.pitchMax);
    for (let i = 0; i < 60; i++) c.look(-0.1, -0.1);
    expect(c.yaw).toBeCloseTo(1 - OPTIC.yaw);
    expect(c.pitch).toBeCloseTo(OPTIC.pitchMin);
  });
  it('the leave input pulls it out over 0.6 s, then idle', () => {
    const c = new OpticCore();
    c.start(0);
    run(c, 1.3);
    c.update(1 / 60, true, false);
    expect(c.phase).toBe('retract');
    expect(c.viewing).toBe(false);
    run(c, 0.5);
    expect(c.active).toBe(true);
    run(c, 0.15);
    expect(c.active).toBe(false);
    expect(c.door).toBe(-1);
  });
  it('an abort during the feed pulls it out without a view', () => {
    const c = new OpticCore();
    c.start(0);
    run(c, 0.5);
    c.update(1 / 60, false, true);
    expect(c.phase).toBe('retract');
    run(c, 1.5);
    expect(c.phase).toBe('idle');
    expect(c.views).toBe(0);
  });
});
