# Takedowns
Owner: Player Build. Status: current.
Purpose: takedown kinds, the grab and hostage, and the close strike.
Design authority: docs/DECISIONS.md (G23, G42, G43, G49, G180, G348), then docs/design-bible.md (Section 5.4).

## Decided direction
- Built (G43, G23; ct-prototype G5 with Michael 2026-10-20 08:10, 08:20, 08:25): every takedown on offer is a row of
  the hold-A action menu (`src/game/contextMenu.ts`). Behind a guard: GRAB CHARACTER (and BACK TO GAME). Other
  takedowns: one named row, a knockout (Takedown; Drop attack; Pull over ledge; Pull through window; Choke); no KNOCK OUT
  / KILL rows, the close attack is RT's strike (anim-rework S1, M3: holstered, RT tap the knockout, RT held
  `STANCE.rtHold` 0.35 s the kill; KBM LMB the same, Z the knockout); a guard who only falls to a lethal one gets no row. Michael: "It shouldn't have kill/knock out/carry in the list", "The guard cannot be let go
  either, only knocked out. Killed, or used as human shield (aiming pistol)", "There is no back to game option once
  the grab is initiated."
- Decided, not built yet (G42, loco M20 Q4 / Q4b, M25 (5)): the close strike is a palm strike, a one-hit knockout from any
  side on every human guard, recovery about 1.4 s. Campaign co-op missions have no heavies or dogs (G155); Sector Ops
  has dogs and armoured late guards (G297, G307; ai.md "Decided direction"). Code: the elbow strike below (aware facing
  guards and heavies from the front only stagger).
- Dogs (G348, Sector Ops): no takedown of any kind; sleeping gas knocks a dog out; a dog can be distracted; killing one
  carries a penalty. Built: no palm strike (`strikeController.ts`); no takedown offer of any kind, the co-op team
  takedown too (`TakedownController.find` skips `def.quadruped`; puppets carry it, so clients too), and the co-op host
  denies a client's `td` start on a dog (`coopHost.ts` `onTakedown`); gas knocks out every enemy, dogs too
  (`GadgetSystem`). The penalty (guard-rules S1, Michael Q9): a killed dog counts as a kill and costs score
  (`game/modes/score.ts`); a gassed one costs nothing.
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
- `game/takedownController.ts`: each fixed step (after traversal) finds the offer (nearest enemy, never a dog, within 5 m, one line of
  sight ray; attacker state from traversal / window hint / back-to-wall) and shows the `takedown` world prompt; the
  interact press starts it (`holding` decides lethal after `lethalHold`). `grabRule` (`ai/archetypes.ts`) makes a frontal
  heavy lethal only and a frontal enforcer impossible (`offer.lethalOnly`). Running: `controller.override.kinematic` along
  the path, `Enemy.beginTakedown` / `holdAt` / `releaseTakedown` (brain off, struggle pose), `pose.melee` strike,
  `reachL/R` on the victim, weapon stowed; damage aborts; finish = `applyDamage` (lethal) or `knockOut`, noise.
- Back-to-wall states: `wall` / `wallLow` (from `WallCore` phase `on`). `wall` with a guard past the outside end gives
  `corner`; in front of the face an ordinary `behind` / `front` / `side`; behind the wall plane (> 0.2 m) nothing.
  `wallLow` gives `overCover`.
- Takedowns skip a guard at level alert while the attacker is spotted (`GameState.spottedLocal`; host check on a client's
  `td`, `PF.spotted`).
- GameState order: a takedown in progress blocks traversal's jump and the team move; Y is a takedown when offered, else
  team move, traversal, interact.
- Co-op: the host approves a client's takedown (`td`); details in `docs/systems/coop.md`.

## Grab and hostage (3.2.0 phase 4; CT prototype G7)
- `GRAB` (G7, AUDIT-WALLS rows 5, 11: `approach` 0.42 s step-in, `pull` 0.6 s pull-in, `speedCap` 0.75 m/s, hostage held
  `hold` 0.32 m in front and `side` 0.1 m to her left (her feet between his), `killTime` 0.5 s; sidearm spread x1.2, shove stagger 1 s, guards hesitate 1.5 s), `GRAB_KINDS`
  (`behind`), `contactDelay` (when the victim's struggle starts: the plan's approach, derived from where the attacker
  stands, so the co-op host poses a client's victim alike). `TakedownController` grab (`active.grab`): stage 0 the
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
  hold fills a hold item; `GameState.hangDirectA`, one consumer of A per step); `GRAB_KINDS` holds `hangDown`. `runHangGrab`: the hands reach down (`HANG_GRAB.reach` 0.3 s, his
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
  IK). The hang ending mid-way ends it as decided (a knockout when not yet decided). The elbow strike never runs from the
  hang.
- The pistol (A6): hanging, LT draws the sidearm one-handed (never the rifle) with the inverted pipe's aim
  (`Player.attachAim` inverted, the `PIPE` band and spread, the aim yaw the chest's: the facing + PI) and the camera
  frames the hanging head (`inverted` framing); RT fires; RB while aiming is the jammer (G212), so no pull-up then.
- Co-op: `docs/systems/coop.md` (hang-down). Tests: `tests/hangDown.test.ts`, `tests/hangDownTakedown.test.ts`,
  `tests/hangDownNet.test.ts`; e2e-coop "hang-down" (the joiner hangs: pistol, menu grab + Z, RT held neck snap, the
  host's pull-up knocks the held guard out).

## Elbow strike (locomotion step 10)
To be replaced by the palm strike (G42); this is the current build.
- `fire` pressed while holstered (draw phase 0, not aiming), on the ground and not attached, traversing, in a takedown,
  team move, reload or carrying a body: `StrikeController` (`game/strikeController.ts`), pure rules in
  `game/elbowStrike.ts` (`STRIKE`: reach 1.2 m, cone 90 deg, contact 0.5 s, recovery 0.4 s, stagger 1.0 s, noise 4 m; 0.9 s
  in all). Target: the nearest live, unseized guard in reach and cone; none is a whiff. Movement capped to gear 1; the body
  turns to the target at the press.
- `resolveStrike`: unaware (any side) KO; aware from the side / behind (facing dot <= 0.5) KO; aware facing stagger
  (`Enemy.strikeStagger`); a second strike on a staggered guard KO; a heavy from the front only staggers. KO goes through
  `Enemy.knockOut` with kind `melee` (`takedown: 'strike'`). Event `strike {result}`.
- Solo and the co-op host start it at once; a client asks the host (`cmove`, kind `strike`, the only committed-move kind).
  Contact is resolved only where the guards live, at t0 + 0.5 s, re-checking reach and cone.
- Pose: MoveState `strike` (`ph`, `tid`) -> `poseFromMoveState` `melee` -> the anim graph's elbow arc.
  `PlayerWeapons.handsBusy` blocks the draw, so the local rig and remotes pose from the same inputs (D8). The lethal
  takedown blow and the grab kill share the arc. (anim-n4c / n4d, Michael M1 "Faster arm") Each move's arc is warped
  so its visual contact lands on its gameplay moment (`strikeWarp` / `killWarp` in `src/anim/strikeBody.ts`): the
  strike's elbow lands at `STRIKE.hitAt`; the takedown blow and the grab kill land at their kill, then a pose-only
  follow-through plays (`TakedownController.killTail`). The wire keeps the raw phase; both sides warp.
- Tests: `tests/elbowStrike.test.ts`, `tests/committedMoves.test.ts`; e2e-pad, e2e-mouse, e2e-takedown, e2e-netmove
  (`strike`, `denied`), e2e-coop; anim-audit scenario `strike`.
