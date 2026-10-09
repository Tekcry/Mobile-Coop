# Night Shift - music direction v2

Version 2.0 - 2026-10-09 (Stage V0). Replaces `docs/audio/music-direction.md` (v0.1, kept for history).
Brief: `C:\NightShift\bundles\music-direction-v2.md`. Build and staging rules: `docs/prompts/music-spec.md` Section 2.
Approval: Michael, by ear in the music lab.

**Why v2:** Michael heard the M1 calm and combat states and did not like them. The score keeps the found-sound skin
but gains clear phases, a melody that sticks and much richer sound design.

---

## 1. The blend

**Metal Gear Solid (1998) gives the shape and the melody; Chaos Theory gives the skin.**

| From | We take |
| --- | --- |
| MGS | Clear phases tied to detection that the player reads by ear. An instant alert stinger. A driving Alert theme with a big rhythmic hook on synth-brass. A low, ominous sneaking loop. Synth-orchestral colour: strings, brass stabs, timpani-like drums, snare rolls, bells and mallets. Tunes that stick. |
| Chaos Theory | Dark electronic found-sound percussion (metal, glass, machines). Breakbeat and drum-and-bass energy under Alert. Noir downtempo in Caution. Near-silence while undetected. |

**Every phase has a clear identity and a memorable figure (MGS), and is built from Hollowmere's industrial sounds and
modern electronic production (CT).**

Generated in code (WebAudio synthesis), as before. A permissively licensed soundfont is an open decision for Michael
(Section 13); until he decides, no samples.

---

## 2. Principles

1. **Phases you can hear.** Five phases, each with its own tempo, groove and lead sound. A player with eyes shut knows
   which one is playing within one bar.
2. **One motif runs through everything** (Section 5). Repetition with variation is the hook.
3. **Silence earns the alert.** Infiltration is mostly silent so the Alert stinger hits as hard as it can.
4. **Found sounds under the orchestra.** The synth-orchestral layer carries melody and harmony; the found-sound kit
   carries rhythm and texture. Neither replaces the other.
5. **Fair.** Music reflects only what the game already shows (Section 7.3).
6. **Under the sound effects.** Footsteps and the sound meter's cues win every collision (Section 10).
7. **Phone first.** The motif must read on the iPhone speaker; the bass must never vanish there.

---

## 3. The five phases

### 3.1 Summary

| Phase | Tempo | Key and harmony | Lead figure | Phrase | Reverb |
| --- | --- | --- | --- | --- | --- |
| **Infiltration** | Free time (no grid) | D pedal; Phrygian colour (Eb), rare Ab | Motif fragment on bell or filtered synth, every 60-120 s | None (events) | `darkHall` 3.2 s |
| **Caution** | **72 BPM** | D minor over a D pedal; minor-second rubs (D-Eb), muted noir chords | Motif in low strings or the sub / mid bass | 4 bars (13.3 s) | `darkHall` |
| **Alert** | **168 BPM** | D minor, driving; bass ostinato through D, Eb, Ab, C | Motif as the synth-brass hook, answered by metal hits | 8 bars (11.4 s) | `room` 0.8 s |
| **Evasion** | **168 BPM** (same grid as Alert) | D Phrygian / Locrian: D pedal with Eb and Ab clusters | No hook. Ostinato, percussion, risers, ticking | 8 bars (11.4 s) | `room`, wetter |
| **Menu** | 80 BPM | D minor, full progression | Motif full and noble on brass and strings | 16 bars | `hall` |

Shared tonic **D**. Pitch reference: D1 36.7 Hz, D2 73.4 Hz, D3 146.8 Hz, D4 293.7 Hz, D5 587.3 Hz; A4 = 440 Hz.

**Why these tempos:**

- Caution at 72 sits at a resting heart rate: wary, not panicked.
- Alert at 168 sits inside the brief's 160-175 range and keeps the M1 grid (16ths of 89 ms). Half-time feel is 84, so
  breakbeat half-time sections feel like a faster heart than Caution.
- Evasion shares Alert's grid so the Alert hook can drop out and come back on any bar without a tempo jump.

### 3.2 Infiltration

Near-silent dark ambience.

- **Bed:** a low drone (D2 + A2, slow detune drift), room air, the map's distant metal at long, irregular gaps (one event
  every 6-15 s, panned and far back in the hall).
