import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flags } from '../src/core/flags';
import type { Vector3 } from '../src/core/babylon';
import { BOARD_READ, INTEL_LINE_MAX, KEYPAD_HOLD, OVERHEAR_HOLD, checkSectorCodes, checkSectors, intelItemId, keypadItemId, type SectorDef } from '../src/game/sectors';
import { SectorCodes, inOverhear } from '../src/game/sectorKeypads';
import { SectorMode } from '../src/game/modes/sectorMode';
import type { GameState } from '../src/game/gameState';
import type { Interactable } from '../src/game/interactables';

// (one-game) flags default on now; the stub game has no `opts`, so this file runs Sector Ops as before: `?missions=0&campaign=0`
const missions0 = flags.missions;
const campaign0 = flags.campaign;
beforeAll(() => {
  flags.missions = false;
  flags.campaign = false;
});
afterAll(() => {
  flags.missions = missions0;
  flags.campaign = campaign0;
});

/** (sector-redesign EW5, A4) Keypad doors in Sector Ops: codes found in the level (overheard, a board, an objective). */

const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const conn = { label: 'c', box: [0, 0, 1, 1] as [number, number, number, number], checkpoint: pose };
const sec = (id: string, extra: Partial<SectorDef> = {}, last = false): SectorDef => ({
  id,
  name: id,
  start: pose,
  objective: { kind: 'hack', label: 'Hack the terminal', x: 0, y: 0, z: 0, yaw: 0 },
  ...(last ? { extract: { label: 'x', box: [0, 0, 1, 1] } } : { connector: conn }),
  guards: [],
  reinforce: [],
  perStage: 2,
  routes: [],
  ...extra,
});

// S0: a keypad (code 'fac') whose code is overheard at the kitchen or read on a board; the hack gives 'labs'.
// S1: two keypads on the 'labs' code.
const DEFS: SectorDef[] = [
  sec('s2', {
    keypads: [{ at: [10, 0], code: 'fac' }],
    intel: [
      { kind: 'overhear', grants: 'fac', line: 'Kitchen talk: facilities code is still the old one.', box: [20, 20, 24, 24], floorY: 4.4 },
      { kind: 'board', grants: 'fac', line: 'Handover board: facilities door code, top line.', at: [30, 4.4, 2] },
      { kind: 'objective', grants: 'labs', line: 'Building controls are ours. Lab door codes logged.' },
    ],
  }),
  sec('s3', { keypads: [{ at: [50, 0], code: 'labs' }, { at: [60, 0], code: 'labs' }] }, true),
];

