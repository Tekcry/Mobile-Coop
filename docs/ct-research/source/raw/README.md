# Co-op stealth research and design pack - README

This folder holds two things:
- **Research.** A study of the two-player co-op mode of *Splinter Cell: Chaos Theory* (2005) on every platform: Xbox, PC, PS2, GameCube, N-Gage and DS.
- **Design kit.** An original design bible, process, checklist and prompt library for a new third-person co-op stealth game, built from that research.

**IP boundary.**
- This README and the research files (00-15, `04_mission_breakdowns/`, `research_notes/`, `OPEN_QUESTIONS.md`) name the original game.
- The design kit (`DESIGN_BIBLE.md`, `MISSION_TEMPLATE.md`, `LEVEL_DESIGN_PROCESS.md`, `LEVEL_REVIEW_CHECKLIST.md`, `PROMPT_LIBRARY.md`, `example_mission_outline.md`) contains no names, characters, gadget names, missions, locations, dialogue or layouts from it. It was checked with a banned-term scan, which found no hits.
- Hand the design kit to a team or an AI tool without the research files if you want zero exposure to the original.

**Confidence tags.** Research claims carry one of these:
- [VERIFIED - 2+ sources]
- [SINGLE SOURCE]
- [UNCERTAIN]

Unresolved facts are in `OPEN_QUESTIONS.md`. Source text was paraphrased, not copied. All 746 source URLs are in `01_sources.md`.

---

## 1. Reading order

**If you only have an hour**, read:
1. this README;
2. `13_principles.md`;
3. `DESIGN_BIBLE.md`;
4. `example_mission_outline.md`.

**To design a mission:**
1. `DESIGN_BIBLE.md`
2. `LEVEL_DESIGN_PROCESS.md`
3. `MISSION_TEMPLATE.md`
4. `PROMPT_LIBRARY.md`
5. `LEVEL_REVIEW_CHECKLIST.md`

**To understand the original co-op mode:**
1. `03_coop_overview.md`
2. `04_mission_breakdowns/` (Training, Panama, Seoul, Chemical Bunker, Train Station, Nuclear Plant, UN HQ, then the handheld campaign)
3. `05` and `06`
4. `10`
5. `11` and `12`
6. `15`

## 2. What each file is

