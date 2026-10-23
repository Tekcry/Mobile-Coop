/**
 * E2 glass on the campus (EW6, DEC G45; docs/sector-redesign/checks/e2-glass.md): the L10 fence fallback panels where the
 * SPEC places glass are glass panes now (S2 meeting-room fronts with the frosted band and the facilities glass, S3 landing
 * and viewing-corridor glass, the write-up office and clean-room fronts, S4 NOC window), the weldmesh fences stay
 * fences, and the guards' nav grid is the one the fence panels gave (every cell, so every route leg is unchanged).
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder, GLASS_THICK, type BoxPiece } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { S2_FROSTED_BAND } from '../src/world/maps/campusS2';
import { S3_L1, S3_ROOF, S3_SPANDREL_TOP, S3_VIEW_SPANDREL_TOP } from '../src/world/maps/campusS3';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { runtimeNav } from './helpers/runtimeNav';

const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const panes = b.boxes.filter((p) => p.glass);

/** A pane's plan line: along x (z fixed) or along z (x fixed), its span and its floor. */
function line(p: BoxPiece): { alongX: boolean; at: number; a: number; e: number; y: number; h: number } {
  const alongX = Math.abs(Math.sin(p.yaw)) > 0.5;
  const half = p.s[2] / 2;
  return alongX
    ? { alongX, at: p.c[2], a: p.c[0] - half, e: p.c[0] + half, y: p.c[1] - p.s[1] / 2, h: p.s[1] }
    : { alongX, at: p.c[0], a: p.c[2] - half, e: p.c[2] + half, y: p.c[1] - p.s[1] / 2, h: p.s[1] };
}

const E = 1e-6;
const F1 = 4.4;
/** Where SPEC places glass (EW6): the line, its span, the floor the pane stands on, its height and kind. */
const WHERE: { name: string; alongX: boolean; at: number; a: number; e: number; y: number; h: number; kind: 'clear' | 'frosted' }[] = [
  { name: 'S2 MR1 front, frosted band', alongX: false, at: -36, a: -20, e: -14, y: F1, h: S2_FROSTED_BAND, kind: 'frosted' },
  { name: 'S2 MR1 front, clear above', alongX: false, at: -36, a: -20, e: -14, y: F1 + S2_FROSTED_BAND, h: 2.4 - S2_FROSTED_BAND, kind: 'clear' },
  { name: 'S2 MR2 front, frosted band', alongX: true, at: 2, a: -44, e: -34, y: F1, h: S2_FROSTED_BAND, kind: 'frosted' },
  { name: 'S2 MR3 front, frosted band', alongX: true, at: 2, a: -26, e: -16, y: F1, h: S2_FROSTED_BAND, kind: 'frosted' },
  { name: 'S2 MR3 front, clear above', alongX: true, at: 2, a: -26, e: -16, y: F1 + S2_FROSTED_BAND, h: 2.4 - S2_FROSTED_BAND, kind: 'clear' },
  { name: 'S2 facilities glass (A75)', alongX: true, at: 0, a: -7.2, e: -5.0, y: F1, h: 2.4, kind: 'clear' },
  { name: 'S3 C2 landing glass over the hall (A23)', alongX: false, at: 22, a: -29.85, e: -8, y: S3_SPANDREL_TOP, h: S3_ROOF - S3_SPANDREL_TOP, kind: 'clear' },
  { name: 'S3 viewing corridor glass (west)', alongX: true, at: -8, a: 22, e: 40.7, y: S3_VIEW_SPANDREL_TOP, h: S3_ROOF - S3_VIEW_SPANDREL_TOP, kind: 'clear' },
  { name: 'S3 viewing corridor glass (east)', alongX: true, at: -8, a: 41.9, e: 52, y: S3_VIEW_SPANDREL_TOP, h: S3_ROOF - S3_VIEW_SPANDREL_TOP, kind: 'clear' },
  { name: 'S3 write-up office front', alongX: true, at: -6, a: 22, e: 28.2, y: S3_L1, h: S3_ROOF - S3_L1, kind: 'clear' },
  { name: 'S3 clean room glass', alongX: true, at: -6, a: 33, e: 39.7, y: S3_L1, h: S3_ROOF - S3_L1, kind: 'clear' },
  { name: 'S4 NOC window (E10 arm-noc)', alongX: true, at: 42, a: -3.5, e: 7.5, y: 4.6, h: 2.0, kind: 'clear' },
];

