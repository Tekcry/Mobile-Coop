Stage P03B Part 1f-b - ring entries: Building B, hall, wing and compound.
Model: Opus, medium effort.
Decisions: 18 (B doors RB01-RB05, plant and passage RB06-RB07, wing and compound RB08-RB11, hall doors RB12-RB13, fire exits RB14-RB15, grille, roof door and hatches RB16-RB18)

## Rules for this session
- One deliverable: section 7.2 of docs/kestrel/03B-block-plan.md, at most 40 lines. The check script is ready (section 5); do not change it unless it has a bug, and say so.
- Zones only (Michael, 2026-10-11): a ring entry names the zone face a control sits on, not a door rect. P04 places the doors. Critical path, adjacency and questions are Part 1g.
- Ring entries come from brief 6's control table only. Windows, roofs, downpipes and other secret routes are P06.
- Candidate-first (RULES 7): write the candidate in your first reply, run the check, fix failures one at a time, rerun after each fix, commit after each improvement. A failure you cannot fix: write it as ASK with options (recommended first, RULES 9 4a) and stop.
- Realism first: any change must be what a real architect and security consultant would draw. Do not ask Michael about sizes.
- Budget about 15 tool calls. Commit and push after the table.

## 0. Start
1. Run: git checkout feature/kestrel && git pull && git branch --show-current
   If the branch is not feature/kestrel, stop and report.
2. Preconditions: progress.md P03B row shows "DRAFT (parts 1a-1f-a)"; 03B-block-plan.md has section 7 with 7.1 and no 7.2. If not, stop and report.
3. Read docs/kestrel/RULES.md sections 7 ("Task size" and "Reading and checking") and 9 only.

## 1. Read only these
- docs/kestrel/03B-block-plan.md: 4.2, 4.3, 4.5, 5.2, 6.1 and 7.1 (grep -n '^### ' for line numbers).
- docs/kestrel/02-building-brief.md: section 6 "Zones and controls" (grep -n '^## 6'); brief 5 rows BG01-BG43 and X07-X12 only where a row below needs checking.

## 2. Plan and why (planner, 2026-10-11)
- Same columns and conventions as 7.1. Rings from brief 6 ("3+" written 3.5). Exits outward and key-only doors and gates are ring-exempt (P02 decision: "key-only and exit-only doors ring-exempt") and marked "yes (exit)" or "yes (key)".
- RB01-RB04: the B staff door and roller door from the yard, then the two reader doors into BG05. BG07's door to BG05 uses the whole B-GGOODS west face: 4.5 packs BG08 at x 60.5-64 on the yard wall, so P04 puts BG07's corridor door north of BG08 (or reorders the zone) and records it.
- RB05: the reader door BG05 to BG10 (the one the technician wedges) on BG05's north end, z 56.5 x 58.5-60.5 (KB-BG10; x 57-58.5 is the fire stair).
- RB06 / RB07: BG28 off BG10's east end (BG28 at the plant band's west end, 4.3); the passage door on BG10's north wall, exit only, key cylinder outside.
- RB08-RB11: the wing personnel door from X07 and the double doors from the compound X09 (brief 6 "X07 / X09 to BG40"); the compound has two padlocked gates, from the drive X08 (x 100) and from the passage X07 (x 76) (brief 5 X09, X07). X09 is ring 3 (brief 6), so the two gates and the X07 door are key-only, exempt.
- RB12 / RB13: BG24's reader on the hall's north face; the equipment door BG20 to BG09 on the hall's west wall where BG09 sits (z 36-43), exit only, alarmed, exempt.
- RB14 / RB15: fire exits BG23 to X08 (east wall) and BG12 to X05 (fire stair B's west wall, 6.1 V-BFS).
- RB16 grille BR03 to BR05 (plan, V-BR05 inside the hall roof; route R04, the rappel drop, routes.md). RB17 roof door on bulkhead BR02's east face, toward V-LAD3 and the hall roof (INFO expected, as RA14). RB18 hall floor hatches to BU01 (plan; U-HALL is the hall's rect).
- Not rows (no zone face, or no brief 6 control): list them under "Inside zones" with the zone: BG07 to BG09 reader (B-GGOODS); mantrap BF06 to BF07 outer and BF07 to BF08 inner, BF08 to BF09 sealed door (B-FSEC); BG29 to BG30 / BG33 and BG30 to BG31 readers (B-GHCAR); cages BG21, BG22 (B-GHALL); lift B (G landing on x 57, z 46-48.5 from the BG04 bay; F inside B-FLOBBY; locked off at night).

