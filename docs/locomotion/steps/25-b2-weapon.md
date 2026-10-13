# Step 25 - batch 2: weapon handling and muzzle discipline (D5.7)

Model: implementer sonnet; checker opus. Depends on: 22.
Commit: "locomotion 25: weapon handling batch: aim, reload, swap, throw, attached aim, muzzle discipline, low-ready"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D2 (sway settle), D5.7, D8, D9.
- docs/design-bible.md 5.12.2 table (`grep -n 'Weapon swap' docs/design-bible.md`): raise 0.2 s, swap 0.6 s.
- docs/locomotion/AUDIT.md 1c (W01-W12).
- src/anim/clips/actions.ts:15-112 (reloads, swap, grenade); src/anim/animGraph.ts:285-300 (READY_POSES),
  :661-665, :700-740 (sway, recoil), :785-808 (actions, melee arc).
- src/player/characterRig.ts:1069 (clearBody), :1331-1349 (pivot lag, gunPush, solveArm), :1410-1470 (arm IK), :1504.
- src/weapons/playerWeapons.ts:67-81 (swap beat 0.38 s), :190-213, :283-289 (holster / draw from step 09).
- src/net/remoteAvatar.ts:194-201 (carry weights); src/player/moveState.ts MOVE_MODES.

## Numbers
- Minimums: weapon raise 0.2 s, swap 0.6 s total (bible 5.12.2.6). Swap holster beat today 0.38 s (actions.ts:71).
- Grip hands < 2 cm, other hand contacts < 1 cm; weapon clip <= 2 cm; self-intersection <= 2 cm (bible :801-807).
- Sway settle <= 0.2 s, no wobble (step 21 spring, omega >= 29 rad/s).

## Task
1. Aim (raise / lower) >= 0.2 s with Inertializer blends 0.1-0.25 s; sway after raise settles in 0.2 s.
2. Reload per weapon from real handling (tactical vs empty); record each weapon's duration in AUDIT.md 1c.
3. Swap: total >= 0.6 s (holster beat + draw); the weapon in hand stays host-authoritative (step 09).
4. Throw: anticipation (wind-up) inside the throw; add MoveState mode `throw` (appended) so remotes play the arm.
5. Aim from attached states (ledge, pipeV, ladder, split, rappel, back-to-wall lean): one-hand / two-hand rules kept,
   grips < 2 cm, no weapon through the anchor (<= 2 cm).
   D9 polish: the mirrored left-hand pistol grip and left-shoulder rifle pose (step 12b) meet the same limits at
   left and right edges, high wall and low-wall side lean, local and remote: grips < 2 cm, weapon <= 2 cm into the
   world, self-intersection <= 2 cm.
6. D5.7 muzzle discipline: while aiming, if the muzzle line passes within 0.4 m of a team-mate's capsule within 8 m,
   the rig dips to low-ready and fire is held until clear (ASSUMED, next free A-number; alternative: pose only,
   fire allowed). Holstered carry never points at mates (ready hands, step 21). The muzzle line is taken from the
   weapon actually held, so the D9 mirrored pose is covered too (unit test with a left-hand muzzle).
7. Low-ready in tight spaces: wall within 0.7 m ahead of the muzzle -> muzzle lowered (extend `clearBody`), not
   pushed through the wall.
8. Remotes: muzzle discipline and low-ready computed on each machine from the remote's aim yaw / pitch and positions
   it already has; no new field.
9. Recoil spring unchanged (passes); verify no secondary wobble after a burst (settle <= 0.2 s after last shot).
10. Unit tests for the muzzle-sweep test (segment vs capsule, no allocation) and the low-ready rule.

## D8
- New mode `throw`: e2e-netmove case under 10 cm. Muzzle test with the bot partner: the bot steps into the aim line;
  host and client both show low-ready within 0.15 s.
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget), remotes included.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`;
  `node scripts/run-e2e.mjs e2e-weapons-carry e2e-combat e2e-anim e2e-netmove e2e-coop e2e-bot`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote): durations (raise, swap), hands, self-intersection, settle; batch 1
  rows still pass. `node scripts/perf-trend.mjs`.
- PC-PASS: anim-sheet `aim`, `reload`, `swap`, `grenade`, side / ots, local and remote; wall-edge lean at left and
  right edges, pistol and rifle (D9), local and remote; a muzzle-discipline sheet
  with the bot: "muzzle never crosses the mate, sway settles" (PROVISIONAL in the cloud).
