/**
 * The score as the app sees it. The V2 engine (realtime synthesis, the motif system, composed takes) was removed on
 * 2026-10-09 (tag `music-v2-archive`); V3 plays pre-rendered stems (`docs/audio/music-direction-v3.md`).
 *
 * Paused until V3 is integrated: the game still calls `start()` on boot and on match start, and nothing plays.
 */
import type { AudioEngine } from '../audioEngine';

export class Music {
  constructor(readonly audio: AudioEngine) {}

  /** No-op while the score is paused (V3 has no game integration yet). */
  start(): void {}
}
