# marlow-bays - state

B + M merged (4.38.0, PR #85). Slice R (rejoin, item 27, cloud): done, PR #92 open. Master 4.48.0 merged (2026-10-22):
protocol 27 on top of the jammer's 26 (both `restore` and the jammer's `back` events kept). On that head check passes
(2595 unit tests) and e2e-coop, e2e-menus and e2e-netmove pass (run on S's head, which carries it).
Slice S (server browser, item 28): done on `feature/server-browser` (from R's head, master 4.48.0 merged), PR #99 to
master. Its head passes check (2599 unit tests), e2e-coop (the browse steps and both rejoin blocks), e2e-menus and
e2e-netmove (cloud, software GL). Pending PC: one real-relay check on two machines, and the full e2e.
Track A (Course Ready Build), 2026-10-21 ~21:40:
- Merged: slice T #82 (4.35.0), T1a #83 (4.36.0), T2 #86 (4.39.0), item 23 key timing #87 (4.40.0), items 26 + 26b
  tuner on phones #89 (4.41.0; M21 exception for the tuner and Anim Studio only).
- Item 25 (add / delete keys) = PR Tekcry/Mobile-Coop#91, branch `feature/marlow-key-edit` (worktree
  `C:/NightShift/Mobile-Coop-key-edit`), head e79680b1 (master 4.41.0 merged). Sliders-only state (`del` per key,
  `key.<clip>.a0..a7` with `at`), `src/anim/tuneKeysEdit.ts` (`KEY_LIVE`); the bake regenerates `tuneKeysMeta.ts` on
  any key-file write (closes item 23's gap); keys-only tuneBake.ts lines marked "(item 25, track A)". Known: preview
  linear vs the Blender Bezier (BAKE.md). Check + e2e-studio pass; checker fixed; full e2e queued on the laptop.
- Next (orchestrator ~22:20, Michael chose): item 24 guard tuning moves to track A. Start after the 23:00 usage reset on
  `feature/guard-tune` from master: a guard target in the tuner and studio (a guard puppet in studioStage), guard rows
  keyed apart from Wren's (Joints, Weight, Stepping where guards use them), a guard base table the bake writes; a flag
  line in `src/ai/enemyRig.ts`; minimal named edits to `src/anim/animBase.ts` / `tuneJointsRig`; Wren rows never touch
  guards and guard rows never touch Wren; `tests/animSkeletonGuardIdentity.test.ts` green with no tuning. One checker,
  one fix round, own PR.
- Tell Menu Notes (track C) when 25 lands; keep the optional-channel path in key_clip.py / build.mjs.
- T1b is track B (CT Core), T3 track C (Menu Notes). Bays J after the animation tracks.
Open: none.

## Slices B + M (cloud session "Night Shift | Bays Cloud", 2026-10-21)
Branch `feature/marlow-bays` (master 4.35.0 merged). One PR for B + M. Cloud ran check and the logic e2e only; the GPU
look (item 6's grid, station 3) is pending PC run, as is the full e2e (the orchestrator runs it on the PCs).
Found and fixed:
- Item 1 (co-op hold slow / odd): on the joiner the held guard is an `EnemyPuppet`, which had no `setSolid`, so the
  takedown's `setSolid?.(false)` did nothing; the puppet's solid capsule 0.33 m in front kept shoving the joiner's
  character controller (eaten forward speed, sideways shoves, jitter). No double speed cap, no host correction. Fix:
  `EnemyPuppet.setSolid` (restored on release / deny), the partner's hostage non-solid there too (`remoteHeld`); on the
  host, the joiner's hostage is placed from the joiner's drawn (interpolated) pose, not its raw 20 Hz state (it ran
  0.1 s ahead in steps). Solo speeds untouched (`GRAB.speedCap`, `BODY.carrySpeed`). e2e-coop asserts the joiner's
  held guard is not solid.
- Item 2 (station 2 bolt): not the client path (that worked). Since 2026-10-20 the host's own presses pass `'local'`,
  and `CourseMode.idx` read anything but `undefined` as P2: the host's Unbolt was tested on the joiner's feet (refused
  until the joiner was over too: "worked with both players on that side") and the refusal banner went to the joiner.
  Fix: `courseUser()` (`courseDef.ts`). Also fixes the host's hold consoles, pickups and finish credit, and solo
  unbolt. The e2e helpers called `onUse(it)` with no `by`, which hid it; they now pass `'local'` like the game.
- Item 6: the flashing red surround was the frame-edge pulse while a camera sees a player; removed (grid only). The red
  lines on station 3's floor are the camera's +-30 deg sweep edges painted on the floor (course spec M2,
  `sweepLines` in `ctcourseBunker.ts`): a deliberate training mark, not debug, so kept. With the grid now showing
  coverage they are redundant: removing them is a one-line change if Michael wants (`ctcourse.ts`, the `sweepLines`
  call).
- Item 3: pause > Restart at checkpoint (Sector Ops solo and co-op, the co-op course): `GameMode.restartCheckpoint`, the
  everyone-down restart (section / bay), confirm opens on Stay.
- Item 4: pause > Return to lobby (co-op): the existing `backToLobby` (the client follows on the lobby broadcast). No
  protocol change (stays 25).
- A1: in co-op both are host only; the joiner's rows are blocked, "Host only", and keep Quit to menu.
Tests (cloud, software GL, 4 cores): `npm run check` passes. e2e-sectorops, e2e-ctcourse and e2e-netmove pass (with
`E2E_SUITE_TIMEOUT=2400`: at the default 600 s this VM is too slow for them). The new steps pass: e2e-ctcourse's pause
rows (host live, joiner "Host only") and host restart bringing the joiner back, the station 2 host unbolt with the real
`'local'` press; e2e-sectorops' pause restart; e2e-coop's "held guard not solid". Pre-existing on this VM, master
fails the same way: e2e-menus "holding right repeats and accelerates" (slider repeat timing), and e2e-coop stalls when
a match starts after a return to the lobby (a dialog over the joiner's lobby; master 4.35.0 at origin/master stalls at
the same step). So e2e-coop's new pause "Return to lobby" block (in its infiltration section) did not run here:
pending the PC full run.
Checkers: B no defects; M no blockers. Fix round: e2e-ctcourse restart step on a clear spot (8, 7) and the spawn
protection reset after it.
Polish list: the host's view of a joiner's hostage may flicker its gait slightly below 60 fps (`holdAt` velocity per
fixed step from a render-rate pose); a restart refused (already pending / op ending) closes the menu with no line.

## Slice R - rejoin a match (cloud session "Night Shift | Bays Cloud", 2026-10-21)
Built R1-R4 on the existing room (no server):
- Identity: a player id outlives its connection. The client's `hello` carries a per-tab, per-room rejoin token
  (`core/rejoin.ts`, `sessionStorage`); the host keeps a held slot (`PlayerInfo.away`) for `REJOIN_HOLD_S` (600 s)
  when a joiner drops mid-match, and a hello with its token (or, in a full room, the only held slot: a tab closed with
  its token) takes it back. The session aliases the new transport id to the held player id, so the game code never
  sees the change, and tells the client its id (`you`). In the lobby a leaver still leaves.
- Host (`coopHost` hold / unhold): the held body stays where it stood (no states arrive), takes no damage
  (`RemotePlayer.held`), is out of `remotePlayers()` (guards, course pass zones, everyone-down), and a HUD line names
  it with the code. On the rejoin the host sends `restore` (where it was held) every 0.5 s until the client stands
  there; health, down state and the team's state come back through the snapshots and the course wire as usual.
- Host drop (R3): the client session stays open (`hostId` cleared) and takes the next host that opens the room (its
  hello on that host's first lobby). The joiner's match stays up with "Host disconnected - waiting (CODE)"; a resumed
  host's start reloads it. "Resume hosting" (`resumeRoom`) reopens the room with the same mode, map, difficulty,
  mission and weather and starts at `GameMode.resumeBay` (course: the bay they were in). Assumed R5: Sector Ops
  resumes from its first section (no start-section option yet); undo by asking for a section start.
- R1: the pause menu shows "Room CODE"; the main menu entry "Rejoin <code>" / "Resume hosting <code>" (order after
  Sector Ops) is shown while the record is live (refreshed every 2 s while a match runs, kept on Leave, cleared when
  the match ends or returns to the lobby).
- Protocol 25 -> 27 (slice J holds 26; whichever merges second renumbers).
Tests: unit `tests/rejoin.test.ts` (wire, held slot and token, full-room fallback, stranger refused, hold expiry, lobby
leaver, stale connection, host drop and the next host, the record and token); e2e-coop: the joiner drops (held line,
out of the guards' list) and rejoins from the main menu as the same player where it stood with its 60 hp; the host
drops (the joiner waits on the code, no dialog) and resumes from the main menu with the joiner back; e2e-menus: the
Rejoin row.
Results (cloud, software GL, the head after master 4.42.0 merged): `npm run check` passes (2483 unit tests);
e2e-coop passes end to end (both rejoin blocks: the joiner drops and rejoins as the same player where it stood with
its health; the host drops, the joiner waits on the code, Resume hosting brings both back); e2e-netmove passes;
e2e-menus passed on the slice (the Rejoin row). The old e2e-coop lobby stall on small VMs was the test transport's 15 s
silent-peer limit (a "Host left" dialog while the other page loaded a map): now 60 s (`localTransport`, tests only).
Checker (fresh): 5 defects, all fixed in the fix round: the token went out in broadcast hellos (now to the host alone;
a live slot is never taken; a client refused as full ignores that room's lobbies); the restore clock started before a
slow joiner loaded (now held until its first state, then 30 s); a held partner counted as able to revive; a hold kept
the joiner's grabs and team moves (now let go / ended); a protocol test still read 25.
Notes (not done): the full-room fallback lets anyone with the code take the only held slot (by design, R2); the token
uses Math.random; a waiting joiner has no timeout; Sector Ops resumes from section 1 (R5).

## Slice S - server browser prototype (cloud, 2026-10-21)
Branch `feature/server-browser`, cut from slice R's head (its PR carries R until R merges). Item 28, prototype only.
- `net/roomDirectory.ts`: public rooms announce in one shared directory room on the same relays (Trystero / Nostr
  signalling, P2P data), not raw Nostr events: no signing code, no server. Assumed S1 (undo: ask for raw Nostr notes):
  the notice reaches browsers over the directory room's peer links, so a browser opening the list connects to the
  public hosts in it (fine at prototype scale).
- Host lobby: a Room row, Private (default) / Public (`CoopController.setPublic`); notice = code, map, mode, version
  (`LISTED_VERSION` = game version + protocol), players (held slots not counted), cap, host name; every 30 s, at once
  to an `ask` or a newcomer, `gone` when full, private or closed.
- Co-op > Browse rooms (`BrowseScreen`): live list (on each notice, plus a 5 s refresh for the 75 s expiry), other
  versions hidden, full rooms hidden, focus kept across refreshes; a pick joins by the code.
- Tests: unit `tests/roomDirectory.test.ts` (validation, listing, other version hidden, gone on full / private /
  close, refresh and expiry, on a fake relay); e2e-coop (local relay): a new room is Private, Public lists it in Browse
  rooms (1 / 2, code and map), full takes it off. Pending PC: one real-relay check on two machines.
- Checker (fresh): 5 defects, all fixed in the fix round: the Browse screen leaked a timer and kept its list open
  through a join (one timer now, the list closed on a pick); fast Public toggles made two posters (one open / close at
  a time now: Trystero shares one room per id); a lost `gone` left a closed room listed 75 s (a host leaving the
  directory now drops its rooms, and close waits a moment after the gone); any peer could remove or fake another's
  code (a code now belongs to its first poster); no cap on the list (50). Also: the Room row redrawn after a failed
  open. Not done: every public host and browser shares one full-mesh room (prototype scale only); the notice does not
  say a match is in progress.

## Done
- 2026-10-22: slice S (cloud): item 28 server browser prototype; own PR.
- 2026-10-21: slice R (cloud): item 27 rejoin; PR to master.
- 2026-10-21: slices B + M (cloud): items 1, 2, 3, 4, 6; PR to master.
- 2026-10-21: BRIEF.md (Michael's list after his co-op run to bay 3).

## Resume prompt
```
Night Shift | Course Ready Build. Read CLAUDE.md, docs/ROADMAP.md, then docs/marlow-bays/BRIEF.md and STATE.md on feature/marlow-bays (C:/NightShift/Mobile-Coop-marlow-bays). Resume at STATE "Next".
```
