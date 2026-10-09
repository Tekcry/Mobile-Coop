# Night vision and lamp light: how the real things behave

Research note for Michael (2026-10-09), from the Step 4b look check. Real-world behaviour first, then what Night Shift
does now and what it could do. Proposals are not decisions: Michael decides, and anything that changes design goes into
the bible.

## 1. Night vision goggles (image intensifiers)

How they work: a tube amplifies the light that is already there (moon, stars, sky glow, light leaking from windows and
lamps, and near-infrared the eye cannot see) many thousands of times and shows it on a green or white phosphor screen.
They see light, not heat.

### Where they excel
- **Dim, not dark:** moonlight, starlight, a city's sky glow, a room lit only by a distant lamp or a window. This is the
  ideal case: a dark room reads clearly, with faces, text and texture visible.
- **Detail:** much finer detail than thermal. You can read a sign, recognise a face, see a tripwire.
- **Through glass:** windows and visors do not block them (thermal cannot see through glass).
- **Infrared:** IR lasers, IR illuminators and IR beacons are visible through them and invisible to the naked eye.
- **Moving in the dark:** walking, climbing and navigating without a light that would give you away.

### What a light looks like through them (glare and halo)
- **The halo is made inside the tube**, by the gap between the photocathode and the microchannel plate, so it is the same
  size anywhere on the screen and at any distance: a lab study of Gen III goggles measured a constant 1 deg 48' (about
  1.8 degrees across) for sources at every distance tested, and found halos do not follow perspective. Vendors grade
  tubes by halo size on the screen (under 1.0 mm excellent, under 1.5 mm good).
- **So at a distance** a lamp is a small bright disc (a "ball of light"); **up close** the lamp's own image is large
  and bright, ringed by the same thin halo. The halo does not swell to fill the view as you approach.
- **The halo is a near-uniform disc** round the light, much larger than the tube's blur for faint detail, and brighter
  for brighter lights; a faint glow beyond it.
- **Automatic brightness control (ABC):** with a bright light in view the tube lowers its gain to protect itself; the
  image can brighten first, then after a short delay dims to a steady level, and the dark parts of the scene sink. This,
  not a giant halo, is what blinds you near lamps. Bright-source protection and auto-gating (rapidly switching the
  photocathode) stop sudden intense light from whiting the user out completely.
