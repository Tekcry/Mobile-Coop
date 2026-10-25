# CT guard behaviour vs Michael's M1-M6 (guard-ai research, 2026-10-23)

Research only, no code. Maps what Chaos Theory (CT) guards do, from the repo's scrubbed CT research, onto the 9 goals
in `docs/guard-ai/BRIEF.md`, and lists where Michael's words (M1-M6) override CT. Authority (G86): Michael > DECISIONS >
bible > job docs > code. Where CT and Michael differ, **Michael wins**.

Source keys (file:line):
- **MM** `docs/ct-research/moves-mechanics-digest.md` | **LV** `docs/ct-research/levels-digest.md` |
  **KD** `docs/ct-research/kit-design-digest.md` | **DK** `docs/ct-research/design-kit-digest.md`
- **R10** `git show archive/ct-research-raw:docs/ct-research/source/raw/10_ai_detection_and_alarms.md` (raw, unscrubbed:
  read for facts only, never copy names; G154) | **R03** `.../source/03-mechanics.md` | **R07** `.../source/07-audio-and-atmosphere.md`
- **DEC** `docs/DECISIONS.md` | **BIB** `docs/design-bible.md` | **LD** `docs/level-design.md` |
  **REV** `git show origin/feature/menu:docs/archive/reviews/guards-review.md` | **PRO** `docs/ct-prototype/`
