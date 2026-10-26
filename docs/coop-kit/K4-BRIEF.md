# coop-kit K4 brief: Swing Pass
Owner: Night Shift | Player Build. Status: current (job doc; the slice brief, written by the lead's Opus brief writer
2026-10-27 ~01:15).

Read first: `git show origin/master:docs/systems/agent-preamble.md` and `git show origin/master:CLAUDE.md` (hard rules:
`src/net` only via dynamic import behind `flags.coop`; hot paths allocate nothing; `hyp2`, never `Math.hypot`).

- Worktree C:/NightShift/Mobile-Coop-coop-kit-k4, branch feature/coop-kit-k4. Base: if PR #599 (K0) is on origin/master
  when you start, cut from origin/master and open the PR against master; else (today) cut from
  origin/feature/coop-kit-k0 at 9cc70de2c and open the PR against feature/coop-kit-k0 (the lead retargets it once #599
  lands). Say which in the report. Guard before every write: `git -C C:/NightShift/Mobile-Coop-coop-kit-k4 branch
  --show-current` prints feature/coop-kit-k4, else stop. Push: `git push -u origin feature/coop-kit-k4`. node_modules is
  a junction to C:/NightShift/Mobile-Coop-menu/node_modules: never npm install / ci.
- Spec: docs/coop-kit/PLAN.md on origin/feature/coop-kit, "Part 2 (detailed)": "How the five moves plug in", "The Marlow
  API", "Design per move" -> "Swing Pass", "Slices" -> K4, the Claims note "K slices among themselves". BRIEF A12 / A17 /
  M3 (the bands stay move constants: "Not yet"), A18 (Marlow owns the set files), A19 (one done API), A20 (mechanics
  first, placeholder poses). Model: docs/coop-kit/K1-BRIEF.md (same base, same shape). Checks you must honour from K0 /
  K5a / K5b (C:/NightShift/scratch/ctcore/k0-CHECK-A.md, k0-CHECK-B.md, k5a-CHECK.md, k5b-CHECK.md): register the kit
  device for every spot always and gate only the offer and the move (k0-CHECK-B polish 3); no `src/net` edit; one-line
  `KIT_BUILT` conflicts with K1 / K3 / K5b resolved by whichever lands second.
