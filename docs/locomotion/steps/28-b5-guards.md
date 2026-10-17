# Step 28 - batch 5: guards, body language, guard look-at (D5.8)

Model: implementer opus; checker opus. Depends on: 27. (all subagents opus from step 06, Michael 2026-10-13)
Commit: "locomotion 28: guard batch: state postures readable at 15 m, reactions, knock-outs, look-at"

## Read (anchors first: `grep -n`; Blocks A-C moved lines, the anchor wins over the number)
- CLAUDE.md, docs/locomotion/RULES.md, this file; DECISIONS.md D5.8, D8.
- docs/design-bible.md 5.12.2 "Guard body language" (`grep -n 'Guard body language' docs/design-bible.md`, +10).
- docs/locomotion/AUDIT.md 1f (G01-G02) and section 6 (known gaps: guard paths were not audited).
- src/ai/enemyRig.ts (26 lines, whole); src/ai/alertState.ts (AlertLevel; `grep -n 'export'`).
- src/ai/enemy.ts: `grep -n 'rig\.\|emote\|lookBase\|torch\|ragdoll' src/ai/enemy.ts`, read only those blocks
  (about :205-215, :288-350).
- src/ai/body.ts and src/ai/ragdoll.ts (if present): `grep -n 'export\|handoff\|fromPose'`.
- src/net/enemyPuppet.ts:15-16 (wire alert LEVELS), :60-80, :180-200 (puppet pose on clients).
- src/config/enemies.json (archetype look and gait fields only).

## Numbers
- Readable at 15 m on a phone at default brightness (bible). Guard pivot 0.6 s (movement.ts:126).
- Wire alert levels: unaware, investigating, searching, alert (`EnemyState.al & 3`, enemyPuppet.ts:15-16).
- Batch 1-4 limits apply to guards too (shared rig): pelvis p2p, sway <= 3 cm, durations, contacts, ROM.

## Task
1. Inventory first: add the guard rows the audit skipped (states, reactions, knock-outs, deaths, ragdoll hand-offs)
   to AUDIT.md 1f with file:line and status.
2. One distinct posture per state: relaxed patrol; suspicious (slows, head turns); investigating (weapon low-ready,
   torch in the dark); alert (weapon up, moving low); searching (sweeps); radio call; alarm run; blinded; gassed;
   knocked out. Each a pose layer on the shared rig, blended through the Inertializer (0.1-0.25 s).
3. Ragdoll hand-offs blend from the last pose, no snap; knock-out and death fall paths pass world clip <= 3 cm.
4. Reactions (hit, flash, gas, noise turn) have a blended interrupted exit (5.12.2.9).
5. Per-guard timing variation: +-8 % gait phase and idle timing from the guard id seed (deterministic, so host and
   client agree); no identical loops side by side.
6. Guard look-at (D5.8): toward the noise investigated, the last known position, a spotted player; neck 80 deg.
7. Player look-at gains visible guards (within 20 m, in view) between noise and team-mate in step 23's priority.
8. Clients: guard posture from the wire alert level plus the puppet's velocity; suspicious / radio / blinded come
   from existing event fields if present, else host-only (log which in AUDIT.md). No new field unless a posture
   cannot be derived; then a 2-bit sub-state in EnemyState with PROTOCOL bump (ASSUMED, next free A-number;
   alternative: host-only postures).
9. Gameplay never reads posture (it is graphics); perception stays on the alert model.

## D8
- Guard pose on the client: an e2e-coop or e2e-netmove case that compares host vs client guard pose per alert level
  (< 10 cm).
- Anim per character <= 0.063 ms trend gate (0.107 ms scaled budget); measure with ten guards (perf scene).

## Checks
- Steps 21-31: on PASS, refresh docs/locomotion/audit/anim-baseline.json with the new worst values (commit it);
  a regression is > 10 % worse or a new fail (step 08 rule).
- `npm run check`; `npm run e2e:quick`;
  `node scripts/run-e2e.mjs e2e-enemies e2e-stealth-ai e2e-stealth e2e-takedown e2e-anim e2e-netmove e2e-coop`
  (netmove / coop KNOWN_FLAKY: any FAIL line fails the step).
- `node scripts/anim-audit.mjs --compare=docs/locomotion/audit/anim-baseline.json` (local + remote) on guards; batches 1-4 still pass. `node scripts/perf-trend.mjs`.
- PC-PASS: a guard-state contact sheet at 15 m (`E2E_GPU=1`, phone-look emulation) per state, host and client view:
  "each state reads at a glance" (PROVISIONAL in the cloud).
