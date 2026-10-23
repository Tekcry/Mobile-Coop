# Guard models: state

## Resume
- ~22:20: G1 MERGED early (8402e5d9; smoke broad 18.6 k tris, 33 bones, body check pass) so the laptop bakes while the Opus checker runs on the same commit. Laptop alone request 20261023T104758-player-build-8402e5d9-21d2 (set guard-bake-bodies): prep + bodies --par 3 --push + guardBodyCheck. On checker FAIL: fix round, rebake. Gear now depends on bodies. G1 open: G4 folds fingers at LOD1 too (`lodBones`), keep clavicle weights; broad neck bone 1.26x; tracked __pycache__ .pyc rewritten by Blender (untrack in G9).
- ~22:10: G3 MERGED (gm-g3 06b42452: checker FAIL was only the FIT regex on CRLF checkouts, fixed by the lead; 80 tests on the merge). Gear bake = laptop alone request after G1 bodies land. G3 polish (G4 / G7): helmet_heavy has no `anchors.drop` (confirm G7 drops helmet_std for every kind or add one); gear hashes miss `bodies/guard-<b>-body.json` (gear `deps: []`: set deps bodies before the bake); shield elL / wrL 0.5 shears on wrist bend (elL 1.0 = SPEC change); holster strap rides hipR only; refit headwear on G1h's envelope; `*.py text eol=lf` in .gitattributes would make GB hashes machine-independent.
- ~22:00: G5 checker FAIL (contract with G6: B1 body piece never shown with G6's list; B2 setPieces / gearMask must take G6's reused `ids` + `count`, index loop) + R1 thermal overlay = +1 draw per guard: Opus fix round running on gm-g5, then a fresh re-check. SPEC section 8 notes come in G5-REPORT "For SPEC section 8" (lead folds them in at the merge). Laptop for G5 alone: e2e-anim + e2e-ctcourse.
- ~21:55: G3 done (gm-g3 0753e753, G3-REPORT.md; smoke helmet_std 856 / 1200 tris, 62 s): Opus checker on a scratch merge with 5b56f8ea. Gear bake waits for G1 bodies (torso pieces) and needs a helmet refit on G1h's head envelope once G1h names that output.
- ~21:50: P1 re-check PASS (reports/P1-RECHECK.md, polish list there): P1 group closed on feature/guard-models. G2 garments Opus builder started early (gm-g2 off 92292b90; scripts now, bake after G1 bodies).
- RESUMED ~21:35 (new account): P1 fix round done (9029cb72, 88ba424b, 7488d74d; P1-FIX-REPORT.md): fresh Opus re-check running on 7488d74d. G5 done (gm-g5 4f51918a, G5-REPORT.md): Opus checker running. G1 (gm-g1 5d9c601a), G1h (gm-g1h f4685346), G3 (gm-g3 456698c3) Opus builders restarted from WIP with the P1 data (bodies 3, heads 11, gear 25). Next: merge P1 on PASS, gm-g5 on PASS, then book each full stage as a laptop alone request.
- SAVE ~21:25: P1 checker FAIL (G6 kit ids outside kit pools; GB normalizeKit misreads outfits / gear per base; helmet_heavy to gameplayGear): Opus fix round running IN this worktree (report docs/guard-models/reports/P1-FIX-REPORT.md), then a fresh re-check. WIP pushed: gm-g5 ef173084, gm-g1 729f6dcb, gm-g1h 5da3600c (nothing yet), gm-g3 09f27096. Laptop: gm-g6n e2e-coop + netmove on 0981cae6 (set gm-g6n), L0 probe (set guard-bake-probe). Hair caps: job haircaps-<base> (build_head.py --haircaps), told to G1h.
- Now (2026-10-23 ~21:10, lead Player Build):   P1 checker (Opus) running on a63e82ca. G6n merged (f9ce1015; checkers A wire + B seed stability PASS; polish: posLook modes (Course, Infiltration) can repeat a seed within a section, ~77% for 20 guards; slot and team seeds may clash). G5 GuardFigure (Opus) running in
  Mobile-Coop-gm-g5. P2/P3 started early on GB's driver: G1 bodies (gm-g1), G1h heads (gm-g1h), G3 gear (gm-g3), Opus,
  worktrees off feature/gm-gb 5da3600c; rules C:/NightShift/scratch/ctcore/briefs/gm-common.md + gm-blender.md (desktop
  smoke runs of ONE job under heavy.lock until L0 lands; full stages = laptop alone requests).
  Lead rulings: enforcer shows plate_heavy (plated); helmets drawn only with the gameplay helmet bit (strict A5, G0 open
  item); droneOp headwear2 cap; one cranium / hair cap / head envelope per base (G0).
  L0 probe queued: request 20261023T094854-...-7d0b, status laptop-e2e/alone-guard-bake-probe on bbd49206 (the desktop
  has all three tools: GB --probe).
