> **Current milestone (2026-10-09): First Playable - a 4-player Kestrel Exchange greybox for a friends playtest comes before the rest of the roadmap. See `docs/prompts/first-playable.md`.**

# Night Shift - Design Bible

Version 1.11 - 2026-10-09 (1.11: weapon holstered unless aiming, no hip fire, elbow strike on the fire button. 1.10: 1.10: darkness is dark - L7 rewritten, display brightness targets in L5, night vision as a lighting gain, goggle glow now. 1.9: 1.9: desktop visual target, CC0 textures for desktop detail, Phase 6b. 1.8: 1.8: Exchange Phase 2 approved, Space 8 lane camera, doors block light, baked moon, per-stop guard facing, the Client and the operators' real names. 1.7: 1.7: foundations - audio test, input parity, personal project, shared progress, connectivity test, solo-testable co-op, defaults. 1.6: 1.6: Mission 8 Confrontation - the traitor finale. 1.5: 1.5: story, title Night Shift, co-op engagement systems, civilians, awareness arcs, no quicksave, health numbers. 1.4: 1.4: braking stop at run / sprint locked. 1.3: animation realism standard and full animation audit in Phase 3b. 1.1: Kestrel Exchange restart, level design standard, branch state. 1.2: movement, camera, gunplay, animation, health and operators locked; Phase 3b added). Owner: Michael. Location in the repo: `docs/design-bible.md`.

---

## 0. How to use this document

**Authority order.** When sources disagree, the higher one wins. Note the conflict under "Decisions" in your phase report.

1. Michael's current instruction.
2. This bible (gameplay) and `docs/story.md` (story, setting, characters and in-game text).
3. The current phase spec (`docs/prompts/phase-N-*.md`).
4. `docs/level-design.md` (the level design standard) and the map's own spec and design documents.
5. `CLAUDE.md` and `docs/systems/*.md`.
6. Existing code and tests.

**History warning.** Older docs, prompts and code describe a Splinter Cell: Blacklist-style game. That means snap cover, cover-to-cover, Mark & Execute, sonar, the Ghost / Panther / Assault economy, PvP and Wave. That direction is history.

- Do not extend those systems.
- Section 6 says what happens to each of them.

**What to read.**

- Every session reads Sections 0-3, 6 and 9.
- Read other sections only when the phase touches them.

**Reference game.** Splinter Cell: Chaos Theory (2005) is a design reference only.

- Use none of its names, characters, organisations, story, logos, UI art or audio.
- Everything in this game is original.
- Do not use "Sam Fisher", "Third Echelon", "Lambert", "OPSAT", "OCP", "SC-20K" or similar in code, UI or docs. Original names are given below.

---

## 1. Vision

**Night Shift** (renamed from Silent But Deadly on 2026-10-08; internal ids keep the old names) is an original third-person stealth action game in the spirit of Splinter Cell: Chaos Theory.

**Story** (`docs/story.md`): a grounded techno-thriller with dry humour.

- The deniable unit NIGHT SHIFT (operators Wren, Moth, Tally and Sexton, handler LANTERN) has nine nights to stop SUNDOWN, a staged blackout of the port city of Hollowmere.
- The team that lives in shadow has to keep the city's lights on.

- One operative, or a team of two to four, infiltrates guarded places at night.
- Darkness, silence, acrobatic movement and patience are the tools.
- Combat is possible, but it is a sign that something went wrong.

The campaign is a sequence of handcrafted missions.

- Every mission is fully playable solo.
- The same missions are playable in co-op for 2-4 players, with team moves that open extra routes.
- Story is delivered through text radio and subtitles only.

It runs in the browser as an installable PWA. The two platforms are equal:

- the iPhone 17 Pro Max (landscape, touch or controller)
- desktop (mouse and keyboard or controller)

The heart of the game is the light and shadow system. If a feature makes light less truthful, less readable or less controllable, it is wrong.

---

## 2. Pillars (ranked - use the rank to break ties)

### P1 - Light and shadow are the game

- Darkness is safety. Light is danger. The player can always read which is which.
- The light meter never lies. What the player sees on screen, what the meter shows and what guards perceive all come from one source (Section 5.1).
- Light is a toy:
  - switches
  - breakable lamps
  - fuse boxes
  - EMP / disruptor
  - flashlights that guards carry into the dark
- **Test:** stand anywhere in any map on any device. The rendered brightness of the player, the meter and the guards' detection rate agree.

### P2 - Sound matters

- Every movement makes noise relative to the environment.
- Loud places (machinery, rain) let you move faster. Quiet places punish haste.
- **Test:** the sound meter shows your noise against the local ambient level, and guards hear exactly when the meter says they can.

### P3 - The player authors the approach

- Every space has 2-3 solo routes (high / traversal, low / shadow, loud / aggressive).
- Each space has lethal and non-lethal options. Ghosting (never seen, nobody harmed) is always possible.
- **Test:** each mission can be completed with no kills and no alarms, and with no takedowns at all.

### P4 - Physical, deliberate movement

- Chaos Theory acrobatics: speed gears, split jump, wall jump, pipes, ledges, rappel, back-to-wall.
- Movement is weighted but responsive.
- No magnetic snap-to-cover. The player places the body.

### P5 - Readable, fair AI

- Patrols are predictable with exploitable gaps.
- Detection escalates visibly and audibly. Guards react to environmental change.
- **Test:** after any detection the player can say why it happened.

### P6 - Co-op is the same mission, together

- Solo is complete. Co-op adds routes (team moves) and coordination, not a different game.
- Player count never changes guard count.
- **One exception:** Mission 8's Act 2, the Confrontation (5.15), turns the team against itself. It is the only versus content in the campaign.

### P7 - Phone and desktop are both first class

- Phone: 60 fps sustained on a warm iPhone 17 Pro Max.
- Every action is possible on touch through contextual prompts.
- Gameplay never depends on graphics settings (crossplay fairness).

---

## 3. The player experience

### Mission flow

1. **Briefing** - text, an annotated top-down map and a kit choice (Section 5.6).
2. **Insertion** - choose an insertion point where the mission offers more than one.
3. **Space by space**, following the level design spine:
   - scout from the entry vantage
   - plan
   - execute
   - reach the next checkpoint
4. **Radio** - the handler and team talk through text radio. Radio never blocks input.
5. **Objectives** - primary objectives complete the mission. Secondary and opportunity objectives raise the rating.
6. **Extraction.**
7. **Results** - stealth rating and breakdown (Section 5.8).

### Failure and recovery

- **Detection** escalates: suspicious, then investigating, then alert, then search.
- **Breaking line of sight** works. Guards search the last known position, not the real one.
- **Alarms** raise the mission alarm level. Some missions fail at a set alarm count.
- **Death** reloads the last checkpoint. In co-op, a downed player can be revived; all players down reloads the checkpoint.

### A good session feels like

- watching a patrol from a dark ledge
- shooting out one lamp
- slipping through the new shadow
- splitting up a corridor
- dropping onto a guard
- dragging him into the dark before his partner turns round

---

## 4. Verb catalogue

**Status legend:**

- **Have** - exists on `ct-movement` / `dev` and stays.
- **Adapt** - exists but must change.
- **Add** - new.
- **Remove** - deleted.
- **Park** - kept behind `?legacy=1`, no work.

The Phase column refers to Section 10.

### Movement

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Speed gears (6) | Wheel / D-pad / rocker sets pace. Noise scales with gear. | Have | - |
| Instant stop / start, roll | CT feel | Have | - |
| Crouch / stand (no prone) | | Have | - |
| Quick 180 turn | Flick the stick back at gear 3 or above: a fast pivot with no slide | Add | 3b |
| Momentum carry | A run carries its speed into the start of a mantle, vault, grab or drop, so moves chain without stopping. Never automatic: every move is a press. | Add | 3b |
| Split jump, wall jump | Narrow corridors, lips | Have | - |
| Pipes (hang, shimmy, legs up), drainpipes, ladders, ledges (shimmy, drop, climb) | | Have | - |
| Ducts, windows, ziplines, vault / mantle, fences, rappel | | Have | - |
| Back-to-wall | Press against any high wall face. Slide along it, peek corners, lean out to aim and shoot, SWAT turn across doorways. No magnetic snap, no cover-to-cover dash. | Add | 3 |
| Snap cover, cover-to-cover, blind fire over cover | Blacklist | Remove | 3 |
| Door: open quietly, open fast, bash, peek (crack it open) | | Adapt (add peek) | 3 |

### Interaction

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Light switches, shoot out lamps | | Have | - |
| Fuse box / breaker | Kills a group of circuits. Guards send someone to reset it. | Add | 1 |
| Carry and hide bodies | Standing, faster, louder | Have | - |
| Drag bodies | Crouched, slow, silent on quiet floors, scrapes on loud ones | Add | 3b |
| Whistle | Lures the nearest calm guard to investigate your position | Add | 2 |
| Lockpick | Short minigame on doors / cases. Silent but takes time. Touch-friendly. | Add | 6 |
| Hack | Short minigame on terminals and keypads (replaces hold-to-hack where a mission wants it) | Add | 6 |
| Optic cable | Look under a closed door before opening it | Add | 6 |
| Interrogation | From a grab: question the guard for intel (subtitled), then knock out or kill | Add | 6 |
| Use a held guard on a scanner | Opportunity objective device | Add | 6 |
| Grab, human shield | | Have | - |
| Throw an object | Bottles, tools, cans found in levels: lure guards with the noise or break a lamp | Add | 6 |

### Takedowns

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Takedowns: behind, front, side, corner, above (drop), below (pull down), window, over low obstacle | Tap = non-lethal, hold = lethal | Have | - |
| Knife | Lethal close takedown. Cuts cloth and tarps to make new paths. | Add | 6 |
| Dual takedown (co-op) | | Have | - |
| Elbow strike | Fire button while the weapon is holstered. Knocks out an unaware guard; staggers an aware one (5.4). | Add | 3 |
| Holster / draw | The weapon comes out only while aiming and goes away when aiming stops (5.6) | Add | 3 |
| Hip fire | Removed (Michael, 2026-10-09) | Remove | 3 |
| Mark & Execute | Blacklist | Remove | 3 |

### Vision

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Night vision | | Have | - |
| Thermal vision | Heat signatures, sees through smoke and thin fabric | Add | 3 |
| Electro (EMF) vision | Shows powered devices: lamps, cameras, keypads, wiring runs | Add | 3 |
| Sonar | Blacklist | Remove | 3 |

### Gadgets

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Sleeping gas, flashbang, EMP grenade, noisemaker, sticky cam (lure, gas), proximity mine, frag | | Have | - |
| Light disruptor | Sidearm attachment. Temporarily kills a lamp, camera or keypad it hits. | Add | 6 |
| Sticky shocker | Non-lethal stun projectile | Add | 6 |
| Ring airfoil | Non-lethal knockdown projectile | Add | 6 |
| Camera jammer | Temporarily blinds security cameras. Battery limited. | Add | 6 |
| Tri-rotor drone | Blacklist | Park | - |

### Co-op team moves

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Boost, human ladder | | Have | - |
| Split-jump boost | One player in a split, the partner climbs onto them to reach a higher ledge | Add | 5 |
| Back-to-back climb | Two players climb a narrow shaft | Add | 5 |
| Pull-up | One player on a ledge pulls the partner up | Add | 5 |
| Rappel anchor | One player holds the rope while the other descends | Add | 5 |
| Pings | Typed: Go, Hold, Target, Light, Here, Danger, Sync | Adapt | 5 |
| Sync | Any player marks a target (guard, lamp, door, breaker); a 3-2-1 countdown on every screen; each player acts manually | Add | 5 |
| Drag a downed team-mate | Pull them into shadow before reviving (reuses body drag) | Add | 5 |
| Medkit on a team-mate | | Add | 5 |

---

## 5. Systems

### 5.1 Light and shadow (P1 - the heart of the game)

**Current state (3.4.0 on `master` / `dev`; merged into `ct-movement` in Phase 0).**

- **Desktop** renders lamps from a baked visibility atlas (`voxel/lampBake.ts`, `world/bakedLamps.ts`). It uses 0.2 m cells built from fixture sample points and conservative occupancy, so lamps light and shadow correctly.
- **Phones (3.4 light renderer)** draw the plain blockout with the nearest six lamps as plain lights and no shadow maps. Lamps therefore light through walls on a phone.
- **Gameplay (`GameState.updateLight`)** uses the analytic `LightRegistry` plus one static-geometry ray per light at 10 Hz. That is a third, separate calculation.
- **Result:** three versions of the truth that can disagree. Phase 1 fixes this.

**Rules (the target, from Phase 1 onwards):**

- **L1 - One source of truth.**
  - Gameplay light is used for the player meter, enemy perception of players and bodies, and AI torch decisions.
  - Gameplay light = local ambient zone + sum over every baked lamp that is on, not destroyed and not disrupted, of: intensity x falloff x cone x baked visibility at the sample point (trilinear).
  - Add to that dynamic lights (flashlights, flares, muzzle flashes if ever added), using ray occlusion against static collision.
- **L2 - Same on every device.**
  - The bake is built from occupancy shapes (collision / blockout), never from what a graphics preset renders.
  - It is built on every device, including phones running the light renderer. Gameplay results are identical on phone and PC.
- **L3 - What you see is what counts.**
  - Every renderer reads the same bake.
  - Desktop uses the exact per-lamp path. The phone uses the two-tap lamp light volume (`voxel/lampVolume.ts`) on the plain blockout instead of six unshadowed lights.
  - The phone version must pass the Phone check 3-minute hold at 60 fps.
- **L4 - Real-time shadows only for what the bake cannot know:** flashlights, moving lights and characters (capsule / contact shadows near the camera). Static lamps never need a shadow map.
- **L5 - Parity test.** A test samples a grid of points per map and compares the gameplay level against the rendered band (dark / mid / lit) on the phone light look and on Epic. Any mismatch fails.
  - **Rendered bands have display brightness targets** (2026-10-09). Measured on a matte 50% grey surface facing the light, after tone mapping and grade:

    | Gameplay level | Band | Display brightness |
    | --- | --- | --- |
    | 0.12 | dark | 4% or less |
    | 0.27 | dark | 9% or less |
    | 0.40 | mid | 12-35% |
    | 0.70 | lit | 45% or more |

  - Desktop and phone share the targets.
- **L6 - The meter.**
  - Continuous 0-1, updated at 10 Hz or more, with the existing thresholds (`LIGHT.shadow` 0.28, `LIGHT.lit` 0.6).
  - The HUD shows a continuous bar with the threshold marks.
  - It samples chest and head; crouching lowers the samples.
  - If the meter reads dark, no guard can detect the player faster than the dark rate allows.
- **L7 - Darkness is dark (Michael, 2026-10-09; replaces "readable darkness").** As in Chaos Theory: if a guard cannot see you, you can hardly see yourself.
  - **The dark band renders near-black** (L5 targets). A darkness curve applied in the lighting, before tone mapping, makes it so on every device.
  - **Finding your way in the dark:**
    - **Night vision:** a gain inside the lighting that reveals real detail in the dark and blows out in light, so the player toggles it.
    - **The goggle glow:** the operator's emissive lenses, visual only, never seen by guards (5.14).
    - the light meter and the sound meter
    - faint light from moon, windows and lamp pools where it really reaches
  - **A phone black floor of 0.008** only stops OLED smear; it is not enough to see by.
  - **A brightness calibration screen** ("barely visible" symbol) sets a small, clamped exposure offset per device. Render only; locked in the Confrontation.
- **L8 - Controllable light.** Every lit space offers at least two ways to change the light:
  - switch
  - breakable lamp
  - fuse box / breaker (circuit groups)
  - EMP or disruptor
- **L9 - Guards notice light changes in their view** (existing `lightsOut`). A fuse box trip sends a guard to the box. Investigating guards in darkness take torches (existing).
- **L10 - Co-op.** Light state (on / off / destroyed / disrupted) is host-authoritative and synced. Clients re-mix the volume locally.
- **L11 - Characters and bodies do not occlude gameplay light.** This is deliberate: simple and symmetrical.
- **L12 - Doors (decided by Michael, 2026-10-08):** closed doors block light, on screen and in gameplay.
  - Door leaves are left out of the bake and applied at runtime: gameplay rays against closed doors, and the lamp volume's remix includes closed doors near each lamp.
  - Opening or closing a door updates the lighting like a switch.
- **L14 - The moon is baked (decided by Michael, 2026-10-08).**
  - Its visibility is baked like a lamp's, so outdoor moon shadows match the meter on every device.
  - Real-time moon shadow maps remain only for moving characters on desktop.
- **L13 - Cost.** No per-frame per-lamp loops on phones. Re-mixing on a light change stays a one-off of a few milliseconds (existing remix).

### 5.2 Sound (P2)

- **S1 - Noise events.** Every noise event has a loudness expressed as a radius. Existing sources:
  - footsteps by gear x surface
  - landings, rolls
  - doors quiet / bash
  - glass and lamps breaking
  - body drops
  - shots (suppressed / not)
  - impacts, gadgets, alarms
- **S2 - Ambient noise zones** per map region (`MapLayout.noiseZones`): a box or area, a masking level, and a source label (rain, machinery, generator, vent fan, traffic).
  - A zone can be tied to a switch or fuse group. Turning a generator off removes its masking, and possibly its light.
- **S3 - Masking.** Effective radius = the noise radius reduced by the local masking (formula decided in Phase 2, unit-tested).
  - Wall muffling (existing `MUFFLE`) applies after masking.
  - Guards hear a noise only if they are within the effective radius.
- **S4 - HUD sound meter.** Shows the player's current noise and a marker for the local ambient level. Above the marker means audible.
- **S5 - Whistle.** Fixed radius, masked like any noise. The nearest calm guard investigates the player's position.
- **S6 - Audio.** Ambient beds match the zones so the player can hear the masking. Outdoor rain adds to ambient.
- **S7 - Audio source test (opens Phase 2; Michael, 2026-10-08):**
  - **The test:** build the six sounds that matter most twice, once synthesised in code (WebAudio) and once from free CC0 sound files:
    - footsteps on concrete and metal
    - suppressed and loud pistol shots
    - rain
    - machinery hum
    - heartbeat
    - a guard's radio crackle
  - **Michael picks by ear on his iPhone.** Until then the no-external-audio hard rule stands.
  - **If files win:**
    - The rule changes to "CC0 audio files allowed, bundled, never fetched at runtime".
    - Use a format iOS Safari plays (AAC or MP3).
    - Total audio stays within a size budget set in the test (proposal 8 MB) so the offline app stays light.
    - Each file's source and licence goes in `docs/audio-credits.md`.

### 5.3 Movement, stances, camera and traversal (P4)

**Locked decisions (Michael, 2026-10-08):**

- Stances are standing and crouched only. No prone.
- Camera: CT style, pulled back with the whole body in view, pushing in only to aim.
- No free lean button. Leaning is contextual (aiming past a corner) plus back-to-wall peeks.

**Speed and feel:**

- Keep the 6 gears, the speed rocker, the wheel and D-pad gear controls, and sprint (gear 6 while held). Keep the `NOISE_QUIET` silent bands until Phase 2 recalibrates them against masking.
- Keep the CT instant stop and start and the forward roll.
- **Add (3b):**
  - Quick 180: a stick flick back at gear 3 or above, about 0.25 s, no foot slide.
  - Momentum carry into traversal moves.
- **No move ever fires on its own** (except the landing roll). The player always presses. This is the CT rule, and it keeps co-op predictable.

**Air:** keep the manual jump that grabs what is near, the double-tap split, the soft / roll / heavy landing bands with noise, and drop attacks.

**Traversal (have):**

- ladders, drainpipes
- pipes: hang, shimmy, legs up, upside down
- ledges: shimmy, drop, climb, jump across
- ducts, windows, ziplines, vault / mantle / step
- split and wall jumps, rappel, fences

**Back-to-wall (Phase 3)** replaces `src/cover`:

- A contextual press (or the stick held into a high wall face for a short time) puts the back to the wall. It has standing and crouched versions.
- Moving along the wall uses the current gear speed and is quiet.
- **At an edge:**
  - peek (the camera swings out)
  - lean out to aim and shoot, with rifle or pistol
  - SWAT turn across a doorway gap
  - corner takedown on a guard who walks round the corner
- Pull away to leave.
- No snap from a distance, no glide, no cover-to-cover dash, no blind fire. Low objects are handled by crouching behind them.
- **Enemy cover AI** (cover points from cover faces) stays. Only the player's cover changes.
- **Training mode** is rewritten in Phase 3 to teach the CT verbs.

**Doors:** open quietly, open fast, bash (have); peek through the crack (add, Phase 3).

**Bodies:**

- **Drag (3b):** crouched, about crouched gear 2. Silent on quiet floors, scrapes on loud floors (a noise event). Hands at the collar; the body is pinned at the shoulders and trails.
- **Carry (have):** standing, faster, footsteps one band louder. No climbing, sprint, back-to-wall or traversal while carrying.
- **Both:**
  - put the body down gently (quiet) or drop it (noise)
  - hide spots remove the body
  - switch between drag and carry with the interact hold

**Camera:**

- **Exploring:**
  - The whole body is in frame with a margin.
  - The camera sits higher and further back than the 3.x framing, looking slightly down.
  - The player reads their own lighting on their body (P1).
- **Aiming:** pushes in to over-the-shoulder. Shoulder swap stays.
- **Attached states** (hang, pipes, split, rappel, ladder) get wider framing presets.
- **Collision solver (3b):**
  - Pulls in smoothly near walls and ceilings with a capped rate, so it never pops.
  - Fades geometry that blocks the view of the operator.
  - Holds a usable view in 1.2 m split corridors and ducts.
  - Test: sampled positions on every map; the camera is never inside geometry and never moves more than a set distance per frame.
- **Corner peeking** with the camera is allowed, as in CT. Guards detect the body, never the camera.
- **Fairness:** camera distance is the same on every device. FOV follows the existing Hor+ rules.

**Metrics freeze (end of Phase 3b):**

- These numbers are written into `docs/level-design.md` Section 12 and pinned by a unit test:
  - gear speeds
  - grab reach
  - mantle, step and vault heights
  - wall jump band
  - split widths and heights
  - pipe heights for upside-down takedowns
  - boost and human ladder reach
  - rappel and fence limits
  - landing bands
  - the run / sprint braking stop time and distance
  - camera distances
- After the freeze, changing any of them needs Michael's approval and a review of every map built on it.

### 5.4 Takedowns, grabs, interrogation

- **Contextual takedowns plus one melee strike** (Michael, 2026-10-09; replaces "contextual takedowns only").
- **The elbow strike, as in Chaos Theory:** the fire button while the weapon is holstered.
  - **Reach and speed:** about 1.2 m; about 0.5 s from press to hit, a committed move.
  - **On an unaware guard** (from any side), or one taken from behind or the side: knocked out, the same result as a non-lethal takedown.
  - **On an aware guard facing you:**
    - staggered for about 1 s, his aim broken
    - a second strike within the stagger knocks him out
  - **Heavies:** a frontal strike only staggers them, never a knock-out.
  - **Noise:** a small noise event (about 4 m).
  - **A miss** leaves you exposed for its recovery (about 0.4 s).
  - **Co-op:** approved by the host, like takedowns.
  - Contextual takedowns (action button) stay for the full set of positions and the lethal / non-lethal choice.
- **Quick, CT style:** about 1-1.5 s from press to victim down, every kind. That keeps exposure short and co-op sync simple.
- **Keep** every existing takedown kind. Tap = knock out, hold = lethal.
- **Offered from every state:**
  - standing, crouched
  - back-to-wall corner (Phase 3)
  - split (drop), pipes (inverted, pull-down), ledge (pull-down)
  - window, from above, over a low obstacle, through a doorway
- **Grab** (have) becomes the hub:
  - drag or carry (Section 5.3)
  - human shield
  - interrogate (Phase 6)
  - use on a scanner (Phase 6)
  - knock out or kill
- **Interrogation:** 1-3 subtitled lines per guard type, data-driven per mission. It can reveal an opportunity objective, a code or a patrol. The intel goes into the field terminal (Section 5.10).
- **Mark & Execute** is removed in Phase 3: `game/marks.ts`, `game/executeController.ts`, the HUD chevrons, the Execute charge, and training steps and e2e checks for it. The save keeps no data for it beyond what the migration requires.

### 5.5 Gadgets and vision

- **Vision modes** cycle: off, night, thermal, electro. Night vision is a gain in the lighting (L7), so it reveals real detail and blows out near lamps.
  - Thermal and electro are post passes on `CinematicPost` (or the phone grade pass).
  - The phone cost must pass the Phone check.
  - Vision modes never change detection.
- **Gadget wheel** stays. Time-slow while the wheel is open stays solo-only (existing).
- **Campaign kit** is limited per mission by the loadout kit (Section 5.6). No credits.

### 5.6 Weapons, gunplay and loadout

**Locked decisions (Michael, 2026-10-08):**

- A small choice per class, 3-4 guns each.
- **Holstered unless aiming** (Michael, 2026-10-09):
  - The weapon comes out only while aiming and is put away as soon as aiming stops, in every state, alert and combat included.
  - **No hip fire.** The fire button is the elbow strike while the weapon is holstered (5.4).

**Slots:** one primary and one sidearm, plus gadgets.

**Arsenal** (curated in data from the existing weapon system; all suppressible where it makes sense):

| Slot | Choice |
| --- | --- |
| Primary | Suppressed rifle (default), suppressed SMG, shotgun (close, loud), marksman rifle (zoom, hold breath) |
| Sidearm | Suppressed pistol (default, carries the light disruptor), heavy pistol (louder, stops armour), non-lethal dart sidearm |

- Original names only. Rename the real-brand guns (P90, Vector, Five-seven, Tavor, AK and similar) in data and UI. The rest of the 16 stay in code, unused by the campaign.
- **Multi-tool launcher (Phase 6):** an underbarrel on every primary that fires the sticky shocker, ring airfoil, sticky cam and gas rounds, as in CT's multi-tool.

**Gunplay:**

- **Aiming is the only way to shoot.**
  - **Hold aim:** the weapon is drawn (about 0.3 s for a pistol, 0.4 s for a primary, per the realism standard 5.12), then raised over the shoulder.
  - **Fire** shoots only while aiming.
  - **Release aim:** the weapon is put away (about 0.4 s); the hands are free again.
  - Crouched and still is steadiest. Speed gear and motion widen spread.
- **Holstered look:** the primary slung on the back, the pistol in its holster. The silhouette stays clean, as in Chaos Theory.
- **Co-op:** the drawn / holstered state is in `MoveState`, so partners see it.
- **Marksman zoom** has sway and hold breath. Breath is limited and recovers.
- **Noise:** every shot is a noise event (Phase 2). Suppressed shots are quiet, not silent. Impacts are heard nearby.
- **Lights:** every shot can kill a lamp (P1). The gun is also a light tool.
- **Damage:** one headshot downs an unarmoured guard. Helmets appear with alarm levels (Section 5.7). Heavies keep their plates.
- **Attached aiming:** aiming from attached states stays (split, pipes, rappel, ledge, human ladder top).
- **Aim assist:** stays light and touch-only (existing).

**Loadout kits per mission:** Stealth, Assault and Recommended, chosen at the briefing. Attachments are selectable freely. Nothing is bought.

**Phases:**

- Phase 3: arsenal curation and renaming; holster and draw; no hip fire; the elbow strike; ADS spread tuning.
- Phase 6: the launcher and its rounds.

### 5.7 AI (P5)

- **Keep:**
  - perception (sight x light x stance x motion x exposure)
  - `AlertMachine`
  - radio windows, shared LKP, search
  - torches, bodies, alarms, doors
  - archetypes (guard, runner, heavy, sniper, enforcer, dog, officer)
  - barks (shown as text)
  - difficulty tiers
- **Mission alarm level 0-3.**
  - Each raised alarm adds one level.
  - Level 1: guards draw torches in the dark.
  - Level 2: more guards wear helmets and armour, patrols tighten.
  - Level 3: reinforcements.
  - A mission rule can fail the mission at a set level.
- **Environmental change** puts guards on alert:
  - lights changed in view (have)
  - a door left open that was closed (add)
  - a missing patrol partner, via radio check (have)
  - bodies (have)
  - broken glass heard (have)
- **Sensors (Phase 6):**
  - security cameras (sweep cone, light-dependent like guards, raise an alarm, can be shot, jammed or disrupted, visible in electro vision)
  - laser trip beams
  - optional turrets
- **No randomness that defeats planning.** Patrol cycles are fixed per map (level design rule 6).
- **Per-stop facing (Phase 6):** a guard's patrol stop can set the direction he faces while waiting (`SquadSlot`). Today a stopped guard always faces his next leg, which forces layout compromises (Exchange self-critique, item 2).
- **Awareness arcs** stay for readability (decided 2026-10-08):
  - on by default at Rookie and Normal
  - off by default at Realistic and Perfectionist
  - a setting toggles them at any difficulty
- **Civilians (Phase 6; decided 2026-10-08):** unarmed non-combatants, such as contracted night watchmen, cleaners and night-shift technicians.
  - They follow the same perception rules as guards.
  - When they see the player they flee to the nearest guard or alarm and raise it. They never fight.
  - They can be grabbed, interrogated, and knocked out (a rating penalty).
  - Killing a civilian fails the mission.
  - A distinct look and body language make them readable at a glance.
  - The Kestrel Exchange's contracted watchman (G1) becomes the first civilian.
- **Drone operator** is parked: kept in code, not placed in campaign maps.

### 5.8 Missions and campaign

**A mission is data:**

- map
- spaces (the spine from `docs/level-design.md`)
- insertions
- objectives
- rules
- triggers
- radio script
- checkpoints
- loadout kits
- co-op extras

It is validated by a schema with a unit test (extend `validateMissions`).

**Objectives:**

- Primary (required).
- Secondary (optional, rated).
- Opportunity (revealed mid-mission by intel, interrogation or radio; optional, rated).
- Types:
  - existing: terminal / download, plant, intel, rescue / VIP escort, sabotage, extract
  - added: interrogate a named target, eavesdrop (stay within range of a conversation for N seconds, unseen)

**Rules:** `noAlarms`, `noKills`, `noBodiesFound`, `maxAlarmLevel`. Each rule is either bonus or fail.

**Triggers and actions.**

- Triggers:
  - enter area
  - objective state
  - alert level
  - alarm level
  - interrogation
  - item taken
  - light group state
- Actions:
  - radio line
  - add / complete / fail objective
  - enable / disable a squad
  - lock / unlock door
  - set light group
  - spawn reinforcements
  - checkpoint
  - end mission
- No timers in stealth sections (level design rule 8).

**No quicksave on any platform** (decided 2026-10-08). Checkpoints only, the same on phone and desktop, solo and co-op. The pause menu offers "Restart from checkpoint".

**Checkpoints.**

- One before each space.
- Autosave to IndexedDB with the full mission state:
  - objectives
  - alarm level
  - every guard's state (alive / knocked out / dead, position, alert)
  - bodies and where they lie
  - doors, lights
  - pickups taken
  - player health and kit
- The main menu shows Continue.
- Backgrounding the app autosaves and pauses (existing pause behaviour).

**Radio.**

- Text lines with a speaker label and colour (no portraits, no voice).
- Shown as subtitles, queued with priority, never blocking input.
- Logged in the field terminal.

**Briefing:** text, a top-down map with annotations, and the kit choice.

**Results.**

- A stealth rating of 0-100% built from: alarms, detections, bodies found, kills, knock-outs, secondary and opportunity objectives.
- Each category is shown.
- This replaces the Ghost / Panther / Assault bars.

**Story and setting:** `docs/story.md`.

- The handler is LANTERN (Peg Ashdown).
- The radio uses solo and team variants of every line (story Section 7).
- Mission 6 has no handler radio.

- No real-world Splinter Cell names.

**Campaign progress (Michael, 2026-10-08):** fully shared in co-op.

- **Solo:** the campaign unlocks in order.
- **Co-op:**
  - The lobby lists every mission. Anyone can host or join any mission.
  - Finishing a mission records it, with its rating, for every player in the session.
- **Spoiler warning:** choosing a mission beyond your own solo progress shows a one-line warning ("Story spoilers ahead"). Mission 8 adds "contains the finale's twist".
- **Save design (Phase 4):** per player, per mission: completed, best rating, intel found, endings seen.

**Default mission length:** 20-35 minutes, with a checkpoint about every 4-6 minutes (one before each space). That suits phone sessions and phone heat.

**Difficulty:** one per session, chosen by the host. Player count never changes it (C7).

**Vertical slice:** Kestrel Exchange, a 1934 telephone exchange now used by a data broker. Its mission is "Dead Line": 8 spaces and 9 guards.

- Design documents:
  - `docs/prompts/exchange-design.md` (Part 1 building, Part 2 gameplay)
  - `docs/prompts/exchange-plans/` (floor plans and gameplay overlays)
  - `docs/prompts/exchange-map.md` (spec)
  - `docs/prompts/exchange-map-progress.md` (log)
- Map phases 0-2 (paper) are done.
- **Phase 2 approved by Michael on 2026-10-08, all decisions (D10-D27) final.**
  - If a later roadmap phase changes a number a decision relies on, the alignment pass flags it for Michael rather than changing it silently.
- **Space 8's secret route** (over the neighbour's roof) gets a security camera covering the lane and the fire escape (Phase 6 sensors). The player must jam it, disrupt it or time its sweep. The sniper keeps covering the loaders.
- The map's build phases (3-6) are held until roadmap Phase 3b is done and the design has passed the alignment pass in `docs/prompts/exchange-alignment.md` (Section 10, Phase 7).

