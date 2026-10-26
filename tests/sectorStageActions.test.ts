import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NavGrid, type NavBlocker } from '../src/ai/navGrid';
import { LightRegistry } from '../src/world/lights';
import { SectionStartState, type ResetDoor, type ResetDoors } from '../src/game/sectorReset';
import { SECTOR, SECTOR_REINFORCE_KIND, checkSectors, type SectorDef } from '../src/game/sectors';
import { STAGE_DOOR_CLEAR, STAGE_MAX, SectorStageRun, addDoorClosure, checkStageActions, doorFinder, doorwayClear, reinforceSlot, type SectorStageAction } from '../src/game/sectorStage';
import { DOOR } from '../src/world/doors';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';

/** (sector-redesign E5, EW9) Alarm-stage extras: lights to full, lockdown doors, the response route, restart undo. */

/** A wall along x = 0 (z -10..10) with two 1.8 m doorways: A at z 0 and B at z 6. */
function twoDoorGrid(): NavGrid {
  const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
  return new NavGrid({
    minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.5,
    sample: () => ({ h: 0, ok: true }),
    blockers: [wall(-5.45, 4.55), wall(3, 2.1), wall(8.45, 1.55)],
    agentRadius: 0.3, stepHeight: 0.45, seed: [-5, -5],
  });
}
/** The two doors as anchors: hinge at the doorway's -z end, the leaf along +z (yaw 0), 1 m wide. */
const ANCHORS = [
  { hinge: { x: 0, y: 0, z: -0.5 }, width: 1, yaw: 0 },
  { hinge: { x: 0, y: 0, z: 5.5 }, width: 1, yaw: 0 },
];
const DOOR_A: [number, number] = [0, 0];
const DOOR_B: [number, number] = [0, 6];

/** One section: start west of the wall, objective and extraction east. */
function section(stageActions?: SectorStageAction[]): SectorDef {
  return {
    id: 's',
    name: 'S',
    start: { x: -4, y: 0, z: 0, yaw: 0 },
    objective: { kind: 'hack', label: 'Hack', x: 4, y: 0, z: 0, yaw: 0 },
    extract: { label: 'Out', box: [3, 7, 5, 9] },
    guards: [],
    reinforce: [[-5, -8], [-5, 8]],
    perStage: 2,
    routes: [],
    stageActions,
  };
}

interface StubDoor extends ResetDoor {
  anchor: { locked: boolean };
  id: number;
}
function stubDoors(n: number): ResetDoors<StubDoor> & { list: StubDoor[] } {
  const list: StubDoor[] = [];
  for (let i = 0; i < n; i++) list.push({ id: i, anchor: { locked: false }, target: 1, cracked: false });
  return { list, setOpen: (d, open) => void (d.target = open ? 1 : 0), crack: () => false };
}

/** The mode's wiring in miniature: the registry, the doors (lock = shut + locked), the nav grid. */
function rig(defs: SectorDef[], canShut?: (d: StubDoor) => boolean) {
  const reg = new LightRegistry();
  // group 4: two lamps off (cut before the alarm); group 5: one lamp on
  reg.add({ x: 0, y: 3, z: 0, group: 4, on: false });
  reg.add({ x: 1, y: 3, z: 0, group: 4, on: false });
  reg.add({ x: 2, y: 3, z: 0, group: 5, on: true });
  const doors = stubDoors(2);
  const nav = twoDoorGrid();
  const find = doorFinder(ANCHORS);
  const run = new SectorStageRun<StubDoor>(
    defs,
    {
      groupOn: (g) => reg.setGroup(g, true),
      lock: (d, on) => {
        d.anchor.locked = on;
        if (on) d.target = 0;
      },
      navClosed: (id, on) => nav.setClosed(id, on),
      canShut,
    },
    (_sec, x, z) => {
      const info = find(x, z);
      if (!info) return null;
      return { door: doors.list[info.cz > 3 ? 1 : 0]!, nav: addDoorClosure(nav, info) };
    },
  );
  return { reg, doors, nav, run };
}
const on = (reg: LightRegistry, id: number) => reg.get(id)!.on;

