status: done feature/marlow-p3-a2-stair-rail 9a9191a7

# marlow-polish P3-2: collision rail on A2's east stair (Night Shift | Marlow Build, 2026-10-23 ~20:15)
- Repo Tekcry/Mobile-Coop. Base: branch `feature/marlow-p3-a2-stair-rail` (already pushed, = afefe329 on feature/marlow-polish). Build on it, push it.
- Full brief: `docs/marlow-final/plans/POLISH-3.md` on origin/feature/marlow-polish (01714ee9), sections "Rules for every builder in this batch", "Slice P3-2" and "Lead rulings". Follow them exactly, except: you DO commit and push `feature/marlow-p3-a2-stair-rail` yourself (README flow), commit trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
- Only files: `src/world/maps/ctcourseSets/a2CarriageShed.ts`, `tests/ctcourse/a2CarriageShed.test.ts`, and your report `docs/marlow-final/slices/P3-2.md`. Do not touch `changes/feature-marlow-polish.md` (draft line in the report).
- Model reference: `git show 097eb946` (P2-3, A4 / A8 rails) and `docs/marlow-final/slices/P2-3.md`.
- Unit tests only: `npx tsc --noEmit -p tsconfig.json`; `npx vitest run tests/ctcourse/a2CarriageShed.test.ts tests/ctcourse/a4GoodsShed.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`. No e2e, no npm run check. Never edit a literal number in an existing test; derived edits only, each listed.
- Done: branch pushed; report at the end of this file (what changed with file:line, tsc result, test files with counts, assert edits, the measured east-end drop at the stair head); status line "done feature/marlow-p3-a2-stair-rail <sha>". A question the brief cannot settle: `status: blocked <reason>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
Built on afefe329 -> 9a9191a7. POLISH-3.md at origin/feature/marlow-polish fa95bc8c is byte-identical to 01714ee9's.
Full report + draft changelog line: `docs/marlow-final/slices/P3-2.md`.
- `a2CarriageShed.ts:107-112` new `A2_STAIR_RAIL = { z: 18.75, seg: 0.55, h: 1.1, from: 68.6, to: 62 }`; `:407-414`
  A2-17 builds 12 `kit.handrail` segments (`y: lineAt(xa)`, `h: h + lineAt(xb) - lineAt(xa)`, `group: G_STAGING`),
  visual rails kept; `:390` tally text; header `:28`, `:30-32`.
- `tests/ctcourse/a2CarriageShed.test.ts`: import `:53`; helpers `:990-1002`; new tests `:1004` (geometry: snap, 12
  segments, never inside the flight, no gap, >= 1.1 m over the line, ends x 62, invisible + noLedge, register, group 23),
  `:1042` (centre line and 0.3 m edge lane clear; side step-on x 69.45 / 69.2, z 18.0-19.3 clear; a body 0.1 m outside
  the open edge hits the rail x 62-68.6 and nothing without it = teeth), `:1071` (lanes clear; `soloJumpThreats` stays
  `[]`, a crate still bites). Mutation: 0 segments -> geometry and step-off tests fail.
- Assert edits (derived only, no literal changed): `:670-672` `stairRail` filter, `fillers` excludes it; `:698` title;
  `:706`, `:708` `+ stairRail.length`; `:849-851` kit glow `y >= A2_DECK.lip` skips the rail modules, `:854-857` asserts
  them (count = stairRail, group 23).
Tests: tsc clean before / after; eslint clean. a2CarriageShed 48 -> 51, a4GoodsShed 57, ctcourse 27, ctcourseLight
7 + 1 skip, facilityKit 18: 157 -> 160 (+1 skip), 0 failures. No `*.light.json` touched; no e2e.
Measured east-end drop at the stair head (not fixed, ruling 3): deck x 30-62, z 17.5-20, top 4.4; edge screen x 35-62,
z 17.5-17.6; rail head box x 62-62.55, z 18.7-18.8 -> the deck's east face at x 62 is open z 17.6-18.7: a 1.1 m wide,
4.4 m drop beside the stair head (a 0.6 m body fits). Pre-existing. One more handrail along x 62 at y 4.4 closes it:
lead's call.
Deviation: the step-on walk check against existing solids runs at x 69.44 (at 69.45 the body touches the east wall face
at exactly 0.30 m and float error reports blocked); the rail-only step-on check runs at 69.45 as briefed.
Open: the east-end drop ruling; laptop `e2e-ctcourse:1` after the batch.
