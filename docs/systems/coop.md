# Co-op
Purpose: transports, the host and client sims, the wire protocol, co-op sync, team moves and the training course's
wire.
Design authority: docs/DECISIONS.md (G2, G48-G52), then docs/design-bible.md (Section 5.9).

The game is a 2-player co-op campaign (G2, G50): no bot partner (G48), no 3-4 player play, no player-versus-player
mode (G8, G9; Wave, deathmatch and free-for-all are deleted). Co-op is tested with two browser tabs, the two-page e2e
suites and the bunker's solo switch (G48). Every feature works in co-op; committed moves are host-approved; vision,
camera and rumble stay local; partners never pass through each other (loco D8, G52).

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
- `PROTOCOL_VERSION` 24 (24: the `sector` message extras, below). A `hello` with another version is ignored by the host. History: 11 = the training course and
  locomotion 10 together (G52); 12 = Wave, team deathmatch, free-for-all and PvP removed (`NetMode`, `team`, `ptd`,
  `frag`, snapshot `score` / `tl`, end `waves` / `winner`); 13 = emotes removed (`emote` message and event), then in the
  same version the custom difficulty (`dc`) and carried medkits (`PlayerState.mk`, MoveState `medkit`, `cmove` kind
  `medkit`, pickup kind `medkit`). Earlier steps: git log and docs/locomotion/LOG.md.
- Caps: `MAX_PLAYERS` 4 (room cap on the wire), `MAX_ENEMIES` 32, `MAX_EVENTS` 48, `MAX_ITEMS` 128, `MAX_DOORS` 256.
- `NetMode`: `sandbox | clear | infiltration | course`; `capacity(mode)`: `course` takes `COURSE_MAX` 2, the others
  `COOP_MAX` 4; it gates joins and `startMatch`. Decided, not built yet (G2, G50): two players in every mode (`COOP_MAX`
  2 and the lobby's "Co-op for 2-4" text).
- `lobby` / `start` carry the mode, map, `mission` (Infiltration), `weather`, the host's fixed difficulty level (shown
  read-only on the client) and `bay` (course start).
- `PlayerState.mv` (`player/moveState.ts`): mode index (`MOVE_MODES`, append only), anchor, sub bits, phase, takedown
  target, gear, raise, aim twist, ready, grips, commit, `dw` (draw phase 0-3). The `wall` mode carries `a` (cover
  segment), `s` (metres along it) and `sub` (WALL_SUB). Decided, not built yet (G52): the SWAT-turn MoveState (`swat`)
  and the lean-out field (`lk`) are removed from the wire when the CT prototype is built (M20 removed both moves).
- Door peek (locomotion step 13): MoveState `doorPeek`, client -> host `door {i, crack}` (reach 1.5 m, closed and
  unlocked doors only), snapshot `dcr` (cracked doors). Decided, not built yet (G97): the CT door menu (open, stealth
  open, bash, optic cable) replaces the crack peek.

## Session and sims
- `NetSession`: lobby state (each `PlayerInfo` carries name, tag, look and the validated weapon `loadout`), ready /
  start, routing. A new host room starts on Infiltration with the first listed mission (Hunter with `?legacy=1`).
  Clients accept authoritative messages (lobby / start / snap / ev / end) only from the host; the host accepts gameplay
  messages only from lobby members. No host migration.
- `GameOptions.net = { role, attach(g) }` -> `GameState.net: NetAttachment` (fixed / frame hooks, death, revive,
  pickups, blips, end). Client sessions set `GameState.puppet` (no AI or mode; health from snapshots; local
  `damageMul = 0`). Co-op never pauses the sim (the pause menu only takes input). A hidden page keeps simulating and
  sending (`net/bgTicks.ts`; the hidden-page tick, input-and-loop.md).
- Objective line (coop-fix, `net/objectiveMirror.ts`): the client shows "Connecting to host…" until the first
  snapshot, which always replaces it (an empty course-mode objective included), and "Waiting for host…" after 2 s
  without one, until the next. The host seeds its copy from the HUD when it hooks it (Free Roam sets it earlier).
- `CoopHost`: remote players (`RemotePlayer` = Damageable + hitbox + PlayerRef), 15 Hz snapshots, event queue, enemy
  position history for lag compensation, shot / blast checks via pure `validate.ts`, per-player kill tallies in `end`.
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
- Snapshots carry enemy `al` (alert level, +4 seized) and, when changed or every 2 s, `items` (usable interactables:
  objectives, switches, alarms, doors, revive points, wall medkit stations `medkitWall`; clients mirror them and send
  `use`, the host checks reach; course devices `c-` first so the cap never drops them) and `doors` (open indices).
- Wall medkit stations (G20, G98): a client's use asks the host, which heals the client's host-authoritative health
  (`CoopHost.healAtStation`); the station shows spent on both pages. Stations exist only on Proving Grounds today;
  placing one in every map is decided, not built yet (G98).
- Client takedowns: `GameState.takedownVictims` = puppets; `td start / done / abort` seizes the host enemy (denied ->
  `tdDenied`). The host hears clients (footsteps by `noiseRadius`, shots by `PF.firing`, `PF.quiet` = suppressed).