describe('stage actions: the data shape and checks', () => {
  it('STAGE_MAX is the alarm cap', () => {
    expect(STAGE_MAX).toBe(SECTOR.alarmMax);
  });

  it('rejects a bad stage, a stage listed twice, a one-point route, a negative group and a lock on a connector or team door', () => {
    const d = section([
      { stage: 4 as 1, lightsFull: [-1] },
      { stage: 1, responseRoute: [[1, 1]] },
      { stage: 1 },
    ]);
    const e = checkStageActions([d]);
    expect(e).toContain('s: stage action stage 4 is not 1..3');
    expect(e).toContain('s: stage 1 listed twice');
    expect(e).toContain('s: stage 1 response route needs 2+ points');
    expect(e).toContain('s: stage 4 light group -1 is not a group');
    const c: SectorDef = { ...section([{ stage: 2, lockDoors: [[10.3, 0], [20, 0.5]] }]), extract: undefined, connector: { label: 'C', box: [9, -1, 12, 1], nearAt: [10, 0], checkpoint: { x: 11, y: 0, z: 0, yaw: 0 } }, bolts: [{ at: [20, 0], side: [1, 0] }] };
    const e2 = checkStageActions([c, section()]);
    expect(e2).toContain('s: stage 2 lockdown door (10.3, 0) is a connector or team door');
    expect(e2).toContain('s: stage 2 lockdown door (20, 0.5) is a connector or team door');
  });

  it('rejects a lockdown on a pair gate door or a keypad door (release would unlock it after team.reset / rekey)', () => {
    const d: SectorDef = {
      ...section([{ stage: 2, lockDoors: [[30.2, 0], [40, 0.3], [50, 0]] }]),
      pairGates: [{ door: [30, 0], a: { at: [29, 1] }, b: { at: [31, 1] } }],
      keypads: [{ at: [40, 0], code: 'k1' }],
      intel: [{ kind: 'objective', grants: 'k1', line: 'Code' }],
    };
    const e = checkStageActions([d]);
    expect(e).toContain('s: stage 2 lockdown door (30.2, 0) is a connector or team door');
    expect(e).toContain('s: stage 2 lockdown door (40, 0.3) is a connector or team door');
    expect(e.some((m) => m.includes('(50, 0)'))).toBe(false);
  });

  it('checkSectors with the nav grid: a lock that leaves another way passes; one that cuts the only way is a softlock', () => {
    const nav = twoDoorGrid();
    const check = { nav, doorAt: doorFinder(ANCHORS) };
    // the start reaches the objective through either doorway
    expect(nav.findPath([-4, 0], [4, 0])).not.toBeNull();
    expect(checkSectors([section([{ stage: 2, lockDoors: [DOOR_A] }])], check)).toEqual([]);
    const both = checkSectors([section([{ stage: 2, lockDoors: [DOOR_A] }, { stage: 3, lockDoors: [DOOR_B] }])], check);
    expect(both).toContain('s: the stage lockdown doors leave no nav path from the start to the objective (a softlock)');
    // the check leaves its closures open: the grid is as it was
    expect(nav.findPath([-4, 0], [4, 0])).not.toBeNull();
    // a lockdown with no door there
    expect(checkSectors([section([{ stage: 2, lockDoors: [[3, -6]] }])], check)).toContain('s: no door at lockdown (3, -6)');
  });
});

