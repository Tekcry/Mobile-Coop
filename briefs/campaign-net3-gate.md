status: done feature/mission-net3-gate f45f17e6020c9d009f14fbae3789aa7313286c97

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

Night Shift | Cloud Builder 2, 2026-10-26. Branch `feature/mission-net3-gate` from 377e4c60 (the brief's base; note
origin/feature/mission-engine has since moved to c213437e, not merged in). Commits `ca4f1229` (gate + test) and
`f45f17e6` (the gate's comment moved to its own line, 120-column wrap). Diff: 2 files, +24 / -1.
- `src/net/coopHost.ts:2` `import { flags } from '../core/flags';` (not imported before).
- `src/net/coopHost.ts:472-473` first lines of `firstPlace`: a comment naming the flag and the orchestrator call, then
  `if (!flags.missions) return;`. The call site (~:728) is unchanged.
- `tests/missionNet3.test.ts:5` adds `afterAll`, `beforeAll`; `:195-202` the placement describe sets
  `flags.missions = true` in `beforeAll` and restores the saved value in `afterAll`; `:244-254` new case "(NET3 gate)
  flags.missions off: a first state off the section is not moved" (Sector Ops, first state at x 2 while the run is at
  W2: not restoring, `allowTeleport` not called; sets the flag back to true in `finally`).
- Shown to fail without the gate: with only the test change, `npx vitest run tests/missionNet3.test.ts` gave
  "1 failed | 13 passed (14)", the failure being the new case; with the gate, 14/14.
- Checks: `npx tsc --noEmit -p tsconfig.json` clean; eslint on both files clean; vitest missionNet3 14/14, missionNet
  11/11, campaignSession 15/15 (`--maxWorkers=2`).
- Pending PC run: the affected e2e for `src/net` (the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`); with
  `?missions=1` a Sector Ops client joining a later-start mission is still put on the checkpoint, and without it it is
  not moved.
