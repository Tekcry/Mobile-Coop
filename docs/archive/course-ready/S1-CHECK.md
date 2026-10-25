# course-ready S1 - check (fresh checker, 2026-10-20)

Reviewed: `1f8bce59` against `4eae88ae` (`src`, `tests`, `docs/ct-prototype`), with `AUDIT.md` and `S1-REPORT.md`.
Ran: `npx vitest run tests/ctcourse.test.ts` (25 passed), `npx tsc --noEmit -p tsconfig.json` (exit 0). No build, no
e2e (the job lead is running them).

## Verdict: PASS

Nothing is broken or unplayable. Neither player can get stuck at station 2. `PROTOCOL_VERSION` is unchanged (24).
`src/net/protocol.ts` and `courseWire.ts` are not touched, and no new import reaches `src/net` from single player.

## Evidence per question

1. **F7 / F8, station 2.**
   - Side test: `courseState.ts:243-249` computes `dx = feet.x - at.x` with `at = [31, 7]` (`ctcourse.ts:161`).
     - Feet x > 31 (past the leaf, in the far doorway recess or against the far face at 31.5) unbolts.
     - The near side (x < 31) gets `REFUSE_BOLT`.
     - The item sits at (31, hinge y, 7) with reach 1.6, and `nearest` checks |dy| < 1.5 (`interactables.ts:133`), so a
       player on the 4.4 m wall top cannot unbolt from up there. The text says "on the far side".
   - Disable / re-enable:
     - `CourseMode.applyLocks` (`courseMode.ts:655-661`) sets each bolt item to `st.boltUsable(gate)`
       (`courseState.ts:471`, `!over && !isGateOpen`).
     - `applyLocks` runs after every handled event (`handle()`, `:520`) and on every wire send (`:496`).
     - A restart closes the gate (`restart()` `:363`, pushes `gateClosed`), so the next `handle()` turns the item back on.
     - Nothing else enables it (the only other `setEnabled` is at creation, `:283`).
   - Client: the snapshot item list carries `on: it.enabled && !it.done` (`coopHost.ts:927`). Its change signature
     includes `on` (`coopHost.ts:961`), so a toggle re-sends the list at once. `CoopClient.syncItems`
     (`coopClient.ts:323-325`) mirrors it with `setEnabled`. The host also drops a stale client `use` of a disabled item
     (`coopHost.ts:492`). So both pages see the item off once unbolted and back on after a restart. The door lock reaches
     the client through `course.locks` (`applyCourseWire`, `courseMode.ts:848-851`).
   - Door menu: with the bolt item off, `gameState.ts:1030` lets the menu through (the only remaining target is a
     `door-*` item, or none). Both sides can open S2-door after the unbolt.
   - Stuck: no. Before the unbolt the near player reads "Bolted from the other side". After it, both get the door menu.
     After a restart the bolt comes back.
