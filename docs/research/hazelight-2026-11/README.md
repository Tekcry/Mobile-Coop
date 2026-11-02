# Hazelight co-op research (2026-11): what Night Shift takes
Owner: the orchestrator. Status: current.

Michael asked for it (N29, 2026-11-02): "I think this will be a critical step to making a fun and unique 2 player coop
game." Two research helpers, about 160 sources, deeper than `docs/research/hazelight-steam-music-2026-11.md`
sections A-C:
- `gameplay.md` - It Takes Two and Split Fiction: chapter-by-chapter co-op catalogue, teaching, keeping both busy,
  staying together, failure, prompts, pacing, reuse vs churn, technical, complaints.
- `story-process.md` - A Way Out chapter by chapter, Brothers: A Tale of Two Sons, split-screen storytelling, the two
  temperaments, the endings, writing craft, the studio's process, Friend's Pass and sales.
Claims marked [verify] rest on one weak source; several primary sites blocked automated reading (noted in each file).

## Michael's decisions from this research (2026-11-02)
- **Same abilities for Wren and Moth; roles come from the situation** (A Way Out's leads play identically; personality
  comes from banter) - D11.
- **The ending and its early hints are written in Phase 1**, and the ending stays co-operative (Brothers and A Way Out
  fixed their start and end before production).
- **A recurring theme carried as sound and rhythm** (It Takes Two had no recurring theme and its score did not stick) -
  D15.

## Adopt
1. **One ruleset; only the situation changes.** In both games only movement carries over between chapters. For us the
   stealth kit stays fixed; variety comes from places, guards, light, mission rules and one mission toy.
2. **Fairness is an arc, not a moment.** Balance comes from alternating who sets things up and who carries them out,
   beat to beat (a 2026 study of 30 players). The beat chart tags both.
3. **Lock each half of a two-person beat to one player** (where they stand, what they carry, a target in their colour
   with an icon). Never one shared prompt both can press.
4. **Teach in four steps:** safe solo use, one handover, a hold, then both under time pressure. Keep tutorials short.
5. **Fix a dull role with pressure, not buttons** (It Takes Two made enemies target the under-used player).
6. **A lone failure is cheap; only joint failure costs progress; never shared health.** Keep the downed player busy
   (ping, watch, hold on).
7. **A "both ready" ring** (each player fills half) for two-person actions, cutscene skips, mission start, extraction.
8. **Never trigger on one player's position** - also for radio lines and music changes.
9. **Set-piece formula:** split the information, split the doing, finish with timing. Save the most expensive idea for
   one late mission; show a big scene once.
10. **One radio line at a time for both players;** every line and sound has an owner. Banter reacts to what just
    happened, is silent on alert, and never spells out a solution (too little in A Way Out, too much in Split Fiction).
11. **A story beat for one player gives the other a short task** (A Way Out's cutscene-for-one, adapted to text radio).
12. **One short optional quiet beat per night** (A Way Out's fishing and waterfall bench were its most loved moments).
13. **Joint approach choice** labelled with each character's name, both must agree, no middle way, plus a cheap echo
    next night (critics called A Way Out's choices consequence-free).
14. **Pair-testing:** count silent stretches, ask whether they knew they co-operated, pair a strong and a weak player,
    no story feedback early; testers never set the vision.
15. **Prototype fast, ask early whether it can reach polish, expect to cut 20-30%.**
16. **Story beats first, but play wins a tie:** if a step is not fun, the story beat changes, not the stealth rules.
17. **One copy for two;** a guest's progress carries over if they buy; a dropped player reconnects to the last
    checkpoint rather than ending the session.
18. **One difficulty plus assists:** reduced damage, skip to the next checkpoint with a confirmation, holds instead of
    mashing, per-player remapping, an aim dot, camera shake off.
19. **One shared music state for the pair;** a stinger belongs to the player who caused it.
20. **Two views cost two renders:** profile split-screen early and skip costly features.

## Avoid
- Turning the players against each other at the end (A Way Out's finale split players; skill decided the story).
- Secret story knowledge for one player (one couple's A Way Out run ended in days of anger).
- Bosses built on "do X three times"; late forced shooting galleries.
- A comic helper who spells out solutions; tonal whiplash; constant chatter.
- Hidden two-player inputs with no prompt on screen.
- Tutorial-heavy, cutscene-heavy openings.

## Challenges to our plan (each now in `docs/plan/DECISIONS-QUEUE.md`)
- **Online screen layout (D7):** Hazelight is always split, even online, yet its own finale talk says players rarely
  look at the partner's half, and in stealth a shared view leaks what only one player should see. Recommendation: full
  screen each, plus a partner view on demand or a small inset at holds and splits (render cost tested in Phase 2).
- **Revive limit (D10):** Hazelight has none and the evidence favours none, with the cost carried by noise, alert level
  and rating. Michael's 30 s, twice per mission stands until the Phase 4 test.
- **Gear choice (D9):** Hazelight assigns tools; free picks can duplicate and lose "only you can do this half".
  Option: two kit slots that must differ, or a suggested split.
- **Checkpoint spacing (D25):** Hazelight rarely costs more than about a minute; area-start checkpoints can cost
  several. Option: a soft checkpoint at every 2-4 minute beat.
- **Pause online (D26):** Split Fiction pauses both players at any time; our plan does not say.
- **Length (D13 final):** A Way Out runs 6-8 hours; prologue + 7 missions at 20-30 minutes is about 4 hours.
- **Compass (D8 stands):** Hazelight uses none, but "unclear objectives" is part of Split Fiction's top complaint, and
  we play full screen with several routes.
- **Variety:** player data likes variety more than our anti-carousel rule assumes; our answer is visible variety from
  situations, optional side bits and one late twist.
- **Role swaps:** Hazelight never swaps characters; our "roles swap" means jobs alternate beat to beat.