### 5.9 Co-op (P6)

- **C1** - 1-4 players, same missions, same maps. Solo is always fully completable (level design rule 14).
- **C2** - The host is authoritative (existing). There is no host migration. If the host leaves, the session ends; the host can later resume from their checkpoint and re-invite. Clients keep no mission save.
- **C3** - Team moves are pairs, even with 3-4 players: boost, human ladder, split-jump boost, back-to-back, pull-up, rappel anchor, dual takedown.
- **C4** - Each space has at least one route that needs a team move, on top of the solo routes.
- **C5 - Detection.**
  - Guards see each player separately; `PlayerRef.spotted` is per player (existing).
  - Radio calls and alarms affect everyone.
  - Whether the LKP becomes per player is decided in Phase 5.
- **C6** - A downed player can be revived (existing). All players down reloads the checkpoint.
- **C7 - Scaling.**
  - Guard count and guard behaviour never change with player count.
  - A space may define `coopExtras` (extra cameras, lasers, a locked shortcut) that switch on at 3+ players.
  - Rating thresholds are the same.
- **C8** - Communication is by pings (existing). No voice chat.
- **C9** - The e2e suite runs co-op with 2 and 4 local players (`?net=local`).
- **C10 - Operators:** each player is a distinct operator (Section 5.14). Team-mates see each other with a soft outline; guards never do.
- **C11 - Movement sync rules (every new move must meet them):**
  - Every movement state has a networked `MoveState` mode, and remotes pose from it (existing pattern), never from position alone.
  - Takedowns and team moves are approved by the host with a shared start time. Both machines play them from that start, and the host decides interruptions.
  - The host decides who holds a body (drag or carry), and the body's position is synced.
  - `e2e-netmove` checks the remote pose error for every state, and each new state adds its case.
  - The camera is local only and never sent.

