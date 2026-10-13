# Locomotion run - decisions

Authority: this file > docs/design-bible.md > PLAN.md > other docs > code.

## Michael's decisions (2026-10-13), verbatim

#### D1 Controls:

- The controller is the primary design target, then keyboard and mouse.
- Every verb is designed and tuned on the pad first, and is covered in e2e-pad and e2e-mouse.
- Touch is a basic test and fallback scheme only: move and look, aim, fire (elbow strike while holstered), crouch, jump, one contextual action button (it carries back-to-wall, door peek, takedown, interact and traverse), and the vision toggle. No other touch work.
- Keep e2e-touch passing for that basic scheme. Readability is judged on desktop first.
- This replaces the bible's "touch and controller are equal" text and the Phase 3 touch control scheme spec.

#### D2 No bobble. Starting limits; the audit may refine them only with cited biomechanics sources; the final values are frozen in config with unit tests:

- Pelvis vertical travel, peak to peak per stride: crouch gears 2.5 cm or less, walk 4 cm, run 6 cm, sprint 8 cm. Exactly one low and one high point per step; no double bounce.
- Head: vertical travel no more than the pelvis; pitch and roll oscillation 2 deg or less.
- Lateral pelvis sway at walk: 3 cm or less.
- Camera: no camera bob. The camera follows the smoothed capsule, never the head or pelvis. Vertical oscillation 0.5 cm or less in steady movement. A landing gets one damped dip and no rebound.
- Weapon and kit sway settle within 0.2 s after a stop, with no secondary wobble. Idle breathing 1 cm or less.
- Measured on every gear, in both stances, on flat floor, stairs and slopes, at 60 and 120 Hz, for local and remote poses.

#### D3
First Playable steps S3a and S3b are absorbed into this run.


#### D4
The phone perf budgets stay; nothing may regress them. The 0.04 ms per character animation budget holds, for remotes too.


#### D5 Modern layer. Control stays instant (bible 5.12.1); weight lives in the body.

1. Speed-scaled gait: stride length, pelvis height, arm swing and forward lean scale with speed; gears read as effort levels, never as playback rate (batch 1).
2. Acceleration and turn lean on the upper body, through a damped spring; the root never overshoots (batch 1).
3. Compression and one damped settle on stops, landings, drops and vault exits (batches 1 and 3).
4. Plant-and-pivot steps on sharp direction changes; stride warping so the feet always match the capsule (batch 1).
5. Exertion breathing after a sprint or climb, chest and shoulders only, cosmetic, no stamina (batch 1).
6. Trained posture: soft knees, a stabilised level head, ready hands while holstered; heel-to-toe foot roll at the stealth gears, matching the noise model (batch 1).
7. Weapon discipline when aiming: the muzzle never sweeps team-mates; low-ready in tight spaces (batch 2).
8. Head and eye look-at toward noises, visible guards, nearby team-mates and the aim point, within neck limits (batch 1; guards in batch 5).
9. Hand contact IK on door frames, corners and ledges; ducking under low geometry; turning sideways through tight gaps (batches 3-4).
10. Full-body IK on stairs and slopes: pelvis drop, feet on treads, spine compensation (batch 1).
11. Momentum-scaled traversal: the same input gives a fast, low vault from a sprint and a careful one from a walk.
12. Pad: analog speed with gear snapping and hysteresis; a bumper or the rocker sets the maximum gear; Gamepad API rumble on landings, takedowns, shots and heavy footfalls.
13. Camera: spring-damper follow of the capsule, slight look-ahead, smooth pull-in near walls, automatic shoulder swap at corners, a small field-of-view change by gear and stance, never a bob.
Never: motion matching or captured data, root motion driving control, stamina penalties, player ragdoll beyond hit reactions.

#### D6
Michael's per-batch sign-off (bible 5.12.4) is replaced by one final review of the whole run.


#### D7 Input options:

- Full remapping of every action, for the pad and for keyboard and mouse, with conflict warnings and a reset to defaults.
- Every hold action gets a hold or toggle setting (aim, crouch, back-to-wall, sprint, grab).
- Custom difficulty: separate sliders for guard perception speed, guard aim and alarm tolerance, plus the existing presets. In co-op, the host's difficulty applies.
- Settings persist in IndexedDB through src/save; a save-shape change follows the SAVE_VERSION rule.
- Covered in e2e-pad and e2e-mouse (remap, then play) and in unit tests.

#### D8 Co-op parity. Every feature in this run works smoothly in 2-4 player co-op, to bible 5.9 C11:

- Networking:
  - Every new or changed movement state, verb and clip has a networked MoveState mode, and remotes pose from it, never from position alone. Back-to-wall, door peek, holster / draw, elbow strike, medkit use, the dedicated clips and drag are included.
  - Committed moves (elbow strike, takedowns, team moves, drag) are host-approved with a shared start time; the host decides interruptions.
  - Health, medkit counts, the drawn / holstered state and the weapon in hand are host-authoritative.
  - Vision modes, the camera, rumble, remapping and hold / toggle stay local and are never sent.
  - The D5 layer runs on remotes from MoveState plus velocity, computed locally, with no extra bandwidth. Remote bodies look as weighty as the local one.
- Avatar-to-avatar interaction:
  - players never interpenetrate (capsule separation)
  - shoulders turn to pass in tight spaces
  - head look-at includes nearby team-mates
  - muzzle discipline avoids team-mates
  - two players can stack on one wall in back-to-wall
  - every existing team move (boost, human ladder, split-jump boost, back-to-back, pull-up, rappel anchor, dual takedown) gets the D5 layer and contact IK, with no clipping between the two bodies
- Hooks for Phase 5, not built now: drag and medkit use accept any target, including a downed team-mate (record it in PLAN.md as a hook). Sync, clutch saves, typed pings, new team moves and team results stay in Phase 5.
- Tests:
  - every new state adds an e2e-netmove case, with the remote pose error under its limit
  - the bot partner exercises every team move and verb
  - one ?net=local 4-player run covers back-to-wall stacking, takedowns, the elbow strike and medkits
  - the anim-audit harness also runs on remote poses
  - rubber-banding, or pose error above the e2e-netmove limits, fails the step


## Michael's decisions D9-D10 (2026-10-13, added mid-run), verbatim

#### D9 Open-side weapon at edges:
- At a back-to-wall edge, lean-out aim and peek always use the open side. At a left edge the pistol goes to the left hand (mirrored two-handed grip) and the rifle to the left shoulder; the camera shoulder follows. Right edges are unchanged.
- The switch happens inside the draw or lean-out step (0.2-0.3 s), blended with the Inertializer, never a pop. Mid-wall aim stays on the normal side.
- Body exposure (perception and the light meter) uses the real mirrored pose, so the open-side lean exposes less of the body.
- Network: WALL_SUB leftHand is set from the edge side; remotes pose from it.
- Checks: harness grips < 2 cm and no weapon through the wall on left and right edges for the pistol and the rifle; an exposure test proving the left-edge lean exposes no more body than the right-edge lean; anim-sheet items (PROVISIONAL in the cloud) for left and right edges with both weapons, local and remote.

#### D10 Aim around low cover:
- At the end of a low wall (crouched), aim with the stick or look toward the end: the body stays crouched and leans out past the end (same rules as the high-wall lean-out, including D9). Aim mid-wall, or with the stick up or away from the end: rise over the top as planned.
- Crouched peek around the end works like the high-wall peek.
- Exposure feeds perception and the light meter from the real pose, so leaning around the side keeps the head below the top of the wall.
- Network: a new WALL_SUB bit or a field on the existing lean, posed on remotes.
- Checks: e2e-wall cases for side lean and over-the-top on a low wall, both edges, pistol and rifle; an e2e-netmove case under 10 cm; a test that the side lean's head height stays below the wall top; anim-sheet items (PROVISIONAL).

## ASSUMED - for review

Choices made during the unattended run. Each lists the option taken and the alternatives.