2. **F3, `coopHost.onRespawn`.**
   - `CourseMode.id` is `'course'` (`courseMode.ts:108`), so the check is right.
   - `onRespawn` runs only from the host's scheduled respawn (`gameState.ts:1572`). In the course that respawn has two
     triggers:
     - The bay-N start (`courseMode.ts:204`, time 0): the alive client is moved to checkpoint + (1.03, -0.61), still
       inside the entry airlock (e2e-course's A1 box x 8-14, z 1-7 holds). Side effect: a "BACK IN" banner on the client
       at match start (cosmetic).
     - `bayRestart` (`:537`).
   - A plain revive goes through `reviveOne` (`coopHost.ts:383-399`) without a respawn, so it is unaffected.
   - The both-down restart keeps the old `reviveOne` branch (the client is not alive).
   - Mid team move: the client's `revive` handler (`coopClient.ts:498-506`) clears `controller.override` and
     `traversal`, but not `g.team`. A restart with the client alive needs the host to go OUT first, and any pair move with
     the host ended already: `teamController.ts:299-302` and `:473-476` end a hold "partner gone". Sector Ops has used the
     same path. Low risk: polish item P5.
3. **F1 HUD.**
   - `courseHud.ts:80` changes only the drill-less branch. Bays with drills keep `next.text` or "Objectives done...".
   - The client HUD is built from `g.world.layout.course.def` (`courseMode.ts:769-773`). That is the same map-built def,
     so it carries `objectives` and shows the same line on both pages.
   - Layout: `.course-hud` has `max-width: min(360px, 44vw)`, `.ch-step` 20 px `white-space: normal`
     (`styles.css:3464`, `3477`). 90 characters wrap to about 3-4 lines with no overflow.
   - `validateCourse` holds objectives to `COURSE_TEXT_MAX` 90 (`courseDef.ts:295-300`).
   - The import is safe: `courseDef.ts` imports only `config/course` and a type from `world/rooms`.
4. **Gate radio.**
   - Which gates fire:
     - g-s2 (bolt), g-s4 (pickup), g-s5 (pair) and g-s5-grid (lever) fire through `setOpen`, which emits once per
       closed-to-open edge (`courseState.ts:674-677`).
     - g-s3 and g-s6 are flag gates, spoken on `flagSet` (`courseMode.ts:543-547`). `setFlag` deduplicates
       (`courseState.ts:207-212`), and CtDevices sets a zone flag once until a restart re-arms it (`ctDevices.ts:475-487`).
   - Each open is said once on the host. The client gets it through `rl` / `rln` (`courseMode.ts:486-491`, `810-812`).
   - A restart re-open says it again, once (one line per real open, not spam). No other gate or flag in the course matches
     these keys.
5. **Text.**
   - Checked against `keyBindings.ts:47-62` and `gamepadMapping.ts:53-65`:
     - A / E interact
     - Y / Space climb
     - X / RMB draw
     - LB / Tab tap switch weapon
     - LT / Z `altFire` (the jammer hold)
     - RB / F Co-op
   - Other facts checked:
     - The S4 release is on the left of a player facing +x (Babylon left-handed: left = +z, north fence z 13.6). Its
       backing is red (`#5a1d1d`).
     - The S6 ready lights are green (`ctDevices.ts:78`). The sync window is 1.5 s (`scanners.ts:15`).
   - No em or en dash anywhere in the diff.
   - One inaccuracy: panel 7 says "Y / Space at the top", but the rope tops out on its own at the top
     (`teamMoves.ts:317-318`, e2e station 7 uses the stick only). Polish P1.
6. **Squares.**
   - `LEGUP_SPOT` (bay + 8.0, z 3.5) is the booster spot of e2e `legUp(x0 + 8.0, 3 / 3.6)` (`e2e-ctcourse.mjs:92-95`,
     `:336`, `:431`, `:444`):
     - stations 2 and 7: 0.5 m from the 1 m walls' face (x0 + 8.5)
     - station 5: 0.85 m from the annex lip (x0 + 8.85)
   - The unit test runs `findJumpTarget` from each square and gets a climbable band lip.
   - The S3 pocket is `#6f8296` on the built square. The airlock pads stay `#2f6b4a`.
7. **e2e risk: none found.** No e2e asserts on panel, radio, objective or `.ch-step` text, the course "DOWN" banner, or
   square positions or colours. The suites that touch the changed paths:
   - `e2e-ctcourse:436-440`: the client's near press is refused, the host's far press from 32.2 opens. The item goes off
     only after the open, and nothing presses `c-g-s2` again.
   - `:461-463`, `e2e-course:273-275`: the first plate of the `Promise.all` now shows the pair hint (no assert), and the
     second opens.
   - `e2e-course:253-259`: the bolt is refused at 26.8 and opens at 25.2. The item is still on for the second press.
   - `e2e-course:402`: `d.refusal` `/ladder/` is the later end refusal.
   - `e2e-course:441-449`: the bay-2 start stays inside the A1 box.
   - `e2e-coop` has no course path.
8. **Tests.** The new block drives the real `CourseState` with the real validated `ctcourse` def, and the real
   `findJumpTarget` on the built boxes. They are not copies. Not unit-covered: the `CourseMode` wiring (bolt toggle in
   `applyLocks`, the `flagSet` radio, the HUD fallback) and `CoopHost.onRespawn` (no harness). See P6.

## Fix list
None.

## Polish (not blocking)
1. Panel 7 (`ctcourse.ts:115`): "Partner: climb it, Y / Space at the top" is wrong, since the rope tops out on its own
   (`ropeEndOf`). A one-line text fix: "Partner: climb it (stick up)".
2. `GATE_RADIO['g-s6']` says "Door open." but a flag gate only unlocks S6-door. Say "Door unlocked." as g-s3 does.
3. The "crouch + Co-op" lines never name the crouch keys (B / C).
4. Radio 3 says "X draws" while panel 3 says "X / RMB". Make them match.
5. The client `revive` handler (`coopClient.ts:498-506`) resets less than the host respawn does (`gameState.ts:1553-1560`).
   It skips the team move, wall core and door peek. F3 now sends alive course clients through it, so `g.team.end(true)`
   there would be safer. It also shows "BACK IN" at a bay-N start and on a restart. The restart one doubles as the
   client's missing restart cue (F4 client part, wire change deferred).
6. The e2e station 2 near-side press never reaches `REFUSE_BOLT`. The client at (30, 3) is 4.1 m from the bolt, beyond
   the host's use reach of 2.35 m (`coopHost.ts:493`), so it is dropped as a violation. The assert passes vacuously.
   Moving the client to (30.2, 7) first would test the real refusal; this is runner-owned, tell the orchestrator. Useful
   e2e adds: the client's `c-g-s2` shows `enabled === false` after the unbolt, and the client's `.ch-step` is non-empty
   at a station.
7. `REFUSE_PAIR` says "plate" and also shows on the courselab switch pair and the parked bunker key pair. A neutral
   wording, "Partner: press the other one now", would fit all three.
8. The parked bunker now shows its first objective per drill-less bay on the HUD step line. This is harmless (parked, no
   e2e in the full run).
9. Job end: the `CHANGELOG.md` "Unreleased - course-ready" entry and `TESTING.md` are not in S1 yet. The stale light-pass
   square positions in `AUDIT.md` and the `e2e-ctcourse.mjs` header are already noted by the implementer.
