# Revision: access levels, per-building cards and dog teams (Revision prompt, RULES 10)
Model: Sonnet, medium effort.
Decisions: 15

## 1. Start
- `git checkout feature/kestrel && git pull`; confirm the branch is feature/kestrel. Stop if not.
- Read docs/kestrel/RULES.md sections 2, 5, 9, 10 (grep -n '^## ' for ranges) and docs/kestrel/progress.md (status table, and the "Decisions by Michael" lines dated 2026-10-11 that mention access levels, cards or dogs).
- Preconditions: progress.md rows P01, P02 and S0 read APPROVED; "Decisions by Michael" has the 2026-10-11 line starting "Access levels". If either fails, stop and report.
- Print a plan of at most 10 lines.

## 2. Why
Michael (2026-10-11, review of the P03B 2f plans): security zones become numbered access levels shown on door signs (Metal Gear Solid style); cards carry a building and a level; there is no public ground inside the fence; two dog teams patrol the yard. This reopens three APPROVED documents: the mission brief (01), the building brief (02) and the security spec (S0). Wording and values only: no room, size, position or route changes.

## 3. Read (only these)
- 02-building-brief.md: line 95, section 5 (lines 94-255; only the zone column), section 6 (lines 256-299), lines 380-424 (12 tensions to revision log; grep "zone\|ring\|3+").
- 01-mission-brief.md: section 3 roster (grep -n '^#' for the range), lines 70-75 (cards), 76-120 (tracks and controls; grep "tier\|zone"), 145-160 (beats).
- S0-security-spec.md: section 2.3 (lines 41-50) and every line grep "zone\|ring\|tier" finds.
- src/ai/enemyDefs.ts lines 7-8 and 60-64; src/ai/archetypes.ts lines 30-40 and 130-140 (dog capability; cite them, RULES 5).

## 4. Decisions (verify each; write ASK if one does not hold)
| # | Decision | Value | Source |
| --- | --- | --- | --- |
| 1 | Level words | Outside = the lane (public street, outside the fence; no level). Perimeter = the yard and every site piece inside the fence, controlled by the gatehouse officer, gates signed "Authorised only"; no card level. Then Level 1 to Level 5, plain integers, no "3+" | Michael 2026-10-11 |
| 2 | Mapping | Old 1: lane Outside, rest Perimeter. Old 2: Level 1. Old 3: Level 2. Old 3+: Level 3. Old 4: Level 4. Old 5: Level 5. Exception, the level-3 rule: a room whose door needs a higher card than its floor's staff card is Level 3: AG11, AG12, AG13 (security suite), AF02-AF06 and AF10 (master card from AF01), AF19 (off AF10), BG10 and BG28 (B plant corridor and gas room behind it), BF07 (mantrap; its outer door is Level 3, its inner door Level 4). AF11: Level 3 only if section 6 or its section 5 door column puts its only door off AF10, else Level 2 | Michael (level 3 = higher card) |
| 3 | Brief section 5 | The zone column of all 126 rows takes the mapped value (write `P`, `1`-`5`; the lane row `O`). Column heading "Level". Line 95: "Level: O outside (lane), P perimeter (yard, gatehouse controlled), 1-5 card levels; a room behind a door needing a higher card than its floor's staff card is 3." | decisions 1-2 |
| 4 | Brief section 6, spaces table | Heading "Access levels and controls"; column "Zone" becomes "Level"; each row rewritten by decision 2, with the room lists | decision 2 |
| 5 | Card model | New paragraph under the spaces table: each card has a building (A or B) and a level, and opens every reader door at or below its level in its building; a bridge door belongs to the building it leads into. Cards: visitor or contractor day card A1 (issued at reception, holder still passes the gatehouse); A staff card A2; master card A3; B staff card B2; B-tier card and the remote-hands contractor card B5. Extra on top of the card: the iris at the mantrap's inner door, Pell's cage code and key, the tenant cage key, the key safe PIN. The escort PIN works on the same readers as today | Michael (per building) |
| 6 | Brief section 6, controls table | Each reader row's Control names its level and building ("Level 2 reader (A)", "Level 3 reader (B), B-tier card or escort PIN"); Who holds access names cards by decision 5. Keys, lids, gates and exit-only rows unchanged apart from zone words. The gatehouse row says: no card level, the officer checks everyone, staff cards open the pedestrian reader | decisions 1, 5 |
| 7 | Door signs | One line in section 6: every reader door shows its level on a sign on or beside the door, in the style of Metal Gear Solid; perimeter gates carry "Authorised only". DR builds them as part of the door system (RULES 2 Doors) | Michael; RULES 2 |
| 8 | Brief other lines | Lines 393, 403, 412, 417 and section 12: zone, ring and 3+ words become levels by decision 2. Revision log row: "2026-10-11, levels revision (Michael): zones to access levels, per-building cards, door signs, perimeter" | RULES 10 |
| 9 | 01 zones line | Line 147: "Access levels (P02 section 6): Outside (lane), Perimeter (yard), Levels 1-5." with the S1-S7, X mapping by decision 2 (S2 1 and 2, S3 3, S4 2 and 3, S5 2 to 4, S6 4 with cages 5, S7 5 with its lobby 4, X Perimeter to 3). Tension chart unchanged | decision 2 |
| 10 | 01 beats | Beats table B1-B10: "zone N" becomes the level words (B1 Outside and Perimeter, B2 Perimeter, B3 Levels 1 and 2, B4 Level 3, B5 Levels 2 and 3, B6 Level 2, B8 Level 4, cages 5, B9 Level 5, B10 Perimeter) | decision 2 |
| 11 | 01 cards | Line 72 and the TA1, TA4, TB3 rows: card names gain their level ("master card (A3)", "B-tier card (B5)", "contractor card (B5, not the iris)"); no change to where cards are or who holds them | decision 5 |
| 12 | 01 dog teams | Section 3 roster: the two guards whose posts patrol the yard become dog handlers, each with one dog: team 1 the front yard, team 2 the rear yard and the east service drive. If the roster does not have exactly two yard-patrol posts, write ASK and stop. Count line: 20 guards (2 of them handlers) plus 2 dogs plus 7 civilians. Engine: enemy kind `dog` exists (enemyDefs.ts:7) and smells the player with no light or line of sight needed (archetypes.ts:134). Ghost rule: a dog that detects the player by smell breaks the ghost, like a guard seeing the player. Downstream line: P06 and P07 give each team a route with gaps a ghost can use; S5 decides whether dogs count toward the awake cap | Michael (two dog teams) |
| 13 | S0 2.3 | Reader row: a reader door has a `level` (1-5) and a `building`; a card opens it when the card's building matches and its level is at least the door's level (replaces the `opens` list); a reader flagged `pin` also takes the escort PIN. Keycards row: `cards[]` gain `building` and `level`; clones copy both. The mantrap row keeps the iris on the inner door. Door signs: DR | decision 5 |
| 14 | S0 other lines | Every zone, ring or tier word grep finds becomes the level words; nothing else changes | decision 2 |
| 15 | Cascade | Status lines of 01, 02, S0: "Status: DRAFT (levels revision 2026-10-11, awaiting Michael's re-approval)". progress.md rows P01, P02, S0: "DRAFT (levels revision)". P03B stays DRAFT and redoes its levels in P03B-2g-1. S1 Part A uses S0 cameras only (unchanged; note it). No later stage has started | RULES 10 cascade |

