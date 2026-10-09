# Night Shift - music progress

Spec: `docs/prompts/music-spec.md` (Section 2 rules still apply). Direction: `docs/audio/music-direction-v2.md`
(replaces `music-direction.md`). Brief: `C:\NightShift\bundles\music-direction-v2.md`. Branch: `feature/music`.

## Status
| Stage | Name | Model | Status |
| --- | --- | --- | --- |
| M0 | Direction v0.1 | Opus | done; replaced by V0 |
| M1 | Engine and music lab | Sonnet | done; Michael listened and did not like calm and combat. Engine and found-sound library kept |
| M2-M4 | (old plan) | - | cancelled; replaced by V1-V4 |
| V0 | Direction v2 (MGS structure + CT texture) | Opus | done; waiting for Michael's approval |
| V1 | Three candidate motifs, motif picker, WAVs | Opus | not started |
| V2 | Engine upgrade: instruments, mix glue, five phases, adapter | Sonnet | not started |
| V3 | Composition: phases, stingers, themes, map colours | Opus | not started |
| V4 | Polish, budget, docs | Sonnet | not started |

## Ear-test log (originality, direction Section 12)
| Date | Cue | Heard as | Action |
| --- | --- | --- | --- |
| | | | |

---

## Stage M0 report
- Done: `docs/audio/music-direction.md` - palette (40 sounds with synthesis), key centre D, tempos (84 / 96 / 168),
  chord set and progressions, the five-note Night Shift motif and its eight forms, layer map (9 stems x 4 states),
  transition and hysteresis rules, stingers, Warehouse and Kestrel themes, menu / briefing / results themes, mix rules,
  originality rules, engine notes for M1.
