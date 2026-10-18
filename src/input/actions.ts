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
  /** Let go while attached (ladder, pipe, ledge, zipline): the crouch control (B / C / Ctrl)
   *  raises it too, so it needs no binding of its own. */
  'drop',
  /** Hold-to-use (doors, downloads, hacking): down once `interact` has been held `INTERACT_HOLD` s. */
  'interactHold',
  /** Context: back-to-wall (step 11). */
  'cover',
  'pause',
  /** The gadget button: held = aim the arc, released = throw (placed / flown gadgets go on the press). */
  'grenade',
  /** Gadget wheel: held open (pad / keyboard). */
  'gadgetWheel',
  'shoulderSwap',
  'dash',
  /** Goggles: cycle off / night / thermal / electro. */
  'vision',
  /** Co-op: ping the spot (or the guard) under the crosshair for the team. */
  'ping',
  /** Co-op action (CT, RB / F / PageDown): team moves (leg-up, ledge relay; the partner throw in B4). */
  'coop',
  /** Chaos Theory speed gears (3.2.0): one gear up / down. */
  'speedUp',
  'speedDown',
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
  /** Menu X: Defaults, Clear, Delete (pad X, key R; menu-ui SPEC 4.2). */
  'uiX',
  /** Menu Start: Resume in pause, Done / Join in text entry (pad Menu; MD11). Not a Back. */
  'uiStart',
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

export type InputMode = 'gamepad' | 'kbm';
