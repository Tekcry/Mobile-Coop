# Night Shift - architecture and conventions

Project knowledge lives in git, never only in Claude memory: Michael swaps accounts. Record decisions, plans and follow-ups in the repo docs.

- Night Shift (renamed from Silent But Deadly) is an original third-person stealth game. It is pure Chaos Theory (CT):
  CT's mechanics, timing, camera, HUD layout and visual style are the authority; anything that is not in CT does not
  exist (G1, G5). Hunter is the one non-CT mode kept, parked behind `?legacy=1` (G7). Light and shadow is the core.
- A co-op campaign that cannot be completed solo; no bot partner (G2, G48, G50). Every campaign section forces a co-op
  traversal move, with no solo bypass (G253); Sector Ops may be played solo (1-4); Marlow Yard is the guided, linear
  training course; the no-markers and multi-route rules apply to campaign missions and Sector Ops (ROADMAP Decided
  2026-10-24 ~22:12 / ~22:45). The campaign and Marlow Yard are 2
  players; Sector Ops alone allows up to 4 (Michael's coop4 decision, ROADMAP Decided 2026-10-23 ~10:25; it becomes a G
  number at the coop4 merge). The CT co-op levels are researched and that experience is recreated (G3).
- Work order: the CT co-op research, then the CT prototype, then the rest (G95). Prototype first: only the basics needed
  to test a feature, then refine once Michael has seen it (G4). The roadmap is `docs/ROADMAP.md` on origin/feature/menu.

## Current goal (Michael, 2026-10-19)
A fully functional 2-player co-op training level, playable end to end, as soon as possible:
- Wren as the character for both players, with basic animations.
- Basic weapons: Blender scratch builds, realistic at a glance but quick.
- All co-op moves and the required CT moves; lights and shadows working (light parity).
- Pure CT (G1, `docs/ct-research`, G124-G160) except Michael's recorded decisions, including a Blacklist-style
  selection wheel for weapons, gadgets and vision modes (no time slow).
- A visual pass comes last, to make it prettier.

Refining is allowed: the "no refining until Michael playtests the core loop" rule is lifted (ROADMAP Decided
2026-10-24 ~21:50). Feel tuning, animation polish, perf tuning and detail art are planned like any job, paced by the
walk cap and gated by the visual sign-off ("Sessions"). Checkers block on broken, unplayable or off-intent work;
cosmetic notes go on the job's polish list. At most 1 fix round per slice unless the work is broken.
- A PWA (Vite + TypeScript + Babylon.js 9 + Havok) on GitHub Pages, desktop only: pad first, then keyboard and mouse (G12).
- Michael's decisions: `docs/DECISIONS.md` (G1, G2, ...). Design: `docs/design-bible.md`. Story and in-game text: `docs/story.md`.
- The co-op training level is Marlow Yard (map `ctcourse`, Course mode, `?autostart=ctcourse&mode=course`; CT prototype
  B1, `docs/ct-prototype/`). Sector Ops is Saltmarsh Park (map `campusOps`, `docs/sector-redesign/`); the old warehouse
  stays selectable. Fallow (map `bunker`, `docs/training/`) is parked behind `?legacy=1`.
- The internal ids keep the old name (IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id).

