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