- **A0 (ASSUMED - for review): audit document location.** Taken: `docs/locomotion/AUDIT.md` (the brief). Alternative: `docs/animation-audit.md` (bible 5.12.4). The brief is newer and names this folder as the run's memory.
- **A1 (ASSUMED - for review): the doorway / outside-corner lean (src/cover/cornerController.ts) is removed with snap cover.** Its job moves to back-to-wall corner peek and door peek (bible 5.3). Alternative: keep the free-standing contextual lean beside back-to-wall. Removing it avoids two corner systems competing for the same press.
- **A2 (ASSUMED - for review): MoveState slot 1 (`cover`) is renamed `wall` for back-to-wall, and PROTOCOL_VERSION goes 2 -> 3.** Peers always run the same build, so the u8 index can be reused. Alternative: retire slot 1 and append `wall` at the end.
- **A3 (ASSUMED - for review): D7 options persist in `Settings`** (IndexedDB `kv/settings` through `src/save/db.ts`, sanitized with defaults), not in `SaveData`. No SAVE_VERSION bump for settings. Alternative: move them into `SaveData` with a migration. Settings already go through src/save and are not mission progress.
- **A4 (ASSUMED - for review): "every existing team move" in D8 means the team moves that exist in code: brace, boost, human ladder and the dual takedown.** Split-jump boost, back-to-back, pull-up and rappel anchor do not exist; they are reserved as Phase 5 kinds (PLAN.md H4). Alternative: build them now (Phase 5 scope).
- **A5 (ASSUMED - for review): committed verbs (elbow strike, drag, medkit, takedowns) use one generic host-approval protocol `cmove` / `cstart {t0}` / `cdeny`,** modelled on the team-move `tmove` / `tstart`. Alternative: one message family per verb.
- **A6 (ASSUMED - for review): the high flat-back cover pose and the support-hand wall contact are kept and renamed (`coverHand` -> `wallHand`, `offCover` -> `offWall`) as the base for back-to-wall** (step 06). Alternative: delete them and author back-to-wall from scratch in step 11.
- **A7 (ASSUMED - for review): gear to D2 limit mapping.** Standing gears 1-3 use the walk limit (4 cm), 4-5 the run limit (6 cm), 6 the sprint limit (8 cm); all crouch gears use the crouch limit (2.5 cm). Alternative: gear 3 (2.0 m/s) as run. 2.0 m/s is a brisk walk in human gait data, so walk fits.
- **A8 (ASSUMED - for review, step 20): the bot partner is a real client in a second page** (`?net=local&bot=1&join=<code>`), commanded over a dev-only BroadcastChannel, so the game protocol is unchanged. Alternative: a headless second sim in the same page.
- **A9 (ASSUMED - for review, step 21): every gait clip's lateral sway is capped at amplitude 0.0115 (2.76 cm p2p)**, crouch, back and strafe included. Alternative: fix standing gears 1-3 only.
- **A10 (ASSUMED - for review, step 21): the heel-strike pelvis kick is removed;** the clip's single dip carries the step and the spring is reused for stop settles. Alternative: keep the spring and remove the clip dip.
- **A11 (ASSUMED - for review, step 23): look-at priority is aim, then a noise within 2 s / 15 m, then a team-mate within 4 m, then travel direction;** visible guards join in step 28. Alternative: nearest target only.
- **A12 (ASSUMED - for review, step 24): landing camera dip soft 1.0 / roll 2.0 / heavy 3.0 cm, critically damped; auto shoulder swap when the shoulder side is blocked within 0.6 m and the far side is open for 1.5 m, after 0.25 s.** Alternative: dip scaled continuously by fall height.
- **A13 (ASSUMED - for review, step 25): muzzle discipline - when the aim line passes within 0.4 m of a team-mate within 8 m, the rig drops to low-ready and fire is held.** Alternative: pose only, fire allowed.
- **A14 (ASSUMED - for review, steps 22, 25, 26): quick 180, throw and airborne get their own MoveState modes (`quick180`, `throw`, `air`).** Alternative: derive them on remotes locally.
- **A15 (ASSUMED - for review, step 26): ladder sprint goes from 5 to 3.3 rungs/s (0.3 s rung minimum); the normal 3 rungs/s stays.** Alternative: normal 2.5, sprint 3.3 (changes a level metric).
- **A16 (ASSUMED - for review, step 28): guard postures are derived on clients from the wire alert level plus velocity;** a 2-bit sub-state with a protocol bump only if that is impossible. Alternative: postures on the host only.
- **A17 (ASSUMED - for review, step 30): players within 0.9 m and passing turn the torso up to 35 deg.** Alternative: 0.8 m and 45 deg.
- **A18 (ASSUMED - for review, step 34): versions count the in-progress CHANGELOG heading 3.6.x, so Phase 3 = 3.7.0, Phase 3b = 3.8.0, package.json 3.8.0.** Alternative: count package.json only (3.6.0 / 3.7.0).
- **A19 (ASSUMED - for review, step 30): the 4-player check is one host page plus three bot pages.** Alternative: four human-driven pages.
- **A20 (ASSUMED - for review, step 09): the drawn state rides as a `dw` field (0-3) on every MoveState;** the host checks the weapon against the lobby loadout, forces holstered when hands are busy, and refuses shots unless drawn. Alternative: a flag bit, or host approval of every draw (adds aim latency).
- **A21 (ASSUMED - for review, step 10): elbow strike is predicted** - the wind-up plays at once, aligns to the host's `t0` on approval, blends back if denied or after 0.4 s with no reply; the hit is decided on the host. Alternative: wait for approval before any motion.
- **A22 (ASSUMED - for review, step 10): takedowns stay on `td` until step 27, then move to the shared protocol.** Alternative: move them in step 10.
- **A23 (ASSUMED - for review, step 11): back-to-wall** max gear 4 (2.8 / 1.8 m/s), crouch noise band, enter within 0.9 m and 100 deg or stick into the wall for 0.35 s, low walls always crouched, stacked players >= 0.62 m apart. Alternative: full gear speed, or a fixed slow wall speed.
- **A24 (ASSUMED - for review, step 12): the SWAT turn is a client-owned committed traversal (`swat`, MoveCommit), duration clamp(gap / 2.4 x 1.15, 0.5, 0.8) s.** Alternative: host-approved.
- **A25 (ASSUMED - for review, step 13): a cracked door (0.12 of the swing over 0.6 s) keeps collision, light blocking and guard sight lines; guards treat it as closed.** Alternative: light leaks through, or guards notice it.
- **A26 (ASSUMED - for review, step 14): thermal does not see through walls; warm bodies and electrical devices glow via render-only emissive flags and a branch in the existing post shader.** Alternative: a mask render target, or thermal through thin walls.
- **A27 (ASSUMED - for review, step 15): an interrupted medkit is spent; use is stationary and holstered; pad hold X 0.4 s (tap = reload), key H, no touch button; the health pickup becomes +1 medkit; the health bar defaults on.** Alternative: refund on interrupt, another button, bar forced on.
- **A28 (ASSUMED - for review, step 16): weapon ids stay (no save migration), only names change; heavy pistol = `pistol`, marksman = `dmr`; the dart sidearm is reserved.** Names: campaign Heron Carbine, Marten 9 SMG, Mason 12 Pump, Spotter 7.62 Marksman, Hush 9 SD, Warden .45; unused Kite 5.7, Ferret .45 SMG, Swift 5.7 PDW, Steppe 5.45 Rifle, Ibex Bullpup, Talon 12 Semi, Ridgeline Bolt, Anvil 5.56 LMG; Breacher and Silent Crossbow keep theirs. Alternative: rename ids with a SAVE_VERSION bump.
- **A29 (ASSUMED - for review, step 17): max gear is set by the D-pad rocker and the mouse wheel, not a bumper; analog gear thresholds are the midpoint of adjacent caps +- 15% of the gap.** Touch drops swap, gadget, wheel, sprint, shoulder, ping and speed buttons. Alternative: a bumper.
- **A30 (ASSUMED - for review, step 18): inputs shared by design (Y, context action, X tap / hold, fire / strike) are allowed; other conflicts warn but do not block saving.** Alternative: block saving on conflict.
- **A31 (ASSUMED - for review, step 19): alarm tolerance scales the guard radio call-in delay and alarm panel raise time, not the mission's failing alarm count.** Alternative: tolerance = alarms allowed.
- **A32 (ASSUMED - for review, step 19): custom difficulty takes damage, hp, medkits and reward from a base preset; sliders 0.5-2.0; presets map to Rookie 0.7 / 0.7 / 1.35, Normal 1 / 1 / 1, Realistic 1.3 / 1.3 / 0.8, Perfectionist 1.5 / 1.3 / 0.7.** Alternative: every field a slider.
- **A33 (ASSUMED - for review, step 04): the default loadout presets are renamed Ghost / Panther / Assault -> Silent / Flash / Loud;** existing saved presets keep their names. Alternative: keep the old names (they read as the removed style economy).
- **A34 (ASSUMED - for review, steps 12 / 12b): D10's low-wall side lean is carried by a 2-bit lean-kind field `lk` on the wall MoveState (0 none, 1 out past the edge, 2 over the top), not a new WALL_SUB bit,** because all 8 WALL_SUB bits are used. Added inside step 12's PROTOCOL_VERSION 6 -> 7 bump. Alternative: widen WALL_SUB to 16 bits.