## Sessions
The only place for session, job, machine, merge and test rules; current rules only (their history:
`docs/process-audit/`). Every session reads them from master: `git show origin/master:CLAUDE.md`, never a branch copy.
Detail: `docs/systems/session-method.md` (the job lead's loop), `docs/systems/agent-preamble.md` (subagents),
`docs/systems/auto-train.md` (trains), `docs/laptop-queue/PLAN.md` (the test queue), `docs/systems/testing-tools.md`.
Where they disagree, these rules win (for example `docs/systems/testing-tools.md` L27 / L48,
`docs/systems/session-method.md` L26, `docs/systems/auto-train.md` L29).

**Titles** are message addresses. Each session sets its own title as its first step (set_session_title "self") and
never renames mid-run. Boot lines: `docs/orchestrator/PROMPTS.md`; per-title start: `docs/orchestrator/BOOT.md` (both
on origin/feature/menu). Effort is the lead's; its agents keep their own model and effort.

| Title | Machine | Model, effort | Area |
| --- | --- | --- | --- |
| Night Shift \| Orchestrator | desktop | Opus 5.5, high | roadmap, planning, trains, swaps, walk cards |
| Night Shift \| Player Build | desktop | Opus 5.5, high | movement, mocap, animation, takedowns, guard models, co-op player |
| Night Shift \| Marlow Build | desktop | Opus 5.5, high | Marlow Yard, section rating, level validator, guard cap |
| Night Shift \| Sector Ops Build | desktop | Opus 5.5, high | Sector Ops (Saltmarsh Park), lighting on every map, visual gate |
| Night Shift \| Guard AI Build | laptop | Opus 5.5, high | `src/ai` on every map, coop4 |
| Night Shift \| Test Runner | laptop | Opus 5.5, medium | the laptop queue, flakes, guard render |
| Night Shift \| Cloud Builder \<k\> | cloud | as Michael starts it | briefs on the orphan branch `cloud-queue` (its README) |

Old names: CT Core Build = Player Build, Menu Notes Build = Marlow Build, Course Ready Build = Sector Ops Build,
Character Build = Test Runner.

**The orchestrator** runs the build. It alone edits `docs/ROADMAP.md` and `docs/orchestrator/` (on feature/menu),
triages the Inbox every cron run, plans and starts jobs (no job starts unless it is on the roadmap), gives an idle lead
its next feature, brings Michael decisions, writes the walk cards, keeps auto-train and the laptop queue moving
(failed trains, conflicts, stale claims), and folds ROADMAP "Decided" into `docs/DECISIONS.md` daily (a docs PR).
Master always holds every finished update: green trains merge without asking Michael; ask him when unsure. Its cron
prompt is in `docs/orchestrator/STATE.md`. Every other session messages it only when a PR opens or is train-ready, when
blocked, or when Michael is needed; progress goes in the job's STATE. A session that hears a new idea from Michael
sends it verbatim to the orchestrator, which adds it to the ROADMAP Inbox the same turn.

**Every session, at start.**
1. These rules (origin/master), then the session's resume block (BOOT.md says where it is).
2. Only the ROADMAP entries and BRIEF / PLAN / bible / `docs/systems/*` sections the resume block names: `grep` and
   line ranges, never whole large files.
3. Authority order (G86): Michael > `docs/DECISIONS.md` > `docs/design-bible.md` > job and map docs
   (`docs/level-design.md`, the map's documents) > these docs > code. Every decision is also written into the bible.

**Intake: idea to build.**
1. Michael's words go to the ROADMAP Inbox; the orchestrator triages them onto "Now" with an owner and a gate.
2. `BRIEF.md` keeps "Michael said" (verbatim quotes) apart from "Michael picked" (the option text he chose), then
   assumed decisions A1, A2, ... with how to undo each. An assumption that would loosen a Michael-only rule (hard
   rules, the level standard, scope, perf) is a one-click question to him by day, not an assumption.
3. An Opus `PLAN.md` with its claims: files, maps, wire and save paths, slices, sizes.
4. A fresh Opus plan checker (intent against Michael's words, gates, the claims) passes it before any build.
5. Maps and looks: before greybox or art on a map, or a big look change, Michael approves a one-page to-scale plan plus
   a 5-line intent check with one click (native multiple choice). A new map or map re-plan also passes the level
   validator (connectivity graph, `docs/level-design.md`) before greybox. At greybox exit a measured validator pass is
   required (`scripts/level-validate.mjs`, V6 `--require-measured`; until the flag is on master the greybox exit waits
   for it).
6. Build (below).

**Walk pacing.** At most 3 unwalked features per area (Player / animation, Marlow Yard, Sector Ops, Guard AI,
lighting); ROADMAP "Waiting on Michael" keeps the count. A lead at the cap works only on tests, fixes and automation.
Every release gets a 10-minute walk card from the orchestrator: risk-ranked, one acceptance line per item, look videos
for animation and lighting (each such PR carries a 1-2 min video path in its body). A flagged feature is switched on
when Michael accepts it. A lead under the cap with no PLAN slice left starts the next roadmap feature in its area with
an Opus plan; the orchestrator assigns it.

**A job.**
- Branch `feature/<job>` from origin/master in `C:/NightShift/Mobile-Coop-<job>` (G94). The plain folder
  `C:/NightShift/Mobile-Coop` stays on master: read and branch from it, never work in it. The branch guard
  (`docs/systems/agent-preamble.md`) runs before every write.
- `docs/<job>/`: `BRIEF.md`, `PLAN.md`, `STATE.md` (resume block on top, at most ~40 lines with exact file:line
  pointers; done list and history below it).
- The loop (`docs/systems/session-method.md`, G87): implementer, fresh checker, at most 1 fix round per slice. Opus
  plans, writes strict slice briefs, checks, and writes AI, animation, engine and `src/net` code; Sonnet 5.5 builds from
  strict Opus briefs (greybox, data, tests, wiring); Haiku 5.5 does chores (logs, STATE, fragments, renames). A Sonnet
  slice that fails its checker gets its fix round from Opus. One checker per batch of related slices; two independent
  Opus checkers on AI and `src/net` PRs; Sonnet may check greybox, data and dressing. An Opus triage agent takes every
  laptop failure at once.
- Agents commit and push each sub-step on their branch (path-limited, never `git add -A`), so a swap or cut-off loses
  at most the step in flight. Parallel agents work in their own worktrees (`feature/<job>-<slice>`) and never edit the
  same files; the lead merges them.
- PRs stay under ~1.5k changed lines or ~4 hours of work. Unfinished work merges dark behind a flag in
  `src/core/flags.ts`; each flag has an owner and a switch-on date (PR body and ROADMAP).
- The checker's verdict is a commit status on the checked head:
  `gh api repos/Tekcry/Mobile-Coop/statuses/<sha> -f state=success -f context=checker -f description="Opus PASS"`
  (`state=failure`, "FIX", for a fix list). The lead starts the fresh checker and the laptop request on the same head
  at once; a fix round reruns only what failed.
- Leads never merge master into their branch and never merge into master: the train does both.
- Unattended by default: assumed decisions are logged and the job carries on; ask Michael (native multiple choice) only
  before installing or downloading, when a hard rule blocks the goal, or as Intake step 2 says. Every question to
  Michael comes with its decision pack (prototype / screenshots / GPU sheets).
- Full burn: every independent slice of the PLAN runs in parallel now, up to desktop CPU ~80%. Opus briefs the next 2-3
  slices ahead (plans only, no speculative code). tsc / vitest-heavy builder slices may go to cloud builders through
  `cloud-queue`; a lead picks up a done brief within 1 hour or closes it. A lead's small and spare jobs ride one batch PR.
- Finish: the PR to master with its changelog fragment, the `train-ready` label once green (below). At the merge the
  job's answers from Michael move into `docs/DECISIONS.md` with the next free G numbers (G89).

**Getting to master** (G83: master is the live game and the only base).
- Train-ready = CI `check` green + `checker` success + the PR's suites green on the laptop queue, all on the PR head (a
  laptop result also counts for a later head whose only delta is docs, changelog fragments or test scripts). The lead
  adds the `train-ready` label; when auto mode blocks a laptop lead, the orchestrator verifies and adds it.
- Auto-train (scheduled task, 1-minute ticks, `docs/systems/auto-train.md`) builds `train/<n>` from labelled PRs with a
  green check, makes the version commit (fragments into `CHANGELOG.md`, the next version, the one `PROTOCOL_VERSION`
  bump when a member touches a wire path), and the queue runs one full e2e on the train head. CI and e2e green: it
  releases (merge, tag, `dev` moves `/preview/`, member PRs closed). Train N+1 may build on train N once overlap
  slice 4 is enabled (overlapping trains).
- A failing member leaves the train and the rest rerun (auto-drop); a desktop red is never final without a laptop rerun.
- A conflict is resolved in the train by the orchestrator: merge the branch by hand on the pre-version head
  (`git checkout -B train/<n> <version commit>^`) with the subject `Merge origin/<b> into train/<n>`,
  `git push --force origin train/<n>`, then rerun `node scripts/merge-train.mjs build <n> <version> "<title>" <all members> --keep`.

**Test tiers** (suite lists: `docs/systems/testing-tools.md`).
| Change | Runs | Where |
| --- | --- | --- |
| Docs only (`*.md`, `docs/**`) | CI `check` | - |
| An agent sub-step | `npm run typecheck:fast` + `npx vitest run <files>` | the agent's machine |
| A PR | CI `check` + the one or two suites its area names (`request.mjs --affected`; `node scripts/run-e2e.mjs --affected origin/master --list` names them); `src/net`, `src/player` or `src/game` add `e2e-coop` + `e2e-netmove`; a wire or save-shape change always runs them | laptop queue |
| Tuner / Anim Studio / tests only | CI `check` + the suites the change touches | laptop queue |
| A train | one full `npm run e2e` on the train head | laptop queue |
| Look or perf | `npm run e2e:gpu`, perf budgets, contact sheets, look videos; slot-alone measures right after a release | laptop 4189 (desktop under `heavy.lock`) |
- Every e2e run is `E2E_GPU=1` and a GPU failure counts; a software-GL rerun only tells a test-timing bug from a game
  bug. CI is `npm run check` only (software GL, no e2e). Cloud sessions run unit tests, logic e2e and design only.
- A crash or timeout mid-suite is not a pass. A suite that fails then passes on the same commit is a flake: its owner
  fixes the test in the next batch PR. KNOWN FLAKY suites (`docs/backlog.md`) never fail a run.

**Machines.** Two heavy slots, both Michael's PCs.
- Laptop (Test Runner, Guard AI): the main test machine. The laptop queue service (`scripts/laptop-queue`, branch
  `laptop-queue`) runs on 4189 (GPU and alone runs) and 4192: trains first, sharded across 4189 + 4192 at
  `E2E_JOBS=3` per slot (`LQ_TRAIN_JOBS`), then train reruns, PR requests (`E2E_JOBS=2`), then slot-alone measures. The two sessions keep its CPU under ~80%.
- Desktop (Orchestrator, Player, Marlow, Sector Ops): CPU target under ~80%; over 90% the orchestrator trims the
  heaviest session. Agents run tsc and single vitest files, never a full `npm run check` (CI runs it). The desktop runs
  e2e only as the queue's overflow worker (4191 / 4192, CPU and backlog gated; trains only while the laptop is silent),
  never by hand; its `heavy.lock` / `heavy2.lock` cover builds, Blender bakes and other heavy one-offs.
- Requests: `node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --suites "<suites>" --set <name>
  --requester "<title>"` (or `--alone --step "<cmd>"`); verdicts are `laptop-e2e/<set>` commit statuses. Withdraw a
  stale request; `docs/orchestrator/queue-audit.sh` flags them.
- Locks: `node scripts/heavy-lock.mjs take C:/NightShift/heavy.lock "<session> | <job>" --pid "$(cat /proc/$$/winpid)"`,
  the run, then `node scripts/heavy-lock.mjs release C:/NightShift/heavy.lock "<session> | <job>"` in the same shell
  command; per run, never held across a fix loop.
- Headless and invisible: never `E2E_HEADED`, no new terminal or console windows, no pointer lock or mouse capture,
  Blender only with `-b`, nothing that takes focus. Stop a runner with `taskkill /T /F` on its PID and check the tree is
  gone.

**Swaps and context.** Michael swaps accounts at 100% of whichever meter caps first, the 5-hour or the weekly (1% weekly
is about 6% of a 5-hour window). At ~92% the orchestrator refreshes `docs/orchestrator/HANDOFF.md` "State at the
switch" and gives Michael only the orchestrator boot line (PROMPTS.md section 1) as the last thing in a message; every
lead queues its next long runs and keeps its resume block current, and all keep working to 100%. At 100% with all
saved: "Safe to log out of the desktop and laptop". In the new account the orchestrator prints every other boot line
in one message (title, model, effort, machine). Sessions start fresh at each swap; a mid-window clear only past ~50%
context. Unused connectors (Gmail, Google Drive, Fergus) and plugins stay off in Night Shift sessions.

**Talking to Michael.** Short, plain replies; hyphens, not em dashes. Questions only as native multiple choice, by day,
when his answer changes the outcome; overnight, decide, log the assumption and carry on. A paste-in prompt names its
title, model and effort and is the turn's last message, never paired with a question. He tests through the menus: give
menu paths and the version label to expect. No polling turns: start long runs in the background and wait.

**Doc sizes.** Resume blocks ~40 lines; orchestrator STATE current state only; HANDOFF the newest block only; ROADMAP is
Now / Inbox / Waiting on Michael / Decided (today) / Done (last 10). History moves to archive files, never piles up.

**Branches and previews.** One branch per job, cut from master, one PR each. Pages serves the live game, `/preview/`
(master, through the pointer branch `dev`) and `/ct/` (through the pointer branch `ct-movement`); `dev` and
`ct-movement` are not work branches. Detail: `docs/systems/deploy.md`. Deleting a branch is Michael's call.

## Commands
- `npm run dev` - dev server
- `npm run editor` - Kestrel level editor (dev only, `docs/kestrel/editor.md`; Kestrel is paused, G53)
- `npm run build` - typecheck + production build into `dist/`
- `npm run typecheck:fast` - incremental tsc (cache in `node_modules/.cache`), for agents' repeat runs
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run check` - lint + tests + build (what CI and every job must pass). CI runs lint, test and build-check in parallel, with an aggregate `check` that fails unless all three pass
- `npm run e2e` - serves `dist/` and runs the required headless e2e suites as a desktop (pad, keyboard and mouse; G13),
  one browser each, `E2E_JOBS` at a time (default min(5, cores / 3); the laptop queue sets it). Needs a prior
  `npm run build`. `npm run e2e:serial` runs one at a time with live output (debugging).
- `npm run e2e:quick` - `smoke` plus the suites that cover the folders the change touched (working tree plus unpushed
  commits). Which change runs what: the test tiers in "Sessions".
- `npm run e2e:legacy` - the parked-content suites (Hunter / Mission, progression, cosmetics, Fallow, Kestrel, the
  Warehouse routes and archetypes); `npm run e2e:audio` - the audio suites; `npm run e2e:gpu` - the visual read-backs
  (laptop or desktop, never cloud). None of them is in the full run.
- Hardware GPU: `E2E_GPU=1` (ANGLE D3D11 on Windows, GPU blocklist ignored; `perf.mjs` then uses the local budget
  profile). Cloud sessions run software GL (the default), mark every GPU check "pending PC run" and never claim a perf
  or visual result from SwiftShader.
- Known-flaky suites (`docs/backlog.md`, "Flaky e2e suites": e2e-pad, parked) always run; their failures print as
  KNOWN FLAKY and do not fail the run. Any other failure does.
- Suites, helper scripts (`perf`, `soak`, `shot`, `anim-sheet`) and the debug overlay: `docs/systems/testing-tools.md`.
  `?autostart=<mapId>&mode=<mode>` boots straight into a match (dev and tests). Uses the preinstalled Chromium.
- Never run `npm run dev`, `npm run preview` or a watch mode from an agent; every shell command has a timeout.

Ports on Michael's PCs (G94). One runner per port at a time; jobs always pass `E2E_PORT`.

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

## Hard rules
- No runtime CDN or network dependency. All assets are bundled; Havok WASM is imported with `?url`.
- No external art, except CC0 textures for desktop detail, the CC0 base body of the operator pipeline (bible 5.14), and CMU motion-capture takes for the mocap set (converted clips bundled, raw files not committed, credited in `docs/art-credits.md`);
  operator and guard meshes are generated offline by in-repo scripts (Blender, headless) and bundled. CC0 recordings may be used for any sound (G58): bundled,
  never fetched at runtime, each source credited in `docs/audio-credits.md` (the score's samples in
  `docs/audio/samples.md`). WebAudio synthesis stays where it sounds better.
- Exception: the menu font Barlow Condensed (SIL OFL), bundled in `src/ui/fonts/` (menu-ui MD1).
- Import Babylon only through `src/core/babylon.ts`. Babylon 9 is tree-shaken and stubs methods whose
  side-effect module is missing (it warns: "requires a side-effect import"). Add the side-effect import there.
- Important data goes to IndexedDB (`src/save`). `localStorage` is never used for saves.
- Coop code lives in `src/net` and is only reached through a dynamic `import()` behind `flags.coop`.
  Single player must never import from `src/net` statically.
- Strict TS (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`: use `import type`).
- Every new map follows `docs/level-design.md` (the level design standard) and its spec starts from
  `docs/templates/map-spec.md`. A map spec may tighten the standard, never loosen it without Michael's written
  approval. The standard and the template change only with Michael's approval.
- Hot paths must not allocate (no closures, iterators or temporary vectors in AI / nav / anim loops); use `hyp2` / `hyp3`, never `Math.hypot` (`docs/systems/conventions.md`).
- Gameplay never reads graphics state: presets, LOD, the governor. It reads collision, occupancy, anchors, the light bake and the noise model only.
- Light parity: what the player sees, the light meter and guard perception must agree. One lighting system only.
- IP: CT's mechanics, visual style and HUD layout are copied closely; names, characters, organisations, story, logos,
  UI art, art assets, the goggle and the music are original (G5, G69). No reference-game character, gear or organisation
  names anywhere: code, UI, specs, docs, research notes (G6). "Chaos Theory" / "CT" may name the reference; Michael's
  quotes stay verbatim (G114). Never trace CT animation frame by frame.
- Desktop only (G12): no phone or touch work, except that a phone can launch the game for testing on the minimum
  settings and menus / HUD fit an iPad (G182). The Kestrel editor keeps its phone launcher with no new work (G15).
- Removed and parked systems (bible Section 6) get no new work; nothing is drawn as voxels.
- Story is text radio and subtitles now, every line written so it can be voiced later (G82).
- A job that changes an engine fact listed in `docs/level-design.md` Section 12 updates that section and lists the map decisions that relied on the old fact.

## Definition of done (every job)
- `npm run check` passes; the e2e runs of the test tiers ("Sessions") pass.
- Performance budgets pass (`docs/systems/performance.md`) for a job that touches rendering or hot paths.
- Pure logic lives in Babylon-free modules with Vitest tests; each new player-facing system extends the e2e suite that
  owns its area (a new suite only when none does).
- New or changed animations meet the bible's animation realism standard; the PR links a short look video.
- Docs updated: the changelog fragment, `TESTING.md` (the short desktop checklist, G92), the relevant `docs/systems/*.md`
  (the orchestrator updates `docs/ROADMAP.md`).
- Versions (G183): a job never edits `CHANGELOG.md` or `package.json`'s version; it writes its entries in one fragment
  `changes/<branch-with-dashes>.md` (`changes/README.md`; `kind: minor` for a game change, `kind: patch` for a fix,
  test or docs). The train build assembles the fragments and sets the next `4.MINOR.PATCH` (minor if any member is minor).
- A save-shape change bumps `SAVE_VERSION` with a migration and a test using a literal old save. A wire change does not bump
  `PROTOCOL_VERSION` and no test asserts its number (tests read the constant): the train build bumps it once (master + 1) when a member touches a wire path.
- Commit and push the job branch, open or update its PR to master, label it `train-ready` when green, report (done /
  not done, checks, open items), then STOP.

## Module map (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | Babylon import surface, engine, `GameLoop` (fixed 60 Hz sim), flags, `legacy` (parked modes), settings, quality / governor / display (pure parts) |
| `input/` | Action map; gamepad and keyboard / mouse sources write one `InputState`; bindings, remapping and conflicts |
| `ui/` | DOM overlay: screens, `FocusNav`, widgets, HUD, debug overlay |
| `game/` | `GameState`, modes (Infiltration, the campaign mode; Free Roam `sandbox`; Course mode `course` (Marlow Yard; Fallow parked) and its framework `course/`; Sector Ops; Hunter `clear` and Mission, parked), takedowns, gadgets, wall medkit stations, tactics |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller, movement, traversal and attach states, move state, camera |
| `anim/` | Pure animation: motion driver, clips, graph, foot planner, IK |
| `cover/` | Cover data for enemy AI and level build (coverData, corners); back-to-wall reuses it |
| `weapons/` | Data-driven weapons (the CT rifle and pistol, G76), ballistics, grenades, weapon carry (no aim assist, G16) |
| `ai/` | Enemy brains, nav grid, perception, alert states, patrols, archetypes |
| `world/` | Level builder, map builders, anchors, rooms, lights, light rig, doors, surfaces |
| `voxel/` | Light bakes (the folder name is history; nothing is drawn as voxels): lamp bake and light volume, moon / sky bake, canonical light shapes, the bake worker pool |
| `vfx/` | Pooled effects, post stack, TAAU, weather, silhouettes |
| `net/` | Co-op: transports, protocol, session, host and client sims, lobby UI |
| `operators/` | Wren and guard art assets (offline pipeline output, `scripts/operators/`) |
| `progression/`, `cosmetics/` | XP, unlocks, upgrades, suit / HQ; avatar catalogue (parked behind `?legacy=1`) |
| `save/`, `feedback/` | IndexedDB wrapper, schema, migrations; playtest notes and crash log |
| `audio/` | WebAudio mixer, synth voices, CC0 foley, weapon sounds and music |
| `editor/`, `security/`, `dev/` | Kestrel level editor and its security devices (dev only; Kestrel paused, G53); editor bridge |
| `pwa/`, `config/` | Service worker, fullscreen, gestures; JSON / TS content and feel tables |

## Doc index
| File | Covers | Read when |
| --- | --- | --- |
| `docs/DECISIONS.md` | Michael's decisions G1 onward, deferred and unanswered items | Any design or process question |
| `docs/design-bible.md` | Vision, pillars, systems, out-of-scope list, level and platform rules | Sections 0-3 and 6 every job; other sections when the job touches them |
| `docs/ROADMAP.md` (on origin/feature/menu) | Now, Inbox, Waiting on Michael, Decided, Done (owned by the orchestrator) | The entries a resume block names |
| `docs/orchestrator/` (on origin/feature/menu) | Orchestrator STATE, HANDOFF, PROMPTS (boot lines), BOOT (per-title start), archive | Starting a session, swaps |
| `docs/progress.md` | History and the older follow-up backlog | When planning a backlog item |
| `docs/backlog.md` | Feedback inbox, flaky e2e suites | Adding feedback, judging a test failure |
| `docs/story.md` | Story, setting, characters, radio and writing rules | Any in-game text, briefing or mission writing |
| `docs/level-design.md`, `docs/templates/map-spec.md`, `docs/design/scale-sheet.md` | The map standard (engine facts in Section 12), the map spec template, the size sheet | Any map or engine-fact change |
| `docs/ct-prototype/` | The CT prototype job: the training course Marlow Yard (`CTCOURSE-SPEC.md`), slices, playtests | The CT prototype and training-level work |
| `docs/sector-redesign/` | Sector Ops Saltmarsh Park: spec, slices, lighting | Sector Ops work |
| `docs/locomotion/` | History: the movement run, its CT research (`CT-RESEARCH.md`), the first prototype plan (`PROTOTYPE-PLAN.md`) | Only for movement history |
| `docs/consolidation/` | The consolidation run: audit, questions, Michael's answers, deletion logs | History of the 4.0.0 merge |
| `docs/operators/` | The operators run (feature/operators): Wren and Moth, the offline art pipeline (`scripts/operators/`), its decisions D1 onward (G75) | Operator art and Wren in-game work |
| `docs/training/` | History: the Fallow bunker run (parked behind `?legacy=1`) | Only if Fallow returns |
| `docs/process-audit/` | The 2026-10-19 process audit; `rules-history-2026-10-24.md`, the rule text before the 2026-10-24 rewrite | The origin of a rule |
| `docs/menu-ui/` | The Arkham Knight style menu plan (G77) | The menu job |
| `docs/audio/`, `docs/music/`, `docs/audio-credits.md` | Foley, weapon audio and music logs and plans; CC0 credits | Sound and music work |
| `docs/research/` | Night vision and lamp research | Vision and light work |
| `docs/kestrel/` | The Kestrel map project and editor (paused until after the CT co-op research, G53) | Kestrel work only |
| `docs/archive/ct-movement.md`, `docs/archive/ct-movement-progress.md` | The pre-prototype CT movement build (history; current rules: `docs/systems/movement.md`) | Only for movement history |
| `docs/prompts/` | Old phase specs (Phase 0-1) and the music spec (history) | Do not read unless a job names them |
| `docs/archive/` | Retired maps, old changelog, testing and progress history | Do not read |
| `TESTING.md` | The short desktop checklist and the release checklist | Ending a job |
| `docs/systems/testing-tools.md` | Every e2e suite, helper scripts, debug overlay | Running or writing tests |
| `docs/systems/auto-train.md`, `docs/laptop-queue/PLAN.md` | Auto-train (rolling merge trains) and the laptop test queue | Trains, test requests |
| `docs/systems/deploy.md` | Branches and the Pages slots | Releases, preview builds |
| `docs/systems/session-method.md`, `docs/systems/agent-preamble.md` | The job lead's loop (implementer, checker, fix round, prompts); the shared subagent preamble | Running a job or writing its prompts |
| `docs/systems/input-and-loop.md` | Game loop, actions, pad and keyboard bindings | Input work |
| `docs/systems/ui.md` | HUD, menus, display, feedback, photo mode | UI work |
| `docs/systems/world-and-characters.md` | Maps, level builder, the shared character rig | Maps, rig, animation |
| `docs/systems/movement.md` | Movement, camera, traversal anchors, back-to-wall | Movement work |
| `docs/systems/ct-toolkit.md` | The CT toolkit spec (gadgets, pistol disruptor, optic cable); CT's set is settled by the research (G76) | Gadget and toolkit work |
| `docs/systems/lighting.md` | Light registry, baked lamps, lamp volume | Light work |
| `docs/systems/ai.md` | Perception, alert states, archetypes, nav grid, mode hooks | AI work |
| `docs/systems/takedowns.md` | Takedowns, grab, palm strike | Takedown work |
| `docs/systems/gadgets.md` | Gadgets, wheel, remote views | Gadget work |
| `docs/systems/modes-and-progression.md` | Infiltration, Hunter, arsenal / suit / HQ, cosmetics (parked) | Mission framework |
| `docs/systems/saves.md` | Progression maths, save schema, migrations | Any save change |
| `docs/systems/combat.md` | Weapon data, firing, damage | Weapon work |
| `docs/systems/coop.md` | Transports, host / client sims, sync, team moves | Co-op work |
| `docs/systems/audio.md` | Audio engine, foley, weapon sounds, music | Sound work |
| `docs/systems/graphics-quality.md` | Presets, governor, renderer, TAAU, weather | Render work |
| `docs/systems/performance.md` | Frame, CPU, draw and memory budgets; perf script budgets | Every job end |
| `docs/systems/conventions.md` | Robustness rules, conventions, full module table, hot paths, project overview | Code conventions |
