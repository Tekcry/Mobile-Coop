# S22 game: A4 laptop failure triage (2026-10-23 ~20:00)

Failure: laptop-e2e/s22game-a3a8 on d82f9b6f, e2e-ctcourse:2 (twice), `scripts/e2e-ctcourse/a4GoodsShed.mjs:223`
"back from the noise, the officer notices the console off": consoleFinds never rose in 40 s.

Cause (test staging, not game code): step 3 left both players on L3's pad, in line with L3's far door, which stands
open (an airlock's front door opens itself when its cycle ends, `CourseMode.applyLocks`). The officer turning to the
distraction had them in his periphery through the doorway; any sight of a player retargets his investigation
(`Enemy.perceive`: the stimulus is the player's feet), so he went after them and never came back to the console.
That is correct CT behaviour.

Fix: before the throw, both players move against L3's north wall west of the far doorway (`L3_HIDE`, out of every
line from the room). `tests/consoleNoticeA4.test.ts` reproduces both on the real `Enemy` / `EnemyManager`, A4's
built geometry and runtime nav: on the pad he retargets, leaves and never notices (the laptop failure); hidden he
comes back, notices it once and turns it back on, calm. Unit 2/2.

Rerun: laptop set s22game-a4fix, e2e-ctcourse:2 (+ :4 for the same head).
