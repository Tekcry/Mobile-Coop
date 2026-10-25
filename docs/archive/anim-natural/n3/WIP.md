# anim-natural N3 - parked work in progress (2026-10-22 ~09:40)

Paused for usage pacing (orchestrator: one agent at a time, N0 first). UNVERIFIED: the implementer was stopped
mid-slice (its last note: "Order there is wrong; swap the two lines"). Built so far: `src/anim/drawMotion.ts` and
`src/weapons/drawTune.ts` (new: the draw phases and their tuner values), edits in `src/weapons/{drawState,
playerWeapons, weaponModel, backDiag}.ts`, `src/player/{characterRig, weaponStance}.ts`, and in track B's
`src/anim/animGraph.ts` and `src/anim/tuneBakeTable.ts` (route through the orchestrator before shipping), test helpers
`tests/helpers/draw{Harness, Scenarios}.ts` and tests `tests/n3*.test.ts` (n3Dbg / n3Trace / n3Capture look like
debugging scaffolds: keep the real tests, delete the scaffolds before the PR). The cause of the mid-draw stop is not
yet recorded here: on resume, read the diff and the n3Trace test, or resume the implementer.

Routing (orchestrator, 2026-10-22): the edits in `src/anim/animGraph.ts` (the draw hand-off) and
`src/anim/tuneBakeTable.ts` (the draw sliders' bake rows) are approved: keep them minimal and additive, name the lines
in the PR body, and send them to CT Core (N1 / N2 work near those files) before the PR. Record the mid-draw stop's cause
here as soon as the trace finds it.

N0's finding on the stop (2026-10-22, AUDIT.md rank 2-3): the X draw flicks the rifle off the back (muzzle -52 -> +87
-> 0 deg in 3 frames, 10-11 m/s), holds it level at the shoulder ~0.15 s, then drops it to low ready; the pistol holds
~0.18 s. Likely cause: the swap clip's pocket keys hold before the low ready takes over (`travelKeys` backPocket
0.65-1.0; pistol 0.8-1.0). Confirm with tests/n3Trace.test.ts. Also rank 10: a 12 cm one-frame jump at the swap
hand-off. Open for Michael: draw times (rifle 0.3 s, pistol 0.5 s, G2) are below the bible's 0.75 / 0.6 s raise
minimums.

## Confirmed cause (2026-10-22, implementer resume; NullEngine frame trace of the pre-N3 code, `tests/helpers/drawHarness.ts`)
The incoming draw travel ended at `SWAP_HOLD` 0.8 of the swap clip, and for the clip's last 20 % its own pocket keys (a
level pocket, its weapon-pitch channel, the support hand off) held the gun at full overlay weight: the rifle's X draw
arrived level (+6 deg) and crept at 0.1-0.25 m/s for 5 frames (0.08 s), the pistol's at -7 deg for 10 frames (0.17 s).
Only when the swap clock ended did the overlay fade out (`SWAP_FADE`, 8 frames) and the low ready take over, so the gun
moved a second time, pitching down 34 deg (rifle) / 53 deg (pistol) at 3-3.8 m/s at the muzzle: the "random stop".
Before it, the catch (`CATCH_DIST`) held the rifle in its slot until the wrist was within 13 cm, then ran the rest of
the travel in about 0.13 s (muzzle -59 -> +83 deg in a frame). The trace found three more: the swap press switched the
pose weight to the incoming gun's (`PlayerWeapons.weaponWeight` -> the graph's pistol pocket), jumping the outgoing rifle
28 cm in one frame; the swap's travel end at 0.8 handed over to the hold with an 11 cm one-frame jump (AUDIT rank 10);
and a draw measured the aim pocket's sight weld with the last held gun's span (`gunSpan` was set only at the hold), so the
pistol's LT draw sat 7 cm low and jumped at its end.

## Resolved (2026-10-22)
All of the above is fixed and covered by `tests/n3DrawMotion.test.ts` (every scenario: no 3-frame stop between the start
and the settle, no one-frame grip / wrist jump over 3.5 cm, nothing moving after the end, final poses as on master).
The times are DRAW-TIMES.md's. The scaffolds (n3Dbg / n3Trace / n3Capture / n3Hol) are deleted; the trace lives in the
real test. Open: the GPU proving run (`scripts/anim-natural/audit.mjs`, rows `draw-*`, `swap-drawn`, `holster-*`,
`ready-to-aim`) and the full e2e, both on the job lead's desktop lock.

