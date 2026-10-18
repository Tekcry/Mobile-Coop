/**
 * (locomotion step 18, D7) Hold or toggle for one button (pure, no allocation): toggle flips on each press, hold
 * follows the button. Used for aim; crouch, sprint, back-to-wall and the grab keep their own state machines with the
 * same rule (`crouchWanted` / `sprintEdge` in player/movement.ts, `WallInput.toggle`, `grabDecides` in game/takedown.ts).
 */
export class HoldToggle {
  on = false;

  update(toggle: boolean, pressed: boolean, held: boolean): boolean {
    if (toggle) {
      if (pressed) this.on = !this.on;
    } else this.on = held;
    return this.on;
  }

  reset(): void {
    this.on = false;
  }
}
