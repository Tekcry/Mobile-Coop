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

All answered 2026-10-15 through the multiple-choice UI.

- **Q1 Technique.** Recommended: the scripted Blender pipeline on a CC0 base body (SPEC 6.3). Answer below (D7).
- **Q2 Rule changes.** Approve the drafted bible 5.14 / 5.16 / Section 6 and CLAUDE.md text (SPEC Section 7). Answer
  below (D8).
- **Q3 Phone.** Bible 1.14 (lowest LOD, no fps gate) or the brief's 60 fps phone menu. Answer below (D9).
- **Q4 Height.** Keep the shared 1.75 m or lower it. Answer below (D10), with a follow-up on scope (D11).

## Stage 1 answers

**D7 Technique (Q1).** Michael chose "Blender pipeline (Recommended)".
- In-repo Python scripts run Blender headless, on a CC0 base body: sewn garment panels draped by cloth simulation,
  bevelled kit, baked maps, glTF out (SPEC 6.3).

**D8 Rule changes (Q2).** Michael chose "Approve as drafted (Recommended)".
- The bible 5.14 / 5.16 / Section 6 and CLAUDE.md text in SPEC Section 7 is approved.
- It is applied at the start of Stage 2 (bible 1.15), together with the D10 / D11 fairness text (SPEC 7, last
  block), which follows from Michael's own answers.

**D9 Phone (Q3).** Michael chose "Bible 1.14 (Recommended)".
- The phone gets the lowest LOD of the same design and never downloads hero assets.
- No fps gate; phone numbers are information only.
- The brief's "60 fps phone menu" line is superseded.

**D10 Height (Q4).** Michael: "operators can be slightly different sizes, i would prefer realism over fairness. the
games focus is mostly coop"
- This overrides D3's "identical skeleton ... hit volumes and light sample heights" and bible 5.14's fairness bullet.

**D11 Size scope (follow-up to D10).** Michael chose "Hit boxes follow the body (Recommended)": "Each operator's
skeleton, hit volumes and light sample heights match their real size, so shots and light hit the body you see.
Capsule, speeds and every traversal move stay shared, so maps and routes work the same for everyone."
- Heights: Wren about 1.68 m, Moth about 1.78 m (SPEC 4).
- What stays shared: the capsule, speeds, eye and camera rules, and every traversal move and its anchors.

## Stage 2 answers (RUNBOOK step 3, 2026-10-15)

**D12 CC0 base body download.** Michael chose "Download it (Recommended)": the MPFB2 CC0 data only (base mesh, body
targets, vertex groups, default rig weights; 592 files, about 23 MB) from github.com/makehumancommunity/mpfb2 at commit
3af0cd5, into the git-ignored cache `build/operators/cache/mpfb2/`. No MPFB code (GPL). `docs/art-credits.md` lists it.

**D13 Art direction.** Michael's step 3 brief adds `ART-DIRECTION.md`, the look standard beside SPEC Section 1. Conflicts
with SPEC found and decided:
- Waist. Art direction: lean, narrow waist. SPEC A4: survey-average waists. Michael chose "Art direction: leaner
  (Recommended)". Applied: the body's waist breadth and depth are 0.93 of the A4 value (`LEAN_WAIST` in
  `build_body.py`); visual only, hit volumes unchanged.
- Goggles. Art direction: tiny muted emitters only. SPEC 2: glowing lenses are the signature (Wren green, Moth amber).
  Michael chose "Strong lens glow": SPEC 2 stands; the art direction's "muted" rule applies to every other light.
- Bind pose. The brief says bind pose = the game rig's bind pose; the rig's rest pose has the arms hanging straight
  through the hips (about 4 cm overlap). Michael chose "A-pose on the game skeleton (Recommended)": identical joints
  and bone lengths, the mesh bound with the arms about 42 degrees out and MakeHuman's slight elbow bend; the glTF's
  inverse bind matrices carry the A-pose. (Setup note S3.)

**D14 Garment method.** After the first shirt renders Michael answered "stop and reconsider my last detailed prompt"
and pasted the step 3 brief again (follow it as written). After the fit fixes (leaner body, close-fit knit, trimmer
sleeves) he chose "Yes, continue (Recommended)": the sewn-panel cloth method is the method for both operators. The
remaining shirt faults (hem bunching, crumpled forearms, collar not standing) are fixed in a focused step first.

**D15 How the run continues.** Michael: "i would prefer to do smaller steps that keep claude focused and on task. i
want it to run unattended throughout the entire process, resulting in completed characters as per the description".
He chose "Chained small steps (Recommended)": one focused step per session with automatic checks; each session starts
the next itself; he reviews the finished characters at the end.
- Consequences: the three-concepts-per-operator round and the mid-run review page are replaced by one design per
  operator built to ART-DIRECTION.md, checked by script and by the render self-review; Michael's review comes at the
  end (`PLAN.md`).
- Model and effort (Michael asked for them named): Opus 5.5 High for design, garments, kit, bakes and renders; Sonnet
  5.5 Medium for tooling and pages.

## Setup notes (step 3)

**S3 Bind pose.** See D13. The skeleton round trip (`build_skeleton.py`) still checks the game's rest pose to 0.1 mm;
the body report (`<id>-body.json`, `bindJoints`) lists the A-pose joints the mesh is bound in.

**D16 Progress screenshots.** Michael: "i still want to see screenshot at end of each step so i can see progress."
Every step ends by sending its renders (or screenshots for tooling steps) with a three-line note before it chains on;
nothing waits for his answer (RULES "Chaining", every step file's Finish).
