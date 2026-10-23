# S6 check - Marlow Yard rated sets + merge 75efa7e7 (fresh checker, 2026-10-23)

Verdict: **PASS**

Scope: merge 75efa7e7 conflict resolutions (src/net, coopClient.ts, protocol.ts, sectorMode.ts, sectors.ts, tests);
S6 = `git diff 75efa7e7..902ed880`.

Runs: `npx tsc --noEmit` clean. `npx vitest run tests/courseMarks.test.ts tests/ratingWire.test.ts tests/net.test.ts
tests/course.test.ts`: 4 files, 129 pass. (No `npm run check`, no e2e, per brief.)

## What was checked
- Merge: every conflict kept both sides. protocol.ts = 37 with the 36 history kept (crate kind/event, `use.pulse` hold
  pulses present); coopClient.ts keeps `HoldPulseWatch` and adds `SectorRatingWire`; sectorMode.ts restart keeps the
  owed grant + `markCheckpoint` and marlow-final's `crates?.resetAll()`; debug keeps `rating` and pairGates / codes /
  desks / crates; `detSeen` tally and `team.now` both kept; sectors.ts keeps `markCount` and stage / desk imports.
  Course restart full reset (S10 `dropSquad(true)`, doors) intact around the new `begin` call.
- PROTOCOL_VERSION 37: every assert reads 37 (net, ratingWire, rejoin, crateWire, jammer, jammerFixes, moveState,
  marlowHoldNoise, marlowN6Scanners, sectorLampSync, sectorStep3); 36 refused / 37 joins.
- Rules: `rateSection` with DEFAULT_RULES (A2 KO not a kill, A3 camera breaks Undetected, A4 clean earns Bodies hidden);
  camera / laser alarms counted via the ct `record('alarms')` hook only (the hook records nothing else), so they break
  Undetected and No alarms (A10). Grants via `rewardsFor` + A9 (alarmStep -> +1 gadget, capped at total carry);
  syringes capped at preset + 2 over `revivesLeft` (course uses the same ReviveClock cap); solo -> medkits (A7).
  Synced: KO by player 0 / 1 within SYNC_WINDOW on the course clock, recorded as a team stat; paid max 2.
- A1 / drills: `rated = squad.some(!passive)` - A1's passive checker and squad-less drill bays (bunker / courselab)
  unrated, as BRIEF A5 / PLAN S6.
- Event order: `seal` pushes `airlockCycled` before `bay++` / `bayStarted`, so `rate(bi)` runs while `CourseMarks.bay`
  is still the sealed set; `bay !== this.bay` guard also blocks start-at-skipped sets.
- Restart: `bayRestart` re-`begin`s the current set (base copy, camAlarms 0, detector reset); CourseState never zeroes
  bay stats on restart, so the rise stays right; `marks[bay] >= 0` blocks a re-rate; the grant fires only on a fresh
  rating -> no double grant.
- Host / client: `course.rt` copied per send, parsed by `courseRt` (bad -> dropped, counts clamped 0..99, sec -1..63);
  client `mirrorRating` acts once per new `sec`; the first message after join / rejoin records only (no top-up); the
  last set (finish) carries a zero grant and shows no card. Idempotent on a missed message (next send repeats `rt`).
- courseMode / courseMarks import nothing from src/net. Per-frame paths (`live`, card update, frame stats) allocate
  nothing; allocations sit in rating / message handlers only. Strict TS clean.

## Must-fix
None.

## Should-fix
- src/game/modes/courseMode.ts:1156 - a late joiner / reloaded rejoiner gets only the host's last rated set in its
  results (earlier sets' lines missing). Results only, no grant effect.
- Co-op Marlow card and client top-up are not covered by e2e (STATE "Open"); S7 or the PR run should add one co-op pass.
- src/game/modes/courseMode.ts:751 - co-op is `g.net !== null`: a host alone in a co-op room (course solo flag) gets
  the co-op table (syringes, not medkits). Edge case.

## Polish
- src/game/modes/courseMode.ts:992 - `rt: { ...this.rt }` allocates per course send (the message already allocates;
  not per frame).
- src/game/modes/courseMode.ts:795 - a medkit grant at full health heals nothing and is not banked (same as Sector Ops).
- Finale tier and results stats stay cumulative over a set restart (pre-existing, noted in STATE).
