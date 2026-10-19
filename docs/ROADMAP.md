# Night Shift - roadmap

The one place that says what is happening, what comes next and what waits on Michael. Owned by the orchestrator
session ("Night Shift | Orchestrator"): it is the only session that edits this file. Every other session reports to the
orchestrator when it starts, finishes a slice, opens a PR or gets stuck; the orchestrator updates this file and merges.
Machines (Michael, 2026-10-19): every CPU or GPU heavy task (e2e, full test runs, builds in loops, GPU shots, Blender, heavy subagents) runs on the desktop, where the orchestrator and CT Core run. The laptop session (Character Build) does light work only: docs, planning, small edits. One heavy job at a time on the desktop (lock file C:/NightShift/heavy.lock); the orchestrator sets the order.
Merges (Michael, 2026-10-19): the orchestrator merges reviewed, green PRs into master without asking; master is always the most up-to-date version with every finished update. It asks only when unsure.
Detail lives in each job's own docs (linked). Live page: https://claude.ai/artifact/4iaH3gvBbw8utN1uBgysVw

Goal (CLAUDE.md "Current goal"): a fully functional 2-player co-op training level with Wren, basic animations, basic
weapons, all co-op moves, lights and shadows, pure CT except Michael's decisions; a visual pass last. No refining before
Michael has playtested the core loop.

Last updated: 2026-10-19 12:40 Sydney.

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
| Orchestrator | desktop | `docs/*`, reviews | This roadmap, reviews and merges, keeps the sessions in step | Merge anim-cleanup's PR; move /preview/ to master |
| CT Core Build | desktop | `feature/ct-prototype` | Playtest 2 slice A: controls and camera (D-pad walk speed, speed 2 slowest, aim sensitivity -70 %, peek direction, shoulder memory, no swap flick, back-to-wall snap, quieter footsteps, no walk bob) | Slice A pushed to /ct/ for Michael |
| Character Build | laptop (light work only) | `feature/anim-cleanup` | PR body and docs; its full e2e now runs on the desktop (orchestrator) | PR to master; the orchestrator merges |

## Next (in order)
1. **Anim clean-up into master** (Character Build): weapon handling to the real mounts, reload, hand shapes, traversal
   grips. `docs/anim-cleanup/`.
1b. **Process audit** (Character Build, laptop, light work, after 1; runs alongside 2; Michael, 2026-10-19): report first,
   cuts only after Michael approves. Every e2e suite with its time and what it covers for the training level (keep /
   merge / legacy / fix; e2e-coop and e2e-netmove must stop being "known flaky"); one test tier per kind of change;
   one set of session and prompting rules (CLAUDE.md, session-method, orchestrator, per-job STATE); stale docs
   archived. Opus, High; about half a day. Flaky suites (Michael, 2026-10-19): the audit finds each cause; then a fix
   job on the desktop makes e2e-coop, e2e-netmove and e2e-ctcourse reliable (all three fail alone on master bd59f32);
   flaky or failing suites outside the training level move to the legacy run instead of being fixed.
1c. **Phone launch, testing only** (Character Build, laptop, now; Michael, 2026-10-19): the phone launches the game,
   always minimum settings, no touch controls (Bluetooth pad), the display fits the iPhone screen; no time spent, no
   checks beyond CI's `npm run check`. Branch feature/phone-launch. CLAUDE.md's M21 line is updated in the audit.
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
| 2026-10-19 | #9 | CT prototype: posture, CT controls, selection wheel, 8-station co-op course, revive |

## Previews
- `/preview/` = `dev` = master (moved by the orchestrator after each merge).
- `/ct/` = `ct-movement` = `feature/ct-prototype` (moved by CT Core after each slice; frozen while Michael walks it).

## Dashboard
The orchestrator publishes this file as a page after every update, so Michael can check it from his phone. Git stays
the source of truth.
