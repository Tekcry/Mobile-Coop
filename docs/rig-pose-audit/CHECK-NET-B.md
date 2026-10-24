# rig-pose-fix: check net B (every src/net change in the batch)

Fresh Opus checker B, 2026-10-24. Diff `63f22ad2..988869a8 -- src/net src/game/playerHitVolumes.ts
src/player/playerVolumes.ts src/ai/guardHead.ts tests/net.test.ts tests/remoteKneelTense.test.ts` on
`feature/rig-pose-fix` (head 988869a8). Findings already in CHECK-W1 and CHECK-S1-A are not repeated.

## Verdict: PASS

No blockers. No host / client mismatch beyond the budgeted transients. The judge is no easier to exploit than before.
No crash path, no per-tick allocation, no wire change.

## Tests (desktop, one at a time)

| File | Result |
| --- | --- |
| `tests/net.test.ts` | 78 / 78 |
| `tests/remoteKneelTense.test.ts` | 5 / 5 |
| `tests/coopPerception.test.ts` | 8 / 8 |
| `tests/guardHeadParity.test.ts` | 165 / 165 |
| `tests/sectorLampSync.test.ts` | 13 / 13 |
| `tests/shotOrigin.test.ts` | 9 / 9 (the only `shot|puppet` file; `shotHistory` / `puppetHead` are covered in `net.test.ts`) |
| `npx tsc --noEmit -p .` | clean |

No e2e, no full vitest, no `npm run check`.

## 1. S3: puppet head, shot history, judge

