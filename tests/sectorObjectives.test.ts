import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SectorRun, type SectorDef } from '../src/game/sectors';
import { SectorListMirror, sectorObjectiveLines } from '../src/game/sectorObjectives';
import type { ObjectiveLine } from '../src/ui/screens/pauseScreen';

// (hud-guidance B4, G343 / HG8, BRIEF A8) Field Terminal > Objectives in Sector Ops: every section's objective and exit,
// done / current / to do, on the host (its run) and on each co-op client (the mirror: the host's live section and its
// objective line, no wire change)

const zone = (label: string): { label: string; box: [number, number, number, number] } => ({ label, box: [0, 0, 1, 1] });
// sections 1 and 2 share an exit label (the connector window must not move the exit row early)
const DEFS = [
  { id: 's1', start: { x: 0, y: 0, z: 0, yaw: 0 }, objective: { label: 'Hack the office terminal' }, connector: zone('Go through the airlock') },
  { id: 's2', objective: { label: 'Download the plant logs' }, connector: zone('Go through the airlock') },
  { id: 's3', objective: { label: 'Take the ledger from the vault' }, extract: zone('Reach the loading dock') },
] as unknown as SectorDef[];

type S = 'done' | 'current' | 'todo';
const states = (rows: ObjectiveLine[] | null): S[] | null => rows && rows.map((r) => (r.done ? 'done' : r.current ? 'current' : 'todo'));
const LABELS = ['Hack the office terminal', 'Go through the airlock', 'Download the plant logs', 'Go through the airlock', 'Take the ledger from the vault', 'Reach the loading dock'];
/** The six rows' states with row `cur` Current (-1: every row Done). */
const at = (cur: number): S[] => LABELS.map((_, k) => (cur < 0 || k < cur ? 'done' : k === cur ? 'current' : 'todo'));

describe('sectorObjectiveLines (the host / solo rows)', () => {
  it('lists two rows per section, objective then exit, in order', () => {
    expect(sectorObjectiveLines(DEFS, 0, 'objective').map((r) => r.label)).toEqual(LABELS);
  });

  it('marks the rows per phase: objective, connector, extract, done', () => {
    expect(states(sectorObjectiveLines(DEFS, 0, 'objective'))).toEqual(at(0));
    expect(states(sectorObjectiveLines(DEFS, 0, 'connector'))).toEqual(at(1));
    expect(states(sectorObjectiveLines(DEFS, 1, 'objective'))).toEqual(at(2));
    expect(states(sectorObjectiveLines(DEFS, 2, 'extract'))).toEqual(at(5));
    expect(states(sectorObjectiveLines(DEFS, 2, 'done'))).toEqual(at(-1));
  });

  it('follows a real run: the objective done opens the exit row, the last section ends at the extraction', () => {
    const run = new SectorRun(DEFS);
    expect(states(sectorObjectiveLines(DEFS, run.index, run.phase))).toEqual(at(0));
    run.objectiveDone();
    expect(run.phase).toBe('connector');
    expect(states(sectorObjectiveLines(DEFS, run.index, run.phase))).toEqual(at(1));
    run.index = 2;
    run.phase = 'objective';
    run.objectiveDone();
    expect(run.phase).toBe('extract');
    expect(states(sectorObjectiveLines(DEFS, run.index, run.phase))).toEqual(at(5));
  });
});

