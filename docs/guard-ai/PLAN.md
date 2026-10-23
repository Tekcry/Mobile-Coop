# Guard AI - plan

Spec: `BRIEF.md` (M1-M6, goals 1-9, assumptions A-numbers). Detail and type sketches: `research/tactics-design.md`
(the design; section numbers below are its sections). Current code with file:line: `research/audit.md`. CT rules and
conflicts: `research/ct-behaviour.md`. Every number is a starting value (prototype first, G4).

## Architecture (design sections 1, 11)
- New pure modules in `src/ai/` (no Babylon import, typed arrays, no allocation per tick), each with a Vitest file:
  `hearing.ts`, `incidents.ts`, `awareness.ts`, `radioNet.ts`, `posts.ts`, `squadRoles.ts`, `guardAiData.ts`, and a thin
  `guardBrain.ts` (one board, radio net and awareness table per section) that `EnemyManager` feeds through a
  struct-of-arrays `GuardView` and acts on. Babylon glue (rays, nav path length) passes in as small interfaces.
- Host-only brain (as today). Hunter / Free Roam keep the old rules behind `EnemyManager.coordinated = false`.
- Sections: a Sector Ops section = its `SectorDef` (one live at a time); other maps = one section (0) unless
  `MapLayout.guardAi.zones` splits them. `SectorGuard.squad` groups guards inside a section (radio checks, pairs, roles).

## Slices (sequential: they share enemy.ts / enemyManager.ts)
Each: Opus implementer (AI behaviour code stays Opus; Sonnet only for test / e2e scenario chores from a strict brief),
then a fresh Opus checker, at most 1 fix round. Unit tests local (`npx vitest run <files>`), `npm run check` at the
slice end (desktop lock), e2e by Character Build on the laptop (`E2E_GPU=1`, named suites, the pushed commit).

