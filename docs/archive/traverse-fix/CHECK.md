# traverse-fix check (spare job 8) - fresh checker, Opus

Branch `feature/traverse-fix` at 5fa50245, checked in a scratch copy (`C:/NightShift/scratch/tfc`, git archive). Worktree untouched.

## Verdict: PASS

## Required
None.

## Notes (cosmetic / follow-up, not blocking)
- Item 1 does change mid-lip grips, but only ones that put the hands within 12 cm or crossed them (see Checks 1c). That is
  the same defect class (hands on hands), and REPORT.md already says it fixes the mid-lip crossing. No other grip changes.
- At non-game speeds (1.2 m/s, 3 m lip, instant accel) the worst arm stretch is 130.6 cm vs 116.5 cm without the gap.
  Ledge speed is 0.5 m/s (`ATTACH.ledge`), and there it is identical. Stress-only.
- Lips under ~0.28 m (2 x 0.08 m end margin + 12 cm): `reset` already puts the hands within 12 cm. `start` then refuses
  every move towards the other hand, so they stay still. This is not a regression, and lips that short are not real.
- Sling draw, right upper arm (lower two-thirds, r 4.5 cm, headless): standing, the clearance is now 0.7 cm (was 4.7,
  mid-draw). Crouched and static, it is -3.5 cm (was -2.8) at frame 17/90, the start of the reach. Every waypoint tried
  gives -2.6 to -3.5 cm at that frame, so this graze is pre-existing. e2e-clip has no gun-vs-arm check; worth adding later.
- A waypoint further out, e.g. [0.45, -0.22, 0.0], would clear more (trunk 6.8, leg 10.3 cm headless). This is
  tuning only.

## Checks
1. **Item 1 (ledge minGap): PASS.**
   a. Logic: the clamp applies only when `minGap` is set and the offsets are opposite. It limits the landing to this
      hand's side of the other hand's `at` (its landing spot while it swings). If the limit is at or behind where the
      hand is now, there is no reach. If the result would leave [min, max], there is no reach. Swings start from `at`, so
      there is no pop.
      With the hand on its turn pinned, the other hand gets its turn (`last`) once the body passes its spot, so there is
      no deadlock.
   b. Probe (`tfc-probes/zzGapProbe.test.ts`): random stick over lips 0.3/0.35/0.4/0.45/0.5/0.6/0.8/1.2/3/8 m, heights
      1.5/1.68/1.9, face +-1, vmax 0.3/0.7/1.2/1.6, accel 8 and instant, 6 seeds, 12 s each (1440 runs per side).
      - The minimum gap on every frame (positions eased along the swing) is 12.0 cm with the change and -98.9 cm without.
      - The hands stay in [0.08, len - 0.08].
      - On short lips (0.3-0.5 m) the body range collapses, so on and off are identical (gap 14-34 cm from reset).
      - The branch test (3 lengths x 0.5/0.8/1.2 m/s x both directions x 3 starts, into either end) passes.
   c. Far from an end (40 m lip, every run at least 1.7 m from an end; 288 runs at 0.2-1.5 m/s, steady and random, both
      faces), with on and off compared frame by frame:
      - Grips differ only in runs where the baseline gap dropped below 12 cm: 0 differing runs had a baseline gap of
        12 cm or more, and 0 identical runs had one below 12.
      - At game speed (0.5 m/s or less), 22 of 108 runs differ. Their baseline gaps were 7.8 down to -1.8 cm, mostly on
        the first quick reach (t ~0.2 s).
   d. At 0.5 m/s with accel 8 and instant (lips 0.6-8 m, 120 runs each), arm stretch and both-hands-planted stalls are
      identical with and without the gap.
   e. Shared stepper: only the ledge case sets `minGap`, and `setup` clears it for every anchor.
      - pipeH, ladder, pipeV, duct and split skip the branch (pipeH's opposite offsets have no gap set). setPipe legsUp
        uses offsets of one sign.
      - A corner transfer re-runs `setup`, which resets the grips.
      - On a remote, `settleTo` copies the owner's grips, which already keep the gap.
2. **Item 3 (TRAVEL_VIA.sling): PASS.**
   - Headless probe (`tfc-probes/zzSlingProbe.test.ts`), 90-frame LT sling draw from backC, standing / walking 1.2 /
     crouched / crouch-walking, old -> new:

     | Body part | Old (cm) | New (cm) |
     | --- | --- | --- |
     | Trunk (e2e-clip capsule) | 0.3 | 4.6 |
     | Right leg (e2e-clip capsules) | 2.6 / 2.3 / 2.7 / 2.2 | 7.7 / 7.9 / 4.9 / 4.6 |
     | Left thigh | 15-19 | 15-19 |
     | Right forearm away from the grip | -1.8..7.8 | -0.5..7.7 |
     | Elbow outside the trunk | 4.0..13.7 | 4.1..12.6 |
     | Upper arm | see Notes | see Notes |

   - I did not rerun e2e (not allowed here), so the agent's e2e-clip +0.9 / 2.8 cm is unverified.
   - Readers: `travel()` takes `TRAVEL_VIA.sling` only under `trSling`: a draw from the slot with the sling flag, set
     only at playerWeapons:729 (swap phase 1, `stance.slingDraw`).
   - Holstering to the sling uses `TRAVEL_VIA.back` and is unchanged.
   - The Gear / Draw tuner `DRAW_MOTION.<gun>.via` is additive and defaults to [0, 0, 0], so it still applies.
   - `beginTravel` has no caller in `src/net`, so the partner is unaffected. Pistols: `useDiagTurn` is false.
3. **Item 2 todo: PASS.** `it.todo` only. The branch has no diff under `src/anim` or `scripts`, and `CLIMB_UP_HANDS`
   {k0 0.38, span 0.12} matches the report's "weight 1 until 0.38, release 0.38-0.5". Nothing is half-implemented.
4. **Suites: PASS.**

   | Suite | Result | Time |
   | --- | --- | --- |
   | traverseFix | 2 passed + 1 todo | 6 s |
   | gripStepper | 9 | 4 s |
   | attachGripsG4 | 4 | 4 s |
   | attach | 14 | 3 s |
   | animN4bTraverse | 13 | 7 s |
   | backDiagTravel | 2 | 7 s |
   | animGear | 9 | 8 s |
   | carry | 9 | 4 s |
   | backDiag | 6 | 3 s |
   | n3DrawMotion | 36 | 7 s |

   `npx tsc --noEmit -p .` exits 0 (29 s, with the probes moved out of `tests/`). eslint on the 3 src files and
   traverseFix exits 0 (4 s).

## Ran
- Scratch copy via `git archive 5fa50245`, with node_modules joined from Mobile-Coop-mocap-trial-2.
- Vitest one file at a time, as listed in Checks 4.
- The probes, kept in `C:/NightShift/scratch/tfc-probes/`: zzGapProbe (3 tests) and zzSlingProbe, plus 2 one-off
  variants of zzSlingProbe (upper arm from a third of the way down, and the frame of the minimum).
- No e2e, no full vitest, no npm run check.
