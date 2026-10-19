# Night Shift - roadmap

State only: what is happening, what comes next, what waits on Michael, what is done. The rules (the orchestrator,
machines, merges, versions, test tiers) live in CLAUDE.md "Sessions". Detail lives in each job's own docs (linked). Live page: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level with Wren, basic animations, basic
weapons, all co-op moves, lights and shadows, pure CT except Michael's decisions; a visual pass last. No refining before
Michael has playtested the core loop.

Last updated: 2026-10-19 16:00 Sydney.

## Waiting on Michael
1. Delete the merged branch feature/ct-research: safe (docs in master via #4, raw in tag archive/ct-research-raw);
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
| Orchestrator | desktop | `docs/*`, reviews | This roadmap, reviews and merges, keeps the sessions in step | Merge the co-op test fix and Sector Ops PRs; CT Core slices B + C |
| CT Core Build | desktop | `feature/ct-prototype` | B + C on /ct/ (87514ed1); master merged; slices D + E | D + E on /ct/ for Michael |
| Character Build | laptop (second heavy slot) | `feature/menus-slider` | e2e-menus slider fix: the hold-repeat check waits on game time, not wall time (Michael, 2026-10-19) | PR to master (patch) |
| Sector Ops Build | desktop | `feature/sector-ops` | Slice 2: Sector Ops on 3 Warehouse sections (M7: no lives, difficulty stars); menus and lobby done on the branch | Sector Ops PR |

## Next (in order)
1d. **Sector Ops and the prototype menu** (new desktop session "Night Shift | Sector Ops"; Michael, 2026-10-19,
   docs/sector-ops/BRIEF.md on feature/sector-ops): the main menu offers only Sector Ops and Co-op (plus Loadout,
   Settings, Feedback; Missions / Training / Free Roam behind ?legacy=1). Sector Ops (original, after Conviction's
   Deniable Ops at CT pace): the Warehouse in 3-4 sectors of rising difficulty with cameras and lasers, each sector an
   objective then its exit, ghosting possible, solo or co-op; Michael's playground. Co-op is the campaign: Marlow Yard
   (Course) by room code, the host can switch to Sector Ops. Prototype effort only. M5: five distinct sections (courtyard break-in, entrance, interior, ...) joined by connectors that load the next and unload the last, as many patrolling guards as the budget allows. Research (RESEARCH.md) and a full PLAN.md first; Michael approves before slice 2.
2. **Playtest 2 slices B + C** (CT Core, after 1): aiming compared with the CT footage (view unchanged when crouched,
   upper body tight, arms less outstretched, natural pistol aim); legs in line with the body walking, running, turning;
   crouch hands and legs. `docs/ct-prototype/PLAYTEST-2.md`.
3. **Playtest 2 slices D + E** (CT Core): rifle and pistol holstering; hanging shimmy (wider, slower hands); vertical
   pipe climb; ledge climb-up onto the knees.
4. **Michael's core-loop playtest** of the co-op training course on /ct/. Refining starts only after this (goal rule).
5. **Selection wheel restyle**: slightly bigger, not just boxes, original (CT Core).
6. **Menu notes** (menu job, `docs/menu-ui/SLICES.md`): music from the title screen; preload shaders and the hero with
   a Night Shift load screen; no way back to "press any key"; confirm the hero LOD; the hand clipping the magazine in the
   idle; rifle and pistol in the menu with holding and idle poses; merge Controls and Settings > Controls.
7. **Visual pass** on the training level: lighting, materials, dressing (last, per the goal).

## Later (after the prototype)
- Moth as player 2's character (2-3 days; goggle purple; a scratch prototype first, when nothing urgent waits).
- GPU perf checks on the PC: the menu void, the weapon meshes, the `?gfx=min` budgets.
- WebGPU (Michael, 2026-10-19: measure first): the Sector Ops perf run on the PC (full section, 20-25 guards) decides. If rendering is the bottleneck, a 1-day WebGPU trial behind a flag (Babylon 9 WebGPUEngine, snapshot rendering; shader conversion bundled, no CDN). If the sim is the bottleneck, WebGPU does not help. Not before the core-loop playtest.
- Cleanup job (Wren loose ends), after the core-loop playtest.
- Test fixes: known flaky suites (e2e-coop, e2e-pad and others), pre-existing e2e-kestrel / camera-bounds failures.
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
