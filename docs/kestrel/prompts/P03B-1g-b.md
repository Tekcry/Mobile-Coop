Stage P03B Part 1g-b - brief 7 adjacency, must touch.
Model: Opus, medium effort.
Decisions: 14 (brief 7 must-touch items T01-T14, each judged at zone level)

## Rules for this session
- One deliverable: section 9 "Adjacency" of docs/kestrel/03B-block-plan.md with 9.1 "Must touch" (table, notes, self-check), at most 50 lines. The check script is ready (section 5); do not change it unless it has a bug, and say so.
- Zones only (Michael, 2026-10-11): an item is met at zone level when its rooms share one zone, their zones share a face of at least 1.0, or (for "above" / "under") their plans overlap. P04 places the rooms inside the zones; write what P04 must keep in the P04 column.
- Must-not-touch (brief 7 lines 315-321) and the P03B questions list are Part 1g-c. Do not start them.
- Candidate-first (RULES 7): write the candidate in your first reply, run the check, fix failures one at a time, rerun after each fix, commit after each improvement. A failure you cannot fix: write it as ASK with options (recommended first, RULES 9 4a) and stop.
- Realism first: for each item, would a real architect accept this relation, and does it keep stealth flow. Do not move zones; a zone change is a Revision prompt. Do not ask Michael about sizes.
- Budget about 12 tool calls. Commit and push after the table.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: progress.md P03B row shows "DRAFT (parts 1a-1g-a)"; 03B-block-plan.md has section 8 (8.1, 8.2) and no section 9; scripts/kestrel/p03b-adj-check-g.mjs exists. If not, stop and report.
3. Read docs/kestrel/RULES.md section 7 ("Task size" and "Reading and checking") and section 9 only.

## 1. Read only these
- docs/kestrel/02-building-brief.md section 7, lines 300-313 (must touch).
- docs/kestrel/03B-block-plan.md (grep -n '^##' for line numbers): 3.2, 3.3, 4.2, 4.3, 4.4, 5.2, 5.3, 6.1. Only the rows the candidate names.

## 2. Items (planner, 2026-10-11; brief 7 line numbers)
| Item | Brief 7 | Must touch |
| --- | --- | --- |
| T01 | 302 | AG11 with AG12 and AG13; all three open only to AG10 |
| T02 | 303 | AG01 with AG02, AG03 and AG04's hatch |
| T03 | 304 | AG08 and AG09 at A's south-east, beside AG22 |
| T04 | 305 | AF03 at AF02's door, beside AF05 and AF06 |
| T05 | 305 | AF10 and AF11 at A's north-east, where X13 leaves |
| T06 | 306 | AF17, LF01 and BF01 in one straight line at 4.2 |
| T07 | 307 | each lift beside its main stair core (AG18 / AG19, BG02 / BG03) |
| T08 | 307 | BF06 / BF07 off BF05, within sight of BF01 |
| T09 | 308 | BF08 to BF09 to BF10 to BG13 |
| T10 | 309 | BG09 on the hall's west wall, BG07 beside it and on the yard |
| T11 | 310 | BG24 along the hall's north side with BG25-BG27 off it; BG23 along the east side over BU02 |
| T12 | 311 | BG31 above the end of TB04, beside BG30; BG33 beside BG29 |
| T13 | 312 | BG28 between BG10 and the hall block; BF13 where X13 lands, above BG10 and BG11; BG11 near the wing |
| T14 | 313 | TB01 under the yard in front of the gap, TB02 beside it |

## 3. Known gaps (planner, 2026-10-11; already decided or recorded, so not failures)
- T03: AG22 sits across the 3.5 spine from goods, not beside it (Michael, 1b-G ASK-4; 3.1). Relation `gap 3.5`.
- T12: BG31 is above the carrier riser BG32, which meets TB04's east end; the ducts still rise once (5.1). Write it that way.
- T13: BF13 is at the strip's north-east, 10.7 from where X13 lands, with the pipes running on in B's service void (4.4). BG11 is 5.5 from the wing across BG10 and the passage X07; cables cross under 6 m. Relations `gap 10.7` and `gap 5.5`.
- T14: brief 7 says "equal tunnel runs"; TB03 is 17.5 and TB04 26 (5.3). Note it for P03R, not a failure.

