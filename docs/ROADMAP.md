# Night Shift - roadmap

State only: what is happening, what comes next, what waits on Michael, what is done. The rules (the orchestrator,
machines, merges, versions, test tiers) live in CLAUDE.md "Sessions". Detail lives in each job's own docs (linked). Live page: https://claude.ai/artifact/XehBYx1Lm27txV29kjSoXh (new account, 2026-10-19 22:55; the old page belongs to the old account)

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level with Wren, basic animations, basic
weapons, all co-op moves, lights and shadows, pure CT except Michael's decisions; a visual pass last. No refining before
Michael has playtested the core loop.

Priority (Michael, 2026-10-19 16:30): "Sector ops should be low priority over anything else. I want to get coop training
bunker fully functional and running, but sector ops can at least run when there is opportunity." So the co-op training
course (CT Core) comes first for the desktop lock, the laptop test runner and the orchestrator's reviews; Sector Ops
runs only on spare capacity and yields the desktop lock whenever CT Core needs it.

Last updated: 2026-10-19 23:25 Sydney (new Claude account: every session restarted from git at 22:40).

## Waiting on Michael
1. Walk slice F on /ct/ in the morning (CT Core, overnight).
2. Prune old branches and worktrees when convenient (docs/process-audit/REPORT.md section 5). feature/ct-research is deleted.

## Decided (Michael, 2026-10-19 dashboard)
- Movement rebuild from the footage (23:15): "Catalogue them, audit, and update our movement system to match the recorded animatimations, movements camera angels, speeds, everything about movement. Must be exactly the same as the recorded movement, only made original by you." (23:20) "I expect a thorough audit of the movement system and have it replicated in my game using original code." This lifts the no-refining rule for movement. Footage: C:/NightShift/Mobile-Coop-ct-prototype/pc/ct-work/ (gitignored; 88 clip folders, 62 from 2026-10-17, 26 new from 2026-10-19). CT Core, after slice F.
- Action menu (23:20): "the action menu that shows up requires holding A and selecting which option you would like to proceed with, including returning to game (no action). I want it to be identical." CT Core.
- Overnight merges (23:15): green, reviewed PRs merge without asking tonight (lightfield-heap, Menu Notes, Sector Ops restart); not the ct-prototype PR.
- Selection wheel stays on LB hold; no lethal / non-lethal switch (LT / RT covers it); with a gun drawn A reloads (CT).
- Scanners: no HP cost when the partner never started; the 10 HP cost stays for a late or abandoned hack (CT Core,
  a later slice).
- Goggle flicker plays only at launch, not after a match.
- Goggle: keep Wren's current goggle; the redesign is parked (Michael rejected the A / B / C scratch options). Only the
  stowed-on-brow export remains, in the cleanup job.
- Moth's goggle is purple (bible 5.14 amber is replaced). A scratch Moth prototype when nothing urgent waits, possibly
  overnight on the desktop.
- Cleanup job (Wren loose ends: stowed goggle, slung-rifle carry offsets, hero VRAM after photo mode, old part meshes,
  kit labels, doc fixes): after the core-loop playtest.

