/**
 * (marlow-bays slice T, item 9) The animation tuner's mouse mode with keyboard and mouse (pure, Babylon-free, no DOM).
 * While the panel is open the pointer is free by default ("Drag view": no pointer lock, a left drag on the scene turns
 * the camera, the wheel zooms the orbit, the panel stays clickable). "Game camera" is the normal pointer-locked mouse look
 * of play (the cursor is captured, so the panel gets no mouse until the mode is toggled back). The key (`TUNER_MOUSE_KEY`)
 * and the panel's header button toggle; a capture lost in game camera (Esc, alt-tab) drops back to drag view instead of
 * pausing. Closing the panel gives play its normal locking back. The pad path never reads this.
 */
export type TunerMouseMode = 'drag' | 'game';

/** The toggle key (KeyboardEvent.code): reserved like F3 (the overlay) in keyBindings RESERVED, so no bind takes it. */
export const TUNER_MOUSE_KEY = 'F4';

/** (marlow-bays item 13) The Test Chamber's 'Loop on the spot' key while the panel is open (the pad: L3); reserved too. */
export const TUNER_SPOT_KEY = 'F8';

/** (marlow-bays T1a, item 16) The Test Chamber's playback bar keys while the panel is open (reserved too): play / pause,
 *  one key back, one key forward (the pad: the right stick up, left, right). */
export const TUNER_PLAY_KEY = 'F9';
export const TUNER_KEY_BACK = 'F1';
export const TUNER_KEY_FWD = 'F2';

/** The header button's words per mode. */
export const TUNER_MOUSE_LABEL: Readonly<Record<TunerMouseMode, string>> = { drag: 'Mouse: drag view', game: 'Mouse: game camera' };

export class TunerMouseCtl {
  mode: TunerMouseMode = 'drag';
  open = false;

  /** The pointer is the panel's and the drag's (no pointer lock): the panel is open in drag view. */
  get free(): boolean {
    return this.open && this.mode === 'drag';
  }

  /** The panel takes mouse clicks (closed it is hidden anyway). */
  get panelMouse(): boolean {
    return !this.open || this.mode === 'drag';
  }

  /** Opening starts in drag view (the default); closing leaves play's own locking. Returns `free`. */
  setOpen(on: boolean): boolean {
    this.open = on;
    this.mode = 'drag';
    return this.free;
  }

  /** The key or the button (open only). Returns the new mode. */
  toggle(): TunerMouseMode {
    if (this.open) this.mode = this.mode === 'drag' ? 'game' : 'drag';
    return this.mode;
  }

  set(m: TunerMouseMode): void {
    if (this.open) this.mode = m;
  }

  /** The pointer lock was lost (Esc, alt-tab): in game camera the panel takes it back (drag view, no pause). True when
   *  handled here (the game must not pause). */
  lockLost(): boolean {
    if (!this.open || this.mode !== 'game') return false;
    this.mode = 'drag';
    return true;
  }
}
