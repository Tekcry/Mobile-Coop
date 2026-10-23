# Marlow Yard - Lighting Plan (marlow-final)

Status: PLAN, written 2026-10-23 ~01:50 by the lighting agent. Nothing in `docs/level-design.md`, the template, the
bible or DECISIONS is changed; every rule change is a proposal for Michael. Code: `src/world/lighting/` (pure, new) and
`tests/marlowLighting*.test.ts`. Sources read: BRIEF (M5, M6), SPEC 5-9, 14, 15 and the A1-A8 sheets, CONSTRAINTS,
COOP-INVENTORY, KIT, `docs/systems/lighting.md`, level-design / bible / DECISIONS (grep), the orchestrator's gap list
(`C:/NightShift/scratch/marlow-coop-gaps.md` rows 1, 9 and "Open risks"), and the light code cited in section 4.

The model in one line (M6): **every set is lit as its real site would be with the crew at work; the pair makes the dark
(switches, timed isolators, the jammer; a shot is the loud last resort); a few mixed-zone pockets are dark because the
real building has no light there.**

## 1. Rule review (M6)

The full review, for every map, is `docs/lighting-review/PROPOSAL.md` (Michael's 01:40 note: "the player may have to
make shadows"): every darkness / light / shadow rule with its source line, keep or change, proposals LR1-LR12 with the
exact new wording, per-map state (Marlow, Sector Ops, the campaign), risks and undo. Nothing there is applied.

What Marlow Yard needs from it, and what it does if Michael says no (the design works under today's rules only with
the fallbacks below):

| Marlow need | Rule today (source) | Proposal | Same as SPEC 15 | Fallback under today's rules |
| --- | --- | --- | --- | --- |
| Sets lit by default, pockets named | LD 5.1 l.71 already says "Darkness is where nobody works at night"; no rule says levels are dark, but the bible's L7 reads that way | LR1 (new LD 5.5), LR9 (L7 note) | P4 | None needed: LD 5.1 allows it. LR1 makes it the standard for every map |
| A cut circuit is truly dark | G225 "keep the open floor at 0.30" (DECISIONS l.1204; bible l.935): 0.30 > `LIGHT.shadow` 0.28 | LR7: sets at a 0.14 standby fill, 0.30 kept in the lounge, holding rooms, dock | P2 | Sets at 0.30: isolations, switches and jams become guard lures only; the meter never reads dark on a set floor |
| Timed isolations (A2 15 s, A8 25 s) | LD 6.3 l.86, bible 6 l.914 "No forced timers in stealth sections" | LR6: player-started device windows | P3 | Held isolators (`timedHold`: dark while held + 6 s), consoles off until restart |
| Concealed entry vantages in lit sets | LD 3.1 l.30 "a dark vantage" | LR2: concealed by occlusion or darkness | P1 | A dark pocket at each vantage (A2 west doorway, A3 west lobby, A4 passage mouth, A5 bund; A6 and A8 already open on dark pockets) |
| Lit holding rooms as checkpoints | LD 3.9 l.49 "in the dark, out of every guard's view" | LR3: dark, or a quiet connector no guard enters | not in SPEC 15 (new) | Holding rooms at 0.30 fill with no lamp over the pad (the pad reads mid, not dark: still a breach; needs LR3 or dark rooms) |
| Isolation moments in lit spots (A3 office 3 desk, A4 kettle, A7 south aisle) | LD 4.4 l.58 "alone, in the dark and unwatched" | LR4: dark or darkenable from cover at that moment | not in SPEC 15 (new) | Each isolation spot gets a dark pocket or its own switch the cleaner / loader / technician stops beside |
| "Darken two ways" without the EMP | LD 5.2 l.73 lists the EMP (gone, G152) | LR5 (wording; one way not a shot) | - | Met as written by switch / isolator + jam + shot |
| Darkness acceptance test | LD 15 l.278 | LR8 | - | e2e checks every vantage for darkness: fails in lit sets without the fallback pockets |

Marlow-specific readings that need no proposal:
- Cameras see in the dark (G240): no exercise uses dark against a camera (A3, A4, A7, A8 beat cameras with the jam, the
  loop or timing).
- LD 16.8.1 / 5.1: every circuit in section 3 has an owner, a fitting and a switch by a door or a stated reason
  (house circuit, photocell, device supply, tagged out); `validateMarlowCircuits` enforces it.
- Glass: SPEC 5 asks for the gallery glazing as a solid light blocker; the kit's glass is collision-only and passes
  light (G45, KIT 1). Both are rule-compliant; this plan takes the kit's glass and keeps parity by the spill rule
  (section 2), so no rule change.

## 2. Facility lighting language

**Levels** (light-field units, a standing body's `LightField.bodyLevel`; `MARLOW_LEVEL` in
`src/world/lighting/levels.ts`, every number read from code and checked by `tests/marlowLightingCircuits.test.ts`):

| Name | Level | Meaning | Read from |
| --- | --- | --- | --- |
| `standby` | 0.14 | Every set's `ambientZone`: the maintained emergency and standby lighting under the cut circuits | `LIGHT.shadow` x 0.5 (`lights.ts:76`): the floor of `visibilityFromLight` (`lights.ts:345-348`), so a lower fill hides nobody better |
| `house` | 0.30 | Lounge, holding rooms, cash dock, gallery (the theme's `lightLevel`, G225) | `ctcourse.ts:379` |
| `cutMax` | 0.24 | Most a body reads in a cut circuit's area (circuit off, the rest as at the set's start) | Under `COURSE_DARK` 0.25 (`config/course.ts:32`) and the meter's 0.28 |
| `pocketMax` | 0.22 | Most a crouched body reads in a permanent dark pocket | Under `cutMax` |
| `readMin` | 0.40 | Least on a set's lit walkable floor: mid band, surfaces read (bible L5: 0.40 renders 12-35%) | `LIGHT.shadow` 0.28 < 0.40 < `LIGHT.lit` |
| `poolMin` | 0.60 | Least at the centre of a lit pool a route must cross: the meter shows lit | `LIGHT.lit` (`lights.ts:78`). SPEC 7 suggested 0.55; assumption L-A1 sets the meter's own line |
| `torchDark` | 0.35 | An investigating guard whose head reads under this takes his torch (keeps it to 0.45) | `TORCH_DARK` / `TORCH_KEEP` (`ai/archetypes.ts:143-144`) |

Meter thresholds stay 0.28 / 0.6 (bible L6). The darkness curve is untouched: a cut set renders near-black (L7); if
Michael finds the cut too black, raise a set's standby to at most 0.22 (still dark on the meter) before anything else.

**LED coves as the read light (M5, A6).** The facility's coves are the kit's lit slots (`FacilityKit.ledSlot`, one
baked lamp per <= 2.4 m, `SLOT_SEGMENT`) and accent lines (wall panel coves, skirting, columns, handrails: no light,
dimmed with their `group` by `kitRender.ts:153-168` on every `LightRegistry.version` change). Rules:
- A lit cove lamp is a real fitting: on a circuit from section 3, 0.3 m off its wall face (the bracket rule in
  `lampMount.ts`, so the conservative bake sees past its wall), radius 3-5 m, 2.4-3.0 m apart; rooms at y 2.95,
  halls' coves above a set are accent-only (`light: false`) or on the set's general circuit. A house-circuit lamp
  (group 90-98, 10, 34) never stands inside a set's walkable reach: a cut set must go dark.
- Every accent line inside a set carries the circuit of the lamps it stands for (`group`), so it goes dark with them;
  the strip never glows brighter than its lamps (SPEC 6). Glow with no group is allowed only in the gallery and the
  holding rooms (house circuits, never cut). There is no other glow-only decor in the engine today (`LevelBuilder.box`
  has no emissive; gap list row 9): signs, status bars and ready lamps are kit / device emissives, never `LightDef`s.
- Decor lamps (the gallery) are `electric: false, destructible: false` so they are not jam targets
  (`ctDevices.ts:350-353` makes every electric fixed lamp one) and cannot be shot.

**Warm / cool.** The kit's tones (`LED_TONES`, `facilityKit.ts:83`): warm 3000 K for the luxury shell (lounge, gallery,
dock, A8's banking hall); cool 5000 K for the holding rooms' floor wash and A7's data hall; neutral white for the
working sets (shed, offices, warehouse, substation, pump house); sodium for A1's yard and apron lamps and A5's flood (a
real outdoor fitting copied indoors). Colour is rendering only (`LightDef.color`); gameplay reads intensity.

**The gallery glow.** The instructor gallery (y 4.5, house circuit 90, about 30 lamps) reads as a warm lit box from
every set but lights none of them: each gallery lamp's reach stops 0.3 m short of its glazing plane (`spillsPast`; under LR16 the reach is the authored radius x 1.6, so radius <= (distance to glazing - 0.3) / 1.6),
so the falloff is zero before the glass in the bake, the meter, the guards and the picture alike. The glazing itself is
the kit's collision-only glass (passes light, blocks movement, bullets and guard sight). The gallery's coves and desk
lights are the lit look; the instructors are static figures (no perception).

**Emergency lighting when a circuit is cut.** A cut circuit leaves the set's standby fill (0.14: the maintained
emergency lighting, real), the door status bars and exit signs (kit emissives, no light), and any device's own supply
(A5 kiosk 53, A6 cage 63, A7 pod 73, A8 vault lobby 84) tuned so a body beside it stays under `cutMax`. No
non-maintained emergency bulkheads switching on with a cut (an inverse group): not needed for the read, and it would
need N2 to drive two groups. Kept as a later option (section 6).

