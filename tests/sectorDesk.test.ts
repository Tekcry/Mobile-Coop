import { describe, expect, it } from 'vitest';
import type { Vector3 } from '../src/core/babylon';
import { CONN_LOAD, CONN_UNLOCK_FAR, checkSectors, type SectorDef } from '../src/game/sectors';
import {
  DESK_LABEL_DONE,
  DESK_LABEL_LOOP,
  DESK_LABEL_OFF,
  DESK_LOOP,
  DESK_LOCKED_LINE,
  DESK_LOOP_END_LINE,
  DESK_LOOP_TIME,
  DESK_MANNED_LINE,
  DESK_NONE,
  DESK_OFF,
  DESK_POST_RADIUS,
  DESK_REFUSE_BAD,
  DESK_REFUSE_DONE,
  DESK_REFUSE_MANNED,
  DESK_USED_LOOP,
  DESK_USED_OFF,
  SectorDesks,
  checkDesks,
  deskCamMode,
  deskIndexOf,
  deskItemId,
  deskLabel,
  deskModeOf,
  operatorAtPost,
  type SecurityDesk,
} from '../src/game/sectorDesks';
import type { CameraDevice, SecurityData } from '../src/security/data';
import { CameraUnit } from '../src/security/camera';
import { SectorMode } from '../src/game/modes/sectorMode';
import type { GameState } from '../src/game/gameState';
import type { Interactable } from '../src/game/interactables';
import { bytesPerCall, HEAP_NUMBER, sink } from './helpers/allocPerCall';

/**
 * (sector-redesign E6, EW10, EG13) Security desks in Sector Ops: a console loops its section's cameras for a window or
 * switches them off until a restart, only once its operator is down or away; a section load puts them back; the data
 * check holds desk cameras to the desk's section.
 */

const DT = 1 / 60;
const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const guard = { kind: 'officer', x: 0, z: 0, takedownSpot: [0, 0] } as unknown as SectorDef['guards'][number];
const sec = (id: string, guards: SectorDef['guards'], last = false): SectorDef => ({
  id,
  name: id,
  start: pose,
  objective: { kind: 'hack', label: 'Hack', x: 0, y: 0, z: 0, yaw: 0 },
  ...(last ? { extract: { label: 'x', box: [0, 0, 1, 1] } } : { connector: { label: 'c', box: [0, 0, 1, 1], checkpoint: pose } }),
  guards,
  reinforce: [],
  perStage: 2,
  routes: [],
});
const cam = (id: string, section: number): CameraDevice => ({ id, kind: 'camera', level: 'g', at: [0, 0], y: 3, facing: 0, reason: 'r', section });

const DEFS: SectorDef[] = [sec('s0', [guard, guard]), sec('s1', [guard], true)];
// desk 0 in section 0 runs cam-a and cam-b, operated by guard 1; desk 1 in section 1, unmanned, a 10 s loop
const DESKS: SecurityDesk[] = [
  { id: 'desk-gate', section: 0, at: [10, 5], yaw: 0, cameras: ['cam-a', 'cam-b'], operator: 1 },
  { id: 'desk-lab', section: 1, at: [40, 5], yaw: Math.PI, cameras: ['cam-c'], loop: 10 },
];
const SEC: SecurityData = { devices: [cam('cam-a', 0), cam('cam-b', 0), cam('cam-c', 1)], desks: DESKS };

