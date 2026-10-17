/**
 * Wall chains (ON1 decision 1, ED3-3b), pure: the Wall tool's finished segments, previewed in the model until the chain
 * ends, then committed as one undo step ("Added 4 walls (a chain, 18 m)"). The segment being drawn is the editor's drag;
 * this holds the ones already finished. Babylon- and DOM-free (tests/editor/chain.test.ts).
 */
import { fmt, JOIN_TOL, wallLen } from './geometry';
import type { EditorModel } from './model';
import { describeChange } from './ops';
import type { Change } from './model';
import type { Pt, Wall } from './types';

export class WallChain {
  readonly walls: Wall[] = [];

  constructor(private readonly m: EditorModel) {}

  /** The chain's first point (A there closes the loop), or null before the first segment is finished. */
  get start(): Pt | null {
    return this.walls[0]?.a ?? null;
  }

  get total(): number {
    let t = 0;
    for (const w of this.walls) t += wallLen(w);
    return t;
  }

  /** A finished segment (already previewed in the model). True when it ends on the chain's first point: the loop is closed. */
  add(w: Wall): boolean {
    this.walls.push(JSON.parse(JSON.stringify(w)) as Wall);
    const s = this.walls[0]!.a;
    return this.walls.length > 1 && Math.abs(w.b[0] - s[0]) <= JOIN_TOL && Math.abs(w.b[1] - s[1]) <= JOIN_TOL;
  }

  /** X while drawing: takes the last finished segment out of the model; the next one starts where it started. */
  removeLast(): Wall | null {
    const w = this.walls.pop() ?? null;
    if (w) this.m.drop('walls', w.id);
    return w;
  }

  /** The commit words: one wall as before, a chain as "Added 4 walls (a chain, 18 m)". */
  words(): string {
    const n = this.walls.length;
    if (n === 1) return describeChange(this.m.data, { coll: 'walls', id: this.walls[0]!.id, before: null, after: this.walls[0]! });
    return `Added ${n} walls (a chain, ${fmt(this.total)} m)`;
  }

  /** Ends the chain: its walls as one edit (text and changes, for the editor's commit), or null when it is empty. */
  finish(): { text: string; changes: Change[] } | null {
    if (!this.walls.length) return null;
    const text = this.words();
    const changes = this.walls.map((w): Change => ({ coll: 'walls', id: w.id, before: null, after: w }));
    this.walls.length = 0;
    return { text, changes };
  }
}