**Co-op engagement systems (decided 2026-10-08; the heart of co-op):**

- **C12 - Sync.**
  - Any player marks a target (guard, lamp, door, breaker) and starts a sync.
  - Every screen shows a 3-2-1 countdown, and each player acts manually on zero. Nothing is automatic.
  - **Reward:** guards downed within the same second miss each other's radio checks, so nobody raises the alarm.
  - Sync works for any team size from 2 up.
- **C13 - Clutch saves.**
  - Team-mates see when a guard is detecting a partner: a team-only marker on that guard while his meter fills.
  - Taking the spotter down before his radio window ends erases the sighting (existing radio window rule).
  - Saves are counted in the results.
- **C14 - Downed partners.**
  - A downed player can be dragged into shadow (body drag rules) before the revive.
  - A medkit can be used on a team-mate.
- **C15 - Split-and-converge spaces.** Some spaces split the team onto parallel routes to two objectives that must both be done; solo does them in sequence (level design, Section 7).
- **C16 - Light control as teamwork.** Spaces are designed so one player can change the light (breaker, switch, shot) while another moves. Solo can do both, with more risk.
- **C17 - Pings and quick lines.**
  - Typed pings: Go, Hold, Target, Light, Here, Danger, Sync.
  - Each ping shows a short in-character text line from the pinging operator.