- Started 2026-10-23 ~20:45 on the orchestrator's word (Michael gave Player the build).
- Next: as each P1 slice lands: merge feature/gm-<s> into feature/guard-models; one fresh Opus checker for P1 (G0, GB, G5,
  G6) and two independent Opus checkers on G6n; then P2 (G1 bodies + G1h heads as laptop alone bakes via GB).
- Open: L0 needs Michael's yes only if the probe finds Blender 5.2.2 / MPFB2 zip / KTX-Software missing on the laptop
  (orchestrator asks, native multiple choice). Until then the desktop fallback (`--par 2`, heavy.lock) applies.
- Key refs: PLAN sections 5 (budgets: LOD0 20 k shown / 45 k buffer tris, 4096 x 2048 atlas), 6 (24-guard fit vs
  guard-render S1), 7 (groups, ~14.5 h wall, ~33 agent-hours). Gear gameplay: `src/ai/enemy.ts:580-640`,
  `src/ai/gear.ts:28-37`, `src/net/enemyPuppet.ts:144-170`, `src/ai/gearParts.ts`, `src/ai/helmetDrops.ts:40`. Wire:
  `src/net/protocol.ts:110-127` (`al` bits, `AL_MAX` :122, `packAlert` :127, parse :337), `src/ai/enemy.ts:196`
  (`num`). Rig hook: `src/ai/enemyRig.ts:14-30`. Runtime base: `src/operators/runtime/figure.ts:338`
  (`OperatorLibrary`), `:425` (`OperatorFigure`), `:565` (always-active, to replace with S1's box). Pipeline:
  `scripts/operators/README.md`. Laptop queue: origin/feature/laptop-queue `scripts/laptop-queue/request.mjs`
  (`--alone --step`), `docs/systems/testing-tools.md` "Laptop queue" there.

```
Night Shift job guard-models (lead). Worktree C:/NightShift/Mobile-Coop-guard-models, branch feature/guard-models.
Guard: cd /c/NightShift/Mobile-Coop-guard-models && test "$(git rev-parse --abbrev-ref HEAD)" = feature/guard-models
Read CLAUDE.md, docs/guard-models/STATE.md, BRIEF.md, PLAN.md; ROADMAP only "Next: guard-models".
Run PLAN section 7 from the next open group; subagents start from docs/systems/agent-preamble.md.
Opus for Blender, rig, anim, render and src/net code; Sonnet for data, tests, docs. One fresh checker per group;
two independent Opus checkers on G6n (src/net). Never set PROTOCOL_VERSION; tests read the constant.
No Blender on the desktop: bakes are laptop-queue --alone requests (GB driver, parallel blender -b jobs);
desktop fallback (--par 2, heavy.lock) only until L0 is done. GPU sheets and guard-cap on the laptop queue.
G4's sheet goes to Michael without a stop; his notes go into G10.
Update this STATE.md at every stop; commit and push WIP before 92%; queue the next bake before a swap.
```

## Done
- 2026-10-23: BRIEF.md (ask, goal, limits, A1-A11) and PLAN.md (G0-G9, budgets, fit, estimate) written.
- 2026-10-23 ~20:00: Michael's M1-M3 into BRIEF (A1, A4, A9 retired; A12-A15 added); PLAN re-budget: mid-detail faces
  (LOD0 20 k shown / 45 k buffer, 4096 x 2048 atlas, ~112 MB VRAM, <= 75 MB download, still 1 draw per guard),
  slices L0, GB, G1h, G6n, G10; laptop bakes; ~14.5 h critical path.
