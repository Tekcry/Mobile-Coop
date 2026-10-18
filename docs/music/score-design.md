# Night Shift score - design (V4)

Written 2026-10-15. Rules come from `docs/music/research.md`.

**Status:** audition sketches only. Nothing is wired into the game yet.

**This direction replaces the earlier ones.** Michael's V4 brief overrides the earlier music directions where they
disagree. Those directions are kept in `docs/audio/` for history.
- **Theme first.** Direction v3 said "no hummable lead". V4 is built around one theme.
- **Synthesised in code, no samples for now.** The V3 sketches used CC0 recordings. The V3 lab stays as it is, and
  V4 does not use those recordings.
- **Epic in the big moments.** Earlier feedback rejected bright heroic brass and fanfares, so the epic comes from low
  brass, low strings and big low drums, never bright trumpets. Calm stays subtle and dark, as before.

---

## 1. Two sketches to choose from

Each sketch has its own theme, menu theme and mission score, so Michael can pick a direction rather than a detail.

| | **A - Long Shadow** | **B - Cold Wire** |
| --- | --- | --- |
| Feel | Cinematic, heroic, driven. The elite operative. | Noir, coiled, industrial. The spy in the dark. |
| Key | D minor | C minor, Phrygian colour (the flat second, D-flat) |
| Theme rhythm | "DAAH - DAAH - dah" (3 + 3 + 2 eighths) | "da-DUM DAH da-da DAH" (a dotted snap) |
| Tritone moment | A falls to A-flat in bar 2 | F climbs to G-flat in bar 3 |
| Menu tempo | 80 BPM | 74 BPM |
| Mission Calm and Cautious | 92 BPM | 84 BPM |
| Mission Alert and Evasion | 138 BPM (1.5 times) | 126 BPM (1.5 times) |
| Drums | Straighter break, taiko ensemble in the big moments | Swung, brushed break; metal percussion in Alert |
| Bass | Upright pizzicato plus a dark distorted bass in Alert | Upright pizzicato forward, a reese bass in Alert |
| Brass | Low brass and horns carry the theme | Low brass as stabs and swelling clusters; horns carry the theme |

Calm and Cautious share a tempo, so Cautious can be pure extra layers on the same loop. Alert runs at exactly 1.5
times that tempo, so two Alert bars take the same time as three Calm bars, and the move feels like a gear change
rather than a different song.

## 2. The themes

Notes are written as name and octave (middle C is C4). Lengths are in beats, where 1 = a quarter note. Every bar is
4 beats. A rest is "-".

### Theme A - Long Shadow (D minor)

| Bar | Notes (length) | Chord |
| --- | --- | --- |
| 1 | D4 (1.5) F4 (1.5) A4 (1) | Dm |
| 2 | A-flat4 (1.5) G4 (0.5) F4 (1) E4 (1) | Dm7 flat 5 (over D) |
| 3 | D4 (1.5) F4 (1.5) B-flat4 (1) | B-flat / D |
| 4 | A4 (3) - (1) | A |
| 5 | D5 (1.5) C5 (1.5) B-flat4 (1) | B-flat |
| 6 | A4 (1.5) G4 (0.5) F4 (1) E4 (1) | C |
| 7 | F4 (1.5) E4 (1.5) C-sharp4 (1) | A7 |
| 8 | D4 (3) - (1) | Dm |

- **Shape:**
  - Bars 1-2 (call): a rising minor chord in the 3 + 3 + 2 rhythm, then a chromatic slide down through the tritone
    (A to A-flat) that leaves you hanging.
  - Bars 3-4 (response): the same rhythm reaches one step higher (B-flat, the "ache") and holds the A.
  - Bars 5-6 (climax): the cell turns upside down from the top D, then the slide returns without the tritone.
  - Bars 7-8 (cadence): the leading tone C-sharp pulls home.
- **Range:** D4 to D5, one octave, easy to hum.
- **The cell to recognise:** "DAAH - DAAH - dah" plus the slide "A-flat, G, F, E".

### Hook A - the walk-up (bass, 2 bars of eighths)

```
bar 1:  D2  -   D3  D2  -   C3  -   A2
bar 2:  D2  -   D3  D2  F2  G2  A-flat2  A2
```

"DUM . dum DUM . da . da | DUM . dum DUM da da da da"
- The chromatic walk-up in bar 2 passes through the tritone (A-flat) and drops back onto the D.
- Its first two notes (low D, high D) are also the calm heartbeat.

