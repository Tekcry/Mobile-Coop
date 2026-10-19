/**
 * The score as the app sees it (V4, 2026-10-16): the menu theme on the menu; in a mission the music follows the guards'
 * awareness through the music director (silence while unseen, the broken hook in Cautious, "Alert, under fire" when
 * spotted, Evasion, then back down). The work is in `src/audio/score/game/gameMusic.ts`; `adapter.ts` is the only
 * code that reads the game, and it only reads.
 */
import type { AudioEngine } from '../audioEngine';
import { GameMusic } from '../score/game/gameMusic';
import type { GameAwareness } from '../score/director';

export class Music {
  private readonly score: GameMusic;

  constructor(readonly audio: AudioEngine) {
    this.score = new GameMusic(audio);
  }

  /** The main menu is showing. */
  menu(): void {
    this.score.menu();
  }

  /** (menu-notes note 2) The menu is loading behind the boot screen: decode the theme now, start it with `menu()`. */
  preloadMenu(): void {
    this.score.preloadMenu();
  }

  /** A match starts. */
  mission(): void {
    this.score.mission();
  }

  /** Every frame in a match, with the guards' awareness. */
  update(dt: number, game: GameAwareness): void {
    this.score.update(dt, game);
  }

  /** (sector-restart) A checkpoint restart: the alert / caution music fades out and the match is back in Calm. */
  calm(): void {
    this.score.calm();
  }

  stop(): void {
    this.score.stop();
  }

  /** What is playing and what is decoded (tests). */
  get debug(): { menu: boolean; caution: boolean; alert: boolean; evade: boolean; ready: string } {
    return this.score.debug;
  }

  /** The music state (debug, tests): off, menu, calm, caution, alert or evade. */
  get state(): string {
    return this.score.state;
  }
}