- Sources: [Allison et al., Psychophysics of Night Vision Device Halo](https://percept.eecs.yorku.ca/papers/Allison-%20Psychophysics%20of%20Night%20Vision%20Device%20Halo.pdf),
  [Effects of image intensifier halo on perceived layout](https://researchwith.njit.edu/en/publications/effects-of-image-intensifier-halo-on-perceived-layout/),
  [Steele Industries, image intensifier specifications](https://steeleindustries.com/image-intensifier-specifications/),
  [Optics Trade, automatic brightness control](https://blog.optics-trade.eu/automatic-brightness-control/),
  [Armasight, night vision glossary](https://armasight.com/blog/night-vision-glossary-and-abbreviations/).

### Putting them on
- Helmet goggles flip down in front of the eyes on a mount; the tube image is there as soon as they are down (a modern
  tube powers up almost at once). There is no fade: the housing passes the eyes, then the image is there.

### Where they perform poorly
- **Bright light in view:** every light source blooms into a halo (the tube's glare), and the tube's automatic gain
  control turns the whole image down to protect itself, so the dark parts of the scene vanish. Looking at a lamp, a
  flashlight, a muzzle flash or a lit window in the goggles washes the view out. Modern tubes cut out briefly when
  something very bright is in view (bright-source protection).
- **Moving between dark and lit areas:** the gain lags and "pumps"; the image flares, then settles.
- **Total darkness:** a sealed room with no light at all has nothing to amplify. The image becomes grainy noise
  (scintillation) and eventually black, unless an IR illuminator is on, and anyone else with night vision sees that
  illuminator like a torch.
- **Narrow view:** about 40 degrees, a tunnel with no peripheral vision.
- **Poorer depth perception:** distances and steps are harder to judge (especially with one tube).
- **No colour:** colour-coded wires, keycards or signs look the same.
- **Smoke, fog, rain and dust** scatter the light and shorten the range (thermal sees through smoke).
- **People who hold still in the dark** are as hard to spot as anything else of the same brightness (thermal shows their
  heat).

### Thermal (for Phase 3)
Sees heat, not light: works in total darkness and through smoke, makes people stand out against cool backgrounds, but
cannot see through glass, shows little fine detail (no faces, no text) and is confused by hot surfaces (vents, lamps
that have been on, sunlit walls).

## 2. Lamp light (warehouse lighting)

- **The fittings:** warehouses use linear LED battens or fluorescent tubes (1.2 - 1.5 m long) at 3 - 6 m, and round
  high-bay lamps (30 - 45 cm discs) on high ceilings.
- **A linear fitting is a line source:** its diffuser glows evenly along its whole length. Its glare, and the light it
  puts on the floor, come from the whole length, not from its middle.
- **Distribution:** close to a cosine (Lambertian) spread downward, a wide beam (about 120 degrees). The pool on the
  floor is elongated along the fitting (a rounded oblong), most visibly when the fitting is low; from far away it
  becomes round.
- **Falloff:** close to the fitting (nearer than its length) the light falls off roughly with distance; far away
  (several lengths) with the square of the distance, like a point. There is no hard edge: the light fades out smoothly.
- **Beams:** in clean indoor air you do not see a beam, only the light where it lands. A visible shaft needs dust,
  smoke, haze or fog in the air.
- **Shadows:** an extended source casts soft shadows along its length and sharper ones across it.

## 3. What Night Shift does now (Step 4b fix pass, 2026-10-09)

- Night vision is a gain inside the lighting, so it reveals real detail in dim areas and blows out in lit ones.
- The tube: a pale grey-green phosphor, grain strongest in the dark, a dark eyepiece edge.
- **Glow (round 4, Michael: replicate Chaos Theory's night vision style):** the image's bright parts bloom - lamps,
  lit windows and blown-out walls spill a soft glow, a strip along its length, nothing through a wall. A real tube's
  halo (a thin fixed-angle ring, round 3) was accurate but looked odd; the game follows the reference's art style. Near
  lamps in view still turn the tube's gain down after a short delay (lamps stay white), so the room sinks into the dark
  round a bright lamp: turn the lights off or shoot them.
- **No fade:** the goggles flip down or up across the view in 0.2 s and the image switches under them.
- The additive light cones are gone (a beam is not seen in clean air). Desktop's volumetric haze stays.
- **Lamp light on surfaces still comes from the fitting's centre point.** Visibility (shadows) is already sampled
  along strips (`voxel/lampBake.ts`), but the falloff is from the centre (`world/lampMath.ts`). Fixing it changes
  the light field itself, so it changes gameplay (see 4.1).

## 4. Proposals (Michael decides)

1. **Strip lamps as line sources.** The one lamp formula (`lampMath`) measures distance and the cosine from the nearest
   point on the fitting's glowing length instead of its centre. The pool becomes an oblong along the strip and the light
   comes from the whole fitting. **This changes gameplay light** (lit areas grow along strips), the bake, the phone's
   lamp volume and the desktop path together, and it is an engine fact (`docs/level-design.md` Section 12). Best done
   before Step 5, whose parity test then locks it. Suggested as Step 4c.
2. **Flashlights in the goggles:** a guard's flashlight pointed at you whites the view out (it does not glare yet).
   Muzzle flashes and flashbangs flash brighter in night vision.
3. **Total darkness shows noise, not detail:** where there is no light at all, night vision shows mostly scintillation;
   an IR illuminator on the goggles fixes it (and could be seen by guards with night vision, if any ever have them).
4. **Gain lag:** stepping from dark into light flares the image for a moment before it settles.
5. **No colour in night vision** as a puzzle rule (a colour-coded wire or keycard needs the goggles off).
6. **Thermal (Phase 3):** sees through smoke and in total darkness, not through glass; shows heat, not detail.
