/**
 * The campus section dresser API (sector-redesign ART-KIT step 5; pure, build time only). Each section's dress file
 * (`maps/campusS<N>Dress.ts`, `dressS<N>(d)`) drives one `CampusDresser` in this order (ART-PLAN 5.1): skins of greybox
 * objects (`skin`, `skinRow`, `skinCyl`; `skinHide` only where its brief says), hero placements (`add`, exact), then
 * `base()` last so the rule-based pass dresses round them. `dressCampus` then calls `write()` (the solid / see boxes into
 * the level builder) and collects `placements` for the renderer.
 *
 * Heroes are exact: `add`, `skin*` throw on a keepout or skin-rule failure (a brief error to report, never dropped
 * silently); `base()` drops and counts (`report.dropped`).
 */
import type { LevelBuilder } from '../levelBuilder';
import type { BoxPiece } from '../levelBuilder';
import { FIT_MAX, FIT_MIN, ART_PROUD, boxSlice, pieceHull, quarterTurns, skinFit, writeArtBoxes, type ArtPlacement, type CatalogueSet, type PropCatalogue } from './catalogue';
import { blocked, buildKeepouts, checkDressing, placementMount, type DressContext, type Keepouts } from './keepouts';
import { newReport, planRoom, type DressReport } from './dressRules';

const snap = (v: number, step = 0.05): number => Math.round(v / step) * step;
const snapYaw = (yaw: number): number => {
  const q = Math.PI / 2;
  const t = (((Math.round(yaw / q) * q) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.abs(t - 2 * Math.PI) < 1e-9 ? 0 : t;
};

export class CampusDresser {
  readonly placements: ArtPlacement[] = [];
  readonly report: DressReport = newReport();
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

  /** One exact placement ('K:whiteboard', 'H2:atriumModel'); throws when a keepout fails. `free` keeps the yaw as given. */
  add(piece: string, x: number, y: number, z: number, yaw: number, o: { cls: ArtPlacement['cls']; why: string; s?: [number, number, number]; group?: number; tint?: [number, number, number]; free?: boolean }): number {
    const { cat, prop } = this.piece(piece);
    if (o.s) this.checkScale(cat, prop, o.s);
    const p: ArtPlacement = { cat: cat.id, prop, x: snap(x), y: snap(y, 0.01), z: snap(z), yaw: o.free ? yaw : snapYaw(yaw), section: this.ctx.section, cls: o.cls, why: o.why };
    if (o.s) p.s = o.s;
    if (o.group !== undefined) p.group = o.group;
    if (o.tint) p.tint = o.tint;
    const e = blocked(this.keepouts, this.ctx, cat, p, placementMount(this.keepouts, this.ctx, cat, p));
    if (e) throw new Error(`campus art S${this.ctx.section + 1}: ${piece} at (${x}, ${y}, ${z}): ${e}`);
    return this.push(p, piece);
  }

  private checkScale(cat: PropCatalogue, prop: string, s: readonly number[]): void {
    const off = s.some((v) => Math.abs(v - 1) > 1e-6);
    if (off && !cat.fit.includes(prop)) throw new Error(`campus art: ${cat.id}:${prop} is not a fit piece (no scale)`);
    for (const v of s) if (v < FIT_MIN - 1e-6 || v > FIT_MAX + 1e-6) throw new Error(`campus art: ${cat.id}:${prop} scale ${v.toFixed(3)} outside ${FIT_MIN}-${FIT_MAX}`);
  }

  /** The fit scale and placement that skin `box` with `prop` at `yaw` (hull bottom on the box bottom, plan centres matched). */
  private fitTo(cat: PropCatalogue, prop: string, box: BoxPiece, yaw: number, allowY: boolean): { s: [number, number, number]; x: number; y: number; z: number } {
    const h = pieceHull(cat, prop);
    const rel = quarterTurns(box.yaw - yaw);
    if (rel < 0 || quarterTurns(yaw) < 0) throw new Error(`campus art: ${cat.id}:${prop} skin yaw is not square to the box`);
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
    if (e) throw new Error(`campus art S${this.ctx.section + 1}: ${piece} on box ${boxIndex}: ${e}`);
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
    if (e) throw new Error(`campus art S${this.ctx.section + 1}: ${piece} on cylinder ${cylIndex}: ${e}`);
    return this.push(p, piece);
  }

  /**
   * Tiles a long greybox box with modules at the piece's pitch (racks, lockers, kitchen runs): `alongX` the box's long
   * axis is world x (else z), the modules' fronts face `faceSign` along the other axis. A fit piece stretches its modules
   * to the box (0.8-1.25); each module must skin its slice of the box. Returns the placement indices.
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
      if (e) throw new Error(`campus art S${this.ctx.section + 1}: ${piece} row module ${i}/${n} on box ${boxIndex}: ${e}`);
      out.push(this.push(p, piece));
    }
    return out;
  }

  /** Writes the solid / see placements' boxes into the level builder (`writeArtBoxes`; every box noLedge, ART-KIT L15). */
  write(): this {
    this.report.boxes += writeArtBoxes(this.b, this.cats, this.placements);
    return this;
  }

  /** Every violation of this dresser's placements against the greybox (`checkDressing`). */
  check(): string[] {
    return checkDressing({ ...this.ctx, boxes: this.ctx.boxes.slice(0, this.n0) }, this.cats, this.placements);
  }
}
