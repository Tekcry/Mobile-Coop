/**
 * (J14 R1) The `anchorLock` gate's `lockOn` option: the anchor is usable until the gate's flag is set, then locked; a retry
 * of a station that lists the gate (or a bay restart) drops the flag, so it opens again. Set A6's loading edge
 * (`g-a6-edge`: the lip locks once one player is on the gallery). Plain anchorLock gates and the built yard are untouched.
 */
import { describe, expect, it } from 'vitest';
import { validateCourse, type AnchorLockGate, type CourseDef, type CourseKnownIds } from '../src/game/course/courseDef';
import { CourseState } from '../src/game/course/courseState';
import type { StationDef } from '../src/game/course/stationDef';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';

function station(n: number, gates: string[], o: Partial<StationDef> = {}): StationDef {
  return {
    n,
    id: `s${n}`,
    lesson: 'boost',
    marks: [
      { x: 10 * n, z: 5, y: 0, yaw: 0 },
      { x: 10 * n + 1, z: 5, y: 0, yaw: Math.PI },
    ],
    retry: 'station',
    guards: [],
    gates,
    doneFlag: `s${n}-done`,
    ...o,
  };
}

/** One bay: station 1 (warm-up), station 2 owns the lockOn edge gate; a plain anchorLock on a ladder beside it. */
function def(stations: StationDef[] = [station(1, []), station(2, ['g-edge'])]): CourseDef {
  return {
    id: 'unit',
    airlocks: [],
    externalFlags: ['s1-done', 's2-done', 'edge-up', 'key'],
    bays: [
      {
        id: 'B1',
        entry: 'start',
        exit: 'end',
        squad: [],
        gates: [
          { kind: 'anchorLock', id: 'g-edge', anchorId: 'lip', flag: 'edge-up', lockOn: true },
          { kind: 'anchorLock', id: 'g-ladder', anchorId: 'ladder', flag: 'key' },
        ],
        radio: [],
        drills: [],
        elements: [],
        stations,
      },
    ],
  };
}

const KNOWN: CourseKnownIds = { doors: [], switches: [], holds: [], anchors: ['lip', 'ladder'], groups: [] };

describe('anchorLock lockOn (J14 R1, A6 g-a6-edge)', () => {
  it('validates', () => {
    expect(() => validateCourse(def(), KNOWN)).not.toThrow();
  });

  it('open before its flag, locked after (shared or either player\'s flag); a plain anchorLock is the other way round', () => {
    const st = new CourseState(def());
    expect(st.anchorLocked('lip')).toBe(false);
    expect(st.isGateOpen('g-edge')).toBe(true);
    expect(st.anchorLocked('ladder')).toBe(true);
    expect(st.lockedAnchors()).toEqual(['ladder']);
    st.setFlag('edge-up');
    expect(st.anchorLocked('lip')).toBe(true);
    expect(st.isGateOpen('g-edge')).toBe(false);
    expect(st.lockedAnchors().sort()).toEqual(['ladder', 'lip']);
    st.clearFlag('edge-up');
    expect(st.anchorLocked('lip')).toBe(false);
    st.setFlag('edge-up@2');
    expect(st.anchorLocked('lip')).toBe(true);
    st.setFlag('key');
    expect(st.anchorLocked('ladder')).toBe(false);
  });

  it('a retry of its station drops the flag and reopens the anchor', () => {
    const st = new CourseState(def());
    st.setFlag('s1-done');
    expect(st.station()).toBe(2);
    st.setFlag('edge-up');
    st.setFlag('edge-up@1');
    expect(st.anchorLocked('lip')).toBe(true);
    st.clearEvents();
    expect(st.retryStation('seen')).toBe(true);
    expect(st.events).toContainEqual({ t: 'flagCleared', flag: 'edge-up' });
    expect(st.hasFlag('edge-up')).toBe(false);
    expect(st.anchorLocked('lip')).toBe(false);
    expect(st.isGateOpen('g-edge')).toBe(true);
    // station 1 stays done; the edge locks again once a player is up
    expect(st.station()).toBe(2);
    st.setFlag('edge-up');
    expect(st.anchorLocked('lip')).toBe(true);
  });

  it('a bay restart reopens it too', () => {
    const st = new CourseState(def());
    st.setFlag('edge-up');
    expect(st.anchorLocked('lip')).toBe(true);
    st.restart();
    expect(st.anchorLocked('lip')).toBe(false);
  });

  it('the client mirror reads the same lock from the packed flags and the packed anchor list', () => {
    const host = new CourseState(def());
    const client = new CourseState(def());
    host.setFlag('edge-up');
    const p = host.pack();
    expect(p.anchors).toContain('lip');
    client.apply(p);
    expect(client.anchorLocked('lip')).toBe(true);
    host.clearFlag('edge-up');
    client.apply(host.pack());
    expect(client.anchorLocked('lip')).toBe(false);
    expect(host.pack().anchors).not.toContain('lip');
  });

  it('a lockOn gate cannot be a station\'s stand-in (it only shuts)', () => {
    expect(() => validateCourse(def([station(1, []), station(2, ['g-edge'], { standIn: 'g-edge' })]), KNOWN)).toThrow(/lockOn/);
    expect(() => validateCourse(def([station(1, []), station(2, ['g-ladder'], { standIn: 'g-ladder' })]), KNOWN)).not.toThrow();
  });

  // the built yard only: set A6 adds a lockOn gate to the re-plan
  it('the built yard has no lockOn gate', () => {
    const c = buildCtcourse(new LevelBuilder()).layout.course!;
    const locks = c.def.bays.flatMap((b) => b.gates).filter((g): g is AnchorLockGate => g.kind === 'anchorLock');
    expect(locks.length).toBeGreaterThan(0);
    for (const g of locks) expect(g.lockOn, g.id).toBeUndefined();
  });
});
