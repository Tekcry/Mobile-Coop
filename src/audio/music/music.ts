/**
 * The score as the app sees it (replaces the old `src/audio/music.ts`). It owns the sound library, the engine and the
 * conductor, and runs the lookahead timer. M1 plays calm and combat roughly and has no game wiring: the M2 adapter
 * (`musicAdapter.ts`) will be the only code that reads game state and calls `setState`.
 *
 * Before the first user gesture nothing runs (iOS audio unlock): `start()` waits for the audio engine's context.
 */
import type { AudioEngine } from '../audioEngine';
import { candidate, playAllTakes, playTake, type CandidateId, type Take } from './candidates';
import { COMBAT_BPM, Conductor, type MusicEvent, type MusicState, type Stem } from './conductor';
import { MusicEngine, type EngineStats } from './engine';
import { LIB_RATE, renderLibraryAsync, type Library } from './library';
import { DEFAULT_PATTERN_SEED, LIBRARY_SEED, LOOKAHEAD, LOOKAHEAD_HIDDEN, STATE_LEVEL_DB, TICK_MS } from './mix';
import { renderOffline, type ExportKind, type OfflineResult } from './offline';

export type MotifForm = 'all' | 'bell' | 'bass' | 'pipe' | 'resolved';

export class Music {
  private engine: MusicEngine | null = null;
  private conductor: Conductor | null = null;
  private lib: Library | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private wanted: MusicState = 'calm';
  private seed = DEFAULT_PATTERN_SEED;
  private bpmNudge = 0;
  /** Lab tempo control: a factor on every tempo (the picker takes and Combat). Pitch is not affected. */
  private tempoFactor = 1;
  private hidden = false;
  /** Library render time in ms (measured on this device), or 0 until it is done. */
  renderMs = 0;
  /** Render progress 0..1. */
  progress = 0;
  private waiters: (() => void)[] = [];
  /** Motif-picker events waiting for the lookahead (sorted by time), so Stop can drop what has not been sent yet. */
  private queue: MusicEvent[] = [];

  constructor(private a: AudioEngine) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.hidden = document.visibilityState === 'hidden';
        if (!this.hidden) this.tick();
      });
    }
  }

  get ready(): boolean {
    return this.engine !== null;
  }

  get state(): MusicState {
    return this.wanted;
  }

  /** Begin (idempotent): after the first gesture, render the library in chunks, then start the calm state. */
  start(): void {
    if (this.engine) {
      // resumed after a stop()
      if (!this.timer) {
        this.timer = setInterval(() => this.tick(), TICK_MS);
        this.apply(this.wanted);
      }
      return;
    }
    if (this.started) return;
    this.started = true;
    this.a.whenReady(() => void this.init());
  }

  private async init(): Promise<void> {
    const ctx = this.a.ctx;
    const out = this.a.out('music', 1, 0, Infinity);
    if (!ctx || !out) return;
    this.lib = await renderLibraryAsync(LIBRARY_SEED, LIB_RATE, (d, n) => (this.progress = d / n));
    this.renderMs = this.lib.renderMs;
    const engine = new MusicEngine(ctx, out, this.lib);
    this.engine = engine;
    this.conductor = new Conductor(this.seed, this.lib, (e) => engine.handle(e));
    this.conductor.setBpmNudge(this.bpmNudge);
    this.apply(this.wanted);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    for (const w of this.waiters.splice(0)) w();
  }

  /** Resolves when the library is rendered and the engine is running. */
  whenReady(): Promise<void> {
    return this.ready ? Promise.resolve() : new Promise((r) => this.waiters.push(r));
  }

  private tick(): void {
    const ctx = this.a.ctx;
    const c = this.conductor;
    if (!ctx || !c || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + (this.hidden ? LOOKAHEAD_HIDDEN : LOOKAHEAD);
    c.advance(ctx.currentTime, horizon);
    let n = 0;
    while (n < this.queue.length && this.queue[n]!.t < horizon) this.engine?.handle(this.queue[n++]!);
    if (n) this.queue.splice(0, n);
  }

  private apply(s: MusicState): void {
    const ctx = this.a.ctx;
    if (!ctx || !this.engine || !this.conductor) return;
    this.engine.setLevelDb(STATE_LEVEL_DB[s]);
    this.conductor.setState(s, ctx.currentTime + 0.05);
    this.tick();
  }

  setState(s: MusicState): void {
    // a motif-picker take still playing ends here (its layer stops were in the queue)
    if (this.queue.length) {
      this.queue.length = 0;
      this.engine?.stopAll(0.3);
      this.conductor?.reset();
    }
    this.wanted = s;
    this.apply(s);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.queue.length = 0;
    this.engine?.stopAll(0.3);
    this.conductor?.reset();
  }

  // ------------------------------------------------------------ lab

  /**
   * Motif picker (V1): play one take of a candidate, or all three back to back. The score stops first so the motif is
   * heard alone. Returns the seconds it will take.
   */
  playCandidate(id: CandidateId, take: Take | 'all' = 'all'): number {
    const ctx = this.a.ctx;
    if (!ctx || !this.conductor || !this.engine) return 0;
    this.queue.length = 0;
    this.engine.stopAll(0.2);
    this.conductor.reset();
    this.engine.setLevelDb(-14);
    const t = ctx.currentTime + 0.25;
    const out: MusicEvent[] = [];
    const sink = (e: MusicEvent): number => out.push(e);
    const end = take === 'all' ? playAllTakes(sink, candidate(id), t, this.tempoFactor) : playTake(sink, candidate(id), take, t, this.tempoFactor);
    this.queue = out.sort((a, b) => a.t - b.t);
    this.tick();
    return end - t;
  }

  /** Play the motif (the lab's first button). Returns the seconds it will take. */
  playMotif(form: MotifForm = 'all'): number {
    const ctx = this.a.ctx;
    if (!ctx || !this.conductor || !this.engine) return 0;
    const t = ctx.currentTime + 0.1;
    return this.conductor.playMotif(t, form) - t;
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.conductor?.setSeed(seed);
  }

  getSeed(): number {
    return this.seed;
  }

  setBpmNudge(n: number): void {
    this.bpmNudge = n;
    this.conductor?.setBpmNudge(n);
  }

  getBpmNudge(): number {
    return this.bpmNudge;
  }

  /** Set the tempo factor (0.5 to 1.5). Takes use it from their next Play; Combat follows at once. */
  setTempo(factor: number): void {
    this.tempoFactor = Math.round(Math.max(0.5, Math.min(1.5, factor)) * 100) / 100;
    this.setBpmNudge(Math.round(COMBAT_BPM * (this.tempoFactor - 1)));
  }

  getTempo(): number {
    return this.tempoFactor;
  }

  setStemMuted(stem: Stem, muted: boolean): void {
    this.engine?.setStemMuted(stem, muted);
  }

  isStemMuted(stem: Stem): boolean {
    return this.engine?.isMuted(stem) ?? false;
  }

  stats(): EngineStats | null {
    return this.engine?.stats() ?? null;
  }

  /** Render offline for the WAV export (and tests). Needs the library. */
  async renderExport(kind: ExportKind, seconds: number, muted: readonly Stem[]): Promise<OfflineResult | null> {
    if (!this.lib) return null;
    return renderOffline(this.lib, { kind, seed: this.seed, seconds, bpmNudge: this.bpmNudge, tempo: this.tempoFactor, muted });
  }

  /** The tempo the current state runs at (for the lab's readout). */
  tempo(): number {
    return this.conductor?.state === 'combat' ? this.conductor.sched.bpm : 0;
  }
}
