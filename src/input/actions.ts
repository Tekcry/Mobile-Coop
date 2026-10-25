/** Every input source writes into these actions. Game and UI only read actions. */
export const BUTTON_ACTIONS = [
  // gameplay
  'fire',
  /** (anim-rework S1) The aim, held: pad LT (analog), RMB. From holstered it draws straight to the aim (the sling draw). */
  'ads',
  /** (anim-rework S1) X / key X: a tap holsters or draws to low ready, held while drawn reloads (`Player.stance`). */
  'draw',
  /** KBM Z: the knockout (holstered: the palm strike; holding a guard: the choke); held on the drawn pistol it jams. No
   *  pad button (anim-rework S1: LT is the aim; RT tap is the knockout). */
  'altFire',
  /** (F1a, CT) R3 / B: zoom in / out while aiming (a scoped weapon only). */
  'zoom',
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
  /** Goggles (F1a, G181): toggle the vision mode selected on the wheel, on / off (never between modes). */
  'vision',
  /** (G343) View / Select tap or O: show the current objective ~5 s. */
  'objective',
  /** Co-op: ping the spot (or the guard) under the crosshair for the team. */
  'ping',
  /** Co-op action (CT, RB / F / PageDown): team moves (leg-up, ledge relay; the partner throw in B4). */
  'coop',
  /** (anim-rework S1) The held context menu's highlight one row up / down: pad D-pad up / down, the mouse wheel (fixed;
   *  they were the speed gear before the analogue speed). */
  'ctxUp',
  'ctxDown',
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
