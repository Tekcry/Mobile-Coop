status: claimed Night Shift | Cloud Builder 1 2026-10-24T22:06Z

# mission-framework NET4: NET3 polish (unit tests only)
Lead: Night Shift | Marlow Build. Source: the NET3 checker reports A + B (both PASS; polish lists summarised below).

- Base: origin/feature/mission-net3 @ 550d99c4d. New branch: `feature/mission-net4`.
- npm ci once. Unit tests only: no e2e, no GPU, no `npm run check`. Never touch PROTOCOL_VERSION (the train bumps it).
- Commit + push each sub-step on `feature/mission-net4` (path-limited, never `git add -A`).

## Only these files
- src/net/coopHost.ts (the `late()` call only)
- src/game/mission/missionDef.ts (checkMission only)
- src/net/protocol.ts (read only: `sectorMissionId` ~:616; export it if not exported)
- tests/missionNet3.test.ts
- tests/mission/missionDef.test.ts (or the file that holds checkMission tests: `grep -rl checkMission tests`)
- changes/feature-mission-engine.md (create if missing; one or two lines, see 4)
- docs/systems/coop.md (one paragraph, see 4)

## Build
1. coopHost.ts ~:404: `late()` reads the raw `?mission=` flag through `startSlotPoints`. Pass `this.s.sectorMission || null` as the third argument (the same source the client uses since NET3), so host and client place from one mission id. Test in missionNet3.test.ts: a late joiner on a later-start mission is placed in the mission's start section even when the host's URL flag differs from `s.sectorMission`.
2. missionDef.ts ~:176 `checkMission`: reject a mission id that `sectorMissionId` (protocol.ts ~:616, `/^[A-Za-z0-9_-]{0,64}$/`) would refuse, with a clear error. Do not import src/net statically into game code if that breaks the "single player never imports src/net" hard rule: copy the regex into missionDef.ts as an exported constant and have protocol.ts's test (or a new test) assert both regexes are identical. Test: every mission id on every map in src/world/maps passes (import the maps' mission lists the way existing mission tests do), and 'bad id!' fails.
3. Run: `npm run typecheck:fast`; `npx vitest run tests/missionNet3.test.ts tests/missionNet.test.ts tests/mission --maxWorkers=2`.
4. Docs:
   - changes/feature-mission-engine.md: "Co-op Sector Ops: the partner now starts in the mission's first section (Two-Key Ledger at W2) instead of W1." (follow changes/README.md format).
   - docs/systems/coop.md, the sector / mission section: the host sends the sector mission id in `start.sm`; the client never reads its own `?mission=` in Sector Ops; the host places a remote that is off-section on its first state (`firstPlace`).

## Done when
Both items have tests that fail on the old code, all listed tests pass, the brief's status line reads `status: done feature/mission-net4 <sha>`, with a short report appended (changes, tests run with counts, deviations).

## Checker notes (source)
- B polish 1: coopHost.ts:404 `late()` reads the raw `?mission=` flag through `startSlotPoints`; pass `this.s.sectorMission || null` so host and client use one source.
- B polish 2 / A polish 4: missionDef.ts:176 `checkMission` does not enforce the id charset / length that `sectorMissionId` accepts. A host binding an id that fails the clamp sends no mission and the client would start at sectors[0].
- A polish 5: the changelog and coop.md line about the client's start section are unwritten.
