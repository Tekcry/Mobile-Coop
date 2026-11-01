/**
 * (anim-studio-2) The Test Chamber's traversal rig (pure, Babylon-free; a dev aid): where the props stand on the stage
 * (`CHAMBER_PROPS`, built as real level geometry and anchors by `world/maps/chamber.ts`, so the game's own traversal
 * plays on them), and the traversal loops: Wren is put at a start spot, walks to the prop and plays the move by
 * synthesised input (the same buttons a player presses), then she is reset and it repeats (`travTick`).
 *
 * Sizes are the engine's numbers (re-checked by `tests/animChamber2.test.ts`): a vault is at most 1.25 m high and 1.0 m
 * deep (`pickTraversal`); a lip hangs from 1.9 m (`LEDGE.minDrop`) and is grabbed from the floor up to 2.7 m
 * (`REACH.grabMax`); the co-op lip is in the 4.3-4.5 m band (G57, `inBoostBand`); the ladder is 0.5 m wide; the duct is the
 * Proving Grounds' 1.0 x 1.1 m crawlspace; the window is every map's 1.2 x 1.2 m at a 0.9 m sill; the door the scale sheet's
 * 1.2 x 2.1 m single door.
 */
import type { PairStation } from './chamberPairs';
import { PAIR_TOP, CHAMBER_PROPS } from './chamberProps';

export { CHAMBER_MID, CHAMBER_PROPS, CHAMBER_SIZE } from './chamberProps';

/** The pairs' station: the team block's south face (outward normal -z). */
export const PAIR_STATION: PairStation = {
  x: (CHAMBER_PROPS.team.x0 + CHAMBER_PROPS.team.x1) / 2,
  z: CHAMBER_PROPS.team.z0,
  yaw: Math.PI,
  top: CHAMBER_PROPS.team.top,
  width: CHAMBER_PROPS.team.x1 - CHAMBER_PROPS.team.x0,
};

/** A button the loops press (the game's actions). */
export type TravButton = 'jump' | 'interact' | 'drop' | 'cover';
/** A call the stage makes at a step's start (things a held menu does in the game: the door menu's Open). */
export type TravCall = 'doorOpen';

/** One step of a loop's act: `dur` s with the stick (camera frame: x right, y forward), a press on its first tick, a
 *  button held through it, the camera turned to the start's yaw + `face` at its start, a stage call. */
export interface TravStep {
  dur: number;
  x?: number;
  y?: number;
  press?: TravButton;
  hold?: TravButton;
  face?: number;
  call?: TravCall;
}

/** A traversal loop: the prop, the start spot (feet, facing), the walk in (m, at `pace` stick), then the act. */
export interface TravEntry {
  id: string;
  label: string;
  prop: keyof typeof CHAMBER_PROPS;
  start: { x: number; y: number; z: number; yaw: number };
  walk: number;
  /** Seconds standing still after the reset (the weapon holsters, the probe runs). */
  settle: number;
  steps: readonly TravStep[];
  /** The sections that tune it (the panel's readout). */
  tune: string;
}

/** The walk-in stick (about 1.4 m/s standing). */
export const TRAV_WALK = 0.55;
const W = TRAV_WALK;
const PI = Math.PI;

