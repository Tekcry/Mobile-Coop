# Takedowns
Owner: Player Build. Status: current.
Purpose: takedown kinds, the grab and hostage, and the close strike.
Design authority: docs/DECISIONS.md (G23, G42, G43, G155, G180, G348), then docs/design-bible.md (Section 5.4).

## Decided direction
- Built (G43, G23; ct-prototype G5 with Michael 2026-10-20 08:10, 08:20, 08:25): every takedown on offer is a row of
  the hold-A action menu (`src/game/contextMenu.ts`). Behind a guard: GRAB CHARACTER (and BACK TO GAME). Other
  takedowns: one named row, a knockout (Takedown; Drop attack; Pull over ledge; Pull through window; Choke); no KNOCK OUT
  / KILL rows, the close attack is RT's strike (anim-rework S1, M3: holstered, RT tap the knockout, RT held
  `STANCE.rtHold` 0.35 s the kill; KBM LMB the same, Z the knockout); a guard who only falls to a lethal one gets no row. Michael: "It shouldn't have kill/knock out/carry in the list", "The guard cannot be let go
  either, only knocked out. Killed, or used as human shield (aiming pistol)", "There is no back to game option once
  the grab is initiated."
- Built dark (context-prompts, Michael 2026-10-27, pick 2 "Tap knocks out, hold kills"; `docs/context-prompts/BRIEF.md`
  A4-A6, A16, A17): under `contextPrompts` the takedown on offer is a button prompt above the guard's head, not a row
  (the model and the tap / hold timing: input-and-loop.md "Context prompts"). Behind a guard on two legs: tap A grabs
  (on the press; no hold version, so `grabToggle` keeps A's hold). A guard you face (front, side, over cover, corner,
  above, drop, below, window, inverted): tap A the named knockout, hold A the kill, restoring G43's tap / hold for every
  non-grab takedown; a lethal-only offer shows only "hold Kill". A held guard: tap A interrogates (only with
  information); nothing lets him go (G204). The hanging player's guard below: tap A grabs. The partner's hostage: tap A
  is the team takedown, tap Y bluffs with joint information (the Y rule). RT and LT are unchanged and named on the
  prompt (RT tap knock out / hold kill, holding a guard LT the shield; hanging, RT Choke / hold Neck snap). In a team
  move or offer the takedown on offer keeps A over the item in reach.
- Built (G42, G155; loco M20 Q4 / Q4b, M25 (5)): the close strike is a palm strike, a one-hit knockout from any side on
  every human guard, aware or not, heavies included, never a dog (`src/game/elbowStrike.ts` `resolveStrike`,
  `strikeTargetable`; no stagger). Campaign co-op missions have no heavies or dogs (G155); Sector Ops has dogs and
  armoured late guards (G297, G307; ai.md "Decided direction"). The numbers are in "Palm strike" below; the CT footage
  numbers are starting values Michael tunes by hand (G356). Decided, not built yet (G396, "About 1.4 s"): recovery
  about 1.4 s (code: `STRIKE` recovery 0.6 s).
- Dogs (G348, Sector Ops): no takedown of any kind; sleeping gas knocks a dog out; a dog can be distracted; killing one
  carries a penalty. Built: no palm strike (`strikeController.ts`); no takedown offer of any kind, the co-op team
  takedown too (`TakedownController.find` skips `def.quadruped`; puppets carry it, so clients too), and the co-op host
  denies a client's `td` start on a dog (`coopHost.ts` `onTakedown`); gas knocks out every enemy, dogs too
  (`GadgetSystem`). The penalty (guard-rules S1, Michael Q9, G374): a killed dog counts as a kill (no Perfect) and
  costs score (`game/modes/score.ts`); a gassed one costs nothing.
- G52's dedicated dual takedown is gone (G180): CT's double takedown is two ordinary takedowns timed together. The
  host counts each pair within `DUAL_WINDOW` 1.5 s (`StealthRating.duals`, `dualTakedown` event;
  `game/dualTakedown.ts`) as section-rating's input (spare 12).
- Interrogation is part of the grab (G23); its spec is `docs/systems/ct-toolkit.md` 3.9 (not built).