describe('SectorDesks', () => {
  it('loops for the default window, then the cameras report again', () => {
    const d = new SectorDesks(DESKS);
    expect(d.use(0, false)).toBe(DESK_USED_LOOP);
    expect(d.mode[0]).toBe(DESK_LOOP);
    expect(d.left[0]).toBeCloseTo(DESK_LOOP_TIME);
    let ended = 0;
    let t = 0;
    while (ended === 0 && t < 60) {
      ended = d.step(DT);
      t += DT;
    }
    expect(ended).toBe(1);
    expect(t).toBeCloseTo(DESK_LOOP_TIME, 1);
    expect(d.mode[0]).toBe(DESK_NONE);
    // the loop can be run again
    expect(d.use(0, false)).toBe(DESK_USED_LOOP);
  });

  it('a desk window from the data: 10 s', () => {
    const d = new SectorDesks(DESKS);
    d.use(1, false);
    for (let i = 0; i < 9.9 * 60; i++) expect(d.step(DT)).toBe(0);
    let n = 0;
    for (let i = 0; i < 12; i++) n += d.step(DT);
    expect(n).toBe(1);
  });

  it('used again while looped: off until a reset, no window, refused after', () => {
    const d = new SectorDesks(DESKS);
    d.use(0, false);
    expect(d.use(0, false)).toBe(DESK_USED_OFF);
    expect(d.mode[0]).toBe(DESK_OFF);
    for (let i = 0; i < 120 * 60; i++) d.step(DT);
    expect(d.mode[0]).toBe(DESK_OFF);
    expect(d.use(0, false)).toBe(DESK_REFUSE_DONE);
    expect(d.reset()).toBe(true);
    expect(d.mode[0]).toBe(DESK_NONE);
    expect(d.reset()).toBe(false);
  });

  it('a manned desk refuses and changes nothing; a bad index is refused', () => {
    const d = new SectorDesks(DESKS);
    expect(d.use(0, true)).toBe(DESK_REFUSE_MANNED);
    expect(d.mode[0]).toBe(DESK_NONE);
    d.use(0, false);
    expect(d.use(0, true)).toBe(DESK_REFUSE_MANNED);
    expect(d.mode[0]).toBe(DESK_LOOP);
    expect(d.use(5, false)).toBe(DESK_REFUSE_BAD);
  });

  it('the operator is at his post only alive, awake and within the post radius', () => {
    const k = DESKS[0]!;
    expect(operatorAtPost(k, true, false, 10, 5)).toBe(true);
    expect(operatorAtPost(k, true, false, 10 + DESK_POST_RADIUS - 0.1, 5)).toBe(true);
    expect(operatorAtPost(k, true, false, 10 + DESK_POST_RADIUS + 0.1, 5)).toBe(false);
    expect(operatorAtPost(k, true, true, 10, 5)).toBe(false);
    expect(operatorAtPost(k, false, false, 10, 5)).toBe(false);
  });

  it('labels round-trip to the mode (the co-op client reads the mode from the item label); item ids', () => {
    for (const m of [DESK_NONE, DESK_LOOP, DESK_OFF]) expect(deskModeOf(deskLabel(m))).toBe(m);
    expect([deskLabel(DESK_NONE), deskLabel(DESK_LOOP), deskLabel(DESK_OFF)]).toEqual([DESK_LABEL_LOOP, DESK_LABEL_OFF, DESK_LABEL_DONE]);
    for (const l of [DESK_LABEL_LOOP, DESK_LABEL_OFF, DESK_LABEL_DONE]) expect(l.length).toBeLessThanOrEqual(24);
    expect(deskModeOf('anything else')).toBe(DESK_NONE);
    expect(deskIndexOf(deskItemId(3))).toBe(3);
    expect(deskIndexOf('board-3')).toBe(-1);
  });

  it('camera mode: blind or desk-off is off, a loop is looped (blind, still sweeping), else online', () => {
    expect(deskCamMode(false, DESK_NONE)).toBe('online');
    expect(deskCamMode(false, DESK_LOOP)).toBe('looped');
    expect(deskCamMode(false, DESK_OFF)).toBe('off');
    expect(deskCamMode(true, DESK_LOOP)).toBe('off');
    const c = new CameraUnit({ ...cam('cam-x', 0), sweep: [0, 90] }, 0);
    c.setMode(deskCamMode(false, DESK_LOOP));
    expect(c.sees).toBe(false);
    const y0 = c.yaw;
    for (let i = 0; i < 180; i++) c.advance(DT);
    expect(c.yaw).not.toBe(y0);
  });

  it('the loop step allocates nothing', async () => {
    const d = new SectorDesks([{ ...DESKS[0]!, loop: 1e9 }, DESKS[1]!]);
    d.use(0, false);
    sink[0] = 0;
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) sink[0]! += d.step(DT);
    }, HEAP_NUMBER);
    console.info(`bytes per SectorDesks.step: ${per.toFixed(1)}`);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
    expect(d.mode[0]).toBe(DESK_LOOP);
  });
});

