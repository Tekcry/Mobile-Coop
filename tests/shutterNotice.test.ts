// (J9 S2; G41, R39, A17, A18) Guards notice a held-open shutter by sight, as a door left open: the pure helper
// (`shutterNoticedBy`: visible, range, storey, facing), `StealthSystems.noticeOpenShutters` on a fake GameState through
// the real fixed step (once per opening, its own clock with no door open anywhere, the sight line), and `resetShutter`
// (A27). fix1: the look point is off the plane on the noticing guard's own side, on a real nav grid with the opening
// shut (J9 S1), for both shutter orientations and both sides.
import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { newShutterDevice, resetShutter, SHUTTER, SHUTTER_NOTICE, shutterLift, shutterNoticedBy, shutterRelease, stepShutter, type ShutterDevice, type ShutterSpec } from '../src/game/kit/shutter';
import { SHUTTER_LOOK_OFF, StealthSystems } from '../src/game/stealthSystems';
import { LevelBuilder } from '../src/world/levelBuilder';
import { closeShutterNav, placeShutter } from '../src/world/shutterDoor';
import { runtimeNav } from './helpers/runtimeNav';

const DT = 1 / 60;
// at the origin, its normal +z; the guard stands on the +z side and faces it (-z) with yaw PI
const SPEC: ShutterSpec = { id: 'sh1', x: 0, y: 0, z: 0, yaw: 0, width: 3, height: 2.4 };
const FACING = Math.PI;

/** A shutter lifted to its hold gap (visible, `opens` + 1). */
function held(d: ShutterDevice = newShutterDevice(SPEC)): ShutterDevice {
  shutterLift(d);
  for (let i = 0; i < 120 && d.phase !== 'held'; i++) stepShutter(d, DT, 0);
  return d;
}

/** Let go and dropped shut. */
function shut(d: ShutterDevice): void {
  shutterRelease(d);
  for (let i = 0; i < 120 && d.phase !== 'closed'; i++) stepShutter(d, DT, 0);
}

function guard(x: number, y: number, z: number, yaw: number) {
  return { alive: true, alerted: false, pos: new Vector3(x, y, z), yaw, hear: vi.fn() };
}

/** A `StealthSystems` on the smallest fake GameState its constructor and fixed step need: no doors, no layout items. */
function rig(devices: ShutterDevice[], enemies: ReturnType<typeof guard>[]) {
  const clear = vi.fn(() => true);
  const g = {
    world: { layout: {}, level: { lights: {} }, doors: { list: [], onSound: null } },
    events: { emit: vi.fn() },
    hud: { feedItem() {} },
    player: { alive: true },
    team: { devices: { list: devices } },
    ballistics: { clear },
  };
  const em = { alarms: [], bodies: [], enemies, lightsOut: vi.fn(), breakers: null, anyAlerted: false };
  const ints = { add: vi.fn(), setEnabled: vi.fn(), setIndicator: vi.fn(), remove: vi.fn() };
  const ss = new StealthSystems(g as never, em as never, ints as never, () => {});
  const priv = ss as unknown as { playerOpened: Set<number>; noticeT: number; shutterNoticeT: number };
  const steps = (n: number): void => {
    for (let i = 0; i < n; i++) ss.fixedUpdate();
  };
  return { ss, g, clear, priv, steps };
}

describe('shutterNoticedBy (A18)', () => {
  it('in range and facing it: noticed', () => {
    expect(shutterNoticedBy(held(), 0, 0, 5, FACING)).toBe(true);
    // at the range edge, and right at it (within 0.5 m any facing counts)
    expect(shutterNoticedBy(held(), 0, 0, SHUTTER_NOTICE.range, FACING)).toBe(true);
    expect(shutterNoticedBy(held(), 0, 0, 0.4, 0)).toBe(true);
  });
  it('behind (facing away): none', () => {
    expect(shutterNoticedBy(held(), 0, 0, 5, 0)).toBe(false);
  });
  it('9.5 m away: none', () => {
    expect(shutterNoticedBy(held(), 0, 0, 9.5, FACING)).toBe(false);
  });
  it('2 m above (another storey): none; 1.5 m is the same storey', () => {
    expect(shutterNoticedBy(held(), 0, 2, 5, FACING)).toBe(false);
    expect(shutterNoticedBy(held(), 0, 1.5, 5, FACING)).toBe(true);
  });
  it('not visibly open (closed, or under the shut threshold): none', () => {
    const d = newShutterDevice(SPEC);
    expect(d.visible).toBe(false);
    expect(shutterNoticedBy(d, 0, 0, 5, FACING)).toBe(false);
    d.open = SHUTTER.visibleFrac * d.holdGap * 0.5;
    expect(shutterNoticedBy(d, 0, 0, 5, FACING)).toBe(false);
  });
});