### Theme B - Cold Wire (C minor)

| Bar | Notes (length) | Chord |
| --- | --- | --- |
| 1 | C4 (0.75) C4 (0.25) E-flat4 (1) D-flat4 (0.5) C4 (0.5) G3 (1) | Cm |
| 2 | A-flat3 (1.5) B-flat3 (0.5) C4 (2) | A-flat |
| 3 | C4 (0.75) C4 (0.25) E-flat4 (1) F4 (0.5) G-flat4 (0.5) F4 (1) | Cm7 flat 5 |
| 4 | E-flat4 (1.5) D-flat4 (0.5) C4 (2) | D-flat / C |
| 5 | G4 (1.5) A-flat4 (0.5) G4 (1) E-flat4 (1) | A-flat major 7 |
| 6 | F4 (1.5) G-flat4 (0.5) F4 (1) D-flat4 (1) | D-flat |
| 7 | E-flat4 (0.75) E-flat4 (0.25) D-flat4 (1) C4 (0.5) B-flat3 (0.5) B3 (1) | G7 altered |
| 8 | C4 (3) - (1) | Cm |

- **Shape:**
  - Bars 1-2: a snapped pickup ("da-DUM"), a flat-second turn, then a drop to low G that climbs home.
  - Bars 3-4: the same snap climbs to the tritone (G-flat) and falls back.
  - Bars 5-6: a higher sigh around G, then the same sigh a step lower with the tritone again.
  - Bars 7-8: a crawling chromatic turn (B-flat, B natural) into C.
- **Range:** G3 to A-flat4, a minor ninth. Lower and more coiled than A.

### Hook B - the snare line (bass, 2 bars of swung eighths)

```
bar 1:  C2  C2  E-flat2  -   C2  D-flat2  -   C2
bar 2:  C2  C2  E-flat2  -   G-flat2  F2  E-flat2  D-flat2
```

"DUM-da DAH . DUM da . DUM | DUM-da DAH . da da da da"
- A tight circle round C with the flat second.
- The second bar slides down from the tritone back to the flat second, which wants to fall onto C again.

Both themes and hooks were written for this project. The "theme alone" buttons on the test page exist so Michael can
check that they hum well and remind him of nothing he knows.

## 3. Instruments (all made in code)

Everything is synthesised in the browser, with no samples. Each part is rendered once into an audio buffer with an
`OfflineAudioContext` when a sketch is opened, then looped and mixed at play time.

| Instrument | How it is built | How it sounds |
| --- | --- | --- |
| Upright bass (pizzicato) | Plucked-string model (a filtered noise pluck in a tuned delay loop), body resonance, soft finger thump | Round, woody jazz double bass; soft attack |
| Heartbeat | Low sine with a fast pitch drop plus the upright an octave up, very soft | A "lub-dub" felt more than heard |
| Dark bass (Alert) | Two detuned saws and a sub sine, driven, low-passed | A growling low line under the hook |
| Low strings | Five slightly detuned saws per note with slow, independent vibrato, bow noise and a dark filter; sustained, tremolo or short (spiccato) | Cellos and basses; cold and wide |
| High strings | The same build, brighter, used only in Alert and the menu (octave doubling) | Violins over the theme |
| Harmonics | Very quiet sine partials above 4 kHz with long reverb | Glassy, distant, cold |
| Low brass | Four detuned saws plus a sub square, a filter that opens on the attack (the "blat") and settles, a small pitch scoop, breath noise | Trombones and tuba; dark and heavy, never bright |
| Horns | Rounder brass with a slower attack and gentle vibrato | French horns carrying the theme |
| Muted far horn | The horn, low-passed hard and drowned in reverb | The theme heard from far away (Calm) |
| Melody tone | A soft, pure tone with a little reverb | For the theme-alone test only |
| Break kit | Synthesised kick, snare, ghost snare, closed and open hat, rim, shaker, brush, rendered once as hits; slightly crushed and driven | Chopped, swung, dusty breakbeat |
| Taiko | Low drum body with a long decay, skin slap, three players a few milliseconds apart, big room | Big low drums |
| Metal | Clangs built from non-harmonic partials (struck pipe, plate) | Industrial hits; far away in Calm |
| Textures | Filtered noise (cold air, low city rumble), vinyl crackle, granular glitch stutters | Night, cold, broken signal |
| Risers and impacts | Rising filtered noise with rising tones, reversed cymbal, sub boom | Builds into each payoff |

