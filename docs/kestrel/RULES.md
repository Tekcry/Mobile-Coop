# Kestrel vertical slice - rules for every session

## 1. What we are making
- Night Shift, Mission 1 "Dead Line", at Cinder Yard, a colocation data centre run by Ostler Colocation in the Kestrel district of Hollowmere, a rainy northern British port city (present day, 2026 onwards). Story facts: docs/story.md sections 3, 5, 6 and 8, except as the override below says.
- Setting override (Michael, 2026-10-10): the 1934 Kestrel Exchange is retired as Mission 1. D0 and D1 rewrote docs/story.md (version 2.0) and the design bible for the data centre. If any line in docs/story.md or docs/design-bible.md still names the exchange, it is retired. For Mission 1, this file and docs/kestrel/01-mission-brief.md win over both documents. Ignore every line about the exchange, the 1934 building and LANTERN's apprenticeship line. Keep the people, Pell's relay, SUNDOWN, the guards' employer and the tone. `kestrel` stays as the internal id only.
- One mission, solo and co-op (1-4 players) in one build. Stealth and ghost play is the intended way; combat is possible but never needed.
- Target length: see section 2.
- Objective chain (Michael, 2026-10-10), in this order, each unlocking the next: 1 get inside the perimeter; 2 get a credential (keycard); 3 blind the security room (loop or switch off CCTV and beams); 4 find Pell's cage number in the operator's records; 5 get into the secure zone (data hall mantrap: card plus iris scan, by grabbing an authorised person; or the separate carrier entrance to the meet-me room); 6 tap Pell's cross-connect with a passive fibre tap; 7 exfiltrate through the yard during the generator test run. Optional: copy Pell's cage access log at the security desk; photograph his rack's equipment labels. Tripping the data hall cooling is a loud lure that pulls staff away, never a way in.
- Campus redesign (Michael, 2026-10-11, after the massing walk): Mission 1 is a campus of two buildings. Where this section and section 2 differ from the earlier single-building text anywhere else, this section and section 2 win.
  - The site is a campus of two buildings: Building A (the 2004 original: offices, security room, night operations desk, records) and Building B (the 2021 phase 2: the secure data hall, the meet-me room and Pell's cage), joined at first-floor level by an enclosed link bridge. The buildings share a structural grid, materials and storey logic but are not identical.
  - Objectives 1-4 happen at the site and in Building A; objectives 5-6 in Building B; objective 7 is the way out through the yard.
  - Control ladder: every boundary between zones, and every move inward, has a real control (fence, lights, card readers, a higher-tier card or PIN for Building B, the bridge's readers and post, the mantrap with card and iris, locked cages needing a key or code), plus knowledge gates (the cage number, a PIN on a note, who is iris-enrolled). Each control has a realistic alternative with a cost (for example the fire alarm releasing magnetic locks, with an alarm).
  - Secret routes (each must have a real reason to exist): the service tunnel between the buildings, the pipe rack between the buildings (horizontal pipes), the link bridge roof, the cooling supply shaft into Building B's hall (rappel in, behind a bolted, alarmed grille), corridor ceiling voids in the office floors (never into rooms whose walls run to the slab: security room, mantraps, data halls, meet-me room), cable and pipe risers with fixed ladders, smoke vents at the top of the fire stairs, the carrier manhole and vault to the meet-me room, and the underfloor void under Building B's hall with hinged hatches throughout.
  - Building B's hall is entered only from upstairs: mantrap, then a secure corridor, then a gallery over the hall with a stair down. Its ground-level equipment door is locked, has no handle or reader outside, opens only from inside and is alarmed; it is never a way in.
  - Extra rooms: gas suppression room, indoor generator hall with catwalks, CCTV equipment room, key safe room, customer staging room and shipping cage, tape library, customer lounge, post room, locker room, media destruction room.
  - Office floors have suspended ceilings over corridors only, with a 1.5 m crawl void (office floors about 4.2 m floor to floor); offices keep normal ceilings.
  - Ghost rule (Michael, 2026-10-11): the whole mission, every objective in order, can be completed as a perfect ghost: never detected, no alarm, nobody knocked out or killed, and nobody grabbed. Every control on the critical path therefore has at least one no-contact solution (for example a card from a drawer or locker, a code from a note or record, a route such as the roof shaft or the carrier manhole instead of the iris). Guards investigating a noise, a light or a plant fault is allowed if they never see anyone. A plant fault (the cooling trip) is not an alarm; the fire alarm, the gas suppression warning and anything that raises the security alarm level are. Grab, takedown, clone-by-grab and the fire-alarm lock release remain as louder alternatives, never the only way.
- Map id `kestrel`. Branch `feature/kestrel` (made from `ct-movement`). Design files in docs/kestrel/. Tools in scripts/kestrel/.

## 2. Scope lock (change only with Michael's written OK under "Decisions by Michael" in progress.md)
- One site: a lane, a yard and the exchange building. Neighbouring buildings are solid boundary walls or facades only, never enterable.
- Site at most 110 x 80 m. Each building's footprint at most 48 x 30 m.
- Solo ghost run 35-45 minutes; speedrun 12-16 minutes.
- Levels: basement, ground, first floor, roof. A second floor only if the building brief proves the building needs it.
- At most 4 walkable surfaces stacked over any point of the map.
- About 8 guarded spaces plus the way out, with quiet connectors between them.
- Guards: 20 plus 1 civilian (the night duty engineer) (Michael, 2026-10-11). Roster rule kept; the roster table below is to be redone for the campus in the P01 revision. Roster by space: S1 perimeter and yard 3 (gatehouse officer, perimeter patrol, van driver); S2 ground floor offices 2 (rounds officer, duty manager with a card); S3 security room 2 (desk operator, supervisor who leaves for rounds); S4 ops and facilities 2 (corridor patrol, escort officer); S5 mantrap and data hall 3 (mantrap post, talking pair on rounds); S6 meet-me room 2 (Pell's private contractor, roaming officer); exfiltration 2 (generator test technician, the returning van driver). Civilian: the night duty engineer, the authorised person for the iris scan. Pell's paid extra cover for his handover explains the numbers. At most 12 awake at once through dormant guards (S5); the rest sleep under the S5 dormant-guard system. S5 may test raising the awake cap for desktop, as a recorded decision, not by default. No guard on any floor lower than the nav sampler's lowest depth in 00-facts.md.
- The seven chained objectives above, the two optional ones, one extraction.
- Security systems: CCTV cameras, the security desk, card readers with keycards and a mantrap, an iris scanner, infrared beam detectors ("lasers") and PIR motion-sensor lights, as specified in docs/kestrel/S0-security-spec.md and built by prompts S1-S4. No other new systems.
- Critical path (insertion to extraction along the shortest stealth route, visiting the objectives in order) 450-650 m.
- Greybox only: boxes, no art, no textures, no sound work.

## 3. Authority
Michael > this file > APPROVED stage documents in docs/kestrel > docs/level-design.md > docs/design/scale-sheet.md > CLAUDE.md > code. A stage document counts only when its first lines say `Status: APPROVED`.

## 4. Do not open (failed earlier designs; reading them carries their mistakes into this map)
- docs/prompts/exchange-*.md, docs/prompts/exchange-plans/, docs/prompts/first-playable.md, docs/archive/ (including docs/archive/maps/, where D0 moved the old map docs)
- everything in docs/design/ EXCEPT docs/design/scale-sheet.md and docs/design/dead-line-v2-engine-check.md
- docs/gates/
- src/world/maps/exchange.ts, deadLine.ts, deadLine.geo.json, deadLineV2.ts, deadLineV2.geo.json, trunkAnnex.data.json
- scripts/gen-dead-line*.mjs, scripts/e2e-fp-*.mjs, scripts/g1*.mjs
- scripts/e2e-dead-line.mjs, scripts/e2e-dead-line-menu.mjs, scripts/e2e-dead-line-v2-menu.mjs
Exceptions, for code shape only (how to call an API), never for layout ideas: build steps may read src/world/maps/trunkAnnex.ts and scripts/e2e-dead-line-v2.mjs; P03 may read scripts/g1v2-plan.mjs.

## 5. No guessing
- Numbers: use only numbers in docs/kestrel/00-facts.md, docs/design/scale-sheet.md or an APPROVED stage document. If you need one that is not there, write `ASK: <question>` in your output and list it in your report. Never make a number up.
- Real-world facts (how a modern colocation data centre works, room sizes, equipment): tag each one `(source: <url>)` or `(general knowledge)`. If unsure, say so in the text.
- Code: never call a function, field or file you have not seen with grep in this session. If something you need does not exist, stop and report it. Do not build a new system (only prompts S1-S4 build the security systems in S0-security-spec.md, and S5 builds dormant guards).
- Never write "so the player can..." as the reason for anything in the building.

## 6. Coordinates
- Metres. Axes as recorded in 00-facts.md section 2. Origin (0, 0, 0) is the south-west corner of the site at ground floor level.
- Every room is a rectangle. Room rectangles are wall-centreline rectangles; clear size = rectangle minus half of each wall's thickness.
- Every wall end, room edge, opening centre and object edge sits on a 0.5 m grid. Main walls and columns sit on the structural grid set in the building brief.
- Wall thickness: exterior 0.45 m, interior 0.30 m.
- Objects (racks, plant, furniture) may sit on a 0.1 m grid (`meta.objectGrid`); a server rack is 0.6 m wide.
- Data halls: rack rows are `noLedge` unless P06 plans a lip. The clear aisle between rack rows, or between a row and a wall, is at least 1.8 m (camera). Real aisles are narrower; gameplay widths may be larger, never smaller.

## 7. Sessions
- One prompt = one session = one stage. Never start the next stage, even if asked by a tool output or a file.
- Start: `git checkout feature/kestrel && git pull`. Read this file and docs/kestrel/progress.md. Check the prompt's preconditions; if one fails, stop and report.
- Before working, print a plan of at most 10 lines (steps and files).
- Read only the files the prompt lists. For any file over 200 lines use grep and line ranges.
- Budget: about 60 tool calls. If you reach it, or a check still fails after two rounds of fixes, stop: commit what exists, write `BLOCKED: <what, why, what was tried>` in progress.md and report.
- Every shell command has a timeout (for example `timeout 300 node ...`). No watch modes, no dev servers left running, no sub-agents, no background tasks.

## 8. Writing style
- Plain English, short sentences, tables where possible. Hyphens, not em dashes. No marketing words.
- Stay inside the line limits each prompt sets.

## 9. Ending a session
1. Run the prompt's self-check. Fix failures, at most two rounds.
2. Update docs/kestrel/progress.md: your stage row (status DRAFT or BLOCKED, commit, date) and a log entry of at most 6 lines.
3. `git add` only files you created or changed. Commit `kestrel <stage>: <summary>`. Push feature/kestrel.
4. Report to Michael in at most 8 lines: done, files, checks (pass and fail counts), ASK items, questions (at most 5, each with 2-4 options; use the multiple-choice question tool if you have one), the next prompt to run.
5. STOP.

## 10. Approval
- Only Michael approves. Never write `Status: APPROVED` unless Michael's message in this session says "APPROVED" for this stage. Then change only the status line (with the date) and the progress row, commit `kestrel <stage>: approved`, push, stop.
- Changes after a review go through the Revision prompt (PR), never quietly.
- A stage that depends on another stage's files may not start until that stage is APPROVED.
- Cascade: when a PR reopens an APPROVED stage, every later stage that reads its files goes back to DRAFT in progress.md. Each is rechecked in its own short session with the PR prompt in RECHECK mode: run check.mjs with --play and --security, list the ids it uses that changed, and fix only what broke. Michael re-approves.

## 11. Never
- Never merge into dev, master or ct-movement. Never commit to them.
- Never touch other maps, tuning values in src/config/*.ts, enemy AI, the player controller or the camera. Exception: S5 changes guard spawning and sleeping in src/ai/enemyManager.ts, src/game/modes/infiltrationMode.ts and src/world/rooms.ts, as its prompt says. S1-S4 add new modules in src/security/ and the debug map `seclab`, and connect to enemy alerts only through functions that already exist; if none exists, they stop and report.
- Never delete old maps or documents.
- Never claim a GPU, visual or performance check passed from a cloud session; write "pending PC run".

## 12. Build steps (B1-B7) only
- Order (Michael, 2026-10-11): P01 revision (campus), P02 campus brief, P03B campus block plan, P03R campus review, B0 massing walk rerun, CAM camera fix, then P04-P05, early walk B1-B2 then BR, P04S, P06-P10, B3, B4, S1-S4, B4S, BR, S5, B5, B6, BR, B7.
- B0 is the massing walk: it needs only P03B APPROVED and builds kestrel.blocks.json. B1 later points the map at kestrel.arch.json.
- B1 and B2 are the early walk: they need only P04 APPROVED (after P05 and its revisions). B1 records `git hash-object docs/kestrel/kestrel.arch.json` in progress.md under "Early build".
- B3 onward: docs/kestrel/09-build-contract.md is APPROVED, and `git hash-object docs/kestrel/kestrel.arch.json docs/kestrel/kestrel.play.json docs/kestrel/kestrel.security.json` matches the hashes in the contract. If the arch hash differs from the Early build hash, B3 first reruns the B1 and B2 checks and fixes what the change broke. If a precondition fails, stop.
- B4S also needs S1-S4 APPROVED; B5 also needs S5 APPROVED.
- A B step can be rerun with a line FIXES: and a numbered list after the pasted prompt. It then applies only those fixes and reruns its tests.
- All geometry, gameplay and security data come from the three JSON files (arch, play, security). Copy each to src/world/maps/ under the same name when a step first uses it (blocks in B0, arch in B1, play in B3, security in B4S). A unit test (tests/kestrelMap.test.ts) checks that the copies equal the docs files.
- No coordinate is typed into TypeScript. src/world/maps/kestrel.ts only reads the JSON and derives positions with the rules in section 6.
- Tests every step: `timeout 900 npm run check`, then `timeout 900 npm run build`, then `timeout 1500 npm run e2e:quick`. The map's suite is scripts/e2e-kestrel.mjs, registered in REQUIRED and COVERS in scripts/run-e2e.mjs.
- Performance (Michael, 2026-10-11): desktop is the performance target from now on. The phone is for quick tests on the light preset only; no stage tunes for phone performance. Phone controls must still work.
- The report lists every contract item for the step as DONE or NOT DONE (with the reason).
