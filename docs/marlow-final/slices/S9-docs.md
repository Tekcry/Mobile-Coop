# S9-docs - slice 9 documentation (marlow-final)

Date 2026-10-23. Docs only; nothing run (no tsc, vitest, e2e). Not committed (the job lead commits). Continues the
stopped docs agent's work (TESTING.md and testing-tools.md were already committed in 63e3e892).

## Files and what each covers
| File | Change |
| --- | --- |
| `TESTING.md` | The per-set manual checklist A1-A8 (pad first, then keyboard and mouse; 2-player) from the slice reports; this pass added two items: the records line (old best times S1-S8 gone, "Start at" lists A1-A8) and a timing item (15-20 min target, per-set times). The old station checks (camera range, cameras and lasers, laser panels, scanners, guard info) were already repointed to A3-A8. |
| `docs/systems/testing-tools.md` | Already finished by the earlier agent: `e2e-ctcourse` parts :1-:4 and the sets each walks, the set modules in `scripts/e2e-ctcourse/`, per-set steps, the Marlow unit tests, `CTLIGHT_WRITE` / `CTLIGHT_PRINT`, `shots-ctcourse` vantages, `guard-cap`. Checked against `run-e2e.mjs` (PARTS has `'4'`). No edit this pass. |
| `docs/systems/coop.md` | New section "Marlow Yard co-op items (marlow-final, N1-N9)": each item, its rule, wire field and protocol (N1 flags `obj:<id>` and `role:<bay>:A=P1\|P2` on `PackedCourse.flags`; N2 `gates[].t` / `tb` and `lights.groups`; N3 flag set / clear; N4 `NetItem.hn` and `use.pulse`; N6 `sec.sc` per pair; N7, N8, N9; N5 and N10-N14 not built or kit-only), the client use-reach rule, and the `staleSupport` controller note. The A3 send-back bullet now says A3 instead of "station 3". The protocol 33 history line was already there. |
| `docs/archive/course-ready/WALKTHROUGH.md` | Rewritten for A1-A8: start steps kept; reading the screen (no pads, A / B lines, claim, timed windows, holding-room pads); per set the exercise, who does what and the objective lines (word for word from the set modules); health and revive; stuck notes and known open items. |
| `changes/feature-marlow-final.md` | The fragment: what players get, the new devices and protocol 33, fixes, tests, the old-best-times note (decided in SPEC section 16: no `SAVE_VERSION` bump, bay ids S1-S8 become A1-A8, old best times orphan), P1-P17 one line each with undo, the polish pointer. |

## Gaps I could not fill from the docs
- **A8 dressing.** `S8.md` has no "Dressing" section yet (step 5 not done). The walkthrough and TESTING A8 item cover the
  greybox route only; WALKTHROUGH marks "A8 dressing: see S8.md Dressing".
- **Timing table.** SPEC section 10 is the design estimate. No measured per-set times exist (e2e teleports; no
  playtest), so TESTING and WALKTHROUGH state the 15-20 min target only. `e2e-times.json` is still the 150 s per part estimate.
- **Slice 9 work not done by docs:** revive on each co-op surface (A1 yard, A2 staging, A6 gallery, A8 gallery) and the
  ghost run with every bonus are not in `e2e-ctcourse` (only the cash-dock revive); the testing-tools text says so. GPU / perf
  "after" numbers, `npm run e2e:gpu`, the contact sheet and the master merge are pending laptop runs.
- **A1 yard wording.** WALKTHROUGH's "the cabin switches turn the yard lamps and cabin panel off" follows the SPEC A1
  sheet (groups 12 and 13); not re-checked against the built set.
- **Walkthrough details from the SPEC, not the built sets:** A5 "do it while the patrol's back is turned", A6 attendant
  timing and the staff stair, the A8 "mark at the vestibule" (the e2e leg-up mark is (109.5, 68.25)). Treat as design wording
  until Michael's walk.
- **STATE.md** is the job lead's file; not edited.
