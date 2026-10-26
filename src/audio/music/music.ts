/**
 * The score as the app sees it (V4, 2026-10-16): the menu theme on the menu; in a mission the music follows the guards'
 * awareness through the music director (silence while unseen, the broken hook in Cautious, "Alert, under fire" when
 * spotted, Evasion, then back down). The work is in `src/audio/score/game/gameMusic.ts`; `adapter.ts` is the only
 * code that reads the game, and it only reads.
 */
import type { AudioEngine } from '../audioEngine';
import { GameMusic } from '../score/game/gameMusic';
import type { GameAwareness } from '../score/director';
import { ScenePiano } from './scenePiano';

export class Music {
  private readonly score: GameMusic;
  /** (piano-escape S3) The Piano Escape scene's track; it only loads and plays when the scene calls `piano.start()`. */
  readonly piano: ScenePiano;
  /** (piano-escape S3) A scene is on: the director's calm / caution / alert stay silent, the piano is the only score. */
  private sceneOn = false;

  constructor(readonly audio: AudioEngine) {
    this.score = new GameMusic(audio);
    this.piano = new ScenePiano(audio);
  }

  /**
   * (piano-escape S3) A scene owns the score: while `on` the director's Calm / Caution / Alert tracks are muted (whatever
   * plays fades out, and the guards' awareness no longer starts any), so the scene's piano (`piano.start()`) is the only
   * music. The mute survives a checkpoint restart (`calm()` only resets the director). `scene(false)` hands the score
   * back and stops the piano unless it is already fading out.
   */
  scene(on: boolean): void {
    this.sceneOn = on;
    if (on) this.score.calm();
    else if (!this.piano.fadingOut) this.piano.stop();
  }

  /** A scene is on (tests, debug). */
  get sceneActive(): boolean {
    return this.sceneOn;
  }

  /** The main menu is showing. */
  menu(): void {
    this.sceneOn = false;
    this.piano.stop();
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
    // a scene on: the director sees no awareness, so it never leaves Calm (silence) and starts nothing
    this.score.update(dt, this.sceneOn ? 'calm' : game);
  }

  /** (sector-restart) A checkpoint restart: the alert / caution music fades out and the match is back in Calm. */
  calm(): void {
    this.score.calm();
  }

  stop(): void {
    this.sceneOn = false;
    this.piano.stop();
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
