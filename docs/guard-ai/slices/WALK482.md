# Guard AI walk 4.82 (items 2 and 6) - build report

Branch `feature/guard-ai-walk482` (base `feature/guard-ai-s24` 7fe4f6a2). Michael's walk: `docs/orchestrator/WALK-4.82-REPORT.md`
on `feature/menu`. Guard AI parts only; the map-side parts (S2 fails on spotted, more guards, more linear lanes, the
exercise rule itself) are Marlow Build's.

## Item 2: report, then engage

Michael: "s2 guard sees you, hides, reports, and forgets where you are and becomes cautious. That's not logical at all.
He should report then attack you instead of hiding."

Cause: a lone guard who spots you goes to cover (standard profile, cover-first 0.85) and hides / peeks there. He only
left cover after 5 empty peeks (21 s), but `ALERT.lostSight` (12 s) turned the fight into a search first, and the search
ends in cooldown (cautious). In a group the first caller held the reporter role (crouched in cover) for the whole fight.

Built (WIP 659b7642 reviewed and kept as is, finished with tests, e2e and docs):
- `squadRoles.ts`: `ENGAGE.peekWait` 4.2 s (one whole hide / peek cycle) and pure `closeFromCover(role, callOpen,
  secure, unseen, inCoverT)`: only a guard with no holding role (`R_NONE` lone, or a group's `R_SEARCH`), his call
  through, not a high-security post, unseen and in that cover for at least one peek.
- `enemy.ts` `decide`: in `inCover`, when `closeFromCover` holds (and he has his intruder's last known position, is not
  outside a hold / leash, coordinated stealth modes) he goes to `chase`, whose out-of-sight branch is the existing
  cover-to-cover advance on the last known position. `closingIn` is set on every step he closes on it (that advance, a
  bound towards it, a role point's bound out of sight) and feeds `AlertInput.closing`.
- `alertState.ts`: `ALERT.lostSightClosing` 30 s: while closing the lost-sight cap is 30 s instead of 12 s, so arriving
  at the last known position with nothing there starts the search (the existing arrival rule), and 30 s only caps a
  walk that never gets there.
- `enemyManager.ts`: `AiContext.radioOpen` (`radioNet.pendingFor > 0`: the contact call, then a command call he holds);
  the roles input's caller slot is the caller only while his call is open, so once it is through he takes a fighting
  role (point / overwatch / flank / search) instead of sitting as reporter.
- Last known position: kept while he fights and searches (`huntingOf` already counts a searching hunter); forgotten
  only once he calms. Pinned by a test.

Numbers: `ENGAGE.peekWait` 4.2 s, `ALERT.lostSightClosing` 30 s (`ALERT.lostSight` 12 s unchanged for a guard who is
not closing). Contact call 2.5 s x reaction, command call 4 s x reaction (unchanged), so a lone guard leaves cover about
4-10 s after the sighting, inside the 12 s cap.

Unchanged: parked modes (`coordinated` false), Wave / non-stealth, high-security posts and holds, the point / overwatch /
flank roles, a reporter while his call is open (still crouched and silent). Host only, no protocol or save change.

## Item 6: training cameras (the guard-side hook)

Michael: "s3 camera finding you pushes you back to the start, but the guard comes to attack you. It's a training
exercise, the guard should be non hostile and not respond to you being detected on the camera".

Cause: a camera at full awareness calls `CtHooks.alertAt` -> `EnemyManager.deviceAlert` (guard-ai S17): a `device`
board incident sends the 2 nearest calm guards within 30 m (Marlow Yard has no guard zones: one section) to the spot to
search, and anyone who then sees you fights.

Built: `CameraDevice.guardResponse?: boolean` (`src/security/data.ts`, read by the pure `cameraAlertsGuards(def)`).
`false` = a training camera: `CtDevices.onCamera` makes no `alertAt` call (no device incident: nobody sent, no radio call,
no investigation, no spot for the alarm's reinforcements) and `SecuritySystem.bodyPass` reports no bodies from it. Its
meter, cue, the course rules (the hallway send-back), the alarm stage, the course stat and LANTERN's lines run as before
(the exercise rule is Marlow's). Absent / `true` = today: every other map is unchanged. Host only (the client's
`CtDevices` has no `alertAt`), no wire change (the field rides the map data both sides build from).

**The Marlow hook line** (add the field to the S3 camera's device def):

```ts
guardResponse: false, // (guard-ai walk 4.82 item 6) training camera: what it sees brings no guard response
```

On this branch's base that is the `cam-s3` entry of `SECURITY` in `src/world/maps/ctcourse.ts`; on master's greybox
build it goes in the `g.cameras.push({ ... })` object in `src/world/maps/ctcourseGreybox.ts` (the camera of the station 3
relay corridor, or every training camera there).

## Files

- `src/ai/squadRoles.ts`, `src/ai/enemy.ts`, `src/ai/alertState.ts`, `src/ai/enemyManager.ts` (item 2, WIP 659b7642)
- `src/security/data.ts`, `src/security/securitySystem.ts`, `src/game/ctDevices.ts` (item 6)
- `tests/loneGuardEngage.test.ts` (new, item 2), `tests/squadWiring.test.ts`, `tests/twoIntruders.test.ts` (the caller
  takes a fighting role once his call is through), `tests/trainingCamera.test.ts` (new, item 6)
- `scripts/e2e-stealth-ai.mjs`: scenario 'report then engage' (syntax checked with `node --check`, not run)
- Docs: `docs/systems/ai.md`, `docs/systems/testing-tools.md`, `TESTING.md`, `changes/feature-guard-ai-walk482.md`

## Tests and results

- `npx tsc --noEmit -p .`: clean.
- Vitest, 20 files, 299 tests, all pass: loneGuardEngage, squadWiring, twoIntruders, squadRoles, perception,
  radioWiring, radioNet, intruders, coopPerception, sectionAlert, trainingCamera, securityBodies, camBodyWiring,
  laserAlarm, deviceTrip, jammer, jammerFixes, securityRoom, securityCamera, laserPanels.
- Asserts on changed defaults checked: `ALERT.lostSight` is unchanged (perception.test, e2e-sectorops' S16 NOC block
  only read it); the `reporter` role asserts that change are the two updated above (squadRoles.test's pure
  `assignRoles` with a caller is unchanged; no e2e asserts a role name).
- Not run (by the brief): full vitest, `npm run check`, e2e.

## e2e for the lead to queue (laptop, `E2E_GPU=1`)

- `e2e-stealth-ai` (the new 'report then engage' scenario plus 'lkp', 'radio', 'alarm call'; `--only=report` for the new one alone)
- `e2e-tactics` (squad roles: the caller now leaves the reporter role once his call is through)
- `e2e-ctcourse` (station 3 camera hallway: unchanged until Marlow adds the field; then no guard comes)
- `e2e-sectorops` (camera alarms and device alerts stay on for its cameras; the S16 NOC pair still holds combat)

## Open items

- The new e2e scenario is unrun: its seeded walk on the Warehouse (guard at (0, 5), last known position about 5 m away)
  may need its 2 m arrival radius or step budget tuned on the first run.
- Item 6 needs Marlow's one-line data change above to take effect in Marlow Yard. Making the S3 guard himself
  non-hostile to his own sight (if that is wanted) is the exercise rule: a passive or training guard, Marlow's.
- A training camera still raises the course alarm stage (Marlow Yard: a stat and a banner; in Sector Ops the alarm
  stage brings reinforcements, but the field is meant for course training cameras only). Marlow decides whether the
  exercise skips the stage too.
- Item 2's other map parts (S2 fail on spotted, more guards, linear lanes, overwatch above lit crossings): Marlow.

## Laptop triage (e2e-stealth-ai, run e67614c0 + rerun)

Failure: `lkp` scenario, `ASSERT: the search ends (searching)`, deterministic (seeded draws), run and rerun. The S24 base
passed it.

Cause: a test timing window, not an AI leak. The `lkp` scenario is exactly item 2's case (a lone guard sees the lit
player, the player vanishes behind the dispatch wall). It stepped a fixed 25 s + 50 s after the vanish and expected the
60 s search (`ALERT.searchTime`, `src/ai/alertState.ts:33`) to be over. Before walk482 the guard sat in cover until
`ALERT.lostSight` (12 s) made it a search, so the search ended at ~72 s, inside the 75 s window (3 s margin). Now he
leaves cover after his call and a peek (`closeFromCover`, `src/ai/enemy.ts` `inCover`), closes on the last known
position, and the search starts on arrival (`Enemy.updateAwareness`, the arrival rule), more than 15 s after the vanish,
so at 75 s it was still running. Every earlier assert in the scenario still passed (converges 0.62 m, searches from it,
no wallhack). A search with no sighting is untouched (`closing` needs combat and a last known position), and the search
still ends: `searching` -> `cooldown` after `searchFor` is unchanged code, the guard is a standard grunt (not
`neverCautious`).

Fix (test only, `scripts/e2e-stealth-ai.mjs` `lkp`): record when the search starts (`searchAt`), then step 1 s at a time
until the level leaves `alert` / `searching`, bounded by the search's own length + 5 s (`e.aware.t` >= 65 s in
`searching`) and 120 s overall, so a search that never ends or restarts still fails the assert. The assert texts now
print the search start and the time in the final level.

Tests: `node --check scripts/e2e-stealth-ai.mjs` OK; `npx vitest run tests/loneGuardEngage.test.ts` 11/11 pass. No src
change, so no tsc rerun needed. e2e not run locally (laptop queue rule): queued as set `walk482-fix`, suite
`e2e-stealth-ai` (the run also covers the unrun 'report then engage' scenario after `lkp`).
Queued: request `20261023T125751-night-shift-guard-ai-d0968052-b79b` (sha d0968052).

## Laptop triage 2 (e2e-stealth-ai on 5a3dd588, desktop worker, run + rerun identical)

The 'lkp' and 'report then engage' scenarios pass. 'search area' 'near' fails `near: after the tp he never sees him
again (seen at 10.6 s ...)`. The hide spot is (-4.75, -0.25): 4.3 m straight from the LKP (-0.5, 0), 5.6 m by path.
The guard was at (-4.8, 0.4).

Cause: item 2 works as designed. Once his call is through he leaves cover (`closeFromCover`) and moves up on the LKP
while still in combat. The S25 staging assumed he held cover about 9.5 m north until the search (S25-SAI-TRIAGE rounds
2-4), so the 'near' spot, out of sight of his walk from the post and of a 1.5 m ring round the LKP, was never in his
view. Moving up past that ring he sees it, an alerted guard sees by line of sight alone, and the premise assert trips.
This is a test staging issue; no src change.

Fix (scripts/e2e-stealth-ai.mjs only), as 'wall' in S25-SAI-TRIAGE round 5:
- 'near' now waits out the fight at the far park spot (0, -20), behind the dispatch walls, and the player is
  teleported (with the post-tp `frameUpdate`) to the near spot when the search starts. The near intent is unchanged:
  the plan ranks the dark spot near the LKP, and a searcher reaches it within 20 s of his first plan point.
- `homing` (before the search) is measured to the player's real position, which is the park spot before the search,
  not to the empty near spot.
- The premise trackers (`resight`, `lkpMoved`) count only the fight (before tS). Once the search runs, a find is a
  pass ('near' accepts `found`). The asserts themselves are unchanged.

Static check of the other runs with the move-up:
- 'wall': the same park staging. Moving up to the LKP only shortens his path, so "no searcher past R + 1 m" and
  "every plan point within R + 0.5 m by path" hold.
- 'three': the park spot is its own hide. From the LKP, the line to (0, -20) meets the z -8.8 wall at about x -0.3
  (its gap is x 2-3.6) and the z -11 wall at about x -0.2, which is solid wall: no re-sight. The search starts as
  each guard reaches the LKP (earlier than from cover), so each takes a plan point well inside 40 s.

Checks: `node --check scripts/e2e-stealth-ai.mjs` OK. No src change; no local e2e.
- Queued: set `w482-sai`, suite `e2e-stealth-ai`, on 2258ae7b, request `20261023T212039-night-shift-guard-ai-2258ae7b-8f9f`.
