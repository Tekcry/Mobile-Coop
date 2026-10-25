**A80 The Lab lit every face from inside; reader winding fixed, rigs re-aimed (step 11 fix round 1).** The Lab's GLB
  reader negated x (glTF's right-handed frame to the game's left-handed one) and also flipped the triangle winding. The
  mirror alone already turns glTF's counter-clockwise front faces into the clockwise ones Babylon treats as front, so
  with both every visible face was a back face, and two-sided lighting flipped its normal: every light acted from -v.
  Measured: under the rim rig (two back rims) the front read sRGB 0.13 and went to 0.03 with two-sided lighting off;
  with back-face culling on the visible faces vanished. Effects seen in step 11's sheets: the rim sheet's front evenly
  lit, the goggle glow washing the back green, the rigs tuned by eye against the inversion. Fix: glb.ts keeps the index
  order (its unit test now expects [0, 1, 2]); `labData.ts` documents the frame (figure faces +Z, its right on +X; `v`
  is the light's travel; yaw > 0 views the figure's left) and re-aims the rigs: front keys travel -Z (studio, raking,
  detail, menu, night vision), back rims +Z (rim, detail's rim, figure's rim); detailRear mirrored. A unit test pins it.
  The right-side close-ups (thighR, belt, ribsSide, underarm) now use negative yaw. Every Lab sheet before this round
  was lit inside out. Undo: restore the index swap in glb.ts and the old rig vectors. Fix round 2 (step 11): two more
  Lab effects of the corrected faces. (1) The goggle's spill point light (a few cm in front of the housing) now lit her
  own face, hood and chest green and blew the housing to white: `glowLight.excludedMeshes` holds every loaded operator
  mesh and the grey human, so it lights only the scene ahead; the darkness rig's starlight fill is 0.12 so a faint
  silhouette reads behind the lenses. (2) The turnaround's back read lighter than its front: masked medians (her pixels
  only) front torso 0.07 / legs 0.02, back 0.07 / 0.07, while an 18 % grey sphere in her place read front 0.40, back
  0.32 (the rig is right). Switching one Lab feature off at a time (`operators:sheet -- --only diag`): sheen, normal
  maps, environment, ambient changed nothing; shadows off gave front legs 0.08. Cause: shadow acne, every face turned
  to the key shadowed itself at depth bias 0.0008 (the two-sided materials put both faces in the map;
  forceBackFacesOnly had no effect, normal bias 0.05 made it worse). Bias 0.004 (about 5 cm over the 13 m shadow depth
  range): front torso 0.10 / legs 0.08, 3/4 front 0.08 / 0.06, side 0.07 / 0.07, 3/4 back 0.08 / 0.07, back 0.07 /
  0.07 - the key side is now the brighter one. It also lifts every key-lit close-up, which the acne had darkened.
  (3) The rim rig: side rims flatter (v x 0.75, z 0.65, intensity 3.6) plus a rim from above behind (2.5), so the
  front views get bright edges while the body stays near black. Undo: excludedMeshes empty, bias 0.0008.
# Operators run - decisions

**Michael's current decisions now live in master's `docs/DECISIONS.md`** (G123 and G161-G176 since the master merge of 2026-10-18; G161-G176 were G124-G139 on this branch; recorded in step 11e with G68-G75,
which already covered the operators). This file is the run's history and keeps the assumed A-decisions; new Michael
decisions go to `docs/DECISIONS.md` with the next free G number.

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

**D17 Step loop like the locomotion run (2026-10-16).** Michael asked whether the workflow could learn from the
locomotion run, then chose "Restart with all": each step is implement, then an independent Opus High checker (re-runs
the checks, reads every render against ART-DIRECTION and SPEC 1), up to 3 fix rounds, then commit and push only after
PASS (OPEN after 3 failed rounds). Plus the locomotion no-hang rules: tool-call budgets, timeouts, exact port 4191
commands, branch guard. RULES "Step loop"; script `run.workflow.js`.

**D18 Orchestrator session, exactly like the locomotion run (2026-10-16).** Michael: "why is this running a workflow?
the locomotion never did that", then "Orchestrator session", then "do all the prep work with the repo and give me the
prompt, i will put it in another session. must operate exactly like the locomotion session". One orchestrator session
(Opus 5.5 High) runs steps 05-18 with Agent subagents (implementer, Opus checker, up to 3 fix rounds) and commits
itself. Replaces D17's scripted workflow (stopped; the script is kept as history). Prompts: OWNER-NOTES.md.

**D19 Goggles: no flip mount, a tactical strap, a futuristic housing (2026-10-16, during step 07).** Michael: "the
goggles shouldn't flip up and down, they should just sit over the forehead, and be over the face when in use. make the
head strap more tactical looking also. the night vision goggles could be more futuristic, they look very square".
Overrides SPEC 3.3 and the SPEC 7 rows for the flip mount and the "square goggle housing", and step 07 Do item 2:
- No flip arm, pivot or detent lever. Two worn positions: stowed, resting on the forehead / brow over the hood; in use,
  pulled down over the eyes (the eye port). Both are rendered (replaces the "optic up" view).
- The head strap / harness reads more tactical: purpose-built webbing and hardware, not a generic strap set.
- The goggle housing is more futuristic and less square: original sculpted, rounded forms (still no three-lens goggle,
  no copied product, D5); the strong glow stays (D13).
- Scope (orchestrator's reading, A28): Moth's head kit (step 13) follows the same no-flip rule; Moth keeps its round
  twin-lens amber look from SPEC.
- Process, Michael: "you can show me scratch renders first with some options if its easier to nail the look". Before
  the step 07 fix round builds it, a scratch pass renders about 3 goggle housing options and 2-3 head strap options
  (stowed and in use); Michael picks; the fix round builds the pick.

**D36 Moth's goggle colour is purple (2026-10-19).** Michael, on the orchestrator's dashboard (asked about Moth's
direction and goggle colour), relayed by the orchestrator: Moth's goggle colour is purple, not amber. Moth's lens glow and goggle light are purple; amber is dropped (it was the
HUD's exposure warning `.tac-exposure`, and green / amber fails the colour-blindness rule, A112). Still to change: bible
5.14 (Wren green, Moth amber; the operator table's "Amber") - the orchestrator edits the bible line - and SPEC's Moth
head kit ("Round twin-lens goggles (amber)"). Open for the Moth job: check purple against Wren's green and player 2's
cyan with the same Machado simulation A112 used, and pick the linear emissive. A scratch Moth prototype follows only
when nothing urgent waits (desktop work, possibly overnight). Recorded on feature/goggle; at the merge it goes into
master's docs/DECISIONS.md with the next free G number (G89). Undo: amber back in bible 5.14 and SPEC.

**D34 Traversal gameplay stays at the 1.75 m body (2026-10-18, step 11e).** Asked about A105 (Wren hangs and climbs
7.6 cm higher because `attachPose` scaled the hang depth by the rig height), Michael: "Keep gameplay fixed
(Recommended)". Ledge, wall-jump and climb positions use a fixed gameplay height (`GAMEPLAY_HEIGHT` 1.75) for every
player; Wren's body is drawn lifted onto her grips. Recorded in master's docs/DECISIONS.md as G176. Replaces A105.

**D35 PR #5 merged on Michael's word (2026-10-18).** Michael: "merge"; asked how (his standing rule is that Claude
never merges into master), "Merge commit (Recommended)". The orchestrator merged Tekcry/Mobile-Coop#5 into master as
9295c65 (merge commit); feature/operators is kept for the cleanup, the placeholder weapons and Moth.

**D33 Wren in the game first; hero model in the menu (2026-10-18, during step 11d/11e).** Michael: "I want wren in the
game first. We will clean up changes later while the game is built." (D32 relabels, 11c doc fixes, the stowed goggle
export and other polish become cleanup after the PR; 11d and 11e share one independent check before the PR.) The
goggle stays over the eyes in both states until the stowed export: "Yes, fix in cleanup (Recommended)". File size:
the hero GLB is 55.5 MB (GitHub warns over 50 MB, rejects over 100 MB per file); after seeing hero vs LOD0 close-ups,
Michael: "Yes use hero for menu" - the hero ships in this PR, loaded lazily for menus and close cameras only.

**D32 Kit that depended on systems master 4.0.0 deleted (2026-10-18, after step 11c).** Asked, Michael:
- Hip pod (built for the deleted player drone, G7 / G115): "Keep as utility pouch" - the hard pod stays as a generic
  gear pod with no game item; labels, callouts and kit text drop "drone".
- Medkit pouch (carried medkits deleted, G98 / WEAP-11): "Keep as plain pouch" - the soft pouch stays as generic
  storage; labels and kit text drop "medkit".
- Thigh holster (shaped for the deleted five-seven): "Leave as is" - it reads as a generic pistol holster; pistolSd
  is drawn from it.
- Left-hip sling socket (an SMG anchor, A41): "Keep for the rifle sling" - re-pointed to the rifle's sling, master's
  `sling` carry slot (src/weapons/carrySlots.ts).
Recorded in master's docs/DECISIONS.md with the run's decisions in step 11e.

**D31 Wren replaces the player character now; both players are Wren (2026-10-18).** Michael: "Wren is finished. Bring
feature/operators up to date with master, put Wren in as the player character, and open the PR." Recorded in master's
docs/DECISIONS.md as G123 (replaces G70's "after the prototype, behind a dev switch"): "I want wren in to replace the
existing character anyway; before the prototype is done" and, for the second player until Moth is finished, "Both play
as Wren". So: step 11c merges origin/master (4.0.0, Tekcry/Mobile-Coop#3; G1-G122, G68-G75 cover the operators) keeping
master's deletions (phones, touch, player drone, carried medkits, guns outside the CT kit) and decisions; anything that
depends on a deleted system (drone in the hip pod, medkit pouch, phone budgets) is listed for Michael, not rebuilt.
11d/11e: Wren is THE player body for the local player and the co-op partner (no dev switch); guards keep their bodies
(G68); gameplay unchanged (G38); G72 proportion fixes; the run's still-current decisions are recorded in master's
docs/DECISIONS.md from G161 (this file points there). Then the PR feature/operators -> master (not merged).

**D30 Wren goes into the game before Moth (2026-10-18).** Michael: "i want to move the completed character into the
game also before starting on the next one." He is merging all other branches (not operators) and changing the build
first. Asked who builds the integration, Michael: "This run, locally (Recommended)". So after the Wren block end:
step 11c merges Michael's merged base branch into feature/operators (only after he names it; ask with the native
multiple-choice UI if he has not), 11d builds the game runtime (new modules, tests), 11e puts Wren in the game behind
`?operator=wren` with GPU checks; then Moth (step 12, D24). The cloud runtime prompt (CLOUD-RUNTIME-PROMPT.md) is not
run; 11d reuses its rules and facts.

**D29 Desktop only (2026-10-17).** Michael's project decision, relayed from the locomotion session (its M21, commit
c22e816): "I want to focus on desktop only performance, ignore phones." Scope: drop phones entirely - no phone
budgets or `--phone` perf runs, no phone look or phone checks, no touch-control work; desktop pad first, then keyboard
and mouse. Asked how the operators run applies it, Michael: "Yes, drop phone LOD (Recommended)". So: the phone LOD,
its checks and its SPEC 6.4 targets are removed from the operator pipeline; hero, LOD0, LOD1 and LOD2 stay for the
desktop distance bands (LOD2 no longer serves phones). Done in step 11b (it rebuilds the LODs anyway); CLAUDE.md
platform line and definition of done and RULES.md updated now.

**D28 Rigid kit stays rigid (2026-10-17, during step 11).** Michael: "any attachments (magazines, knife etc) can't
be bent which they currently are. They are rigid and must be reflected that way on the character. Rethink positioning
of each item and ensure it is realistically reflected. Ask me questions if you need to."
- Rule: every rigid item (magazines, knife, holster shell, pod, medkit case, buckles, radio, PTT, mount plates, plates,
  throwables) keeps its true straight shape on the body: no shrinkwrap, curve or surface-conform deformation of the
  item itself. Soft carriers (pouch fabric, elastic, straps) may wrap the body; the rigid item inside or on them sits
  straight, with a standoff or mount where the body curves under it. Skinning: each rigid item is weighted to one
  bone (or one rigid blend) so animation never bends it.
- Michael, follow-up: "Consider the physical characteristics of each item before placing them". Placement starts from
  each item's real size, own design shape (a curved rifle mag keeps its design curve), weight, draw hand and path,
  retention, snag risk when climbing or crawling, and what it must not press into.
- Process (as D19-D20): a survey lists every rigid item, how it is built now and how bent it is; scratch renders show
  placement options for the items that must move; Michael picks; a step 11b builds the pick, then the Wren LODs and
  bakes are rebuilt and the step 11 sheets re-rendered.
- Options: `concepts/D28/` (D28-OPTIONS.md: survey, physical characteristics, options; LAYOUT.md: the full layout in
  four movement poses - prone crawl, rope climb, deep crouch, rappel seat - with interference renders). Michael asked
  "What are the most realistic and practical locations for a stealth operative, considering how they need to move
  freely?"; the orchestrator's principles: front flat enough to crawl, hinge zones clear, weight tight to the body,
  rigid items only on flat hard surfaces, back carries only the rifle mount, belt front centre clear.
- Michael's picks (2026-10-17): pistol mags "9 o'clock, socket to 8 (Recommended)" - two horizontal pistol mags on the
  left hip side at 9 o'clock, rows raised about 20 mm, on a moulded seat; the compact-gun sling socket moves back to
  about 8 o'clock (changes D25 / A41's slot). Sleeves "Outer thigh (Recommended)" - the three throwable sleeves move
  to the outer left thigh, straight (replaces D25's front pick); the knife on the outer-front thigh, handle up,
  left-hand draw. Knife "190 mm true size (Recommended)".
- Orchestrator's calls from the pose checks (no question needed): rifle mags 2, vertical, low on the chest plate (R1),
  true 178 mm with their design curve; drone pod rear-left on a flat saddle (D1), 20-30 mm higher or 10-15 mm further
  back so the knee-up crawl clears it; medkit stays soft (rear-right); cam pouch to the old front-left pistol spot;
  holster hipR and the rifle mount unchanged.
- Drone pod side (A88, step 11b): with the pistol mags at 9 o'clock and the socket at 8, the left rear belt has 117 mm
  free against the pod's 171 mm. Asked, Michael: "Pod rear right (Recommended)" - the hard pod rear right on a flat
  mount, the soft medkit on the right side (changes D25's sides).
- After step 11b (Michael, 2026-10-17): the 9 o'clock pistol mags' forward draw is blocked by the raised thigh in
  the game crouch - "Keep, reload anim handles it (Recommended)": they stay; locomotion's reload animation lifts the
  mag up and out (integration note). Gunmetal A86 - "Keep dark anodised (Recommended)".

**D27 Babylon's KTX2 decoder bundled (2026-10-17, during step 11).** Asked whether to add Babylon's KTX2 decoder
files to the project (the official Babylon decoder package, Apache 2.0, bundled locally, no CDN), Michael: "Yes, add it
(Recommended)". The decoder version matches the installed @babylonjs/core; the files live under vendor/ktx2 (or are
imported from the npm package via `?url`); URLConfig never keeps Babylon's CDN defaults. If a needed transcoder file
is only published on a CDN, it is not fetched at runtime - the step reports it. Done in step 11 fix round 1:
`@babylonjs/ktx2decoder@9.29.0` from npm carries the decoder and every wasm; nothing is fetched at runtime (A79).

**D26 KTX2 encoder installed (2026-10-17, during step 10).** Asked whether to install the KTX2 texture compression
tool, Michael: "Install toktx (Recommended)". The orchestrator installed KTX-Software 4.4.2 (Khronos, Apache 2.0) from
the official GitHub release `KTX-Software-4.4.2-Windows-x64.exe` (6.4 MB, SHA-256 1f323b0f...957fe, matching GitHub's
digest) to `C:/Program Files/KTX-Software/bin/toktx.exe` - an offline build tool, never shipped. Step 11 starts by
encoding every LOD to KTX2 and repacking the GLBs (closes A73).

**D25 Back layout and the left hip (2026-10-16).** Michael, on the re-plan's two calls: drone pod and medkit - "Hips,
keep game carry" (A39 confirmed: pod rear-left and medkit rear-right on the belt, the back flat for the game's upright
rifle, no game-code change); the game's compact-gun hip slot vs the throwable sleeves - "Sleeves to the front" (A41
replaced: the three throwable sleeves sit on the left FRONT of the thigh; the game's left-hip slot stays clear and keeps
its flush sling socket on the belt).

