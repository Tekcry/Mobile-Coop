import type { MusicState } from './arrange';

/**
 * The music director (docs/music/score-design.md Section 6). It reads the game's awareness state and decides the music
 * state with hysteresis: fast going up (Alert at once, Cautious after a short debounce), slow coming down, one rung at a
 * time (Alert -> Evasion -> Cautious -> Calm). Pure: time comes in as an argument, so it is unit-tested.
 */

export type GameAwareness = 'calm' | 'caution' | 'alert';

export interface DirectorTimes {
  /** The game must stay in caution this long before the music turns Cautious (ignores a flicker). */
  cautionRise: number;
  /** Cautious plays at least this long. */
  cautionHold: number;
  /** The game must be calm this long before Cautious steps down. */
  calmAfter: number;
  /** Alert plays at least this long. */
  alertHold: number;
  /** The game must be below alert this long before Alert steps down to Evasion. */
  alertDrop: number;
  /** Evasion plays this long before stepping down to Cautious (unless the player is spotted again). */
  evadeHold: number;
  /** A stinger within this long of the previous one is the short version. */
  stingerGap: number;
}

export const DEFAULT_TIMES: DirectorTimes = {
  cautionRise: 0.6,
  cautionHold: 8,
  calmAfter: 5,
  alertHold: 10,
  alertDrop: 3,
  evadeHold: 12,
  stingerGap: 15,
};

export type DirectorAction =
  | { kind: 'state'; from: MusicState; to: MusicState }
  /** `restart`: the Alert loop starts from its top after the stinger (coming up from Calm or Cautious). */
  | { kind: 'stinger'; short: boolean; restart: boolean };

export class Director {
  private state: MusicState = 'calm';
  private enteredAt = 0;
  private game: GameAwareness = 'calm';
  private gameSince = 0;
  private lastStinger = -Infinity;
  /** Reused for every update (the game calls this every few frames): only a transition allocates. */
  private readonly out: DirectorAction[] = [];

  constructor(private readonly times: DirectorTimes = DEFAULT_TIMES) {}

  get music(): MusicState {
    return this.state;
  }

  /** Seconds the music has been in its current state. */
  heldFor(now: number): number {
    return now - this.enteredAt;
  }

  reset(now: number): void {
    this.state = 'calm';
    this.enteredAt = now;
    this.game = 'calm';
    this.gameSince = now;
    this.lastStinger = -Infinity;
  }

  /** Seconds until the next automatic step down, or null when the music is not waiting to step down. */
  nextStepIn(now: number): number | null {
    const t = this.times;
    const held = now - this.enteredAt;
    const inGame = now - this.gameSince;
    switch (this.state) {
      case 'caution':
        return this.game === 'calm' ? Math.max(0, t.cautionHold - held, t.calmAfter - inGame) : null;
      case 'alert':
        return this.game !== 'alert' ? Math.max(0, t.alertHold - held, t.alertDrop - inGame) : null;
      case 'evade':
        return this.game !== 'alert' ? Math.max(0, t.evadeHold - held) : null;
      default:
        return null;
    }
  }

  /** Nothing can change this update (the common case): saves building the transition closures. */
  private quiet(game: GameAwareness, inGame: number, held: number): boolean {
    const t = this.times;
    switch (this.state) {
      case 'calm':
        return game === 'calm' || (game === 'caution' && inGame < t.cautionRise);
      case 'caution':
        return game === 'caution' || (game === 'calm' && (inGame < t.calmAfter || held < t.cautionHold));
      case 'alert':
        return game === 'alert' || inGame < t.alertDrop || held < t.alertHold;
      default:
        return game !== 'alert' && held < t.evadeHold;
    }
  }

  /** Feed the current game state; returns what the music should do now (usually nothing). The array is reused. */
  update(now: number, game: GameAwareness): DirectorAction[] {
    if (game !== this.game) {
      this.game = game;
      this.gameSince = now;
    }
    const t = this.times;
    const held = now - this.enteredAt;
    const inGame = now - this.gameSince;
    const out = this.out;
    out.length = 0;
    if (inGame > 0 && held > 0 && this.quiet(game, inGame, held)) return out;
    const go = (to: MusicState): void => {
      out.push({ kind: 'state', from: this.state, to });
      this.state = to;
      this.enteredAt = now;
    };
    const spotted = (restart: boolean): void => {
      out.push({ kind: 'stinger', short: !restart || now - this.lastStinger < t.stingerGap, restart });
      this.lastStinger = now;
      go('alert');
    };
    switch (this.state) {
      case 'calm':
        if (game === 'alert') spotted(true);
        else if (game === 'caution' && inGame >= t.cautionRise) go('caution');
        break;
      case 'caution':
        if (game === 'alert') spotted(true);
        else if (game === 'calm' && inGame >= t.calmAfter && held >= t.cautionHold) go('calm');
        break;
      case 'alert':
        if (game !== 'alert' && inGame >= t.alertDrop && held >= t.alertHold) go('evade');
        break;
      case 'evade':
        if (game === 'alert') spotted(false);
        else if (held >= t.evadeHold) go('caution');
        break;
    }
    return out;
  }
}
