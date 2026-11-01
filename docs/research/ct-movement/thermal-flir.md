# Thermal vision research: real FLIR imagery and a spec for Night Shift (P11)

Michael (PLAY-NOTES P11): "thermal should be much more blurry, it should be difficult to see very far ahead as its a
full thermal view. Research FLIR thermal cameras and their result on a high resolution version camera."

Scope: research for a render-only post change. Gameplay and perception never read the vision mode. A26 (no seeing
through walls) holds. Web research done 2026-10-17 with WebSearch / WebFetch. Every claim has a URL. Lines marked
**calc** are my arithmetic from cited figures. Lines marked **game value** are tuning proposals with no source.

## 0. The short answer

- A real high-resolution goggle (640x512, 12 um pixels) is not blurry close up. Its softness comes from optics that
  blur about 2 sensor pixels, and from the sensor having about a third of a 1080p screen's pixels across.
- What really makes thermal hard to read at range is low scene contrast. An indoor scene at one temperature goes flat
  and grey, and the camera's gain control stretches the noise. Hot bodies stay readable, while walls, floors and
  furniture lose their edges.
- Air does not explain "hard to see 20 m ahead". Atmospheric loss in LWIR matters over hundreds of metres, not inside
  a building. A distance falloff is a stylisation. Section 5 grounds it in the low-contrast effect, so it reads as
  real.
- Real thermal ignores visible light: lamplight and shadow do not appear. Today's shader feeds the lit image into the
  ramp, so lamp-lit walls read warm. That is the biggest physical error in the current look.

## 1. What real LWIR microbolometer imagery looks like

### Sensor resolutions and pixel pitch
- FLIR Boson: 640x512 and 320x256, 12 um pitch, lenses from 4 to 95 degrees HFOV. Thermal sensitivity is
  <=40 / 50 / 60 mK (industrial / professional / consumer). Frame rate is 60 Hz, with 9 Hz versions.
  https://www.oem.flir.com/products/boson/
- Boson 640 runs at 60 Hz baseline, with 30 Hz selectable at runtime. https://groupgets.com/boson640
- High end: Teledyne FLIR Boson SX8 is 1280x1024 at 8 um pitch, "four times the resolution" of VGA 640x512 modules.
  https://asiapacificdefencereporter.com/posts/teledyne-flir-oem-launches-boson-sx8-thermal-camera-module
- Leonardo DRS Tenum1280 offers 30 Hz and 9 Hz modes at <60 mK, and the Tenum640 offers 60 Hz and 9 Hz.
  https://journals.spiedigitallibrary.org/conference-proceedings-of-spie/12107/1210714/Leonardo-DRS-Tenum-640-and-Tenum-1280-uncooled-commercial-cameras/10.1117/12.2618815.full
- Xenics Dione 1280 (1280x1024, 12 um) is <50 mK. https://www.axiomoptics.com/products/dione-1280-cam/
- Helmet / weapon monocular example: FLIR Breach PTQ136. It has a 320x256 Boson at 60 Hz, 24x19 degree FOV and
  f/1.04 9.1 mm lens. The sensor is upscaled to a 1280x960 display, so the eyepiece shows a smoothed image, not
  blocky pixels. https://www.adorama.com/flir-breach-ptq136-thermal-imaging-monocular/p/flirc

### Blur / optics (MTF)
- Airy disk (first-null) diameter = 2.44 x wavelength x f-number.
  https://www.edmundoptics.com/knowledge-center/application-notes/imaging/limitations-on-resolution-and-contrast-the-airy-disk/
  - **calc**: at 10 um and f/1 the spot is 24.4 um, about 2 pixels at 12 um pitch. A 12 um LWIR sensor is
    diffraction-limited, and each scene point smears over about 2x2 pixels even with perfect focus.
- LWIR optics at small pitch are diffraction-limited. A 12 um pixel needs roughly a diffraction-limited f/1.2 lens
  to keep up, and detector MTF also falls as pitch shrinks.
  https://www.spiedigitallibrary.org/journals/OE/volume-52/issue-06/061305/Uncooled-long-wave-infrared-small-pixel-focal-plane-array-and/10.1117/1.OE.52.6.061305.full
  https://www.ophiropt.com/en/s/shrinking_pixels