- Downed: `revive` interactables on bodies (`NetAttachment.onLocalDeath` / `onRespawn`); everyone down -> the mode.
- Bodies: the host lists lying bodies in `snap.bodies` when they change; clients keep those ragdolls and drop the rest.
- Pings (action `ping`: D-pad left tap, Z): `GameState.sendPing` (aim ray) -> `ping` msg / event (host rate 0.8 s) ->
  `ui/hud/pings.ts` (follows a pinged guard, edge arrows off screen).
- Gadgets: `GadgetSystem.onLocal` reports gas / flash / EMP / noise effects; the host relays them (`gadget`, 1 s rate,
  <= 40 m) and runs `remoteEffect` on its guards.
- Team moves: brace and boost, human ladder, dual takedown (two finishes within `DUAL_WINDOW` 1.5 s -> banner). These
  are the moves that exist; the other four of loco D8 wait for the co-op phase (G52).
- Partners block each other (training D49, A49, G52: every co-op mode): each page gives each partner a
  `PartnerBlocker` (`partnerBlocker.ts`), an upright capsule at their shown (interpolated) feet in `G.PARTNER` that only
  the local controller collides with. Host: `RemotePlayer.blocker`; client: per `RemoteAvatar`. Parked while the
  partner is down or in a boost / human ladder (`partnerPassable`); brace keeps it (reach 1.2 m). Course friendly fire's
  partner hit boxes (`PartnerTarget`, host `partnerBoxes`) are bullets only.
- Teleports: `SnapshotBuffer` holds the old spot and then shows the new one when two states are more than `SNAP_MIN`
  (2 m) apart and either faster than `SNAP_SPEED` (25 m/s) or, across a gap over `SNAP_GAP` (0.3 s), further than
  max(`SNAP_MIN`, sqrt(2) x |v| x gap) from where the velocity before the gap would carry the partner. The blocker parks
  for 3 frames when the shown feet jump more than 0.6 m between syncs.
- Graphics never change gameplay: each player keeps their own graphics settings and FOV (fog on every preset,
  `tests/losParity.test.ts`).
- Remote animation audit: `node scripts/anim-audit.mjs --remote` (testing-tools.md).

## Training course wire (`course`)
- `NetMode` `course`, `COURSE_MAX` 2 (host P1, client P2). The host runs `CourseMode` and sends `course` (host -> all;
  `CourseWire` in `game/course/courseWire.ts`) when it changes or every `COURSE_SEND`: the packed `CourseState`, locked
  door indices (`Doors.setLocked`), locked anchor ids, light state (`lights.groups`, `lights.dead`) and P2's last
  refusal (`ref` / `rn`). A door the host reports locked is shut on the client too; nothing on the client unlocks a
  course door by itself. Clients press and hold course devices through `use`.
- Drill ticks (`ctick`, client -> host `{ verb }`, `TickLimiter` 4 a second): `game/course/drillDetect.ts` is the one
  place course verbs are derived (edge-triggered); `CourseFeed` fills its snapshot each fixed step. The client sends
  only `CLIENT_VERBS` (gear, sprint, stance, vision, ping, aim, fire, reload, swap, dark, gadget); the host ticks what
  resolves on it (traversal from `pstate.mv`, a client's takedown, thrown gadget, door use, team moves; A23). The
  `sprint` verb goes with the sprint in the CT prototype (M20).
- The client mirrors the course (HUD, markers, toasts, results) and LANTERN's radio from `rl` / `rln`. The host sends a
  final `course` before `end`. `start` carries `bay` ("Start at bay N", D20); both players start in that bay's entry
  airlock (`courseStartPos`).
- Friendly fire in the course (D38, G49 pending the research): `playersHostile(friendlyFire, a, b)` (pure, `validate.ts`)
  makes partners hostile in course mode; host `Hitboxes` + `RemotePlayer.shootable`, client `PartnerTarget`, `blast`
  carry team damage; a partner at zero is downed and revivable.

## Sector Ops wire (`sector`)
- `NetMode` `sector`, two players. The host runs `SectorMode` and sends `sector` (host -> all) on a device change and
  every 0.5 s: `sec` (`SecWire`: camera clock, jams, charges, alarm stage) and (protocol 24) `ls` the live section (-1
  during a connector cycle), `lk` the locked door indices, `dn` the camera ids shot out, `sy` the revive syringes left.
  The client's `CtDevices` mirror runs `setLive(ls)` (other sections' cameras off, lasers dark, no jam targets), breaks
  or repairs cameras from `dn` and sets door locks from `lk`. The HUD line (section, alarm, syringes) comes with the
  snapshot's `info`. Objectives, markers and banners use the item and event mirror.
- Revives are the op's syringes (`CoopHost.reviveClock.cap = syringesFor(difficulty)`, `revivesLeft()`). `goOut`
  outside the course calls `GameMode.onPlayerOut` (Sector Ops restarts the section); `onRespawn` in Sector Ops also
  brings a partner still up to the checkpoint (`revive` event). Before a section unloads or restarts the mode calls
  `releaseHolds()`: every guard a client holds is released and the client gets `tdDenied` (its takedown or grab
  aborts); despawned guards leave the client by the snapshot's stale sweep (about 0.5 s).