- **C19 - Connection reliability (Michael, 2026-10-08):** test with friends first, decide then.
  - Phase 5 adds a connection test on the co-op screen: did peers connect, round-trip time, whether a direct path failed.
  - Network stats go into feedback notes.
  - After real sessions with friends on their home and mobile networks, Michael decides whether to add a free-tier relay (TURN) server.
  - Until then, direct connections only (existing).
- **C20 - Built for solo testing.** Michael playtests mostly alone, so every co-op feature must be testable without other people:
  - **Dev bot partner** (debug flag, not a shipped feature): a second client in the same session, controlled by a simple AI. It:
    - follows the player
    - braces and boosts on request
    - performs the other half of every team move and Sync
    - revives and gets downed on demand
    - carries bodies
  - **Built in Phase 3b**, before the audit's co-op batch, and extended in Phase 5 and for the Confrontation, where it reuses the AI traitor.
  - Every co-op feature is designed and tuned at 2 players. 3-4 players are covered by `?net=local` e2e with bots, plus rare real sessions.
  - **Real playtest nights** (Michael plus friends) at three milestones only: end of Phase 5, the Confrontation prototype, before Mission 8 ships. Each has a written checklist.
- **C18 - Team results.**
  - Team stealth rating plus each player's stats.
  - A highlights panel: sync takedowns, clutch saves, revives, team moves.

