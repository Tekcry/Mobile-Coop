Stage P03B Part 1g-c - brief 7 adjacency, must not touch, and the Part 1 questions list.
Model: Opus, medium effort.
Decisions: 9 (brief 7 must-not-touch items U01-U08 at zone level, and the section 10 list)

## Rules for this session
- Two short deliverables in docs/kestrel/03B-block-plan.md: 9.2 "Must not touch" (table, notes, self-check; at most 45 lines) and section 10 "Open questions and notes" (at most 40 lines), which closes Part 1. The check script is ready (section 5); do not change it unless it has a bug, and say so.
- Zones only (Michael, 2026-10-11): judged at zone level. P04 places rooms and doors; what P04 must keep goes in the P04 column.
- Candidate-first (RULES 7): write the candidate in your first reply, run the check, fix failures one at a time, rerun after each fix, commit after each improvement. A failure you cannot fix: write it as ASK with options (recommended first, RULES 9 4a) and stop.
- Realism first: would a real architect accept each relation, and does it keep stealth flow. Do not move zones; a zone change is a Revision prompt (or P03R). Do not ask Michael about sizes.
- Budget about 14 tool calls. Commit and push after 9.2, again after section 10.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: progress.md P03B row shows "DRAFT (parts 1a-1g-b)"; 03B has 9.1 and no 9.2 or section 10; `node scripts/kestrel/p03b-adj-check-g.mjs docs/kestrel/03B-block-plan.md` prints `apart rows 0, items 0 of 8` and `fails 0`. If not, stop and report.
3. Read docs/kestrel/RULES.md section 7 ("Task size" and "Reading and checking") and section 9 only.

## 1. Read only these
- docs/kestrel/02-building-brief.md section 7, lines 315-321 (must not touch).
- docs/kestrel/03B-block-plan.md (grep -n '^##' for line numbers): the zone rows the candidate names (3.3, 4.3, 5.2, 6.1), then for section 10 only the notes and deviations: 1 "Deviations from the brief", 3.4, 3.5, 4.4, 4.5, 5.3, 5.4, 6.3, 6.4, 7.1 and 7.2 notes, 8.2, 9.1 notes.
- docs/kestrel/handover.md "Notes for the next stages" lines on P03R (for section 10 only; do not edit handover).

