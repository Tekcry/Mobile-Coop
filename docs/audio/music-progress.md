# Night Shift - music progress

**History.** Michael's current decisions are in `docs/DECISIONS.md` (G1 onward), which wins where this file differs; this file is kept as the record of its run.

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
| 3k | Round 11: pieces in the style of Brandon Roberts' "Past/Present/Future" | done; Michael: likes it in general, but too quick and upbeat for stealth |
| 3l | Round 12: Past/Present/Future slow, dark and epic (80 and 70 BPM) | done |
| 3m | Round 13: more Alert faster versions, slower menu copies, "Alert, under fire" | done; see round 14 for his ratings |
| 3n | Round 14: bass for Under fire; calmer, quieter menus | done |
| 3o | Round 15: keepers chosen; adaptive sets around Under fire; menu alternatives; everything else removed | done |
| 3p | Round 16: Heartbeat only; quieter Calm; heartbeat and broken hook as Cautious; clean loop openings | done |
| 3q | Round 17: two cinematic sneaking sets (Shadows, Gathering storm) | done |
| 3r | Round 18: hook forward in Alert; broken-hook sets; lighter menus without cello | done; Michael: plucked is good; the low bed in Calm is too much; Cautious change good |
| 3s | Round 19: research on stealth ambience; much subtler Calm mixes | done; Michael: near silence OK but too far apart and too quiet; wants it catchier, still broken |
| 3t | Round 20: catchy broken Calm (call and answer every 2 bars) | done |
| 4a | Integration: menu theme, Cautious, Alert and Evasion in the game | done; Michael played it |
| 4b | Fixes from the first play: music default 30 %, gentle menu fade, a build into Alert, menu loop blends | done |
| 4c | Footsteps merged; music 15 %; the fade cut fixed; the menu theme as a whole piece | done |
| 4d | Round 23: Calm and Cautious alternatives on the hook thread (test page only) | done; waiting for Michael's picks |
| 4e | Round 24: the menu theme extended to 64 bars (drums, a peak, a seamless loop) | done |
| 4f | Round 25: more epic and upbeat (low drums only, sixteenths, epic brass); position slider on the test page | done; waiting for Michael |
| 4 | Refine the chosen sketch; wire the mission score to guard awareness and the menu theme to the menu | not started |

## Note (2026-10-17) - desktop only (relayed)
- The Locomotion Build session relayed Michael's decision (feature/ct-locomotion M21, commit c22e816): Night Shift is
  desktop only ("I want to focus on desktop only performance, ignore phones"). Pad first, then keyboard and mouse.
  No phone budgets, phone checks or touch work.
- For the music: phone checks are no longer pending, and test links are PC only. The game tracks keep decoding at
  32 kHz (it saves memory on desktop too).
- `CLAUDE.md` on this branch is unchanged: Michael gave no preference when asked, and the text reaches this branch when
  feature/ct-locomotion merges.

## V4 step 4f (round 25) - more epic, low drums, a position slider
- **Michael (2026-10-16):** "not epic enough, and i hate the high pitched drum rolls. should feel more upbeat and have
  another layer making it absolutely epic. also add a way for me scroll through the song".
- **Done (`menuLong()`):**
  - **No high drums:** the stick pattern, the stick rolls into each section, the cymbal swells and the timpani roll are
    gone. The drums are now only the big mallet drums (some pitched down like toms), the bass drum and timpani.
    - From bar 41 the groove is busier (16th-note syncopation) with the bass drum on 1 and 3 and timpani on 1 and 4.
    - The fills are big drums in eighths walking down with timpani (D, C, A, A).
    - The downbeats of 41, 49 and 57 land hard.
  - **More upbeat:** the string pulse turns from 3-3-2 eighths into sixteenths (accents 3-3-2) from bar 41 to 56.
  - **The epic layer (new, `epic`):**
    - Hook A on tuba and trombones from bar 41, with short horns on top from 49 and a sub hit under every hook note.
    - Big brass chords (three horns, trombone, tuba) on every chord change at the peak.
    - Low string risers into 41 and 49, and brass impacts on 41, 49 and 57.
  - Presets: Softer (the game mix, epic at 75 %), Softer with no epic brass, Softer with strings and drums only,
    Softer with no drums, Full.
  - **Measured per bar:** 1-8 about -30 dB, 25-32 -21, 33-40 -21, 41-48 -18, 49-56 -15 (the peak, was -17), then
    -22, -24, -26, -26, -28, -29, -31, -30 | back to -30, -31. The join is level.
