# Night Shift - music direction v3

Version 3.0 - 2026-10-09. Replaces `docs/audio/music-direction-v2.md` (kept for history). Approval: Michael, by ear in
the music lab.

**Why v3 (Michael, 2026-10-09):** he does not like where the music was going. The target is the feel of Amon Tobin's
*Splinter Cell: Chaos Theory* score. V2 was melody-first and its realtime synthesis sounded too clean.

- **The V2 engine is paused.** The motif system, the synthesised instruments and the composed takes were removed from
  `feature/music` and archived at the tag `music-v2-archive` (pushed). The game still calls `Music.start()`, which now
  does nothing until V3 is integrated.
- **Kept for v3:** the seeded RNG (`rng.ts`), the pure DSP (`dsp.ts`), the WAV encoder (`wav.ts`), the lab entry points
  (`?musiclab=1`, the Settings button under `?debug=1`) and the `e2e-music` suite. V2 had no audio-file loading, no
  stem crossfader and no state-to-music hooks (the old intensity hook was already gone), so V3 builds those new.

---

## 1. Principles

1. **Texture and rhythm first, melody last.** No hummable lead line, ever. A listener should come away with a groove
   and a space, not a tune.
2. **Harmony comes from below:** drones, sub bass, bowed and plucked double bass, processed pads (granular strings,
   frozen metal, motor hum). Key centre D; colour from D minor and D Phrygian (the D-Eb rub) and the D-Ab tritone.
3. **The motif survives only as a sound.** The chosen figure (D D F Eb C D, V1 "Dead Drop") may appear only inside the
   Alert stinger, as processed material (a chopped, pitched, smeared pizzicato hit), never as a lead line.
4. **Sound design and music blur.** A creak, a motor, a chain or a struck plate can carry the harmony or the groove.
5. **Subtle** (Michael, 2026-10-09, still applies): dark, low levels, lots of room. Nothing bright or piercing.
6. **Under the sound effects.** Footsteps and the sound meter win every collision (v2 Section 10 mix rules still apply
   once integrated).

## 2. Sound sources: recorded, not oscillators

