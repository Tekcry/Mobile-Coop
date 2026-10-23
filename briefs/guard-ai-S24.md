status: done feature/guard-ai-s24 ef44eea5
# guard-ai S24: two intruders (one last known position per player, G139)

Lead: Night Shift | Guard AI Build. Model: **Opus only** (AI code; no Sonnet / Haiku builders). The full strict brief is
`docs/guard-ai/slices/S24.md` on origin/feature/guard-ai (git show origin/feature/guard-ai:docs/guard-ai/slices/S24.md).
Read it whole and follow it exactly; this file only adds the cloud specifics. Also read CLAUDE.md "Hard rules" and
docs/systems/agent-preamble.md on master.

- Base: origin/feature/guard-ai-s23 a87ef34c (S23, every player seen; its two Opus checkers are running now). New branch:
  `feature/guard-ai-s24`. Line numbers in S24.md are from e383ba16 (4.80.0, before S23): re-grep every anchor.
- **Before marking done**: `git fetch origin feature/guard-ai-s23` and merge it into your branch if it moved (an S23 fix
  round may land while you build); resolve conflicts keeping S23's fix, re-run the unit list.
- Only files to edit: `src/ai/intruders.ts` (new), `src/ai/enemy.ts`, `src/ai/enemyManager.ts`, `src/ai/sweepTeam.ts` (the
  tick's inputs only), `src/game/gameState.ts` (the `noise` caller and the host ghost), `src/net/coopHost.ts` (the one
  `noise` argument only), `tests/intruders.test.ts` (new), `tests/twoIntruders.test.ts` (new), the S24 addition in
  `tests/coopPerception.test.ts`, tests that change by design (listed in your report), `changes/feature-guard-ai-s24.md`
  (new fragment, kind minor), `docs/systems/ai.md`, `docs/systems/coop.md`, `TESTING.md` (short lines). No protocol, no
  save change; nothing in src/net imported statically from single player.
- Do NOT add the e2e-coop block or retune e2e scripts (the lead does that with the laptop run); list in your report any
  e2e block you believe changes by design (S24.md "Tests that change by design": grep scripts/ for guards spawned
  alerted with no sighting).
- Hot paths allocate nothing (typed arrays sized MAX_INTRUDERS, reused Vector3 per slot, index loops, no closures);
  hyp2 / hyp3, never Math.hypot. Strict TS, `import type` where type-only.
- Run (unit only: no e2e, no GPU, no npm run check): `npx tsc --noEmit -p .`; `npx vitest run tests/intruders.test.ts
  tests/twoIntruders.test.ts tests/coopPerception.test.ts tests/targetPick.test.ts` plus S24.md's re-run list; then every
  test file that builds an Enemy or EnemyManager (grep); `npx eslint` on the changed files.
- Done: all green, solo parity case (f) passing, pushed. Commit trailer: "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>".
  Then a report below (files with line ranges, tests before -> after with counts, deviations, e2e blocks that change by
  design) and `status: done feature/guard-ai-s24 <sha>`.
- Assumed decisions A146-A150 in S24.md are accepted as written.

