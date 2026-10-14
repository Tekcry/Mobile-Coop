# Co-op
Purpose: transports, the host and client sims, co-op sync, team moves, crossplay and PvP.
Design authority: docs/design-bible.md (Section 5.9)

## Coop (`src/net`)
- Entry: `main.ts` registers the Co-op menu entry and `?room=CODE` handling; both `import('./net/coopUi')`.
  `CoopApi` (startGame/goToMenu/profile) is how net talks back to the shell. Never import `src/net` statically.
- `Transport` (`transport.ts`): `send(msg, to?)`, `onMessage/onPeerJoin/onPeerLeave`. `trysteroTransport`
  (WebRTC, Nostr signalling, room `ss-<code>`) or `localTransport` (BroadcastChannel, `?net=local`, for tests).
- `protocol.ts`: every inbound message goes through `parseMessage` (shape, clamps, string sanitising, caps).
- `PROTOCOL_VERSION` 7 (locomotion step 12: WALL_SUB edgeL / edgeR / peek / lean bits are posed by remotes (`poseFromMoveState` rig lean from the peek and the aim); the wall MoveState gains `lk` (lean kind, 2 bits: 0 none, 1 out past the edge, 2 over the top; packed only on `wall` when non-zero, sanitized to an integer 0-2 on `wall`, anything else dropped, A34; `moveChanged` counts it; 12b (no bump, still 7): WALL_SUB `leftHand` 128 is set from the edge side (`localMoveState`: peeking or leaning out with `lk` 1 at edgeL) and remotes pose the mirrored grip from it (`poseFromMoveState` `leftHand` needs edgeL too; `RemoteAvatar` sets `rig.openLeft`, the rig blends the switch over `EDGE_HAND_TIME` as the owner's did); the low-wall side lean is `lk` 1 with WALL_SUB.low, the host's copy posing the same head cap (`wallHeadCap`)); MoveState `swat` (index 26, committed, client-owned like a traversal, A24): its `MoveCommit` (from, to, dur) replays on remotes through the commit path (no traverse pose, the gait from the path's speed), the host drops a commit outside the turn's range / duration / pace (`swatCommitOk`, a violation) and caps the move speed at 1.5x the turn's pace; the host samples a peeking client's light and guard head point at the head past the edge from the MoveState (`wallPeekOffset`), no extra bandwidth. 6 was locomotion step 11: MoveState `wall` set - `a` the cover segment in level order (sanitize: `0 <= a <` segment count), `s` metres along it, `sub` WALL_SUB u8; remotes pose from it, the host feeds the client's `CoverSpot` to its guards and hears the slide at the crouch band, stacking reads the others' `wall` states (`wallOthers`, D8); 5 was locomotion step 10: `cmove` / `cstart` / `cdeny` and MoveState mode `strike`, index 25; 4 was step 09: MoveState `dw`; 3 was Block A of the locomotion run: `ex` and `sh` gone, MoveState slot 1 `cover` -> `wall`, reserved for back-to-wall until step 11; A2). A `hello` with another version is ignored by the host. `PlayerState.mv` (`player/moveState.ts`): mode index (`MOVE_MODES`, append only), anchor, sub bits (`ATTACH_SUB`), phase, takedown target, gear, raise, aim twist, ready, grips, commit.
- (step 09, D8, A20 / A41) Drawn state: every MoveState carries `dw` (0-3, the draw phase; sanitized to 0-3,
  default 0). The host (`RemotePlayer.accept`, pure `validate.ts`) keeps `w` only if it is in the player's lobby
  `loadout` (`hostWeapon`, else the last valid id; an empty loadout keeps the claim) and forces `dw` 0
  (`hostDrawPhase`) while the claimed mode has busy hands (attached except split / rappel / inverted pipe, takedown,
  brace / boost / stacked bottom) or the player is downed; snapshots carry the host's values. `takeShot` refuses a
  client shot unless the host's `dw` is 2 (`hostShotAllowed`: no hip fire on the host) and unless the shot's weapon is
  the one the host holds for it or in its lobby loadout (`hostShotWeapon`, before the rate limit and damage read it).
  A client treats an echoed `dw` 0 as a host force only when the host's busy-hands rule on its own current MoveState
  and the host's downed view agrees (`clientForcedHolster` / `hostHandsFree`), so latency never cancels a draw; then
  it holsters locally (`forceHolster`, held until aim is released). Remotes take the weapon in hand
  from `dw` (not `PF.ads`); a holster shows from the newest received state, not the interpolated one, so the remote
  stows within 0.6 s of the release.
  Add a message: type in `Msg`, case in `parseMessage`, a test in `tests/net.test.ts`.
- `NetSession`: lobby state (each `PlayerInfo` carries name, tag, look and the validated weapon `loadout`), ready/start, routing. Clients accept authoritative messages (lobby/start/snap/
  ev/end) only from the host; the host accepts gameplay messages only from lobby members. No host migration.
- `GameOptions.net = { role, attach(g) }` -> `GameState.net: NetAttachment` (fixed/frame hooks, death,
  revive, pickups, blips, end). Client sessions set `GameState.puppet` (no AI/mode; health from snapshots;
  local `damageMul = 0`). Coop never pauses the sim (pause menu only takes input).
- `CoopHost`: remote players (`RemotePlayer` = Damageable + hitbox + PlayerRef), 15 Hz snapshots, event
  queue, enemy position history for lag compensation, shot/blast checks via pure `validate.ts`, per-player
  kill tallies sent in `end`. `CoopClient`: `EnemyPuppet`s + `RemoteAvatar`s interpolated with
  `SnapshotBuffer`/`ClockSync` (`interp.ts`), sends `pstate` at 20 Hz and hits as `shot`; rewards come from
  `clampEnd` + `coopSessionStats` of the host report.
- Modes (`NetMode`): co-op `wave | clear | infiltration | sandbox` (`COOP_MAX` 4), PvP `tdm | ffa` (`MAX_PLAYERS`
  8, `TEAM_MAX` 4 a side); `capacity(mode)` gates joins and `startMatch` (`overCapacity`). Lobby/start carry
  `mission` (Infiltration); `PlayerInfo.team` (balanced on join, `team` message / `requestTeam`).
- Co-op sync: snapshots carry enemy `al` (alert level, +4 seized), and when changed (or every 2 s) `items`
  (usable interactables: objectives, switches, alarms, doors, revive points; clients mirror them in their own
  `Interactables` and send `use`, the host checks reach) and `doors` (open indices; clients `Doors.setOpen`).
  Client takedowns: `GameState.takedownVictims` = puppets (`TakedownVictim`), `td start/done/abort` seizes the
  host enemy (denied -> `tdDenied`). The host hears clients (footsteps by `noiseRadius`, shots by `PF.firing`,
  `PF.quiet` = suppressed). Downed: `revive` interactables on bodies (`NetAttachment.onLocalDeath` /
  `onRespawn`); everyone down -> the mode.
- Co-op depth (2.1): bodies - the host lists lying bodies (`Body.enemyId`, not hidden / carried) in `snap.bodies`
  when it changes; clients keep those ragdolls (`keep`, `BODY.max`) and drop the ones it leaves out. Pings
  (action `ping`: D-pad left, Z, touch `ping` in co-op): `GameState.sendPing` (aim ray) -> `NetAttachment.ping` ->
  `ping` msg / event (host rate 0.8 s, near the sender), `GameState.addPing` + `ui/hud/pings.ts` (follows a pinged
  guard, edge arrows off screen). Gadgets: `GadgetSystem.onLocal` reports gas / flash / EMP / noise effects; the
  host relays them (`gadget` msg / event, 1 s rate, <= 40 m) and runs `remoteEffect` on its guards. Dual takedowns: two players finishing within `DUAL_WINDOW` 1.5 s ->
  banner (relayed) + style.
- PvP fairness: `pvpLoadout` (base damage), no suit / HQ in `tdm | ffa`, `maxHitDamage(def, head, false)` on the host.
  3.1.9: no graphics / FOV locks in PvP (the 3.1 shared look, FOV cap and Panini-off were removed: each player's own
  settings); graphics still never change gameplay (fog on every preset, `tests/losParity.test.ts`).
- PvP (`net/pvp.ts`, pure: `PvpScore`, `pickSpawn`, `balanceTeam`, `pvpInfo`): `GameState.pvp` (no AI / mode;
  pickups only); the host owns the score (`frag` events, `score` + `tl` in snapshots), respawns (`PVP.respawn`,
  protection), the end (`winner` in `end`). Damage rules: `PlayerTarget.friendly` / `RemotePlayer.friendly`
  from `PvpScore.hostile`; host shots hit opponents through `Hitboxes` on their avatars; client shots hit
  `PvpTarget`s (hit volumes on opponent avatars) and are sent with the player id, rewound on the host
  (`RemotePlayer.history`, host `selfHist`). Results: eliminations / deaths (`SessionStats.deaths`).
- (locomotion step 10, A5, D8) Committed moves, generic: the client sends `cmove {kind, id, target}`; the host runs the
  pure `checkCommitted` (`src/game/committedMoves.ts`: `rate` 0.3 s per player, `dead`, `busy` - attached, committed,
  takedown, team move, downed -, `far` - target beyond reach + 0.6 m lag slack -, `noTarget` - dead, seized, knocked
  out) and answers all with `cstart {kind, a, id, target, t0}` (t0 = host time at acceptance, mapped with `ClockSync`)
  or `cdeny {a, id, kind, reason}`. The host's own moves use the same check with no message. `CKind` parses
  `strike | medkit` (medkit from step 15); takedown, grab, drag (step 27), splitBoost, backToBack, pullUp,
  rappelAnchor and clutch are reserved, not parsed (PLAN H3 / H4). Damage to the striker before contact sends `cdeny`
  reason `hit`. First user: the elbow strike (`docs/systems/takedowns.md`). The client predicts the anticipation on
  press, aligns its phase to min(local, host-now - t0) on `cstart` (never forward: A44), and blends back in 0.12 s with no hit on `cdeny` or no reply in
  0.4 s. Contact resolves only on the host at t0 + 0.5 s. Remotes pose the strike from MoveState `strike` (`ph`, `tid`),
  the phase eased between the two interpolation states (`RemoteAvatar.update`).
- Remote animation audit (locomotion step 08): `node scripts/anim-audit.mjs --remote` hosts and joins over `?net=local`
  (helpers in `scripts/e2e-net-lib.mjs`, shared with e2e-netmove), drives the client in real time and scores the host's
  copy (`RemotePlayer.avatar.rig`) with the local player's metrics (bible :858 "remote poses obey the same continuity
  limits") plus pose error vs the owner at matched timestamps (`INTERP_DELAY` shifted, <= 10 cm), pops (rubber-banding)
  and the brace + boost pair (<= 3 cm, :859). Report only in `npm run e2e` until step 32; `docs/systems/testing-tools.md`.