- **Motif fragment:** every 60-120 s (seeded), the motif's first 2-3 notes on a bell or a low-passed synth, far back,
  then gone. Never in the first 45 s of a level, never twice in a row on the same instrument.
- **No beat, no bass line.** Level -30 dBFS RMS.
- **Technique:** silence and drop-outs (T7), motif fragment (T1).

### 3.3 Caution

Slow heartbeat pulse, noir downtempo.

- **Pulse:** a soft, round kick on beat 1 and a lighter one on the "and" of 1 (lub-dub), muted rim or relay click on 3.
  Light swing (55 %).
- **Bass:** sub bass holds a D pedal; the mid bass plays the **motif** once per phrase in A, its inversion in B.
- **Chords:** muted, low synth-strings or bell-piano, rootless, entering just after the beat. A section: Dm(add9) and
  Ebmaj7(#11) alternating (the D-Eb rub). B section: Bbmaj7, Gm9, Eø7, A7(b9) (the turn back to A).
- **Ostinato:** a quiet 2-note mallet figure (D-Eb or A-Bb) in 8ths over the pedal (T2), from bar 3 of each phrase.
- **Texture:** one found-sound event per bar; static crackle.
- **Form:** A A B A, each 4 bars, then repeat with seeded variation.
- **Techniques:** heartbeat tempo (T3), ostinato and pedal (T2), minor seconds (T4), motif in the bass (T1), A/B (T10).

### 3.4 Alert

The most memorable music in the game.

- **Entry:** the Alert stinger (Section 6) is bar 0. Its last beat is silence (the drop, T7). The hook lands on bar 1,
  beat 1.
- **Drums:** a straight driving pulse (big synth kick on every beat in A, gated-reverb snare on 2 and 4) with a
  syncopated, chopped found-sound break on top (metal, glass, relays) in 16ths (T8). Snare rolls (16ths, then 32nds,
  rising) into every phrase end. Timpani-like booms on phrase downbeats.
- **Bass:** a fast ostinato in 8ths: distorted mid bass over sub, D with Eb, Ab and C accents (T2). Sidechain ducked to
  the kick.
- **Hook:** the motif on FM synth-brass, stated over 2 bars, answered over 2 bars by chopped metal hits playing the
  motif's rhythm (call and response, T9). Hook plays bars 1-4 and 5-8 of A.
- **Strings:** sustained high strings on D and A (fifths) for width; a rising string line in B.
- **Form:** A (hook, 8 bars) A' (hook up a fourth over G pedal for bars 5-8) B (8 bars: brass stabs on syncopated
  hits, strings take a counter-line, break goes half-time for 4 bars) A. Fills at every phrase end. Seeded variation
  every 8 bars.
- **Techniques:** stinger and drop (T6, T7), motif as hook (T1), ostinato (T2), groove under pulse (T8), call and
  response (T9), A/B with fills (T10).

### 3.5 Evasion

The Alert theme stripped down: a countdown without a number.

- **Kept from Alert:** the bass ostinato, the found-sound break, the kick pulse (half density: beats 1 and 3).
- **Dropped:** the brass hook and high strings. The snare moves to beat 3 (half-time feel).
- **Added:**
  - **Ticking:** a clock-like tick in 8ths (relay or glass) that thickens to 16ths over a phrase.
  - **Endless rise:** a Shepard-style riser (Section 4.7) under every phrase; it keeps climbing and never arrives (T5).
  - **Dissonance:** low string cluster D-Eb and a tritone pedal (D under Ab) every second phrase (T4).
  - **Motif shadow:** the motif's rhythm only, on muted metal, once per 16 bars, no pitch. The player hears the hook's
    ghost.
- **Build:** each phrase in Evasion opens the bass filter and lifts the tick density by one step, capped at 4 phrases,
  then holds.
- **Techniques:** ostinato and pedal (T2), faster than heartbeat (T3), dissonance (T4), rising illusion (T5).

### 3.6 Back down

- **Evasion -> Caution** at a phrase end (Section 7.2): the last Evasion bar goes half-time with a tape-stop on the
  ostinato; one bar of riser tail and drone; Caution's grid starts at 72 on the next downbeat with its pulse alone,
  chords from bar 2.
- **Caution -> Infiltration** decays over 20-40 s (two or three Caution phrases): first the ostinato goes, then the
  pulse, then the chords; the sub fades into the drone; the last event is a single distant bell (the motif's first
  note). Never a hard cut.

