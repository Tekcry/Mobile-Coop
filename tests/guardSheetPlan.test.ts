// Guard variety sheet, pure half (scripts/operators/guardSheetPlan.mjs): tiles, looks, views, labels, layout, inputs, CLI.
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as sp from '../scripts/operators/guardSheetPlan.mjs';
// @ts-expect-error plain .mjs build script without types
import * as plan from '../scripts/operators/guardBakePlan.mjs';
import realKit from '../scripts/operators/data/guards.json';
import { CAMERA } from '../src/config/camera';
import { vfovFor } from '../src/core/display';
import { ENEMIES } from '../src/ai/enemyDefs';
import { HAIR_COLOURS, HAIR_STYLES, HEAD_VARIANTS, HEADWEAR, EYEWEAR } from '../src/operators/guards/gearMask';
import { LOD_HYSTERESIS } from '../src/operators/runtime/lodPick';
import { GUARD_LOD } from '../src/operators/runtime/guardLod';

interface Fig { kind: string; base: string; seed: number; look: Record<string, unknown>; helmet: boolean; armour: boolean; lod: 'game' | number; x: number; z: number; drop: number[] | null }
interface Tile {
  id: string; section: string; label: string; sub: string; rig: string; post: string; size: [number, number]; draw: [number, number]; smooth: boolean;
  view: { target: string; offset: number[]; distance: number; yaw: number; pitch: number; fovDeg: number }; figures: Fig[]; brk: boolean;
  needs: string[]; skip: string; missing: string[]; mapId: string; faction: string;
}
interface Section { id: string; title: string; note: string; tiles: Tile[] }
interface Placed { tile: Tile; x: number; y: number; w: number; h: number; labelY: number }
interface Layout { width: number; height: number; headers: { id: string; y: number }[]; tiles: Placed[] }

const SHEET = sp.SHEET as Record<string, unknown> & { faceDistances: number[]; cropPx: number; screenH: number; gameHfovDeg: number; width: number; margin: number; gap: number; png: string; port: number; lensFovDeg: number; bodyExtent: number };
const sheetPlan = sp.sheetPlan as (kit: unknown, o?: { reports?: Record<string, unknown>; ready?: string[] | null }) => Section[];
const layoutSheet = sp.layoutSheet as (s: Section[]) => Layout;
const kitInfo = sp.kitInfo as (kit: unknown) => { bases: string[]; heads: { id: string; base: string }[]; tones: number[]; refKind: Record<string, string>; hairStyles: Record<string, string[]>; hairColours: string[]; ownGlb: string[]; openBases: string[] };
const sheetArgs = sp.sheetArgs as (argv: string[], env?: Record<string, string>) => { inDir: string; png: string; kit: string | null; port: number; only: string; dryRun: boolean; build: boolean; allowMissing: boolean };
const inputStatus = sp.inputStatus as (kit: unknown, exists: (rel: string) => boolean) => { all: { rel: string; owner: string; what: string }[]; missing: { rel: string }[]; ready: string[] };

const sections = sheetPlan(realKit);
const tilesOf = (id: string) => sections.find((s) => s.id === id)!.tiles;
const allTiles = sections.flatMap((s) => s.tiles);
const RAD = Math.PI / 180;

describe('camera maths', () => {
  it('matches the game camera: 86 deg at 16:9 is the vertical FOV the game uses', () => {
    expect(SHEET.gameHfovDeg).toBe(CAMERA.fov);
    expect(sp.gameVfovDeg()).toBeCloseTo(vfovFor(CAMERA.fov, 16 / 9, CAMERA.fov) / RAD, 6);
    expect(sp.gameVfovDeg()).toBeCloseTo(55.36, 2);
  });

  it('a crop has the 1080p frame pixel density', () => {
    const v = sp.gameVfovDeg() as number;
    const f = sp.cropFovDeg(256) as number;
    const density = (px: number, fov: number) => px / (2 * Math.tan((fov * RAD) / 2));
    expect(density(256, f)).toBeCloseTo(density(SHEET.screenH, v), 6);
  });

  it('body tiles frame the whole figure and line-ups their width', () => {
    for (const t of allTiles.filter((x) => x.view.target === 'body')) {
      const vSpan = 2 * t.view.distance * Math.tan((t.view.fovDeg * RAD) / 2);
      expect(vSpan, t.id).toBeGreaterThanOrEqual(SHEET.bodyExtent - 1e-3);
      const xs = t.figures.map((f) => f.x);
      const hSpan = 2 * t.view.distance * Math.tan((sp.horizontalFovDeg(t.view.fovDeg, t.draw[0] / t.draw[1]) * RAD) / 2);
      expect(hSpan, t.id).toBeGreaterThan(Math.max(...xs) - Math.min(...xs) + 0.4);
    }
  });

  it('every tile not forcing a LOD stays in LOD0 as in play (under the first edge, before hysteresis)', () => {
    for (const t of allTiles) {
      for (const f of t.figures.filter((x) => x.lod === 'game')) {
        const d = Math.hypot(t.view.distance, f.x);
        expect(d, `${t.id} ${f.kind}`).toBeLessThan(GUARD_LOD.edges[0] * (1 + LOD_HYSTERESIS));
      }
    }
  });

  it('formats counts without locale', () => {
    expect(sp.thousands(7078)).toBe('7,078');
    expect(sp.thousands(1234567)).toBe('1,234,567');
    expect(sp.thousands(784)).toBe('784');
  });
});

