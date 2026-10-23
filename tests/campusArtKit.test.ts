/**
 * (sector-redesign ART-KIT step 8, A112 / A114 / A115) The campus base kit K and the catalogue layer: the built report
 * against `CAMPUS_KIT` (every id built, triangles under budget, only K materials, footprints and heights as built, the
 * ART-PLAN 3.2 sizes within 2 cm), the box rules (solid boxes 1 cm inside the skin, the skin within ART_PROUD of its
 * boxes' hull), hung pieces on their face, the F adapter, the merged look table, placement maths against Babylon, the
 * fit-scale rule, `skinFit` and `ruleV`, `writeArtBoxes` classes and `artCounts`.
 */
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Matrix, Quaternion, Vector3 } from '../src/core/babylon';
import { parseGlb } from '../src/operators/lab/glb';
import { canonicalLightShapes } from '../src/voxel/lightShapes';
import { detailPieces } from '../src/world/detailPass';
import { LevelBuilder, type BoxPiece, type CylPiece } from '../src/world/levelBuilder';
import { PROP_COLLISION, PROP_FOOTPRINT, PROP_HUNG, PROP_IDS, PROP_LOOK, PROP_MATERIALS, PROP_TRI_BUDGET } from '../src/world/props/facilityProps';
import {
  ART_PROUD,
  F_COLLISION_OVERRIDE,
  artBoxes,
  artCounts,
  artMatrix,
  artToWorld,
  facilityCatalogue,
  fitRange,
  FIT_MAX,
  FIT_MIN,
  ruleV,
  skinFit,
  writeArtBoxes,
  type ArtPlacement,
  type CatReport,
} from '../src/world/campusArt/catalogue';
import { CAMPUS_KIT, CAMPUS_LOOK, K_BOX_ONLY, K_CARS, K_IDS, K_MATERIALS } from '../src/world/campusArt/campusKit';
import { CampusDresser } from '../src/world/campusArt/dresser';
import { TraversalAnchors } from '../src/world/anchors';
import type { DressContext } from '../src/world/campusArt/keepouts';
import type { SectorDef } from '../src/game/sectors';

const ASSETS = path.resolve(__dirname, '../src/world/campusArt/assets');
const report = JSON.parse(readFileSync(path.join(ASSETS, 'campus-kit.json'), 'utf8')) as {
  pieces: Record<string, { meshes: Record<string, number>; triangles: number; bounds: { min: number[]; max: number[] } }>;
  materials: string[];
  triangles: number;
  bytes: number;
};
const glb = (file: string): ArrayBuffer => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

