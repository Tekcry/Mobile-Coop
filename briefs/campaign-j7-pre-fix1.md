status: done feature/mission-rules-net-fix1 505fc066f6186de576ff48311bf2cdeabf02a0f9

# campaign J7 PR E fix round 1 (Opus 5.5, src/net)

Base: origin/feature/mission-rules-net 09975841c. New branch: feature/mission-rules-net-fix1 (cut from that sha). Read docs/systems/agent-preamble.md (origin/master) first.
Only files: src/net/coopUi.ts, src/net/session.ts, src/game/mission/campaign.ts (one exported constant), tests/campaignSession.test.ts (or one new test file). Nothing else.

## The defect
Resume hosting a campaign match deadlocks. Host drops mid-campaign; the joiner stays in its match with `waiting = true`
(coopUi.ts:170-172). Host picks "Resume hosting" (coopUi.ts:800-813); R4 refuses the lone start (`campaignBlock`), host
waits in the lobby. The joiner reconnects, gets phase `lobby`, but the controller sends a client to the lobby only when
`!waiting` (coopUi.ts:87-96), so it stays frozen; on the host its entry is `ready: false` (session.ts:197-200), Start reads
"Waiting for players to ready up", the joiner has no Ready button. Only a manual quit and re-join escapes.

## Fix
1. In the resume branch: when `startMatch()` returns null and the session's start block is the two-player block, add a
   one-shot `lobby` listener shaped like `autoLocalCourse`'s, with no `allReady` check (the partner was mid-match): once
   `phase === 'lobby'`, the block is null and the room is not over capacity, `setTimeout(() => session.startMatch(), 0)`
   and remove the listener. Write it mode-agnostic (takes the block getter / predicate, not campaign names), so Marlow
   J14 F1's one-player Start block can reuse it when the two checks fold into one getter. Remove the listener on
   leave / disconnect / dispose so it never fires in a later room.
2. Fix the comment at coopUi.ts:~811 (it says the partner readies in the lobby).
3. Unit test (session level, new cases in tests/campaignSession.test.ts or its own file): a resumed host alone gets null
   and stays in `lobby`; after the client's hello the client receives `start` with no Ready press; the listener does not
   fire twice and is gone after leave. If the listener lives in coopUi.ts (DOM-bound), export a small pure helper for it
   and test that.
4. Polish to take in the same round (small, same files): coopUi.ts:640 over-capacity text says "for the campaign" in a
   campaign room (as the status line does); the Start text in a campaign room no longer says "this mode";
   `CAMPAIGN_ROOM` (session.ts:15) imports one exported constant from src/game/mission/campaign.ts instead of repeating 2.

Not in this round: Marlow course grant vs G349 (Marlow F1 folds it), the coop4 `cap` getter (fold at the coop4 merge),
mission picker in the lobby (MF9), client `campaign` / `cap` follow the map (FE coop.md note).

## Checks (cloud: tsc + single vitest files only)
`npm run typecheck:fast`; vitest tests/campaignSession.test.ts tests/missionNet3.test.ts tests/rejoin.test.ts
tests/coopRejoin.test.ts tests/campaignRevives.test.ts plus any new file. Commit + push path-limited on the NEW branch (not
feature/mission-rules-net itself), message "mission-rules PR E fix: ...", Co-Authored-By line. Report: at the end of this brief.

## Done
Push feature/mission-rules-net-fix1 (path-limited commits "mission-rules PR E fix: ..."); write the report (changes, tests with counts, deviations) at the end of this brief; e2e is pending PC run (the lead runs it). Do NOT push to feature/mission-rules-net itself: the lead merges.

## Report
Cloud Builder 2, 2026-10-25. Branch feature/mission-rules-net-fix1 (from 09975841c), one commit 505fc066f6186de576ff48311bf2cdeabf02a0f9 "mission-rules PR E fix: resumed campaign host starts once the partner is back". Not pushed to feature/mission-rules-net.

Changes
- src/net/session.ts:427-458 `NetSession.startWhenUnblocked(blocked: () => string | null)` (host): a one-shot `lobby` listener shaped like `autoLocalCourse`'s, no `allReady` check: in phase `lobby`, `blocked()` null and not over capacity, `setTimeout(() => startMatch(), 0)` (re-checked when the task runs; one queued at a time). Mode-agnostic: takes the block getter (J14 F1 can pass its folded one-player block). Removed on any `start` (by any route), `cancelAutoStart()` (:454), `leave()` (:474) and a mode / map / mission change in `setSettings` (:355). A check that fails when the task runs (partner dropped again in that tick) keeps it pending for the next lobby change. `autoStarting` getter (:449) for tests. Field `autoOff` :104.
- src/net/coopUi.ts:811-814 resume branch: `if (!session.startMatch() && session.campaignBlock === CAMPAIGN_TWO_PLAYERS) session.startWhenUnblocked(() => session.campaignBlock)`; comment rewritten (the partner is waiting in its match with no Ready button; the start goes on its hello, no ready).
- src/net/coopUi.ts:640 over-capacity Start text: "Too many players for the campaign (2)" in a campaign room, "this mode" otherwise.
- src/game/mission/campaign.ts:31-33 `export const CAMPAIGN_PLAYERS = 2` (also used by `campaignStartBlock` :62); src/net/session.ts:15 `CAMPAIGN_ROOM = CAMPAIGN_PLAYERS`.
- tests/campaignSession.test.ts: new describe "PR E fix" (5 cases): resumed host alone stays in lobby and the waiting joiner's hello starts it with no Ready press (start next task, once, listener gone); fires once (backToLobby with both in does not auto start); gone after leave (a start queued before leave never runs; a lone host's leave drops it); partner drops before the start keeps it pending and its menu rejoin starts the match; a switch off the campaign drops it (no solo start), a difficulty change keeps it. Also fixed the file's pre-existing eslint error (`typeof import()` in the protocol mock -> `import type * as Protocol`).

Tests (cloud: tsc + single vitest files, --maxWorkers=2)
- `npm run typecheck:fast`: clean.
- vitest: campaignSession 15/15 (10 old + 5 new), missionNet3 13/13, rejoin 12/12, coopRejoin 12/12, campaignRevives 6/6, mission/campaign 9/9 (67/67). Mutation check: with the timer's startMatch removed, 3 of the 5 new cases fail.
- eslint on the 4 changed files: clean.
- e2e: pending PC run (lead): Resume hosting a Tallow campaign match with the joiner waiting in its match -> the match restarts for both with no Ready press.

Deviations
- The listener lives on NetSession (session.ts), not in coopUi.ts, so it is unit-tested directly; coopUi only arms it.
- Added: a host mode / map / mission change while waiting cancels the auto start (else switching off the campaign would lift the block and start the host alone at once). Open item: after such a change the waiting joiner is stuck as before (it never goes to the lobby while `waiting`); not in this brief.
- Edited the pre-existing lint error in tests/campaignSession.test.ts (listed file) so `eslint .` passes on it.
- No wire change, no PROTOCOL_VERSION change.