describe('checkDesks', () => {
  it('a valid desk set passes (through checkSectors with the security data)', () => {
    expect(checkSectors(DEFS, undefined, SEC)).toEqual([]);
    expect(checkSectors(DEFS)).toEqual([]);
  });

  it('refuses a missing camera, a camera of another section, no cameras, a bad section, operator or loop, a duplicate id', () => {
    const bad: SecurityData = {
      devices: SEC.devices,
      desks: [
        { id: 'a', section: 0, at: [0, 0], yaw: 0, cameras: ['cam-a', 'cam-zz', 'cam-c'] },
        { id: 'b', section: 1, at: [0, 0], yaw: 0, cameras: [] },
        { id: 'c', section: 4, at: [0, 0], yaw: 0, cameras: ['cam-a'] },
        { id: 'a', section: 1, at: [0, 0], yaw: 0, cameras: ['cam-c'], operator: 1, loop: 0 },
      ],
    };
    expect(checkDesks(DEFS, bad)).toEqual([
      "desk a: no camera 'cam-zz'",
      "desk a: camera 'cam-c' is in section 1, not 0",
      'desk b: no cameras',
      'desk c: section 4 does not exist',
      "desk c: camera 'cam-a' is in section 0, not 4",
      'desk a: duplicate id',
      'desk a: operator 1 is not a guard index of section 1',
      'desk a: loop window is not positive',
    ]);
  });
});

// ---- the mode's wiring (SectorMode with a stub game: items, HUD, a recording camera sink) ----

function stubGame() {
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
  const feed: string[] = [];
  const net: string[] = [];
  const g = {
    world: { map: { sectors: DEFS }, layout: { security: SEC }, doors: { list: [], nearest: () => null } },
    interactables: ints,
    takedown: { active: null },
    nav: null,
    hud: { barks: { say: () => undefined }, feedItem: (t: string) => feed.push(t), banner: () => undefined },
    events: { emit: () => undefined },
    net: { radioLine: (t: string) => net.push(t) },
    playerRefsInto: (out: unknown[]) => out,
    // (section-rating) the mode tick counts detections
    style: { detections: 0 },
  } as unknown as GameState;
  return { g, items, feed, net };
}

interface ModeInternals {
  findDesks(): void;
  loadSection(i: number): void;
  unloadSection(): void;
  connEvents(ev: number, prev: number): void;
  beginSection(): void;
  slotEnemy: ({ alive: boolean; ko: boolean; pos: { x: number; z: number } } | null)[];
  pending: { k: number }[];
}

