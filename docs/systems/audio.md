# Audio
Owner: the orchestrator. Status: current.
Purpose: the audio engine, voices and game wiring.
Design authority: docs/DECISIONS.md (G58-G67), then docs/design-bible.md (Section 5.2).

## Rules
- Free recordings whose licence allows commercial sale (bible Section 6, G407) may be used for any sound wherever they
  cut build time and sound better: bundled, never fetched at runtime, each credited in `docs/audio-credits.md` (G58).
  WebAudio synthesis stays as the fallback and for sounds not recorded yet. No audio size limit (G59).
- Guards hear the noise model, never the audio: the foley and gun sounds read nothing from it and change nothing in it.
- Missing sounds come after the prototype: guards' footsteps first, then ambience, then the rest (G66).
- Music (the V4 score) is in and provisional: its direction, briefing / results / pause music, the long menu theme
  (G64) and the Calm / Cautious alternatives are decided in the music job (DECISIONS "Deferred").

## Engine
- `app.audio` (AudioEngine), `app.sfx` (Sfx voices), `app.music`, `app.foley` (movement foley), `app.weaponAudio` (weapon sounds). Every voice must early-out when the
  context is missing/suspended (before the first gesture). Game wiring lives in `audio/gameAudio.ts`.

## Music (V4, 2026-10-16)
- **What plays:**
  - On the menu: "Menu theme, extended" (`grandlong`, the Softer mix): "Grand, dialled back" with a second half
    (low drums, a string pulse into sixteenths, epic brass on the hook, a peak, the way back down). It loops seamlessly. A track can instead be a whole
    piece (`whole: true` in the cli's GAME list: played once, a 3 s rest, again); none is at the moment.
  - In a match, by the guards' awareness:

    | State | Music |
    | --- | --- |
    | Calm | Silence (until the music job, audio AS4) |
    | Cautious | The plucked broken hook (its Cautious mix) |
    | Alert | The spotted build (`-spotted`), then "Alert, under fire" (the "hook forward" mix) |
    | Evasion | The same loop, stripped back |

  - Then the ladder steps back down. Searching guards play Cautious; the chase music (Alert) only after the player
    was seen (G63). Music follows every guard's state, never count, distance or direction (audio AS8).
- **Files:**
  - `src/audio/score/game/gameMusic.ts` plays the tracks. `src/audio/score/director.ts` decides the state (hysteresis:
    Cautious after 0.6 s, Alert at once; Alert holds 10 s, Evasion 12 s, Cautious 8 s; one rung at a time).
    `GameMusic.calm()` (`Music.calm`, on the `checkpointRestart` event, sector-restart M9): a Sector Ops checkpoint
    restart fades whatever plays over 2.5 s and resets the director to Calm.
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

## Movement foley (2026-10-16)
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
- Decided, not built yet: one run sound for every running speed, the walk / run switch reset to the CT speeds and the
  `sprint` gait removed (G62; `RUN_FROM` 2.1 m/s today); your own steps play very softly when guards cannot hear them (built, playtest 2: the own-step volume follows the noise
  radius, `stepVolume`, 0.07 silent to 0.42 at the loudest run),
  and the sound meter shows what guards hear (G61); a separate Footsteps volume slider for testing (G60); one shared
  foot-touched-the-ground event for footsteps and rumble (G67; today foley counts `Player.footPlants` beside the
  rumble's `onFootPlant`).
- Not covered yet: climbing (ladders, pipes, fences, ledges), co-op teammates' steps, guards' steps.
- **Fades:** `GameMusic.fade()` always sets the current level at the fade's start before the ramp. A Web Audio ramp
  runs from the previous automation event; without the anchor, a fade after an ended fade starts part-way down (a cut).
  The volume default is 15 % (`audio.musicV: 3` moves an untouched old default once).

## Weapon sounds (2026-10-16)
Real CC0 recordings for every gun (Michael: "allow CC0 for everything", 2026-10-16). Sources and licences:
`docs/audio-credits.md`. Purely cosmetic: guards hear the noise model (`GameState`: `SHOT_NOISE` x the weapon's `noise`
stat), which nothing here reads or changes.
- **Sprite.** `src/assets/sfx/weapons.mp3` (one mono MP3, 96 kbps, ~90 s, ~1.06 MB, precached) holds 127 takes in 46
  banks; `weapons.json` indexes them (`audio/weapons/sprite.ts`). `npm run sfx:fetch-weapons` downloads the files
  (SHA-256 checked, the 194 MB library unpacked with the system `tar`) into `.sfx-cache/weapons/` (git-ignored);
  `npm run sfx:render-weapons` (`audio/weapons/render/cli.ts`, pure signal work in `render/dsp.ts`, deterministic) cuts
  and encodes. Alignment as in the foley (`mark`, `alignShift`).
- **Banks.**
  - Shots: 12 recorded guns (`SHOT_SOURCES`), near and `<gun>Far` (mid distance), 2-5 takes each. A single-shot file
    gives each shot (its berm echo dropped); a burst gives the last round of each burst (its tail rings out).
  - Suppressed (`sdPistol`, `sdSmg`, `sdRifle`, `sdHeavy`): made from the near takes by `suppress()`. The blast and tail
    are cut (a 28-55 ms decay after 4 ms), the body low-passed (1.1-1.7 kHz), a puff of gas and the slide or bolt clack
    added, plus four early reflections (a room, not a field).
  - Handling: `magOut`, `magIn`, `rifleMagIn`, `slideBack`, `slideFwd`, `shellIn`, `tick` (dry click).
  - Brass: `case_<pistol|rifle|shell>_<hard|metal|wood>`, three drops each, modelled (`casing()`). Modal rings per
    bounce, bounces closing up, a contact click, the floor's colour (a deck plate rings, wood knocks), sometimes a roll.
  - `bow` (the deleted crossbow's take) and the takes only deleted guns used stay in the sprite until it is next
    rendered.
  - Levels: shots and suppressed shots by body RMS (peaks under 0.97), handling and brass by body RMS.
- **Planner** (`audio/weapons/guns.ts`, pure, allocation-free per call, tested in `tests/weapons-audio.test.ts`):
  - `GUNS` maps the two CT kit guns (`rifle`, `pistolSd`) and the guns the guards sound like to a recording, rate,
    level, suppressed bank, casing, action (bolt or none) and reload kind. `CLASS_GUN` serves co-op shots (class only); `GUARD_GUN` maps the armed archetypes (grunt and runner AK, heavy LMG,
    sniper, enforcer semi-auto shotgun, drone operator SMG, officer pistol).
  - A shot: one take, rate +-3.5 %, level +-12 %, never the same take twice in a row (`TakePicker`). Remote shots
    crossfade near to far between 8 and 30 m (equal power) and low-pass with distance.
  - Brass lands 0.42-0.6 s after a shot on the player's floor (`caseFloor`: grate is metal, carpet is muffled wood,
    gravel dulled hard). A bolt cycles after the shot, the shell or case dropping after them.
  - A reload is laid out over `PlayerWeapons.reloadDuration` (`reloadIsEmpty` adds the slide or charging handle; tube
    shotguns load the missing shells one by one, at most five heard).
  - Levels: `WEAPON_MIX`. Measured in game (loudest 50 ms): a running step about -33 dB, an open pistol about -21 dB,
    a suppressed pistol about -31 dB, reloads about -30 dB, brass about -42 dB.
- **Runtime** (`audio/weapons/weaponAudio.ts`, `app.weaponAudio`): decodes the sprite once audio starts. The player's
  shots choke each other (the last shot fades 30 ms into the next over 70 ms), so automatic fire stays a clean rattle.
  Reload sources are kept and cut on a swap or when the match ends. Until the sprite is decoded the old synth plays.
- **Wiring** (`gameAudio.ts`): `onShot` (suppressed when the live `stats.noise` < 0.6: the suppressed pistol's 0.35 or a
  fitted suppressor's 0.45, which includes the campaign rifle's issued suppressor), `onReload`, `onDryFire`, `onSwap`; guards' shots (`onEnemyShot`, by archetype) and co-op
  `remoteShot` through `AudioEngine.spatial` at range 70: a guard's by class, (coop-walk-fixes P7) a partner's round by its
  weapon id (`remoteGun`: the suppressed pistol is `pistolSd`, not the class's open pistol) and suppressed when it was
  (`PF.quiet`; `stats.remoteSd`). One per round: `RemoteAvatar` plays a round per step of the partner's
  `PlayerState.sc` (`net/remoteShots.ts`), no longer every fire interval while `PF.firing` (0.2 s) is set, which
  played a single shot twice.
- Not covered yet: bullet impacts and ricochets (still the synth `impact`), the weapon swap and grenade throw (synth),
  bullet flybys past the player, guards' reloads, indoor and outdoor reverb tails by room.
