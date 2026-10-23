# S0g - N9 sliding doors (no swing-only verbs)

Slice 0g, door part (SPEC section 14 N9, PLAN 0g). Date 2026-10-23. Not committed (the job lead commits).

## Built
A sliding door (`Door.leaf: 'slide'`, the facility kit's `slidingDoor`) now offers Open only and never runs a swing-only
verb. Every guard reads one predicate, `isSlideDoor(anchor)` (`src/world/doorPeek.ts`). Hinged doors (no `leaf` key or
`'swing'`) take exactly the old paths.

| Verb path | Where | Slide door |
| --- | --- | --- |
| Door menu rows | `doorMenu.ts` `doorMenuOptions` / `addDoorRows` (new `slide` arg, default false) | `['open']` only: no stealth, bash, optic |
| Menu pick | `gameState.ts` `doorMenuPick` | any pick other than Open is ignored (unreachable from the rows; a guard for scripted picks) |
| Committed open (step, hand on leaf, push) | `doorOpen.ts` `doorOpenMove`, `DoorOpenCore.start` now returns boolean (false at a slide door) | no move; `gameState.startDoorOpen` calls the door's own use at once (the interactable's `onUse`, so the host's door in co-op, as before) |
| Door peek offer (stealth row) | `doorPeek.ts` `doorPeekEligible` | never on offer |
| Host check of a client crack | `doorPeek.ts` `hostCrackOk` | crack-on refused; crack-off still passes |
| Crack state | `doors.ts` `Doors.crack` | crack-on returns false (covers solo, host and the client's prediction in `coopClient.ts`) |
| Stealth stick drive | `doors.ts` `Doors.drive` | no-op |
| Bash (and its guard knock-out) | menu only | never listed |
| Guards' `pushOpen`, `open`, `close`, `setOpen`, locks | `doors.ts` | unchanged: the leaves slide on the same `DoorState` |
| Light / sight closed-leaf test | `lightField.ts` `doorBlocksOne` (plane through the hinge along the opening, `open <= DOOR_SHUT`) | unchanged and correct: the shut slide leaves lie on that plane; `open` drives both |
| Co-op | no wire change (`open` / `target` / locks already sync; `cracked` can never be set on a slide door) | parity unchanged, no `PROTOCOL_VERSION` bump |

Not swing-dependent, left as is: `remoteAvatar.crackedHandle` and `localMoveState` door-peek fields (only in mode
doorPeek, which a slide door never enters), the camera's door passage (`Doors.nearest`), `doorGhosts` (closed state
only), AI (`enemyManager` calls `pushOpen` only).

## Assumptions (logged, Michael asleep)
- A1: Open at a sliding door is immediate (a motorised door: no step to the latch side, no hand). Undo: drop the early
  `use()` branch in `gameState.startDoorOpen`.
- A2: Optic cable is dropped from a slide door's list too (SPEC N9 "Open only"; it is a stub anyway). Undo: push
  `'optic'` before the `slide` return in `doorMenuOptions`.

## Files
- `src/game/doorMenu.ts` (owned): `slide` arg on `doorMenuOptions` / `addDoorRows`.
- `src/world/doorOpen.ts` (owned): `doorOpenMove`, `DoorOpenCore.start` returns boolean.
- `src/world/doorPeek.ts` (crack / peek checks; no other owner): `PeekDoorAnchor.leaf?`, `isSlideDoor`, the
  eligibility and host crack checks.
- `src/world/doors.ts` (no other owner): `crack` and `drive` guards.
- `src/game/gameState.ts` (no other owner): passes `slide` to the rows, ignores non-Open picks at a slide door, opens a
  slide door at once from `startDoorOpen`.
- `tests/marlowN9SlideDoor.test.ts` (new, 12 tests).

## Checks
- `npx tsc --noEmit`: clean.
- `npx eslint` on the 6 touched files: clean.
- `npx vitest run tests/marlowN9SlideDoor.test.ts tests/doorMenu.test.ts tests/doorOpen.test.ts tests/doorPeek.test.ts tests/doorPeekParity.test.ts tests/doors.test.ts`:
  `Test Files  6 passed (6)`, `Tests  43 passed (43)`. No existing door test changed.
- No full run, no e2e (per brief).

## e2e suites that cover doors (for the slice run)
- `e2e-stealth-ai`: the door menu (`g.doorMenu.open`, opts) and bash knocking out a guard behind the door.
- `e2e-netmove`: client door peek and crack parity on the Proving shed door (`doorPeek` compare).
- `e2e-coop`: door sync, a client door use, the client door peek; course door locks and airlocks to the client.
- `e2e-ctcourse`: course doors, airlocks and locks (the set parts that place slide doors).
All of these use hinged doors today; no e2e drives a slide door yet. A slide-door step (menu shows one row, Open opens
at once, a guard pushes it open) belongs in the set's `e2e-ctcourse` part once a holding room or the lounge places one.

## Open items / for the job lead
- `src/world/props/propRender.ts` `frame()` drives strongroom leaves from `leafFraction` (the hinged swing). Fine while
  the strongroom door is hinged; if a set ever ties a prop leaf to a `leaf: 'slide'` door, it would swing instead of
  slide (props agent's file, not touched).
- Kit: no change needed (`slideFraction(open, ajar)` still works; `ajar` stays 0 on a slide door now).
- Michael to try: walk to a holding-room sliding door, hold the context button: one row, Open door; the door opens at
  once with no step or hand; a guard walking in pushes it open; in co-op both pages see it open.
