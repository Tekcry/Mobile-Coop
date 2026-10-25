/**
 * (map-ready S1) The load record: how long a match takes from the load's start to the reveal (the first frame the player
 * sees), the named steps on the way, where the light bake came from, and what still builds in the 10 s after the reveal
 * (shader programs, lamp landings, atlas uploads, materials, body / weapon / guard pop-ins, frame intervals). It only
 * reads counters: nothing here changes a load. `GameState` makes one per match and exposes it as `window.__mapReady`
 * (`scripts/map-ready-measure.mjs` reads it); `summary()` goes into the feedback note. Pure: no Babylon, no DOM.
 */

export type BakeSource = 'shipped' | 'cache' | 'baked' | 'unknown';

/** The after-reveal window (ms). */
export const AFTER_WINDOW_MS = 10_000;

/** Load counters other slices bump (S9: textures and files, S10: effects); the record copies their deltas at the reveal. */
export const loadCounters = { texReused: 0, texDecoded: 0, filesReused: 0, filesFetched: 0, effReused: 0, effCompiled: 0 };

export interface AfterWindow {
  done: boolean;
  /** Shader programs created in the window (`_compiledEffects` count delta). */
  programs: number;
  /** Frames whose program count changed (the spike log's `shaders` tag). */
  shaderFrames: number;
  /** Lamps landed and atlas tile uploads in the window (`BakedLamps.landings`, `.tileUploads` deltas). */
  landings: number;
  tileUploads: number;
  /** Materials added to the scene in the window. */
  materials: number;
  /** Body / weapon / guard mesh swaps seen in the window (`FrameSample.popIns` delta). */
  popIns: number;
  frames: number;
  /** Frame intervals (ms) over the window. */
  p50: number;
  p95: number;
  max: number;
}

export interface MapReadyRecord {
  map: string;
  mode: string;
  /** `flags.mapReady` at the load (S1 passes false; S2 passes the flag). */
  gated: boolean;
  /** Step name -> ms from the load start. S1 writes 'world' (World.create done) and 'create' (create resolved). */
  steps: Record<string, number>;
  /** ms from the load start to the reveal; -1 until it happens. */
  revealMs: number;
  /** True from the reveal on (S2's e2e helper waits for it). */
  released: boolean;
  /** S2: the cap cut the gate, and the step it was on. S1: false / ''. */
  capHit: boolean;
  capStep: string;
  bakeSource: BakeSource;
  /** The light bake's own ms (`LightBake.ms`), -1 without lamps. */
  bakeMs: number;
  /** Programs compiled between the load start and the reveal. */
  loadPrograms: number;
  /** `loadCounters` deltas over the load (0 until S9 / S10 bump them). */
  texReused: number;
  texDecoded: number;
  filesReused: number;
  filesFetched: number;
  effReused: number;
  effCompiled: number;
  /** `performance.memory.usedJSHeapSize` at the reveal in MB, -1 when the browser has none. */
  heapMb: number;
  after: AfterWindow;
}

/** Cumulative counters read once per rendered frame (the stats take the deltas). */
export interface FrameSample {
  programs: number;
  landings: number;
  tileUploads: number;
  materials: number;
  popIns: number;
}

/** Frame intervals kept for the window (10 s at 240 fps). */
const MAX_FRAMES = 2400;

/** The `q` quantile (0..1) of an ascending list of `n` values (nearest rank). */
function quantile(sorted: Float32Array, n: number, q: number): number {
  if (n <= 0) return 0;
  const k = Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1));
  return sorted[k]!;
}

export class MapReadyStats {
  readonly record: MapReadyRecord;
  private readonly start: number;
  private readonly programs0: number;
  private readonly counters0 = { ...loadCounters };
  private revealAt = -1;
  private last = 0;
  private lastPrograms = 0;
  /** The window's zero point (the sample at the reveal). */
  private readonly zero: FrameSample = { programs: 0, landings: 0, tileUploads: 0, materials: 0, popIns: 0 };
  private readonly iv = new Float32Array(MAX_FRAMES);
  private n = 0;

