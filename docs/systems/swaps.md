# Account swaps (cheap swaps)

Process audit 2026-10-24, finding 6 (Michael approved ~21:50): swaps were the biggest single cost. Measured over 3 days:
~16 swaps, save -> every session up again median ~35 min, 8+ agents / runs lost at cutoffs, dead cloud builders' claims
reopened by hand. The timing rules (save at ~92%, orchestrator prompt at 95%, Michael swaps at 100%, whichever limit binds
first) stay in `docs/RULES.md` ("Swaps and context"); this file is the commands.

## Targets
| Measure | Before (3 days to 10-24) | Target |
| --- | --- | --- |
| Cap -> every session up again | median ~35 min | under 10 min |
| Agents / runs lost at a cutoff | 8+ | 0 (everything on origin or queued) |
| Cloud claims reopened by hand | every swap | 0 (expiry does it) |
| Save check per machine | each lead by hand | one `swap.mjs save` run, ~1 min |

## At ~92%: save
Every lead saves its own job as before (STATE resume block current, agents told to commit at each sub-step, long runs
queued on the laptop queue). Then one run per machine (the orchestrator on the desktop, Test Runner on the laptop):

```sh
# what is not saved yet (read-only apart from `git fetch`)
node scripts/swap.mjs save
# commit dirty job worktrees as "WIP: swap save <iso>" and push every job branch with local-only commits
node scripts/swap.mjs save --commit-wip
```

- The last line is `SAFE` or `NOT SAFE: <n> items` (exit 0 / 1); the items above it say what and where. Full detail:
  `C:/NightShift/scratch/swap-status.json`.
- Items: `dirty` (uncommitted files touched in the last 12 h), `unpushed` (branch commits on no origin ref; a branch with
  no upstream counts), `detached-local` (detached HEAD with local-only commits: make a branch and push it), a heavy lock
  whose pid is dead on this machine, and any WIP commit or push that failed.
- Not items: `prunable` (clean, merged into origin/master or upstream gone), `stale-dirty` (every dirty file untouched 12 h+:
  debris that already survived earlier swaps on disk; `--stale-hours 0` counts them again), clean / detached worktrees.
- `--commit-wip` never commits or pushes master / main / dev / ct-movement / train/* / cloud-queue / laptop-queue /
  gh-pages or a detached HEAD, and never forces. It runs hooks and stages only the paths `git status -uall` listed, so a
  nested repo or worktree is never added as a gitlink. It skips a worktree (an item) that is mid merge, cherry-pick,
  revert or rebase, or has unmerged paths, and before staging when a changed path looks secret (`.env`, `.env.*`,
  `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa*`, `*credentials*`, `*secret*`, `.npmrc`, `*.token`, any path segment) or a
  new, modified, renamed or copied file is over 10 MB, or the WIP commit would be over 50 MB. A rejected push (the branch moved on
  origin) stays an item: fetch and merge in that worktree by hand.
- Also printed (not items): heavy.lock / heavy2.lock / auto-train.lock holders with pid liveness, laptop-queue requests
  queued and claimed (per worker; `--machine laptop` or env `SWAP_MACHINE` / `LQ_WORKER` marks this machine's), and the
  auto-train status line. Check that the next ~2 hours of runs are queued.
- Every clone is scanned: with no `--repo`, each folder under `--root` is resolved to its clone (`git rev-parse
  --git-common-dir`, deduped), so separate clones such as `Mobile-Coop-locomotion` and their worktrees are covered;
  `--repo <path>` (repeatable) or env `SWAP_REPO` limits the scan. Local branches checked out nowhere with local-only
  commits are rows too (`unpushed`, or `stale-branch` when the tip is `--stale-hours` old).
- On the laptop: same commands; paths come from `--repo` / env `SWAP_REPO`,
  `--root` / `NS_ROOT` (default `C:/NightShift`, where the heavy locks live) and `--scratch` / `SWAP_SCRATCH`.

Re-run `save` until it prints `SAFE`, then keep working to 100% as `docs/RULES.md` says. At 95% the orchestrator posts the next
orchestrator prompt; it is safe to log out once the meter is at 99-100% and the last `save` said `SAFE`.

## After the swap: boot
Michael pastes one short boot line per session title; each session resumes from its own STATE resume block on origin, not
from chat history:

```
Night Shift | <Title>: set_session_title "self" to this title, read `git show origin/master:CLAUDE.md` (current rulebook),
then docs/<job>/STATE.md resume block on origin/feature/<job>; run `node scripts/swap.mjs status` and carry on.
```

Cloud builders of the old account are dead after a swap. Claim expiry stays manual until the heartbeat patch
(`docs/cloud-queue-README.patch.md`) is applied to the cloud-queue README: today's builders do not re-stamp their claims,
so a live builder's claim also looks 90 min old. Until then the orchestrator runs the dry run, checks that the listed
builders are really gone, and only then runs `--yes`. After the patch is in, the same commands can run unattended:

```sh
node scripts/cloud-queue-expire.mjs                 # dry run: claims 90 min+ old with no push since the claim
node scripts/cloud-queue-expire.mjs --yes           # reopen them (one commit on cloud-queue, no force)
node scripts/cloud-queue-expire.mjs --max-min 1 --yes   # right after a swap: every claim with no push since it was made
```

The heartbeat (builders re-stamp `status: claimed <title> <iso>` every 30 min) is in the cloud-queue README
(`docs/cloud-queue-README.patch.md` until it is applied there).

## Worktree clean-up
340+ worktrees slow every scan. Remove clean worktrees of merged branches (branches are never deleted: Michael's call):

```sh
node scripts/swap.mjs prune --dry-run            # list: clean, merged into origin/master, git dir idle 24 h+
node scripts/swap.mjs prune --yes [--idle-hours 48]
```

Never touched: the main checkout, locked worktrees, detached HEADs (e.g. Mobile-Coop-testrun), protected branches, a
worktree that holds another registered worktree or a non-empty `.claude/worktrees`, a worktree that holds any hop of
another `node_modules` junction chain (A -> B/node_modules -> C/node_modules keeps B and C; links are read from every
worktree, one folder level down and every clone), one with ignored files beyond `node_modules` / `dist` / `test-results`, one in use
(under `--yes` the folder is renamed and back first; a refused rename means a process has it open), and any worktree
git refuses to remove without `--force`. A candidate whose own `node_modules` is a junction has the link dropped first
(never the target), and restored if git then refuses.
