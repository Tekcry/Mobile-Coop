/**
 * (locomotion step 19, D7) The difficulty rows: the preset / Custom choice, the three custom sliders (guard perception,
 * guard aim, alarm tolerance; 0.5-2.0 in 0.1 steps) and Custom's base preset. On a preset the sliders show that preset's
 * values; moving one switches to Custom from that preset. The sliders persist in `gameplay.customDifficulty` (A3).
 * Used by the play screen and the co-op host's lobby. Rows are updated in place (no rebuild), so a drag keeps going.
 */

import type { App } from '../core/app';
import { CUSTOM_MAX, CUSTOM_MIN, CUSTOM_STEP, DIFFICULTIES, DIFFICULTY, presetSliders, type CustomDifficulty, type Difficulty, type DifficultyPreset } from '../ai/archetypes';
import { choice, slider } from './widgets';

export const DIFFICULTY_OPTS: { value: Difficulty; label: string }[] = [...DIFFICULTIES.map((d) => ({ value: d as Difficulty, label: DIFFICULTY[d].label })), { value: 'custom', label: 'Custom' }];
const PRESET_OPTS: { value: DifficultyPreset; label: string }[] = DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY[d].label }));

type SliderKey = 'perception' | 'aim' | 'alarm';
const SLIDERS: { key: SliderKey; label: string }[] = [
  { key: 'perception', label: 'Guard perception' },
  { key: 'aim', label: 'Guard aim' },
  { key: 'alarm', label: 'Alarm tolerance' },
];

/** One line for read-only views (the co-op client's lobby): "Custom (Normal base): perception 0.5, aim 1.0, alarm 2.0". */
export function customSummary(c: CustomDifficulty): string {
  return `Custom (${DIFFICULTY[c.base].label} base): perception ${c.perception.toFixed(2)}, aim ${c.aim.toFixed(2)}, alarm ${c.alarm.toFixed(2)}`;
}

/**
 * The rows. `get` / `set` read and write the current difficulty; `onChange` runs after any change (the lobby
 * re-broadcasts). `compact` (the co-op lobby, short of room above the hints) shows the sliders only on Custom.
 * Returns the rows in order (choice, three sliders, base).
 */
export function difficultyRows(app: App, get: () => Difficulty, set: (d: Difficulty) => void, onChange: () => void = () => {}, compact = false): HTMLElement[] {
  const stored = (): CustomDifficulty => app.settings.get().gameplay.customDifficulty;
  const store = (c: CustomDifficulty): void => app.settings.update((s) => void (s.gameplay.customDifficulty = { ...c }));
  const shown = (): CustomDifficulty => {
    const d = get();
    return d === 'custom' ? stored() : presetSliders(d);
  };
  const rows: HTMLElement[] = [];
  const sync = (): void => {
    base.hidden = get() !== 'custom';
    if (compact) for (const r of rows.slice(1, 4)) r.hidden = get() !== 'custom';
    for (const r of rows) r.dispatchEvent(new Event('widget-refresh'));
    onChange();
  };
  const pick = choice('Difficulty', DIFFICULTY_OPTS, get, (v) => {
    set(v);
    // a preset picked becomes Custom's base (the last preset picked)
    if (v !== 'custom') store({ ...stored(), base: v });
    sync();
  });
  pick.dataset.diff = 'choice';
  rows.push(pick);
  for (const s of SLIDERS) {
    const el = slider(s.label, {
      min: CUSTOM_MIN,
      max: CUSTOM_MAX,
      step: CUSTOM_STEP,
      get: () => shown()[s.key],
      set: (v) => {
        const cur = get();
        const c = cur === 'custom' ? { ...stored() } : presetSliders(cur);
        c[s.key] = v;
        store(c);
        if (cur !== 'custom') set('custom');
        sync();
      },
      format: (v) => v.toFixed(2),
    });
    el.dataset.diff = s.key;
    rows.push(el);
  }
  const base = choice('Custom base', PRESET_OPTS, () => stored().base, (v) => {
    store({ ...stored(), base: v });
    sync();
  });
  base.dataset.diff = 'base';
  base.hidden = get() !== 'custom';
  if (compact) for (const r of rows.slice(1, 4)) r.hidden = get() !== 'custom';
  rows.push(base);
  return rows;
}
