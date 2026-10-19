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
docs. At most 1 fix round per slice unless the work is broken. Quick e2e per slice, the full e2e at the PR. This holds
until Michael lifts it.
- A PWA (Vite + TypeScript + Babylon.js 9 + Havok) on GitHub Pages, desktop only: pad first, then keyboard and mouse (G12).
- Michael's decisions: `docs/DECISIONS.md` (G1, G2, ...). Design: `docs/design-bible.md`. Story and in-game text: `docs/story.md`.
- Fallow (map `bunker`, `src/world/maps/bunker*.ts`, run docs `docs/training/`) is the co-op tutorial bunker and the
  only training (G78, G111): course mode, `?autostart=bunker&mode=course`.
- The internal ids keep the old name (IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id).

## Orchestrator (Michael, 2026-10-19)
One session, "Night Shift | Orchestrator", orchestrates the whole build: it owns `docs/ROADMAP.md` (the only session that
edits it), plans and starts jobs, reviews and merges PRs into master (Michael: "You have my approval to merge yourself as
needed"), moves `/preview/`, and keeps every session in step. Every other session messages the orchestrator when it
starts, finishes a slice, opens a PR, needs Michael, or is blocked. No job starts unless it is on the roadmap.

## Every session
1. Read this file.
2. Read `docs/ROADMAP.md` (what is happening now, what is next, what waits on Michael).
3. In a job: read the job's `RULES.md` and `STATE.md` (`docs/<job>/`), then only the bible sections, `docs/systems/*`
   sections and files they name. Use `grep` and line ranges, not whole large files.
4. Authority order (G86): Michael > `docs/DECISIONS.md` > `docs/design-bible.md` > job and map docs (`docs/level-design.md`,
   the map's documents) > these docs > code. Every decision is also written into the bible.

## Running a job
- Every multi-step job (code, map, audio, art, research) builds a quick prototype first when it needs a feel or look
  decision, then runs the orchestrator method (G87): `docs/systems/session-method.md` (roles, loop, job docs, prompts).
- Opus builds and checks; a lighter model only for mechanical chores (G88).
- Start from master: branch `feature/<job>` in the folder `C:/NightShift/Mobile-Coop-<job>` (G94). The plain folder
  `C:/NightShift/Mobile-Coop` stays on master: read and branch from it, never work in it.
- Branch guard before every command that writes, in every agent:
  `cd /c/NightShift/Mobile-Coop-<job> && test "$(git rev-parse --abbrev-ref HEAD)" = feature/<job> && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-<job>"`.
- The job's docs live in `docs/<job>/`: BRIEF, RULES, PLAN, STATE (resume point), LOG, DECISIONS (Michael's words; assumed
  decisions A1, A2, ... with how to undo), OWNER-NOTES (start and resume prompts).
- Tests: the port table below, one runner per port; `npm run e2e:quick` per step, the full `npm run e2e` before the PR.
  GPU checks only on Michael's PC; elsewhere they are "pending PC run".
- Unattended by default: assumed decisions are logged and the job carries on; ask Michael (native multiple choice) only
  before installing or downloading, or when a hard rule blocks the goal.
- Finish: one PR to master; the orchestrator reviews and merges it (or Michael). At the merge the job's answers from
  Michael move into `docs/DECISIONS.md` with the next free G numbers (G89) and the orchestrator marks the job done in
  `docs/ROADMAP.md`.

## Branches
- Master is the live game and the only base (G83). One branch per job, cut from master, one PR each; the orchestrator session or Michael merges.
  `ct-movement` and `dev` are retired.
- Pages: the live game plus one preview slot that shows the job branch Michael chooses (G85). Detail: `docs/systems/deploy.md`.

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
  commits). **Steps use the quick run; the full `npm run e2e` runs at the end of a job, before its PR.**
- `npm run e2e:legacy` - the suites for parked content (Hunter, progression, cosmetics; report only)
- GPU testing runs on Michael's PC only. Graphical and performance testing (perf budgets, contact sheets, visual parity
  and probe checks, beauty shots) runs there with `E2E_GPU=1` (hardware GPU: ANGLE D3D11 on Windows, GPU blocklist
  ignored; `perf.mjs` then uses the local budget profile). Cloud sessions run unit tests and logic e2e only (software GL,
  the default) and mark every GPU check "pending PC run"; they never claim a perf or visual result from SwiftShader.
- Known-flaky suites (`docs/backlog.md`, "Flaky e2e suites") always run; their failures print as KNOWN FLAKY and do not
  fail the run. Any other failure does.
- Suites, helper scripts (`perf`, `soak`, `shot`, `anim-sheet`) and the debug overlay: `docs/systems/testing-tools.md`.
  `?autostart=<mapId>&mode=<mode>` boots straight into a match (dev and tests). Uses the preinstalled Chromium.
