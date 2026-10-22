# anim-natural N1 - re-check after the fix round (fresh checker, 49c4eca4)

2026-10-22 ~14:25, written by the job lead from the checker's hand-back. Verdict: PASS. Scratch:
C:/NightShift/scratch/n1-check2/ (git-archive trees of 49c4eca4, ccc1a14d and master 5220f79c through HEAD's harness
with the checker's own contact-slide shim: down = within 5 mm of the floor or of the foot's lower point).

## Checks
1. Finding 1 fixed. Held spins at 60 Hz (every turnHarness scenario, local and remote; 0.75 / 2 m/s at 7 rad/s,
   crouched, crouched flick 1.45): heel travel while down <= 0.01 cm, ball travel while down 0.00, backstop 0.0 deg at
   60 and 120 Hz. ccc1a14d through the same harness: heel sweep 4.60 cm with 48 / 31.6 / 16 deg backstop; remote 4.29 /
   2.39 cm. Pivot slider 0: 0.01 cm (ccc 3.3-8.0). Synthetic cases on the repo's contactSlide / footSlide: toe-up foot
   about the virtual ball 8.74 cm (fails, as it should), about its heel 0; heel-up about the ankle ball 4.68, about the
   ball 0; master's ankle scrub 6.17. Twist bounds are measurement + margin (body 0.420 -> 0.45, pelvis 0.534 -> 0.56;
   the backstop's 0.54 exceeds the body bound, so the test can fail).
2. Findings 2-10 done as claimed (spot gating footPlanner.ts:434; tuneStep pinned 0.49 < m <= thr - 0.05; both-planted
   width 19.6-20.2 vs 19.6; e2e turn block 1 cm / 5 cm / 0.25 s / 5 m/s; guards measured; FOOT_TURN_STEP complete;
   turnOver; studioFeet; plain labels).
4. Master merge correct: guards read GUARD_STEP_ROWS (characterRig.ts:678); `spot` is false for stride 'facing'; the
   Guard stepping section shows the 5 new sliders (tuneGuard.ts:104), plain labels via guardStep -> step, they bake
   (tuneBakeGuard.ts:32 / :102). turnRule 0 vs master 5220f79c: 132 hashed rows identical (per-frame planner state for
   every footTurn and guard row, turnHarness local and remote, 60 and 120 Hz).
5. Hard rules: no Math.hypot added; every switched metric marked; REPORT-C has the PR-body list.
6. 10 test files, 150 passed, 2 skipped (capture-only); tsc clean; eslint 0 errors.

## Findings
1. Should-fix: the area runs on 49c4eca4 (e2e-anim, e2e-studio, e2e-netmove, e2e-clip, GPU sheets) are pending. The
   new e2e assert `plantTurn <= 0.25 + 1e-6` (scripts/e2e-anim.mjs:491) sits exactly on the harness value for jog sweep
   3 (15 frames): one frame more in the live game fails it. Done: a green desktop run, or a one-frame margin if it trips.
2. Polish (item a, not a regression): master has the same 41-42 cm one-frame swing jump at the no-crossing window edge,
   at 60 Hz too (master jog sweep 3 41.5 cm at t 2.533; HEAD 42.0 at 3.200). The -29 cm "crossed" at 120 Hz is a window
   edge (harness measures after the follow, the planner before; body-frame gap 7.6 cm). REPORT-C's "60 fps cap" is
   wrong for the default: `fpsCap` defaults to 0 = display refresh (src/core/settings.ts:145) and the rig animates every
   render frame, so 120 / 144 / 165 Hz screens run the planner at that rate. 20 flick timings per row at 60 / 120 /
   144 / 165 Hz: HEAD has fewer one-frame swing moves > 40 cm than master in every jog / run row (run 180 at 144 Hz
   1/20 worst 42 cm; master 9/20 worst 192 cm); bad timings at 144-240 Hz: run 180 124-139 cm in one frame, jog 180
   73-76 cm with a 23 deg backstop (master 15-18 on those, master's own worst 1.5-2.2 m). Done: a backlog item to blend
   the swing re-aim and the no-crossing clamp, a 144 Hz footTurn row.
3. Polish (b): remote crouched flick 1.45 m/s single-support foot 27.1 / 29.4 cm out (master 12.3 / 12.2); contact slide
   0 vs master 22-24; both-planted width = master 19.6.
4. Polish (c, stale): HEAD at 120 Hz jog 180 12.7 m/s (master 13.4), crouched spin 2.1 10.1 (master 77.9); 87 was ccc.
5. Polish (d): guard 0.9 m/s 90 deg at 60 Hz: a two-frame zig-zag 17 then 25 cm through the no-crossing window (t
   2.50-2.52); master one 18 cm exit pop. Contact slide 10.3 -> 0. Guard 0.9 180: ball drag 8.9 cm (master 28.5).
6. Polish (e): the harness render column peaks 1.4 cm (aim spot 180; master 5.3); others <= 0.8 except guard 0.9 180
   8.9 (the drag). REPORT-C's 2.9-3.1 does not reproduce. Done: the GPU sheet confirms the mesh's heel point.
7. Polish (f, PASS2 item 5) aim spot 90: master / N1: contact slide 7.9 / 0.0 cm, twist at lift 51.6 / 21.2 deg,
   backstop 38 / 0 deg, steps 2 / 2, planted foot turn in one plant 38.4 (scrub about the ankle) / 68.8 deg (pivot on
   its ball, heel up; the full TURN_PIVOT.max idle 1.2 rad, footPlanner.ts:306). 90 deg in 0.28 s unchanged. Aim spot
   180: 27.1 at lift, 71 pivot, 2.2 backstop. Look at it on the GPU sheet.
8. Polish (new): crouched flick 180 at 1.45 m/s: one 12-15 cm forward pop of the swing foot (60 and 120 Hz; master
   none): at t 2.167 the clock takes over a crouched band-in step and its target jumps 51 cm (the 4 mm BAND_STEP_CROUCH,
   :261, makes those steps routine).
9. Polish: remote spin 2 pelvis-frame gap 2.1 cm at 60 Hz (master 8.3; footTurn's limit 2); guard spin 1.3 body-frame
   gap -2.5 cm (master 6.1); a new `for (const side of [-1, 1] as const)` in the per-frame band step-in (~847; the idiom
   is on master 5 times, but the rule bans iterators in anim loops); pivot slider 0 is not "(0: locked)" (tuneStep.ts:38):
   the backstop still turns the feet on the ball and snaps the heel to 0.1 rad in one frame (:623), no slide;
   contactSlide misses a sweep if a point lifts > 5 mm every other frame (the planner never does).

## Polish list
Swing re-aim / no-crossing snaps (pre-existing, every refresh rate) + a 144 Hz harness row; remote crouched-flick
stance width; guard walk-turn zig-zag; crouched band-step takeover pop; remote / guard spin gap margins; the for...of in
the band step-in; the "0: locked" label; the aimed spot turn's 69 deg ball pivot (GPU sheet); audit heel point vs
footGeom's heel (GPU sheet).
