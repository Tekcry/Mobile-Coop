# Operators run - decisions

Numbered. Michael's words are quoted. Newest at the bottom of each list.

## Michael's decisions

**D1 Realism (2026-10-15).** "the operators must NOT look code-built. They must look as detailed and realistic as a
modern AAA stealth game character: believable fabric, folds, seams, stitching, wear, straps under tension, hard kit
with real material response. Primitive-assembled "capsule and sphere" looks are rejected outright."

**D2 Close-up scrutiny (2026-10-15).** "they must hold up when used up close in menu animations (loadout, operator
select, briefing). Michael expects intricate, logical, believable detail at a camera distance of 0.3-1 m on desktop at
1440p and 4K."

**D3 Skeleton (2026-10-15).** "identical skeleton, capsule, speeds, hit volumes and light sample heights for both
(bible 5.14 fairness stands). Realistic proportions on that shared skeleton; differences come from build (girth within
the few-percent rule), silhouette, clothing and kit."

**D4 Face (2026-10-15).** "fully covered, full stealth gear (fitted balaclava/hood plus goggles). No visible face or
skin. No face modelling beyond what sits under the gear."
- Consequence: Moth's rolled sleeves (story) show a fitted knit base layer below the roll, never skin.

**D5 Design language (2026-10-15, during Stage 1).** "I am expecting splinter cell inspired models that are original"
- Applied in SPEC Section 2: close-fitting dark layers, a harness over the suit, the covered head and glowing goggles
  as the signature, purposeful kit only. Shapes, patterns and details are all original; nothing is copied from the
  reference game or real products.

**D6 (2026-10-15, during Stage 1).** Michael asked: "What would result in a more accurate vision? Installing blender?"
- Answer given: yes. The scripted Blender pipeline (SPEC 6.3) gives the more accurate result: real sewn garments with
  simulated folds, bevelled kit and baked maps. A TypeScript-only path would have to invent folds. His choice is
  recorded under Q1.

## Setup notes (Claude, for Michael's information)

**S1 Base branch.** The brief said to cut `feature/operators` from `origin/master`.
- `origin/master` (2026-10-10, "Update deploy.yml") is the old "Silent But Deadly" line: it has none of the
  documents the brief lists (`docs/systems/*.md`, bible 5.14 / 5.16 as written, story Section 4 real names).
- Project rule: feature work branches off `ct-movement`.
- The worktree was therefore cut from `origin/ct-movement` (99da75b, bible 1.14). Nothing had been written on the
  master-based branch; it was deleted unpushed.

**S2 Phone target conflict.** The brief asks for 60 fps in the phone menu. Bible 1.14 (P7, Michael 2026-10-14) made
the phone "load and play on Low, no fps gate". Asked as Q3.

## Questions for Michael (Stage 1)

- **Q1 Technique.** Recommended: the scripted Blender pipeline on a CC0 base body (SPEC 6.3). Answer: pending.
- **Q2 Rule changes.** Approve the drafted bible 5.14 / 5.16 / Section 6 and CLAUDE.md text (SPEC Section 7).
  Answer: pending.
- **Q3 Phone.** Bible 1.14 (lowest LOD, no fps gate) or the brief's 60 fps phone menu. Answer: pending.
- **Q4 Height.** Keep the shared 1.75 m or lower it. Answer: pending.
