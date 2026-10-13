/**
 * ON13: the Crawl space tool (Y > Build > Crawl space) and the ceiling voids view in the editor. A (a click) at one end,
 * A at the other draws a route on the editing level at the height of the ceiling void under it; A at the end of the
 * selected crawl goes on from there (one more leg). Ends take a ceiling hatch (a tile on a grid ceiling, an access hatch
 * elsewhere; added to the room's ceiling in the same edit) or an ON5 vent. The rules are src/editor/ceilings.ts (pure);
 * this file joins them to the editor: commits with words, the dot's ghost, the plan's marks and the voids legend.
 */
import { hyp2 } from '../core/mathx';
import { ceilingOf, CRAWL_END_REACH, CRAWL_RULE, crawlEnd, crawlHeights, crawlId, crawlWords, dragCrawl, extendCrawl, hatchesFor, moveCrawl, newCrawl, ruleColour, settleCrawl, voidOf } from './ceilings';
import type { CrawlRecord } from './ceilings';
import { fmt, snap } from './geometry';
import type { Change } from './model';
import type { Editor, PlanShape } from './main';
import type { Mark } from './scene3d';
import type { Elem, Pt } from './types';
import { keyOf } from './types';
import { ceilingType, crawlLength, hatchRect } from '../world/maps/kestrelCeilings';

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class CrawlTool {
  /** The crawl being extended (its record before the new leg), while a leg is drawn from its end. */
  from: CrawlRecord | null = null;
  /** Hub > View / tile menu View "Ceiling voids". */
  voids = false;

  constructor(private readonly ed: Editor) {}

  private get d(): Parameters<typeof crawlEnd>[0] & { crawls?: CrawlRecord[] } {
    return this.ed.model.data;
  }

  hint(): string {
    return 'Crawl space: A (click) at one end, A at the other; A at its end goes on; ends take a hatch or a vent';
  }

  /** The selected crawl on this level whose last point is within reach of (x, z), if any. */
  private extendable(x: number, z: number): CrawlRecord | null {
    const s = this.ed.selectedElem();
    if (s?.coll !== 'crawls') return null;
    const c = s.e as CrawlRecord;
    const last = c.path[c.path.length - 1];
    return c.level === this.ed.view.level && last && hyp2(last[0] - x, last[1] - z) <= CRAWL_END_REACH ? c : null;
  }

  private endWords(e: ReturnType<typeof crawlEnd>): string {
    return e.kind === 'vent' ? `vent ${e.ref}` : e.kind === 'hatch' ? `a hatch in ${e.ref} (x ${fmt(e.at[0])} z ${fmt(e.at[1])})` : 'an open end';
  }

  /** A (a click) with the tool: a new crawl starts at the dot, or the selected one goes on from its end. */
  down(x: number, z: number, sx: number, sy: number, source: '3d' | 'plan' | 'pad'): void {
    const ed = this.ed;
    const lv = ed.view.level;
    const og = ed.objectGrid;
    const p: Pt = [snap(x, og), snap(z, og)];
    const c0 = this.extendable(x, z);
    if (c0) {
      this.from = JSON.parse(JSON.stringify(c0)) as CrawlRecord;
      const last = c0.path[c0.path.length - 1]!;
      ed.model.preview('crawls', extendCrawl(c0) as unknown as Elem);
      ed.beginDrag('crawls', c0.id, null, last, ed.viewFloor(), sx, sy, source, true);
      return ed.status(`Crawl space ${c0.id} goes on from its end: A (click) at the next point`);
    }
    this.from = null;
    const c = newCrawl(this.d, crawlId(this.d), lv, p, p);
    ed.model.preview('crawls', c as unknown as Elem);
    ed.beginDrag('crawls', c.id, null, c.path[0]!, ed.viewFloor(), sx, sy, source, true);
    ed.status(`Crawl space from ${this.endWords(c.ends[0]!)}: A (click) at the other end`);
  }

  /** The crawl as the pointer moves: a leg being drawn follows it at its end; a placed crawl moves whole. */
  dragged(before: CrawlRecord, isNew: boolean, start: Pt, x: number, z: number, grid: number): Elem {
    if (isNew) return dragCrawl(this.d, before, [snap(x, grid), snap(z, grid)]) as unknown as Elem;
    return moveCrawl(before, snap(x - start[0], grid), snap(z - start[1], grid)) as unknown as Elem;
  }

  /** A cancelled leg of an extended crawl puts it back as it was (true when handled). */
  cancel(isNew: boolean): boolean {
    if (!isNew || !this.from) return false;
    this.ed.model.preview('crawls', this.from as unknown as Elem);
    this.from = null;
    return true;
  }

  /** The drop: the route settled (short legs merged, ends taken again), hatches added to their ceilings, one edit. */
  drop(id: string, isNew: boolean, before: CrawlRecord, after: CrawlRecord): void {
    const ed = this.ed;
    const was = isNew ? this.from : before;
    this.from = null;
    const s = settleCrawl(this.d, after, ed.objectGrid);
    if (!s) {
      if (was) ed.model.preview('crawls', was as unknown as Elem);
      else ed.model.drop('crawls', id);
      return ed.status('Too short - A (click) at one end, then at the other');
    }
    const changes: Change[] = [{ coll: 'crawls', id, before: was as unknown as Elem | null, after: s as unknown as Elem }];
    for (const h of hatchesFor(this.d, s)) changes.push({ coll: 'ceilings', id: h.room.id, before: ceilingOf(h.room) as Elem, after: h.after as Elem });
    const hatches = changes.length - 1;
    const verb = !was ? 'Added' : isNew ? 'Extended' : 'Moved';
    const text = `${verb} crawl space ${s.id}: ${fmt(crawlLength(s))} m, ${fmt(s.y1 - s.y0)} m clear${hatches ? `, ${hatches} hatch${hatches === 1 ? '' : 'es'} added` : ''}`;
    ed.commitText(text, changes);
    ed.select(keyOf('crawls', s.id));
    ed.status(isNew ? `${text}. A (click) at its end goes on; elsewhere starts another; B (Esc) puts the tool down` : text);
  }

  /** The dot's ghost and words with the tool. */
  ghost(x: number, z: number, f: number): { words: string; bad: boolean; key: string; marks: Mark[]; plan: PlanShape[] } {
    const lv = this.ed.view.level;
    const p: Pt = [snap(x, this.ed.objectGrid), snap(z, this.ed.objectGrid)];
    const c0 = this.extendable(x, z);
    const e = crawlEnd(this.d, lv, p);
    const h = crawlHeights(this.d, lv, e.at);
    const at = e.kind === 'open' ? p : e.at;
    const marks: Mark[] = [{ x: at[0], y: f + h.y0 + 0.05, z: at[1], sx: 0.6, sy: 0.1, sz: 0.6, dx: 1, dz: 0, look: 'ghost' }];
    const plan: PlanShape[] = [{ kind: 'ring', p: at }];
    const where = h.inVoid ? `in the void, ${fmt(h.y1 - h.y0)} m clear` : `on the floor, ${fmt(h.y1 - h.y0)} m clear (no ceiling void here)`;
    const words = c0 ? `A: crawl space ${c0.id} goes on from its end` : `A: a crawl space from ${this.endWords(e)}, ${where}`;
    return { words, bad: false, key: `cr|${at.join()}|${e.kind}|${c0?.id ?? ''}`, marks, plan };
  }

  /** The words under a selected ceiling or crawl (the card's foot and the side panel). */
  footWords(coll: 'ceilings' | 'crawls', e: Elem): string {
    return coll === 'crawls' ? crawlWords(this.d, e as unknown as CrawlRecord) : '';
  }

  /** The plan's marks on the editing level: crawl routes (their width, the rule's colour), ceiling hatches, voids when on. */
  planMarkup(toPlan: (x: number, z: number) => Pt, S: number): string {
    const lv = this.ed.view.level;
    const sel = this.ed.selected;
    let out = '';
    if (this.voids) {
      for (const r of this.ed.model.data.rooms) {
        if (r.level !== lv) continue;
        const v = voidOf(this.ed.model.data, ceilingOf(r));
        if (!v) continue;
        const a = toPlan(r.rect[0], r.rect[3]);
        out += `<rect class="voidMark" x="${a[0]}" y="${a[1]}" width="${(r.rect[2] - r.rect[0]) * S}" height="${(r.rect[3] - r.rect[1]) * S}" fill="${v.colour}" fill-opacity="0.18" stroke="${v.colour}" stroke-dasharray="6 3" pointer-events="none"/>`;
        out += `<text class="voidLabel" x="${a[0] + 4}" y="${a[1] + 14}" font-size="12" fill="${v.colour}" font-weight="bold" pointer-events="none">Void ${fmt(v.clear)} m</text>`;
      }
    }
    for (const r of this.ed.model.data.rooms) {
      if (r.level !== lv || !Array.isArray(r.hatches)) continue;
      const t = ceilingType(ceilingOf(r));
      for (const h of r.hatches) {
        const q = hatchRect(t, h);
        const a = toPlan(q[0], q[3]);
        out += `<rect class="hatchMark" x="${a[0]}" y="${a[1]}" width="${(q[2] - q[0]) * S}" height="${(q[3] - q[1]) * S}" fill="none" stroke="#3b3f45" stroke-width="2" pointer-events="none"/>`;
      }
    }
    for (const c of this.d.crawls ?? []) {
      if (c.level !== lv || c.path.length < 2) continue;
      const key = keyOf('crawls', c.id);
      const pts = c.path.map((p) => toPlan(p[0], p[1]).join(',')).join(' ');
      const hex = ruleColour(c.y1 - c.y0);
      out += `<polyline data-id="${key}" class="crawlMark" points="${pts}" fill="none" stroke="${hex}" stroke-opacity="0.45" stroke-width="${Math.max(4, c.width * S)}" stroke-linejoin="round"/>`;
      out += `<polyline points="${pts}" fill="none" stroke="${sel === key ? '#ff7300' : '#5c4a2e'}" stroke-width="${sel === key ? 3 : 1.5}" stroke-dasharray="6 3" pointer-events="none"/>`;
      const m = toPlan(c.path[0]![0], c.path[0]![1]);
      out += `<text class="crawlLabel" x="${m[0] + 8}" y="${m[1] - 8}" font-size="11" fill="#5c4a2e" pointer-events="none">${esc(`${c.id} ${fmt(c.y1 - c.y0)} m`)}</text>`;
    }
    return out;
  }

  /** The voids legend: each ceiling void on the editing level with its clear height and the rule. */
  legend(): string {
    const lv = this.ed.view.level;
    const rows: string[] = [];
    for (const r of this.ed.model.data.rooms) {
      if (r.level !== lv) continue;
      const v = voidOf(this.ed.model.data, ceilingOf(r));
      if (v) rows.push(`<div data-void="${esc(r.id)}"><i style="background:${v.colour}"></i>${esc(r.name || r.id)}: <b>${fmt(v.clear)} m</b> clear <span class="dim">${v.ok ? 'meets' : 'under'} the crawl rule</span></div>`);
    }
    return `<b>Ceiling voids</b>${rows.join('') || '<div class="dim">No ceiling voids on this level</div>'}<div class="dim">Green meets the ${fmt(CRAWL_RULE)} m crawl rule (F32), red does not</div>`;
  }
}
