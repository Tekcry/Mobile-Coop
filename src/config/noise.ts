/**
 * Noise radii and muffling (pure). One home for the numbers gameplay and the map design scripts
 * (`docs/design/map-dead-line-*.mjs`) both read, so a design check never re-types an engine value.
 */

/** Share of a noise's reach heard through a wall or a floor (`EnemyManager.hear`). */
export const MUFFLE = 0.45;

/** Noise radius of a landing per band (m): a soft drop is quiet, a heavy landing carries (`landingNoise`). */
export const LANDING_NOISE_RADIUS = { none: 0, soft: 1.2, roll: 5, heavy: 11 } as const;

/**
 * Noise radius of a quiet hold interaction (m): a lock cut, a hatch, a panel, a breaker. Between the quiet door
 * event (2 m) and a kicked door (10 m). Used by the mission holds from the Dead Line greybox (M1) on.
 */
export const HOLD_NOISE_RADIUS = 4;