- Done: this progress file.
- Files changed: `docs/audio/music-direction.md` (new), `docs/audio/music-progress.md` (new).
- Decisions:
  - Spec names guard states `relaxed / ... / search`; the code's `AlertLevel` is `unaware | suspicious | investigating |
    searching | alert | cooldown` -> direction 7.1 maps the real names; `cooldown` counts as calm (guards are back on
    route, the HUD shows no alert).
  - Tempos: suspicious 84, combat 168 (exact double, so half-time combat shares suspicious's pulse and phrases are both
    11.4 s), searching 96 (deliberately off that pulse). Down transitions glide tempo over the 2-bar fall.
  - Hold times: combat -> searching 6 s (spec), searching -> suspicious 10 s, suspicious -> calm 15 s; one phrase
    minimum dwell.
  - Music never scales with guard count or distance (the removed `alive / 5` rule leaked the enemy count).
  - Menu and briefing use a code-made rain-like texture; it is a music texture, not the Phase 2 gameplay rain.
  - Results: failure variant also for "more than one alarm raised"; Phase 4 may refine.
  - Mix: music must never push the shared master compressor into gain reduction on its own (it would duck footsteps).
- Tests: none (documents only). `git fetch` + merge of `origin/ct-movement`: already up to date.
- Measurements: none (documents only).
- Open issues:
  - The motif (D F E Bb A) needs Michael's ear test for resemblance to any known theme before M3 locks it.
  - The level targets (dBFS per state) are starting points; M4 sets the final mix by ear against real footsteps.
  - Resolved 2026-10-09: the HUD's arcs show only guards that see the player or are near (`gameState.ts`
    `updateStealthHud`). Michael chose: music follows every guard's state, never count, distance or direction
    (direction 7.1-7.2).
  - Motif ear test: Michael hears it in the M1 lab (a "play motif" button comes first in M1).
- Next: Michael reviews the direction. On approval, M1 (Sonnet): engine, sound library, sequencer, mixer, seeded
  generator and the music lab with WAV export. STOP.

---

## Stage M1 report
- Done (all in `src/audio/music/`; the old `src/audio/music.ts` is deleted):
  - `rng.ts` seeded generator (mulberry32) with named sub-streams.
  - `dsp.ts` pure Float32 DSP (modal and FM synthesis, filters, soft clip, bit crush, reverse, loop crossfade, generated
    impulse responses).
  - `library.ts` 48 found sounds from the direction palette: metal (`pipe plate boom rail hum scrape scrapeRev chain`), glass and
    clicks (`glass click0-2 relay0-1 relayRel0-1 dial bell motifbell ring tick0-1`), `bellpiano`, machines (`thump piston motor
    motorDown press`), drums (`kickTight kickRound snare snareMetal ghost brushTap brushSwish hatC hatO rim`), bass (`sub reese
    sawbass bassmetal`), beds (`drone bowedD bowedAb air rainbed static`) and three impulse responses (room, hall, street).
  - `scheduler.ts` step clock (16ths, lookahead, tempo change and glide, re-anchor after a stall). `voices.ts` voice cap of 24 with
    priority stealing. `motif.ts` the Night Shift motif and its forms. `conductor.ts` pure event generator (rough calm and rough
    combat, the motif ear test, stems). `engine.ts` Web Audio: nine stem gains, reverb and dub-delay sends (at most two convolvers
    live), limiter and a -6 dBFS soft ceiling on the music bus. `offline.ts` and `wav.ts` offline render and WAV export.
    `music.ts` the `Music` facade `App` uses (replaces the old class; same `start()`). `musicLab.ts` the lab.
  - Music lab: `?musiclab=1` (opens over the menu) or Settings > Audio > Music lab with `?debug=1`. The **Play motif** button is
    first (bell, bass, pipe in turn; also each alone and the Resolved form). Calm and Combat buttons, Stop, seed and tempo nudge,
    mute per stem, Export 60 s WAV (calm, combat) and a motif WAV. The WAV is rendered offline by the same conductor and engine,
    and uses the share sheet on the iPhone, a download on the PC. Live readout: library render ms, state, tempo, voices.
  - Game wiring (only what the spec allows): `app.ts` imports the new `Music`; `gameAudio.ts` loses the `alive / 5` intensity rule
    (it leaked the enemy count); `main.ts` opens the lab under `?musiclab=1`; `flags.ts` gets `musicLab`. Until M2 the game plays
    the calm state only.
- Files: `src/audio/music/*` (new), `src/audio/music.ts` (deleted), `src/core/{app,flags}.ts`, `src/main.ts`,
  `src/audio/gameAudio.ts`, `src/ui/screens/settingsScreen.ts`, `src/styles.css` (lab styles), `tests/music.test.ts`,
  `scripts/e2e-music.mjs` (added to the required list in `scripts/run-e2e.mjs`), `docs/systems/testing-tools.md`.
- Decisions and deviations from the direction (for Michael to veto):
  - **The library is rendered in pure JS, not an `OfflineAudioContext`** (spec Section 3). Same result (seeded Float32 buffers), but it
    runs in node, so determinism is unit-tested, and it behaves the same on every browser. The WAV export does use an
    `OfflineAudioContext` for the whole mix.
  - **Library trimmed to fit the 60 s mono budget** (it was 64.7 s): drone 4 s, air and rainbed 4 s, bowed 2.4 s, scrape 1.2 s, motor 0.9 s,
    boom 2.6 s, motifbell 2.6 s, ring 1.4 s. Now under 60 s. All loops are whole-cycle or crossfaded.
  - Not in M1 (by the spec's staging): `smear` and the `break*` pre-chopped breaks (M3), suspicious and searching states, transitions,
    stingers, pause duck wiring and the adapter (M2). The engine already has `setDuck` and the stinger priority.
  - The combat break is my own 16-step pattern (kick 0 7 10, snare 4 12, ghosts seeded), not any known break. The reese is D, Eb, Ab, C
    on 2-bar spans, gated on a 3-note rhythm.
  - Level trims are STARTING values (`mix.ts`): calm -23 dB, combat -17 dB on the level node. Measured in the offline render (bus, before
    the user volume): calm peak -18 / RMS -29.8 dBFS, combat peak -7.5 / RMS -15.7 dBFS (targets -30 and -16). The bus has a -6 dBFS soft
    ceiling, so peaks cannot pass it. M4 sets the final mix by ear against the footsteps.
- Tests:
  - `tests/music.test.ts` (24 tests): seeded determinism (generator, library, conductor), per-sound independence, every sound finite and
    non-silent, the 60 s budget and variants, loop joins, motif shape, scheduler timing (order, no duplicates, tempo change, glide, re-anchor
    after a stall keeps bar alignment), voice cap (never above 24; steal and refuse rules; sustained layers free their slot), conductor
    (168 BPM grid, calm sparsity and motif rules, state changes, cap through the pool, only library ids), WAV header and levels.
  - `scripts/e2e-music.mjs` passes on phone emulation and desktop (software GL; the audio context runs with a null sink): motif button
    first, no sideways scroll, library renders, context running, motif plays, calm and combat, 168 BPM, voices peak 13 of 24, nothing late,
    seed and tempo nudge, stem mute, offline levels and cap, the 60 s WAV (11,520,044 bytes), no console errors.
  - `npm run lint` clean, `npm test` 647 pass, `npm run build` ok, e2e `smoke`, `e2e-offline` and one movement suite still pass. The full
    `npm run e2e` was not run (shared PC; only the narrow set).
- Measurements:
  - Library render: 0.3 s in node; 0.6-0.7 s in headless Chromium on the PC. **iPhone: pending Michael's run** (the lab's status line shows
    the figure; the budget is 1.5 s). Voices: combat peaked at 13 live, calm 6.
  - Scheduling cost per frame and the `perf.mjs --phone` music run: M4.
- Open issues:
  - **Listening is the real test.** I cannot hear the result. Pitches were checked by spectrum (sub 73.5 Hz, bellpiano and motifbell D4,
    pipe near D4, bowed D3, rail D5) and levels by measurement only. Expect to tune sounds after the first listening round.
  - Ear test (direction Section 12): listen to the motif (Play motif) and the combat break for any resemblance to a known cue. Record it in
    the table at the top.
  - The lab has no map theme selector or theme buttons yet (M3).
  - On iOS the first tap unlocks audio, then the library renders (about a second) before the first sound; the lab shows progress.
- Next: Michael listens in the lab on the PC and the iPhone, approves or sends changes. Then M2 (Sonnet): the four states, transitions,
  stingers, adapter, Confrontation stub. STOP.

---

## Stage V0 report (direction v2)
- Done: `docs/audio/music-direction-v2.md` - the MGS + Chaos Theory blend, five phases (Infiltration, Caution, Alert,
  Evasion, back down), tempos and keys, instruments with synthesis (synth-brass, strings, bells and mallets, sub and
  distorted mid bass, big synth drums, risers and a Shepard loop, the M1 found-sound kit), the stinger language, motif
  rules and where each form appears, the technique map (T1-T10), character, space and mix glue, mix rules, menu /
  briefing / results and map colours, originality rules, engine notes for V2.
- Done: `music-direction.md` marked as replaced; this file's status table moved to the V plan.
- Files changed: `docs/audio/music-direction-v2.md` (new), `docs/audio/music-direction.md`, `docs/audio/music-progress.md`.
  Merged `origin/ct-movement` (clean).
- Decisions (for Michael to veto):
  - Key centre stays D minor (the M1 engine and found sounds are tuned there).
  - Tempos: Caution 72 BPM (heartbeat, lub-dub kick); Alert and Evasion share 168 BPM so the hook can drop out and
    return on any bar; menu 80.
  - `cooldown` maps to Infiltration (guards stay in cooldown forever after combat, so it cannot hold Caution); coming
    down from Evasion always passes through Caution and its 20-40 s decay.
  - Alert = `alert` with a sighting or shots in the last 4 s; `alert` with 6 s of no sighting, or `searching`, = Evasion.
  - Alert stinger is deliberately low and wide (reverse swell into timpani, kick, brass cluster D-Eb-Ab, metal press,
    sub drop, then one silent beat), unlike a short high stab. Full stinger at most once per 20 s; a shorter Re-alert
    otherwise.
  - Body-found stinger now has a sound (dark hit); it still fires only from a Phase 4 hook.
  - Sidechain ducking is scheduled gain automation at known kick times (Web Audio has no sidechain input).
  - Library budget raised from 60 s to 100 s mono, rendered in two batches (first batch under 1.5 s on the iPhone).
  - "PS1 sampler" era colour: render-time 22.05 kHz / 12-bit copies of brass, strings and bells; lab switch, off by default.
- Tests: none (documents only).
- Measurements: none (documents only).
- Open issues:
  - Soundfont decision (direction Section 13) - asked in chat.
  - The M0 motif (D F E Bb A) may be one of the three V1 candidates if it still fits the new rules.
- Next: Michael reviews the direction. On approval, V1 (Opus): three candidate motifs, each on a bell, as the Alert
  brass hook over a simple beat and as the menu's opening 8 bars; a "Motif picker" in the lab; a 60 s WAV of each. STOP.
