# S0 - course systems (N1, N2, N3, N4, N8 + gap list 6a / 6b + ENGINE-ANSWERS Q2 / Q4 / Q9)

Slice 0, course part (SPEC section 14). Date 2026-10-23. Not committed (the job lead commits). No wire shape change:
everything rides the existing `PackedCourse` (flags, `gates[].t` / `tb`) and `lights.groups`; `PROTOCOL_VERSION` untouched.
The current Marlow Yard data still validates and runs (every new field is optional; old one-line objectives behave as before).

## Built
- **N1 objective steps.** `CourseObjective` grows to `{ id, bay, text, a?, b?, done?, timer? }`. `done` is a `StepCond`
  (`{ flag, who? }`, `{ gate }`, `{ all: [...] }`; an array = any of them). The host latches a step the first step its
  condition holds by setting the course flag `obj:<id>` (rides `PackedCourse.flags`, cleared by the bay restart), so a
  step stays done when a timed window later clears. A step without `done` is the bay's last line (the old one-line bay
  objective keeps working). HUD: the steps with `done` are table rows after the drills (shared line, ticked for both),
  the current one highlighted; the step line shows this player's A or B line (shared line when none) plus
  " - Lights back in 9 s" while the step's `timer` gate runs (redrawn once per whole second). `validateCourse` checks
  ids, bays, every text (shared, A, B) <= 90, gate ids, that every step flag is set somewhere (pass-zone flags go in
  `externalFlags`) and that a `timer` names a timed gate. A `stepDone` event speaks a radio line keyed by the step id.
- **N2 isolator.** Gate kind `isolator { id, switchIds, group, seconds, rearm? }`. Any cabinet starts the window
  (two-way); presses while dark do nothing; after it the press is refused for `rearm` s ("The isolator is re-arming").
  Gate open = circuit isolated; `t` = seconds left, `tb` = re-arm end (clock). Course mode turns the group off through
  the new `StealthSystems.isolate` (registry, the circuit's wall switches, the `lightSwitch` event and the lights-out
  lure at the cabinet pressed) and back on when it closes. A `mains` gate on the same group opens with it. A wall switch
  turning the circuit back on ends the window early. `gateWarn` at 5 s left speaks radio `warn:<gate id>`.
  `resetLights` fixed: no early return; a restart restores every shot-out lamp and puts every light group back to its
  state at the course start (snapshot), plus any course group with no lamps at start back on.
- **N3 timed console.** `SecurityConsole.seconds?` / `rearm?`. `new CourseState(def, consoles)` makes that console's
  shared pickup gate a timed loop: the flag is set for `seconds`, then `CourseState.clearFlag` clears it (new; event
  `flagCleared`), the cameras come back on both machines, flag gates on it relock; re-arm refusals: the mode shows
  `CONSOLE_REARM`, `CourseState` returns `REFUSE_CONSOLE_REARM`. The loop's seconds ride the pickup gate's `t` (a step's
  `timer`, label "Cameras back in"). `gateWarn` at 5 s. An untimed console is unchanged.
- **N4 hold device.** `CourseDevice.hold?` / `holdNoise?`: the item gets the hold time and noise; the completed hold is
  the press (progress reset for the next use). Brace points of `hold` / `timedHold` gates stay untimed.
- **N8.** `coopUi.ts` "Start at" (dev flag) reads `registeredBayCount(map)` from a course registry in `courseDef.ts`
  (`registerCourse(mapId, def)`; `CourseMode.start` registers the course it runs) instead of `map ? 9 : 0`. The map's
  `bayX` helpers are left alone (the set builders replace the map).
- **6a flag drills.** A drill verb `flag:<flag>` ticks when that flag is set in the bay: a shared flag ticks every player
  the drill is open for, `<flag>@1` / `@2` that player only.
