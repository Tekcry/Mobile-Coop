# Kestrel Exchange - map Phase 2b: alignment with the design bible

**Status:** waiting. Do not start until Michael says "start the Exchange alignment pass". That will be after roadmap Phase 3b (movement, camera and animation lock) is done on `ct-movement`.

**Type:** documents only. No game code changes in this pass.

---

## Why this pass exists

The Exchange design (map phases 0-2, `docs/prompts/exchange-design.md`) was written for the Blacklist-era verb set and today's engine facts. The design bible (`docs/design-bible.md`) changes both:

- **Cover and execution:**
  - Back-to-wall replaces snap cover and cover-to-cover (bible 5.3).
  - Mark & Execute is removed (bible 5.4).
  - Thermal and electro vision replace sonar (bible 5.5).
- **Light (roadmap Phase 1):** the light meter and guard perception read the same lamp bake the renderer uses, on every device (bible 5.1).
- **Sound (roadmap Phase 2):** ambient noise zones mask noise, and a sound meter is added (bible 5.2).
- **Co-op:** 2-4 players on the same mission; new team moves; `coopExtras` (bible 5.9).
- **Missions (roadmap Phase 4):** checkpoints, text radio, briefing, alarm levels, stealth rating (bible 5.8).

Map Phase 2 approval (D10-D27, the Space 8 secret route) is decided by Michael together with this pass, unless he approves it earlier.

---

## Before starting

1. Merge `ct-movement` into `feature/exchange-map` (or start a fresh map branch from `ct-movement` if Michael says so).
2. Read:
   - `CLAUDE.md`
   - `docs/progress.md`
   - bible Sections 1-3, 5.1, 5.2, 5.3, 5.7, 5.8, 5.9, 5.13 and 7
   - `docs/story.md` Sections 2, 4, 6 (Mission 1) and 8
   - `docs/level-design.md` Sections 5, 11 and 12
   - `docs/prompts/exchange-design.md`
   - `docs/prompts/exchange-map-progress.md`

---

## Tasks

1. **Spaces 5, 6 and 7:**
   - Replace every use of cover-to-cover with back-to-wall (peek, lean-shoot, SWAT turn).
   - Replace Mark & Execute (the Space 7 loud route) with something the CT verb set supports.
   - Update the beat chart (Section 12), and the coverage and tool matrices (Sections 14-15).
2. **Engine facts (Section 9):** re-confirm every engine fact against the updated `docs/level-design.md` Section 12. Facts likely to have changed:
   - darkness hiding the player beyond 1.8 m
   - footstep suspicion within about 2.4 m on chequer plate
   - silent gears

   List every D-numbered decision that relied on a changed fact, and fix each one.
3. **Light plan per space:** every lamp, its circuit or fuse group, the dark pockets, and which route each light change opens. Bible rule L8: at least two ways to change the light in every lit space.
4. **Sound plan per space:** ambient noise zones (power room and server hall machinery, the street, rain on the roof) and loud or quiet floors.
5. **Checkpoint plan:** one checkpoint before each space, in the dark. Confirm the existing placements against bible 5.8.
6. **Civilians and medkits:**
   - G1 (the contracted watchman) becomes a civilian (bible 5.7).
   - Place wall medkits (bible 5.13).
7. **Co-op plan for 2-4 players:**
   - Keep C1-C3.
   - Mark where the new team moves (split-jump boost, back-to-back, pull-up, rappel anchor) could add routes.
   - Propose `coopExtras` (extra cameras or lasers at 3+ players) per space.
   - Guard count never changes with player count.
   - Per space, add at least one more co-op moment: light control as teamwork, a Sync opportunity (bible C12), or a split-and-converge pair of objectives.
8. **Mission data for the shared framework (bible 5.8):**
   - objectives as primary, secondary or opportunity
   - rules (alarm limit, no kills)
   - radio lines as text
   - Write in the story's voice (`docs/story.md`): LANTERN, solo and team variants, and the sample opening in story Section 8.
   - Rewrite the briefing to match the story.
9. **Update the progress log.** Add a "Phase 2b" entry to `docs/prompts/exchange-map-progress.md`.
10. **Report and stop.** Write a short report (bible Appendix B), then STOP for Michael's approval before map Phase 3.
