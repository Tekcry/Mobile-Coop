# Patch for the cloud-queue README (heartbeat + claim expiry)

To apply on the orphan branch `cloud-queue` (README.md) by whoever owns it; this file only carries the text so the change
rides a normal PR. After it is applied, delete this file. Script: `scripts/cloud-queue-expire.mjs` on master
(docs/systems/swaps.md).

```diff
 ## Brief files: `briefs/<job>-<slice>.md`
 Line 1 is the status, exactly one of:
 - `status: open`
 - `status: claimed <session title> <iso time>`
 - `status: done <branch> <sha>`
 - `status: blocked <one-line reason>`
 Then the strict brief: base branch / sha, new branch name, the only files to edit, what to build, the tsc / vitest
 files to run (unit tests only: no e2e, no GPU, no npm run check), and done criteria.
+Name the result branch exactly as "New branch `<name>`" (claim expiry reads it).
+
+## Heartbeat and claim expiry (2026-10-24, process audit finding 6)
+A claim is alive while its time is fresh or its branch moves. Builders re-stamp line 1 with the current UTC time
+(`status: claimed <your title> <iso time>`, commit "<brief>: heartbeat (<title>)", push) at least every 30 min while they
+work, and push the result branch as soon as it has a commit. `node scripts/cloud-queue-expire.mjs --yes` (run from any
+checkout of the repo by the orchestrator / watchdog) sets a brief back to `status: open` when its claim time is 90+ min
+old AND origin's copy of its "New branch" has no commit newer than the claim. Right after an account swap the
+orchestrator may run it with `--max-min 1` to reopen every claim of the old account's builders at once.
 
 ## Cloud builders
 Loop: `git fetch origin cloud-queue`, reset to it, take the OLDEST `status: open` brief (by first commit time), set
 `status: claimed <your title> <time>`, commit, push. If the push is rejected, someone else moved first: refetch and
-pick again. Build it (independent briefs may run in parallel with your own agents), push the result branch, write a
-short report at the end of the brief (what changed, tests run with counts, deviations), set `status: done <branch>
-<sha>`, commit, push. Questions you cannot settle from the brief: `status: blocked <reason>`, move on. No open briefs:
-fetch again every ~5 min while your session runs. Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
+pick again. Build it (independent briefs may run in parallel with your own agents), re-stamping your claim every 30 min
+(heartbeat above) and pushing the result branch early and often, then write a short report at the end of the brief (what
+changed, tests run with counts, deviations), set `status: done <branch> <sha>`, commit, push. Before each heartbeat and
+before `done`, refetch: if line 1 is no longer your claim (it expired and was reopened, or another builder claimed it),
+stop that brief; when your branch is already complete and the brief is still `status: open`, you may claim it again and
+mark it done. Questions you cannot settle from the brief: `status: blocked <reason>`, move on. No open briefs: fetch again
+every ~5 min while your session runs. Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
```
