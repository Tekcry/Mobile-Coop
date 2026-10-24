import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatMetrics, parseScaleSheet, withKit,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/metrics-gen.mjs';

// level-validator M2 (V1a): docs/design/metrics.json is generated from docs/design/scale-sheet.md and must match it.
const ROOT = path.resolve(__dirname, '..');
const SHEET: string = fs.readFileSync(path.join(ROOT, 'docs/design/scale-sheet.md'), 'utf8');
const JSON_TEXT: string = fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8').replace(/\r\n/g, '\n');

interface Room { minW: number; minL: number; maxW: number; maxL: number; cameraFloor: number; ceilMin: number | 'open'; ceilMax: number | 'open'; encounter: string }
interface Metrics { source: string; sizes: Record<string, number | number[]>; roomParams: Record<string, number>; rooms: Record<string, Room>; rules: Record<string, number> }
const parse = (md: string): Metrics => parseScaleSheet(md) as Metrics;

describe('metrics-gen', () => {
  it('the committed metrics.json equals a fresh generation from the scale sheet (run node scripts/metrics-gen.mjs)', () => {
    const fresh = parse(SHEET);
    const { kit, ...sheet } = JSON.parse(JSON_TEXT) as Metrics & { kit?: unknown };
    expect(sheet).toEqual(fresh);
    expect(JSON_TEXT).toBe(formatMetrics(withKit(fresh, JSON_TEXT)));
    expect(kit).toBeTypeOf('object');
  });

  it('withKit carries the hand-kept kit block over (VAL-DIMS), last; no block or bad JSON: the sheet alone', () => {
    const fresh = parse(SHEET);
    const kept = withKit(fresh, JSON.stringify({ rules: { x: 1 }, kit: { boostMax: 4.5 } })) as Record<string, unknown>;
    expect(kept.kit).toEqual({ boostMax: 4.5 });
    expect(Object.keys(kept).at(-1)).toBe('kit');
    expect(kept.rules).toEqual(fresh.rules);
    expect(withKit(fresh, null)).toEqual(fresh);
    expect(withKit(fresh, '{ not json')).toEqual(fresh);
  });

  it('reads the spot values from sections 1, 3, 7 and 8', () => {
    const m = parse(SHEET);
    expect(m.source).toBe('docs/design/scale-sheet.md');
    expect(m.sizes.corridor_min_w).toBe(3.0);
    expect(m.sizes.corridor_w).toEqual([3.5, 4.0]);
    expect(m.sizes.door_w).toBe(1.2);
    expect(m.sizes.door_h).toBe(2.1);
    expect(m.sizes.step_player).toBe(0.42);
    expect(m.sizes.headroom).toBe(1.7);
    expect(m.rules.split_max_s).toBe(90);
    expect(m.rules.reach_max_s).toBe(15);
    expect(m.rules.shared_min_w_m).toBe(2.0);
    expect(m.roomParams.room_scale).toBe(1.4);
    expect(m.rooms.stair_core?.minW).toBe(2.6);
    expect(m.rooms.yard?.ceilMax).toBe('open');
    expect(m.rooms.meeting_room?.encounter).toBe('conditional');
  });

  it('carries every key the level validator reads (V1b): section 1 / 3 sizes and section 8 rules, ranges as [min, max]', () => {
    const m = parse(SHEET);
    expect(m.sizes).toMatchObject({
      ceiling_min: 2.4, door_h_min: 2.0, door_h_max: 2.2, roller_door_w: 3.0, duct_w: 1.2, duct_h: 1.5, tunnel_h: 2.1,
      wall_jump_max_up: 3.8, coop_lip: [4.3, 4.5], split_jump_w: [1.2, 1.95], split_jump_h: 3.6,
    });
    expect(m.rules).toMatchObject({ dead_end_max_m: 15, guards_early: [3, 6], guards_late: [6, 10], safe_drop_m: 4.5 });
    const changed = parse(SHEET.replace('| `guards_late` | 6 - 10 |', '| `guards_late` | 5 - 9 |'));
    expect(changed.rules.guards_late).toEqual([5, 9]);
    expect(() => parse(SHEET.replace('| `guards_late` | 6 - 10 |', '| `guards_late` | 6 to 10 |'))).toThrow(/section 8, row "\d+ guards_late".*not a number or a min - max range/);
  });

  it('a changed inline sheet changes the output; a missing row is omitted', () => {
    const base = parse(SHEET);
    const changed = parse(SHEET.replace('| `split_max_s` | 90 |', '| `split_max_s` | 120 |').replace('| Corridor | 3.5 - 4.0 m wide (never under 3.0) |', '| Corridor | 3.0 - 4.5 m wide (never under 2.5) |'));
    expect(changed.rules.split_max_s).toBe(120);
    expect(changed.sizes.corridor_w).toEqual([3.0, 4.5]);
    expect(changed.sizes.corridor_min_w).toBe(2.5);
    expect(changed).not.toEqual(base);
    const dropped = parse(SHEET.split('\n').filter((l) => !l.startsWith('| `grid_m` |') && !l.startsWith('| Open feature stair |')).join('\n'));
    expect('grid_m' in dropped.rules).toBe(false);
    expect('open_stair_w' in dropped.sizes).toBe(false);
    expect(dropped.rules.split_max_s).toBe(90);
  });

  it('a malformed section 8 row throws naming the section and row', () => {
    const bad = SHEET.replace('| `reach_max_s` | 15 |', '| `reach_max_s` | fifteen |');
    expect(() => parse(bad)).toThrow(/section 8, row "5 reach_max_s".*not a number/);
    const short = SHEET.replace(/\| `grid_m` \|[^\n]*/, '| `grid_m` | 0.5 |');
    expect(() => parse(short)).toThrow(/section 8, row "13 grid_m"/);
  });
});
