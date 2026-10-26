# guard-ai mill-hunt: plan check 1
Checker: Opus 5.5, 2026-10-27 10:17, PLAN at 597df8bce.
Verdict: FIX

## Intent
- "maximum alert level ... cautious and searching" (BRIEF Michael said) vs A1: ok in spirit. `searching` is the top
  level below combat (`alertState.ts:48` sensitivity 1.6; it leaves only to `alert` or, without `hunting`, cooldown,
  `:192-197`). Combat would break his own "so coop gameplay allows stealth takedowns": the co-op takedown is blocked only
  for a known guard in `alert` (`takedownController.ts:420`); a searching pair stays takeable from behind (side kill in
  the knife scene, `:472`). A2 (no alarm stage, so no helmets) is a fair reading; name it on the walk card.
- "move slowly", "walk very slow and cautious, checking all corners", "no ... patrolling calmly": ok (A3 0.45 m/s, A8
  authored corner aims, GA6 sweep off).
- "not bunch up into groups bigger than 2": ok in move / clear / hold / loop; NOT in `check` (FIX 4) and not at the
  start for the 16-guard set (FIX 2).
- "they will all be heading towards the players" + 10:05 "fixed readble path is good": NOT met for most of the scene
  (FIX 1). No omniscience: ok (A4 reads no live position).
