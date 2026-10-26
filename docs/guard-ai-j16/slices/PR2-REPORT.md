# guard-ai-j16 PR 2 (G4a, G4b, G6, G5 brief): report
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5, 2026-10-27. Branch `feature/guard-ai-j16-2`: stacks on `feature/guard-ai-j16` (PR #670) and locally
merges `origin/feature/char-shadow-meter-s3b2` (Sector Ops PR #665, S3b-2), merge 24273a00c. Neither base branch was
changed. Commits: 5e82f6b56 (G4a), ed1c7e82e (G4b), 9250f92cd (G6), 5fb06ea74 (G5 brief, PLAN claims).

## What changed
- **G4a** (one commit, PLAN row G4a / PR 1 check B polish 5):
  - `src/game/gameState.ts:793` `w.enemyMgr.chars = this.charOccluders` right after `new EnemyManager(` (null with the
    flag off: the manager's light reads stay today's 4-argument calls).
  - `src/game/gameState.ts:1913-1914` `fillChars`: `em ? em.fillOccluders(occ, L, n) : fillVictims(occ,
    this.takedownVictims(), L, n)`. Solo / host: guards, dogs and lying bodies keyed by `Enemy.num` / `Body.num`. A
    co-op client (no manager) keeps `fillVictims` for its puppets (BRIEF A10). Sandbox (no manager) also takes the
    `fillVictims` branch, over `NO_VICTIMS`: nothing written, as today.
  - Doc comments: `charOccluders` (`:417-420`) and `fillChars` (`:1894-1900`).
- **G4b**:
  - `src/game/gameState.ts:795` `w.enemyMgr.cues = this.shadowCues`. S3b-2 builds `shadowCues` earlier in the same
    constructor (`:632`), null with the flag off or on a client. A client has no manager anyway.
  - `src/ai/enemy.ts:1483-1487` `get cueLook()`: a read-only debug accessor for the G5 e2e (`turnT > 0 && cueTurn`: the
    look in progress is the cue's own). Never read by the AI.
- **G6** `docs/systems/ai.md:59-62`: G352 / G379 changed from "not built yet" to built dark. `:95-107` a "Shadow cue" item
  under Hearing in Stealth AI: the wiring, gates, numbers, reaction, why it never escalates, the record and the tests.
  `node scripts/doc-lint.mjs`: 0 errors, nothing on ai.md or this job's docs.
- **G5 brief** `docs/guard-ai-j16/slices/G5-BRIEF.md`: the `shadowCue` block on a `charlight=1` page.
  - The spot is picked from the live footprints, so no coordinates are hard-coded and J10's re-light is survivable.
  - The guard faces along the shadow, 2.4 m ahead and 0.6 m to the side of the player. The player does a silent
    standing walk (>= 2.3 m away, >= 120 deg behind him). This covers fold-in 7.
  - Asserts the cue record, suspicious only, facing the point, no bark, no hearing calls, `g.noise` 0, and that the
    meter is never pinned. Plus a standing-still control and a flag-off control.
  - Names every debug hook it reads.
- `docs/guard-ai-j16/PLAN.md` claims: adds `tests/guardShadowGame.test.ts` (new file).

## Tests
- New `tests/guardShadowGame.test.ts` (7 cases). It runs GameState's real `fillChars` on a prototype stub, with a real
  `EnemyManager` on stubs:
  - Host: owner keys `[player 0, guard 7, dog 9, body 4]`. No list-index key. Bit-equal to `fillPlayers` +
    `fillOccluders`. The spy is called once with the contract and n.
  - The overflow is the manager's count.
  - 0 B per `fillChars` (`bytesPerCall`).
  - Client: `fillVictims` keys by list index and is bit-equal to the direct call.
  - Flag off: nothing filled, the manager is never asked.
  - Source checks: the constructor sets `chars` then `cues` right after `new EnemyManager(`, once each, and
    `shadowCues` is built before the manager. `fillChars` switches only after `if (!occ) return;`.
- The late set reaching a guard is covered by the existing G3 case "AiContext reads chars and cues through getters"
  (`tests/shadowNoticePerceive.test.ts`). It sets `em.cues` / `em.chars` after construction and the next perceive cues.
- `tests/shadowNoticePerceive.test.ts:312` (new case): `cueLook` is true after a cue. It is false after `hearTurn`,
  after the look runs out, and with null cues.
- `npm run typecheck:fast`: clean. `npx eslint` on the 4 touched code files: clean.
- `npx vitest run` on 72 test files: every test importing `src/game/gameState`, `charOccluderFill`, `shadowCues` or
  `src/ai/enemyManager`, which includes the new and touched files, `shadowCuesGame`, `charMates`, `charOccluderFill`,
  `guardOccluders` and `shadowNotice`. Result: 72 passed, 1060 tests passed (68 s).
- Not run, as instructed: npm run dev, e2e, a full npm run check.

## Size
Counted lines excluding docs (`git diff --shortstat 24273a00c..HEAD -- . ':!docs'`): +236 / -3.
- src: +21 / -3 (gameState 15, enemy 6).
- tests: +218 (guardShadowGame 199, shadowNoticePerceive 19).
- Docs: +125 (G5 brief 102, ai.md 21, PLAN 1).
- G5's e2e (~160-200 lines) comes later, from the Sonnet builder.

## For the checkers
- **The /preview/ flag.** With G4b, `charShadowLight` on means live cues. On a /preview/ URL that is the default, so
  the existing `e2e-stealth-ai` scenarios run with cues there, because its main page sets no `charlight`.
  - Scenarios that pin the meter (`t.light(v)`) stop the cue fill. Scenarios that don't pin it, with a guard facing
    away from a walking player in a lit spot, may now see a faint cue.
  - The laptop's default build (`localhost:4173`, preview off) is unaffected.
  - If the queue runs the suite on /preview/, watch for a changed level in `light` / `shadow` / `lights`. The fix
    would be `charlight=0` on the main page (an orchestrator call: Sector Ops' S4 meter block shares that page).
- **Visible change with the flag on.** G4a is the first time guards, dogs and lying bodies of the solo / host sim reach
  the contract with their real shapes. The fill used to be the interim upright r 0.22 capsules keyed by list index.
  - The meter, the picture's round shadows (`pictureInto`) and the cue fill all read the new shapes, so a lying body
    now casts a lying shadow.
  - This is the PLAN's G4a done-line, still to be walked: a guard between a lamp and you darkens your meter, and a
    lying body darkens you when you stand over it.
- **No body capsule in a client's picture.** On a client, `fillVictims` writes upright puppets and no bodies (PLAN risk
  2, BRIEF A10). A host and a client therefore draw different body shadows. Picture only: the client has no
  perception.
- **One construction-time set.** `chars` / `cues` are set once. Both are fixed for the GameState's life:
  `charOccluders` is a field initialiser and `shadowCues` is readonly. Re-creating either would need a new set (none
  does today).
- **Branch base.** The branch merges S3b-2 locally. PR 2 should land after #665 is on master. Otherwise the diff
  carries S3b-2's lines.
- **cueLook is the only src/ai change.** It is a getter: no field, no per-step cost.