- **Test page:** "Position" under the keepers. A slider scrolls through any piece playing alone (keepers, "Loop
  alone"), with time and bar shown, plus -8 bars, +8 bars and "Last 4 bars (into the loop)". `ScorePlayer.position()`
  and `seek()` restart every layer at the new point behind a 40 ms dip (no click).

## V4 step 4e (round 24) - the menu theme, extended
- **Michael (2026-10-16):** "extend the main menu theme, make it continue and get more epic and upbeat with drums or
  something, then should loop onto it self smoothly. aim for 100% longer duration."
- **Done:** "Menu theme, extended" (`grandlong` in `pieces.ts`, `menuLong()`): 64 bars at 90 BPM, 170.7 s, twice the
  old 85.3 s. The game's menu track is now this piece's Softer mix as a seamless loop with its clean opening (the
  whole-piece mode from step 4c stays in the code, unused).
  - Bars 1-32: the theme as kept (the hook, the cellos' melody, then violins and the whole section).
  - Bar 31: a drum roll and a timpani roll into bar 33.
  - Bars 33-40: the drums (big drum on 1 and 3, sticks, timpani on the chord changes), a string pulse in 3-3-2
    eighths, the melody on horns with the cellos.
  - Bars 41-56: the full drum pattern with the bass drum, a driving bass and sub, low brass swells, the melody on
    violins an octave up. Bar 49 is the peak (violins, violas, horns and cellos in octaves). Fills lead into 41, 49
    and 57.
  - Bars 57-64: one big hit, then the way down. The drums thin out over 4 bars, the pulse fades, soft low brass and
    chords Dm, B-flat, G minor, the melody once more softly on cellos (its last A leads home). The last two bars
    breathe on the held low D the theme opens with, still ringing when the loop's own low D swells in.
  - **Measured per bar:** 0-7 about -29 dB, 16-31 -22 to -18, 33-40 -20, 41-56 -18 to -16, then -22, -22, -24, -25,
    -26, -28, -30, -28 | back to -29, -29 at the start. The join is level.
- **Files:** `music-menu.mp3` 2.9 MB (was 1.4 MB); all game tracks 7.2 MB.
- The test page lists "Menu theme, extended" with the keepers (presets: Softer, strings and drums only, no drums,
  Full).

## V4 step 4d (round 23) - Calm and Cautious alternatives on the hook thread
- **Michael (2026-10-16):** alternatives for the in-game Calm and Cautious that keep Hook A as the thread without
  burning it out. Calm very subtle (footsteps and guard voices first, no constant low bed, sparse but catchy, broken),
  still epic and film-like. The game's tracks stay as they are until he picks.
- **Done:** a new piece, "Hook thread: Calm and Cautious alternatives" (`thread` in `pieces.ts`, 88 BPM, 32 bars, the
  same timeline as the plucked broken hook), so any Calm pairs with any Cautious.
  - **Calm 1, far cello, the hook at half speed:** one cello (basses under the Ds), dark and far. Half of the hook
    every 8 bars (the whole hook every 16), each eighth a quarter.
  - **Calm 2, plucked call with echoes:** the call (D . D3 D) plucked, two echoes half a bar apart, each softer and
    darker. The answer (C . A) 4 bars later, also echoed. A soft walk-up into the call every 16 bars.
  - **Calm 3, low piano, broken:** soft, pedalled, darkened piano. The call, the answer, the walk-up phrase, a low
    fifth left ringing; 8 notes or fewer per 4 bars.
  - **Calm 4, plucked call, harp answer:** the plucked call, answered 2 bars later by the harp (C . A in two octaves).
    A harp walk-up leads into every other call.
  - **Cautious 1, the hook takes shape:** the broken hook every 2 bars, the whole hook on soft spiccato in bars 6-7 of
    every 8 (it completes before the next call), a quiet off-beat clock and the heartbeat.
  - **Cautious 2, climbing tremolo:** the broken hook every 2 bars, the walk-up, tremolo violas climbing a semitone
    every 2 bars, a timpani heartbeat. No bed and no rub.
  - **Cautious 3, spiccato drive:** the broken hook, the walk-up, a low spiccato drive on D (1, the "and" of 2, 4) with
    basses on the downbeat, a faint rub. It previews Alert's energy.
  - **References:** "Calm: silence (in game now)" and "Cautious (in game now)" (the current game mix, re-rendered in this
    piece).
  - **Levels:** measured gated levels from the rendered stems. Every Calm option is at -30 dB (round 20's Calm was -27,
    "near silence" -35). Every Cautious option is at -22.5 dB (the in-game Cautious is -22).
- **Test page:** section 2 has Calm and Cautious choosers next to the Alert one. They list every sneaking loop's
  options; each piece falls back to its own first. A change replays at once. Hook thread is the first card.
- **Game:** unchanged (game tracks not re-rendered).
- **Tests:**
  - Unit 688 pass. `score.test`'s hit check now uses one expect per hit; it timed out under load with one per sample.
    Other suites only time out under load and pass on rerun.
  - Lint and build are clean. `e2e-score` and `e2e-music` pass (`E2E_PORT=4183`).
- **Session method:** `docs/systems/session-method.md` copied exactly from origin/feature/operators (b3a58ff).
- **Next:** Michael picks a Calm and a Cautious. They become the game's `caution` track and, if Calm is no longer
  silence, a new `calm` track that the player fades in for Calm.

## V4 step 4c - footsteps, 15 %, the fade cut, the menu as a whole piece
- **Michael (2026-10-16):** "menu blend is rough, doesnt line up well. music also still cuts out abruptly entering or
  exiting match. cautious works very well. reduce music to 15% default". Then: bring in the footstep and movement
  sounds from the other session.
- **Done:**
  - **Footsteps:** `feature/footsteps` (movement foley, CC0 recordings) merged into `feature/music`. `gameAudio.ts`
    runs both the foley and the score; the service worker precaches both; `e2e-foley` and `e2e-score` are required.
  - **Music 15 %:** settings `audio.musicV: 3`. An untouched old default (50 % before V4, 30 % from step 4b) moves to
    15 % once; a volume a player chose stays (unit test).
  - **The cut, found:** a probe logged the menu voice's gain through menu -> match -> menu. At the match's first frame
    the gain fell from 1.0 to 0.28 at once, then faded. Cause: a Web Audio ramp runs from the previous automation event.
    After the menu's fade-in had ended, `cancelAndHoldAtTime` added no event, so the fade-out ramp started from the
    fade-in's end (minutes earlier) and was already three quarters down. Every music fade had this bug (the Alert and
    Cautious changes too). Fixed: each fade first sets the current level at its start. The test page's player had the
    same bug and is fixed too. `e2e-score` now checks the menu fade starts from full.
  - **Fade lengths:** into a match the menu fades over 4 s; leaving a match the mission music fades over 2.5 s.
  - **Menu theme as a whole piece:** no loop join to line up. The game plays the full linear render (its quiet opening,
    the diminuendo, the final chord ringing out, a 1.5 s fade on its last tail), rests 3 s, then plays it again. The
    file is 91 s. Measured: it opens from silence (-50, -35, -29 dB per second) and ends -24, -33, -36, -46 dB.
- **Tests:** unit 688 pass, lint and build clean; `e2e-score`, `e2e-foley`, `e2e-music`, `smoke`, `e2e-offline` pass
  (`E2E_PORT=4184`; another session held 4179).
- **Open:** alternatives for Calm and Cautious (the hook as the thread). Phone check pending Michael's run.

## V4 step 4b - fixes from the first play
- **Michael (2026-10-16):**
  - Default the music to 30 %.
  - The menu music cuts out aggressively when loading into a match.
  - The Alert music cuts in very abruptly and still has "some sort of different sound at the start that doesn't seem
    right".
  - Make the main menu music blend into its start and end better.
- **Done:**
  - **Music default 30 %** (was 50 %). Settings get `audio.musicV: 2`; a stored music volume still at the old 50 %
    default moves to 30 % once, and a volume he chose stays.
  - **Menu to match:** the menu theme now keeps playing through loading and fades out over 3.5 s on the first
    running frame of the match. A fade scheduled while the page is busy loading sounded like a cut. The mission tracks
    now decode one after another instead of all at once.
  - **Into Alert:**
    - The "different sound at the start" was most likely the spotted hit itself (a brass D / E-flat cluster with a
      string rip, unlike anything in Under fire). It is gone.
    - The spotted sound is now a two-beat build that rises from soft: timpani roll, sticks in sixteenths, violins and
      violas climbing, low strings swelling, a cymbal swell landing on the downbeat.
    - Cautious fades out under the build. Alert starts at 55 % on its downbeat and settles to full over two beats.
  - **Menu loop blends:**
    - The low strings breathe in for two bars before the hook enters softly and builds.
    - The held chords stop two bars earlier, the last four bars taper (a diminuendo down to 40 %), and the final
      chord swells in softly and fades long.
    - Measured per bar at the join: -15, -18, -20, -22, -22, then -22.5 at the start, then -25 (before: a fall of
      more than 10 dB).
- **Tests:** unit 666 pass, lint and build clean, `e2e-score` passes.

## V4 step 4a - in the game
- **Michael (2026-10-16):**
  - "Commit Alert under fire and main menu theme Grand to the game for now. I want to work on the others."
  - Then he chose: **Cautious = the plucked broken hook's Cautious mix**, **Calm = silence** for now.
  - "The hook is still really good but we should try some alternatives" (for the in-game Calm and Cautious; next).
- **Done:**
  - **Game tracks:**
    - `npm run music:orch` now also mixes the chosen pieces down to one stereo track each, with clean openings, into
      `src/assets/music/game/` (committed, 5.9 MB).
    - The mixes: menu = Grand dialled back (Softer); caution = Broken hook plucked (Cautious); alert = Under fire
      (Alert: hook forward); evade = Under fire (Evasion, same gain as alert); spotted.
  - **Player:** `src/audio/score/game/gameMusic.ts` decodes at 32 kHz, plays on the game's music bus (the Music
    volume applies), and runs the director at 10 Hz.
    - Fades on bar lines.
    - The spotted hit, with Alert two beats later.
    - Alert and Evasion in sync.
    - Cautious starts from its clean opening.
  - **Adapter:** `src/audio/score/game/adapter.ts` (read only) folds every guard's alert level into calm, caution or
    alert.
  - **Director:** reuses its result array and skips work when nothing can change (it now runs every frame tick).
  - **Wiring:** `main.ts` calls `app.music.menu()`; `gameAudio.ts` calls `app.music.mission()` and
    `update(dt, awareness(enemies))`. The service worker precaches `music-*.mp3`; the old lab sketches are not
    precached.
  - **Rules:** `CLAUDE.md` records the CC0 orchestral exception Michael chose on 2026-10-15.
  - **Docs:** `CHANGELOG`, `TESTING.md` (manual check), `docs/systems/audio.md` and `testing-tools.md` updated.
