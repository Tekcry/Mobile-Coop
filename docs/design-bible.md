# Silent But Deadly - Design Bible

Version 1.1 - 2026-10-08 (1.1: Kestrel Exchange restart, level design standard, branch state). Owner: Michael. Location in the repo: `docs/design-bible.md`.

---

## 0. How to use this document

**Authority order.** When sources disagree, the higher one wins. Note the conflict under "Decisions" in your phase report.

1. Michael's current instruction.
2. This bible.
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

Silent But Deadly is an original third-person stealth action game in the spirit of Splinter Cell: Chaos Theory.

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
| Crouch / stand | | Have | - |
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
| Carry and hide bodies | | Have | - |
| Whistle | Lures the nearest calm guard to investigate your position | Add | 2 |
| Lockpick | Short minigame on doors / cases. Silent but takes time. Touch-friendly. | Add | 6 |
| Hack | Short minigame on terminals and keypads (replaces hold-to-hack where a mission wants it) | Add | 6 |
| Optic cable | Look under a closed door before opening it | Add | 6 |
| Interrogation | From a grab: question the guard for intel (subtitled), then knock out or kill | Add | 6 |
| Use a held guard on a scanner | Opportunity objective device | Add | 6 |
| Grab, human shield | | Have | - |

### Takedowns

| Verb | Behaviour | Status | Phase |
| --- | --- | --- | --- |
| Takedowns: behind, front, side, corner, above (drop), below (pull down), window, over low obstacle | Tap = non-lethal, hold = lethal | Have | - |
| Knife | Lethal close takedown. Cuts cloth and tarps to make new paths. | Add | 6 |
| Dual takedown (co-op) | | Have | - |
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
| Pings | | Have | - |

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
- **L6 - The meter.**
  - Continuous 0-1, updated at 10 Hz or more, with the existing thresholds (`LIGHT.shadow` 0.28, `LIGHT.lit` 0.6).
  - The HUD shows a continuous bar with the threshold marks.
  - It samples chest and head; crouching lowers the samples.
  - If the meter reads dark, no guard can detect the player faster than the dark rate allows.
- **L7 - Readable darkness.**
  - Dark areas are never pure black on a phone at default brightness. Walls, exits and the player's own silhouette stay readable without night vision.
  - Night vision shows detail and guards; it is never required just to find the way.
- **L8 - Controllable light.** Every lit space offers at least two ways to change the light:
  - switch
  - breakable lamp
  - fuse box / breaker (circuit groups)
  - EMP or disruptor
- **L9 - Guards notice light changes in their view** (existing `lightsOut`). A fuse box trip sends a guard to the box. Investigating guards in darkness take torches (existing).
- **L10 - Co-op.** Light state (on / off / destroyed / disrupted) is host-authoritative and synced. Clients re-mix the volume locally.
- **L11 - Characters and bodies do not occlude gameplay light.** This is deliberate: simple and symmetrical.
- **L12 - Doors.** How open and closed doors affect the bake is decided in Phase 1 and recorded in `docs/systems/lighting.md`.
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
- **S6 - Audio.** Synthesised ambient beds match the zones so the player can hear the masking. Outdoor rain adds to ambient.

### 5.3 Movement and back-to-wall (P4)

- **Keep:** all CT movement on `ct-movement`, the camera framing, shoulder swap and the speed gear controls.
- **Back-to-wall (Phase 3)** replaces `src/cover`:
  - A contextual press (or pushing into a high wall face with the stick held for a short time) puts the back to the wall.
  - Moving along the wall uses the current gear speed, crouched or standing.
  - At an edge: peek (camera swings out), lean out and aim / shoot, SWAT turn across a doorway gap.
  - Pull away to leave.
  - No snap from a distance, no glide, no cover-to-cover dash, no blind fire over low cover.
  - Low objects are handled by crouching behind them.
- **Enemy cover AI** (picking cover points from cover faces) stays. Only the player's cover changes.
- **Training mode** is rewritten in Phase 3 to teach the CT verbs.

