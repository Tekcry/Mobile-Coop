# Night Shift - process rules
Owner: the orchestrator. Status: current.

The one place for session, job, machine, merge and test rules; current rules only (their history:
`docs/process-audit/`). Every session reads them from master: `git show origin/master:docs/RULES.md`, never a branch or
worktree copy. The game itself: `docs/VISION.md`. Code hard rules and the authority order: `CLAUDE.md`.

Detail docs point here and never restate a rule: `docs/systems/session-method.md` (the job lead's loop),
`docs/systems/agent-preamble.md` (subagents), `docs/systems/auto-train.md` (trains), `docs/systems/watchdog.md`,
`docs/systems/swaps.md` (swap commands), `docs/systems/testing-tools.md` (suites, the test queue, flakes),
`docs/systems/deploy.md` (branches and Pages).

Project knowledge lives in git, never only in Claude memory: Michael swaps accounts. Record decisions, plans and
follow-ups in the repo docs.

## Sessions
**Titles** are message addresses. Each session sets its own title as its first step (set_session_title "self") and
never renames mid-run. Boot lines: `docs/orchestrator/PROMPTS.md`; per-title start: `docs/orchestrator/BOOT.md` (both
on origin/feature/menu). Effort is the lead's; its agents keep their own model and effort.

Session layout (G364). "Started by" is who opens the session at each swap.

| Title | Machine | Model, effort | Started by | Area |
| --- | --- | --- | --- | --- |
| Night Shift \| Orchestrator | desktop | Opus 5.5, high | Michael pastes | roadmap, planning, trains, swaps, walk cards |
| Night Shift \| Player Build | desktop | Opus 5.5, high | orchestrator | movement, mocap, animation, takedowns, guard models, co-op player |
| Night Shift \| Marlow Build | desktop | Opus 5.5, high | orchestrator | Marlow Yard, section rating, level validator, route-runs, guard cap |
| Night Shift \| Sector Ops Build | desktop | Opus 5.5, high | orchestrator | Sector Ops (Saltmarsh Park), lighting on every map, visual gate |
| Night Shift \| Campaign Build | desktop | Opus 5.5, high | orchestrator | Tallow Wharf, the mission framework / engine, campaign rules (strict rules), the objective popup, removing the compass, blip and maps |
| Night Shift \| Guard AI Build | laptop | Opus 5.5, high | Michael pastes | `src/ai` on every map, coop4 |
| Night Shift \| Test Runner | laptop | Opus 5.5, medium | Michael pastes | the laptop queue, flakes, guard render |
| Night Shift \| Cloud Builder | cloud | Opus 5.5, as the orchestrator starts it | orchestrator | one session: briefs on the orphan branch `cloud-queue` (its README); idle when no brief waits |

Old names in older docs: CT Core Build = Player Build, Menu Notes Build = Marlow Build, Course Ready Build = Sector Ops
Build, Character Build = Test Runner.

**The orchestrator** runs the build. It alone edits `docs/ROADMAP.md` and `docs/orchestrator/` (on feature/menu),
triages the Inbox every cron run, plans and starts jobs (no job starts unless it is on the roadmap), gives an idle lead
its next feature, brings Michael decisions, writes the walk cards, keeps auto-train and the laptop queue moving
(failed trains, conflicts, stale claims), and folds ROADMAP "Decided" into `docs/DECISIONS.md` daily (a docs PR).
Master always holds every finished update: green trains merge without asking Michael; ask him when unsure. Its cron
prompt is in `docs/orchestrator/STATE.md`. Every other session messages it only when a PR opens or is train-ready, when
blocked, or when Michael is needed (G305); progress goes in the job's STATE. A session that hears a new idea from
Michael sends it verbatim to the orchestrator, which adds it to the ROADMAP Inbox the same turn.

**Every session, at start.**
1. These rules and `docs/VISION.md` (both from origin/master), then the session's resume block (BOOT.md says where).
2. Only the ROADMAP entries and BRIEF / PLAN / bible / `docs/systems/*` sections the resume block names: `grep` and
   line ranges, never whole large files.
3. Conflicts follow the authority order in `CLAUDE.md` (G86). Every decision is also written into the bible.

**Intake: idea to build.**
1. Michael's words go to the ROADMAP Inbox; the orchestrator triages them onto "Now" with an owner and a gate.
   Playtest feedback and bugs go to `docs/backlog.md`; new ideas from Michael go to the ROADMAP Inbox.
2. `BRIEF.md` keeps "Michael said" (verbatim quotes) apart from "Michael picked" (the option text he chose), then
   assumed decisions A1, A2, ... with how to undo each. An assumption that would loosen a Michael-only rule (hard
   rules, the level standard, scope, perf) is a one-click question to him by day; overnight it is assumed and logged
   (an A entry with how to undo it, sent to the orchestrator for Michael's next look) and the work carries on (G358,
   "Assume and log"). This is the only statement of the rule; other docs point here.
3. An Opus `PLAN.md` with its claims: files, maps, wire and save paths, slices, sizes.
4. A fresh Opus plan checker (intent against Michael's words, gates, the claims) passes it before any build.
5. Maps and looks: before greybox or art on a map, or a big look change, Michael approves a one-page to-scale plan plus
   a 5-line intent check with one click (native multiple choice) (G288). A new map or map re-plan also passes the level
   validator (connectivity graph, `docs/level-design.md`) before greybox. At greybox exit a measured validator pass
   (`scripts/level-validate.mjs`; V6 `--require-measured` is not live yet, `docs/level-design.md` 14) and the bot
   route-runs are required, then a 10-minute walk card for Michael (G289, G330).
6. Build (below). Templates and commands for each step: `docs/systems/session-method.md`.

**Walk pacing** (G288). At most 3 unwalked features per area (Player / animation, Marlow Yard, Sector Ops, Guard AI,
lighting); ROADMAP "Waiting on Michael" keeps the count. The cap limits switch-on only: at the cap no new feature in
that area is switched on until Michael walks some, while signed-off builds go on dark behind their flags, and fixes to
shipped features (rule fixes such as G339's compass / blip) are allowed (G355). Every release gets a 10-minute walk card
from the orchestrator: risk-ranked, one acceptance line per item, look videos for animation and lighting (each such PR
carries a 1-2 min video path in its body). A flagged feature is switched on when Michael accepts it, or when he says so
(4-player Sector Ops, G381). A lead with no PLAN slice left starts the next roadmap feature in its area with an Opus
plan; the orchestrator assigns it (G283).

**A job.**
- Branch `feature/<job>` from origin/master in `C:/NightShift/Mobile-Coop-<job>` (G94). The plain folder
  `C:/NightShift/Mobile-Coop` stays on master: read and branch from it, never work in it. The branch guard
  (`docs/systems/agent-preamble.md`) runs before every write.
- `docs/<job>/`: `BRIEF.md`, `PLAN.md`, `STATE.md` (resume block on top, at most ~40 lines with exact file:line
  pointers; done list and history below it).
- Refining (feel tuning, animation polish, perf tuning, detail art) is planned like any job, paced by the walk cap and
  gated by the visual sign-off (G288).
- The loop (`docs/systems/session-method.md`, G87): implementer, fresh checker, at most 1 fix round per slice unless the
  work is broken. Checkers block on broken, unplayable or off-intent work; cosmetic notes go on the job's polish list.
  Opus plans, writes strict slice briefs, checks, and writes AI, animation, engine and `src/net` code; Sonnet 5.5 builds
  from strict Opus briefs (greybox, data, tests, wiring); Haiku 5.5 does chores (logs, STATE, fragments, renames)
  (G302). A slice that fails its checker gets its fix round from Opus, and its sibling slices get Opus builders. One
  checker per batch of related slices; two independent Opus checkers on AI and `src/net` PRs; Sonnet may check greybox,
  data and dressing. Every laptop failure gets an Opus triage agent at once (G319), started by the lead whose PR failed
  (Test Runner for a train failure). This is session process: no queue code starts it, so each lead watches its own
  heads' statuses and the orchestrator's cron run checks failed heads for a triage note.
- Agents commit and push each sub-step on their branch (path-limited, never `git add -A`), so a swap or cut-off loses
  at most the step in flight. Parallel agents work in their own worktrees (`feature/<job>-<slice>`) and never edit the
  same files; the lead merges them.
- PRs stay under ~1.5k changed lines or ~4 hours of work. Unfinished work merges dark behind a flag in
  `src/core/flags.ts`; each flag has an owner and a switch-on date (PR body and ROADMAP).
- The checker's verdict is a commit status on the checked head:
  `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="<model> PASS"`
  (`-f state=failure` and `description="<model> FIX"` for a fix list). The lead starts the fresh checker on the head
  as soon as it is pushed (the laptop runs `affected-e2e` on it by itself); a fix round reruns only what failed.
- Leads never merge master into their branch and never merge into master: the train does both.
- Unattended by default: assumed decisions are logged and the job carries on; ask Michael (native multiple choice) only
  before installing or downloading, when a hard rule blocks the goal, or as Intake step 2 says. Every question to
  Michael comes with its decision pack (prototype / screenshots / GPU sheets).
- Full burn: every independent slice of the PLAN runs in parallel now, up to the desktop CPU target ("Machines"). Opus
  briefs the next 2-3 slices ahead and plans the next ROADMAP jobs before they start (plans and briefs only, no
  speculative code). tsc / vitest-heavy builder slices may go to cloud builders through `cloud-queue`
  (`docs/systems/agent-preamble.md` "Cloud sessions"); a lead picks up a done brief within 1 hour or closes it, and the
  orchestrator checks for done briefs older than that every cron run. A lead's small and spare jobs ride one batch PR.
- Finish: the PR to master with its changelog fragment; it becomes train-ready (below). At the merge the job's answers
  from Michael move into `docs/DECISIONS.md` with the next free G numbers (G89). The job's last PR has the line
  `Job-done: <job>` in its body, so the train archives `docs/<job>/` ("Docs" below).

**Getting to master** (G83: master is the live game and the only base).
- Train-ready (this is the rule's owner; `docs/systems/watchdog.md` "The label convention" is how the code applies it) =
  on the PR's current head: CI `check` success + `checker` success + `affected-e2e` success. The laptop service runs the
  `--affected` suites on every non-draft PR head by itself; a docs / unit-only head gets success at once. Heads older
  than `LQ_AFFECTED_MAX_AGE_H` (24 h) and fork heads get no automatic run: the lead requests it (`request.mjs --sha
  <head> --pr <n> --affected --set affected --requester affected-e2e`). The `no-affected-e2e` label waives the e2e part
  for one PR.
- Who labels: the watchdog task (`--fix labels`) adds `train-ready` when all three hold and (`--fix prs`) removes it
  when a check turns red or when commits land after the label that touch more than docs, `*.md`, `changes/`
  fragments or CHANGELOG with no new `checker` success on the new head (G325). Until the
  watchdog task runs, the orchestrator labels and unlabels by the same rule each cron run. When auto mode blocks a lead
  from posting its checker's verdict, the orchestrator posts the `checker` status for it.
- `affected-e2e` never sticks (4.101.1): the service requests a head again when its `affected-e2e` is pending with no
  open, claimed or running affected request; a duplicate hands the status over to the surviving request; a request
  withdrawn before it ran posts error "withdrawn by the requester (not run)". Fallback, if one still sits pending: the
  orchestrator (or the lead) re-requests it: `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --affected
  --set affected --requester affected-e2e` (only that requester's verdict is also posted on `affected-e2e`).
- Auto-train (scheduled task every minute, G286; `docs/systems/auto-train.md`) builds `train/<n>` from labelled PRs
  with a green check, makes the version commit (fragments into `CHANGELOG.md`, the next version, the one
  `PROTOCOL_VERSION` bump when a member touches a wire path), and the queue runs one full e2e on the train head. CI and
  e2e green: it releases (merge, tag, `dev` moves `/preview/`, member PRs closed).
- A failing member leaves the train and the rest rerun (auto-drop, G286); a desktop red is never final without a laptop
  rerun.
- A member that conflicts is left out of the train by the code: it loses `train-ready` and gets a comment; its lead
  fixes the conflict on its branch and the label comes back (`docs/systems/auto-train.md` "Left out on a conflict").
  Fallback only: the orchestrator merges it by hand on the pre-version head
  (`git checkout -B train/<n> <version commit>^`, subject `Merge origin/<b> into train/<n>`,
  `git push --force origin train/<n>`), then reruns
  `node scripts/merge-train.mjs build <n> <version> "<title>" <all members> --keep`.

**Test tiers** (suite lists and selection: `docs/systems/testing-tools.md`).
| Change | Runs | Where |
| --- | --- | --- |
| Docs only (`*.md`, `docs/**`) | CI `check` (`affected-e2e` passes at once) | - |
| An agent sub-step | `npm run typecheck:fast` + `npx vitest run <files>` | the agent's machine |
| A PR | CI `check` + `affected-e2e`: at most 3 suites, the closest to the folders the PR touches (`affectedPick` in `scripts/e2e-affected.mjs`: most changed files reached, then the most specific `DIRECT_COVERS` row, then the shorter time; `node scripts/run-e2e.mjs --affected origin/master --list` names them; `E2E_AFFECTED_MAX` / `--affected-max`, 0 = no cap). `src/net`, `src/save` and wire changes (a file `src/net/protocol.ts` imports) run exactly the co-op group `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`. The train's full run catches the rest. A checker gate on top: for `src/player` or `src/game` the lead requests `e2e-coop` + `e2e-netmove` (`request.mjs`) and the checker passes only when they are green | laptop queue |
| Tuner / Anim Studio / tests only | CI `check` + `affected-e2e` | laptop queue |
| Queue, train and tool scripts (`scripts/laptop-queue/**`, `scripts/auto-train.mjs`, `scripts/perf.mjs`, `.github/**`) | CI `check` (unit tests; `affected-e2e` passes at once, its text says "docs / unit only"); a live run when the lead says | - / laptop queue |
| A train | one full `npm run e2e` on the train head | laptop queue |
| Look or perf | `npm run e2e:gpu`, perf budgets, contact sheets, look videos; slot-alone measures right after a release | laptop 4189 (a one-off on the desktop under `heavy.lock`) |
- Every e2e run is `E2E_GPU=1` and a GPU failure counts; a software-GL rerun only tells a test-timing bug from a game
  bug. CI is `npm run check` only (software GL, no e2e). Cloud sessions run tsc and single vitest files only (no e2e,
  no GPU, no `npm run check`; the `cloud-queue` README); every e2e and GPU check of their work is "pending PC run" and
  runs on the laptop queue once a lead takes the branch.
- A crash or timeout mid-suite is not a pass. Flaky suites, quarantine and what counts as a flake:
  `docs/systems/testing-tools.md` "Flakes and quarantine" (the only owner of that rule).

**Machines.** Two heavy slots, both Michael's PCs.
- Laptop (Test Runner, Guard AI): the main test machine. The laptop queue service (`scripts/laptop-queue`, branch
  `laptop-queue`, scheduled task every minute) runs on 4189 (GPU and alone runs) and 4192, in this order (lib `pick`):
  trains first, sharded across 4189 + 4192 at `E2E_JOBS=3` per slot (`LQ_TRAIN_JOBS`); then train reruns (one slot,
  `E2E_JOBS=1`); then an alone request that has waited over 30 min (`ALONE_AGE_MIN`; it goes ahead of PR work and takes
  both slots once they drain); then PR requests, requesters in arrival order (one slot, `E2E_JOBS=2`; full runs 3); then
  the other alone measures when both slots are idle; last, spare work: after both slots sit idle with nothing open for
  `LQ_SPARE_IDLE_MIN` (5) min the service queues the next job of `docs/laptop-queue/spare-jobs.json` on the master head,
  and a waiting real request or a train stops it. The two sessions keep its CPU under ~80%.
- Desktop (Orchestrator, Player, Marlow, Sector Ops, Campaign): CPU target under ~80% (G306); over 90% the orchestrator
  trims the heaviest session (G304); under ~60% leads with independent slices left start more builders. Agents run tsc
  and single vitest files, never a full `npm run check` (CI runs it).
- The desktop runs e2e suites only as the queue's overflow worker (task `NightShift-desktop-queue`), never by hand; a
  one-off GPU, perf or Blender job runs there only when the job lead says, under `heavy.lock`. The worker takes pr requests
  on 4191 (`heavy.lock`) and 4192 (`heavy2.lock`) at `E2E_JOBS=1`, one new start per pass, each only while a request
  waits (installed backlog gate 0; `LQ_DESKTOP_BACKLOG`), the slot's lock is free and the desktop CPU of Normal or higher
  priority processes is under 80% (lib `gatedCpu`; `LQ_DESKTOP_CPU` / `LQ_DESKTOP_CPU2`; below-Normal work such as a Blender bake does not
  count). Trains only when the laptop has pushed nothing for 10 min (`LQ_LAPTOP_SILENT_MIN`) and the head is over
  2 min old; nothing new while auto-train's build marker exists (written during `merge-train build`, deleted once the
  version commit is pushed; a marker over 30 min old is ignored). A desktop failure posts pending and queues
  a laptop rerun, whose verdict is final. `heavy.lock` / `heavy2.lock` also cover builds, Blender bakes and other heavy
  one-offs.
- Requests: `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites "<suites>" --set <name>
  --requester "<title>"` (or `--alone --step "<cmd>"`); verdicts are `laptop-e2e/<set>` commit statuses. Withdraw a
  stale request; `docs/orchestrator/queue-audit.sh` flags them.
- Locks: `node scripts/heavy-lock.mjs take C:/NightShift/heavy.lock "<session> | <job>" --pid "$(cat /proc/$$/winpid)"`,
  the run, then `node scripts/heavy-lock.mjs release C:/NightShift/heavy.lock "<session> | <job>"` in the same shell
  command; per run, never held across a fix loop. A lock whose pid is dead on this host is stale and the next `take`
  breaks it; a lock with no pid is never broken automatically: ask its owner (the label names the session). The
  laptop queue service's own lock lines are read the same way (4.101.1).
- Headless and invisible: never `E2E_HEADED`, no new terminal or console windows, no pointer lock or mouse capture,
  Blender only with `-b`, nothing that takes focus. Stop a runner with `taskkill /T /F` on its PID and check the tree is
  gone.

**Swaps and context.** Michael swaps accounts at 100% of whichever meter caps first, the 5-hour or the weekly (1% weekly
is about 6% of a 5-hour window). Commands: `docs/systems/swaps.md`.
- A save: at ~92% of that meter, and whenever the orchestrator calls one. The orchestrator refreshes
  `docs/orchestrator/HANDOFF.md` "State at the switch" and gives Michael only the orchestrator boot line (PROMPTS.md
  section 1) as the last thing in a message; every save prints it, even when no swap is planned (Michael 2026-10-24
  ~23:20). Every lead commits and pushes each agent worktree as WIP, keeps its STATE resume block current and queues its
  next long runs; all keep working to 100%.
- At 100% with all saved and the next runs queued: "Safe to log out of the desktop and laptop".
- Sessions start fresh at each swap. In the new account Michael pastes only the orchestrator boot line and the two
  laptop lines (Guard AI Build, Test Runner), which the orchestrator prints in one message (title, model, effort,
  machine); the orchestrator starts the four desktop leads and the Cloud Builder itself (start_session). Each session
  resumes from its STATE resume block on origin, not from chat.
- After a same-account 5-hour reset (no swap) the sessions are still there: the orchestrator messages every live
  session to resume.
- A mid-window clear only past ~50% context. Unused connectors (Gmail, Google Drive, Fergus) and plugins stay off in
  Night Shift sessions.

**Talking to Michael.** He is not technical: plain English, brief dot points, no jargon or hashes; hyphens, not em
dashes. Questions only as native multiple choice, by day, when his answer changes the outcome; overnight, decide, log
the assumption and carry on (Intake step 2). A paste-in prompt names its title, model and effort and is the turn's last
message, never paired with a question. He tests through the menus: give menu paths and the version label to expect.
No polling turns: start long runs in the background and wait.

**Doc sizes.** Resume blocks ~40 lines, ending with one `Next:` line; orchestrator STATE current state only; HANDOFF
the newest block only; ROADMAP is Now / Inbox / Waiting on Michael / Decided (today) / Done (last 10). History moves to
archive files. State (holds, caps reached, flags not yet on) goes in the ROADMAP or a job's STATE, never in these rules.

**Branches and previews.** One branch per job, cut from master, one PR each. Pages serves the live game, `/preview/`
(master, through the pointer branch `dev`) and `/ct/` (through the pointer branch `ct-movement`); `dev` and
`ct-movement` are not work branches. Detail: `docs/systems/deploy.md`. Merged branches and worktrees go in the weekly
prune ("Docs"); unmerged branches are never touched, and any other branch deletion is Michael's call.

## Docs
- Map: `docs/VISION.md` the game, `docs/RULES.md` process, `docs/DECISIONS.md` why (every G entry and its history),
  `docs/design-bible.md` systems, `docs/level-design.md` maps, `docs/INDEX.md` lookup (module map, doc index),
  `docs/systems/*.md` detail per system, `docs/<job>/` one job's record. `docs/ROADMAP.md` and `docs/orchestrator/`
  are the orchestrator's, edited on feature/menu and synced to master by the trains; doc lint skips their stale-term,
  owner and header checks and only warns on ROADMAP "Decided" entries older than today. Job STATE resume blocks get
  stale-term warnings (job-owned).
- Every current doc starts with `Owner: <who>. Status: current | history.` under its title (G344): the orchestrator for
  VISION, RULES, INDEX, DECISIONS, the bible and the story (it edits; Michael decides); Marlow Build for level-design
  and the scale sheet (changes need Michael's approval); the area lead for each `docs/systems/*.md`.
- One home per rule: each rule lives in one file; every other doc links to it and never restates it
  (`docs/doc-owners.json` names the homes of the key numbers).
- Folds rewrite in place (G344): one PR updates DECISIONS, the bible and VISION together, plus the owner file of every
  rule it changes. A replaced sentence is rewritten, never followed by an appended "Note <date>"; the old wording goes
  into `docs/stale-terms.json`. The fold's checker fails appended notes and missed owner files.
- Drift audit (G344, "I would like to carry out drift audit more often to prevent straying from vision"): an Opus
  audit the orchestrator runs daily with the fold and after every batch of Michael decisions. It reads VISION, the
  bible, RULES and the open BRIEF / PLAN files against DECISIONS and ROADMAP "Decided"; each drift is fixed in place in
  the fold PR or becomes a ROADMAP item.
- Doc lint in CI: `npm run lint` runs `scripts/doc-lint.mjs` (stale terms, G citations, links and repo paths, restated
  rules, size budgets, appended bible notes, owner / status headers); errors fail `check`, warnings print.
  `docs/doc-lint.json` holds the scope, the budgets and the owner / status header sets.
- One plan and a tidy-up (Michael 2026-10-25 ~14:00, "only enough to maintain clear plan"): the signed-off ROADMAP
  "Now" is the only plan. Daily and after each release the orchestrator archives finished job docs and superseded plan
  files, merges or drops duplicates, fixes stale pointers and logs one line in its STATE.
- Finished jobs: the `Job-done: <job>` line in the job's last PR makes the train's version commit move `docs/<job>/` to
  `docs/archive/<job>/` and fix the links to it.
- Weekly prune (G345, "Yes, weekly"): `scripts/prune-merged.mjs --apply` (task `NightShift prune-merged`,
  `scripts/prune-task.ps1`) removes clean worktrees whose HEAD is in master and idle over 24 h, and deletes branches
  fully merged into master whose tip is over 7 days old (never unmerged, protected or open-PR branches); log
  `C:/NightShift/scratch/prune-log/`.

## Commands
- `npm run dev` - dev server (never from an agent)
- `npm run editor` - Kestrel level editor (dev only, `docs/kestrel/editor.md`; Kestrel is paused, G53)
- `npm run build` - typecheck + production build into `dist/`
- `npm run typecheck:fast` - incremental tsc (cache in `node_modules/.cache`), for agents' repeat runs
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run check` - lint + tests + build (what CI and every job must pass). On a PR, CI runs four jobs in parallel -
  lint, test, build-check and `pr-size` (the ~1.5k-line cap, `docs/systems/session-method.md` "Slice size") - and an
  aggregate `check` that fails unless all four pass (`.github/workflows/deploy.yml`)
- `npm run e2e` - serves `dist/` and runs the required headless e2e suites as a desktop (pad, keyboard and mouse; G13),
  one browser each, `E2E_JOBS` at a time (default min(5, cores / 3); the laptop queue sets it). Needs a prior
  `npm run build`. `npm run e2e:serial` runs one at a time with live output (debugging).
- `npm run e2e:quick` - `smoke` plus the suites that cover the folders the change touched (working tree plus unpushed
  commits). Which change runs what: "Test tiers" above.
- `npm run e2e:legacy` - the parked-content suites (Hunter / Mission, progression, cosmetics, Fallow, Kestrel, the
  Warehouse routes and archetypes); `npm run e2e:audio` - the audio suites; `npm run e2e:gpu` - the visual read-backs
  (laptop or desktop, never cloud). None of them is in the full run.
- Hardware GPU: `E2E_GPU=1` (ANGLE D3D11 on Windows, GPU blocklist ignored; `perf.mjs` then uses the local budget
  profile). Without it the browser is software GL (SwiftShader): never claim a perf or visual result from it. Cloud
  sessions: "Test tiers".
- Suites, helper scripts (`perf`, `soak`, `shot`, `anim-sheet`), flakes and the debug overlay:
  `docs/systems/testing-tools.md`. `?autostart=<mapId>&mode=<mode>` boots straight into a match (dev and tests). Uses
  the preinstalled Chromium.
- Never run `npm run dev`, `npm run preview` or a watch mode from an agent; every shell command has a timeout.

## Ports
Michael's PCs (G94). One runner per port at a time; jobs always pass `E2E_PORT`.

| Port | Use |
| --- | --- |
| 4189 | Laptop queue GPU / alone slot: perf, perf-trend, anim-audit, anim-sheet, shot, `E2E_GPU=1` suites |
| 4192 | Laptop queue second slot; desktop overflow slot 2 (`heavy2.lock`) |
| 4191 | Desktop overflow slot 1 (`heavy.lock`) |
| 4179, 4173 | Script defaults (`run-e2e.mjs`, `e2e-lib.mjs`); not used by jobs |
| 5199 | `npm run editor` |

Free a port before and after each run (replace 4191 with the port):
`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`,
then `netstat -ano | grep ":4191 .*LISTENING"` must print nothing. The runner starts and stops its own server.

## Definition of done (every job)
- `npm run check` passes; the e2e runs of the test tiers pass.
- Performance budgets pass (`docs/systems/performance.md`) for a job that touches rendering or hot paths.
- Pure logic lives in Babylon-free modules with Vitest tests; each new player-facing system extends the e2e suite that
  owns its area (a new suite only when none does).
- New or changed animations meet the bible's animation realism standard; the PR links a short look video.
- Docs updated: the changelog fragment, `TESTING.md` (the short desktop checklist, G92), the relevant `docs/systems/*.md`
  (the orchestrator updates `docs/ROADMAP.md`).
- Versions (G183): a job never edits `CHANGELOG.md` or `package.json`'s version; it writes its entries in one fragment
  `changes/<branch-with-dashes>.md` (`changes/README.md`; `kind: minor` for a game change, `kind: patch` for a fix,
  test or docs). The train build assembles the fragments and sets the next `4.MINOR.PATCH` (minor if any member is minor).
- A save-shape change bumps `SAVE_VERSION` with a migration and a test using a literal old save. A wire change does not
  bump `PROTOCOL_VERSION` and no test asserts its number (tests read the constant): the train build bumps it once
  (master + 1) when a member touches a wire path.
- Commit and push the job branch, open or update its PR to master, report (done / not done, checks, open items), then
  STOP. The label follows from "Getting to master".
