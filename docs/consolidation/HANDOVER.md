# Consolidation handover (2026-10-17, account switch mid-run)

Resume point for the consolidation run (M26 / M27, plan: docs/locomotion/CONSOLIDATE.md on feature/ct-locomotion).
Work folder: C:\NightShift\Mobile-Coop-integrate, branch integrate/consolidate (pushed). Start folder:
C:\NightShift\Mobile-Coop-locomotion, branch feature/ct-locomotion (STATE.md points here).

## Done
- Merges, one commit each, `npm run check` passed after each, pushed: feature/ct-locomotion (with kestrel),
  feature/footsteps, feature/weapon-audio, feature/music, feature/training-bunker (PROTOCOL_VERSION 11),
  feature/menu-ui-spec. ct-movement: its only missing commit 99da75b ("phone loads and plays on Low") is SKIPPED,
  superseded by desktop only. operators not included (by plan).
- Merge notes for the PR body are in each merge commit message (`git log --merges --first-parent origin/master..HEAD`).
- Audit (M27): docs/consolidation/AUDIT.md (186 findings, 41 high; all ASSUMED rows classified).
- Questions: docs/consolidation/questions.json + QUESTIONS.md (259 incl. 14 follow-ups and 103 review items).
  Phone page https://claude.ai/artifact/TtVdFW5skKpweFBHzt9tcD (owned by Michael's other account; answers are also
  exported here). Page answers: docs/consolidation/answers/page-answers.json (84; `choice` = index into that question's
  `opts` in questions.json, `note` = Michael's words, a note beats the pick).
- Michael's directive and 36 chat answers, VERBATIM: docs/consolidation/chat-answers.md. These override page answers.
  Headline: pure Chaos Theory mechanics AND look (original assets, original goggle, original names / story), 2-player
  co-op campaign only (not completable solo), research all CT co-op levels and recreate them, playable prototype first
  with no fine-tuning, Hunter the one non-CT exception, menus keep the Arkham plan, version 4.0.0, main is the only base.

## Was running when the account switched (check before continuing)
1. DONE (commit "consolidate: remove Wave, deathmatch, free-for-all"; log docs/consolidation/deleted-modes.md; PROTOCOL_VERSION 12, MAX_PLAYERS 4, save unchanged). Follow-ups for the next session: the co-op lobby default mode became Hunter (parked) - set it to the mission / infiltration mode; legacy e2e-progression fails at "Y customises the weapon" (before the edited code: check if it fails on the pre-deletion commit too, report only); lost coverage: solo death -> DEFEAT -> Play again, netmove shot at a client on a ledge (re-add in another mode if cheap). Original task: remove Wave, deathmatch ('tdm'), free-for-all ('ffa') and any PvP / traitor-versus code;
   KEEP Hunter ('clear', parked behind ?legacy=1), sandbox, infiltration, course, training. Docs untouched by it; it
   was to write a deletion log in the old scratchpad (lost). CHECK `git status` in the work folder: uncommitted src /
   tests / scripts changes are its partial work. Finish or redo it, `npm run check`, run smoke e2e-modes e2e-coop
   e2e-netmove e2e-missions (port 4191), commit "consolidate: remove Wave, deathmatch, free-for-all (Michael)".
2. DECISIONS draft: DONE, saved as docs/consolidation/DECISIONS-draft.md (G1-G113, deferred and unanswered lists, and an "Unclear, ask Michael" section U1-U10). Review it, ask Michael U1-U10 (native multiple-choice, rounds of 4), then move it to docs/DECISIONS.md. It was built this way: write docs/DECISIONS.md from chat-answers.md
   (highest), page-answers.json + questions.json, and still-current M12-M27 / training D entries. Format: G1, G2, ...
   entries, each quoting Michael verbatim with the question id; sections: vision in one page, decisions by area,
   settled by the directive, deferred (with where decided), earlier decisions that still stand / void, unclear.

## Unclear items: ANSWERED and APPLIED. docs/DECISIONS.md is final (G1-G118; U answers in G11, G24, G49, G75, G76, G111, G114-G118).

## Live state (2026-10-18, update at every commit)
- Subagent preamble: docs/consolidation/AGENT-PREAMBLE.md. Checker verdicts: docs/consolidation/checks/.
- DONE: DECISIONS.md final (9cbc9bc). 3a retired maps + lobby default Infiltration (f485ae3, PASS). 3b phone and touch,
  e2e as desktop (11dfad9, PASS; e2e-foley now known flaky). Late docs merges footsteps (5135538) and music (a5d2cfe).
  3c(i) emotes (2b8758e; PROTOCOL 13, SAVE 9) and old solo Training (94be374), PASS.
  3c(ii) non-CT guns + e2e-pad capture fix (e9ac457, clean; guards carry the kept models).
  3c(iii) drone + difficulty sliders + carried medkits (3c7c2a5, one commit: shared files; PASS; station heal +40 ASSUMED).
  Step 4 docs D1-D4 (e1657f4).
  D5 name scrub (5bd3634); version 4.0.0 + CHANGELOG (6a28eaf). Full e2e: check passes; kestrel + camera-bounds U
  (Kestrel-owned); mouse, course pass solo; bunker failed solo on its logged-flaky teleport check; coop, foley known flaky.
- RUNNING: fixer for e2e-anim (deterministic: pose channels continuous through every transition, max 0.137) - likely
  from 3c7c2a5 (medkit state / anim graph) or e9ac457. If the session died: git status shows its work; rerun e2e-anim solo.
- NEXT: commit the fix, rerun e2e-anim + e2e-bunker solo, then gh pr create (body drafted in the orchestrator's
  scratchpad pr-body.md; if lost, rebuild from the merge commits, deleted-*.md, AUDIT.md Summary, DECISIONS.md), then
  STATE.md on feature/ct-locomotion.
- Known: e2e-course failed once under load (lever door 1994 ms > 500), passed solo; legacy e2e-progression fails at
  "Y customises the weapon" (report only); kbm flashbang white-out 0.00 (pre-existing); full runs use E2E_SUITE_TIMEOUT=900.

## Still to do (in order)
3. Deletions in this merge (Michael: "In this merge"), one code agent at a time (opus):
   a. retired maps: Exchange, Trunk Annex, Dead Line v1 and v2 (code, map list, e2e suites); their design docs
      move to docs/archive (Michael: archive the docs; tests deleted with the code).
   b. phone and touch: touch input and layout editor, touch settings, phone look and phone render paths, phone
      budgets / perf --phone, e2e-touch; switch the e2e launcher from Pixel 7 phone emulation to desktop (PLAT-02).
   c. Michael (U3, U4, U10): ALSO in this merge: emotes, the old solo Training mode, every gun outside the CT kit
      (one rifle with attachments, one pistol, the knife), the tri-rotor drone, custom difficulty sliders (back to
      fixed difficulties), carried medkits (wall stations only). Hunter stays. Each its own commit, check + affected e2e.
   Later (CT prototype / conversion): grab menu, HUD gear / stance icons, door menu, CT pad layout, goggle changes.
4. Rewrite docs on integrate/consolidate to one current vision from docs/DECISIONS.md: CLAUDE.md (incl. a "Running a
   job" section, branch flow main-only, authority order, desktop only, CT co-op directive), docs/design-bible.md,
   docs/progress.md (ordered job list: CT co-op research, CT prototype, then the rest), docs/systems/*.md, TESTING.md
   (short current desktop list + release list), level-design.md Section 12. Old run decision files get a line
   pointing to docs/DECISIONS.md. Scrub reference character / gear names from docs (VIS-06 banned everywhere; the
   game title as reference and Michael's quotes are an open question FU-12: keep quotes verbatim until answered).
5. `npm run build`, then full `E2E_PORT=4191 E2E_JOBS=2 npm run e2e` in the background (port rules: RULES.md
   "Port 4189"). Known flaky and kestrel-owned failures as docs/locomotion/RULES.md; fix only what the merges or
   deletions broke.
6. Version 4.0.0 in package.json, one CHANGELOG entry listing what came in and what was deleted.
7. `gh pr create` integrate/consolidate -> master (do NOT merge). Body: merges, conflict resolutions (from the merge
   commits), skipped 99da75b, deletions, audit summary, decisions summary, check / e2e results, "operators not
   included", the after-merge plan (CONSOLIDATE.md) plus the CT co-op research job and the CT prototype job.
8. Record the PR link and results in docs/locomotion/STATE.md on feature/ct-locomotion, push.

## Resume prompt (paste into the new account, Opus, High effort)
Consolidation run: RESUME (local). You are the orchestrator (docs/systems/session-method.md).
0. Branch guard: start folder C:\NightShift\Mobile-Coop-locomotion must be on feature/ct-locomotion (git pull --ff-only);
   work folder C:\NightShift\Mobile-Coop-integrate must be on integrate/consolidate (git pull --ff-only). Push only
   integrate/consolidate and feature/ct-locomotion. Never merge into master; never touch other folders or branches.
1. Read CLAUDE.md, docs/consolidation/HANDOVER.md (this file: follow "Was running" then "Still to do" in order),
   docs/consolidation/chat-answers.md, docs/locomotion/CONSOLIDATE.md, docs/locomotion/RULES.md "Port 4189",
   "Speed on the desktop", "Desktop tuning".
2. Continue unattended; ask Michael (native multiple-choice) only for the "Unclear" items the DECISIONS draft finds.
3. Stop after step 8 and tell Michael in plain English: PR link, what merged, conflicts and resolutions, deletions,
   audit summary, decisions recorded, test results, anything unclear. No em dashes.
