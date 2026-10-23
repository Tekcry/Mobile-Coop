# E3 check - pair bolt (EW3) and pair gate (EW4)

Checker, feature/sector-redesign-e3 @ 7e2b1802 (diff vs 95097957), 2026-10-23. Read-only review.

## Verdict: PASS

No blocking findings.

## Checked
- **Pair bolt** (`src/game/sectors.ts` `SectorBolts.press`, `partnerAtDoor`; `src/game/sectorTeamDoors.ts:155`):
  `use` refuses any pair bolt; `press` needs the user in `inBoltReach` on the bolt side and a mate with depth in
  [-1.5, 0], on the span, within 1.0 m rise. One player alone fails from either side (from the near side the user is not
  in bolt reach; from the bolt side there is no mate). Mates are built from every ref except the user's index and only
  if `target.alive` (a downed partner is `health.alive === false` on `RemotePlayer`), so the same player twice or a
  downed player cannot satisfy it; `m !== user` is a redundant extra guard. `mates` is a reused array, cleared after.
- **Pair gate** (`src/game/pairPress.ts`, `SectorPairGates.press`): two different player indices within window + 1e-9,
  either order; same player on both keys refused (`pa/pb === p`); a press past the window forgets the other half;
  `reset` clears both halves and `open`. Sector passes `solo = false`. Turned by a downed / unknown user -> 'done'.
- **Refactor, no behaviour change**: `pressPairHalf` is a line-for-line lift of the old `CourseState.pressPair` body
  (flag + `setOpen` only on success, as before). Plain bolts: `press` = old `use` (shut, reach), item, side, span, depth,
  nav closure sizes (0.5 / 0.35), feed only for refs[0], `secT = 0` on change - all unchanged. `boltInfo` keeps every
  field e2e-sectorops part 2 reads (id, sec, k, door, at, side, shut, locked; adds pair, nav), `useBolt` keeps its
  signature. e2e-ctcourse's pair-gate station goes through `CourseState`, whose rule is unchanged.
- **Nav closure**: shut at build (`closeDoor`), opened in `openDoor` for both kinds, shut again in `reset`.
- **Restart (A50 / M9)**: `team.reset(run.index)` in `restartSection` re-bolts, re-locks gates (`lockDoor(on)` also
  swings the leaf shut), re-enables both switches and the Unbolt, nav shut, `changed()` for the client's `lk`. It runs
  before the G22 door restore, which leaves locked doors out.
- **Host authority**: the client does not run `SectorMode`; it mirrors the `c-` items via `syncItems`, whose `onUse`
  only sends `use`; `coopHost.onUse` (`src/net/coopHost.ts:592`) checks alive, enabled, reach, then calls the item's
  `onUse` with the peer id. Door locks reach the client only via the host's `lk`. No wire change, `PROTOCOL_VERSION`
  correctly untouched.
- **Hot paths**: nothing added per frame except `team.now = this.t`. `user()` returns a small object literal and
  `find` closures run only on a use event - fine.
- **Strict TS**: clean.

## P1 - gate unlocks, does not swing open
Keep. It matches the course `PairGate` (course `applyLocks` only auto-opens airlock far doors, not pair gates), it
keeps one door verb for both kinds of team door, and the leaf staying shut leaves the guards' nav rule simple (nav
opens on unlock, as the drawn bolt). Revisit only if S4/S5 playtests show players stalling at an unlocked gate.

## Missing client refusal feed line (P4)
Acceptable for the prototype. The client still sees "Unbolt" / "Turn key" and the door simply stays locked; the host
gets the lines. Minimal fix when the S4/S5 map slice adds the e2e: send the refusal over an existing host-to-client
event (the banner/event path `coopClient` already reads) to the using peer only - no new message type.

## Tests
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/sectorBoltPair.test.ts tests/sectorPairGate.test.ts tests/sectorBolt.test.ts
  tests/navClosure.test.ts tests/sectorRestart.test.ts tests/sectors.test.ts tests/course.test.ts tests/ctcourse.test.ts
  tests/ctcourseLight.test.ts tests/courselab.test.ts tests/courseTutorial.test.ts`: 11 files, 183 passed, 1 skipped.
  (Only `course.test.ts` greps for pair gate; the other course files were run as the refactor's wider cover.)
- No e2e, no build (as instructed).

## Polish (non-blocking)
1. `SectorTeamDoors.unbolt` does not check the user's own `target.alive` (turnKey does). Clients are covered by
   `coopHost.onUse`; the local player is covered only if a downed player cannot interact. One-line guard for symmetry.
2. The paste-ready example in `e3-pair-doors.md` sets `y: 1.1`, while `SectorKeySwitch.y` defaults to the door's floor
   and the switch mesh already sits 1.3 m above its node (`interactables.ts:85`). The map slice should leave `y` at
   the floor height or the box floats at ~2.4 m.
3. The e2e for both kinds is owed with the S4/S5 map slice (builder notes it).
