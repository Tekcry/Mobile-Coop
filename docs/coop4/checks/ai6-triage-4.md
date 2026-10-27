# AI6 e2e-coop triage 4 (laptop run on 52e3dc13)

Run: `C:/NightShift/scratch/laptop-queue/runs/20261024T115000-night-shift-guard-ai-52e3dc13-6504/4189.log:256` and
`rerun-e2e_coop.log:255`, identical. AI6 (1) and (2) pass; (3) fails at its first assert, the leg finder:
`tried` = 4 spots, each `cell: true, leg: true, cap: [9,17]`, spawned (`at` set), `heard: false`.

## Verdict: test bug (an impossible hearing check in the leg finder)

- `cap [9,17]` is `[em.alive, em.maxAlive]`: 9 live (the mission's statues, (1)'s six despawned), cap 17. The cap is
  fine, and every spawn succeeded (`at` is written only after `em.spawn` returned a guard). No freeze, section or
  spawn-rule refusal; triage 3's despawn worked. "Spawns" is not checked too early: the check is synchronous in one
  `evaluate` and needs no frame.
- The failing part is the hearing check (`scripts/e2e-coop.mjs`, the (3) leg finder, before this fix):
  `[a, mid, b].every(p => d > 1.9 && tierOf(e, i, p, 3, d, false) >= 1)` with a fixed reach of **3 m** and the leg built
  round the requested spot (gx, gz): mid (gx, gz + 2.6), ends +-1.5 m.
  - Before any snap the ends are hypot(1.5, 2.6) = **3.00 m** off; `hearTier` needs `dist < reach`
    (`src/ai/hearing.ts:90-91`), so 3.00 is already tier 0.
  - `em.spawn` snaps the spot to the nearest walkable cell centre (`src/ai/enemyManager.ts:1866-1868`):
    (9, -7.6) -> (9.25, -7.75) (the log's `at`; same +0.25 / -0.15 offset at all four spots). The ends are then
    hypot(1.75, 2.75) = **3.26 m** and hypot(1.25, 2.75) = 3.02 m off. Tier 0 at every spot, whatever the map.
- So the check could never pass. It never ran before 52e3dc13 (earlier (3) runs died at the live cap, triage 3).
- Not the game: tier maths, masking and the wall ray are as designed; the reach 3 m was the test's guess at "a jog's
  reach", below the real one.

## The real reaches (game tables)

- `noiseRadius` (`src/player/movement.ts:148-153`): standing `1.2 + (v - walkSpeed 1.4) * 1.6` above 1.65 m/s;
  crouched `1 + (v - crouchWalkSpeed 1.8) * 1.5` above 1.9 m/s. C's host-side steps use it on his sent speed
  (`clientStepNoise`, `src/net/validate.ts:188-193`, called from `coopHost.ts:1819`).
- Pad speeds (`src/config/movement.ts` `GEARS`, `STICK_SPEED`; `src/player/speedGears.ts:42`): a full stick is the run,
  4.0 m/s standing (reach **5.36 m**), 2.6 m/s crouched (reach **2.2 m**, not silent). A jog (3.0 m/s) is 3.76 m.

## Fix (applied, `scripts/e2e-coop.mjs` only)

1. Leg finder: the leg is rebuilt round the guard's spawned feet (`e.pos`), its walkability rechecked there
   (`legAt: false` when not), and the hearing check uses the jog reach `JOG_REACH` = 1.2 + (3.0 - 1.4) * 1.6 = 3.76 m
   (a conservative lower bound: C runs at 4.0). Ends now 3.0 m, mid 2.6 m off: tier 1+ with margin.
2. Crouch leg: the stick is held at 0.78 (`CROUCH_MAG`), not 1. Full stick crouched is the crouch RUN (2.6 m/s, 2.2 m
   steps), which would only have passed because the leg's nearest point is 2.6 m away (0.4 m margin against C's pad
   drift). 0.78 -> radial dead zone (0.15 / 0.98) -> 0.76 -> u 0.75 -> ~1.64 m/s crouched: silent (<= 1.9), the spec's
   "crouch-walk". With a 0 dead zone it is ~1.68 m/s, still silent.
3. Diagnostics: each tried spot now lists per leg point `{d, tier, r}` (distance, tier, effective reach after
   masking / wall) and the leg result after the snap; the step hook records per phase C's sent speed as the host has it
   (`cSpd`), his least distance to the guard (`dMin`) and the guard's level changes `[phase, time, level, meter]`
   (`levels`, up to 24), in both the crouch (`why`) and the run (`why3`) failure texts. With these, today's failure would
   have read `d 3.26, tier 0, r 3` at once.

## Risk in the legs that never ran

- Run, "within 2 s the guard turns / investigates" (`tTurn`): the run reach 5.36 m gives tier 2 (investigate-eligible,
  d < 2.68) only within ~0.6 m of the leg's middle, tier 1 elsewhere. Tier 1 alone (`Enemy.hearTurn`,
  `src/ai/enemy.ts:1074`) turns him but caps the meter at `noiseSuspicion` = 0.23-0.27 at 2.6-3.0 m
  (`src/ai/perception.ts:215`), under `suspicious` 0.3, so `e.level` may stay `unaware`; the level change comes from the
  board sending him (tier 2, `investigating`) or from him seeing C after the turn. Likely within 2.5 s (C crosses the
  middle every ~1 s at full speed), not certain. If it fails with `levels` showing no change and `cSpd.run` near 4:
  move the leg to 2.2 m behind (tier 2 along most of it), test-only.
- Run, "a heard step locates C's slot": a CALM guard's hearing never locates anyone; only a searching / alerted
  guard's (`hearFight` -> `reportHeard`, `src/ai/enemyManager.ts:2746-2780`), as the spec says ("once in a search or
  fight"). The 10 s run must take him from investigating to a search, or to a sighting (then `sawC` and `seenT` is not
  asserted). Unproven; `levels` will show where it stopped.
- Run, `cSpd`: the leg is 3 m with a turn at 0.5 m from each end, so C runs ~2 m segments; at accelMax 11 m/s^2 he
  reaches ~4 m/s in 0.7 m, so the sent speed should touch 4. `cSpd.run` shows it.
- Noisy hold: `em.hear(item, 8, ...)` with the guard alerted by hand goes through `hearFight` (`body` true, act 2 when
  he does not see C): located on C's slot. Lowest risk of the three; `seesTarget` true would skip it (act 0), then
  `d5.valid` fails.
- Crouch: silent at ~1.64 m/s; the remaining risk is sight (dark, behind him, 2.6 m: `maxMeter < 0.3`), which `levels`
  and `maxMeter` show.

## Checks

`node --check scripts/e2e-coop.mjs` OK. No src change (no tsc / vitest needed). No e2e run here.
Rerun: `e2e-coop` on this commit, `E2E_GPU=1` (laptop queue).
