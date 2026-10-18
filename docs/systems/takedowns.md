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

## Grab and hostage (3.2.0 phase 4)
- `GRAB` (gear 2 cap, hostage held 0.42 m in front, sidearm spread x1.2, shove stagger 1 s, guards hesitate 1.5 s),
  `GRAB_KINDS` (`behind`). `TakedownController` grab (`active.grab`): approach, `hold` (no override, `speedCap` at gear 2,
  the hostage at `holdAt`, `setSolid(false)`, `holdAsHostage` pose). A fresh press decides tap (knock out) / hold (kill) ->
  `GRAB_STRIKE`; `gameplay.grabToggle` false makes letting go knock out (A70, `grabDecides`); `shovePressed` ->
  `releaseTakedown(GRAB.shoveStagger)`. Counters in `grabs`.
- While holding: the sidearm comes out one-handed (`attachSpread`); `localRef.shield` makes `Enemy.tryFire` hesitate, then
  aim at the head; rays include `G.ENEMY_HITBOX`, and a hit on the hostage is `HitInfo.shieldHit`.
- Net: MoveState mode `grab` (`tid`); `CoopHost` keeps a client's seized guard at their offset and `ref.shield`.

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
