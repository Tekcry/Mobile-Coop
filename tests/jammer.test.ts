import { describe, expect, it } from 'vitest';
import { ALARM_GAP, ALARM_MAX, JAMMER, LASER, deviceAlarm, distToSegment, inBox, laserCooldown, laserTouch, newJam, nextAlarm, pickJamTarget, stepJam, type JamTarget, type LaserDef } from '../src/game/jammer';

describe('held jammer charge', () => {
  it('drains while held and still, and runs dry after chargeMax seconds', () => {
    const s = newJam();
    let t = 0;
    while (stepJam(s, true, 0, 0.1) && t < 40) t += 0.1;
    expect(t).toBeGreaterThan(JAMMER.chargeMax - 0.5);
    expect(t).toBeLessThan(JAMMER.chargeMax + 0.5);
    expect(s.charge).toBe(0);
    expect(s.active).toBe(false);
  });
  it('refills when released, capped at the max, at the refill rate', () => {
    const s = newJam();
    s.charge = 5;
    stepJam(s, false, 0, 2);
    expect(s.charge).toBeCloseTo(5 + JAMMER.refill * 2);
    stepJam(s, false, 0, 100);
    expect(s.charge).toBe(JAMMER.chargeMax);
  });
  it('does not start under minStart and restarts once it has refilled to it', () => {
    const s = newJam();
    s.charge = JAMMER.minStart - 0.1;
    expect(stepJam(s, true, 0, 0.01)).toBe(false);
    s.charge = JAMMER.minStart;
    expect(stepJam(s, true, 0, 0.01)).toBe(true);
  });
  it('moving breaks the jam (the stand-still rule) and the charge refills meanwhile', () => {
    const s = newJam();
    expect(stepJam(s, true, 0, 0.1)).toBe(true);
    const c = s.charge;
    expect(stepJam(s, true, JAMMER.stillSpeed + 0.5, 0.1)).toBe(false);
    expect(s.charge).toBeGreaterThan(c);
    expect(stepJam(s, true, JAMMER.stillSpeed, 0.1)).toBe(true);
  });
  it('releasing the trigger ends it', () => {
    const s = newJam();
    stepJam(s, true, 0, 0.1);
    expect(stepJam(s, false, 0, 0.1)).toBe(false);
  });
});

describe('jam target pick', () => {
  const ts: JamTarget[] = [
    { id: 'near', kind: 'camera', x: 0, y: 0, z: 10 },
    { id: 'off', kind: 'laser', x: 8, y: 0, z: 10 },
    { id: 'far', kind: 'camera', x: 0, y: 0, z: 40 },
  ];
  it('picks the target on the aim line, ignores those off it or out of range', () => {
    expect(ts[pickJamTarget(ts, 0, 0, 0, 0, 0, 1)]!.id).toBe('near');
    expect(pickJamTarget(ts, 0, 0, 0, -1, 0, 0)).toBe(-1);
    expect(pickJamTarget([ts[2]!], 0, 0, 0, 0, 0, 1)).toBe(-1);
  });
  it('takes the smaller angle of two inside the cone', () => {
    const two: JamTarget[] = [
      { id: 'a', kind: 'camera', x: 0.8, y: 0, z: 10 },
      { id: 'b', kind: 'camera', x: 0.2, y: 0, z: 10 },
    ];
    expect(two[pickJamTarget(two, 0, 0, 0, 0, 0, 1)]!.id).toBe('b');
  });
});

describe('laser touch', () => {
  const def: LaserDef = { id: 'l', x1: 10, z1: 6, x2: 10, z2: 8, ys: [0.4, 1.0, 1.6] };
  it('segment distance', () => {
    expect(distToSegment(10, 7, 10, 6, 10, 8)).toBe(0);
    expect(distToSegment(11, 7, 10, 6, 10, 8)).toBeCloseTo(1);
    expect(distToSegment(10, 9, 10, 6, 10, 8)).toBeCloseTo(1);
  });
  it('a body crossing the beams is hit, one beside the line is not', () => {
    expect(laserTouch(def, 10.1, 0, 7, LASER.standHeight)).toBe(true);
    expect(laserTouch(def, 10.6, 0, 7, LASER.standHeight)).toBe(false);
    expect(laserTouch(def, 10, 0, 8.6, LASER.standHeight)).toBe(false);
  });
  it('a body above every beam (a jump) or a short one between them is clear', () => {
    expect(laserTouch(def, 10, 1.7, 7, LASER.standHeight)).toBe(false);
    expect(laserTouch({ ...def, ys: [1.6] }, 10, 0, 7, LASER.crouchHeight)).toBe(false);
  });
  it('floorY lifts the beams', () => {
    expect(laserTouch({ ...def, floorY: 4.4 }, 10, 0, 7, LASER.standHeight)).toBe(false);
    expect(laserTouch({ ...def, floorY: 4.4 }, 10, 4.4, 7, LASER.standHeight)).toBe(true);
  });
  it('(sector-fixes C, item 5) a break sets off the alarm on the camera path and has no damage numbers', () => {
    expect('damage' in LASER).toBe(false);
    expect('floorHp' in LASER).toBe(false);
    expect(deviceAlarm(0, 99)).toBe(1);
    expect(deviceAlarm(1, ALARM_GAP - 0.1)).toBe(-1);
    expect(deviceAlarm(ALARM_MAX, 99)).toBe(ALARM_MAX);
  });
  it('the cooldown lands one touch per LASER.cooldown seconds', () => {
    const c = { t: 0 };
    expect(laserCooldown(c, 0.1, true)).toBe(true);
    expect(laserCooldown(c, 0.1, true)).toBe(false);
    expect(laserCooldown(c, LASER.cooldown, false)).toBe(false);
    expect(laserCooldown(c, 0.1, true)).toBe(true);
  });
});

