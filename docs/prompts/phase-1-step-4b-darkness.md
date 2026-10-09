# Phase 1 Step 4b - Darkness that is dark

An amendment to `docs/prompts/phase-1-light-parity.md`. It runs after Step 4 and before Step 5.

- Written by Opus on 2026-10-09 from Michael's playtest feedback.
- Implemented by Sonnet.
- Ends with a STOP for Michael's look check on the iPhone and desktop.

Paste:

> Read CLAUDE.md, docs/progress.md and docs/prompts/phase-1-step-4b-darkness.md, and follow it.

---

## Why

**Michael (2026-10-09):**

- Shadows are not dark enough.
- There is no need to use night vision.
- It is not believable that a guard cannot see you standing in the dark.

**The cause is rendering, not perception.**

**Gameplay already makes the dark band almost invisible** (`ai/perception.ts`, `world/lights.ts`):

- At level 0.12 (Warehouse interiors), `lightFactor` is 0.0625.
- A still, standing player 0 m in front of a guard fills at 2.2 x 0.0625 x 0.55 = 0.076 /s. That is under `leak` 0.2, so the meter never builds.
- Only a moving body within `closeRange` 1.8 m is noticed.
- This is Chaos Theory's rule and it stays.

**The screen does not show that darkness:**

- The interior ambient 0.12 renders at 0.12 x `LEVEL_TO_RENDER` (1.33) = 0.16 linear fill.
- On a mid-grey surface that is about 0.08 linear, roughly 30% display brightness after the sRGB curve.
- The phone grade then lifts black to `PHONE_DARK_FLOOR` 0.045.
- Desktop's sky-bake fill, exposure 1.08 and the neutral tone mapping give a similar dim grey.

**So the player sees themselves clearly where gameplay says they are invisible.** That breaks P1 and L3 ("what you see is what counts"). It came from bible L7 ("dark areas are never pure black ... readable without night vision"). Michael has replaced that rule (bible 1.10, L7).

---

## Rules

- **Rendering only.** No change to `LIGHT`, `lampMath`'s gameplay gain, `LightField`, perception, the bake or any map.
- Gameplay must not read any value this step adds.
- Phone and desktop get the same brightness targets (bible L5). Desktop may add detail, never brightness in the dark band.
- **Branch:** `ct-movement`. The usual commit, push and report rules (bible Appendix B).

**STOP and report if:**

- the targets cannot be met without changing gameplay values
- the Phone check run with night vision drops below 60 fps held

---

## Changes

### 1. Display brightness targets (bible L5)

Brightness bands follow the gameplay bands.

**Measured on:** a matte 50% grey probe facing the strongest light, at default brightness, after tone mapping and grade, as display luminance 0-100%.

| Gameplay level | Band | Display luminance target |
| --- | --- | --- |
| 0.12 (a typical dark interior) | dark | 4% or less |
| 0.27 (the top of dark) | dark | 9% or less |
| 0.40 | mid | 12-35% |
| 0.70 | lit | 45% or more |

**Put the targets in one pure table** (`world/lampMath.ts` or a new `world/darkCurve.ts`) with unit tests.

### 2. The darkness curve, in the lighting and not in the post

- Add one pure function, the curve: summed static illumination -> render illumination.
  - Steep below `LIGHT.shadow`, so the dark band falls toward black.
  - Near-identity above `LIGHT.lit`, so lamp pools keep their look.
  - Mirror it in GLSL from the same constants (the `LAMP_MATH_GLSL` pattern).
- **Apply it per pixel** to the total of fill (ambient grid on phone, sky-bake fill on desktop) + baked lamps + baked moon, scaling the colour by the ratio.
  - Paths: the phone `StandardMaterial` plugin, and the desktop exact path and volume mix.
  - Flashlights are added after the curve: a torch beam is a bright, readable event.
- **Why not in the post:** it must happen before tone mapping and 8-bit output. A post curve would crush the dark into banded black, and night vision could not recover detail from it.

### 3. Floors and haze

- `PHONE_DARK_FLOOR` drops from 0.045 to 0.008. That is just enough to stop OLED black smear on the iPhone, not enough to see by.
- Desktop stays 0.
- Fog, volumetric haze, bloom, ambient occlusion and the grade must not lift the dark band over its targets. Check the interior fog colour and density on the Warehouse at Epic.
- Light shafts stay visible only where a lamp or the moon really reaches.

### 4. Night vision rebuilt

- **Night vision becomes a gain inside the lighting:** a `visionGain` uniform (about 8, tuned to the targets below) multiplies the static illumination before the curve, then the existing green grade, grain and tube run in `CinematicPost`.
  - It reveals real detail in the dark instead of amplifying 8-bit noise.
- **Lit areas blow out under night vision** (bloom, clipped highlights), as in Chaos Theory. Players turn it on in the dark and off in the light.
- **Targets with night vision on:**
  - level 0.12: 25-45% display, readable
  - level 0.70: clipped
- Night vision changes nothing in gameplay (existing rule).
- Fade in and out stays `VISION.nightFade`.
- **Phone cost:** add "light look + night vision" to the Phone check (`phoneCheckRuns`), including in the hold.
- Sonar is untouched; it is removed in Phase 3.

### 5. Goggle glow: the player's own marker in the dark

- The local player's operator gets two or three small emissive goggle lenses, green for now (per-operator colours come in Phase 5).
- **Visual only:**
  - not a light, not in the light field
  - lights no surface
  - guards never react to it
- **Visibility:** visible to the player in darkness, so they always know where their operator is, as in Chaos Theory. Remote players' goggles are visible to team-mates too.
- Hidden in first-person views (none exist yet).

### 6. Brightness calibration (desktop and phone)

- Settings > Display > Brightness: a Chaos Theory-style calibration image, a symbol on black that should be "barely visible". It adjusts an exposure offset in the grade.
- **Render only:**
  - stored per device
  - clamped to a small range (it cannot lift the dark band out of dark)
  - locked in the Confrontation (bible 5.15)
- Shown once on first launch after this update, skippable.

---

## Tests

1. **Unit:** the curve's monotony, its targets and identity above lit; `visionGain`; the floor.
2. **Probe check** - a new e2e section in `e2e-phonelamps` and `e2e-desktop`, or a small new suite:
   - Place the 50% grey matte probe at points whose field level is about 0.12, 0.27, 0.40 and 0.70 on the Warehouse.
   - Render the phone look and Epic, read the probe's pixels, convert to display luminance.
   - Assert the targets. Repeat with night vision on.
3. **Step 5's visual parity** uses these display targets as its bands. Update the spec's Step 5 check 2 to say so.
4. **Gameplay unchanged:** `e2e-stealth-ai`, `e2e-stealth`, `e2e-tactics` and `e2e-missions` pass untouched.
5. **Performance:**
   - `perf.mjs --phone --budget` and `--desktop --budget` pass.
   - Phone check runs listed for Michael.

---

## For Michael (STOP)

**Contact sheets in the report:** the same six Warehouse views before and after, on the phone look and Epic, each with night vision off and on.

**Then Michael checks on the iPhone (`/ct/`) and desktop:**

- [ ] Indoors at night, standing in shadow, you can hardly see your operator: just the goggle glow.
- [ ] Night vision is now needed to read a dark room. It flares when you look at a lamp.
- [ ] Lamp pools and moonlit ground still read clearly.
- [ ] Brightness calibration: set it once and it feels right.
- [ ] Phone check including the night vision run. Send the note.

Continue to Step 5 only when Michael approves the look.
