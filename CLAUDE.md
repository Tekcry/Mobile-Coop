# Night Shift - architecture and conventions

- Night Shift (renamed from Silent But Deadly) is an original third-person stealth game modelled on Splinter Cell: Chaos Theory.
- Story, setting and in-game text: `docs/story.md`.
- It has a solo campaign that is also playable in 2-4 player co-op. Light and shadow is the core.
- It is a PWA (Vite + TypeScript + Babylon.js 9 + Havok) on GitHub Pages: iPhone 17 Pro Max at 60 fps and desktop.
- `docs/design-bible.md` decides design questions. Text anywhere describing Blacklist systems (snap cover, Mark & Execute, sonar, Ghost / Panther / Assault, PvP, Wave) is history.
- The internal ids keep the old name (IndexedDB `shoulder-strike`, export magic `shoulder-strike-save`, co-op app id).

## Every session
1. Read this file.
2. Read `docs/progress.md` (status table and current state only).
3. Read the current phase spec (`docs/prompts/phase-N-*.md`).
4. Open only the files and `docs/systems/*` sections the spec lists. Use `grep` and line ranges, not whole large files.
5. Authority order: Michael > bible > phase spec > `docs/level-design.md` and the map's documents > these docs > code.

## Commands
- `npm run dev` - dev server (LAN-exposed for phone testing)
- `npm run build` - typecheck + production build into `dist/`
- `npm test` - Vitest unit tests (node env, `fake-indexeddb` for save tests)
- `npm run lint` - ESLint (typescript-eslint)
- `npm run check` - lint + tests + build (what CI and every phase end must pass)
- `npm run e2e` - serves `dist/` and runs the required headless e2e suites, 4 at a time, one browser each (needs a prior `npm run build`). `npm run e2e:serial` runs one at a time with live output (debugging)
- `npm run e2e:quick` - `smoke` plus the suites that cover the folders the change touched (working tree plus unpushed commits). **Steps use the quick run; the full `npm run e2e` runs at the end of each phase and before every merge to `dev` / `master`.**
- `npm run e2e:legacy` - the suites for parked content (from Phase 0 Step 4; report only)
- GPU testing runs on Michael's PC only. Graphical and performance testing (perf budgets, contact sheets, visual parity and probe checks, phone-look emulation, beauty shots) runs there with `E2E_GPU=1` (hardware GPU: ANGLE D3D11 on Windows, GPU blocklist ignored; `perf.mjs` then uses the local budget profile). Cloud sessions run unit tests and logic e2e only (software GL, the default) and mark every GPU check "pending PC run" in their report; they never claim a perf or visual result from SwiftShader.
- Known-flaky suites (`docs/backlog.md`, "Flaky e2e suites") always run; their failures print as KNOWN FLAKY and do not fail the run. Any other failure does.
- Suites, helper scripts (`perf`, `soak`, `shot`, `anim-sheet`) and the debug overlay: `docs/systems/testing-tools.md`.
  `?autostart=<mapId>&mode=<mode>` boots straight into a match (dev and tests). Uses the preinstalled Chromium.

## Branches
- `ct-movement` is the working branch (preview `/ct/`, own save).
- Work flows one way only: `ct-movement`, then `dev` (`/preview/`), then `master` (live). Nothing is committed directly to `dev` or `master`.
- Claude never merges into `dev` or `master`; Michael merges.
- Map projects use their own branch off `ct-movement` (for example `feature/exchange-map`).
- Full detail is in `docs/systems/deploy.md`.

## Hard rules
- No runtime CDN or network dependency. All assets are bundled; Havok WASM is imported with `?url`.
- No external art or audio, except CC0 textures for desktop detail (bible 5.16). Audio is WebAudio synthesis unless the Phase 2 A/B test changes it (bible S7).
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
- Gameplay never reads graphics state: presets, LOD, voxel layers, the governor, the phone look. It reads collision, occupancy, anchors, the light bake and the noise model only.
- Light parity: what the player sees, the light meter and guard perception must agree (bible 5.1).
- No Splinter Cell IP: names, characters, organisations, story, logos, UI art.
- Removed and parked systems (bible 6) get no new work.
- No voice. Story is text radio and subtitles only.
- A phase that changes an engine fact listed in `docs/level-design.md` Section 12 updates that section and lists the map decisions that relied on the old fact (bible 7).

## Definition of done (every phase, bible 9)
- `npm run check` passes; the e2e suites the spec names pass, and the full required suite (`npm run e2e`) passes at the end.
- Performance budgets pass (`docs/systems/performance.md`); visual changes on the phone list a Phone check in `TESTING.md`.
- Pure logic lives in Babylon-free modules with Vitest tests; each new player-facing system has an e2e suite or extends one.
- New or changed animations meet the realism standard (bible 5.12.2).
- Docs updated: `CHANGELOG.md` (one minor version per phase), `TESTING.md` (a short manual phone and desktop checklist), the relevant `docs/systems/*.md`, `docs/progress.md`.
- A save-shape change bumps `SAVE_VERSION` with a migration and a test using a literal old save.
- Commit and push `ct-movement`, report in bible Appendix B format, then STOP.

