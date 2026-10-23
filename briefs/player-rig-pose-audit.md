status: done feature/rig-pose-audit 4d7b1125

# Brief: rig-pose-audit - where gameplay reads animation / render pose (Player Build spare job 12, docs only)

Lead: Night Shift | Player Build, 2026-10-23 ~20:15. Read-only audit plus one report file. No src change.

## Why
Hard rule (CLAUDE.md "Hard rules"): "Gameplay never reads graphics state ... It reads collision, occupancy, anchors, the
light bake and the noise model only." Spare job 12 (docs/orchestrator/spare-jobs.md row 12, backlog 28): gameplay may
read the animated rig pose, e.g. a guard's eye from `rig.headNode`, so a mocap bob or a render-only pose moves what a
guard sees or where a hit lands. `src/ai/guardHead.ts:4` says one case was already moved off `rig.headNode`. Find the rest.

## Base and branch
`origin/master` (at least 4.81.0). New branch `feature/rig-pose-audit`; push there only.

## Files (only this)
`docs/rig-pose-audit/REPORT.md` (new).

## Do
1. Grep `src/` (excluding `src/anim`, `src/vfx`, `src/ui`, `src/editor`, `src/dev`) for reads of rig nodes or bone
   world positions: `headNode`, `hips`, `spine`, `torso`, `neck`, `wristL|R`, `ankleL|R`, `weaponPivot`, `muzzle`,
   `getAbsolutePosition`, `computeWorldMatrix`, `absolutePosition` on rig / mesh nodes, and any `rig.` read in
   `src/ai`, `src/game`, `src/weapons`, `src/player` (movement / collision), `src/net` (host sim).
2. For each hit decide: GAMEPLAY (perception, hit tests, damage, takedown reach / validity, noise, AI decisions, host
   validation, light meter) vs PRESENTATION (drawing, VFX, sound placement, camera feel). Note whether the pose read
   depends on animation state (mocap on / off, quality, LOD, frame rate, the remote's interp delay) - i.e. could differ
   between host and client or between two machines.
3. REPORT.md: a table (file:line, what is read, used for, GAMEPLAY / PRESENTATION, risk H / M / L, proposed fix in one
   line, e.g. "use the sim's eye height constant + root yaw"), then a ranked fix list (each a small slice with files and
   the test that would cover it). No code changes.

## Run
Nothing beyond grep / read (no tests needed; CI `check` runs on the PR if one is opened - do not open one).

## Done when
REPORT.md committed and pushed; report summary (counts per class, top 3 risks) at the end of this brief; commit
trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; `status: done feature/rig-pose-audit <sha>`.

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
`docs/rig-pose-audit/REPORT.md` on `feature/rig-pose-audit` @ 4d7b1125 (base origin/master 41204e30 = 4.80.0; master
had not reached 4.81.0 yet, noted in the report header). No src change.
Counts: GAMEPLAY 20 (H 6, M 7, L 7), PRESENTATION 14 (all L), CLEAN 8 (verified sim-only; the guard eye backlog 28 cited
at `enemy.ts:1779` is already a sim constant, `enemy.ts:686`).
Top 3 risks:
1. G1-G3: player hit volumes and guard perception points come from the rig pose (`playerTarget.ts:101-120`; client on
   the host via the 0.1 s old drawn copy, `remotePlayer.ts:219-230`: host mocap / LOD / fps, one capsule, no head).
2. G6: every player round starts at the animated muzzle or rig head (`playerWeapons.ts:994-997`); the client sends that
   origin as its claim.
3. G7: a client's guard headshot is decided on the puppet's rendered head (`enemyPuppet.ts:436-439`); the host judges
   against a stance constant (`coopHost.ts:1050-1067`) while its own rounds use `guardHead`: three head models.
Next: G4 / G5 wall head sample (`rig.posedHead`) for the light meter and perception (light parity; A51 chose it, needs
Michael's review). Ranked fix list (8 slices with files and tests) in the report.