/** ART-PLAN 3.2 sizes (m, x / y / z) of the meshed pieces whose size the table fixes (the hull: footprint x, height, depth). */
const PLAN_SIZE: Record<string, [number, number, number]> = {
  meetingTable: [2.4, 0.74, 1.2],
  printerMfd: [0.6, 1.15, 0.65],
  waterCooler: [0.32, 1.3, 0.32],
  lockerBank: [0.9, 1.9, 0.5],
  shelving: [1.2, 2.0, 0.5],
  whiteboard: [1.8, 1.2, 0.04],
  noticeBoard: [1.2, 0.9, 0.03],
  wallClock: [0.35, 0.35, 0.05],
  fireExtinguisher: [0.2, 0.65, 0.2],
  fireCallPoint: [0.1, 0.1, 0.05],
  exitSign: [0.4, 0.15, 0.05],
  ceilingDiffuser: [0.6, 0.03, 0.6],
  smokeDetector: [0.12, 0.05, 0.12],
  ceilingGrid: [3.6, 0.02, 3.6],
  kitchenRun: [1.2, 0.9, 0.6],
  wallCupboards: [1.2, 0.7, 0.35],
  fridge: [0.6, 1.8, 0.65],
  vendingMachine: [0.9, 1.85, 0.8],
  cafeTable: [0.9, 0.75, 0.9],
  cafeChair: [0.45, 0.85, 0.5],
  recyclingBins: [1.0, 0.9, 0.4],
  planterTrough: [2.0, 0.7, 0.8],
  plantPot: [0.6, 1.6, 0.6],
  labBench: [3.0, 1.6, 0.9],
  fumeHood: [1.5, 2.4, 0.9],
  gasCylinders: [1.2, 1.7, 0.4],
  instrumentCart: [0.6, 1.1, 0.5],
  batteryRack: [2.0, 1.2, 0.8],
  pduStrip: [0.15, 1.8, 0.1],
  floorTileGrid: [3.0, 0.01, 3.0],
  bookcase: [1.0, 2.2, 0.4],
  boardTable: [4.0, 0.76, 1.4],
  chesterfield: [2.0, 0.8, 0.9],
  wingChair: [0.8, 1.1, 0.8],
  fireplace: [1.6, 1.3, 0.5],
  portraitFrame: [0.8, 1.0, 0.05],
  sideboard: [2.0, 0.9, 0.5],
  longcaseClock: [0.5, 2.1, 0.3],
  radiatorCast: [1.0, 0.7, 0.15],
  radiatorPanel: [1.2, 0.6, 0.1],
  stoveRange: [1.2, 0.9, 0.65],
  carSilver: [1.8, 1.5, 4.2],
  carBlack: [1.8, 1.5, 4.2],
  carBlue: [1.8, 1.5, 4.2],
  carWhite: [1.8, 1.5, 4.2],
  bikeRack: [2.0, 1.0, 0.6],
  wheelieBin: [0.6, 1.1, 0.75],
  binLarge: [1.4, 1.2, 1.1],
  parkBench: [1.8, 0.8, 0.6],
  litterBin: [0.45, 0.9, 0.45],
  feederPillar: [1.6, 1.5, 0.4],
  siteSign: [1.5, 2.2, 0.3],
  reeds: [2.0, 0.5, 2.0],
  hedge: [1.0, 1.2, 0.6],
  acCondenser: [1.0, 1.0, 0.45],
  roofCowl: [0.5, 0.8, 0.5],
  ductRun: [1.0, 0.4, 0.6],
};
/** Pieces whose see box is the K envelope round them (larger than the drawn piece by design). */
const ENV_BOXED = ['cafeChair'];

