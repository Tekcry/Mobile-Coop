/**
 * (mission-framework EN1) The mission runner (PLAN section 3; pure, Babylon-free, no net imports).
 *
 * Step states (locked / open / done) from the DAG and a flag set. A step opens when its section is the current one,
 * every `after` step is done and its `needs` fact is held; an open step is done (latched) the first update its condition
 * holds (`stepCond`). A done step with `gives` sets its fact flag. `snapshot(section)` at a section's begin saves the
 * state; `restore(section)` on a restart puts it back (the steps and facts of that section go; earlier sections stay).
 * One player carries both teams: team A's and B's steps open alike (he does them one after another; no forced order, a
 * team's step may wait on the other's) and a sync step takes his `soloWindow`. The co-op client never evaluates
 * conditions: it applies the host's done bits and facts (`applyWire`). Every state sits in typed arrays sized at
 * construction: `setFlag`, `update`, `syncHalf` and the getters do not allocate.
 */
import { factsOf, stepCond, type MissionCond, type MissionDef, type MissionStep } from './missionDef';

export const STEP_LOCKED = 0;
export const STEP_OPEN = 1;
export const STEP_DONE = 2;

/** A compiled condition: op 0 a flag (`idx`), 1 all of `kids`, 2 any of `kids`. Built once at construction. */
interface Cond {
  op: 0 | 1 | 2;
  idx: number;
  kids: Cond[];
}

const NONE = -1;

export class MissionRunner {
  readonly def: MissionDef;
  /** Player count (1: solo carries both teams). */
  players: number;
  /** Current section index in `def.sections`, -1 while the live section is not one of the mission's. */
  section = -1;
  /** Bumped on every state change (a step opens or is done, a fact is set): the HUD and the wire pack read it. */
  version = 0;
  /** The last step done (index), -1 none. */
  lastDone = NONE;
  /** The time `update` last ran (s). */
  now = 0;
  /** The step a decoy read spooked (its target runs to `bolt`), -1 none. */
  spookStep = NONE;

  /** Flag names the mission reads (conditions, gives, needs) and their index. */
  readonly flags: readonly string[];
  private readonly flagIdx: ReadonlyMap<string, number>;
  private readonly flagOn: Uint8Array;
  /** Facts (distinct `gives`, wire bit order) as flag indices. */
  readonly facts: readonly string[];
  private readonly factFlag: Int32Array;

  private readonly n: number;
  private readonly state: Uint8Array;
  /** Time each step opened (s), -1 while locked. */
  private readonly openT: Float64Array;
  /** Sync halves' last times, 2 per step. */
  private readonly half: Float64Array;
  private readonly secOf: Int32Array;
  private readonly needsFlag: Int32Array;
  private readonly givesFlag: Int32Array;
  /** `after` as step indices: offsets into `afterList`. */
  private readonly afterStart: Int32Array;
  private readonly afterList: Int32Array;
  private readonly conds: (Cond | null)[];
  private readonly extractIdx: number;

  // per-section snapshots
  private readonly snapFlag: Uint8Array;
  private readonly snapState: Uint8Array;
  private readonly snapHalf: Float64Array;
  private readonly snapLastDone: Int32Array;
  private readonly snapTaken: Uint8Array;

