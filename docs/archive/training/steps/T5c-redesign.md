# Step T5c - BAYS v2: the nine bays redesigned under the course rules (docs only)

Model: opus (one designer agent, then a fresh opus checker). Deps: T5b. No code.

## Read
- SPEC.md "Course rules" R1-R8 (Michael, D40-D47); docs/training/WALK-NOTES.md; DECISIONS.md D1-D48 (scan)
- BAYS.md v1 (each bay's sheet: purpose, drills, gates, guards, light plan, ghost plan), FEATURES.md (drills per bay)
- docs/level-design.md sections 2, 3, 16 (with SPEC's exceptions E1-E12)

## Task (decisions)
1. Rewrite BAYS.md as v2 (keep v1 as `docs/training/BAYS-v1.md` for history). Same nine bays, same drills and story (D47);
   new layouts that meet R1-R8:
   - each bay a chain of compact rooms (R4: typical 8-14 m, footprint at most about 60% of v1), linear (R1), every
     element spanning its room or funnelled so it cannot be bypassed, falls returning to the element's start (R2);
   - movement bays (B2, B3, B4) one shared course both players run (R3): B2 becomes one lane with every element in
     sequence (ladder and drainpipe both, one after the other, for both players); B3 split / wall jump / rope / zipline
     for both (one after the other where only one fits); B4 team moves as a pair;
   - splits only where the drill's story needs them (R3), each listed with its reason: B3 fan isolation (if kept), B5
     breaker, B6 operator / runner, B8 overwatch, B9 keys; rejoin at once;
   - every bay ends in an automatic airlock with its marked pad (R6);
   - the look (R7): per bay, where glass partitions, observation windows, steel and LED strips go; the shell stays dark;
   - light plans, guard sheets, the B9 ghost plan and the element register redone for the new rooms (numbers stay in the
     same windows: guard cycles 25-45 s, co-op lips 4.3-4.5, split gap rules, LANDING bands).
2. Coordinates: new world offsets table (smaller footprint; nothing below y -1.5; no bay under another in plan).
3. A section "R1-R8 check" per bay: one line per rule with how the bay meets it; an "Unavoidable elements" table (element,
   how it blocks, the nav test that proves it).
4. Update FEATURES.md "who" columns (both for every movement row), section 11, and the drill lists; update PLAN.md
   section 4 if a step's scope changes.

## Checks
The checker reads BAYS v2 against R1-R8 and the v1 drill list (nothing lost), cites lines, PASS or FAIL list.

## Commit
"training T5c: BAYS v2 - linear, unavoidable, together, compact, automatic airlocks, glass and LED". Docs: LOG, STATE.
