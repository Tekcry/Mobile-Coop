# S5b - Sector tags (fresh checker, 2026-10-23)

Commit 6c214068 on `feature/guard-ai-s5b` (base ae1f1895, the chain S3 + S4 + S5 + S7). Reviewed
`git diff ae1f1895 6c214068` in full (`src/ai/sectorTags.ts`, `guardAiData.ts`, `enemy.ts`, `enemyManager.ts`,
`incidents.ts`, `src/game/modes/sectorMode.ts`, `tests/sectorGuardTags.test.ts`, `scripts/e2e-sectorops.mjs`, docs)
against CLAUDE.md "Current goal" and hard rules, BRIEF M1 / M5 and A26-A28, PLAN row S5b, design 6 and 11, and
ENGINE.md section 7 on `origin/feature/sector-redesign` (the tags as Course Ready's data defines them).

## Verdict: PASS

Nothing is broken or unplayable. Every tag is read as ENGINE.md section 7 defines it. Radio checks now run in every
Sector Ops section, and Warehouse (no tags) gets default 12 m clusters. That is playable and adds no false alarms:
only a guard who is really down and not yet found is missed, once. The rest is polish, plus one merge hazard with S8
that is not visible to git (a duplicate `Enemy.role`, below). Fix that before S8 is merged.

### Re-run here
- `npx tsc --noEmit -p .`: exit 0.
- `npx eslint` on the 7 changed src / test files: exit 0.
- `npx vitest run tests/sectorGuardTags.test.ts tests/postsWiring.test.ts tests/incidents.test.ts`: 3 files, 71 / 71
  pass.
- Not run, as ordered: full `npm run check`, full vitest, e2e. The new `e2e-sectorops` block "sector tags (guard-ai
  S5b)" has not run anywhere yet (`node --check` only), so it still needs its laptop run.

### Verified
- **Tags read as ENGINE.md section 7 defines them.**
  - `squad`: `squadId(section, squad)` = section x 100 + squad.
    - A guard with no squad joins the default cluster of posts within 12 m (`defaultSquads`, never across storeys),
      as `DEFAULT_SQUAD_BASE + cluster`.
    - A dog with a valid `handler` joins its handler's squad (`slotSquads`).
  - `handler`: the dog heels on that guard only (`Enemy.findLeader`). It is bound in either spawn order: `placeSlot`
    binds a handler placed after his dog.
  - `zone`: 'secure', or a word 'sec' / 'secure' (`s3-sec`). Only those zones act. 'lobby', 'gatehouse' and the
    other area labels are stored only.
  - `role`: desk / cctv / operator call the radio checks. A supervisor runs to the alarm first. A rover checks a light
    before a fixed post. The campus words used (`gate`, `cctv`, `patrol`, `posted`, `smoker`, `sentry`) map as A27
    says, and an unknown word is class 0.
  - `reason` and `pair` are stored. `pair` is the S10 hook (`guardAtSlot`), kept current over a revive (`swapSlot`).
- **Wiring.**
  - `sectorMode.fill` passes the def's own `guards` array and `indexOf(slot)`. Pending slots are the def objects, so the
    index is right. A reinforcement slot gives -1: no squad, no slot.
  - The slot cache (`tagSlots`) is keyed by array identity and dropped in `clear()`. `despawnAll` (every unload and
    restart) goes through `clear()`, so a restart reads the tags afresh and `slotGuard` holds no stale handler.
- **Radio checks in Sector Ops, and in Warehouse with no tags.**
  - Gates: a squad of one has no check of its own. A caller must be calm (`unaware`, not held), and a dog or a found
    body is never missed. The `silent` set misses each guard once only.
  - A held (grabbed) guard is alive, so he is not missed. A woken guard is a new Enemy and his old self leaves the
    roster (`swapSquad`).
  - The worst case on Warehouse is the one Michael asked for: a guard knocked out where nobody saw it is missed at the
    next check (about 40 s). Two squad mates walk to where he dropped and wake him, or find him dead, which goes
    through the S4 path. A hidden body gives a search of the spot that ends.
  - No spam: one "Radio check." plus one "All clear." per squad of two or more, every 40 s +- 8 (polish 2 on range).
