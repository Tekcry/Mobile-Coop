# 00_PROGRESS - running checklist

Read this first after any context compaction. Continue from the first unchecked item.

## Conventions
- Research notes from parallel agents: docs/research_notes/*.md (raw, sourced, tagged).
- Confidence tags: [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN].
- Phase 4+ files: zero IP (no original game names/characters/gadgets/missions/locations).

## Phase 1 - Source discovery
- [x] Establish full co-op mission list across all versions -> 01_sources.md (VERIFIED)
- [x] 01_sources.md built (curated register + 673-URL appendix)
- [x] 02_coverage_matrix.md built
- [x] Commit Phase 1

## Phase 2 - Deep research
- [x] 03_coop_overview.md
- [x] 04_mission_breakdowns/*.md (8 files incl. ngage_ds_campaign)
- [x] 05_coop_moves_catalogue.md (DLC rows point to 04; revisit after Nuclear/UN notes)
- [x] 06_gadgets_and_tools.md
- [x] 07_objectives_taxonomy.md
- [x] 08_level_design_patterns.md
- [x] 09_pacing_and_flow.md
- [x] 10_ai_detection_and_alarms.md
- [x] 11_wow_moments.md
- [x] 12_anti_patterns.md
- [x] 15_music_and_atmosphere.md (USER ADDED: deep dive on music/sound/atmosphere; source research_notes/music_and_atmosphere.md)
- [x] Gap-closing pass + coverage matrix update
- [x] Commit Phase 2

## Phase 3 - Analysis
- [x] 13_principles.md (drafted during gap pass; revisit after gap results)
- [x] 14_translation_guide.md
- [x] Commit Phase 3 (13/14 revised after gap pass: principles 35-36)

## Phase 4 - Design bible
- [x] DESIGN_BIBLE.md
- [x] MISSION_TEMPLATE.md
- [x] LEVEL_DESIGN_PROCESS.md
- [x] LEVEL_REVIEW_CHECKLIST.md
- [x] Commit Phase 4 (IP check via raw/ip_check.sh: clean)

## Phase 5 - Prompt library
- [x] PROMPT_LIBRARY.md (19 prompts: P0-P13 + U1-U5)
- [x] Commit Phase 5

## Phase 6 - Proof
- [x] example_mission_outline.md (data centre 'Load Test'; checklist recorded; IP clean)
- [x] Final self-review (contradictions, IP leakage, tags, matrix)
- [x] README.md
- [x] Mark complete + final commit

## Log
- **COMPLETE (2026-10-17).** Final self-review done:
  - Contradiction scan: stale claims fixed. One error caught in my own gap-pass edit: map settings count *spare* magazines, so the "no ammo" reading was wrong and was reverted. The wiki loadouts are now cross-verified.
  - IP scan of all six design-kit files: NO HITS.
  - Tags present throughout (about 500 VERIFIED, 360 SINGLE SOURCE, 57 UNCERTAIN).
  - Matrix extended with analysis and background rows.
  - README written.
  - Not pushed (per brief).
- Gap pass folded into 03-06, 10, 11, 15, mission files, OPEN_QUESTIONS (restructured with status), 01 (§2h + Appendix A rebuilt, 746 URLs), 02. NEXT: revisit 13/14 for gap findings, commit Phase 3, final self-review, README.
- TODO in final review: OPEN_QUESTIONS.md R-xx entries were appended under 'Design decisions' -> move them under 'Research gaps' and add status (open/closed/upgraded) from gap results. README treated as cross-cutting index (may name original; design files stay IP-free).
- Example mission done. NEXT: wait for gap agents -> fold results; then final self-review (contradictions, IP scan of Phase 4+ files incl. README, tag check of 03-15, matrix), README, mark complete.
- Phase 5 done. NEXT: example_mission_outline.md (modern data centre? check originality vs original missions), then fold gap results, final review, README.
- 15:52 UTC: resumed after usage-limit cutoff. Gap agents (gamefiles, community) resumed via SendMessage; outputs research_notes/gap_closing_gamefiles.md and gap_closing_community.md. When both done: fold findings into 03-15 + OPEN_QUESTIONS + matrix, then commit 'Phase 2 complete'. Meanwhile: LEVEL_REVIEW_CHECKLIST.md next, then PROMPT_LIBRARY.
- Phase 1 complete. NEXT: gap-closing pass (targets: R-05 PS2 training, R-11 partner marker, R-12 co-op designer credits, R-19/R-20 DLC routes, R-21 co-op music, R-07 checkpoints, R-10 difficulty). Use curl/WebFetch (WebSearch quota may be exhausted).
- All Phase 2 topic files written. NEXT: Phase 1 finish (merge sources from all research notes into 01_sources.md; fill 02_coverage_matrix), then gap-closing pass, commit Phase 2.
- All console mission notes in. Done notes: videos, music_and_atmosphere, stealth lit, real-world security. Bonus-disc dev diary transcripts (speech-to-text) in scratchpad/bonus/*.mp4.txt (Hocking level-design diary, sound diary, AI diary, documentary) - use for 08/09/15.
- Done notes: dev_and_design_intent, reception (+ earlier). Pending agents: training/panama, seoul/bunker, train/nuclear/UN, videos, music, ngage_ds, stealth lit (file exists, maybe final), real-world security.
- Found N-Gage/DS separate 5-part co-op campaign; agent writing research_notes/mission_ngage_ds.md -> 04_mission_breakdowns/ngage_ds_campaign.md. NOTE: WebSearch quota may be exhausted for this session; use curl (Fandom API, archive.org metadata/download, steamcommunity, YouTube) and WebFetch.
- Done notes so far: coop_moves, coop_gadgets_controls_comms, platforms_versions, systems_rules.
- Key primary sources found: Prima eGuide OCR raw/ia/prima_eguide.txt, PS2 manual OCR raw/ia/ps2_manual.txt, Xbox manual images raw/ia/xbm/. Done notes: coop_moves, coop_gadgets_controls_comms.
- Auto-resume scheduled for 2026-10-17T15:59Z (session limit). On resume: read this file, check research_notes/ for missing/incomplete notes (relaunch agents for missing ones using research_notes/_AGENT_BRIEF.md), then continue.
- USER REQUEST (mid-run): include a deep dive into music/atmosphere. Actions: agent writes research_notes/music_and_atmosphere.md -> Phase 2 file 15_music_and_atmosphere.md; carry audio/atmosphere into 13_principles, 14_translation_guide, DESIGN_BIBLE (audio & atmosphere section), MISSION_TEMPLATE (soundscape/lighting fields), LEVEL_DESIGN_PROCESS (Audio/Atmosphere Designer step), LEVEL_REVIEW_CHECKLIST (audio checks), PROMPT_LIBRARY (soundscape prompt), example mission (soundscape plan), coverage matrix rows.
- Phase 1: 8 background research agents launched writing to docs/research_notes/: mission_training, mission_panama, mission_seoul, mission_chemical_bunker, mission_train_station, mission_nuclear_plant, mission_un_hq, coop_moves, coop_gadgets_controls_comms, dev_and_design_intent, reception, platforms_versions, systems_rules, videos, stealth_coop_design_literature, real_world_security_and_architecture. When all exist, merge sources into 01_sources.md, fill 02_coverage_matrix.md, commit Phase 1, then write Phase 2 files from notes.
- Raw wiki cache: raw/wiki (gitignored). Helpers raw/wget.sh (Fandom API), raw/yt.sh (YouTube search).
- Setup: git init, docs/ created.