## Takedowns
- `game/takedown.ts` (pure, `TAKEDOWN`: ground reach 1.8 m, over low cover 1.9, from above a 1.1-4.6 m drop within 2.2 m,
  from below 1.4, through a window 1.7): `pickTakedown(input)` -> kind (`behind` / `front` / `side` (calm only) / `corner`
  / `overCover` / `above` / `below` / `window` / `drop` / `inverted`) + aligned attacker spot, facing, approach (with
  `arc`), strike, optional `victimTo`; `approachPoint`; `lethalFromHold`. Drop and inverted takedowns from attached
  states: `docs/systems/movement.md`.
- `game/takedownController.ts`: each fixed step (after traversal) finds the offer (enemies within 5 m, never a dog, the
  nearest 3 tried, one line of sight ray each; attacker state from traversal / window hint / back-to-wall) and shows the
  `takedown` world prompt; the interact press starts it (`holding` decides lethal after `lethalHold`). `grabRule`
  (`ai/archetypes.ts`) makes a frontal enforcer impossible; a heavy gets no rule today ('ok': `takedownController.ts`
  ~:353, G155 has no heavies in the missions), so `offer.lethalOnly` stays off for him. Running:
  `controller.override.kinematic` along the path, `Enemy.beginTakedown` / `holdAt` / `releaseTakedown` (brain off,
  struggle pose), `pose.melee` strike, `reachL/R` on the victim, weapon stowed; damage aborts;
  finish = `applyDamage` (lethal) or `knockOut`, noise.
- Back-to-wall states: `wall` / `wallLow` (from `WallCore` phase `on`). `wall` with a guard past the outside end gives
  `corner`; in front of the face an ordinary `behind` / `front` / `side`; behind the wall plane (> 0.2 m) nothing.
  `wallLow` gives `overCover`.
- Takedowns skip a guard at level alert while the attacker is spotted (`GameState.spottedLocal`; host check on a client's
  `td`, `PF.spotted`).
- GameState order: the hold-A menu runs first (`contextMenuStep`; A is `interact`, `src/input/padBinds.ts` ~:41, KBM
  E), so the takedown is a row of it, not a button of its own; Y is jump / traverse. Under `contextPrompts`
  `contextPromptStep` runs in its place and the takedown is A on the guard's prompt. A takedown or strike in progress
  makes traversal stand aside (`gameState.ts` ~:1890) and blocks the team move (`teamController.ts` ~:672).
- Co-op: the host approves a client's takedown (`td`); details in `docs/systems/coop.md`.

