# rig-pose-fix S3: one guard head (audit G7, G20; ranked fix 3) + carried follow-ups

Branch `feature/rpf-s3` off `feature/rig-pose-fix` bb750a5b (4.88.1 + S1, S2, S5, S6, S7). Opus builder, 2026-10-24.
Every file:line below is on this base.

## What

### S3 (G7, G20)
- **Puppet head from `guardHead`** (`src/net/enemyPuppet.ts`). Before (:436-439): the client puppet's head volume was its
  rig's `headNode` after `animate` (client anim LOD, frame rate). Now `guardHead` on the inputs the puppet already gives
  its rig, through the new pure `src/net/puppetHead.ts` `puppetHeadIn`: interpolated feet / yaw, eased crouch and speed,
  the travel direction in its frame, the stance raise before the carry (the host's head reads the raise without the
  carry). Not on the wire, so set as constants: no gait clock (`PHASE_UNKNOWN`), aim pitch 0, no wall / lean / ladder /
  flashbang pose. The held pose comes from the puppet's own `emoteStep` / `emoteSeize` (its takedown, the partner's hold),
  the same code the host steps.
- **Dog puppet head** (S6 one-liner): `dogHead(pos, yaw, speed, DOG_MEAN_PHASE, alerted, kick, head)`. Nothing reads
  `DogModel.head` any more (kept: presentation, S6 D4).
- **`guardHead.ts`**: `PHASE_UNKNOWN` (-1): the bob terms skip and the dash share uses the mean pace (the host always
  passes a clock >= 0, so its head is unchanged; guardHeadParity 165/165). New `wireHeadIn(i, out)` (the inputs the
  client has) and `newHeadIn()`.
- **`Enemy`** (`src/ai/enemy.ts`): `simHead` (read-only getter of the head volume centre) and `wireHead(out)` =
  `guardHead(wireHeadIn(headIn))`, the head the client's puppet computes (the dog: `simHead`). The constructor now runs
  `syncHitboxes(0)` so the head is valid before the first step (history of a just-spawned guard).
- **Host history and judge** (`src/net/coopHost.ts`, new pure `src/net/shotHistory.ts`):
  - `recordHistory` (20 Hz) stores feet, crouch, the sim head and the shown head per guard (`pushHist`, reuses the oldest
    entry once full: no allocation after the first 1.2 s).
  - `judge` on a guard: a head claim is checked against the rewound sim head, else the rewound shown head
    (`judgeRewound`); never `feet + 1.62 / 1.15`. A body claim keeps the stance centre (`feet + 1.0 / 0.7`). No history
    yet: the guard's place now. Course friendly fire on a player keeps the stance points (`stanceBody` / `stanceHead`).
  - G20: the dead `rig` branch (posed head / pelvis, `bx/by/bz`, `m`, `posed`, `rwHead` / `rwBody`) is deleted.

### Carried follow-ups
- **One sim head (S1 + S2)**: the wall-poke eye is S1's body model head (`PlayerTarget.body.head`), handed to
  `PlayerWeapons.simHead` by `GameState` (synced in the fixed step right before `weapons.fixedUpdate`). S2's `shotEye`,
  `SHOT_EYE` and `SHOT_INV.eye` are deleted. They did not agree within a few cm (measured, both fits of `rig.headNode`:
  6-15 cm aimed at |pitch| <= 0.5, up to 44 cm at the pitch ends; S2 fitted the rig at rest, S1 in game with the tuner
  base table and mocap), so one source replaces both.
- **S7 `openLeft`**: the sim flag is `PlayerWeapons.handLeft`, written in `gameState.ts` wallStep (:2759); the rig gets a
  copy for the drawn switch. `fixedUpdate` steps `hand` from `handLeft`; weapons never read `rig.openLeft`.