## Paused 2026-10-22 ~12:45 (orchestrator: 5-hour window; resume on its message after the 14:10 reset)
Implemented and committed (0134e11e; master 4.52.0 merged 25dfd5c4). Fresh checker: **PASS WITH FIXES** (mutation
runs: dropping `drawRelease` fails 8 / 11 rig scenarios, travel ending at 0.8 fails 5). Targeted tests, tsc, eslint
clean. Full vitest pending (heavy lock). Resume with ONE fix round (implementer), then the steps below.

Must-fix:
1. RT strike pressed during the 1.0 s holster is dropped, not delayed (gameState.ts ~1608 / ~1761, strikeController.ts
   ~65: `TriggerTapHold` arms only at the press with `drawPhase === 0`). Arm it while HOLSTERING too, treat a pending
   strike as a busy move (holster at `HOLSTER_TIME_MOVE`), start the strike at phase 0.
2. A holster or traversal mid-draw snaps the gun to its slot (`setStowed(true)` with `swapPhase >= 2` ->
   `holsterAll(-1)`, playerWeapons.ts ~256-260): 20-39 cm grip, 1.2 m muzzle in one frame. Reverse from where the gun is
   (`beginTravel(rig, slot, false)`, `swapT = SWAP_TIME * TRAVEL_OUT`, `swapPhase = 0`); add holster-mid-draw and
   traverse-mid-draw scenarios.
Should-fix:
3. Re-draw within 0.4 s of seating (`RELEASE_TIME`): characterRig.ts ~2492 zeroes `relW` while `travelReach` restarts
   at 0: 7-14 cm wrist jump. Start the reach from `relK` (`travelReach = max(reachWeight, relK)`) or decay it.
4. n3DrawMotion.test.ts ~211: the stop threshold 0.15 m/s is absolute; make it relative (< 10 % of the move's peak for
   3+ frames) and add a muzzle angular-jerk check.
Nice-to-have: 6. `adsInTime` jumps 0.99 -> 0.27 s at DRAWN mid-dolly (playerWeapons.ts ~395): use `AIM_IN_*` whenever
`!slingDraw`, or `max(AIM_IN, remaining)`. 7. Gadgets refused for the whole 1.1 s draw (playerWeapons.ts ~763): record
in the PR. 8. e2e-combat.mjs ~38 margin vs the 1.5 s sling draw: include combat / takedown / stealth suites in the lock
run. 9. e2e-anim.mjs ~236 add a lower bound (`drawnT >= 1.3`); e2e-netmove.mjs ~246 stale "own 0.4 s" comment.
10. drawMotion.ts:3 cites tests/drawMotion.test.ts (is n3DrawMotion); animGraph picks the draw class from the slot,
weaponModel from `def.class` (fine while only rifle / pistol exist).

Then:
- Merge master once #109 (clip-speed, train/2) lands. Agreed with Course Ready: split its holster row into
  `clip.gun.holsterPrimary` / `holsterSidearm` ("Rifle / Pistol holster speed"); `holsterTimeFor(cls)` divides by its
  own row x `clip.all`; CLIP_BASE gets both; two bake rules (HOLSTER_TIME_PRIMARY / _SIDEARM); an old export's single
  `holster` row applies to both. Expected conflicts: drawState constants / update / remaining, `HOLSTER_TIME` alias,
  BAKE_CATALOGUE_MODULES, playerWeapons drawTime / holsterTime. `AIM_IN_*` and `HOLSTER_TIME_MOVE` stay unscaled.
- Tests (merge trains, orchestrator): CI + area suites e2e-anim, e2e-weapons-carry, e2e-studio, plus combat / takedown
  / stealth (finding 8), under heavy.lock, E2E_PORT 4199, E2E_JOBS=1; full vitest under the lock or on the laptop.
- GPU before / after sheets (port 4189 under the lock), then the PR (minor version; CHANGELOG, TESTING, systems docs;
  old -> new times in the body; name the animGraph / tuneBakeTable lines, the `swapRel` carriage change, the slower
  strike / reload / gadget windows). CT Core: no clash with N1 / N2 (2026-10-22).

