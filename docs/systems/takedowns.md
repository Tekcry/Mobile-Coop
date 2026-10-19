# Takedowns
Purpose: takedown kinds, the grab and hostage, and the close strike.
Design authority: docs/DECISIONS.md (G23, G42, G43, G49), then docs/design-bible.md (Section 5.4).

## Decided direction
- Decided, not built yet (G43, G23): the ground takedown button grabs first; from CT's grab menu the player then chooses
  knock out, kill or (later) interrogate. No stealth / kill selector. Drop, ledge, window and pipe takedowns keep tap /
  hold. Code: a grab from behind exists (below); other ground takedowns decide by tap / hold at the press.
- Decided, not built yet (G42, loco M20 Q4 / Q4b, M25 (5)): the close strike is a palm strike, a one-hit knockout from any
  side on every human guard, recovery about 1.4 s; dogs cannot be palm-struck. How heavies are taken out follows the CT
  co-op research (G49). Code: the elbow strike below (aware facing guards and heavies from the front only stagger).
- Decided (G52): the dual takedown is one of the four co-op team moves; it waits for the co-op phase.
- Interrogation is part of the grab (G23); its spec is `docs/systems/ct-toolkit.md` 3.9 (not built).

## Takedowns
- `game/takedown.ts` (pure, `TAKEDOWN`: ground reach 1.8 m, over low cover 1.9, from above a 1.1-4.6 m drop within 2.2 m,
  from below 1.4, through a window 1.7): `pickTakedown(input)` -> kind (`behind` / `front` / `side` (calm only) / `corner`
  / `overCover` / `above` / `below` / `window` / `drop` / `inverted`) + aligned attacker spot, facing, approach (with
  `arc`), strike, optional `victimTo`; `approachPoint`; `lethalFromHold`. Drop and inverted takedowns from attached
  states: `docs/systems/movement.md`.
- `game/takedownController.ts`: each fixed step (after traversal) finds the offer (nearest enemy within 5 m, one line of
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
  `hold` 0.32 m in front, `killTime` 0.5 s; sidearm spread x1.2, shove stagger 1 s, guards hesitate 1.5 s), `GRAB_KINDS`
  (`behind`), `contactDelay` (when the victim's struggle starts: the plan's approach, derived from where the attacker
  stands, so the co-op host poses a client's victim alike). `TakedownController` grab (`active.grab`): stage 0 the
  step-in (kinematic override, `crouch: false`, the legs step from the measured speed: `pose.freeGait`), stage 1 the
  pull-in (the guard eased from where he stood to the hold, turning to the operator's facing), stage 2 `hold` (no
  override, `speedCap` min(gear, 0.75), the hostage at `holdAt` with the 2 cm sway, `setSolid(false)`, `holdAsHostage`).
  The CT grab menu (`menuReady`: held, no finisher or interrogation running) picks Knock out (`CQ.koTime` 0.85 s: the
  guard limp, lowered through his crouch, the operator bent over him, `holdPose('ko')`), Kill (0.5 s, the elbow arc),
  Carry (the knockout, then the body lift), Interrogate (1.5 s, the left hand to his jaw, `holdPose('interrogate')`, the
  hold and menu go on after; a neutral feed line until the level has lines); `shovePressed` ->
  `releaseTakedown(GRAB.shoveStagger)`. Counters in `grabs` (`interrogated` too).
- Poses (`game/closeQuarters.ts`, pure): `GuardCq` writes the held guard's upper body (seized, hostage with a 0.4 s flail
  every 2-4 s, the knockout's limp, the interrogation) with a fixed joint set and a 0.25 s blend between modes, on the
  host / solo `Enemy` and a client's `EnemyPuppet` alike; the held guard's gun is hidden while taken and his gait runs
  from his held speed. The operator's hands: `holdHandTargets` (the left forearm across his throat, the right hand on his
  right shoulder; a drawn sidearm keeps the hand on the gun), remotes `holdHandsLocal` (body frame, no guard rig). The
  bend over him: `TakedownController.bend` / `bendDrop` / `sway` -> `PlayerPose` -> `AnimInput.bend` (eased in the graph).
- Bodies (G7, AUDIT-WALLS rows 6-8): `StealthSystems` picks up through a 2.0 s committed lift (`liftCurve`: step in to the
  chest, crouch with the hands under its shoulders to 0.8 s (crouch lets go), the hoist to the shoulder to 1.6 s,
  settled at 2.0 s); the shoulder is the side the head lies (`carrySide`: a right-shoulder hoist of a body lying head to
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
  The carry has no MoveState (a partner sees no body on the shoulder, as before).

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
  takedown blow shares the arc.
- Tests: `tests/elbowStrike.test.ts`, `tests/committedMoves.test.ts`; e2e-pad, e2e-mouse, e2e-takedown, e2e-netmove
  (`strike`, `denied`), e2e-coop; anim-audit scenario `strike`.
