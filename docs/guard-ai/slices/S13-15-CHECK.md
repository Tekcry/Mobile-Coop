# S13 + S14 + S15 check (fresh checker, 2026-10-23)

Branch `feature/guard-ai-s15` at e8a3973e (S15 + S13 + S14 merged on `feature/guard-ai-s12` a31daa61). Reviewed
`git diff origin/feature/guard-ai-s12...HEAD` (32 files, +3864 / -46) against NEXT-BRIEFS sections 2-4,
`research/stealth-over-shooting.md` items 3, 4, 6, 7, 8, 11, PLAN rows S13-S15, BRIEF A37-A43, A46, A52-A56, A60-A64,
A70-A77, the three slice reports and Michael's Decided rules.

## Verdict: PASS (one e2e fix made)

No broken or unplayable code, no breach of Michael's rules or the hard rules. One e2e block written for S14 could not
pass as written (below); fixed in this round.

## Findings

### Blocking
1. `scripts/e2e-stealth-ai.mjs` 'loud shot' (S14): the hearer was spawned at (-7, 14), in the racking hall. The line
   from the shot at (0, -5) crosses the x -4 wall at z 5.9 (no gap there: gaps at z -2..-0.9 and 8..9.1), so his reach
   is 28 x 0.45 = 12.6 m (`HEARING.wallDb` 6.9, `turnDb` 0) against 20.2 m: he never hears it, never calls, and the
   first assert (`r.left > 1.5`) and every later one fail. Fix: the hearer at (19, -5) on the factory floor, 19 m along
   a clear line (pillars at z -4 and the machines at z -3.3..-1.7 and x 19.9..21.1 are off the line): tier 1 (14..28 m),
   the far guard (-21, 17) still 30.4 m off (out of reach, beyond `INCIDENT.callR` 25 m so the board's cover search
   falls through to him as any free guard, as the block expects).

### Rules and spec, checked (hold)
- Riot shields only in response teams: `responseTeam` puts the `enforcer` first, `validateGuardAi` rejects one in a
  section list (S11), live maps send enforcer + 2 grunts; the parked path keeps grunt, grunt, heavy.
- Alarms escalate with gear and a team, no cameras: `raised` calls `setAlarmStage` (panel, radio and camera alarms all
  pass there), `placeSlot` and `revive` add the stage gear after the slot's own `setGear` (no later `setGear` wipes
  it: the only other callers are `inherit`, before `giveStageGear`, and `joinTeam`, which keeps the armour). No
  CtDevices code touched; a restart reloads at the section's start stage; outside Sector Ops the stage stays 0.
- Response teams stay and search: hunting (fought + aggressive) never calms; the sweep is a team state over the
  searching level; teams end only in `clear` (unload / restart); `despawnAll` is the only despawn path.
- Missed check-ins and found bodies raise alert; gunfire alerts the section; not everyone at once: both new calls are
  S3 radio calls (2.5 s x reaction, cuttable, staggered delivery), section caution is the timed S4 caution 1, no alarm
  from shots (M4). Suppressed shots go through `hear`, never `noise`.
- Shot lamps investigated, breaker cuts cleaner: a switch-off with its switch off goes to `circuitOut` (one witness,
  `MODE_BREAKER`, calm, no ring, no radio); a second noticed cut within 60 s is the S2 light incident at the switch;
  a shot lamp keeps the S2 path and `setGroup` skips destroyed lamps (never relit).
- Light parity: the guard's reset is `StealthSystems.toggle` (registry `setGroup`, labels, indicator, `lightSwitch`
  click, light field), so the Sector Ops `lamps` sync and Course `lights.groups` follow. Course mains circuits refused.

### Where the slices meet (checked, no fault)
- A breaker walker has a board task (`incident`), so the board's `free` skips him for a shots pair or cover; team
  members are `searching`, also never free, and never breaker witnesses the board can send. `lateStep` takes only
  unaware / cooldown guards with no task. A walker who hears a loud shot may call it (calm), and keeps walking.
- Team members hold a timed alert harmlessly (caution 1 under a search); `mayCallShots` skips them (searching after a
  fight).
- Codes: incident kind `breaker` appended as 10, `MODE_BREAKER` 5 (modes 0-4 taken), CallKind `shots` appended as 7;
  none of them reach `src/net`. Barks union (`breaker`, `shots`, `shotsReport`, `missingReport`) merged; urgent set
  holds the S14 lines.
- Counters: `bodiesFound` behind `b.found`, `shotsCalls` once per completed logged call, `radioAlarms` only when the
  call raised the alarm; all reset in `clear`.
- `alertThrough` runs inside `radioNet.tick` and calls `boardStep`, which refills the shared view: same guards, same
  positions in that frame, and S6's `contactThrough` already starts calls from the same callback.