describe('campus kit K (A112)', () => {
  it('60 ids: 58 meshed + the two box-only envelopes; the four car colours', () => {
    expect(K_IDS.length).toBe(60);
    expect(new Set(K_IDS).size).toBe(60);
    expect([...K_BOX_ONLY].sort()).toEqual(['binEnv', 'chairEnv']);
    expect(K_CARS.every((c) => K_IDS.includes(c))).toBe(true);
    for (const id of K_IDS) {
      expect(CAMPUS_KIT.footprint[id], id).toBeDefined();
      expect(CAMPUS_KIT.triBudget[id], id).toBeDefined();
      expect(CAMPUS_KIT.classOf?.[id], id).toBeDefined();
    }
  });

  it('the report: every meshed id built, under its budget, only K materials; footprints and heights as built (1 cm); sizes as ART-PLAN 3.2 (2 cm)', () => {
    const built = Object.keys(report.pieces).sort();
    expect(built).toEqual(K_IDS.filter((id) => !K_BOX_ONLY.includes(id)).sort());
    for (const [id, r] of Object.entries(report.pieces)) {
      expect(r.triangles, `${id} tris`).toBeLessThanOrEqual(CAMPUS_KIT.triBudget[id]!);
      for (const m of Object.keys(r.meshes)) expect(K_MATERIALS.includes(m), `${id}.${m}`).toBe(true);
      const f = CAMPUS_KIT.footprint[id]!;
      expect(Math.abs(r.bounds.min[0]! - f[0]), `${id} x0`).toBeLessThanOrEqual(0.01);
      expect(Math.abs(r.bounds.min[2]! - f[1]), `${id} z0`).toBeLessThanOrEqual(0.01);
      expect(Math.abs(r.bounds.max[0]! - f[2]), `${id} x1`).toBeLessThanOrEqual(0.01);
      expect(Math.abs(r.bounds.max[2]! - f[3]), `${id} z1`).toBeLessThanOrEqual(0.01);
      const b = CAMPUS_KIT.bounds![id]!;
      expect(b.lo[1]).toBeCloseTo(r.bounds.min[1]!, 4);
      expect(b.hi[1]).toBeCloseTo(r.bounds.max[1]!, 4);
      const want = PLAN_SIZE[id];
      if (want) {
        const got = [r.bounds.max[0]! - r.bounds.min[0]!, r.bounds.max[1]! - r.bounds.min[1]!, r.bounds.max[2]! - r.bounds.min[2]!];
        for (let k = 0; k < 3; k++) expect(Math.abs(got[k]! - want[k]!), `${id} size ${k}: ${got[k]} vs ${want[k]}`).toBeLessThanOrEqual(0.02);
      }
    }
    expect(report.triangles).toBeLessThanOrEqual(18_000);
    expect(statSync(path.join(ASSETS, 'campus-kit.glb')).size).toBeLessThanOrEqual(1.2 * 1024 * 1024);
  });

  it('every solid box sits 1 cm inside its piece and the skin stands at most ART_PROUD off the boxes (listed overhangs excepted)', () => {
    for (const id of K_IDS) {
      const boxes = CAMPUS_KIT.collision[id];
      const r = report.pieces[id];
      if (!boxes || !r || ENV_BOXED.includes(id)) continue;
      const lo = [Infinity, Infinity, Infinity];
      const hi = [-Infinity, -Infinity, -Infinity];
      for (const b of boxes) {
        for (let k = 0; k < 3; k++) {
          expect(b.hi[k]!, `${id} box`).toBeGreaterThan(b.lo[k]!);
          lo[k] = Math.min(lo[k]!, b.lo[k]!);
          hi[k] = Math.max(hi[k]!, b.hi[k]!);
          if (!b.see) {
            expect(b.lo[k]!, `${id} solid box inside`).toBeGreaterThanOrEqual(r.bounds.min[k]! - 1e-3);
            expect(b.hi[k]!, `${id} solid box inside`).toBeLessThanOrEqual(r.bounds.max[k]! + 1e-3);
          }
        }
      }
      const allow = Math.max(ART_PROUD, CAMPUS_KIT.overhang[id]?.by ?? 0) + 1e-3;
      for (let k = 0; k < 3; k++) {
        expect(lo[k]! - r.bounds.min[k]!, `${id} axis ${k} min`).toBeLessThanOrEqual(allow);
        expect(r.bounds.max[k]! - hi[k]!, `${id} axis ${k} max`).toBeLessThanOrEqual(allow);
      }
    }
    // the env-boxed chair stands inside its envelope
    const env = CAMPUS_KIT.collision.cafeChair![0]!;
    const c = report.pieces.cafeChair!.bounds;
    for (let k = 0; k < 3; k++) {
      expect(c.min[k]!).toBeGreaterThanOrEqual(env.lo[k]! - 1e-3);
      expect(c.max[k]!).toBeLessThanOrEqual(env.hi[k]! + 1e-3);
    }
  });

  it('classes: skins and visual pieces write no box, solid ones a visible box, see ones collision-only; hung pieces sit on their face', () => {
    for (const id of K_IDS) {
      const cls = CAMPUS_KIT.classOf![id]!;
      const boxes = CAMPUS_KIT.collision[id];
      if (cls === 'skin' || cls === 'skin-hide' || cls === 'visual') expect(boxes, id).toBeFalsy();
      if (cls === 'solid') expect(boxes?.some((b) => !b.see), id).toBe(true);
      if (cls === 'see' || cls === 'box') expect(boxes?.every((b) => b.see), id).toBe(true);
    }
    for (const id of CAMPUS_KIT.hung) {
      const b = report.pieces[id]!.bounds;
      expect(b.min[1], `${id} bottom edge on the origin`).toBeCloseTo(0, 3);
      if (CAMPUS_KIT.footprint[id]![1] === 0) expect(b.min[2], `${id} back on the face`).toBeCloseTo(0, 3);
    }
    // the fit list (ART-PLAN 3.2) and the emissive parts are in the GLB
    // (artnext A8) kitchenRun / wallCupboards are fit pieces too
    expect([...CAMPUS_KIT.fit].sort()).toEqual(['batteryRack', 'binLarge', 'boardTable', 'cafeTable', 'carBlack', 'carBlue', 'carSilver', 'carWhite', 'ceilingGrid', 'feederPillar', 'floorTileGrid', 'labBench', 'meetingTable', 'planterTrough', 'treeSkin', 'kitchenRun', 'wallCupboards'].sort());
    expect([...CAMPUS_KIT.hung].sort()).toEqual(['ductRun', 'exitSign']);
    expect(report.pieces.vendingMachine!.meshes.screen).toBeGreaterThan(0);
    expect(report.pieces.exitSign!.meshes.exitGreen).toBeGreaterThan(0);
  });

  it('reads with the game GLB reader: one mesh per (piece, material)', () => {
    const model = parseGlb(glb(path.join(ASSETS, 'campus-kit.glb')));
    const names = model.meshes.map((m) => m.name).sort();
    const want = Object.entries(report.pieces).flatMap(([p, r]) => Object.keys(r.meshes).map((m) => `${p}.${m}`)).sort();
    expect(names).toEqual(want);
  });
});