All parts share generated reverbs: a small room for drums, a hall for brass and strings, and a long dark space for far
sounds.

## 4. How the theme is used in each state

### Menu theme (one 32-bar loop, about 96 s for A and 104 s for B)
| Bars | What happens |
| --- | --- |
| 1-4 | Cold air, low drone, heartbeat, a far metal hit; a reversed swell into bar 5 |
| 5-12 | The theme on a solo horn over pizzicato bass and a soft brushed beat; low strings hold the chords |
| 13-20 | Full statement: horns plus trombones an octave below plus violins an octave above, taiko in the theme's rhythm, the full break |
| 21-24 | Bridge: the hook on the bass, answered by brass stabs; riser |
| 25-32 | Final statement a minor third higher (the key lift), widest orchestration, a held final chord that dies away into the quiet intro |

### Mission - Calm (quiet and tense)
- **Layers:** heartbeat pulse, low strings pad, cold texture, sparse muted percussion, theme fragments.
- **Harmony:** the theme's chords at a quarter of the speed (4 bars each) over a low pedal. Nothing resolves.
- **Heartbeat:** "lub-dub" on beats 1 and 3, with one silent bar in every 8.
- **Percussion:** a muted tick or soft low tom now and then, with silent bars.
- **Theme:** only 3 times per 32 bars:
  - bars 9-10: the first bar's notes on the low pizzicato bass
  - bars 19-20: the tritone slide on a muted horn, far away and very low
  - bars 27-28: the bar-3 cell on the bass
- **Nothing in the mids.**
  - Pitched parts sit below about 250 Hz. The air sits above about 5 kHz, very quietly.
  - The bus has a gentle cut around 2 kHz.
  - Target average level about -32 dBFS, 15-20 dB under Alert.

### Mission - Cautious (Calm plus four layers, same loop)
- **Break:** a half-time chopped break (kick on 1, snare on 3), swung ghost notes. A fill closes every fourth bar, and
  bar 6 of every 8 repeats a beat.
- **Hook:** the bass hook. Half of it in the first and third 8 bars, all of it with the walk-up in the second and
  fourth.
- **Tension strings:** low strings pulse in eighths on the chord root. A tremolo cluster swells, and a riser leads
  into every 8th bar.
- **Lead fragments:** the theme in pieces, an octave lower than written, on a muted horn. The first two bars, the
  response cell, the first bar only with an echo, and the slide left unresolved. There are gaps between them.
- **Calm layers:** they keep playing, a little lower.
- **Target level:** about -24 dBFS average.

### Mission - Alert (its own 48-bar loop, about 83 s for A and 91 s for B)
| Bars | What happens |
| --- | --- |
| 1-8 | Drive: full break, the hook on bass, the string ostinato in sixteenths, brass stabs on the hook's accents |
| 9-16 | The theme on horns over moving chords; taiko in the theme's rhythm; impact on bar 9 |
| 17-24 | Hook front and centre, brass answering it every second bar (call and response) |
| 25-32 | The theme at full power: horns, trombones and violins in octaves, taiko, impact |
| 33-40 | Breakdown: drums thin out, tritone alarm, swelling brass cluster, riser and snare roll |
| 41-48 | The theme again, harmonised, then back to the top |

Target level about -17 dBFS average. It is the loudest state, but there is still a gentle dip at 2-4 kHz so
gunshots and shouts cut through.

### Evasion (cool-down)
- The Alert loop keeps running with the horns, the brass theme and the lead removed.
- Drums, bass, the string ostinato and the effects stay, a little lower.
- The danger is still there, but the triumph is gone.

## 5. Layers in and out

| Layer | Calm | Cautious | Alert | Evasion |
| --- | --- | --- | --- | --- |
| Heartbeat pulse | 100 % | 80 % | - | - |
| Low strings pad | 100 % | 80 % | - | - |
| Cold texture | 100 % | 70 % | - | - |
| Sparse percussion | 100 % | 50 % | - | - |
| Theme fragments (Calm) | 100 % | 60 % | - | - |
| Break (half-time) | - | 100 % | - | - |
| Hook bass | - | 100 % | - | - |
| Tension strings | - | 100 % | - | - |
| Lead fragments | - | 100 % | - | - |
| Alert drums | - | - | 100 % | 80 % |
| Alert hook bass | - | - | 100 % | 90 % |
| Alert strings | - | - | 100 % | 80 % |
| Alert brass | - | - | 100 % | 0 % |
| Alert lead (theme) | - | - | 100 % | 0 % |
| Alert effects | - | - | 100 % | 70 % |

