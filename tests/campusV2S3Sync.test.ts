/**
 * (campus-greybox S3 R4) The coordinator's sync rule for section 3 (`docs/campus-greybox/briefs/S3.md` section 4 "R4", Sync
 * test): the graph's `syncs` (ids, kinds, spaces, tracks, leads) equal SYNC.md's S3 rows, and the built devices sit where
 * the graph notes put them (+-0.05): the isolator board (56, -7.3) on G with a 45 s window, the sign-out board (44, -0.3)
 * on G, kp-store at (58, -6) on L1, the desk looping cam-view and cam-dock.
 *
 * The graph is read at the lane path (`graph/v2/campusOps-S3.json`: V2-SEED's byte-equal copy of the plan graph until R6
 * rewrites it). SYNC.md lives on `feature/sector-redesign-signoff` (7c021f01), not on this branch: its S3 rows are copied
 * below verbatim, and the test also reads the file whenever it is present in the tree.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { S3_BOARDS } from '../src/world/maps/campusV2/s3Lights';
import { S3_DESKS, S3_INTEL, S3_KEYPADS } from '../src/world/maps/campusV2/s3Devices';
import { S3_DOORS, S3_GROUPS, S3_L1 } from '../src/world/maps/campusV2/s3Kit';

const ROOT = path.resolve(__dirname, '..');
const GRAPH = path.join(ROOT, 'docs/sector-redesign/graph/v2/campusOps-S3.json');
const SYNC_MD = path.join(ROOT, 'docs/sector-redesign/signoff/SYNC.md');

interface Sync { id: string; kind: string; space: string; track: string; lead: string; src: string; note?: string }
interface Graph { spaces: { id: string }[]; syncs: Sync[] }
const graph = JSON.parse(fs.readFileSync(GRAPH, 'utf8')) as Graph;

/** SYNC.md (7c021f01) "## S3": id | kind | space | track | lead. */
const SYNC_S3: readonly (readonly [string, string, string, string, string])[] = [
  ['sync-s3-isolator', 'power_cut', 's3-plant', 'B', 's3-plant'],
  ['sync-s3-code-src', 'code_source', 's3-control', 'B', 's3-writeup'],
  ['sync-s3-camloop', 'camera_loop', 's3-sec', 'A', 's3-sec'],
  ['sync-s3-code-sink', 'code_sink', 's3-store', 'A', 's3-view'],
];

/** The S3 table of a SYNC.md text: its rows' id, kind, space, track and lead (by header name). */
function syncRowsOf(md: string): string[][] {
  const lines = md.split(/\r?\n/);
  const at = lines.findIndex((l) => /^## S3\b/.test(l));
  const rows = lines.slice(at + 1).filter((l, i, a) => l.startsWith('|') && a.slice(0, i).every((p) => !/^## /.test(p)));
  const cells = (l: string): string[] => l.slice(1, -1).split('|').map((c) => c.trim());
  const head = cells(rows[0]!);
  return rows.slice(2).map((r) => {
    const c = cells(r);
    return ['id', 'kind', 'space', 'track', 'lead'].map((h) => c[head.indexOf(h)]!);
  });
}

const sync = (id: string): Sync => graph.syncs.find((s) => s.id === id)!;
/** The first "(x, z)" pair in a note. */
function notePoint(note: string): [number, number] {
  const m = /\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(note);
  expect(m, note).not.toBeNull();
  return [Number(m![1]), Number(m![2])];
}

describe('campus v2 S3 sync nodes (R4)', () => {
  it('the graph `syncs` (ids, kinds, spaces, tracks, leads) equal SYNC.md\'s S3 rows; every space and lead is a graph space', () => {
    expect(graph.syncs.map((s) => [s.id, s.kind, s.space, s.track, s.lead])).toEqual(SYNC_S3.map((r) => [...r]));
    if (fs.existsSync(SYNC_MD)) expect(syncRowsOf(fs.readFileSync(SYNC_MD, 'utf8'))).toEqual(SYNC_S3.map((r) => [...r]));
    const ids = new Set(graph.spaces.map((s) => s.id));
    for (const s of graph.syncs) {
      expect(ids.has(s.space), `${s.id} space`).toBe(true);
      expect(ids.has(s.lead), `${s.id} lead`).toBe(true);
    }
  });

  it('sync-s3-isolator: the built board sits at the note\'s (56, -7.3) on G and cuts `view` for the note\'s 45 s', () => {
    const n = sync('sync-s3-isolator').note!;
    const [x, z] = notePoint(n);
    expect(S3_BOARDS.length).toBe(1);
    const b = S3_BOARDS[0]!;
    expect(Math.abs(b.pos.x - x)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(b.pos.z - z)).toBeLessThanOrEqual(0.05);
    expect(b.pos.y).toBe(0);
    expect(/(\d+) s\b/.exec(n)![1]).toBe(String(b.window));
    expect(b.window).toBe(45);
    expect(n).toContain('group view');
    expect(b.groups).toEqual([S3_GROUPS.view]);
  });

  it('sync-s3-code-src: the sign-out board (intel) sits at the note\'s (44, -0.3) on G and grants the keypads\' code', () => {
    const [x, z] = notePoint(sync('sync-s3-code-src').note!);
    const n = S3_INTEL.find((q) => q.kind === 'board')!;
    expect(n.kind).toBe('board');
    if (n.kind !== 'board') return;
    expect(Math.abs(n.at[0] - x)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(n.at[2] - z)).toBeLessThanOrEqual(0.05);
    expect(n.at[1]).toBeLessThan(S3_L1);
    for (const k of S3_KEYPADS) expect(k.code).toBe(n.grants);
  });

  it('sync-s3-code-sink: kp-store sits at the note\'s (58, -6), the staff door on L1', () => {
    const [x, z] = notePoint(sync('sync-s3-code-sink').note!);
    const kp = S3_KEYPADS[0]!;
    expect(Math.abs(kp.at[0] - x)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(kp.at[1] - z)).toBeLessThanOrEqual(0.05);
    expect([S3_DOORS.staff[0], S3_DOORS.staff[1]]).toEqual([...kp.at]);
    expect(S3_DOORS.staff[2]).toBe(S3_L1);
  });

  it('sync-s3-camloop: the desk loops cam-view and cam-dock (the note\'s cameras), in the sec room on L1', () => {
    const n = sync('sync-s3-camloop').note!;
    const cams = [...n.matchAll(/cam-[a-z0-9]+/g)].map((m) => m[0]);
    expect(cams).toEqual(['cam-view', 'cam-dock']);
    expect(S3_DESKS.length).toBe(1);
    expect(S3_DESKS[0]!.cameras).toEqual(cams);
    expect(S3_DESKS[0]!.y).toBe(S3_L1);
  });
});
