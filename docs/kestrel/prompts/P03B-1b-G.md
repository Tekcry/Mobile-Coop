Stage P03B Part 1b-G - Building A ground floor (25 rooms placed as rectangles).
Model: Opus, medium effort (RULES 7: never high).
Decisions: 20 (AG01-AG09, AG10, AG11-AG18, AG22, AG24; the five rects AG19, AG20, AG21, AG23, AG25 follow mechanically from the constraints once the spine and core are placed and count as 0).

## Rules for this session
- One deliverable: a new section 3 "Building A" in docs/kestrel/03B-block-plan.md holding the ground-floor table only, plus the "Leftover (ground)" and "Deviations" lines. Nothing else. No first floor, no roof, no bridge z0 (the next parts do those).
- Write as you go: place the spine and the stacked core first and write that part of the table, then the rest. Commit and push after the table is written, not only at the end.
- If one decision takes long, write it as "ASK: <question>" and move on.
- Budget about 25 tool calls.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Precondition: docs/kestrel/03B-block-plan.md has "Status: DRAFT (Part 1a: site and levels)" and no section 3. If not, stop and report.
3. Read docs/kestrel/RULES.md lines 47-105 only (sections 5-9).

## 1. Read only these
- docs/kestrel/03B-block-plan.md (whole file, 56 lines).
- docs/kestrel/02-building-brief.md lines 52-74 (section 2), 94-158 (section 5 heading and Building A, ground rows AG01-AG25 only; skip AF and AR rows), 298-331 (sections 7 and 8).
- docs/kestrel/schema.md lines 30-117 (section 2, rooms and levels).
Do not read the bridge (Link) rows; the bridge is a later part.

## 2. Rectangle sizes (precomputed: rect = brief clear size + 0.3 each way, brief 5 heading; verify against the brief)
Ground sum must be 731 (brief 5, "Sums"). I checked: 25 rects, 731.0 m2.

| Id | Rect W x D | Id | Rect W x D |
| --- | --- | --- | --- |
| AG01 | 9.0 x 10.0 | AG14 | 8.0 x 5.0 |
| AG02 | 6.0 x 5.0 | AG15 | 5.0 x 4.0 |
| AG03 | 2.5 x 2.5 | AG16 | 2.5 x 2.0 |
| AG04 | 5.0 x 4.0 | AG17 | 2.0 x 1.5 |
| AG05 | 6.0 x 5.0 | AG18 (main stair core, brief 8) | 4.0 x 8.0 |
| AG06 | 8.0 x 6.0 | AG19 (lift shaft) | 2.5 x 2.5 |
| AG07 | 8.0 x 6.0 | AG20 (lift lobby) | 3.5 x 2.5 |
| AG08 | 10.0 x 8.0 | AG21 (fire stair) | 3.5 x 6.5 |
| AG09 | 4.0 x 3.0 | AG22 | 5.0 x 4.0 |
| AG10 (spine) | 3.5 x 30.0 | AG23 (shaft under AG22's hatch) | 2.0 x 2.0 |
| AG11 | 6.0 x 5.0 | AG24 | 7.0 x 5.0 |
| AG12 | 5.0 x 4.0 | AG25 (cable riser) | 2.0 x 1.5 |
| AG13 | 3.0 x 4.0 | | |

W x D may be turned 90 degrees. Rooms with one outside wall lose 0.075 more clear (brief 5); note it, do not resize.

## 3. Fixed constraints (each from the source shown)
| Constraint | Source |
| --- | --- |
| Everything inside A [4, 30, 40, 54]; front (yard, X03) is the south wall z 30; every edge on the 0.5 grid | block plan 1; RULES 6 |
| Stacked identically on G and F (the first-floor part copies them): spine corridor AG10, main stair core AG18, lift shaft AG19, lift lobby AG20, fire stair AG21, cable riser AG25 | brief 5 "As AG.."; brief 8 |
| Spine runs east-west (30 x 3.5) at one z band; its band later becomes the bridge band, since the first-floor room AF17 sits at the spine's east end on x 40, in line with the bridge. State the spine's [x0, z0, x1, z1] clearly; the spine's z0 is the bridge z0 that part 1b-F records | brief 7; block plan 2 |
| Fire stair at the spine's west end; ground exit through the west wall x 4 | brief 8 |
| Main stair core north of the spine, east of centre; lift on its east side sharing a wall; lift lobby between lift and spine | brief 8 |
| Cable riser on the spine's west third, not beside a stair core | brief 8 |
| AG01 on the south wall (main door to X03), touching AG02, AG03, AG04 (hatch) | brief 5, 7 |
| AG08 on the south wall (roller door), AG09 between AG08 and the spine; both at A's south-east, beside AG22 | brief 5, 7 |
| AG11, AG12, AG13 touch each other, all open only to the spine, none touches AG01-AG03, AG08 or AG09 | brief 7 |
| Lift shaft touches no room whose walls run to the slab except its own lobby | brief 7 |
| AG06 on the south wall (window ajar); offices and the ops room on outside walls (punched windows) | brief 2, 5 |

AG23 is a shaft under AG22's floor hatch (G to B). If the schema rejects a rect overlapping AG22, place it beside AG22 and write ASK.
Space left over on the ground floor is about 133 m2 (864 - 731); list it as unassigned rects and say what it could be, as ASK.

## 4. Write section 3 "Building A" (ground only)
- Heading "## 3. Building A", one table "### Ground (G)": Id | Rect [x0, z0, x1, z1] | Size | Touches (adjacency rows met) | Source.
- Then "Leftover (ground)", "Deviations from the brief (ground)" (any rect size changed, with the reason), and a one-line "Spine band: [x0, z0, x1, z1]" for 1b-F.
- Change line 2 to "Status: DRAFT (Part 1b-G: Building A ground)". Plain English, hyphens, no em dashes.

## 5. Self-check (a throwaway node script in the OS temp folder, not committed; run with a timeout)
Parse the ground table and check: every edge on 0.5; every rect inside A; no overlaps; sizes equal section 2 of this prompt; area sum 731; each "must touch" pair in section 3 shares an edge of at least 1.0; AG11, AG12, AG13 do not touch AG01-AG03, AG08, AG09; the lift shaft shares no edge with a walls-to-slab room except its lobby. Paste the summary line into section 3 and the report.

## 6. End
- progress.md: P03B row "DRAFT (part 1b-G)", date; one log entry (at most 6 lines) with questions and options, recommended first. Add one line to lessons.md if you have one.
- git add only 03B-block-plan.md, progress.md and lessons.md. Commit "kestrel P03B 1b-G: Building A ground". Push.
- Report in at most 8 lines per RULES 9: what changed, check summary, ASKs, and the questions in a code block headed "Questions for Michael".
- Last line: "Next: type /clear, then send: Planner: next"
- STOP.
