// Hard rule 6 (H5, G334): no countdown ever closes a route in Sector Ops or the campaign. Soft windows only.
// Out of scope: Marlow Yard timed drills (G342); the campaign has no map yet (Tallow Wharf adds its own rows here).
import { describe, expect, it } from 'vitest';
import { SECTOR } from '../src/game/sectors';
import type { SectorDef } from '../src/game/sectors';
import type { SectorStageAction } from '../src/game/sectorStage';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';

const TIME_KEY = /time(out|limit|r)|countdown|deadline|expire|closeAfter|closesAt/i;

/** Key paths allowed to match, each with a reason. Paths use `[]` for array items. */
const ALLOW: readonly { path: string; reason: string }[] = [
  {
    path: 'pairGates[].window',
    reason: 'two players turn their keys within a window; a miss never closes the route, the gate stays openable',
  },
];

const SETS: readonly [string, readonly SectorDef[]][] = [
  ['CAMPUS_SECTORS', CAMPUS_SECTORS],
  ['WAREHOUSE_SECTORS', WAREHOUSE_SECTORS],
];

function timeKeys(node: unknown, path: string, out: string[]): void {
  if (Array.isArray(node)) {
    for (const v of node) timeKeys(v, `${path}[]`, out);
    return;
  }
  if (node === null || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    const p = path ? `${path}.${k}` : k;
    if (TIME_KEY.test(k)) out.push(p);
    timeKeys(v, p, out);
  }
}

describe('H5 no route timer (G334)', () => {
  it('the sector sets are not empty', () => {
    for (const [, set] of SETS) expect(set.length).toBeGreaterThan(0);
  });

  it.each(SETS)('%s: no time key outside the allowlist', (_name, set) => {
    const bad: string[] = [];
    for (const def of set) {
      const found: string[] = [];
      timeKeys(def, '', found);
      for (const p of found) if (!ALLOW.some((a) => a.path === p)) bad.push(`${def.id}: ${p}`);
    }
    expect(bad).toEqual([]);
  });

  it('every allowlist row has a reason', () => {
    for (const a of ALLOW) expect(a.reason.length).toBeGreaterThan(10);
  });

  it.each(SETS)('%s: lock doors only come with an alarm stage and no time key', (_name, set) => {
    const bad: string[] = [];
    for (const def of set) {
      for (const act of (def.stageActions ?? []) as readonly SectorStageAction[]) {
        if (act.lockDoors && act.lockDoors.length > 0 && ![1, 2, 3].includes(act.stage)) {
          bad.push(`${def.id}: lockDoors without a stage 1-3`);
        }
        const found: string[] = [];
        timeKeys(act, '', found);
        for (const p of found) bad.push(`${def.id}: stage ${act.stage} has time key ${p}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the SECTOR table time keys are holds (a hold never closes anything)', () => {
    const HOLDS = ['hackTime', 'downloadTime', 'connectorHold', 'connectorCycle', 'connectorLoadAt', 'extractHold'];
    const keys = Object.keys(SECTOR).filter((k) => /time|hold|cycle|loadat|timer|countdown|deadline|expire|window/i.test(k));
    expect(keys.sort()).toEqual([...HOLDS].sort());
  });
});