- Detail lost in the lens "cannot be restored later by the sensor or by software"; a mismatch gives blurred
  information over several pixels. https://workswell.eu/thermal-optics-sensor-resolution-mtf-in-lwir-imaging/

### Low contrast, no texture, soft edges
- The thermal scene is very low contrast, and a 3 K difference counts as good imaging conditions.
  https://www.spiedigitallibrary.org/ebooks/TT/Analysis-and-Evaluation-of-Sampled-Imaging-Systems/Chapter9/Thermal-Imager-Topics/10.1117/3.853462.ch9
- When the environment cools to one temperature, the whole frame is one shade and objects cannot be told apart
  (US patent 11941751, FIG. 8). https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11941751
- Thermal crossover: target / background contrast falls to near zero at times of day.
  https://www.mdpi.com/1424-8220/17/1/56/htm
- When the background is near body temperature (rock, sand) "there are very few distinguishing features".
  https://arxiv.org/pdf/2309.04453
- Painted texture, printed signs and colour do not exist in LWIR. Only temperature and emissivity do, which is why
  the image has no texture (consequence of the above, and of glass / reflection behaviour in section 3).

### Noise
- NETD is the noise floor. Small temperature differences sink into it, and averaging frames lowers it
  (US 9282259). https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9282259
- Fixed-pattern noise comes from per-pixel manufacturing variation and the optical energy profile. It is corrected
  by per-pixel offset tables, measured against a uniform field (the shutter).
  https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6610984
- The shutter (flat-field correction) deploys about every 2.5 minutes, or on a temperature change. It resets offsets,
  but only corrects non-uniformity between the shutter and the detector, so some residual pattern remains.
  https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/6610984
- During a shutter FFC the camera holds the last image for "a few hundred milliseconds", and FFC runs every few
  minutes. https://patents.justia.com/patent/20210243338
- FLIR lets users set the interval between shutter events. https://oem.flir.com/support/support-center/knowledge-base/why-does-flir-offer-oem-camera-modules-with-and-without-shutters2/
- Global histogram equalization amplifies noise in thermal images.
  https://publications.drdo.gov.in/ojs/index.php/dsj/article/download/6873/4526

### Frame rate and lag
- 9 Hz is an export line, not a physical limit. ECCN 6A003.b.4.b does not control cameras at or below 9 Hz, so slow
  versions (e.g. Tau 9 Hz, ECCN 6A993) are for unrestricted sale, and full-rate 30 Hz units are controlled.
  https://www.bis.gov/revisions-license-requirements-license-exception-eligibility-certain-thermal-imaging-cameras-foreign-made-military
  https://www.axis.com/files/conformity/US-export_fact_sheet-EU_sensors_en_1706.pdf
- Military / police kit is full rate: the Breach PTQ136 runs at 60 Hz (above).
- A microbolometer has a thermal time constant of 10-15 ms. Its blur is an exponential decay, so moving objects
  smear. https://arxiv.org/pdf/2006.04973
  https://qirt2026.unina.it/event/1/contributions/25/attachments/75/173/Extended_Abstract_23_MERAINANI.pdf

### Range: pixels on target and Johnson criteria
- Johnson criteria at 50% probability: 1.5 px across the target to detect, 6 px to recognise, 12 px to identify. A
  person's critical width is 0.75 m. https://www.axis.com/dam/public/e1/df/a5/thermal-technology-glossary-en-US-111749.pdf
  (via search summary; the PDF did not extract)
- In bar cycles: 0.75 / 3 / 6 cycles for 50% D / R / I.
  https://www.leonardodrs.com/media/10494/201705_truth_about_rangedata_mr-2014-10-683_rev02.pdf
- Real figure: a 640x512 camera with a 19 mm lens detects a person at about 791 m and recognises one at about 203 m.
  https://www.dahuasecurity.com/pt/products/All-Products/Thermal-Cameras/Thernography-Series/Thermography/TPC-BF5601-T