## Fix round, stopped at 95% (2026-10-22 ~13:15, account handoff) - UNVERIFIED, 5 tests fail
Committed as WIP so nothing is lost. Undo all of it: `git revert` this commit (or check out its parent's
src/game/gameState.ts, src/weapons/playerWeapons.ts, tests/helpers/drawScenarios.ts, tests/n3DrawMotion.test.ts).
- **Fix 1 (RT during the holster), built, no test yet:** gameState.ts imports DRAW_HOLSTERED / DRAW_HOLSTERING (~47);
  new `rtQueued: 'tap' | 'hold' | null` (~429); ~1612-1624: the trigger also arms while HOLSTERING (holstered stance,
  not aiming), a tap / hold decided then goes to `rtQueued` (timing still from the press), cleared if the phase goes to
  drawing / drawn, `weapons.strikePending` set meanwhile; ~1773-1778 the strike reads `rtRes ?? rtQueued` at phase 0.
  playerWeapons.ts: `strikePending` field (~241); `holsterTime()` (~419) returns HOLSTER_TIME_MOVE when suspended or
  strikePending. To do: the Vitest test (rifle / pistol, tap / hold, RT 0.2 s after X).
- **Fix 2 (holster mid-draw), built, 5 of 8 new scenarios fail:** playerWeapons.ts ~261-277 in `setStowed(true)` with
  `swapPhase >= 2`: if the gun can travel and is in the right hand, `held = index`, `beginTravel(rig, slot, false)`,
  `swapT = SWAP_TIME * TRAVEL_OUT`, `swapPhase = 0`; else the old snap. drawScenarios.ts: optional `final`, `midDraw()`
  (8 scenarios: rifle / pistol X at 0.3 / 0.6 / 0.9 of the draw, traversal at 0.5); n3DrawMotion.test.ts covers them.
  Results: `Tests 5 failed | 27 passed (32)`. Grip jumps: rifle X@0.3 5.3 cm, X@0.6 3.7 cm, traversal 13.8 cm; pistol
  X@0.3 4.8 cm, traversal 18.2 cm (the 0.9 cases and pistol X@0.6 pass). Suspects, unchecked: `beginTravel(..., false)`
  sets `rig.travelReach = 1` at once (mid-reach the hand jumps onto the grip: start it from the current reach weight);
  a 0.15 s HOLSTER_TIME_MOVE stow from mid-draw may not fit a 3.5 cm / frame limit at all (decide: a slower traversal
  stow from mid-draw, e.g. the remaining draw time mirrored, or a traversal-specific limit).
- Then should-fixes 3-4 and the "Then" list above.

## Fix round finished (2026-10-22, implementer) - uncommitted on top of 5348f9be
`tests/n3DrawMotion.test.ts`: 35 / 35 (was 5 failed / 27 passed of 32). tsc clean, eslint clean, the 36 test files of
the changed modules pass (444 tests). Not run: full vitest, `npm run check`, e2e (heavy lock).
- **Fix 2, cause:** two things. (a) The reversal restarted the swap clip at time 0 (a fresh holster) while the draw had
  entered it at the holstered beat: `drawEnter(st < swapInT)` is 0, so the clip's reach pose (chest turn 0.12 rad, weapon
  pitch) dropped out in one frame (the 5.3 cm rifle X@0.3 jump; chest-frame grip only 1.7 cm). (b) The new holster travel
  started from rest (smoothstep) and the 0.15 s traversal holster could not fit. Fix: the draw **rewinds**
  (`playerWeapons` `startRewind` / `rewindStep`): the swap clock runs back down the draw half to the holstered beat, so
  the clip, its `drawEnter` / `drawRelease` weights and the gun's draw path all play backwards, turning from the draw's
  rate to the return over 0.12 s (`REWIND_TURN`), then at the draw's own rate (X: the elapsed draw mirrored); the reach
  lets go last. The draw state's holster time follows the rewind (`rewHol`) so the phase reaches 0 as the gun seats.
  Two seat fixes the rewind exposed: the rig's release now starts from the hand's weight on the gun (`relFrom`; it
  started at 1 and put the hand back on the grip, 11-12 cm), and a draw from the slot starts from the slot where it is
  now (`WeaponModel.travel`; the thigh moves with the hip, the pistol seated 8-9 cm off and jumped).
  Grip jumps before (WIP) -> after: rifle X@0.3 5.3 -> 0.6, X@0.6 3.7 -> 0.9, X@0.9 pass -> 0.4, traversal 13.8 -> 1.6;
  pistol X@0.3 4.8 -> 1.0, X@0.6 pass -> 1.1, X@0.9 pass -> 0.6, traversal 18.2 -> 2.3 cm (the original snap: 4.7-39 cm).
