# vg5t - VG5 laptop run triage + fix round (Opus, 2026-10-25)

Branch `feature/visual-gate-vg5t` cut from `origin/feature/visual-gate` d1e45ddc. Inputs: `origin/shots/visual-gate-m0`
(m0: `--time`, master fc4dc9ab; vg5: `--rules-only`, master 46a7cf85), PLAN 2-7, BRIEF A1-A30, `checks/vg5-*.md`,
`checks/vg2-build.md`, `briefs/VG7.md` "Preconditions". Zero `src/` diff. Not touched: `viewpoints.mjs` (vg3p),
`noise.mjs` / `push-results.mjs` / `tolerances.mjs` (VG7). No e2e, no GPU, no build.

## Verdict per VG5 flag / warning
(The table with reasons is appended to `checks/vg5-check.md` "Laptop run (VG5, 46a7cf85)".)
1. PARITY card-so-s2-aisle-1, card-m-a5-kiosk-2, card-cp-s1-f-1: **parity range problem** (A15), not a look issue and
   not a card spot. The 12 cards trace one monotone curve (level -> luma: 0.142 -> 0.004, 0.188 -> 0.022, 0.197 ->
   0.024, 0.246 -> 0.020, 0.324 -> 0.085, 0.466 -> 0.417, 0.484 -> 0.412, 0.582 -> 0.463, 0.707 -> 0.525, 1 ->
   0.66-0.69). The bible pins 4 levels; the mid band has one row (0.40: 12-35%), which A15 stretched over 0.31-0.57.
   Fixed by A32: bounds linear between the rows around the level. Rescoring the VG5 result under A32 (`--rescore
   vg5.json --rules-only`) clears all three: verdict clean, exit 0. Note for VG8 / Michael (not a flag): the curve passes
   35% near level ~0.43, so the upper half of the mid band displays at 0.38-0.45, in the bible's unpinned gap between
   the 0.40 and 0.70 targets.
2. KNOWN PASSES so-corner: **F5b is not fixed on master; the rig does not reproduce it.** No `hazeReach` /
   `beamReachMin` in `src/` at origin/master; `volLights.ts` `writeVolLight` still marches `l.reach` (the longest ray).
   The rig guard at (-12, 0, 12) faces straight down the side aisle (yaw pi); the torch cone's half-angle is 0.34 rad
   (`torches.ts` TORCH.outer), so at the junction (z 7, 4.7 m) it spans 1.65 m either side of x -12 and never crosses
   R3N (x -10.5 to -8.2). An on - off diff of the Epic shots (M0 and VG5 identical) shows the beam's light in the aisle
   mouth on the left, ending at R3N's corner, and 0 on R3N's south face (leak.mean 0.00012, p95 0). Keep `known`; turn
   the guard (below). The gate's KNOWN PASSES line was right (A10).
3. WARN unsteady (m-a8-vestibule, m-f-gallery, cp-s1-b @epic; M0 also card-m-a5-kiosk-1..3, cp-s3-c): **harness
   convergence criterion, not the budget.** After 35-63 reads the worst cell still moves 0.008-0.017 (a shimmer; a slow
   settle would fall towards 0). Diffing the same view between the M0 and VG5 runs puts it on sub-pixel bright edges
   (the gallery railing, desk edges in cp-s1-b): TAAU jitter at Epic native resolution; Low (0.67 scale) never shows it.
   Each cost the 8 s cap (~33 s of VG5's Epic browser). Fixed: noisy-steady exit (below).
4. WARN meter-cp-s3-c (meter 0.415 vs field 0.352, Low and Epic): **a gate bug hid it; the cause is open until the
   rerun.** Every view of every map reports `flickering: 1`: each map has one flickering light somewhere, so A22's
   flicker skip covered every meter row and meter = field could never miss. The miss repeats in 4 runs (M0 + VG5, both
   presets: 0.4148-0.4156) and the meter has no easing (`GameState.updateLight` reads `bodyLevel` at 10 Hz), so it is
   not flicker timing; meter > field means the meter sampled a brighter spot than the view's feet (the gate's field has
   no occluder, so it can only read higher, not lower). Most likely the player is pushed off the feet (lockers at
   cp-s3-c). Fixed in the harness: the field is read where the player stands, `drift` is recorded, and the skip applies
   only when a flickering light reaches the body. The rerun tells which: `WARN ... player settled X m from the view's
   feet` -> move cp-s3-c's feet; no drift and still d 0.06 -> a real meter / field mismatch for the lighting owner.
   cp-s2-d (y 4.4) shows the same sign at d 0.010-0.013 (under 0.02).

