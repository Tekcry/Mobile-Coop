# Step 10 - elbow-strike (Block C)

Fire while holstered = the elbow strike, a committed move; the generic host-approved committed-move protocol `cmove` /
`cstart {t0}` / `cdeny` (A5, H3); MoveState `strike`. Deps: 09. Model: implementer opus; checker opus (src/net). (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A (PROTOCOL_VERSION 3, slot 1 `wall`) and step 09 (`drawState`, PROTOCOL_VERSION 4). Line numbers
verified 2026-10-13 before Block A: grep the named symbol first.

## Read
- docs/design-bible.md 428-448 (5.4 elbow strike), 662-680 (5.9 C11); DECISIONS.md D8, A5; PLAN.md H3, H4
- src/game/takedown.ts 10-50 (TAKEDOWN), 266-279; src/game/takedownController.ts 69-175, 415-453 (melee hit :425)
- src/ai/enemy.ts 160-170 (`stagger` :168), 341-390 (`beginTakedown`, `releaseTakedown` :379-384), 395-410
  (`alerted` :402), 640-680 (knockOut :645, heavy :651); src/ai/enemyManager.ts grep `noise(`
- src/game/teamMoves.ts 1-60 (`checkTeamRequest` :39: the model for the pure host check)
- src/net/protocol.ts 140-190 (Msg union: `tmove` :162, `tstart` :164, `tdeny` :166), 455-480 (their parse cases)
- src/net/coopHost.ts 430-470 (dispatch), 500-535 (takedown), 570-605 (team move host path)
- src/net/coopClient.ts 95-120 (tstart / tdeny / send), 385-400; src/net/interp.ts 95-115 (ClockSync)
- src/player/moveState.ts 12-52 (MOVE_MODES, COMMITTED_MODES), 250-300, 370-385 (`out.melee` :378)
- src/anim/animGraph.ts 800-810 (procedural melee arc, W04); src/game/localMoveState.ts 1-60

## Task
1. Pure src/game/elbowStrike.ts: `STRIKE = { reach 1.2, cone 90 deg, hitAt 0.5, recover 0.4, stagger 1.0, noise 4 }`
   (bible 5.4). `resolveStrike({aware, facingDot, heavy, staggered}) -> 'ko' | 'stagger'`: unaware (any side) -> ko;
   aware and side / behind (facingDot <= 0.5) -> ko; aware facing -> stagger; staggered by a strike -> ko; heavy and
   facing -> stagger only, never ko.
2. Trigger: `fire` pressed with draw phase 0 (step 09), grounded or on the wall, not attached, traversing, in a takedown,
   team move or carrying. Target: nearest live, unseized guard within reach and cone; none = a whiff.
3. Timeline 0.9 s: anticipation 0 - 0.15, strike to contact at 0.5, recovery to 0.9. A whiff keeps the 0.4 s
   recovery exposed. Movement is locked to gear 1 during it; the root never lunges more than 0.3 m.
4. New MoveState mode `strike` appended (index 25): `ph` 0-1, `tid` target guard (or -1). Mirror in `localMoveState`
   (precedence after takedown, before attached), `poseFromMoveState` (`out.melee = ph`, reworked to an elbow arc with
   hip turn, 5.12.2 joint rates), remoteAvatar, pack / sanitize.
5. Generic protocol (A5): `cmove {kind, id, target}` client -> host; `cstart {kind, a, id, target, t0}` host -> all;
   `cdeny {a, id, kind, reason}` host -> all. `CKind = 'strike' | 'medkit'` parse now (medkit used in step 15).
   Reserved, not parsed yet (comment + PLAN H3 / H4): takedown, grab, drag (step 27), splitBoost, backToBack, pullUp,
   rappelAnchor, clutch (Phase 5).
6. Pure host check src/game/committedMoves.ts `checkCommitted(req) -> CDenial | null`: rate (0.3 s per player),
   dead, busy (attached, committed, takedown, team, downed), far (host distance to target > reach + 0.6 lag slack),
   noTarget (dead, seized, knocked out). Same function for the host's own strikes (no message).
7. t0 is host time at acceptance; clients map it with ClockSync. Client prediction: the requester plays the
   anticipation on press; on `cstart` it aligns `ph` to host-now - t0; on `cdeny` or no reply in 0.4 s it blends back
   in 0.12 s with no hit.
8. Hit resolution only on the host at t0 + 0.5: re-check reach and cone; ko through the existing melee hit path
   (takedownController.ts:425 pattern, kind 'melee'); stagger through a new `Enemy.strikeStagger(1.0)` (breaks aim,
   marks `staggered` for the window); noise 4 m via the enemy manager. Host interrupts: damage to the striker before
   t0 + 0.5 cancels (`cdeny` reason `hit`).
9. Solo uses the same pure path with t0 = now. Events: `strike {result: 'ko'|'stagger'|'miss'}` (audio, rumble in 17).
10. Takedowns keep `td` in this step (moved to `cmove` in step 27; ASSUMED, see report).
11. Touch: the fire button strikes while holstered (D1). PROTOCOL_VERSION 4 -> 5.

## Tests
- tests/elbowStrike.test.ts: resolve table (all rows above), timeline, whiff recovery.
- tests/committedMoves.test.ts: each denial, rate window, host-own path.
- tests/net.test.ts: parse `cmove` / `cstart` / `cdeny` (clamps, unknown and reserved kinds rejected, t0 range).
- e2e-pad (Proving): RT holstered behind an unaware guard -> KO within 0.6 s; aware facing guard -> stagger; second RT
  in the window -> KO; heavy from the front -> stagger only; whiff -> 0.4 s recovery.
- e2e-mouse: LMB holstered behind a guard -> KO. e2e-takedown: heavy frontal strike case.
- e2e-netmove: case "strike" (host remote mode `strike`, joints <= 10 cm mid-strike); case "denied" (host seizes the
  target first: client gets `cdeny`, no KO, back to `ground` within 0.3 s).
- e2e-coop: a client strike KO is applied on the host and the client puppet.

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-netmove e2e-coop e2e-takedown`
- `node scripts/anim-audit.mjs` local and remote (strike pose: joint rate <= 25 deg / frame, no teleport, settle)
- Grep proofs: `grep -n "'strike'" src/player/moveState.ts`; `grep -n "cmove\|cstart\|cdeny" src/net/protocol.ts`
  shows type + parse; PROTOCOL_VERSION = 5.

## Commit
"locomotion 10: elbow strike, generic host-approved committed moves"
Then LOG, STATE, AUDIT (S07, W04), CHANGELOG, TESTING, docs/systems/takedowns.md and coop.md.