describe('the F adapter and the look tables', () => {
  it('facilityCatalogue equals the facility tables (the office chair stands in the K chair envelope)', () => {
    const f = facilityCatalogue();
    expect(f.id).toBe('F');
    expect(f.ids).toEqual(PROP_IDS);
    expect(f.materials).toEqual(PROP_MATERIALS);
    expect(f.looks).toBe(PROP_LOOK);
    expect(f.footprint).toBe(PROP_FOOTPRINT);
    expect(f.triBudget).toBe(PROP_TRI_BUDGET);
    expect(f.hung).toBe(PROP_HUNG);
    for (const id of PROP_IDS) expect(f.collision[id], id).toEqual(F_COLLISION_OVERRIDE[id] ?? PROP_COLLISION[id]);
    expect(Object.keys(F_COLLISION_OVERRIDE)).toEqual(['officeChair']);
  });

  it('the merged look table has no name with two looks; campus materials stay within budget', () => {
    for (const [name, look] of Object.entries(CAMPUS_LOOK)) {
      const f = (PROP_LOOK as Record<string, unknown>)[name];
      if (f) expect(look, name).toEqual(f);
    }
    // every K material has a look
    for (const m of K_MATERIALS) expect(CAMPUS_LOOK[m], m).toBeDefined();
    // the materials the kit and the facility pieces ART-PLAN 3.1 names can draw on campus (the 40 budget, ART-PLAN 3.3)
    const fReport = JSON.parse(readFileSync(path.resolve(__dirname, '../src/world/props/assets/facility-props.json'), 'utf8')) as { pieces: Record<string, { meshes: Record<string, number> }> };
    const F31 = ['officeDesk', 'officeChair', 'filingCabinet', 'receptionDesk', 'loungeSeat', 'greenWall', 'modelVitrine', 'securityDesk', 'monitorWall', 'serverRack', 'meshPanel', 'cableTray', 'switchgearPanel', 'driveCabinet', 'glandPlate', 'davitBox', 'coolingUnit', 'pipeRun', 'cableDrum', 'palletLoad', 'palletLoadLow', 'dispatchDesk', 'barrierPost', 'bollard', 'signPlate', 'holdingBench', 'kitCaseWall', 'vaultDoor', 'vaultLeaf', 'depositWall', 'timeLockPanel', 'bankGrille', 'trenchGrating', 'cleanerTrolley'];
    const used = new Set<string>(Object.values(report.pieces).flatMap((r) => Object.keys(r.meshes)));
    for (const p of F31) for (const m of Object.keys(fReport.pieces[p]!.meshes)) used.add(m);
    expect(used.size, [...used].sort().join(' ')).toBeLessThanOrEqual(40);
  });
});

