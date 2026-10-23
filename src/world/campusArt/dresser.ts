/**
 * The campus section dresser API (sector-redesign ART-KIT step 5; pure, build time only). Each section's dress file
 * (`maps/campusS<N>Dress.ts`, `dressS<N>(d)`) drives one `CampusDresser` in this order (ART-PLAN 5.1): skins of greybox
 * objects (`skin`, `skinRow`, `skinCyl`; `skinHide` only where its brief says), hero placements (`add`, exact), then
 * `base()` last so the rule-based pass dresses round them. `dressCampus` then calls `write()` (the solid / see boxes into
 * the level builder) and collects `placements` for the renderer.
 *
 * The kit contract (art-check P8, artnext A4 / A9). Heroes are exact: `add`, `skin`, `skinRow`, `skinCyl`, `skinFace` throw
 * an `ArtRuleError` (its `rule`: 'K1'..'K13', 'C' cover, 'V' rule V, 'S' the skin rule, 'W' no wall, 'B' an overlap, 'FIT'
 * a scale outside the piece's fit range) on a keepout, skin-rule or overlap failure, so a brief's hero is never dropped
 * silently. A hero with fallback spots uses `tryAdd` (the first spot that passes, or -1, each refusal logged with its rule
 * in `refusals` and counted in `report.dropped`); a section that may lose a hero lists it in an explicit omitted list its
 * test asserts, never a bare `try / catch` round `add`. A programming error (an unknown piece, a box that does not exist)
 * throws a plain `Error`, also from `tryAdd`. `base()` drops and counts (`report.dropped`).
 */
import type { LevelBuilder } from '../levelBuilder';
import type { BoxPiece } from '../levelBuilder';
import { ART_PROUD, boxSlice, FACE_TURNS, fitRange, pieceHull, quarterTurns, skinFit, writeArtBoxes, writesBoxes, type ArtPlacement, type CatalogueSet, type PropCatalogue } from './catalogue';
import { blocked, buildKeepouts, checkDressing, decalPiece, frameDoor, overlapsGreybox, placementMount, shapesOf, type DressContext, type Keepouts } from './keepouts';
import { rectsOverlap } from './geometry';
import { newReport, planRoom, type DressReport } from './dressRules';
import { isOutdoor } from './artTags';
import { roomAt } from '../rooms';

