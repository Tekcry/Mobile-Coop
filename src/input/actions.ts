/** Every input source writes into these actions. Game and UI only read actions. */
export const BUTTON_ACTIONS = [
  // gameplay
  'fire',
  'ads',
  'reload',
  'jump',
  /** (3.2.0) The manual jump (touch Jump button; Y / E jump when nothing else is offered). */
  'leap',
  'crouch',
  'swapNext',
  'swapPrev',
  'interact',
  /** Let go while attached (ladder, pipe, ledge, zipline): the crouch control (B / C / Ctrl / touch crouch)
   *  raises it too, so it needs no binding of its own. */
  'drop',
  /** Hold-to-use (doors, downloads, hacking): down once `interact` has been held `INTERACT_HOLD` s. */
  'interactHold',
  /** Take/leave cover (touch button, controller B-hold, keyboard C). */
  'cover',
  'pause',
  /** The gadget button: held = aim the arc, released = throw (placed / flown gadgets go on the press). */
  'grenade',
  /** Gadget wheel: held open (pad / keyboard), toggled (touch). */
  'gadgetWheel',
  'shoulderSwap',
  'dash',
  /** Goggles: cycle off -> night vision -> sonar. */
  'vision',
  /** Mark the enemy under the crosshair (aiming) / run Mark & Execute when ready. */
  'mark',
  'execute',
  /** Co-op: ping the spot (or the guard) under the crosshair for the team. */
  'ping',
  /** Chaos Theory speed gears (3.2.0): one gear up / down. */
  'speedUp',
  'speedDown',
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
  'uiAlt',
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
