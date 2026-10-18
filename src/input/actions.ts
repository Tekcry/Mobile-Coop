/** Every input source writes into these actions. Game and UI only read actions. */
export const BUTTON_ACTIONS = [
  // gameplay
  'fire',
  /** (F1a) Legacy: no source writes it now; the aim state is `Player.ads` (a toggle on `draw`). */
  'ads',
  /** (F1a, CT) X / RMB / key: draw or holster the weapon (a toggle; drawn = the aiming mode). */
  'draw',
  /** (F1a, CT) LT / Z: holstered the palm-strike knockout; drawn the secondary fire (a stub: fires like `fire`). */
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
  /** Goggles (F1a, G179): toggle the vision mode selected on the wheel, on / off (never between modes). */
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