---

## 4. Instruments and how each is made

All instruments are rendered at load into buffers (pure JS DSP, as M1), at a few root pitches, and pitched at play time
with `playbackRate` within +-7 semitones. Sustained notes use a looped region. Chords that always sound together are
rendered as one buffer per voicing, so a chord costs one voice.

### 4.1 Synth-brass (the hook)

- **Core:** two saws detuned +-6 cents plus a 1:1 FM pair (index follows the amplitude envelope, 0.5 to 3), so it gets
  brighter as it gets louder.
- **Bite:** a low-pass whose cutoff tracks the envelope (500 Hz to 4 kHz in 40 ms, settling to 1.8 kHz); a pitch scoop
  from -30 cents to 0 in 35 ms; a short noise breath at the attack (-24 dB).
- **Swell:** a second variant with a 180 ms attack and a slow cutoff rise, for held notes and the menu.
- **Stab:** a 4-note voicing rendered as one buffer, 120 ms decay to sustain, for B sections and stingers.
- **Saturation:** soft clip at render time for body on the phone speaker.
- Roots: D3, A3, D4.

### 4.2 Synth-strings

- Seven saws spread +-14 cents, each with its own slow random drift (0.1-0.3 Hz), low-passed at 2.5 kHz with gentle
  resonance; attack 300-900 ms, release 1.2 s.
- Rendered stereo: odd saws left, even saws right, plus a slow chorus (two modulated delays, 7 and 11 ms).
- Variants: `stringsLow` (D2-D3 cluster and pedal notes, darker, cutoff 900 Hz), `stringsHigh` (fifths, D5 and A5),
  `stringsMuted` (Caution chords: shorter, cutoff 1.2 kHz).

### 4.3 Bells and mallets

| Id | Sound | Synthesis |
| --- | --- | --- |
| `bellFM` | Glassy bell (motif fragment, menu) | FM, ratio 1 : 3.5, index 4 decaying to 0.3 over 1.5 s; amplitude decay 3 s. |
| `motifbell` | Telephone bell (Kestrel colour) | M1 additive bell, kept. |
| `marimba` | Wooden mallet (ostinato) | Modal bar, modes 1 : 3.93 : 9.24 (tuned bar), decays 0.6 / 0.15 / 0.05 s; soft noise strike. |
| `vibes` | Metal mallet (menu, results) | Modal bar 1 : 4 : 10, longer decay (2.5 s), 5 Hz amplitude tremolo at 20 % depth applied at play time. |
| `glock` | High mallet (objective stinger) | Modal 1 : 2.76 : 5.40, bright, 1 s decay. |

### 4.4 Bass

| Id | Sound | Synthesis |
| --- | --- | --- |
| `sub` | Sub bass | M1 sub (sine + 2nd and 3rd harmonics, soft clip). |
| `midbass` | Distorted mid bass (Alert ostinato) | Saw + square an octave up at -10 dB, filter envelope 2.5 kHz to 400 Hz in 90 ms, then `tanh` drive x4, then a band-pass 120 Hz-2 kHz. Layered at play time over `sub`. |
| `pedalbass` | Caution motif bass | Triangle + sine, soft clip, slow 25 ms attack; round and dark. |

### 4.5 Big synth drums

| Id | Sound | Synthesis |
| --- | --- | --- |
| `kickBig` | Alert kick | Sine 180 to 48 Hz (25 ms then 180 ms), click, soft clip, plus a 60 Hz body tail; mono. |
| `kickSoft` | Caution heartbeat | Sine 90 to 45 Hz, 300 ms, no click, low-passed at 400 Hz plus soft clip for phone harmonics. |
| `snareGated` | Gated-reverb snare | M1 snare into a short dense generated reverb (0.9 s), hard-gated at 220 ms with a 15 ms release. |
| `snareRoll` | Snare rolls | Rendered rolls: 1 bar and 2 bars, 16ths into 32nds with a crescendo of 18 dB; at 168 BPM (and 72 for menu). |
| `timp` | Timpani-like boom | Modal membrane ratios 1, 1.50, 1.98, 2.44, 2.94; pitch drops 3 % over 0.3 s; felt-mallet noise; 2.5 s decay. Roots D2 and A1. |
| `tomLo`, `tomHi` | Tuned toms (fills) | Sine with pitch drop (D3 / A3 to -5 semitones), noise skin, 400 ms. |
| `crash` | Metal crash | Dense M1 `plate` modes 2-12 kHz with a 2 s decay; reversed copy `crashRev` (riser into downbeats). |

