# Night Shift music - research summary

Written 2026-10-15 for the music V4 brief (one main theme, a menu theme and one adaptive mission score).

**Sources:** a short web search, plus my own knowledge of game scoring and music theory. The web was useful for:
- how Chaos Theory's score was built for the game
- how middleware handles transitions
- frequency-based ducking (Baldur's Gate 3, Apex Legends)

The web found nothing reliable on Metal Gear Solid's music mechanics or on music hysteresis. Those parts are from my
own knowledge and from playing the games, so treat them as informed opinion rather than documented fact. Links are at
the end.

---

## 1. What makes a theme memorable

- **Shape before notes.** People remember the up-and-down outline of a tune more than its exact pitches. A strong theme
  has one clear gesture, such as a rise to a high note followed by a fall back home.
- **Small range.** Stay within about an octave so anyone can hum it. One wider leap is fine if it is the hook moment.
- **Rhythm is identity.** A theme stays recognisable when its rhythm is kept and the pitches change. So give it one
  distinctive rhythmic cell and repeat that cell.
- **Repeat, then vary.** Use a call (2 bars), then a response (2 bars) that copies the rhythm but changes the ending,
  then a climb to a peak and a cadence home. Exact repetition gets boring, and constant novelty is never remembered.
- **One surprising note.** A single unexpected interval, used once per phrase, is what makes a tune stick. Here that is
  the tritone (the note a diminished fifth above the key note).
- **Rests matter.** The silence after a phrase lets the ear replay it.
- **Transform by mood, keep the cell.**
  - Calm: slower and quieter, a few notes only, in a low instrument.
  - Tense: the same cell broken into fragments over an ostinato.
  - Danger: full tempo and full orchestra, with the hook rhythm in the drums too.
  - Change the instrument, the register, the harmony underneath and the tempo, but keep the rhythm cell.
- **A good tune is not always a good leitmotif.** It must survive being cut into 2-note and 3-note pieces and still
  be recognised. So test the first bar on its own as well as the whole theme.

## 2. What makes music feel epic

- **Weight comes from the bottom.**
  - Low brass (trombones, tuba) in octaves.
  - Low strings doubling the bass.
  - Big low drums with a long room tail (taiko, timpani, boom hits).
- **Bright trumpets read as heroic fanfare.** Low brass reads as power and danger. For a night-time spy, keep the brass
  low and dark.
- **Octave doubling** (horns plus cellos, violins an octave above) turns a melody into a statement.
- **Minor key with borrowed colour:**
  - the flat sixth and flat seventh chords (in D minor: B-flat and C) give a sad, heroic lift
  - the leading tone on the dominant (A major with C-sharp) gives a strong pull home
  - the tritone gives danger
- **Build, then pay off.** Hold back, then give the payoff:
  - before it: a riser, a snare roll, a reversed cymbal, a beat of silence
  - then the full theme lands on the downbeat with everything
- **Contrast creates size.** A big moment only feels big next to a smaller one. Strip the texture down before the
  theme returns.
- **A key lift** (the theme repeated a minor third higher) is a classic way to raise the stakes in a final statement.

## 3. Keeping sneaking music quiet and tense

- **Hearing the world is the gameplay.** In stealth games the calm music sits far below footsteps and guard voices.
- **Footsteps and voices live in the mids** (about 300 Hz to 4 kHz). Calm music uses the parts of the spectrum around
  them:
  - **Low:** sub pulse, double bass and low strings, below about 250 Hz.
  - **High:** cold air and faint harmonics above about 5 kHz, very quiet.
  - **Mids:** almost empty.
- **Low and soft.** Calm should be roughly 15-20 dB quieter than the alert music. Players turn music down when calm is
  busy.
- **Tension without activity:**
  - A slow heartbeat pulse.
  - A held low note (pedal) that never resolves.
  - A chord that never lands.
  - The occasional distant hit with a long reverb.
- **Silence is part of the score.** Leave whole bars empty. The player's own sounds fill them.
- **Duck by frequency, not only by volume.** Modern games cut the band that a voice or a key sound occupies instead of
  pulling the whole music down, which avoids "pumping". Voices get a quick, gentle dip of a few dB. Footsteps get
  space through EQ, not ducking. Ducking on every footstep would sound like a special effect.

## 4. How Chaos Theory and Metal Gear Solid did it

- **Chaos Theory (Amon Tobin):**
  - Each in-game track was written as several parts of rising intensity. Commentators describe them roughly as a
    bass, a drum, a pad and a lead track.
  - The game added and removed those parts based on what the player was doing. Being spotted or setting off an alarm
    raised the intensity at once.
  - The album versions were arranged afterwards from those parts.
  - The sound: swung, chopped breakbeats, jazz double bass, low cinematic strings and brass stabs, granular and
    glitchy textures, industrial grit.
  - Lesson: **vertical layers on one shared timeline**, with the ambient layer near silent.
- **Metal Gear Solid (PS1)** (from memory of the game):
  - Clear named phases: Sneaking (quiet ambient), Alert (fast, loud, melodic), Evasion (alert intensity with the
    melody removed, while guards search) and Caution (tense, quieter), then back to Sneaking.
  - The "!" alert sound plays the instant a guard spots you, and the alert music cuts in right after it.
  - Coming down is slow and passes through each phase. Going up is instant.
  - Lesson: **the player always knows the state from the music**, and the stinger is the fastest information in the
    game.

## 5. Vertical layering and horizontal resequencing

- **Vertical layering:** several stems of the same length and tempo play in sync, and their volumes move.
  - Best for small, continuous changes: calm to cautious, cooling down.
  - It is seamless, because nothing restarts.
  - Every stem must work alone and with the others.
- **Horizontal resequencing:** the music jumps to a different section or loop at a musical boundary.
  - Best for big changes in tempo or character: calm to alert, the alert theme landing at the top of its phrase.
  - It needs planned entry points and something to hide the join, such as a stinger or a drum fill.
- **This score uses both:**
  - **Calm and Cautious** share one loop and tempo. Cautious is calm plus extra layers (vertical).
  - **Alert** is its own faster loop that starts from its top every time you are spotted, so the hook hits on the
    downbeat (horizontal).
  - **Evasion** (cool-down) is the alert loop with its melody and brass layers removed (vertical inside alert).

## 6. Transitions

- **Quantise to the grid.**
  - Fades start on the next beat or bar line, never mid-beat.
  - Small changes start on the next beat.
  - Exits start on the next bar.
- **The stinger is the exception.** It plays the instant the player is spotted, because it is information. The new
  music then lands on a downbeat a fixed time after it (two beats of the alert tempo), so the stinger also works as
  the pickup into the alert music.
- **Crossfade lengths:**
  - up into Cautious: about 1 bar
  - down out of Cautious: about 4 bars
  - Alert to Evasion: 1-2 bars
  - Evasion to Cautious: about 2 bars
- **Hysteresis**, so a guard's glance does not flip the music:
  - **Going up is fast:** Alert is instant. Cautious waits about half a second so a one-frame flicker is ignored.
  - **Going down is slow:** each state has a minimum hold, and the game must stay below that state for a few
    seconds before the music steps down.
  - **The music only ever steps down one rung at a time:** Alert, then Evasion, then Cautious, then Calm. It never
    drops straight to Calm.
  - **A repeated stinger is shorter and quieter** when it fires again within about 15 seconds, so a chaotic fight
    does not spam the big hit.

## 7. How music builds tension and alertness

- **Pedal notes:** a held bass note under changing chords never lets the ear relax.
- **Ostinato:** a short figure repeated without change acts like a ticking clock.
- **Density over speed:** going from quarter notes to eighths to sixteenths raises urgency even at the same tempo. Then
  raise the tempo for the true alert.
- **Dissonance:** the tritone, the flat second (in D, an E-flat rubbing against the D) and tight clusters of notes a
  semitone apart.
- **Risers:** rising noise, rising pitch and accelerating rolls, which point at a moment that is about to arrive.
- **Contrast:** a beat of silence before the payoff makes it hit twice as hard.

## 8. Avoiding listener fatigue over a 20-minute mission

- **Loops of 60-90 seconds**, built from 8-bar phrases that vary, never a 4-bar loop.
- **Fixed variety inside the loop**, so each pass of the loop sounds the same and none of it is random:
  - fills on every 4th bar
  - a beat-repeat or a dropped bar in every 8
  - the theme only in some phrases
- **Let the theme rest.** In Calm the theme appears 2-3 times per loop as a few low notes. In Cautious it appears in
  fragments with gaps between them. Only Alert and the menu state it in full.
- **Silence in Calm** is also fatigue control. Near-silence is never tiring.
- **Quieter is safer.** Fatigue comes mostly from level and from the mids.

## 9. Honest music

- **Music is read as information.** If Cautious music plays when no guard is suspicious, players stop trusting it.
- **Rules:**
  - The score only rises when the game state really rises.
  - It never follows how many guards there are, how far away they are or which way they are.
  - The stinger only fires on a real detection.
  - Coming down is slow, but it does come down. The hold times are short enough that the music never claims danger
    for long after the game has moved on.
  - The test page shows both the game state and the music state side by side, so any mismatch is visible.

---

## The rules this score follows

1. One main theme of 8 bars with one rhythmic cell and one tritone moment, which passes the "hum it with no backing"
   test. One bass hook that is catchy on its own.
2. The menu states the theme in full with low brass, horns, strings in octaves and big low drums, and lifts the key for
   the final statement.
3. Calm:
   - very quiet, under about -30 dBFS on average
   - low pulse and low strings below 250 Hz, cold air above 5 kHz, near-empty mids
   - whole silent bars
   - the theme only as 2-3 low fragments per loop
4. Cautious: calm plus a half-time chopped break, the bass hook, a string ostinato and theme fragments in a low
   register.
5. Alert:
   - a faster loop at 1.5 times the tempo, which starts from the top after the stinger
   - driving break, low brass, string ostinato, the hook front and centre, and the theme at full power
6. Evasion (cool-down) is the alert loop without its lead and brass. The ladder down is Alert, Evasion, Cautious,
   Calm, with minimum holds.
7. Fades start on the next beat or bar line. The stinger is instant and leads into the alert downbeat.
8. The music bus has a gentle cut around 2 kHz in Calm and Cautious. It dips under guard voices and noise cues. It
   does not duck for footsteps.
9. Each loop runs 80-95 seconds with written variation and no randomness at play time.
10. The music state follows the real game state only.

## Links
- [GameSpot: Q&A with Chaos Theory composer Amon Tobin](https://gamespot.com/articles/qanda-chaos-theory-composer-amon-tobin/1100-6117182/)
- [CDM: Splinter Cell, permutative music and games](https://cdm.link/music-that-changes-splinter-cell-permutative-music-and-games/)
- [Skynoise: Amon Tobin interview](https://skynoise.net/?p=16)
- [Wikipedia: Amon Tobin](https://wikipedia.com/wiki/Amon_Tobin)
- [Audiokinetic: how to use interactive music to score gameplay](https://www.audiokinetic.com/en/blog/how-to-use-interactive-music-to-score-gameplay/)
- [Audiokinetic: Baldur's Gate 3, frequency-based side-chaining](https://www.audiokinetic.com/learn/videos/CZ2tGrpi0Ww)
- [EA: Apex Legends audio update (multiband sidechain)](https://www.ea.com/th/games/apex-legends/apex-legends/news/showdown-audio-update)
- [Game Developer: leitmotifs in Undertale](https://www.gamedeveloper.com/audio/an-examination-of-leitmotifs-and-their-use-to-shape-narrative-in-undertale-part-1-of-2)
- [Metal Gear Wiki: the exclamation point](https://metalgear.fandom.com/wiki/Exclamation_point)
