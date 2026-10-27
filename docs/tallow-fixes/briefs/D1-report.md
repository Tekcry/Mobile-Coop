status: blocked tgc-leads: no built solo way from the floor into leg a (S11 reach ERR) and built legs 26-62% apart; needs a G1 geometry or J12/J7 ruling; rest of D1 pushed at feature/tallow-d1 c8f33dcf3

# campaign J8 D1: Tallow Wharf's graph matches the build (Sonnet 5.5)

Released 2026-10-26 ~14:30 by the lead: gates 1-3 met. Use `<J12 ref>` = origin/feature/validator-port-c2 (has S7b and S11, the A28 split rule: see the LEAD NOTE below on its 2 ERRs). E8 runs beside you (file-disjoint).
Gate (all must be in your base; step 1 checks them):
1. **G1, G2, G3 and G4 merged**: PR G2's branch origin/feature/tallow-fixes-2 with G2 and G4 merged in, on PR G1's
   origin/feature/tallow-fixes (LP, D0 with its saved outputs `docs/tallow-fixes/val/D0-*`, G0, MB, G1, G3).
2. **J7 PR D** in the engine and so in your base (R3: no dogs, the former dogs are armed humans; `WHARF_SECTORS` has
   `dogs: 0` in all four sections).
3. TW23 is in the engine since B0b (231bdbfbf): nothing to wait for.
D1 does not need PR T, PR F, E8 or the wharf triage fix (file-disjoint: E8 edits only the e2e script and may run beside
you).
Base: origin/feature/tallow-fixes-2 at sha 2de5701c0aae18e8cfe987878df8d7791e847f43 (G1 + G2 + G3 + G4 merged; tsc + 413 tests). New branch: feature/tallow-d1 (the lead merges it into
feature/tallow-fixes-2). Lead: Night Shift | Campaign Build. Read `git show origin/master:docs/systems/agent-preamble.md`
("Cloud sessions" replaces the folder rules) first.
Plan: `docs/missions/slices/J8-J9-PLAN.md` on the engine: A10, A22, A29, A30, section 6 row D1 and "D1 graph matches
the build", "D0 wave-0 graph" (its run block), section 10 (the J8 gate). LP: `docs/tallow-fixes/EGRESS.md` section 1
(the design numbers D0 built to; its rows are named E1-E10: egress rows, not slice E8) and `docs/tallow-fixes/LIGHT.md`
sections 2-5 (each space's type, band, tonight, fittings, darkness). D0's `docs/tallow-fixes/val/D0-note.md` (its
final link numbers, splits, worst reach paths, the lead's rulings on them).

## Only these files
- `docs/missions/prototypes/campaign-map/graph.json`
- `docs/tallow-fixes/val/D1-*` (new: saved validator outputs, `D1-graph.diff`, `D1-note.md`)
- `src/world/maps/tallowWharfSectors.ts`: `WHARF_GUARD_EXTRAS` and its doc comment only (lead ruling ~09:05: a narrow
  claim; G2 owns the rest of the file and is merged before you start).
- `tests/tallowWharf/sectors.test.ts`: the title of the "counts" test in `describe('tallowWharf guards')` only (same
  ruling). Step 3 says why.
- A temporary measuring test (step 2) you run and delete; never committed.
Not yours: the TGC / TKL graphs and BEATs (J7's), the SPEC and SIGNOFF pages (P1), every other code or test file, the
validator scripts.

## Why
D0 set the design numbers on the graph before any geometry; G1-G4 then built the map. The graph is what the validator,
route-runs (J13) and the measured pass (GBM) read, so it must say what was built: the guard counts the build spawns (A10),
the checkpoint the build restarts at, the links as measured, the rooms' real extents, the lighting as LP planned and the
builders built it (Q2 "Never", M1), and the designed exit's run (G157 9). D1 confirms D0's numbers; a measured number
worse than D0's is a fix in the section (the lead routes it to the slice owner), never a graph edit that hides it.

## What to change
1. **Gate checks** (stop with `status: blocked <which>` if one fails): `docs/tallow-fixes/val/D0-note.md` exists;
   `git log --oneline | grep -c "tallow G[1-4]:"` finds commits of all four; `grep -n "dogs:" src/world/maps/tallowWharfSectors.ts`
   shows 0 in all four sections; `npx vitest run tests/tallowWharf/ --maxWorkers=2` is green on the base (a red test is
   a base problem: report it with its message, do not fix it).
2. **Measure from the build.** A temporary `tests/tallowWharf/_d1measure.test.ts` that imports `builtWharf` and the
   other helpers your base's `tests/tallowWharf/helpers.ts` exports, `WHARF_SECTORS`, `WHARF_GUARD_MISSIONS`, the
   section exports (`W1`-`W4`: `throws`, `doors`, rooms, debug points) and prints JSON: the built rooms by id with their
   boxes and floor; every guard (section, index, `x`, `z`, floor, role, `reason`, which graph space's `area` holds his
   post, which missions spawn him); each throw's take-off edge, stage box and gap; each EGRESS E1-E10 link measured as
   EGRESS section 1 defines it (door to door along the walk: the doorway points from `W<n>.doors`, or the nav path
   length if the helpers export a path function); the jetty drop's floor heights (jetty top and canal bed); the gallery
   ladder's foot and top heights; the TKL and TGC split legs from the build's route points (`W3_ROUTES`, and the W1 points
   D0's note used) at `split_speed_mps` 1.3; each split's worst reach path at `reach_speed_mps` 3.0; the two exit runs
   (step 9). Paste the script's source and its output into `D1-note.md` (an appendix, so the numbers can be rerun), then
   delete the file. No number in the graph is typed from a brief: each comes from this output.
3. **Guard counts (A10).** Each space's `guards` (`{ "2": n }`, the file's form) = the guards of `WHARF_SECTORS[i].guards`
   whose post lies in that space's `area` on its storey (within 1 m). A guard whose post is in no graph space (the front
   hall, a stair) counts in the space his route spends most of its points in; name him in that space's note. The section
   sums then equal the spawned counts (today W1 9, W2 10, W3 10, W4 12: use your base's numbers). Each touched space's
   "Guards:" sentence names them by the build's roles and `reason` text, "(TGC only)" / "(TKL only)" from
   `WHARF_GUARD_MISSIONS`; no dog text anywhere (`grep -ni "dog" graph.json` finds nothing). `tests/tallowWharf/sectors.test.ts`
   ("counts ... the graph's sums plus the listed extras") then needs `WHARF_GUARD_EXTRAS` empty (its 6 entries are exactly
   today's drift: W1 +2, W2 +4): make it `[]` (keep the export and its type) with its doc comment rewritten ("none since
   J8 D1: the graph counts every spawned guard, A10") and the test title "the graph's sums" (its logic is unchanged and
   passes with an empty list). Nothing else in either file changes.
4. **The W3 checkpoint.** The build restarts W3 at the roof bulkhead's head (`W3_START` = `BULKHEAD_HEAD`,
   `tallowWharfSectors.ts`): `checkpoint` leaves `w3-east-yard`'s tags and joins `w3-roof`'s; the east yard's note
   loses "W3 checkpoint (TKL)". Check the other three: W1 (`w1-canal-steps`), W2 (`w2-arcade`), W4 (`w4-back-lane`) carry
   `checkpoint` and hold their section's `*_START`; report any mismatch, change only W3's (encounter checkpoints are J23).
5. **Links re-measured.** For each link D0 added or changed (EGRESS E1-E10; the gallery ladder; the split `time_s`
   values; the two long throws; the pie throw; the plant ladder) set `length`, `width`, `level_change` and `time_s` to
   the step 2 numbers where they are the same or better than D0's, and add to its `note`: "measured from the build (J8
   D1, <date>)". Worse than D0's (a longer walk, a gap other than 4.9 m on the two long throws or other than 2.5 m on
   the pie, a reach over 15 s, a split leg pair over 20% apart): do not write it; list it in `D1-note.md` and the report
   as a section fix with the slice that owns the geometry. Name every link `from>to` (A22), never by number; state the
   final 0-based numbers D0's deletions left (EGRESS section 1 expects the C5 throw at 31 and the bulkhead at 34; the
   plan text says 32 / 35: say which the graph has). The bulkhead link `w3-roof>w3-east-wing` stays unbolted with
   `bolted_in: ["twoKeyLedger"]` (A30).
