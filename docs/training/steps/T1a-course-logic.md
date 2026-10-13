# Step T1a - course framework, pure logic (Block A)

Model: implementer opus, checker opus. Deps: T0. Code: new Babylon-free modules and tests only; no wiring.

## Read
- docs/training/T0-facts.md (reuse list), PLAN.md section 2 item 1 (the framework's list)
- BAYS.md section 0 (airlock rule, failure rule) and each bay's "Co-op split and gate" paragraph (grep `Co-op split`)
- src/game/missions.ts 140-230 (ObjectiveChain) for the style of a pure state machine with tests
- src/game/interactables.ts 1-60 (InteractKind, Interactable fields: holdTime, holdNoise, onUse)
- LOG.md "Spec change requests" under T0: apply any that touch gates or airlocks first

## Task (decisions)
1. `src/config/course.ts`: every number (TUNE): AIRLOCK_CYCLE 4 s, AIRLOCK_Y_TOL 1.0, PAIR_WINDOW 1.0 s,
   TIMED_HOLD_AFTER 6 s, COURSE_SEND 2 s (resend period), RESTART_DELAY 2 s.
2. `src/game/course/courseDef.ts`: types `CourseDef { id, bays: BayDef[], airlocks: AirlockDef[], objectives? }`;
   `BayDef { id, entry: airlockId | 'start', exit: airlockId | 'end', squad: string[] (squad slot ids), gates: GateDef[],
   radio: RadioLine[], elements: ElementFlag[] }`; `AirlockDef { id, box: [x0, z0, x1, z1], floorY, nearDoor, farDoor }`;
   `GateDef` union by `kind`: lever { switchId, doorId }, bolt { doorId, side: [nx, nz] }, hold { holdId, doorId },
   timedHold { holdId, doorId, after? }, pair { a, b, doorId | flag, window? }, egress { switchId, doorIds },
   mains { group, doorId }, flag { flag, doorId }, anchorLock { anchorId, flag }, pickup { switchId, flag, perPlayer };
   `RadioLine { at: 'enter' | 'gate' | 'done' | string, text }` (90 characters max, validated);
   `DrillDef { id, verb, who: 'both' | 'lead' | 'second' | 'either', text (the tutorial step, <= 90 chars),
   marker: point | deviceId, count? }` (D18, D30): `BayDef.drills: DrillDef[]` in teaching order; lead / second
   resolve by the swap rule (lead = P1 in odd bays, P2 in even bays; DECISIONS C3, D25);
   `ElementFlag { id, feature, final: boolean }` (now / final switch-on).
3. `validateCourse(def, known: { doors, switches, holds, anchors, groups })`: unique ids; every gate names known ids;
   every bay has an entry and an exit; airlock boxes 6 x 6 (+-0.5); radio lines <= 90 characters; throws with the id.
4. `src/game/course/courseState.ts` (host): `CourseState(def)`, input per fixed step: player feet (2), downed flags,
   switch presses and holds (`press(id, player)`, `hold(id, player, down)`), light group states, flags. Outputs:
   door locks (`locked(doorId)`), anchor locks, current bay, checkpoint (last sealed airlock), per-player drill ticks
   (`tick(player, verb)`: completes the current bay's matching drills for that player), the next drill per player
   (tutorial step and marker), per-bay stats (time, detections, alarms, knock-outs, kills, revives, team moves) and
   events (`airlockCycled`, `gateOpened`, `drillDone`, `bayStarted`, `bayRestart`, `courseDone`).
5. Airlock phases: open -> waiting (one inside: refusal "Wait for your partner") -> cycling (both inside, none downed,
   someone pressed "Cycle") -> sealed (near door locked for ever, far door unlocked and opened, checkpoint set,
   `bayStarted` for the next bay). "Revive first" while a player is downed. Leaving during cycling aborts it.
   Drills gate the airlock (D30): it refuses while any drill of the bay is not done by its players, naming them
   ("Waiting: P2 - ledge shimmy, gap jump"). Nothing in the course can mark a drill done except `tick` (no skip path).
   Start at bay N (D20): `startAt(n)` marks earlier bays done and puts the checkpoint at bay N's entry airlock.
6. Gates: lever unlocks for good; bolt opens only for a press from the named side; hold open while held; timedHold open
   while held and `after` s more; pair needs both presses within the window (either order), else resets; egress unlocks
   its doors for good; mains unlocks while the group is off and relocks when it comes back on unless both players are
   inside the next airlock; flag unlocks when the flag is set; anchorLock locks the anchor until the flag; pickup sets a
   flag (per player when `perPlayer`).
7. Restart: `restart()` when both are downed for RESTART_DELAY: resets the current bay's gates, flags set in that bay,
   and returns the bay's squad ids to respawn; drills already ticked stay ticked (D36); earlier bays stay done; players respawn at the checkpoint airlock.
8. Serialisation: `pack()` / `apply(packed)` for the `course` message (state, locks, flags); pure, tested round trip.

## Tests (tests/course.test.ts)
The airlock refuses while one drill is open for one player and names it, and cycles once both have ticked it; an
`either` drill needs one tick, `both` needs two, `lead` follows the swap rule; `startAt(5)` begins in A4 with bays 1-4
done; per-bay stats add up. Every gate kind opens and closes as specified (both sides for bolt); airlock never cycles with one player, with a
downed player, or after one leaves mid-cycle; the near door never unlocks again; pair refuses at 1.1 s and accepts at
0.9 s; timedHold closes 6 s after release; mains relocks on power back; restart resets only the current bay; pack /
apply round trip; validateCourse rejects an unknown door, a 91-character line and a 5 x 6 airlock.

## Checks
`timeout 900 npm run check`. No e2e (no wiring yet).

## Commit
"training T1a: course framework logic" (src/game/course, src/config/course.ts, tests/course.test.ts, docs/training).
Docs: none beyond LOG / STATE.