## 4. Candidate to verify (planner test run: `adjacency rows 34, items 14 of 14, rects 114, fails 0`; a negative test with a wrong room, a wrong Result, an unknown rect, a wrong gap and a missing item gave 5 fails)
### 9.1 Must touch
| Id | Item | Rooms | Zones | Relation | Result | P04 | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| J01 | T01 | AG11 AG12 AG13 | G-SEC | same | - | the three side by side on the spine face | brief 7 |
| J02 | T01 | AG11 AG12 AG13 / AG10 | G-SEC / G-SPINE | face | 12.0 on z 43.5, x 7.5-19.5 | doors only on this face, none on the north corridor | brief 7 |
| J03 | T02 | AG01 AG02 AG03 AG04 | G-FRONT | same | - | AG04's hatch in its wall to AG01 | brief 7 |
| J04 | T03 | AG08 AG09 | G-GOODS | same | - | - | brief 7 |
| J05 | T03 | AG08 AG09 / AG22 | G-GOODS / G-EAST | gap 3.5 | 3.5 across the spine, x 34.5-40 | AG22 opposite the goods door across the spine | brief 7; 3.1 (1b-G ASK-4, Michael) |
| J06 | T04 | AF02 AF03 AF05 AF06 | F-OPS | same | - | AF03 at AF02's door, AF05 and AF06 beside it | brief 7 |
| J07 | T05 | AF10 / AF11 | F-PLANT / F-NE | face | 6.0 on x 36.5, z 54-60 | AF11 in F-NE's east end | brief 7 |
| J08 | T05 | AF10 / X13 | F-PLANT / SI-RACK | face | 2.0 on x 40, z 44.5-46.5 | pipes leave AF10's east wall | brief 7, 9; 5.1 |
| J09 | T06 | AF17 / LF01 / BF01 | F-VEST / K-BRIDGE / B-FLOBBY | line | x 36.5-60.5 on z 40-43.5, all at 4.2 | BF01's bridge door on x 52, z 40-43.5 | brief 7; 2 |
| J10 | T07 | AG18 / AG19 | K-STAIR / K-LIFT | face | 1.5 on x 27.5, z 46-47.5 | - | brief 7, 8 |
| J11 | T07 | BG02 / BG03 | KB-STAIR / KB-LIFT | face | 2.5 on z 48.5, x 54.5-57 | - | brief 7, 8 |
| J12 | T08 | BF06 BF07 / BF05 | B-FSEC / B-FCOR | face | 4.5 on x 60.5, z 48.5-53 | BF06 and BF07 at B-FSEC's north-west corner | brief 7 |
| J13 | T08 | BF07 / BF01 | B-FSEC / B-FLOBBY | face | 13.5 on x 60.5, z 35-48.5 | mantrap post in sight of the bridge post across BF01 | brief 7 |
| J14 | T09 | BF08 BF09 | B-FSEC | same | - | BF08 runs from the mantrap to the gallery | brief 7 |
| J15 | T09 | BF09 / BF10 | KB-GALLERY / KB-WELL | face | 3.0 on z 43, x 67-70 | - | brief 7; 4.2 |
| J16 | T09 | BF10 BG13 | KB-WELL | same | - | BG13 opens only into the hall (5.4) | brief 7; 6.1 V-GAL |
| J17 | T10 | BG07 BG09 | B-GGOODS | same | - | BG09 north of BG07 (4.5) | brief 7 |
| J18 | T10 | BG09 / BG20 | B-GGOODS / B-GHALL | face | 7.0 on x 70, z 36-43 | equipment door on this face | brief 7 |
| J19 | T10 | BG07 / X04 | B-GGOODS / S-YARDB | face | 9.5 on z 30, x 60.5-70 | roller door to X12 | brief 7; 5.1 |
| J20 | T11 | BG24 BG25 BG26 BG27 | B-GHPLANT | same | - | BG24 along the south side, rooms north of it | brief 7 |
| J21 | T11 | BG24 / BG20 | B-GHPLANT / B-GHALL | face | 26.0 on z 50.5, x 70-96 | - | brief 7 |
| J22 | T11 | BG23 / BG20 | B-GHCOOL / B-GHALL | face | 14.5 on x 96, z 36-50.5 | - | brief 7 |
| J23 | T11 | BG23 / BU02 | B-GHCOOL / U-COOL | above | 58.0 (x 96-100, z 36-50.5) | - | brief 7; 5.2 |
| J24 | T12 | BG29 BG30 BG31 BG33 | B-GHCAR | same | - | order BG31, BG30, BG29, BG33 west to east (5.4) | brief 7 |
| J25 | T12 | BG31 / BG32 | B-GHCAR / T-RISER | above | 4.0 (x 72-74, z 30-32) | BG31's floor hatch over BG32 | brief 7; 6.1 V-BG32 |
| J26 | T12 | BG32 / TB04 | T-RISER / T-TUNB | face | 2.0 on z 30, x 72-74 | - | brief 7; 5.2 |
| J27 | T13 | BG28 / BG10 | B-GHPLANT / KB-BG10 | face | 3.5 on x 70, z 56.5-60 | BG28 at B-GHPLANT's west end | brief 7 |
| J28 | T13 | BF13 / BG10 | B-FNE / KB-BG10 | above | 33.25 (x 60.5-70, z 56.5-60) | - | brief 7 |
| J29 | T13 | BF13 / BG11 | B-FNE / B-GE | above | 33.25 (x 60.5-70, z 53-56.5) | BG11 touching BG10 (4.5) | brief 7 |
| J30 | T13 | BF13 / X13 | B-FNE / SI-RACK | gap 10.7 | 10.7 (BF13 north-east, deviation 4.4) | pipes run on in B's service void | brief 7, 9; 4.4 |
| J31 | T13 | BG11 / BG40 | B-GE / W-GEN | gap 5.5 | 5.5 across BG10 and X07 | - | brief 7 |
| J32 | T14 | TB01 / X03 | T-VAULT / S-YARDA | above | 48.0 (x 40-48, z 24-30) | - | brief 7; 5.1 |
| J33 | T14 | TB01 / X05 | T-VAULT / S-GAP | face | 8.0 on z 30, x 40-48 | - | brief 7; 5.1 |
| J34 | T14 | TB02 / TB01 | T-MH / T-VAULT | face | 1.5 on x 48, z 24-25.5 | - | brief 7; 5.3 |