/** A seeded generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('placement maths (A114)', () => {
  it('artMatrix equals Babylon Matrix.Compose(scale, yaw, position) for 20 seeded placements; artToWorld agrees', () => {
    const r = rng(1015);
    for (let i = 0; i < 20; i++) {
      const p: ArtPlacement = { cat: 'K', prop: 'meetingTable', x: r() * 40 - 20, y: r() * 6, z: r() * 40 - 20, yaw: r() * 7 - 0.5, s: [0.8 + r() * 0.45, 0.8 + r() * 0.45, 0.8 + r() * 0.45], section: 0, cls: 'skin', why: 't' };
      const out = new Float32Array(16);
      artMatrix(p, out, 0);
      const ref = new Matrix();
      Matrix.ComposeToRef(new Vector3(p.s![0], p.s![1], p.s![2]), Quaternion.RotationYawPitchRoll(p.yaw, 0, 0), new Vector3(p.x, p.y, p.z), ref);
      const m = ref.toArray();
      for (let k = 0; k < 16; k++) expect(Math.abs(out[k]! - m[k]!), `case ${i} [${k}]`).toBeLessThan(1e-5);
      const a = Vector3.TransformCoordinates(new Vector3(0.3, 0.6, -0.2), ref);
      const w = artToWorld(p, 0.3, 0.6, -0.2);
      expect(w[0]).toBeCloseTo(a.x, 4);
      expect(w[1]).toBeCloseTo(a.y, 4);
      expect(w[2]).toBeCloseTo(a.z, 4);
    }
  });

  it('scale only on fit pieces, and only 0.8-1.25 (CampusDresser.add)', () => {
    const b = new LevelBuilder();
    b.floor(0, 0, 40, 40, '#777777', 0, 0.3);
    const ctx: DressContext = {
      section: 0,
      rooms: [{ id: 'r', name: 'r', minX: -20, maxX: 20, minZ: -20, maxZ: 20 }],
      tags: {},
      sector: { id: 't', name: 't', start: { x: 90, y: 0, z: 90, yaw: 0 }, objective: { kind: 'hack', label: 'o', x: 95, y: 1, z: 95, yaw: 0 }, guards: [], reinforce: [], perStage: 0, routes: [] } as SectorDef,
      doors: [],
      windows: [],
      anchors: new TraversalAnchors(),
      items: [],
      hides: [],
      cameras: [],
      levels: {},
      lasers: [],
      lips: [],
      lamps: [],
      boxes: b.boxes,
    };
    const d = new CampusDresser(b, ctx, { F: facilityCatalogue(), K: CAMPUS_KIT });
    expect(() => d.add('K:printerMfd', 0, 0, 0, 0, { cls: 'solid', why: 't', s: [1.1, 1, 1] })).toThrow(/not a fit piece/);
    expect(() => d.add('K:cafeTable', 0, 0, 0, 0, { cls: 'solid', why: 't', s: [1.3, 1, 1] })).toThrow(/outside/);
    expect(d.add('K:printerMfd', 0, 0, 0, 0, { cls: 'solid', why: 't' })).toBe(0);
    expect(d.add('K:cafeTable', 3, 0, 0, 0, { cls: 'solid', why: 't', s: [1.2, 1, 0.9] })).toBe(1);
  });
});

describe('(artnext A3 / A8) per-piece fit limits', () => {
  /** A dresser over a floor and one greybox box (centre, size); returns the dresser and the box's index. */
  const withBox = (c: [number, number, number], s: [number, number, number]): { d: CampusDresser; i: number } => {
    const b = new LevelBuilder();
    b.floor(0, 0, 40, 40, '#777777', 0, 0.3);
    b.box(c[0], c[1], c[2], s[0], s[1], s[2], '#777777');
    const ctx: DressContext = {
      section: 0,
      rooms: [{ id: 'r', name: 'r', minX: -20, maxX: 20, minZ: -20, maxZ: 20 }],
      tags: {},
      sector: { id: 't', name: 't', start: { x: 90, y: 0, z: 90, yaw: 0 }, objective: { kind: 'hack', label: 'o', x: 95, y: 1, z: 95, yaw: 0 }, guards: [], reinforce: [], perStage: 0, routes: [] } as SectorDef,
      doors: [],
      windows: [],
      anchors: new TraversalAnchors(),
      items: [],
      hides: [],
      cameras: [],
      levels: {},
      lasers: [],
      lips: [],
      lamps: [],
      boxes: b.boxes,
    };
    return { d: new CampusDresser(b, ctx, { F: facilityCatalogue(), K: CAMPUS_KIT }), i: b.boxes.length - 1 };
  };

  it('per-piece fit limits: batteryRack 1.0 deep, labBench 2.0 long, meshPanel 3.0 high, kitchenRun on a 0.8 deep counter; the default stays 0.8-1.25', () => {
    expect(fitRange(CAMPUS_KIT, 'cafeTable')).toEqual({ min: FIT_MIN, max: FIT_MAX });
    expect(fitRange(CAMPUS_KIT, 'batteryRack').max).toBeGreaterThanOrEqual(1.275);
    expect(fitRange(CAMPUS_KIT, 'labBench').min).toBeLessThanOrEqual(2.02 / 3.0);
    expect(fitRange(facilityCatalogue(), 'meshPanel').max).toBeGreaterThanOrEqual(3.02 / 2.4);
    // the S4 battery box (2.0 x 1.2 x 1.0): z 1.275
    const br = withBox([0, 0.6, 0], [2.0, 1.2, 1.0]);
    const ib = br.d.skin('K:batteryRack', br.i, 0, { why: 't' });
    expect(br.d.placements[ib]!.s![2]).toBeCloseTo(1.02 / 0.8, 3);
    // the S3 burn-in desk (2.0 long): x 0.673
    const lb = withBox([0, 0.45, 0], [2.0, 0.9, 0.9]);
    const il = lb.d.skin('K:labBench', lb.i, 0, { why: 't' });
    expect(lb.d.placements[il]!.s![0]).toBeCloseTo(2.02 / 3.0, 3);
    // a 1.8 m bench is past its own limit (0.6)
    const lb2 = withBox([0, 0.45, 0], [1.8, 0.9, 0.9]);
    expect(() => lb2.d.skin('K:labBench', lb2.i, 0, { why: 't' })).toThrow(/outside 0.65-1.25/);
    // the S4 cage wall (1.5 x 3.0 x 0.05): y 1.258
    const mp = withBox([0, 1.5, 0], [1.5, 3.0, 0.05]);
    const im = mp.d.skin('F:meshPanel', mp.i, 0, { why: 't' });
    expect(mp.d.placements[im]!.s![1]).toBeCloseTo(3.02 / 2.4, 3);
    // (A8) the S5 kitchen counter (0.8 x 0.9 x 4.0): kitchenRun modules along z, 3 x 1.33 long and 0.8 deep
    const kr = withBox([0, 0.45, 0], [0.8, 0.9, 4.0]);
    const row = kr.d.skinRow('K:kitchenRun', kr.i, false, 1, { why: 't', group: 7 });
    expect(row).toHaveLength(3);
    for (const i of row) {
      expect(kr.d.placements[i]!.group, 'skinRow passes group to every module (A5)').toBe(7);
      expect(kr.d.placements[i]!.s![2]).toBeCloseTo(0.82 / 0.6, 3);
    }
    // the default limit holds for every other piece
    const t = withBox([0, 0.375, 0], [0.9, 0.75, 0.9]);
    expect(() => t.d.add('K:cafeTable', 5, 0, 5, 0, { cls: 'solid', why: 't', s: [1.3, 1, 1] })).toThrow(/outside 0.8-1.25/);
  });
});