**D24 Build A2, without the guns (2026-10-16).** Shown the A2 scratch renders (scratchpad stealth/A2, A2.md), Michael:
"yes build a2, but create without the guns, they will be in game anyway"; rifle carry: "no gun needed, it will be in
game"; Moth: "Decide at step 12". So: Wren is built as A2 (one-piece premium suit, composite chest plate with three rib
segments and a slim back plate, magnetic buckles, chest rig with two rifle magazines, a gadget slot, knife and PTT,
thigh holster, left-thigh throwable sleeves, belt with pistol magazines, cam / mine pouch, one flush rappel ring, drone
pod, medkit and radio, lighter approach boots), with NO rifle and NO pistol modelled: the game's weapon models attach
in game. The holster is built empty (shaped for the game's sidearm) and the back plate carries a weapon mount point
where the game's carry slot attaches the long gun; its orientation follows the game's carry slots (assumed A36:
src/weapons carry slots today carry long guns upright on the back; revisit with locomotion step 25). Moth stays open
until step 12.

**D23 Concept A, made logical for the game (2026-10-16).** Shown concepts A (infiltration suit), B (two-piece) and C
(armoured skin), Michael: "I like A, but can you make it more logical based off the requirements of the game, for
example somewhere to holster pistol and store longer rifle on back? not fussed on rope attachment points, should be
tactical storage (pistol mags, rifle mags) and any other suggestions by you. must all be slimline, well designed,
practical for a stealth operative to use. this suit would be very expensive and should look it". Boots: "Lighter
approach boots". So: concept A's one-piece suit and slim segmented armour, with storage mapped to the game's loadout
(rifle on the back, pistol holster, rifle and pistol magazines, the gadget set in game/gadgets.ts, medkits), no
climbing sit harness or rope attachment points, premium materials and finish, new lighter approach boots. The
orchestrator's loadout proposal (A2) is rendered in scratch for Michael to confirm before the re-plan.

**D22 Stealth operative, not military (2026-10-16, after step 08).** Michael: "I'm thinking the current design is more
military style, whereas I want more of a stealth operative design. Wetsuit fitted suit, slim body armour, tactical
ammo storage/holsters. The type of design for someone that would need to remain agile and able to climb in tight
spaces/climb ropes, rappelling etc." Asked how to proceed: "Pause, options first"; Moth: "Decide after Wren's
options". So: the run pauses after step 08 (no step 09); a scratch options pass renders 2-3 whole-figure stealth
concepts for Wren (fitted suit, slim armour, low-profile storage, climbing / rappel harness); Michael picks; then
ART-DIRECTION, SPEC, PLAN and the step files are re-planned and the run continues. Kept from earlier steps unless the
pick says otherwise: hood and balaclava, the original goggle on its band (D20), the strap-2 head harness, gloves, and
every pipeline tool. Expected to be replaced: the combat shirt and cargo trousers (by the suit), the plate carrier and
belt (step 08, by slim armour, storage and a harness), and step 09's plan. Step 08's generators are committed for reuse.

**D21 Hero LOD use confirmed (2026-10-16).** Michael, after the hero / LOD0-2 / phone plan (SPEC 6.3-6.4) was
explained: "i do want hero version for the main menu and for any close up shots". Hero LOD (150-250 k triangles,
budget unchanged) drives the main menu and every close-up camera; gameplay uses LOD0-2; phones never download it.
Step 18's integration plan names the close-up cameras that switch to hero.

**D20 Goggle pick: the original housing, no flip; strap option 2 (2026-10-16, step 07).** Shown the scratch options
(goggles A wraparound visor, B twin pods, C faceted shell; straps 1-3), Michael: goggles - "I don't like any of them, the
original one looked better but it can't flip up, it would be impractical for stealth operative"; strap - "2 - Split
crown, hard pod". So: keep the original step 07 goggle housing (the D19 "more futuristic, less square" point is
withdrawn for now); remove the flip mount (D19 stands: stowed on the brow, over the eyes in use, no flip arm); the head
harness becomes option 2 (two crown straps forking from a hard brow plate to a hard sculpted rear battery pod,
low-profile cam buckles on the side straps). The goggle is held by a wide band through side lugs on the housing,
carrying the power line to the rear pod (from the options pass; assumed, A29). Scratch options and their script:
the session scratchpad `options/` (OPTIONS.md, opts.py), not kept in git.

## Assumed decisions (unattended run, D15)

Judgement calls made inside a step without Michael (RULES "Unattended run"): what, why, how to undo. Numbered A1, A2, ...
(a separate series from SPEC 4.3's proportion corrections A1-A7).

**A1 Cloth rest shape through Dynamic Mesh (step 03b).** Blender 5.2's cloth ignores the rest shape key (a sheet with a
0.6x rest key never shrinks, tested headless), so every garment simulated so far used its arranged start shape as the
rest shape, not the cut pattern: the step 3 bunching, baggy forearms and limp collar came from that. The pipeline now
turns on Dynamic Mesh and keys the pattern shape on at frame 2: the rest lengths and bend angles are the flat cut, and
the cloth keeps its own positions. Undo: set `rest_shape_key` again in `build_garment.py add_cloth` if a later Blender
honours it (the pinned version is 5.2.2).

**A2 Vertex mass 0.1 at full gravity (step 03b).** Near-real vertex masses (a 0.3 kg shirt: ~0.00004 kg a vertex, also
0.0001-0.01) make the solver throw the cloth off the body; 0.1 is stable and, with the true rest shape, drapes right.
Gravity stays 1.0 (`SIM['gravity']`). Undo: the `SIM` table in `garments/combat_shirt.py`.

**A3 Collision layer 3 mm, girths measured on it (step 03b).** The body collider was 4 mm thick and the cloth kept 3 mm
off it: 7 mm round the skin, about 4 cm of girth an 8 % ease never allowed, so the forearm seam could not close (gap
15 mm). Now 1.5 + 1.5 mm, and every measured girth is the girth of that surface, so the ease in a pattern is ease over
the body. Undo: `SIM['collision']` and the `GAP` lines in `build_garment.py`.

**A4 Combat shirt cut and cloth (step 03b).** Within art direction 6 (close fit under armour): the knit torso is cut 3 %
short in length as well as round (vertical slack in a knit buckles into horizontal ripples); the front is 2 cm longer
than the back for the chest (was 3 cm: a crease under the bust); the sleeve gets a forearm control point at its widest
girth; bending 0.3 knit, 3.0 ripstop, 8-12 under pockets, flaps, tabs and the elbow pad (sewn plies); the seam band
(seam vertices and two rings round them) is out of self collision so seams can close. Undo: `combat_shirt.py`.

**A5 Material values for the check limits (step 03b).** Measured albedo must sit in 0.02-0.06 linear (art direction 4):
ripstop 0.025 (was 0.021), Cordura 0.022 (0.016), loop 0.023 (0.019), binding 0.023 (0.020); the Cordura stays darker
than the ripstop round it. Coated metal roughness 0.58-0.68 (was 0.42-0.62: below the hard-part floor 0.55). The
check reads the 1st and 99th percentiles of each material's rendered albedo and roughness (emission renders, four
views), not node values. Undo: `materials.py`, `LIMITS` in `check_garment.py`.

**A6 Kit mapping of sewn details (step 03b).** The combat shirt builds kit item `combatShirt`; its elbow pads build
`elbowPockets`, the arm pockets and their flaps `armPocketL` / `armPocketR`; the blank loop panels, cuff tabs and zip
garages are parts of `combatShirt` (they hold nothing of their own). Undo: the `kit` keys in `combat_shirt.py`.

## Assumed decisions, step 04 (D15 unattended)
**A7** The Lab is a production-style build served by `vite preview`, not the dev server. Why: Babylon loads its shaders by
  dynamic import and the dev server returned the HTML page for them (black screen). Undo: none needed; the build takes 16 s.
**A8** The Lab reads the GLB with its own small reader (`glb.ts`), not `@babylonjs/loaders`. Why: no package install without
  asking Michael (RULES), and the export is one skin of plain triangle meshes. Undo: add the loader and drop `glb.ts`.
**A9** Lab materials are flat albedo and roughness factors (the means of the procedural materials) until baked maps exist
  (step 10); `export_gltf.py` flattens them. Undo: remove the FLAT table when step 10 exports textures.
**A10** The Lab's lighting rigs use high exposure (2-4.5) rather than bright lights, because the fabric albedo is 0.02-0.06.

## Assumed decisions, step 05 (D15 unattended)
**A11 Layer order and the tuck (deviation from step 05 Do 1).** Wren's garments build in the order base layer, combat
  shirt, trousers (`GARMENTS` in `export-gltf.mjs`). Step 05 Do 1 asks for the earlier layers as colliders in the
  simulation; the pipeline does not do that. Each garment is simulated against the body only; the earlier layers are
  resolved after the simulation: the garment is drafted over them with a fixed girth allowance per layer
  (`UNDER_LAYERS`, `build_garment.py` `allowance`), arranged clear of them, and after the sew and settle every vertex
  closer than one layer step (`LAYER_T`) to an earlier layer's outer face is pushed out and the region relaxed
  (`layer_push`). Why: Blender's cloth against a thin cloth collider broke the seams in test runs (colliding while
  sewing, the shirt's seams could not meet across the armpits, gaps 7-15 cm; colliding only in the settle, the
  push-out stretched sewn seams to 37 mm; gaps up to 149 mm on the trousers); girths measured over the simulated
  layers over-measured by 5-10 cm. The collider objects are still built; `SIM.layer_collision: true` (settle phase
  only) turns them on - that is the undo, once a solver handles cloth on cloth. The shirt is sewn before the trousers
  so its hem ends inside the trousers' pinned waistband (A15): the tuck comes from the order and the layer push.
**A12 One base-layer garment.** The compression top and the leggings are one garment (`base_layer`, kit `baseLayer`), two
  pieces in one simulation; the top is the shirt's block re-cut (negative ease, knit everywhere, flatlock seams, a mock
  neck about 1 cm taller than the shirt collar), and its hem laps over the leggings' waistband. Undo: split into two
  garment modules in `GARMENTS`.
**A13 Legwear gravity.** Leggings and trousers simulate at reduced gravity (0.3) and higher friction (4): the
  pipeline's vertex mass (0.1, kept for solver stability, A1) is far heavier than fabric, and legwear hangs from the
  hips - at full gravity the leggings slid 15 cm down the legs. Undo: the `SIM` tables of the two garments.
**A14 Knee pad pockets as a kit pouch.** `kneePads` (pouch, contents "knee pad", opening inside at the top) is added to
  Wren's kit for the internal knee pad pockets SPEC 5.1 names under the trousers; `baseLayer` is added as a garment.
  Undo: the two entries in `src/operators/kit.ts`.
**A15 Waistbands pinned; compression knit drawn on; soft-shell faired (step 05 fix round 1).** The leggings' and the
  trousers' waistbands are pinned to their arranged ring (drafted height, round the body and the layers) through the
  sew and the settle (`SIM.pin`): without colliding layers (A11) a band drafted over them rode on the bare skin with a
  layer allowance of slack and slid 6-7 cm. The pin stands in for the elastic's and the duty belt's grip. The leg
  block's rise is solved from the measured crotch path (front waist, under the crotch, back waist; `crotch_ease`),
  which replaced estimates that were 3-4 cm long at the front. The base layer is drawn onto the skin after the
  simulation (`SIM.cling`: projected to 3.5 mm off the skin and relaxed between the seams; the top's hem one layer out
  over the band): a mass-spring cloth bridges and ripples where a compression knit clings. The trousers' surface is
  Taubin-smoothed between the seams after the simulation (`SIM.fair`) to remove solver dents. Undo: remove `pin`,
  `cling`, `fair` and `crotch_ease` from the garments' tables.
**A16 Smooth layer push, bridged knit, tucked hem, inserts (step 05 fix round 2).** `layer_push` (A11) and the cling
  guard spread each push into a smooth bump (`build_garment.push_out` / `spread`: a decayed ring average, about 8 rings)
  instead of snapping vertices one by one, which left a stepped edge (dark dashes on the shirt front in raking light).
  The base layer's `cling` draws the knit onto a Taubin-faired copy of the skin (`bridge` 25) and then only pushes it
  1.5 mm clear of the real skin (`guard`), to bridge small features (the nipples are softened, not yet gone). The
  combat shirt's hem is drawn onto the base layer below the trousers' band (`SIM.tuck`): the free hem stood 3 cm proud
  of the lower belly and the trousers, pushed over it, showed its edge as a lip under the front band. The trousers'
  `fair` runs 40 Taubin passes and fairs the seam and hem lines along themselves (corners held), so the band edge and
  the fly are clean lines. The stretch-knit panels behind the knees are seamed-in inserts (details `inserts`: the
  region inside the seam takes the knit's material and stiffness, a raised seam allowance and a stitch row either side)
  rather than separate pattern panels in the leg block: the same look and stretch, without re-cutting the back panels
  and their seams. The seat reinforcement is one Cordura panel per side shaped to the back panel (patch `outline`).
  Undo: `tuck` / `bridge` / `guard` / the `fair` iterations in the garments' `SIM` tables; `inserts` in `trousers.py`.
**A17 Seat bridge and stitch shadows off (step 05 fix round 3; recorded by the orchestrator).** The trousers' back
  panels are pushed one layer step off a smoothed envelope over the under-layers (`SIM.bridge`, 150 passes) so the seat
  bridges the cleft and the sacral hollow instead of shrink-wrapping them. The trousers' stitch threads cast no shadow in
  renders (`stitchShadows: False` in the details): 0.36 mm threads on an ungrooved surface threw 5-10 mm spiky shadows
  under the grazing rake (the waistband "crinkle"). Render only; the glTF is unchanged, and the game's shadow maps
  cannot resolve sub-millimetre casters. Seam plateaus are ramped (`offsetSmooth: 3`, exported). Proper fix (LOG
  step 05 OPEN 6): a stitch channel in the offset map. Undo: `SIM.bridge`, `stitchShadows`, `offsetSmooth` in
  `trousers.py`.

## Assumed decisions, step 06 (D15 unattended)

**A18 Gloves and boots are fitted, not sewn (step 06).** Neither is cloth-simulated: a glove's fourchettes are a few
  millimetres wide and a boot is a hard, moulded shape, which Blender cloth cannot sew over fingers or hold as a last.
  `py/build_fitted.py` builds both in one stage (no `build_garment.py` / `garment_details.py`), listed in `FITTED` in
  `export-gltf.mjs`. Gloves (`garments/gloves.py`): the body's hand faces, subdivided twice, offset 2.2 mm off the skin
  and pushed clear of the base-layer cuff ("shrink-fitted panels", step 06 Do 1); panels are cut on that surface from
  the hand frame (wrist, knuckle line, palm normal from the finger curl). Boots (`garments/boots.py`): a last lofted
  from the foot's section hulls plus 4.5 mm clearance and 14 mm toe room, flattened onto a moulded sole (step 06 Do 2).
  Both leave the files a sewn garment leaves (`-sim.json` with `method: fitted` and a 0 seam gap - nothing is sewn by a
  simulation; `-sim.npz` with the shell; the item blend), so `operators:check` runs every other check on them unchanged.
  Layer order (A11): base_layer, gloves, boots, combat_shirt, trousers - the shirt cuffs and the trouser hems are
  pushed clear of the gloves' and boots' shells. The check gains a hand and a foot view so their materials are sampled.
  Suede and goatskin are shader-only (no CC0 scan; the step allows one only if a shader cannot reach the look).
  Undo: drop 'gloves' and 'boots' from `GARMENTS`, rebuild the shirt and trousers.
**A19 Panel cutting by level-set slice (step 06 fix round 2; recorded by the orchestrator).** `fitted.level_slice`
  cuts the fitted shell along each panel field's zero contour (boots: counter, toe cap, collar, eyestay, tongue, rand;
  gloves: knuckle, fingertip); crossings within 18 % of a vertex move onto the contour. Replaces the Newton snap, which
  left torn, sawtoothed panel edges. Undo: restore the snap in `boots.py` / `gloves.py`.