- Another 640x512 camera with a 25 mm lens gives 734 m detection, 184 m recognition and 92 m identification.
  https://pl.sunellsecurity.com/products/sn-tpc6401kt-f-ii-high-end-thermal-camera/
- **calc, mapped to Night Shift's camera** (`src/config/camera.ts` fov 75, horizontal): a 640-wide sensor over
  75 degrees gives 2.05 mrad per pixel, and a 0.75 m person covers 367 / d pixels.

| Sensor over 75 deg HFOV | Identify (12 px) | Recognise (6 px) | Detect (1.5 px) |
| --- | --- | --- | --- |
| 640 wide ("high-res goggle") | 31 m | 61 m | 245 m |
| 320 wide (Breach-class) | 15 m | 31 m | 122 m |

  At the game's wide FOV, a real 640 sensor still identifies a person across any interior room. Resolution alone
  will not deliver "difficult to see far ahead".

### Atmosphere, humidity, fog, rain
- Humid air attenuates IR, so summer range is shorter than winter. Fog and rain scatter IR and "can severely limit"
  range. LWIR beats MWIR in fog, with about 4x the visual range in Cat II fog (610 m visibility), but has no advantage
  in Cat IIIa / IIIc fog (305 m / 92 m). Rain lowers target contrast.
  https://www.flir.com/discover/rd-science/can-thermal-imaging-see-through-fog-and-rain/
- Rain and humidity narrow the target / background temperature difference, softening images and cutting recognition
  distance. https://pulsarvision.com/journal/weather-impact-thermal-imaging-hunting/
- Heavy rain substantially cuts range, and water on the lens adds loss.
  https://trends.directindustry.com/raythink-raytron-industrial/project-4602863-1185410.html
- Range modelled against absolute humidity: https://publications.drdo.gov.in/ojs/index.php/dsj/article/download/12078/6319
- No source gave a per-metre coefficient at indoor distances. The loss is significant over 100 m to km paths, not
  10-40 m. Any per-metre falloff in the game is a **game value**.

## 2. Palettes and AGC

### Palettes
- White Hot is the palette military and law enforcement use. Black Hot is also a law-enforcement / hunter favourite.
  https://www.army-technology.com/contractors/vehicle-identification/ir-tools/pressreleases/breaking-down-the-thermal-color-palette/
- FLIR describes Ironbow (a colour ramp) as general purpose, quick for spotting anomalies and body heat.
  https://www.flir.com/discover/ots/outdoor/your-perfect-palette/
- Monoculars such as the Breach show greyscale on the eyepiece display (palette options vary by device; the White Hot
  military use above is the anchor).

### AGC (automatic gain control)
- AGC maps the wide raw range (often 14-bit) to 8-bit display, recalculating from the frame's minimum and maximum.
  When a hot object enters a cold background, the range is recalculated.
  https://www.axiomoptics.com/blog/what-is-agc-in-thermal-imaging/
- AGC can be linear or a histogram-equalization curve, and equalization reallocates grey levels when a small hot
  object sits on a big flat background. https://www.axis.com/dam/public/e1/df/a5/thermal-technology-glossary-en-US-111749.pdf
- Plateau equalization (a clipped histogram) is the common FLIR-style variant, used in LITENING II.
  https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12555192
- FLIR DDE (digital detail enhancement) "is similar to a sharpening filter". It acts only in the nonlinear AGC modes
  (HEQ, IB) and needs contrast to work.
  https://www.oem.flir.com/support/support-center/knowledge-base/why-doesnt-dde-appear-to-have-an-effect-on-agc/
- Visible consequence (**calc** from the above): in linear AGC, a hot lamp or close body entering the frame widens
  the range, so the rest of the scene drops toward black. That is the bloom-and-darken people see on real footage.
  Histogram modes resist this and amplify background noise instead.
- Halos: a dark ring around hot objects. It comes from ferro-electric choppers, from internal reflections (a faint
  inverted ghost), or from enhancement "going overboard" in processing modes.
  https://eevblog.com/forum/thermal-imaging/seek-vs-flir-one-g2-images/50 and
  https://encyclopedia.pub/entry/history/show/101104 (the fetch was 403, so this comes from the search summary)
