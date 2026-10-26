/**
 * (campus-greybox P0) The per-section v2 switch (`flags.campusV2`, `src/world/maps/campusSections.ts`).
 * - Flag off (the default): every section is built from its live parts, so production is unchanged.
 * - Flag on: a section's parts come from `src/world/maps/campusV2/s<N>Data.ts`.
 * - While a v2 section is still an exact copy (`S<N>_V2_COPY`, set false by its lane at the first layout change), its
 *   parts equal the live ones and the whole campus built with it on equals the campus built with every flag off.
 * Each lane's own v2 tests go in `tests/campusV2S<N>*.test.ts`; this file is the lead's (PLAN "File ownership").
 */
import { describe, expect, it, vi } from 'vitest';
import { CAMPUS_V2_ON, readCampusV2 } from '../src/core/flags';
import { S1_V2_COPY } from '../src/world/maps/campusV2/s1Data';
import { S2_V2_COPY } from '../src/world/maps/campusV2/s2Data';
import { S3_V2_COPY } from '../src/world/maps/campusV2/s3Data';
import { S4_V2_COPY } from '../src/world/maps/campusV2/s4Data';
import { S5_V2_COPY } from '../src/world/maps/campusV2/s5Data';

/** The sections (1-5) whose v2 layout is still an exact copy of the live one. */
const COPIES: readonly number[] = [S1_V2_COPY, S2_V2_COPY, S3_V2_COPY, S4_V2_COPY, S5_V2_COPY].flatMap((c, k) => (c ? [k + 1] : []));

/** A plain, comparable form of any value: functions by their source text (a v2 copy has the same text), maps, sets and
 *  typed arrays as arrays, class instances as their own fields, cycles cut. */
function canon(x: unknown, seen: WeakSet<object> = new WeakSet()): unknown {
  if (typeof x === 'function') return `fn:${String(x)}`;
  if (x === null || typeof x !== 'object') return x;
  if (seen.has(x)) return '[cycle]';
  seen.add(x);
  let out: unknown;
  if (x instanceof Map) out = { map: [...x.entries()].map(([k, v]) => [canon(k, seen), canon(v, seen)]) };
  else if (x instanceof Set) out = { set: [...x].map((v) => canon(v, seen)) };
  else if (ArrayBuffer.isView(x)) out = Array.from(x as unknown as ArrayLike<number>);
  else if (Array.isArray(x)) out = x.map((v) => canon(v, seen));
  else {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(x).sort()) o[k] = canon((x as Record<string, unknown>)[k], seen);
    out = o;
  }
  seen.delete(x);
  return out;
}

/** Loads the campus modules fresh with `flags.campusV2 = v2` (the selection is made at load, as on a page). */
async function loadCampus(v2: readonly number[]) {
  vi.resetModules();
  const { flags } = await import('../src/core/flags');
  flags.campusV2 = v2;
  const sections = await import('../src/world/maps/campusSections');
  const sectors = await import('../src/world/maps/campusSectors');
  const { CAMPUS_COOP_LIPS } = await import('../src/world/maps/campusLips');
  const { buildCampus } = await import('../src/world/maps/campusOps');
  const { LevelBuilder } = await import('../src/world/levelBuilder');
  return { sections, sectors, CAMPUS_COOP_LIPS, buildCampus, LevelBuilder };
}

describe('campus v2 flag (campus-greybox P0)', () => {
  it('reads ?campusv2= as a sorted section list; absent or bad keeps the default (none)', () => {
    expect(CAMPUS_V2_ON).toEqual([]);
    expect(readCampusV2(null)).toBe(CAMPUS_V2_ON);
    expect(readCampusV2('3,1,3')).toEqual([1, 3]);
    expect(readCampusV2('0')).toEqual([]);
    expect(readCampusV2('1,2,3,4,5')).toEqual([1, 2, 3, 4, 5]);
    expect(readCampusV2('6')).toBe(CAMPUS_V2_ON);
    expect(readCampusV2('1;2')).toBe(CAMPUS_V2_ON);
  });

  it('flag off: every section is the live one (production unchanged)', async () => {
    const { sections, sectors, CAMPUS_COOP_LIPS } = await loadCampus([]);
    for (let k = 0; k < 5; k++) expect(sections.CAMPUS_PARTS[k]).toBe(sections.CAMPUS_V1_PARTS[k]);
    const v1 = sections.CAMPUS_V1_PARTS;
    expect(sectors.CAMPUS_SECTORS.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4', 's5']);
    expect(sectors.CAMPUS_SECTORS).toEqual(v1.map((p) => p.sector));
    expect(sectors.CAMPUS_ALARMS).toEqual(v1.flatMap((p) => p.alarms));
    expect(sectors.CAMPUS_SECURITY.devices).toEqual(v1.flatMap((p) => p.cameras));
    expect(sectors.CAMPUS_SECURITY.levels).toEqual({ ground: 0, l1: 4.4, 's3-l1': 4.5, 's5-l1': 4.2 });
    expect(CAMPUS_COOP_LIPS).toEqual(v1.flatMap((p) => p.coopLips));
  });

  it('flag on: the named sections come from campusV2, the others stay live', async () => {
    const { sections } = await loadCampus([2, 5]);
    for (let k = 0; k < 5; k++) {
      const want = k === 1 || k === 4 ? sections.CAMPUS_V2_PARTS[k] : sections.CAMPUS_V1_PARTS[k];
      expect(sections.CAMPUS_PARTS[k]).toBe(want);
    }
    expect(sections.CAMPUS_V2_PARTS[1]).not.toBe(sections.CAMPUS_V1_PARTS[1]);
  });

  it.each([1, 2, 3, 4, 5])('section %i: a v2 copy has the live parts (guards, routes, lips, sector, alarms, rooms, ...)', async (n) => {
    if (!COPIES.includes(n)) return; // the lane has changed its layout: its own tests cover it
    const { sections } = await loadCampus([]);
    expect(canon(sections.CAMPUS_V2_PARTS[n - 1])).toEqual(canon(sections.CAMPUS_V1_PARTS[n - 1]));
  });

  it('every copy switched on builds the same campus as every flag off (tables, greybox, layout, art)', { timeout: 600_000 }, async () => {
    const build = async (v2: readonly number[]) => {
      const m = await loadCampus(v2);
      const b = new m.LevelBuilder();
      const lay = m.buildCampus(b, { dress: true });
      return {
        sectors: canon(m.sectors.CAMPUS_SECTORS),
        security: canon(m.sectors.CAMPUS_SECURITY),
        alarms: canon(m.sectors.CAMPUS_ALARMS),
        lips: canon(m.CAMPUS_COOP_LIPS),
        boxes: canon(b.boxes),
        cylinders: canon(b.cylinders),
        anchors: canon(b.anchors),
        lights: canon(b.lights.lights),
        surfaces: canon(b.surfaces),
        sheets: canon(b.sheets),
        optic: canon(b.opticPoints),
        layout: canon(lay),
      };
    };
    const off = await build([]);
    const on = await build(COPIES);
    for (const key of Object.keys(off) as (keyof typeof off)[]) expect(on[key], key).toEqual(off[key]);
  });
});