### 5.4 Takedowns, grabs, interrogation

- **Keep** every existing takedown kind. Tap = knock out, hold = lethal.
- **Grab** (have) becomes the hub:
  - drag
  - human shield
  - interrogate (Phase 6)
  - use on a scanner (Phase 6)
  - knock out or kill
- **Interrogation:** 1-3 subtitled lines per guard type, data-driven per mission. It can reveal an opportunity objective, a code or a patrol. The intel goes into the field terminal (Section 5.10).
- **Mark & Execute** is removed in Phase 3: `game/marks.ts`, `game/executeController.ts`, the HUD chevrons, the Execute charge, and training steps and e2e checks for it. The save keeps no data for it beyond what the migration requires.

### 5.5 Gadgets and vision

- **Vision modes** cycle: off, night, thermal, electro.
  - Thermal and electro are post passes on `CinematicPost` (or the phone grade pass).
  - The phone cost must pass the Phone check.
  - Vision modes never change detection.
- **Gadget wheel** stays. Time-slow while the wheel is open stays solo-only (existing).
- **Campaign kit** is limited per mission by the loadout kit (Section 5.6). No credits.

### 5.6 Weapons and loadout

- **Campaign carry:** one primary (a suppressed multi-tool rifle class), one suppressed sidearm with the light disruptor attachment, and gadgets.
- **The 16-weapon system stays in code.** The campaign uses a curated subset defined in data.
- **Loadout kits per mission:** Stealth (more non-lethal), Assault (more ammo, frags), Recommended (mission-specific). Chosen at the briefing.
- **Attachments** are selectable freely in the campaign. Nothing is bought.
- **Aim assist** stays light and touch-only (existing).

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
- **Awareness arcs** stay (readability) with a setting to hide them. Perfectionist hides them by default.
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

**Story and setting** are undecided (Section 11).

- Until decided, the handler's callsign is `OVERWATCH`, which is a placeholder.
- No real-world Splinter Cell names.

**Vertical slice:** Kestrel Exchange, a 1934 telephone exchange now used by a data broker. Its mission is "Dead Line": 8 spaces and 9 guards.

- Design documents:
  - `docs/prompts/exchange-design.md` (Part 1 building, Part 2 gameplay)
  - `docs/prompts/exchange-plans/` (floor plans and gameplay overlays)
  - `docs/prompts/exchange-map.md` (spec)
  - `docs/prompts/exchange-map-progress.md` (log)
- Map phases 0-2 (paper) are done. Phase 2 is awaiting Michael's approval.
- The map's build phases (3-6) are held until roadmap Phase 3 is done and the design has passed the alignment pass in `docs/prompts/exchange-alignment.md` (Section 10, Phase 7).

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

### 5.10 HUD and UI

- **In play:**
  - light meter (continuous)
  - sound meter
  - stance and gear pips
  - ammo (fades)
  - selected gadget
  - contextual world prompts
  - awareness arcs (optional)
  - radio subtitles
  - objective text on change only
- **No minimap and no world waypoints in the campaign.** The minimap is parked.
- **Field terminal** (pause menu): objectives, radio log, map with known intel, interrogation notes.
- **Touch targets** are 56 px or larger. Never add a button where a contextual prompt will do.

### 5.11 Saves

- IndexedDB only.
- Any change to the save's shape bumps `SAVE_VERSION` (7 on `dev` at the time of writing), with a migration and a unit test using a literal old save.
- Parked data (credits, unlocks, cosmetics) stays in the save untouched.

---

## 6. Out of scope

**Removed in Phase 3** (code deleted, tests and docs updated):

- snap cover, cover glide, cover-to-cover, blind fire over cover (replaced by back-to-wall)
- Mark & Execute
- sonar goggles (replaced by thermal and electro)
- the Ghost / Panther / Assault style tracker and cash (replaced by the stealth rating)

**Parked** (code kept behind `?legacy=1` from Phase 0; no new work; their e2e suites are optional):

