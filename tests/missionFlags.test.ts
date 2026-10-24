// (mission-framework FLG) Unfinished mission / kit work merges dark: `flags.missions` (`?missions=1`) and `flags.coopKit`
// (`?coopkit=1`), owner Marlow Build. One test per gate: off -> `missionParam()` null (Sector Ops runs as master), no
// Hints row, no kit offer (a Marlow Yard 4.4 m lip keeps master's moves, M1); on -> the mission and the pull-up work.
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { flags } from '../src/core/flags';
import { bindSectorMission, missionParam, missionStartSector, pickMission } from '../src/game/mission/sectorMission';
import { isKitState, registerKitMove, unregisterKitMove } from '../src/game/kit/registry';
import { PULL_UP } from '../src/game/kit/pullUp';
import { SHUTTER_MOVE } from '../src/game/kit/shutter';
import { PULL_SUB } from '../src/game/teamMoves';
import { TeamController } from '../src/game/teamController';
import { COOP_LIP } from '../src/world/maps/ctcourseGreybox';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { CAMPUS_MISSION_TEST } from '../src/world/maps/campusMissionTest';

const saved = { missions: flags.missions, coopKit: flags.coopKit, mission: flags.mission };
afterEach(() => {
  flags.missions = saved.missions;
  flags.coopKit = saved.coopKit;
  flags.mission = saved.mission;
  vi.restoreAllMocks();
});
afterAll(() => {
  registerKitMove(PULL_UP);
  registerKitMove(SHUTTER_MOVE);
});

describe('flags (FLG): both default off', () => {
  it('no URL: missions and coopKit are off (the node test page has no location)', () => {
    expect(saved.missions).toBe(false);
    expect(saved.coopKit).toBe(false);
  });
});

describe('missions gate: missionParam (FLG)', () => {
  it('off: ?mission= is ignored, so a Sector Ops run binds no mission and starts at section 1 (as master)', () => {
    flags.mission = CAMPUS_MISSION_TEST.id;
    flags.missions = false;
    expect(missionParam()).toBeNull();
    expect(missionStartSector(CAMPUS_SECTORS, [CAMPUS_MISSION_TEST], missionParam())?.id).toBe(CAMPUS_SECTORS[0]!.id);
    const g = { world: { map: { missions: [CAMPUS_MISSION_TEST], sectors: CAMPUS_SECTORS } } };
    expect(bindSectorMission(g as never, {} as never, [], () => {}, () => {})).toBeNull();
  });

  it('on: ?mission=<id> picks the map\'s mission', () => {
    flags.mission = CAMPUS_MISSION_TEST.id;
    flags.missions = true;
    expect(missionParam()).toBe(CAMPUS_MISSION_TEST.id);
    expect(pickMission([CAMPUS_MISSION_TEST], missionParam())).toBe(CAMPUS_MISSION_TEST);
  });
});

