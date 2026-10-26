status: claimed Night Shift | Cloud Builder 1 2026-10-26T01:38Z

# Brief: player-batch-j19 S4 - Guard arms and goggle default (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Job J19 player-batch-j19, slice S4, rows R16 (every guard armed) and R17
(no three-lens goggle on the operator). Data, one cosmetic default, one rig case removed, unit tests. Sonnet-level
builder: follow the steps exactly; anything the brief does not settle is `status: blocked`, not a guess.

## Read first
- Plan: `git show origin/feature/player-batch-j19:docs/player-batch-j19/PLAN.md` ("How it works today" rows R16 / R17,
  "Design per row" R16 / R17, "Slices" S4, "Test plan"). Its line numbers are master 38e92f5d3's: use the lines below.
- Brief: `git show origin/feature/player-batch-j19:docs/player-batch-j19/BRIEF.md` A7 (R16) and A8 (R17).
- Decisions on master: G298 (every guard armed), G69 and G195 (no three-lens look; Wren keeps her own goggle).
- Hard rules: `git show origin/master:CLAUDE.md`. Cloud rules: `git show origin/master:docs/systems/agent-preamble.md`
  ("Cloud sessions").

## Base and branch
- Base `origin/master` at `29f03b6c004bf8dae66eea9c434160b6b1db061c`. New branch `feature/player-j19-s4` from it;
  push `origin feature/player-j19-s4` only (no force, no master merge, no rebase, no other branch). `npm ci` once.
- Guard before every write: `test "$(git rev-parse --abbrev-ref HEAD)" = feature/player-j19-s4`.
- Open PR #498 (`feature/mixamo-source-wire`, df214492f) also edits `src/player/characterRig.ts` (its hunks near master
  lines 14-20, 1212, 1818, 2518, 2775). Keep the S4 edit there to the three places in Step 2 item 4 and nothing else
  (no reformatting, no comment tidying elsewhere in the file), so the two merge cleanly.

## Files (only these)
- `src/config/enemies.json`
- `src/cosmetics/avatarLook.ts`
- `src/cosmetics/catalog.ts`
- `src/progression/suit.ts`
- `src/player/characterRig.ts` (the three places in Step 2 item 4 only)
- `tests/enemyArms.test.ts` (new)
- `tests/economy.test.ts`
- `tests/sectors.test.ts` (three runner assertions only, Step 1 item 3; outside the PLAN's claims list: needed because
  those assertions use the runner as the unarmed example; the lead adds it to the claims)
- `changes/feature-player-j19-s4.md` (new)

