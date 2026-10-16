# Audio
Purpose: the audio engine, voices and game wiring.
Design authority: docs/design-bible.md (Section 5.2)

## Audio and quality (the audio part)
- `app.audio` (AudioEngine), `app.sfx` (Sfx voices), `app.music`, `app.foley` (movement foley). Every voice must early-out when the
  context is missing/suspended (before the first gesture). Game wiring lives in `audio/gameAudio.ts`.

## Music (V4, 2026-10-16)
- **What plays:**
  - On the menu: "Menu theme, extended" (`grandlong`, the Softer mix): "Grand, dialled back" with a second half
    (low drums, a string pulse into sixteenths, epic brass on the hook, a peak, the way back down). It loops seamlessly. A track can instead be a whole
    piece (`whole: true` in the cli's GAME list: played once, a 3 s rest, again); none is at the moment.
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
## Movement foley (feature/footsteps, 2026-10-16)
Real CC0 recordings for the player's own movement (Michael chose recordings over synthesis, 2026-10-16). Sources and
licences: `docs/audio-credits.md`. Purely cosmetic: guards hear the noise model (`GameState`: `noiseRadius` x
`SURFACE_NOISE` x suit), which nothing here reads or changes.
- **Sprite.** `src/assets/sfx/foley.mp3` (one mono MP3, 96 kbps, ~20 s, ~233 KB, precached by the service worker) holds 69
  takes in 13 banks; `foley.json` gives each take's start and length. `npm run sfx:fetch` downloads the packs (SHA-256
  checked) into `.sfx-cache/` (git-ignored); `npm run sfx:render` (`audio/foley/render/cli.ts`, pure cutting in
  `render/process.ts`) trims each take to its sound, splits the boot steps at the toe (heel and toe banks), levels them,
  drops duplicate takes and encodes. The render records `mark` (first loud sample); at load `alignShift` finds the
  decoder's start delay (about 25 ms in Chromium) and shifts every take by it.
- **Banks.** Steps: `concrete`, `carpet`, `board` (wood boards), `gravel` (crunch takes), `bootHeel` / `bootToe` (real
  heel-toe boot steps, split). Surface colour: `plate` (deck plate ring), `ring` (light metal), `tin` (grate rattle).
  Body: `thump`, `thumpHeavy`, `hand` (palm on a ledge). Gear: `cloth` only (fabric; Michael, 2026-10-16: the operator
  carries nothing loose, so no buckle, belt or leather takes and nothing that jingles).
- **Planner** (`audio/foley/steps.ts`, pure, tested in `tests/foley.test.ts`): a step is a heel layer and a toe layer
  from separately picked takes, plus the surface's extras (`SURFACES`). No gear layer: the suit is built not to make
  noise and to soak up impacts (Michael, 2026-10-16; `SUIT`). `GAITS` (crouch / walk / run / sprint, from `gaitOf(speed, crouched,
  sprinting)`; a run from 2.1 m/s) sets level, heel-to-toe gap (crouch 90-130 ms rolling, sprint 16-30 ms slapping),
  and a low-pass for the soft crouch. Each layer gets its own rate (+-4 %) and level (+-15 %); the
  feet are pitched 1.2 % and panned 0.05 apart. `TakePicker` never repeats a take until half its bank has played.
  Landings (`soft` / `roll` / `heavy`): both feet a few ms apart and a body thump. Every landing and move layer is
  damped by the suit: low-passed (1.6-2.4 kHz), at 0.6 level, tails cut to 0.25 s. Moves: vault (gloved hand, a faint
  fabric brush, a foot down at the end), mantle (two hands, a brush, a toe scuff, a step), hop (a foot down), drop
  (silent; the landing plays on its own), roll (a brush, shoulder and back thumps, feet). Levels: `FOLEY_MIX`.
- **Wiring** (`gameAudio.ts`): steps follow the rig's real foot plants (`Player.footPlants` / `footPlantSide`, counted
  where the planner reports a heel strike on the ground; the same moment as the camera's step dip), not a timer.
  Landings follow `controller.landings`, moves follow `traversal.committed.n` (vault, mantle, hop, drop, roll; plants
  during a committed move are skipped except on a step-up). Plants within 0.15 s after a landing are part of it.
  Cover glides (noise `silent`) play at 0.4, shuffles on the spot at 0.5. Until the sprite is decoded (or if decoding
  fails) the old synthesised `Sfx.footstep` plays instead.
- **Foley lab** (`?foleylab=1`, `audio/foley/foleyLab.ts`): every surface and gait as a looping walk, the landings and
  moves on buttons, and "Old synth" for an A/B against the previous steps.
- Not covered yet: climbing (ladders, pipes, fences, ledges), co-op teammates' steps, guards' steps.
- **Fades:** `GameMusic.fade()` always sets the current level at the fade's start before the ramp. A Web Audio ramp
  runs from the previous automation event; without the anchor, a fade after an ended fade starts part-way down (a cut).
  The volume default is 15 % (`audio.musicV: 3` moves an untouched old default once).