- Confidence tags as in the digests: [C] confirmed (2+ sources), [1] one source, [?] unknown, [A] analysis (the
  researchers' design reading, not a CT fact).

## 0. Headline CT rules (what the research actually establishes)

1. **Graded awareness, alarm only when certain.** Routine -> suspicious / searching -> alert / combat. A guard who sees a
   body, a shot-out light, or thinks he saw / heard something enters an alert state on his own but "only rings an alarm
   once he is certain"; suspicion alone starts a personal search. [1 wording, C grading] (MM:423-425, R10:47, R03:200)
2. **Alarms are raised at wall panels.** A fleeing guard is heading for one; shooting him first prevents the alarm.
   Other triggers: camera sightings, failed / late-aborted hacks, wrong face at a scanner, lasers, motion sensors. [C]
   (MM:423-425, R10:60-68, LV:112-114)
3. **Four alarm stages, no abort** (Xbox/PC): 1st freebie (guards respond, then write it off as a false alarm); 2nd body
   armour (about half chest damage); 3rd helmets (headshots need a face hit); 4th permanent high alert, guards fortify
   positions and set up furniture as cover. Armour applies to every guard and only guards. [C] (MM:427-434, MM:449-450,
   R10:78-83)
4. **An alarm is temporary.** Guards abandon routines, draw weapons and search for a while, then return to duty; music
   rises at once, settles as the alarm decays. Whether the counter drops: unknown. [1 / ?] (MM:438-440, R10:85, R03:231-232)
5. **Some rooms open only on an alarm** (extra guards; one masked night-vision enemy spawned by an alarm on V2). [1]
   (MM:439-440, MM:452-453, R03:216, LV:268-269)
6. **Bodies are found only by perception** (a patrolling guard or a live camera; no automatic sweep); a body that is
   seen raises the alarm. A guard who finds a corpse goes to high alert at once. A guard who finds a knocked-out
   colleague **kicks him awake**, which is itself an opening to take the reviver. [C / 1] (MM:497-500, R10:55-58,
   systems_rules raw:92)
7. **Lights:** killing a light alerts nearby guards, who come to fix it (a usable lure). A *specific* guard comes: the
   security-office guard leaves to switch the hall lights back on; the archive guard tries to relight; server-hall
   guards (two) investigate shot-out lights. [C rule, 1 each example] (MM:463-465, R10:16, KD:426, LV:230, LV:235, LV:246,
   LV:267-268)
8. **Hearing = noise above the local ambient marker,** heard by "nearby" guards. Ambient sources (generators,
   machinery, storms, radios, TVs, war noise, a fountain) raise the marker; generators off = quiet and dangerous.
   Guards walk straight to a sound source; in a fight they aim at the last spot the noise rose above ambient. [C / 1]
   (MM:477-482, R10:24-37, R07:310-315)
9. **Search behaviour:** searching guards move slowly and carefully, use flashlights and flares (sometimes thrown into
   dark areas), notice open doors, cut fabric, shot lights and missing colleagues. [C] (MM:505-506, MM:498-499, R10:48-51)
10. **Teamwork via barks:** guards call to each other ("did you hear that?"), a buddy joins, they form **impromptu search
    teams** and call for cover fire; stress stages from puzzled to rattled shown in dialogue and animation; guards
    comment on evidence; patrolling pairs chat (overheard, 3 dialogue variants in one room). [C] (KD:427, R07:282,
    R07:330-332, LV:122)
11. **Combat:** guards take cover, lean and shoot around corners, use squad tactics; frightened guards fire wildly into
    shadows. [C] (R10:52-53)
12. **Not documented in CT** [?]: hearing radii, search / investigation durations, alarm decay timing, guard-to-guard
    radio rules, how reinforcements behave, how two intruders are tracked (R-06), high-security post rules, whether
    difficulty changes perception. Only number: headset voice heard within ~2 m at default sensitivity [C] (MM:488-489,
    LV:105). Known CT fault: guards bumping into each other and alerting others while players were hidden, "an unearned
    alert" [1] (MM:507-508, R10:70).

## 1. Goal-by-goal spec

### Goal 1 - Hearing by range with masking (M1)
- **CT:** rule 8 above. A noise is heard only if it is above the ambient marker where the guard is; surfaces (grass /
  carpet quiet, metal / wood loud), stick speed, crouch, a missed shot into a wall is loudest, breaking a lock is noisy;
  grabs, questioning and device use are silent; some jammed devices crackle and lure. [C / 1] (MM:477-483, R10:26-32)
- **Ours (already decided):** bible S1-S3: every noise is a radius; ambient zones per region with a masking level and
  source label (rain, machinery, generator, vent fan, traffic), switchable with the generator; **"Effective radius = the
  noise radius reduced by the local masking. Wall muffling applies after masking. Guards hear a noise only within the
  effective radius."** (BIB:294-306). G40 silent speed bands (DEC:208); G61 "the sound meter shows what guards hear"
  (DEC:294); LD:153-154 `noiseSuspicion`: a heard noise only pushes a guard past suspicious within ~44% of its radius.
- **Michael (M1):** "if they are within range they should hear it, depending on whether they are near something
  noisey". Matches CT and S3; note M1 masks at the **guard's** position ("they are near something noisy"), CT masks
  against the ambient where the noise is heard. Spec: apply the masking of the zone the listening guard stands in (and
  the source's zone, take the larger), then walls.
- **Today (REV:18-25):** every unalerted guard within radius hears (walls 45%), `heard` overrides `noiseSuspicion`, all
  go suspicious and after 2.4 s all walk over. Radii: glass 15 m, suppressed pistol 9.8 m, bullet impact 4 m, shot lamp
  5 m, loud gunfire 28 m (all to combat). This is the "every guard hears" M1 complains about.
- **Spec:** below-threshold noise = head turn only; above = this guard becomes the incident's investigator candidate
  (goal 5 picks one); loud gunfire = combat only for guards inside the masked, wall-cut radius.

### Goal 2 - Witnessed kill or found body (M1)
- **CT:** rule 6. Corpse -> high alert at once and (if seen by a guard or live camera) an alarm; knocked-out colleague ->
  kick awake; the reviver is exposed while doing it. Searching guards notice missing colleagues. [C / 1]
- **Bible:** environmental change includes "a missing patrol partner (radio check), bodies" (BIB:507-510). LD 4.7
  "Bodies matter": every space has a hide spot near its takedown spots and at least one patrol that would find a body
  left in the open (LD:64-65).
- **Michael (M1):** see a kill or find a body -> wake him if knocked out, **report him dead (radio)**, become cautious.
- **Conflict C1:** in CT a seen body raises the **alarm** (stage +1). Michael's M4 says reinforcements follow "a raised
  alarm (alarm panel hit or a radio report that gets through; killing the caller first stops it)". Open: does a
  dead-body radio report **count as a raised alarm** (stage +1, reinforcements) or only as a section-wide caution?
  CT reading = yes; M1 wording ("report them dead, and become cautious") reads as caution. Needs Michael's call (see
  section 4, Q1).
- **Spec:** the finder walks to the body (bark), kneels: KO -> kick awake (~2-3 s, an exposed window, CT); dead -> radio
  report (interruptible: killing or KO'ing him before it completes stops it, mirroring M4). Witnessing a kill = the
  same, plus combat if the player is seen.

### Goal 3 - Caution and how it clears (M1, M3)
- **CT:** corpse = high alert at once; an alarm is temporary (search a while, then back to duty); 4th alarm =
  permanent high alert. No caution timer is documented. [1 / ?] (MM:438, R10:57, R10:85)
- **Michael (M1, M3):** after a death caution **clears only when every guard aware of it is eliminated**; after a
  knockout it is **timed**: "the woken guard and the one who woke him search, stay cautious a few minutes, then normal".
- **Conflict C2:** CT decays by time; Michael ties death-caution to knowledge (who knows). Michael wins: caution is
  per-guard memory of the incident (G139 "guards know only what they saw" fits: a guard who never heard the report stays
  calm). Death caution never times out on its own; it is a per-guard flag that is gone only when that guard is gone.
- **Conflict C3 (music):** G67 (DEC:313-316) "Cautious after 0.6 s of suspicion ... Cautious 8 s, one step down at a
  time"; G63 "Searching plays Cautious". A caution that lasts minutes or forever must not hold the Cautious layer the
  whole time, or it repeats CT's own anti-pattern A17 (music lingering, players unsure if seen; KD:302, R07:136-138).
  Spec: music follows active searching, not the passive cautious flag.
- **What cautious changes (proposal, CT-flavoured):** torch on in the dark (bible 5.7 level 1 / L9), weapon at low ready,
  shorter waits, slower careful pace (REV:42-46 "careful search ~0.8 m/s at low ready"), more readily suspicious (a
  lower threshold), patrol route unchanged (G143). Numbers: KO caution "a few minutes" = start at 180 s (A-decision).

### Goal 4 - Broken or disrupted light (M1)
- **CT:** rule 7: a specific guard comes to fix it (switch it back on); two server-hall guards come to look at shot
  lights; lights off draws "a specific guard out of a specific room" (LV:267). The jammer (held disruption) also counts;
  some jammed devices crackle. [C / 1]
- **Ours:** bible L9 "Guards notice light changes in their view. Investigating guards in darkness take torches"
  (BIB:280); LD 4.6 "Every lure (a light switched off, a lamp shot, a noise) sends the guard somewhere the player can
  use" (LD:62-63); G11 keeps "guards relight lamps and investigate dead lights" (DEC:823, DEC:958); G152 held jammer.
  Pumphouse Nine beat 2: "AI reacts to a light going out by walking to the switch" (LV:841).
- **Michael (M1):** "one or two people should investigate (if only one is nearby then only one investigates), but they
  should return back to normal after investigating the light and general vicinity".
- **Today (REV:23-25):** nearest calm guard within 25 m looks, every guard within 14 m turns, no wall / line-of-sight
  check (breaks L9).
- **Spec:** only guards who **see** the change (L9, line of sight) or hear the break (goal 1) are candidates; pick up to
  two by path distance (deterministic, G143); torch on; walk to the light, then to its switch if switchable (relight, G11;
  a shot lamp cannot be relit), sweep the vicinity, bark, return to route, **normal** (not cautious). High-security post
  guards (goal 7) turn and look but do not go.

### Goal 5 - Alert spread: voice first, then own-section radio, staggered (M1, M5)
- **CT:** guards call each other, a buddy joins (impromptu search team, G11); alarm is a panel act; no documented
  radio-propagation rule; the documented failure is an unearned cascade (MM:507-508). [C / ?]
- **Ours:** G11 "impromptu paired searches" kept (DEC:96-99, DEC:958); G139 "The shared alert tier rises, but no guard
  'knows' a second intruder exists until one is seen or evidence suggests it" (DEC:731-733); bible "radio windows,
  shared last known position" kept (BIB:500); DK:142-144 alert states Routine / Curious / Investigating ("calls a
  colleague") / Searching (team) / Engaged / Cooling down, each with its own bark.
- **Michael (M1, M5):** "guards that get alerted should alert other guards, either by voice proximity or radio., but not
  everyone should be alerted at once"; M5 "Own section, staggered" (voice range first, then that section over a few
  seconds; other sections stay normal).
- **Today (REV:28-29):** 8 m shout at once, radio after 2.5 s to 22 m, not relayed.
- **Spec:** voice ring (start 8 m, walls cut it) immediately; then radio to the caller's own section, one guard at a
  time, deterministic order by distance, ~0.6-1.0 s apart (total "a few seconds"); a radio call needs the caller alive
  and conscious through its wind-up (M4 "killing the caller first stops it"); other sections untouched. Receivers learn
  the incident and its position, never the player's live position (G139). Barks are the player's readout (DK:271 "Barks
  are UI").

### Goal 6 - Reinforcements only after a raised alarm (M4)
- **CT:** extra guards only on an alarm (side rooms, a spawned specialist) [1]; armour stage 2, helmets stage 3,
  fortify stage 4 [C]; alarm raised at a panel, prevented by dropping the runner [C].
- **Ours:** G125 "Alarms raise a shared alert tier that escalates the guards' response; a mission does not fail on an
  alarm count" (DEC:677-680); G155 "armour and helmets come with the alarm stages" (DEC:787-789); bible 5.7 "Mission
  alarm level 0-3. Each raised alarm adds one level. Level 1: guards draw torches in the dark. Level 2: more guards wear
  helmets and armour, patrols tighten. Level 3: reinforcements." (BIB:503-506); prototype camera alarm stage cap 3, 5 s
  gap (PRO/B3-JAMMER.md:7, :12; PRO/B3-CHECK.md:9).
- **Michael (M4):** "After a raised alarm" (panel hit or a radio report that gets through; killing the caller first
  stops it); M1 "any reinforcements must be aggressive".
- **Conflict C4:** bible gives reinforcements only at level 3 and a 0-3 scale; CT has 4 stages with armour at 2,
  helmets at 3, fortify at 4; M4 sends reinforcements after **any** raised alarm. Michael wins on reinforcements (from
  stage 1); the stage effects should follow CT (G155 says CT's way). The bible line needs updating at merge.
- **Conflict C5:** M4 adds "a radio report that gets through" as an alarm source; CT only has panels (and devices).
  Michael wins; the radio wind-up gives the CT-style "drop him before he reports" window.
- **Spec:** reinforcements spawn at the map's `reinforce` points, run (3.2 m/s today), go straight to the incident /
  LKP, engage on sight, do not hold back (the one place "rush" is allowed); locals keep the tactical rules of goal 8.

### Goal 7 - High-security posts hold (M1)
- **CT:** not documented. CT counter-example: the security-office guard leaves his post to fix a hall light (LV:230) -
  but that is an office, not a high-value post. [?]
- **Ours:** LD 4.1 "Jobs, not lines" and 4.2 "static post" (LD:53-56); 16.6.2 "Valuable rooms are locked, guarded or
  high" (LD:336); PRO/CTCOURSE-SPEC.md:94 the passive duty guard at the monitors (sees and hears nothing, a training
  stand-in).
- **Michael (M1):** "any guards in a highly secure zone should not leave their post or area if they are protecting
  something of high value or a security door that shouldnt be accessed, but they should still be able to be distracted
  at least".
- **Spec:** a post flag with a leash radius; noise / light / body inside the leash: investigate within it; outside:
  turn, torch, look, bark, radio it on (goal 5) but never leave. "Distracted" = facing and attention can be pulled
  (head turn, a few seconds looking away), which is the player's window. Needs map data (`posts`, Course Ready).

### Goal 8 - Tactical guards (M1)
- **CT:** combat cover, lean and shoot round corners, squad tactics; flares into dark areas; frightened guards fire
  wildly into shadows; stage 4 fortify and use furniture as cover; fire at the last noise spot. [C / 1] (R10:48-53,
  R10:83, MM:481)
- **Ours:** `src/cover/` cover data for enemy AI (CLAUDE.md module map); bible 5.7 keeps "search, torches" and
  archetypes; REV:44-46 military reads (pairs 4-6 m apart, pause before entering, corner sweeps, one moves while the
  partner covers, radio before and after a check).
- **Michael (M1):** "work together, flank, use cover to hide and report, they should be smart and tactical, not just
  rush the player".
- **Spec:** on contact the spotter takes cover and radios (the report is the M4 alarm path); a second guard flanks via
  the nav grid, the rest hold cover and suppress the LKP; nobody charges except reinforcements. Search stays slow
  (REV:15-16: today search 1.17 m/s is faster than patrol 0.99 - backwards).

### Goal 9 - Cameras see bodies and send guards (M6)
- **CT:** being seen on a camera raises an alarm; a live camera that sees a body raises it too; ordinary cameras are
  beaten by darkness alone. [C / 1] (MM:496-498, R10:20, KD:147)
- **Ours:** G240 "Every security camera sees in the dark (IR) on every map, Sector Ops included; light still matters for
  guards and the meter." (DEC:1278-1280); bible: cameras "see by their own IR illuminator, not by the lamps, so darkness
  does not hide a body in their cone" (BIB:512-516); G222 faint red laser grid (DEC:1188); a security room console
  switches a camera off once its guard is down (PRO/CTCOURSE-SPEC.md:17, :94).
- **Michael (M6):** "cameras should also see dead or knocked out guards, and report to other nearby guards to
  investigate if so."
- **Conflict C6:** CT camera + body = alarm; M6 = report to nearby guards to investigate (no alarm). Michael wins for
  bodies. A player seen on camera still raises the alarm stage (prototype behaviour, CT). The investigators then follow
  goal 2 (wake / report) when they reach the body. Conflict C7: CT darkness beats cameras; G240 overrides (IR).

## 2. Decisions that constrain the design (exact wording)

- **G11** (DEC:96-99): "Of the nine ideas (guards relight lamps, paired searches, a last-known-position marker,
  eavesdropping, adaptive music and the rest), the CT co-op research keeps those CT has; the rest are dropped." Recorded
  result (DEC:958-959): "the five ideas CT has stay (guards relight lamps and investigate dead lights, paired searches,
  eavesdropping, lock picking with a noise cost, adaptive music); the four it does not have go." KD:427: keep "as CT's
  impromptu search team (a guard calls a buddy), not as a fixed pair rule".
