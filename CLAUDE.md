# Night Shift - architecture and conventions

Project knowledge lives in git, never only in Claude memory: Michael swaps accounts. Record decisions, plans and follow-ups in the repo docs.

- Night Shift (renamed from Silent But Deadly) is an original third-person stealth game. It is pure Chaos Theory (CT):
  CT's mechanics, timing, camera, HUD layout and visual style are the authority; anything that is not in CT does not
  exist (G1, G5). Hunter is the one non-CT mode kept, parked behind `?legacy=1` (G7). Light and shadow is the core.
- A 2-player co-op campaign only: it cannot be completed solo; no bot partner, no 3-4 player play (G2, G48, G50).
  The CT co-op levels are researched and that experience is recreated (G3).
- Work order: the CT co-op research, then the CT prototype, then the rest (G95). Prototype first: only the basics
  needed to test a feature; refinement later (G4). The roadmap (now, next, waiting on Michael) is `docs/ROADMAP.md`.

## Current goal (Michael, 2026-10-19) - every job and session, overrides slower wording elsewhere
A fully functional 2-player co-op training level, playable end to end, as soon as possible:
- Wren as the character for both players, with basic animations.
- Basic weapons: Blender scratch builds, realistic at a glance but quick.
- All co-op moves and the required CT moves; lights and shadows working (light parity).
- Pure CT (G1, `docs/ct-research`, G124-G160) except Michael's recorded decisions, including a Blacklist-style
  selection wheel for weapons, gadgets and vision modes (no time slow).
- A visual pass comes last, to make it prettier.

Do not spend time refining (feel tuning, animation polish, perf tuning, detail art) until Michael has playtested the
core gameplay loop. Checkers block only on broken or unplayable work; cosmetic notes go on a polish list in the job's
docs. At most 1 fix round per slice unless the work is broken. Tests follow the tiers in "Sessions". This holds
until Michael lifts it.
- A PWA (Vite + TypeScript + Babylon.js 9 + Havok) on GitHub Pages, desktop only: pad first, then keyboard and mouse (G12).
- Michael's decisions: `docs/DECISIONS.md` (G1, G2, ...). Design: `docs/design-bible.md`. Story and in-game text: `docs/story.md`.
- The co-op training level is Marlow Yard (map `ctcourse`, Course mode, `?autostart=ctcourse&mode=course`; CT prototype
  B1, `docs/ct-prototype/`). Fallow (map `bunker`, `docs/training/`) is parked behind `?legacy=1`.
- The internal ids keep the old name (IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id).

## Sessions (process audit, approved by Michael 2026-10-19)
The only place for session, job, machine and test rules. `docs/systems/session-method.md` details the job lead's loop;
`docs/ROADMAP.md` is state only (now, next, waiting on Michael, done).

