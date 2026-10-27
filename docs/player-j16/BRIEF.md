# Player J16: a carried body's cast shadow (brief)
Owner: Night Shift | Player Build. Status: current.

Lead: Night Shift | Player Build. Written 2026-10-27 by the Opus brief writer on origin/master 4de6aab97. Job: J16 Player
part (ROADMAP Now row 13 on origin/feature/menu; queued in `docs/orchestrator/resume-ct-core.md:14`). Hand-off source:
Guard AI J16 BRIEF A8 and PLAN-CHECK fold-in 5 (origin/feature/guard-ai-j16). One slice, one PR; this brief is also
its plan (claims below).

## Michael said
- 2026-10-23 ~14:42 (G315), real-time character shadows: "yes i want to include this system now as its one of the main
  focus of the game".
- 2026-10-25 ~11:20-11:35 (G352), re-audit item 6, character shadows: "Meter and guards read them".
- 2026-10-25 ~16:50 (G379), Q14 guards and your cast shadow: "A faint cue".
- 2026-10-25 ~16:50, Q39 partner anim over the network: "yes players must look exact in everyones games".

## Goal
With `charShadowLight` on, a body on a player's shoulder casts a shadow, and the picture (round shadows), the light
meter and guard perception all read that same shadow (CLAUDE.md light parity), in single player and on the co-op host
and every client, from the sim only.

## Why this job exists
On master the contract (`src/world/charOccluders.ts`) holds one upright capsule per player and per live guard
(`fillPlayers`, `fillVictims` in `src/game/charOccluderFill.ts`). A carried body is in neither: it is not `alive`
(`fillVictims` skips it), and Guard AI's `EnemyManager.fillOccluders` (origin/feature/guard-ai-j16
`src/ai/enemyManager.ts:851`) skips any body that is not `present` (`Body.present` = not hidden, not `carried`,
`src/ai/body.ts:148`). Guard AI A8 hands the carried body to Player (the carrier lives in src/game and src/net, out of
src/ai's reach). This job adds it.

## Out of scope
- Guard AI's files: `src/ai/**` (guardOccluders.ts, shadowNotice.ts, enemy.ts incl. `PlayerRef`, enemyManager.ts,
  body.ts, carryPose.ts, bodyLie.ts), `scripts/e2e-stealth-ai.mjs`, `docs/systems/ai.md`, `docs/guard-ai-j16/**`.
- Sector Ops' files: `src/world/charOccluders.ts`, `shadowCues.ts`, `lightField.ts`, `bakedLamps.ts`, `charShadowSet.ts`,
  `src/core/flags.ts`, `scripts/e2e-parity.mjs`, `scripts/e2e-coop.mjs`, `docs/systems/testing-tools.md`. No new
  `OCC_KIND`, no contract change.
- The posed operator capsule of char-shadow-meter PLAN section 6 (feet-to-head joint axis from `playerBody`, wall,
  peek, traversal poses): not this brief (Doubt 1). `fillPlayers`' upright capsule stays as it is.
- The body's legs in front of the carrier, the lift's rising body, the put down's sliding body (one capsule, on the
  shoulder, binary on / off). The faint cue's footprints (`ShadowCues`, from the upright capsule only). No tuning.
- No body throw exists to handle: G7 replaced the old 25 m/s throw with the 0.8 s put down (`BodyCarry.beginDrop`).