**Engine budgets per set** (`MARLOW_LAMP_BUDGET`): at most 24 baked lamps per set, 24 per 2 m bake column (`LAMP_GRID_SLOTS`; 8 before LR16)
(`LAMP_GRID_SLOTS`, `lampBake.ts:313-315`; `lampsPerColumn` estimates it before the bake), 200 in the map (planned
~150: sets ~103 with the lounge's 4 in A1, holding rooms 14, gallery 30, dock 2; today 31). The 48-light real pool (`MAX_REAL_LIGHTS`,
`lightRig.ts:19`) is the unbaked path's only: with the bake the pool holds 4 moving lights (`BAKED_POOL`), so the
lamp count costs bake time (0.2 m cells over each lamp's reach) and draws, not pool slots. Adding lamps changes the
bake key: each set's slice rebakes and re-tunes its light test.

## 3. Per-set plan (A1-A8 and locks)

Circuit table: `MARLOW_CIRCUITS` (`src/world/lighting/marlowCircuits.ts`), one row per group with its owner, fitting,
switches (plan hints, builders may move them 1 m), the ways to cut it, the guard it lures and the planned lamp count.
Group numbers 10 x set + k (SPEC 9); facility 90-98. Pockets: `MARLOW_POCKETS`. Zones: `MARLOW_ZONES` (sets 0.14,
lounge 0.30; holding rooms, gallery and dock take the theme's 0.30). "Lure" means `EnemyManager.lightsOut`
(`enemyManager.ts:268-287`): the nearest calm guard within 25 m walks to the switch; others within 14 m turn to look.
A jam never lures (no `lightsOut` call in `jammer.ts` / `ctDevices.ts`): it is the silent dark.

Light parity check, every set (the per-set light test and the e2e in section 5):
1. Every registry lamp in the set has a group from the table (the Yard's lamp loops at `ctcourse.ts:400, 403` set none
   today); every live group is in `course.groups` (else the client never hears a switch: `courseMode.ts:730-734`).
2. With every circuit on: lit pools >= 0.60, read floor >= 0.40, pockets <= 0.22 (baked field, `bodyLevel`).
3. With the exercise circuit off: its area <= 0.24 for the meter and the guard's sample alike (one field).
4. Every kit LED line in the set has its circuit's `group`; none has a house group.
5. No house or gallery lamp reaches a set's walkable sample point (spill test).
6. Host and client read the same `lightLevel` at the set's check points with the circuit on and off (e2e two pages).

### Lounge, holding rooms L1-L7, cash dock
- Lit default: house circuits 10 (lounge), 91-97 (L1-L7), 98 (dock); warm coves in the lounge and dock, a flush LED
  panel and a cool floor wash in each holding room (2 lamps). Fill 0.30. No switch: the instructors' house circuit
  (stated reason). Jammable and shootable; restored on a restart because they are in `course.groups`.
- Dark pockets: none. Meter: mid / lit. No guard ever enters (SPEC 9), so LD 3.9's "dark checkpoint" needs LR3.
- Parity: the glass slot into the next set is collision-only glass: a holding-room lamp must stop short of it
  (`spillsPast`) so it does not light the set's first 6 m; the door status bars are kit emissives.

### A1 the Gate (unguarded teach set)
- Lit default: lounge 10 (house), apron 11 (photocell bulkhead on the cabin, sodium), yard 12 (3 bulkheads on the
  boundary wall's yard face, switch in the cabin by its door), cabin 13 (panel, switch by the cabin door). 9 lamps.
- Cut: switches only (yard, cabin); no timer. Toys: the two switches, the apron lamp (jam / shoot).
- Pockets: none (no perceiving guard: the checker sees and hears nothing).
- Meter / guards: the apron, the striped mark and the wicket read lit (>= 0.60 at the wicket, so the bolt reads); yard
  off -> the yard at standby (dark). The checker is passive in every state.
- Parity: the hall's coves above the 4.4 m wall are accents on group 12 or lamps on 12; never the lounge's 10.

### A2 the Carriage Shed (timed light isolation)
- Lit default: shed general 20 (6 strips over the rakes, switch by the west door), neck 21 (4 high-bays over the
  neck, the pool), cabin 22 (panel over the desk, switch by the cabin door), staging 23 (4 strips, switch at the east
  stair head, y 4.4). 15 lamps.
- Timed: 21 on two isolators (cabinet 1 in the cabin, cabinet 2 by the east door), **15 s cut, 3 s re-arm** (L-A2);
  presses while cut or re-arming do nothing. The crossing is 10 m (5.9 s at 1.7 m/s, 9 s spare); cabinet 1 to far cover
  is 26 m (15.3 s): one player cannot press and cross (checked in `MARLOW_TIMED`).
- Pockets: the cabin's coat corner `a2-coat` (A hides there; takedown spot).
- States:
  - Start: neck >= 0.60, shed floor over the rakes >= 0.40, coat corner <= 0.22. The shunter sees a body in the neck.
  - Neck cut: the neck <= 0.24 for the meter and the shunter. Shed general 20's strips stop short of the neck (their
    reach is the rakes), else the cut does not darken the crossing. The shunter is lured to cabinet 1 **only from within
    25 m**: from his post (51, 10) yes (22 m), from the east end of his loop (x 66) no (36 m). Press while he is at the
    post or walking west (the objective line and LANTERN say "while the shunter is at the neck").
  - The lured shunter is investigating in the dark neck, so he takes his torch (head under 0.35) and keeps it until
    his head reads 0.45 (the lit cabin): **B crosses behind him** (the torch looks where he walks). At cabinet 1 the
    cabin is lit by 22 (no torch there); A waits in the coat corner (crouched, still, <= 0.22) for the takedown.
  - Second pass (cabinet 2): the lure reaches him only from within 25 m of cabinet 2 (east of about x 45); if A took
    him down, nobody comes.
- Chokepoint (neck): darkened by the isolators, the jam (one high-bay at a time) or shots; avoided by the staging.
- Parity: the high-bays' kit LED lines (if any) on 21; restart restores 21 and re-arms the schedule.

### A3 the Office Range (timed jam relay)
- Lit default: corridor 30 (6 recessed panels, switch in the west lobby), offices 31-33 (2 panels each, a switch inside
  each office door), lift lobbies 34 (the landlord's timer circuit, no switch). 14 lamps.
- No timer. The camera ignores light (G240): the corridor stays lit on purpose so the meter and the camera tell the
  same story (lit, seen); a player who switches 30 off is dark to the cleaner, never to the camera.
- Pockets: none. Isolation moment: office 3's far desk, lit but darkenable by office 3's switch (LR4).
- States: corridor >= 0.60 (pool), offices >= 0.40. Office off -> that office <= 0.24, the cleaner lured to its switch
  (each office switch is within 25 m of his desks).
- Parity: frosted partitions are collision-only glass (pass light): an office lamp lights the corridor through them
  in the bake and the picture alike; the corridor test reads with the offices on and off.

### A4 the Goods Shed (security room loop; dual takedown)
- Lit default: security room 40 (2 panels, switch by the door from L3), floor high-bays 41 (8, switch at the dispatch
  office door: the lure for D1), racking aisles 42 (6 strips, switch at the west end), mezzanine 43 (4 strips, two-way
  switches at both stair heads, y 3.3), bulk-store row 49 dead (motion sensors off tonight). 20 lamps.
- No light timer (the 60 s window is the camera loop, N3: cameras ignore light).
- Pockets: the south back aisle `a4-back` (the shadow route; it crosses C2, which still sees).
- States: main aisle >= 0.60; aisles >= 0.40; back aisle <= 0.22. Floor off (dispatch switch) -> the floor <= 0.24
  except the aisles' 42 strips (keep them short of the main aisle), D1 lured to the switch with his torch on (the
  dispatch office has no lamp of its own tonight: the loaders work by the high-bays through its glazing): take him
  from behind (the torch faces the switch). D2 at the kettle in the unlit office is the pair's dark isolation moment.
- Parity: the mezzanine's 3.3 m deck lamps do not light the floor aisles below past 0.24 when 41 is off (or the cut
  does not darken the aisle the shadow route needs).

### A5 the Substation (partner throw; jam the light)
- Lit default: apron 50 (3 bulkheads, switch at the L4 door), inner zone 51 (3 bulkheads: inner wall, south wall and switchroom face, and the switchroom panel; switch
  inside the switchroom door: lures the patrol there), kiosk flood 52 (photocell spot on the switchroom face: jam or
  shoot only), kiosk panel 53 (its emergency supply). 9 lamps.
- No timer: the jam's own window (0.5 s flicker, held up to 5 s, 4 s off, 0.5 s flicker on: about 9.5-10 s dark,
  `JAM_LIGHT`, `jammer.ts:43-48`) covers B's 8 m kiosk crossing (4.7 s).