- **Tests:**
  - Unit: 666 pass (the adapter added).
  - Lint and build are clean.
  - e2e: `e2e-score` (new, 13 checks), `smoke`, `e2e-offline` and `e2e-music` pass. `e2e-music`'s file count is now
    limited to the lab's own stems.
  - Port 4179 was held by another session's server, so suites were run with `E2E_PORT=4183`.
  - The full `npm run e2e` was not run (shared PC).
- **Open:**
  - Calm is silent until Michael chooses a Calm.
  - On the phone, the four mission tracks decode in the background at match start (about 60 MB at 32 kHz).
  - Phone check pending Michael's run.

## V4 round 20 - a catchier broken Calm
- **Michael (2026-10-16):** "Calm, near silence" is OK, but very far between and too quiet. He wants it catchier
  but still broken.
- **Done (all three broken-hook sets):**
  - **New layer "tune":** the broken hook as a call and answer.
    - D . D3 D in bar 1, then the rest of Hook A's first bar (C3 on the "and" of 3, A2 on the "and" of 4) in bar 3.
    - The same in bars 5 and 7, and a soft walk-up every 16 bars.
    - Space between. Reverb send 0.38, so it is closer than the distant whisper.
  - **"Calm" now uses it.** The round 19 versions stay as "Calm, distant (round 19)", "Calm, fog" and
    "Calm, near silence".
  - **Cautious lifted 2.3 dB.** Adding the layer lowered the set's master gain (the all-layers mix hit its peak
    limit); this keeps Cautious where Michael liked it.