Not: `src/ai/**` (Guard AI is at its unwalked cap: no AI code), `src/game/sectors.ts`, `src/game/modes/*`,
`src/world/maps/*`, `src/player/goggleGlow.ts`, `src/operators/**` (Wren's own goggle, G195), `src/game/gameState.ts`,
`src/ui/**`, `scripts/**`, `docs/**`, `tests/cosmetics.test.ts`, `tests/save.test.ts`, any fixture. A problem in another
file goes in the report, not fixed.

## What is there now (master 29f03b6c0; re-found)
R16:
- `src/config/enemies.json:48-88` the runner: `:59` `"weapon": null`, `:60-65` `"melee": {...}`, `:86` `"gun": null`.
  The grunt's weapon block is `:13-24` (`damage 7, rpm 420, burstMin 3, burstMax 6, pauseMin 0.9, pauseMax 1.8,
  windup 0, spreadDeg 3.2, range 34, tracer "#ff9a6a"`). Every other human kind (grunt, heavy, sniper, enforcer,
  droneOp, officer) has a weapon; `dog` is `quadruped` with melee only.
- `src/ai/enemyDefs.ts:66-86` `validateEnemyDefs` (needs weapon or melee, `:74`), `ENEMIES` `:86`, `ENEMY_KINDS` `:8`.
- Runner spawns: `src/world/maps/warehouse.ts:96` (room `racking` squad), `src/game/modes/missionMode.ts:46` (the kinds
  list) and `:107` (the wave spawn). Only Sector Ops checks arms: `src/game/sectors.ts:593-613` `checkSectorGuards`
  (`:609` `if (!def.weapon)` -> "carries no gun (M1)").
- `tests/sectors.test.ts:253`, `:262`, `:264` use `g('runner')` as the unarmed guard and expect "carries no gun (M1)".
- Behaviour note (read, do not change): `src/ai/enemy.ts:3250` the melee branch runs whenever `def.melee` is set, so a
  runner with a weapon block and its melee kept still fights hand to hand; `gun` null means no gun model
  (`src/ai/enemyRig.ts:32`). A7 keeps the melee; this slice is data only.
R17:
- `src/cosmetics/avatarLook.ts:8` `HELMETS` includes `'trilens'`; `:11-17` `LEGACY_LOOK_IDS` (helmet row `:16`
  `{ horns: 'headset' }`, read by `sanitizeLook` `:93` and by `src/save/migrations.ts:83-92`); `:60` the default look's
  doc comment; `:69` `helmet: 'trilens'`.
- `src/cosmetics/catalog.ts:64` `{ value: 'headset', name: 'Comms headset', req: { level: 6, price: 1200 } }`; `:65`
  `{ value: 'trilens', name: 'Tri-lens goggles' }` (no `req`: a free starter). Options without `req` are free starters
  (`:15`); `autoGrant` (`src/progression/profile.ts:41-51`) grants only free ones.
- `tests/cosmetics.test.ts:21` (helmet options = `HELMETS`) and `:31` (a fresh profile owns the default helmet): both
  must stay green, so the new default `headset` must be a free starter (Step 2 item 2).
- `src/progression/suit.ts:95` `if (tier('goggles', s.goggles) >= 1 && look.helmet !== 'trilens') look.helmet = 'headset';`
- `src/player/characterRig.ts`: `:3` `import { addGlow, BEACON, GLOW_IDLE, GLOW_VISION } from './goggleGlow';`
  (`addGlow` is used only at `:1641` and `:1648`, inside the case below); `:1571` `// (the balaclava covers the neck)`;
  `:1572` `const masked = look.helmet === 'trilens';`; `:1573` the neck part using `masked`; `:1629-1650` `case
  'trilens': { ... }` (balaclava, strap, three lenses pushed to `this.lenses`, glows pushed to `this.glows`).
  `LENS_OFF` / `LENS_ON` (`:224-225`) stay used by `setLensGlow` (`:1760`); `lenses` / `glows` (`:1738-1739`) stay.
  `tsconfig.json` has `noUnusedLocals`: an unused import fails tsc.
- `tests/economy.test.ts:66-68` expects the operator's suit look to keep `helmet: 'trilens'`.

## Build
Step 1 - R16 (commit "J19 S4: every guard kind armed (R16)", push):
1. `src/config/enemies.json`: replace the runner's `"weapon": null` (`:59`) with a copy of the grunt's weapon block
   (`:13-24`, same keys, same order, same values). Keep the runner's `"melee"` block and `"gun": null` unchanged
   (BRIEF A7; no AI change). Keep the file's 2-space JSON formatting.
2. `tests/enemyArms.test.ts` (new), header comment: "(J19 S4, R16, G298) Every human guard kind carries a weapon block;
   every placed or spawned kind is armed or a dog." Cases:
   - (a) `import { ENEMIES, ENEMY_KINDS } from '../src/ai/enemyDefs'`. A local helper
     `unarmedHumans(defs: Record<string, { quadruped: boolean; weapon: unknown }>): string[]` returns the kinds with
     `!quadruped && !weapon`. Assert `unarmedHumans(ENEMIES)` is `[]`. Teeth: a shallow copy of `ENEMIES` whose runner
     is `{ ...ENEMIES.runner, weapon: null }` gives `['runner']`.
   - (b) The runner's weapon block `toEqual` the grunt's; its `melee` is not null (pins A7: armed, melee kept); its
     `gun` is null.
   - (c) Every map: as `tests/detailPass.test.ts:12-16` (dynamic `import('../src/world/levelBuilder')` and
     `import('../src/world/maps')`), for each `map` of `MAPS`: `const lay = map.build(new LevelBuilder(), 1)`, then
     every slot of `(lay.rooms ?? []).flatMap((r) => r.squad ?? [])`: `ENEMIES[slot.kind]` is `quadruped` or has a
     weapon (message `${map.id} ${slot.kind}`). Also assert that the warehouse's squads include a `runner` (the scan has
     a real subject).
   - (d) Mode spawn lists: read every `src/game/modes/*.ts` with `node:fs` (`readdirSync` + `readFileSync`), find every
     quoted literal that is an enemy kind (regex built from `ENEMY_KINDS`: `'(grunt|runner|...)'`), and assert each
     found kind is quadruped or armed (message: file and kind). Assert `missionMode.ts` yields `runner` (teeth).