## Now
| Session | Machine | Branch | Doing | Next checkpoint |
| --- | --- | --- | --- | --- |
| Orchestrator | desktop | `docs/*`, reviews | New account (22:40): all sessions restarted; this roadmap, reviews and merges | Menu Notes PR; lightfield-heap and Sector Ops PRs as they turn green |
| CT Core Build | desktop | `feature/ct-prototype` | First priority. Slice F (F1-F7) at 637d41d5: check green, laptop suites pass; e2e:quick, GPU sheets, check, /ct/. Then the footage catalogue, the movement audit and slices to match CT; the hold-A action menu | Slice F on /ct/; catalogue; audit |
| Character Build | laptop (second heavy slot) | test runner | The laptop test runner; order CT Core, Menu Notes, Sector Ops. lightfield-heap merged (#26, 4.7.5) | Menu Notes full e2e (4ae2d2f2), then Sector Ops |
| Menu Notes Build | desktop | `feature/menu-notes` | All notes and M1-M4 built; master 4.7.3 merged (c32eb324); CT Core's two menu fixes done (4ae2d2f2); check + full e2e on the laptop | PR (minor, 4.8.0) |
| Sector Ops Build | desktop | `feature/sector-restart` | Spare capacity. M9 clean checkpoint restart; fix round 839a3a07 in a fresh check; master merged (cb7e1061); suites queued on the laptop | PR (patch); then the PC perf run |

## Next (in order)
1. **Playtest 2 slices B + C** (CT Core): aiming compared with the CT footage (view unchanged when crouched,
   upper body tight, arms less outstretched, natural pistol aim); legs in line with the body walking, running, turning;
   crouch hands and legs. `docs/ct-prototype/PLAYTEST-2.md`.
2. **Playtest 2 slices D + E** (CT Core): rifle and pistol holstering; hanging shimmy (wider, slower hands); vertical
   pipe climb; ledge climb-up onto the knees.
3. **Michael's core-loop playtest** of the co-op training course on /ct/. Refining starts only after this (goal rule).
4. **Selection wheel restyle**: slightly bigger, not just boxes, original (CT Core).
5. **Menu notes** (started 2026-10-19 18:40, job `docs/menu-notes/`, from `docs/menu-ui/SLICES.md`): music from the title screen; preload shaders and the hero with
   a Night Shift load screen; no way back to "press any key"; confirm the hero LOD; the hand clipping the magazine in the
   idle; rifle and pistol in the menu with holding and idle poses; merge Controls and Settings > Controls.
6. **Visual pass** on the training level: lighting, materials, dressing (last, per the goal).

## Later (after the prototype)
- Moth as player 2's character (2-3 days; goggle purple; a scratch prototype first, when nothing urgent waits).
- GPU perf checks on the PC: the menu void, the weapon meshes, the `?gfx=min` budgets.
- WebGPU (Michael, 2026-10-19: measure first): the Sector Ops perf run on the PC (full section, 20-25 guards) decides. If rendering is the bottleneck, a 1-day WebGPU trial behind a flag (Babylon 9 WebGPUEngine, snapshot rendering; shader conversion bundled, no CDN). If the sim is the bottleneck, WebGPU does not help. Not before the core-loop playtest.
- Cleanup job (Wren loose ends), after the core-loop playtest.
- Test fixes: e2e-pad (known flaky); the keyboard vent: Space then an unseen E hold counts as a kick (T1, CT Core); lightField "allocation-free under a loop" fails its heap check when the machine is
  loaded (passes alone; skip under load or warm up longer, #20 STATE); pre-existing e2e-kestrel / camera-bounds failures.
- The older follow-up list in `docs/progress.md` (medkit stations, missing sounds, music revision, art guide, one folder
  per map, Kestrel, Fallow bunker rebuild).

## Done
| Date | PR | What |
| --- | --- | --- |
| 2026-10-17 | #3 | 4.0.0 consolidation: one vision, non-CT deletions |
| 2026-10-18 | #4 | CT co-op research, decisions G124-G160, the prototype plan |
| 2026-10-18 | #5 | Wren is the player character (both players) |
| 2026-10-19 | #7 | Weapons: rifle with launcher, pistol with jammer, knife, believable holds and carry |
| 2026-10-19 | #6 | CLAUDE.md "Current goal" |
| 2026-10-19 | #8 | Menu: Arkham-plan menus, dialog fixes, cinematic hero background |
| 2026-10-19 | #26 | 4.7.5: lightField heap check stable under load (tests only) |
| 2026-10-19 | #25 | 4.7.4: orchestrator docs, new Claude account and dashboard |
| 2026-10-19 | #24 | 4.7.3: orchestrator docs, walk notes, account handover |
| 2026-10-19 | #23 | 4.7.2: the version label shows the build's own commit (preview slots showed master's) |
| 2026-10-19 | #22 | 4.7.1: e2e-traverse grate kick gets a closed grate (flake fixed; the keyboard vent kick is open for CT Core) |
| 2026-10-19 | #21 | 4.7.0: Sector Ops (3 Warehouse sections, connectors, stars, revive syringes), the prototype menu, co-op mode switch (G184-G191) |
| 2026-10-19 | #20 | 4.6.8: unit tests survive a loaded machine (120 s timeout, settings.test save race fixed) |
| 2026-10-19 | #19 | 4.6.7: the laptop is the test runner; co-op training first, Sector Ops on spare capacity |
| 2026-10-19 | #18 | 4.6.6: e2e-menus slider check waits on the condition (no game change) |
| 2026-10-19 | #17 | 4.6.5: co-op test fix (coop, netmove, ctcourse reliable; only e2e-pad flaky) |
| 2026-10-19 | #15 | 4.6.3: process audit (one rules file, test tiers, full e2e 62 -> 26 min) |
| 2026-10-19 | #14 | 4.6.2: version numbers follow the merges (G183), the in-game label shows the commit |
| 2026-10-19 | #12 | Animation clean-up: weapon travel, reloads, shoulder swap, traversal grips, hand shapes |
| 2026-10-19 | #13 | Phone launch for testing only (G182): minimum settings, UI fits the screen, pad input |
| 2026-10-19 | #9 | CT prototype: posture, CT controls, selection wheel, 8-station co-op course, revive |

## Previews
- `/preview/` = `dev` = master (moved by the orchestrator after each merge).
- `/ct/` = `ct-movement` = `feature/ct-prototype` (moved by CT Core after each slice; frozen while Michael walks it).

## Dashboard
The orchestrator publishes this file as a page after every update, so Michael can check it from his phone. Git stays
the source of truth.