| # | Slice | Goals | Done looks like | Unit tests | e2e |
| --- | --- | --- | --- | --- | --- |
| S1 | Hearing (design 2): `hearing.ts` (reach -> effective reach with wall dB 6.9 = MUFFLE and ambient masking from `NoisySource`s), tiers ignore / turn / may-investigate / combat; `heard` no longer forces investigate; `hearTurn` for tier 1; gunfire `noise()` uses walls and tiers (far / walled shots = investigate + caution, not combat); a stub assignment (nearest tier-2 hearer only) until S2; `playerRefsInto` in the per-step loop (audit 2) | 1 | of 5 guards in range of a bottle, 1 walks over and the rest turn; a guard by a 12 dB generator does not hear a footstep at 3 m; a shot through two walls at 20 m does not send anyone to combat | hearing.test | e2e-stealth-ai, e2e-stealth |
| S2 | Incident board (design 3): one incident per event, dedupe, investigator by path length / officer / caution (dogs, melee never), acks + "Copy" bark, light: 2 if a second perceiver within 15 m else 1, LOS for `lightsOut` (and the 14 m turn), light check + 4-point ring + stand down to normal; paces investigate 0.85 / search 0.75 (patrol 1.1 unchanged); silent investigator escalates to a G11 pair | 4, 5 (part) | a shot lamp with 3 guards near: 2 go, check, return to their routes calm; a lone guard: 1 goes | incidents.test | e2e-stealth-ai, e2e-ct-warehouse |
| S3 | Radio net (design 5): voice first (hearing model, 12 m reach), then the own section by distance order, staggered <= 4.5 s, deterministic (the `callAlert` `Math.random` jitter goes), a call is a timer the caller must survive (`cut` on die / KO / takedown / blind); other sections untouched; Sector Ops radio = the live section | 5 | 8 guards learn of a contact over ~4 s, nearest first; KO the caller mid-call and only voice hearers know | radioNet.test | e2e-stealth-ai, e2e-sectorops |
| S4 | Awareness and caution (design 4): stable guard keys that survive `revive` (route, squad, hold, info kept), aware masks per incident, witnessed kill event, body found -> wake KO / report dead by radio, held caution (clears only when every aware guard is dead or KO'd and not revived), timed KO caution (waker + woken search 60 s, cautious 180 s, then normal), cautious behaviour (sight x1.3, shorter waits, investigate pace) | 2, 3 | kill a guard in view of one other: that one turns cautious and radios; take him out too and the section returns to normal; KO a guard, let him be found: both search, then calm after ~4 min | awareness.test | e2e-stealth-ai, e2e-takedown, e2e-sectorops |
| S5 | Posts and map data (design 6, 11): `PostDef` on `SquadSlot` (leash, highSecurity, guards), `clampToLeash`, `mayLeave`; distraction pulls a posted guard to the leash edge (off the choke) and back to his post facing; `GuardAiLayout` (zones, noisy, entries, squads) on `MapLayout`; `validateGuardAi`; `EnemyManager.placeSlot(e, slot, section)` for map modes to call after `spawn` | 7 | a vault-door guard turns to a noise, walks to his leash edge, looks, returns; never joins a search outside his leash; a normal post can be sent | posts.test, guardAiData.test | e2e-ctcourse, e2e-sectorops, e2e-ct-warehouse |
| S5b | Sector tags (ENGINE.md section 7 on sector-redesign): `placeSlot` reads `squad` (joinSquad with id section x 100 + squad; default a cluster of posts within 12 m), so radio checks run in Sector Ops and a down partner is missed and searched for; `handler` (dog heels on that guard, alerts / searches by him if he goes down); `zone` (where a guard returns after a search, secure-zone guards answer first inside their leash); `role` (alarm runner supervisor > officer, a desk role calls radio checks, light checker preference) | 2, 5, 7 | a section with a squad of 3: take one out, at the next radio check the others search for him; a dog stays at its handler | sectorGuardTags.test | e2e-sectorops |
| S6 | Alarm and reinforcements (design 7): alarm by panel or a completed command call (4 s x reaction after a contact call gets through; one caller per section; next caller after 3 s if cut); `BehaviourProfile` standard / aggressive / post; reinforcements spawn aggressive at entries (routes optional), know the LKP, never calm | 6 | KO the caller during his call: no alarm, no reinforcements; let it through: alarm, reinforcements bound in fast and flank | alarm.test additions, profile test | e2e-stealth-ai, e2e-sectorops |
| S7 | Cameras see bodies (design 9): `SecuritySystem` body pass 2 Hz per online camera (IR, no light term, G240), a separate body callback beside `onEvent` (CtDevices owns `onEvent`), `camBody` incident: nearest 1 (KO) or 2 (dead) calm guards sent, radio line from the camera; looped / off cameras see nothing | 9 | leave a KO'd guard in a camera's view: within ~5 s a guard is sent, wakes him | securitySystem body test | e2e-sectorops (or e2e-ct-warehouse) |
| S8 | Tactics (design 8): roles point / overwatch / flank / reporter / search per engaged group, `CoverGrid`, cover scoring by role band, peek-and-report, one point and one flanker moving at a time, seeded combat RNG (mulberry per guard per incident) in place of `Math.random` | 8 | a 4-guard contact: one reports from cover, one overwatches, one bounds, one flanks; nobody sprints at the player unless aggressive | squadRoles.test | e2e-stealth-ai, e2e-ct-warehouse |
| S9 | Co-op (design 12), widened by stealth over shooting and now needed; runs after S15 (Opus): protocol 32, the one bump: `bark` NetEvent, `AL_CAUTION` 16 (S4 / S14 caution), `AL_HELMET` 32 and `AL_ARMOUR` 64 in `al`, `hitConfirm` kind `deflect`; client shows barks and low ready; `EnemyPuppet` builds the enforcer shield by kind and the helmet / armour placeholders by bit, drops the helmet when its bit clears | 2-5 on the client; SoS 2, 3, 13 on the client | the client sees radio barks; caution stance matches; a client knocks a helmet off and both screens show it fall; a response team's shield shows on the client | protocol tests (version, `packAlert` bits, `deflect`) | e2e-coop, e2e-netmove |
| S10 | Talking pairs (GA2, `pair` tag): the two meet on their loop clocks, face each other, exchange text barks (overheard: player info); a disturbance breaks it; one missing at the meeting makes the other look for him | 8 | a pair meets, talks, splits; take one before the meeting and the other searches | pairs.test | e2e-sectorops |
| S11 | Stealth over shooting data (SoS; Sonnet 5.5 from a strict Opus brief): pure `src/ai/gear.ts` (`GEAR`, `GEAR_BY_STAGE`, `RESPONSE`, `SWEEP`, `MISSING`, `SHOTS`, `BREAKER`, `LATE` tables; `gearHit(part, kind, helmet, armour, sinceStagger)` -> damage mult / knock-off / stagger, `stageGear(stage)`, `responseTeam(stage, perStage, out)`, `sweepPoints(routes, posts, lkp, thin, out)`); `GuardSlotTags.gear`, `SectorDef.gear?` / `sweep?` types in `guardAiData.ts`; `validateGuardAi` rejects `enforcer` in a section guard list and a bad `gear` tag. No `enemy.ts` / `enemyManager.ts` | SoS 2, 3, 4, 11, 13 (data) | tables and pure functions match `research/stealth-over-shooting.md`; the validator names a section that places a shield guard | gear.test, responseTeam.test, sweep.test, guardAiData.test additions | none (unit only) |
| S12 | Helmets and body armour (SoS; Opus): `Enemy.helmet` / `armour` from the slot tag, `SectorDef.gear` and the stage; `applyDamage` through `gearHit` (head + helmet: knocked off, 0 dealt, stagger 0.9 s; body + armour: 0 dealt, stagger 0.5 s, at most once per 1.5 s; takedowns, sleep bolts, melee, explosions unchanged); placeholder parts on the rig's head / torso nodes, a pooled dropped-helmet prop; `DamageResult.deflect` and a `deflect` hit kind in `playerWeapons.ts` (two lines; tell CT Core); barks | SoS 2, 13 | a helmeted guard lives through one headshot (helmet on the floor, he reels) and dies to the second; an armoured guard takes five chest rounds and lives; both fall to one takedown | gearWiring.test | e2e-stealth-ai, e2e-takedown |
| S13 | Response teams (SoS; Opus): stage gear on every live section guard at the rise and on later spawns (a restart drops it with the stage); the `RESPONSE` team (shield lead + guards, count = `perStage`) in `sectorMode.raised` and `StealthSystems.onAlarm`; the sweep after the LKP search (stack behind the shield, dwell, loop, team offset), never calm or gone until unload / restart; no camera change | SoS 3, 4, 11 | stage 2: every guard armoured, stage 3: helmets too; the team leads with a shield, sweeps the section and is still hunting 2 min later; camera count unchanged | responseWiring.test | e2e-sectorops, e2e-stealth-ai |
| S14 | Section alert (SoS; Opus): a radio-check miss -> the caller's cuttable `missing` call -> timed section caution 180 s (a timed hold in `awareness.ts`; a dead find promotes it to held); a `shots` `CallKind`: a calm guard who hears a loud shot calls it (one per incident, cuttable) -> section caution 120 s (refreshed), the board sends a pair; suppressed shots unchanged; `coopHost` quiet-shot reach = `SHOT_NOISE x noise` (A46); per-section counters for section-rating (bodies found, missed checks, shots calls, radio alarms) | SoS 6, 7 | KO a squad member, the check misses him: "not answering" on the radio, the section turns cautious, two search; KO the caller mid-call: nobody; a loud shot 20 m off is radioed and a far guard turns cautious | sectionAlert.test, radioNet.test additions | e2e-stealth-ai, e2e-sectorops, e2e-coop |
| S15 | Lights: breaker fault, lasting shot lamps (SoS; Opus): a switch-off = one witness walks at patrol pace and flips the circuit back (2 s, no ring, calm); a second cut inside 60 s = the S2 light incident at the switch; a timed isolator relighting ends the walk; late discovery of a dead fixture in view within 12 m; shot lamps never relit | SoS 8 | cut a breaker with two guards watching: one walks over and the lights come back, both calm; cut it again at once: a full check; a lamp shot out unseen is found by the next patrol | breaker.test, incidents.test additions | e2e-stealth-ai, e2e-ct-warehouse, e2e-course |

S1-S3 first: the "not everyone hears, one goes, alerts spread over seconds" fixes Michael named first. Smaller slices
may go to master as their own PRs into trains once green; the rest in one PR at the end.

## Stealth over shooting (S11-S15, SoS; Michael 2026-10-23 ~10:10)
Design and per-item gaps: `research/stealth-over-shooting.md`; assumed decisions A35-A46 (`BRIEF.md`). Items 1, 5, 9,
10, 12, 14, suppressor ammo and the ammo crate belong to other jobs (that file's hand-off table).
- Order: after the chain (S1-S8, S5b, S6, S10) is merged on `feature/guard-ai`. S11 (new pure files and
  `guardAiData.ts` only) can run beside the last chain merge; S12 -> S13 -> S14 -> S15 are sequential (all touch
  `enemy.ts` / `enemyManager.ts`; S13 and S15 also `stealthSystems.ts`); S9 last (it carries S12-S14's state to the
  client).
- Models: S11 Sonnet 5.5 from a strict Opus brief (data, pure functions, tests); S12, S13, S14, S15 and S9 Opus (combat,
  AI and net code). A fresh Opus checker per slice (S11 + S12 may share one), at most 1 fix round.
- Depends: S11 on S5 / S5b (`guardAiData.ts`, `validateGuardAi`); S12 on S11 and S8 (stagger, roles); S13 on S11, S12,
  S6 (reinforcements) and S8; S14 on S3, S4, S5b and S10; S15 on S2; S9 on S12-S14.
- Wire: S12-S15 are host-only, protocol untouched (S14 edits `coopHost.ts`, so e2e-coop runs); S9 takes 32 for all of
  it (if 32 is gone by then, the next free number).
- Map data (sector-redesign, by message): `SectorGuard.gear` per guard and `SectorDef.gear` for later sections; no
  `enforcer` in section guard lists (S11's check); optional `SectorDef.sweep`.
- Art: placeholders only (part-library dome helmet, torso plates, the enforcer's existing box shield, the dome as the
  dropped prop). Helmet, vest and riot-shield meshes are a Character Build / art hand-off (in-repo Blender scratch
  builds, headless) for the visual pass.

## Tests that change by design (audit 7.1)
e2e-stealth-ai reaction scenarios (noise, shots, lights, bodies, radio, radio window, revive, alarm) assert today's
"everyone in range reacts" timing. Each slice retunes the scenario it changes in the same commit, reading numbers from
the game tables, and adds the new behaviour's scenario (one investigator, staggered radio, caller cut, post leash,
camera body). Before changing a speed or timing, grep `scripts/` and `tests/` for it (agent preamble).

## Data shapes (agreed by message; see STATE.md "Open")
- Course Ready (sector-redesign): their `SectorGuard` tags `squad` / `zone` / `role` / `reason` / `pair` / `handler`
  are read as they are; guard-ai adds `post?: PostDef` and `profile?` on `SquadSlot`, `noisy?` / `entries?` on
  `SectorDef` (types in `src/ai/guardAiData.ts`); `sectorMode` calls `em.placeSlot(e, slot, sectionIndex)` after spawn.
- Menu Notes (marlow-final): `MapLayout.guardAi?: GuardAiLayout`; Marlow's training guard gets `post: { leash: 0 }`;
  Course mode should set `em.stealth` if it adds live guards (audit 7.5).

## Hot-path budget
24 guards per section awake, boards 5 Hz, radio 10 Hz, roles 2 Hz per engaged group; < 0.15 ms per tick estimated;
zero allocation (pools, ring buffers, scratch typed arrays). Perf is measured only if a slice touches rendering (none).