## Report (Night Shift | Cloud Builder 1, 2026-10-23)
`feature/guard-ai-s24` @ ef44eea5 = S24 commit bbf83bec + merge of origin/feature/guard-ai-s23 dc964d15 (S23 had moved
from a87ef34c: checks, e2e-coop block, docs). Only conflict `docs/systems/ai.md` (S23's tests line kept, S24's bullet
after it); S23 code untouched; unit list re-run after the merge. A146-A150 as written. No protocol / save change.
Tests (before a87ef34c -> after): tsc clean -> clean; 35 files (every Enemy / EnemyManager importer + squadRoles, sweep,
radioNet, targetPick; covers S24.md's re-run list) 532 -> 37 files 548 (new files added); after the merge + coopFix,
hostageGait, sectorIsolator, sectors: 41 files / 609 pass. eslint clean on changed .ts. New: `intruders.test.ts` 5;
`twoIntruders.test.ts` 8 ((a)-(f), (c2) `Enemy.radio` / `tell`, (g) per-intruder flow fields; solo parity (f) passes:
4-guard roles match the old result); `coopPerception.test.ts` 5 -> 8 (no-feet rule, `pickTarget` gets the hunted player).
Cloud Builder 1 re-verified on ef44eea5: tsc clean; intruders + twoIntruders + coopPerception + squadWiring +
radioWiring 50 / 50.
Files (lines at bbf83bec): `src/ai/intruders.ts` new 1-94 (`IntruderBoard`, `INTRUDERS`, + `idOf`); `src/ai/enemy.ts`
62-63, 132-180 (ctx `flowOf?`, `lkpOf?`, `intruderId?`; `reportSighting` returns the slot), 351-359 (`hunt`,
`pendingHunt`, `sawOnce`, `knownV`), 843-845 (`inherit` clears hunt), 1209-1265 (`radio(delay, hunt)`, `tell`,
`huntPos`, `knownSpot`, `takeSighting`; `callContact` sends hunt), 1402-1410, 1715-1725 (`onLevel`), 1825, 1847,
1993-2117, 2192, 2338, 2555-2594, 2881-2898; `src/ai/enemyManager.ts` 64-66, 104-108, 138-165, 375-402, 499-569,
696-707, 795-809, 854, 963-969, 1635-1664, 2157-2229, 2456-2508 (`noise(pos, reach, by)`), 2558-2653 (`huntingOf`,
`lkpOf`, `flowOf`, `reportIntruder`, `mirror`, `forgetStep`, `slotFlowStep`), 2678-2829 (`rolesStep` per intruder via
`rolesFor`, `coverSees`, `noteCaller`), 2871-2898, 2975-2976, 3044-3047, 3120-3125; `src/game/gameState.ts` 620-621,
2595-2603 (ghost); `src/net/coopHost.ts` 1308 (`r.ref.id`); docs `ai.md`, `coop.md` 150-153, `TESTING.md` 58-60,
`changes/feature-guard-ai-s24.md` (minor). `src/ai/sweepTeam.ts` unchanged (teams read the mirrored freshest-intruder
fields, A150).
Tests changed by design: `squadWiring` (fakes `hunt: 0`; shared position via `ctx.reportSighting`; "no shared LKP" uses
`intruders.forget(0)`), `alarmCall` (`joinAsReinforcement(route, -1)`, `radio(0, -1)`), `radioWiring` (fakes `hunt: -1`;
voice `(RADIO.voiceDelay, -1)`), `hearing` / `postsWiring` / `sectionAlert` (fakes get `tell: vi.fn()`).
e2e blocks that change by design (not edited):
- e2e-sectorops S6 alarm (b) "the call gets through" (~3268-3325): writes `em.lkp` / `lkpValid` directly and alerts B
  with no sighting -> no intruder, reinforcements have none, "they close on it along the route" should fail. Retune:
  give B a sighting (`em.ctx.reportSighting(...)`, set `B.hunt`).
- e2e-sectorops S13 response team (~3360): same direct LKP write; sweep still starts at the mirrored `lkp`, members with
  no intruder search round their own stimulus; asserts probably hold.
- scripts/guard-cap.mjs `pageAlert` (~466-471): alerted-without-sighting guards no longer chase / build flow fields:
  measurement numbers shift.
- e2e-stealth-ai 'alarm' (~898, 929): the guard no longer walks to the player's feet; asserts are on the panel, likely OK.
Deviations: spotter's slot reported on going to combat (`onLevel`) so his contact call carries it; `reportSighting`
returns the slot and the guard sets its own `hunt`; calls / shouts taken via `pendingHunt` (first told) on going to
combat, a guard already in combat with no intruder takes it at once; mirror fields (`lkp`, `lkpValid`, `sightT`)
rewritten only on report / forget / clear (direct test writes survive; `sightT` still += dt between reports); `clear()`
now also clears the board (`lkpValid` false there, before only in `despawnAll`); slot flow rebuilds at most every 0.5 s
when the slot moved one cell (nav change / first build immediate); in stealth the old all-players field is blanked once
so a no-intruder guard never follows a field to real feet; a never-seen guard with no stimulus goes to / faces where he
stands; a contact caller with no intruder (e.g. shot by a suppressed round) reports for no group (a hit does not map its
shooter to a slot: outside the brief); the host ghost calls `slotFor(host id)` every frame, so the host claims a slot
before being seen (harmless: slots stay tied to player ids).