- **The missing-partner incident.**
  - `reportMissing` writes the squad's calm, free members as the perceivers. The `K_MISSING` assign
    (`incidents.ts:554-575`) takes those perceivers first: lead plus cover, the S2 pair.
  - With one mate free, the nearest other free guard covers (the `c === 1` re-mark, skipping the lead). With none, it
    falls back to the old "any free guard". An existing `missing` report with no perceivers behaves exactly as before.
  - Parked modes keep `caller.searchAt` (the old rule). `e2e-enemies` "radio check" runs in Clear, where
    `coordinated` is false, so its assert is unaffected.
- **Dog-handler binding.**
  - `handlerDown` runs from `onKilled`, which is called for both a knockout and a death (`enemy.ts:1203`, `:1211`).
  - The dog searches round him and barks a 14 m noise (the dog itself is skipped in `hear`), and the board sends one
    guard who hears it.
  - `findLeader` keeps the downed handler, so the dog keeps its heel spot by him.
  - A woken handler takes his dog back (`swapSlot`). A despawned one frees it (`despawn`).
- **No regressions found.**
  - S2 board: `mark` and `best` only gain multipliers. They allocate nothing (`inZone`, `roleSendMul`), and the
    view's typed arrays grow with the cap.
  - S3 radio: untouched beyond `hear`'s optional `skip`.
  - S4 caution / revive: the tags are copied in `inherit`, `swapSlot` runs in `revive`, and the awareness roster is
    untouched.
  - S5 posts: the leash, `secure` and the A17 lure are unchanged. A high-security post is `GV_POSTED`, so the zone rule
    never sends him.
  - S7 camera bodies: `camBody` assignment is untouched. See the e2e risks below.
- **Hard rules.**
  - The board and view paths allocate nothing per tick.
  - String work (`isSecureZone`, `toLowerCase`, `slice`) and the clustering scratch run at load only.
  - No `Math.hypot`. Strict TS is clean.
  - `incidents.ts` stays Babylon-free (sectorTags -> guardAiData -> posts, and posts imports incidents as a type
    only).

## Fixes

None blocking on this branch.