- **Measured:** the new Calm plays every 2 bars (was every 8) and about 4 dB louder than round 19's Calm.

## V4 round 19 - subtler Calm
- **Michael (2026-10-16):**
  - The plucked broken hook is good.
  - The quiet low bed is too much in every Calm ("it will get annoying"). The change to Cautious is good.
  - Calm needs to be a lot more subtle. He asked for a search on ambient music in stealth games.
- **Research:** summarised in the `docs/music/research.md` addendum. Sneaking is mostly world sound, music as "fog",
  sparse texture, no constant drone.
- **Done (all three broken-hook sets):**
  - New layers:
    - **whisper:** the broken hook far away (reverb send 0.5), once every 8 bars.
    - **fog:** a faint high violin and viola swell, twice per loop (reverb send 0.6).
  - New Calm mixes:
    - **Calm** (new default): whisper only.
    - **Calm, fog:** whisper and fog.
    - **Calm, near silence.**
    - **Calm, with low bed (round 18):** kept for comparison.
  - Cautious is unchanged.
  - The page has a "Calm mix" chooser for the in-game test.
- **Measured:** the new Calm sounds only when the whisper plays, at about -34 dB (about 6 dB quieter than round 18's
  Calm), and is silent the rest of the time.

## V4 round 18 - hook forward; broken-hook sets; lighter menus
- **Michael (2026-10-16):**
  - **Alert:** the hook needs more punch and bass. It sounds muffled behind everything, but it sounds really good.
  - **Heartbeat:** sounds more like Cautious. He loves the broken Hook A and wants it to evolve from Calm to Alert.
    The high rub is too tense for Calm. "Keep the broken hook and make some alternatives for it to be used in game."
  - **Shadows:** OK but too noisy in Calm, and Cautious too noisy. He still prefers the broken hook.
  - **Gathering storm:** too noisy in Calm; he likes its Cautious less.
  - **Menu:** he likes Grand dialled back but not the cello sound. He wants alternatives, maybe a little less epic;
    "a really catchy theme".