## 3. Sums (planner, 2026-10-11)
- Every segment is at least 1.0 long. Shortest: RB05 2.0, RB11 2.0, RB06 / RB15 / RB17 3.5.
- Planner test run on a copy of 03B with this table: `ring 35 (RA 17, RB 18), rects 114, fails 0, info 2` (RA14 and RB17 INFO). A negative test (RB05 on the wrong zone, RB10 off the face and not exempt) gave 4 fails, so the script catches them.

## 4. Candidate to verify (correct any row that breaks the brief and say why)
### 7.2 Building B, hall, wing and compound
| Id | Level | From (ring) | To (ring) | Control | Between | Segment | Exempt | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB01 | G | X04 (1) | BG01 (2) | Staff door reader, B or contractor card | S-YARDB / B-GW | z 30, x 52-57 | no | brief 6, 5 BG01 |
| RB02 | G | X12 (1) | BG07 (2) | Roller door, key switch inside, locked at night | SI-APRON / B-GGOODS | z 30, x 64-70 | no | brief 6; 4.5 (BG07 x 64-70) |
| RB03 | G | BG01 (2) | BG05 (3) | Reader, B or contractor card | B-GW / B-GCOR | x 57, z 30-36 | no | brief 6, 5 BG01 |
| RB04 | G | BG07 (2) | BG05 (3) | Reader, B or contractor card | B-GGOODS / B-GCOR | x 60.5, z 30-43 | no | brief 6, 5 BG07 |
| RB05 | G | BG05 (3) | BG10 (3) | Reader, B-tier or contractor card (the door the technician wedges) | B-GCOR / KB-BG10 | z 56.5, x 58.5-60.5 | no | brief 6; 4.2 KB-BG10 |
| RB06 | G | BG10 (3) | BG28 (3) | Key | KB-BG10 / B-GHPLANT | x 70, z 56.5-60 | no | brief 6; 4.3 B-GHPLANT |
| RB07 | G | BG10 (3) | X07 (1) | Passage door, exit only, key cylinder outside | KB-BG10 / S-PASS | z 60, x 58.5-70 | yes (exit) | brief 6, 5 BG10 |
| RB08 | G | X07 (1) | BG40 (3) | Wing personnel door, key; push-bar exit | S-PASS / W-GEN | z 62, x 52-76 | yes (key) | brief 6, 5 BG40 |
| RB09 | G | X09 (3) | BG40 (3) | Double doors, key; push-bar exit | S-COMP / W-GEN | x 76, z 62-74 | no | brief 6, 5 BG40; 4.5 |
| RB10 | G | X08 (1) | X09 (3) | Compound gate, padlock | S-DRIVE / S-COMP | x 100, z 60-76 | yes (key) | brief 6, 5 X09 |
| RB11 | G | X07 (1) | X09 (3) | Compound gate from the passage, padlock | S-PASS / S-COMP | x 76, z 60-62 | yes (key) | brief 6, 5 X07, X09 |
| RB12 | G | BG20 (4) | BG24 (4) | Reader, B-tier; free exit | B-GHALL / B-GHPLANT | z 50.5, x 70-96 | no | brief 6, 5 BG24 |
| RB13 | G | BG20 (4) | BG09 (3) | Equipment door: no outside handle or reader, exit device inside, forced and held alarms to AG11 | B-GHALL / B-GGOODS | x 70, z 36-43 | yes (exit) | brief 6, 5 BG09 |
| RB14 | G | BG23 (4) | X08 (1) | Fire exit, exit only, no outside hardware, alarmed | B-GHCOOL / S-DRIVE | x 100, z 30-60 | yes (exit) | brief 6, 5 BG23 |
| RB15 | G | BG12 (3) | X05 (1) | Fire exit, exit only, no outside hardware, alarmed | KB-FS / S-GAP | x 52, z 56.5-60 | yes (exit) | brief 6; 6.1 V-BFS |
| RB16 | H | BR03 (3) | BR05 (4) | Bolted grille, alarm contact; key switch box beside it; roof key in AG13 | RF-BH / V-BR05 | plan | no | brief 6; 6.1 V-BR05 |
| RB17 | R | BR02 (3) | BR01 (3) | Roof door, key outside, thumb-turn inside (BF11 below) | B-RBULK / RF-BS | x 58.5, z 56.5-60 | no | brief 6; 4.3 B-RBULK |
| RB18 | G | BG20 (4) | BU01 (4) | Floor hatches, unlocked, hinged | B-GHALL / U-HALL | plan | no | brief 6; 5.2 U-HALL |