- **CHECK-W1 polish 2**: the shot's side is `this.hand.hand` (the S7 sim clock), not `cam.shoulder && handSwitchOk`.
- **CHECK-W1 polish 7**: dead `PlayerWeapons.muzzlePoint()` deleted.
- **CHECK-W1 polish 1 (S5 floor)**: `deathLieOn` (`src/ai/body.ts:34`) casts one down ray on `G.STATIC` from
  `LIE.floorUp` 0.5 m over the feet at the settled pelvis to `LIE.floorDrop` 8 m under them; a hit re-lays the lie on
  that floor (`lieAt`). A guard killed at a ledge lip or mid-air lies on the floor below; no floor in reach: the feet's
  height (as before). Both machines (the client's `deathLieOn` passes its ballistics).
- **S1 note**: `PlayerRef.head` comment in `enemy.ts` updated (S1's body model head, not the posed rig head).

## Files
- New: `src/net/shotHistory.ts`, `src/net/puppetHead.ts`, this report.
- Changed: `src/net/enemyPuppet.ts`, `src/net/coopHost.ts`, `src/ai/guardHead.ts`, `src/ai/enemy.ts`, `src/ai/body.ts`,
  `src/ai/bodyLie.ts`, `src/weapons/playerWeapons.ts`, `src/weapons/shotOrigin.ts`, `src/game/gameState.ts`.
- Tests: `tests/net.test.ts` (+2), `tests/shotOrigin.test.ts` (eye cases removed, +2), `tests/bodyPos.test.ts` (+1, a
  ledge static in its world).
- Docs: `docs/systems/coop.md` (two paragraphs), `docs/systems/combat.md` (the shot origin line).

## Tolerances
- Head claim: `checkShot`'s head tolerance is kept, 0.7 x 1.1 m x scale (0.77 m for scale 1), now around the true
  rewound head. Budget: client interpolation (15 Hz snapshots vs 20 Hz history, clock sync error: ~0.15 m at a run), the
  puppet's eased crouch / speed vs the host's (up to ~0.3 m mid crouch change), the stride bob (puppet mean phase vs
  host clock: measured max 1.2 cm), the head sphere radius 0.12 m.
- Why two heads: the lean round an edge, the wall stance and the aim pitch are not on the wire. A peeking guard's sim
  head sits ~1 m (lean 1: `FIT.leanSide` 0.96 x k) from the head the client is shown, past the tolerance; without the
  shown head every client headshot on a peeking guard would score 0 (the old stance constant accepted them).
- Puppet vs host for the same wire state: equal (1e-9) to `Enemy.wireHead`.
- Floor probe: `LIE.floorUp` 0.5 m (a step up along the fall), `LIE.floorDrop` 8 m.

## Decisions (assumed; undo by reverting the slice, or the line named)
- D1: the judge accepts the sim head or the shown head (not the sim head only). Undo: drop the `rw.wire` fallback in
  `judgeRewound` (then put the lean on the wire, a wire change).
- D2: the puppet's head aim is the raise before the carry, matching the host head (which ignores the carry). Undo: pass
  `rp.aim` after `carryRaise` (the host then differs while holstered).
- D3: one sim head = S1's model (it is the hit volume, perception and light sample head, fitted in game). S2's head fit
  is deleted. Undo: restore `shotEye` from bb750a5b and call it in `shotPoint`.
- D4: the shot side follows the eased hand clock (flips at half the 0.25 s switch) instead of at once (S2 D2). Undo:
  `sp.side = pl.cam.shoulder < 0 && this.handSwitchOk ? -1 : 1`.
- D5: the floor probe takes the first static surface under the settled pelvis, even 8 m down; the ragdoll eases onto it
  after 3.5 s (S5 snap). Undo: delete the probe block in `deathLieOn`.
- D6: `Enemy` runs `syncHitboxes(0)` at construction (head and volumes placed at spawn, not after the first step).

## Wire
No wire change. `PROTOCOL_VERSION` untouched. The puppet and the host's shown head use only what the snapshot carries.

## Tests (desktop, one file at a time)
| File | Result |
| --- | --- |
| `tests/net.test.ts` | 78 passed (+2: "puppet head = host guardHead for the same inputs", "judge uses the rewound head") |
| `tests/guardHeadParity.test.ts` | 165 passed |
| `tests/dogHead.test.ts` | 8 passed |
| `tests/shotOrigin.test.ts` | 9 passed (+2: the eye is S1's head, wiring; the poke line runs forward: min 0.098 m along the aim, max 0.905 m long) |
| `tests/playerVolumes.test.ts` | 10 passed on rerun; its allocation case read 67.8 B vs 64 B in 2 of 3 runs under desktop load. `playerVolumes.ts` and its imports are untouched by S3: an S1 measurement flake |
| `tests/bodyPos.test.ts` | 13 passed (+1: on the ledge, at the lip, mid-air, no floor in reach, a step up) |
| `tests/animN4cHandSwap.test.ts` | 9 passed |
| `tests/weapons.test.ts` | 16 passed |

`npx tsc --noEmit -p .` clean; eslint on every changed file clean. No e2e, no full vitest, no `npm run check`.

## e2e (laptop queue)
`e2e-coop`, `e2e-netmove`, `e2e-combat`. Also worth a look: `e2e-wall` (the poke eye and shot side), `e2e-stealth-ai`
(`bodies`: the floor probe).

## Open items
- The lean / wall / pitch of a guard are still not on the wire: the client sees a peeking guard unleaned (pre-existing).
  Sending `coverPeek` would let the judge drop the second head (a wire change, not made).
- `playerVolumes.test.ts` allocation flake (S1's test; 67.8 vs 64 B under load).
- `DogModel.head` is now unread (presentation only); delete when convenient.
- Changelog fragment: the lead's.