describe('stage actions: a player shut in behind a lockdown door (E5 fix)', () => {
  /** The wall along x = 0 with doorway A only (a side room west of it), or A and a back corridor B (`twoDoorGrid`). */
  function oneDoorGrid(): NavGrid {
    const wall = (cz: number, hz: number): NavBlocker => ({ cx: 0, cz, hx: 0.1, hz, yaw: 0, bottom: 0, top: 3 });
    return new NavGrid({
      minX: -6, maxX: 6, minZ: -10, maxZ: 10, cell: 0.5,
      sample: () => ({ h: 0, ok: true }),
      blockers: [wall(-5.45, 4.55), wall(5.45, 4.55)],
      agentRadius: 0.3, stepHeight: 0.45, seed: [4, -4],
    });
  }
  /** Start, objective and exit all east of the wall: only the side-room legs cross a door. */
  const east = (stageActions: SectorStageAction[]): SectorDef => ({ ...section(stageActions), start: { x: 4, y: 0, z: -4, yaw: 0 } });

  it('a one-door side room locked down is a softlock (a player inside cannot reach the exit)', () => {
    const nav = oneDoorGrid();
    // unlocked, the room's side of the door reaches the exit
    expect(nav.findPath([-0.8, 0], [4, 8])).not.toBeNull();
    const e = checkSectors([east([{ stage: 2, lockDoors: [DOOR_A] }])], { nav, doorAt: doorFinder(ANCHORS.slice(0, 1)) });
    expect(e).toContain('s: the stage lockdown doors leave no nav path from beside the lockdown door (0.0, 0.0) at (-0.8, 0.0) to the exit (a softlock)');
    // the exit side of the door is fine, and the start / objective legs never cross it
    expect(e.length).toBe(1);
  });

  it('the same room with a back corridor passes', () => {
    const nav = twoDoorGrid();
    expect(checkSectors([east([{ stage: 2, lockDoors: [DOOR_A] }])], { nav, doorAt: doorFinder(ANCHORS) })).toEqual([]);
  });
});

describe('a lockdown door never shuts on a player (E5 fix)', () => {
  const player = (x: number, z: number, alive = true) => ({ feet: { x, z }, target: { alive } });

  it('doorwayClear: a living player within DOOR.clearance of the doorway centre blocks it; a down one, or one 1 m off, does not', () => {
    expect(STAGE_DOOR_CLEAR).toBe(DOOR.clearance);
    expect(doorwayClear(0, 0, [])).toBe(true);
    expect(doorwayClear(0, 0, [player(0, 0)])).toBe(false);
    expect(doorwayClear(0, 0, [player(3, 3), player(0.5, 0.5)])).toBe(false);
    expect(doorwayClear(0, 0, [player(0, 0, false)])).toBe(true);
    expect(doorwayClear(0, 0, [player(1, 0), player(0, -1)])).toBe(true);
  });

  /** The rig with the mode's occupancy test over a mutable player list (host and partner). */
  function occupied(defs: SectorDef[]) {
    const players = [player(0, 0)];
    const r = rig(defs, (d) => doorwayClear(0, d.id === 1 ? 6 : 0, players));
    return { ...r, players };
  }

  it('occupied: the door waits pending, open and walkable; once the player steps 1 m away it shuts on the next step', () => {
    const { doors, nav, run, players } = occupied([section([{ stage: 2, lockDoors: [DOOR_A] }])]);
    const a = doors.list[0]!;
    const cell = nav.cellOf(0.1, 0.1);
    expect(run.raise(0, 1, 2).doors).toBe(0);
    expect(run.pendingCount()).toBe(1);
    expect(run.lockedCount()).toBe(0);
    expect(a.anchor.locked).toBe(false);
    expect(a.target).toBe(1);
    expect(nav.isWalkable(cell)).toBe(true);
    // still in the doorway: still waiting
    expect(run.step()).toBe(0);
    // the partner in the doorway holds it too
    players[0]!.feet.x = 1;
    players.push(player(-0.3, 0.2));
    expect(run.step()).toBe(0);
    players.pop();
    // clear: it shuts, locks and closes its nav
    expect(run.step()).toBe(1);
    expect(a.anchor.locked).toBe(true);
    expect(a.target).toBe(0);
    expect(nav.isWalkable(cell)).toBe(false);
    expect(run.pendingCount()).toBe(0);
    expect(run.lockedCount()).toBe(1);
    expect(run.step()).toBe(0);
  });

  it('clear at the stage: it shuts at once', () => {
    const { doors, run, players } = occupied([section([{ stage: 2, lockDoors: [DOOR_A] }])]);
    players[0]!.feet.z = -3;
    expect(run.raise(0, 1, 2).doors).toBe(1);
    expect(doors.list[0]!.anchor.locked).toBe(true);
  });

  it('release drops a pending lock: it never shuts after the restart, and nothing is unlocked', () => {
    const { doors, nav, run, players } = occupied([section([{ stage: 2, lockDoors: [DOOR_A] }])]);
    run.raise(0, 1, 2);
    expect(run.pendingCount()).toBe(1);
    expect(run.release()).toBe(0);
    expect(run.pendingCount()).toBe(0);
    players[0]!.feet.x = 4;
    expect(run.step()).toBe(0);
    expect(doors.list[0]!.anchor.locked).toBe(false);
    expect(nav.isWalkable(nav.cellOf(0.1, 0.1))).toBe(true);
    // the stage again after the restart: it locks (the doorway is clear now)
    expect(run.raise(0, 1, 2).doors).toBe(1);
  });

  it('the mode retries the pending locks every fixed tick and tests the living players at the doorway', () => {
    const src = readFileSync(new URL('../src/game/modes/sectorMode.ts', import.meta.url), 'utf8');
    expect(src).toContain('canShut: (d) => doorwayClear(d.cx, d.cz, g.playerRefsInto(this.refs))');
    expect(src).toContain('if (this.stageRun?.step()) this.secT = 0;');
  });
});

