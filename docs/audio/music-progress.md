# Night Shift - music progress

Spec: `docs/prompts/music-spec.md`. Direction: `docs/audio/music-direction.md`. Branch: `feature/music`.

## Status
| Stage | Name | Model | Status |
| --- | --- | --- | --- |
| M0 | Direction | Opus | done; waiting for Michael's approval |
| M1 | Engine and music lab | Sonnet | not started |
| M2 | States, transitions and adapter | Sonnet | not started |
| M3 | Composition and themes | Opus | not started |
| M4 | Polish and budget | Sonnet | not started |

## Ear-test log (originality, direction Section 12)
| Date | Cue | Heard as | Action |
| --- | --- | --- | --- |
| | | | |

---

## Stage M0 report
- Done: `docs/audio/music-direction.md` - palette (40 sounds with synthesis), key centre D, tempos (84 / 96 / 168),
  chord set and progressions, the five-note Night Shift motif and its eight forms, layer map (9 stems x 4 states),
  transition and hysteresis rules, stingers, Warehouse and Kestrel themes, menu / briefing / results themes, mix rules,
  originality rules, engine notes for M1.
- Done: this progress file.
- Files changed: `docs/audio/music-direction.md` (new), `docs/audio/music-progress.md` (new).
- Decisions:
  - Spec names guard states `relaxed / ... / search`; the code's `AlertLevel` is `unaware | suspicious | investigating |
    searching | alert | cooldown` -> direction 7.1 maps the real names; `cooldown` counts as calm (guards are back on
    route, the HUD shows no alert).
  - Tempos: suspicious 84, combat 168 (exact double, so half-time combat shares suspicious's pulse and phrases are both
    11.4 s), searching 96 (deliberately off that pulse). Down transitions glide tempo over the 2-bar fall.
  - Hold times: combat -> searching 6 s (spec), searching -> suspicious 10 s, suspicious -> calm 15 s; one phrase
    minimum dwell.
  - Music never scales with guard count or distance (the removed `alive / 5` rule leaked the enemy count).
  - Menu and briefing use a code-made rain-like texture; it is a music texture, not the Phase 2 gameplay rain.
  - Results: failure variant also for "more than one alarm raised"; Phase 4 may refine.
  - Mix: music must never push the shared master compressor into gain reduction on its own (it would duck footsteps).
- Tests: none (documents only). `git fetch` + merge of `origin/ct-movement`: already up to date.
- Measurements: none (documents only).
- Open issues:
  - The motif (D F E Bb A) needs Michael's ear test for resemblance to any known theme before M3 locks it.
  - The level targets (dBFS per state) are starting points; M4 sets the final mix by ear against real footsteps.
  - Resolved 2026-10-09: the HUD's arcs show only guards that see the player or are near (`gameState.ts`
    `updateStealthHud`). Michael chose: music follows every guard's state, never count, distance or direction
    (direction 7.1-7.2).
  - Motif ear test: Michael hears it in the M1 lab (a "play motif" button comes first in M1).
- Next: Michael reviews the direction. On approval, M1 (Sonnet): engine, sound library, sequencer, mixer, seeded
  generator and the music lab with WAV export. STOP.
