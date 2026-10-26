status: done feature/tallow-d0 799364de9

# campaign J8 D0: wave-0 graph for Tallow Wharf (Opus 5.5)

Released 2026-10-26 ~09:55 by the lead: feature/tallow-fixes is cut from J7 PR D's checked head c2802450a (its TGC /
TKL graphs are validated with the map; PR D merges into the engine unchanged) with LP (final head 96eb0bc60; docs only
after re-check 4's adb5503f2) and G0 55514bad6 merged in.
Refreshed 2026-10-26 from LP's `docs/tallow-fixes/EGRESS.md` section 1 (lead ruling ~09:05; the earlier ~23:30 ruling
made D0 wait for LP so the graph is done once). Where this brief or the plan's text differs from EGRESS section 1,
EGRESS section 1 wins (it is the later, checked design).
Base: origin/feature/tallow-fixes at d286ecd89c3c6e9a6c755d9e57c28007479aa870. New branch:
feature/tallow-d0 (cut from that sha). Lead: Night Shift | Campaign Build. Read
`git show origin/master:docs/systems/agent-preamble.md` (desktop: worktree `C:/NightShift/Mobile-Coop-tallow-d0` and its
guard; cloud: "Cloud sessions") first. Read in the base: `docs/tallow-fixes/EGRESS.md` (all; its rows E1-E10 are
egress rows, named so below) and `docs/missions/slices/J8-J9-PLAN.md`: section 2 (validator runs, "The pie gap under
M2", "The W3 roof bulkhead"), A5, A6, A7, A11, A22, A25, A28, A29, A30, section 6 D0 row and "D0 wave-0 graph" with
"Split defaults", the lead rulings of ~21:40 (both split defaults ADOPTED), fix round 3. The plan's link numbers
(C5 throw "32 after D0", bulkhead "35") predate EGRESS: the right ones are below.

## Only these files
- `docs/missions/prototypes/campaign-map/graph.json`
- `docs/tallow-fixes/val/D0-*` (new: the saved outputs, the graph diff, `D0-note.md`)
Nothing else: not the TGC / TKL graphs or BEATs (J7's), not the SPEC or SIGNOFF pages (P1), not EGRESS / LIGHT (LP's),
no code, no validator script. TW23 never touches `graph.json`.

## Why
The graph is the design: J8 changes it before any geometry (RULES Intake 5: the level validator before greybox), so the
wave-1 section slices (G1-G4) build to numbers that already pass. D1 later re-measures from the built geometry.

## What to change (on the base's `graph.json`; link numbers are 0-based on the base's graph, before your deletions)
Start from the base's file. A planning draft exists on the desktop
(`C:/NightShift/scratch/campaign/j8-j9-val/fix2/map-fix2-defaults.json`, made by `fix2/var.cjs`), but it is built on an
older graph (it drops the shutters' `"gap": 0.9` and restores the Q19 reward text) and predates EGRESS: never copy the
file; where its numbers differ from EGRESS section 1, take EGRESS. Find every link by `from>to` and `kind` before you
edit it, and do the two deletions (steps 5 and 7) last, so the numbers in steps 1-6 still match the base.
1. **A5 way-back bridges (EGRESS E1, E2)**, two new `door` links, `route` "shadow", `width` 1.2, `height` 2.1,
   `bolted: true` (a lone player passes only from the `to` end), each with a `reason`:
   - E1 `w2-pawn-loft -> w2-reading-room`, `length` **12.4**, `at` **[44.75, 4.5, 70.55]**: "west lightwell bridge,
     enclosed, gate in the pawn loft's north wall (44.75, 4.5, 67.6) bolted on the bridge side: the thrown partner opens
     it for the thrower; 12.4 m door to door (the bridge 5.9 m + 6.45 m in the reading room to its stage door), within
     A5 as amended (13 m or less, lead ruling on LP pick 16); A5".
   - E2 **`w2-lane-window -> w2-clock-loft`** (not the pie loft: the bridge sits at x 68.5-70 against the corner mass, so
     its gate is in the lane-window loft's north wall, LP pick 8), `length` **9.8**, `at` **[69.25, 4.5, 71.75]**:
     "east lightwell bridge, enclosed, gate in the lane-window loft's north wall (69.25, 4.5, 70) bolted on the bridge
     side; 9.8 m door to door (bridge 3.5 m + 6.25 m in the clock loft); the pie throw's way back while it stays a
     standard throw (M2 / G403), on to the pie loft by the lane-window loft's inner door (link 27); A5".
2. **A25 (EGRESS E3)**: link 21 `w2-arcade -> w2-reading-room` (`open_stair`, width 2.4, length 27, `at` [55, 0,
   65.875], all unchanged) gains `bolted: true` and its `reason` gains "the landing door at the stair head (55, 4.5,
   73.5) has a push bar on the reading-room side only (A25)".
3. **A6 (EGRESS E4)**: a new `drop` link `w4-jetty -> w4-canal-ledge`, `route` "shadow", `level_change` 4.4, `length`
   **6.0**, `time_s` 3, `at` **[74.0, 0, 6.0]**, `reason` "the jetty's open south edge x 72-76 (the C10 pull edge, the
   old staging ladder's gap; already open in the build: the rail runs x 76-86.75 and 89.25-100): a one-way 4.4 m drop
   onto the canal bed at (74, -4.4, 5.4), round the fence foot to the ledge; the 4.4 m lip stays in the co-op band (A6)".
4. **M2 throws (A22, A24)**: link 28 `w2-pawn-loft>w2-reading-room` and link 33 `w2-arcade-roof>w3-roof` (both
   `team_throw`): `width` 4.9, `exception: "long_throw"`, and a rewritten `reason` (4.9 m gap, the site's 5.8 m throw,
   M2, tallow-fixes A24, J12 A27; C5 widened on the W2 side, the old bridge landing cut to x 77.1, LP pick 6). Link 29
   `w2-pie-loft>w2-clock-loft` stays `width` 2.5, no `exception`, and gains `note`: "not yet forced: a standard throw
   until the plank bridge (M2, G403); its bypass into the reading room is closed by A29".
5. **A29 (delete, do it with step 7 at the end)**: delete link 30 `w2-reading-room -> w2-clock-loft` (`door`). The
   `w2-clock-loft` space's `note` says why ("the clock-mender is out and has locked his door from both sides; the plank
   bridge slice PB restores this link, G403") and that the clock loft's way back is the east bridge (E2). Its
   `function` text keeps Teale's bolt point.
6. **A30 (EGRESS E10)**: link 36 `w3-roof -> w3-east-wing` (`fire_stair`) stays unbolted (the map default and Three Grey
   Coats' state) and gains `bolted_in: ["twoKeyLedger"]` and a `note` citing A30 ("the foot leaf (112.5, 0, 68) is
   bolted from the east-wing side in Two-Key Ledger only: the porter's lock-up; TGC's signed crossing unchanged").
   **EGRESS E9**: link 35 `w3-roof -> w3-east-yard` (`fire_stair`, unbolted, `time_s` 14 unchanged) takes `length`
   **31** and `at` **[108.65, 8.4, 52]**, and its `reason` adds "moved 1.7 m east: head x 108.0-109.3, half landing
   x 101.9-103.2 at 4.2, foot (110.6, 0, 49.75) beside the east gate (G3; the ruled TKL default)".
7. **A7, the tank room (EGRESS E6)**: link 31 `w2-lane-window -> w2-arcade-roof` changes `kind` from `hatch` to
   **`ladder`** (a plant ladder, A7), `width` 1.2, `length` 16, **`level_change` 3.9**, **`time_s` 5**, `at` **[72, 4.5,
   66.15]**, `reason` "the hatch's fixed ladder (hatch x 71.4-72.6 z 65.4-66.6) walled in as a tank room x 70.4-74.0
   z 64.4-67.6, door (72, 4.5, 64.4): roof access through a plant space, level-design 16.2.1 / 16.2.3; A7". Then
   **delete link 32** `w2-lane-window -> w2-arcade-roof` (`window`, the dormer): its sash is inside the tank room now and
   is no second way (E6). Delete links 30 and 32 now, after every other edit.
8. **EGRESS E7, E8 (the pawn fire stair rebuilt along the south facade, LP pick 5)**: link 22 `w2-arcade ->
   w2-pawn-loft` (`fire_stair`, `bolted` true unchanged): `width` 1.3, `length` 14.5, `time_s` 8, `at` [53, 0, 62],
   `reason` "the pawnbroker's enclosed fire stair, rebuilt along the loft's south facade; its foot door (53, 0, 62)
   carries the push bar on the stair side (LP pick 5)". Link 25 `w2-walkway -> w2-pawn-loft` (`door`): `length` 6.5,
   `at` [45, 4.5, 62], `reason` adds "the walkway door moved from x 49 to x 45: it opens onto the pawn stair's top
   landing; the loft door (45, 4.5, 63.65) leads on into the loft". **No other stair is added** (EGRESS section 3, LP
   picks 2-4): say so in the note.
9. **Splits (A11; the ~21:40 ruled defaults)**:
   - TGC `tgc-leads`: tags `split:tgc-leads:a` on `w1-gallery` and `w1-warden-office`, `split:tgc-leads:b` on
     `w1-tea-stall`, `overwatch:tgc-leads` on `w1-gallery`; `assist: "tgc-leads"` on the `w1-market -> w1-gallery`
     `coop_boost`; **EGRESS E5**: a new `ladder` link `w1-canal-steps -> w1-gallery`, `route` "high", `level_change` 4.5,
     `length` 6.0, `time_s` 3, `bolted: true`, `at` **[6.6, 0, 14.4]**, `reason` "the market warden's caged ladder on the
     gallery's east face at its canal-steps end; an anti-climb door at its foot (foot enclosure x 6.0-7.75 z 14.4-15.6)
     bolted on the cage side (LP pick 1: a ladder top-out ignores door leaves; the bolt is built in PR G1, LP pick 14);
     the one boosted up climbs down inside the cage and opens it for the other".
   - TKL `tkl-wings`: `split:tkl-wings:a` on `w3-west-wing`, `split:tkl-wings:b` on `w3-east-yard` and `w3-east-wing`,
     `overwatch:tkl-wings` on `w3-roof`; `assist: "tkl-wings"` on the `w2-arcade-roof -> w3-roof` throw. Leg times door
     to door from the planned route points (`W3_ROUTES` route 2 as G3 moves it: `[108.65, 52.6, 8.4]`,
     `[102.55, 50.4, 4.2]`, `[110.8, 49.75]`, LP's G2 brief step 12 and G3 brief step 2), the planning numbers being:
     `w3-roof -> w3-west-wing` `drop` `time_s` 10 (the lantern drop, the gallery and its stair), `w3-west-wing ->
     w3-passage` `door` `time_s` 12.7, `w3-east-yard -> w3-east-wing` `door` `time_s` 1.5, `w3-east-wing -> w3-passage`
     `door` `time_s` 5. Every `time_s` you set names the geometry line behind it (G1's gallery ladder, G3's fire-escape
     foot beside the east gate) in the note.
   - The validator's split check ignores bolt direction (`level-validate.mjs` ~957, `arcsOf` not `soloArcsOf`): for
     each split write its worst reach path and the bolts on it (who opens them, when) in the note, as the PLAN's "Split
     defaults" does (TGC worst from the office: office -> gallery, down the ladder inside the cage to open its foot door
     (about 3 s more than the plan's 12.7 s, LP pick 1), canal steps -> tea stall; TKL 14.3 s yard <-> west wing through
     the front hall).
10. Leave every other link, space, the shutters' `"gap": 0.9`, the Q19 text and `meta` as they are, except a
    one-line `meta.note` addition naming D0, its date and "EGRESS section 1".

**The renumbering (after steps 5 and 7):** links 30 and 32 are gone, so link 31 (the tank-room ladder) becomes 30 and
every link after 32 moves down two: the C5 throw `w2-arcade-roof>w3-roof` 33 -> **31**, the fire escape
`w3-roof>w3-east-yard` 35 -> **33**, the bulkhead `w3-roof>w3-east-wing` 36 -> **34**; new links append at the end.
Print the final 0-based index of every link you touched or added (a one-liner `node -e` over the file) into the note.
J12 matches the long-throw spots by `tallowWharf:<from>><to>`, not by number, so nothing breaks; the lead tells Marlow
the C5 throw is now 31.

## Validator runs (save every output under `docs/tallow-fixes/val/`, file names `D0-<ref>-<run>.txt`)
Extract each validator ref into a scratch folder outside the repo (desktop: `C:/NightShift/scratch/campaign/d0-val/`;
cloud: a temp dir), plain node, no npm:
```
for R in origin/master origin/feature/mission-validator origin/feature/validator-port-train; do D=<scratch>/${R##*/}; mkdir -p $D && git archive $R scripts docs/design | tar -x -C $D; done
M=<abs repo>/docs/missions/prototypes/campaign-map/graph.json
node <scratch>/master/scripts/level-validate.mjs $M
node <scratch>/master/scripts/level-validate.mjs $M <abs repo>/docs/missions/prototypes/three-grey-coats/graph.json
node <scratch>/master/scripts/level-validate.mjs $M <abs repo>/docs/missions/prototypes/two-key-ledger/graph.json
node <scratch>/mission-validator/scripts/level-validate.mjs $M
```
plus the TKL-state run: a scratch copy of the map graph with the bulkhead link (`w3-roof>w3-east-wing`) `bolted: true`,
run with master's validator alone and with the TKL graph (saved as `D0-master-tklstate*.txt`; the copy is not
committed), and the same map / map + TGC / map + TKL runs on J12's validator (`origin/feature/validator-port-train`,
which contains S7b ebb58a113, the long-throw exception: check with `git merge-base --is-ancestor
origin/feature/validator-port-s7b origin/feature/validator-port-train`; if the train ref is gone, use
`origin/feature/validator-port-s7b`; there the two named throws should pass as INFO). If an extract has no
`docs/design/metrics.json`, run that ref's `scripts/metrics-gen.mjs` into the extract first. Also save `D0-graph.diff`
(`git diff <base> -- graph.json`).

## Done
- master's validator: **0 ERR** on map, map + TGC, map + TKL and the TKL-state runs, except exactly the two named lines
  `link w2-pawn-loft -> w2-reading-room (team_throw): gap 4.9 m above the 2.7 m throw` and
  `link w2-arcade-roof -> w3-roof (team_throw): gap 4.9 m above the 2.7 m throw` (A22); the 6 known WARNs only
  (`room_class custom` x5, w3-chute off grid) unless a new one comes from EGRESS's numbers (name it and its link);
  mission-validator 0 ERR on the map (if it still demands an optional reward, that line is J12's known item: name it, do
  not fix it here); `checkCoop` clean on both splits.
- `D0-note.md`: the refs and shas used, the date, every change above with its plan id and EGRESS row, the renumbering
  (30 and 32 deleted; tank ladder 31 -> 30, C5 throw 33 -> 31, fire escape 35 -> 33, bulkhead 36 -> 34; the new links'
  final numbers), each split's legs with times, its worst reach path and its bolts, the BEAT lines J7 needs (TGC: "A
  climbs down inside the ladder cage and unbolts its foot door for B"; TKL: none, the fire-escape line is G3's), and any
  ERR you could not clear with the reason and the slice that will.
- If a run shows an ERR the plan did not expect, try only data fixes the plan or EGRESS names (a `time_s` backed by a
  named geometry line); otherwise stop and report it with the output (`status: blocked`).
- Commits on feature/tallow-d0 prefixed `tallow D0:`, trailer "Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. No push to feature/tallow-fixes or
  feature/mission-engine.
- Checks: no tsc needed (docs only). The Tallow tests read this graph (`tests/tallowWharf/helpers.ts:66`; only
  `shell.test.ts:146` reads links by kind, `coop_boost`), so run `npx vitest run tests/tallowWharf/ --maxWorkers=2` and
  report any test the graph change breaks, with its message (do not edit the tests; the lead routes the fix to the slice
  that owns the file).

## Report (append below, then set line 1 to `status: done feature/tallow-d0 <sha>`)
ERR / WARN counts per run with the file names, the renumbering, the split numbers, deviations, open items for the lead.

### Report (Night Shift | Cloud Builder 3, 2026-10-25 ~22:53Z)
**Built in full; blocked on two ERRs the plan did not expect** (details, causes and options:
`docs/tallow-fixes/val/D0-note.md` section 5). Branch `feature/tallow-d0` from d286ecd89: d24187e7 the graph,
799364de9 saved runs, `D0-graph.diff`, `D0-note.md`.
- Validators: master 2a937eb6b, mission-validator 0c62a921f, validator-port-train fede9015e (S7b ebb58a113 is in it).
- Counts: master map, map + TGC, map + TKL, TKL-state, TKL-state + TKL: 4 ERR / 8 WARN each. mission-validator map:
  3 / 8. validator-port-train map, + TGC, + TKL: 4 / 9 each.
- ERRs: the two named throw-gap lines (A22) on every run, plus:
  1. `section W2: 1 independent route(s) from entry 'w2-arcade' to exit 'w2-arcade-roof' (need 2 edge-disjoint)` (all
     runs). E6 deletes the dormer `window`; the hatch and the window were W2's two "routes" to the roof, through one
     opening. Options: keep the window (undoes E6), a second roof access (G2 geometry, a new LP row), or a gate exception.
  2. `split tgc-leads leg a: no solo link leads into w1-gallery` (master and train). The plan modelled the splits at
     4e5e9959 (`arcsOf`, bolts ignored); master 2d9ad6f7 times split legs on `soloArcsOf`, so the bolted E5 ladder
     gives leg a no solo entry. With the ladder unbolted (scratch diagnostic) the split is clean but a solo-twin ERR
     appears on the canal-steps boost: no data-only answer. Options: the split check takes a co-op link from the fork
     as the leg's entry (validator change), re-chosen legs (J7 BEAT change), or a gate exception.
- The train does not pass the long throws as INFO: its `metrics.json` has no `sizes.throw_long` (the scale sheet's Long
  throw row is not on the train), so it WARNs and keeps the two gap ERRs. J12's item.
- WARNs: the 6 known, plus 2 from EGRESS lengths: E1 link 70 `length 12.4` and E2 link 71 `length 9.8` off the 0.5 m
  grid. mission-validator prints no optional-reward line.
- Renumbering: 30 and 32 deleted; tank ladder 31 -> 30, C5 throw 33 -> 31, fire escape 35 -> 33, bulkhead 36 -> 34;
  new links E1 70, E2 71, E4 72, E5 73 (74 links).
- Splits: TKL legs a 22.7 s / b 20.5 s, 10%, worst reach 9.5 s (east yard, on the graph), no ERR or WARN on any run.
  TGC worst reach on the real bolts 12.7 s from the office (about 15.7 s the first time, A climbing down the cage to
  open the foot door; LP pick 1). From the tea stall there is no solo way up until A opens it. BEAT line for J7 (TGC):
  "A climbs down inside the ladder cage and unbolts its foot door for B"; TKL none.
- Tests: `npx vitest run tests/tallowWharf/ --maxWorkers=2` 7 files, 143 passed. No tsc (docs only).
- Deviations: A7's ladder link drops `height` (no ladder link in the file has one); the E1 / E2 reasons end
  "(EGRESS E1 / E2)". No doc-lint script exists on this base.

## Answer (lead, Night Shift | Campaign Build, 2026-10-26; closes the brief)
Ruled ~10:10, nothing left for a cloud builder. ERR 1 (one W2 route to the arcade roof after E6): keep E6; a real
second roof access was built by the lead's designer (EGRESS E11 downpipe walkway, link 74, feature/tallow-d0-w2roof
1640e3ba0); ERR 1 is gone. ERR 2 (split tgc-leads leg a): Marlow accepted the split ruling as J12 A28
(validator-port-s11); the ERR is expected on Tallow runs until it lands; TGC legs unchanged. 799364de9 was merged into
feature/tallow-fixes and passed the Opus D0 + E11 checker.