- The aim complaint is correctly left to `feature/guard-ai-aim-fix` (PR #694, open, its check PASS).

## Gates
- VISION 8 (fixed, explainable): ok, no randomness; determinism tested (H2 "two runs identical").
- VISION 3 (perfect rating): ok on paper; entering `searching` is not an alarm (alarms count only radio `command`
  calls, `radioNet.ts:311`, `sectorMode.ts:379`). Risk at the start, fold-in 3.
- VISION 4: unchanged (G426 knife scene; `clear` objective as built).
- Hard rules: host only, no wire / save change (A15, wire level 2 exists): ok. Hot path: `millHunt.ts` allocation-free
  after `build`, tested: ok. Flag `millHunt` dark, `/preview/` on (G416): ok.
- Flag-off fallback: A13 keeps `sweepify` / `glimpseFollow` / stranded lap and the GA6 tests unchanged: ok.

## Claims
- PLAN has no fenced ```claims block (`docs/templates/plan.md:15`): `claims-check` exits 2 ("no ```claims block").
  FIX 5.
- Run with the PLAN's own file list as a block (scratch copy): 48 overlaps, all for the orchestrator to order:
  - `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/core/flags.ts`: `feature/guard-ai-mission-hooks` (+ s1a1, s1a2,
    s1b, s2, s3a, s3b, s4; last commit 26 h ago).
  - `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `docs/systems/ai.md`: `feature/guard-ai-j16-2` (live, enemy.ts +6).
  - `src/ai/enemy.ts`: `feature/guard-ai-aim-fix` (PR #694, +45; not in claims-check's list, the PLAN already waits for it).
  - `src/game/sectors.ts`, `TESTING.md`: 33 branches carrying `docs/mission-rules/PLAN.md` (mission-rules r6-r8,
    tallow-*, mixamo-kit) and `docs/missions/PLAN.md` (mission-engine, look-video-tallow; + flags.ts, e2e-affected.mjs).
  - `src/core/flags.ts`: player-batch-j19, coop-kit, campus-greybox (+ e2e-affected.mjs), map-ready (+ TESTING.md).
  - No overlap on `thornbeckMill.ts`, `e2e-piano.mjs`, `millHunt.ts`.
  The sectors.ts change is one optional type field and flags.ts one line: low conflict, rebase-level.

## Slices
- H1 ~300, ~2 h: ok (data + tests). Fold-ins 1, 6.
- H2 ~600, ~4 h: the step rule as written deadlocks when units start inside `gap` (FIX 2); one test contradicts `loop`
  (fold-in 4).
- H3 ~350, ~3 h: ok; waits for PR #694 on master (correct: both edit `enemy.ts`). PR 1 (H1+H2+H3) ~1250 of ~1.5k with
  tests; the FIX items add lines (fold-in 8).
- H4 ~400, ~3 h: its main trigger cannot fire (FIX 3); `check` breaks the 2-cap (FIX 4). Needs `enemy.ts` in its files.
- Slices file-disjoint where parallel (H1 || H2); H4 reuses H2 / H3 files but is PR 2, after PR 1: ok.
- e2e: "no guard past suspicious" (`scripts/e2e-piano.mjs:378-387`) -> "no guard in combat" is right (every guard is
  `searching` from the cut by design). Keep "no detection at the start" (`:388`) as is (fold-in 3).

## Walk pacing
- Guard AI: 5 unwalked, AT CAP (ROADMAP on feature/menu). Building dark behind `millHunt` is allowed; live switch-on
  only on Michael's acceptance, as the PLAN says: ok.

## The open question (BRIEF, gallery up vs down)
- Real: it changes the scene's shape and the gallery's kills. A5 (stay up) is the safe default: it keeps the gallery
  knife kills and the 2-cap easy; (b) later is a data change (join the lines at L1) plus a multi-floor line in H2. Build
  on A5. It interacts with FIX 1 (what the gallery does while the players are downstairs).

## Fix list (ranked)
1. **"Heading towards the players" stalls within ~2-3 min if no call / body / fight happens (the perfect-rating case,
   the main one).** With the target fixed at W1 (A4), W1 is the ground line's first room and the gallery stop nearest
   it is the landing (the gallery line's west end). Ground units reach or queue behind the start bay and hold (units
   ahead of the players come towards them, fine; any the players slip past loop the start bay forever). Every gallery
   unit walks west, away from the hatch where the players come up (L1 at x 31), and freezes behind G11 + G12 on the
   landing (12 set: G10 at x 8.8 and G8 + G9 at 12.5 are inside `gap` of the landing loop from second 0, G7 walks to
   about x 18 and holds). When the players climb, the whole gallery stands still facing west: backs to them, nobody
   heading towards them, for the second half of the mission. Add a fixed, readable no-contact rule, authored as data and
   never reading a live position. Suggested (planner's call, log it as an A-line): each line gets a fixed target order
   (ground: start bay, aisle, mill bay, sack bay, office, lobby; gallery: landing first, then towards the hatch); a
   line's target steps one room along it on a fixed clock (or when its target room has been cleared once) unless a
   contact / body / fight moves it, which restarts the order from there. "They searched where you were, then widened
   along the only way out."
   Done looks like: BRIEF A4 and PLAN H2 state the no-contact rule; the H2 sim adds a no-trigger 15-minute run in which
   every line's target reaches its last room, no live unit holds longer than a stated cap, and gallery units are
   closing on the hatch side by the time a scripted player position reaches the lobby.
2. **Start states that break `gap` / `roomCap` deadlock the step rule.** "May step to j: no other live unit's current or
   next stop within `gap`" looks both ways, so two units placed inside 6 m block each other for good: G10 (8.8, 16.2)
   vs G8 + G9 (12.5) and G11 + G12; in the 16 set G10 + G15 + G16 start 3 in `stairHead` (x 7-12), breaking the 2-cap
   at the EMP. "Their order never changes and no deadlock can form" assumes the rule checks only units ahead.
   Done looks like: the rule counts only units between the stepper and its target (ahead on the line), plus a stated
   start rule (e.g. the unit farther from the target backs off one stop, or holds until the gap opens, and a 3-in-a-room
   start sends the solo out first); the H2 sim asserts the room cap from t = 0 on both sets (positions, not stops).
3. **H4's check trigger cannot fire.** `riseN` / `riseCause` change only on a rise into `suspicious` or
   `investigating` (`enemy.ts:2390-2393`), and a guard held in `searching` never goes there (`alertState.ts:192-197`:
   searching leaves only to `alert` or cooldown). A10 as planned is dead code; a glimpse only fills the meter.
   Done looks like: H4 names a hunt-only cue in `enemy.ts` (e.g. while `searching` with the hunt on, the meter crossing
   `PERCEPTION.suspicious` or a heard noise bumps a counter and sets `stimX/Z`), `enemy.ts` added to H4's files, and the
   H4 test drives a real `Enemy` (not a stubbed `riseN`) from a glimpse to `check`.
4. **`check` ignores the 2-cap** ("Cap and gap do not block a check"): a pair checking a spot in a room another pair
   holds makes 4 guards in a room in a stealth state, against "not bunch up into groups bigger than 2".
   Done looks like: a check stops at the room edge (looks in from the nearest free point) when the spot's room is at the
   cap, or the nearer unit of the two checks instead; the H4 test covers it.
5. **Add the fenced ```claims block** (template `docs/templates/plan.md:15`): files (add `tests/millHunt.test.ts`,
   `tests/thornbeckMill.test.ts`, the alertState / manager tests, `changes/feature-guard-ai-mill-hunt.md`), maps
   `thornbeckMill`, protocol none, save none. Done looks like: `node scripts/claims-check.mjs --plan
   docs/guard-ai/mill-hunt/PLAN.md --name feature/guard-ai-mill-hunt` exits 0 or lists overlaps, and the orchestrator
   has ordered the `enemy.ts` / `enemyManager.ts` overlaps (aim-fix, j16-2, mission-hooks).

## Fold-ins for the builders (no PLAN change needed)
1. H1: the start bay's first stop aims (G1 + G2) point away from the players' start-to-low-sacks run (piano-escape PLAN
   :348 "the start is survivable").
2. H2 imports `HuntLine` etc. from `sectors.ts`, which H1 adds: H2 declares them locally (structural) or waits for H1.
3. H3: with 1.6x sight and torches on, e2e-piano's "no detection at the start" (`:388`) must still pass with the flag on;
   if it fails, fix the aims / start stop, not the assertion. With `?millhunt=0` the old "no guard past suspicious"
   check still runs.
4. H2 test "line distance to target never grows except in regroup": also except `loop` (and FIX 1's target steps).
5. The room-cap assertion in the sim and e2e counts member positions every step (walking legs, regroup and check
   included), not stop occupancy.
6. Name the new Enemy members `mh*` / `millHunt*`: `Enemy.hunt` (combat intruder slot, `enemy.ts:616`) and the
   `i.hunting` input already exist.
7. H3: `blackoutSearchSlots` still calls `searchAt(.., SEARCH_BLACKOUT)` on G1 + G2 after `huntStart` (they are not
   `alerted`); confirm the hunt branch wins and the search kind's `searchFor` timer cannot end the hunt.
8. If PR 1 passes ~1.5k changed lines after FIX 1-2, ship H3 as its own PR.
9. Keep a readable from-behind window for the paired kill: walking legs face along the line; aims stay mostly in the
   forward half (a look back at most once per stop).
10. The hunt tick sits in the `coordinated` board block (`enemyManager.ts:4140-4153`, where `glimpseFollow` runs today):
    keep it there.
11. A body found by a hunt guard: the existing `bodyFound` path may start a body search (`SEARCH_BODY`); the hunt branch
    must still drive his movement after it.
12. Walk card: name A1 (searching, not combat) and A2 (no helmets) so Michael can say "higher".

## Check 2 (a9dd94fde)
Verdict: FIX
Checker: Opus 5.5, 2026-10-27 10:41, PLAN revision 1 at a9dd94fde. Three small, exact spec holes (each a few PLAN
lines); the shape of the plan (A4 phase order, A5 stay upstairs, rank, room-edge check, slices) is right.

### Own view
- Intent: the fixed phase order (A4) answers "heading towards the players" without omniscience and reads as Michael's
  ~10:05 "fixed readble path is good": both lines move along the players' only route (start bay to L1, stair head to
  the hatch), each unit reverses at most once per run, holds face the search's way (A9 100 deg), legs face along the
  line (from-behind window kept). Groups <= 2 hold in move / clear / hold / loop / check by positions (FIX 4 closed).
- Gates: VISION 8 ok (no randomness, every target from data or a stated event). VISION 3: G426 keeps G146 "everywhere
  else", so this scene is exempt; the bar is Michael's "so coop gameplay allows stealth takedowns" (fold-in 1). Host
  only, no wire / save: ok. Flag dark, `/preview/` on: ok.
- Claims: block present; `claims-check --plan` exit 1, 48 overlaps, exactly as PLAN "Order" lists (33 x `sectors.ts` /
  `TESTING.md`; 8 x mission-hooks + s* on `flags.ts` / `enemy.ts` / `enemyManager.ts`; j16-2 on `enemy.ts` /
  `enemyManager.ts` / `ai.md`; flags-only map-ready, coop-kit, campus-greybox, player-batch-j19). PR #694 still OPEN:
  H3 / H4 wait, as planned. Orchestrator ordering of mission-hooks still to do (not a plan defect).
- Slices: PR 1 = H1 ~350 + H2 ~850, no runtime caller: ok under ~1.5k. PR 2 = H3 ~350 after #694; PR 3 = H4 ~500: ok.
- Walk pacing: Guard AI at cap; built dark, switched on only on Michael's acceptance: ok.

### Check 1 items
- FIX 1 (no-contact stall): closed by A4 / H2 order and the 15-minute no-trigger sim (fold-ins 1-2 on pacing and the
  gallery end state).
- FIX 2 (deadlock / start spread): partly. The mutual `gap` block is gone (only higher ranks count), but the room cap
  still counts lower ranks (item 1) and the spread runs at a build that has no guards yet (item 2).
- FIX 3 (dead cue): partly. The sight cue is right; the sound cue sits in a function the mill never calls for a
  searching grunt (item 3).
- FIX 4 (check vs cap): closed (room edge, positions, H4 test).
- FIX 5 (claims block): closed (above).
- Fold-ins 1-12: all carried into PLAN rev 1 (H1 fold-in 1; H2 fold-ins 2, 4, 5, 9; H3 fold-ins 6, 7, 10, 11; slices
  fold-in 8; e2e fold-in 3; walk card fold-in 12).

### Fix list (ranked)
1. **The room cap still lets a lower rank block the top rank: a stall up to `phaseMax` (H2 "Rank").** "On entering a
   new room, the guards in it ... plus this unit's size <= roomCap" counts every rank. After a phase step the new
   target room often already holds a unit (it was walking towards the old target from the far side, e.g. G4 + G5 in
   `millBay` when the target moves there from `aisle`) while the unit looping the old room is nearer the new target:
   the near unit (rank 1) holds on the cap, the unit inside (rank 2) holds on `gap` to rank 1's stop. Both stand until
   the 120 s clock, and "Blocking runs only down the ranks ... never deadlock" is false; the H2 no-hold assertion fails.
   Done looks like: PLAN H2 ranks every unit inside the target room above every unit outside it (then line distance,
   then index), so the room's occupant always walks to the target and loops while the outsider holds on a full room;
   the no-hold assertion reads "next stop free of higher-ranked units and its room has space"; the sim has this case.
2. **The board is built before any guard exists, so the start spread never runs in the game (H2 "Start spread", H3).**
   `spawnBeat` sets `sceneDark(true)` and only then spawns (`pianoScene.ts:652-655`), on the EMP and every restart, so
   `sceneDarkOn` sees no placed guards; members arrive through `placeSlot` (`sectorMode.ts:1036-1060`). Guards within
   `SCENE_SPAWN_MIN` 4 m of a player stay pending and spawn later under the 7 m rule (`:1040-1047`), and the live cap
   can defer more. A guard back from a fight rejoins too, possibly on the other storey via L1. The pure sim, which
   builds with members, would pass while the 16 set keeps 3 in `stairHead` in play.
   Done looks like: PLAN H2 / H3 state one admission rule run for every member that joins (the first board tick after
   the spawn, a late spawn, a fight's end back to `searching`): line by his current y, nearest stop, then the spread
   rule if his room is over the cap or he is inside `gap` of a higher rank; a member in `alert` is off the board until
   then. The H2 sim builds empty and adds members (all at t = 0, plus one late joiner into a full room); the cap from
   t = 0 assertion stands. H3's manager test places guards after `sceneDark = true`, as the scene does.
3. **The H4 sound cue is in `hear()`, which a searching mill grunt never gets.** In the coordinated stealth mill
   (`coordinated`, `COMBAT_HEAR.enabled`) a non-melee guard who is `searching` hears through `hearFight`
   (`enemyManager.ts:3349-3352`) -> `Enemy.hearSearch` (`enemy.ts:1443`; calm guards get `hearTurn`, never `hear`).
   Same class as check 1's FIX 3: the test on `hear()` passes, the game never fires it.
   Done looks like: PLAN H4 puts the sound cue in `hearSearch` (or `hearFight`'s searching branch, after its tier
   check) while `mhOn`; the H4 test drives a noise through the manager's hearing path (`EnemyManager` noise call) to a
   held `searching` grunt and sees `mhCueN` bump and his unit go to `check`.

### Fold-ins for the builders (no PLAN change needed)
1. Gallery end state: the hoist door opens only when every guard is down (`thornbeckMill.ts:71`, `:441`), so a stealthy pair
   must take every gallery unit after climbing L1 into a queue that faces the hatch. Keep at least one hall-facing aim
   per gallery hold stop (A5 "cover the hall from above"; south is inside the 100 deg) so the hatch is not watched
   without a break; the H2 sim asserts in the final state that each queued gallery unit's aims include one not on the
   hatch. Walk card: name the gallery cordon.
2. Pacing: phases step on "cleared once", so the order may reach its last row in ~4-6 min and the rest of a careful
   run is held queues. Add `HUNT.phaseMin` (prototype value, e.g. 60 s; A16) so the front does not race the players;
   log it in A4.
3. Risks line: "units then queue towards L1, facing them" holds for the gallery; on the ground the queue faces L1 with
   its back to players coming from the west. Say so on the walk card (it is the from-behind window, intended).
4. Sight cue: `hearSearch` / `hearTurn` lift the meter to the sound's floor (`turnMax` 0.45 > `PERCEPTION.suspicious`
   0.3), so the sight cue must read the sight path (`sawMoment`), not any meter crossing, to keep `mhCueCause` right.
5. e2e-piano already runs a checkpoint restart: assert every live guard `searching` and `mhOn` again after it, phase 0.
6. A9 `loop` wraps from a room's last stop to its first: inside a 2-3 stop room that reads as back-and-forth; let the
   return leg clear its aims (no plain walk-back) and name it on the walk card.
