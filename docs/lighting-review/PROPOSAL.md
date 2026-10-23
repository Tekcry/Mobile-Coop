# Lighting rule review - proposal for Michael (every map)

Status: APPLIED AS ASSUMED DECISIONS (Michael ~01:42 "Apply, logged and undoable"; builders use them, each listed for his morning review in docs/marlow-final/STATE.md MORNING-REVIEW). The standard's text is not edited yet. Originally: PROPOSAL, nothing applied. Written 2026-10-23 ~01:45 by the marlow-final lighting agent (job lead: Night Shift |
Menu Notes Build). Every wording below is a proposed change; `docs/level-design.md`, `docs/templates/map-spec.md`, the
bible and DECISIONS stay as they are until Michael says yes, item by item (CLAUDE.md "Hard rules": the standard changes
only with his approval). This file stands on its own: Course Ready's Sector Ops spec and any campaign map spec can cite
it by item number (LR1, LR2, ...).

## 0. Michael's words
- 2026-10-23 01:40, for all maps (verbatim): "review lighting also, i think the rules may be too strict and the levels
  are very dark and unrealistic. there shouldnt always be shadows, the player may have to make shadows (disabling lights
  etc)".
- 2026-10-23 ~00:45, Marlow Yard (BRIEF M6, verbatim): "lit, players cut it, but you can also use mixed zones if it ends
  up being a better result. In game levels are quite dark and not realistic".
- 2026-10-23 ~00:30 (BRIEF M5): "Ensure lighting is sufficient, review the rule if needed."

The direction in one line: **spaces are lit as the real building would be; darkness is something the players make
(switches, breakers, timed isolators, the jammer, a shot) or find where a real building has none.** Light parity (the
picture, the meter and the guards agree) and the meter's thresholds do not change.

## 1. What stays fixed (not proposed for change)
These hold the light model together; the proposals work inside them.

| Rule | Source | Why it stays |
| --- | --- | --- |
| Light parity: picture, meter and guards agree; gameplay reads only the light field | CLAUDE.md "Hard rules"; bible P1 l.82-88, L1-L3 l.245-252; `docs/systems/lighting.md` | The core; lit-by-default changes where the light is, not how it is read |
| Meter thresholds `LIGHT.shadow` 0.28, `LIGHT.lit` 0.6 | bible L6 l.267; `src/world/lights.ts:74-81` | Guard perception is tuned on them (`visibilityFromLight`, `perception.ts:91-95`); moving them retunes every map |
| L5 display targets (0.12 dark <= 4%, 0.27 dark <= 9%, 0.40 mid 12-35%, 0.70 lit >= 45%) | bible L5 l.255-265; `world/darkCurve.ts` | The parity test's bands. A lit-by-default level simply has most points in mid / lit |
| L7 "darkness is dark" (near-black when the meter reads dark) | bible L7 l.270 | Clarified by LR9, not loosened: the made dark must still be true dark or cutting a light teaches nothing |
| Cameras see in the dark (own IR) | G240; `lighting.md` l.8-10; `CAMERA.irLight` 1 (`config/security.ts:45`) | Darkness beats guards and the meter, never a camera |
| L9 guards notice light changes; investigating guards in the dark take torches | bible L9 l.280; `TORCH_DARK` 0.35, `TORCH_KEEP` 0.45 (`ai/archetypes.ts:143-144`) | Gives a made dark a counter |
| L10 light state host-authoritative and synced | bible L10 l.281 | Stays; see risk R2 (today it is synced in Course mode only) |
| L12 doors, L13 cost, L15 glass (G45), L16 lit windows (G144), G152 jammer, G80 lamps re-lamp | bible l.284-292; DECISIONS | Unaffected |
| LD 16.8.1 every lamp has an owner, a fitting and a switch, or a real reason | level-design l.350 | It is what makes "players cut it" believable: the switch is where a real one is |

## 2. Every current darkness / light / shadow rule, with a verdict
"Breaks under lit-by-default?" means: does a level lit as its real building break the rule's text.

