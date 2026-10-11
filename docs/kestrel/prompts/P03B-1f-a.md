Stage P03B Part 1f-a - ring entries: site, Building A, bridge and under the yard.
Model: Opus, medium effort.
Decisions: 17 (gates RA01-RA02, A doors RA03-RA06, A tier doors RA07-RA10, bridge readers RA11-RA12, A fire exit and roof door RA13-RA14, lid, hatch and riser door RA15-RA17)

## Rules for this session
- One deliverable: section 7 "Ring entries" intro and 7.1 of docs/kestrel/03B-block-plan.md, at most 40 lines. The check script is ready (section 5); do not change it unless it has a bug, and say so.
- Zones only (Michael, 2026-10-11): a ring entry names the zone face a control sits on, not a door rect. P04 places the doors. Building B, the hall, the wing and the compound are Part 1f-b; critical path, adjacency and questions are Part 1g.
- Ring entries come from brief 6's control table only. Windows, roofs, downpipes and other secret routes are P06.
- Candidate-first (RULES 7): write the candidate in your first reply, run the check, fix failures one at a time, rerun after each fix, commit after each improvement. A failure you cannot fix: write it as ASK with options (recommended first, RULES 9 4a) and stop.
- Realism first: any change must be what a real architect and security consultant would draw. Do not ask Michael about sizes.
- Budget about 15 tool calls. Commit and push after the table.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: progress.md P03B row shows "DRAFT (parts 1a-1e)"; 03B-block-plan.md has section 6 with 6.4 and no section 7; scripts/kestrel/p03b-ring-check-f.mjs exists. If not, stop and report.
3. Read docs/kestrel/RULES.md sections 7 ("Task size" and "Reading and checking") and 9 only.

## 1. Read only these
- docs/kestrel/03B-block-plan.md: 3.2, 3.3, 3.4, 5.2, 5.4 and 6.1 (grep -n '^### ' for line numbers).
- docs/kestrel/02-building-brief.md: section 6 "Zones and controls" (grep -n '^## 6'), and section 4's east service gate line (grep -n 'service gate').

## 2. Plan and why (planner, 2026-10-11)
- Each row: the room on each side with its ring (brief 6 first table; "3+" written 3.5), the control (brief 6 second table), the two rects whose shared face holds it, and the face as a segment. A hatch or lid is "plan": its shaft rect lies inside the zone above.
- Rings step one at a time inward (3 to 3.5 and same-ring tier doors are fine). Exits outward and the manhole lid (1 to 4, ASK-2) are ring-exempt and marked "yes".
- RA01 main gates on the lane fence z 8 at x 5-16, east of the gatehouse SI-GATE [1, 8, 5, 11], so the officer faces both gates (brief 4). 11 m holds a 6 m sliding gate and a pedestrian gate.
- RA02 east service gate on the lane fence opposite the east drive X08, x 100-108, not "beside X12" (brief 4): X12 sits at x 60-70 (1c), and the fuel tanker's route is the drive to the compound and the generator wing (1d note 5.4). Record as a deviation and a P03R note.
- RA08-RA10 are master-card tier doors inside ring 3 (brief 6 "AF01 to AF02 (via AF03), AF04-AF06, AF10"). AF10's door is off AF21's east end (3.4), so the face is F-NCOR / F-PLANT.
- RA11 / RA12: the bridge is K-BRIDGE (3.2); its readers sit on A's east wall x 40 and B's west wall x 52.
- RA13 fire exit from fire stair A's bottom landing on A's west wall (6.1 V-AFS); RA14 roof door on the bulkhead's east face, toward A's roof plant and the LF02 ladder (the script prints one INFO: a bulkhead stands inside the roof zone; that is expected).
- RA17 is the tunnel's only control (TB04 to BG32, ring 4 to 5); TB03 to AG23 is an uncontrolled ring 4 door (6.1), not a ring entry.

## 3. Sums (planner, 2026-10-11)
- Every segment is at least 1.0 long (a single door). Shortest: RA17 2.0 (x 72-74), RA11 / RA12 3.5, RA10 3.5, RA13 / RA14 3.5.
- Planner test run on a copy of 03B with this table: `ring 17 (RA 17, RB 0), rects 114, fails 0, info 1` (RA14 INFO). A negative test (wrong zone, wrong ring, exit not exempt) gave 4 fails, so the script catches them.

## 4. Candidate to verify (correct any row that breaks the brief and say why)
Section 7 intro (two lines, under "## 7. Ring entries"):
Where each control in brief 6 crosses between zones. Segment = the shared zone face P04 puts the door on; "plan" = a hatch or lid inside the zone. Rings from brief 6 (3+ written 3.5).

