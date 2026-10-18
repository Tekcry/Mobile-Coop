# Step 13 - perf-finish (Block C, then Pause C and the finish)
Measure and hold the menu stage to its budget (SPEC 8.4), finish the docs and open the PR. Deps: 12. Model: Opus 5.5 /
Opus 5.5. GPU and phone-look checks on Michael's PC.

## Read
- SPEC.md 8.4, 9; BRIEF.md section 7; `docs/systems/performance.md`; `scripts/perf.mjs` (modes, `--budget`,
  `LOCAL_BUDGET`), `scripts/perf-trend.mjs`.

## Task
1. `perf.mjs --menu`: boots to the main menu (no title), samples 20 s across at least two shot changes, reports main
   thread ms (p50 / p95), draw calls, triangles, worst frame, VRAM; `--phone` uses the phone look.
2. Budgets in `perf.mjs` and `docs/systems/performance.md`: desktop main thread <= 3 ms, <= 150 draws, worst frame on a
   shot change <= 33 ms, VRAM <= today's menu + 256 MB; phone look <= 80 draws, main <= 4 ms, 60 fps over a 3-minute
   warm hold; menu ready <= 1.5 s after boot "Ready" on the PC. Fix overruns (merge meshes, fewer shadow casters,
   phone list) before moving on.
3. Parity sweep: run the SPEC section 9 checklist on every screen in SPEC 7 through e2e-menus; record per screen x
   device PASS / exempt (layout editor = touch only) in REVIEW.md.
4. Docs: docs/systems/ui.md (final template, legend, Osk, parity rules), input-and-loop.md (menu table), progress.md,
   CHANGELOG (the run's version), TESTING.md (desktop and phone checklists for every screen), README in docs/menu-ui
   (status: implemented, pending Michael's review).
5. Remove leftovers: old menu CSS no longer used (`grep` each removed class in src and scripts), the `--accent` alias
   if unused, dead hint code.

## Tests
- Full `npm run e2e` (background) with e2e-menus required; `node scripts/perf-trend.mjs`; `E2E_GPU=1 node
  scripts/perf.mjs --menu --budget` and `--menu --phone --budget`; phone hold.

## Checks
- `npm run check`; full e2e; perf budgets above; grep proofs: no `backdrop-filter`, no runtime font fetch, no
  localStorage in src/ui, no static `src/net` import.

## Commit
"menu-ui 13: menu stage perf budgets, parity sweep, docs"
Then Pause C (STATE), and after "Menu UI: go" the finish in BRIEF section 7 (REVIEW.md, PR to master, never merge).
