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

## 7. Walk 4.72 S1 (lamp output; LR13 proposed, NOT applied)
Written 2026-10-23 ~14:40 by the sector-redesign lighting reviewer (branch `feature/sector-redesign-lightrev`; this
section is appended to the shared file as it stood on `feature/marlow-final` at 6b211fb7; sections 0-6 are unchanged).
Raw numbers: `docs/sector-redesign/checks/light-measure.md`. Probe: `scripts/light-measure/`.

### 7.0 Michael's words (walk on 4.72, verbatim)
- S1 Sector Ops: "goods in seems brighter but the lights just dont light up everything like the would normally. theres
  so many lights but its still hard to see, are the lights actually outputting light as they should realistically??"
- M5 Marlow: "light above s2 locked door is on and half over both rooms but doesnt shed any light into the first room -
  lighting system doesnt seem to be working properly or spreading light as much as it should. not realistic."

Short answer: no, the lamps do not put out light as real fittings do. Parity is fine (the picture, the meter and the
guards read the same number); the formula they share is not physical, and most Sector Ops fittings were given a reach
about equal to their mounting height, so their light stops before it reaches the floor.

### 7.1 Findings
1. **One formula, linear to the radius.** Every baked lamp, in the meter, the guards and the picture, is
   `intensity x (1 - d / radius) x cone x baked visibility` (`lampMath.ts:27` `lampFalloff`; the field writes it out at
   `lightField.ts:242`; the shaders at `bakedLamps.ts:888` from `LAMP_MATH_GLSL`). A real fitting falls off with the
   inverse square of distance and has no hard end: its light reaches every surface in view, weaker with distance.
   Here the light is 0 at the radius, whatever is there.
2. **Radius about equal to mounting height.** Sector Ops (`warehouseOps`): median fitting height 3.4 m, median radius
   5.3 m (r / h 1.25); 31 of its 100 lit fittings put nothing on the floor straight under them, 58 under 0.25 of their
   intensity. The S1 Goods-in Bay strips hang at 5.58 m with radii 4.8-8.8 (`warehouseS1.ts:73`): 5 of 8 reach the
   floor with less than 0.1 of their light or none. Result over the bay (144 points): floor median **0.186**, 108
   points under the shadow line 0.28, none lit; standing bodies median 0.436 (heads are nearer the strips). Real
   fittings in the same places (12 000 lm LED high-bay battens, 45 degree optic, inverse square): **213-781 lux, median
   488** at chest height, a well-lit warehouse (task areas 100-200 lux, offices 300-500). The other maps: Saltmarsh
   Park r / h 1.77, master Marlow 2.3 (its pendants reach the floor); marlow-final's course 1.25 with 22 of 149
   fittings dark under themselves.
3. **The darkness curve hides the tails.** `DARK_DESKTOP` (`darkCurve.ts:39`) renders level 0.186 at 0.056 and 0.28
   at 0.096 (near black), 0.45 at 0.65. The little light that reaches the floor between the pools is crushed: the
   pools glow, the floor, racks and walls around them stay black. "So many lights but still hard to see."
4. **No bounce.** No inter-reflection anywhere. The fill is the zone's flat ambient (the shed 0.12), on or off alike.
   Walls take lamp light only through N.L of the direct term, ceilings none (the lamp hemisphere stops 3 degrees short
   of horizontal, `lampMath.ts:11`). A real room's walls and ceiling get a fifth to two fifths of the direct light back.
5. **M5 is the same cause, not a split fitting.** The lamp is master Marlow's `S2_TOP_LAMP` (`ctcourse.ts:83`, placed
   at `ctcourse.ts:534`): a 1.6 m strip at 7.35 m, 0.4-1.2 m past the 1 m thick, 4.4 m high station 2 wall, so from
   the first room it looks to hang over the wall and the door. Its radius is 7.6 m. The wall shadows the first room's
   floor for about 3.9 m; beyond that the floor is 8.3 m away, past the radius: it gets exactly 0. On the second room's
   floor it gives 0.02 at most; it lights only the wall top (0.35). No fitting in any map has its centre inside a wall
   (scan in the raw numbers); panels bake from one sample point (`lampBake.ts:71`), a latent risk for a future panel
   laid over a wall line, not today's bug. marlow-final's W5 (A2) is the Marlow lead's data fix.
6. **Render path against the meter.** Same function, same visibility, same column lists; the picture adds
   `LIGHT_GAIN` 1.6 / `LAMP_LEVEL_GAIN` 1.2, N.L, albedo and the character capsule shadows; on the smooth default the
   level's own boxes take their fill from the sky-visibility bake (`bakedLamps.ts:936-941`) rather than the gameplay
   grid. None of this is the walk's problem.

