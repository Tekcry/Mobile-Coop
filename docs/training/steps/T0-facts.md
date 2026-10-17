# Step T0 - facts and baseline (Block A, read-only)

Model: opus for every agent. Code changes: none (docs/training and the CLAUDE.md resume line only).
Agents: three parallel Explore agents (a, b, c), then one checker. The orchestrator writes the files.

## Step 0 (orchestrator, before the agents)
1. Branch per BRIEF 0. `npm ci` (timeout 900).
2. `timeout 900 npm run check`: record lint / tests / build lines in STATE.md Baseline (failures there are pre-existing).
3. `timeout 900 npm run build && node scripts/run-e2e.mjs smoke`: record the summary line.
4. Perf trend: `node scripts/perf.mjs` (no --budget): record sim p95, anim ms/char, alloc, draws, tris.
5. Add one line under the title of CLAUDE.md: "On branch feature/training-bunker, follow docs/training/RULES.md and
   resume from docs/training/STATE.md (brief: docs/training/BRIEF.md)."

## Explore agent prompts (each returns at most 60 lines: question, answer, file:line, consequence for BAYS / steps)
(a) Map building. Read src/world/levelBuilder.ts 114-404 (method signatures), src/world/mapDef.ts 1-100,
src/world/anchors.ts (grep `export const LEDGE`, `REACH`, `HANG`, `nearestInReach` :772, `findJumpTarget`),
src/player/splitJump.ts (findSplitGaps), src/config/movement.ts 255-400 (SPLIT, WALL_JUMP, PIPE, RAPPEL, FENCE, LEAP,
TEAM), src/player/movement.ts 190-215 (LANDING), src/game/takedown.ts (grep `drop`, `inverted`, `GRAB`),
src/ai/navBuild.ts (DEFAULT_NAV_LAYERS :14, the down-cast floor ~:86). Answer SPEC "Engine questions" 1, 2, 5, 6, 7, 8,
and: does `LevelBuilder.build` run under the NullEngine in Vitest (find a test that builds a map); how stairs collide
(ramp); how `overhead` slabs work for a roofed map; the `Duct` grate kinds (wall / ceiling).
(b) Modes and co-op. Read src/game/modes/gameMode.ts (ModeId :9, GameMode 60-82), src/game/gameState.ts 455-520
(mode switch :508-517) and 865-880 (onPlayerDeath), src/game/modes/infiltrationMode.ts 1-120 (SQUAD_CAP :14, pending
squads), src/game/interactables.ts (InteractKind :7, add :59, nearest :121), src/world/doors.ts (open :144, setOpen
:163, `anchor.locked`), src/net/protocol.ts (PROTOCOL_VERSION :12, NetMode :28, capacity :32, Msg :145, parseMessage
:412), src/net/coopHost.ts (use :454, items :812-860, all-down :301, :324), src/net/coopClient.ts (syncItems :216-267,
snap :528), src/net/coopUi.ts (MODE_OPTS :251), src/net/session.ts (lobby capacity). Answer SPEC questions 3 and 10,
and list for the course framework, one line each with file:line: how to add a ModeId and a NetMode; how a door's lock
can change at run time and whether clients see it; whether light switch / shot-lamp state reaches clients (expected:
no); the respawn path after everyone is down; how `use` from a client reaches an interactable's onUse; ObjectiveChain
(src/game/missions.ts :166) reuse.
(c) Light, AI, devices. Read src/world/lights.ts (LightRegistry, LIGHT, groups, setGroup, destroy), src/voxel/lampBake.ts
(grep `lampGrid`, per-column cap), src/world/lightField.ts (levelAt), src/game/stealthSystems.ts (switches, shotRay),
src/world/rooms.ts 20-40 (SquadSlot), src/ai/enemyManager.ts (MAX_ALIVE :25, alarms, reinforce, hear), src/ai/barks.ts
(BARKS :23, RADIO_BARKS :43), src/game/gameState.ts 500-505 (onBark -> hud.barks.say), src/game/trainingDummy.ts
(constructor :24; the sandbox call gameState.ts:565), src/security/data.ts (camera fields only), src/world/surfaces.ts.
Answer SPEC questions 4 and 9, and: how a mode can show a radio line (barks path or the HUD subtitle), how many lights a
map may carry before bake or the per-column cap bites, whether S1 cameras work from `MapLayout.security` on any map.

## Checker
A fresh agent spot-checks 25% of the file:line claims (at least 15) against the code; drops any claim it cannot find.

## Orchestrator writes
- docs/training/T0-facts.md (under 200 lines): the ten SPEC answers, the reuse list, the baseline.
- BAYS.md: number-only fixes (log each in LOG.md under T0). Route / gate / guard changes: "Spec change requests" in
  LOG.md with the fix; apply them in T1a's first commit or the geometry step that owns them.
- Step files T1a-T9: adjust any file:line the agents found moved (keep each file under 80 lines).

## Checks
`git diff --stat` shows only docs/training/** and CLAUDE.md. No e2e beyond smoke.

## Commit
"training T0: facts, baseline, resume line" (paths: docs/training, CLAUDE.md). Update LOG.md, STATE.md.