| # | Rule (short) | Source | Breaks? | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Bible P1: "Darkness is safety. Light is danger. The player can always read which is which." | design-bible.md l.82 | No | Keep |
| 2 | Bible P1: "Light is a toy: switches, breakable lamps, the pistol and its held jammer ... flashlights" | design-bible.md l.85 | No (it is the point) | Keep |
| 3 | Bible L5 parity test and display bands | design-bible.md l.255-265 | No | Keep |
| 4 | Bible L6 meter 0.28 / 0.6 | design-bible.md l.267 | No | Keep |
| 5 | Bible L7 "Darkness is dark. As in CT: if a guard cannot see you, you can hardly see yourself" | design-bible.md l.270-277 | Wording reads as "levels are dark" | Clarify: LR9 |
| 6 | Bible L8 "Every lit space offers at least two ways to change the light" | design-bible.md l.278 | No | Keep (LR5 updates the list: no EMP, G152) |
| 7 | Bible L9 guards notice light changes; torches in the dark | design-bible.md l.280 | No | Keep |
| 8 | Bible L10 co-op light state synced | design-bible.md l.281 | No (code gap, R2) | Keep |
| 9 | Bible 6 "Never: ... forced timers in stealth sections" | design-bible.md l.914 | Timed isolations are timers | LR6 |
| 10 | Bible 7 Marlow bunker pass "keeps the open floor's light level at 0.30, just over the 0.28 shadow line (G225)" | design-bible.md l.935; DECISIONS G225 l.1204 | Yes: 0.30 > 0.28, so a cut light never makes the floor dark | LR7 |
| 11 | Bible 7 "Light plan per space: every lamp, its switch or group, the dark pockets, and which route each light change opens" | design-bible.md l.947 | No | Extend: LR11 |
| 12 | LD 3.1 "Every encounter space opens on a dark vantage, outside every guard's view for the whole patrol cycle" | level-design.md l.30 | Yes: a lit space has no dark doorway by default | LR2 |
| 13 | LD 3.5 "darkness, cover or a hide spot at least every 4-8 m. Open lit ground is a deliberate crossing that needs timing, a light out or a tool" | level-design.md l.41-42 | No: cover and hide spots count; the second sentence already is the new model | Keep |
| 14 | LD 3.9 checkpoint "sits on a floor, in the dark, out of every guard's view" | level-design.md l.49-50 | Yes: lit lobbies, holding rooms, stairs | LR3 |
| 15 | LD 4.4 "Every guard is alone, in the dark and unwatched at some point in his cycle" | level-design.md l.58; LD 13 guard sheet l.232 | Yes: in a lit space the moment is lit unless the players darken it | LR4 |
| 16 | LD 4.6 lure destinations ("a light switched off, a lamp shot, a noise") | level-design.md l.62 | No | Keep |
| 17 | LD 4.8 survivable searches: "a hide spot or a dark escape" | level-design.md l.66 | No (a hide spot suffices) | Keep |
| 18 | LD 5.1 "Every lit pool has a visible source ... and a switch where a real one would be, by a door. Darkness is where nobody works at night." | level-design.md l.71-72 | No: it already says darkness is only where nobody works | Keep, add LR1 beside it |
| 19 | LD 5.2 "Every lit chokepoint can be darkened at least two ways (switch, shoot the fixture, EMP) and avoided at least one way" | level-design.md l.73-74 | No; stale "EMP" (G152 replaced it with the held jammer) | LR5 (wording) |
| 20 | LD 5.4 "Readable at a glance on desktop at the Low preset: lit and dark areas match the light meter" | level-design.md l.79 | No | Keep |
| 21 | LD 6.3 "No forced timers in stealth sections. Pressure comes from guards, light and noise." | level-design.md l.86 | Timed isolations | LR6 |
| 22 | LD 6.4 "light leading the eye towards the way on" | level-design.md l.87 | No | Keep |
| 23 | LD 7.2 toys: switches, breakable lamps | level-design.md l.93 | No | Keep |
| 24 | LD 12.1 engine facts: doors `DOOR_SHUT` 0.05; `ambientZone` y -1..8 | level-design.md l.143, l.149 | No | Keep; add the sync fact (LR12) |
| 25 | LD 12.2 / L15 glass G45 not built | level-design.md l.171 | No | Keep |
| 26 | LD 13 space sheet "Stepping stones: darkness / cover / hide spots"; "Lights: each source, its switch, circuit group, the ways to darken each chokepoint" | level-design.md l.215, l.217 | No | LR10 extends the Lights field |
| 27 | LD 15 acceptance: "at each vantage and planned dark pocket a crouched still player stays under suspicious for a full patrol cycle; in each planned lit pool on a route he is noticed; switching the circuit off makes it safe and lures the guard" | level-design.md l.278-279 | Vantage clause (as rule 12) | LR8 |
| 28 | LD 16.8.1 every lamp: owner, fitting, switch or reason | level-design.md l.350 | No | Keep |
| 29 | Template: "Palette, lighting character, grade, weather"; Theme "<time of day, light level ...>"; "switches" | map-spec.md l.60, l.92-93 | No, but silent on the lit default | LR10 |
| 30 | G225 "keep the open floor at 0.30 (the open floor's light level, just over the 0.28 shadow line)" | DECISIONS.md l.1204-1206 | Yes (as rule 10) | LR7 |
| 31 | G200 "sufficient lighting where required" | DECISIONS.md l.1064 | No: supports it | Keep |
| 32 | G240 cameras see in the dark | DECISIONS.md l.1278 | No | Keep |
| 33 | G45 glass, G144 lit windows, G47 parity built when built, G152 jammer, G80 re-lamp, G215 phone light | DECISIONS.md | No | Keep |
| 34 | G11 "guards relight lamps" dropped (not CT) | DECISIONS.md l.96 | No: a timed isolator's restore is the circuit, not a guard | Keep |

