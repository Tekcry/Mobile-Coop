import { GLYPHS } from '../input/gamepadMapping';

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

/**
 * Renders a controller/keyboard prompt. All variants are emitted and CSS picks one by
 * body class (input-gamepad / input-kbm, pad-ps), so prompts update instantly on mode change.
 */
export function promptHtml(btn: PromptButton, key?: string): string {
  const x = GLYPHS.xbox[btn];
  const ps = GLYPHS.playstation[btn];
  const shape = btn.length === 1 ? 'round' : 'pill';
  return (
    `<span class="glyph g-pad g-xbox ${shape} gx-${btn}">${x}</span>` +
    `<span class="glyph g-pad g-ps ${shape} gp-${btn}">${ps}</span>` +
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
