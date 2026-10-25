# mixamo-kit - state
Owner: Marlow Build. Status: current.

Michael ~00:15: "add all mixamo animations in game, i will fine tune as needed. make this priority overnight"; ~00:25:
"update - dont set mixamo moves as default in game, allow toggle between hand made, cmu, and mixamo".
Lead: Night Shift | Marlow Build. Worktree C:/NightShift/Mobile-Coop-mixamo-kit, branch feature/mixamo-kit.

## Resume block (2026-10-26, plan stage)
- Plan: docs/mixamo-kit/PLAN.md (the one source of truth; builder brief in its section 4). Check 1: FIX, 10 items,
  answered (PLAN-CHECK-1.md). Check 2: FIX, 6 small items, answered in PLAN.md (fix round 1, check 2 answered); item 2
  (coop.md residue) done by the lead in a9e7cbfa4. Not yet rechecked after check 2.
- Base: merge e61e6d6eb = mission-engine 231bdbfbf + mixamo-i3 b932d0311 (three conflicts resolved as unions, approved by
  Campaign Build: coopHost.ts:18 both imports; takedownController.ts master feed line then the engine's revealIntel with
  e.id; coop.md master text then the engine's mission NET paragraph), then a9e7cbfa4 (coop.md: 4 stale merge-base lines
  dropped). The builder's step 0 verifies both and runs npm ci + typecheck + kit / mixamo tests; never merges again.
- Owners' terms:
  - Campaign Build: no edits to src/game/kit/**, teamController.ts, teamMoves.ts, mapDef.ts, sectors.ts,
    sectorTeamDoors.ts, modes/sectorMode.ts, src/net/**, stealthSystems.ts; KIT_POSE_IDS / TeamState names unchanged;
    PULL.catchDrop 1.8 m kept (a Michael tuning item); Campaign merges feature/mixamo-kit into feature/mission-engine
    only after #477 and mixamo-i3 are released on master (draft PR, not for the train).
  - Player Build: characterRig.ts lines :2422 / :2610 / :2949 (:2013 not needed), pelvis stays on `kw`; animGraph.ts
    declarations + one block after stanceShot + the hang skip in its own commit; team.ts KIT0 code, phase fields,
    graph.kit set / clear, "(mixamo-kit)" comments, off bit-identical, guards unchanged; studio.ts no edit (stop and
    report if one seems needed); MIXAMO_ON rows at the end; the toggle read only through MIXAMO / addMixamoResolver.
  - Q39 / G400 (orchestrator 00:55): every screen draws a player with the OWNER's animation source (it rides that
    player's networked anim state; Player Build builds the wire part in src/net). The kit clip follows the acting
    player's source as received: `KIT_TABLES` (0 not Mixamo, 1 Mixamo) resolved once per change, picked per rig per
    frame by `kitSourceOf(rig)`. Player named the field: `AnimGraph.animSource: AnimSource` (local = the player's
    setting, remote = that player's networked state, wire part after ~04:53); kit pick = Mixamo clip when
    `graph.animSource === 'mixamo' && MIXAMO_ON[slug]`. The one-line stub returns this machine's source for every rig
    (A5) until Player sends the head with the field, then becomes `rig.graph.animSource` (one line, in the step 8 merge
    commit). The old "viewer's own source" A5 is void. Test (c2): two rigs, two sources.
  - Round 3 (check 2 "Round 3" FIX 1): `mx` only picks the clip table; TeamPoser writes move / role whenever
    `KIT_TABLES[1].any`; the hang skip is `KIT_TABLES[1].any && move === 'pull' && role === 'a'` (not gated on `mx`, since
    #477's WREN_TRAV is the viewer's global table); the clear rule zeroes `mx` too; (a) runs Hand / CMU with kit rows on
    (bit-identity rests on kitShot at weight 0); (c2) skip on both rigs, a CMU partner under a Mixamo viewer shows the
    hand-made HANG, setKitSourceOf reset after each case.
- Toggle: on origin/feature/mixamo-on a9b96fe1a (animSource.ts, addMixamoResolver, Settings > Gameplay > Animation
  source, default CMU). It does not hold mixamo-i3, so it is NOT merged here (conflicts in Player's files); the lead asked
  Player for the stack order. The slice keeps the one-line local addMixamoResolver stub; when Player sends a head holding
  both i3 and mixamo-on, the builder merges it and swaps the stub for the real import in the same commit.
- Size measure: `node scripts/pr-size.mjs --base e61e6d6eb --head HEAD` (docs not counted), under 1.5k.

## Build (Opus builder; plan check PASSED, round 4)
- Step 0: base verified (parents, ancestors, 3-file diff, a9e7cbfa4); npm ci; the 8 named test files pass. The base's
  typecheck failed on tests/missionNet.test.ts (`INTEL.donePh`, removed by master's joint-flake-3 0fe982983): fixed
  test-only in dbe5e854b (Campaign approved).
- Step 1 (d6a0e9cbb): src/anim/kitMixamo.ts (KIT_SHOT, KIT_PULL copies, KIT_TABLES + resolveKit, the two stub lines,
  setKitSourceOf, KitShotIn, kitClipTime / kitShotTime, the gap trend and phase rule). KitShotIn `time` is the take's
  progress 0..1 (the crawl: its cycle phase); kitClipTime gives the table's seconds.
- Step 2: the 8 MIXAMO_ON rows at the end of mixamo.ts (4 takes true, 4 optional phases false).
- Step 4 (a)+(b) first (team.ts needs `AnimGraph.kit` to typecheck): animGraph.ts declarations (public `kit`,
  `RigTargets.keyShot` + default 0, kitShot fields), the one block after stanceShot, `kitShot()`. KIT_SHOT.jump 0.05 added.
- Step 3: team.ts: TeamPoseIn / TEAM_LINK `kit` / `kt`, local and wire phase derivation, `TeamRigIn.graph?`, TeamPoser
  kitShot (clear on every begin path and in end; move / role whenever KIT_TABLES[1].any; per-rig table; gap trend, hold
  and crawl clocks; bar / wrist / catch hands eased over KIT_SHOT.flip, only while the shot is on).
- Step 4 (c): the hang skip at the top of mixamoTrav (KIT_TABLES[1].any && kit.move pull && role a), own commit.
- Step 5: characterRig.ts :2422 (+ `ks = free ? t.keyShot : 0`), :2610 (trunk `kw * keyTrunk + ks`), :2949 (arms
  `(kw > 0 ? keyArmW : 0) + ks`, same gates); pelvis on kw. animSkeletonIdentity + guardPoseGolden green.
Next: 6 tests (tests/kitMixamo.test.ts, teamPose.test.ts), KIT-REPORT.md, 7 changes fragment, PR.
