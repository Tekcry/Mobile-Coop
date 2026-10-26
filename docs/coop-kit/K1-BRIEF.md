# coop-kit K1 brief: Deadweight
Owner: Night Shift | Player Build. Status: current (job doc; the slice brief, written by the lead's Opus brief writer
2026-10-26 ~21:40).

Read first: `git show origin/master:docs/systems/agent-preamble.md` and `git show origin/master:CLAUDE.md` (hard rules:
`src/net` only via dynamic import behind `flags.coop`; hot paths allocate nothing; `hyp2`, never `Math.hypot`).

- Worktree C:/NightShift/Mobile-Coop-coop-kit-k1, branch feature/coop-kit-k1. Base: if PR #599 (K0) is on origin/master
  when you start, cut from origin/master and open the PR against master; else (today) cut from
  origin/feature/coop-kit-k0 at 9cc70de2c and open the PR against feature/coop-kit-k0 (the lead retargets it to master
  once #599 lands; #599's own base #590 is riding a train). Say which in the report. Guard before every write:
  `git -C C:/NightShift/Mobile-Coop-coop-kit-k1 branch --show-current` prints feature/coop-kit-k1, else stop. Push:
  `git push -u origin feature/coop-kit-k1`. node_modules is a junction to C:/NightShift/Mobile-Coop-menu/node_modules:
  never npm install / ci.
- Spec: docs/coop-kit/PLAN.md on origin/feature/coop-kit, "Part 2 (detailed)": "How the five moves plug in", "The Marlow
  API", "Design per move" -> "Deadweight", "Slices" -> K1, the Claims note "K slices among themselves". BRIEF A12 / A17
  / M3 (the bands stay move constants: "Not yet"), A18 (Marlow owns the set files), A19 (one done API), A20 (mechanics
  first, placeholder poses). Checks you must honour from K0 / K5a / K5b (C:/NightShift/scratch/ctcore/k0-CHECK-A.md,
  k0-CHECK-B.md, k5a-CHECK.md, k5b-CHECK.md): register the kit device for every spot always and gate only the offer and
  the device's effect (k0-CHECK-B polish 3); no `src/net` edit; one-line `KIT_BUILT` conflict with K5b resolved by
  whichever lands second.
- Map input (Marlow Build ~21:20, draft PR #612 head 5f6b70b31 on branch feature/marlow-kit-wire; A4 geometry from #608,
  merged): `replan/a4GoodsShed.ts` places `addKitSpot(b.anchors, { id: 'a4-deadweight', kind: 'deadweight', x: dw.x,
  y: gr.h, z: gr.z - dw.off, yaw: 0, x2: dw.x, y2: gr.h, z2: gr.z + dw.off, door: String(p.doors[A4_GRILLE_DOOR]!) })`
  with `A4_GRILLE = { x0: 101, x1: 104, z: 24, t: 0.5, h: 2.4 }` and `A4_DEADWEIGHT = { x: 101.75, off: 1.5 }`: near
  grip (101.75, 2.4, 22.5) in the passage, far grip (101.75, 2.4, 25.5) in the back aisle, floor y 0 both sides. The
  grille is `b.door(101, 0, 24, 3, PI / 2, { height: 2.4, locked: true, leaf: 'slide' })`: a 3 m sliding door, locked
  (Marlow holds its motor gate while `deadweight` is on: "No power here. This one takes the co-op move."), doorway
  centre (102.5, 24). **The spot's `door` is TEXT (`String(<door anchor id>)`) while the level stores a number: compare
  `String(d.anchor.id) === spot.door`.** Marlow's `CourseMode.onKitDone` credits station 9 when `kind` is
  `'deadweight'` and `spot` is `'a4-deadweight'`; the station also needs its place flag `a4-grille` (both players in the
  back aisle zone x 98.5-104.5, z 24.3-27.2), so two passes finish it. A station retry calls `g.team.resetKit()` on
  host and client, then puts the grille back shut and teleports both players to marks at z 14. Match all of this; no
  map or set file edit.
- Prototype mode (Michael ~16:05 / ~16:20, BRIEF M3): starting values (G10), no tuning or polish passes, build toward a
  playable piece.

## Goal
Michael's words (SIGNOFF row, picked 2026-10-25 ~18:05, BRIEF M1): "One hangs on a chain so a counterweighted grate
lifts for the other." Two players at a Deadweight spot: one jumps, grabs a chain and hangs; the host lifts the spot's
grate (its door) while someone hangs; the partner ducks under; letting go drops the grate, never onto a body. One chain
each side, so whoever is through hangs for the other. The host tells the mode on each pass (`onKitDone`). `deadweight`
joins `KIT_BUILT` (on in /preview/, off live), so Marlow station 9 `a4-deadweight` uses the real move.

## Out of scope
Animation (KA1: K0's placeholders stay; see "Animation per role"), map / set files and `courseState` / `courseMode`
(Marlow's, A18), any `src/net` or wire change, any edit to K0's shared files (`registry.ts`, `teamController.ts`,
`teamMoves.ts`, `team.ts`, `kitApi.ts`) beyond the conditional `reset` hook use in item 1, K5a / K5b files
(`src/game/kit/plankBridge.ts`, `src/world/plankBridge.ts`, `src/world/world.ts`, `src/game/stealthSystems.ts`), guard
reactions beyond the existing door rules (G403 names no notice for Deadweight), a faster grate fall
(`src/world/doors.ts`, K1-2), the A12 bands in the level rules (KD parked), tuning.

## Files and exact behaviour (est. ~850 lines incl. tests and docs; stay under ~1,000)

### 1. `src/game/kit/deadweight.ts` (new, the move; ~420 lines)
Header: the design below (PLAN "Deadweight" plus K1-1..K1-6), the spot fields, the host rule, the done rule. Pure and
Babylon-free: type imports only from `world/doors` (`DoorState`) and the player (`MoveOverride`); the kinematic vector
is the controller's own (`c.pos.clone()` once per run, as `shutter.ts` `begin`). Registers `DEADWEIGHT_MOVE` with
`registerKitMove` at load (teamController's glob loads it).

**Constants** (`DEADWEIGHT`, starting values, A17; each with a one-line doc):
`reach` 0.8 (m, the hang offer: horizontal from a chain), `gripLo` 2.0 / `gripHi` 2.8 (m, the grip over the player's
feet for the offer: the A12 band 2.2-2.6 +-0.2 for the controller's 2-4.5 cm rest gap and floor drift), `grab` 0.6 (s,
`chainGrab`), `hangLen` 2.15 (m, grip to soles in a dead hang, arms long, a 1.75 m operator), `sag` 0.5 (m, the chain
pays out), `sagTime` 0.5 (s), `footClear` 0.05 (m, the feet never go lower than this over the floor), `chainDrop` 0.5
(s), `lift` 0.8 (s, the host: hanging this long before the grate opens), `drop` 0.4 (s, the host: nobody hanging this
long before it shuts), `holdReach` 1.0 (m, the host: a hanger within this of a chain), `holdLo` 1.9 / `holdHi` 2.9 (m,
the host: grip minus the hanger's feet), `passOpen` 0.9 (the door's `open` fraction before the pass is offered),
`passReach` 1.0 (m, the pass offer: off the door plane), `passUp` 0.4 (m, same floor as the door), `passTime` 1.0 (s,
`grateUnder`), `passOut` 0.7 (m, the pass ends this far past the plane), `sideIn` 0.35 (m, the lane keeps in from the
doorway's sides), `doorwayAcross` 0.5 (m, the no-crush box: either side of the plane, the doorway's width + 0.2 along),
`crossMin` 0.3 (m, a side counts only this far off the plane: the leaf's 0.25 half thickness, no jitter at the plane),
`crossNear` 2.0 (m, a crossing counts only this near the plane), `shove` 0.6 (m, the body this far from where the move
put it = moved by something else: a retry teleport). Band helper constants: `bandLo` 2.2, `bandHi` 2.6 (grip over
floor), `chainLo` 1.0, `chainHi` 3.0 (chain to door plane).

**Device** (`DeadweightDevice extends KitDevice`, `kind: 'deadweight'`; one per `kitSpotsOf(level, 'deadweight')` spot,
added in `setupDevices` for EVERY spot whatever `flags.kitMoves` says, in spot order, so the spot index matches on every
page): `x, y, z` the near grip (y = the grip's height, not a floor: never use `KitDevices.near` for it), `yaw` the
spot's, `reach` = `DEADWEIGHT.reach`, `x2, y2, z2` the far grip, `door` the spot's door text, `doorIdx` the index in
`g.world.doors.list` of the door whose `String(d.anchor.id) === spot.door` (found once at setup; -1 = not found: the
device stays listed but inert, one `console.warn` naming the spot and the door), `cx, cz` that door's doorway centre,
`hw` its half width (`anchor.width / 2`), `nx, nz` the unit axis from the near grip to the far grip (the "across"
direction; `tx, tz` = (nz, -nx) the "along"), `open` 1 while the move holds the door open (KitDevice's field), `opens`
(bumped each time the move opens it), `noticed` -1 (parity with `ShutterDevice`; no notice code, G403), `user` the
hanger ('' none, `'@local'` the own player, else the mate id), host clocks `holdT`, `freeT`, `lastHanger` (id,
`'@local'` or ''), and the crossing slots (below). `isDeadweightDevice(d)` guard.

**Pure helpers** (exported for tests, no allocation): `dwLocal(d, x, z, out)` -> `out.across` / `out.along` relative to
the doorway centre on the device axes; `chainOf(d, x, z)` -> 1 / 2 / 0 (the nearer chain within `reach`, horizontal);
`deadweightSpotOk(spot, doorCx, doorCz, floorY)` -> '' or a reason ('grip' outside `bandLo..bandHi`, 'chain' a chain
outside `chainLo..chainHi` off the plane, 'sides' both chains on one side): called at setup and logged once with
`console.warn` when not '' (A17: the bands are logged, not enforced).

**Hanger (role b; local entry, no request; `idle` -> `chainGrab` -> `chainHang` -> `chainDrop` -> free).**
- Offer (`idle`, only when `free`; K0's `idle` already returns before kit offers with no mates, so single player gets
  nothing): `kitIdOn('deadweight')` (K0 already skips the move when off; check `flags.kitMoves.has('deadweight')` first
  anyway, PLAN "Shared by all five"); the nearest deadweight device with `doorIdx >= 0` and a chain whose grip is within
  `reach` horizontally and `gripLo..gripHi` over the player's feet; that chain not already taken (no mate in `brace` +
  `DEADWEIGHT_SUB` with `s` = index + 1 within `holdReach` of it). The pass offer (below) wins when it applies. Prompt
  "Co-op: hang on the chain (deadweight)" at the grip (x, y - 0.3, z). On a press: `run.dev`, `run.chain`, grip, floor
  (the player's feet y), start position, `run.hp = h.health()`, `d.user = '@local'`, `h.partner = ''`, `h.state =
  'chainGrab'`, `h.t = 0`, `h.count.offers++`; return true.
- `chainGrab` (`grab` 0.6 s): kinematic (`ovHang`: `kinematic`, `yaw` facing the doorway centre, `turnRate` 12) from
  the start to the chain over the first half, feet rising smoothstep from the floor to `hangTop = max(floor + footClear,
  grip - hangLen)`. Then `chainHang`, `h.t = 0`.
- `chainHang` (held): feet `max(floor + footClear, hangTop - sag * min(1, t / sagTime))` under the grip (K1-4: with
  A4's 2.4 m grip the feet end just off the floor, knees bent; KA1 draws it). Prompt "Hanging on the chain: Co-op or B
  lets go". Co-op or B -> `chainDrop` (`bPressed` sets `c.swallowCrouch = true`, as the shutter's hold). Hurt
  (`h.health() < run.hp`) -> `chainDrop`.
- `chainDrop` (0.5 s): kinematic straight down to the floor under the grip; prompt null; then `h.end(false)`.
- Moved by something else (K1-3), checked first in every holder and passer step: `c.override !== run.ov` or the body
  more than `shove` from where the move put it last step (`hyp2`, horizontal) -> `h.endWhy = 'deadweight: moved'`,
  `h.end(true)` at once (no drop phase). Downed / dead: K0's controller ends the move.
- `end`: `d.user = ''` when it is ours; overrides are cleared by the controller's `end`; `run.dev = null`.
- Wire (K0 maps it): `brace` + `DEADWEIGHT_SUB` 64; `wireS` = index + 1 in `chainHang`, -(index + 1) in `chainGrab` and
  `chainDrop` (K1-1: only a settled hang lifts the grate, and a let-go starts the drop clock at once).

**Partner (role a; local, no request; `idle` -> `grateUnder` -> free).**
- Offer (`idle`, `free`): a mate in `brace` + 64 with `s` = index + 1 (> 0, a settled hang) within `holdReach` of one of
  that device's chains; the door (`doorIdx`) at `target === 1` and `open >= passOpen`; the player within `passReach` of
  the plane (`|across|`), within the doorway along (`|along| <= hw`), feet within `passUp` of the door's floor
  (`anchor.hinge.y`). Prompt "Co-op: duck under the grate (deadweight)" at the player's head. A mate hanging but the
  door not open yet: prompt "Wait for the grate to lift" (no press taken; return false). On a press: `run.dev`, `side =
  sign(across)` (0 -> +1), lane `clamp(along, -(hw - sideIn), hw - sideIn)`, start = the player's (across, lane), end =
  (-side * passOut, lane), floor = feet y; `h.partner` = that mate's id; `h.state = 'grateUnder'`, `h.t = 0`; return
  true.
- `grateUnder` (`passTime` 1.0 s): kinematic linear start -> end (`ovPass`: `kinematic`, `crouch: true`, `yaw` across
  toward the far side, `turnRate` 12); prompt null; at k >= 1 `h.end(false)`. Committed (no abort but "moved" above).
- Wire: `boost` + 64, `wireS` = index + 1 (the remote crouches by its flags, K0's `KIT_A_TRAVERSE[64]` 'none').

**The host's rule (`tick`, every page, every fixed step; does nothing when `h.g.puppet`).** Per deadweight device with
`doorIdx >= 0`, index loops, no allocation:
1. Hanger now: the own player when `h.state === 'chainHang'` and `run.dev === d` (`'@local'`), else the first mate in
   `brace` with `(sub & DEADWEIGHT_SUB) !== 0`, `s === index + 1`, within `holdReach` (horizontal) of either chain and
   with `grip - feet` in `holdLo..holdHi`. With `deadweight` off on the host: nobody (the move holds nothing).
2. Hanger: `holdT += dt`, `freeT = 0`, `user` / `lastHanger` = it; when `holdT >= lift` and the door's `target === 0`:
   `doors.setOpen(door, true)` (forces the locked sliding door open; `setOpen` fires `onLocked`), `d.open = 1`,
   `d.opens++`. A door shut by something else while still held (Marlow's retry restore) is opened again the same way.
3. Nobody: `holdT = 0`, `user = ''`; when `d.open === 1`: `freeT += dt`; when `freeT >= drop` and the doorway is clear,
   `doors.setOpen(door, false)` and `d.open = 0`, `freeT = 0`. Doorway clear = no own body, no mate and no live enemy
   (`h.g.enemyMgr?.enemies`, `alive`, `pos`) inside the doorway box (`|across| < doorwayAcross`, `|along| < hw + 0.2`),
   no mate in `boost` + 64 within `crossNear` + `passOut` of the doorway centre, and the own player not in `grateUnder`
   (the shutter's no-crush rule: the drop waits, it never closes on a body). Use `setOpen`, not `Doors.close`
   (`close` skips `onLocked`, so the guards' nav grid would keep the locked grille open; its 0.75 m clearance circle
   also misses the ends of a 3 m doorway).
4. Done (K1-2): crossing slots per device: slot 0 the own player, slots 1-4 mate ids (preallocated `ids: string[]`
   of 4 and `side: Int8Array(5)`; a mate takes a free slot on first sight, a slot whose mate is gone is cleared). Each
   tick each player's side updates to `sign(across)` only when `|across| >= crossMin`, `|across| <= crossNear` and
   `|along| <= hw + 0.2`. A side flip (-1 / +1) while `d.open === 1` (held, or inside the drop window), by a player who
   is not `lastHanger`, calls `kitDone(h.g, 'deadweight', d.id, passer, hanger)`: `passer` the mate id or undefined (the
   host's own player), `hanger` the `lastHanger` mate id or undefined when it is the host's own. A flip while the move
   does not hold the door (the motor opened it, id off, a solo slip, K1-5) calls nothing. Two passes = two calls.
5. Id off while the move holds the door open (tests, a URL change): treated as nobody hanging (rule 3).

**The move object.** `DEADWEIGHT_MOVE: KitMove<DeadweightRun>`: `kind 'deadweight'`, `times: { chainGrab: 0.6,
chainDrop: 0.5, grateUnder: 1.0 }`, `paired: false`, `claimsPoint: false`, `busyOffer: false`; `check` ->
`'notOffering'` (no requests: K0 refuses an off id before it); `begin` -> no-op (the host never starts it; set
`h.endWhy = 'deadweight: no start'` only); `step` dispatches by state; `ended` -> nothing (no pair, no `tend`);
`end`, `wireS`, `tick`, `setupDevices` as above; `gap` absent. `DeadweightRun` holds every scratch value (dev, chain,
grip, floor, start / end, side, lane, last put position, hp, `loc` scratch, `ovHang`, `ovPass`): preallocated in
`newRun`.
If K5b's `KitMove.reset?(h, run)` hook (registry.ts, PR #622) is on your base, also implement `reset`: a local
deadweight state ends (`h.end(true)`), and on the host every device's `holdT` / `freeT` / slots clear (the door is
Marlow's to restore). If it is not on your base, do not add the hook (K1-3 covers the retry).

### 2. `src/core/flags.ts`
`deadweight` into `KIT_BUILT` (append; with K5b on the base: `['descent', 'pull', 'shutter', 'plankBridge',
'deadweight']`), and its doc line: "K1's Deadweight (`deadweight`)". `KIT_MOVES_ON` stays empty.

### 3. `tests/kit/deadweight.test.ts` (new, ~400 lines)
Two `TeamController`s on fake games as `tests/kit/shutter.test.ts` / K5a's: a host page (`puppet` false, `mode` with an
`onKitDone` spy) and a client page (`puppet` true), each page's `net.teamMates()` built every step from the other
page's controller (`mode`, `wireSub`, `wireS`, its controller position); a doors stub `{ list: [door], setOpen(d, o) }`
(target / open set at once, calls logged) with one sliding door shaped as A4's (hinge (101, 0, 24), width 3, yaw PI / 2,
`anchor.id` 37, `locked` true) and the spot placed with `addKitSpot` exactly as Marlow's (door `'37'`); `flags.kitMoves`
set in `beforeAll` and restored. Cases:
1. Spot and device: the device exists with the id off (single player, no mates) and its index matches on both pages;
   `door: '37'` finds the door (`String(anchor.id)`), `door: '38'` leaves it inert (no offer, warn once);
   `deadweightSpotOk` passes A4's numbers and names 'grip' (2.0 m), 'chain' (0.8 m) and 'sides'.
2. Single player (no mates): no prompt, no state under a chain.
3. Hang: the prompt under the near chain; Co-op -> `chainGrab` -> `chainHang`; wire `brace` + 64, `s` -1 then +1; feet
   never under floor + 0.05; B lets go -> `chainDrop` -> free; Co-op lets go too; a hit (health drop) drops.
4. Host rule, the host hanging: the door opens only after `lift` 0.8 s of `chainHang` (not during the grab), `opens` 1;
   let go -> shut after `drop` 0.4 s.
5. Host rule, the client hanging (the client page's MoveState read by the host): opens after the lift time; the client
   page itself never calls `setOpen`.
6. A client cannot open it without hanging: a mate on the ground under the chain, a mate in `brace` + 64 `s` 1 but 3 m
   from the chains, a mate in `brace` + 64 with `s` -1 (grabbing): the door stays shut.
7. No crush: let go while the passer is in the doorway box, or in `grateUnder`, or a live enemy stands in it: the door
   stays open past `drop`; it shuts once the box is clear.
8. The pass: the client's prompt "Wait for the grate to lift" then "Co-op: duck under the grate (deadweight)"; Co-op ->
   `grateUnder` (wire `boost` + 64, crouched) -> the far side `passOut` past the plane after 1.0 s -> free; the host's
   `onKitDone('deadweight', 'a4-deadweight', 'c1', undefined)` once, on the host page only.
9. Each way: then the client hangs on the far chain and the host's player passes: the second call
   (`'deadweight', 'a4-deadweight', undefined, 'c1'`). Two calls in all.
10. A walk-through with no prompt while held counts (K1-2); the hanger itself crossing after letting go (solo) calls
    nothing; a crossing with the door opened by something else calls nothing.
11. Moved (K1-3): teleport the hanger 8 m (a retry to the marks) -> the move ends at once; the host shuts the door after
    `drop`; same for a passer mid-pass.
12. `?kitmoves=0` (empty set): no prompt on either page, and a spoofed hanging mate opens nothing on the host.
13. `KIT_BUILT` contains `deadweight` and `readKitMoves(null, true)` has it (on in /preview/), `readKitMoves(null,
    false)` does not (off live). Allocation in the tick / step is a review item for the checker, not a test.

### 4. Existing tests `deadweight` in `KIT_BUILT` breaks (grep `tests/` and `scripts/` for `deadweight` and `KIT_BUILT`
first, preamble rule)
- `tests/kit/kitApi.test.ts` (~line 416, K0's) "the URL: an unbuilt id is dropped (no KIT_BUILT change in K0), so
  `?kitmoves=deadweight` turns no pull-up on": now `readKitMoves('deadweight', false, null).has('deadweight')` is true;
  keep the point of the test: `readCoopKit(null, k)` is still false. Retitle it.
- `tests/previewFlags.test.ts` (~line 88) `expect(ids(readKitMoves(null, true, '0'))).toEqual(['descent'])`: replace
  with K5b's line, `KIT_BUILT.filter((id) => id !== 'pull' && id !== 'shutter').sort()` (K5b's own edit: whichever
  lands second rebases cleanly).
- `tests/kit/kitApi.test.ts:278` (`checkTeamRequest` of `deadweight` -> 'notOffering') keeps passing (K1's `check`
  says the same). `:389` replaces the real move with an idler in that file only: leave it.

### 5. Docs
The move file's header; `docs/systems/coop.md` kit table K1 row (exists from K0): "Done by" -> "host tick (a pass under
the held grate)", the wire `s` (+ hanging, - grab / drop); `changes/feature-coop-kit-k1.md` (kind: minor; plain
words as K5b's: "Co-op (on in /preview/, not yet in the live game): Deadweight is playable. One player jumps up and
hangs on a chain; the counterweighted grate lifts for the partner, who ducks under. Letting go drops the grate, never
onto anyone. One chain each side, so whoever is through hangs for the other. At Marlow Yard this is station 9's way
under the grille.").

## Wire
None. No `src/net` file, no `protocol.ts` change, no `PROTOCOL_VERSION` bump. The move rides K0's `brace` / `boost` +
`DEADWEIGHT_SUB` 64 and `MoveState.s` (already +-500, signed values already used by K5a's offer); the door rides the
host's existing door snapshot (`coopHost` `doors()` -> `coopClient.syncDoors` -> `setOpen`).

## Animation per role (K1 ships placeholders only, A20; the real poses are KA1)
K1 adds no pose or clip file. Each role plays K0's placeholder through K0's tables, on every screen through MoveState
(remotes) and the controller state (local): the hanger `KIT_B_PLACEHOLDER.deadweight` 'hang' (the ledge hang traverse;
`chainGrab` 'jump', `chainDrop` 'drop' in `KIT_POSE_PLACEHOLDER`), the passer crouched by its flags
(`KIT_A_TRAVERSE[64]` 'none', `grateUnder` 'crouchWalk'). Check the local hanger draws the hang: if K0's local path
does not set it, set `h.g.player.pose.traverse = 'hang'` in the hang steps and clear it in `end` (as `shutter.ts`
`pin` sets 'brace'). Those placeholders play the same clips under every Animation source, so each actor already
follows its owner's source as far as master does (G400; the per-owner wire is PR #498, still open).
For KA1 (later; CLIP-LIST row K1, PLAN "Animation" steps 1-4; each role hand-made from the real technique, a jump-grab
then a dead hang, arms long, feet together, the body's weight on the chain; the passer a fast crouched duck):
- `chainGrab`: hand-made + Mixamo download 9 ("jump to hang"; not in C:/NightShift/scratch/mixamo/clips/ today: a gap).
- `chainHang`: hand-made + Mixamo `trav_hanging_idle` (on master).
- `chainDrop`: hand-made + Mixamo download 10 ("hanging drop"; not in the folder: a gap).
- `grateUnder`: hand-made + Mixamo `crouched_walking` (on master); `trav_crawling_hands_and_knees` / `crawling_prone`
  only if KA1 lowers the grate's opening (it stays the door's full 2.4 m here).
KA1 registers them through K0's `KIT_POSERS` and its role A table, on #498's per-owner source.

## Assumed and logged (each with its undo)
- K1-1 Signed wire `s`: +(index + 1) in `chainHang` and `grateUnder`, -(index + 1) in `chainGrab` / `chainDrop`. PLAN
  said `s` = index + 1; the sign lets the host start the lift clock on a settled hang and the drop clock on the let-go.
  Undo: `s` always + and the lift clock from the grab.
- K1-2 The done call counts any crossing of the doorway by a player other than the last hanger while the move holds the
  grate open, not only a `grateUnder` that ends on the far side (PLAN). The grate is a full-height sliding door: a
  partner who just walks through would otherwise leave Marlow's station 9 without its kit credit. Undo: count only
  `grateUnder` ends (the slot logic stays).
- K1-3 Retry and restart on K0: `TeamController.resetKit` ends shutter states only, so a hang or pass ends itself when
  its body is moved by something else (override replaced or > 0.6 m off its path: Marlow's retry teleports to the
  marks). Undo: K5b's `reset` hook once it is on master (item 1 implements it when present).
- K1-4 The hanger's body: feet `grip - 2.15 - sag`, never under floor + 0.05. With A4's 2.4 m grip the sag ends with the
  feet just off the floor (knees bent in KA1). Undo: constants.
- K1-5 A solo slip: the sliding leaf closes over `DOOR.closeTime` 0.8 s and its body returns only when shut
  (`doors.ts` `update`), so a hanger who lets go and runs can reach the plane before the body is back. No credit
  (K1-2's last-hanger rule), so the station still needs the real move. Undo / fix if Michael's walk shows it: a faster
  grate fall in `world/doors.ts` (not K1's file).
- K1-6 The host trusts the hanger's MoveState (mode, sub, `s`, position near a chain, feet height), as every kit
  move does; no `validate.ts` rule. Undo: a host-side hang check in `src/net` (two checkers, co-op group).

## Checks
- Every sub-step: `npm run typecheck:fast`; `npx vitest run tests/kit/deadweight.test.ts tests/kit/kitApi.test.ts
  tests/kit tests/previewFlags.test.ts tests/teamMoves.test.ts tests/teamPose.test.ts tests/shutterWiring.test.ts`;
  `npx eslint <changed .ts>`. Never `npm run check`, e2e or a dev server.
- Gate (the lead requests it, one request: `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites
  "e2e-netmove e2e-coop" --set k1-coop --requester "Night Shift | Player Build"`): `e2e-netmove` (PLAN) and `e2e-coop`
  (the lead's rule for a slice that edits `src/game` or `src/player`). The automatic `affected-e2e` pick is not the
  gate.
- Builder: Opus. Checker: ONE fresh Opus (no `src/net` edit); PASS only with `laptop-e2e/k1-coop` green. If the build
  must touch `src/net` (it must not), two fresh Opus checkers and the co-op group.
- Commit and push each sub-step (path-limited `git add <files>`, never -A), "coop-kit K1: ...", ending
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Progress in C:/NightShift/scratch/ctcore/k1-PROGRESS.md.

## Done looks like
Headless: one player hangs on a chain and the grate opens after 0.8 s on the host (and follows on the client); letting
go shuts it after 0.4 s, never on a body in the doorway; a client that is not hanging cannot open it; both players pass
once each way round (one on each chain) and the host's `onKitDone('deadweight', 'a4-deadweight', passer, hanger)` fires
twice, on the host page only; a retry teleport ends a hang; single player and `?kitmoves=0` offer nothing.
`deadweight` is in `KIT_BUILT` (on in /preview/, off live). The two e2e sets green.

## Report and the Marlow line
C:/NightShift/scratch/ctcore/k1-REPORT.md: head sha, base used, built per item (file:line), files and line counts,
tests, deviations, doubts, and this text for the PR body (message to Marlow Build):
"coop-kit K1 Deadweight. Id: `deadweight` (in `KIT_BUILT`: on in /preview/, off live). Spot: `addKitSpot(b.anchors, {
id, kind: 'deadweight', x, y, z (near grip), yaw (unused), x2, y2, z2 (far grip), door: String(<door anchor id>) })`;
the grip heights are absolute y (2.2-2.6 m over each side's floor), each chain 1.0-3.0 m off the door plane, one each
side; your #612 A4 spot matches. The move drives the door with `Doors.setOpen` (host only; clients follow the door
snapshot); your lock pass and retry restore may keep the lock and shut it on a retry. Done: `onKitDone('deadweight',
spot, passer, hanger)` on the host, once per pass under the held grate (two passes at A4). Marlow station 9
`a4-deadweight` uses the real move when the id `deadweight` is on." No PR is opened by the builder; the lead opens it.

## Doubts (for the lead)
1. Station 9 solo: with `deadweight` on (every /preview/ page) Marlow holds the grille motor and K1 offers nothing
   without a mate, so a single player cannot pass A4's grille. Is Marlow Yard ever played solo? Marlow's call (its
   stand-in rule is per host flag, not per player count).
2. K1-2 widens PLAN's done rule (any crossing by a non-hanger while held, not only a `grateUnder` end). Confirm, or the
   station needs every partner to use the prompt.
3. K1-5 solo slip through the closing leaf (no credit). Acceptable for the prototype, or ask Player / Marlow for a
   faster grate fall now?
4. The e2e gate: the lead's rule adds `e2e-coop` to PLAN's one set (`e2e-netmove`); under prototype mode "ONE closest
   test set", confirm both run in one request.
5. Retry: K1-3's self-end covers a teleport; a station retry that does not move the hanger (a retry while the hanger is
   already at its mark: not at A4, marks are at z 14) would keep the hang until K5b's `reset` hook is on the base.
6. K0 polish k0-CHECK-A 3 / B 4: the remote hanger's 'hang' traverse has no `traverseT` (team.ts, K0's file); it plays
   whatever T was last set. Cosmetic until KA1; K1 does not edit team.ts.
7. Estimate ~850 lines against PLAN's ~600: the two-page test and the crossing slots are the difference; still under
   ~1,000.