- **6b role claims.** `BayDef.roles?: RoleClaim[]` (`{ role: 'a' | 'b', press?: [device ids], zone?: { box, y0?, y1? } }`):
  the first player to press a claim device or stand in a claim zone takes that job, the other the other; one claim per
  bay until it restarts; without a claim `leadOf` (the swap rule) decides. The claim is the flag `role:<bay>:A=P1|P2`
  (rides the packed flags). Drills' `lead` / `second` follow the claim too.
- **Q2 (assumed decision A8).** `CourseMode.start` calls `courseGuardRules(em)`: `em.stealth = true` (CT stealth
  rules: shout and call-in, shared last known position, search, cooldown, the detection stat). Undo: delete that 1 line.
- **Q4.** `spawnSquad` removes the old squad with `em.despawn` (their knocked-out / dead bodies go too).
- **Q9.** `StealthSystems.occupied` (guard door auto-close, door menu close) counts every remote player
  (`spotOccupied`, pure, exported).

## Numbers
`TIMED_WARN` 5 s (window warning). Everything else is set data (A2 15 s, A4 / A8 60 s loop + 20 s re-arm, A6 hold 3 s).

## Files
`src/game/course/courseDef.ts`, `src/game/course/courseState.ts`, `src/game/course/securityRoom.ts`,
`src/ui/hud/courseHud.ts`, `src/game/modes/courseMode.ts`, `src/game/stealthSystems.ts` (`isolate`, `spotOccupied`),
`src/net/coopUi.ts` (one line + import). New tests: `tests/marlowN1Objectives.test.ts` (18), `tests/marlowN2Isolator.test.ts`
(11, incl. Q9), `tests/marlowN3Console.test.ts` (9), `tests/marlowN4Hold.test.ts` (4, incl. Q2 / Q4). No existing test changed.

## Checks
- `npx tsc --noEmit`: clean. `npx eslint` on the 7 source files and 4 new tests: clean.
- `npx vitest run` on the 4 new files + course, courseTutorial, securityRoom, ctcourse, ctcourseLight, marlowT1a,
  marlowT2, courselab, jammerFixes, netSim: "Test Files 14 passed (14), Tests 205 passed | 1 skipped (206)".
  bunkerMap, marlowN6Scanners, marlowPassAny: "Test Files 3 passed (3), Tests 96 passed (96)".
- No e2e run (job lead sends e2e to the laptop). Worth running: e2e-ctcourse, e2e-course, e2e-coop, e2e-netmove
  (`em.stealth` flip, despawn, `resetLights`, HUD).

## API for set builders
All in the map's `course` (`CourseLayout`). Pass-zone flags (the other agent's `PassZone.any` / both) go in
`def.externalFlags` so steps and flag gates validate.

Isolator (A2), two cabinets on group `g21`, a `mains` grille may share the group:
```ts
devices: { 'a2-cab1': { x: 30, y: 0, z: 3, yaw: 0, label: 'Isolate neck lights' }, 'a2-cab2': { x: 55, y: 0, z: 17, yaw: Math.PI } },
groups: { g21: 21 },
gates: [{ kind: 'isolator', id: 'g-a2-iso', switchIds: ['a2-cab1', 'a2-cab2'], group: 'g21', seconds: 15, rearm: 2 }],
radio: [{ at: 'g-a2-iso', text: 'Fifteen seconds of dark each time. Use them well.' }, { at: 'warn:g-a2-iso', text: 'Lights back in five.' }],
```

Timed console (A4): the console, its shared pickup gate and the cameras' `offFlag`:
```ts
consoles: [{ id: 'a4-console', guard: 'a4-officer', flag: 'a4-loop', seconds: 60, rearm: 20 }],
gates: [{ kind: 'pickup', id: 'g-a4-loop', switchId: 'a4-console', flag: 'a4-loop', perPlayer: false }],
// cameras: offFlag 'a4-loop'; radio { at: 'g-a4-loop', ... } on start, { at: 'warn:g-a4-loop', text: 'Cameras back in five.' }
```