Relations (the script's rules): `same` one zone holds all the rooms; `face` the two plan rects share an edge of at least 1.0; `above` the plans overlap (different levels); `line` rects in a row west to east with the first one's z band inside each; `gap <n>` the plan gap is n (a known gap, section 3). Result starts with the measured metres for face, above and gap.

## 5. Check scripts
- `timeout 60 node scripts/kestrel/p03b-adj-check-g.mjs docs/kestrel/03B-block-plan.md` (must say `items 14 of 14` and `fails 0`).
- Rerun, all must say fails 0: `timeout 60 node scripts/kestrel/p03b-path-check-g.mjs docs/kestrel/03B-block-plan.md docs/kestrel/routes.md` (path), `timeout 60 node scripts/kestrel/p03b-ring-check-f.mjs docs/kestrel/03B-block-plan.md` (F), `timeout 60 node scripts/kestrel/p03b-vert-check-e.mjs docs/kestrel/03B-block-plan.md` (E), `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md` (A), `timeout 60 node scripts/kestrel/p03b-zones-check-b.mjs docs/kestrel/03B-block-plan.md` (B), `timeout 60 node scripts/kestrel/p03b-zones-check-d.mjs docs/kestrel/03B-block-plan.md docs/kestrel/02-building-brief.md` (D). Planner test on a copy with this table: path `total 495.7, placed 6, open 7, fails 0`; F `fails 0, info 2`; E `fails 0, info 2`; A, B, D `fails 0`.
- Run from the repo root. Never write that a check passed unless you ran it on the real files.

## 6. Write
03B: add "## 9. Adjacency" after section 8's deviations, before Appendix A:
- One line: "Brief 7 checked at zone level: rooms in one zone, zones sharing a face of at least 1.0, or plans overlapping for above and under. P04 keeps each relation when it places rooms."
- "### 9.1 Must touch": the table (verified), then "Notes for P04 and P03R:" with the four known gaps of section 3 (one line each) and any realism point you find.
- "Self-check (this session):" adjacency, path, F, E, A, B and D summary lines. "Deviations:" anything changed from the candidate, or "none".
- Line 2 of the file: "Status: DRAFT (Part 1g-b done: adjacency must touch; Part 1g-c next)".

## 7. Self-check (all from commands; paste the summary lines)
- Adjacency: `adjacency rows <n>, items 14 of 14, rects 114, fails 0`; path, F, E, A, B and D 0 fails.
- Every row has a source; every item's relation is real for a building of this kind (one line per item where it is not obvious); every known gap is written in the notes.

## 8. Questions for Michael
None expected. Ask only if an item fails and no zone-level relation can meet it (RULES 9 4a, multiple-choice tool, recommended option first).

## 9. End (RULES 9)
- progress.md: P03B row "DRAFT (parts 1a-1g-b)", commit, date; one log entry of at most 6 lines.
- lessons.md: one line.
- Commit "kestrel P03B 1g-b: adjacency must touch" and push.
- Report in at most 8 lines, then the Next step block:
Next step:
1. Type /clear.
2. Stay on Opus, medium.
3. Send the prompt below:
```
Planner: next
```