### 5.10 HUD and UI

- **In play:**
  - health bar (no regen; shown when not full)
  - light meter (continuous)
  - sound meter
  - stance and gear pips
  - ammo (fades)
  - selected gadget
  - contextual world prompts
  - awareness arcs (default per difficulty, 5.7)
  - co-op: team-mate markers, the clutch-save marker, the sync countdown, the ping wheel
  - radio subtitles
  - objective text on change only
- **No minimap and no world waypoints in the campaign.** The minimap is parked.
- **Field terminal** (pause menu): objectives, radio log, map with known intel, interrogation notes.
- **Touch targets** are 56 px or larger. Never add a button where a contextual prompt will do.

### 5.11 Saves

- IndexedDB only.
- Any change to the save's shape bumps `SAVE_VERSION` (7 on `dev` at the time of writing), with a migration and a unit test using a literal old save.
- Parked data (credits, unlocks, cosmetics) stays in the save untouched.

### 5.12 Animation

**Locked decisions (Michael, 2026-10-08):**

- All animation is generated in code (clips as curves, IK, `FootPlanner`, `AnimGraph`, `Inertializer`). No animation files and no motion capture. This keeps the no-external-art rule.
- **Every animation must look realistic and believable.** No instant or unrealistic motion, minimal clipping, no awkward poses.
- **The CT instant stop stays** where gameplay needs it. The rules below reconcile the two.

**Priorities, in order:**

1. **Readability:** the player's stance, gear and state, and every guard's alert state, read at a glance on a phone.
2. **Believability:** weight, timing, balance and contact look like a real trained person.
3. **Polish.**

#### 5.12.1 The core rule: instant control, continuous body

Control response is instant; the body never is.

- **Gameplay** may react within one fixed step: the capsule stops, a move commits, a prompt fires. This keeps the CT feel and precise shadow play.
- **The pose** always moves continuously:
  - no joint pops, no teleports, no gliding
  - every change of state is shown by a short, physically plausible motion (a planted foot, a weight shift, a push-off) that plays out after the input without delaying it
- **Root and capsule must agree.** The visible body never slides over the floor to catch up with the capsule; the feet plant and the body moves over them.

**Where instant applies:**

- **Instant stop:**
  - **Gears 1-4** (all crouched speeds and the standing walk speeds, the stealth range): the capsule stops at once. The pose plants the lead foot, shifts the weight back and settles within 0.12-0.2 s with no foot slide.
  - **Gears 5-6** (run, sprint), locked by Michael 2026-10-08: a short braking stop.
    - 0.3 s or less and 0.6 m or less of travel, with a braking step.
    - The same time and distance every time, so players can plan around it.
    - It is a committed move: stick input during the stop does not cancel it.
    - It works the same for remotes.
- **Instant start:** the capsule reaches speed fast (existing `CT.startTime`). The pose shows a push-off from the planted foot. Never a glide.
- **Fast turns:** facing may change at the CT rate. Any change faster than 360 deg/s is shown as a plant-and-pivot step, never a spin on the spot with sliding feet. The quick 180 (Section 5.3) has its own pivot clip.
- **Committed moves** (mantle, vault, takedown, roll, split jump, wall jump) start on the press. Their own motion has realistic anticipation (a dip, a reach) inside the move's duration.

#### 5.12.2 Realism standard

These apply to every clip, the player and guards, local and remote. They are measured by the audit harness (5.12.4).

The numbers are starting limits. The Phase 3b audit confirms or refines them, and the final values go in a config table with unit tests.

**1. Continuity:**

- No joint rotates more than 25 deg between two 60 Hz frames (scaled by the frame time at other rates), except hit reactions and impacts.
- The pelvis moves no more than speed x dt + 2 cm per frame.
- No teleports except spawn, respawn and checkpoint load.
- Every transition and interruption blends through the `Inertializer` in 0.1-0.25 s.

**2. Contact:**

- Planted feet slide under 1 cm. Feet never float more than 2 cm above or sink more than 1 cm into the floor while planted.
- Hands on rungs, pipes, lips, ropes, walls and bodies under 1 cm. Weapon grip hands under 2 cm (existing bars).

**3. Clipping:**

- Body points 3 cm or less into the world (existing `e2e-clip`). Weapon 2 cm or less (existing).
- **New:** self-intersection (arms or weapon through own torso, legs through each other) 2 cm or less.
- **New:** character against character (takedowns, grabs, drag, carry, team moves) 3 cm or less.

**4. Range of motion:** a per-joint human limits table, checked every frame. Starting values:

- knee and elbow: 0-150 deg, no hyperextension beyond 5 deg
- wrist: 70 deg flexion / extension, 25 deg sideways
- neck: 80 deg twist
- spine: 60 deg total twist, shared across its segments
- shoulders: within anatomical cones

**5. Balance:** on the ground, the centre of mass stays over the support area (with a 10 cm margin), except in deliberately dynamic moments: starts, stops, jumps, rolls, falls, pushes.

**6. Timing:** no action is faster than a trained person could do it. Starting minimums:

| Action | Minimum |
| --- | --- |
| Stand to crouch | 0.25 s |
| Crouch to stand | 0.3 s |
| Quick 180 | 0.25 s |
| 1 m mantle | 0.6 s |
| Vault | 0.5 s |
| Ladder rung | 0.3 s |
| Weapon raise | 0.2 s |
| Weapon swap | 0.6 s |
| Grab a body | 0.5 s |
| Lift to carry | 1.0 s |
| Takedown | 1.0-1.5 s (5.4) |

Reloads per weapon are based on real handling.

**7. Weight and follow-through:**

- Anticipation before jumps and kicks; compression on landings.
- Overlapping motion of arms, head, kit and weapon through the shared spring layer.
- The head leads turns, and the spine shares the twist.
- Eyes and head look at the aim point, the next grip, or a threat.

**8. Variation:**

- No robotic mirroring and no identical loops side by side.
- Idles breathe and shift weight.
- Guards get small per-guard timing variation.
- Operators get small gait differences within the fairness rules (5.14).

**9. Interruption:** every state has a blended exit for hit, alert, partner left and anchor gone. Nothing snaps back to idle.

**10. Frame rate:** the same poses at 60, 120, 144 and 240 Hz (existing `e2e-anim` parity).

**11. Network:**

- Remote poses obey the same continuity limits; interpolation never pops.
- Paired moves (takedowns, team moves, grabs) align within 3 cm at contact on host and client.

**Shared spring layer (3b):** secondary motion lives in one layer every clip inherits:

- kit and weapon sway
- breathing
- weight shift on stops and landings
- head look

**Guard body language (P5):** each state is a distinct posture, readable at 15 m on a phone at default brightness:

- relaxed patrol
- suspicious (slows, head turns)
- investigating (weapon at low ready, torch in the dark)
- alert (weapon up, moving low)
- searching (sweeps)
- radio call, alarm run
- blinded, gassed, knocked out
- ragdoll hand-offs, blended from the last pose with no snap

**Coverage:**

- Every state in Section 4 has enter, loop and exit clips, plus an interrupted exit.
- Dedicated clips replace today's stand-ins:
  - Phase 3b: rappel, fence, brace, back-to-wall set, drag, quick 180
  - Phase 5: team moves
  - Phase 6: verbs (lockpick, hack, optic cable, interrogation, knife)
- **Any new clip from Phase 3 onwards must pass this standard before it is committed.**

#### 5.12.3 Tools

- **Pose viewer (3b):** a debug screen on phone and desktop.
  - Pick any clip, state or transition and any operator or guard.
  - Scrub, slow down to 0.1x, loop, orbit the camera.
  - Toggle overlays: joint limits, contact points, centre of mass and support area, clipping points.
- **Contact sheets:** `scripts/anim-sheet.mjs`, side, front, back and over-the-shoulder views.
- **Feedback tool:** Michael tags in-game feedback notes and photos `anim` (existing feedback screen and photo mode). Every tagged note becomes an audit item.

#### 5.12.4 The animation audit (first part of Phase 3b)

A full review of every existing animation and movement before the metrics freeze.

**1. Inventory.** Write `docs/animation-audit.md`: one row per clip, state and transition. Columns:

- ID, owner (player / guard / both)
- trigger, duration, contacts
- interrupt paths, networked mode
- status: pass / fix / rework / remove

Sources:

- `AnimGraph`, `anim/clips/*`, `AttachMachine` kinds
- takedown kinds, grab / carry / drag
- team moves
- weapon actions (aim, reload, swap, throw)
- guard states, ragdoll hand-offs
- remote replays

Cover clips are removed in Phase 3 and are not audited.

**2. Audit harness.** `scripts/anim-audit.mjs` drives every state and transition headlessly (`stepHeadless`) at 60 and 120 Hz, standing and crouched, on flat floor, stairs and slopes, and from every entry direction. It records against 5.12.2:

- joint velocity peaks, pelvis jumps
- foot and hand slide, floating and sinking
- world, self and character clipping
- range-of-motion violations
- balance outside support
- action durations against the minimums

It writes a fail list with frame numbers and contact sheets of every failing moment. It builds on `e2e-anim` and `e2e-clip` rather than duplicating them.

**3. Review.**

- Opus scores each row against the standard, using the harness output and the contact sheets.
- Michael reviews on his phone with the pose viewer and the feedback tool.
- Anything that looks wrong to Michael fails, even if the numbers pass.

**4. Fix in batches, ordered by how often the player sees them:**