describe('stage actions in the run', () => {
  it('lights to full: the stage forces its groups on, earlier stages do not', () => {
    const { reg, run } = rig([section([{ stage: 2, lightsFull: [4] }])]);
    expect(run.raise(0, 0, 1)).toEqual({ lights: 0, doors: 0, dogs: false });
    expect(on(reg, 0)).toBe(false);
    const v = reg.version;
    expect(run.raise(0, 1, 2)).toEqual({ lights: 2, doors: 0, dogs: false });
    expect(on(reg, 0) && on(reg, 1)).toBe(true);
    // the registry moved: slice L's lamp sync sends it (no wire change)
    expect(reg.version).toBeGreaterThan(v);
    // stage 3: nothing more
    expect(run.raise(0, 2, 3)).toEqual({ lights: 0, doors: 0, dogs: false });
  });

  it('a lockdown door shuts, locks and closes its doorway on the guards\' nav grid at its stage', () => {
    const { doors, nav, run } = rig([section([{ stage: 2, lockDoors: [DOOR_A] }])]);
    const a = doors.list[0]!;
    expect(run.missing).toEqual([]);
    run.raise(0, 0, 1);
    expect(a.anchor.locked).toBe(false);
    const cell = nav.cellOf(0.1, 0.1);
    expect(nav.isWalkable(cell)).toBe(true);
    expect(run.raise(0, 1, 2).doors).toBe(1);
    expect(a.anchor.locked).toBe(true);
    expect(a.target).toBe(0);
    expect(nav.isWalkable(cell)).toBe(false);
    // the other doorway stays: never a softlock
    expect(nav.findPath([-4, 0], [4, 0])).not.toBeNull();
    expect(run.lockedCount()).toBe(1);
    // a raise again does not lock twice
    expect(run.raise(0, 0, 3).doors).toBe(0);
  });

  it('a lockdown door that is not in the map is reported, not locked', () => {
    const { run } = rig([section([{ stage: 1, lockDoors: [[3, -6]] }])]);
    expect(run.missing).toEqual(['s: no door at lockdown (3, -6)']);
    expect(run.raise(0, 0, 3).doors).toBe(0);
  });

  it('a releaseDogs stage is an edge (guard-rules S8: the mode releases the dogs on it)', () => {
    const { run } = rig([section([{ stage: 2, releaseDogs: true }])]);
    expect(run.raise(0, 0, 1).dogs).toBe(false);
    expect(run.dogsReleased).toBe(false);
    expect(run.raise(0, 1, 2).dogs).toBe(true);
    expect(run.dogsReleased).toBe(true);
    // a later raise that reaches no new releaseDogs stage: no edge (the record stays)
    expect(run.raise(0, 2, 3).dogs).toBe(false);
    expect(run.dogsReleased).toBe(true);
    run.release();
    expect(run.dogsReleased).toBe(false);
  });

  it('the response route reaches the stage\'s reinforcements: spawn at its first point, the route as their patrol', () => {
    const route: [number, number][] = [[-5, 2], [-2, 2], [2, 6]];
    const d = section([{ stage: 1, responseRoute: route }]);
    const a = reinforceSlot(d, 1, 0, 0, SECTOR_REINFORCE_KIND)!;
    const b = reinforceSlot(d, 1, 1, 1, SECTOR_REINFORCE_KIND)!;
    expect(a).toMatchObject({ kind: 'grunt', x: -5, z: 2, yaw: 0, route });
    expect(b).toMatchObject({ x: -5 + 1.3, z: 2, route });
    // a copy: the patrol never writes the section data
    expect(a.route).not.toBe(route);
    // stage 2 has no route: the section's reinforce points in turn
    expect(reinforceSlot(d, 2, 0, 2, SECTOR_REINFORCE_KIND)).toEqual({ kind: 'grunt', x: -5, z: -8, yaw: 0 });
    // the mode builds its reinforcement slots here, and its spawner hands a slot's route to `setPatrol`
    const src = readFileSync(new URL('../src/game/modes/sectorMode.ts', import.meta.url), 'utf8');
    expect(src).toContain('reinforceSlot(s, stage, i, this.reinforceK++, SECTOR_REINFORCE_KIND)');
    expect(src).toContain('if (p.slot.route) e.setPatrol({ points: p.slot.route');
    // no reinforce points and no route: none
    expect(reinforceSlot({ ...section(), reinforce: [] }, 1, 0, 0, SECTOR_REINFORCE_KIND)).toBeNull();
  });

  it('a restart undoes the section\'s stage actions (A50): lamps back to the start state, lockdown doors open, nav open', () => {
    const { reg, doors, nav, run } = rig([section([{ stage: 1, lightsFull: [4] }, { stage: 2, lockDoors: [DOOR_A] }])]);
    const start = new SectionStartState();
    // the section begins at stage 0 (the mode: actions up to the carried stage, then the start state)
    run.raise(0, 0, 0);
    start.take(reg, doors);
    run.raise(0, 0, 1);
    run.raise(0, 1, 2);
    expect(on(reg, 0)).toBe(true);
    expect(doors.list[0]!.anchor.locked).toBe(true);
    // the restart (the mode's order): unload releases, the start state goes back, the start stage's actions again
    expect(run.release()).toBe(1);
    start.apply(reg, doors);
    run.raise(0, 0, 0);
    expect(on(reg, 0) || on(reg, 1)).toBe(false);
    expect(on(reg, 2)).toBe(true);
    expect(doors.list[0]!.anchor.locked).toBe(false);
    expect(nav.isWalkable(nav.cellOf(0.1, 0.1))).toBe(true);
    expect(run.lockedCount()).toBe(0);
  });

  it('a section entered at stage 1 keeps stage 1\'s lights over a restart and loses stage 2\'s lock', () => {
    const { reg, doors, run } = rig([section([{ stage: 1, lightsFull: [4] }, { stage: 2, lockDoors: [DOOR_A] }])]);
    const start = new SectionStartState();
    run.raise(0, 0, 1);
    start.take(reg, doors);
    run.raise(0, 1, 2);
    run.release();
    start.apply(reg, doors);
    run.raise(0, 0, 1);
    expect(on(reg, 0) && on(reg, 1)).toBe(true);
    expect(doors.list[0]!.anchor.locked).toBe(false);
  });
});

