# Guard AI - state

## Now
PAUSED at the orchestrator's TRIM 4 (usage pace) until it messages (~04:00). S2 incident board built (slices/S2.md,
check green), e2e queued on the laptop; its fresh checker NOT run yet. S1 is PR #179 (feature/guard-ai-s1 5e019d9c,
train 17).

S2 e2e (laptop GPU, 661c258a): 7 suites PASS; e2e-stealth-ai FAIL in the new 'light pair' scenario: "both stand down
after the check (at -1.00, 29.80 s)": guard a (first investigator) stays 'investigating' for the whole 120 s window,
guard b stands down at 29.8 s (sim-stepped, so not load). Log C:/NightShift/scratch/runs/guardai-s2-661c258a/ (laptop).

S2 FIX ROUND done (~03:45, slices/S2.md "Fix round"): light-check ring point behind a wall sent guard a on an endless
detour while the hold flag froze his alert timer -> new pure src/ai/lightCheck.ts (nav-line test per ring point, halfway
fallback, timeout fires mid-path, RING_WALK 12 s, every stage bounded, 86 s worst case); patrol wait 0 = pass-through
(src/ai/patrol.ts:113; side effect: warehouse Sector runner / officer no longer freeze at their 0-wait points). check
green. Laptop bridge down (Character Build gone ~03:50), so e2e ran on the desktop second lane (heavy2.lock, 4192,
GPU, JOBS=1; logs C:/NightShift/scratch/runs/guardai-*): 977cf0f5 e2e-sectorops, e2e-ct-warehouse, e2e-ctcourse,
e2e-coop, e2e-netmove PASS; e2e-stealth-ai FAIL in the OLD 'lkp' scenario (:444 "they converge on the last known
position", closest 4.44 / 4.95 m vs < 2.5) - so 'light pair' was not reached. Bisect on the desktop: S1 cd37c3e8 PASS
(closest 0.91 m), S2 661c258a FAIL (4.43 m), fix 977cf0f5 FAIL: an S2 regression on the desktop (the laptop passed
'lkp' on 661c258a, so it is timing-sensitive). Suspects: search pace 0.75 / calm turn rate while searching slowing the
alerted guard's walk to the LKP, or the scenario's `t.light(0)` opening a light incident that grabs him.

S2 FIX ROUND 2 (~07:30, slices/S2.md "Fix round 2"): root cause = every coordinated search walked 0.75 with the calm
turn, including the search after combat, so the alerted guard could not reach the LKP; fix `Enemy.combatSearch`
(post-combat search keeps 1.3 + aimed turn; calm searches keep A9). Desktop GPU: e2e-stealth-ai PASS x2 (lkp 0.91 m,
light pair both stand down 32.3 s), e2e-sectorops PASS. Full `npm run check` not yet run (heavy.lock was held).

Full burn (orchestrator ~07:55, up to 5 agents): in parallel with the S2 checker, four Opus agents build the pure
modules (new files only, no wiring): S3 radioNet.ts, S4 awareness.ts, S5 posts.ts + guardAiData.ts, S8 squadRoles.ts
(+ coverGrid.ts), each with tests/ and a slices/S<n>-module.md report. Integration of each stays sequential (S3, S4,
S5/S5b, S6, S7, S8) because they share enemy.ts / enemyManager.ts.

S2 fresh check PASS (~08:30, slices/S2-CHECK.md; npm run check green, 3199 tests); 9 polish items, top: a new
`missing` incident can evict the one being followed when all 16 slots are open (incidents.ts:599/:607); noise
investigators still end in the 45 s cooldown. Pure modules built and pushed, unwired: S3 radioNet (ccb249eb), S4
awareness (095b0451), S5 posts + guardAiData (e57a30b5), S7 security body pass (027ca979), S8 squadRoles + coverGrid
(851eba39), S10 pairs (f10dcaf8); each has slices/S<n>-module.md with its wiring list.

## Next
S2 PR (feature/guard-ai-s2 at the S2-CHECK commit; carries the unwired modules too); then S3 integration (radio net
wiring + the 2 S2 polish items above), then S4, S5/S5b (+ glass hook), S6, S7, S8, S10 wiring in order; (slices/S2.md, review the S2 commit diff), then S2 as its own PR when green; then S3 radio net, then
S4-S10 in PLAN order.

## Open
- Data shapes: Course Ready AGREED ~02:25: placeSlot reads squad / handler / zone / role / pair / reason; `post` and
  `profile` on SquadSlot; guard-ai adds `noisy?` / `entries?` to SectorDef in sectors.ts (only those two lines + the
  import). Their posted guards (sector-redesign SPEC "Unavoidable posted guards (M12)", A60-A63), role 'posted':
  K1 S1 #5 doorman leash 5 'c1-door'; K2 S2 #11 bridge officer leash 5 'c2-door'; K3 S4 #19 colonnade sentry leash 5
  'c4-gate'; K4 S5 #9-10 keyholders leash 3 each, highSecurity, 'token'. Lures that must pull them to the leash edge:
  noise, thrown item, a light cut in their area (K4: noise + anteroom light only). Promised (A12): a lured posted guard
  looks toward the lure >= 5 s at the leash edge, sweep <= +-0.6 rad (facing away from the choke) before walking back
  (K4 solo: two single takedowns). Melee tour guards resolved on their side (A46). Protocol 31 theirs, 32 ours.
  Menu Notes AGREED ~02:15: `MapLayout.guardAi` yes (Marlow fills zones = one section per set A1-A8, noisy = A5
  transformers / A6 pumps, once our types reach master); `SquadSlot.post` fine (A1 checker `post: { leash: 0 }`;
  high-security posts in A4 security room, A8 strongroom); Course mode already sets `em.stealth = true` on their branch:
  do NOT set it in a hook; body callback in src/security beside onEvent fine. Their branch also touches mapDef.ts
  (`MapLayout.props`, kit), spawnSquad uses `em.despawn`, `StealthSystems.isolate()` (timed light isolators = a
  lights-out lure), sliding doors (`leaf: 'slide'`): expect small merges.
- Bug from Menu Notes (~03:05): `PatrolWalker.step` (src/ai/patrol.ts) freezes on a `waits` entry of 0 (waitT 0 never
  reaches `advance`; the guard stands there for good). Fix in the S2 fix round: a wait of 0 = pass-through, + a unit
  test (theirs: tests/ctcourse/a2CarriageShed.test.ts on feature/marlow-final; they use 0.1 s waits meanwhile).
- Glass (Course Ready ~08:10, DEC G45, their E2): guard-ai adds optional `glass?: 'clear' | 'frosted'` on collision
  pieces + the sight ray read (clear = see-through, frosted = opaque; hearing = wall for both; the S7 camera body ray
  too) as a small step after S3 integration; they fill the data. Piece type: `BoxPiece` in src/world/levelBuilder.ts:45
  (campus maps src/world/maps/campusS1-3.ts on their branch). Light pass through glass
  is lighting's (Menu Notes), not ours.
- Protocol 32 only if S9 is needed (marlow-final 30, sector-redesign 31).
- A11: Sector Ops melee tour guards vs "every guard armed" (Course Ready's data).

## Pacing (lean windows, ROADMAP Decided ~01:45)
Each 5-hour window to 99%: no new agent at 97%, save at 98% (WIP pushed, this file current). At most 3 agents. AI
behaviour code Opus; Sonnet only for tests / e2e scenarios / data from a strict brief; checkers Opus.

## Done
- 2026-10-23 ~02:45: S1 hearing cd37c3e8 (check, tsc, lint, unit 70/70); fresh checker PASS (slices/S1-CHECK.md, 5e019d9c),
  4 non-blocking fixes folded into S2. e2e GREEN on the laptop (GPU): e2e-stealth-ai, e2e-sectorops 1-5, e2e-stealth,
  e2e-gadgets, e2e-ctcourse 1-3, e2e-coop, e2e-netmove (Character Build ~02:50).
- 2026-10-23 ~02:00: worktree off master ffade187, g44-above merged (e5e66e5e); BRIEF.md (a9ab3a29).
- 2026-10-23 ~02:10: research (research/audit.md, ct-behaviour.md, tactics-design.md); PLAN.md; BRIEF A2-A11.

## Resume prompt
```
Night Shift | Guard AI Build - guard-ai: RESUME. Model Opus, effort high; clear context first.
Folder C:/NightShift/Mobile-Coop-guard-ai, branch feature/guard-ai (git fetch; git status; branch guard before every
write: CLAUDE.md "A job"). Read CLAUDE.md, docs/ROADMAP.md (origin/feature/menu if newer), docs/guard-ai/BRIEF.md,
PLAN.md and this STATE.md. Continue from "Now": the loop in docs/systems/session-method.md (implementer, fresh checker,
at most 1 fix round per slice; at most 3 agents; subagents start from docs/systems/agent-preamble.md; slice detail in
research/tactics-design.md). e2e by message to Night Shift | Character Build (branch, commit, suites, E2E_GPU=1).
Message Night Shift | Orchestrator at each slice and the PR. Michael asleep: log assumptions (BRIEF A-numbers), no
question dialogs. Lean windows: no new agent at 97%, save at 98% (WIP pushed, STATE current).
```
