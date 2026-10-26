import { describe, expect, it } from 'vitest';
import { SECTOR, SectorRun, sectorResult, type ConnectorInput, type SectorDef } from '../src/game/sectors';
import { applySectorStart, practiceFromRh, practiceLine, sectorStartIndex } from '../src/game/sectorStart';

// (campus-greybox A28) the start-at-section link: the pure side (`sectorStart.ts`). Fixture copied from
// tests/sectors.test.ts (pose, def, three, IN, stepFor).

const pose = (x: number) => ({ x, y: 0, z: 0, yaw: 0 });
const def = (id: string, i: number, last: boolean, kind: SectorDef['objective']['kind'] = 'hack'): SectorDef => ({
  id,
  name: id,
  start: pose(i * 100),
  objective: { kind, label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  ...(last
    ? { extract: { label: 'out', box: [2, 2, 4, 4] as [number, number, number, number] } }
    : { connector: { label: 'on', box: [2, 2, 4, 4] as [number, number, number, number], nearAt: [2, 3] as [number, number], checkpoint: pose(i * 100 + 50) } }),
  guards: [],
  reinforce: [[0, 0]],
  perStage: SECTOR.perStage,
  routes: [],
});
const three = (): SectorDef[] => [def('s1', 0, false), def('s2', 1, false, 'download'), def('s3', 2, true, 'grab')];
const IN: ConnectorInput = { allInside: true, doorwayClear: true };

/** Step the run's connector `s` seconds in 1/60 s steps; the OR of every step's events. */
function stepFor(r: SectorRun, s: number, input: ConnectorInput): number {
  let ev = 0;
  for (let t = 0; t < s - 1e-9; t += 1 / 60) ev |= r.step(1 / 60, input);
  return ev;
}

/** `def` with a partner point at the connector (`checkpoint2`). */
const defCp2 = (id: string, i: number, last: boolean, kind: SectorDef['objective']['kind'] = 'hack'): SectorDef => {
  const d = def(id, i, last, kind);
  if (d.connector) d.connector.checkpoint2 = pose(i * 100 + 60);
  return d;
};

/** Walk the run through one connector: the objective, then the full cycle. */
function walkOne(r: SectorRun): void {
  expect(r.objectiveDone()).toBe(true);
  stepFor(r, SECTOR.connectorHold + SECTOR.connectorCycle + 0.1, IN);
}

describe('sectorStartIndex', () => {
  it('the 1-based section number to a run index; 0 (a normal run) for anything that cannot start later', () => {
    const d = three();
    expect(sectorStartIndex(d, null)).toBe(0);
    expect(sectorStartIndex(d, 0)).toBe(0);
    expect(sectorStartIndex(d, 1)).toBe(0);
    expect(sectorStartIndex(d, 2)).toBe(1);
    expect(sectorStartIndex(d, 3)).toBe(2);
    expect(sectorStartIndex(d, 4)).toBe(0);
    expect(sectorStartIndex(d, 2.5)).toBe(0);
    expect(sectorStartIndex(d, -1)).toBe(0);
    expect(sectorStartIndex([def('a', 0, true), def('b', 1, true)], 2)).toBe(0);
  });
});

describe('applySectorStart', () => {
  it('leaves the run as a walked run leaves it at the same section', () => {
    const walked = new SectorRun(three());
    walkOne(walked);
    walkOne(walked);
    const jumped = new SectorRun(three());
    expect(applySectorStart(jumped, 2)).toBe(true);
    expect(jumped.index).toBe(walked.index);
    expect(jumped.index).toBe(2);
    expect(jumped.phase).toBe(walked.phase);
    expect(jumped.phase).toBe('objective');
    expect(jumped.current?.id).toBe(walked.current?.id);
    expect(jumped.current?.id).toBe('s3');
    expect(jumped.checkpoint).toEqual(walked.checkpoint);
    expect(jumped.checkpoint).toEqual(pose(150));
    expect(jumped.checkpoint2).toBe(walked.checkpoint2);
    expect(jumped.checkpoint2).toBeNull();
    expect(jumped.alarm).toBe(walked.alarm);
    expect(jumped.alarmAtStart).toBe(walked.alarmAtStart);
    expect(jumped.progress).toBe(walked.progress);
    expect(jumped.downloading).toBe(walked.downloading);
    expect(jumped.conn.state).toBe(walked.conn.state);
    expect(jumped.conn.state).toBe('locked');
    expect(jumped.marks).toEqual([-1, -1, -1]);
  });

  it('takes the connector\'s partner point (checkpoint2) when it has one', () => {
    const withCp2 = new SectorRun([defCp2('s1', 0, false), defCp2('s2', 1, false, 'download'), def('s3', 2, true, 'grab')]);
    expect(applySectorStart(withCp2, 1)).toBe(true);
    expect(withCp2.checkpoint2).toEqual(pose(60));
    const plain = new SectorRun(three());
    expect(applySectorStart(plain, 1)).toBe(true);
    expect(plain.checkpoint2).toBeNull();
  });

  it('never writes the defs: the checkpoint is a copy', () => {
    const r = new SectorRun(three());
    expect(applySectorStart(r, 2)).toBe(true);
    r.checkpoint.x = 999;
    expect(r.defs[1]!.connector!.checkpoint.x).toBe(150);
  });

  it('refuses a section with no connector before it, a moved run or a run past its objective, and leaves it untouched', () => {
    for (const i of [0, -1, 3, 5]) {
      const r = new SectorRun(three());
      expect(applySectorStart(r, i), `i ${i}`).toBe(false);
      expect(r.index).toBe(0);
      expect(r.checkpoint).toEqual(pose(0));
    }
    const moved = new SectorRun(three());
    walkOne(moved);
    expect(moved.index).toBe(1);
    expect(applySectorStart(moved, 2)).toBe(false);
    expect(moved.index).toBe(1);
    const connector = new SectorRun(three());
    expect(connector.objectiveDone()).toBe(true);
    expect(applySectorStart(connector, 2)).toBe(false);
    expect(connector.index).toBe(0);
  });

  it('a restart keeps the start: the same section from its checkpoint, the alarm back to stage 0', () => {
    const r = new SectorRun(three());
    expect(applySectorStart(r, 1)).toBe(true);
    r.raiseAlarm();
    expect(r.alarm).toBe(1);
    r.restartSection();
    expect(r.index).toBe(1);
    expect(r.alarm).toBe(0);
    expect(r.checkpoint).toEqual(pose(50));
    expect(r.phase).toBe('objective');
  });
});

describe('practiceLine', () => {
  it('drops the badges and ends "PRACTICE from section N"', () => {
    const ghost = sectorResult({ time: 61, kills: 0, spotted: 0 }).line;
    expect(ghost).toContain('GHOST');
    const out = practiceLine(ghost, 3);
    expect(out).toContain('Time 1:01');
    expect(out).not.toContain('GHOST');
    expect(out.endsWith('  ·  PRACTICE from section 3')).toBe(true);
    expect(practiceLine('Time 0:10  ·  Kills 0  ·  Spotted 0  ·  PERFECT  ·  GHOST  ·  Marks - 4/4', 2)).toBe('Time 0:10  ·  Kills 0  ·  Spotted 0  ·  Marks - 4/4  ·  PRACTICE from section 2');
    expect(practiceLine('Time 0:10  ·  Kills 2  ·  Spotted 0', 2)).toBe('Time 0:10  ·  Kills 2  ·  Spotted 0  ·  PRACTICE from section 2');
  });
});

describe('practiceFromRh', () => {
  it('practice when the host\'s run never rated section 1', () => {
    expect(practiceFromRh([-1, 20])).toBe(true);
    expect(practiceFromRh([19, -1])).toBe(false);
    expect(practiceFromRh([3])).toBe(false);
    expect(practiceFromRh([])).toBe(true);
  });
});