  constructor(def: MissionDef, players: number) {
    this.def = def;
    this.players = players;
    const steps = def.steps;
    const n = (this.n = steps.length);
    const names: string[] = [];
    const idx = new Map<string, number>();
    const add = (f: string): number => {
      let i = idx.get(f);
      if (i === undefined) {
        i = names.length;
        names.push(f);
        idx.set(f, i);
      }
      return i;
    };
    const compile = (c: MissionCond): Cond => {
      if ('flag' in c) return { op: 0, idx: add(c.flag), kids: [] };
      const all = 'all' in c;
      return { op: all ? 1 : 2, idx: NONE, kids: (all ? c.all : c.any).map(compile) };
    };
    this.conds = steps.map((s) => {
      const c = stepCond(s);
      return c ? compile(c) : null;
    });
    this.needsFlag = new Int32Array(n).fill(NONE);
    this.givesFlag = new Int32Array(n).fill(NONE);
    this.secOf = new Int32Array(n);
    const stepIdx = new Map<string, number>();
    for (let i = 0; i < n; i++) stepIdx.set(steps[i]!.id, i);
    const after: number[] = [];
    this.afterStart = new Int32Array(n + 1);
    let extract = NONE;
    for (let i = 0; i < n; i++) {
      const s = steps[i]!;
      if (s.needs) this.needsFlag[i] = add(s.needs);
      if (s.gives) this.givesFlag[i] = add(s.gives);
      this.secOf[i] = def.sections.indexOf(s.section);
      this.afterStart[i] = after.length;
      for (const a of s.after ?? []) {
        const j = stepIdx.get(a);
        if (j !== undefined && j !== i) after.push(j);
      }
      if (s.kind === 'extract') extract = i;
    }
    this.afterStart[n] = after.length;
    this.afterList = Int32Array.from(after);
    this.extractIdx = extract;
    this.flags = names;
    this.flagIdx = idx;
    this.facts = factsOf(def);
    this.factFlag = Int32Array.from(this.facts.map((f) => idx.get(f) ?? NONE));
    const nf = names.length;
    this.flagOn = new Uint8Array(nf);
    this.state = new Uint8Array(n);
    this.openT = new Float64Array(n).fill(-1);
    this.half = new Float64Array(n * 2).fill(-Infinity);
    const ns = Math.max(1, def.sections.length);
    this.snapFlag = new Uint8Array(ns * nf);
    this.snapState = new Uint8Array(ns * n);
    this.snapHalf = new Float64Array(ns * n * 2);
    this.snapLastDone = new Int32Array(ns).fill(NONE);
    this.snapTaken = new Uint8Array(ns);
  }

  /** Step count. */
  get count(): number {
    return this.n;
  }

  /** Index of a step id, -1 when unknown (setup-time lookup). */
  stepIndex(id: string): number {
    const s = this.def.steps;
    for (let i = 0; i < s.length; i++) if (s[i]!.id === id) return i;
    return NONE;
  }

  /** Index of a section id in `def.sections`, -1 when the mission does not run there. */
  sectionIndex(id: string): number {
    return this.def.sections.indexOf(id);
  }

  step(i: number): MissionStep | undefined {
    return this.def.steps[i];
  }

  /** STEP_LOCKED / STEP_OPEN / STEP_DONE. */
  stateOf(i: number): number {
    return this.state[i] ?? STEP_LOCKED;
  }

  isDone(i: number): boolean {
    return this.state[i] === STEP_DONE;
  }

  isOpen(i: number): boolean {
    return this.state[i] === STEP_OPEN;
  }

  /** When step `i` last opened (s), -1 while locked; stays set once done. */
  openedAt(i: number): number {
    return this.openT[i] ?? -1;
  }

  /** Is a flag the mission reads set? False for flags it does not read. */
  hasFlag(flag: string): boolean {
    const i = this.flagIdx.get(flag);
    return i !== undefined && this.flagOn[i] === 1;
  }

  /** Done bits by step index. */
  get doneBits(): number {
    let b = 0;
    for (let i = 0; i < this.n; i++) if (this.state[i] === STEP_DONE) b |= 1 << i;
    return b;
  }

  /** Fact bits in `facts` order. */
  get factBits(): number {
    let b = 0;
    for (let k = 0; k < this.factFlag.length; k++) {
      const f = this.factFlag[k]!;
      if (f >= 0 && this.flagOn[f] === 1) b |= 1 << k;
    }
    return b;
  }

  /** The mission is complete: its extraction step is done. */
  get finished(): boolean {
    return this.extractIdx >= 0 && this.state[this.extractIdx] === STEP_DONE;
  }

  /**
   * The section's own work is done: every required (not optional) step of it but the extraction. The mode's exit gate:
   * it opens the connector, or in the last section the extraction (PLAN section 2). False for an unknown section.
   */
  sectionDone(section: string | number): boolean {
    const si = typeof section === 'number' ? section : this.def.sections.indexOf(section);
    if (si < 0 || si >= this.def.sections.length) return false;
    const steps = this.def.steps;
    for (let i = 0; i < this.n; i++) {
      if (this.secOf[i] !== si) continue;
      const s = steps[i]!;
      if (s.optional || s.kind === 'extract') continue;
      if (this.state[i] !== STEP_DONE) return false;
    }
    return true;
  }

