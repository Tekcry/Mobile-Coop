# mission-rules (J7) - BRIEF
Owner: Night Shift | Campaign Build. Status: current.

Job `mission-rules` (FOLDED-PLAN J7, origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md` section 4). Lead: Night Shift
| Campaign Build. Branches `feature/mission-rules` (PR D), `feature/mission-rules-net` (PR E),
`feature/mission-rules-hud` (PR F), stacked on `feature/mission-engine` (PR C, on #372 `feature/mission-framework`);
folder `C:/NightShift/Mobile-Coop-mission-rules`. Base: origin/feature/mission-engine 8f40303f (carries the FLG fix
f8b06637, PASS from FLG checkers A and B). Plan: `docs/mission-rules/PLAN.md` (drafted as
`docs/missions/slices/J7-PLAN.md` on feature/mission-engine). Written 2026-10-25 by the J7 Opus planner (plan check fix
round); the lead commits it with the PLAN before builders start.

## The ask (the signed J7 row, verbatim)
"Mission-engine rule fixes (dark): push the flag fix first; dogs out and a mode-aware guard check; drop `oneChance` /
`window`; revives 2 x 30 s; exactly two players; protected-character restart; no shield lead; campaign cap named;
Tallow line and banner". Owner "Campaign (+ Guard AI check)"; covers breaks 10-14 and 17, C S19 (shield), M K3 (cap);
after J1; gate "two Opus checkers (`src/net`)"; question Q12 (default no). The folded plan was signed off by Michael
2026-10-25 ~17:00: "Sign off, start (Recommended)".

## Michael said (verbatim, with the source)
- G2 (2026-10-17): "2 player coop campaign only, unable to be completed solo."
- G48 (2026-10-17): "No bot anywhere"
- G126 (2026-10-18): "30-second revive, 2 per mission"
- G145 (2026-10-18): "Protected until their role is done."
- G155 (2026-10-18, chat): "Adopt CT's way" (no heavy or dog archetypes in co-op missions; narrowed to the campaign by
  G297 / G307).
- G359 (2026-10-25): "32 alive, but also research how many guards are normally active in splinter cell series missions
  and tell me"
- G336 (2026-10-25 ~09:45): "Objectives must name what and where, but no map, level design must flow naturally towards
  each objective."
- G343 (2026-10-25 ~10:45): "Objectives can fade in/out in game, must be a short, plain English objective. Can we bind to
  a button to show temporarily? Should also should up when updating objective"
- Tallow Wharf map sign-off (2026-10-25 ~18:05): "approve as drawn, id rather physically walk the map once built and
  confirm changes"

## Michael picked (the option text he chose, native multiple choice)
- G290 (2026-10-24 ~22:12, the picks as DECISIONS records them): breaking a mission rule restarts the section (the
  team goes back to that section's checkpoint, the mission continues); up to 2 strict rules, "ghost" counting as one.
- G334 (2026-10-25 ~09:45): "Soft windows only"
- G351 (2026-10-25, 5): "What and where"
- G353 (2026-10-25, 7, killing a civilian or a protected character): "Section restart"
- Q1 (~16:40): "Review all 12 first"; then the 12 level-rule changes (~18:20): "Adopt all as recommended
  (Recommended)"; and the Tallow hold (~18:05): "Build now, walk later (Recommended)" (the hold is lifted).
- Q8 civilians (~16:40): "None on Mission 1 (Recommended)"
- Q9 dog kill (~16:40): "Kill + lose score (Recommended)"
- Q12 campaign riot shields (~16:50): "No, armed only (Recommended)"
- Q16 4-player Sector Ops (~16:50): "Live now"
- Q19 campaign rewards (~16:50): "None (Recommended)"
- Q23 Tallow throw gaps (~16:50): "Force co-op"
- Three Grey Coats (~18:05): "He moves (Recommended)" (option 1 of the sign-off: "Approve as specced (after a broken
  rule, W2 restarts with Teale moved to the clock-mender's loft)").
- Two-Key Ledger (~18:05): "Hears and reacts (Recommended)" (the bell sends the porter: a Guard AI reaction).
- Code Relay (~18:05): "Approve, code re-askable (Recommended)" (an expired code can be asked for again; no hard
  countdown).

## Goal and limits
- Goal: the mission engine obeys the campaign rules above, dark behind `flags.missions` (`?missions=1`), so Mission 1
  (Tallow Wharf: Three Grey Coats, Two-Key Ledger) can be walked once J8 / J9 land.
- Limits: no Tallow geometry, lights, doors, greybox or sign-off pages (J8 owns them and starts after J7; J9 the
  shutters); no message shape change on the wire (one more fact bit in `ms.f`, A18; the train bumps PROTOCOL_VERSION);
  no save shape change; each PR under ~1.5k changed lines; Sector Ops runs unchanged; hot paths allocate nothing.
- Gates: a fresh Opus plan checker on BRIEF + PLAN before builders; PR D one Opus checker; PR E and PR F two independent
  Opus checkers each (`src/net`); PR C two fresh Opus checkers and its laptop set on its head after F merges (PLAN 4).

## Assumed decisions (each with how to undo; logged for Michael's next look where marked)
- **A1** Protected = every interrogate step's `target` until his step is done (G145 "until their role is done", G353).
  Nobody else: decoys and every other guard may be knocked out (TGC BEAT: "Knock-outs are allowed on anyone else"), and
  killed under the mission's own rules. No `MissionDef.protects` list (no mission needs one now; J25 civilians bring
  their own). TKL protects nobody (no interrogate step). Undo: add a `protects` list when a mission names more people.
- **A2** A protected target killed or knocked out before his step is done, on a step a `namedTarget` rule covers, is
  that rule's break, counted like a decoy read (`breaks` +1, its `kept` bit cleared, the rule's break line), and it
  spooks him: the restart puts him unalerted at his bolt point (TGC: Teale in the clock-mender's back loft, "He moves").
  Read from the TGC sign-off and the plan checker. The signed BEAT lists the Teale knock-out beside the rule as a
  protected restart, so Michael sees this on his next look. Undo: route it to the uncounted break (A3) and keep the
  spook.
- **A3** A protected target down on a step no strict rule covers: a built-in break, not one of the 2 strict rules
  (CONFORMANCE MF6): it does not count in `rb`, `kept()` or `brokenCount`; line "The man you need is down. Back to the
  section checkpoint."; banner RULE BROKEN; no spook. No current mission has such a step. Undo: count it in `breaks`.
- **A4** `oneChance` and `window` go for every mission mode, not only the campaign (G290 and G334 are general; Code
  Relay's re-askable code fits, ~18:05). Logged for Michael's next look. Undo: restore both kinds for `mode: 'sector'`
  from git history (EN1 / EN2 commits).
- **A5** Sync steps keep `window` / `soloWindow` (CT's sync, retryable, never scaled, G131). Undo: none needed.
- **A6** Campaign optional objectives give no reward and campaign sections get no section-rating grants (gadget,
  syringe, medkit) (Q19 "None"); the rating card still shows the marks. Undo: allow `medkit` / `gadget` for campaign in
  `checkMission` and drop `campaignGrant`.
- **A7** Campaign revives: cap 2 at every difficulty, 30 s window, used revives kept across checkpoints, no top-ups
  (G126). Undo: `campaignReviveCap` returns the syringes.
- **A8** Campaign = the bound mission's `mode === 'campaign'`; a campaign map = a map whose missions are all campaign
  (Tallow); no new `MapDef` field. Undo: add `campaignOnly?: boolean` to MapDef and read it in `isCampaignMap`.
- **A9** Exactly two: the host cannot start a campaign mission with 1, 3 or 4 in the room; the room holds 2 even after
  coop4; a solo `?autostart=tallowWharf&mode=sector&missions=1` is refused with a toast (without `?missions=1` FLG
  already sends it to the menu); a partner leaving mid-mission falls to today's rejoin hold. No dev override for solo
  testing (tests run co-op). Undo: remove the block in `campaignStartBlock`.
- **A10** No shield lead in a campaign mission: the response team is all `grunt`; alarm-stage armour and helmets
  unchanged (G155). Done in SectorMode after `responseTeam`, so J15's `shieldFrom` in `gear.ts` does not conflict.
  Undo: drop `campaignResponseKinds`.
- **A11** Each Tallow dog becomes an armed human on the same post / route (no geometry); slot indexes kept so guard ids
  and mission guard lists stay valid. The campaign-map SPEC / graph / SIGNOFF dog text is J8's (J8 owns geometry,
  lights and the pages and starts after J7); doc drift until then. Undo: revert the two rows (the campaign check then
  fails, by design).
- **A12** The section banner in a mission shows the viewer's first open required step of that section, or only the
  section title when the mission has none there (TGC crossing W3). The W1 sector label gains its place for non-mission
  runs, with the same place name as tgc-2 ("the warden's gallery office"). Undo: banner back to `s.objective.label`.
- **A13** HG7 / HG8: the always-on mission list is deleted; the current objective goes on the objective line (J3b makes
  it the popup); the full list lives in the field menu (PLAN 7). CONFORMANCE 1d puts them in the engine job; the
  orchestrator confirms the owner. Undo: restore `missionHud.ts` / `missionHudMount.ts` from git history.
- **A14** D, E, F stack on the engine branch and merge into it (PLAN 4); PR C carries them to master. Undo: retarget D,
  E, F to master after PR C merges and let them ride trains (the orchestrator's call).
- **A15** The mission validator's `oneChance` / `window` kinds (`scripts/mission-validate.mjs` :18, :229, :405 and
  `mission-schema.md` :54, :87 @0c62a921) are dropped in J12's mission-validator re-cut; J7 sends the note. Undo: a J7
  slice on `feature/mission-validator`.
- **A16** Campaign results, save and stars stay J22's: `markCompleted` (sectorMode.ts:1033) still writes a Sector Ops
  stars record for Tallow until J22. Undo: none (J22 replaces it).
- **A17** TGC / TKL `graph.json` and `BEAT.md` change with the data (mission data, no geometry;
  `tests/tallowWharf/sectors.test.ts` compares them character for character). R1 starts each of the four files from
  #372's copy (origin/feature/mission-framework ab90a071, which already dropped the Q19 rewards) and adds only its own
  lines, so PR C's later merge of #372 stays clean. The SIGNOFF pages are J8's. Undo: revert the changed fields.
- **A18** After the move the step names his new place: `MissionStep.boltText` (TGC tgc-3: "Take the grey coat with the
  black umbrella in the clock-mender's back loft", 74 characters) shows while the step's spook fact
  (`<step id>-spooked`, kept on restore) is held. The client learns it from the wire's fact bits (`ms.f`, one more bit
  after the `gives` facts): no message shape change. Undo: drop `boltText` and the spook fact (the line keeps the
  reading room).
- **A19** A blocked start (campaign block or over capacity) returns before the session leaves `lobby`, so the room can
  still start once the partner joins. Undo: none needed (a bug fix).
