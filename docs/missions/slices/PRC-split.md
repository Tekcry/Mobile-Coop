# PR C split - how feature/mission-engine reaches master

Planner: Opus, 2026-10-25. Measured with master's `scripts/pr-size.mjs` (the CI rule: counted lines against the PR's
base, docs / `*.md` / `changes/**` / generated files not counted; cap 1500, over it only with the orchestrator's `big-pr`
label) on origin/master 833db92ec (train 76), feature/mission-framework 4ba2201ba, feature/mission-engine 533c02a66,
feature/mission-validator 0c62a921f, feature/level-validator-v6 2ab1fe186.

## 1. Sizes today
| Diff | Files | Counted | Note |
| --- | --- | --- | --- |
| `origin/master...origin/feature/mission-framework` (PR A #372) | 35 | 583 | 8126 doc lines not counted; under the cap |
| `origin/feature/level-validator-v6...origin/feature/mission-validator` (PR B) | 12 | 1574 | 74 over: section 4 |
| `origin/feature/mission-framework...origin/feature/mission-engine` (PR C as one) | 74 | 12948 | 8.6x the cap |
| `origin/master...origin/feature/mission-engine` | 109 | - | = PR A + PR C (the engine merged the framework at 286c290c) |
- `git merge-tree` of master with the engine is clean today. Master moved since the engine's base (92d0205d, train 66) in
  six of the engine's shared files only: `coopHost.ts`, `coopClient.ts`, `protocol.ts`, `gameState.ts`, `run-e2e.mjs`,
  `docs/systems/coop.md` (77 lines). Every other engine file is new or untouched on master.
- No engine change is behind a flag yet. Two things ship live today: the kit's pull-up offer (registered by
  `import.meta.glob`, teamController.ts:16) appears at ANY 4.3-4.5 m edge with a partner below, Marlow Yard's co-op lips
  included (M1: Marlow Yard does not change), and the Settings > Gameplay "Hints" row. Missions need `?mission=`, and
  Tallow Wharf is `unlisted` (URL only).

## 2. Before the split: FLG (one small slice on feature/mission-engine)
- **Model:** Sonnet (Opus brief = this section). Worktree `C:/NightShift/Mobile-Coop-mission-flg`, branch
  `feature/mission-flg` off the engine head after NET3 is merged (NET3 touches `coopHost.ts`; FLG does not, but it waits
  so the split takes one head). The lead merges it into the engine; then the split cut `SPLIT` = that merge commit.
- `src/core/flags.ts`: two fields in `Flags` and `flags`, each with its doc comment naming owner and switch-on:
  - `missions: boolean` = `params.get('missions') === '1'`: `/** (mission-framework, owner Marlow Build) Missions on Sector Ops maps (`?mission=<id>` picks one) and the Hints setting. Switch-on: Michael's walk of Three Grey Coats / Two-Key Ledger, target 2026-10-27; then the default flips to `!== '0'`. */`
  - `coopKit: boolean` = `params.get('coopkit') === '1'`: `/** (mission-framework, owner Marlow Build) The co-op kit's new moves (pull-up, shutter). Off keeps Marlow Yard as it is (M1). Switch-on: Michael's walk of the kit with Player Build's clips, target 2026-10-28; then `!== '0'`. */`
- Gates (one line each): `missionParam()` returns `flags.missions ? flags.mission : null` (sectorMission.ts:70-72);
  the Hints row is added only when `flags.missions` (settingsScreen.ts, the row EN3 added in Gameplay); the kit offers
  run only when `flags.coopKit`: `const kit = flags.coopKit ? this.kitIdle(coopPressed, free, near) : null;`
  (teamController.ts:784). No `src/net` line (a client without the flag never offers, so the host never sees a kit request).
- Tests: every vitest file that drives the gates sets the flag in `beforeAll` and restores it in `afterAll`
  (`flags` is a plain object): `tests/mission/sectorMission.test.ts`, `tests/missionNet.test.ts` (`missions`, and
  `mission` where they set it), `tests/kit/{registry,pullUp,shutter}.test.ts`, `tests/kitNet.test.ts`,
  `tests/tallowWharf/w2.test.ts` / `w4.test.ts` if they call a kit offer (`coopKit`). Add one test per gate: off ->
  `missionParam()` null / no Hints row / `kitIdle` not called (a pull edge gives the leg-up path).