- Never run `npm run dev`, `npm run preview` or a watch mode from an agent; every shell command has a timeout.

Ports on Michael's PC (G94). One runner per port at a time; jobs always pass `E2E_PORT`.

| Port | Use |
| --- | --- |
| 4191 | Software-GL logic e2e: `E2E_PORT=4191 E2E_JOBS=2 npm run e2e` (or `e2e:quick`, single suites); never with `E2E_GPU=1` |
| 4189 | GPU work: perf, perf-trend, anim-audit, anim-sheet, shot, `E2E_GPU=1` suites |
| 4179, 4173 | Script defaults (`run-e2e.mjs`, `e2e-lib.mjs`); not used by jobs |
| 5199 | `npm run editor` |

Free a port before and after each run (replace 4191 with the port):
`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4191 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`,
then `netstat -ano | grep ":4191 .*LISTENING"` must print nothing. The runner starts and stops its own server.

## Hard rules
- No runtime CDN or network dependency. All assets are bundled; Havok WASM is imported with `?url`.
- No external art, except CC0 textures for desktop detail and the CC0 base body of the operator pipeline (bible 5.14);
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
- Desktop only: no phone or touch work (G12). The Kestrel editor keeps its phone launcher with no new work (G15).
- Removed and parked systems (bible Section 6) get no new work.
- Story is text radio and subtitles now, every line written so it can be voiced later (G82).
- A job that changes an engine fact listed in `docs/level-design.md` Section 12 updates that section and lists the map decisions that relied on the old fact.

## Definition of done (every job)
- `npm run check` passes; the e2e suites the job names pass, and the full required suite (`npm run e2e`) passes before the PR.
- Performance budgets pass (`docs/systems/performance.md`, desktop).
- Pure logic lives in Babylon-free modules with Vitest tests; each new player-facing system has an e2e suite or extends one.
- New or changed animations match the CT footage (G1) and meet the bible's animation realism standard.
- Docs updated: `CHANGELOG.md`, `TESTING.md` (the short desktop checklist, G92), the relevant `docs/systems/*.md`,
  `docs/progress.md` (job list).
- Versions (G93): a job's CHANGELOG entries sit under "Unreleased - <job> (feature/<job>)" until Michael merges it; each
  merged job is one minor step (4.1.0, 4.2.0, ...), a fix is a patch. The version in `package.json` and the heading are
  set in the job's last commit when Michael says he is merging.
- A save-shape change bumps `SAVE_VERSION` with a migration and a test using a literal old save. A wire change bumps
  `PROTOCOL_VERSION` and the tests that assert it.
- Commit and push the job branch, open or update its PR to master, report (done / not done, checks, open items), then STOP.

## Module map (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | Babylon import surface, engine, `GameLoop` (fixed 60 Hz sim), flags, `legacy` (parked modes), settings, quality / governor / display (pure parts) |
| `input/` | Action map; gamepad and keyboard / mouse sources write one `InputState`; bindings, remapping and conflicts |
| `ui/` | DOM overlay: screens, `FocusNav`, widgets, HUD, debug overlay |
| `game/` | `GameState`, modes (Infiltration, the campaign mode; Free Roam `sandbox`; the Fallow `course` and its framework `course/`; Hunter `clear` and Mission, parked), takedowns, gadgets, wall medkit stations, tactics |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller, movement, traversal and attach states, move state, camera |
| `anim/` | Pure animation: motion driver, clips, graph, foot planner, IK |
| `cover/` | Cover data for enemy AI and level build (coverData, corners); back-to-wall reuses it |
| `weapons/` | Data-driven weapons (the CT rifle and pistol, G76), ballistics, grenades, weapon carry; `aimAssist.ts` is still wired for the pad although the rule is no aim assist (G16, follow-up in `docs/progress.md`) |
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
| `docs/locomotion/` | The movement run: CT research (`CT-RESEARCH.md`), the CT prototype plan (`PROTOTYPE-PLAN.md`), the consolidation plan (`CONSOLIDATE.md`) | The CT prototype job |
| `docs/consolidation/` | The consolidation run: audit, questions, Michael's answers, deletion logs | History of the 4.0.0 merge |
| `docs/operators/` | The operators run (feature/operators): Wren and Moth, the offline art pipeline (`scripts/operators/`), its decisions D1 onward (G75) | Operator art and Wren in-game work |
| `docs/training/` | The Fallow bunker run (spec, bays, features) | Bunker work |
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
| `docs/systems/session-method.md` | How a job runs: prototype, then the orchestrator method; job docs and prompts | Starting or writing the prompt for any job |
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
