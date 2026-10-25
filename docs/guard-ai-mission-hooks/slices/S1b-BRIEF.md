# guard-ai-mission-hooks S1b: mission order groups (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on: `src/ai/missionOrders.ts` at `origin/feature/guard-ai-mission-hooks-s1a1` 758e3fe03 (S1a-1, built and
tested); `enemy.ts` / `enemyManager.ts` at `origin/feature/guard-rules-pr4` b111c9aa1. Every `Enemy` / `EnemyManager`
order function this slice extends is **S1a-2's and not built when this brief was written**: the names below are the
ones `slices/S1a-BRIEF.md` Part 2 (steps 4-7) tells S1a-2 to add. **Re-pin every anchor on S1a-2's head before
building** (content first; line numbers are "~N on 758e3fe03" for `missionOrders.ts` only). If S1a-2 named something
differently, follow S1a-2's code and note it in your report.

Builder: Opus 5.5 (AI code). Ships DARK behind `flags.missionOrders` (S1a-1 added it; no new flag). Rows: D7.
Assumptions: A5, A6 (groups), A8 (`docs/guard-ai-mission-hooks/BRIEF.md`). Source: `PLAN.md` "Slices" S1b, Design section 1 (the
offer table's group row), "Walk items" (Split Shift).

## Goal
With `?missionorders=1`, events with the same `name` and `via` form one group (Split Shift's two `ss-power` events: #7
and #1). Each member walks to the via and waits there. The group leaves the via when every member on the order is
there, or `ORDER.joinWait` (20 s) after the first one arrived. The first member leads to the post; the others follow
`ORDER.followGap` (1.5 m) behind him. The leader's end ends the group. A member who drops on the way (knocked out,
alerted, given a board task such as a breaker fault in his own room) leaves the group, dropped, and the next member
leads. A member dropped at the offer (busy) never joins, and the others wait the full `joinWait` for him: Split Shift
#7 waits at reception, then goes alone. The phase reads `gathering` until the group leaves the via, then `walking`. A
lone order (one member, or no via) behaves exactly as S1a. Flag off: nothing changes.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-mission-hooks-s1b`, branch `feature/guard-ai-mission-hooks-s1b`, cut by
  the lead from S1a-2's merge head (master after the S1a-2 PR merges; or S1a-2's passed head if the lead stacks the
  PRs). Start from `docs/systems/agent-preamble.md` (origin/master); branch guard before every write; commit and push
  each finished sub-step, `git add <your files>` only.
- Slice order (all edit `enemy.ts` / `enemyManager.ts` / `e2e-stealth-ai.mjs`, so they run one after another):
  S1a-2 -> **S1b** -> S3 -> S4. Nothing else of this job runs on these files while S1b is open.

## Files owned
- `src/ai/missionOrders.ts`, `src/ai/enemy.ts`, `src/ai/enemyManager.ts`
- `tests/missionGroups.test.ts` (new)
- `tests/missionOrdersManager.test.ts`: only the calls of the private `orderTick()` (it takes `dt` now), if any
- `scripts/e2e-stealth-ai.mjs`
- No `docs/systems/ai.md` edit (not in the job's claims): write your ai.md lines in the report; the lead folds them.
- Read only: `src/ai/hearing.ts`, `src/ai/posts.ts`, `src/ai/breaker.ts`, `tests/missionOrders.test.ts` (keep green,
  do not edit: S1b adds no `ORDER` key, so its `ORDER` equality case holds).

## Steps
### 1. `src/ai/missionOrders.ts` (~160 lines; new code tagged `(guard-ai-mission-hooks S1b)`)
1. Leg states (~325, `export const LEG_NONE = 0, LEG_TO_VIA = 1, LEG_WAIT_VIA = 2, LEG_TO_POST = 3, LEG_LOOK = 4,
   LEG_RESET = 5, LEG_DONE = 6,` / `LEG_GIVEUP = 7;`): add `LEG_FOLLOW = 8` and rewrite the doc line above it
   ("`LEG_WAIT_VIA` is S1b's ... S1a never enters it") to say: a group member waits at the via (`LEG_WAIT_VIA`); a
   follower walks `ORDER.followGap` behind the leader (`LEG_FOLLOW`).
2. A module constant under `STOREY` (~68): `/** (S1b-f) Slack (m) past `ORDER.followGap` within which a follower stands
   still. */ const FOLLOW_SLACK = 0.5;` (not in `ORDER`: the S1a-1 test pins `ORDER` exactly).
3. `OrderBoard` fields, after `readonly seq = new Uint32Array(ORDER.maxOrders);` (~149), each with a doc line:
   - `postId: string[]`, `viaId: string[]` (fill ''): the ids the order was opened with (`sameRoute`).
   - `gath = new Uint8Array(ORDER.maxOrders)`: 1 while a group gathers at its via (has not left).
   - `left = new Uint8Array(ORDER.maxOrders)`: 1 once the group left its via.
   - `waitT = new Float32Array(ORDER.maxOrders).fill(-1)`: seconds since the first member reached the via (-1: none
     yet).
   - `lead = new Int32Array(ORDER.maxOrders).fill(-1)`: the leading member (`Enemy.num`).
   - `leadP = new Float32Array(ORDER.maxOrders * 3).fill(Number.NaN)`: the leader's x, y, z (the manager writes it each
     step).
   - per member, after `readonly memSt` (~153): `memVia = new Uint8Array(ORDER.maxOrders * ORDER.maxMembers)`: 1 = this
     member is at the via, waiting.
   - `private reset(s)` (~203) clears all of them for the slot (postId / viaId '', gath / left 0, waitT -1, lead -1,
     leadP NaN, memVia 0 over the slot's members). `clear()` keeps every array (identity never changes).
4. `OrderBoard` methods (no allocation):
   - `stateOf(slot, num): number`: the member's `M_*` state, -1 when he is no member.
   - `firstLive(slot): number`: the first member in member order (event order) who is `M_WALKING` / `M_ARRIVED`; -1.
   - `sameRoute(slot, postId, viaId): boolean`: `postId[slot] === postId && viaId[slot] === viaId`.
   - `group(slot): void`: when the slot has a via (`via[slot * 3]` is a number), `memN[slot] >= 2` and `left[slot] ===
     0`: `gath[slot] = 1`, then `refresh(slot)`. Else nothing (a lone order never gathers, S1b-c).
   - `markVia(slot, num): void`: the member's `memVia` = 1; `waitT[slot]` from -1 to 0 (the wait starts at the first
     arrival, S1b-d). Not a member: nothing.
   - `gatherStep(slot, dt): boolean` (true when the group leaves this step): `gath[slot] === 0`: false. No live
     member (`liveN === 0`): `gath` 0, refresh, false. `waitT >= 0`: `waitT += dt`. Leaves when every member recorded
     on the slot (`j < memN`, any state) has `memVia` 1, or `waitT >= ORDER.joinWait` (a dropped member never reaches
     the via, so the others wait the full `joinWait`: S1b-a). Leave = `gath` 0, `left` 1, `refresh(slot)`, true.
   - `refresh(slot)` (~266): the phase line (~278, `this.phase[slot] = walk ? 'walking' : arr ? 'arrived' : ...`)
     becomes `this.gath[slot] === 1 && (walk || arr) ? 'gathering' : walk ? 'walking' : ...` (rest unchanged).
     `isLive` (~170) already counts 'gathering'.
5. `OrderLeg`:
   - Field `me = -1` (his `Enemy.num`). `start(b, slot, x, z, me = -1)` (~360) stores it; the rest of `start` is
     unchanged.
   - A public `near = false` (a follower within `followGap + FOLLOW_SLACK` of the leader; the Enemy reads it).
   - `step` (~375), new branches before the walking branch (`if (this.state === LEG_TO_VIA || this.state ===
     LEG_TO_POST) {`, ~379):
     - `LEG_TO_VIA`, first: if `b.left[slot] === 1 && b.lead[slot] >= 0 && b.lead[slot] !== this.me` -> `LEG_FOLLOW`
       (the group left without him: he follows; S1b-h).
     - `LEG_WAIT_VIA`: `b.gath[slot] === 0` (left): the leader (`b.lead[slot] === this.me`) -> `LEG_TO_POST` with the
       arrival heading from the via (`sx`, `sz` = the via, as the pass-through does ~396-399); anyone else ->
       `LEG_FOLLOW`. Still gathering: stand (`move = false`, `goal.x/z/y` = the via), `face` = bearing via -> stand
       point (`b.pt`). `walkT` does not run while he waits (S1b-g).
     - `LEG_FOLLOW`: `b.lead[slot] === this.me` (his leader dropped: he leads now) -> `LEG_TO_POST` (keeps `walkT`).
       Else `lx, ly, lz` = `b.leadP`; `lx` NaN: stand, `near = false`. `d = hyp2(x - lx, z - lz)`; `d > followGap +
       FOLLOW_SLACK`: `walkT += dt` (giveUp applies: `LEG_GIVEUP` past `ORDER.giveUp`), `goal` = the point `followGap`
       from the leader on the line to him (`lx + (x - lx) / d * followGap`, same for z), `y = ly`, `move = true`,
       `near = false`. Else `move = false`, `near = true`, `face` = bearing to the leader while the leader walks
       (`b.stateOf(slot, lead) === M_WALKING`), else bearing to the stand point (he stands behind the leader at the
       post).
   - The S1a pass-through at the via (~385-400) gains one test: on reaching the via (within `atVia`) with
     `b.gath[slot] === 1` -> `LEG_WAIT_VIA` and `b.markVia(slot, this.me)` (return the standing goal this step);
     `gath` 0 -> as today (to the post).
   - No new allocation: index maths, `hyp2`, one `Math.atan2`.
6. `checkMissionOrders` (~477): in the event loop (`for (const ev of events) {`, ~499) a first pass over the events
   (data time, a `Map<string, OrderEvent>` is fine) adds two errors per name:
   - `order event '<name>': events of one name disagree on post / via ('<a>' vs '<b>')` (S1b-b);
   - `order event '<name>': <n> events, more than ORDER.maxMembers (<max>)`.
   Same name without a via is fine (each walks alone: no group).

### 2. `src/ai/enemy.ts` (~45 lines; extends S1a-2's order code; tag `(guard-ai-mission-hooks S1b)`)
1. Import: add `LEG_FOLLOW`, `M_WALKING` to S1a-2's `./missionOrders` import.
2. `takeOrder(b, slot)` (S1a-2, after `breakerStep`): `this.leg.start(b, slot, this.pos.x, this.pos.z)` ->
   `this.leg.start(b, slot, this.pos.x, this.pos.z, this.num)`.
3. `private orderStep(dt)` (S1a-2): after `const lg = this.leg.step(...)` and its `LEG_GIVEUP` line, add: in
   `LEG_FOLLOW` with `this.leg.near`, the leader at the post (`b.stateOf(s, b.lead[s]) === M_ARRIVED`) and himself
   still `M_WALKING` -> `b.set(s, this.num, M_ARRIVED)` (once). `LEG_WAIT_VIA` and `LEG_FOLLOW` need no other code:
   S1a-2's `lg.move` (walk with `goTo` at patrol pace) and "else face `lg.face`" paths cover them. Only the leader ever
   reaches `LEG_RESET`, so only he works a board. S1a-2's "every circuit on -> done at once" check stays for everyone.
4. New public method next to S1a-2's `dropOrder`: `finishOrder(): void { this.endOrder(true, 'lead'); }` (doc: the
   group's leader ended his order; the manager ends each follower done, back to his route).
5. Nothing else: S1a-2's drops (`calmDecide`: an incident, a breaker walk or a lure -> 'task'; `onLevel`: anything
   above suspicious -> the level) apply to every member already: a member who drops leaves the group the same way
   (A6).

### 3. `src/ai/enemyManager.ts` (~80 lines; extends S1a-2's order code; tag `(guard-ai-mission-hooks S1b)`)
1. Import: add `M_DONE` to S1a-2's `./missionOrders` import if it is not there. Field next to `readonly orders = new
   OrderBoard();` (S1a-2): `readonly orderTable = ORDER;` (tests / e2e read `joinWait`, `followGap` from here).
2. `missionOrder(tag, kind, postId, via?, name)` (S1a-2 step 5.3):
   - Right after `this.orders.open(...)` (its step 3): a fresh slot (`memN[s] === 0 && pend[s] === ''`) stores
     `postId[s] = postId`, `viaId[s] = via ?? ''`. A running slot whose `sameRoute(s, postId, via ?? '')` is false: dev
     warn once per name (`ordWarned`): `guard-ai orders: '<name>' events disagree on post / via; the first wins`, and
     the slot's points are not rewritten (S1b-b).
   - S1a-2's points step (its step 4: via, post, switch) runs only for a fresh slot (a second event of a running order
     keeps the first one's points). If S1a-2 already does that, nothing to change.
   - After the offers (its step 6) and before `this.orders.refresh(s)`: `if (via !== undefined) this.orders.group(s);`
     then `this.orders.lead[s] = this.orders.firstLive(s);` (valid from the first step).
3. `offerPlaced(e)` (S1a-2, from `placeSlot`): after the offer, the same `group(s)` and `lead` lines (a late-placed
   member joins a group still gathering; after it left he follows the leader, S1b-h).
4. `private orderTick(): void` (S1a-2) -> `private orderTick(dt: number): void`; the call in `update(dt)` (S1a-2: `if
   (this.orders.live > 0) this.orderTick();`) passes `dt`. After S1a-2's member loop (down / held), per slot `s` with
   `this.orders.isLive(s)` (index loops, no allocation):
   - The leader done: `const L = b.lead[s]; if (L >= 0 && b.stateOf(s, L) === M_DONE)` -> every other live member:
     `this.byNum(num)?.finishOrder()` (the leader's end ends the group, PLAN table); continue.
   - Else `b.lead[s] = b.firstLive(s)` (a dropped leader is replaced by the next member, S1b-e); the leader's
     `byNum(...)` position into `b.leadP` (x, y, z); none: `leadP[s * 3]` NaN.
   - `b.gatherStep(s, dt)`; the dev log line "group '<name>' leaves <via> (n of m there, waited t s)" when it returns
     true (`import.meta.env.DEV` only; the string is built only then).
   S1a-2's member loop runs first, so a knocked-out leader is dropped ('down') before the lead pick.
5. `orderOf(e)` (S1a-2, debug / e2e; allocates): add `group: boolean` (`gath` or `left` set), `lead: boolean`
   (`lead[s] === e.num`), `waitT: number`.

### 4. `tests/missionGroups.test.ts` (new; ~340 lines)
Pure cases import from `../src/ai/missionOrders`. Wiring cases copy (do not import across test files) S1a-2's harness
from `tests/missionOrdersManager.test.ts` (the stand-in guard and `manager(wall)` of `tests/hearing.test.ts` plus the
bare-prototype `Enemy` probe of `tests/postsWiring.test.ts`, as S1a-2 extended them). `flags.missionOrders = true` in
`beforeEach`, restored in `afterEach`. One `it` per item (PLAN "Unit": a member at via waits; the group leaves when all
are in or after `joinWait`; follower gap; a member busy at the event never joins; a member sent to a breaker fault on
the way leaves; phase `gathering` -> `walking`):
1. Board: `group` forms only with a via and 2+ members (one member or no via: no `gath`, phase 'walking'); 'gathering'
   while gathering with a live member; `gatherStep` leaves when every member has `memVia`; not before `joinWait` with
   one member missing, then leaves at `joinWait` (+-dt) counted from the first `markVia`; a member recorded dropped
   never counts as there; no live member -> 'dropped'; after leaving 'walking'; `clear` frees the new arrays and keeps
   their identity (`toBe`).
2. Leg: a member starting within `atVia` of the via enters `LEG_WAIT_VIA` on his first step, marks the via, stands
   facing the post; `walkT` does not grow while he waits; on leave the leader goes `LEG_TO_POST` (arrival heading from
   the via), a follower `LEG_FOLLOW`; the follow goal is `followGap` from the leader on the line to him; within
   `followGap + 0.5` he holds still facing the leader (`near` true); his leader dropped (`lead = me`) -> `LEG_TO_POST`;
   a member still in `LEG_TO_VIA` when the group leaves -> `LEG_FOLLOW`; `step` returns the same goal object.
3. `checkMissionOrders`: the two Split-Shift-like events that agree -> `[]` (the S1a-1 fixture shape); disagreeing via
   -> one error; five events of one name -> one error.
4. Wiring, both eligible, one at the via: phase 'gathering' -> 'walking' -> 'arrived' -> 'done'; the group leaves the
   step the second reaches the via; `orderMembers` 2 while walking; the follower ends done through `finishOrder` when
   the leader's look-round ends; both `walker.rejoin` once.
5. Wiring, a member busy at the event (`orderRefusal` 'busy'): recorded dropped, never offered again; the other
   reaches the via and waits `joinWait` ('gathering' all that time), then walks alone ('walking', `orderMembers` 1).
6. Wiring, a member given a breaker walk on another circuit on the way (`brkGroup` 57 on the probe, the board's
   `resetBreaker` path): dropped 'task' at his next `calmDecide`; the group goes on with the other.
7. Wiring, the leader knocked out on the last leg (off the list): dropped 'down' at `orderTick`; the follower becomes
   the leader (`lead`), walks to the post and looks round.
8. Wiring, a reset group on [55, 56]: only the leader calls `breakerReset`; the follower never does.
9. A lone order with a via (one event): never 'gathering'; S1a's phase sequence unchanged.
10. Flag off: two events of one name do nothing (`orders.live` 0).
11. No allocation: across 200 steps of a gathering group and a follow, `orders.mem`, `gath`, `leadP` and the legs' goal
    objects keep their identity.

### 5. e2e (`scripts/e2e-stealth-ai.mjs`, written by you, run only by the lead)
The page already runs with `&missionorders=1` (S1a-2 appends it to the launch params,
`launch({ url, params: 'autostart=warehouse&mode=clear...' })` ~12); if S1a-2's head lacks it, append it with a
comment. New `await scen('mission group (guard-ai-mission-hooks S1b)', async () => { ... })` right after S1a-2's
'mission order (guard-ai-mission-hooks S1a)' scenario, before the closing console-error assert (`const real =
errors.filter(...)`). Setup as S1a-2's scenario: seeded `Math.random`, `t.light(0)`, the player hidden at (-22, -24)
crouched, `em.setMissionMap(['wh'], posts)` at the start and `em.setMissionMap([], [])` in `finally`, tags through
`em.placeSlot(e, { yaw, zone: '<tag>' }, 0)` right after `t.spawn`, steps of 0.1 s, `em.orderPhase(name)` changes
recorded (consecutive duplicates collapsed), `em.orderTable` for the numbers. Find the points with the `floor(x, z)`
check of the 'dog release (guard-rules S8)' scenario (~3300-3325): via V, a post P 8-12 m from V, a spawn for A
10-14 m from V on the far side; posts `{ id: 'e2e-via', x, z }` and `{ id: 'e2e-post', x, z }`.
- (a) Both come: A tagged 'e2e-g1' at his spawn, B tagged 'e2e-g2' within 1.5 m of V.
  `em.missionOrder('e2e-g1', 'walk', 'e2e-post', 'e2e-via', 'e2e-grp')` then the same for 'e2e-g2'. Assert: B never
  moves more than 1.5 m from V until A is within `atVia` of V; the group leaves within 0.5 s of A's arrival
  (`orderOf(A).group`, phase 'walking'); while both walk the last leg, B stays 1.0-3.5 m from A and A is nearer P;
  `orderMembers('e2e-grp') === 2` at the first 'walking'; phases exactly `['gathering', 'walking', 'arrived', 'done']`;
  afterwards `orderOf` is null for both and both walk away. Log A's walk time and the wait.
- (b) The second guard busy: `t.reset()`, the same setup; before the order, a bottle 3 m from B (`em.hear(new t.V(...),
  8)`, as 'one investigates' does) and steps until `B.incident >= 0`; then the two calls. Assert: `orderOf(B)` null,
  `orderMembers` 1; A reaches V and waits `joinWait` +-1 s there ('gathering'), then walks alone to P; phases exactly
  `['gathering', 'walking', 'arrived', 'done']`.
- Flag-off behaviour is vitest case 10. The lead requests (the builder runs no e2e): the head's `affected-e2e` gate
  plus `e2e-guard-carry` and `e2e-sectorops --part=1` (PLAN: the `src/ai` row); deciding suite
  `e2e-stealth-ai --only=mission group`, and `--only=mission order` (S1a-2's, must stay green).

## Docs
- No `docs/systems/ai.md` edit. In your report, the lines for the lead to add under S1a-2's "Mission orders" bullet:
  groups (events with one name and via): wait at the via, leave when all members are there or `joinWait` after the
  first arrival (a member dropped at the offer counts as not there), the first live member leads and the others follow
  `followGap` behind, the leader's end ends the group, a dropped member leaves it and the next leads; phase
  `gathering` until the group leaves; `orderTable`.
- No changelog fragment (the lead writes the job's one). No TESTING.md change.

## Rules
- Hot path: per step only S1a-2's `live > 0` gate, `orderTick(dt)` (8 slots x 4 members: `firstLive`, `gatherStep`,
  three `leadP` writes, `byNum` per live member) and each ordered guard's leg step (`hyp2`, one `atan2`). No closures,
  iterators, arrays, objects or strings per step (the dev log builds its string only when a group leaves, DEV only);
  `hyp2` / `hyp3`, never `Math.hypot` in `src`.
- Fixed and explainable (VISION 8, G143): no randomness; the leader is the first member in event order; every drop
  recorded with its cause.
- Co-op: host / solo only; no wire or save change; no `src/net` edit. Gameplay reads no graphics.
- Must NOT touch: `src/ai/hearing.ts`, `src/ai/guardAiData.ts`, `src/core/flags.ts`, `src/game/**`,
  `src/world/maps/**`, `docs/systems/ai.md`, any other test or script.

## Checks
`npm run typecheck:fast` and
`npx vitest run tests/missionGroups.test.ts tests/missionOrders.test.ts tests/missionOrdersManager.test.ts tests/breaker.test.ts tests/guardRelight.test.ts tests/campusS2Board.test.ts tests/consoleFault.test.ts tests/pairsWiring.test.ts tests/postsWiring.test.ts tests/enemyManagerDespawn.test.ts tests/coopTorches.test.ts tests/barkCause.test.ts`
Never `npm run check`. Report: built, numbers used, files, commits, tests changed, results, the ai.md lines, what
Michael should try (Split Shift needs C1-C3 and the S2 plant board; on the warehouse: the two e2e calls by hand).

## Done looks like (flag on)
- Two tagged guards, one at the via: the other walks in, they leave together, the second 1.5 m behind; phases
  `gathering` -> `walking` -> `arrived` -> `done`, `orderMembers` 2 while they walk.
- The second busy at the event: the first waits 20 s at the via, then goes alone.
- A member knocked out, alerted or given a board task on the way drops; the other carries on (and leads if needed).
- A lone order (S1a) is unchanged; flag off: nothing changes; the vitest files green; tsc clean; ai.md lines reported.

## Est. lines
| File | PLAN | Re-estimate |
| --- | --- | --- |
| `src/ai/missionOrders.ts` | ~120 | ~160 (board fields and five methods, two leg states, the data check) |
| `src/ai/enemy.ts` | ~60 | ~45 (S1a-2's leg and drop paths cover most of it) |
| `src/ai/enemyManager.ts` | ~60 | ~80 (route check, group / lead lines, `orderTick(dt)`, `orderOf`) |
| `tests/missionGroups.test.ts` | ~220 | ~340 (harness copy ~110) |
| `tests/missionOrdersManager.test.ts` | 0 | ~2 |
| `scripts/e2e-stealth-ai.mjs` | ~130 | ~170 (two parts, site finder, phase log) |
| Total | 590 | ~800 |

S1a-1 ran 1.6x its brief on the module (528 lines vs ~330) and J15 PR4's slices ~1.5x on tests. At that rate S1b lands
~1,100: under the ~1.4k flag, no split proposed. The builder stops and reports if the diff passes 1,400 lines before
step 5.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S1b-a: "the group leaves when all members are there" counts every member recorded on the order, so a member dropped
  at the offer or on the way is "not there" and the others wait the full `joinWait`. This is what makes A6's Split
  Shift case and the walk item ("#7 ... go alone after the wait") hold. Undo: count only live members in
  `gatherStep` (#7 then goes at once).
- S1b-b: events of one name that disagree on post or via: the first event's points win (dev warning), and
  `checkMissionOrders` reports it. Undo: a second slot per route (then `orderPhase(name)` is ambiguous).
- S1b-c: only a group (2+ members recorded and a via) reads `gathering`; a lone order with a via reads `walking` as in
  S1a, so C7's Code Relay line (`cr-release` walking) fires at the release, not at the west aisle. Undo: `group` for
  one member too.
- S1b-d: `joinWait` counts from the first member's arrival at the via, not from the event. Undo: start `waitT` at the
  offer.
- S1b-e: the leader is the first live member in member order (the first event's guard: Split Shift #7); if he drops,
  the next. Undo: the member nearest the post.
- S1b-f: a follower stands still within `followGap + 0.5` m (`FOLLOW_SLACK`) of the leader, facing him while he walks
  and the post once he is there; only the leader looks round the post or works the board. Undo: the constant.
- S1b-g: `giveUp` counts walking time only (a member waiting at the via or standing behind the leader is not walking).
  Undo: count the wait too.
- S1b-h: a member placed after the group left (a late-placed slot, A6) follows the leader. Undo: he walks alone (S1a).
- S1b-i: the leader's end ends every follower done (cause 'lead'); the leader's give-up or drop does not end the group
  (the next leads).

## PLAN pointer drift (PLAN says -> now)
- `missionOrders.ts` (S1a-1, 758e3fe03): `LEG_WAIT_VIA` exists but is never entered; `ORDER.joinWait` / `followGap`
  are declared; `OrderPhase` has 'gathering' and `OrderBoard.isLive` counts it, but `refresh` never writes it. PLAN's
  `OrderLeg` "toVia -> waitVia -> toPost" and "a follower targets `followGap` behind the leader" are S1b's to finish.
- `OrderBoard.open` already returns the running slot for a second event of the same name (members join it,
  "kind kept"): S1b builds groups on that, it does not change `open`.
- Every `Enemy` / `EnemyManager` anchor of this slice is S1a-2's (unbuilt at writing): `takeOrder`, `orderStep`,
  `endOrder`, `dropOrder`, `missionOrder`, `offerPlaced`, `orderTick`, `orderOf` and the `update` hook, as named in
  `slices/S1a-BRIEF.md` Part 2. Their pr4 neighbours: `breakerStep` ends ~1516, `calmDecide` ~2764 (`enemy.ts`);
  `placeSlot` ~2126-2201, `update` per-guard loop ~3851-3860, `byNum` ~2920 (`enemyManager.ts`). Master a28d18530
  (no J15 yet) also edits both files (alloc fixes, a `Goal` type in `enemy.ts`), so the real base moves lines by tens:
  quote by content.
- PLAN names the scenario `missionGroup`; this brief uses S1a's style, 'mission group (guard-ai-mission-hooks S1b)'.

## Open questions for the lead (PLAN facts that need a reading; the design is not changed here)
1. A6 "the group leaves `via` when all members are there or after `joinWait`" does not say whether a dropped member
   counts. This brief reads it as "every member recorded" (S1b-a), the only reading under which Split Shift #7 waits
   when #1 was busy at the cut. OK?
2. PLAN's phase line "gathering -> walking" is listed for groups only; this brief keeps a lone order with a via on
   'walking' (S1b-c), so C7's Code Relay line timing is unchanged from S1a. OK?

## Lead decisions (taken 2026-10-26 ~08:35, Guard AI Build: every proposal below adopted)
- 1 (dropped member counts as not there, S1b-a): TAKEN, YES.
- 2 (`gathering` for groups only, S1b-c): TAKEN, YES.
- No split (est. ~800, ~1,100 at the PR4 overrun rate).
