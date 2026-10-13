/**
 * ON14: mirror, align, evenly space and Array in the editor (the Selected tab), and auto name plates. The rules are
 * src/editor/arrange.ts and signs.ts (pure); this file joins them to the editor: one commit each with its words, the
 * Arrange tool's two modes (a mirror line picked with A, A; an Array set by the dot with the count on the D-pad) and
 * their ghosts. Nothing here is saved but the edits.
 */
import { alignChanges, arrayChanges, arrayGhost, arrayStep, distributeChanges, lineMirror, mirrorChanges, mirrorGhost, unitsOf } from './arrange';
import type { AlignMode, ArrangeResult, Axis } from './arrange';
import { fmt, snap } from './geometry';
import type { Editor, PlanShape } from './main';
import type { Mark } from './scene3d';
import type { Key, Pt, Rect, Room } from './types';
import { parseKey } from './types';
import { autoPlates } from './signs';
import { buildingAt } from './visibility';
import { SIGN_F } from './signCatalogue';

export type ArrangeMode = 'mirror' | 'array';

export class ArrangeTool {
  mode: ArrangeMode = 'mirror';
  /** The mirror line's first point (A), until the second. */
  first: Pt | null = null;
  /** Array: the number of copies (D-pad left / right, arrow keys). */
  count = 2;
  /** Align: to the first picked instead of the outermost. */
  alignFirst = false;
  /** The selection the tool works on (kept while the tool is on). */
  private keys: Key[] = [];
  private cache: { key: string; g: ReturnType<ArrangeTool['ghost']> } | null = null;

  constructor(private readonly ed: Editor) {}

  /** The selection now: the set, or the one selected thing. */
  selection(): Key[] {
    const ed = this.ed;
    return ed.group.length ? ed.group.slice() : ed.selected ? [ed.selected] : [];
  }

  private commit(r: ArrangeResult): boolean {
    if (r.why) {
      this.ed.status(r.why);
      return false;
    }
    if (!r.changes.length) {
      this.ed.status('Nothing changed');
      return false;
    }
    this.ed.commitText(r.words, r.changes);
    this.ed.renderPanel();
    return true;
  }

  /** Mirror about its own centre (one undo step). */
  mirror(axis: Axis): void {
    this.commit(mirrorChanges(this.ed.model.data, this.selection(), axis));
  }

  align(mode: AlignMode): void {
    this.commit(alignChanges(this.ed.model.data, this.selection(), mode, this.alignFirst, this.ed.objectGrid));
  }

  distribute(axis: Axis): void {
    this.commit(distributeChanges(this.ed.model.data, this.selection(), axis, this.ed.objectGrid));
  }

  /** Decision 9: plates on every door of the selected room's level, or its building (every level). */
  plates(scope: 'level' | 'building'): void {
    const ed = this.ed;
    const s = ed.selectedElem();
    const r = s?.coll === 'rooms' ? (s.e as Room) : null;
    const level = r?.level ?? ed.view.level;
    const building = r ? (r.building ?? buildingAt(ed.model.data.meta.buildings, (r.rect[0] + r.rect[2]) / 2, (r.rect[1] + r.rect[3]) / 2)) : 'site';
    const res = autoPlates(ed.model.data, scope === 'level' ? { level } : { building });
    const where = scope === 'level' ? `level ${ed.model.data.levels.find((l) => l.id === level)?.name ?? level}` : `building ${building}`;
    if (!res.added) return ed.status(`No door on ${where} needs a plate (${res.had} have one${res.none ? `, ${res.none} name no room` : ''})`);
    ed.commitText(`Name plates on ${res.added} door${res.added === 1 ? '' : 's'} of ${where}${res.had ? ` (${res.had} kept theirs)` : ''}`, res.changes);
    ed.renderPanel();
  }

  /** Starts the Arrange tool in a mode (Mirror about a line, Array) for the selection. */
  start(mode: ArrangeMode): void {
    const keys = this.selection();
    if (!unitsOf(this.ed.model.data, keys).length) return this.ed.status('Select something to arrange first');
    this.keys = keys;
    this.mode = mode;
    this.first = null;
    this.ed.setTool('arrange');
  }

  hint(): string {
    if (this.mode === 'array') return `Array: the dot sets the direction and spacing (0.1 m steps); D-pad left / right (arrow keys) the count (${this.count}); A (click) makes the copies; B (Esc) stops`;
    return this.first ? 'Mirror about a line: A (click) at a second point on the line' : 'Mirror about a line: A (click) at a point on the line, then A at a second point; B (Esc) stops';
  }

  barWords(): string {
    return this.mode === 'array' ? `Array, ${this.count} cop${this.count === 1 ? 'y' : 'ies'}` : 'Mirror about a line';
  }

