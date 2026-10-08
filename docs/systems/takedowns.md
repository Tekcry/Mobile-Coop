# Takedowns and Mark & Execute
> Status: Mark & Execute is removed in Phase 3 (bible 5.4). Takedowns, grab and human shield stay.
Purpose: takedown kinds and controller, the Mark & Execute system.
Design authority: docs/design-bible.md (Section 5.4)

## Takedowns and Mark & Execute (2.0 phase 4)
- `game/takedown.ts` (pure, `TAKEDOWN`): `pickTakedown(input)` -> kind (`behind` / `front` / `side` (calm only) /
  `corner` / `overCover` / `above` / `below` / `window`) + aligned attacker spot, facing, approach (with `arc`),
  strike, optional `victimTo`; `approachPoint`; `lethalFromHold`.
- `game/takedownController.ts`: each fixed step (after cover / traversal / corners) finds the offer (nearest enemy
  within 5 m, one LOS ray; attacker state from traversal / cover / window hint), shows the `takedown` world
  prompt; the interact press starts it (`holding` decides lethal after `lethalHold`; touch `touchPress`). Running:
  `controller.override.kinematic` along the path, `Enemy.beginTakedown` / `holdAt` / `releaseTakedown` (brain off,
  struggle emote), `coverPose.melee` strike, `reachL/R` on the victim (frame update), weapon stowed; damage (hp +
  shield) aborts; finish = `applyDamage` (lethal) or `knockOut`, `marks.earn()`, noise.
- `game/marks.ts` (pure) `MarkSet` (toggle, prune, earn, ready, consume) + `executeStep`; `game/executeController.ts`
  (mark under the camera's aim ray while `player.ads`, readiness at 4 Hz with LOS from the eye, the sequence:
  `loop.timeScale` `EXECUTE.slowScale` unless co-op, letterbox, `player.forceAds`, camera turned to each head,
  one lethal head shot each). HUD: `ui/hud/markers.ts` chevrons, `Hud.setCharge`.
- GameState order: busy (takedown / execute from the last step) skips cover and blocks traversal's jump; Y is a
  takedown when offered, else execute when ready, else interact / traverse.
