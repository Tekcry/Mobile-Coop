# C2 brief: co-op client guard puppets in the render freeze (for Night Shift | Test Runner)

Job guard-cap (lead Night Shift | Marlow Build, `docs/guard-cap/PLAN.md` slice C2, BRIEF A2 / A5). Written 2026-10-25
by the Opus planner on origin/master 833db92e (train 76); file:line on that commit. Brief now; build at the gate below.
Re-check every line after coop4 #317, C1 and Guard AI's shadow rule merge (they all touch these files).

## Owner, model, branch
- Owner: **Night Shift | Test Runner**, as a **PLAN2 addition** (`docs/guard-render/PLAN2.md`): guard render is Test
  Runner's area (CLAUDE.md "Sessions" table) and it owns the freeze files since guard-render-2 (PLAN2 S10, train 64).
  Test Runner adds one PLAN2 row "C2 (guard-cap): client puppets in the render freeze" pointing here. Marlow Build is the
  job lead: Test Runner messages it at PR open, train-ready, blocked; Marlow Build writes the REPORT section.
- Model: Opus build (render engine + `src/net` code), two fresh Opus checkers (`src/net` PR), one fix round at most.
- Branch `feature/guard-cap-c2` off origin/master (at the gate), folder `C:/NightShift/Mobile-Coop-guard-cap-c2`
  (`git worktree add`), its own PR (`src/net`), never merged into `feature/guard-cap`. Guard before every write:
  `cd /c/NightShift/Mobile-Coop-guard-cap-c2 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-cap-c2 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-guard-cap-c2"`

## Why (REPORT.md "2026-10 co-op measure (M1) and run 4100")
Guards off-screen (cell `away`, 2 players), the co-op client pays +1.8 to +2.6 ms frame CPU p95 over the host at 24 / 32
(campus +1.9 / +2.6, Sector Ops +1.8 / +2.2). About half is render: +88 to +104 draws with equal active meshes, because
off-screen puppets still cast into every shadow map (the client has no render freeze: SectorMode and its
`SectorGuardFreeze` exist only on the host, `gameState.ts:697` client branch, `sectorMode.ts:331-339`). The other half
(rig solves) is C1. C2 removes the puppets that cannot reach the screen from the evaluation, skeleton prepare and every
shadow draw, and, with C1's `GuardAnimTier` on the puppet, from the pose solve (the FROZEN tier reads the disabled root).

## Gate (all on origin/master before the first commit)
1. coop4 #317 merged (it holds `coopClient.ts`, `sectorMode.ts`).
2. C1 merged (`EnemyPuppet` has its `GuardAnimTier`, `tier.skipped`, `die()` solve-if-skipped; `docs/guard-cap/briefs/C1.md`).
3. Guard AI's "shadow in view = seen" rule merged in `src/ai/animTierView.ts` (Michael 2026-10-25 ~08:50: "Yes, shadow in
   view = seen"; T1 #360 / guard-ai A183 rework). C2 reuses that predicate; it never writes a second copy (below).
