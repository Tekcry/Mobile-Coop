# Audio
Purpose: the audio engine, voices and game wiring.
Design authority: docs/design-bible.md (Section 5.2)

## Audio and quality (the audio part)
- `app.audio` (AudioEngine), `app.sfx` (Sfx voices), `app.music`, `app.foley` (movement foley). Every voice must early-out when the
  context is missing/suspended (before the first gesture). Game wiring lives in `audio/gameAudio.ts`.

## Movement foley (feature/footsteps, 2026-10-16)
Real CC0 recordings for the player's own movement (Michael chose recordings over synthesis, 2026-10-16). Sources and
licences: `docs/audio-credits.md`. Purely cosmetic: guards hear the noise model (`GameState`: `noiseRadius` x
`SURFACE_NOISE` x suit), which nothing here reads or changes.
- **Sprite.** `src/assets/sfx/foley.mp3` (one mono MP3, 96 kbps, ~22 s, ~264 KB, precached by the service worker) holds 75
  takes in 15 banks; `foley.json` gives each take's start and length. `npm run sfx:fetch` downloads the packs (SHA-256
  checked) into `.sfx-cache/` (git-ignored); `npm run sfx:render` (`audio/foley/render/cli.ts`, pure cutting in
  `render/process.ts`) trims each take to its sound, splits the boot steps at the toe (heel and toe banks), levels them,
  drops duplicate takes and encodes. The render records `mark` (first loud sample); at load `alignShift` finds the
  decoder's start delay (about 25 ms in Chromium) and shifts every take by it.
- **Banks.** Steps: `concrete`, `carpet`, `board` (wood boards), `gravel` (crunch takes), `bootHeel` / `bootToe` (real
  heel-toe boot steps, split). Surface colour: `plate` (deck plate ring), `ring` (light metal), `tin` (grate rattle).
  Body: `thump`, `thumpHeavy`, `hand` (palm on a ledge). Gear: `cloth`, `buckle`, `leather`.
- **Planner** (`audio/foley/steps.ts`, pure, tested in `tests/foley.test.ts`): a step is a heel layer and a toe layer
  from separately picked takes, plus the surface's extras (`SURFACES`), plus sometimes a cloth slice cut from a random
  point of a cloth take (and a buckle at a sprint). `GAITS` (crouch / walk / run / sprint, from `gaitOf(speed, crouched,
  sprinting)`; a run from 2.1 m/s) sets level, heel-to-toe gap (crouch 90-130 ms rolling, sprint 16-30 ms slapping),
  a low-pass for the soft crouch, and how often gear rustles. Each layer gets its own rate (+-4 %) and level (+-15 %); the
  feet are pitched 1.2 % and panned 0.05 apart. `TakePicker` never repeats a take until half its bank has played.
  Landings (`soft` / `roll` / `heavy`): both feet a few ms apart and a body thump; a heavy one adds a buckle rattle and
  cloth. Moves: vault (hand, leather, cloth, a foot down at the end), mantle (two hands, cloth, a toe scuff, a step),
  hop, drop (cloth; the landing plays on its own), roll (cloth, shoulder and back thumps, feet). Levels: `FOLEY_MIX`.
- **Wiring** (`gameAudio.ts`): steps follow the rig's real foot plants (`Player.footPlants` / `footPlantSide`, counted
  where the planner reports a heel strike on the ground; the same moment as the camera's step dip), not a timer.
  Landings follow `controller.landings`, moves follow `traversal.committed.n` (vault, mantle, hop, drop, roll; plants
  during a committed move are skipped except on a step-up). Plants within 0.15 s after a landing are part of it.
  Cover glides (noise `silent`) play at 0.4, shuffles on the spot at 0.5. Until the sprite is decoded (or if decoding
  fails) the old synthesised `Sfx.footstep` plays instead.
- **Foley lab** (`?foleylab=1`, `audio/foley/foleyLab.ts`): every surface and gait as a looping walk, the landings and
  moves on buttons, and "Old synth" for an A/B against the previous steps.
- Not covered yet: climbing (ladders, pipes, fences, ledges), co-op teammates' steps, guards' steps.