### Hot paths, co-op
- No per-tick allocation added: `SweepTeam.tick`, `sweepStep`, `breakerStep`, `lateStep` (typed arrays, indexed loops,
  one ray per candidate), the shots hook in `noise`. Allocation only at alarm time (`sweepPoints`, `slice`) or on
  registry growth (`DarkList.ensure`). No `Math.hypot` in `src`. Gameplay reads data only (registry, switch state,
  interactable positions, collision rays).
- Host-only. `src/net` diff is the one `coopHost.ts` line (`SHOT_NOISE x min(noise, 0.6)` for a client's quiet shot);
  `PROTOCOL_VERSION` 31 untouched.

## Fixes made
- `scripts/e2e-stealth-ai.mjs` 'loud shot': hearer moved from (-7, 14) to (19, -5) (finding 1). `node --check` ok.

## Checks (desktop, each with a timeout)
- `npx tsc --noEmit -p .`: 0 errors.
- eslint on the 19 changed src / test files: 0 problems.
- `node --check`: `scripts/e2e-sectorops.mjs`, `scripts/e2e-stealth-ai.mjs` ok (after the fix too).
- vitest, one file at a time, 33 files, 532 tests, 0 failures: responseWiring 17, sectionAlert 20, breaker 22,
  incidents 36, radioNet 26, awareness 18, awarenessWiring 19, hearing 22, gear 14, gearWiring 21, sweep 10,
  responseTeam 5, alarmCall 18, squadRoles 22, squadWiring 16, sectors 27, sectorGuardTags 20, postsWiring 18, pairs 13,
  pairsWiring 16, coopFix 13, lights 10, radioWiring 13, camBodyWiring 13, archetypes 13, sectorLampSync 11,
  sectorRestart 8, sectorStep3 7, sectorSlice0 7, coopTorches 12, throwKo 13, cqGait 19, g7CloseQuarters 13.
- No e2e, no `npm run check`, no dev server.

## e2e risks (laptop run on this tip)
- e2e-stealth-ai 'loud shot' (fixed): the hearer now stands 19 m off in the open, light pinned to 0: he turns towards
  the player at 19 m in the dark (no sighting expected). Two go: the lead and the far guard as cover.
- e2e-stealth-ai 'missed check': should pass. The lead (b, nearest c) reaches the knocked-out c within the wait and
  wakes him (S4 knockout caution for b and c); the far guard is not touched by that, and the cut part's asserts read
  the far guard and the timed alerts only.
- e2e-stealth-ai 'breaker': should pass. Margins: speed bound 1.25 x walk against `PACE.patrol` 1.1; the stand point is
  the floor side of the z -8.8 wall (the switch is on its floor face). 'lights' (changed assert): the guard walks calm
  towards the switch where the player stands in the dark; at 3 s he is ~4 m off: a meter rise past investigating
  would drop the walk (suspicious is accepted).
- e2e-sectorops part 1 'response teams': timeline ~12 s (`ALERT.lostSight`) + 60 s search, sweep from ~72 s, first
  point and its 6 s look well inside 120 s; the player is sent 40 m off the map as in the S6 / S8 blocks. The S6 block
  now gets an enforcer first (S13 report). The co-op light part presses the switch back only while off.
- e2e-coop must run for the coopHost line; e2e-enemies 'radio check' may hear two lines from the caller (urgent
  `missed`).

## Polish list (not blocking)
1. A guard woken at stage 3 gets a helmet again even if his was shot off before he went down (`revive` ->
   `giveStageGear`); S12 kept a lost helmet off on waking and A52 names only the rise. Note it in A52 or skip the
   helmet for a guard who lost one.
2. `cutSeq` / `faultCut` / `faultTamper` are not cleared in `clear` / `resetMemory` (the S15 report says they are).
   Harmless (cut numbers only grow) except a late find of a cut made before a clear reusing its old verdict.
3. The radio net delivers across sections on live maps outside Sector Ops (`radioStep` passes no section: S3, as
   before), so S14's section caution there reaches every guard of the map. Sector Ops loads one section, so it holds
   where it matters; worth a section filter before a multi-section live map ships.
4. `AlertCallLog` keeps 8 calls: a ninth alert call in flight drops the oldest's caution on delivery.
5. A desk caller with misses in several squads starts one `missing` call per squad (A71 says one per check).
6. `missedChecks` can count the same down guard twice (a radio-check miss, then his pair partner's miss); by A75's
   wording, but section-rating should know.
7. An unreachable breaker stand point re-runs `findPath` every step for up to 30 s (`goTo` with an empty path: existing
   behaviour of every walk).
8. S15 open items stand: no torch on the walk in the dark; a client's switch label does not follow a guard's relight.
9. `gear.ts` slice labels on `MISSING` "(S13)" and `BREAKER` "(S14)" are wrong (S14, S15).