**A20 Overlays are stepped panels (step 06 fix round 2).** `fitted.split_step` gives each overlay its own vertices
  and a flat-shaded wall quad to its neighbour, so a panel ends on a real turned edge; stitches and hardware sit on the
  overlay top. Undo: drop `split_step` from the panel blocks.
**A21 Glove fit repair (step 06 fix round 3).** `untangle()` relaxes folded vertex fans before and after the overlay
  lift (folded fans pushed the solidify's inner wall out through the glove: the fingertip dot). The last finger segment
  is smoothed and re-cleared 1.3 mm off the skin (no nail print). Every fingertip is capped by leather with a U edge
  (10 mm on the nail, 22 mm on the pad), no seam at the tip; tip step 0.3 mm; overlays lift along smoothed normals.
  Undo: `gloves.py`.
**A22 Trouser hem drafted from the boot (step 06 fix rounds 1-2).** `build_garment.py` reads `-boots-sim.json` and
  drafts the trousers' `hem_circ` to the boot top girth plus one layer (26.5 cm on Wren, was a fixed 34 cm); `z_hem`
  is ankle minus 5.5 cm (was 1.5) so the settled hem laps the boot collar. Couples the trousers to the boots' build
  output. Undo: the fixed `hem_circ` and `z_hem` in `trousers.py`.
**A23 Boot materials and toe (step 06 fix round 2).** Suede albedo 0.027 (nap 0.033), sheen 0.22, tint 0.3, Specular
  IOR Level 0.2; nylon and rubber Specular IOR Level 0.3; rubber scuff 0.038. Reason: the stealth key lit up-facing toe
  caps near-white; closed by measurement (boot shafts 0.07 vs leggings 0.06-0.08; the toe-cap brightness is the key
  light on up-facing surfaces, bare feet light the same way). Toe: `TOE_ROOM` 14 mm, superellipse 2.0 medial / 1.7
  lateral, toe width 2 cm behind the tip 61 % of the ball. Undo: `materials.py`, `boots.py`.
**A24 Head items are fitted, not simulated (step 07).** The step file asks for the balaclava and hood "sewn and
  simulated on the head"; they are built by `build_fitted.py` like the gloves and boots (A18): a ray grid round the
  head and neck (`head_common.capsule`) whose vertices only move along their rays, stretched as a membrane over the
  skin and the layers (`head_common.membrane`: tension bridges the eye sockets, the mouth and behind the ears and tents
  over the nose; low cling on the face, so no face is modelled under the knit, D4), the hood a looser membrane over the
  balaclava, both cut along field contours (`level_slice`). Reason: a knit this tight on a face does not drape, and
  Blender cloth on the face's concavities is the failure the gloves hit (A18); folds that matter (the rear channel's
  gathers, the strap dents) are placed from the kit that makes them. The head kit is hard parts and webbing laid by
  rays on the hood surface. Two items in `GARMENTS`, after the trousers: `headwear` (kit hood + balaclava) and
  `head_kit` (headHarness + the rest). Undo: a sewn `garments/hood.py` through `build_garment.py`.
  Fix round 1 (item 7) tried that undo for the hood (`py/trials/hood_sim_trial.py`, the fitted hood's three panels
  flattened as the rest shape, sewn, balaclava and shirt as colliders, six runs): pinned, it blew apart at frame 2;
  unpinned, the flat dome panels pulled short (seam gap 98 mm at frame 40) and 2359 of 2604 sampled vertices went
  inside the balaclava. The hood stays fitted; LOG.md "Step 07 fix round 1" has the numbers.
**A25 Base-layer mock neck drawn in under the head items (step 07).** The step 05 base layer's mock neck flares up to
  26 mm outside the shirt collar at the nape (through the collar, measured 0.079 vs 0.052 m at z 1.45). The headwear
  stage draws its render mesh, stitches and shell back to 4 mm off the skin above the collar line (blended in over
  25 mm, inside the collar), so the balaclava and hood are not pushed out by it; 19k vertices move. It is covered by
  the balaclava and hood everywhere it moved. Undo: drop `tame_mock_neck` in `headwear.py`; the real fix is the base
  layer's neck band (follow-up).
**A26 Lens material class (step 07).** The goggle lenses are coated glass: glossy (roughness 0.06) with a thin-film
  coating and the emissive glow (D13). The check's fabric/hard classes cannot hold them, so `check_garment.py` gains a
  third class `lens` with its own roughness limit 0.02-0.3 (albedo not judged); no existing limit changes. Three head
  measuring views are added (front left, back left, front low). Undo: tag the lens `hard` and accept a frosted lens.
**A27 Head cable data measured (step 07; partly superseded: see the note at its end).** Kit data cable lengths follow the routed builds: goggle cable 0.28 m (was
  0.4) with clips at 0.09 and 0.18 m; it runs into the mount shoe and the mount carries power to the goggle through its
  contacts (so flipping the goggle never pulls the cable). Earpiece cable 0.44 m (was 0.27) from a plug at the left
  collarbone (the PTT arrives in step 09): collar clip 0.03, under the balaclava edge 0.17, held under the balaclava up
  the neck 0.3 (every free span under MAX_CABLE_SPAN). The hood rides over it (a soft ridge on the left of the neck).
  Undo: `kit.ts`.
  Note (round 4 checker): the goggle cable no longer runs to a mount shoe (no mount since D19 / D20; see the A29 update);
  the earpiece cable's 0.44 m comes from a routing bug - it passes through the neck to the right side and back (step 07
  OPEN, steps/07-fixes-r4.md); a direct collarbone-to-ear run is about 0.19 m.
  Corrected in step 09: the earpiece cable runs from the PTT's top (on the left shoulder strap at the collarbone) under
  the hood skirt and up the left of the neck to the left ear, every point on the near side; 0.225 m with the collar
  clip at 0.03, the balaclava edge at 0.11 and under the balaclava at 0.17 m (A65).

**A29 Goggle band, hard pod and the two positions (step 07 fix round 1, PART B; D19, D20).** The band is assumed from
the scratch options pass (D20): a 22 mm elastic band (1.8 mm) through a D-frame lug on each side of the original square
housing runs round the back of the head over the harness; it takes the convex hull of the head section (an elastic
band under tension bridges hollows) and passes through a channel under the battery pod. It carries the goggle cable:
pod outlet (left, top) along the band's outer face under three webbing keepers to the left lug, 0.26 m in use
(keepers 0.07 / 0.14 / 0.21 m; kit data). Two positions: in use (the build's pose, exported and checked) and stowed
(the goggle slid up 44 mm onto the brow, tipped back 16 degrees, resting on its eyecups 1.6 mm off the hood; a rigid
transform `stowM` on the goggle parts, the band and cable rebuilt for that pose and hidden from export and checks).
Further calls: the battery pod is the harness's hard rear shell (D20 "no soft cradle"), so the battery retention strap
and its hook-and-loop tab are gone (`batteryStrap` removed from Wren's kit; Moth's untouched until step 13); the
dovetail rail on the housing top went with the mount; the hood's cord lock moved to the centre line between the two
crown straps (CORD_X 0.0, channel 6 mm higher above the pod). Undo: `garments/head_kit.py` (`band`, `STOW_*`),
`head_common.straps` (forks), `kit.ts`.
Updated after fix rounds 2-3 (recorded by the orchestrator from the round 4 checker): the band is no longer a convex
hull but a relaxed strip (`_relax_band`: shrinks onto hood + face-opening hem + harness, per-edge ray collision, may
press 0.8 mm into the hood, pinned at the lug bars and a guide point under the pod, the hood dented under it); each end
is one wrap-and-return webbing with a bar tack; the goggle cable is 0.29 m with keepers at 0.07 / 0.14 / 0.22 m and
plugs into the housing side above the left lug; the cam buckles sit 32 mm behind the brow plate (was 50); the chin
buckle sits on the left riser at the jaw, 51 mm below the eye line. Standoff metric: the band underside centre over
the contact run only, measured over hood + hem + harness (in use 2.0 mm, stowed 2.5 mm).
**A30 Twelfth check view (step 07 fix round 3; recorded by the orchestrator).** `check_garment.py` gains a view of the
  right wrist from below, looking up the sleeve: the longer hood skirt (A31) hid the base layer's compression knit in
  the head items' views (2547 px at SKIRT_BACK 0, 30 px at 10 mm, limit 150); this view sees 855-885 px of it under the
  shirt cuff. No limit changed; albedo and roughness are sampled from the shader inputs, so an added real view cannot
  hide an out-of-band value (round 4 checker). Undo: drop the view and shorten the skirt.
**A31 Hood skirt lower at the nape (step 07 fix round 3; extends A25).** The hood skirt ends 10 mm lower at the back
  (`SKIRT_BACK`, `skirt_cut`), is re-faired after the push-out from the shirt mesh, and `tuck_collar` draws the shirt's
  render mesh inside the skirt to a per-vertex edge height (1251 vertices; the shirt is not rebuilt), so the nape shows
  the skirt's clean hem. Undo: `SKIRT_BACK` 0 and drop `tuck_collar` in `headwear.py`.
**A32 Carrier and belt are fitted items (step 08; extends A18, A24).** `carrier` and `belt` are `FITTED` items after
  `head_kit` (`py/garments/carrier.py`, `belt.py`, shared geometry in `torso_common.py`): rigid and tensioned parts laid
  on the shirt and the trousers by rays, not cloth-simulated. Each plate bag is a rigid curved slab whose tilt,
  horizontal radius and vertical bow are searched to rest on the shirt's high points with the least mean gap (the plate
  bridges the hollows: front tilt 3 deg, bow 0.9 /m, gap up to 58 mm over Wren's upper chest, which is real for a
  plate resting on the bust). Straps and bands follow the convex hull of the pressed surface (a loaded strap runs
  straight between its anchors). Undo: drop the two items from `GARMENTS`.