### 7.2 LR13 - one engine change: photometric lamp falloff (prototype in this branch, default off)
**Status (2026-10-23, Michael ~14:35 "Try it first"): prototype shipped default off (setting).** Settings > Gameplay >
"Lamp falloff: Classic / Realistic (test)" (`gameplay.lampFalloff`, default Classic), applied when a map loads (start
or restart the mission; `lampMath.matchLampFalloff` in `GameState.create`); `?falloff=photo` stays as a dev override. Co-op:
the host's choice rides the `start` message (`lf`, PROTOCOL_VERSION 38) and the client's row is locked to it. Build
report: `docs/sector-redesign/checks/lr13-build.md`. Not adopted: no map re-tune; the default flip is still the
"If adopted" step below.

**What.** Baked lamps fall off with the inverse square, as a real fitting does, referenced so that a lamp's intensity
is its level on axis at 3 m, and fade smoothly to 0 at a reach of 1.6 x the authored radius (the glTF / Babylon
`FALLOFF_GLTF` window):

    falloff(d) = (3^2 / max(d, 1)^2) x (1 - (d / R)^4)^2,   R = 1.6 x radius

Cone, N.L, baked visibility, closed doors, the column lists, the thresholds (`LIGHT` 0.28 / 0.6), the darkness curve,
the zone fills and the flashlights are unchanged.

