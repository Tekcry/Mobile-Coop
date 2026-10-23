# S24 check A (correctness vs brief, solo parity) - fresh checker A, 2026-10-23

Verdict: FAIL (one blocking finding: solo parity for guards in combat with no intruder; one fix round)

Head ef44eea5 (bbf83bec + S23 merge dc964d15). Read: CLAUDE.md hard rules / current goal, the S24 brief (whole),
`git diff dc964d15..HEAD -- src tests`, the builder's report (origin/cloud-queue briefs/guard-ai-S24.md).

## Blocking

1. **A guard in combat with no intruder (`hunt = -1`) never picks one up from a squadmate's later sighting: in solo the
   section no longer converges on the fight** (`src/ai/enemy.ts:1262-1266` callContact, `:1721-1726` onLevel,
   `:1240-1248` knownSpot, `:1250-1253` takeSighting, `src/ai/enemyManager.ts:2561-2569` huntingOf, `:2666-2712` rolesStep / rolesFor).
   The caller's contact call carries `this.hunt` at the moment he goes to combat. A guard who goes to combat without
   sight and without a pending intruder has `hunt = -1`, so his shout and section contact carry -1 and every receiver
   joins with `hunt = -1`. Nothing later gives them a slot: the only paths are their own sight, another not-yet-called
   guard's contact, or a loud shot inside its reach (`tell`). Common solo case (CT stealth play): a suppressed body
   shot (or an elbow strike from behind) on an unaware guard from the dark. Damage -> `alert()` -> no `los` -> hunt -1
   -> contact -1 (`hear()` locates nothing). The victim (sawOnce, lastKnown = shooter) walks over, sees the player,
   `takeSighting` gives him slot 0 and `lkp` is valid. But every radio-joined guard keeps `hunt = -1`:
   - `known` = `knownSpot` -> never saw, no stimulus -> **his own position** (enemy.ts:2594): he stands in combat
     facing his own yaw (faceTarget) instead of moving to `lkp` as before S24. Past 18 m he walks the freshest field,
     then stops once within 18 m (tp = his own spot, line clear).
   - He is in no roles group (`rolesFor` needs `hunt === slot`): no point / overwatch / flank for the joined squad.
   - He does not hold slot 0 (`huntingOf`). When the victim goes down the slot is forgotten at once (a located-only
     slot has seenT 99), where the old `hunting` kept it while anyone was in combat.
   - Reinforcements: `alarmHunt = e.hunt` of the raiser (an officer told by a -1 shout, or the victim before he sees
     anyone) -> -1 -> after the entry route they stand at the entry. The builder predicts this exact e2e failure
     (`scripts/e2e-sectorops.mjs` ~3268-3325, S6 alarm (b) "they close on it along the route") and left it unedited.
   Before S24 all of these went to the shared `lkp` once anyone had seen the player. Brief "Solo: unchanged" and M1
   ("work together") both break: a player who wounds a guard quietly sees the section called in and then stand still.
   (Losing A105's walk to the real feet *before* anyone sees the player is intended; losing convergence *after* a
   sighting is not.)
   Suggested fix (G139-safe, coop too): when `takeSighting` gives a guard a slot and he had none (`hunt` was -1) in a
   net mode, he calls the contact again with the slot (`radioCall(this, slot, 'contact')`; `radioNet` dedupes by
   caller + inc + kind, so the new inc goes out, and `Enemy.radio` -> `tell` binds alerted receivers with no hunt).
   Same for the shout. Add a twoIntruders / squadWiring case: a contact with -1, then the caller sees the player,
   the receivers end with `hunt = 0`. Then retune e2e-sectorops S6 (b) (give B a sighting via `ctx.reportSighting`)
   and check guard-cap `pageAlert`.

## Checked and correct
- `IntruderBoard` (src/ai/intruders.ts): matches the data shape; slotFor linear compare, no allocation; fifth id -1;
  `split` false writes slot 0; forget moves freshest to the latest valid stamp; clear keeps ids.
- Hunt sources: own sighting (`takeSighting` from perceive and on going to combat, so his contact carries it); contact
  call inc = hunt (A149), `radioDeliver` -> `e.radio(0, inc)`; voice shout and parked shout/callAlert pass `e.hunt`;
  located shot `noise(pos, reach, by)` with gameState `localRef.id`, coopHost `r.ref.id`, null -> freshest else 0;
  drone -> `op.tell(slot)`; reinforcements via `alarmHunt` (reinforce / joinReinforcement / joinAsReinforcement), device
  responders untouched. First told wins (`pendingHunt`), own sight wins (G139 OK: a guard told of A keeps A).
- Hunt ends: cooldown / unaware, inherit, despawn.
- `huntPos` replaces every shared read (arrival -> searching, search centre, suppressLkp, known, faceTarget,
  flowOf(hunt)); parked modes unchanged (`!stealth` -> feet, all-players field).
- noFeet: never `t.feet` in stealth; never-seen + no stimulus -> his own spot. pickTarget gets the hunted player index.
- radioNet `inc` for contact is opaque: `startCall` / `enqueue` dedupe only; `completed` -> `contactThrough(caller)`
  ignores inc; `bodyHelp(inc)` / `alertThrough` are other kinds; `pendingFor` / `radioLeft` by caller only.
- Per-slot forget (`forgetStep`, index loop); per-slot flow fields allocated once per slot, rebuilt on nav change or a
  >= 0.5 m move (FLOW_MIN 0.5 s), one per update, round robin, reused goal arrays; stealth all-players field blanked
  once. Roles per slot with shared `coverSet.owner`, `callers` Int32Array per slot, `coverSees(c, slot)`.
- freshest for response teams (mirror), reinforce yaw, deviceFresh. Host ghost = host's own slot (`slotFor(localRef.id)`).
- Mirror: `lkp` / `lkpValid` / `sightT` written on report / forget / clear; a located shot does not reset `sightT` (as
  before). No protocol or save change. Hot paths: no new allocation, hyp2 / hyp3 only.

## Polish
- Test (f) is a hard-coded spec, not a differential parity test: every guard hunts 0, so it never exercises an alerted
  guard with `hunt = -1`, the one place the old shared path and the new one differ (finding 1).
- Brief e2e work not in the commit: the new e2e-coop block "two intruders (guard-ai S24)" is not written; the by-design
  e2e retunes (e2e-sectorops S6 (b), guard-cap `pageAlert`, possibly S13 response team) were listed, not done (brief:
  "Retune in the same commit").
- Two groups in the same roles tick can be handed the same free cover (`assignRoles`' taken list is per call; `owner`
  is set only on `reserveCover`). `reserveCover` still stops double occupancy; test (b) passes because the groups are
  30 m apart.
- `noteCaller` skips a caller with `hunt = -1`: a shot-alerted caller is no longer his group's reporter in solo.
- The ghost calls `slotFor(host id)` every frame, so the host claims a slot before being seen (harmless).
- `mirror()` with no freshest leaves `sightT` as it was (only `lkpValid` false); trivial.

## What I ran
- `npx tsc --noEmit -p .`: clean.
- `npx vitest run tests/intruders.test.ts tests/twoIntruders.test.ts tests/coopPerception.test.ts tests/squadRoles.test.ts
  tests/squadWiring.test.ts tests/radioNet.test.ts`: 6 files, 85 / 85 pass.
- No e2e, no full check (per instructions). Finding 1 is from code reading (paths traced above), not a run.
