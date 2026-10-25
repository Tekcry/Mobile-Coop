# guard-ai-mission-hooks S1a: single-guard mission orders and the three flags (slice brief)
Owner: Guard AI Build. Status: current.

Pinned on `origin/feature/guard-rules-pr4` b111c9aa1 (master 2148ec969 + all of J15 PR1-PR4). S1a starts on the head
after J15 PR4 merges, and master has moved since (a28d18530 changes `enemy.ts` ~290 lines and `enemyManager.ts` ~70
lines): **re-pin every anchor on your real base before building.** Every anchor below is quoted by content (checked to
exist on b111c9aa1 and on master a28d18530); line numbers are "~N on b111c9aa1" only.

Builder: Opus 5.5 (AI code). Ships DARK behind `flags.missionOrders` (this slice adds all three of the job's flags).
Rows: D7. Assumptions: A1-A8, A13-A15 (`docs/guard-ai-mission-hooks/BRIEF.md`). Source: `docs/guard-ai-mission-hooks/
PLAN.md` "Slices" S1a, Design section 1 (the offer table, breaker composition), "Order with J15", "Flags".

## Goal
With `?missionorders=1`, a mission event (`{name, guardTag, postId, via?}`) or a direct call
`em.missionOrder(tag, kind, postId, via?, name)` sends the tagged guard of the live section on a calm walk: by `via`
(if any) to the post, look round 8 s, back to his route (`walk`); or to the post's breaker board, work it
`BREAKER.resetT` s and turn every listed circuit back on (`reset`). A post with a `bell` is a sound: a tagged guard who
does not hear it (walls, masking) does not come; everyone else in reach only turns to look. One offer, at the event;
an ineligible guard never picks it up later. The mission reads what the guard did through `orderPhase(name)` and
`orderMembers(name)`. Flag off: `missionOrder` is a no-op and nothing else changes.

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-ai-mission-hooks-s1a`, branch `feature/guard-ai-mission-hooks-s1a`, cut by
  the lead from master once J15 PR4 has merged. Start from `docs/systems/agent-preamble.md` (origin/master); branch
  guard before every write; commit and push each finished sub-step, `git add <your files>` only.
- If the lead takes the split (see "Est. lines"), Part 1 is `feature/guard-ai-mission-hooks-s1a1` and Part 2
  `feature/guard-ai-mission-hooks-s1a2` (cut from the Part 1 merge head), each its own PR.

## Files owned (S1a alone in the job until it merges; S2 never touches these)
- `src/core/flags.ts`, `src/ai/missionOrders.ts` (new), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`
- `tests/missionOrders.test.ts` (new), `tests/missionOrdersManager.test.ts` (new)
- `scripts/e2e-stealth-ai.mjs`
- No `docs/systems/ai.md` edit (not in the job's claims): write your ai.md lines in the report; the lead folds them.
- Read only: `src/ai/hearing.ts`, `src/ai/posts.ts`, `src/ai/breaker.ts`, `src/ai/gear.ts`, `src/ai/pairs.ts`,
  `src/world/rooms.ts`, `src/ai/incidents.ts`.

## Steps
### Part 1 (S1a-1 if split): flags, the pure module, its unit tests
#### 1. `src/core/flags.ts` (~16 lines)
1. `interface Flags`, after the last J15 field (`dogRelease: boolean;`, ~75; its doc starts "(guard-rules S8, A12) Alarm
   stage dogs leave the heel"), add three fields in the J15 style:
   - `/** (guard-ai-mission-hooks S1a, A14, D7) Mission orders: a mission event sends the tagged guard on a calm walk or
     a breaker reset (`EnemyManager.missionOrder`). `?missionorders=1`. DEFAULT OFF until Michael's prototype walk
     (owner Night Shift | Guard AI Build; switch-on date set by the orchestrator; needs S1a + S1b passed, C1-C3 and C7
     on master, the three twists accepted). */` `missionOrders: boolean;`
   - `/** (guard-ai-mission-hooks, A9, A14, D6) Per-area alarm stages under the shared site stage (S3). `?areaalarms=1`.
     DEFAULT OFF until Michael's click on Q1 at the prototype walk (walk card); owner Night Shift | Guard AI Build. */`
     `areaAlarms: boolean;`
   - `/** (guard-ai-mission-hooks, A11, A14, D8) Noise zones: power-linked noisy sources; off = map `noisy` data is
     ignored (S4). `?noisezones=1`. DEFAULT OFF until the walk after map data lands; owner Night Shift | Guard AI
     Build. */` `noiseZones: boolean;`
2. `export const flags`, after `dogRelease: params.get('dogrelease') === '1',` (~148):
   `// (guard-ai-mission-hooks S1a) dark until their walk items are accepted (PLAN "Flags"): `=1` turns each on`
   `missionOrders: params.get('missionorders') === '1',`
   `areaAlarms: params.get('areaalarms') === '1',`
   `noiseZones: params.get('noisezones') === '1',`
3. Nothing reads `areaAlarms` / `noiseZones` in S1a (S3 / S4 do). Other jobs add lines here too: additive only.

#### 2. `src/ai/missionOrders.ts` (new, pure: no Babylon, no DOM, no `src/game` import; ~330 lines)
Imports (all pure): `hyp2` from `../core/mathx`; `ambientDb`, `effectiveReach`, `hearTier`, `type HearTier`,
`type NoisySource` from `./hearing`; `POST`, `type PostDef` from `./posts`; `type RoomRect` from `../world/rooms`.
Header comment: what an order is (D7, A1-A8), the offer rule (one table, PLAN Design 1), "allocation-free per step".

1. Types:
   ```ts
   export type OrderKind = 'reset' | 'walk';
   /** A mission post (`MissionDef.posts`, Campaign Build C2): a point the order walks to. */
   export interface MissionPost {
     id: string; x: number; z: number;
     /** Floor height of its storey (default: the lowest walkable layer). */ y?: number;
     /** Facing for the look-round (rad, 0 = +Z); none = his arrival heading. */ yaw?: number;
     /** A breaker board: every circuit of it (integers >= 0). Present = a `reset` order (A3). */ circuits?: number[];
     /** A bell (A4): the order is a sound at (x, y, z) heard to `reach` m (walls, masking). */
     bell?: { x: number; y: number; z: number; reach: number };
   }
   /** The engine's `missionEvent` payload (structural: no import of `src/game`). */
   export interface OrderEvent { name: string; guardTag: string; postId: string; via?: string }
   export type OrderPhase = 'none' | 'offered' | 'gathering' | 'walking' | 'arrived' | 'done' | 'dropped';
   /** A section as `checkMissionOrders` reads it (a `SectorDef` satisfies it). */
   export interface OrderSection {
     id: string;
     guards: readonly { x: number; z: number; y?: number; zone?: string; post?: PostDef }[];
     noisy?: readonly NoisySource[];
   }
   ```
2. `export const ORDER = { lookT: 8, joinWait: 20, followGap: 1.5, atVia: 2.5, giveUp: 120, bellTier: 1, maxOrders: 8,
   maxMembers: 4, arrive: 0.8 } as const;` with one doc line per value (G4 prototype values). `arrive` is not in PLAN
   (assumption S1a-a): the radius (m) at which he is at the post. `joinWait` / `followGap` are S1b's (declared here so
   S1b does not edit the table's shape).
3. `matchesTag(tag: string, zone: string, sectionId: string, k: number): boolean`: `tag !== ''` and (`zone === tag`, or
   `k >= 0 && sectionId !== '' && tag === sectionId + ':' + k`) (A1). Event / placement time only (the concat is fine).
4. `findPost(id: string, posts: readonly MissionPost[]): MissionPost | null` and
   `resolvePoint(id: string, posts: readonly MissionPost[], rooms: readonly RoomRect[], out: Float32Array): boolean`:
   a mission post first (`out` = x, y ?? NaN, z, yaw ?? NaN), else the room with that id (its centre
   ((minX + maxX) / 2, (minZ + maxZ) / 2), y = `minY ?? NaN`, yaw NaN) (A2); false when neither. `out` length >= 4.
5. Member states: `export const M_WALKING = 0, M_ARRIVED = 1, M_DONE = 2, M_DROPPED = 3;` Kinds:
   `export const K_WALK = 0, K_RESET = 1;`
6. `export class OrderBoard` (fixed slots, sized once; `maxOrders` x `maxMembers`):
   - Per slot: `name: string[]` ('' = free), `phase: OrderPhase[]`, `kind: Uint8Array`, `pt: Float32Array(3 x)` (the
     stand point at the post: x, y, z), `face: Float32Array(3 x)` (face point x, z, then the post yaw; NaN none), `via:
     Float32Array(3 x)` (NaN x = no via), `circuits: (readonly number[] | null)[]` (a reference to the post's array, never
     copied), `bell: (MissionPost['bell'] | null)[]`, `pend: string[]` (a tag with no placed guard at the event, A6),
     `cause: string[]` (the last drop cause, dev / tests), `seq: Uint32Array` (open order, for reuse).
   - Members: `mem: Int32Array(maxOrders * maxMembers)` of `Enemy.num` (-1 empty; any id, no bitmask, so ids past 31
     are fine), `memSt: Uint8Array` (the `M_*` state), `memN: Uint8Array` per slot. `live` (number): members walking or
     arrived over all slots (the manager's per-step gate); `pendN` (number): slots with a `pend` tag.
   - `find(name: string): number` (a slot whose phase is not 'none', -1); `open(name: string, kind: number): number`:
     the slot of `name` if its phase is 'offered' / 'walking' / 'arrived' (members join it), else the first free slot,
     else the ended ('done' / 'dropped') slot with the lowest `seq`, reset; -1 when all are live (board full).
   - `add(slot, num, st, cause = ''): boolean` (false: `maxMembers` full), `set(slot, num, st, cause = ''): void`
     (keeps `live` exact), `refresh(slot): void` (phase from the members: any `M_WALKING` -> 'walking'; else any
     `M_ARRIVED` -> 'arrived'; else `pend !== ''` -> 'offered'; else any `M_DONE` -> 'done'; else 'dropped'),
     `liveN(slot): number`, `hasCircuit(slot, group): boolean`, `holdsCircuit(group): boolean` (a `K_RESET` slot with
     `liveN > 0` whose circuits include `group`), `fail(name, cause): void` (open a slot of `name` straight to
     'dropped': an unresolved post / via, a reset with no circuits, A2), `clear(): void` (every slot free, `live` and
     `pendN` 0; the arrays are kept: identity never changes).
   - No method allocates (string assignment is a reference).
7. `export class OrderLeg` (one per Enemy, reused) with states
   `export const LEG_NONE = 0, LEG_TO_VIA = 1, LEG_WAIT_VIA = 2, LEG_TO_POST = 3, LEG_LOOK = 4, LEG_RESET = 5,
   LEG_DONE = 6, LEG_GIVEUP = 7;` (`LEG_WAIT_VIA` is S1b's; S1a never enters it) and a reused goal
   `readonly goal: OrderGoal = { x: 0, z: 0, y: NaN, move: false, face: NaN }` (`export interface OrderGoal`).
   - `start(b: OrderBoard, slot: number, x: number, z: number): void`: `LEG_TO_VIA` when `b.via` x is a number, else
     `LEG_TO_POST`; `t = walkT = 0`; keeps (x, z) as the start (for the arrival heading).
   - `step(dt, b, slot, x, y, z): OrderGoal` (no allocation):
     - `LEG_TO_VIA` / `LEG_TO_POST`: `walkT += dt`; `walkT >= ORDER.giveUp` -> `LEG_GIVEUP`. Target = via, else the stand
       point. Via reached when `hyp2 <= ORDER.atVia` -> `LEG_TO_POST` (the same step aims at the post). Post reached when
       `hyp2 <= ORDER.arrive` and (the point's y is NaN or `|y - py| <= 1.2`) -> `LEG_LOOK` (`K_WALK`) or `LEG_RESET`
       (`K_RESET`), `t = 0`, look base = the post yaw if a number, else the heading from the start to the post.
       While walking: `goal.move = true`, `goal.x/z/y` = target, `goal.face = NaN`.
     - `LEG_LOOK`: `t += dt`; `goal.move = false`; `goal.face = base + POST.lureSweep * sin(2 PI t /
       POST.lureSweepPeriod)` (assumption S1a-b: the look-round is the lure's sweep); `t >= ORDER.lookT` -> `LEG_DONE`.
     - `LEG_RESET`: `t += dt`; `goal.move = false`; `goal.face` = bearing to the face point (the switch), else the yaw.
       The caller ends it after `BREAKER.resetT` (gear.ts is not pure, so the leg does not read it).
     - `LEG_DONE` / `LEG_GIVEUP` / `LEG_NONE`: `move = false`, `face = NaN`.
   - `end(): void` -> `LEG_NONE`.
8. `checkMissionOrders(events: readonly OrderEvent[], sections: readonly OrderSection[], posts: readonly MissionPost[],
   rooms: readonly RoomRect[], noisy: readonly NoisySource[], hearAt: (dist: number, reachEff: number, loud: boolean)
   => HearTier = hearTier): string[]` (data time; allocates its result). Errors, readable, each naming the event:
   - a tag matching no guard of any section (`matchesTag` with the section id and the guard's index);
   - `postId` / `via` neither a mission post nor a room id;
   - a tagged guard on a high-security post (`post.highSecurity`) or a lookout post (`post.lookout`: J15 S7, read from
     the data whatever the `lookouts` flag) (A7);
   - a post's `circuits` empty, or a circuit not an integer >= 0; a duplicate post id;
   - a `bell` with `reach` not finite > 0; a tagged guard who would not hear the bell at his post through one wall:
     `hearAt(hyp2(guard - bell), effectiveReach(reach, 1, ambientDb(section.noisy ?? noisy, gx, gz, gy)), false) <
     ORDER.bellTier` (plan distance: runtime judges from the floor under the bell, the same on one storey; S1a-g).
   Returns `[]` for good data (Campaign Build's C4 expects `[]`).

#### 3. `tests/missionOrders.test.ts` (new; pure, node; ~320 lines)
1. `ORDER` values (lookT 8, joinWait 20, followGap 1.5, atVia 2.5, giveUp 120, bellTier 1, maxOrders 8, maxMembers 4,
   arrive 0.8).
2. `matchesTag`: by zone; `s2:6` by section id and index; the wrong section, `k` -1 and an empty tag never match.
3. `resolvePoint` / `findPost`: a post (y and yaw kept), a room centre on its storey (`minY`), a post wins over a room
   of the same id, an unknown id is false.
4. `OrderBoard`: `open` of the same live name returns the same slot (members join); a full board returns -1, then the
   oldest ended slot is reused; members with ids 9000+ work; `maxMembers` caps `add`; `refresh` gives walking ->
   arrived -> done, all dropped -> 'dropped', a `pend` tag with no member -> 'offered'; `holdsCircuit` only while a
   member is live; `fail` -> 'dropped'; `clear` frees all and keeps every array's identity (`toBe`).
5. `OrderLeg`: via then post (the via passes within `atVia`); arrival -> `LEG_LOOK`, the face stays within
   +-`POST.lureSweep` of the base, `LEG_DONE` after `lookT`; a reset post -> `LEG_RESET` facing the switch; `giveUp`
   -> `LEG_GIVEUP`; `step` returns the same goal object every call (no allocation: identity).
6. `checkMissionOrders`: a Two-Key-like fixture (section `w3`, the porter's slot at (117, 48) tagged
   `w3-lodge-porter`, room `w3-passage`, bell {118.5, 1.5, 50, reach 20}) -> `[]`; a Split-Shift-like fixture (`s2:6`,
   `s2:0`, post with circuits [55, 56], via a room id) -> `[]`; then one error each: unknown tag, unresolved post,
   unresolved via, high-security slot, lookout slot, circuit 55.5, circuit -1, empty circuits, duplicate post id, bell
   reach 0, the porter 25 m from the bell, the porter beside a 12 dB generator (`noisy`) that masks it.

### Part 2 (S1a-2 if split): the Enemy and the manager, the wiring tests, the e2e
#### 4. `src/ai/enemy.ts` (~170 lines; new code tagged `(guard-ai-mission-hooks S1a)`)
1. Imports: `import { K_RESET, LEG_DONE, LEG_GIVEUP, LEG_LOOK, LEG_RESET, M_ARRIVED, M_DONE, M_DROPPED, OrderLeg, ORDER,
   type OrderBoard } from './missionOrders';` (`POST` ~51, `BREAKER` ~61, `PACE` ~33 are already imported).
2. Fields, after the breaker walk's `private readonly brkGoal: { point: P2 | null; speed: number; face: number | null }
   = { point: null, speed: 0, face: null };` (~1428): `private orders: OrderBoard | null = null;`, `orderSlot = -1;`,
   `readonly leg = new OrderLeg();`, `private readonly ordP: P2 = [0, 0];`, `private readonly ordGoal` (same shape as
   `brkGoal`), each with a doc line. Getter `get ordered(): boolean { return this.orderSlot >= 0; }`.
3. New public methods right after `breakerStep` (it ends `this.ctx.breakerReset?.(this, group); } return g; }`, ~1516;
   before `ack(x: number, z: number, copy: boolean)`):
   - `orderRefusal(b: OrderBoard, slot: number): string`: '' when he may take it, else the cause: `'down'`
     (`!this.alive`), `'held'` (`taken`), `'passive'`, `'alerted'`, `'dog'` (`this.dog || this.def.melee`: S1a-c),
     `'secure'` (`this.secure`), `'order'` (`orderSlot >= 0`), `'busy'` (level not `unaware` / `cooldown` /
     `suspicious` (S1a-d), or `lure.active`, `runningAlarm`, `responder`, `crew !== null`, or `incident >= 0` with no
     breaker walk), and for a breaker walk (`brkGroup >= 0`): `'busy'` unless `b.kind[slot] === K_RESET &&
     b.hasCircuit(slot, this.brkGroup)` (the take-over). Constant strings only.
   - `takeOrder(b: OrderBoard, slot: number): boolean`: `orderRefusal` non-empty -> false. Else: a breaker walk on one of
     the order's circuits ends without a reset (`this.endBreaker()`: its incident -1, the board closes it at its next
     `follow`); `orders = b`, `orderSlot = slot`, `leg.start(b, slot, pos.x, pos.z)`, `turnT = 0`,
     `routePath.length = 0`, `this.bark('checking')` (the radio line `sendTo` uses; S4's bark-by-cause covers the rises
     on the way, see drift); true.
   - `leaveBreaker(): void { this.endBreaker(); }` (doc: a reset order on his circuit took the walk over; the manager
     calls it on the other walkers of the order's circuits).
   - `dropOrder(cause: string): void` -> `endOrder(false, cause)` (the manager: a held guard).
   - `private endOrder(done: boolean, cause: string): void`: no order: return. `b.set(slot, this.num, done ? M_DONE :
     M_DROPPED, cause)`, `orders = null`, `orderSlot = -1`, `leg.end()`, `routePath.length = 0`,
     `this.walker.rejoin(this.pos.x, this.pos.z)` (A5 "back to his route").
   - `private orderStep(dt: number): { point: P2 | null; speed: number; face: number | null }` (reuses `ordGoal`):
     a `K_RESET` order whose circuits all read on (`this.ctx.breakerOff?.(c) === false` for every one) ends done at
     once (cause 'on': a replay after a restart, or someone else relit it). Else `const lg = this.leg.step(dt, b, s,
     pos.x, pos.y, pos.z)`; `LEG_GIVEUP` -> `endOrder(false, 'giveUp')`; first step in `LEG_LOOK` / `LEG_RESET` ->
     `b.set(s, num, M_ARRIVED)`; `lg.move`: `ordP` = (lg.x, lg.z), `point = this.goTo(this.ordP, dt, ORDER.arrive *
     0.8, lg.y)`, `speed = this.def.walkSpeed * (this.caution > 0 ? PACE.cautious : PATROL_PACE)` (the breaker walk's
     pace, A5); else `face = lg.face` when a number. `LEG_RESET` with `leg.t >= BREAKER.resetT`: for each circuit still
     off (`breakerOff?.(c) !== false`) `this.ctx.breakerReset?.(this, c)`, then `endOrder(true, '')`. `LEG_DONE` ->
     `endOrder(true, '')`. No allocation (index loops over the circuits array).
4. `calmDecide` (~2764, `private calmDecide(dt: number)`), right after `this.spotArrived = false;`:
   `// (guard-ai-mission-hooks S1a, A5, A6) a board task, a lure or a breaker walk took him off the order: dropped`
   `if (this.orderSlot >= 0 && (this.incident >= 0 || this.brkGroup >= 0 || this.lure.active)) this.endOrder(false, 'task');`
   Then in `case 'unaware': case 'cooldown':` after `if (this.brkGroup >= 0) return this.breakerStep(dt);` (~2774):
   `if (this.orderSlot >= 0) return this.orderStep(dt);`; in `case 'suspicious':` after
   `if (this.brkGroup >= 0 && this.rate <= 0) return this.breakerStep(dt);` (~2820):
   `if (this.orderSlot >= 0 && this.rate <= 0) return this.orderStep(dt);` (a glimpse stops him to look, A5).
5. `onLevel` (~2114), after `if (this.brkGroup >= 0 && to !== 'suspicious' && to !== 'unaware' && to !== 'cooldown')
   this.endBreaker();` (~2118): `if (this.orderSlot >= 0 && to !== 'suspicious' && to !== 'unaware' && to !==
   'cooldown') this.endOrder(false, to);` (anything more than a glimpse drops it, A5; the cause is the level).
6. `torchWanted` (~2087): `const lvl = this.caution > 0 && this.aware.calmNow ? 'searching' : this.aware.level;`
   becomes `const lvl = this.orderSlot >= 0 && this.aware.calmNow ? 'investigating' : this.caution > 0 &&
   this.aware.calmNow ? 'searching' : this.aware.level;` with a comment (A5: "torch by the investigating rule").
7. Not touched: `inherit` (~1087): a woken guard is a new `Enemy` with `orderSlot` -1 and is never offered (A6).

#### 5. `src/ai/enemyManager.ts` (~250 lines; new code tagged `(guard-ai-mission-hooks S1a)`)
1. Import: `import { findPost, K_RESET, K_WALK, M_DROPPED, M_WALKING, matchesTag, ORDER, OrderBoard, resolvePoint,
   type MissionPost, type OrderEvent, type OrderKind, type OrderPhase } from './missionOrders';` (`flags` is imported
   ~52, `Vector3` ~1, `hyp3` already used).
2. Fields after the lookout fields (`private readonly lookCd = new Float32Array(MAX_KEYS);`, ~345):
   `readonly orders = new OrderBoard();` (tests read it), `private missionSecs: readonly string[] = [];`,
   `private missionPosts: readonly MissionPost[] = [];`, `private readonly bellP = new Vector3();`,
   `private readonly ordPt = new Float32Array(4);`, `private readonly ordWarned = new Set<string>();` (dev warn once
   per name; event time).
3. Public API (place after `setNoisy(list: readonly NoisySource[]): void { this.noisy = list; }`, ~2532-2534):
   - `setMissionMap(sectionIds: readonly string[], posts: readonly MissionPost[]): void` (C1; kept through `clear()`,
     replaced by the next call).
   - `missionOrder(tag: string, kind: OrderKind, postId: string, via?: string, name = ''): void`:
     1. `if (!flags.missionOrders) return;` `const nm = name || tag;`
     2. Resolve `postId` (`resolvePoint` with `this.ctx.rooms`) and `via`; a `reset` needs `findPost(...)?.circuits`
        with length > 0. Any failure: `this.orders.fail(nm, cause)` and, `import.meta.env.DEV`, one
        `console.warn('guard-ai orders: ...')` per name (`ordWarned`). Return.
     3. `const s = this.orders.open(nm, kind === 'reset' ? K_RESET : K_WALK)`; -1: dev warn "board full", return.
     4. Points: the via and the post snapped to the nearest walkable cell (`this.nav.nearestWalkable(x, z, 4, y)`, then
        `nav.center(c)` / `nav.cellHeight(c)`, as `resetBreaker` does ~1458-1467; no cell: the point). A reset: the
        switch from `this.breakers?.switchOf(circuits[0], post.x, post.z, this.swP)` (`swP` ~557) is the face point
        and its cell the stand point (A2: the walk ends at the board's own switch); no host or no switch: the post.
        Store `circuits` and `bell` references, the post yaw.
     5. The tagged guards: every guard in `this.enemies` with `matchesTag(tag, e.zone, this.missionSecs[e.section] ??
        '', e.slotIdx)`, plus every `this.bodies` entry whose `guard` matches (dead or knocked out: recorded
        `M_DROPPED`, cause 'down', so a KO'd porter reads 'dropped', C7). No guard and no body: `pend[s] = tag`,
        `pendN++` (offered at his `placeSlot`, A6).
     6. With a `bell`: `ringBell(s, tag)`; else `offer(e, s)` to each tagged live guard.
     7. `this.orders.refresh(s)`.
   - `onMissionEvent(ev: OrderEvent): void` = `missionOrder(ev.guardTag, findPost(ev.postId,
     this.missionPosts)?.circuits ? 'reset' : 'walk', ev.postId, ev.via, ev.name)` (A3).
   - `orderPhase(name: string): OrderPhase` (`find`, else 'none'), `orderMembers(name: string): number` (`liveN`; 0
     none) (C7, no allocation), `orderOf(e: Enemy): { name: string; kind: OrderKind; phase: OrderPhase; leg: number }
     | null` (debug / e2e; allocates).
4. Private helpers (next to the API):
   - `offer(e: Enemy, s: number): void`: `const why = e.orderRefusal(this.orders, s)`; refused: `add(s, e.num,
     M_DROPPED, why)` + dev log naming the order, the guard and the cause; taken: `e.takeOrder(...)`, `add(s, e.num,
     M_WALKING)`, and for `K_RESET` every other guard with `breakerGroup >= 0 && this.orders.hasCircuit(s,
     o.breakerGroup)` gets `o.leaveBreaker()` (one goes, PLAN "Cut first"). `maxMembers` full: dropped, dev log.
   - `ringBell(s: number, tag: string): void` (A4): `bellP` = (bell.x, `this.nav.heightAt(bell.x, bell.z, bell.y)`,
     bell.z) (the floor under the bell, as every other noise is a floor point; S1a-g); `this.hearRoom(n)`; for each
     guard i (skip `!alive`, `taken`, `passive`): `d = hyp3(...)`; tagged and `d >= reach` -> dropped 'unheard';
     else `tier = this.tierOf(e, i, this.bellP, reach, d, false)` (walls, masking: `tierOf` ~2931); tagged and
     `tier >= ORDER.bellTier` -> `offer`; tagged and not heard -> dropped 'unheard'; every guard in reach with tier
     >= 1 who is not now walking the order, the dog included, gets `e.hearTurn(bell.x, bell.z, 0)` only (turn, no meter
     bump, no `e.hear`, no lure, no incident, no report: S1a-h).
   - `offerPlaced(e: Enemy): void` (from `placeSlot`): for each slot with `pend` matching `e`: clear `pend`
     (`pendN--`; once, A6), then with a bell judge him alone as `ringBell` does (tier from `bellP` of that bell), else
     `offer`; `refresh`.
   - `orderTick(): void` (every step while `orders.live > 0`): each live member (`M_WALKING` / `M_ARRIVED`):
     `const e = this.byNum(num)` (~2920); none (knocked out, killed, despawned: off the list) -> `set(s, num,
     M_DROPPED, 'down')`; `e.taken` -> `e.dropOrder('held')`. No allocation (index loops).
5. Hooks in existing code:
   - `placeSlot` (~2126-2201): after its last line `if (inList) this.buildPair(e, index);`:
     `// (guard-ai-mission-hooks S1a, A6) a tagged slot placed after its order's event: offered once (never a woken guard)`
     `if (this.orders.pendN > 0) this.offerPlaced(e);`
   - `update(dt)` (~3744): after the per-guard loop (`for (let i = 0; i < list.length; i++) { const e = list[i]!;
     e.update(dt);` ... `doors.pushOpen(e.pos.x, e.pos.z); }`, ~3851-3860), before
     `// (guard-ai S10) talking pairs at the board rate, after the guards moved`: `if (this.orders.live > 0)
     this.orderTick();`
   - `circuitOut` (~1309): after `if (n === 0) return;`:
     `// (guard-ai-mission-hooks S1a, PLAN "Order first") a reset order holds this circuit: no incident, no tamper`
     `// clock, no second guard; the dark lamps count as known (late discovery leaves them)`
     `if (this.orders.holdsCircuit(group)) { this.dark.markGroup(this.world.level.lights, group); return; }`
   - `circuitBusy` (~1352): first line `if (this.orders.holdsCircuit(group)) return true;` (doc: "or a reset order holds
     it"); so `relightStep` and the tamper retry see the holder.
   - `fillPair` (~2321): `if (!e || !e.alive || e.taken) {` -> `if (!e || !e.alive || e.taken || e.ordered) {` with
     `// (guard-ai-mission-hooks S1a) an ordered guard is away: his partner reacts as to a partner gone (J15 S6)`.
     The ordered guard gets no order of his own for his partner; back on his route both are present and a `missing`
     pair resets (`pairStep` ~2365, today's code).
   - `clear()` (~3996): after `this.lookCd.fill(0);` add `// (guard-ai-mission-hooks S1a, A8) and every mission order
     (the mission map stays)` `this.orders.clear();`. `despawnAll()` (~1986, every Sector Ops section load and restart)
     calls `clear()`, so a restart drops every order (A8; C3 re-raises).
6. Flag off: only `missionOrder` reads `flags.missionOrders`; with it off the board stays empty, so every hook above is
   a no-op (`live` 0, `pendN` 0, `holdsCircuit` false, `ordered` false).

#### 6. `tests/missionOrdersManager.test.ts` (new; ~330 lines)
Copy (do not import across test files) the stand-in guard and `manager(wall)` harness of `tests/hearing.test.ts`
(~98-163: `FakeGuard`, `guard`, `manager`, `cast`), adding to the fake `zone`, `section`, `slotIdx`, `key`, `secure`,
`breakerGroup`, `ordered`, `orderRefusal: vi.fn(() => '')`, `takeOrder: vi.fn(() => true)`, `leaveBreaker`,
`dropOrder`; and the bare-prototype `probe` of `tests/postsWiring.test.ts` (~305-370) for the `Enemy` cases (add the
order fields, `incMode`, `brkGroup`, `responder`, `crew`, `caution`, `lure`, a `ctx` with `breakerOff` /
`breakerReset` spies). `import { flags } from '../src/core/flags'`; set `flags.missionOrders = true` in `beforeEach`,
restore in `afterEach`. Cases (PLAN "Unit", each its own `it`):
1. Flag off: `missionOrder` adds nothing (`orders.live` 0, phase 'none'), calls no `takeOrder` and no `hearTurn`.
2. Offer table, walk: an eligible tagged guard takes it (phase 'walking', `orderMembers` 1); an untagged one is not
   asked. Ineligible at the offer, each dropped with its cause and never asked again (a later step, a later
   `placeSlot` of another guard): on the probe, `orderRefusal` gives 'held', 'passive', 'alerted', 'busy' (an
   incident, a breaker walk on another circuit, a lure, `searching`, another order), 'secure', 'dog'; on the
   manager, a KO'd tagged guard (a body whose `guard` matches, off the list) -> 'dropped' with cause 'down'.
3. A late-placed slot: no guard of the tag at the event -> 'offered'; `placeSlot` of a matching guard -> offered once;
   a second matching `placeSlot` -> not offered. A woken guard (pushed on the list with the tag, no `placeSlot`) is
   never offered.
4. Bell: heard in the open (tier >= 1) -> offered; 25 m off a 20 m bell -> dropped 'unheard'; behind a wall
   (`manager(wall)`) at 12 m of a 20 m bell (0.45 x 20 = 9 m) -> unheard, at 6 m -> heard; beside a 12 dB generator
   (`em.setNoisy`) -> unheard where the open floor hears it. Bystanders in reach: `hearTurn(x, z, 0)` once, never
   `hear`, `sendTo` or a board incident (`em.board.openCount` 0); a dog bystander (`def.melee` set): `hearTurn` only.
5. Breaker cut first: a tagged guard with `breakerGroup` 55 takes a reset on [55, 56] (take-over allowed by
   `orderRefusal` on the probe; `endBreaker` ran, `breakerGroup` -1, no reset counted); another guard walking 56 gets
   `leaveBreaker`; `circuitBusy(55)` true; a fresh `circuitOut(55, ...)` with a witness opens no incident and the
   tamper state is unchanged.
6. Order first: with the reset order live, `circuitOut(55, ...)` and late discovery report nothing; after the order
   ends (done), the same cut is reported as today.
7. Reset at the board (probe): at the stand point after `BREAKER.resetT`: `breakerReset` for 55 and 56 while both are
   off; only for the one still off; both on at the first step -> done at once (cause 'on').
8. `orderPhase` sequence: 'none' -> 'walking' -> 'arrived' -> 'done' on the probe walking a real `OrderBoard`
   (`goTo` stub), and `walker.rejoin` once at the end; a giveUp -> 'dropped'.
9. Drops on the way (probe): `onLevel` to `investigating` -> dropped (cause 'investigating'); suspicious with
   `rate > 0` holds still (no goal), with `rate <= 0` walks on; an incident set (`sendTo`) -> dropped 'task' on the
   next `calmDecide`; pace = `walkSpeed * PACE.patrol` (cautious: `PACE.cautious`).
10. `orderTick`: a member off the list -> dropped 'down'; a held member -> `dropOrder('held')`.
11. Pairs: `fillPair` reads an ordered guard as not present (private, via a cast).
12. Restart: `clear()` -> phase 'none', `live` 0, the board object and its arrays the same (`toBe`); the mission map
    kept (an order after `clear` resolves its post).
13. Torch: an ordered calm guard's `torchWanted` follows the investigating rule (the probe with a dark field).
14. No allocation: the probe's `orderStep` returns the same goal object each step; `orders.mem` keeps its identity.

#### 7. e2e (`scripts/e2e-stealth-ai.mjs`, written by you, run only by the lead)
The suite runs one page (`launch({ url, params: 'autostart=warehouse&mode=clear' })`, ~12) and flags are URL-only, so
append `&missionorders=1` to that params string with a comment (S1a-e: flag on for the whole suite; nothing else
reads it and no other scenario places an order). New `await scen('mission order (guard-ai-mission-hooks S1a)', ...)`
placed before the closing console-error assert (`const real = errors.filter(...)`, after the 'dog release (guard-rules
S8)' scenario ~3281-3401). `Math.random` seeded as 'breaker' does; `t.light(0)`; the player hidden at (-22, -24)
crouched; `em.setMissionMap(['wh'], posts)` at the start and `em.setMissionMap([], [])` in `finally`. Tag guards with
`em.placeSlot(e, { yaw, zone: '<tag>' }, 0)` right after `t.spawn`. Step 0.1 s; record `em.orderPhase(name)`
changes (consecutive duplicates collapsed); `Math.hypot` is fine in page code.
- (a) Bell order (porter-style): porter P at (3, 5.5) tagged 'e2e-porter'; bystander B untagged at (7.5, 4); O
  tagged 'e2e-porter' at a floor point 17-20 m from the bell (e.g. near (-14.5, 4)); K tagged at (6, -2), knocked out
  (`t.kill(K, true)`) and stepped 0.5 s before the order (the 'one investigates' spots, ~349-397). Post 'e2e-look': an
  open floor point 8-12 m from P, at least 4 m from O (find it with a `floor(x, z)` check as the dog release scenario
  does ~3300-3325). Bell {x 3, y 1.5, z 3, reach 12}. `em.missionOrder('e2e-porter', 'walk', 'e2e-look', undefined,
  'e2e-bell')`. Assert: `orderMembers` 1 and `orderOf(P)` set; O never moves 1 m and `orderOf(O)` null; K is no
  member (`orderOf` of any revived K null); B turns (`B.turning` within 0.3 s), never moves 1 m, `B.incident === -1`;
  P walks there at patrol pace (max speed < `walkSpeed * 1.25`), ends within 1 m of the post, looks round
  (`ORDER.lookT` 8 s +-1 s at the post), then `orderOf(P)` null and he walks away; phases exactly `['walking',
  'arrived', 'done']`. Log the walk time (PLAN risk: `giveUp` 120 s).
- (b) Reset order taking over a breaker walk (supervisor-style): the 'breaker' scenario's setup (~1483-1510: guards a
  (4, 1) and b (3, -6.5) with their short patrols, both tagged ('e2e-fac-a', 'e2e-fac-b'); `switch-4`, `grp =
  g.world.layout.switches[4].group`). Cut it (`sw.onUse(sw, 'local')`), step 0.3 s: the walker w has `breakerGroup ===
  grp`. Then post 'e2e-board' {x sw.pos.x, z sw.pos.z, circuits [grp]} and `em.missionOrder(w.zone, 'reset',
  'e2e-board', undefined, 'e2e-reset')`. Assert at once: `w.breakerGroup === -1`, `orderOf(w).kind === 'reset'`, the
  other guard has `breakerGroup === -1`. Over 60 s: neither ever holds a 'light' or 'breaker' incident
  (`em.board.kindOf(e.incident)`), `g.stealth.switchOn(grp)` comes back and every lamp of `grp` is lit, exactly one
  reset (`em.breakerResets` +1), phases exactly `['walking', 'arrived', 'done']`, both calm with no task after.
- Flag-off behaviour is covered by vitest (case 1) and by every other suite (they run with the flag off).
- The lead requests (builder runs no e2e): the head's `affected-e2e` gate plus `e2e-guard-carry` and
  `e2e-sectorops --part=1` (PLAN: the `src/ai` row); the deciding suite is `e2e-stealth-ai --only=mission order`.

## Docs
- No `docs/systems/ai.md` edit (not claimed). In your report, the lines for the lead to fold: a "Mission orders
  (guard-ai-mission-hooks S1a, flag `missionOrders`)" bullet: the API (`setMissionMap`, `missionOrder`,
  `onMissionEvent`, `orderPhase`, `orderMembers`, `orderOf`), the offer rule (one offer at the event; the state gate;
  a late-placed slot once; never a woken guard), the bell (tagged guards by hearing tier, bystanders turn only), the
  breaker take-over and `circuitOut` / `circuitBusy` holding, the pair rule, `clear()` dropping every order.
- No changelog fragment (the lead writes the job's one at the PR). No TESTING.md change.

## Rules
- Hot path: per step only `orderStep` (an ordered guard), the `live > 0` gate and `orderTick` (8 x 4 members, index
  loops), `holdsCircuit` (8 slots x a few circuits). No closures, iterators, arrays, objects or strings per step;
  `hyp2` / `hyp3` (`core/mathx.ts`), never `Math.hypot` in `src`. Allocation only at event / data time
  (`missionOrder`, `checkMissionOrders`, dev logs, `orderOf`).
- Fixed and explainable (VISION 8, G143): no randomness; one offer rule; every drop recorded with its cause.
- Gameplay never reads graphics: posts, rooms, the nav grid, `BreakerHost`, the noise model only.
- Co-op: host / solo only (the manager simulates guards; clients see the walk through the guard sync). No wire or save
  change, no `PROTOCOL_VERSION`, no `src/net` edit.
- Must NOT touch: `src/ai/hearing.ts`, `src/ai/guardAiData.ts` (S2), `src/ai/pairs.ts`, `src/ai/incidents.ts`,
  `src/ai/barks.ts`, `src/game/**`, `src/world/maps/**`, `docs/systems/ai.md`, any other test or script.

## Checks
`npm run typecheck:fast` and
`npx vitest run tests/missionOrders.test.ts tests/missionOrdersManager.test.ts tests/hearing.test.ts tests/breaker.test.ts tests/guardRelight.test.ts tests/campusS2Board.test.ts tests/consoleFault.test.ts tests/guardPolishB.test.ts tests/pairs.test.ts tests/pairsWiring.test.ts tests/lookout.test.ts tests/postsWiring.test.ts tests/enemyManagerDespawn.test.ts tests/coopTorches.test.ts tests/barkCause.test.ts`
(the files that drive `circuitOut`, `circuitBusy`, `resetBreaker`, `fillPair`, `placeSlot`, `torchWanted` and the
bark tables: green with the flag off). Never `npm run check`. Before touching a default, grep `tests/` and `scripts/`
(preamble). Report: built, numbers used, files, commits, tests changed, results, the ai.md lines, what Michael should
try (walk items 1 and 3 need C1-C3 / C7 first; on the warehouse: `?missionorders=1` and the e2e calls by hand).

## Done looks like (flag on)
- The bell sends the guard who hears it (porter-style), not one out of reach or knocked out; a bystander only turns.
- A reset order takes over a breaker walk already running: one guard, no tamper check, the circuit relit by him.
- `orderPhase` reads `walking` -> `arrived` -> `done`; a dropped order reads `dropped` with its cause in the dev log.
- Flag off: nothing changes; every file in the vitest command green; tsc clean; ai.md lines in the report.

## Est. lines (and the split: lead decision 1)
PLAN said 1,220. Re-estimated on the real anchors:

| File | PLAN | Re-estimate |
| --- | --- | --- |
| `src/core/flags.ts` | ~20 | ~16 |
| `src/ai/missionOrders.ts` | ~280 | ~330 (board fields, `fail`, `findPost`, the leg's look and reset states) |
| `src/ai/enemy.ts` | ~150 | ~170 (`orderRefusal` causes, three calmDecide / onLevel hooks, torch) |
| `src/ai/enemyManager.ts` | ~190 | ~250 (bodies matched for 'down', `offerPlaced`, `orderTick`, five hooks) |
| `tests/missionOrders.test.ts` | ~260 | ~320 |
| `tests/missionOrdersManager.test.ts` | ~160 | ~330 (two harness copies ~110 lines: hearing.test fakes + the Enemy probe) |
| `scripts/e2e-stealth-ai.mjs` | ~160 | ~230 (two parts, site finder, phase log) |
| Total | 1,220 | ~1,650 |

J15 PR4's own slices ran over their briefs the same way (S7 `lookout.test.ts` 347 lines vs ~210 briefed; S8
`dogRelease.test.ts` 268 vs ~150, its e2e 121 vs ~65). ~1,650 is over the ~1.5k PR cap, so this brief proposes the
split (lead decision 1): **S1a-1** = Part 1 (flags, `missionOrders.ts`, `tests/missionOrders.test.ts`; ~670 lines,
pure, no e2e, no runtime change: the flags are read by nobody yet) and **S1a-2** = Part 2 (enemy, manager, wiring tests,
e2e; ~980 lines), cut from S1a-1's merge head. Without the split: one PR, and the builder stops and reports if the diff
passes 1,500 lines before step 7.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S1a-a: `ORDER.arrive` 0.8 m (not in PLAN): at the post within 0.8 m and on its storey (1.2 m, as the breaker walk).
- S1a-b: the look-round is the lure's sweep (`POST.lureSweep` +-0.6 rad, `POST.lureSweepPeriod` 3 s) round the post
  yaw, else his arrival heading.
- S1a-c: dogs and melee kinds never take an order (the board never sends them either); refusal cause 'dog'.
- S1a-d: a suspicious guard (a glimpse in progress) is eligible, as `resetBreaker` accepts `suspicious`; investigating,
  searching and combat are "busy" / "alerted".
- S1a-e: the e2e page runs the whole `e2e-stealth-ai` suite with `?missionorders=1` (flags are URL-only, one page);
  no other scenario calls `missionOrder`, so their behaviour is unchanged. Undo: a second page for the scenario.
- S1a-f: "the order holds the circuits' incidents" is built as: the walker's breaker incident closes at the board's
  next `follow` (`incidents.ts` ~824-864: an investigator off the task frees it), and `circuitBusy` / `circuitOut`
  count the order as the holder. Nobody else is sent, no tamper clock, no relight retry.
- S1a-g: the bell is judged from the floor point under it (`nav.heightAt(x, z, bell.y)`), as every other noise is a
  floor point in `tierOf`; `checkMissionOrders` uses the plan distance (the same on one storey).
- S1a-h: bystanders (and a tagged guard who hears it but is ineligible) turn with `hearTurn(x, z, 0)`: no meter bump, so
  a bell alone never makes anyone suspicious ("they only turn to look").
- S1a-i: a tagged slot dead or knocked out at the event (a `bodies` entry whose `guard` matches) is recorded dropped
  ('down'); only a tag with no guard and no body waits for its `placeSlot` (else a KO'd porter would read 'offered').
- S1a-j: one order name = one board slot; a second event with the same live name adds members (each walks alone in
  S1a; S1b groups them by via). A name whose slot has ended opens a fresh order (A15: a re-raise walks again).

## PLAN pointer drift (PLAN says -> now, b111c9aa1)
- `enemy.ts`: `sendTo` 1260 -> 1296; `resetBreaker` 1407 -> 1443; `sendable` 1251 -> 1288; `Enemy.secure` (no line) ->
  1992; also used: `breakerGroup` 1431, `endBreaker` 1475, `breakerStep` 1484-1516, `onLevel` endBreaker line 2118,
  `calmDecide` 2764 (breaker lines 2774, 2820), `torchWanted` 2087, `inherit` 1087.
- `enemyManager.ts`: `circuitOut` 1195 -> 1309; `circuitBusy` 1238 -> 1352; `tierOf` 2728 -> 2931; `noise` 2757 -> 2960
  (`hear` 3026); `ctx.breakerOff` 676 -> 707; the constructor's `mapNoisy` 559-560 -> 590-591; `setNoisy` 2356 ->
  2532 (PLAN-CHECK's numbers); the board's `resetBreaker` call 2419 -> 2621; also used: `placeSlot` 2126-2201,
  `fillPair` 2321, `pairStep` 2343, `byNum` 2920, `update` loop 3851-3860, `clear` 3996-4072, `despawnAll` 1986,
  `swP` 557.
- `breaker.ts` `BreakerHost.switchOf(group, x, z, out)` / `isOff(group)` 14-16 -> the interface is 14-21 (`switchOf` 16,
  `isOff` 18, `reset` 20). `hearing.ts` `NoisySource` 38-52: unchanged.
- `BREAKER.resetT` (2 s) lives in `src/ai/gear.ts` ~70 (not pure: imports `../game/damage` types and `./intruders`),
  so the pure leg leaves the reset timing to `Enemy`.
- Engine facts (origin/feature/mission-engine 231bdbfbf, not this slice's code): `gameEvents.ts:13`, `stepEvents`
  573, `syncWalked` 588, `restarted` 349, `tallowWharfW3.ts:102` unchanged; the porter's slot is
  `tallowWharfSectors.ts:150`.
- J15 S4's bark-by-cause has no `checking` variant: S4 split only the rise lines (`onLevel` ~2125-2130: `heard` /
  `saw` / `investigate` by `riseCause`); `checking` stays one line (`barks.ts` ~78). The order barks `checking` at
  `takeOrder`; a rise on the way barks by its cause through S4 unchanged.
- A8 "orders go at `clear()` (section load / restart)": true on the head through `despawnAll()` -> `clear()`
  (`sectorMode.ts` `unloadSection` ~743); PLAN does not name `despawnAll`.

## Open questions for the lead (PLAN facts that do not hold on the head; the design is not changed here)
1. Lookouts at runtime: with `lookouts` OFF a lookout slot gets no post (`slotPost` returns null, `enemyManager.ts`
   ~2207-2211), so `Enemy.secure` is false and such a guard would be orderable. `checkMissionOrders` rejects a tagged
   lookout from the data whatever the flag (C4), so valid data never reaches it. This brief adds no runtime check;
   adding one needs an Enemy field for the raw tag. OK as is?
2. The size: split S1a into S1a-1 / S1a-2 (above)?

## Lead decisions (2026-10-26 ~05:30)
- 1 (split): SPLIT. S1a-1 = the three flags, `missionOrders.ts` and its unit tests (pure, no runtime change, no
  e2e). S1a-2 = Enemy and manager wiring, the wiring tests and the e2e, cut from S1a-1's head after it passes its
  checks. Each its own PR, each under ~1.5k lines.
- 2 (lookout runtime check): ACCEPTED as briefed: no runtime check. `checkMissionOrders` rejects a tagged lookout in
  the data whatever the flag; with `lookouts` off he is an ordinary guard.