- **Assumed:** a traversal, busy move, queued strike, attach or forced holster mid-draw rewinds at 2x the draw's pace
  (`REWIND_QUICK`), easing to 1x as the gun seats (the reach let go at 2x left the wrist 10 cm behind); its rifle muzzle
  peaks 16.5 m/s, so the muzzle check for the traversal scenarios is 10 x REWIND_QUICK. Undo: `REWIND_QUICK = 1`.
- **Fix 1:** the queue logic moved into a pure `StrikeTrigger` (weaponStance.ts; GameState uses it, same behaviour as the
  WIP). New: a holster sped up mid-way (RT queued, or a traversal during an X holster) eases onto HOLSTER_TIME_MOVE
  (`holS`, tau 0.04 s): it switched in a frame (8.4 cm grip, rifle muzzle 21.6 m/s), now 4.1 cm / 13.5 m/s, holstered
  0.18 s after RT instead of 0.12 s. Test: rifle / pistol x tap / hold, RT 0.2 s after X.
- **Should-fix 3:** a draw from the slot while the hand still lets go of the gun starts its travel at the reach point of
  the release's weight (`drawMotion.reachStart`, `CharacterRig.releaseOf`): the hand never leaves, the gun comes out
  sooner. Scenarios `redraw rifle / pistol (X again 0.1 s after the seat)`: wrist jump before 4.9 / 7.4 cm, after 1.3 / 1.0.
- **Should-fix 4:** the stop rule is relative: 3+ frames with the wrist, grip and muzzle all under 10 % of their own peak
  in the move; a mid-draw holster / re-draw is two moves, and the turn between them (through rest) may take <= 10 frames
  (measured <= 7); a rewind's window ends at the seat. New check: the muzzle's turn changes by < 15 deg in a frame (worst
  kept: the swap pistol -> rifle hand-off 12.5 deg). "Low ready to aim" was not a stop (its grip creeps the last 2 cm
  while the muzzle still turns 1.4 m/s); no real stop found.
- **Nice-to-haves:** 6 done (LT during an X draw blends at AIM_IN at once; the LT sling draw over what is left of it,
  never under AIM_IN: no jump at drawn); 9 done (e2e-anim `drawnT` 1.3-1.6, e2e-netmove comment; not run); 10 done.
  7 / 8 left to the job lead.
- **Open:** a re-draw (X) during a rewind continues forward from the rewind's backward rate in a frame (no scenario);
  a swap press during a rewind snaps the gun to its slot (the old mid-draw snap, kept for that corner); a rewind's quick
  return under a real traversal clip is not measured (the harness plays no traversal body); the G2 0.15 s holster itself
  (from drawn, for a vault) moves the gun several cm per frame, as before N3.

## Master 4.53.0 merged (2026-10-22 ~14:45, branch feature/anim-n3-merge, then into feature/anim-n3)
Conflicts in drawState.ts, playerWeapons.ts and tuneBakeTable.ts resolved. Assumed decisions (job lead):
- A1: Clip speed (`anim/tuneClipSpeed.ts`, #109) is the only draw / holster time control. N3's Draw section keeps the
  motion sliders (reach, grip, hand-over, settle, paths) and drops `drawTimeMul` / `holsterTimeMul` (and `DRAW_TIME_MUL`,
  their bake rules). Undo: restore them from 96134b16 (two knobs for one time).
- A2: the holster row splits per gun, as agreed with Course Ready: `clip.gun` `holsterPrimary` / `holsterSidearm`
  ("Rifle / Pistol holster speed"), `holsterTimeFor(cls)` = HOLSTER_TIME_<cls> / clipSpeed (its row x `all`), CLIP_BASE
  both, bake rules into HOLSTER_TIME_PRIMARY / _SIDEARM. HOLSTER_TIME_MOVE and AIM_IN_* stay unscaled.
- A3: an older record's single `clip.gun` `holster` value is skipped as an unknown id (no id alias: the row shipped in
  4.53.0 hours before the split, and the load / import / bake / history paths would each need it). Undo: an id alias.
- A4: the draw and holster speed rows go up to 7x (others stay 3x) so the pre-N3 times stay reachable (rifle draw 3.7x,
  holsters 6.7 / 6x); n3DrawMotion asserts it.
- e2e-studio's Clip speed check read the aim camera's blend, which no longer follows the draw time from low ready (N3):
  it reads PlayerWeapons.drawTime() / deliberateHolster() and checks the holster rows too.
Checks: tsc clean; eslint clean on the changed files; n3DrawMotion, tuneClipSpeed, drawState, animTuneBake and the 10
tuner-layout test files pass (208 tests).