### 4.6 The found-sound kit

Kept from M1 (`src/audio/music/library.ts`): metal (`pipe plate boom rail hum scrape chain`), glass and clicks
(`glass click relay dial tick`), machines (`thump piston motor press`), small drums (`hatC hatO rim ghost brushTap`),
textures (`drone air static rainbed`). These play the chopped break, the texture events and the answers in Alert.

### 4.7 Risers and the endless rise

- `riser`: noise through a band-pass sweeping 400 Hz to 6 kHz over 2 bars, plus a saw gliding up an octave, 2 bars at
  168.
- `shepard`: six sine-and-triangle voices an octave apart rising together by one octave over 8 bars; each voice's level
  follows a fixed bell curve over pitch, so the top fades out as a new bottom fades in and the loop never arrives.
  Rendered as one seamless 8-bar loop at 168 BPM.

### 4.8 Budget

- Library total at most **100 s of mono-equivalent audio** (about 19 MB as Float32), up from 60 s.
- Render in two batches: **Batch 1** (Infiltration, Caution, the Alert stinger and the Alert core: brass, kick, snare,
  midbass) under **1.5 s on the iPhone**; **Batch 2** (everything else) in idle chunks after it, under another 2 s.
  Until Batch 2 is ready, Alert plays without strings, rolls and the crash; nothing waits for it.
- At most **24 voices**; under **0.5 ms main-thread per frame** for scheduling (spec).

---

## 5. The main motif

### 5.1 Rules for the candidates (V1)

1. **4-7 notes**, within a ninth, over **2 bars** of 4/4.
2. **Rhythm first:** a rhythm that is recognisable on unpitched metal alone (the Evasion shadow and the Alert answer
   depend on it). At least one syncopation (a note off the beat that is held across it).
3. **One tension interval** (a tritone or a minor second) that can be resolved by changing **one** note (the success
   form) and broken by removing the last note (the failure form).
4. **Works at 72 and 168 BPM** and in the bass as well as on top.
5. **Starts and ends on chord tones of D minor** (D, F or A), so it sits over the D pedal of every phase.
6. **Singable:** Michael can hum it after one hearing.
7. **Original:** written from these rules. Each candidate gets an ear test (Section 12) before it is picked.

V1 composes three candidates. The M0 motif (D F E Bb A) may be one of them if it still fits these rules.

### 5.2 Where the chosen motif appears

| Form | Phase or cue | Instrument |
| --- | --- | --- |
| Fragment (first 2-3 notes) | Infiltration, every 60-120 s | `bellFM` or low-passed synth, far back |
| Bass statement and inversion | Caution, once per phrase | `pedalbass` (A) and `stringsLow` (B) |
| Hook | Alert | Synth-brass, answered by metal in its rhythm |
| Rhythm shadow | Evasion, once per 16 bars | Muted metal, no pitch |
| Full and noble | Menu | Brass swell, then strings, over timpani |
| Augmented | Briefing | `vibes`, far back |
| Resolved | Success results, objective stinger | Brass and `vibes`, ending on a clear D minor chord |
| Broken | Failure results | Strings, last note missing, held and bit-crushed |

---

## 6. Stingers (the sound language)

Each stinger has one job and one sound. They are distinct in register and length so the player learns them.

| Stinger | When | Sound | Length | Duck | Quantise |
| --- | --- | --- | --- | --- | --- |
| **Alert** | Any phase -> Alert | Original design, **low and wide** (not a high ping): a reversed `crash` swelling over 120 ms into a hit of `timp` D2 + `kickBig` + a 4-note brass stab cluster (D, Eb, Ab, D: minor second and tritone) + a metal `press`; sub drop D2 -> D1 over 0.4 s; then exactly one beat of silence. The loudest sound in the score: peak -10 dBFS. | 1 bar at 168 (1.43 s) | -12 dB, 0.6 s | At once (becomes bar 0) |
| **Re-alert** | Evasion -> Alert | The Alert stinger's hit only (no swell), shorter tail. | 2 beats | -9 dB | Next 16th; hook on next bar |
| **Body found** | A body is found (Phase 4 hook; only when the game shows it) | Dark hit: `timp` A1 + `stringsLow` D2-Eb2 cluster swelling over 1.5 s + low `boom`. No brass. | 2.5 s | -6 dB, 1 s | Next beat |
| **Alarm raised** | The alarm goes on | The motif's first three notes on `ring`, struck twice, over a `press`. Not a siren. | 2.5 s | -6 dB, 1 s | Next beat |
| **Objective** | Objective complete | The motif's resolved ending as a short rising figure on `glock` + brass swell, 3 notes up. Quiet. | 2 s | -4 dB | Next beat |
| **Checkpoint** | Checkpoint reached | One `relay` click and one soft `bellFM` D5. | 1 s | none | Next beat |

