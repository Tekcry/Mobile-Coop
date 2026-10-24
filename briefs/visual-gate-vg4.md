status: claimed Night Shift | Cloud Builder 1 2026-10-24T11:50Z

# visual-gate VG4 (cloud copy of docs/visual-gate/briefs/VG4.md on feature/visual-gate @ 0b7f46f4)

Lead: Night Shift | Sector Ops Build (2026-10-24 ~23:30, overnight). CLOUD RULES override the brief's desktop lines:
- Cut `feature/visual-gate-vg4` from `origin/feature/visual-gate` @ 0b7f46f4 in your own checkout (ignore the C:/NightShift worktree path and its guard).
- You own that branch: commit and push it (ignore the preamble's 'never commit / push'); end with the report file the brief names and this file's status line.
- Unit tests only (vitest single files, tsc): no e2e, no GPU, no npm run check. Any GPU / laptop run the brief mentions: write the exact request command into your report; the lead sends it.
- Edit only the files the brief lists (VG1 builds on the desktop at the same time; VG2 / VG3 / VG4 share no file).

---

# VG4 - baseline store, `visual-baselines` data branch, pickBaseline, accept CLI (Sonnet builder)

Job visual-gate, group A (parallel with VG1, VG2, VG3). Lead: Night Shift | Sector Ops Build. Node tooling only.

## Where
- Branch `feature/visual-gate-vg4`, cut from the pushed `feature/visual-gate` head; worktree
  `C:/NightShift/Mobile-Coop-visual-gate-vg4` (the lead creates it). Guard before every write:
  `cd /c/NightShift/Mobile-Coop-visual-gate-vg4 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/visual-gate-vg4 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-visual-gate-vg4"`
- Read first: `docs/systems/agent-preamble.md` (never commit, push, stash, reset or checkout); CLAUDE.md "Hard rules";
  `docs/visual-gate/BRIEF.md` (A8, A9, A11), `PLAN.md` section 5; the plumbing to copy:
  `git show origin/master:scripts/laptop-queue/request.mjs` lines 85-117 (temp index, `read-tree`, `hash-object -w`,
  `update-index --cacheinfo`, `write-tree`, `commit-tree` with the remote branch as parent or orphan the first time,
  push with 5 retries and a refetch between them).

## Files (only these)
- create `scripts/visual-gate/storeLib.mjs` (pure: no `node:` imports, no git, no fs)
- create `scripts/visual-gate/store.mjs` (git / fs I/O)
- create `scripts/visual-gate/baseline.mjs` (CLI)
- create `tests/visualGateStore.test.ts`
- create `docs/visual-gate/checks/vg4-build.md` (your report)
Do NOT touch: anything under `src/`, `scripts/laptop-queue/*` (copy the pattern, do not import or edit it), other
visual-gate scripts, `package.json`, other docs. Never push to any remote, never create the `visual-baselines` branch
on origin (VG7's first recorded run creates it); never `git checkout` / `switch` / `stash` in the worktree.

## Contract (copy verbatim to the top of storeLib.mjs; shots are opaque to the store except `key`)
```js
/** One measured shot (VG5 fills it; the store reads only `key`). @typedef {{ key: string } & Record<string, unknown>} ShotRecord */
/**
 * @typedef {{
 *   sha: string, version: string, train: number | null, branch: string, at: string,   // at: ISO time
 *   renderer: string, chrome: string, viewport: { width: number, height: number },
 *   verdict: 'green' | 'flagged' | 'error',
 *   shots: ShotRecord[], rigs: ShotRecord[], parity: Record<string, unknown>[], flags: Record<string, unknown>[], ms: number,
 * }} RunRecord
 */
/** @typedef {{ sha: string, version: string, by: string, why: string, at: string, only: string[] | null }} AcceptRecord */
/** @typedef {{ runs: RunRecord[], accepted: AcceptRecord[] }} Records */
/** @typedef {{ key: string, sha: string, version: string, source: 'accepted' | 'green', approver: string | null, shot: ShotRecord }} BaselinePick */
```
Shot keys are `<view or rig id>@<preset>` (rigs: `<id>-on@<preset>` / `<id>-off@<preset>`); thumbnails on the branch
keep the raw key as the file name (`@` is legal in git paths; the PR comment URL-encodes it, VG6).

## storeLib.mjs (pure, exported, exact names)
- `BRANCH = 'visual-baselines'`.
- `shotKey(id: string, preset: string, rigState: 'on' | 'off' | null = null): string`.
- `cmpSemver(a: string, b: string): number` - `x.y.z` numeric compare (negative / 0 / positive); throws on a malformed one.
- `validateRun(rec: unknown): string[]` - problems (empty = valid): sha 40 hex, version semver, verdict in the 3, renderer
  non-empty, shots an array of objects with string `key`, keys unique across shots + rigs.
- `runPaths(rec: RunRecord, thumbs: Record<string, Uint8Array> = {}): { path: string, data: string | Uint8Array }[]` -
  `runs/<sha>/result.json` (JSON, 2-space indent, trailing newline) and `runs/<sha>/thumbs/<key>.webp` per thumb.
- `acceptRecord({ run, by, why, only = null, at }: { run: RunRecord | null, by: string, why: string, only?: string[] | null, at: string }): AcceptRecord`
  - throws `no recorded run for that sha` when run is null; `--why is empty` when why is blank; `unknown key <k>` for an
  `only` key not in the run's shots / rigs; `--by is empty`. Version and sha come from the run.
- `acceptPath(a: AcceptRecord): string` -> `accepted/<version>-<sha first 8>.json`.
- `pickBaseline(records: Records, { isAncestor, renderer, version }: { isAncestor: (sha: string) => boolean, renderer: string, version: string }): Record<string, BaselinePick>`
  (A8, pure): candidates are runs with the same `renderer` and `cmpSemver(run.version, version) < 0`. A run qualifies for
  a key when (a) an AcceptRecord with that run's sha covers the key (`only` null or includes it) -> source 'accepted',
  approver = `by`; or (b) the run's verdict is 'green' and `isAncestor(run.sha)` -> source 'green', approver null. Per key,
  the newest qualifying run by semver, ties broken by accepted over green, then the later `at`. A flagged or error run
  never qualifies unless accepted. Keys with no candidate are absent (the gate reports them `new`).
- `parseArgs(argv: string[]): { cmd: 'list' | 'show' | 'accept' | 'help', sha: string | null, by: string | null, why: string | null, only: string[] | null, dryRun: boolean }`
  - `list`, `show <sha>`, `accept --sha <sha> --by <name> --why <text> [--only k,k] [--dry-run]`; unknown -> 'help'.

## store.mjs (I/O; exported functions take `{ cwd = process.cwd(), remote = 'origin' } = {}` so the test can point them at a temp repo)
- `fetchStore(opts)` - `git fetch -q <remote> +refs/heads/visual-baselines:refs/remotes/<remote>/visual-baselines`
  (soft: a missing branch is fine).
- `readRecords(opts): Records` - `git ls-tree -r --name-only refs/remotes/<remote>/visual-baselines`, then
  `git show <ref>:<path>` for every `runs/*/result.json` and `accepted/*.json`; empty Records when the ref is absent.
- `writeFiles(files: { path, data }[], message: string, { dryRun = false, ...opts }): string` - the request.mjs:88-117
  plumbing on a temp index file in `os.tmpdir()` (removed in `finally`), parent = the remote-tracking ref or orphan;
  binary data through `git hash-object -w --stdin` with a Buffer input; `dryRun` -> build the commit, print
  `dry-run: would push <commit> to <remote> visual-baselines` plus the paths, push nothing, return the commit sha;
  else push `<commit>:refs/heads/visual-baselines` with 5 tries (refetch + rebuild between), then refetch.
- `isAncestorFn(opts): (sha) => boolean` - `git merge-base --is-ancestor <sha> refs/remotes/<remote>/master` (exit 0 ->
  true, 1 -> false, other -> throw).
- `recordRun(rec, thumbs, opts)` - `validateRun` (throw on problems), then `writeFiles(runPaths(...), 'visual-gate run <sha8> <version>')`.
- `recordAccept(a: AcceptRecord, opts)` - `writeFiles([{ path: acceptPath(a), data: JSON }], 'visual-gate accept <version> by <by>')`.
- git via `execFileSync('git', args, { cwd, encoding, input, windowsHide: true, timeout: 120_000 })` (request.mjs:31-38 style).

## baseline.mjs (CLI)
`node scripts/visual-gate/baseline.mjs list | show <sha> | accept --sha <sha> --by <name> --why <text> [--only k,k] [--dry-run]`
- fetches first; `list`: one line per run (version, sha8, verdict, renderer, at, `accepted by <by>` when accepted);
  `show`: the run's verdict, flags count, shots count and its accept records; `accept`: finds the run by full sha or a
  unique prefix (>= 7), builds `acceptRecord` (refusals exit 1 with the message), writes it (or `--dry-run`), prints the
  path and commit. `at` = `new Date().toISOString()`. Runs `main()` only when executed directly.

## Unit tests (`tests/visualGateStore.test.ts`, vitest, node env)
```ts
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BRANCH, shotKey, cmpSemver, validateRun, runPaths, acceptRecord, acceptPath, pickBaseline, parseArgs,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/visual-gate/storeLib.mjs';
// @ts-expect-error plain .mjs process script without types
import { readRecords, writeFiles, recordRun, recordAccept, isAncestorFn } from '../scripts/visual-gate/store.mjs';
```
Pure (hand-made records, renderer 'R1'):
- shotKey with / without rig state; cmpSemver 4.97.0 < 4.97.1 < 4.100.0, malformed throws.
- validateRun: a good record -> []; bad sha, duplicate key, empty renderer each reported.
- acceptRecord: null run, blank why, blank by, unknown `only` key each throw; a good one copies sha / version.
- pickBaseline: (1) green ancestor run 4.96.0 and green ancestor 4.97.0, current 4.98.0 -> 4.97.0; (2) the newer run
  flagged, not accepted -> the older green one; (3) flagged 4.97.0 accepted with `only: ['a@low']` -> 'a@low' from
  4.97.0 (source accepted, approver set), 'b@low' from the older green; (4) a green run that is not an ancestor (a PR
  run) is ignored; (5) another renderer ignored; (6) a run at the current version or above ignored; (7) no candidate ->
  key absent; (8) same version accepted and green -> accepted wins.
- parseArgs: each command, `--only a,b`, `--dry-run`, unknown -> help.
I/O (temp repos under `os.tmpdir()`, removed in `afterAll`; set `user.name` / `user.email` in each repo):
- create a bare repo as the remote and a work repo with one commit on `master` pushed to it; `writeFiles` with
  `dryRun: true` returns a commit and the bare repo has no `visual-baselines`; `recordRun` without dryRun creates the
  orphan branch on the bare remote (its commit has no parent); a second `recordRun` makes a commit whose parent is the
  first; `readRecords` returns both runs; `recordAccept` then `readRecords` returns the accept; `isAncestorFn` true for
  the master commit, false for an unrelated orphan sha. The work repo's HEAD, index and working tree are unchanged
  after all writes (`git status --porcelain` empty, HEAD sha the same).
Keep the whole file < 30 s.

## Acceptance (run all; paste outputs in the report)
- `npx vitest run tests/visualGateStore.test.ts --maxWorkers=2` all pass.
- `npm run typecheck:fast` clean; `npx eslint tests/visualGateStore.test.ts` clean; `node --check` the three scripts.
- `node scripts/visual-gate/baseline.mjs list` in your worktree prints an empty list (no branch on origin yet) and exits 0;
  `node scripts/visual-gate/baseline.mjs accept --sha 0000000 --by x --why y --dry-run` exits 1 with `no recorded run`.
- Nothing pushed anywhere: `git ls-remote origin visual-baselines` still prints nothing.
- No e2e, no GPU, no build, no `npm run check`, no full `vitest run`. Single vitest files only, `--maxWorkers=2`. Any GPU
  run on the laptop is requested by the LEAD, not you (none is expected for this slice).

## Report `docs/visual-gate/checks/vg4-build.md`
Built (functions, deviations from this brief and why), test list with pass counts, the CLI outputs above, files touched,
open items (anything VG5 / VG6 / VG7 must know). Final message: done / not done, test results, open items (short).
