Stage P03B Part 1b-G r2 - Building A ground floor, resolve ASK-5 (every room reaches a corridor or its own lobby).
Model: Opus, medium effort (RULES 7: never high).
Decisions: 18 (corridor plan 2, rooms that move or turn up to 12, suites 2, AG06 window 1, leftover 1). Rooms that do not move cost 0.

## Rules for this session
- One deliverable: replace the ground table in docs/kestrel/03B-block-plan.md section 3 with a layout in which every room has a door to a corridor or its own lobby. Also update its self-check line, "Leftover (ground)", "Deviations", "Spine band" and the questions part. Nothing else. No first floor, no roof, no bridge rect (the bridge z0 stays 40 unless you give a written reason; if the spine moves, say what 1b-F must change).
- Write as you go: place the corridors first and write them, then the rooms that must stay, then the rooms that move. Commit and push after each table written.
- If one decision takes long, write "ASK: <question>" and move on. An ASK stays a question for Michael: never decide it for him by dropping a brief requirement.
- Budget about 30 tool calls.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Precondition: 03B-block-plan.md has "Status: DRAFT (Part 1b-G: Building A ground)", a section 3 ground table of 25 rects, and the line "Michael's answer to ASK-5". If not, stop and report.
3. Read docs/kestrel/RULES.md lines 47-110 only (sections 5-9, including the new self-check rule in section 7 and 4a in section 9).

## 1. Read only these
- docs/kestrel/03B-block-plan.md (whole file, about 130 lines).
- docs/kestrel/02-building-brief.md lines 52-74 (section 2), 94-125 (section 5 heading and AG rows only), 298-331 (sections 7 and 8).
- docs/kestrel/01-mission-brief.md lines 94, 108, 152 and 178 only (the ajar admin window and the goods-in wall downpipe and cill).
- docs/kestrel/schema.md lines 30-117 (rooms and levels) only if you need the corridor fields; use grep.
Do not read other files. Do not read the first-floor or roof rows.