- **Rate limit:** the full Alert stinger at most once per 20 s; within that window a new Alert uses the Re-alert.
- Stingers have top voice priority and use at most 6 voices.
- Phase 4 hooks still reserved: `alarmLevelUp`, `missionFailed`.

---

## 7. Phase logic

### 7.1 Mapping from the guards (adapter)

The adapter reads the highest `AlertLevel` among living guards (`src/ai/alertState.ts`: `unaware | suspicious |
investigating | searching | alert | cooldown`) plus "any guard sees the player" and "shots fired". Michael's rule
stands: music follows every guard's state, never count, distance or direction.

| Guard state (highest) | Target phase |
| --- | --- |
| `alert` and (any guard sees the player, or shots in the last 4 s) | **Alert** |
| `alert` with no sighting and no shots for 6 s; or `searching` | **Evasion** |
| `suspicious`, `investigating` | **Caution** |
| `unaware`, `cooldown` | **Infiltration** (via Caution if coming down from Evasion, Section 7.2) |

`cooldown` lasts forever after combat (guards never return to `unaware`), so it must not hold Caution.

- **Alarm raised:** floor of Caution while the alarm lasts (Phase 4 sets the alarm levels; the adapter exposes the floor).
- **Sandbox:** the table applies; with no guards, Infiltration.

### 7.2 Transitions

**Upwards (instant or next beat):**

| From -> to | When | How |
| --- | --- | --- |
| Any -> Alert | At once | Alert stinger (bar 0), one beat silent, hook on bar 1. Lower phases cut under the stinger. |
| Evasion -> Alert | Next 16th | Re-alert stinger; hook and strings return on the next bar downbeat. Grid continues (same tempo). |
| Infiltration -> Caution | Next beat (the 72 grid starts on the change) | Pulse fades in over 1 beat; chords from bar 2. |
| Infiltration or Caution -> Evasion (e.g. a search after a body is found) | Next beat | The 168 grid starts; ostinato and ticks from beat 1; riser over the first phrase. |

**Downwards (phrase ends, with hysteresis):**