- **G40** (DEC:208): "The two slowest standing and the three slowest crouched speeds are silent."
- **G41** (DEC:212-213): "Guards close doors on a calm patrol and notice any door open that should be shut; one 15%
  threshold for light, sound and sight."
- **G44** (DEC:225): "A player well above a guard is hard to spot, as in CT." (#169 merged into this branch.)
- **G63** (DEC:300): "Searching plays Cautious. The chase music plays only after the player was seen."
- **G67** (DEC:313-314): "Music steps (Cautious after 0.6 s of suspicion, Alert at once, Alert holds 10 s, Evasion 12 s,
  Cautious 8 s, one step down at a time); cooldown counts as calm".
- **G125** (DEC:677-679): "Alarms raise a shared alert tier that escalates the guards' response; a mission does not fail
  on an alarm count. A mission may have at most one hard rule, and it is signposted."
- **G128** (DEC:690-691): "Turrets and other lethal automated defences appear only at military or private compounds;
  elsewhere security responds realistically."
- **G129** (DEC:694): "Guards hearing the players' voice chat is off by default, visible when on, and tunable." (after
  the prototype, G156)
- **G131** (DEC:700): "Difficulty scales guard perception, alert tolerance and resources; sync timing windows never
  scale."
- **G139** (DEC:731-732): "The shared alert tier rises, but no guard 'knows' a second intruder exists until one is seen
  or evidence suggests it."