## 2. Items (planner, 2026-10-11; brief 7 line numbers)
| Item | Brief 7 | Must not touch |
| --- | --- | --- |
| U01 | 316 | either lift shaft and any zone 4 or 5 room, or a slab-walled room other than its own lobby |
| U02 | 317 | BG20 and the yard or BG05 (only BG09's equipment door joins the hall to the ground floor) |
| U03 | 318 | BF07 and any goods door (AG08, BG07, BG09) |
| U04 | 319 | corridor voids and AG11-AG13, AG22, AG24, AF02, AF04-AF06, AF10, AF11 |
| U05 | 320 | BG28 and BG20 by a door |
| U06 | 320 | the generator wing and B's walls |
| U07 | 321 | a zone 1 or 2 room and AG11-AG13 |
| U08 | 321 | the vault and any building footprint |

Zone 4 or 5 rooms (brief 5): AG23, BG13, BG20-BG27, BG29-BG33, BF07-BF10. Zone 1 or 2 in A: AG01-AG03, AG08, AG09.

## 3. Known points (planner, 2026-10-11; not failures, write each in the notes)
- U01: brief 7 also asks each lift beside its main stair (9.1 J10, J11), and stairs are slab-walled. Read U01's "slab-walled room" as any room other than its own lobby and its own main stair. Lift B's shaft shares 2.0 on z 46 with riser B (BG15 / BF12, slab-walled): no opening, so the rule's reason ("lifts serve staff floors only") holds; lifts and risers sharing a core wall is normal practice (general knowledge). Relation `door`; P03R tidies brief 7's wording.
- U04: voids lie over the corridor zones only. A face is allowed (relation `apart`): the room's wall runs to the slab and closes the void. N17 is a corner contact, face 0.
- U05: BG28 shares B-GHPLANT with BG24, which must face the hall (9.1 J21). Relation `door`: BG28's only door is to BG10 (J27).
- U08: the vault T-VAULT [40, 24, 48, 30] meets A's footprint at one corner point (x 40, z 30). Relation `gap 0.0`. Recommend, for P03R: move the vault and manhole 1.0 east (vault x 41-49, TB02 x 49-50.5); TB03 still meets the vault over x 41-43 (2.0), TB04 still starts at the vault, and the vault stays under open yard in front of the gap. Put it in section 10 for P03R, not as a question to Michael.

## 4. Candidate to verify (planner test run on a copy: `adjacency rows 34, items 14 of 14, apart rows 26, items 8 of 8, rects 114, fails 0`; a negative test with a same-level `level` row, an overlapping `apart` row, a wrong gap, a touching `none` row and a missing item gave 7 fails)
### 9.2 Must not touch
| Id | Item | Rooms | Zones | Relation | Result | P04 | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| N01 | U01 | AG19 / AG23 | K-LIFT / G-EAST | none | 4.5 across G-ELINK | - | brief 7 |
| N02 | U01 | BG03 / BG13 | KB-LIFT / B-GE | none | 3.5 across BG05 | - | brief 7 |
| N03 | U01 | BF03 / BF07 BF08 BF09 BF10 | KB-LIFT / B-FSEC | none | 3.5 across BF01 | - | brief 7 |
| N04 | U01 | BG03 BF03 / BG15 BF12 | KB-LIFT / KB-RISER | door | 2.0 on z 46, x 55-57 | no opening between shaft and riser | brief 7; 6.1 |
| N05 | U02 | BG20 / X04 | B-GHALL / S-YARDB | none | 6.0 across BG29-BG33 | - | brief 7 |
| N06 | U02 | BG20 / BG05 | B-GHALL / B-GCOR | none | 9.5 across B-GGOODS and B-GE | hall doors on x 70 only the equipment door (z 36-43) and the well (z 43-50.5) | brief 7; 9.1 J16, J18 |
| N07 | U03 | BF07 / AG08 | B-FSEC / G-GOODS | none | 20.5 across the gap | - | brief 7 |
| N08 | U03 | BF07 / BG07 BG09 | B-FSEC / B-GGOODS | level | F over G | mantrap doors only to BF06 and BF08 | brief 7 |
| N09 | U04 | AG10 / AG11 AG12 AG13 | G-SPINE / G-SEC | apart | 12.0 on z 43.5 | void stops at the suite's wall | brief 7 |
| N10 | U04 | AG26 / AG11 AG12 AG13 | G-NCOR / G-SEC | apart | 12.0 on z 50.5 | void stops at the suite's wall | brief 7 |
| N11 | U04 | AG10 / AG22 | G-SPINE / G-EAST | apart | 5.5 on z 43.5 | - | brief 7 |
| N12 | U04 | AG26 / AG22 | G-NCOR / G-EAST | apart | 5.5 on z 50.5 | - | brief 7 |
| N13 | U04 | AG26 / AG24 | G-NCOR / G-NE | apart | 20.0 on z 54 | - | brief 7 |
| N14 | U04 | AF01 / AF02 AF05 AF06 | F-SPINE / F-OPS | apart | 25.5 on z 40 | - | brief 7 |
| N15 | U04 | AF01 / AF04 | F-SPINE / F-BW | apart | 12.0 on z 43.5 | - | brief 7 |
| N16 | U04 | AF21 / AF04 | F-NCOR / F-BW | apart | 12.0 on z 50.5 | - | brief 7 |
| N17 | U04 | AF01 / AF10 | F-SPINE / F-PLANT | apart | 0 (corner at x 36.5, z 43.5) | - | brief 7 |
| N18 | U04 | AF21 / AF10 | F-NCOR / F-PLANT | apart | 3.5 on x 36.5 | - | brief 7 |
| N19 | U04 | AF21 / AF11 | F-NCOR / F-NE | apart | 15.5 on z 54 | - | brief 7 |
| N20 | U05 | BG28 / BG20 | B-GHPLANT / B-GHALL | door | 26.0 on z 50.5 | BG28's only door to BG10 (J27); BG24's reader door to the hall | brief 6, 7 |
| N21 | U06 | BG40 / BG10 BG12 | W-GEN / B-GN | none | 2.0 across X07 | - | brief 7; 5.2 |
| N22 | U06 | BG40 / BG24 BG28 | W-GEN / B-GHPLANT | none | 2.0 across X07 | - | brief 7; 5.2 |
| N23 | U07 | AG01 AG02 AG03 / AG11 AG12 AG13 | G-FRONT / G-SEC | none | 3.5 across AG10 | - | brief 7 |
| N24 | U07 | AG08 AG09 / AG11 AG12 AG13 | G-GOODS / G-SEC | none | 9.66 | - | brief 7 |
| N25 | U08 | TB01 / AG08 AG09 | T-VAULT / G-GOODS | gap 0.0 | 0.0 (corner point x 40, z 30) | - | brief 7; 5.3 |
| N26 | U08 | TB01 / BG01 | T-VAULT / B-GW | none | 4.0 across X05 | - | brief 7 |

Relations (the script's rules, 9.2 only): `none` plan gap above 0 (Result starts with the gap); `apart` no plan overlap, a shared face allowed (Result starts with the face length); `door` a shared face allowed, P04 puts no door in it (Result starts with the face length); `level` the two zones are on different levels by zone id; `gap <n>` a known gap. `same`, `face`, `above` and `line` are refused in 9.2.

## 5. Check scripts
- `timeout 60 node scripts/kestrel/p03b-adj-check-g.mjs docs/kestrel/03B-block-plan.md` (must say `items 14 of 14`, `items 8 of 8` and `fails 0`).
- Rerun, all must say fails 0: `timeout 60 node scripts/kestrel/p03b-path-check-g.mjs docs/kestrel/03B-block-plan.md docs/kestrel/routes.md` (path), `timeout 60 node scripts/kestrel/p03b-ring-check-f.mjs docs/kestrel/03B-block-plan.md` (F), `timeout 60 node scripts/kestrel/p03b-vert-check-e.mjs docs/kestrel/03B-block-plan.md` (E), `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md` (A), `timeout 60 node scripts/kestrel/p03b-zones-check-b.mjs docs/kestrel/03B-block-plan.md` (B), `timeout 60 node scripts/kestrel/p03b-zones-check-d.mjs docs/kestrel/03B-block-plan.md docs/kestrel/02-building-brief.md` (D). Planner test on the copy: path `total 495.7, placed 6, open 7, fails 0`; F `fails 0, info 2`; E `fails 0, info 2`; A, B, D `fails 0`.
- Run from the repo root. Never write that a check passed unless you ran it on the real files.

## 6. Write
03B, after 9.1's deviations line and before Appendix A:
1. "### 9.2 Must not touch": the table (verified), "Notes for P04 and P03R:" (the four points of section 3, one line each, plus any realism point you find), "Self-check (this session):" adjacency, path, F, E, A, B and D summary lines, "Deviations:" or "none".
2. "## 10. Open questions and notes": one table `| Id | From | Item | For | Recommended |`, rows Q01 on. Gather every point still open from the sections listed in step 1 (for P03R, P04, P06 or Michael), one row each, merging duplicates; drop points already settled by a later part or by Michael (say which in one line under the table). For is one of Michael, P03R, P04, P06. Recommended is one short line; a recommendation never leaves a brief requirement unmet (RULES 9 4a).
3. Line 2 of the file: "Status: DRAFT (Part 1 done; Part 2 blocks JSON next)".

## 7. Self-check (from commands; paste the summary lines)
- Adjacency: `adjacency rows 34, items 14 of 14, apart rows <n>, items 8 of 8, rects 114, fails 0`; path, F, E, A, B and D 0 fails.
- Every 9.2 row has a source; each relation is real for a building of this kind; every known point of section 3 is in the notes.
- Section 10: each listed source section was read; count rows per For; no row duplicates another.

## 8. Questions for Michael
Only realism or stealth-flow questions from section 10 whose For is Michael, at most 3, via the multiple-choice tool (2-4 options, recommended first with a one-line reason). Write his answers into the row (dated). If none, say so.

## 9. End (RULES 9)
- progress.md: P03B row "DRAFT (Part 1 done)", commit, date; one log entry of at most 6 lines.
- lessons.md: one line.
- Commits "kestrel P03B 1g-c: adjacency must not touch" and "kestrel P03B 1g-c: Part 1 questions list"; push.
- Report in at most 8 lines, then the Next step block:
Next step:
1. Type /clear.
2. Stay on Opus, medium.
3. Send the prompt below:
```
Planner: next
```
