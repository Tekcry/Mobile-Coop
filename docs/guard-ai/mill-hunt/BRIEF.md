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
- 2026-10-27 ~10:12 (native multiple choice via the orchestrator), the gallery guards: "Stay upstairs (Recommended)":
  gallery guards close in along the gallery and cover the hall from above (A5).

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
  (`src/game/takedownController.ts:472`). Only combat (`alert`) with the victim aware of you blocks the co-op takedown.
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
  data). Every unit walks its line towards its line's target, stop by stop. No reading of where a player is now. The
  targets follow a fixed search order (map data, rev 1): phase rows name one room per line along the players' route
  (ground: start bay, aisle, mill bay, sack bay, office, lobby; gallery: stair head, crane west, crane east, east
  gallery, east end at the hatch, held). A phase ends when every line's target room has been cleared once, or after
  `HUNT.phaseMax` 120 s; the last phase holds (the cordon on ladder L1 and the hatch). A contact call that gets through,
  a body found or a unit's fight ending (PLAN H4) jumps the order to the phase of that point and its target to the
  stop nearest it; the order runs on from there. Readable: "they searched where you were, then widened along the only
  way out". Michael ~10:05 "fixed readble path is good". Undo: a single phase row (the target stays at W1).
- A5 (Michael's pick, ~10:12, not an assumption) Guards keep their storey: the ground line runs start bay to lobby,
  the gallery line landing to east gallery. Gallery units close in along the gallery towards their line's target (the
  stair head above the start bay first, then east above the ground front to the hatch, A4), covering the hall from
  above, never down the ladder. Keeps the gallery's knife kills.
- A6 A unit is a pair (the map's `pair` tags: G1+G2, G4+G5, G8+G9, G11+G12, G15+G16) or a solo. Cap: no room ever
  holds more than 2 guards, and a unit never steps to a stop within 6 m (straight, same storey) of the stop of a unit
  nearer the target along the line (rev 1: only those count, so two units never block each other). A unit that may not
  step holds. A start over the cap (12 set: G3 in the start bay with G1 + G2; 16 set: G10, G15, G16 at the stair head)
  spreads first: the room's solo walks out along the line away from the target to the first room with space (PLAN H2).
  A split pair regroups at the member farther from the target (G4 walks back to G5). Undo: `HUNT.gap`, `HUNT.roomCap`.
- A7 Pairs move abreast on two authored spots per stop, 1.0-1.5 m apart (GA6's lanes, the paired kill's distance), both
  facing into the stop; the leader takes the left-hand aims, his partner the right-hand ones. No bounding overwatch (it
  opens a pair to 3-5 m and turns one guard to watch the other, which kills the paired takedown). Undo: a later slice.
- A8 Corners are authored per stop (yaws: corners, cover backs, doorways, left to right), not derived from cover data:
  readable and checkable. At a stop he turns torch and gun onto each in order at the calm turn and holds 1.5 s.
- A9 Holding: a unit the cap stops re-clears its stop's aims, slower (2.5 s each), same order. The unit at its line's
  target clears that room's stops in line order, round and round (a loop inside one room, never a lap across the mill).
  Rev 1: outside the target room a unit uses only its stop's aims that face its target's side (within 100 deg of the
  line towards it; at least one), so nobody stands with his back to the way the search is going.
- A10 A glimpse or a heard sound sends his unit to that spot at hunt pace: a 4 s look, then back to the nearest stop of
  the line. Replaces GA7 in the hunt. Rev 1: the trigger is a hunt-only cue in `enemy.ts` (a held `searching` guard
  never rises, so `riseN` cannot fire), and the check keeps the 2-cap: it stops at the room edge and looks in (PLAN H4).
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
