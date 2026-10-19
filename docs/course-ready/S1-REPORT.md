# course-ready S1 - implementer report (2026-10-20)

Fixes from `AUDIT.md` for Marlow Yard (`ctcourse`). Not committed (the job lead commits). No wire change:
`PROTOCOL_VERSION` unchanged. No lamps added or moved. `LIGHT.md` untouched.

## Fixes

| Id | Status | Where | What |
| --- | --- | --- | --- |
| F7 | done | `src/world/maps/ctcourse.ts:161` | Bolt `at` is the door plane `[bayX(1) + CT_OBST, 7]` (x 31). Feet x > 31 unbolt; near side and near doorway (x <= 31) get "Bolted from the other side". The "Unbolt" item now sits at (31, 7), so the far player reaches it from anywhere within 1.6 m of the door. |
| F8 | done | `src/game/course/courseState.ts:471` `boltUsable`; `src/game/modes/courseMode.ts:115-116, 286, 657-661` | `applyLocks` disables each bolt item while its gate is open (or the course is over) and re-enables it when the gate shuts (bay restart). The client mirrors it through the item list's `on` flag (existing `items()` / `syncItems`). With the item off, the CT door menu shows again on both sides. |
| F1 | done (src/ui edit, approved) | `ctcourse.ts:142-151, 207` `OBJECTIVE_TEXT` / `objectives`; `src/game/course/courseDef.ts:139` `bayObjective`; `src/ui/hud/courseHud.ts:13, 79-80` | Not possible from src/game alone (the HUD reads only drills and `bay.exit`; a fake drill would gate the airlock). One objective per bay in `CourseDef.objectives` (already validated, <= 90). The HUD step line shows it while the bay has no drills. Client parity: the mirror builds the same def from the map. |
| F2, F9, F12, F16 | done | `ctcourse.ts:132-139` `GATE_RADIO`, `:196-200`; `courseMode.ts:543-547` | Radio lines keyed by gate id. Bolt, pickup, pair and lever gates fire on the existing `gateOpened`. The flag gates (`g-s3`, `g-s6`) never emit `gateOpened`, so `CourseMode` now speaks a flag gate's line on `flagSet`. The client gets them through the existing `rl` / `rln`. |
| F12, F14, F10, F15, F18 | done | `ctcourse.ts:105-129` `PANEL_TEXT`, `RADIO_ENTER` | Pad and keyboard words, checked against `keyBindings.ts` and `gamepadMapping.ts`: A / E, Co-op (RB / F), LT / Z, Y / Space, X / RMB, LB / Tab. Station 3 names LB / Tab to the pistol and X to draw. Station 4 names the red release on the left fence. Panel 5 is two sentences; the hatch step moved to the `g-s5` radio. Panels are capped at 120 characters (`PANEL_TEXT_MAX`). |
| F5 | done | `ctcourse.ts:39-40, 265, 306`; panel 1 / radio 1 | Blind spot `#6f8296` (pale blue-grey); airlock pads keep `#2f6b4a`. "green pad" is now "airlock pad". |
| F11 | done | `ctcourse.ts:45` `LEGUP_SPOT`, `:275, :287` | The leg-up squares at stations 2, 5 and 7 are now 1 x 1 m at (bay +8.0, z 3.5). That is the e2e booster spot (`legUp(x0 + 8.0, 3 / 3.6)`): 0.5 m from the 1 m walls' face and 0.85 m from the annex lip, beside the door. A unit test confirms a leg-up from each square finds a climbable lip in the band. Station 3 and 6 door squares are unchanged. |
| F17 | done | `courseState.ts:46` `REFUSE_PAIR`, `:681-707` | `pressPair` returns "Partner: press the other plate now" on a lone press, a same-player second press, or a late press. `press` returns it, and `CourseMode.refuse` shows it to whoever pressed. The client sees it through the existing `ref` / `rn`. The same applies to courselab and bunker pair gates. |
| F4 | host part done, client cue skipped | `courseMode.ts:711-714` | The host banner reads "PARTNER DOWN - Restarting the bay" when the host is up (the partner went out), else "DOWN - Restarting the bay". The client restart cue needs a wire field: skipped (see below). |
| F3 | done (src/net edit, approved) | `src/net/coopHost.ts:1177-1179` | `onRespawn` now also brings an alive partner back to the checkpoint in course mode (`r.revive` plus the `revive` event, as Sector Ops). No wire change. No unit test: the logic sits in `CoopHost`, which has no unit harness (no test constructs it). e2e-course covers the path. |
| F19 | done | `docs/ct-prototype/CTCOURSE-SPEC.md` | "Placeholder now" column replaced with "Built now (gate)". Rules list the current state. |

Text added (verbatim):
- Radio by gate:
  - g-s2 "Unbolted. Open the door for your partner."
  - g-s3 "Door unlocked. Holster first (X / RMB), then open it (A / E)."
  - g-s4 "Laser down. Both of you through, then onto the airlock pad."
  - g-s5 "Plates done. Crouch at the hatch, face it, Co-op (RB / F): lower your partner to hack."
  - g-s5-grid "Grid open. Off the roof, in the front door, through the grid to the airlock."
  - g-s6 "Scanners synced. Door open. On to the airlock pad."
