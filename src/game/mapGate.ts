/**
 * (map-ready S2) The match's load gate, pure (no Babylon; the `world/menuGate.ts` pattern): with `flags.mapReady` the
 * boot screen stays up after `World.create`, the sim held (no fixed step, input off, clock 0), until the map is built
 * and warmed: the live section's lamps, the real quality settings applied, the mode's content placed, the bodies and
 * weapons loaded, every shader compiled, the environment probe captured, every lamp landed, and `WARM_FRAMES` frames
 * rendered with nothing new compiling (PLAN section 2, BRIEF A1). Past the cap (`MAP_READY_CAP_MS`, A2) play starts
 * with what is ready, except the `ALWAYS` steps (A3). `GameState.runGate` fills the probe; nothing in the sim reads it.
 */

export type MapStep = 'bake-live' | 'quality' | 'content' | 'bodies' | 'shaders' | 'probe' | 'bake-all' | 'audio' | 'warm' | 'peers' | 'ready';

/** S2's steps in order, with 'audio' before 'warm' (S3 inserted it: the weapon sprite and the first music cue, A9 / A24);
 *  S5 appends 'peers'. Undo for one step (A1): drop it here. */
export const STEPS: readonly MapStep[] = ['bake-live', 'quality', 'content', 'bodies', 'shaders', 'probe', 'bake-all', 'audio', 'warm'];

/** Never cut by the cap (A3): the live section's lamps (gameplay light). */
export const ALWAYS: readonly MapStep[] = ['bake-live'];

/** Michael's Q1 pick (A2), from the end of World.create. */
export const MAP_READY_CAP_MS = 20_000;

/** Frames rendered behind the boot screen with every earlier step true and no new program (the post stack's first frames). */
export const WARM_FRAMES = 5;

export interface MapGateInput {
  /** The live section's lamps are in (no section baker, or its live section landed). */
  bakeLive: boolean;
  /** The first `applyQuality` / `applyAdaptive` ran on this state (the warm-up compiles the real defines). */
  quality: boolean;
  /** `enter` ran: `mode.start()` placed the guards and devices inside the hold. */
  content: boolean;
  /** The player's play LODs (or its load failed), every weapon mesh and (guard models) every guard body are in. */
  bodies: boolean;
  /** Every mesh with sub-meshes ready, every post process ready, nothing waiting in the scene. */
  shaders: boolean;
  /** The environment probe captured. */
  probe: boolean;
  /** Every section landed and no atlas tile queued. */
  bakeAll: boolean;
  /** (S3) The weapon sound sprite and the first music cue decoded. */
  audio: boolean;
  /** (S5) Co-op: every start player ready (host) / `go` received (client). */
  peers: boolean;
  /** Shader programs compiled so far (a change restarts the warm count). */
  programs: number;
  /** Frames rendered at the `warm` step with `programs` steady (the runner counts them; the probe never writes it). */
  warmFrames: number;
}

export interface MapGateState {
  step: MapStep;
  /** 0..1 of the gate (the caller maps it into the boot bar). */
  progress: number;
  /** The boot bar's status line. */
  text: string;
}

/** The boot bar's text per step. */
const TEXT: Readonly<Record<MapStep, string>> = {
  'bake-live': 'Building lights',
  quality: 'Loading map…',
  content: 'Loading map…',
  bodies: 'Loading Wren',
  shaders: 'Compiling shaders',
  probe: 'Compiling shaders',
  'bake-all': 'Building lights',
  audio: 'Loading sound',
  warm: 'Final checks',
  peers: 'Waiting for partner',
  ready: 'Ready',
};

export function mapGateInput(): MapGateInput {
  return { bakeLive: false, quality: false, content: false, bodies: false, shaders: false, probe: false, bakeAll: false, audio: false, peers: false, programs: 0, warmFrames: 0 };
}