- **Done:**
  - **Alert, "hook forward" (the new default Alert mix):**
    - Hook layers drier (reverb send 0.14 instead of 0.32).
    - New layers: a short tuba doubling the hook, short horns an octave up, and a sub hit under each hook note.
    - The cellos and basses on the hook are up; the drive, stabs, ticking, tremolo and low D (on the same notes or
      busy) are down.
    - Measured: the hook is about 2 dB louder and the drive about 5 dB quieter than in the round 15 mix.
    - Also "hook forward, no tuba". The round 15 mixes are kept; the page has an "Alert mix" chooser.
  - **Broken-hook sets** (88 BPM, 6 layers each): plucked, bowed (short soft bows) and timpani (tuned timpani with a
    plucked high D).
    - Calm: the broken hook every 4 bars over a quiet low bed (held D and sub). No rub, no heartbeat.
    - Cautious: the broken hook every 2 bars, the walk-up every 8, the heartbeat, a faint rub.
    - Alert: the full hook in Under fire.
  - **Gathering storm removed.** Shadows Calm is quieter (low strings and sub only).
  - **Menu alternatives without the cello sound** (90 BPM, quieter): piano and strings; harp, clarinet and strings;
    violas and horn.
  - **New CC0 recordings (57):** upright piano (one dynamic, every 4 semitones), harp, clarinet. Pitches checked by
    detection.
  - **Renderer:** a layer can set its own reverb send.
