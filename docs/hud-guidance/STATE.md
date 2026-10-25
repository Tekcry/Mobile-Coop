# hud-guidance: state
Owner: Campaign Build. Status: current.

## Resume
- Folder `C:/NightShift/Mobile-Coop-hud-guidance`, branch `feature/hud-guidance` (upstream origin), from master
  2148ec969. Guard: `git -C C:/NightShift/Mobile-Coop-hud-guidance branch --show-current` = `feature/hud-guidance`.
- Jobs: FOLDED-PLAN J3 (PR A, removal) + J3b (PR B, popup); ROADMAP Now row 9. Rule fixes at the cap (G355).
- Read: `docs/hud-guidance/BRIEF.md` (Michael said / picked, A1-A15), `docs/hud-guidance/PLAN.md` (claims, slices,
  strict briefs A1-A3, outlines B1-B5, e2e lists).
- Status: BRIEF + PLAN written (planner Opus 5.5). Plan checker not run yet. No src, test or script change yet.
- PR A slices: A1 Opus (src removal; `src/net` touched, no message change), A2 Sonnet (HQ radar, save v10; starts from
  A1's head), A3 Sonnet (e2e flips + no-minimap per mode; parallel with A1).
- PR B (`feature/hud-guidance-b` from PR A's head, draft until A releases): B1 Opus popup, B2 Sonnet binds, B3 Opus
  net notice, B4 Sonnet Sector Ops list, B5 Opus notes.
- Key pointers (master 2148ec969):
  - Minimap: `src/ui/hud/minimap.ts:1-107`; HUD slot `src/ui/hud/hud.ts:86, :152, :160, :175-177`.
  - Compass: `hud.ts:32-38, :57-58, :131-143, :159, :257-271`; CSS `src/styles.css:956-1006`.
  - Blip build: `src/game/gameState.ts:3616-3639`; `extraBlips` `:399-400, :750, :766-768`; `enemyBlips` `:2139-2140`.
  - Producers: `sectorMode.ts:1355`, `infiltrationMode.ts:299`, `missionMode.ts:156`, `clearMode.ts:221`,
    `courseMode.ts:1122`, `pickups.ts:96`, `coopHost.ts:1943`, `coopClient.ts:1320`; interface `gameMode.ts:106`.
  - HQ radar: `src/progression/suit.ts:103-135`; save `src/save/schema.ts:11` (v9), `migrations.ts:112-142` (precedent).
  - Objective line: `hud.ts:144, :297-304`; CSS `styles.css:1007-1012, :1028`; pause list `gameState.ts:1255-1263`.
  - View / O: `src/input/padBinds.ts:51` (`device`, no action), `gamepadMapping.ts:63-79`, `keyBindings.ts:43-68`;
    tuner View `src/ui/animTunePad.ts:69, :149-158`; doc row `docs/systems/input-and-loop.md:139`.
  - Co-op notice: `src/net/objectiveMirror.ts`, `coopClient.ts:102, :254, :504-507, :1072-1075`.
- Overlaps: engine branches (`mission-engine-flg-gb6`, `tallow-design-docs`) on `sectorMode.ts` `blips()`; master
  first, engine deletes its gate in its rebase (~15 min). `player-docs-j1` on input-and-loop.md, other hunks.
- Next: run the Opus plan checker (`docs/templates/plan-check.md`, `node scripts/claims-check.mjs --plan
  docs/hud-guidance/PLAN.md --name feature/hud-guidance`), then start A1 (Opus) and A3 (Sonnet) in parallel.

## Done
- 2026-10-25 18:15: BRIEF, PLAN, STATE and the changelog fragment written and pushed (planner).

## History
- 2026-10-25: job opened from FOLDED-PLAN J3 / J3b after the ~17:00 sign-off.