1. **Locomotion:** idle, gears, starts, stops, turns, quick 180, stance changes, slopes and stairs.
2. **Weapon handling:** aim, hip, reload, swap, throw, aim from attached states.
3. **Common traversal:** mantle, vault, step, drop, ladder, drainpipe, ledge, window, landing bands, roll.
4. **Stealth contact:** back-to-wall set, takedowns of every kind, grab, human shield, drag, carry, put down, hide.
5. **Guards:** patrol, investigate, alert movement, search, radio, alarm, reactions, knock-outs, deaths, ragdoll hand-offs.
6. **Rare traversal:** pipes (all sub-states), split, wall jump, rappel, fence, zipline, duct, vent drop.
7. **Co-op:** boost, human ladder, dual takedown, and remote replays of everything.

Each batch:

- Sonnet implements the fixes to an Opus batch spec.
- The harness re-runs on everything, and no earlier batch may regress.
- Michael signs off on his phone.

**5. Lock.**

- The harness joins the required e2e suite. Every future animation must pass it.
- The final limits table goes in config with unit tests.
- The audit document records each row's final status.

**Budgets:**

- 0.04 ms or less animation per character (existing).
- Realism layers (springs, look-at, balance correction) count inside that budget.
- The phone Phone check must still hold 60 fps.

### 5.13 Health and damage

**Locked decisions (Michael, 2026-10-08):** CT model. A health bar, no regeneration, medkits.

- **Phase 3** removes the regenerating shield (`game/health.ts`).