describe('StealthSystems.noticeOpenShutters (G41, R39, A18)', () => {
  it('a new device carries no notice mark (-1)', () => {
    expect(newShutterDevice(SPEC).noticed).toBe(-1);
  });

  it('once per opening: the first check hears it once, later checks in the same opening do not; a new opening does', () => {
    const d = held();
    const e = guard(0, 0, 5, FACING);
    const { steps } = rig([d], [e]);
    steps(1);
    expect(e.hear).toHaveBeenCalledTimes(1);
    // (fix1) heard SHUTTER_LOOK_OFF off the plane on his own side (+z here), not on the plane
    expect(e.hear).toHaveBeenCalledWith(d.x, d.z + SHUTTER_LOOK_OFF, SHUTTER_NOTICE.range + 2);
    expect(d.noticed).toBe(d.opens);
    steps(180);
    expect(e.hear).toHaveBeenCalledTimes(1);
    shut(d);
    held(d);
    expect(d.opens).toBe(2);
    steps(20);
    expect(e.hear).toHaveBeenCalledTimes(2);
    expect(d.noticed).toBe(2);
  });

  it('notices with no door open anywhere: its own clock runs (the door notice clock stays put)', () => {
    const d = held();
    const e = guard(0, 0, 5, FACING);
    const { priv, steps } = rig([], [e]);
    steps(1);
    expect(priv.playerOpened.size).toBe(0);
    // no devices: the one length check, the clock untouched
    expect(priv.shutterNoticeT).toBe(0);
    const r = rig([d], [e]);
    r.steps(1);
    expect(r.priv.playerOpened.size).toBe(0);
    expect(e.hear).toHaveBeenCalledTimes(1);
    expect(r.priv.noticeT).toBe(0);
    expect(r.priv.shutterNoticeT).toBeGreaterThan(0);
    // the clock counts down every fixed step and fires every DOOR_NOTICE_EVERY (0.25 s): a second opening is heard on
    // the next check, not the step it opens
    shut(d);
    held(d);
    r.steps(1);
    expect(e.hear).toHaveBeenCalledTimes(1);
    r.steps(16);
    expect(e.hear).toHaveBeenCalledTimes(2);
  });

  it('a blocked sight line gives none (and the opening stays unnoticed)', () => {
    const d = held();
    const e = guard(0, 0, 5, FACING);
    const { clear, steps } = rig([d], [e]);
    clear.mockReturnValue(false);
    steps(60);
    expect(clear).toHaveBeenCalled();
    expect(e.hear).not.toHaveBeenCalled();
    expect(d.noticed).toBe(-1);
    // eye at the guard's head, the gap's middle under the edge
    const [eye, at] = clear.mock.calls[0] as unknown as [Vector3, Vector3];
    expect([eye.x, eye.y, eye.z]).toEqual([0, 1.6, 5]);
    expect([at.x, at.y, at.z]).toEqual([0, d.open * 0.5, 0]);
  });

  it('an alerted or dead guard, or one facing away, does not notice; the next calm one in view does', () => {
    const d = held();
    const alerted = { ...guard(0, 0, 4, FACING), alerted: true };
    const dead = { ...guard(0, 0, 4, FACING), alive: false };
    const away = guard(0, 0, 4, 0);
    const calm = guard(1, 0, 6, FACING);
    const { steps } = rig([d], [alerted, dead, away, calm]);
    steps(1);
    expect(alerted.hear).not.toHaveBeenCalled();
    expect(dead.hear).not.toHaveBeenCalled();
    expect(away.hear).not.toHaveBeenCalled();
    expect(calm.hear).toHaveBeenCalledTimes(1);
  });

  it('a section restart resets the clock', () => {
    const d = held();
    const e = guard(0, 0, 5, FACING);
    const { ss, priv, steps } = rig([d], [e]);
    steps(1);
    expect(priv.shutterNoticeT).toBeGreaterThan(0);
    ss.resetForRestart();
    expect(priv.shutterNoticeT).toBe(0);
  });
});

