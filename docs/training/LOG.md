# Training run - log

One short entry per step: what changed, numbers, commit. Spec change requests go here too, under the step that made them.

## Design (2026-10-13) - 6300300
SPEC, FEATURES, BAYS, PLAN, DECISIONS written in a cloud design session from Michael's answers D1-D12.

## Run files (2026-10-13)
BRIEF, RULES, STATE, LOG, PC-PASS, REVIEW-NOTES and steps/T0-T9 written for the local run.

## Scope answers (2026-10-13)
Michael's answers D14-D30 applied: art layer now (T9a, T9b), beauty pass later (SW-6B); Blocks A-B now, C-D after
locomotion step 20 is merged (TM); pause after Block B for his walk (T5b); full tutorial with markers (E11), mandatory
drills ticked per player with no skip path (D30); bay select once reached; dev solo flag; co-op lobby only; desktop
only; drills may force takedowns and combat (E4, E12); lethal rated down. New steps T1c, T5b, TM, T8a / T8b, T9a / T9b,
T10.

## Scope answers round 2 (2026-10-13)
D31-D38: no penalty for kills or forced takedowns in the drill bays; B9 ghost tiers (Ghost / Silent / Loud) with
overlapping coverage and two sync moments (BAYS B9 "Ghost plan"); first run 45-60 min; the bot playable as P2 from the
debug menu (T8c); drills kept after a restart; LANTERN voices the steps; friendly fire on.

## T0 facts and baseline (2026-10-13, cloud)
Baseline: check ok (0 lint errors / 38 warnings, 1085 tests, build ok); smoke ok; perf trend sim p95 3.9 ms, anim
0.105 ms/char, alloc 11163 KB/s, draws 41, tris 0.15 M (software GL). Facts: docs/training/T0-facts.md.
Number-only BAYS fixes: B3 RC casing top 4.0 -> 4.3 above G1 (split jump-up window 3.95-4.75; "8 m tall" was a
contradiction, now 4.3) and the bridge steps down 0.3 to G2; B3 rope 15.4 to y 2.0 -> 17.4 to the floor (the rope
bottom is the exit floor); B3 zipline end y 2.6 -> cable end y 4.5 over WP floor 2.6 (body hangs 1.9); LANDING ref
movement.ts:203 -> 204. Step files: T1b, T3, T4, T6, T7b line refs and numbers updated.

### Spec change requests (T0)
- B6 supply duct entry: the grate at 3.4 is out of reach from A5's floor (entry needs the grate within 1.4 of the
  feet). Fix: a plant platform with feet at 2.2 in A5's service passage (T4). Applied in T4's step file.
- B3 discharge duct is one-way: only the entry grate is kicked or unscrewed, the exit opens itself. The unscrew / kick
  drill sits at the pit-end entry; the corridor grille is the exit. T3 builds it so.
- Course framework (T1b): the host does not pass which player used an interactable; bolt and pair gates need the
  RemotePlayer passed to onUse (small coopHost change). S1 cameras need the course mode to hook `security.onEvent`.
  Radio needs its own HUD channel (named speaker, shown with subtitles off). Lights and door locks need sync (new).
