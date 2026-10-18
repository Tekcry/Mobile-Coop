/**
 * The difficulty row: CT's fixed levels (Rookie, Normal, Realistic, Perfectionist; G106: no custom sliders). Used by the
 * play screen and the co-op host's lobby. The row updates in place (no rebuild).
 */

import { DIFFICULTIES, DIFFICULTY, type Difficulty } from '../ai/archetypes';
import { choice } from './widgets';

export const DIFFICULTY_OPTS: { value: Difficulty; label: string }[] = DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d].label }));

/** The rows (one: the level). `get` / `set` read and write the difficulty; `onChange` runs after a change (the lobby re-renders). */
export function difficultyRows(get: () => Difficulty, set: (d: Difficulty) => void, onChange: () => void = () => {}): HTMLElement[] {
  const pick = choice('Difficulty', DIFFICULTY_OPTS, get, (v) => {
    set(v);
    onChange();
  });
  pick.dataset.diff = 'choice';
  return [pick];
}
