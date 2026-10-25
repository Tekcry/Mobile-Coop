# light-realism - STATE

## Resume block (2026-10-25 late evening)
- Job: FOLDED-PLAN J10 (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md` s3 rows 20-21, s4 J10). Lead: Night
  Shift | Sector Ops Build. Branch `feature/light-realism`, worktree `C:/NightShift/Mobile-Coop-light-realism`; branch
  base is older master (6c3f4a87): never merge master in; slice branches `feature/light-realism-<slice>` cut from
  origin/master.
- Phase: PLAN revision 1 done (plan check 1 was FIX, 4 items: `PLAN-CHECK.md:32-36`, kept as is). No code yet.
- Read: `BRIEF.md` (Michael's words, picks, A1-A13; A13 at `BRIEF.md:100-106`), `PLAN.md`, `research/bands.md`
  (band table, curve `level = 0.28 + 0.32 x log10(lux)` at `bands.md:19-23`), `SIGNOFF.md`.
- Fix 1, claims: fenced block `PLAN.md:44-66`; overlaps and proposed order `PLAN.md:72-97` (claims-check gives 6:
  coop-kit, guard-rules, map-ready, route-runs-2, sector-marks, char-shadow-meter; plus coop4 and its slice branches on
  `tests/campusS1-S5.test.ts` and the mission-engine branches on `tests/campusS1.test.ts`, no claims block). The
  orchestrator orders them; proposal: theirs first, L1 / L2 rebase.
- Fix 2, Q3 test: L0 reference test `PLAN.md:149-170` (one real 6 m column, 5 ground distances, RMS level error
  <= 0.03 = measured; else "chosen, not measured", A13); done line `PLAN.md:176-180`.
- Fix 3, sign-off: `SIGNOFF.md` (one question "Approve the band table and the S1 light map?"; A2 / A5 under
  "Changes first"); PLAN L1 points to it at `PLAN.md:204-216`. L1 fills its three "L1:" values.
- Fix 4, done lines: L2 `PLAN.md:239-244`, L3-W `:255-259`, L3-H `:271-273`, L4 `:283-285`, L5 `:294-297`.
- Notes added: warehouseOps frozen, no forced light fix (`PLAN.md:104-107`); e2e-darkness is the train light-parity
  check until J11's cards (J20; off switch `config/train-parity.json` on laptop-queue, not there yet) (`PLAN.md:108-113`).
- The S1 cause (PLAN section 0, `PLAN.md:20-42`): column lamps on their own pole tops (`campusS1.ts:232-233`,
  `:236-237`); the grown pole hides its lamp (`lampBake.ts:163`, `:25`, `:263-275`); no column over the south rows.
- Files owned elsewhere: `docs/sector-redesign/SPEC.md` (PR #433 first); `src/world/maps/campusV2/*` (J17);
  warehouseOps files (frozen, A1); ctcourse sets (Marlow Build).
- GPU: only through the laptop queue alone slot (`request.mjs ... --alone --step "serve scripts/light-realism/..."`).

Next: start a fresh Opus plan checker (`docs/templates/plan-check.md`, check 2) on BRIEF + PLAN at this head; on PASS brief L0 (Opus) on `feature/light-realism-l0`.

## Done
- 2026-10-25 ~09:08: S1 probe scripts (`scripts/light-realism/s1-grid.mjs`, `s1Grid.ts`, `s1-shots.mjs`), commit
  bd8b843e; grid output 4879884e.
- 2026-10-25 evening: BRIEF, research/bands.md, PLAN, STATE rewritten (J10 planner); S1 cause isolated with a scratch
  probe (no repo change).
- 2026-10-25 late evening: plan check 1 (FIX, 4 items) answered: PLAN revision 1 (claims block and order, L0
  reference test, done lines, J20 and warehouseOps notes), BRIEF A13, SIGNOFF.md.

## History
- The 09:08 save's planner output (BRIEF, PLAN, research, S1 write-up) was lost (CONFORMANCE L14); rewritten here.