## Grab and hostage (3.2.0 phase 4; CT prototype G7)
- `GRAB` (G7, AUDIT-WALLS rows 5, 11: `approach` 0.42 s step-in, `pull` 0.6 s pull-in, `speedCap` 0.75 m/s, hostage held
  `hold` 0.32 m in front and `side` 0.1 m to her left (her feet between his), `killTime` 0.5 s; sidearm spread x1.2,
  guards hesitate 1.5 s; `GRAB.shoveStagger` is unused, the shove is gone), `GRAB_KINDS` (`behind`),
  `contactDelay` (when the victim's struggle starts: the plan's approach, derived from where the attacker stands,
  so the co-op host poses a client's victim alike). `TakedownController` grab (`active.grab`): stage 0 the
  step-in (kinematic override, `crouch: false`, the legs step from the measured speed: `pose.freeGait`), stage 1 the
  pull-in (the guard eased from where he stood to the hold, turning to the operator's facing), stage 2 `hold` (no
  override, `speedCap` min(gear, 0.75), the hostage at `holdAt` with the 2 cm sway, `setSolid(false)`, `holdAsHostage`).
  While held (`menuReady`: held, no finisher or interrogation running; G5, Michael 08:10-08:25; anim-rework S1, M3): RT
  held (not aiming) is Kill (0.5 s, the elbow arc), an RT tap (or KBM Z) is Knock out (`CQ.koTime` 0.85 s: the guard
  limp, lowered through his crouch, the operator bent over him, `holdPose('ko')`), LT / RMB aims the pistol over his
  shoulder (the human shield; RT then fires); hold-A lists
  only Interrogate (1.5 s, the left hand to his jaw, `holdPose('interrogate')`; the hold goes on after) and only for a guard
  with information (`grabMenu.hasInfo`, `src/ai/guardInfo.ts`: `Enemy.info`, set from the squad slot's `info`; a guard
  with none, or already asked, shows no menu), with no BACK TO GAME. (PR 3) Marlow Yard's station 1 has one such guard
  (`GUARD_SLOT`, passive): the interrogation spends his information (`takeInfo`) and he says his one or two lines as
  bark + subtitle (`GUARD_INFO_GAP` apart, `GrabState.talk`; he stops if he is knocked out or killed first); a scripted
  Interrogate on a guard with none ends in the feed line "Interrogated: nothing new" (host and solo only; a co-op client stays silent and gets the host's feed). Host-side: the co-op client's puppet
  takes the same slot's lines by where it first appears (`infoAtSpawn`), the interrogation runs on the interrogator's
  machine. (stealth-pays client intel) Whether the puppet offers INTERROGATE is the host's `EnemyState.in` flag (coop.md
  "Guard intel"), so Sector Ops guards, revived guards and rejoins work and a spent guard stops offering it.
  (spare 9, interrogation intel) A guard with information also gives intel when the interrogation ends (`intelReveal.revealIntel`,
  pure part `game/intel.ts`): `Code: <label>` per authored code (`GuardIntel.codes`, flag to `GameMode.onIntelCode`), then
  `Cameras near: n, sweep a-b s` and `Patrols near: n, loop a-b s` within `INTEL.reach` 30 m on his storey (patrol lines read each
  guard's route through the Guard AI `Enemy.patrolRoute` getter, `intelGuard`). Feed lines (<= 60 chars), event `intel`; a guard with none: unchanged. One use per guard per bay start (a restart spawns a fresh guard).
  (stealth-pays S1, S2) Part B: the code flag now acts. Course: `CourseMode.onIntelCode` sets it as a course flag
  (`state.setFlag`; a gate reads it when it lists the flag in `def.externalFlags`; a bay restart drops it). Sector Ops: the
  spawn copies the slot's `info` onto the guard, and `SectorMode.onIntelCode` holds the code for the live section
  (`SectorCodes.grantCode(flag, run.index)`, host only), so the matching keypad opens; the section's restart drops it.
  Host / solo only (a puppet never reveals). Play is unchanged until map owners author guard `info` codes; no Sector map has any yet.
  There is no let-go (the shove is removed): the hold ends only in the knockout or the
  kill, or cleanly when the holder dies, the guard dies to something else (`abort`) or the match restarts (`reset`; a
  co-op host still frees a client's guard when that client drops out or the section restarts). Carry (the knockout,
  then the body lift) and the Force to device stub are not rows: scripts reach them through `grabMenu.sel` (the next A
  press runs the armed pick); a knocked-out body is picked up by its own PICK UP BODY row. Counters in `grabs`.
- Poses (`game/closeQuarters.ts`, pure): `GuardCq` writes the held guard's upper body (seized, hostage with a 0.4 s flail
  every 2-4 s, the knockout's limp, the interrogation) with a fixed joint set and a 0.25 s blend between modes, on the
  host / solo `Enemy` and a client's `EnemyPuppet` alike; the held guard's gun is hidden while taken and his gait runs
  from his held speed. The operator's hands: `holdHandTargets` (the left forearm across his throat, the right hand on his
  right shoulder; a drawn sidearm keeps the hand on the gun), remotes `holdHandsLocal` (body frame, no guard rig). The
  bend over him: `TakedownController.bend` / `bendDrop` / `sway` -> `PlayerPose` -> `AnimInput.bend` (eased in the graph).
- Bodies (G7, AUDIT-WALLS rows 6-8): `StealthSystems` picks up through a 2.0 s committed lift (`liftCurve`: step in to the
  chest, crouch with the hands under its shoulders to 0.8 s (crouch lets go), the hoist to the shoulder to 1.6 s,
  settled at 2.0 s; rig-pose-fix S5: the step-in target is the body's sim lie, `Body.lieChest`, the hands still read its drawn
  shoulders); the shoulder is the side the head lies (`bodyLie.carrySide` from the lie's head yaw: a right-shoulder hoist of a body lying head to
  the left swung its head through the carrier's back). `ai/carryPose.ts` poses the fresh carried rig (lying, the hoist
  pivoting at the hips with a 0.3 m bow out in front, the socket, the slide off). Carry: `BODY.carrySpeed` 0.8 m/s, bent
  0.38 rad; while carrying the interact is a hide spot, else a door in reach the operator faces (open / close only),
  else "Drop body": a 0.8 s put down (`dropCurve`: the slide off to the side, the ragdoll at 0.4 s with a push of at most
  3 m/s). `dropCarried` stays the instant drop (restart, carrier down). Tests: `tests/g7CloseQuarters.test.ts` (timelines
  and NullEngine clipping checks of the hold and the hoist), e2e-takedown `grab`, e2e-stealth-ai `carry`.
- While holding: the sidearm comes out one-handed (`attachSpread`); `localRef.shield` makes `Enemy.tryFire` hesitate, then
  aim at the head; rays include `G.ENEMY_HITBOX`, and a hit on the hostage is `HitInfo.shieldHit`.
- Net: MoveState mode `grab` (`tid`; G7: `ph` the finisher's / interrogation's progress, `sub` bit 1 the kill, bit 2
  interrogating, the same fields, PROTOCOL_VERSION unchanged); `CoopHost` keeps a client's seized guard at their offset
  and `ref.shield` and lowers / turns him from `ph` / `sub`; `RemoteAvatar` poses the hold hands and the bend from them.
  The carry has no MoveState: (coop-carry) the body item's carrier (`NetItem.by`) shows it on a partner's shoulder, and a
  client carries through the same `game/bodyCarry.ts` (`docs/systems/coop.md`, body carry).
- (coop-walk-fixes P6) Team takedown: a guard the partner holds as a hostage is offered to the other player from the
  ground or a wall (`assistPlan`: `TAKEDOWN.reach` / `dy`, line of sight, any side; not the `taken` / combat rules),
  row TEAM TAKEDOWN. The attacker stays put facing him for `TAKEDOWN.strike` (the row: a knockout; a held direct press: the kill);
  the guard is never seized or moved by him; the partner letting go first ends it. The host applies it and ends the
  hold; holder and striker are credited together (a dual takedown). Net: `docs/systems/coop.md` (client takedowns).
- (joint-interrogation, G148) Joint interrogation: on the same `assist` offer, a guard with joint information
  (`GuardIntel.joint`, `hasJoint`) lists BLUFF (row kind `joint`) above TEAM TAKEDOWN. Roles: the holder reads his face
  (the existing INTERROGATE, `CQ.interrogate` 1.5 s); the partner bluffs (speech only: no pose, no strike, no lock; the
  bluffer may walk, A3). Either order works: only the read's end is checked, on the host: a bluff started at most
  `JOINT.window` 6 s before by a player other than the holder, alive and within `JOINT.reach` 3 m, adds the joint lines
  for both (`revealJoint`). A1: one chance, a solo read spends the joint part too (`takeInfo` clears `info`). A2: the
  holder's RT finisher stays live during a bluff and ends the questioning. A4: the holder's row stays INTERROGATE. Net and
  host rules: `docs/systems/coop.md` (client takedowns). Pure rules: `src/game/jointInterrogation.ts`,
  `tests/jointInterrogation.test.ts`; e2e-coop "joint interrogation: host bluffs, client reads".

## From the co-op hang-down (hang-down job; `docs/archive/hang-down/BRIEF.md`)
CT 1.5 Drop Line: the hanging player can grab and neck-snap a guard below (the only grab entry while hanging) and use
the pistol. Live only while hanging settled (`TeamController.hangActs`); lowering, the pull-up and the drop offer nothing.
- Attacker state `hangDown` (`TakedownController.attackerState`, before the wall / attach checks); `pickTakedown` kind
  `hangDown`: the input's `ay` is the hanging HEAD (the rig root less `HANG_HEAD`); in reach when the guard's neck
  (`HANG_GRAB.neck` 1.5 m over his feet) is 0.75 m under to 0.35 m over the head and within 0.9 m across
  (`TAKEDOWN.hangReach` / `hangBelow` / `hangAbove`, `hangInReach`); any awareness or facing; line of sight from the
  head; no dog; no archetype rule (from over the head). The body never moves: the team move keeps its override (the
  takedown's `release` clears only its own).
- The grab (A1, A3): the hold-A menu works while hanging by a guard (rows: GRAB CHARACTER for the guard in reach, the
  item in reach); with no guard on offer or held, A uses the item in reach directly as before (A9: press uses it, a
  hold fills a hold item; `GameState.hangDirectA`, one consumer of A per step); under `contextPrompts` both are prompts
  (`[A] Grab` on the guard, the item in reach on A, "Pull me up" on the holder) and `hangDirectA` stays off;
  `GRAB_KINDS` holds `hangDown`. `runHangGrab`: the hands reach down (`HANG_GRAB.reach` 0.3 s, his
  struggle from there), he is lifted to them (`HANG_GRAB.lift` 0.5 s; `hangHoldPoint`: `HANG_GRAB.hold` 0.3 m out along
  the way to him, his neck `HANG_GRAB.hands` 0.35 m under the head, at most `liftMax` 0.6 m off his floor, following the
  holder's depth), then held with the held rules: RT tap / KBM Z knock out (`CQ.koTime`, let down limp onto his floor),
  RT hold kills (the neck snap, `GRAB.killTime`), INTERROGATE when he knows something, LT aims the pistol (shield); no
  let-go, no carry (a carry pick is a plain knockout). (A4) The hang ending while he is held (the holder pulls up or
  lets go, the hold lost) knocks him out at once ("KO by default"). Event kind `hangGrab`.
- The neck snap (A5): RT on the guard in reach, holstered (any stance while hanging) and not aiming: tap the choke
  (knockout), held (`STANCE.rtHold`) the neck snap (lethal); KBM LMB the same, Z the choke (`GameState`, before the
  takedown step, `grabTriggerPick`). The ordinary takedown run with kind `hangDown` (`HANG_GRAB.strike` 0.6 s; the guard
  pulled to the hold point; no elbow arc, `pose.melee` -1, no kill tail; the hands on his neck by the takedown's reach
  IK). The hang ending mid-way ends it as decided (a knockout when not yet decided). The palm strike never runs from the
  hang.
- The pistol (A6): hanging, LT draws the sidearm one-handed (never the rifle) with the inverted pipe's aim
  (`Player.attachAim` inverted, the `PIPE` band and spread, the aim yaw the chest's: the facing + PI) and the camera
  frames the hanging head (`inverted` framing); RT fires; RB while aiming is the jammer (G212), so no pull-up then.
- Co-op: `docs/systems/coop.md` (hang-down). Tests: `tests/hangDown.test.ts`, `tests/hangDownTakedown.test.ts`,
  `tests/hangDownNet.test.ts`; e2e-coop "hang-down" (the joiner hangs: pistol, menu grab + Z, RT held neck snap, the
  host's pull-up knocks the held guard out).

## Palm strike (locomotion step 10; the files keep the old elbow names)
The close strike of G42 / G155; this is the build.
- `fire` pressed while holstered (draw phase 0, not aiming), on the ground and not attached, traversing, in a takedown,
  team move, reload or carrying a body: `StrikeController` (`game/strikeController.ts`), pure rules in
  `game/elbowStrike.ts` (`STRIKE`: reach 1.3 m, cone 140 deg, contact 0.08 s, recovery 0.6 s, noise 4 m; 0.68 s
  in all, a whiff 0.38 s; contact reach +0.3 m for the local player, +0.8 m host slack for a client's).
  Target: the nearest live, unseized guard in reach and cone; none is a whiff. Movement capped to gear 1; the body turns
  to the target at the press.
- `resolveStrike` always returns KO: any side, aware or not, heavy or not; no stagger. A guard in reach and cone is
  knocked out through `Enemy.knockOut` with kind `melee` (`takedown: 'strike'`); the local player's RT / LMB held (the
  lethal strike) kills through `killOutright`. A dog is never a target (`strikeTargetable`). Event `strike {result}`.
- Solo and the co-op host start it at once; a client asks the host (`cmove`, kind `strike`, the only committed-move kind).
  Contact is resolved only where the guards live, at t0 + 0.08 s, re-checking reach and cone.
- Pose: MoveState `strike` (`ph`, `tid`) -> `poseFromMoveState` `melee` -> the anim graph's elbow arc.
  `PlayerWeapons.handsBusy` blocks the draw, so the local rig and remotes pose from the same inputs (D8). The lethal
  takedown blow and the grab kill share the arc. (anim-n4c / n4d, Michael M1 "Faster arm") Each move's arc is warped
  so its visual contact lands on its gameplay moment (`strikeWarp` / `killWarp` in `src/anim/strikeBody.ts`): the
  strike's elbow lands at `STRIKE.hitAt`; the takedown blow and the grab kill land at their kill, then a pose-only
  follow-through plays (`TakedownController.killTail`). The wire keeps the raw phase; both sides warp.
- Tests: `tests/elbowStrike.test.ts`, `tests/committedMoves.test.ts`; e2e-pad, e2e-mouse, e2e-takedown, e2e-netmove
  (`strike`, `denied`), e2e-coop; anim-audit scenario `strike`.

## Knife kills (piano scene; piano-knife S1, S2, S3, `docs/piano-knife/`)
- Gate (BRIEF A1): `knifeSceneOn(flagOn, scene, live)` in `src/game/knifeKill.ts` is true only with Campaign's
  `pianoEscape` flag on, the map's `scene` `'piano'` and the scene switch live. Campaign's `pianoScene.ts` is the only
  caller of `TakedownController.setKnifeScene(on)` (on: the clips start loading by dynamic import). Off (the default)
  every takedown is exactly today's.
- Switch on (A2; Michael ~20:05 "Palm strike knockout disabled, only knife kills"): every takedown on a guard on two
  legs is a lethal knife kill on one press. No grab row (`takedownRow`), no tap / hold, no RT palm strike
  (`gameState` passes no strike start). The knife (`PlayerWeapons.knife`) shows from the press until the attacker is free.
- The attack press (knife-attack, Michael's walk 2026-10-27): holstered, RT / LMB (or Z) is the knife kill on the guard
  on offer (`GameState.knifeAttack`, the same `start` as the takedown row); none in reach: the cue "Knife ready: get
  behind or beside a guard", no free slash.
- Context prompts (`contextPrompts`, dark; BRIEF A19): every guard on two legs on offer shows `[A] Knife takedown` (it
  runs on the press, so a tap or a hold) and `[RT] Knife takedown`; no grab; the partner's hostage keeps
  `[A] Team takedown` (`start` exempts `assist`). Y follows the Y rule as anywhere (input-and-loop.md "Context
  prompts").
- Rows (`KNIFE_KILLS`, wire order `behind`, `behindLow`, `corner`, `front`; `pickKnifeKill`): behind (crouched: the rise),
  corner / overCover, front / side. Other kinds, a victim without `knifeVictim` (a co-op puppet until S3) or clips not
  loaded yet: the -1 path (today's lethal move, knife shown). The pairs (S2, Michael's Mixamo downloads in
  `src/anim/clips/mixamo/piano/`, loaded only from `setKnifeScene(true)`): behind `stabbing` + `falling_forward_death`,
  behindLow and front `stabbing` + `dying`, corner `standing_melee_attack_downward` + `falling_back_death`. The move is
  1.5 s (A15); the attacker clips are 2.1-2.6 s, so each row plays its clip's window (`attackerFrom` .. `attackerTo`)
  around the stab at the clip's own speed. The rows' timing, windows, `victimTo`, `standoff` and `side` are measured
  (`tests/knifePairFit.test.ts`, KP_FIT=1, one run on 2026-10-26; behindLow and front from one focused try after it).
- Pairing (A14, `src/game/knifePair.ts`): from the grab (the approach's last `gripIn` share) the guard's root and facing
  are set from the attacker's current root every fixed step (`victimRoot`) and again every render frame from her drawn
  root (`TakedownController.frameLate`, after the player poses and before the enemies; `Enemy.frame` then leaves his
  root). Both clips run on one clock through `KillDrive` (`src/anim/killDrive.ts`, `AnimGraph.kill`), the guard's with a
  buckle on spine and chest from the stab. Hand IK: her left hand on his mouth (from behind) or shoulder, the knife
  tip (`KnifeModel.tipWorld`) on kidney / neck / chest from the stab, his hands on her left forearm.
- Contact rule (bible 5.12.2): grip, knife tip and his palms within 3 cm (`KNIFE.contactTol`) of their marks while in
  contact, measured every frame by `tests/knifePair.test.ts` (the attacker walking and turning). The real pairs still
  miss it on most rows: the test's `KNOWN_MISS` holds each at its measured maximum (5.5-9.7 cm, accepted until Michael
  plays, BRIEF A16); the corner row's grip and the guard's left palm (about 17 cm) are over A16's 10 cm ceiling
  (`OVER_CEILING`, the lead's call).
- Noise and body (A5, A6): at the row's `limp` the guard dies (`applyDamage`, the ordinary body and ragdoll), noise
  `KNIFE.noise` 1.2 m (S2: the -1 path too, every piano kill is quiet), the `takedown` events carry `knife: true`,
  counted as `done.byKind.knife`. Damage to the
  attacker before the stab aborts (both drives and hands off, the knife away); after it the kill finishes at once. The
  attacker's clip window plays to its end and blends out before she is free (no offer meanwhile;
  `TakedownController.busy` stays true, so `gameState` keeps her gun stowed and traversal off until then).
- Studio: the `pair: knife <id>` rows play Wren and a guard through the same code (`studioStage.knifeFrame`).
- Side kill (S3): the row by his facing (his back more towards her: behind / behindLow, else front), the grab eased from
  his real facing (`kFromYaw = e.yaw`): at most a 90 degree turn.
- Co-op (S3; Q39 / G400 "players must look exact in everyones games"):
  - The host's gate (`CoopHost.onTakedown`): a client's `td` start with `kind: 'knife'` seizes only while the host's own
    switch is on (the lethal struggle); with it on, any other start (assist included; a bluff is speech) is denied, and
    `done` is always a kill (never a knockout) at `KNIFE.noise`. With the switch on the host also refuses every RT strike
    (`cdeny` `busy`, no `strikes` entry) and the partner throw's knockout (`throwKnockOut`). So no guard is knocked out in
    the scene.
  - The wire (no new message or field): `td.kind` `'knife'` on start, done and abort from a client whose switch is on
    (`tdOut`); MoveState `takedown` `sub` bit 2 `TAKEDOWN_SUB_KNIFE` (the knife shown) with the row in bits 4-16
    (`knifeSub` / `knifeRowOfSub`; 7 `KNIFE_ROW_NONE`: the move without a row, today's blow bit and phase), `ph` the move's
    phase over `knifeSpan` (the move and its tail), `s` the approach's progress (`localMoveState`, the tail too).
  - The remote pair (`src/net/remoteKnife.ts`, one per `RemoteAvatar`): the attacker's clip window, the knife in her hand
    and her hands on the guard as drawn on that screen; the guard (`EnemyPuppet.knifeVictim` on the client,
    `Enemy.knifeVictim` on the host) attached to her drawn root with his clip, buckle and hands. On the host the victim
    of a client's kill poses one frame behind (the enemies pose before `net.frameUpdate`), and its seized step `holdAt`s
    him on the drawn pair (his body lies where he fell). Every pin clears on every end (done, abort, deny, release,
    death, dispose, the wire leaving the knife state).
  - The double: two ordinary knife kills inside `DUAL_WINDOW` raise the dual takedown as any two takedowns.
- Tests: `tests/knifeKill.test.ts`, `tests/killDrive.test.ts`, `tests/knifePair.test.ts` (harness `tests/helpers/knifePairRun.ts`),
  `tests/knifePairFit.test.ts`, `tests/knifeTakedown.test.ts`,
  `tests/takedownAlloc.test.ts` (a knife run allocates nothing per step), `tests/grabMenu.test.ts`, `tests/knifeWire.test.ts`
  (S3: the wire, the host's gate, the puppet, the double, remote parity).