- No source gave an AGC response time. The damping values below are **game values**.

## 3. Walls, glass, fog, cold backgrounds
- Window glass is opaque to LWIR. A thermal device aimed at a window shows the pane and a mirror image of what is on
  its own side, often the operator. https://armasight.com/armasight-university/why-thermal-imaging-devices-dont-see-through-glass-and-other-common-questions-/
  https://www.infinitioptics.com/technology/thermal-imaging
- Germanium windows pass LWIR, and MWIR sees poorly through some glass.
  https://www.infinitioptics.com/video/thermal-camera-vs-glass
- Walls show only their own surface. A large heat source can warm a wall enough to show as a soft patch.
  https://armasight.com/armasight-university/why-thermal-imaging-devices-dont-see-through-glass-and-other-common-questions-/
- Fog / rain: see section 1. Fog cuts range and detail, and light fog is still workable.
  https://armasight.com/armasight-university/why-thermal-imaging-devices-dont-see-through-glass-and-other-common-questions-/
- Cold backgrounds (night sky, open air) read darkest. Uniform rooms read as one flat grey (section 1, US 11941751).

## 4. Splinter Cell (Chaos Theory) reference
- The Splinter Cell wiki says cool objects are "a dark, purplish color", with hotter ones going green, yellow, then
  red (a colour ramp, not greyscale). https://splintercell.fandom.com/wiki/Thermal_vision (fetch returned 402;
  quoted from the search result)
- A pre-release 2002 preview of the first game described cold as dark blue, with warm as red / yellow / white.
  https://www.gamespot.com/articles/e3-2002-tom-clancys-splinter-cell-update/1100-2879021/
- Chaos Theory has three goggle modes: night, thermal ("highlights heat signatures") and the new EMF.
  https://www.ludo.guide/guide/tom-clancys-splinter-cell-chaos-theory/sc1-1-equipment
  https://splintercell.fandom.com/wiki/Night_vision
- GameSpy: "when combined with thermal vision, you can really do some damage from a distance"; EMF "lights up
  electronic equipment like a Christmas tree". No source found says CT thermal sees through walls.
  https://gamespy-archives.quaddicted.com/sites/www.planetrainbowsix.com/features/articles/7-13-05b.html
- For Night Shift: CT used a stylised colour ramp. A White Hot greyscale is both the real military look and
  distinct from the SC ramp (no Splinter Cell IP; a palette is not IP, but distinct is safer and more grounded).

## 5. Spec: "high-resolution FLIR, still hard to see far ahead" (render only)

Units: H = share of screen height (resolution independent, like `THERMAL.blur`). The reference goggle is a 640x512
sensor stretched over the game's 75 degree HFOV. At 16:9 that is 360 sensor rows per screen height, so one sensor
pixel is 0.0028 H.

### 5.1 Input: heat, not light (most important)
- Real LWIR ignores visible light (sections 1, 3). The thermal input must be heat, not the lit image.
- **game value**: while thermal is on, flatten scene lighting the way night vision already changes lamp gain
  (`VISION_GAIN` in `LampPlugin`). Lamp contribution goes to about 0.25x and ambient up, so light and shadow survive at
  most about 15% of the input range. Lamp bulbs and fixtures keep their warm emissive (hot), and warm rigs keep
  `THERMAL.bodyEmit`.
- Material base colour (albedo) maps weakly (+-0.06) so objects at the same temperature stay distinguishable by
  emissivity, but barely.

### 5.2 Effective resolution and blur
- Optics + sensor footprint: Gaussian with sigma 0.9 sensor px = **0.0025 H** (FWHM about 2.1 sensor px, matching
  the 2-pixel Airy spot). This is about 2.7 px sigma at 1080p, against today's 4 taps at 0.0018 H mixed 0.6
  (effective sigma about 1 px).
- Taps: centre + 8 on a ring at r = 0.0035 H (weights 0.2 / 0.1 each), in the existing pass with no new target.
  A cheaper, more authentic option for desktop: render the scene at about 0.33 scale while thermal is on and
  bilinear upscale. That is the real goggle's sensor-to-display path, and it saves GPU. Check it against TAAU and
  the governor.