describe('alarm stage and boxes', () => {
  it('escalates and caps (never an abort)', () => {
    let s = 0;
    for (let i = 0; i < 10; i++) s = nextAlarm(s);
    expect(s).toBe(ALARM_MAX);
  });
  it('inBox is edge inclusive and order agnostic', () => {
    expect(inBox([0, 0, 4, 4], 4, 0)).toBe(true);
    expect(inBox([4, 4, 0, 0], 2, 2)).toBe(true);
    expect(inBox([0, 0, 4, 4], 4.1, 2)).toBe(false);
  });
});

describe('jam wire', () => {
  it('the jam message takes a device id or an empty release, nothing else', async () => {
    const { parseMessage } = await import('../src/net/protocol');
    expect(parseMessage({ t: 'jam', tgt: 'cam-s3' })).toEqual({ t: 'jam', tgt: 'cam-s3' });
    expect(parseMessage({ t: 'jam', tgt: '' })).toEqual({ t: 'jam', tgt: '' });
    expect(parseMessage({ t: 'jam', tgt: '<script>' })).toBeNull();
    expect(parseMessage({ t: 'jam' })).toBeNull();
  });
});

describe('ctcourse devices', () => {
  it('station 3 has a real camera blind under it and a pocket gate; station 4 a laser across the doorway', async () => {
    const { ctcourse, S3_FLAG, S3_POCKET } = await import('../src/world/maps/ctcourse');
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { camPitch, camRange, inFrame } = await import('../src/security/camera');
    const lay = ctcourse.build(new LevelBuilder(), 0);
    const cam = lay.security!.devices[0]!;
    expect(cam.kind).toBe('camera');
    const gate = lay.course!.def.bays[2]!.gates.find((g) => g.kind === 'flag');
    expect(gate && gate.kind === 'flag' && gate.flag).toBe(S3_FLAG);
    expect(lay.course!.def.externalFlags).toContain(S3_FLAG);
    // the pocket's far corner (standing head 1.7 m) is outside the camera's vertical field at every sweep angle; the approach 4 m back is inside it
    // (sector-fixes C) with the camera's own pitch and range, as its detection reads them
    const cy = cam.y;
    const pt = camPitch(cam);
    const rg = camRange(cam);
    const [x0, z0, x1, z1] = S3_POCKET.box;
    for (const x of [x0, x1]) for (const z of [z0, z1]) for (let a = 240; a <= 300; a += 10) expect(inFrame((a * Math.PI) / 180, cam.at[0], cy, cam.at[1], x, 1.7, z, pt, rg)).toBe(false);
    expect(inFrame((270 * Math.PI) / 180, cam.at[0], cy, cam.at[1], cam.at[0] - 5, 1.7, cam.at[1], pt, rg)).toBe(true);
    // its range reaches the bay's entry (x 44) and stops there, short of the airlock behind it (sector-fixes C, item 3)
    expect(rg).toBeGreaterThan(Math.hypot(cam.at[0] - 44, cam.y - 1.7));
    expect(inFrame((270 * Math.PI) / 180, cam.at[0], cy, cam.at[1], 42.5, 1.7, cam.at[1], pt, rg)).toBe(false);
    const laser = lay.lasers![0]!;
    expect(laser.ys.length).toBeGreaterThanOrEqual(3);
    // a body walking through the doorway at its centre touches it
    expect(laserTouch(laser, laser.x1 + 0.1, 0, (laser.z1 + laser.z2) / 2, LASER.standHeight)).toBe(true);
  });
  it('station 4 (B4): the band closes the whole wall gap, the far-side release switches it off, no plates or door', async () => {
    const { ctcourse, S4_FLAG, S4_GAP } = await import('../src/world/maps/ctcourse');
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const lay = ctcourse.build(new LevelBuilder(), 0);
    const laser = lay.lasers![0]!;
    expect(laser.offFlag).toBe(S4_FLAG);
    expect(Math.min(laser.z1, laser.z2)).toBeLessThanOrEqual(S4_GAP[0]);
    expect(Math.max(laser.z1, laser.z2)).toBeGreaterThanOrEqual(S4_GAP[1]);
    const c = lay.course!;
    const rel = c.devices['sw-s4-release']!;
    // the release is on the far side of the band
    expect(rel.x).toBeGreaterThan(laser.x1 + 1);
    const gate = c.def.bays[3]!.gates.find((g) => g.kind === 'pickup' && g.switchId === 'sw-s4-release');
    expect(gate && gate.kind === 'pickup' && gate.flag).toBe(S4_FLAG);
    expect(c.devices['sw-s4-a']).toBeUndefined();
    expect(c.doors['S4-door']).toBeUndefined();
  });
});
