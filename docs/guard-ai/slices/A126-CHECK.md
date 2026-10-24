# A126 check (fresh checker) - commit 267553bf + merge 567b2458, branch feature/guard-ai-a126

## Verdict: PASS (no blocking findings), with one release-order condition on A136

## Checks run
- `npx tsc --noEmit -p .`: exit 0.
- vitest (12 files, 230 tests, all pass): coopGuardCarry (9), coopGuardAi, coopTorches, net, crateWire, moveState,
  rejoin, jammer, jammerFixes, sectorLampSync, sectorStep3, carryState.
- eslint on the changed src/test files: clean.

## Review
- Wire: `AL_CARRY = 3 << 7` (384) does not overlap level 0-3, AL_SEIZED 4, AL_TORCH 8, AL_CAUTION 16, AL_HELMET 32,
  AL_ARMOUR 64. `packAlert` masks `carry & 3`; `alertCarry` = `(al & 384) >> 7`. Round trip tested over all 512 combos.
- Field width: transport is JSON (`localTransport.ts:31`, `trysteroTransport.ts:19`); no binary encoder, Uint8, delta or
  quantiser on `al`. Only limit is the parser clamp `protocol.ts:331` (`num(v.al, 0, AL_MAX)`), now 511. Every client
  read of `al` is bitwise (`enemyPuppet.ts:175/190/368-381`, `puppetGear.ts`); interp treats `state` as discrete
  (`interp.ts:133/143`), no lerp of `al`.
- Host / client share the constants (`WIRE_CARRY_*` in protocol.ts, mapped by `puppetCarry.ts` wireCarry / carryPhaseOf).
- Drawn = 0: default `packAlert` arg, `wireCarry` falls through to drawn, kinds that never holster (`mayHolster` false on
  both sides, same args as `enemy.ts:413`) keep the old values and have `carry` null on the puppet.
- Puppet path mirrors the host block (`enemy.ts:3136-3146` vs `enemyPuppet.ts:420-431`), including skipping `apply`
  while taken / remote-held; `GuardGunCarry.apply` recovers slot / hold / travel on release. Death path unchanged
  (`heldWeapon = null`, as host `enemy.ts:1751`).
- Hot path: `rp` is a reused field, `PuppetCarry.step` allocates nothing, hyp2 used, no closures. All non-carry pose
  fields are written every frame, so the reuse leaves nothing stale.
- Single player: nothing outside src/net imports puppetCarry or src/net statically. puppetCarry / carryState are
  Babylon-free; enemyPuppet keeps `../core/babylon`.
- Merge 567b2458: src merged cleanly (remerge-diff empty for src). A139 `tripped` appended to BARK_EVENTS; the S9 test
  "BARK_EVENTS lists every bark event once" passes, so the host can now send it (before: barkIndex -1, dropped).

## A136 (protocol stays 37): safe only under one condition
- Keeping 37 is safe if, and only if, PR #229 (feature/guard-ai-s9, head f2fd1219, OPEN and MERGEABLE, protocol 37
  without the carry) never merges or deploys on its own.
- Failure scenario if it does: #229 merges and deploys (37, AL_MAX 127); A126 deploys later, still 37. A host on the new
  build and a client with a tab on the S9-only build pass the version check; the client clamps a calm holstered
  guard's `al` 128 to 127 and shows him in combat, seized, torch on, helmet and armour.
- Action for the job lead / orchestrator (not a code fix): make #229 carry A126 (push the a126 head to
  feature/guard-ai-s9 or replace #229 with an a126 PR), or bump to the next free number at merge time (A136's undo).
  BRIEF A136 already records this.

## Polish list (non-blocking)
1. `enemyPuppet.ts:2` and `:24` both `import type ... from '../player/characterRig'`: merge into one line.
2. The "no allocation per step" test in coopGuardCarry only compares object keys; it does not measure allocation.
3. A ~15 s snapshot gap that skips a whole draw + calm hold sends the puppet DRAWING -> HOLSTERING from u 0 (the host
   never does that); visually a fresh holster from where the gun is, acceptable.
