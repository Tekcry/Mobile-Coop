# Step TM - merge the locomotion features (Block C start, before T6)

Model: one opus agent (merge and checks); checker opus. Deps: T5b, and locomotion step 20 (the bot partner) committed
on origin/feature/ct-locomotion (D15). If loco 20 is not there yet: STATE "Waiting for locomotion step 20" and STOP.

## Read
- `git show origin/feature/ct-locomotion:docs/locomotion/STATE.md` (current step must be past 20)
- docs/training/FEATURES.md rows with status loco 09-20; RULES "Protocol version"

## Task
1. `git merge origin/feature/ct-locomotion` into feature/training-bunker (a merge commit; never rebase). Then
   `git merge origin/feature/kestrel` if it moved. Resolve conflicts keeping both behaviours; in src/net take
   PROTOCOL_VERSION = the higher of the two + 1; protocol message lists keep both sides' messages; MoveState mode lists
   keep both orders' entries (the locomotion run's first, ours after).
2. Re-run T1 tests and the course suites; fix anything the merge broke in our files only.
3. FEATURES.md: rows loco 09-20 -> exists. The bot partner (loco 20) is now the co-op test partner: e2e-bunker (T8a / T8b)
   uses it where a second scripted page is clumsy.
3a. Movement re-check (D50): the new movement must still fit every rebuilt bay. Run tests/bunkerMap.test.ts (lips,
   gaps, wall-jump and boost reach, LANDING bands, R1 / R2 cuts, exact anchor sets, rope catchers) and `e2e-anchors`
   over Fallow. Any reach, gap or landing that no longer works: fix the geometry within its BAYS window (never the
   tuning tables) and update the BAYS row in the same change.
4. Steps T6-T8b: replace any stand-in that a loco 09-20 feature now covers (holster, elbow strike, wall hug, corners,
   door peek, vision, medkits, arsenal names, pad input, remap, difficulty) with the real verb in the course drills.

## Checks
`timeout 900 npm run check`; `timeout 900 npm run build`; `node scripts/run-e2e.mjs e2e-course e2e-bunker e2e-anchors
e2e-coop e2e-netmove smoke`; full `npm run e2e` in the background. Pre-existing failures per RULES.

## Commit
The merge commit(s), then "training TM: locomotion 09-20 merged; course drills use the real verbs". Docs: LOG, STATE,
FEATURES, REVIEW-NOTES (conflicts and how each was resolved).
