status: claimed Night Shift | Cloud Builder 3 2026-10-26T00:40+11:00

# campaign J7 R6 polish: merged-head check + the two checkers' polish (Opus 5.5)

Base: origin/feature/mission-rules-hud d6a5f5b6b (PR F = PR E -net 09975841c + R6 merged; the merge was clean but was
not type-checked). New branch: feature/mission-rules-r6-polish (cut from that sha). Read docs/systems/agent-preamble.md
(origin/master) first. Never push to feature/mission-rules-hud.

## Step 1: check the merged head (before any edit)
`npm run typecheck:fast`; `npx vitest run tests/mission/ tests/missionNet.test.ts tests/missionNet3.test.ts
tests/coopFix.test.ts tests/campaignSession.test.ts tests/campaignRevives.test.ts`. Write the counts in the report. A
failure caused by R4 / R5 (src/net/session.ts, coopUi.ts, coopHost.ts) meeting R6 (coopClient.ts, sectorMode.ts):
fix it in this branch as its own commit "mission-rules R6 polish: merge fix ..." and say what it was.

## Step 2: polish (only these files: src/game/modes/sectorMode.ts, src/game/mission/missionFeed.ts,
src/net/coopClient.ts, src/ui/hud/hud.ts, tests/missionNet.test.ts, tests/mission/missionFeed.test.ts)
1. Stale download line after a restart (both checkers): a section restart mid-download (broken rule, Teale knock-out,
   a Sector Ops team restart) leaves the host's "<step> NN%" line up, because the current step is the same before and
   after so the feed does not rewrite (sectorMode.ts ~:815 setup's mission branch and ~:1334 the download percent).
   Done: a restart resets the feed (`setup()`'s mission branch writes the feed's text again, or the feed is reset so
   the next `update` rewrites); the percent only attaches to the step that is the download.
2. missionFeed.ts ~:89: the early return that reuses the text also checks it is the same runner object.
3. The client keeps the host's download " NN%" while a mission step shows (J7-PLAN section 7 item 1;
   coopClient.ts ~:1397-1399): the step line plus the host's percent when the host's line is that step's download.
4. coopClient.ts ~:1009: one comment naming the two short connector windows (ls = -1 for ~1.5 s after the unload: the
   client shows the host's exit line; from the next section's load until the far door opens: the client is already on
   the next section's first step, inside the sealed connector).
5. hud.ts ~:317: the hint's font size is relative to its parent, not the objective's 13px: give it an explicit size
   (about 0.8 of the objective's, e.g. 10.5px) the same way the objective sets its own.
6. tests/missionNet.test.ts: one case driving the client path: a `sector` message whose `ls` opens a section's steps,
   then the client's objective line shows the mission step text over the host's snapshot objective; a repeated
   message with the same `ls` changes nothing. Read the existing CoopClient.onSector test in that file first and reuse
   its setup (a bare client needs the lazily read viewer; see R6's 0cb3a4d6c).
No allocation in per-frame paths (no closures, arrays or string building on unchanged frames). No wire, protocol or
save change.

## Checks (cloud)
`npm run typecheck:fast`; the step 1 vitest set again. Every e2e is pending PC run.

## Done
Push feature/mission-rules-r6-polish (commits "mission-rules R6 polish: ...", trailer "Co-Authored-By: Claude Opus 5.5
<noreply@anthropic.com>"); report at the end of this brief: step 1 counts, each item with file:line, tests with counts,
deviations.