describe('SectorCodes', () => {
  it('a keypad stays locked until the team holds its code', () => {
    const c = new SectorCodes(DEFS);
    expect(c.has('fac')).toBe(false);
    expect(c.useKeypad(0, 0)).toBe(false);
    expect(c.isOpen(0, 0)).toBe(false);
    expect(c.grant(0, 1)).toBe(true);
    expect(c.useKeypad(0, 0)).toBe(true);
    expect(c.isOpen(0, 0)).toBe(true);
    // once open, a second use does nothing
    expect(c.useKeypad(0, 0)).toBe(false);
  });

  it('overhear: a player in the zone for the hold, in a row, learns the code; leaving resets the time', () => {
    const c = new SectorCodes(DEFS);
    expect(c.hear(0, 0, OVERHEAR_HOLD - 0.5, true)).toBe(false);
    expect(c.hear(0, 0, 0.1, false)).toBe(false);
    expect(c.heard[0]![0]).toBe(0);
    expect(c.hear(0, 0, OVERHEAR_HOLD - 0.1, true)).toBe(false);
    expect(c.has('fac')).toBe(false);
    expect(c.hear(0, 0, 0.1, true)).toBe(true);
    expect(c.has('fac')).toBe(true);
    // heard once: no second line
    expect(c.hear(0, 0, 10, true)).toBe(false);
    // hear() only works on overhear intel
    expect(c.hear(0, 1, 10, true)).toBe(false);
  });

  it('the overhear zone is a plan box on its floor', () => {
    const n = DEFS[0]!.intel![0]!;
    expect(inOverhear(n, 22, 4.4, 22)).toBe(true);
    expect(inOverhear(n, 22, 0, 22)).toBe(false);
    expect(inOverhear(n, 25, 4.4, 22)).toBe(false);
    expect(inOverhear(DEFS[0]!.intel![1]!, 30, 4.4, 2)).toBe(false);
  });

  it('board: reading it gives the code, once', () => {
    const c = new SectorCodes(DEFS);
    expect(c.grant(0, 1)).toBe(true);
    expect(c.has('fac')).toBe(true);
    expect(c.grant(0, 1)).toBe(false);
  });

  it('objective: the section objective gives its codes; both later keypads on it open', () => {
    const c = new SectorCodes(DEFS);
    const out: number[] = [];
    expect(c.objectiveDone(0, out)).toEqual([2]);
    expect(c.has('labs')).toBe(true);
    expect(c.objectiveDone(0, out)).toEqual([]);
    expect(c.objectiveDone(1, out)).toEqual([]);
    expect(c.useKeypad(1, 0)).toBe(true);
    expect(c.useKeypad(1, 1)).toBe(true);
  });

  it('a section restart drops the codes found in it and shuts its keypads; earlier codes stay', () => {
    const c = new SectorCodes(DEFS);
    c.grant(0, 0);
    c.objectiveDone(0, []);
    c.useKeypad(0, 0);
    expect(c.restart(0)).toEqual([0]);
    expect(c.codes()).toEqual([]);
    expect(c.isOpen(0, 0)).toBe(false);
    expect(c.got[0]).toEqual([false, false, false]);
    // found again after the restart
    expect(c.grant(0, 1)).toBe(true);
    // into the next section: its restart keeps S0's codes
    c.objectiveDone(0, []);
    c.useKeypad(1, 0);
    expect(c.restart(1)).toEqual([0]);
    expect(c.codes()).toEqual(['fac', 'labs']);
    expect(c.useKeypad(1, 0)).toBe(true);
  });

  it('a code found again in a later section keeps the section it was first found in', () => {
    const defs = [sec('a', { intel: [{ kind: 'board', grants: 'x', line: 'l', at: [0, 0, 0] }] }), sec('b', { intel: [{ kind: 'board', grants: 'x', line: 'l', at: [0, 0, 0] }] }, true)];
    const c = new SectorCodes(defs);
    c.grant(0, 0);
    c.grant(1, 0);
    c.restart(1);
    expect(c.has('x')).toBe(true);
  });

  it('host only: a mirror (the co-op client) never grants or opens', () => {
    const c = new SectorCodes(DEFS, false);
    expect(c.grant(0, 1)).toBe(false);
    expect(c.hear(0, 0, 99, true)).toBe(false);
    expect(c.objectiveDone(0, [])).toEqual([]);
    expect(c.has('fac')).toBe(false);
    expect(c.useKeypad(0, 0)).toBe(false);
  });

  it('bad indices are refused', () => {
    const c = new SectorCodes(DEFS);
    expect(c.grant(5, 0)).toBe(false);
    expect(c.grant(0, 9)).toBe(false);
    expect(c.useKeypad(0, 4)).toBe(false);
    expect(c.restart(7)).toEqual([]);
  });
});

describe('checkSectorCodes (solo can get every code)', () => {
  it('the example data passes', () => {
    expect(checkSectorCodes(DEFS)).toEqual([]);
    expect(checkSectors(DEFS)).toEqual([]);
  });

  it('a code only from its own section objective is refused (the objective sits behind the keypad)', () => {
    const d = [sec('a', { keypads: [{ at: [0, 0], code: 'k' }], intel: [{ kind: 'objective', grants: 'k', line: 'l' }] }, true)];
    expect(checkSectorCodes(d)).toEqual(["a: keypad 0 code 'k' is not found before it"]);
  });

  it('a code found in a later section, a long line or a zero hold are refused', () => {
    const d = [
      sec('a', { keypads: [{ at: [0, 0], code: 'k' }] }),
      sec('b', { intel: [{ kind: 'overhear', grants: 'k', line: 'x'.repeat(INTEL_LINE_MAX + 1), box: [0, 0, 1, 1], hold: 0 }] }, true),
    ];
    expect(checkSectorCodes(d)).toEqual(["a: keypad 0 code 'k' is not found before it", `b: intel 0 line is over ${INTEL_LINE_MAX} characters`, "b: intel 0 overhear hold is not above 0"]);
  });

  it('an overhear talker outside the section guards is refused', () => {
    const d = [sec('a', { guards: [{}] as unknown as SectorDef['guards'], intel: [{ kind: 'overhear', grants: 'k', line: 'l', box: [0, 0, 1, 1], talkers: [0, 1] }] }, true)];
    expect(checkSectorCodes(d)).toEqual(['a: intel 0 talker 1 is not a guard index']);
  });

  it('every line in the example fits the co-op feed', () => {
    for (const d of DEFS) for (const n of d.intel ?? []) expect(n.line.length).toBeLessThanOrEqual(INTEL_LINE_MAX);
  });
});

