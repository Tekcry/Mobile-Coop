# Documentation audit (M27, 2026-10-17)

This audit read the documentation on every branch that feeds the consolidation (M26): master, feature/ct-locomotion (which contains feature/kestrel), feature/footsteps, feature/weapon-audio, feature/music, feature/training-bunker, feature/menu-ui-spec and ct-movement, plus feature/operators read-only so master does not contradict its decisions. Seven read-only audits ran in parallel, one per area (vision core; movement, camera and controls; levels, light and AI; training, menus and HUD; audio and music; art, characters and weapons; platform, co-op, testing and process). Each listed contradictions between branches, rules that Michael's decisions M12-M27 overturned (phones and touch, the Blacklist systems, the old branch flow, the bot partner, sprint, lean-out, the SWAT turn), unconfirmed ASSUMED decisions, clashing numbers and gaps. Findings that two or more audits found are merged into one entry that keeps every ID and every citation. Michael's answers to the questions built from these findings go to docs/DECISIONS.md.

Citations are `branch:path:line` from `git show origin/<branch>:<path>` at the branch heads of 2026-10-17. Short branch names: loco = feature/ct-locomotion, tb / train = feature/training-bunker, ctm = ct-movement, ops / OPS = feature/operators, fs = feature/footsteps, wa = feature/weapon-audio, mus = feature/music, menu / MENU = feature/menu-ui-spec. Lines marked "Compiler note" were added while merging and checked against the branches.

## Summary

| Area | Findings high / medium / low | ASSUMED rows by status |
| --- | --- | --- |
| Vision core | 8 / 9 / 5 | vision-level (13): open 7, approved 2, void 2, technical 2 |
| Movement, camera, controls, takedowns and gadgets | 7 / 16 / 8 | locomotion A0-A89 (90): open 21, approved 7, implied 1, void 22, technical 39 |
| Levels, maps, light and stealth AI | 6 / 14 / 8 | kestrel / levels (20): open 14, technical 6 |
| Training bunker, menus, HUD, modes and saves | 4 / 14 / 7 | training (90): open 14, approved 13, void 15, technical 48; menu-ui (5): open 4, void 1 |
| Audio and music | 3 / 9 / 7 | audio (18): open 4, approved 6, void 2, technical 6 |
| Art, characters, operators and weapons | 4 / 14 / 12 | operators (89): open 7, approved 3, void 12, technical 67 |
| Platform, performance, co-op, testing and process | 9 / 15 / 7 | rows folded into the locomotion and training tables |
| All areas | 41 / 91 / 54 (186 findings; 24 merged entries cover 56 of them, so 154 distinct entries) | 383 rows read; tables below |

Counts per area are the audit's own findings before merging. Status classes: open = Michael must decide; approved = a Michael decision covers it; void = a later decision overturned it; technical = an implementation detail; implied = consistent with a later decision, confirm in bulk.

## Top problems

- PL1 / V1 / MV3 / TU13 - Desktop only (M21) reached two CLAUDE.md files; every bible still makes the iPhone a first-class target with phone gates, a touch scheme and phone sign-offs.
- PL18 / V2 - Every CLAUDE.md, the bible, deploy.md and the Kestrel rules still order the dead ct-movement -> dev -> master flow (M26).
- V3 / MV1 - The bible on every branch describes sprint, lean-out aim, the SWAT turn, instant stops, the elbow strike and 360 deg/s turns; M14-M27 never reached it.
- MV4, MV5, MV6 - Five speed tables, four stop / start / turn models and three back-to-wall rule sets exist side by side; master must state one target (the CT prototype plan).
- LV1 / MV20 - Level standard Section 12 still says the four slowest crouched speeds are silent; the CT footage gives two standing and three crouched, and nothing schedules the engine-fact update.
- LV2, LV3 - Kestrel's approved facts sheet, time budget, sensor rules and room sizes rest on pre-CT speeds and the old shoulder camera.
- AU1 / V6 / PL8 - The audio-source hard rule has six versions; Michael's "CC0 for everything" (2026-10-16) exists only on weapon-audio, and the audio budget (AU2) is already exceeded.
- AR1 / V8 / LV16 - Michael's approved operator rules (Blender pipeline on a CC0 body, real heights, light samples follow the body) are only on the unmerged operators branch; master would state the opposite.
- PL11 / V12 / TU1 - The dropped bot partner (M12) is still required in the bible, the run rules and the training plan; the bunker's next step waits for it forever.
- V4 / LV6 / TU15 - Hunter, Wave and a PvP Mission are "history" in CLAUDE.md and "coming back" in the newer bible note.
- PL21 / V10 - Three version schemes claim the same numbers (training used 3.7.0-3.9.0, locomotion planned 3.7.0 / 3.8.0, the game shows 3.5.1).
- PL20 / V11 - Three ways of running a job (bible Opus / Sonnet loop, orchestrator, Kestrel planner with no subagents) and two authority orders.
- AR3 - No decision on the look: voxel world and blocky guards versus smooth realistic operators.
- AR2 / TU11 - The shipped default goggle and the planned brightness symbol are the banned three-lens look.
- PL3 - Most required e2e suites boot as a touch phone (Pixel 7 emulation), so the shipped desktop game is mostly untested as such.

The sections below follow the seven audits. Each keeps every finding of its audit; a finding that another audit also found sits in one merged entry, and the other section lists a pointer to it.

## Vision core (audit A)

Scope: CLAUDE.md, design bible, progress, story, backlog, prompts, README, BIBLE-PROPOSALS.

### V3 / MV1 The bible never received M14-M27; its movement, takedown and animation vision contradicts CT-pure  (severity: high)
- Found by: V3 (Vision core audit, high); MV1 (Movement, camera, controls, takedowns and gadgets audit, high).

**V3: The bible never received M14-M27; its movement, takedown and animation vision contradicts CT-pure**
- Where (loco bible unless named):
  - Version stops at 1.13 / D1-D8 (`:5`, `:1239-1320`). `docs/locomotion/BIBLE-PROPOSALS.md:16-22` covers only M12,
    20b and M21; M20 itself says "bible proposals to follow" (`docs/locomotion/DECISIONS.md:226`) and none exist.
  - Sprint: P4 `:94` (speed gears), verb table `:168` "Speed gears (6)", 5.3 `:354` "sprint (gear 6 while held)", 5.12.1
    `:777` gears 5-6, Section 8 `:1423` "Hold or toggle for crouch, aim and sprint", D2 `:1252` "sprint 8 cm", D5 `:1272,1279`,
    D7 `:1291` sprint hold / toggle - against M20 Q8 "Drop sprint".
  - Instant control: `:169`, `:355`, 5.12.1 `:763-782`, D5 heading `:1268` "Control stays instant" - against M14 (0.3 s to
    full speed, 0.25 s to stop) and M20 Q2 (freeze mid-stride at walk / crouch, braking stop only at run).
  - Turns: 5.12.1 `:783` 360 deg/s - against M20 Q7 about 440 deg/s.
  - Back-to-wall: `:176` and 5.3 `:373-380` (stick-held entry, gear speed, lean out to aim and shoot, SWAT turn, pull away
    to leave) - against M20 Q1 (lean-out and SWAT removed, shoulder swap instead), M25 (3) only the button or aiming
    leaves, M25 (4) flat back standing / sideways crouched, A83 button-only entry, A84 slow shuffle.
  - Strike: verb table `:204` and 5.4 `:431-439` (elbow strike, stagger on aware guards, 0.4 s miss recovery) - against
    M20 Q4 / Q4b (palm strike, one-hit knockout from any side) and M25 (5) recovery about 1.4 s.
  - HUD: 5.10 `:731` "stance and gear pips" - against M25 (7) no gear indicator.
  - Roadmap Phase 3 `:1492` "Back-to-wall (peek, lean-shoot, SWAT turn ...)".
- What: the newest movement rules live only in docs/locomotion/DECISIONS.md. Master's bible would describe the movement
  Michael rejected on 2026-10-17.
- Options: (1) Rewrite bible P4, Section 4, 5.3, 5.4, 5.10, 5.12 and the roadmap to M14 / M20 / M23 / M25: CT behaviour
  measured from the footage is the authority, numbers marked "prototype targets, tuned after Michael plays P1";
  D2 / D5 / D9 / D10 kept as history where they differ (recommended). (2) Leave the bible and point to DECISIONS.md.
  (3) Wait until after the prototype play test to rewrite.

**MV1: The bible's movement, camera and stealth-verb text predates M20 / M25 on every branch**
- Where:
  - `feature/ct-locomotion:docs/design-bible.md:168-178` (verb table: 6 gears, quick 180, back-to-wall "lean out to aim and shoot, SWAT turn"), `:204` (elbow strike staggers an aware guard), `:349-350` ("No free lean button. Leaning is contextual (aiming past a corner)"), `:354` (6 gears and sprint), `:373` (stick held into a wall enters), `:374` (slide at the current gear speed), `:377-378` (lean out to aim, SWAT turn), `:380` ("Pull away to leave"), `:431-441` (elbow strike, stagger, heavies only stagger, whiff 0.4 s), `:775-783` (gears 5-6 braking step; turns over 360 deg/s shown as a plant-and-pivot step), `:1492-1493` (roadmap Phase 3: "lean-shoot, SWAT turn"; Phase 3b: bot partner, phone feel pass).
  - Same text on the other branches: "Keep the 6 gears" `master:328`, `feature/footsteps:355`, `feature/weapon-audio:358`, `feature/training-bunker:354`, `ct-movement:356`, `feature/operators:356`; "lean out to aim and shoot" `master:351`, `footsteps:378`, `weapon-audio:381`, `training-bunker:377`, `ct-movement:379`, `operators:379`; "Gears 5-6 ... braking stop" `master:732`, `footsteps:781`, `weapon-audio:784`, `training-bunker:777`, `ct-movement:779`, `operators:779`.
  - Overriding decisions: `feature/ct-locomotion:docs/locomotion/DECISIONS.md:226` (M20: pure CT, overrides "bible 5.3 / 5.4 / 5.12 text where they differ"; Q1 removes wall-edge shooting and SWAT, Q4 one-hit KO any side, Q4b palm, Q7 ~440 deg/s, Q8 no sprint), `:231` (M25), `docs/locomotion/PROTOTYPE-PLAN.md:21-87`.
- What: Every branch's bible still describes sprint, lean-out aim, SWAT turn, stick entry, pull-away leave, a gear-speed wall slide, the elbow strike with a stagger table, and plant-and-pivot turns. M20 says CT footage overrides this text, and M20 promised "bible proposals to follow", but BIBLE-PROPOSALS.md (`:1-22`) has none.
- Options: (1) Rewrite bible 4 (verbs), 5.3, 5.4, 5.5, 5.12.1 and the roadmap rows from M20 / M25 and PROTOTYPE-PLAN, marking numbers still to be tuned at the P1 / P4 play tests as "prototype values" (recommended). (2) Add a new Section 5.18 "Pure CT (M20-M25)" that overrides 5.3 / 5.4 / 5.12, like 5.17 did. (3) Leave the bible until the prototype is approved (master would then state a vision Michael has already overturned).

### V4 / LV6 / TU15 Wave, Hunter, the old Mission mode and PvP: "history" or "coming back"?  (severity: high)
- Found by: V4 (Vision core audit, high); LV6 (Levels, maps, light and stealth AI audit, high); TU15 (Training bunker, menus, HUD, modes and saves audit, medium).