## 3. The proposals (exact new wording; never applied)

**LR1 - New LD 5.5 "Lit by default".** Add after LD 5.4:
> 5. **Lit by default; the players make the dark.** Spaces are lit as the real building would be at that hour with its
>    people at work: every working area reads at the Low preset, and a standing player there reads mid or lit on the
>    meter. Darkness is made by the players (a switch, a breaker or timed isolator, the held jammer, a shot lamp) or is
>    where the building really has none (an unlit store, a tagged-out fitting, a corner no fitting reaches); each such
>    dark pocket is named in its space sheet with its reason. Indoor spaces keep a standby fill under the shadow line, so
>    a cut circuit is true dark for the picture, the meter and the guards alike. Mixed spaces (lit and dark by design)
>    are allowed where they play better.

**LR2 - LD 3.1 entry vantage.** Replace with:
> 1. **Entry vantage.** Every encounter space opens on a concealed vantage, outside every guard's view for the whole
>    patrol cycle (by occlusion or by darkness), from which every guard in the space can be seen within one cycle.

**LR3 - LD 3.9 checkpoint.** Replace "sits on a floor, in the dark, out of every guard's view" with:
> ... sits on a floor, out of every guard's view: in the dark, or in a quiet connector no guard enters.

**LR4 - LD 4.4 isolation moment** (and the LD 13 guard sheet field "Where and when he is alone, dark and unwatched").
Replace with:
> 4. **Isolation moment.** Every guard is alone and unwatched at some point in his cycle, at a spot that is dark or that
>    the players can darken from cover at that moment (a switch, breaker or isolator, or the jammer in reach). The design
>    doc names the spot, the time and how it goes dark.

**LR5 - LD 5.2 (and bible L8) the ways to darken.** Replace "(switch, shoot the fixture, EMP)" with:
> (a switch, breaker or timed isolator; the held pistol jammer; shooting the fixture), at least one of them not a shot,

and in bible L8 replace "(switch, breakable lamp, the pistol and its held jammer (G152), and whatever else the research
keeps)" with "(switch, breaker or timed isolator, breakable lamp, the pistol's held jammer (G152))". Why "not a shot":
a shot lamp is loud, costs the rating and in co-op only the host's shot is authoritative (R2); the made dark should be
quiet first.

**LR6 - LD 6.3 and bible 6 timers.** Replace LD 6.3 with:
> 3. **The player sets the pace.** No area clock that fails the run. Device windows are allowed: a timed isolator, a
>    camera loop or a jam starts only when a player triggers it, shows its time on the device and in the objective
>    line, can be triggered again, and never fails the run by running out. Pressure comes from guards, light, noise and
>    those windows.

and in bible 6 "Never" replace "forced timers in stealth sections" with "area clocks that fail the run (device windows a
player starts are allowed, LD 6.3)". (Marlow SPEC P3 is the same item for the Yard.)

**LR7 - G225 and bible 7: the open floor's fill.** Amend G225's "keep the open floor at 0.30" to:
> Encounter spaces use a standby fill under the shadow line (0.14 in the light field: the facility's emergency and
> standby lighting); transit and rest spaces (lobbies, holding rooms, the lounge, the exit) keep 0.30.

and the bible 7 bullet (l.935) to "... and keeps transit and rest spaces at 0.30; encounter spaces keep a 0.14 standby
fill so a cut circuit is dark (LR1)". (Marlow SPEC P2 is the same item.) 0.14 is `LIGHT.shadow` x 0.5, the floor of
`visibilityFromLight`: below it a body is no harder to see, so a lower fill buys nothing for gameplay and only blackens
the picture.

**LR8 - LD 15 darkness acceptance.** Replace the "Darkness" bullet with:
> - Darkness: at each vantage a crouched still player stays under suspicious for a full patrol cycle (concealed by
>   occlusion or darkness); at each planned dark pocket the same; in each planned lit pool on a route he is noticed;
>   cutting the pool's circuit (switch, breaker or isolator) drops a body there under the shadow line for the meter and
>   the guards on host and client alike, and lures the guard.