- Map input (Marlow Build ~21:20; draft PR #612, branch feature/marlow-kit-wire head 5f6b70b31; the A5 geometry from
  #608, merged to master): the spot sits on the swing bar (z 43.0), NOT the gantry (z 44.6, dressing now).
  `replan/a5Substation.ts` places `addKitSpot(b.anchors, { id: 'a5-swing', kind: 'swingPass', x: tr.x1, y:
  A5_GANTRY_PIPE_Y, z: A5_SWING_BAR.z, yaw: -Math.PI / 2, w: tr.x1 - tr.x0, y2: 0 })` = (65.85, 2.6, 43.0), yaw -PI/2
  (forward = (sin yaw, cos yaw) = west), w 3.5, y2 0. Geometry: `A5_CABLE_TRENCH = { x0: 62.35, x1: 65.85, floor: -1.6 }`
  (open, `noLedge`, step irons on the east face); apron floor y 0 both sides; `A5_SWING_BAR = { z: 43.0, posts: [42.4,
  43.6], x0: 65.85, x1: 66.0, post: 0.15, top: 2.75 }` (two solid 0.15 m posts x 65.85-66.0, z 42.325-42.475 and
  43.525-43.675; the bar a visual skin at 2.6 between them: a 1.05 m lane at z 42.475-43.525 on the swing line). The
  landing side: the west strip x 58.2-62.35 (wall 58.15), plates hoarding z 39.0-42.1 at the trench, drums x 59.6-61.8 z
  43.9-47.5. Marlow's `CourseMode.onKitDone` credits station 12 when `kind` is `'swingPass'` and `spot` is
  `'a5-swing'`; the station also needs its place flag `a5-apron-w` (both players on the west strip: the swung player
  unbolts the plates `g-a5-plates` from the west, then the anchor walks over). Station 12 has `retry: 'none'` and no
  guards. Match all of this; no map or set file edit.
- Marlow Yard needs two players everywhere (Michael 2025-10-25 ~21:42): a solo player at the station is not a case to
  design for (single player simply gets no offer, K0's rule).
- Prototype mode (Michael ~16:05 / ~16:20, BRIEF M3): starting values (G10, A17), no tuning or polish passes, build
  toward a playable piece.

## Goal
Michael's words (SIGNOFF row, picked 2026-10-25 ~18:05, BRIEF M1): "One, braced on a pipe, swings the partner across a
shaft." Two players at a Swing Pass spot: the anchor braces at the bar on the near edge; the partner takes the anchor's
wrist, steps off and swings across the gap in an arc under the bar, lets go past the far edge and lands crouched. The
host tells the mode on each landing (`onKitDone`). `swingPass` joins `KIT_BUILT` (on in /preview/, off live), so Marlow
station 12 `a5-swing` uses the real move.

## Out of scope
Animation (KA4: K0's placeholders stay; see "Animation per role"), map / set files and `courseState` / `courseMode`
(Marlow's, A18), any `src/net` or wire change, any edit to K0's shared files (`registry.ts`, `teamController.ts`,
`teamMoves.ts`, `team.ts`, `kitApi.ts`, `moveState.ts`), K1 / K3 / K5a / K5b files (`deadweight.ts`, `chimneyPair.ts`,
`splitJump.ts`, `plankBridge.ts`, `world/plankBridge.ts`, `world.ts`, `stealthSystems.ts`), `playerController.ts`
(K2's), a free swing away from a spot (PLAN: the spot is required), rays for the arc or the landing (K4-4), guard
reactions (G403 names no notice for Swing Pass), the A12 bands in the level rules (KD parked), solo play, tuning.

## Files and exact behaviour (est. ~850 lines incl. tests and docs; stay under ~1,000)

### 1. `src/game/kit/swingPass.ts` (new, the move; ~430 lines)
Header: the design below (PLAN "Swing Pass" plus K4-1..K4-7), the spot fields, the host rule, the done rule. Pure and
Babylon-free: type imports only (`MoveOverride` from the player, `TeamStart` / `TeamMate` from the controller, the
registry types); the kinematic vector is the controller's own (`c.pos.clone()` once per run, as `shutter.ts` `begin`).
Registers `SWING_MOVE` with `registerKitMove` at load (teamController's glob loads it) and sets `KIT_PAIR.swingPass =
{ pairS: SWING.ride + SWING.release + 3, doneBy: 'a' }` at load (5.0 s; the rider's 'pull' is the success end).

**Constants** (`SWING`, starting values, A17; each with a one-line doc):
`anchorReach` 0.8 (m, the anchor offer: feet to the near edge point, horizontal), `faceCos` 0.5 (the offer: facing
within 60 deg of the spot's yaw), `barLo` 2.0 / `barHi` 3.0 (m, the bar over the anchor's feet for the offer and the
host: the A12 band 2.2-2.8 +-0.2 for the controller's 2-4.5 cm rest gap and floor drift), `grab` 0.4 (s, the anchor's
move to its stance inside `swingOffer`), `anchorBack` 0.6 / `anchorSide` 0.55 (m, the stance from the near edge point:
back from the gap, to one side of the swing line; K4-1), `anchorHost` 1.2 (m, the host: the anchor's feet to the near
edge point), `riderReach` 1.5 (m, the rider offer: from the anchor, horizontal), `up` 0.4 (m, same floor), `hostSlack`
0.3 (m, the host's reach over the page's), `gapMin` 2.0 / `gapMax` 3.5 (m, the spot's `w`), `level` 0.4 (m, the far
floor against the near floor and the claim's floor), `landIn` 0.9 (m, the landing point past the far edge on the line),
`landTol` 0.75 (m, the host: the claim within this of the spot's landing point), `stepBack` 0.35 (m, the step-off
point back from the near edge on the line), `grip` 0.3 (s, the first part of `swingRide`: onto the step-off point,
wrists locked; before its end the swing is not yet committed), `ride` 1.6 (s, `swingRide`), `dip` 0.6 (m, the feet's
sag under the arc at mid-gap: the pendulum's low point), `releaseIn` 0.3 (m, the hands let go this far past the far
edge), `releaseUp` 0.35 (m, the feet over the far floor at the let-go), `release` 0.4 (s, `swingRelease`), `hold` 2.0
(s, `swingHold` = ride + release), `holdGrace` 0.6 (s, the anchor frees itself this long after `hold` with no end
heard), `askWait` 1.0 (s, the rider's pending request), `shove` 0.6 (m, the body this far from where the move put it =
moved by something else: a teleport). Band helper constants: `bandBarLo` 2.2, `bandBarHi` 2.8, `bandLand` 0.75.

**Device** (`SwingDevice extends KitDevice`, `kind: 'swingPass'`; one per `kitSpotsOf(level, 'swingPass')` spot, added in
`setupDevices` for EVERY spot whatever `flags.kitMoves` says, in spot order, so the spot index matches on every page):
`x, z` the near edge point (the spot's), `y` = the bar's height (the spot's `y`; NOT a floor: never use
`KitDevices.near` for it), `yaw` the spot's (across the gap, toward the far side), `reach` = `SWING.anchorReach`, `barY`
(= `y`), `gap` the spot's `w` (NaN when absent), `farY` the spot's `y2` (NaN when absent), `fx, fz` the unit forward
(sin yaw, cos yaw), `lx, lz` the landing point (edge + forward x (gap + `landIn`)), `ok` (the spot has `w` and `y2`;
false = listed but inert, one `console.warn` naming the spot), `open` 0 (unused), `user` the anchor ('' none,
`'@local'` the own player). `isSwingDevice(d)` guard (reads `kind` and a `barY` field: `TeamRequest.spot` is the host's
device, so the host rule narrows it with this).

**Pure helpers** (exported for tests, no allocation): `swingLocal(d, x, z, out)` -> `out.along` (along forward from the
near edge point: < 0 behind it, `gap` at the far edge) / `out.side` (lateral, (cos yaw, -sin yaw) as `pullUp.ts`
`topSpot`); `swingSpotOk(spot)` -> '' or a reason ('gap' `w` outside `gapMin..gapMax`, 'bar' `y - y2` outside
`bandBarLo - level .. bandBarHi + level` (the near floor is unknown at setup: the far floor stands in), 'missing' no
`w` / `y2`): called at setup and logged once with `console.warn` when not '' (A17: logged; the offer and the host
enforce the gap and the far floor below, PLAN's K4 test list). `swingPath(k, sx, sy, sz, d, y0, y1, out)` (the rider's
feet at `k` = 0..1 of `swingRide`): with `kg = grip / ride`, `k <= kg`: linear from the start (`sx, sy, sz`) to the
step-off point (edge - forward x `stepBack`), feet `y0`; after: `u = (k - kg) / (1 - kg)`, horizontal linear from the
step-off point to the release point (edge + forward x (gap + `releaseIn`)), feet `y0 + (y1 + releaseUp - y0) x u - dip x
sin(PI x v)` with `v = clamp(along / gap, 0, 1)` (the sag only over the gap: the feet never go under a floor while over
the near or far slab). `swingLand(u, d, y1, out)` (the release, `u` = 0..1 of `swingRelease`): horizontal from the
release point to the landing (`lx, lz`), feet `y1 + releaseUp x (1 - u x u)`.

**Anchor (role b; `idle` -> `swingOffer` -> on the host's start `swingHold` -> free).**
- Offer (`idle`, only when `free`; K0's `idle` already returns before kit offers with no mates): `kitIdOn('swingPass')`
  (check `flags.kitMoves.has('swingPass')` first anyway, PLAN "Shared by all five"); the nearest swing device with `ok`,
  whose near edge point is within `anchorReach` of the player (horizontal), `barY - feet` in `barLo..barHi`, the
  player's yaw within `faceCos` of the device yaw (`cos(c.yaw - d.yaw) >= faceCos`), and not taken (no mate in `brace` +
  `SWING_SUB` with `s` = index + 1). The rider offer (below) wins when it applies. Prompt "Co-op: brace on the pipe
  (swing pass)" at (edge x, `barY` - 0.3, edge z); no press: return false. On a press: `run.dev`, `run.idx`, `run.hp =
  h.health()`, the stance = edge - forward x `anchorBack` + lateral x `anchorSide` x side (side = the sign of the
  player's `side` from `swingLocal`, 0 -> +1), the start = the player's feet; `d.user = '@local'`, `h.partner = ''`,
  `h.state = 'swingOffer'`, `h.t = 0`, `h.count.offers++`; return true. A5: stance (66.45, 0, 42.45) or (66.45, 0,
  43.55): 0.45 m from the posts' faces, 0.6 m from the step-off point (66.2, 43.0).
- `swingOffer` (held; `busyOffer` true: a hand on the bar, weapons and interact off): kinematic (`ovAnchor`:
  `kinematic`, `yaw` = the device yaw, `turnRate` 12) from the start to the stance over `grab` (smoothstep), then held
  there. Prompt "Braced on the pipe: B lets go". B (`c.swallowCrouch = true`) or hurt (`h.health() < run.hp`) -> free
  (`h.end(false)`; no request is pending on the anchor's side).
- `swingHold` (from `begin` with `s.b === self`: `h.partner = s.a`, `h.t = 0`; held at the stance, the arm swinging on
  its own clock, matched to the rider's by the shared start): prompt null. Before `t >= grip` (the rider not yet off
  the edge): B or hurt -> `netEnd('drop')` once and `h.end(true)` (K4-3: the swing does not start). From `grip` on it
  is committed: B and hurt are ignored. `ended(k)` ('pull' the landing, 'drop' or none) -> `h.end(false)`. No end heard
  by `hold + holdGrace` -> `h.end(false)` (sends nothing; the host's pair lapses on `pairS`).
- Moved by something else (K1-3's pattern), checked first in every anchor and rider step: `c.override !== ` the move's
  override or the body more than `shove` from where the move put it last step (`hyp2`, horizontal) -> `h.endWhy =
  'swing: moved'`, `h.end(true)` at once (an anchor that is still before `grip` in `swingHold` sends 'drop' first).
  Downed / dead: K0's controller ends the move (`end` hook below).
- `end`: `d.user = ''` when it is ours; a paired anchor before `grip` that has not sent an end sends 'drop'; overrides
  are cleared by the controller's `end`; `run.dev = null`.
- Wire (K0 maps it): `brace` + `SWING_SUB` 512; `wireS` = index + 1 in `swingOffer` and `swingHold`.

**Rider (role a; `idle` -> request -> on the host's start `swingRide` -> `swingRelease` -> free).**
- Offer (`idle`, `free`, on the ground): a mate in `brace` with `(sub & SWING_SUB) !== 0` and `s >= 1` whose device
  `h.devices.list[s - 1]` is an `ok` swing device (bounded index), within `riderReach` (horizontal) and `up`. Prompt
  "Co-op: get swung across (swing pass)" at the player's head; no press: return false. While a request is pending
  (`run.asked >= 0`): prompt "Taking your partner's wrist...", return false. On a press, the page's own checks first,
  each a polite refusal (`h.refused`, no request; K5b's pattern): `gap > gapMax` "The gap is too wide to swing across",
  `gap < gapMin` "The gap is narrow enough to jump", `|farY - feet| > level` "The far side is not level with this
  one". Else `h.kitRequest('swingPass', m.id, idx, 0, d.farY, d.lx, d.lz)` (the claimed landing = the spot's: K4-4),
  `run.asked = 0`; return true. `tick` counts `run.asked` with the real dt and clears it after `askWait` (the shutter's
  pattern; also while another move claims the idle press).
- `begin` (`s.a === self`): `h.partner = s.b`; the device `h.devices.list[s.target]` (not a swing device, or no `s.l`:
  `h.endWhy = 'swing: no device'`, `h.end(true)`); the run's start = the player's feet now, `y0` = the feet y, `y1` =
  `s.l[1]`, the landing = (`s.l[0]`, `s.l[2]`) (the host-bounded claim, the same on both pages); `run.hp`; `h.state =
  'swingRide'`, `h.t = 0`; `run.asked = -1`.
- `swingRide` (`ride` 1.6 s): kinematic (`ovRide`: `kinematic`, `yaw` = the device yaw, `turnRate` 12) on `swingPath(t /
  ride)`; `g.player.pose.traverse = 'vault'`, `traverseT = t / ride` (the throw's local pattern; K0's remote table
  `KIT_A_TRAVERSE[512]` 'vault' reads it through `ph`); prompt null. B and hurt are ignored (committed from the start
  for the rider: it is the anchor's grip, K4-3). `ended('drop')` or `ended()` while `t < grip` -> `h.end(true)` where it
  stands (on the near floor); after `grip`: ignored (the swing finishes). At `t >= ride` -> `swingRelease`, `h.t = 0`.
- `swingRelease` (`release` 0.4 s): kinematic on `swingLand(t / release)` with `crouch: true`; `traverseT = t /
  release`. At `t >= release`: the feet set at the landing on `y1`, `netEnd('pull')` once (`h.g.net?.teamHangEnd?.('pull')`,
  as `shutter.ts` `netEnd`), `c.setCrouchToggle()` (lands crouched, as the throw), `h.end(false)`.
- `end`: `g.player.pose.traverse = 'none'` when the move set it; `run.dev = null`; `run.asked = -1`.
- Wire: `boost` + 512, `wireS` = index + 1.

**The host's rule (`check`, `checkSwing(r)`; K0 refuses the id off and runs the shared rate / alive / self checks
first).** In order, no allocation:
1. `r.spot` is a swing device with `ok` (`isSwingDevice`), else 'noTarget'.
2. `r.b` offering: `mode === 'brace'`, `(sub & SWING_SUB) !== 0`, `s === r.target + 1`, else 'notOffering'.
3. `r.a.mode === 'ground'`, else 'busy'.
4. `|r.a.y - r.b.y| <= up`, `hyp2(a - b) <= riderReach + hostSlack`, `hyp2(b - edge) <= anchorHost`, else 'far'.
5. `barY - r.b.y` in `barLo..barHi`; `gap` in `gapMin..gapMax`; `|farY - r.b.y| <= level`; `r.land` present,
   `hyp2(land - (lx, lz)) <= landTol` and `|land.y - farY| <= level`; else 'noTarget'.
Then K0 starts it (`paired` true, `claimsPoint` true): the start carries `target` (the index), `s` 0 and `l` (the claim).
The host bounds the claim, no host rays (the throw's pattern; K4-4).

**Done (K0's generic pair end; no K4 host code).** The rider's `netEnd('pull')` at the landing -> the host's
`kitHangEnd` -> `kitEnd` (only `doneBy` 'a', the rider, may say 'pull') -> `tend pull` to both -> `kitDone(g,
'swingPass', p.spot, rider, anchor)` (undefined for the host's own player). One call per landing.

**The move object.** `SWING_MOVE: KitMove<SwingRun>`: `kind 'swingPass'`, `times: { swingRide: SWING.ride,
swingRelease: SWING.release, swingHold: SWING.hold }`, `paired: true`, `claimsPoint: true`, `busyOffer: true`; `check`
= `checkSwing`; `idle` (rider first, then anchor), `begin`, `step` (dispatch by state), `ended`, `end`, `wireS`,
`tick`, `setupDevices` as above; `gap` absent. `SwingRun` holds every scratch value (dev, idx, side, stance, start,
`y0`, `y1`, landing, last put position, hp, asked, sent, `loc` scratch, `pt` scratch, `ovAnchor`, `ovRide`): preallocated
in `newRun`. If K5b's `KitMove.reset?(h, run)` hook (registry.ts, PR #622) is on your base, also implement `reset`: a
local swing state ends (`h.end(true)`, no end sent). If it is not on your base (today), do not add the hook.

### 2. `src/core/flags.ts`
`swingPass` into `KIT_BUILT` (append after whatever K slices are on the base) and its doc line: "K4's Swing Pass
(`swingPass`)". `KIT_MOVES_ON` stays empty.

### 3. `tests/kit/swingPass.test.ts` (new, ~400 lines)
Two `TeamController`s on fake games as `tests/kit/shutter.test.ts` (its `fakeGame`: controller with `pos`, `yaw`,
`override`, `swallowCrouch`, `setCrouchToggle`; `net.teamMates / teamRequest / teamHangEnd` logs; `target.health`): a
host page (`puppet` false) and a client page (`puppet` true), each page's `net.teamMates()` built every step from the
other page's controller (mode, `wireSub`, `wireS`, its position, yaw). A relay helper plays the host: a page's
`teamRequest` -> `checkTeamRequest` with the host page's device at the index as `spot` -> on null, `begin` on both pages
with `{ kind, a, b, target, s: 0, t0, l }`; a `teamHangEnd(k)` -> `kitEnd` on a `newKitPair` -> `ended(k)` on both. The
level: `addKitSpot` exactly as Marlow's A5 spot (`a5-swing`, (65.85, 2.6, 43.0), yaw -PI/2, w 3.5, y2 0), floors y 0.
`registerKitMove(SWING_MOVE)` and the `KIT_PAIR.swingPass` row set in `beforeEach`; `flags.kitMoves` set in `beforeAll`
and restored. Cases:
1. Spot and device: the device exists with the id off and no mates; its index matches on both pages (a shutter spec
   listed first on both); a spot with no `w` is inert (no offer, warn once); `swingSpotOk` passes A5's numbers and names
   'gap' (w 3.6, 1.9) and 'bar' (y 3.4 over y2 0).
2. Single player (no mates): no prompt and no state at the bar.
3. Anchor offer at a spot only: at (66.3, 0, 43.0) facing west the prompt; facing east, 1.0 m off the edge point, or a
   level with no swing spot: none. Co-op -> `swingOffer`; after `grab` the feet at the stance (66.45, 42.45 or 43.55 by
   side), at least 0.3 m from both A5 post boxes and 0.6 m from the step-off point; wire `brace` + 512, `s` 1 (index 0
   + 1, or 2 with the shutter first); B lets go -> free; a hit -> free.
4. Host rule (`checkTeamRequest` direct, as shutter.test's `req`): null on A5's numbers; 'notOffering' (no bit, wrong
   `s`, b on the ground); 'busy' (a in the air); 'far' (a 2.0 m from b, floors 0.5 m apart, b 1.5 m from the edge
   point); 'noTarget' (no spot, a non-swing spot, land 0.8 m off the landing, land.y 0.5 off, a spot with w 3.6, a spot
   with y2 0.5, bar 3.2 over b's feet); 'notOffering' with the id off (K0); the shared 'rate' / 'dead' / 'notMates'.
5. `swingPath` / `swingLand` (pure, 200 samples, A5 and a 2.0 m gap): starts at the rider's feet; at `kg` the step-off
   point; over a slab (along < 0 or > gap) the feet never under that floor; the low point near mid-gap at `y0 - dip`
   (+-0.05); the release point at gap + 0.3 and `y1 + releaseUp`; the landing at the spot's landing on `y1`: (61.45,
   0, 43.0) for A5, edge - 2.9 for the 2.0 m gap.
6. The swing, two pages, A5: the anchor (host page) offers; the rider (client page) 1.0 m beside it sees "Co-op: get
   swung across (swing pass)"; Co-op -> the request carries index, `gy` 0, the claim (61.45, 43.0); the start -> rider
   `swingRide` (wire `boost` + 512, `pose.traverse` 'vault'), `swingRelease` after 1.6 s (crouched), free after 0.4 s
   on the far floor within 0.05 m of the landing, crouch toggled; `teamHangEnd('pull')` once from the rider, never
   from the anchor; the anchor `swingHold` -> free on the relayed 'pull'. Then the roles swapped (the host page rides):
   the same.
7. Refusals on press (toasts, no request): a spot with w 3.6 "The gap is too wide to swing across"; y2 0.5 "The far
   side is not level with this one"; a 2.0 m gap spot runs and lands.
8. Committed: the anchor hit at t 0.1 s of `swingHold` -> 'drop' -> the rider ends on the near floor (feet y 0, x >
   65.85); the anchor hit at t 0.5 s -> nothing sent, the rider lands and sends 'pull'; the rider's B mid-ride is
   ignored.
9. Moved: an 8 m teleport mid-offer and mid-ride ends the move at once (`endWhy` 'swing: moved').
10. Done through K0's host (kitApi.test's `host()` stub pattern, the real `SWING_MOVE` registered, the A5 device at
    index 0 with its `barY`, `gap`, `farY`, landing): `onTeamMove('c1', 'swingPass', 'c2', 0, 0, 0, 61.45, 43.0)` with
    c2 in `brace` + 512 `s` 1 at the stance and c1 beside it -> `tstart` with `l`; c2's `hangEnd` 'pull' -> nothing;
    c1's -> `tend pull` and `onKitDone('swingPass', 'a5-swing', 'c1', 'c2')` once; the puppet stub never calls it.
11. `?kitmoves=0` (empty set): no prompt on either page; the host refuses a spoofed request ('notOffering').
12. `KIT_BUILT` contains `swingPass`; `readKitMoves(null, true)` has it (on in /preview/), `readKitMoves(null, false)`
    does not (off live); `KIT_PAIR.swingPass` is `{ pairS: 5, doneBy: 'a' }` after load. Allocation in idle / step /
    tick is a review item for the checker, not a test.

### 4. Existing tests `swingPass` in `KIT_BUILT` breaks (grep `tests/` and `scripts/` for `swingPass`, `swingRide` and
`KIT_BUILT` first, preamble rule)
- `tests/previewFlags.test.ts` (~line 89) `expect(ids(readKitMoves(null, true, '0'))).toEqual(['descent'])`: replace with
  K5b's line, `KIT_BUILT.filter((id) => id !== 'pull' && id !== 'shutter').sort()` (the same edit K1 / K3 / K5b make:
  whichever lands second rebases cleanly).
- `tests/kit/kitApi.test.ts` uses `swingPass` with its own `fakeSwing` and unregisters every part 2 move and its
  `KIT_PAIR` row in `afterEach`: it keeps passing with the real move loaded (vitest isolates files; its first test's
  `afterEach` removes the real one). Do not edit it; if a case does fail, report it rather than weakening it.
- `tests/kit/registry.test.ts:168` (`kitMoves()` length 1) runs after an `afterEach` that unregisters every kind: leave it.

### 5. Docs
The move file's header; `docs/systems/coop.md` kit table K4 row (exists from K0: "a (rider)", placeholders "hang-down
offer / vault", station `12 a5-swing`): edit only if the build differs (e.g. add "s = spot index + 1 both roles");
`changes/feature-coop-kit-k4.md` (kind: minor; plain words as K5b's: "Co-op (on in /preview/, not yet in the live
game): Swing Pass is playable. One player braces at a pipe on the edge of a gap; the partner takes their wrist, steps
off and is swung across, letting go over the far side and landing crouched. It reaches across gaps of 2 to 3.5 m with
both sides about level; when it cannot, a short line says why. At Marlow Yard this is station 12's way over the cable
trench.").

## Wire
None. No `src/net` file, no `protocol.ts` change, no `PROTOCOL_VERSION` bump. The move rides K0's `brace` / `boost` +
`SWING_SUB` 512, `MoveState.s` (index + 1, already +-500), the request's spot index in `target` and the claimed landing
`lx, gy, lz` (K0 parses a claimed point for any kit kind, `protocol.ts:916`, `:941`), the start's `l`, and K0's generic
pair end (`doneBy` 'a').

## Animation per role (K4 ships placeholders only, A20; the real poses are KA4)
K4 adds no pose or clip file. Each role plays K0's placeholder through K0's tables, on every screen: the anchor
`KIT_B_PLACEHOLDER.swingPass` 'hangOffer' (the hang-down holder's reach, local and remote; `swingOffer` / `swingHold`
'hangOffer' in `KIT_POSE_PLACEHOLDER`), the rider the 'vault' traverse (the throw's flight pose: the local move sets
`pose.traverse` / `traverseT`, a remote reads `KIT_A_TRAVERSE[512]` 'vault' with the wire `ph`). Those placeholders play
the same clips under every Animation source, so each actor already follows its owner's source as far as master does
(G400; the per-owner wire is PR #498, still open).
For KA4 (later; CLIP-LIST row K4, PLAN "Animation" steps 1-4; each role hand-made from the real technique, sources in its
report: the anchor's one hand hooked over the bar, feet at the edge shoulder-width, hips back and low against the
rider's weight, the free arm out over the gap in a wrist-to-wrist grip; the rider's wrist lock, the step-off with the
knees tucked, the swing under the anchor's arm, the legs reaching forward at the far end of the arc, the let-go and a
landing on the balls of the feet, knees bent, hands forward; both on `TEAM_LINK` so the wrists meet within 3 cm on host
and client, bible 5.12.2):
- `swingOffer` (the jump-grab and brace): hand-made + Mixamo download 4 ("pulling rope", the braced body; not in
  C:/NightShift/scratch/mixamo/clips/ today: a gap).
- `swingHold`: hand-made + Mixamo download 4 (a gap).
- `swingRide`: hand-made + Mixamo `trav_hanging_idle` (on master: the overhead grip) + download 11 ("swing"; not in the
  folder: a gap; PLAN Risks expects a gap for the pendulum ride).
- `swingRelease`: hand-made + Mixamo none listed; candidate `Falling To Landing.fbx` (in the folder, not converted) for
  KA4 to try.
KA4 registers them through K0's `KIT_POSERS` and its role A table, on #498's per-owner source.

## Assumed and logged (each with its undo)
- K4-1 The anchor's stance: 0.6 m back from the edge and 0.55 m to the side of the swing line, kinematic, its feet on
  the floor. At A5 the posts leave a 1.05 m lane at the bar, room for one body: the rider's. The stance is clear of the
  posts and the rider but about 0.6 m behind the bar's line at 2.6 m, over a standing reach (~2.3 m): KA4's pose reaches
  for it (PLAN "jump-grab the bar one-handed, hips back"). Undo: constants, or Marlow widens the posts.
- K4-2 The path is kinematic, not a simulated pendulum (a pendulum from the near edge cannot carry a body 3.5 m plus a
  landing): straight across in plan, the feet sagging `dip` 0.6 m only over the gap, let go 0.3 m past the far edge
  0.35 m up, a 0.4 s crouched landing 0.9 m past the edge (the throw arc's pattern). Undo: constants or a pivot model.
- K4-3 Committed: the rider from the start; the anchor from `grip` (0.3 s, the step-off). Before it, the anchor's B,
  hit or shove sends 'drop' and the rider stays on the near side; after it nothing stops the swing. Undo: a constant.
- K4-4 The claimed landing is the spot's own (edge + `gap` + 0.9 m on the line, `y2`): no rays on either page; the host
  bounds it. The spot's author guarantees the 0.75 m landing and a clear arc (A5: 4.2 m of landing, the line clear
  between the posts and over the trench). Undo: a down ray at the landing on the rider's page (K5b's `hitDistance`).
- K4-5 Bands: the gap 2.0-3.5 m and the far floor +-0.4 m are enforced by the rider's page (polite refusal) and the
  host (PLAN's K4 test list); the bar 2.2-2.8 m with +-0.2 m slack on the anchor's feet gates the offer and the host;
  `swingSpotOk` logs a bad spot (A17). Undo: constants (KD if Michael ever adds the bands).
- K4-6 Retry and restart on K0: `TeamController.resetKit` ends shutter states only, so an offer or a swing ends itself
  when its body is moved by something else (K1-3's pattern; station 12 never retries, a bay restart teleports). Undo:
  K5b's `reset` hook once it is on master (item 1 implements it when present).
- K4-7 The host trusts the anchor's MoveState (mode, sub, `s`, position, feet) as every kit move does; no `validate.ts`
  rule. Undo: a host-side check in `src/net` (two checkers, co-op group).

## Checks
- Every sub-step: `npm run typecheck:fast`; `npx vitest run tests/kit/swingPass.test.ts tests/kit tests/previewFlags.test.ts
  tests/teamMoves.test.ts tests/teamPose.test.ts tests/shutterWiring.test.ts tests/kitNet.test.ts`; `npx eslint <changed
  .ts>`. Never `npm run check`, e2e or a dev server.
- Gate (the lead requests it, one request: `node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites
  "e2e-netmove e2e-coop" --set k4-coop --requester "Night Shift | Player Build"`): `e2e-netmove` (PLAN) and `e2e-coop`
  (the lead's rule for a slice that edits `src/game` or `src/player`). The automatic `affected-e2e` pick is not the gate.
- Builder: Opus. Checker: ONE fresh Opus (no `src/net` edit); PASS only with `laptop-e2e/k4-coop` green. If the build
  must touch `src/net` (it must not), two fresh Opus checkers and the co-op group.
- Commit and push each sub-step (path-limited `git add <files>`, never -A), "coop-kit K4: ...", ending
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Progress in C:/NightShift/scratch/ctcore/k4-PROGRESS.md.

## Done looks like
Headless: at the A5 spot one player braces on the pipe (only at a spot, facing the gap, with a mate) and the partner
beside them is swung across the 3.5 m trench (and a 2.0 m gap) in 2.0 s, landing crouched 0.9 m past the far edge on
both pages; a 3.6 m gap and a far floor 0.5 m off are refused politely; the anchor letting go before the step-off stops
it, after it does not; the host's `onKitDone('swingPass', 'a5-swing', rider, anchor)` fires once per landing, on the
host page only; a teleport ends an offer or a swing; single player and `?kitmoves=0` offer nothing. `swingPass` is in
`KIT_BUILT` (on in /preview/, off live). The `k4-coop` set green.

## Report and the Marlow line
C:/NightShift/scratch/ctcore/k4-REPORT.md: head sha, base used, built per item (file:line), files and line counts,
tests, deviations, doubts, and this text for the PR body (message to Marlow Build):
"coop-kit K4 Swing Pass. Id: `swingPass` (in `KIT_BUILT`: on in /preview/, off live). Spot: `addKitSpot(b.anchors, {
id, kind: 'swingPass', x, z (the near edge point on the swing line, under the bar), y (the bar's height, absolute;
2.2-2.8 m over the near floor), yaw (across the gap, toward the far side), w (the gap, 2.0-3.5 m), y2 (the far floor,
absolute; within 0.4 m of the near floor) })`; your #612 A5 spot (65.85, 2.6, 43.0, yaw -PI/2, w 3.5, y2 0) matches.
The anchor braces 0.6 m back from the edge and 0.55 m to one side of the line (clear of the swing-bar posts); the
rider steps off 0.35 m back from the edge on the line and lands 0.9 m past the far edge (A5: x 61.45, z 43.0); keep the
line and a 0.75 m landing clear. Done: `onKitDone('swingPass', spot, rider, anchor)` on the host, once per landing.
Marlow station 12 `a5-swing` uses the real move when the id `swingPass` is on." No PR is opened by the builder; the
lead opens it.

## Doubts (for the lead)
1. K4-1 the anchor's reach: the A5 posts (1.05 m lane) fit only the rider on the bar's line, so the anchor stands 0.6 m
   behind the bar's line and the 2.6 m bar is above a standing reach. Fine for the placeholder; KA4's pose (or a wider
   post spacing from Marlow) settles it. Tell Marlow now, or after Michael's walk?
2. K4-2 the swing is a kinematic arc, not a pendulum. Michael's walk decides whether it reads as a swing.
3. A lost done call: an anchor downed or gone after the step-off makes K0's host unpair (`endPairOf`), so the rider's
   later 'pull' finds no pair and `onKitDone` never fires: the rider is across but station 12 waits for a second swing.
   Station 12 has no guards, so rare in the prototype. Fix later in K0's `kitHangEnd` (accept the `doneBy` 'pull' for
   a moment after an unpair): `src/net`, two checkers.
4. Shared files: `src/core/flags.ts` (`KIT_BUILT`, PLAN lists it for K1, K3, K4, K2 and K5b) and
   `tests/previewFlags.test.ts:89` (no PLAN file list names it; the preamble's grep rule forces the same one-line edit
   in K1, K3, K4 and K5b). K3, briefed in parallel, takes the same two lines: whichever lands second rebases.
   `docs/systems/coop.md` K4 row: K0's text already matches; K4 edits it only if the build differs.
5. Base: K0 (#599) is not on master; K5b's `reset` hook (#622) is not on K0, so K4 has no reset hook (K4-6). If the
   lead stacks K4 on K5b instead, the builder implements `reset`.
6. The e2e gate adds `e2e-coop` to PLAN's one set (`e2e-netmove`) under the lead's `src/game` rule; confirm both run in
   one request (`k4-coop`), as K1.
7. The remote rider plays the 'vault' traverse twice (ride, then release, `traverseT` 0..1 each): cosmetic until KA4.
8. Estimate ~850 lines against PLAN's ~800: the two-page test and the host-stub done case are the difference; still
   under ~1,000.
