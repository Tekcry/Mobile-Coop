# Guard models: state

## Resume
- SAVE ~22:10 wall (orchestrator 92%): WIP pushed gm-g2 dead28af, gm-g4 39ef4d54, gm-g7 c88e96f0, gm-g1fix 12f324e6, gm-g1hfix 4c9cc590 (Opus builders / fix rounds running in each: resume each from its branch head with the prompt implied by the lines below). Integration feature/guard-models has P1, G1, G1h, G3, G5. Laptop queued: bodies / gear on 8402e5d9 and heads on 26f31c40 (both superseded by the G1 / G1h fix rounds: rebake bodies, heads, gear after they merge), G5 e2e-anim + e2e-ctcourse on f078e49d. Next: merge gm-g1fix + gm-g1hfix (fresh re-check of each), rebake prep + bodies + heads + gear on the laptop, then G2 check + garments bake, G4 check + lods / check / sheet bake (sheet to Michael), G7 check + laptop suites.
- ~23:05: G1h checker FAIL: heads not in G1's body frame (seam ~25 mm off, broad perimeter -13 %; chin recipes move the seam up to 9.3 mm). Ruling Fix A: build_head.py runs G1's GuardFit and builds heads on G1's head part with a seam lock; plan heads deps prep, hash gaps closed, smoke hook removed. Opus fix round on gm-g1hfix off 4c9cc590; heads rebake after it (the 26f31c40 heads bake on the laptop is superseded). X2 reduced: G4 welds by mh_index, no transform. Skin 0.69 is scalp shadow: G4 must not divide.
- ~22:55: G1 checker PASS with B1 (gear-shield_riot needs no broad body) + X1 / X2. Lead rulings: X1 option a = finger bones renamed `finger<S>_<f>_1` and rolled to Wren's curl axis (fingers.ts / fingerRig unchanged), SPEC 6 + guards.json bones change; X2 = body report carries the neck / head fit transforms, G4 moves G1h heads into the body frame via `guard-<b>-headref` offsets. G1 fix round (Opus) on gm-g1fix off 955b8311 incl. polish (neck-scale fallback, prep hash, height + handL / handR for G2, G3 crown -4.8 mm note); then rebake bodies (+ gear) on the laptop. G2 and G4 told the new names.
- ~22:45: G4 (gm-g4) and G7 (gm-g7, on Wren's LOD stand-in, flag default off until G8) Opus builders started early off 480c6182.
- ~22:35: G1h MERGED early (26f31c40; guard_skin.py added to LIBS.heads; envelopes `heads/<base>/envelope.json`, broad from heads-broad-1) + laptop alone request 20261023T105511-player-build-26f31c40-a74f (set guard-bake-heads: heads stage + guardHeadCheck); Opus checker running. G5 MERGED (re-check PASS; f078e49d); laptop e2e-anim + e2e-ctcourse 20261023T105555-player-build-f078e49d-10f1 (set gm-g5). G5 polish for G7: spawn via `setPieces(p.ids, p.count)` (options.pieces takes a plain list); two varyings (vec3 + vec2) may hit the PBR varying limit at the first GPU compile (pack one vec4); guardFigure.ts:376 isDisposed; G4 splits vertices at piece seams (groupByPiece uses a triangle's first vertex). G1h open: G3 refit on envelopes; declare PNG / envelope outputs in the plan; jobs using the broad envelope need heads-broad-1; skin base colour 0.69 vs SPEC 0.75 (G4 divides or raises); G4 welds the head seam to G1's body. Left in P3: G2 garments (building).
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
