# Night Shift - music direction

Version 0.1 - 2026-10-09 (Stage M0). Spec: `docs/prompts/music-spec.md`. Approval: Michael, by ear in the music lab.

The score is a dark electronic score built from code-made found sounds, in the genre of the Chaos Theory soundtrack.
It is original in every note. This file decides how it sounds; the spec decides how it is built and staged.

---

## 1. Principles

1. **Silence is the default.** Undetected play is near-silent air. Music is earned by tension.
2. **One score, rising.** Calm, suspicious, searching and combat are layers of one piece in one key centre (D), not
   four tracks. Each state adds stems to the one below it and swaps a few.
3. **Found sounds, not instruments.** Every voice should sound like something in the building that was struck,
   clicked, scraped or switched on, then chopped and processed. Nothing orchestral, no piano presets, no
   supersaw leads.
4. **Music never tells the player what they could not know** (Section 7).
5. **Under the sound effects, always.** Footsteps and the sound meter's cues win every collision (Section 11).
6. **Phone first.** It must read on the iPhone speaker: every bass carries harmonics, nothing important lives only
   below 120 Hz.

---

## 2. Key centre, modes and tempos

All states share the tonic **D**. Maps may transpose by up to two semitones (Section 8); the motif and the state
system do not change.

| State | Tempo | Metre and feel | Mode and harmony | Phrase |
| --- | --- | --- | --- | --- |
| Calm | Free time | No beat. Events on a slow seeded clock (one every 4-12 s) | D pedal; Phrygian colour (Eb) and a rare, distant Ab | None (events only) |
| Suspicious | **84 BPM** | 4/4, light swing (56 %), half-time pulse | D minor / Dorian with jazz-inflected chords (2.3) | 4 bars (11.4 s) |
| Searching | **96 BPM** | 4/4, straight 16ths, mechanical | D Phrygian / Locrian colours: D, Eb, Ab clusters over a D pedal | 4 bars (10 s) |
| Combat | **168 BPM** | 4/4 breaks; alternates double-time and half-time (felt at 84) | D minor / Phrygian; bass moves D, Eb, Ab, C | 8 bars (11.4 s) |
| Menu | 84 BPM | 4/4, slow | D minor (2.3 progressions) | 16-bar loop |
| Briefing | 84 BPM | 4/4, almost no attack | D pedal, minor | 8-bar loop |

**Tempo relationships:** combat is exactly double suspicious, so combat's half-time sections and suspicious share a
pulse, and a suspicious phrase and a combat phrase last the same 11.4 s. Searching sits apart at 96 on purpose: it
should feel mechanical and slightly off the body's pulse. Tempo changes:

- **Up into searching:** the new tempo starts on the next beat (the old stems stop at that beat; see 5.1).
- **Up into combat:** the spotted stinger is bar 1, beat 1 of the combat grid. No glide.
- **Down:** the tempo glides linearly to the new value over the 2-bar fall (5.2). The scheduler supports a linear
  tempo ramp between two beat times.

Map themes may nudge tempos by up to +-4 BPM; combat stays exactly double suspicious.

### 2.1 Pitch reference

Sounding octaves used below: D1 36.7 Hz, D2 73.4 Hz, D3 146.8 Hz, D4 293.7 Hz, D5 587.3 Hz. Equal temperament,
A4 = 440 Hz.

### 2.2 The tritone

The interval D-Ab (and E-Bb in the motif) is the score's signature of danger. Calm touches it once in a long
while; searching lives on it; combat drives the bass through it.

### 2.3 Suspicious and menu harmony

Rootless voicings in D3-D5 on the bell-piano (3.3), root in the sub bass. Chord set:

| Symbol | Notes | Use |
| --- | --- | --- |
| Dm9 | D F A C E | Home |
| Bbmaj7#11 | Bb D F A E | Lift, uneasy |
| Gm11 | G Bb D F C | Subdominant, smoky |
| Eø7 | E G Bb D | Turn |
| A7b9b13 | A C# G Bb F | Dominant, never resolved in play |
| Ebmaj7 | Eb G Bb D | Phrygian dread |

Progressions (the seed picks one per 4 or 8 bars; one chord per bar unless noted):

