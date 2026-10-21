import { describe, expect, it } from 'vitest';
import {
  ALARM_MAX,
  DEV_IDLE,
  DEV_JAMMED,
  DEV_RECOVER,
  JAMMER,
  JAM_LIGHT,
  LASER,
  advanceDevJam,
  distToSegment,
  flickerLit,
  inBox,
  jamHudText,
  jamLeft,
  laserCooldown,
  laserDamage,
  laserTouch,
  lightLit,
  newDevJam,
  newJam,
  nextAlarm,
  pickJamTarget,
  recoverTime,
  stepDevJam,
  stepJam,
  type JamTarget,
  type LaserDef,
} from '../src/game/jammer';

const DT = 1 / 60;

describe('jammer use and cooldown (marlow-jammer J1: 5 s use, 5 s cooldown)', () => {
  it('a held jam lasts useMax seconds, then the cooldown runs and nothing jams until it ends', () => {
    const s = newJam();
    let t = 0;
    while (stepJam(s, true, 0, DT) && t < 20) t += DT;
    expect(t).toBeGreaterThan(JAMMER.useMax - 0.05);
    expect(t).toBeLessThan(JAMMER.useMax + 0.05);
    expect(s.active).toBe(false);
    expect(s.cool).toBeCloseTo(JAMMER.cooldown, 5);
    let c = 0;
    while (!stepJam(s, true, 0, DT) && c < 20) c += DT;
    expect(c).toBeGreaterThan(JAMMER.cooldown - 0.05);
    expect(c).toBeLessThan(JAMMER.cooldown + 0.05);
    expect(s.active).toBe(true);
  });
  it('releasing early starts the full cooldown', () => {
    const s = newJam();
    for (let i = 0; i < 60; i++) stepJam(s, true, 0, DT);
    expect(s.active).toBe(true);
    expect(stepJam(s, false, 0, DT)).toBe(false);
    expect(s.cool).toBe(JAMMER.cooldown);
    expect(stepJam(s, true, 0, DT)).toBe(false);
  });
  it('moving breaks the jam (the stand-still rule) and starts the cooldown', () => {
    const s = newJam();
    expect(stepJam(s, true, JAMMER.stillSpeed, DT)).toBe(true);
    expect(stepJam(s, true, JAMMER.stillSpeed + 0.5, DT)).toBe(false);
    expect(s.cool).toBe(JAMMER.cooldown);
  });
  it('jamLeft and the HUD line: the jam counts down, the cooldown shows, ready on a target, refused on a rebooting one', () => {
    const s = newJam();
    expect(jamLeft(s)).toBe(JAMMER.useMax);
    expect(jamHudText(s, false, false)).toBe('');
    expect(jamHudText(s, true, false)).toMatch(/READY/);
    expect(jamHudText(s, true, true)).toBe('TARGET REBOOTING');
    for (let i = 0; i < 120; i++) stepJam(s, true, 0, DT);
    expect(jamLeft(s)).toBeCloseTo(JAMMER.useMax - 2, 1);
    expect(jamHudText(s, true, false)).toBe('JAMMING 3.0 s');
    stepJam(s, false, 0, DT);
    expect(jamLeft(s)).toBe(0);
    expect(jamHudText(s, true, false)).toBe('JAMMER COOLDOWN 5.0 s');
  });
});