## 2. What Michael decided (ASK-5, 2026-10-11)
Options (a), (b) and (c) of ASK-5 are rejected, and (d) is not approved. The ground floor must still meet every brief requirement. Allowed tools, in this order of preference:
1. An L or loop corridor, or a second short corridor, off the spine (kind corridor, 3.5 rect, 3.2 clear, ceiling 2.4, void, as Michael's ASK-2 answer set).
2. Moving or turning rooms (keep every brief clear size; rect = clear + 0.3 each way, one outside wall -0.075 more clear).
3. Suites (a room reached through another room) only where a real building has them, each stated with its reason and listed under Deviations. Allowed examples: the staff WC AG15 off the locker room AG14; the cleaner's store AG16 off the trolley recess AG17. Not allowed: any suite for AG11, AG12, AG13, AG22, AG24 (security or plant walls run to the slab; brief 7 says AG11-AG13 open only to a corridor).
4. Moving the spine only with a written reason. Not allowed: shrinking a room below its brief clear size; dropping the outside-window rule for AG06; touching the bridge z0 without a reason.

## 3. Frontage table (precomputed from the brief; verify each row)
Spine AG10 is [10, 40, 40, 43.5]: 30 m long, two long sides = 60 m of door frontage. Its west end is the foot lobby of AG21; its east end is the bridge. Frontage needed = the room's short side faced to the corridor (best case, room turned so the short side touches). Rooms reached another way cost 0: AG02, AG03 (via AG01), AG08 (via AG09), AG19 (via AG20), AG21 (foot lobby), AG23 (via AG22 hatch).

| Id | Rect size (brief 5 clear + 0.3) | Short side = frontage needed (m) | Long side = depth needed (m) | Source |
| --- | --- | --- | --- | --- |
| AG01 | 9.0 x 10.0 | 9.0 | 10.0 | brief 5; south wall, main door to X03 |
| AG04 | 5.0 x 4.0 | 4.0 | 5.0 | brief 5 |
| AG05 | 6.0 x 5.0 | 5.0 | 6.0 | brief 5 |
| AG06 | 8.0 x 6.0 | 6.0 | 8.0 | brief 5; outside wall (south) |
| AG07 | 8.0 x 6.0 | 6.0 | 8.0 | brief 5 |
| AG09 | 4.0 x 3.0 | 3.0 | 4.0 | brief 5 (AG08 behind it) |
| AG11 | 6.0 x 5.0 | 5.0 | 6.0 | brief 5, 7 |
| AG12 | 5.0 x 4.0 | 4.0 | 5.0 | brief 5, 7 |
| AG13 | 3.0 x 4.0 | 3.0 | 4.0 | brief 5, 7 |
| AG14 | 8.0 x 5.0 | 5.0 | 8.0 | brief 5 |
| AG15 | 5.0 x 4.0 | 4.0 | 5.0 | brief 5 |
| AG16 | 2.5 x 2.0 | 2.0 | 2.5 | brief 5 |
| AG17 | 2.0 x 1.5 | 1.5 | 2.0 | brief 5 (open recess) |
| AG18 | 4.0 x 8.0 | 4.0 | 8.0 | brief 8 (stair core) |
| AG20 | 3.5 x 2.5 | 2.5 | 3.5 | brief 8 (lift lobby) |
| AG22 | 5.0 x 4.0 | 4.0 | 5.0 | brief 5, 7 |
| AG24 | 7.0 x 5.0 | 5.0 | 7.0 | brief 5 |
| AG25 | 2.0 x 1.5 | 1.5 | 2.0 | brief 8 |
| Total needed | | 74.5 | | sum of the column |
| Spine supply | | 60.0 | | 2 x 30 |
| Shortfall | | 14.5 | | 74.5 - 60.0 |

Corridor arithmetic (use as a start; verify against the geometry):
| Option | Frontage added | Frontage lost at the mouth | Net | Check |
| --- | --- | --- | --- | --- |
| North-south branch, rect 3.5 wide, z 43.5 to 54 (10.5 long) | 2 x 10.5 = 21.0 | 3.5 | +17.5 (supply 77.5, margin 3.0) | its far end is an outside wall (no door frontage) |
| South-north branch, 3.5 wide, z 30 to 40 (10 long) | 2 x 10 = 20.0 | 3.5 | +16.5 (supply 76.5, margin 2.0) | its far end is the south outside wall |
| East-west branch in the north half | 2 sides, but the north half is 10.5 deep, a corridor 3.5, leaves 7.0 for two rows: 3.5 each | - | does not fit rooms deeper than 3.5 | ASK-5 reason; avoid |
The margins are small. Every room's depth must also fit (the depth column above). A branch whose rooms have 6 to 8 m depth needs that depth on both sides of it inside A [4, 30, 40, 54].

## 4. Fixed constraints (from the previous 1b-G prompt, still in force; each from the source shown)
| Constraint | Source |
| --- | --- |
| Everything inside A [4, 30, 40, 54]; south wall z 30 faces the yard (X03); every edge on the 0.5 grid | block plan 1; RULES 6 |
| G and F stack identically: spine AG10, main stair core AG18, lift shaft AG19, lift lobby AG20, fire stair AG21, cable riser AG25. Anything you add to the stack (a branch) is listed so 1b-F copies it | brief 5 "As AG.."; brief 8 |
| Spine east-west at one z band; its z0 is the bridge z0 (40), in line with AF17 | brief 7; block plan 2 |
| Fire stair at the spine's west end, exit through x 4; main stair core north of the spine east of centre; lift on the core's east side sharing a wall; lift lobby between lift and spine; cable riser on the spine's west third, not beside a stair core | brief 8 |
| AG01 on the south wall, touching AG02, AG03, AG04 (hatch) | brief 5, 7 |
| AG08 on the south wall (roller door), AG09 between AG08 and the spine, both at A's south-east beside AG22 | brief 5, 7 |
| AG11, AG12, AG13 touch each other (or share a wall through AG11), all open only to a corridor, none touches AG01-AG03, AG08 or AG09 | brief 7 |
| The lift shaft touches no room whose walls run to the slab except its own lobby (the AG18 exemption stays, see Deviations) | brief 7 |
| AG06 keeps an openable outside window on the south facade. The route in the mission brief (lines 94, 108, 178) is the ajar admin window, and the downpipe and cill ledge on the goods-in wall with a hang-and-shimmy "to the window". Check line 178: if the shimmy must reach AG06's window from the goods-in wall, AG06's south wall must be within a shimmy of AG08's wall (say the distance you used, source ASK if no number exists). If AG06 would have to move to another facade, write ASK; do not move it | brief 2, 5; mission brief 94, 108, 178 |
| Offices (AG05, AG06, AG07) keep outside windows; AG14 needs none | brief 5 |
| No room below its brief clear size | RULES 5; brief 5 |

## 5. Write the layout
- Replace the ground table in section 3. Same columns: Id | Rect [x0, z0, x1, z1] | Size | Touches (corridor or lobby it opens to, plus the adjacency rows met) | Source. Add the new corridor rows (ids AG26, AG27 as needed; they follow the stack rule) and any lobby.
- Add a column or a line per room: "Door to" (the one corridor or lobby it reaches, or the suite parent).
- Update "Spine band", "Leftover (ground)" and "Deviations from the brief (ground)" (every suite, turned room, moved room and the lift exemption, each with the reason and source).
- Update the questions part: close ASK-5 as resolved, point to this session, list any new ASK with its options (recommended first, RULES 9 4a).
- Change line 2 of the file to "Status: DRAFT (Part 1b-G r2: Building A ground)". Plain English, hyphens, no em dashes.

## 6. Self-check (a throwaway node script in the OS temp folder, not committed; run with a timeout)
Parse the ground table and check, then paste the summary line into section 3 and the report:
- Geometry: every edge on 0.5; every rect inside A; no overlaps; sizes equal the brief rect sizes (section 2 table of the previous prompt, now in this prompt's section 3); area sum matches the rects (731 plus any new corridor rows); each "must touch" pair shares an edge of at least 1.0; AG11, AG12, AG13 do not touch AG01-AG03, AG08, AG09; the lift shaft shares no edge with a walls-to-slab room except its lobby and the AG18 exemption.
- Universal (RULES 7): every room reaches a corridor or its own lobby by a door (list each room and its door; the count of rooms with no door must be 0); every rect and number has a source (count of rows with an empty source must be 0); every brief requirement for the ground floor is met or listed as ASK (list the ASKs, and for each brief 5 and 7 requirement for AG rooms state met or ASK).
- AG06 has an outside wall facing south with room for a window.
- Frontage: for each corridor, the sum of door frontage used is at most its two long sides.

## 7. End
- progress.md: P03B row "DRAFT (part 1b-G r2)", date; one log entry (at most 6 lines) with the questions and options, recommended first. Questions follow RULES 9 4a: a recommended option never leaves a brief requirement unmet or defers it.
- lessons.md: one line if you have one.
- git add only 03B-block-plan.md, progress.md and lessons.md. Commit "kestrel P03B 1b-G r2: Building A ground, doors resolved". Push.
- Report in at most 8 lines per RULES 9: what changed, check summary (paste the line), ASKs, and the questions in a code block headed "Questions for Michael".
- Last line: "Next: type /clear, then send: Planner: next"
- STOP.