describe('SectorMode desks (stub game)', () => {
  function setup() {
    const s = stubGame();
    const m = new SectorMode(s.g);
    const cams = new Map<string, number>();
    m.ct = { setDesk: (ids: readonly string[], mode: number) => ids.forEach((id) => cams.set(id, mode)), setLive: () => undefined, fixedUpdate: () => undefined, takeChanged: () => false, wire: () => ({}) } as unknown as SectorMode['ct'];
    const mi = m as unknown as ModeInternals;
    mi.findDesks();
    mi.loadSection(0);
    // the stub has no enemy manager: the loaded guards stay pending; this setup starts with the operator absent
    mi.pending.length = 0;
    return { ...s, m, mi, cams };
  }

  it('puts a console item per desk; only the live section is usable', () => {
    const { items } = setup();
    expect(items.map((i) => [i.id, i.label, i.enabled])).toEqual([
      ['desk-0', DESK_LABEL_LOOP, true],
      ['desk-1', DESK_LABEL_LOOP, false],
    ]);
  });

  it('the operator at his post blocks the console; KO, dead or lured away frees it', () => {
    const { m, mi, feed, cams } = setup();
    const op = { alive: true, ko: false, pos: { x: 10.5, z: 5 } };
    mi.slotEnemy[1] = op;
    expect(m.useDesk(0)).toBe(DESK_REFUSE_MANNED);
    expect(feed).toContain(DESK_MANNED_LINE);
    expect(cams.get('cam-a')).toBe(DESK_NONE);
    op.pos.x = 20;
    expect(m.useDesk(0)).toBe(DESK_USED_LOOP);
    m.desks.reset();
    op.pos.x = 10;
    op.ko = true;
    expect(m.useDesk(0)).toBe(DESK_USED_LOOP);
    m.desks.reset();
    op.ko = false;
    op.alive = false;
    expect(m.useDesk(0)).toBe(DESK_USED_LOOP);
  });

  it('an operator not spawned yet counts as at his post; a capped-out one as absent', () => {
    const { m, mi, feed } = setup();
    mi.slotEnemy.length = 0;
    mi.pending.push({ k: 1 });
    expect(m.useDesk(0)).toBe(DESK_REFUSE_MANNED);
    // (E6 fix, polish 2) nobody is at the desk yet: a neutral line, not "take him out"
    expect(feed).toEqual([DESK_LOCKED_LINE]);
    mi.pending.length = 0;
    expect(m.useDesk(0)).toBe(DESK_USED_LOOP);
  });

  it('loop then off: the cameras follow, the label shows it, a client use gets the line over the net', () => {
    const { m, items, cams, net } = setup();
    expect(m.useDesk(0, 'peer-2')).toBe(DESK_USED_LOOP);
    expect(cams.get('cam-a')).toBe(DESK_LOOP);
    expect(cams.get('cam-b')).toBe(DESK_LOOP);
    expect(cams.get('cam-c')).toBe(DESK_NONE);
    expect(items[0]!.label).toBe(DESK_LABEL_OFF);
    expect(net).toEqual(['Cameras looped.']);
    expect(m.useDesk(0)).toBe(DESK_USED_OFF);
    expect(cams.get('cam-a')).toBe(DESK_OFF);
    expect(items[0]!.label).toBe(DESK_LABEL_DONE);
    expect(items[0]!.enabled).toBe(false);
  });

  it('(E6 fix) a connector change from section 0 to 1 makes desk 1 live and desk 0 dead', () => {
    const { m, mi, items } = setup();
    // the stub has none of the begin-section kit (weapons, lights, objective items): only the desk wiring is under test
    mi.beginSection = () => undefined;
    // nor the section-rating kit (grants, results list): the rating has its own tests
    (m as unknown as { rate(): void }).rate = () => undefined;
    expect(m.run.objectiveDone()).toBe(true);
    const IN = { allInside: true, doorwayClear: true };
    let loaded = false;
    let far = false;
    for (let t = 0; t < 20 && !far; t += DT) {
      const prev = m.run.index;
      const ev = m.run.step(DT, IN);
      if (!ev) continue;
      mi.connEvents(ev, prev);
      if (ev & CONN_LOAD) {
        loaded = true;
        // CONN_LOAD fires while run.index is still the previous section: the new section's desk is live already
        expect(m.run.index).toBe(0);
        expect(items[1]!.enabled).toBe(true);
        expect(items[0]!.enabled).toBe(false);
      }
      if (ev & CONN_UNLOCK_FAR) far = true;
    }
    expect(loaded).toBe(true);
    expect(far).toBe(true);
    expect(m.run.index).toBe(1);
    expect(items[1]!.enabled).toBe(true);
    expect(items[0]!.enabled).toBe(false);
    expect(m.useDesk(0)).toBe(DESK_REFUSE_BAD);
    expect(m.useDesk(1)).toBe(DESK_USED_LOOP);
  });

  it('a desk of a section that is not live refuses', () => {
    const { m } = setup();
    expect(m.useDesk(1)).toBe(DESK_REFUSE_BAD);
  });

  it('a section load (restart or change) and an unload put the cameras back', () => {
    const { m, mi, cams, items } = setup();
    m.useDesk(0);
    m.useDesk(0);
    expect(cams.get('cam-a')).toBe(DESK_OFF);
    // a restart: unload, then load the same section
    mi.unloadSection();
    expect(cams.get('cam-a')).toBe(DESK_NONE);
    // (E6 fix) no section loaded: every desk refuses
    expect(m.useDesk(0)).toBe(DESK_REFUSE_BAD);
    mi.loadSection(0);
    mi.pending.length = 0;
    m.useDesk(0);
    expect(cams.get('cam-a')).toBe(DESK_LOOP);
    mi.loadSection(0);
    expect(cams.get('cam-a')).toBe(DESK_NONE);
    expect(items[0]!.label).toBe(DESK_LABEL_LOOP);
    expect(items[0]!.enabled).toBe(true);
  });

  it('the mode tick ends the loop at the window: cameras back, the line to both players', () => {
    const { m, feed, net, cams, items } = setup();
    m.useDesk(0);
    for (let i = 0; i < (DESK_LOOP_TIME - 0.5) * 60; i++) m.fixedUpdate(DT);
    expect(cams.get('cam-a')).toBe(DESK_LOOP);
    for (let i = 0; i < 60; i++) m.fixedUpdate(DT);
    expect(cams.get('cam-a')).toBe(DESK_NONE);
    expect(items[0]!.label).toBe(DESK_LABEL_LOOP);
    expect(feed).toContain(DESK_LOOP_END_LINE);
    expect(net).toContain(DESK_LOOP_END_LINE);
  });
});