- **Puppet = host shown head.** `puppetHeadIn` (`src/net/puppetHead.ts`) and `wireHeadIn` (`src/ai/guardHead.ts`) set
  the same constants: `PHASE_UNKNOWN`, aim pitch 0, no wall / lean / climb / blind. The held pose comes from the same
  `emoteStep` on both. `blinding` is false on the puppet, and `wireHeadIn` zeroes `poseW` when `held` is null, so a
  flashbang pose never reaches either. `moveX/Z` use the same frame convention (velocity in the guard's frame).
  `net.test.ts` holds them equal to 1e-9. What differs is only how the puppet eases its inputs:
  - crouch from the `st` code (exp, dt x 8);
  - aim from `wireGuardAim` (exp, dt x 8);
  - speed from the drawn positions.

  Those are transients inside the stated budget.
- **Rewind time = the client's.** The shot's `rt` = `clock.now - CLIENT_INTERP_DELAY` (`coopClient.ts:698`). That is
  the same `renderTime` the puppets sample (`coopClient.ts:1074`), in the host's `this.time` base: the snapshot sends
  `time: this.time` (`coopHost.ts:1387`), and `recordHistory` stamps the same `this.time` in the same step. Residuals:
  - the puppet head is from the last render frame, up to 1 frame before `rt` (about 8 cm at a run);
  - the history is linear at about 20 Hz, the client's samples are linear at 15 Hz.

  Both are pre-existing and inside the tolerance.
- **Tolerance 0.77 m (0.7 x 1.1 x scale): keep it.**
  - Not too tight. Worst honest case: a crouch change of about 0.3 m, plus about 0.15 m of interpolation and clock
    error at a run, plus the 1-frame lag of about 0.08 m, plus the 0.12 m sphere radius, comes to about 0.65 m.
  - Not looser than before. An honest client cannot make a false head claim now: it claims head only when its ray hits
    the puppet head sphere, and that head is the host's `wireHead`.
  - A cheating client could already claim head on any ray within 0.77 m of the head (a chest shot 0.35-0.45 m under
    it). That was the same radius around the old `feet + 1.62 / 1.15` constant, which for a crouched or held guard sat
    further from the real head than either new centre.
  - D1 makes the accepted region the union of two 0.77 m spheres, about 1 m apart only on a leaning, walled or pitched
    guard. The old constant sat roughly at the unleaned (wire) head, so the extra sphere covers only the true leaned
    head. That adds no real leverage.
- **Fallback logic is right.** It fires only on a head claim that failed with `'miss'` (`shotHistory.ts:122`). Origin
  and range refusals stay refused. The LOS ray and the damage point use the head that was actually matched (`aimOut`).
  A guard with no history yet uses his current feet / `simHead` / `wireHead` (`coopHost.ts:1178`). History is deleted
  on death (`coopHost.ts:611`).
- **Allocation.**
  - `recordHistory` (`coopHost.ts:1416`) uses an indexed loop and `e.simHead`, a getter with no copy. `e.wireHead(w)`
    writes into the scratch object `histWire` through `guardHead`'s module scratch.
  - `pushHist` reuses the oldest entry once it holds 24. It allocates 24 objects per guard once, then none.
  - `judge` per shot keeps its existing claim literal and `clone`s (per shot, not per tick, as before).

## 2. S1 + fix round: the host's view of the client

- **Field by field, the host reads what the owner fills, with the same units:**

  | Field | Host reads | Owner fills |
  | --- | --- | --- |
  | `x / y / z`, `yaw` | wire | capsule yaw (the owner model's yaw too) |
  | `pitch` | wire | `cam.pitch` |
  | `speed` | wire, capped at `MAX_SPEED` | `c.speed`, m/s |
  | `mv.r` | wire | `carry.raise`, rounded to 1 mm |
  | `mv.dw` | `drawn` = `dw !== 0` | `drawPhase !== DRAW_HOLSTERED` |
  | crouch | flag through `crouchStep` / `easeInOut` | same `MOVEMENT.crouchTime` / `standTime` |
  | stance codes | `poseFromMoveState` | `poseFromMoveState` (both sides) |

- **Tense.** The host's tense source is `enemyMgr.enemies`, which has no allocation. On the client it is the puppets,
  which expose `level`, so the "unaware only" test is the same.
- **Kneel timer.** The only known gap is the timing that CHECK-S1-A already listed under polish (0.35 s when aiming, and
  host stillness taken from arrival-time speed). It is not repeated here.
- **Where a host guard round lands relative to the client.** On the client's latest accepted state: its present minus
  the one-way latency, minus up to one 20 Hz send interval. That is 0.1 s fresher than before (the drawn copy's
  interpolation is gone). The guards' aim point and the volumes come from the same body (`PlayerHitVolumes`), with the
  same part multipliers as the local player (`playerPartMult`, same call in `playerTarget.ts:77` and
  `remotePlayer.ts:249`).
- **`RemoteAvatar.bodyIn`** (friendly fire) has no allocation and reads only sim / wire state: interpolated position,
  capsule or wall yaw, eased crouch / peek, the kneel through `wireKneel`, MoveState, grips lift.

## 3. S5 body lie (coopClient) and S7 lampSync

- **Body lie.** No wire change. The client lie is `deathLieOn` on the puppet's last host state (feet, yaw), falling
  away from the killer (`e.by`: the local player or the partner avatar). That matches the host's impulse direction for
  rounds (client and host shooters) and for takedowns. Explosions are the accepted S5 D2 exception. The client body is
  visual; carry goes through the host. The kill event allocates a `Vector3` per kill only.
- **Lamp shots.** `LAMP_SHOT_ORIGIN` 2 -> 2.1 is a host-side constant. No wire change.

## 4. Wire

`src/net/protocol.ts`: empty diff. No message shape changed and no field was added. `PROTOCOL_VERSION` is untouched.
The `shot` claim (`ox..dz, part, rt, dist, dmg`), `snap` and `pstate` are unchanged. Every new host input (history
heads, split volumes, tense, kneel) comes from state the host already has.

## Polish (no fix round needed)

1. **Friendly-fire judge** (`coopHost.ts:1156`, from `onPlayerShot`). It still judges a player victim at standing
   stance points: `stanceBody / stanceHead(feet, 0, ...)` at the victim's current feet, not rewound. Both sides now
   have the sim body (`RemotePlayer.body`, `PlayerTarget.body`). Judge the head claim against `body.head` and the body
   claim against `body.chest`. Two side effects of the current code:
   - a crouched or peeking victim's head sits 0.5-0.6 m off `feet + 1.62`, inside 0.77 m only by luck;
   - friendly-fire body claims always land at `feet + 1.0`, so `playerPartMult` never gives them the legs x0.75.

   Pre-existing (course mode only).
2. **Head tolerance.** Once e2e-netmove logs the puppet head vs the host's rewound `wireHead` in play, consider
   tightening the head claim toward about 0.55 m. Alternatively, refuse a head claim whose ray passes closer to the
   stance body than to the head. Neither is needed for the prototype.
3. **`RemoteAvatar.tense`** (`remoteAvatar.ts:647`) still uses its own rule:
   - `crouch > 0.5` (eased) where `wireTense` uses the crouch flag;
   - no grounded check;
   - `mv.m === 'ground'` where `wireTense` also accepts no `mv`.

   Calling `wireTense` there would make it one rule on all three bodies (friendly-fire boxes only, transient).
4. **`pushHist`** uses `Array.shift` (a 24-slot memmove, no allocation). A ring index would be cleaner but is not
   needed.
5. **Puppet input easing.** The puppet eases crouch and aim exponentially from wire codes; the host uses its own ease.
   This is the largest term in the head budget (up to about 0.3 m mid crouch change). If the tolerance is tightened
   (item 2), send nothing new but match the ease shape (`crouchStep`-style linear on `st`).

## e2e (laptop queue, unchanged from the slice reports)

`e2e-coop`, `e2e-netmove` (the judge, the client volumes, the peek head), `e2e-combat`; `e2e-course` for the friendly-
fire boxes.