const snap = (v: number, step = 0.05): number => Math.round(v / step) * step;
const snapYaw = (yaw: number): number => {
  const q = Math.PI / 2;
  const t = (((Math.round(yaw / q) * q) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(t - 2 * Math.PI) < 1e-9 ? 0 : t;
};

/** (artnext A4) A kit rule failure: `rule` the failing rule's id ('K1'..'K13', 'C', 'V', 'S', 'W', 'B', 'FIT'), `msg` the
 *  rule's own text (`blocked`'s answer, the skin rule's, the fit range's); `message` adds the section, piece and spot. */
export class ArtRuleError extends Error {
  readonly rule: string;
  readonly msg: string;
  constructor(rule: string, msg: string, message?: string) {
    super(message ?? msg);
    this.name = 'ArtRuleError';
    this.rule = rule;
    this.msg = msg;
  }
}

/** The rule id of a keepout answer ('K1: ...' -> 'K1'). */
export const ruleOf = (e: string): string => {
  const i = e.indexOf(':');
  return i > 0 ? e.slice(0, i) : e;
};

/** (artnext A4) One `tryAdd` spot: the placement's origin and yaw. */
export interface ArtSpot {
  x: number;
  y: number;
  z: number;
  yaw: number;
}
/** (artnext A4) One refused `tryAdd` spot. */
export interface ArtRefusal {
  piece: string;
  /** Index into the spots given. */
  spot: number;
  rule: string;
  msg: string;
}
/** (artnext A2) A greybox box face: n +z, e +x, s -z, w -x. */
export type BoxFace = 'n' | 'e' | 's' | 'w';
/** `add` / `tryAdd` options. */
export interface AddOpts {
  cls: ArtPlacement['cls'];
  why: string;
  s?: [number, number, number];
  group?: number;
  tint?: [number, number, number];
  free?: boolean;
}
/** (artnext A2) `skinFace` options. */
export interface FaceOpts {
  why: string;
  group?: number;
  tint?: [number, number, number];
  /** Module origin over the box's bottom (m; wall pieces are modelled at their mount height over the floor). Not with `fitY`. */
  dy?: number;
  /** Module centres along the face (world x for n / s, world z for e / w), one unscaled module each; else the face is tiled. */
  at?: readonly number[];
  /** The tiled span along the face (world, as `at`); default the whole face. */
  from?: number;
  to?: number;
  /** A fit piece's height stretched to the box's (within its fit range). */
  fitY?: boolean;
}

export class CampusDresser {
  readonly placements: ArtPlacement[] = [];
  readonly report: DressReport = newReport();
  /** (artnext A4) Every spot `tryAdd` refused, with its rule. */
  readonly refusals: ArtRefusal[] = [];
  /** The greybox box count when the dresser was made (boxes past it are the dressing's own). */
  private readonly n0: number;
  private k: Keepouts | null = null;

  constructor(
    private readonly b: LevelBuilder,
    readonly ctx: DressContext,
    readonly cats: CatalogueSet,
  ) {
    this.n0 = b.boxes.length;
  }

  /** The section's keepouts (built on first use: a section with nothing to dress never pays for the camera rays). */
  get keepouts(): Keepouts {
    this.k ??= buildKeepouts(this.ctx);
    return this.k;
  }

  private piece(piece: string): { cat: PropCatalogue; prop: string } {
    const i = piece.indexOf(':');
    const cat = this.cats[piece.slice(0, i)];
    const prop = piece.slice(i + 1);
    if (!cat || !cat.ids.includes(prop)) throw new Error(`campus art S${this.ctx.section + 1}: unknown piece ${piece}`);
    return { cat, prop };
  }

  private push(p: ArtPlacement, piece: string): number {
    this.placements.push(p);
    this.report.placed[piece] = (this.report.placed[piece] ?? 0) + 1;
    return this.placements.length - 1;
  }

  /** The rule-based pass for every tagged room of the section (in `ctx.rooms` order). */
  base(): this {
    const tagged = this.ctx.rooms.filter((r) => this.ctx.tags[r.id] !== undefined);
    if (!tagged.length) return this;
    for (const r of tagged) planRoom(this.ctx, this.keepouts, this.cats, r.id, this.placements, this.report);
    return this;
  }

  /**
   * One exact placement ('K:whiteboard', 'H2:atriumModel'); throws an `ArtRuleError` when a keepout fails (`blocked`), or
   * when it overlaps a greybox box (a floor piece) or another placement's box ('B'), as `checkDressing` reads it. `free`
   * keeps the yaw as given. A floor decal (`decalPiece`) snaps y to 1 mm, everything else to 1 cm.
   */
  add(piece: string, x: number, y: number, z: number, yaw: number, o: AddOpts): number {
    const { cat, prop } = this.piece(piece);
    if (o.s) this.checkScale(cat, prop, o.s);
    const p: ArtPlacement = { cat: cat.id, prop, x: snap(x), y: snap(y, 0.01), z: snap(z), yaw: o.free ? yaw : snapYaw(yaw), section: this.ctx.section, cls: o.cls, why: o.why };
    if (o.s) p.s = o.s;
    if (o.group !== undefined) p.group = o.group;
    if (o.tint) p.tint = o.tint;
    if (decalPiece(cat, p)) p.y = snap(y, 0.001);
    const e = this.refusal(cat, p);
    if (e) throw new ArtRuleError(ruleOf(e), e, `campus art S${this.ctx.section + 1}: ${piece} at (${x}, ${y}, ${z}): ${e}`);
    return this.push(p, piece);
  }

  /**
   * (artnext A4) A hero with fallback spots: the first spot `add` accepts (its index), else -1. Each refused spot is
   * logged in `refusals` with its rule and counted in `report.dropped`. A programming error still throws.
   */
  tryAdd(piece: string, spots: readonly ArtSpot[], o: AddOpts): number {
    for (let i = 0; i < spots.length; i++) {
      const c = spots[i]!;
      try {
        return this.add(piece, c.x, c.y, c.z, c.yaw, o);
      } catch (e) {
        if (!(e instanceof ArtRuleError)) throw e;
        this.refusals.push({ piece, spot: i, rule: e.rule, msg: e.msg });
        const dr = (this.report.dropped[piece] ??= {});
        dr[e.rule] = (dr[e.rule] ?? 0) + 1;
      }
    }
    return -1;
  }

  /** What `checkDressing` would say of one more placement (null: it passes): `blocked`, then the greybox overlap (floor
   *  pieces; decals and door frames are exempt) and the overlap with this section's placements' boxes. */
  private refusal(cat: PropCatalogue, p: ArtPlacement): string | null {
    const k = this.keepouts;
    const m = placementMount(k, this.ctx, cat, p);
    const e = blocked(k, this.ctx, cat, p, m);
    if (e) return e;
    if (p.cls === 'skin' || p.cls === 'skin-hide') return null;
    if ((m === 'floor-wall' || m === 'floor-free') && !frameDoor(this.ctx, cat, p)) {
      const g = overlapsGreybox(k, this.ctx.boxes, cat, p);
      if (g >= 0) return `B: ${p.prop} overlaps greybox box ${g}`;
    }
    if (writesBoxes(p)) {
      const mine = shapesOf(cat, p).filter((s) => s.box);
      for (let j = 0; j < this.placements.length; j++) {
        const q = this.placements[j]!;
        const qc = this.cats[q.cat];
        if (!qc || !writesBoxes(q)) continue;
        for (const a of shapesOf(qc, q)) {
          if (!a.box) continue;
          for (const b of mine) if (a.y0 + 0.01 < b.y1 && b.y0 < a.y1 - 0.01 && rectsOverlap(a.plan, b.plan, 0.01)) return `B: ${p.prop} boxes overlap #${j} ${q.prop}`;
        }
      }
    }
    return null;
  }

  private checkScale(cat: PropCatalogue, prop: string, s: readonly number[]): void {
    const off = s.some((v) => Math.abs(v - 1) > 1e-6);
    if (off && !cat.fit.includes(prop)) throw new ArtRuleError('FIT', `campus art: ${cat.id}:${prop} is not a fit piece (no scale)`);
    const r = fitRange(cat, prop);
    for (const v of s) if (v < r.min - 1e-6 || v > r.max + 1e-6) throw new ArtRuleError('FIT', `campus art: ${cat.id}:${prop} scale ${v.toFixed(3)} outside ${r.min}-${r.max}`);
  }

  /** The fit scale and placement that skin `box` with `prop` at `yaw` (hull bottom on the box bottom, plan centres matched). */
  private fitTo(cat: PropCatalogue, prop: string, box: BoxPiece, yaw: number, allowY: boolean): { s: [number, number, number]; x: number; y: number; z: number } {
    const h = pieceHull(cat, prop);
    const rel = quarterTurns(box.yaw - yaw);
    if (rel < 0 || quarterTurns(yaw) < 0) throw new ArtRuleError('S', `campus art: ${cat.id}:${prop} skin yaw is not square to the box`);
    // the box's size along the piece's local x / z
    const bx = rel === 1 || rel === 3 ? box.s[2] : box.s[0];
    const bz = rel === 1 || rel === 3 ? box.s[0] : box.s[2];
    const by = box.s[1];
    const allow = Math.max(ART_PROUD, cat.overhang[prop]?.by ?? 0);
    const fit = cat.fit.includes(prop);
    const axis = (hull: number, want: number, ok: boolean): number => {
      if (hull >= want - 1e-3 && hull - want <= allow + 1e-3) return 1;
      if (!fit || !ok) return 1;
      return (want + 0.02) / hull;
    };
    const s: [number, number, number] = [axis(h.hi[0] - h.lo[0], bx, true), axis(h.hi[1] - h.lo[1], by, allowY), axis(h.hi[2] - h.lo[2], bz, true)];
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const lx = ((h.lo[0] + h.hi[0]) / 2) * s[0];
    const lz = ((h.lo[2] + h.hi[2]) / 2) * s[2];
    return { s, x: box.c[0] - (lx * cosY + lz * sinY), y: box.c[1] - by / 2 - h.lo[1] * s[1], z: box.c[2] - (-lx * sinY + lz * cosY) };
  }

  private skinOf(piece: string, boxIndex: number, yaw: number, cls: 'skin' | 'skin-hide', why: string, dy = 0, group?: number): number {
    const { cat, prop } = this.piece(piece);
    const box = this.ctx.boxes[boxIndex];
    if (!box) throw new Error(`campus art: ${piece} skins box ${boxIndex}, which does not exist`);
    const y0 = snapYaw(yaw);
    const f = this.fitTo(cat, prop, box, y0, true);
    this.checkScale(cat, prop, f.s);
    const p: ArtPlacement = { cat: cat.id, prop, x: f.x, y: f.y + dy, z: f.z, yaw: y0, section: this.ctx.section, cls, skinOf: boxIndex, why };
    if (f.s.some((v) => Math.abs(v - 1) > 1e-6)) p.s = f.s;
    if (group !== undefined) p.group = group;
    const e = skinFit(cat, p, box);
    if (e) throw new ArtRuleError('S', e, `campus art S${this.ctx.section + 1}: ${piece} on box ${boxIndex}: ${e}`);
    return this.push(p, piece);
  }

  /** A skin over greybox box `boxIndex` (fit scale from the box; throws on a skinFit failure). `group`: the emissive
   *  parts' light circuit (art-join: the dressers' S1 L5 / S4 / S5 kit gap; optional, as `add`'s). */
  skin(piece: string, boxIndex: number, yaw: number, o: { why: string; dy?: number; group?: number }): number {
    return this.skinOf(piece, boxIndex, yaw, 'skin', o.why, o.dy ?? 0, o.group);
  }

  /** A box-hidden skin (ART-PLAN AS10: the cars, the S5 van; or a hero brief line): the renderer hides the box's instance. */
  skinHide(piece: string, boxIndex: number, yaw: number, o: { why: string; group?: number }): number {
    return this.skinOf(piece, boxIndex, yaw, 'skin-hide', o.why, 0, o.group);
  }

  /** A skin over greybox cylinder `cylIndex` (trunks, posts): scaled by the cylinder over the piece's `cylFit`. */
  skinCyl(piece: string, cylIndex: number, o: { why: string; group?: number }): number {
    const { cat, prop } = this.piece(piece);
    const c = this.ctx.cylinders?.[cylIndex];
    if (!c) throw new Error(`campus art: ${piece} skins cylinder ${cylIndex}, which does not exist (no cylinders in the context?)`);
    const base = cat.cylFit?.[prop];
    const s: [number, number, number] = base ? [c.r / base.r, c.h / base.h, c.r / base.r] : [1, 1, 1];
    this.checkScale(cat, prop, s);
    const p: ArtPlacement = { cat: cat.id, prop, x: c.c[0], y: c.c[1] - c.h / 2, z: c.c[2], yaw: 0, section: this.ctx.section, cls: 'skin', skinCyl: cylIndex, why: o.why };
    if (s.some((v) => Math.abs(v - 1) > 1e-6)) p.s = s;
    if (o.group !== undefined) p.group = o.group;
    const e = skinFit(cat, p, c);
    if (e) throw new ArtRuleError('S', e, `campus art S${this.ctx.section + 1}: ${piece} on cylinder ${cylIndex}: ${e}`);
    return this.push(p, piece);
  }

  /**
   * Tiles a long greybox box with modules at the piece's pitch (racks, lockers, kitchen runs): `alongX` the box's long
   * axis is world x (else z), the modules' fronts face `faceSign` along the other axis. A fit piece stretches its modules
   * to the box (0.8-1.25, or its own `fitRange`); each module must skin its slice of the box. `group` goes on every module
   * (art-join S4 / S5 gap, artnext A5). Returns the placement indices.
   */
  skinRow(piece: string, boxIndex: number, alongX: boolean, faceSign: 1 | -1, o: { why: string; group?: number }): number[] {
    const { cat, prop } = this.piece(piece);
    const box = this.ctx.boxes[boxIndex];
    if (!box) throw new Error(`campus art: ${piece} skins box ${boxIndex}, which does not exist`);
    // yaw: the module's local x along the row, its local z (front) towards faceSign on the cross axis
    const yaw = alongX ? (faceSign > 0 ? 0 : Math.PI) : faceSign > 0 ? Math.PI / 2 : (3 * Math.PI) / 2;
    const q = quarterTurns(box.yaw);
    const len = alongX === (q === 0 || q === 2) ? box.s[0] : box.s[2];
    const pitch = cat.pitch[prop] ?? 1;
    const n = Math.max(1, Math.round(len / pitch));
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const proto: ArtPlacement = { cat: cat.id, prop, x: 0, y: 0, z: 0, yaw, section: this.ctx.section, cls: 'skin', skinOf: boxIndex, why: o.why };
      const slice = boxSlice(box, proto, i, n);
      const f = this.fitTo(cat, prop, slice, yaw, true);
      this.checkScale(cat, prop, f.s);
      const p: ArtPlacement = { ...proto, x: f.x, y: f.y, z: f.z, skinPart: [i, n] };
      if (f.s.some((v) => Math.abs(v - 1) > 1e-6)) p.s = f.s;
      if (o.group !== undefined) p.group = o.group;
      const e = skinFit(cat, p, slice);
      if (e) throw new ArtRuleError('S', e, `campus art S${this.ctx.section + 1}: ${piece} row module ${i}/${n} on box ${boxIndex}: ${e}`);
      out.push(this.push(p, piece));
    }
    return out;
  }

  /**
   * (artnext A2) Panels over one face of greybox box `boxIndex` (n +z, e +x, s -z, w -x: the box must be square and
   * unpitched): each module's back towards the box, its front at most `ART_PROUD` off the face (a deeper piece sinks into
   * the box, never through it), within the face. `o.at` places one unscaled module per centre; else the face (or
   * `from`..`to` along it) is tiled at the piece's pitch, a fit piece stretched along the face to its slot. Placements are
   * `skin` (no box: the greybox face stays the collision, light and sight) with `skinOf` and `skinFace`, held to the skin
   * rule (`skinFit`) and the wall-mounted visual keepouts (`blocked`: K3 door edges, K4, K7, K12, K8, K9-K11). All or
   * none: throws an `ArtRuleError` on the first module that fails. Returns the placement indices.
   */
  skinFace(piece: string, boxIndex: number, face: BoxFace, o: FaceOpts): number[] {
    const { cat, prop } = this.piece(piece);
    const box = this.ctx.boxes[boxIndex];
    if (!box) throw new Error(`campus art: ${piece} skins box ${boxIndex}, which does not exist`);
    const where = `campus art S${this.ctx.section + 1}: ${piece} on face ${face} of box ${boxIndex}`;
    const qb = quarterTurns(box.yaw);
    if (qb < 0 || Math.abs(box.pitch) > 1e-3) throw new ArtRuleError('S', `${prop}: the box is not square or is pitched`, `${where}: the box is not square or is pitched`);
    const wx = (qb === 1 || qb === 3 ? box.s[2] : box.s[0]) / 2;
    const wz = (qb === 1 || qb === 3 ? box.s[0] : box.s[2]) / 2;
    const alongX = face === 'n' || face === 's';
    const sign = face === 'n' || face === 'e' ? 1 : -1;
    // the face's outward normal and its plane's offset along it; the along axis' world range
    const nx = alongX ? 0 : sign;
    const nz = alongX ? sign : 0;
    const plane = alongX ? box.c[2] + sign * wz : box.c[0] + sign * wx;
    const lo = alongX ? box.c[0] - wx : box.c[2] - wz;
    const hi = alongX ? box.c[0] + wx : box.c[2] + wz;
    const yaw = (FACE_TURNS[face] * Math.PI) / 2;
    const h = pieceHull(cat, prop);
    const hx = h.hi[0] - h.lo[0];
    const depth = h.hi[2] - h.lo[2];
    const fit = cat.fit.includes(prop);
    const bottom = box.c[1] - box.s[1] / 2;
    let sy = 1;
    if (o.fitY) {
      const hh = h.hi[1] - h.lo[1];
      if (!fit) throw new ArtRuleError('FIT', `campus art: ${cat.id}:${prop} is not a fit piece (no scale)`);
      if (Math.abs(hh - box.s[1]) > 1e-3) sy = box.s[1] / hh;
    }
    const y = o.fitY ? bottom - h.lo[1] * sy : bottom + (o.dy ?? 0);
    // the slots: a centre and the module's x scale each
    const slots: [number, number][] = [];
    if (o.at) for (const c of o.at) slots.push([c, 1]);
    else {
      const from = Math.max(lo, o.from ?? lo);
      const to = Math.min(hi, o.to ?? hi);
      const len = to - from;
      if (len <= 1e-3) throw new ArtRuleError('S', `${prop}: the span is off face ${face}`, `${where}: the span ${from.toFixed(2)}..${to.toFixed(2)} is off the face`);
      const pitch = cat.pitch[prop] ?? hx;
      const n = Math.max(1, Math.round(len / pitch));
      const part = len / n;
      const sx = fit && Math.abs(hx - part) > 1e-3 ? part / hx : 1;
      if (hx * sx > part + 1e-3) throw new ArtRuleError('S', `${prop}: a ${hx.toFixed(2)} m module is wider than its ${part.toFixed(2)} m slot`, `${where}: a ${hx.toFixed(2)} m module is wider than its ${part.toFixed(2)} m slot (not a fit piece)`);
      for (let i = 0; i < n; i++) slots.push([from + part * (i + 0.5), sx]);
    }
    const proud = Math.min(depth, ART_PROUD);
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const k = this.keepouts;
    const made: ArtPlacement[] = [];
    slots.forEach(([c, sx], i) => {
      const s: [number, number, number] = [sx, sy, 1];
      if (sx !== 1 || sy !== 1) this.checkScale(cat, prop, s);
      // the hull's front-centre (local ((lo + hi) / 2 * sx, hi z)) on the face point, ART_PROUD (or its depth) out
      const tx = alongX ? c : plane + nx * proud;
      const tz = alongX ? plane + nz * proud : c;
      const lx = ((h.lo[0] + h.hi[0]) / 2) * sx;
      const lz = h.hi[2];
      const p: ArtPlacement = { cat: cat.id, prop, x: tx - (lx * cs + lz * sn), y, z: tz - (-lx * sn + lz * cs), yaw, section: this.ctx.section, cls: 'skin', skinOf: boxIndex, skinFace: face, why: o.why };
      if (sx !== 1 || sy !== 1) p.s = s;
      if (o.group !== undefined) p.group = o.group;
      if (o.tint) p.tint = o.tint;
      const e = blocked(k, this.ctx, cat, p, 'wall');
      if (e) throw new ArtRuleError(ruleOf(e), e, `${where}, module ${i}/${slots.length} at ${c.toFixed(2)}: ${e}`);
      made.push(p);
    });
    return made.map((p) => this.push(p, piece));
  }

  /** Writes the solid / see placements' boxes into the level builder (`writeArtBoxes`; every box noLedge, ART-KIT L15). */
  write(): this {
    this.report.boxes += writeArtBoxes(this.b, this.cats, this.placements);
    this.markIndoor();
    return this;
  }

  /** (perfa, render-only cull hint) Marks every placement inside a room with an indoor tag `indoor` (on its storey: the
   *  placement's y less 0.1, so a ceiling piece at the ceiling's underside counts in the room below it). Outdoor rooms,
   *  untagged rooms and no room leave it unset. Gameplay never reads it. */
  markIndoor(): this {
    const rooms = this.ctx.rooms;
    for (const p of this.placements) {
      const i = roomAt(rooms, p.x, p.z, p.y - 0.1);
      const t = i >= 0 ? this.ctx.tags[rooms[i]!.id] : undefined;
      if (t !== undefined && t !== 'none' && !isOutdoor(t)) p.indoor = true;
    }
    return this;
  }

  /** Every violation of this dresser's placements against the greybox (`checkDressing`). */
  check(): string[] {
    return checkDressing({ ...this.ctx, boxes: this.ctx.boxes.slice(0, this.n0) }, this.cats, this.placements);
  }
}