export const TRAV_ENTRIES: readonly TravEntry[] = [
  {
    id: 'trav:vault',
    label: 'traversal: vault the low wall',
    prop: 'lowWall',
    start: { x: 6.8, y: 0, z: 17, yaw: -PI / 2 },
    walk: 2.0,
    settle: 0.4,
    steps: [{ dur: 1.2, y: W, press: 'jump' }, { dur: 0.8 }],
    tune: 'Traversal moves: vault',
  },
  {
    id: 'trav:ledge',
    label: 'traversal: ledge grab, shimmy, climb up',
    prop: 'ledge',
    start: { x: 3.4, y: 0, z: 23.4, yaw: 0 },
    walk: 1.0,
    settle: 0.4,
    steps: [{ dur: 0.3, press: 'jump' }, { dur: 1.0 }, { dur: 1.6, x: 1 }, { dur: 0.4 }, { dur: 1.8, press: 'jump' }, { dur: 0.6 }],
    tune: 'Body: ledge (hang); Traversal moves: climbUp',
  },
  {
    id: 'trav:ladder',
    label: 'traversal: ladder up and over the top',
    prop: 'ladder',
    start: { x: 4.7, y: 0, z: 9.0, yaw: -PI / 2 },
    walk: 1.0,
    settle: 0.4,
    steps: [{ dur: 0.5, press: 'jump' }, { dur: 7.5, y: 1 }, { dur: 0.8 }],
    tune: 'Body: ladder; Traversal moves: climbUp (top-out)',
  },
  {
    id: 'trav:pipeV',
    label: 'traversal: drainpipe up, climb onto the top',
    prop: 'pipeV',
    start: { x: 4.7, y: 0, z: 10.4, yaw: -PI / 2 },
    walk: 1.0,
    settle: 0.4,
    steps: [{ dur: 0.5, press: 'jump' }, { dur: 4.0, y: 1 }, { dur: 1.8, press: 'jump' }, { dur: 0.6 }],
    tune: 'Body: pipe; Traversal moves: climbUp',
  },
  {
    id: 'trav:pipeH',
    label: 'traversal: horizontal pipe, hand over hand',
    prop: 'pipeH',
    start: { x: 25.5, y: 0, z: 4.6, yaw: 0 },
    walk: 0,
    settle: 0.4,
    steps: [{ dur: 0.6, press: 'jump' }, { dur: 3.0, y: 1 }, { dur: 0.3 }, { dur: 1.2, press: 'drop' }],
    tune: 'Body: hang (pipe by the hands)',
  },
  {
    id: 'trav:bar',
    label: 'traversal: hang bar, legs up, inverted, flip down',
    prop: 'bar',
    start: { x: 21.7, y: 0, z: 25.5, yaw: PI / 2 },
    walk: 0,
    settle: 0.4,
    steps: [{ dur: 0.9, press: 'jump' }, { dur: 1.2, press: 'jump' }, { dur: 1.6, press: 'jump' }, { dur: 1.6, press: 'drop' }],
    tune: 'Body: hang, pipe (legs up / inverted)',
  },
  {
    id: 'trav:vent',
    label: 'traversal: vent, unscrew, crawl through, out',
    prop: 'vent',
    start: { x: 19.6, y: 0, z: 14, yaw: PI / 2 },
    walk: 1.0,
    settle: 0.4,
    steps: [{ dur: 0.05, press: 'jump', hold: 'interact' }, { dur: 2.0, hold: 'interact' }, { dur: 0.6 }, { dur: 9.5, y: 1 }, { dur: 0.6 }],
    tune: 'Body: crawl, vent (crawl out)',
  },
  {
    id: 'trav:window',
    label: 'traversal: vault through the window',
    prop: 'window',
    start: { x: 18, y: 0, z: 6.2, yaw: PI },
    walk: 1.0,
    settle: 0.4,
    steps: [{ dur: 1.4, press: 'jump' }, { dur: 0.4 }],
    tune: 'Traversal moves: windowVault',
  },
  {
    id: 'trav:door',
    label: 'traversal: open the door, walk through',
    prop: 'door',
    start: { x: 10, y: 0, z: 6.0, yaw: PI },
    walk: 1.0,
    settle: 0.4,
    steps: [{ dur: 2.0, call: 'doorOpen' }, { dur: 2.2, y: W }, { dur: 0.4 }],
    tune: 'Body: walk / idle (the door open is the G6 committed step)',
  },
  {
    id: 'trav:rappel',
    label: 'traversal: rappel down the team block',
    prop: 'rappel',
    start: { x: 16.3, y: PAIR_TOP, z: 25.5, yaw: PI },
    walk: 0,
    settle: 0.9,
    steps: [{ dur: 2.2, press: 'jump' }, { dur: 6.5, y: -1, face: PI }, { dur: 1.0 }],
    tune: 'Traversal moves: rappel',
  },
  {
    id: 'trav:wall',
    label: 'traversal: back to the wall, slide, leave',
    prop: 'platform',
    start: { x: 1.6, y: 0, z: 6.6, yaw: 0 },
    walk: 0.8,
    settle: 0.4,
    steps: [{ dur: 0.8, press: 'cover' }, { dur: 1.4, x: 1 }, { dur: 2.2, x: -1 }, { dur: 0.6 }, { dur: 0.8, press: 'cover' }],
    tune: 'Body: wallIdle, wallSlide, wallPeek',
  },
];

