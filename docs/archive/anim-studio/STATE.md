# anim-studio - state

## Now
- PR 1 merged as 4.26.0 (#69; laptop full e2e PASS on c55adaec).
- PR 2 (2026-10-21, branch `feature/anim-studio-2`, folder `C:/NightShift/Mobile-Coop-anim-studio-2`):
  - built (cf8e0f40, REPORT-2.md);
  - check PASS (CHECK-2.md, no blockers);
  - `npm run check` green (2255 tests), e2e-studio ok (24 s);
  - desktop e2e:quick running.

## Next
1. Merge origin/master (4.27.0: the #69 version, the #70 Weight hooks around animate in player.ts) into
   feature/anim-studio-2; resolve; tsc, the studio / anim tests and e2e-studio.
2. Push and open PR 2 to master (minor). Send Character Build the head for check + full e2e (copy the orchestrator),
   and message the orchestrator with the head.
3. Then the bake script `scripts/anim-tune-bake.mjs` (docs/anim-tuner/STATE.md "Plan after tuner-camera", item 3):
   - writes an export into the code defaults;
   - leaves the sliders at identity afterwards;
   - prints a diff on a dry run;
   - has tests on a sample export.

## Open
- e2e-studio `trav:ladder` may flake: one jump has to land within 8 s (CHECK-2.md). If it does, allow about 24 steps.
- Polish lists: CHECK.md, CHECK-2.md, REPORT.md, REPORT-2.md. The traversal input scripts are unverified in a browser.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-studio. Folder C:/NightShift/Mobile-Coop-anim-studio-2,
branch feature/anim-studio-2 (PR 2 to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-studio-2 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-studio-2 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-studio-2"
Read CLAUDE.md, docs/anim-studio/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator".
Heavy runs only under C:/NightShift/heavy.lock (create only if absent; delete only your own line).
```
