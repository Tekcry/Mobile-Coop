import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  formatMetrics, parseScaleSheet,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/metrics-gen.mjs';
import {
  validate,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/level-validate.mjs';
import { TEAM } from '../src/config/movement';
import { HANG } from '../src/world/anchors';

// level-validator M2 (V1a): docs/design/metrics.json is generated from docs/design/scale-sheet.md and must match it.
const ROOT = path.resolve(__dirname, '..');
const SHEET: string = fs.readFileSync(path.join(ROOT, 'docs/design/scale-sheet.md'), 'utf8');
const JSON_TEXT: string = fs.readFileSync(path.join(ROOT, 'docs/design/metrics.json'), 'utf8').replace(/\r\n/g, '\n');

interface Room { minW: number; minL: number; maxW: number; maxL: number; cameraFloor: number; ceilMin: number | 'open'; ceilMax: number | 'open'; encounter: string }
interface ThrowLong { max: number; spots: string[] }
interface Metrics { source: string; sizes: Record<string, number | number[] | ThrowLong>; roomParams: Record<string, number>; rooms: Record<string, Room>; rules: Record<string, number> }
const parse = (md: string): Metrics => parseScaleSheet(md) as Metrics;

describe('metrics-gen', () => {
  it('the committed metrics.json equals a fresh generation from the scale sheet (run node scripts/metrics-gen.mjs)', () => {
    const fresh = parse(SHEET);
    expect(JSON.parse(JSON_TEXT)).toEqual(fresh);
    expect(JSON_TEXT).toBe(formatMetrics(fresh));
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

  // validator-port S7a (A12, A13, A24, A27).
  it('any argument but --check prints the usage and exits 2, metrics.json untouched (A13)', () => {
    const file = path.join(ROOT, 'docs/design/metrics.json');
    const before = fs.readFileSync(file, 'utf8');
    for (const arg of ['--help', '--chek']) {
      const r = spawnSync(process.execPath, ['scripts/metrics-gen.mjs', arg], { cwd: ROOT, encoding: 'utf8' });
      expect(r.status).toBe(2);
      expect(r.stderr).toContain('usage: node scripts/metrics-gen.mjs [--check]');
      expect(r.stdout).toBe('');
    }
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });

  it('reads the new keys: nav_floor_depth_m, the mission rows, sizes.throw_long (A12, A27)', () => {
    const m = parse(SHEET);
    expect(m.rules).toMatchObject({
      nav_floor_depth_m: 1.5, mission_steps: [3, 6], mission_step_min: [2, 5], mission_total_min: [10, 30],
      mission_rules_max: 2, sector_parallel_min: 2, sector_syncs_min: 2,
    });
    expect('ladder_grab_m' in m.rules).toBe(false);
    expect('kit' in m).toBe(false);
    expect(m.sizes.throw_gap_max).toBe(2.7);
    expect(m.sizes.throw_long).toEqual({
      max: 4.9, spots: ['tallowWharf:w2-pawn-loft>w2-reading-room', 'tallowWharf:w2-arcade-roof>w3-roof'],
    });
    const bad = SHEET.replace('| Long throw (named spots only) | at most 4.9 m gap', '| Long throw (named spots only) | up to 4.9 m gap');
    expect(() => parse(bad)).toThrow(/section 3, row "Long throw \(named spots only\)".*throw_long/);
  });

  it('relay pin: the relay lip band top never above TEAM.relayMax + HANG.drop, and stays 4.3 - 4.6 (A24)', () => {
    const m = parse(SHEET);
    const band = m.sizes.hang_lip as number[];
    expect(band).toEqual([4.3, 4.6]);
    expect(band[1]).toBeLessThanOrEqual(TEAM.relayMax + HANG.drop);
  });

  // One link, so the fixture's other findings (sections, way back) are expected; only the lip finding is pinned.
  it('validate() on a one-link fixture with the sheet band: a team_hang lip of 4.6 passes, 4.7 ERRs', () => {
    const metrics = JSON.parse(JSON_TEXT) as Metrics;
    const graph = (lip: number) => ({
      meta: { map: 'pin', name: 'Relay pin', mode: 'campaign', players: [2], sections: ['S1'] },
      spaces: [
        { id: 'yard', section: 'S1', type: 'exterior', room_class: 'custom', function: 'yard', storey: 0, size: [10, 10, 6], tension: 1, tags: ['start'] },
        { id: 'ledge', section: 'S1', type: 'objective', room_class: 'custom', function: 'ledge', storey: 1, size: [6, 6, 3], tension: 2, tags: ['exfil'] },
      ],
      links: [{ from: 'yard', to: 'ledge', kind: 'team_hang', route: 'high', level_change: lip, length: 6, time_s: 6 }],
    });
    const lipErrs = (lip: number) => (validate(graph(lip), { metrics }) as { errors: string[] }).errors.filter((e) => /relay reach/.test(e));
    expect(lipErrs(4.6)).toEqual([]);
    expect(lipErrs(4.7)).toEqual(['link yard -> ledge (team_hang): lip 4.7 m above the 4.6 m relay reach']);
  });
});
