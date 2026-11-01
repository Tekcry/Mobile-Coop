// (coop-kit K1) Deadweight: one player hangs on a chain so the counterweighted grate (the spot's door) lifts for the
// other. Two TeamControllers on fake games (a host page and a client page, each page's mate built every step from the
// other page's controller and wire fields), A4's grille and spot exactly as Marlow places them (#612): the hang, the
// host's lift / drop rule, no crush, the pass each way and its two `onKitDone` calls on the host page only, the retry
// teleport, single player and `?kitmoves=0`.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../../src/core/babylon';
import { DEADWEIGHT_SUB } from '../../src/game/teamMoves';
import { addKitSpot, kitSpotIndex, type KitSpot } from '../../src/game/kit/kitApi';
import { registerKitMove } from '../../src/game/kit/registry';
import { DEADWEIGHT, DEADWEIGHT_MOVE, deadweightSpotOk, isDeadweightDevice, type DeadweightDevice } from '../../src/game/kit/deadweight';
import { TeamController } from '../../src/game/teamController';
import { flags, KIT_BUILT, readKitMoves } from '../../src/core/flags';
import type { MoveOverride } from '../../src/player/playerController';

const DT = 1 / 60;

// Marlow #612 (head 5f6b70b31) a4GoodsShed: A4_GRILLE, A4_DEADWEIGHT and the spot's call
const A4_GRILLE = { x0: 101, x1: 104, z: 24, t: 0.5, h: 2.4 } as const;
const A4_DEADWEIGHT = { x: A4_GRILLE.x0 + A4_GRILLE.t / 2 + 0.5, off: 1.5 } as const;
const spotA4 = (door: string): KitSpot => ({
  id: 'a4-deadweight',
  kind: 'deadweight',
  x: A4_DEADWEIGHT.x,
  y: A4_GRILLE.h,
  z: A4_GRILLE.z - A4_DEADWEIGHT.off,
  yaw: 0,
  x2: A4_DEADWEIGHT.x,
  y2: A4_GRILLE.h,
  z2: A4_GRILLE.z + A4_DEADWEIGHT.off,
  door,
});

// places on the floor (y 0): under each chain, the pass start (0.7 m off the plane, mid doorway), out of the way
const UNDER_NEAR = { x: 101.75, z: 22.5 };
const UNDER_FAR = { x: 101.75, z: 25.5 };
const PASS_NEAR = { x: 102.5, z: 23.3 };
const AWAY = { x: 106, z: 19 };

interface FakeDoor {
  anchor: { kind: 'door'; id: number; hinge: { x: number; y: number; z: number }; width: number; height: number; yaw: number; swing: 1; locked: boolean; breachable: boolean; leaf: 'slide' };
  open: number;
  target: 0 | 1;
  cx: number;
  cz: number;
}

/** A4's grille: `b.door(101, 0, 24, 3, PI / 2, { height: 2.4, locked: true, leaf: 'slide' })`, anchor id 37. */
function grille(): FakeDoor {
  const hinge = { x: 101, y: 0, z: 24 };
  const yaw = Math.PI / 2;
  const width = 3;
  return {
    anchor: { kind: 'door', id: 37, hinge, width, height: 2.4, yaw, swing: 1, locked: true, breachable: false, leaf: 'slide' },
    open: 0,
    target: 0,
    cx: hinge.x + Math.sin(yaw) * width * 0.5,
    cz: hinge.z + Math.cos(yaw) * width * 0.5,
  };
}

interface Mate {
  id: string;
  pos: Vector3;
  yaw: number;
  mode: string;
  sub: number;
  s: number;
}

