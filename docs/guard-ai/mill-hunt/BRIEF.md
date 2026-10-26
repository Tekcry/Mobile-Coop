# guard-ai mill-hunt: brief
Owner: Guard AI Build. Status: current.

Job: rework the storm mill scene's guards (map `thornbeckMill`, `scene: 'piano'`, flag `pianoEscape`) from Michael's
walk. Scene only: everything runs only while `em.sceneDark` is on and the new flag `millHunt` is on. Plan:
`PLAN.md` (this folder). Branch `feature/guard-ai-mill-hunt`.

## Michael said
- 2026-10-27 ~10:00, after walking the storm mill: "the guards in the mill piano scene already know youre there. it
  should already be maximum alert level, and they will already be cautious and searching. they must move slowly and not
  bunch up into groups bigger than 2 at a time, so coop gameplay allows stealth takedowns. they should remain cautious
  throughout the whole mission, and searching for you very slowly and methodically. they shouldnt be walking back and
  forwards like they are patrolling calmly. they will all be heading towards the players. make their movements more
  tactical also. and they currently shoot at you without actually aiming at you (ie facing away from you) which is
  unrealistic. they must walk very slow and cautious, checking all corners"
- 2026-10-27 ~10:05 (via the orchestrator), on a fixed, readable search order: "fixed readble path is good"

## Michael picked
- (none yet)

## The orchestrator's reading (this scene only)
1. Start at the top alert stage and never calm down.
2. No calm back-and-forth patrol: each guard (or pair) closes in on the players' area slowly and methodically, room by
   room, weapon up, pausing to clear corners and cover (torch and gun into each corner), in a fixed, explainable order
   (VISION rule 8), not random.
3. Groups never larger than 2, spaced so paired co-op takedowns stay possible.
4. The facing-away shooting is fixed separately (`feature/guard-ai-aim-fix`), not here.

## What exists today (origin/master 593b22c58)
- At the EMP the scene sets `em.sceneDark = true` (`src/game/pianoScene.ts:652`) and calls
  `blackoutSearchSlots([0, 1], ...)` (G1 + G2 search round W1). `sceneDarkOn` (`src/ai/enemyManager.ts:2405`) puts every
  guard on GA6's calm sweep (`sweepify`, `:2455`; `src/ai/sceneSweep.ts`: his map route as a timed lap at 0.7 m/s with
  torch pans): the calm back-and-forth Michael saw. GA7 (`glimpseFollow`, `:2490`) sends a calm partner to a glimpse.
- Guards stay `unaware` / `cooldown` on the sweep. `searching` is the top level below combat (`alertState.ts`:
  sensitivity 1.6, weapon raised `GUARD_AIM.search` in `guardStance.ts:16`); a search ends after 60 s unless the
  `hunting` input holds it (`alertState.ts:192`).
- A contact radio call puts every guard of the section into combat (`radioDeliver` `:3035` -> `Enemy.radio` -> `called`):
  in this one-section mill that pulls every guard onto the player.
- Takedowns: from behind at any level; the knife scene also allows the side kill on an alerted or searching guard
  (`takedownController.ts:472`). Only combat (`alert`) with the victim aware of you blocks the co-op takedown.
- Guard nav: the stair gate is bolted (locked to guards); ground and gallery join only by ladder L1 at the east end.

## Assumed decisions (each undone as stated; all behind `millHunt`, so `?millhunt=0` undoes the lot)
- A1 "Maximum alert" = every scene guard in `searching` from the EMP (and each restart), held there for good (the
  `hunting` input true while he hunts): sensitivity 1.6, weapon up, torch on (GA1). From it a sighting fills the meter
  at 1.6x; a full meter is combat as built (he shoots); lost sight returns him to `searching` and the hunt, never
  cooldown or unaware. Takedowns stay possible (behind; side in the knife scene). Undo: the flag.
