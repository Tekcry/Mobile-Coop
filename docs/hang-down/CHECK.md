# hang-down fresh check - feature/hang-down @ 0578d554

**PASS**

Checker: fresh, read-only. Scratch copy C:/NightShift/scratch/hdc (git archive 0578d554), deleted after the run.
Read: docs/hang-down/BRIEF.md (A1-A8), docs/hang-down/REPORT.md, CLAUDE.md hard rules, full src diff vs origin/master.

## 1. Correctness - OK
- Gate: `TeamController.hangActs` = `state === 'hanging' && !hang.sent` (teamController.ts:147). Lowering, pull-up, drop
  and an asked end are off; `find()` returns null while `hangingDown && !hangActs` (takedownController.ts). Test covers.
- Menu (A1): `contextMenuStep` aside no longer counts the settled hang; no carry target from the hang; door rows still
  gated by `team.active` in `doorMenuCandidate` (gameState.ts:1385), so only GRAB CHARACTER and the item row show.
  `updateInteract` returns early while `hangActs`, so the old direct-A hack cannot double-fire with the menu's hold row.
  The direct-A takedown press is off while hanging (`!this.team.hangActs`); lowering / pull-up keep the old path.
- Grab (A3): `start()` keeps the body (no traversal reset, no standUp, approach = `HANG_GRAB.reach`);
  `runHangGrab` never writes the controller override (team move owns the body); `release()` now clears only its own
  `this.ov` - safe for existing kinds (attachController rewrites its override every step, attachController.ts:987).
  Held rules reuse `holdTalk` / `holdPick` (extracted, behaviour unchanged; `carry` from the hang = plain KO).
- KO by default (A4): grab path - `!hangActs` finishes as KO unless a kill strike is already running; also during the
  reach. Quick path - `!hangActs` finishes as decided, undecided = KO. No abort path leaves the guard held.
- Neck snap (A5): RT via `grabTriggerPick(rtRes, altFire)` only when `inp === real` (not under a held menu), offer kind
  `hangDown`, not aiming, no active takedown; `start(lethal)` decided at start; elbow strike blocked by
  `!team.hangingDown`; `pose.melee = -1`, no kill tail from the hang.
- Sidearm (A6): `pistolAsk` treats LT as pistol while hanging; `hangAim` reuses `hangAimRef` (PIPE band, inverted,
  yaw + PI); `draw` drives `setAttachedStow`; camera `inverted` while hanging.
- Joiner as hanger (A7): `localMoveState` returns the team mode first, so the hanger stays `boost` + `HANG_SUB` during
  a grab (never `grab` / `takedown`). Host `onTakedown` start: `TD_REACH` 3 m horizontal from feet passes. Seized loop
  (coopHost.ts:1189): `hangHoldStep` holds the guard lifted and resets `s.t`; disconnect -> `by` undefined ->
  `hangingMove(undefined)` false -> existing `release`; dead client -> release; hang ended without a `td done` ->
  falls back to the `TD_MAX` 6 s let-go (no stuck guard). `hostHandsFree` allows the drawn pistol; `checkShot` gets
  `SHOT_UNDER_HANG` 2.2 m only for a hanging shooter.
- NaN: guard right under the head uses `vyaw + PI` (tested finite); `atan2(0,0)` = 0 on host; eases clamp.

## 2. Wire - OK (no change)
- protocol.ts not in the diff; `PROTOCOL_VERSION` = 31 (src/net/protocol.ts:19), asserted in tests/hangDownNet.test.ts.
- `td.kind` is an existing optional string (validated by `id()`); the new value `hangDown` fits the shape.
- MoveState shape unchanged (hanger stays `boost` + `HANG_SUB`). 34 unused - correct.

## 3. Hot-path allocation - OK
- New per-step code allocation-free: `hangAimRef ??=` once; `runHangGrab` writes `this.pt`; `hangHoldStep` uses a
  module `tmp`, `s.hang` once per seize; host seized-loop addition and `checkShot` arg add nothing new.
- `pickTakedown` `hangDown` case (takedown.ts:276) allocates `to` + the plan per call, same as every existing case
  (pre-existing pattern) - polish, not a block.
- No `Math.hypot` in src changes (`hyp2` used in `hangInReach`).

## 4. Static import rule - OK
- `src/net/hangHold.ts` is imported only by `src/net/coopHost.ts` (itself behind the dynamic import). No file outside
  src/net imports src/net (grep). hangHold / validate import from src/game only (allowed direction).
- No edits in src/ai, animGraph, characterRig, footPlanner.

## 5. Tests - OK
- New, run singly: hangDown 8/8, hangDownTakedown 7/7, hangDownNet 6/6 - pass.
- Asserts prove: reach / lift / hold point; plan kind, finite facing; `hangActs` gate across states; offer (no dog,
  out of reach, unsettled); grab lift, held, no let-go over 300 steps, KO / kill / carry->KO, team override untouched,
  no speed cap, `hangGrab` done kind; KO by default held and during reach; quick neck-snap kill with no elbow arc and
  hanger not moved; tap choke + hang end = KO; host D8 rule incl. holder / rope / throw stay busy; shot origin allowance
  only with `SHOT_UNDER_HANG`; host hold eases to the same point and follows depth; protocol 31.
- GameState input routing (LT draw, hold-A menu, RT) is proven by the new e2e-coop "hang-down" section (laptop job).
- Existing area, run singly: takedown 18, teamMoves 24, grabMenu 3, net 72, coopFix 13 - pass.
- `tsc --noEmit -p .` exit 0. eslint on the 7 src + 3 test files exit 0.

## 6. GPU e2e
Desktop e2e-takedown / e2e-anim already passed on 0578d554 (given). e2e-coop / ctcourse / netmove: laptop.

## Required fixes
None.

## Polish list
- Animation (A8): no upside-down grab / choke / neck-snap clips; the inverted pistol uses the generic aim (no
  `pipeInv` grip channel).
- Host view of a client hang KO: no limp lowering (guard drops at the finish); remote hanger shows no hands on the guard.
- takedown.ts:276 - `hangDown` case allocates `to` and the plan per offer evaluation (as the other cases); a scratch
  plan would make the offer search allocation-free.
- validate.ts:218 duplicates `hangingMove` (hangHold.ts:28); call one helper.
- `hostHandsFree` also allows the pistol while lowered / pulled / dropping (MoveState cannot tell `hanging`); minor
  anti-cheat slack.
- No unit test of the CoopHost seized-loop integration (disconnect / hang ended / TD_MAX fallback) - verified by
  reading only; RT fire and RB jammer from the hang untested (REPORT notes the jammer).
- While a guard is held, `grabInp` blanks Co-op / B, so the hanger cannot ask the pull-up / drop until the guard is
  finished (the holder still can). Matches "no let-go"; mention in docs if intended.
- On a host release (client abort) the guard is let go at the lifted height (up to 0.6 m); relies on gravity.