### 7.1 Site, Building A, bridge and under the yard
| Id | Level | From (ring) | To (ring) | Control | Between | Segment | Exempt | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RA01 | G | X01 (0) | X03 (1) | Main sliding gate and pedestrian gate, pedestrian reader; gatehouse officer releases | S-LANE / S-YARDA | z 8, x 5-16 | no | brief 6; 5.2 SI-GATE (gates east of the gatehouse) |
| RA02 | G | X01 (0) | X04 (1) | East service gate, chain and padlock | S-LANE / S-YARDB | z 8, x 100-108 | no | brief 6; 5.4 (opposite X08) |
| RA03 | G | X03 (1) | AG01 (2) | Main door, locked out of hours, intercom | S-YARDA / G-FRONT | z 30, x 4-22 | no | brief 6, 5 AG01 |
| RA04 | G | X03 (1) | AG08 (2) | Roller door by key switch inside; wicket door reader | S-YARDA / G-GOODS | z 30, x 28.5-40 | no | brief 6, 5 AG08 |
| RA05 | G | AG01 (2) | AG10 (3) | Reader, A card | G-FRONT / G-SPINE | z 40, x 4-22 | no | brief 6, 5 AG01 |
| RA06 | G | AG09 (2) | AG10 (3) | Reader, A card | G-GOODS / G-SPINE | z 40, x 28.5-40 | no | brief 6, 5 AG09 |
| RA07 | G | AG10 (3) | AG11, AG12, AG13 (3.5) | Reader, master card tier; key safe PIN inside AG13 | G-SPINE / G-SEC | z 43.5, x 7.5-19.5 | no | brief 6; 3.3 G-SEC |
| RA08 | F | AF01 (3) | AF03, AF05, AF06 (3) | Reader, master card tier (AF02 through AF03) | F-SPINE / F-OPS | z 40, x 11-36.5 | no | brief 6; 3.3 F-OPS |
| RA09 | F | AF01 (3) | AF04 (3) | Reader, master card tier | F-SPINE / F-BW | z 43.5, x 7.5-19.5 | no | brief 6; 3.3 F-BW |
| RA10 | F | AF21 (3) | AF10 (3) | Reader, master card tier | F-NCOR / F-PLANT | x 36.5, z 50.5-54 | no | brief 6; 3.4 (AF21 east end) |
| RA11 | F | AF17 (3) | LF01 (3) | Reader, A card | F-VEST / K-BRIDGE | x 40, z 40-43.5 | no | brief 6, 5 AF17 |
| RA12 | F | LF01 (3) | BF01 (3) | Reader, B-tier card or escort PIN; bridge post | K-BRIDGE / B-FLOBBY | x 52, z 40-43.5 | no | brief 6, 5 LF01 |
| RA13 | G | AG21 (3) | X10 (1) | Fire exit, exit only, no outside hardware, alarmed | V-AFS / S-WPATH | x 4, z 54-57.5 | yes (exit) | brief 6; 6.2 |
| RA14 | R | AR04 (3) | AR01 (3) | Roof door, key outside, thumb-turn inside (AF15 below) | R-BULK / RF-A | x 10.5, z 54-57.5 | no | brief 6; 3.3 R-BULK |
| RA15 | G | X03 (1) | TB02 (4) | Heavy lid, carriers' and Ostler's lifting keys | S-YARDA / V-TB02 | plan | yes (ASK-2) | brief 6; 5.3, 6.1 |
| RA16 | G | AG22 (3) | AG23 (4) | Locked floor hatch, key | G-EAST / V-AG23 | plan | no | brief 6; 6.1 |
| RA17 | B | TB04 (4) | BG32 (5) | Riser door at the tunnel end, reader B-tier or PIN | T-TUNB / T-RISER | z 30, x 72-74 | no | brief 6; 6.1 V-BG32 |

## 5. Check scripts
- New: `timeout 60 node scripts/kestrel/p03b-ring-check-f.mjs docs/kestrel/03B-block-plan.md` (must say `fails 0`; RA14's INFO is expected).
- Rerun, all must say fails 0: `timeout 60 node scripts/kestrel/p03b-vert-check-e.mjs docs/kestrel/03B-block-plan.md` (E), `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md` (A), `timeout 60 node scripts/kestrel/p03b-zones-check-b.mjs docs/kestrel/03B-block-plan.md` (B), `timeout 60 node scripts/kestrel/p03b-zones-check-d.mjs docs/kestrel/03B-block-plan.md docs/kestrel/02-building-brief.md` (D).
- Never write that a check passed unless you ran it on 03B-block-plan.md.

## 6. Write section 7
Add "## 7. Ring entries" after section 6.4 (before Appendix A), with the intro, then "### 7.1 Site, Building A, bridge and under the yard": the table (verified), then:
- "Self-check (this session):" the F, E, A, B and D summary lines.
- "Deviations:" RA02 east service gate opposite X08, not beside X12 (brief 4); RA10 AF10 off AF21, not AF01 (3.4); anything else you changed.
- "Notes for P04, 1f-b and P03R:"
  - P04: each door goes on its segment; RA01's gates sit east of the gatehouse so the officer sees both; RA07's three security doors share z 43.5 with no zone 2 contact (3.3 G-SEC).
  - P03R: brief 4 east service gate wording (opposite X08).
  - 1f-b: RA12's B reader is the bridge post's door; B's rows start at RB01.
Line 2 of the file: "Status: DRAFT (Part 1f-a done: ring entries site and A; Part 1f-b next)".

## 7. Self-check (all from commands; paste the summary lines)
- F `ring 17 (RA 17, RB 0) ... fails 0`; E, A, B and D 0 fails.
- Every row has a source and a ring that matches brief 6 (the script checks both).

## 8. End (RULES 9)
- progress.md: P03B row "DRAFT (parts 1a-1f-a)", commit, date; one log entry of at most 6 lines.
- lessons.md: one line.
- Commit "kestrel P03B 1f-a: ring entries, site, A, bridge and tunnels" and push.
- Report in at most 8 lines, then the Next step block:
Next step:
1. Type /clear.
2. Stay on Opus, medium.
3. Send the prompt below:
```
Planner: next
```
