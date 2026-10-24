# GB6 - Tallow Wharf mission e2e (`scripts/e2e-sectorops-wharf.mjs`, part of e2e-sectorops)

Planner: Opus, 2026-10-25. Builder: Sonnet 5.5 from this brief only. Checker: one fresh Opus checker (it drives
`src/net` co-op moves). Code facts were read on `feature/mission-engine` at 533c02a66 (GB5 + EN4 + NET2 merged; NET3
not yet). Every builder first reads `docs/systems/agent-preamble.md` (master copy) and `docs/missions/slices/GB-briefs.md`
section 0.4 (frame, codes from the tables).

## 0. Setup (the lead)
- Worktree: `git -C /c/NightShift/Mobile-Coop-mission-engine worktree add -b feature/mission-gb6 C:/NightShift/Mobile-Coop-mission-gb6 origin/feature/mission-engine`
  (cut it after NET3 is merged into the engine if NET3 is done; see 6), then the usual `node_modules` junction.
- Guard line: `cd /c/NightShift/Mobile-Coop-mission-gb6 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/mission-gb6 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-mission-gb6"`
- Files owned: `scripts/e2e-sectorops-wharf.mjs` (new); `scripts/run-e2e.mjs` (PARTS, PART_SCRIPT, `runOne`);
  `scripts/e2e-affected.mjs` (three DIRECT_COVERS keys); `docs/systems/testing-tools.md` (one line). Read only: everything
  else. Never edit a map, mission, kit or net file: a failure there goes to the lead (section 7).
- The builder never runs e2e (no desktop e2e). It runs `node --check`, eslint, the e2eAffected test and `--list` (section 8);
  the lead queues the laptop run.

## 1. What the script proves
Two co-op runs on `tallowWharf`, host + client over `?net=local`, `E2E_GPU=1` (the laptop queue always sets it):
1. **Three Grey Coats** (`threeGreyCoats`, W1 -> W2 -> W3 -> W4) and **Two-Key Ledger** (`twoKeyLedger`, W2 -> W3 -> W4)
   each run from their start section to the extraction and the results screen (`VICTORY`).
2. **One forced co-op move per section**, done with real pad input on both pages (table in 4). The shutters (C2, C8)
   print `SKIP` (no `placeShutter` yet, GB-briefs 0.2). TGC's W3 is crossed by teleport (TKL exercises W3).
3. **A broken rule restarts the section to its checkpoint and the mission carries on**: TGC questions the wrong grey
   coat (`namedTarget`), TKL kills a guard (`noKills`).
4. **The client starts in the mission's start section without `mission=` on its URL** (TKL starts at W2). Gated on
   NET3 (section 6).
5. The client mirrors the host's mission: its `net.mission.runner.doneBits` equals the host's after each section, and its
   `.mission-hud` shows rows.

## 2. Registration (`scripts/run-e2e.mjs`)
- `PARTS['e2e-sectorops']` (run-e2e.mjs:51) becomes `['1', '2', '3', '4', '5', '6', 'mission', 'wharf-tgc', 'wharf-tkl']`.
- `PART_SCRIPT` (:53) accepts an array `[script, ...args]`:
  `{ 'e2e-sectorops:mission': 'e2e-sectorops-mission', 'e2e-sectorops:wharf-tgc': ['e2e-sectorops-wharf', '--mission=threeGreyCoats'], 'e2e-sectorops:wharf-tkl': ['e2e-sectorops-wharf', '--mission=twoKeyLedger'] }`.
- In `runOne` (:203-205): `const own = PART_SCRIPT[s]; const [ownName, ...ownArgs] = Array.isArray(own) ? own : own ? [own] : [];`
  and spawn `scripts/${ownName ?? script}.mjs`, `url`, `...ownArgs`, then the existing `--part` / `--quick` args (the
  `--part` only when there is no own script, as today).
- Update the comment block above PARTS (:49-50) with one line: `(mission-framework GB6) e2e-sectorops:wharf-tgc / :wharf-tkl = the Tallow Wharf missions in co-op (scripts/e2e-sectorops-wharf.mjs --mission=<id>)`.
- Run directly with no `--mission`, the script runs both missions in sequence (what `--affected` picks when the script
  itself changes: `e2e-affected.mjs:349` names it `e2e-sectorops-wharf`).
