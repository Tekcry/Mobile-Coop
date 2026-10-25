# Night Shift - module map and doc index
Owner: the orchestrator. Status: current.

Read on demand (`CLAUDE.md` points here). Rules: `docs/RULES.md`; the game: `docs/VISION.md` (both from origin/master).

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

Maps: Marlow Yard (`ctcourse`, Course mode, `?autostart=ctcourse&mode=course`), Sector Ops Saltmarsh Park (`campusOps`;
the old `warehouseOps` stays selectable), Fallow (`bunker`, parked behind `?legacy=1`).

## Doc index
| File | Covers | Read when |
| --- | --- | --- |
| `docs/RULES.md` | Sessions, jobs, intake, walk pacing, train-ready, test tiers, machines, swaps, commands, ports, definition of done | Every session start (from origin/master) |
| `docs/VISION.md` | The game summary (modes, player counts) and the current-focus pointer (ROADMAP Now) | Every session start (from origin/master) |
| `docs/DECISIONS.md` | Michael's decisions G1 onward, deferred and unanswered items | Any design or process question |
| `docs/design-bible.md` | Pillars, systems, out-of-scope list, level and platform rules | The sections the job touches |
| `docs/ROADMAP.md` (on origin/feature/menu) | Now, Inbox (Michael's new ideas), Waiting on Michael, Decided, Done (owned by the orchestrator) | The entries a resume block names |
| `docs/orchestrator/` (on origin/feature/menu) | Orchestrator STATE, HANDOFF, PROMPTS (boot lines), BOOT (per-title start), archive | Starting a session, swaps |
| `docs/story.md` | Story, setting, characters, radio and writing rules | Any in-game text, briefing or mission writing |
| `docs/level-design.md`, `docs/templates/map-spec.md`, `docs/design/scale-sheet.md` | The map standard (engine facts in Section 12), the map spec template, the size sheet | Any map or engine-fact change |
| `docs/level-validator/` | The level-graph schema and an example graph (`scripts/level-validate.mjs`) | Map graphs, validator runs |
| `docs/templates/` | BRIEF, PLAN, plan check, sign-off, walk card and map spec templates | Starting a job or a walk card |
| `docs/ct-prototype/`, `docs/marlow-final/` | Marlow Yard, the co-op training course (`CTCOURSE-SPEC.md`), its slices and playtests | Marlow Yard work |
| `docs/sector-redesign/` | Sector Ops Saltmarsh Park: spec, slices, lighting | Sector Ops work |
| `docs/coop4/` | Sector Ops up to 4 players | Co-op player count work |
| `docs/ct-research/` | The CT co-op research (G124-G160) | CT behaviour questions |
| `docs/operators/` | The operators run: Wren and Moth, the offline art pipeline (`scripts/operators/`), its decisions D1 onward (G75) | Operator art and Wren in-game work |
| `docs/menu-ui/` | The Arkham Knight style menu plan (G77) | The menu job |
| `docs/audio/`, `docs/music/`, `docs/audio-credits.md` | Foley, weapon audio and music logs and plans; CC0 credits | Sound and music work |
| `docs/research/` | Night vision and lamp research | Vision and light work |
| `docs/backlog.md` | Playtest feedback and bugs (new ideas from Michael go to the ROADMAP Inbox) | Adding feedback |
| `TESTING.md` | The short desktop checklist and the release checklist | Ending a job |
| `docs/systems/testing-tools.md` | Every e2e suite, the test queue, flakes and quarantine, helper scripts, debug overlay | Running or writing tests, judging a failure |
| `docs/systems/auto-train.md` | Auto-train (rolling merge trains) | Trains |
| `docs/systems/watchdog.md` | The watchdog: alerts, fixes, the train-ready label convention | Labels, stuck pipeline |
| `docs/systems/swaps.md` | Swap save and boot commands, worktree clean-up | Swaps |
| `docs/laptop-queue/` | The laptop queue job (BRIEF, STATE, visual gate); its first build plan is archived | Queue changes |
| `docs/systems/deploy.md` | Branches and the Pages slots | Releases, preview builds |
| `docs/systems/session-method.md`, `docs/systems/agent-preamble.md` | The job lead's loop (intake detail, implementer, checker, fix round); the shared subagent preamble | Running a job or writing its prompts |
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
| `docs/kestrel/` | The Kestrel map project and editor (paused, G53) | Kestrel work only |
| `docs/process-audit/` | Process audits; `rules-history-2026-10-24.md`, the rule text before the 2026-10-24 rewrite | The origin of a rule |

History (do not read unless a job names it): `docs/archive/progress.md` (history and the older follow-up backlog) and
`docs/archive/`: every finished job's folder `docs/archive/<job>/` (for example `locomotion/` with `CT-RESEARCH.md`
and `PROTOTYPE-PLAN.md`, `consolidation/` the 4.0.0 merge, `training/` the Fallow bunker run, `prompts/` old phase
specs and the music spec), retired maps, the old changelog, testing and progress history, the pre-prototype CT
movement build and the laptop queue's first plan `laptop-queue-PLAN-2026-10-23.md`. Each live job folder `docs/<job>/`
holds that job's BRIEF, PLAN and STATE; a released job's folder moves to `docs/archive/<job>/`.
