/**
 * The rule-based base dressing by room tag (sector-redesign ART-KIT step 4, ART-PLAN 4.2; pure, deterministic, build
 * time only). `DRESS_RULES` is the plan's table, one list of `RuleItem`s per tag; `DOOR_EXTRAS` the pieces every room gets
 * at its doors. `planRoom` dresses one tagged room: per rule in table order it generates candidates in a fixed order (wall
 * runs in `wallRuns` order, modules from each run's start at the piece's pitch; a 0.5 m floor grid from the room's min
 * corner, row-major; a ceiling grid at the rule's spacing, centred), snaps them (5 cm along a run, yaw to 90 degrees) and
 * accepts one when no keepout fails (`blocked`), it overlaps no greybox box and no accepted piece (touching is fine:
 * rows), and the rule's per / max / minArea counts allow. Everything else is dropped and counted (`DressReport.dropped`),
 * never forced. No `Math.random`: a multi-variant rule picks `fnv(roomId + index) % n`.
 */
import { hyp2 } from '../../core/mathx';
import { roomAt } from '../rooms';
import type { BoxPiece } from '../levelBuilder';
import type { ArtTag } from './artTags';
import { isOutdoor } from './artTags';
import { artToWorld, pieceHull, type ArtPlacement, type CatalogueSet, type PropCatalogue } from './catalogue';
import { ceilingAt, floorAt, pointSegDist, rectsOverlap, runLen, wallRuns, type PlanRect, type WallRun } from './geometry';
import { blocked, decalPiece, doorLine, overlapsGreybox, placementMount, shapesOf, standsOn, type DressContext, type Keepouts, type Mount } from './keepouts';

export interface RuleItem {
  /** Catalogue and piece: 'K:whiteboard', 'F:filingCabinet'. */
  piece: `${PropCatalogue['id']}:${string}`;
  mount: Mount;
  /** Metres of free wall run (wall / floor-wall), m2 of free floor (floor-free / ceiling; a corridor's ceiling: metres along it). */
  per?: number;
  max?: number;
  minArea?: number;
  /** Modules per row. */
  row?: number;
  /** Mount height: wall / floor-wall the piece origin over the floor; ceiling the drop from the ceiling. */
  y?: number;
  /** Radiators: one under each window. */
  under?: 'window';
  /** Wall cupboards over each placed kitchen run. */
  over?: string;
  cls: ArtPlacement['cls'];
  // (ART-KIT L9) the table's qualifiers as data
  /** Other variants of the piece (`fnv(roomId + index)` picks one). */
  alt?: readonly `${PropCatalogue['id']}:${string}`[];
  /** At most one row per wall run, and only on runs this long (m). */
  perRun?: number;
  /** Only on walls without a window. */
  noWindow?: boolean;
  /** Ceiling tiling: every whole tile that fits. */
  tile?: boolean;
  /** Floor-free: within this of a wall run (roof cowls over a riser, within 2 m of a bulkhead wall). */
  nearWall?: number;
  /** Ceiling: only where the piece's bottom is at least this over the floor. */
  minHigh?: number;
  /** Only in a room over a chimney stack (`DressContext.chimneys`). */
  chimney?: boolean;
}

const one = { max: 1 } as const;
const smoke1: RuleItem = { piece: 'K:smokeDetector', mount: 'ceiling', cls: 'visual', ...one };
const smokeArea: RuleItem = { piece: 'K:smokeDetector', mount: 'ceiling', cls: 'visual', per: 50 };
const grid: RuleItem = { piece: 'K:ceilingGrid', mount: 'ceiling', cls: 'visual', tile: true };
const diffuser: RuleItem = { piece: 'K:ceilingDiffuser', mount: 'ceiling', cls: 'visual', per: 13 };
const radPanel: RuleItem = { piece: 'K:radiatorPanel', mount: 'wall', cls: 'visual', under: 'window' };
const radCast: RuleItem = { piece: 'K:radiatorCast', mount: 'wall', cls: 'visual', under: 'window' };
const notice1: RuleItem = { piece: 'K:noticeBoard', mount: 'wall', cls: 'visual', ...one };
const clock1: RuleItem = { piece: 'K:wallClock', mount: 'wall', cls: 'visual', ...one };
const exting1: RuleItem = { piece: 'K:fireExtinguisher', mount: 'wall', cls: 'visual', ...one };
const heroOnly: readonly RuleItem[] = [smokeArea];

