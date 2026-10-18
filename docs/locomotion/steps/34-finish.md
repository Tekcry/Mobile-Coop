# Step 34 - finish: merges, versions, docs, PC-PASS, REVIEW, PR (BRIEF section 7)

Model: implementer opus; checker opus. Depends on: 33. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 34: merge kestrel and master, versions, changelog, PC-PASS checklist, REVIEW"

## Read
- CLAUDE.md, docs/locomotion/RULES.md, this file; docs/locomotion/BRIEF.md:199-214 (section 7, authoritative).
- docs/locomotion/STATE.md, LOG.md, DECISIONS.md (ASSUMED list), BIBLE-PROPOSALS.md, PC-PASS.md, AUDIT.md section 1.
- CHANGELOG.md:1-12; docs/progress.md:5-25 (status table, current state); package.json version.
- docs/systems/deploy.md (branch flow; Claude never merges into dev / master).

## Numbers (re-check after the merges; these are as of step 02)
- Versions: package.json 3.5.1 on this branch, origin/feature/kestrel 3.5.1, origin/master 3.4.0; CHANGELOG heading
  "3.6.x - First Playable (in progress)". Highest = 3.6.x -> Phase 3 = 3.7.0, Phase 3b = 3.8.0, package.json 3.8.0.
  (ASSUMED, next free A-number: an in-progress CHANGELOG heading counts as a version; alternative: package.json only,
  giving 3.6.0 / 3.7.0. The roadmap table's 3.8.0 / 3.9.0 is a plan, not a released version.)
- Pre-existing failure: tests/kestrelMap.test.ts (kestrel-owned, goes to REVIEW.md).

## Task
1. `git fetch`; merge origin/feature/kestrel, then origin/master. Resolve conflicts without losing editor or map work;
   never edit src/editor/**, src/world/maps/kestrel*, src/security/**, docs/kestrel/** beyond conflict markers. An
   unclear conflict keeps both behaviours and gets a LOG.md line.
2. `npm run check` and the full `npm run e2e` (background; read the summary). Fix until green apart from known-flaky
   suites and kestrel-owned failures (those go to REVIEW.md).
3. Recompute the highest version across the merged branches and CHANGELOG headings; write two CHANGELOG entries
   (Phase 3: removals, back-to-wall, door peek, holster / elbow strike, vision, medkits, arsenal, input, remap,
   difficulty; Phase 3b: harness, net check (simulated network), batches 1-7, camera, drag, quick 180, momentum carry, pose viewer,
   metrics freeze, Training). package.json gets the higher one.
4. docs/progress.md: Phase 3 and 3b done (versions), GPU checks pending a PC run, First Playable S3a / S3b absorbed
   (D3), the Phase 5 hooks H1-H4 listed; current state paragraph updated.
   Also copy the merge plan and follow-ups from OWNER-NOTES.md into docs/progress.md (Michael, M6). GPU checks: done on the PC (M6), not pending.
5. PC-PASS.md: one ordered checklist, each with command and pass limit, all with `E2E_GPU=1`:
   `node scripts/perf.mjs --budget`; `node scripts/perf.mjs --phone --budget`; anim-sheet contact sheets (side / front
   / ots) for every gear, stance, new verb and D5 item, local and remote; the vision mode looks; every item added by
   steps 01-33 merged into that order (perf first, then locomotion, verbs, traversal, contact, guards, co-op, camera).
6. docs/locomotion/REVIEW.md, plain English:
   - what changed, per block (A-E);
   - every ASSUMED decision as a question, recommended option first;
   - the bible proposals (BIBLE-PROPOSALS.md);
   - numbered desktop checklist, pad first then KBM: movement feel and weight, stops, turns, stairs, back-to-wall,
     open-side edge aim (D9: left edge pistol in the left hand, rifle on the left shoulder, camera follows, no pop;
     right edge unchanged; mid-wall normal side), low-wall aim (D10: crouched side lean at the end with the head
     below the top, over the top mid-wall), door peek, elbow strike, takedowns, medkits, vision modes, arsenal, remapping and hold / toggle, custom
     difficulty, Training;
   - numbered co-op checklist at 2 players (two browser tabs on one PC with `?net=local`: host tab creates the room,
     second tab joins with the code / URL, pad in the host tab; no bot partner, M12): every verb seen from the other
     player, team moves, avatars passing and stacking, host-approved moves, a 4-player local run (four tabs);
   - D3 note for the review: the bot partner (bible 5.9 C20) was dropped by M12, see BIBLE-PROPOSALS.md;
   - a 5-line phone smoke test;
   - blocked, deferred and kestrel-owned items, Phase 5 hooks, known issues.
7. CLAUDE.md module map: the `cover/` row matches what Block A left; docs/systems/*.md touched by the run are current.
8. Commit, push, then open a PR feature/ct-locomotion -> master (`gh pr create` or the GitHub tool). Body: summary,
   link to docs/locomotion/REVIEW.md, "Do not merge until the PC pass and Michael's review are done", and the PR
   attribution line. If a PR cannot be opened, write the body to docs/locomotion/PR.md and commit it.
9. Wait once for PR checks (20-minute limit, no sleep loops: use the CLI's watch with a timeout); fix any failure.
10. STATE.md: done; LOG.md: step 34 entry with the PR link.
11. Final message, 15 lines or fewer: done / blocked / deferred / pending-PC counts, PR link, REVIEW.md path, and the
    next prompts "Locomotion: PC pass" and "Locomotion: feedback".

## Checks
- `npm run check`; full `npm run e2e` (background); `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote) (required suite);
  `node scripts/perf-trend.mjs` (sim p95 <= 3.31 ms, anim <= 0.063 ms on this VM; flag any rise > 25 %).
- No GPU claim anywhere; every visual item is in PC-PASS.md.
