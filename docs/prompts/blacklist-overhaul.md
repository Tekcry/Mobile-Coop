# Shoulder Strike 2.0 - "Blacklist" overhaul (build prompt)

Paste everything below the line into a fresh Claude Code session on this repository.

---

You are building Shoulder Strike 2.0: a comprehensive overhaul of the existing game into a mobile take on
**Splinter Cell: Blacklist** gameplay. It's a third-person stealth-action shooter with fluid traversal, cover, light
and shadow, Mark & Execute, gadgets, and a Ghost / Panther / Assault play-style economy.

There is no story or campaign yet. The game ships two playable modes, both solo and 2-player co-op:
- **Hunter** (terrorist hunt, the evolution of today's Clear mode)
- **Infiltration missions** (download data, plant bugs, rescue, sabotage, extract)

This is a large, multi-phase build. Work through it phase by phase, test each phase properly, and keep the game
shippable after every phase.

## 0. Ground rules (read first, follow throughout)

1. **Read `CLAUDE.md` in full before touching code.** It describes the architecture, the hard rules, the module
   layout and the existing systems (rig, AnimGraph, FootPlanner, cover, traversal, carry, camera, AI, co-op,
   saves). Extend those systems; do not replace them with parallel ones unless a phase says so.
2. **Branch:** work on `dev` only. Commit at the end of every phase (and at sensible points inside long phases)
   and push `dev`.
   - Every push to `dev` deploys the preview at `https://tekcry.github.io/Mobile-Coop/preview/`, which has its own
     save.
   - Never merge into `master` (the live game) unless the user asks.
3. **Hard rules stay hard:**
   - No runtime CDN or network assets.
   - No external art or audio. Everything is procedural: smooth primitives via `PartLibrary`, procedural
     materials and camos, and WebAudio synthesis.
   - Babylon is imported only through `src/core/babylon.ts`.
   - Saves go to IndexedDB only.
   - `src/net` is only reached through dynamic `import()`.
   - Strict TS.
   - No allocations in hot paths.
   - `hyp2`/`hyp3`, never `Math.hypot`.
4. **Performance budget is part of the definition of done.**
   - Target: top-end phones at 120 Hz.
   - CPU p95 <= 3.5 ms per frame on the perf scenario.
   - Animation <= 0.04 ms per character. The VM drifts, so compare side by side with the previous build.
   - Draw calls <= 80. Allocations <= 96 KB per frame.
   - Every phase runs `node scripts/perf.mjs --budget` and compares against the previous phase's build.
   - Add perf scenarios for new systems (lights, AI at 10 enemies, two players in co-op).
5. **Tests are part of the definition of done.**
   - Pure logic gets Vitest unit tests.
   - Every new player-facing system gets an e2e suite (or extends one) that drives it headlessly with
     `window.__app.loop.stepHeadless`, plus quality bars where feel matters (timings, distances, no clipping).
   - The full `npm run e2e` must pass before each phase commit. `scripts/e2e-clip.mjs` must keep passing; extend it
     for every new pose (ladders, ledges, ducts, takedowns, carries).
6. **Docs:** every phase updates `CHANGELOG.md` (version bump), `TESTING.md` (a manual phone checklist for the phase)
   and `CLAUDE.md` (architecture notes for anything new).
7. **Saves:** any save shape change bumps `SAVE_VERSION` (currently 4) with a migration from v4 and a unit test
   with a literal old save. Existing players keep their XP, currency, unlocks and look; map retired items to their
   closest replacements.
8. **Mobile first:** every action works with touch, pad and keyboard/mouse.
   - Touch uses contextual world prompts (the existing `WorldPrompts` pattern) and a small number of buttons.
   - Never add a button where a contextual prompt will do.
   - Keep all touch targets >= 56 px.
9. **Feel over features:** Blacklist's appeal is flow - moving from cover to ledge to pipe to takedown without
   stopping. Every transition is inertialized, interruptible where sensible, and never pops. Prefer fewer,
   polished verbs to many rough ones.
10. **When something is ambiguous**, choose the behaviour Splinter Cell: Blacklist has, note the decision in the
    CHANGELOG and move on. Ask the user only for genuine product decisions.

## 1. What exists today (starting point)

Read the code; this is a summary so you know what to build on.

- **Rig:** `CharacterRig` (stick + detailed avatar styles, two-bone IK, FootPlanner, joint rate limits, weapon
  body clearance), `AnimGraph` (clip graph, blend spaces, inertialization) and `MotionDriver` root motion.
- **Movement:** sneak, walk, jog and sprint; crouch and kneel; contextual traversal (step, vault, mantle, drop, hop).
- **Cover:** Blacklist-style snap-to-cover, turn-and-swap, edge peeks with step-out, over-peek, blind fire,
  cover-to-cover with markers, corner prompt, SWAT turn.
- **Combat:** weapons (pistol, SMG, rifle, shotgun, sniper) with carry slots, ready positions, raise to the eye,
  recoil, reloads and swaps; grenades; hit volumes; suppression; exposure.
- **AI:** grid nav, flow field, cover use, flanker, grenades, hearing footsteps, doorway checks.
- **Modes:** Wave, Mission, Clear (Hunter-like), Free Roam (sandbox).
- **Maps:** Warehouse, Dust Depot, Proving Grounds.
- **Co-op:** 2+ players over WebRTC (Trystero) with a host-authoritative sim, snapshots, validated hits and revive.
- **Progression:** XP, levels, currency, unlocks, upgrades and attachments; cosmetics (parts, patterns, camos,
  emotes).
- **Camera:** Blacklist framing; free orbit; tight spaces.

## 2. Target experience (pillars)

1. **Fluid traversal:**
   - **Ledges:** hang, shimmy, climb up, drop, ledge-to-ledge jump.
   - **Pipes:** vertical climb, horizontal hand-over-hand shimmy.
   - **Climbing aids:** ladders (climb, slide down, kick off at the top), climbable fences.
   - **Ducts and vents:** crouch-crawl, grate kick-out or quiet unscrew.
   - **Windows and doors:** vault through windows; doors with quiet open, kick and breach.
   - **Movement aids:** rooftop gaps, ziplines (one per map where it fits), drop-down from height with a roll.
   - **Flow:** all of it chains with cover and the existing contextual traversal (one button, context decides).
2. **Predator stealth:**
   - **Light and shadow:** a light meter; shoot out lights; switches.
   - **Detection:** enemies with vision cones that respect light and stance.
   - **Last Known Position:** a ghost silhouette where they last saw you; they search there.
   - **Bodies:** carry and hide them.
   - **Takedowns:** non-lethal or lethal, from behind, above (ledge, pipe, drop), below (pull over a ledge), through
     windows and from cover.
3. **Mark & Execute:** a takedown earns an Execute charge. Mark up to 3 targets (4 with upgrades); execute in one
   stylised, fast, slightly slowed sequence. In co-op both players' marks combine.
4. **Gadgets and vision:**
   - **Gadgets:** sticky cam (noise and gas variants), noisemaker, sleeping-gas grenade, flashbang, frag, EMP
     grenade, and a tri-rotor drone (one stun, one explosive).
   - **Vision modes:** night vision and sonar goggles (a pulse that reveals enemies through walls for a few seconds),
     with cooldowns.
5. **Play styles that pay:** every takedown, avoidance and objective scores in Ghost (undetected, non-lethal or
   avoided), Panther (lethal, undetected) or Assault (loud).
   - The mission end screen shows the three bars and pays cash per style.
   - Hunter and Infiltration each favour a different mix.
6. **Readable, minimal HUD:**
   - Enemy awareness arcs: white = suspicious, filling to red = detected.
   - The LKP ghost; mark icons; a light meter; objective markers placed in the world.
   - A gadget and vision wheel or strip; nothing else unless it is needed.
7. **Clean, realistic look within the procedural style:**
   - A believable operator with a tactical suit, plates, pouches and tri-lens goggles.
   - Distinct enemy archetypes readable by silhouette.
   - Weapons with real proportions and visible attachments.
   - Lighting that sells the shadows.

## 3. Phased plan

Each phase lists deliverables and acceptance criteria. A phase is done only when its criteria pass in
automated tests (where testable), the full e2e suite passes, perf is within budget, and the docs are updated.

### Phase 1 - Foundations and refactors (no visible feature yet)

- **Interactable traversal objects:** a data model for traversal anchors placed by `LevelBuilder` and stored in
  the `MapLayout`:
  - `Ladder {base, top, facing}`
  - `PipeVertical {base, top, side}`
  - `PipeHorizontal {a, b, hangHeight}`
  - `Ledge {a, b, top, outwardNormal, canHang, canClimbUp}` (generated automatically from box tops that meet the
    rules, like `buildCoverSegments`, with manual overrides)
  - `Duct {path points, entry/exit grates}`
  - `Window {frame, sillHeight, breakable}`
  - `Door {hinge, width, swing, locked, breachable}`
  - `Zipline {a, b}`
  - Pure, unit-tested geometry helpers (nearest anchor, reach tests, hang points), mirroring `coverData.ts`.
- **A generalised `TraversalController`:** a state machine for attached locomotion (on ladder, on pipe, hanging on
  a ledge, in a duct, on a zipline) alongside the existing committed moves. Each state owns:
  - input mapping (stick along the anchor's axis)
  - root-motion path
  - camera framing preset
  - enter/exit transitions with inertialization
  - which actions are allowed (aim with a sidearm while hanging; takedowns; drop)
- **Rig hand and foot targets for attachments:** hands to world grips (rungs, pipe, ledge lip), feet to rungs or
  wall pads, plus a `hang` pose family. Hand IK must be able to target world points independent of the weapon (the
  weapon goes to its holster slot while climbing, with the existing swap clip and slot logic).
- **Input:**
  - Reuse `jump` (Y / E / tap prompt) as the contextual "traverse" action.
  - Add `drop` (B / C / crouch while attached) and `interact-hold` (hold Y, for doors, downloads and hacking).
  - Ensure `InputState` supports holds with a progress value for UI rings.
- **Light model:** a lightweight, CPU-side light registry (positions, radius, cone, intensity, on/off,
  destructible) used both for rendering (a capped set of Babylon lights; others baked as emissive or fake) and for
  gameplay light sampling.
  - `lightLevelAt(point)` in a pure module (unit tested).
  - Budget the per-frame cost: sample the player at 10 Hz and each enemy's view target in its think tick.

**Acceptance:**
- Unit tests for anchor geometry and light sampling.
- No visible behaviour change; the full e2e suite passes; perf unchanged.

### Phase 2 - Traversal: ledges, pipes, ladders, ducts, windows, ziplines

- **Ledges:**
  - **Hang:** approach a ledge from above or below, or fall past one with a ledge-grab window. Hold B or the drop
    prompt at an edge to lower into a hang.
  - **Shimmy:** move left/right along the lip at about 1.2 m/s. At corners: inside corners turn, outside corners
    wrap around.
  - **Leaving the hang:** climb up with the contextual prompt (mantle onto the top); drop (B); short back-eject or
    sideways jump to an adjacent ledge or pipe within 2.5 m when the stick points at it (prompt shows the target,
    like the cover-to-cover marker).
- **Pipes:**
  - **Vertical:** climb up/down at about 0.9 m/s with alternating hands. At the top: transfer to a ledge or mantle.
    Slide down quickly when holding down plus traverse.
  - **Horizontal:** hand-over-hand hanging; feet dangle with a little swing (spring), and can lift over low
    obstacles.
- **Ladders:**
  - Enter at the bottom or top (the top uses a turn-around and step-on).
  - Climb at 1.6 rungs/s with a matched rung cadence; hands and feet IK'd to rungs, never floating.
  - Slide down: hold drop, with a fast slide and a heavy landing.
  - At the top: step off onto the floor.
- **Ducts / vents:**
  - Enter by kicking (loud, fast) or unscrewing the grate (quiet, 1.2 s hold).
  - Prone or crouch-crawl inside at about 0.9 m/s; the camera moves to a tight duct preset.
  - **Peek grates:** look through ceiling and floor grates.
  - **Exits:** drop through a ceiling vent (an above-takedown opportunity), or crawl out of a wall vent.
- **Windows:** sprint-vault through open windows. Break and vault through glass (noise radius 15 m). From a ledge
  under a window: pull-through takedown of an enemy standing at it.
- **Ziplines:** attach at one end, slide with speed rising to 6 m/s. Drop off at any time; a drop takedown is
  available if an enemy is under the line.
- **Drops and landings:**
  - Falls under 2.5 m: a soft landing.
  - 2.5 to 4.5 m: a roll that carries momentum.
  - Over 4.5 m: a heavy landing with a 0.6 s recovery and noise.
  - No fall damage (Blacklist-like), but loud.
- **Flow:**
  - Every attached state can transition directly to cover, mantle, drop, takedown or another anchor without
    passing through idle.
  - Run straight into a pipe or ladder with traverse pressed and it attaches in stride.
- **Camera:** framing presets per state (hang: pulled back and lower to show the drop; ladder: over the shoulder
  looking up or down the climb; duct: tight). Look stays free-orbit within a cone appropriate to each state.
- **Animation:** new clips in `anim/clips/traverse*.ts` for hang idle, shimmy, climb-up, ledge jump, pipe climb,
  pipe shimmy, ladder climb, ladder slide, crawl, grate kick, grate unscrew, window vault, zipline and roll landing.
  Matched cadences: rung and hand contacts lock (< 1 cm) like feet do today.
- **Maps:** retrofit Warehouse, Dust Depot and Proving Grounds with ladders, drainpipes, ledges, vents and
  windows, so each major room has at least one alternative route (above, through or around).
  - Proving Grounds gets a traversal course that the e2e tests drive.

**Acceptance:**
- `e2e-traverse.mjs` drives every traversal verb and chain, both directions.
- Hands and feet lock on contacts (< 1 cm while gripping).
- No clipping: extend `e2e-clip` with hang, shimmy, ladder, pipe, crawl, vault-through-window and zipline.
- Speeds and transition times are within the stated bands; there are no idle frames inside chains.
- Touch, pad and keyboard all reach every verb.

### Phase 3 - Stealth model: light, detection, LKP, noise, bodies

- **Perception:**
  - Each enemy has a vision cone of about 55 degrees and 25 m.
  - A detection meter fills by distance, light level at the player (from the Phase 1 light model), stance, motion
    and how much of the body is exposed (reuse `exposureFraction`).
  - Peripheral vision fills slower; noise events from `noiseRadius` push it.
- **Alert states:**
  - **Unaware:** patrol routes or posts per enemy, defined in `MapLayout`.
  - **Suspicious:** looks and turns; may investigate.
  - **Investigating:** walks to the stimulus with a flashlight if dark.
  - **Searching:** sweeps from the LKP, then expands.
  - **Alert / combat:** today's combat AI.
  - **Cool-down:** back to patrol over about 45 s; stays more suspicious ("I'm sure I saw something").
- **Last Known Position:**
  - Show a white ghost of the player at the LKP.
  - Enemies converge and search there.
  - Flanking from elsewhere is the intended counter-play.
- **Lights:**
  - Shootable lights with suppressed weapons; switches as interactables.
  - When lights go out, enemies get suspicious and send someone with a flashlight.
  - Flashlights are cone lights in the light model (enemies can see better within them).
- **Bodies:**
  - Downed enemies (lethal or non-lethal) are discoverable; finding one raises area suspicion and triggers
    search.
  - The player can pick up and carry a body (slower, no weapon raise) and drop it into shadow, containers or vents.
  - Non-lethal victims wake only if found (Blacklist rule).
- **Alarm:**
  - Alarm panels: an enemy who reaches one calls reinforcements; in Hunter, that ends the Ghost bonus.
  - Reinforcement squads enter from defined spawn points.
- **Sound:** footsteps by surface type, door creaks, glass, landing, suppressed and unsuppressed shots. All feed
  noise events with radii; they show on the HUD noise meter.
- **HUD:**
  - Awareness arcs around the crosshair edge pointing at each aware enemy: white fill when suspicious, red when
    detected.
  - An on-screen LKP ghost; a light meter (subtle, on the existing tactical strip).
- **Vision modes:**
  - **Night vision:** a post-process pass in `vfx/cinematicPost.ts`; lights bloom; enemies are visible in the dark.
  - **Sonar goggles:** a pulse every 6 s while active, revealing enemy silhouettes through walls for 2.5 s, rendered
    as a cheap stencil or outline pass within the draw-call budget.

**Acceptance:**
- Unit tests for the detection maths: light, stance, distance, peripheral, exposure.
- Unit tests for the alert state machine transitions.
- `e2e-stealth-ai.mjs`:
  - Sneak behind a patrol undetected in shadow; get detected in light.
  - LKP placed and searched; a body found triggers a search; shooting a light triggers an investigation.
  - The alarm brings reinforcements.
- Perf: 10 enemies with perception within budget (vision and light sampling inside think ticks, raycasts
  staggered).

### Phase 4 - Takedowns, Mark & Execute, body handling

- **Melee takedowns** (lethal or non-lethal, chosen per press: tap = non-lethal, hold = lethal, or a settings
  toggle):
  - **Ground:** from behind or front, and from the side when the enemy is unaware or suspicious.
  - **From cover:** over low cover; around a corner.
  - **From above:** drop from a ledge or pipe, and from a ceiling vent.
  - **From below:** pull over a ledge.
  - **Through windows:** pull through.
  - **From ducts:** grab through a floor vent.
  - **From a zipline.**
  - **In co-op:** dual takedown.

  All are short (0.6 to 1.2 s), procedural-clip based, with both rigs driven in sync (attacker and victim
  aligned by root motion), always interruptible by damage.
- **Mark & Execute:**
  - **Earning:** a melee takedown awards one Execute charge (max 1).
  - **Marking:** tap the mark button while aiming at an enemy, or a marked object such as a light or explosive.
    Up to 3 marks (4 with an upgrade).
  - **Executing:** the button is available when all marks are in weapon range and line of sight; an icon turns red
    on each executable mark.
  - **Sequence:** a 0.8 s slowed sequence in which the operator turns and fires in order, the camera cuts between
    targets, and the stinger plays.
  - In co-op both players' marks combine and either can execute their own.
- **Carry body:** pick up and carry at a walk; drop or throw; hide bodies in containers (an interactable).
  Carried bodies use the existing ragdoll with a carried-state constraint.
- **Non-lethal tools:** a sleeping-gas grenade and a sticky gas cam, both alongside the existing frag.

**Acceptance:**
- `e2e-takedown.mjs` covers every takedown type: alignment within 5 cm, no interpenetration (extend clip
  checks to the victim rig), interruption by damage, and lethal vs non-lethal scoring.
- Mark & Execute: marks persist through cover moves; execute fails cleanly without line of sight; co-op shared
  marks are validated by the host.

### Phase 5 - Gadgets and the gadget wheel

- **Gadget list:**
  - Sticky cam (look through it, make noise, gas variant)
  - Noisemaker
  - Sleeping gas
  - Flashbang
  - Frag
  - EMP grenade (disables lights and electronics for 8 s)
  - Tri-rotor drone (fly it with the sticks, stun or explode, limited range and battery)
  - Proximity mine (Assault)
- **Rules:**
  - Each has its own carry count, upgrade path and procedural model.
  - Throw arcs use the existing grenade throw with a predicted-path line while aiming.
- **Wheel and strip:**
  - Pad: hold the D-pad up for a radial wheel (time slows to 0.3x in single player only) and tap to throw the
    selected gadget.
  - Touch: a compact gadget button with a long-press radial.
  - Keyboard: 1-5 plus G.
- **AI reactions:** noise lures; gas sleep; blind and stun; EMP darkness; drone spotted (they shoot at it).

**Acceptance:**
- Unit tests for the arc, drone flight limits and counts.
- An e2e suite exercises each gadget's effect on AI.
- The wheel is usable by touch and pad.
- No time slowdown in co-op.

### Phase 6 - Enemies: archetypes, squads, tactics

- **Archetypes:**
  - **Guard:** rifle, flashlight at night.
  - **Heavy:** armour and helmet; weak points at the back and the face plate; immune to frontal non-lethal grabs.
  - **Sniper:** laser and glint; can't be marked through the glint; relocates after shots.
  - **Enforcer:** a shield bearer. Flank him; he pushes forward and blocks.
  - **Dog handler and dog:** the dog sniffs you out in shadow by smell radius. Use a non-lethal takedown or
    sleeping gas.
  - **Drone operator:** flies a recon drone that spots you and must be EMPed or shot down.
  - **Officer:** calls the alarm, coordinates searches, buffs nearby enemies.
- **Behaviour:**
  - **Squads:** patrol routes with radio checks (a missed check-in raises suspicion); searches are coordinated by
    the officer; suppression and flanking are reused from today.
  - **Readable cues:** callouts as on-screen barks (short text near the enemy) plus synthesized radio chirps; no
    voice audio.
  - **Difficulty tiers:** Rookie, Normal, Realistic, Perfectionist (no Mark & Execute, no sonar, faster
    detection). These scale perception, damage and reaction times.

**Acceptance:**
- Unit tests per archetype rule (heavy frontal immunity, sniper relocation timer, dog smell radius).
- `e2e-enemies.mjs` covers each archetype's signature behaviour and the officer alarm.
- Perf: 10 mixed enemies within budget.

### Phase 7 - Modes: Hunter and Infiltration missions

- **Hunter** (replaces Clear; keep `?mode=clear` as an alias):
  - Clear every hostile in the area. Start fully undetected.
  - If you are detected and an enemy reaches an alarm, enemy count doubles (Blacklist rule) and reinforcements
    arrive.
  - HUD: "Enemies left N" as today. Results show the Ghost / Panther / Assault bars.
  - Checkpoints as rooms clear (existing logic).
- **Infiltration missions:** data-driven objective chains per map (`MissionDef` JSON validated like weapons), with
  these objective types:
  - **Download data:** hold-interact at a terminal for a 30 to 60 s upload while enemies converge if the download
    is noticed. The player may leave and return.
  - **Plant bug or hack:** a short hold interaction, which must stay undetected for a bonus.
  - **Rescue:** carry or escort a VIP to extraction.
  - **Sabotage:** plant a charge, then exfiltrate.
  - **Retrieve intel:** pick up 3 items spread across the map.
  - **Extract:** reach the extraction zone; optional "Ghost extraction" stays undetected.
  - **Per-mission rules:** optional ("no alarms", "no kills") and fail ("detected = fail" variants for
    challenge contracts).
- **Insertion and extraction:** a choice of 2-3 insertion points per mission (rooftop via zipline, sewer via
  ladder, front gate). Extraction is at a marked zone with a short helicopter-or-van style stinger: letterbox and
  slow beat.
- **Mission select:** a "Grim board" style map list showing each map's modes, best ratings and the play-style
  split. Difficulty is chosen per mission.
- **Maps** (keep Warehouse, Dust Depot and Proving Grounds, rebuilt for verticality):
  - **Embassy** (night): offices, a courtyard, a roof with pipes and ledges, a server room and vents.
  - **Port** (dusk): containers, cranes with ladders, a ship hull, zipline lines and dark water edges.
  - **Mansion** (night): balconies with ledges, interior ducts, a wine cellar, lit and unlit routes.
  - **Refinery:** pipes everywhere (horizontal and vertical), catwalks with ladders, steam that blocks vision.

  Each map has at least 3 routes to every objective (ground, above and below/through) and at least 25 traversal
  anchors. A light layout makes shadows meaningful. Nav covers catwalks and roofs that enemies can reach by ladder
  (nav links).

**Acceptance:**
- Unit tests for mission validation and objective state machines.
- `e2e-missions.mjs` runs each objective type to success and failure.
- Hunter's alarm-doubles rule is tested.
- Every map passes an automated reachability test (every objective reachable by at least 3 distinct anchor
  routes).
- Perf per map within budget.

### Phase 8 - Weapons, attachments and the upgrade system

- **Arsenal** (real proportions, built from rounded primitives by role):
  - Pistols: the 5-7 style, a compact .45, a silenced 9 mm
  - SMGs: MP5 style, Vector style, P90 style
  - Assault rifles: 552 style, AK style, Tavor style
  - Shotguns: pump, semi-auto, a compact breacher
  - Marksman and sniper: DMR, bolt sniper
  - Crossbow: non-lethal and lethal bolts
  - Assault only: LMG

  Each weapon gets suppressor, optic, grip, magazine and muzzle slots that are visible on the model and change
  stats (`weaponStats.ts` stays pure and tested).
- **Handling realism:**
  - **Feel:** recoil patterns per weapon; aim-down-sight zoom per optic; sway and breathing on marksman optics.
  - **Shooting:** shells eject from a pooled particle; a suppressor changes the noise radius and the visible
    muzzle flash; bullet penetration of thin materials (wood, glass).
  - **Reloads:** tactical and empty variants per weapon class (extend the clip library).
- **Suit and equipment** (Blacklist "suit" system): vest/armour (armour vs noise trade-off), gloves (draw/swap and
  takedown speed), boots (noise), goggles (sonar or NV upgrades), pouches (gadget capacity).
  - Each piece has 3-4 tiers with stats and a distinct procedural look on the operator.
- **HQ upgrades** (Paladin-style hub menu): a radar on the HUD minimap; sonar range; Execute charge capacity
  (+1 mark); gadget restock between checkpoints; co-op revive speed.
- **Economy:**
  - Cash from missions, split by Ghost, Panther and Assault, with mission multipliers.
  - Unlock tiers by player level; challenge rewards ("10 takedowns from above").
  - All maths in `progression/` with unit tests.
  - Migrate the existing currency and unlocks; existing weapons map to their closest new equivalents.
- **Loadouts:** 3 saved loadout presets; picked before a mission and shown to co-op partners in the lobby.

**Acceptance:**
- `validateWeaponDefs` is extended; unit tests cover stats, economy and the save migration.
- `e2e-progression` is extended: buy, equip, the stats visibly apply, and the save persists.
- `e2e-weapons-carry` passes for every new weapon (carry slots, grips within 2 cm, no clipping).

### Phase 9 - Visual overhaul: operator, enemies, weapons, lighting

- **Operator** (the default for the player; the stick style remains a setting):
  - Shape: realistic proportions from `proportions.ts`; a fitted tactical suit (torso panels, a plate carrier with
    pouches, knee and elbow pads, gloves, boots, a holster and a backpack variant).
  - Head: a balaclava or hood with the iconic tri-lens goggle (the lenses glow green when vision modes are on).
  - Detail: all smooth parts with seams faked via procedural patterns.
  - Customisation: suit and camo customisation remains (the cosmetics catalogue extends to suit pieces).
- **Enemies:**
  - Distinct silhouettes per archetype: guard cap/beret, heavy helmet, plates and visor, sniper hood and long rifle,
    enforcer shield, officer jacket, handler with dog.
  - Faction colourways (urban, desert, maritime) per map.
- **Dog:** a quadruped rig (a smaller planner with four feet), built on the same `PartLibrary` instanced approach.
- **Weapons:** finer part breakdown (rails, ejection port, mag, stock adjustments), attachments as parts, wear on
  camos.
- **Lighting:**
  - **Per map:** time-of-day (night, dusk); hemispheric fill.
  - **Lights:** a capped set of real lights (by distance) plus emissive fakes for the rest; shadow casters only on
    key lights within budget; volumetric-looking light cones as cheap additive meshes.
  - **Contact:** contact shadows or blob shadows under characters.
- **Post:** a subtle colour grade per map, the vision-mode passes from Phase 3, and the existing vignette and
  letterbox.
- **LOD:** keep the per-instance LOD (hi/lo) and the animation LOD; the operator and enemies stay within the ~20
  draw-call character budget.

**Acceptance:**
- Rig-shot and anim-sheet contact sheets reviewed for proportions and silhouettes (include them in the
  commit message's test notes).
- `e2e-cosmetics` passes with the new suit pieces.
- Perf within budget on the darkest, most-lit map.

### Phase 10 - Co-op for everything

- **Scope:** 2-player co-op (Blacklist-style) for Hunter and Infiltration, extending `src/net` (`NetSession`,
  `CoopHost`, `CoopClient`, protocol, validation).
- **Synced state:**
  - Traversal states (anchor id, progress), takedowns (attacker, victim, type, start time), carried bodies,
    marks, gadgets (sticky cam, drone), objective progress (download state, carried VIP), light states,
    alert levels and LKP.
  - The host is authoritative for AI, objectives, lights and takedown outcomes.
  - Clients predict their own traversal and takedown animations and get corrected without pops (reuse
    `SnapshotBuffer` and `ClockSync`).
- **Co-op verbs:** dual takedown; a boost-up to a ledge (one player boosts, the other climbs); revive (exists);
  shared Mark & Execute; pings (tap-hold to ping a spot or enemy, with world markers).
- **Validation:** every new message goes through `parseMessage` with clamps and caps, plus a unit test in
  `tests/net.test.ts`. The host validates takedown reach (<= 1.5 m) and line of sight, marks in range, and
  objective interactions at the terminal.
- **Lobby:** mission, difficulty and insertion choice; both players' loadouts visible; ready-up.

**Acceptance:**
- `e2e-coop.mjs` is extended with two pages over `?net=local`:
  - Both players traverse a ladder, ledge and duct chain.
  - A dual takedown; shared marks executed.
  - A download objective is completed while one player defends.
  - A body carry is seen by the other player.
  - A host leaving during a traversal causes no stuck state.
- Bandwidth stays under 40 KB/s per client.

### Phase 11 - HUD, UI, controls and accessibility polish

- **HUD (Blacklist-minimal):**
  - Awareness arcs; the LKP ghost; marks and execute icons; an objective marker that hides when looking away,
    with distance; a light meter.
  - Health as a screen-edge vignette (no bar). Ammo and gadget count only on change or reload.
  - In-world interact prompts with hold rings.
- **Touch layout v3:**
  - Move stick, look stick, fire, aim.
  - One contextual action (traverse / interact / cover through world prompts).
  - Takedown (appears only when available), Mark (appears while aiming), Execute (appears when ready).
  - Gadget button, crouch, sprint.
  - A layout migration from v2 (`TOUCH_LAYOUT_VERSION` 3) that keeps customised placements.
- **Pad mapping:** update the documented bindings (Execute = RB-hold or Y-hold style, chosen to avoid clashes),
  with an in-game controls screen per input type.
- **Accessibility:** colour-blind-safe awareness colours, a hold-vs-toggle option for every hold action, aim
  assist tiers, subtitles for barks, and HUD scale.
- **Onboarding:** a short training course on Proving Grounds teaching each verb with world prompts (optional,
  replayable, no story).

**Acceptance:**
- `e2e-touch`, `e2e-pad` and `e2e-mouse` are updated for every new action and screen.
- Every menu is reachable by pad.
- Touch targets are >= 56 px.

### Phase 12 - Hardening, performance and release candidate

- **Soak and perf:** a 10-minute `soak.mjs` on each new map (heap stable, no leaks); `perf.mjs --budget` on the
  heaviest scene (10 enemies, a dog, 6 lights, co-op client).
- **Offline:** every new asset precached; a full mission playable offline (single player).
- **Save migration:** tested from v1-v4 literal saves; an export/import round trip.
- **Release:** a full `TESTING.md` release checklist pass.
- **Hand-off:** the CHANGELOG 2.0.0 entry and a summary for the user of what to test on the preview. Do not
  merge to `master` until the user approves.

## 4. Quality bars (apply across phases)

- **Contacts:** no foot or hand sliding on any contact (< 1 cm while planted or gripping), including rungs, pipes
  and ledges.
- **Clipping:** no weapon, limb or body clipping through world or self beyond the `e2e-clip` thresholds for every
  new state.
- **Continuity:** no pops between states; pose continuity checked by `e2e-anim` for the new transitions
  (inertialization).
- **Responsiveness:** first-frame response to input in every attached state; a chain transition decision within
  one fixed step.
- **Camera:** never inside geometry in ducts, ledges or ladders; the horizon is always level; no residual offsets
  after any state.
- **AI fairness:**
  - Detection always gives a visible warning first (an arc fill > 0.25 s) except at point-blank range in full
    light.
  - Enemies never see through walls.
  - Searches end.
- **Frame rate:** 60 vs 120 Hz parity for timings (extend the parity test).

## 5. Working method

- Start each phase by writing the pure modules and their unit tests, then the runtime integration, then the
  e2e suite. Then do the visual and feel pass with screenshots (`scripts/shot.mjs`, `scripts/anim-sheet.mjs`,
  `scripts/rig-shot.mjs`) and look at them yourself.
- Keep tuning constants in `config/*.ts` and expose the important ones in the debug overlay's Tune panel.
- After each phase: run the full checks, commit to `dev`, push, and post a short summary for the user:
  - what changed
  - what to try on the preview URL
  - any known gaps
- If a phase grows too large for one session, split it into numbered sub-phases with their own commits. Never
  leave `dev` red.
