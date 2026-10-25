# Operators runtime groundwork - cloud session prompt

For a Claude Code cloud session (no GPU, no Blender), Opus 5.5, effort High. Michael pastes the block below.
It builds the game-side runtime for the new operator models as new files on its own branch, so the later PC
integration session only wires it in and tests visuals. Written 2026-10-16 by the operators orchestrator.

```
Operators runtime groundwork (cloud session). Read all of this before acting. You are an ORCHESTRATOR: you keep the
overview, plan and decide; subagents (Agent tool) do the reading and writing in focused phases. Keep your own context
small: read their reports and the docs you write, not whole source files.

# 0a. Updates since this prompt was written (read first; they override anything below)
- D29 (2026-10-17): Night Shift is DESKTOP ONLY. Ignore every phone requirement below: there is no phone LOD, no
  phone gating, no phone smoke check. The operator LODs are hero, LOD0, LOD1 and LOD2 (LOD2 = the far desktop band).
- Step 10 / 11b assets exist on feature/operators: one skinned .glb per LOD with KTX2 textures (KHR_texture_basisu,
  UASTC + Zstd) - see docs/operators/LOG.md steps 10 and 11b and scripts/operators/README.md for names and folders.
  Babylon's KTX2 decoder is already bundled locally (D27, A79: @babylonjs/ktx2decoder, src/operators/lab/ktx2.ts,
  core/babylon.ts blanks the CDN URL) - reuse it.
- Rigid kit (D28): each rigid part carries a _RIGID vertex attribute and one weight vector; the runtime must keep
  4-influence GPU skinning and must not re-weight them.

# 0. Goal in one paragraph
Night Shift (Vite + TypeScript + Babylon.js 9 PWA stealth game) is replacing its code-built voxel player bodies with
detailed operator models (Wren, then Moth) generated offline in Blender by the operators run on branch
feature/operators. That run delivers, at its step 10, one skinned .glb per operator per LOD (hero, LOD0, LOD1, LOD2 /
phone) plus KTX2 textures, all skinned to the game's joint names. Your job: build and unit-test the GAME-SIDE RUNTIME
for those assets - asset manifest, LOD and hero selection, platform gating, loading, skeleton linking to the existing
CharacterRig, materials and glow, disposal - as NEW FILES, plus a precise integration map, so a later session on
Michael's GPU PC only has to wire it into the player and check visuals. You have no GPU and no Blender: never claim a
visual or performance result; mark every such check "pending PC run".

# 1. Setup and hard limits
- git fetch origin; git checkout -b feature/operators-runtime origin/feature/operators; npm ci.
- Branch guard before every commit and push: test "$(git rev-parse --abbrev-ref HEAD)" = feature/operators-runtime.
  Push only with: git push -u origin feature/operators-runtime. Never merge into or push feature/operators,
  feature/ct-locomotion, ct-movement, dev or master. Commit after each phase.
- NEW FILES ONLY, in: src/operators/runtime/ (code), tests/operatorsRuntime*.test.ts (tests),
  docs/archive/operators-runtime/ (your docs). Do not edit any existing file. In particular never edit:
  src/player/characterRig.ts, src/anim/*, src/core/* (including babylon.ts and flags.ts), src/operators/kit.ts,
  src/operators/operatorBody.ts, src/operators/lab/*, scripts/operators/*, docs/operators/* (another run owns them),
  and anything feature/ct-locomotion changes - list those files first with:
  git diff --name-only $(git merge-base origin/feature/operators origin/feature/ct-locomotion) origin/feature/ct-locomotion
  If a change to an existing file is truly needed (for example a Babylon side-effect import in src/core/babylon.ts),
  do not make it: write it into docs/archive/operators-runtime/INTEGRATION.md as an exact patch for the PC session.
- Do NOT follow docs/operators/RULES.md, STATE.md or its step loop: that is the asset run, not you. Do follow the
  project rules in CLAUDE.md "Hard rules": Babylon only through src/core/babylon.ts (import from it; if something you
  need is not exported or needs a side-effect import, record the patch as above); strict TS with
  noUncheckedIndexedAccess and verbatimModuleSyntax (import type); pure logic in Babylon-free modules with Vitest
  tests; hot paths never allocate (no closures, iterators or temporary vectors per frame; use hyp2 / hyp3 from the
  project, never Math.hypot - see docs/systems/conventions.md); no runtime CDN or network dependency (all assets
  bundled; wasm via ?url imports); phones never download hero assets; gameplay never reads graphics state (LOD,
  presets, the governor) - your code is render-side only; light parity (bible 5.1) - what the player sees, the light
  meter and guard perception must agree; co-op code lives only in src/net behind a dynamic import, single player never
  imports it statically.
- Done for every phase: npm run check passes (lint + Vitest + build). npm run e2e:quick if you add anything an e2e
  suite would touch (you should not need to).

# 2. Facts you can rely on (verify by reading, but do not re-derive)
- docs/operators/SPEC.md section 6.3 (Maps, LODs, Output, Runtime) and 6.4 (cost table). Runtime per SPEC: a Babylon
  Skeleton whose bones are linked to the rig's existing TransformNodes (Bone.linkTransformNode) so CharacterRig stays
  the authority over the pose; GPU skinning, 4 influences; operator meshes are NOT voxelised.
- LODs (SPEC 6.4): hero 150-250k tris, menus and close cameras, never on phones; LOD0 gameplay under 8 m (desktop);
  LOD1 8-25 m; LOD2 over 25 m and the phone in game and menu. Hero adds visual-only finger and toe bones.
- docs/operators/DECISIONS.md D21 (Michael): "i do want hero version for the main menu and for any close up shots".
  D13: bodies are bound in A-pose on the game skeleton; the strong goggle glow stays. D19 / D20: the goggle is on a
  band, stowed on the brow or in use over the eyes (two states the runtime must be able to show; how the asset
  exposes them is not final - design for a named node or variant and record it as a proposal for step 10).
- The Operator Lab (src/operators/lab/) already loads the current hero .glb and drives it from a read-only
  CharacterRig: glb.ts (a minimal pure GLB reader, no Babylon loaders), retarget.ts (JOINT_TO_RIG map; A-pose arm
  hang; NOTE it allocates and uses Math.hypot - fine for a dev tool, not for a per-frame game path), lab.ts (Babylon
  scene, Bone.linkTransformNode). Reuse by importing where it fits; write non-allocating versions for per-frame code.
- src/operators/operatorBody.ts: OPERATOR_IDS ('wren', 'moth'), JOINT_NAMES, proportions. src/operators/kit.ts: kit
  data. tests/operatorLab.test.ts shows how GLB fixtures are built in tests (the real .glb files are git-ignored build
  output and do not exist in the cloud).
- Step 10 file names and folders are not final. Design a manifest that SPEC 6.3 output fits ("a .glb per operator per
  LOD and KTX2 textures under a bundled asset folder; phones load only the phone LOD") and write your proposed names as
  a proposal for the asset run to adopt.

# 3. Phases (one or more subagents each; you review between phases)
Keep docs/archive/operators-runtime/STATE.md current after every phase (phase done, next, open questions, decisions you
assumed with how to undo). It is the resume point if the session stops.

Phase 1 - Survey (3 read-only Explore agents in parallel, "very thorough"; each returns a short written map with
file:line references, not file dumps):
  A. The current player body path: how the voxel operator body is built, attached to CharacterRig, rendered, shadowed
     and disposed; the menu / photo mode / any close or cinematic cameras (candidates for hero, D21); silhouettes and
     electro-vision / glow flags (src/vfx, src/voxel); co-op remote player bodies (src/net, how bodies are created for
     other players).
  B. Platform and assets: src/core platform / deviceTier / quality / qualityManager / governor (render-side LOD inputs
     you may read), Vite asset handling and ?url, the service worker precache list (src/pwa) - phones must never
     precache or download hero files - and how Babylon is imported (src/core/babylon.ts exports, KTX2 support and
     whether the KTX2 / Basis transcoder would hit a CDN by default and how to bundle it).
  C. Gameplay isolation: the light meter, guard perception and any code that reads the player body's meshes or bounds
     (confirm swapping the mesh cannot change gameplay; list anything that would). Plus the locomotion branch's changed
     file list (command in section 1) and what it changes in CharacterRig node names or structure.
  Then write docs/archive/operators-runtime/SURVEY.md from the three reports (you write it, briefly).

Phase 2 - Design (one Plan agent, Opus): write docs/archive/operators-runtime/DESIGN.md: module layout and public APIs;
  the manifest format and proposed asset names; LOD selection (distance bands with hysteresis, per-camera, the hero
  rule from D21 with a registry of close-up cameras, phone always LOD2-class); platform gating and service worker
  exclusion; loading and caching (shared GPU resources across co-op players of the same operator); skeleton link and
  the non-allocating per-frame path; A-pose handling; materials (KTX2, glow emissive for the goggle lens, the two goggle
  states); disposal; how co-op remote players use it; risks. You review DESIGN.md against section 1 and correct it
  before Phase 3.

Phase 3 - Pure modules (one general-purpose agent): Babylon-free code in src/operators/runtime/ with Vitest tests:
  manifest types and validation; LOD / hero picker (pure, non-allocating per call, hysteresis); close-up camera
  registry; platform asset selection (phone never gets hero URLs); dev switch parser for ?operator=wren|moth|off (its
  own module; do not touch flags.ts); goggle state model. npm run check must pass.

Phase 4 - Babylon side (one general-purpose agent): the loader and instance (through src/core/babylon.ts only): build
  meshes and a Skeleton from the parsed GLB (reuse glb.ts), link bones to an interface of rig TransformNodes
  (CharacterRigLike - define the interface; do not import or edit characterRig.ts internals beyond types), materials and
  glow, LOD swap, show / hide the two goggle states, dispose. Unit-test what can run in node (Babylon NullEngine if it
  works in the Vitest node env; otherwise test the pure parts and document what needs the PC). No wiring into the game.

Phase 5 - Independent review (a FRESH Opus agent, read-only except its review file): re-run npm run check; read the
  diff; check every rule in section 1 (new files only, no forbidden edits, hot-path allocation, Math.hypot, import
  type, Babylon import surface, phone gating, gameplay isolation, no network); check the design against SPEC 6.3 / 6.4
  and D13, D19-D21. Writes docs/archive/operators-runtime/REVIEW-r1.md: PASS or a numbered fix list. Up to 2 fix rounds (a
  fixer agent, then a fresh reviewer). Still failing: record it as open in STATE.md and continue.

Phase 6 - Handover (you): docs/archive/operators-runtime/INTEGRATION.md for the PC session after locomotion merges and the
  asset run's step 10 lands: the exact files and lines to change (player body creation, menu and close-up cameras,
  co-op remote bodies, service worker, babylon.ts side-effect imports, flags), each as a concrete patch or
  instruction; the e2e suite to add or extend; the checks only the GPU PC can do (perf budgets from SPEC 6.4 and
  docs/systems/performance.md, visual parity, light parity, phone smoke on Low); the asset-name proposal for the asset
  run; and a ready-to-paste prompt for that PC session (Opus 5.5, High). Commit and push.

# 4. Report to Michael (end of session, short, plain English)
What was built (files, tests), what is pending a PC run, open questions, the branch name, and next steps in order:
when to run the PC integration session (after locomotion merges and operators step 10), with its prompt inline in one
fenced code block, ready to copy.
```
