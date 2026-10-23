# S9 check (fresh checker, Opus)

Branch feature/guard-ai-s9, reviewed `git diff 78c2fe7c..76157035` (cut from feature/guard-ai-s15 78c2fe7c). Spec:
NEXT-BRIEFS.md section 5 (origin/feature/guard-ai), PLAN.md row S9, docs/systems/coop.md, S9.md, BRIEF A90-A95.

## Verdict: PASS

No blocking finding. One test-script hardening commit on the unrun e2e block (below). The e2e suites are still to run
on the laptop (written, not run).

## Findings

### Wire
- Protocol 32 (`src/net/protocol.ts:19`), one bump for every change. A 31 peer is refused by the version check
  (`tests/net.test.ts:398`). Every test asserting the number now says 32 (jammer, jammerFixes, moveState, net x5,
  rejoin, sectorLampSync, sectorStep3, coopGuardAi); no e2e script asserts the number.
- `packAlert` (`protocol.ts:111`): bits 16 / 32 / 64 on top of 0-15, old three-argument callers unchanged; the parser
  clamps `al` to 0-127 (`protocol.ts:306`). Every reader of `al` masks it (`& 3`, `& AL_*`), so the wider value breaks
  no old reader (`enemyPuppet.ts:156`, `:171`, torch mirror).
- `bark` parse (`protocol.ts:364`): `id` through the ID regex (camera ids `cam-*` pass), `b` clamped 0-255 and
  floored, `n` 0-63, `u` 0-99, text kinds need a non-empty sanitised `t` (120 chars). On the client an unknown index
  gives `barkLine` null and the event is dropped (`coopClient.ts:640`); `n` is taken modulo the table; a unit on an
  event without unit lines falls back to the plain line, as `BarkVoice.sayUnit`. No malformed event reaches a throw.
- `hitConfirm` `deflect` parsed and shown only for `player === me` (`coopClient.ts:626`).

### Host authority
- The client runs no AI: the puppet only predicts the marker (`predictDeflect`, the shield block) for its own round,
  and still sends the shot first (`enemyPuppet.ts:196`). Damage, the knock-off and the helmet bit are the host's;
  the client's helmet falls only when the host's bit clears.
- `predictDeflect` matches the host's order and rules (`enemy.ts:1488-1513`, `gear.ts:94`): shield block before gear,
  heavy excluded, bullets only, sleep bolts excluded, `GEAR.armourMult` 0 (a vest always stops a body round).

### Single player
- No static `src/net` import outside `src/net` (grep); `src/ai` imports nothing from `src/net`.
- `onBark`'s new arguments are optional; `gameState.ts:654` keeps its three-argument handler. `placeBark`'s new branch
  runs only without an `enemyMgr` and calls an optional `net.barkAt` (scratch `barkPt`, no allocation).
- A91 (solo pose change): only the rig's `aim` weight moves (cautious and calm 0.2 -> 0.4); `rp.dash` reads
  `aiming < 0.5`, so it is unchanged; nothing in perception, fire or light reads it. It follows the CT research
  ("weapon at low ready") and Michael's rule that both screens match. No test or e2e asserts guard aim. Safe.

### Allocation
- Per snapshot / frame: `alertCode` packs booleans; the puppet compares gear bits and calls `applyGear` only on a
  change (parts built once, then toggled); `wireGuardAim` is pure. `DeflectLedger` holds two numbers. The helmet pool
  is built on the first drop. Bark events allocate one object per line (rate-limited by `BarkVoice`, the host's own
  HUD path does the same). `gearShown` allocates, tests only.

### Deflect prediction vs host confirm
- Predicted and confirmed: one marker (the ledger eats the confirm). Unpredicted (the bit not there yet): the
  confirm shows it. Predicted and rejected by the host (`judge` fails): the marker was shown, no confirm, the entry
  expires in 1 s (as a predicted hit marker today). See the polish list for the two rare double / missed cases.

### Puppet gear
- The shield by kind in the constructor; disposed with the rig (root dispose recurses) and again explicitly in
  `dispose` (harmless, the host does the same, `enemy.ts:2926`). On a kill the human rig goes to the ragdoll with its
  parts, as on the host.
