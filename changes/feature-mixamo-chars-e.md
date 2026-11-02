# Mixamo characters, slice e: actions (hang, ladder, climb-up, strike, throw, carry)
- The Mixamo bodies play Mixamo action moves over their walking: hanging (`hang_idle`, shimmy left / right), the
  climb-up from a hang, the ladder, the takedown strike (elbow; a knife in hand stabs), the grenade throw, and carrying
  a body (its own move set: carry idle and walk). Timed actions (climb-up, strike, throw) are pinned to the game's own
  progress so the move and the gameplay end together; an action fades in and out over 0.12 s
  (`src/characters/actions.ts`, `pickAction`; `MixamoBody.update`).
- The packer also strips the vertical travel of the ladder and the climb-up (the traversal already lifts the body).
- Downloaded (Michael's Mixamo account): Hanging Idle, Braced Hang Shimmy (left, right), Freehang Climb, Climbing
  Ladder, Carrying (idle, walking), Male Elbow Punch, Male Knife Stab (rear hand, reverse grip), Throwing A Grenade
  While Walking, Laying While Breathless Idle (for the downed state, not wired yet).
- Not covered yet (the walk keeps playing): vault, mantle, step, drop, hop, roll, crawl, vents, pipes, windows, team
  moves, back to wall, downed. The hang and climb-up line-up on a real ledge is unchecked in play.
- New check `scripts/e2e-mixamo-actions.mjs` (each action picked with the pose held, back to the idle after);
  `tests/mixamoActions.test.ts`.
