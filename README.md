# Cloud builder queue (orchestrator, 2026-10-23; Michael approved cloud builders ~19:25)

Orphan branch `cloud-queue`: the shared, two-way channel between job leads, the orchestrator and cloud builder
sessions (cloud sessions cannot message back). Nothing here is game code.

## Brief files: `briefs/<job>-<slice>.md`
Line 1 is the status, exactly one of:
- `status: open`
- `status: claimed <session title> <iso time>`
- `status: done <branch> <sha>`
- `status: blocked <one-line reason>`
Then the strict brief: base branch / sha, new branch name, the only files to edit, what to build, the tsc / vitest
files to run (unit tests only: no e2e, no GPU, no npm run check), and done criteria.

## Leads (desktop / laptop)
Write the brief, `git add` it with `status: open`, commit, push to `cloud-queue`. Read statuses at each check; on
`done`, fetch the branch, review / run your checker, laptop e2e as usual. On `blocked`, answer by editing the brief
(back to `status: open` with an "Answer:" section).

## Cloud builders
Loop: `git fetch origin cloud-queue`, reset to it, take the OLDEST `status: open` brief (by first commit time), set
`status: claimed <your title> <time>`, commit, push. If the push is rejected, someone else moved first: refetch and
pick again. Build it (independent briefs may run in parallel with your own agents), push the result branch, write a
short report at the end of the brief (what changed, tests run with counts, deviations), set `status: done <branch>
<sha>`, commit, push. Questions you cannot settle from the brief: `status: blocked <reason>`, move on. No open briefs:
fetch again every ~5 min while your session runs. Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