**Numbers (decided 2026-10-08; tuned only by playtest with Michael's approval):**

| Item | Value |
| --- | --- |
| Health | 100 |
| Medkit | Heals 40. Takes 1.5 s, interrupted by damage. 2.0 s on a team-mate. |
| Carried medkits | 2 (3 at Rookie) |
| Wall medkits | About one every second space, placed by each map's design |
| Checkpoint | Saves current health. Reloading after death or failure restores at least 50%, so there are no death spirals. |
| Revive | Restores 35%. No bleed-out (existing rule). |

**Damage taken scales with difficulty.** Guard rifle hits to down the player from full health:

| Difficulty | Hits |
| --- | --- |
| Rookie | about 8 |
| Normal | about 6 |
| Realistic | 4 |
| Perfectionist | 3 |

- Other weapons scale from the rifle.
- Headshots on the player do double damage.

### 5.14 Operators

**Locked decision (Michael, 2026-10-08):** a distinct operator per player, 2-4 characters.

- **Code-built,** like every character. They differ in head, headgear, kit, goggle shape and goggle light colour.
  - Each is identifiable at 20 m in the dark by silhouette and goggle colour.
  - Original goggle design: not the series' three-lens look.
- **Fairness:** identical skeleton, capsule, speeds, hit volumes and light sample heights. Visible build differences stay within a few percent.
- **The goggle glow arrives early** (Phase 1 Step 4b, green for every operator until Phase 5): emissive lenses, visual only, never a light, never seen by guards. It is how a player finds their operator in darkness (L7).
- **Choosing:** solo, the player picks one. In co-op each player picks a different one; the host resolves duplicates.
- **Cosmetics:** they replace appearance editing in the campaign. Cosmetics stay parked.
- **The four operators** (story Section 4):

| Callsign | Role | Goggle light |
| --- | --- | --- |
| Wren | Lead | Green |
| Moth | Climber | Amber |
| Tally | Signals | Cyan |
| Sexton | Surveillance | Violet |

  Roles are personality and story only, never stats.
- **Built in Phase 5.**

---

### 5.15 Mission 8: the Confrontation (the traitor finale)

**Locked decisions (Michael, 2026-10-08):**

- The finale reveals that a team-mate was the traitor all along, and turns the players against each other.
- The protagonist loses their gun and must stay hidden from a traitor hunting with a loud pistol, while trying to get close enough for a takedown.
- Neither side may be able to win straight away.
- The traitor is chosen at random and hidden until the reveal.
- In co-op it is always versus. There is no opt-out.
- With 4 players it is 2v2.

**This is the defining moment of the game.** Build it to be tense, fair and readable.

#### Who is the traitor

| Party | Traitors | Who |
| --- | --- | --- |
| Solo | 1 AI traitor vs the player | An operator the player did not pick |
| 2 players | 1v1 | One of them |
| 3 players | 1 traitor vs 2 protagonists | One of them (Michael's 2v2 choice needs four, so this is the default for three) |
| 4 players | 2v2 | Two of them |

**How the choice works:**

- The host picks at random when Mission 8 loads (seeded, stored hidden, never sent to clients before the reveal).
- Nobody, the host included, can see it until the reveal.

**The story fits whoever it is:** each operator has a dossier secret that doubles as a motive (story Section 4). Intel in Missions 2-7 hints at all four equally.

#### Act structure

1. **Act 1 (co-op):** restore the grid together under fire (story Mission 8).
2. **The betrayal** (scripted, about 10 s, input locked):
   - At the final breaker, the traitor disarms the protagonist and kicks the gun into the turbine pit. The gun is gone for good.
   - The protagonist is shoved through a railing to the lower level (a landing roll).
   - The traitor kills the lights.
   - It needs dedicated code-built clips (5.12) and text radio.
   - A checkpoint is saved at the start of Act 2.
3. **Act 2, the hunt:** about 8-10 minutes, in a dedicated arena with no guards.

#### Roles and tools

**Protagonists:**

- No gun, no gadgets. Full health (100).
- Keep goggles. **Night vision makes the lens glow**, visible to traitors within about 10 m.
- Third-person camera (corner peeking allowed).
- Thrown objects found in the arena: about 12 in 1v1, more with more players.
- One medkit and one sticky shocker hidden in the arena. The shocker is a single 3 s stun: the comeback tool.

**Traitors:**

- A loud, unsuppressed pistol: 7 rounds plus 2 spare magazines (3 in the 3-player version).
- A pistol torch that can be switched on or off:
  - on: sees further, but the beam and position show; it casts real shadows (L4), so protagonists' shadows move on the walls before they do
  - off: hunts quietly with poor vision
- **First person:** tunnel vision, no corner peeking, like the hunter side of Chaos Theory's Spies vs Mercs.
- Two flares.
- Full health; downed only by a takedown.

#### Rules that stop either side winning straight away

1. **Separated start.**
   - The protagonist lands in the dark lower level, at least 25 m from the traitor.
   - The traitor has no direct way down; the route takes about 25 s.
2. **Both sides must move.**
   - **Traitors:** finish the override at consoles in lit glass booths. Working them is interruptible, loud and exposing.
   - **Protagonists:** restore breakers spread across the arena. **Every breaker restored turns on lights** in its section, which helps the traitors find them (the story's "turn the lights back on" becomes the danger).
   - Neither side can camp.
3. **Takedowns on a traitor:**
   - Only from outside his front cone (about 120 deg), from above or below (gantries, pipes, grates), or while he is staggered (a hit by a thrown object, the shocker, a steam valve).
   - A frontal attempt shoves both apart. Nobody wins it.
   - **The elbow strike in the Confrontation:**
     - From outside the traitor's front cone it knocks him out, like a takedown.
     - From the front it is a shove: both pushed apart, a 0.6 s stagger that does **not** open a takedown window.
     - A second frontal strike is not a knock-out here.
4. **Pistol limits:**
   - Every shot is heard across the arena, and the muzzle flash lights the shooter.
   - The traitor's pistol is always drawn (first person, Act 2 only). The first shot after moving fast is inaccurate.
   - Reloading takes 2.2 s and is loud: a takedown window.
   - 3 body hits or 2 head hits down a protagonist.
5. **Information pulses every ~45 s:**
   - LANTERN tells each protagonist which room a traitor is in.
   - The Client tells each traitor which sector a protagonist is in: coarser than LANTERN's.
   - This breaks stalemates without giving positions away.
6. **Escalation:**
   - At about 3 and 6 minutes, fire doors seal sections and the arena shrinks.
   - At about 8 minutes, sudden death: everyone sees everyone's position.
7. **No bleed-out** (existing rule).
   - A downed protagonist can be dragged and revived by a partner.
   - Traitors win only when every protagonist is down at the same time.
   - A traitor taken down is out.

#### Scaling

| Party | Override consoles | Breakers | Notes |
| --- | --- | --- | --- |
| 1v1 (and solo) | 3 x 20 s | 3 x 8 s | One takedown ends it. |
| 1 vs 2 | 3 x 20 s | 3 x 8 s | The first takedown on the traitor is broken free: he drops a magazine and is staggered 2 s. The second ends it, unless it is a Sync takedown (C12), which ends it at once. |
| 2v2 | 4 x 25 s (two can work at once) | 4 x 8 s | A Sync takedown dropping both traitors in the same second ends it at once: the biggest highlight in the game. |

All numbers are starting values, tuned in the prototype.

#### Win conditions and endings

**Protagonists win** by taking down every traitor, or by restoring every breaker. This gives the **"Lights On" ending**.

- The final takedown's choice (tap = knock out, hold = kill) picks the traitor's last line and the epilogue variant.

**Traitors win** by completing the override, or by having every protagonist down at once. This gives the **"Sundown" ending**: the city goes dark.

Either way the campaign completes. Both endings are recorded, which rewards a replay.

#### Arena requirements (map design)

- **Layout:** two main levels joined by at least 3 vertical links. Loops everywhere, no dead ends.
- **Grates** over cable trenches: you can watch a traitor's feet pass above you, and take him down from below. A callback to Mission 1.
- **Light and sound:**
  - several light circuits
  - turbine machinery that masks noise (5.2)
  - storm skylights: thunder rumbles 2 s before lightning lights the whole hall; predictable, never random
- **Escalation and objectives:**
  - fire doors for the escalation stages
  - glass booths for the consoles
  - breakers far apart
- **Never:** a single sightline over more than about 30 m of open floor.

#### Tension features

- **Heartbeat** audio for a protagonist when a traitor is within 8 m with line of sight.
- **Phone haptics** on near misses.
- **Taunts:**
  - Traitors can send in-character taunt lines (dossier-based) through the ping wheel.
  - Protagonists get defiant replies.
  - Taunts never carry position.
- **Pure fight:** no guards, no music stingers that give positions away.

#### Fairness

- **Locked look:**
  - Brightness, gamma and FOV settings are locked in Act 2.
  - The look is identical on phone and desktop.
  - Phase 1's light parity is a hard requirement for this mission.
- **Network:** hits are validated by the host (existing PvP code in `src/net`). The traitor choice is never sent early.
- **Disconnects:**
  - A traitor who drops is replaced by the AI traitor so the match can finish.
  - If every protagonist drops, the traitors win.
  - The host leaving ends the session (C2); resume from the Act 2 checkpoint.

#### AI traitor (solo, and disconnect fallback)

- Built on the guard AI. It hunts by noise and light, uses the torch and flares, and works the consoles.
- Same rules and limits as a human traitor.
- Difficulty tiers scale its accuracy and hearing.

#### Build order

- **Prototype first:** a greybox arena, 1v1 only, after the vertical slice (roadmap Section 10), tuned with Michael on phone and desktop before the real arena is built.
- **New systems it needs:**
  - first-person camera and arms view for traitors
  - hidden role assignment
  - versus rules inside a co-op session
  - the AI traitor
  - lens glow
  - heartbeat
  - thrown objects (Phase 6)
- **After the campaign:** a standalone **Confrontation** mode (roles chosen or swapped, any arena) becomes the on-brand replacement for the parked PvP modes.

### 5.16 Desktop visual target

**Goal (Michael, 2026-10-09):** the desktop version surpasses Splinter Cell: Chaos Theory visually.

- The phone keeps "one palette, two fidelities" (Section 8).
- Visual work never changes gameplay (hard rule).

**Where to win:** lighting and atmosphere, where modern real-time rendering beats 2005 by far. CT's strengths were hand-made characters and textures, which are hard to match from code.

**CC0 textures (decided by Michael, 2026-10-09):**

- Free CC0 texture files are allowed for desktop surface detail: brick, concrete, rust, tiles, fabric and gear.
- **Rules:**
  - Bundled with the game, never fetched from third parties at runtime.
  - Downloaded only by desktop builds and presets that use them. Phones never download them.
  - Cached for offline play after the first desktop load.
  - A size budget is set in Phase 6b (proposal: 60 MB of compressed textures for the whole campaign).
  - Every file's source and licence goes in `docs/art-credits.md`.
- Geometry, characters and animation stay code-built (5.12).

**Pillars of the look:**

1. **Lighting:**
   - soft shadows shaped by the lamp fixture (the baked lamps)
   - one-bounce light
   - visible light cones in fog and rain
   - flickering and failing lamps
   - flashlight beams in haze
2. **Atmosphere:**
   - rain with wet surfaces, puddle reflections and drips
   - steam, dust in light shafts, layered fog
3. **Hollowmere's identity:** orange sodium lamps against blue moonlight, rain-wet stone and metal, deep but readable blacks.
4. **The operators:**
   - detailed code-built silhouettes: fabric folds, straps, pouches, harnesses, kit detail
   - CC0 fabric and gear textures
   - the goggle glow as the signature light
5. **Vision modes as a showpiece:** night, thermal and electro, each with its own grain, bloom and noise character.
6. **Camera finish:** filmic tone mapping and grading per district, subtle grain, restrained lens effects.

**The art direction doc** (`docs/art-direction.md`, written before Phase 6b; can be drafted in chat at any time):

- the palette and lighting key per district
- the material list
- the character detail sheet
- the rules for what may differ on phone

**Beauty shots:**

- A fixed set of camera positions per map (`scripts/beauty-shots.mjs`), captured at Epic after every phase from Phase 6b on, so progress is visible and regressions are caught.
- Michael compares them privately against Chaos Theory screenshots. Those never go in the repo.

**Budget:** desktop targets stay as in `docs/systems/performance.md` (the gaming-laptop target at Epic). High must still run well on mid-range desktop GPUs.

## 6. Out of scope

**Removed in Phase 3** (code deleted, tests and docs updated):

- snap cover, cover glide, cover-to-cover, blind fire over cover (replaced by back-to-wall)
- Mark & Execute
- sonar goggles (replaced by thermal and electro)
- the Ghost / Panther / Assault style tracker and cash (replaced by the stealth rating)

**Parked** (code kept behind `?legacy=1` from Phase 0; no new work; their e2e suites are optional):

- Hunter and Wave Survival - Michael wants both back after the vertical slice, rebuilt on campaign maps.
- The old Mission mode.
- PvP: Team Deathmatch and Free-for-all. The Confrontation (5.15) reuses their network code but is its own design.
- Credits, XP-gated unlocks, shop, suit upgrades, HQ, challenges, weapon mastery.
- Camos, outfits, emotes, appearance editing beyond the default operator.
- Recon drone gadget, drone operator placement.
- Minimap.
- Parked maps (Embassy, Mansion, Port, Refinery, Dust Depot) stay parked. The Warehouse remains a test map.

**Never:**

- Splinter Cell IP of any kind.
- Recorded or synthesised voice.
- External art files, except CC0 textures for desktop detail (5.16). External audio files, unless the Phase 2 A/B test changes that rule (S7).
- Random patrols that defeat planning.
- Forced timers in stealth sections.
- World waypoints.
- Kill cams.
- Monetisation.

---

## 7. Level design

`docs/level-design.md` is the level design standard. It applies to every map, together with `docs/templates/map-spec.md` (the map spec template) and the standard's phases and gates (its Section 14).

The standard's Section 12 lists engine facts that maps are designed against. Roadmap phases change some of them:

- Phase 1: light and detection, e.g. "darkness hides the player beyond 1.8 m".
- Phase 2: noise and masking, e.g. "footsteps are silent at crouched gears 1-4".
- Phase 3: back-to-wall replaces cover.
- Phase 5: new co-op verbs (the standard's Section 11.6).

The phase that changes a fact must:

1. update `docs/level-design.md`;
2. list every decision in every map design document that relied on the old fact, in its report.

The standard's existing content stays. This bible adds the following:

- **Light plan per space.** List every lamp, its circuit or fuse group, the dark pockets, and which route each light change opens.
- **Sound plan per space.** Ambient zones and loud / quiet floors.
- **Checkpoint plan.** One checkpoint before each space.
- **Co-op plan.** Per space:
  - the team-move route
  - at least one more co-op moment (light control as teamwork, a sync opportunity, or a split-and-converge pair of objectives)
  - its `coopExtras`
- **Medkit and civilian plan.** Wall medkits about every second space. Where civilians work and why they are there at night.
- **Every map ships with a map spec** in `docs/maps/<map>.md` written before blockout. The Exchange prompt and plan are the template.

---

## 8. Platform and performance

- **Phone:** iPhone 17 Pro Max, landscape, 60 fps sustained after 3 minutes warm (the Phone check hold), with the governor's 30 fps fallback.
  - The phone look is the 3.4 light renderer plus the lamp volume from Phase 1.
  - Any new visual feature on the phone must pass the Phone check hold before it ships.
- **Desktop:** the budgets in `docs/systems/performance.md`.
- **Gameplay reads only:**
  - collision
  - occupancy
  - anchors
  - the light bake
  - the noise model
- **Gameplay never reads** graphics presets, LOD, voxel layers or the governor.
- **Offline:** the solo campaign works fully offline. Co-op needs internet.
- **Controls (Michael, 2026-10-08):** touch and controller are equal on phone. Mouse and keyboard are equal on desktop.
  - Every verb works on all three and has e2e coverage (`e2e-touch`, `e2e-pad`, `e2e-mouse`).
  - Button prompts swap at once when a controller connects or disconnects.
- **Touch control scheme (spec written in Phase 3)** - few buttons, the rest contextual:
  - move stick and look area
  - aim, fire (the elbow strike while holstered: the button's icon changes), crouch, jump
  - one contextual action button (takedown, interact, traverse, grab)
  - the speed rocker
  - a comms wheel: pings, Sync, whistle
  - the gadget wheel: gadgets, throwables, medkit
  - the vision toggle
  - The editable layout and the 56 px minimum stay.
- **Release intent (Michael, 2026-10-08):** a personal project.
  - No store builds and no paid infrastructure unless it is cheap.
  - The originality rules stay anyway: no Splinter Cell IP, no real gun brands.
- **Art direction: one palette, two fidelities.** Desktop aims to surpass Chaos Theory visually (5.16).
  - Each map's design document defines its palette and lighting key: lamp colours, moon, the colours of dark and lit areas.
  - The phone look uses the same palette and light colours with simpler materials; desktop adds detail, never a different mood.
  - Readability is judged on the phone look first.
- **Accessibility defaults:**
  - Subtitles are always on (they are the story).
  - Operator goggle colours must stay distinguishable for common colour blindness. Check green and violet in Phase 5; adjust if needed.
  - Haptics toggle.
  - Hold or toggle for crouch, aim and sprint.

---

## 9. How we build (Claude Code process)

### Models

**Opus 5.5:**

- writes each phase spec (Appendix A) from this bible and `docs/progress.md`
- makes architecture decisions
- reviews diffs against the spec (Appendix C)
- investigates hard bugs

**Sonnet 5.5:**

- implements a written spec step by step
- fixes failing tests
- dresses maps to an existing plan
- updates docs

**Loop:**

1. Michael asks an Opus session: "Write `docs/prompts/phase-N-<name>.md` per the design bible."
2. Michael starts a Sonnet session: "Read `docs/prompts/phase-N-<name>.md` and follow it from Step 1."
3. After each phase, optionally an Opus session reviews the phase diff with Appendix C.

### Branches

- `ct-movement` is the working branch. Its preview is `/ct/` on GitHub Pages, with its own save.
- Claude never merges into `dev` or `master`. Michael does.
- Big map work may use a feature branch off `ct-movement`; only Michael merges it back.

### Token hygiene

- Read `CLAUDE.md`, the phase spec, and only the files the spec lists. Use `grep` / line ranges, not whole large files.
- Never re-read this bible in full within a session. Re-read only the section needed.
- Run the e2e suites the step names. Run the full required suite once at the end of the phase.
- Keep reports short and factual (Appendix B).

### Definition of done (every phase)

- `npm run check` passes.
- The e2e suites named in the spec pass, and the full required suite (`npm run e2e`) passes at the end of the phase.
- Performance budgets pass (`docs/systems/performance.md`). Visual changes on the phone list a Phone check for Michael in `TESTING.md`.
- Pure logic is in Babylon-free modules with Vitest tests. Each new player-facing system has an e2e suite or extends one.
- New or changed animations meet the realism standard (5.12.2) and pass the audit harness once it exists (Phase 3b). Contact sheets are attached to the report.
- Docs are updated:
  - `CHANGELOG.md` (one minor version per phase)
  - `TESTING.md` (a short manual phone and desktop checklist)
  - the relevant `docs/systems/*.md`
  - `docs/progress.md`
- Commit and push `ct-movement`, report, then STOP.

### Versions

- Phase 0 = 3.5.0, Phase 1 = 3.6.0, and so on: one minor version per phase.
- Fixes inside a phase are patch versions.

---

## 10. Roadmap

| Phase | Name | Delivers |
| --- | --- | --- |
| 0 | Foundation | Merge `dev` (3.2.1-3.4.0 phone work) into `ct-movement`; this bible installed; `CLAUDE.md` cut to a lean core with `docs/systems/`; old changelog / testing archived; parked modes behind `?legacy=1`; player-facing title renamed to Night Shift; `docs/story.md` installed; `docs/progress.md`. Spec: `docs/prompts/phase-0-foundation.md`. |
| 1 | Light parity | Section 5.1 rules L1-L13: gameplay meter reads the bake; bake on every device; phone renders the lamp volume on the blockout (Phone check gate); parity test; continuous meter HUD; fuse boxes; door decision. |
| 2 | Sound | First the audio source A/B test (S7, Michael picks). Then Section 5.2: noise zones, masking, sound meter, whistle, ambient beds; zones on the Warehouse and Exchange. |
| 3 | Pure CT conversion | The touch and controller control scheme spec (Section 8); holstered unless aiming, no hip fire, the elbow strike (5.4, 5.6); Back-to-wall (peek, lean-shoot, SWAT turn, corner takedown); remove snap cover, Mark & Execute, sonar, the style tracker and the regenerating shield; medkits; thermal and electro vision; door peek; curated arsenal with original names; hip fire and ADS spread; Training rewritten; cover e2e rewritten. |
| 3b | Movement, camera and animation lock | The dev bot partner (C20) early. Then the full animation audit (5.12.4): inventory, audit harness, review, fixes in seven batches, Michael's sign-off per batch. Then the CT pulled-back camera and collision solver; drag; quick 180; momentum carry; spring layer; dedicated clips (rappel, fence, brace, back-to-wall, drag); guard body language; pose viewer; known fixes (thigh pistol vs elbow at slow crouch, brace prompt, human ladder by touch, thin fence); a phone feel pass with Michael; then the metrics freeze (Section 5.3). |
| 4 | Mission framework | Shared campaign progress with spoiler warnings and the per-player mission record (5.8). Section 5.8: triggers / actions, objective tiers, rules and alarm levels, checkpoints with Continue and Restart from checkpoint, text radio with solo / team variants and speaker colours (story Section 7), briefing, field terminal, stealth rating; Warehouse missions ported as test content. |
| 5 | Co-op 2-4 | Connection test and network stats (C19); the bot partner extended; the first playtest night (C20). Section 5.9: per-player detection, `coopExtras`, new team moves and their clips, distinct operators (5.14) and team-mate outlines; Sync, clutch saves, dragging downed partners, medkit on a team-mate, typed pings with quick lines, team results and highlights (C12-C18); 4-player e2e, host-leave resume. |
| 6 | CT verbs for the slice | Civilians (5.7); per-stop guard facing (5.7); lockpick, hack minigame, optic cable, interrogation, knife, cameras, lasers, camera jammer, sticky shocker, ring airfoil, light disruptor; curated campaign kit and loadout kits. |
| 6b | Visual target | Section 5.16: the CC0 texture pipeline (desktop-only download, offline cache, size budget, credits); the material library; operator detail; rain and wetness; light cones, haze, flicker; vision mode beauty pass; district grading; beauty shot script and baseline. Works from `docs/art-direction.md`. |
| 7 | Vertical slice | Kestrel Exchange as Mission 1 "Dead Line". First the alignment pass in `docs/prompts/exchange-alignment.md` (map Phase 2b) on `exchange-design.md`: replace cover-to-cover and Mark & Execute in Spaces 5-7, re-check engine facts changed by Phases 1-3b (including the frozen movement metrics), add the light, sound, checkpoint and co-op plans. Then the map's own build phases 3-6 (ground floor; first floor, roof and yard; guards and mission; dressing and verification), then the Dead Line radio script (story Section 8), checkpoints and rating. Finally a playtest pass on iPhone, desktop and 2-player co-op. |

**After the slice:**

1. **Confrontation prototype:** a greybox 1v1 arena testing 5.15's rules, the first-person traitor and the AI traitor. Tuned with Michael on phone and desktop. This is the riskiest design in the game, so it is proven early.
2. Hunter and Wave return on campaign maps.
3. Missions 2-8, with Mission 8's real arena built from the prototype's findings.
4. The standalone Confrontation mode after the campaign.

---

## 11. Open decisions (Michael)

**Decided on 2026-10-08 and 2026-10-09** (no longer open):

- weapon holstered unless aiming; no hip fire; the elbow strike

- the desktop visual target; CC0 textures for desktop detail; Phase 6b

- story, setting and tone; title; the traitor finale (5.15)
- input parity; personal project; shared co-op progress
- the operator team and their real names; the Client (Alistair Crane)
- awareness arcs; quicksave; civilians; health numbers; the run / sprint braking stop
- Kestrel Exchange Phase 2 (all final); the Space 8 lane camera
- doors block light; the baked moon

**Still open:**

1. Whether the LKP becomes per player in co-op (Phase 5 proposes).
2. Story items in `docs/story.md` Section 9: the epilogue lines, the betrayal and last lines, Mission 6's location.
3. Confrontation tuning numbers (5.15), settled in the prototype.
4. Audio source: code-synthesised or CC0 files (decided by the Phase 2 A/B test).
5. A relay (TURN) server for co-op (decided after real sessions with friends, C19).

---

## Appendix A - Phase spec template (Opus writes these)

```markdown
# Phase N - <name> (version 3.x.0)

Paste into Claude Code (Sonnet 5.5): "Read docs/prompts/phase-N-<name>.md and follow it from Step 1."

## Goal
One paragraph. Which bible sections and pillars this implements.

## Rules
- Branch `ct-movement`. Pull first. Never merge into dev or master.
- Read only: CLAUDE.md, this spec, docs/progress.md, and the files listed per step.
- Ambiguity: choose the option closest to existing patterns and log it under Decisions.
- STOP conditions: <list>.

## Decisions already made
- ...

## Out of scope
- ...

## Steps
### Step 1 - <name>
- Read: <exact files / sections>
- Change: <files and functions, one line each>
- Acceptance: <measurable checks>
- Tests: <unit tests to add>, <e2e suites to run or extend>

(repeat per step)

## End of phase
- Budgets and suites to run
- Docs to update
- Report (bible Appendix B), then STOP.
```

## Appendix B - Report template (Sonnet writes these)

```markdown
## Phase N - step X report
- Done: <one line per item>
- Files changed: <paths>
- Decisions: <ambiguity -> choice -> why>
- Tests: <exact commands -> result, counts>
- Measurements: <perf numbers vs before>
- Open issues: <what is not done or uncertain>
- Next: <the next step, or "phase complete - STOP">
```

## Appendix C - Review checklist (Opus reviews)

1. Does the diff do what the spec says, and nothing it does not?
2. Does it follow the pillars? Does anything make light less truthful, readable or controllable (P1)?
3. Does gameplay read any graphics state? It must not.
4. Does it extend a removed or parked system? It must not.
5. Is pure logic separated and unit-tested? Are there e2e checks for player-facing behaviour?
6. Are there allocations in hot paths? Are the performance budgets and phone budgets measured?
7. Does it work on touch, controller and mouse? And for co-op host, client and solo?
7b. Do animations meet 5.12.2: instant control but a continuous body, no pops, no slides, no clipping, human timing and joint limits?
8. Is a save change versioned and migrated?
9. Are docs updated (`CHANGELOG`, `TESTING`, `docs/systems`, `docs/progress.md`)?
10. Are the decisions logged and sensible?