describe('missions gate: the Hints row (FLG)', () => {
  it('Settings > Gameplay builds the Hints toggle only when flags.missions', () => {
    const scr = readFileSync(new URL('../src/ui/screens/settingsScreen.ts', import.meta.url), 'utf8');
    expect(scr.match(/toggle\('Hints'/g)?.length).toBe(1);
    expect(scr).toMatch(/flags\.missions \? desc\(toggle\('Hints'/);
  });
});

// ---- the kit gate on a Marlow Yard lip (COOP_LIP, 4.4 m: inside the pull-up's 4.3-4.5 band) ----

const EDGE_X = 0.5;
const DT = 1 / 60;

/** A ray against one lip: the top (y = h, x < EDGE_X), the ground (y = 0) and the wall face (x = EDGE_X, 0..h). */
function lipRay(h: number) {
  return (a: Vector3, b: Vector3) => {
    let best = Infinity;
    let nx = 0;
    let ny = 0;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const at = (t: number) => ({ x: a.x + dx * t, y: a.y + dy * t, z: a.z + (b.z - a.z) * t });
    for (const [py, top] of [[h, true], [0, false]] as const) {
      if (dy === 0 || (a.y - py) * (b.y - py) > 0) continue;
      const t = (py - a.y) / dy;
      if (t < 0 || t > 1 || (top && at(t).x >= EDGE_X)) continue;
      if (t < best) [best, nx, ny] = [t, 0, 1];
    }
    if (dx !== 0 && (a.x - EDGE_X) * (b.x - EDGE_X) <= 0) {
      const t = (EDGE_X - a.x) / dx;
      const p = at(t);
      if (t >= 0 && t <= 1 && p.y >= 0 && p.y <= h && t < best) [best, nx, ny] = [t, 1, 0];
    }
    if (best === Infinity) return { hit: false, distance: 0, point: new Vector3(), normal: new Vector3() };
    const p = at(best);
    return { hit: true, distance: best * Vector3.Distance(a, b), point: new Vector3(p.x, p.y, p.z), normal: new Vector3(nx, ny, 0) };
  };
}

/** `self` at `at` (facing `yaw`), one mate; the net hook records the requests. */
function lipGame(at: [number, number, number], yaw: number, mateAt: [number, number, number], mateYaw: number) {
  const controller = {
    pos: new Vector3(...at),
    yaw,
    override: null as null | { kinematic?: Vector3 },
    grounded: true,
    swallowCrouch: false,
    crouched: false,
    crouchIntent: false,
    autoCrouch: false,
    setCrouchToggle: () => {},
    standUp: () => {},
  };
  const mate = { id: 'm', pos: new Vector3(...mateAt), yaw: mateYaw, mode: 'ground', sub: 0 };
  const asked: unknown[][] = [];
  const g = {
    player: { alive: true, controller, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => [mate], teamRequest: (...a: unknown[]) => asked.push(a), teamHangEnd: () => {} },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    ballistics: { ray: lipRay(COOP_LIP) },
    world: { level: {} },
  };
  const tm = new TeamController(g as never);
  const tick = (n: number, coop = false): void => {
    for (let i = 0; i < n; i++) tm.fixedUpdate(DT, coop && i === 0, false);
  };
  return { tm, controller, mate, asked, tick };
}

/** The holder crouched on the Marlow lip's top (facing the drop), the partner on the yard floor below past the wall. */
function holderOnLip() {
  const f = lipGame([0, COOP_LIP, 0], Math.PI / 2, [1.2, 0, 0], 0);
  f.controller.crouched = f.controller.crouchIntent = true;
  return f;
}

/** The partner on the yard floor; the holder above at the edge offering a pull-up (braced with `PULL_SUB`). */
function partnerUnderLip() {
  const f = lipGame([1.2, 0, 0], -Math.PI / 2, [0, COOP_LIP, 0], Math.PI / 2);
  f.mate.mode = 'brace';
  f.mate.sub = PULL_SUB;
  return f;
}

/** The holder's prompt, then its state after a Co-op press. */
function holderPress(): { prompt: string; state: string; mode: string } {
  const f = holderOnLip();
  f.tick(1);
  const prompt = f.tm.prompt;
  f.tick(1, true);
  return { prompt, state: f.tm.state, mode: f.tm.mode };
}

describe('coopKit gate: no kit offer on a Marlow Yard lip (FLG, M1)', () => {
  it('the lip is in the pull-up band (so only the flag keeps the offer off)', () => {
    expect(COOP_LIP).toBeGreaterThanOrEqual(4.3);
    expect(COOP_LIP).toBeLessThanOrEqual(4.5);
  });

  it('off: the holder is never offered a pull-up and kitIdle never runs; the moves are master\'s (no kit registered)', () => {
    flags.coopKit = false;
    const kitIdle = vi.spyOn(TeamController.prototype as unknown as { kitIdle: () => boolean | null }, 'kitIdle');
    const off = holderPress();
    expect(kitIdle).not.toHaveBeenCalled();
    expect(off.prompt).not.toMatch(/pull-up/);
    expect(isKitState(off.state)).toBe(false);
    expect(off.state).toBe('hangOffer'); // master's hang-down offer at the edge
    // exactly what a build without the kit does at this lip
    flags.coopKit = true;
    unregisterKitMove('pull');
    unregisterKitMove('shutter');
    try {
      expect(holderPress()).toEqual(off);
    } finally {
      registerKitMove(PULL_UP);
      registerKitMove(SHUTTER_MOVE);
    }
  });

  it('off: a partner under a mate offering a pull-up gets no prompt and sends no request', () => {
    flags.coopKit = false;
    const f = partnerUnderLip();
    f.tick(1);
    expect(f.tm.prompt).not.toMatch(/pull-up/);
    f.tick(1, true);
    expect(f.asked.filter((a) => a[0] === 'pull')).toEqual([]);
    expect(isKitState(f.tm.state)).toBe(false);
  });

  it('on: the same lip offers the pull-up, and the partner below asks the host for it', () => {
    flags.coopKit = true;
    const on = holderPress();
    expect(on.prompt).toMatch(/pull-up/);
    expect([on.state, on.mode]).toEqual(['pullOffer', 'brace']);
    const f = partnerUnderLip();
    f.tick(1);
    expect(f.tm.prompt).toMatch(/pull-up/);
    f.tick(1, true);
    expect(f.asked.some((a) => a[0] === 'pull')).toBe(true);
  });
});