- `scripts/e2e-affected.mjs` DIRECT_COVERS (:210): add, ABOVE `'src/game/modes/'` / `'src/game/'` / `'src/world/'`
  (the first matching prefix wins): `'src/game/mission/': [...GAME, 'e2e-sectorops', 'e2e-section-rating']`,
  `'src/game/kit/': [...GAME, 'e2e-coop', 'e2e-sectorops']`, `'src/world/maps/tallowWharf': ['e2e-sectorops', 'e2e-levels', 'e2e-anchors']`.
- `docs/systems/testing-tools.md`: in the e2e-sectorops row, add the two parts with one sentence each.
- Laptop suite names: `e2e-sectorops:wharf-tgc` and `e2e-sectorops:wharf-tkl` (both in every `e2e-sectorops` run and so
  in every train's full run).

## 3. Script skeleton (copy the patterns; do not import from e2e-sectorops.mjs)
- Imports: `import { launch, openPage, frames, BTN, assert } from './e2e-lib.mjs'` and
  `import { until, waitSim, setSimPages, startMode, NET_VIEWPORT, onHostStep, hostStepResult, watchTeam, teamLog } from './e2e-net-lib.mjs'`.
- `const MISSION = process.argv.find((a) => a.startsWith('--mission='))?.slice(10);` run `['threeGreyCoats','twoKeyLedger']`
  filtered by it; each in its own `run(id)`: own browser, closed in `finally`; a failure sets `failed` and the next runs.
- Pages: copy `hostAndJoin` (e2e-net-lib.mjs:182-203) into the script as `join(url, hostParams, clientParams)`: the
  same body, with `launch({ url, params: hostParams, viewport: NET_VIEWPORT })` for the host and
  `openPage(ctx, url, clientParams)` for the client (`launch`, `openPage` from e2e-lib.mjs; `NET_VIEWPORT`, `setSimPages`,
  `startMode` from e2e-net-lib.mjs). Host params `net=local&missions=1&coopkit=1&mission=<id>`; client params
  `net=local&coopkit=1`. `missions` / `coopkit` are the FLG flags (PRC-split.md 2); until FLG lands they are ignored.
  The client URL never has `mission=`.
- Start: `await startMode([A, B], 'sector', 'tallowWharf')` (e2e-net-lib.mjs:205; LOAD_MS 120 s; damage off on both).
- Host pump: copy `coop()`'s `setInterval` pump verbatim (e2e-sectorops.mjs:1609-1629); clear it in `finally`.
- Helpers: copy verbatim from e2e-sectorops.mjs: `holdUntil` :1633, `padReady` :1641, `crouch` :1642, `place` :1647,
  `moveHost` :1648, `moveClient` :1652 (both take `y`: pass the storey + 0.1 for lofts and roofs), `tapA` :1658,
  `hostFeet` :1664, `clientFeet` :1665, `legUp` :1676 (change its grip assert to `Math.abs(a.grip - c.lipY) < 0.1` with
  `lipY` in the call), `pullUp` :1708 (BTN.Y climb from a hang).
- Host setup after the start (as e2e-sectorops-mission.mjs:31-38): `g.enemyMgr.update = () => {}` (guards frozen: the
  test reads the mission, not the stealth), `if (g.security) g.security.fixedUpdate = () => {}`,
  `window.__mev = []; g.events.on('missionEvent', (e) => window.__mev.push(e))`. Never `?sectorGuards=`: it caps by slot
  index and would drop Teale (W2:6), the decoys and the night clerk (W2:9).
- Readers (host page): `dbg = () => window.__sector.debug()` (sectorMode.ts:1399; `mission` = sectorMission.ts:510);
  `M = window.__mission` (sectorMission.ts:665); `stepDone(id)` = `(M.runner.doneBits >> M.runner.def.steps.findIndex((s) => s.id === id)) & 1`;
  `fact(f)` = `M.runner.hasFlag(f)` (missionRunner.ts:237); `slot(k)` = `window.__sector['slotEnemy'][k]` (sectorMode.ts:200,
  the live section's guard k).
- Item use (host, as e2e-sectorops-mission.mjs:25): teleport within 1 m, `sim` 0.4 s, then
  `it = g.interactables.items.find((x) => x.id === id); it.enabled && it.onUse(it, 'local')`. Ids: objective
  `${sectionId}-obj` (sectorMode.ts:797), board `c-sintel-<sec>-<k>` (sectors.ts:203), keypad `c-skey-<sec>-<k>` (:198),
  bolt `c-sbolt-<sec>-<k>` (:320). `<sec>` is the run index: W1 0, W2 1, W3 2, W4 3.
- Bolts: read `window.__sector.boltInfo()` (sectorMode.ts:674) for `at`, `side`, `door`; stand 0.8 m on the `side`,
  facing the door, use `c-sbolt-<sec>-<k>`; `until` it is `!shut && locked === false`.
- Connector: teleport host and client into the connector box centre (both pages, `moveHost` / `moveClient`), `until`
  `dbg().index` is the next run index (60000 ms: the cycle waits on the next section's lamp bake, sectorMode.ts:854).
- Extraction: both into the W4 extract box centre `(90, -1, 3)`; `until(A, () => window.__mission.finished)` 20000 ms;
  then `A.waitForSelector('.results-screen', { timeout: 15000 })` and `.results-title` is `VICTORY`.
- After each section: `const hb = M.runner.doneBits` on the host; `until(B, (b) => window.__app.current.net.mission.runner?.doneBits === b, hb, 8000, 'client mirrors the steps')`
  (coopClient.ts:126); once per run: the client's `.mission-hud` is shown with at least one `.mh-row` (coopClient.ts:221-227).
- Host checks once per run: `window.__sector.blips().length === 0` (no objective blip, A10).
- A move helper failure prints `teamLog(A)` and `teamLog(B)` (e2e-net-lib.mjs:265) before rethrowing.
- Exit: `process.exit(failed || consoleErrors ? 1 : 0)`; console problems listed as in e2e-sectorops-mission.mjs:124.

## 4. The forced moves (one per section; real pad input; spots from the section files)
| Run | Section | Move | Spots (x, y, z; yaw) | Done when |
| --- | --- | --- | --- | --- |
| TGC | W1 | Leg-up C1, canal steps (`w1-lip-steps`, 4.5) | client crouches at (4, 0, 13.5) yaw 0; host behind at (4, 0, 12.7) yaw 0 (`legUp`, tallowWharfW1.ts:176) | host hangs on a ledge, grip 4.5 +- 0.1; `pullUp(A)`; host grounded with y > 4.3 |
| TGC | W2 | Partner throw C4, pawn loft -> reading room stage (`w2-throw-pawn`, tallowWharfW2.ts:85) | first unbolt the pawn taking-in door (W2 bolt 3, from the loft side) and open it on both pages (`world.doors.open(world.doors.list[door], 'quiet')`, doors.ts:212; `until` open on the client too). Thrower = client, standing, at (50.5, 4.5, 69.6) **yaw PI (facing the runner, away from the lightwell)**; runner = host at (50.5, 4.5, 68.3) yaw 0 | client RB -> `team.state === 'throwOffer'`; host sees `team.offer.toss`; `holdUntil(A, RB, ... count.throws > n)`; host lands in the stage [49, 72.5, 52, 73.5] with y 4.5 +- 0.3 |
| TGC | W3 | - (no TGC step, no guards: teleport) | - | prints `SKIP: W3 crossed (TKL covers it)` |
| TGC | W4 | Leg-up C9, clerestory (`w4-lip-clerestory`, 4.4) | client crouches at (79, 0, 29.2) yaw PI; host at (79, 0, 30.0) yaw PI (tallowWharfW4.ts:210) | grip 4.4 +- 0.1; `pullUp(A)`; host grounded, y > 4.2 |
| TKL | W2 | Pull-up C3, east lip (`w2-pull-east`, tallowWharfW2.ts:82) | holder = host on the walkway at (73.5, 4.6, 59.35) yaw PI, crouched (`crouch(A)`); partner = client at (73.5, 0.1, 58.3) yaw 0 | see the pull recipe below; client grounded with y > 4.3 within 1.5 m of the host |
| TKL | W3 | Vent unlock C7: leg-up into the coal chute (`w3-lip-chute`, 4.4) + the hatch bolt | client crouches at (97.1, 0, 53.2) yaw PI; host at (97.1, 0, 54.0) yaw PI (tallowWharfW3.ts:52) | grip 4.4 +- 0.1; `pullUp(A)`; host y > 4.2; then the host unbolts W3 bolt 0 (the hatch, (97.1, 4.4, 50.0), side [0, 1]) from inside the chute |
| TKL | W4 | Pull-up C10, jetty (`w4-pull-jetty`, tallowWharfW4.ts:46) | holder = host at (73.5, 0.1, 6.35) yaw PI, crouched; partner = client on the canal bed at (73.5, -4.3, 5.3) yaw 0 | client grounded with y > -0.3 within 1.5 m of the host |
| both | W1 C2, W4 C8 | Shutter | - | print `SKIP: shutter <id> is a stand-in until the shutter wiring slice (GB-briefs 0.2)` |
- **Why the thrower faces away:** a standing player facing a drop is offered the rope, not the throw
  (teamController.ts:874-888); the landing runs along the runner -> thrower line (`throwLanding`, teamMoves.ts:210), so
  the thrower's yaw does not move it. If the client's RB still gives `ropeOffer` / `hangOffer`, or the host's runner
  side refuses (`team.lastThrowRoom` not `'ok'`), stop: section 7.
- **Pull recipe** (pullUp.ts:283-391): `watchTeam(A)`, `watchTeam(B)`; host crouched at the edge, `holdUntil(A, RB, () => team.state === 'pullOffer')`;
  arm a host step hook BEFORE the client presses: `onHostStep(A, (g, _a, st) => { const t = g.team; if (t.state === 'pullCatch' && t.t >= 0.22 && !st.down) { window.__pad.set(5, 1); st.down = 1; } else if (st.down && ++st.down > 3) { window.__pad.set(5, 0); return t.state; } })`
  (5 = BTN.RB; the catch window is 0.18-0.44 s, pullUp.ts:56-60); then `holdUntil(B, RB, () => ['pullJump','pullHang','pullScramble'].includes(window.__app.current.team.state), 'client jumps for the hands')`;
  `hostStepResult(A, key, 8000, 'host catches')`; then `until` the host log has `pullHaul` and the client's done-when.
  A miss (`lastMiss` early / late on `g.team['kitRunOf'](...)`, or the client back on the floor) is a FAIL with both team logs.

## 5. The missions, step by step (host page unless said; `sim` = `waitSim(ms)`)
**Three Grey Coats** (steps tgc-1, tgc-2, tgc-3, tgc-opt, tgc-4, tgc-5; tallowWharfMissions.ts:28-113)
1. Start: `dbg().index === 0`, `mission.id === 'threeGreyCoats'`, `mission.section === 0`; client within 2 m of W1
   `start2` (8.5, 0, 10) (section 0: no NET3 needed). Blips 0; client HUD rows.
2. W1 move (4). tgc-1: host to (22, 0.1, 41), `sim(1500)` -> `fact('tgc-1')` and `stepDone('tgc-1')`. tgc-2: host on the
   gallery at (3.6, 4.6, 50.6) yaw -PI/2, use `c-sintel-0-1` (tally book); host to (18.75, 0.1, 7.75), `sim(5000)`
   (tea-stall talk, talkers W1:7, 8 alive) -> `stepDone('tgc-2')`, `fact('tgc-courier')`. `dbg().phase === 'connector'`.
   Connector box (38, 0, 60) -> index 1. Client mirror check.
3. W2: move (4, the throw). **Broken rule**: `const e = slot(7)` (Fenn, a decoy);
   `g.events.emit('intel', { lines: [], codes: [], eid: e.id })` (the event `revealIntel` raises, gameEvents.ts:10,
   intelReveal.ts:12). `sim(500)`: `mission.breaks === 1`, `mission.pending === true`, `mission.spook >= 0`.
   `until(() => dbg().restarts === 1)` 15000: `index === 1`, `phase === 'objective'`, `mission.ruleRestarts === 1`,
   `stepDone('tgc-3') === 0`, `fact('tgc-courier')` still true (W1's fact kept), host within 2.5 m of (42, 0, 55) and
   the client (host's remote feet) within 2.5 m of it too. Teale (`slot(6)`) stands within 1.0 m of the bolt point
   (65, 4.5, 76.75) (the spook survives the restart).
4. `sim(2200)` (the hold). Interrogate Teale: emit `intel` with `eid: slot(6).id` -> `stepDone('tgc-3')`,
   `fact('tgc-chest')`, `mission.breaks === 1` (no new break). tgc-opt is not done; the exit opens anyway
   (`phase === 'connector'`). Connector box (84.35, 8.5, 66) -> index 2. Client mirror check.
5. W3: `phase === 'connector'` within 3000 (no TGC step), SKIP line, connector box (90, 0, 36) -> index 3.
6. W4: move (4, clerestory). tgc-4: use `W4-obj` from (75.5, 0.1, 15) yaw PI -> `stepDone('tgc-4')`; `window.__mev`
   has `{ name: 'mindersArrive', guardTag: 'tgc-minders', postId: 'w4-quay' }`. Extraction (3) -> finished,
   `doneBits` has tgc-1..tgc-5 (the optional bit 8 clear), `VICTORY`.

**Two-Key Ledger** (steps tkl-1, tkl-2, tkl-3, tkl-4, tkl-opt, tkl-5; tallowWharfMissions.ts:120-204)
1. Start: `dbg().index === 1`, `mission.section === 0`, host within 2 m of W2 `start` (42, 0, 55). **Client start
   (section 6):** the client page's `new URLSearchParams(location.search).get('mission') === null`, and its own feet
   (`window.__app.current.player.controller.pos`) within 2.0 m of W2 `start2` (42, 0, 56.5).
2. W2: move (4, east pull). tkl-1: host into the overhear box [59.8, 59.3, 62.2, 61.7] at y 4.6 (the walkway), `sim(5000)`
   (talker W2:9 alive) -> `stepDone('tkl-1')`, `fact('tkl-gate-code')`. Connector box (84.35, 8.5, 66) -> index 2.
3. W3: tkl-2: host to (112, 0.1, 51.1) yaw 0, use `c-skey-2-0` -> `dbg().keypads[2][0] === true`, `stepDone('tkl-2')`.
   **Broken rule**: `const e = slot(0); e.applyDamage({ amount: 9999, point: e.pos.clone(), dir: e.pos.clone().normalize(), part: 'head', kind: 'bullet', attackerTeam: 'player', attackerId: 'local', sourcePos: g.player.position.clone(), impulse: 1 })`
   (e2e-sectorops-mission.mjs:68). `sim(500)`: `mission.breaks === 1`, `mission.line === 'No kills broken. Back to the section checkpoint.'`.
   `until(() => dbg().restarts === 1)` 15000: `index === 2`, `mission.ruleRestarts === 1`, `stepDone('tkl-2') === 0`,
   `dbg().keypads[2][0] === false`, `fact('tkl-gate-code')` still true (W2's fact), `slot(0).alive`, host and client
   within 2.5 m of the W3 restart point (111.4, 8.4, 68).
4. `sim(2200)`. Keypad again -> `stepDone('tkl-2')`. tkl-3: host to the east key post (109, 0.1, 76.4), client to the
   west post (88, 0.1, 76.4); in ONE host evaluate: `const t = window.__sector.team; const id = g.playerRefsInto([])[1].id; t.turnKey(2, 0, true, 'local'); t.turnKey(2, 0, false, id)`
   (sectorTeamDoors.ts:189; the window is 1.0 s) -> `dbg().pairGates[2][0] === true`, `stepDone('tkl-3')`,
   `__mev` has `{ name: 'telltale', guardTag: 'w3-lodge-porter', postId: 'w3-passage' }`.
5. Ledger: use `W3-obj` from (101, 0.1, 61.5) yaw 0. Move (4, the chute) then the hatch: host to the hatch's unbolting
   side (boltInfo k 0), use `c-sbolt-2-0`. Host drops: teleport to (97.1, 0.1, 48.5) (the coal yard, inside the
   `tkl-4-yard` box), `sim(1500)` -> `stepDone('tkl-4')` (both flags). The coal-yard door (k 1, (99, 0, 52), side
   [0, -1]): host unbolts from the yard side; client to (90, 0.1, 46). Connector box (90, 0, 36) -> index 3.
6. W4: move (4, jetty pull), then extraction (3) -> finished, `VICTORY`; the client's runner `finished` too.

## 6. The client-start assert and NET3
- Today a co-op client learns the sector mission only from its own `?mission=` (`missionParam`, sectorMission.ts:70;
  `startSlotPoints`, spawnPlace.ts:100-103; session.ts:334 clears `mission` outside Infiltration). NET3 carries the mission
  id in the lobby `start` message so the client spawns at the mission's start section.
- Gate: a constant at the top of the script, `const NET3 = false; // flip to true in the commit that merges feature/mission-net3 into feature/mission-engine (Marlow Build lead)`.
  `NET3 === false`: the TKL client-start check prints `SKIP (until NET3 merges): client start section without ?mission=`
  and the script teleports the client to W2 `start2` before going on. `NET3 === true`: it asserts (1 in TKL).
- If `git log origin/feature/mission-engine --oneline | grep -q "NET3"` already matches when the builder starts, set
  `NET3 = true` from the start.
- The URL half of the check (no `mission=` on the client) runs in both states.

## 7. Timeouts, GPU, failures
- Per wait: `until` default 15000 ms (sim time in a match); connector 60000; restart 15000; leg-up / throw / pull steps
  20000 (the helpers' defaults); host step hook 8000; extraction 20000; results 15000 wall. Load: LOAD_MS (120 s).
- Budget per part: under 360 s on GPU (the runner kills at `E2E_SUITE_TIMEOUT` 600 s; a kill is a FAIL).
- GPU: every run is `E2E_GPU=1` on the laptop queue (4189 / 4192). Never run it on the desktop or in the cloud;
  software GL is only a timing diagnosis (CLAUDE.md test tiers).
- A move that fails for a map reason (no boost target, rope offered instead of the throw, a pull band refusal in
  `team.lastDenied`, a spot inside a wall) is NOT fixed in the script by moving spots or relaxing asserts: the builder
  reports it (`C:/NightShift/scratch/mission-gb6-report.md`, with both team logs) and the lead routes it (map files:
  Opus fix round; kit / net: Opus). The asserts stay strict; only states are asserted, never poses (PLAN 7).

## 8. Checks (the builder) and the laptop run (the lead)
- `node --check scripts/e2e-sectorops-wharf.mjs`; `npx eslint scripts/e2e-sectorops-wharf.mjs scripts/run-e2e.mjs scripts/e2e-affected.mjs`.
- `npx vitest run tests/e2eAffected.test.ts` (the CPU rule of GB-briefs 0.4 first).
- `node scripts/run-e2e.mjs e2e-sectorops --list` prints `e2e-sectorops:wharf-tgc` and `e2e-sectorops:wharf-tkl`.
- Commit message (the lead commits): `mission-framework GB6: Tallow Wharf mission e2e (two co-op runs, forced moves, rule restarts)`
  plus the body and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Laptop (lead, after the merge into the engine): `node <scratch>/scripts/laptop-queue/request.mjs --sha <full sha> --set mission-gb6 --requester "Night Shift | Marlow Build" --suites "e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl e2e-sectorops:mission"`.
- Report: `C:/NightShift/scratch/mission-gb6-report.md` (built, spots used, SKIP lines, the NET3 state, check results).
