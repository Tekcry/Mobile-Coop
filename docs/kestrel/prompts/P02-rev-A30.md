# P02 revision: Building A grows to 36 x 30 (Revision prompt, RULES 10)
Model: Sonnet, medium effort.
Decisions: 17

## 1. Start
- `git checkout feature/kestrel && git pull`; confirm the branch is feature/kestrel. Stop if not.
- Read docs/kestrel/RULES.md (all) and docs/kestrel/progress.md (status table and "Decisions by Michael" lines dated 2026-10-11 only).
- Preconditions: progress.md P02 row is APPROVED; "Decisions by Michael" has the 2026-10-11 lines "Building A grows to 36 x 30" and "Building sizes are not fixed". If either fails, stop and report.
- Print a plan of at most 10 lines.

## 2. Why
Michael (2026-10-11): Building A grows from 36 x 24 to 36 x 30 (z 30-60, B's depth, 6 x 5 bays). The planner's door test failed: A ground's north rooms need about 42 m of corridor wall for their doors against 30 m, and the first floor is short too. Plan form: the spine stays at z 40-43.5 (bridge z0 = 40 kept); north of it a middle band holds the cores and security; a second east-west corridor runs north of the middle band; a north row of rooms sits behind it. This is the central-core, two-corridor layout used in deep office buildings (general knowledge). Brief 02 is APPROVED, so this runs as a revision and ends with Michael re-approving P02.

## 3. Read only these
- docs/kestrel/02-building-brief.md (421 lines): lines 1-5, 52-60, 94-150, 236-262, 298-345, 378-421. Use grep for anything else; never read it twice.
- docs/kestrel/03B-block-plan.md lines 1-60.
- docs/design/scale-sheet.md lines 29-49 (corridor sizes, fact F31).
- docs/kestrel/lessons.md (last 10 lines).
Do not open anything in RULES 4.

## 4. Task
Set brief 02 line 2 to `Status: DRAFT (revision A 36 x 30, 2026-10-11)` first. Then make each change below, one table row at a time. Verify every number with a command before writing it. Keep every other row and line unchanged.

| # | Where | Change | Source |
| --- | --- | --- | --- |
| 1 | Brief 2, line 58 | "Building A: 36.0 x 30.0 (6 x 5 bays), two storeys, 1080 m2 per floor." Add one sentence on the plan form (section 2 above) and its reason: rooms on G and F need more corridor wall for doors than one spine gives | Michael 2026-10-11 |
| 2 | Brief 5, new row AG26 after AG25 | Ground north corridor, zone 3, controlled staff corridor east-west north of the core band, joined to AG10 at both ends (no dead ends), lit, rounds and cleaning. Candidate size 2.7 x 29.7 clear (rect 3.0 x 30.0), ceiling 2.4 under the 1.5 void, vinyl, reader rule as AG10. Check the width against scale-sheet section 3 and real practice; change it if they disagree, and record why | Michael 2026-10-11; F31 |
| 3 | Brief 5, AG10 row | Connects-to column adds AG26 (both ends) | row 2 |
| 4 | Brief 5, new row AF21 after AF20 | First north corridor, same pattern as row 2, joined to AF01 at both ends | Michael 2026-10-11 |
| 5 | Brief 5, AF01 row | Connects-to adds AF21 | row 4 |
| 6 | Brief 5, AR01 row | Size 35.1 x 29.1 (was 35.1 x 23.1: 36 - 0.9 by 30 - 0.9) | row 1 |
| 7 | Brief 5, line 149 sums | Recompute with a command over the A rows. Expected about: ground 683 + 90 = 773 of 1080 (72%); first 640 + 90 = 730 of 1080 (68%); roof 113 of 1080 | rows 1, 2, 4 |
| 8 | Brief 5, X05 | 12 x 30 (was 12 x 24) | 03B [40, 30, 52, 60] |
| 9 | Brief 5, X06 | 52 x 16 + 24 x 2.5 (was 52 x 22 + 24 x 2.5). Confirm the bin store on the old plinth, the cycle shelter and the way to the X07 gate still fit in 16 m (general knowledge); if not, say what moves | Michael 2026-10-11 |
| 10 | Brief 5, X10 | 4 x 30 (was 4 x 24) | A's west wall z 30-60 |
| 11 | Brief 5, line 252 site sum | lane 864 + yards 1144 + 1232 + 360 + rear 892 + drive 368 + compound 384 + west path 120 + passage 36 + A 1080 + B 1440 + wing 288 = 8208 = 108 x 76. Check with a command | rows 1, 8-10 |
| 12 | Brief 6 zone lists | Add AG26 wherever AG10 is listed; S4 "AF01-AF20" becomes "AF01-AF21" | rows 2, 4 |
| 13 | Brief 9 ventilation (about line 337) | AR03 ducts drop into the voids of AG10, AG26, AF01 and AF21. grep "spine" in sections 7-9 and change only lines the second corridor makes untrue | rows 2, 4 |
| 14 | Brief 12, new item i | A plan form: why two corridors and a core band (door frontage; real deep-plan offices), A now B's depth; any width change from row 2 | rows 1, 2 |
| 15 | Brief 15 item 5 and Revision log | Item 5 adds "Revised 2026-10-11: A 36 x 30 (Michael)". Log row: date, "Michael: A 36 x 30", rows and sections changed, schedule rows plus 2 (self-check 1), DRAFT | this prompt |
| 16 | 03B section 1 table and grid lines | X10 [0, 30, 4, 60] 4 x 30; A [4, 30, 40, 60] 36 x 30 (6 x 5 bays); X05 [40, 30, 52, 60] 12 x 30; X06 [0, 60, 52, 76] plus [52, 74, 76, 76], 52 x 16 + 24 x 2.0. Grid line text "A spans z 30-60". Deviation line on the rear yard: 880 (832 + 48). Rerun the site tiling check with a short node command over a 0.5 grid and paste the summary line: expected `items 13, area sum 8208 of 8208, cells not covered exactly once: 0` | rows 1, 8-11 |
| 17 | 03B section 2 | A's footprint on G, F and R becomes [4, 30, 40, 60] | row 16 |

Rules: do not resize any room, place rooms, set band depths or zones (P03B-1b-zones-r2 does that), or change B, the wing or the bridge. If a number you need is missing, write `ASK:` per RULES 5. Per RULES 7 Building sizes, ask Michael only about realism, believability and stealth flow.

## 5. Cascade (RULES 10)
- grep docs/kestrel for "36 x 24", "864" and "z 30-54" / "30, 40, 54". List each hit outside the two files above with its stage. Change none of them.
- In progress.md set P02 to DRAFT. P03B is already DRAFT and B0 is "to rerun": leave both rows as they are. Name in the log entry the later stages that read brief 02 (P03B, P03R, B0, P04 onward).

## 6. Self-check (paste each summary line)
1. Schedule row count, section 5 only: `awk '/^## 5\./{s=1} /^## 6\./{s=0} s && /^\| (AG|AF|AR|LF|BG|BF|BR|BU|TB|X)[0-9]/' docs/kestrel/02-building-brief.md | wc -l`. The planner measured 124 before this revision; it must give 126. The brief's "151 schedule rows" figure counts differently: find what it counts, state it, and add 2.
2. `grep -n "36 x 24\|36.0 x 24.0\|23.1\|12 x 24\|4 x 24\|52 x 22" docs/kestrel/02-building-brief.md docs/kestrel/03B-block-plan.md` shows only the revision log, the item 5 history and the old-value notes you wrote on purpose.
3. The site sum and A sums commands (rows 7, 11) and the tiling summary (row 16).
4. Realism and flow, three lines: would a real architect lay A out this way; does every A room still have a believable corridor to reach it; does the second corridor give a believable patrol loop rather than a dead end.

## 7. End (RULES 9)
- progress.md: P02 row DRAFT with this commit and date; log entry at most 6 lines (changes, checks, cascade hits, questions).
- One line in docs/kestrel/lessons.md.
- Commit only changed files: `kestrel P02 revision: A 36 x 30`. Push.
- Report in at most 8 lines. Questions only on realism and flow, recommended first, in one code block headed "Questions for Michael".
- End with:

Next step:
1. Type /clear.
2. Stay on Sonnet, medium.
3. Send the prompt below:
```
Planner: APPROVED P02
```
Then STOP.
