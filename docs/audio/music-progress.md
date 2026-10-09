# Night Shift - music progress

Spec: `docs/prompts/music-spec.md` (Section 2 rules still apply). Direction: `docs/audio/music-direction-v2.md`
(replaces `music-direction.md`). Brief: `C:\NightShift\bundles\music-direction-v2.md`. Branch: `feature/music`.

## Status
| Stage | Name | Model | Status |
| --- | --- | --- | --- |
| M0 | Direction v0.1 | Opus | done; replaced by V0 |
| M1 | Engine and music lab | Sonnet | done; Michael listened and did not like calm and combat. Engine and found-sound library kept |
| M2-M4 | (old plan) | - | cancelled; replaced by V1-V4 |
| V0 | Direction v2 (MGS structure + CT texture) | Opus | done; approved by Michael 2026-10-09 |
| V1 | Three candidate motifs, motif picker, WAVs | Opus | B "Dead Drop" chosen with the noir take; softer voices done, waiting for Michael's listen |
| V2 | Engine upgrade: instruments, mix glue, five phases, adapter | Sonnet | not started |
| V3 | Composition: phases, stingers, themes, map colours | Opus | not started |
| V4 | Polish, budget, docs | Sonnet | not started |

## Ear-test log (originality, direction Section 12)
| Date | Cue | Heard as | Action |
| --- | --- | --- | --- |
| 2026-10-09 | V1 round 1 (A, B, C) | Not liked; bell loud and jarring; wanted the Chaos Theory sound | All three dropped; direction v2.1 and round 2 |
| 2026-10-09 | V1 round 2 | Likes B, noir take; upright too aggressive, horn like a bad piano; wants everything more subtle | B chosen; upright, horn and stab softened; levels down |

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
  - Soundfont: Michael allowed a CC0 sample set (2026-10-09) for brass, strings and timpani; rules in direction Section 13
    (licence log in `music-sources.md`, at most 4 MB bundled, synthesis kept as fallback and A/B). CLAUDE.md and bible S7
    need the exception written in when Michael merges.
  - The M0 motif (D F E Bb A) may be one of the three V1 candidates if it still fits the new rules.
- Next: Michael reviews the direction. On approval, V1 (Opus): three candidate motifs, each on a bell, as the Alert
  brass hook over a simple beat and as the menu's opening 8 bars; a "Motif picker" in the lab; a 60 s WAV of each. STOP.

---

## Stage V1 report (the motif first)
- Done:
  - `src/audio/music/candidates.ts`: three candidate motifs (direction v2 5.1), each with a resolved and a broken form, and
    the three takes the picker plays: **bell** (72 BPM: statement then resolved on the FM bell over a low drone, hall and dub
    delay), **hook** (168 BPM: one bar of beat and distorted bass ostinato, the hook on synth-brass, answered by pipe and plate
    hits in its rhythm, the hook twice more with a snare build, a final hit) and **menu** (80 BPM: brass swell over strings,
    sub and timpani on Dm | Bb | Gm | A Dm, vibes answer, strings doubling an octave down, resolved form home).
  - `src/audio/music/orchestra.ts`: the first synth-orchestral voices from direction v2 Section 4: `brass` (hook), `brassSwell`,
    `strings` (seamless loop, seven drifting saws), `bellFM`, `vibes`, `timp`, `kickBig`, `snareGated`, `midbass`. All rooted on
    D, merged into the library.
  - Lab: a **Motif picker** section comes first: per candidate, Play (all three takes, about 57 s), Bell, Hook, Menu and a
    60 s WAV. Picker events go through a queue fed by the lookahead, so Stop and the state buttons end a take cleanly. The
    old M0 ear-test buttons are gone (candidate A is that motif).
- The candidates (pitches from D4; written for this project from the rules):

  | Id | Name | Notes | Character | Resolved |
  | --- | --- | --- | --- | --- |
  | A | Lights Out | D F E Bb A | The M0 motif, F now held across the beat (rule 2). Falls a tritone. | D F E C D |
  | B | Searchlight | D D A Ab F E D | Two pick-ups, a leap to A slipping to the tritone, a falling line home. Most hook-like. | Ab -> G |
  | C | Undertow | D Eb D A C Bb A | A semitone rub on D, a drop to low A and a sigh back to it. Dark, ostinato-friendly. | Eb -> E, ends on D |

- Files: `src/audio/music/{candidates,orchestra}.ts` (new), `library.ts`, `music.ts`, `musicLab.ts`, `offline.ts`,
  `tests/music.test.ts`, `scripts/e2e-music.mjs`, `docs/systems/testing-tools.md`, `docs/audio/music-direction-v2.md`
  (rule 3: resolved by one or two notes), this file.
- Decisions:
  - Samples (Michael allowed CC0): not in V1. The candidates are judged on melody; V2 brings the sample set and the
    sample-versus-synthesis A/B, so V1 did not download anything.
  - The takes are fixed arrangements (no seed), so A, B and C are compared on equal terms.
  - Library budget test raised to 100 s (direction v2 4.8).
- Tests:
  - `tests/music.test.ts` (+5): every candidate meets the rules (4-7 notes, within a ninth, starts and ends on D, F or A, a
    minor second or tritone, a held off-beat note, resolved form same rhythm and lands on D, broken form), takes are
    deterministic and use only library sounds within +-7 semitones of each root (vibes up an octave), all three takes fit 60 s,
    voice cap never reached by any take, brass and bell roots, strings loop joins cleanly. `npm test` 652 pass.
  - `scripts/e2e-music.mjs` passes on phone emulation and desktop: picker first, each take plays, every 60 s candidate render
    peaks at or below -6 dBFS (about -6.7 dBFS peak, -13.8 dBFS RMS) with at most 16 voices; the M1 checks still pass.
  - `npm run lint` clean, `npm run build` ok.