**LR9 - Bible L7 clarified.** Append to L7:
> Darkness is the exception, not the default (LD 5.5): most of a level is lit as its building would be. The dark the
> players make or find is true dark.

**LR10 - The template and the space sheet.** In `docs/templates/map-spec.md` change the Theme line (l.92) to "Theme:
<time of day, the lit default and standby fill per space, faction, grade, weathers>" and the building brief's "Palette,
lighting character" line (l.60) to "Palette, lighting character (what is lit tonight and why, circuits, standby fill)".
In LD 13's space sheet, the Lights field becomes: "The lit default (fittings, circuits, levels); what cuts each circuit
(switch, breaker / isolator with its seconds, jam, shot); the dark pockets with their reasons; the ways to darken each
chokepoint."

**LR11 - Bible 7 light plan.** Replace l.947 with: "**Light plan per space:** the lit default (every lamp, its circuit
and switch), what cuts each circuit and for how long, the dark pockets with reasons, and which route each light change
opens."

**LR12 - LD 12.1 engine fact (record, not a design change).** Add: "Light group states reach the co-op client only in
Course mode and only for groups named in the course layout's `groups` (`courseMode.ts:730-734`); shot lamps likewise
(`lights.dead`). A map that wants a switch to work in co-op names its group there (Course mode) or waits for general
light sync (R2)." It becomes a rule-free fact once R2 is built.

Not proposed: lowering `LIGHT.shadow` / `LIGHT.lit`, brightening the darkness curve (`DARK_DESKTOP`), or letting the
picture show a dark area brighter than the meter. Each would break parity or retune guards on every map. If the made dark
reads too black on Michael's screen, raise the standby fill per space up to about 0.22 (still dark on the meter, still
under `COURSE_DARK` 0.25; renders about 5-8% on L5's scale) before touching any shared number.

## 4. What it means per map

### Marlow Yard (map `ctcourse`, Course mode; the campaign for now, G184)
- Today (code at master 4.63.x, counted by building the map in node): theme `lightLevel` 0.30 everywhere, no
  `ambientZone`, 31 lamps (intensity 0.35-0.9, radius 5-13), none in a group, no switches. So nothing can be cut
  except by the jammer or a shot, a shot lamp never comes back on a restart (`resetLights` returns early without
  groups, `courseMode.ts:679-684`), and the 0.30 fill keeps every floor over the shadow line.
- Under LR1-LR8: being rebuilt by marlow-final as a lit luxury facility with sets at a 0.14 standby fill, every lamp on
  a circuit, timed isolators (A2 15 s, A8 25 s) and named dark pockets. The full set-by-set plan, circuit tables and
  tests: `docs/marlow-final/LIGHTING-PLAN.md` and `src/world/lighting/`.
- If Michael says no: the Yard keeps 0.30 in the holding rooms and uses its isolations as guard lures only (SPEC P2
  fallback), and every vantage gets a dark pocket (SPEC P1 fallback).

### Sector Ops warehouse (map `warehouseOps`, Sector mode; Michael's playground, G185)
- Today: theme `lightLevel` 0.30 outdoors, but the shed floor sits in an `ambientZone` at 0.12 (`warehouse.ts:444`,
  x -24..24, z -18..18, y to 6.2), the lane behind the trailer 0.17 (`warehouseS1.ts:356`), the void 0.05
  (`warehouseS1.ts:396`); 133 fixed lamps (100 in groups; the rest include dead fittings at intensity 0), median
  intensity about 0.50 and radius about 3.7 m, 11 wall switches. Section light tests:
  `tests/warehouseS{1,2,3}Light.test.ts` (each fitting tuned to its bands, `lighting.md` "Fitting models").
- Under LR1: the shed is already "lit pools on a dark floor"; lit-by-default means more and wider fittings over the
  working floor so a standing player there reads 0.40 or more, with the 0.12 zone kept as the standby fill (already
  under the shadow line). The switches stay; LR5's "not a shot" is met where a pool has a switch.
- The Sector spec decides how far; the S1-S3 bands are re-tuned (`CTLIGHT_PRINT`-style print and re-tune) and the
  lamp grid cap re-checked (`tests/lampGridLossless.test.ts`).
- Co-op parity gap (R2): Sector mode syncs no light state to the client today (no group or dead-lamp sync outside
  Course mode). A switch pressed in co-op Sector Ops leaves the client's picture and meter lit while the host's guards
  read dark. Lit-by-default makes switches the main verb, so this needs fixing before Sector Ops leans on it.