**The orchestrator.** One session, "Night Shift | Orchestrator", runs the whole build: it owns `docs/ROADMAP.md` (the
only session that edits it), plans and starts jobs, reviews PRs and merges green ones into master (Michael, 2026-10-19:
"you can merge automatically without my permission. Just remember that i want to maintain the master as the most up to
date version with all updates, but you can ask if you arent sure"; when auto mode blocks the merge, Michael merges),
sets the version at the merge (G183), moves `/preview/`, and keeps every session in step. Master always holds every
finished update; the orchestrator asks Michael when unsure. Every other session messages it when it starts,
finishes a slice, opens a PR, needs Michael, or is blocked. No job starts unless it is on the roadmap. "Orchestrator"
means this session only; the session running a job is its **job lead**.

**Every session.**
1. Read this file.
2. Read `docs/ROADMAP.md`.
3. In a job: read the job's `STATE.md` and `BRIEF.md` (`docs/<job>/`), then only the bible sections, `docs/systems/*`
   sections and files they name. Use `grep` and line ranges, not whole large files.
4. Authority order (G86): Michael > `docs/DECISIONS.md` > `docs/design-bible.md` > job and map docs (`docs/level-design.md`,
   the map's documents) > these docs > code. Every decision is also written into the bible.

**Main test machine: the laptop** (Michael, 2026-10-22 ~17:50: "Laptop main"; "Yes, laptop GPU"; the laptop's CPU and
GPU are far stronger, and the desktop sits near 99% CPU running every session's agents). This overrides the older
machine wording below: full runs, merge trains, `e2e-coop` / `e2e-netmove` / `e2e-ctcourse` and GPU or visual work
(anim-audit, anim-sheet, shots, `E2E_GPU=1` suites, port 4189) go to Character Build on the laptop (Normal priority,
`E2E_JOBS=5` for full runs and trains (Michael 2026-10-23 ~00:10 "Yes, if clean": 316 s vs ~490 s at 3; back to 3 the first time 5 causes a failure), its own `heavy.lock`). The desktop runs only quick single suites at `E2E_JOBS=1` under its lock, and the
sessions' agents. Job leads send run requests (branch, commit, suites) to Character Build, not the desktop lock.

**GPU for logic e2e** (Michael, 2026-10-22 ~20:30: "use gpu on any tests that would benefit"; overrides the
software-GL wording below and in "Commands"): both machines run logic e2e with `E2E_GPU=1` (hardware GPU), which is
4-14x faster than software GL and keeps CPU free. Measured on 4.58.0 on the desktop, GPU vs software: e2e-mouse 35 s vs
225 s, e2e-menus 61 s vs ~13 min, e2e-coop 74 s vs ~10 min; laptop GPU full run 585 s vs 2025 s in software.
Always GPU (Michael, 2026-10-22 ~21:10: "Shouldn't we always use gpu"): every e2e run is `E2E_GPU=1`; a GPU failure
counts (fix the test or the game). A software rerun is optional, only to tell a timing bug in the test from a game
bug. CI stays software GL (`npm run check` only, no e2e). Ports stay as in the table; a GPU logic run may use 4191 / 4192.
Desktop second lane (2026-10-22 21:06, a GPU run left the desktop at ~40% CPU): a second GPU-only e2e run may start
under `C:/NightShift/heavy2.lock` (same atomic create and release rules) on port 4192, `E2E_GPU=1`, `E2E_JOBS=1`,
only while desktop CPU is under 50% at the start. Full `npm run check` and any software run keep the single `heavy.lock`.

**Machines** (Michael, 2026-10-19; 2026-10-21 16:40: "i dont care about usage on the desktop, i use the laptop": the desktop is the main test machine at full power, full e2e there with E2E_JOBS=2; the laptop is overflow only, BelowNormal, E2E_JOBS=1). Two heavy slots. CPU or GPU heavy work (e2e, full test runs, builds in loops, GPU
shots, Blender, heavy subagents) runs on the desktop (orchestrator, CT Core and the other desktop job leads), the main
slot, or on the laptop (Character Build), the second slot, which Michael is still using: there at BelowNormal priority
and `E2E_JOBS=1`, so it never takes all his bandwidth, and never GPU or visual checks. One heavy job at a time per
machine (a full `npm run check` or full `vitest run` counts as heavy; a single test file does not; 2026-10-22, after
a full e2e ran at twice its time beside unlocked checks): before a heavy run, check that machine's `C:/NightShift/heavy.lock`; if absent, write "<session> | <job> |
<start>" and delete it when done; if present, wait and do light work. Create it atomically, never overwrite it (2026-10-22, after collisions): `( set -o noclobber; echo "<session> | <job> | <start>" > C:/NightShift/heavy.lock )`, retry while it fails, and delete it only while it still names you. All work on both machines is headless and
invisible (Michael: "dont allow my mouse to be taken or random windows terminals to be made, all works must be headless
and it shouldnt affect me"): never `E2E_HEADED`, no new terminal or console windows, no pointer lock or mouse capture,
Blender only with `-b`, nothing that takes focus. The orchestrator sets the order.

**The laptop is the test runner** (Michael, 2026-10-19). When the desktop's `heavy.lock` is held, a desktop job lead
does not wait: it pushes its branch and messages Character Build (bridge address in `docs/orchestrator/STATE.md`) with
the branch, the commit and the suites to run (named suites, not `e2e:quick`, which reads local changes). Character
Build runs them on the laptop in its own worktree `C:/NightShift/Mobile-Coop-testrun`, detached at that commit
(`npm ci` only when `package-lock.json` changed), with `E2E_PORT=4191`, `E2E_JOBS=1`, BelowNormal and the laptop's
`heavy.lock`, one request at a time, in the roadmap's priority order, then by arrival. It replies to the job lead with pass / fail per suite, the
failing assert and the run time, and copies the orchestrator. Logic e2e only: GPU, perf and visual checks stay on the
desktop. A result counts for the test tier only for the exact commit it ran on, or for a later commit whose only
difference is docs, `CHANGELOG.md`, changelog fragments or test scripts (Michael, 2026-10-22 ~18:00). The laptop runs
two requests at once, one per port (4191 and 4192; GPU on 4189), each with its own lock file, but at most ONE full run (`npm run e2e`, a train) at a time: the other slots take single suites (2026-10-22, after overlapping full runs timed out). Between requests Character Build works
its own small jobs from the roadmap. Cloud sessions run unit tests,
logic e2e and design only; every GPU check there is "pending PC run".

**A job.**
- Start from master: branch `feature/<job>` in the folder `C:/NightShift/Mobile-Coop-<job>` (G94). The plain folder
  `C:/NightShift/Mobile-Coop` stays on master: read and branch from it, never work in it.
- Branch guard before every command that writes, in every agent:
  `cd /c/NightShift/Mobile-Coop-<job> && test "$(git rev-parse --abbrev-ref HEAD)" = feature/<job> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-<job>"`.
- The job lead builds a quick prototype first when the job needs a feel or look decision (G4), then runs the loop in
  `docs/systems/session-method.md` (G87): an implementer, a fresh checker, at most 1 fix round per slice while the
  current goal holds. Opus builds and checks; a lighter model only for mechanical chores (G88). Subagents start from
  `docs/systems/agent-preamble.md`.
- Three files in `docs/<job>/`:
  - `BRIEF.md`: the ask with Michael's words, the goal and limits; Michael's answers M1, M2, ... and assumed decisions
    A1, A2, ... with how to undo.
  - `PLAN.md`: the steps or slices (multi-step jobs only).
  - `STATE.md`: the resume point (now, next, open), a dated done list, and the resume prompt in one fenced block.

  Jobs started before 2026-10-19 keep their older files as history.
- Unattended by default: assumed decisions are logged and the job carries on; ask Michael (native multiple choice) only
  before installing or downloading, or when a hard rule blocks the goal.
- Finish: one PR to master; the orchestrator reviews and merges it (or Michael). At the merge the job's answers from
  Michael move into `docs/DECISIONS.md` with the next free G numbers (G89) and the orchestrator marks the job done in
  `docs/ROADMAP.md`.

**Test tiers** (detail and the suite lists: `docs/systems/testing-tools.md`).
| Change | Runs | Where |
| --- | --- | --- |
| Docs only (`*.md`, `docs/**`) | nothing; CI's `npm run check` on the PR is enough | any machine |
| A step | `npm run check` once at the step's end + the suites the step names, or `npm run e2e:quick` | desktop, or the laptop test runner when the desktop lock is held |
| A slice (a playtestable batch pushed to a preview) | `e2e:quick` + `e2e-ctcourse`, plus `e2e-coop` / `e2e-netmove` when `src/net`, `src/player` or `src/game` changed | desktop, or the laptop test runner on the pushed commit |
| A PR touching only the tuner / Anim Studio (`src/ui/animTune*`, studio files) or tests (Michael, 2026-10-22) | CI `check` + the suites the change touches (e2e-anim, e2e-studio, or the edited suite) | desktop or laptop |
| Merge train (Michael, 2026-10-22: "Batch when 2+ ready"; ~18:00 "Your picks") | a PR whose fresh checker passed goes straight into the next train with CI `check` only; a PR touching `src/net`, `PROTOCOL_VERSION` or the save shape first passes the suites its area names (the slice row); a failure in the train is narrowed down to its PR there; when 2+ are ready the orchestrator merges them into one `train/<n>` branch off master (no src conflicts; a PR with one waits for the next train) and runs ONE full `npm run e2e` there; on a pass the train merges as ONE PR with one version (minor if any PR in it is a minor; the CHANGELOG heading names every PR, each PR's entries under it) and GitHub marks the member PRs merged (Michael, 2026-10-22: "One PR per batch"); on a failure the failing suite's PR leaves the train and the rest rerun that suite only | desktop or laptop, whichever is free |
| Any other PR / merge to master (a lone PR when nothing else is ready) | the full `npm run e2e` once on the PR head (`E2E_JOBS=2`, nothing else running) + CI `check`; after the merge nothing more unless a conflict fix touched `src/` (then quick) | desktop, or the laptop test runner (`E2E_JOBS=1`, slower) when the desktop is busy |
| Visual or perf work | `npm run e2e:gpu`, perf budgets, contact sheets | Michael's PC only |

**Branches and previews.** Master is the live game and the only base (G83): one branch per job, cut from master, one
PR each. Pages serves the live game, `/preview/` (master, through the pointer branch `dev`) and `/ct/` (the active
prototype branch, through the pointer branch `ct-movement`, moved by that job); `dev` and `ct-movement` are not work
branches. Detail: `docs/systems/deploy.md`. Deleting a branch is Michael's call.

## Commands
- `npm run dev` - dev server
- `npm run editor` - Kestrel level editor (dev only, `docs/kestrel/editor.md`; Kestrel is paused, G53)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run check` - lint + tests + build (what CI and every job must pass)
- `npm run e2e` - serves `dist/` and runs the required headless e2e suites as a desktop (pad, keyboard and mouse; G13),
  one browser each, `E2E_JOBS` at a time (default min(5, cores / 3); use `E2E_JOBS=2` on Michael's PC and cloud VMs, G94).
  Needs a prior `npm run build`. `npm run e2e:serial` runs one at a time with live output (debugging).
- `npm run e2e:quick` - `smoke` plus the suites that cover the folders the change touched (working tree plus unpushed
  commits). Which change runs what: the test tiers in "Sessions".
- `npm run e2e:legacy` - the parked-content suites (Hunter / Mission, progression, cosmetics, Fallow, Kestrel, the
  Warehouse routes and archetypes); `npm run e2e:audio` - the audio suites; `npm run e2e:gpu` - the visual read-backs
  (Michael's PC only, `E2E_GPU=1`). None of them is in the full run.
- GPU testing runs on Michael's PC only. Graphical and performance testing (perf budgets, contact sheets, visual parity
  and probe checks, beauty shots) runs there with `E2E_GPU=1` (hardware GPU: ANGLE D3D11 on Windows, GPU blocklist
  ignored; `perf.mjs` then uses the local budget profile). Cloud sessions run unit tests and logic e2e only (software GL,
  the default) and mark every GPU check "pending PC run"; they never claim a perf or visual result from SwiftShader.
- Known-flaky suites (`docs/backlog.md`, "Flaky e2e suites": e2e-pad, parked) always run; their failures print as
  KNOWN FLAKY and do not fail the run. Any other failure does.
- Suites, helper scripts (`perf`, `soak`, `shot`, `anim-sheet`) and the debug overlay: `docs/systems/testing-tools.md`.
  `?autostart=<mapId>&mode=<mode>` boots straight into a match (dev and tests). Uses the preinstalled Chromium.
- Never run `npm run dev`, `npm run preview` or a watch mode from an agent; every shell command has a timeout.

Ports on Michael's PC (G94). One runner per port at a time; jobs always pass `E2E_PORT`.

| Port | Use |
| --- | --- |
| 4191 | Software-GL logic e2e: `E2E_PORT=4191 E2E_JOBS=2 npm run e2e` (or `e2e:quick`, single suites); never with `E2E_GPU=1` |
| 4192 | The laptop's second logic e2e queue (same rules as 4191) |
| 4189 | GPU work: perf, perf-trend, anim-audit, anim-sheet, shot, `E2E_GPU=1` suites |
| 4179, 4173 | Script defaults (`run-e2e.mjs`, `e2e-lib.mjs`); not used by jobs |
| 5199 | `npm run editor` |

Free a port before and after each run (replace 4191 with the port):
`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`,
then `netstat -ano | grep ":4191 .*LISTENING"` must print nothing. The runner starts and stops its own server.

## Hard rules
- No runtime CDN or network dependency. All assets are bundled; Havok WASM is imported with `?url`.
- No external art, except CC0 textures for desktop detail, the CC0 base body of the operator pipeline (bible 5.14), and CMU motion-capture takes for the mocap set (Michael 2026-10-22 ~20:45 mocap-trial, 2026-10-23 ~00:15 "Yes, download them"; converted clips bundled, raw files not committed, credited in `docs/art-credits.md`);
  operator meshes are generated offline by in-repo scripts (Blender, headless) and bundled. CC0 recordings may be used for any sound (G58): bundled,
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
- Gameplay never reads graphics state: presets, LOD, voxel layers, the governor. It reads collision, occupancy, anchors, the light bake and the noise model only.
- Light parity: what the player sees, the light meter and guard perception must agree.
- IP: CT's mechanics, visual style and HUD layout are copied closely; names, characters, organisations, story, logos,
  UI art, art assets, the goggle and the music are original (G5, G69). No reference-game character, gear or organisation
  names anywhere: code, UI, specs, docs, research notes (G6). "Chaos Theory" / "CT" may name the reference; Michael's
  quotes stay verbatim (G114).
- Desktop only (G12): no phone or touch work, except that a phone can launch the game for testing on the minimum
  settings (G182). The Kestrel editor keeps its phone launcher with no new work (G15).
- Removed and parked systems (bible Section 6) get no new work.
- Story is text radio and subtitles now, every line written so it can be voiced later (G82).
- A job that changes an engine fact listed in `docs/level-design.md` Section 12 updates that section and lists the map decisions that relied on the old fact.

## Definition of done (every job)
- `npm run check` passes; the e2e runs of the test tiers ("Sessions") pass.
- Performance budgets pass (`docs/systems/performance.md`, desktop) for a job that touches rendering or hot paths; the
  others skip them until Michael lifts the no-refining rule.
- Pure logic lives in Babylon-free modules with Vitest tests; each new player-facing system extends the e2e suite that
  owns its area (a new suite only when none does).
- New or changed animations match the CT footage (G1) and meet the bible's animation realism standard.
- Docs updated: the changelog fragment, `TESTING.md` (the short desktop checklist, G92), the relevant `docs/systems/*.md`
  (the orchestrator updates `docs/ROADMAP.md`).
- Versions (G183): a job never edits `CHANGELOG.md`; it writes its entries in one fragment `changes/<branch-with-dashes>.md`
  (`changes/README.md`), which the orchestrator assembles into `CHANGELOG.md` at the version step
  (`scripts/changelog-assemble.mjs`, or `scripts/merge-train.mjs`). Every merge to master gets
  the next `4.MINOR.PATCH`, set by the orchestrator in the PR just before it merges: a job or feature (game change) is a
  minor step, a fix or docs-only merge a patch. Jobs never bump `package.json` themselves.
- A save-shape change bumps `SAVE_VERSION` with a migration and a test using a literal old save. A wire change bumps
  `PROTOCOL_VERSION` and the tests that assert it.
- Commit and push the job branch, open or update its PR to master, report (done / not done, checks, open items), then STOP.

## Module map (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | Babylon import surface, engine, `GameLoop` (fixed 60 Hz sim), flags, `legacy` (parked modes), settings, quality / governor / display (pure parts) |
| `input/` | Action map; gamepad and keyboard / mouse sources write one `InputState`; bindings, remapping and conflicts |
| `ui/` | DOM overlay: screens, `FocusNav`, widgets, HUD, debug overlay |
| `game/` | `GameState`, modes (Infiltration, the campaign mode; Free Roam `sandbox`; Course mode `course` (Marlow Yard; Fallow parked) and its framework `course/`; Hunter `clear` and Mission, parked), takedowns, gadgets, wall medkit stations, tactics |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller, movement, traversal and attach states, move state, camera |
| `anim/` | Pure animation: motion driver, clips, graph, foot planner, IK |
| `cover/` | Cover data for enemy AI and level build (coverData, corners); back-to-wall reuses it |
| `weapons/` | Data-driven weapons (the CT rifle and pistol, G76), ballistics, grenades, weapon carry (no aim assist, G16) |
| `ai/` | Enemy brains, nav grid, perception, alert states, patrols, archetypes |
| `world/` | Level builder, map builders, anchors, rooms, lights, light rig, doors, surfaces |
| `voxel/` | Voxel level, characters and weapons, lamp bake and light volume, sky bake |
| `vfx/` | Pooled effects, post stack, TAAU, weather, silhouettes |
| `net/` | Co-op: transports, protocol, session, host and client sims, lobby UI |
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
| `docs/ROADMAP.md` | Now, next, waiting on Michael, done (owned by the orchestrator) | Every session |
| `docs/progress.md` | History and the older follow-up backlog | When planning a backlog item |
| `docs/backlog.md` | Feedback inbox, flaky e2e suites | Adding feedback, judging a test failure |
| `docs/story.md` | Story, setting, characters, radio and writing rules | Any in-game text, briefing or mission writing |
| `docs/level-design.md`, `docs/templates/map-spec.md`, `docs/design/scale-sheet.md` | The map standard (engine facts in Section 12), the map spec template, the size sheet | Any map or engine-fact change |
| `docs/ct-prototype/` | The CT prototype job: the training course Marlow Yard (`CTCOURSE-SPEC.md`), slices, playtests | The CT prototype and training-level work |
| `docs/locomotion/` | History: the movement run, its CT research (`CT-RESEARCH.md`), the first prototype plan (`PROTOTYPE-PLAN.md`) | Only for movement history |
| `docs/consolidation/` | The consolidation run: audit, questions, Michael's answers, deletion logs | History of the 4.0.0 merge |
| `docs/operators/` | The operators run (feature/operators): Wren and Moth, the offline art pipeline (`scripts/operators/`), its decisions D1 onward (G75) | Operator art and Wren in-game work |
| `docs/training/` | History: the Fallow bunker run (parked behind `?legacy=1`) | Only if Fallow returns |
| `docs/process-audit/` | The 2026-10-19 process audit: report, approved changes | Questions about the test lists or these rules |
| `docs/menu-ui/` | The Arkham Knight style menu plan (G77) | The menu job |
| `docs/audio/`, `docs/music/`, `docs/audio-credits.md` | Foley, weapon audio and music logs and plans; CC0 credits | Sound and music work |
| `docs/research/` | Night vision and lamp research | Vision and light work |
| `docs/kestrel/` | The Kestrel map project and editor (paused until after the CT co-op research, G53) | Kestrel work only |
| `docs/archive/ct-movement.md`, `docs/archive/ct-movement-progress.md` | The pre-prototype CT movement build (history; current rules: `docs/systems/movement.md`) | Only for movement history |
| `docs/prompts/` | Old phase specs (Phase 0-1) and the music spec (history) | Do not read unless a job names them |
| `docs/archive/` | Retired maps, old changelog, testing and progress history | Do not read |
| `TESTING.md` | The short desktop checklist and the release checklist | Ending a job |
| `docs/systems/testing-tools.md` | Every e2e suite, helper scripts, debug overlay | Running or writing tests |
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
| `docs/systems/graphics-quality.md` | Presets, governor, renderer, voxels, TAAU, weather | Render work |
| `docs/systems/performance.md` | Frame, CPU, draw and memory budgets; perf script budgets | Every job end |
| `docs/systems/conventions.md` | Robustness rules, conventions, full module table, hot paths, project overview | Code conventions |
