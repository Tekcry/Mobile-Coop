# Step 32 - metrics freeze: limits table, required harness (bible 5.12.4.5, 5.3)

Model: implementer opus; checker opus. Depends on: 31. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 32: metrics freeze: animLimits config with tests, movement metrics in level-design 12, harness required"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md (hard rule: an engine-fact change updates level-design Section 12), docs/locomotion/RULES.md, this file;
  DECISIONS.md D2 ("refine only with cited biomechanics sources", "frozen in config with unit tests").
- docs/design-bible.md:786-887 (5.12.2 limits), 5.12.4 "Lock" (`grep -n '5. Lock' docs/design-bible.md`),
  5.3 "Metrics freeze" (`grep -n 'Metrics freeze' docs/design-bible.md`, +16).
- docs/locomotion/AUDIT.md section 4 (metric, limit, bible line) and every row's status.
- docs/level-design.md:126-139 (Section 12, engine constraints).
- scripts/anim-audit.mjs (its limits block: `grep -n 'limit\|LIMIT' scripts/anim-audit.mjs`) and the pure metric
  module from step 07 (`ls src/anim/audit`).
- scripts/run-e2e.mjs:24 (REQUIRED), :33 (KNOWN_FLAKY), :36-60 (quick map).
- src/config/movement.ts (gear caps :159-160, landing bands :204-212, team :390-400), src/config/camera.ts.

## Numbers (starting limits; source lines in docs/design-bible.md)
- Joint <= 25 deg per 60 Hz frame (:794); pelvis <= speed x dt + 2 cm (:795); blends 0.1-0.25 s (:797).
- Foot slide < 1 cm, float <= 2, sink <= 1 cm (:801); hands < 1 cm, grip < 2 cm (:802); world 3, weapon 2, self 2,
  char 3 cm (:806-808); ROM knee / elbow 0-150 +5, wrist 70 / 25, neck 80, spine 60 deg (:812-815); balance 10 cm (:818).
- Durations (:824-834): stand-crouch 0.25, crouch-stand 0.3, quick 180 0.25, mantle 0.6, vault 0.5, rung 0.3,
  raise 0.2, swap 0.6, grab 0.5, lift 1.0, takedown 1.0-1.5 s. Paired alignment 3 cm (:859).
- D2 (:1251-1258): pelvis p2p crouch 2.5 / walk 4 / run 6 / sprint 8 cm; head <= pelvis; pitch / roll 2 deg; sway 3 cm;
  camera 0.5 cm; settle 0.2 s; idle breathing 1 cm.

## Task
1. `src/config/animLimits.ts`: one typed, frozen table of every limit above plus the D5 metrics (root overshoot 0,
   stride-warp slide < 1 cm, stairs pelvis drop rule), each with its bible line in a comment. Babylon-free.
2. The harness, the pose viewer overlays and any e2e that checks a limit import this table (delete local copies).
3. Refinement: a limit changed from its starting value needs a cited biomechanics source (author, year, title, the
   figure used) in the comment and in AUDIT.md section 4. Without a source, keep the starting value.
4. Unit tests (`tests/animLimits.test.ts`) pin every value; a change fails the test until the test is edited.
5. Movement metrics freeze (bible 5.3): gear speeds, grab reach, mantle / step / vault heights, wall jump band, split
   widths and heights, pipe heights for upside-down takedowns, boost and human ladder reach, rappel and fence limits,
   landing bands, run / sprint braking stop time and distance, camera distances: written into level-design Section 12
   and pinned by a unit test reading the config.
6. Section 12 also lists any map decision that relied on a fact this run changed (vault time, ladder sprint rate,
   takedown time, camera distances), per CLAUDE.md; new numbers need Michael's approval after the freeze (say so).
7. Add `anim-audit` (local and remote) to REQUIRED in run-e2e.mjs and to the quick map for src/anim, src/player,
   src/net; it is not KNOWN_FLAKY. Report mode ends here.
8. AUDIT.md: final status of every row (pass / fixed / deferred with reason), baselines replaced by final numbers.
9. docs/systems/testing-tools.md (suite), docs/systems/movement.md and world-and-characters.md (limits table).

## D8
- Remote limits are in the same table (alignment 3 cm, netmove 10 cm, remote continuity identical to local).
- Anim per character <= 0.063 ms trend gate; no runtime change expected.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs anim-audit e2e-anim e2e-netmove e2e-coop`
  (use the suite name step 08 registered; netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote) all green against animLimits.ts.
- PC-PASS: none new (limits are logic). Note in PC-PASS that the D4 0.04 ms verdict needs `perf.mjs --budget`.