The test page has a slider for each layer, which multiplies these values.

## 6. Transitions

- **Calm to Cautious:**
  - The game must stay in caution for 0.6 s, so a one-frame flicker is ignored.
  - The four Cautious layers then fade in over 1 bar, starting on the next beat.
- **Cautious to Calm:**
  - Cautious must have played for at least 8 s, and the game must have been calm for 5 s.
  - The layers then fade out over 4 bars, starting on the next bar line.
- **Spotted (Calm or Cautious to Alert):**
  - The stinger plays at once.
  - The Calm and Cautious loop dips out under it in 0.3 s.
  - The Alert loop starts from its first bar exactly two Alert beats after the stinger, so the stinger works as the
    pickup and the hook lands on the downbeat.
- **Alert to Evasion:**
  - Alert must have played for at least 10 s, and the game must have been below alert for 3 s.
  - The brass and lead then fade out over 2 bars, starting on the next bar line.
- **Spotted again during Evasion:**
  - A short stinger plays.
  - The brass and lead come back on the next bar. The loop does not restart.
- **Evasion to Cautious:**
  - Evasion must have played for at least 12 s.
  - The Alert loop then fades out over 2 Alert bars.
  - The Calm and Cautious loop (which kept running silently, so it is still in time with itself) fades back in over
    2 of its bars.
- **The music steps down one rung at a time:** Alert, Evasion, Cautious, Calm. It never jumps straight to Calm.
- **Full cool-down:** from the moment the game stops being alert, the music is back in Calm after about 25-30 s:
  - about 3 s until Evasion
  - 12 s of Evasion
  - at least 8 s of Cautious
  - a 4-bar fade

## 7. The stinger

- **The hit:**
  - a taiko ensemble hit
  - low brass hitting a cluster on the key note, its fifth, the flat second and the tritone
  - a high string scrape on the same cluster
  - a struck-metal clang
  - a sub drop
- **The run-in:** about two beats of a rising snare roll and a reversed cymbal into the Alert downbeat.
- **Length:** about 3 s with its tail.
- **Repeat stinger:** within 15 s of the last one, a shorter and quieter version plays instead (the hit only, about
  6 dB down). This stops a chaotic fight from spamming the big hit.

## 8. Mixing with gameplay sound

- **Calm:**
  - Pitched parts stay below about 250 Hz.
  - Texture sits above 5 kHz at a very low level.
  - Whole bars are silent.
- **Music bus:**
  - a gentle cut around 2 kHz (on in Calm and Cautious, lighter in Alert)
  - a soft limiter at about -6 dBFS
- **Ducking:**
  - **Guard voice:** the music dips about 6 dB in 40 ms and recovers over half a second after the line.
  - **Noise cue** (a thrown bottle, a dropped can): a dip of about 4 dB.
  - **Footsteps:** no ducking. They get their space from the EQ. There is a switch to try ducking on footsteps too.
- The test page has fake footsteps (walk and run), a distant guard voice (a code-made murmur) and a noise cue, so the
  mix can be judged by ear.

## 9. Memory and CPU (measured on the PC)

- **Rendering:**
  - A sketch is rendered into buffers when it opens. Bass-only layers are mono and use lower sample rates.
  - Times: a mission sketch takes about 9-17 s, a menu sketch 11-13 s, and the theme alone under 1 s.
  - A mission sketch holds about 150-250 MB of decoded audio.
- **At play time:** looping buffers and gain changes only, so almost no CPU.
- **For the game:**
  - The same renders would be done once at mission load (or cached to IndexedDB), probably at a lower sample rate for
    phones. That is a decision for the integration step.
  - Short, repeated notes (drums, plucked bass, short strings) are computed once as samples, and the render drops
    finished notes as it goes. Without that, a layer took up to 11 s.
- **Mixed levels** (music bus, before the music volume):

  | State | Average |
  | --- | --- |
  | Calm | -34 dBFS |
  | Cautious | -27 dBFS |
  | Alert | -16 dBFS |
  | Evasion | -20 dBFS |

  Calm's 0.9-4 kHz band (where footsteps and voices sit) is 18 dB under its full level.