## Found while eyeballing (not in the block)
- **Letterbox in the shots (gate bug, fixed)**: Warehouse (`mode=clear`), Sector Ops and campus (sector) start with
  `g.letterbox(2.8)` (clearMode.ts:70, sectorMode.ts:365; 2.6 at a section change :1013). It counts down in sim time
  (`updateCinematic`), so under the pin it froze: 59-60 px black bars top and bottom (22% of the frame) on every shot of
  a boot's first ~3 s of settles, shrinking on campus cp-s4-a (27-44 px) to cp-s5-d (1 px). The height depends on view
  order and settle count, so a `--only` proof run would differ from a full run by up to 0.22 nearBlack (floor 0.08).
  Old builds have the same fields (`GameState.letterboxT`, `CinematicPost.bars` / `barsTarget` at v4.60.1, v4.82.0,
  v4.97.0, master).
- Marlow at Epic: heavy haze over m-a2-vantage (whole mean 0.29 vs Low 0.04) and m-a5-kiosk (0.28 vs 0.03). A look
  question for VG8 / Michael (F8-like haze in Marlow), not a gate fault.
- F8 views: cp-s2-d is all black at both presets (mean 0.002) and cp-s3-a is a close-up of a lit panel wall; neither
  shows a room volume where a fog beam could be seen. P1 must check them on v4.96.0 before VG8 trusts them.
- cp-s4-a is ~55% a black occluder in front of the camera; m-f-gallery ~80% black. Framing notes for vg3p / VG8.

## Fixes (files)
- `scripts/visual-gate/harness.mjs`
  - `pin`: the cinematic letterbox off (`post.bars` / `barsTarget` 0, `letterboxT` 0, each guarded); `PinResult.bars`
    = the amount it had.
  - `converge`: exits `steady` (as before) or `noisy` (`convergeState`: the 0.9 quantile of the cell deltas under 0.004
    and the worst cell under 0.03, 3 reads in a row); new pure `gridDeltaQ`, `convergeState`, `CONVERGE`;
    `ConvergeResult` gains `noisy`, `lastQ`.
  - `settle`: meter and field read where the player stands (`field` at `g.player.position`, `fieldFeet` at the view's
    feet, `pos`, `drift`); `flickering` = flickering lights whose radius (+0.5 m) reaches the chest or head sample (new
    pure `flickerNear`, passed into the page like `placeGuards`), `flickeringAll` = the map's.
- `scripts/visual-gate/gate.mjs`
  - `meterCheck` / `cardCheck`: a non-finite input is `skip: 'error'` (polish 3; scoreRun makes it a run error).
  - `regionSkipLine` + scoreRun: one `WARN regions skipped on N shots: <key> <region> (<why>); ...` line (max 20
    entries) and `regionSkips` in the summary JSON (polish 2; one line, not one per shot, so a clean train's comment
    stays short).
  - scoreRun: `WARN <key>: player settled X m from the view's feet` over `DRIFT_WARN_M` 0.3.
  - `recheckParity`: `--rescore` re-checks saved card and meter rows under the current rules (it used the saved `ok`).
  - ShotRecord `settle` gains `drift`, `fieldFeet`, `flickeringAll`; ShotRecord `noisy`; VisualSummary `regionSkips`.
- `scripts/visual-gate/metrics.mjs` `parityRange`: A32 (between-row bounds). Outside the three files the lead named:
  the parity range is defined there and nowhere else (VG7 does not touch metrics.mjs). Its own commit, so the lead can
  revert A32 alone.