describe('Warehouse Ops (no stage actions) is unchanged', () => {
  it('has none, passes the check, and its reinforcements come in at its reinforce points as before', () => {
    expect(WAREHOUSE_SECTORS.every((s) => !s.stageActions)).toBe(true);
    expect(checkStageActions(WAREHOUSE_SECTORS)).toEqual([]);
    const { run } = rig(WAREHOUSE_SECTORS as SectorDef[]);
    for (let i = 0; i < WAREHOUSE_SECTORS.length; i++) expect(run.raise(i, 0, 3)).toEqual({ lights: 0, doors: 0, dogs: false });
    expect(run.lockedCount()).toBe(0);
    expect(run.release()).toBe(0);
    WAREHOUSE_SECTORS.forEach((s) => {
      let k = 0;
      for (let stage = 1; stage <= SECTOR.alarmMax; stage++) {
        for (let i = 0; i < s.perStage; i++) {
          const at = s.reinforce[k % s.reinforce.length]!;
          // the slice 0 slot (A47): a grunt at the next reinforce point, every other one 1.3 m over
          expect(reinforceSlot(s, stage, i, k++, SECTOR_REINFORCE_KIND)).toEqual({ kind: 'grunt', x: at[0] + (i % 2) * 1.3, z: at[1], yaw: 0 });
        }
      }
    });
  });
});
