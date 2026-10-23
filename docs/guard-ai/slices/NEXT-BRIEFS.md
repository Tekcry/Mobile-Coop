# Guard AI - briefs for the next window (lead, 2026-10-23 ~12:05)

Start these the moment the session resumes, in parallel up to desktop CPU ~80%, never two agents on the same files.
Every agent starts from `docs/systems/agent-preamble.md`, uses its worktree's branch guard (CLAUDE.md "A job"), runs
only `npx tsc --noEmit -p .`, eslint on changed files, `node --check` on changed scripts and single vitest files (never a
full `npm run check`, never e2e, never `npm run dev`, every command with a timeout), commits with the Co-Authored-By
line, pushes, and hands back head / what was built (file:line) / checks with counts / deviations / e2e risks. Prose: no
em dashes. Spec for S13-S15 and S9: `research/stealth-over-shooting.md`, `PLAN.md` rows, `BRIEF.md` A35-A51.

## 0. Agents that may have been cut off at the cap (check first)
For each: `git -C <worktree> log --oneline -5`, `git status`, and the slice report. Done = report + checks in it.
Not done = a fresh Opus agent finishes from the brief below and the WIP on the branch.
- Stack-tip e2e fix, `C:/NightShift/Mobile-Coop-guard-ai-s10` (feature/guard-ai-s10 from 88a93584). Report:
  slices/S10.md "Stack-tip e2e fix". The four laptop failures are in STATE.md "Now" (~12:50 entry). If it held
  `C:/NightShift/heavy.lock` ("Guard AI Build | stack fix"), check no process of it is alive (memory: kill the tree
  with taskkill), free port 4191, delete the lock only while it still names Guard AI.
- S13 response teams, `C:/NightShift/Mobile-Coop-guard-ai-s13` (feature/guard-ai-s13 off s12 ebdc44a2). Report
  slices/S13.md. Brief = section 2.
- S15 breaker / lamps, `C:/NightShift/Mobile-Coop-guard-ai-s15` (feature/guard-ai-s15 off s12 ebdc44a2). Report
  slices/S15.md. Brief = section 3.

## 1. Merges and runs (lead, mechanical; Opus merge agent if conflicts in src)
1. Laptop rerun of the fixed s10 tip (Character Build, E2E_GPU=1): e2e-stealth-ai, e2e-sectorops all parts (+ any
   suite the fix agent names). Green -> train-ready message for #200-#203 to the orchestrator.
2. s12 <- fixed s10 (S10 pairs into the S11 / S12 line). Then open ONE PR for S11 + S12 from feature/guard-ai-s12,
   base feature/guard-ai-s10 (S11's branch rides inside it). Tell CT Core when it opens (playerWeapons deflect diff,
   their sd-rounds branch adds 2 WeaponSlot fields right above HitKind: trivial adjacent conflict).
3. s13 <- s12 and s15 <- s13 once both are built; one checker for S13 + S15 (Opus); one laptop run on the s15 tip:
   e2e-stealth-ai, e2e-sectorops all, e2e-takedown, e2e-ct-warehouse, e2e-course, e2e-ctcourse.

## 2. S13 response teams (Opus) - the brief given at ~13:30 (re-use if it was cut off)
Items 3, 4, 11; A37-A39; new assumptions A52-A59. Worktree above. Build: (1) stage gear on each Sector Ops alarm
stage rise: every living section guard `setGear(mergeGear(own, stageGear(stage)))`, later spawns get it AFTER
placeSlot (placeSlot calls setGear and wipes gear: S12-CHECK note), a restart drops it; outside Sector Ops one alarm =
stage 1 (no gear); no camera added / woken / retuned. (2) reinforcements per stage = `responseTeam(stage, perStage)`
(enforcer first, always helmeted, rest grunts, same count); StealthSystems.onAlarm on live maps = shield + 2
(RESPONSE.liveTeam). (3) sweep after the LKP search (ALERT.searchTime): SectorDef.sweep or sweepPoints(routes, posts,
lkp, SWEEP.thin) built once per team, nearest first, each once then again from the LKP, the shield leads, the rest
SWEEP.gap behind, SWEEP.dwell per point, torches on in the dark, start at sweepStart(team, n); a sighting -> combat
(S8 roles, aggressive) -> LKP search -> sweep again; never leave / despawn / calm until unload or restart; per-step
part allocation-free. Host-only (S9 carries gear bits; the client puppet must build the shield by kind). Tests: NEW
tests/responseWiring.test.ts; e2e block "response teams (guard-ai S13)" in scripts/e2e-sectorops.mjs (written, not
run; seeded Math.random, sim-time steps). Docs: slices/S13.md, ai.md, TESTING.md, changes/feature-guard-ai-s13.md.
Vitest: responseWiring, gear*, responseTeam, sweep, alarmCall, squadRoles*, sectors, sectorGuardTags, postsWiring,
awareness*.