## 5. Check scripts
- `timeout 60 node scripts/kestrel/p03b-ring-check-f.mjs docs/kestrel/03B-block-plan.md` (must say `ring 35 (RA 17, RB 18)` and `fails 0`; RA14 and RB17 INFO expected).
- Rerun, all must say fails 0: `timeout 60 node scripts/kestrel/p03b-vert-check-e.mjs docs/kestrel/03B-block-plan.md` (E), `timeout 60 node scripts/kestrel/p03b-zones-check.mjs docs/kestrel/03B-block-plan.md` (A), `timeout 60 node scripts/kestrel/p03b-zones-check-b.mjs docs/kestrel/03B-block-plan.md` (B), `timeout 60 node scripts/kestrel/p03b-zones-check-d.mjs docs/kestrel/03B-block-plan.md docs/kestrel/02-building-brief.md` (D).
- Never write that a check passed unless you ran it on 03B-block-plan.md.

## 6. Write section 7.2
Add "### 7.2 Building B, hall, wing and compound" after 7.1's notes (before Appendix A): the table (verified), then:
- "Inside zones (no face; P04 places):" the list from section 2's last bullet.
- "Self-check (this session):" the F, E, A, B and D summary lines.
- "Deviations:" anything you changed from the candidate; "none" if nothing.
- "Notes for P04, 1g and P03R:"
  - P04: BG07's door to BG05 north of BG08 (or reorder B-GGOODS), recorded; BF06 opens off BF05 (brief 5), on B-FSEC's west face at x 60.5, z 48.5-53, where the bridge post in BF01 can see it; BG13 opens only into the hall, on x 70, z 43-50.5; RB09's double doors and BG42's fill point share W-GEN's east wall (4.5).
  - P04: brief 5 doors with no brief 6 control, same ring: BF05 to BF13 reader, BG05 to BG15 and BF01 to BF12 locked riser doors, X06 to X07 chain-link gate on x 52, z 60-62.
  - 1g: RB16 is the rappel route R04 (routes.md); RB13 is the hall's only way out to the strip on G, alarmed.
Line 2 of the file: "Status: DRAFT (Part 1f done: ring entries; Part 1g next)".

## 7. Self-check (all from commands; paste the summary lines)
- F `ring 35 (RA 17, RB 18) ... fails 0`; E, A, B and D 0 fails.
- Every row has a source and a ring that matches brief 6 (the script checks both); every exempt row is an exit or key-only door.

## 8. End (RULES 9)
- progress.md: P03B row "DRAFT (parts 1a-1f)", commit, date; one log entry of at most 6 lines.
- lessons.md: one line.
- Commit "kestrel P03B 1f-b: ring entries, B, hall, wing and compound" and push.
- Report in at most 8 lines, then the Next step block:
Next step:
1. Type /clear.
2. Stay on Opus, medium.
3. Send the prompt below:
```
Planner: next
```