  stepCount(dir: 1 | -1): void {
    this.count = Math.max(1, Math.min(SIGN_F.arrayMax.value, this.count + dir));
    this.ed.status(`Array: ${this.count} cop${this.count === 1 ? 'y' : 'ies'}`);
  }

  /** A (a click) with the tool. */
  down(x: number, z: number): void {
    const ed = this.ed;
    const p: Pt = [snap(x, ed.objectGrid), snap(z, ed.objectGrid)];
    if (this.mode === 'mirror') {
      if (!this.first) {
        this.first = p;
        return ed.status(`Mirror line from x ${fmt(p[0])}, z ${fmt(p[1])}: A (click) at a second point`);
      }
      const l = lineMirror(this.first, p);
      this.first = null;
      if (this.commit(mirrorChanges(ed.model.data, this.keys, l.axis, l.about))) this.done();
      return;
    }
    const st = arrayStep(ed.model.data, this.keys, [x, z], ed.objectGrid);
    if (this.commit(arrayChanges(ed.model.data, this.keys, st.axis, st.step, this.count))) this.done();
  }

  /** Back to Select with the same selection. */
  private done(): void {
    const keys = this.keys.filter((k) => {
      const q = parseKey(k);
      return !!q && !!this.ed.model.get(q.coll, q.id);
    });
    this.ed.setTool('select');
    if (keys.length > 1) this.ed.setGroup(keys);
  }

  /** The dot's ghost: the mirrored or copied outlines, and the words. */
  ghost(x: number, z: number, f: number): { words: string; bad: boolean; key: string; marks: Mark[]; plan: PlanShape[] } {
    const d = this.ed.model.data;
    const og = this.ed.objectGrid;
    const marks: Mark[] = [];
    const plan: PlanShape[] = [];
    const shapes = (g: { rects: Rect[]; lines: [Pt, Pt][] }): void => {
      for (const r of g.rects.slice(0, 150)) {
        marks.push({ x: (r[0] + r[2]) / 2, y: f + 0.05, z: (r[1] + r[3]) / 2, sx: Math.max(0.1, r[2] - r[0]), sy: 0.1, sz: Math.max(0.1, r[3] - r[1]), dx: 1, dz: 0, look: 'ghost' });
        const cs: Pt[] = [[r[0], r[1]], [r[2], r[1]], [r[2], r[3]], [r[0], r[3]]];
        for (let i = 0; i < 4; i++) plan.push({ kind: 'line', a: cs[i]!, b: cs[(i + 1) % 4]! });
      }
      for (const [a, b] of g.lines.slice(0, 50)) {
        const dx = b[0] - a[0];
        const dz = b[1] - a[1];
        marks.push({ x: (a[0] + b[0]) / 2, y: f + 0.6, z: (a[1] + b[1]) / 2, sx: Math.max(0.05, Math.abs(dx) + Math.abs(dz)), sy: 1.2, sz: 0.2, dx: dx || 1e-6, dz, look: 'ghost' });
        plan.push({ kind: 'line', a, b });
      }
    };
    if (this.mode === 'mirror') {
      if (!this.first) return { words: 'A: the first point of the mirror line', bad: false, key: 'mi0', marks, plan };
      const p: Pt = [snap(x, og), snap(z, og)];
      const l = lineMirror(this.first, p);
      const a: Pt = l.axis === 'x' ? [l.about, Math.min(this.first[1], p[1]) - 1] : [Math.min(this.first[0], p[0]) - 1, l.about];
      const b: Pt = l.axis === 'x' ? [l.about, Math.max(this.first[1], p[1]) + 1] : [Math.max(this.first[0], p[0]) + 1, l.about];
      plan.push({ kind: 'line', a, b, guide: true });
      shapes(mirrorGhost(d, this.keys, l.axis, l.about));
      return { words: `A: mirror ${l.axis === 'x' ? 'east-west' : 'north-south'} about ${l.axis} ${fmt(l.about)}`, bad: false, key: `mi|${l.axis}|${l.about}`, marks, plan };
    }
    const st = arrayStep(d, this.keys, [x, z], og);
    // the copies are worked out only when the spacing, direction, count or the file change (ED3-3a lesson)
    const key = `ar|${st.axis}|${st.step}|${this.count}|${this.ed.model.rev}`;
    if (this.cache?.key === key) return this.cache.g;
    const r = arrayChanges(d, this.keys, st.axis, st.step, this.count);
    shapes(arrayGhost(d, this.keys, st.axis, st.step, this.count));
    const words = r.why ?? `A: ${this.count} cop${this.count === 1 ? 'y' : 'ies'} every ${fmt(Math.abs(st.step))} m ${st.axis === 'x' ? (st.step > 0 ? 'east' : 'west') : st.step > 0 ? 'north' : 'south'}; D-pad left / right: count`;
    const g = { words, bad: !!r.why, key, marks, plan };
    this.cache = { key, g };
    return g;
  }
}