## Module map (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | Babylon import surface, engine, `GameLoop` (fixed 60 Hz sim), flags, settings, quality / governor / display / platform (pure parts) |
| `input/` | Action map; touch, gamepad, keyboard / mouse sources write one `InputState` |
| `ui/` | DOM overlay: screens, `FocusNav`, widgets, HUD, debug overlay |
| `game/` | `GameState`, modes (wave, clear / Hunter, mission / Infiltration, sandbox, training), takedowns, gadgets, tactics |
| `physics/` | Havok loading, collision groups, body budget |
| `player/` | Character controller, movement, traversal and attach states, move state, camera |
| `anim/` | Pure animation: motion driver, clips, graph, foot planner, IK |
| `cover/` | Cover faces and state machine, corners and doorways (scheduled for removal in Phase 3) |
| `weapons/` | Data-driven weapons, ballistics, grenades, weapon carry, aim assist |
| `ai/` | Enemy brains, nav grid, perception, alert states, patrols, archetypes |
| `world/` | Level builder, map builders, anchors, rooms, lights, light rig, doors, surfaces |
| `voxel/` | Voxel level, characters and weapons, lamp bake and light volume, sky bake |
| `vfx/` | Pooled effects, post stack, TAAU, weather, silhouettes |
| `net/` | Optional co-op: transports, protocol, session, host and client sims, lobby UI |
| `progression/`, `cosmetics/` | XP, unlocks, upgrades, suit / HQ; avatar catalogue (parked behind `?legacy=1`) |
| `save/`, `feedback/` | IndexedDB wrapper, schema, migrations; playtest notes and crash log |
| `audio/` | WebAudio synth voices and mixer |
| `pwa/`, `config/` | Service worker, fullscreen, gestures; JSON / TS content and feel tables |

## Doc index
| File | Covers | Read when |
| --- | --- | --- |
| `docs/design-bible.md` | Vision, pillars, systems, out-of-scope list, process, roadmap | Every session (Sections 0-3, 6, 9); other sections when a phase touches them |
| `docs/story.md` | Story, setting, characters, radio and writing rules | Any in-game text, briefing or mission writing |
| `docs/progress.md` | Phase status table, current state, phase logs | Every session |
| `docs/level-design.md`, `docs/templates/map-spec.md` | The map standard (engine facts in Section 12) and the map spec template | Any map or engine-fact change |
| `docs/ct-movement.md`, `docs/ct-movement-progress.md` | Chaos Theory movement spec and status | Movement work |
| `docs/prompts/` | Phase specs, the handover, map specs, designs and progress logs | The current phase; map work |
| `TESTING.md` | Manual device checklists (3.0.0 onwards) and the release checklist | Ending a phase |
| `docs/systems/testing-tools.md` | Commands, every e2e suite, helper scripts, debug overlay | Running or writing tests |
| `docs/systems/deploy.md` | Branches and the Pages slots (`/`, `/preview/`, `/ct/`) | Releases, preview builds |
| `docs/systems/input-and-loop.md` | Game loop, actions, touch / pad / keyboard bindings | Input work |
| `docs/systems/ui.md` | HUD, menus, platform and display, feedback, photo mode | UI work |
| `docs/systems/world-and-characters.md` | Maps, level builder, Warehouse, the shared character rig | Maps, rig, animation |
| `docs/systems/movement.md` | Movement, camera, CT movement phases, traversal anchors, corners | Movement work |
| `docs/systems/lighting.md` | Light registry, baked lamps, phone look, lamp volume | Light work (Phase 1) |
| `docs/systems/cover.md` | Snap cover and combat around cover (removal in Phase 3) | Phase 3 only |
| `docs/systems/ai.md` | Perception, alert states, archetypes, nav grid, mode hooks | AI work |
| `docs/systems/takedowns.md` | Takedowns, Mark & Execute (removal in Phase 3) | Takedown work |
| `docs/systems/gadgets.md` | Gadgets, wheel, remote views | Gadget work |
| `docs/systems/modes-and-progression.md` | Hunter, Infiltration, arsenal / suit / HQ, cosmetics (parked) | Mission framework (Phase 4) |
| `docs/systems/saves.md` | Progression maths, save schema, migrations | Any save change |
| `docs/systems/combat.md` | Weapon data, firing, damage | Weapon work |
| `docs/systems/coop.md` | Transports, host / client sims, sync, team moves, PvP | Co-op work |
| `docs/systems/audio.md` | Audio engine and voices | Sound work (Phase 2) |
| `docs/systems/graphics-quality.md` | Presets, governor, renderer, voxels, TAAU, weather | Render work |
| `docs/systems/performance.md` | Frame, CPU, draw and memory budgets; perf script budgets | Every phase end |
| `docs/systems/conventions.md` | Robustness rules, conventions, full module table, hot paths, project overview | Code conventions |