describe('kit', () => {
  it('reads the faces, tones, hair and reference kinds from guards.json', () => {
    const k = kitInfo(realKit);
    expect(k.bases).toEqual(['average', 'lean', 'broad']);
    expect(k.heads.map((h) => h.id)).toEqual(['average-1', 'average-2', 'average-3', 'average-4', 'lean-1', 'lean-2', 'lean-3', 'lean-4']);
    expect(k.tones).toEqual([0, 1, 2, 3]);
    expect(k.refKind).toEqual({ average: 'grunt', lean: 'runner', broad: 'heavy' });
    expect(k.openBases).toEqual(['average', 'lean']);
    expect(k.hairStyles.average).toEqual(['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald']);
    expect(k.hairColours).toEqual(['black', 'darkbrown', 'brown', 'grey']);
    expect(k.ownGlb).toEqual(['shield_riot']);
  });
});

describe('tiles', () => {
  it('sections in PLAN order', () => {
    expect(sections.map((s) => s.id)).toEqual(['bases', 'faces', 'hair', 'kinds', 'gear', 'helmet', 'lods', 'night']);
    expect(new Set(allTiles.map((t) => t.id)).size).toBe(allTiles.length);
  });

  it('the three bases side by side', () => {
    const [t] = tilesOf('bases');
    expect(t!.figures.map((f) => [f.kind, f.base])).toEqual([['grunt', 'average'], ['runner', 'lean'], ['heavy', 'broad']]);
    expect(t!.figures.every((f) => !f.helmet && !f.armour)).toBe(true);
  });

  // (G10a D1c) the camera sits at +z looking down -z, so +x is screen-left: caption order left to right = falling x
  it('the bases and the line-ups read left to right in caption order (strictly decreasing x)', () => {
    const dec = (xs: number[]) => xs.every((x, i) => i === 0 || x < xs[i - 1]!);
    const [t] = tilesOf('bases');
    expect(t!.label).toBe(t!.figures.map((f) => f.base).join(' / '));
    expect(dec(t!.figures.map((f) => f.x))).toBe(true);
    for (const n of tilesOf('night')) expect(dec(n.figures.map((f) => f.x)), n.id).toBe(true);
  });

  it('all eight faces in four tones at 1.5 m and 3 m, head by head', () => {
    const faces = tilesOf('faces');
    expect(faces).toHaveLength(8 * 4 * 2);
    const k = kitInfo(realKit);
    for (const [i, t] of faces.entries()) {
      const h = k.heads[Math.floor(i / 8)]!;
      const tone = Math.floor((i % 8) / 2);
      const d = SHEET.faceDistances[i % 2]!;
      const f = t.figures[0]!;
      expect(f.look.head).toBe(h.id);
      expect(f.base).toBe(h.base);
      expect(f.kind).toBe(k.refKind[h.base]);
      expect(f.look.skinTone).toBe(tone);
      expect(f.look.headwear).toBeNull();
      expect(f.look.eyewear).toBeNull();
      expect(t.view).toMatchObject({ target: 'head', distance: d });
      expect(t.size).toEqual([SHEET.cropPx, SHEET.cropPx]);
      expect(t.draw).toEqual(t.size); // the game's pixels, 1:1
      expect(t.smooth).toBe(false);
      expect(t.brk).toBe(i % 8 === 0);
    }
  });

  it('every hair cap per open base, then the colours', () => {
    const hair = tilesOf('hair');
    expect(hair.map((t) => t.id)).toEqual([
      ...['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'].map((c) => `hair-average-${c}`),
      ...['buzz', 'crop', 'sidepart', 'receding', 'fade', 'bald'].map((c) => `hair-lean-${c}`),
      ...['black', 'darkbrown', 'brown', 'grey'].map((c) => `hair-colour-${c}`),
    ]);
    for (const t of hair) expect(t.figures[0]!.look.headwear).toBeNull();
  });

  it("every kind's outfit with gear off, then on; helmet on and knocked off with the drop; LODs forced", () => {
    const kinds = realKit.kinds.map((k) => k.id);
    expect(tilesOf('kinds').map((t) => t.figures[0]!.kind)).toEqual(kinds);
    expect(tilesOf('kinds').every((t) => !t.figures[0]!.helmet && !t.figures[0]!.armour)).toBe(true);
    expect(tilesOf('gear').map((t) => t.figures[0]!.kind)).toEqual(kinds);
    expect(tilesOf('gear').every((t) => t.figures[0]!.helmet && t.figures[0]!.armour)).toBe(true);
    const helmet = tilesOf('helmet');
    expect(helmet.map((t) => t.id)).toEqual(['helmet-average-on', 'helmet-average-off', 'helmet-lean-on', 'helmet-lean-off', 'helmet-broad-on', 'helmet-broad-off']);
    for (const t of helmet) {
      const f = t.figures[0]!;
      expect(f.helmet).toBe(t.id.endsWith('-on'));
      expect(f.drop !== null).toBe(t.id.endsWith('-off'));
    }
    const lods = tilesOf('lods');
    expect(lods.map((t) => t.figures[0]!.lod)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
  });

  it('Hollowmere night and night vision: every kind in one line-up, the phosphor only on the second', () => {
    const [a, b] = tilesOf('night');
    expect(a!.figures.map((f) => f.kind)).toEqual(realKit.kinds.map((k) => k.id));
    expect([a!.rig, a!.post, b!.rig, b!.post]).toEqual(['hollowmere', 'none', 'nightvision', 'nv']);
  });

  it('every kind and look id is one the game knows', () => {
    const heads = new Set<string>(HEAD_VARIANTS);
    const hair = new Set<string>(HAIR_STYLES);
    const colours = new Set<string>(HAIR_COLOURS);
    const hw = new Set<string>([...HEADWEAR]);
    const eye = new Set<string>([...EYEWEAR]);
    for (const t of allTiles) {
      expect(t.mapId).toBe('ctcourse');
      expect(t.faction).toBe('urban');
      for (const f of t.figures) {
        expect((ENEMIES as Record<string, { quadruped: boolean } | undefined>)[f.kind]?.quadruped, f.kind).toBe(false);
        const l = f.look;
        if ('head' in l) expect(heads.has(l.head as string)).toBe(true);
        if ('hairCap' in l) expect(hair.has(l.hairCap as string)).toBe(true);
        if ('hairColour' in l) expect(colours.has(l.hairColour as string)).toBe(true);
        if (l.headwear != null) expect(hw.has(l.headwear as string)).toBe(true);
        if (l.eyewear != null) expect(eye.has(l.eyewear as string)).toBe(true);
      }
    }
  });

  it('labels the LOD strip from the bake report', () => {
    const report = { lods: { 0: { bufferTris: 7078, shownTris: { grunt: 6360 } }, 1: { bufferTris: 2791, shownTris: { grunt: 2193 } }, 2: { bufferTris: 1021 } } };
    expect(sp.lodCaption(report, 0, 'grunt')).toBe('7,078 buffer tris, 6,360 shown (grunt)');
    expect(sp.lodCaption(report, 2, 'grunt')).toBe('1,021 buffer tris');
    expect(sp.lodCaption(undefined, 1, 'grunt')).toBe('no bake report');
    const s = sheetPlan(realKit, { reports: { average: report, shield_riot: { lods: { 0: { bufferTris: 800 }, 1: { bufferTris: 300 }, 2: { bufferTris: 120 } } } } });
    const lods = s.find((x) => x.id === 'lods')!;
    expect(lods.tiles[1]!.sub).toBe('2,791 buffer tris, 2,193 shown (grunt)');
    expect(lods.tiles[3]!.sub).toBe('no bake report');
    expect(lods.note).toContain('shield_riot: 800 / 300 / 120 tris');
  });

  it('a tile skips only when none of its bases is baked', () => {
    const s = sheetPlan(realKit, { ready: ['average'] }).flatMap((x) => x.tiles);
    const byId = (id: string) => s.find((t) => t.id === id)!;
    expect(byId('face-average-1-t0-1.5m').skip).toBe('');
    expect(byId('face-lean-1-t0-1.5m').skip).toBe('not baked: lean');
    expect(byId('bases').skip).toBe('');
    expect(byId('bases').missing).toEqual(['lean', 'broad']);
    expect(byId('kind-enforcer').needs).toEqual(['broad', 'shield_riot']);
    expect(byId('night-nv').missing).toEqual(['lean', 'broad', 'shield_riot']);
  });
});

describe('layout', () => {
  const lay = layoutSheet(sections);

  it('keeps every tile inside the sheet and none overlapping', () => {
    for (const p of lay.tiles) {
      expect(p.x).toBeGreaterThanOrEqual(SHEET.margin);
      expect(p.x + p.w).toBeLessThanOrEqual(SHEET.width - SHEET.margin);
      expect(p.labelY).toBe(p.y + p.h + 4);
    }
    for (let i = 0; i < lay.tiles.length; i++) {
      for (let j = i + 1; j < lay.tiles.length; j++) {
        const a = lay.tiles[i]!, b = lay.tiles[j]!;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart, `${a.tile.id} / ${b.tile.id}`).toBe(true);
      }
    }
    expect(lay.height).toBeGreaterThan(Math.max(...lay.tiles.map((p) => p.y + p.h)));
  });

  it('one head per row of faces, a base\'s three LODs on one row, sections top to bottom', () => {
    const at = (id: string) => lay.tiles.find((p) => p.tile.id === id)!;
    for (const h of kitInfo(realKit).heads) {
      const row = lay.tiles.filter((p) => p.tile.section === 'faces' && p.tile.figures[0]!.look.head === h.id);
      expect(new Set(row.map((p) => p.y)).size).toBe(1);
      expect(row[0]!.x).toBe(SHEET.margin);
    }
    for (const b of ['average', 'lean', 'broad']) expect(new Set([0, 1, 2].map((n) => at(`lod-${b}-${n}`).y)).size).toBe(1);
    expect(at('lod-broad-0').x).toBe(SHEET.margin);
    const ys = lay.headers.map((h) => h.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });

  it('--only picks sections, and refuses unknown ones', () => {
    expect((sp.pickSections(sections, 'faces,night') as Section[]).map((s) => s.id)).toEqual(['faces', 'night']);
    expect((sp.pickSections(sections, '') as Section[]).length).toBe(8);
    expect(() => sp.pickSections(sections, 'faces,nope')).toThrow(/nope/);
  });
});

describe('inputs and CLI', () => {
  it('lists every bake output the sheet reads and what a missing one leaves', () => {
    const all = inputStatus(realKit, () => true);
    expect(all.all).toHaveLength(3 * 5 + 4);
    expect(all.missing).toEqual([]);
    expect(all.ready).toEqual(['average', 'lean', 'broad', 'shield_riot']);
    const noReport = inputStatus(realKit, (r) => r !== 'lods/guard-lean.report.json');
    expect(noReport.ready).toContain('lean');
    const noGlb = inputStatus(realKit, (r) => r !== 'lods/guard-lean-lod1.glb' && r !== 'lods/guard-broad.json');
    expect(noGlb.ready).toEqual(['average', 'shield_riot']);
    expect(noGlb.missing.map((m) => m.rel)).toEqual(['lods/guard-lean-lod1.glb', 'lods/guard-broad.json']);
  });

  it('standalone: --in <dir> --out <png>', () => {
    const a = sheetArgs(['--in', 'C:/bake', '--out', 'C:/x/sheet.png', '--dry-run'], { E2E_PORT: '4191' });
    expect(a).toMatchObject({ inDir: 'C:/bake', png: 'C:/x/sheet.png', port: 4191, dryRun: true, build: true, allowMissing: false });
    expect(sheetArgs(['--in', 'd', '--out', 'p.png', '--port', '4200', '--no-build', '--allow-missing', '--only', 'faces']))
      .toMatchObject({ port: 4200, build: false, allowMissing: true, only: 'faces' });
    expect(sheetArgs(['--in', 'd', '--out', 'p.png']).port).toBe(4189);
    expect(() => sheetArgs(['--out', 'p.png'])).toThrow(/--in/);
    expect(() => sheetArgs([])).toThrow(/usage/);
    expect(() => sheetArgs(['--in'])).toThrow(/needs a value/);
    expect(() => sheetArgs(['--in', 'd', '--out', 'p.png', '--bogus'])).toThrow(/unknown/);
  });

  it("the bake's sheet job runs guard-sheet.mjs and its PNG lands on the job's declared output", () => {
    const [job] = (plan.jobsFor as (s: string, k: unknown) => { script: string; args: string[]; outputs: string[]; env: Record<string, string>; files: string[]; gpuBound: boolean }[])('sheet', realKit);
    expect(job!.script).toBe('scripts/operators/guard-sheet.mjs');
    expect(job!.gpuBound).toBe(true);
    expect(job!.env).toEqual({ E2E_GPU: '1', E2E_PORT: String(SHEET.port) });
    expect(job!.files).toEqual(expect.arrayContaining(['scripts/operators/guard-sheet.mjs', 'scripts/operators/guardSheetPlan.mjs', 'src/operators/lab/guardSheet.ts', 'guards.html']));
    // the driver appends --kit and --out <bake dir> (guard-bake.mjs commandFor)
    const a = sheetArgs([...job!.args, '--kit', 'k.json', '--out', 'C:/bake'], job!.env);
    expect(a.inDir).toBe('C:/bake');
    expect(a.png).toBe(path.join('C:/bake', job!.outputs[0]!));
    expect(job!.outputs).toEqual([SHEET.png]);
    expect(a.kit).toBe('k.json');
  });
});