- Pockets: `a5-landing` (box 53.5-57.7 x 34-39.5: the throw's landing; no fitting reaches it, the flood's cone and radius stop short and pen 2 shades the switchroom bulkhead), `a5-pen1` (box 40.3-42.5 x 28-31.5, behind pen 1's transformer outside the flood's cone: the patrol's isolation moment).
- States:
  - Start: kiosk strip >= 0.60 (the flood), inner zone >= 0.40, pockets <= 0.22.
  - Flood jammed: the kiosk strip <= 0.24 **with 51 and 53 on**: the inner-zone bulkheads stand on the pen side with
    reach short of the strip, and the kiosk's panel light is a small fitting (radius about 1.2 m) that lights the panel,
    not the operator. The patrol does not notice a jam (no lure).
  - Inner switched off (51): the zone at standby except the flood strip; the patrol lured to the switchroom door with
    his torch on.
- The beams are IR (night vision only), not light: no parity term.

### A6 the Pump House (hang-down; rope)
- Lit default: pump floor high-bays 60 (3 over pumps 1-2 and the desk, switch by the outfall door), gallery strip 61
  (a pendant over the bridge and 2 bulkheads on the gallery wall, switch at the stair head, y 4.4: lures the attendant to the gallery front by the stair head),
  desk lamp 62 (switch on the desk), cage work light 63 (the drive panel's own circuit), sump bay 69 dead (tagged out:
  the SW corner, pump 3 and the gallery's west end dark). 8 lit lamps.
- No timer (the hold is N4's 3 s).
- Pockets: `a6-sump` (entry vantage from L5), `a6-west` (y 4.4: the leg-up and rope), `a6-westfloor` (floor, 40.3-46 x 66-69.6: the leg-up spot under the tagged-out gallery fittings), `a6-pump3` (isolation moment).
- States: east end >= 0.40, the desk and stair foot >= 0.60, the cage lit by 63 (B hanging in it is lit: the tension;
  A watches the attendant), pockets <= 0.22. Gallery off (61): the gallery's east part at standby; the attendant comes
  to the gallery front by the stair head. Floor off (60): the cage becomes the one lit box in the dark: advise against it during the hang.
- The outfall interlock lamp (red / green) is a device emissive, not a `LightDef` (no jam target, no light term).

### A7 the Data Hall (split paths; synced hack)
- Lit default: rack rows 70 (6 strips, switch in the entry lobby), aisle ends 71 (2 bulkheads, switch at the south
  aisle's west end: lures the technician), plant corridor 72 (4 bulkheads, switch at its west door), pod 73 (the cage's
  own control). 14 lamps, cool.
- No timer. Cameras ignore light; the jams are the solo stealth test.
- Pockets: none (rack-row ends and the coat bay are hide spots). Isolation moment: the south aisle's west end,
  darkenable by 71 (LR4).
- States: aisles >= 0.40, the cage front >= 0.60, plant corridor >= 0.40. Aisle ends off -> the south aisle <= 0.24
  and the technician lured to the switch.
- The terminals' ready lamps are device emissives (render only).

### A8 the Strongroom (graduation)
- Lit default: the night circuit 81 (front chandeliers over the night desk and the counters' front, counter lamps: 7,
  warm), gallery wall lights 82 (3, east bays only, switch at the public stair head, y 4.4), security office 83 (2,
  switch by its door, y 4.4), vault lobby 84 (2, the time lock's circuit). 14 lamps.
- Timed: 81 on the lighting board under the gallery, **25 s cut, 5 s re-arm** (L-A2); the grille is a `mains` gate on
  81 (`courseState.ts:194-201`), so the light window is the lock window. N1 is lured from the night desk to the board
  (about 14 m) and takes his torch (the board is under the gallery slab, dark when 81 is cut).
- Pockets: `a8-vest` (vestibule, entry vantage), `a8-west` (the hall's west bays: the boost and the cross-level jam spot
  behind the counters). The SPEC's "dark centre" is these west bays: the night circuit lights only the front (a real
  bank's night lighting), a mixed zone.
- States:
  - Start: the front (night desk, counters' front, the grille) >= 0.60; the gallery's last 10 m lit by 82 (C2 sees
    it anyway); west bays and vestibule <= 0.22.
  - Night circuit cut: the front <= 0.24 for 25 s; the grille unlocks; B crosses about 20 m to the grille (11.8 s,
    13 s spare) while N1 walks to the board; N2 within 14 m turns to look (suspicious, no torch). At the restore the
    grille relocks unless both are in the exit airlock; a relock only flags the door (`doors.ts:200-202`): an open
    grille is not forced shut on a player.
  - Shots: shooting every 81 lamp opens the grille for good (`groupBaseOn` false), the loud route; one lamp left keeps
    it shut. A jam never opens it (the base state ignores jams, `lights.ts:332-341`). A restart restores the lamps and
    relocks it.
- Parity: the gallery's 82 lamps sit above the gallery slab; the board under it is dark when 81 is cut.

## 4. Code the plan needs

**Exists (file:line):**
- Registry: `LightRegistry.setGroup` (`src/world/lights.ts:239-253`), `restore` (:266), `baseOn` / `groupBaseOn`
  (:220, :334-341), thresholds `LIGHT` (:74-81), `visibilityFromLight` (:345). Zones: `LevelBuilder.ambientZone(minX,
  maxX, minZ, maxZ, ambient, minY, maxY)` (`levelBuilder.ts:424`), smallest zone wins (`lights.ts:166-180`).
- Switches: `MapLayout.switches` (`mapDef.ts:65`), built and toggled in `stealthSystems.ts:67-75, 412-428` (every
  switch on the circuit follows, lights-out lure on off), `syncGroup` (:679).
- Lure: `EnemyManager.lightsOut` (`enemyManager.ts:268-287`, 25 m / 14 m). Torches: `torchRule` (`archetypes.ts:156`),
  `TORCH_DARK` 0.35 (:143); slots on dark maps (`torches.ts:35`: ambient or any zone under 0.5).
- Course: `CourseLayout.groups` (`courseDef.ts:336`), `MainsGate` (:59), `courseState.setGroup` mains (`courseState.ts:194-
  205`), the mode reads groups on a registry change (`courseMode.ts:493-499`), `resetLights` (:679-689, returns early
  without groups), the wire's `lights.groups` / `dead` (:730-734, `courseWire.ts:13`), the client's apply (:905-916).
- Jams: `JAM_LIGHT` (`jammer.ts:43-48`), every electric fixed lamp a jam target (`ctDevices.ts:350-353`).
- Kit: lit slots and grouped accent lines (`world/kit/facilityKit.ts`, `kitRender.ts:153-168`).
- Today's Yard: 31 lamps, no group (`ctcourse.ts:400, 403`), no switches, no zones, `lightLevel` 0.30 (:379).

**New (this agent, pure, Babylon-free, tested):**
- `src/world/lighting/levels.ts`: `MARLOW_LEVEL` targets, `meterBand`, `lampLevel` (the registry's own formula),
  `bodyEstimate` (allocation-free), `poolIntensity` (solve a fitting's intensity for a pool), `coveRow`, `spillsPast`
  (the gallery / glass rule), `lampsPerColumn` (the per-column estimate against `LAMP_GRID_SLOTS` 24).
- `src/world/lighting/circuitSchedule.ts`: `CircuitSchedule`, the timed isolator core: press (cuts a ready circuit),
  step (cut -> restore -> re-arm -> ready, overshoot carried), event bits (`EV_CUT`, `EV_RESTORE`, `EV_WARN` at 5 s
  left, `EV_READY`), `remaining` for the objective line, `reset` for a restart, `setPhase` for a mirror. Typed arrays,
  no per-step allocation.
- `src/world/lighting/marlowCircuits.ts`: `MARLOW_CIRCUITS` (44 rows), `MARLOW_ZONES`, `MARLOW_POCKETS`,
  `MARLOW_TIMED`, `MARLOW_ROOMS`, `MARLOW_LAMP_BUDGET`, `marlowCourseGroups()`, `marlowWallSwitches()`, `circuitOf`,
  `validateMarlowCircuits()` (numbering, switch-or-reason, isolators timed and free of plain switches, two ways to cut
  a pool and one not a shot, jam / shot only where electric / destructible, decor lamps neither, lure range from a
  switch, per-set and map lamp budgets, every set has a lit read circuit and a switch, timed windows cover the crossing
  and beat a lone player, pockets inside their set).

**Integration for slice 0 (not this agent's files):**
1. Map (`src/world/maps/ctcourse*.ts`, the set builders): `course.groups = marlowCourseGroups()`; every `b.light` /
   `kit.ledSlot` takes its row's `group` (fix the loops at `ctcourse.ts:400, 403`); dead fittings at intensity 0 on
   groups 49 / 69 (never in `course.groups`, so a restart does not light them); gallery lamps `electric: false,
   destructible: false` on 90 and `spillsPast` false against their glazing; `switches` from `marlowWallSwitches()`
   (position, yaw from the wall, `group`); one `b.ambientZone` per `MARLOW_ZONES` row; theme `lightLevel` stays 0.30.
2. N2 isolator gate: the slice 0 course agent is building it in the working tree now (`IsolatorGate { kind:
   'isolator', switchIds, group, seconds, rearm? }` in `courseDef.ts`, its timer on `gates[].t` / re-arm on
   `gates[].tb`, a `gateWarn` event): the same rules as `CircuitSchedule` (cut, no extending, restore, re-arm). The map
   fills each gate's `seconds` / `rearm` from the row's `timed` (A2 15 / 3, A8 25 / 5) and its `switchIds` from the
   row's isolator / board spots. Do not drive a circuit from both: `CircuitSchedule` is the reference model the plan's
   tests check the windows with, and a drop-in if the gate's timer is ever moved out of `courseState`. Host on the cut:
   `reg.setGroup(g, false)`, `stealth.syncGroup(g, false)`, `enemyMgr.lightsOut(press point)`; on the restore
   `setGroup(g, true)` + `syncGroup`; the warning: LANTERN "Lights back in five."; a restart re-arms the gate beside
   `resetLights`. Isolator push stations are course devices with their own label ("Isolate"), not `layout.switches`
   (a plain switch would cut the circuit for good).
3. `resetLights` (`courseMode.ts:679-689`): with groups set its early return no longer bites; it restores every
   course group, so every live circuit must be in `course.groups` (step 1).
4. Kit dressing per set: accent lines and lit slots carry their circuit's `group`; house groups only outside sets.
5. Tests: `tests/ctcourseLight.test.ts` rewritten per set to section 3's states with `MARLOW_LEVEL`; a map test that
   `layout.course.groups` equals `marlowCourseGroups()`, every registry lamp's group is a table row, each row with
   lamps > 0 has at least one lamp, and `validateMarlowCircuits()` is empty.
6. Net sync: group states ride `course.lights.groups`, the timer rides `gates[].t` and flags ride `PackedCourse`: **no
   wire change for lighting**. SPEC 14 N2 already says so; the one bump stays N6's (`SecWire.sc`, 29 -> 30), which
   lighting does not touch. If a later HUD wants the re-arm seconds on the client, `gates[].t` carries them too (no
   shape change). Sector mode has no light sync at all (PROPOSAL R2): out of scope here.

## 5. Tests

**Unit (built, this agent):**
- `tests/marlowLightingSchedule.test.ts` (7): cut / restore / re-arm; no extending; one warning at 5 s; overshoot carried
  and rearm 0; reset; `setPhase` mirror and bad timings; no allocation over 200k steps.
- `tests/marlowLightingCircuits.test.ts` (9): the table passes `validateMarlowCircuits`; course groups = every live
  circuit, dead ones out; wall switches only on switch circuits; the timed circuits and their schedule; A2's window vs
  the crossing and the lone player; numbers read from the game (`GEARS.crouch[2]`, the 25 m lure in `enemyManager.ts`,
  `TORCH_DARK`, `COURSE_DARK`, `LIGHT`); zones; every set has a non-shot cut and holds its budget; the validator catches
  each planned mistake.
- `tests/marlowLightingLevels.test.ts` (7): `lampLevel` equals `contribution`; `poolIntensity` solves a pool; a room cove
  row reads >= 0.40 on 0.14 within the column budget (24); a cut leaves standby (dark); `spillsPast`; `coveRow`; no allocation.

**Unit (slice 0 / per set, the builders):** the map test in section 4 step 5; per set in `tests/ctcourseLight.test.ts`
(baked field, as today's file does): every lit pool >= 0.60, read floor >= 0.40, every pocket <= 0.22 crouched, the
exercise circuit off -> its area <= 0.24, no house / gallery lamp reaches a set sample point, `lampGridLossless`.

**e2e per set (`scripts/e2e-ctcourse.mjs` parts :1-:4, two pages, host and client):**

| Set | Asserts |
| --- | --- |
| A1 | Both pages read the wicket lit (meter band); the yard switch from the client turns the yard dark on both pages (group in `course.groups`) |
| A2 | Client presses cabinet 1: group 21 off on both pages within one `course` message, a body in the neck reads dark on both, the shunter (within 25 m) heads for cabinet 1; a press while cut does nothing; after 15 s lit again on both; restart mid-cut restores it lit and ready |
| A3 | The corridor stays lit and a player the camera sees is sent back (dark or not); an office switch lures the cleaner |
| A4 | The back aisle reads dark on both pages; the dispatch switch darkens the floor and lures D1 |
| A5 | A jam on the flood darkens the kiosk strip on both pages for about 10 s; the patrol does not walk to it |
| A6 | The SW corner and the west gallery read dark at the start on both pages; the gallery switch lures the attendant |
| A7 | The aisle-end switch darkens the south aisle on both pages and lures the technician |
| A8 | The board cuts 81 for 25 s: the front dark on both pages, the grille unlocked, then relocked; a restart restores shot chandeliers and relocks the grille |
| All | LD 15 (LR8): at each vantage a crouched still player stays under suspicious for a full cycle; in each lit pool he is noticed |

## 6. Open items / thin spots
- **Assumptions (L-A, undo in brackets).** L-A1 pool target 0.60, not SPEC's 0.55 (set 0.55 in `MARLOW_LEVEL`).
  L-A2 re-arm A2 3 s, A8 5 s (the SPEC gives none; edit `timed`). L-A3 facility groups 90-98, dead groups 49 / 69
  (renumber in the table). L-A4 A8's "dark centre" is the unlit west bays (a mixed zone). L-A5 A4's dispatch office
  has no lamp tonight (add a group 44 desk lamp if the dock reads too dark). L-A6 plan points are sheet hints (the
  builders' positions win; the validator re-checks lure range).
- **Lure range.** `lightsOut` reaches 25 m: A2's shunter is out of range of cabinet 1 on the east third of his loop;
  A8's board is about 14 m from N1. Each set's builder re-checks with the built points.
- **Torches in the made dark.** Every lure into a cut circuit brings a torch (L9). The exercises above are written for
  it (cross behind, take him from behind); a playtest may want lure spots lit (no torch) instead.
- **Ambient grid blur.** The ambient grid is 1 m (`ambientGrid.ts`): a set's 0.14 and a holding room's 0.30 blend over
  a metre at each doorway. Harmless (the doorway reads mid), but the pad's light test must sample 1 m inside.
- **Zone overlap.** A4's box (z 13-48) contains the south gallery strip (z 20-24, y 4.5) and its staff passage: the
  gallery there sits in the 0.14 zone. Out of bounds, render-only effect; give the gallery its own 0.30 zone if it reads
  dim there.
- **Gallery glass.** SPEC 5 wants the glazing as a light blocker; no light-only blocker exists (a visible box hides the
  view, a collision-only box passes light). The spill rule keeps parity; if a set must stay dark right under the
  glass, check it in the set's light test.
- **Shots vs timers.** A shot lamp stays out until a restart; a restore after the timer cannot relight it. Shooting all
  of A8's 81 opens the grille for good (the loud route, rating cost).
- **Isolators beside plain switches.** `StealthSystems.toggle` and `syncGroup` keep the wall switches' labels; an
  isolator is a course device and needs its own label and indicator (status lamp on the cabinet: a device emissive).
- **A dark corridor in A3.** Switching 30 off makes the meter read dark while the camera still sees: the A3 entry line
  should say the camera sees in the dark (LANTERN text, N1).
- **Non-maintained emergency lights.** Not built (inverse groups need N2 to drive two groups); add later if a cut reads
  too black, or raise that set's standby up to 0.22.
- **Not checked here.** No bake run (the sets are not built), no GPU look at the Low preset, lamp counts are estimates.
  Each slice's light test and Character Build's GPU shots are the authority.
- **Sector mode light sync** (PROPOSAL R2) is outside Marlow but blocks lit-by-default in co-op Sector Ops.
