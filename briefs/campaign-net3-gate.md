status: claimed Night Shift | Cloud Builder 2 2026-10-26T02:38:40Z

# campaign NET3 gate: the client first-placement goes behind `missions` (Opus)
Owner: Campaign Build. Lead: Night Shift | Campaign Build. Released 2026-10-26 ~13:25. Orchestrator call 12:55: "NET3
firstPlace: gate it behind `missions` (unfinished work ships dark)".

Base: origin/feature/mission-engine at 377e4c608c4f438dbb2013a7ad7b1ec66375f7a4 (check with `git rev-parse`
if the full one differs). New branch: feature/mission-net3-gate. Cloud: guard on the branch name only
(`test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-net3-gate`), per agent-preamble "Cloud sessions"; no CPU
wait in the cloud. Model: Opus (src/net). Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
Hard rules (`git show origin/master:CLAUDE.md`): co-op code in `src/net`; strict TS; `import type` for types. Never
merge, rebase, stash, reset or force-push. No e2e (pending PC run).

## Only these files
- `src/net/coopHost.ts` (the `firstPlace` method, ~:466-472, and an import of `flags` if not already imported)
- `tests/missionNet3.test.ts`

## Why
`firstPlace` (coopHost.ts ~:470, called at ~:726 on a client's first state) moves a joining client to the checkpoint when
it starts outside the current section, in ANY Sector Ops co-op match. It is the engine's only player-visible change that
is not behind a flag, and it must ship dark like the rest of the mission engine until Michael accepts it.

## Do
1. Read coopHost.ts ~:440-480 and ~:700-740, `src/core/flags.ts` (the `missions` flag and its doc comment), and
   `tests/missionNet3.test.ts` (the `offSection` and `firstPlace` cases ~:190-240, and how other tests set flags in
   `beforeAll` / restore in `afterAll`; `flags` is a plain object).
2. In `firstPlace`, return at once when `!flags.missions` (first line of the method, one-line comment naming the flag
   and the orchestrator call). Nothing else changes; the call site stays.
3. Tests: the existing firstPlace cases set `flags.missions = true` (restore after); add one case: with
   `flags.missions` false, a client starting off-section is NOT moved. Show the new case fails without step 2.
4. Checks: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/missionNet3.test.ts tests/missionNet.test.ts tests/campaignSession.test.ts --maxWorkers=2`; `npx eslint src/net/coopHost.ts tests/missionNet3.test.ts`.

## Done looks like
Checks green; the diff touches the two files only (~25 lines); report: file:line of each change, test counts, how the
new case was shown to fail without the gate. Then line 1 becomes `status: done feature/mission-net3-gate <sha>` (or
`status: blocked <why>`).

## Report (append below)
