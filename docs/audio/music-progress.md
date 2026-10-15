# Night Shift - music progress

**Current direction: V4** (Michael's brief of 2026-10-15): one main theme, a menu theme and one adaptive mission score,
all synthesised in code. Research `docs/music/research.md`, design `docs/music/score-design.md`, code
`src/audio/score/`, test page `/music-test.html`. Everything below the V4 report is history.

## V4 status
| Step | Name | Status |
| --- | --- | --- |
| 1 | Research | done (`docs/music/research.md`) |
| 2 | Design | done (`docs/music/score-design.md`) |
| 3 | Audition sketches and test page | done; Michael: loves Hook A alone, dislikes everything else |
| 3b | Round 2: Hook A with one partner at a time | done; Michael: hates all but 5 (guitar), which is still too aggressive; Hook A too loud |
| 3c | Round 3: subtle Hook A and subtle guitar | done; Michael: not sure it fits the feel of the game |
| 3d | Round 4: ten hooks to choose from | done; Michael: not liking anything yet; asked for MGS1 alert / escape style |
| 3e | Round 5: Alert hooks in the Metal Gear Solid spirit | done; Michael: "absolutely all wrong" |
| 3f | Round 6: orchestral, Hans Zimmer spirit, real recorded instruments | done; Michael: loves 3 (Night Shift) strings only; hated 1 and 2 |
| 3g | Round 7: strings-only variations on Hook A (in-game layers, menu), finer layer control | done; Michael: right direction; too much happening at times; the D too loud and aggressive; unsure about the slower ones |
| 3h | Round 8: softer D, lighter variations at 92-120 BPM | done; Michael: add more Hans Zimmer influence again |
| 3i | Round 9: Zimmer pieces (mission, Alert, menu) | done; Michael: likes the Zimmer menu's orchestra, but it strays from Hook A; wants it darker and more stealthy, still epic |
| 3j | Round 10: dark Zimmer menu (two versions) and a dark in-game loop, Hook A on D | done; waiting for Michael's feedback |
| 3k | Round 11: pieces in the style of Brandon Roberts' "Past/Present/Future" | done; waiting for Michael's feedback |
| 4 | Refine the chosen sketch; wire the mission score to guard awareness and the menu theme to the menu | not started |

## V4 round 11 - in the style of "Past/Present/Future"
- **Michael (2026-10-16):** "Can you include some in the style of Past/Present/Future by Brandon Roberts?"
- **The reference:**
  - A track from the *Andor* Season 2 score (Walt Disney Records, 2025), with Maxwell Karmazyn and Nicholas Britell
    as co-composers. A chord site lists about 115 BPM.
  - I could not listen to it, so the style comes from what is known of that score:
    - a minimalist repeating string figure that grows
    - a steady low pulse
    - dark but hopeful harmony
    - long-note melodies
    - a long build
  - Nothing is taken from the track: no melody, chords or rhythm.
- **Done (new CC0 recordings: 44 violin section spiccato):**
  - **Menu theme, Past/Present/Future style** (115 BPM, 40 bars, 84 s, 8 layers):
    - It starts with a soft low pulse (eighths on D in 3 + 3 + 2, kept gentle) and a repeating viola figure.
    - Hook A arrives on D, and the figure grows a step every 8 bars.
    - A new long-note melody lifts over a hopeful G major chord (D Dorian: D minor, G, F, C).
    - Violins double the figure an octave up, and horns, timpani and low drums carry it to the peak.
    - Then it drops back to the pulse.
  - **Mission score, Past/Present/Future style** (115 BPM, 32 bars, 67 s, 9 layers): the same material as a loop,
    with Calm, Cautious, Alert, Evasion, Strings only and Everything on.

## V4 round 10 - darker, closer to Hook A
- **Michael (2026-10-16):** likes the Zimmer menu theme. "It strays a little bit from the A one I like, but the
  orchestra is good. Make it darker / more suitable for stealth but still keep it feeling epic."
- **Done:**
  - **Hook A back on D, unchanged.** In round 9 it followed the chords.
  - **A darker progression over the D pedal:** D minor, B-flat, E-flat (the Phrygian flat second, rubbing against
    the D), D minor.
  - **Everything low:**
    - no bright violin climax; violins only as distant tremolo, and none in the stealthier version
    - low cello tremolo for tension
    - the melody on cellos and violas, with low horns in unison
    - soft trombone swells
    - a low drum heartbeat and timpani
    - a huge but dark final chord
- **Three new pieces, at 96 BPM:**
  - **Menu theme, Zimmer dark** (8 layers).
  - **Menu theme, Zimmer darker and stealthier** (8 layers): no violins; the hook plucked until the big section;
    the melody on violas, then cellos; a smaller ending.
  - **Mission score, Zimmer dark** (9 layers): the same material as the in-game loop, with Calm, Cautious, Alert,
    Evasion, Strings only and Everything on.
- **Balance:** the first render had the melody and horns over the hook. They are down 2-3 dB and the tremolo is up
  about 5 dB. The melody now measures 2-4 dB over the hook: long notes measure louder than short plucked ones.

## V4 round 9 - more Hans Zimmer
- **Michael (2026-10-16):** "Can you add more influence from Hans Zimmer again."
- **Done:** three new pieces, still led by strings on Hook A, with the D kept gentle:
  - **Mission score, Zimmer** (92 BPM, 8 layers):
    - low-string swells that breathe in from nothing over each chord
    - a soft 16th-note pattern in the violas on chord tones (middle register, not the low D)
    - the hook following a broad D minor, B-flat, F, C progression (i, VI, III, VII)
    - high violins held
    - the melody on cellos and violins in octaves
    - warm horn swells and a soft drum heartbeat, as their own layers
    - Presets: Calm, Cautious, Alert, Evasion, Strings only, Everything on.
  - **Alert, Zimmer drive** (120 BPM, 7 layers): a relentless 16th pattern on cellos and violas that rises a
    semitone every 4th bar, the hook, big swells, violin tremolo, the melody in octaves, horn and trombone swells, low
    drums and timpani on the accents.
  - **Menu theme, Zimmer** (96 BPM, 8 layers): one cello note swelling out of silence; the hook plucked, then bowed;
    the melody on cellos and horns, then violins in octaves; a huge D minor chord that dies away.
- **Balance:** the first render had the horns as the loudest layer, about 8 dB over the hook. Horn velocities are
  down and the hook is up, so the horns now sit about 2.5 dB under the hook (about 6 dB under in the Alert mix).
- **Measured:** each piece renders in 9-12 s.

## V4 round 8 - softer D, lighter variations
- **Michael (2026-10-16):**
  - "Definitely heading in the right direction."
  - Sometimes too much is happening.
  - "The D is really loud and aggressive."
  - Not sure he likes the slower ones (the 76 and 84 BPM menus).
- **Softer D everywhere:**
  - The hook's first note leads at 0.9 instead of 1.0 (the others are at 0.8).
  - The held low D is about 2.5 dB lower, and the driving sixteenths about 2 dB lower.
  - The Alert and Evasion presets pull the drive and the low D down a further 4-6 dB.
- **New variations, all 92 BPM or faster:**
  - **Mission score, lighter** (92 BPM, 7 layers): the hook on cellos only; quiet chord roots instead of a
    constant D; violas doubling the walk-up; soft high chords; the melody on violins alone.
  - **Mission score, moving** (96 BPM, 6 layers): the hook follows the chords (D, B-flat, G, A), so it travels
    instead of sitting on D. A light bass, and the melody on cellos and violas.
  - **Alert, lighter** (120 BPM, 5 layers): no driving sixteenths and no low D; short chord stabs instead.
  - **Menu theme, at game speed** (96 BPM, 5 layers): plucked, then bowed and following the chords; the melody with
    violas a third below; no big climax.
- The slower menus stay, labelled "(slower)".
- **Measured:** each piece renders in 6-15 s. All local renders total 80 MB, git-ignored.

## V4 round 7 - strings only, in layers
- **Michael (2026-10-15):**
  - Loves round 6's piece 3, "Night Shift", with the brass, organ and percussion muted: strings only.
  - Hated pieces 1 and 2.
  - Wants variations for the dynamic in-game music and the main menu, and more control over the layers.
- **Done:** `src/audio/score/orch/pieces.ts` rewritten. Every piece is now strings built on Hook A, rendered as one
  file per layer.
  - **Mission score** (92 BPM, 83 s, 9 layers):
    - Hook A pizzicato
    - Hook A on basses, on cellos, and on violas an octave up
    - driving sixteenths on D
    - a low held D
    - held chords (D minor, B-flat, G minor, A)
    - high tremolo
    - the motif melody on violins
    - Presets (game states): Calm (pizzicato, low D, a touch of tremolo, quiet), Cautious, Alert (everything),
      Evasion (no melody, no high hook).
  - **Alert, faster** (120 BPM, 64 s, 8 layers): presets Alert and Evasion.
  - **Menu theme, grand** (84 BPM, 91 s, 7 layers): the hook, then the melody on cellos, then violins, a climax, a
    long final chord.
  - **Menu theme, brooding** (76 BPM, 101 s, 5 layers): pizzicato hook, low D, the melody on cellos, tremolo swells.
  - **Round 6 "Night Shift" in layers** (9 layers): presets "Strings only (your pick)" and "Everything".
- **New CC0 recordings (152):** cello section and contrabass pizzicato, viola section spiccato and tremolo.
- **Test page:**
  - Sections for in-game, menu and the reference piece.
  - One sticky Layers panel: preset buttons that fade over about a bar, plus a slider (0-150 %), Mute and Solo per
    layer, "All to 100%" and "Clear solo".
- **Decision:** the rendered audition audio (51 MB) is no longer committed.
  - `src/assets/music/orch/` is git-ignored, and `npm run music:orch` rebuilds it from the samples in about a minute.
  - The page loads without it and says how to render.
- **Measured:**
  - Render takes 9-17 s per piece.
  - Everything on is -16 to -20 dB loudness, with peaks at -1 dBFS.
  - The Calm preset is set about 4 dB lower than in round 6's settings.

## V4 round 6 - orchestral, Hans Zimmer spirit, real instruments
- **Michael (2026-10-15):**
  - Round 5 was "absolutely all wrong".
  - "I like Hans Zimmer, orchestral, epic."
  - Asked to choose, he picked:
    - **real orchestra recordings** (CC0), which **replaces the brief's "no samples for now"**
    - The Dark Knight and Interstellar as the closest Zimmer sound
- **Done:**
  - **Samples:** `scripts/music/orch-samples.json` lists 325 CC0 recordings from VSCO 2 CE (see
    `docs/audio/samples.md`). They are fetched into `.music-cache/orch/`, git-ignored, 536 MB.
  - **Renderer:** `src/audio/score/orch/` is an offline renderer, run with `npm run music:orch`.
    - `bank.ts`: zones and pitches. VSCO names sound an octave above their label, the organ is mapped by key number,
      the timpani are measured. All checked by pitch detection.
    - `play.ts`: nearest-sample varispeed, long notes extended by crossfaded loops, round robins, cymbal swells timed
      to land on the beat.
    - `pieces.ts`: the three pieces.
    - `cli.ts`: hall reverb per section, one master gain, MP3 stems.
  - **Three original pieces**, each growing from quiet to huge:
    - **Pursuit** (The Dark Knight side, 120 BPM, 80 s): a 16th-note low-string ostinato in 3 + 3 + 2 accents, a
      horn motif D, A, B-flat, A, low brass hits every 2 bars, timpani, big drum, cymbal swells, gong, a final hit.
    - **Long Night** (the Interstellar side, 84 BPM, 91 s): a repeating pipe-organ pattern over D minor, B-flat,
      F and C, low strings, then a long-note violin melody, horns, full organ, timpani.
    - **Night Shift** (both, 92 BPM, 84 s): Hook A as the low-string ostinato, organ chords, the horn motif, brass
      hits.
  - **Stems:** strings, brass, organ and percussion, as 128 kbps MP3s in `src/assets/music/orch/` (15 MB) with
    `orch.json`.
  - **Test page:** the pieces come first, with a slider per section. Rounds 1 and 3-5 are in collapsed boxes.
- **Measured:**
  - Render takes about 11 s per piece.
  - Each piece builds 8-16 dB from start to climax.
  - The full mix is about -18 dB loudness, with peaks at -1 dBFS.
  - Percussion is trimmed up 5 dB.
- **Open:**
  - The brief's "no samples" rule and the CLAUDE.md "no external audio" hard rule need Michael's written exception
    if this direction is kept. He chose real recordings here.
  - 15 MB of MP3 is fine for a test page. The game version needs a size budget.

## V4 round 5 - Alert hooks in the Metal Gear Solid spirit
- **Michael (2026-10-15):**
  - He asked to see the MGS1 alert and escape hooks. Declined: they are copyrighted, and the project's rule is that
    every note is original. He was pointed to the official soundtrack instead.
  - He then asked for original hooks in that spirit, with alternative versions to give feedback on. "I'm not liking
    anything at the moment."
- **Done:** `src/audio/score/mgs.ts` has four original Alert hooks, each 4 bars in D minor at 144-160 BPM:
  - **Breach:** a repeated-note pickup into a held high D, then a step-down sequence.
  - **Lockdown:** a figure that climbs one step per bar.
  - **Snapshot:** a syncopated call to the tritone, with a falling reply.
  - **Countdown:** four ticking notes, then a break-out.
- **Versions of each:**
  - the hook alone (plain tone)
  - Alert with the hook on low brass
  - Alert with the hook on a new 90s console-style synth lead
  - Alert with the hook on horns
  - Evasion (drums thinned, bass pulse and rare stabs, no hook)
- **Alert arrangement:** a driving kick, a snare on 2 and 4 with military ghost notes, 16th hats, rolls every 4 bars,
  an eighth-note bass pulse with octave pops, and brass stabs on beat 1 and the "and" of 2.
- **Measured:**
  - Alert loops about -19 dBFS, Evasion about -27 dBFS.
  - Each version renders in 0.4-3 s.

## V4 round 4 - hooks to choose from
- **Michael (2026-10-15):** "Not sure it's working for the feel of this game; give me various hooks to decide
  between."
- **Done:** `src/audio/score/hooks.ts` has ten bass hooks, each written for this project, in D, at 76-100 BPM. Each
  plays alone at the round 3 "soft" level, on the soft upright or on a new dark round synth bass (a sine with a quiet
  octave, low-passed, soft attack).
  - Hook A, for comparison
  - Creep
  - Tripwire
  - Walking noir
  - Pulse
  - Off-kilter
  - Two notes
  - Phrygian spy
  - Hook A darker
  - Cold steel
- Rounds 1 and 3 stay in collapsed boxes on the page.

## V4 round 3 - subtle
- **Michael (2026-10-15):**
  - Hook A is "very loud". He wants subtle alternatives.
  - He hates every round 2 partner except 5 (the guitar), which is OK but still a little too aggressive.
  - "If it was all a little more subtle it would be cool."
- **Done:** `hookLab.ts` now has:
  - **Seven subtle versions of Hook A:**
    1. the original, for comparison
    2. soft fingers
    3. ghosted
    4. sparse
    5. slower (80 BPM)
    6. from another room
    7. on a soft palm-muted guitar
  - **Three gentler takes on loop 5:**
    1. the same part, clean and soft
    2. sparser
    3. distant
- **New code-made voices:** a soft upright (darker string, 8 ms finger attack, low-pass at 650 Hz), a clean soft guitar
  and a soft palm-muted guitar. None of them is driven.
- **Levels:** the soft versions are 8-11 dB quieter than the original, with peaks 9-13 dB lower.
- The round 2 partners are removed from the page and the code.

## V4 round 2 - Hook A first
- **Michael's feedback (2026-10-15):**
  - He loves "Hook A alone" ("fantastic and very catchy").
  - He does not really like anything else.
  - He especially dislikes the "air sound" (the filtered-noise wind or the synthesised sustained strings).
- **Decisions:**
  - Hook A (the walk-up bass riff on the plucked upright) becomes the main idea.
  - The round 1 themes, menus and missions are kept only in a collapsed "Round 1" box on the test page.
  - No sustained synth strings and no noise air.
- **Done:** `src/audio/score/hookLab.ts` has eight 16-bar loops. Each is Hook A plus one partner:
  1. heartbeat kick and brushes
  2. chopped half-time break
  3. downtempo breakbeat
  4. dark electric piano (new code-made voice)
  5. muted and open guitar (new plucked voice)
  6. metal percussion
  7. Alert speed: the hook doubled by a dark bass over a driving break
  8. As 7, plus guitar and piano stabs
- **Measured:** each loop renders in under 1 s.
- **Next:** Michael says which partners work. The full menu theme and mission score are then rebuilt from Hook A and
  the approved partners.

## V4 Steps 1-3 report
- Done:
  - Research summary with the rules the score follows (web plus own knowledge; MGS mechanics and hysteresis from my
    own knowledge, no reliable source found).
  - Design: two sketches, each with its own theme, hook, menu theme and mission score. A "Long Shadow" (D minor,
    cinematic, 80 / 92 / 138 BPM). B "Cold Wire" (C minor Phrygian, noir, 74 / 84 / 126 BPM).
  - `src/audio/score/`:
    - `theory.ts`, `themes.ts`: notes and the two themes.
    - `arrange.ts`: every layer as timed events.
    - `director.ts`: the state ladder with hysteresis.
    - `synth.ts`: pure drum hits, plucked bass, short strings and noise beds.
    - `instruments.ts`: Web Audio strings, brass, horns and bass.
    - `render.ts`: offline render per layer, folded into a seamless loop and scaled to a target loudness.
    - `player.ts`: loops, fades on beat and bar lines, stinger, duck, mid cut.
    - `worldSim.ts`: the game's footstep, a guard murmur and a bottle cue.
    - `lab.ts`: the page.
  - `music-test.html`: a Vite page linked from nowhere in the game.
- Decisions:
  - **The V3 lab and its CC0 stems are untouched.** V4 is separate, so nothing is lost if Michael wants to compare.
  - **No audio library.** Plain Web Audio plus pure-JS sample maths was enough.
  - **Short, repeated notes are cached samples.** Drums, plucked bass and short strings are computed once as samples.
    With oscillators per note, a layer took up to 11 s to render.
  - **Notes are scheduled 4 s ahead of the offline render, and finished notes are disconnected.** Without this,
    thousands of idle nodes made the render roughly 5 times slower.
  - **Calm and Cautious share one loop.** Alert is a second loop at 1.5 times the tempo, restarted from its top two
    beats after the stinger.
- Tests: `tests/score.test.ts` (21). Full `npm test` 665 pass; lint and build clean. No e2e suite yet (the page is
  standalone; the integration step adds one).
- Measured (PC, Chromium, renders run 4 at a time):
  - **Render time:**
    - Mission A about 9-14 s, Mission B about 17 s.
    - Menus 11-13 s.
    - The themes alone under 1 s.
  - **Loop lengths:**
    - Menu A 96 s, Menu B 104 s.
    - Mission A 83.5 s (both loops), Mission B 91.4 s.
  - **Mixed levels on the music bus** (before the music volume):

    | State | A average | B average | A peak |
    | --- | --- | --- | --- |
    | Calm | -34.0 dBFS | -34.1 dBFS | -13.1 dBFS |
    | Cautious | -26.6 dBFS | -26.7 dBFS | - |
    | Alert | -16.3 dBFS | -16.4 dBFS | -1.5 dBFS (the limiter catches it) |
    | Evasion | -19.7 dBFS | -19.8 dBFS | - |

  - **Calm leaves the footstep band almost empty:** its 0.9-4 kHz band is 18 dB below its full level. In Cautious that
    band is 6 dB below, and in Alert 9 dB below.
  - **Menu build:** about -26 dBFS in the intro, rising to -16 dBFS in the final statement.
- Open issues:
  - **Listening is the real test.** I cannot hear the result. Pitches, levels and timing were checked by numbers only.
  - **Ear test for originality.** Does either theme or hook remind Michael of a known tune?
  - **Memory:** a mission sketch holds about 150-250 MB of decoded audio, which is fine on the PC. The game will need
    lower sample rates or fewer layers on phones.
- Next: Michael listens and picks a direction. Then Step 4: refine the chosen sketches and wire them into the game.
  STOP.

---

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

### V1 round 3: tritone figures
- Michael (2026-10-09): really likes the tritone in A noir; not sold on any figure yet; wants to see various options.
- Done: five new figures built around the tritone, in the picker next to A, B and C (same three takes; noir is the one to
  judge):

  | Id | Name | Notes | Character |
  | --- | --- | --- | --- |
  | D | Wire Drop | D D F Ab G F | B's low swung pick-ups, then A's climb to the tritone and slide to F (A and B blended). |
  | E | Lights Out | D Ab G A | Falls a tritone at once, sighs to G, opens on A. Most spacious. |
  | F | Crossed Line | A Eb D F Eb D | Opens on the tritone itself (A down to Eb), then circles D through the flat second. |
  | G | Two Shadows | D Ab F B A D | Two tritones in a row (up D-Ab, down F-B), then home. Most restless. |
  | H | Pacing | F Ab G Ab D | Paces on the tritone (Ab G Ab) then drops home. Hypnotic, ostinato-like. |

- Tests: every figure meets the rules (unit tests); `npm test` and lint pass.
- Next: Michael picks a figure (or a blend). STOP.

### V1 round 4: variations on A, and a tempo control
- Michael (2026-10-09): did not like D-H (round 3). Asked what Seed is and for more tempo adjustment.
- Done:
  - D-H replaced by five variations on A "Wire" (the only thing he likes so far is A's tritone, the Ab over D):

    | Id | Name | Notes | Change from A |
    | --- | --- | --- | --- |
    | D | Wire, held | D Eb Ab G F | The Ab arrives off the beat and is held, hanging over the D longer. |
    | E | Wire, sunk | D D Eb, low Ab G A | A's rhythm; the tritone drops below the D and climbs out to a low A. |
    | F | Wire, slow | D Eb Ab G F | Half the pace; the tritone lands late in bar 1 and slides across the bar line. |
    | G | Wire, short | D D Eb Ab F D | From the tritone straight down to F and home; closes the loop. |
    | H | Wire, twice | D Eb Ab, D Eb Ab F | Reaches the tritone twice, the second time falling to F. |

  - Lab **Tempo** section: -10 %, -1 %, +1 %, +10 %, Reset (50-150 %). It scales the picker takes and Combat in time,
    never in pitch; the note shows the resulting BPMs (noir, sneak, break and Combat). WAV exports carry the tempo in the
    file name when it is not 100 %.
  - "Seed" renamed **Variation** and moved under State, with a note: it changes the random choices in Calm and Combat
    only, not the motif picker.
- Tests: unit test for tempo scaling (time scales, pitch does not); `npm test` 653 pass; lint and build clean;
  `scripts/e2e-music.mjs` passes (tempo +1 % gives Combat 170 BPM and noir 71; reset).
- Next: Michael listens to D-H noir (with the tempo control). STOP.

### V1 round 5: the spy take (GoldenEye N64 pause-menu feel)
- Michael (2026-10-09): "can you update to better reflect goldeneye n64 pause menu theme?"
- Done:
  - Direction v2.2 note (Section 1): a spy-lounge colour beside noir, feel only (no melody or vamp from that theme or any
    spy-film theme).
  - New voices: `vibes` (soft lounge vibraphone, gentle strike, 4.5 Hz tremolo, 3 kHz low-pass) and N64 sampler copies
    `hornN64`, `uprightN64`, `vibesN64` (24 kHz sample-and-hold, 12-bit, 7 kHz low-pass, light saturation).
  - New take **spy** (96 BPM, swing 64 %) for every figure: brushes and a skipping ride, a walking upright bass, vibes
    comping on Dm(maj7) | Dm(maj7) | Bbmaj7 | A7(b9) | Dm(maj7) | Dm6 | Em7(b5) | A7(b9), the figure on the muted horn,
    echoed on vibes, resolved at the end. "Play" now runs spy then noir; sneak and break keep their own buttons.
  - The tempo control and its note include spy.
- Tests: `npm test` 653 pass; lint and build clean; `scripts/e2e-music.mjs` passes (spy plays; 60 s renders peak -8 to
  -9.5 dBFS, RMS -21 dBFS, 16 voices). One run under heavy PC load counted 5 late events; the rerun had 0 on both
  devices.
- Next: Michael listens to the spy takes. STOP.

### S1 (direction v3): offline stems and the sketch picker
- Michael (2026-10-09): does not like where the music is going; target the feel of the Chaos Theory score; V2 too
  melody-first and too clean. Pause V2; texture and rhythm first; recorded CC0 material; chopped breaks; stems rendered
  offline and crossfaded by threat; three sketches in a picker.
- Done:
  - Tag `music-v2-archive` (pushed) at the V2 head; the V2-only code deleted in its own commit (motif system, candidates,
    orchestra, library, conductor, engine, scheduler, voices, offline export, mix). Kept: rng, dsp, wav, lab entry
    points, `Music` facade (now a paused no-op), `e2e-music`.
  - `docs/audio/music-direction-v3.md`; `docs/audio/samples.md` (107 CC0 files from VSCO 2 CE and VCSL, pinned commits).
  - `scripts/music/`: `samples.json`, `fetch-samples.mjs` (`npm run music:fetch`), `render.mjs` (`npm run music:render`),
    `encode-mp3.ps1` (Windows Media Foundation MP3, no ffmpeg).
  - `src/audio/music/render/` (pure, node): WAV reader, circular canvas, varispeed hits, granular stretch, FDN reverb,
    dub delay, tape, glitch edits, dust from recorded grains, break performance and chopping, loudness-based layering,
    the three sketches. `src/audio/music/stemMix.ts` (threat to gains), `sketchPlayer.ts` (decode at 32 kHz, three
    synced looping stems, crossfades), `musicLab.ts` (the sketch picker).
  - Stems: `src/assets/music/sketches/` (9 MP3s, 8.79 MB, plus `sketches.json`).
- Measured (PC, headless Chromium): 0.96 MB per stem-minute; load 0.2-0.35 s per sketch; 47 MB decoded per sketch;
  60 s of three-stem playback renders offline in about 0.1 s (V2 combat: 13.9 s, plus 1.07 s main-thread library render).
  Loop seams: at most 0.06 of the largest nearby sample step. **iPhone: pending Michael's run.**
- Tests: `tests/musicRender.test.ts` (17: WAV reader, canvas wrap, varispeed, granular and effect seams, glitch edits,
  grid, break chopping, loudness gating, stem mix); `scripts/e2e-music.mjs` rewritten (picker on phone and desktop, each
  sketch loads three stems, state buttons and ladder, seams, playback cost, no console errors).
- Phone check (Michael): open the lab on the iPhone, play A, B and C with the speaker and with headphones, move the
  threat; note the load time on the status line, any crackle at the loop point (every 60 s), and whether the bass reads
  on the speaker.
- Next: Michael listens and picks. STOP.

## S1.1 - alert tension (Michael: "too tame for when you are caught and under fire")
- All three alert stems gain a shared tension layer (`tension()` in `render/sketches.ts`): a dissonant tremolo-string cluster
  (D, Eb, Ab), a reversed bowed-cymbal swell with accelerating ticks and a timpani roll into every fourth bar line, a
  distorted pizzicato root on every eighth (A and B), a two-note tritone metal alarm on the off-beats, and electrical
  crackle from CC0 zap samples. Tape drive on the alert stems raised (A 2.4, B 2.6, C 3.0). Calm and caution are unchanged.
- Next: Michael listens again. STOP.

## S1.2 - Drift urgency (Michael: Drift is good, needs more urgency in caution and alert)
- A caution: kick on every beat (soft), shaker on nearly every sixteenth off-beat, the riser rolls and an eighth-note
  distorted pizzicato pulse underneath (`tension(..., only: true)`), a louder tremolo swell.
- A alert: the pulse doubles to sixteenths. B and C unchanged.

## S1.3 - tighter beats (Michael: style ok, beats not exciting and a bit random)
- Drums are now deliberate: each voice uses fixed samples (one kick for the downbeat and one for the rest, one backbeat
  snare, ghosts and hats by position), timing and velocity jitter cut to a few ms and a few percent, and the chop plan is
  fixed: three bars of groove, a written fill bar closing each four (a snare build and extra kicks), a beat-repeat on bar 6
  of each eight, glitch edits only on fill bars. The metal accents are on fixed beats. A's alert kick is syncopated
  (1, a of 1, & of 2, & of 3, a of 4). Break patterns rewritten in all three sketches.

## S1.4 - Breakline alert intensity (Michael: B calm and caution good, alert needs to be much more upbeat and intense)
- B alert has its own break performance (calm and caution keep theirs): kick on every beat plus pushes, accented
  sixteenth hats, busier ghosts, a snare roll closing every second bar, harder drive. The sub follows the kick, the
  pizzicato pulse runs in sixteenths and the tension layer sits 2 dB louder. A and C unchanged.
