import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { groupBaseOn, LightRegistry } from '../src/world/lights';
import { LightField } from '../src/world/lightField';
import { addTorchSlots } from '../src/world/torches';
import { parseMessage, type Msg } from '../src/net/protocol';
import { LampMirror, LampSender, type LampWire } from '../src/net/lampSync';
import { SectionStartState, type ResetDoor } from '../src/game/sectorReset';
import { BACK_HAND, BACK_TIMER, BOARD_BACK, BOARD_CUT, BOARD_NONE, IsolatorBoards, ISOLATOR_WINDOW, type BoardDef, type BoardSink } from '../src/game/isolators';
import { bytesPerCall, HEAP_NUMBER, sink } from './helpers/allocPerCall';

/**
 * (sector-redesign E4, EW8) Breaker / timed isolator boards: a breaker cuts until switched back, a timed isolator
 * returns its circuits once at the window's end, a cut fires the guards' `lightsOut`, a section restart (A50) puts the
 * board and its lamps back, the co-op client's lamps follow through slice L's `lamps` message, and the per-tick update
 * allocates nothing.
 */

/** One page's level lights: circuits 3 (two lamps) and 5 (one lamp), a lamp on no circuit, the torch slots. */
function level(): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = 0.05;
  reg.add({ x: 0, y: 3, z: 0, radius: 8, intensity: 0.9, group: 3 });
  reg.add({ x: 6, y: 3, z: 0, radius: 8, intensity: 0.9, group: 3 });
  reg.add({ x: 0, y: 3, z: 12, radius: 8, intensity: 0.9, group: 5 });
  reg.add({ x: 20, y: 3, z: 0, radius: 6, intensity: 0.8 });
  addTorchSlots(reg);
  return reg;
}

/** Board 0 a breaker on circuit 3; board 1 a timed isolator on circuits 3 and 5 (the default window). */
const BOARDS: BoardDef[] = [
  { pos: new Vector3(2, 1.3, -3), yaw: 0, groups: [3] },
  { pos: new Vector3(-4, 1.3, 6), yaw: Math.PI / 2, groups: [3, 5], window: ISOLATOR_WINDOW },
];

/** The game side as `StealthSystems` wires it: a cut calls the guards' `lightsOut` at the board. */
function recorder(): BoardSink & { outs: number[][]; backs: number[][] } {
  const r = {
    outs: [] as number[][],
    backs: [] as number[][],
    cut(i: number, x: number, z: number) {
      r.outs.push([i, x, z]);
    },
    back(i: number, how: number) {
      r.backs.push([i, how]);
    },
  };
  return r;
}

const doors = { list: [] as ResetDoor[], setOpen: () => undefined, crack: () => false };
const meter = (f: LightField): number => f.bodyLevel(0.5, 0, 0, 1.8);
const wire = (w: LampWire): LampWire => {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'lamps', ...w }))) as Extract<Msg, { t: 'lamps' }> | null;
  expect(m).not.toBeNull();
  return m!;
};
const DT = 1 / 60;

