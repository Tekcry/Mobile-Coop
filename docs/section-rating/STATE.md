# section-rating - STATE

## Now
Planned, nothing built (2026-10-23 ~12:15). BRIEF.md and PLAN.md written by a planning subagent on
`feature/section-rating` (cut from master 3c460923). Not committed yet: the lead commits these three files first.
Defaults A1-A8 (BRIEF.md) apply until Michael answers M-a to M-h.

## Next
1. Lead commits the docs, checks master for guard-ai / sector-redesign / CT Core changes to the files in PLAN.md
   (merge master into this branch if any landed).
2. S1 (pure rules, Sonnet).
3. S2, S3, S4, S5 in parallel.
4. S6 and S7 in parallel; batch checkers; one PR to master.

## Open
- M-a to M-h for Michael (BRIEF.md), defaults in use.
- Interfaces waiting on other jobs: guard-ai alarm stage API (`alarmStep`), CT Core suppressor ammo and dual takedown.

## Done
- 2026-10-23: BRIEF, PLAN, STATE written.

## Resume prompt
```
Night Shift | Menu Notes Build: start section-rating. Work only in C:/NightShift/Mobile-Coop-section-rating on branch feature/section-rating (branch guard from CLAUDE.md "A job" before every write). Read CLAUDE.md, then docs/section-rating/STATE.md, BRIEF.md and PLAN.md. Commit the three docs first. Then run PLAN.md slice order (S1, then S2-S5 in parallel, then S6 and S7) with the session-method loop: Opus for src/net, save and mode code, Sonnet for UI, data and tests from strict Opus briefs, one fresh checker per batch, at most 1 fix round. Use assumed decisions A1-A8 until Michael answers M-a to M-h. Update STATE.md after every slice. Finish with one PR to master.
```

## S1 report (2026-10-23 12:30)
Built `src/game/rating/sectionRating.ts` (pure, no Babylon / net imports) and `tests/sectionRating.test.ts` (23 tests, all pass; tsc and eslint clean).

Exported API: marks `UNDETECTED` (1), `NO_KILLS` (2), `NO_ALARMS` (4), `BODIES_HIDDEN` (8), `ALL_MARKS`; `SYNC_WINDOW` (1.5), `SYNCED_PAID_MAX`, `SYRINGE_OVER_PRESET`;
`SectionStats`, `newSectionStats()`, `resetSectionStats(s)`; `RatingRules`, `DEFAULT_RULES`, `rateSection(s, rules?)`, `markCount(marks)`;
`Grant`, `RewardCtx`, `emptyGrant()`, `rewardsFor(marks, synced, ctx)`; `RATING_LABEL`, `MARK_LABELS`; `SyncedDetector` (`onTakedown(player 0|1, t)`, `addSynced()`, `synced`, `reset()`).

Defaults picked where BRIEF is open:
- Rules: `knockoutsBreakNoKills` false (A2), `cameraBreaksUndetected` true (A3), `bodiesHiddenNeedsBody` false (A4).
- Reward table (R1): Undetected +1 gadget; No kills +1 medkit (until CT Core suppressor ammo); No alarms +1 syringe (solo: +1 medkit, A7); Bodies hidden alarmStep 1 (S2 swaps to +1 gadget until guard-ai's stage API lands, A9).
- Synced (R4): each paid synced takedown gives +1 gadget and +1 syringe (solo: +1 gadget, +1 medkit); at most `SYNCED_PAID_MAX` = 2 paid per section (a number BRIEF left open).
- Caps: gadget grant <= gadgetsAtStart; syringe grant <= preset + 2 - syringesAtStart (min 0). Caller passes current counts as "AtStart".
- Detector: window inclusive (exactly 1.5 s syncs); players are 0 or 1; a paired takedown is consumed; the detector keeps its own count (`synced`), caller copies into `SectionStats.synced`.
