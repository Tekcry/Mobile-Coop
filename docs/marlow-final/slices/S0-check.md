# S0 check - slice 0 (N1-N4, N6, N8, N9, client hold noise, Q2 / Q4 / Q9)

Fresh checker, 2026-10-23. Read-only on code. Reviewed `a71c8c02..1949764e` (slice 0 commits fbe5170b, 5193dfa3,
34cb5b52, dea8acf3, 1949764e) against SPEC section 14, PLAN slice 0, ENGINE-ANSWERS Q2 / Q4 / Q9 / Q12, BRIEF A8 and
the four reports (S0-course, S0-devices, S0g-doors, S0-holdnoise). Kit, lighting, props and greybox files skipped.

## Verdict: PASS

No broken or unplayable work. The host / client paths line up, restart and rejoin state is sound, and the hard rules
hold. One stale e2e assert needs fixing before the slice e2e run (finding 1).

## Findings

| # | File:line | Severity | Finding | Smallest fix |
| --- | --- | --- | --- | --- |
| 1 | `scripts/e2e-ctcourse.mjs:390`, `:391`, `:406` | should-fix (do before the slice e2e run) | N3 (`ctDevices.ts:904`) now puts every camera switched off at a console into `'looped'`, including Marlow's station 3 security room (untimed console). The e2e still waits for `cams[0].mode === 'off'` on both pages and checks `!== 'off'` in the hallway loop, so the e2e-ctcourse security room station fails. Gameplay is unchanged: looped is blind (`camera.ts:186`) and the cue hides (`cameraCue.ts:208`). The jam asserts at :281 / :283 / :304 stay correct (a jam is still `'off'`). | Lines 390-391: wait for `=== 'looped'`. Line 406: `!== 'looped'`. Fix the step labels to match. |
| 2 | `src/game/ctDevices.ts:902-911` | should-fix | No unit test covers the new camera mode setter. `marlowN3Console.test.ts:117` only checks that `consoleCamMode()` returns `'looped'`. The transitions are untested: console sets looped (host and client mirror), a jam during the loop shows off then looped, the flag clearing returns the camera to online, and a dead (Sector Ops) camera stays off. Reading the code, every transition is right. | Add one `CtDevices` test (the N6 test already builds one on a NullEngine): set the offFlag, check `'looped'`, clear it, check `'online'`, and run the jam case. |
| 3 | `src/net/coopUi.ts:596`, `src/game/modes/courseMode.ts:193` | polish | N8: with the dev flag `?course=all`, "Start at" lists only bay 1 until the course has run once in the session (the registry fills in `CourseMode.start`). Before this change it listed 9 bays. Dev flag only; e2e sets `courseBay` directly. Already in the S0-course report. | 0d: call `registerCourse('ctcourse', def)` at load in the new map module. |
| 4 | `src/net/protocol.ts:444` | polish | The parser keeps 8 scanner pairs (`SEC_SCANS`), but nothing stops a map from defining more. The client would then leave pairs 9 and up idle. Order is kept, so no pair is misread. | Assert `lay.scanners.length <= 8` in the map test (0d `ctcourse.test.ts`). |
| 5 | `src/game/course/courseDef.ts:424` | polish | A step's latch flag `obj:<id>` and a role flag `role:<bay>:A=Pn` ride `PackedCourse.flags`. The client parse cuts each flag to 48 characters (`protocol.ts:553`, `strs` -> `safeText(x, 48)`). `validateCourse` does not limit objective or bay id length, so an id over 44 characters would never match on the client. | Fail objective ids over 40 characters in `validateCourse`. |
| 6 | `src/game/course/courseState.ts:411` | polish | A press claims the role (`claimByPress`) before the press is checked. A refused press still takes the job: isolator re-arming, console guard still up. This is arguably right ("first press of a named device") but is not written down. | Note it in the set-builder API, or move the claim after a press that went through. |
| 7 | `src/net/coopHost.ts:1004` | polish | `holdPulseAt` keeps an entry per client id and never prunes it when a client leaves. It is tiny (one number per id ever seen). | Delete the entry where the remote player is removed. |
| 8 | `src/game/modes/courseMode.ts:756` | polish | `resetLights` now puts every map light group back to its start state and restores every shot-out lamp on any bay restart, including earlier bays' and non-course groups. Course groups behave as before. Non-course groups are not on the course wire, but they were not synced before this change either, so nothing new is out of step. | None needed now. Note it for the lighting plan. |
| 9 | `src/game/stealthSystems.ts:701-711`, `courseMode.ts:736-751` | polish | N2's lure fires at the cabinet that was pressed, as a wall switch's does. SPEC N2 says "for that group's lamps". The behaviour is equivalent for a calm guard within 25 m. | SPEC wording only. |

## Contract checks (all OK)