6. **Rooms.** For each graph space whose id matches a built room, `area` and `size` follow the built box(es) when they
   differ (`size` is [short side, long side, height] in this file: check two unchanged spaces first). Expected at least:
   `w2-pawn-loft` now z 62-67.6 (G2 step 1, the A28 cut-back). Report every change with the room class check's result.
7. **Vantages.** Each encounter's `vantage.at` = the midpoint of its two built vantage points (the section exports'
   `w<n>-vantage-*` debug points) and `from` = the space they stand in. `sees_pct` stays as declared (GBM measures it);
   the note says what LP found: the W1 fish hall pair crouched at the warden's inspection hatch (about 61% of the hall
   floor each, LP fix round 1); the W2 reading pair sees the pawn stage and the stage door only (LP pick 19, ruled a walk
   item); the W4 yard pair at the gantry's glass look-out bay sees only the yard north of z ~21.7 and cannot meet the
   declared 0.85 (LP pick 15). Lead ruling ~09:05: **keep `sees_pct` 0.85** on `w4-shed-yard`; its note says "declared
   0.85 kept (lead ruling); the gantry's look-out bay sees the yard north of z ~21.7 only (LP pick 15): a walk item for
   Michael, GBM measures", and `D1-note.md` lists it under "Walk items for Michael" with the W2 reading pair (pick 19).
