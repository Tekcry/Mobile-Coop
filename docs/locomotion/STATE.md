# Locomotion run - state

## Handover to PC (M5, 2026-10-14)

**Ready to move to the PC.**

- Last step commit: a5b42b1 "locomotion 14: thermal and electro vision (render only)"; the handover commit follows it. Branch feature/ct-locomotion, pushed.
- Done in the cloud: steps 00-14 incl. 12b (Blocks A and B complete; Block C up to 14). See LOG.md.
- Half-done: nothing. Step 15 (medkits) has not been started; the working tree is clean.
- Next on the PC, in order: steps 15, 16, 17, 18, 19, then the Block C end (full `npm run e2e`, perf trend, merge origin/feature/kestrel, retry Blocked 11a-c), step 20 (bot partner, reruns the "rerun after 20" checks), step 20b (D11 net check under ?netsim=typical), then the D11 "Play check" for Michael and Block D from step 21. Resume with "Locomotion run: resume" on feature/ct-locomotion.
- On the PC: E2E_GPU=1 is allowed (CLAUDE.md); work through PC-PASS.md first, re-baseline the anim audit there (docs/locomotion/audit/anim-baseline.json is software-GL, cloud-only).
- Blocked (retry at the Block C end):
  - 11a e2e-wall "held on a wall > 6 s: a guard lobs a grenade" fails 2 of 3 serial runs (throws 0; enemy.ts ~1320 needs lastSeenT < 8 and 7-22 m): make the spawned guards aware first, or log as flaky.
  - 11b e2e-mouse "losing the capture (Esc) pauses" load flake: add to the flaky list.
  - 11c remote stopidle@60 pops 0 -> 3 (band 0) seen at step 11: confirm A39 noise and set the band, or find a cause.
- Deviations carried to step 27 (pose work, A47): wall / SWAT / door-peek pose limits; D9 grips at wall edges 17-70 cm (limit 2 cm); mid-move SWAT remote joints 70-103 cm (D8 deviation); weapon y dip after a hand switch. See steps/27-b4-contact.md and REVIEW-NOTES.md.
- Known flaky (pass alone; fail under load on this 4-core VM): e2e-netmove (team-move timeouts, wall peek / fence ankles, holster timing), e2e-coop, e2e-darkness, e2e-stealth (look input), e2e-mouse (Esc pause / RMB), e2e-levels, e2e-feedback, e2e-touch, e2e-pad, e2e-weapons-carry. Kestrel-owned failures: e2e-editor, e2e-kestrel, e2e-camera-bounds level U.
- Perf trend baseline (CLOUD ONLY, software GL, 4-core VM whose calibration swings 2x - re-baseline on the PC): sim p95 2.3-2.75 ms; animation 0.050-0.062 ms per character (A/B against pre-run code: no change); allocations ~11.2 MB/s; draws 42; tris 0.14 M.
- Open ASSUMED decisions for review: A0-A53 in DECISIONS.md, except A38, A42, A43, A47 (approved by Michael, M4). Michael's run instructions: M1-M5; decisions D1-D11.


Current step: 15 medkits (next, on the PC)
Last commit: see git log (locomotion 00)

## Baseline (step 0, this VM)
- npm run build: pass. smoke e2e: pass (9 s).
- npm run check: lint 0 errors / 38 warnings; tests 1015 / 1016 pass. Pre-existing failure, kestrel-owned:
  tests/kestrelMap.test.ts "the map copy equals docs/kestrel/kestrel.blocks.json".
- Perf trend baseline (node scripts/perf-trend.mjs, calib 9.9 ms): sim p95 2.65 ms, anim 0.0504 ms/char, alloc 11245 KB/s, draws 42, tris 0.14 M. +25% trip: sim 3.31, anim 0.063.
- e2e-netmove baseline (limit 10 cm, 121 s): worst joint errors cm: low cover 0.5, low peek 3.7, high cover 1.9, high edge peek 3.5, ladder 0.3, pipeV 0.2, pipeH 0.2, ledge 0, duct 0.2, split 0, split aim 1.1, wall-jump hang 0.2, pipe legs 0.4, inverted 0.1, rappel 0.2, fence 0.8.

