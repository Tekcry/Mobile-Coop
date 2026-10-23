status: done feature/marlow-p4-a8-step-on 87dd8f39

# marlow-polish P4-1: A8 public stair, open the side step-on across the second tread (Night Shift | Marlow Build, 2026-10-23 ~21:25)
- Repo Tekcry/Mobile-Coop. Base: branch `feature/marlow-p4-a8-step-on` (pushed, = 17d44d96 on feature/marlow-polish). Build on it, push it yourself; trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
- Why: P2-3 (`git show 097eb946`, `docs/marlow-final/slices/P2-3.md` ruling 2, `docs/marlow-final/slices/P2-check.md` polish list) starts A8's stair collision rail at z 67.85 (`A8_STAIR_RAIL`, `src/world/maps/ctcourseSets/a8Strongroom.ts:170`, build loop ~:971), so a 0.6 m body can step onto the flight from the side only across the first tread (centre z <= 67.55). Move the rail start one tread up so the second tread opens too (the P2-3 report suggested z ~68.15). Keep the kit's 0.05 m snap, whole 0.55 m segments or a shorter last segment exactly as the loop already handles it, the head still meeting the balustrade ends at z 75, both sides (x 130.45 / 131.75).
- Only files: `src/world/maps/ctcourseSets/a8Strongroom.ts`, `tests/ctcourse/a8Strongroom.test.ts`, report `docs/marlow-final/slices/P4-1.md` (with a draft changes line). Do not touch `changes/feature-marlow-polish.md`, any `*.light.json`, wire or save.
- Tests: update P2-3's A8 rail tests (derived edits only, never a literal number in an existing assert except the ones that encode the rail start, each listed); the side step-on test must now walk in at the second tread's centre on both sides; step-off from the new start to the head still blocked (teeth: without the rail it walks off); lanes and `soloJumpThreats` stay as P2-3 left them.
- Run: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/ctcourse/a8Strongroom.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`. Unit tests only, no e2e, no npm run check.
- Done: branch pushed; report at the end of this file (change file:line, tsc, test counts, assert edits); status line "done feature/marlow-p4-a8-step-on <sha>". Unclear: `status: blocked <reason>`.

## Report (Marlow Build, local Sonnet)
See docs/marlow-final/slices/P4-1.md on the branch.