- Panels, bay radio and objectives: see `ctcourse.ts` `PANEL_TEXT`, `RADIO_ENTER` and `OBJECTIVE_TEXT`.

## Tests
`tests/ctcourse.test.ts`:
- The old bolt assertion (`at[0] > 31.5`) is updated to `at[0] === 31`.
- New block "course-ready S1":
  - F7: far side at +0.1 / +0.6 / +1.2 opens; -0.1 / -0.6 / -1.5 refused.
  - F8: `boltUsable` is true, false after the unbolt, true after `restart`, with door locks to match.
  - F17: lone press hint; partner within 0.5 s opens; 1.5 s late gets the hint.
  - F2: a radio line for each listed gate in its own bay; g-s3 and g-s6 are flag gates.
  - F1: 8 objectives and `bayObjective`.
  - Text limits: radio and objectives <= 90, panels <= 120, no em or en dash, no "green pad". Co-op names RB / F, LT names Z, A names E. Panel 3 and 4 wording; panel 5 is two sentences.
  - F5: pocket colour on the built square.
  - F11: square present, and a leg-up from it reaches a climbable band lip at stations 2, 5 and 7.

Results:
- `npx vitest run tests/ctcourse.test.ts tests/course.test.ts tests/jammer.test.ts tests/scanners.test.ts`: 89 passed.
- `npx tsc --noEmit -p tsconfig.json`: exit 0.
- `npx eslint` on the 7 changed source and test files: exit 0.
- Not run (per instructions; desktop lock): `npm run build`, the full `npm test` and any e2e.

## e2e assertions the change could affect (and why they still pass)
- `e2e-ctcourse` station 2 (`:436-440`): the client presses `c-g-s2` from its leg-up spot (feet x 30 < 31), so it is refused. The host presses from x 32.2 (> 31), so it opens. The item is still enabled at both presses (it goes off only after the open); `use()` calls `onUse` directly, so its new position does not matter.
- `e2e-ctcourse` station 5 (`:461-463`): both plates are pressed with `Promise.all`. The first press now returns the pair hint (a banner, no assert); the second opens the gate as before.
- `e2e-course` (courselab):
  - The bolt walk refuses from x 26.8 and opens from x 25.2: unchanged.
  - The pair `Promise.all`: same as above.
  - After the forced both-down restart the bolt item is re-enabled (gate shut), so the client's walk can use it.
  - `d.refusal` `/ladder/` at `:402` is set by the end refusal after the gates: unaffected.
- `e2e-course` "Start at bay 2" (`:441-449`): F3 also runs on the start-at-bay respawn (time 0). The alive client is moved to the checkpoint plus the usual revive offset (about +1.0, -0.6 m), inside the A1 box the assertion checks (x 8-14, z 1-7). Cosmetic side effect: the client sees a "BACK IN" banner at a start-at-bay match start.
- No e2e matches on panel, radio or objective text, on the "DOWN" course banner, or on square positions and colours. The HUD tests (`e2e-course`, `e2e-bunker`) check the `ch-bay` text, the drill rows, the `data-obj="exit"` row and `ch-air`. All are unchanged; the step line changes only in bays without drills.

## Changes outside the allowed list (approved by the orchestrator through the job lead)
- `src/ui/hud/courseHud.ts`: import `bayObjective`, plus the step text fallback (1 line):
  `const text = st.over ? 'Course complete.' : next ? next.text : bay.drills.length ? 'Objectives done. Both of you onto the airlock pad.' : (bayObjective(st.def, bay.id) ?? '');`
- `src/net/coopHost.ts` `onRespawn`: `else if (this.g.mode?.id === 'sector' || this.g.mode?.id === 'course') {` (F3).

## Needs a wire change (not made)
- F4 client restart cue: the client gets no restart banner. Smallest change: a restart counter in `CourseWire` (`rs?: number`, bumped in `CourseMode` on `bayRestart`), shown by `applyCourseWire` as "RESTART - <bay id>" when it grows, as the radio counter does. That is a `src/game/course/courseWire.ts` field and needs a `PROTOCOL_VERSION` bump plus the tests that assert it. The `BACK IN` banner from F3's `revive` event already tells an alive client it was moved.

## Open items
- `AUDIT.md`'s light-pass table still lists the old square positions: (29.4, 7) at station 2, (95.4, 7) at station 5 and (139.4, 7) at station 7. They are now (30, 3.5), (96, 3.5) and (140, 3.5). Tell the `LIGHT.md` author.
- The `scripts/e2e-ctcourse.mjs` header still describes the B1 placeholders (runner-owned; orchestrator).
- The `ctcourse.ts` file header comment still mentions placeholder gates (cosmetic).
- F6 (role-swapped e2e, real door opens), F13, F21, F22: not in this fix list.
