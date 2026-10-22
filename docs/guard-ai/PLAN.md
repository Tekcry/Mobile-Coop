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
| S9 | Co-op (design 12): protocol 32 only if still needed: `bark` NetEvent and a caution bit in `al`; client shows barks and low ready | 2-5 on the client | the client sees radio barks; caution stance matches | protocol tests | e2e-coop, e2e-netmove |

| S10 | Talking pairs (GA2, `pair` tag): the two meet on their loop clocks, face each other, exchange text barks (overheard: player info); a disturbance breaks it; one missing at the meeting makes the other look for him | 8 | a pair meets, talks, splits; take one before the meeting and the other searches | pairs.test | e2e-sectorops |

S1-S3 first: the "not everyone hears, one goes, alerts spread over seconds" fixes Michael named first. Smaller slices
may go to master as their own PRs into trains once green; the rest in one PR at the end.

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
