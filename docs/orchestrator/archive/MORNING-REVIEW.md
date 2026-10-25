# Morning review (2026-10-23)

Everything here was applied overnight as an assumed decision (Michael 01:42 "Apply, logged and undoable"); each job's
list has the undo per item. Read the spec first, then the list.

| Job | Spec / plan | Applied list | Where it stands |
| --- | --- | --- | --- |
| Marlow Yard redesign (Menu Notes) | origin/feature/marlow-final docs/marlow-final/SPEC.md, PLAN.md | docs/marlow-final/STATE.md "MORNING-REVIEW" (P1-P17, LR1-LR12) | slice 0 done (new facility, 8 stub sets walk end to end); set A1 in its fix round; the client switch-press "bug" was the test (client out of reach), fixed in the test |
| Lighting rules, all maps | origin/feature/marlow-final docs/archive/lighting-review/PROPOSAL.md | LR1-LR12 (level-design.md text not edited; wording ready in section 3) | applied in Marlow and the campus spec only |
| Sector Ops campus (Course Ready) | origin/feature/sector-redesign docs/sector-redesign/SPEC.md, PLAN.md | docs/sector-redesign/STATE.md "MORNING-REVIEW" (A23-A63, P1-P10) | slice 0 + L (co-op light sync) checked; S1 greybox built unchecked; a team-door nav regression to fix; Warehouse kept |
| Guard AI | origin/feature/guard-ai docs/guard-ai/PLAN.md | docs/guard-ai/BRIEF.md A2-A11 | S1 hearing in 4.66.0; S2 incident board has one regression (search no longer converges) |
| Guard render cost | PR #180 guard-cap report | guard-render A1: no-perf-tuning rule lifted for guard drawing only | 12 visible awake guards = 27 fps at Epic on the 4090; plan due today |
| Mocap | origin/feature/mocap-trial-2 docs/mocap-trial/CHECK-5.md | A5 crouch blend, A7 strafe / wall to batch 2 | default ON waits for the foot-contact fix (round F) |
| Camera range (#177) | PR #177 | held: a floor pad reads darker with it (1.00 -> 0.60 / 0.84), being explained | not merged |