- **G143** (DEC:744-745): "Some codes, items or rooms vary per run and must be read in the world. Patrols stay fixed."
  Bible (BIB:517-518): "No randomness that defeats planning. Patrol cycles are fixed per map." LD:57 "Clockwork. Patrol
  cycles 25-45 s; stops 3-6 s; gaps in coverage 3-8 s." => investigator choice, radio order and flank picks must be
  deterministic (distance, then id), never random.
- **G146** (DEC:753): "100% means no kills, no alarms and every primary objective".
- **G155** (DEC:787-789): "As in CT, co-op missions have no heavy or dog archetypes; armour and helmets come with the
  alarm stages."
- **G187** (DEC:1005-1006): "aim for 20-25 patrolling guards per section, then measure on the PC." **G254**
  (DEC:1330-1332): "Maximum amount of guards allowable." => hot-path cost of coordination matters (no allocation).
- **G190** (DEC:1017-1021): "make sure the geometry and layout is altered to offer multiple paths ... there must be room to
  maneuver and take them out silently away from others." "patrols sit in separate pockets, each with a takedown spot out
  of the other guards' sight". BRIEF:33 reads it as "guard pairs are the double-takedown beat": a voice ring that is too
  wide breaks the pockets; voice range must respect walls and pocket separation.
- **G222** (DEC:1188-1190): cameras "project a faint red laser grid onto the surfaces they watch, always on, stronger in
  electro vision. Michael's decision, not CT."