**Merge must-do (do it in this branch's fix round, or at the S8 merge): a duplicate `Enemy.role`.**
- S5b adds `role = ''` (a string tag) at `src/ai/enemy.ts:937`.
- S8 (`feature/guard-ai-s8` 54627243) adds `role = R_NONE` (its combat role, a number).
- The two land in different places, so `git merge` is clean, but `tsc` then fails with TS2300 (checked with
  `git merge-tree`: the merged `enemy.ts` has `role = ''` at 950 and `role = R_NONE` at 1690).
- Fix: rename S5b's field to `job` everywhere it is used:
  - `enemy.ts:937` (field) and `:646` (`inherit`)
  - `enemyManager.ts:927` (`e.role = slot.role ?? ''`)
  - the stub guards in `tests/sectorGuardTags.test.ts`
- Keep `roleFlags`, `GuardView.role` and the slot tag name `role` (no clash: S8 has neither).

## Polish list (later slices or the feel pass)
1. **The radio-check period still uses `Math.random` jitter** (`enemyManager.ts:1524`), against A7.
   Done looks like: a seeded jitter per section.
2. **Radio lines have no range.**
   - A squad's check and reply subtitle ("Radio: All clear.") shows wherever the player is, every ~40 s per squad.
     Several squads reply on the same tick, and only the last subtitle stays.
   - This was already true in Infiltration. It now also happens in Sector Ops.
   - Done looks like: check / reply barks only within earshot or a radio range, or one line per check.
3. **A whole squad down, with a desk calling:**
   - Each missed member opens his own `missing` incident (`radioCheckNow`, key `m.num`), so up to two guards go per
     body.
   - Done looks like: one incident per squad, at the first missed spot.
4. **A dog whose handler died heels on the dead `Enemy.pos`, not the body.** A carried-off body leaves the dog at the
   old spot (A28 accepts "by where he fell"). ENGINE.md asks for the dog to "alert / search by him". It searches and
   barks but does not alert, which matches A28.
5. **`zoneRadius` uses `Math.sqrt` by hand** (`sectorTags.ts:99`, load time). Use `hyp2`, per the conventions.
6. **Infiltration behaviour change** (not in any e2e):
   - A miss is now a board pair (lead + cover) instead of the caller walking over.
   - A squad of one is no longer checked.
   - Note it in `docs/systems/ai.md` under Infiltration.
7. **Course Ready's zones.** Only `s3-sec` reads as secure. Tell them to tag secure areas `secure` / `<x>-sec`, or use
   `post.highSecurity` (S5b.md already says this).
8. **`role: 'handler'` is class 0.** ENGINE.md lists it as a role. Harmless, because the dog's `handler` tag does the
   binding.

## E2E scenarios at risk
- **`e2e-sectorops` "sector tags (guard-ai S5b)"** (new, `scripts/e2e-sectorops.mjs:1938`): not run yet.
  - The natural radio clock (`radioT`, first check 40 s after load) is not pinned.
  - (a) forces its own check about 10 s into the page, so a natural check inside its 2 s window is unlikely.
  - To remove the chance, set `em['radioT'] = 999` at the block start.
- **`e2e-sectorops` camera scenario (S7):**
  - The victim and the helper are now section guards in default squads, so a natural radio check near 40 s can miss
    the knocked-out victim during the revive walk and send two squad mates as well.
  - The asserts still hold: "one sent" is read in the first 5 s, and "revived" counts anyone.
  - Watch the log for a second sender.
- **`e2e-sectorops` posts block and the co-op parts with the AI on:** radio checks now run there, but no assert reads
  them. Low risk.
- **`e2e-enemies` "radio check"** (LEGACY): Clear mode has `coordinated` off, so the old rule applies. Unaffected.

## Merge plan (S5b with S6 and S8)
Order: S5b (after the `job` rename) -> S8 -> S6. The full S6 x S8 resolutions are in S6-CHECK.md.
- **S5b x S6** (`git merge-tree`: TESTING.md, BRIEF.md, ai.md, enemy.ts, enemyManager.ts, sectorMode.ts):
  - `enemy.ts` field block (S5b tags against S6 `behaviour` / `targetInView` / entry route / `joinAsReinforcement`):
    keep both.
  - `enemyManager.ts` import: union to
    `import { reportGuardAi, sectionAt, squadId, validateGuardAi, type GuardSlotTags, type ReinforceEntry } from './guardAiData';`,
    and keep the `sectorTags` import.
  - `sectorMode.fill`: S5b's
    `em.placeSlot(e, p.slot, this.run.index, gs, gs ? gs.indexOf(p.slot as SectorGuard) : -1);`, then S6's
    `if (p.reinforce) em.joinReinforcement(e, this.run.index, p.route ?? null);`. A reinforcement slot is not in
    `gs`, so it gets index -1.
  - Docs: keep both (A26-A28, then A29-A31).
  - Not a conflict: `assignAlarm` (only S5b changes it), `hear()` (only S5b adds `skip`) and `GuardView` (only S5b).
  - Optional later: S6's `contactThrough` / `nextCaller` could rank `ROLE_SUPERVISOR` like an officer.
- **S5b x S8** (BRIEF.md, enemy.ts):
  - `inherit`: keep `this.tacticsProfile = o.tacticsProfile;` and S5b's tag copies.
  - BRIEF: append.
  - Plus the hidden `Enemy.role` clash above.
  - S8's `placeSlot` line (`e.tacticsProfile = ...`) merges cleanly into S5b's new signature.