- No visible square pixels: real eyepieces upscale smoothly (Breach: 320 to 1280 display).
- Michael's "much more blurry" is subjective, so expose sigma as one constant. Start at 0.0025 H and try 0.0035 H
  (the 320-class goggle look).

### 5.3 Distance falloff ("full thermal view, hard to see far ahead")
Grounded in the low-contrast effect: distant room surfaces converge to the background grey, and AGC plus noise erase
the small differences. Heat fades more slowly than surface detail, because a body is about 10 K above the room
(stated as **game value**; section 1 says 3 K is good contrast).
- Per pixel, from view depth d (metres): `Tbg = max(exp(-0.09 d), 0.08)` for non-hot input. It reaches 50% at 7.7 m,
  17% at 20 m and the floor by 28 m.
- `Thot = max(exp(-0.035 d), 0.25)` for the heat band (input above `hotFrom`). It reaches 50% at 20 m and holds at
  least 25%, so a guard at 40 m is a dim warm smudge, never invisible in open view.
- `l = agcMean + (l - agcMean) * T`, with agcMean being the AGC's background level (0.30 in palette input space).
- Distance softening: sigma(d) = sigma0 * (1 + d / 15), capped at 2.5x. This stylises fewer pixels on target. At the
  game's FOV real optics would not blur with distance (section 1 table), so this is the part to tune by eye.
- Weather: multiply both rates by the map's existing weather factor (`gameState.ts`: rain x1.6, fog x4). That matches
  the cited direction: rain and fog cut contrast and range.
- Depth source: on desktop, `postStack` already has a depth source (G-buffer / depth renderer / scene depth, 3.2) and
  could bind it to the cinematic pass. The phone light look has no post stack (`postStack.ts` line 195, 265), so the
  phone needs a depth-free route. One option is material-level scene fog, compiled on from map start at density 0
  so toggling thermal does not recompile shaders. That is the implementer's decision; measure it against the phone
  budget.

