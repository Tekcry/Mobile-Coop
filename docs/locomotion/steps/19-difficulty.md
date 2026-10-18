# Step 19 - difficulty (Block C)

Custom difficulty: sliders for guard perception speed, guard aim and alarm tolerance, plus the existing presets; the
host's values apply in co-op; persisted in Settings (D7, A3). Deps: 18. Model: implementer opus; checker opus (all subagents opus from step 06, Michael 2026-10-13)
(src/net). Assumes Block A (`execute` / `sonar` fields gone from DifficultyDef) and steps 09-18 (PROTOCOL_VERSION 9,
`DifficultyDef.medkits` from step 15). Line numbers verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- DECISIONS.md D7, A3; docs/design-bible.md 964-992 (5.13 damage by difficulty), 518-525 (alarm level), 662-680 (C2)
- src/ai/archetypes.ts 148-179 (Difficulty, DifficultyDef, DIFFICULTY, `parseDifficulty`)
- src/ai/enemy.ts 265-275, 480-485, 612-620, 1110-1116, 1448-1465 (every `DIFFICULTY[` read)
- src/ai/enemyManager.ts 160-172 (radio :169), 630-640 (:636); src/ai/alarm.ts 8-20 (ALARM, holdTime :12)
- src/game/stealthSystems.ts 50-65, 200-235 (alarm raise path); src/progression/rewards.ts 60-70
- src/net/protocol.ts 145-152 (`lobby` :147, `start` :151), 425-440 (lobby parse :428); src/net/coopUi.ts 260-270
  (DIFF_OPTS :267), 350-395 (lobby rows, `setSettings` :365-389); src/net/session.ts grep `difficulty`
- src/ui/screens/playScreen.ts 85-155 (difficulty choices :94, :147); src/core/settings.ts 140-160, 260-270, 460-480

## Task
1. Three multipliers, 0.5-2.0 in 0.1 steps, Normal = 1.0: `perception` (sight / smell meter rates), `aim` (guard
   accuracy), `alarm` (alarm tolerance: higher = guards take longer to call in and to raise a panel). Presets map to
   sliders: Rookie 0.7 / 0.7 / 1.35, Normal 1 / 1 / 1, Realistic 1.3 / 1.3 / 0.8, Perfectionist 1.5 / 1.3 / 0.7
   (today's perception, accuracy and reaction values).
2. ASSUMED (logged): alarm tolerance scales the radio call-in delay (`ALERT.callIn x reaction`, enemy.ts:616) and the
   panel raise time (`ALARM.holdTime`); it does not change a mission's failing alarm count.
3. `Difficulty` gains `'custom'`; pure `resolveDifficulty(preset, custom | null): DifficultyDef` in archetypes.ts.
   Custom takes damage, hp, medkits and reward from its base preset (the last preset picked; Normal by default) and
   the three sliders from the custom values. `parseDifficulty` accepts 'custom'.
4. Every `DIFFICULTY[ctx.difficulty]` read in src/ai goes through one resolved def held on the enemy context / manager
   (resolved once at match start; no per-frame lookups or allocation).
5. UI: the play screen difficulty choice adds Custom, which shows three sliders and the base preset; moving a slider
   on a preset switches to Custom from that preset. Fully usable by pad and mouse.
6. Persistence (A3): `gameplay.customDifficulty {base, perception, aim, alarm}` in Settings (sanitized, clamped,
   defaults Normal); no SAVE_VERSION change.
7. Co-op, the host's applies (D7): `lobby` and `start` carry `dc?: {b, p, a, t}` when difficulty is 'custom' (parse
   clamps 0.5-2.0, base must be a preset). Clients show the host's values read-only in the lobby (coopUi rows); the
   AI runs only on the host, so clients never apply their own sliders. A client's own settings are untouched.
8. Results and rewards (parked) use the base preset's reward multiplier.
9. PROTOCOL_VERSION 9 -> 10.

## Tests
- tests/difficulty.test.ts: presets map to the slider table; `resolveDifficulty` per preset equals today's values
  for perception / accuracy / reaction; custom clamps; base preset fields carried; parse of 'custom' and old names.
- tests/enemy (existing perception tests): perception 0.5 halves the meter rate; alarm 2.0 doubles call-in and raise.
- tests/net.test.ts: `lobby` / `start` with `dc` parse and clamp; a non-custom lobby ignores `dc`.
- tests/settings.test.ts: a literal settings object without `customDifficulty` sanitizes to Normal sliders.
- e2e-pad: pick Custom, set perception 0.5 with the pad, start Proving: the host manager's resolved def has 0.5.
- e2e-mouse: the same with mouse drags; reset to a preset restores its values.
- e2e-coop: the host sets Custom (perception 0.5, alarm 2.0); the client lobby shows them; in the match the host's
  resolved def has them; the client's own stored sliders are unchanged.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-coop e2e-netmove e2e-stealth-ai
  e2e-missions e2e-pad e2e-mouse`
- Grep proofs: `grep -rn "DIFFICULTY\[" src/ai` shows only the resolver; `grep -n "dc" src/net/protocol.ts` shows type
  and parse; PROTOCOL_VERSION = 10; `grep -rn "localStorage" src/core/settings.ts` empty.
- Block C end (after this step): full `npm run e2e` in the background + `node scripts/perf-trend.mjs` (sim p95 <= 3.31
  ms, anim <= 0.063 ms / char on this VM); "rerun after 20" items listed in STATE.md.

## Commit
"locomotion 19: custom difficulty sliders, host's difficulty in co-op"
Then LOG, STATE, AUDIT (V07), CHANGELOG, TESTING, docs/systems/ai.md, coop.md, ui.md.