**V4: Wave, Hunter, the old Mission mode and PvP: "history" or "coming back"?**
- Where: `loco:CLAUDE.md:13` ("Blacklist systems (... PvP, Wave) is history"); `loco:docs/design-bible.md:20` (history list
  includes PvP and Wave); against `loco:docs/design-bible.md:1334-1335` ("Hunter and Wave Survival - Michael wants both
  back ... unparked, Michael 2026-10-11"; "Mission returns as PvP attack and defend"), `:1503` (roadmap: Hunter and Wave
  return), `loco:docs/backlog.md:26` (item 26: unpark Hunter, Wave and Mission game-wide; Mission redesigned as PvP attack
  and defend; TDM / FFA stay parked), `:1336,1161` (the Confrontation reuses the parked PvP network code).
  `ct-movement:docs/design-bible.md:1252-1253` has the shorter text without the 2026-10-11 note (the merge keeps kestrel's).
- What: the same modes are called history (do not extend) and planned returns. The 2026-10-11 note is newer than the
  2026-10-08 history list.
- Options: (1) Hunter and Wave return after the vertical slice on campaign maps; Mission returns as team attack and
  defend after the campaign; TDM / FFA stay parked; CLAUDE.md's history list names only snap cover, Mark & Execute,
  sonar and the style economy (recommended). (2) All of them stay parked indefinitely. (3) Remove them.

**LV6: Hunter, Wave and PvP Mission are planned for Cinder Yard but called history elsewhere**
- Where: `loco:docs/kestrel/progress.md:276` (Michael 2026-10-11: Hunter, Wave and Mission unparked game-wide, Mission
  redesigned as PvP attack and defend); `loco:docs/kestrel/handover.md:76` (stage BM after B7); `loco:docs/design-bible.md:
  1334-1336` (unparked; "Mission returns as PvP"), `:1503` ("Hunter and Wave return on campaign maps"); `loco:docs/systems/
  ai.md:35-38,136,149` (Wave, tdm / ffa, autostart modes); against `loco:CLAUDE.md:13` ("Blacklist systems (... PvP, Wave)
  is history").
- What: Michael's 2026-10-11 Kestrel decision brings Wave and a PvP Mission back on the campaign map; the newer CLAUDE.md
  line treats Wave and PvP as Blacklist history. Master cannot state both. Hunter (clear the building) is not on the
  Blacklist list, so it may survive either way.
- Options: (1) Recommended: Wave and PvP Mission stay history; Hunter stays parked and is revisited after the campaign;
  remove stage BM from Kestrel's order. (2) Keep the 2026-10-11 plan: all three return on Cinder Yard after the slice.
  (3) Drop all three for good.

**TU15: Hunter, Wave and PvP: "history" or "coming back"?**
- Where: `feature/ct-locomotion:CLAUDE.md:13` ("Blacklist systems (... PvP, Wave) is history"); M-preamble (same);
  `feature/ct-locomotion:docs/design-bible.md:1334-1335` (Hunter and Wave "unparked, Michael 2026-10-11"; the old
  Mission mode "returns as PvP attack and defend"), `:1503` (roadmap "Hunter and Wave return on campaign maps");
  `feature/ct-locomotion:docs/systems/modes-and-progression.md:2,66-69` (parked behind `?legacy=1`). Other branches'
  bibles (master 1147-1148, ct-movement 1252-1253, operators 1264-1265, footsteps 1254-1255) lack the 2026-10-11
  notes.
- What: CLAUDE.md calls Wave and PvP history; the newest bible says Michael wants Hunter and Wave back and Mission back
  as PvP attack and defend; the Confrontation (5.15) also reuses the PvP net code.
- Options: (1) "Parked, planned to return after the campaign (Hunter, Wave, PvP attack and defend)"; CLAUDE.md wording
  narrowed to the Blacklist mechanics (recommended) (2) They are history; drop them from the roadmap (3) Hunter only.

- Compiler note: `CLAUDE.md:13` on feature/ct-locomotion dates from 2026-10-08 (git log), so the 2026-10-11 bible note is the newer statement; LV6's "newer CLAUDE.md line" is not right. LV6 recommended "Wave and PvP stay history"; V4 and TU15 recommended "parked, return later". The question offers both.

### V5 Voice: "never" versus a planned voice test  (severity: high)
- Where: `loco:CLAUDE.md:67` ("No voice. Story is text radio and subtitles only"), `loco:docs/design-bible.md:55,1346`
  ("Never: recorded or synthesised voice"), `loco:docs/story.md:35` ("Text only. No voice, no recorded or synthesised
  audio"); against `loco:docs/backlog.md:13` (item 6: voice test after Phase 4, three voice sources, Michael picks by ear,
  "write all radio lines short and voice-ready").
- What: a hard rule and a backlog plan disagree. Separately, story line 35 says "no recorded ... audio", which now
  contradicts the CC0 recorded sound decision (V6); it was meant for voice only.
- Options: (1) Text only now; keep the voice test as a backlog item after the mission framework, decided then; lines
  written voice-ready; story line 35 reworded to "no voice acting" (recommended). (2) Text only forever; delete item 6.
  (3) Plan voice now.

### V9 The roadmap and status table no longer describe the project  (severity: high)
- Where: `loco:docs/progress.md:7-19` (Phases 2-7 "not started"; FP S2-S10 "not started"; Phase 1 paused) and `:21-37`
  (current state of 2026-10-10); `loco:docs/design-bible.md:1` (banner "Current milestone (2026-10-10): the vertical slice"),
  `:1485-1505` (roadmap); `loco:CLAUDE.md:18-19` ("Read the current phase spec docs/prompts/phase-N-*.md": none is current);
  `loco:CLAUDE.md:109` (prompts "phase 0-1").
  What actually happened: the locomotion run built Phase 3 + 3b steps 01-22 (`loco:CHANGELOG.md` "Locomotion run (Phase 3 +
  3b, in progress)") and is now replaced by the CT prototype P1-P4 (M22, PROTOTYPE-PLAN.md); kestrel is mid-way
  (`loco:docs/kestrel/progress.md`: P00, S0, P01-P03T approved, S1 / P03B draft, V1-V3 toolkit pending); the Fallow bunker
  Blocks A-C were built (training-bunker CHANGELOG 3.7.0-3.9.0); movement foley, weapon sounds and a score exist (parts of
  Phase 2's audio, while Phase 2's noise zones, masking, sound meter and whistle are not built); operators are being built
  (a Phase 5 item, early). Phase 1 Steps 4c-9 stay parked (`:11`); the merge plan and follow-ups were to be copied into
  progress.md (`loco:docs/locomotion/OWNER-NOTES.md:84,100`) and were not.
- What: a new session following CLAUDE.md's "Every session" steps would read a phase table that is a week out of date.
- Options: (1) Replace the phase table with an ordered job list in progress.md (job, branch, folder, status, next step),
  keep the phase numbers only as bible chapter labels, and copy CONSOLIDATE's after-merge plan into it (recommended).
  (2) Keep phases 0-7 and mark each with its real state. (3) Leave as is.

### V13 / LV5 Gadget and toolkit design moved on (kestrel V0) but the bible did not  (severity: high)
- Found by: V13 (Vision core audit, medium); LV5 (Levels, maps, light and stealth AI audit, high).

**V13: Gadget and toolkit design moved on (kestrel V0) but the bible did not**
- Where: `loco:docs/design-bible.md:223,226` (light disruptor = sidearm attachment; camera jammer = separate gadget),
  `:483` (suppressed pistol "carries the light disruptor"), `:189-195,202,225` (lockpick "touch-friendly", knife, ring
  airfoil: Phase 6), `:1496` (Phase 6 list); against `loco:docs/systems/ct-toolkit.md:2-4` (APPROVED 2026-10-11: one tool,
  the "pistol secondary", is both jammer and disruptor; toolkit built in kestrel V1-V3 for Dead Line's kit; airfoil and
  knife deferred, `loco:docs/backlog.md:23-24`) and `ct-toolkit.md` section 2 (inputs table with a phone touch column; wall
  hug entered by "a move key held into the wall"). Kestrel V1 "wall hug" (`loco:docs/kestrel/handover.md:85,93`) and the
  locomotion back-to-wall are two plans for the same verb. Kestrel B6 adds rating counters "no knockouts" and "no grabs"
  (`handover.md:84`) not in bible 5.8 (`:578`).
- What: Phase 6 verbs are being specified inside the vertical slice job, and the bible still shows the old split.
- Options: (1) Bible 4 / 5.5 / 5.6 / 5.8 follow the approved toolkit spec; one wall verb only, the CT-pure back-to-wall
  from the prototype, with kestrel V1 reduced to the optic cable; touch columns dropped (recommended). (2) Keep the bible
  and revise the toolkit.

**LV5: Kestrel still plans to build its own back-to-wall with removed CT-breaking verbs**
- Where: `loco:docs/systems/ct-toolkit.md:2` (APPROVED), `:20-21` (wall hug inputs incl. touch "Wall" button and stick held
  into the wall), `:42-43` (lean out to aim, SWAT turn, pull away to leave, slide at gear speed), `:213` (V1 builds the
  wall hug and deletes snap cover); `loco:docs/kestrel/handover.md:85` ("Wall hugging is not in the engine yet"), `:93`;
  `loco:docs/kestrel/progress.md:293`; `loco:docs/kestrel/RULES.md:51` (V0 is the capability authority); against
  `loco:docs/locomotion/DECISIONS.md:214` (A83 entry by button only), `:226` (M20 Q1 removes wall-edge shooting, lean-out
  aim and the SWAT turn), `:231` (M25: only the button or aiming leaves the wall; flat back standing, sideways crouched).
- What: the locomotion run already built back-to-wall and deleted snap cover; M20 and M25 then removed several verbs the
  approved toolkit spec still lists. Kestrel sessions are told to cite V0 for what moves exist, so they would design
  lean-out and SWAT spots that the game will not have.
- Options: (1) Recommended: mark ct-toolkit 3.1 and V1's wall-hug half superseded by the locomotion back-to-wall
  (M20, M25); V1 keeps the optic cable only; Kestrel's capability rule cites the current movement doc instead of V0 for
  movement. (2) Rewrite ct-toolkit 3.1 to the CT prototype's wall rules and keep it as the reference.

- Compiler note: `ct-toolkit.md:2-4` records Michael's approval (2026-10-11) that the camera jammer and light disruptor are one tool, the pistol secondary. AR15 recommended the opposite ("bible wins"); the question recommends the approved toolkit.

### V15 Is the game solo-first or co-op-first?  (severity: medium)
- Where: `loco:docs/design-bible.md:51-55,104-108,664,711` (every mission fully solo; "Solo is complete. Co-op adds
  routes"; Michael playtests mostly alone) versus `operators:docs/design-bible.md:1008` ("realism over fairness; the game
  is mostly co-op") and the co-op-only Fallow bunker (V14).
- What: recent decisions lean co-op, the pillars say solo first. It affects fairness rules, training and test effort.
- Options: (1) Solo first, co-op adds routes and moments; operator sizes are a co-op flavour that never changes
  routes (recommended). (2) Co-op first, solo supported. (3) Equal.

### V16 Mission 8 and the palm strike  (severity: medium)
- Where: `loco:docs/design-bible.md:1087-1093` (Confrontation: elbow strike from the front is only a shove; from outside
  the front cone it knocks out), `:1062` (protagonist unarmed), `:1148` (phone haptics); `loco:docs/story.md:245`;
  against M20 Q4 / Q4b (one-hit knockout palm strike from any side, CT-pure).
- What: if the CT-pure strike applies in the finale, an unarmed protagonist wins with one frontal hit, breaking rule 3
  ("neither side may win straight away").
- Options: (1) The finale keeps its own rule (front hit = shove), stated as the one exception to M20 (recommended).
  (2) CT-pure everywhere; the finale is retuned. (3) Decide in the Confrontation prototype.

### V17 Thermal vision is described four ways  (severity: low)
- Where: `loco:docs/design-bible.md:214` ("sees through smoke and thin fabric"), `:463` ("Vision modes never change
  detection"); `loco:docs/backlog.md:18` (item 13 target colour ramp); DECISIONS A26 (`:139`, not through walls), M25 (1)-(2)
  (CT colour ramp; people seen through closed doors as a dim blue silhouette).
- Options: (1) One bible line: CT colour ramp; sees heat through smoke and darkness, people through closed doors as a dim
  silhouette, not through walls or glass; render only, never changes guard detection (recommended). (2) Also through
  thin walls.

### V20 Small stale facts and index gaps in the core docs  (severity: low)
- Where: `loco:docs/design-bible.md:746` (SAVE_VERSION "7 on dev"; code is 8 on loco, 7 elsewhere), `:156` (status legend),
  `:1` (banner); `loco:CLAUDE.md:101-131` (doc index has no row for docs/locomotion/, docs/training/, docs/audio/,
  docs/menu-ui/, docs/operators/, docs/systems/ct-toolkit.md, docs/backlog.md, docs/research/); `:98` (audio = synth only);
  other branches' CLAUDE.md `cover/` row "scheduled for removal in Phase 3" and a `docs/systems/cover.md` row that loco
  deleted; `loco:README.md:13` (drone listed as a gadget; parked), `:19`; `loco:docs/design/scale-sheet.md:12` (gear speeds
  0.8-5.0, now changed by A88 and M25's 4.2 m/s run); `loco:docs/backlog.md:19` (item 14 iPhone crash, void by M21),
  `:37` (e2e-touch flaky, to be retired per M21); bible Section 11 `:1529` (audio source still "open").
- Options: (1) Fix all in the rewrite as plain corrections (recommended). (2) Leave until each area is next touched.

### V21 History documents are still in live folders  (severity: low)
- Where: `docs/prompts/blacklist-overhaul.md` on every branch (the Shoulder Strike 2.0 Blacklist build prompt);
  `docs/prompts/phase-0-foundation.md`, `phase-0-handover.md` (done), `phase-1-light-parity.md:54,72,207-240` (iPhone gates,
  Steps 5-9 parked); `docs/design/map-dead-line*.json/.mjs/.png`, `map-trunk-annex.json`, `dead-line-v2-*` (retired designs,
  still read by `scripts/e2e-dead-line*.mjs`, `gen-dead-line*.mjs`, `g1-*.mjs`); footsteps / music / weapon-audio still hold
  `docs/prompts/exchange-*` (merge base; the merge keeps loco's move to the archive).
- Options: (1) Move the Blacklist prompt, the finished phase-0 docs and the retired map data to docs/archive/, and retire
  the retired-map test suites with them; Phase 1's spec is rewritten desktop-only when its parked steps restart
  (recommended). (2) Leave in place.

Merged into entries in other sections:

- V1 Platform: four different statements of what the game runs on (high): merged into PL1 / V1 / MV3 / TU13 under Platform, performance, co-op, testing and process.
- V2 Branch flow, preview slots and branch-specific start lines are stale (high): merged into PL18 / V2 under Platform, performance, co-op, testing and process.
- V6 Audio source rule: four versions across branches (high): merged into AU1 / V6 / PL8 under Audio and music.
- V7 Music has no place in the bible, and its direction contradicts itself (medium): merged into AU3 / V7 under Audio and music.
- V8 Operators: master's bible and story contradict Michael's 2026-10-15 operator decisions (high): merged into AR1 / V8 / LV16 under Art, characters, operators and weapons.
- V10 Version numbers collide (medium): merged into PL21 / V10 under Platform, performance, co-op, testing and process.
- V11 How work is run: the bible's process section is from before the orchestrator method and M22 (medium): merged into PL20 / V11 under Platform, performance, co-op, testing and process.
- V12 The dev bot partner is promised in five places but was dropped (medium): merged into PL11 / V12 / TU1 under Platform, performance, co-op, testing and process.
- V14 What teaches the player: solo Training mode or the co-op-only Fallow bunker? (medium): merged into TU20 / V14 under Training bunker, menus, HUD, modes and saves.
- V18 Aim assist after touch is gone (low): merged into MV26 / V18 / AR13 under Movement, camera, controls, takedowns and gadgets.
- V19 Loadout names and promised features not built (low): merged into AR12 / V19 under Art, characters, operators and weapons.
- V22 Gap: master has no single list of Michael's decisions (medium): merged into PL25 / V22 / AR24 under Platform, performance, co-op, testing and process.

## Movement, camera, controls, takedowns and gadgets (audit B)

Scope: docs/locomotion, ct-movement docs, movement / input / takedowns / gadgets system docs, bible 1-4, 5.3-5.6, 5.12, 5.17, 8-10.

### MV2 Section 5.17 / DECISIONS D1-D11 are partly void, and only RULES.md shows it  (severity: high)
- Where: `feature/ct-locomotion:docs/design-bible.md:1243-1318` (5.17 verbatim D1-D8); `docs/locomotion/DECISIONS.md:7-13` (D1 touch scheme), `:17` (D2 "sprint 8 cm"), `:28-29` (D4 phone budgets), `:36-37, :39, :46` (D5.3 settle, D5.4 plant-and-pivot, D5.6 soft knees / ready hands, D5.13 spring camera, look-ahead, auto shoulder swap, FOV by gear), `:45` (D5.12 "a bumper or the rocker"), `:56` (D7 sprint hold / toggle), `:79` (D8 bot partner), `:87-99` (D9, D10), `:105-107` (D11 e2e-bot, bot play check); `docs/locomotion/RULES.md:14-21` (D1 and D4 already rewritten for M21, D9 / D10 still listed as live); `docs/locomotion/BRIEF.md:39, :115, :140` (bot partner).
- What: D1 touch (M21), D4 phone budgets (M21), D8 / D11 bot partner (M12), D9 / D10 (M20 Q1), the D2 sprint row and D7 sprint toggle (M20 Q8), and D5.3 / 5.4 / 5.6 / 5.13 (M20 footage, see MV21) are void or overturned, but the bible copy and DECISIONS.md show them as current. ct-movement and operators bibles (1.14 / 1.15) cite "1.13 ... D1-D8 in Section 5.17" in their version line but do not contain 5.17 at all.
- Options: (1) In the master bible replace 5.17 with the surviving decisions only, each marked with what overturned the rest, and point to the new docs/DECISIONS.md (recommended). (2) Keep 5.17 verbatim as history and add an "as amended" column. (3) Drop 5.17 and keep D1-D11 only in docs/locomotion/DECISIONS.md.

### MV4 Five different speed tables  (severity: high)
- Where: `docs/ct-movement.md:67-68` (all branches: 6 gears, standing 0.8 / 1.3 / 2.0 / 2.8 / 3.8 / 5.0, crouched 0.5-2.8); `feature/footsteps:docs/systems/movement.md` gear text (same old caps, also on music, weapon-audio, training-bunker, ct-movement, operators); `feature/ct-locomotion:docs/systems/movement.md:14-18` (A88: 0.65 / 1.1 / 1.65 / 2.3 / 3.15 / 4.15, crouched 0.42-2.3) and `:122-126` (MOVEMENT table: walk 1.4, jog 2.8, sprint 5.0, crouch run 2.6, cover-era bands); `docs/locomotion/PROTOTYPE-PLAN.md:22-24` (5 speeds, no sprint: 0.2 / 0.75 / 2.0 / 3.0 / 4.0-4.6, crouched 0.4 / 0.85 / 1.5 / 2.1 / 2.6; run starts at 4.2 per M25); `docs/locomotion/research/ct-measure-speeds-stops-posture.md:18-31` (run measured 4.6, range 3.5-5).
- What: The same quantity has five values across branches and docs; the current code (A88) matches none of the plan's numbers and still has a sprint gear. Bible 5.3 metrics freeze (`design-bible.md:412-426`) also lists "the run / sprint braking stop".
- Options: (1) Master docs state only the prototype targets (5 speeds standing and crouched, run 4.2 m/s start value, no sprint) and say the code still runs the step-22 table until feature/ct-prototype lands (recommended). (2) Document the current code (A88 table) as truth and treat the prototype as a plan. (3) Keep both tables side by side.

### MV5 Four different stop / start / turn models  (severity: high)
- Where: `docs/ct-movement.md:79-85` (stop on the next step, 0.12 s blend to idle, 95 % start in 0.08 s, no pivots, 720 deg/s); `docs/ct-movement-progress.md:256-267` (approved 2026-10-07: the frozen stride holds "until the next input"); `feature/ct-locomotion:docs/systems/movement.md:26-37` (step 22: 0.3 s start spring, 0.25 s stop, turn inertia, planted reversal pivot, 720 deg/s) and `:129-135` (MotionDriver: travelRate 540-300 deg/s, aim 360 deg/s, reversals over 135 deg = 0.3 s planted pivot); `docs/design-bible.md:775-783` (gears 1-4 stop in 0.12-0.2 s with a planted lead foot and weight shift back; gears 5-6 braking step; > 360 deg/s = plant-and-pivot); `docs/locomotion/DECISIONS.md:213` (M14 N6: 0.3 s up, 0.25 s stop, overrides "instant"); `docs/locomotion/PROTOTYPE-PLAN.md:26-38` (feet freeze mid-stride, hold ~1.7 s, blend 0.3-0.4 s; ~450 deg/s cap, no pivot, flick 180 in ~0.4 s, run reversal one 0.37 s turn).
- What: The bible, the old CT spec, the approved 3.2.0 change, the current code docs and the prototype plan each describe a different stop, start and turn. The prototype also contradicts the 2026-10-07 approved hold-until-input rule (it eases to idle after ~1.7 s).
- Options: (1) Master describes the PROTOTYPE-PLAN P1 model as the target and marks the step-22 code and the 3.2.0 spec as history (recommended). (2) Keep bible 5.12.1 as written and treat the prototype as an experiment. (3) Ask Michael for each sub-rule (see Q-move-1 to Q-move-3).

### MV6 Back-to-wall rules disagree (entry, slide speed, leaving, stance)  (severity: high)
- Where: `docs/design-bible.md:373-381` (stick held into a wall enters; gear-speed slide; pull away to leave); `feature/ct-locomotion:docs/systems/movement.md:179-185` (context press only (A83), slide 0.9 / 0.6 m/s, leave by press or pull-away > 0.7 for 0.3 s, flat back stance, off hand on the wall); `docs/locomotion/DECISIONS.md:136` (A23), `:214-215` (A83, A84), `:213` (M14: "only pulling away or the context button leaves", slide ~0.9 m/s), `:226` (M20 Q3 sideways standing and crouched), `:231` (M25 (3) only the button or aiming leaves; (4) flat back standing, sideways crouched); `docs/locomotion/PROTOTYPE-PLAN.md:62-72` (button entry, 180 deg spin in 0.3-0.45 s, slide ~0.35 m/s, stop and hug at the edge) and `:63-67` (still says "Michael confirms at the P3 play test whether standing stays flat", although M25 (4) answered it, `:90`).
- What: Entry (stick vs button), slide speed (gear speed vs 0.9 vs 0.35 m/s), leaving (pull-away vs button only) and stance (flat vs sideways) each have two or three answers. M25 settles leaving and stance; the bible and movement.md were not updated.
- Options: (1) Master states: button-only entry (A83, see Q-move-12), a slow shuffle (Q-move-11), leave by button or aiming only (M25), flat back standing / sideways crouched (M25), stop and hold at edges (recommended). (2) Keep bible 5.3 as written. (3) Keep the step-21w behaviour (A84) until the prototype.

### MV7 Wall-edge lean-out, open-side weapon (D9 / D10) and SWAT turn are documented as live  (severity: high)
- Where: `feature/ct-locomotion:docs/systems/movement.md:187-201` (lean-out, SWAT, D9 left-hand weapon, D10 low-wall side lean and over-the-top rise), `docs/systems/input-and-loop.md:71, :92` ("Context (back-to-wall, door peek, SWAT)"), `docs/design-bible.md:176, :377-378, :1492`, `docs/locomotion/RULES.md:19-20` (D9 / D10 in the live rule list), `docs/locomotion/PC-PASS.md:36-43`, `docs/locomotion/STATE.md:30` (play check: "LT to lean out and aim ... SWAT turn"); training: `feature/training-bunker:docs/training/BAYS.md:713, :756-757` (teaches lean-out and SWAT).
- What: M20 Q1 (`DECISIONS.md:226`) removed shooting from the wall edge, D9 / D10 and the SWAT turn ("CT-pure: remove both, use the shoulder swap"); aiming on a wall now leaves the wall (`PROTOTYPE-PLAN.md:60-61`). The docs still teach and test them.
- Options: (1) Strike them from master's system docs, bible and training text; keep D9's mirrored grip only as the basis of the aiming shoulder swap (recommended). (2) Keep them documented as "built, to be removed in P3". (3) Keep them as an option behind a setting (contradicts M20 "without exception").

### MV8 The strike is documented as the old elbow strike  (severity: medium)
- Where: `feature/ct-locomotion:docs/systems/takedowns.md:20-37` (elbow, reach 1.2 m, 90 deg cone, contact 0.5 s, whiff allowed, aware facing guard staggers, heavies only stagger, touch Fire button); `docs/design-bible.md:204, :431-441`; `docs/locomotion/DECISIONS.md:163` (A44); `feature/training-bunker:docs/training/BAYS.md:180, :198` ("Elbow-strike the pad").
- What: M20 Q4 / Q4b and M25 (5) make it a CT palm strike: offered only with a guard within ~0.8-1.0 m in front, contact in 0.10-0.15 s, one-hit knockout from any side (Michael picked (b) over (c) "heavies still stagger"), ~1.4 s until free, no strike without a target (`PROTOTYPE-PLAN.md:80-82`). Every doc still says elbow, stagger and whiff.
- Options: (1) Rewrite takedowns.md and bible 5.4 to the palm strike, heavies included (recommended). (2) Keep "elbow" as the internal name, change only the rules. (3) Wait for P4.

### MV9 Camera text contradicts D2, M20 and itself  (severity: high)
- Where: `feature/ct-locomotion:docs/systems/movement.md:160-168` ("Splinter Cell: Blacklist framing - the operative small in the left third", boom 2.2 / ADS 1.5, shoulder 0.62 / 0.58, follow spring 80-150 ms with look-ahead, auto-recentre, handheld drift, "micro-bob (<= 1 cm)", sprint FOV +4 deg); `docs/design-bible.md:349` (locked: "pulled back with the whole body in view"), `:396-402` ("higher and further back than the 3.x framing"); `docs/locomotion/DECISIONS.md:20` (D2 "no camera bob"), `:46` (D5.13 spring follow, look-ahead, auto shoulder swap at corners, FOV by gear and stance), `:125` (A12); `docs/locomotion/PROTOTYPE-PLAN.md:47-57` (explore ~1.8 m, aimed at the head top, lateral 0.1-0.2 m, rigid follow, ±12-15 deg lead swing over ~1 s; aim ~0.4 m, no FOV zoom, shoulder swap only while aiming); `docs/locomotion/research/ct-measure-camera.md:22, :44` (feet cut off at the default pitch; rigid follow); `feature/menu-ui-spec:docs/menu-ui/SPEC.md:290` (settings "Default shoulder, Camera recentres").
- What: movement.md's "micro-bob" breaks D2's "no camera bob"; the bible's "whole body in view, further back" conflicts with the CT footage (closer, feet cut off); D5.13's spring, look-ahead, corner swap and FOV change conflict with the measured rigid CT camera; and the doc names Blacklist as the framing model. The menu spec builds settings for an auto-recentre and a default shoulder that the CT camera may not have.
- Options: (1) Master states the measured CT camera (P2) as the target and drops micro-bob, sprint FOV, Blacklist framing and D5.13 extras (recommended; Q-move-6, Q-move-7). (2) Keep the bible's pulled-back whole-body framing. (3) Keep the current camera until the P2 play test.

### MV10 / TU9 Sprint remnants everywhere after M20 Q8 dropped sprint  (severity: medium)
- Found by: MV10 (Movement, camera, controls, takedowns and gadgets audit, medium); TU9 (Training bunker, menus, HUD, modes and saves audit, medium).

**MV10: Sprint remnants everywhere after M20 Q8 dropped sprint**
- Where: `feature/ct-locomotion:docs/systems/input-and-loop.md:72` (L3 / Shift sprint), `:99-101` (`sprintHold`), `:120-121` (rumble "heavy footfall (gear 6 ...)"); `docs/systems/movement.md:12` (gear 6 sprint), `:42-43` (roll "or sprinting"), `:122-126` (sprint 5.0), `:137-139` (hop gaps when sprinting, sprint noise 9 m), `:226` (ladder sprint 5 rungs/s, drainpipe sprint); `docs/ct-movement.md:71-72, :160` (rappel "sprint held: 3.0 down"); `docs/design-bible.md:354, :390, :1423`; `docs/locomotion/DECISIONS.md:17, :56, :128` (A15), `:195` (A68), `:203` (A76); `docs/locomotion/CT-RESEARCH.md:86` (door bash "at a sprint"); `feature/menu-ui-spec:docs/menu-ui/SPEC.md:285` (Hold or toggle: Sprint); `feature/training-bunker:docs/training/BAYS.md:279, :285, :305, :311` (sprint strip, sprint vault, sprint jump).
- What: Sprint is gone (M20 Q8; `PROTOTYPE-PLAN.md:22-24`), but bindings, settings, rumble, noise, roll, ladder, rappel, gap hop, door bash, carry rules and training lanes still hang off it. Nobody has said what now triggers the moves that needed a sprint.
- Options: (1) Remove sprint from master docs; moves that needed a sprint use the full run speed instead (recommended; Q-move-4). (2) Remove the sprint-only moves. (3) Keep a hidden fast mode for those moves.

**TU9: Sprint still has a hold / toggle setting**
- Where: `feature/menu-ui-spec:docs/menu-ui/SPEC.md:285` ("HOLD OR TOGGLE: Aim, Crouch, Back to wall, Sprint,
  Grab"), `steps/05-settings-remap.md:39` ("sprint hold vs toggle"); `feature/ct-locomotion:docs/systems/ui.md:14`;
  `feature/ct-locomotion:docs/design-bible.md:1292` (D7).
- What: M20 drops sprint, so the Sprint hold / toggle row, its e2e case and the bible D7 list are stale.
- Options: (1) Remove Sprint from the list everywhere (recommended) (2) Keep the row hidden until a decision.

### MV12 / TU8 Touch controls documented as live after M21  (severity: high)
- Found by: MV12 (Movement, camera, controls, takedowns and gadgets audit, medium); TU8 (Training bunker, menus, HUD, modes and saves audit, high).

**MV12: Touch controls documented as live after M21**
- Where: `feature/ct-locomotion:docs/systems/input-and-loop.md:12-32, :36-39, :60-85` (Touch column), `:113-114` (A66), `:122-123` (`navigator.vibrate`), `:129`; `docs/systems/takedowns.md:12, :35`; `docs/systems/movement.md:11, :46, :119-121, :205, :209`; `docs/systems/gadgets.md:8, :36, :45`; `docs/ct-movement.md:50, :56-61`; `docs/design-bible.md:113, :1400-1411`; `feature/menu-ui-spec:docs/menu-ui/SPEC.md:176-177, :283, :288-289` (Touch tab, iPhone pairing hint); `feature/menu-ui-spec:docs/menu-ui/DECISIONS.md:47-48` (MD16).
- What: M21 drops touch and phones; A65-A67 and the touch halves of A27, A29 and A52 are void. The docs on every branch, and the menu-ui spec, still specify touch layouts and behaviour.
- Options: (1) Remove touch columns and rules from master docs; keep one line "touch code is parked, no work" (recommended). (2) Keep the touch text marked "parked". (3) Delete the touch code too (needs Michael's go-ahead, OWNER-NOTES:109).

**TU8: Menu spec is full of phone and touch work (M21)**
- Where: `feature/menu-ui-spec:docs/menu-ui/DECISIONS.md:43` (MD14 "phones get a plain dark overlay"), `:45` (MD15
  "phones run S1 and S2"), `:47` (MD16 Touch); `SPEC.md:29` ("phone cost"), `:84` ("Phones use the same frame"),
  `:89` (56 px on touch), `:134-146` (Touch column), `:176-178` (Touch), `:283-290` (Touch tab, "Display on phones",
  "iPhone pairing hint"), `:308-310` (7.13 layout editor), `:350` (phones), `:377` ("Portrait rotate stays"), `:403`,
  `:413`, `:416`, `:420-421` (phone shots, tests, budgets), `:441` (checklist item 16); `BRIEF.md:56,74,80`
  (TESTING phone lines, "the phone look", "5-line phone smoke test"); `PLAN.md:29` ("phone check"); `STATE.md` pauses
  ("B: ... phone"); steps 01:46, 04:39,44, 05:14-17,32,39, 10:22,34,40,44, 11:11-19,25, 12:22-23,38,
  13:3,11-19,26; e2e-touch in steps 02:37, 03:19,36,40, 04:32,38, 05:39,43, 08:27,31.
- What: M21 drops phones and touch entirely (no phone look, no phone budgets, touch tests retired). About a fifth of
  the menu spec and most step files still build or test phone and touch paths.
- Options: (1) Strip every phone / touch item from the menu spec and steps (Touch tab, layout editor, touch column,
  phone shots and budgets, e2e-touch), keep the desktop Low preset overlay (recommended) (2) Keep touch as a hidden
  fallback that is not tested.

### MV13 Blacklist and Mark & Execute remnants  (severity: medium)
- Where: `feature/ct-locomotion:docs/systems/movement.md:94-95` (PvP takedowns `ptd`), `:163` ("Splinter Cell: Blacklist framing"); `docs/systems/gadgets.md:41, :45` (sticky cam "mark (RB / T)", "Mark is shown there too"); `docs/ct-movement.md:20` ("Blacklist cover replaces CT's back-to-wall"), `:30, :39` (PvP), `:72` ("cover-to-cover dash and marked-target dash"), `:186` ("Mark & Execute charges are earned"); older branches: `feature/footsteps:docs/systems/input-and-loop.md:21, :25, :30` (RB mark, Y execute, T mark), `feature/footsteps:docs/systems/takedowns.md:1-16` (Mark & Execute system), `feature/footsteps:docs/systems/movement.md:23, :114, :128, :134, :228` (CoverController, cover-to-cover, Corners and doorways).
- What: Removed Blacklist systems are still described. The ct-locomotion system docs win the merge, but docs/ct-movement.md is identical on every branch and will reach master as is.
- Options: (1) Scrub them from master's docs and mark docs/ct-movement.md as history (recommended). (2) Leave them with a history banner.

### MV14 docs/ct-movement.md and its progress file read as the live spec  (severity: medium)
- Where: `docs/ct-movement.md:3` ("Branch: ct-movement (created from dev) ... Merge into dev"), `:20, :42-45` (phone draw budgets), `:56` (phones first class); `docs/ct-movement-progress.md:2-3, :252-253` (/ct/ preview slot); `feature/ct-locomotion:docs/systems/movement.md:6` ("Chaos Theory movement (3.2.0, in progress): spec docs/ct-movement.md").
- What: movement.md points readers to a spec that keeps snap cover, phones first class, the dead branch flow (M26) and 3.2.0 timings.
- Options: (1) Move both files to docs/archive/ (or add a "history, superseded by PROTOTYPE-PLAN / M20" banner) and drop the "in progress" pointer (recommended). (2) Rewrite ct-movement.md as the CT prototype spec.

### MV15 Remapping: two internal contradictions  (severity: medium)
- Where: `feature/ct-locomotion:docs/systems/input-and-loop.md:45-46` ("`assignBind` moves a key off its old action") vs `:94-96` (A71: a shared binding is shared, warned and saved); capture cancel `input-and-loop.md:97` and `DECISIONS.md:196` (A69: B held 1 s or Esc) vs `feature/menu-ui-spec:docs/menu-ui/DECISIONS.md:40-42` (MD13: Menu / Start or Esc, "not B") and `docs/menu-ui/SPEC.md:170-172`.
- What: The same doc says a rebinding both moves and shares keys; and two branches specify different ways to cancel a capture. A71 itself was approved by M20 Q6 ("Keep warn-and-save").
- Options: (1) Fix line 45-46 to A71 and adopt MD13's cancel (Menu / Start or Esc) (recommended; Q-controls-4). (2) Keep A69's hold-B cancel and change the menu spec.

### MV16 Quick 180 as a separate move  (severity: medium)
- Where: `docs/design-bible.md:171, :357, :783, :826, :883`; `docs/locomotion/DECISIONS.md:127` (A14 `quick180` MoveState mode), `:222` (M17 quick 180 in 22b); `feature/training-bunker:docs/training/BAYS.md:180, :203, :324`; vs `docs/locomotion/PROTOTYPE-PLAN.md:33-36, :93` ("Quick 180 as a separate move (the flick covers it)") and `research/ct-measure-turns.md:35-41` (flick 180 = 0.40 s, walk cycle continues, no pivot).
- What: The bible requires a 0.25 s pivot quick 180; the CT footage shows no such move, only the normal capped turn.
- Options: (1) Drop the separate quick 180; the flick is the normal 0.4 s turn (recommended; Q-move-10). (2) Keep a faster quick 180 on top.

### MV17 Roll input differs  (severity: medium)
- Where: `feature/ct-locomotion:docs/systems/movement.md:42-46` and `docs/ct-movement.md:86` (crouch TAP at gear >= 5 or sprinting, 0.7 s, 3 m); `feature/training-bunker:docs/training/BAYS-v1.md:155`; vs `docs/locomotion/PROTOTYPE-PLAN.md:43` (from a run, crouch HELD, ~0.75 s, ~2.3 m, ends in a crouch run) and `docs/locomotion/CT-RESEARCH.md:55`.
- What: Tap vs hold changes what a plain crouch press does while running.
- Options: (1) CT: hold crouch while running rolls, a tap just crouches (recommended; Q-move-5). (2) Keep the tap.

### MV19 Vision modes: three looks and two switch styles on record  (severity: medium)
- Where: `feature/ct-locomotion:docs/systems/gadgets.md:8-11` (cycle off, night, thermal, electro; 0.2 s goggle flip), `:16` (A26 no see-through), `:17-20` (electro device list); `docs/design-bible.md:214-215` (thermal "sees through smoke and thin fabric"; electro shows "lamps, cameras, keypads, wiring runs"), `:460-463` (phone grade pass, Phone check); `docs/locomotion/DECISIONS.md:139` (A26), `:175` (A53 flip), `:213` (M14 N7: grain on thermal, electro and night), `:220` (A87 grain numbers, strongest on the dark scene), `:231` (M25 (1) CT colour ramp, (2) people through closed doors as a dim silhouette); `docs/locomotion/PROTOTYPE-PLAN.md:83-87` (heavy grain only on warm areas, night ~1 % grain, electro flat navy with NO grain, instant cut); `docs/locomotion/CT-RESEARCH.md:164-168` (White Hot proposal, now void).
- What: The current docs (blue-grey thermal, grain everywhere, goggle flip, no see-through) differ from the CT-pure plan, and the CT plan removes the electro grain Michael asked for in M14 N7. The electro device list differs between the bible and the built list.
- Options: (1) Master states the CT look (M25 + PROTOTYPE P4), with Michael confirming the electro / night grain change (Q-move-16) (recommended). (2) Keep M14 N7 grain on all three. (3) Keep the current look until P4.

### MV21 D5 "modern layer" items contradicted by the CT footage  (severity: medium)
- Where: `docs/locomotion/DECISIONS.md:32-47` (D5.3 compression and one damped settle on stops; D5.4 plant-and-pivot on sharp turns; D5.5 breathing after a sprint; D5.6 soft knees, ready hands; D5.13 camera extras); vs `research/ct-measure-speeds-stops-posture.md:52` ("No overshoot or hip settle visible"), `:63` (standing knees straight), `research/ct-measure-turns.md:41, :79` (no pivot pose), `research/ct-measure-camera.md:44` (rigid follow); M14 (`DECISIONS.md:213`) already replaced the ready hands.
- What: M20 says footage overrides D5 where they differ, but nobody has listed which D5 items survive; the step plan (PLAN.md:48-62) still builds them.
- Options: (1) Keep only the D5 items the footage supports (start lean, look-at, contact IK, stairs IK, momentum-scaled traversal, analog speed); drop D5.3 stop settle, D5.4 pivots, D5.6 soft knees and D5.13 extras (recommended; Q-move-8). (2) Keep all D5 items layered on CT. (3) Drop D5 entirely.

### MV22 The prototype plan departs from the literal wording of two M20 answers  (severity: medium)
- Where: `docs/locomotion/CT-RESEARCH.md:176-179` (Q7 option (a) text: "A stepping turn on the spot. Keep today's reversal pivot") and `:140-144` (Q2 option (a): gears 5-6 "keep a short braking stop"); `docs/locomotion/DECISIONS.md:226` (Michael chose Q7 (a), Q2 (a)); vs `docs/locomotion/PROTOTYPE-PLAN.md:27-36` (no closing step at any speed, no pivot pose, reversal pivot REMOVED) and `research/ct-measure-turns.md:15-18, :79` (no stationary turn, reversal is one continuous turn), `research/ct-measure-speeds-stops-posture.md:53` (feet freeze mid-stride at every speed).
- What: Michael picked options whose text kept the reversal pivot, a step-turn on the spot and a braking step at run; the footage, which M20 makes the authority, shows none of them, so the plan dropped them. This is consistent with "pure CT" but Michael has not seen the difference spelled out.
- Options: (1) Ask Michael to confirm the footage wins (recommended; Q-move-1, Q-move-2). (2) Restore the pivot and braking step as worded in his answers.

### MV23 Run-doc staleness inside docs/locomotion  (severity: low)
- Where: `docs/locomotion/STATE.md:26-37` (old play check: L3 sprint, HUD pips, lean-out, SWAT), `:49` (play-check text "still to be written"), `:79` vs `:138-139` (open ASSUMED: "A0-A53 except A38, A42, A43, A47" vs "A1-A32 (all open)"); `docs/locomotion/PROTOTYPE-PLAN.md:10` ("One branch, feature/ct-locomotion") vs `docs/locomotion/CONSOLIDATE.md:44` and M26 (fresh branch feature/ct-prototype from master); `docs/locomotion/PLAN.md:45-62` (Block D steps 22b-34 predate M20: pivots, D5.13 camera, SWAT clips); `docs/locomotion/CT-RESEARCH.md:34-37, :133-208, :210-249` (recommendations and step order that M20 overturned); `docs/locomotion/BIBLE-PROPOSALS.md:1-22` (no M20 / M25 proposals); `docs/locomotion/OWNER-NOTES.md:88-92` (merge plan "kestrel to master first, then the locomotion PR", superseded by M26); `docs/locomotion/RULES.md:50`.
- What: The run's own state and plan files contradict M20-M26 in places a future session will read first.
- Options: (1) Add a short "superseded by M20-M26" banner to CT-RESEARCH sections 3-4 and PLAN Block D, fix PROTOTYPE-PLAN's branch line, and clean STATE's ASSUMED list (recommended). (2) Leave run files as history and rely on docs/DECISIONS.md.

### MV24 / AR29 Reference-game names in docs  (severity: low)
- Found by: MV24 (Movement, camera, controls, takedowns and gadgets audit, low); AR29 (Art, characters, operators and weapons audit, low).

**MV24: Reference-game names in docs**
- Where: `docs/design-bible.md:30-34` (do not use the hero's name, the rifle's name and similar "in code, UI or docs"); vs `docs/locomotion/research/ct-footage-catalogue.md:16` (the rifle's name), `research/ct-locomotion.md:11, :131, :142, :159`, `docs/locomotion/CT-RESEARCH.md:270` (the hero's name), the hero's name throughout PROTOTYPE-PLAN.md (e.g. `:33-37`) and research/*; `docs/systems/movement.md:163` ("Splinter Cell: Blacklist framing").
- What: The research and the prototype plan name the reference character and weapon, which the bible bans in docs.
- Options: (1) Allow reference names only inside research / footage notes about the reference game, never in specs, system docs, code or UI; replace the hero's name with "the operator" in PROTOTYPE-PLAN (recommended; Q-move-19). (2) Scrub them everywhere.

**AR29: Old `character-model` branch and the CT character's name in docs**
- Where: `origin/character-model` (an earlier operator attempt, "do not merge it": `OPS:docs/operators/BRIEF.md:27`), not in
  the M26 branch list; `LOCO:docs/locomotion/PROTOTYPE-PLAN.md:74,81` and M23 / M24 refer to the player by the hero's name.
- Options: (1) Archive or delete `character-model` after the merge; say "the operator" in master-level docs (CT's character
  named only in research files). (2) Leave both.

### MV25 Emotes are bound though emotes are parked  (severity: low)
- Where: `feature/ct-locomotion:docs/systems/input-and-loop.md:43, :81-83` (View hold emote 1, J / K / L); `docs/design-bible.md:1338` (emotes parked).
- What: A parked feature holds a pad button (View hold) and three keys.
- Options: (1) Unbind emotes until they return; View hold free (recommended; Q-controls-9). (2) Keep the bindings.

### MV26 / V18 / AR13 Aim assist rule is orphaned  (severity: medium)
- Found by: MV26 (Movement, camera, controls, takedowns and gadgets audit, low); V18 (Vision core audit, low); AR13 (Art, characters, operators and weapons audit, medium).

**MV26: Aim assist rule is orphaned**
- Where: `docs/design-bible.md:502` ("Aim assist: stays light and touch-only (existing)"); `docs/systems/movement.md:172` (aim assist friction / magnetism, no device rule); `feature/menu-ui-spec:docs/menu-ui/SPEC.md:287` (Aim assist row under CONTROLLER).
- What: With touch gone the bible rule means "no aim assist", while the menu spec offers it on the pad.
- Options: (1) Light aim assist on the pad only, a setting, never on the mouse (recommended; Q-controls-5). (2) No aim assist. (3) Pad and mouse.

**V18: Aim assist after touch is gone**
- Where: `loco:docs/design-bible.md:502` ("Aim assist: stays light and touch-only").
- What: with touch dropped the rule means no aim assist at all; nothing says whether the controller (the primary input)
  gets any.
- Options: (1) Light aim assist on controller only, never on mouse, a setting to turn it off (recommended). (2) None.
  (3) A setting, off by default.

**AR13: Aim assist rule is "touch-only", and touch is gone**
- Where: `LOCO:docs/design-bible.md:502` ("Aim assist: stays light and touch-only (existing)"); LOCO M21 (`DECISIONS.md:227`);
  CLAUDE.md (pad first).
- What: with touch dropped the rule now means "no aim assist", by accident, in a pad-first game.
- Options: (1) No aim assist on any input (CT; today's pad behaviour). (2) Light aim assist for the controller only, with a
  setting. (3) Assist on every input.

- Compiler note: the audits disagree on the recommendation (V18 and MV26: light aim assist on the pad only, with a setting; AR13: none, like CT). The question puts the pad option first because the menu spec already plans a controller aim assist row.

### MV27 Shoulder swap: what R3 does when not aiming  (severity: low)
- Where: `feature/ct-locomotion:docs/systems/input-and-loop.md:84` (R3 shoulder swap, any time), `docs/systems/movement.md:166-167` (camera-only swap ~250 ms, auto shoulder at peeks); `docs/locomotion/PROTOTYPE-PLAN.md:49, :54-57` (shoulder swap while aiming moves the weapon to the other hand; exploring camera swings by itself, M20 Q11); `research/ct-measure-camera.md:78-87`; `docs/locomotion/CT-RESEARCH.md:65, :127`.
- What: In CT the swap exists only while aiming; the explore camera has an automatic lead swing. Our R3 works any time. No doc says what R3 does outside aiming, or whether the menu spec's "Default shoulder" setting survives.
- Options: (1) R3 swaps only while aiming (weapon changes hand); no manual explore swap (recommended; Q-controls-2). (2) R3 also flips the explore camera side.

### MV29 "No free jump" vs the manual jump  (severity: low)
- Where: `feature/ct-locomotion:docs/systems/movement.md:141` ("There is no free jump") vs `:107-115` (manual jump `LEAP`) and `docs/design-bible.md:361` (keep the manual jump); `docs/ct-movement.md:62` ("Y stays contextual (no free jump)"); `docs/locomotion/PROTOTYPE-PLAN.md:44` (jump timings, "Y stays contextual").
- What: One doc says both. The manual jump exists (Y / E when nothing else is offered).
- Options: (1) Fix the line: Y / E jumps when no traversal or interaction is on offer (recommended). (2) Give jump its own button.

### MV30 Back walk at the slowest speed is not in any system doc  (severity: low)
- Where: `docs/locomotion/DECISIONS.md:229` (M23), `docs/locomotion/PROTOTYPE-PLAN.md:36-38`; vs `feature/ct-locomotion:docs/systems/movement.md:124-125` ("strafe x0.9 and backstep x0.75 only while aiming").
- What: M23 records CT walking backwards at the slowest speed (standing and crouched); the system doc says backstepping happens only while aiming.
- Options: (1) Add the slowest-speed back walk (threshold ~135 deg, a game value) to master's movement doc (recommended). (2) Leave it to the prototype docs.

### MV31 Camera height vs operator height  (severity: low)
- Where: `feature/operators:docs/design-bible.md:1008-1011` (operators 1.68-1.78 m tall; "capsule, speeds, camera rules ... stay identical"); `docs/locomotion/PROTOTYPE-PLAN.md:47-48` (explore camera aimed at the head top, ~2.3 m high), `research/ct-measure-camera.md:35`.
- What: The CT camera is defined from the operator's head; operators now differ in height. No doc says whether the camera follows each operator's head or one shared height.
- Options: (1) One shared camera rule tied to the capsule (same framing for everyone, fairness) (recommended; Q-move-18). (2) Follow each operator's own head height.

Merged into entries in other sections:

- MV1 The bible's movement, camera and stealth-verb text predates M20 / M25 on every branch (high): merged into V3 / MV1 under Vision core.
- MV3 Platform and control-parity text conflicts across branches (medium): merged into PL1 / V1 / MV3 / TU13 under Platform, performance, co-op, testing and process.
- MV11 HUD gear pips still documented (medium): merged into TU12 / MV11 under Training bunker, menus, HUD, modes and saves.
- MV18 Doors: crack-peek vs stick-driven door; how door actions are chosen is unstated (medium): merged into LV11 / MV18 under Levels, maps, light and stealth AI.
- MV20 Silent-speed engine fact will change without a scheduled Section 12 update (medium): merged into LV1 / MV20 under Levels, maps, light and stealth AI.
- MV28 Training docs teach removed verbs (medium): merged into TU2 / MV28 under Training bunker, menus, HUD, modes and saves.

## Levels, maps, light and stealth AI (audit C)

Scope: level standard, map template, scale sheet, docs/kestrel, lighting / ai / world system docs, bible 5.1, 5.8, 7.

### LV1 / MV20 Level standard Section 12 does not hold the new movement and stealth facts  (severity: high)
- Found by: LV1 (Levels, maps, light and stealth AI audit, high); MV20 (Movement, camera, controls, takedowns and gadgets audit, medium).

**LV1: Level standard Section 12 does not hold the new movement and stealth facts**
- Where: `loco:docs/level-design.md:126-138` (Section 12); `loco:docs/level-design.md:135-136` ("silent ... at crouched
  gears 1-4 and standing gears 1-2"); `loco:docs/design-bible.md:412-426` (metrics freeze: gear speeds, reach, jump bands,
  camera distances "are written into docs/level-design.md Section 12"); `loco:docs/design-bible.md:1360-1370` (a phase
  that changes a fact updates Section 12); `loco:docs/locomotion/research/ct-measure-speeds-stops-posture.md:16,31` (CT
  noise: standing 0-1 / 2 / 7 / 11-12 pips, crouched 0-1 / 4 / 9-10; only the slow notches are silent);
  `loco:docs/locomotion/PROTOTYPE-PLAN.md:22-25,73-76,80-82,86-87`; `loco:docs/locomotion/DECISIONS.md:221` (A88),
  `:226` (M20), `:231` (M25); `loco:docs/locomotion/CT-RESEARCH.md:252` (says Section 12 must change if door rules do).
- What: Section 12 still says crouched gears 1-4 are silent; under the CT noise bands only the two slowest speeds are
  silent, standing and crouched, and sprint is gone. Section 12 says nothing about the new facts maps are designed
  against: doors passing light, sound and sight past about 15% open, guards noticing open doors, thermal showing people
  through closed doors (render only), the palm strike's 0.8-1.0 m one-hit knockout from any side, the CT wall stance,
  the CT camera. The bible's promised metrics table (gear speeds, reach, jump and split bands, camera distances) was never
  written into it, and PROTOTYPE-PLAN.md does not schedule the Section 12 update that CLAUDE.md's hard rule requires.
- Options: (1) Recommended: rewrite Section 12 now as a facts table (movement speeds and silent bands, reach and jump
  bands, doors, strike, thermal, camera), each row marked "prototype value, re-confirm after the P1-P4 play test", and
  make each prototype slice update its rows; the metrics freeze then just locks the table. (2) Leave Section 12 until the
  metrics freeze, with a warning line that every speed, noise and camera number is in flux. (3) Move all engine numbers
  out of Section 12 into the scale sheet and keep Section 12 as pointers.

**MV20: Silent-speed engine fact will change without a scheduled Section 12 update**
- Where: `feature/ct-locomotion:docs/level-design.md:135-136` ("silent ... at crouched gears 1-4 and standing gears 1-2"); `docs/systems/movement.md:20-22` (NOISE_QUIET 1.7 / 1.45); `docs/design-bible.md:354, :1364`; vs `docs/locomotion/PROTOTYPE-PLAN.md:24-25` ("slow notches silent, then rising (CT meter bands: 4 standing, 3 crouched)") and `research/ct-measure-speeds-stops-posture.md:16, :31` (standing: two silent speeds; crouched: three silent speeds).
- What: The prototype changes speeds and silent bands (an engine fact maps rely on, CLAUDE.md hard rule), but its plan does not list the level-design Section 12 update or the map decisions that relied on "crouched gears 1-4 silent".
- Options: (1) Add the Section 12 update and the map check to the prototype plan, and confirm the bands with Michael (recommended; Q-move-9). (2) Keep today's bands by tuning the noise thresholds to the new speeds.

- Compiler note (verified in `loco:docs/locomotion/research/ct-measure-speeds-stops-posture.md:16-31` and `PROTOTYPE-PLAN.md:22-25`): the CT footage shows two silent standing speeds (creep 0.2, walk 0.75 m/s) and three silent crouched speeds (0.4, 0.85, 1.5 m/s). LV1's "only the two slowest speeds are silent, standing and crouched" understates the crouched band; MV20 is right. LV2's Kestrel time-budget estimate (fastest silent crouched speed 0.85 m/s, 26 min of moving) should be recomputed with 1.5 m/s.

### LV2 Approved number sheets and Kestrel's sums still use the pre-A88, pre-CT numbers  (severity: high)
- Where: `loco:docs/kestrel/00-facts.md:2,4` (APPROVED, frozen at commit e60c835), `:16` (F06 jump), `:23` (F13
  `descendSprint`), `:24` (F14 fence "quiet at gears 1-3"), `:28` (F18 gears 0.8 ... 5.0), `:29` (F19 silent to crouch 1.9,
  sprint 9 m), `:33` (F23 camera), `:39` (F29 phone budgets); `loco:docs/design/scale-sheet.md:11-12` (camera and walk
  speeds); `loco:docs/kestrel/01-mission-brief.md:196-211` (time budget: "moving = crouched gear 3, 1.3 m/s", speedrun at
  "crouched gear 4 (1.8 m/s)"); `loco:docs/kestrel/S0-security-spec.md:96,145` (PIR SN51 1.0 m/s mapped to "standing gear
  1 (0.8) and crouched gears 1-2"); `loco:docs/kestrel/editor.md:796-797` and `loco:docs/kestrel/overnight-report.md:62`
  (floor loudness "at jog and sprint"); against `loco:docs/locomotion/DECISIONS.md:221` (A88 gears 0.65 ... 4.15 / 0.42 ...
  2.3, crouch silent to 1.7) and `loco:docs/locomotion/PROTOTYPE-PLAN.md:22-25` (standing ~0.2 / 0.75 / 2.0 / 3.0 / 4.2,
  crouched ~0.4 / 0.85 / 1.5 / 2.1 / 2.6, no sprint, CT noise bands).
- What: Kestrel may only use 00-facts and scale-sheet numbers (RULES 5), and both are two speed changes behind. Kestrel's
  solo time budget assumes silent movement at 1.3 m/s; with CT bands the fastest silent crouched speed is about 0.85 m/s,
  so the 17 min of moving becomes about 26 min and the 42.5 min total passes the 35-45 min cap. The PIR speed rule, fence
  rattle bands, camera detection notes (00-facts:119) and editor loudness readouts all name gears that no longer mean the
  same speed.
- Options: (1) Recommended: after Michael approves the prototype speeds, re-read 00-facts F06, F13, F14, F18, F19, F23,
  F29 and the scale sheet from code in one short "facts refresh" stage, then rerun the Kestrel time budget and S0 speed
  rows against them; until then mark those rows "stale, CT prototype pending". (2) Refresh now to A88's numbers and again
  after the prototype. (3) Express every Kestrel rule in "silent speed / audible speed" words instead of gear numbers so
  it survives tuning.
- Compiler note: with the CT bands confirmed in LV1 / MV20, the fastest silent crouched speed is about 1.5 m/s, not 0.85 m/s, so the time-budget effect estimated here is too large; the facts refresh recomputes it.

### LV3 Room widths, crawl heights and Kestrel ceilings are derived from the old camera  (severity: high)
- Where: `loco:docs/design/scale-sheet.md:11,22-27` (shoulder offset 0.62 + 0.16 sets corridor widths; 3.5 m target);
  `loco:docs/level-design.md:289` (16.7.3 crawl ducts 1.5 m from the camera check);
  `loco:docs/design/dead-line-v2-engine-check.md` section 3 (computed with boom 2.2, shoulder 0.62, crouched pivot
  1.18); `loco:docs/kestrel/00-facts.md:42` (F32); `loco:docs/kestrel/RULES.md:61` (data hall aisles 1.8 m "camera");
  `loco:docs/kestrel/progress.md:238-240` (CAM: boom 1.4 under 1.9 m headroom, still DRAFT);
  `loco:docs/kestrel/02-building-brief.md:414` and `loco:docs/kestrel/REVIEW.md` "Crawl spaces 1.5 m ... corridors under
  ceiling voids 2.4"; against `loco:docs/locomotion/PROTOTYPE-PLAN.md:46-57` (CT explore camera ~1.8 m from the head,
  ~2.3 m high, 17 deg down, lateral offset 0.1-0.2 m; aim camera 0.4 m from the head; wall peek camera 1.0-1.5 m past the
  corner).
- What: every camera-based space rule (corridor widths, bend lengths, the 1.5 m crawl height, aisle widths, the CAM
  low-ceiling behaviour) was measured on the old shoulder camera. The CT camera sits about 2.3 m high, so a Kestrel office
  corridor with a 2.4 m ceiling and every 1.5 m crawl void will squash it; the old engine check no longer answers the
  question. The engine check also lives among retired Dead Line files in docs/design.
- Options: (1) Recommended: after the P2 camera slice, redo the engine check (corridor, bend, 2.4 m ceiling, 1.5 m void,
  1.2 m split gap, wall peek at a corner) with the CT camera, update scale-sheet section 2 and 16.7.3, retire or redo CAM,
  and move the scale sheet and engine check into a living folder (for example docs/maps/standards/). (2) Keep the old
  numbers as minimums and accept camera squash in tight spaces. (3) Freeze Kestrel floor plans (P04) until (1) is done.

### LV4 Mission 1 size: the bible and the Kestrel plan disagree  (severity: high)
- Where: `loco:docs/design-bible.md:652-659` (30-40 min, 6 guarded spaces, 16 guards, 1 civilian) and `:1498` (roadmap
  Phase 7, same); `loco:docs/progress.md` "Decisions of 2026-10-10" item 3 (same); against `loco:docs/kestrel/RULES.md:11-12,
  23-29` (two buildings, solo ghost run 35-45 min, about 8 guarded spaces, 21 guards incl. 2 dog handlers, 2 dogs, 7
  civilians, at most 12 awake) and `loco:docs/kestrel/01-mission-brief.md:61,149-161` (10 beats, 21 + 2 + 7). Older still:
  `fs:docs/design-bible.md`, `wa:docs/design-bible.md`, `master:docs/design-bible.md` 5.8 ("Kestrel Exchange, a 1934
  telephone exchange ... 8 spaces and 9 guards").
- What: three different Mission 1 sizes exist. Kestrel's numbers are Michael's later decisions (2026-10-11) but the bible
  and progress were never updated. The bible also sets "default mission length 20-35 minutes ... suits phone sessions"
  (`loco:docs/design-bible.md:648`), which Kestrel already exceeds and whose reason (phones) is gone.
- Options: (1) Recommended: the bible and progress take Kestrel's current numbers (campus, 8 spaces, 21 guards + 2 dogs +
  7 civilians, 35-45 min) and drop the phone reason for mission length. (2) Trim Kestrel back toward the bible's smaller
  slice. (3) Keep the bible's numbers as the target for later missions and record Kestrel as a deliberate exception.

### LV7 Three different authority orders for map work  (severity: medium)
- Where: `loco:CLAUDE.md` "Every session" 5 (Michael > bible > phase spec > level-design and the map's documents > these
  docs > code); `loco:docs/kestrel/RULES.md:5` (for Mission 1, RULES and the mission brief win over story.md and the
  bible), `:37` (Michael > RULES > APPROVED Kestrel docs > level-design > scale sheet > CLAUDE.md > code; no bible);
  `tb:docs/training/RULES.md:11` (DECISIONS > bible > SPEC > BAYS > level-design > other docs > code);
  `loco:docs/level-design.md:3` (a map spec may tighten, loosen only with Michael's written approval).
- What: Kestrel places its own rules above the bible; the bunker places the bible above its spec; CLAUDE.md puts the
  bible above every map. A later reader cannot tell which wins when Kestrel's brief and the bible disagree (as in LV4).
- Options: (1) Recommended: one order in master's CLAUDE.md and the level standard: Michael's decisions > bible > level
  standard > the map's approved documents (which may tighten, and loosen only with Michael's written approval recorded in
  the map's decisions) > system docs > code; Kestrel's and the bunker's rules files point to it. (2) Keep per-map orders and
  list them in the level standard.

### LV8 Map documents live in four places and follow three processes  (severity: medium)
- Where: `loco:docs/level-design.md:141,206-216` (docs/prompts/<map>-design.md, phases 0-5); `loco:docs/templates/
  map-spec.md:37,42,44` (docs/prompts/<map-id>.md); `loco:docs/systems/world-and-characters.md:12` (docs/prompts);
  `loco:docs/design-bible.md:1382` (docs/maps/<map>.md); Kestrel in docs/kestrel with its own P00-P11 / B0-B7 stages,
  planner, reviewer and Haiku rules (`loco:docs/kestrel/RULES.md:63-107`, "no sub-agents" at `:70`); the bunker in
  docs/training with its own orchestrator run (`tb:docs/training/RULES.md`); `loco:CLAUDE.md` "How sessions are run"
  (the orchestrator method is Michael's preferred way).
- What: the standard, template, systems doc and bible each give a different home for map docs, and Kestrel's
  one-prompt-per-session, no-subagent process contradicts CLAUDE.md's orchestrator method.
- Options: (1) Recommended: one home, docs/maps/<map>/ (Kestrel and the bunker move there after the merge, ids
  unchanged), one process (the orchestrator method) with the level standard's phases as Michael's review gates; Kestrel's
  planner / reviewer rules become history. (2) Keep each map's folder and process, and fix the four pointers to say so.

### LV9 Kestrel and map docs hard-code the dead branch flow  (severity: medium)
- Where: `loco:docs/kestrel/RULES.md:20` (branch feature/kestrel made from ct-movement), `:66` (`git checkout
  feature/kestrel`), `:130` (never merge into dev, master or ct-movement); `loco:docs/kestrel/PLANNER.md:19`;
  `loco:docs/kestrel/handover.md:104` (every prompt switches to feature/kestrel), `:106` ("Do not merge the feature/kestrel
  pull request into master until the slice is finished"); `loco:docs/templates/map-spec.md:8-10` (merges "to test on the
  preview"); against `loco:docs/locomotion/DECISIONS.md:232` (M26: one PR to master, then one branch per job off master).
- What: after the consolidation feature/kestrel is merged and deleted; handover line 106 directly contradicts M26.
- Options: (1) Recommended: rewrite to "one branch per job off master; Michael merges"; drop the preview slots from the
  template. (2) Leave Kestrel's files as history and put the new rule only in CLAUDE.md.

### LV10 Phone and touch rules remain across the level, light and Kestrel docs  (severity: medium)
- Where: `loco:docs/level-design.md:79` ("readable ... on a phone at Low quality"), `:198` ("Michael's phone sessions"),
  `:219` ("also by touch"), `:230` ("the mobile presets"); `loco:docs/templates/map-spec.md:108-109,116-117`;
  `loco:docs/kestrel/RULES.md:145` ("Phone controls must still work"); `loco:docs/kestrel/handover.md:56,58,105`;
  `loco:docs/kestrel/S0-security-spec.md:74,106,141,152,208`; `loco:docs/systems/ct-toolkit.md:18-24` (touch column);
  `loco:docs/systems/lighting.md:1,53-58,110,125-166` (phone light look, Phone check); `loco:docs/design-bible.md:59,
  110-114,252,262-268,280,293,309,461-462,1388-1390`; `loco:docs/kestrel/overnight-report.md:65` (editor 3D uses the phone
  light look); `loco:docs/kestrel/editor.md:19-30` (editor over home Wi-Fi on an iPhone); against M21
  (`loco:docs/locomotion/DECISIONS.md:227`).
- What: M21 makes the game desktop only; these lines still set phone readability, touch controls and phone budgets as
  rules. The editor's iPhone launcher is a dev tool, not the game, so it needs its own call.
- Options: (1) Recommended: rewrite every rule line to desktop (pad first, then keyboard and mouse); move lighting.md's
  phone-look sections under a "Parked: phone look (M21)" heading until the code cleanup; readability is judged on desktop
  at the Low preset. (2) Delete the phone sections outright now.

### LV11 / MV18 Door rules: light threshold, guards and bash are undecided  (severity: medium)
- Found by: LV11 (Levels, maps, light and stealth AI audit, medium); MV18 (Movement, camera, controls, takedowns and gadgets audit, medium).

**LV11: Door rules: light threshold, guards and bash are undecided**
- Where: `loco:src/world/lightField.ts:27` (`DOOR_SHUT = 0.05`) and `loco:docs/systems/lighting.md:19`;
  `loco:docs/systems/world-and-characters.md:33-38` (a 12% crack counts as closed, A25 / A52); `loco:docs/design-bible.md:
  303-305` (L12: closed doors block light; no partial rule), `:529` (a door left open is "add"); `loco:docs/systems/ai.md:
  69-73` (`pushOpen` by enemies, "sprint bash", noise quiet 2 m / bash 10 m); `loco:docs/locomotion/CT-RESEARCH.md:86,226`
  (CT bash knocks out a guard behind); against M20 Q10 (`loco:docs/locomotion/DECISIONS.md:226`) and
  `loco:docs/locomotion/PROTOTYPE-PLAN.md:73-77`.
- What: the light cut-off is 5% open in code while M20 sets about 15% for light, sound and sight. Guards open doors on
  their patrols and nothing says whether they close them, so "guards notice doors left open" could fire on their own
  doors. Bash needs a new trigger now that sprint is gone, and its knock-out is not decided.
- Options: (1) Recommended: one threshold, 15% open, for light, sound and guard sight; guards close doors they open on a
  calm patrol and notice a door that is open when their route expects it shut; bash is a fast push at run speed that knocks
  out a guard right behind the door (CT). (2) Guards leave doors as they find them and only notice doors the player
  opened. (3) Keep 5% for light and use 15% only for sight and sound.

**MV18: Doors: crack-peek vs stick-driven door; how door actions are chosen is unstated**
- Where: `docs/design-bible.md:178, :385` (open quietly, open fast, bash, peek through a crack); `feature/ct-locomotion:docs/systems/movement.md:203-209` (door peek: crack 0.12 over 0.6 s, the cracked door counts as closed, A25 / A52); `docs/locomotion/DECISIONS.md:138` (A25), `:174` (A52), `:226` (M20 Q10: open past ~15 %, guards notice open doors); `docs/locomotion/PROTOTYPE-PLAN.md:73-77` (door angle follows the stick, step to the latch side, palm on the door, close camera at the crack, normal open / optic / lockpick unchanged); `research/ct-measure-walls-doors-combat-vision.md:58-67, :148-155` (CT uses a door action menu: open, stealth open, bash, optic cable); `docs/locomotion/CT-RESEARCH.md:86` (bash only at a sprint).
- What: M20 Q10 makes the door angle real (light, sight and sound past ~15 %), voiding A25 and the crack-peek model. No doc says how the player chooses between normal open, stealth open, bash and (later) optic cable on a pad now that sprint (the bash trigger) is gone.
- Options: (1) One context press at a door starts the stealth open with the stick driving the angle; the other door actions are decided in Q-controls-7 (recommended). (2) A CT-style door action menu. (3) Keep the crack peek and add the stick-driven open beside it.

### LV12 "Guards do not look up" is not true in the engine  (severity: medium)
- Where: `loco:docs/level-design.md:43` (3.6 "Guards do not look up"); `loco:src/ai/enemy.ts:872` (sight angle is the
  horizontal bearing only); `loco:docs/design/dead-line-v2-engine-check.md` section 2 ("Perception has no vertical limit");
  `loco:docs/systems/ai.md:6-10` (field is a horizontal cone).
- What: the high route's safety is a design promise with no engine support: a guard sees a player 4 m above him exactly as
  well as one at his height, inside the same horizontal cone and range.
- Options: (1) Recommended: add a vertical limit to guard sight (CT-like: little chance to see far above eye level), unit
  test it and record it in Section 12. (2) Reword 3.6 to "height breaks sightlines" and design high routes with occluders
  only.

### LV13 Guard counts, the spawn cap and dormant guards  (severity: medium)
- Where: `loco:docs/level-design.md:68,128-131` (SQUAD_CAP 9; "S5 will change this"); `loco:docs/templates/map-spec.md:82`
  ("9 or fewer"); `loco:docs/design-bible.md:659`; `loco:docs/kestrel/progress.md` status table (S5 dormant guards and S6
  civilians "not started"); `loco:docs/kestrel/01-mission-brief.md:61,255-256,266` (21 guards, 9 dormant, ASK-5, ASK-6,
  ASK-17); `loco:docs/kestrel/handover.md:44,83`; `loco:docs/systems/ai.md:135` (MAX_ALIVE 12; `fs` copy still says 10).
- What: Kestrel's whole roster depends on S5, which is not built; the template still tells map authors to stay at 9
  guards; nobody has decided whether dogs and civilians count toward the 12 awake.
- Options: (1) Recommended: the level standard and template state the S5 target (every guard spawns, at most 12 awake,
  dogs and civilians count, desktop may raise the cap after a perf test) and mark it "until S5 lands: 9 at start". (2) Keep
  the 9-guard rule for every map except Kestrel.

### LV14 Crawl spaces: crouch spaces or duct anchors?  (severity: medium)
- Where: `loco:docs/level-design.md:287-291` (16.7.3 no auto-crawl anchors unless Michael approves; 16.7.4 no grille that
  pops into a room); `loco:docs/kestrel/routes.md:33` (crawl spaces = anchor `duct`); `loco:docs/kestrel/editor.md:236,
  786-787` (Climb tab "Duct crawl" builds a `duct` anchor with grates at both ends), `:1096` (a crawl space is a crouch
  space); `loco:docs/kestrel/overnight-report.md:48,68`; `loco:docs/kestrel/progress.md:51` (2.4 m corridor ceilings leave a
  1.48 m void, under the 1.5 m rule).
- What: the standard and the editor's crawl tool say crouch-walk; routes.md and the editor's duct piece use the auto-crawl
  anchor the standard forbids without approval. The Kestrel corridor voids already fail the 1.5 m rule by 2 cm.
- Options: (1) Recommended: crawl spaces are always crouch-walk spaces; routes.md drops `duct`; the editor's duct piece is
  kept only for real duct ends inside plant shafts and is flagged; Kestrel corridor ceilings go to 2.38 m. (2) Allow the
  duct anchor wherever a real duct exists and relax 16.7.3. (3) Relax the crawl rule to 1.45 m.

### LV15 Co-op lip band ignores the human ladder's reach; solo reach may move  (severity: medium)
- Where: `loco:docs/level-design.md:117-118` (11.3: build co-op lips at 4.3-4.5 from `WALL_JUMP.maxUp` 3.8 and
  `TEAM.boostMax` 4.5); `loco:docs/kestrel/00-facts.md:25,43` (F15 human ladder grab 4.1; F33); `tb:docs/training/
  DECISIONS.md:126` (A35: the human ladder reaches at most 4.3, so lip W2 was lowered to 4.25, breaking 11.3);
  `tb:docs/training/REVIEW-NOTES.md:25`; `loco:docs/locomotion/PROTOTYPE-PLAN.md:44` (jump timings change);
  `loco:docs/locomotion/CT-RESEARCH.md:105` (CT wall jump is jump-then-jump and can land on furniture).
- What: a lip in the 4.3-4.5 band works for a boost but only 4.3 works for a human ladder. The band also rests on the solo
  wall-jump and jump reach, which the CT prototype may change.
- Options: (1) Recommended: one co-op band for both team moves by raising the human ladder's grab to 4.5 (a game-wide
  tuning change, approved once), and re-confirm the solo reach after the prototype. (2) Two bands in 11.3: boost lips
  4.3-4.5, human-ladder lips 4.3 only. (3) Lower the band to 4.2-4.3.

### LV17 No rule for glass (light, sight, thermal)  (severity: medium)
- Where: `loco:docs/kestrel/RULES.md:32` (glass doors and partitions "that guards see through and light passes
  through"); `loco:docs/kestrel/handover.md:50-51` ("Frosted glass and closed blinds block sight and pass light (bible
  5.1)"); `loco:docs/design-bible.md:247-309` (5.1 has no glass rule); `loco:docs/systems/lighting.md`,
  `loco:docs/systems/ai.md` (no glass); `loco:docs/locomotion/CT-RESEARCH.md:227` (CT thermal: glass opaque);
  `loco:docs/locomotion/research/ct-measure-walls-doors-combat-vision.md:113`.
- What: Kestrel's whole door mix rests on glass behaviour that the bible does not state, and its handover cites a bible
  rule that does not exist. Light parity needs one rule for what glass does to light, guard sight, cameras and thermal.
- Options: (1) Recommended: add to bible 5.1: clear glass passes light and sight (guards and cameras see through);
  frosted glass and closed blinds pass light and block sight; thermal does not see through glass (CT); breaking glass is
  a noise. (2) Glass blocks sight too (simpler, less CT).

### LV18 Light parity has no safety net and two plans for the same lamps  (severity: medium)
- Where: `loco:docs/design-bible.md:270-280` (L5 parity test), `:185` (fuse box "Add, Phase 1"); `loco:docs/progress.md:11`
  (Phase 1 Steps 4c-9 parked: strip lamps, parity test, co-op light sync, meter, fuse boxes);
  `loco:docs/prompts/phase-1-light-parity.md` (Steps 5-9; no motion lights or mains-off);
  `loco:docs/locomotion/OWNER-NOTES.md:84,96` ("4c-9 (breaker, motion lights, mains-off)"); `loco:docs/kestrel/progress.md`
  status (S3 beams and PIR lights not started) and 2026-10-15 log (area fittings split into points, intensity shared);
  `loco:docs/backlog.md:20` (strip lamps as line sources, Step 4c); `loco:CLAUDE.md` hard rule "Light parity".
- What: the hard rule has no automated parity test yet; motion lights are planned both in Phase 1 (per OWNER-NOTES) and
  Kestrel S3; long lamps are line sources in Phase 1's plan but a split-into-points workaround in the Kestrel editor.
- Options: (1) Recommended: one lighting plan after the CT prototype: Phase 1 Steps 4c-9 (line-source lamps, parity test,
  co-op light sync, continuous meter, fuse boxes) run first; motion lights and mains-off are built once, in Kestrel's
  security step, on top of them; the editor's point split is replaced by line sources. (2) Keep both plans and reconcile at
  build time.

### LV19 Kestrel's stage order predates the prototype-first plan  (severity: medium)
- Where: `loco:docs/kestrel/handover.md:19` (Order: P03B, HK, P03R, B0 rerun, DR, P04-P05, CAM approval, V1-V3 ...);
  `loco:docs/kestrel/progress.md` status table (P03B awaiting approval, B0 "to rerun", CAM DRAFT, editor work since);
  `loco:docs/kestrel/handover.md:15,22` (pipeline paused until Michael walks the campus); against M22 and M26
  (`loco:docs/locomotion/DECISIONS.md:228,232`).
- What: the next Kestrel stages (floor plans P04, CAM, V1) depend on movement, noise and camera numbers that the CT
  prototype is about to change (LV2, LV3, LV5). Nothing says what Kestrel does after the merge.
- Options: (1) Recommended: after the merge Kestrel continues only with editor and building work that does not depend on
  movement (P03B approval, P03R, B0 rerun); floor plans, CAM, V1 and anything with speeds or camera wait for the approved
  prototype and the facts refresh. (2) Continue P04 now on current numbers and fix later. (3) Pause Kestrel completely.

### LV20 Palm strike versus the archetype rules  (severity: medium)
- Where: `loco:docs/design-bible.md:430-441` (elbow strike; "Heavies: a frontal strike only staggers them"); `:201`
  (verb table); `loco:docs/systems/ai.md:82-83` (`grabRule`: heavy frontal lethal only, enforcer frontal none);
  against M20 Q4 / Q4b and M25 (5) (`loco:docs/locomotion/DECISIONS.md:226,231`; one-hit knockout from any side) and
  `loco:docs/locomotion/research/ct-traversal-combat.md:137` ("heavies are only ever staggered" in today's code).
- What: M20 says one-hit knockout from any side, but does not say whether heavies, enforcers and dogs are included; the
  bible and code exceptions still stand.
- Options: (1) Recommended: every human guard, heavies included, is knocked out by one palm strike from any side (CT);
  dogs cannot be palm-struck; the bible and `grabRule` text change to match. (2) Keep heavies as stagger-only from the
  front.

### LV21 Nav layer numbers conflict  (severity: low)
- Where: `loco:docs/level-design.md:127` (3 by default, raised per map); `loco:docs/systems/ai.md:119` ("up to 3");
  `loco:docs/design/scale-sheet.md:16` ("up to 8 layers"); `loco:docs/templates/map-spec.md:57` ("max 3 walkable
  surfaces"); `loco:docs/kestrel/RULES.md:27` ("At most 4"); `loco:docs/kestrel/00-facts.md:32` (F22 loop limit 8).
- What: four numbers for one fact.
- Options: (1) Recommended: Section 12 states "default 3, a map may raise `navLayers` up to 8 (code limit)"; the other
  docs point to it; Kestrel's 4 stays as a map rule. (2) Leave as is.

### LV22 Walkable slope: player 50 deg, guards about 49 deg  (severity: low)
- Where: `loco:docs/design/scale-sheet.md:15` (nav normal.y > 0.65, about 49 deg); `loco:docs/kestrel/editor.md:683-685`
  and `loco:docs/kestrel/overnight-report.md:21` (player `maxSlope` 50 deg).
- What: a 49.5-50 deg slope is walkable by the player but off the guards' grid. Technical.
- Options: (1) Recommended: state both in Section 12 and keep designed slopes at 45 deg or less. (2) Align the two
  constants.

### LV23 Map list and retired design files  (severity: low)
- Where: `loco:docs/systems/world-and-characters.md:15-20` (MAPS = Warehouse, Proving Grounds); `loco:src/world/maps/
  index.ts:16` (also exchange, trunkAnnex, deadLine, deadLineV2, kestrel, seclab); `loco:src/world/maps/listed.ts:6`
  (retired exchange, trunk-annex, dead-line, dead-line-v2 are still listed); `loco:docs/design/` (retired Dead Line and
  Trunk Annex JSON / mjs beside the living scale sheet and engine check); `loco:docs/kestrel/RULES.md:132` (never delete old
  maps).
- What: the systems doc omits Kestrel, the editor, the campus JSON files and seclab; retired maps are still selectable.
- Options: (1) Recommended: document Kestrel, seclab and the editor in world-and-characters; take retired maps out of
  the listed set now and delete their code in the later cleanup; move retired design files to docs/archive. (2) Keep them
  listed for reference.

### LV24 Per-stop guard facing is described as missing but exists  (severity: low)
- Where: `loco:docs/design-bible.md:538` ("Phase 6 ... Today a stopped guard always faces his next leg") and `:1496`;
  `loco:src/ai/patrol.ts:21-22` (`PatrolRoute.faces`); `loco:docs/kestrel/editor.md` ON8 (editor writes stop facings).
- What: stale bible line. Technical.
- Options: (1) Recommended: mark it "Have" and remove it from Phase 6. (2) Leave.

### LV25 Old names and Blacklist words in level docs  (severity: low)
- Where: `loco:docs/level-design.md:1` ("Silent But Deadly"), `:106` ("a Ghost contract"); `loco:docs/templates/
  map-spec.md:8`; `loco:docs/kestrel/handover.md:86` (Cinder Yard and Ostler Colocation are placeholders; D1 options still
  open); `loco:docs/kestrel/progress.md:275` (player mode "Infiltration" renamed "Campaign", not in the bible).
- What: the old title, a Blacklist-style word, open placeholder names, and a mode rename the bible does not know.
- Options: (1) Recommended: retitle to Night Shift, say "a mission rule (for example no alarms)" instead of "Ghost
  contract", record the Campaign rename in the bible, and ask Michael about the site names. (2) Leave.

### LV26 Kestrel editor items waiting for Michael  (severity: low)
- Where: `loco:docs/kestrel/overnight-report.md:45-51`; `loco:docs/kestrel/progress.md:51`.
- What: sawtooth roof glass faces south (Britain needs north), pallets 1.165 m (British 1.2 x 1.0), corridor voids 1.48 m
  (LV14), Kestrel lit as night (0.22), and the editor moved guard line-of-sight code into `src/ai/perception.ts` against
  Kestrel RULES 11 (no behaviour change).
- Options: (1) Recommended: approve all five as the overnight report suggests (north glass, 1.2 x 1.0 pallets, 2.38 m
  ceilings, night 0.22, keep the moved code). (2) Go through them one by one.

### LV27 Stale ai.md copies on other branches  (severity: low)
- Where: `tb:docs/systems/ai.md`, `ctm:docs/systems/ai.md`, `ops:docs/systems/ai.md` (sonar vision, Execute, Perfectionist
  turning off Execute); `fs:docs/systems/ai.md` (`MAX_ALIVE` 10); `tb`, `ctm`, `ops` lighting.md (no thermal section).
- What: the merge must keep loco's copies; operators (not merged) will keep contradicting master until it merges master.
- Options: (1) Recommended: take loco's files in the consolidation; tell the operators run to merge master before it
  edits these docs. (2) None needed beyond (1).

### LV28 Bible 5.1 "current state" contradicts lighting.md  (severity: low)
- Where: `loco:docs/design-bible.md:249-254` ("Current state (3.4.0 ...)": gameplay uses the analytic registry, three
  versions of the truth); `loco:docs/systems/lighting.md:6-28` (3.6: one light function, gameplay reads the light field);
  `loco:docs/design-bible.md:306-309` (L14 before L13).
- What: the bible still describes the problem Phase 1 Steps 1-2 already fixed.
- Options: (1) Recommended: replace the "current state" block with one line on what is done (Steps 1-4b) and what is left
  (LV18); renumber L13 / L14. (2) Leave.

Merged into entries in other sections:

- LV5 Kestrel still plans to build its own back-to-wall with removed CT-breaking verbs (high): merged into V13 / LV5 under Vision core.
- LV6 Hunter, Wave and PvP Mission are planned for Cinder Yard but called history elsewhere (high): merged into V4 / LV6 / TU15 under Vision core.
- LV16 Operator heights change light sampling; the bible still says identical (medium): merged into AR1 / V8 / LV16 under Art, characters, operators and weapons.

## Training bunker, menus, HUD, modes and saves (audit D)

Scope: docs/training, docs/menu-ui, ui / modes / saves system docs, bible 2, 3, 5.8, 5.10, 5.11, 5.14, 5.17, 6, 11.

### TU2 / MV28 Training drills predate M20 (pure CT)  (severity: high)
- Found by: TU2 (Training bunker, menus, HUD, modes and saves audit, high); MV28 (Movement, camera, controls, takedowns and gadgets audit, medium).

**TU2: Training drills predate M20 (pure CT)**
- Where: `feature/training-bunker:docs/training/BAYS.md:756-757` (B6 objectives 6 "Lean out and aim from the corner",
  7 "SWAT turn across a doorway"), `BAYS.md:713` (B6 new mechanics), `FEATURES.md:57-58` (lean-out aim, SWAT turn,
  open-side weapon at edges, low-wall side lean), `PLAN.md:59` (SW-L1 "edge aim", "B7 sandbag lean");
  `BAYS.md:279,285,305,311` (B2 "Sprint, vault the rail", "Sprint strip", "Sprint and jump the trench");
  `BAYS.md:180,198,869,899`, `FEATURES.md:96`, `PLAN.md:59`, `steps/TM-merge.md:23` (elbow strike);
  `FEATURES.md:34` ("Instant stop / start, stop hold"), `FEATURES.md:136` ("Front, side (calm only)");
  `DECISIONS.md:111` (A20 client verb `sprint`), `steps/T1c-tutorial.md:15` (drillDetect reads sprint).
- What: M20 removes lean-out aim, wall-edge shooting and the SWAT turn (shoulder swap instead), removes sprint, and
  makes the strike a one-hit palm strike from any side; M14 / M20 replace "instant stop" with freeze-mid-stride at
  walk / crouch and a short brake at run. Four B6 / B2 drills and several FEATURES rows teach moves that no longer
  exist, and D30 makes every drill mandatory, so an unbuildable drill would block its airlock.
- Options: (1) Replace B6 objectives 6-7 with one "swap shoulders at the corner" drill, B2 sprint drills become "run"
  (top gear) drills on the same geometry, elbow strike renamed palm strike everywhere, FEATURES rows 34, 57, 58, 96
  rewritten; re-check after the CT prototype (recommended) (2) Delete the drills with no replacement (3) Keep as greyed
  "not a drill until it lands" lines (they never land).

**MV28: Training docs teach removed verbs**
- Where: `feature/training-bunker:docs/training/BAYS.md:180, :198, :203, :279, :285, :305, :311, :324, :713, :756-757`; `BAYS-v1.md:87, :101, :155, :163-164, :405, :439`.
- What: The bunker's drills teach sprint, quick 180, the elbow strike, lean-out aim and the SWAT turn, all overturned by M20. (Training is another area; flagged so the master rewrite catches it.)
- Options: (1) Mark the affected drills "rework after the CT prototype" in master (recommended). (2) Rewrite them now.

### TU3 Training docs predate M21 and M25 (phone, touch, gear pips)  (severity: medium)
- Where: `feature/training-bunker:docs/training/FEATURES.md:222` ("HUD: gear pips ... e2e-touch"), `FEATURES.md:223`
  ("basic touch (locomotion D1) ... e2e-touch on B1-B2"), `PC-PASS.md:10` (row 4 "at the phone look"). D24
  (`DECISIONS.md:47`), `RULES.md:58`, `SPEC.md:119` already say desktop only.
- What: The training run was desktop only from the start (D24), but three rows still name the gear pips (removed by
  M25), the touch scheme and e2e-touch (retired by M21) and a phone-look screenshot.
- Options: (1) Drop those parts of rows 222, 223 and PC-PASS row 4 (recommended) (2) Leave them as history.

### TU4 FEATURES and the switch-on plan are keyed to the old locomotion step numbers  (severity: medium)
- Where: `feature/training-bunker:docs/training/FEATURES.md:7-8` ("loco NN = locomotion step NN ... step 09 is
  next"), every `loco NN` status cell (rows 36-62, 94-106, 125, 137, 148, 156-157, 207-208, 224); `PLAN.md:59-61`
  (SW-L1 loco 09-15, SW-L2 loco 20, SW-L3 loco 22-29); `DECISIONS.md:38` (D15 "Wait for locomotion steps 09-20").
- What: M19 and M22 replaced the locomotion step plan with CT research and a CT prototype (P1-P4), so "loco 22",
  "loco 26", "loco 27", "loco 28" no longer name anything, and D15's wait condition is undefined.
- Options: (1) Re-key status to "exists on master after consolidation" or "CT prototype / later" and rebuild the
  switch-on table after the prototype plan is final (recommended) (2) Keep the numbers with a note "old plan".

### TU5 Training run documents use the dead branch flow and old folder  (severity: medium)
- Where: `feature/training-bunker:docs/training/BRIEF.md:3-14,21-25` (folder `C:\NightShift\Mobile-Coop`, cloud
  start, never push ct-movement / dev), `PLAN.md:6-16` (base feature/kestrel, "when he wants it on a preview, he
  merges"), `SPEC.md:8-12`, `DECISIONS.md:29-30` (D6 branch, D7 "bunker before P03R"), `RULES.md:13-20`. Against M26
  and `feature/ct-locomotion:docs/locomotion/CONSOLIDATE.md:14,45` (fixes on a fresh `feature/bunker-walkthrough`).
- What: After consolidation the bunker continues on its own branch off master; the START / RESUME prompts, the
  "never commit to ct-movement / dev" rules and the kestrel merge plan are dead. D7's ordering against Dead Line also
  predates M22 (CT prototype first).
- Options: (1) At the walkthrough start, rewrite BRIEF / RULES / STATE / PLAN 1 for `feature/bunker-walkthrough`
  off master, PR to master, and mark D6 void by M26 (recommended) (2) Archive the run docs and write a fresh walkthrough
  brief.

### TU6 Menu spec puts the Fallow course in the solo Training list  (severity: medium)
- Where: `feature/menu-ui-spec:docs/menu-ui/SPEC.md:257-259` (Training list "Fallow course, Proving training rooms"),
  `SPEC.md:233` (main menu "TRAINING 6 / 9"), `steps/04-title-main.md:9-10,18`, `steps/07-missions-briefing.md:23`.
  Against `feature/training-bunker:docs/training/DECISIONS.md:24` (D1 co-op only), `:25` (D2 exactly 2), `:45` (D22
  "Co-op lobby mode ... not on the solo Play screen"), `docs/systems/modes-and-progression.md:5` (training-bunker:
  "co-op only (two players, lobby 'Training course')").
- What: The menu spec (written from ct-locomotion, which has no course code) lists the co-op-only course as a solo
  training entry, with a 9-bay style counter.
- Options: (1) Solo Training lists solo training only; the course lives in the co-op lobby, with a context line on
  the Training screen pointing to Co-op (recommended) (2) Training lists the course and opens the co-op lobby on it
  (3) Make the course playable solo (reverses D1).

### TU7 Menu lobby spec has no place for the training course  (severity: medium)
- Where: `feature/menu-ui-spec:docs/menu-ui/SPEC.md:328-335` (lobby: four player rows, Mission and Difficulty
  cyclers only), `steps/09-coop-lobby.md:15-21`. Against `feature/training-bunker:docs/training/DECISIONS.md:44-45`
  (D20 "Start at bay N", D22 lobby mode "Training course"), `steps/T1b-course-mode.md` (third player refused),
  `steps/T1c-tutorial.md:34-35`, `docs/systems/ui.md:98` (training-bunker: the lobby reads the course record).
- What: Step 09 rewrites `src/net/coopUi.ts`, which the training branch already changed (course mode entry, bay
  select, two-player cap). Nothing in the menu spec says how the course is chosen, how bay select looks, or that a
  course room has two slots. Merge conflict and design gap.
- Options: (1) Add to SPEC 7.18: a Mode cycler (Campaign mission / Training course / Free roam), a course room shows
  two slots and a "Start at bay" cycler, results 7.21 gains the course panel (recommended) (2) Show the course as a
  mission card in the lobby's mission list.

### TU10 Menu run preconditions and step references are stale  (severity: medium)
- Where: `feature/menu-ui-spec:docs/menu-ui/BRIEF.md:8-13` (precondition "feature/ct-locomotion is merged into
  master", step 18 Pad tab), `DECISIONS.md:56` (MD20), `README.md:52-56`, `RUNBOOK.md:42`, `SPEC.md:10-11`
  (code facts from ct-locomotion 57c4fed, "17-34 to come"), `DECISIONS.md:45` and `SPEC.md:401-402` and
  `steps/12-menu-setups.md:16` ("until locomotion step 25 fixes aim from attached states"), `FINDINGS.md:32-40`
  (steps 25, 27); `DECISIONS.md:40` (MD13 "Locomotion step 18 says Esc / B to cancel") against
  `feature/ct-locomotion:docs/systems/ui.md:12-13` (built: "B held 1 s cancels").
- What: The precondition becomes the M26 consolidation PR; locomotion step 25 no longer exists after M19 / M22, so
  the "holstered only until step 25" rule has no end condition; MD13 misquotes what step 18 built.
- Options: (1) Precondition = consolidation merged; the menu run gets its own branch off master; replace "step 25"
  with "until the CT prototype's aim poses are approved"; MD13 text corrected to the built behaviour (recommended)
  (2) Leave the references and resolve them at the run's step 0.

### TU12 / MV11 Gear pips are still in the HUD contract  (severity: high)
- Found by: TU12 (Training bunker, menus, HUD, modes and saves audit, high); MV11 (Movement, camera, controls, takedowns and gadgets audit, medium).

**TU12: Gear pips are still in the HUD contract**
- Where: `feature/ct-locomotion:docs/design-bible.md:731` ("stance and gear pips"; same line on every branch:
  master 686, ct-movement 733, training-bunker 731, operators 733, footsteps 735); `feature/ct-locomotion:docs/systems/ui.md:100-101`
  (`hud.setGear`, pips shown 1.5 s after a change); `feature/training-bunker:docs/training/FEATURES.md:222`.
- What: M25 keeps the speed rocker with NO on-screen gear indicator. The bible's HUD list and ui.md still describe
  gear pips. The bible pairs "stance and gear", so whether the stance indicator stays is unclear.
- Options: (1) Remove gear pips from bible 5.10 and ui.md; decide the stance indicator separately (Q-ui-1)
  (recommended) (2) Keep pips as an accessibility option, off by default.

**MV11: HUD gear pips still documented**
- Where: `feature/ct-locomotion:docs/systems/input-and-loop.md:115`, `docs/systems/movement.md:45-46`, `docs/ct-movement.md:76-77`, `docs/locomotion/PC-PASS.md:62`, `docs/locomotion/STATE.md:28`.
- What: M25 (7) keeps the D-pad / wheel speed cap but removes the on-screen indicator (`DECISIONS.md:231`; `PROTOTYPE-PLAN.md:22`). Docs still describe the pips.
- Options: (1) Remove the pips from master docs (recommended). (2) Keep them as an accessibility option, off by default.

### TU14 Objective display: always on screen in the course, change-only in the bible  (severity: medium)
- Where: `feature/training-bunker:docs/training/SPEC.md:143` (R5 "always visible"), `DECISIONS.md:68` (D45 "i didnt
  know what i was doing"), `docs/systems/ui.md:91-93` (training-bunker: "it has no toggle"). Against
  `feature/ct-locomotion:docs/design-bible.md:738` ("objective text on change only"). Not listed among SPEC
  exceptions E1-E12 (`SPEC.md:152-165`).
- What: Michael asked for an always-visible objective list after getting lost in the bunker. It is his decision for the
  course, but it contradicts the bible HUD rule and is not recorded as an exception, and nobody has asked whether the
  campaign should do the same.
- Options: (1) Record it as exception E13 for the course; campaign keeps change-only plus the field terminal list
  (recommended) (2) Always-on objective list everywhere (3) A HUD setting.

### TU16 Save version numbers and doc pieces differ by branch  (severity: low)
- Where: `feature/ct-locomotion:docs/design-bible.md:746` ("SAVE_VERSION (7 on dev ...)"); code `SAVE_VERSION`
  8 on ct-locomotion, 7 on training-bunker, ct-movement, master; `feature/ct-locomotion:docs/systems/saves.md:6-10,16-18`
  (settings, schema v8) missing from `feature/training-bunker:docs/systems/saves.md`, which alone has the course
  record (`:15-20`).
- What: Merged saves.md must be the union (settings, v8, course record); the bible line names the dead `dev` branch and
  an old number. The course record adds a kv key only (no bump), consistent with the rule.
- Options: (1) Bible 5.11: "the current number lives in src/save/schema.ts" with no number; saves.md union
  (recommended) (2) Update the number by hand each time.

### TU17 Mission cards need data the save does not hold  (severity: medium)
- Where: `feature/menu-ui-spec:docs/menu-ui/DECISIONS.md:27-29` (MD8 cards: rating %, intel, last played),
  `SPEC.md:241-244` (intel found `3 / 12`, last played, endings seen), `steps/07-missions-briefing.md:13-15`; against
  `BRIEF.md:25-26` ("Leave out ... save-shape changes") and `feature/ct-locomotion:docs/systems/saves.md:16`
  (`MissionRecord` = `{ rating, score, plays, wins }`), bible 5.8 save design is Phase 4.
- What: Intel found, last played and endings have no save field, and the run may not add one.
- Options: (1) Cards show what the save has (best rating, plays); intel / date / endings arrive with Phase 4's save
  change (recommended) (2) Allow one SAVE_VERSION bump in the menu run.

### TU18 Smaller menu gaps against the training branch  (severity: low)
- Where: `feature/menu-ui-spec:docs/menu-ui/SPEC.md:290` (Gameplay tab rows), `:356-359` (results); against
  `feature/training-bunker:docs/systems/ui.md:87-90` (Settings > Gameplay "Course markers", course results panel).
- What: The menu spec does not list the "Course markers" setting or the course results panel.
- Options: (1) Add both to SPEC 7.11 and 7.21 (recommended) (2) Leave to the menu run's merge.

### TU19 ui.md still describes the Blacklist economy screens as current  (severity: low)
- Where: `feature/ct-locomotion:docs/systems/ui.md:6` ("HUD (Blacklist-minimal"), `:33-43` (Loadout "Splinter Cell:
  Blacklist's gear screen", SBD-NET bar, credits, suit, HQ, challenges), `:73-76` (theme `--gold` credits).
- What: Those parts are legacy only (`?legacy=1`); the campaign loadout is the short list (menu SPEC 7.10).
- Options: (1) ui.md describes the campaign screens and moves economy text under a "Legacy (parked)" heading
  (recommended) (2) Leave as is.

### TU20 / V14 Solo Training mode has no current definition  (severity: medium)
- Found by: TU20 (Training bunker, menus, HUD, modes and saves audit, medium); V14 (Vision core audit, medium).

**TU20: Solo Training mode has no current definition**
- Where: `feature/ct-locomotion:docs/systems/ui.md:15` (Training: Proving Grounds, passive guards, invulnerable,
  "a step skipped after 90 s"), `feature/ct-locomotion:docs/design-bible.md:383` ("rewritten in Phase 3 to teach the
  CT verbs"), `feature/training-bunker:docs/training/DECISIONS.md:24` (D1 "solo teaching stays in Training mode"),
  `feature/menu-ui-spec:docs/menu-ui/SPEC.md:258` ("Proving training rooms").
- What: Nothing says what solo Training teaches under pure CT movement or whether it stays. Its 90 s auto-skip is the
  opposite of the course's "nothing can be skipped" rule (D30).
- Options: (1) Rewrite solo Training as a short solo tutorial of the CT verbs after the CT prototype, no auto-skip
  (recommended) (2) Retire solo Training; Fallow is the only training (3) Keep it as it is.

**V14: What teaches the player: solo Training mode or the co-op-only Fallow bunker?**
- Where: `loco:docs/design-bible.md:383` ("Training mode is rewritten in Phase 3 to teach the CT verbs"), `:1492`;
  `loco:docs/progress.md:160` (old Training still mentions Mark & Execute); against
  `training-bunker:docs/training/DECISIONS.md:8,24,45` (Fallow: co-op only, no solo routes, shown in the co-op lobby, not on
  the solo Play screen; "solo teaching stays in Training mode") and the bible's C1 / P6 "solo is always completable".
- What: no doc says which course a solo player uses, or that Fallow is the one co-op-only space.
- Options: (1) Two courses: Fallow teaches co-op; the solo Training course is rebuilt for the CT-pure verbs after the
  prototype; bible records Fallow as the second co-op-only exception beside Mission 8 Act 2 (recommended). (2) Add solo
  routes to Fallow and retire the old Training. (3) Fallow only.

### TU21 Internal number and index drift inside the training docs  (severity: low)
- Where: `feature/training-bunker:docs/training/SPEC.md:108` (co-op lips "B4 walls 4.4") vs `DECISIONS.md:126,164`
  (A35 / A73: W2 4.25); `SPEC.md:103` ("at most 7 alive") vs `DECISIONS.md:153` (A62 relief role-players add spawns);
  `BRIEF.md:40-41` ("D1-D12 and Claude's C1-C8", "E1-E10") and `RULES.md:11` (E1-E10) vs actual D1-D50, C1-C10,
  E1-E12; `CHANGELOG.md` 3.7.0 / 3.8.0 / 3.9.0 for training while `package.json` is 3.5.1 and the locomotion run uses an
  unnumbered heading; the menu run plans one more minor version (`BRIEF.md:55`).
- What: Small stale numbers and indexes; versions will collide in the consolidation.
- Options: (1) Fix the numbers and give the consolidation one version (recommended) (2) Leave to the walkthrough run.

### TU23 Master docs have no home for the course or the menu redesign  (severity: medium)
- Where: `feature/ct-locomotion:docs/design-bible.md` (no section names the training course, course mode, Fallow, or
  the E11 marker exception to bible 6 "Never: world waypoints"); `feature/ct-locomotion:CLAUDE.md` doc index and
  module map (no `docs/training/`, no `docs/menu-ui/`, no `game/course`).
- What: After the merge the bunker is a large shipped system, and the menu spec is an approved design, but the bible
  and CLAUDE.md never mention either. The MD1 font exception (Barlow Condensed) also exists only in the menu docs
  (`DECISIONS.md:9-12`).
- Options: (1) Add a bible section "Training course (Fallow)" with D1, D2, D30, R1-R8 and E11-E13, list both doc
  folders in CLAUDE.md, add the MD1 font line to the hard rules (recommended) (2) Point to the folders only.

### TU24 Bunker drops rely on "no fall damage"  (severity: low)
- Where: `feature/training-bunker:docs/training/DECISIONS.md:155` (A64: drops of 4.8 m, 4.8 m and 11.8 m into the
  B3 rope net are heavy landings "by design: no fall damage exists").
- What: If the CT prototype adds CT-style fall damage (M20 is pure CT), the B3 catcher net heights must be re-checked.
- Options: (1) Bunker follows the prototype's ruling; re-check B3 at the walkthrough (recommended) (2) Keep no fall
  damage game-wide.

### TU25 Menu "remaining questions" never answered  (severity: low)
- Where: `feature/menu-ui-spec:docs/menu-ui/DECISIONS.md:60-66` (R / F keys, B bindable, Feedback on the main menu,
  HUD font, title wording).
- What: Five open questions plus four "step 1 - for review" decisions (MD11, MD13, MD15, MD19). Asked below.
- Options: (1) Ask now (recommended) (2) Ask at the run's pause A.

Merged into entries in other sections:

- TU1 Training run is blocked by the dropped bot partner (high): merged into PL11 / V12 / TU1 under Platform, performance, co-op, testing and process.
- TU8 Menu spec is full of phone and touch work (M21) (high): merged into MV12 / TU8 under Movement, camera, controls, takedowns and gadgets.
- TU9 Sprint still has a hold / toggle setting (medium): merged into MV10 / TU9 under Movement, camera, controls, takedowns and gadgets.
- TU11 Brightness screen symbol breaks the goggle IP rule (medium): merged into AR2 / TU11 under Art, characters, operators and weapons.
- TU13 Phone and touch UI text in bible and ui.md, and the bible versions disagree on P7 (medium): merged into PL1 / V1 / MV3 / TU13 under Platform, performance, co-op, testing and process.
- TU15 Hunter, Wave and PvP: "history" or "coming back"? (medium): merged into V4 / LV6 / TU15 under Vision core.
- TU22 Protocol version (low): merged into PL10 / TU22 under Platform, performance, co-op, testing and process.

## Audio and music (audit E)

Scope: audio system doc, docs/audio, docs/music, audio credits, music spec, bible 5.2.

### AU1 / V6 / PL8 The audio-source hard rule is different on six branches; the bible on ct-locomotion has none of the 16 Oct decisions  (severity: high)
- Found by: AU1 (Audio and music audit, high); V6 (Vision core audit, high); PL8 (Platform, performance, co-op, testing and process audit, high).

**AU1: The audio-source hard rule is different on six branches; the bible on ct-locomotion has none of the 16 Oct decisions**
- Where:
  - `master:CLAUDE.md:156` "audio is WebAudio synthesis" (no exception).
  - `feature/ct-locomotion:CLAUDE.md:52`, `feature/training-bunker:CLAUDE.md:46`, `ct-movement:CLAUDE.md:40`: synthesis "unless the Phase 2 A/B test changes it".
  - `feature/footsteps:CLAUDE.md:43`: plus CC0 movement foley.
  - `feature/music:CLAUDE.md:43`: plus the score's CC0 orchestral recordings (Michael 2026-10-15) and foley.
  - `feature/weapon-audio:CLAUDE.md:43`: "Audio may use CC0 recordings for any sound (Michael, 2026-10-16)".
  - `feature/operators:CLAUDE.md:47-49` (not merged) edits the same line for its CC0 body and keeps "Audio is WebAudio synthesis unless the Phase 2 A/B test".
  - Bible: `feature/ct-locomotion:docs/design-bible.md:329-342` (S7 still an open test, "Until then the no-external-audio hard rule stands"), `:1347` (Section 6: no external audio files), `:1529` (open question 4 still open). `feature/weapon-audio:docs/design-bible.md:341-346`, `:1270`, `:1452` (settled: CC0 for every sound).
- What: the newest decision (Michael, 2026-10-16, "allow CC0 for everything", `feature/weapon-audio:docs/audio/weapon-audio-progress.md:19-22`) exists only on weapon-audio. ct-locomotion's bible 1.13 is newer than weapon-audio's 1.11 but lacks the S7 additions, so the merge must carry them across by hand, and the operators line must stay compatible.
- Options: (1) Master states the weapon-audio rule (CC0 recordings allowed for any sound, bundled, never fetched, credited in `docs/audio-credits.md`; synthesis where it sounds better); S7 rewritten as "decided" with the test history in one line; Section 6 and open question 4 updated (recommended). (2) Keep per-category exceptions (score, foley, guns only). (3) Revert to synthesis-only.

**V6: Audio source rule: four versions across branches**
- Where: `loco:CLAUDE.md:52` and `loco:docs/design-bible.md:329-342,1347,1529` (synthesis unless the Phase 2 A/B test
  changes it; "Michael picks by ear on his iPhone"); `footsteps:CLAUDE.md:43`, `footsteps:docs/design-bible.md:341-343,1267`
  (CC0 movement foley only, "the rest of the test stands"); `weapon-audio:CLAUDE.md:43`,
  `weapon-audio:docs/design-bible.md:343-348,1270,1452` (Michael 2026-10-16: "allow CC0 for everything"; budget about 8 MB
  stands; open decision 4 settled); `music:CLAUDE.md:43` (the score's CC0 orchestral recordings, VSCO 2 CE, 2026-10-15,
  plus foley; still "other audio is synthesis"). Also `loco:README.md:19` ("WebAudio synthesis, no external art or audio")
  and `loco:CLAUDE.md:98` (`audio/` = "WebAudio synth voices").
- What: the newest decision (2026-10-16, any sound may be CC0) sits only on weapon-audio. Music V4 alone is 5.9 MB
  (`music:CHANGELOG.md:12`), so the 8 MB total budget (a proposal, never confirmed) is nearly spent before weapons and foley.
- Options: (1) Master rule = weapon-audio's text: CC0 recordings allowed for every sound, bundled, never fetched, credited
  in docs/audio-credits.md, synthesis where it sounds better; S7 marked settled; the size budget re-set for desktop
  (recommended). (2) CC0 only for foley, weapons and the score. (3) Synthesis except foley.

**PL8: The "no external audio" hard rule differs on every branch**
- Where: `loco:CLAUDE.md:52` and `train:CLAUDE.md:46` ("Audio is WebAudio synthesis unless the Phase 2 A/B test changes
  it"); `fs:CLAUDE.md:43` (plus CC0 movement foley); `mus:CLAUDE.md:43` (plus the VSCO 2 CE orchestral recordings,
  Michael 2026-10-15, plus foley); `wa:CLAUDE.md:43` ("Audio may use CC0 recordings for any sound (Michael,
  2026-10-16)"); `ops:CLAUDE.md:47` (CC0 base body for operators); `loco:docs/design-bible.md:337` ("Until then the
  no-external-audio hard rule stands"), `:1527` (open decision 4: audio source).
- What: a hard rule in CLAUDE.md will conflict three ways on merge, and the bible still lists the audio source as open
  although Michael decided it on 2026-10-15 and 2026-10-16 in the audio sessions.
- Options: (1) master hard rule: "No external art except CC0 textures (5.16) and the CC0 operator base body (ops).
  Audio may use CC0 recordings for any sound, bundled, never fetched at runtime, each credited in
  docs/audio-credits.md; synthesis where it sounds better" and close bible open decision 4 (recommended) (2) allow only
  foley and the orchestral samples (3) synthesis only, remove the recordings.

### AU2 Audio size budget is already exceeded and four different budgets are written down  (severity: high)
- Where: `feature/ct-locomotion:docs/design-bible.md:341` and `feature/weapon-audio:docs/design-bible.md:339,345-346` ("proposal 8 MB", "about 8 MB in all"); `feature/weapon-audio:docs/audio-credits.md:30-31` ("score 5.9 MB ... about 7.2 MB of the proposed 8 MB"); `feature/music:docs/audio/music-progress.md:80` (round 24: menu 2.9 MB, "all game tracks 7.2 MB"); `feature/music:docs/audio/music-direction-v2.md:459` (4 MB cap for samples); `feature/music:docs/audio/music-direction-v3.md:131` (16 MB proposed for music); `feature/music:CHANGELOG.md:13` ("nine MP3 files (5.9 MB)", stale on its own branch).
- What: measured from git, after all three merge the shipped audio is about 8.55 MB (score 7.23 MB + foley 0.24 MB + weapons 1.08 MB), over the 8 MB proposal, and weapon-audio's credits file understates it because it predates round 24. The old V3 sketch stems (8.8 MB, `src/assets/music/sketches/`) are also still committed (see AU18).
- Options: (1) Set one desktop audio budget in the bible (for example 12 MB precached, about 50 % headroom for ambience and guard foley), and fix the credits total (recommended). (2) Keep 8 MB and cut the menu theme back or lower its bitrate. (3) No budget on desktop.

### AU3 / V7 The music docs disagree with themselves about what the music is made of  (severity: medium)
- Found by: AU3 (Audio and music audit, medium); V7 (Vision core audit, medium).

**AU3: The music docs disagree with themselves about what the music is made of**
- Where: `feature/music:docs/audio/music-progress.md:3-4` ("all synthesised in code"); `feature/music:docs/music/score-design.md:5` ("Status: audition sketches only. Nothing is wired"), `:10-11` ("Synthesised in code, no samples for now"), `:110-113` ("Everything is synthesised ... with no samples"); `feature/music:docs/prompts/music-spec.md:17-21` ("Never orchestral", "WebAudio synthesis only, no audio files"). Against: `feature/music:docs/systems/audio.md:31-41` and `CHANGELOG.md:13` (real CC0 VSCO orchestral recordings, rendered offline to MP3), `music-progress.md:553` (round 6: "real orchestra recordings (CC0), which replaces the brief's 'no samples for now'").
- What: the shipped score is CC0 orchestral recordings in a Hans Zimmer spirit; the header of the progress log, the design doc and the project spec still describe synthesised, electronic, "never orchestral" music.
- Options: (1) Fix the progress header and mark score-design.md and music-spec.md as history; write the current direction in one short section of `docs/systems/audio.md` (recommended). (2) Rewrite score-design.md to V4-as-built. (3) Leave for `feature/music-revision`.

**V7: Music has no place in the bible, and its direction contradicts itself**
- Where: no music section in any bible (`loco:docs/design-bible.md` mentions music only at `:1153`, "no music stingers"
  in the Confrontation); `footsteps|music|weapon-audio:docs/prompts/music-spec.md:17-20` ("heavily inspired by Amon
  Tobin's Chaos Theory soundtrack ... Never orchestral"); against `music:CHANGELOG.md:3-14` (Music V4: strings, cellos,
  brass, real orchestral recordings) and `music:CLAUDE.md:43`. `loco:docs/locomotion/BIBLE-PROPOSALS.md:15` (proposal 9,
  adaptive layered music) is unresolved. CONSOLIDATE says music "needs revising later".
- What: master will ship a score whose style the spec forbids, and the bible says nothing about music at all.
- Options: (1) Add a short music section to the bible (adaptive: silence when calm, cautious, alert, coming down; style
  set by Michael's answer); the revision job follows it (recommended). (2) Keep music out of the bible; the spec rules.

### AU4 Menu theme: weapon-audio and music describe two different menu tracks  (severity: medium)
- Where: `feature/weapon-audio:docs/systems/audio.md:11,31-33` ("Grand, dialled back", played as a whole 91 s piece, rest, again); `feature/weapon-audio:TESTING.md:10` ("about 90 s ... ends on its own"); `feature/weapon-audio:CHANGELOG.md:40`. Against `feature/music:docs/systems/audio.md:11-13` ("Menu theme, extended", 64-bar seamless loop, whole-piece mode unused); `feature/music:TESTING.md:10-12` (2 min 50 s); `feature/music:CHANGELOG.md:21-24`; `feature/music:docs/audio/music-progress.md:36-37` (round 25 "waiting for Michael").
- What: CONSOLIDATE merges music last, so music's state should win in audio.md, TESTING, CHANGELOG and `game.json` / `music-menu-head.mp3` (the head file exists only on music). The round 25 version is in the game but Michael has not approved it.
- Options: (1) Music's extended loop wins in every merged doc; Michael's approval of round 25 logged as open (recommended). (2) Revert the game menu track to the 90 s whole piece until music-revision. (3) Keep both, chosen by a setting.

### AU5 Michael's "footsteps too loud" (P13) is open, and the gun levels are tuned against those steps  (severity: high)
- Where: `feature/ct-locomotion:docs/locomotion/PLAY-NOTES.md:43` ("Works but the steps are just too loud in game. Worked in time with feet."); `feature/footsteps:src/audio/foley/steps.ts:86` (`FOLEY_MIX`); `feature/weapon-audio:docs/systems/audio.md:111-112` and `docs/audio/weapon-audio-progress.md:37-38` (open pistol about 12 dB over a running step, suppressed pistol level with it, brass 9 dB under it); `feature/weapon-audio:TESTING.md:43` ("Footsteps sit under the music").
- What: P13 was noted on 2026-10-17 against playtest/combined; no audio branch has a later commit. Lowering the steps alone breaks the weapon mix ratios, which are defined relative to a running step.
- Options: (1) In the consolidation (or first audio job), lower the foley about 6 dB and keep the gun-to-step ratios by moving the gun levels with it, then Michael re-checks (recommended). (2) Lower only the steps and accept louder guns relative to them. (3) Add a separate Footsteps volume slider.

### AU6 The foley has a sprint gait and walk / run switch tuned to the old speeds  (severity: medium)
- Where: `feature/footsteps:src/audio/foley/steps.ts:17-27` (`'sprint'` gait, `RUN_FROM = 2.1` "between the walk 1.4 and the jog 2.8"), `:45-50` (`GAITS.sprint` top 5 m/s); `feature/weapon-audio:docs/systems/audio.md:60-62` (crouch / walk / run / sprint, "sprint 16-30 ms slapping"); `feature/weapon-audio:TESTING.md:37,42` ("sprint slaps", "watch the feet at gear 1 and gear 6"); `feature/weapon-audio:docs/systems/testing-tools.md:149-152` (e2e-foley "at a walk and a sprint", "9 m at a sprint"). Against: DECISIONS M20 Q8 (no sprint), M25 (6) (run 4.2 m/s, rocker kept), `feature/ct-locomotion:docs/locomotion/PROTOTYPE-PLAN.md:22-24` (5 speeds: 0.2 / 0.75 / 2.0 / 3.0 / 4.0-4.6 m/s standing, remove sprint / gear 6); `feature/ct-locomotion:src/config/movement.ts:148,156-157` (step 22 still has 6 gears and sprint).
- What: after the prototype, the sprint gait, its e2e case and the gear-6 test lines become dead; the 2.1 m/s run threshold sits between the new 2.0 and 3.0 tiers by accident. Same sprint dependency in locomotion's own heavy-footfall haptic (`feature/ct-locomotion:src/game/gameState.ts:492-494`, gear >= 6).
- Options: (1) Master docs say the foley has crouch / walk / run sound styles keyed to the CT speeds; the sprint gait and e2e case are removed in the prototype job with the sprint (recommended). (2) Keep the "sprint" slap as the style of the top run speed. (3) Leave until the prototype lands.

### AU7 Two foot-plant hooks, and foley wiring assumptions the CT prototype will change  (severity: medium)
- Where: `feature/ct-locomotion:src/player/player.ts:108,390` (`onFootPlant` callback, used for haptics); `feature/weapon-audio:docs/systems/audio.md:68-72` (foley counts `Player.footPlants` / `footPlantSide`; "shuffles on the spot at 0.5"; "Cover glides ... at 0.4"); `feature/weapon-audio:docs/audio/weapon-audio-progress.md:60-62` (trial merge: both inside the same `if`); `feature/ct-locomotion:docs/locomotion/CONSOLIDATE.md:28-29` ("audio hooks attach to locomotion's foot-plant events"); `feature/weapon-audio:TESTING.md:42` ("Turning on the spot makes soft steps"). Against `PROTOTYPE-PLAN.md:27-38` (stops freeze mid-stride with no closing step, no stationary turn: spinning is the walk cycle on a tiny circle, slowest speed walks backwards).
- What: the steps are correctly tied to real foot plants (good, matches CT), but through a second mechanism next to locomotion's event, and the "shuffle on the spot" / turn sounds describe step 22 behaviour the prototype removes.
- Options: (1) One foot-plant event on `Player` that both haptics and foley subscribe to; audio.md describes "one step sound per real foot plant" without step-22 specifics; the prototype job re-runs e2e-foley (recommended). (2) Keep both mechanisms as merged. (3) Move foley to a timer (no).

### AU8 Audio branches never absorbed M21 (desktop only)  (severity: medium)
- Where: `feature/weapon-audio:TESTING.md:8,20,32,34,45` ("desktop and iPhone", "then iPhone", "On the iPhone (`/ct/` preview ...)"); `feature/weapon-audio:docs/systems/testing-tools.md:135` (e2e-music "on phone emulation"); `feature/ct-locomotion:docs/design-bible.md:337` ("Michael picks by ear on his iPhone"), `:340` ("a format iOS Safari plays"); `feature/music:docs/audio/music-progress.md:140,203-204` ("Phone check pending"); `music-direction.md:24-25`, `music-direction-v2.md:55-56,380-383`, `music-spec.md:157-163` (phone first, phone budget, `perf.mjs --phone`); `feature/ct-locomotion:docs/locomotion/OWNER-NOTES.md:110` (M21 relayed to these sessions, "delivery not confirmed").
- What: every audio checklist and several design rules still target the iPhone.
- Options: (1) Strip phone lines from the audio TESTING sections and the bible S7 text in the consolidation; e2e-music drops its phone-emulation pass (recommended). (2) Leave history docs alone, fix only TESTING and the bible. (3) Leave all.

### AU9 Old branch flow and session-local notes in audio docs  (severity: medium)
- Where: `feature/weapon-audio:docs/progress.md:36-38` ("then his merge into `ct-movement`"), `:41-44`; `feature/weapon-audio:TESTING.md:32,45` ("`/ct/` preview after Michael merges"); `feature/music:docs/prompts/music-spec.md:44-47` ("merge `origin/ct-movement` into `feature/music`" each stage; "Never commit to ... `ct-movement`, `dev`"); `feature/music:docs/audio/music-progress.md:729` ("Section 2 rules still apply"); `feature/weapon-audio:docs/systems/testing-tools.md:141,147-148` (E2E_PORT 4183 / 4185 notes for other sessions' servers); `feature/weapon-audio:docs/systems/audio.md:44,81,117` (section titles "(feature/footsteps ...)", "(feature/weapon-audio ...)", "on feature/ct-locomotion").
- What: M26 made ct-movement -> dev -> master dead; the spec a future `feature/music-revision` session would read still orders ct-movement merges and says its Section 2 rules apply.
- Options: (1) Rewrite progress.md / TESTING lines to the master flow, drop branch names from audio.md headings, mark music-spec.md as history (recommended). (2) Only mark music-spec.md as history. (3) Leave.

### AU10 Superseded music direction docs are not all marked, and contain stale world facts  (severity: medium)
- Where: `feature/music:docs/audio/music-direction-v3.md:1-3` (no "superseded" banner, though V4 replaced it: `docs/music/score-design.md:7-11`); `feature/music:docs/audio/music-progress.md:38` (status row "4 Refine the chosen sketch; wire ... not started" although step 4a wired it, `:169-193`); `music-direction.md:404` and `music-direction-v2.md:422` ("Kestrel Exchange (Mission 1)" and its theme, while story 2.0 puts Mission 1 at Cinder Yard); `music-direction-v2.md:456` (`docs/audio/music-sources.md`, which does not exist; the file is `samples.md`); `feature/music:docs/audio/samples.md:1,6` (title "(V3)", "Only the rendered ... stems do (`src/assets/music/sketches/`)", not the V4 game tracks).
- What: four direction generations (v0.1 electronic found-sound, v2 MGS + CT, v3 recorded texture, V4 orchestral) sit side by side; only v0.1 and v2 say they are replaced.
- Options: (1) Move music-direction v0.1 / v2 / v3, score-design.md and music-spec.md to `docs/archive/music/`, keep research.md, samples.md (retitled) and the progress log, and add a current-direction section to audio.md (recommended). (2) Add banners only. (3) Leave as is.

### AU11 testing-tools.md has a truncated music entry and a stale duplicate  (severity: low)
- Where: `feature/weapon-audio:docs/systems/testing-tools.md:142` ("Music V4 test page (music project, manual): `npm run dev`, then open `/music-test.html` (linked from" - the sentence stops), `:153-156` (second entry: "manual, no e2e yet", "two menu sketches, two mission sketches", "the pure synthesis" - describes the step 1-3 synth test page).
- What: a merge leftover; e2e-score now exists and the page holds orchestral pieces.
- Options: (1) One entry: e2e-music (V3 lab, if kept), e2e-score, the `/music-test.html` page as it is now (recommended). (2) Leave.

### AU12 The "spotted" cue is described three ways  (severity: low)
- Where: `feature/music:docs/systems/audio.md:20` ("The spotted hit, then 'Alert, under fire'"); `feature/music:docs/audio/music-progress.md:155-160` (step 4b: the hit "is gone", replaced by a two-beat build); `feature/music:CHANGELOG.md:9,19-20` ("a spotted hit" and "A short build ... leads into Alert"); `feature/music:TESTING.md` "Get spotted: the spotted hit plays at once".
- Options: (1) Call it "the spotted build" everywhere (recommended). (2) Leave.

### AU13 Sample counts and cache sizes differ  (severity: low)
- Where: `feature/music:docs/audio/samples.md:20,24` (578 orchestral files, about 630 MB); `feature/music:docs/systems/audio.md:38` (about 680 MB); `feature/music:docs/audio/music-progress.md:556-557` (325 files, 536 MB at round 6; later rounds added 152 + 44 + 57 = 578).
- Options: (1) Keep 578 and one measured cache size in samples.md only; audio.md links to it (recommended). (2) Leave.

### AU14 Music originality rule lives only in superseded docs, and one lab label names a composer  (severity: low)
- Where: rule: `feature/music:docs/audio/music-direction-v2.md:428-443`, `music-direction-v3.md:87-93` ("Code, comments, lab labels and in-game text never name a game, artist or track"; "never imitate a specific track"). Against: `feature/music:src/audio/score/orch/pieces.ts:400` (test-page text "the Zimmer warmth you liked"); `music-progress.md:427-447` (round 11 written "in the style of" one named track; removed in round 15); the ear-test log stops at V1 (`music-progress.md:744-748`). Bible `feature/ct-locomotion:docs/design-bible.md:32` covers Splinter Cell audio only.
- What: master has no current rule for music originality (no copying a specific track, references by name in docs only, ear test).
- Options: (1) Add a three-line music originality rule to audio.md (or the bible S-section) and drop the composer name from the test page (recommended). (2) Bible pillar text is enough. (3) Leave.

### AU15 Gaps: what master must say about audio that no branch states  (severity: medium)
- Where: `feature/music:docs/prompts/music-spec.md:36,133-143` (briefing, results, per-map colour in scope) vs V4 as built (`feature/music:src/audio/score/game/adapter.ts`, no briefing / results / pause / Confrontation handling); `feature/music:docs/music/score-design.md:263-269` and `docs/music/research.md:188-189` (music dips under guard voices and noise cues: not built); `feature/menu-ui-spec:docs/menu-ui/SPEC.md:248,356` (new briefing and results screens, no music stated); `feature/ct-locomotion:docs/design-bible.md:328` (S6 ambient beds) and `:331-336` (S7 rain, machinery hum, heartbeat, radio crackle: not built in any form); `feature/weapon-audio:docs/systems/audio.md:76,122-123` (not covered: climbing, teammates' and guards' steps; impacts, ricochets, swap, grenade, flybys, guards' reloads, room reverb).
- What: master needs one list of what audio exists, what is planned and what is out, plus a rule for music on the briefing, results and pause screens.
- Options: (1) audio.md gets a "Not built yet" list in priority order (guards' footsteps first, since hearing guards is stealth information; then ambience beds; then the rest), and briefing / results / pause music is assigned to `feature/music-revision` (recommended). (2) Michael orders the list now. (3) Leave to each job.

### AU16 Guards "searching" plays Cautious music, unlike the earlier design  (severity: low)
- Where: `feature/music:src/audio/score/game/adapter.ts` header and `feature/music:docs/systems/audio.md:25-28` (suspicious, investigating, searching -> caution; Evasion only on the way down from Alert); `feature/music:docs/audio/music-direction-v2.md:273-278` (searching -> Evasion); `docs/music/research.md:87-91` (MGS: Evasion is the search phase).
- What: never put to Michael; he approved the Cautious track, not the mapping. See ASSUMED AS1.
- Options: (1) Keep as built (recommended: a hunt without contact stays tense but not combat). (2) Searching plays Evasion.

### AU17 Footsteps the player hears vs footsteps guards hear  (severity: low)
- Where: `feature/ct-locomotion:src/config/movement.ts:232-234` (crouched gears 1-4 and standing gears 1-2 are silent to guards); `feature/ct-locomotion:docs/design-bible.md:84` (P2: the meter and the guards agree), `:1363`; `feature/weapon-audio:docs/systems/audio.md:45-47` (foley is purely cosmetic and plays at every gait).
- What: no rule says whether the player's own step sounds should follow the noise model. Light has a parity rule (bible 5.1); sound has only meter-guard parity.
- Options: (1) Steps always play, very soft when the noise model is silent; the sound meter is the truth (CT-like) (recommended). (2) Steps silent whenever guards cannot hear them. (3) Step loudness follows the noise radius exactly.

### AU18 The abandoned V3 music lab and 8.8 MB of its stems are still in the repo and in the required e2e  (severity: low)
- Where: `feature/music:src/assets/music/sketches/` (9 MP3s, 8.79 MB, `git ls-tree -l`); `?musiclab=1`; `feature/weapon-audio:docs/systems/testing-tools.md:135-137` (e2e-music required); `feature/music:docs/audio/music-progress.md:689` ("The V3 lab and its CC0 stems are untouched", a session decision).
- Options: (1) Delete the V3 lab, its stems and e2e-music in `feature/music-revision` (or the consolidation if Michael agrees) (recommended). (2) Keep for comparison. 

### AU19 Music decisions still waiting for Michael  (severity: medium)
- Where: `feature/music:docs/audio/music-progress.md:35-37` (round 23 Calm / Cautious alternatives "waiting for Michael's picks"; round 25 "waiting for Michael"), `:116-117`, `:202` ("Calm is silent until Michael chooses"); `feature/ct-locomotion:docs/locomotion/CONSOLIDATE.md:13,45` (music merges "as is", "needs revising later", `feature/music-revision`); PLAY-NOTES:27 (music "works well").
- What: master must say the score is in, provisional, and what the revision branch decides.
- Options: (1) Master states: menu theme (extended), Calm silence, Cautious, Alert, Evasion as shipped; open items listed for `feature/music-revision` (recommended). (2) Michael picks Calm / Cautious now.

## Art, characters, operators and weapons (audit F)

Scope: docs/operators (read only), world-and-characters, combat, graphics-quality, bible 5.6, 5.14-5.16.

### AR1 / V8 / LV16 Michael-approved operator rule changes exist only on the branch that is not being merged  (severity: high)
- Found by: AR1 (Art, characters, operators and weapons audit, high); V8 (Vision core audit, high); LV16 (Levels, maps, light and stealth AI audit, medium).

**AR1: Michael-approved operator rule changes exist only on the branch that is not being merged**
- Where: `OPS:docs/operators/DECISIONS.md:82-104` (D7 technique, D8 "Approve as drafted", D10 / D11 real heights);
  `OPS:docs/design-bible.md:5` (version 1.15) and the 1.15 text of 5.14 / 5.15 / 5.16 / Section 6 (diff vs CTM);
  `OPS:CLAUDE.md` hard rule "No external art ... and the CC0 base body of the operator pipeline"; `OPS:docs/story.md:124`;
  `OPS:docs/art-credits.md` (only branch with it). Against: `LOCO:docs/design-bible.md:997` ("Code-built, like every
  character"), `:1000` ("Fairness: identical skeleton ... hit volumes and light sample heights"), `:1204` ("Geometry,
  characters and animation stay code-built"), `:1218-1221`, `:1347`; `LOCO:CLAUDE.md` hard rules; `LOCO:docs/story.md:124`
  ("identical stats and hitboxes"). Same old text on footsteps, weapon-audio, music, training-bunker, CTM, master.
- What: Michael approved (D8, D10, D11) a scripted Blender pipeline on a CC0 base body, an external-art exception and
  per-operator heights with hit volumes and light samples following the body. M26 leaves feature/operators out of the
  consolidation, so master will state the opposite (code-built, identical hitboxes, no external art except CC0 textures)
  and the later operators PR will collide with it. bible 1.15 sits on top of CTM's 1.14, while LOCO's bible is 1.13, so
  the version line also forks.
- Options: (1) Port the approved 1.15 text (5.14 generated operators and size rule, 5.15 fairness note, 5.16, Section 6,
  CLAUDE.md hard rule, story.md line, docs/art-credits.md with the MPFB2 row) into the consolidated master now, dropping
  every phone clause (D29 / M21). (2) Leave master on the old text and let the operators PR change it (master
  contradicts a live Michael decision meanwhile). (3) Re-ask Michael.

**V8: Operators: master's bible and story contradict Michael's 2026-10-15 operator decisions**
- Where: `loco:docs/design-bible.md:997-1000` ("Code-built ... identical skeleton, capsule, speeds, hit volumes and light
  sample heights"), `:1014` ("Built in Phase 5"), `:1204,1219` (characters code-built), `:1347` (no external art);
  `loco:docs/story.md:124` ("identical stats and hitboxes"); against `operators:docs/design-bible.md:5,999-1012,1173`
  (generated offline by a scripted Blender pipeline on a CC0 base body; real heights, Wren about 1.68 m, Moth about 1.78 m;
  skeleton, hit volumes and light samples follow each body; "realism over fairness; the game is mostly co-op"),
  `operators:docs/story.md:124`, `operators:CLAUDE.md:47-49`. `loco:docs/locomotion/DECISIONS.md:224` (M18) already gates
  locomotion step 25 on the Wren model.
- What: operators is not in the PR, so master would state the opposite of decisions Michael already made.
- Options: (1) Write the operator decisions (pipeline, CC0 base body, real sizes, shared capsule / speeds / traversal) into
  master's bible and story now; operators merges later with no conflict (recommended). (2) Leave them for the operators PR.

**LV16: Operator heights change light sampling; the bible still says identical**
- Where: `loco:docs/design-bible.md:1000` (5.14 "identical skeleton, capsule, speeds, hit volumes and light sample
  heights"); `ops:docs/operators/DECISIONS.md` D10-D11 (Michael: light sample heights follow each operator's own body;
  Wren about 1.68 m, Moth about 1.78 m; capsule and moves shared); `ops:docs/operators/SPEC.md:696-706`;
  `loco:docs/design/scale-sheet.md:46` ("Low cover 1.2 m high hides a crouched player", for a 1.75 m body);
  `loco:docs/design-bible.md:284` (L6: the meter samples chest and head).
- What: operators is not merged, but master must not contradict Michael's D10-D11. With per-operator light samples, a
  taller operator's head is lit or exposed above low cover where a shorter one's is not; maps need a rule for it.
- Options: (1) Recommended: master's bible takes D10-D11 (light samples follow the operator's body); the level standard
  sizes low cover and dark pockets for the tallest operator (1.78 m). (2) Keep one shared light sample height for
  fairness and ask the operators run to change D11.

### AR2 / TU11 The current in-game goggle is the banned three-lens look, and the docs describe it as the default  (severity: high)
- Found by: AR2 (Art, characters, operators and weapons audit, high); TU11 (Training bunker, menus, HUD, modes and saves audit, medium).

**AR2: The current in-game goggle is the banned three-lens look, and the docs describe it as the default**
- Where: `LOCO:docs/systems/world-and-characters.md:73-75` (`helmet: 'trilens'`: balaclava + tri-lens, the default look);
  `LOCO:docs/systems/lighting.md:119-120` (goggle glow on "the tri-lens lenses"); `LOCO:docs/locomotion/steps/14-vision.md:33`;
  `LOCO:docs/progress.md:596-599` (a "tri-lens symbol" on the brightness screen); `MENU:docs/menu-ui/FINDINGS.md:9` ("the
  tri-lens glow" in menu shots). Rule: `LOCO:docs/design-bible.md:999` ("Original goggle design: not the series'
  three-lens look"), `OPS:docs/operators/BRIEF.md:34` ("the current `trilens` violates bible 5.14 and is replaced"),
  `OPS:docs/operators/ART-DIRECTION.md:25`.
- What: the shipped default operator, the brightness-calibration symbol and the menu shots use the one design element the
  IP rule names. The replacement only arrives with the operators integration, which has no date (AR4).
- Options: (1) A small follow-up job after the consolidation swaps `trilens` for an original single-shroud goggle on the
  current model and replaces the calibration symbol; docs updated to match. (2) Leave it until the operators integration,
  flagged in master's docs as a known IP violation. (3) Remove the goggle mesh entirely until then (loses the glow, L7).

**TU11: Brightness screen symbol breaks the goggle IP rule**
- Where: `feature/menu-ui-spec:docs/menu-ui/SPEC.md:227` ("The tri-lens symbol on black"). Against
  `feature/ct-locomotion:docs/design-bible.md:999` ("Original goggle design: not the series' three-lens look") and
  CLAUDE.md hard rules (no Splinter Cell logos or UI art). Related: `feature/ct-locomotion:docs/progress.md:596`
  (the shipped goggle glow is "the tri-lens lenses"; operators area).
- What: A three-lens goggle symbol as a calibration icon is the series' signature image.
- Options: (1) Use an original symbol (the game's own goggle shape or a plain grey-step chart) (recommended) (2) Keep
  the tri-lens symbol.

### AR3 Art style is undecided: a voxel world and voxel characters vs realistic smooth operators  (severity: high)
- Where: `LOCO:docs/systems/graphics-quality.md:116-171` (the level renders as 5 cm voxels; every 'detailed' CharacterRig
  becomes a 2 cm VoxelBody; weapons voxelised at 1 cm); `LOCO:docs/systems/world-and-characters.md:62-67` (bodies, gear and
  weapons from smooth primitives only, one instanced material); `OPS:docs/operators/SPEC.md:624` ("Characters with these
  meshes are not voxelised"), `:739-742` ("detailed meshes will stand out from them. Guards stay as today until a later
  decision"); OPS bible 1.15 5.16 ("guards and other characters stay code-built until Michael decides otherwise").
  `LOCO:docs/design-bible.md` never mentions voxels as a look (only `:1398` "gameplay never reads ... voxel layers").
- What: the bible's visual target (5.16) is "surpass Chaos Theory" with no word on voxels; the code renders world,
  guards and weapons as voxels; the operators run builds AAA smooth meshes that must not be voxelised. Nobody has
  decided whether guards and weapons follow the operators' fidelity or whether the mix is the intended look.
- Options: (1) Realism is the target: operators from the pipeline now, guards and weapons later from the same pipeline,
  voxels kept only as the world's rendering method with CC0 detail; write this into 5.16. (2) Operators realistic, guards
  and weapons stay in the current blocky style for good. (3) A stylised voxel look everywhere (operators voxelised in game,
  which D1 / D2 reject).

### AR4 M18 dependency loop: locomotion step 25 waits for Wren in game; Wren waits for locomotion  (severity: high)
- Where: `LOCO:docs/locomotion/DECISIONS.md:224` (M18: Wren "becomes a game asset at its step 10, then a dev switch
  `?operator=wren`"; pause before step 25 if not in game; fallback proxies "for carrier, pack and holster");
  `LOCO:docs/locomotion/PLAN.md:55`, `STATE.md:131`, `PROTOTYPE-PLAN.md:94` (M18 still gates step 25);
  `OPS:docs/operators/BRIEF.md:1,40` and `RULES.md:4` ("Pre-production only: no game integration"), `SPEC.md:331` and
  `steps/18-final-spec.md:18` (integration "after feature/ct-locomotion merges"), `OWNER-NOTES.md` "Locomotion coupling"
  (game asset at step 10, "delivery is not confirmed"), `STATE.md:3` (now at step 11b, step 10 done, no integration);
  `LOCO:docs/locomotion/CONSOLIDATE.md:17,46` (operators gets its own later PR). No feature/operators-runtime branch exists
  although `OPS:docs/operators/CLOUD-RUNTIME-PROMPT.md` plans one.
- What: each run waits for the other. M18 also describes kit Wren no longer has: D22-D24 replaced the plate carrier and
  pack with a one-piece suit, composite plates and belt kit (`OPS:docs/operators/SPEC.md:483-486`), so the named proxy
  fallback has no dimensions to use.
- Options: (1) After the CT prototype is approved, a short Wren integration job (own branch off master, dev switch
  `?operator=wren`, LOD0 only) runs before locomotion step 25; update M18's text to the D22 kit. (2) Step 25 builds
  against proxy volumes taken from the built Wren GLB (back plate, holster, belt pods) and re-checks later. (3) Drop the
  gate: step 25 tunes against today's model, Wren is fitted to the result.

### AR5 Wren carries a drone pod, but the drone is a parked Blacklist gadget  (severity: medium)
- Where: `OPS:docs/operators/DECISIONS.md:225-229` (D25 "Hips, keep game carry"), `:231-238` (D24 list "drone pod"),
  `ART-DIRECTION.md:178`, `SPEC.md:454-455`, `concepts/D28/LAYOUT.md:27,50` (pod placement drives the crawl checks).
  Against: `LOCO:docs/design-bible.md:227` ("Tri-rotor drone | Blacklist | Park"), `:1339` (parked); `LOCO:docs/systems/gadgets.md:2-3`;
  `MENU:docs/menu-ui/SPEC.md:274` ("Parked items (recon drone) are locked").
- What: the operator design (approved in D24 / D25) dedicates a hard pod and layout work to a gadget the game parks.
- Options: (1) Keep the drone parked; the pod becomes another real item Wren uses (spare goggle battery or tool kit),
  shape kept. (2) Unpark the drone as a campaign gadget (bible 4, 5.5, 6 and the menu change). (3) Remove the pod.

### AR6 The kit layout was tested for prone crawling and rope climbing, which the game does not have  (severity: medium)
- Where: `OPS:docs/operators/DECISIONS.md:197-201` (D28 "front flat enough to crawl"), `concepts/D28/LAYOUT.md:7,33-55`
  (poses: prone knee-up crawl, rope climb, deep crouch, rappel seat), `steps/11b-wren-rigid-kit.md:7,49`; D22's brief
  ("climb ropes"). Against: `LOCO:docs/design-bible.md:170` ("Crouch / stand (no prone)"), the traversal verbs
  (`:174-176`: pipes, ladders, ledges, rappel, ziplines; no rope climb); `LOCO:docs/locomotion/PROTOTYPE-PLAN.md:39-42`
  (CT crouch: hips ~0.48 of standing, spine 35-45 deg forward, front knee 60-70 deg) vs LAYOUT's deep crouch (thighs 20
  deg above horizontal, trunk 30 deg).
- What: Michael's rigid-kit picks were made against two poses that do not exist in game and a crouch that M20's CT
  posture changes; the real game poses (CT crouch, crouch-run, rappel, pipe hang, ladder, ledge hang) were not checked.
- Options: (1) No prone and no rope climb (CT); step 11b's pose check uses the game's real poses after the CT prototype.
  (2) Add a prone crawl to the game. (3) Add rope climbing.

### AR7 Operator clearance checks use pre-M20 poses (HUNCH, ready hands, lean-out aim)  (severity: medium)
- Where: `OPS:docs/operators/BRIEF.md:55` (Lab poses from "the existing pose data"), `DECISIONS.md:810-813` (A74 evidence
  in the "sneak pose"), `SPEC.md:729-738` (clipping risks: aim cheek weld, mag pouches vs forearms at full aim);
  `LOCO:docs/systems/world-and-characters.md:96-100` (armed `HUNCH`), `:92-93,107,114-115` (`openLeft`, D9 lean-out);
  `LOCO:docs/locomotion/PROTOTYPE-PLAN.md:39-42` ("Remove the HUNCH carriage"), `:50-57` (aim framing, shoulder swap with the
  rifle on the left shoulder), `:60-61` (lean-out removed); LOCO M20 (`DECISIONS.md:226`).
- What: Wren's pouch, holster and plate clearances were judged on the old posture and aim poses. M20 replaces them
  (upright CT posture, aim locked to camera, shoulder swap to the left side, which puts the rifle butt and left hand on
  Wren's left-side kit). world-and-characters.md still documents the removed HUNCH and lean-out.
- Options: (1) Re-run the operator pose checks on the CT prototype's poses at Wren integration, including the left-shoulder
  aim; update world-and-characters.md when the prototype lands. (2) Accept the current checks.

### AR8 Operator download size vs the bible's 60 MB texture budget; no operator asset budget in performance.md  (severity: medium)
- Where: `OPS:docs/operators/DECISIONS.md:910-917` (A79: Wren GLB with KTX2 hero 55.3 MB, LOD0 18.0, LOD1 4.7, LOD2 2.2;
  VRAM hero 96 MB, LOD0 32 MB), `SPEC.md:644-656` (cost table, "inside the desktop 8 M triangles and 600 draws");
  `LOCO:docs/design-bible.md:1202` ("proposal: 60 MB of compressed textures for the whole campaign"); `LOCO:docs/systems/performance.md:14,20`
  (desktop regression check <= 520 draws and <= 1.7 M triangles; measured 444 / 1.34 M before any operator mesh).
- What: one operator is about 80 MB on disk; four would be about 320 MB, five times the campaign-wide texture proposal.
  The SPEC checks only the 8 M / 600 laptop ceiling, not the 1.7 M regression check, where four LOD0 operators plus their
  shadow passes could exceed the remaining ~0.36 M headroom.
- Options: (1) Set a desktop download budget that includes operators (hero files loaded only for menus and close-ups,
  RDO encode from A79 to shrink them) and add an operator row to performance.md. (2) Keep 60 MB and cut operator detail.
  (3) No size budget (desktop only, offline cache).

### AR9 Goggles: "no flip, stowed on the brow" vs the game's 0.2 s flip, the prototype's instant cut and "always on" glow  (severity: medium)
- Where: `OPS:docs/operators/DECISIONS.md:160-173` (D19: "shouldn't flip up and down ... sit over the forehead, and be over
  the face when in use"), `:268-276` (D20); `OPS:docs/operators/SPEC.md:203-207`. Against: `LOCO:docs/systems/lighting.md:98-100`
  (vision switch "flips the goggles over 0.2 s", a housing band sweeps the view), `:119-120` (glow "always on (brighter in a
  vision mode)"); `LOCO:docs/locomotion/PROTOTYPE-PLAN.md:87` ("Mode switch is an instant cut"); `LOCO:docs/design-bible.md:1001`
  (glow always, to find your operator), `:1063` (Confrontation: "Night vision makes the lens glow").
- What: three different goggle behaviours are documented and none says where the goggles sit (brow or eyes) when vision
  is off, or whether the glow shows when they are on the brow.
- Options: (1) Vision off: goggles on the brow, glowing dimly; vision on: over the eyes, full glow; the view switch is an
  instant cut (CT); the Confrontation rule becomes "brighter in vision". (2) Goggles always over the eyes in missions, the
  brow only in menus. (3) Brow when off with no glow (loses the L7 "find your operator" rule).

### AR10 Medkit and loadout storage on Wren do not match the game's counts or choices  (severity: medium)
- Where: `OPS:docs/operators/ART-DIRECTION.md:166-180` (storage "mapped to the game": medkit 1, rifle magazines 2, pistol
  magazines 2), `SPEC.md:431-432,448,456-457`. Against: `LOCO:docs/systems/combat.md:65` (medkit carry: Rookie 3, others 2),
  `:31-36` (primary can be SMG, pump shotgun or marksman); `LOCO:docs/design-bible.md:504` (kits per mission).
- What: Wren's one-medkit pouch under-shows the game's 2-3, and her rifle-magazine pouches are fixed although the
  campaign primary may be a shotgun or SMG. The "mapped to the game loadout" rule (ART-DIRECTION 9.1) is not met.
- Options: (1) Size the medkit pouch for the game maximum; keep a fixed generic magazine look whatever the loadout. (2)
  Swap pouch variants by the chosen primary. (3) Change the game to one medkit.

### AR11 Weapon draw and put-away timings conflict  (severity: medium)
- Where: `LOCO:docs/design-bible.md:490-493` (draw about 0.3 s pistol / 0.4 s primary, put away about 0.4 s);
  `LOCO:docs/systems/combat.md:12-16` (same, plus SWAP_TIME 0.9); `LOCO:docs/locomotion/DECISIONS.md:160` (A41);
  `LOCO:docs/locomotion/PROTOTYPE-PLAN.md:51-53` (CT footage: raise ~0.6 s pistol / ~0.75 s rifle, lower 0.5-0.6 s, shoulder
  swap 0.40 / 0.42-0.45 s); `LOCO:docs/design-bible.md` 5.12.2 table (weapon raise minimum 0.2 s, swap 0.6 s).
- What: M20 makes CT animation timing the authority, so the bible and combat.md numbers are stale, but nothing in master
  says so yet.
- Options: (1) Adopt the CT footage numbers in bible 5.6 and combat.md (M20). (2) Keep the faster bible numbers for
  gameplay and use the CT ones for the body only.

### AR12 / V19 Loadout preset names: bible "Stealth / Assault / Recommended" vs game "Silent / Flash / Loud"  (severity: medium)
- Found by: AR12 (Art, characters, operators and weapons audit, medium); V19 (Vision core audit, low).

**AR12: Loadout preset names: bible "Stealth / Assault / Recommended" vs game "Silent / Flash / Loud"**
- Where: `LOCO:docs/design-bible.md:504`; `LOCO:docs/locomotion/DECISIONS.md:146` (A33, open: Ghost / Panther / Assault
  renamed Silent / Flash / Loud); `MENU:docs/menu-ui/SPEC.md:270`, `steps/08-loadout.md:12`, `prototype/index.html:445`.
- What: two sets of names; the bible's "Assault" echoes the removed Blacklist style tracker.
- Options: (1) Silent / Flash / Loud everywhere (A33), bible 5.6 updated. (2) Stealth / Assault / Recommended. (3) Another set.

**V19: Loadout names and promised features not built**
- Where: `loco:docs/design-bible.md:504` (briefing kits "Stealth, Assault and Recommended"), DECISIONS A33 (`:146`, the
  default loadout presets renamed Silent / Flash / Loud); bible `:482,497` (marksman "hold breath") versus A61 (not built,
  left for Phase 6).
- Options: (1) Approve A33 for the presets; briefing kits keep Stealth / Assault / Recommended; hold breath stays a later
  item (recommended). (2) One set of names everywhere.

### AR14 Marksman zoom and hold breath: bible promises them, code has zoom only, prototype drops aim zoom  (severity: medium)
- Where: `LOCO:docs/design-bible.md:482` ("marksman rifle (zoom, hold breath)"), `:497`; `LOCO:docs/systems/combat.md:41`;
  `LOCO:docs/locomotion/DECISIONS.md:188` (A61, open: hold breath left for Phase 6); `LOCO:docs/locomotion/PROTOTYPE-PLAN.md:51`
  ("NO FOV zoom (drop today's x0.75)").
- What: unclear whether the prototype's "no FOV zoom" also removes the marksman scope, and hold breath has no phase.
- Options: (1) Ordinary aiming has no zoom (CT); the marksman keeps a scope zoom with sway and limited hold breath, built in
  Phase 6. (2) Marksman zoom without hold breath. (3) No zoom for any gun.

### AR15 Pistol device names: light disruptor, camera jammer, "camera feed" optic  (severity: low)
- Where: `LOCO:docs/design-bible.md:483` (suppressed pistol "carries the light disruptor"), `:223` (light disruptor:
  "Sidearm attachment"), `:226` (camera jammer: a separate Phase 6 gadget); `OPS:docs/operators/ART-DIRECTION.md:53`
  ("its camera jammer is part of the pistol, not a separate gadget"), `:56` (optic modes "night vision, thermal, camera
  feed" vs the game's night / thermal / electro).
- What: the operators' art direction renames and merges two bible devices and a vision mode.
- Options: (1) Bible wins: light disruptor built into the suppressed pistol, camera jammer a separate gadget, optic modes
  night / thermal / electro; fix ART-DIRECTION when the operators branch merges master. (2) Merge both into one pistol device.
- Compiler note: `loco:docs/systems/ct-toolkit.md:2-4` records Michael's approval (2026-10-11) that the camera jammer and light disruptor are one tool, the pistol secondary, so the operators art notes match an approved decision and the bible is the stale side (see V13 / LV5). The question recommends the toolkit.

### AR16 Back carry orientation and the SMG hip sling are open integration items  (severity: medium)
- Where: `OPS:docs/operators/STATE.md:34-35` (open: "upright back carry vs A2's diagonal (A36, A39), a slung SMG over the left
  hip (A41), sidearms anchored at the holster mouth (A62)"); `OPS:docs/operators/concepts/A2/A2.md:12,55` (diagonal,
  muzzle down, needs a game change); `OPS:docs/operators/DECISIONS.md:202-206` (D28 moves the sling socket to 8 o'clock);
  `LOCO:docs/systems/world-and-characters.md:122-126` (long guns upright on the back, compact guns on the left-hip sling);
  `LOCO:docs/design-bible.md:495` ("the primary slung on the back").
- What: the bible says every primary is on the back; the game hangs the SMG at the left hip; the approved A2 concept had a
  diagonal rifle; the built Wren has an upright mount and a hip socket.
- Options: (1) Keep the game as built (long guns upright on the back, SMG on the left-hip sling) and reword bible 5.6.
  (2) Every primary on the back (drop the hip sling). (3) Diagonal back carry as A2 (game change).

### AR17 Only two of the four operators are planned; story looks break the operator art rules  (severity: medium)
- Where: `LOCO:docs/design-bible.md:1004-1012` (four operators: Wren, Moth, Tally, Sexton; "Built in Phase 5" `:1014`);
  `LOCO:docs/story.md:140-153` (Tally "headset over a cap", Sexton "long coat cut short for movement", "flat cap");
  `OPS:docs/operators/BRIEF.md:1` (Wren and Moth only); `ART-DIRECTION.md:39` ("no capes, coats"); D4 (fully covered face).
- What: 2-4 player co-op needs four distinct operators, but no plan builds Tally or Sexton, and their story looks (cap,
  coat) conflict with ART-DIRECTION and D4.
- Options: (1) Four operators; Tally and Sexton follow after Wren and Moth with the same pipeline and rules, story looks
  rewritten to fit (no coat, cap under the hood). (2) Four operators with the story looks kept (exceptions to the art rules).
  (3) Fewer operators (co-op players share designs).

### AR18 Wren's size: story "small", design 1.68 m (79th percentile of women)  (severity: low)
- Where: `LOCO:docs/story.md:128` ("compact"), `:161` (callsign: "Small, quick, hard to spot"); `OPS:docs/operators/SPEC.md:267`
  ("Wren 1.68 m: a tallish woman, the 79th percentile"); D11 (`DECISIONS.md:103`).
- Options: (1) Keep 1.68 m (Michael's D11) and reword the callsign line ("quick, hard to spot"). (2) Make Wren shorter
  (about 1.60 m).

### AR19 Operator gait differences vs pure CT movement  (severity: low)
- Where: `LOCO:docs/design-bible.md:850` ("Operators get small gait differences within the fairness rules"); `OPS:docs/operators/SPEC.md:368-369`
  (Moth "a lean, loose stance (gait differences per 5.12.2.8)"); LOCO M20 (`DECISIONS.md:226`, movement and animation timing
  CT "without exception").
- Options: (1) One CT movement set for every operator; they differ in look and height only. (2) Small stance and gait
  differences inside the CT timings.

### AR20 Base body proportion fixes for every character are proposed but undecided  (severity: medium)
- Where: `OPS:docs/operators/SPEC.md:331-350` (corrections A1, A3-A7 to `proportions.ts` from ANSUR II: shoulder joint 3.5 cm
  lower, hands 2 cm longer, wider pelvis / waist / chest depth, head depth +1 cm, shoulders 3 cm wider, thigh 2.5 cm
  shorter), `:750` (guards move too); `LOCO:docs/systems/world-and-characters.md:49-61` (the current table, shared by guards).
- What: these change hit capsules, aim pocket, grip IK, cover standoff and traversal reach for operators and guards, and
  are scheduled "at integration" with no Michael answer.
- Options: (1) Apply them at the Wren integration to every character, with the listed e2e re-runs. (2) Operators only
  (guards keep today's body). (3) Do not apply.

### AR21 Phone-era text survives in the art, character and weapon docs  (severity: medium)
- Where: `LOCO:docs/design-bible.md:759` (readability "at a glance on a phone"), `:868` (guard postures "readable at 15 m on a
  phone"), `:890` (pose viewer "on phone and desktop"), `:1190`, `:1200`, `:1415-1418` ("one palette, two fidelities",
  "Readability is judged on the phone look first", which also contradicts `:1248` "judged on desktop first");
  `LOCO:docs/systems/graphics-quality.md:7,52,61,69,95` (mobile presets, `--mobile`, phone benchmark); `LOCO:TESTING.md:61`
  ("Phone check: SPOTTER 7.62 MARKSMAN fits"); `LOCO:docs/systems/combat.md:66` ("no touch control"; also "sprint
  cancels", sprint removed by M20); `MENU:docs/menu-ui/SPEC.md:403` ("Phones: S1 and S2 only");
  `OPS:docs/operators/SPEC.md:43,563,606-613,646-649,746`, `DECISIONS.md:91-94` (D9), `BRIEF.md:19,37-38`,
  `steps/18-final-spec.md:16`, the drafted bible 1.15 text (`SPEC.md:670,696`: "phones get the lowest LOD").
- What: M21 / D29 drop phones; these lines still set phone rules for art and readability.
- Options: (1) Delete them in the consolidation (readability judged on desktop at default brightness); strip the phone
  clauses when porting AR1's text. (2) Mark them parked history.

### AR22 Menu spec frames the operator as "low detail"; D21 wants hero close-ups  (severity: low)
- Where: `MENU:docs/menu-ui/SPEC.md:16-17` ("the model is low detail: no face close-ups"), `MENU:docs/menu-ui/FINDINGS.md:25`;
  `OPS:docs/operators/DECISIONS.md:263-266` (D21: "hero version for the main menu and for any close up shots"), D2,
  `SPEC.md:743-744`.
- Options: (1) Note in master's menu spec that close framings open up when the hero operators land (step 18 names the
  cameras). (2) Leave the menu spec as is.

### AR23 No game-wide art direction doc or art-credits file in the merge set  (severity: low)
- Where: `LOCO:docs/design-bible.md:1225-1230` (`docs/art-direction.md`: palette, material list, character detail sheet);
  only `OPS:docs/operators/ART-DIRECTION.md` exists (operators only); `docs/art-credits.md` exists only on OPS though bible
  5.16 requires it (`LOCO:docs/design-bible.md:1203`).
- Options: (1) Create `docs/art-direction.md` in master from ART-DIRECTION Sections 1, 2, 4, 5, 7, 8 (identity, silhouette,
  colour, materials, how they read, avoid list) as the character section, plus an empty `docs/art-credits.md`. (2) Wait for
  the operators PR and Phase 6b.

### AR25 Operators docs are internally stale after D25-D29  (severity: low; branch not merged)
- Where: `OPS:docs/operators/SPEC.md:434-435` (knife on the chest, handle down) and `:448,465` (pistol mags left front,
  sleeves left front thigh) vs D28 (`DECISIONS.md:202-209`: knife outer-front thigh, handle up; mags at 9 o'clock;
  sleeves outer left thigh); `ART-DIRECTION.md:158-160,175,180` same; SPEC phone rows vs D29; `DECISIONS.md:1-25` (A80 sits
  above the file title), D25-D29 newest-first against the "Newest at the bottom" header (`:28`); `OWNER-NOTES.md`
  "Hardware library helper" (HARDWARE-PROMPT not updated); `SPEC.md:65` "square" housing vs D19 "less square" (withdrawn by D20,
  consistent).
- Options: (1) Tell the operators run to refresh SPEC / ART-DIRECTION at step 11b and fix the DECISIONS order when it merges
  master. (2) Leave for step 18's final spec.

### AR26 Weapon docs on the feature branches still describe snap cover poses; combat.md is a stub there  (severity: low)
- Where: `CTM / footsteps / weapon-audio / music / training-bunker:docs/systems/world-and-characters.md` (cover
  enter/exit, `peekOver/blind`, `rig.curl` for low cover, `KNEEL_M`), `docs/systems/combat.md` (11-line stub, no arsenal);
  LOCO versions replace both (`LOCO:docs/systems/world-and-characters.md`, `combat.md:28-60`).
- Options: (1) In the consolidation take LOCO's world-and-characters.md and combat.md whole. (2) Merge by hand.

### AR27 Minimap and sprint references in combat.md  (severity: low)
- Where: `LOCO:docs/systems/combat.md:11` ("minimap redraws at 20 Hz"; minimap parked, bible `:1341`), `:66` ("Aim, jump or
  sprint cancels"; sprint removed by M20).
- Options: (1) Delete both in the consolidation. (2) Mark as parked.

### AR28 Colour-blind check names the wrong pair  (severity: low)
- Where: `LOCO:docs/design-bible.md:1421` ("Check green and violet in Phase 5"); `OPS:docs/operators/BRIEF.md:35,64` (green vs
  amber under deuteranopia / protanopia); four goggle colours green, amber, cyan, violet (`:1004-1012`).
- What: green vs amber is the classic red-green confusion pair; the bible checks the easy pair.
- Options: (1) Check all four colours in pairs, green vs amber first. (2) Keep the bible text.

### AR30 Suppressor, issued kit and weapon names are open locomotion assumptions  (severity: low)
- Where: `LOCO:docs/locomotion/DECISIONS.md:141` (A28 names, ids kept), `:186` (A59 save order, kit starts on the pistol),
  `:187` (A60 suppressor on every firearm but shotguns and crossbow), `:189` (A62 rifle issued suppressed, cannot be bared in
  the campaign); `LOCO:docs/systems/combat.md:28-60`; `LOCO:TESTING.md:58-59`; `feature/weapon-audio:TESTING.md:22-23` (agrees);
  `MENU:docs/menu-ui/FINDINGS.md:42-45` (agrees). All consistent across branches; none approved by an M entry.
- Options: (1) Approve as written (bulk question). (2) Review each.

Merged into entries in other sections:

- AR13 Aim assist rule is "touch-only", and touch is gone (medium): merged into MV26 / V18 / AR13 under Movement, camera, controls, takedowns and gadgets.
- AR24 Two runs both use A1, A2, ... for assumed decisions (low): merged into PL25 / V22 / AR24 under Platform, performance, co-op, testing and process.
- AR29 Old `character-model` branch and the CT character's name in docs (low): merged into MV24 / AR29 under Movement, camera, controls, takedowns and gadgets.

## Platform, performance, co-op, testing and process (audit G)

Scope: performance, graphics-quality, coop, testing-tools, deploy, conventions, session-method, TESTING, CHANGELOG, runners, run RULES files.

### PL1 / V1 / MV3 / TU13 The bible and five branch CLAUDE.md files still make the phone a first-class target  (severity: high)
- Found by: PL1 (Platform, performance, co-op, testing and process audit, high); V1 (Vision core audit, high); MV3 (Movement, camera, controls, takedowns and gadgets audit, medium); TU13 (Training bunker, menus, HUD, modes and saves audit, medium).

**PL1: The bible and five branch CLAUDE.md files still make the phone a first-class target**
- Where: `loco:docs/design-bible.md:110-114` (P7 "Phone and desktop are both first class", "60 fps sustained on a warm
  iPhone 17 Pro Max"), `loco:docs/design-bible.md:1388-1390` (Section 8 Phone target and Phone check hold),
  `loco:docs/design-bible.md:1400-1415` (touch scheme spec), `loco:docs/design-bible.md:1470-1473` (DoD "Phone check",
  "manual phone and desktop checklist"), also bible lines 268, 462, 962 (Phone check gates); same text on
  `train:docs/design-bible.md:110-114`. CLAUDE.md "iPhone 17 Pro Max at 60 fps and desktop": `fs:CLAUDE.md:6`,
  `wa:CLAUDE.md:6`, `mus:CLAUDE.md:6`, `train:CLAUDE.md:10`, `feature/kestrel:CLAUDE.md:8`; DoD phone checks
  `fs:CLAUDE.md:63,66`, `train:CLAUDE.md:66,69`. Against: `loco:CLAUDE.md:12` (M21 desktop only), `ops:CLAUDE.md:8`,
  `train:docs/training/RULES.md:58` (D24 desktop only, inside a branch whose own CLAUDE.md says iPhone 60 fps).
- What: M21 (desktop only, no phone budgets, look, checks or touch work) reached only loco's CLAUDE.md and ops. The bible
  on every branch still sets a phone fps gate, a touch scheme spec and phone sign-off steps (bible 933, 950).
- Options: (1) master bible P7 and Section 8 rewritten as "Desktop only (M21): pad first, then keyboard and mouse;
  phone code parked, removed later with Michael's go-ahead"; every Phone check line in the bible, CLAUDE.md and DoD
  deleted (recommended) (2) keep the phone text marked "history" in place (3) keep bible 1.14 "phone loads on Low".

**V1: Platform: four different statements of what the game runs on**
- Where:
  - `loco:CLAUDE.md:12` desktop only (M21); `operators:CLAUDE.md:10` desktop only (wording differs).
  - `kestrel:CLAUDE.md:8`, `footsteps:CLAUDE.md:6`, `weapon-audio:CLAUDE.md:6`, `music:CLAUDE.md:6`,
    `training-bunker:CLAUDE.md:10` "iPhone 17 Pro Max at 60 fps and desktop".
  - `ct-movement:CLAUDE.md:6` and `ct-movement:docs/design-bible.md:5,110,1306` "desktop first; the phone only has to load
    and play on Low" (bible 1.14, 2026-10-14, superseded by M21 three days later).
  - The bible on every branch still makes phones a platform: `loco:docs/design-bible.md:57-60` (Vision: "The two platforms
    are equal"), `:110-114` (P7 "Phone and desktop are both first class"), `:1388-1390` (Section 8 Phone), `:1400-1411`
    (touch control scheme, e2e-touch), `:1417-1418` ("Readability is judged on the phone look first"), `:1148` (phone
    haptics), `:1159,1175,1502` (Confrontation tuned on phone), `:262-270,309` (L2 / L3 / L5 / L13 phone rules),
    `:461-462`, `:601`, `:648` ("suits phone sessions and phone heat"), `:741` (56 px touch targets), `:759,868,890,933,950,962`
    (animation read on a phone, Michael reviews on his phone), `:1190,1200,1230` (5.16), `:1490,1493,1498` (roadmap
    Phone check gate, "phone feel pass", iPhone playtest), `:1591-1592` (Appendix C phone budgets, touch).
  - Also `loco:CLAUDE.md:29` ("LAN-exposed for phone testing"), `:38` ("phone-look emulation"), `:83` (touch source),
    `loco:README.md:17,25-28,38` (touch controls, "Open on a phone in landscape"), `loco:docs/story.md:39` (radio lines
    sized "on a phone").
- What: M21 (desktop only, pad first, no phones, no touch) reached only two CLAUDE.md files. Every bible still treats
  the iPhone as a target, and three branches say "iPhone at 60 fps".
- Options: (1) Rewrite every platform line to M21: desktop only, controller first then keyboard and mouse; phone look and
  touch code parked (no new work), removal a later clean-up job with Michael's go-ahead (recommended). (2) Same, and delete
  the phone and touch code inside the consolidation. (3) Keep ct-movement's "phone loads on Low" wording.

**MV3: Platform and control-parity text conflicts across branches**
- Where: `feature/ct-locomotion:docs/design-bible.md:57-60, :110-114` (P7 "Phone and desktop are both first class"), `:1388-1411` (phone budgets, touch scheme with speed rocker, comms wheel, gadget wheel with medkit), `:1423` (hold / toggle for sprint); `ct-movement:docs/design-bible.md:110` and `feature/operators:docs/design-bible.md:110` (P7 "Desktop first (Michael, 2026-10-14)", phone loads on Low) but `ct-movement:1317`, `feature/operators:1331`, `feature/training-bunker:1316`, `feature/footsteps:1320`, `feature/weapon-audio:1323`, `master:1212` all still say "Controls (Michael, 2026-10-08): touch and controller are equal on phone"; `docs/ct-movement.md:56-61` (all branches: "Phones are first class", touch rocker).
- What: Three different platform rules exist (phone equal, desktop first with phone on Low, desktop only M21), and five bibles still say touch and controller are equal. M21 (`DECISIONS.md:227`) makes the game desktop only, pad first. (Platform as a whole is another auditor's area; listed here for the controls text.)
- Options: (1) Master states M21 only: desktop, pad first then keyboard and mouse, no touch scheme; touch text moves to history (recommended). (2) Keep "desktop first, phone loads on Low" (1.14). (3) Keep the touch fallback scheme as written.

**TU13: Phone and touch UI text in bible and ui.md, and the bible versions disagree on P7**
- Where: `feature/ct-locomotion:docs/design-bible.md:110-114` (P7 "Phone and desktop are both first class", v1.13)
  against `origin/ct-movement:docs/design-bible.md` P7 "Desktop first (Michael, 2026-10-14)" (v1.14), and
  `feature/training-bunker:docs/design-bible.md` (v1.12, "both first class"); bible 5.10 `:741` (touch targets
  56 px), `:1247` (D1 touch scheme); `feature/ct-locomotion:docs/systems/ui.md:17-26` (forced landscape, touch
  scrolling), `:43` (loadout touch rule), `:44-50` (platform mobile, Touch tab), `:83` (backdrop-filter "expensive on
  phones"), `:93` ("Phone legibility: pending PC run"), `:101-104` (touch rocker, touch basic scheme, layout editor).
- What: M21 makes the game desktop only. Three bible versions carry three different phone rules (equal, desktop first,
  equal), and ui.md documents the phone and touch layer as live.
- Options: (1) Master bible P7 = "Desktop only (M21)"; ui.md moves the phone / touch / landscape sections to a short
  "parked, no new work, removable with Michael's go-ahead" note (recommended) (2) Delete the sections outright now.

### PL2 The one ct-movement commit to carry over is superseded by M21  (severity: medium)
- Where: `ctm:docs/design-bible.md:5,110-114` (version 1.14, P7 "Desktop first", phone loads and plays on Low),
  `ctm:CLAUDE.md:6,60,63` (phone smoke check in DoD), `ctm:TESTING.md` "Phone smoke check (every phase; bible 1.14)",
  `ctm:docs/systems/performance.md:6-8`; `ops` has the same (`ops:docs/systems/performance.md:6-8`).
  `loco:docs/locomotion/CONSOLIDATE.md:27` says "then any ct-movement commits not already present".
- What: following CONSOLIDATE literally would bring in a phone smoke check every phase and a bible version 1.14 that
  M21 overrules. loco's bible is still 1.13, so the version number would also jump for the wrong reason.
- Options: (1) skip 99da75b (log it in the PR body as superseded by M21); bump the bible version once when the
  consolidation rewrites it (recommended) (2) merge it, then edit the phone lines out.

### PL3 The automated tests run as a touch phone by default  (severity: high)
- Where: `loco:scripts/e2e-lib.mjs:83-89` (`launch({ touch = true })` uses the Playwright device "Pixel 7 landscape");
  only 14 scripts pass `touch: false` (anim-audit, e2e-darkness, e2e-desktop, e2e-feedback, e2e-lightbake, e2e-mouse,
  e2e-park, e2e-phonelamps, perf and map helpers); `loco:scripts/smoke.mjs:1` "Headless mobile-emulated smoke test";
  `loco:docs/systems/testing-tools.md:204` "Pixel 7 landscape emulation".
- What: most REQUIRED suites (move, traverse, combat, takedown, coop, netmove, ct, wall ...) boot on the phone
  platform path, which M21 parks. The desktop game the project ships is mostly not what the suites exercise.
- Options: (1) default `launch` to a desktop context (`touch: false`, 1280 x 720 or 1920 x 1080, `platform=desktop`)
  in a dedicated job after the merge, re-baselining what changes (recommended) (2) leave it until the phone code is
  deleted (3) add `platform=desktop` only, keep touch emulation.

### PL4 e2e-touch is still REQUIRED although D1 (as changed by M21) makes it report-only  (severity: medium)
- Where: `loco:scripts/run-e2e.mjs:24` (REQUIRED), `:37` (KNOWN_FLAKY), `:41` (CORE, so every unmapped change runs it),
  `:43-45` (COVERS for core / input / ui); same on every branch's runner. Against: `loco:docs/locomotion/RULES.md:14`
  ("e2e-touch report-only"), `loco:docs/locomotion/OWNER-NOTES.md:109` (follow-up: move e2e-touch to report-only).
  Also `loco:docs/design-bible.md:1401` ("Every verb works on all three and has e2e coverage (e2e-touch ...)").
- What: the documented status and the runner disagree; the bible still demands touch coverage of every verb.
- Options: (1) move e2e-touch to REPORT (and out of CORE / COVERS) in the consolidation, delete it with the phone code
  later (recommended) (2) delete it now (3) keep it required.

### PL5 performance.md and graphics-quality.md still describe phone budgets, the phone look and phone runs  (severity: medium)
- Where: `loco:docs/systems/performance.md:4` (M21 banner starts with a stray "n**"), `:9` (iPhone 17 Pro Max target),
  `:27-52` (3.1 phone budgets, phone GPU, phone outputs), `:53-56` (`--phone` local profile, "phone look" LOCAL_BUDGET
  row); `loco:docs/systems/graphics-quality.md:5-7` ("phone look settings", MOBILE_PRESET_IDS), `:47` (`lowPower` "a
  phone at < 40 Hz"), `:52` (`perf.mjs --preset=<p> [--mobile]`), `:61,69` (phone benchmark runs), `:95` (phones keep 8
  bits); no M21 note anywhere in graphics-quality.md. `loco:docs/systems/testing-tools.md:143,228` (`--phone`),
  `loco:docs/locomotion/RULES.md:64` ("Block ends also run ... `perf.mjs --phone --budget`").
- What: the M21 banner says "ignore" but the body is unchanged, so a reader still meets phone gates; one run rule still
  orders phone budget runs.
- Options: (1) master versions keep only the desktop budget sections; phone sections move to a short "Parked (phone,
  M21)" paragraph naming the code paths; RULES line 64 drops `--phone` (recommended) (2) leave text with banners.

### PL6 Desktop performance numbers disagree, and the target laptop misses them  (severity: medium)
- Where: `loco:docs/systems/performance.md:12-14` (CPU main thread <= 3 ms "inside a 240 Hz frame", <= 600 draws and
  <= 8 M triangles), `:18-21` (desktop perf check: sim p95 <= 2 ms, draws <= 520, triangles <= 1.7 M "as the
  regression check"), `:7-9` (frame-rate targets top out at 165 Hz, not 240 Hz), `:55` (LOCAL_BUDGET Epic: sim 2.9 ms,
  animation 0.075 ms, main 5.5 ms); `loco:docs/systems/testing-tools.md:227-230` ("Epic misses the design targets (sim
  2 ms, animation 0.04 ms, main 3 ms): the profile is a regression check at today's numbers"; measured main 4.1-4.4 ms,
  animation 0.055-0.067 ms). `loco:docs/locomotion/RULES.md:72-73` (secondary desktop never claims budgets; M7, M8).
- What: three different gates exist for the same thing (design target, software-GL regression check, local GPU
  profile), the local profile is looser than the design target by roughly 2x, and nothing says which one blocks a
  merge. The 240 Hz framing also does not match the highest listed frame-rate target.
- Options: (1) design targets stay the goal; the gate for every PR is "no worse than the last laptop baseline"
  (LOCAL_BUDGET), with misses against the design target listed in performance.md as open items (recommended)
  (2) lower the design targets to today's numbers (3) make the design targets hard gates now and fix before new work.

### PL7 Smaller phone leftovers outside the system docs  (severity: low)
- Where: `loco:vite.config.ts` manifest description "Mobile third-person stealth shooter. Plays offline." (diff vs
  master shows the line unchanged); `loco:CLAUDE.md:29` and `loco:package.json:7` (`vite --host`, "LAN-exposed for phone
  testing"); `loco:CLAUDE.md:38` ("phone-look emulation" in GPU testing); `loco:TESTING.md:3` ("Run on your phone ...
  tap with three fingers"); `loco:TESTING.md:492-500` (release checklist: MFi on iOS, touch controls hide / return,
  layout editor); `loco:docs/systems/testing-tools.md:237` (debug overlay "3-finger tap"); `loco:docs/kestrel/RULES.md:145`
  ("Phone controls must still work"); `loco:docs/design-bible.md:648` (mission length "suits phone sessions and phone
  heat"), `:759`, `:868` (readability judged on a phone), `:1412-1413` ("Readability is judged on the phone look first").
- What: each is small, but together they keep the phone in every reader's head.
- Options: (1) fix all in the consolidation doc pass; the manifest text and `dev` comment change with the next code job
  (recommended) (2) only docs now, code strings later.

### PL9 conventions.md "Project overview" describes the old game  (severity: medium)
- Where: `loco:docs/systems/conventions.md:57-68` ("Silent But Deadly ... Third-person over-the-shoulder shooter for PC
  and phones", "the iPhone 17 Pro Max targets 60 fps", "fights from cover, Splinter Cell: Blacklist style"); `:40`
  (game modes wave / mission), `:47` (Embassy, Mansion, Port, Refinery, Dust Depot), `:16-17` (phone resize), `:7`
  (iPhone tab close). Same on every branch (`fs:docs/systems/conventions.md` identical apart from the cover row).
- What: CLAUDE.md sends readers here for "the project overview"; it contradicts CLAUDE.md line 9-13 on name, platform
  and genre.
- Options: (1) replace the overview with three lines pointing to CLAUDE.md and the bible; keep the robustness rules and
  module table (recommended) (2) rewrite the overview in full.

### PL10 / TU22 PROTOCOL_VERSION collides on merge (training 3, locomotion 10)  (severity: high)
- Found by: PL10 (Platform, performance, co-op, testing and process audit, high); TU22 (Training bunker, menus, HUD, modes and saves audit, low).

**PL10: PROTOCOL_VERSION collides on merge (training 3, locomotion 10)**
- Where: `train:src/net/protocol.ts:14` (`PROTOCOL_VERSION = 3`, course mode, larger item caps), `loco:src/net/protocol.ts`
  (10); `loco:docs/systems/coop.md:19` ("3 was Block A of the locomotion run: ex and sh gone ... A2"), so "3" means two
  different wire formats. `train:docs/training/RULES.md:96-97` ("When a later merge brings another bump, take the
  higher value plus one"); `train:docs/training/DECISIONS.md:136` (A45: stays 3 after MAX_ITEMS / MAX_DOORS grew).
- What: a text merge will keep one number and silently drop the other's history; training's own rule says 11.
- Options: (1) set 11 in the consolidation, add one coop.md line "11: course mode + locomotion 10 together" (recommended)
  (2) keep 10 (peers always run one build, so the number is cosmetic).

**TU22: Protocol version**
- Where: code `PROTOCOL_VERSION` 10 on ct-locomotion, 3 on training-bunker; `feature/training-bunker:docs/training/RULES.md:96-97`
  ("take the higher value plus one"), `DECISIONS.md:136` (A45).
- What: Technical: the consolidation should set 11 and log it.
- Options: (1) 11 per the training rule (recommended) (2) Keep 10 (an older peer would not be refused).

### PL11 / V12 / TU1 The bot partner is dropped (M12) but still required in many places  (severity: high)
- Found by: PL11 (Platform, performance, co-op, testing and process audit, high); V12 (Vision core audit, medium); TU1 (Training bunker, menus, HUD, modes and saves audit, high).

**PL11: The bot partner is dropped (M12) but still required in many places**
- Where: `loco:docs/design-bible.md:711-722` (C20 dev bot partner, "Built in Phase 3b"), `:678` (C9 "2 and 4 local
  players"), roadmap rows `:1493` (3b "The dev bot partner (C20) early") and `:1495` (5 "the bot partner extended");
  `loco:docs/locomotion/DECISIONS.md:79` (D8 "the bot partner exercises every team move"), `:105` (D11 "e2e-bot"),
  `:121` (A8), `:132` (A19); `loco:docs/locomotion/OWNER-NOTES.md:69` (standby prompt); `train:docs/training/DECISIONS.md:24`
  (D1 "Solo testing uses the dev bot partner"), `:38` (D15 waits for locomotion step 20), `:58` (D35 "Playing with the
  bot": "Yes, from the debug menu", step T8c). Against: `loco:docs/locomotion/DECISIONS.md:211` (M12: step 20 dropped,
  two-page `?net=local` tests instead; overrides C20 and D8's test line).
- What: M12 was given inside the locomotion run; training's D35 is a separate, later-dated Michael answer for the bunker.
  Master needs one rule.
- Options: (1) no bot partner anywhere: solo testing uses two browser tabs, the two-page e2e suites and training's dev
  solo flag (A6); C20, roadmap rows, D8 test line and training D1 / D15 / D35 marked superseded by M12 (recommended)
  (2) no bot for the campaign, but build the bunker bot (D35) when the bunker job resumes (3) bring the bot back in
  Phase 5.

**V12: The dev bot partner is promised in five places but was dropped**
- Where: `loco:docs/design-bible.md:711-720` (C20), `:1493,1495` (roadmap 3b and 5), `:1310` (D8 "the bot partner
  exercises every team move"); `training-bunker:docs/training/DECISIONS.md:24` (D1 "Solo testing uses the dev bot
  partner (locomotion step 20)"); against DECISIONS M12 (`:211`, skipped; two browser tabs instead) and
  `BIBLE-PROPOSALS.md:16` (move to Phase 5 or drop, undecided).
- Options: (1) Drop it; co-op is tested with two-page `?net=local` suites and two tabs by hand; the Confrontation's AI
  traitor is built for the finale only (recommended). (2) Build it in the co-op phase. (3) Build it with the AI traitor.

**TU1: Training run is blocked by the dropped bot partner**
- Where: `feature/training-bunker:docs/training/steps/TM-merge.md:3-4,16-17`;
  `steps/T8a-e2e-first.md:10,14`; `steps/T8c-course-bot.md:1-30`; `DECISIONS.md:24` (D1 "Solo testing uses the dev
  bot partner (locomotion step 20)"), `DECISIONS.md:58` (D35); `PLAN.md:48,60,102`; `FEATURES.md:13-14,82,87,243,263`;
  `BRIEF.md:18-19`; `RULES.md:61`; `STATE.md:34,71-72`. Against `feature/ct-locomotion:docs/locomotion/DECISIONS.md` M12.
- What: TM (the next real step) STOPS until "locomotion step 20 (the bot partner)" lands, and T8a / T8c / the FEATURES
  "bot" check key rely on it. M12 dropped step 20 for good, so as written the run waits forever. M26 also merges
  ct-locomotion and training-bunker together, so TM's merge happens inside the consolidation anyway.
- Options: (1) Rewrite TM as "post-consolidation re-check" (no wait, no merge; keep task 3a's movement re-check), drop
  T8c and the bot check key, D1 / D35 marked void by M12, T8a uses two pages only (recommended) (2) Keep T8c as a
  course-only scripted partner (new work) (3) Leave as is (run cannot finish).

### PL12 coop.md describes removed and parked features as live  (severity: medium)
- Where: `loco:docs/systems/coop.md:2` (purpose "crossplay and PvP"), `:43-45` (NetMode wave, PvP tdm / ffa, MAX_PLAYERS
  8), `:55` (ping by "touch `ping`"), `:60-68` (PvP fairness and PvP sections), `:19` (MoveState `swat` index 26 and
  `lk` "1 out past the edge": SWAT turn and lean-out aim, both removed by M20), `:20-31` (drawn state rules tied to
  lean-out); `train:docs/systems/coop.md:52` (still "Mark & Execute on clients"), `:32` ("a sprinter whose sender
  stalled"), `:85` (`CLIENT_VERBS` include "sprint"; M20: no sprint). `loco:CLAUDE.md:126` doc index "team moves, PvP".
- What: a co-op reader cannot tell what is campaign co-op today. Wire fields for M20-removed moves still exist.
- Options: (1) master coop.md opens with "campaign co-op only; PvP, Wave and Hunter are parked behind ?legacy=1"; PvP
  sections move to a "Parked" block; swat / lk / sprint marked "removed by M20, retired at the next protocol bump" and
  the CT prototype job removes them from the wire (recommended) (2) delete the PvP text entirely now.

### PL13 Friendly fire in campaign co-op is never stated  (severity: medium)
- Where: `train:docs/training/DECISIONS.md:61` (D38 "Friendly fire on" in the bunker), `:108` (A17: never hurts the
  attacker himself); `train:docs/systems/coop.md:77-79` (course mode only, through the PvP paths);
  `loco:docs/systems/testing-tools.md:90-91` (TDM "no friendly fire"); `loco:docs/design-bible.md:662-722` (5.9 has no
  friendly fire rule); `loco:docs/design-bible.md:1306-1310` (D8 avatar interaction: muzzle discipline A13 drops to
  low-ready when aiming at a team-mate).
- What: the bunker teaches with friendly fire on; the missions have no rule, and muzzle discipline (A13) assumes the
  game stops you shooting a partner.
- Options: (1) campaign missions: friendly fire off; the training bunker keeps it on (D38) as a drill (recommended)
  (2) on everywhere (downed, revivable) (3) a host lobby option, default off.

### PL14 A 4-player co-op check is required but no suite runs one  (severity: medium)
- Where: `loco:docs/design-bible.md:678` (C9 "co-op with 2 and 4 local players"), `loco:docs/locomotion/DECISIONS.md:80`
  (D8 "one ?net=local 4-player run covers back-to-wall stacking, takedowns, the elbow strike and medkits"), `:132` (A19:
  host plus three bot pages, void with M12); `loco:docs/systems/testing-tools.md:87` (e2e-coop: two pages, a third only
  for PvP), `:107` (e2e-netmove: two pages).
- What: with the bot gone, nothing covers 3-4 players although the game is "2-4 player co-op" (CLAUDE.md:11).
- Options: (1) add one automated four-page `?net=local` check (host + three scripted clients, no AI) to e2e-coop in the
  co-op job (recommended) (2) two-player automated tests only; 3-4 players checked by hand on playtest nights.

### PL15 Both co-op suites are "known flaky", so a co-op break never fails a run  (severity: medium)
- Where: `loco:scripts/run-e2e.mjs:37` (KNOWN_FLAKY includes e2e-coop and e2e-netmove); `loco:docs/backlog.md:32-35`
  (causes: guard mix, frame timing under load); `loco:CLAUDE.md:39` (known-flaky failures do not fail the run).
- What: D8 parity is a Michael decision, but its two gates are permanently non-blocking.
- Options: (1) a short job fixes the two flakes (deterministic guard mix, longer waits under load) and takes them off
  KNOWN_FLAKY (recommended) (2) keep them flaky, rerun failures twice before accepting (3) leave as is.

### PL16 Partner collision exists only on training; the rule is Michael's but not in master docs  (severity: low)
- Where: `train:docs/systems/coop.md:22-36` (PartnerBlocker, every co-op mode), `train:docs/training/DECISIONS.md:72`
  (D49 "yes partners should block eachother"), `:140` (A49: in every co-op mode); `loco:docs/design-bible.md:1306`
  (D8 "players never interpenetrate (capsule separation)", planned for locomotion step 30, not built: run paused at 22).
- What: the merge brings training's implementation; the locomotion plan may later build a second one.
- Options: (1) record D49 + D8 as one master rule, mark locomotion step 30's separation item as "done by the bunker's
  PartnerBlocker, extend only" (recommended) (2) leave both plans.

### PL17 The required co-op suite walks parked modes  (severity: low)
- Where: `loco:docs/systems/testing-tools.md:87-92` (lobby, wave match, TDM, FFA), `:252` ("e2e-coop opens its pages
  with legacy=1 (its lobby walk-through hosts Wave / Hunter / TDM / FFA rooms)").
- What: REQUIRED should cover the shipped game; parked modes belong in `e2e:legacy`.
- Options: (1) split e2e-coop: campaign co-op (Infiltration / Free Roam / course) stays required, the Wave / TDM / FFA
  walk moves to LEGACY (recommended) (2) keep as is.

### PL18 / V2 The old branch flow is written as a rule everywhere  (severity: high)
- Found by: PL18 (Platform, performance, co-op, testing and process audit, high); V2 (Vision core audit, high).

**PL18: The old branch flow is written as a rule everywhere**
- Where: `loco:CLAUDE.md:36` (full e2e "before every merge to dev / master"), `:43-48` (Branches: ct-movement working
  branch, ct-movement -> dev -> master, map branches off ct-movement), `:77` (DoD "Commit and push ct-movement"),
  `:114` (deploy doc row); same on every branch (`train:CLAUDE.md:38-39,71`, `fs:CLAUDE.md:35-36,68`, `ops:CLAUDE.md:39-40,74`);
  `loco:docs/systems/deploy.md:6-16` (flow, release = ct-movement -> dev -> master); `fs:docs/systems/deploy.md:6-10`
  (an even older "work goes to dev"); `loco:docs/design-bible.md:1451-1455` (Branches), `:1476`, `:1545` (Appendix A
  "Branch ct-movement"); `loco:docs/kestrel/RULES.md:20,66,130`; `loco:docs/kestrel/PLANNER.md:19`
  ("git checkout feature/kestrel"); `ops:docs/operators/RULES.md:3,21,109`; `loco:docs/locomotion/OWNER-NOTES.md:88-92`
  (2026-10-13 merge plan: kestrel to master first). Against: M26 (`loco:docs/locomotion/CONSOLIDATE.md:3-4,40-46`).
- What: every reader is told to work on ct-movement and merge through dev, which M26 ends.
- Options: (1) master rule: "master is the only base. One branch per job, cut from master, in its own worktree; the
  job's PR goes to master; Claude never merges, Michael does. ct-movement and dev are retired" (recommended)
  (2) keep a dev branch as a shared staging step before master.

**V2: Branch flow, preview slots and branch-specific start lines are stale**
- Where: `loco:CLAUDE.md:43-48` ("ct-movement is the working branch ... ct-movement, then dev, then master"), `:36`
  ("before every merge to dev / master"), `:77` ("Commit and push ct-movement"); `loco:docs/design-bible.md:1451-1455`
  (Branches), `:1476` (DoD "Commit and push ct-movement"), `:1545` (Appendix A "Branch ct-movement"), `:156` (verb status
  "exists on ct-movement / dev"); `loco:README.md:60-71` (flow and the `/preview/`, `/ct/`, `/kestrel/` slots);
  `loco:docs/progress.md:23-24` ("ct-movement is at 3.5.1 ... dev and master get 3.5.1 when Michael merges").
  Branch-only start lines: `loco:CLAUDE.md:5` (ct-locomotion), `:7` (kestrel), `training-bunker:CLAUDE.md:1`,
  `operators:CLAUDE.md:3`, `training-bunker:CLAUDE.md:13` (Fallow map note).
- What: M26 ended the ct-movement -> dev -> master flow: master is the base, one branch per job. Master's docs must not
  carry another branch's start line. Which GitHub Pages preview slots survive is not stated anywhere.
- Options: (1) Master states: master is live and the only base; one feature branch per job off master; Claude never
  merges into master; job start lines live in each job's BRIEF / OWNER-NOTES, not CLAUDE.md; one preview slot for the
  job under test (recommended). (2) Keep per-job lines in CLAUDE.md while those jobs run. (3) Keep `/ct/` and `/kestrel/`
  slots as they are.

### PL19 Pages preview slots belong to branches that M26 deletes  (severity: medium)
- Where: `loco:.github/workflows/deploy.yml:3-6` and `preview.yml:3-8` (slots /preview/ = dev, /ct/ = ct-movement,
  /kestrel/ = feature/kestrel), `loco:vite.config.ts` denylist (`/preview/`, `/ct/`, `/kestrel/`),
  `loco:docs/systems/deploy.md:8-16` (IndexedDB `shoulder-strike-preview`, `-ct`, `-kestrel`); master's deploy.yml has
  /preview/ and /ct/ only. `loco:docs/locomotion/CONSOLIDATE.md:41-43` deletes dev, ct-movement and feature/kestrel.
- What: after the deletions the slots silently stop building (the workflow skips missing branches) and nothing says how
  Michael gets a playable build of a job branch.
- Options: (1) keep the live game plus one `/preview/` slot that builds a branch named in one workflow variable,
  pointed at the current job by Michael; drop /ct/ and /kestrel/ (recommended) (2) one slot per active job branch,
  added and removed per job (3) live game only; jobs are played locally.

### PL20 / V11 Three different ways to run a job, with conflicting models and effort  (severity: high)
- Found by: PL20 (Platform, performance, co-op, testing and process audit, high); V11 (Vision core audit, medium).

**PL20: Three different ways to run a job, with conflicting models and effort**
- Where: bible loop `loco:docs/design-bible.md:1429-1449` (Opus writes phase specs, Sonnet implements, Appendix A / B)
  and `loco:CLAUDE.md:16-21` ("Every session": progress.md and the phase spec `docs/prompts/phase-N`); orchestrator
  method `loco:docs/systems/session-method.md:7-23` (Opus High orchestrator, subagents, fresh checker, 3 fix rounds),
  `loco:CLAUDE.md:23-26`, `loco:docs/locomotion/RULES.md:44` (M1: every subagent Opus), `train:docs/training/RULES.md:37-42`,
  `ops:docs/operators/RULES.md:42-66`; kestrel planner / stage method `loco:docs/kestrel/RULES.md:63-107` ("no sub-agents,
  no background tasks", "Effort: ... medium, or low ... Never high", Sonnet for data files, Haiku for closed edits),
  `loco:docs/kestrel/PLANNER.md:16,34` ("Never set high effort"); menu `menu:docs/menu-ui/RUNBOOK.md:5-8` (Opus for all,
  Sonnet for mechanical side jobs).
- What: Michael chose the orchestrator method on 2026-10-16 as the preferred way, but the bible and kestrel rules still
  prescribe opposite models, effort and no-subagent rules.
- Options: (1) master: the orchestrator method for every multi-step job; the bible's phase-spec loop and kestrel's
  planner / stage / reviewer method become history (kestrel's useful habits, such as feasibility sums and "no number
  without a source", move into level-design.md) (recommended) (2) orchestrator for code jobs, kestrel's planner method
  kept for map design jobs (3) each job picks and documents its method.

**V11: How work is run: the bible's process section is from before the orchestrator method and M22**
- Where: `loco:docs/design-bible.md:1429-1449` (Opus writes specs, Sonnet implements, three-step loop), `:948-950`
  (Sonnet implements batches, Michael signs off per batch on his phone; replaced by D6), `:1534-1582` (Appendix A
  template on ct-movement, Appendix B "Sonnet writes these"); against `loco:CLAUDE.md:23-26` and
  `loco:docs/systems/session-method.md:1-44` (orchestrator, Opus checker, up to 3 fix rounds, unattended by default),
  DECISIONS M1 (all subagents Opus), M22 (`:228`, a fast playable prototype with light checks first; supersedes the
  implement-check-fix loop for the prototype phase). Authority order: `loco:CLAUDE.md:21` and bible `:11-18` (Michael >
  bible > phase spec > ...) versus `loco:docs/locomotion/DECISIONS.md:3` ("this file > bible") and CONSOLIDATE step 4 (a new
  master docs/DECISIONS.md). `kestrel`, `training-bunker` CLAUDE.md drop the "How sessions are run" section.
- What: three descriptions of how a job runs and two authority orders.
- Options: (1) Bible 9 points to session-method.md; adds "prototype first for any new feel or look system, then the
  orchestrator loop for tuning and finishing"; authority = Michael > docs/DECISIONS.md > bible > job docs > code, and
  every decision is also written into the bible (recommended). (2) Orchestrator loop for everything, M22 only for the CT
  prototype. (3) Keep the bible's Opus / Sonnet loop.

### PL21 / V10 Version numbers disagree and collide  (severity: high)
- Found by: PL21 (Platform, performance, co-op, testing and process audit, high); V10 (Vision core audit, medium).

**PL21: Version numbers disagree and collide**
- Where: `loco:package.json:4` 3.5.1 (also train, kestrel), `fs/wa/mus:package.json:4` 3.5.0, `master:package.json:4`
  3.4.0; the game's label comes from package.json (`loco:vite.config.ts:15` `__APP_VERSION__`). CHANGELOG heads:
  `loco:CHANGELOG.md:3` "Locomotion run (Phase 3 + 3b, in progress)" with no number, `:31` "3.6.x - First Playable (in
  progress)"; `train:CHANGELOG.md:3,35,62` 3.9.0 / 3.8.0 / 3.7.0; `fs:CHANGELOG.md:3`, `wa:CHANGELOG.md:3`
  "Unreleased"; `mus:CHANGELOG.md:3` "Music V4 (not yet released)". `loco:docs/locomotion/DECISIONS.md:131` (A18: Phase 3 =
  3.7.0, 3b = 3.8.0). `loco:docs/design-bible.md:1478-1483` (one minor per phase). `loco:docs/locomotion/CONSOLIDATE.md:36`
  ("one minor bump above the highest version in any merged branch").
- What: training took 3.7.0-3.9.0 while locomotion planned 3.7.0 / 3.8.0 for itself; the shipped label (3.5.1) matches
  no CHANGELOG heading; "highest version" is 3.5.1 by package.json or 3.9.0 by CHANGELOG.
- Options: see Q-process-4 and Q-process-5.

**V10: Version numbers collide**
- Where: `loco:docs/design-bible.md:1480` (one minor version per phase); `loco:docs/progress.md:12-19,122` (Phase 2 =
  3.7.0 ... Phase 7 = 3.14.0, 3b its own version); `loco:docs/locomotion/DECISIONS.md:131` (A18: Phase 3 = 3.7.0, 3b = 3.8.0);
  `training-bunker:CHANGELOG.md` headings 3.7.0, 3.8.0, 3.9.0 for its Blocks A-C; `package.json` 3.5.1 on loco / kestrel /
  training-bunker / ct-movement / operators, 3.5.0 on footsteps / weapon-audio / music; CONSOLIDATE.md:36 (one bump above
  the highest, so 3.10.0, which progress.md reserved for Phase 4). Bible document versions also collide: 1.13 (loco),
  1.14 (ct-movement), 1.15 (operators), each written separately.
- What: three numbering schemes claim the same version numbers.
- Options: (1) Drop "one minor per phase": the consolidation is 3.10.0, then one minor version per merged job PR, patch
  for fixes; the bible becomes 2.0 at the rewrite (recommended). (2) Keep per-phase numbering and renumber the training
  headings. (3) Jump to 4.0.0 for the merge.

### PL22 No port registry; two jobs use 4191  (severity: medium)
- Where: `loco:docs/locomotion/RULES.md:63,76-96` (4189 GPU, 4191 software-GL e2e; "other sessions use 4173 / 4179");
  `ops:docs/operators/RULES.md:18,77-81` (operators uses 4191); `loco:docs/locomotion/CONSOLIDATE.md:25,34` (consolidation
  uses 4191); `menu:docs/menu-ui/RULES.md:15-16` (4195-4199, never 4189 / 4191); `loco:scripts/run-e2e.mjs:14` (default
  4179); `loco:scripts/e2e-lib.mjs:83` and `loco:docs/systems/testing-tools.md:166` (default 4173); `loco:docs/systems/
  testing-tools.md:261` (kestrel render-top on 4179); `wa:docs/systems/testing-tools.md` e2e-score "E2E_PORT=4183",
  e2e-weapon-audio "E2E_PORT=4185"; `wa:docs/audio/music-progress.md:68,92` (4183, 4184), `:243` (5180);
  `loco:package.json:8` (editor 5199).
- What: ports were picked ad hoc as collisions happened; operators and the consolidation both claim 4191 on the same PC.
- Options: (1) master testing-tools.md gets a port table: defaults never used by jobs; each job gets a fixed pair at
  start, written in its RULES (for example consolidation and the next jobs 4201-4202, 4203-4204 ...; operators keeps
  4191 until it rebases) (recommended) (2) every job uses `E2E_PORT=0` style free-port picking in the scripts.

### PL23 The default number of parallel e2e suites is stated four ways  (severity: low)
- Where: `loco:scripts/run-e2e.mjs:5,122` (default min(5, cores / 3)); `loco:docs/systems/testing-tools.md:12` ("default
  4 at a time"); `loco:CLAUDE.md:35` ("4 at a time"); `loco:docs/locomotion/RULES.md:55` (cloud 2), `:88` (M10: 3), `:96`
  (M11: 2 "default on this 8-thread desktop"); `train:docs/training/RULES.md:71` (`E2E_JOBS=4` on this PC);
  `loco:docs/locomotion/CONSOLIDATE.md:34` (2). Audio branches' runner has no pool at all.
- What: technical, but docs and code should say the same.
- Options: (1) docs say "default min(5, cores / 3); set E2E_JOBS=2 on the 8-thread desktop and cloud VMs" (recommended)
  (2) hard-code 2.

### PL24 Worktree folders have no convention and the main folder belongs to training  (severity: medium)
- Where: `loco:docs/locomotion/OWNER-NOTES.md:16` (C:\NightShift\Mobile-Coop = feature/training-bunker, Mobile-Coop-kestrel,
  Mobile-Coop-music), `:106` (Mobile-Coop-playtest), `:119` (Mobile-Coop-integrate); `ops:docs/operators/RULES.md:3`
  (Mobile-Coop-operators); `menu:docs/menu-ui/RULES.md:15` (Mobile-Coop-menu-ui) but `menu:docs/menu-ui/RUNBOOK.md:26`
  ("New session in C:\NightShift\Mobile-Coop", the training folder that loco rules forbid touching).
- What: after M26 there is no stated home for master, and job folders are named case by case.
- Options: (1) C:\NightShift\Mobile-Coop stays on master (read and branch from it, never work in it); every job is
  C:\NightShift\Mobile-Coop-<job> on branch feature/<job>; the job's RULES name both (recommended) (2) one folder per
  job with no master folder.

### PL25 / V22 / AR24 Decisions are kept in five formats and the A-numbers collide  (severity: medium)
- Found by: PL25 (Platform, performance, co-op, testing and process audit, medium); V22 (Vision core audit, medium); AR24 (Art, characters, operators and weapons audit, low).

**PL25: Decisions are kept in five formats and the A-numbers collide**
- Where: `loco:docs/locomotion/DECISIONS.md` (D1-D11, A0-A89, M1-M27); `train:docs/training/DECISIONS.md` (D1-D50,
  A1-A64, for example A49 in both files means different things); kestrel "Decisions by Michael" in
  `docs/kestrel/progress.md` (`loco:docs/kestrel/RULES.md:22`, `loco:docs/kestrel/PLANNER.md:26`); `menu` MD1-MD20
  (`menu:docs/menu-ui/RULES.md:12`); ops D / A / S numbers; audio decisions only in progress logs and CLAUDE.md
  (`mus:CLAUDE.md:43`, `wa:CLAUDE.md:43`). M27 plans `docs/DECISIONS.md` (`loco:docs/locomotion/CONSOLIDATE.md:53`).
- What: "A49" or "D8" is ambiguous on master once all files sit side by side.
- Options: (1) master docs/DECISIONS.md uses job prefixes for old entries (LOCO-D8, TRAIN-A49, KES-..., MENU-MD3) and new
  numbers V1, V2 ... for the M27 answers; each job logs assumptions as <JOB>-A<n> and its PR moves Michael's answers into
  docs/DECISIONS.md (recommended) (2) keep per-run files only.

**V22: Gap: master has no single list of Michael's decisions**
- Where: decisions live in `loco:docs/locomotion/DECISIONS.md` (D1-D11, M1-M27, A0-A89), `docs/training/DECISIONS.md`,
  `docs/kestrel/handover.md` and RULES, the operators docs, the audio progress logs, bible Sections 5.17 and 11, and
  `docs/progress.md:39-45`. CONSOLIDATE step 4 plans `docs/DECISIONS.md`; it does not exist yet on any branch.
- Options: (1) Create docs/DECISIONS.md at the consolidation with this audit's answers, quoting Michael; run files stay
  as history and link to it (recommended, already planned). (2) Keep per-run decision files only.

**AR24: Two runs both use A1, A2, ... for assumed decisions**
- Where: `OPS:docs/operators/DECISIONS.md:280-281` (A1-A80, plus SPEC 4.3's own A1-A7 series); `LOCO:docs/locomotion/DECISIONS.md`
  (A0-A89). Example: OPS A62 (empty holster) vs LOCO A62 (rifle issued suppressed); OPS A59 (metal finish) vs LOCO A59
  (loadout order); STATE.md cites "(A62)" ambiguously.
- Options: (1) Master's docs/DECISIONS.md cites them with a run prefix (OPS-A62, LOCO-A62, OPS-P1..P7 for the proportion
  series). (2) Leave as is.

### PL26 Merging the e2e runner needs care; required suites include retired maps  (severity: medium)
- Where: `fs/wa/mus:scripts/run-e2e.mjs:1-37` (old serial runner: no REPORT, KNOWN_FLAKY, CORE, COVERS, pool) with
  REQUIRED adding e2e-music, e2e-score, e2e-foley, e2e-weapon-audio (`wa:scripts/run-e2e.mjs:20`) and still e2e-cover;
  `train:scripts/run-e2e.mjs:24` (adds e2e-course, e2e-bunker, keeps e2e-cover); `loco:scripts/run-e2e.mjs:24` (has
  e2e-wall, no e2e-cover; REQUIRED still lists e2e-fp-map, e2e-fp-trunk, e2e-dead-line, e2e-dead-line-menu,
  e2e-dead-line-v2, e2e-dead-line-v2-menu for maps archived per `loco:CLAUDE.md:111` and "do not open" per
  `loco:docs/kestrel/RULES.md:43-45`). CONSOLIDATE rule: union of suites, e2e-cover stays removed
  (`loco:docs/locomotion/CONSOLIDATE.md:30-31`).
- What: a plain union would leave the six audio / course suites out of COVERS (so `e2e:quick` never runs them) and
  keeps retired-map suites as merge gates.
- Options: (1) take loco's pool runner, add the six suites to REQUIRED and to COVERS (`src/audio/` -> music, score,
  foley, weapon-audio; `src/game/course/`, `src/world/maps/bunker` -> course, bunker); retired-map suites move to LEGACY
  (recommended) (2) union only, fix COVERS later.

### PL27 TESTING.md is a per-step history full of overturned items  (severity: medium)
- Where: `loco:TESTING.md:3` (phone intro), `:10` ("sprint (L3) about 4 m/s"; M20 no sprint, M25 run 4.2 m/s), `:25-26`
  (lean-out), `:101-109` (step 12: lean-out, SWAT, corner takedown), `:16-18,35-39,49-81` (Phone checks),
  `:149` (iPhone at /ct/), `:194` (Team Deathmatch), `:479-527` (release checklist: Wave match, cover / cover-to-cover
  bindings, "L3 sprint", touch, four phones in co-op, eight in TDM). DoD wants "a short manual desktop checklist"
  (`loco:CLAUDE.md:75`). Every branch adds its own top section (train 3.7.0, audio "PC then iPhone").
- What: a tester cannot tell which items still describe the game.
- Options: (1) master TESTING.md = one current desktop checklist (pad, keyboard and mouse, two-tab co-op) plus the
  release checklist rewritten; per-step lists move to docs/archive/TESTING-3.5-3.9.md (recommended) (2) keep appending
  and mark stale items.

### PL28 testing-tools.md suite descriptions predate M20 and M21  (severity: low)
- Where: `loco:docs/systems/testing-tools.md:16-19` (e2e-touch incl. speed rocker pips), `:25` (e2e-move "sprint
  toggle, aim ends a sprint"), `:41` (e2e-anim "720 deg/s turns"; M20 ~440 deg/s), `:42-43` ("sprint FOV"), `:87-92`
  (PvP), `:204` (Pixel 7), `:237` (3-finger tap); the footsteps-family copy lost the pool runner text
  (`fs:docs/systems/testing-tools.md:11-14`).
- What: the suites themselves will change in the CT prototype job; the doc should say which checks are pending rework.
- Options: (1) one line under each affected suite: "checks X change with the CT prototype (M20)"; take loco's runner
  text on merge (recommended) (2) rewrite when the suites change.

### PL29 Locomotion run documents carry superseded plans  (severity: low)
- Where: `loco:docs/locomotion/OWNER-NOTES.md:83,88-92` (2026-10-13 merge plan), `:86,100` (copy it into progress.md at
  step 34), `:32-86` (standby prompt with the bot partner and `--phone --budget`), `loco:docs/locomotion/RULES.md:64,67`
  (phone budget, step 20 order).
- What: history is fine, but a resume reads these as live instructions.
- Options: (1) add "Superseded by M26 / M12 / M21" notes at each block; nothing else changes (recommended) (2) move the
  prompts to an archive file.

### PL30 Gap: master CLAUDE.md does not say how a job starts and runs  (severity: high)
- Where: `loco:CLAUDE.md:5-7` (branch-specific lines for loco and kestrel only), `:16-21` ("Every session" reads
  progress.md and a phase spec, which no current job uses; `loco:CLAUDE.md:109` "Phase specs (phase 0-1)"), `:23-26`
  (method in one paragraph); the needed facts sit in run files: worktree and branch guard
  (`loco:docs/locomotion/RULES.md:61-62`), ports (`:76-84`), GPU rules (`:60-74`), unattended rule
  (`loco:docs/systems/session-method.md:39-44`), run docs (`:25-29`), PR and Michael merges
  (`loco:docs/locomotion/CONSOLIDATE.md:37-38`).
- What: once runs end, master's CLAUDE.md is the only always-read file; today it would send a new job to ct-movement
  and phase specs.
- Options: (1) master CLAUDE.md "Running a job" section, about 12 lines: start from master in
  C:\NightShift\Mobile-Coop-<job> on feature/<job>; branch guard before every write; the job's docs in
  docs/<job>/ (BRIEF, RULES, PLAN, STATE, LOG, OWNER-NOTES, assumptions logged as <JOB>-A<n>); orchestrator method;
  port pair from the port table; desktop only; GPU checks only on Michael's PC (laptop for budgets); `e2e:quick` per
  step, full `e2e` before the PR; one PR to master, Michael merges; answers move to docs/DECISIONS.md; "Every session"
  reads CLAUDE.md, the job's RULES and STATE, and the bible sections the job names (recommended) (2) keep CLAUDE.md
  short and put all of this in session-method.md.

### PL31 Audio runs have no RULES or STATE file  (severity: low)
- Where: `fs/wa/mus` have only `docs/audio/music-progress.md` and `docs/audio/weapon-audio-progress.md` (no RULES,
  STATE, OWNER-NOTES); `mus:docs/audio/music-progress.md:93,157` ("Phone check pending Michael's run").
- What: the music revision job (CONSOLIDATE "feature/music-revision") has no resume point in git.
- Options: (1) the music-revision job starts with the standard run docs; the phone-check notes are closed as void
  (M21) (recommended) (2) keep the progress log as the only record.

Merged into entries in other sections:

- PL8 The "no external audio" hard rule differs on every branch (high): merged into AU1 / V6 / PL8 under Audio and music.

## ASSUMED decisions

Every row from every audit, grouped by the run that made the assumption. "Other audits" shows where a second audit rated the same row; where they differ, docs/DECISIONS.md records Michael's answer. Recommended answers and findings cite the audits' own question IDs (Q-<area>-<n>); docs/consolidation/QUESTIONS.md lists those IDs under "Sources" for each merged question.

### Locomotion run (A0-A89, docs/locomotion/DECISIONS.md) - 90 rows: open 21, approved 7, implied 1, void 22, technical 39

| ID | Plain-English one line | Status | Recommended answer | Other audits |
| --- | --- | --- | --- | --- |
| A0 | The run's audit lives in docs/locomotion/AUDIT.md, not docs/animation-audit.md | technical | Approve | A: technical; rec. Approve; bible points to it // G: technical; rec. Keep |
| A1 | The automatic doorway / corner lean is removed with snap cover | implied M14 N4, M20 Q1 | Confirm in bulk | - |
| A2 | Network slot "cover" renamed "wall", protocol 2 -> 3 | technical | Approve | G: technical (superseded by later bumps; see PL10); rec. Keep as history |
| A3 | Control options saved in Settings, not the save file | technical | Approve | G: technical; rec. Keep |
| A4 | "Every team move" means the four that exist; the rest are Phase 5 | open (other area: co-op) | Approve | - |
| A5 | One shared host-approval message for strike, drag, medkit, takedowns | technical | Approve | G: technical (matches bible C11); rec. Keep |
| A6 | Keep the old flat-back cover pose renamed as the back-to-wall base | technical | Approve (fits M25 flat back standing) | - |
| A7 | Which gears use which no-bob limit | void M20 Q8 / M22 | Strike; re-cut after the prototype | - |
| A8 | Bot partner as a second page | void M12 | Strike | A: void M12; rec. Remove // G: void M12; rec. Mark void |
| A9 | Cap side-to-side hip sway on every gait | technical | Approve | - |
| A10 | Remove the heel-strike hip kick | technical | Approve | - |
| A11 | Head look-at order: aim, recent noise, team-mate, travel | open | Approve | - |
| A12 | Landing camera dip sizes; auto shoulder swap when one side is blocked | void M20 (camera from footage, Q11) | Strike | - |
| A13 | Aiming across a team-mate lowers the gun and holds fire | open (other area: co-op / weapons) | Approve | - |
| A14 | Quick 180, throw and airborne get their own network modes | technical | Approve (quick 180 may go, Q-move-10) | G: technical; rec. Keep |
| A15 | Ladder sprint 3.3 rungs/s | void M20 Q8 | Strike; see Q-move-4 | - |
| A16 | Guard postures worked out on each client | technical | Approve | C: technical; rec. Keep // G: technical; rec. Keep |
| A17 | Players turn shoulders to pass within 0.9 m | technical | Approve | - |
| A18 | Version numbering for Phase 3 / 3b | void M26 | Strike (consolidation sets the version) | A: open, collides (V10); rec. Replace with Q-process-3 // G: open (collides with training 3.7-3.9, PL21); rec. Replace by Q-process-4 / 5 |
| A19 | 4-player check = one host plus three bot pages | void M12 | Strike | G: void M12; rec. Replace by Q-coop-3 |
| A20 | Drawn / holstered state sent on every move update | technical | Approve | G: technical; rec. Keep |
| A21 | Strike plays at once on a client, host decides the hit | technical | Approve (applies to the palm strike) | G: technical; rec. Keep |
| A22 | Takedowns keep their old message until step 27 | technical | Approve | G: technical; rec. Keep |
| A23 | Back-to-wall: gear 4 cap, stick entry, 0.9 m reach, stacking 0.62 m | void M14 / M25 (entry, speed); stacking technical | Strike all but stacking | - |
| A24 | SWAT turn owned by the client | void M20 Q1 | Strike | G: void M20 (SWAT removed); rec. Mark void; remove from wire |
| A25 | A cracked door counts as closed for light and guards | void M20 Q10 | Strike | A: partly superseded M20 Q10 (doors open past ~15%, guards notice); rec. Movement audit decides // C: void M20 (Q10: stick-driven doors, ~15% rule); rec. Drop; replace with the LV11 rule |
| A26 | Thermal never sees through walls | doors void M25 (2); walls part open | Never through walls or glass (Q-move-15) | A: partly void M25 (people through closed doors); rec. Bible line per V17 // C: void M25 for doors (dim silhouette through closed doors); walls part still stands; rec. Record "never through walls, dim silhouette through closed doors, render only" |
| A27 | Medkit: interrupted kit spent, stationary, X hold, H key | open (other area: health); touch part void M21 | Approve | - |
| A28 | Weapon ids kept, original names list | open (other area: weapons) | Approve | F: open; rec. Approve (Q-weapons-10) |
| A29 | Speed cap on D-pad and wheel, not a bumper | approved M25 (7); touch part void M21 | Done | - |
| A30 | Shared-by-design inputs allowed; other conflicts warn, never block | approved M20 Q6 | Done | - |
| A31 | Alarm tolerance scales call-in delays, not the alarm count | open (other area: difficulty) | Approve | C: void (replaced by A72 in the same run); rec. Drop |
| A32 | Custom difficulty sliders 0.5-2.0 on a base preset | open (other area: difficulty) | Approve | - |
| A33 | Loadout presets renamed Silent / Flash / Loud | open (other area: loadout) | Approve | A: open; rec. Approve (Q-vision-12) // F: open; conflicts bible 5.6; rec. Q-weapons-1 |
| A34 | Low-wall lean kind field on the wire | void M20 Q1 | Strike | G: void M20 (lean-out aim removed); rec. Mark void; remove from wire |
| A35 | Landing camera check allows 0 or 1 dips | technical | Approve | - |
| A36 | Stair collision moved up to the tread noses | technical | Approve | - |
| A37 | Remote animation audit runs pages undrawn | technical | Approve | G: technical; rec. Keep |
| A38 | No stride phase on the wire | approved M4 | Done | G: approved M4; rec. Keep |
| A39 | Which remote audit numbers gate | technical | Approve | G: technical; rec. Keep |
| A40 | Remote pose error report-only until step 22 | technical | Approve | G: technical; rec. Re-check at the prototype |
| A41 | Holster details: start holstered, swap while holstered changes the next draw, RB swaps while aiming, gadgets usable holstered | open | Approve (Q-controls-8) | - |
| A42 | Ready hands while holstered | approved M4, superseded M14 (relaxed arms) | Strike | - |
| A43 | Releasing aim never cancels a reload | approved M4 | Done | - |
| A44 | Elbow strike details (cone, whiff, stagger, buffer) | void M20 Q4 / Q4b, M25 (5) | Strike; palm strike rules | G: void M20 (palm strike, one hit from any side); rec. Mark void |
| A45 | Back-to-wall stand-off, slide braking, corner wrap | technical | Approve | - |
| A46 | Wall entry time grows with distance | void M20 (footage: 180 deg spin in 0.3-0.45 s, no glide) | Strike | - |
| A47 | Wall / SWAT pose polish deferred to step 27 | approved M4; overtaken by M20 / M25 rework | Strike | - |
| A48 | Stick entry needs a fresh push after a traversal | technical (dormant: stick entry is off, A83) | Approve | - |
| A49 | Noise band on the wall audit rows | technical | Approve | - |
| A50 | Wall edge verbs: peek trigger, lean-out, SWAT, 25 deg peek camera | void M20 Q1 (lean, SWAT); peek superseded by footage | Strike | C: void M20 (Q1 removes lean-out and SWAT; A84 removed step round; peek numbers now PROTOTYPE-PLAN P3.5); rec. Drop |
| A51 | Open-side weapon and low-wall side lean details | void M20 Q1 | Strike | C: technical (its lean parts are void M20); rec. Keep the posed-head sampling |
| A52 | Door crack-peek details | void M20 Q10; touch part void M21 | Strike | A: partly superseded M20 Q10 (doors open past ~15%, guards notice); rec. Movement audit decides // C: void M20 (Q10); rec. Drop |
| A53 | Vision details: glow channel, body cooling 60 s, electro device list, goggle flip | flip and look void M20 Q5 / M25; rest open | Approve the rest (Q-move-17 for the switch) | C: void M20 Q5 / M25 for the thermal look; rest technical; rec. Keep the render-only method; add Kestrel cameras, beams and keypads to the glow list (OWNER-NOTES:95) |
| A54 | One flashlight shadow at a time with micro detail on | technical | Approve | C: technical; rec. Keep // G: technical; rec. Keep |
| A55 | Medkit on X held 0.4 s when not aiming; held while aiming swaps weapon | open | Approve (Q-controls-6) | - |
| A56 | Damage interrupt spends the kit; a cancel refunds it | open (other area: health) | Approve | - |
| A57 | Medkit target sent as a player id | technical | Approve | G: technical; rec. Keep |
| A58 | Medkit pose hands-only, no prop | technical | Approve | - |
| A59 | Campaign loadout keeps the save's two fields | technical | Approve | F: open; rec. Q-weapons-5 |
| A60 | Suppressor fits all but shotguns and crossbow | open (other area: weapons) | Approve | F: open; rec. Approve (Q-weapons-10) |
| A61 | No marksman hold-breath until Phase 6 | open (other area: weapons) | Approve | A: technical; rec. Approve; bible marks it later // F: open; rec. Q-weapons-3 |
| A62 | Campaign rifle always issued suppressed | open (other area: weapons) | Approve | F: open; rec. Approve (Q-weapons-10) |
| A63 | Pad test thresholds 50 / 80 / 100 % -> gears 2 / 4 / 5 | technical (superseded by prototype speeds) | Approve | - |
| A64 | "Current gear" means the gear actually moved at | technical | Approve | - |
| A65 | Touch basic scheme contents | void M21 | Strike | - |
| A66 | Touch stick spans gears 1-5 | void M21 | Strike | - |
| A67 | Training skips the gadget step on touch | void M21 | Strike | - |
| A68 | Audit gear 6 = sprint | void M20 Q8 | Strike | - |
| A69 | Remap capture binds on release; hold B 1 s cancels | open (conflicts with menu-ui MD13) | Use MD13: Menu / Start or Esc (Q-controls-4) | - |
| A70 | Grab in hold mode: letting go knocks out, no lethal finish | open | Approve (Q-controls-10) | - |
| A71 | A shared binding fires both verbs, warns and saves | approved M20 Q6 | Done | - |
| A72 | Alarm tolerance reuses the reaction field | open (other area: difficulty) | Approve | C: open; rec. Approve |
| A73 | Slider values snap to 0.05 | technical | Approve | C: technical; rec. Keep |
| A74 | Difficulty sliders always visible | technical | Approve | - |
| A75 | Network simulator never drops messages | technical | Approve | G: technical; rec. Keep |
| A76 | Holstered arms pump at the sprint | void M20 Q8 | Strike | - |
| A77 | Weapon settles at the 0.2 s rate | technical | Approve | - |
| A78 | Relaxed holstered arm numbers (M14) | technical; sprint part void M20 Q8 | Approve, retune at P1 | - |
| A79 | Heel-to-toe roll deferred to step 22 | technical | Approve | - |
| A80 | Hip drop only from weight-bearing feet | technical | Approve | - |
| A81 | Relaxed arms clear the thigh holster | technical | Approve | F: open; to re-check under M20's CT posture and Wren's real holster; rec. Re-check at Wren integration |
| A82 | Reversed step keeps the old hip reach | technical (reversal pivot removed by the prototype) | Approve | - |
| A83 | Back-to-wall entry by the button only, no stick-into-wall entry | open (contradicts bible 5.3) | Approve (Q-move-12) | - |
| A84 | Wall polish: 0.9 / 0.6 m/s slide, pull-away leave, 0.25 s peek hold | void M25 (3) and M20 footage | Strike | - |
| A85 | Body turn on a wall capped at 12 rad/s | technical | Approve | - |
| A86 | Weapon glide limits on a wall | technical | Approve | - |
| A87 | Goggle grain numbers (grain on all three, strongest on dark areas) | open (M20 Q5 / M25 CT look vs M14 N7) | CT look (Q-move-16) | C: void M20 Q5 / PROTOTYPE-PLAN P4.2 (grain only on warm areas, night ~1%, EMF none); rec. Drop |
| A88 | Step-22 weight: speeds -17 %, 0.3 s start, 0.25 s stop, pivots, noise thresholds | void M20 Q2 / Q7 / Q8, M25 (6) | Strike | C: void M20 Q8 / M25 (new speeds, CT noise bands); rec. Replace with CT bands (Q-stealth-1) |
| A89 | Kneel entered by the rear foot; no foot planted past a drop | technical | Approve | - |

### Training run (docs/training/DECISIONS.md, feature/training-bunker) - 90 rows: open 14, approved 13, void 15, technical 48

| ID | Plain-English one line | Status | Recommended answer | Other audits |
| --- | --- | --- | --- | --- |
| A1 | Every gate and drill has a unique id | technical | approve | - |
| A2 | A bolted door opens only from its own side | technical | approve | - |
| A3 | Airlock "ready" phase with a Cycle button; leaving aborts | void D46 (automatic, no button) | mark void | - |
| A4 | "Start at bay N" seals earlier airlocks and starts in bay N's airlock | technical | approve | - |
| A5 | Course ends through finish() at the exit lift | void (A24 Finish device) | mark void | - |
| A6 | Dev solo flag: one player counts for both, never completes a drill | approved D21 | keep | G: open; rec. Keep (Q-coop-7) |
| A7 | Airlock refusal text lists open drills by name | technical | approve | - |
| A8 | Course validator checks the bay chain and flags | technical | approve | - |
| A9 | Per-player pickup flags; swipe check added later | technical | approve | - |
| A10 | Gates work in any bay; restart resets the current bay | technical | approve | - |
| A11 | A hold switch is "braced": press once and stay within reach, not hold the button | open | approve (works the same for host and client) | - |
| A12 | Course data maps string ids onto level doors, anchors, lights | technical | approve | - |
| A13 | Pair gate needs two different players; solo flag dev builds only | technical | approve | - |
| A14 | Bay restart does not repair broken glass or grates | technical (worked round by A53 / A54) | approve | - |
| A16 | e2e pumps the background host page; client presses get 1.5 s | technical | approve | G: technical; rec. Keep |
| A17 | Friendly fire never hurts the thrower (own grenade); PvP bullet gap noted | open | approve; PvP is parked | G: open (part of Q-coop-2); rec. Keep |
| A18 | Host ticks its own stance / aim / reload drills like the client | technical | approve | - |
| A19 | Course names P1 "Wren" and P2 "Moth" whatever operator they chose | open | use each player's own operator callsign | - |
| A20 | Drill detection verb list (includes sprint) | technical (sprint verb void by M20) | approve minus sprint | - |
| A21 | B9 rating points (1000 less 100 / 200 / 150 per detection / alarm / body) | technical (within D32) | approve | - |
| A22 | Course record is one IndexedDB kv key, no save bump | technical | approve | - |
| A23 | Client takedowns, gadgets, doors, team moves tick on the host | technical | approve | G: technical; rec. Keep |
| A24 | A "Finish" device in the last bay ends the course, no partner check; CHANGELOG 3.7.0 | technical | approve; version set by the consolidation | - |
| A25 | Upper storey marks every piece no-ledge except named lips | technical | approve | - |
| A26 | v1 B2 glass walls as invisible collision boxes | void D47 (v2 rebuild) | mark void | - |
| A27 | v1 B2 wall and lane numbers | void D47 | mark void | - |
| A28 | v1 course stub B1-B2 | void D47 | mark void | - |
| A29 | Walk URLs: two tabs with ?net=local, solo with &course=solo | technical | approve | G: technical; rec. Keep |
| A30 | v1 B3 shaft layout | void D47 (A72) | mark void | - |
| A31 | B3 fan guard locked until the isolator is switched off; hood over the pit | technical | approve | - |
| A32 | Airlock 4 floor at 10.4 m to meet the outlet platform | technical | approve | - |
| A33 | v1 B4 layout | void D47 (A73) | mark void | - |
| A34 | Voxel grid up to 40 m tall for the bunker | technical | approve | - |
| A35 | B4 W2 lip lowered to 4.25 so the human ladder reaches it (solo margin 0.45 instead of 0.5) | open | accept for this one lip | C: open; rec. Resolve with LV15 option 1 |
| A36 | v1 B5 / B6 geometry fixes | void D47 (A57, A75; landing rule kept by A60) | mark void | - |
| A37 | B6 now-form card gates as pickups | technical | approve | - |
| A38 | B5 lips list; mains lamp group; floor build order | technical | approve | - |
| A39 | v1 B9 plan | void D47 (A76) | mark void | - |
| A40 | B7 takedown spots moved to where the engine allows them | technical | approve | - |
| A41 | B7-B9 gate wiring (store door, lift keys, bolts) | technical | approve | - |
| A42 | Room-graph and nav-flood reachability tests | technical | approve | - |
| A43 | B8 catwalk rail can be vaulted; the stair gate is a convenience | open | approve | - |
| A44 | Once an airlock cycle starts, stepping off does not abort it | open | approve | - |
| A45 | PROTOCOL_VERSION kept at 3 on the branch | technical (consolidation sets 11) | approve, superseded by TU22 | G: technical (superseded by PL10: 11 on merge); rec. Set 11 |
| A46 | The far airlock door swings open by itself after the cycle | approved D46 / R6 | keep | - |
| A47 | Interim objective names = short drill names | void (A59) | mark void | - |
| A48 | B1 airlock test runs with no drills until T7a | technical | approve | - |
| A49 | Partners block each other in every co-op mode, with teleport snapping | approved D49 | keep | G: approved TRAIN-D49 and LOCO-D8; rec. Keep |
| A50 | 1.8 m wide shared paths; single-file elements taken one at a time with waiting spots | open | approve | - |
| A51 | Skips closed by geometry; three wall-jump / human-ladder spots rely on the drill tick | open | keep the tick as backstop | - |
| A52 | B3: both players rappel and zipline; two rope stages | approved D42 / D43 (R3) | keep | - |
| A53 | B3 twin ducts with self-closing grille and sprung louvre | technical | approve | - |
| A54 | B2 practice windows re-glaze 10 s after a break | open | approve | - |
| A55 | B4 Phase 5 team moves built in a glass side bay off the line | open | approve | - |
| A56 | Splits only at B4 sluice, B5 breaker, B6, B8, B9; B7 none | approved D42 (R3) | keep | - |
| A57 | B6 shared start through the duct for both players | approved D42 (R3) | keep | - |
| A58 | Guarded rooms keep two routes and a loop side by side inside one room | technical | approve | - |
| A59 | Every drill has an explicit objective line | approved D45 (R5) | keep | - |
| A60 | v2 compact world layout | approved D44 (R4) | keep | - |
| A61 | Every multi-part drill can be retried: one-way turnstiles, re-lamping after 30 s | open | approve | - |
| A62 | A downed guard a drill still needs is replaced by a fresh role-player 30 s later | open | approve | - |
| A63 | Five extra B3 rope structures | technical | approve | - |
| A64 | Drops up to 11.8 m into the rope net with no damage | open (depends on CT fall damage) | follow the CT prototype (TU24) | - |
| A65 | Rappel body may visually clip a deck at some rope lengths | technical | approve | - |
| A66 | T5d stubs (turnstile, re-glaze, re-lamp) until T7a | technical | approve | - |
| A67 | Interim passage A2 to v1 B3 | void (removed T5e) | mark void | - |
| A68 | Objective lines are not drills until T7a | technical | approve | - |
| A69 | B2 fitted inside BAYS windows | technical | approve | - |
| A70 | e2e client "use" check moved to B6 | technical | approve | - |
| A71 | Interim B4 position and passage | void (removed T5f) | mark void | - |
| A72 | B3 numbers moved within windows | technical | approve | - |
| A73 | B4 W2 screened except the human-ladder spot | technical | approve | - |
| A74 | Interim Deep shift | void (undone T5g, A77) | mark void | - |
| A75 | T5f numbers moved within windows; relief doors placed | technical | approve | - |
| A76 | T5g numbers moved within windows; relief doors placed | technical | approve | - |
| A77 | Course bounds and voxel area limit | technical | approve | - |
| C1 | Names Fallow, Cresset Training, LANTERN | approved D28 | keep | - |
| C2 | Course descends; nothing below y 0 | technical | approve | - |
| C3 | Roles swap at every airlock | approved D25, narrowed by D42 (only split drills have roles) | keep as narrowed | - |
| C4 | Every gate has a "now" and a "final" form | technical | approve | - |
| C5 | Course framework built first | technical | approve | - |
| C6 | Five nav layers | technical | approve | - |
| C7 | LANTERN text radio only | approved (CLAUDE.md no voice) | keep | - |
| C8 | Timed holds only in unguarded bays | approved (bible 6 no forced timers) | keep | - |
| C9 | Course record as a kv key, no save bump | technical | approve | - |
| C10 | Local-only drill ticks reported by the client | technical | approve | - |
| D1 (from audit A) | Solo testing of Fallow uses the bot partner | void M12 (training A6 solo dev flag replaces it) | Remove the bot reference | G: void M12 (unless Q-coop-1 b); rec. Use two tabs + solo flag |
| D15 (from audit G) | Bunker's later blocks wait for locomotion step 20 | void M12 (step 20 dropped) | Wait for the CT prototype instead | - |
| D35 (from audit G) | A dev bot plays P2 from the debug menu | open (Michael's answer vs M12) | Q-coop-1 | - |
| D38 (from audit G) | Friendly fire on in the bunker | approved (Michael, training D38) | Keep; campaign rule Q-coop-2 | - |

### Kestrel and levels (docs/kestrel) - 20 rows: open 14, technical 6

| ID | Plain-English one line | Status | Recommended answer |
| --- | --- | --- | --- |
| Kestrel 01 ASK-1 (01:251) | Mission clock 01:10-02:10 | open | Accept |
| Kestrel 01 ASK-2 (01:252) | Objectives 1 and 5 complete on entering an area | technical | Accept |
| Kestrel 01 ASK-3 (01:253) | Objective 3 needs cameras looped or off AND beams off | open | Accept |
| Kestrel 01 ASK-4 (01:254) | Fibre tap's interact kind and hold time | technical | Decide in P07 |
| Kestrel 01 ASK-5 (01:255) | Which 9 guards sleep and when they wake (proposal: two pairs wake at objectives 4 and 6) | open (Michael deferred it to P07, 01:275) | Keep the proposal as the default |
| Kestrel 01 ASK-6 (01:256) | If waking a guard passes the cap, S5 sends an earlier one back to sleep | technical | Accept |
| Kestrel 01 ASK-7 (01:257) | Generator noise masks footsteps only if sound masking exists | open (bible S2-S3 masking not built) | Build masking (Phase 2) before Kestrel's guards stage |
| Kestrel 01 ASK-8 (01:258) | The engineer can be grabbed for the louder iris route | open | Accept (bible 5.7 lets civilians be grabbed) |
| Kestrel 01 ASK-11 (01:260) | "Undetected" as a ghost condition | open | Add "no detections" to the rating rules |
| Kestrel 01 ASK-16 (01:265) | Civilian employers are generic labels | open | Accept generic names |
| Kestrel 01 ASK-17 (01:266) | Do civilians count toward the 12-awake cap; does a civilian seeing you count as a detection | open | Both yes (Q-stealth-8) |
| Kestrel 01 ASK-18 (01:267) | A player at the security desk watches feeds to guide a partner | open | Later, after the slice |
| Kestrel 01 ASK-19 (01:268) | Size limits of the added moves not yet checked against the facts | technical | Check in the facts refresh (LV2) |
| Kestrel 02 ASK-1 (02:410) | Lane fence height = the climbable fence value | open | Accept 2.4 m |
| Kestrel 02 ASK-3 (02:412) | Hall equipment door 2.0 x 2.1 (real ones often 2.4 high) | open | 2.4 m high |
| Kestrel 02 ASK-4 (02:413) | Lift maker sizes become facts | technical | Accept |
| Kestrel 02 ASK-7 (02:416) | Gallery opening into the hall only 1.8 m high | open | Raise to 2.1 m (door height) |
| Kestrel overnight choices (overnight-report:53-70) | Editor defaults: site at 54 N, moon arc, crawl = crouch, plasterboard solid, plates beside the latch, wall PIR 180 deg, etc. | technical | Approve in bulk |
| Kestrel "worth a look" (overnight-report:45-51) | South-facing sawtooth, 1.165 m pallets, 1.48 m voids, night lighting, moved AI code | open | See LV26 |
| Kestrel site names (handover:86) | Cinder Yard and Ostler Colocation are placeholders | open | Make them final |

### Operators run (docs/operators, feature/operators, read only) - 89 rows: open 7, approved 3, void 12, technical 67

| ID | Plain-English one line | Status | Recommended answer |
| --- | --- | --- | --- |
| OPS-A1 | Cloth rest shape through Blender's Dynamic Mesh | technical | Keep |
| OPS-A2 | Cloth vertex mass 0.1 for solver stability | technical | Keep |
| OPS-A3 | 3 mm collision layer, girths measured on it | technical | Keep |
| OPS-A4 | Combat shirt cut and cloth stiffness | technical (Moth only since D22) | Keep for Moth |
| OPS-A5 | Material albedo / roughness values fitted to the check limits | technical | Keep |
| OPS-A6 | Kit ids for the shirt's sewn details | technical (Moth only since D22) | Keep |
| OPS-A7 | Lab served as a production build | technical | Keep |
| OPS-A8 | Lab reads GLB with its own small reader | technical | Keep |
| OPS-A9 | Lab uses flat material factors until baked maps | void (superseded by A78) | Close |
| OPS-A10 | Lab rigs use high exposure | void (superseded by A78 / A80) | Close |
| OPS-A11 | Layers resolved after simulation, not as colliders | technical | Keep |
| OPS-A12 | Base layer is one garment | technical (Wren: replaced by the suit, A37) | Keep for Moth |
| OPS-A13 | Legwear simulated at reduced gravity | technical | Keep |
| OPS-A14 | Knee pad pockets added as a kit pouch | technical (Moth only since D22) | Keep for Moth |
| OPS-A15 | Waistbands pinned; knit drawn on; soft-shell faired | technical | Keep |
| OPS-A16 | Smooth layer push, tucked hem, knee inserts | technical | Keep |
| OPS-A17 | Seat bridge; stitch shadows off in renders | technical | Keep |
| OPS-A18 | Gloves and boots fitted, not cloth-simulated | technical | Keep |
| OPS-A19 | Panel cutting by level-set slice | technical | Keep |
| OPS-A20 | Overlays as stepped panels | technical | Keep |
| OPS-A21 | Glove fit repair, leather fingertip caps | technical | Keep |
| OPS-A22 | Trouser hem drafted from the boot | void for Wren (A38); technical for Moth | Keep for Moth |
| OPS-A23 | Boot material values and toe shape | technical | Keep |
| OPS-A24 | Head items fitted, not simulated | technical | Keep |
| OPS-A25 | Mock neck drawn in under the head items | technical | Keep |
| OPS-A26 | Goggle lens material class in the check | technical | Keep |
| OPS-A27 | Head cable lengths (corrected by A65) | technical (partly superseded by A65) | Keep A65's numbers |
| OPS-A28 | Moth also gets the no-flip goggle, keeps round amber lenses (D19 scope) | technical, follows D19; Moth direction still open (D24) | Confirm with Moth's direction at step 12 |
| OPS-A29 | Goggle band through side lugs carries the power cable; stowed / in-use positions | technical, follows D19 / D20 | Keep; in-game behaviour is Q-art-6 |
| OPS-A30 | Twelfth check view under the wrist | technical | Keep |
| OPS-A31 | Hood skirt lower at the nape | technical | Keep |
| OPS-A32 | Carrier and belt as fitted items | void for Wren (D22); Moth reference | Close for Wren |
| OPS-A33 | Shirt pressed under the carrier, not re-simulated | technical | Keep |
| OPS-A34 | Wren's harness = carrier straps + belt | void (D22) | Close |
| OPS-A35 | Carrier release cable and radio antenna kit entries | void for Wren (D22) | Close |
| OPS-A36 | Back weapon mount upright, muzzle up, as the game's carry slots | open (STATE.md:34) | Keep upright (Q-weapons-6) |
| OPS-A37 | One-piece suit replaces base layer, shirt and trousers | technical, follows D24 | Keep |
| OPS-A38 | Suit ankle cuff inside the boot | technical | Keep |
| OPS-A39 | Back kept flat for the gun; drone pod and medkit on the hips | approved D25 | Done |
| OPS-A40 | Weapon anchor frames; empty holster sized for the largest sidearm | approved D24 (empty holster, mount point); sizing technical | Keep |
| OPS-A41 | Throwable sleeves at the left hip under the sling slot | void (D25, then D28) | Close |
| OPS-A42 | No IR strobe on Wren | technical, follows D24's list | Keep |
| OPS-A43 | Suit waist as a sealed lap | void (A48) | Close |
| OPS-A44 | Suit zones as inserts on the existing block | technical | Keep |
| OPS-A45 | Bust and abdomen relaxed under the suit | technical (D4: no anatomical detail) | Keep |
| OPS-A46 | Balaclava tucks inside the suit's mock neck | technical | Keep |
| OPS-A47 | Material classes on the suit | technical | Keep |
| OPS-A48 | Suit waist as one bonded seam (amended twice) | technical | Keep |
| OPS-A49 | Hood skirt laps 40 mm over the mock neck (amended) | technical | Keep |
| OPS-A50 | Suit zones redrawn, abdomen relax | technical | Keep |
| OPS-A51 | Waist seam follows the leggings' rise; top cut longer | technical | Keep |
| OPS-A52 | Covered-material rule for the render check (amended) | technical | Keep |
| OPS-A53 | Armour as one fitted item | technical | Keep |
| OPS-A54 | How plates are moulded to the suit | technical | Keep |
| OPS-A55 | Rib segments lap like shingles | technical, follows D24 | Keep |
| OPS-A56 | Plate edge and corner family | technical | Keep |
| OPS-A57 | Weapon mount is a receiver bar with keyhole sockets | technical (depends on A36) | Keep |
| OPS-A58 | Strap anchors at the edge of the back-carry lane | technical | Keep |
| OPS-A59 | One metal finish under its own material name | technical | Keep |
| OPS-A60 | Harness strap geometry | technical | Keep |
| OPS-A61 | Plate fairing over the bust; strap runs | technical | Keep |
| OPS-A62 | Holster at the game's thigh slot; game should anchor sidearms at the holster mouth and move the slot 9 mm in | technical (game-code integration item for step 25) | Do it at Wren integration |
| OPS-A63 | Throwable sleeves oval, 30 x 21 mm | technical | Keep |
| OPS-A64 | Gadget slot over the right bust | technical | Keep |
| OPS-A65 | PTT, earpiece plug and cable keepers | technical | Keep |
| OPS-A66 | Bonded, silent storage (no hook-and-loop) | technical, follows D23 | Keep |
| OPS-A67 | Approach boots as their own item | technical, follows D23 | Keep |
| OPS-A68 | Suit hem pressed into the boot | technical | Keep |
| OPS-A69 | Hero LOD = build decimated to 230 k with baked maps | technical (within D21's budget) | Keep |
| OPS-A70 | What leaves each LOD's geometry | technical | Keep |
| OPS-A71 | LOD1 has its own 1K texture set | technical | Keep |
| OPS-A72 | 3 cm edge rule on built items only | technical | Keep |
| OPS-A73 | Textures as WebP until KTX2 | void (closed by D26 / A79) | Close |
| OPS-A74 | Lower LODs are closed voxel-remeshed shells | technical | Keep |
| OPS-A75 | Goggle glow is one extra draw per lower LOD | technical | Keep |
| OPS-A76 | Bake error fixes and the bakeDiff check | technical | Keep |
| OPS-A77 | Rigid polymer pieces stay separate below LOD0 | technical | Keep |
| OPS-A78 | Close-up lighting calibration, studio environment | technical | Keep |
| OPS-A79 | KTX2 encoding; Babylon decoder bundled | approved D26 / D27 | Done |
| OPS-A80 | Lab reader winding fix, rigs re-aimed | technical | Keep |
| OPS-P1 (SPEC 4.3 A1) | Shoulder joint 3.5 cm lower for all characters | open | Apply at integration (Q-art-10) |
| OPS-P2 (SPEC 4.3 A2) | Upper arm longer | void (withdrawn in SPEC 4.2) | Close |
| OPS-P3 (SPEC 4.3 A3) | Hands 2 cm longer | open | Apply (Q-art-10) |
| OPS-P4 (SPEC 4.3 A4) | Wider pelvis, waist, deeper chest (visual, cover standoff check) | open | Apply (Q-art-10) |
| OPS-P5 (SPEC 4.3 A5) | Head 1 cm deeper (head hit sphere +6 mm) | open | Apply (Q-art-10) |
| OPS-P6 (SPEC 4.3 A6) | Shoulders 3 cm wider | open | Apply (Q-art-10) |
| OPS-P7 (SPEC 4.3 A7) | Thigh 2.5 cm shorter so the knee sits right | open | Apply (Q-art-10) |
| OPS-S2 / D9 | Phone gets the lowest LOD, no fps gate | void (D29 / M21) | Close |
| OPS-D19 "more futuristic housing" | Less square goggle | void (withdrawn by D20) | Close |

### Audio and music runs (no A-numbers; session choices found in the audio docs) - 18 rows: open 4, approved 6, void 2, technical 6

| ID | Plain-English one line | Status | Recommended answer |
| --- | --- | --- | --- |
| AS1 | Guards searching (no contact) play the Cautious music; Evasion only follows Alert (`adapter.ts`, audio.md:25-28) | open | Keep |
| AS2 | Guards in "cooldown" after a fight count as calm for the music (music-progress M0, "for Michael to veto") | technical | Keep |
| AS3 | Music ladder timings: Cautious after 0.6 s, Alert at once, Alert holds 10 s, Evasion 12 s, Cautious 8 s, one step down at a time (audio.md:23-24) | technical | Keep, tune by ear in music-revision |
| AS4 | Calm is silence for now (music-progress 4a) | approved (Michael 2026-10-16, music-progress.md:172) | Keep until music-revision |
| AS5 | Music volume default 15 % (music-progress 4c) | approved (Michael 2026-10-16, music-progress.md:120-121) | Keep |
| AS6 | Menu theme is the extended 64-bar loop with drums and brass (rounds 24-25) | open (round 25 "waiting for Michael") | Ship it provisionally; Michael confirms in music-revision |
| AS7 | Calm / Cautious alternatives from round 23 not chosen | open | Defer to music-revision |
| AS8 | Music follows every guard's state, never count, distance or direction | approved (Michael 2026-10-09, music-direction.md:361) | Keep, state it in master |
| AS9 | Real CC0 orchestral recordings for the score | approved (Michael 2026-10-15, round 6), then folded into "CC0 for everything" (2026-10-16) | Covered by AU1 option 1 |
| AS10 | Decode music at 32 kHz; MP3 (96 kbps foley / guns, game tracks from the Media Foundation encoder); render only on Michael's PC | technical | Keep |
| AS11 | V3 lab and its stems kept "untouched" for comparison (music-progress.md:689) | open | Remove (AU18) |
| AS12 | All M0 / V0 / V1 "for Michael to veto" choices (tempos 84 / 96 / 168, library budgets, PS1 sampler, sidechain, stingers rate limit, Confrontation mapping) | void (superseded by V4: music-progress.md:3-5 "Everything below the V4 report is history") | Archive |
| AS13 | Foley gaits crouch / walk / run / sprint, run from 2.1 m/s | void by M20 Q8 for sprint; threshold needs M25 speeds | Retune in the prototype job (AU6) |
| AS14 | Foley levels: cover glides 0.4, shuffles 0.5, plants within 0.15 s of a landing are part of it, suit damping (low-pass 1.6-2.4 kHz, 0.6 level, 0.25 s tails) | technical (suit silence approved, Michael 2026-10-16, audio.md:56-57,59-60) | Keep |
| AS15 | Each gun borrows the closest of 12 recorded guns (for example LMG = AK-47 pitched down, Heron Carbine = AR-15) | approved (Michael "sounds are good", weapon-audio-progress.md:45) | Keep |
| AS16 | A shot counts as suppressed when the live noise stat is under 0.6 | technical | Keep |
| AS17 | Gun levels set relative to a running step (pistol +12 dB, suppressed level with it, brass -9 dB) | technical, but depends on P13 | Re-level with AU5 |
| AS18 | Footsteps follow the rig's real foot plants, not a timer | approved (Michael P13 "Worked in time with feet"; CONSOLIDATE.md:28-29) | Keep |

### Menu-ui run (docs/menu-ui/DECISIONS.md, feature/menu-ui-spec) - 5 rows: open 4, void 1

| ID | Plain-English one line | Status | Recommended answer |
| --- | --- | --- | --- |
| MD11 | WASD moves menus, Space confirms, R / F for the X / Y actions, Q / E tabs, mouse 4 Back, pad Menu = Start | open | approve |
| MD13 | Remap capture cancels with Start / Esc, not B (code today: B held 1 s) | open | approve (B stays bindable) |
| MD15 | Cinematic shots S1-S7, holstered only "until locomotion step 25"; phones S1-S2 | open (phone part void M21; step 25 gone) | approve without phones; aim poses after the CT prototype |
| MD19 | Remove profile badge, Controls reference screen, item icons; Feedback on the main menu | open | approve |
| MD14 / MD16 | Phone pause overlay; touch tap rules | void M21 | remove |

### Vision-level rows (bible, progress, backlog, BIBLE-PROPOSALS) - 13 rows: open 7, approved 2, void 2, technical 2

| ID | Plain-English one line | Status | Recommended answer |
| --- | --- | --- | --- |
| Bible 5.15 3-player traitor (`bible:1037`) | With three players the finale is one traitor against two (Claude's default, Michael asked for 2v2 at four) | open | Approve 1 vs 2 |
| Audio budget (`bible:341`, `weapon-audio bible:347`) | All audio stays within about 8 MB (a proposal; the score alone is 5.9 MB) | open | Re-set for desktop only (V6, Q-vision-6) |
| CC0 texture budget (`bible:1202`) | About 60 MB of textures for the campaign (proposal) | technical (set in Phase 6b) | Keep as a proposal until the texture job |
| progress Phase 0 Step 2 (`progress:122`) | Phase 3b counted as its own version, so Phases 4-7 are 3.10.0-3.13.0 | superseded by A18 and the training headings | Replace with Q-process-3 |
| BIBLE-PROPOSALS 1-9 (`:7-15`) | Nine game ideas: guards undo changes, paired searches, last-known-position marker, digital layer, eavesdropping, lock bypasses with noise, fast retry, route map, adaptive music | open | Backlog, decide per phase (Q-vision-13) |
| BIBLE-PROPOSALS M12 (`:16`) | Move the bot partner to Phase 5 or drop it | open | Drop (Q-vision-10) |
| BIBLE-PROPOSALS 20b (`:17-21`) | Network tuning notes for the co-op phase (delays, clock sync, a "poor" preset) | technical | Keep for the co-op job |
| BIBLE-PROPOSALS M21 (`:22`) | Rewrite platform pillar, Section 8 and phone sections | approved M21 | Do it in the rewrite |
| Bible 11.1 (`bible:1526`) | Last known position per player in co-op | open (co-op phase) | Leave open |
| Bible 11.4 (`bible:1529`) | Audio source | approved (Michael 2026-10-16, weapon-audio bible:343) | Mark settled |
| Bible 11.5 (`bible:1530`) | Relay server for co-op | open (after real sessions) | Leave open |
| backlog 16 (`backlog:21`) | Which night vision realism ideas to build | open | Decide with the vision-mode job |
| iPhone cold bake (`progress:273`, phase-1 spec `:125`) | Build-time bake if the iPhone bake is over 4 s | void M21 | Remove |

## Questions

The questions built from these findings are in docs/consolidation/QUESTIONS.md, Michael's answers in docs/DECISIONS.md.
