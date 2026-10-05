/** Every input source writes into these actions. Game and UI only read actions. */
export const BUTTON_ACTIONS = [
  // gameplay
  'fire',
  'ads',
  'reload',
  'jump',
  'crouch',
  'swapNext',
  'swapPrev',
  'interact',
  /** Take/leave cover (touch button, controller B-hold, keyboard C). */
  'cover',
  'pause',
  'grenade',
  'shoulderSwap',
  'sprint',
  'quick1',
  'quick2',
  'quick3',
  'quick4',
  // ui
  'uiUp',
  'uiDown',
  'uiLeft',
  'uiRight',
  'uiConfirm',
  'uiBack',
  'uiTabPrev',
  'uiTabNext',
] as const;

export type ButtonAction = (typeof BUTTON_ACTIONS)[number];

export interface ButtonState {
  down: boolean;
  /** Went down since last consume. */
  pressed: boolean;
  /** Went up since last consume. */
  released: boolean;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type InputMode = 'touch' | 'gamepad' | 'kbm';
