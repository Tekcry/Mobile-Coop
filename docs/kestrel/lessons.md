# Lessons for the map template

Collected stage by stage; turned into the map template at P11 (Michael, 2026-10-11).

- Long sessions gave poor results on earlier maps; P03B stalled for over an hour, then hit the 128k output limit trying to design 151 rooms in one reply. One deliverable per session, split into parts.
- Precompute simple positions in the prompt; sessions verify instead of invent.
- Medium effort by default; high effort on a big task causes runaway thinking.
- CLAUDE.md's main-project reading list ran on the map branch; a map branch needs its own reading rule.
- The progress log grows fast; archive old entries.
- Keep each decision in one place; duplicated rosters and stage orders went stale.
- A campus needs per-building checks: A30 counted a stair in one building as serving the other's floors.
- Every height used by a walkable surface needs a level; the 7.8 m bridge roof fitted none.
- Prompts live in the repo and a planner session writes them; copying prompts between chats lost decisions.
- Questions carry a recommended answer and are answered in the stage session.
- Build the template after the playtest (P11), not before.
- Briefs should give centreline sizes, not clear sizes: 0.45 walls on a 0.5 grid make most clear sizes (1.5 m passage) impossible, and a separate block (the wing) needs its grid stated.
- Line limits did not stop overload: P03B-1b packed 45 rooms on three floors into one section at high effort. Cap decisions, one floor per session, never high effort; Michael controls the effort setting.
- Spine frontage is a hard budget: count door-metres (about 70 m wanted vs 60 m available) before fixing room depths; a building brief that asks every room for a corridor door and an outside wall cannot be placed as given.
- A session judging its own work recommended deferring a real defect (five rooms with no door). Universal checks in every self-check, no recommending a deferral, and the planner reviews each session's output before the next prompt.
- Tell the user the model on every Next line; the planner's review needs the stronger model.
- Three sessions failed because the planner turned the block plan into room placement, a puzzle the brief made nearly impossible (74.5 m of doors on a 60 m spine). Check each prompt against its stage's definition, test feasibility with arithmetic before any puzzle, zones first, rooms in P04.
- A prompt that fixes a dimension should carry the scale-sheet minimum in its table; the first candidate corridor width (2.7) broke the sheet's 3.0 floor and Michael had to correct it.
- A planner candidate with precomputed sums and a check script passed on the first run in one session; prompts that carry the arithmetic and the check together are the pattern to keep.
- P03B 1c: a candidate whose check script was run by the planner on the exact tables went in unchanged in about 12 tool calls; for small tables the doors column could be printed by the script in table form to skip the insert step.
- P03B 1d: site rows still need a cross-check of each shaft's surface zone against the brief's "Doors to" (TB02's lid sat in X03, brief said X04); a check script could test that rects named as doors overlap the right zone.
- Planner, 2026-10-11: a planner wrote that the mission has no rope, but rappel was in RULES 1; the fact sat in long section 1 bullets that planners do not read. Keep capabilities in one short table (routes.md) every planner reads, and cite a line or grep for any "is or is not available".
- P03B 1e: a "Fit" column with the sum written out (flights + landings of clear) let the script and the reader check every core at once; use it for any stage that places stairs or shafts.
- P03B 1f-a: a zones-only ring table (shared face as a segment) checked by script went in unchanged in under 10 tool calls; keep door rects out of block plans and let the script test face sharing.
- P03B 1f-b: with the planner's test run and a negative test in the prompt, the session only verified and wrote; a precomputed, pre-tested table is the right size for a zones-only part.
- P03B 1g-a: a planner candidate that moves one end of the path (the exit) must recheck the other end; insertion and extraction 8 m apart passed every script but broke the brief's "different path out" - add an entry-exit separation test to path checks.
