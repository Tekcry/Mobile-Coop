# Kestrel reviewer guide

Michael sends `Reviewer: next` (after /clear, Opus medium), usually with the last report pasted under it. The reviewer is independent of the planner: it checks the last session's work, judges it, and tells Michael what to send next. It edits only this file, never plans, prompts, data or scripts. This file is the reviewer's memory: everything learned in earlier reviews is here, so read it in full every time.

## What to do
1. `git pull`. Read this file in full, docs/kestrel/handover.md Status, and the newest progress.md log entries. Read only what else you need (slices, not whole documents).
2. Check the latest commits and the files they changed against RULES.md, PLANNER.md, the relevant brief section (02-building-brief.md) and the stage's prompt file (docs/kestrel/prompts/).
3. Rerun the check scripts yourself. Part 1 scripts take docs/kestrel/03B-block-plan.md as an argument; the path check also takes docs/kestrel/routes.md; check.mjs and standards-check.mjs take docs/kestrel/kestrel.campus.blocks.json; the generator is scripts/kestrel/p03b-blocks.mjs and must leave git status clean. Compare every recorded decision's value with the generated JSON, not the run's own claim.
4. For a planner session, also review the prompt it wrote before Michael runs it: check positions, heights and kinds against the brief text (not only the numbers), wall thicknesses and stair landings, whether anything is deferred that should be fixed now, and that the Next step uses the right model (approvals and planner work on Opus, medium; runs on Sonnet, medium).
5. Judge first: is it realistic and believable (would a real architect build it this way?) and does it flow for stealth play (cover, exposure, sightlines, perches, routes, readable spaces)? Then rules and checks.
6. At a part or stage end, before Michael approves: view the plan images (docs/kestrel/plans/) and walk them as an architect and as a player. Say what feels wrong or unreal, not only what fails a check.
7. Verify your own claims before stating them: read the brief row, measure the rect. A past review wrongly called the bin store "enclosed" and said the service passage led to the drive (it leads to the padlocked compound); the planner caught both.
8. Report to Michael in plain English: whether it is right, anything missed (what it is, and why it matters to the player or to realism), and the next step. Say what a thing is ("fire stair B's outside exit"), never bare ids, check codes or line numbers. Keep it short. One step at a time.
9. Small fixes go as a FIXES block under the next run message (numbered, each with its source and the expected effect on counts). Bigger fixes, or anything that changes an approved table, go as a planner message. Ask Michael only about realism, believability or stealth flow, using the multiple-choice tool.
10. Update the watch list, expected fails and open items below if something new was learned or closed, and append one line to the review log. Commit `kestrel review: <stage>` and push.
11. End with: 1. Type /clear 2. Switch to or stay on <model, effort> 3. Send the prompt below (in its own code box).

## Michael's review preferences
- Main question: realistic, believable, flows well for stealth play. Building sizes are free within the RULES 2 caps (site 110 x 80, each building 48 x 30); never ask him about fitting things in.
- Thorough over fast: there were many failed maps before this pipeline. Campaign mission ("Mission 1: Dead Line") first.
- He reads reports, not plans. Plain English, short, no jargon. He writes prompts only by pasting what you give him, so every prompt must be complete and ready to paste, never fragments to combine.
- Clean runs ("Review chat: SKIP") go straight to their Next step without review.
- He prefers a FIXES block over a planner round when a fix is small.
- He has a commercial and industrial electrical background; his own walk of the built massing is the real outside check.
- Plan images must be readable without the documents (Michael, 2026-10-11): every zone and room shows a short plain name beside its id ("Reception and front offices", "Data hall"), and the legend says in words what each security zone number means ("zone 1 - outside, public"). A plan with bare ids is a fix, not a note.
- Plan labels (Michael, 2026-10-11, after 2f): a label that fits in its room shows only there, never also as a callout; callouts go to the nearest side, and lines never cross the other building; names are simple, in Title Case, with no abbreviations; the name is large and the id small and grey under it. Zones become numbered access levels (public has no number, plain integers, no 3+), shown on signs at doors in the style of Metal Gear Solid.

