import { describe, expect, it } from 'vitest';
import {
  ALARM_GAP,
  ALARM_MAX,
  DEV_IDLE,
  DEV_JAMMED,
  DEV_RECOVER,
  HALL_BACK,
  HALL_BACK_HOLD,
  HALL_IDLE,
  HALL_RUN,
  HALL_SENT,
  JAMMER,
  JAM_LIGHT,
  LASER,
  advanceDevJam,
  deviceAlarm,
  distToSegment,
  flickerLit,
  hallStep,
  inBox,
  jamHudKey,
  jamHudText,
  jamLeft,
  laserCooldown,
  laserTouch,
  lightLit,
  MIRROR_STALE,
  mirrorDevJam,
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
import { hallCameras, type PassZone } from '../src/game/passZones';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { A3_CAMERA, A3_HALL } from '../src/world/maps/ctcourseSets/a3OfficeRange';

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

describe('fix round 1: the client mirror only moves forward, the HUD key', () => {
  it('a late host reboot the mirror already ran down is dropped (no blink); a new jam after it is taken', () => {
    const d = newDevJam();
    expect(mirrorDevJam(d, DEV_RECOVER, 1.2, Infinity)).toBe(true);
    // the mirror runs the reboot down itself
    advanceDevJam(d, 'camera', 0.35);
    expect(d.ph).toBe(DEV_IDLE);
    // a host message sent before the host's own reboot ended arrives now: dropped, the camera stays idle
    expect(mirrorDevJam(d, DEV_RECOVER, 1.45, 0.05)).toBe(false);
    expect(d.ph).toBe(DEV_IDLE);
    // a fresh jam is taken at once, and its later reboot too
    expect(mirrorDevJam(d, DEV_JAMMED, 0.1, 0.2)).toBe(true);
    expect(d.ph).toBe(DEV_JAMMED);
    expect(mirrorDevJam(d, DEV_RECOVER, 0, Infinity)).toBe(true);
    expect(d.ph).toBe(DEV_RECOVER);
    // long idle (past MIRROR_STALE): a reboot from the host is a real one
    const e = newDevJam();
    expect(mirrorDevJam(e, DEV_RECOVER, 0.3, MIRROR_STALE + 0.1)).toBe(true);
    expect(e.ph).toBe(DEV_RECOVER);
  });
  it('inside one phase the time only moves on; the host idle always wins', () => {
    const d = newDevJam();
    mirrorDevJam(d, DEV_RECOVER, 1.0, Infinity);
    mirrorDevJam(d, DEV_RECOVER, 0.8, Infinity);
    expect(d.t).toBe(1.0);
    mirrorDevJam(d, DEV_RECOVER, 1.1, Infinity);
    expect(d.t).toBe(1.1);
    expect(mirrorDevJam(d, DEV_IDLE, 0, Infinity)).toBe(true);
    expect(d.ph).toBe(DEV_IDLE);
  });
  it('the HUD key changes only when the shown text does (kind and tenths)', () => {
    const s = newJam();
    expect(jamHudKey(s, false, false)).toBe(0);
    stepJam(s, true, 0, 0.01);
    const k = jamHudKey(s, true, false);
    stepJam(s, true, 0, 0.01);
    expect(jamHudKey(s, true, false)).toBe(k);
    stepJam(s, true, 0, 0.2);
    expect(jamHudKey(s, true, false)).not.toBe(k);
    const ready = newJam();
    expect(jamHudKey(ready, true, false)).not.toBe(jamHudKey(ready, true, true));
  });
});

describe('fix round 1: the camera hallway send-back (Michael item 5, station 3 only)', () => {
  // hallStep(state, inLobby, inHall, inFar, stage, held)
  const I = HALL_IDLE;
  const R = HALL_RUN;
  it('seen (stage 2) in the hallway: sent back; seen less: keeps running', () => {
    expect(hallStep(I, false, true, false, 2, false)).toBe(HALL_BACK);
    expect(hallStep(R, false, true, false, 2, false)).toBe(HALL_BACK);
    expect(hallStep(I, false, true, false, 1, false)).toBe(HALL_RUN);
    expect(hallStep(I, false, true, false, 0, false)).toBe(HALL_RUN);
  });
  it('a runner reaches the far lobby clean only with an empty meter; seen there still running: sent back', () => {
    expect(hallStep(R, false, false, true, 1, false)).toBe(HALL_RUN);
    expect(hallStep(R, false, false, true, 2, false)).toBe(HALL_BACK);
    expect(hallStep(R, false, false, true, 0, false)).toBe(HALL_IDLE);
    // through (not running): the camera seeing them in the far lobby is only the alarm, no send-back
    expect(hallStep(I, false, false, true, 2, false)).toBe(HALL_IDLE);
  });
  it('outside the hallway and the far lobby nothing changes (the entry lobby, the airlock)', () => {
    expect(hallStep(I, true, false, false, 2, false)).toBe(HALL_IDLE);
    expect(hallStep(I, false, false, false, 2, false)).toBe(HALL_IDLE);
    expect(hallStep(R, false, false, false, 2, false)).toBe(HALL_RUN);
  });
  it('an unjammed runner is sent back before the far lobby: the pass never counts them', () => {
    // a runner along the hallway at 4 m/s, the meter filling (stage 2 after about 1 s): sent back, never clean through
    let st: number = I;
    let back = false;
    for (let t = 0, x = 3; x < 16 && !back; t += 0.1, x += 0.4) {
      const n = hallStep(st, x < 3, x >= 3 && x < 13.8, x >= 13.8, t >= 1 ? 2 : t >= 0.3 ? 1 : 0, false);
      if (n === HALL_BACK) back = true;
      else st = n;
    }
    expect(back).toBe(true);
    // jammed (the meter held empty): clean through, counted
    st = I;
    for (let x = 3; x < 15; x += 0.4) st = hallStep(st, false, x < 13.8, x >= 13.8, 0, false);
    expect(st).toBe(HALL_IDLE);
  });
});

describe('fix round 2: a sent-back player cannot count from stale positions', () => {
  /**
   * The host's view of one co-op client at station 3, stepped at 60 Hz like `CtDevices.stepHall`: `pos(t)` is the
   * position the host's copy holds at time t, `stage(t)` the camera's meter stage on it. Returns when (if ever) the
   * far lobby's pass would count the client (state idle, feet in the far lobby).
   */
  const LOBBY_X = 3;
  const FAR_X = 13.8;
  function run(pos: (t: number) => number, stage: (t: number) => number, until: number): { backs: number; countedAt: number } {
    let st: number = HALL_RUN;
    let hold = 0;
    let backs = 0;
    const dt = 1 / 60;
    for (let t = 0; t < until; t += dt) {
      hold = Math.max(0, hold - dt);
      const x = pos(t);
      const n = hallStep(st, x < LOBBY_X, x >= LOBBY_X && x < FAR_X, x >= FAR_X, stage(t), hold > 0);
      if (n === HALL_BACK) {
        backs++;
        st = HALL_SENT;
        hold = HALL_BACK_HOLD;
        continue;
      }
      st = n;
      if (st === HALL_IDLE && x >= FAR_X) return { backs, countedAt: t };
    }
    return { backs, countedAt: -1 };
  }
  it('sent back near the hallway end, then stale far-lobby positions with an empty meter: no pass', () => {
    // caught at x 13.5 (t 0); the host's copy moves to the lobby spot, then the client's in-flight positions
    // (sent before the `back` event reached it) put it in the far lobby for 0.3 s; the meter was emptied
    const r = run((t) => (t < 0.01 ? 13.5 : t < 0.1 ? 1.5 : t < 0.4 ? 14.2 : 1.5), (t) => (t < 0.01 ? 2 : 0), 2.9);
    expect(r.backs).toBe(1);
    expect(r.countedAt).toBe(-1);
    // the same with the stale positions held in the far lobby past the grace: sent back again, still no pass
    const s = run((t) => (t < 0.01 ? 13.5 : t < 0.1 ? 1.5 : 14.2), (t) => (t < 0.01 ? 2 : 0), 6);
    expect(s.countedAt).toBe(-1);
    expect(s.backs).toBeGreaterThanOrEqual(2);
  });
  it('stale far-lobby positions after the host copy stood at the lobby spot do not clear the send-back', () => {
    // the host's copy sits at the lobby spot (inside the hold), then a late stale far-lobby position arrives
    const r = run((t) => (t < 0.01 ? 13.5 : t < 1 ? 1.5 : t < 1.2 ? 14.2 : 1.5), (t) => (t < 0.01 ? 2 : 0), 2.9);
    expect(r.countedAt).toBe(-1);
  });
  it('a real arrival after being back in the entry lobby: counted', () => {
    // back in the lobby until the hold is over, then a jammed run (empty meter) down the hallway at 4 m/s
    const start = HALL_BACK_HOLD + 0.5;
    const r = run((t) => (t < 0.01 ? 13.5 : t < start ? 1.5 : 1.5 + (t - start) * 4), (t) => (t < 0.01 ? 2 : 0), 12);
    expect(r.backs).toBe(1);
    expect(r.countedAt).toBeGreaterThan(start);
  });
  it('sent back, then running the hallway again inside the hold: running once the hold ends, counted at the far end', () => {
    const r = run((t) => (t < 0.01 ? 13.5 : t < 0.5 ? 1.5 : 1.5 + (t - 0.5) * 3), () => 0, 12);
    expect(r.countedAt).toBeGreaterThan(HALL_BACK_HOLD);
  });
  it('the host (no hold) clears in the lobby at once; a sent-back player seen in the hallway goes back again', () => {
    expect(hallStep(HALL_SENT, true, false, false, 0, false)).toBe(HALL_IDLE);
    expect(hallStep(HALL_SENT, false, true, false, 0, false)).toBe(HALL_RUN);
    expect(hallStep(HALL_SENT, false, false, true, 0, true)).toBe(HALL_SENT);
    expect(hallStep(HALL_SENT, true, false, false, 0, true)).toBe(HALL_SENT);
    expect(hallStep(HALL_SENT, false, true, false, 2, true)).toBe(HALL_BACK);
    expect(hallStep(HALL_SENT, false, false, false, 0, false)).toBe(HALL_SENT);
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
  it('(marlow-play C1) a camera in the cone wins over a nearer-angle light; a panel does not; out of the cone it never does', () => {
    const lamp: JamTarget = { id: 'lamp', kind: 'light', x: 0, y: 0, z: 10 };
    const cam: JamTarget = { id: 'cam', kind: 'camera', x: 0.6, y: 0, z: 10.6 };
    const panel: JamTarget = { id: 'panel', kind: 'panel', x: 0.6, y: 0, z: 10.6 };
    const far: JamTarget = { id: 'far', kind: 'camera', x: 5, y: 0, z: 10 };
    expect([lamp, cam][pickJamTarget([lamp, cam], 0, 0, 0, 0, 0, 1)]!.id).toBe('cam');
    expect([cam, lamp][pickJamTarget([cam, lamp], 0, 0, 0, 0, 0, 1)]!.id).toBe('cam');
    expect([lamp, panel][pickJamTarget([lamp, panel], 0, 0, 0, 0, 0, 1)]!.id).toBe('lamp');
    expect([lamp, far][pickJamTarget([lamp, far], 0, 0, 0, 0, 0, 1)]!.id).toBe('lamp');
    // (check FIX 1) a camera in the cone but over JAM_CAM_NEAR from the lamp (behind a wall, across a room) leaves the lamp
    const behind: JamTarget = { id: 'behind', kind: 'camera', x: 0.3, y: 0, z: 11.5 };
    expect([lamp, behind][pickJamTarget([lamp, behind], 0, 0, 0, 0, 0, 1)]!.id).toBe('lamp');
    expect([lamp, behind, cam][pickJamTarget([lamp, behind, cam], 0, 0, 0, 0, 0, 1)]!.id).toBe('cam');
    // a skipped camera (refused) leaves the light
    expect(pickJamTarget([lamp, cam], 0, 0, 0, 0, 0, 1, JAMMER.range, JAMMER.cone, (t) => t.kind === 'camera')).toBe(0);
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
  it('(26) the sec field round-trips the jam state: camera clocks, use, cooldown, device timelines; junk is clamped or dropped', async () => {
    const { parseMessage } = await import('../src/net/protocol');
    const sec = { ck: [12.5, 3], j: ['cam-s3', ''], ch: [2.5, 5], cd: [0, 3.2], dv: [['cam-s3', 1, 2.5], ['lt-4', 2, 1.25]], al: 1 };
    const msg = { t: 'sector', sec };
    expect(parseMessage(JSON.parse(JSON.stringify(msg)))).toEqual(msg);
    const bad = parseMessage({ t: 'sector', sec: { ck: [-4, 'x', 2e9], j: ['<x>', 5], ch: [99, -1], cd: [50, 'a'], dv: [['ok', 2, 99], ['<b>', 1, 1], 'junk', ['z', 0, 1], ['y', 7, 1]], al: 4 } });
    expect(bad).toEqual({ t: 'sector', sec: { ck: [0, 0, 1e6], j: ['', ''], ch: [10, 0], cd: [10, 0], dv: [['ok', 2, 30]], al: 4 } });
  });
  it('(26, fix round 1) the back event (the hallway send-back) round-trips; junk is dropped', async () => {
    const { parseMessage } = await import('../src/net/protocol');
    const ev = { e: 'back', player: 'p2', x: 41.5, y: 0, z: 1.6, yaw: Math.PI / 2 };
    expect(parseMessage({ t: 'ev', events: [ev] })).toEqual({ t: 'ev', events: [ev] });
    expect(parseMessage({ t: 'ev', events: [{ e: 'back', player: 'p2', x: 1, y: 0, z: 1 }] })).toEqual({ t: 'ev', events: [] });
  });
});

// (marlow-final 0d) The Marlow Yard cases (the station 4 laser band and its release, the station 3 camera hallway: its
// cover, the view kept inside the bay, one jam per runner, the pass-zone gate and the send-back) pinned the old bunker
// bays. They return with A3 (the jam relay corridor, `A3_HALL`) and A5 (the laser, `A5_LASER`) in their set tests
// (tests/ctcourse/<set>.test.ts, SPEC 16).

describe('marlow-walk482 X6: a hallway rule camera only sends back (no guard alert, no alarm)', () => {
  it("over Marlow Yard's pass zones the set is A3's hall camera alone", () => {
    const zones = buildCtcourse(new LevelBuilder()).layout.passZones ?? [];
    expect(zones.some((z) => z.hall === A3_HALL)).toBe(true);
    expect([...hallCameras(zones)]).toEqual(['cam-a3-hall']);
    expect(A3_CAMERA).toBe('cam-a3-hall');
  });
  it('a zone without a hall adds nothing', () => {
    const plain: PassZone = { id: 'p', box: [0, 0, 1, 1], flag: 'f' };
    expect(hallCameras([]).size).toBe(0);
    expect(hallCameras([plain]).size).toBe(0);
    expect([...hallCameras([plain, { id: 'h', box: [0, 0, 1, 1], flag: 'g', hall: A3_HALL }])]).toEqual([A3_CAMERA]);
  });
});
