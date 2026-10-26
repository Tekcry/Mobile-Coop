# coop-kit K3 brief: Chimney Pair
Owner: Night Shift | Player Build. Status: current (job doc; the slice brief, written by the lead's Opus brief writer
2026-10-27).

Read first: `git show origin/master:docs/systems/agent-preamble.md` and `git show origin/master:CLAUDE.md` (hard rules:
`src/net` only via dynamic import behind `flags.coop`; hot paths allocate nothing; `hyp2` / `hyp3`, never `Math.hypot`).

- Worktree C:/NightShift/Mobile-Coop-coop-kit-k3, branch feature/coop-kit-k3. Base: if PR #599 (K0) is on origin/master
  when you start, cut from origin/master and open the PR against master; else (today) cut from
  origin/feature/coop-kit-k0 at 9cc70de2c and open the PR against feature/coop-kit-k0 (the lead retargets it once #599
  lands). Say which in the report. Guard before every write: `git -C C:/NightShift/Mobile-Coop-coop-kit-k3 branch
  --show-current` prints feature/coop-kit-k3, else stop. Push: `git push -u origin feature/coop-kit-k3`. node_modules
  is a junction to C:/NightShift/Mobile-Coop-menu/node_modules: never npm install / ci.
- Spec: docs/coop-kit/PLAN.md on origin/feature/coop-kit, "Part 2 (detailed)": "How the five moves plug in", "The Marlow
  API", "Design per move" -> "Chimney Pair", "Slices" -> K3, Claims "K slices among themselves", Risks (the split-jump
  line). BRIEF A12 / A17 / M3 (the bands stay move constants: "Not yet"), A18 (Marlow owns the set files), A19 (one done
  API), A20 (mechanics first, placeholder poses). From the K0 / K5a / K5b checks (C:/NightShift/scratch/ctcore/
  k0-CHECK-A.md, k0-CHECK-B.md, k5a-CHECK.md, k5b-CHECK.md): add a device for EVERY spot whatever the flags and gate only
  the offer and the effect (k0-CHECK-B polish 3: the wire's spot index must match on host and client); no `src/net`
  edit; one-line `KIT_BUILT` conflicts with K1 / K4 / K5b go to whichever lands second; the page lag (0.13 s host /
  0.16 s client, k5a-CHECK polish 1) makes the two pages' caps meet each other, so the lead cap below is built for it.
- Map input (Marlow Build, draft PR #612 head 5f6b70b31 on feature/marlow-kit-wire; A5 geometry in
  `src/world/maps/ctcourseSets/replan/a5Substation.ts`): `A5_GAP = { x0: 68.35, x1: 69.75, z0: 30.25, z1: 35.75 }` (the
  1.4 m shaft between the 6 m perimeter wall x 67.85-68.35 and the hall's east shell wall at x 69.75; 0.5 m cross walls
  at z 30 and 36; L4's far door opens into it; lids at y 5.9-6 seal the dead space north and south), `A5_WALLTOP = {
  x0: 67.85, x1: 68.35, y: 6 }` (the exit), the inside ladder `A5_LADDER` (67.7, z 31.0, 0 -> 6 m: the way down onto the
  apron). The spot, verbatim: `addKitSpot(b.anchors, { id: 'a5-chimney', kind: 'chimneyPair', x: (gp.x0 + gp.x1) / 2,
  y: 0, z: (gp.z0 + gp.z1) / 2, yaw: -Math.PI / 2, w: gp.x1 - gp.x0, h: A5_WALLTOP.y, x2: (A5_WALLTOP.x0 +
  A5_WALLTOP.x1) / 2, z2: (gp.z0 + gp.z1) / 2 })` = (69.05, 0, 33.0), yaw -PI/2 (across = (sin yaw, cos yaw) = (-1, 0),
  toward the exit wall), w 1.4, h 6, exit (68.1, 33.0). Station 11 `a5-chimney`: `kit: 'chimneyPair'`, stand-in
  `g-a5-wicket` (held shut while the id is on), marks (69.0, 32.0) and (69.0, 34.0) yaw -PI/2, `retry: 'none'`, done flag
  `a5-apron-e` (both players on the apron's east strip x 65.85-67.85). Marlow's `CourseState.kitDone(kind, spot)`
  credits the live station when `kind` is `'chimneyPair'` and `spot` is `'a5-chimney'`; with the place flag that ends
  station 11. Match all of this; no map or set file edit.
- Prototype mode (Michael ~16:05 / ~16:20, BRIEF M3): starting values (G10, A17), no tuning or polish passes, build toward
  a playable piece. Marlow Yard needs 2 players everywhere (Michael, relayed by the lead): a solo player at the station is
  not a case to design for (single player simply gets no offer, the shared rule).

## Goal
Michael's words (SIGNOFF row, picked 2026-10-25 ~18:05, BRIEF M1): "Both brace back to back in a narrow shaft and climb
it together." Two players in a 1.2-1.6 m shaft (a marked spot, or any shaft found by rays, G151): one braces and offers,
the other joins; both brace back to back, each pushing on the wall in front; they climb on their own sticks but never
more than 0.15 m apart, so the pair goes at the slower stick; at the top both climb out onto the exit lip. Letting go, a
hit or a downed player: both slide down and stand. The host tells the mode when both are out (`onKitDone`). The marked
shaft is no longer a solo split jump. `chimneyPair` joins `KIT_BUILT` (on in /preview/, off live), so Marlow station 11
`a5-chimney` uses the real move.

## Out of scope
Animation (KA3: K0's placeholders stay; see "Animation per role"), map / set files and `courseState` / `courseMode`
(Marlow's, A18), any `src/net` or wire change, any edit to K0's shared files (`registry.ts`, `teamController.ts`,
`teamMoves.ts`, `team.ts`, `kitApi.ts`, `moveState.ts`, `levelBuilder.ts`) beyond the conditional `reset` hook use in
item 1, the other K slices' files (`deadweight.ts`, `swingPass.ts`, `dropCatch.ts`, `plankBridge.ts`, `world/*`,
`stealthSystems.ts`), guard reactions (G403 names none), the A12 bands in the level rules (KD parked), a free chimney's
split gap (stays, PLAN), tuning.

## Files and exact behaviour (est. ~1,250 lines incl. tests and docs; stay under ~1,450)

### 1. `src/game/kit/chimneyPair.ts` (new, the move; ~650 lines)
Header: PLAN "Chimney Pair" plus K3-1..K3-9 below, the spot fields, the host rule, the done rule, the wire `s` table.
Pure and Babylon-free except the run's kinematic vector (`c.pos.clone()` once per run, as `shutter.ts` `begin`); type
imports from the player (`MoveOverride`) and `../teamController`; reads `TEAM.ropeDown`, `TEAM.offerTime`
(`config/movement`), `ropeTopPath` and `CHIMNEY_SUB` (`../teamMoves`), `KIT_PAIR`, `kitSpotsOf`, `kitSpotIndex`
(`./kitApi`), `G` (`physics/groups`, for `G.STATIC`), `setNoSplit` (`../../player/splitJump`, item 2). Registers
`CHIMNEY_MOVE` at load; `KIT_PAIR.chimneyPair = { pairS: CHIMNEY.pairS, doneBy: 'a' }`.

**Constants** (`CHIMNEY`, starting values, A17; each with a one-line doc): `minW` 1.2, `maxW` 1.6 (m, shaft width),
`minH` 3.0, `maxH` 8.0 (m, the exit lip over the shaft floor), `chest` 1.3 (m, the scan rays over the feet), `normalOff`
0.25 (m, the two wall-normal rays either side), `faceCone` 35 deg (the facing within this of the wall normal), `upStep`
0.25 (m, the top scan's step), `lipIn` 0.25 (m, the exit lip probe beyond the wall face), `openUp` 1.8 (m, clear over the
lip: the shaft is open above), `spotHalf` 3.0 (m, a spot's shaft half length along; K3-8), `edge` 0.1 (m, kept in from a
spot's walls), `up` 0.4 (m, same floor), `joinReach` 1.5 (m, PLAN), `hostSlack` 0.3 (m, the host's lagging view),
`back` 0.15 (m, each body's root off the centre line toward its own wall: backs together), `offerSnap` 0.3 (s, onto the
line), `brace` 1.0 (s), `climb` 0.35 (m/s, up and down), `lead` 0.15 (m), `topReach` 1.5 (m, the feet under the lip when
the hands reach it, as `ropeTopY`), `top` 1.2 (s), `outSep` 0.35 (m, each climber's exit point off the pair's line along
the shaft: b +, a -), `turnRate` 6 (rad/s), `lostGrace` 0.5 (s), `askWait` 1.0 (s), `scanEvery` 0.2 (s), `stepOffY`
-0.5 (stick), `shove` 0.6 (m, K1-3's "moved by something else"), `watchMax` 30 (s), `pairS` 600 (s, a long climb with
pauses; K5a's).

**Shaft** (one preallocated `ChimneyShaft` per run, and one for scans): `cx, cz` the centre line point at the query's
along, `ux, uz` across, pointing to the EXIT wall, `tx, tz` = (uz, -ux) along, `w`, `floor` (y), `h` (the exit lip over
the floor), `ex` (the exit point across from the centre line, > w / 2), `half` (along half length: a spot's `spotHalf`, a
free shaft's 0.6), `dev` the spot device index (-1 free), `id` the spot id ('' free).
- `spotShaft(d, px, pz, out)`: from a device: `u` = (sin yaw, cos yaw), centre = the spot point moved along to the
  player's along (clamped to +-(half - 0.4)), `ex` = dot((x2 - x, z2 - z), u), `h` = the spot's `h`, `floor` = its `y`.
- `inSpot(d, x, y, z, slack)`: |across| <= w / 2 - edge + slack, |along| <= half + slack, |y - d.y| <= up.
- `chimneySpotOk(spot)` -> '' or 'width' (w outside minW..maxW), 'height' (h outside minH..maxH), 'exit' (exit across
  <= w / 2), 'fields' (w / h / x2 / z2 missing): called at setup, one `console.warn` naming the spot when not '' (A17:
  logged, not enforced; a spot with 'fields' stays listed but offers nothing).
- `findShaft(ray, px, py, pz, yaw, out)` -> '' | 'noWall' | 'angle' | 'narrow' | 'wide' | 'short' | 'tall' | 'capped' |
  'noExit' (pure; `ray(ax, ay, az, bx, by, bz)` = the first static hit's distance along the segment, its length when
  clear; on the page `g.ballistics.hitDistance(from, to, G.STATIC)` through the run's two preallocated `Vector3`s, as
  K5b's `planLay`). From the chest (feet + `chest`): two forward rays `normalOff` either side of the facing give the
  front wall's normal `n` ('noWall' when either misses within maxW + 0.3; 'angle' when the facing is more than `faceCone`
  off `n`); rays along +n and -n give `w` = d1 + d2 ('noWall', 'narrow' < minW - 0.02, 'wide' > maxW + 0.02) and the
  centre; then rays along +-n from the centre every `upStep` from the chest up to feet + maxH + upStep: the first miss on
  a side is that wall's top; the lower top is the exit side ('tall' when neither ends, 'short' when it ends under feet +
  minH); an up ray from the centre to the exit top + `openUp` must be clear ('capped'); a down ray at the exit side
  w / 2 + `lipIn` out from the centre, from top + 1.0 to top - 0.6, finds the lip ('noExit'); `h` = lip y - feet in
  minH..maxH ('short' / 'tall'); `u` = the exit side's direction, `ex` = w / 2 + lipIn. No allocation.
- Mode: a player inside any chimney device's `inSpot` box uses that spot (no rays); else the free scan (K3-6).

**Device** (`ChimneyDevice extends KitDevice`, `kind: 'chimneyPair'`): one per `kitSpotsOf(level, 'chimneyPair')` spot,
added in `setupDevices` for EVERY spot whatever `flags.kitMoves` says, in spot order: `x, y, z` the floor centre, `yaw`,
`reach` = `spotHalf`, `w`, `h`, `x2`, `z2`, `half`, `ok` (`chimneySpotOk === ''` or a warning that is not 'fields'),
`open` 0, `user` ''. `isChimneyDevice(d)` guard. `setupDevices` also builds the noSplit boxes (item 2) into the run, one
per device: centre, `u`, across half w / 2 + 0.2, along half `half` + 0.2, y floor - 0.5 .. floor + h.

**Offerer (role b; `idle` -> `chimneyOffer` -> host start -> `chimneyBrace` -> `chimneyClimb` -> `chimneyTop` -> free).**
- `idle` (only when `free`; K0 returns before kit offers with no mates): `flags.kitMoves.has('chimneyPair')` first. The
  partner's join (below) wins when it applies. A shaft here (spot box, else a free scan, run at most every `scanEvery`
  from `tick`'s clock and always on a press) -> prompt "Co-op: brace for a chimney climb (chimney pair)" at the
  player's head; no shaft: return null (silent: a corridor out of the band is not a chimney). On a press: `run.shaft`
  = it, `run.side` = sign(dot(facing, u)) (0 -> +1: +1 faces the exit wall), `run.along` = the player's along, the pin
  point P = centre + u * side * back + t * along, `run.hp`, `run.floor` = feet y, `h.partner = ''`, `h.state =
  'chimneyOffer'`, `h.t = 0`, `h.count.offers++`; return true.
- `chimneyOffer` (busy, `busyOffer` true): kinematic `ovPin` easing to P over `offerSnap`, yaw facing its own wall
  (atan2(side * ux, side * uz)), `turnRate`; then still. Prompt "Braced in the shaft: your partner presses Co-op (B lets
  go)". B or Co-op, `h.t > TEAM.offerTime`, or moved (below) -> `h.end(false)` (no pair yet: no message).
- Wire: `brace` + `CHIMNEY_SUB` 256; `s` = -w while offering (K3-1).

**Joiner (role a; `idle` -> request -> host start -> `chimneyPush` -> `chimneyRise` -> `chimneyOut` -> free).**
- `idle` (`free`): a mate `m` in `brace` with `(sub & CHIMNEY_SUB) !== 0` and `s < 0`, within `joinReach` (`hyp2`) and
  `up`; the player in the same shaft: the spot box that holds `m` also holds the player, else a free scan from the
  player along m's axis (`yaw` = m's yaw, which the pin snapped to +-u) whose centre line is within w / 2 of m. Prompt
  "Co-op: climb the shaft back to back (chimney pair)"; on a press `h.kitRequest('chimneyPair', m.id, spotIdx, 0, feetY)`
  (`spotIdx` = `kitSpotIndex(h.devices.list, dev.id)`, -1 free), `run.asked = 0`, prompt "Bracing..." until the start or
  `askWait` (the shutter's `asked` clock, counted in `tick`).
- `chimneyJoin` is not used (the partner stays free until the host's start: K5a's `plankJoin` precedent, K3-5).

**The host's rule (`check` = exported `checkChimney`).** `flags.kitMoves.has('chimneyPair')` else 'notOffering'; b
`brace` with the bit and `s < 0` else 'notOffering'; -s in minW - 0.02 .. maxW + 0.02 else 'notBraced'; a `ground`
else 'busy'; |a.y - b.y| <= `up` and `hyp2` <= joinReach + hostSlack else 'far'; with `r.spot` a chimney device (cast
by `isChimneyDevice`): both inside `inSpot(.., hostSlack)` else 'far'. `paired` true, `claimsPoint` false.

**Start (`begin`, both pages).** `s.b === self`: when not in `chimneyOffer` (cancelled meanwhile) send 'drop' at once
(`h.g.net?.teamHangEnd?.('drop')`, `run.sent = true`) and stay free; else `h.partner = s.a`, `h.state =
'chimneyBrace'`. `s.a === self`: the shaft from the spot (`s.target >= 0` and a chimney device: `spotShaft` at b's seen
along) or a fresh free scan along b's seen yaw (none: send 'drop', `h.endWhy = 'chimney: no shaft'`, stay free);
`run.side` = -(b's side: sign(dot(b's seen facing, u))), `run.along` = b's seen along; `h.partner = s.b`, `h.state =
'chimneyPush'`. Both: `run.floor` = own feet y, `run.y` = 0 (height over the floor), `run.paired = true`, `run.sent =
false`, `run.slide = false`, `run.partnerOut = false`, `run.lostT = 0`, start point = own position, P as above, `h.t =
0`.

**Steps (both roles; every step first: "moved", then hurt).**
- Moved by something else (K1-3): `c.override !== run.ov` or the body more than `shove` (`hyp2`, horizontal, plus |dy|)
  from where the move put it last step -> `h.endWhy = 'chimney: moved'`, `h.end(true)` (its `end` sends 'drop').
- Hurt (`h.health() < run.hp`; NaN skips) in brace / climb -> start the slide and send 'drop' (once).
- Brace (`chimneyBrace` / `chimneyPush`, `brace` 1.0 s): kinematic smoothstep from the start point to P at the floor,
  yaw to its own wall, `turnRate`; B or Co-op -> send 'drop', `h.end(false)` (still on the floor). Then
  `chimneyClimb` / `chimneyRise`.
- Climb (held): `v` = moveY * `climb` (up and down); `run.y` += v * dt, clamped to 0 .. climbMax (= h - `topReach`) and to
  the partner's seen height +-`lead` (K3-2: both ways), the clamp's own change limited to `max(climb, TEAM.ropeDown)` *
  dt (no snap when the band moves). Partner's seen height: the mate with `h.partner`'s id in `brace` / `boost` with the
  bit -> max(0, s) (a negative `s` is its stale offer); `s > climbMax + 0.5` latches `run.partnerOut` (it is topping out:
  the cap lifts for good); no such mate and not out -> `run.lostT += dt`, past `lostGrace` -> the slide (send 'drop').
  Kinematic at P + (0, floor + y, 0), yaw to its own wall. Prompt "Chimney climb: stick up or down together (B lets go)",
  or "Wait for your partner" while the stick pushes against the cap. B or Co-op -> the slide, send 'drop'. At y 0 with
  moveY <= `stepOffY` -> send 'drop', `h.end(false)` (the step off). `run.y >= climbMax - 1e-3` -> the top-out:
  `chimneyTop` / `chimneyOut`, `h.t = 0`, the rise's starting slope from the climb speed (`m0`, as
  `ropeTopBegin`).
- Slide (still in the climb state, `run.slide`): `run.y` -= `TEAM.ropeDown` * dt to 0, then `h.end(false)` (standing at
  P). No cap, no input.
- Top-out (`chimneyTop` / `chimneyOut`, `top` 1.2 s): `ropeTopPath(k, m0, run.path)`: feet from (P, floor + climbMax)
  to the exit point E = centre + u * ex + t * (along + outSep * (b ? 1 : -1)) at floor + h, rise share up, across share
  over (the rope top-out's eased shares), yaw turning to face the exit (atan2(ux, uz)). B, Co-op, hits and partner ends
  are ignored (committed: K3-3). At k >= 1: b -> `run.sent = true`, `h.end(false)` (free on the lip). a ->
  `run.sent = true`; if `run.partnerOut` send 'pull' now, else arm the done watch (`run.watch`, `run.watchId` = the
  partner's id, `run.watchT = 0`, the latch kept); `h.end(false)`.
- Done watch (`tick`, a only, K3-3): while armed and `h.state === 'none'`: the watched mate with the bit and `s >
  climbMax + 0.5` latches out; out -> `h.g.net?.teamHangEnd?.('pull')` once, disarm. Disarm with no call when `h.state`
  is not 'none' (a new move: its pair must not get our 'pull'), the mate is missing or not in the move for `lostGrace`
  without having been out, or `watchT > watchMax`. Never on a client test page alone: the host relays it.
- `ended(k)` (the partner's end, relayed): in the offer or a brace / climb state -> the slide (no message back: `run.sent
  = true`); 'pull' or any end during the top-out -> ignored (finish it). `k` undefined (the host's 'end': partner gone
  or down) -> as 'drop'.
- `end(aborted)`: when `aborted && run.paired && !run.sent` send 'drop'; clear the override when it is ours, the local
  traverse back to 'none' when it is one we set ('brace' / 'climb' / 'climbUp': `TeamController.end` only clears
  'climb' for rope states), `run.dev = null`; never clear the done watch.
- Local pose (placeholders, K0's `KIT_POSE_PLACEHOLDER` intents; the local body is the move's job, as `pullUp.ts`):
  brace states `pose.traverse = 'brace'`; climb states `'climb'` with `traverseT` = ((y / 0.7) % 1 + 1) % 1 (the rope's
  hand-over-hand cycle; 0 while sliding); top states `'climbUp'` with `traverseT` = k. So the wire's `ph` (localMoveState
  sends `traverseT` for climb / climbUp) drives the remote role a's 'climb' (`KIT_A_TRAVERSE[256]`).
- Wire `s` (`wireS`; K3-1): `chimneyOffer` -w; brace states 0; climb states `run.y` (also while sliding); top states `h`
  (always > climbMax + 0.5). Mode and bit come from K0 (`brace` for b's states, `boost` for a's).

**The move object.** `CHIMNEY_MOVE: KitMove<ChimneyRun>`: `kind 'chimneyPair'`, `times: { chimneyBrace: 1.0,
chimneyPush: 1.0, chimneyTop: 1.2, chimneyOut: 1.2 }`, `paired: true`, `claimsPoint: false`, `busyOffer: true`; `check`,
`tick` (the scan clock, `asked`, the done watch, the noSplit switch: item 2), `idle`, `begin`, `step`, `ended`, `end`,
`wireS`, `setupDevices` as above; `gap` absent. `ChimneyRun` holds every scratch value (two shafts, pin / start / put
points, side, along, floor, y, m0, path `{ rise, across }`, hp, flags, clocks, watch, `ovPin` / `ov` overrides, the two
ray `Vector3`s, the noSplit boxes) preallocated in `newRun`. If K5b's `KitMove.reset?(h, run)` hook (registry.ts, PR
#622) is on your base, implement `reset`: a local chimney state ends (`h.end(true)`), the done watch disarms. If it is
not, do not add the hook (the "moved" check covers a retry teleport).

### 2. `src/player/splitJump.ts` (+~40 lines)
`export interface NoSplitBox { x: number; z: number; ux: number; uz: number; across: number; along: number; y0: number;
y1: number }`, a module list (`NO_SPLIT`), `setNoSplit(boxes)` (replaces it; level load) and `noSplitAt(x, y, z)` (index
loop, no allocation). `splitReach` returns null when `noSplitAt(x, y, z)` (first line, after a length check of the list).
`findSplitGaps`, the anchors and their ids stay unchanged (Marlow's tests count them). The switch lives in the move: its
`tick` calls `setNoSplit(on ? run.noSplit : EMPTY)` only when `on = flags.kitMoves.has('chimneyPair')` differs from the
last call or `setupDevices` ran (a new level), so the shaft is a solo split gap again with the id off (the spot inert,
K3-7). splitJump.ts stays pure (no `flags` import). Update its header line ("split jump gaps ... except inside a marked
chimney, coop-kit K3").

### 3. `src/core/flags.ts`
`chimneyPair` into `KIT_BUILT` (append; with K1 / K5b on the base keep their ids) and its doc line "(coop-kit K3) Chimney
Pair". `KIT_MOVES_ON` stays empty.

### 4. `tests/kit/chimneyPair.test.ts` (new, ~520 lines)
Two `TeamController`s on fake games as K5b's `tests/kit/plankBridge.test.ts` (`page()`, its `boxRay` analytic world as
`ballistics.hitDistance`, each page's mates rebuilt every step from the other page's controller: `mode`, `wireSub`,
`wireS`, position, yaw, one step late), a host page (`puppet` false, `mode.onKitDone` spy) and a client page (`puppet`
true); the host start driven by hand (`checkTeamRequest` then both pages' `begin`), relayed ends by hand (`ended(k)`);
`flags.kitMoves` set in `beforeAll` and restored. World: Marlow's A5 shaft as boxes (perimeter wall x 67.85-68.35 to
6 m, shell wall x 69.75-70.25 to 10 m, cross walls at z 30 / 36, floor y 0) and the spot `addKitSpot`-ed exactly as
#612's. Cases:
1. Rays: `findShaft` in the A5 boxes from (69.0, 0, 33) facing -x and facing +x: ok, w 1.4, h 6.0, u (-1, 0), centre x
   69.05, ex 0.95; a 1.4 m corridor turned 20 deg: ok; facing 40 deg off: 'angle'; 1.1 m 'narrow', 1.7 m 'wide'; both
   walls 2.5 m 'short'; both 9 m 'tall'; a roof at 7 m 'capped'; a 0.1 m exit wall with nothing behind 'noExit'.
2. Spot: `spotShaft` / `inSpot` at the marks (in) and at z 36.5, x 68.3, y 1 (out); `chimneySpotOk` passes #612's spot,
   names 'width' (w 1.0), 'height' (h 9), 'exit' (x2 inside the shaft); one device per spot with the id off, its index
   the same on both pages.
3. Single player (no mates): no prompt, no state in the shaft.
4. Offer: Co-op in the spot -> `chimneyOffer` pinned 0.15 m off the centre line facing its wall, wire `brace` + 256, `s`
   -1.4; B lets go; a free 1.4 m corridor offers too; a 1.8 m corridor and a 2.5 m tall one offer nothing.
5. Host rule: ok; b not offering; `s` -1.0 and -1.8 'notBraced'; a not on the ground 'busy'; 0.5 m floors and 2.0 m apart
   'far'; with the spot, a outside its box 'far'; the id off -> 'notOffering' through `checkTeamRequest`.
6. Join and brace: a's prompt, the request (`target` = the spot index, `s` 0), both pages begin; after 1.0 s both stand
   back to back (0.3 m apart across, the same along within 0.05 m, facing opposite walls), wire `s` 0.
7. Lead cap: a full stick up, b none: a stops at <= 0.15 m over b on both pages; then b up, a none: the same the other
   way; both full up: they rise at 0.35 m/s and |ya - yb| <= 0.15 + 0.35 * dt every step on both pages; both full down:
   the same; a down alone stops 0.15 under b.
8. Top-out, both orders (a first, then b first): each reaches 4.5 m, tops out in 1.2 s and ends free on the wall top (feet
   y 6 +-0.01, x 68.1 +-0.05, z the pair's along +0.35 for b and -0.35 for a, facing -x), wire `s` 6 during it;
   a's page sends 'pull' exactly once, only after b's top-out was seen; b's page never sends 'pull'; `kitEnd(newKitPair('chimneyPair', 'c1', 'h', 0,
   'a5-chimney'), 'c1', 'pull', 1, 0)` is 'pull' and from b null; `kitDone` reaches the host mode's spy with
   `('chimneyPair', 'a5-chimney', ...)` and not on the puppet page.
9. Let go: at 3 m b presses B -> b sends 'drop' and slides at 1.6 m/s to the floor and stands free; a's page, given
   `ended('drop')`, slides and stands too; no 'pull'. The same for a hit (health drop) and for a's B. At the floor a holds
   the stick down -> 'drop', b (<= 0.15 m up) slides and stands.
10. Partner lost: the mate's MoveState leaves the move mid-climb with no end -> slide after 0.5 s, 'drop' sent.
11. Moved: teleport the climber 8 m -> the move ends at once, 'drop' sent.
12. No split gap in a spot's shaft: with the id on (the move's `setupDevices` and `tick` run), `splitReach` on a gap
    object along the A5 shaft returns null at (69.05, 0, 33) facing along it; with the id off it returns the reach; a gap
    10 m away still works with the id on; `findSplitGaps` on the A5 boxes still finds the gap (anchors unchanged).
13. `?kitmoves=0` (empty set): no prompt on either page, the host refuses, no noSplit box. `KIT_BUILT` holds
    `chimneyPair`: `readKitMoves(null, true)` has it, `readKitMoves(null, false)` does not. Allocation in step / tick is
    the checker's review item, not a test.

### 5. Existing tests the change touches (grep `tests/` and `scripts/` for `chimneyPair`, `KIT_BUILT`, `splitReach`
first, preamble rule)
- `tests/previewFlags.test.ts` (~line 87) `expect(ids(readKitMoves(null, true, '0'))).toEqual(['descent'])`: replace with
  K5b's line `KIT_BUILT.filter((id) => id !== 'pull' && id !== 'shutter').sort()` (identical to K5b's / K1's: whichever
  lands second rebases cleanly).
- `tests/kit/kitApi.test.ts` deletes the `KIT_PAIR` rows in its `beforeEach` and checks the bits and pose ids only: it
  should pass unedited; if a case breaks because `chimneyPair` is now registered (the eager glob), fix it in that case
  only, as K1's brief did for `deadweight`.
- `tests/splitJump.test.ts`, `tests/bunkerMap.test.ts`, `tests/campusArtGameplay.test.ts` (split gaps),
  `tests/teamPose.test.ts` (the 256 row) and `tests/ctcourse/replan/a5Substation.test.ts` (if your base has #612): unedited and green.

### 6. Docs
The move file's header; `docs/systems/coop.md` kit table K3 row (exists from K0): "Done by" -> "a (when both are out)",
remote placeholder unchanged, plus one line under the table: wire `s` (offer -width, height while climbing, h topping
out) and the noSplit rule; `changes/feature-coop-kit-k3.md` (kind: minor; plain words: "Co-op (on in /preview/, not yet
in the live game): Chimney Pair is playable. In a narrow shaft one player braces with the Co-op button and the partner
joins; back to back, you climb together on your own sticks, never more than a hand's width apart, and climb out at the
top. Let go and you both slide down safely. At Marlow Yard this is station 11's way up the gap. A marked shaft can no
longer be split-jumped alone.").

## Wire
None. No `src/net` file, no `protocol.ts` change, no `PROTOCOL_VERSION` bump. The move rides K0's `brace` / `boost` +
`CHIMNEY_SUB` 256, `MoveState.s` (bounded +-500, not rounded) and `ph`; the request's spot index in `target`; ends as
`hangEnd` ('drop' either side, 'pull' from a only: `doneBy 'a'`); K0's `coopHost.kitHangEnd` calls `kitDone` on the
relayed 'pull' with the pair's spot id.

## Animation per role (K3 ships placeholders only, A20; the real poses are KA3)
K3 adds no pose or clip file. On every screen: role a (boost + 256) plays K0's `KIT_A_TRAVERSE[256]` 'climb' at the
wire's `ph` (remotes) and the move's local traverse (item 1); role b (brace + 256) plays K0's `KIT_B_PLACEHOLDER
.chimneyPair` 'brace' body (TeamPoser `boostB(-1)`, local and remote; see Doubt 1). These clips are the same under every
Animation source, so each actor already follows its owner's source as far as master does (G400; the per-owner wire is
PR #498, still open).
For KA3 (later; CLIP-LIST row K3, PLAN "Animation" steps 1-4; hand-made from the real technique: back to back, each
pushing feet and hands on the wall in front, moving in turn, one pushing while the other shifts, slow; the top-out a
mantle onto the lip; each actor on its owner's source through #498):
- `chimneyOffer` / `chimneyBrace` / `chimneyPush` (the back-to-back brace): hand-made only (no stock clip: the expected
  gap, CLIP-LIST K3 and PLAN Risks); the report says "hand-made + Mixamo none (titles searched)".
- `chimneyClimb` / `chimneyRise` (the push up): hand-made + Mixamo download 2 "Climbing Up Wall" for the leg push only
  (in C:/NightShift/scratch/mixamo/clips/ as `Climbing Up Wall.fbx`; not emitted on master: a channel clip, slug
  `climbing_up_wall`, docs/mixamo-retarget BATCH2-PLAN, kind `chanPath`).
- `chimneyTop` / `chimneyOut` (out onto the lip): hand-made; CLIP-LIST names no clip for K3's top-out (KA3 may try the
  rope top-out's `trav_freehang_climb` / `pulling_up_to_a_ledge`, both on master, and reports it either way).
KA3 registers them through K0's `KIT_POSERS` (b) and its role A table (a).

## Assumed and logged (each with its undo)
- K3-1 Offer wire `s` = -width (PLAN: the width): the sign tells an offer from a height, so a joiner never reads a stale
  offer as the partner 1.4 m up. Host reads -s. Undo: `s` = width, the joiner ignores `s` during its brace.
- K3-2 The lead cap works both ways (PLAN: "never more than 0.15 m above"): back to back, one cannot climb down away from
  the other either; the pair goes down at the slower stick too. Undo: drop the lower clamp.
- K3-3 Done: a ends free after its own top-out and a done watch sends 'pull' once b's top-out is seen (or at once if it
  already was), so neither waits on the lip in a kinematic pose; the top-out is committed (a let-go then is ignored).
  Undo: a held in `chimneyOut` until b is out.
- K3-4 The exit points sit 0.35 m either side of the pair's line along the shaft, and the climber facing away from the
  exit turns during the rise (A5's wall top is 0.5 m wide, 5.5 m long). Undo: one exit point, the two top-outs in turn.
- K3-5 Role a's `chimneyJoin` is unused (K5a's `plankJoin` precedent); `chimneyPush` is a's brace. Undo: a joiner's
  pre-start state.
- K3-6 Free chimney (G151, PLAN "found by rays"): the wall normal from two forward rays, the facing within 35 deg, a top
  scan every 0.25 m, open above, a lip found by a down ray. In a 1.2-1.6 m corridor whose wall tops make a 3-8 m shaft,
  the Co-op press offers the chimney before the leg-up (the kit offers run first). Undo: spots only.
- K3-7 noSplit only while `chimneyPair` is on (a spot is inert while its id is off); the box is the spot's shaft + 0.2 m.
  The anchors are not removed, so ids and counts stay. Undo: filter in `levelBuilder` at build (K0 / Marlow file).
- K3-8 A spot's shaft runs `spotHalf` 3.0 m either way along (KitSpot has no length field; A5's gap is 5.5 m between
  cross walls). Undo: a spot field (kitApi, K0's file) or a ray along.
- K3-9 The host trusts the MoveState heights and the claimed spot box, as every kit move (no `validate.ts` rule). Undo:
  a host-side climb check in `src/net` (two checkers, co-op group).

## Checks
- Every sub-step: `npm run typecheck:fast`; `npx vitest run tests/kit/chimneyPair.test.ts tests/kit/kitApi.test.ts
  tests/kit tests/splitJump.test.ts tests/bunkerMap.test.ts tests/campusArtGameplay.test.ts tests/previewFlags.test.ts
  tests/teamMoves.test.ts tests/teamPose.test.ts tests/kitNet.test.ts`; `npx eslint <changed .ts>`. Never `npm run
  check`, e2e or a dev server.
- Gate (the lead requests it, one request: `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites
  "e2e-netmove e2e-coop" --set k3-coop --requester "Night Shift | Player Build"`): `e2e-netmove` (PLAN) and `e2e-coop`
  (the lead's rule: K3 edits `src/game` and `src/player`). The automatic `affected-e2e` pick is not the gate.
- Builder: Opus. Checker: ONE fresh Opus (no `src/net` edit); PASS only with `laptop-e2e/k3-coop` green. If the build
  must touch `src/net` (it must not), two fresh Opus checkers and the co-op group.
- Commit and push each sub-step (path-limited `git add <files>`, never -A), "coop-kit K3: ...", ending
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Progress in C:/NightShift/scratch/ctcore/k3-PROGRESS.md.

## Done looks like
Headless: in Marlow's A5 shaft one player braces and the partner joins; both brace back to back in 1.0 s; they climb
together at the slower stick, never more than 0.15 m apart on either page; both top out onto the 6 m wall top and the
host's `onKitDone('chimneyPair', 'a5-chimney', a, b)` fires once, on the host page only; a let-go, a hit, a lost partner
or a step off at the floor lets both down safely with no done; a free 1.4 m shaft works the same; out-of-band shafts
offer nothing and the host refuses spoofed offers; inside the spot no split jump while the id is on; single player and
`?kitmoves=0` offer nothing. `chimneyPair` is in `KIT_BUILT` (on in /preview/, off live). `laptop-e2e/k3-coop` green.

## Report and the Marlow line
C:/NightShift/scratch/ctcore/k3-REPORT.md: head sha, base used, built per item (file:line), files and line counts,
tests, deviations, doubts, and this text for the PR body (message to Marlow Build):
"coop-kit K3 Chimney Pair. Id: `chimneyPair` (in `KIT_BUILT`: on in /preview/, off live). Spot: `addKitSpot(b.anchors,
{ id, kind: 'chimneyPair', x, y, z (the shaft floor's centre), yaw (across, toward the exit wall), w (width 1.2-1.6),
h (the exit lip over the floor, 3-8), x2, z2 (a point on the exit lip) })`; the shaft is taken as 3.0 m either way
along from (x, z); your #612 A5 spot matches. With the id on, the marked shaft is not a solo split jump. Done:
`onKitDone('chimneyPair', spot, a, b)` on the host once, when both are out on the lip (before your ladder and the
`a5-apron-e` zone). Marlow station 11 `a5-chimney` uses the real move when the id `chimneyPair` is on." No PR is opened by
the builder; the lead opens it.

## Doubts (for the lead)
1. Role b's look: K0's `KIT_B_PLACEHOLDER.chimneyPair` is 'brace', so on every screen the offerer is drawn as the
   crouched leg-up offer all the way up the shaft (TeamPoser's B body, `team.ts`, K0's file). A one-line change there
   (`chimneyPair: 'climb'`) would play the ladder climb instead, also while offering on the floor. K3 leaves `team.ts`
   alone unless you say so (else KA3 fixes it).
2. K3-8: the spot has no length; 3.0 m either way is a K3 constant. Ask Marlow / K0 for a field only if a second map
   needs another length.
3. K3-6: a free chimney takes the Co-op press before the leg-up in a 1.2-1.6 m corridor with a 3-8 m exit wall. Fine for
   the prototype, or spots only until Michael's walk?
4. The e2e gate: the lead's rule adds `e2e-coop` to PLAN's one set (`e2e-netmove`), as K1; confirm both run in one
   request.
5. Shared with K4 (Swing Pass, briefed now) and K1 / K5b: `src/core/flags.ts` (`KIT_BUILT` line and doc line),
   `docs/systems/coop.md` (each its own row), `tests/previewFlags.test.ts` (the same one-line replacement): PLAN's
   one-line shared additions, whichever lands second rebases. `src/player/splitJump.ts` is K3's alone. K3 reads
   `ropeTopPath` (teamMoves.ts) and `TEAM.ropeDown` without editing them.
6. Section restart on a K0 base (no `reset` hook): a climb ends on a teleport ("moved"); a restart that leaves the pair
   where it is would keep the climb until K5b's hook is on the base. Station 11 has `retry: 'none'`.
7. Estimate ~1,250 lines against PLAN's 1,000: the free-shaft scan and the two-page test are the difference; still under
   ~1.5k.