**A33 The shirt and trousers are pressed, not re-simulated (step 08 "re-settle the shirt with the carrier as a
  collider").** `torso_common.compress` moves every shirt vertex that lies above a part's underside in to 0.3 mm under
  it, at most 2.5 mm (2 mm for the trousers under the belt) and never closer than 1.6 mm to the layer below, the dent
  eased over 10 mm; the shirt's stitches and zip follow. Why: Blender cloth-on-cloth collision tore the seams (A11), and
  re-simulating the shirt would mean rebuilding the trousers and head items over it. The pressed area and the few
  vertices where a part sits deeper than the fabric can give (under the bags' tucked cummerbund ends) are in the sim
  report (`shirtPress`, `trouserPress`). Undo: skip `compress` (the parts then sit on the unpressed fabric).
**A34 Wren's harness is the carrier's shoulder straps plus the belt; carrier layout (step 08).** The kit has no
  separate belt harness for Wren, so none is built (a strap needs two anchors and a job, SPEC 1). The front plate's top
  is at 1.354 m (cut high, about 5 cm under the throat): the step 07 earpiece plug at the left collarbone sits just
  above its shooter's cut and must stay clear (measured `plugClearM`). The straps run 94 mm off the centre line at the
  plates and 118 mm over the shoulder, so their inner edges clear the hood skirt (`hoodClearM`) and the plug. The
  cummerbund's ends pass under the front bag's sides and close on hook-and-loop under its lower flap (the "front flap").
  Undo: move the plate top and strap lines in `carrier.py` (`fit` arguments, `x_f`, `x_t`, `x_b`).
**A35 Kit additions and hand-overs (step 08).** New kit item `carrierRelease` (the quick-release cable: SPEC 3.2 /
  ART-DIRECTION 3 ask for it and every built part needs a kit entry). The radio's antenna (bent down, elastic loop) is
  built here with the radio; step 09 adds the radio cable and the PTT to the radio's top connector. The drop-leg hanger
  (kit `dropHanger`) is left to step 09 with the holster. Undo: remove the item from `kit.ts` and the loop from
  `carrier.py`.

## Assumed decisions, the A2 re-plan (D22-D24; planner, recorded by the orchestrator)
**A36 Weapon mount orientation (from D24).** The back plate's mount follows the game's carry slots: long guns upright,
  muzzle up, backC on the spine, backL / backR 7 cm either side, splayed 0.08 rad (carrySlots.ts, weaponModel.ts).
  Revisit with locomotion step 25. Undo: re-aim the mount frames.
**A37 The suit replaces the base layer (step 08a).** One garment, `suit`, first in GARMENTS, built from base_layer.py's
  top and leg blocks with `cling`. Gloves and boots are rebuilt over it: thumb loops and sleeve cuffs under the glove
  cuffs, ankle cuffs inside the boots. Why: no base layer would ever show (the suit has its own mock neck and cuffs),
  and it is one layer fewer to simulate and push. base_layer, combat_shirt, trousers, carrier and belt leave GARMENTS;
  their modules stay for Moth and for reuse. Undo: put base_layer back first and build the suit over it with one more
  UNDER_LAYERS allowance (4.1 mm girth).
**A38 Suit cuff inside the boot (step 08a).** A bonded ankle cuff about 9 cm above the ground, at least 25 mm inside
  both the step 06 collar and the 09b collar (12-13 cm). A22 (trouser hem over the boot collar) no longer applies, and
  09b rebuilds from the boots on, not the suit. Undo: a gaiter cuff over the collar, which needs the suit after the
  boots in GARMENTS.
**A39 Back-carry lane.** The game's upright back guns (BACK_X 0.07, butt 0.40 m below the chest joint, CARRY_GAP 12 mm,
  `rig.backGear`) need the back flat at about |x| <= 0.10 m from the belt to the shoulders. Only the plate, the
  recessed radio, the mount receiver and the flush rappel ring sit in it. The drone pod moves to rear left on the belt
  and the medkit to rear right (A2 had both low on the centre-left back, placed round its diagonal rifle). Undo: if
  Michael chooses a diagonal back carry (a game change), put them back where A2 had them.
**A40 Weapon anchors and the empty holster.** The mount is a flush gunmetal receiver with frames `weaponMount.backL /
  .backC / .backR`. The holster cavity fits the largest thigh-slot sidearm in weaponDefs.ts (pistol, fiveseven,
  pistolSd), open at the muzzle, retention hood shown closed, frame `pistolHolster` at the game's thigh slot. All frames
  go in the sim reports and, from step 10, into every LOD as glTF empties; the back-plate standoff `backGearM` is
  reported for `rig.backGear`. Undo: drop the empties.
**A41 Sling slot vs the throwable sleeves (superseded by D25: sleeves on the left front thigh).** The game hangs a compact gun at the left hip, 3.5 cm outside the thigh,
  where A2's sleeves sit. Built as A2, with a flush quick-detach sling socket on the belt at the left hip as the slot's
  anchor. The overlap is an integration item for step 18 and locomotion step 25. Undo: move the sleeves to the left
  front thigh.
**A42 No IR strobe on Wren.** It is not in A2 or in D24's list. ART-DIRECTION 3's strobe stays for Moth. Undo: a flush
  strobe on the back plate's top edge (kit item `strobe`).

## Assumed decisions, step 08a (stealth suit; implementer)
**A43 (superseded by A48, step 08a fix round 1) The suit's waist is a sealed lap, not a sewn seam.** The top and leg blocks keep the base layer's lap (the top's
  hem over the leggings' inner band, which stays pinned and hidden), and the lap is sealed under a 10 mm bonded waist
  tape: garment_details `lapSeal` draws the top's edge down onto the leggings over 12 mm so the tape lies flat over a
  feathered edge. Why: the pipeline sews equal runs, and the top's hem and the leggings' top differ in length round the
  body; sewing them needs a new waist block. Undo: draft a waist block whose top run matches the top's hem and sew it.
**A44 Suit zones as pattern-space inserts on the existing block.** The raglan block has no separate yoke or side panel,
  so the shoulder yoke is the sleeve cap above half the raglan length, and each underarm vent is two inserts (front and
  back panels) meeting at the side seam; elbow, inner-elbow, rear-shoulder and forearm zones sit on the sleeves, knee
  grip and the back-of-knee vent on the leg panels, the seat on the back leg panels (trousers' `seat_outline`). Undo:
  split the panels into real yoke and side panels in a new suit block.
**A45 The bust is relaxed on the body under the suit (step 05 OPEN 1).** `suit.prepare_body` smooths the skin inside
  5.5 cm of each breast's most forward point (25 passes, inward only) before the suit is measured, so the compression
  suit holds one smooth form. The changed body is saved in the suit's blends and every layer after it is built over
  it; the body build itself is untouched. Undo: drop `prepare_body` from suit.py.
**A46 The balaclava tucks inside the suit's mock neck.** With no base layer and no shirt, the suit is both the mock
  neck the A25 draw-in acts on and the collar the hood skirt laps over (`headwear.collar_layer`, `mock_layer`); the
  suit's tapes, zip and garage follow the collar's draw-in at their nearest collar vertex. Undo: build the balaclava over
  the suit collar and drop the draw-in for the suit.
**A47 Material classes on the suit.** The seam tape is fabric (a cloth-backed laminate tape, roughness 0.74); the grip
  print is hard (rubber, roughness 0.64-0.72); the zip slider and puller are the gunmetal anodised finish. Undo: re-tag
  `operators_class` in materials.py.

## Assumed decisions, step 08a fix round 1 (fixer)
**A48 The suit's waist is one flush bonded seam (replaces A43).** The leggings lose their waistband and become the waist
  block: suit.draft drafts the top's hem at the leggings' top height (z_waist - 9 cm), splits it at the centre (corner
  `hemC`) and sews each half to one leg panel's top run (seams waistFrontL/R, waistBackL/R, style bonded, the 8 mm
  side-seam tape). The leg tops are solved to the hem halves (hip_split and the top hip ease, 4 passes: 21.4 cm each).
  No lap, no `lapSeal`, no cling lap. With no band the crotch gusset is pinned on its arranged diamond (A15's pin) and
  gravity is 0.1. The mock-neck collapse this first caused is fixed by A51 (the "45-50 mm centroid drift" is not a
  drop: the panels settle within 1-2 cm of the base layer's heights; the drift figure is dominated by the longer legs
  rising off their drafted hem). Pinning the collar tore its seam (44 mm); a pinned seam row is not possible in the
  pipeline (a pinned vertex's rest shape is its arranged position). Undo: restore A43 (the step 08a implementer's lap
  draft and SIM; suit.py is not yet in git).
**A49 The hood skirt laps 40 mm over the suit's mock neck (24 mm over a shirt collar), and the suit's A25 draw-in acts
  only under the skirt.** headwear `skirt_lap` / `SKIRT_LAP_SUIT`; tame_mock_neck blends the draw-in in from 4 mm inside the
  skirt edge (SKIRT_BACK lower behind the neck) to full 12 mm higher. Why: at 24 mm the zip garage and puller and the
  crumpled nape tape sat below the skirt; drawn in from 6 cm below the neck the visible collar crumpled. The garage,
  slider and puller sit in the collar's top 2.4 cm. Undo: skirt_lap 0.024 for the suit and the old z0 / z1 blend.
**A50 Suit zones redrawn (fix round 1, item 4; A44 kept).** The yoke is a band 5.5 cm either side of the shoulder line
  from the neck to a rounded end on the shoulder point (A2-chest), its lines running into the raglan seams; the rear
  shoulder is a closed ellipse on the sleeve back below it; each underarm vent is one ellipse centred on the side seam
  (its halves the front and back inserts). The abrasion weave is coarser (1.4 mm), a shade lighter (0.034) and matter
  (0.92) so the yokes read apart from the shell. Undo: the A44 rectangles and the 0.9 mm weave.
  A45 is extended to the abdomen: suit.prepare_body relaxes the front of the torso between the hips and 12 cm under the
  chest joint (Taubin pairs, 90 passes, at most 8 mm in and 15 mm out; the shipped body is the prepared one).
**A51 The suit's waist seam follows the leggings' rise, and the top is cut 4 % longer (fix round 1; A48 kept).** Each
  half of the top's hem is drafted on the leg top's own rise profile (front -3.5 cm, back +5.5 cm at the centre,
  solved by A15), and the leg tops use a smoothstep profile (legwear `top_curve: 'smooth'`), flat at the side and at the
  centre seams: the waist seam is drafted level on both sides, so it no longer pulls the top's front down to a V at
  the centre front or folds a 5.5 cm excess into a pinch at the centre back. The top is cut with `knit_ease_v` +0.04
  (suit `TOP_CUT`; the base layer's is 0): a free compression top shortens about 12 % along its length in the
  mass-spring knit, and held at the waist it pulled the neckline down and laid the mock neck over (collar top 1.447 m
  -> 1.460 m, standing). The rear-shoulder, yoke and vent outlines meet the seam tapes: an insert tape now stops 0.55
  tape widths from a seam (was 0.75, a gap where an outline meets a seam at a shallow angle) and the yoke's lines
  flare out at 45 degrees into the raglan seams. The abdomen relax (A45) is plain Laplacian (200 passes, clamped 15 mm
  out / 8 mm in, 4 mm slide) up to 2 cm above the chest joint (Taubin pairs kept the 5-7 cm rectus ridges), and the
  lumbar groove is filled outward only (at most 10 mm, 5 cm either side of the spine). Undo: straight hem halves,
  legwear's t^2 profile, knit_ease_v 0, the 0.75 clearance, the Taubin abdomen pass.
**A52 The covered-material rule for the `sampled:` check (step 08a fix round 2, item 4; assumed).** A material may skip
  `sampled:` / `albedo:` / `roughness:` in a later item only if it is in the explicit `COVERED` table
  (scripts/operators/py/covered.py), which names its owner, the item that covers it and why: `gunmetal` (owner suit,
  covered by headwear: the zip slider parked in the garage under the hood skirt) and `suit thumb loop elastic` (owner
  suit, covered by gloves: the loops under the glove at the thumb web). The skip applies in the covering item and every
  item whose `under` list holds it, nowhere else. It holds only if the material passed in its owner's own check JSON
  (`ownCheck:<name>`: at least minPixels sampled there, its roughness check passed, and its albedo check where its class
  is judged; gunmetal is class `hard`, which has no albedo limit); a missing JSON or an unsampled or failing material
  fails. In those items a new check `covered:<name>` counts the material's pixels over the views and must be 0: a
  covered part that shows is a clip or a gap and fails. Every other material keeps minPixels 150; LIMITS are unchanged.
  Why: no real view of the dressed stack sees the slider (checker probe, 0 of 120 views), so A30's route (a real view)
  does not exist. Watch: 08b hardware that reuses the material name `gunmetal` would count against `covered:gunmetal`
  from headwear on; give the suit slider its own material name then. Undo: delete COVERED's entries.
**A48 amended (fix round 2, item 1).** The pinned gusset bridged the crotch more than the cling's 25 mm reach and stayed
  proud of the body (a bulge with an under-shadow at full figure). The cling now reaches 70 mm for the gusset panel
  (`SIM['cling']['reach_panels']`, build_garment `cling`), so it is drawn onto the faired skin with the leg panels round
  it after the simulation. The pin stays (it is what holds the suit up). Laying the gusset onto the skin before pinning
  was tried: its edges then no longer met the leg panels and the gusset seams stayed 12.4 mm open.
**A48 amended again (fix round 3, item 1).** Two stacked lumps of excess cloth stood up to 19 mm off the skin on the
  centre front seam above the gusset (probe: z 0.80-0.84 m, 12-19 mm off the real skin), with a pinch between them.
  After the cling a membrane zone (`SIM['cling']['zones']`, build_garment `membrane_zones`) relaxes the front of the
  crotch (|x| < 7 cm, from 2 cm above the crotch to 6 cm under the waist joint, 2 cm falloff) as one taut surface, 60
  passes, held 3.5 mm off the cling's faired skin and 1.5 mm off the real skin, and draws any vertex more than 3 mm
  over the standoff back in (seam vertices too). The pin, the gusset reach and the seam gap are unchanged. An abdomen
  zone (round 3 item 4) was tried and dropped (see LOG.md Step 08a, Fix round 3).
**A49 amended (fix round 3, items 2 and 3).** The suit's mock neck top is 23 mm lower at the front than at the nape, so
  the skirt's 40 mm lap under the highest point covered only 16 mm of the collar at the front and the zip garage stood
  12 mm below its edge. Over the suit the skirt now ends `SKIRT_FRONT_SUIT` = 20 mm lower at the front (headwear
  `skirt_cut`, eased in from the sides). The zip is parked higher (path from 4 mm under the collar top, slider at 5.5 mm,
  garage 20 mm long at 9.5 mm). In `tuck_collar` every other suit mesh (zip, zip tape, slider, garage, seam tape)
  follows the hero's eased tuck (nearest hero vertex within 1 cm) before its own tuck. The skirt's 14 mm edge band is
  drawn in to 2.6 mm off the suit's render mesh and faired (3 rounds), so the edge lies on the suit all round.
**A52 amended (fix round 3, item 5).** Tightened, nothing loosened: check.mjs checks each item after the items in its
  sim report's `under` list (suit, gloves, boots, headwear, head_kit), so the owner's report is this run's; and
  `ownCheck:` fails when the owner's check JSON is older than the owner's `-sim.json` (a stale report). Dry run:
  `python scripts/operators/py/covered.py` (the case "owner JSON older than its sim JSON" fails). No LIMIT changed.

## Assumed decisions, step 08b (composite armour and harness; implementer)
**A53 The armour is one FITTED item, `armour`, after `head_kit` (extends A32).** `py/garments/armour.py` builds the
  chest plate, three rib segments, the back plate (radio recess, antenna keeper, weapon mount), the shoulder and side
  straps and their magnetic buckles (`py/garments/mag_buckle.py`) over `wren-suit-hero`, then presses the suit in
  under them (`torso_common.compress`, A33; the suit's tape and zip follow). The step 08 carrier.py / belt.py stay in
  the tree for Moth and as reference; nothing in GARMENTS.wren runs them. Undo: drop `armour` from GARMENTS.wren.
**A54 How a plate is moulded.** The suit (with its tape and zip) is sampled as a height field (3 mm, rays along Y);
  narrow features under about 2 cm (the bust points, tape ridges) are bridged on the surfaces that face the ray (a
  15 mm window maximum, eased), each row's outer envelope is blended 30 % back toward that floor (the plate bridges
  the sternum hollow and the spine groove and follows the broad forms), smoothed and never allowed below the fabric's
  pressable depth (at most 0.5 mm, measured on the suit itself, with 0.4 mm slack). Each plate is a shell offset along
  that faired surface's normal. Why: a rigid slab (A32) stood up to 58 mm off the bust; the step asks for moulded
  plates with mean gaps under 6 mm. Undo: `FOLLOW`, the window and `SINK` in armour.py.
**A55 Rib segments lap like shingles.** Each segment is a flat 5 mm composite panel tilted out from its top (tucked
  0.7 mm under the one above, on the internal web) to its bottom band, which stands 5.8 mm out over the next one's top
  (14 mm overlap, the lower one narrower); the chest plate tilts out over its lowest 44 mm the same way. The internal
  elastic web is two 25 mm straps under the segments (fully hidden, in the visible strap material so no hidden
  material needs a COVERED entry). Undo: `LAP`, `BAND`, `RAMP`, `ribs` in armour.py.
**A56 Plate edge and corner family.** Every plate edge is a 2.8 mm flat ledge under a moulded rubber trim (a rounded
  U section, 0.6 mm over both faces, 1.2 mm out from the rim) and a 5 mm chamfer 3 mm deep up to the face. Corner radii
  9 / 18 / 36 mm (1:2:4) on every plate, segment, the radio recess and the receiver bar. Undo: `LEDGE`, `CW`, `CD`,
  `R1-R3`.
**A57 The weapon mount is a bonded receiver bar with keyhole sockets.** A 168 x 34 mm, 1.6 mm gunmetal bar on the
  back plate's spine (z 1.157-1.191 m), three keyhole sockets through it at x = +0.07 (backL, the wearer's left; game x
  -0.07), 0 (backC) and -0.07 (backR), each socket and frame splayed 0.08 rad outward (muzzle up). Frames
  `weaponMount.backL/.backC/.backR` are empties in the blend and in the sim report (`weaponMount`): origin on the bar
  face at the socket, Z = muzzle up (splayed), Y = straight out from the back (the game holds the gun's thin side flat
  to the back), X = Y x Z. `backGearM` is the bar face's standoff behind the suit on the spine (about 22 mm).
  A boolean-cut inlay was tried first and smeared the shading; the bar sits on the face instead (1.6 mm proud, still
  flush in the sense of A40). Undo: `bar_ol`, `SLOT_X`, `SPLAY` in armour.py.
**A58 Strap anchors at the lane's edge (A39).** The shoulder straps end bonded on two top tabs of the back plate at
  |x| 0.093-0.119 m and the side straps end bonded on the back plate's sides at |x| 0.09-0.10 m: the plate's edges,
  2.4 mm proud of it, at the edge of the about-0.10 m back-carry lane. Inside |x| < 0.09 the lane holds only the plate,
  the radio recess and the receiver bar. Undo: `x_b` and the side strap's `pb` in armour.py, `bk_ol`'s tabs.
**A59 One metal finish, its own material name.** Every metal part here (buckle halves, receiver bar) uses
  `hardware gunmetal`: the same anodised finish and colour as the suit zip slider's `gunmetal` (materials.anodised,
  0.05 / 0.052 / 0.056), under another name so A52's `covered:gunmetal` (the slider hidden in its garage) still holds.
  Undo: rename to `gunmetal` and drop the slider's COVERED entry.
**A60 Harness geometry.** Shoulder straps 25 mm bonded laminate, 2.4 mm, from a magnetic buckle on each chest plate
  tab (centre 90 mm off the centre line) over the shoulder (118 mm) to the back plate tab (106 mm); the left one has
  three flat moulded keepers on its neck-side edge, 0.07 / 0.20 / 0.30 m from the front buckle, for step 09's radio
  cable. Side straps 22 mm, 2.2 mm, at z 1.163-1.185 m, from a buckle on the chest plate's side (x 94 mm) round under
  the arm to the back plate's side. Every buckle is mag_buckle sized from its strap width. Undo: the constants in
  armour.py.

**A61 Plate fairing and strap runs (step 08b fix round 1).** Amends A54 and A60. (1) Over each bust apex the floor a
  chest plate rests on is raised by a quadratic dome fitted to it within 30 mm of the apex and lifted clear of it
  (`Field(caps=...)`, lift about 1.8 mm, faded out by 50 mm): a rigid shell bridges the apex as one convex form. (2)
  The back plate's rows below z 1.205-1.245 m are faired across x: each row's convex envelope (the spine groove
  bridged), eased, lifted clear of the floor by a row constant, rows eased together (`Field(fair=...)`), so the bottom
  band and the receiver bar read straight and parallel. (3) Straps are laid on the plates: a shoulder strap runs from
  inside its buckle's near half straight up the buckle's axis on the face (the face's frame) and lies flat on the back
  tab the same way, easing into the hull path over 15 mm (position) and 25 mm (frame); a side strap's rows hold the
  plates' faces, the chamfer chords and the trims every 1 mm and are never eased inside that hull; its end is bonded
  past the near half's centre. Strap inner face 0.4 mm over a plate (`CLR`); `strapIntoPlateMm` in the sim report
  (ray parity, buckle footprints left out). (4) The splayed keyhole sockets are cut upright on the bar's grid and then
  turned whole with their neighbourhood (`twist`). Undo: drop `caps` / `fair` / `tw`, restore the old pinned runs.
  Note (round 2 checker, recorded by the orchestrator): the chest plate's max gap 12.3 mm sits on the lap band under the
  bust (-0.111, 1.161), outside the sternum hollow the step's wording names; accepted for consistency with round 1's
  10.45 mm on the same band, which rib 1 hides.

## Assumed decisions, step 09 (storage, holster and cables; implementer)
**A62 The empty holster at the game's thigh slot.** The frame `pistolHolster` is the game's sidearm frame computed by
  weaponModel.ts's rule with Wren's operatorBody.ts numbers: the sidearm's extents centred 0.25 m below the right hip
  joint, its inner face CARRY_GAP (12 mm) outside rig.thighOuter (max(r0, 0.95 r0 + 22.5 mm) = 95.8 mm from the hip
  joint), muzzle down, top forward: (-0.2126, 0, 0.6024). The shell's cavity holds the slide and frame of the widest
  sidearm (31 x 57 mm, the five-seven), open at the muzzle end so the suppressed pistol's barrel passes. The detailed
  thigh is thinner than the game's capsule thigh, so the shell sits on a moulded laminate platform (a wedge from the
  leg bands to the shell's flat back) and the frame is moved in toward the thigh only as far as the platform's
  thinnest point allows (offset reported in the sim report, limit 1 cm). The holster's outer face stands 4.6 cm off
  the suit: the cavity and the slot fix it; it is the one exception to ART-DIRECTION 9.1's 2.5 / 4 cm rule.
  Integration item (locomotion step 25): the game centres each sidearm's extents at the slot, so the pistol's slide
  rear sits 5.75 cm lower than the suppressed pistol's; anchor the sidearms at the holster mouth instead. Undo:
  `leg_kit.py` SLOT and `delta`.
  Step 09 fix round 1: the shell is moulded to the sidearm (a lofted section: 31.6 mm across at the centre, the outer
  face crowned 2.5 mm toward the slide's top and the trigger guard (31.1 mm at +-15 mm), a trigger-guard step 56 mm
  below the mouth where the rear edge steps 17 mm forward, the outer face tapering 2.2 mm to the open muzzle end,
  corners from the 9 mm family), 2.2 mm wall, 155 mm long; a moulded hood cap closed over the whole mouth with an arm
  down the outer face to a gunmetal pivot and a gunmetal thumb release. The holster and its frame sit 9 mm down the
  thigh from the slot (`DROP`), the frame within the 1 cm tolerance; standoff in the sim report.
  For Michael / locomotion step 25 (checker 09-fixes-r1 item 6): the game's thigh slot sits CARRY_GAP outside the
  capsule thigh (rig.thighOuter 95.8 mm), about 9 mm fatter than Wren's detailed thigh (the shell's back is 9.6 mm off
  the suit before the platform). Move the game's thigh slot in by about 9 mm (or size it from the detailed thigh) and
  the holster can sit about 3.5 cm off the suit instead of about 4.5 cm.
  Round 2 (recorded by the orchestrator): the right holster hanger enters the platform through its top edge and ends
  inside the platform's back (hidden), 5.8 mm behind its front face. Undo: `leg_kit.py` `bot_R`.
**A63 Throwable sleeves: oval, 30 x 21 mm.** Each double sleeve holds two oval canisters (25 x 18 mm) end to end, the
  sleeve 30 mm across and 21 mm out from the panel, so with the panel and the band it stands under the 2.5 cm pouch
  rule (sim report `standoffFromSuitM.throwableSleeves`). Step 09 fix round 1 (was round, 30 mm, 3.4 cm off the suit).
  The caps keep their touch codes (knurled ring, dome, two ridges), ovalised with the canister. Undo: `leg_kit.py`
  `R_N` = `R_S`.
**A64 The gadget slot over the right bust.** The chest plate's upper right is taken by the right shoulder buckle on its
  tab and the right side buckle below; the slot sits between them beside the magazines (centre x -0.092, z 1.245), 13
  mm deep (three 3.3 mm discs). Undo: `chest_rig.py` GAD.
**A65 PTT, earpiece plug and cable keepers.** The PTT clips over the left shoulder strap's inner edge at the
  collarbone (10 mm over it) with both sockets on its top: the earpiece plug moves out to x 0.085 (head_kit PLUG_X) and
  chest_rig carries the plug and the cable's last 4 cm onto the PTT socket (about 11 mm). head_common.ray_in gains
  `far`: the earpiece cable's rays stop at the neck axis (far 1.0), so they never find the far side (07-fixes-r4); the
  run from the collarbone to the collar hugs the suit, each ring stays 1.4 mm out of the skin, and the cable ends on the
  earpiece's outer face. The left strap's three keepers and the antenna keeper become moulded rubber bridges over the
  cable and the stub antenna (armour.py `_arch`). The radio cable (3.2 mm) leaves the radio's top connector, crosses
  2 cm of the back plate's face onto the strap's back tab and runs 4 mm in from the strap's inner edge (in the lane
  only on the plate's face, flush). Undo: PLUG_X 0.07, drop the re-seat in chest_rig.py, the flat keepers.
**A66 Bonded, silent storage.** Every pouch is bonded to the plate or over the belt (no webbing grid, no hook-and-loop);
  shock cords are anchored inside the pouch walls and their moulded pull tabs rest on what they hold; the medkit's
  pull handle is a flat webbing strap bonded at both ends along its bottom edge. One new material only (`kit elastic`
  for the leg bands and sleeves); everything else reuses Wren's laminate, polymer, rubber, gunmetal, shock cord and
  cable jacket. The belt and its closure cross the back-carry lane flush on the body (3 mm), with the rappel ring.
  Undo: the part builders in chest_rig.py / waist_belt.py / leg_kit.py.
**A67 Approach boots are their own item (step 09b).** `py/garments/approach_boots.py` (FITTED `approach_boots`, kit id
  `boots`, objects `wren-approach_boots-*`) forks `boots.build_foot` instead of parameterising it, so Moth's step 06 boot
  (`boots.py`) stays byte-identical; it imports `Frame`, `smoothstep` and `_planar_uv` and reuses the boot materials
  (suede, boot nylon, sole rubber with `wear`, lace, binding, hardware metal; no new material: the rand is the sole's
  rubber, so a covered or unsampled new material cannot appear). Shape: toe room 12 mm, toe raise 3 mm, plan
  superellipse 1.9 medial / 1.6 lateral round a toe point 40 % to the medial edge, a quadratic toe spring of 10 mm from
  82 % of the foot; rand 13 mm round the upper rising 7 mm up the heel and 10 mm toward the toe, with a bumper about
  30 mm deep over the nose; seven low eyelets a side from 80 % of the foot (no speed hooks); a bellows gusset each side
  of the tongue; the edging zone is the front 4.6 cm of the sole, flush with the lug faces; lugs 2.9 mm (V-bars and an
  edge band, original), the heel brake 4.2 mm. Undo: `approach_boots` back to `boots` in GARMENTS.wren, rebuild from it.
**A68 The suit's hem pressed into the boot under a low heel tab (step 09b; corrected in fix round 1).** The suit (not
  rebuilt: step 08a's seam gap 9.76 vs 10) settled its ankle hem at 10.1-10.5 cm in front but 13.0 (left) / 14.1 cm
  (right) at the back, not the 9 cm A38 drafted. The collar no longer follows the hem (the first pass rose to a 15.0 cm
  stepped tab): its top line is 12.2 cm at the front and rises smoothly round the leg to `BACK_RISE` 10.5 mm more at the
  back (a cosine ramp, no step), so the top edge is 12.8-13.96 cm all round (14.0 cm limit). As the armour presses the
  suit (A53), `press_suit_hem` then moves the suit's render objects into the boot: (1) height: the hem goes to 27 mm
  under the collar's top edge (A38: 25 mm); where the hem is at or over the top edge (the right heel, up to 2.2 mm over)
  a 2 mm band over it is stretched down inside the boot and the 10 cm of suit above slides down to meet it (visible
  stretch at most 4.7 %, `suitBandStretch`); (2) radius: every suit vertex under the top edge is drawn in toward the
  leg's axis to 1.5 mm inside the boot's innermost (lining) surface, smoothed over the mesh and fading out 12 mm over the
  edge (the first pass only moved z, so the pressed band kept the leg's wider radius and poked out of the narrower
  shaft at the medial back: 230 + 47 vertices on the left boot, 54 on the right; "nothing visible moves" was wrong);
  (3) a probe in `-sim.json` (`suitPokeThrough`): suit vertices under the top edge less 4 mm outside the boot's inner
  surface, or with a clear line of sight out through the wall past every boot object and the leg; both are 0 on both
  feet. The boot fits a smoothed copy of the suit's lower leg, its push-out moves are dilated and blurred over the ring
  grid, and its lining is held 3.2 mm inside the outer wall (the first pass crumpled the collar band). Undo: rebuild the
  suit with the hem drafted lower at the back (the step 08a retry); the press then only moves hidden suit.

## Assumed decisions, step 10 (baked maps, LODs, glTF; implementer)
**A69 The hero is the build decimated to the hero budget, the build stays in the Lab as "source".** The built blend
  holds 2.45 M render triangles (the suit shell alone 1.05 M), ten times SPEC 6.4's hero budget (150-250 k). SPEC 6.3's
  "Hero: the full mesh" is read as full detail: the hero is the build collapse-decimated to 230 k with every map baked
  from the 2.45 M source (selected to active, Cycles on the GPU), so stitches, folds and the procedural detail are in
  its maps. The unbaked build stays the Lab's `source` LOD (`<id>-lab.glb`) for pipeline checks; it is never a game
  asset. Undo: export the source as the hero (2.45 M triangles, about 94 MB) and accept the overrun.
**A70 What leaves each LOD's geometry.** Stitch thread from LOD0 down and zip teeth from LOD1 down live only in the
  maps; pieces smaller than 12 mm (LOD1) / 45 mm (LOD2) across (keepers, cord locks, rivets, small buckles) are
  dropped; faces covered by another surface within 3 cm (LOD1) / 4 cm (LOD2) along their normal (layers under layers,
  the inner walls of solidified cloth) are culled before decimation so the budget goes to what can be seen. The goggle
  lens (the glow, D13) is never dropped and is protected in the collapse. The rib segments are separate pieces at
  the hero and LOD0 (collapse decimation never merges pieces) and part of the shell from LOD1 down (A74; fix round 2). Split vertices are welded at 0.2 mm below the hero (the split
  rims stalled the collapse at about twice the budget). Undo: the tables DROP_MATS, DROP_SMALL, CULL_COVERED in
  py/bake_lods.py.
**A71 LOD1 has its own 1K set (SPEC 6.4: "shares LOD0's").** Sharing needs LOD1 to keep LOD0's atlas UVs through the
  collapse, which then stalls far over the LOD1 budget; LOD1 is re-unwrapped and baked at 1K (cloth, kit): its own six
  1K maps cost about 8 MB of BC7 VRAM more per operator than sharing (6 x 1.33 MB with mips, export report.json). Undo: a UV-preserving decimator, or LOD1 at LOD0's UVs with the
  overrun.
**A72 The 3 cm render-edge rule applies to the built items, not the LODs.** `operators:check` runs it on every built
  item as before; a 4-6 k triangle figure cannot meet it (the LODs' longest edges are reported in the export report).
  The hero is a decimation too (longest edge about 16 cm); it is held by its comparison with the source instead
  (silhouette IoU against the source, the close-up columns of sheets b / c), not by an edge rule. Undo: none needed
  (information only).
**A73 Textures ship as WebP inside the GLBs and as PNG beside them until KTX2.** CLOSED in step 11 (D26, A79). No `toktx` / `basisu` on the PC and
  the run may not install software (RULES): the KTX2 encode is one command in the export README (UASTC, Zstd 18, linear
  for normal and ORM), OPEN for Michael's OK to install KTX-Software. The texture costs report BC7 / ASTC 4x4 VRAM
  (1 byte per texel, mips 4/3) next to the PNG sizes. Undo: none (the KTX2 step replaces the WebP).
**A74 LOD1, LOD2 and the phone are closed shells (fix round 1).** The step 10 cull decided a face from one ray at its
  centre, so partly covered faces of outer layers went and the collapse pulled the inner layers through (shards on the
  head and shoulders, holes in the boots; open edges LOD1 131 m, LOD2 91 m against the hero's 35 m). LOD1 and LOD2 are
  now the hero without the lens, the stitches, the zip teeth and the pieces under 12 / 45 mm, voxel-remeshed at 2.5 mm
  (the union of every layer: no inside surface left to poke through, no holes), decimated to the budget less the lens,
  each face given the source material of the nearest hero face (so LOD1 keeps its cloth and kit sets), and the lens
  (protected, D13) joined again; every map is baked from the source as before. The rib segments are separate pieces at
  the hero and LOD0 and part of the shell at LOD1 and below, where they bend with it and cannot gap: a trial keeping the
  plates separate at LOD1 let the shell under them show through the decimated plates (striped ribs in the chest
  close-up). This departs from the step text (step 10 Do 2: the rib segments separate so they "must not gap when the
  torso bends", also SPEC 8): a shell cannot gap, and the read holds. Evidence (round-2 checker, Lab on the RTX 4090,
  ANGLE D3D11, sneak pose, low front view, shadows off): LOD0's separate segments overlap with no gap; LOD1's shell keeps
  three lapped bands with their edges and stitch lines in the maps; the Cycles `wren-chest-lod1.png` shows the same;
  the Babylon `wren-sheet-lods-closeups.webp` row "Torso bent (sneak), ribs" now frames the front rib laps (fix round 2).
  The fixer's "striped ribs" trial was not kept as a render; the checker's renders stand in for it. The covered-face
  cull is kept for a layered level but now needs a face covered at its centre and near
  every corner (CULL_COVERED is empty). The export report measures each LOD's open edge length and its visible
  back-face pixels per view; operators:check fails a LOD over 1.5x the hero's open edges (LOD1, LOD2, phone) or over the
  hero's back-face pixels + 0.2 % of the figure. Undo: SHELL_KEEP, SHELL_VOXEL and CULL_COVERED in py/bake_lods.py.
**A75 The goggle glow is one extra draw at every LOD below LOD0 (SPEC 6.4 LOD2's "+ glow" read for LOD1 too).** The
  lens is the D13 glow with constant emissive factors and no maps; folding it into the kit material needs an emissive
  map per LOD set (more VRAM than the draw costs). LOD1 is 2 + glow = 3 draws, LOD2 and the phone 1 + glow = 2;
  lodChecks writes the budget `draws: 2, glow: 1` with the limit "SPEC 6.4 <= 2 + glow (A75)". Undo: the lens as an
  emissive map in the kit / atlas material.
**A76 Bake errors inside the outline: the shells split sharp edges, and operators:check compares every LOD's render
  with the hero's (fix round 2).** Round 2 found dark diagonal slashes over the pistol holster face (LOD1, LOD2,
  phone) and a torn wedge in the back plate's radio recess (LOD2, phone) that neither IoU nor the back-face count sees.
  Cause: the decimated shell's flat faces meet their sides at near right angles, its smooth vertex normals there tilt
  up to 45 deg, and interpolated across long sliver triangles they send the selected-to-active cage rays (3 / 6 cm out)
  sideways onto the holster sides, the pistol and the plate rim. Fix: edges of LOD1 / LOD2 sharper than 30 deg are split
  (`set_sharp_from_angle`, SHELL_SHARP_DEG), so a flat face bakes along its own normal (the glTF carries the split
  normals and the MikkTSpace tangents built on them; triangles unchanged). Result: the wide slashes and the radio wedge
  are gone (side 31-40 -> 9-14 px, back 146-151 -> 17 px, front 208-212 -> 15-17 px at LOD2 / phone), but thin dark
  arcs stay on the LOD1 / LOD2 / phone holster face and LOD1's front view keeps a dark groove down the holster (31 px,
  over the front limit 24: bakeDiff FAILs LOD1). 50 deg and 30 deg render the same, so the arcs are not normal tilt;
  hypothesis: near-zero UV-area sliver triangles of the decimated holster face (too few texels for the map to correct
  the geometric shading) - OPEN, needs a decimation that keeps the holster face's triangles fat (or the holster kept
  as a separate piece below LOD0). Measure (bakeDiff, FAIL): a LOD pixel is
  "new dark" when it is darker than every hero pixel within 3 px by more than 0.2 luminance (an edge or crease that
  moved a few pixels is not an error); per view (front, side, back, chest, head, boot) the largest 8-connected patch
  must stay within DARK_PATCH_LIMIT = 1.1x the round-2 LOD0's patch, at least 24 px: front 24, side 24, back 142,
  chest 173, head 141, boot 404. On the round-2 renders (kept in build/operators/wren/export/renders-r2) it fails LOD1
  front 78 / side 40, LOD2 front 212 / side 32 / back 151, phone front 208 / side 31 / back 146; LOD0 passes. A mean
  luminance per 8 or 16 px block was tried first (the fix list's example) and does not separate those errors from
  LOD0's spread of small differences (LOD0 chest 47 blocks over 0.1, LOD1 side 5). LOD0's back (129 px, the thigh-band
  lower edge) and boot (367 px, the OPEN toe streaks) set those two limits high: a tighter limit waits for those two
  LOD0 bakes. Undo: SHELL_SHARP_DEG in py/bake_lods.py; DARK_PATCH_LIMIT in src/operators/lodChecks.ts.
  **Fix round 3 (A76 amended).** The limits can no longer hide a defect: the shells (LOD1, LOD2, phone) are held to
  SHELL_DARK_LIMIT = 24 px in every view (`darkPatchLimit`), and the per-view DARK_PATCH_LIMIT is LOD0's only. A new
  close-up view `holster` (right thigh, the chest view's scale; `wren-holster-<lod>.png`, sheet
  `wren-lods-d-closeup-holster.webp`) feeds backFaces and bakeDiff (24 px at every level). bakeDiff and backFaces FAIL
  "stale" when a LOD's render (or the hero's) is older than that LOD's GLB (`staleViews`). On the renders-r2 set every
  shell still fails (LOD1 front 78, chest 64, head 80; LOD2 front 212, back 151; phone front 208, back 146). The same
  sharp-edge split on LOD0 (SHARP_SPLIT 30 deg, not below z 0.20 m: on the boots it lengthened the toe streaks, boot
  367 -> 491 px) removed LOD0's thigh-band line (back 128 -> 1 px), the thigh-band buckle blotches (front 18 -> 1) and
  the plate-top smear (chest 157 -> 1, head 125 -> 0), so those limits are 24 again. The one loose LOD0 limit left:
  boot 404 px, the OPEN toe streaks (`wren-boot-lod0.png` 189,373, 367 px; rays meeting the rand / toe-cap walls).
  LOD1's cage went 3 -> 2 cm (no change at the notch below; nothing worse elsewhere). OPEN, a shell defect the check
  FAILs: LOD1 chest 36 px (`wren-chest-lod1.png` 404,347), a dark hooked notch where the plate's lower band meets the
  cummerbund on the left side; the same spot is 18 px at LOD2 / phone. Undo: SHARP_SPLIT = {} and the round-2
  DARK_PATCH_LIMIT (back 142, chest 173, head 141); SHELL_DARK_LIMIT in src/operators/lodChecks.ts.

**A77 Rigid polymer pieces stay separate below LOD0 (fix round 3).** Cause of the holster arcs and groove (LOD1 /
  LOD2 / phone) and of the torn knife sheath with its wedge into the mag pouch (LOD2 / phone), confirmed by removing
  it: inside the voxel shell the holster's flat face and the sheath were one surface with the thigh / the plate, so the
  collapse ran long sliver triangles from them into their neighbours and the bake sent rays across the gap. Keeping
  the pieces out of the remesh (the rest unchanged) took LOD1 front 31 -> 0 px, side 11 -> 0, LOD2 / phone side
  14 / 9 -> 7, holster view 0-4 px, chest 47 -> 18 px, and the holster face reads flat with its strap like the hero's
  in front, side and holster views. Rule (py/bake_lods.py RIGID_*): a piece is a 0.2 mm-welded connected component of
  the hero whose faces are all `harness polymer`, bounding-box diagonal 0.05-0.25 m (9 pieces: holster shell and hood,
  knife sheath, two mag pouches, goggle housing and mount, the back and the belt polymer holders). It is cut from the
  hero, decimated on its own (LOD1 keeps 75 % of its triangles, LOD2 55 %; the lens whole, as before) and joined to the
  shell, which is remeshed without it. At LOD2 / phone only the front torso and thigh pieces stay separate (holster,
  hood, sheath, mag pouches: centre forward of the body, below the head): decimated jointly to LOD2's budget every
  piece lost its shape (flaps on the pouches, a twisted belt holder, back view 106 px). LOD2's target went 5,200 ->
  5,600 triangles (SPEC 6.4 4-6 k; measured 5,557) so the shell keeps its share. Undo: RIGID_MATS = set() and
  TARGET_TRIS lod2 5200 (the round-2 shells).

## Assumed decisions, step 11 (full render set and self-review; implementer)

**A78 Close-up lighting: the near-black suit read mid grey for two reasons, both fixed outside the materials (OPEN
  since step 05, closed).** (1) The Lab source export (`py/export_gltf.py`) flattens procedural materials to constant
  factors from a table (FLAT) that stopped at step 07: every material added since (the suit zones, composite, rubber
  trim, gunmetal, kit elastic, pod, goggle band) exported the glTF default base colour 0.8, so the Lab drew them light
  grey. Every such material now takes the median albedo and roughness `check_garment.py` measured from the render
  (`<op>-<item>-check.json`); the Blender materials and the check limits are unchanged. (2) The raking rig's exposure
  (key 7 x exposure 4.5) lifted a 0.03 albedo to about sRGB 0.8. The close-ups use a new calibrated rig `detail`
  (raking key 2.0, cool fill 0.6, back rim 2.2, ACES, no bloom). Fix round 1 (step 11): after A80 corrected the
  Lab's lighting the exposure is 0.72 and `lab.greyCard()` measures the calibration on every sheet run (an 18 % grey
  Lambert card facing the key; sRGB 0.49 measured on the RTX 4090, printed in each close-up caption); the 0.02-0.06
  albedos render about sRGB 0.12-0.24 facing the key, the lit-figure medians are 0.06-0.09. The turnaround and the
  compare sheet use the same calibration in a whole-figure rig `figure` (front key 2.0, cool back rim 1.4, exposure
  0.7, no bloom; grey card sRGB 0.50) instead of `studio` (exposure 4.5 had lifted the suit to light grey with a bloom
  halo). Close-ups render the hero LOD (D21: its baked normal / ORM maps carry the emboss, perforations, pebble,
  weave, fibre and wear; the unbaked source is the flat factors above). Metals: the gunmetal, hardware metal and
  anodised materials are metallic with a 0.02-0.05 base colour (materials.py), so with no environment they reflected
  nothing and drew as flat black. The Lab now builds a studio environment in the scene (`lab.ts studioEnv()`: a dark
  room, an overhead soft box and two side strips, emissive boxes captured once by a ReflectionProbe; no file, no
  network) for the studio, detail, detailRear and figure rigs (`env: true`); the dark rigs (rim, menu, Hollowmere,
  darkness, night vision) keep none. materials.py and the check limits unchanged. Each close-up caption prints the lit
  figure's sRGB median / p10 / p90. Undo: the close-ups' `rig: 'detail'` back to `'raking'`; MEASURED in export_gltf.py
  off; `env` off. Fix round 2 (step 11): the statistics come from an operator mask (`lab.maskShot()`: the same view in
  unlit material-id colours on black, floor, backdrop, grey human and scale bar hidden), not from "away from the clear
  colour" (which counted the floor and wall: every rim view had printed the wall's 0.06). Every close-up adds a detail-read
  panel, the same view and LOD at +2 EV (`lab.setExposureBoost`), labelled, beside the calibrated one. Metals: the
  materials named metal / aluminium / hardware (the hero and LOD `hardware` set) take environment intensity 1 (the rest
  0.25), the studio environment gains a 6 x 4 m front panel (1.2) so metal facing the camera reflects something, and a
  `detailFront` rig (the detail rig with its key from the front above) serves the new `buckle` close-up (the belt's
  magnetic closure at 0.3 m, seen from the key's mirror direction). The shadow bias (A80 fix round 2) lifted the
  key-lit faces of every close-up. materials.py, the garment builders and the check limits unchanged.
**A79 KTX2: UASTC + Zstd 18 in every LOD GLB; the Lab shows the reference transcoder's decode until Babylon's
  transcoder is bundled.** `scripts/operators/ktx2.mjs` (`npm run operators:ktx2`, run by `operators:lods`): toktx
  UASTC quality 2, Zstd 18, full mips, albedo sRGB, normal (normalised) and ORM linear; `ktx validate` on each; GLBs
  repacked with `KHR_texture_basisu` (required, no WebP / PNG left; operators:check `ktx2` FAILs otherwise). Measured
  (report.json `ktx2`): VRAM BC7 / ASTC hero 96 MB, LOD0 32, LOD1 8, LOD2 4, phone 1 (RGBA8 from WebP would be 384 /
  128 / 32 / 16 / 4); KTX2 on disk 38.3 / 14.5 / 3.6 / 1.8 / 0.55 MB; GLB WebP -> KTX2 25.3 -> 55.3, 6.6 -> 18.0, 1.9 ->
  4.7, 0.8 -> 2.2, 0.6 -> 1.0 MB (UASTC is bigger on disk than q92 WebP; the trade is 4x less VRAM and no decode on
  the main thread); lowest PSNR of a level-0 decode against the baked PNG 35.5 dB (hero normal), every set 35-60 dB.
  A trial with RDO (`--uastc_rdo_l 1`) cut the LOD0 cloth set 21 % on disk; not used (the checker's encode is UASTC +
  Zstd 18; a step 18 choice if the download matters). Babylon's KTX2 decoder (babylon.ktx2Decoder.js and the uastc /
  zstd wasm) is not on the PC and is not in node_modules, and the run may not download (RULES): the Lab is wired for
  bundled files (`src/operators/lab/ktx2.ts`: `vendor/ktx2/*` through `?url`, KhronosTextureContainer2.URLConfig, no
  CDN; `KhronosTextureContainer2` exported from core/babylon.ts) and until then draws each KTX2 texture as `ktx extract
  --transcode rgba8` decoded it (`export/textures/<lod>/ktx2-decoded/`), labelled on the LOD sheet. OPEN for Michael:
  OK to add the decoder files (from the Babylon release matching @babylonjs/core, Apache 2.0) to vendor/ktx2/. Undo:
  restore the step 10 GLBs with `npm run operators:lods -- wren` minus the encodeKtx2 call.
  **Update, step 11 fix round 1 (D27):** the decoder is bundled. `@babylonjs/ktx2decoder@9.29.0` (devDependency, the
  official package, Apache 2.0, same version as @babylonjs/core; it ships every transcoder wasm in `wasm/`, nothing came
  from a CDN). `src/operators/lab/ktx2.ts` imports the decoder as an ES module and runs it on the main thread
  (`numWorkers: 0`, the module passed as `binariesAndModulesContainer.jsDecoderModule`, so no `babylon.ktx2Decoder.js`
  script URL exists), points every transcoder at the package's wasm through Vite `?url`, and throws if any URL would
  leave the page (`ktx2RemoteUrls`, unit-tested; a test also pins the package version to @babylonjs/core's). The Lab
  now draws every baked LOD from real KTX2 textures transcoded by Babylon (BC7 on the RTX 4090); no request leaves
  127.0.0.1 (probe). Orientation: Babylon 9.29 does not compensate a KTX2 for invertY (it does for KTX1), so the Lab
  flips KTX2 textures in the texture matrix (vScale -1, vOffset 1); against the reference decode the LOD0 chest
  close-up differs by 0.09 / 255 mean (3.20 without the flip). `wren-sheet-ktx2-compare.webp` shows Babylon's transcode
  over the reference decode for every baked LOD with the per-LOD difference. The decoded stand-ins stay as the
  comparison (`state.ktx2 = 'decoded'`). The game bundle: `dist/assets/babylon-*.js` holds KhronosTextureContainer2
  with Babylon's `cdn.babylonjs.com/babylon.ktx2Decoder.js` default string (Babylon's built-in .ktx2 loader pulls the
  class in; manualChunks puts it in the babylon chunk). The path is no longer reachable: core/babylon.ts blanks
  `URLConfig.jsDecoderModule` at import, so an unconfigured KTX2 load fails instead of fetching; the game loads no KTX2
  before step 18. Step 18 still needs: the KHR_texture_basisu glTF path in the game, ktx2.ts's setup (or its
  equivalent) before the first operator texture, and the same flip if it reads the GLB with a v-flipping reader.

