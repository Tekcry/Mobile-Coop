# Kestrel vertical slice - rules for every session

## 1. What we are making
- Night Shift, Mission 1 "Dead Line", at Cinder Yard, a colocation data centre run by Ostler Colocation in the Kestrel district of Hollowmere, a rainy northern British port city (present day, 2026 onwards). Story facts: docs/story.md sections 3, 5, 6 and 8, except as the override below says.
- Setting override (Michael, 2026-10-10): the 1934 Kestrel Exchange is retired as Mission 1. D0 and D1 rewrote docs/story.md (version 2.0) and the design bible for the data centre. If any line in docs/story.md or docs/design-bible.md still names the exchange, it is retired. For Mission 1, this file and docs/kestrel/01-mission-brief.md win over both documents. Ignore every line about the exchange, the 1934 building and LANTERN's apprenticeship line. Keep the people, Pell's relay, SUNDOWN, the guards' employer and the tone. `kestrel` stays as the internal id only.
- One mission, solo and co-op (1-4 players) in one build. Stealth and ghost play is the intended way; combat is possible but never needed.
- Target length: a careful first-time solo ghost run takes 30-40 minutes. A player who knows the map finishes in 10-14 minutes.
- Objective chain (Michael, 2026-10-10), in this order, each unlocking the next: 1 get inside the perimeter; 2 get a credential (keycard); 3 blind the security room (loop or switch off CCTV and beams); 4 find Pell's cage number in the operator's records; 5 get into the secure zone (data hall mantrap: card plus iris scan, by grabbing an authorised person; or the separate carrier entrance to the meet-me room); 6 tap Pell's cross-connect with a passive fibre tap; 7 exfiltrate through the yard during the generator test run. Optional: copy Pell's cage access log at the security desk; photograph his rack's equipment labels. Tripping the data hall cooling is a loud lure that pulls staff away, never a way in.
- Map id `kestrel`. Branch `feature/kestrel` (made from `ct-movement`). Design files in docs/kestrel/. Tools in scripts/kestrel/.

## 2. Scope lock (change only with Michael's written OK under "Decisions by Michael" in progress.md)
- One site: a lane, a yard and the exchange building. Neighbouring buildings are solid boundary walls or facades only, never enterable.
- Site at most 80 m x 60 m. Building footprint at most 48 m x 30 m.
- Levels: basement, ground, first floor, roof. A second floor only if the building brief proves the building needs it.
- At most 4 walkable surfaces stacked over any point of the map.
- Exactly 6 guarded encounter spaces plus the exfiltration, with quiet connectors between them.
- 16 guards and 1 civilian (Michael, 2026-10-10). Roster by space: S1 perimeter and yard 3 (gatehouse officer, perimeter patrol, van driver); S2 ground floor offices 2 (rounds officer, duty manager with a card); S3 security room 2 (desk operator, supervisor who leaves for rounds); S4 ops and facilities 2 (corridor patrol, escort officer); S5 mantrap and data hall 3 (mantrap post, talking pair on rounds); S6 meet-me room 2 (Pell's private contractor, roaming officer); exfiltration 2 (generator test technician, the returning van driver). Civilian: the night duty engineer, the authorised person for the iris scan. Pell's paid extra cover for his handover explains the numbers. At most the awake cap (F21, 12) are awake at once; the rest sleep under the S5 dormant-guard system. No guard on any floor lower than the nav sampler's lowest depth in 00-facts.md.
- The seven chained objectives above, the two optional ones, one extraction.
- Security systems: CCTV cameras, the security desk, card readers with keycards and a mantrap, an iris scanner, infrared beam detectors ("lasers") and PIR motion-sensor lights, as specified in docs/kestrel/S0-security-spec.md and built by prompts S1-S4. No other new systems.
- Critical path (insertion to extraction along the shortest stealth route, visiting the objectives in order) 380-550 m.
- Greybox only: boxes, no art, no textures, no sound work.

## 3. Authority
Michael > this file > APPROVED stage documents in docs/kestrel > docs/level-design.md > docs/design/scale-sheet.md > CLAUDE.md > code. A stage document counts only when its first lines say `Status: APPROVED`.

## 4. Do not open (failed earlier designs; reading them carries their mistakes into this map)
- docs/prompts/exchange-*.md, docs/prompts/exchange-plans/, docs/prompts/first-playable.md, docs/archive/ (including docs/archive/maps/, where D0 moved the old map docs)
- everything in docs/design/ EXCEPT docs/design/scale-sheet.md and docs/design/dead-line-v2-engine-check.md
- docs/gates/
- src/world/maps/exchange.ts, deadLine.ts, deadLine.geo.json, deadLineV2.ts, deadLineV2.geo.json, trunkAnnex.data.json
- scripts/gen-dead-line*.mjs, scripts/e2e-fp-*.mjs, scripts/g1*.mjs
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
- Precondition: docs/kestrel/09-build-contract.md is APPROVED, and `git hash-object docs/kestrel/kestrel.arch.json docs/kestrel/kestrel.play.json docs/kestrel/kestrel.security.json` matches the hashes in the contract. If not, stop.
- All geometry, gameplay and security data come from the three JSON files (arch, play, security). Copy them to src/world/maps/ under the same names. A unit test (tests/kestrelMap.test.ts) checks that the copies equal the docs files.
- No coordinate is typed into TypeScript. src/world/maps/kestrel.ts only reads the JSON and derives positions with the rules in section 6.
- Tests every step: `timeout 900 npm run check`, then `timeout 900 npm run build`, then `timeout 1500 npm run e2e:quick`. The map's suite is scripts/e2e-kestrel.mjs, registered in REQUIRED and COVERS in scripts/run-e2e.mjs.
- The report lists every contract item for the step as DONE or NOT DONE (with the reason).
