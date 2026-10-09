# Night Shift - Music project (adaptive score, menu, briefing and results themes)

For a Claude Code session working in its own folder (`C:\NightShift\Mobile-Coop-music`) on branch `feature/music`. Written by Opus on 2026-10-09 with Michael.

**Start** (in a session opened on `C:\NightShift\Mobile-Coop-music`):

> Read docs/prompts/music-spec.md and follow it from Stage M0.

This file lives at `docs/prompts/music-spec.md` on `feature/music`. The setup session (`START.md` in the bundle) put it there.

---

## 1. The brief

Night Shift is a third-person stealth game in the spirit of Splinter Cell: Chaos Theory. Read `docs/design-bible.md` Sections 1-2 and `docs/story.md` Sections 1-3 for the world: Hollowmere, a rain-soaked British port city at night.

**The score is heavily inspired by Amon Tobin's Chaos Theory soundtrack, and every note must be original.**

- **What that sound is:** dark electronic music built from found sounds - metal, glass, machinery, wires - chopped and processed into intricate rhythms. It sits between noir downtempo, IDM / breakbeat / drum and bass, and industrial texture. Cinematic, mechanical, tense. Never orchestral.
- **Originality (hard rule):** never reproduce or imitate a specific Amon Tobin track, melody, chord progression, rhythm or sample. Match the genre, palette and adaptive behaviour only. Describe references in words only; never put copyrighted audio or transcriptions in the repo.
- **Generated in code** (Michael's decision): WebAudio synthesis only, no audio files. A score built from code-made "found sounds" suits this style.

### Michael's decisions (fixed)

1. **Sneaking undetected: near-silent ambience,** as in Chaos Theory. Sparse texture, distant tones, room-like air. Silence is part of the score.
2. **One blend of styles, rising with the alert state:**

   | Game state | Music |
   | --- | --- |
   | **Calm** (no guard aware) | Near-silent noir ambience: low drones, distant metallic tones, occasional soft found-sound ticks. No beat. |
   | **Suspicious** (a guard is suspicious or investigating) | Noir downtempo creeps in: sub bass, a slow brushed or muted pulse, a sparse dark chord or bell motif. Tension, not action. |
   | **Searching** (alerted guards hunting, nobody in sight) | Industrial found-sound pulse: machine rhythms, metal hits, gritty textures, rising unease. |
   | **Combat** (a guard sees the player, or shooting) | Dark breakbeat / drum and bass edge: chopped breaks, heavy bass, glitch fills. |
   | **Return to calm** | The layers fall away slowly over several bars, never cut. |

3. **Scope of this project:** the adaptive in-game score, plus menu, briefing and results themes.
   - Ambience tied to gameplay (rain, machinery and noise masking zones) belongs to roadmap Phase 2. Do not build it here.
   - Sound effects are not in scope.

---

## 2. Rules

- **Branch and folder:**
  - Work only on `feature/music` in `C:\NightShift\Mobile-Coop-music`.
  - Never commit to or push `ct-movement`, `dev` or `master`. Michael merges `feature/music` when he approves it.
  - At the start of each stage, merge `origin/ct-movement` into `feature/music` to stay current.
- **Contained code:**
  - New code lives in `src/audio/music/` (new folder).
  - The old `src/audio/music.ts` is replaced by it.
  - Game wiring goes through one adapter (`src/audio/music/musicAdapter.ts`). Only that adapter reads game state, and it only reads.
  - Do not edit gameplay, AI, the light system, `src/audio/sfx.ts` or the bible. Touch `src/audio/gameAudio.ts` and `src/main.ts` only to swap the old music for the new.
- **Gameplay never reads music state** (hard rule).
- **CLAUDE.md hard rules apply:** no runtime network, IndexedDB saves, strict TS, no per-frame allocations in hot paths, every voice early-outs before the first user gesture (iOS audio unlock).
- **Testing:** use `E2E_GPU=1` for anything graphical. Tests run headless, so they never take over Michael's mouse.
- **Shared PC:** another session works in `C:\NightShift\Mobile-Coop` on `ct-movement` at the same time. Never touch that folder. Avoid running the full e2e suite when a narrower set will do, so the two sessions do not slow each other down.
- **Listening (from M1):**
  - When Michael wants to hear something, start the dev server (`npm run dev -- --host`) and give him the music lab link for the PC and the one for his iPhone on the same Wi-Fi.
  - If Windows asks about the firewall, he allows private networks.
  - Stop the server when he is done.
- **Model use:**
  - Opus for M0 (direction) and M3 (themes and composition).
  - Sonnet for M1, M2 and M4 (engine, adapter, polish).
- **Each stage:** commit and push `feature/music`, report in `docs/audio/music-progress.md` (bible Appendix B format), then STOP for Michael's listening approval.

---

## 3. Technical design

### Sound library made in code

- At load, render a library of "found-sound" one-shots once into `AudioBuffer`s with an `OfflineAudioContext`. Sequence those buffers at play time. This is cheap at run time and gives the sampled, chopped feel of the genre.
- **The palette:**
  - Metal: modal / FM synthesis of struck pipes, plates, railings, cable hums.
  - Glass, clicks and ticks; telephone relay clicks and bell tones (Kestrel Exchange's theme).
  - Machine thumps.
  - Drums: kick, snare, brushes, hats from shaped noise and oscillators, plus "breaks" assembled from them.
  - Bass: sub and filtered saw.
  - Pads and drones; noise textures.
- **Processing:** chopping, pitch shifting, reversing, filtering, bit and sample-rate reduction for glitch, and generated impulse-response reverbs (a room, a hall, a wet street) for space.
- **Deterministic:** a seeded random generator, so a given seed always renders the same library and patterns (testable, repeatable).

### Sequencer

- Bar- and beat-accurate scheduling with a lookahead timer, as the old module does.
- Tempo per state:
  - Calm: free time, no beat.
  - Suspicious: about 80-90 BPM.
  - Searching: about 90-100 BPM.
  - Combat: about 160-175 BPM, felt as a half-time / double-time break so it relates to the slower states.
- **Patterns:**
  - Layered stems per state, with variation by seeded mutation every 4-8 bars, so loops never feel identical.
  - Fills at phrase ends.

### State machine

States: calm, suspicious, searching, combat.

- **Going up** happens at the next beat (combat at once, with a stinger).
- **Going down** happens at phrase ends, with hysteresis:
  - combat drops to searching after about 6 s with no sighting
  - searching drops to suspicious, and suspicious to calm, over longer holds
- **Stingers:**
  - spotted
  - alarm raised
  - objective complete
  - checkpoint (subtle)
  - Each is quantised to the beat and ducks the stems briefly.
- **Music never reveals what the player could not know.**
  - It reacts only to states the game already shows: awareness arcs, alerts, alarms, the radio.
  - In the Confrontation (bible 5.15) it follows only the escalation timer, never anyone's position. Add a `confrontation` mode stub that takes only a 0-1 escalation value.

### Adapter

**It reads:**

- the highest guard state from the AI (`AlertMachine` states: relaxed / suspicious / investigating / alert / search, and combat)
- whether the player is spotted
- alarm events
- objective events
- the game mode: sandbox / Free Roam plays the calm state only unless a guard is aware
- pause: music ducks
- the map, for theme selection

Phase 4 will add alarm levels and mission events later. Leave clear extension points.

### Mixer

- Uses the existing `music` bus and volume setting.
- The music sits under sound effects. Combat may be loudest, but must never mask footsteps or the sound meter's cues.
- The current combat-by-alive-enemies rule (`gameAudio.ts`, `alive / 5`) is removed.

### Themes

- **Menu:** the Night Shift theme. A slow noir motif over rain-like texture, with a rhythmic undercurrent.
- **Briefing:** the theme reduced and tense, under text. Loopable, never distracting while reading.
- **Results:** two variants.
  - Success: resolves.
  - Failure or alarm-heavy: unresolved and darker.
- **Per-map colour:**
  - Warehouse: docks metal and container booms.
  - Kestrel Exchange: relay clicks, ringing bell tones, old electrical hum.
  - A theme is a set of palette and motif choices layered on the shared state system, not a separate score.

### Music lab (for Michael's ears)

A debug screen, `?musiclab=1` and Settings > Audio > Music lab (dev flag), with:

- buttons for calm / suspicious / searching / combat and every stinger
- a map theme selector
- the menu / briefing / results themes
- seed and tempo nudges, and mute buttons per stem
- **Export 60 s WAV:** renders offline and downloads, so Michael can listen on his iPhone or in headphones away from the PC

It works on the phone and on desktop.

### Phone budget

- Library render at load: under 1.5 s on the iPhone (measure).
- At most 24 voices at once.
- Under 0.5 ms of main-thread time per frame for scheduling.
- No audible gaps when the tab is backgrounded and restored.
- Add a "music on, combat state" run to `perf.mjs --phone`.

---

## 4. Stages (STOP after each for Michael)

### M0 - Direction (Opus, documents only)

**Write `docs/audio/music-direction.md`:**

- the palette, with every sound described and how it is synthesised
- tempos and keys per state (dark minor modes; leave room for jazz-inflected chords in suspicious)
- the motif for Night Shift (a short, memorable figure that can be played on a bell, a bass or a chopped metal hit)
- the layer map per state
- transition rules
- the stinger list
- theme notes per map
- the mix rules
- the originality rules
- what "inspired by, never copied" means in practice

**Also create `docs/audio/music-progress.md`.** Then STOP.

### M1 - Engine (Sonnet)

- The sound library, sequencer, mixer, seeded generator and music lab (with WAV export), playing a rough calm and combat state.
- Unit tests:
  - seeded determinism
  - scheduler timing
  - voice cap
- e2e: the music lab boots on phone emulation and desktop with no console errors, and voices stay under the cap.

STOP with the lab ready for Michael.

### M2 - States, transitions and adapter (Sonnet)

- All four states, up / down transitions on beats and phrases, hysteresis, stingers.
- The adapter wired to the game, replacing the old music.
- The Confrontation stub.
- Unit tests for the state machine.
- e2e on the Warehouse: alert a guard and the state rises; break line of sight and it falls back over time.

STOP for Michael to play.

### M3 - Composition and themes (Opus)

- Write the real music:
  - stems per state with variations and fills
  - the Night Shift motif across states
  - menu, briefing and results themes
  - Warehouse and Kestrel colours
- Iterate with Michael through lab exports.

STOP for approval.

### M4 - Polish and budget (Sonnet)

- Mix pass against sound effects; the music sits under footsteps.
- Phone budget measured.
- `perf.mjs --phone` music run.
- Backgrounding and resume tested.
- Docs: `docs/systems/audio.md` music section.
- Version note for `CHANGELOG.md`.
- Ready for Michael to merge.

STOP.