  /** A flag is set (an interactable `<step>`, an intel code, a sector code, a pass zone). Unknown flags: false. */
  setFlag(flag: string): boolean {
    const i = this.flagIdx.get(flag);
    if (i === undefined || this.flagOn[i] === 1) return false;
    this.flagOn[i] = 1;
    this.version++;
    return true;
  }

  /**
   * The section begins (host and client): it becomes the current one, its steps open from the DAG at `now`, and the
   * state is saved for `restore`. A section the mission does not run in makes no step open (section -1). True when
   * the section is the mission's.
   */
  snapshot(section: string | number, now = this.now): boolean {
    const si = typeof section === 'number' ? section : this.def.sections.indexOf(section);
    this.now = now;
    if (si < 0 || si >= this.def.sections.length) {
      this.section = NONE;
      this.reopen();
      return false;
    }
    this.section = si;
    this.reopen();
    const nf = this.flagOn.length;
    const n = this.n;
    this.snapFlag.set(this.flagOn, si * nf);
    this.snapState.set(this.state, si * n);
    this.snapHalf.set(this.half, si * n * 2);
    this.snapLastDone[si] = this.lastDone;
    this.snapTaken[si] = 1;
    return true;
  }

  /**
   * A restart of the section (host on a rule break or everyone down; client on the restart banner): its steps and facts
   * go back to the section's snapshot, earlier sections' work stays; the open steps restart their clocks at `now`.
   * False when the section has no snapshot.
   */
  restore(section: string | number, now = this.now): boolean {
    const si = typeof section === 'number' ? section : this.def.sections.indexOf(section);
    if (si < 0 || si >= this.def.sections.length || this.snapTaken[si] !== 1) return false;
    const nf = this.flagOn.length;
    const n = this.n;
    this.flagOn.set(this.snapFlag.subarray(si * nf, si * nf + nf));
    this.state.set(this.snapState.subarray(si * n, si * n + n));
    this.half.set(this.snapHalf.subarray(si * n * 2, si * n * 2 + n * 2));
    this.lastDone = this.snapLastDone[si]!;
    this.section = si;
    this.now = now;
    for (let i = 0; i < n; i++) if (this.state[i] === STEP_OPEN) this.state[i] = STEP_LOCKED;
    this.reopen();
    this.version++;
    return true;
  }

  /**
   * Host tick: open steps whose conditions hold are done (and give their facts), until nothing changes. Returns the
   * number of steps done this call. No allocation.
   */
  update(now: number): number {
    this.now = now;
    let done = 0;
    this.reopen(); // a fact set since the last update opens its exploit
    for (let pass = 0; pass <= this.n; pass++) {
      let changed = false;
      for (let i = 0; i < this.n; i++) {
        if (this.state[i] !== STEP_OPEN) continue;
        const c = this.conds[i];
        if (c && this.holds(c)) {
          this.finish(i);
          done++;
          changed = true;
        }
      }
      if (!changed) break;
      this.reopen();
    }
    return done;
  }

  /**
   * One half of a sync step (`half` 0 or 1) at `now`: done once both halves fall within the step's `window` s (one
   * player: `soloWindow`). A half on a step that is not open is ignored. True when it completed the step.
   */
  syncHalf(i: number, half: number, now: number): boolean {
    if (this.state[i] !== STEP_OPEN) return false;
    const s = this.def.steps[i]!;
    if (s.kind !== 'sync') return false;
    const h = half === 0 ? 0 : 1;
    this.half[i * 2 + h] = now;
    const other = this.half[i * 2 + (1 - h)]!;
    const w = this.players <= 1 ? (s.soloWindow ?? s.window ?? 0) : (s.window ?? 0);
    if (now - other > w) return false;
    this.complete(i);
    return true;
  }