| File | Purpose |
|---|---|
| `00_PROGRESS.md` | Run checklist and log |
| `01_sources.md` | Verified co-op mission list per platform; curated source register; Appendix A with every URL (746) |
| `02_coverage_matrix.md` | Each research topic → sources found → confidence → where it is covered |
| `03_coop_overview.md` | Structure, modes, rules, controls, communication, platforms, praise and criticism, gap-pass update (§12) |
| `04_mission_breakdowns/*.md` | One file per co-op mission: premise, objective chain, ordered progression, space, security, split/regroup, pacing, wow moments, frustrations, loadout, videos |
| `05_coop_moves_catalogue.md` | Every two-person move and team interaction, with use counts and design value |
| `06_gadgets_and_tools.md` | Gear in co-op, per-mission loadouts (cross-checked against the game's own files) |
| `07_objectives_taxonomy.md` | Objective types and how they chain |
| `08_level_design_patterns.md` | 25 recurring level patterns (P1-P25) |
| `09_pacing_and_flow.md` | Beat rhythm, set-piece spacing, mission length |
| `10_ai_detection_and_alarms.md` | Light, sound, vision, alarm stages, hard fails, saves |
| `11_wow_moments.md` | What players and critics remember, with a recipe for making such moments |
| `12_anti_patterns.md` | What failed, including an unrealistic-architecture section and red flags |
| `13_principles.md` | 36 design principles, each with evidence and a pass/fail test |
| `14_translation_guide.md` | Original feature → generic concept → setting-dependent options |
| `15_music_and_atmosphere.md` | Deep dive on music, sound and visual atmosphere (added at your request), including which music sets each co-op map loads |
| `OPEN_QUESTIONS.md` | Research gaps R-01-R-23 with status; design decisions D-01-D-14 |
| `DESIGN_BIBLE.md` | Philosophy, pillars, verb set, principles, fairness, realism, pacing, objectives, beats, wow and audio rules; trade-offs for each decision (§12, not chosen) |
| `MISSION_TEMPLATE.md` | The fill-in document every new mission uses |
| `LEVEL_DESIGN_PROCESS.md` | Steps 0-13 with named roles, inputs, outputs and gates |
| `LEVEL_REVIEW_CHECKLIST.md` | MUST/SHOULD checks A-M, including an originality check |
| `PROMPT_LIBRARY.md` | Self-contained AI prompts: one per process step (P0-P13), plus concept brainstorm, set piece, wow moment, level audit and originality check (U1-U5) |
| `example_mission_outline.md` | "Load Test", an original data-centre mission that passes the checklist, with the review record |
| `research_notes/` | Raw research by topic, with the full source list for each. `gap_closing_gamefiles.md` holds the primary game-file evidence |

## 3. Top 10 findings

1. **It was a separate campaign built for two, and that is why it is remembered.**
   - Xbox/PC had Training, four story missions and two free downloadable missions, all made for two players, not a solo game with a second body.
   - PS2/GameCube cut the same missions into small sub-levels, and the handhelds had their own five-part campaign.
   - Players still say "it truly needed both of us" and contrast it with later series co-op. [VERIFIED]
2. **The two-person moves are the heart of it.**
   - The partner throw, the boost and human ladder, and the inverted rope hang are the most-praised features.
   - Their weakness was that the authored ones work only at fixed spots, so critics called them "elaborate keys". [VERIFIED]
3. **Simultaneous actions make the tensest moments, and the most confusing ones.**
   - Examples are synchronised wire cuts, paired scanners and the jam-and-run past cameras.
   - The Train Station bomb is both the tensest beat and the most-asked "how do we do this?". Clear shared-device inputs are essential. [VERIFIED]
4. **Asymmetry came from kit and position, not from character classes.**
   - The two agents were identical but carried complementary loadouts.
   - The kit tracked each mission's tone. The no-kill finale gives both agents three of every non-lethal tool and no spare magazines. [VERIFIED - game files + wiki]
5. **Alarms escalated; they did not abort.**
   - On Xbox/PC, alarms raised guard armour and alertness in four stages. Only explicit mission rules caused instant failure.
   - The worst frustrations were hard fails with weak warning. [VERIFIED]
6. **Failure as a rescue.**
   - A downed agent has 30 seconds to be revived, and each agent carries one syringe, so a team gets two revives.
   - There were no automatic checkpoints, only manual saves that wait for the partner. This was the top structural complaint.
   - Players' favourite stories are rescues and funny failures. [VERIFIED]
7. **Your real voice was part of the stealth.**
   - Microphone speech fed the guards' hearing, and players lured guards by talking.
   - It is the most-loved systemic detail in community memory. [VERIFIED]
8. **Losing each other was a real problem.**
   - Reviewers complained of no map or partner marker.
   - The game files show a map page existed and that intel was shared, but no partner marker is documented. [VERIFIED / UNCERTAIN]
9. **The atmosphere was reused, and losing the voice was noticed.**
   - Each co-op map loads the shared music set plus one solo mission's stem set. There is no co-op score, but the ambiences are bespoke.
   - Both downloadable missions shipped with the handler's lines as text only, and players missed the voice. [VERIFIED]
10. **Spaces worked when their logic and state were readable.**
    - Machine-state puzzles were memorable when the state was clear and stalled players when it was not. One example is stopping fans so a duct becomes a route.
    - Players called the co-op maps smaller and brighter than the solo levels. [VERIFIED / SINGLE SOURCE]

## 4. Videos to watch

None of these were watched by the researchers; they were catalogued from titles, descriptions, chapters and comments. The full catalogue (about 235 videos) is in `research_notes/videos.md`.

**Top 10 for a level designer** (`videos.md` §7):
1. Training, 100% Elite (hexen2k7): https://www.youtube.com/watch?v=WQ__XNyWP0M
2. Panama, 100% ghost (V339): https://www.youtube.com/watch?v=KlU0002suD4
3. Train Station with timestamped beats (Suru): https://www.youtube.com/watch?v=-JnlamHBZrc
4. PS2 Seoul (Ziggity): https://www.youtube.com/watch?v=__LRg8KrYQ8, and PS2 Chemical Bunker: https://www.youtube.com/watch?v=qLQEHSaRECM
5. Chemical Bunker 1/2 (hexen2k7): https://www.youtube.com/watch?v=chb66dBOt74, and 2/2: https://www.youtube.com/watch?v=ILxhYQ1BHc0
6. Full co-op campaign, 7h22 (DeepVelocityOps): https://www.youtube.com/watch?v=4GtVpbf1xAw
7. "The Co-Op Experience" critique (Lawerenceofalevi): https://www.youtube.com/watch?v=KCOcnYpCD0s
8. E3 2004 co-op showcase: https://www.youtube.com/watch?v=IIfns1gvSRY, and E3 gameplay: https://www.youtube.com/watch?v=11-wUk-tLaY
9. PS2 bonus-DVD level-design diary: https://www.youtube.com/watch?v=yxzr8K95RQ0
10. "The most cursed co-op game" (ParagonMitchell): https://www.youtube.com/watch?v=SwxTLoWn5e4, and the Retro Spectives co-op podcast: https://www.youtube.com/watch?v=3G7D5CjM6RU

**The rest, by mission:**
- **PS2 Team Training:** https://www.youtube.com/watch?v=obcKEeRniRw
- **Seoul (Xbox):** https://www.youtube.com/watch?v=A9qRzUt9RtE
- **Train Station:** https://www.youtube.com/watch?v=2X5MvQPOQ14
- **Nuclear Plant:**
  - https://www.youtube.com/watch?v=OBU3MtaoKb4
  - https://www.youtube.com/watch?v=phfqPfdFZdQ
  - blind first play: https://www.youtube.com/watch?v=xFO_ntoDVBY
- **UN Headquarters:**
  - https://www.youtube.com/watch?v=5RBmv-nRtTs
  - original Xbox: https://www.youtube.com/watch?v=yQH90XJtxTY
  - https://www.youtube.com/watch?v=3CH1BrvzlPA
- **Handheld (DS) campaign:** https://www.youtube.com/watch?v=jnQ74p1Klf8

## 5. Questions for you to answer

### 5a. Design decisions (these shape everything)

**Answered 2026-10-18.** The choices are in `OPEN_QUESTIONS.md`; the trade-offs are in `DESIGN_BIBLE.md` §12.

| ID | Decision |
|---|---|
| D-01 | Setting and era: modern, near future, historical or stylised |
| D-02 | Alarm rule: escalating tiers, strict N-alarm fail, or per-mission hard rules |
| D-03 | Failure model: revive window and count, checkpoint spacing, both-down rule, rejoin |
| D-04 | Violence stance: lethal, non-lethal only, or scored; how interrogation is depicted |
| D-05 | Lethal automated defences: allowed or not |
| D-06 | Should guards hear players' real microphones? (loved in the original; privacy and platform cost) |
| D-07 | Athletic tone: grounded or heightened partner moves |
| D-08 | What harder difficulty changes |
| D-09 | Strictly two players, an AI partner for solo, or 2-4 players |
| D-10 | Split-screen, online, LAN, cross-play |
| D-11 | Identical characters with complementary kits, fixed classes, or player-built loadouts |
| D-12 | Partner awareness UI: beacon only, marker, shared map, pings |
| D-13 | Story framing: parallel to a solo campaign, standalone, or a mission set |
| D-14 | Camera: shoulder or free; corner-peek method |

### 5b. Research gaps a human could close in an afternoon (with a copy of the game or the videos above)

- **R-09.** Must both players reach extraction?
- **R-11.** Is the partner shown on the map?
- **R-02.** Does the remote hacking device work in co-op?
- **R-06.** How do guards handle two intruders? Do they share knowledge?
- **R-10.** Does difficulty change guard perception?
- **R-22.** Does partner voice fade with distance?
- **R-19 / R-20.** The two downloadable missions:
  - how the scanner doors are passed;
  - what the "lit windows" failure rule means;
  - how the final bomb is defused.

Full status for all 23 items is in `OPEN_QUESTIONS.md`.

## 6. Method notes

- **Primary sources.** These carried the most weight:
  - the Xbox and PS2 manuals;
  - the official strategy guide;
  - the bonus-disc developer diaries;
  - game text and settings from preserved retail and development builds (read only, never run).
- **Community and press.** About 27 critic reviews, Steam reviews and threads, Reddit (through an archive API) and YouTube comments.
- **Blocked sites** and the workarounds used are logged in `01_sources.md` §2g.
- **Commits.** Work was committed phase by phase and not pushed.