- **N1**: steps latch through `obj:<id>` (host `latchSteps`; bay-owned, so a restart clears them), `who` per role, `{all}` / any-of lists, and `flag:<flag>` drills (shared and `@1` / `@2`). Role claims (press or zone, first wins, cleared on restart) and `roleA` drive `lead` / drills. `leadOf` has no other caller. HUD: step line, A / B line and timer, rewritten only on gen or whole-second change. The per-frame queries do not allocate. `validateCourse` checks ids, bays, 90-character texts, flags set and timer kinds. The client mirror gets flags, roles, gate `t` / `tb` and clock through the packed state (no shape change) and runs timers down in `advanceMirror`. The mirror is built with `lay.consoles` (`courseMode.ts:907`), so `secs` match the host.
- **N2**: the isolator opens, a press while dark is ignored, the re-arm refusal works (`tb` on the shared clock), and a wall switch ends the window early. The `mains` gate on the same group follows via the registry version -> `setGroup`. Restart clears `t` / `tb` and emits `gateClosed`, which turns the circuit back on before `resetLights`. The `resetLights` early return is fixed (snapshot of the lamps at start).
- **N3**: the timed console sets its flag for `seconds`, then `clearFlag`; the cameras return on both pages because `applyJam` reads the shared flags on both roles. Re-arm is refused in the mode (`consoleRefusal` order: guard up, already off, re-arming) and in the state. An untimed console is unchanged apart from `'looped'` (finding 1).
- **N4**: `deviceHoldTime` (brace points stay untimed); the completed hold is the press and resets progress. A held button re-presses every `hold` s, the same on host and client.
- **Client hold noise (Q12)**: the pulse rides `use.pulse`, and `hn` rides `NetItem` (clamped 0-30). The host checks the client is alive, the item is live, noisy and in `inUseReach` (shared with `onUse`), and that 0.3 s have passed since that client's last pulse. Failed pulses are dropped silently. Spam is capped at about 3.3 hears a second per client, and a client can only make noise against itself. The watch on the client side allocates nothing, and the item is removed from the watch when it is removed or disposed.
- **N6**: both pages build `scans` from the same `lay.scanners` order (a pair with a missing device is skipped on both). The wire is one 5-number entry per pair, and the parser caps it at 8 with junk entries kept in their slot. Glow positions come from device pose (Marlow's z 0.3 / 13.7 reproduced). `scan` stays as a getter, so e2e station 6's `debug().scan` still reads.
- **N8**: works once the course has registered (finding 3).
- **N9**: `isSlideDoor` gates the menu rows, the menu pick, the committed open (opens at once), peek eligibility, host crack, `Doors.crack` (solo, host and client prediction) and `Doors.drive`. Bash happens only from the menu (`gameState.ts:1411`). Hinged doors take the old paths (`slide` defaults to false, and `leaf` is only written for a slide door in `levelBuilder.ts`).
- **Q2 / A8**: `em.stealth = true` in `CourseMode.start` (`enemyMgr` exists before `mode.start`, `gameState.ts:632` vs `:1033`). Existing Marlow guards are passive, so nothing changes for them.
- **Q4**: `em.despawn` removes the guard, his bodies, his rosters and his torches.
- **Q9**: `spotOccupied` counts every remote player for the guard auto-close and the door-menu close. `remotePlayers()` returns the host's stored array, so there is no allocation.
- **Protocol 30**: every `toBe(29)` has moved to 30 (jammer, jammerFixes, moveState, net (and the refusal test 29 refused / 30 joins), rejoin, sectorStep3, marlowN6Scanners, marlowHoldNoise). No script asserts the version. `docs/systems/coop.md:24` names both 30 changes. The `PROTOCOL_VERSION` comment covers both.
- **Hard rules**: single player reaches no `src/net` code (the new `holdPulse.ts` is imported only by `coopHost` / `coopClient`; `coopUi` importing `courseDef` is net -> game, allowed). No allocation was added to per-frame paths: loops are indexed, the scratch `glowAt` is reused, and `packScan` allocates once per wire send. Gameplay reads no graphics state. Strict TS is clean.
- **Sector Ops**: no consoles or scanners. Dead-section cameras stay `'off'` (`m = 'off'` when `dead`), and `sc` is omitted when there are no pairs, as before.

## Checks run

- `npx tsc --noEmit`: clean at HEAD 6f884677. An earlier run showed TS6133 in the other agent's `tests/ctcourseGreybox.test.ts` while it was in the working tree; it is gone since 9f27e969.
- `npx eslint` on the 21 slice 0 source files and 8 new tests: clean.
- `npx vitest run` on the 8 slice 0 tests (marlowHoldNoise, N1, N2, N3, N4, N6, N9, PassAny): Test Files 8 passed (8), Tests 77 passed (77).
- Net and protocol neighbours (jammer, jammerFixes, moveState, net, rejoin, sectorStep3, netSim, holdNoise, sectorBolt, sectors): Test Files 10 passed (10), Tests 200 passed (200).
- Course neighbours (course, courseTutorial, courselab, ctcourse, ctcourseLight, marlowT1a, marlowT2, securityRoom, scanners, laserAlarm, laserPanels): Test Files 11 passed (11), Tests 178 passed | 1 skipped (179).
- Door neighbours (doorMenu, doorOpen, doorPeek, doorPeekParity, doors): Test Files 5 passed (5), Tests 32 passed (32).
- No e2e (the laptop runs those). Slice suites: e2e-ctcourse (after finding 1), e2e-course, e2e-coop, e2e-netmove, e2e-stealth-ai (door menu), e2e:quick.