## Michael's instructions during the run
- **M1 (2026-10-13): model change.** From step 06 on, every subagent uses opus, implementers and checkers, in all blocks. Unchanged: one code-changing agent at a time, about 60 tool calls per subagent. Steps 01-05 ran with sonnet implementers.
- **M2 (2026-10-13): speed rules** (RULES.md "Speed"): implementers run only their step's e2e suites, Block A steps 02-04 batched, E2E_JOBS=2, block-end kestrel merges, no proof worktrees.
- **A35 (ASSUMED - for review, step 07): the landing camera check allows 0 or 1 damped dips and never a rebound; the pelvis must show exactly one dip (D5.3 compression).** The camera follows the smoothed capsule, so a soft landing may show no camera dip at all. Alternative: require exactly one camera dip (A12 sets its size at step 24).
- **A36 (ASSUMED - for review, steps 08 / 23): feet-on-treads (D5.10) is measured against the visual tread tops computed from the stairs geometry, and step 23 aligns the stairs collision slab with the nosings** (today it runs through the back corner of each tread, up to one 28.9 cm rise below the nosings). Alternative: make each step box collide (more Havok bodies, stepping jitter).
- **A37 (ASSUMED - for review, step 08): the remote audit on software GL runs both pages undrawn (`scene.render` off) and drives the background client's own loop tick from a 16 ms timer instead of rAF; the remote pose error lines B's track up with the host's copy at `INTERP_DELAY` plus the measured latency that best matches the roots (searched 0-0.25 s on moving frames; INTERP_DELAY when fewer than 20 moving frames).** Drawn, the two match pages ran at 2-12 frames/s and the background page's rAF is held to ~15 Hz, so real-time rows were meaningless; the loops, sim, snapshots and poses are unchanged (frameUpdate holds the complete pose). `E2E_GPU=1` keeps the draw (PC-PASS 15). Alternatives: a shorter real-time run at the throttled rate (coarse, stride phases undersampled), or both pages manual (not real time, against step 08 task 2).
- **A38 (ASSUMED - for review, step 08): no gait phase on the wire.** Remote copies integrate their own stride phase, so their feet drift up to a half stride from the owner's while walking. The harness gates on root, head, wrists and settled ankles plus a phase-aligned lower-body error, and reports the phase offset. Alternative: send a u8 gait phase in MoveState (1 byte per snapshot, exact foot match).
- **A39 (ASSUMED - for review, step 08): remote gate scope.** `--compare` gates remote poseError (root, head, wrists, settled ankles), pops at 60 Hz, pairAlign and lodSkip, with an allowance of max(2x run spread, 10%, 2 mm, 2 counts). lowerBody (phase-aligned) and 120 Hz pops are reported, not gated: both vary up to 2x between identical runs because of the page-side 120 Hz pump. Alternative: three-run bands for them.
- **A40 (ASSUMED - for review, step 08): remote poseError is report-only until step 22.** Identical runs read 20-41 cm, because the owner holds its stopped stride while the copy idles (a real D8 finding that step 22 fixes). Until then the remote gate is pops at 60 Hz, pairAlign and lodSkip, and e2e-netmove's settled 10 cm pose check stays the network pass / fail. Step 22 re-baselines poseError from three runs and gates it again. Alternative: gate it now with a band so wide (about 40 cm) that it catches nothing.
- **A41 (ASSUMED - for review, step 09): holstered-unless-aiming details.** A match starts holstered (no holster animation); a weapon swap while holstered only changes the selection (the next draw takes it); RB swaps while aiming too (its old aiming use, marks, is gone); grenades and gadgets work holstered (attached stow still blocks them); the draw / holster rides the existing swap timeline paced to the draw state (0.3 / 0.4 s draw, 0.4 s holster), weapon-to-weapon swaps keep SWAP_TIME 0.9; settled holstered drops the swap overlay (unarmed arms). The host's "own view" of busy hands is the client's sanitized and clamped MoveState mode (attached modes except split / rappel / inverted pipe, takedown, brace / boost / stacked bottom) plus host health for downed; an empty lobby loadout keeps the claimed weapon. Alternatives: animate the start holster; block swaps while holstered; host-side attach tracking independent of the claim.
- **A42 (ASSUMED - for review, step 09): holstered-by-default carries a "ready hands" stand-in pose now** (soft elbows about 60-90 deg, hands near the belt line, clear of the slung weapons), and the audit's gait scenarios run holstered with a drawn (aim) subset; the anim-audit baseline is re-cut once after step 09 for the arm metrics only. Holstering must not change pelvis or head motion (D2). The full D5.6 trained posture is still built in step 21. Alternative: keep straight hanging arms until step 21 and run the audit drawn (hides the default pose from the audit).
- **A43 (ASSUMED - for review, step 09): reloading is never cancelled by releasing aim.** Releasing aim mid-reload finishes the reload, then holsters; pressing reload while holstered draws to low-ready, reloads, then holsters, and never fires. Alternative: reload only while aiming (the player must hold aim for 2.6-3.1 s).
- **A44 (ASSUMED - for review, step 10): elbow strike details.** The 90 deg cone is the full cone (45 deg either side of the camera's facing; the host re-checks against the body or the aim yaw); "aware" is any alert level but unaware; the target id rides MoveState `tid` as a string ('' = a whiff, not -1); a fire press during the recovery (after contact) is queued and starts the next strike as this one ends (so a second strike lands inside the 1 s stagger); a reload running or queued (A43) blocks the strike, and a running strike holds the draw (aim waits for it to end); the client's alignment to `cstart` never moves its clock forward (a late estimate of the host clock would skip the strike); a client's prediction timeout is local only (the host still resolves a strike it accepted); the lethal takedown blow shares the reworked elbow arc (`melee`); the strike `result` event is emitted on solo / host only. e2e: the strike cases run on Warehouse Hunter (Proving Free Roam has no guards), and the netmove denial uses a target id the host does not have (Proving has no guards; the seized-target denial is in e2e-coop). Alternatives: half-angle cone; aware = combat only; numeric target index; no input buffer; aim cancels a strike.
- **A45 (ASSUMED - for review, step 11): back-to-wall details.** The capsule keeps the 0.35 m standoff (collision, AI cover spot, the wire) and only the rig's root moves onto the face (`wallRootPush` = standoff - body depth half - 1.5 cm, eased over 0.2 s) so the back sits <= 3 cm off it; the slide is paced from the body's own position along the wall (no catch-up surge) and braked into a stopping end at 5 m/s^2 so the body stops on the end, not 0.5 m past it; after an inside-corner wrap the held stick keeps its sense until it is released or reversed; a wall MoveState with a segment out of range is dropped (null), not clamped; `sub` is a u8; the hold variant of `gameplay.wallToggle` already works (release leaves) with its UI in step 18; a crouch press on a high wall toggles the stance and leaving keeps it. Alternatives: move the capsule to the face (clips the collision skin), integrate `s` blindly (the body lags then surges), stop the wrap at the corner.
- **A46 (ASSUMED - for review, step 11): back-to-wall entry time is 0.2 s + 0.3 s per metre of approach, at most 0.45 s** (was a fixed 0.2 s), so a 0.85 m approach settles without a 5 m/s glide or overshoot. Alternative: fixed 0.2 s with a shorter entry reach.
- **A47 (ASSUMED - for review, step 11): back-to-wall pose polish is carried to step 27 (the dedicated back-to-wall clip).** Step 11 ships the functional core (enter, slide, stack, networked, guards react) with the worst pose faults fixed (overshoot, feet behind the face, back gap, upper arm through the torso, foot skate). The remaining wall audit fails (entry-turn joint rate ~45 deg per frame, shank crossing, forearm clips, exit pelvis jump, remote wallClip 3.9 cm in the settle) enter the baseline as new rows and are fixed in step 27. Alternative: keep step 11 open until every wall row passes.
- **A48 (ASSUMED - for review, step 11 fix round 2): the stick-into-wall entry needs a fresh push.** A stick held through a traversal, an attach, a fall or another blocking state disarms the stick entry until it is released (magnitude <= 0.5) once; the context press is unaffected. Walking off a ladder top or a roof with the stick held forward and landing against a face no longer enters back-to-wall (e2e-clip ladder climb). Alternative: a fixed grace time after a traversal or landing (a fall lands 1.5 s or more after the traversal ends, so a short grace misses it).
- **A49 (ASSUMED - for review, step 11 fix round 3): the local wall audit rows carry a noise band.** They are the only local rows that are not repeatable to the bit: the wall entry and the head read the camera, whose shape casts and springs carry page-load state the harness cannot reset (frames run on real time before the harness takes the loop), and a 1e-12 difference flips one foot contact a frame early or late. The harness now resets the camera clock (idle drift) before each wall run (wall@60 then repeats in 3 runs of 4, it never did before); the remaining spread was measured over 6 runs (foot slide / sink up to 7.1 mm, joint angles up to 6.8 deg, everything else under the normal tolerances). The baseline (two full runs, `--band`) keeps the worse of the two per wall metric with a band of at least 8 mm on the foot rows and 7 deg on the angle rows, and `--compare` allows that band on local rows. Other local rows stay exact. Alternatives: boot each wall run from a fresh page with the loop manual from the first frame (no hook for it; +10 s a run), or make the camera ignore the 1e-12 residues (a gameplay change for a harness problem).
