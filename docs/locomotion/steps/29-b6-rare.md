# Step 29 - batch 6: rare traversal and dedicated clips (rappel, fence, brace)

Model: implementer opus; checker opus. Depends on: 27. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 29: rare traversal batch: pipes, split, wall jump, zipline, duct, vent drop; rappel, fence, brace clips"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D5.3, D5.9, D8.
- docs/locomotion/AUDIT.md 1g (R01-R06), 1h N01 (brace stand-in).
- src/anim/clips/traverse.ts:15-359 (hang, climb, crawl, ventDrop, split, wallKick, pipeLegs, pipeInv, rappel, brace;
  read by `grep -n 'export const'` then the clip you change).
- src/player/attach.ts:53-82 (ATTACH table); src/player/attachController.ts:60-70 (CLIMB_UP_TIME etc.).
- src/player/attachGrips.ts:45 (AttachGrips); src/player/gripStepper.ts:49.
- src/config/movement.ts:318-322 (rappel), :345-350 (fence); src/player/splitJump.ts (exports only).
- src/game/teamController.ts:335-345 (brace); src/net/remoteAvatar.ts:157-215.
- scripts/e2e-netmove.mjs: `grep -n "label\|mode ===" scripts/e2e-netmove.mjs` (existing rare cases).

## Numbers
- Netmove baselines cm (STATE.md): pipeV 0.2, pipeH 0.2, duct 0.2, split 0, split aim 1.1, wall-jump hang 0.2,
  pipe legs 0.4, inverted 0.1, rappel 0.2, fence 0.8. Limit 10 cm; no case may worsen by > 1 cm.
- Attach enter / exit s: pipeH 0.3 / 0.35, duct 0.45 / 0.45, zipline 0.3 / 0.3 top 6 m/s, fence flip 0.9 s,
  rappel hookTime / 0.35 (attach.ts:70-81).
- Hands on rungs, pipes, ropes < 1 cm; no zipline netmove case exists.

## Task
1. Pipes (hands, legs up, inverted): grips < 1 cm, one settle on each sub-state change, blended interrupted exits.
2. Split and wall kick: anticipation inside jumpTime, compression on the wall contact, single settle on exit.
3. Zipline: dedicated clip (hands on the handle, legs trail with speed, lean into the line); add a netmove case.
4. Duct crawl and vent drop: hands and knees on the floor (float <= 2 cm), drop with D5.3 landing settle.
5. Rappel dedicated clip set: hook-on, descend / ascend, sprint descend, kick-off, exit; rope hand < 1 cm.
6. Fence dedicated clip set: climb, shimmy, flip over (0.9 s), drop off; hands on the mesh < 1 cm.
7. Brace dedicated clip: back to the wall, hands cupped, knees bent; enter / hold / exit / interrupted exit.
8. Every clip passes 5.12.2 in the harness before commit (bible coverage rule); remotes pose from the existing modes
   (`pipeH` + sub, `duct`, `zipline`, `split`, `wallJump`, `rappel` + `u`, `fence` + `u`, `brace`).
9. Aim from these attached states stays as in step 25.
10. Exertion breathing (step 22) after a long climb or rappel ascent.

## D8
- No new mode expected; if one is added, it gets a netmove case. Add the zipline netmove case.
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget), remotes included.

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`;
  `node scripts/run-e2e.mjs e2e-traverse e2e-anchors e2e-anim e2e-clip e2e-netmove e2e-coop`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote); batches 1-5 still pass. `node scripts/perf-trend.mjs`.
- PC-PASS: anim-sheet per rare state (pipes x3, split, wall jump, zipline, duct, vent drop, rappel, fence, brace),
  side / front, local and remote: "hands on the anchor, one settle" (PROVISIONAL in the cloud).
