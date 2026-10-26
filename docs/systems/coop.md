# Co-op
Owner: Player Build (co-op player; Guard AI Build for coop4). Status: current.
Purpose: transports, the host and client sims, the wire protocol, co-op sync, team moves and the training course's
wire.
Design authority: docs/DECISIONS.md (G2, G48-G52, G180, G349), then docs/design-bible.md (Section 5.9).

Player counts per mode: campaign missions and Marlow Yard (Course mode) take exactly 2 players (G2, G50, G292); Sector
Ops takes 1 to 4 (G308, built by coop4 in PR #317, live when it ships with no off switch, G381; until it lands,
`capacity('sector')` on master is still 2). No bot
partner (G48), no player-versus-player mode (G8, G9; Wave, deathmatch and free-for-all are deleted). Co-op is tested
with two browser tabs (four for Sector Ops once coop4 lands), the two-page e2e suites and the bunker's solo switch (G48). Every feature works in co-op; committed moves are host-approved; vision,
camera and rumble stay local; partners never pass through each other (loco D8, G52). Small animation fields may go
over the wire so a partner looks exact on every screen (G400); remotes still pose from `MoveState`.

## Entry and transport (`src/net`)
- `main.ts` registers the Co-op menu entry and `?room=CODE` handling; both `import('./net/coopUi')`. `CoopApi`
  (startGame / goToMenu / profile) is how net talks back to the shell. Never import `src/net` statically.
- `Transport` (`transport.ts`): `send(msg, to?)`, `onMessage / onPeerJoin / onPeerLeave`. `trysteroTransport` (WebRTC,
  Nostr signalling, room `ss-<code>`) or `localTransport` (BroadcastChannel, `?net=local`, for tests and two tabs).
- Network conditions simulator (D11): `netSim.ts` (pure, seeded), used only by `localTransport` with
  `?net=local&netsim=typical` (`&netseed=N`): 40 ms one-way, +-20 ms jitter, 1% loss as retransmits (+100 ms), reliable
  and ordered like the shipped data channel. Presence (hi / ack / bye) is not delayed. `window.__netsim.stats`.
  Nothing outside `src/net` imports it (`tests/netSim.test.ts` greps). E2E use: testing-tools.md.

## Protocol (`protocol.ts`)
- Every inbound message goes through `parseMessage` (shape, clamps, string sanitising, caps); anything unknown is
  dropped. Add a message: type in `Msg`, case in `parseMessage`, a test in `tests/net.test.ts`.