## Fresh checker on the fix round (2026-10-22 ~14:35): PASS WITH FIXES, no must-fix
Both must-fixes work in the game path; co-op remotes stow in step (`dw` held at 3 until the gun seats), no wire change.
Mutations caught: rewind off, relW = 1, no reachStart, no slot re-place, no strike queue, strikePending off, REWIND_QUICK
4 / 6. Not caught: REWIND_QUICK = 1, the `holS` ease removed, `rewHol` ignored.
Should-fix (test gaps and narrow pops; the fix round is spent, so these are the next N3 follow-up's):
1. Assert the quick rewind (a traversal mid-draw reaches phase 0 within a set time).
2. Assert phase 0 within 1-2 frames of the gun seating in the mid-draw scenarios (`rewHol` sync).
3. A motion check for a holster sped up mid-way (RT queued, or a traversal during an X holster) with its own limit
   (measured 4.1 cm, over the 3.5 cm rule).
4. RT during an X rewind waits for the whole rewind (up to ~1 s): re-time the rewind to quick when strikePending turns on.
5. Older than N3 (same on 21235b53): releasing LT halfway through the pistol's LT draw jumps the grip 7.0 cm.
Polish: a swap press mid-rewind snaps (20 cm; rare input order); X / LT mid-rewind pops 2-6 cm; the sidearm attach mid
rifle draw keeps the old snap; a mid-draw traversal keeps the gun in hand 0.4-0.8 s (vs 0.15 s from drawn: check under a
real traversal clip); a queued strike survives death; `swapRate` NaN at dt = 0; test line ~335 fixed muzzle limit
(20 m/s) instead of 10 x REWIND_QUICK; the RT test drives StrikeTrigger directly.

## Master 4.54.0 merged (2026-10-22 ~14:40)
Conflicts: tuneBake.ts imports, tuneBakeTable.ts catalogue (cqGait + drawTune), characterRig.ts imports and the elbow
tuck / pole (master's per-gun `wrenTuckMul` and `ELBOW_POLE_OUT` with N3's release weight and travel pole). n3DrawMotion's
holstered-pistol tolerance 5 -> 7 mm (#103's body bake moved the thigh ~1.3 mm against the ea3399ed numbers).
Orchestrator change to A3: an old single `holster` value now maps to both gun holsters (tuneRows.ts ID_ALIASES) on load,
import, presets, the baked reset and the bake, with literal 4.53.0 records in tuneClipSpeed.test.ts.

## PR checks (2026-10-22 ~15:10, desktop under heavy.lock)
- 60782562 build: e2e-weapons-carry ok (35 s); e2e-anim FAIL test-side: "walk: elbows in (13.8 cm)" - the crab walk was
  recorded 1 s after `p.stance.holster()`, inside N3's 1.0 s holster + 0.4 s release (the old 0.15 s holster fitted).
  Fix (scripts only): e2e-anim waits out the holster / release (1.6-1.8 s) and the X draw (1.5 s) before its recordings
  (9 places). Rerun: e2e-anim ok (62 s).
- GPU after-sheets (`docs/anim-natural/n3/after/`, port 4189; draw / holster / swap rows with `--dtmul=2.5` so the
  tiles span the 1.1-1.5 s draws; ready-to-aim at 1x). "Before" = the pass 1 sheets on feature/anim-natural
  (`docs/anim-natural/audit/`). The audit's "stall" flag on the draws (0.08-0.22 s at 0.15-0.27 s) is the gun resting
  in its slot while the hand reaches for it, not a stop; after the grab the gun moves in one arc to low ready (rifle
  settled by ~1.0 s). Polish for Michael's look: the rifle's X draw swings the muzzle past vertical (0.67-0.83 s).

## Train 5 e2e-clip (2026-10-22 ~17:30)
Train 5's full run failed e2e-clip "sling draw + glide": the gun went through the legs (min -4.0 cm) and the trunk
(-8.0 cm). Cause in the test: it pressed LT 0.8 s into the (now 1.0 s) holster and glided 1.0 s into the (now 1.5 s) LT
sling draw. Fix (scripts only): wait 1.8 s after the holster and 1.7 s after LT, so the scenario measures what it names.
**Polish for Michael's walk (real, not hidden by the fix):** pressing LT while the gun is still going back to its slot
reverses it into the sling draw, and on the way the gun passes through her trunk (up to ~8 cm) and legs (~4 cm) - the
same family as the checker's "X / LT mid-rewind pops". Fix later: a holster interrupted by LT should rewind like an
interrupted draw (the reverse path), not start the sling draw from the part-seated gun.
