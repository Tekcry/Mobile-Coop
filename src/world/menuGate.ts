/**
 * (menu-notes note 2) The menu's load screen gate, pure (no Babylon): the boot screen stays up until Wren's close-up
 * LOD is loaded and drawn, the menu weapons' meshes are in, every mesh on screen has its shaders and textures ready, and
 * a few frames have rendered behind the boot screen. `MenuState.prepare` fills the input each frame.
 */

/** Frames rendered behind the boot screen once everything is ready (the post stack compiles on its first frames). */
export const WARM_FRAMES = 5;

export interface GateInput {
  /** Bit i = LOD i loaded (`OperatorFigure.loaded`). */
  loaded: number;
  /** The LOD the close-ups draw (`OperatorFigure.closeUpLod`). */
  closeUp: number;
  /** Its load failed (a lower LOD stays on screen; the gate does not wait for it). */
  closeUpFailed: boolean;
  /** The menu's LOD chain has settled (`loadMenuLods`): nothing more is parsed after the reveal. */
  chainDone: boolean;
  /** A menu weapon's baked mesh is still on its way. */
  weaponsPending: boolean;
  /** The LOD drawn is the close-up LOD. */
  onScreen: boolean;
  /** Every enabled, visible mesh is ready (shaders compiled, textures in) and no texture is pending. */
  drawReady: boolean;
  /** Frames rendered since `drawReady` first held. */
  warmFrames: number;
}

export type GateStep = 'wren' | 'weapons' | 'shaders' | 'warm' | 'ready';

export interface GateState {
  step: GateStep;
  /** 0..1 of the menu's own load (the caller maps it into the boot bar). */
  progress: number;
  text: string;
}

export function gateInput(): GateInput {
  return { loaded: 0, closeUp: 0, closeUpFailed: false, chainDone: false, weaponsPending: true, onScreen: false, drawReady: false, warmFrames: 0 };
}

function bits(n: number): number {
  let c = 0;
  for (let b = 0; b < 4; b++) if (n & (1 << b)) c++;
  return c;
}

/** How long the gate waits: it gives up after `stallMs` with no progress (no new bytes, no new step) or `capMs` in all. */
export interface GateLimits {
  stallMs: number;
  capMs: number;
}

/** A real launch: patient while bytes keep arriving (a slow first download), 12 s without progress, 2 min at most. */
export const GATE_LIMITS: GateLimits = { stallMs: 12000, capMs: 120000 };
/** Under automation: the cap only, short (the suites wait 60 s for the boot); an expiry reads "cap of 12 s". */
export const GATE_LIMITS_AUTOMATION: GateLimits = { stallMs: 12000, capMs: 12000 };

/** The limits for this launch: `?bootCap=<s>` (5-600) sets the cap (the GPU shots at a full preset); else by mode. */
export function gateLimits(search: string, automation: boolean): GateLimits {
  const base = automation ? GATE_LIMITS_AUTOMATION : GATE_LIMITS;
  const raw = new URLSearchParams(search).get('bootCap');
  const cap = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(cap) || cap < 5 || cap > 600) return base;
  return { stallMs: base.stallMs, capMs: cap * 1000 };
}

/** What the gate reads each turn (`MenuState`). */
export interface GateProbe {
  /** Fills every field of `g` but `warmFrames`; returns the operator bytes received so far. */
  read(g: GateInput): number;
  /** The next rendered frame (true) or a short tick with no frame (false). */
  tick(): Promise<boolean>;
  /** The menu went away: stop waiting. */
  closed(): boolean;
  /** For the timeout message. */
  describe(): string;
}

/**
 * Runs the gate to its end: 'ready', 'timeout: ...' (stalled or capped), 'closed', or 'error: ...' (a check threw; the
 * menu shows anyway, never a stranded boot screen). Never rejects. `report` gets the progress and the status line, with
 * the megabytes received while Wren loads.
 */
export async function runGate(probe: GateProbe, report: (progress: number, text: string) => void, limits: GateLimits, now: () => number = () => performance.now()): Promise<string> {
  try {
    const g = gateInput();
    const t0 = now();
    let moved = t0;
    let bytes0 = -1;
    let bytesSeen = -1;
    let step = '';
    let text = '';
    let progress = -1;
    for (;;) {
      if (probe.closed()) return 'closed';
      const bytes = probe.read(g);
      if (bytes0 < 0) bytes0 = bytes;
      const s = gateStep(g);
      const t = now();
      if (bytes !== bytesSeen || s.step !== step) moved = t;
      bytesSeen = bytes;
      step = s.step;
      const mb = Math.floor((bytes - bytes0) / 1e6);
      const line = s.step === 'wren' && mb > 0 ? `${s.text} ${mb} MB` : s.text;
      if (line !== text || s.progress !== progress) {
        text = line;
        progress = s.progress;
        report(s.progress, line);
      }
      if (s.step === 'ready') return 'ready';
      // (the cap first: with stallMs >= capMs, as under automation, an expiry always reads as the cap)
      if (t - t0 > limits.capMs) return `timeout: ${s.step}, cap of ${Math.round(limits.capMs / 1000)} s (${probe.describe()})`;
      if (t - moved > limits.stallMs) return `timeout: ${s.step}, no progress for ${Math.round(limits.stallMs / 1000)} s (${probe.describe()})`;
      const rendered = await probe.tick();
      if (rendered && s.step === 'warm') g.warmFrames++;
    }
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/** Where the gate stands. In order: Wren, the weapons, the shaders, the warm-up frames. */
export function gateStep(g: GateInput): GateState {
  const closeUpIn = (g.loaded & (1 << g.closeUp)) !== 0 || g.closeUpFailed;
  if (!closeUpIn || !g.chainDone) {
    // (the chain loads up to three bodies: LOD2, LOD0, then the hero; `?gfx=min` one)
    const k = closeUpIn ? 0.9 : Math.min(0.85, bits(g.loaded) / 3);
    return { step: 'wren', progress: 0.05 + 0.45 * k, text: 'Loading Wren…' };
  }
  if (g.weaponsPending) return { step: 'weapons', progress: 0.55, text: 'Loading weapons…' };
  if (!(g.onScreen || g.closeUpFailed) || !g.drawReady) return { step: 'shaders', progress: 0.7, text: 'Preparing shaders…' };
  if (g.warmFrames < WARM_FRAMES) return { step: 'warm', progress: 0.85 + (0.15 * g.warmFrames) / WARM_FRAMES, text: 'Preparing shaders…' };
  return { step: 'ready', progress: 1, text: 'Ready' };
}