## Design decisions to judge against (Michael, all 2026-10-11 unless noted; details in handover.md)
- P03B is zones only; room rectangles belong to P04.
- Link bridge roof: no parapet or rail, only a 0.3 m edge upstand, so crossing it feels exposed. Bridge walls stop at the bridge roof (3.6).
- Gatehouse walls 3.0 (2.7 ceiling); bin store a 2.4 m chain-link enclosure with no roof, a climbable fence; fences 2.4 (real 2.4-3.0); gates full fence height.
- Fire stairs: every door lands on a floor landing. Fire stair B climbs west, its exit is on the north wall into the service passage (centred 57.5), escape goes west through a push-bar gate to the rear yard. Fire stair A's roof door is at the west end; P04 puts A's corridor doors at its west end. Main stairs stay non-escape.
- Stairs: 25 risers per 4.2 m storey (0.168), not the brief's 26.
- Crawl spaces 1.5 m clear inside (hall underfloor 1.5 clear under 0.1 tiles); corridors under ceiling voids 2.4.
- Doors follow a realistic mix (stage DR): sliding glass at entrances, lobbies, both bridge ends and the mantrap; glass swing doors in glass partitions; solid doors for secure rooms, plant, WCs and stairs.
- Rappel into the hall at the cooling shaft (bolted, alarmed grille); zip line excluded on this campus.
- Mission exit: the east service gate; insertion over the lane fence about x 84.
- Repo line endings LF for json, mjs, md (.gitattributes).

