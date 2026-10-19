# Night Shift - roadmap

The one place that says what is happening, what comes next and what waits on Michael. Owned by the orchestrator
session ("Night Shift | Orchestrator"): it is the only session that edits this file. Every other session reports to the
orchestrator when it starts, finishes a slice, opens a PR or gets stuck; the orchestrator updates this file and merges.
Detail lives in each job's own docs (linked). Live page: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level with Wren, basic animations, basic
weapons, all co-op moves, lights and shadows, pure CT except Michael's decisions; a visual pass last. No refining before
Michael has playtested the core loop.

Last updated: 2026-10-19 11:30 Sydney.

## Waiting on Michael
1. Selection wheel button: LB hold (now) or a D-pad hold? (CT Core, WALKTHROUGH.md Q1)
2. A lethal / non-lethal switch in the wheel centre? (CT Core Q2)
3. With a gun drawn, A reloads (CT): keep it, or always interact on A? (CT Core Q3)
4. Scanners: if the partner never starts, the one who finished pays 10 HP. Keep it? (CT Core Q4)
5. Should the goggle flicker replay on the title after a match? (menu)
6. Moth: direction (D24) and goggle colour (amber fails the colour-blindness rule). Blocks the Moth job.
7. Cleanup job (Wren integration fixes, about 3-5 h): go?
8. Delete the merged branch feature/ct-research? (the raw research is kept as tag archive/ct-research-raw)

## Now
| Session | Machine | Branch | Doing | Next checkpoint |
| --- | --- | --- | --- | --- |
| Orchestrator | desktop | `docs/*`, reviews | This roadmap, reviews and merges, keeps the sessions in step | Merge anim-cleanup's PR; move /preview/ to master |
| CT Core Build | desktop | `feature/ct-prototype` | Playtest 2 slice A: controls and camera (D-pad walk speed, speed 2 slowest, aim sensitivity -70 %, peek direction, shoulder memory, no swap flick, back-to-wall snap, quieter footsteps, no walk bob) | Slice A pushed to /ct/ for Michael |
| Character Build | laptop (Remote Control) | `feature/anim-cleanup` | Full e2e and an independent check after merging master | PR to master; the orchestrator merges |

## Next (in order)
1. **Anim clean-up into master** (Character Build): weapon handling to the real mounts, reload, hand shapes, traversal
   grips. `docs/anim-cleanup/`.
2. **Playtest 2 slices B + C** (CT Core, after 1): aiming compared with the CT footage (view unchanged when crouched,
   upper body tight, arms less outstretched, natural pistol aim); legs in line with the body walking, running, turning;
   crouch hands and legs. `docs/ct-prototype/PLAYTEST-2.md`.
3. **Playtest 2 slices D + E** (CT Core): rifle and pistol holstering; hanging shimmy (wider, slower hands); vertical
   pipe climb; ledge climb-up onto the knees.
4. **Michael's core-loop playtest** of the co-op training course on /ct/. Refining starts only after this (goal rule).
5. **Night-vision goggle surround** redesign, CT-like but original (operators pipeline, Blender), and the **cleanup job**
   if Michael says go (Waiting 7).
6. **Selection wheel restyle**: slightly bigger, not just boxes, original (CT Core).
7. **Menu notes** (menu job, `docs/menu-ui/SLICES.md`): music from the title screen; preload shaders and the hero with
   a Night Shift load screen; no way back to "press any key"; confirm the hero LOD; the hand clipping the magazine in the
   idle; rifle and pistol in the menu with holding and idle poses; merge Controls and Settings > Controls.
8. **Visual pass** on the training level: lighting, materials, dressing (last, per the goal).

## Later (after the prototype)
- Moth as player 2's character (2-3 days; needs Waiting 6).
- GPU perf checks on the PC: the menu void, the weapon meshes, the `?gfx=min` budgets.
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
| 2026-10-19 | #9 | CT prototype: posture, CT controls, selection wheel, 8-station co-op course, revive |

## Previews
- `/preview/` = `dev` = master (moved by the orchestrator after each merge).
- `/ct/` = `ct-movement` = `feature/ct-prototype` (moved by CT Core after each slice; frozen while Michael walks it).

## Dashboard
The orchestrator publishes this file as a page after every update, so Michael can check it from his phone. Git stays
the source of truth.