describe('device jam timelines (A3: the 1.5 s reboot; item 8: the light)', () => {
  it('a camera is jammed while held, then reboots 1.5 s, then is idle', () => {
    const d = newDevJam();
    expect(stepDevJam(d, true, 'camera', DT)).toBe(true);
    expect(d.ph).toBe(DEV_JAMMED);
    for (let i = 0; i < 60; i++) stepDevJam(d, true, 'camera', DT);
    expect(stepDevJam(d, false, 'camera', DT)).toBe(true);
    expect(d.ph).toBe(DEV_RECOVER);
    let t = 0;
    while (d.ph === DEV_RECOVER && t < 5) {
      stepDevJam(d, false, 'camera', DT);
      t += DT;
    }
    expect(t).toBeGreaterThan(JAMMER.reboot - 0.05);
    expect(t).toBeLessThan(JAMMER.reboot + 0.05);
    expect(d.ph).toBe(DEV_IDLE);
    expect(recoverTime('laser')).toBe(JAMMER.reboot);
  });
  it('the client mirror runs the reboot on but never starts or ends a jam itself', () => {
    const d = newDevJam();
    advanceDevJam(d, 'camera', 1);
    expect(d.ph).toBe(DEV_IDLE);
    d.ph = DEV_JAMMED;
    advanceDevJam(d, 'camera', 10);
    expect(d.ph).toBe(DEV_JAMMED);
    d.ph = DEV_RECOVER;
    d.t = 0;
    advanceDevJam(d, 'camera', JAMMER.reboot);
    expect(d.ph).toBe(DEV_IDLE);
  });
  it('the flicker is deterministic, irregular and ends where it should', () => {
    const e = JAM_LIGHT.edges;
    expect(e.length % 2).toBe(0);
    expect(e[e.length - 1]!).toBeLessThan(JAM_LIGHT.flickerOff);
    // irregular: not one fixed period
    const gaps = e.slice(1).map((x, i) => +(x - e[i]!).toFixed(3));
    expect(new Set(gaps).size).toBeGreaterThan(1);
    expect(flickerLit(0, false)).toBe(false);
    expect(flickerLit(e[0]!, false)).toBe(true);
    expect(flickerLit(JAM_LIGHT.flickerOff, false)).toBe(false);
    expect(flickerLit(0, true)).toBe(true);
    expect(flickerLit(JAM_LIGHT.flickerOn, true)).toBe(true);
    // the same time gives the same state (host and client agree from the sim clock)
    for (let t = 0; t < 0.5; t += 0.01) expect(flickerLit(t, false)).toBe(flickerLit(t, false));
  });
  it('a light: flickers off, stays off while jammed, 4 s off after the release, flickers back on, cannot be re-jammed meanwhile', () => {
    const d = newDevJam();
    const lit: boolean[] = [];
    let t = 0;
    // jammed 3 s
    for (; t < 3; t += DT) {
      stepDevJam(d, true, 'light', DT);
      lit.push(lightLit(d));
    }
    const flick = lit.slice(0, Math.round(JAM_LIGHT.flickerOff / DT));
    expect(flick.some((x) => x)).toBe(true);
    expect(flick.some((x) => !x)).toBe(true);
    expect(lit.slice(Math.round(JAM_LIGHT.flickerOff / DT) + 1).every((x) => !x)).toBe(true);
    // released: off for 4 s
    stepDevJam(d, false, 'light', DT);
    expect(d.ph).toBe(DEV_RECOVER);
    let off = 0;
    while (!lightLit(d) && off < 10) {
      stepDevJam(d, false, 'light', DT);
      off += DT;
    }
    expect(off).toBeGreaterThan(JAM_LIGHT.offHold - 0.05);
    expect(off).toBeLessThan(JAM_LIGHT.offHold + 0.1);
    // then the flicker back on: on and off frames, and on at the end (idle)
    const back: boolean[] = [];
    while (d.ph === DEV_RECOVER) {
      back.push(lightLit(d));
      stepDevJam(d, false, 'light', DT);
    }
    expect(back.some((x) => !x)).toBe(true);
    expect(d.ph).toBe(DEV_IDLE);
    expect(lightLit(d)).toBe(true);
    expect(recoverTime('light')).toBe(JAM_LIGHT.offHold + JAM_LIGHT.flickerOn);
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
  it('a touch costs health but never ends the run', () => {
    expect(laserDamage(100)).toBe(LASER.damage);
    expect(laserDamage(10)).toBe(10 - LASER.floorHp);
    expect(laserDamage(1)).toBe(0);
    expect(laserDamage(0)).toBe(0);
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
  it('(26) the sec field round-trips the jam state: camera clocks, use, cooldown, device timelines; junk is clamped or dropped', async () => {
    const { parseMessage, PROTOCOL_VERSION } = await import('../src/net/protocol');
    expect(PROTOCOL_VERSION).toBe(26);
    const sec = { ck: [12.5, 3], j: ['cam-s3', ''], ch: [2.5, 5], cd: [0, 3.2], dv: [['cam-s3', 1, 2.5], ['lt-4', 2, 1.25]], al: 1 };
    const msg = { t: 'sector', sec };
    expect(parseMessage(JSON.parse(JSON.stringify(msg)))).toEqual(msg);
    const bad = parseMessage({ t: 'sector', sec: { ck: [-4, 'x', 2e9], j: ['<x>', 5], ch: [99, -1], cd: [50, 'a'], dv: [['ok', 2, 99], ['<b>', 1, 1], 'junk', ['z', 0, 1], ['y', 7, 1]], al: 4 } });
    expect(bad).toEqual({ t: 'sector', sec: { ck: [0, 0, 1e6], j: ['', ''], ch: [10, 0], cd: [10, 0], dv: [['ok', 2, 30]], al: 4 } });
  });
});

describe('ctcourse devices', () => {
  it('station 4 has a laser across the doorway', async () => {
    const { ctcourse } = await import('../src/world/maps/ctcourse');
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const lay = ctcourse.build(new LevelBuilder(), 0);
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

describe('station 3 camera hallway (marlow-jammer item 5, A5)', () => {
  const DEG = Math.PI / 180;
  /** The first collide box (yaw 0) the segment a -> b passes through, or false. */
  type Box = { c: number[]; s: number[]; yaw: number; collide: boolean };
  const blocked = (boxes: Box[], a: number[], b: number[]): boolean => {
    for (const bx of boxes) {
      if (!bx.collide || bx.yaw !== 0) continue;
      let t0 = 0;
      let t1 = 1;
      let hit = true;
      for (let k = 0; k < 3 && hit; k++) {
        const d = b[k]! - a[k]!;
        const lo = bx.c[k]! - bx.s[k]! / 2;
        const hi = bx.c[k]! + bx.s[k]! / 2;
        if (Math.abs(d) < 1e-9) {
          if (a[k]! < lo || a[k]! > hi) hit = false;
          continue;
        }
        let u = (lo - a[k]!) / d;
        let v = (hi - a[k]!) / d;
        if (u > v) [u, v] = [v, u];
        t0 = Math.max(t0, u);
        t1 = Math.min(t1, v);
        if (t0 > t1) hit = false;
      }
      // the segment's own ends (the lens, the point) are not occluders
      if (hit && t1 > 0.001 && t0 < 0.999) return true;
    }
    return false;
  };
  const build = async () => {
    const m = await import('../src/world/maps/ctcourse');
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const b = new LevelBuilder();
    const lay = m.ctcourse.build(b, 0);
    return { m, b, lay };
  };

  it('the camera sits at the hallway end, looking back down it, and covers it end to end at every sweep angle', async () => {
    const { m, b, lay } = await build();
    const { inFrame } = await import('../src/security/camera');
    const cam = lay.security!.devices.find((d) => d.id === 'cam-s3')!;
    expect(cam.at[0]).toBe(m.S3_CAMERA.x);
    const [s0, s1] = cam.sweep!;
    const lens = [cam.at[0], cam.y, cam.at[1]];
    // standing and crouched heads along the hallway's centre and both edges, from its mouth to 3 m short of the camera
    for (let x = m.S3_HALL.x0 + 0.3; x <= m.S3_CAMERA.x - 3; x += 0.5) {
      for (const z of [m.S3_HALL.z0 + 0.35, (m.S3_HALL.z0 + m.S3_HALL.z1) / 2, m.S3_HALL.z1 - 0.35]) {
        for (const y of [1.6, 1.05]) {
          for (let a = s0; a <= s1; a += 2) expect(inFrame(a * DEG, cam.at[0], cam.y, cam.at[1], x, y, z), `${x.toFixed(1)}, ${y}, ${z} at ${a}`).toBe(true);
          expect(blocked(b.boxes, lens, [x, y, z]), `clear line to ${x.toFixed(1)}, ${z}`).toBe(false);
        }
      }
    }
  });

  it('its view stays inside the bay: no point of either airlock is seen, the doors open', async () => {
    const { b, lay, m } = await build();
    const { inFrame } = await import('../src/security/camera');
    const cam = lay.security!.devices.find((d) => d.id === 'cam-s3')!;
    const lens = [cam.at[0], cam.y, cam.at[1]];
    const x0 = m.bayX(2);
    let tested = 0;
    // A2 (behind the entry lobby's wall) and A3 (behind the camera); door leaves are not boxes: every door counts as open
    for (const [ax0, ax1] of [[x0 - 6, x0], [x0 + 16, x0 + 22]] as const) {
      for (let x = ax0 + 0.2; x < ax1; x += 0.4) {
        for (let z = 4.2; z < 10; z += 0.4) {
          for (const y of [0.3, 1.0, 1.7, 2.5]) {
            for (let a = cam.sweep![0]; a <= cam.sweep![1]; a += 4) {
              if (!inFrame(a * DEG, cam.at[0], cam.y, cam.at[1], x, y, z)) continue;
              tested++;
              expect(blocked(b.boxes, lens, [x, y, z]), `airlock point ${x.toFixed(1)}, ${y}, ${z.toFixed(1)} is seen`).toBe(true);
            }
          }
        }
      }
    }
    // A2 lies in the camera's frame and range (behind the wall): the test really tested something
    expect(tested).toBeGreaterThan(0);
  });

  it('one jam covers one runner, never both: the covered stretch at the course speeds', async () => {
    const { m } = await build();
    const { CAMERA } = await import('../src/config/security');
    const { GEARS } = await import('../src/config/movement');
    // a standing head (1.7 m) leaves the vertical frame this close to the camera: the covered stretch ends there
    const blind = (m.S3_CAMERA.y - 1.7) / Math.tan(CAMERA.vFov / 2);
    const len = m.S3_CAMERA.x - blind - m.S3_HALL.x0;
    const run = GEARS.stand[4];
    // one runner gets through inside one 5 s jam
    expect(len / run).toBeLessThan(JAMMER.useMax);
    // two in a row would not fit in one jam (and the jammer must stand still while it jams)
    expect((2 * len) / run).toBeGreaterThan(JAMMER.useMax);
    // the jammer cannot follow inside the 1.5 s reboot either
    expect(len / run).toBeGreaterThan(JAMMER.reboot);
    // a narrow hallway (2.5 - 3.5 m)
    const w = m.S3_HALL.z1 - m.S3_HALL.z0;
    expect(w).toBeGreaterThanOrEqual(2.5);
    expect(w).toBeLessThanOrEqual(3.5);
  });

  it('the gate: both players in the far lobby unlock the exit airlock door; the old pocket door is gone', async () => {
    const { m, lay } = await build();
    const c = lay.course!;
    const gate = c.def.bays[2]!.gates.find((g) => g.kind === 'flag');
    expect(gate && gate.kind === 'flag' && gate.flag).toBe(m.S3_FLAG);
    expect(gate && gate.kind === 'flag' && gate.doorId).toBe('A3-near');
    expect(c.def.externalFlags).toContain(m.S3_FLAG);
    expect(c.doors['S3-door']).toBeUndefined();
    const zone = lay.passZones!.find((z) => z.flag === m.S3_FLAG)!;
    expect(Math.min(zone.box[0], zone.box[2])).toBeGreaterThanOrEqual(m.S3_HALL.x1);
    expect(inBox(zone.box, m.bayX(2) + 15, 7)).toBe(true);
  });
});