## Rules that hold
CLAUDE.md hard rules: hot paths allocate nothing (`fillOperator` and the hooks run every sim step: indexed loops, no
closures made per call, no iterators, no `for...of` over a Map, no literals; doubles go through typed arrays, never a
new double argument on a non-inlined call); gameplay never reads graphics state (no rig node, mesh, shadow map, preset,
LOD or governor: the load is placed from feet, yaw, the meter's sample height and the carry side, never from the carried
rig or its socket node); `src/game` never imports `src/net` (the hooks are set from src/net, as S2c's `charMatesInto`);
strict TS; dark behind `charShadowLight` (every new path runs only when `GameState.charOccluders` is non-null). No
wire, protocol or save change. Prototype (G421, G422): the numbers below are starting values, no tuning before the walk.

## The capsule (exact; starting values)
In `src/game/charOccluderFill.ts`:

```ts
/** (player-j16) The carried body on a carrier's shoulder, one capsule along its torso hanging down his back (CT carry:
 *  hips on the shoulder, torso down the back, legs down the front inside his own capsule). Fractions / metres:
 *  the hips' height as a share of the slot's sample height h (crouch lowers it with h), the shoulder's offset to the
 *  load side, the torso's drop and its lean back, the lowest end over the feet, the radius. */
export const LOAD = { hip: 0.88, side: 0.14, hang: 0.65, back: 0.25, low: 0.25, r: 0.17 } as const;
/** `lin` stride per player slot: side (0 no load, 1 right shoulder, -1 left), the carrier's yaw (rad, 0 = +Z). */
export const LOAD_IN = 2;
/** (player-j16) After `fillPlayers` and the guard fill: per slot s < n with `lin[s*LOAD_IN] !== 0` and `keys[s] >= 0`,
 *  one capsule written through `put(occ, OCC_KIND.player, s)` (kind player, owner `keys[s]`: the carrier's own key).
 *  Returns how many did not fit. No allocation. */
export function fillOperator(occ: CharOccluders, pin: Float64Array, lin: Float64Array, n: number, keys: Int32Array): number;
```

Per slot (feet x, y, z and h from `pin` at `s * FILL_IN`; the peek offset ignored), with f = (sin yaw, 0, cos yaw) his
forward and rt = (cos yaw, 0, -sin yaw) his right (the conventions of `BodyCarry.dropCarried` / `handOver`):
- a (hips on the shoulder) = (x + rt.x * side * LOAD.side, y + h * LOAD.hip, z + rt.z * side * LOAD.side)
- b (head end, down his back) = (a.x - f.x * LOAD.back, max(a.y - LOAD.hang, y + LOAD.low), a.z - f.z * LOAD.back)
- r = LOAD.r

Standing Wren (h 1.68): a 1.48 m up, b 0.83 m up and 0.25 m behind; crouched (h 1.092): 0.96 m and 0.31 m.

Who sees it, and why the owner key is the carrier's:
- Meter: `updateLight` samples slot s with `skip = charKeys[s]`, so a carrier's own load never darkens his own meter
  (no self shadow, as his own capsule, A4), while a partner beside him, or a body or guard sampled near him, is shaded.
- Guard perception (host): Guard AI's G3 `fieldLight` skips `occKey(OCC_KIND.player, i)` for the target, so the same
  rule holds for guards looking at the carrier; bodies' and witnesses' samples near him are shaded. Nothing in src/ai
  changes.
- Picture: `pictureInto` lists kind-player capsules first in contract order, so the loads ride with the players in the
  16 round-shadow slots; the outline lamps already draw the carried mesh.
- Holder rule (A5): the carrier's own torch within r + 0.6 m of the load axis is not shaded by it (unchanged rule).
- `ShadowCues.fillSlot` takes the FIRST capsule whose owner is the slot key: loads are appended after every player
  (and guard) capsule, so it still finds the upright one (a test pins this).

When a slot has a load (the input `lin`, written each sim step before `fillOperator`):

| Page / slot | Source of side and yaw | Load present while |
| --- | --- | --- |
| Solo, host or client, slot 0 (the local player) | `GameState.carrier` (`StealthSystems` / the client's `ClientCarry`): `loadSide`; `player.controller.yaw` | `carrier.loadShare > 0`: from the hoist start (lift t > `CQ.liftReach` 0.8 s, the step `Body.beginHoist` flips `carried`) until the put down's hand-over (`CQ.dropHand`) or an instant drop |
| Host, a client's slot (1..nr-1, `charRefs` order) | `CoopHost.carries.get(ref.id)` (a `CarryView`): `avatar.carrySide`, `avatar.yaw` | the view exists (made at the host's yes, `beginHoist` at once; removed on put down, hide, let-go, the carrier down / held / gone) |
| Client, a partner's slot (nr..n-1, `CharMates` order) | the partner's `RemoteAvatar`: `carrySide`, `yaw` | `carryKnees !== null` (set by its `CarryView`, cleared by `clear()`) |

So on every page the load appears the step the lying capsule goes (`present` false once `carried`, Guard AI) and goes
the step it lies again: put down (hand-over), instant drop, carrier downed (`BodyCarry.fixedUpdate` drops at once;
host `CoopHost.onRemoteDeath` :599 drops a downed client's), let-go before the hoist (never present), hidden (gone, no lying body
either), restart (`reset`). No wire change: the host already knows every carry (its own, `carries`), a client every
carry (its own `ClientCarry`, the item mirror's `by` into `views`), and yaw comes from MoveState.

## Files and exact behaviour

```claims
files:
  - src/game/charOccluderFill.ts
  - src/game/gameState.ts
  - src/net/charMates.ts
  - src/net/coopHost.ts
  - src/net/coopClient.ts
  - tests/charOccluderFill.test.ts
  - tests/charMates.test.ts
  - docs/systems/lighting.md
  - docs/player-j16/**
  - changes/feature-player-j16.md
maps: none
protocol: none
save: none
```

1. `src/game/charOccluderFill.ts` (~+50): `LOAD`, `LOAD_IN`, `fillOperator` as above, after `fillVictims`. Uses the
   module scratch `S` and `put` (no new scratch). Header comment: one line naming the load. No new import.
2. `src/game/gameState.ts` (~+30; new lines only, none of the hunks of Guard AI G4a / G4b or Sector Ops S3b-2):
   - Import: add `fillOperator, LOAD_IN` to the existing `./charOccluderFill` import (:131).
   - Members, on the lines after `charMatesInto` (:513), not near :385-410 (S3b-2's):
     ```ts
     /** (player-j16) Per player slot (`LOAD_IN`): the carried body's side and the carrier's yaw (0: none). */
     private readonly loadIn = new Float64Array(FILL.players * LOAD_IN);
     /** (player-j16) Co-op: writes the partners' loads into `lin` (host: slots 1..nr-1 from `refs`; client: its partner
      *  slots nr..n-1). Set by `CoopHost` / `CoopClient` with the flag on; null solo. Read only by `fillLoads`. */
     charLoadsInto: ((lin: Float64Array, refs: readonly PlayerRef[], nr: number, n: number) => void) | null = null;
     ```
   - New `private fillLoads(): void`, placed right after `localSampleInto` (ends :1857), before `fillChars`' doc
     comment: return at once when `this.charOccluders` is null; `this.loadIn.fill(0)`; slot 0 from `this.carrier`
     (`c && c.loadShare > 0`: `lin[0] = c.loadSide`, `lin[1] = this.player.controller.yaw`); `nr = min(charRefs.length,
     FILL.players)`; `this.charLoadsInto?.(lin, this.charRefs, nr, this.charN)`; `this.charFull += fillOperator(occ,
     this.lightIn, lin, this.charN, this.charKeys)`.
   - Call: one new line `this.fillLoads();` directly after `this.fillChars();` in `fixedUpdate` (:2270), so it runs
     after the carriers' fixed steps (:2183-2184) and before `updateLight`. `fillChars` itself is not edited (Guard AI
     G4a replaces its `fillVictims` line).
3. `src/net/charMates.ts` (~+45):
   - `MateSource` gains three optional read-only fields (`RemoteAvatar` fits them; existing stubs keep compiling):
     `yaw?: number`, `carrySide?: number`, `carryKnees?: unknown`.
   - `CharMates.loadsInto(lin: Float64Array, from: number, max: number): void`: the same walk as `into` (list order,
     `!src.shown` skipped, slots from..max-1), so slot k here is slot k there; for a partner with `carryKnees != null`
     writes `lin[s*LOAD_IN] = carrySide === -1 ? -1 : 1`, `lin[s*LOAD_IN + 1] = yaw ?? 0`; else leaves 0.
   - Pure `export function hostLoadsInto(lin, refs: readonly { readonly id: string }[], nr: number, carries:
     ReadonlyMap<string, { readonly avatar: { readonly carrySide: number; readonly yaw: number } }>): void`: for s in
     1..nr-1, `carries.get(refs[s]!.id)`; when present writes side (as above) and `avatar.yaw`. `CarryView` fits the
     map's value type. `Map.get` with a string allocates nothing.
4. `src/net/coopHost.ts` (~+6): after `this.offs.push(keepSimInBackground(g));` (:279), only `if (g.charOccluders)`:
   save the previous hook, set `g.charLoadsInto = (lin, refs, nr) => hostLoadsInto(lin, refs, nr, this.carries);`
   (one closure, made once), restore it in `offs`. Import `hostLoadsInto` from `./charMates`.
5. `src/net/coopClient.ts` (~+3): inside the existing `if (g.charOccluders) {` block (:235-239, after the
   `charMatesInto` lines and before its closing brace; tests/charMates.test.ts reads that block): save, set
   `g.charLoadsInto = (lin, _refs, nr, n) => this.mates.loadsInto(lin, nr, n);`, restore in `offs`.
6. `docs/systems/lighting.md` (~+3): in the "Parity, with `charShadowLight` on" bullet (:268-278) one sentence: a
   carried body is one capsule on its carrier's shoulder (`fillOperator`, Player J16), owned by the carrier's key, so
   his own meter skips it; on a co-op page it appears when that page's carry shows the body lifted. No other line.
7. Build report `docs/player-j16/BUILD.md` (changes, test counts, allocation readings, deviations). The lead writes
   `changes/feature-player-j16.md` and STATE.

## Unit tests (exact)
`tests/charOccluderFill.test.ts`, new `describe('fillOperator (player-j16)')`:
1. All `lin` 0: `occ` bytes (`cap`, `owner`, `n`) unchanged after the call; returns 0.
2. Slot 0 at feet (1, 0, 2), h 1.68, yaw 0, side 1: a and b equal the formula computed from `LOAD` (never literals),
   r `LOAD.r`, `cap[o+7] === OCC_KIND.player`, `owner === keys[0]`. Side -1 puts a and b the same distance to his left; yaw
   PI/2 turns them (right becomes -Z); `h = lightSampleHeight(1.68, 1)` lowers a by the ratio and
   clamps b to `y + LOAD.low`.
3. Order: after `fillPlayers(4)` + `fillVictims(8)` + `fillOperator` with loads on slots 0 and 2, for each slot s the
   first index whose owner is `keys[s]` is s (ShadowCues' first match), and the loads are the last two capsules.
4. `keys[1] = -1` gives slot 1 no load; a contract filled to `OCC.max` returns the number of loads not written and
   writes nothing.
5. Two machines: two contracts filled from the same `pin`, victims and `lin` hold the same bytes.
6. `pictureInto(…, 16)`: the four uprights, then the loads, before any guard.
7. Field (extend step 2's real `LightField` one-lamp set-up, :253): carrier slot 0 and partner slot 1 placed so the
   lamp-to-chest segment of slot 1 crosses the load axis: slot 1's `bodyLevel(…, occ, keys[1])` with the load is lower
   than without it and equals the no-load value x the load's `capsuleTransmit` for that lamp's share (computed); slot
   0's `bodyLevel(…, occ, keys[0])` is identical with and without its load (`Object.is`).
8. Allocation (`tests/helpers/allocPerCall.ts`, as :204): `fillOperator` with 4 loads after a full fill reads under
   `HEAP_NUMBER` per call; the vector control reads 32 B+.

`tests/charMates.test.ts`, new `describe('loads (player-j16)')`:
9. `loadsInto` slot alignment: three partners, the middle one not shown, the third carrying (`carryKnees` set,
   `carrySide` -1, yaw 0.7): `into(pin, 1, 4)` and `loadsInto(lin, 1, 4)` give the third partner the same slot (2),
   `lin` there is (-1, 0.7), every other slot 0; a source without the optional fields writes 0; `max` caps both alike.
10. `hostLoadsInto`: refs [local, A, B], carries {B: view stub side 1 yaw -1.2}: slot 2 written, slots 0 and 1 left
    as they were; an id not in refs is ignored.
11. Two machines (e) style: the host's slot for client X from `hostLoadsInto` and the client's partner slot for the
    same avatar values from `loadsInto`, each through `slotInto` + `fillPlayers` + `fillOperator`, give the same load
    capsule floats.
12. Source level (c) style: in `gameState.ts` `charLoadsInto` appears only in its declaration and in `fillLoads` after
    `if (!occ) return;`; `this.fillLoads();` is the line after `this.fillChars();`; `fillChars` holds no
    `fillOperator`; coopHost and coopClient set `g.charLoadsInto` only inside `if (g.charOccluders`; gameState.ts and
    charOccluderFill.ts still import nothing from src/net (the existing test must pass unedited).
13. Allocation: `loadsInto(lin, 1, 4)` with three partners and `hostLoadsInto` with three refs each read under
    `HEAP_NUMBER` per call.

Existing tests that must pass unedited: `tests/charOccluders.test.ts` (the isolation grep reads charOccluderFill.ts),
`tests/charOccluderFill.test.ts` and `tests/charMates.test.ts` (old cases), `tests/lightField.test.ts`,
`tests/coopPerception.test.ts`, `tests/coopCarry.test.ts`, `tests/g7CloseQuarters.test.ts`.

## Checks
- Each step: `npm run typecheck:fast`; `npx vitest run tests/charOccluderFill.test.ts tests/charMates.test.ts
  tests/charOccluders.test.ts tests/lightField.test.ts tests/coopPerception.test.ts tests/coopCarry.test.ts
  --maxWorkers=2`.
- PR: `affected-e2e` runs by itself (src/net touched: the co-op group e2e-coop + e2e-netmove + e2e-ctcourse). The
  src/game gate, set **j16p-coop**: `node scripts/laptop-queue/request.mjs --sha <full head sha> --pr <n> --suites
  "e2e-coop,e2e-netmove" --set j16p-coop --requester "Night Shift | Player Build"`. Checkers pass only when
  `laptop-e2e/j16p-coop` is green. Flag off, every e2e path is today's (no hook set, `fillLoads` returns at once).
- No new e2e scenario (prototype; Doubt 8). Every e2e `E2E_GPU=1`.

## Build and check
- Builder: Opus 5.5 (engine and `src/net` code, G302). Steps 1 (charOccluderFill + tests 1-8) and 3's pure parts
  (charMates + tests 9-11, 13) are cloud-safe; the gameState / coopHost / coopClient wiring and test 12 are not.
  Commit and push each step, path-limited.
- Checkers: two independent fresh Opus checkers (src/net touched), each posting the `checker` status on the head.
- Branch: `feature/player-j16` from origin/master in `C:/NightShift/Mobile-Coop-player-j16`.
- Estimated size: ~420 changed lines (code ~135: charOccluderFill 50, gameState 30, charMates 45, coopHost 6,
  coopClient 3; tests ~280; docs ~5).

## Shared files and order
- Guard AI J16 (origin/feature/guard-ai-j16): shares `src/game/gameState.ts` only (their G4a / G4b: the
  `fillVictims` line inside `fillChars` and `enemyMgr.chars` / `.cues` at :765; ours :131 import, :513 members, a new
  method after :1857, one line after :2270). No shared lines; either order. They run `tests/charOccluderFill.test.ts`
  but do not edit it. Their `fillOccluders` must keep skipping non-`present` bodies (it does), or a carried body
  would have two capsules.
- Sector Ops S3b-2 (origin/feature/char-shadow-meter-s3b2, not on master): shares gameState.ts (their imports :5-8,
  :326, :404-409, :605, :1804). No shared lines. `ShadowCues.fill` reads `charKeys` after our loads are in: test 3
  keeps its first-match rule true.
- `src/net/coopHost.ts` / `coopClient.ts`: new lines inside or after existing blocks only; the builder runs
  `node scripts/claims-check.mjs` on this brief before step 3 and rebases onto whatever lands first.

## Flag
`charShadowLight` (src/core/flags.ts, `?charlight=1`, owner Sector Ops Build; on by default on /preview/ builds via
`darkFlag`). No new flag. Off: no hook set, `charOccluders` null, `fillLoads` returns at once. Switch-on is Sector Ops'
walk card (char-shadow BRIEF A9); this job adds one clause to it.

## Walk item (for the switch-on card)
`?charlight=1`, char shadows Off, a lamp overhead-ish: carry a body: your round shadow grows a lump on the load side
and behind you; your own meter does not drop from it; a partner standing in that lump reads darker; put it down and
the lump becomes the lying body's shadow. Co-op: the same on both screens.

## Doubts
1. Scope: char-shadow-meter PLAN section 6 gives Player a posed operator capsule (`fillOperator(occ, index, body:
   PlayerBodyOut)` from `playerBody`: joint axis, wall, peek, traversal). This brief builds only the carried load and
   takes the name `fillOperator` with another signature. The posed capsule, when wanted, replaces `fillPlayers`'
   upright and leaves the load as is. Lead: confirm the posed capsule is a later job, not part of J16 Player.
2. Shape: one capsule along the hanging torso; the legs down his front are left out (they sit mostly inside his own
   r 0.22 capsule). `LOAD` numbers are estimates from `carryPose.ts` (`CARRY_TILT`, hips on the shoulder) and
   `carryShoulderX/Y`, not measured from the rig (gameplay may not read it). Starting values for the walk.
3. Owner key: the load shares the carrier's key (kind player) so nothing he is sampled for counts it. Assumed: no
   code needs one capsule per player key except ShadowCues' first match (kept by order, test 3). Guard AI's lead
   should know their code must not assume it either.
4. Timing across pages: the carrier's own page shows the load from the hoist start (~0.8 s into the lift); a partner
   page from when its `CarryView` is made (the host's yes / the mirror, t ~0). Each page is consistent with its own
   lying-body capsule, but host and client can differ by up to ~0.8 s plus latency at a lift's start. Guards read the
   host. Accepted as co-op tolerance (A7 style); aligning `CarryView` to the lift timeline is a later fix.
5. Side across pages: a partner page takes `CarryView`'s own side (body lie vs the avatar's position), the owner its
   lift step-in point; a body lying across his path could give opposite shoulders. No wire change now; send the side
   in the item mirror only if the walk shows it.
6. Partner yaw is `RemoteAvatar.yaw` (the shown, interpolated value), as S2c's `charMates` already takes `pos` from
   the avatar. Accepted precedent; a checker may prefer the MoveState yaw.
7. Full contract (64): loads come last, so they are the first dropped (counted in `charFull`); the picture still ranks
   them with the players.
8. No flag-on e2e. Sector Ops' S4 e2e-coop probe could add a carry case; otherwise the walk item covers it.
9. The faint cue (ShadowCues) ignores the load's shadow (footprints from the upright capsule). Sector Ops' file; left.
10. A co-op client has no lying-body capsules (Guard AI A10) but does show partners' loads: on a client a body goes
    from no capsule to a load. Picture and client meter only; guards read the host.
11. `carrier.loadShare` is the fixed-step lift / put-down timeline (`closeQuarters.ts` curves), also read by the pose;
    treated as sim state, not graphics. Checkers should confirm.