  /** `programs0`: the program count at the load start (`loadPrograms` is the reveal's count less it). */
  constructor(map: string, mode: string, gated: boolean, now: number, programs0 = 0) {
    this.start = now;
    this.programs0 = programs0;
    this.record = {
      map,
      mode,
      gated,
      steps: {},
      revealMs: -1,
      released: false,
      capHit: false,
      capStep: '',
      bakeSource: 'unknown',
      bakeMs: -1,
      loadPrograms: 0,
      texReused: 0,
      texDecoded: 0,
      filesReused: 0,
      filesFetched: 0,
      effReused: 0,
      effCompiled: 0,
      heapMb: -1,
      after: { done: false, programs: 0, shaderFrames: 0, landings: 0, tileUploads: 0, materials: 0, popIns: 0, frames: 0, p50: 0, p95: 0, max: 0 },
    };
  }

  step(name: string, now: number): void {
    this.record.steps[name] = now - this.start;
  }

  setBake(source: BakeSource, ms: number): void {
    this.record.bakeSource = source;
    this.record.bakeMs = ms;
  }

  /** At the reveal: the frame sample then becomes the window's zero point. */
  reveal(now: number, s: Readonly<FrameSample>, heapMb: number): void {
    if (this.revealAt >= 0) return;
    const r = this.record;
    this.revealAt = now;
    this.last = now;
    r.revealMs = now - this.start;
    r.released = true;
    r.heapMb = heapMb;
    r.loadPrograms = s.programs - this.programs0;
    const c0 = this.counters0;
    r.texReused = loadCounters.texReused - c0.texReused;
    r.texDecoded = loadCounters.texDecoded - c0.texDecoded;
    r.filesReused = loadCounters.filesReused - c0.filesReused;
    r.filesFetched = loadCounters.filesFetched - c0.filesFetched;
    r.effReused = loadCounters.effReused - c0.effReused;
    r.effCompiled = loadCounters.effCompiled - c0.effCompiled;
    const z = this.zero;
    z.programs = s.programs;
    z.landings = s.landings;
    z.tileUploads = s.tileUploads;
    z.materials = s.materials;
    z.popIns = s.popIns;
    this.lastPrograms = s.programs;
  }

  /** Every rendered frame; no allocation until the window closes (then one sort of the intervals, once per match). */
  frame(now: number, s: Readonly<FrameSample>): void {
    const a = this.record.after;
    if (this.revealAt < 0 || a.done) return;
    if (this.n < MAX_FRAMES) this.iv[this.n++] = now - this.last;
    this.last = now;
    a.frames++;
    if (s.programs !== this.lastPrograms) a.shaderFrames++;
    this.lastPrograms = s.programs;
    if (now - this.revealAt < AFTER_WINDOW_MS) return;
    const z = this.zero;
    a.programs = s.programs - z.programs;
    a.landings = s.landings - z.landings;
    a.tileUploads = s.tileUploads - z.tileUploads;
    a.materials = s.materials - z.materials;
    a.popIns = s.popIns - z.popIns;
    const sorted = this.iv.slice(0, this.n).sort();
    a.p50 = quantile(sorted, this.n, 0.5);
    a.p95 = quantile(sorted, this.n, 0.95);
    a.max = this.n ? sorted[this.n - 1]! : 0;
    a.done = true;
  }

  /** One line for `feedbackContext()`, e.g. "campusOps reveal 8.4 s, after 10 s: 0 programs, 3 landings, 0 pop-ins, p95 18 ms, bake cache". */
  summary(): string {
    const r = this.record;
    const a = r.after;
    if (r.revealMs < 0) return `${r.map} loading, bake ${r.bakeSource}`;
    const after = a.done ? `after ${AFTER_WINDOW_MS / 1000} s: ${a.programs} programs, ${a.landings} landings, ${a.popIns} pop-ins, p95 ${Math.round(a.p95)} ms` : 'after-window running';
    return `${r.map} reveal ${(r.revealMs / 1000).toFixed(1)} s, ${after}, bake ${r.bakeSource}`;
  }
}

/**
 * Where the light bake came from: `declared` wins when given (S4 adds `LightBake.source`); else a section-bake map reads
 * `baked` when its `SectionBaker` exists (only on a cache miss) and `cache` when not; any other map `unknown` (its full
 * bake does not say hit or miss until S4).
 */
export function bakeSourceOf(declared: BakeSource | undefined, sectionBakeMap: boolean, sectionsRunning: boolean): BakeSource {
  if (declared) return declared;
  if (!sectionBakeMap) return 'unknown';
  return sectionsRunning ? 'baked' : 'cache';
}