## 5. Self-check (paste each summary line)
1. `grep -c -E "3\+|zone [0-9]|ring [0-9]" docs/kestrel/01-mission-brief.md docs/kestrel/02-building-brief.md docs/kestrel/S0-security-spec.md`: 0 in each, apart from line 47's precedent ("Nested rings: ..."), which stays. List any other hit with a reason.
2. Section 5 level column: a node one-liner over the 126 rows of 02 section 5 counts the values: every row has one of O, P, 1-5; print `rows 126, O n, P n, 1 n, 2 n, 3 n, 4 n, 5 n`. Expected Level 3 count: the rooms listed in decision 2 that are section 5 rows.
3. `grep -n "opens" docs/kestrel/S0-security-spec.md`: no line still says a card's `opens` lists the reader.
4. `grep -n -i "dog" docs/kestrel/01-mission-brief.md`: the roster rows, the count line and the downstream line.
5. `git diff --stat`: only 01, 02, S0, progress.md, lessons.md.

## 6. End (RULES 9)
- progress.md: rows per decision 15; log entry (at most 6 lines) first under "## Log (newest first)": what changed, the level counts, ASKs. Check no line is added twice.
- lessons.md: one line, added once (security levels should be set as numbered access levels with a card model in the first brief, not as zones).
- Commit `kestrel REV-levels: access levels, per-building cards, dog teams`, push.
- Report to Michael in plain English (RULES 9 4c): at most 8 short everyday lines on what changed and whether it worked; no bare ids, check ids, decision or line numbers or commit hashes unless the line says in words what each is; questions only on realism or stealth flow, recommended option first, as native multiple choice. Technical detail stays in progress.md.
- Last line before the Next step block: `Review chat: SEND - change to approved documents`.
- Next step block (RULES 9 4b, SEND): "1. Type /clear." "2. Switch to Opus, medium." "3. Send the prompt below:" then one code block holding `Reviewer: next` on its first line and the whole report under it. The reviewer gives Michael the re-approval message (`Planner: APPROVED REV-levels`, Opus medium), after which the planner hands out prompts/P03B-2g-1.md. STOP.