describe('skins, rule V and the box classes (A115)', () => {
  const box = (c: [number, number, number], s: [number, number, number], yaw = 0): BoxPiece => ({ c, s, yaw, pitch: 0, color: '#777777', collide: true });

  it('skinFit: a desk skin encloses its box within ART_PROUD; a loose or short skin fails; a quarter-turned box fits a quarter-turned skin', () => {
    const f = facilityCatalogue();
    // the office desk's hull 1.6 x 0.74+ x 0.8 over a 1.56 x 0.74 x 0.76 greybox desk
    const p: ArtPlacement = { cat: 'F', prop: 'officeDesk', x: 0, y: 0, z: 0, yaw: 0, section: 0, cls: 'skin', why: 't' };
    expect(skinFit(f, p, box([0, 0.37, 0], [1.56, 0.74, 0.76]))).toBeNull();
    // a loose skin (no overhang listed): the meeting table over a 2.0 m box stands 0.2 off each end
    expect(skinFit(CAMPUS_KIT, { ...p, cat: 'K', prop: 'meetingTable' }, box([0, 0.37, 0], [2.0, 0.74, 1.16]))).toMatch(/stands/);
    expect(skinFit(f, p, box([0, 0.37, 0], [1.8, 0.74, 0.76]))).toMatch(/enclose/);
    expect(skinFit(f, { ...p, yaw: Math.PI / 2 }, box([0, 0.37, 0], [1.56, 0.74, 0.76], Math.PI / 2))).toBeNull();
    expect(skinFit(f, { ...p, yaw: 0.3 }, box([0, 0.37, 0], [1.56, 0.74, 0.76]))).toMatch(/quarter/);
    // a fit piece scaled to a bigger box
    const t: ArtPlacement = { cat: 'K', prop: 'meetingTable', x: 0, y: 0, z: 0, yaw: 0, s: [1.1, 1, 1.1], section: 0, cls: 'skin', why: 't' };
    expect(skinFit(CAMPUS_KIT, t, box([0, 0.37, 0], [2.62, 0.74, 1.3]))).toBeNull();
    // a tree skin over a pillar (cylinder), and the car skin-hide over its 1.8 x 1.5 x 4.2 box (AS10)
    const tree: ArtPlacement = { cat: 'K', prop: 'treeSkin', x: 0, y: 0, z: 0, yaw: 0, section: 0, cls: 'skin', why: 't' };
    const cyl: CylPiece = { c: [0, 2.5, 0], r: 0.3, h: 5, color: '#4a3a2a', collide: true };
    expect(skinFit(CAMPUS_KIT, tree, cyl)).toBeNull();
    const car: ArtPlacement = { cat: 'K', prop: 'carSilver', x: 0, y: 0, z: 0, yaw: 0, section: 0, cls: 'skin-hide', why: 't' };
    expect(skinFit(CAMPUS_KIT, car, box([0, 0.75, 0], [1.8, 1.5, 4.2]))).toBeNull();
    // the box 0.8 longer than the car at each end: past AS10's 0.6
    expect(skinFit(CAMPUS_KIT, car, box([0, 0.75, 0], [1.8, 1.5, 5.8]))).toMatch(/outside the skin/);
    // a car wider than its box in the body band: fails
    expect(skinFit(CAMPUS_KIT, car, box([0, 0.75, 0], [1.6, 1.5, 4.2]))).toMatch(/body band/);
  });

  it('ruleV: free-standing bulk in the body band fails; flush, high, low, narrow and open pieces pass', () => {
    const v = (prop: string, y = 0): ArtPlacement => ({ cat: 'K', prop, x: 0, y, z: 0, yaw: 0, section: 0, cls: 'visual', why: 't' });
    expect(ruleV(CAMPUS_KIT, v('whiteboard'), 0, Infinity)).toMatch(/rule V/);
    expect(ruleV(CAMPUS_KIT, v('whiteboard'), 0, 0)).toBeNull();
    expect(ruleV(CAMPUS_KIT, v('whiteboard'), 0, 0.2)).toMatch(/rule V/);
    expect(ruleV(CAMPUS_KIT, v('waterCooler'), 0, Infinity)).toBeNull();
    expect(ruleV(CAMPUS_KIT, v('reeds'), 0, Infinity)).toBeNull();
    expect(ruleV(CAMPUS_KIT, v('ductRun', 2.6), 0, Infinity)).toBeNull();
    expect(ruleV(CAMPUS_KIT, v('ductRun', 1.0), 0, Infinity)).toMatch(/rule V/);
    expect(ruleV(CAMPUS_KIT, v('ceilingGrid', 1.0), 0, Infinity)).toBeNull();
    expect(ruleV(CAMPUS_KIT, v('wallCupboards'), 0, -1)).toBeNull();
    // other classes always pass rule V
    expect(ruleV(CAMPUS_KIT, { ...v('whiteboard'), cls: 'solid' }, 0, Infinity)).toBeNull();
  });

  it('writeArtBoxes: solid writes visible boxes (in the light shapes), see collision-only, skin and visual nothing; every box noLedge', () => {
    const b = new LevelBuilder();
    const cats = { K: CAMPUS_KIT, F: facilityCatalogue() };
    const ps: ArtPlacement[] = [
      { cat: 'K', prop: 'printerMfd', x: 0, y: 0, z: 0, yaw: 0, section: 0, cls: 'solid', why: 't' },
      { cat: 'K', prop: 'shelving', x: 3, y: 0, z: 0, yaw: Math.PI / 2, section: 0, cls: 'see', why: 't' },
      { cat: 'K', prop: 'whiteboard', x: 6, y: 0, z: 0, yaw: 0, section: 0, cls: 'visual', why: 't' },
      { cat: 'K', prop: 'meetingTable', x: 9, y: 0, z: 0, yaw: 0, section: 0, cls: 'skin', skinOf: 0, why: 't' },
      { cat: 'K', prop: 'lockerBank', x: 12, y: 0, z: 0, yaw: 0, section: 0, cls: 'solid', why: 't' },
    ];
    expect(writeArtBoxes(b, cats, ps)).toBe(3);
    expect(b.boxes[0]).toMatchObject({ collide: true, visible: true, noLedge: true });
    expect(b.boxes[1]).toMatchObject({ collide: true, visible: false, noLedge: true });
    expect(b.boxes[2]).toMatchObject({ collide: true, visible: true, noLedge: true });
    expect(canonicalLightShapes(b.boxes, b.cylinders, 'art-test', false).length).toBe(2);
    // (artpol, art-kit P7) every art box is marked, and the detail pass (drawn and baked alike) leaves it bare; a tall thin
    // wall-like box decorates only when it is not art
    for (const x of b.boxes) expect(x.art).toBe(true);
    const wall: BoxPiece = { c: [0, 1.4, 20], s: [4, 2.8, 0.2], yaw: 0, pitch: 0, color: '#808080', collide: true, visible: true };
    expect(detailPieces([wall], 'art-test', 'medium').length).toBeGreaterThan(0);
    expect(detailPieces([{ ...wall, art: true }], 'art-test', 'medium')).toEqual([]);
    expect(detailPieces(b.boxes, 'art-test', 'medium')).toEqual([]);
    // a scaled box: lo / hi times s
    const w = artBoxes(CAMPUS_KIT, { ...ps[0]!, prop: 'kitchenRun', s: [1.1, 1, 1] })!;
    expect(w[0]!.s[0]).toBeCloseTo((1.2 - 0.02) * 1.1, 6);
  });

  it('artCounts: one merged draw per (section, material) for static opaque, one per (catalogue, piece, material) for the rest', () => {
    const reports: Record<string, CatReport> = { K: report };
    const ps: ArtPlacement[] = [
      { cat: 'K', prop: 'printerMfd', x: 0, y: 0, z: 0, yaw: 0, section: 1, cls: 'solid', why: 't' },
      { cat: 'K', prop: 'printerMfd', x: 2, y: 0, z: 0, yaw: 0, section: 1, cls: 'solid', why: 't' },
      { cat: 'K', prop: 'vendingMachine', x: 4, y: 0, z: 0, yaw: 0, section: 1, cls: 'solid', why: 't' },
      { cat: 'K', prop: 'carBlue', x: 9, y: 0, z: 0, yaw: 0, section: 1, cls: 'skin-hide', skinOf: 0, why: 't' },
      { cat: 'K', prop: 'printerMfd', x: 0, y: 0, z: 9, yaw: 0, section: 2, cls: 'solid', why: 't' },
    ];
    const c = artCounts({ K: CAMPUS_KIT }, reports, ps, 1);
    const mats = new Set<string>();
    let inst = 0;
    for (const p of ['printerMfd', 'vendingMachine']) {
      for (const m of Object.keys(report.pieces[p]!.meshes)) {
        const look = CAMPUS_LOOK[m]!;
        if (look.emissive || look.alpha !== undefined) inst++;
        else mats.add(m);
      }
    }
    inst += Object.keys(report.pieces.carBlue!.meshes).length;
    expect(c.draws).toBe(mats.size + inst);
    expect(c.placements).toBe(4);
    expect(c.tris).toBe(report.pieces.printerMfd!.triangles * 2 + report.pieces.vendingMachine!.triangles + report.pieces.carBlue!.triangles);
  });
});
