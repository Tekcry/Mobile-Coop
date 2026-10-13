/**
 * The training course (pure, unit-tested): one verb at a time on Proving Grounds, each step done when the game
 * reports it. Optional, replayable, no story. The mode (`modes/trainingMode.ts`) fills `TrainingStatus` each step
 * and places the target marker; this only sequences.
 */
export type TrainingStepId = 'move' | 'sneak' | 'cover' | 'vault' | 'ladder' | 'goggles' | 'takedown' | 'gadget';

export interface TrainingStep {
  id: TrainingStepId;
  /** Objective line (the HUD shows the input glyph from the Controls screen). */
  text: string;
  /** Short hint per input type. */
  hint: { pad: string; kbm: string; touch: string };
}

export const TRAINING_STEPS: readonly TrainingStep[] = [
  { id: 'move', text: 'Move to the marker', hint: { pad: 'Left stick', kbm: 'W A S D', touch: 'Drag on the left half' } },
  { id: 'sneak', text: 'Crouch and sneak forward', hint: { pad: 'B to crouch', kbm: 'C to crouch', touch: 'Crouch button' } },
  { id: 'cover', text: 'Take cover behind the low crate', hint: { pad: 'A near the crate', kbm: 'Space near the crate', touch: 'Tap "Take cover"' } },
  { id: 'vault', text: 'Vault over it', hint: { pad: 'Y in cover', kbm: 'E in cover', touch: 'Tap "Vault"' } },
  { id: 'ladder', text: 'Climb the ladder', hint: { pad: 'Y at the ladder', kbm: 'E at the ladder', touch: 'Tap "Climb"' } },
  { id: 'goggles', text: 'Switch your goggles on', hint: { pad: 'Tap the View button', kbm: 'N', touch: 'Goggles button' } },
  { id: 'takedown', text: 'Grab the guard from behind, then take him down', hint: { pad: 'Y grabs; Y again: tap knocks out, hold kills', kbm: 'E grabs; E again: tap / hold', touch: 'Takedown button: grab, then again' } },
  { id: 'gadget', text: 'Throw a gadget', hint: { pad: 'Hold D-pad right, release', kbm: 'Hold G, release', touch: 'Hold the gadget button, release' } },
];

/** What the game reports each step. */
export interface TrainingStatus {
  /** Metres from where the step started. */
  moved: number;
  crouchedMoving: boolean;
  inCover: boolean;
  /** Any vault / mantle / step over cover since the step started. */
  vaulted: boolean;
  onLadder: boolean;
  goggles: boolean;
  takedowns: number;
  thrown: number;
}

export const emptyTrainingStatus = (): TrainingStatus => ({ moved: 0, crouchedMoving: false, inCover: false, vaulted: false, onLadder: false, goggles: false, takedowns: 0, thrown: 0 });

/** Is `id` done given the status? (`base` = the counters when the step began) */
export function stepDone(id: TrainingStepId, s: TrainingStatus, base: TrainingStatus): boolean {
  switch (id) {
    case 'move':
      return s.moved >= 4;
    case 'sneak':
      return s.crouchedMoving;
    case 'cover':
      return s.inCover;
    case 'vault':
      return s.vaulted;
    case 'ladder':
      return s.onLadder;
    case 'goggles':
      return s.goggles;
    case 'takedown':
      return s.takedowns > base.takedowns;
    case 'gadget':
      return s.thrown > base.thrown;
  }
}

export class TrainingCourse {
  index = 0;
  private base: TrainingStatus = emptyTrainingStatus();

  get step(): TrainingStep | null {
    return TRAINING_STEPS[this.index] ?? null;
  }

  get done(): boolean {
    return this.index >= TRAINING_STEPS.length;
  }

  get fraction(): number {
    return this.index / TRAINING_STEPS.length;
  }

  /** Feed the status; returns the step just completed (then the next one starts from this status). */
  update(s: TrainingStatus): TrainingStep | null {
    const st = this.step;
    if (!st || !stepDone(st.id, s, this.base)) return null;
    this.index++;
    this.base = { ...s };
    return st;
  }

  /** Skip the current step (the pause menu / a stuck player). */
  skip(s: TrainingStatus): void {
    if (this.done) return;
    this.index++;
    this.base = { ...s };
  }
}
