# mission-framework - PLAN (Opus planner, 2026-10-24 ~23:30)

Sources: BRIEF.md (the ask, M1-M5, A1-A18), the audit `origin/feature/menu:docs/orchestrator/MISSION-DESIGN-AUDIT-2026-10-24.md`
sections 4, 5, 7, research `docs/missions/research/`. Every `file:line` below is at master 92d0205d (this branch's base;
master is now 4.98.0, train 67; never merge master in). Engine facts were read from code, not docs.

## 1. Goal and limits
Multi-step missions for the campaign (2 players, strictly co-op, M3) and Sector Ops (1-4 players, two teams in parallel,
solo does all): a mission is 3-6 steps on a beat chart, with intel -> exploit, a twist, an optional objective and an
extraction; up to 2 strict rules (ghost = one); a broken rule restarts the section from its checkpoint; no markers
(objective text names places, in-world leads), an optional hint layer off by default. Marlow Yard is the guided training
course and is NOT changed: it keeps its stripes, marks, drill markers and single route (M1). Sign-off: one page per
mission / map (`SIGNOFF.md`, template `docs/templates/signoff.md` on feature/intake-gates), one question, one answer.
Sector Ops missions stay paper (beat chart, graph, plan, sign-off) until Michael picks; Sector Ops owns the campus layout
(A16). The new campaign map goes graph -> spec + sign-off -> greybox overnight (Michael ~22:50: "If it's ready before I'm
awake, continue to make progress"); its exit is the V6 measured pass. No detail art, no feel tuning (current goal).

## 2. Data model (`src/game/mission/missionDef.ts`, pure, Babylon-free, no net imports)
```ts
export type TeamId = 'a' | 'b' | 'all';            // campaign: 'all' only (2 players move as one team)
export type StepKind = 'reach' | 'interact' | 'intel' | 'exploit' | 'interrogate' | 'carry' | 'plant' | 'sync' | 'extract';
export type MissionCond = { flag: string } | { all: MissionCond[] } | { any: MissionCond[] };   // StepCond's shape (courseDef.ts:196)
export interface MissionStep {
  id: string; section: string;                    // SectorDef.id (sectors.ts:105)
  team: TeamId; kind: StepKind;
  text: string;                                   // objective line, names the place ("the records room, second floor"), <= 90 chars
  hint?: string;                                  // hint layer only (Settings > Gameplay > Hints, off by default)
  after?: string[];                               // DAG edges: every listed step done first; none = open at section start
  done?: MissionCond;                             // flags: interactable `<step>`, sector codes, course-style pass zones
  gives?: string; needs?: string;                 // intel -> exploit: a fact flag (a code, a route, which target); exploit opens only with it
  target?: string; decoys?: string[]; bolt?: [number, number, number];   // interrogate: named guard (SectorGuard slot), wrong ones spook him to `bolt`
  item?: string; site?: string;                   // carry / plant: the item id and the place it goes (plant-not-take)
  window?: number; soloWindow?: number;           // sync: both halves within `window` s (solo: `soloWindow`, named in the briefing); a miss resets the step to try again, never a fail (G334)
  twist?: boolean;
  optional?: { reward?: 'gadget' | 'syringe' | 'medkit' };  // Sector Ops only, paid through section-rating's Grant (sectionRating.ts:94); campaign: none (Q19)
}
export type RuleKind = 'ghost' | 'noKills' | 'noAlarms' | 'noBodies' | 'namedTarget' | 'noGadgets' | 'plantNotTake';
export interface MissionRule { kind: RuleKind; scope: 'mission' | 'a' | 'b'; text: string; step?: string }   // every break restarts the section (G290)
export interface MissionTrack { team: 'a' | 'b'; zones: string[]; boxes: [number, number, number, number][] }  // SectorGuard.zone (sectors.ts:93) + plan boxes
export interface MissionDef {
  id: string; mode: 'campaign' | 'sector'; players: number[];      // campaign [2]; Sector Ops [1,2,3,4] (A1)
  sections: string[]; briefing: string[]; steps: MissionStep[];
  rules: MissionRule[];                                             // <= 2 per scope; ghost counts as one; a solo player carries a's and b's
  tracks?: MissionTrack[];                                          // Sector Ops: team A high / upstairs, B ground / service (A16)
}
export function checkMission(d: MissionDef, guards: ReadonlySet<string>): string[];   // DAG acyclic, needs <- gives, 3-6 steps, ends in extract, <=2 rules
```
- Fact = a flag. Interrogation codes (`GuardIntel.codes`, intel.ts:12-22), joint flags (jointInterrogation.ts:25), boards
  and overheard lines (`SectorIntel.grants`, sectors.ts:181-184) already set flags through `onIntelCode` (gameMode.ts:95,
  sectorMode.ts:907): `gives` names one of them, so no new intel plumbing.
- Existing objectives: **adapter, no migration** (A7). `SectorDef.objective` (sectors.ts:22, :111), `SectorRun`
  (sectors.ts:701) and Marlow's `CourseObjective` (courseDef.ts:205) stay as they are. A mission attaches as optional
  `MapDef.missions?: MissionDef[]` (mapDef.ts:130 beside `sectors`), picked by `?mission=<id>`; with none, Sector Ops runs
  bit-for-bit as today, so e2e-sectorops 1-6 and e2e-ctcourse 1-4 do not move. A mission section's `SectorDef.objective` becomes
  its extraction / exit gate only (the runner's last step of the section opens the connector).
- Runtime mode: campaign maps also run on Sector Ops' `SectorMode` (`mode=sector`), with `players: [2]` (A6).

## 3. Runtime (new files in `src/game/mission/`; `sectorMode.ts` gets hook lines only)
- **Runner** (`missionRunner.ts`): step states (locked / open / done) per team from the DAG and a flag set; `snapshot(section)`
  at section begin, `restore(section)` on a restart (steps and facts of that section go back; earlier sections stay);
  solo (1 player) opens team A and B steps in sequence. No allocation per step.
- **Rule tracker** (`ruleTracker.ts`), host only. Ghost / no kills / no alarms / no bodies found ARE section-rating's marks:
  it reads `rateSection(stats)` (sectionRating.ts:84) on the live `SectionStats` and a rule breaks when its mark bit drops
  (UNDETECTED / NO_KILLS / NO_ALARMS / BODIES_HIDDEN, :18-21; section-rating defaults: a knock-out is not a kill, a camera alarm breaks ghost).
  Feeds already in sectorMode: alarm event :343 (stealthSystems.ts:546), bodyFound :346 (stealthSystems.ts:225),
  detections :1246-1248 (gameState.ts:2085), camera / laser alarms :922-928 (ctDevices.ts:1098-1103, :1109),
  kills / KOs `onEnemyKilled` :1311-1323 (`HitInfo.attackerId`, damage.ts:19). Per team (A9): a kill / KO / gadget /
  interrogation by its player's slot; ghost = a live, non-passive guard of that track's zones is alerted (spotFail.ts:16's
  test, per track); an alarm or body found by the position of the device / body in a track's boxes, else against both.
  Other rules: `gadget` event (gameEvents.ts:32) + `onRemoteGadget` (gameMode.ts:93) for no gadgets; `intel` event
  (gameEvents.ts:7) gains `eid` (intelReveal.ts:9, :26; callers takedownController.ts:477-480, coopHost.ts:1727-1728) for
  named target; interactable use for plant-not-take. No rule runs on a clock: time windows are soft only (G334), so
  there is no window rule and no seconds countdown.
- **Section restart on a broken rule**: the host says the rule's line (radio) and calls `SectorMode.restartSection()`
  (sectorMode.ts:1158; Marlow's `spotFail` precedent courseMode.ts:585-599). It already resets: objective / connector /
  alarm stage (`SectorRun.restartSection` sectors.ts:800), team doors and pair gates, section codes (`rekey`), guards and
  their memory, loadout, gadgets in the world, crates, cameras, lamps and doors, the rating counters (`freshCounters`;
  a restart never re-rates). Added: `runner.restore(section)`, tracker reset, a 2 s hold (courseMode.ts:100 `SPOT_HOLD`
  pattern) so a rule cannot fire again before both players respawn. No rule ends the mission: G339 voided A12's
  one-chance and window kinds, so every strict-rule break restarts the section (G290).
- **Protected characters**: knocking out or killing a named character the mission needs (an interrogation target
  before he talks) restarts the section the same way (G353; Michael ~11:20: "Section restart"), so a mission can
  never stall.
- **Code to bring in line**: the engine branch (feature/mission-engine) was built before G339 and Q19 and still has the
  `oneChance` / `window` rule kinds, the blip reader and a required reward on optional steps (the wharf missions carry
  a gadget and a syringe). The code changes follow these docs (ROADMAP Now 7-8).
- **Spook** (A11): interrogating a decoy despawns the real target and respawns him unalerted at `bolt` with his info
  (enemyManager.ts:1705 `despawn`, :1864 `spawn`; no src/ai change). With the `namedTarget` rule a decoy read also breaks it.
- **Extraction**: the `extract` step is `SectorRun`'s extract phase (sectors.ts:777-782: every living player holds the zone).
- **Objective list HUD** (`src/ui/hud/missionHud.ts`, text from `missionText.ts`): rows per team ("Team A - Ghost: reach
  the second-floor records room"), the rules line under the title, done rows ticked. There is no minimap, compass or
  objective blip in any mode (G339, A10 void); the list's place names are the only guidance (G336). Hint line
  under the current row only when `gameplay.hints` (new, default false; settings.ts:98 type, :161 default, :375
  sanitize; settingsScreen.ts:156 row in
  Gameplay, :213 reset). Marlow's `courseMarkers` drill marker (courseMode.ts:85-98) is untouched (M1).
- **Co-op sync, host-authoritative**: the `sector` message (protocol.ts:322, parse `sectorExtra` :649) gains optional
  `ms?: MissionWire` = `{ id, st: number[] (done bits per team), f: number (facts bits), rb: number (rule-break counter),
  rl: string (its line), rk: number[] (rules kept per scope) }`, packed by `missionWire.ts` (pure) in `netExtra`
  (sectorMode.ts:1343). Restarts reach the client as today (the banner, `SECTOR_RESTART_TITLE` sectors.ts:518, and its
  own `checkpointReset`). The client never evaluates steps or rules. Late joiners read `ms` from the next message.
  `PROTOCOL_VERSION` (protocol.ts:21) is not bumped (the train does).
- **Rating hook**: no second scoring system. The card (`RatingView`, gameState.ts:534) keeps its four marks from the
  site-wide stats; a mission adds `rules?: { text, kept }[]` and, in Sector Ops, per-team marks (the same `rateSection`
  over each team's `SectionStats`). Sector Ops optional objective rewards go through `rewardsFor` caps
  (sectionRating.ts:153). Campaign optional objectives give no reward (Michael 2026-10-25, folded plan Q19: "None
  (Recommended)"); they carry story only.

## 4. Forced co-op traversal kit (M3, Michael ~22:50: all six approved; every campaign section forces at least one)
Gameplay first with existing or placeholder clips; Player Build owns animation (clip list in 4c). Wire kinds:
`tmove` / `tstart` (protocol.ts:294, :297, parse :864), host check `checkTeamRequest` (teamMoves.ts:55, coopHost.ts:1122).

### 4a. Approved moves
| Move | Code today | Slice | Clips for Player Build |
| --- | --- | --- | --- |
| Boost up a wall (leg-up) | exists: `boost` teamMoves.ts:111-160, teamController.ts:250, clips team.ts:29 | data only (4.3-4.5 lip) | none new |
| Throw over a gap | exists: `throw` (B4) teamMoves.ts:174-240, teamController.ts:230-247 | data only (+ validator kind `team_throw`) | none new |
| Human ladder (shoulder stand: one stands on the partner's shoulders to reach a high lip, G57) | new: its own move, Player Build's shoulder stand (J24 part 1, feature/coop-kit); the kit branch adds its wire kind `stand`. The relay `ladder` (teamMoves.ts:123-133, teamController.ts:212-253) is a different move | J24 part 1, then `stand` on the kit branch | Player Build's (J24) |
| Pull-up (catch a jumping partner at a lip and haul) | new; nearest: hang-down `pull` end teamMoves.ts:282-292 | KIT-PULL | pullOffer, pullCatch, pullHaul (top; see 4c); pullJump, pullHang, pullScramble (bottom). Placeholder: hangOffer / hangPull / relayUp |
| Hold shutter / door (one lifts and holds, the other crawls under) | new; nearest: course `hold` / `timedHold` gates courseDef.ts:57-59 (a held switch, course mode only) | KIT-SHUT | shutterLift, shutterHold (loop), shutterDrop; crawlUnder (partner, 0.9 m gap). Placeholder: brace / crouch walk |
| Rope brace / descent | exists: two-person rope (B7) teamMoves.ts:301-357, `ropeSlide` :327, clips ropeOffer / ropeHold / ropeClimb / ropeSlide | data only | none new |
| Vent unlock for the partner | exists as a composition: leg-up into a `duct`, unbolt from the far side (`SectorBolt` sectors.ts:237-338; Marlow A1 does it, a1Gate.ts:229-230) | data only | none new |

### 4b. Adopted (planner's original names; Michael 2026-10-25 ~18:05 on `docs/missions/prototypes/coop-kit/SIGNOFF.md`: all five join)
| Move | What | Code | Cost | Clips |
| --- | --- | --- | --- | --- |
| Deadweight | one hangs on a chain so a counterweighted grate lifts for the other | new gate on the hang attach | S (Opus 0.5 d) | chainGrab, chainHang, chainDrop |
| Chimney Pair | both brace back to back in a 1.2-1.6 m shaft and climb together | new attach mode | M (1-1.5 d) | chimneyBrace, chimneyClimb (both) |
| Drop Catch | one drops from above the safe drop into the partner's arms: silent landing | new (team request + landing) | S (0.5 d) | catchReady, catchTake, dropInto |
| Swing Pass | one braced on a pipe swings the partner across a shaft | new (throw arc variant) | M (1 d) | swingAnchor, swingRide, swingRelease |
| Plank Bridge | both carry a scaffold board and lay it over a gap; guards notice it | new two-person carry + prop | L (2 d) | plankLift, plankCarry (both), plankLay |
Michael's pick: "Deadweight,Drop Catch,Chimney Pair,Swing Pass", and for Plank Bridge: "Add it". Each gets its own
kit slice after KIT-PULL and KIT-SHUT, on the KIT0 registry, dark behind `coopKit`; Player Build makes the clips.

### 4c. Anim list for Player Build (the lead agrees it with "Night Shift | Player Build")
AGREED with Player Build ~23:30 (supersedes the 4a clip names): roles as team.ts, b = top / holder, a = partner / climber; holder ids `<move>Offer` / `<move>Hold`. Pull: b pullOffer, pullCatch, pullHaul; a pullJump, pullHang, pullScramble. Shutter: b shutterOffer, shutterLift, shutterHold (loop), shutterDrop; a crawlUnder. `TeamPoseMove` gains 'pull' | 'shutter'. Holder poses are procedural in TeamPoser (brace clip + bend / bendDrop / reachL/R / root offset), not clip files; phase on the shared team clock (`k`, TEAM_LINK); shutter exposes the gap height to TeamPoseIn (`depth` or a new field). Player's poses land after Michael walks AF0-AF6; placeholders until then.
KIT-PULL: 6 clips; KIT-SHUT: 4 clips (above). The five adopted moves (4b): their clips are agreed with Player Build
when each slice starts. Each clip: role (a / b), loop or
one-shot, ~duration, the existing placeholder the slice uses until the clip lands (`src/anim/clips/team.ts`,
`TeamPoseMove` :29 gains the new move ids in KIT0).

## 5. Slices
Branches (A13): `feature/mission-framework` (this folder) = PLAN, specs, sign-off pages, graph-svg (PR A); `feature/mission-validator`
in `C:/NightShift/Mobile-Coop-mission-validator`, cut from `origin/feature/level-validator-v6` (PR B: V6 rewrites
`validate()`, `parseArgs`, `checkCoop` in the same file; stacking avoids a train conflict; it cannot merge before V6);
`feature/mission-engine` in `C:/NightShift/Mobile-Coop-mission-engine`, cut from this branch at the PLAN commit (PR C:
engine, kit, campaign map greybox). Two slices never share a file at the same time.

| Id | What | Model | Files owned | Gate / tests | Est | Depends |
| --- | --- | --- | --- | --- | --- | --- |
| EN1 | Engine core: types, runner, rule tracker, text, wire pack | Opus | `src/game/mission/{missionDef,missionRunner,ruleTracker,missionText,missionWire}.ts`; `tests/mission/*.test.ts` (one per file) | `npx vitest run tests/mission/`, `typecheck:fast` | 4 h | - |
| EN2 | Sector Ops wiring: adapter, restart on rule break, spook, intel `eid`, test mission (no blip: G339 removes it in every mode) | Opus | `src/game/mission/sectorMission.ts`; `src/game/modes/sectorMode.ts` (hooks only: :341-350, :775-807, :1158, :1311, :1343); `src/game/gameEvents.ts`; `src/game/intelReveal.ts`; `src/game/takedownController.ts`; `src/world/mapDef.ts`; `src/game/sectors.ts` (`SectorNetExtra.ms?` :894); `src/world/maps/campusMissionTest.ts` (2-section test mission on S1-S2); `src/world/maps/campusOps.ts:86`; `tests/mission/sectorMission.test.ts`; e2e part `mission` in e2e-sectorops (new file `scripts/e2e-sectorops-mission.mjs`, `scripts/run-e2e.mjs:50`) | vitest file + `tests/sectorRestart.test.ts`, `tests/sectorRatingHost.test.ts`; laptop: e2e-sectorops:1-6 + mission part, e2e-section-rating, e2e-ctcourse:1-4 | 5 h | EN1 |
| EN3 | Objective list HUD + hint setting | Sonnet (strict brief) | `src/ui/hud/missionHud.ts`; `src/core/settings.ts`; `src/ui/screens/settingsScreen.ts`; `tests/settings.test.ts`, `tests/settingsCover.test.ts` | vitest 2 files; laptop: e2e-menus | 2 h | EN1 |
| KIT0 | Kit plumbing: new TeamKind ids, a move registry so each move lives in its own file, kit device hook | Opus | `src/game/teamMoves.ts:12`; `src/game/teamController.ts:199-280`; `src/game/kit/registry.ts`; `src/anim/clips/team.ts:29` (ids only, agreed with Player Build); `tests/kit/registry.test.ts` | vitest; `tests/hangDownNet.test.ts` stays green | 2 h | - |
| KIT-PULL | Pull-up move (host rule, timing, landing) | Opus | `src/game/kit/pullUp.ts`; `tests/kit/pullUp.test.ts` | vitest; e2e-coop after NET | 4 h | KIT0 |
| KIT-SHUT | Shutter: device, hold, crawl-under check, guard-visible open shutter | Opus | `src/game/kit/shutter.ts`; `src/world/shutterDoor.ts`; `tests/kit/shutter.test.ts` | vitest; e2e-coop after NET | 4 h | KIT0 |
| NET | Mission wire + kit wire kinds, client apply | Opus, TWO checkers | `src/net/protocol.ts` (:294, :297, :322, :649, :864); `src/net/coopHost.ts` (:1122, :1727-1728); `src/net/coopClient.ts` (:961); `tests/missionNet.test.ts` | vitest; laptop: e2e-coop, e2e-netmove, e2e-sectorops:1 + mission part, e2e-ctcourse:1-4 | 4 h | EN2, EN3, KIT0 (KIT-PULL / SHUT for their kinds) |
| VAL | Validator: mission / rule / sync nodes, section-4 checks, `training` profile, kit link kinds | Opus | (validator branch) `scripts/mission-validate.mjs`; `scripts/level-validate.mjs`; `docs/level-validator/mission-schema.md`; `docs/level-validator/graph-schema.md`; `docs/level-validator/example.mission.json`; `tests/missionValidate.test.ts`; `tests/levelValidate.test.ts` | vitest 2 files; laptop: e2e-levels | 4 h | - (base V6) |
| GSVG | `scripts/graph-svg.mjs`: a graph to scale from `area` boxes and `at` points (1 m = 10 px, north up, scale bar, tracks coloured, objective / sync / lead nodes), `--base <svg>` overlays Sector Ops' plan SVG | Sonnet | `scripts/graph-svg.mjs`; `tests/graphSvg.test.ts` | vitest | 1.5 h | - |
| SS | Split Shift spec (S2) | Opus | `docs/missions/prototypes/split-shift/{BEAT.md,graph.json,PLAN.svg,SIGNOFF.md}` | `level-validate` (VAL worktree) on Sector Ops' `graph/plan/campusOps-S{1..5}.json` + this file: 0 mission ERR | 2 h | GSVG (svg), VAL (re-run) |
| CR | Code Relay spec (S4 recommended, A14) | Opus | `docs/missions/prototypes/code-relay/{...same}` | as SS | 2 h | GSVG, VAL |
| CMG | Campaign map graph "Tallow Wharf" (`campaign`, players [2], `area` on every space) | Opus | `docs/missions/prototypes/campaign-map/graph.json` | `level-validate` 0 ERR (V1 rules + forced co-op per section) | 2 h | - |
| CMS | Campaign map spec + sign-off | Opus | `docs/missions/prototypes/campaign-map/{SPEC.md,PLAN.svg,SIGNOFF.md}` (SPEC from `docs/templates/map-spec.md`) | checker | 1.5 h | CMG, GSVG |
| TGC | Three Grey Coats spec | Opus | `docs/missions/prototypes/three-grey-coats/{BEAT.md,graph.json,PLAN.svg,SIGNOFF.md}` | mission checks 0 ERR | 1.5 h | BEAT now; graph after CMG |
| TKL | Two-Key Ledger spec | Opus | `docs/missions/prototypes/two-key-ledger/{...same}` | as TGC | 1.5 h | as TGC |
| KITS | Coop-kit sign-off page (4b, one question) | Haiku | `docs/missions/prototypes/coop-kit/SIGNOFF.md` | - | 0.2 h | - |
| GB0 | Greybox shell: MapDef (unlisted, `?autostart=tallowWharf&mode=sector&mission=<id>`), bounds, spawns | Sonnet (Opus brief) | (engine branch) `src/world/maps/tallowWharf.ts`; `src/world/maps/index.ts:20`; `tests/tallowWharf/shell.test.ts` | vitest; smoke | 1 h | CMS |
| GB1-GB4 | One section each (W1-W4): shells, lips, gaps, ducts, shutters reserved, rooms, nav seeds | Sonnet x4 | `src/world/maps/tallowWharfW<n>.ts`; `tests/tallowWharf/w<n>.test.ts` (sizes vs graph; co-op lips by the real boost search as a1Gate.test.ts:157-164; throw gaps by `throwLandingOk` teamMoves.ts:193; no solo bypass) | vitest per file | 2 h each | GB0 |
| GB5 | Sector + mission data: guards, routes, connectors, intel, bolts, pair gates; TGC + TKL MissionDefs | Sonnet (Opus brief) | `src/world/maps/tallowWharfSectors.ts`; `src/world/maps/tallowWharfMissions.ts`; `tests/tallowWharf/sectors.test.ts` (`checkSectors` sectors.ts:548, `checkSectorCodes` :211, `checkMission`) | vitest | 2 h | GB1-4, EN1, TGC, TKL |
| GB6 | Mission e2e on the wharf: both missions start to extraction, one forced co-op move per section, a broken rule restarts the section | Sonnet | `scripts/e2e-sectorops-wharf.mjs` (part of e2e-sectorops) | laptop: that part | 2 h | GB5, EN2, NET |
| GBM | Measured pass: `level-measure --write`, then `level-validate --require-measured` 0 ERR | Sonnet | `docs/missions/prototypes/campaign-map/graph.json` (`measured` fields only) | in a local merge worktree (engine + validator branches, never pushed) | 1 h | GB1-5, VAL, V6's measure CLI |
| EN4 | Mission start section + per-mission guard lists (A23): `mission.start` picks the first sector; a MissionDef carries its guard slots so only its sections and guards spawn | Opus | `src/game/mission/sectorMission.ts`; `src/game/modes/sectorMode.ts` (hook lines); `tests/mission/sectorMission.test.ts` | vitest; laptop e2e-sectorops:mission | 2 h | EN2, GB5 |
| FRAG | Changelog fragments, STATE, TESTING.md lines | Haiku | `changes/feature-mission-*.md`, `TESTING.md` | - | 0.3 h per PR | each PR |

Validator detail (VAL): nodes `mission` (id, mode, players, start, budget), `objectives[]` (id, section, space, team,
kind, after, gives, needs, lead, seen_from, minutes, new_mechanic, twist, optional), `rules[]` (kind, scope), `syncs[]`
(Sector Ops contract A16: id `sync-s<N>-<name>`, kind power_cut | camera_loop | code_source | code_sink | pair_door,
space, src, lead, solo); arrays concatenate across merged files. Checks: routes per space (existing rule of three);
choke node per section (a space or link every entry -> exit path passes); dead-end payoff (existing); goal visible
before reach (`seen_from` an earlier space); every objective has a `lead` space reachable before it; ghost path (start ->
every objective -> exfil over no `loud` link) and pacifist path (no `requires_kill` link); campaign: removing a
section's co-op links disconnects its entry from its exit (forced co-op, M3) and no solo twin (existing ERR); Sector Ops:
2+ parallel objectives and 2+ syncs per op, each pair sync has `solo`, all objectives reachable by one player; step budget
(3-6 steps, 2-5 min each, 10-30 min total, at most one `new_mechanic` per step, one gives -> needs pair, one `twist`, one
`optional`, last step `extract`); rules <= 2 per scope. New kinds `team_throw`, `team_hang`, `team_pull`, `shutter`
(co-op); field `mark` (a guidance mark: ERR outside training). **Training profile** (`meta.mode: "training"`, M2): one
route per space and per section allowed (INFO), routes-cross skipped, marks allowed; co-op coverage, no-softlock,
dimensions and pacing still checked.

Prototype spec contents: BEAT.md = beat chart (3-6 steps, 2-5 min each, one new mechanic max per step, an intel ->
exploit step, one twist, one optional (a reward in Sector Ops only), extraction, the 1-2 rules and how they are signposted, each step's
objective line and its in-world lead, the hint line); graph.json = level-validator schema + the nodes above; PLAN.svg =
GSVG output (campus missions over Sector Ops' `S<N>-plan-<y>.svg`); SIGNOFF.md = one question. Campaign map (CMG / CMS):
"Tallow Wharf", a small canal-side merchants' quarter at night, 4 sections W1 night market, W2 arcade lofts, W3 counting
house (east and west wings, strongroom), W4 wharf sheds (extraction); about 120 x 80 m; each section forces 1+ kit move
(4a), the map uses at least five of the six; Three Grey Coats runs W1 -> W2 -> W4, Two-Key Ledger W2 -> W3 -> W4
(`mission.start` per mission). Sector Ops sections by code file: S1 Gatehouse and car park (campusS1.ts,
campusSectors.ts:306), S2 HQ atrium and offices (campusS2.ts, campusSectors.ts:354), S3 Lab block (campusS3.ts,
campusSectors.ts:399), S4 Data hall (campusS4.ts, campusS4Data.ts:172), S5 The Old House (campusS5.ts, campusS5Data.ts:163).
Split Shift = S2 (Team Ghost L1-L2 offices, Team Shadow G-floor plant / breaker power cut); Code Relay = S4 (code from a
named NOC officer, cage keypad; the release lasts 30 s and can be asked for again, a soft window with no hard
countdown, G334; Michael 2026-10-25 ~18:05: "Approve, code re-askable (Recommended)"). SS / CR writers read Sector Ops' pages
(`origin/feature/sector-redesign-signoff:docs/sector-redesign/signoff/`, `graph/plan/campusOps-S<N>.json`) and send room or
node needs to "Night Shift | Sector Ops Build" through the lead.

## 6. Order, checkers, PRs
- **Wave 1 (now, parallel):** EN1, KIT0, VAL, GSVG (4 tsc / vitest agents: over the 3 cap only while desktop CPU < 80%;
  else GSVG waits), CMG, KITS, the four BEAT.md files (docs, uncapped).
- **Wave 2:** EN2 + EN3 (after EN1 PASS); KIT-PULL + KIT-SHUT (after KIT0); CMS (CMG + GSVG); TGC / TKL graphs (CMG);
  SS / CR graphs and SVGs (GSVG; Sector Ops' S2 / S4 plan graphs).
- **Wave 3:** NET (EN2, EN3, KIT0, KIT-PULL, KIT-SHUT); GB0 then GB1-GB4 in parallel (CMS); GB5 (GB1-4, EN1, TGC, TKL).
- **Wave 4:** GB6 (GB5, NET); GBM (GB5, VAL, V6's `level-measure` CLI); every graph re-run under VAL.
- **Checkers:** one fresh checker per batch: EN1 (Opus); KIT0 + KIT-PULL + KIT-SHUT (Opus); EN2 + EN3 (Opus); NET
  (TWO fresh Opus checkers, src/net); VAL (Opus); GSVG (Sonnet); the spec batch CMG / CMS / TGC / TKL / SS / CR / KITS
  (Opus, against audit section 4 and M1-M3); GB0-GB5 (Sonnet, greybox and data); GBM numbers (Sonnet). One fix round each.
- **PRs (recommended three):** PR A `feature/mission-framework` (docs, sign-off pages, graph-svg; CI check only), opened
  as soon as the spec batch passes, for the morning sign-off. PR B `feature/mission-validator`, base
  `feature/level-validator-v6`, retargeted to master when V6 merges; same train as V6. PR C `feature/mission-engine`
  (engine, kit, NET, wharf greybox, measured graph; touches src/net): laptop suites e2e-coop, e2e-netmove,
  e2e-sectorops:1-6 + mission + wharf parts, e2e-section-rating, e2e-ctcourse:1-4, e2e-menus, e2e-levels; it merges
  feature/mission-framework (this job's own branch, not master) before GB0 so the spec is in its tree.

## 7. Risks and open questions
- `sectorMode.ts`, `sectors.ts`, `campusOps.ts` are Sector Ops Build's files; EN2 keeps them to hook lines and the lead
  tells Sector Ops Build which lines before EN2 starts. A conflict is solved in the train, not by merging master.
- 4-player teams need feature/coop4 (open PR) on master; until then Sector Ops missions are tested at 1 and 2 players
  (one per team). Per-team ghost by guard zone is an approximation until Guard AI exposes the detected player.
- GBM needs V6's measure CLI (V6c / V6e-1 still running on feature/level-validator-v6); if it is not there by greybox
  end, the greybox PR waits for it, the rest of PR C does not.
- Sector Ops' sign-off may rename campus spaces: SS / CR graphs reference ids from their plan graphs and are re-run then.
- New kit moves use placeholder clips until Player Build's clips land; the e2e asserts states, not poses.
- Open: whether a Sector Ops optional
  objective keeps its reward across a restart (planned: no, the section's work resets).
- Assumed decisions A6-A18 are in BRIEF.md with how to undo each.
