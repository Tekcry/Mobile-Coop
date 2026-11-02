# Night Shift - rules (read first, every session)
Owner: the orchestrator. Status: current. Approved by Michael 2026-11-02 (N44); changes only with his yes.

The previous process rules are history: `docs/archive/RULES-2026-10.md`.

## The goal
A fun, playable 2-player co-op stealth game. Every session moves the playable game forward. Documents serve the next
build, never the other way round.

## 1. Every session ends with something Michael can try
- A playable change (menu path, what to look for) or a test result (the automated run report: screenshots, frame rate).
- A session that will end with neither needs Michael's yes first (one native question saying why).

## 2. Build before documents
- No new document unless the next build needs it.
- Documents change only to record a decision or a test result (one line: date, source).
- No reorganising, renaming or polishing documents without Michael's yes.

## 3. Research only to unblock a build decision
- Before starting: name the decision it unblocks and a time box (default 30 minutes). Report the answer, not a survey.

## 4. Check against code and builds
- Claims are checked by reading the code or running the game, never by comparing documents with documents.

## 5. Provisional until played
- Design numbers and choices (guard counts, recipe numbers, timings, music identity) are marked "(provisional)" until
  a playtest confirms them. A playtest result that contradicts one goes to Michael.
- Research lessons are hypotheses; each becomes a playtest question.

## 6. Prototype standard (Michael, not negotiable)
- Every prototype build has textured materials (generated, or free-licence with credit rows), real lighting (a key
  light plus ambient or environment light) and working shadows on characters and level geometry. No untextured grey
  boxes. Existing or free assets first; custom art later.
- "Playable" = two players join, move, do one two-person action, get spotted by a guard, fail and retry, all in a
  textured, lit, shadowed space.

## 7. The automated run (every change to the game)
- Runs hidden on the laptop GPU (Edge, `E2E_GPU=1`, never a visible window, N8): the build loads, both players spawn
  and join, a two-person action completes, a guard spots a player and a retry works. Screenshots prove textures,
  lights and shadows render; frame rate is recorded and compared with the last build.
- A failed run blocks the merge. The report goes in the pull request and the session's end note.

## 8. Stop and ask
- About to polish, reorganise, research or plan instead of build: stop and ask Michael first.
- Anything his words don't settle: ask first (N12).

## 9. Sessions, usage and overnight
- One main session; helpers as needed (at most 2 at a time, each with a narrow brief), reporting back to it.
- One account per 5-hour window. When the limit is hit, Michael swaps accounts and pastes the resume prompt; the
  control panel holds the state, so nothing is lost.
- When Michael asks for a full-burn window, spend it on the queue's next build items only: no side projects, no extra
  documents, no research beyond rule 3. Nothing snowballs.
- Stay on the queue, in order. A new idea goes to Parked in `docs/plan/SCOPE.md`, with one line to Michael.
- **Overnight (Michael asleep):** work the queue unattended and never sit stuck. A blocked item is logged on the panel
  and skipped for the next item that does not need him. An implementation choice his decisions don't cover takes the
  recommended option and is listed on the panel for his morning review (N19); a rule, a design limit or anything
  irreversible (deleting, spending, publishing) waits for him (N12). Pull requests merge when every check is green
  (N27).

## 10. Working with Michael
- Plain English, short dot points, hyphens. Native multiple-choice questions only. One action block per message.
  He tests through the menus.

## 11. Process
- Branch, pull request, GitHub checks (lint, unit tests, build), merge when every check is green; never auto-merge.
- Locally only targeted tests plus the automated run (rule 7). Live state on the pinned control panel issue.

## 12. What to read
- At start: this file, the control panel, `CLAUDE.md` (code rules). Everything else only when the task needs it:
  `docs/plan/DECISIONS-2026-11.md` (Michael's decisions), `docs/plan/VISION-DRAFT-v3.md` (provisional),
  `docs/plan/MASTER-PLAN.md` (the current phase), `docs/plan/MISSION-TEMPLATE.md` (maps), `docs/story.md` (story).
- History, not binding (N45): `docs/DECISIONS.md`, `docs/design-bible.md`, `docs/level-design.md`,
  `docs/design/scale-sheet.md`, `docs/templates/map-spec.md`, `docs/VISION.md`, the old research. Read them only for a
  specific fact. Michael's feedback from them: `docs/plan/FEEDBACK-RECORD.md`; their technical facts: the TECH rows in
  `docs/plan/old-decisions/`.