// ---- the mode's wiring (SectorMode with a stub game: doors, items, HUD) ----

interface StubDoor {
  index: number;
  anchor: { id: string; locked: boolean; width: number; yaw: number; hinge: { y: number } };
  target: 0 | 1;
  cracked: boolean;
  x: number;
  z: number;
}

function stubGame(defs: SectorDef[], doorsAt: [number, number][]) {
  const list: StubDoor[] = doorsAt.map(([x, z], i) => ({ index: i, anchor: { id: `d${i}`, locked: false, width: 1.2, yaw: 0, hinge: { y: 0 } }, target: 0, cracked: false, x, z }));
  const doors = {
    list,
    nearest: (x: number, z: number, r: number) => list.find((d) => Math.abs(d.x - x) <= r && Math.abs(d.z - z) <= r) ?? null,
    setLocked: (d: StubDoor, on: boolean) => {
      d.anchor.locked = on;
    },
    setOpen: (d: StubDoor, open: boolean) => {
      d.target = open ? 1 : 0;
    },
    crack: () => false,
  };
  const items: Interactable[] = [];
  const ints = {
    items,
    add: (id: string, kind: Interactable['kind'], pos: Vector3, label: string, holdTime: number) => {
      const it = { id, kind, pos, label, holdTime, enabled: false, done: false, progress: 0 } as unknown as Interactable;
      items.push(it);
      return it;
    },
    setEnabled: (it: Interactable, on: boolean) => {
      it.enabled = on;
    },
    remove: () => undefined,
  };
  const said: string[] = [];
  const feed: string[] = [];
  const net: string[] = [];
  const g = {
    world: { map: { sectors: defs }, doors },
    interactables: ints,
    nav: null,
    hud: { barks: { say: (_who: string, line: string) => said.push(line) }, feedItem: (t: string) => feed.push(t) },
    net: { radioLine: (t: string) => net.push(t) },
    playerRefsInto: (out: unknown[]) => out,
  } as unknown as GameState;
  return { g, list, items, said, feed, net };
}

interface ModeInternals {
  findKeypads(): void;
  rekey(sec: number): void;
  learned(sec: number, k: number): void;
}