- **P1:** Dm9 | Dm9 | Bbmaj7#11 | A7b9b13
- **P2:** Dm9 | Gm11 | Eø7 | A7b9b13
- **P3 (dread):** Dm9 | Ebmaj7 | Dm9 | Ebmaj7
- **P4 (menu only, 8 bars):** Dm9 | Dm9 | Bbmaj7#11 | Bbmaj7#11 | Gm11 | Eø7 | A7b9b13 | A7b9b13

These are stock minor-key and jazz moves, chosen because they belong to nobody.

---

## 3. The palette

Every sound is rendered once at load into a mono `AudioBuffer` by an `OfflineAudioContext` (48 kHz) from a seeded
random generator, then sequenced at play time. Ids in `code style` are the library names M1 uses.

Budget: the whole library is at most 60 s of mono audio (about 11.5 MB) and renders in under 1.5 s on the iPhone.
Long or pitched sounds are rendered once and pitch-shifted with `playbackRate` (within +-7 semitones; beyond that,
render a second root).

### 3.1 Metal

| Id | Sound | Synthesis |
| --- | --- | --- |
| `pipe` | Struck steel pipe, pitched (root D4) | Modal: 6 decaying sines at free-bar ratios 1, 2.76, 5.40, 8.93, 13.3, 18.6; decay shorter for higher modes (2.0 s to 0.15 s); 3 ms band-passed noise strike. Seed jitters each ratio by +-1 % so two pipes never ring identically. |
| `plate` | Struck steel plate | Modal: 16-24 seeded modes from 180 Hz to 6 kHz, dense and inharmonic, decays 0.3-1.2 s; noise strike through a resonant band-pass. |
| `boom` | Container / hull boom (Warehouse) | 12 low modes from 35 Hz to 300 Hz, long decays (2-4 s), a slight downward pitch bend (-30 cents over 1 s), mallet thump (sine 60 to 35 Hz), low-passed at 1.2 kHz, then soft-clipped so its harmonics reach the phone speaker. Tuned so the strongest mode is D1 or A1. |
| `rail` | Railing ping | FM: carrier to modulator ratio 1 : 1.414, index envelope 6 to 0 over 0.4 s, amplitude decay 1.5 s. Bright, glassy metal. |
| `hum` | Cable hum | British mains: 50 Hz plus 100, 150, 250 Hz at falling levels, two copies 0.3 Hz apart so it beats slowly, through a soft clipper for buzz. 4 s seamless loop (whole cycles). |
| `scrape` | Metal scrape / riser | Noise through two resonant band-passes sweeping 300 Hz to 3 kHz over 2 s, with a 9 Hz amplitude judder. Reversed copy `scrapeRev`. |
| `chain` | Chain rattle | 20-40 seeded `plate` micro-hits (5-20 ms, random pitch) over 0.8 s, thinning out. |

### 3.2 Glass, clicks and ticks

| Id | Sound | Synthesis |
| --- | --- | --- |
| `glass` | Glass tick | 4 high modes (3-9 kHz), 30-80 ms decay, tiny noise click. |
| `click` | Dry click | A single-sample impulse through a band-pass (2-5 kHz, Q 4), 5 ms. Three seeded variants. |
| `relay` | Telephone relay | Two `click`s 8-15 ms apart (contact bounce) plus a low thunk (sine 180 Hz, 20 ms). Variants: pull-in and release (release is softer, higher). |
| `dial` | Rotary dial pulse train | `relay` releases at 10 per second; 1 to 9 pulses per train (rendered as 9 buffers or sliced from one). Used as rhythm and glitch rolls. |
| `bell` | Telephone bell partial set (pitched, root D5) | Additive bell: partials at 0.5, 1, 1.19 (minor third), 1.5, 2.0, 2.52, 3.0 of the strike note; hum and prime ring longest (3 s), upper partials 0.4-1 s. Hammer click. |
| `ring` | Bell under a clapper | `bell` re-struck at 18-22 Hz for 0.3-1.2 s by a seeded clapper (each strike slightly different level). Not a ringtone cadence. |
| `tick` | Clock tick (Kestrel call-board clock) | A small `glass` plus a 2 ms wood-like click (modal, 800 Hz and 2.3 kHz). Tick and tock variants. |

### 3.3 Pitched instruments built from found sounds