**Code (prototype; now the setting, `?falloff=photo` a dev override):** `lampMath.ts` `PHOTO` {ref 3, near 1, reach 1.6},
`setLampFalloff` / `lampFalloffMode`, `photoFalloff`, `lampReach`, `LAMP_MATH_GLSL_PHOTO` / `lampMathGlsl()`;
`LightRegistry.add` scales a fixed lamp's radius by `lampReach` once (so the bake boxes, the 2 m column lists, the
field and the shaders read one reach; flashlights keep theirs); `LightField.lampInto` takes the photometric branch
(read once per field); `bakedLamps.ts` builds its lamp loop and the editor's volume mix from `lampMathGlsl()`;
`flags.photoLamps` and one line in `main.ts`. Test: `tests/lampFalloff.test.ts` (default unchanged; formula; registry
scaling; the field equals the GLSL formula with the bake's visibility).

**Effect, measured with the real bake** (`light-measure.md`):

| | Today | LR13 |
| --- | --- | --- |
| S1 bay floor median / under 0.28 / lit | 0.186 / 108 of 144 / 0 | 0.431 / 22 / 19 |
| S1 bay standing body median / under 0.28 / lit | 0.436 / 19 / 7 | 0.721 / 1 / 100 |
| S1 bay floor on screen (curve) at the median | ~0.056 (black) | ~0.58 (readable) |
| Marlow S2 lamp on the first room's floor (x 26-28) | 0 | 0.02 |
| Marlow S2 floor overall (pendants, radius 13) | 0.83-0.9 | 0.56-0.68 |
| warehouseOps lamp bake (node) / visibility atlas | 5.9 s / 11.3 MB | 16.5 s / 30.1 MB |
| Lamps in reach of a point in the bay (median / max) | 2 / 5 | 6 / 9 (8 kept per column) |

Every fitting reaches the floor and every surface in its view, pools overlap into an even working light, and the
gradients are soft. Intensities authored for the linear model do not carry over one to one: tight-radius lamps
(Sector Ops) get brighter, wide-radius lamps (Marlow's 13 m pendants) darker. Adopting it means one re-tune per map.

**Stealth balance.** A lit working space reads lit (the S1 bay: 100 of 144 standing points lit, from 7) and the dark
between pools mostly goes, so a crossing needs the circuit cut, the jammer or a shot (LR1: the players make the
dark). Cutting a circuit is still true dark: the lamp's whole term goes with it (no bounce term survives a cut) and
the standby fills (0.12 / 0.14) do not change. Guards see further across lit floors (R3, R4): layouts lean on
occluders and short sightlines. Dark pockets can no longer come from a short radius ("a corner no fitting reaches"
must be out of the fittings' view, a dead fitting or a cut circuit). Meter thresholds and perception are not retuned.

**Light parity.** One function for gameplay and picture: TS (`photoFalloff`, written out in `lightField.ts`) and GLSL
(`LAMP_MATH_GLSL_PHOTO`) from the same constants; the registry holds the one reach. Unchanged gaps: `?gfx=min` (no
bake) keeps the linear `lampTerm` for the meter and Babylon's linear range for its real lights, both with the longer
reach (consistent with each other, not photometric); co-op peers must run the same mode (a URL flag now; a default
once adopted).

**Costs and risks.** Bake time and the R8 visibility atlas grow about 2.7-2.8x on Sector Ops (reach 1.6; reach 1.4
would cost about two thirds of that); more lamps per 2 m column (the 9th nearest is dropped by meter and picture
alike, small under an inverse square; `tests/lampGridLossless.test.ts` would fail in this mode until the grids are
re-checked); a longer per-pixel lamp loop (a GPU perf run before adopting). Volumetric haze and night-vision glare read
the registry radius (longer) and need a look.

### 7.3 Level design Section 12 and the decisions that relied on the old fact
`docs/level-design.md` Section 12 lists no lamp falloff today. If LR13 is adopted it gains: "Lamps: inverse square from
3 m, reach 1.6 x the authored radius (`lampMath.ts` `PHOTO`); a dark pocket comes from occlusion, a dead fitting or a
cut circuit, never from a short radius." Decisions that relied on the linear reach and get re-tuned:
- Sector Ops `warehouseOps` S1-S3 lamp tables (`warehouseS1.ts`, `warehouseS2.ts`, `warehouseS3.ts`; sector-fixes L,
  warehouse-s23 M1), each fitting tuned to `tests/warehouseS{1,2,3}Light.test.ts`, including the dark pockets kept by
  short radii (spawn corner, trailer lane, shelter, skip, charger corner, east corridor end) and the 0.30 roof.
- Saltmarsh Park `campusOps` S1-S5 fittings and their light tests (sector-redesign SPEC light bands).
- Marlow Yard: master `ctcourse` spot levels (`tests/ctcourseLight.test.ts`, `ctcourseLight.tuned.json`); the
  marlow-final LIGHTING-PLAN circuits and levels (`src/world/lighting/`, `MARLOW_LEVEL`, pocket maxima).
- Warehouse (`warehouse`) floor bands (the 3.5 band behind `LAMP_LEVEL_GAIN` 1.2, `lampMath.ts:19-24`).
- `tests/lampGridLossless.test.ts` (8 lamps per 2 m column) and the lamp bake budgets.
LR7's standby fills, the meter thresholds, the darkness curve and the cameras' IR (G240) do not depend on it.

### 7.4 Test plan
1. Unit (done): `tests/lampFalloff.test.ts`; `tests/lightField.test.ts` and `tests/lights.test.ts` unchanged and green.
2. Node bake, every map, both modes (`scripts/light-measure/`, `PROBE_PHOTO=1`), and each map's light test run once
   under `setLampFalloff('photometric')` to list the bands that move (the re-tune list).
3. GPU (Test Runner, port 4189, `E2E_GPU=1`): `e2e-darkness` and `e2e-lightbake` with `?falloff=photo`: the shader
   compiles; rendered luma at fixed S1 bay and Marlow S2 points against the field's level through `darkCurve`
   (parity); `DARK_TARGETS` bands.
4. Perf: bake time and atlas memory on warehouseOps, campusOps and the marlow-final course; frame time in the S1 bay,
   photo against linear (`docs/systems/performance.md`).
5. Co-op: host and client both on the flag; the client's meter against the host's perception at the S1 points.
6. Michael walks S1 goods-in and Marlow station 2 on a preview with `?falloff=photo` against the default.
If adopted: the default flips in one PR with the map re-tunes (one slice per map), `lighting.md` and level-design 12.

### 7.5 Considered, not proposed now
- Data only (no engine change): every radius at least 1.6 x its mounting height, with a `lampMount.ts` check. Lights
  the floors, keeps the hard linear pool edge and the dead tail; a re-tune per map all the same.
- A baked bounce term per lamp (switches with its lamp, so the made dark stays dark): lights walls, ceilings and
  corners; a new bake, a shader term and its own parity test. The natural second step after LR13.
- Brightening the darkness curve or raising zone fills: breaks "darkness is dark" (L7) and makes a cut circuit not
  dark. Rejected, as in section 3.
- A fitting check that rejects a footprint across a wall line (a data guard for M5-like layouts).

## 8. LR16 (2026-10-23): one light model
- Michael 2026-10-23 ~18:08: "the edge of lights should diffuse against walls/floors/etc unless something directly cuts off the light ray, depending on how far away it is. Must be realistic depiction of light". ~18:12: "Disable returning to original lighting system, focus on only the one new system".
- LR16a removed the toggle and Classic: one photometric model, the `?falloff=photo` switch, the Settings row and the co-op falloff field (`start.lf`, `RejoinRecord.lf`) are gone.
- LR16b made the edges soft (feathered cone, smooth near term); LR16e (contact-hardening penumbra in the bake), LR16-1 (one-bounce fill in the ambient grid's G channel), LR16t (torch shadow atlas) and LR16g (map re-level, lifts pools) change the rest of the model.
- Plan: `docs/sector-redesign/checks/lr16-plan.md`.