- `applyGear` runs on the first state (no drop: `prev` -1) and on a gear-bit change; a helmet drop needs prev bit set,
  new bit clear and under 1.5 m moved in one frame. A Sector restart makes new guards (new ids, `enemy.ts:206`), so
  new puppets: no stray drops; the restart banner and dispose clear the client's pool. `setAlarmStage(0)` never takes
  gear away (`enemyManager.ts:727`), so the e2e's reset drops nothing.

## Fixes (this round)
- `scripts/e2e-coop.mjs` (test script only, not run):
  - Team step: the Ledger keeps 9 alive (`SQUAD_CAP`) and the live cap is 12 (`MAX_ALIVE`), so the three spawns fit
    exactly; one alarm reinforcement earlier in the run would make `spawn` refuse one and fail `team.length === 3`.
    The step now raises `em.maxAlive` to `alive + 3` for the spawn and puts it back with the despawn.
  - Deflect loop: after each client round it waited a fixed 300 ms; a host that processes the round later gets the
    next round after the knock-off, which is a headshot kill and fails `hostSide.alive`. It now waits up to 800 ms
    for the host's verdict (helmet off or guard down) before the next round.

## Checks
- `npx tsc --noEmit -p .`: clean. (The worktree's `node_modules` link pointed at an empty
  `C:/NightShift/Mobile-Coop/node_modules`; replaced with a local `npm ci` from this branch's lockfile.)
- eslint on the 20 changed src and test files: clean.
- `node --check scripts/e2e-coop.mjs`: OK (before and after the fix).
- vitest, one file at a time, 24 files, 437 tests, all green: coopGuardAi 16, net 72, moveState 16, jammer 39,
  jammerFixes 10, rejoin 12, sectorLampSync 11, sectorStep3 7, coopTorches 12, coopFix 13, netSim 7,
  warehouseCoopS1 12, S2 20, S3 21, gear 14, gearWiring 21, archetypes 13, camBodyWiring 13, pairsWiring 16,
  radioNet 26, radioWiring 13, responseWiring 17, sectionAlert 20, squadWiring 16.

## e2e risks (e2e-coop block, written, not run)
- Team spawn floor (12-14.4, 0, -6.5) on the Warehouse: the same open floor the client-kill block uses at (13, -6.5);
  `spawn` snaps to the nearest walkable cell within 8 m, so a refusal there is unlikely; the cap is now covered.
- Caution hook: `em.awareness.timedHold(key, 60, 2)` (`ALERT_SHOTS`) then the private `syncCaution`; every spawned
  guard has a key (`enemyManager.ts:1343`), so the step should run, not skip. It asserts only the bit, not the pose.
- Bark: `missed` is urgent (no cooldown), the host line contains "three"; `hud.barks.shown` lists lines by time left,
  not by visibility, so an off-screen speaker still passes on both pages.
- Deflect confirm: the shot is judged like the client-kill block's (same floor, teleport grace re-granted each
  round); head height 1.62 x scale on both sides. The guard is staggered and in combat afterwards; the players are
  invulnerable (damageMul 0) for the later blocks.
- Every guard of that match keeps the stage 3 helmet and armour (later blocks do not shoot guards).
- e2e-netmove: no assertion reads a puppet's aim (now 0.7 when searching, 0.4 cautious).
- Suites to run on the laptop (`E2E_GPU=1`): e2e-coop, e2e-netmove; e2e-stealth-ai and e2e-takedown for the moved
  gear builder and the host caution pose.

## Polish list (not blocking)
1. Camera (desk) lines show only as the subtitle on the client: `barkAt` has no `cam:` case, so no floating line
   (documented in coop.md). A camera position lookup on the client would place it.
2. The client poses wire level 1 (suspicious or investigating) at 0.7; the host's suspicious is 0.4 (A91).
3. A client round in the 120 ms before the stage gear bit arrives predicts a hit, then the host's deflect confirm
   adds a deflect marker (two markers). A round predicted as a deflect in the 120 ms after the host knocked the
   helmet off shows a deflect while the host kills.
4. A predicted deflect the host rejected stays in the ledger for 1 s and can swallow one unpredicted host confirm
   in that window.
5. Pair lines longer than 120 chars are cut and lose `"`, `<`, `>`, `&` on the client (`safeText`).
6. The enforcer's shield rides the ragdoll root after a kill (host and client alike).