  /** The mode completes an open step (the extraction held, a sync it judged). True when it was open. */
  complete(i: number): boolean {
    if (this.state[i] !== STEP_OPEN) return false;
    this.finish(i);
    this.reopen();
    return true;
  }

  /**
   * Interrogating `guard` (host): INTERROGATE_TARGET when he is an open interrogate step's target (the step is done),
   * INTERROGATE_DECOY when he is one of its decoys (the mode spooks the target to `bolt`; `spookStep` names the step),
   * else INTERROGATE_NONE.
   */
  interrogated(guard: string): number {
    const steps = this.def.steps;
    for (let i = 0; i < this.n; i++) {
      if (this.state[i] !== STEP_OPEN) continue;
      const s = steps[i]!;
      if (s.kind !== 'interrogate') continue;
      if (s.target === guard) {
        this.spookStep = NONE;
        this.complete(i);
        return INTERROGATE_TARGET;
      }
      const d = s.decoys;
      if (d) {
        for (let k = 0; k < d.length; k++) {
          if (d[k] === guard) {
            this.spookStep = i;
            return INTERROGATE_DECOY;
          }
        }
      }
    }
    return INTERROGATE_NONE;
  }

  /**
   * Co-op client: the host's done bits (by step index) and fact bits (`facts` order). No condition is evaluated; the
   * open states follow from the DAG in the current section. True when anything changed.
   */
  applyWire(done: number, facts: number): boolean {
    let changed = false;
    for (let k = 0; k < this.factFlag.length; k++) {
      const f = this.factFlag[k]!;
      const on = (facts >>> k) & 1;
      if (f >= 0 && this.flagOn[f] !== on) {
        this.flagOn[f] = on;
        changed = true;
      }
    }
    for (let i = 0; i < this.n; i++) {
      const d = ((done >>> i) & 1) === 1;
      const was = this.state[i] === STEP_DONE;
      if (d === was) continue;
      changed = true;
      if (d) {
        this.state[i] = STEP_DONE;
        if (this.openT[i]! < 0) this.openT[i] = this.now;
        this.lastDone = i;
      } else this.state[i] = STEP_LOCKED;
    }
    if (!changed) return false;
    this.reopen();
    this.version++;
    return true;
  }

  private finish(i: number): void {
    this.state[i] = STEP_DONE;
    this.lastDone = i;
    const g = this.givesFlag[i]!;
    if (g >= 0) this.flagOn[g] = 1;
    this.version++;
  }

  /** Locked steps of the current section whose `after` are done and `needs` held open at `now`. */
  private reopen(): void {
    for (let i = 0; i < this.n; i++) {
      const st = this.state[i];
      if (st === STEP_DONE) continue;
      const open = this.canOpen(i);
      if (open && st === STEP_LOCKED) {
        this.state[i] = STEP_OPEN;
        this.openT[i] = this.now;
        this.half[i * 2] = -Infinity;
        this.half[i * 2 + 1] = -Infinity;
        this.version++;
      } else if (!open && st === STEP_OPEN) {
        this.state[i] = STEP_LOCKED;
        this.openT[i] = -1;
        this.version++;
      } else if (!open) this.openT[i] = -1;
    }
  }

  private canOpen(i: number): boolean {
    if (this.section < 0 || this.secOf[i] !== this.section) return false;
    for (let k = this.afterStart[i]!; k < this.afterStart[i + 1]!; k++) if (this.state[this.afterList[k]!] !== STEP_DONE) return false;
    const nf = this.needsFlag[i]!;
    return nf < 0 || this.flagOn[nf] === 1;
  }

  private holds(c: Cond): boolean {
    if (c.op === 0) return this.flagOn[c.idx] === 1;
    const kids = c.kids;
    if (c.op === 1) {
      for (let k = 0; k < kids.length; k++) if (!this.holds(kids[k]!)) return false;
      return true;
    }
    for (let k = 0; k < kids.length; k++) if (this.holds(kids[k]!)) return true;
    return false;
  }
}

export const INTERROGATE_NONE = 0;
export const INTERROGATE_TARGET = 1;
export const INTERROGATE_DECOY = 2;
