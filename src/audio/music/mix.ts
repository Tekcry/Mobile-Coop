/**
 * Mix constants (direction Section 11). Levels are dB on the music level node before the user's volume; M4 sets the
 * final values by ear against the real footsteps. Targets: calm -30 dBFS RMS, combat -16, music bus peaks <= -6 dBFS.
 */
import type { MusicState } from './conductor';

export const STATE_LEVEL_DB: Record<MusicState, number> = {
  calm: -23,
  combat: -17,
};

/** The score's own seed for the library: it never changes, so the sounds are the same on every device. */
export const LIBRARY_SEED = 0x4e53;

/** A pattern seed for a session. */
export const DEFAULT_PATTERN_SEED = 7;

/** Scheduler timing (direction 13): a timer every 30 ms schedules the next 150 ms; hidden tabs throttle, so 1.5 s. */
export const TICK_MS = 30;
export const LOOKAHEAD = 0.15;
export const LOOKAHEAD_HIDDEN = 1.5;
