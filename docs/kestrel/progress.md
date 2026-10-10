# Kestrel - progress

| Stage | Prompt | Status | Commit | Date |
| --- | --- | --- | --- | --- |
| P00 | Setup, rules, facts | APPROVED | 8945ddb | 2026-10-10 |
| S0 | Security systems spec | DRAFT | d7881b6 | 2026-10-10 |
| S1 | Cameras and security desk | not started | | |
| S2 | Card readers, keycards, mantrap | not started | | |
| S3 | Beam detectors and PIR lights | not started | | |
| S4 | Security co-op sync and controls | not started | | |
| S5 | Dormant guards (Part A, Part B) | not started | | |
| P01 | Mission brief | not started | | |
| P02 | Building brief | not started | | |
| P03 | Tools | not started | | |
| P04 | Floor plans | not started | | |
| P05 | Architecture review | not started | | |
| P04S | Security layout | not started | | |
| P06 | Level design | not started | | |
| P07 | Encounters | not started | | |
| P08 | Mission and co-op | not started | | |
| P09 | Build contract | not started | | |
| P10 | Gameplay review | not started | | |
| B1 | Site and ground floor | not started | | |
| B2 | Levels and stairs | not started | | |
| B3 | Openings and traversal | not started | | |
| B4 | Light and sound layer | not started | | |
| B4S | Security devices | not started | | |
| B5 | Guards | not started | | |
| B6 | Mission and co-op | not started | | |
| B7 | Verification and playtest pack | not started | | |
| P11 | Playtest triage | not started | | |

## Log (newest first)
- 2026-10-10 S0: docs/kestrel/S0-security-spec.md (264 lines, DRAFT). Six systems, 2+ counters each, numbers SN01-SN67 (proposals; detection times derived from PERCEPTION).
  Alerts only through existing functions: Enemy.notice / searchAt / alert, EnemyManager.lightsOut / hear / alarms -> onAlarm -> reinforce. No instant fail.
  Map file adds fields door2, enrolled, controls, responders, minPlayers and kind fault (reasons in section 6).
  6 ASK items (private alarm and ray helpers, civilian grab, closed InteractKind, HUD arcs, shot hook). 5 questions for Michael, answered the same day and applied to the draft (clone from a held guard, cards on takedown).
- 2026-10-10 P00: branch feature/kestrel made from ct-movement (e60c835). RULES.md saved word for word. 00-facts.md: 33 rows read from code and docs; 4 notes under NOT FOUND (nav ladder standoff, drainpipe climb speed, lighting doc numbers, F28 key is "type"). Coordinates: north +Z, east +X, up +Y. Three scripts/e2e-dead-line*.mjs files are not covered by RULES section 4.

## Decisions by Michael
- 2026-10-10 S0 questions: a shot camera makes a manned desk send a guard; cloning = hold a cloner to a grabbed guard's card; keycards are taken automatically on any takedown of the holder; the iris enrols the night duty engineer only; cameras or beams switched off at the panel are noticed when the desk is next manned (a guard is sent).

## BLOCKED