- e2e: `scripts/e2e-sectorops-mission.mjs:11` PARAMS gains `&missions=1`; GB6 already sends `missions=1&coopkit=1`.
- Checks: `npm run typecheck:fast`, the vitest files above, eslint on the touched files. Counted ~60 lines (it rides
  C1-C6 below: each PR carries its own FLG lines).

## 3. The split (each PR is files copied from `SPLIT`, nothing re-authored)
Method for every PR (the lead or a Haiku agent; agents never merge):
```
git -C /c/NightShift/Mobile-Coop-mission-engine worktree add -b <branch> C:/NightShift/Mobile-Coop-<branch minus feature/> <base>
cd C:/NightShift/Mobile-Coop-<...> && git diff 92d0205d $SPLIT -- <file list> > ../<branch>.diff && git apply --3way --index ../<branch>.diff
```
- `<base>` is the previous PR's branch (a stacked series; its PR's base on GitHub is that branch, so `pr-size` counts
  only its own slice); C1's base is `origin/master`. `92d0205d` is the engine's master base, so for the six files master
  moved in, `--3way` keeps master's lines. A file sits in exactly one PR (the table), so its whole engine delta lands once.
- Then: the changelog fragment (Haiku), `npm run typecheck:fast`, `npx vitest run <the PR's test files>`, eslint on the
  PR's files, commit (`mission-framework <Cn>: <title>` + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`),
  push, `gh pr create --base <base branch>`.
- **Checker:** a fresh Opus split checker per PR: `git diff $SPLIT -- <file list>` is empty except master's hunks in the
  six files and the fragment; the PR builds alone on its base (tsc + its vitest files); flags default off; it cites the
  slice checker reports that already passed this code (C:/NightShift/scratch/mission-*-check*.md, greybox-check.md).
  C7 (`src/net`) gets two such checkers (the src/net rule). Then the laptop request on the same head.
- After a PR merges: retarget the next one to master (`gh pr edit <n> --base master`; its diff is then its own slice).

