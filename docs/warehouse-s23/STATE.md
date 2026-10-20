# Warehouse sections 2 and 3 - state

**Now:** RESUMED 2026-10-20 18:33. Lowest priority; movement work (CT Core) comes first for the desktop lock and the
laptop (Michael via the orchestrator, 2026-10-20): yield at the next step boundary. Lean on tokens (Michael): grep and
line ranges, short prompts and reports.
- Section 1 lamp pass (7b7afda9); section 2 greybox (f4facc1d), checker PASS (`check-s2.md`); section 3 sheet (ea5332a6).
- Lamp fix round done (6f0ca54e, `step-lampfix-report.md`): S1 / S2 route points and takedown spots 0.40-0.55, decision
  points 0.45-0.55, work areas to 0.80, pockets 0.30 or less; both light tests assert a max per class (0.02 tolerance);
  hyp2. S1 fire-lobby exit-sign lamp dropped (column cap). Takedown margin not reached with waits alone (open).
- Section 3 greybox: Sonnet implementer running (report `step-s3-report.md`).
**Next:**
1. Section 3 greybox from `BUILD-S3.md` (Sonnet implementer; new `warehouseS3.ts` and a switch like section 2's; its
   light test; re-read warehouseS2Light's C3 points and its two deck points at y 2.6 after section 3 lands; `navLayers: 4`
   on warehouseOps if the e2e nav check misses deck or office cells), fresh Opus checker (also covers the lamp fix round
   6f0ca54e), at most one fix round.
2. `npm run check` + `smoke e2e-sectorops e2e-ctcourse` on the head (desktop under the lock when it is absent and CT
   Core is not waiting, else the laptop through the orchestrator); CHANGELOG entry ("Unreleased - warehouse-s23");
   `WALK.md` for sections 2 and 3; the PR to master (a minor step); the full `npm run e2e` on its head through the
   orchestrator; a message to the orchestrator.
**Open:**
- Section 2 takedown margin: the tour guard passes the committed phase test at exactly 3.0 s; under 20 other seeds the
  worst for the tour guard and the checker is 1.75 s (`check-s2.md` 2); waits alone reach 2.0 s at best (lamp fix round).
  Next lever is geometry (a pallet at the A1 mouth), after Michael's walk.
- Section 2 C2 far door leaf stands across the checker's lane when open (walk or e2e check).
- GPU look of all lamps: pending a PC walk (route 1 with NV off; circuits 30 / 32 / 34 switches).
- Night vision (Michael M1) is a separate job: no NV change here.
- Pre-existing: the co-op client never draws any guard's flashlight (torch state not on the wire).

## Michael's answers and decisions in force
- warehouse-redesign (`docs/warehouse-redesign/BRIEF.md`): M1 overhaul for fun, realistic flow; M2 spec all 3, build 1;
  M3 "Loosen where needed"; M4 one build in master; M5 lowest priority on the desktop when nothing else runs; M6
  section 1 merged (4.14.0). Loosenings L1-L15; A2-A7 (isolation-in-time takedown check, patrol waits and facings, the
  section 1 start, heavies in sections 2-3 until rebuilt (section 2 now has none), 8 guards in section 1, fallbacks).
- This job (`BRIEF.md`): M1 section 1 walk ("section 1 is ok, better than before at least but not perfect. Its hard to
  tell, the night vision is so poor..."; the direction holds; the lamp pass is in this PR). L16 header pipe. A1
  node_modules junction, A2 sheet before code, A3 x -4 wall 6.0 m, A4 west and north parapets, A5 A2 ladder, A6
  section 2 sheet adjustments, A7 section 3 north and east parapets, A8 section 3 sheet adjustments.

## Done
- 2026-10-20: lamp fix round (6f0ca54e); tsc, ESLint, 7 Vitest files 76 passed, 2 skipped.
- 2026-10-20: section 3 build sheet (ea5332a6).
- 2026-10-20: section 2 greybox (f4facc1d), checker PASS (c08465ca), laptop green on f4facc1d.
- 2026-10-20: section 2 build sheet (1221b7e7); section 1 lamp pass (7b7afda9): 23 lamps, route points 0.12-0.30 ->
  0.45-1.0, dark pockets at or below 0.30; tsc, ESLint, 6 Vitest files 65/65.
- 2026-10-20: branch `feature/warehouse-s23` from master cf73f8b5 (4.14.0); node_modules junction (A1).

## Resume prompt
```
Night Shift | Warehouse S2-S3. You are the job lead for the warehouse-s23 job (Sector Ops Warehouse sections 2 and 3
rebuilt to docs/warehouse-redesign/SPEC.md 2.2 / 2.3, plus section 1's lamp pass; lowest priority). Work only in
C:\NightShift\Mobile-Coop-warehouse-s23 on branch feature/warehouse-s23 (git pull --ff-only first; node_modules is a
junction, never npm ci). Read CLAUDE.md ("Sessions"), docs/ROADMAP.md, then docs/warehouse-s23/STATE.md and BRIEF.md,
and only the parts of docs/warehouse-redesign/BRIEF.md and SPEC.md, BUILD-S3.md and check-s2.md that STATE "Next" names.
Carry on from STATE "Now / Next": the lamp fix round (wip-lamp-fix.patch or fresh), then the section 3 greybox, with a
Sonnet implementer and a fresh Opus checker, at most one fix round (docs/systems/session-method.md). Heavy runs only
under C:/NightShift/heavy.lock when it is absent and CT Core is not waiting, one step at a time, released straight
after; otherwise light commands only and suites to the laptop through "Night Shift | Orchestrator". Keep STATE current.
When done: walk guide, push, the PR to master (a minor step), message the orchestrator.
```
