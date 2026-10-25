status: claimed Night Shift | Cloud Builder 2 2026-10-25T23:08:35+11:00

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
