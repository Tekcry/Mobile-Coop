status: done feature/hud-guidance-b5-fix1 0205c77edd3e26e6420b1456199605932475e1bc

# campaign J3b hud-guidance B5 fix round 1 (Opus 5.5, src/net)

Base: origin/feature/hud-guidance-b5 0b98cd7d1. New branch: feature/hud-guidance-b5-fix1 (cut from that sha). Read
docs/systems/agent-preamble.md (origin/master) first; hard rules in CLAUDE.md (origin/master).
Only files: src/net/coopClient.ts, src/game/fieldNotes.ts (comment only), tests/fieldNotes.test.ts, and the one doc
named below. Nothing else; no wire change (src/net/protocol.ts untouched).

## The defect (checker B, scratch hg-b5-check-b.md)
src/net/coopClient.ts:871 (`case 'feed'`, `g.notes.add(e.text)`) adds every host feed line to the client's Notes. A9
keeps intel lines and the keypad radio lines, but these also arrive through `CoopHost.radioLine` and must NOT be notes:
- "Camera loop ended." (sectorMode.ts:1279)
- "Cameras looped." / "Cameras switched off." (sectorMode.ts:621)
- "Bluff on. Read his face now." (coopHost.ts:958)
The host's Notes show none of them, so host / client parity breaks and the screen reads like a radio log (A15: no radio
log).

## Fix
1. Export those four texts as constants from where they are defined (src/game/sectorDesks.ts and
   src/game/jointInterrogation.ts - if they are inline literals there today, add the exported constants in those files
   and use them at the send sites; add those two files to your edit list then, nothing more), import them in
   coopClient.ts, and skip them before `notes.add` (no allocation per feed: a module-level Set or plain comparisons).
2. The comments at coopClient.ts:~870 and fieldNotes.ts:3-4 say which feed lines are kept (intel and keypad radio).
3. tests/fieldNotes.test.ts wiring test: a client feed of each of the four lines adds nothing; an intel line still adds.
4. Polish (checker A): docs/systems/ui.md Notes row gets one line: "A co-op client that drops and rejoins starts with
   empty notes (accepted limit)."

## Checks (cloud: tsc + single vitest files only)
`npm run typecheck:fast`; `npx vitest run tests/fieldNotes.test.ts tests/coopFix.test.ts`. e2e (e2e-coop, e2e-takedown,
e2e-menus) is pending PC run; the lead requests it.

## Done
Push feature/hud-guidance-b5-fix1 (path-limited commits "hud-guidance B5 fix: ...", Co-Authored-By trailer). Report
(changes, tests with counts, deviations) at the end of this brief. Never push to feature/hud-guidance-b5 or -b: the lead
merges.

## Report (Night Shift | Cloud Builder 3, Opus builder, 2026-10-25 ~23:20)
Branch `feature/hud-guidance-b5-fix1` @ 0205c77ed (one commit on 0b98cd7d1). 4 files, +39 / -7. No wire change
(`src/net/protocol.ts` untouched).
- `src/net/coopClient.ts`: `case 'feed'` (:872-876) calls a new exported `clientFeedToNotes(g.notes, e.text)`
  (:1368-1376) instead of `g.notes.add(e.text)`: four plain `===` compares against `DESK_LOOP_LINE`, `DESK_OFF_LINE`,
  `DESK_LOOP_END_LINE` (`src/game/sectorDesks.ts:63-65`) and `JOINT_BLUFF_FEED` (`src/game/jointInterrogation.ts:22`),
  no allocation; returns false on a skipped line, else `notes.add`. Imports (:57-59) flow game -> net only (plus
  `import type { FieldNotes }`). The comment says the intel and keypad radio lines are kept.
- `src/game/fieldNotes.ts:4-5`: comment only (which feed lines a client keeps).
- `tests/fieldNotes.test.ts`: the source wiring test expects `clientFeedToNotes(g.notes, e.text);` in `case 'feed'`
  and no `g.notes.add(e.text)` (:62-66); a new behaviour test (:69-82): each of the four lines adds nothing (texts
  pinned), an intel line ("Code: Lab door 4471") still adds.
- `docs/systems/ui.md:50-51`: Notes row - client notes are intel and keypad radio lines only; "A co-op client that
  drops and rejoins starts with empty notes (accepted limit)."
Tests: `npm run typecheck:fast` clean; `npx vitest run tests/fieldNotes.test.ts tests/coopFix.test.ts` 29 passed
(fieldNotes 9, coopFix 20); eslint on the three .ts files clean.
Deviations: step 1's condition did not hold - all four texts were already exported constants used at their send sites,
so sectorDesks.ts / jointInterrogation.ts are untouched. The skip is an exported helper in coopClient.ts (the only code
file allowed) so the test checks behaviour, not only source text.
Pending PC run: e2e-coop, e2e-takedown, e2e-menus (lead requests).
