# Check 3a - retired maps deletion (2026-10-17)

Verdict: **PASS** (two non-blocking notes below; neither needs another fix round).

## What was checked
1. Diff: 7 map files, `loopSchedule.ts`, 5 unit tests, 6 e2e suites and 6 helper scripts deleted; 9 design files
   `git mv`'d to `docs/archive/maps/design/`; 12 files modified (`index.ts`, `listed.ts`, `missions.json`, `noise.ts`
   comment, `run-e2e.mjs`, `session.ts`, `coopUi.ts`, 4 tests, archive README). All edits are what the deletion needs.
2. Leftovers: grep of `src/`, `tests/`, `scripts/` (incl. `e2e-times.json`), `index.html`, vite config, `public/` for
   exchange / trunkAnnex / trunk-annex / deadLine / dead-line / fp-map / fp-trunk / loopSchedule / the moved design
   file names: comments only (`enemyManager.ts`, `patrol.ts`, `noise.ts`, `nav.test.ts`, `index.ts`), Kestrel's
   "Dead Line" Mission 1 name, refinery's "heat exchanger", and `scripts/kestrel/render-top.mjs` naming the deleted
   `g1v2-plan.mjs` as its origin in a comment. Nothing imports or lists a deleted thing.
3. `src/editor/**`, `src/world/maps/kestrel*`, `src/security/**`, `docs/kestrel/**`, `scripts/kestrel/**`: unchanged.
4. Save safety: `SAVE_VERSION` 8 unchanged is correct. The only saved place a map / mission id lands is
   `profile.missions`, sanitised by any `^[a-z0-9-]{1,48}$` key (`src/save/schema.ts`); the Play screen looks records
   up by listed mission, so old `exchange-greybox` / `trunk-annex` / `dead-line*` records load and stay inert. No
   settings field stores a map id. Unknown autostart ids fall back to Proving Grounds (`getMap`).
5. Lobby default: `NetSession.mode` defaults to `infiltration`; `coopUi.connect` sets a host room to Infiltration with
   `MISSIONS[0]` (a Warehouse mission), or to `clear` (Hunter) with `?legacy=1`. Behaviour matches the pre-change path
   exactly. `tests/net.test.ts` asserts host and client start on Infiltration; `e2e-park` asserts a non-legacy room
   starts on Infiltration; `e2e-coop` (legacy=1) starts Hunter matches. The local course room
   (`autoLocalCourse`) sets `course` explicitly, so the default change does not reach it. No wire change.
6. `npm run check`: pass (lint 0 errors / 41 warnings, 133 test files / 1508 tests, build ok).
   `E2E_PORT=4191 E2E_JOBS=2 node scripts/run-e2e.mjs --quick` (26 suites): all ok except e2e-coop, e2e-touch, e2e-pad
   (KNOWN FLAKY) and e2e-kestrel (Kestrel-owned pre-existing: camera rays along the tour). e2e-coop failed on the
   "offline state" selector (the same failure the implementer saw) and passed in a solo rerun (76 s). Port 4191 freed.
7. Deletion log matches the diff (file lists, ids, REQUIRED / COVERS edits, mission count 10 = 4 Warehouse + 6 parked,
   wire / save notes), except note 1.

## Non-blocking notes
1. Log accuracy, "Kept on purpose": "The manhole interactable and `MANHOLE_LIFT_NOISE_RADIUS`: the bunker shaft and
   Kestrel blocks use them" is wrong. No `src/` code reads `MANHOLE_LIFT_NOISE_RADIUS` (only `tests/holdNoise.test.ts`;
   at HEAD only the now-archived design scripts did), no remaining map sets `Interactable.holdNoise`, and the bunker /
   Kestrel only mention manholes in data text and comments.
   Done looks like: the line says the generic hold-noise path (`Interactable.holdNoise`, `holdNoisePulse`) is kept, and
   `MANHOLE_LIFT_NOISE_RADIUS` is kept with no runtime user (its only reader was the archived Dead Line design scripts),
   or the constant and its test assertion are removed and the log says so.
2. The `?legacy=1` keeps Hunter branch in `coopUi.connect` has no unit test (DOM code); it is covered by e2e-coop
   starting Hunter matches under `legacy=1`. Acceptable as is.
