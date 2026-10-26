# guard-rules S7: lookouts (slice brief)
Owner: Guard AI Build. Status: current.

Re-anchor on the wave 3 merge head before building: S4 changed enemy.ts, S6 changed enemyManager.ts and e2e-sectorops.mjs.

Builder: Opus 5.5 (AI code). Ships DARK behind `flags.lookouts` (F0). Rows: A3 (G335 "static lookouts on some high
routes"). Assumptions: A9, M3 (`docs/guard-rules/BRIEF.md`). Source: `docs/guard-rules/PLAN.md` "PR4" S7. Every anchor
below is quoted by content and checked on 452e23035 (PR2 + F0); line numbers are "~N on 452e23035" only. S4's rise
cause is cited from `docs/guard-rules/slices/S4-BRIEF.md` step 2 (checked on `feature/guard-rules-s4` 84a6c82c4: same
names).

## Goal
With the flag on, a post tagged `lookout: true` is a perch: the guard is never sent off it (board, search, alarm panel,
combat), a lure only turns him inside a leash of at most 1 m, and when he grows suspicious by sight he radios it
(`spotCall`) so the board sends the nearest calm guard within 25 m to the spot, at most every 20 s. Flag off: a lookout
post reads as no post (today's behaviour, bit-identical).

## Location
- Worktree `C:/NightShift/Mobile-Coop-guard-rules-s7`, branch `feature/guard-rules-s7`, cut from the wave 3 merge head
  (`feature/guard-rules` once S4 and S6 are merged into it). Start from `docs/systems/agent-preamble.md` (origin/master);
  branch guard before every write; commit and push each finished sub-step, `git add <your files>` only.

## Files owned (wave 4, file-disjoint from S8; S9 runs after you)
- `src/ai/posts.ts`, `src/ai/guardAiData.ts`, `src/ai/enemyManager.ts`, `src/ai/barks.ts` (one line, step 4; see
  drift: PLAN does not list it, no other wave 4 slice touches it)
- `tests/lookout.test.ts` (new), `tests/posts.test.ts`, `tests/postsWiring.test.ts`
- `scripts/e2e-sectorops.mjs`
- `docs/systems/ai.md` (S7 is PR4's only ai.md editor; S8 hands its lines to you or the lead, S9 has none)
- NOT `src/ai/enemy.ts` (S8 owns it this wave): everything S7 needs from `Enemy` is already public or added by S4.

## Steps
### 1. `src/ai/posts.ts` (pure, no flag import)
1. `interface PostDef` (~20-29, after `guards?: string;`): add
   `/** (guard-rules S7, A9) A lookout's perch: read as a high-security post with the `lookouts` flag on (never sent,
   never leaves; leash <= `POST.lookoutLeash`), and he radios what he sees (`LOOKOUT`). Flag off: no post. */`
   `lookout?: boolean;`
2. `export const POST` (~32-47, `as const`): add `lookoutLeash: 1,` with a doc line (m: a lookout's largest leash, A9).
3. After `POST`: `export const LOOKOUT = { /** s between one lookout's radioed sightings (A9). */ callCd: 20 } as const;`
4. `mayLeave` (~91-93) `return !(post && post.highSecurity);` -> `return !(post && (post.highSecurity || post.lookout));`
   and add "a lookout: never" to its doc. (Pure helper; no runtime caller today, the board reads `GV_POSTED`.)
5. Header comment (~1-15): one paragraph: a lookout is a perch (A9, M3: on a vent route he stands where he overlooks
   the vent run or its exit, a map author's rule).

### 2. `src/ai/guardAiData.ts` `validatePosts` (~204-233)
After the `highSecurity && s.free` check (`if (p.highSecurity && s.free) errs.push(...)`, ~217) add:
- `if (p.lookout && p.leash > POST.lookoutLeash) errs.push(`${who}: a lookout's leash ${p.leash} must be at most ${POST.lookoutLeash} m`);`
- `if (p.lookout && s.free) errs.push(`${who}: a lookout cannot be free (he holds his perch)`);`
- the route check (~218-229) already applies; add `p.lookout ? ' of a lookout' : ''` beside the high-security suffix.
Update the function doc (~198-203) with the two lookout rules.

### 3. `src/ai/enemyManager.ts`
1. Imports: `flags` (S6 adds `import { flags } from '../core/flags';` ~52 on S6's head; add it if missing), `LOOKOUT`
   and `type PostDef` from `./posts` (new import line), `RISE_SIGHT` from `./enemy` (join the existing
   `import { Enemy, type AiContext, type PlayerRef } from './enemy';`, ~7). `MAX_KEYS` is already imported (~38).
2. Fields (beside the other per-key state, e.g. after `private hearWho = new Int32Array(32);` ~335):
   ```ts
   /** (guard-rules S7, A9) Lookouts placed this load with the flag on (0: the per-guard check is skipped). */
   private lookoutN = 0;
   /** (guard-rules S7) Per awareness key: the lookout's `riseN` last seen, and his radio cooldown (s). Fixed size. */
   private readonly lookRise = new Int32Array(MAX_KEYS);
   private readonly lookCd = new Float32Array(MAX_KEYS);
   ```
3. `placeSlot` (~2110-2178). Today it reads `slot.post` three times: `e.tacticsProfile = slot.post ? P_POST : ...`
   (~2129), `e.setPost(slot.post ?? null, slot.yaw);` (~2130) and `zoneRadius({ zone: slot.zone, post: slot.post, ...})`
   (~2139). Before the first, add `const post = this.slotPost(slot.post);` and use `post` in all three. New private
   helper next to `placeSlot` (load time; the copy is the only allocation):
   ```ts
   /** (guard-rules S7, A9) The post a slot gives: a lookout's (flag on) is a high-security copy, so `Enemy.secure`, the
    *  lure and the board's `GV_POSTED` hold him with no `enemy.ts` change; flag off it is no post (today). */
   private slotPost(p: PostDef | undefined): PostDef | null {
     if (!p) return null;
     if (!p.lookout) return p;
     return flags.lookouts ? { ...p, highSecurity: true } : null;
   }
   ```
   Then, right after `e.setPost(...)`: `if (post && post.lookout && e.key >= 0) { this.lookoutN++; this.lookRise[e.key] = e.riseN; this.lookCd[e.key] = 0; }`.
   (`e.key` is set by `spawn`, ~2086, before `placeSlot`.) `slot.post` itself is never mutated.
4. The radio. In `update(dt)` (~3653), the per-guard loop (`for (let i = 0; i < list.length; i++) { const e = list[i]!;
   e.update(dt);` ~3758-3766): right after `e.update(dt);` add `if (this.lookoutN > 0) this.lookoutStep(e, dt);`. New
   private method (no allocation; plain reads; S4's `riseN` / `riseCause` / `stimX` / `stimZ`, S4-BRIEF 2.1-2.4):
   ```ts
   /** (guard-rules S7, A9) A lookout who grows suspicious by sight radios it (`spotCall`) and reports a `noise` incident
    *  at what he saw with no perceivers, so the board sends a calm guard within `INCIDENT.callR` (he is `GV_POSTED`, never
    *  picked). A radioed sighting, not a sound (ai.md). At most every `LOOKOUT.callCd` s. */
   private lookoutStep(e: Enemy, dt: number): void {
     const p = e.postDef;
     const k = e.key;
     if (p === null || p.lookout !== true || k < 0) return;
     if (this.lookCd[k]! > 0) this.lookCd[k] = this.lookCd[k]! - dt;
     const n = e.riseN;
     if (n === this.lookRise[k]) return;
     this.lookRise[k] = n;
     if (!e.alive || !this.coordinated || e.riseCause !== RISE_SIGHT || this.lookCd[k]! > 0) return;
     const lv = e.level;
     if (lv !== 'suspicious' && lv !== 'investigating') return;
     this.lookCd[k] = LOOKOUT.callCd;
     e.bark('spotCall');
     const x = e.stimX;
     const z = e.stimZ;
     this.report('noise', x, this.nav.heightAt(x, z), z, -1, 0);
   }
   ```
   `report` (~2503-2507: `this.board.report(kind, x, z, y, key, this.hearWho, n); this.boardStep(0);`) assigns at once;
   with `n` 0 the board's noise rule falls back to `mark(s, view, 1, false, M.callR, -1)` (calm, free guards within
   `INCIDENT.callR` 25 m, `src/ai/incidents.ts` ~745); `free` (~544-550) skips `GV_POSTED`, so never the lookout.
   `this.nav.heightAt(x, z)` with no y hint is the lowest walkable layer (`navGrid.ts` `pick`, ~373-390), as the
   device report does (~1078).
5. `clear()` (~3903, after `this.pairs.length = 0;` block): `this.lookoutN = 0; this.lookRise.fill(0); this.lookCd.fill(0);`
   (load time). A revived lookout (`revive` ~1720: `e.inherit(old, ...)` keeps key and `postDef`, the copy) carries on;
   his new `riseN` (0) differs from the stored one, which is only stored (he is searching, so no call).

### 4. `src/ai/barks.ts` (one line)
`URGENT` (~150, `const URGENT: ReadonlySet<BarkEvent> = new Set<BarkEvent>([... 'missingReport']);`): append
`'spotCall'`. Why: `BarkVoice.pick` (~191-199) returns null inside a speaker's `BARK.cooldown` 3.5 s unless urgent, and
S4's `onLevel` barks `'suspicious'` ("Huh?") on the same rise, so a non-urgent `spotCall` in the same step is always
dropped (the incident would still go, silently). Add `(guard-rules S7) spotCall: the lookout's radio follows his own
"Huh?"` to the comment. No change to `BARK_EVENTS`, `RADIO_BARKS` or any line text (S4's).

### 5. Tests (vitest)
- `tests/lookout.test.ts` (new). Copy the `guard()` / `manager()` stand-ins of `tests/postsWiring.test.ts` (~22-114;
  do not import across test files) and give the fake `key`, `riseN`, `riseCause`, `stimX`, `stimZ`, `postDef`, `level`.
  `import { flags } from '../src/core/flags'`; every case that sets `flags.lookouts = true` restores it in `afterEach`.
  1. `validatePosts`: `{ leash: 1, lookout: true }` passes; leash 1.5 fails ("at most 1 m"); `free: true` fails; a
     route point 1.4 m out fails with "of a lookout"; leash 0 passes.
  2. `mayLeave({ leash: 1, lookout: true }, k)` false for every kind; `LOOKOUT.callCd === 20`, `POST.lookoutLeash === 1`.
  3. `placeSlot`, flag on: `setPost` gets `{ leash: 1, lookout: true, highSecurity: true }` and the slot's own object is
     unchanged; `tacticsProfile === P_POST`. Flag off: `setPost(null, yaw)`, profile `P_STANDARD` (or the slot's
     `profile`), `zoneR` as with no post.
  4. Never sent: flag on, a lookout (`secure: true`) and a free guard both hear a bottle: the free one gets `sendTo`,
     the lookout `lureTo` (as postsWiring "a bottle heard" ~119).
  5. The radio: a placed lookout (flag on) with `riseN` bumped, `riseCause = RISE_SIGHT`, `level = 'suspicious'`,
     `stimX / stimZ` 10 m off; `lookoutStep(e, 0.1)` (private, via a cast): `bark('spotCall')` once and a calm guard
     10 m from the spot gets `sendTo` (incident kind `noise`); the lookout never does. `level = 'investigating'` also
     calls (S7-a).
  6. No call: `RISE_SOUND` / `RISE_NONE`; level `alert` or `unaware`; `riseN` unchanged; a guard with no lookout post;
     `coordinated` false.
  7. Cooldown: a second sight rise 5 s later: no bark, no second send; after 20 s of steps, a third rise calls again.
  8. Flag off end to end: the same slot placed with the flag off gives `lookoutN === 0` and no bark on a sight rise.
- `tests/posts.test.ts`: `mayLeave` describe (~46-60): one `expect(mayLeave({ leash: 1, lookout: true }, k)).toBe(false)`
  per kind; nothing else changes.
- `tests/postsWiring.test.ts`: in "placeSlot and the map data" (~232) one case: flag on, a lookout slot ->
  `g.setPost` called with a high-security copy; flag off -> `null`. The "every live map's Sector Ops guard-ai data
  validates" case (~273) must stay green (S9's data later passes it).
- Command (only these): `npm run typecheck:fast` and
  `npx vitest run tests/lookout.test.ts tests/posts.test.ts tests/postsWiring.test.ts tests/guardAiData.test.ts tests/campusPosts.test.ts tests/barkCause.test.ts tests/coopGuardAi.test.ts tests/pairsWiring.test.ts tests/squadWiring.test.ts tests/responseWiring.test.ts tests/gearWiring.test.ts`
  (the last five call `placeSlot` on fakes or read the bark tables: they must stay green with the flag off). Never
  `npm run check`. Before touching a default, grep `tests/` and `scripts/` for it (preamble).

### 6. e2e (`scripts/e2e-sectorops.mjs`, written by you, run only by the lead)
New block right after the posts block (comment "(guard-ai S5, goal 7, M1, A10, A12) Posts." ~2464, `if (want(1)) {`
~2471, ends after the assert "posts: a normal post is sent and walks out past his 3 m leash" ~2593), before the
"(guard-ai S5b, ENGINE.md section 7) The sector tags" comment. `if (want(1)) {`, log line
`lookouts (guard-rules S7): never sent, a lure turns him on his perch, a sighting is radioed and someone else comes`,
its own page `run(PARAMS + '&lookouts=1', ...)`. Same setup as the posts block (damageMul 0, security and ctdev
frozen, `sim(0.5)`, the open-stretch site finder of ~2476-2500: copy it or lift it into a module helper used by both,
despawn all, `updateLight` pinned, player 40 m off).
- (a) Never sent, lured on his perch: A = `em.spawn('grunt', site)`, `em.placeSlot(A, { yaw: Math.PI / 2, post: { leash: 1, lookout: true } }, 0)`;
  assert `A.secure && A.postDef.lookout && A.postDef.highSecurity`. A free guard F 8 m east facing west. A bottle 8 m
  east (`em.hear(N, 18, 'distraction')`): `A.incident === -1`, `F.incident >= 0`; over 40 s A's distance from his post
  stays <= 1 + 0.35 and he goes back (lure phase 5).
- (b) The radio: F despawned; F2 placed 3 m west of A facing west (out of the player's view). Player lit
  (`updateLight` -> 1) and teleported 8 m east of A in his view (the site's east lane is clear 9 m). Step 0.05 s until
  `A.level` is `suspicious` or `investigating` (max 6 s; if he goes straight to `alert`, start the player 12 m off or
  pin the light at 0.5), then teleport the player 40 m off in the dark. Record barks through `em.onBark` (as the
  talking pairs block ~2771-2774; the 4th argument is the event). Assert: `A.riseCause === 1`; exactly one `spotCall`
  from A, `radio` true; within 0.5 s F2 has an incident of kind `noise` (read as the pairs block reads the kind) and
  over 10 s closes >= 3 m on the sighting spot; A never more than 1.35 m from his post over 15 s.
- (c) Cooldown: a second glimpse (repeat (b)) within 20 s: no second `spotCall`.
- Use `Math.hypot` only in page code (e2e, not a hot path). The existing posts block stays on `PARAMS` (flag off).
- The lead requests (builder runs no e2e): PR4 gate e2e-anchors, e2e-gadgets, e2e-guard-carry, e2e-levels, e2e-park,
  e2e-section-rating, e2e-sectorops, e2e-stealth-ai, e2e-tactics, e2e-takedown, smoke; plus e2e-coop, e2e-netmove.
  S7's own files map to e2e-guard-carry, e2e-sectorops, e2e-stealth-ai, smoke; the deciding suite is
  `e2e-sectorops --part=1`.

## Docs (`docs/systems/ai.md`; you are PR4's editor)
- Decided direction, the G335 bullet ("Decided (G11, G180, G335) ... Guard AI plans it first; not built yet." ~40-44):
  lookouts built dark behind `lookouts` (S7, A9), pairs behind `guardPairs` (S6); G44 unchanged.
- Posts and high security bullet (~149-167): a lookout (`PostDef.lookout`, leash <= `POST.lookoutLeash` 1 m, never
  free; flag on = a high-security copy at `placeSlot`, flag off = no post); the radio (`spotCall`, `LOOKOUT.callCd`
  20 s, a `noise` incident with no perceivers: a radioed sighting, not a sound, for the guard sheet and J13's cause
  log); M3's rule for map authors (a vent-route lookout stands where he overlooks the vent run or its exit); the S5 roof
  marksman is the first lookout (S9).
- Fold in S8's lines (Sector tags `handler`, ~176-179) if handed to you before your last commit; else the lead folds
  them at the PR4 merge.

## Rules
- Hot path: `lookoutStep` runs per guard per fixed step only while `lookoutN > 0`: typed arrays and field reads, no
  closures, arrays, objects or strings; `hyp2` / `hyp3` if a distance is ever needed, never `Math.hypot` in `src`. The
  one allocation (the post copy) is load time.
- Flag: `flags.lookouts` is read only in `slotPost` (load time). Off: no lookout is placed, `lookoutN` stays 0, nothing
  new runs per step.
- Wire: none. Host only (the client sees the `bark` event S4 appended and the guards in the snapshot). No
  `PROTOCOL_VERSION`, no `src/net` edit.
- Must NOT touch: `src/ai/enemy.ts` (S8), `src/game/**` (S8), `src/ai/pairs.ts`, `src/core/flags.ts`,
  `src/world/maps/**` (S9), `scripts/e2e-stealth-ai.mjs` (S8), any other test, any `BARKS` text or `BARK_EVENTS` order.

## Checks
`npm run typecheck:fast` and the vitest command above, green. No e2e (the lead queues them). Report: built, numbers
used, files, commits, tests changed, results, ai.md lines written, what Michael should try (walk item 6).

## Done looks like (flag on)
- A guard on a `lookout` post is never sent by the board, never runs to a panel or joins a search off his perch, and a
  noise turns him inside 1 m.
- When he grows suspicious by sight he says a `spotCall` line on the radio and the nearest calm guard within 25 m goes
  to what he saw; at most once per 20 s.
- Flag off: a lookout post is no post; every existing posts unit case and the posts e2e block pass untouched.
- The vitest files above green; tsc clean; ai.md updated.

## Est. lines
~400 (posts ~15, guardAiData ~8, manager ~50, barks 1, tests ~210, e2e ~120; docs not counted). PLAN said ~450.

## Assumptions (logged here; closest to PLAN / BRIEF)
- S7-a: "grows suspicious by sight" (A9) covers a sight rise into `investigating` too: a strong glimpse can skip
  `suspicious` (PLAN text names `suspicious` only). Undo: drop the `investigating` arm.
- S7-b: the per-guard state is indexed by the awareness key (`Enemy.key`, `MAX_KEYS` 32, kept on revive) in fixed typed
  arrays made with the manager ("sized at load" in PLAN); a lookout with no key (-1, all 32 taken) does not radio.
- S7-c: the incident's floor is the lowest walkable layer under the sighting (`heightAt` with no hint): a lookout sees
  down onto the ground. A sighting on an upper storey sends the guard to the ground below it.
- S7-d: `spotCall` joins `URGENT` (barks.ts) so the radio line is heard after his own "Huh?".
- S7-e: the radio is gated on `coordinated` (the board's rules); the parked modes get the perch but no radio.

## PLAN pointer drift (PLAN says -> now, 452e23035)
- `enemyManager.ts` `placeSlot` 2018-2019 -> 2129-2130, and PLAN misses the third `slot.post` read (`zoneRadius`,
  2139); `GV_POSTED` 2384 -> 2495; the loop's `e.update(dt)` 3643-3652 -> 3761 (loop 3758-3766); `report` 2392-2396
  -> 2503-2507; "the floor from `this.nav.heightAt` as at 967" -> 967 is now `setSection`, the like call is ~1078;
  the manager's barks "632, 767" -> e.g. 654 (`grenade`), 791 (`body`).
- `enemy.ts` `bark` 982 -> 994 (public, unchanged in shape).
- `posts.ts` 20-29, 91-93; `guardAiData.ts` 204-233; `incidents.ts` 36, 60-61: unchanged.
- e2e "posts (guard-ai S5)" 2453 -> block 2464-2593 (log line 2472).
- `ai.md` Decided direction 36-40 -> 40-44; Posts 145-162 -> 149-167.
- Missing from PLAN: the bark cooldown swallows `spotCall` (step 4: barks.ts joins S7's files); the validator's unit
  tests live in `tests/guardAiData.test.ts` (not claimed), so S7 puts its validator cases in `tests/lookout.test.ts`.

## Lead decisions (2026-10-25 ~23:30)
- S7-a CONFIRMED: the lookout radios on any sight-driven rise, a jump straight to `investigating` included (A9's
  intent; a strong glimpse is still "grows suspicious by sight").
- S7-d CONFIRMED: `barks.ts` (one line, `spotCall` in `URGENT`) joins S7's files; no other wave 4 slice touches it.
