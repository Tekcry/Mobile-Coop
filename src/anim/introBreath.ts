/**
 * (piano-knife S4b, A11) The piano intro pose's breath (pure, Babylon-free, no allocation per call after the clip loads).
 *
 * Michael ~19:20: "showing them holding an empty pistol, calmly breathing". The intro takes only the breath of the
 * captured Breathing Idle (`MOCAP_BREATHING_IDLE`, Mixamo): its spine + chest pitch about one breath window's mean, added
 * where the graph's procedural breath goes (`AnimGraph`, `+ breath` on the spine pitch). The arms stay on the gun and the
 * wall stance stays (no keyed trunk drive: the take's pelvis wanders and its head turns at the seam).
 *
 * The clip module loads lazily on the intro's first frame (`loadIntroBreath`); until it resolves a sine at the same
 * cycle stands in. The tuner's "Intro pose" section scales the depth, the cycle and the window start.
 */
import type { KeyedClip, KeyedPose } from './keyed';
import { KQ, newKeyedPose, sampleKeyed } from './keyed';
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from './tuneRegistry';

/** The intro pose's variants: stand (back flat, pistol right hand), mirror (the same, pistol in the left hand), crouch
 *  (the game's crouched wall stance, pistol in both hands). */
export type IntroVariant = 'stand' | 'mirror' | 'crouch';
export const INTRO_VARIANTS = ['stand', 'mirror', 'crouch'] as const;

/** One loop period of `MOCAP_BREATHING_IDLE` (s; `mocapSources` studio cycle). */
export const BREATH_TAKE_S = 9.933;

/**
 * One breath of the take, `from` .. `from + len` s into Breathing Idle (frames 92-137 of 199: the seam spine 0.37 deg,
 * chest 0.69 deg), played over `cycle` s (0.56x: one calm breath every 4 s, A11). `gain` scales its spine + chest
 * pitch about the window mean (rad, added to the graph's spine pitch); `amp` (rad) the sine that stands in until the
 * clip loads; `fade` (s) the intro breath in / out. Starting values (prototype mode).
 */
export const INTRO_BREATH = { from: 4.592, len: 2.246, cycle: 4.0, gain: 0.5, amp: 0.012, fade: 0.4 };

// ------------------------------------------------------------------------------------------
// The tuner section (identity at default)
// ------------------------------------------------------------------------------------------

export const INTRO_GROUPS = ['intro.pose'] as const;
const G: readonly string[] = INTRO_GROUPS;

export const INTRO_TUNABLES: readonly TuneTunable[] = [
  { id: 'breathGain', label: 'Intro: breath depth', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', groups: G, hook: 'introBreath.ts INTRO_BREATH.gain' },
  { id: 'cycleMul', label: 'Intro: breath cycle', kind: 'mul', def: 1, min: 0.5, max: 2, step: 0.05, unit: 'x', groups: G, hook: 'INTRO_BREATH.cycle (s per breath)' },
  { id: 'fromAdd', label: 'Intro: window start', kind: 'add', def: 0, min: -4.5, max: 2.5, step: 0.05, unit: 's', groups: G, hook: 'INTRO_BREATH.from (s into Breathing Idle)' },
];

/** The intro pose is on (IntroPose sets it; the tuner's follow). */
export const INTRO_SIM = { on: false };

export const INTRO_SECTION = registerTuneSection({
  id: 'intro',
  label: 'Intro pose',
  note: 'The piano intro (piano-knife S4b): the captured breath on the trunk. Every Wren rig (the local player and a remote partner).',
  groups: INTRO_GROUPS,
  tunables: INTRO_TUNABLES,
  select: () => (INTRO_SIM.on ? 'intro.pose' : null),
});

const EFF = INTRO_SECTION.eff['intro.pose']!;

// ------------------------------------------------------------------------------------------
// The clip (lazy) and the breath
// ------------------------------------------------------------------------------------------

let clip: KeyedClip | null = null;
let loading: Promise<void> | null = null;
let scratch: KeyedPose | null = null;
/** The window's mean trunk pitch (rad) and the window start it was computed for (NaN: not yet). */
let mean = 0;
let meanFrom = Number.NaN;

/** Load the captured Breathing Idle once (a second call returns the same promise). */
export function loadIntroBreath(): Promise<void> {
  loading ??= import('./clips/mixamo/piano/breathing_idle').then((m) => {
    clip = m.MOCAP_BREATHING_IDLE;
  });
  return loading;
}

/** The captured clip, or null until it resolves (the first call starts the load). */
export function introBreathClip(): KeyedClip | null {
  if (!clip) void loadIntroBreath();
  return clip;
}

/** The spine + chest pitch (rad) of the take `s` seconds in (into the scratch pose). */
function trunkAt(c: KeyedClip, s: number): number {
  const x = s / BREATH_TAKE_S;
  const q = sampleKeyed(c, x - Math.floor(x), 1, scratch!, null).q;
  let o: number = KQ.spine;
  const sp = Math.atan2(2 * (q[o + 3]! * q[o]! + q[o + 1]! * q[o + 2]!), 1 - 2 * (q[o]! * q[o]! + q[o + 1]! * q[o + 1]!));
  o = KQ.chest;
  const ch = Math.atan2(2 * (q[o + 3]! * q[o]! + q[o + 1]! * q[o + 2]!), 1 - 2 * (q[o]! * q[o]! + q[o + 1]! * q[o + 1]!));
  return sp + ch;
}

/** The intro breath (rad, on the spine pitch) `t` s since the intro started (t >= 0). */
export function introBreath(t: number): number {
  const by = TUNE_FLAGS.bypass;
  const cycle = INTRO_BREATH.cycle * (by ? 1 : EFF['cycleMul']!);
  const u = (t % cycle) / cycle;
  if (!clip) return Math.sin(u * 2 * Math.PI) * INTRO_BREATH.amp;
  scratch ??= newKeyedPose();
  const from = INTRO_BREATH.from + (by ? 0 : EFF['fromAdd']!);
  if (from !== meanFrom) {
    let sum = 0;
    for (let k = 0; k < 64; k++) sum += trunkAt(clip, from + ((k + 0.5) / 64) * INTRO_BREATH.len);
    mean = sum / 64;
    meanFrom = from;
  }
  return (trunkAt(clip, from + u * INTRO_BREATH.len) - mean) * INTRO_BREATH.gain * (by ? 1 : EFF['breathGain']!);
}