| From -> to | Hold (target stays lower for) | Then |
| --- | --- | --- |
| Alert -> Evasion | 6 s with no sighting and no shots (the adapter's rule) | At the next 2-bar boundary: a fill, the hook and strings drop out, snare to beat 3. |
| Evasion -> Caution | 8 s with no guard `alert` or `searching` | At the next phrase end: half-time bar, tape-stop, Caution grid (Section 3.6). |
| Caution -> Infiltration | 10 s with no guard `suspicious` or `investigating` | Decay over 2-3 Caution phrases (20-40 s), one layer per phrase (Section 3.6). |

- **Minimum dwell:** every phase plays at least one full phrase before it may fall (Alert: 8 bars after the hook).
- **Interrupted fall:** if the target rises during a fall or decay, the fall stops and layers return over 1 beat on the
  next beat.
- **Every change must be readable by ear alone:** each phase change adds or removes the phase's lead figure or its
  pulse, never only a level change.

### 7.3 Fairness

- No count, no distance, no direction; nothing panned toward a guard.
- A guard's meter rising while still `unaware` changes nothing.
- Stingers fire only on events that also show on screen or on the radio.
- **The Confrontation** (bible 5.15) follows only the escalation value (0-1), never positions, and plays no stingers:
  0-0.3 Infiltration, 0.3-0.6 Caution, 0.6-0.85 Evasion, 0.85-1 Alert without the stinger. Changes at phrase ends.

---

## 8. Technique map

| # | Technique | Where it is used |
| --- | --- | --- |
| T1 | One main motif, varied | Every phase and theme (table 5.2) |
| T2 | Ostinato and pedal tones | Caution mallet ostinato over the D pedal; Alert and Evasion bass ostinato; Evasion tritone pedal |
| T3 | Heartbeat tempo | Caution at 72 (lub-dub kick); Evasion's half-time snare over the 168 grid feels faster |
| T4 | Dissonant intervals | Caution D-Eb rub; Evasion D-Eb clusters and D-Ab pedal; Alert stinger cluster; resolution to a clear D minor in the success results |
| T5 | Rising illusions | Evasion `shepard` loop and phrase risers; snare rolls into Alert phrase ends |
| T6 | Stingers | Section 6 |
| T7 | Silence and drop-outs | Infiltration mostly silent; one silent beat between the Alert stinger and the hook; 1-beat drops before some Alert phrase downbeats |
| T8 | Groove and syncopation | Alert and Evasion: chopped found-sound break over a straight kick pulse |
| T9 | Call and response | Alert: brass hook answered by metal hits in the motif's rhythm |
| T10 | Variation | Seeded changes every 4-8 bars; fills at phrase ends; A/B sections in Caution and Alert |

**Variation rule:** no loop is heard twice identically within 2 minutes. Seeded changes: swap 1-3 break steps, move
ghost notes, swap a found sound in its family, pick the next chord pair, choose a fill from at least four.

---

## 9. Character, space and mix glue

- **Tape-style saturation:** a gentle `tanh` waveshaper (2x oversampled) on the music bus before the compressor, drive
  set so it adds harmonics without audible distortion on the menu theme.
- **Chorus:** on strings at render time; one runtime chorus send (two modulated delays) for pads and bells.
- **Stereo:** width only on strings, pads, bells, texture and reverb returns. Kick, snare, bass and the brass hook are
  mono and centred. Reverb returns are high-passed at 150 Hz (mono low end).
- **Reverbs (generated impulse responses):**
  - `darkHall`: 3.2 s, dark tail (high bands decay fast), for Infiltration and Caution.
  - `room`: 0.8 s, for Alert and Evasion.
  - `hall`: 2.4 s, brighter, for menu and results.
  - At most two convolvers live (current and next phase during a transition).
- **Bus compressor:** ratio 2:1, threshold set so Alert sees 2-3 dB of gain reduction, attack 20 ms, release 200 ms.
  Infiltration and Caution never touch it.
- **Sidechain ducking:** Web Audio has no sidechain input, so the scheduler, which knows every kick time, writes a gain
  dip on the BASS and HARM stems at each `kickBig` (-4 dB, 10 ms attack, 120 ms release). Alert only; Evasion -2 dB.
- **Limiter:** stays gentle, music bus peaks at or below -6 dBFS (M1 ceiling), so the shared master compressor never
  ducks footsteps because of music.
- **Era colour (lab switch, default off): "PS1 sampler".** At render time, a copy of the brass, strings and bell layers
  is sample-and-held to 22.05 kHz with a 12-bit quantise and a 10 kHz low-pass. The lab swaps between clean and era
  buffers. Michael decides by ear whether it ships, and on which layers.

---

## 10. Mix rules

1. **Bus:** the existing `music` bus (user volume, x0.6). No new bus.
2. **Levels** on the music bus before the user volume (starting values; V4 sets the final mix by ear):

   | Cue | RMS (dBFS) |
   | --- | --- |
   | Infiltration | -32 |
   | Caution | -24 |
   | Evasion | -19 |
   | Alert | -16 |
   | Stingers | peak -10 |
   | Menu / briefing / results | -18 / -26 / -18 |

3. **Footsteps first.** A static -3 dB carve at 1.5-4 kHz on the music bus in Caution, Evasion and Alert. If a
   footstep or a sound-meter cue is masked, the music comes down, not the effect.
4. **Phone translation:** every bass and kick carries harmonics above 120 Hz (soft clip, the `midbass` layer); the brass
   hook's fundamental sits at D4-A4 so it reads on the speaker.
5. **Check both playback paths** at every listening stop: iPhone speaker and headphones. The motif must read on the
   speaker; the bass must not vanish there.
6. **Voices:** at most 24. Steal priority: stinger > bass > kick and snare > hook / motif > strings and chords > metal >
   texture. Steal the oldest of the lowest priority.
7. **Pause:** -12 dB and an 800 Hz low-pass over 0.3 s; the sequencer keeps time.
8. **Fades** use time constants of at least 30 ms, except the cut under the Alert stinger.

---

## 11. Menu, briefing, results and map colours

### 11.1 Menu: the Night Shift theme

- 80 BPM, D minor, 16-bar loop with a 4-bar intro that plays once (drone, `timp` roll swelling, rain-like texture).
- Bars 1-8: the motif full on synth-brass swell, answered by `vibes`; strings hold Dm, Bbmaj7, Gm, A.
- Bars 9-16: the motif on strings an octave down, brass countermelody; timpani on bar downbeats; ends on the resolved
  form so the loop point feels like home.
- Found-sound undercurrent: relay ticks on the off-beats, a muted sub pulse.

### 11.2 Briefing

The menu reduced: drone, sub on D, the motif augmented on `vibes` once per 8 bars, far back. Nothing between 1 and
4 kHz above -24 dB (reading stays easy). 8-bar loop.

### 11.3 Results

- **Success:** the motif, then its resolved form on brass and `vibes`, landing on a clear D minor chord (strings, brass
  swell, `timp`), 20-25 s, then a soft bed.
- **Failure (or more than one alarm):** the broken form on strings, its last note missing, the held note bit-crushed as
  it decays over an Eb drone; ends on the D-Ab tritone. 15-20 s, then air.

### 11.4 Map colours

A colour swaps found sounds and reverb on top of the shared phases; the motif, tempos and phase logic do not change.
Transpose up to +-2 semitones.

- **Warehouse (docks metal):** Infiltration: distant `boom` tuned to D1, `chain` rattles, a far horn-like D1 + A1 swell.
  Caution: `plate` replaces the rim. Alert: `snareMetal` layered on the gated snare; `boom` under every phrase downbeat;
  the hook's answer on `pipe`. Evasion: ticking on `chain` micro-hits.
- **Kestrel Exchange:** Infiltration: the call-board `tick` (seeded, never steady), far `relay` clicks, wiring `hum`,
  `static`, the motif fragment on `motifbell`. Caution: relays for hats. Alert: the hook's answer on `ring` and `dial`
  rolls. Evasion: ticking on `relay` pull-in and release. Textures through the telephone band at 30 % wet.

---

## 12. Originality rules (hard rule)

- **Never reproduce or imitate** a specific track, melody, chord progression, rhythm, sound or sample from Metal Gear
  Solid (Konami) or Splinter Cell (Ubisoft / Amon Tobin). This includes MGS's alert "!" sound: our Alert stinger is an
  original design (Section 6), deliberately low and wide rather than a short high stab.
- **Match techniques, structure and feel only:** phases tied to detection, stingers, ostinatos, synth-orchestral colour,
  found-sound breaks, near-silence while hidden.
- **References in words only.** This file, the spec, the brief and progress reports may name the inspirations. Code,
  comments, lab labels and in-game text never name a game, artist or track.
- **No reference audio** is played into, stored in or analysed by the project. No transcriptions anywhere: repo,
  comments, prompts or commit messages.
- **Every motif, progression and pattern is written here or in code from scratch.** Stock material is fine: minor-key
  chord moves, breakbeat syncopation in general, FM and modal synthesis.
- **Ear test:** at every listening stop, Michael listens for resemblance to any known cue. If he names one, the cue is
  rewritten, not tweaked. Logged in `music-progress.md`.
- **No Splinter Cell or Metal Gear IP** anywhere (names, logos, sounds).

---

## 13. Open decision for Michael

**Soundfont:** a free, permissively licensed (CC0 or similar) instrument sample set would make the brass, strings and
timpani far more convincing than pure synthesis. It would need an exception to the CLAUDE.md "no external audio" rule
(bible S7). Until Michael decides, everything stays generated in code.

---

## 14. Notes for the engine (V2)

- Rename the conductor states: calm -> `infiltration`, combat -> `alert`; add `caution` and `evasion`.
- The phase machine is pure (no Web Audio) and unit-tested: targets, holds, dwell, phrase-end scheduling, stinger rate
  limit, interrupted falls.
- New stems: `STR` (strings), `BRASS` (hook and stabs), `DRUM` (big synth drums), alongside M1's nine; the lab mutes each.
- Sidechain dips are scheduled automation, not per-frame code.
- Lab: "Phase ladder demo" (scripted 2-minute run), A/B toggle per phase, "PS1 sampler" switch, WAV export per phase.
- No per-frame allocation in the adapter; it writes numbers and flags only.