describe("the look point is on the noticing guard's own side (fix1, J9 S1 closure)", () => {
  // a 20 x 20 room split by a wall whose only opening (3 m) holds the shutter: shut on the grid, the sides do not connect
  const SPEC_Z: ShutterSpec = { id: 'sz', x: 10, y: 0, z: 10, yaw: 0, width: 3, height: 3 };
  const SPEC_X: ShutterSpec = { id: 'sx', x: 10, y: 0, z: 10, yaw: Math.PI / 2, width: 3, height: 3 };
  function shutRoom(spec: ShutterSpec) {
    const b = new LevelBuilder();
    b.perimeter(0, 20, 0, 20, 3, '#888');
    b.floor(10, 10, 20, 20, '#666');
    const gap = [[8.5, 11.5]] as const;
    if (spec.yaw === 0) b.wallX(10, 0, 20, gap, 3, '#777');
    else b.wallZ(10, 0, 20, gap, 3, '#777');
    placeShutter(b, spec);
    const n = runtimeNav(b, { x: 5, z: 5 }, 1, []);
    closeShutterNav(n, [spec]);
    return n;
  }

  for (const [name, spec] of [
    ['wall along x (yaw 0)', SPEC_Z],
    ['wall along z (yaw pi/2)', SPEC_X],
  ] as const) {
    for (const side of [-1, 1] as const) {
      it(`${name}, a guard on the ${side < 0 ? '-' : '+'}normal side: heard on his side, snaps there, a path from his post`, () => {
        const n = shutRoom(spec);
        const nx = Math.sin(spec.yaw);
        const nz = Math.cos(spec.yaw);
        /** Signed distance off the plane along the normal. */
        const across = (x: number, z: number): number => (x - spec.x) * nx + (z - spec.z) * nz;
        // his post 5 m off the plane on his side and 1 m along it, facing the shutter
        const px = spec.x + side * 5 * nx + nz;
        const pz = spec.z + side * 5 * nz - nx;
        const d = held(newShutterDevice(spec));
        const e = guard(px, 0, pz, spec.yaw + (side > 0 ? Math.PI : 0));
        const { steps } = rig([d], [e]);
        steps(1);
        expect(e.hear).toHaveBeenCalledTimes(1);
        const [hx, hz, r] = e.hear.mock.calls[0] as unknown as [number, number, number];
        expect(r).toBe(SHUTTER_NOTICE.range + 2);
        // SHUTTER_LOOK_OFF off the plane on his side, on the opening's middle line
        expect(across(hx, hz)).toBeCloseTo(side * SHUTTER_LOOK_OFF, 9);
        expect((hx - spec.x) * nz - (hz - spec.z) * nx).toBeCloseTo(0, 9);
        // the nav snap (what `findPath` does with the heard spot) lands on his side
        const k = n.nearestWalkable(hx, hz);
        expect(k).toBeGreaterThanOrEqual(0);
        const [qx, qz] = n.center(k);
        expect(across(qx, qz) * side).toBeGreaterThan(0);
        // a path from his post to it, every waypoint on his side
        const path = n.findPath([px, pz], [hx, hz]);
        expect(path).not.toBeNull();
        for (const w of path!) expect(across(w[0], w[1]) * side).toBeGreaterThan(0);
        // the plane point (S2 before fix1) snaps to the +normal side: the -normal side's guard gets no path there
        if (side < 0) expect(n.findPath([px, pz], [spec.x, spec.z])).toBeNull();
      });
    }
  }
});

describe('resetShutter (A27)', () => {
  it('drops it shut at once: no run, nobody at the bar, not visible, the notice mark cleared, opens kept', () => {
    const d = held();
    d.user = 'm';
    d.noticed = d.opens;
    shutterRelease(d);
    stepShutter(d, DT, 0);
    expect(d.phase).toBe('dropping');
    resetShutter(d);
    expect([d.open, d.phase, d.rate, d.user, d.visible, d.openFor, d.noticed, d.opens]).toEqual([0, 'closed', 0, '', false, 0, -1, 1]);
    // the next opening is a new one to notice
    held(d);
    expect(d.opens).toBe(2);
  });
});
