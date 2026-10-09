# Night Shift - music direction v2

Version 2.1 - 2026-10-09 (Stage V1, round 2). Replaces `docs/audio/music-direction.md` (v0.1, kept for history).
Brief: `C:\NightShift\bundles\music-direction-v2.md`. Build and staging rules: `docs/prompts/music-spec.md` Section 2.
Approval: Michael, by ear in the music lab.

**Why v2:** Michael heard the M1 calm and combat states and did not like them. The score keeps the found-sound skin
but gains clear phases and much richer sound design.

**Why v2.1 (Michael, 2026-10-09):** he did not like any of the first three motifs (bright bell, heroic brass hook, menu
fanfare), found the bell loud and jarring, and asked for the score to reflect the Chaos Theory soundtrack. So the
**sound, the melody and the arrangement now follow Chaos Theory**; Metal Gear Solid keeps only the **phase structure**
(five readable phases, an instant alert stinger, near-silence while hidden). No heroic brass, no bright bells, no
fanfares, no hummable tune.

---

## 1. The blend

**Chaos Theory gives the sound, the melody and the arrangement; Metal Gear Solid gives only the phase shape.**

| From | We take |
| --- | --- |
| Chaos Theory | Dark noir-electronic music: dusty, swung downtempo beats and chopped breakbeat / drum-and-bass under action; double bass and low, muted horns; orchestral strings cut into short stabs and pitched down as if sampled from old records; reversed swells; industrial found-sound percussion (metal, glass, machines); crackle and tape grain; long low drones; near-silence while undetected. Melody is a short, low, dark **figure** that lives in the bass and the horns, not a tune on top. |
| MGS (structure only) | Clear phases tied to detection that the player reads by ear. An instant alert stinger. A wary middle phase and a hunting phase before calm returns. |

**v2.2 (Michael, 2026-10-09): "better reflect the GoldenEye N64 pause menu theme".** A new colour sits beside the
noir one: cool spy-lounge jazz (brushes and a skipping ride, walking upright bass, soft vibes comping, a muted horn on
the figure, the minor chord with a major seventh), with an N64-style sampler grain (24 kHz, 12-bit, 7 kHz low-pass) on
the band. Feel and technique only: no melody, bass line or vamp from that theme or from any spy-film theme.

Generated in code (WebAudio synthesis), except a small bundled CC0 instrument sample set for the orchestral and band
layer, which Michael allowed on 2026-10-09 (Section 13).

---

## 2. Principles

1. **Phases you can hear.** Five phases, each with its own tempo, groove and lead sound. A player with eyes shut knows
   which one is playing within one bar.
2. **One figure runs through everything** (Section 5): low, short, dark, carried by bass, horn and chopped stabs.
   Repetition with variation is the hook; the groove does the rest.
3. **Silence earns the alert.** Infiltration is mostly silent so the Alert stinger hits as hard as it can.
4. **Dark and low.** Melody sits in D2-D4. Nothing bright or piercing; anything above 2 kHz is texture, not melody.
   No bell or tone is ever louder than the beat it sits in.
5. **Sampled, not pristine.** Orchestral sounds are chopped, pitched down, crushed a little and soaked in crackle and
   reverb, as if cut from old records; found sounds carry the rhythm.
6. **Fair.** Music reflects only what the game already shows (Section 7.3).
7. **Under the sound effects.** Footsteps and the sound meter's cues win every collision (Section 10).
8. **Subtle (Michael, 2026-10-09).** Soft attacks, low levels, lots of room. Nothing jumps out of the mix except
   the Alert stinger; when in doubt, quieter and darker.
9. **Phone first.** The figure must read on the iPhone speaker (bass voices carry harmonics); the bass must never
   vanish there.

---

## 3. The five phases

### 3.1 Summary

| Phase | Tempo | Key and harmony | Lead figure | Phrase | Reverb |
| --- | --- | --- | --- | --- | --- |
| **Infiltration** | Free time (no grid) | D pedal; Phrygian colour (Eb), rare Ab | A fragment of the figure on a soft, dark bell or the upright bass, far back, every 60-120 s | None (events) | `darkHall` 3.2 s |
| **Caution** | **84 BPM**, swung | D minor over a D pedal; minor-second rubs (D-Eb), low string chords | The figure on upright bass, answered by the muted horn | 4 bars (11.4 s) | `darkHall` |
| **Alert** | **168 BPM** | D minor / Phrygian; reese bass through the figure | The figure on the reese bass, answered by chopped string stabs and metal | 8 bars (11.4 s) | `room` 0.8 s |
| **Evasion** | **168 BPM** (same grid), felt half-time | D Phrygian / Locrian: D pedal with Eb and Ab clusters | No figure. Pedal bass, break, risers, ticking | 8 bars (11.4 s) | `room`, wetter |
| **Menu** | 70 BPM | D minor, low strings, noir colour | The figure on bass, then horn, then stabs; resolved on the horn | 16 bars | `hall` |