- Hunter and Wave Survival - Michael wants both back after the vertical slice, rebuilt on campaign maps.
- The old Mission mode.
- PvP: Team Deathmatch and Free-for-all.
- Credits, XP-gated unlocks, shop, suit upgrades, HQ, challenges, weapon mastery.
- Camos, outfits, emotes, appearance editing beyond the default operator.
- Recon drone gadget, drone operator placement.
- Minimap.
- Parked maps (Embassy, Mansion, Port, Refinery, Dust Depot) stay parked. The Warehouse remains a test map.

**Never:**

- Splinter Cell IP of any kind.
- Recorded or synthesised voice. External audio or art files (existing hard rule).
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
- **Co-op plan.** The team-move route per space and its `coopExtras`.
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
- **Controls:** touch, controller and mouse and keyboard are all first class. Every verb works on all three.

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
| 0 | Foundation | Merge `dev` (3.2.1-3.4.0 phone work) into `ct-movement`; this bible installed; `CLAUDE.md` cut to a lean core with `docs/systems/`; old changelog / testing archived; parked modes behind `?legacy=1`; `docs/progress.md`. Spec: `docs/prompts/phase-0-foundation.md`. |
| 1 | Light parity | Section 5.1 rules L1-L13: gameplay meter reads the bake; bake on every device; phone renders the lamp volume on the blockout (Phone check gate); parity test; continuous meter HUD; fuse boxes; door decision. |
| 2 | Sound | Section 5.2: noise zones, masking, sound meter, whistle, ambient beds; zones on the Warehouse and Exchange. |
| 3 | Pure CT conversion | Back-to-wall (peek, lean-shoot, SWAT turn), remove snap cover, Mark & Execute, sonar and the style tracker; add thermal and electro vision; door peek; Training rewritten; cover e2e rewritten. |
| 4 | Mission framework | Section 5.8: triggers / actions, objective tiers, rules and alarm levels, checkpoints with Continue, text radio, briefing, field terminal, stealth rating; Warehouse missions ported as test content. |
| 5 | Co-op 2-4 | Section 5.9: per-player detection, `coopExtras`, new team moves, 4-player e2e, host-leave resume. |
| 6 | CT verbs for the slice | Lockpick, hack minigame, optic cable, interrogation, knife, cameras, lasers, camera jammer, sticky shocker, ring airfoil, light disruptor; curated campaign kit and loadout kits. |
| 7 | Vertical slice | Kestrel Exchange as Mission 1 "Dead Line". First the alignment pass in `docs/prompts/exchange-alignment.md` (map Phase 2b) on `exchange-design.md`: replace cover-to-cover and Mark & Execute in Spaces 5-7, re-check engine facts changed by Phases 1-3, add the light, sound, checkpoint and co-op plans. Then the map's own build phases 3-6 (ground floor; first floor, roof and yard; guards and mission; dressing and verification), then the radio script, checkpoints and rating. Finally a playtest pass on iPhone, desktop and 2-player co-op. |

**After the slice:** Hunter and Wave return on campaign maps. Then more missions.

---

## 11. Open decisions (Michael)

1. Setting, era and story premise. The handler's name (placeholder `OVERWATCH`).
2. Awareness arcs on or off by default at Normal.
3. Quicksave on desktop in addition to checkpoints.
4. Civilians or non-combatants in missions.
5. Kestrel Exchange Phase 2 approval: decisions D10-D27 in `exchange-design.md` Section 13, and the self-critique in Section 18.
   - Space 8 secret route: the neighbour's roof is uncovered by guards. Moving the sniper to cover the lane makes it harder, but he then covers the loaders less.
6. Door handling in the light bake (Phase 1 proposes, Michael approves).
7. Whether the LKP becomes per player in co-op (Phase 5 proposes).

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
8. Is a save change versioned and migrated?
9. Are docs updated (`CHANGELOG`, `TESTING`, `docs/systems`, `docs/progress.md`)?
10. Are the decisions logged and sensible?
