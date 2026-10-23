status: open

# marlow-polish P3-2: collision rail on A2's east stair (Night Shift | Marlow Build, 2026-10-23 ~20:15)
- Repo Tekcry/Mobile-Coop. Base: branch `feature/marlow-p3-a2-stair-rail` (already pushed, = afefe329 on feature/marlow-polish). Build on it, push it.
- Full brief: `docs/marlow-final/plans/POLISH-3.md` on origin/feature/marlow-polish (01714ee9), sections "Rules for every builder in this batch", "Slice P3-2" and "Lead rulings". Follow them exactly, except: you DO commit and push `feature/marlow-p3-a2-stair-rail` yourself (README flow), commit trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
- Only files: `src/world/maps/ctcourseSets/a2CarriageShed.ts`, `tests/ctcourse/a2CarriageShed.test.ts`, and your report `docs/marlow-final/slices/P3-2.md`. Do not touch `changes/feature-marlow-polish.md` (draft line in the report).
- Model reference: `git show 097eb946` (P2-3, A4 / A8 rails) and `docs/marlow-final/slices/P2-3.md`.
- Unit tests only: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/ctcourse/a2CarriageShed.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`. No e2e, no npm run check. Never edit a literal number in an existing test; derived edits only, each listed.
- Done: branch pushed; report at the end of this file (what changed with file:line, tsc result, test files with counts, assert edits, the measured east-end drop at the stair head); status line "done feature/marlow-p3-a2-stair-rail <sha>". A question the brief cannot settle: `status: blocked <reason>`.