- **Note:** the app stops the test server from time to time. It is restarted with the `music-test` preview, on port
  5180.

## V4 round 17 - cinematic sneaking sets
- **Michael (2026-10-16):**
  - "Create some alternatives again, focus on keeping the epic feel. Keep what you currently have."
  - "I really want all of it to make you feel like you're in a movie, but suit the situation you are in."
- **Done (kept everything; added two sneaking sets, each with Calm, Cautious, near silence and everything-on mixes,
  playable with Under fire through the director):**
  - **Shadows (cinematic)** (72 BPM, 80 s, 9 layers):
    - Calm: low strings breathing on a held D; soft chords shifting underneath (D minor, B-flat, G minor, A,
      B-flat); a high tremolo shimmer on A5 and D6; a horn calling far away; a deep sub.
    - Cautious adds: a soft viola pulse alternating D and E-flat, a timpani heartbeat, the broken Hook A, cellos and
      violas in tremolo rising a semitone every 2 bars.
  - **Gathering storm (cinematic)** (88 BPM, 87 s, 8 layers):
    - Calm: a low cello tremolo on D and A, swelling and fading; soft timpani rolls like distant thunder; a high
      violin note held above (A, B-flat, A, G); a deep sub.
    - Cautious adds: a slow cello ostinato (D F A F) building through each 8 bars, low horn swells, the heartbeat
      drum, the broken Hook A.
- **Balance:** after the first render, the Shadows pulse and timpani heartbeat went up about 5-7 dB, the Gathering
  storm tremolo up about 4.5 dB, and its horns down about 3.5 dB.
- **Note:** the app had stopped the test server. It was restarted on port 5180 (the LAN link works again).

## V4 round 16 - Heartbeat; quieter Calm; clean openings
- **Michael (2026-10-16):**
  - He loves Heartbeat, but there is too much happening in everything except Alert.
  - He likes the calm sneaking idea and the broken Hook A, but as Cautious, not Calm: "keep heartbeat as cautious".
  - He wants an even calmer Calm with no heartbeat.
  - "An old sound file plays at the start of Alert."
- **Done:**
  - **Heartbeat presets:**
    - **Calm:** only the deep sub and the far D / E-flat rub.
    - **Cautious:** round 15's Calm (the heartbeat, the sub, the rub, Hook A's opening three notes plucked every
      4 bars).
    - Also "Calm, near silence", and "Cautious, more tension" (round 15's Cautious).
  - **Ticking and Breath removed.**
  - **The old sound at the start of Alert:**
    - The cause: each loop is circular, so its first seconds hold the ringing-out tail of its own last bar (low
      brass, the held D, tremolo). That is right when the loop repeats, wrong on a fresh start.
    - **The fix:** the render command also renders each loop without wrapping and writes its first 4 bars as a clean
      opening (`<layer>-head.mp3`). The player starts every loop on the clean opening, then hands over to the loop at
      the same point.
    - Measured: in the first 50 ms of Under fire, low brass was at -26 dB, the held D at -27 dB and tremolo at
      -30 dB; the clean opening is below -68 dB there. By 5 s the two are identical.
    - The same fix applies to the menu's start (Grand's final chord rang into its opening).

