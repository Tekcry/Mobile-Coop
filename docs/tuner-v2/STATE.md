# Animation tuner v2 - state

## Now (2026-10-21 04:00)
Items 1-4 built and checked (CHECK1-4; one fix each for items 1 and 4), wired through Course Ready's section registry
(df00a947 merged; WIRE.md): tuner sections Joints, Hands & feet, IK strength, Weapon, Stepping, Keys. Laptop PASS on
a8aef532 (wired 1-2) and f2dabf8d (item 3); a3ea3e56 (item 4) requested; f06fd8f9 adds only the apply-tune.mjs guard and
docs. Defaults identity throughout. Waiting for #65 tuner-camera and #66 CT Core slices 4+5 to merge.

## Try first (for Michael)
- Stepping > run / crouchRun replant 0.8 fixes the stuck trailing foot (about 9 cm sooner, no slide). Defaults stay
  identity: his call (ITEM3.md).

## Next
1. (done) Items 1-4.
2. Merge order (orchestrator): #65 tuner-camera, then #66 CT Core slices 4+5 (edits footPlanner.ts), then tuner-v2.
   After #66 lands: merge master into feature/tuner-v2 keeping both sides (our 13 footPlanner read hooks + slice 4's
   planner edits), laptop check + e2e-anim, then the PR's full e2e.
4. PR to master (minor) with the "Try first" line; full `E2E_SUITE_TIMEOUT=900 npm run e2e` on its head (laptop).
3. (done) Bring in the section registry (feature/tuner-camera @ df00a947: `src/anim/tuneRegistry.ts`, registerTuneSection;
   docs/anim-tuner/STATE.md "Section registry (for other jobs)"), merge or cherry-pick only its registry commits; do not
   touch the camera section or the pad map. Wire items 1-2 through it (one commit), check; then items 3 and 4.

## Open

## Polish list (non-blocking)
- e2e-menus is about 60 s longer with the tuner asserts; 100-entry pickers for the per-weapon sections; no blend between
  gait rows at band edges; muzzle flash off a scaled gun's tip; gun scale carries to the next gun for about 0.2 s; no
  finger joints in the rig (one curl per hand).

## Done
- 2026-10-21: items 1-4, registry wiring, checks (see Now).
- 2026-10-21: worktree, BRIEF, STATE.

## Resume prompt
```
Night Shift | tuner-v2: RESUME. Folder C:/NightShift/Mobile-Coop-tuner-v2, branch feature/tuner-v2 (git pull --ff-only;
branch guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/tuner-v2/BRIEF.md,
STATE.md and docs/anim-tuner/STATE.md, and continue from "Now" / "Next" with docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort; lean tokens.
```