### The campaign (first real mission map, G224; Kestrel paused, G53)
- No campaign mission map is being built now (Kestrel's lamps come from its own tables; its theme `lightLevel` is 0.22;
  the parked maps' themes sit at 0.05-0.45: Fallow bunker 0.05, seclab 0.10, mansion 0.20, embassy and port 0.22,
  refinery 0.45). A new map spec starts from the template with LR1-LR11 in force if Michael
  approves; otherwise from today's text, listing each lit-by-default choice as its own proposal.
- CT's own levels mix both: lit working areas and dark service areas, with the player killing lights to cross. LR1's
  "mixed spaces" clause covers it.

## 5. Risks
- **R1 Light parity.** Lit-by-default does not touch the light model, but it multiplies the things that can disagree:
  (a) glow-only decor (LED lines, signs) must dim with its circuit or the picture shows light the meter does not; the
  art kit's LED lines already do (`world/kit/kitRender.ts`, `groupLit` on `LightRegistry.version`), a plain box has
  no emissive option; (b) a lamp behind glass that passes light (collision-only glass, G45) lights the far side in
  the bake and the picture alike, so keep it short of the glazing if the far side must stay dark; (c) a fitting that
  is "off tonight" must be built dead (intensity 0), not as an off lamp in a group a restart switches on.
- **R2 Co-op sync.** Group states and shot lamps reach the client only in Course mode and only for the course layout's
  `groups` (`courseMode.ts:730-734`, `courseWire.ts:13`); Sector mode syncs none. Every switchable group in a co-op map
  must be synced or the client's meter and picture disagree with the host's guards. Course mode: list every group.
  Sector mode: a general light sync (a group / dead list in the snapshot, a wire change, `PROTOCOL_VERSION` bump).
- **R3 The meter thresholds.** Unchanged on purpose. Lit-by-default puts most of the floor in the mid band (0.28-0.6),
  where `visibilityFromLight` already gives guards 0.25-1.0 visibility; guards will see players more often and from
  further. That is the intended pressure ("light is danger"); the remedy is the players' dark, not a retune.
- **R4 Guard perception tuning.** Guards were tuned on dark maps. In lit spaces `PERCEPTION.rate` 2.2 and `focusRange`
  25 m make long lit sightlines deadly; layouts need occluders and short sightlines (LD 3.7) more than before. Also
  every investigating guard in a made dark takes a torch (`TORCH_DARK` 0.35), which lights the player: lure spots
  should be lit (no torch) or have a hide spot outside the torch's cone.
- **R5 Bake time and the lamp grid.** More lamps cost bake time (each lamp bakes a box over its reach at 0.2 m cells,
  `LAMP_CELL`) and the shaders hold 8 lamps per 2 m column (`LAMP_GRID_SLOTS`, `lampBake.ts:313-315`; a 9th is
  dropped for gameplay and picture alike). Prefer fewer, wider fittings to dense rows; give each map a lamp budget per
  space and a cap per column; LED coves as lit lamps 2.4-3.0 m apart with radius 3-5 m.
- **R6 The 48-light pool.** `MAX_REAL_LIGHTS` 48 (`lightRig.ts:19`) is the unbaked path's real-light pool (quality
  sets 8-32 nearest lit). With baked lamps (every path but `?gfx=min`) the pool holds only 4 moving lights
  (`BAKED_POOL`), so lamp counts do not touch it there; on `?gfx=min` the nearest 8 are real lights and the rest add
  through the field only. Keep decor lamps `electric: false` so they are not jam targets (`ctDevices.ts` makes every
  electric fixed lamp one). Volumetric haze takes the nearest 2-12 lights by preset (`VOL_LIGHTS` 12): dense decor
  near the camera crowds out the lamps that matter.
- **R7 Cameras.** Cameras ignore lamps (G240): lighting a space more changes nothing for them, and a made dark never
  beats one. Exercises pair dark against guards and the meter, and the jammer or a console against cameras.
- **R8 Performance.** More lit fittings mean more emissive instances and haze; one GPU perf run per changed map
  (Character Build), block only on broken until the playtest.

## 6. How to undo
- Each LR item is separate: say no to any and the standard's current text stands (nothing here was applied).
- A map built to LR1 reverts to dark by lowering its fittings' intensities (the per-space light tests print every
  point, re-tune the bands) and raising nothing else; standby fills stay (they are under the shadow line either way).
- LR7: put 0.30 back as the encounter spaces' zone ambient (one number per zone); isolations then act as guard lures
  only.
- LR6: timed isolators become held ones (dark while a player holds the isolator, the existing `timedHold` gate) and
  consoles stay off until a restart (today's behaviour).
