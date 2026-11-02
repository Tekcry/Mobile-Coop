# Mixamo characters, slice h: team moves, and timed moves that actually move
- Fix: moves pinned to the game's progress (climb-up, mantle, vault, hop, roll, strike, knife, throw) stood on a single
  frame: a clip pinned at play rate 0 is put back by Babylon's next animation step. Now pinned at a near-zero rate, the
  frame follows the move. `scripts/e2e-mixamo-actions.mjs` checks it (the climb-up's hips move with its progress).
- Team moves on the Mixamo body (provisional picks, tune by eye): the leg-up, partner throw and lifting kit moves'
  holder crouches with the hands low while offering, then rises and stands with the move ("Lifting Object", its put-down
  skipped); the hang-down and pull-up holder leans back braced ("Pull Heavy Object"); the rope and swing holder hauls
  ("Pulling A Rope"); the rope climber climbs ("Climbing A Rope"). The team pose passes its move, role and clock on the
  rig pose (`teamMove`, `teamRole`, `teamK`). The holder's hands do not reach for the partner yet (the old rig's reach is
  not on the Mixamo body).
