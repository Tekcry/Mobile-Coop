# Audio
Purpose: the audio engine, voices and game wiring.
Design authority: docs/design-bible.md (Section 5.2)

## Audio and quality (the audio part)
- `app.audio` (AudioEngine), `app.sfx` (Sfx voices), `app.music`. Every voice must early-out when the
  context is missing/suspended (before the first gesture). Game wiring lives in `audio/gameAudio.ts`.

## Music (V4, 2026-10-16)
- **What plays:**
  - On the menu: "Menu theme, Grand, dialled back" (the Softer mix).
  - In a match, by the guards' awareness:

    | State | Music |
    | --- | --- |
    | Calm | Silence |
    | Cautious | The plucked broken hook (its Cautious mix) |
    | Alert | The spotted hit, then "Alert, under fire" (the "hook forward" mix) |
    | Evasion | The same loop, stripped back |

  - Then the ladder steps back down.
- **Files:**
  - `src/audio/score/game/gameMusic.ts` plays the tracks. `src/audio/score/director.ts` decides the state (hysteresis:
    Cautious after 0.6 s, Alert at once; Alert holds 10 s, Evasion 12 s, Cautious 8 s; one rung at a time).
  - `src/audio/score/game/adapter.ts` is the only code that reads the game. It maps every guard's `AlertLevel`:
    - alert -> alert
    - suspicious, investigating, searching -> caution
    - unaware, cooldown -> calm
  - `src/audio/music/music.ts` is the facade the app calls: `menu()` from `main.ts`, `mission()` and
    `update(dt, awareness)` from `gameAudio.ts`.
- **Tracks:** `src/assets/music/game/` holds one MP3 per state (`music-menu`, `-caution`, `-alert`, `-evade`,
  `-spotted`), each loop with a clean 4-bar opening (`-head`), and `game.json` (pad, loop length, tempo). These files
  are committed and precached by the service worker. They decode at 32 kHz.
  - Every loop starts on its clean opening (no tail of its own last bar), then hands over to the loop.
  - Alert and Evasion run in sync and crossfade on bar lines.
- **Regenerate:**
  - `node scripts/music/fetch-samples.mjs orch-samples.json orch` once (about 680 MB of CC0 WAVs into `.music-cache`).
  - Then `npm run music:orch` (Windows: the MP3 encoder is Media Foundation).
  - The game mixes are chosen in `src/audio/score/orch/cli.ts` (`GAME`); the pieces live in
    `src/audio/score/orch/pieces.ts`.
- **Test page:** `/music-test.html` on the dev server. It holds the audition stems (git-ignored, rebuilt by the same
  command), layer sliders, and the in-game state test.
