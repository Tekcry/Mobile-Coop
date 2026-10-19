# Night Shift - roadmap

State only: what is happening, what comes next, what waits on Michael, what is done. The rules (the orchestrator,
machines, merges, versions, test tiers) live in CLAUDE.md "Sessions". Detail lives in each job's own docs (linked). Live page: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level with Wren, basic animations, basic
weapons, all co-op moves, lights and shadows, pure CT except Michael's decisions; a visual pass last. No refining before
Michael has playtested the core loop.

Priority (Michael, 2026-10-19 16:30): "Sector ops should be low priority over anything else. I want to get coop training
bunker fully functional and running, but sector ops can at least run when there is opportunity." So the co-op training
course (CT Core) comes first for the desktop lock, the laptop test runner and the orchestrator's reviews; Sector Ops
runs only on spare capacity and yields the desktop lock whenever CT Core needs it.

Last updated: 2026-10-19 21:55 Sydney.

## Waiting on Michael
1. New CT footage for the movement fine-tuning (legs, rigid upper body in ADS tilting at the hips, shimmy swing,
   drainpipe, pistol aim). Michael: "Still not an accurate recreation of CT movement. I will take more recordings."
2. Delete the merged branch feature/ct-research: safe (docs in master via #4, raw in tag archive/ct-research-raw);
   auto mode blocked the orchestrator, so Michael runs
   `git -C C:/NightShift/Mobile-Coop-menu push origin --delete feature/ct-research`.

## Decided (Michael, 2026-10-19 dashboard)
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
| Orchestrator | desktop | `docs/*`, reviews | This roadmap, reviews and merges, keeps the sessions in step | CT Core D + E (first priority); Sector Ops slice 2 on spare capacity |
| CT Core Build | desktop | `feature/ct-prototype` | First priority. Michael walked /ct/ (624fca6b): every item "Not right" (docs/ct-prototype/WALK-2026-10-19.md). Slice on the clear items now; fine-tuning waits for his new CT footage | Clear-items slice on /ct/ |
| Character Build | laptop (second heavy slot) | test runner | The laptop test runner (CLAUDE.md "Machines", Michael 16:30): logic e2e for CT Core first, then Sector Ops; #18 (4.6.6) and #20 unit timeouts (4.6.8) merged. Idle between requests | Next runner request |
| Menu Notes Build | desktop | `feature/menu-notes` | Menu notes done plus M1-M4 (black launch screen, flicker in the dark, menu shot X5, forehead glow removed); tests green on the laptop | Full e2e, then PR (minor) |
| Sector Ops Build | desktop | `feature/sector-restart` | Spare capacity. Michael's bug (M9): a checkpoint restart must be a clean start (guards unalerted, alert music fades, gun reloaded) | PR (patch); then the PC perf run |

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