- Measurements: the nine new voices render in about 140 ms in node; whole library 0.87 s in headless Chromium on the PC.
  **iPhone render time: pending Michael's run** (budget 1.5 s).
- Open issues:
  - **Listening is the test.** Pitches were checked by measurement only (brass 292.7 Hz for D4, strings 146.8 Hz, midbass
    73.3 Hz).
  - Ear test (direction v2 Section 12): for each candidate, does it remind Michael of a known theme? Log it in the table above.
  - The takes are sketches of the motif in context, not the V3 composition.
- Next: Michael picks A, B or C (or asks for more). Then V2 (Sonnet): engine upgrade on the chosen motif. STOP.

### V1 round 2 (Chaos Theory-led)
- Michael (2026-10-09): did not like any round 1 motif; the bell was loud and jarring; "update to reflect chaos theory
  soundtrack".
- Done:
  - Direction v2.1 (`music-direction-v2.md`): Chaos Theory now sets the sound, the melody and the arrangement; MGS keeps
    only the phase structure. The motif becomes a low, dark **figure** for bass and muted horn (rules 5.1 rewritten);
    Caution moves to 84 BPM (half of Alert's 168); menu 70 BPM; Alert's hook becomes a reese riff answered by chopped string
    stabs; no bright bells, no heroic brass, no fanfares; a new principle: no bell or tone louder than the beat.
  - `orchestra.ts`: removed the bright FM bell, vibes and the synth-brass; added `upright` (Karplus-Strong double bass),
    `horn` (muted, dark, smears down), `stab` (chopped string fifths, 12-bit grain), `swell` (reversed stab), `darkbell`
    (soft harmonic FM, low-passed).
  - `candidates.ts`: three new figures and three new takes: **sneak** (84 BPM swung downtempo: figure on upright, then
    horn; crackle and low pad), **break** (168 BPM chopped breakbeat: figure on the reese, answered by stabs and plate),
    **noir** (70 BPM menu opening: rain, low strings, bass, horn, a reversed swell into stabs, resolved on horn). The
    soft bell appears once per take, quietly (gain 0.15-0.18, mostly reverb).
  - Takes play 4 dB quieter than round 1 (the 60 s renders now about -16 dBFS RMS, peak -7 dBFS).

  | Id | Name | Notes | Character |
  | --- | --- | --- | --- |
  | A | Wire | D D Eb Ab G F | A semitone creep up, a jump to the tritone, a slow slide down to F, left hanging. |
  | B | Dead Drop | D D F Eb C D | A low swung bass riff circling D; the most groove-led. |
  | C | Long Night | A Ab G F D | A slow chromatic fall from A through the tritone to D; sparse. |

- Tests: unit tests updated for the new instruments and takes (`npm test` passes); `scripts/e2e-music.mjs` passes on phone
  emulation and desktop (each take plays; 60 s renders peak -7.1 dBFS, at most 16 voices; no console errors). Lint and
  build clean. Pitches measured: horn 148 Hz (D3), upright 73.5 Hz (D2), stab D-rooted fifths, dark bell 294 Hz (D4).
- Next: Michael listens and picks A, B or C, or asks for more. STOP.

### V1 round 2, revision (subtle)
- Michael (2026-10-09): likes **B noir**; the first instrument (upright bass) is too aggressive, the second (horn)
  sounds like a bad piano; make it all more subtle.
- Done:
  - **B "Dead Drop" (D D F Eb C D) is the chosen figure**; the noir take is the reference mood. Recorded in direction 5.1
    with a new principle 8: subtle.
  - `upright`: a soft finger pluck (doubly low-passed excitation, 3 ms onset, no click), low-passed at 700 Hz, barely
    clipped.
  - `horn`: rebuilt as a soft, breathy horn: six mellow additive harmonics, a 220 ms swell with no strike (measured peak at
    197 ms), breath noise, late vibrato, low-pass 1.1 kHz. No FM, no clipping (the FM attack is what read as a piano).
  - `stab`: 12 ms attack, darker filter, less clipping.
  - Noir mix: bass, horn, stabs, swell, kick, rim, booms and the bell all 3-5 dB lower, more reverb; horn notes release over
    0.35 s. Sneak's bass and horn lowered to match. Take level -14 dB (was -12). Break left punchy (it is Alert).
- Tests: `npm test` 652 pass, lint and build clean, `scripts/e2e-music.mjs` passes (candidate B 60 s: peak -7.3 dBFS,
  RMS -18.4 dBFS, 16 voices).
- Next: Michael listens to B noir again. On approval, V1 closes and V2 (Sonnet) builds the engine around Dead Drop and the
  noir mood. STOP.

### Side task: adaptive score reference (2026-10-09)
- Michael asked for a standalone architecture and code framework (140 BPM, stealth / alert / combat, vertical mixing,
  horizontal re-sequencing, `updateAlertLevel`). Written as `docs/audio/reference/adaptive-score-reference.ts` (Web Audio,
  TypeScript). **Not wired into the game**; the agreed direction (five phases, 84 / 168 BPM, subtle noir) is unchanged.
- Checked: strict typecheck and lint clean; run live in headless Chromium: all stems exactly on the integer grid (329,136
  frames per 4-bar loop at 48 kHz), transitions on beat / bar / phrase boundaries as designed, scheduled 120-570 ms ahead;
  under a main-thread stall (game booting on the same page) one boundary was missed and re-planned to the next bar instead
  of starting out of phase.