- **G240** (DEC:1278-1280): "Every security camera sees in the dark (IR) on every map, Sector Ops included; light still
  matters for guards and the meter."
- **Light parity** (CLAUDE.md hard rules): "what the player sees, the light meter and guard perception must agree."
  Bible L9 (BIB:280): "Guards notice light changes in their view."
- **Every guard armed** (BRIEF:31-33, "Answers 3", not yet in DECISIONS): "Every map's guards are armed".
- **Bible 5.7 Civilians** (BIB:520-522): unarmed, flee to the nearest guard or alarm and raise it, never fight.

## 3. Conflicts summary (CT vs Michael, and doc vs doc)

| # | CT (or doc) | Michael / decision | Resolution |
| --- | --- | --- | --- |
| C1 | Seen body -> alarm (MM:497) | M1 report dead + cautious; M4 alarm = panel or radio report | Ask: does a body report count as an alarm? |
| C2 | Alarm / high alert decays by time (R10:85) | M1 death caution clears only when every aware guard is eliminated | Michael: per-guard knowledge flag |
| C3 | G67 Cautious music steps; CT A17 lingering music | Long M3 / M1 caution | Music on active search only |
| C4 | Bible level 0-3, reinforcements at 3 (BIB:503-506); CT 4 stages | M4 reinforcements after any raised alarm; G155 CT armour | Reinforce from stage 1; CT stage effects; bible update |
| C5 | CT alarm only at panels / devices | M4 radio report that gets through | Michael; radio wind-up is the stop window |
| C6 | Camera + body = alarm | M6 camera reports, guards investigate | Michael for bodies; player-on-camera stays an alarm |
| C7 | Darkness beats ordinary cameras (KD:147) | G240 IR everywhere | Michael |
| C8 | CT office guard leaves post for a light (LV:230) | M1 high-security posts never leave | Only flagged high-security posts hold |
| C9 | CT unearned cascade (MM:508); today every guard hears / every body 22 m searches (REV:18-30) | M1 / M5 "not everyone at once" | Staggered, sectioned, deterministic |
| C10 | REV: Sector Ops tour guards are the melee `runner` (REV:16-17) | "Every map's guards are armed" | Data change for Course Ready |
| C11 | REV / DK: missed tour checkpoint brings a supervisor (DK:150) | Not CT-confirmed ([A], real-world security) | Optional; not required by M1-M6 |