## Assumed decisions, step 11b (rigid kit and desktop only; implementer)

**A81 How a rigid part is built and checked (D28).** A rigid part is laid on a `KC.Flat` frame: the plane fitted to
the surface under its footprint (`flat_on`, optionally only the plate it is bonded to), moved out until no surface point
is in front of it; anything laid through `cbox` / `mpts` / `cord_loop` on a Flat is one rigid transform of its design.
Each part's vertices carry `_rigid` (its id: chest_rig 1xx, waist_belt 2xx, leg_kit 3xx, armour 4xx, head 5xx) and
their design coordinates (`rdx/rdy/rdz`). Fix round 1: the design coordinates are recorded BEFORE the map, never
derived from the built points - `cbox` and `mpts` record the map-space input (u, v, h) of each vertex (a `tube` along
`mpts` on a Flat is built in map space and mapped), and parts built in one frame (buckles: `KC.buckle`; the PTT, the
holster, the canisters, the sling socket's ring, the radio's knob, the brow rivets) are built at the origin of their
own `KC.Frame` and placed by `Parts.place`, which records the local coordinates; a hard part's vertex with no record
stops the build. So a part laid through a curved map fails `rigidKit:shape` (proved once: rifleMag0 laid through the
chest plate's HField `Mf` instead of `Fmag` -> `rigidKit:shape` FAIL, rifleMag0 22.09 mm; reverted). The registry (sim report `measurements.rigid`) declares bones and a role:
`hard` (shape, depth, size, host gap and skin judged), `mount` (a moulded seat, `KC.seat`: its back follows the body,
its front is the item's flat back), `carrier` (a soft carrier skinned with its item: pouches, placard panels, the medkit,
the cam pouch, the sleeve panel). The plates and rib segments are tagged per connected piece after the recess cut (armour.py `tag_rigid`)
and keep their as-built shape as the design (they are body-shaped by design): `shapeRef: 'asBuilt'`, so rigidKit does
not judge their shape (reported as `asBuilt` in the shape line), only their depth, bones and skin;
the head kit's hard parts by rule (every head_kit vertex above 1.48 m except the cables, `rigid_skin.HEAD`). Shape is
judged in each item's own blend (check_garment.py); a later item never moves an earlier item's rigid part (the presses
act on the suit only). The `_rigid` attribute ships in every GLB as `_RIGID` (a float per vertex; about 4 bytes x
vertices) so operators:check can read the skin; step 18 may strip it. Undo: drop the attribute and the checks.

**A82 LOD shells and rigid parts.** Below LOD0 every `hard` rigid piece in RIGID_DIAG (5-25 cm) stays a separate
piece (A77 extended from 'harness polymer' to the `_rigid` attribute); the plates and rib segments (and the head kit) stay in
the voxel shell as A74 decided (kept separate, they starved LOD2's shell: six bakeDiff views failed, boot 358 px), and every shell vertex within 4 mm of a rigid part's source takes that part's id and weights, so
the shell over a plate moves with it. `rigidSkin:<lod>` judges every tagged vertex in each file: one weight vector
(spread <= 0.001) equal to the part's declared weights within 0.01 per bone, and every registry `hard` part present.
Fix round 1: hard parts under 5 cm that a LOD's voxel shell absorbs (no shell vertex within 4 mm of their source, so
no vertex carries their id) are listed here and in `rigidKit.LOD_ABSORBED`; any other absence fails. Measured on the
fix round 1 LODs (vertices of the LOD within 10 mm of the part's hero vertices): LOD1 browRivetL / browRivetR (the
shell over the brow plate adopted the head kit's id 501: head 1.00, the rivets' own bone); LOD2 gadgetTab (nearest
shell vertex 8.4 mm: chest 1.00), camTab (nearest 25 mm, none within 10 mm: the cam pouch's shell), slingSocket (4
vertices: pelvis 0.78, hipL 0.20, spine 0.02 - nearest-body weights over the left hip), rappelRing (pelvis 0.92, spine
0.05, hipL 0.03), browRivetL / browRivetR (head 1.00 where any lies within 10 mm). legBandBuckleL0, missing from the
implementer's LOD1, is present after the fix round's rebuild (the buckle now built in its own frame).

**A83 Rifle magazine pair as one placard (R1).** The two magazines stand side by side (centres 78 mm apart: the
62-70 mm width plus the 16 mm curve leave 4 mm between them) on one flat laminate placard panel with slim pouches over
their lower 122 mm; the placard is bonded only to the chest plate through a moulded saddle and stands off the rib
segments below (it does not bridge two bones). The curve runs toward the wearer's left (both magazines the same way).

**A84 Pistol magazines, cam pouch and hanger order on the left belt.** From the front: the closure, the cam pouch,
the left leg hanger's loop, the pistol magazines (centred at 9 o'clock, base plates forward, front end 66 mm ahead of
9 o'clock), the sling socket (8 o'clock or just behind the magazines' rear end, whichever is further back), the pod.
The hanger gap is laid out by waist_belt.py at build time and read by leg_kit.py from the belt object (`hangU`).
The hip map now runs to 1.012 m so the upper row's seat is fitted to the flank above the belt.

**A85 Thigh packing A.** Knife at -60 deg (outer front), sleeves at -35 / -13 / +9 deg on a panel from -74 to +21
deg (LAYOUT.md "Recommended changes" 2, packing A, so the rear sleeve stays off the calf in a deep crouch); the panel
runs to 0.785 m so the sleeve hanger ends on it above the caps. The top canister of each sleeve is modelled true size
(90 mm with its cap, the lower one hidden). Knife: sheath 100 x 34 x 14, guard 6, grip 78, pommel 6 (190 overall).

**A86 Gunmetal as a metal.** `materials.gunmetal`: metallic 1, roughness with a +-0.015 grain and worn edges a little
smoother (the hard class's roughness band, 0.55-0.9, is not loosened). Implementer: base colour (F0) 0.30-0.33 linear,
roughness 0.61; on `wren-sheet-closeup-buckle.webp` that read as flat light silver-grey, lighter than ART-DIRECTION's
"dark anodised grey" (checker note). Fix round 1: base colour (F0) (0.15, 0.155, 0.165) linear, roughness 0.60, worn
edges 0.03 smoother (bright aluminium (0.48-0.5) where the sharpest edges wear through); the Lab's flat factor
(0.155, 0.60). Measured: on `wren-sheet-closeup-buckle.webp` (calibrated panel, sRGB luma) the halves read median 0.155 / 0.159 (p10-p90 0.152-0.160) against the belt's 0.118: dark anodised grey, a step lighter than the laminate; the satin lobe shows only on the bevels and worn edges (p99 0.30, max 0.38), the flat faces carry none (flat planes under the calibrated key; the hard band's floor, roughness 0.55, would barely tighten it). Left for Michael's eye at the block end. Undo: colour (0.30, 0.31, 0.33), roughness 0.61, edges 0.04.

**A87 Brow plate rivets (Michael, via the orchestrator, during 11b).** Each rivet sits on the side strap's sewn end
under the brow plate, 8 mm in from the strap's front end, clamped 10 mm inside the plate's edge where the strap runs
past the plate's flat; it is seated along the plate's local normal (head from 1.2 mm under to 0.5 mm over the top,
a shank down through the plate and strap). head_kit reports `browRivets` (host gap of the head's lower rim, distance
to the strap's centre line) and registers both rivets (502 / 503) for rigidKit. Fix round 1: their vertices carry
`_rigid` 502 / 503 and design coordinates (built in their own frame), so check_garment.py judges their shape and depth
and measures their host gap itself (no registry bypass; the builder's rim gap stays as `builderGapMm`). Small hardware elsewhere
(diagonal under 6 cm) gets the same test as its closest approach to any other surface.

**A88 Drone pod to the rear right, medkit to the right side (a conflict between D28's picks; for Michael at the block
end).** With the pistol magazines centred at 9 o'clock (128 mm long) and the sling socket at 8 o'clock, the left belt
from 9 o'clock to the back-carry lane edge (A39, |x| 0.105 m, u 0.331 m) is 117 mm of arc, but the magazines' rear half,
the socket boss and the 84 mm pod need 171 mm; above the belt the lane edge comes further round (u 0.295 at 1.0 m), so
the pod cannot sit over the socket either. Built as picked, the pod was squeezed to 19 mm. So the drone pod (D1, true
84 x 80 x 19, flat on a moulded saddle, a laminate tab round the belt) takes the rear right, outside the lane, and the
soft medkit moves to the right side of the belt in front of the holster hanger. D25's words ("Hips, keep game carry")
hold: both stay on the hips and out of the lane; the knee-up crawl (left knee) no longer reaches the pod. Undo: pod
rear-left again needs the magazines forward of 9 o'clock (LAYOUT.md PA fails the raised thigh) or the socket back
under them.

**A89 LOD1 decimation target 13,600 (fix round 1 of 11b).** The voxel shell's decimation is global, so the fix round's
leg kit changes (the canisters built in their own frame) moved LOD1's edge collapses everywhere: a 30 px dark crease
appeared along the goggle housing's lower edge (`wren-head-lod1.png` at 198, 320; bakeDiff limit 24, not loosened).
`TARGET_TRIS.lod1` 13,500 to 13,600 (SPEC 6.4 12,000-15,000; built 13,577) removes it: head 16 px; the other LOD1 views front 0, side 0, back 0, boot 0, holster 8 (was 0) px
(chest stays the known step 10 line, 31 px). The canisters' design record sits on their own oval
axes (`leg_kit.py`, frame `fa`: width, depth, length) so `rigidKit:size` reads 25 x 18 x 90; the world geometry is
the one built in the world-x frame (the ring phase that cleared LOD2's holster view, 26 to 13 px). Undo: 13,500.

## Assumed decisions, step 08a retry (Wren block end; fixer)

**A90 Membrane zones over the crotch, the abdomen and the lumbar (A48 amended again).** build_garment
`membrane_zones` (suit `SIM['cling']['zones']`): (1) the crotch zone now starts 1 cm below the crotch (was 2 cm above),
relaxes 120 passes (was 60), and with `'seams': True` relaxes the seams inside it as single lines (each seam's paired
vertices held at their mean and averaged over both sides' neighbours), so the centre front seam is drawn with the cloth;
`'draw_from'` limits the draw-in to `max_off` to 2.5 cm above the crotch, so nothing is pulled into the gap between the
thighs. (2) New zones `abdomen` (front, z_waist - 7 cm to z_bust - 5 cm, 160 passes) and `lumbar` (`'side': 1`, the
back, z_hem to z_bust - 2 cm, 140 passes), both with seams and `'support': 'subdiv'`: held off the body as rendered (its
subdivision surface, lightly faired) instead of the coarse cage, whose convex corners a membrane tents on; zones on that
support take their final guard off the subdivided body too. Why: round 4 items 1, 2 and 6 (crotch bulge and waving
centre seam, abdomen dimples, lumbar groove between lit ridges). Undo: the round 3 zone list in suit.py.

**A91 The abdomen's body relax settles the rectus ridges up to 14 mm (A45 amended).** `prepare_body`: 14 mm in (was
8 mm), 320 passes (was 200). Why: the 8 mm clamp held the ridge tops either side of the dimples. Tried and dropped:
24 mm (the lower belly dropped as a broad shelf under the ribs in e); the lumbar fill widened to 8.5 cm at 16 mm and down
to the hips (a pit where the gluteal cleft, deeper than the cap, met the fill; A51's 10 mm fill is kept and the lumbar
zone does the rest). The suit's `seam_self_rings` 4 to 6: with 4 the settle left inLoL oscillating 8.4-10.7 mm (10.4 at
the last frame in the first loop), with 6 it ends 8.4-9.8 mm. Undo: the old clamp and ring count in suit.py.

**A92 Joined tape runs, a parabolic shoulder yoke and an eased hood-skirt front (08a retry, items 3-5).** The bonded
details (`garment_details.py`, `D['bonded']['join']`) lay seams that meet end to end as one tape run, chained by their
nearest ends and smoothed along the surface only (each point keeps its normal offset): the front neckline either side of
the centre front (`collarFL` + `collarFR`, smooth 24) the waist seam's four halves as one closed ring (smooth 16), and the leg block's centre front and centre back seams
(`cf`, `cb`, smooth 12).
The shoulder yoke outline (`suit._yoke_outline`) is one parabola y = y0 + r (x / hw)^2 run out past the raglan seams
(was a rounded end, a straight rise and a 45-degree flare). The hood skirt's 20 mm front drop (headwear
`SKIRT_FRONT_SUIT`) is eased over 0.0-0.9 of the front cosine (was 0.35-0.85), still full over the zip and garage.
Undo: remove `join`, the old outline and smoothstep bounds.

**A93 The abdomen zone held off a fitted support; zone guards local; front raglan runs; the collar drawn on and faired
(08a retry fix round 1; A90 amended).** (1) build_garment `fitted_skin` (zone `'support': 'fit'`, `'fit_sigma'` 0.04):
the body inside the zone's window is replaced by its moving-least-squares surface (a quadratic height field in each
vertex's own frame, 4 cm Gaussian), which keeps the belly's broad curvature and drops the rectus ridges, the linea alba
and the navel; the fitted part is lifted evenly (4.3 mm) so that no body vertex comes nearer than the guard to cloth
held the standoff off it. The abdomen zone uses it (was `'subdiv'`, which copied the rectus relief into a six-pack in e).
Note on A90: in build_garment the body has no subdivision modifier (13,380 evaluated vertices = the cage), so
`subdivided_skin(n)` is the cage with n Taubin pairs, and a light Taubin keeps 5-7 cm features. (2) The membrane zones'
final guard acts on each zone's own vertices only (blended by the zone weight); the rest of the suit takes the guard off
the cage as before A90. (3) The front raglan tapes are joined runs of one seam each (`raglanFR`, `raglanFL`; smooth 30,
normals eased over 12 passes with the new `'smooth_n'`): the right one kinked and swelled at the underarm crease.
(4) Suit cling `reach_panels` collar 45 mm (the mock neck's top edge stood past the 25 mm reach: a folded wing) and
`SIM['fair']` on the collar panel only (30 Taubin pairs, edges along themselves): spikes on the top edge at the back.
Undo: `'support': 'subdiv'` on the abdomen, the global final guard, the four entries.

**A94 The crotch probe's 0.6 mm over the 6 mm target is accepted (08a retry fix round 1).** r3/crotch_probe.py (suit
hero against a faired skin, z 0.80-0.925) reads max 6.6 mm, 17 vertices over 6 mm, all at z 0.800-0.818 (the gusset's
front edge, where the body's own relief is 7.4 mm forward); from z 0.818 up at most 5.4 mm. The probe is not a step
Check or a check.mjs limit; the visual Done is met (a, head_kit a: one smooth surface into the inner thighs, no bulge, no
cast shadow; crops in the session scratchpad f1/fin-crotch-a.png against ck5/old-crotch-a.png). Undo: reopen the
crotch zone (A90) if Michael wants the number.

## Assumed decisions, step 10 retry (Wren block end; implementer)

**A95 Step 10 retry: the inner shell out of the bake, the LOD0 split on the boots, small hard parts kept at LOD2, A82
measured.** (1) Hero-bake confetti: the solidified cloth (suit, gloves, hood, balaclava, boot upper) carries its inner
shell on the same pattern UVs as the outer face, so the two layers baked into one island and the inner shell's texels
(open occlusion, a flipped normal) overwrote the outer face triangle by triangle. bake_lods.py marks every solidify's
generated shell (`shell_vertex_group` 'bake-inner-shell', a face attribute `inner`); those faces bake into a 16 px
dummy through one extra material slot and are put back after the bake (they read the outer face's texels: 407,960 of
1,270,297 source faces). (2) With the inner shell out, the LOD0 sharp-edge split (A76) reaches the boots
(`SHARP_ABOVE_Z` -1, was 0.20): bakeDiff LOD0 boot 431 -> 0 px, so `DARK_PATCH_LIMIT.boot` is 24 again (every LOD0 view
24; A76's last loose limit closed). (3) LOD2: the rifle magazine placard and seat stay separate with the magazines
(`RIGID_EXTRA`; the pouch lip had baked a dark band against the separate magazine: chest 44 -> 9 px), LOD2 target 6,000
(SPEC 6.4 top; measured 5,964). (4) LOD2: every hard part under RIGID_DIAG's 5 cm (judged on the whole part) that A82
does not name stays a separate piece, decimated alone to 25 % (`RIGID_SMALL_AT`, `RIGID_SMALL_KEEP`; seven buckles,
888 -> 222 triangles): in the shell the leg-band and hanger buckles existed only where a shell vertex fell within 4 mm
(legBandBuckleR0 / hangerBuckleR by one vertex, the left ones by none: rigidSkin:lod2 FAIL). (5) A82 is now measured, not
only listed: `rigidSkin:<lod>` FAILs a named absence unless the part is under 50 mm in the hero and the LOD vertices
within 10 mm of it carry >= 0.75 of their weight on its declared bones (`ABSORB_LIMITS`). Measured on these LODs: LOD1
browRivetL / R 11.2 / 11.3 mm, 37 / 40 shell vertices head 1.00; LOD2 gadgetTab 14.1 mm and camTab 15.3 mm (no shell
vertex within 10 mm), slingSocket 38.7 mm (pelvis 0.85, hipL 0.11, spine 0.04), rappelRing 37.4 mm (pelvis 0.91, hipL
0.03, hipR 0.03, spine 0.03), browRivetL / R (head 1.00). Undo: drop the `inner` pass, `SHARP_ABOVE_Z` 0.20,
`RIGID_EXTRA` / `RIGID_SMALL_AT` empty, LOD2 5,600.

**A96 Step 11d: the goggle's two states as index ranges, interim in-use only (G73).** The asset holds only the in-use
goggle (head_kit hides the stowed set from export). The runtime orders each primitive's triangles [stowed][body][in use]
by a per-vertex `_GOGGLE` class (0 / 1 / 2) and swaps a sub-mesh's index range on the vision change (no upload, no extra
draw). Until the asset follow-up in docs/archive/operators-runtime/DESIGN.md exports the stowed set with `_GOGGLE`, both states
draw the in-use goggle and only the glow follows G73 (dim 0.3 of the lens emissive when vision is off, full when on;
0.15 s ease; the pose switches with `VisionState.shown`, at the flip's middle). Emissive only, no light (light parity).
Undo: separate goggle meshes toggled by `setEnabled` (2-3 more draws per body).

**A97 Step 11d: the runtime retarget takes the rig's local translation delta, not its world delta.** The Lab's
`poseSkeleton` adds each mapped joint's world move from rest, which counts the body's move twice at the pelvis and
ignores a body tumble's rotation of the pelvis offset; it is right in the Lab only because the Lab's body never moves.
`OperatorPoser` (src/operators/runtime/pose.ts) adds each mapped joint's local translation delta rotated by its rig
parent's root-space rotation; it equals the Lab to 1e-9 when only the pelvis translates (test). The Lab is unchanged.
Undo: add `rigMove` as world deltas like the Lab.

**A98 Step 11d: Wren's files ship in the game build by plain git, cached at runtime.** Step 11e copies the four GLBs to
`src/operators/assets/wren/` (81.4 MB; hero 55.5 MB is over GitHub's 50 MB warning, under its 100 MB limit); Vite emits
them through `import.meta.glob(..., '?url')`, fetched from the app's own origin; workbox runtime CacheFirst for
`assets/*.glb` (precache limit 16 MB; 81 MB at install rejected). Git LFS not used (Pages builds would spend the LFS
bandwidth quota). Undo: LFS with `lfs: true` in deploy.yml checkouts, or precache with a raised limit.

**A99 Step 11e: the player rig is built at Wren's height, with the G72 proportions in `proportions.ts`.** The figure
retargets the rig's rotations onto Wren's own bind offsets, so her hands, feet and head land on the rig's joints only
when the rig has her lengths: a 1.75 m rig with the old ratios put her wrists about 7 cm below the rig's weapon socket
and her ankles off the floor. So every player rig (local, partner, menu) is `CharacterRig(..., 1.68, { build:
'average', style: 'detailed' })` (`operators/runtime/playerFigure.ts`), and G72's A1, A3-A7 are applied in
`proportions.ts` for every character (the preamble's "do not edit proportions.ts" rule predates the locomotion merge;
the orchestrator's 11e ruling lists G72). The hit volumes (`hitVolumes(rig.p)`) and light samples follow her body as
SPEC 4.1 / G166 say; the controller capsule, speeds, traversal heights (`attach.ts` keeps 1.75) and the camera do not
change. Undo: rig height 1.75 and the old ratios (then Wren's hands miss the weapon).

**A100 Step 11e: the hero runtime-cached like the LODs.** The 55.5 MB hero goes in the same workbox CacheFirst route
(cache `operators`, 8 entries = two builds of four files) on first use; never precached. The menu fetches it after
LOD2, LOD0 and LOD1 so it never delays play, and drops its parsed copy on leaving the menu (a photo-mode close-up
re-reads it from the cache). Undo: exclude `-hero` from the route (the menu then re-downloads it each session).

**A101 Step 11e: thermal warmth on Wren is a per-mesh white overlay.** The old body's thermal flag added emissive per
part; Wren's materials are shared between the two bodies, so `OperatorFigure.setHeat` uses each mesh's own
`renderOverlay` / `overlayAlpha` (one extra pass per mesh, only while thermal is on). Undo: a per-body material clone.

**A102 Step 11e: `?gfx=min` loads Wren's LOD2 only.** The first e2e run with every LOD loading on software GL timed out
page loads and crashed pages (five suites at once each fetching 26 MB and transcoding KTX2 on the CPU). The minimal
graphics path (tests, `?gfx=min`, where characters are already the cheap smooth parts) loads LOD2 (2.5 MB) and never
LOD0 or the hero (`MIN_LODS` in `operators/runtime/playerFigure.ts`). Render side only: gameplay is identical. Undo:
`MIN_LODS = false`.

**A103 Step 11e: a climbing hand's swing is never quicker than the rig's arm can sweep.** e2e-traverse "ladder sprint:
hands reach their grips" read 19.5 cm (limit 3 cm) on Wren's 1.68 m rig with G72. Diagnosis: not reach (the target
was 0.52 m from a 0.54 m arm) but speed: the sprint's 0.11 s hand swing (two rungs, folded to overhead) plus the pelvis
dip of the trailing foot (G72's shorter thigh) asked the shoulder for more than its 22 rad/s joint limit
(`characterRig` JOINT_RATE), so the arm lagged its grip on the landing frame. Lowering the hands (-5 / -10 cm) or the
feet (+5 / +10 cm) did not help; a 0.15 s floor did (1.8 cm). `attachGrips.ts` `minReachSwing(travel, height)` takes
the arm from `proportions(height)` and plans the peak sweep at half the shoulder limit (`ARM_SWEEP_RATE` 11 rad/s:
the torso dips at the same time): ladder floor 0.158 s on Wren, 0.152 s at 1.75 m; drainpipe 0.07 s (below its own
swing, no change). The 3 cm limit is unchanged; the climb rates (body speed) are unchanged. Undo: `handSwingMin = 0`.

**A104 Step 11e: e2e-coop's offline check waits for the service worker to control the page.** The co-op screen is a
lazy chunk (`net/coopUi`); offline, only the worker can serve it. The old player body's synchronous build held the
menu back past the worker's claim; with Wren loading asynchronously the menu is up about 200 ms before it, so the
suite went offline first and the chunk fetch failed (solo rerun failed the same way). A real offline player has the
worker from an earlier online visit, so the suite now waits for `navigator.serviceWorker.controller` before going
offline. The check itself is unchanged. Undo: drop the wait (the check then races the worker).

**A105 Step 11e: e2e-ct's wall-jump hang depth follows the player's body height.** The suite expected the feet 1.90 m
under the lip, `HANG.drop` for a 1.75 m body; `attachPose` has always scaled it by the rig's height (`rig.height /
1.75`), so Wren (1.68 m) hangs 1.82 m under it (y 1.50 for the 3.3 m lip). The suite now reads the rig height; the
8 cm tolerance is unchanged. Note for Michael (G38): every attached pose (hang, ladder top, pipe, zipline) scales with
the rig, so the 1.68 m player hangs about 7.6 cm higher than the 1.75 m one did; the capsule, speeds and the anchors'
reach bands do not change. Undo: a gameplay height of 1.75 in `attachPose` (then her hands miss the lip by 7 cm).
*Replaced by D34 / G176 (Michael: "Keep gameplay fixed"): the gameplay height is fixed at 1.75 and e2e-ct's original
check is back.*

**A106 Step 11e: e2e-desktop's voxel-character checks are the guards'; `?gfx=min` close-ups load LOD2.** The player
has no voxel body since Wren (G123), so "every character is a voxel body" counts the guards, and asserts the player has
no voxel body and its rig parts are unseen; the goggle-lens glow is checked on a lensed voxel body when one exists
(none now: Wren's goggle glows on her own model, G73, unit-tested) and the camera head fade on Wren's figure. Photo
mode under `?gfx=min` asked for the 55 MB hero (e2e-feedback's "close-up LOD failed: Failed to fetch" under load):
`OperatorFigure.loadCloseUp` loads LOD2 there, as A102. Undo: revert the suite edits; drop the `gfx === 'min'` line.

**A107 Step 11e: an elbow inside the trunk swivels out after the arm IK.** e2e-clip "aim walking + crouched" read the
right elbow 6.9 cm inside the trunk for one frame (G72's lower shoulder, A1). Diagnosis: the right hand comes forward
from the back draw; the shoulder and elbow are rate-limited (`limitJoint`), so the lagging upper arm swung the elbow
across the back and through the chest. `characterRig.keepElbowOut` (after the limit, both arms): an elbow closer than
the chest half depth + 2 cm to the pelvis -> neck line turns round the shoulder -> wrist axis (`rigMath.elbowSwivelClear`,
15 deg steps, the smallest that clears) and the hand keeps its world rotation; shoulder prevRot follows. e2e-clip: min
elbow +4.4 cm (limit -3 cm unchanged); G72 kept. Undo: drop the two `keepElbowOut` calls.

**A108 Step 11e: Wren's per-frame code allocates nothing; the extra allocation reading is V8 tier-up.** perf.mjs
(GPU, gfx=epic, Warehouse) with Wren never loaded (same tree, LODs skipped) reads 7.57 MB/s at the default warm-up
and 7.18-7.25 at WARM=48; with Wren 11.03-11.07 and 8.32-8.34. No figure / poser function is among the allocators
(cut-off 50 KB/s). A V8 log (--log-deopt) shows the rig's `animate` / `applyTargets` reaching TurboFan only inside the
4 s sampling window with Wren (deopts from type feedback and prototype-chain changes during warm-up), so they run in
baseline / Maglev code that boxes doubles; at WARM=48 `applyTargets` reads 376 KB/s with Wren vs 366 without. The
remaining +1.1 MB/s at WARM=48 is spread over non-Wren code in other JIT states (anim curve sampler, Havok iterator,
HUD). Fixed anyway: the attach path's per-step override object, the pipe grip closure, the soft-knee fields' Smi ->
double change (a deopt in the rig update). Budget 11.52 MB/s passes either way. Undo: none needed.

**A109 Step 11e fix r1: the game warms Wren's play LODs into the offline cache once the worker controls the page.**
The GLBs are only runtime-cached (A98 / A100) when a fetch goes through the controlling worker. The first online visit
loads Wren before the worker claims the page, so her files missed the cache and the next offline start had no body
(e2e-offline: "Wren failed to load: Failed to fetch", solo and in the full run). `operators/runtime/offline.ts`
`warmPlayLods` runs after the menu's (or the match's) play LODs load: with a controller now (or at its
`controllerchange`) it fetches each play LOD not yet in the cache once through the worker (`manifest.ts`
`playLodUrls`: LOD2, LOD0, LOD1; `?gfx=min`: LOD2). So one online start that reaches the menu leaves the play LODs
cached; the hero stays on demand (cached the first time a close-up asks for it). Chosen over precaching LOD2 (2.5 MB in
every install, and still no LOD0 / LOD1 offline). A failed warm is an info line, not a warning (the loads report real
failures; the next start warms again). e2e-offline now waits for the warm before going offline and asserts the offline
match's player has LOD2 loaded. Undo: drop the two `warmPlayLods` calls (then offline play needs a second online start).

**A110 Step 11e fix r1: a body load cut off by the page unloading or its scene going away is not reported.**
`offline.ts` `pageLeaving()` is true from `pagehide` to `pageshow`; `warnLoad(e, figure)` and the close-up warning
stay quiet while it is set or when the figure / its scene is disposed (`OperatorFigure.isDisposed`). Babylon's own
"Failed to load KTX2 texture data" (the transcoder's wasm fetch aborted by a reload; e2e-offline's save-migration
reload, e2e-desktop's 21:9 reload) is dropped by a `Logger.Warn` filter in `lab/ktx2.ts` while the page is
leaving, and once per KTX2 texture disposed before it loaded (`ktx2Abandoned`, within 30 s: a scene disposed
mid-transcode, where Babylon uploads into the released texture: "Cannot read properties of null (reading
'memoryAllocated')", seen once in e2e-desktop:1 in a full run); every other KTX2 warning prints. No suite's console
filter changed. Undo: drop the checks (abandoned loads
then print as failures).

**A111 Step 11e fix r1: light samples and exposure points come from the body's height.** G166 / ops D11 ("light sample
heights match their real size") and A99 said the light meter follows Wren; off the wall it still sampled a 1.75 m body
(`gameState.ts`: `1.75 * (1 - 0.35 * crouch)`, remotes `1.75 * 0.65`). Now `game/bodyHeight.ts`
`lightSampleHeight(height, crouch)` (pure, tested) takes the rig's height: the local player `player.rig.height`, a
partner `PlayerRef.height` (its RemoteAvatar rig's, set where the ref is made on host and client alike; nothing sent);
Wren samples at 1.68 m standing, 1.092 m crouched (7 / 4.6 cm lower). `tactics.ts` `exposurePoints` /
`exposurePointsPosed` take the same height (point heights scaled by height / 1.75; lean offsets unchanged). The on-wall
posed head sample is unchanged; guards and anything without a height keep 1.75. Traversal keeps `GAMEPLAY_HEIGHT`
(G176). Undo: pass 1.75 (the meter then samples above her head).

**A112 Step 11e pre-PR: the partner's goggle is cyan (G135, per player slot).** Master's G135 (Michael: "Follow the
original: partner beacon (distinct light colour per player) + world pings.") wants each player's goggle light its own
colour. While both players are Wren (G123) the colour follows the player slot, not the operator: `goggle.ts`
`goggleSlot` (host 0, the others 1, 2 in the host's player order, which every peer shares) and `goggleColour` (pure,
tested in `tests/goggleColour.test.ts`); slot 0 keeps the lens asset's own green, slot 1 is cyan (linear emissive
0.08 / 0.78 / 1.0, about the green's luminance). Cyan, not amber (the bible's Moth colour): amber is the HUD's exposure
warning (`.tac-exposure` #ffb03b), and green / amber collapse for a deuteranope (Machado simulation: 0.14 apart against
cyan's 0.8; the bible asks for colours that stay distinguishable for common colour blindness). Applied per body through
`OperatorFigure.setGlowColour` (the glow material is already cloned per body) by `setPlayerGlow` in playerFigure.ts,
called from the co-op host and client on start, on lobby changes and when a partner body is made; nothing is sent.
Emissive only: no light, guards never see it. Slots 2-3 (magenta, warm white) exist only for the legacy 4-player lobby.
World pings are not part of this. Undo: drop the `setPlayerGlow` calls (everyone green).
