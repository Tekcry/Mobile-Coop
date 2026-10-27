# coop4 merge 15 build (cf385d438 + d2bbf7104, origin/master a7853bed4)

Builder: Opus. Merge commit cf385d438 (parents e3fa3909f coop4, a7853bed4 master; base 4a22a0de7). Master's side:
piano escape S4 (#631), piano-knife S3 (e8a5251b7, e1fa606f1, f32ccb950, 3609077af, 1f8b201e7 via 049515866) and
coop-kit K0 (5de7e7e4c). Follow-up d2bbf7104: test stand-ins (merge fallout, no assertion changes).

`PROTOCOL_VERSION = 78` (master's; auto-merged), coop4's note on the `MAX_PLAYERS` line kept.

## Conflict hunks

### src/game/modes/sectorMode.ts (1 hunk, `netExtra`)
- coop4: the OUT mask `ot` (only while someone is out), the return split over lines. Master: the scene's EMP press
  `ep` (`this.scene.t0 >= 0`) on the one-line return.
- Kept: coop4's form with `ot`, plus master's `ep` spread. Independent keys.

### src/game/teamMoves.ts (1 hunk, `TeamRequest`)
- coop4: `bBusy` (A20, the partner serves someone else: `taken`). Master: `spot` (K0, the kit device at the spot index).
- Kept: both fields. `checkTeamRequest` auto-merged with both reads.

### src/net/coopClient.ts (1 hunk, `fixedUpdate`)
- coop4: `this.followStep()` (round fix, OUT follow-cam). Master: `this.piano?.step(dt, true)` (S4 scene prompt / cut).
- Kept: both, followStep first (it was there first), then the piano step.

### src/net/coopHost.ts (4 hunks)
1. Imports: coop4's `inOpenMove`, `OPEN_MOVE_GRACE`, `TeamKind` + master's `KitKind`, `kitDone`. From kitNet: master's
   list plus `kitPairS` (replaces coop4's `PULL_PAIR_S` / `SHUTTER_PAIR_S`, see teamMark below).
2. Constructor revives: coop4's `matchRevives(..., s.players.size)` (A4, the pool scales with players at op start) then
   master's piano-scene line (`reviveClock.cap = REVIVES_PER_MISSION`). On a piano scene master's cap overrides the
   scaled pool (master's design: the campaign cap); elsewhere coop4's scaling holds.
3. Kit request: master's `kitSpotAt` / `spot` / `target: at` plus coop4's `bBusy: this.teamBusy(partner, by)`. The busy
   check still runs before `unpairOf(partner)`.
4. Kit start: coop4's `teamMark(kind, by, partner)` kept; master's start shape (`target: at`, `s: ss`).

## Adapted 2-player assumptions / merge-needed changes
1. `CoopHost.teamMark` (coopHost.ts): the busy length of a kit move was `pull ? PULL_PAIR_S : shutter ? SHUTTER_PAIR_S :
   Infinity`. Master's K0 gives every paired kit kind a pair life (`kitPairS`, from `KIT_PAIR` rows). Now
   `isKitKind(kind) && kitMove(kind)?.paired ? kitPairS(kind) : Infinity`. Same values today (pull / shutter are the only
   paired kit moves and `KIT_PAIR` is empty); a future paired part 2 move is busy for its pair's life, not until the
   open-move grace.
2. `CoopClient.frameUpdate` (coopClient.ts): master posed only the first partner's knife victim (`knifePuppet`, "one
   partner: the first"). With up to 3 partners two knife kills can run at once, so it is now two reused lists
   (`knifePuppets` / `knifeNow`, swapped each frame, no allocation): every partner's victim is posed; a puppet no knife
   kill holds is let go (`knifeVictim(null, 0, 0)`) as before. A puppet two avatars claim is posed by the first only (as
   master). coop4's own `heldPuppet` (G7, also "the first") is unchanged: not merge work.
3. Checked and fine (id or ref based, no list place as slot): the host's `knifeHold` / `knifeRigOf` / frame posing (per
   remote, by `seized.by`), `kitDone` (ids a / b), `kitSpotAt`, the protocol's `ep` / kit parse, the scene's
   `operatorAt` / `porchStep` / reveals (loop all `playerRefsInto`), `addRemote` (coop4's slot spawn kept).

## Not adapted (for the checker)
- Knife takedowns and the busy rule: a knife kill is a player-on-guard takedown (`td` seize, `seized` map), not a
  player pair, so there is no partner to mark busy. It goes through the host's knife gate and the existing takedown path,
  which (as before the merge, for every takedown) does not read `teamActive`. A player who is a team-move partner can
  still start a takedown, as before.
- The piano scene is built for two operators (master's design): `PianoIntro(slot)` is 0 for the host and 1 for every
  client (`askEmp ? 1 : 0`), the EMP items sit at `checkpoint` / `checkpoint2` only, the intro pose is 'stand' / 'mirror'.
  Clients in slots 2 and 3 get slot 1's intro camera and must walk to one of the two EMP spots. Passing the real slot
  would fall back to slot 0's camera (`OPERATOR_SPOTS` has two rows): a design question, left as master has it.
- Piano scene revives: the scene's fixed `REVIVES_PER_MISSION` cap replaces coop4's per-player scaling there.

## Commands and results
- `git merge origin/master`: 4 conflicted files (above), the rest auto-merged.
- `npm run typecheck:fast`: clean (after the merge and after the test fix).
- `npx vitest run` on the 148 test files under tests/ that name src/net, playerSlots, teamMoves, sectorMode, knife or kit
  code: first run 2 files / 7 tests failed (stand-in fallout: `tests/kit/kitApi.test.ts` host fake lacked coop4's
  `teamActive`; `tests/missionNet.test.ts` client fake lacked the knife puppet lists). Fixed by adding those fields
  (d2bbf7104). Rerun: 148 files passed, 2972 tests passed, 3 skipped, 1 todo.
- Not run (per brief): npm run dev, e2e, full npm run check.
