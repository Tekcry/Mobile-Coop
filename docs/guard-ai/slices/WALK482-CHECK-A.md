# Guard AI walk 4.82 items 2 and 6 - check A (correctness vs Michael's words)

Branch `feature/guard-ai-walk482` at e67614c0, diff `git diff 7fe4f6a2 e67614c0`. Checker A, fresh Opus.

Verdict: PASS

## Blockers

None.

## What was checked

- `npx tsc --noEmit -p .`: clean.
- Vitest (affected files only, CPU 19% before): loneGuardEngage, trainingCamera, squadWiring, twoIntruders, squadRoles,
  securityBodies, camBodyWiring, deviceTrip, perception, radioWiring: 10 files, 141 tests, all pass.
- Not run (by the brief): full vitest, `npm run check`, e2e.

## Item 2: "He should report then attack you instead of hiding"

Matches Michael's words.
- Report first: a lone guard (`R_NONE`) stays in cover while his radio call is open (`AiContext.radioOpen` =
  `radioNet.pendingFor > 0`, src/ai/enemyManager.ts:589). That covers the contact call and the command call he takes
  over synchronously in `contactThrough` (enemyManager.ts:730-745), so the role cannot flip for a tick between the two.
- Then attack: once the call is through and he has been unseen for one peek (4.2 s) in that cover, `closeFromCover`
  sends him to `chase` (src/ai/enemy.ts:2848). The chase branch's out-of-sight advance (enemy.ts:2720-2735) moves him
  up on his intruder's last known position. `pickAdvance` only picks covers at least 3 m nearer the LKP, so he cannot
  loop on the same cover.
- Does not forget: `closingIn` feeds `AlertInput.closing` (enemy.ts:2201). The lost-sight cap goes from 12 s to 30 s
  while he closes (src/ai/alertState.ts:192). On arrival the existing rule (sinceSeen > 1.5, within 1.5 m) starts the
  search at the LKP, and the LKP is kept through the search (pinned by the test). With the shipped timings he leaves
  cover inside the 12 s cap: contact 2.5 s plus command 4 s, times reaction, is at most 8.8 s on Rookie.
- Groups: the caller is the reporter only while `pendingFor(caller) > 0` (enemyManager.ts:2766). After that he takes
  point, overwatch, flank or search. A group's `R_SEARCH` uses lone tactics, so it closes too. Point, overwatch and
  flank cannot reach the new branch (`closeFromCover` returns false for them, and `roleStep` runs first).
- Unchanged where it should be: high-security posts (`secure`), parked modes (`closer` needs `coordinated` and
  `stealth()`), Clear and Mission (`coordinated = false`), and a hold or leash with the target outside it (`outside`).
- Michael's S2 guard on master is `A2_SHUNTER`, a patrolling grunt with no post (ctcourseSets/a2CarriageShed.ts:256).
  Course mode is coordinated, so the fix applies to him.
- Co-op: host sim only. It goes per intruder (`huntPos()` is his own intruder's LKP, and there is one roles group per
  slot), with no wire or save change. No static `src/net` import.
- Hard rules: no new hot-path allocation beyond one return literal on the state change, which follows the existing
  `decide` pattern. `closeFromCover` is pure. `pendingFor` is a fixed loop. No `Math.hypot` in game code (the new
  e2e scenario uses it in page-side test code, as the 18 existing uses in that script do). No graphics reads.

## Item 6: training cameras

Matches.
- `guardResponse: false` gates the only camera-to-guard paths:
  - `CtDevices.onCamera` makes no `alertAt` call (src/game/ctDevices.ts:1042). That means no device incident, nobody
    sent, no radio, no search, and no `devSpot` for the alarm's reinforcements.
  - `SecuritySystem.bodyPass` reports no body (src/security/securitySystem.ts:212). That is the only `onBody` source,
    wired at gameState.ts:762.
- Stage 1 never reached the guards.
- In course mode the alarm stage only records a stat and shows a banner (`raiseAlarm`; courseMode `record`). No guard
  path reads it (`setAlarmStage` is Sector Ops only).
- Default: absent or `true` means the guards respond (`cameraAlertsGuards`, src/security/data.ts:49), so every
  existing camera is unchanged.
- No field reaches the wire (map data on both sides).

## Tests: they prove the behaviour, not tautologies

Each test would fail without its change:
- loneGuardEngage drives the real `Enemy.decide`:
  - Call open: he stays in cover.
  - Call through: `chase`, then a step towards the LKP with `closingIn` set.
  - A high-security post with the LKP inside a 30 m leash, so it exercises `secure` and not `outside`: he stays.
  - Overwatch: he stays.
  - Seen 1 s ago: he stays.
- loneGuardEngage also drives the real manager: `radioOpen` around `RADIO.callIn`, the reporter becoming a fighting
  role, and the LKP kept through the search and dropped at cooldown.
- trainingCamera runs the real `SecuritySystem` body pass (1 body against 0) and the real `CtDevices.onCamera`:
  `alertAt` is called for a plain camera and not for a training one, and the stage, stat and line run for both.
- squadWiring and twoIntruders were updated to the new reporter rule. The twoIntruders expectation
  `['point','overwatch','search','flank']` is consistent with the victim's call being through.

## Polish (not blocking)

1. `closingIn` goes stale on early returns. It is reset at enemy.ts:2624, after the early returns for the alarm-panel
   run (enemy.ts:2593), `entryStep` and `doorCheck`. A guard who was closing and then runs to an alarm panel keeps the
   30 s cap instead of 12 s. Done looks like: reset `closingIn` at the top of the combat `decide`, before those
   returns.
2. A call that outlasts `ALERT.lostSight` still times him out in cover. Today the worst case is 8.8 s on Rookie against
   12 s, so the margin is about 3 s. A longer call (a tuning change or a future relay) would bring Michael's bug back.
   Done looks like: `AlertInput.closing` (or a separate flag) also set while he is in cover with his call open and
   `closer` true, or a test that pins the worst-case call length under `lostSight`.
3. In a group only the point and the search guards close. Overwatch and flank waiting out of sight still time out
   into a search at 12 s while the point walks on. That is fine for the lone S2 case, but a group in S2 (Marlow is
   adding guards there) could look like it is "forgetting" again. Worth one look in the e2e-tactics run.
4. Holds in Infiltration mode (live, coordinated, stealth; `e.hold` at infiltrationMode.ts:93). A hold guard whose
   target is inside his room now leaves cover after 4.2 s and closes on the LKP, where before he hid and peeked. The
   hold rule itself (never chase a target outside the room) is unchanged, but the brief says "holds unchanged". The
   lead should decide whether to add `this.hold === null` to `closer`, or to accept it and note it in ai.md.
5. When he leaves cover he keeps that cover reserved until `pickAdvance` reserves the next one. When he walks the last
   7 m, his old cover stays reserved for the rest of the fight. This was already the case for attack to chase.
6. A training camera still raises the course alarm banner "ALARM STAGE n". For an exercise this may read as hostile.
   Marlow decides (builder's open item).
7. A training camera in Sector Ops would still bring reinforcements through the alarm stage (`sectorMode` at
   `ct.alarm > up`). The field is documented as course-only. A one-line note in data.ts would stop misuse.
8. The new e2e scenario 'report then engage' has not been run. Queue it with `--only=report` first.