function page(puppet: boolean, at: { x: number; z: number }, door = '37') {
  const anchors = {};
  addKitSpot(anchors, spotA4(door));
  const c = { pos: new Vector3(at.x, 0, at.z), renderPos: new Vector3(), yaw: 0, renderYaw: 0, override: null as MoveOverride | null, grounded: true, swallowCrouch: false, crouched: false, crouchIntent: false, autoCrouch: false, setCrouchToggle: () => {} };
  const gate = grille();
  const sets: boolean[] = [];
  const doors = {
    list: [gate],
    setOpen(d: FakeDoor, o: boolean) {
      sets.push(o);
      d.target = o ? 1 : 0;
      d.open = o ? 1 : 0;
    },
  };
  const mate: Mate = { id: '', pos: new Vector3(), yaw: 0, mode: 'ground', sub: 0, s: 0 };
  const mates: Mate[] = [mate];
  const health = { hp: 100 };
  const enemies: { alive: boolean; pos: { x: number; z: number } }[] = [];
  const onKitDone = vi.fn();
  const g = {
    puppet,
    mode: { onKitDone },
    player: { alive: true, controller: c, pose: { traverse: 'none', traverseT: 0, tumble: 0 } },
    net: { teamMates: () => mates, teamRequest: () => {}, teamHangEnd: () => {} },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: null, attach: { kind: 'none', phase: 'off' } },
    takedown: { active: null },
    strike: { active: false },
    target: { health },
    ballistics: { ray: () => ({ hit: false, distance: 0, point: new Vector3() }) },
    world: { level: { anchors }, doors },
    enemyMgr: { enemies },
  };
  const tm = new TeamController(g as never);
  return { g, tm, c, door: gate, doors, sets, mate, mates, health, enemies, onKitDone, manual: false };
}
type Page = ReturnType<typeof page>;

/** The host page ('h0', its mate 'c1') and the client page ('c1', its mate 'h0'). */
function pair(hostAt: { x: number; z: number }, clientAt: { x: number; z: number }) {
  const host = page(false, hostAt);
  const client = page(true, clientAt);
  host.mate.id = 'c1';
  client.mate.id = 'h0';
  return { host, client };
}
type Pair = ReturnType<typeof pair>;

/** `to` sees `from` as its mate (MoveState: position, mode, sub, s), unless `to` drives its mate by hand. */
function link(from: Page, to: Page): void {
  if (to.manual) return;
  const m = to.mate;
  m.pos.copyFrom(from.c.pos);
  m.mode = from.tm.mode ?? 'ground';
  m.sub = from.tm.wireSub;
  m.s = from.tm.wireS;
}

function kin(p: Page): void {
  const ov = p.c.override;
  if (ov?.kinematic) p.c.pos.copyFrom(ov.kinematic);
}

/** One fixed step on both pages (each reads the other's last step), then the client follows the host's door snapshot. */
function tick(P: Pair, i: { hc?: boolean; hb?: boolean; cc?: boolean; cb?: boolean } = {}): void {
  link(P.client, P.host);
  link(P.host, P.client);
  P.host.tm.fixedUpdate(DT, i.hc === true, i.hb === true);
  P.client.tm.fixedUpdate(DT, i.cc === true, i.cb === true);
  kin(P.host);
  kin(P.client);
  P.client.door.target = P.host.door.target;
  P.client.door.open = P.host.door.open;
}

function run(P: Pair, seconds: number, each?: () => void): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) {
    tick(P);
    each?.();
  }
}

const dev = (p: Page): DeadweightDevice => p.tm.devices.get('a4-deadweight') as DeadweightDevice;
const at = (p: Page, x: number, z: number): void => void p.c.pos.set(x, 0, z);

/** The page's player hangs on the chain it stands under, the grate opens on the host. */
function hangAndLift(P: Pair, who: 'host' | 'client'): void {
  tick(P, who === 'host' ? { hc: true } : { cc: true });
  expect(P[who].tm.state).toBe('chainGrab');
  run(P, DEADWEIGHT.grab + DEADWEIGHT.lift + 0.2);
  expect(P[who].tm.state).toBe('chainHang');
  expect(P.host.door.target).toBe(1);
}