| # | Branch | Base | Files (from `SPLIT`) | Counted | Flag | Wire | Laptop `--suites` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | `feature/mission-c1-core` | master | `src/game/mission/{missionDef,missionRunner}.ts`, `tests/mission/{missionDef,missionRunner}.test.ts`, `src/core/flags.ts` | ~1400 | adds `missions`, `coopKit` (unused here) | no | `e2e-coop e2e-netmove e2e-anim e2e-combat e2e-move e2e-gadgets e2e-park e2e-tactics e2e-takedown smoke` |
| C2 | `feature/mission-c2-rules` | C1 | `src/game/mission/{missionText,ruleTracker,missionWire}.ts` + their tests, `src/ui/hud/{missionHud,missionHudMount}.ts`, `tests/missionHud.test.ts`, `tests/mission/missionHudMount.test.ts`, `src/core/settings.ts`, `src/ui/screens/settingsScreen.ts`, `tests/settings.test.ts`, `tests/settingsCover.test.ts` | ~1310 | `missions` (Hints row) | no (`missionWire.ts` is the pure packer; nothing sends it yet) | `e2e-coop e2e-netmove e2e-menus e2e-pad e2e-desktop e2e-feedback e2e-park e2e-anim e2e-combat e2e-move e2e-gadgets e2e-tactics e2e-takedown smoke` |
| C3 | `feature/mission-c3-sector` | C2 | `src/game/mission/sectorMission.ts`, `src/game/modes/sectorMode.ts`, `src/game/sectors.ts`, `src/game/gameEvents.ts`, `src/game/intelReveal.ts`, `src/game/takedownController.ts`, `src/world/mapDef.ts`, `src/game/spawnPlace.ts`, `src/world/maps/{campusMissionTest,campusOps}.ts`, `src/ui/screens/{playScreen,missionsScreen}.ts`, `tests/mission/sectorMission.test.ts` | ~1490 | `missions` (`missionParam`) | **yes**: the `sector` message gains optional `ms` while a mission runs (sectors.ts `SectorNetExtra.ms`, sectorMode `netExtra`) | `e2e-coop e2e-netmove e2e-sectorops e2e-section-rating e2e-menus e2e-levels e2e-anchors e2e-pad e2e-desktop e2e-feedback e2e-gadgets e2e-park e2e-tactics e2e-takedown smoke` |
| C4 | `feature/mission-c4-kit` | C3 | `src/game/kit/registry.ts`, `src/game/teamController.ts`, `src/game/teamMoves.ts`, `src/anim/clips/team.ts`, `src/game/gameState.ts`, `tests/kit/registry.test.ts` | ~970 | `coopKit` (kit offers) | no (the kit kinds reach `tmove` only in C7) | `e2e-coop e2e-netmove e2e-ctcourse e2e-anim e2e-clip e2e-combat e2e-move e2e-gadgets e2e-park e2e-tactics e2e-takedown smoke` |
| C5 | `feature/mission-c5-pull` | C4 | `src/game/kit/pullUp.ts`, `tests/kit/pullUp.test.ts` | ~965 | `coopKit` | no | `e2e-coop e2e-netmove e2e-ctcourse e2e-gadgets e2e-park e2e-tactics e2e-takedown smoke` |
| C6 | `feature/mission-c6-shutter` | C5 | `src/game/kit/shutter.ts`, `src/world/shutterDoor.ts`, `tests/kit/shutter.test.ts` | ~1477 | `coopKit` | no | `e2e-coop e2e-netmove e2e-levels e2e-anchors e2e-gadgets e2e-park e2e-tactics e2e-takedown smoke` |
| C7 | `feature/mission-c7-net` | C6 | `src/net/{protocol,coopHost,coopClient,coopUi,kitNet,missionMirror}.ts`, `src/player/moveState.ts`, `src/anim/tuneMoveRows.ts`, `docs/systems/coop.md`, `tests/{kitNet,missionNet}.test.ts`, `scripts/e2e-sectorops-mission.mjs`, `scripts/run-e2e.mjs` (+ NET3's files if NET3 is in `SPLIT`) | ~1030 (+ NET3) | both (read only) | **yes**: `ms` parsed and applied, intel `eid`, `tmove` / `tstart` kinds `pull` / `shutter`, `claimsPoint` `l`, `teamSide` crouch, `hangEnd` verdicts (+ NET3: mission id on `start`) | `e2e-coop e2e-netmove e2e-ctcourse e2e-sectorops:1 e2e-sectorops:mission e2e-stealth e2e-anim e2e-clip e2e-combat e2e-move smoke` |
| C8 | `feature/mission-c8-wharf` | C7 | `src/world/maps/tallowWharf{,Kit,W1,W2,W3,W4,Sectors,Missions}.ts`, `src/world/maps/index.ts`, `tests/tallowWharf/*` (7), `tests/{rooms,campusS1,detailPass}.test.ts` | 4347: **`big-pr`** | none (unlisted map, URL only; its missions need `missions`) | no | `e2e-levels e2e-anchors e2e-sectorops smoke` |
| C9 | `feature/mission-c9-wharf-e2e` | C8 | everything the engine gains after `SPLIT`: GB6 (`scripts/e2e-sectorops-wharf.mjs`, `run-e2e.mjs`, `e2e-affected.mjs`, testing-tools line), GBM (`campaign-map/graph.json` measured), POL1 (`shutter.ts` crawl timeout, 37), NET3 if it missed `SPLIT`, later fix rounds | ~600 (+ NET3) | - | no (yes if NET3 rides here) | `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl e2e-sectorops:mission e2e-coop e2e-netmove smoke` |
- Counted = master's `pr-size` on the engine diff plus FLG's lines; C3 and C6 sit close to 1500. If FLG pushes C3 over,
  move `playScreen.ts` / `missionsScreen.ts` (the `unlisted` filter, 2 lines) to C8; C6 has no spare file (POL1 already
  waits for C9).
- **Why C8 needs `big-pr`:** `tests/tallowWharf/helpers.ts` imports the built map (`src/world/maps/tallowWharf`), and
  `tallowWharf.ts` imports all four section files and the sector and mission data, so the map, its data and its seven
  test files compile only together; 2243 of the 4347 lines are tests; the map is unlisted and reachable only by URL.
  Splitting it means rewriting the checked test helpers, which costs a new checker round for no review gain.
- The suite lists are master's `e2e-affected.mjs` DIRECT tier for the PR's files, plus the tier rule's `e2e-coop` +
  `e2e-netmove` for `src/game` / `src/net` / `src/player`, plus the area's own suite. Request each with
  `node <scratch>/scripts/laptop-queue/request.mjs --sha <full sha> --pr <n> --set mission-c<k> --requester "Night Shift | Marlow Build" --suites "<list>"`.

## 4. Merge order (trains)
1. **PR A #372** `feature/mission-framework` (specs, sign-off pages, graph-svg; 583 counted). First: C8's tests read
   `docs/missions/prototypes/*/graph.json`. Waits on hotfix #378 (pr-size CI bug), then the rerun and `train-ready`.
2. **V6 PR** (`feature/level-validator-v6`, after its fix round) -> **PR B** `feature/mission-validator`, base V6,
   retargeted to master when V6 merges (same train as V6 if auto-train takes the pair). PR B counts 1574: either the
   orchestrator adds `big-pr` (recommended: one validator unit, 74 over, already checked), or split it at 4ea5d26bf
   (VAL, 1351) and 0c62a921f (VAL-DIMS, 241) with the fragment renamed to the first branch's name. PR B is independent of
   C1-C8; only GBM needs it locally.
3. **C1 -> C2 -> C3 -> C4 -> C5 -> C6 -> C7 -> C8 -> C9**, one train each or several consecutive ones in one train
   (stacked series). C4-C6 depend only on master for compiling, but they sit after C3 so `flags.ts` lands once (C1) and
   the stack stays linear. C8 needs PR A on master. C9 needs C7, C8 and GB6 / GBM done.
- Wire: C3 and C7 (and NET3 wherever it rides) touch a wire path; the train build bumps `PROTOCOL_VERSION` once per
  train. Their laptop sets always include `e2e-coop` + `e2e-netmove`.
- After C9 merges, `feature/mission-engine` holds nothing master lacks; deleting it is Michael's call.

## 5. Changelog fragments (one per branch, `changes/<branch-with-dashes>.md`, Haiku)
| PR | Line 1 / kind | Entries (one bullet each) |
| --- | --- | --- |
| C1 | `# Missions: core` / minor | Mission definitions and the step runner (steps, intel -> exploit facts, section snapshots), dark; new flags `missions` and `coopKit` (owner Marlow Build, off). |
| C2 | `# Missions: rules and objective list` / minor | Mission rules (ghost, no kills, no alarms, named target, one chance ...) on section rating's marks; the objective list HUD; Settings > Gameplay > Hints (with `?missions=1`). |
| C3 | `# Missions: Sector Ops wiring` / minor | `?missions=1&mission=<id>` runs a mission on a Sector Ops map: a broken rule restarts the section from its checkpoint, a wrong interrogation spooks the target, missions start at their own section with their own guards; the campus test mission. |
| C4 | `# Co-op kit: move registry` / minor | Kit plumbing for new co-op moves (registry, per-tick hook, pose ids), behind `?coopkit=1`. |
| C5 | `# Co-op kit: pull-up` / minor | The pull-up: catch a jumping partner at a 4.3-4.5 m lip and haul them up (placeholder poses), behind `?coopkit=1`. |
| C6 | `# Co-op kit: hold shutter` / minor | The shutter move: one lifts and holds, the other crawls under (device and rules; no map places one yet), behind `?coopkit=1`. |
| C7 | `# Missions and kit in co-op` / minor | The host's mission state reaches the client (objective list, rule lines, restarts); pull-up and shutter on the wire; the mission e2e part `e2e-sectorops:mission`. |
| C8 | `# Tallow Wharf greybox` / minor | Tallow Wharf (campaign map greybox, four sections, Three Grey Coats and Two-Key Ledger), unlisted: `?autostart=tallowWharf&mode=sector&missions=1&coopkit=1&mission=threeGreyCoats`. |
| C9 | `# Tallow Wharf mission e2e and measured pass` / patch | `e2e-sectorops:wharf-tgc` / `:wharf-tkl`; the campaign graph's measured values (greybox exit); shutter crawl timeout fix. |

## 6. Open for the lead
1. FLG before the split (section 2): it changes engine code that has passed its checkers (small, gated, tested). Without
   it, C4-C6 ship the pull-up live on Marlow Yard's lips (M1).
2. Stacked PRs: confirm with the orchestrator that auto-train takes a PR whose base is another feature branch, or that it
   retargets each PR to master just before labelling (section 3, last bullet).
3. `big-pr` for C8 (and PR B, or its split) is the orchestrator's label.
