Operators: design and mockup renders for WREN and MOTH (Night Shift). Pre-production only: no game integration.

## Setup (do first)
1. From C:\NightShift\Mobile-Coop, run `git fetch`, then `git worktree add C:\NightShift\Mobile-Coop-operators -b feature/operators origin/master`. Work only in that worktree. Use E2E_PORT=4191. This is Michael's PC: GPU renders use E2E_GPU=1 (hardware GPU).
2. Create docs/operators/ with BRIEF.md (this prompt, verbatim), RULES.md, STATE.md (resume point, updated at every stop), DECISIONS.md (numbered, Michael's answers quoted) and SPEC.md. Add one line to CLAUDE.md on this branch: "On branch feature/operators, follow docs/operators/RULES.md and resume from docs/operators/STATE.md (brief: docs/operators/BRIEF.md)." All decisions go in git, not memory.
3. Commit and push after each stage.

## Michael's locked decisions (2026-10-15): record them as D1-D4 in DECISIONS.md
- D1 Realism: the operators must NOT look code-built. They must look as detailed and realistic as a modern AAA stealth game character: believable fabric, folds, seams, stitching, wear, straps under tension, hard kit with real material response. Primitive-assembled "capsule and sphere" looks are rejected outright.
- D2 Close-up scrutiny: they must hold up when used up close in menu animations (loadout, operator select, briefing). Michael expects intricate, logical, believable detail at a camera distance of 0.3-1 m on desktop at 1440p and 4K.
- D3 Skeleton: identical skeleton, capsule, speeds, hit volumes and light sample heights for both (bible 5.14 fairness stands). Realistic proportions on that shared skeleton; differences come from build (girth within the few-percent rule), silhouette, clothing and kit.
- D4 Face: fully covered, full stealth gear (fitted balaclava/hood plus goggles). No visible face or skin. No face modelling beyond what sits under the gear.

## The detail standard (applies to every concept; write it into SPEC.md and check every render against it)
- Logical: every strap has two anchor points and a reason to exist. Every buckle, clip and webbing loop does a job: it carries load, adjusts fit or retains an item. Every pouch holds something named in the kit list, with a closure that matches what's in it. Cables run from a source to a device along a route that real people use, with retention points. No decorative greebles.
- Construction: seams where real garments have panels, with stitch lines, bar tacks at stress points, bound edges, zip garages, elastic gathers, reinforced patches at knee, elbow, seat and shoulder (rifle butt), and drain grommets.
- Physical: fabric drapes and compresses under straps. Straps carry tension and slack. Pouches sag with weight. The harness pulls the trousers. Materials read correctly at close range and under raking light: soft-shell, ripstop nylon, elastic knit, webbing, rubberised grip, anodised and painted metal, matte polymer, leather, rubber soles, lens coatings.
- Lived-in: plausible, restrained wear. Scuffs, abrasion on edges, dust in creases, a rolled sleeve (Moth), worn webbing ends, tape on kit. Nothing new-out-of-the-box, nothing grimy.
- Two levels: the hero LOD (menus, close cameras) carries full detail. The in-game LODs keep the same silhouette and read, with detail moved into normal and texture maps. Phone gets the lowest LOD of the same design.

## Read in full before designing (no skimming)
- CLAUDE.md
- docs/design-bible.md: Sections 0-3, 5.1, L7 and L11, 5.12.2, 5.14, 5.16, 6, 8 (art direction, colour blindness), 9
- docs/story.md Section 4: the operators, real names and dossier secrets (Wren = Imogen Hale, Moth = Danny Mensah)
- docs/systems/world-and-characters.md "Characters"; docs/systems/ui.md (menu scenes and the loadout preview); docs/systems/performance.md (character and draw-call budgets); docs/systems/graphics-quality.md (presets, LOD, phone look)
- src/player/proportions.ts, src/world/smoothMeshes.ts, src/world/partLibrary.ts, src/world/menuScene.ts; the operator torso and `trilens` helmet code in src/player/characterRig.ts (grep, use line ranges)
- git show origin/character-model --stat and src/cosmetics/shadeOperative.ts + src/voxel/voxelModelBuilder.ts on that branch (an earlier attempt: learn from it, do not merge it)
- scripts/rig-shot.mjs and scripts/e2e-lib.mjs (how headless renders work)

## Why this exists
Michael finds the current operators rough and low quality. The desktop target is to beat Splinter Cell: Chaos Theory's characters (bible 5.16). He approves or rejects mockup renders before anything goes into the game.

## Hard constraints (if one blocks the realism goal, raise it as a decision, never decide it yourself)
- Original design: no Splinter Cell IP. No three-lens goggle (the current `trilens` violates bible 5.14 and is replaced). No real brands, logos or patches. Copy no real product designs.
- Identity: each operator is identifiable at 20 m in the dark by silhouette and goggle colour (Wren green, Moth amber). The goggle glow is emissive, visual only, never a light, never seen by guards. Check green vs amber under deuteranopia/protanopia simulation.
- Gameplay never reads graphics state. Characters do not occlude gameplay light (L11).
- No runtime network: every asset is bundled. Phones never download desktop-only or hero-LOD assets. Every external file's source and licence goes in docs/art-credits.md.
- Performance: phone (iPhone 17 Pro Max at 60 fps) and desktop budgets in performance.md. State each design's cost per LOD: triangles, draw calls, materials, texture MB (desktop / phone / hero), skinning cost. The hero LOD may be expensive because the menu shows one or two characters, but it must still hold 60 fps in the menu on desktop and on the phone (the phone uses a lighter menu LOD if needed).
- Babylon only through src/core/babylon.ts. Strict TS. Pure logic in Babylon-free modules with Vitest tests. Hot paths do not allocate.
- Do not edit src/player/characterRig.ts, src/anim/*, or anything feature/ct-locomotion touches; that run is reworking the rig and animation now. All work here lives in new files: a dev-only viewer, an asset pipeline and new modules that can be wired in later.

## Stage 1: research and the technique decision (then STOP for Michael)
1. Reference study, in your own words, written into SPEC.md: real modern covert night-operations clothing and kit. Soft-shell or combat shirt and trousers, fitted balaclava and hood, low-profile plate carrier or chest rig, belts, a thigh pistol holster and a back long-gun carry (per src/weapons/carrySlots.ts), a climbing harness and hardware for Moth, gloves, boots, the NVG mount and goggle housings, comms (radio, cabled ear piece, push-to-talk), pouches, cable routing, straps, buckles, stitching and wear. Note how fabric folds at shoulder, elbow, knee and waist, and how kit sits on a body (load bearing, strap tension, sag).
2. Anthropometry: realistic proportions on the shared skeleton for Wren (thirties, compact, ex-military woman) and Moth (twenties, lean, ex-steeplejack man). Check proportions.ts against real anthropometric data and propose corrections to the shared skeleton if it is unrealistic, with the gameplay effect of each (capsule, hit volumes and camera stay identical for both operators).
3. Draft kit lists for each: every item, where it sits, what it holds, how it attaches. These drive the logical-detail rule.
4. The technique decision. The bible says characters are code-built and bans external art except CC0 textures (5.14, 5.16, Section 6), which cannot reach D1 and D2. Compare at least these, with the realism ceiling at 0.3 m, the pipeline, file sizes, phone impact, animation and skinning fit to the existing skeleton, licence risk and effort:
   (a) code-generated high-resolution meshes (sculpting with signed distance fields or lofted cross-sections, generated by code at build time, baked to skinned meshes with normal, roughness and ambient occlusion maps);
   (b) a scripted Blender pipeline in the repo (Python generates and bakes the meshes and maps offline, committed as bundled glTF);
   (c) CC0 base meshes or scans as a starting point, modified and kitted in the pipeline;
   (d) any better option you find.
   Recommend one. Ask Michael with the native multiple-choice UI (recommendation first), and draft the exact bible text changes (5.14, 5.16, Section 6, hard rules in CLAUDE.md) for his approval. Ask only questions the docs and D1-D4 do not already answer.
Update STATE.md, commit, push, STOP. Report: what you read, the recommendation, the questions.

## Stage 2: mockups (after Michael answers)
1. Build a dev-only Operator Lab: a standalone page like the Kestrel editor (`npm run operators`, never in the production bundle). It has a turntable, a free close-up camera, LOD selector (hero / in-game levels / phone), presets (Low / High / Epic / phone look), and lighting rigs: neutral studio, raking light for detail checks, the menu scene lighting, Hollowmere night (sodium orange against blue moon), full darkness with goggle glow only, and night vision. A pose list (A-pose, idle, crouch, sneak, aim pistol, aim rifle, a climbing reach for Moth) uses the existing pose data read-only. Toggles for wireframe, normals, UVs and material IDs.
2. Write scripts/operator-sheet.mjs (headless, E2E_GPU=1) to render each concept as a contact sheet:
   - Turnaround at Epic, hero LOD, neutral light: front, 3/4 front, side, 3/4 back, back. Orthographic plus perspective at 50 mm equivalent, with a 1.75 m height scale bar and a grey human silhouette at real proportions behind it.
   - Close-ups at menu camera distance (0.3-1 m, 4K, raking light): head, hood and goggle housing (lit and glowing), the goggle mount and battery cable, comms, chest rig front and rear, shoulder strap and buckle, hands and gloves (palm and back), belt and holster, Moth's harness and hardware, knee, boots and soles. Each close-up carries a labelled callout of what every visible item is and what it does.
   - The menu test: each operator in the real menu scene framing and lighting, plus three close camera moves rendered as short frame strips, to show the detail holds in motion.
   - In context: Hollowmere night lighting, crouched in shadow at 5 m, and in full darkness at 20 m (identity test: silhouette and glow only).
   - Both operators side by side in one frame, plus each beside the current operator (before/after).
   - Each in-game LOD and the phone look at gameplay distance.
   - A wireframe and LOD strip with triangle counts and texture sizes.
   - A colour-blind simulation strip of the goggle glows.
3. Offer 3 distinct concepts per operator in the first round. Each gets design notes: silhouette idea, full kit list (from Stage 1), materials, a colour palette (night-adapted desaturated darks: charcoal, dark olive, blue-black, worn black; no pure black), goggle housing shape (Wren square housing, Moth round lenses, original designs) and cost numbers.
4. Make a review page and publish it as a private claude.ai Artifact. One card per concept and per sheet, each with Approve / Reject / Note controls that save Michael's verdicts (use the artifact db capability so you can read them back). Clicking a render opens it full size for zooming.
5. Keep renders under docs/operators/mockups/ (PNG or WebP, sensible sizes) so they are in git.
6. Run `npm run check`. Update STATE.md, commit, push, STOP. Give Michael the Artifact link and say how to review.

## Stage 3: refine (repeat until approved)
Read Michael's verdicts from the Artifact, apply them, re-render only what changed, and republish the same Artifact. Log each round in DECISIONS.md. Once both operators are approved, write the final SPEC.md: the character detail sheet (bible 5.16), the parts, kit and materials list, LOD rules (hero, in-game, phone), the phone vs desktop differences, the budgets, animation and clipping risks (straps, harness, pouches and goggles vs the rig's joint limits and the 5.12.2 clipping rules, cloth or secondary motion if any), and an integration plan for after feature/ct-locomotion merges to master (which files change, the e2e and visual checks, CHANGELOG/TESTING/docs updates). Then STOP.

## Reporting
Plain English, short. At every stop, give Michael numbered next steps and the full prompt for the next session inline in one fenced code block, ready to copy (never "see file X"). Say when to clear. Never claim a visual result you did not render on the hardware GPU.