export function travEntry(id: string): TravEntry | null {
  for (let i = 0; i < TRAV_ENTRIES.length; i++) if (TRAV_ENTRIES[i]!.id === id) return TRAV_ENTRIES[i]!;
  return null;
}

/** A loop's phase: put back at the start, standing still, walking in, or playing the act. */
export type TravPhase = 'reset' | 'settle' | 'approach' | 'act';

export interface TravState {
  phase: TravPhase;
  /** The act's step and the seconds into the phase / step. */
  step: number;
  t: number;
  /** Loops played (an act finished). */
  loops: number;
}

export function newTravState(): TravState {
  return { phase: 'reset', step: 0, t: 0, loops: 0 };
}

/** What a tick wants: the stick, a press (edge, '' none), a held button, a teleport to the start, a camera turn (NaN
 *  none), a stage call ('' none). */
export interface TravOut {
  x: number;
  y: number;
  press: TravButton | '';
  hold: TravButton | '';
  teleport: boolean;
  face: number;
  call: TravCall | '';
}

export function newTravOut(): TravOut {
  return { x: 0, y: 0, press: '', hold: '', teleport: false, face: Number.NaN, call: '' };
}

/** The longest walk in (s) before the act starts anyway (a body stuck on something). */
const APPROACH_MAX = 4;

/**
 * One fixed step of a loop. `walked` is how far Wren is from the start spot (m, flat). Reset (teleport) -> settle (still)
 * -> approach (the walk-in stick until `walk` m) -> act (the steps in order) -> reset. No allocation.
 */
export function travTick(e: TravEntry, s: TravState, dt: number, walked: number, out: TravOut): TravOut {
  out.x = out.y = 0;
  out.press = '';
  out.hold = '';
  out.teleport = false;
  out.face = Number.NaN;
  out.call = '';
  switch (s.phase) {
    case 'reset':
      out.teleport = true;
      s.phase = 'settle';
      s.t = 0;
      return out;
    case 'settle':
      s.t += dt;
      if (s.t >= e.settle) {
        s.phase = e.walk > 0 ? 'approach' : 'act';
        s.t = 0;
        s.step = -1;
      }
      if (s.phase === 'approach') out.y = TRAV_WALK;
      if (s.phase !== 'act') return out;
      break;
    case 'approach':
      s.t += dt;
      out.y = TRAV_WALK;
      if (walked >= e.walk || s.t >= APPROACH_MAX) {
        s.phase = 'act';
        s.t = 0;
        s.step = -1;
        break;
      }
      return out;
    case 'act':
      break;
  }
  // the act: a new step on its first tick (its press, camera turn and call), the stick and held button throughout
  if (s.step < 0 || s.t >= e.steps[s.step]!.dur) {
    s.step++;
    s.t = 0;
    if (s.step >= e.steps.length) {
      s.loops++;
      s.phase = 'reset';
      s.step = 0;
      return out;
    }
    const st = e.steps[s.step]!;
    out.press = st.press ?? '';
    out.face = st.face ?? Number.NaN;
    out.call = st.call ?? '';
  }
  const st = e.steps[s.step]!;
  s.t += dt;
  out.x = st.x ?? 0;
  out.y = st.y ?? 0;
  out.hold = st.hold ?? '';
  return out;
}

/** A loop's length (s): settle, the walk in at about 1.4 m/s, the act. */
export function travCycle(e: TravEntry): number {
  let t = e.settle + e.walk / 1.4;
  for (const s of e.steps) t += s.dur;
  return t;
}
