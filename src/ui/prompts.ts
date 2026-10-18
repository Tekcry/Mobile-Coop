import { GLYPHS } from '../input/gamepadMapping';
import { padButtonName } from '../input/padBinds';

export type PromptButton = 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT' | 'LS' | 'START';

const KEYS: Record<PromptButton, string> = {
  A: 'Enter',
  B: 'Esc',
  X: 'R',
  Y: 'E',
  LB: 'Q',
  LS: 'Shift',
  RB: 'E',
  LT: 'RMB',
  RT: 'LMB',
  START: 'Esc',
};

/** In-game keyboard labels from the player's bindings (set by the app; the defaults until then). */
export const keyLabels = {
  cover: 'Space',
  traverse: 'E',
  crouch: 'C',
  reload: 'R',
  /** 3.2.0 speed gear (the wheel also steps it). */
  speedUp: '=',
  speedDown: '-',
};

/** (locomotion step 18) In-game pad buttons from the player's bindings (set by the app; button index, -1 unbound). */
export const padButtons = { cover: 0, traverse: 3, crouch: 1, reload: 2 };
const IDX_BTN: Partial<Record<number, PromptButton>> = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 9: 'START', 10: 'LS' };

/** A gameplay prompt: the verb's bound pad button (remapped, D7) and its key. */
export function verbPromptHtml(verb: keyof typeof padButtons, key: string): string {
  const i = padButtons[verb];
  const b = IDX_BTN[i];
  if (b) return promptHtml(b, key);
  const n = (s: 'xbox' | 'playstation' | 'nintendo'): string => (i < 0 ? '-' : padButtonName(i, s));
  return (
    `<span class="glyph g-pad g-xbox pill">${n('xbox')}</span>` +
    `<span class="glyph g-pad g-ps pill">${n('playstation')}</span>` +
    `<span class="glyph g-pad g-nin pill">${n('nintendo')}</span>` +
    `<span class="glyph g-key">${key}</span>`
  );
}

/**
 * Renders a controller/keyboard prompt. All variants are emitted and CSS picks one by
 * body class (input-gamepad / input-kbm, pad-ps / pad-nin: the pad glyphs whenever a pad is the last device used), so prompts update instantly on mode change.
 */
export function promptHtml(btn: PromptButton, key?: string): string {
  const x = GLYPHS.xbox[btn];
  const ps = GLYPHS.playstation[btn];
  const shape = btn.length === 1 ? 'round' : 'pill';
  return (
    `<span class="glyph g-pad g-xbox ${shape} gx-${btn}">${x}</span>` +
    `<span class="glyph g-pad g-ps ${shape} gp-${btn}">${ps}</span>` +
    `<span class="glyph g-pad g-nin ${shape} gn-${btn}">${GLYPHS.nintendo[btn]}</span>` +
    `<span class="glyph g-key">${key ?? KEYS[btn]}</span>`
  );
}

export interface Hint {
  btn: PromptButton | 'LB/RB';
  label: string;
}

export function hintsHtml(hints: readonly Hint[]): string {
  return hints
    .map((h) => {
      const g = h.btn === 'LB/RB' ? promptHtml('LB') + promptHtml('RB') : promptHtml(h.btn);
      return `<span class="hint">${g}<span class="hint-label">${h.label}</span></span>`;
    })
    .join('');
}