## Watch list (how sessions have gone wrong)
- A run claims "all decisions match" when one does not (the generator's shortcut made the gatehouse and bin store yards). Always compare with the JSON.
- Default heights applied to things that are not full storeys (bridge walls, gatehouse, bin store). Check every wall height against the level above and the brief's Ceiling column.
- Object types taken from a kind label instead of the brief text (the brief said chain-link, open).
- Doors placed without allowing for wall thickness or stair landings (fire stair B's exit ran 0.15 into a wall; doors met half landings).
- Planner deferring DRAFT problems to later stages (RULES 9 4a: fix now; P04 cannot move stairs or cores).
- Planner using brief wording instead of the stage document's recorded deviations (RULES 7 current plan wins); every changed value must be grepped against the brief, clashes become P03R items.
- Decisions recorded only in a prompt, not under "Decisions by Michael" in progress.md.
- Capability claims without a source (RULES 5); routes and moves in routes.md.
- Approvals on Sonnet: "Planner: APPROVED" then does the next planner job, so it must run on Opus, medium. Part approvals must not set a stage's status to APPROVED unless it is the last part.
- Duplicate lines in progress.md and lessons.md; log entries outside "## Log (newest first)".
- Scale-sheet minimums and vertical clearances (standards-check.mjs).
- Line endings: the generator rerun must leave git status clean.
- Prompts over 20 decisions must be split (RULES 7).
- Plan labels overlapping each other: readability needs a command that counts label-box overlaps (0 on every plan), not a look by eye.
- Planner stating facts about an approved document without reading it (REV-levels assumed two yard-patrol guards; the roster has one). Check every "the N X" claim against the source table.
- Level mapping by old number alone: check each mapped space's real control (a padlocked compound is not a card level; a floor reached by an open stair cannot sit above the floor below it).

## Expected fails the tools revision (before P04) must clear
- Doors close to a wall end: fire stair A's roof door, the compound gate from the passage.
- Doors at fire stair landings: fire exits and stair doors (real buildings do this).
- Ladders standing on roofs: the bridge roof ladders and the hall roof ladder.
- Gates across the narrow service passage.
- Until P04 sets room rings: Building B's staff door off its front yard.
- Warnings kept as notes: the two bridge doors face each other; 10 narrow jump gaps (tunnel shafts, the service passage, a riser on A's first floor).

## Open items
- P03B section 10 questions for P03R, P04 and P06, including the bridge roof (brief still says a 1.1 rail), fire stair B's exit wall, and 25 risers (brief says 26). P03R needs a brief revision and Michael's re-approval.
- Building B's ground strip is 97% full under the zone rule; if P04 struggles: move a goods room into the wing or raise B's cap (Michael's decision).
- The pipe rack between the buildings crosses Building B's first floor 0.8-2.3 m above the floor; it is also a hand-over-hand route.
- P06: cover and a dark line on the last 57 m of open yard; hides along Building B's long ground corridor.
- DR (door kinds) runs before P04 and must answer whether the engine supports one-way doors (fire exits and push-bar gates open from inside only; doors are only locked or unlocked now).
- HK housekeeping after P03B, before P03R: condense handover, archive old progress and review log lines.
- P04: Pell's cage and the tenant cage are zone 5 rooms inside the zone 4 data hall (brief rings table); the block plan shows only the hall.
- Next milestone Michael walks: the B0 massing walk after P03R. For it, prepare what he should judge (scale, distances, storey heights, bridge alignment, crawl spaces, stair cores, entrances and roofs read from the yard).

- After 2g-1: the compound gates (drive and passage) join Perimeter to Perimeter but keep their key exemption; harmless, HK may tidy the 03B Exempt column.

## Where we are
2g-1 done and reviewed (levels 0-5 in data and tools; zone counts 0:20 1:3 2:45 3:6 4:11 5:2 with the compound fix). Next: run 2g-2 (labels and names, Sonnet medium), review all 7 plans, Michael approves Part 2, then HK, then P03R.

## Review log (newest first; keep the last 15 lines, HK archives older ones)
- 2026-10-11 P03B 2g-1: right; every check reproduces (generator clean, tests 8/61/30, campus 22 PASS 2 WARN 4 FAIL with A29 on Building B's staff door only, samples at baseline, ring check 35 fails 0, no "3+" left, zone counts as the FIXES predicted). Deviations accepted: the vault key hatch and the cooling-shaft grille (Level 2 to 4) are key or bolted, no reader, so ring-exempt is real; expand.test and module category text had to follow the values; mixed modules keep the plain map (P04 sets room levels). No fixes.
- 2026-10-11 REV-levels approval (planner): right; status lines, progress rows, 21 / 9 guards, model use rule all in. 2g-1 FIXES verified against the generator (compound maps to 2 without fix 1; exempt openings 8 to 9). Sharpened fix 2: 03B's RB09 Exempt column changes from "no" to "yes (key)" (the planner's text read as a claim).
- 2026-10-11 REV-levels: right; level counts, Level 3 list (14, AF11 only off AF10), card model, door signs, bridge door Level 2, compound and pipe rack Perimeter, 21 guards and two dog teams all check. Fix in the approval message: mission brief downstream line 20 guards / 8 dormant to 21 / 9. Tunnels sit at Level 4 with no reader (key hatch, ring-exempt lid): data only, no sign; 2g-1 checks the step rule.
- 2026-10-11 Planner (Michael's 2f review: REV-levels, 2g-1, 2g-2): mostly right; dog refs hold (enemyDefs.ts:6, archetypes.ts:134). Fixes: roster has one yard patrol (Michael: add a 21st guard, contracted dog handler, rear yard and east drive); bridge door into B is Level 2 (B's first floor is open from B's ground by main stair B); transformer compound and pipe rack Perimeter (2g-1 also needs RB09 ring-exempt). Sent as FIXES under REV-levels; 2g-1 fixes in Open items.
- 2026-10-11 P03B 2f: names right (116 of 116, no duplicates, no A30 words, names-only diff same); 13 checks reproduce, git clean. Fix (FIXES rerun): stair, ladder and void labels and building labels skip the room labels' obstacle test, so they overlap (fire stairs, carrier riser hatch over the zone 5 tag, manhole, bridge roof ladders, Building B on the roof plan). Zone 5 legend is right per brief (cages are zone 5 rooms inside the zone 4 hall, drawn by P04); wording clarified, not a question for Michael.
- 2026-10-11 P03B 2f, Michael's follow-up: no duplicate callouts, nearest-side callouts, Title Case plain names with no abbreviations, name large and id small, zones as numbered access levels with door signs (Metal Gear Solid style). Sent to the planner; the FIXES rerun is withdrawn.
- 2026-10-11 Planner (2f prompt, plain names): right; 116 names = 87 zones + 7 stairs + 6 ladders + 16 voids; A30 skips without modules and only rack objects are name-matched, so names cannot move checks; line refs hold. One fix: the legend's zone 2 omits goods-in (both goods zones are zone 2) and zone 4 omits the tunnels and locked plant under the yard.
- 2026-10-11 P03B 2e: right; 13 checks reproduce, generator leaves git clean, no duplicate lines; 7 plan images walked (realistic, flows). Michael: zones unreadable by id; plain names and a worded zone legend required before approval (planner message sent).
- 2026-10-11 Planner (2d-2b review, LF fix, 2e prompt): right; one fix: the approval message runs on Opus, medium (on the 2e run message).
- 2026-10-11 P03B 2d-2b: right; fire stair B exit moved to 57.5 to clear the stair's side wall (applied); line-endings fix and front-yard wording sent to the planner (applied).
- 2026-10-11 P03B 2d-2b prompt: fix; fire stair B exit position.
- 2026-10-11 P03B 2d-2a: right; gates raised to full fence height (planner, applied in 2d-2b).
- 2026-10-11 P03B 2d-1: fixes; bridge walls 3.6, gatehouse 3.0, bin store chain-link 2.4 with no roof (applied).
- 2026-10-11 P03B 2c prompt: planner round; fire stair B flipped to climb west with exit on the north wall; planner also fixed fire stair A's roof door (applied).
- 2026-10-11 P03B 2b: fixes; gatehouse and bin store kinds (applied); review routing and plain-English reports added to RULES 9.
- 2026-10-11 P03B 2a: fixes; bridge roof rail clash with the brief logged for P03R; stair-width and crawl-height check gaps fixed; duplicate log lines removed.