Shared tonic **D**. Pitch reference: D1 36.7 Hz, D2 73.4 Hz, D3 146.8 Hz, D4 293.7 Hz, D5 587.3 Hz; A4 = 440 Hz.

**Why these tempos:**

- Caution at 84 is half of 168: the downtempo groove and the breakbeat share one pulse, so Alert can arrive as
  "the same beat, doubled", the way breakbeat music moves between half-time and full time.
- Alert at 168 keeps the M1 grid (16ths of 89 ms).
- Evasion shares Alert's grid but sits half-time, so the figure can return on any bar without a tempo jump.

### 3.2 Infiltration

Near-silent dark ambience.

- **Bed:** a low drone (D2 + A2, slow detune drift), room air, line crackle at a whisper, the map's distant metal at long,
  irregular gaps (one event every 6-15 s, panned and far back in the hall).
- **Figure fragment:** every 60-120 s (seeded), the figure's first 2-3 notes on the soft `darkbell` or the upright bass,
  far back and quiet (at least 12 dB under the bed's loudest event), then gone. Never in the first 45 s of a level.
- **No beat.** Level -32 dBFS RMS.
- **Technique:** silence and drop-outs (T7), figure fragment (T1).

### 3.3 Caution

Noir downtempo: a dusty, swung beat.

- **Pulse:** soft round kick on 1 and the "and" of 3, a dark snare (pitched down, roomy) on 2 and 4, ghost notes, quiet
  closed hats; swing 57 %. Relay clicks as percussion now and then.
- **Bass:** upright bass. The **figure** once per phrase in A; a D pedal and walking fragments of the figure in B.
- **Answer:** the muted horn plays the figure (or its second half) in the bar after the bass, low and soft.
- **Chords:** low synth-strings, rootless, swelling in after the beat: A section Dm and Ebmaj7 (the D-Eb rub); B section
  Bb (with G), Gm (with Eb), A7(b9) shell.
- **Texture:** line crackle, one found-sound event per bar.
- **Form:** A A B A, each 4 bars, then repeat with seeded variation.
- **Techniques:** figure in the bass (T1), pedal (T2), minor seconds (T4), call and response (T9), A/B (T10).

### 3.4 Alert

The breakbeat: the most driving music in the game.

- **Entry:** the Alert stinger (Section 6) is bar 0. Its last beat is silence (the drop, T7). The break lands on bar 1.
- **Drums:** a chopped breakbeat (tight kick, snare on 2 and 4, ghost notes, hats), its kick pattern re-chopped every bar
  (T8); a half-time bar every 4 or 8 bars to breathe; stuttered snare fills at phrase ends; metal and click hits in the
  gaps.
- **Bass:** the reese plays the **figure** (bars 1-2 and 5-6 of each 8), a D pedal under the answers. Sidechain-ducked to
  the kick.
- **Answer:** the figure on **chopped string stabs**, doubled by plate hits (bars 3-4 and 7-8) (call and response, T9).
- **B section:** the break goes half-time for 4 bars, the stabs play the figure's rhythm on one chord, a reversed swell
  leads back into A.
- **Techniques:** stinger and drop (T6, T7), figure in the bass (T1), groove (T8), call and response (T9), A/B with
  fills (T10).

### 3.5 Evasion

The breakbeat stripped down: a countdown without a number.

- **Kept from Alert:** the reese as a D pedal, the break at half density (kick on 1, snare on 3: half-time).
- **Dropped:** the figure and the stabs.
- **Added:**
  - **Ticking:** a clock-like tick in 8ths (relay or glass) that thickens to 16ths over a phrase.
  - **Endless rise:** a Shepard-style riser (Section 4.7) under every phrase; it keeps climbing and never arrives (T5).
  - **Dissonance:** low string cluster D-Eb and a tritone pedal (D under Ab) every second phrase (T4).
  - **Figure shadow:** the figure's rhythm only, on muted metal, once per 16 bars, no pitch.
- **Build:** each phrase opens the bass filter and lifts the tick density by one step, capped at 4 phrases, then holds.
- **Techniques:** pedal (T2), dissonance (T4), rising illusion (T5).

### 3.6 Back down

- **Evasion -> Caution** at a phrase end (Section 7.2): a tape-stop on the last Evasion bar; one bar of drone and
  crackle; Caution's swung beat starts at 84 on the next downbeat, bass from bar 2.
- **Caution -> Infiltration** decays over 20-40 s (two or three Caution phrases): first the horn goes, then the beat,
  then the chords; the bass plays one last D and the drone takes over. Never a hard cut.

---

## 4. Instruments and how each is made

All instruments are rendered at load into buffers (pure JS DSP, as M1), rooted on a D, and pitched at play time with
`playbackRate` within +-7 semitones. Sustained notes use a looped region. Once the CC0 sample set lands (Section 13),
the lab A/Bs each sampled voice against its synthesised one.

### 4.1 Band and orchestra (built in V1 round 2)

| Id | Sound | Synthesis |
| --- | --- | --- |
| `upright` | Soft plucked double bass (root D2) | Karplus-Strong played with the flesh of the finger: a doubly low-passed, hump-shaped excitation, an averaging damping filter (about 1.6 s to -60 dB), a 3 ms onset (no click), a warm body at 95 Hz, low-passed at 700 Hz, barely clipped. |
| `horn` | Soft, breathy horn (root D3) | Six additive harmonics falling as 1/n^2 (mellow), a 220 ms raised-cosine swell with no strike, breath noise riding the tone, a gentle late vibrato, low-passed at 1.1 kHz. No FM, no clipping. |
| `stab` | Soft chopped string stab (root D3) | An open fifth with the octave (D3 A3 D4), each from four detuned saws; 12 ms attack, 150 ms decay; dark low-pass (550-1200 Hz, then 3 kHz); 12-bit grain held every second sample, as if sampled. |
| `swell` | Reversed string swell | A longer `stab` (450 ms decay), reversed: it rises into a downbeat. |
| `strings` | Low string pad (root D3, loop) | Seven saws +-14 cents, each drifting slowly; low-passed at 2.2 kHz. Attack and release at play time. |
| `darkbell` | Soft, dark bell (root D4) | Harmonic FM (1:2), index 1.2 falling to 0.1, 6 ms attack, low-pass 1.8 kHz. A distant tone, not a strike. Always quiet. |

Removed after Michael's first listen: the bright FM bell, vibes and the heroic synth-brass hook. Softened after the
second (2026-10-09): the first upright was too aggressive and the FM horn sounded like a bad piano.

### 4.2 Bass

| Id | Sound | Synthesis |
| --- | --- | --- |
| `upright` | Caution and menu figure | 4.1. |
| `reese` | Alert figure and pedals | M1 reese (two detuned saws, slow filter LFO, sub under it). |
| `sub` | Sub bass | M1 sub (sine + 2nd and 3rd harmonics, soft clip). |
| `midbass` | Distorted mid bass (Alert colour, optional) | Saw + square an octave up, filter envelope 2.5 kHz to 400 Hz, `tanh` drive, band-pass 120 Hz-2 kHz. |

### 4.3 Drums

- **Breaks and downtempo kit:** M1 `kickTight`, `kickRound`, `snare` (pitched down for Caution), `ghost`, `hatC`,
  `hatO`, `rim`, brushes; patterns written fresh as 16-step grids.
- **Weight:** `kickBig`, `snareGated`, `timp` (V1 round 1) for stingers and phrase downbeats only, used sparingly.

### 4.4 The found-sound kit

Kept from M1 (`src/audio/music/library.ts`): metal (`pipe plate boom rail hum scrape chain`), glass and clicks
(`glass click relay dial tick`), machines (`thump piston motor press`), textures (`drone air static rainbed`). These play
the gaps in the breaks, the texture events, the answers in Alert and the crackle under everything.

### 4.5 Risers and the endless rise

- `riser`: noise through a band-pass sweeping 400 Hz to 6 kHz over 2 bars, plus a saw gliding up an octave, 2 bars at
  168.
- `shepard`: six sine-and-triangle voices an octave apart rising together by one octave over 8 bars; each voice's level
  follows a fixed bell curve over pitch, so the top fades out as a new bottom fades in and the loop never arrives.
  Rendered as one seamless 8-bar loop at 168 BPM.

### 4.6 Budget

- Library total at most **100 s of mono-equivalent audio** (about 19 MB as Float32), up from 60 s.
- Render in two batches: **Batch 1** (Infiltration, Caution, the Alert stinger and the Alert core) under **1.5 s on the
  iPhone**; **Batch 2** (everything else) in idle chunks after it, under another 2 s.
- At most **24 voices**; under **0.5 ms main-thread per frame** for scheduling (spec).

---

## 5. The figure (the main motif)

### 5.1 Rules for the candidates (V1)

1. **4-7 notes**, within a ninth, over **2 bars** of 4/4.
2. **Low and dark:** written for the bass and the muted horn first (D2-D4). It must work as a bass riff.
3. **Groove first:** a rhythm that locks with a swung downtempo beat and a breakbeat, and is recognisable on unpitched
   metal alone. At least one syncopation (a note off the beat that is held across it).
4. **One tension interval** (a tritone or a minor second) that can be resolved by changing **one or two** notes so it
   lands on D (the success form) and broken by removing the last note (the failure form).
5. **Starts and ends on chord tones of D minor** (D, F or A), so it sits over the D pedal of every phase.
6. **Memorable as a riff, not a tune:** something you would recognise from its first three notes in the bass.
7. **Original:** written from these rules. Each candidate gets an ear test (Section 12) before it is picked.

V1 round 1 (A Lights Out, B Searchlight, C Undertow: bell, brass hook, menu fanfare) was rejected by Michael. Round 2
composed three new figures in this language.

**Chosen (Michael, 2026-10-09): B "Dead Drop", D D F Eb C D**, with the **noir** take (70 BPM: rain, low strings, the
figure on upright bass, then horn, a reversed swell into stabs, resolved on the horn) as the reference for the whole
score's mood: **subtle**. Every phase is mixed and voiced to that restraint.

| Step | 0 | 2 | 3 | 5 | 10 | 12 |
| --- | --- | --- | --- | --- | --- | --- |
| Note | D | D | F | Eb | C | D |
| Length (eighths) | 1 | 1 | 2 | 3 | 2 | 4 |

Resolved: Eb becomes E. Broken: the last D never comes; C is held.

### 5.2 Where the chosen figure appears

| Form | Phase or cue | Instrument |
| --- | --- | --- |
| Fragment (first 2-3 notes) | Infiltration, every 60-120 s | `darkbell` or `upright`, far back and quiet |
| Statement and walking fragments | Caution | `upright`, answered by `horn` |
| Riff | Alert | `reese`, answered by `stab` and plate hits |
| Rhythm shadow | Evasion, once per 16 bars | Muted metal, no pitch |
| Full | Menu | `upright`, then `horn`, then `stab` over a reversed `swell` |
| Augmented | Briefing | `horn`, far back |
| Resolved | Success results, objective stinger | `horn` and `stab`, landing on D minor |
| Broken | Failure results | `upright` and `strings`, last note missing, held and bit-crushed |

---

## 6. Stingers (the sound language)

Each stinger has one job and one sound. They are distinct in register and length so the player learns them.

| Stinger | When | Sound | Length | Duck | Quantise |
| --- | --- | --- | --- | --- | --- |
| **Alert** | Any phase -> Alert | Original design, **low and wide** (not a high ping): a reversed `swell` rising over 300 ms into a hit of `kickBig` + a low `stab` cluster (D, Eb, Ab: minor second and tritone) + a metal `press` + a `boom`; sub drop D2 -> D1 over 0.4 s; then exactly one beat of silence. The loudest sound in the score: peak -10 dBFS. | 1 bar at 168 (1.43 s) | -12 dB, 0.6 s | At once (becomes bar 0) |
| **Re-alert** | Evasion -> Alert | The Alert stinger's hit only (no swell), shorter tail. | 2 beats | -9 dB | Next 16th; the riff on the next bar |
| **Body found** | A body is found (Phase 4 hook; only when the game shows it) | Dark hit: `timp` A1 + low `strings` D2-Eb2 cluster swelling over 1.5 s + low `boom`. | 2.5 s | -6 dB, 1 s | Next beat |
| **Alarm raised** | The alarm goes on | The figure's first three notes on `ring`, struck twice, over a `press`. Not a siren. | 2.5 s | -6 dB, 1 s | Next beat |
| **Objective** | Objective complete | The figure's resolved ending on `horn`, soft, with one `stab`. | 2 s | -4 dB | Next beat |
| **Checkpoint** | Checkpoint reached | One `relay` click and one quiet `darkbell` D4. | 1 s | none | Next beat |

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
| Any -> Alert | At once | Alert stinger (bar 0), one beat silent, the break on bar 1. Lower phases cut under the stinger. |
| Evasion -> Alert | Next 16th | Re-alert stinger; the riff and stabs return on the next bar downbeat. Grid continues (same tempo). |
| Infiltration -> Caution | Next beat (the 84 grid starts on the change) | Pulse fades in over 1 beat; chords from bar 2. |
| Infiltration or Caution -> Evasion (e.g. a search after a body is found) | Next beat | The 168 grid starts; ostinato and ticks from beat 1; riser over the first phrase. |

**Downwards (phrase ends, with hysteresis):**

| From -> to | Hold (target stays lower for) | Then |
| --- | --- | --- |
| Alert -> Evasion | 6 s with no sighting and no shots (the adapter's rule) | At the next 2-bar boundary: a fill, the riff and stabs drop out, snare to beat 3. |
| Evasion -> Caution | 8 s with no guard `alert` or `searching` | At the next phrase end: half-time bar, tape-stop, Caution grid (Section 3.6). |
| Caution -> Infiltration | 10 s with no guard `suspicious` or `investigating` | Decay over 2-3 Caution phrases (20-40 s), one layer per phrase (Section 3.6). |

- **Minimum dwell:** every phase plays at least one full phrase before it may fall (Alert: 8 bars after the break lands).
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
| T3 | Pulse relationships | Caution at 84 is exactly half of Alert; Evasion half-time over the 168 grid feels faster than Caution |
| T4 | Dissonant intervals | Caution D-Eb rub; Evasion D-Eb clusters and D-Ab pedal; Alert stinger cluster; resolution to a clear D minor in the success results |
| T5 | Rising illusions | Evasion `shepard` loop and phrase risers; snare rolls into Alert phrase ends |
| T6 | Stingers | Section 6 |
| T7 | Silence and drop-outs | Infiltration mostly silent; one silent beat between the Alert stinger and the break; 1-beat drops before some Alert phrase downbeats |
| T8 | Groove and syncopation | Alert and Evasion: chopped found-sound break over a straight kick pulse |
| T9 | Call and response | Caution: bass figure answered by the horn; Alert: reese riff answered by chopped stabs and plate hits |
| T10 | Variation | Seeded changes every 4-8 bars; fills at phrase ends; A/B sections in Caution and Alert |

**Variation rule:** no loop is heard twice identically within 2 minutes. Seeded changes: swap 1-3 break steps, move
ghost notes, swap a found sound in its family, pick the next chord pair, choose a fill from at least four.

---

## 9. Character, space and mix glue

- **Tape-style saturation:** a gentle `tanh` waveshaper (2x oversampled) on the music bus before the compressor, drive
  set so it adds harmonics without audible distortion on the menu theme.
- **Chorus:** on strings at render time; one runtime chorus send (two modulated delays) for pads and bells.
- **Stereo:** width only on strings, pads, bells, texture and reverb returns. Kick, snare, bass and the figure are
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
- **Era colour (lab switch, default off): "PS1 sampler".** At render time, a copy of the horn, stab, strings and bell layers
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
4. **Phone translation:** every bass and kick carries harmonics above 120 Hz (soft clip, the upright's body, the reese's saws); the
   figure's upper harmonics (horn and stab around 300 Hz-1.5 kHz) carry it on the speaker.
5. **Check both playback paths** at every listening stop: iPhone speaker and headphones. The motif must read on the
   speaker; the bass must not vanish there.
6. **Voices:** at most 24. Steal priority: stinger > bass > kick and snare > figure > strings and chords > metal >
   texture. Steal the oldest of the lowest priority.
7. **Pause:** -12 dB and an 800 Hz low-pass over 0.3 s; the sequencer keeps time.
8. **Fades** use time constants of at least 30 ms, except the cut under the Alert stinger.

---

## 11. Menu, briefing, results and map colours

### 11.1 Menu: the Night Shift theme

- 70 BPM, D minor, 16-bar loop with a 4-bar intro that plays once (drone, crackle, rain-like texture, a distant `boom`).
- Bars 1-8: the figure on `upright`, then `horn` (low strings: Dm, Bb with G, Gm with Eb, A7b9 shell), a reversed
  `swell` into bar 5 where `stab`s take it over the bass; the horn resolves it in bars 7-8.
- Bars 9-16: a slow swung beat enters under the bass figure; horn and stabs trade halves of it; ends on the resolved
  form so the loop point feels like home.
- Found-sound undercurrent: crackle, a soft kick on 1, a rim on 3, a muted sub pulse.

### 11.2 Briefing

The menu reduced: drone, sub on D, the figure augmented on `horn` once per 8 bars, far back. Nothing between 1 and
4 kHz above -24 dB (reading stays easy). 8-bar loop.

### 11.3 Results

- **Success:** the motif, then its resolved form on `horn` and `stab`, landing on a clear D minor chord (strings, `swell`
  swell, `timp`), 20-25 s, then a soft bed.
- **Failure (or more than one alarm):** the broken form on strings, its last note missing, the held note bit-crushed as
  it decays over an Eb drone; ends on the D-Ab tritone. 15-20 s, then air.

### 11.4 Map colours

A colour swaps found sounds and reverb on top of the shared phases; the motif, tempos and phase logic do not change.
Transpose up to +-2 semitones.

- **Warehouse (docks metal):** Infiltration: distant `boom` tuned to D1, `chain` rattles, a far horn-like D1 + A1 swell.
  Caution: `plate` replaces the rim. Alert: `snareMetal` layered on the gated snare; `boom` under every phrase downbeat;
  the riff's answer on `pipe`. Evasion: ticking on `chain` micro-hits.
- **Kestrel Exchange:** Infiltration: the call-board `tick` (seeded, never steady), far `relay` clicks, wiring `hum`,
  `static`, the motif fragment on `motifbell`. Caution: relays for hats. Alert: the riff's answer on `ring` and `dial`
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

## 13. Soundfont (Michael, 2026-10-09: allowed)

**Michael allowed a CC0 instrument sample set** for the orchestral and band layer (double bass, muted horn, strings, timpani; bells and
mallets if they sound better than synthesis). This is a written exception to the CLAUDE.md "no external audio" rule and
bible S7, for this music only; CLAUDE.md and the bible are updated when Michael merges (this branch does not edit the
bible).

Rules for the samples:

- **Licence:** CC0 or public domain only, recorded in `docs/audio/music-sources.md` (name, source URL, licence, date,
  what was taken). No "free for non-commercial" sets, no attribution-required sets unless Michael approves each.
- **Bundled, never fetched:** samples ship in the build (Vite asset import); no runtime network.
- **Small:** at most **4 MB** of compressed audio in total (Opus or AAC in an MP4 container, decoded at load), a few
  roots per instrument, pitched with `playbackRate` within +-7 semitones.
- **Neutral sources only:** single-note orchestral, double-bass or horn multisamples, never a sample taken from a game,
  soundtrack or record.
- **Processed into our sound:** the same saturation, filters, chorus, reverbs and "PS1 sampler" path as the synthesised
  voices (Section 9), so samples and found sounds sit in one world.
- **Fallback:** the synthesised voice of Section 4 stays as the fallback and the A/B in the lab, so Michael can compare
  sample and synthesis per instrument.
- **Phone budget unchanged:** decode time counts toward Batch 1's 1.5 s; 24 voices; 0.5 ms per frame.
- Found-sound percussion, bass, risers and textures stay generated in code.

---

## 14. Notes for the engine (V2)

- Rename the conductor states: calm -> `infiltration`, combat -> `alert`; add `caution` and `evasion`.
- The phase machine is pure (no Web Audio) and unit-tested: targets, holds, dwell, phrase-end scheduling, stinger rate
  limit, interrupted falls.
- New stems: `STR` (strings), `HORN` (horn and stabs), `DRUM` (big synth drums), alongside M1's nine; the lab mutes each.
- Sidechain dips are scheduled automation, not per-frame code.
- Lab: "Phase ladder demo" (scripted 2-minute run), A/B toggle per phase, "PS1 sampler" switch, WAV export per phase.
- No per-frame allocation in the adapter; it writes numbers and flags only.