## Resume note (2026-10-14)
- Last pushed: step 13 (cfc565f) plus docs. Step 14 (vision) was being implemented in the old session's container and was NOT committed: a new session starts step 14 fresh from steps/14-vision.md.
- Loop per RULES.md: implement (opus) -> check (opus) -> up to 3 fix rounds -> commit 'locomotion NN' and push. Commit docs with path-limited commits while code is uncommitted.
- Remaining in the cloud: 14, 15, 16, 17, 18, 19, Block C end (full e2e, perf trend, kestrel merge, retry Blocked 11a-c), 20, 20b (D11), then the PC handover (M3) and stop.

## Plan change M3 (Michael, 2026-10-14)
Cloud runs through step 20, step 20b net check (D11) and the Block C end, then hands over (handover includes the D11 'Play check before step 21' list) to Michael's PC (GPU) before step 21. Do not start step 21 in the cloud.

## Done
- 00 setup: branch, BRIEF, RULES, DECISIONS, BIBLE-PROPOSALS, bible 1.13 (Section 5.17), CLAUDE.md resume line, scripts/perf-trend.mjs.

- 01 audit: AUDIT.md + audit/*.
- 02 plan: PLAN.md, steps/01-34, A1-A32.
- step 01 remove-mark-execute.
- steps 02-04 sonar, shield, style (SAVE_VERSION 8).
- step 05 remove-cover-player (1 fix round).
- step 06 remove-cover-rig-net (1 fix round). Block A done.
- step 07 harness-local (3 fix rounds).
- step 08 harness-remote (3 fix rounds + A40). Block B done.
- step 09 holster-draw (1 fix round).
- step 10 elbow-strike.
- step 11 wall-core (3 fix rounds; 3 items Blocked, see below).
- step 12 wall-corner (1 fix round).
- step 12b wall-edge-aim D9 / D10 (2 fix rounds; grip deviation carried to 27).
- step 13 door-peek (1 fix round).
- step 14 vision (1 fix round).

## Blocked
- 11 (after 3 fix rounds; committed functional, retry at Block C end): (a) e2e-wall 'held on a wall > 6 s: a guard lobs a grenade' fails 2 of 3 serial runs (throws 0: enemy.ts ~1320 needs lastSeenT < 8 and 7-22 m; make the spawned guards aware first or log as flaky); (b) e2e-mouse 'losing the capture (Esc) pauses' flaked once (log as flaky); (c) remote stopidle@60 pops 0 -> 3 reproduced on an --only rerun (band 0): confirm A39 noise and re-cut that row's band, or find a step 11 remoteAvatar / remotePlayer cause.

## Pending PC
(see PC-PASS.md)

## Open ASSUMED decisions
- A1-A32 in DECISIONS.md (all open for review).
- A0: the audit document lives in docs/locomotion/AUDIT.md (brief) rather than docs/animation-audit.md (bible 5.12.4); bible text left as is.

## Next action
Loop: implement -> check -> commit for steps 01..34 (PLAN.md). Step numbering in commits: 'locomotion NN'.

## PC-PASS gaps (tooling, for the PC session)
PC-PASS.md has 51 ordered items. Items without an exact command yet: 7 (no vision switch in perf.mjs for thermal / electro), 8 (perf.mjs has no ?net=local remotes), 28 (no holstered-then-draw anim-sheet scenario), 30 (no strike anim-sheet scenario), 40 (edge sheets are rifle only), remote contact sheets in general (anim-sheet cannot show a remote). The proposed PC audit baseline file is docs/locomotion/audit/anim-baseline-pc.json.