## V4 round 15 - the keepers, and adaptive sets around them
- **Michael's decisions (2026-10-16):**
  - **"Alert, under fire" is the Alert theme.** Everything else is to be based around it, slower as necessary.
  - **"Menu theme, Grand, dialled back" is the menu theme** ("fantastic").
  - **Remove all the others.**
  - He wants alternatives based on these, including dynamic versions that fade together by alertness.
  - He wants an almost silent version for sneaking around, without burning out the one theme.
- **Done:**
  - **Removed:** every other piece, and the rejected synth rounds (`hookLab.ts`, `hooks.ts`, `mgs.ts`) with their
    tests and page sections. `pieces.ts` now holds only what is kept or new.
  - **Three sneaking loops** for Calm and Cautious, made from Under fire's ingredients. Hook A appears only as
    fragments or in short spells, so the theme stays fresh for Alert.
    - **Heartbeat** (88 BPM): a heartbeat drum, a deep sub, a far D / E-flat rub, Hook A's opening plucked every 4
      bars. Cautious adds ticking, a gentle pulse, climbing violas and a low D.
    - **Ticking** (88 BPM): a quiet clock on high violins, the sub, a rare rub. Cautious adds double ticking, a
      plucked heartbeat, Hook A plucked in two 8-bar spells, climbing violas.
    - **Breath** (66 BPM, half Under fire's tempo): long breathing low-string swells, the rub, a sub. Cautious adds
      the heartbeat, a slow plucked Hook A and climbing violas.
  - **Spotted:** an orchestral one-shot. A low brass and horn D / E-flat cluster, a string rip into tremolo, timpani,
    big drum, bass drum, cymbal and a sub hit, then a two-beat roll and climbing violins into Under fire's first
    downbeat.
  - **The adaptive test:** the page runs a sneaking loop (Calm and Cautious) and Under fire (Alert, plus its Evasion
    mix) through the music director, with the spotted hit and the hysteresis ladder, driven by CALM, CAUTIOUS and
    ALERT. A switch uses "Under fire + bass" for Alert.
  - **Menu alternatives:**
    - **Grand, night opening:** four bars of heartbeat, sub and rub before the hook.
    - **Grand with soft horns and drums.**
  - **Phone:** stems decode at 24 kHz, half the memory.
- **Measured:**
  - Sneaking loops: everything on is -22 dB, so the Calm preset is around -30 dB before the music volume.
  - Under fire is unchanged.
  - Render: 1-19 s per piece. Local renders total 81 MB.
  - Tests: 665 pass; lint and build clean.

## V4 round 14 - bass for Under fire; calmer menus
- **Michael's ratings (2026-10-16):**

  | Piece | His words |
  | --- | --- |
  | Alert, under fire | Loves it; "maybe an option to add some bass" |
  | Mission score (strings) | Good |
  | Alert, faster (strings) | Good |
  | Mission score, lighter | OK |
  | Alert, lighter | OK |
  | Menu from Alert faster, 96 BPM | OK, maybe a bit much for a menu |
  | Menu from Alert faster, 84 BPM | Way too slow |
  | Menu theme, Zimmer | Still really likes it, but the tempo is a little strange; likes when the violins kick in, but a bit too upbeat for a menu |
  | Menu theme, grand (slower) | A little too slow and loud for a menu, needs dialling back, but feels pretty epic |

- **Done:**
  - **Alert, under fire:**
    - New layers: a bass line (basses and cellos in eighths on the chord roots) and a deep hybrid sub bass (a sine
      with a little second harmonic) under the orchestra.
    - New preset "Under fire + bass"; the original "Under fire" mix is unchanged.
  - **Removed:** the 84 BPM menu copy.
  - **Menu from Alert faster (96 BPM):** a new default "Softer" mix (no drive, lighter top and tremolo); quieter
    render target.
  - **Menu theme, Zimmer, calmer** (88 BPM):
    - No busy 16th viola pattern and quieter drums.
    - The same cello swell out of silence and the violin entrance.
    - Presets choose the hook following the chords, or on D.
  - **Menu theme, Zimmer meets Grand** (88 BPM): Grand's shape (the hook alone, the melody on cellos, then violins
    and the section) with the Zimmer orchestra (the cello swell, breathing low swells, soft horns, the violin entrance),
    with the hook on D.
  - **Menu theme, Grand, dialled back** (90 BPM, was 84): quieter, with a "Softer" default.
