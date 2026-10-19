import { describe, expect, it } from 'vitest';
import { SECTOR, SectorRun, alarmStep, fmtTime, inExit, sectorResult, type SectorDef } from './sectors';
import { WAREHOUSE_SECTORS } from '../world/maps/warehouseSectors';

const def = (id: string, kind: SectorDef['objective']['kind'] = 'hack'): SectorDef => ({
  id,
  name: id,
  start: { x: 0, y: 0, z: 0, yaw: 0 },
  objective: { kind, label: 'x', x: 0, y: 0, z: 0, yaw: 0 },
  exit: { label: 'out', box: [2, 2, 4, 4] },
  guards: [],
  reinforce: [0, 0],
});

describe('SectorRun', () => {
  it('runs objective then exit, sector by sector, to the end', () => {
    const r = new SectorRun([def('a'), def('b')]);
    expect(r.exitReached()).toBeNull();
    expect(r.objectiveDone()).toBe(true);
    expect(r.objectiveDone()).toBe(false);
    expect(r.exitReached()).toBe('next');
    expect(r.current?.id).toBe('b');
    expect(r.phase).toBe('objective');
    r.objectiveDone();
    expect(r.exitReached()).toBe('done');
    expect(r.current).toBeNull();
  });

  it('a download completes only while it runs', () => {
    const r = new SectorRun([def('a', 'download')]);
    expect(r.download(SECTOR.downloadTime)).toBe(false);
    r.downloading = true;
    expect(r.download(SECTOR.downloadTime / 2)).toBe(false);
    expect(r.download(SECTOR.downloadTime / 2)).toBe(true);
    expect(r.phase).toBe('exit');
  });
});

describe('sector rules', () => {
  it('exit zones by box and floor', () => {
    expect(inExit(def('a'), 3, 0, 3)).toBe(true);
    expect(inExit(def('a'), 5, 0, 3)).toBe(false);
    expect(inExit(def('a'), 3, 3, 3)).toBe(false);
  });

  it('alarm stages cap and send reinforcements per stage', () => {
    let s = 0;
    let sent = 0;
    for (let i = 0; i < 5; i++) {
      const a = alarmStep(s);
      s = a.stage;
      sent += a.send;
    }
    expect(s).toBe(SECTOR.alarmMax);
    expect(sent).toBe(SECTOR.alarmMax * SECTOR.perStage);
  });

  it('Ghost needs no kills and never spotted', () => {
    expect(sectorResult({ time: 125, kills: 0, spotted: 0 })).toEqual({ ghost: true, line: 'Time 2:05  ·  Kills 0  ·  Spotted 0  ·  GHOST' });
    expect(sectorResult({ time: 60, kills: 1, spotted: 0 }).ghost).toBe(false);
    expect(sectorResult({ time: 60, kills: 0, spotted: 2 }).ghost).toBe(false);
    expect(fmtTime(59.9)).toBe('0:59');
  });

  it('the Warehouse sectors fit the live guard cap and rise in difficulty', () => {
    expect(WAREHOUSE_SECTORS.length).toBeGreaterThanOrEqual(3);
    const n = WAREHOUSE_SECTORS.map((s) => s.guards.length);
    expect(n.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(12);
    for (let i = 1; i < n.length; i++) expect(n[i]!).toBeGreaterThanOrEqual(n[i - 1]!);
    const kinds = new Set(WAREHOUSE_SECTORS.map((s) => s.objective.kind));
    expect(kinds).toEqual(new Set(['hack', 'grab', 'download']));
  });
});
