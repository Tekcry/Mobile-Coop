# Animation clean-up: weapon handling, reloads, shoulder swap, traversal grips, hand shapes

A prototype pass over Wren's animations (Michael, 2026-10-19): accurate, believable, no clipping. Job docs:
`docs/anim-cleanup/` (BRIEF, RULES, PLAN, DECISIONS A1-A5, LOG, STATE, POLISH).

## What changes
- **Draw and holster:** the current gun is put away before the next comes out. The rifle travels over the right shoulder
  onto the back plate stud, the pistol into the thigh holster, along a curved path that clears the head and trunk.
  The draw pop is gone (e2e-anim asserts it).
- **Reloads with real magazines:** the magazine is its own mesh; the support hand takes it to its pouch (rifle: chest,
  pistol: left hip) and seats a fresh one; an empty reload works the charging handle or racks the slide. A swap or a
  holster mid-reload cancels it cleanly.
- **Shoulder swap moves the gun** to the other hand and shoulder once it is settled; the partner sees it (ground
  `MoveState.sub` bit 128; it took protocol 18, already counted in master's 22, no new bump).
- **Hands on the real geometry:** ladder rungs, drainpipes, pipes, ledge lips, the zipline cable, the rappel rope and
  fence rails; palm on the surface, fingers round it; rungs take a fixed overhand grip.
- **Hand shapes:** trigger, support, wrap and relaxed, from Wren's morph targets; free hands hang lightly curled.

## Checks
- `npm run check`: passes (lint 0 errors, 1746 unit tests, build).
- Independent checks: slice 1 (weapon handling) and slice 3 (traversal grips) each passed after one fix round; the
  merge with feature/ct-prototype c628e32 (T1/T2) and master passed a fresh check with no blockers.
- Full software-GL e2e on the desktop (228d78e, 2 at a time, 62 min): all suites pass except seven. The failures, rerun
  alone on 812a75f2:
  - e2e-traverse and e2e-ct pass alone. The drainpipe grip needed a 3-frame settle window (812a75f2), and the fence
    rattle was load.
  - e2e-netmove's holster check passes after its budget was corrected (4c465e3c: 400 ms -> HOLSTER_TIME 550 ms, a test
    bug from master).
  - Pre-existing on master: e2e-coop, e2e-netmove and e2e-ctcourse also fail alone on a master build (bd59f32, the same
    day). coop times out on the client's draw state, netmove fails a later attached-state step, and ctcourse fails at
    station 2 "the host hangs on the ledge" on both. e2e-kestrel and e2e-camera-bounds fail on master as before
    (docs/backlog.md). The branch makes none of them worse; they go to the process audit and CT Core.

## Pending PC run
- Performance budgets (`docs/systems/performance.md`).
- GPU screenshots: `npm run weapons:shots`, `scripts/anim-cleanup/sheets.mjs`, `scripts/anim-cleanup/traverse-shots.mjs`.

## Not in this PR (POLISH.md)
- Audits of the rappel, fence, window vault, duct and split jump contacts on Wren; the crouched wrist palm-in rest.
- The partner sees no reload, magazine or travel (the wire carries only the draw phase).
- Michael's playtest 2 ran without this branch: CT Core re-checks holstering, the pipe-climb hands and the shoulder-swap
  flick on top of it (their slices B+C and D+E).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