## 4. Open questions for the job lead (only where M1-M6 do not settle it)
- **Q1 (C1):** a dead-body radio report: alarm stage +1 with reinforcements (CT), or section caution only? Suggest:
  treat it as "a radio report that gets through" = raised alarm (M4 wording), since M4 names radio reports explicitly.
- **Q2:** does a raised alarm wake caution in other sections? M5 says other sections stay normal for alerts; CT's stage
  effects (armour, helmets) are global. Suggest: stage effects global, behaviour (search) sectioned.

## 5. Numbers to start from (CT where known, else today's code or proposal)
| Item | CT | Today (REV) | Start value |
| --- | --- | --- | --- |
| Alarm stages | 4: freebie / armour / helmets / fortify [C] | cap 3, 5 s gap (PRO B3) | 4 stages, CT effects |
| Armour | stage 2, ~half chest damage [C] | - | 0.5 chest multiplier |
| Helmets | stage 3, head needs a face hit [C] | - | face-only head hits |
| Voice (mic) | ~2 m default [C] | - | G129, after prototype |
| Noise radii | undocumented | glass 15, suppressed 9.8, impact 4, lamp 5, gunfire 28 m | keep, add masking at the listener |
| Wall cut | undocumented | 45% (`MUFFLE`) | keep |
| Shout ring | undocumented | 8 m at once | 8 m, walls cut |
| Radio | undocumented | 2.5 s to 22 m, not relayed | own section, 0.6-1.0 s per guard |
| Investigate | undocumented | look 4 s, give up 20 s | keep; light: up to 2 guards |
| Search | undocumented ("for a while") | 60 s ring 2-11 m, 3 s per point | keep; paced slower than patrol |
| KO caution | undocumented | 45 s edge after investigation | 180 s ("a few minutes", M3) |
| Panel run | panel reached = alarm [C] | nearest alerted guard, 1.6 s at panel | keep |
| Camera | seen = alarm [C] | range 18 m, 70 x 45 deg, 4 Hz (PRO B3:12) | + body report (M6) |
| Music | rises at once, settles with decay | G67 steps | follow active search only |