describe('SectorListMirror (the co-op client rows)', () => {
  it('is null before the first section number, and with no section data', () => {
    const m = new SectorListMirror(DEFS);
    expect(m.lines()).toBeNull();
    m.onText('Hack the office terminal');
    expect(m.lines()).toBeNull();
    const none = new SectorListMirror([]);
    none.onLive(0);
    none.onText('Anything');
    expect(none.lines()).toBeNull();
  });

  it('section 1 played through: objective, exit, then section 2 after the connector', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(0);
    m.onText('Hack the office terminal');
    expect(states(m.lines())).toEqual(at(0));
    m.onText('Go through the airlock');
    expect(states(m.lines())).toEqual(at(1));
    m.onLive(1);
    m.onText('Download the plant logs');
    expect(states(m.lines())).toEqual(at(2));
    m.onText('Go through the airlock');
    expect(states(m.lines())).toEqual(at(3));
  });

  it('the objective arriving before the first section number (section 1)', () => {
    const m = new SectorListMirror(DEFS);
    m.onText('Hack the office terminal');
    m.onLive(0);
    expect(states(m.lines())).toEqual(at(0));
  });

  it('the connector window: a shared exit label never puts the next section on its exit row', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(0);
    m.onText('Hack the office terminal');
    m.onText('Go through the airlock');
    // the connector unloads (ls -1, ignored), then loads section 2 while the host's line still names the old exit
    m.onLive(-1);
    expect(states(m.lines())).toEqual(at(1));
    m.onLive(1);
    expect(states(m.lines())).toEqual(at(2));
    m.onText('Go through the airlock');
    expect(states(m.lines())).toEqual(at(2));
    m.onText('Download the plant logs');
    expect(states(m.lines())).toEqual(at(2));
  });

  it('strips the download percent from the host line', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(1);
    m.onText('Download the plant logs 42%');
    expect(states(m.lines())).toEqual(at(2));
    m.onText('Download the plant logs 100%');
    m.onText('Go through the airlock');
    expect(states(m.lines())).toEqual(at(3));
  });

  it('a checkpoint restart from the exit step goes back to the objective row', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(1);
    m.onText('Download the plant logs');
    m.onText('Go through the airlock');
    expect(states(m.lines())).toEqual(at(3));
    m.onText('Download the plant logs');
    expect(states(m.lines())).toEqual(at(2));
  });

  it('a late join at section 2 lands on its objective row', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(1);
    m.onText('Download the plant logs');
    expect(states(m.lines())).toEqual(at(2));
  });

  it('a late join during section 2\'s exit step lands on the exit row, in either order', () => {
    const a = new SectorListMirror(DEFS);
    a.onText('Go through the airlock');
    a.onLive(1);
    expect(states(a.lines())).toEqual(at(3));
    const b = new SectorListMirror(DEFS);
    b.onLive(1);
    b.onText('Go through the airlock');
    expect(states(b.lines())).toEqual(at(3));
  });

  it('a repeated section number changes nothing', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(0);
    m.onText('Hack the office terminal');
    m.onText('Go through the airlock');
    m.onLive(0);
    expect(states(m.lines())).toEqual(at(1));
  });

  it('the op end: the last section\'s exit, then an empty line, marks every row Done', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(2);
    m.onText('Take the ledger from the vault');
    m.onText('');
    // an empty line before the extraction step is not the end
    expect(states(m.lines())).toEqual(at(4));
    m.onText('Take the ledger from the vault');
    m.onText('Reach the loading dock');
    expect(states(m.lines())).toEqual(at(5));
    m.onText('');
    expect(states(m.lines())).toEqual(at(-1));
  });

  it('an empty line on an earlier section\'s exit is not the op end', () => {
    const m = new SectorListMirror(DEFS);
    m.onLive(0);
    m.onText('Hack the office terminal');
    m.onText('Go through the airlock');
    m.onText('');
    expect(states(m.lines())).toEqual(at(1));
  });
});

describe('the hook (the merge point with the mission engine, J7 R6)', () => {
  const src = (p: string): string => readFileSync(`src/${p}`, 'utf8').replace(/\r\n/g, '\n');

  it('GameState asks the mode, then the net layer, before its own lines', () => {
    expect(src('game/gameState.ts')).toContain(
      '  objectiveLines(): ObjectiveLine[] {\n    const own = this.mode?.objectiveLines?.() ?? this.net?.objectiveLines?.();\n    if (own) return own;\n',
    );
  });

  it('SectorMode and CoopClient have their objectiveLines() immediately above dispose()', () => {
    for (const p of ['game/modes/sectorMode.ts', 'net/coopClient.ts']) {
      expect(src(p)).toMatch(/ {2}objectiveLines\(\): ObjectiveLine\[\] \| null \{\n[^\n]*\n {2}\}\n\n {2}dispose\(\): void \{/);
    }
  });

  it('the client feeds the list only the host objective (never a notice) and the live section', () => {
    const c = src('net/coopClient.ts');
    expect(c).toContain('if (showMirrorLine(this.g.hud, t)) this.list?.onText(t);');
    expect(c).toContain('if (msg.ls !== undefined) this.list?.onLive(msg.ls);');
  });
});