/** Walk the client's body across the doorway in 0.1 m steps (no prompt used). */
function walkClient(P: Pair, x: number, z0: number, z1: number): void {
  const n = Math.round(Math.abs(z1 - z0) / 0.1);
  for (let i = 0; i <= n; i++) {
    at(P.client, x, z0 + ((z1 - z0) * i) / n);
    tick(P);
  }
}

const kit0 = flags.kitMoves;
const coopKit0 = flags.coopKit;
beforeAll(() => {
  flags.kitMoves = new Set(['deadweight']);
  flags.coopKit = false;
});
afterAll(() => {
  flags.kitMoves = kit0;
  flags.coopKit = coopKit0;
});
beforeEach(() => registerKitMove(DEADWEIGHT_MOVE));
afterEach(() => {
  flags.kitMoves = new Set(['deadweight']);
  vi.restoreAllMocks();
});

describe('(coop-kit K1) Deadweight: the spot and its device', () => {
  it('the device exists with the id off, matches its index on both pages and finds the door by its text id', () => {
    flags.kitMoves = new Set();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const P = pair(UNDER_NEAR, AWAY);
    P.host.mates.length = 0;
    tick(P);
    const d = dev(P.host);
    expect(P.host.tm.devices.list).toHaveLength(1);
    expect(isDeadweightDevice(d)).toBe(true);
    expect(kitSpotIndex(P.host.tm.devices.list, 'a4-deadweight')).toBe(0);
    expect(kitSpotIndex(P.client.tm.devices.list, 'a4-deadweight')).toBe(0);
    expect([d.door, d.doorIdx, d.x, d.y, d.z, d.x2, d.y2, d.z2]).toEqual(['37', 0, 101.75, 2.4, 22.5, 101.75, 2.4, 25.5]);
    expect(d.cx).toBeCloseTo(102.5);
    expect(d.cz).toBeCloseTo(24);
    expect(d.hw).toBe(1.5);
    expect([d.nx, d.nz, d.tx, d.tz]).toEqual([0, 1, 1, -0]);
    expect([d.open, d.opens, d.noticed, d.user]).toEqual([0, 0, -1, '']);
    expect(P.host.tm.prompt).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it("a door id the level does not have leaves the device listed but inert (no offer), warned once", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const host = page(false, UNDER_NEAR, '38');
    host.mate.id = 'c1';
    host.mate.pos.set(AWAY.x, 0, AWAY.z);
    for (let i = 0; i < 10; i++) host.tm.fixedUpdate(DT, i === 5, false);
    expect(dev(host).doorIdx).toBe(-1);
    expect(host.tm.state).not.toBe('chainGrab');
    expect(host.tm.prompt ?? '').not.toMatch(/chain/);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toMatch(/a4-deadweight.*38/);
  });

  it("the starting bands (logged): A4 passes; a 2.0 m grip, a chain 0.8 m off the plane, both chains one side don't", () => {
    const a4 = spotA4('37');
    expect(deadweightSpotOk(a4, 102.5, 24, 0)).toBe('');
    expect(deadweightSpotOk({ ...a4, y: 2.0 }, 102.5, 24, 0)).toBe('grip');
    expect(deadweightSpotOk({ ...a4, z: 23.2, z2: 24.8 }, 102.5, 24, 0)).toBe('chain');
    expect(deadweightSpotOk({ ...a4, z: 21.5, z2: 22.8 }, 102.5, 24, 0)).toBe('sides');
  });
});

describe('(coop-kit K1) Deadweight: the hanger', () => {
  it('single player (no mates): no prompt and no state under a chain', () => {
    const P = pair(UNDER_NEAR, AWAY);
    P.host.mates.length = 0;
    tick(P);
    expect(P.host.tm.prompt).toBeNull();
    tick(P, { hc: true });
    run(P, 1);
    expect(P.host.tm.state).toBe('none');
    expect(P.host.door.target).toBe(0);
  });

  it('hang: the prompt at the grip, grab -> hang (wire brace + 64, s -1 then +1), feet never under floor + 0.05; B, Co-op or a hit let go', () => {
    const P = pair(UNDER_NEAR, AWAY);
    const h = P.host;
    tick(P);
    expect(h.tm.prompt).toBe('Co-op: hang on the chain (deadweight)');
    expect([h.tm.promptAt.x, h.tm.promptAt.y, h.tm.promptAt.z]).toEqual([101.75, 2.4 - 0.3, 22.5]);
    tick(P, { hc: true });
    expect(h.tm.state).toBe('chainGrab');
    expect([h.tm.mode, h.tm.wireSub, h.tm.wireS]).toEqual(['brace', DEADWEIGHT_SUB, -1]);
    expect(h.tm.count.offers).toBe(1);
    expect(dev(h).user).toBe('@local');
    let lowGrab = Infinity;
    run(P, DEADWEIGHT.grab + 0.05, () => void (lowGrab = Math.min(lowGrab, h.c.pos.y)));
    expect(lowGrab).toBeGreaterThanOrEqual(0);
    expect(h.tm.state).toBe('chainHang');
    expect(h.tm.wireS).toBe(1);
    expect(h.tm.prompt).toBe('Hanging on the chain: Co-op or B lets go');
    let low = Infinity;
    run(P, 1.5, () => void (low = Math.min(low, h.c.pos.y)));
    expect(low).toBeGreaterThanOrEqual(DEADWEIGHT.footClear - 1e-9);
    // K1-4: A4's 2.4 m grip: the sag ends with the feet just off the floor
    expect(h.c.pos.y).toBeCloseTo(DEADWEIGHT.footClear, 5);
    expect([h.c.pos.x, h.c.pos.z]).toEqual([101.75, 22.5]);
    // B lets go: the drop, then free on the floor
    tick(P, { hb: true });
    expect(h.tm.state).toBe('chainDrop');
    expect(h.tm.wireS).toBe(-1);
    expect(h.c.swallowCrouch).toBe(true);
    run(P, DEADWEIGHT.chainDrop + 0.05);
    expect(h.tm.state).toBe('none');
    expect(h.c.pos.y).toBeCloseTo(0, 5);
    expect(h.c.override).toBeNull();
    expect(dev(h).user).toBe('');
    // Co-op lets go too
    tick(P, { hc: true });
    run(P, DEADWEIGHT.grab + 0.2);
    expect(h.tm.state).toBe('chainHang');
    tick(P, { hc: true });
    expect(h.tm.state).toBe('chainDrop');
    run(P, DEADWEIGHT.chainDrop + 0.05);
    expect(h.tm.state).toBe('none');
    // a hit drops
    tick(P, { hc: true });
    run(P, DEADWEIGHT.grab + 0.2);
    h.health.hp -= 10;
    tick(P);
    expect(h.tm.state).toBe('chainDrop');
    expect(h.tm.endWhy).toBe('deadweight: hurt');
  });
});

describe("(coop-kit K1) Deadweight: the host's rule", () => {
  it('the host hanging: opens only after `lift` of the hang (not during the grab); let go: shuts after `drop`', () => {
    const P = pair(UNDER_NEAR, AWAY);
    tick(P, { hc: true });
    run(P, DEADWEIGHT.grab - 0.05);
    expect(P.host.tm.state).toBe('chainGrab');
    run(P, 0.1);
    expect(P.host.tm.state).toBe('chainHang');
    expect(P.host.door.target).toBe(0);
    run(P, DEADWEIGHT.lift - 0.15);
    expect(P.host.door.target).toBe(0);
    run(P, 0.15);
    expect(P.host.door.target).toBe(1);
    expect([dev(P.host).open, dev(P.host).opens, dev(P.host).user, dev(P.host).lastHanger]).toEqual([1, 1, '@local', '@local']);
    expect(P.client.door.target).toBe(1);
    tick(P, { hb: true });
    run(P, DEADWEIGHT.drop - 0.1);
    expect(P.host.door.target).toBe(1);
    run(P, 0.15);
    expect(P.host.door.target).toBe(0);
    expect(dev(P.host).open).toBe(0);
    expect(P.host.sets).toEqual([true, false]);
    expect(P.client.door.target).toBe(0);
  });

  it("the client hanging: the host reads the client's MoveState and opens after the lift time; the client page never drives the door", () => {
    const P = pair(AWAY, UNDER_NEAR);
    tick(P, { cc: true });
    expect(P.client.tm.state).toBe('chainGrab');
    run(P, DEADWEIGHT.grab + 0.05);
    expect(P.client.tm.state).toBe('chainHang');
    run(P, DEADWEIGHT.lift - 0.15);
    expect(P.host.door.target).toBe(0);
    run(P, 0.2);
    expect(P.host.door.target).toBe(1);
    expect(P.client.door.target).toBe(1);
    expect(dev(P.host).lastHanger).toBe('c1');
    tick(P, { cb: true });
    expect(P.client.tm.state).toBe('chainDrop');
    run(P, DEADWEIGHT.drop + 0.1);
    expect(P.host.door.target).toBe(0);
    expect(P.host.sets).toEqual([true, false]);
    expect(P.client.sets).toEqual([]);
    expect(dev(P.client).open).toBe(0);
  });

  it('a client cannot open it without hanging: on the ground under the chain, braced 3 m off, or still grabbing', () => {
    const P = pair(AWAY, AWAY);
    P.host.manual = true;
    const m = P.host.mate;
    const tryMate = (mode: string, s: number, x: number, y: number, z: number): number => {
      m.mode = mode;
      m.sub = mode === 'ground' ? 0 : DEADWEIGHT_SUB;
      m.s = s;
      m.pos.set(x, y, z);
      run(P, 2);
      const t = P.host.door.target;
      m.mode = 'ground';
      m.sub = m.s = 0;
      run(P, 1);
      return t;
    };
    expect(tryMate('ground', 0, UNDER_NEAR.x, 0, UNDER_NEAR.z)).toBe(0);
    expect(tryMate('brace', 1, UNDER_NEAR.x, 0.05, UNDER_NEAR.z - 3)).toBe(0);
    expect(tryMate('brace', -1, UNDER_NEAR.x, 0.25, UNDER_NEAR.z)).toBe(0);
    // a settled hang under the chain does open it (the control)
    expect(tryMate('brace', 1, UNDER_NEAR.x, 0.05, UNDER_NEAR.z)).toBe(1);
    expect(P.host.sets).toEqual([true, false]);
  });

  it('no crush: let go with the passer in the doorway, in `grateUnder`, or a live guard in it: stays open, shuts once clear', () => {
    // the passer standing in the doorway
    let P = pair(UNDER_NEAR, AWAY);
    hangAndLift(P, 'host');
    at(P.client, 102.5, 24.0);
    tick(P, { hb: true });
    run(P, DEADWEIGHT.chainDrop + DEADWEIGHT.drop + 0.3);
    expect(P.host.tm.state).toBe('none');
    expect(P.host.door.target).toBe(1);
    at(P.client, 102.5, 25.0);
    run(P, 0.05);
    expect(P.host.door.target).toBe(0);

    // the passer in `grateUnder`
    P = pair(UNDER_NEAR, PASS_NEAR);
    hangAndLift(P, 'host');
    tick(P, { cc: true });
    expect(P.client.tm.state).toBe('grateUnder');
    tick(P, { hb: true });
    run(P, DEADWEIGHT.passTime - 0.15);
    expect(P.client.tm.state).toBe('grateUnder');
    expect(P.host.door.target).toBe(1);
    run(P, 0.3);
    expect(P.client.tm.state).toBe('none');
    expect(P.host.door.target).toBe(0);

    // a live guard in the doorway
    P = pair(UNDER_NEAR, AWAY);
    hangAndLift(P, 'host');
    const guard = { alive: true, pos: { x: 102.6, z: 24.1 } };
    P.host.enemies.push(guard);
    tick(P, { hb: true });
    run(P, 1.5);
    expect(P.host.door.target).toBe(1);
    guard.alive = false;
    run(P, 0.05);
    expect(P.host.door.target).toBe(0);
  });
});

describe('(coop-kit K1) Deadweight: the pass and the done call', () => {
  it("the pass: wait, then duck under (boost + 64, crouched) to the far side; the host's onKitDone once, host page only", () => {
    const P = pair(UNDER_NEAR, PASS_NEAR);
    tick(P);
    expect(P.client.tm.prompt ?? '').not.toMatch(/grate/);
    tick(P, { hc: true });
    run(P, DEADWEIGHT.grab + 0.1);
    expect(P.host.tm.state).toBe('chainHang');
    expect(P.client.tm.prompt).toBe('Wait for the grate to lift');
    expect(P.client.tm.state).toBe('none');
    run(P, DEADWEIGHT.lift + 0.1);
    expect(P.client.door.target).toBe(1);
    expect(P.client.tm.prompt).toBe('Co-op: duck under the grate (deadweight)');
    tick(P, { cc: true });
    expect(P.client.tm.state).toBe('grateUnder');
    expect([P.client.tm.mode, P.client.tm.wireSub, P.client.tm.wireS]).toEqual(['boost', DEADWEIGHT_SUB, 1]);
    expect(P.client.c.override?.crouch).toBe(true);
    expect(P.client.tm.partner).toBe('h0');
    run(P, DEADWEIGHT.passTime + 0.05);
    expect(P.client.tm.state).toBe('none');
    expect(P.client.c.pos.x).toBeCloseTo(102.5, 5);
    // (the move ends in the step of its last put: the body stops one step short, ~2 cm)
    expect(P.client.c.pos.z).toBeCloseTo(24 + DEADWEIGHT.passOut, 1);
    expect(P.host.onKitDone).toHaveBeenCalledTimes(1);
    expect(P.host.onKitDone).toHaveBeenCalledWith('deadweight', 'a4-deadweight', 'c1', undefined);
    expect(P.client.onKitDone).not.toHaveBeenCalled();
  });

  it('each way: the client through hangs on the far chain and the host passes: the second call; two in all', () => {
    const P = pair(UNDER_NEAR, PASS_NEAR);
    hangAndLift(P, 'host');
    tick(P, { cc: true });
    run(P, DEADWEIGHT.passTime + 0.05);
    expect(P.host.onKitDone).toHaveBeenCalledTimes(1);
    // the host lets go; the grate shuts behind the client
    tick(P, { hb: true });
    run(P, DEADWEIGHT.chainDrop + 0.1);
    expect(P.host.tm.state).toBe('none');
    expect(P.host.door.target).toBe(0);
    // the far chain: the client hangs, the host ducks under the other way
    at(P.client, UNDER_FAR.x, UNDER_FAR.z);
    at(P.host, PASS_NEAR.x, PASS_NEAR.z);
    hangAndLift(P, 'client');
    expect(dev(P.host).lastHanger).toBe('c1');
    tick(P);
    expect(P.host.tm.prompt).toBe('Co-op: duck under the grate (deadweight)');
    tick(P, { hc: true });
    expect(P.host.tm.state).toBe('grateUnder');
    run(P, DEADWEIGHT.passTime + 0.05);
    expect(P.host.tm.state).toBe('none');
    expect(P.host.c.pos.z).toBeCloseTo(24 + DEADWEIGHT.passOut, 1);
    expect(P.host.onKitDone).toHaveBeenCalledTimes(2);
    expect(P.host.onKitDone).toHaveBeenLastCalledWith('deadweight', 'a4-deadweight', undefined, 'c1');
    expect(P.client.onKitDone).not.toHaveBeenCalled();
  });

  it('K1-2: a walk-through under the held grate counts; the hanger slipping through itself and a motor-opened door do not', () => {
    // a walk-through, no prompt used
    let P = pair(UNDER_NEAR, AWAY);
    hangAndLift(P, 'host');
    walkClient(P, 102.5, 23.0, 25.0);
    expect(P.host.onKitDone).toHaveBeenCalledTimes(1);
    expect(P.host.onKitDone).toHaveBeenCalledWith('deadweight', 'a4-deadweight', 'c1', undefined);

    // the hanger lets go and crosses itself (held open by a guard in the doorway): nothing
    P = pair(AWAY, UNDER_NEAR);
    hangAndLift(P, 'client');
    const guard = { alive: true, pos: { x: 103.5, z: 24 } };
    P.host.enemies.push(guard);
    tick(P, { cb: true });
    run(P, DEADWEIGHT.chainDrop + 0.05);
    expect(P.client.tm.state).toBe('none');
    walkClient(P, 102.5, 23.0, 25.0);
    expect(P.host.door.target).toBe(1);
    expect(P.host.onKitDone).not.toHaveBeenCalled();

    // the door opened by something else (the motor): nothing
    P = pair(AWAY, AWAY);
    P.host.doors.setOpen(P.host.door, true);
    walkClient(P, 102.5, 23.0, 25.0);
    expect(P.host.onKitDone).not.toHaveBeenCalled();
    expect(dev(P.host).open).toBe(0);
  });

  it('K1-3: a retry teleport (8 m) ends a hang or a pass at once; the host shuts the grate after `drop`', () => {
    let P = pair(AWAY, UNDER_NEAR);
    hangAndLift(P, 'client');
    at(P.client, UNDER_NEAR.x, UNDER_NEAR.z - 8);
    tick(P);
    expect(P.client.tm.state).toBe('none');
    expect(P.client.tm.endWhy).toBe('deadweight: moved');
    expect(P.client.c.override).toBeNull();
    run(P, DEADWEIGHT.drop + 0.1);
    expect(P.host.door.target).toBe(0);

    P = pair(UNDER_NEAR, PASS_NEAR);
    hangAndLift(P, 'host');
    tick(P, { cc: true });
    run(P, 0.4);
    expect(P.client.tm.state).toBe('grateUnder');
    at(P.client, PASS_NEAR.x, PASS_NEAR.z - 8);
    tick(P);
    expect(P.client.tm.state).toBe('none');
    expect(P.client.tm.endWhy).toBe('deadweight: moved');
    tick(P, { hb: true });
    run(P, DEADWEIGHT.drop + 0.1);
    expect(P.host.door.target).toBe(0);
    expect(P.host.onKitDone).not.toHaveBeenCalled();
  });
});

describe('(coop-kit K1) Deadweight: the id', () => {
  it('`?kitmoves=0`: no prompt on either page, and a spoofed hanging mate opens nothing on the host', () => {
    flags.kitMoves = new Set();
    const P = pair(UNDER_NEAR, PASS_NEAR);
    tick(P);
    expect(P.host.tm.prompt ?? '').not.toMatch(/chain|grate/);
    expect(P.client.tm.prompt ?? '').not.toMatch(/chain|grate/);
    P.host.manual = true;
    P.host.mate.mode = 'brace';
    P.host.mate.sub = DEADWEIGHT_SUB;
    P.host.mate.s = 1;
    P.host.mate.pos.set(UNDER_FAR.x, 0.05, UNDER_FAR.z);
    run(P, 2);
    expect(P.host.door.target).toBe(0);
    expect(P.host.sets).toEqual([]);
    expect(P.host.tm.state).toBe('none');
  });

  it('`deadweight` is built: on with the default on (the game), off with it off', () => {
    expect(KIT_BUILT).toContain('deadweight');
    expect(readKitMoves(null, true).has('deadweight')).toBe(true);
    expect(readKitMoves(null, false).has('deadweight')).toBe(false);
  });
});
