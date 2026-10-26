# Guard AI J16: character shadows in guard perception (plan)
Owner: Guard AI Build. Status: current.

Lead: Guard AI Build. Planner: Opus 5.5, master 1b20393c7. Brief: `docs/guard-ai-j16/BRIEF.md`. Contract and data:
`docs/char-shadow-meter/PLAN.md` sections 2 and 6 (master copy; line numbers there are stale, the anchors below are not).

## 0. Where J16 stands on master (2026-10-27)
Landed dark behind `charShadowLight`: #459 A1, #481 A2 (contract `src/world/charOccluders.ts`, field term
`lightField.ts:301`, `:466`), #489 B1 (`src/world/shadowCues.ts` + the field's Q slots, `lightField.ts:373`, `:454`), #557
S2c (a client's partners, `src/net/charMates.ts`). The meter reads the contract (`gameState.ts:1776-1795`); the interim
guard fill is `fillVictims` (`charOccluderFill.ts:125`, called at `gameState.ts:1860`). No open J16 PR; every
`feature/char-shadow-meter*` branch is merged or stale (0 commits ahead of master; `-s2` has 5 stale commits).
**Sector Ops still has to land:** S3b-2 (`GameState.shadowCues`, built when the flag is on and not a client, filled at
10 Hz after the meter in `updateLight`; `docs/char-shadow-meter/briefs/S3b.md:50-70`) - until then `ShadowCues` has no
call site and the cue reads nothing; S4 (parity card, e2e-stealth-ai meter block, e2e-coop probe; after J11 PR B); S5
(settings help strings). Only S3b-2 blocks Guard AI (G4b, G5). S4, S5, J10's re-bake and the walk cap gate switch-on.

## Claims
```claims
files:
  - src/ai/guardOccluders.ts
  - src/ai/shadowNotice.ts
  - src/ai/enemy.ts
  - src/ai/enemyManager.ts
  - src/ai/body.ts
  - src/game/gameState.ts
  - tests/guardOccluders.test.ts
  - tests/shadowNotice.test.ts
  - tests/shadowNoticePerceive.test.ts
  - scripts/e2e-stealth-ai.mjs
  - docs/systems/ai.md
  - docs/guard-ai-j16/**
maps: none
protocol: none
save: none
```
Co-op: host and solo only (`EnemyManager` exists only there, `gameState.ts:741-749`; `shadowCues` is null on a client).
Shared with Sector Ops: `gameState.ts` (G4a / G4b lines `:749-770`, `:1860`; S3b-2's lines `:385-400`, `:1776-1795`)
and `scripts/e2e-stealth-ai.mjs` (G5's own scenario block; S4 adds a separate meter block). Order: G4b after S3b-2 is on
master; G5 and S4 either order, the second rebases (no shared lines).
claims-check (2026-10-27, this PLAN): src/ai/enemy.ts, enemyManager.ts and e2e-stealth-ai.mjs with
guard-ai-mission-hooks (+ s1a1-s4) and marlow-kit-wire / piano-escape-s6 / piano-knife-s4b (guard-rules claims);
gameState.ts with ~60 branches (mission-rules / tallow, piano-escape, map-ready, coop-kit, player-batch-j19). New
lines only (a new method, a new block, one call); the orchestrator orders G3 behind piano-escape (main focus).

## Slices
**G1 Occluder shapes (Opus). Start now.** New pure `src/ai/guardOccluders.ts` (no Babylon, no rig): `guardOccR(build,
scale)` (the hit capsule's `bodyR`, `hitVolumes(proportions(...))`, called once per guard and body, never per step);
writers into a `CharOccluders` through a module `Float64Array` scratch and direct `cap` / `owner` writes (as
`charOccluderFill.ts:84` `put`: no double crosses a call): `putGuard` (a = feet + 0.25, b = sim head, r), `putDog`
(rump to sim head at `DOG_BODY_Y`, r 0.15), `putBody` (pelvis along `headYaw` by `headReach`, r `lieLift`); cull by
`FILL.reach` from any `pin` slot; returns -1 when full (BRIEF A7, A9).
- Files: src/ai/guardOccluders.ts (~140), tests/guardOccluders.test.ts (~200). Est. lines: ~340.
- Checks: `npm run typecheck:fast`; vitest guardOccluders, charOccluders, charOccluderFill.
- Done looks like: standing vs crouched head gives a lower top; dog lies along its yaw; body along `headYaw`; owner keys
  from `num`; past `OCC.max` returns -1; `allocPerCall` 0 for each writer; a source grep finds no Babylon, quality,
  governor, `charShadowSet` or rig import.

**G2 The notice rule (Opus). Start now, beside G1.** New pure `src/ai/shadowNotice.ts`: `SHADOW_NOTICE` (section 1) and
`noticeInto(cues, slot, gx, gz, yaw, out)`: over the slot's footprints, the nearest point that passes contrast, speed,
range and cone, written to `out` (x, y, z, contrast), returns its index or -1. Inputs through a module scratch.
- Files: src/ai/shadowNotice.ts (~110), tests/shadowNotice.test.ts (~200). Est. lines: ~310.
- Checks: tsc fast; vitest shadowNotice, shadowCues.
- Done looks like: a decision table (each gate failing alone gives -1; all passing picks the nearest; the moon source
  -1 works as a lamp); `SHADOW_NOTICE.meter` > `PERCEPTION.suspicious` and < `HEARING.turnMax` < `investigate`;
  `allocPerCall` 0; imports nothing from src/game, src/net or graphics.

**G3 Wiring in src/ai (Opus). After G1 + G2 on the job branch; no Sector Ops wait.** (1) `EnemyManager.fillOccluders(occ,
pin, n): number` (guards, dogs, lying bodies; skips dead, carried, hidden; returns the overflow) and two fields
`chars: CharOccluders | null`, `cues: ShadowCues | null` (null by default), passed in `AiContext` (`enemyManager.ts:634`).
(2) The contract and owner key in every guard-side light read: bodies (`enemyManager.ts:4110`, skip the body's key),
`witnessKill` (`:1917`, skip the victim's), `fieldLight` (`enemy.ts:251`, a `skip` argument; callers `:2759`, `:2821`
pass `occKey(OCC_KIND.player, i)`). `Body.num` (body.ts:74). `Enemy.occR` cached at spawn. (3) The cue in
`Enemy.perceive` (`enemy.ts:2669`), after the player loop: `shadowLook()` applies section 1's gates, calls `noticeInto`
per unseen player, casts one ray to the nearest, and on a clear ray does the `hearTurn` reaction (`:1367`) with the
meter floor 0.35; it records `cueT`, `cueX`, `cueZ`, `cueSlot`.
- Files: src/ai/enemy.ts (~+70), src/ai/enemyManager.ts (~+60), src/ai/body.ts (~+5),
  tests/shadowNoticePerceive.test.ts (~220, stand-in guard on Enemy's prototype as tests/coopPerception.test.ts does).
  Est. lines: ~355.
- Checks: tsc fast; vitest shadowNoticePerceive, coopPerception, perception, guardOccluders, shadowNotice, alertState;
  affected-e2e on the laptop (e2e-stealth-ai with the flag off: unchanged).
- Done looks like: with `chars` / `cues` null every path is byte for byte today's (existing tests unchanged); a calm
  guard with a qualifying point in view turns to it with meter 0.35 and stays below `investigate` over 30 s of repeated
  cues and after they stop (alertState stepped); a seen player, an alerted, passive or dog guard, a blocked ray: no
  reaction; at 3+ players the ray counts in `maxRays`; `allocPerCall` 0 for a think with cues.

**G4a Occluder fill call (Opus). After G3.** In `fillChars` (`gameState.ts:1860`): `this.enemyMgr ?
this.enemyMgr.fillOccluders(occ, L, n) : fillVictims(...)` (client keeps puppets); `enemyMgr.chars =
this.charOccluders` after construction (`:765`). Est. ~15 lines. Checks: tsc fast; vitest charOccluderFill,
guardOccluders; affected-e2e plus requested `e2e-coop,e2e-netmove` (src/game gate). Done: flag on, warehouse, a guard
standing between a lamp and you drops your meter as before (A2's probe) and a lying body is darker with you over it.

**G4b Cue hook (Opus). Waits on Sector Ops S3b-2 on master.** `enemyMgr.cues = this.shadowCues` (`:765`). ~3 lines.
Checks as G4a. Done: flag on, solo or host: `__game.enemyMgr.cues === __game.shadowCues`; a client has no manager.

**G5 E2E scenario (Sonnet, strict Opus brief). After G4b.** A `shadowCue` block in `scripts/e2e-stealth-ai.mjs` on its own
`?charlight=1` page (Warehouse; lamp, guard and spot picked from `sourcesInto` by the builder): the guard parked facing
a floor spot, the player behind him (sight rate 0) walking so his shadow crosses the spot. Asserts: the guard reaches
`suspicious`, `cueT` < 1 s, faces the point, never `investigating` / `alert` over 20 s; player standing still: no
reaction; flag-off page: no reaction. Never pins the meter by replacing `updateLight` (that stops the cue fill,
S3b brief :63-64). ~160 lines. Checks: `node --check`; laptop `--suites "e2e-stealth-ai"`.

**G6 Docs (Sonnet). After G3, beside G4 / G5.** `docs/systems/ai.md:58-62` (G352 / G379 "not built yet" -> built dark)
and a "Shadow cue" paragraph in "Stealth AI" (`:67`) with section 1's numbers and A1-A11. ~25 lines.

PRs (each two independent Opus checkers): **PR 1** = G1 + G2 + G3 (~1.0k, no call site: dark by null fields). **PR 2**
= G4a + G4b + G5 + G6 (~0.2k), after S3b-2; G4a may ship alone first if S3b-2 is late.

## 1. The cue rule (fixed; BRIEF A1-A6)
`SHADOW_NOTICE = { enabled: true, contrast: 0.40, moving: 0.3, near: 1, range: 10, half: PERCEPTION.focusHalf, meter: 0.35,
slack: 0.2 }`. On each think (~4 Hz) a guard who is not alerted, passive, a dog or lured, at unaware / cooldown /
suspicious with no incident task, who sees nobody this think (every player's sight rate <= `leak` 0.2) and whose calm
moment does not rest on sight (`sawMoment` false; G3 fix round), takes every live player whose `cues.slotOf(id)` >= 0;
a point qualifies when contrast >= 0.40, its footprint speed >= 0.3 m/s, horizontal distance 1-10 m and |angle| <=
27.5 deg. The nearest one gets one ray from his eye. Clear: meter = max(meter, 0.35), stimulus =
the point, `turnT = ALERT.hearLook` 2.4 s. Against the tiers: suspicious 0.3 (looks, white arc) yes; investigate 0.6 and
detection 1 never from the cue. Why it never escalates: `turning` blocks the linger rule (`alertState.ts:170`) while
cues repeat; after the last, 0.35 drains below `lingerMeter` 0.15 within 2.22 s even at the half rate (0.09/s), before
the 2.4 s look ends, so he calms (`:173`). The margin is the reason for 0.35: above 0.366 it breaks.
The drain starts at once only when the target was not seen (rate > `leak`) in the last `hold` 1.2 s; inside it the
meter first holds: at rate 0 he still calms (1.2 + 1.11 = 2.31 s < 2.4 s), but sub-leak glimpses after the hold (half
drain, up to 1.2 + 2.22 = 3.42 s) can outlast the look and he may investigate; that hold comes from a real glimpse
(RISE_SIGHT), not the shadow, so the escalation is sight's (plan check 1 item 4; `tests/shadowNotice.test.ts`).
Sight first (G3 fix round, check A FIX 1): a guard suspicious from a real glimpse gets no cue while that moment lasts,
so his linger rule fires exactly as with cues off. The other way round is allowed: a cue's suspicion raises his
`aware.sensitivity`, so a sub-leak glimpse of another player can turn into a real one and he may then investigate,
by sight (RISE_SIGHT). In `tests/shadowNoticePerceive.test.ts` (33 glimpse cases) he never investigates less with
cues on, and 3 cases (1.5-3 s at light 0.3) investigate only with cues on, each by sight.

## 2. Hot path (per think, per guard)
Nothing allocates: module typed-array scratch, `hyp2`, `Math.atan2`, `wrapAngle`; `slotOf` is a string scan; the ray
uses a member `Vector3` and `losClear`'s `hitDistance` path. Cost: <= 4 players x 3 footprints x 3 points of arithmetic
and <= 1 ray, only for calm guards with a non-null `cues` and `count[slot]` > 0. `fillOccluders` runs every sim step:
no closures, no iterators, no double across a non-inlined call. Each slice's vitest asserts `allocPerCall` 0.

## Flags (dark until accepted)
| Flag | Default | Owner | Switch-on date | Switches on when |
| --- | --- | --- | --- | --- |
| `charShadowLight` (`?charlight=1`; on by default on /preview/) | off | Sector Ops Build | after J10, S4, S5, PR 2 | Michael's yes on the walk item below (char-shadow BRIEF A9), walk cap permitting |

## Walk items
- Warehouse, `?charlight=1`: a guard facing your shadow grows suspicious - accept when, walking so your moving shadow
  crosses in front of a guard who cannot see you, he stops and looks at it (white arc) and never walks over or spots you
  from the shadow alone; standing still, he does not react.

## Risks
- The cue spot in G5 needs a strong lamp and a long shadow; J10's re-light may move it (re-pick, as S4's section 5).
- A client's picture has no dog or body capsules (puppets are upright): picture only, dark flag; Player / Sector Ops
  polish list.
- `CUE.minLevel` 0.08 lets dim shadows count; if the walk says so, raise `SHADOW_NOTICE.contrast` first.