4. `scripts/guard-cap-coop.mjs` on origin/master with a `--query=<k=v&...>` option (appended to every page's params).
   Marlow Build adds the option on `feature/guard-cap` and ships it in its batch PR; until it is on master the measure
   steps start with `git show origin/feature/guard-cap:scripts/guard-cap-coop.mjs > scripts/guard-cap-coop.mjs`.
Check: `git fetch -q origin && git diff --name-only origin/master...origin/<b> -- src/net src/game src/ai` for each open
branch; a branch still holding a file below waits (or ask Marlow Build).

## The rule (exact)
**Freeze (unchanged from the host, applied to puppets).** Once per camera evaluation, before the active meshes are
picked, a puppet is frozen (its rig root disabled) when neither his body nor any shadow of his can reach the screen:
- frustum: `guardFrustum` returns 0 (body sphere, moon capsule and each shadowing lamp / atlas slot's shadow volume of
  him all outside the frustum), or
- occlusion: the frustum bits are > 0 and `occluded3` finds every sample point hidden by static geometry: his body
  points, his moon-shadow landings, and each in-frustum lamp shadow's landings (a lamp probe with no landing = seen).
Everything else of the host freeze holds as is: `FREEZE_DRAW` near the camera / unknown lights, `RETEST`, `HOLD`, `CUT`,
`EDGE`, `STALE`, the view epoch, the see-through ray, the atlas slots. No new numbers.

**Shadow in view = seen (Michael's decision, not pending).** A puppet whose shadow falls in view counts as seen: he is
never frozen (the rule above already draws him: a shadow volume in the frustum whose landing the camera sees), and his
anim tier treats him as on screen (full rate, no 1/4-rate shadow). The anim side is Guard AI's predicate in
`src/ai/animTierView.ts` (the name it lands with; C2 imports it, never re-derives it). C2's only job there is to give
puppets the same inputs host guards get:
- If Guard AI's predicate lives inside `GuardAnimTier` and needs nothing from the freeze, puppets get it through C1's
  `GuardAnimTier` with no C2 code; C2 adds a test that proves it on a puppet.
- If it needs the freeze's per-guard shadow bits (the likely shape), the freeze reports them through the accessor's
  `shadow(e, inView)` hook (below), defined once for host guards and once for puppets, both forwarding to the same
  `GuardAnimTier` input Guard AI defines. `inView` = not frozen this evaluation AND (`bits === FREEZE_DRAW` or
  `bits & (FREEZE_SHADOW_IN | FREEZE_LAMP_IN)`). If Guard AI already wired the host hook, C2 adds only the puppet side.
- No C2 constant: the rule is decided. If Guard AI keeps a switch, it is theirs and C2 follows it.
- Shadow newly in view while the tier skipped this frame's solve: pose now (the `thawPose` path), so the first frame
  with his shadow in view is current.

**Not frozen ever:** dead (`alive` false), `taken`, partner-held (`partnerHeld` / `remoteHold`), a dog (`dog` model),
not yet placed (`placed` false: his rig is disabled until the first snapshot places it), a disposed rig.

**Render only.** The client's light field, meter, torches (`TorchMirror` from pos / yaw / st), hit volumes (`guardHead`
on wire inputs, `hitboxes.sync` every frame), takedown reach and carry never read the root's enabled state or the pose.
Light parity holds: a shadow that can reach the screen is always drawn.

## Files (owned by this slice; nothing else)
| File | Change |
| --- | --- |
| `src/game/sectorGuardFreezeView.ts` | (1) `FreezeGuards<T>` (`readonly enemies: readonly T[]`) and a `FreezeAccess<T>` interface: `root(e): TransformNode \| null` (the root the freeze may disable now, null = leave as is), `height(e): number`, `thaw(e): void`, `shadow(e, inView: boolean): void`. (2) `export const ENEMY_FREEZE: FreezeAccess<Enemy>` = today's checks (`alive && !taken && dog === null && !bodyRig.root.isDisposed()` -> `bodyRig.root`; `def.height`; `thawPose()`; `shadow`: no-op unless Guard AI's hook exists). (3) `SectorGuardFreeze<T = Enemy>` gets a 6th ctor param `access: FreezeAccess<T> = ENEMY_FREEZE` (existing calls and tests unchanged). (4) The frozen list keeps the root it disabled beside each body (`frozenRoot: TransformNode[]`): the keep test (`:213-217`) becomes `access.root(e) === frozenRoot[i] && list.indexOf(e) >= 0`; `thaw` (`:446-457`) enables the stored root unless disposed, then `access.thaw(e)` (a puppet's rig is null after `die()` / `dispose()`, so `bodyRig` must never be read). (5) `export function guardFreezeInputs(world, ballistics)` returning `{ ray, views, atlas }`: the see-through ray, view epoch and atlas exactly as `sectorMode.ts:331-338` builds them (moved, not copied). |
| `src/game/modes/sectorMode.ts` | `:331-339` builds through `guardFreezeInputs` (same behaviour). Nothing else. |
| `src/net/enemyPuppet.ts` | Store `scene`. `get freezeRoot(): TransformNode \| null` (null for the "not frozen ever" list). `thawPose()`: if alive, placed, not a dog and the rig is live: `tier.solveNow(rig, 0, rp)` and `gbody?.figure.update(scene.activeCamera)` (as `Enemy.thawPose`); else nothing. The shadow hook (only if Guard AI's predicate needs it): one field written by the freeze, read by `update` into the tier input. |
| `src/net/coopClient.ts` | In the `g.opts.mode === 'sector'` block (`:188-212`): when `flags.guardFreeze && flags.puppetFreeze`, `new SectorGuardFreeze(g.scene, guards, ray, views, atlas, PUPPET_FREEZE)` with `guards = { get enemies() { return self.puppetList; } }` (one getter object, made once; the list array is replaced per snapshot, `:485`) and `PUPPET_FREEZE` a module-level const accessor; disposed through `this.offs`. A read-only `get freezeDebug(): { count, occluded, rays }` (-1s when off) for the look and measure scripts. |
| `src/core/flags.ts` | `puppetFreeze` (below). |
| `tests/sectorGuardFreezeView.test.ts` | New `describe` for the accessor (existing cases untouched). |
| new `tests/puppetFreeze.test.ts` | Real `EnemyPuppet`s (reuse C1's `tests/puppetAnimTier.test.ts` builder). |
| new `scripts/c2-puppet-shadow-look.mjs` | The look tool (test script). |
| `docs/systems/testing-tools.md` | One line for the look tool. |
| `changes/feature-guard-cap-c2.md` | Changelog fragment (flag off). |
| `docs/guard-render/PLAN2.md` | The C2 row (Test Runner's own doc). |
Read only: `src/ai/*` (Guard AI: `animTier.ts`, `animTierView.ts`, `enemy.ts`), `src/game/sectorGuardFreeze.ts`.

## Flag
`src/core/flags.ts`: `puppetFreeze: boolean`, `puppetFreeze: params.get('puppetfreeze') === '1'` (default OFF, merges
dark). Doc comment: "(guard-cap C2) Co-op client guard puppets in the Sector Ops render freeze; needs `guardFreeze`
(`?guardfreeze=0` turns both off). Owner Night Shift | Test Runner. Switch-on: when Michael accepts the C2 look item (the
shadow case) on the first walk card after C2's release (target 2026-10-28); the flip PR makes it `!== '0'`." The PR
body and the ROADMAP line (via the orchestrator) carry the same owner and date.

## Must not
- No `src/ai` edit (Guard AI). No second copy of the shadow-seen rule. No change to the host freeze's verdicts (the
  only host difference allowed: a listed guard with a disposed root is skipped instead of touched).
- Single player never imports `src/net` statically: `sectorGuardFreezeView.ts` knows no puppet type; `PUPPET_FREEZE`
  lives in `src/net`.
- Hot path (`step`, the puppet hook, `update`): no closures, iterators, temp vectors or arrays per evaluation; the
  accessor is a module const; `frozenRoot` grows only with the list.
- Gameplay never reads the freeze, the root's enabled state or the pose. No wire change; never write `PROTOCOL_VERSION`.
- No other `coopClient.ts` hunk than the one above.

## Unit tests (`npm run typecheck:fast`, `npx vitest run <files>`)
`tests/sectorGuardFreezeView.test.ts` (fake bodies through a test accessor) and `tests/puppetFreeze.test.ts` (NullEngine,
real puppets):
1. Every existing freeze test passes unchanged (default `ENEMY_FREEZE`); same verdicts, counts and `rays` as before on
   the existing scenes.
2. A puppet list: behind the camera frozen, thawed when the view turns (root enabled, `thawPose` posed once); the
   puppet's head volume and `hitboxes` positions equal frozen vs never-frozen over 60 frames.
3. Never frozen and never re-enabled by the freeze: an unplaced puppet (root disabled before its first snapshot), a dog
   puppet, `taken`, partner-held (a frozen one is thawed at the next evaluation).
4. Death while frozen: `die()` (C1 solves first), the next evaluation enables the stored root (the ragdoll shows), no
   pose call on the dead puppet, no throw. `dispose()` while frozen: dropped, no throw (rig null).
5. The list array replaced (as `coopClient.ts:485` does): the freeze reads the new one; a frozen puppet missing from it
   is thawed or dropped.
6. Shadow in view: a puppet off the frustum with a shadowing spot whose shadow of him lands in view is not frozen and
   solves every frame for 16 frames (Guard AI's predicate true); the lamp off, he freezes and does not solve. His shadow
   entering view on a skipped frame poses him in that evaluation.
7. The flag off (or `guardFreeze` off): the client builds no freeze (`freezeDebug.count === -1`).

## Laptop measure (proof; Test Runner requests, Marlow Build reads)
M1's cells: campus + sectorops, N 24 / 32, 2 players, cells `away` and `alert`, interleaved off / on, 2 repeats, alone
on 4189, on the C2 PR head (flag off by default, so both arms are one build):
```
node scripts/laptop-queue/request.mjs --sha <C2 head, full> --pr <n> --alone --set guard-cap-c2-m1 \
  --requester "Night Shift | Test Runner" --env E2E_GPU=1 --env E2E_PORT=4189 \
  --step "node scripts/guard-cap-coop.mjs --maps=campus,sectorops --counts=24,32 --cells=away,alert --players=2 --warm=5 --secs=10 --query=puppetfreeze=0 --out=C:/NightShift/scratch/guard-cap/c2-<sha8>-off-r1" \
  --step "... --query=puppetfreeze=1 --out=C:/NightShift/scratch/guard-cap/c2-<sha8>-on-r1" \
  --step "... --query=puppetfreeze=0 --out=...-off-r2" --step "... --query=puppetfreeze=1 --out=...-on-r2"
```
(Prefix the `git show` step from Gate 4 if the script is not on master.) Read medians of r1 / r2, client page. Pass:
- `away` 24 / 32: client draws <= host draws + 20 (M1: +88 to +104) and client render() CPU median down >= 0.8 ms at 32
  vs off; client minus host frame CPU p95 <= 1.0 ms with C1 in (PLAN rule). Draws pass but the 1.0 ms fails: report it,
  Marlow Build decides the next step.
- `alert` (facing) 24 / 32: on vs off client frame CPU p95 within +0.3 ms (the occlusion rays' cost); puppets alive equal.
- `freezeDebug` per cell in the log (count / occluded / rays).
Results: Test Runner pushes the four out dirs to `origin/feature/guard-cap-results` `docs/guard-cap/run-c2/`, one
message to Marlow Build, which writes the REPORT section.

## Look check (for Michael's switch-on)
New `scripts/c2-puppet-shadow-look.mjs` (test script, headless, `E2E_GPU=1`, port 4189; modelled on Guard AI's
`scripts/t1-shadow-look.mjs` on `origin/feature/guard-ai-t1-anim-tier`, copied patterns, that file untouched): two pages
over `?net=local&gfx=epic&sectorGuards=0`, Sector Ops `campusOps`; the host page spawns one passive grunt walking a
straight leg past a shadowing lamp (or under the moon); the client page's camera is fixed so his body leaves the frustum
while his shadow stays in view, then turns until both are out. Two passes, `puppetfreeze=1` and `=0`, same scene.
Outputs (`C:/NightShift/scratch/guard-cap/c2-look/<sha8>/`): a contact sheet per pass (rows of frames, each tile labelled
F = frozen / S = solved / . = skipped, his shadow pixels), a compare sheet (on row over off row), and a 1-2 min client
video (Playwright `recordVideo`, headless) of the guard leaving view with his shadow in view, then the shadow leaving.
Asserts (exit 1 on fail): while his shadow pixels > 0 the puppet is never frozen and solves every frame; no frame where
the on pass shows 0 shadow pixels and the off pass shows any (no pop); frozen only once body and shadow are both out.
Run it in the same alone request (`--step "node scripts/c2-puppet-shadow-look.mjs"`); the PR body names the sheet and
video paths for the walk card.

## e2e (laptop queue, on the PR head)
`node scripts/run-e2e.mjs --affected origin/master --list` on the head (src/core -> CORE, src/net -> the co-op group,
src/game/modes -> sectorops), and at least: `e2e-coop`, `e2e-netmove` (src/net and src/game touched), `e2e-sectorops`
(with coop4's 4-page cells), plus guard render's suites (PLAN2 S10): `e2e-stealth-ai`, `e2e-darkness`. The flag is off
in these runs (dark-merge safety); the flip PR reruns `e2e-coop`, `e2e-netmove`, `e2e-sectorops` with it on.

## Done / estimate
PR open (under ~1.5k lines), both checkers PASS (commit status `checker`), CI green, suites green, measure + look in,
`train-ready` label, message Marlow Build and the orchestrator (flag owner and date for the ROADMAP). Then the look item
goes on the walk card. ~3 h build, 1 h checks, ~1.5 h laptop (suites, measure 4 x ~8 min, look).
