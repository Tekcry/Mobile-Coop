# Takedowns
> Status: Mark & Execute removed (locomotion 01). Takedowns, grab and human shield stay.
Purpose: takedown kinds and controller.
Design authority: docs/design-bible.md (Section 5.4)

## Takedowns (2.0 phase 4)
- `game/takedown.ts` (pure, `TAKEDOWN`): `pickTakedown(input)` -> kind (`behind` / `front` / `side` (calm only) /
  `corner` / `overCover` / `above` / `below` / `window`) + aligned attacker spot, facing, approach (with `arc`),
  strike, optional `victimTo`; `approachPoint`; `lethalFromHold`.
- `game/takedownController.ts`: each fixed step (after traversal) finds the offer (nearest enemy
  within 5 m, one LOS ray; attacker state from traversal / window hint), shows the `takedown` world
  prompt; the interact press starts it (`holding` decides lethal after `lethalHold`; touch `touchPress`). Running:
  `controller.override.kinematic` along the path, `Enemy.beginTakedown` / `holdAt` / `releaseTakedown` (brain off,
  struggle emote), `pose.melee` strike, `reachL/R` on the victim (frame update), weapon stowed; damage (hp +
  shield) aborts; finish = `applyDamage` (lethal) or `knockOut`, noise.
- GameState order: busy (takedown from the last step) blocks traversal's jump and the team move; Y is a
  takedown when offered, else interact / traverse.

## Elbow strike (locomotion step 10, bible 5.4)
- `fire` pressed while holstered (draw phase 0, not aiming) on the ground, not attached, traversing, in a takedown,
  team move, reload or carrying a body: `StrikeController` (`src/game/strikeController.ts`), pure rules in
  `src/game/elbowStrike.ts` (`STRIKE`: reach 1.2 m, cone 90 deg, contact 0.5 s, recovery 0.4 s, stagger 1.0 s, noise
  4 m; 0.9 s in all). Target: the nearest live, unseized guard in reach and cone; none is a whiff (recovery still
  exposed). Movement is capped to gear 1; no root motion; the body turns to the target at the press.
- `resolveStrike`: unaware (any side) KO; aware from the side / behind (facing dot <= 0.5) KO; aware facing stagger
  (`Enemy.strikeStagger`, breaks aim); a second strike on a staggered guard KO; a heavy from the front only staggers.
  KO goes through `Enemy.knockOut` with kind `melee` (`takedown: 'strike'`). Event `strike {result}`.
- Solo and the co-op host start it at once; a client asks the host (`cmove`, `docs/systems/coop.md`). Contact is
  resolved only where the guards live, at t0 + 0.5 s, re-checking reach and cone.
- Pose: MoveState `strike` (`ph`, `tid`) -> `poseFromMoveState` `melee` -> the animGraph elbow arc (hand sweep round
  the shoulder with the hip turn, left hand up as a guard; the rig lifts the right elbow's pole by `meleePoleW`). The
  strike does not use the attach stow (its held swap overlay is local only): `PlayerWeapons.handsBusy` blocks the draw
  instead, so the local rig and remotes pose from the same inputs (D8). The lethal takedown blow shares the arc.
- Touch: the Fire button is shown holstered and strikes (D1). Tests: `tests/elbowStrike.test.ts`,
  `tests/committedMoves.test.ts`, e2e-pad / e2e-mouse / e2e-takedown / e2e-netmove (`strike`, `denied`) / e2e-coop;
  anim-audit scenario `strike` (local 60 / 120 Hz, remote).