### 5.4 Noise
- Temporal: rms about 3% of full scale on the cold background, falling to about 1% on the hottest (keep
  `sensorAmp`'s luminance weighting; histogram-style AGC amplifies noise in flat areas). Today the noise is uniform
  p-p 0.13 = rms 3.8%, which is in range.
- Grain size: one sensor pixel, **360 cells per screen height** at 16:9 (= 640 / aspect), blurred with the image (add
  noise before the soften, or use cells of 1.5 sensor px). Today it is 640 cells per height: sharper than the sensor,
  so the grain reads as film, not as a bolometer.
- Refresh: 60 Hz (a full-rate military sensor). 30 Hz, as today, is acceptable for the phone.
- Fixed pattern: column offsets with rms 0.8% (hash of column index only, constant between FFCs). Add low-frequency
  shading of 3% (one corner warmer), drifting over about 20 s.
- FFC: every 90-150 s (random), re-seed the column pattern and reset the shading to 0, which then regrows. A real
  camera also freezes about 0.3 s. Holding a frame needs a copy target, so skip the freeze unless a history buffer is
  already free. A soft shutter click on WebAudio is optional.

### 5.5 Halo
- Unsharp-mask overshoot on heat edges: `l += 0.3 * (l - wide)`, where wide is a broad blur of about 0.012 H. Use the
  bound `glowSampler` if it carries a blurred scene in thermal; otherwise use 4 taps at 0.012 H. The result is a thin
  dark ring around warm bodies in White Hot, and a slightly hotter core.
- Clamp the dark ring so it never goes below the palette's cold end.

### 5.6 AGC behaviour
- Global gain: when hot content fills more than about 8% of the screen (a lamp up close, a body at arm's length), the
  background drops by up to 35% and the hot object clips to white (linear-AGC blooming). When it leaves, the
  background slowly re-normalises.
- **game value** damping: attack 0.25 s, release 1.2 s.
- It must be measured from rendered pixels, for example a tiny downsample read back every 4th frame asynchronously,
  or a mip of the glow target. Never compute it from rig positions or projected bounds: that would brighten or darken
  the view for a body behind a wall, which leaks A26.
- Phone fallback: no global AGC. The halo (5.5) carries the local-contrast look.

### 5.7 Palette
- White Hot greyscale: cold 0.05, background about 0.30, warm surfaces 0.45, heat ramps 0.55 to 1.0. A very slight
  cool tint in the blacks, with no blue-grey cast at mid-tones. Hot clip near-white (a trace of warm is fine).
- Optional later: Black Hot as a settings choice. Not needed now.
- Keep the eyepiece vignette and goggle flip as they are.

### 5.8 Frame-rate feel
- Render at the game's rate. The sensor is full-rate, and a military goggle is never 9 Hz.
- Optional bolometer lag: blend 20-25% of the previous frame at 60 fps (tau about 12 ms), only if an existing history
  (TAAU) can be reused. Otherwise skip it.

### 5.9 Do NOT
- Reveal through walls, doors, floors or **glass** (A26; glass is LWIR-opaque). Check the maps with glass (kestrel,
  mansion, port, refinery, `breakables.ts`): in thermal, glass must render opaque at a cool tone. A faint mirror of
  warm bodies on the near side is optional.
- Drive any effect (AGC, falloff, halo) from entity positions, rig lists or projected bounds. Use rendered pixels only.
- Let perception, the light meter, the wire or AI read any of it (render only, `tests/visionIsolation.test.ts`).
- Show light and shadow (lamp pools on the floor) as heat.
- Use a 9 Hz stutter. It is an export throttle, not a goggle look.
- Re-randomise the fixed-pattern noise every frame. It must be fixed between FFCs.
- Make a guard in open view vanish (keep the `Thot` floor). Thermal is the mode for finding bodies, and the falloff
  should hide room detail, not people.
- Copy SC's purple-green-yellow-red ramp.
- Add a render target on the phone, or allocate in the per-frame update (hot-path rule).

## 6. Current implementation vs this spec

From `src/vfx/visionLook.ts` (THERMAL, SENSOR_GRAIN, VISION_GLSL) and `src/vfx/cinematicPost.ts` lines 66-90.

| Aspect | Now | Spec |
| --- | --- | --- |
| Input | Lit scene luma (`dot(c.rgb, ...)`): lamplight and shadow read as heat | Heat-only input; lighting flattened while thermal is on (5.1) |
| Blur | 4 diagonal taps at 0.0018 H, 60% mix (about 1 px sigma at 1080p) | Gaussian sigma 0.0025 H, 9 taps or render at 0.33 scale; grows with distance (5.2, 5.3) |
| Distance | None: far walls as crisp as near ones | Contrast falloff to agcMean: background 0.09/m, heat 0.035/m with a 25% floor; weather multiplier (5.3) |
| Noise | Uniform hash, 640 cells/H, 30 Hz, p-p 0.13 dark to 0.45x lit | Same amplitude; 360 cells/H at sensor scale, softened; add column FPN 0.8%, shading 3%, FFC re-seed (5.4) |
| Halo | None (PC-PASS row 46 asks for "no halo") | Deliberate thin dark ring around heat, 0.3 unsharp (5.5); PC-PASS row 46 wording needs updating if adopted |
| AGC | None (fixed ramp `hotFrom` 0.55) | Pixel-measured global gain, 0.25 s attack / 1.2 s release; none on phone (5.6) |
| Palette | Cold blue-grey (0.06,0.08,0.12) to (0.30,0.37,0.46), white-hot top | Neutral White Hot greyscale, trace of cool in blacks (5.7) |
| Glass | Not handled (transparent glass shows warm bodies behind it) | Opaque in thermal (5.9) |
| Walls | A26 holds (emissive flag, post only) | Unchanged |
| Isolation | Render only | Unchanged |

Open question for Michael: how far should a guard in open view stay visible? The spec's 25% heat floor keeps one
always faintly visible. Lowering it to about 10% makes thermal much harder at range, but bodies past 30 m nearly
disappear.