describe('campus glass (E2): the panes where SPEC places glass', () => {
  it('every SPEC glass line has its panes, the kind and the height', () => {
    for (const w of WHERE) {
      const on = panes.filter((p) => {
        const l = line(p);
        return l.alongX === w.alongX && Math.abs(l.at - w.at) < E && Math.abs(l.y - w.y) < E && l.a > w.a - E && l.e < w.e + E;
      });
      expect(on.length, w.name).toBeGreaterThan(0);
      for (const p of on) {
        expect(p.glass, w.name).toBe(w.kind);
        expect(p.s[1], w.name).toBeCloseTo(w.h, 6);
        expect(p.s[0], w.name).toBe(GLASS_THICK);
        expect(p.visible, w.name).toBe(false);
      }
    }
  });

  it('the panes: 21 on the campus (6 frosted bands: three fronts, each cut by its doorway), none in the light shapes', () => {
    expect(panes.length).toBe(21);
    expect(panes.filter((p) => p.glass === 'frosted').length).toBe(6);
    const n = canonicalLightShapes(b.boxes, b.cylinders, campusOps.id, false).length;
    const noGlass = canonicalLightShapes(b.boxes.filter((p) => !p.glass), b.cylinders, campusOps.id, false).length;
    expect(n).toBe(noGlass);
  });

  it('no fence panel is left on a glass line; the weldmesh fences (S1 site, S3 gas cage) stay fences', () => {
    for (const f of b.anchors.fences) {
      const alongX = Math.abs(f.tx) > 0.5;
      const at = alongX ? f.a.z : f.a.x;
      for (const w of WHERE) {
        const hit = w.alongX === alongX && Math.abs(at - w.at) < E && Math.abs(f.a.y - w.y) < 0.5;
        expect(hit, `fence ${f.a.x},${f.a.z} on ${w.name}`).toBe(false);
      }
    }
    expect(b.anchors.fences.length).toBe(8);
  });
});

describe('campus glass (E2): the guards nav grid is the fence fallback one', () => {
  it('every nav cell (walk, surface, height) matches the grid with fence panels on the same lines', () => {
    // the fallback: the same campus with each glass line back as one fence panel (a frosted band and the clear pane over
    // it on one line are one panel, as before)
    const old = new LevelBuilder();
    campusOps.build(old, 0);
    const glass = old.boxes.filter((p) => p.glass);
    old.boxes.splice(0, old.boxes.length, ...old.boxes.filter((p) => !p.glass));
    const lines = new Map<string, { ax: number; az: number; bx: number; bz: number; y0: number; y1: number }>();
    for (const p of glass) {
      const dx = Math.sin(p.yaw) * p.s[2] / 2;
      const dz = Math.cos(p.yaw) * p.s[2] / 2;
      const key = [p.c[0], p.c[2], p.yaw, p.s[2]].map((v) => v.toFixed(4)).join();
      const y0 = p.c[1] - p.s[1] / 2;
      const y1 = p.c[1] + p.s[1] / 2;
      const l = lines.get(key);
      if (l) {
        l.y0 = Math.min(l.y0, y0);
        l.y1 = Math.max(l.y1, y1);
      } else lines.set(key, { ax: p.c[0] - dx, az: p.c[2] - dz, bx: p.c[0] + dx, bz: p.c[2] + dz, y0, y1 });
    }
    for (const l of lines.values()) old.fence(l.ax, l.az, l.bx, l.bz, l.y1 - l.y0, l.y0);
    expect(lines.size).toBe(15);
    const spawn = lay.playerSpawns[0]!.pos;
    const layers = campusOps.navLayers ?? 3;
    const now = runtimeNav(b, spawn, layers, lay.navSeeds ?? []);
    const was = runtimeNav(old, spawn, layers, lay.navSeeds ?? []);
    expect(now.walk.length).toBe(was.walk.length);
    let diff = 0;
    for (let i = 0; i < now.walk.length; i++) if (now.walk[i] !== was.walk[i] || now.surf[i] !== was.surf[i] || now.height[i] !== was.height[i]) diff++;
    expect(diff).toBe(0);
  }, 120_000);
});
