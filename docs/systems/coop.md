# Co-op
Purpose: transports, the host and client sims, co-op sync, team moves, crossplay and PvP.
Design authority: docs/design-bible.md (Section 5.9)

## Coop (`src/net`)
- Entry: `main.ts` registers the Co-op menu entry and `?room=CODE` handling; both `import('./net/coopUi')`.
  `CoopApi` (startGame/goToMenu/profile) is how net talks back to the shell. Never import `src/net` statically.
- `Transport` (`transport.ts`): `send(msg, to?)`, `onMessage/onPeerJoin/onPeerLeave`. `trysteroTransport`
  (WebRTC, Nostr signalling, room `ss-<code>`) or `localTransport` (BroadcastChannel, `?net=local`, for tests).
- `protocol.ts`: every inbound message goes through `parseMessage` (shape, clamps, string sanitising, caps).
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
  host relays them (`gadget` msg / event, 1 s rate, <= 40 m) and runs `remoteEffect` on its guards. Mark &
  Execute on clients: a client takedown earns `RemotePlayer.execCharges` (<= 3); shots with `ex` open a 5 s /
  5-shot window that kills outright. Dual takedowns: two players finishing within `DUAL_WINDOW` 1.5 s ->
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
