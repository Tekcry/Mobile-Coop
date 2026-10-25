# light-parity - state

Owner: Night Shift | Sector Ops Build. Status: current.

## Resume (read this first)
- Job: FOLDED-PLAN J11 (break 22; CONFORMANCE L7 L8 V1-V5 V8, Test Runner T3). Branch `feature/light-parity`, folder
  `C:/NightShift/Mobile-Coop-light-parity`, base origin/master 2148ec969. Lead: Night Shift | Sector Ops Build.
- Docs: `BRIEF.md` (Michael picked Q27 "Yes, every release", Q26 "Freeze it", Q2 "Never", Q16 "Live now"; A1-A15),
  `PLAN.md` (claims section 2, slices section 3, wire section 4, suite section 5, walk card section 6, triage section 7).
- Phase: plan written; waiting for a fresh Opus plan checker (RULES "Intake" 4). No code yet.
- Slices (PLAN section 3), briefs in `briefs/`:
  - PR A `feature/light-parity-net`: N1 late-join hint (Opus, ~230) then N2 failed-lamp sync (Opus, ~400). Two Opus
    checkers; co-op group on the laptop (PLAN section 4).
  - PR B `feature/light-parity-suite`: C1 `e2e-parity` (Sonnet, ~700) then C2 train wiring (Sonnet, ~80). One Opus
    checker; three laptop proof runs before train-ready.
  - Q1 `parity` status on train heads: Test Runner (Sonnet, ~100), brief `briefs/Q1.md`.
  - PR C `feature/light-parity-triage`: T1 GPU triage (Opus, ~350; laptop alone request `lp-t1`).
  - Waiting: F1 (from T1; lamp side from J10), K1 (after F1 and J10's S1 re-bake). No briefs yet.
- Parallel once the plan checker passes: N, C, T1 and Q1 at once (no shared files).
- J10 links: F1's lamp side and K1 wait on J10's S1 re-bake; J10's light-file PRs will run `e2e-parity` once PR B lands.
- warehouseOps: frozen (Q26); V2 stays open (A1).

## Question for Michael (native multiple choice, recommended first; via the orchestrator)
Should the new light check stop a release while a known bad spot (today: one Saltmarsh S1 forecourt spot) waits for its
fix?
1. Yes, stop releases on any new miss; a known spot already being fixed is listed on every walk card with its fix date
   (at most a week), then it stops releases too (Recommended)
2. Report only until the known spots are fixed, then stop releases on any miss
3. Stop releases on every miss, known or not (no release until the S1 spot is fixed)
Assumed meanwhile: option 1 (BRIEF A2).

## For the orchestrator
- Walk card template: add the "Light parity" section from PLAN section 6 to `docs/templates/walk-card.md` (your file).
- Test Runner: start Q1 from `briefs/Q1.md` (on origin/feature/light-parity).

Next: start a fresh Opus plan checker on BRIEF + PLAN (head of feature/light-parity); on PASS start N1, C1, T1 and hand Q1 to Test Runner.

## Done
- 2026-10-25: BRIEF, PLAN, STATE, briefs N1 N2 C1 C2 Q1 T1 written (plan only, no code).