Hold device (A6 drive panel): a shared pickup (or a pair gate half) on a device with `hold`:
```ts
devices: { 'a6-drive': { x: 51.5, y: 0, z: 66, yaw: 0, label: 'Isolate drive', hold: 3, holdNoise: 6 } },
gates: [{ kind: 'pickup', id: 'g-a6-drive', switchId: 'a6-drive', flag: 'a6-drive', perPlayer: false },
        { kind: 'flag', id: 'g-a6-out', flag: 'a6-drive', doorId: 'A6-outfall' }],
```

Objective steps with per-player lines ("B past x" is a one-player pass zone flag), a timer and a role claim:
```ts
externalFlags: ['a2-b-past', 'a2-both-past'],
objectives: [
  { id: 'a2-neck', bay: 'A2', text: 'Cut the neck lights and cross while the shunter checks.',
    a: 'Isolate the neck lights at cabinet one, then hide in the cabin corner.',
    b: 'Wait at the van ends, then cross the dark neck to cabinet two.',
    done: { flag: 'a2-b-past' }, timer: 'g-a2-iso' },
  { id: 'a2-back', bay: 'A2', text: 'Now the other way round.', a: '...', b: '...', done: { flag: 'a2-both-past' }, timer: 'g-a2-iso' },
  { id: 'a1-over', bay: 'A1', text: 'Get over the yard wall together: one boosts, one climbs.',
    done: [{ gate: 'g-a1-wicket' }, { flag: 'a1-both-east' }] },          // any of
  { id: 'a7-split', bay: 'A7', text: '...', done: { all: [{ flag: 'a7-at-t1' }, { flag: 'a7-at-t2' }] } },
  { id: 'a2-lock', bay: 'A2', text: 'Both of you into holding room two.' }, // no done: the bay's last line
],
// in the bay: roles: [{ role: 'a', press: ['a2-cab1'] }] or [{ role: 'a', zone: { box: [106, 75, 134, 78], y0: 4 } }]
// a drill ticked by a flag: { id: 'd-past', verb: 'flag:a3-b-past', who: 'second', text: '...', marker: 'a3-cam' }
```

## Assumptions (logged, Michael asleep)
- S0c-1: the step line shows this player's A / B line (the shared line is the highlighted table row), not both. Undo:
  prepend `step.text` in `CourseHud.writeStep`.
- S0c-2: a step with `done` latches (stays done when its condition clears). Needed for N3: `a8-loop` clears after 60 s.
- S0c-3: role claims also move drill `lead` / `second`.
- S0c-4: the timed window's lamp, sound and cabinet glow are not built here (devices are plain switches); the HUD timer
  and radio lines show the window.
- A8 (job lead): `em.stealth = true` in Course mode (above).

## Open items
- **`looped` camera mode (gap list row 2c)** lives in `src/game/ctDevices.ts` (not mine): it sets `c.setMode('off')` for
  an `offFlag` camera (about line 904). `securityRoom.ts` exports `consoleCamMode()` ('looped'); the owner changes
  `c.setMode('off')` to `c.setMode(fOff ? consoleCamMode() : 'off')` and treats 'looped' like 'off' on the way back.
  The client's camera mode comes from `sec.cams[].mode`, so it follows.
- **N4 client hold noise (ENGINE-ANSWERS Q12):** a client's hold makes no guard noise (no message). Needs a client
  pulse in `src/net` / `protocol.ts` (not mine, rides the v30 bump) or drop `holdNoise` from A6.
- **N8:** until the map calls `registerCourse('ctcourse', def)` at module load, the dev flag `?course=all` lobby lists
  only bay 1 plus recorded bays before the course has run once in the session. Set builders: add that one line to the
  new map module. The `bayX` helpers and their test importers stay for the set builders.
- `courseHud.ts` has no DOM unit test (vitest runs in node); its logic is `CourseState` (tested). Check it in
  e2e-ctcourse once the sets carry steps.
- Isolator group state reaches the client only for groups in `layout.groups` (validated: an isolator's group must be one).