- A2 No alarm stage is raised (`setAlarmStage`): gear, helmets and HUD stay as today. Undo: `em.setAlarmStage(3)` at
  the EMP (helmets and armour, G350).
- A3 Pace 0.45 m/s between stops (GA6 sweep 0.7; the plain search 0.68 = walk 0.9 x 0.75). With the corner holds a unit
  covers about 0.25 m/s overall. Undo: `HUNT.pace`.
- A4 "Heading towards the players" without cheating: each storey has one fixed line of stops through its rooms (map
  data). Each line's target is its stop nearest the players' last known point: W1 (5.5, 5.25) at the EMP; it moves only
  when a contact call gets through, a body is found, or a unit's own fight ends (PLAN H4). Every unit walks its line
  towards its target, stop by stop. No reading of where a player is now. Undo: `HUNT` target rule.
- A5 Guards keep their storey: the ground line runs start bay to lobby, the gallery line landing to east gallery.
  Gallery units close along the gallery towards the stop nearest the target (above the start bay at first), never down
  the ladder. Keeps the gallery's knife kills. Undo: one line joined through ladder L1. (The one question below.)
- A6 A unit is a pair (the map's `pair` tags: G1+G2, G4+G5, G8+G9, G11+G12, G15+G16) or a solo. Cap: no room ever
  holds more than 2 guards, and a unit never steps to a stop within 6 m (straight, same storey) of another unit's stop.
  A unit that may not step holds. A split pair regroups at the member farther from the target (G4 walks back to G5, as
  the old plan). Undo: `HUNT.gap`, `HUNT.roomCap`.
- A7 Pairs move abreast on two authored spots per stop, 1.0-1.5 m apart (GA6's lanes, the paired kill's distance), both
  facing into the stop; the leader takes the left-hand aims, his partner the right-hand ones. No bounding overwatch (it
  opens a pair to 3-5 m and turns one guard to watch the other, which kills the paired takedown). Undo: a later slice.
- A8 Corners are authored per stop (yaws: corners, cover backs, doorways, left to right), not derived from cover data:
  readable and checkable. At a stop he turns torch and gun onto each in order at the calm turn and holds 1.5 s.
- A9 Holding: a unit the cap stops re-clears its stop's aims, slower (2.5 s each), same order. The unit at its line's
  target clears that room's stops in line order, round and round (a loop inside one room, never a lap across the mill).
- A10 A glimpse or a heard sound (his rise on sight or sound) sends his unit to that spot at hunt pace: a 4 s look, then
  back to the nearest stop of the line. Replaces GA7 in the hunt.
- A11 In the hunt a contact call that gets through moves the targets; its receivers do not go to combat. Who sees you,
  hears the shout (voice range) or hears shots close by fights as built. Undo: the `radioDeliver` hunt branch.
- A12 The 2-cap is a stealth rule: in a fight the combat code is unchanged.
- A13 GA6 (calm sweep), GA7 (glimpse follow) and the stranded lap stay as built for `millHunt` off; the hunt replaces
  them when on. `blackoutSearchSlots` is still called (no scene file change); the hunt overrides its movement (the start
  bay's first stops are W1 anyway). Routes and `takedownSpot` stay in the map data, unused by the hunt.
- A14 Kill spots K1-K10 stop being fixed places: players meet the units where the hunt has brought them. The pairs are
  still the co-op kills. The piano-escape PLAN section 3 table holds for the start positions only (Campaign told).
- A15 Host only: the hunt runs in `EnemyManager` on the host; the client sees positions, yaw, level (`searching` is wire
  level 2), torch and look as today. No wire, protocol or save change.
- A16 Numbers are prototype starting values (G421): no tuning before Michael plays it.

## Question for Michael (changes the scene's shape; assumed A5 until he answers)
- The gallery guards: (a) stay upstairs and close in along the gallery towards you, covering the hall from above
  (assumed); (b) come down the ladder and join the ground hunt (the gallery empties, the ground fills up).
