# Step T8c - the bot as your course partner (Block D)

Model: implementer opus, checker opus (src/net, dev only). Deps: T8b and TM (the locomotion bot partner, loco 20).

## Read
- DECISIONS.md D21, D35; the bot partner's doc and code from loco 20 (grep `bot` in docs/systems/coop.md and
  docs/systems/testing-tools.md after TM; `scripts/e2e-bot.mjs`)
- src/game/course/courseState.ts (next drill per player, gates), src/game/modes/courseMode.ts, src/ui/hud/courseHud.ts
- The debug overlay's menu (grep `setTeleports` and the overlay's toggles in src/ui)

## Task (decisions)
1. `src/net/courseBot.ts` (dev only, behind flags.coop and the dev build, never imported by single player): drives the
   loco 20 bot as P2 through the course: reads P2's open drills and its half of each gate from the course state and
   issues the bot's commands (go to a point, perform a verb, brace / boost / ladder, hold a switch, wait for the Sync
   count, revive the player). A drill the bot cannot perform yet is logged, never ticked for it (D30).
2. Debug menu toggle "Bot partner (course)": starts the course as host with the bot joined as P2 over the local transport;
   the HUD's P2 column shows the bot's ticks; the bot never speaks (no voice; its radio lines are text).
3. The bot follows the player between drills, waits at airlocks, and takes its role per the swap rule (C3).

## Tests
`scripts/e2e-bunker.mjs` section "bot": the player page plus the bot completes B1-B4 (the movement and team-move bays)
with every P2 drill ticked by the bot; a B9 run where the bot does its sync-moment half on the count.

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-coop e2e-netmove`. Grep proof: courseBot is
not reachable from a static import chain of src/main.ts.

## Commit
"training T8c: the bot as a course partner from the debug menu". Docs: docs/systems/coop.md (dev bot in the course),
TESTING.md (how to play the course with the bot), LOG, STATE.