describe('SectorMode keypads (stub game)', () => {
  function setup() {
    // door 0 at the S2 keypad, door 1 a plain door, doors 2-3 at the S3 keypads
    const s = stubGame(DEFS, [
      [10, 0],
      [40, 0],
      [50, 0],
      [60, 0],
    ]);
    const m = new SectorMode(s.g);
    (m as unknown as ModeInternals).findKeypads();
    return { ...s, m, mi: m as unknown as ModeInternals };
  }

  it('locks each keypad door at the start, puts its keypad and the board item down; a door without a keypad is left alone', () => {
    const { list, items } = setup();
    expect(list.map((d) => d.anchor.locked)).toEqual([true, false, true, true]);
    const key = items.find((i) => i.id === keypadItemId(0, 0))!;
    expect(key.enabled).toBe(true);
    expect(key.holdTime).toBe(KEYPAD_HOLD);
    expect(key.label).toBe('Keypad - code needed');
    const board = items.find((i) => i.id === intelItemId(0, 1))!;
    expect(board.kind).toBe('intel');
    expect(board.holdTime).toBe(BOARD_READ);
    expect(items.some((i) => i.id === intelItemId(0, 0))).toBe(false);
  });

  it('without the code the keypad refuses (the hold restarts); after the board it opens the door for both', () => {
    const { m, list, items, said, net, feed } = setup();
    expect(m.useKeypad(0, 0)).toBe(false);
    expect(list[0]!.anchor.locked).toBe(true);
    expect(feed).toContain('Locked - find the code');
    const board = items.find((i) => i.id === intelItemId(0, 1))!;
    board.onUse!(board, 'peer-2');
    // one subtitle line, to the client too; the board goes off; the keypad prompt changes
    expect(said).toEqual(['Handover board: facilities door code, top line.']);
    expect(net).toEqual(said);
    expect(board.enabled).toBe(false);
    expect(items.find((i) => i.id === keypadItemId(0, 0))!.label).toBe('Enter code');
    expect(m.useKeypad(0, 0)).toBe(true);
    expect(list[0]!.anchor.locked).toBe(false);
    expect(list[1]!.anchor.locked).toBe(false);
    expect(items.find((i) => i.id === keypadItemId(0, 0))!.enabled).toBe(false);
  });

  it('a section restart locks its keypad again and puts the board back; the next section keeps its codes', () => {
    const { m, mi, list, items } = setup();
    m.codes.grant(0, 0);
    mi.learned(0, 0);
    m.useKeypad(0, 0);
    expect(list[0]!.anchor.locked).toBe(false);
    mi.rekey(0);
    expect(list[0]!.anchor.locked).toBe(true);
    expect(m.codes.codes()).toEqual([]);
    expect(items.find((i) => i.id === keypadItemId(0, 0))!.enabled).toBe(true);
    expect(items.find((i) => i.id === keypadItemId(0, 0))!.label).toBe('Keypad - code needed');
    expect(items.find((i) => i.id === intelItemId(0, 1))!.enabled).toBe(true);
    // the labs codes from S2's hack survive a restart of S3
    m.codes.objectiveDone(0, []);
    m.useKeypad(1, 0);
    mi.rekey(1);
    expect(m.codes.has('labs')).toBe(true);
    expect(list[1]!.anchor.locked).toBe(false);
    expect(list[2]!.anchor.locked).toBe(true);
  });

  it('overhear with talkers: a knocked-out talker gives no grant; both alive grant after the hold', () => {
    const talkDefs = [sec('t', { guards: [{}, {}] as unknown as SectorDef['guards'], keypads: [{ at: [10, 0], code: 'fac' }], intel: [{ kind: 'overhear', grants: 'fac', line: 'Talk.', box: [0, 0, 4, 4], hold: 2, talkers: [0, 1] }] }, true)];
    const mk = () => {
      const s = stubGame(talkDefs, [[10, 0]]);
      const refs = [{ alive: true }].map(() => ({ target: { alive: true }, feet: { x: 2, y: 0, z: 2 } }));
      (s.g as unknown as { playerRefsInto: (o: unknown[]) => unknown[] }).playerRefsInto = (out) => {
        out.length = 0;
        out.push(...refs);
        return out;
      };
      const m = new SectorMode(s.g);
      (m as unknown as ModeInternals).findKeypads();
      const mm = m as unknown as { slotEnemy: unknown[]; overhearStep(dt: number, sec: number, s: SectorDef): void };
      return { m, mm, def: talkDefs[0]! };
    };
    // one talker knocked out: no time builds, no grant
    const a = mk();
    const e0 = { alive: true, ko: false };
    const e1 = { alive: true, ko: false };
    a.mm.slotEnemy[0] = e0;
    a.mm.slotEnemy[1] = e1;
    a.mm.overhearStep(1, 0, a.def);
    e1.alive = false;
    e1.ko = true;
    for (let i = 0; i < 10; i++) a.mm.overhearStep(1, 0, a.def);
    expect(a.m.codes.has('fac')).toBe(false);
    // a talker not spawned yet counts as not talking
    const c = mk();
    c.mm.slotEnemy[0] = { alive: true, ko: false };
    for (let i = 0; i < 10; i++) c.mm.overhearStep(1, 0, c.def);
    expect(c.m.codes.has('fac')).toBe(false);
    // both alive: grant after the hold
    const b = mk();
    b.mm.slotEnemy[0] = { alive: true, ko: false };
    b.mm.slotEnemy[1] = { alive: true, ko: false };
    b.mm.overhearStep(1, 0, b.def);
    expect(b.m.codes.has('fac')).toBe(false);
    b.mm.overhearStep(1, 0, b.def);
    expect(b.m.codes.has('fac')).toBe(true);
  });

  it('a section with no keypads or intel adds nothing', () => {
    const s = stubGame([sec('a', {}, true)], [[0, 0]]);
    const m = new SectorMode(s.g);
    (m as unknown as ModeInternals).findKeypads();
    expect(s.items).toEqual([]);
    expect(s.list[0]!.anchor.locked).toBe(false);
    expect(m.useKeypad(0, 0)).toBe(false);
  });
});

