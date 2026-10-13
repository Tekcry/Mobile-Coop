# Step 20 - bot partner (Block D opener, bible 5.9 C20)

Model: implementer sonnet; checker opus (network step). Depends on: 19 (Block C done).
Commit: "locomotion 20: dev bot partner over the local transport, Block C co-op reruns"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file.
- docs/design-bible.md:711-718 (C20), :680-685 (C11).
- src/net/localTransport.ts:1-67 (BroadcastChannel `ss-room-<id>`, `?net=local`).
- src/net/coopUi.ts:17-44 (transport choice, join URL with `net=local`).
- src/net/session.ts (265 lines): `grep -n 'join\|players\|onPeerJoin'`, read only those blocks.
- src/game/teamController.ts:28-70 (TeamState, Y tap / hold, `busy`); src/game/teamMoves.ts:9-52 (TeamKind, checks).
- src/core/flags.ts:1-64 (`coop`, `net`, `debug`); src/input (the `InputState` writer the sources share: `grep -n 'interface InputState' -r src/input`).
- scripts/e2e-netmove.mjs:20-60,114-134 (two pages, `until`, remote pose read); scripts/run-e2e.mjs:24-57 (REQUIRED, KNOWN_FLAKY, quick map).
- `grep -rn 'rerun after 20' docs/locomotion/steps docs/locomotion/STATE.md` (the checks this step reruns; step 11 stacking at least).

## Numbers
- Netmove limit 10 cm; baseline worst 3.7 cm (STATE.md). Dual takedown window 1.5 s (coopHost.ts:47).
- Anim budget on this VM: 0.04 ms x (calib 9.9 / REF_MS 3.7 = 2.68, perf.mjs:114,139) = 0.107 ms per character;
  trend trip +25% over 0.0504 = 0.063 ms (STATE.md). The tighter one (0.063) is the gate.

## Task
1. The bot is a real co-op client: a second game instance in its own page, `?net=local&bot=1&join=<code>`, playing
   through the real protocol, host approval and remote posing (no shortcut path). ASSUMED (next free A-number, log in DECISIONS.md):
   alternative is an in-page headless second sim; the page route exercises every real code path and needs no new sim.
2. Dev only: the bot code lives in `src/net/bot/` and is reached only through dynamic `import()` behind
   `flags.coop && (import.meta.env.DEV || flags.debug)`. Single player never imports it (add a unit test that scans
   `src/` for a static import of `src/net/bot`).
3. `src/net/bot/botBrain.ts`: pure, Babylon-free. In: own pose, leader pose, command, a wall / anchor query result.
   Out: one `InputState`-shaped struct (stick, gear, buttons). No allocation per tick (reuse the out struct).
4. Commands: `follow` (2.0 m behind, gear matched to the leader, stop within 1 m of a stop), `hold`, `stack`
   (back-to-wall on the leader's wall, 0.7 m behind him), `brace`, `boost`, `ladder` (human ladder bottom / top),
   `takedown <guard>` (for dual takedowns), `strike`, `draw` / `holster`, `aim <target>`, `doorPeek`, `medkit`,
   `crouch` / `stand`, `traverse` (nearest anchor), `down` / `revive`, `carry`, and `drag` once step 27 lands
   (the table is open: later steps add a row and a test).
5. Steering: straight line to a point, the nav grid path when blocked (`src/ai` nav, read only); no new physics.
6. Command channel: a dev-only BroadcastChannel `ss-bot-<room>`, never the game protocol, so PROTOCOL_VERSION and
   the wire stay unchanged. API on the host page: `window.__bot.cmd(name, arg?)`, `window.__bot.state()`.
7. Debug overlay (src/ui/debugOverlay.ts): an "Add bot" button that opens the bot page (desktop) and a command row;
   lazy-loaded with the bot module. Touch gets nothing (D1).
8. The bot answers team-move prompts as the other half (brace, boost, ladder, dual takedown) and revives on request.
9. `scripts/e2e-bot.mjs` (new suite, quick map `src/net/` and `src/game/team*`): host page + bot page; the bot
   follows 20 m, stacks, braces, boosts, ladders, dual takedown, elbow strike, medkit, door peek, draw / holster;
   asserts the host's view of the bot is posed from MoveState with error under 10 cm.
10. Rerun every Block C check marked "rerun after 20" with the bot; record each result in LOG.md and remove the
    pending note from STATE.md. A failing rerun is fixed here (it is Block C debt) within the 3-round rule.
11. Docs: docs/systems/coop.md (bot section), docs/systems/testing-tools.md (suite + `window.__bot`).

## D8
- No new MoveState mode, no new protocol field (unit test: packed PlayerState size unchanged).
- The bot's avatar on the host page must pass the same remote limits as a human client.

## Checks
- `npm run check`; `npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-bot e2e-netmove e2e-coop`.
  e2e-coop and e2e-netmove are KNOWN_FLAKY (run-e2e.mjs:33): read the output; any FAIL line fails this step.
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): no metric regresses vs the last run.
- Perf trend not required (no rig change); state "no rig change" in the report.
- PC-PASS: none (no visual change).