describe('Sector Ops breaker / timed isolator boards (E4, EW8)', () => {
  it('a breaker cuts its circuit until switched back, and the cut draws a guard', () => {
    const reg = level();
    const rec = recorder();
    const b = new IsolatorBoards(BOARDS, reg, rec);
    expect(b.cut[0]).toBe(0);
    expect(b.use(0)).toBe(BOARD_CUT);
    expect(groupBaseOn(reg, 3)).toBe(false);
    expect(groupBaseOn(reg, 5)).toBe(true);
    expect(rec.outs).toEqual([[0, 2, -3]]);
    // no window: time does not bring it back
    for (let k = 0; k < 60 * 60; k++) b.update(DT);
    expect(groupBaseOn(reg, 3)).toBe(false);
    expect(b.use(0)).toBe(BOARD_BACK);
    expect(groupBaseOn(reg, 3)).toBe(true);
    expect(rec.backs).toEqual([[0, BACK_HAND]]);
    // switching back draws nobody
    expect(rec.outs.length).toBe(1);
  });

  it('a timed isolator returns its circuits exactly once at the window end', () => {
    const reg = level();
    const rec = recorder();
    const b = new IsolatorBoards(BOARDS, reg, rec);
    expect(b.timed(1)).toBe(true);
    expect(b.timed(0)).toBe(false);
    expect(b.use(1)).toBe(BOARD_CUT);
    expect(groupBaseOn(reg, 3) || groupBaseOn(reg, 5)).toBe(false);
    expect(rec.outs).toEqual([[1, -4, 6]]);
    // the window is the player's: using the board again does nothing
    expect(b.use(1)).toBe(BOARD_NONE);
    let back = 0;
    let at = -1;
    const steps = Math.ceil((ISOLATOR_WINDOW + 5) / DT);
    for (let k = 0; k < steps; k++) {
      const n = b.update(DT);
      if (n && at < 0) at = (k + 1) * DT;
      back += n;
    }
    expect(back).toBe(1);
    expect(b.returns).toBe(1);
    expect(at).toBeGreaterThanOrEqual(ISOLATOR_WINDOW - 1e-6);
    expect(at).toBeLessThan(ISOLATOR_WINDOW + 2 * DT);
    expect(groupBaseOn(reg, 3) && groupBaseOn(reg, 5)).toBe(true);
    expect(rec.backs).toEqual([[1, BACK_TIMER]]);
    // idle again: a second use starts a fresh window (and draws a guard again)
    expect(b.use(1)).toBe(BOARD_CUT);
    expect(rec.outs.length).toBe(2);
  });

  it("(guard-ai LR16-4) a guard's switchBack puts a cut breaker back; a running timed window is the player's (refused, the timer returns it)", () => {
    const reg = level();
    const rec = recorder();
    const b = new IsolatorBoards(BOARDS, reg, rec);
    expect(b.switchBack(0)).toBe(false);
    b.use(0);
    expect(b.cutBoard(3, 0, 0)).toBe(0);
    expect(b.switchBack(0)).toBe(true);
    expect(groupBaseOn(reg, 3)).toBe(true);
    expect(rec.backs).toEqual([[0, BACK_HAND]]);
    b.use(1);
    expect(b.holding(5)).toBe(true);
    expect(b.cutBoard(5, 0, 0)).toBe(-1);
    expect(b.switchBack(1)).toBe(false);
    expect(groupBaseOn(reg, 5)).toBe(false);
    for (let k = 0; k < Math.ceil((ISOLATOR_WINDOW + 1) / DT); k++) b.update(DT);
    expect(b.returns).toBe(1);
    expect(b.holding(5)).toBe(false);
    expect(groupBaseOn(reg, 5)).toBe(true);
    expect(rec.backs).toEqual([[0, BACK_HAND], [1, BACK_TIMER]]);
  });

  it('a wall switch on a shared circuit moves an idle breaker with it', () => {
    const reg = level();
    const b = new IsolatorBoards(BOARDS, reg);
    reg.setGroup(3, false);
    b.follow();
    expect(b.cut[0]).toBe(1);
    // the breaker now puts it back
    expect(b.use(0)).toBe(BOARD_BACK);
    expect(groupBaseOn(reg, 3)).toBe(true);
  });

  it('a section restart (A50) puts the board and its lamps back; a dropped window never relights later', () => {
    const reg = level();
    const b = new IsolatorBoards(BOARDS, reg);
    const start = new SectionStartState();
    // the breaker is cut before the section begins: it stays cut across the restart
    b.use(0);
    start.take(reg, doors);
    b.use(1);
    for (let k = 0; k < 300; k++) b.update(DT);
    expect(groupBaseOn(reg, 5)).toBe(false);
    // the restart's order: `resetForRestart` (cancel), the start state's apply, `syncSwitches` (follow)
    b.cancel();
    start.apply(reg, doors);
    b.follow();
    expect(b.left[1]).toBe(0);
    expect(b.cut[1]).toBe(0);
    expect(groupBaseOn(reg, 5)).toBe(true);
    expect(b.cut[0]).toBe(1);
    expect(groupBaseOn(reg, 3)).toBe(false);
    for (let k = 0; k < Math.ceil((ISOLATOR_WINDOW + 1) / DT); k++) expect(b.update(DT)).toBe(0);
    expect(b.returns).toBe(0);
    // the isolator works again after the restart
    expect(b.use(1)).toBe(BOARD_CUT);
    expect(b.left[1]).toBe(ISOLATOR_WINDOW);
  });

  it('I5: a window running at a section change, then a restart in the next section: the lamps are lit', () => {
    const reg = level();
    const b = new IsolatorBoards(BOARDS, reg);
    const start = new SectionStartState();
    b.use(1);
    // the next section begins while the window runs: `take` records the dark lamps, then the mode marks the groups on
    start.take(reg, doors);
    for (const g of BOARDS[1]!.groups) start.markGroupOn(g);
    for (let k = 0; k < 120; k++) b.update(DT);
    expect(groupBaseOn(reg, 3)).toBe(false);
    b.cancel();
    start.apply(reg, doors);
    b.follow();
    expect(groupBaseOn(reg, 3)).toBe(true);
    expect(groupBaseOn(reg, 5)).toBe(true);
    expect(b.cut[1]).toBe(0);
    // the restart-during-a-cycle path: `cancel` relights silently, so a `take` after it records them on
    b.use(1);
    const sink2 = recorder();
    const b2 = new IsolatorBoards(BOARDS, reg, sink2);
    b.cancel();
    expect(groupBaseOn(reg, 3)).toBe(true);
    expect(groupBaseOn(reg, 5)).toBe(true);
    expect(sink2.backs.length + sink2.outs.length).toBe(0);
    const s2 = new SectionStartState();
    s2.take(reg, doors);
    reg.setGroup(3, false);
    s2.apply(reg, doors);
    expect(groupBaseOn(reg, 3)).toBe(true);
    b2.follow();
    expect(b2.cut[0]).toBe(0);
  });

  it('two boards on one circuit stay in step (follow after one moves)', () => {
    const reg = level();
    const two: BoardDef[] = [
      { pos: new Vector3(0, 1.3, 0), yaw: 0, groups: [3] },
      { pos: new Vector3(5, 1.3, 0), yaw: 0, groups: [3] },
    ];
    const b = new IsolatorBoards(two, reg);
    expect(b.use(0)).toBe(BOARD_CUT);
    b.follow();
    expect(b.cut[0]).toBe(1);
    expect(b.cut[1]).toBe(1);
    expect(b.use(1)).toBe(BOARD_BACK);
    b.follow();
    expect(b.cut[0]).toBe(0);
    expect(b.cut[1]).toBe(0);
  });

  it('a lamp shot during a window stays dark at the return', () => {
    const reg = level();
    const b = new IsolatorBoards(BOARDS, reg);
    b.use(1);
    expect(reg.destroy(0)).toBe(true);
    for (let k = 0; k < Math.ceil((ISOLATOR_WINDOW + 1) / DT); k++) b.update(DT);
    expect(b.returns).toBe(1);
    expect(reg.lights[0]!.on).toBe(false);
    expect(reg.lights[1]!.on).toBe(true);
  });

  it('a circuit with every lamp shot does not stick its board', () => {
    const reg = level();
    const b = new IsolatorBoards(BOARDS, reg);
    expect(b.cut[0]).toBe(0);
    reg.destroy(0);
    reg.destroy(1);
    b.follow();
    expect(b.cut[0]).toBe(0);
    // an isolator whose circuits are all shot keeps its place too, and can still start a window
    reg.destroy(2);
    b.follow();
    expect(b.cut[1]).toBe(0);
    expect(b.use(1)).toBe(BOARD_CUT);
  });

  it('co-op: the client sees the same circuit state through slice L lamps (cut, window end), picture = meter', () => {
    const host = level();
    const client = level();
    const hf = new LightField(null, host);
    const cf = new LightField(null, client);
    const tx = new LampSender();
    const rx = new LampMirror();
    const b = new IsolatorBoards(BOARDS, host);
    const pump = (dt: number): void => {
      const w = tx.step(host, dt);
      if (w) rx.apply(client, wire(w));
    };
    pump(DT);
    const lit = meter(cf);
    expect(lit).toBeCloseTo(meter(hf), 6);
    // the client's `use` reaches the host, which runs the board (coopHost.onUse -> it.onUse -> boards.use)
    b.use(1);
    pump(DT);
    for (const g of [3, 5]) expect(groupBaseOn(client, g)).toBe(groupBaseOn(host, g));
    expect(groupBaseOn(client, 3)).toBe(false);
    expect(meter(cf)).toBeCloseTo(meter(hf), 6);
    expect(meter(cf)).toBeLessThan(lit);
    // the window runs out on the host; the next `lamps` brings the client's circuits back
    for (let k = 0; k < Math.ceil((ISOLATOR_WINDOW + 1) / DT); k++) {
      b.update(DT);
      pump(DT);
    }
    for (const g of [3, 5]) expect(groupBaseOn(client, g)).toBe(true);
    expect(meter(cf)).toBeCloseTo(lit, 6);
    for (let i = 0; i < host.lights.length; i++) expect(client.lights[i]!.on).toBe(host.lights[i]!.on);
  });

  it('allocates nothing per tick (running windows and idle)', async () => {
    const reg = level();
    const long: BoardDef[] = [
      { pos: new Vector3(0, 1.3, 0), yaw: 0, groups: [3], window: 1e12 },
      { pos: new Vector3(0, 1.3, 1), yaw: 0, groups: [5], window: 1e12 },
      { pos: new Vector3(0, 1.3, 2), yaw: 0, groups: [3] },
    ];
    const b = new IsolatorBoards(long, reg);
    b.use(0);
    b.use(1);
    b.use(2);
    sink[0] = 0;
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0]! += b.update(DT);
    }, HEAP_NUMBER);
    console.info(`bytes per IsolatorBoards.update: ${per.toFixed(1)}`);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
    expect(b.left[0]!).toBeGreaterThan(0);
  });
});
