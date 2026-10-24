# Campus S1-S5 sign-off pages: Opus check (2026-10-24, branch feature/sector-redesign-signoff @ 6b13cd32)

Verdict: FIX

Checked: S1..S5.md, S1..S5-detail.md, all 13 plan SVGs, SYNC.md, README.md, plan/campusOps-S1..S5.json, against the
SIGNOFF-PLANNER rulebook (feature/sector-redesign-polish), the signoff template (feature/intake-gates), audit section 4
(feature/menu lines 67-97) and ROADMAP lines 60-68 (feature/menu).

What passes:
- Validator, five plan files together: **0 errors**, 118 warnings (one new: `exfil 's4-cc' is not in the last section`).
- Intent line 1 on all five pages is verbatim ("I would prefer having as many guards as realistically possible to make it
  challenging.", ~22:00, ROADMAP line 67 on feature/menu). One decision, option 1 "go as drawn", pick blank, on every page.
- Connectors and entry / exit unchanged vs the as-built graphs: C1 (-20,-34)/(-20,-30), C2 (4,-14)/(10,-14.6),
  C3 (24,0)/(24,16), C4 (-10,29)/(-26,29); spine links identical (S4's C4 link only gains `shared: true`); entry / exit
  tags unchanged; linear spine S1 -> S5.
- Guard ramp 15 < 18 < 20 < 25 < 36; each detail table sums to its page count. Awake-on-screen claims 11 / 11 / 11 / 9 / 12.
- Splits: S1 48.6/47.3 s, S2 40.4/41.5 s, S3 41.2/34.6 s (16%), S4 24.2/28.8 s (16%), S5 17.7/18.5 s; each has an
  overwatch tag and partner reach under 15 s. Two tracks meet at the exit in every section.
- SYNC.md matches the 25 graph `syncs` entries exactly (id, kind, space, track, src, lead, S2 solo). The one pair node
  (sync-s2-pairdoor) has `solo`.
- Area boxes spot-checked against the overlays at 10 px / m, 3+ per section (S1 gatehouse / car park / yard, S2 landing /
  comms / void strips, S3 dock / stairs / plant, S4 lobby / colonnade / NOC hatch, S5 anteroom / cage / back hall): all match.
- One `<g id="plan">` per SVG, each with a key box; no em or en dashes; no reference-game names.

## Must-fix

1. **S5's 36 guards break the live guard cap.** `S5.md:10`, `S5-detail.md:119-138`. `SECTOR.maxAlive` is 32
   (`src/game/sectors.ts:508`), the co-op snapshot carries at most `MAX_ENEMIES` 32 (`src/net/protocol.ts:25`), and
   `tests/campusS5.test.ts:200` asserts guards + alarmMax 3 x perStage 2 <= 32. 36 + 6 = 42: four guards cannot spawn even
   before any alarm, and S4's own page says so (`S4-detail.md:121`: "S5 can only reach 26"). S5.md:12 also claims "no new
   engine mechanic". It also passes Michael's 01:20 figure ("up to 24", ROADMAP line 101) without saying so.
   Fix: re-plan S5 to at most 26 guards (32 - 6; still above S4's 25). Drop 10 of the 12 new posts, keeping the K4 audit
   officer and the jetty sentry. Then update S5.md:10, the S5-detail section 6 table, the screen-cap line and the graph
   `guards` counts. If 36 is kept instead, name the engine cost on S5.md:12-13: raising maxAlive / MAX_ENEMIES / the u32
   key masks, a PROTOCOL_VERSION bump, and the guard-cost risk (`src/game/sectorGuardFreeze.ts:4`: S5 worst 15.6 ms at 24
   guards). Make that the decision's option 2.
2. **S5 ground plan clips the extraction.** `S5-plan-0.svg:491` ("#23 van, +34 jetty, +35 lane: z 52-66, north of
   frame"). The frame stops at z 52, so the jetty, the extraction box (x -50..-40, z 60..66), both exfil route ends and
   3 guards are off the picture. That is the page's headline ("the Old House and the extraction").
   Fix: re-render `before/S5-0.svg` with `--bounds -76,10,-20,70`, and shift the overlay +180 px in y (one
   `transform="translate(0,180)"` on `<g id="plan">`). Then draw the extraction box, the two exfil polylines to the jetty,
   and #23 / #34 / #35. Update the mapping in `S5-detail.md:4` to py = (70 - z) x 10.
3. **S1 page miscounts the co-op lips.** `S1.md:17` "Three new co-op lips". Only two are new: CR1-east and CR1-yard
   (`S1-detail.md:105,121`; CR1 and CR1-south are as built, `campusS1.ts:83,92`, `S1-detail.md:211`).
   Fix: "Two new co-op lips (CR1-east, CR1-yard)."
4. **S4 leaves a known break of the 15 s downed-partner rule off the page.** `S4-detail.md:180-182`: a partner downed
   on the baskets is ~25 s away (CR4), and the plan holds it as "Lead's call". Michael's co-op rule (downed partner within
   15 s) stays broken in a section he is approving, and `S4.md` does not say so.
   Fix: add the solo tray-maintenance ladder at B3's south end (26.8, 23) as change C28 in `S4-detail.md` section 1, with
   its slice hours in section 9 and in `S4.md:20`. Or, at minimum, add it to `S4.md:19` ("it does not fix the 25 s
   partner reach on the baskets (CR4)").
5. **A sync node has no lead.** `campusOps-S2.json:103`, `SYNC.md:20` and `S2-detail.md:183`: lead-s2-kitchen has
   `"lead": "-"`. The contract requires a space id for every node (README rule 2). Fix: set `"lead": "s2-l1-kitchen"`
   (the talkers' room) in all three places.

## Polish

- **Sync array name.** S1-detail:277 and :294 (AS5), S3-detail:4, :124 and :237 (AS6), S4-detail:3 and :75, and
  S5-detail:11 and :104 say a top-level `sync` array. All five graphs use `syncs`. S2-detail:175 and :329 (AS4) also
  say "S1 uses `sync`", which is wrong.
- **README contract fields.** README:19-21 lists id / kind / space / src / lead. Add `track` (A / B), and `solo` for
  pair nodes, as the graphs and SYNC.md do. Also note that S2's kp-fac / lead-s2-* ids follow Marlow's chart
  (BEAT.md:90-92), not the `sync-s<N>-<name>` pattern.
- **s4-cc exfil tag.** `campusOps-S4.json:510` tags `exfil` on s4-cc (Code Relay) but no doc mentions it, while S2
  records its mission exfil as `tracks.exfil` instead (S2-detail AS16). Pick one convention and add it to S4-detail.
  S4-detail:167 should then read 30 WARN.
- **Stale counts.**
  - S4-detail:3 says 17 spaces; the graph has 16.
  - Whole-run totals: 116 in S3-detail:36 and S4-detail:167, 117 in S2-detail:49; the current run gives 118.
- **Template.**
  - The S1-S4 intent line 3 is a bullet list, not one line.
  - S5.md:1 says "sign-off S5" (template: "sign-off 5").
  - S5.md:6 adds a third Picture bullet.
  - S5.md:13 should give the unwalked count as the others do ("Campus gets +1 unwalked feature").
- **Intent line 1.** All five quote the guard-density line. S2 (Split Shift) and S3 (re-plan) would answer better with
  the 22:12 mission-design decision. That one is orchestrator text, so keep 22:00 if no verbatim line fits.
- **Guard ceiling.** S4 at 25 passes the 01:20 "up to 24". State on S4.md:15 that the 22:00 line supersedes it.
- **S2 choke routes.** The s2-l1-landing route row (S2-detail:126) has no high or social / tool entry. Name the loud way
  (walk in under cam-bridge past K2) or note that the choke is exempt.
- **S3 vantage line.** S3-detail:106 says "6 of the 11 moving guards", then lists 9. Restate it.
- **C2 far door.** S3-detail:12 gives the C2 far door as (10, 4.5, -14). As built it is (10, -14.6) (`campusS3.ts:328`,
  the spine link reason). The landing-door gap on :81 is then 4.8 m, not 5.4.
- **Catwalk widths.** The S3 crane walkway and escape gallery are 1.5 m, under the camera boom's 2 x 0.78 m clearance
  (scale sheet 101-104) and under 2.0 m if both team players use them. Flag them for the V6 measure.
- **Guard keys.** They are mixed: "1".."4" (S1, S3), "2" (S2, S4), "1" (S5). The validator then reports bands at
  different player counts. Use one convention.
- **S1 plant room box.** The graph area is [-40,-40,-26.5,-33.5]; the detail and SVG say -40..-26 / -40..-33.
- **S5 coordinate order.** The S5 sync src mixes coordinate orders: "(-38, 35.5, 4.2)" is x, z, y, but "(-42.2, 4.2,
  39.5)" is x, y, z.
- **S5 ramp text.** S5-detail:119 says "above S4's ~24"; S4 is 25.
- **meta.sections.** S3 and S4 list all five sections; S1, S2 and S5 list only their own.
- **Plain language.** S2.md and S5.md lean on ids Michael does not know (pg-brg, EW5, CR7, K2, V6). Replace one or two
  with words: "the two-key bridge door", "the door keypads not built yet".

## Fix round (Opus, 2026-10-25, on d6cc89d4; not committed)

Validator, five plan files together: **0 errors, 119 warnings** (was 0 / 118: -1 the s4-cc exfil WARN, +2 S5 guard
bands, hall 3 and lawn 5). Guard ramp now 15 < 18 < 20 < 25 < 26.

1. **S5 over the 32 live cap: fixed.** S5 posts 26 (24 kept + 2 new), 26 + 6 reinforcements = 32. Kept new posts: #28
   audit officer (K4 choke) and #34 jetty sentry (extraction); cut #25-#27, #29-#33, #35, #36. S4 (25) stays below.
   - `S5.md:10` 24 -> 26 and the cap sum (also notes the 01:20 "up to 24" and that 22:00 supersedes it); `S5.md:12`
     "no cap change"; `S5.md:13` ~14 h; `S5.md:17-18` option 1 "Go as drawn (26 guards, inside the 32 live cap)", option
     2 "raise the live cap and post 36 guards" (32 -> 48 wire with a protocol bump, ~+4 ms frame at S5's worst view,
     +8 h).
   - `S5-detail.md:120-162` section 6 rewritten: per space hall 3, ante 4, arch 1, kitchen 1, garden 2, roof 1, lawn 5,
     ctl 3, gal 2, ceo / board 3, lobby 1 = 26; posts, patrols, isolation moments; screen cap worst view 8 (was 12);
     option 2's named cost (`protocol.ts:25`, `coopHost.ts:1591`, `sectors.ts:508`, `awareness.ts:51` u32 keys,
     `campusS5.test.ts:194-200`, `sectorGuardFreeze.ts:4` perf; ~+8 h). Routes per space unchanged (section 3).
   - `S5-detail.md:67` solo route passes #19 (was #33); `:94-95` vantage 5 of 8 outside guards; `:112` fob not posted;
     `:190-194` 31 WARNs (7 guard bands); `:203` held item 6 (the old light-well option 2); `:219-224` AS8-AS10;
     `:231-234` guards slice 2 h, total ~14 h.
   - `campusOps-S5.json:44,77,95,105,119,129,139` guard keys 1 / 1 / 3 / 4 / 2 / 1 / 5 (sum 17 + 9 in notes = 26); the
     space notes name the cut posts; `:7` and `SYNC.md:48` sync-s5-fob src: Penhale not posted.
   - SVGs: `S5-plan-0.svg` +25 / +26 / +27 / +31 / +35 / +36 removed, ground count 19 (`:487`); `S5-plan-4.2.svg:274`
     L1 6 guards (+29, +30 removed); `S5-plan-8.4.svg:112` roof 1 guard (+32, +33 removed).
2. **S5 ground plan clipped the extraction: fixed.** `before/S5-0.svg` re-rendered with
   `node scripts/plan-svg.mjs campusOps --floors 8.4,4.2,0 --bounds -76,10,-20,70` (560 x 600; the old bounds
   reproduce the old file byte for byte). `S5-plan-0.svg` = the new before + the overlay as
   `<g id="plan" transform="translate(0,180)">` (`:326`), with the extraction box x -50..-40, z 60..66 (`:490`), both
   exfil polylines run on to the box (west behind the boathouse, east behind the van), #23 and +34 (`:500`), #20's
   route to the jetty; the "north of frame" note is gone; legend unchanged and clear. `S5.md:5` and `S5-detail.md:4`
   give the new frame and mapping (ground py = (70 - z) x 10).
3. **S1 lips: fixed.** `S1.md:17` "Two new co-op lips (CR1-east, CR1-yard)."; `S1-detail.md:145` says two new, CR1 and
   CR1-south as built.
4. **S4 downed-partner reach: no clean fix; the exception is now on the page.** `S4.md:19` states the ~25 s on the
   baskets and that going as drawn accepts it. `S4-detail.md:180-186` gives the working: a north-wall ladder (12, 41.9)
   would bring the CR4 run to 13.1-13.4 s but is a solo twin of CR4 (10 m from the boost spot); the B3 ladder
   (26.8, 23) fixes only B3; a ladder unlocked from above is a plain one-player SectorBolt (A21 / EG11). Undo named.
   No graph change.
5. **S2 kitchen node lead: fixed.** `"lead": "s2-l1-kitchen"` (`campusOps-S2.json:103`, `SYNC.md:20`,
   `S2-detail.md:183`).

Added by the lead (Marlow Build's mission check):
- S2 sync ids renamed to `sync-s<N>-<name>`: kp-fac -> **sync-s2-kpfac**, lead-s2-kitchen -> **sync-s2-kitchen**,
  lead-s2-plantlog -> **sync-s2-plantlog** (`campusOps-S2.json:102-104`, each with `aka` = the old id; all notes and
  link reasons), `SYNC.md:19-21`, `S2-detail.md:124,174,182-189,231,289-302,362`, `S2.md:16-17` (plain words),
  `S2-plan-0.svg:496`, `S2-plan-4.4.svg:391,393`. The keypad device keeps its SPEC id kp-fac.
- S4 exfil: the `exfil` tag left s4-cc (`campusOps-S4.json:508-510`); new top-level `"tracks": {"exfil": "s4-cc"}`
  (`:912-915`), as S2. The map-level WARN is gone. `S4-detail.md:167` notes it.

New assumptions: S5 AS8 (26 = cap less 6), AS9 (#28 and #34 kept, Penhale not posted), AS10 (the light-well option moves
to held item 6 so the page's one decision is the cap); S4 held item 1 becomes an accepted exception.