| Id | Sound | Synthesis |
| --- | --- | --- |
| `bellpiano` | The chord voice: a tine-like electric bell (pitched, root D4) | FM: ratio 1 : 1, index 1.5 decaying to 0.2 over 0.6 s, plus a 3.5 : 1 partial for the tine at -24 dB; amplitude decay 3 s. Darkened with a low-pass at 2.5 kHz. Chords are assembled from single notes at play time. |
| `motifbell` | The motif's bell (Section 4) | `bell` with the prime and nominal emphasised so the pitch reads clearly; hall reverb in the buffer tail removed (the send adds space). |

### 3.4 Machines

| Id | Sound | Synthesis |
| --- | --- | --- |
| `thump` | Machine thump | Sine 70 to 40 Hz in 0.12 s, a band-passed noise body (200 Hz), and a short `chain` rattle tail at -18 dB. Soft-clipped. |
| `piston` | Piston hiss | Noise through a band-pass sweeping 2 to 1 kHz, 0.25 s, sharp attack. |
| `motor` | Motor whine | Saw 90 to 140 Hz over 1.5 s (spin-up) through a low-pass; reversed copy for spin-down. |
| `press` | Industrial press hit | `thump` plus `plate` plus a 40 ms burst of bit-crushed noise (6 bits). |

### 3.5 Drums

All drums are synthesised from scratch. Breaks are our own patterns (Section 12).

| Id | Sound | Synthesis |
| --- | --- | --- |
| `kick` | Kick | Sine with a pitch drop 150 to 45 Hz (30 ms then 200 ms), a 2 ms click, soft clip (adds the 2nd and 3rd harmonics the phone needs). Two variants: tight (dnb) and round (downtempo). |
| `snare` | Snare | Two modes (185 Hz, 330 Hz, 80 ms) plus band-passed noise (1-6 kHz, 150 ms). Variant `snareMetal`: layered with a `plate` hit. |
| `brushTap`, `brushSwish` | Brushes | Tap: noise burst, band 2-8 kHz, 40 ms. Swish: noise with a 120 ms attack and 200 ms release, band-pass sweeping slowly; alternating left and right in pan. |
| `hatC`, `hatO` | Hats | Six square waves at the classic inharmonic ratios (205.3, 304.4, 369.6, 522.7, 540, 800 Hz), high-passed at 7 kHz; closed 40 ms, open 300 ms. Kestrel swaps hats for `relay` clicks. |
| `rim` | Rim / knock | Modal wood: 1.1 kHz and 2.9 kHz, 30 ms. |
| `ghost` | Ghost snare | `snare` at -14 dB with a shorter noise tail. |
| `break*` | Breaks | Rendered per tempo into 1- and 2-bar buffers from the hits above (patterns in 6.4), then sliced into 16 equal slices for chopping (3.8). |

### 3.6 Bass

| Id | Sound | Synthesis |
| --- | --- | --- |
| `sub` | Sub bass (root D2, rendered 2 s, looped region for sustain) | Sine plus 2nd harmonic at -12 dB plus 3rd at -20 dB, through a soft clipper. Audible on the phone. |
| `reese` | Combat bass | Two saws detuned by +-9 cents, low-passed at 600 Hz with a slow seeded LFO on the cutoff (0.2-0.5 Hz), plus the `sub` an octave below. 4 s loop at D2. |
| `sawbass` | Filtered saw (searching) | Saw with a fast filter envelope (2 kHz to 300 Hz in 80 ms). Short plucked notes. |
| `bassmetal` | Pitched metal bass | `pipe` rendered at D2 with modes 3+ removed, for the motif on the bass in searching. |

### 3.7 Pads, drones and textures

| Id | Sound | Synthesis |
| --- | --- | --- |
| `drone` | Low drone (D2 + A2, 8 s seamless loop) | Four sine/triangle partials with slow seeded detune drift; low-passed at 900 Hz. |
| `bowed` | Bowed metal | A `pipe`'s modes excited by continuous filtered noise instead of a strike: a singing, unstable tone. D3 and Ab3 versions. 6 s loop. |
| `smear` | Reverse-smeared chord | A `bellpiano` chord through the hall impulse, reversed, so it swells into the bar line. Rendered per chord on demand at load (the six chords of 2.3). |
| `air` | Room tone | Brown noise low-passed at 400 Hz plus pink noise at -24 dB; 8 s seamless loop (crossfaded ends). |
| `rainbed` | Rain-like texture (menu and briefing only) | Pink noise band-passed 800 Hz to 8 kHz plus seeded droplets (sine blips 2-5 kHz, 3-10 ms, random level). 8 s loop. Not the gameplay rain, which is Phase 2 ambience. |
| `static` | Line crackle | Sparse impulses (seeded Poisson, 20-80 per second) through the telephone band (300 Hz to 3.4 kHz). |

