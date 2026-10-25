status: open
# campus-greybox s2 (cloud): Saltmarsh Park v2 greybox lane, data + unit tests

Lead: Night Shift | Sector Ops Build. Job campus-greybox (FOLDED-PLAN J17, ROADMAP Now row 16). Plan checked (checks
1-2, accepted by the lead 2026-10-25 ~20:40); V2-SEED done at 024c7c172.

- Base: `origin/feature/campus-greybox` @ 024c7c172989f1c8bf938b02459940ec63e4febe. New branch: `feature/campus-greybox-s2` (create it from the base and push it; never push to
  feature/campus-greybox; the lead merges / PRs it).
- The strict brief is `docs/campus-greybox/briefs/S2.md` on that base, with the job's BRIEF.md and PLAN.md. Scope for this
  cloud brief: slices G1, G2, G3, G4, G6a, G5a, G5c, G6b in the brief's section 8 order, built one after another on this one branch (the desktop's parallel G6a worktree is not needed here). Not G5b (dormant after Michael's Q21) and not TAG-2 (waits for #317).
- Cloud changes to the brief:
  - Ignore its desktop worktree path and branch guard; your guard is
    `test "$(git rev-parse --abbrev-ref HEAD)" = feature/campus-greybox-s2`.
  - Its owned-file list and never-touch list are exact. Where it says "stop and ask the lead", set `status: blocked <reason>`
    and stop that slice (finish any earlier slice first).
  - Unit tests only: `npx tsc --noEmit -p .` (or `npm run typecheck:fast`) and the brief's single vitest files with
    `--maxWorkers=2`. Every e2e, GPU, level-measure or screenshot leg it names is "pending PC run": list it, do not run it.
  - Commit and push each slice (and each sub-step of a long slice) on `feature/campus-greybox-s2`, path-limited, never `git add -A`.
- Done: every in-scope slice pushed on `feature/campus-greybox-s2`; a report `docs/campus-greybox/checks/s2-build.md` (per slice: files
  changed, tests with counts, assumptions taken with their undo, deviations, pending PC runs); then
  `status: done feature/campus-greybox-s2 <sha>` here.

## Answer (Night Shift | Sector Ops Build, 2026-10-25 ~22:00): G5c block, take option 1
Resume from the branch head (ba9283143: G1-G4, G6a, G5a done and pushed; do not redo them). Then:
- **G5c-0 (new, before G5c):** re-cut the rooms so every enclosed space is its own RoomDef, then run G5c's rule
  unchanged on the new list. Add to `S2_ROOMS` (`s2.ts`), boxes from the PG areas in `docs/campus-greybox/PLAN.md` /
  the S2 brief's plan table (the same way BA2 cut L1): `s2-l1-mr1`, `s2-l1-mr2`, `s2-l1-mr3` (carved out of l1sw /
  l1north, so those shrink), and on L2 `s2-l2-exec`, `s2-l2-offa`, `s2-l2-offb`, `s2-l2-board`, `s2-roof-plant`, plus
  L2 strip twins of l1west / l1south / l1east (`s2-l2-west`, `-south`, `-east`) with l2north / l2sw / l2wing shrunk to
  what is left. No RoomDef for the void, the mail-lift shaft or the cores (they stay inside their parent boxes, as now).
  You may edit `s2Dress.ts` `S2_ART_TAGS` for the new ids only (tags as their L1 twins: meeting rooms and offices
  'office-cell', strips 'office-open', board room 'office-cell', roof plant room 'plant'). Where a PG area gives no exact
  line, cut on the wall centre line built in G3 / G4 and log an A-G5c-n assumption with its undo.
- **G5c:** the rule as written, on the new list; `roof` (the open roof) is exterior: excluded, no fitting hangs there.
  The void, the shaft and the cores are excluded as the brief says. Test: every new enclosed room (MR1-MR3, exec,
  offices A / B, board room, roof plant room, the L2 strips) has a lit fitting inside it; no fitting above 13.2 or over
  the void.
- Then G6b as the brief. Your findings (D-G1-1, F-G2-1/2, F-G3-1/2, F-G4-1, A-G4-1..3) are accepted as built; F-G3-1
  (sunshade lip over reachable ground) goes to the walk / route-runs, no change now.
Why option 1: G329 "no lit place left unlit" and guard-ai `lightsOut` reads "a fixture in the room he stands in", so
each enclosed room needs its own box (Sector Ops Build assumption A-J17-S2-1; undo: drop the new RoomDefs and their
fittings, option 2 instead).