8. **Lighting text.** Every space note's light sentence is rewritten from its LIGHT.md row ("Light (LP, LIGHT.md
   section N): <type>, band <band> (provisional, A2); tonight <tonight>; fittings <groups>; dark at <darkness from>;
   <cut or shot opens>"), closed rooms named as M1's night fittings. `meta.note`'s lighting sentence becomes: "Lighting
   (Q2 'Never', Q3, M1; docs/tallow-fixes/LIGHT.md): every fitting is on and working; closed rooms are lit only by the
   night fittings a real site leaves on; darkness comes from cover, the real gaps between fittings, cut circuits and
   shot lamps; bands are provisional (light-realism's draft table, A2) until Michael approves the band table." After
   this, `grep -niE "lit by default|dark by default|LR1|G279" graph.json` finds nothing. `meta.section_info.W2.forced_coop`
   says which throws are forced: "team_throw (pawn loft -> reading room: a 5.8 m site throw over a 4.9 m gap, forced,
   M2; pie loft -> clock loft: a standard 2.5 m throw, not yet forced, the plank bridge later, M2 / G403)" and the
   spine line "(arcade roof -> counting house roof: a 5.8 m site throw over 4.9 m, forced, M2)".
9. **The designed exit (G157 9, level-design 3.10: "under 2 minutes, or a different route for at least half of the way
   back").** From the build's route points: Three Grey Coats, tgc-4's item (`W4-obj`, shed three) to the W4 extraction
   box; Two-Key Ledger, tkl-4 (the coal-yard overhear box, W3) to the W4 extraction box. Each run's length and time at
   1.3 m/s and 3.0 m/s, and whether it is under 120 s at 1.3 m/s or, if not, which part of the way is new ground (TKL
   leaves forward through the cartway into W4, never back). One line per mission in `meta.note`: "Designed exit (G157 9):
   <from> -> <to>, <m> m, <s> s at 1.3 m/s: <under 2 min | a different route for <x>% of the way>".
10. Leave every other field as it is: the shutters' `"gap": 0.9`, the Q19 text, the TGC / TKL nodes (not in this file),
    `bolted_in`, the split tags D0 set (only their `time_s` may change, step 5).

## Validator runs (save every output under `docs/tallow-fixes/val/`, names `D1-<ref>-<run>.txt`)
Extract each validator ref into a scratch folder outside the repo (cloud: a temp dir), plain node, no npm:
```
for R in origin/master origin/feature/mission-validator <J12 ref>; do D=<scratch>/${R##*/}; mkdir -p $D && git archive $R scripts docs/design | tar -x -C $D; done
M=<abs repo>/docs/missions/prototypes/campaign-map/graph.json
node <scratch>/master/scripts/level-validate.mjs $M
node <scratch>/master/scripts/level-validate.mjs $M <abs repo>/docs/missions/prototypes/three-grey-coats/graph.json
node <scratch>/master/scripts/level-validate.mjs $M <abs repo>/docs/missions/prototypes/two-key-ledger/graph.json
node <scratch>/mission-validator/scripts/level-validate.mjs $M
```
- `<J12 ref>`: the ref D0's note used for J12's long-throw exception; if that ref is gone, the newest that contains
  S7b (`git merge-base --is-ancestor origin/feature/validator-port-s7b <ref>`: today origin/feature/validator-port-train
  does). Run map, map + TGC and map + TKL on it too; there the two named throws should read as long-throw INFO.
- The TKL-state runs: a scratch copy of the map graph with `w3-roof>w3-east-wing` set `bolted: true` (not committed),
  on master's validator alone and with the TKL graph (`D1-master-tklstate*.txt`).
- If an extract has no `docs/design/metrics.json`, run that ref's `scripts/metrics-gen.mjs` into the extract first.
- `D1-graph.diff`: `git diff <base sha> -- docs/missions/prototypes/campaign-map/graph.json`.

## Checks (cloud: no e2e, no GPU, no npm run check)
- The runs above, saved.
- `npx vitest run tests/tallowWharf/ --maxWorkers=2` (the graph-reading tests: `shell.test.ts` bounds, section boxes,
  boxes over spaces; `sectors.test.ts` sections and guard counts; `w1.test.ts`, `w3.test.ts` graph lines). A test the
  graph change breaks: report it with its message; fix it only if it is the counts title of step 3.
- `npm run typecheck:fast` and `npx eslint src/world/maps/tallowWharfSectors.ts tests/tallowWharf/sectors.test.ts`
  (step 3 touches them).

## Done
- master's validator **0 ERR** on map, map + TGC, map + TKL and both TKL-state runs, except the two named lines until
  J12's long throw is on master (A22): `link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m
  throw` and `link w2-arcade-roof -> w3-roof (team_throw): gap 4.9 m above the 2.7 m throw`; the pie link has no
  exception and no ERR; the mission-validator 0 ERR on the map (a known J12 item it still raises: name it, do not fix);
  J12's ref 0 ERR with the two throws as INFO; `checkCoop` clean on both splits; every WARN listed with its reason (P1
  writes them into the SPEC).
- `D1-note.md`: the refs and shas, the date, a table per run of D0's ERR / WARN against D1's, every number D0 -> D1 with
  its measurement, the final link numbers, the counts per space and section, the checkpoint change, the room and vantage
  changes, the exit-run lines, the section fixes found (worse than D0), and the step 2 appendix.
- Commits on feature/tallow-d1 prefixed `tallow D1:`, trailer "Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. Never merge, rebase, force-push, or push to
  feature/tallow-fixes-2 or feature/mission-engine.
- Size: docs (the graph, about 120-180 changed JSON lines) + about 8 code lines (the emptied list and its comment, the
  test title); 2 h.

## Report (append below, then set line 1 to `status: done feature/tallow-d1 <sha>`)
ERR / WARN per run with the file names; D0 -> D1 differences; the section fixes found; the counts; the step 3 code
lines; test results; deviations; the walk items for Michael (the W4 gantry `sees_pct`, the W2 reading pair); open items
for the lead (at least any room class result from step 6).

## LEAD NOTE (2026-10-26 ~13:05, Campaign Build): two ERRs D1 must clear
Marlow's validator-port S11 (J12 A28, on origin/feature/validator-port-c2 b2d2a2554, not yet on master) turns
`split tgc-leads leg a: no solo link leads into w1-gallery` into an INFO line, and then the split check walks the legs and
prints two new ERRs on today's graph (origin/feature/tallow-fixes c648c5d85):
- `split tgc-leads: legs 28.4 s vs 21.9 s differ by 23% (max 20%)`: the graph still carries D0's estimated link times.
  G3 measured the built legs at ~22.7 s (a) vs ~21.0 s (b), 7.5% (C:/NightShift/scratch/campaign/tallow-g3-check.md).
  Your re-measure from the built geometry must bring the graph's legs within 20%; report both sums.
- `split tgc-leads: a downed partner at w1-tea-stall cannot be reached from the other leg`: check the built W1 first:
  G1 added the gallery ladder and W1 cover / route changes (tallow-g1-check.md). If a built link already lets the leg-a
  player reach the tea stall (ladder, drop, door), add that link to the graph with its measured values. If none exists,
  stop and set `status: blocked` with the two cheapest geometry options (place, size), not a graph-only fix.
Run the S11 validator in addition to master's: extract `git archive origin/feature/validator-port-c2 scripts docs/design src/world/levelMeasure.ts`
into a scratch folder and run `node scripts/level-validate.mjs <graph>`; save its output as `docs/tallow-fixes/val/D1-s11-map*.txt`.
Done adds: 0 ERR on the S11 validator apart from the two named throw-gap ERRs (A22).

**LEAD NOTE 2026-10-26 ~14:25 (G2 checker, tallow-g2-check.md).** A thrower standing 0.7-1.0 m sideways of the pawn
mark lands the partner on the stage edge with the body 0.29 m over it (brief: land 0.3 m inside or refuse). Nothing
lands outside the stage. If D1 touches the pawn site, tighten the landing to 0.3 m inside or refuse; otherwise leave it
on the polish list for Michael's walk.

## Report (Night Shift | Cloud Builder 4, 2026-10-26)
Branch feature/tallow-d1, head c8f33dcf33d1dc9787d8658633a2d5eb17f3df5a (base 2de5701c0). Commits: 57d83631 the graph; ac07b9b7 step 3 code; c8f33dcf3 validator outputs, `D1-graph.diff`, `D1-note.md`. Files: only the brief's list. Full numbers, the measuring test's source and output: `docs/tallow-fixes/val/D1-note.md` (the temporary test was deleted, never committed).

**Why blocked, not done:** everything in steps 2-10 is pushed, but the Done bar is not met: split `tgc-leads` keeps 2 ERR on S11 and 1 ERR on master. The LEAD NOTE's blocked case does not apply as written: the built link it asks for exists (leg-a player from the gallery to the tea stall by the caged ladder) and is already in the graph. The ERR fails for another reason: on the real bolts, the leg-b player on the floor has no solo way up to a partner downed on the gallery / in the office. Clearing it needs a G1 geometry change or a J12 / J7 ruling (options under section fix 7).

Gate (step 1): all pass. `D0-note.md` present; `tallow G1-G4` commits 3 / 1 / 4 / 6; `dogs: 0` in all four sections; `tests/tallowWharf/` on the base 7 files, 298 passed.

ERR / WARN per run (`docs/tallow-fixes/val/`; identical across each validator's runs):
- `D1-master-map.txt`, `-map-tgc`, `-map-tkl`, `-tklstate`, `-tklstate-tkl` (master 78c241933): 3 ERR, 10 WARN. ERR: the two A22 throw-gap lines (`w2-pawn-loft -> w2-reading-room`, `w2-arcade-roof -> w3-roof`); `split tgc-leads leg a: no solo link leads into w1-gallery` (S11 not on master).
- `D1-mission-validator-map.txt`: 2 ERR (the two throw-gap lines, the known J12 item), 10 WARN.
- `D1-s11-map.txt`, `-map-tgc`, `-map-tkl`, `-tklstate-tkl` (J12 ref = validator-port-c2 8078660d6): 2 ERR, 10 WARN. The two throws read as long-throw INFO; leg a's co-op entry INFO. ERR: `split tgc-leads: legs 28.4 s vs 21.9 s differ by 23% (max 20%)`; `split tgc-leads: a downed partner at w1-tea-stall cannot be reached from the other leg`.
- `D1-validator-port-train-map*.txt` (D0's ref, for comparison): 3 ERR, 11 WARN (+ `metrics: sizes.throw_long is missing`).
- Pie throw: no exception, no ERR. `checkCoop` clean for `tkl-wings` everywhere; not clean for `tgc-leads`.
- WARNs: `room_class custom` x5 (`w1-canal-steps`, `w2-arcade-roof`, `w3-roof`, `w3-chute`, `w4-boat`: no sheet class); `w3-chute` size 1.2 off grid (the 1.2 x 1.5 crouch duct); E1 12.4 and E2 9.8 off grid (D0's A5 values kept, measured 12.35 / 9.75); new: `w2-pawn-loft size 5.6 off the 0.5 m grid` (the A28 cut-back); new: `w3-east-yard: 2 guards below the early band 3-6` (A10 puts the lodge porter in `w3-lodge`).

D0 -> D1 (written only where same or better):

| Link (index) | Change |
| --- | --- |
| `w2-arcade>w2-reading-room` (21) | length 27 -> 12, time_s 12 -> 9.2 |
| `w4-jetty>w4-canal-ledge` (72) | length 6 -> 3 |
| `w2-lane-window>w2-arcade-roof` (30) | length 16 -> 12 |
| `w2-arcade>w2-pawn-loft` (22) | length 14.5 -> 10.5, time_s 8 -> 7.9 |
| `w2-walkway>w2-pawn-loft` (25) | length 6.5 -> 4.5 |
| `w3-roof>w3-east-yard` (33) | length 31 -> 17, time_s 14 -> 12.9 |
| `w3-roof>w3-east-wing` (34) | length 21 -> 19; still unbolted, `bolted_in: ["twoKeyLedger"]` |
| `w2-walkway>w2-arcade-roof` (74) | length 36 -> 35.5 |
| `w2-pawn-loft>w2-reading-room` throw (28) | time_s 5 -> 2.8 (gap 4.9 confirmed) |
| `w2-pie-loft>w2-clock-loft` throw (29) | time_s 5 -> 2.9 (gap 2.5 confirmed) |
| `w2-arcade-roof>w3-roof` throw (31) | time_s 5 -> 2.6 (gap 4.9 confirmed) |
| `w3-roof>w3-west-wing` (35) | length 21 -> 17 |
| `w3-west-wing>w3-passage` (46) | length 15 -> 12.5, time_s 12.7 -> 9.6 |
| `w3-east-yard>w3-east-wing` (36) | length 19 -> 2.5 |
| `w3-east-wing>w3-passage` (43) | length 15 -> 6, time_s 5 -> 4.7 |

- Confirmed same: E1 12.4, E2 9.8, E4's 4.4 m drop and 3 s, E5 6.0 / 4.5, E11 6 s.
- Final link numbers: the C5 throw is 31, the bulkhead 34 (EGRESS's; the plan's 32 / 35 are stale).
- Rooms as built: `w2-pawn-loft` [44, 62, 54, 67.6] size [5.6, 10, 3]; `w3-chute` [96.5, 50, 97.7, 52] size [1.2, 2, 1.5]; `w3-cartway` [88, 34, 92, 38] size [4, 4, 3].
- W3 checkpoint: `w3-east-yard` -> `w3-roof` (`W3_START` = the bulkhead head). W1, W2, W4 already match their starts.
- Vantages at the built pairs' midpoints: `w1-fish-hall` from `w1-warden-office`; `w3-east-yard` from itself (fire escape half landing); `w3-east-wing` from `w3-east-post`; `w3-west-wing` from itself (iron gallery); `w4-shed-three` from `w4-shed-two`; W1 market, both W2 pairs, W4 yard: `at` moved, `from` unchanged. `sees_pct` unchanged; `w4-shed-yard` keeps 0.85 with the ruling text.
- Lighting: all 37 notes carry the LIGHT.md sentence; `meta.note` has the brief's line; `grep -niE "lit by default|dark by default|LR1|G279"` 0, `grep -ni dog` 0. `W2.forced_coop` names the forced throws.
- Exit lines (G157 9): TGC 19.6 m, 15.1 s at 1.3 m/s (6.5 s at 3.0), under 2 min. TKL 45.5 m, 36.4 s at 1.3 m/s (17.6 s at 3.0), under 2 min; forward through the cartway, 74% new ground.

Section fixes found (measured worse than D0; not written):
1. G3: `w3-roof>w3-west-wing` 13.9 s (D0 10 s).
2. G3: `w3-east-yard>w3-east-wing` 2.0 s (D0 1.5 s); the fire escape's foot is 2.65 m from the gate.
3. G3 / G2: `w3-roof>w3-east-wing` 14.8 s (declared 14); flights 1.2 m wide (declared 1.3).
4. G2: `w2-arcade>w2-reading-room` (public stair) built 1.7 m wide (declared 2.4).
5. Engine fact: ladder climbs take 10.0 s on `w1-canal-steps>w1-gallery` and 8.9 s on `w2-lane-window>w2-arcade-roof` (time_s 3 and 5). Lead ruling needed: should time_s carry the climb?
6. G1 / J7: TGC legs too far apart. Graph (unchanged) 28.4 vs 21.9 s; measured door to door 42.0 vs 16.0 s (62%; 31.4 m of gallery walk alone is 24.2 s); with a meeting point under the clock 57.2 vs 42.5 s (26%). G3's ~22.7 / ~21.0 not reproduced.
7. G1: TGC reach from the warden's desk 16.1 s by the ladder, 16.5 s by the stair (limit 15). From the floor, no solo way up on the real bolts (checked with `soloNav`). S11 walks reach from the named space, so its message names the wrong end (a scratch run walked the other way reports `a downed partner at w1-gallery cannot be reached`). Options: (a) J12: walk reach toward the downed partner and fix the message; (b) J7 / J12: model the cage door A opens on arrival; (c) geometry 1 (G1): leave the warden's stair foot (7, 0, 44) unbolted (fits LP pick 13, the warden out on rounds): graph reach 14.5 s, measured ~16.5 s, and C1 stops being the only way up; (d) geometry 2 (G1): make the cage door at (6.6, 0, 14.4) plain: a solo twin of the boost, an ERR unless C1 is dropped.

TKL: legs measured 23.5 vs 19.7 s (16%, within 20%); graph sums 19.6 / 19.1 s; worst reach 13.3 s (limit 15).

Counts: W1 9, W2 10, W3 10, W4 12. W1: market 4, fish hall 3, tea stall 2. W2: arcade 3, reading room 4, pawn loft 1, pie shop 1, pie loft 1. W3: east yard 2, lodge 1, east wing 4, west wing 3 (the front-hall watchman counted here). W4: shed yard 6, shed three 6.

Step 3 code lines:
```ts
/** The guards the graph does not count, and why: none since J8 D1: the graph counts every spawned guard, A10. */
export const WHARF_GUARD_EXTRAS: readonly { id: string; why: string }[] = [];
```
Test title: `it('counts: W1 9, W2 10, W3 10, W4 12; the graph\'s sums', () => {`.

Tests: `npx vitest run tests/tallowWharf/ --maxWorkers=2` 7 files, 298 passed (same as base); `npm run typecheck:fast` exit 0; `npx eslint src/world/maps/tallowWharfSectors.ts tests/tallowWharf/sectors.test.ts` exit 0. No e2e, no GPU (pending PC run if the lead wants one).

Deviations: lengths on the 0.5 m grid (E1, E2 keep 12.4 / 9.8); throw lengths not re-measured (no door-to-door ends), only gap and time_s; the fire escape (E9) uses the route-point polyline (the guards' nav does not walk its steep upper flight and detours 55 m); the tea stall room not written (built 8 x 8 gives `ERROR: w1-tea-stall: 8 x 8 m below break_room minimum 7 x 8.5`); no TGC leg link written (legs over 20% apart); extra runs: TKL-state + TKL on S11, D0's train ref for comparison.

Walk items for Michael: the W4 yard vantage (gantry look-out bay sees the yard north of z ~21.7 only; `sees_pct` 0.85 kept by the lead ruling, GBM measures); the W2 reading pair sees the pawn stage and stage door only (LP pick 19).

Open items for the lead:
1. Room class: the built tea stall is 8 x 8, below break_room's 8.5 m: G1 deepens it 0.5 m, or its class becomes `custom` (a WARN).
2. The TGC split (section fixes 6 and 7): the blocking question.
3. TKL measured from the C5 landing: roof walk 8.9 m to the sash, 29.7 m to the fire escape head, legs 30.4 vs 42.6 s (29%); the validator cannot see it because the roof is the fork.
4. Redundant deviations: the W2 / W3 deviation entries for pawn loft, chute and cartway, and the tests' `OVERRIDE` maps, now match the graph (G2 / G3 cleanup).
5. Story conflict: EGRESS W1 slot 0 says the warden "bolts it behind him"; LP pick 13 has him out on his rounds.
6. Nav coverage for J13 / GBM: the canal bed and the fire escape's steep upper flight are not in the guards' nav.
7. Out of D1's scope: the LEAD NOTE ~14:25 pawn landing item stays on the polish list (D1 did not touch the pawn site).
