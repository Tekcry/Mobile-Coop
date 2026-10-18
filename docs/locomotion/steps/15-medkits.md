# Step 15 - medkits (Block C)

CT health model: health 100, medkits heal 40 over 1.5 s, damage interrupts, carry 2 (3 at Rookie), a wall medkit
entity on test maps, a HUD health bar; counts host-authoritative; MoveState `medkit`; hook H2 (any target).
Deps: 03 (and 10 for `cmove`). Model: implementer opus; checker opus (src/net). (all subagents opus from step 06, Michael 2026-10-13)
Assumes Block A step 03 (`Health(100)`, no shield, `sh` gone, HUD shield bar gone) and steps 09-13 (PROTOCOL_VERSION 8,
MOVE_MODES up to `doorPeek` 27, `cmove` with `CKind = 'strike' | 'medkit'`). Line numbers verified 2026-10-13 before
Block A: grep the named symbol first.

## Read
- docs/design-bible.md 964-992 (5.13), 694-698 (C14 medkit on a team-mate); PLAN.md H2
- src/game/health.ts (all, 54 lines; after step 03); src/game/playerTarget.ts 30-60
- src/game/pickups.ts 1-60 (`PickupKind` :4, `'health'` :38); src/game/interactables.ts 20-40, 110-130
- src/game/gameState.ts: grep `pickedUp` (~696-704, `heal(50)`), `onPickup`; src/net/coopHost.ts 1080-1095
  (`onPickup` :1084, `heal(50)` :1087), 785-835 (own state, snapshot), 430-470 (dispatch)
- src/game/committedMoves.ts and src/game/elbowStrike.ts (step 10); src/net/protocol.ts PlayerState and `cmove`
- src/ui/hud/hud.ts 100-110 (bars), 185-235 (`setAccess`, `healthBar` :186-199, fills :223-229)
- src/core/settings.ts 150-160, 265-270 (`access.healthBar` default false :269)
- src/ai/archetypes.ts 150-175 (`DifficultyDef`, `DIFFICULTY`); src/world/maps/provingGrounds.ts 195-215 (pickups)
- src/input/gamepadMapping.ts 58-100 (GAME_BINDINGS, `TapHold`); src/input/keyBindings.ts 9-70

## Task
1. Pure src/game/medkit.ts: `MEDKIT = { heal 40, time 1.5, mateTime 2.0, carry 2, carryRookie 3 }` (bible 5.13).
   `MedkitUse` heals linearly over its time; any damage > 0 interrupts (the kit is still spent, ASSUMED, logged);
   no use at full health. `useMedkit(target: MedkitTarget)` accepts self or a team-mate (H2); only self is wired.
2. Carry count from `DifficultyDef.medkits` (new field: rookie 3, others 2); host's difficulty applies in co-op.
   Checkpoint and respawn rules stay as they are (5.13 checkpoint health is mission-framework work).
3. Input: `medkit` action. Pad: X held 0.4 s while not aiming (tap stays reload; `TapHold`). KBM: H. Touch: none
   (D1 basic scheme). Step 17 lists it in the binding table.
4. Use: standing or crouched, movement locked, weapon holstered (forces draw phase 0), 1.5 s; aim, jump or sprint
   cancels without spending.
5. Co-op (A5): a client sends `cmove {kind: 'medkit', target: self id}`; the host's `checkCommitted` adds denials
   `none` (count 0) and `full` (hp 100); `cstart {t0}` starts it on every machine; the host heals over time and its
   damage path interrupts (`cdeny` reason `hit`). Health and counts are host-authoritative.
6. PlayerState gains `mk` (medkits held, 0-3) sent in snapshots; the client's own value in `pstate` is ignored.
7. MoveState `medkit` appended (index 28): `ph` progress, `tid` target player index (self = -1). Mirror in
   `localMoveState`, `poseFromMoveState`, remoteAvatar (kit in the off hand, injector to the thigh), pack / sanitize.
8. Health pickup: kind `health` becomes `medkit` (+1 kit up to the carry max; full = not picked up); the old `heal(50)`
   paths (gameState pickedUp, coopHost onPickup) go. Host-authoritative as today.
9. Wall medkit entity: an interactable `medkitWall` (hold 0.6 s: +1 kit up to max, single use, shown spent) placed on
   provingGrounds.ts only (test maps; never src/world/maps/kestrel*). Host checks reach; mirrored through `items`.
10. HUD: health bar on by default (`access.healthBar` default true; a stored false is kept) with the kit count beside
    it and a fill showing the heal in progress; the damage vignette stays for bar-off players.
11. PROTOCOL_VERSION 8 -> 9.

## Tests
- tests/medkit.test.ts: heal 40 over 1.5 s (2.0 for a mate target), interrupt on damage, full-health refusal, carry
  2 / 3 at Rookie, pickup cap.
- tests/committedMoves.test.ts: `none`, `full` denials. tests/net.test.ts: `mk` clamp; `medkit` mode pack / sanitize.
- e2e-pad: hold X at 60 hp -> 100 hp after 1.5 s, kits 2 -> 1; damage mid-use stops the heal. e2e-mouse: H does the
  same. e2e-touch stays green.
- e2e-netmove: case "medkit" (host remote mode `medkit`, joints <= 10 cm mid-use).
- e2e-coop: client heals: host hp and `mk` change, client mirrors them; client at 0 kits gets `cdeny` `none`; wall
  medkit on Proving refills one kit, then shows spent on both pages.
- 4-player `?net=local` medkit run: rerun after 20 (step 30 owns the full 4-player run).

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-netmove e2e-coop e2e-combat`
- `node scripts/anim-audit.mjs` local and remote (medkit pose: hands < 2 cm on the kit, no clip)
- Grep proofs: `grep -rn "heal(50)" src` empty; `git diff --stat -- src/world/maps/kestrel*` empty;
  `grep -n "'medkit'" src/player/moveState.ts`; PROTOCOL_VERSION = 9.
- PC-PASS: HUD health bar and kit count legibility on the phone, pending PC run.

## Commit
"locomotion 15: medkits, health bar, host-authoritative kit counts"
Then LOG, STATE, AUDIT (S08, V05), CHANGELOG, TESTING, docs/systems/combat.md, ui.md, coop.md.