## 3. S15 lights (Opus) - the brief given at ~13:35 (re-use if it was cut off)
Item 8; A42, A43; new assumptions A60 onward. Build: (1) a breaker / switch cut = a fault: one witness (nearest calm
guard who saw it, by path), suspicious at most, patrol pace to the switch, bark "Breaker's gone again.", after
BREAKER.resetT flips the circuit ON through the same StealthSystems path as the player's toggle (parity: lights,
meter, co-op light sync), no ring, back to his route calm; a second cut of the same circuit inside BREAKER.repeatT =
the full S2 light incident at the switch; a timed isolator relighting ends the walk. (2) shot lamps: S2 check
unchanged, never relit. (3) late discovery: a calm guard who later has a dead fixture / cut circuit in view within
LATE.range reacts as a witness (shot -> 1 investigates; cut -> the reset walk), once per state change, a throttled
allocation-free pass reading collision and the light registry only. Host-only, no src/net. Keep edits to the light
paths (S13 edits sectorMode / onAlarm / reinforcement code in parallel). Tests: NEW tests/breaker.test.ts, incidents
additions; e2e-stealth-ai 'breaker' (written, not run); check e2e-course / e2e-ct-warehouse switch asserts. Docs:
slices/S15.md, ai.md, lighting.md, TESTING.md, changes/feature-guard-ai-s15.md.

## 4. S14 section alert (Opus) - NEW, start in parallel once s12 has the fixed s10 merged
Worktree `C:/NightShift/Mobile-Coop-guard-ai-s14`, branch feature/guard-ai-s14 off origin/feature/guard-ai-s12 (after
step 1.2; it needs S10 pairs and S5b radio checks). Items 6, 7; A40, A41, A46; new assumptions A70 onward. Files:
src/ai/awareness.ts (timed hold), src/ai/radioNet.ts (CallKind), the radio-check / missing code in enemyManager.ts
(S5b ~1058-1140 on s5b numbering; S10 missing partner), hearing / incidents for loud shots, src/net/coopHost.ts one
line. S13 / S15 run beside it: do not touch sectorMode stage / reinforcement / sweep code (S13) or the light paths
(S15).
Build: (1) a radio-check miss (S5b) or a missing talking partner (S10): the caller starts a `missing` radio call
(RADIO.callIn 2.5 s x reaction, cuttable: take the caller during it and nobody else hears); on delivery (S3 stagger)
each receiver turns cautious, timed MISSING.cautious 180 s: a new timed hold over the section's keys in awareness.ts;
the pair search stays; if he is then found dead the S4 held caution takes over, KO'd and woken the S4 KO caution.
(2) a `shots` CallKind: any calm guard who hears a loud (unsuppressed) shot at tier 1+ (S1 hearing) and is not already
fighting starts one call per shots incident (cuttable); on delivery the section is cautious, timed SHOTS.cautious
120 s (a later loud shot refreshes it), and the board sends a pair (lead + cover, G11) to the spot instead of one;
suppressed shots unchanged; no alarm from shots (only a panel or a command call). (3) coopHost.ts: a client's quiet
shot is heard at `SHOT_NOISE x weapon noise` as in solo (A46; ~coopHost.ts:1161). (4) read-only per-section counters
on EnemyManager for section-rating (bodies found, missed checks, shots calls, radio alarms), reset at section load.
Barks: "Unit N, report... nothing." style lines for the miss, a shots line. Host-only except the coopHost line (no
wire change, no PROTOCOL_VERSION). Tests: NEW tests/sectionAlert.test.ts (timed hold expiry, dead find promotes,
cut call = no caution, one shots call per incident, refresh, suppressed never calls, counters); radioNet.test
additions. e2e (written, not run): e2e-stealth-ai 'missed check' (KO a squad member out of sight, force the radio
check: section cautious, two search; KO the caller mid-call: nobody cautious) and 'loud shot' (a loud shot by the test
hook 20 m from one guard: he radios, a far guard turns cautious, two go; a suppressed shot: no call); seeded
Math.random, sim-time steps. Docs: slices/S14.md, ai.md, coop.md (the reach fix), TESTING.md,
changes/feature-guard-ai-s14.md. Vitest: sectionAlert, radioNet, awareness*, incidents, hearing, sectorGuardTags,
pairs*, squadWiring, net / coop host tests covering coopHost.ts. The laptop must run e2e-coop for this slice.

## 5. S9 co-op (Opus) - after S12-S15 are merged into one tip (not before: it reads all of their state)
Protocol 32 (registry: master 31, guard-ai 32, marlow-final 33; if 32 is gone, the next free). One bump: a `bark`
NetEvent, `AL_CAUTION` 16, `AL_HELMET` 32, `AL_ARMOUR` 64 in `al`, `hitConfirm` kind `deflect` (coopHost.ts:1018
today confirms only on dealt > 0); the client shows barks and the low-ready caution stance; `EnemyPuppet` builds the
enforcer shield by kind and the helmet / armour placeholders by bit, drops the helmet when the bit clears
(`helmetArc` is deterministic). Tests: protocol version, packAlert bits, deflect confirm; e2e-coop / e2e-netmove on
the laptop.
