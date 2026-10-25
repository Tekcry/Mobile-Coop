/**
 * Course framework numbers (training bunker, pure). The course's own tuning lives here; the movement, enemy, weapon,
 * perception and light tables never change for the course map (docs/archive/training/RULES.md).
 */

/** Seconds an airlock takes to cycle once both players stand on its pad (automatic, R6) (TUNE). */
export const AIRLOCK_CYCLE = 4;
/** A player counts as inside an airlock when the feet are within this (m) of its floor (TUNE). */
export const AIRLOCK_Y_TOL = 1.0;
/**
 * The airlock pad is the airlock box inset by this (m) on every side: feet at the box edge stand in a door plane, and a
 * door forced shut on them would pin them (DOOR.clearance is 0.75 m; keep this at least that) (TUNE).
 */
export const AIRLOCK_PAD_INSET = 1.0;
/** The cycle does not start while a player's feet are within this (m) of the rear door's centre (mirrors DOOR.clearance). */
export const AIRLOCK_DOORWAY_CLEAR = 0.75;
/** Airlock rooms are this size (m, square) ... */
export const AIRLOCK_SIZE = 6;
/** ... within this tolerance (m), checked by `validateCourse`. */
export const AIRLOCK_SIZE_TOL = 0.5;
/** A pair gate opens when both switches are pressed within this many seconds, either order (TUNE). */
export const PAIR_WINDOW = 1.0;
/** A timed hold stays open this many seconds after release unless the gate names its own `after` (TUNE). */
export const TIMED_HOLD_AFTER = 6;
/** The host resends the `course` message at least this often (s) even when nothing changed (TUNE). */
export const COURSE_SEND = 2;
/** Both players downed this long (s) restarts the current bay (TUNE). */
export const RESTART_DELAY = 2;
/** Radio lines and drill steps are at most this many characters (story rules). */
export const COURSE_TEXT_MAX = 90;
/** Light meter band for the course's `dark` drill verb: the body's light level below this is "dark" (TUNE). */
export const COURSE_DARK = 0.25;
/** ... and below this "dim" (above: lit). */
export const COURSE_DIM = 0.6;
/** Callsigns P1 and P2 go by in the course's toasts and radio ("Moth: ledge shimmy - done"; DECISIONS A19). */
export const COURSE_CALLSIGNS = ['Wren', 'Moth'] as const;