- **Renderer:** a piece can set its own loudness target. The menus render at -19 to -21 dB, against -16 dB for the
  others.

## V4 round 13 - more "Alert, faster"; under fire
- **Michael (2026-10-16):**
  - He really likes "Alert, faster (strings)" (round 7, 120 BPM).
  - He wants a few more versions of it, slower ones for the menu, and another Alert with urgency: "like you're being
    shot at... get your heart rate pumping because you're in trouble".
- **Done:**
  - **Alert, under fire** (132 BPM, 40 bars, 73 s, 13 layers), on the same hook and melody, adding:
    - a pounding heart-rate drum pattern (big drum with sticks and mallet, timpani, bass drum, cymbal swells)
    - off-beat stabs on the "and" of 2 and the last sixteenth of 4, from strings and short horn notes (the "shots")
    - violins climbing a semitone per bar over 4 bars
    - a grating D against E-flat tremolo rub up high
    - fast ticking on high violins
    - the driving sixteenths rising a semitone in every 4th bar
    - low brass swells
    - Presets: Under fire, Alert, Evasion, Strings only, Everything on.
  - **Alert faster, with brass and drums** (120 BPM): low brass swells on each chord, a big drum on the 3 + 3 + 2
    accents, timpani on the chord changes, cymbal swells.
  - **Alert faster, with drums only** (120 BPM).
  - **Menu theme, from Alert faster**, at 96 BPM and 84 BPM: the same piece, slowed.
- **Balance:** the stabs, the ticking and the drums were raised after the first render.
- **Measured:** each piece renders in 11-26 s. All local renders total 264 MB, git-ignored.

## V4 round 12 - Past/Present/Future, slow and dark
- **Michael (2026-10-16):** "I like Past/Present in general but it doesn't suit a stealth game, it's too quick and
  upbeat. Needs to alter significantly to slower and epic."
- **Done (same idea, rebuilt):**
  - **Tempo:** 80 BPM, with a 70 BPM copy of the menu to compare (was 115).
  - **Harmony:** D minor, B-flat, G minor, A in place of the hopeful D Dorian with G major.
  - **Pulse:** the eighth-note pulse becomes a heavy, soft pluck on the chord root (basses and cellos) on beat 1 and
    the "and" of 2.
  - **Figure:** the repeating figure moves down into the violas (from D3) and still grows every 8 bars; violins
    double it an octave up only at the peak.
  - **Rest of the scoring:**
    - Hook A on D
    - low swells and low cello tremolo
    - a new minor long-note melody, low on cellos and violas, then rising on violins with low horns
    - trombones, timpani and a heartbeat drum at the peak, a gong
- **Pieces:**
  - **Menu theme, Past/Present/Future slow and dark** at 80 BPM (96 s, 9 layers) and 70 BPM (110 s).
  - **Mission score, Past/Present/Future slow and dark** (80 BPM, 96 s, 10 layers), with the state presets.
- **Balance:**
  - The first render had the melody about 8 dB over the hook.
  - The melody is now down, and the hook and the tremolo are up. The hook sits within 2-4 dB of the melody.

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

Spec: `docs/archive/prompts/music-spec.md` (Section 2 rules still apply). Direction: `docs/audio/music-direction-v2.md`
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
