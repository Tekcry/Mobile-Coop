# Character shadows in the light meter (J16, meter half)
Owner: Sector Ops Build. Status: plan (2026-10-25). Branch `feature/char-shadow-meter`.
Source: FOLDED-PLAN (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md`) section 3 break 4, section 4 row J16:
"Character shadows read by meter and guards (one fixed lamp set; G 1d split, Sector Ops PR first)". Reviews: Sector Ops
L1, L16, V9; Guard AI C1, C3, "1d"; Player H7; Test Runner H1 (`docs/conformance-*/CONFORMANCE.md`).

## Michael said (verbatim)
- Re-audit answers, 2026-10-25 ~11:20-11:35, item 6, character shadows: "Meter and guards read them".
- Folded plan answers, 2026-10-25 ~16:50, Q14 guards and your cast shadow: "A faint cue".
- G315, 2026-10-23 ~14:42, on real-time character shadows: "yes i want to include this system now as its one of the
  main focus of the game".

## Michael picked
- Q14 (FOLDED-PLAN section 2): "A faint cue" from "No, shadows only darken, as CT" / "A faint cue" / "Counts as seeing
  you". The Guard AI review's longer option text: "Faint cue: a moving shadow in his focus cone raises suspicion only,
  never detection" (Guard AI designs the perception; this job only gives them the data).

## Rules in force
- G352: the meter and guard perception read the real-time character shadows the picture shows (replaces G315's render
  only shadows).
- Bible P1 ("the light meter never lies ... character shadows included"), L11 ("one fixed lamp set whatever the
  graphics preset"), L13 (no per-frame per-lamp loops in gameplay), L18 (silhouettes 1 on Low / Medium, 2-4 on High+).
- CLAUDE.md: gameplay never reads graphics state; light parity; hot paths allocate nothing (`hyp2` / `hyp3`, no
  closures); co-op code only in `src/net` behind a dynamic import; unfinished work dark behind a flag.

## Goal
Where another character's shadow darkens a player on screen, the meter drops by the same amount on every graphics
preset, and the guards (who read the host's meter sample) see the same darkness. The partner's shadow counts in
co-op. A player's own cast shadow is published as data for Guard AI's "faint cue".

## Scope
In: the gameplay lamp set; a pure character-occluder contract shared by the meter, the picture's round shadows and
Guard AI; the character term in the light field; the meter wiring (local and remote players); an interim guard fill;
the cast-shadow cue data for Guard AI; unit tests; the GPU parity card (Sector Ops V9); docs and the settings text.
Out: guard perception and the faint cue's behaviour, guard / dog / body occluder shapes, bodies' light (Guard AI); the
operator's capsule from the sim body (Player); lux calibration and lamp levels (J10 light-realism).

## Design in five lines
1. Gameplay lamp set, fixed per sample point: every lit baked lamp the field already sums there giving at least 0.04
   (`CHAR_SHADOW.minLevel`), plus the moon and flashlights; never the preset's silhouette pick.
2. Each character is one sim capsule in `src/world/charOccluders.ts` (fixed typed arrays); a lamp's term at the chest
   and head samples is multiplied by the same soft-capsule formula the picture's round shadows use (floor 0.15).
3. The picture's round-shadow feed reads the same capsules, so every preset darkens the same lamps by the same amount;
   higher presets only draw the real outline from the nearest 1-4 lamps (same 0.15 floor).
4. Co-op: nothing new on the wire; lamp state is already synced and each machine fills capsules from its own sim view;
   the host's sample drives guards as today.
5. Guard AI reads `ShadowCues`: per player, up to 3 floor footprints of their cast shadow (points, contrast, speed),
   made at 10 Hz on the host from the same set; they decide what a guard notices.

## Assumed decisions (each with its undo)
- A1 Lamp set = per sample point, every lit baked lamp in the point's 2 m column giving >= 0.04 there, plus the moon,
  plus flashlights. Fixed by map data and the synced light state only. Undo: cap at the K strongest (one constant
  `CHAR_LIGHT.maxLamps`, default unlimited).
- A2 One capsule per character (foot to head, radius; any axis, so bodies and dogs lie flat). The silhouette's finer
  shape (arms, guns) is picture only; inside the umbra both read 0.15. Undo: the contract keeps a `kind` and owner per
  capsule, so a second capsule per character is a fill change, not a format change.
- A3 The picture's round shadows (`BakedLamps.capsules`) read the contract instead of `rtCapsules`: the partner and
  bodies gain round shadows, a co-op client's picture gains guard round shadows (it has none today), heights come from
  the sim, not the rig. Look change, behind the flag. Undo: flag off keeps `rtCapsules`.
- A4 No self-shadow: the sampled character's own capsule is skipped by owner, and the picture's own-surface rule (a
  point within 1.6 r of an axis) applies to all. Undo: drop the owner skip (one argument).
- A5 Flashlight holder: a light whose origin is within r + 0.6 m of a capsule's axis is never shadowed by that
  character (the geometric form of src/world/torchShadows.ts:131). Undo: the constant.
- A6 The moon is in the set. With Shadows Off the picture draws no moon character shadows (the cascades are off) while
  the meter still counts them: the picture shows less, as bible L11 allows. Undo: drop the moon term (one line).
- A7 Co-op tolerance: a client's own meter uses snapshot guard positions, so a shadow edge can lead or trail the host's
  sample by up to ~0.3 s; still or slow scenes agree within 0.02. Undo: send the host's light per player in the
  snapshot (a wire change; the train bumps `PROTOCOL_VERSION`).
- A8 Cast-shadow cue: floor footprints only (a shadow climbing a wall is not a cue in v1), host and solo only, players'
  shadows only. Undo: add wall points from the lamp's baked visibility (a fill change, same layout).
- A9 Flag `charShadowLight` in src/core/flags.ts, default off (`?charlight=1` on), owner Sector Ops; switched on when
  Michael walks it (Sector Ops walk cap, G288). Guard AI's and Player's PRs ride the same flag. Undo: flip the default.
- A10 Characters counted: players, guards, dogs, bodies (a carried body follows its carrier). Until Guard AI's and
  Player's PRs land, the interim fill gives upright capsules for players and live guards (today's `rtCapsules`
  numbers), so nothing regresses.
- A11 Cost: the term runs only inside the 10 Hz meter samples and the 1 Hz body samples, never per frame (L13); budget
  0.1 ms p95 per meter tick on campus S5 with 4 players, measured in the build report.
- A12 Built dark before J10 lands: every test computes its expectation from the field, never a literal level. The GPU
  parity card's numbers and Michael's walk wait for J10's re-bake (PLAN "After J10").

## Wording once it lands (FOLDED-PLAN section 5; orchestrator owns the bible)
- Settings help (src/ui/screens/settingsScreen.ts:340) proposed: "The lamps nearest you cast the real shape of guards,
  your partner, bodies and weapons. Off: soft round shadows (cheaper). Auto: on from High shadows. Looks only: a
  shadow on you darkens the light meter and what guards see the same way at every setting."
- lighting.md and the bible, one wording for P1 / L11: "Every preset darkens a character's shadow on you from the same
  lamps by the same amount; higher presets draw the real outline from the nearest lamps, the others draw soft round
  shadows."

## Questions for Michael
None blocking (unattended: assume and log, G358). A6 is the nearest to a Michael-only rule (light parity at the
Shadows Off setting) and goes to the orchestrator for Michael's next look.