### 3.8 Processing

Applied at render time to the Float32 data unless marked "runtime".

- **Chop:** slice a buffer into N slices on the beat grid; resequence (repeat, skip, reorder) by pattern.
- **Pitch shift:** `playbackRate` (runtime). Also used for tape-stop (runtime rate ramp to 0.2 over a beat).
- **Reverse:** copy the samples backwards.
- **Filter:** biquads inside the offline render; one runtime low-pass per stem for fades and pause.
- **Bit and sample-rate reduction:** quantise to 4-8 bits; sample-and-hold every 2-8 samples. Used for glitch fills
  and stinger tails.
- **Soft clip / waveshaper:** `tanh`-style curve, for bass and machine harmonics.
- **Impulse responses** (generated, seeded, stereo): decaying noise split into three bands with different decay
  times, plus early reflections.
  - `room`: 0.6 s, close early reflections (switchroom, offices).
  - `hall`: 2.8 s, dark tail (MDF hall, the Warehouse shed).
  - `street`: 1.6 s, bright, with a 90 ms slap-back off building fronts (wet street, menu).
- **Runtime reverb:** at most two `ConvolverNode` sends live at once (the current state's and the next one's during a
  transition).
- **Runtime delay:** one dub delay send (dotted-eighth at the current tempo, feedback 0.35, low-pass in the loop at
  1.8 kHz). Noir space for bell and motif.

---

## 4. The Night Shift motif

A five-note figure. It should be hummable after one hearing and work as pitch (bell, bass) or as rhythm only
(metal hits).