- `PROTOCOL_VERSION` (`src/net/protocol.ts`, currently 46) is held on one line only; tests read the constant and never assert a number (`tests/protocolConst.test.ts` guards it). A wire change does not bump it: `scripts/merge-train.mjs build` bumps it once per train that carries a wire change. Versions so far: the train that carries joint-interrogation (G148): a `td` kind `bluff` (a partner's bluff on a guard another player holds; the field existed, but an older host would take it as a takedown and seize the guard); the train after 46 (sector-redesign LR16, #287: LR16a removes `start.lf` and the rejoin `lf` - one photometric light model, an old peer's `lf` parses and is dropped; LR16-5b swinging pendants: the `sway` event, host -> all, `{ id, t, a, h }`, a pendant kick on the shared clock applied verbatim by `LightRegistry.swayImpulse`, and a client's round past a pendant as a `shot` at `sw-<id>`); 43-46: see CHANGELOG; 42 (marlow-final + section-rating, train 32); 41 (guard-ai S9 + A126 on train 30: the `bark` event, `AL_CAUTION` 16 / `AL_HELMET` 32 / `AL_ARMOUR` 64 in enemy `al`, the `hitConfirm` kind `deflect`, the S21 carry `AL_CARRY` bits 7-8); 40 (pose-parity + coop-walk-fixes, one bump for the stack at train 30); was 37: the partner's rounds (coop-walk-fixes P7): `PlayerState.sc`, the player's rounds fired mod 256, so a remote plays each round once with its weapon's own (suppressed when `PF.quiet`) sound; the `PF.firing` 0.2 s window replayed one shot twice; also (P6) the team takedown on a partner's hostage is a `td` with kind `assist` (the field existed); 36: partner pose parity (pose-parity): `PF.aimLeft` 64 (the left-shoulder aim, every mode; the ground MoveState `sub` bit 128 is no longer written) and the MoveState `takedown` `sub` bit 1 (`TAKEDOWN_SUB_BLOW`: the blow is running; a choke / the lethal approach poses no arc); 39: guard-ai S9; 38: the host's lamp falloff (sector-redesign lightrev LR13): `start.lf` ('linear' | 'photometric'), which the client's match runs whatever its own setting (a 37 peer would ignore it and bake the other falloff: light parity); 35: the weapons crate (sector-redesign E9-crate): `NetItem` kind `crate` and the `crate` event (host -> all; `fill` false = rejoin re-send); 32-34 taken by open branches (guard-ai 32, marlow-final 33, section-rating 34); 31: Sector Ops light state (sector-redesign slice L): the `lamps` message (host -> all: switched-off and shot-out bitsets, `lampSync.ts`) and a client's lamp shot as a `shot` whose target is `lt-<light id>`; 30: taken by marlow-final (Menu Notes); 29: the lasers' jam point is their power panel (sector-fixes P): the `jam` claim and `sec.dv` name panel ids (`panel-*`), never laser ids (a 28 peer would jam a laser the other side does not know); 28: the `jam` claim carries the client's camera eye `e` (jammer-fixes: the host checks the jam's line of sight from it); 27: rejoin (marlow-bays R): `hello.tok`, `PlayerInfo.away`, the `you` message, the `restore` event; 26: the jammer's rules (marlow-jammer: `sec` carries per-camera clocks `ck`, each player's jam left `ch` and cooldown `cd`, and the jammed / recovering devices `dv`); 25: the guard torch bit `AL_TORCH` in the snapshot's enemy `al` (coop-torches); 24: the `sector` message's live section, door locks, shot cameras and syringes (sector-ops step 3); 23: Sector Ops (the `sector` mode and message); 22: the two-person rope (B7); 21: the paired scanners (course.sec sc); 20: the hang-down (B5); 19: the partner throw (B4); 18: ground MoveState.sub bit 128, the left-shoulder weapon (anim-cleanup); 17: the held jammer (B3). A `hello` with another version is ignored by the host. History: 11 = the training course and
  locomotion 10 together (G52); 12 = Wave, team deathmatch, free-for-all and PvP removed (`NetMode`, `team`, `ptd`,
  `frag`, snapshot `score` / `tl`, end `waves` / `winner`); 13 = emotes removed (`emote` message and event), then in the
  same version the custom difficulty (`dc`) and carried medkits (`PlayerState.mk`, MoveState `medkit`, `cmove` kind
  `medkit`, pickup kind `medkit`). Earlier steps: git log and docs/archive/locomotion/LOG.md. Next wire train: afp AF6 (#247), the partner's gait - `PlayerState.t` (the joiner's send clock, timed by the host through a `ClockSync`), `gph` (gait clock), `qs` / `hs` (the CT stop), `mo` / `mt` (motion state and its time), `ax` / `az` (acceleration); the partner renders 0.13 s (host) / 0.16 s (joiner) behind.
- Caps: `MAX_PLAYERS` 4 (room cap on the wire), `MAX_ENEMIES` 32, `MAX_EVENTS` 48, `MAX_ITEMS` 128, `MAX_DOORS` 256.
- `NetMode`: `sandbox | clear | infiltration | course | sector`; `capacity(mode)` gates joins and `startMatch`. On
  master `course` and `sector` take `COURSE_MAX` 2 and the legacy modes `COOP_MAX` 4. The rule: Marlow Yard and the
  campaign 2 (G2), Sector Ops up to 4 (G308; coop4, PR #317, adds `SECTOR_MAX` 4). Never cap Sector Ops at 2.
- `lobby` / `start` carry the mode, map, `mission` (Infiltration), `weather`, the host's fixed difficulty level (shown
  read-only on the client) and `bay` (course start). (`start.lf`, the host's lamp falloff, LR13, is gone since LR16a.)
- `PlayerState.mv` (`player/moveState.ts`): mode index (`MOVE_MODES`, append only), anchor, sub bits, phase, takedown
  target, gear, raise, aim twist, ready, grips, commit, `dw` (draw phase 0-3). The `wall` mode carries `a` (cover
  segment), `s` (metres along it) and `sub` (WALL_SUB). Decided, not built yet (G52): the SWAT-turn MoveState (`swat`)
  and the lean-out field (`lk`) are removed from the wire when the CT prototype is built (M20 removed both moves).
- Door peek (locomotion step 13): MoveState `doorPeek`, client -> host `door {i, crack}` (reach 1.5 m, closed and
  unlocked doors only), snapshot `dcr` (cracked doors). Decided, not built yet (G97): the CT door menu (open, stealth
  open, bash, optic cable) replaces the crack peek.
- Optic cable (ct-toolkit 3.2, optic-coop): MoveState mode `optic` (appended to `MOVE_MODES`): `sub` the kind
  (`OPTIC_SUBS`: 0 door, 1 hatch, 2 panel, 3 grille; a shaft top sends 3), `a` the door index (sub 0) or the level's
  optic gap index (`BuiltLevel.opticPoints`, wire bound `OPTIC_POINT_MAX` 256), `ph` the cable fed out 0..1
  (`OpticCore.extension`). `sanitizeMoveState` drops an unknown sub or an index out of range; the receive paths drop a
  door this level does not have (`dropBadDoorMove`, host) and a gap it does not have (`dropBadOpticMove`, host and
  client). The partner's copy (`remoteAvatar`) kneels from the crouch bit (`moveKneels`; a ceiling panel is fed
  standing), settles its feet (`poseFromMoveState`), puts its right hand on the feed point and draws the cable from
  the hand toward the tip as far as `ph` (`opticPlaceOf`, `opticCableEnd`: the same code as the owner's own cable,
  `world.ropes` slot `<remote>-optic`). The view at the tip is local, never sent. A ping from the view uses the
  existing ping: `sendPing` casts from `cam.gamePos`, which `OpticSystem.frameUpdate` sets to the tip, and the hit goes
  to the host (`ping` message) and to every player (`ping` event); the ping input (R3 / middle mouse, below) works
  from the view.
- OPEN TRAP (optic-coop M1, CHECK-M B1): the trap panel over an optic gap is collision (`Breakables`, `G.STATIC`:
  movement, shots, perception rays), so its open goes through the host like a door. A client's pick sends client ->
  host `panel {g}` (`g` the gap index, wire bound `OPTIC_POINT_MAX`; `NetAttachment.panelOpen`, client only) and
  opens nothing itself. The host checks it (`hostTrapKey`, `game/gapMenu.ts`: the gap exists, its `trap` names a panel
  still closed, the client alive with its feet within `GAP_MENU.reach` 1.6 m and the height band plus
  `GAP_HOST_SLACK` 0.5 m, no facing test), else drops it (a bad index, a far client, a trap already open), and opens it
  in its world (`breakables.open(key, 'unscrew')`). The host's own pick opens directly. The snapshot's `trp` lists the
  gaps whose trap is open (`openTrapGaps`), sent with `doors` (on a change, every `ITEMS_EVERY` and at a rejoin's
  resync), so a late joiner or a rejoin opens them from its first such snapshot; the client applies it with
  `applyOpenTraps` (idempotent; a gap the level lacks is skipped; a trap never closes). Single player opens locally as
  before. Duct grates and window glass still open on one page only (pre-existing, backlog).

## Session and sims
- `NetSession`: lobby state (each `PlayerInfo` carries name, tag, look and the validated weapon `loadout`), ready /
  start, routing. A new host room starts on Infiltration with the first listed mission (Hunter with `?legacy=1`).
  Clients accept authoritative messages (lobby / start / snap / ev / end) only from the host; the host accepts gameplay
  messages only from lobby members. No host migration.
- `GameOptions.net = { role, attach(g) }` -> `GameState.net: NetAttachment` (fixed / frame hooks, death, revive,
  pickups, end). Client sessions set `GameState.puppet` (no AI or mode; health from snapshots; local
  `damageMul = 0`). Co-op never pauses the sim (the pause menu only takes input). A hidden page keeps simulating and
  sending (`net/bgTicks.ts`; the hidden-page tick, input-and-loop.md).
- (marlow-bays items 3-4) The host's pause menu restarts at the checkpoint (`GameMode.restartCheckpoint`; the host's
  respawn runs `CoopHost.onRespawn`, which brings an alive partner back in Sector Ops and the course) and returns
  everyone to the lobby (`CoopController.backToLobby` -> `NetSession.backToLobby`, phase `lobby`; the client's lobby
  handler follows). The client's rows are disabled ("Host only"). No wire change.
- (server browser, prototype; `net/roomDirectory.ts`) Public rooms: one shared directory room (`DIRECTORY_ROOM`) on the
  same relays (Trystero; `?net=local`: BroadcastChannel). A public host's `DirectoryPoster` sends its notice to all every
  `NOTICE_EVERY_S`, to a newcomer or an `ask` at once, and `gone` when full, private or closed; `DirectoryBrowser`
  (Co-op > Browse rooms) keeps the notices of its own `LISTED_VERSION` (game version + protocol) for `NOTICE_TTL_S`.
  Not the co-op wire: no protocol change. Joining is by the code.
- (marlow-bays R, protocol 27) Rejoin: `NetSession` keeps a player id across connections (the hello's rejoin token from
  `core/rejoin.ts`; the host's `alias` / `route` maps; `you` tells the client its id). A joiner dropping mid-match is
  held (`PlayerInfo.away`, `RemotePlayer.held`, out of `remotePlayers()`) for `REJOIN_HOLD_S`; its rejoin gets a
  `restore` event (where it was held). A client whose host drops keeps the session (`hostId` null) and takes the next
  host of the room; `CoopController` keeps its match up ("waiting") and reloads it on that host's start. The main menu's
  "Rejoin" / "Resume hosting" entry (main.ts) reads the record without importing `src/net`.
- (coop-rejoin, Michael's 4.82.0 walk item 7) Host-decided (re)join spawn, no wire change. Whenever the running match
  goes to one client (`NetSession` emits `late`: a late join, a rejoin, a reconnect the host never saw drop), a course
  `start` carries the current bay (`NetSession.lateBay`, set by `CoopHost`: `resumeBay()`), so the client's match loads
  in that bay's entry airlock. The host then watches that client (`net/joinWatch.ts`, pure): on its first `pstate` it
  sends the mode state at once (`GameMode.resync`: the `course` / `sector` message; items, doors, lamps), and it places
  the client on its reload, which may come after states from its old match (a page left open while it waited for the
  host keeps sending until the `start` reaches it). The reload (`joinIsReload`) is a client with no state before, or a
  state that jumps `JOIN_SAME_M` 3 m or more from its previous accepted state into its start area (`startSlotPoints` at
  the bay its `start` carried, within `JOIN_START_M` 4 m) and not onto a restore the host sent it; no check runs while a
  `back` or a revive the host sent it is in flight, except on the watch's first state or the first after a load gap that
  began before that teleport went out (a restart during the load). The watch lasts 30 s from its last load gap (no state for 1 s) and ends once its placement's restore is met or
  the client drops again. The host places it with `joinSpawn`
  (`game/spawnSlots.ts`, pure): Course and Sector Ops, the current checkpoint (`GameMode.checkpointSpawns`) at the
  client's slot, when a player there can walk to the host (`canWalk`: a nav path that crosses no locked closed door
  leaf); else beside the host. Never the level start unless that is still the checkpoint. Other modes: where its slot
  was held, else beside the host. The spot goes as the existing `restore` event, repeated every 0.5 s until the client
  stands within 1 m (30 s at most); a checkpoint restart (`onRespawn`) stops that repeat. A client that kept its match
  up (it ignored the `start`) plays on where it is, even when it moved 3 m or more in a gap the host did not see,
  unless it now stands in its start area (then placed as on a reload: the checkpoint in Course and Sector Ops, the held
  spot or beside the host in other modes). A rejoin whose reloaded start lies within 3 m
  of its held spot (it dropped in the start area) is restored to the held spot, not the checkpoint slot.
- (coop-rejoin, walk item 4) Two spawn slots per spawn area, no wire change: slot 0 the host, slot 1 the partner
  (`CoopHost.slotOf` / `CoopClient.slot`: 1 + the place among the joiners). Map data may give slot 1 (`AirlockDef.spawns`
  `[slot 0, slot 1]`, validated: at most 2, inside the box by 0.3 m, 0.9 m apart; Sector Ops `SectorDef.start2`,
  `ConnectorDef.checkpoint2` -> `SectorRun.checkpoint2`; the course start: the map's first two `playerSpawns`). Without
  it, `slotSpawn` gives slot 1 the first free spot of `SPAWN.rings` (1.2, 1.7, 2.3, 0.9 m) x 8 directions (the slot's
  side first): clear of the level (`SightWorld.blocked`), on a floor, an open line from slot 0 at knee and chest height
  (no wall, closed door, prop, fence or glass between) and `SPAWN.minGap` 0.9 m from every other player on the storey
  (`game/spawnPlace.ts` builds the probe from the level; a last try without the floor and line checks runs only when no
  floor is found under the area's point: a physics world not yet up). The client takes its slot of the start area itself (`startSlotPoints`: course start or bay-N
  airlock, Sector Ops section 1, else the map spawns); `CoopHost.onRespawn` puts each partner on its slot of the
  checkpoint.
- (marlow-bays item 1) A held hostage is never solid to its holder: the client's `EnemyPuppet.setSolid` (the takedown's
  `setSolid?.(false)` was a no-op there, so the puppet's capsule shoved the client's controller: slow, jittery movement
  while holding) and the partner's hostage seen there (`remoteHeld`). The host places a client's hostage from that
  client's drawn (interpolated) pose, not its raw 20 Hz state. (hostage-gait) That pose moves once per render frame
  while the seized loop runs per fixed step, so the point goes through `holdFeed.ts` (velocity from distinct drawn
  poses over render time, predicted to each step's sim time via `HoldClock`, eased; a still frame stops it, a jump
  over 1 m snaps with no speed spike): `holdAt`'s speed, the hostage's gait, holds steady below 60 fps.
- (marlow-bays item 2) Course items: the host's own press passes `'local'` (`gameState.ts`); `courseUser` reads it as
  P1, a client's peer id as P2 (it read `'local'` as P2, so a host unbolting alone was tested on the client's feet).
- Objective and net-status lines (coop-fix, hud-guidance B3 / HG9, `net/objectiveMirror.ts`): the client shows
  "Connecting to host…" on the net-status line (`Hud.setNetStatus`) until the first snapshot, and "Waiting for host…"
  there after 2 s without one, until the next; the objective line only ever holds the host's objective (a snapshot's
  line clears the notice, an empty course-mode objective included). Every write goes through `CoopClient.showLine`.
  The host seeds its copy from the HUD when it hooks it (Free Roam sets it earlier).
- (hud-guidance B5, A9) Field Terminal > Notes: the host fills `GameState.notes` from its `intel` event (its own and a
  client's interrogations); a client adds every `feed` event's text (the same relay, plus Sector Ops keypad radio
  lines): no wire change.
- `CoopHost`: remote players (`RemotePlayer` = Damageable + split hit volumes from the sim body model, rig-pose-fix S1:
  `PlayerHitVolumes` on `playerBody(wireBodyIn(accepted state))`, the client's own model, headshots x1.3 and legs x0.75 as
  the local player's + PlayerRef), 15 Hz snapshots, event queue, enemy
  position history for lag compensation, shot / blast checks via pure `validate.ts`, per-player kill tallies in `end`.
  (rig-pose-fix S3, G7 / G20) One guard head for every judge: the history (`net/shotHistory.ts`, 20 Hz) keeps each
  guard's sim feet, crouch, sim head (`Enemy.simHead`: `guardHead` / `dogHead`) and the head the client is shown
  (`Enemy.wireHead`: `guardHead` on the inputs the wire carries, `wireHeadIn`); a client's head claim passes within
  `checkShot`'s head tolerance (0.7 x 1.1 m x scale, kept: interpolation, crouch ease, bob, head radius) of either rewound
  head, never `feet + 1.62 / 1.15`. The lean round an edge is not on the wire (up to ~1 m), hence the second head. The
  client's `EnemyPuppet` head volume is `guardHead` on the inputs it gives its rig (`net/puppetHead.ts`, no `headNode`
  read; the dog's `dogHead` at `DOG_MEAN_PHASE`): the same as the host's `wireHead` for the same state, 1.2 cm from the
  host's sim head at any gait phase.
  `CoopClient`: `EnemyPuppet`s + `RemoteAvatar`s interpolated with `SnapshotBuffer` / `ClockSync` (`interp.ts`), sends
  `pstate` at 20 Hz and hits as `shot`; rewards come from `clampEnd` + `coopSessionStats` of the host report.
- Drawn state (D8, A20 / A41): the host keeps `w` only if it is in the player's lobby `loadout` and forces `dw` 0 while
  the claimed mode has busy hands (attached except split / rappel / inverted pipe, takedown, brace / boost / stacked
  bottom) or the player is downed. `takeShot` refuses a client shot unless the host's `dw` is 2 (no hip fire) and the
  weapon is the held one or in the lobby loadout. A client treats an echoed `dw` 0 as a host force only when the host's
  busy-hands rule agrees on its own state, so latency never cancels a draw. Remotes stow within 0.6 s of a release.
- Committed moves (A5, D8): the client sends `cmove {kind, id, target}`; the host runs the pure `checkCommitted`
  (`game/committedMoves.ts`: `rate` 0.3 s, `dead`, `busy`, `far` (reach + 0.6 m lag slack), `noTarget`) and answers
  `cstart {kind, a, id, target, t0}` or `cdeny {a, id, kind, reason}`; damage before contact denies with `hit`. `CKINDS`
  is `['strike']` (the strike, takedowns.md); other kinds are reserved, not parsed. The client predicts the
  anticipation, aligns its phase to min(local, host-now - t0) on `cstart` (never forward, A44) and blends back in 0.12 s
  on `cdeny` or no reply in 0.4 s. Contact resolves only on the host.

## Co-op sync
- Guard torches (coop-torches, protocol 25): enemy `al` = alert level (bits 0-1) + `AL_SEIZED` 4 + `AL_TORCH` 8
  (`packAlert`), sent for every listed guard in every snapshot (no deltas), so a guard who drops out of the list and
  comes back is right from his first snapshot. Cost: 0 bytes for a guard without a torch, at most 1 for a lit one. The
  aim is not sent: the client places the light with the host's `placeTorch` (`world/torches.ts`) from the shown x, y,
  z, yaw and `st` 2 (crouched). `net/torchMirror.ts` (`CoopClient.torches`, each frame after the puppets) lights one of
  the client's own torch slots (`addTorchSlots`, the same `FLASHLIGHTS` 4 as the host) per guard whose
  `EnemyPuppet.torch` is set (the bit, alive, not stale: one missed snapshot switches it off), sets `reach` with the
  host's `beamReach` and switches off the rest. Test hooks: `Enemy.torchOverride` (host), `CoopClient.torches.slotOf(id)`.
- Guard-ai state (guard-ai S9, protocol 41 (39 before the train 30 merge, 38 before the train 29 merge, 37 before the train 28 merge, 32 before 4.75.0); the AI stays host-only):
  - `al` gains `AL_CAUTION` 16 (S4 / S14 caution), `AL_HELMET` 32 and `AL_ARMOUR` 64 (S12 / S13 gear), packed by
    `packAlert(level, seized, torch, cautious, helmet, armour, carry)` (`coopHost.alertCode`); the parser clamps `al`
    to 0-`AL_MAX`. (A126) Bits 7-8 (`AL_CARRY`) are the guard's S21 weapon carry (`WIRE_CARRY_*`: 0 drawn, 1 holstered,
    2 drawing, 3 holstering; the host's `Enemy.carry.phase` through `wireCarry`); `EnemyPuppet` follows it with
    `net/puppetCarry.ts` `PuppetCarry` (the clips on its own clock at the host's times) and poses the gun and rig through
    the host's `GuardGunCarry`, `RigPose.ready` / `swap` and `carryRaise`.
  - (guard-models G6n) Bits 9-15 (`AL_LOOK`, `packAlert`'s last argument, read with `alertLook`; `AL_MAX` is now
    65535) carry the guard's look seed `Enemy.look` (0-127, `ai/guardLook.ts`: set once at spawn from his
    spawn slot, so a section restart keeps every slot's look), which `EnemyPuppet.look` exposes for the guard figure.
    - Layout: `al` = level (bits 0-1, `level & 3`), `AL_SEIZED` 4, `AL_TORCH` 8, `AL_CAUTION` 16, `AL_HELMET` 32, `AL_ARMOUR` 64, `AL_CARRY`
      bits 7-8, then `AL_LOOK_SHIFT` 9 and `AL_LOOK` = 127 << 9 (the seed). `AL_MAX` is 65535 (the parser clamps to it).
      `packAlert`'s last parameter is `look` (default 0, so an older caller sends seed 0); `alertLook(al)` reads it. The
      doc comment lists the bits without a version number: the `PROTOCOL_VERSION` line is bumped by the train build.
    - Seed rule: `lookSeed(key, index) = (hash(key) + index * 79) & 127` (FNV-1a + murmur finaliser; the odd stride makes
      the slots of one key distinct up to 128). Sector Ops authored guards key on (map, section, slot index); response
      teams on (map, section, team index, member index); every other spawn on (map, authored point to 0.1 m), so Course
      squads keep their looks over a bay restart. It never reads `Enemy.num` or the spawn order, so a section restart or a
      reload gives the same slot the same seed on the host, and the client reads whatever the host packs.
    - The look bits are the guard's whole look: the client builds the same variant with `guardVariant(seed, kind, mapId)`
      (a pure function, so both peers agree) and the visible pieces with `applyGear` from the gear bits `AL_HELMET` /
      `AL_ARMOUR`. A helmet knocked off clears `AL_HELMET` on the host; the client hides the piece and drops its own
      helmet. No second message carries the look.
    - Bodies: `snap.bodies` carries enemy ids only, so no record carries a seed: a client's ragdoll is its own puppet's
      rig (it had the seed), a carried body is never mirrored, and the host reads `body.guard.look`.
- Guard intel (stealth-pays client intel; wire change, the train bumps `PROTOCOL_VERSION`): `EnemyState.in` is 1 while
  the host's guard has unspent interrogation intel (`hasInfo(e)`: Marlow course slots, Sector Ops slots, a revived guard
  through `inherit`), absent otherwise (0 bytes for most guards). `protocol.markIntel` writes it in `CoopHost`'s
  snapshot; the parser keeps it only when exactly 1. `EnemyPuppet.setIntel` offers INTERROGATE from the flag's rise
  (`info` = the course slot's lines from `infoAtSpawn` (`spawnInfo`), else `guardInfo.HOST_INFO`: no lines, the
  host's intel feed answers) and drops it when the host clears it, so a host or client interrogation, a rejoin and a
  revive show the same on both screens. A local spend is not undone while the flag is still set.
    - Tests: `tests/guardLook.test.ts` (round trip of every seed with every other bit, parser clamp, restart, team
      distinctness, a peer at `PROTOCOL_VERSION - 1` refused); `e2e-coop` (seed equal on both screens, same seed after a
      course bay restart, helmet bit drop on both; the visible-piece asserts with `E2E_GUARDMODELS=1`).
  - `bark` event: `{ id, b, n, u, r, t? }`. The host wraps `EnemyManager.onBark` / `onCameraLine`
    (`CoopHost.hookCombat`): a table line goes as `b` = its `BARK_EVENTS` index, `n` = `BarkVoice.lastLine`, `u` = the
    unit it names; a talking pair's line as `BARK_TEXT` 255 and the desk's camera line as `BARK_CAM` 254 with the text
    in `t` (sanitised, 120 chars). The client rebuilds the text (`barkLine`), shows it with `hud.barks.say` (over the
    puppet: `NetAttachment.barkAt`, read by `GameState.placeBark` when there is no `enemyMgr`), and emits `bark` for the
    radio chirp. Camera lines show as subtitles only on the client (no camera position there outside Sector Ops).
  - `EnemyPuppet` (`net/puppetGear.ts` pure): the enforcer's shield by kind and the helmet / armour placeholders by bit
    (`ai/gearParts.ts`, the host's builders); the helmet bit falling 1 -> 0 drops a helmet into the client's own
    `HelmetDrops` (the direction of our own round if it hit him within 1 s, else backwards from his facing; no drop
    when he jumped more than `PG_JUMP` 1.5 m between frames, a re-place). The weapon carry follows `wireGuardAim`
    (`ai/guardStance.ts`): aiming / cover 1, searching or investigating 0.7, cautious and calm low ready 0.4, else 0.2.
  - Deflects: the puppet predicts a deflect from the bits (head + helmet, body + armour, not a heavy or a sleep bolt;
    the enforcer's front shield blocks as on the host), so the client's own marker and ping come at once through
    `playerWeapons`. The host sends `hitConfirm` `deflect` for a client round a guard's gear stopped
    (`CoopHost.onShot`; `hitConfirmKind` for player hits); the client shows it only when it did not predict it
    (`DeflectLedger`, 1 s). Test hooks: `EnemyPuppet.gearShown` / `cautious`, `CoopClient.deflectConfirms`,
    `barksShown`, `helmetDrops`.
  - A guard's breaker relight (S15) needs nothing here: it is a registry change, so the `lamps` message (Sector Ops)
    and `course.lights` (Marlow Yard) carry it; the client's switch labels still do not follow it (as for a host press).
  - (guard-ai S23, A143-A145) The host's guards perceive both players: each think every live player of
    `GameState.playerRefsInto` (the host's own player 0, the partner 1) gets his own rays, light and sight rate; the target
    is the best seen when calm, the one he fights while he still sees him in combat (`ai/targetPick.ts`). A partner lit in
    front of a guard is seen while the host hides nearer. The host's awareness arcs read `Enemy.seesIndex(0)` (only guards
    that see the host's own player); the client still has no arcs. Host only: no wire or save change. e2e-coop block
    "every player seen (guard-ai S23)".
- Snapshots carry enemy `al` (alert level, +4 seized, +8 torch, (37) +16 cautious, +32 helmet, +64 armour) and, when changed or every 2 s, `items` (usable interactables:
  objectives, switches, alarms, doors, revive points, wall medkit stations `medkitWall`; clients mirror them and send
  `use`, the host checks reach; course devices `c-` first so the cap never drops them) and `doors` (open indices).
- Wall medkit stations (G20, G98): a client's use asks the host, which heals the client's host-authoritative health
  (`CoopHost.healAtStation`); the station shows spent on both pages. Stations exist only on Proving Grounds today;
  placing one in every map is decided, not built yet (G98).
- Client takedowns: `GameState.takedownVictims` = puppets; `td start / done / abort` seizes the host enemy (denied ->
  `tdDenied`). (coop-walk-fixes P6) The team takedown on a partner's hostage (Michael 4.72: "should trigger coop
  takedown"): `NetAttachment.partnerHolds` (host: a client's `seized` hostage whose MoveState still holds him; client:
  the puppet posed from a partner's `grab`, `EnemyPuppet.partnerHeld`) puts a held guard on offer (`TakedownController`,
  plan kind `assist`, row TEAM TAKEDOWN); it never seizes him (the holder keeps him). `assistTakedown`: the host's own
  applies at done; a client sends `td` with kind `assist` (start checked: the guard held as a hostage by another player
  (`net/assistTakedown.ts` `assistHolder`), in `TD_REACH`; done applied when still so). The host ends a client holder's
  `seized` entry (the host's own grab sees him down and ends), knocks him out (kill when held), and credits the holder and
  the striker: a dual takedown. No new field.
  (joint-interrogation, G148) The joint interrogation on a partner's hostage (CT: both question one captive; some intel
  only this way; `game/jointInterrogation.ts`): beside the hold, a guard with joint information (`GuardIntel.joint`)
  lists BLUFF above TEAM TAKEDOWN (`contextMenuStep`, row kind `joint`, only on the `assist` offer, so co-op only).
  `NetAttachment.jointBluff`: the host checks its own; a client sends `td` with kind `bluff` (ph `start`), which
  `onTakedown` branches to `onBluff` before the seize path. Checks: the bluffer alive, another player holds the guard as a
  hostage (`holderOf`, the assist rule), `hasJoint`, within `JOINT.reach` 3 m; else `tdDenied` (harmless on a
  partner-held puppet). Accepted: `CoopHost.bluffs` (bluffer id -> `{ eid, t0 }` host time) and the feed line "Bluff on.
  Read his face now." to both. The yield is checked only at the read's end: a client holder's read end below (`jointFor`
  before `takeInfo`), the host's own read end in `TakedownController.holdTalk` (`!g.puppet` and `net.jointLive`). A bluff
  counts when started at most `JOINT.window` 6 s before, by a player other than the holder, still alive within reach:
  `revealJoint` shows the joint lines on both pages (radio subtitle and feed; the `intel` event relays them) and sets the
  joint flag (`onIntelCode`); the bluff is spent and `joints` counts it. The two paths are exclusive (a guard is held by
  the host or by one client) and the bluff is deleted on use, so one read never pays twice. Stale bluffs drop at the next
  read check; nothing runs per step. A1: a solo read spends the joint part too. The host hears clients (footsteps by `noiseRadius`, shots by `PF.firing`, `PF.quiet` = suppressed).
  (guard-ai S14, A46 / A77) A client's quiet shot is heard at `SHOT_NOISE x min(weapon noise, 0.6)` as a solo shot is
  (9.8 m for the CT guns; was a fixed 14 m), a loud one at `SHOT_NOISE x weapon noise` through `EnemyManager.noise`, so
  a client's unsuppressed shot is radioed as "shots fired" like the host's (section caution, host-only, no wire change).
  (guard-ai S24, G139) Each player is his own intruder on the host (`EnemyManager.intruders`, slot by player id): his
  own last known position, the guards who saw or were told of him hunting it, his own squad-roles group; a shot locates
  its shooter (`noise(pos, reach, r.ref.id)`). The host's LKP ghost shows only the host's own slot; the client draws
  none (no wire change; a client ghost would read `lkpOf(slot)` and take a protocol bump).
  (guard-ai S26, G139) A client's body noises (footsteps, quiet shots, takedowns) are heard with his id
  (`hear(.., 'noise', null, r.ref.id)`): a searching or alerted guard who hears one locates the client's slot only and
  walks to it / turns his hunt to it; the host's slot never moves for it. Host only, no wire change.
- Downed: `revive` interactables on bodies (`NetAttachment.onLocalDeath` / `onRespawn`); everyone down -> the mode.
  The campaign and Marlow Yard share G126's rule (G349): a revive within `REVIVE_WINDOW` 30 s, at most
  `REVIVES_PER_MISSION` 2 (`game/reviveClock.ts`); a player past them is out (`CoopHost.goOut`): the course restarts
  the bay, Sector Ops the section (its syringes per difficulty, below).
- Bodies: the host lists lying bodies in `snap.bodies` when they change; clients keep those bodies (`Body`, coop-carry) and drop the rest.
  (rig-pose-fix S5, P13) The wire carries no body position: a client `Body` lies on the host's sim lie computed from
  the puppet's last host state (`buf.latest()` feet and yaw) and the fall away from the killer (`deathLieOn`), its
  ragdoll easing onto it (laid straight on it over the budget); a carry's put down lies along the carrier's side, head
  toward his back, as the host's (`BodyCarry`, `CarryView`).
  (rig-pose-fix S3) `deathLieOn` probes the floor under the settled pelvis on both machines (one down ray on the static
  collision): a guard killed at a ledge lip or mid-air lies on the floor below.
- (coop-carry, protocol: the train after master's number) Body carry for every player. The host's item mirror carries
  one item per body not hidden: kind `body` (appended to `ITEM_KINDS`), id `body-<Body.id>`, `e` the enemy id,
  `on` lying and nobody's, `by` the carrier's player id (the host's own from its lift; a client's from the host's
  accept); gone from the list = hidden. A client asks through `use`: `body-*` pick up (`bodyCarryNet.pickupDenied`:
  alive, not held, not carrying, no guard held, MoveState `ground`, the body present and nobody's, `BODY.reach` +
  0.75 m), `drop-body` (`DROP_BODY_ID`, sent at its put down's hand-over) and `hide-<i>` (carrying, in the spot's
  reach); the host never runs its own carry items for these. Accepted, the host lifts the body (`Body.beginHoist`:
  carried, so guards and cameras never find it) and shows it on the client's avatar (`net/carryView.ts`, on the
  shoulder at `CQ.liftRise`); put down, it ragdolls at the carrier's side with the 3 m drop noise; a carrier down,
  held for rejoin or gone drops it where he stood. The client carries with the host's own code: `StealthSystems`'
  carry moved to `game/bodyCarry.ts` (`BodyCarry`), the client's `net/clientCarry.ts` runs it on its own lying
  `Body` when the mirror names it (`CoopClient.carryMirror`, pure `carryChange`), and `GameState.carrier`
  (`stealth` or `net.carry`) gives both the speed cap, weapon stow, blocks, interact target (its map's hiding spots,
  a door faced, Drop body) and pose. A partner's carry shows on both pages through `RemoteAvatar.carryLoad` /
  `carrySide` / `carryKnees` (the bend, the carry lean, the hands on the knees). Save shape unchanged. Tests:
  `tests/coopCarry.test.ts`; e2e-coop "client carries a body".
- Pings (action `ping`: R3, which zooms instead while aiming a scoped weapon (`contextPing`); KBM middle mouse;
  `input/padBinds.ts`, `input/keyBindings.ts`): `GameState.sendPing` (aim ray) -> `ping` msg / event (host rate
  0.8 s) -> `ui/hud/pings.ts` (follows a pinged guard, edge arrows off screen).
- Gadgets: `GadgetSystem.onLocal` reports gas / flash / EMP / noise effects; the host relays them (`gadget`, 1 s rate,
  <= 40 m) and runs `remoteEffect` on its guards.
- Team moves (G180, CT's set, built): the leg-up (`boost`), the ledge relay (`ladder`; the wire names stay), the
  partner throw, the hang-down and the two-person rope (`TeamKind`, `game/teamMoves.ts`). G52's brace and dedicated
  dual takedown are gone (G180). CT's double takedown is two ordinary takedowns timed together: two finishes within
  `DUAL_WINDOW` 1.5 s (`game/dualTakedown.ts`) -> banner; counted in `StealthRating.duals` and the `dualTakedown` event
  for section-rating (spare 12), no extra knockout.
- (throw-ko) Partner throw onto a guard (CT: landing on a guard knocks him out): at a throw's `tstart` the host records
  the flight (`net/throwKo.ts`, `ThrowKo`: `throwArc` from the thrown player's feet as the host has them to the bounded
  landing, from the host's start time) and replays it each fixed step; descending feet within `TEAM.throwKoReach` m
  across of a guard and `throwKoLow`..`throwKoHigh` m over his feet (`teamMoves.throwKoHit`) knock him out through
  `Enemy.knockOut` (melee, `takedown: 'throw'`, the strike's noise), one guard per throw. Credit and the client's view
  ride the existing kill event and guard state sync: no wire change.
- (spare 9) Interrogation intel: the host / solo `intel` game event becomes `feed` events for every client (`hookHud`).
  A client's interrogation is seen on the host from its MoveState (`grab`, `sub` bit 2 seen, then the bit drops while
  the hold goes on: `interrogationEnded`; any progress counts, so a host frame gap over the read's tail no longer loses
  it; `interPh` resets at each td 'start' / 'done' / 'abort' and a kill, so an aborted read never counts): the host
  spends the guard's information and reveals the intel once (joint-interrogation: plus the joint lines when a
  partner's bluff is live, checked before the spend). A client interrogating from the
  hang-down (`boost`) gives only the guard's own lines (gap). No wire change. A client shows every `feed` event as the radio
  subtitle and as a feed line (the host's intel is in its feed).
- (anim-studio-2) Team-move animation tuning: the tuner's Co-op sections (`anim/moveTune.ts`, one per move: role A, role
  B, contact) apply to the LOCAL player's own role only (`GameState` writes `MOVE_TUNE_TEAM` from `TeamController`).
  `RemoteAvatar` never reads the live values: the partner plays the BASE table (pose-parity: `moveTuneSelectBase` with its role from the wire, `teamRowOfWire`, and its posed traversal; the Body root offsets and wall gap from its own applied base, `bodyRigRoot`), i.e. the shared defaults until an export is folded into the
  code. Nothing goes on the wire; visual only (the paths, timing and capsule are the game's). The Anim Studio plays both
  roles of each move on one clock with two local puppets (`anim/studioPairs.ts`).
- (anim-n4b, track A) Team-move poses (`anim/clips/team.ts`, `TeamPoser`, one per rig: the local player, each
  `RemoteAvatar`, the studio puppets): role B works the move on the brace clip (hands on the contact through
  `reachL / R`: cupped at knee height for the leg-up, at the waist for the throw, round A's shins for the hang-down,
  on the rope; trunk `bend`, pelvis up through a negative `bendDrop`, a visual root turn to the runner / step back),
  and the leg-up's climber puts its lead sole on B's hands (`plantR`) with the hips held low under the path, then
  drives up off them (a visual root offset, gone by the end). No wire change: on each page the LOCAL player's team
  clock drives both bodies (`TEAM_LINK`, written by GameState; the partner's avatar reads it when the partner is ours:
  `MoveState.tid` / mode / sub / `s` / `ph` as before); an unlinked holder plays the offer pose. The rope line starts in
  the holder's hands (`ropeGripWorld`).
- (hang-down) The hanging player's actions (`TeamController.hangActs`: hanging settled, no end asked). No wire change: the
  hanger's MoveState stays the team mode (`boost` + `HANG_SUB`). Its takedowns (the grab, the neck snap; rules in
  `docs/systems/takedowns.md`) go to the host as any client takedown (`td`); the host keeps a guard a hanging client
  seized (no `TD_MAX` let-go) and holds him lifted under that client's head (`net/hangHold.ts` `hangHoldStep`, the
  client's own `hangHoldPoint`, eased in; not solid), until the client's `td` done (the host's view shows no knockout
  lowering: the guard drops at the finish). The pistol: `hostHandsFree` lets `boost` + `HANG_SUB` (not the rope) hold
  it drawn, and a hanging client's shot may start `SHOT_UNDER_HANG` 2.2 m under its turned-over root (`checkShot`'s
  `under`; 1 m otherwise). The holder's pull-up or drop ends the hang; a guard still held is knocked out there (A4).
- (team-climb) The rope top-out (CLIMB_UP_TEAM, `TEAM.ropeTop` 1.1 s, was 0.9): the climber is pulled in to 0.22 m off
  the face over the rope's last 0.6 m by height (`ropeClimbPull`, the slide undoes it), then `ropeTopPath` rises
  (quintic, the climb's speed carried in) and moves in (quintic from k 0.325): the root's per-frame velocity change
  stays under 0.5 cm (was 5.7 cm at the rise's stop). The lip is found once per climb (`findRopeLip`); the hands start
  for it on the rope's last 0.2 m (weight at most 0.4 into the top-out, so the team clip plays, not `ledgeClimb`),
  hold it as lip ("hook") grips while the body rises past and lift off as the arms run out (`liftOff`, the rig's
  `liftOffTarget`). The partner's avatar does the same with no wire change: its own lip search from the shown feet,
  the top-out from the feet past the rope's top and the wire phase (`ropeSeenStep`).
- (coop-kit A1, R34) The rope descent: with the `descent` id in `flags.kitMoves` (`?kitmoves=descent`; every built id on
  /preview/, none live) a partner standing beside the holder (its floor within 0.4 m, `TEAM.ropeReach` 2.0 m across)
  is offered "Co-op: rappel down the rope" and asks for the same `tmove` `rope` at the same rope point; the host tells
  the two apart by height (`ropeFromTop`) and accepts the top only when its own `kitMoves` has `descent`. Same `tstart`,
  same pair, same ends. The climber goes over the edge (`ropeOver`, `TEAM.ropeOver` 1.3 s: the top-out's path backwards,
  `ropeOverPath`; placeholder pose `climbUp` with `traverseT` 1 -> 0, A2 animates it), then `ropeClimb` down to the
  floor found by a ray under the rope point; at the floor the stick held down steps off (`ropeStepOff`, end `drop`:
  the holder is freed by the `tend`). Back up the rope once `ROPE_DESCENT_ARM` 0.3 m down tops out to where it stood;
  either letting go slides to the floor as before. Its MoveState is `boost` + `ROPE_SUB` with `s` 1 while it came
  from the top (`wireS`): no wire shape change. Off, the climb from the foot is unchanged. `flags.coopKit` (Campaign's
  pull-up and shutter gate) stays a writable field; it loads true when `kitMoves` holds `pull` or `shutter`
  (`?coopkit=1` / `0` add / remove both).
- Partners block each other (training D49, A49, G52: every co-op mode): each page gives each partner a
  `PartnerBlocker` (`partnerBlocker.ts`), an upright capsule at their shown (interpolated) feet in `G.PARTNER` that only
  the local controller collides with. Host: `RemotePlayer.blocker`; client: per `RemoteAvatar`. Parked while the
  partner is down or in a boost / human ladder (`partnerPassable`); brace keeps it (reach 1.2 m). Course friendly fire's
  partner hit boxes (`PartnerTarget`, host `partnerBoxes`) are bullets only; (rig-pose-fix S1, G11 / G12) they sit on the
  sim body model of the drawn copy's state (`RemoteAvatar.bodyIn`), not on its rig.
- Teleports: `SnapshotBuffer` holds the old spot and then shows the new one when two states are more than `SNAP_MIN`
  (2 m) apart and either faster than `SNAP_SPEED` (25 m/s) or, across a gap over `SNAP_GAP` (0.3 s), further than
  max(`SNAP_MIN`, sqrt(2) x |v| x gap) from where the velocity before the gap would carry the partner. The blocker parks
  for 3 frames when the shown feet jump more than 0.6 m between syncs.
- Graphics never change gameplay: each player keeps their own graphics settings and FOV (fog on every preset).
- Remote animation audit: `node scripts/anim-audit.mjs --remote` (testing-tools.md).

## Training course wire (`course`)
- `NetMode` `course`, `COURSE_MAX` 2 (host P1, client P2). The host runs `CourseMode` and sends `course` (host -> all;
  `CourseWire` in `game/course/courseWire.ts`) when it changes or every `COURSE_SEND`: the packed `CourseState`, locked
  door indices (`Doors.setLocked`), locked anchor ids, light state (`lights.groups`, `lights.dead`) and P2's last
  refusal (`ref` / `rn`). A door the host reports locked is shut on the client too; nothing on the client unlocks a
  course door by itself. Clients press and hold course devices through `use`.
- (coop-real F1b, S2) Lamp shots: a client's round through a lamp goes to the host as Sector Ops' `shot` at `lt-<id>`
  (the same host checks, `onLampShot`; a repeat round at a lamp the host already has out is dropped with no
  violation), and `lights.dead` includes it from the next `course` message (no `lamps` message in Course mode). (F1a)
  The client plays the sparks cue for a newly dead lamp, and none on the first message after a join or rejoin.
  (coop-real F1c) A lamp round fired before the last set or section restart (`rt + CLIENT_INTERP_DELAY` earlier than
  the restart's host time + `LAMP_RESTART_SLACK` 0.2 s; `lampShotStale`) is dropped with no violation, so a round in
  flight across a restart never puts out a lamp the restart brought back (Sector Ops alike).
- Drill ticks (`ctick`, client -> host `{ verb }`, `TickLimiter` 4 a second): `game/course/drillDetect.ts` is the one
  place course verbs are derived (edge-triggered); `CourseFeed` fills its snapshot each fixed step. The client sends
  only `CLIENT_VERBS` (gear, sprint, stance, vision, ping, aim, fire, reload, swap, dark, gadget); the host ticks what
  resolves on it (traversal from `pstate.mv`, a client's takedown, thrown gadget, door use, team moves; A23). The
  `sprint` verb goes with the sprint in the CT prototype (M20).
- The client mirrors the course (HUD, markers, toasts, results) and LANTERN's radio from `rl` / `rln`. The host sends a
  final `course` before `end`. (protocol 42) The per-player bay stats gain `synced` (whole 0-1e4, missing 0; synced
  takedowns, section-rating) and the message gains `rt`, the last rated Marlow set (S6: the sector `rt` shape, `sec` its
  bay index; the finish's rating has its grant zeroed). The client mirror takes each new bay once: the results line, its
  own gadget top-up and the card (not for the last set); the first message after a join or rejoin only records it. `start` carries `bay` ("Start at bay N", D20); both players start in that bay's entry
  airlock, each on its own slot (coop-rejoin: `courseSlotPoints` / `startSlotPoints`).
- Friendly fire (G141: a host option, on by default; built so far as always on in Course mode, no option yet): `playersHostile(friendlyFire, a, b)` (pure, `validate.ts`)
  makes partners hostile in course mode; host `Hitboxes` + `RemotePlayer.shootable`, client `PartnerTarget`, `blast`
  carry team damage; a partner at zero is downed and revivable.
- The CT devices (`game/ctDevices.ts`) ride `course` as `sec` (see Sector Ops below). The client sends its jam intent as
  `jam` (a target id, a heartbeat every 0.25 s while held); the host steps every player's jammer (5 s use, 5 s cooldown,
  the stand-still rule) and every device's timeline (`DevJam`: jammed, then the 1.5 s reboot or a light's 4 s off and
  flicker back) and sends them in `sec`; the client takes the phases and times and runs them on between messages
  (`advanceDevJam`), so it draws the frozen camera, its flashing LED, the hidden grid, the buzz and the light flicker
  from host state (marlow-jammer). The client only moves a device's timeline forward (`mirrorDevJam`: a late host
  reboot it already ran down is dropped). The host checks a client's jam target with the static line of sight (0.4 m
  slack) from the same point the client aimed from: (jammer-fixes, protocol 28) a claim carries the client's camera eye
  `e` ([x, y, z], cm, clamped to the world; a release has none). The host takes it only within `JAMMER.eyeTol` 1.5 m of
  the client's head with a clear static head-to-eye line (0.1 m slack; no eye through a wall), else checks from the head
  (`jammer.ts` `jamOrigin`). The course message's light groups carry each group's base state (`groupBaseOn`): a jam never
  switches a group off on the client.
- (sector-fixes S) A security console's "cameras off" rides the course flags: the host decides (its guard `Enemy` is
  down, `CourseMode.press`) and sets the flag; the client's `CtDevices` reads it through `has` from the packed
  `CourseState` and switches every camera with that `offFlag` off itself. No wire change (protocol stays 28).
- (marlow-jammer fix round 1) The corridor send-back (`PassZone.hall`, `hallStep`, Marlow Yard A3, was station 3): the
  host moves its own player, and a client with the `back` event (`{ e: 'back', player, x, y, z, yaw }`, protocol 26):
  the host's copy moves at once (`RemotePlayer.moveTo`, a teleport allowed), the client teleports itself facing `yaw`,
  alive with its health kept.

## Marlow Yard co-op items (marlow-final, N1-N9)
Marlow Yard is eight sets A1-A8 (Course mode, map `ctcourse`); the sets are in `docs/marlow-final/SPEC.md` section 9, the
engine items below in its section 14 (build reports: `docs/marlow-final/slices/S0-*.md`). Almost all of it rides the
existing `course` message: the host decides, the client mirrors. The only wire changes are N6 and the client's hold
pulse (N4), both in `PROTOCOL_VERSION` 30 (now inside 33; see the Protocol section). A press from a client goes through
`use` and the host takes it only within the item's reach + 0.75 m (`inUseReach`, `src/net/holdPulse.ts`): a switch or
cabinet has reach 1.3 m, so a client far from it is dropped silently (one `violations` count). e2e steps move the
client next to a device first.
- **N1 objective steps with A / B lines.** `CourseObjective { id, bay, text, a?, b?, done?, timer? }` in
  `game/course/courseDef.ts`. `done` is a `StepCond` (`{ flag, who? }`, `{ gate }`, `{ all }`, an array = any). The host
  latches a step when its condition first holds by setting the course flag `obj:<id>` (rides `PackedCourse.flags`, cleared
  by the bay restart), so a step stays done when a timed window later clears. The HUD (`ui/hud/courseHud.ts`) shows the
  steps with `done` as table rows (shared line, ticked for both players) and, in the step line, this player's A or B line
  plus "- Lights back in 9 s" while the step's `timer` gate runs. A `stepDone` event speaks the radio line for the step id.
  No wire shape change. Panels (explainer pads) are not placed (M4).
  - **Role claim.** `BayDef.roles: RoleClaim[]` (`{ role, press?, zone? }`): the first player to press a claim device or
    stand in a claim zone takes that job until the bay restarts. The claim is the course flag `role:<bay>:A=P1|P2`
    (packed flags); drills' `lead` / `second` follow it. Without a claim the swap rule `leadOf` decides.
  - **One-player pass zone.** `PassZone.any` (`game/passZones.ts`): one player is enough ("B past x"); floor, alive, the
    hall rule and the restart re-arm still apply. Drills tick from a flag too: verb `flag:<flag>` (`@1` / `@2` for one
    player).
- **N2 timed light isolator.** Gate kind `isolator { id, switchIds, group, seconds, rearm? }`. Any cabinet starts the
  window (two-way); presses while dark do nothing; for `rearm` s after it the press is refused ("The isolator is
  re-arming"). Gate open = circuit isolated; `gates[].t` = seconds left, `tb` = re-arm end. Course mode turns the group off
  through `StealthSystems.isolate` (registry, wall switches, the `lightSwitch` event and the lights-out lure at the cabinet
  pressed) and back on at the end; a `mains` gate on the same group opens with it (A8's grille). Group state reaches the
  client through `lights.groups`, for groups listed in the layout's `groups`. `resetLights` now restores every shot-out
  lamp and every group to its course-start state on a restart. A radio line `warn:<gate id>` speaks at 5 s left
  (`TIMED_WARN`). Used by A2 (15 s) and A8 (25 s).
- **N3 timed security console.** `SecurityConsole.seconds? / rearm?`: the console's shared pickup gate becomes a timed
  loop. The flag is set for `seconds`, then `CourseState.clearFlag` clears it (event `flagCleared`); while set, every
  camera with that `offFlag` runs in `looped` mode (blind, LED and view fade; `ctDevices` reads `consoleCamMode()`), and on
  the clear they come back on both machines. A press during `rearm` is refused (`CONSOLE_REARM`). The loop's seconds ride
  the pickup gate's `t`. No wire change: the flag rides `PackedCourse.flags`, the client's `CtDevices` reads it. Used by
  A4 and A8 (60 s loop, 20 s re-arm).
- **N4 hold device.** `CourseDevice.hold? / holdNoise?`: the item carries the hold time and noise radius; a completed hold
  is the press. A guard hears the hold: the host's own hold calls `enemyMgr.hear` at the item at its first moment and every
  `HOLD_NOISE_PULSE` (0.5 s). A client has no `EnemyManager`, so its mirrored item carries the radius as `NetItem.hn`
  (host -> client, only for a noisy hold) and the client sends `use` with `pulse: true` at the same rhythm
  (`HoldPulseWatch`, `coopClient.fixedUpdate`). The host takes a pulse only from a live sender at an enabled, unfinished
  noisy hold inside the use reach, at least 0.3 s after that client's last one (`hostHoldPulse`); a failed pulse is dropped
  without a violation. Used by A6's drive panel (3 s hold). Protocol 30.
- **N5 timed lock gate.** Not built. A8's grille is a `mains` gate on the isolated circuit, which is the timed lock.
- **N6 several scanner pairs.** `CtDevices` builds every `layout.scanners` entry (`scans[]`; `scan` is the first pair).
  `SecWire.sc` is `number[][]`, one entry per pair in the map's order: `[phase A, phase B, occupied bits, progress A,
  progress B]` (tenths of a second; `packScan` / `unpackScan`, `game/scanners.ts`; at most 8 pairs, a non-array entry reads
  as idle). The ready and state glow sits 0.1 m behind the device along its yaw, and `atPanel` reads the player's feet
  against the device's own `y` (a time lock on a raised floor works). Used by A7 (`sc-a7`) and A8 (`sc-a8`). Protocol 30
  (a 29 peer sent one flat entry).
- **N7 live course guards.** Data only: squad slots without `passive` and with a `route`. Course mode runs guards with
  `em.stealth = true` (`courseGuardRules`: shout and call-in, shared last known position, search, cooldown), and
  `spawnSquad` despawns the old squad on a restart. `StealthSystems.occupied` counts every remote player (Q9: a guard does
  not shut a door on the partner).
- **N8 free bay layout.** `registerCourse(mapId, def)` (`courseDef.ts`) keeps a course registry; "Start at" in the lobby
  reads `registeredBayCount(map)` instead of a fixed 9. The map calls it at module load.
- **N9 sliding doors.** `Door.leaf: 'slide'`: the door menu offers Open only (no stealth open, bash, optic), a committed
  open uses the door's own use at once, crack and peek are refused (`isSlideDoor`, `world/doorPeek.ts`). The leaves slide
  on the same `DoorState`, so `open`, `target` and locks sync as before. No wire change.
- **N10-N14.** Covered by kit or data, or not built: N10 glass (an invisible collide box, stops bodies, bullets and sight,
  passes baked light), N11 glows on a circuit `group`, N12 every lamp in a group (a unit test), N13 zone advance (not built;
  the holding rooms are the airlocks), N14 instructor figures (not built; the gallery shows empty chairs).
- **Parity checks the e2e makes.** Light levels read the same on both pages (a cut circuit dark on both), a locked door is
  locked on both, scanner and gate timers match within a second, the camera `looped` mode shows on the client. Controller
  detail the e2e found: a kinematic move or a teleport leaves the character controller's support stale for one step
  (`staleSupport`, `src/player/playerController.ts`), so a hang-drop can read grounded one step too long.

## Sector Ops wire (`sector`)
- (sector-redesign slice L, protocol 31) Light state: the host sends `lamps` (host -> all; `net/lampSync.ts`) on a
  change, a join / rejoin, a section restart and every `LAMP_KEEPALIVE` 2 s: `n` lights by registry id, `of` the ones
  their switches have off, `sh` the ones shot out (6-bit bitsets, about 23 characters each for 133 lamps). Flashlights
  are left out (torch mirror). The jam is not in it: its timeline rides `sec.dv` as before and the registry keeps the
  base under a jam, so `lamps` carries the base (`baseOn`) and both pages end a jam on it. The client applies it with
  `resetTo` / `kill` (`LampMirror`), so its picture, meter and guard-torch reads use the host's lamps; a newly shot lamp
  sparks there. A client's round through a lamp goes to the host as a `shot` at `lt-<id>` (draw, weapon, 4 a second,
  origin at the shooter, the lamp first on the ray in the host's registry, a clear static line; `lampShotOk`), which
  shoots it out as its own round would (`StealthSystems.shootLight`). (rig-pose-fix S7) The origin may be up to
  `LAMP_SHOT_ORIGIN` 2.1 m (was 2) from feet + 1.2, so an inverted-hang claim (up to 2.013 m) is taken. Switches are items (`use`) as before. Change
  detection reads the registry only when its `version` moved (no allocation unless it sends). Course mode: see `course`.
- `NetMode` `sector`, 1 to 4 players (G308; 2 on master until coop4, PR #317, lands). The host runs `SectorMode` and sends `sector` (host -> all) on a device change and
  every 0.5 s: `sec` (`SecWire`: (26) each camera's clock, jams, each player's jam left `ch` and cooldown `cd`, the
  jammed / recovering devices `dv`, alarm stage; the same field rides the course message) and (protocol 24) `ls` the live section (-1
  during a connector cycle), `lk` the locked door indices, `dn` the camera ids shot out, `sy` the revive syringes left.
  The client's `CtDevices` mirror runs `setLive(ls)` (other sections' cameras off, lasers dark, no jam targets), breaks
  or repairs cameras from `dn` and sets door locks from `lk`. The HUD line (section, alarm, syringes) comes with the
  snapshot's `info`. Objectives, the exit item and banners use the item and event mirror (no markers: G339).
- (section-rating, protocol 42) `rt` the last section rating `{ sec, marks, synced, gadget, syringe, medkit, alarmStep }`
  (`SectorRatingWire`; `sec` -1 none yet, `marks` 0-15, the rest whole 0-99; junk drops `rt` only). The host rates a
  section as its connector unloads it (the extraction rates the last one, sent at once, its grant fields zeroed) and
  grants the next section as it begins; syringes through `CoopHost.addSyringes(n)` (`reviveClock.cap += n`). The client
  takes each new `sec` once (`CoopClient.takeRating`): the card (`onRating`, not for the last section), the results list
  (`GameState.sectionRatings`) and the gadget part on its own kit (`GadgetSystem.topUp`). The first `sector` after a
  (re)join only records `rt.sec` as applied (no card, no top-up). `ratingViewFromWire` (`validate.ts`) names the section.
- (sector-fixes-r RT) Team doors, no wire change: a section's `bolts` (`SectorDef.bolts`: door centre `at`, unbolting
  `side`) are locked at the start and each gets an "Unbolt" item `c-sbolt-<section>-<k>` (kind `door`, reach 1.6 m;
  the `c-` prefix sorts it with the course devices ahead of the item cap). `Interactable.side` makes `nearest` offer it
  only with the feet past the door plane on `side` (the course F7 test); the client mirror sets the same `side` from its
  own map data (`boltById`), so the near side sees no item. A client's use is the ordinary `use` request; the host's
  `onUse` runs the side test again on the client's feet (`SectorBolts.use`), unlocks the door (it leaves `lk`) and turns
  the item off (the item list's `on`). A section restart bolts its doors again (`SectorBolts.rebolt`).
- Revives are the op's syringes (`CoopHost.reviveClock.cap = syringesFor(difficulty)`, `revivesLeft()`). `goOut`
  outside the course calls `GameMode.onPlayerOut` (Sector Ops restarts the section); `onRespawn` in Sector Ops also
  brings a partner still up to the checkpoint (`revive` event). Before a section unloads or restarts the mode calls
  `releaseHolds()`: every guard a client holds is released and the client gets `tdDenied` (its takedown or grab
  aborts); despawned guards leave the client by the snapshot's stale sweep (about 0.5 s).
- (course-restart-hold) The course does the same before its squad respawns (a bay start or restart, the pause menu's
  restart at the checkpoint): the host's own takedown resets and `releaseHolds()` runs. On the client a puppet the stale
  sweep disposes is `dead` (its takedown aborts first), and `TakedownController.frameUpdate` skips a victim no longer alive.