- `scripts/e2e-visual.mjs`: `finish(code)` sets `process.exitCode` and arms an unref'd 5 s backstop `exit` (polish 4:
  gateMain, rescoreMain, the crash block; `--time` unchanged); `meterRow` exported, its note `d, k of n flickering
  near, drift`; ShotRecord fields above; card note `noisy`; `--rescore` uses `recheckParity`.
- Docs: `M0.md` (new), BRIEF A31 (ladder) + A32 (parity), PLAN :127 (A32), `checks/vg5-check.md` (laptop run), this.

## Ladder (A31)
No step. VG5 176.6 s alone (98%); the converge fix should take ~28 s off the Epic browser (~150 s expected). Step 1
would drop the dark / mid cards F6 needs (the first card of 3 of 4 maps is the lit one). Trigger: rerun wall > 165 s.

## viewpoints.mjs changes for the lead (after vg3p merges)
| Key | Old | New | Why |
| --- | --- | --- | --- |
| RIGS so-corner `guard.yaw` | `Math.PI` | `2.85` (pi - atan(1.5 / 5)) | Aims the torch axis from (-12, 12) at R3N's south-west corner (-10.5, 7), so the cone straddles the corner: the rack blocks the light of its east half (right), while its haze still marches through into the cross aisle in front of R3N's south face (the `leak` quad, 17-35 deg off -z from the guard, inside the cone's -3 to 36 deg) - the F5b wedge. The west edge ray runs out the aisle mouth, so `beamReach` stays long (~8 m) |
| RIGS so-corner `known` | `'F5b lr16-8-triage.md:65-87'` | unchanged | F5b is not fixed on master; do not remove `known` on this KNOWN PASSES |
| VIEWS cp-s3-c `feet` | `[46, 0, -24]` | only if the vg5b rerun WARNs a drift > 0.3 m: the player's settled `pos` from vg5b.json | meter = field at the view's own spot |

After the yaw change, P7 (rig so-corner on master) must read red at Epic (leak.mean > 0.004); if it still passes, F5b
needs a rig at a thinner wall (A3's "a few cm of glow" case) and the lead re-plans P7.

## Tests (desktop, CPU waited under 90% first)
TESTS_PLACEHOLDER

## Laptop rerun (the lead sends it; same as VG5's step, the gate from feature/visual-gate-vg5t, out to vg5b)
`node scripts/laptop-queue/request.mjs --sha 46a7cf855492b21e25a78e78714067048684555f --alone --set visual-vg5b --requester "Night Shift | Sector Ops Build" --note "visual-gate VG5 rerun (vg5t fixes)" --step "git fetch -q origin feature/visual-gate-vg5t && git archive FETCH_HEAD scripts/e2e-visual.mjs scripts/visual-gate | tar -xf - && node scripts/laptop-queue/serve.mjs scripts/e2e-visual.mjs http://127.0.0.1:4189/ --rules-only --no-record --json C:/NightShift/scratch/visual-gate/vg5b/vg5b.json --png C:/NightShift/scratch/visual-gate/vg5b/png"`
(the same master as VG5, so any change is the gate's). Expect: exit 0 or 1 with only meter-cp-s3-c (now counted) and
so-corner KNOWN PASSES; no unsteady WARN on m-f-gallery / cp-s1-b / m-a8-vestibule; no letterbox bars in any PNG; the
region-skip WARN line; Epic wall ~150 s (A31 trigger 165 s). Read `settle.drift` / `pos` of cp-s3-c in vg5b.json.

## Open items
- After vg5b: the cp-s3-c call (feet or a lighting bug), A31's trigger, then the viewpoints.mjs rows above (lead).
- P1: cp-s2-d / cp-s3-a framing for F8. VG8: Marlow Epic haze (m-a2-vantage, m-a5-kiosk); the mid-band 35-45% note.
- `--time` (M0 mode) keeps `process.exit` (polish 4 named gate / rescore only); it shares `shoot` / `pin` / `converge`,
  so it gets the letterbox and converge fixes too.