**Notation** (2 bars of 4/4; one step is an eighth note; pitches at the bell's octave):

| Step | 0 | 3 | 4 | 6 | 14 |
| --- | --- | --- | --- | --- | --- |
| Note | D4 | F4 | E4 | Bb3 | A3 |
| Length (eighths) | 3 | 1 | 2 | 7 | 2 |

- **Shape:** long, short, medium, very long, then a short pickup after a breath. Intervals: up a minor third, down a
  semitone, **down a tritone**, down a semitone.
- **Meaning:** the tritone drop E-Bb is the light going out; the Bb-A sigh is the guard turning away. It ends on A,
  open: the night is not over.
- **Rhythm cell (metal or drums):** hits on steps 0, 3, 4, 6, 14 with accents on 0 and 6.

**Forms:**

| Form | Notes | Where |
| --- | --- | --- |
| Statement | D F E Bb A | Menu, calm (rare, far away), suspicious |
| Cell | E Bb A (the last three) | Suspicious bell, alarm stinger |
| Inversion | D B C F# G (up a minor third becomes down; the tritone rises) | Searching: rising unease on `bassmetal` |
| Augmentation | Statement at half speed (4 bars) | Searching bass, briefing |
| Diminution | Statement in 16ths (1 bar at 168) | Combat, on `pipe` and as the break's accent pattern |
| Resolved | D F E C D (the tritone becomes a third, landing home) | Objective stinger, results (success) |
| Lights On | Resolved, then a D major chord (F# replaces F) | Results (success) final chord only |
| Unresolved | D F E Bb, held; no A; Eb drone under it | Results (failure) |

**Instruments:** `motifbell` (high, Kestrel colour), `bassmetal` or `sub` (low), `pipe` and `plate` hits (rhythm),
`ring` (alarm stinger).

The motif was written for this project. Before M3 locks it, Michael listens for any resemblance to a known theme; if
he hears one, it is rewritten (Section 12).

---

## 5. Transitions

### 5.1 Going up

| From -> to | When | How |
| --- | --- | --- |
| Calm -> suspicious | Next beat of the suspicious grid (grid starts on the change) | Sub and pulse enter with a 1-beat fade; first bar is pulse only, chords from bar 2. A motif cell on the bell marks the entry. |
| Suspicious -> searching | Next beat | Swing and chords drop at that beat; machine pulse enters at full level; a `scrape` riser plays over the first bar. |
| Any -> combat | At once | The spotted stinger plays and is bar 1, beat 1 of the combat grid. Combat stems start on beat 2 (the stinger owns beat 1). Lower-state stems cut under the stinger (it masks the cut). |

Skipping states is allowed (calm straight to combat, calm straight to searching after an alarm).

### 5.2 Going down

Only at the end of a phrase, and only after the hold below. Layers fall away one at a time over **2-4 bars**; nothing
is cut.

| From -> to | Hold (no trigger) | The fall |
| --- | --- | --- |
| Combat -> searching | 6 s with no guard seeing the player and no shots | Last combat bar: tape-stop or reversed fill. Then break out first (1 bar), glitch out, reese becomes `sawbass` over 2 bars while the tempo glides 168 (half-time 84) to 96. |
| Searching -> suspicious | 10 s with no guard alert or searching | Machine pulse thins over 2 bars (every second hit removed, then every hit); tempo glides 96 to 84; chords return from the next phrase. |
| Suspicious -> calm | 15 s with no guard suspicious or investigating | Over 4 bars: pulse out, then chords, then the sub fades over 2 bars into the drone. The last event is a single distant bell. |

**Minimum dwell:** a state plays at least one full phrase before it may fall. Rising is never delayed.

**Interrupted fall:** if a trigger returns during a fall, the fall stops; stems fade back to the current state's level
from where they are (1 beat), on the next beat.

### 5.3 Variation and fills

- Every 4 bars (suspicious, searching) or 8 bars (combat) the seed mutates the patterns: swap 1-3 steps, move a
  ghost note, change a hat to a relay click, choose the next progression. A loop is never heard twice identically
  within 2 minutes.
- **Fills** on the last bar of every phrase: suspicious, a brush roll or a dropped beat; searching, a `dial` pulse
  train or a `press` hit on the last 16th; combat, a chopped stutter (3.8: repeat slice 13 four times, pitch up, bit
  crush) or a 1-beat silence before the downbeat.

---

## 6. Layer map per state

Stems (each is a gain node on the music bus; the lab can mute each):

- `AIR` - room tone, drones, bowed metal
- `TEX` - found-sound ticks, clicks, glass, distant metal
- `HARM` - chords and smears
- `MOTIF` - the motif on whatever instrument the state uses
- `BASS` - sub, saw bass, reese
- `PULSE` - soft beat: kick, brushes, rim (suspicious)
- `METAL` - machine rhythm: thumps, metal hits, relays (searching, accents in combat)
- `BREAK` - chopped breaks (combat)
- `GLITCH` - fills, stutters, risers

Levels are dB on the stem relative to the state's loudest stem. Blank means silent.

| Stem | Calm | Suspicious | Searching | Combat |
| --- | --- | --- | --- | --- |
| AIR | 0 (air + drone) | -6 (drone) | -8 (`hum`, `bowed` Ab3) | |
| TEX | -4 (one event per 4-12 s) | -6 (one per bar) | -10 (`chain`, `piston`) | |
| HARM | | -3 (chords, 2.3) | -12 (`smear` of Ebmaj7 every 8 bars) | -10 (stabs on phrase start) |
| MOTIF | -10 (statement, at most once per 90 s, far away) | -6 (cell, bell) | -6 (inversion / augmentation, `bassmetal`) | -4 (diminution, `pipe`) |
| BASS | | 0 (`sub`, long roots) | -2 (`sawbass` 8ths on D, Eb and Ab accents) | 0 (`reese` + `sub`) |
| PULSE | | -4 (round kick beat 1, brush swish beat 3, rim ghosts) | | |
| METAL | | | 0 (16-step machine pattern) | -6 (accents) |
| BREAK | | | | 0 |
| GLITCH | | -18 (rare) | -8 (risers, dial rolls) | -6 (fills) |

### 6.1 Calm

Free time. The `air` loop and the drone fade in over 4 s. A seeded scheduler picks one `TEX` event every 4-12 s from
the map's calm set (Section 8), each with a random pan (+-0.6), pitch (+-3 semitones) and send level (mostly hall:
distance). The motif statement plays on the bell at most once per 90 s, far back in the hall send, never in the first
60 s of a level. Total density: "is that the building?"

### 6.2 Suspicious

84 BPM, swing 56 %. The round kick on beat 1, a brush swish on beat 3, rim ghosts on seeded off-beats (2-4 per bar).
The sub plays the chord roots, one long note per bar. Chords on the bell-piano, one per bar, rootless, entering just
after the beat. The motif cell on the bell once per phrase, in the gap of the bar the chord leaves. Tension, not action.

### 6.3 Searching

96 BPM, straight 16ths. The machine pattern on `METAL`: `thump` on steps 0 and 6 (and seeded 10 or 11), `plate` or
`pipe` hits on the backbeat (4, 12), `relay` or `hatC` 16ths at low level with seeded gaps, `piston` on step 14 every
second bar. The saw bass on 8ths on D with Eb and Ab accents. The `hum` underneath. Every 8 bars a `scrape` riser; every
16 bars the motif inversion on `bassmetal`. Rising unease: each phrase in searching opens the bass filter 10 % more,
capped at 4 phrases.

### 6.4 Combat

168 BPM. Two sections alternate every 8 bars (seed may hold one for 16):

- **Double-time:** a full 16-step break (kick, snare on 4 and 12, ghosts and hats between) chopped by pattern.
- **Half-time:** kick on step 0, snare on step 8 only (felt at 84), hats in 8ths, the reese doing the work.

Break patterns are written fresh as 16-step grids in M3 and mutated by the seed (Section 12). The reese moves D, Eb,
Ab, C on 2-bar spans. The motif diminution on `pipe` once per 8 bars, as the break's accent pattern. Glitch fills at
every phrase end.

### 6.5 Pause

All stems duck by 12 dB and a low-pass closes to 800 Hz over 0.3 s. The sequencer keeps time (no restart on resume).

---

## 7. Game state and the no-reveal rule

### 7.1 State mapping (adapter)

The code's `AlertLevel` (`src/ai/alertState.ts`) is `unaware | suspicious | investigating | searching | alert |
cooldown`. The adapter takes the highest level among the guards the HUD presents and maps it:

| Guard state (highest) | Music state |
| --- | --- |
| `unaware`, `cooldown` | calm |
| `suspicious`, `investigating` | suspicious |
| `searching`; `alert` with no sighting for the 6 s hold | searching |
| `alert` while any guard sees the player, or shots fired in the last 6 s | combat |

- **Sandbox / Free Roam:** calm only, unless a guard is aware (then the table above applies).
- **Alarm raised:** at least searching while the alarm lasts (Phase 4 will define alarm levels; the adapter exposes a
  `floor` state for that).
- **Extension points for Phase 4:** an alarm-level input (sets the floor), mission events (map to stingers), and a
  per-mission theme override.

### 7.2 Never reveal

- Music reacts only to things the game already shows: awareness arcs and indicators, alert states, alarms, radio
  events. If the HUD hides a guard's state, the music ignores it.
- **No count, no distance, no direction.** Intensity never scales with how many guards are alert or how close they
  are (the old `alive / 5` rule is removed because it leaked the enemy count). No music is panned toward a guard.
- **Calm stays calm.** A guard noticing the player at a level below the HUD's first indicator does not change the
  music.
- **Stingers** fire only on events that also show on screen or on the radio.

### 7.3 The Confrontation (bible 5.15)

A separate `confrontation` mode takes only an escalation value from 0 to 1 (the match's escalation timer). Both sides
hear the same music. No stingers.

| Escalation | Music |
| --- | --- |
| 0-0.3 | Calm stems, with the `bowed` Ab3 drone at -12 (the tritone hangs) |
| 0.3-0.6 | Suspicious harmony and sub, no pulse |
| 0.6-0.85 | Searching machine pattern at 50 % density, 84 BPM |
| 0.85-1 | Combat half-time at 168, no fills |

Changes still happen on phrase ends. The heartbeat is a sound effect, not music.

---

## 8. Map themes

A theme is a set of palette and motif choices on top of the shared state system. It sets:

```
transpose (semitones, -2..2), tempoNudge (BPM, -4..4), calmSet (TEX ids), hats (id),
metalSet (ids for METAL), motifInstrument, reverb per state, droneNotes, extra stinger layer
```

### 8.1 Warehouse (docks metal)

- **Calm:** distant `boom` (tuned to D1), `chain` rattles, a low two-tone drone at D1 and A1 that swells like a
  far-off ship's horn (slow 6 s attack, never a horn sample), a rare `rail` ping. `hall` reverb, long.
- **Suspicious:** rims swapped for small `plate` hits.
- **Searching:** `METAL` uses `boom` on step 0, `press` on the backbeat, `chain` fills.
- **Combat:** `snareMetal`; a `boom` under every phrase downbeat.
- **Motif:** `pipe` and `bassmetal`.

### 8.2 Kestrel Exchange (Mission 1)

- **Calm:** the call-board clock `tick` (never a steady clock: seeded, occasional), `relay` clicks far off, the
  `hum` of old wiring at -12, `static` crackle, and once in a long while a single bell partial. `room` reverb in the
  switchroom feel, `hall` for the MDF hall feel (the theme picks one per level; no position tracking).
- **Suspicious:** brushes replaced by `static` swishes; hats are `relay`s.
- **Searching:** `dial` pulse trains as 16th rolls; `relay` pull-in and release as hi-hats; `ring` bursts on the
  motif cell.
- **Combat:** hats are `relay`s; glitch fills are chopped `dial` and `ring`.
- **Motif:** `motifbell` (telephone bell partials).
- Textures pass through the telephone band (300 Hz to 3.4 kHz) at 30 % wet.

### 8.3 Later maps (notes only)

| Map | Colour |
| --- | --- |
| The Barrier | Pump throb as the pulse, sluice resonances, deep `boom`s in water |
| Meridian Quay | Glass: `glass` and `rail` dominate; cold, high, little bass in calm |
| The Cutting | Rail joints as the break, tunnel reverb, wheel squeal as `scrape` |
| Ashgrove | Transformer hum (100 Hz, buzzing), breaker clunks as `press`; Mission 7's blackout drops `hum` mid-level |

---

## 9. Stingers

Quantised to the next beat (16th in combat), except spotted, which is at once. Each ducks all stems by the amount
shown for its length, then releases over 0.5 s.

| Stinger | Sound | Length | Duck |
| --- | --- | --- | --- |
| **spotted** | A cluster of `pipe` hits on D, Eb and Ab at once, a `kick` and sub drop (D2 down to D1 in 0.3 s), and a bit-crushed reverse tail. Becomes bar 1 of combat. | 1.5 s | -9 dB, 0.6 s |
| **alarm raised** | The motif cell (E Bb A) on `ring`, struck twice; a `press` under the first. Not a siren (the alarm sound effect owns that). | 2.5 s | -6 dB, 1 s |
| **objective complete** | The Resolved form's last three notes (E C D) on `motifbell` and a `glass` shimmer, transposed to the current state. Quiet. | 2 s | -4 dB, 0.8 s |
| **checkpoint** | One `relay` click and a soft `motifbell` D5 at -18 dB. | 1 s | none |

Reserved for Phase 4 (adapter hooks only, no sound yet): `alarmLevelUp`, `bodyFound`, `missionFailed`.

---

## 10. Menu, briefing and results themes

### 10.1 Menu: the Night Shift theme

- 84 BPM, D minor, progression P4 (2.3), 16-bar loop with a 4-bar intro that plays once.
- `rainbed` and `static` underneath, `street` reverb.
- **Rhythmic undercurrent:** the round kick on 1, a `relay` tick on the off-beat 8ths, a muted `sub` pulse in
  dotted quarters. Low, steady, never a full beat.
- Bars 1-8: the motif statement on `motifbell`, twice (bars 1-2 and 5-6), dub delay on.
- Bars 9-16: the motif on `bassmetal`, with the Resolved form in bars 15-16 so the loop point feels like home.
- Loops seamlessly; the intro never repeats.

### 10.2 Briefing

- The menu theme reduced: drone, `sub` on D, the `tick` at quarter notes at -20, the motif in augmentation once per 8
  bars on the bell, far back.
- **Readable:** nothing between 1 and 4 kHz above -24 dB (the reading band stays clear); no sudden onsets; level 6 dB
  below the menu.
- 8-bar loop.

### 10.3 Results

- **Success:** the motif statement, then the Resolved form, ending on the Lights On chord (Dmaj9: D F# A C# E, bell-piano and
  `smear`), 20-25 s, then a soft bed loop (`air` and drone in D major colour) while the screen stays.
- **Failure or alarm-heavy:** the Unresolved form over an Eb drone, the last Bb held and bit-crushed as it decays;
  ends on the D-Ab tritone in the sub and `bowed`. 15-20 s, then the `air` loop.
- Which variant plays: failure, or more than one alarm raised in the mission, uses the failure variant (the adapter
  reads the result screen's data; Phase 4 may refine the rule).

---

## 11. Mix rules

1. **Bus:** all music goes to the existing `music` bus (`AudioEngine`, user volume, `x0.6` internal). No new bus.
2. **Under the effects.** Peak levels on the music bus before the user volume:
   - calm -30 dBFS RMS, suspicious -24, searching -20, combat -16, stingers peak at -10 dBFS.
   - Menu -18, briefing -24, results -18.
3. **Never pump the master compressor.** Music alone must not push the shared compressor into gain reduction (it would
   duck footsteps). Music bus peaks stay at or below -6 dBFS.
4. **Leave room for footsteps and the sound meter's cues.** A static -3 dB shelf-and-bell carve on the music bus at
   1.5-4 kHz in suspicious, searching and combat. M4 checks by ear against the real footsteps on concrete and metal at
   every gear; if a footstep is masked, music comes down, not the footstep.
5. **Phone translation.** Nothing important only below 120 Hz; every bass and kick is soft-clipped for harmonics.
   Kick and bass mono; width only on `AIR`, `TEX` and reverb returns.
6. **Voices:** at most 24 sources at once. Priority when stealing: stinger > bass > kick and snare > motif > chords >
   metal > texture. Steal the oldest of the lowest priority.
7. **Pause:** -12 dB and the 800 Hz low-pass (6.5).
8. **Fades** use `setTargetAtTime` with time constants of at least 30 ms (no clicks), except the combat cut under the
   spotted stinger.

---

## 12. Originality rules

**Hard rule:** inspired by the genre, never copied from a work.

What we match:

- The genre blend: noir downtempo, IDM / breakbeat / drum and bass, industrial texture.
- The palette categories: metal, glass, machinery, wires, clicks, as found sounds.
- The production techniques: chopping, resequencing, pitch shifting, reversing, bit reduction, generated space.
- The adaptive behaviour: near-silence when hidden, layers rising with the alert state, falling away slowly.
- The density curve and the mood: cinematic, mechanical, tense.

What we never match:

- Any specific track's melody, bass line, chord progression, arrangement, drum pattern or sound.
- Any recognisable sample, including famous breakbeats. Breaks are programmed fresh on a 16-step grid from our own
  synthesised hits; no well-known break is programmed note for note.
- Transcriptions: none in the repo, in comments, in prompts or in commit messages.

How we work:

- **References in words only.** This file, the spec and progress reports may describe the genre and name the
  inspiration. Code, comments, lab labels and in-game text never name an artist or a track.
- **No reference audio** is played into, stored in or analysed by the project.
- **Every melody, progression and pattern is written in this file or in code from scratch,** from the rules here.
- **The ear test:** at each listening stop, Michael (or anyone who knows the soundtrack) listens; if any cue makes them
  name a specific track, that cue is rewritten, not tweaked. Recorded in `music-progress.md`.
- **Stock material is fine:** minor-key and jazz chord moves, the general syncopation of breakbeat music, modal and FM
  synthesis methods. These belong to everyone.
- **No Splinter Cell IP** anywhere (CLAUDE.md).

---

## 13. Notes for the engine (M1)

- One seeded generator (e.g. mulberry32) with sub-streams: `library`, `patterns`, `calm`. A seed renders the same
  library and the same pattern sequence every time.
- Lookahead scheduler: a timer every 25-50 ms schedules everything due in the next 150 ms (combat at 168 BPM has 16ths
  of 89 ms). When the tab is hidden the timer throttles to about 1 Hz, so the lookahead widens to 1.5 s while hidden
  (`visibilitychange`) and the sequencer re-anchors to `currentTime` on resume without replaying missed events.
- Per scheduled event: one `AudioBufferSourceNode` into the stem gain (plus optional per-event gain and pan nodes).
  No per-frame allocation in the game loop; the adapter only writes numbers and flags.
- Every voice early-outs before the first user gesture (the engine's `whenReady`).
- The library render runs once after the first gesture, in chunks, and is measured (target under 1.5 s on the iPhone).