/** The ART-PLAN 4.2 table (order inside a tag: the table's columns left to right; an `over` rule after the run it hangs over). */
export const DRESS_RULES: Readonly<Record<ArtTag, readonly RuleItem[]>> = {
  'office-open': [
    { piece: 'K:whiteboard', mount: 'wall', cls: 'visual', per: 14, max: 2 },
    { piece: 'K:noticeBoard', mount: 'wall', cls: 'visual', per: 18 },
    clock1,
    radPanel,
    grid,
    diffuser,
    smokeArea,
    { piece: 'F:filingCabinet', mount: 'floor-wall', cls: 'solid', per: 12, max: 4, row: 2 },
    { piece: 'K:printerMfd', mount: 'floor-wall', cls: 'solid', minArea: 60, max: 1 },
    { piece: 'K:recyclingBins', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:waterCooler', mount: 'floor-free', cls: 'visual', minArea: 80, max: 1 },
  ],
  'office-cell': [
    { piece: 'K:whiteboard', mount: 'wall', cls: 'visual', ...one },
    clock1,
    radPanel,
    grid,
    diffuser,
    smoke1,
    { piece: 'F:filingCabinet', mount: 'floor-wall', cls: 'solid', max: 1, row: 2 },
    { piece: 'K:bookcase', mount: 'floor-wall', cls: 'solid', minArea: 25, max: 1 },
  ],
  kitchen: [
    notice1,
    clock1,
    grid,
    smoke1,
    { piece: 'K:fridge', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:recyclingBins', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:wallCupboards', mount: 'wall', cls: 'visual', over: 'kitchenRun' },
  ],
  reception: [smokeArea, { piece: 'K:plantPot', mount: 'floor-free', cls: 'see', per: 60, max: 4 }],
  atrium: [smokeArea, { piece: 'K:plantPot', mount: 'floor-free', cls: 'see', per: 60, max: 4 }],
  lobby: [
    notice1,
    exting1,
    diffuser,
    smoke1,
    { piece: 'K:vendingMachine', mount: 'floor-wall', cls: 'solid', minArea: 30, max: 1 },
    { piece: 'K:recyclingBins', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:plantPot', mount: 'floor-free', cls: 'see', minArea: 30, max: 1 },
  ],
  corridor: [
    { piece: 'K:noticeBoard', mount: 'wall', cls: 'visual', per: 20 },
    { piece: 'K:fireExtinguisher', mount: 'wall', cls: 'visual', per: 25 },
    { piece: 'K:ceilingDiffuser', mount: 'ceiling', cls: 'visual', per: 6 },
    { piece: 'K:smokeDetector', mount: 'ceiling', cls: 'visual', per: 10 },
  ],
  mailroom: [
    notice1,
    smoke1,
    { piece: 'K:lockerBank', mount: 'floor-wall', cls: 'solid', row: 4, max: 1 },
    { piece: 'K:shelving', mount: 'floor-wall', cls: 'see', row: 3, max: 1 },
  ],
  store: [smoke1, { piece: 'K:shelving', mount: 'floor-wall', cls: 'see', row: 8, perRun: 0 }, { piece: 'F:palletLoadLow', mount: 'floor-free', cls: 'solid', minArea: 30, max: 1 }],
  plant: [
    { piece: 'F:pipeRun', mount: 'wall', cls: 'visual', row: 99, perRun: 4, y: 2.6 },
    { piece: 'F:driveCabinet', mount: 'wall', cls: 'visual', ...one },
    { piece: 'F:glandPlate', mount: 'wall', cls: 'visual', ...one },
    { piece: 'K:ductRun', mount: 'ceiling', cls: 'visual', row: 99, max: 1 },
    { piece: 'F:switchgearPanel', mount: 'floor-wall', cls: 'solid', row: 4, max: 1 },
    { piece: 'F:coolingUnit', mount: 'floor-wall', cls: 'solid', minArea: 40, max: 1 },
    { piece: 'F:cableDrum', mount: 'floor-free', cls: 'solid', minArea: 40, max: 1 },
  ],
  security: [notice1, clock1, smoke1, { piece: 'K:ceilingDiffuser', mount: 'ceiling', cls: 'visual', ...one }, { piece: 'K:lockerBank', mount: 'floor-wall', cls: 'solid', row: 2, max: 1 }],
  'oh-control': [notice1, clock1, smoke1, { piece: 'K:ceilingDiffuser', mount: 'ceiling', cls: 'visual', ...one }, { piece: 'K:lockerBank', mount: 'floor-wall', cls: 'solid', row: 2, max: 1 }],
  gatehouse: heroOnly,
  'lab-hall': heroOnly,
  'lab-clean': heroOnly,
  'lab-gown': heroOnly,
  'lab-store': heroOnly,
  'data-hall': heroOnly,
  cage: heroOnly,
  noc: heroOnly,
  mantrap: heroOnly,
  'oh-ante': heroOnly,
  strongroom: heroOnly,
  dock: [
    notice1,
    exting1,
    { piece: 'K:ductRun', mount: 'ceiling', cls: 'visual', row: 99, max: 1, minHigh: 4.0 },
    { piece: 'K:lockerBank', mount: 'floor-wall', cls: 'solid', row: 2, max: 1 },
    { piece: 'F:palletLoad', alt: ['F:palletLoadLow'], mount: 'floor-free', cls: 'solid', per: 40, max: 3 },
  ],
  ups: [{ piece: 'F:glandPlate', mount: 'wall', cls: 'visual', per: 6 }, { piece: 'K:ductRun', mount: 'ceiling', cls: 'visual', ...one }],
  battery: [exting1, smoke1],
  // (ART-KIT L10) "cableTray vertical run 1 (flush)": the facility tray is horizontal only (yaw placements): left out
  riser: [{ piece: 'F:glandPlate', mount: 'wall', cls: 'visual', max: 2 }],
  'oh-formal': [
    { piece: 'K:portraitFrame', mount: 'wall', cls: 'visual', per: 6, max: 4 },
    radCast,
    { piece: 'K:bookcase', mount: 'floor-wall', cls: 'solid', row: 3, perRun: 3, noWindow: true },
    { piece: 'K:sideboard', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:fireplace', mount: 'floor-wall', cls: 'solid', max: 1, chimney: true },
    { piece: 'K:wingChair', mount: 'floor-free', cls: 'see', row: 2, minArea: 40, max: 1 },
  ],
  'oh-hall': [
    { piece: 'K:portraitFrame', mount: 'wall', cls: 'visual', per: 6, max: 6 },
    radCast,
    { piece: 'K:longcaseClock', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:sideboard', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:plantPot', mount: 'floor-free', cls: 'see', ...one },
  ],
  'oh-corridor': [{ piece: 'K:portraitFrame', mount: 'wall', cls: 'visual', per: 8 }, radCast],
  'oh-service': [notice1, radCast, { piece: 'K:lockerBank', mount: 'floor-wall', cls: 'solid', ...one }],
  'oh-kitchen': [
    notice1,
    { piece: 'K:kitchenRun', mount: 'floor-wall', cls: 'solid', row: 6, max: 1 },
    { piece: 'K:stoveRange', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:fridge', mount: 'floor-wall', cls: 'solid', ...one },
    { piece: 'K:wallCupboards', mount: 'wall', cls: 'visual', over: 'kitchenRun' },
  ],
  'oh-archive': [
    { piece: 'K:shelving', mount: 'floor-wall', cls: 'see', row: 6, perRun: 0 },
    { piece: 'F:filingCabinet', mount: 'floor-wall', cls: 'solid', row: 6, perRun: 0 },
  ],
  'ext-carpark': [{ piece: 'K:litterBin', mount: 'floor-free', cls: 'see', per: 400, max: 3 }],
  'ext-forecourt': [{ piece: 'K:litterBin', mount: 'floor-wall', cls: 'see', ...one }],
  'ext-shelter': [
    { piece: 'K:litterBin', mount: 'floor-wall', cls: 'see', ...one },
    { piece: 'K:parkBench', mount: 'floor-wall', cls: 'see', ...one },
  ],
  'ext-service': [{ piece: 'K:wheelieBin', mount: 'floor-wall', cls: 'solid', row: 3, max: 1 }],
  'ext-verge': [{ piece: 'K:reeds', mount: 'floor-free', cls: 'visual', per: 30, max: 6 }],
  'ext-jetty': [{ piece: 'K:reeds', mount: 'floor-free', cls: 'visual', per: 30, max: 6 }],
  'ext-garden': [],
  'ext-road': [],
  'ext-terrace': [],
  'ext-compound': [],
  roof: [
    { piece: 'K:acCondenser', mount: 'floor-free', cls: 'solid', per: 60, max: 4 },
    { piece: 'K:roofCowl', mount: 'floor-free', cls: 'see', per: 80, nearWall: 2 },
  ],
  'roof-plant': [{ piece: 'K:ductRun', mount: 'floor-free', cls: 'visual', row: 2, max: 1, y: 0.6 }],
  none: [],
};

/** Every room's door pieces (ART-PLAN 4.2 last paragraph): an exit sign over each door whose far side is a corridor,
 *  stair or outside; a fire extinguisher by the first door (latch side); a sign plate at 2.2 over each door. */
export const DOOR_EXTRAS: readonly RuleItem[] = [
  { piece: 'K:exitSign', mount: 'wall', cls: 'visual' },
  { piece: 'K:fireExtinguisher', mount: 'wall', cls: 'visual', max: 1 },
  { piece: 'F:signPlate', mount: 'wall', cls: 'visual', y: 2.2 },
];

export interface DressReport {
  /** Placements by piece ('K:whiteboard'). */
  placed: Record<string, number>;
  /** Dropped candidates by piece, then by the failing rule ('K1'..'K13', 'V', 'S', 'B' overlap, 'sky' no ceiling, ...). */
  dropped: Record<string, Record<string, number>>;
  /** Boxes written (`CampusDresser.write`). */
  boxes: number;
}

export const newReport = (): DressReport => ({ placed: {}, dropped: {}, boxes: 0 });

/** FNV-1a (32 bit) of a string. */
export function fnv(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const snap = (v: number, step = 0.05): number => Math.round(v / step) * step;
const yawOf = (nx: number, nz: number): number => {
  const y = Math.atan2(nx, nz);
  return Math.abs(y) < 1e-9 ? 0 : y < 0 ? y + 2 * Math.PI : y;
};

function drop(rep: DressReport, piece: string, why: string): void {
  const id = why.split(':')[0]!;
  const d = (rep.dropped[piece] ??= {});
  d[id] = (d[id] ?? 0) + 1;
}

interface Local {
  plan: PlanRect;
  y0: number;
  y1: number;
}

/**
 * Dresses one tagged room of `ctx` by its tag's rules and the door extras: accepted placements are appended to `out`
 * (which may already hold the room's hero placements: they block the base pass like accepted pieces), counted in `rep`.
 */
export function planRoom(ctx: DressContext, k: Keepouts, cats: CatalogueSet, roomId: string, out: ArtPlacement[], rep: DressReport): void {
  const room = ctx.rooms.find((r) => r.id === roomId);
  const tag = ctx.tags[roomId];
  if (!room || !tag) return;
  const rules = DRESS_RULES[tag];
  const cx = (room.minX + room.maxX) / 2;
  const cz = (room.minZ + room.maxZ) / 2;
  // (artpol, load time) the boxes over a plan point from the keepouts' grid (the greybox) plus any box written since,
  // in place of a scan of every box: the same floor and ceiling answers (max / min over the boxes over the point)
  const nearPt: BoxPiece[] = [];
  const boxesAt = (x: number, z: number, greyOnly: boolean): readonly BoxPiece[] => {
    nearPt.length = 0;
    for (const i of k.grid.query(x - 0.01, z - 0.01, x + 0.01, z + 0.01)) nearPt.push(ctx.boxes[i]!);
    if (!greyOnly) for (let i = k.nBoxes; i < ctx.boxes.length; i++) nearPt.push(ctx.boxes[i]!);
    return nearPt;
  };
  const fa = floorAt(boxesAt(cx, cz, false), cx, cz, (room.minY ?? 0) + 0.1);
  const floorY = Number.isFinite(fa) ? fa : (room.minY ?? 0);
  const w = room.maxX - room.minX;
  const d = room.maxZ - room.minZ;
  const area = w * d;
  const runs = wallRuns(ctx.boxes.slice(0, k.nBoxes), room, floorY);
  const inRoom = (x: number, z: number, m = 0): boolean => x >= room.minX - m && x <= room.maxX + m && z >= room.minZ - m && z <= room.maxZ + m;
  // the pieces already in the room (heroes, earlier rules) block later candidates
  const local: Local[] = [];
  const addLocal = (cat: PropCatalogue, p: ArtPlacement): void => {
    if (cat.open?.includes(p.prop)) return;
    for (const s of shapesOf(cat, p)) local.push({ plan: s.plan, y0: s.y0, y1: s.y1 });
  };
  for (const p of out) {
    const cat = cats[p.cat];
    if (cat && inRoom(p.x, p.z) && p.y >= floorY - 0.5 && p.y <= floorY + 4) addLocal(cat, p);
  }
  const catOf = (piece: string): { cat: PropCatalogue; prop: string } | null => {
    const [c, prop] = piece.split(':') as [string, string];
    const cat = cats[c];
    return cat && cat.ids.includes(prop) ? { cat, prop } : null;
  };
  let index = 0;
  /** Tries one placement: keepouts, greybox overlap, local overlap. Null: accepted (and recorded). */
  const tryPlace = (piece: string, cat: PropCatalogue, p: ArtPlacement, ruleMount: Mount, commit = true): string | null => {
    // the keepouts by where the piece really is (as `checkDressing` reads it), the rule's mount for the wall check
    const mount = placementMount(k, ctx, cat, p);
    if (ruleMount === 'wall' && mount === 'ceiling') return 'W: no wall behind it';
    if ((ruleMount === 'floor-wall' || ruleMount === 'floor-free') && !standsOn(k, ctx.boxes, cat, p)) return 'F: not on the floor';
    const e = blocked(k, ctx, cat, p, mount);
    if (e) return e;
    if (mount !== 'ceiling' && overlapsGreybox(k, ctx.boxes, cat, p) >= 0) return 'B: greybox';
    if (!cat.open?.includes(p.prop)) {
      for (const s of shapesOf(cat, p)) {
        for (const l of local) if (s.y0 < l.y1 - 0.01 && l.y0 < s.y1 - 0.01 && rectsOverlap(s.plan, l.plan, 0.01)) return 'B: another piece';
      }
    }
    if (commit) {
      out.push(p);
      addLocal(cat, p);
      rep.placed[piece] = (rep.placed[piece] ?? 0) + 1;
    }
    return null;
  };
  const make = (cat: PropCatalogue, prop: string, x: number, y: number, z: number, yaw: number, cls: ArtPlacement['cls'], why: string): ArtPlacement => {
    const p: ArtPlacement = { cat: cat.id, prop, x, y: snap(y, 0.01), z, yaw, section: ctx.section, cls, why };
    // (artnext A6) a floor decal keeps its floor's height to 1 mm
    if (decalPiece(cat, p)) p.y = snap(y, 0.001);
    return p;
  };
  /** A wall-backed placement on a run at `t` m along it (the piece's back on the face; centred pieces stand off by their back depth). */
  const onRun = (cat: PropCatalogue, prop: string, r: WallRun, t: number, y: number, cls: ArtPlacement['cls'], why: string): ArtPlacement => {
    const len = runLen(r);
    const ux = (r.x1 - r.x0) / len;
    const uz = (r.z1 - r.z0) / len;
    const back = -(cat.footprint[prop]?.[1] ?? 0);
    let x = r.x0 + ux * t + r.nx * back;
    let z = r.z0 + uz * t + r.nz * back;
    if (Math.abs(ux) > 0.5) x = snap(x);
    else z = snap(z);
    return make(cat, prop, x, y, z, yawOf(r.nx, r.nz), cls, why);
  };
  const width = (cat: PropCatalogue, prop: string): number => {
    const f = cat.footprint[prop];
    return f ? f[2] - f[0] : 1;
  };
  const windowsIn = ctx.windows.filter((wd) => inRoom(wd.c.x, wd.c.z, 0.6) && wd.sillHeight >= floorY - 0.2 && wd.sillHeight <= floorY + 2.5);
  const runHasWindow = (r: WallRun): boolean => windowsIn.some((wd) => pointSegDist(wd.c.x, wd.c.z, r.x0, r.z0, r.x1, r.z1) < 0.5);
  /** The run collinear with a plan point (within 0.4 of its line, its normal towards the room). */
  const runAt = (x: number, z: number): { r: WallRun; t: number } | null => {
    let best: { r: WallRun; t: number } | null = null;
    let bd = 0.4;
    for (const r of runs) {
      const len = runLen(r);
      const ux = (r.x1 - r.x0) / len;
      const uz = (r.z1 - r.z0) / len;
      const t = (x - r.x0) * ux + (z - r.z0) * uz;
      const off = Math.abs((x - r.x0) * r.nx + (z - r.z0) * r.nz);
      if (off < bd && t > -2 && t < len + 2) {
        bd = off;
        best = { r, t };
      }
    }
    return best;
  };
  const why = (rule: RuleItem): string => `base ${tag}: ${rule.piece} (${rule.mount})`;

  for (const rule of rules) {
    if (rule.minArea !== undefined && area < rule.minArea) continue;
    if (rule.chimney && !(ctx.chimneys ?? []).some(([x, z]) => inRoom(x, z, 0.5))) continue;
    const variants = [rule.piece, ...(rule.alt ?? [])];
    const pick = (): { cat: PropCatalogue; prop: string; piece: string } | null => {
      const piece = variants[fnv(roomId + index) % variants.length]!;
      index++;
      const c = catOf(piece);
      return c ? { ...c, piece } : null;
    };
    const base = catOf(rule.piece);
    if (!base) continue;
    const hull = pieceHull(base.cat, base.prop);
    const pitch = base.cat.pitch[base.prop] ?? width(base.cat, base.prop);
    let placed = 0;
    if (rule.over) {
      // over every placed run of `over` in the room, one module each, its back on the run's back
      for (const q of out.slice()) {
        if (q.prop !== rule.over || !inRoom(q.x, q.z) || Math.abs(q.y - floorY) > 0.3) continue;
        const f = cats[q.cat]?.footprint[q.prop];
        const [bx, , bz] = artToWorld(q, 0, 0, f ? f[1] : 0);
        const p = make(base.cat, base.prop, bx, floorY, bz, q.yaw, rule.cls, why(rule));
        const e = tryPlace(rule.piece, base.cat, p, 'wall');
        if (e) drop(rep, rule.piece, e);
      }
      continue;
    }
    if (rule.under === 'window') {
      for (const wd of windowsIn) {
        const ra = runAt(wd.c.x, wd.c.z);
        if (!ra) {
          drop(rep, rule.piece, 'nowall');
          continue;
        }
        const p = onRun(base.cat, base.prop, ra.r, ra.t, floorY + (rule.y ?? 0), rule.cls, why(rule));
        const e = tryPlace(rule.piece, base.cat, p, 'wall');
        if (e) drop(rep, rule.piece, e);
      }
      continue;
    }
    if (rule.mount === 'wall' || rule.mount === 'floor-wall') {
      const free = runs.filter((r) => !r.glass && !(rule.noWindow && runHasWindow(r)));
      const total = free.reduce((s, r) => s + runLen(r), 0);
      const allowed = Math.min(rule.max ?? Infinity, rule.perRun !== undefined ? Infinity : rule.per ? Math.max(1, Math.floor(total / rule.per + 0.5)) : (rule.max ?? 1));
      const spread = rule.per ? rule.per / 2 : 0;
      const accepted: [number, number][] = [];
      const n = rule.row ?? 1;
      for (const r of free) {
        if (placed >= allowed) break;
        const len = runLen(r);
        if (rule.perRun !== undefined && len < rule.perRun) continue;
        let onThis = 0;
        for (let t0 = 0; t0 + pitch <= len + 1e-6 && placed < allowed; t0 += pitch) {
          if (rule.perRun !== undefined && onThis) break;
          const c0 = onRun(base.cat, base.prop, r, t0 + pitch / 2, floorY, rule.cls, '');
          if (spread && accepted.some(([x, z]) => hyp2(x - c0.x, z - c0.z) < spread)) continue;
          // a row: the longest prefix of passing modules (at least min(row, 2) for short rows), whole modules only
          const row: ArtPlacement[] = [];
          for (let m = 0; m < n && t0 + (m + 1) * pitch <= len + 1e-6; m++) {
            const pc = pick();
            if (!pc) break;
            const p = onRun(pc.cat, pc.prop, r, t0 + (m + 0.5) * pitch, floorY + (rule.y ?? 0), rule.cls, why(rule));
            const e = tryPlace(pc.piece, pc.cat, p, rule.mount, false);
            if (e) {
              drop(rep, pc.piece, e);
              break;
            }
            // later modules of the row must not overlap earlier ones (touching is fine)
            row.push(p);
            for (const s of shapesOf(pc.cat, p)) local.push({ plan: s.plan, y0: s.y0, y1: s.y1 });
          }
          // undo the provisional locals, then commit the row if it is long enough
          local.splice(local.length - row.reduce((s, p) => s + shapesOf(cats[p.cat]!, p).length, 0));
          if (row.length && row.length >= Math.min(n, 2)) {
            for (const p of row) {
              out.push(p);
              addLocal(cats[p.cat]!, p);
              const key = `${p.cat}:${p.prop}`;
              rep.placed[key] = (rep.placed[key] ?? 0) + 1;
            }
            accepted.push([c0.x, c0.z]);
            placed++;
            onThis++;
            t0 += (row.length - 1) * pitch;
          }
        }
      }
      continue;
    }
    if (rule.mount === 'ceiling') {
      const corridor = Math.min(w, d) < 3.0;
      const pts: [number, number][] = [];
      if (rule.tile) {
        const tw = width(base.cat, base.prop);
        const nx = Math.floor(w / tw + 1e-6);
        const nz = Math.floor(d / tw + 1e-6);
        for (let i = 0; i < nz; i++) for (let j = 0; j < nx; j++) pts.push([room.minX + (w - nx * tw) / 2 + (j + 0.5) * tw, room.minZ + (d - nz * tw) / 2 + (i + 0.5) * tw]);
      } else if (rule.row) {
        // a row along the room's long axis, on its centre line
        const alongX = w >= d;
        const len = alongX ? w : d;
        const m = Math.floor((len - 0.6) / pitch + 1e-6);
        for (let i = 0; i < m; i++) {
          const t = (alongX ? room.minX : room.minZ) + (len - m * pitch) / 2 + (i + 0.5) * pitch;
          pts.push(alongX ? [t, cz] : [cx, t]);
        }
      } else if (corridor && rule.per) {
        const alongX = w >= d;
        const len = alongX ? w : d;
        const m = Math.max(1, Math.floor(len / rule.per + 1e-6));
        for (let i = 0; i < m; i++) {
          const t = (alongX ? room.minX : room.minZ) + (len / m) * (i + 0.5);
          pts.push(alongX ? [t, cz] : [cx, t]);
        }
      } else {
        const sp = rule.per ? Math.sqrt(rule.per) : Math.max(w, d);
        const nx = Math.max(1, Math.floor(w / sp + 1e-6));
        const nz = Math.max(1, Math.floor(d / sp + 1e-6));
        for (let i = 0; i < nz; i++) for (let j = 0; j < nx; j++) pts.push([room.minX + (w / nx) * (j + 0.5), room.minZ + (d / nz) * (i + 0.5)]);
      }
      const allowed = rule.tile || rule.row || (corridor && rule.per) ? Infinity : Math.min(rule.max ?? Infinity, rule.per ? Math.max(1, Math.floor(area / rule.per + 0.5)) : (rule.max ?? 1));
      const yaw = rule.row && w < d ? Math.PI / 2 : 0;
      for (const [x0, z0] of pts) {
        if (placed >= allowed) break;
        const x = snap(x0);
        const z = snap(z0);
        const cy = ceilingAt(boxesAt(x, z, true), x, z, floorY);
        if (!Number.isFinite(cy)) {
          drop(rep, rule.piece, 'sky');
          continue;
        }
        const y = cy - (rule.y ?? 0) - hull.hi[1];
        const bottom = y + hull.lo[1];
        const under = floorAt(boxesAt(x, z, false), x, z, cy - 0.5);
        if (bottom < floorY + Math.max(2.4, rule.minHigh ?? 0) - 1e-6 || bottom < under + 1.9 - 1e-6) {
          drop(rep, rule.piece, 'low');
          continue;
        }
        const p = make(base.cat, base.prop, x, y, z, yaw, rule.cls, why(rule));
        const e = tryPlace(rule.piece, base.cat, p, 'ceiling');
        if (e) drop(rep, rule.piece, e);
        else if (!rule.row) placed++;
      }
      continue;
    }
    // floor-free: a 0.5 m grid from the room's min corner, row-major
    const allowed = Math.min(rule.max ?? Infinity, rule.per ? Math.max(1, Math.floor(area / rule.per + 0.5)) : (rule.max ?? 1));
    const spread = rule.per ? Math.sqrt(rule.per) / 2 : 2;
    const accepted: [number, number][] = [];
    const n = rule.row ?? 1;
    for (let z0 = room.minZ + 0.5; z0 <= room.maxZ - 0.5 + 1e-6 && placed < allowed; z0 += 0.5) {
      for (let x0 = room.minX + 0.5; x0 <= room.maxX - 0.5 + 1e-6 && placed < allowed; x0 += 0.5) {
        if (accepted.some(([x, z]) => hyp2(x - x0, z - z0) < spread)) continue;
        if (rule.nearWall !== undefined && !runs.some((r) => pointSegDist(x0, z0, r.x0, r.z0, r.x1, r.z1) <= rule.nearWall!)) continue;
        const row: { p: ArtPlacement; cat: PropCatalogue; piece: string }[] = [];
        for (let m = 0; m < n; m++) {
          const pc = pick();
          if (!pc) break;
          const off = (m - (n - 1) / 2) * pitch;
          const p = make(pc.cat, pc.prop, snap(x0 + off), floorY + (rule.y ?? 0), snap(z0), 0, rule.cls, why(rule));
          if (!inRoom(p.x, p.z)) break;
          const e = tryPlace(pc.piece, pc.cat, p, 'floor-free', false);
          if (e) {
            drop(rep, pc.piece, e);
            break;
          }
          row.push({ p, cat: pc.cat, piece: pc.piece });
        }
        if (row.length === n) {
          for (const q of row) {
            out.push(q.p);
            addLocal(q.cat, q.p);
            rep.placed[q.piece] = (rep.placed[q.piece] ?? 0) + 1;
          }
          accepted.push([x0, z0]);
          placed++;
        }
      }
    }
  }
  doorExtras(ctx, k, cats, room, floorY, runAt, onRun, tryPlace, rep, tag);
}

/** The door pieces of one room (`DOOR_EXTRAS`). */
function doorExtras(
  ctx: DressContext,
  k: Keepouts,
  cats: CatalogueSet,
  room: DressContext['rooms'][number],
  floorY: number,
  runAt: (x: number, z: number) => { r: WallRun; t: number } | null,
  onRun: (cat: PropCatalogue, prop: string, r: WallRun, t: number, y: number, cls: ArtPlacement['cls'], why: string) => ArtPlacement,
  tryPlace: (piece: string, cat: PropCatalogue, p: ArtPlacement, mount: Mount) => string | null,
  rep: DressReport,
  tag: ArtTag,
): void {
  void k;
  const exit = cats.K;
  const sign = cats.F;
  if (!exit || !sign) return;
  let extinguished = false;
  for (const dr of ctx.doors) {
    if (Math.abs(dr.hinge.y - floorY) > 0.4) continue;
    const l = doorLine(dr);
    if (l.cx < room.minX - 0.5 || l.cx > room.maxX + 0.5 || l.cz < room.minZ - 0.5 || l.cz > room.maxZ + 0.5) continue;
    // which side is this room, and what is on the far side
    const inside = (x: number, z: number): boolean => x >= room.minX && x <= room.maxX && z >= room.minZ && z <= room.maxZ;
    const s = inside(l.cx + l.nx * 0.8, l.cz + l.nz * 0.8) ? 1 : inside(l.cx - l.nx * 0.8, l.cz - l.nz * 0.8) ? -1 : 0;
    if (!s) continue;
    const fi = roomAt(ctx.rooms, l.cx - l.nx * s * 1.2, l.cz - l.nz * s * 1.2, dr.hinge.y);
    const farTag = fi >= 0 ? ctx.tags[ctx.rooms[fi]!.id] : undefined;
    const ra = runAt(l.cx, l.cz);
    if (!ra) {
      drop(rep, 'F:signPlate', 'nowall');
      continue;
    }
    const why = `base ${tag}: door ${dr.id}`;
    // the sign plate at 2.2, the exit sign over it
    const sp = onRun(sign, 'signPlate', ra.r, ra.t, floorY + 2.2, 'visual', `${why} sign plate`);
    let e = tryPlace('F:signPlate', sign, sp, 'wall');
    if (e) drop(rep, 'F:signPlate', e);
    if (fi < 0 || farTag === 'corridor' || farTag === 'oh-corridor' || farTag === 'none' || isOutdoor(farTag)) {
      const top = floorY + 2.2 + (pieceHull(sign, 'signPlate').hi[1] ?? 0.3) + 0.05;
      const ex = onRun(exit, 'exitSign', ra.r, ra.t, top, 'visual', `${why} exit sign`);
      e = tryPlace('K:exitSign', exit, ex, 'wall');
      if (e) drop(rep, 'K:exitSign', e);
    }
    if (!extinguished) {
      // by the latch (the end away from the hinge), clear of K3's 0.6
      const latchSide = Math.sign((l.bx - l.ax) * (ra.r.x1 - ra.r.x0) + (l.bz - l.az) * (ra.r.z1 - ra.r.z0)) || 1;
      const t = ra.t + latchSide * (dr.width / 2 + 0.75);
      const fx = onRun(exit, 'fireExtinguisher', ra.r, t, floorY, 'visual', `${why} fire extinguisher`);
      e = tryPlace('K:fireExtinguisher', exit, fx, 'wall');
      if (e) drop(rep, 'K:fireExtinguisher', e);
      else extinguished = true;
    }
  }
}
