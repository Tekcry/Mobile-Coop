status: open

# campaign J8 MB: mission-scoped bolt (A30) (Opus 5.5)

Released 2026-10-26 ~09:55 by the lead: the base is J7 PR D's checked head (checker PASS; it carries the wharf triage
fix 820101ecd). PR D merges into origin/feature/mission-engine unchanged, so a branch from it merges forward clean.
Base: origin/feature/mission-rules at c2802450a0ff71a03a7fb44d2d6fc203e25984e1. New branch: feature/tallow-mb
(cut from that sha). Lead: Night Shift | Campaign Build. Read `git show origin/master:docs/systems/agent-preamble.md`
(on the desktop: worktree `C:/NightShift/Mobile-Coop-tallow-mb`, guard before every write; in the cloud: "Cloud
sessions") and the code hard rules in `git show origin/master:CLAUDE.md` first. Plan: `docs/missions/slices/J8-J9-PLAN.md`
on the base: section 2 "The W3 roof bulkhead", A30, section 6 MB row and "MB mission-scoped bolt".

## Only these files
- `src/game/sectors.ts`: the `SectorBolt.missions` field and the unfitted state in `SectorBolts` only.
- `src/game/sectorTeamDoors.ts`: `build` (and only what `reset` / `boltInfo` need so an unfitted bolt stays as it is).
- `src/game/modes/sectorMode.ts`: one line, the `team.build` call (below).
- `tests/sectorBolt.test.ts` (extend; every existing case unchanged).
Not yours: `tallowWharfSectors.ts` (G2 appends the Tallow bolt later), `tallowWharfW3.ts` (G3), any map file,
`src/net/**`, `src/game/mission/**`, `sectorMission.ts`. No changelog fragment (the lead's).

## Why (A30, lead ruling ~22:10, confirmed ~22:40)
In Two-Key Ledger the counting house is staffed and the night porter bolts the roof stair's foot door at lock-up, so a
lone player on the roof cannot walk down into the east wing and must take the yard fire escape and the east gate, as the
signed TKL page says. In Three Grey Coats the house is empty and the stair is open: the crossing Michael signed ("down
the fire escape into the east wing, then the coal chute") is unchanged. No per-mission door state exists today
(`SectorBolts` starts every bolt shut, `SectorTeamDoors.build` fits every bolt), so a bolt gets an optional list of the
missions it is fitted in. About 60 lines; no wire change.

## What to build
1. `sectors.ts` `SectorBolt`: `readonly missions?: readonly string[];` with a doc comment: the `MissionDef.id`s this
   bolt is fitted in; absent = fitted in every run (today's behaviour); an unfitted bolt's door is a plain door
   (unlocked from the start, no "Unbolt" item, no nav closure, a section restart leaves it so); J8 A30 (the Tallow
   bulkhead foot, TKL only).
2. `SectorBolts`: a way to mark a bolt unfitted at build time (for example `unfit(sec, k)`, which sets `shut[sec][k]`
   false and records it in a preallocated per-bolt row made in the constructor), and `rebolt(sec)` leaves an unfitted
   bolt alone (not shut, not in the returned list). `isShut` of an unfitted bolt is false; `use` / `press` on it return
   false / 'shut' as for any drawn bolt.
3. `sectorTeamDoors.ts` `build(missionId?: string)`: for each bolt, it is fitted when it has no `missions`, or when
   `missionId` is given and `missions` includes it. A bolt with `missions` and no `missionId` (no mission bound) is not
   fitted. An unfitted bolt: `this.bolts.unfit(sec, k)`, no `closeDoor` (the door stays unlocked, no nav closure), no
   item, not pushed to `boltIts` (so `reset` and `boltInfo` never see it). Every fitted bolt and every pair gate is built
   exactly as today. Build time only: no allocation added to any per-frame path.
4. `sectorMode.ts`, the exact line (one line, nothing else in the file): on PR D (eb2317784) it is `:371`
   `    this.team.build();`, which becomes `    this.team.build(this.mission?.def.id);` (`this.mission` is bound at
   `:309`, before it; `SectorMission.def` is the `MissionDef`, `src/game/mission/sectorMission.ts:185`).
   **The R6 seam:** J7 R6 (origin/feature/mission-rules-r6 0cb3a4d6c, PR F) also edits `sectorMode.ts`: its nearest hunk
   deletes PR D's `:368` (`if (this.mission) this.missionHud = new MissionHudMount(...)`), two unchanged lines
   (`setOnRated(this.rated);`, `this.findDoors();`) above this line, which is `:370` on R6. A three-way merge of MB's
   line with R6 was simulated (`git merge-file`, base PR D, R6 against MB): **0 conflicts** in either order. So
   whichever lands second folds by a plain merge with no hand edit; if a forward merge still stops on this hunk, keep
   R6's deletion and MB's argument (`this.team.build(this.mission?.def.id);` right after `this.findDoors();`). No other
   open branch edits within 8 lines of it (coop4 #317 inserts 9 lines below on master; guard-rules, hud-guidance,
   gm-flip, hud-guidance-b / -b5 do not touch the area).
5. Client: read how a client gets team-door items and locks (`SectorTeamDoors` header comment: the client mirrors the
   items as `c-` ids and the locks as `lk`, `src/net/coopClient.ts:1033`). If the client only mirrors the host, nothing
   more is needed (an unfitted bolt has no item and no lock to mirror); if the client also calls `build`, it passes its
   own bound mission's id; if either needs a wire change, stop and report (`status: blocked`, J8 A19).
6. Read also: the mission's bolt polls (`src/game/mission/sectorMission.ts:263`, every bolt becomes a flag
   `<section id>-bolt<k>` through `POLL_BOLT`): an unfitted bolt reads "not shut", so its flag may read as drawn from the
   start. Do not change `sectorMission.ts`; report whether any step, save or rating could read that flag (A30 says no
   step reads the Tallow bolt `W3-bolt4`; the Warehouse and campus bolts have no `missions`). If one does, stop and
   report.
7. `tests/sectorBolt.test.ts`, new `describe('mission-scoped bolt (J8 A30)')` with a two-section literal `SectorDef`
   list (as the file's `DEFS`) and a fake `TeamDoorHost` (doors with one `DoorState` per bolt, an `Interactables`, a
   fake nav that records `addClosure` / `setClosed`): a bolt with `missions: ['m1']` built with `'m1'` locks its door,
   adds its "Unbolt" item and a shut nav closure; built with `'m2'` or with no mission its door stays unlocked, no item,
   no closure, `isShut` false, `boltInfo` leaves it out, and `reset(sec)` keeps it so; a bolt with no `missions` behaves
   as today in all three builds; `SectorBolts.rebolt` skips an unfitted bolt. If a fake host is too heavy, test
   `SectorBolts` directly plus `build` through the smallest fake that compiles, and say so.

## Checks (tsc and these vitest files only; no e2e, no GPU, no npm run check)
- `npm run typecheck:fast`
- `npx vitest run tests/sectorBolt.test.ts tests/sectorBoltPair.test.ts tests/sectorPairGate.test.ts tests/tallowWharf/sectors.test.ts --maxWorkers=2`
- `npx eslint src/game/sectors.ts src/game/sectorTeamDoors.ts src/game/modes/sectorMode.ts tests/sectorBolt.test.ts`
- Pending PC run (the lead requests it on PR G1): laptop `e2e-coop e2e-netmove e2e-sectorops:wharf-tgc
  e2e-sectorops:wharf-tkl e2e-sectorops:mission`.

## Done
- Checks green; the diff is the four files; `sectorMode.ts` changes by exactly one line; with no bolt carrying
  `missions` (every map today) nothing behaves differently.
- Commits on feature/tallow-mb prefixed `tallow MB:`, trailer "Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. Never merge, rebase, force-push, or push to
  feature/mission-engine.

## Report (append below, then set line 1 to `status: done feature/tallow-mb <sha>`)
Fields and methods added, the client finding (step 5), the mission-step finding (step 6), test counts, check results,
deviations, "pending PC run" for the laptop suites.