3. `tests/sectors.test.ts`: the three assertions at `:253`, `:262`, `:264` move into one block at the end of that test
   (just before the `// the reinforcements are armed guards` comment at `:265`), run with the runner made unarmed for
   the block only:
   ```ts
   // (J19 S4) every human kind is armed now (G298): an unarmed runner is simulated to keep the M1 check's teeth
   const runnerWeapon = ENEMIES.runner.weapon;
   ENEMIES.runner.weapon = null;
   try {
     // ...the three expects, text unchanged...
   } finally {
     ENEMIES.runner.weapon = runnerWeapon;
   }
   ```
   Keep the `// M1: no melee-only guards; G155: no heavies` comment with the heavy line `:254`. No other edit to the
   file; do not add an assertion that a real runner passes `checkSectorGuards`.

Step 2 - R17 (commit "J19 S4: the comms headset is the default, the three-lens goggle goes (R17)", push):
1. `src/cosmetics/avatarLook.ts`: drop `'trilens'` from `HELMETS` (`:8`); the helmet legacy row becomes
   `helmet: { horns: 'headset', trilens: 'headset' },` with the comment above `LEGACY_LOOK_IDS` extended by one line:
   `(J19 S4, G69) The three-lens goggle left the look: a stored 'trilens' reads as the headset.`; `defaultLook()`
   `helmet: 'headset'` (`:69`); the doc comment `:60` becomes
   `/** The operator (2.0): fitted suit, plate carrier and comms headset, charcoal with an orange accent. */`.
2. `src/cosmetics/catalog.ts`: delete the trilens row (`:65`); the headset row (`:64`) loses its `req` so it is the
   free starter the default look needs: `{ value: 'headset', name: 'Comms headset' },`.
3. `src/progression/suit.ts:95` becomes `if (tier('goggles', s.goggles) >= 1) look.helmet = 'headset';`. Nothing else
   in the file (the gear names at `:40-42` stay: report them, see Report).
4. `src/player/characterRig.ts`, exactly three places:
   - `:3` the import loses `addGlow`: `import { BEACON, GLOW_IDLE, GLOW_VISION } from './goggleGlow';`
   - `:1571-1573`: delete the `// (the balaclava covers the neck)` comment and the `masked` const; the neck part
     becomes `part('limbA', c.skin, 'skin', this.neck, p.neck.r * 2, p.neck.len + H.h * 0.35, p.neck.r * 2.1, 0, -0.04, -0.005, Math.PI - 0.1);`
     (every number unchanged).
   - `:1629-1650`: delete the whole `case 'trilens': { ... }` block (from `case 'trilens': {` through its closing `}`
     before `case 'hood':`).
   Leave `LENS_OFF` / `LENS_ON`, `lenses`, `glows`, `setLensGlow` and their comments as they are (the arrays are now
   empty for every look; `gameState.ts` still calls `setLensGlow`).