/** Step `s` is done in `g`. */
function done(g: Readonly<MapGateInput>, s: MapStep): boolean {
  switch (s) {
    case 'bake-live':
      return g.bakeLive;
    case 'quality':
      return g.quality;
    case 'content':
      return g.content;
    case 'bodies':
      return g.bodies;
    case 'shaders':
      return g.shaders;
    case 'probe':
      return g.probe;
    case 'bake-all':
      return g.bakeAll;
    case 'audio':
      return g.audio;
    case 'warm':
      return g.warmFrames >= WARM_FRAMES;
    case 'peers':
      return g.peers;
    case 'ready':
      return true;
  }
}

/** Where the gate stands: the first step of `steps` not done, in order. */
export function mapGateStep(g: Readonly<MapGateInput>, steps: readonly MapStep[] = STEPS): MapGateState {
  const n = steps.length;
  for (let i = 0; i < n; i++) {
    const s = steps[i]!;
    if (done(g, s)) continue;
    const part = s === 'warm' ? Math.min(1, g.warmFrames / WARM_FRAMES) : 0;
    return { step: s, progress: (i + part) / n, text: TEXT[s] };
  }
  return { step: 'ready', progress: 1, text: TEXT.ready };
}

/** `?readyCap=<s>` (5-600) else MAP_READY_CAP_MS. */
export function readyCapMs(search: string): number {
  const raw = new URLSearchParams(search).get('readyCap');
  const s = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(s) || s < 5 || s > 600) return MAP_READY_CAP_MS;
  return s * 1000;
}

/** What the gate reads each turn (`GameState.runGate`). */
export interface MapGateProbe {
  /** Fills every field of `g` but `warmFrames`. */
  read(g: MapGateInput): void;
  /** The next rendered frame (true) or a short tick with no frame (false: a hidden tab). */
  tick(): Promise<boolean>;
  /** The state went away: stop waiting. */
  closed(): boolean;
  /** For the cap / error log line. */
  describe(): string;
}

export interface MapGateResult {
  status: 'ready' | 'cap' | 'closed' | 'error';
  /** The step the cap cut ('' unless `cap`). */
  capStep: MapStep | '';
  /** ms the gate ran (from its own start). */
  ms: number;
}

/**
 * Runs the gate to its end. Never rejects (a throw resolves `error`: the boot screen never strands). Ticks until every
 * step is done (`ready`); past `capMs` (from the gate's start: the caller passes what is left of the cap counted from
 * the end of `World.create`) it returns `cap` with the step it was on, as soon as every `ALWAYS` step is done (it keeps
 * waiting for those, A3). `warm` counts rendered frames at that step with `programs` unchanged (a change restarts the
 * count). `report` gets the progress and the status line when either changes.
 */
export async function runMapGate(
  probe: MapGateProbe,
  report: (progress: number, text: string) => void,
  capMs: number,
  steps: readonly MapStep[] = STEPS,
  now: () => number = () => performance.now(),
): Promise<MapGateResult> {
  const t0 = now();
  try {
    const g = mapGateInput();
    const warmAt = steps.indexOf('warm');
    let programs = -1;
    let text = '';
    let progress = -1;
    for (;;) {
      if (probe.closed()) return { status: 'closed', capStep: '', ms: now() - t0 };
      probe.read(g);
      if (g.programs !== programs) {
        programs = g.programs;
        g.warmFrames = 0;
      }
      const s = mapGateStep(g, steps);
      // (an earlier step fell back: the warm count starts again once it is back)
      if (warmAt >= 0 && s.step !== 'ready' && steps.indexOf(s.step) < warmAt) g.warmFrames = 0;
      if (s.text !== text || s.progress !== progress) {
        text = s.text;
        progress = s.progress;
        report(s.progress, s.text);
      }
      if (s.step === 'ready') return { status: 'ready', capStep: '', ms: now() - t0 };
      const t = now();
      if (t - t0 > capMs) {
        let always = true;
        for (let i = 0; i < ALWAYS.length; i++) if (steps.includes(ALWAYS[i]!) && !done(g, ALWAYS[i]!)) always = false;
        if (always) return { status: 'cap', capStep: s.step, ms: t - t0 };
      }
      const rendered = await probe.tick();
      if (rendered && s.step === 'warm') g.warmFrames++;
    }
  } catch {
    return { status: 'error', capStep: '', ms: now() - t0 };
  }
}
