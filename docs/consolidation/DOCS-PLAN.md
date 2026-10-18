# Consolidation step 4 - docs rewrite plan (2026-10-18)

Goal: master states one clear, current vision with no contradictions (M27). Source of truth: docs/DECISIONS.md
(G1-G118). Evidence of what each doc says wrong: docs/consolidation/AUDIT.md (file:line findings). What was deleted:
docs/consolidation/deleted-*.md. Run after every step-3 deletion is committed.

## Rules for every docs agent
- Read docs/consolidation/AGENT-PREAMBLE.md (branch guard, no commits), docs/DECISIONS.md in full, and the AUDIT.md
  sections for your files (grep your file names).
- Edit only your assigned files. Never edit docs/kestrel/**, src/editor/**, src/world/maps/kestrel*, src/security/**.
- Write current rules, not history: delete text about removed systems (phones and touch, Wave, PvP, deathmatch,
  free-for-all, retired maps, emotes, the old solo Training, the drone, difficulty sliders, carried medkits, the 14
  deleted guns, Blacklist systems, the ct-movement -> dev -> master flow, Sonnet-builds, bot partner, 3-4 players,
  solo campaign, traitor finale). Where history matters, one line pointing to the archive or the git log.
- Mark tunable numbers as starting values tuned after the prototype (G10). Cite G numbers where a rule comes from one.
- Name ban (G6, G114): no reference-game character, gear or organisation names in what you write or keep. "Chaos
  Theory" / "CT" may name the reference. Michael's quotes stay verbatim.
- Hyphen, never an em dash. Plain English. Keep files short: a rule once, in the doc that owns it; others link.
- `npm test` must pass after your edits (tests/input.test.ts checks the binding table in docs/systems/input-and-loop.md).
- Report: files changed, sections removed / rewritten, anything you could not resolve from DECISIONS.md.

## Agents (D1-D4 in parallel on disjoint files; D5 after them)
- D1 process and entry: CLAUDE.md (one vision: pure CT co-op directive, 2 players, desktop only, authority order G86,
  main is the only base G83, one chosen preview G85, a "Running a job" section G87 / G88 / G94 pointing to
  docs/systems/session-method.md, version rules G93, definition of done without phone items, module map and doc index
  current, hard rules current: voice G82, CC0 audio G58), docs/progress.md (ordered job list G90: CT co-op research,
  CT prototype, then the rest with branch, folder, status; phase logs moved to docs/archive/progress-phases.md),
  docs/systems/deploy.md, docs/systems/session-method.md, docs/backlog.md, docs/story.md (G9, G74, G82, G112; "Decide
  with missions" items stay open), and a one-line pointer to docs/DECISIONS.md at the top of docs/locomotion/DECISIONS.md,
  docs/training/DECISIONS.md, docs/menu-ui/DECISIONS.md and the audio progress logs.
- D2 the bible: docs/design-bible.md rewritten to the current vision (G10: rewrite now); every G decision reflected;
  removed systems deleted; Section 6 lists what is out of scope; process section points to session-method.md.
- D3 systems, part 1: docs/systems/{movement,ct-toolkit,input-and-loop,takedowns,gadgets,combat,ai,lighting}.md.
- D4 systems, part 2 and tests: docs/systems/{graphics-quality,performance,testing-tools,ui,coop,saves,
  modes-and-progression,world-and-characters,audio,conventions}.md, docs/level-design.md Section 12 (engine facts after
  the deletions and G40 / G54), TESTING.md (G92: one short desktop checklist plus a release checklist; old lists moved
  to docs/archive/testing-history.md).
- D5 name scrub: every remaining doc outside docs/kestrel/** and docs/archive/** (run docs: docs/locomotion,
  docs/training, docs/audio, docs/menu-ui, docs/design, docs/consolidation except Michael's quotes) plus src/ and
  scripts/ strings and comments: replace reference-game character, gear and organisation names with neutral words.
  Report hits in docs/kestrel/** without editing them.
