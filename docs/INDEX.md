# Night Shift - module map and doc index
Owner: the orchestrator. Status: current.

Read on demand (`CLAUDE.md` points here). From 2026-11-01: the control panel issue, `docs/plan/MASTER-PLAN-PROMPT.md` and
`docs/plan/DECISIONS-2026-11.md` (`CLAUDE.md` "Read at start"); `docs/RULES.md` and `docs/VISION.md` are history.

## Module map (`src/`)
| Module | Responsibility |
| --- | --- |
| `core/` | Babylon import surface, engine, `GameLoop` (fixed 60 Hz sim), flags, `legacy` (parked modes), settings, quality / governor / display (pure parts) |
| `input/` | Action map; gamepad and keyboard / mouse sources write one `InputState`; bindings, remapping and conflicts |
| `ui/` | DOM overlay: screens, `FocusNav`, widgets, HUD, debug overlay |
| `game/` | `GameState`, modes (Course mode `course` (Marlow Yard) and its framework `course/`; Sector Ops `sector` (Tallow Wharf); the Test Chamber's `test`; `sandbox` for dev walks), takedowns, gadgets, wall medkit stations, tactics |
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
| `progression/`, `cosmetics/` | XP, unlocks, upgrades, suit / HQ; avatar catalogue (hidden; stage I removes them) |
| `save/`, `feedback/` | IndexedDB wrapper, schema, migrations; playtest notes and crash log |
| `audio/` | WebAudio mixer, synth voices, CC0 foley, weapon sounds and music |
| `editor/`, `security/`, `dev/` | Kestrel level editor and its security devices (dev only; Kestrel paused, G53); editor bridge |
| `pwa/`, `config/` | Service worker, fullscreen, gestures; JSON / TS content and feel tables |

Maps: Marlow Yard (`ctcourse`, Course mode, `?autostart=ctcourse&mode=course`), the Test Chamber (`chamber`, test mode or
sandbox), Tallow Wharf (campaign preview), Kestrel (the level editor's map). Saltmarsh Park and Warehouse Ops were removed in clean-up F; Hunter,
Mission, Infiltration, Free Roam, `?legacy=1`, the Warehouse, Proving Grounds and the five parked 2.x maps in clean-up H.

## Doc index
| File | Covers | Read when |
| --- | --- | --- |
| `docs/plan/MASTER-PLAN-PROMPT.md` | The orchestrator brief: phases, gates, process (section 16) | Every session start (section 16) |
| `docs/plan/DECISIONS-2026-11.md` | Michael's decisions since 2026-11-01 | Every session start |
| `docs/RULES.md` | History: the old process (trains, queues, machines), replaced 2026-11-01 | Only for history |
| `docs/VISION.md` | History: the old vision, replaced 2026-11-01 (v3 comes in Phase 1) | Only for history |
| `docs/DECISIONS.md` | Michael's decisions G1-G434 (frozen 2026-11-01; still binding where not replaced) | Any design question the newer docs do not settle |
| `docs/design-bible.md` | Pillars, systems, out-of-scope list, level and platform rules | The sections the job touches |
| `docs/ROADMAP.md` (on origin/feature/menu) | Now, Inbox (Michael's new ideas), Waiting on Michael, Decided, Done (owned by the orchestrator) | The entries a resume block names |
| `docs/story.md` | Story, setting, characters, radio and writing rules | Any in-game text, briefing or mission writing |
| `docs/level-design.md`, `docs/templates/map-spec.md`, `docs/design/scale-sheet.md` | The map standard (engine facts in Section 12), the map spec template, the size sheet | Any map or engine-fact change |
| `docs/level-validator/` | The level-graph schema and an example graph (`scripts/level-validate.mjs`) | Map graphs, validator runs |
| `docs/templates/` | BRIEF, PLAN, sign-off, walk card and map spec templates | Starting a job or a walk card |
| `docs/ct-prototype/`, `docs/marlow-final/` | Marlow Yard, the co-op training course (`CTCOURSE-SPEC.md`), its slices and playtests | Marlow Yard work |
| `docs/sector-redesign/graph/` | Sector Ops Saltmarsh Park level graphs, kept only because tests read them (Sector Ops is being removed) | Never |
| `docs/ct-research/` | The CT co-op research (G124-G160) | CT behaviour questions |
| `docs/operators/` | The operators run: Wren and Moth, the offline art pipeline (`scripts/operators/`), its decisions D1 onward (G75) | Operator art and Wren in-game work |
| `docs/menu-ui/` | The Arkham Knight style menu plan (G77) | The menu job |
| `docs/audio/`, `docs/music/`, `docs/audio-credits.md` | Foley, weapon audio and music logs and plans; CC0 credits | Sound and music work |
| `docs/research/` | Night vision and lamp research; `mission-audit/` the level design craft research (multi-step co-op missions, pathways without visual cues); `ct-movement/` the Chaos Theory movement research (`CT-RESEARCH.md`, `CT-SHOTLIST.md`, footage catalogue and measurements) | Vision and light work, mission and level design, movement |
| `docs/backlog.md` | Playtest feedback and bugs (new ideas from Michael go to the ROADMAP Inbox) | Adding feedback |
| `TESTING.md` | The short desktop checklist and the release checklist | Ending a job |
| `docs/systems/testing-tools.md` | Every e2e suite, flakes and quarantine, helper scripts, debug overlay | Running or writing tests, judging a failure |
| `docs/systems/deploy.md` | Branches and the Pages slots | Releases, preview builds |
| `docs/systems/input-and-loop.md` | Game loop, actions, pad and keyboard bindings | Input work |
| `docs/systems/ui.md` | HUD, menus, display, feedback, photo mode | UI work |
| `docs/systems/world-and-characters.md` | Maps, level builder, the shared character rig | Maps, rig, animation |
| `docs/systems/movement.md` | Movement, camera, traversal anchors, back-to-wall | Movement work |
| `docs/systems/ct-toolkit.md` | The CT toolkit spec (gadgets, pistol disruptor, optic cable); CT's set is settled by the research (G76) | Gadget and toolkit work |
| `docs/systems/lighting.md` | Light registry, baked lamps, lamp volume | Light work |
| `docs/systems/ai.md` | Perception, alert states, archetypes, nav grid, mode hooks | AI work |
| `docs/systems/takedowns.md` | Takedowns, grab, palm strike | Takedown work |
| `docs/knife-kills/` | The paired knife kills' decisions and slices (built as piano-knife for the removed piano scene; now every map's lethal takedown) | Knife kill work |
| `docs/systems/gadgets.md` | Gadgets, wheel, remote views | Gadget work |
| `docs/systems/modes-and-progression.md` | Modes as built, the course, arsenal / suit / HQ, cosmetics (hidden) | Mission framework |
| `docs/systems/saves.md` | Progression maths, save schema, migrations | Any save change |
| `docs/systems/combat.md` | Weapon data, firing, damage | Weapon work |
| `docs/systems/coop.md` | Transports, host / client sims, sync, team moves | Co-op work |
| `docs/systems/audio.md` | Audio engine, foley, weapon sounds, music | Sound work |
| `docs/systems/graphics-quality.md` | Presets, governor, renderer, TAAU, weather | Render work |
| `docs/systems/performance.md` | Frame, CPU, draw and memory budgets; perf script budgets | Every job end |
| `docs/systems/conventions.md` | Robustness rules, conventions, full module table, hot paths, project overview | Code conventions |
| `docs/kestrel/` | The Kestrel map project and editor (paused, G53) | Kestrel work only |

History: docs/archive/ (every finished job's folder, retired maps, the old progress, testing and changelog history)
was removed on 2026-11-01. Paths under it that docs still cite are in git history: `git log --all -- docs/archive/<path>`
finds the deleting commit, then `git show <commit>^:docs/archive/<path>` prints the file.
