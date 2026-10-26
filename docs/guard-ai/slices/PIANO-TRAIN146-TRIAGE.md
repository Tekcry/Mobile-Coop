VERDICT: (c) test bug in #583 (feature/mission-d-wharf), not #624. The wharf e2e kills a guard with one headshot bullet on Realistic, where every guard wears a helmet; the shot knocks the helmet off and he lives. #624 goes back to train-ready.

# Train 146 triage: e2e-sectorops wharf-tgc / wharf-tkl (PR #624 dropped)

Train 146 head 21a2eba45. Members: knife-alloc-fix, laptop-queue-16, guard-ai-piano-sweep (#624), piano-knife-s4a,
piano-lights-so5, mission-d-wharf (#583), route-runs-r4c, validator-port-c2, menu.

## Evidence

1. The failing parts are #583's own new suite. `scripts/e2e-sectorops-wharf.mjs` and the whole Tallow map
   (`src/world/maps/tallowWharf*.ts`) are not on origin/master; they arrive in train 146 with #583. They have never
   passed anywhere: laptop runs 20261025T070157 / T102656 / T190601 fail in setup, T122139 / T130746 fail at "the client
   mission HUD shows rows". Train 146 is the first run that got as far as the kills.

2. Both failures are the lethal kill hook, and only it. The same hook with `nonLethal: true` works in the same run
   (rerun-e2e_sectorops_wharf_tgc.log: "Fenn ... is knocked out by the host", "Teale (W2:6) (e16) is knocked out by the
   host" pass); the lethal call right after fails:
   - TGC: `ok - Teale (W2:6) (e26) is killed by the host` then `FAIL ... timed out waiting for Teale (W2:6) is down (a
     kill: !alive && !ko)`.
   - TKL: `FAIL ... ASSERT: a kill breaks No kills ({... "breaks":0 ...})`.
   Same in 4189.log / 4192.log and the reruns: deterministic, not a flake.

3. The hook (scripts/e2e-sectorops-wharf.mjs:324 `down()` and :941 the TKL break) is
   `e.applyDamage({ amount: 9999, part: 'head', kind: 'bullet', ... })`, copied from e2e-sectorops-mission.mjs:84,
   which runs on the default difficulty. The wharf suite runs on Realistic (e2e-sectorops-wharf.mjs:58, :658).

4. Realistic helmets every human guard: `DIFFICULTY.realistic.helmets: 'always'` (src/ai/archetypes.ts:209, on master),
   applied by `EnemyManager.useDifficultyHelmets` / `ruleHelmet` (src/ai/enemyManager.ts ~1151-1185, on master). In
   `Enemy.applyDamage` (src/ai/enemy.ts ~2487) a bullet to the head of a helmeted guard goes through `gearHit`
   (src/ai/gear.ts:149): `mult 0, knockOff true` -> `deflect()`, no damage, he stays alive and goes alert. The headshot
   kill (`headshot ? this.health.hp`) is only reached after that gate. tests/gear.test.ts:30-35 ("head + helmet: no
   damage, knock-off") and tests/difficulty.test.ts:12 (`helmets: 'always'`) pin this; both pass (29/29).

5. #624 cannot reach this path. `git diff origin/master...origin/feature/guard-ai-piano-sweep -- src` touches no
   applyDamage, die, knockOut, gear, helmet, health or alive code. Its enemy.ts changes are the sweep fields,
   startSweep / stopSweep, the `walker.sweeping` branches in the unaware walk and investigate pace, the hushed barks
   (quietRise, only set by followGlimpse) and the sweep-mate push skip. Its enemyManager.ts changes run only through
   `sceneDark` (darkOn: sceneDarkOn / sceneDarkOff / sweepify), which the Tallow map never sets.

6. Train 147 (1df762e1e) is already built without #624 and piano-knife-s4a, but with #583. It has not run on the laptop
   yet at the time of writing; by points 3-4 it will fail the same two parts.

## Fix (for #583, not this branch)

In scripts/e2e-sectorops-wharf.mjs, make the lethal hook a hit no helmet or vest stops. The simplest is the lethal
takedown's own hit (src/game/takedownController.ts:1073): `part: 'body', kind: 'melee'` (gearHit only touches
bullets). Keep the KO call as is (`nonLethal` passes gear). Lines:
- :324 `down()`: lethal -> `part: 'body', kind: 'melee'`; ko -> unchanged.
- :941 TKL break: `part: 'body', kind: 'melee'`.
Do not switch to a body bullet: Realistic guards with a vest take `mult 0` there too (tests/gear.test.ts:42).

## What next

1. #583's owner applies the fix above on feature/mission-d-wharf and re-runs `e2e-sectorops:wharf-tgc` and
   `e2e-sectorops:wharf-tkl` on the laptop queue (both have never passed; expect later parts to surface new issues).
2. Train 147 will fail these parts too: drop #583 from it (or hold it) rather than blame another member.
3. #624 (e910abee2) goes back to train-ready unchanged.