- **Everything audible starts as a recording.** No oscillators, no synthesised noise: even the record crackle is cut
  from recorded micro-transients (an ocean drum's beads) and the hiss is a recorded wash high-passed.
- **Material:** metal hits, creaks and scrapes (ratchet, guiro, brick, gong and cymbal scrapes), machinery (an organ
  blower motor, chain grind), electrical texture (zaps), glass, double bass (pizzicato, arco, tremolo), cello section,
  upright piano, timpani, gong, and acoustic drum hits.
- **Processing:** chopped, varispeed-pitched (pitch and length together, sampler style), granular time-stretch (a
  two-second bowed note becomes a minute of drone), reversed, filtered, saturated, quantised, run through long dark
  reverb, dub delay and tape (wow, flutter, soft top).
- **Gaps in the libraries:** there is no clean CC0 breath or electrical-hum recording in the chosen sets. Breath is not
  used yet; hum is made from the blower motor with a resonant boost. If Michael wants either, add a CC0 recording to
  the sample list (Section 7).

## 3. Drums

- **Chopped breakbeat programming.** A "record" is performed first from single CC0 hits (kick, snare, ghost notes,
  hats, played on a swung grid with every hit off-grid by a few milliseconds and velocities varied), glued in a small
  room and driven. That two-bar break is then **cut into sixteenths and re-sequenced** bar by bar: repeated slices,
  reversed slices, pitched slices, stutters, drop-outs and tape-stops at phrase ends.
- **Tempo 80-100 BPM with a half-time feel** (snare on beat 3 in the calmer layers), swing 10-16 %.
- **Weight:** deep sub under the kicks (a plucked bass pitched down an octave, low-passed and driven, so it has a
  recorded attack and still reads on a phone through its harmonics), gritty mids (distorted bowed bass, crushed drums).
- No drum-machine presets, no synthesised drums.

## 4. Mix

- **Dark, wide, dusty.** Top end rolled off in the tape stage (8.5-11 kHz); presence kept for snare crack and hats only.
- **Space and long tails:** reverbs from 1 s (rooms on the drums) to 9 s (far events in the calm layers); tails wrap
  around the loop so the loop is seamless.
- **Wide above, mono below:** everything under about 150 Hz is summed to mono; pads, metal and reverb returns are wide.
- **Balance by loudness, not raw gain:** every layer is set by gated, K-weighted loudness relative to its stem (the
  render's `lay`), and the stack is levelled so calm, calm+caution and all three sit 6 dB apart.

Measured on the three sketches (unweighted energy share of the full stack): sub 14-24 %, low 61-65 %, mid 10-23 %,
presence 1-2 %, air 0-1 %. Full-stack peak -3.1 dBFS.

## 5. States and stems

The state structure from v2 stays: **calm, caution, alert, evasion, back to calm**. Each track is **three stacked stems
that loop in sync**; the game moves their gains by threat. **Alert adds percussion and density; it never switches song.**

| State | Calm stem | Caution stem | Alert stem | Notes |
| --- | --- | --- | --- | --- |
| Calm | 1 | 0 | 0 | Drone, sub, texture, far events |
| Caution | 1 | 1 | 0 | Adds pulse and bass |
| Alert | 1 | 1 | 1 | Adds the break, sub hits, grit, metal |
| Evasion | 1 | 1 | 0.4 (-8 dB) | Still hunted, less dense |
| Back to calm | Fades down over 5 s | | | Rises take 0.8 s |

- Continuous threat (0-1): caution fades in over 0.15-0.45, alert over 0.55-0.9, equal-power curves
  (`src/audio/music/stemMix.ts`, unit-tested). The state machine and its holds from v2 Section 7 (guard states, minimum
  dwell, fairness) carry over unchanged when the game is wired.
- **Alert stinger:** a one-shot over the stems (not a stem). It is where the motif may live, as processed sound
  (Principle 3). Designed after Michael picks a sketch.

## 6. Originality (hard rule)

- Capture **technique and mood only**. Never imitate a specific Tobin track, riff, beat or sample, or anything from any
  game or record.
- No reference audio is played into, stored in or analysed by the project; no transcriptions.
- References by name in docs only. Code, comments, lab labels and in-game text never name a game, artist or track.
- Ear test at every listening stop: if Michael names a resemblance, the part is rewritten, not tweaked.

## 7. Samples (hard rule)

- **CC0 only**, every file logged with its source URL in `docs/audio/samples.md` (generated from
  `scripts/music/samples.json`, pinned to a commit of each library).
- Current sources: **VSCO 2 Community Edition** and the **Versilian Community Sample Library (VCSL)**, both CC0 1.0,
  107 files (112 MB raw).
- Raw WAVs are never committed: `npm run music:fetch` downloads them into `.music-cache/` (git-ignored). Only the
  rendered stems ship. This is a written extension of the CLAUDE.md "no external audio" rule for the score, like the
  v2 Section 13 exception; CLAUDE.md and the bible are updated when Michael merges.

## 8. Delivery: offline render to compressed stems

### 8.1 Pipeline

`npm run music:fetch` (once), then `npm run music:render [-- A B C]` on the PC:

1. `src/audio/music/render/` (pure TypeScript, unit-tested): loads the WAVs, places hits on a circular canvas one loop
   long, granular, FDN reverb, dub delay, tape, glitch edits, dust; levels each stem by loudness.
2. Each stem is written as a WAV holding the loop with **0.5 s of its own wrap on each side**, then encoded.
3. The player loops [0.5 s, 0.5 s + loop). Any encoder delay shorter than the pad only shifts the phase of a loop that
   is already seamless, and all stems share it, so they stay in sync. Checked in `e2e-music`: the jump across every
   decoded loop point is at most 0.06 of the largest sample step nearby (all nine stems).

### 8.2 Format: MP3, 128 kbps stereo

- **iOS Safari** decodes MP3 and AAC; **MP3** was picked because the project's test Chromium has no AAC decoder (so
  AAC could not be checked in the e2e suite), and every target (iOS Safari, Chrome, Edge, Firefox) decodes MP3.
- Encoded with the Windows Media Foundation MP3 encoder (`scripts/music/encode-mp3.ps1`, no ffmpeg), so rendering runs
  on Michael's PC only. Playback works everywhere.
- **Size: 0.96 MB per minute** of stereo stem at 128 kbps (measured: 8.79 MB for 9 stems of 61 s). 96 kbps would be
  0.72 MB per minute; 128 is kept for the sketches so Michael judges them at full quality.

### 8.3 Proposed audio budget

| Item | Budget |
| --- | --- |
| Shipped music, total | **16 MB** (precached for offline play) |
| Per track (three stems, 60 s loops) | 2.9 MB at 128 kbps, 2.2 MB at 96 kbps |
| Example game score | Menu + 4 map tracks + results = 6 tracks x 3 stems x 75 s = 22.5 stem-minutes: 21.6 MB at 128 kbps, **16.2 MB at 96 kbps**. So: 96 kbps for calm and caution stems, 128 for alert stems, about 18 MB; or 75 s loops capped to 60 s, about 14 MB. |
| Decoded memory (one track live) | **47 MB** at 32 kHz (three 61 s stereo stems); 70 MB at 48 kHz |
| Load time per track | 0.2-0.35 s fetch + decode in headless Chromium on the PC; **iPhone: pending** |

- Decode at **32 kHz** (`DECODE_RATE`): the render rolls the top off below 11 kHz, so nothing audible is lost and memory
  drops by a third. Only the current track is kept; the previous one is released on a map change.
- If 47 MB is too much on the iPhone (backlog item 14 is an iPhone crash at desktop Epic), options in order: mono
  calm stems (-16 MB), 45 s loops, 24 kHz decode.
- The sketches are not precached (MP3 is not in the service worker's glob); integration adds the shipped tracks.

### 8.4 CPU: cheaper than live synthesis (confirmed on the PC)

Measured in headless Chromium on the PC (software audio host; the iPhone run is pending):

| | V2 live synthesis | V3 stems |
| --- | --- | --- |
| Start-up | 1.07 s of main-thread DSP to render the sound library | 0.2-0.35 s fetch + decode (decode runs off the main thread) |
| Per frame (main thread) | A 30 ms lookahead timer scheduling every note | Nothing |
| Audio thread, 60 s offline render | Combat 13.9 s (23 % of real time), the noir take 8.9 s, calm 2.4 s; up to 16 voices and two convolvers | **0.09-0.12 s (0.2 % of real time)**: three looping buffers and three gains |

So V3 costs the phone about a hundredth of V2's audio work and none of its main-thread work. The cost moves to memory
(Section 8.3) and download size.

## 9. The sketches (V3 round 1)

Three contrasting 60 s loops, D centre, each with calm, caution and alert stems, in the music lab:

| | Name | Tempo | Calm | Caution adds | Alert adds |
| --- | --- | --- | --- | --- | --- |
| **A** | Drift (sparse, ambient) | 80, 20 bars | Granular bowed-bass drone, sub, a cello bed leaning to Eb and A, motor hum, dust; far metal, reversed cymbal and piano in an 8 s reverb | Plucked bass (few notes) through a dub delay; muted kick on 1, rim on 3, shaker grains; cello tremolo swell | A brushed, chopped break; sub hits; distorted bowed bass; metal in the gaps; plus the shared tension layer (below) |
| **B** | Breakline (breakbeat-led) | 96, 24 bars | Cello drone, sub, the half-time break muffled behind a wall, reversed piano, dust | The half-time break band-limited; a chopped, driven pizzicato rhythm with a dub delay | The full chopped break (edits, stutters, a pitched fill, reverse, tape-stop); sub on the kicks; gritty bowed bass; metal stabs; plus the shared tension layer (below) |
| **C** | Foundry (heavy, industrial) | 84, 21 bars | Motor drone, chain grind, a struck plate frozen into a pad (with a tritone ghost), sub hum, gong and cymbal scrapes in a 9 s reverb | Big drum on 1, anvil or brake drum on 3; creaks; a tritone tremolo (Ab, then D); reversed bowed cymbal | A crushed, layered break with metal on the snare; a distorted bass riff (root, minor second, flat seventh); sub; timpani and gong; chain swells; a reversed gong into the loop top; plus the shared tension layer (below) |

Lab controls: Play A / B / C; Calm, Caution, Alert, Evasion; a Threat slider (live crossfade); "Play the ladder"
(calm, caution, alert, evasion, caution, calm over 75 s); Solo one stem. The lab plays straight to the output, not
through the game's music bus and compressor.

**Michael decides:** which sketch (or which parts of which) leads the score; what to change. Then: the Alert stinger
(with the motif as a sound), a menu track, and game integration (the v2 Section 7 adapter driving `stemMix`).

**Alert tension layer (all three sketches).** A tremolo-string cluster (D, Eb, Ab), a reversed bowed-cymbal swell with
accelerating ticks and a timpani roll into every fourth bar line, a distorted pizzicato root on every eighth (A, B), a
tritone metal alarm on the off-beats and electrical crackle (CC0 zaps). Harsher tape drive. Rhythm and cluster, no tune.