5. `tests/economy.test.ts`:
   - `:66-68`: comment `// the operator keeps the suit; goggles show the comms headset; heavy armour plates the legs`;
     expect `{ torso: 'operator', helmet: 'headset', legs: 'armored' }`.
   - New `it` in the same describe, `'(J19 S4, R17) no three-lens goggle: the default is the comms headset, a stored trilens reads as it'`:
     `defaultLook().helmet === 'headset'`; `HELMETS` does not contain `'trilens'`; `sanitizeLook({ ...defaultLook(),
     helmet: 'trilens' }).helmet === 'headset'`; `PART_OPTIONS.helmet` has no `'trilens'` value and its `headset` row
     has no `req`. Imports: `HELMETS`, `sanitizeLook` from `../src/cosmetics/avatarLook`; `PART_OPTIONS` from
     `../src/cosmetics/catalog`.

Step 3 - fragment and report (commit "J19 S4: changelog fragment", push; then the report on `cloud-queue`):
- `changes/feature-player-j19-s4.md` (format `changes/README.md`):
  ```
  # Every guard armed; the comms headset replaces the three-lens goggle
  kind: minor
  - The runner guard now carries the guard's rifle stats, so no guard kind is unarmed (he still fights up close).
  - The operator's default headgear is the comms headset, now free; the three-lens goggle is gone from the look menu,
    and a saved look that wore it shows the headset.
  ```

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
- `npm run typecheck:fast`
- `npx eslint src/cosmetics/avatarLook.ts src/cosmetics/catalog.ts src/progression/suit.ts src/player/characterRig.ts tests/enemyArms.test.ts tests/economy.test.ts tests/sectors.test.ts`
- `npx vitest run tests/enemyArms.test.ts tests/economy.test.ts tests/sectors.test.ts tests/cosmetics.test.ts tests/save.test.ts tests/campusS2.test.ts tests/campusS3.test.ts tests/campusS4.test.ts tests/ctcourse.test.ts tests/guardAiAlloc.test.ts tests/animSkeletonGuardIdentity.test.ts tests/mocapGuards.test.ts tests/rig.test.ts tests/animRig.test.ts tests/operatorsRuntimeFigure.test.ts tests/net.test.ts tests/changesFragments.test.ts`
  (add `--maxWorkers=2` on a small box). Run Step 1's files after Step 1, the whole line after Step 2.
- A failing file outside this list that you did not touch: re-run it once on the base sha; if it fails there too, list
  it as pre-existing in the report and go on.

## Done when
- `git diff --stat 29f03b6c004bf8dae66eea9c434160b6b1db061c` lists only the nine files above.
- `git grep -n "trilens" -- src tests` shows only `avatarLook.ts`'s legacy row and the new economy test case.
- `git diff 29f03b6c004bf8dae66eea9c434160b6b1db061c -- src/player/characterRig.ts` has exactly the three hunks of Step
  2 item 4 (import line, neck, deleted case).
- tsc and eslint clean; every vitest file above passes.
- Three commits pushed to `origin feature/player-j19-s4`, each with the trailer
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Then append `## Report` below and set line 1 to `status: done feature/player-j19-s4 <sha>`; commit, push `cloud-queue`
  (rebase on reject).
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.

## Report (fill in)
- Branch, the three commit shas.
- What changed, file:line per Step item.
- Tests: names and pass counts per file; tsc / eslint results; any pre-existing failure with its base-sha run.
- `trilens` / "tri-lens" left anywhere in `src`, `scripts`, `docs` (file:line, not fixed: e.g. the suit gear names
  `suit.ts:40-42`, `brightnessScreen.ts:25`, `scripts/gen-icons.mjs:63`, `docs/systems/world-and-characters.md:251`,
  comments in `characterRig.ts` / `goggleGlow.ts` / `gameState.ts:2664`) for the lead's polish list.
- Deviations from this brief, each with the reason.
- Every e2e is pending PC run: CORE, `e2e-park`, `e2e-cosmetics`, `e2e-progression`, `e2e-move`, `e2e-anim`,
  `e2e-stealth`, `e2e-clip`, plus `e2e-coop` and `e2e-netmove` (the lead requests them: `src/player`), and `e2e-modes` /
  `e2e-levels` (they spawn the runner).
