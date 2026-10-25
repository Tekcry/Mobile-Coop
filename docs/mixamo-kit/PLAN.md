# Mixamo on the co-op kit moves - plan (Marlow Build, Opus planner)
Owner: Marlow Build. Status: current (plan, fix round 1, check 2 answered, G400 per-rig source; owners' answers settled). Revised 2026-10-26.
Source of truth: docs/mixamo-kit/PLAN.md on origin/feature/mixamo-kit (checks: PLAN-CHECK-1.md; check 2 items 1-6 answered
here: 1 -> plan 3 "Base" + brief step 0; 2 -> the lead's coop.md commit a9e7cbfa4, verified in step 0; 3 -> plan 2 "Hang
skip" / "Clear rule" + tests (a), (a2), (i); 4 -> plan 4 "Ownership" + brief step 7; 5 -> brief "Read first"; 6 -> plan 3
"Merge path" + brief step 0 / Done).

Goal (Michael ~00:15): "add all mixamo animations in game, i will fine tune as needed. make this priority overnight".
Change (Michael ~00:25): "update - dont set mixamo moves as default in game, allow toggle between hand made, cmu, and
mixamo". So: the kit moves play their Mixamo clip only under the Mixamo animation source of the ACTING player (Player Build's toggle, default
= today's moves); under Hand-made / CMU they play today's kit pose. Each clip is also gated by its `MIXAMO_ON` row.

Heads read: origin/feature/mission-engine 231bdbfbf (origin/feature/kit-mixamo is the same commit, empty: ignored),
origin/feature/mixamo-i3 b932d0311 (the mixamo stack tip: i1 + i2/#477 + i3), origin/feature/mixamo-on 9433a960c (i2 + one
licence line; the toggle code is not pushed yet), origin/master 7df39dc60.

Fix round map (check item -> where answered): 1 -> section 3 "Base" + brief step 0; 2 -> section 2 "Graph scope" + brief
step 4; 3 -> section 2 "Rig gate" + brief step 5; 4 -> section 2 "Hang skip"; 5 -> section 2 "Clear rule" + tests (a),
(a2), (i); 6 -> section 2 "Crawl clock"; 7 -> section 2 "Shutter phase"; 8 -> section 3 "Merge path"; 9 -> section 5;
10 -> section 4 "Laptop e2e".

## 1. How a kit pose is drawn today (mission-engine)

Local player (the one at this keyboard):
1. `TeamController.kitPose` (`src/game/teamController.ts:388-398`) writes `KIT_POSE_LOCAL.k / .gap` each fixed step:
   `k = kitPoseK(state, t, move.times)` (`src/game/kit/registry.ts:255`): -1 in `<move>Offer`, t / time in a timed phase
   (clamped 0..1), else 1. `gap` = the shutter's `run.dev.open` (`kit/shutter.ts:793`).
2. `GameState.teamPoseFrame` (`src/game/gameState.ts:3131-3148` on the base e61e6d6eb) calls `teamPoseOfState(tm.state, tm.partT,
   TEAM_POSE_LOCAL)` (`src/anim/clips/team.ts:355`, kit default branch 418-428): `move` / `role` from `KIT_POSE_OF`, `k` /
   `gap` from `KIT_POSE_LOCAL`. The pose id itself is NOT kept in `TeamPoseIn` (only move, role, k, gap). `teamLinkFrame`
   (team.ts:448) copies it into `TEAM_LINK` (team.ts:442) for the partner's avatar.
3. `Player` (`src/player/player.ts:565`) runs `TeamPoser.begin(dt, TEAM_POSE_LOCAL, rp, this.rig)` before `rig.animate`.
   `TeamPoser.poseB` (team.ts:654-707): `shutter` -> `boostB(-1)` (placeholder), `pull` -> `hangB(false, ...)`
   (placeholder); `applyB` sets `p.traverse = 'brace'` plus bend / bendDrop / reach targets. Role A is posed only for
   `boost` (team.ts:634-650); `begin` returns early when the weight `w <= 0`.
4. Role A bodies come from the kit file's traverse pose: pull partner `pullJump` -> `'hop'`, `pullHang` -> `'hang'`
   (traverseT = haul k), `pullScramble` -> `'climbUp'` (traverseT = k) (`kit/pullUp.ts:402-483`); the shutter crawler
   sets no traverse (crouched, kinematic): the keyed crouched set plays.

Remote partner (another player's avatar on this screen):
1. Wire (`src/game/localMoveState.ts:36-44`): `m` brace (role b) / boost (role a), `sub` PULL_SUB 8 / SHUTTER_SUB 16,
   `s` = `wireS` (the shutter gap; 0 for the pull), `ph` = traverseT only for climbUp / vault / climb (the pull scramble's
   k; 0 through the jump, the hang and the crawl).
2. `RemoteAvatar` (`src/net/remoteAvatar.ts:813-814`) -> `teamPoseOfWire(m, sub, s, ph, id, teamIn)` (team.ts:492; kit
   branches 495-511 brace, 513-528 boost) -> `TeamPoser.begin` -> `rig.animate`.
   - remote holder: `move` from the sub bit, `gap = s`; `k` only when this page's local player is the linked role A
     (`TEAM_LINK`), else -1 (offer pose). The holder's clock on the partner's page is the local climber's k, normalised to
     the climber's own phase (pullJump t / 0.62, pullHang t / 0.9, pullScramble t / 1.1).
   - remote partner: role a, `k = ph`, overwritten by `TEAM_LINK.k` when linked (team.ts:520). Its body:
     `poseFromMoveState` (`src/player/moveState.ts:446-458`): sub 16 -> crouched, no traverse; sub 8 ->
     `traverse = ph > 0 ? 'climbUp' : 'hang'` (a remote pull partner shows 'hang' through the jump too).

Why a new path is needed, and where it goes:
- The keyed path is off under any traverse: `characterRig.ts:2013` (`free = !grounded || traverse !== 'none'`) and
  `:2422` (keyed weight 0 when free), and the graph's keyed weight is gated to `traverse === 'none'` (animGraph.ts
  1950-1988 on i3). The holder is in 'brace', the climber in 'climbUp'; only the crawler (traverse none) reaches it today.
- Injection: `TeamPoser.begin` already gets the rig (`TeamRigIn`), and `CharacterRig` exposes `readonly graph: AnimGraph`
  (`characterRig.ts:747`). Add an optional `graph?: { readonly kit: KitShotIn }` to `TeamRigIn` and a public
  `readonly kit` on `AnimGraph`. TeamPoser writes the shot (clip, clip time, target weight, mode) before `rig.animate`; the
  graph samples it inside `update`. No edit to player.ts, remoteAvatar.ts or studioStage.ts (structural typing, optional
  field).
- Both screens: the clip time comes only from data both pages have (section 2): the shutter gap (wire `s`), the
  scramble's `ph`, the distance along the crawl path, and the linked local clock otherwise.

## 2. Slice design

Agreed mapping (Campaign Build): crawlUnder <- crawling_prone; shutterLift / shutterHold <- lifting_heavy_object;
pullCatch / pullHaul <- kneeling_pull_up; pullScramble <- pulling_up_to_a_ledge. pullOffer, pullJump, pullHang,
shutterOffer and shutterDrop keep today's pose (optional rows below, default false).

Clip facts (headers on master; `docs/mixamo-retarget/CLIPS.md` rows 23, 31-33; pelvis curves read from the modules):
- kneeling_pull_up: keyed one-shot, 180 frames / 4.483 s, in place, kneels throughout (pel y -0.56); leans back ~0.6-1.2 s,
  holds 1.2-2.1, hauls 2.1-2.7, settles by ~3.6 s. Limit: knees not carried (IK legs): reads as a deep squat.
- pulling_up_to_a_ledge: keyed one-shot, 154 frames / 3.817 s; pel y 0 -> +0.5 by 1.4 s, +0.5 -> +1.8 over 1.7-3.1 s.
  Limit: no root path, the hips rise in pel.
- lifting_heavy_object: keyed one-shot, 386 frames / 9.617 s, in place: stand 0-0.6, squat 0.6-2.3, lift 2.3-4.8, hold
  4.8-6.6, lower 6.6-7.5, stand 7.5-9.6. Hands follow the take.
- crawling_prone: keyed gait cycle, 48 frames / 2.333 s, 0.54 m a cycle (0.23 m/s), pel y -0.89 (flat). Limits
  (Player Build; CLIPS.md 23 / 39): no leg channel, IK legs fold under the low pelvis, toe slide 9.2 / 20.7 cm, reach
  short 9.9 cm. No chest / spine spin (that is `trav_crawling_hands_and_knees`, off on i2/i3). Kept on; the Studio judges.

Every number below is one table `KIT_SHOT` in the new `src/anim/kitMixamo.ts`, read by reference every frame. The builder
confirms each segment boundary against the clip's arm and pelvis keys (a frame dump in the test) and lists any change in
the PR. `KIT_SHOT` stays out of the tuner bag in this slice (slice 2).

| Pose id (role) | Clip | Clock (same on both screens) | Clip time | Kind |
| --- | --- | --- | --- | --- |
| pullCatch (b) | kneeling_pull_up | tau = s since the host's start: local `k * PULL.catchClose`; partner's page from the linked climber's `pullJump`: `k * PULL.landT` | [0.45, 1.2] by tau / catchClose, clamped | one-shot |
| pullHaul (b) | kneeling_pull_up | tau: local `k * (haul + scramble)`; partner's page: `pullHang` `k * haul`, `pullScramble` `haul + k * scramble` | tau 0..haul -> [1.2, 3.6]; haul..haul+scramble -> [3.6, 4.483] | one-shot, piecewise |
| pullScramble (a) | pulling_up_to_a_ledge | the AnimInput `traverseT` while traverse is 'climbUp' (local: pullUp.ts sets it = k; remote: wire `ph` = the same k) | [1.6, 3.817] by k | one-shot |
| shutterLift (b) | lifting_heavy_object | g = gap / `KIT_SHOT.holdGap` (local `KIT_POSE_LOCAL.gap`, remote wire `s`) | [2.3, 4.8] by g | one-shot |
| shutterHold (b) | lifting_heavy_object | TeamPoser's own clock since the hold phase began | [4.8, 6.6] ping-pong (mirrored) | loop |
| crawlUnder (a) | crawling_prone | distance along the crawl since its start (rule below) | phase = d / (0.54 m x hk x `crawlStretch`) mod 1 | loop |
| optional, row false: pullOffer (b) | kneeling_pull_up | none (k -1) | hold frame 0.45 s | held |
| optional, row false: pullHang (a) | pulling_up_to_a_ledge | traverseT (local only: remote ph is 0) | [0, 1.6] | one-shot |
| optional, row false: shutterOffer (b) | lifting_heavy_object | TeamPoser clock / 0.4 s | [1.5, 2.3] | one-shot |
| optional, row false: shutterDrop (b) | lifting_heavy_object | 1 - g while falling | [6.6, 7.6] | one-shot |

**Phase fields (team.ts, new fields and kit branches only).** `TeamPoseIn` gains `kit: KitPoseId | ''` and `kt: number`;
`TEAM_LINK` gains `kit` / `kt`. `teamPoseOfState` (kit default branch) fills `kit = state`, `kt` as the table;
`teamLinkFrame` copies them. `teamPoseOfWire` (its kit branches) derives the remote phase: brace + PULL_SUB linked to a
local `pullJump` -> `pullCatch`, to `pullHang` / `pullScramble` -> `pullHaul` (tau as the table), unlinked -> `pullOffer`
(today's pose). Boost + PULL_SUB: `ph > 0` -> `pullScramble` (kt = ph), else `''` (today's hang). Brace + SHUTTER_SUB and
the local shutter: the gap rule below. Boost + SHUTTER_SUB -> `crawlUnder`. `KIT_POSE_IDS`, `KIT_POSE_PLACEHOLDER`,
`TeamState` and every wire name stay unchanged.

**Pull timing.** The holder's haul starts at its own press; the partner's at the host's verdict (one trip later). Each page
drives both bodies from its own local clock (the TEAM_LINK rule), so each screen is self-consistent. A third player (coop4)
sees an unlinked holder in today's offer pose: an existing limit.

**Shutter phase (check item 7).** Both pages use the gap alone, never the local state, so the same number gives the same
frame:
- `g = gap / KIT_SHOT.holdGap` with `KIT_SHOT.holdGap = 0.9` and `KIT_SHOT.crawlGap = 0.85`, copies of `SHUTTER.holdGap`
  / `SHUTTER.crawlGap`. They are copies, not imports, because importing `game/kit/shutter.ts` from src/anim would run its
  `registerKitMove` side effect and close a cycle (shutter.ts -> registry.ts -> anim/clips/team.ts); a unit test asserts
  the copies equal `SHUTTER.*` (tests may import shutter.ts), the `KEYED_IDLE_PERIOD_S` pattern in mixamo.ts. (A device's
  own `holdGap = min(spec.holdGap ?? 0.9, height)`: a shutter whose spec lowers it would clamp g early; none does today;
  logged as A7.)
- TeamPoser keeps the last gap seen and the last phase. Per frame: gap > last -> rising; gap < last -> falling; gap equal
  -> keep the last phase (the wire `s` is stepwise and the fixed step is not the render frame).
- Phase: gap <= 0.001 -> `shutterOffer`; gap >= `crawlGap` and not falling -> `shutterHold`; rising -> `shutterLift`;
  falling -> `shutterDrop`. Offer and drop have rows false (today's pose).

**Crawl clock (check item 6, the fixed-stretch route).** phase = `d / (0.54 x hk x KIT_SHOT.crawlStretch)` mod 1, with
`crawlStretch = 1.85` (at the 0.85 m/s kinematic crawl, about 2x the capture's own speed), so the phase is a pure function
of distance on both pages. `d` = the rig root's plan distance accumulated per frame (hyp2 of the root's x / z step, no
allocation). Reset: `d = 0` when the phase becomes `crawlUnder` (local: the state change; remote: the rising edge of boost +
SHUTTER_SUB, i.e. the phase changing to `crawlUnder` from anything else). Both resets happen at the crawl's start point on
that page's path, so the same path gives the same phase. If the builder finds the remote root path does not start at the
crawl start (interpolation lag carrying a pre-crawl step), it logs the offset as A6 and reports it; the stretch stays.

**What the shot writes (gameplay timing, reach, capsule and wire unchanged).**
- Holder and climber (traverse 'brace' / 'climbUp'): `kitShot` samples the keyed clip straight into `o.keyed` and sets
  the new target `o.keyShot` (weight). The rig applies it to trunk, neck, head and arms only; the pelvis offsets stay on
  the old keyed weight (rig gate below), so the take's kneel depth and the ledge take's +1.8 m rise are dropped and the
  game's root path does the rise (`ropeTopPath`).
- Crawler (on foot, traverse none): the keyed crouched set is live; the shot mixes over `o.keyed` by its weight as
  stanceShot does, pelvis height included (the prone body lies about 0.89 m under rest: inside the 0.9 m gap, and its
  back is far below the curtain's 0.75 m stop, `SHUTTER.crawlBody`, so the curtain never reaches it).
- Hands (TeamPoser reach targets on top, IK wins), written only while the shot weight > 0: shutter lift / hold -> both
  palms on the bar (the edge `gap` m over the floor, `holdSpot` 0.45 m in front, `HAND_HALF` apart), weight
  `KIT_SHOT.barHandW` 1; pull haul -> both palms on the partner's wrist estimate (partner root + its hang height), weight
  `KIT_SHOT.haulHandW` 0.8; pull catch -> the take's reach, no IK until the catch frame.
- Weight: TeamPoser's 0.2 s ease (`BLEND`) on entry and exit. Inside the graph, `kitShot` eases its own weight over
  `KIT_SHOT.flip` (0.1 s) whenever the shot starts, ends, changes phase or the table swaps mid-move (a source flip),
  holding the last clip and clip time while it fades out. No edit to the graph's `mxLast` inertialize trigger.

**Graph scope (check item 2; Player's term: one block after stanceShot).** animGraph.ts gets only:
(a) additive declarations: the public `readonly kit = newKitShotIn()`, the `RigTargets.keyShot` field and its default 0
in `emptyTargets`, and the `kitShot` method's own private fields (scratch keyed pose, eased weight, held clip / time);
(b) ONE `(mixamo-kit)` block straight after the stanceShot call (about :2020 on i3) that calls `kitShot(o)` when
`this.wrenReady && KIT_TABLES[1].any` (some kit row is on; the per-rig source is already in `this.kit`), covering both
the traverse case and the crawler mix; a rig whose source is not Mixamo has weight 0 and writes nothing;
(c) the hang skip, in its own commit. Every hunk is commented `(mixamo-kit)`.

**Hang skip (check 1 item 4, check 2 item 3).** Under the Mixamo source, #477's `mixamoTrav` hang branch (animGraph
:3014) reads the pull partner's `'hang'` with `traverseT` = the haul k as a pendulum swing and the rise speed as a shimmy
pace. `KitShotIn` = `{ clip, time, weight, mode, mx: boolean, move: KitPoseMove | '', role: TeamPoseRole | '' }`
(`mx` = this rig's acting player's source is Mixamo, section 3 "Per-rig source"; it ONLY picks the clip table).
TeamPoser writes `move` / `role` whenever `KIT_TABLES[1].any` (some kit row on), whatever the rig's source and the phase
(local `pullJump` / `pullHang`, and the remote avatar's boost + 8 with ph 0, where the phase is `''`). The skip, one
condition at the top of `mixamoTrav`, own commit:
`KIT_TABLES[1].any && this.kit.move === 'pull' && this.kit.role === 'a'` -> return false (the hand-made HANG).
Why not gated on `mx`: `mixamoTrav` runs on the viewer's global `WREN_TRAV` (#477), so a CMU partner under a Mixamo
viewer would get #477's hang capture with the haul read as a swing while the partner's own screen shows the hand-made
HANG. With this gate all four source pairs show the hand-made HANG (a Mixamo screen skips; a Hand / CMU screen never runs
`mixamoTrav`), and it stays right once Player makes `WREN_TRAV` per-rig. With every kit row false it never fires: #477's
behaviour, bit for bit.

**Rig gate (check item 3; Player agreed: lines :2013 / :2422 / :2610 / :2949 only).** In characterRig.ts (all three
edited lines sit in `applyTargets(t, dt, free)` (:2321), so `ks` is a local and `free` is already a parameter):
- `:2422`: keep `kw` exactly as today (it drives the pelvis offsets, `pex` :2426 on). Add `const ks = free ? t.keyShot : 0`
  (a separate weight; it is 0 on foot, where the crawler uses `kw`).
- `:2610`: the keyed trunk by `kw * t.keyTrunk + ks`.
- `:2949`: the keyed arms by `kw > 0 ? t.keyArmW : 0` plus `ks` (same grip / knee-hand gates).
- `:2013`: not needed (untouched).
- Nothing else in src/player changes.

**Clear rule (check 1 item 5, check 2 item 3).** `graph.kit` target weight is set to 0, `mx` to false AND `move` / `role` to `''` on
every `TeamPoser.begin` path (including the `w <= 0` early return and non-kit moves / roles) before anything else, and in
`TeamPoser.end`, so a hang-down or lip hang after a pull keeps #477's hang capture. The bar / wrist targets are
written only when the shot weight > 0. Tested after a pull ends, aborts (partner gone) and misses.

**Alignment risks.** (1) Pull catch: `PULL.catchDrop` 1.8 m (`kit/pullUp.ts:56`); a kneeling holder's palms reach about
0.8-0.9 m under the edge, so the hands cannot meet at the catch on any clip (the placeholder misses too). Campaign keeps
1.8 m; the slice shows the take's reach without stretching the arms; the hands meet from the haul on. A Michael tuning
item in the PR body. (2) The kneeling take over IK legs reads as a deep squat. (3) The ledge take with its rise dropped may
put the palms off the lip early or late against `ropeTopPath`: measured (palm drift vs the lip) in (f), judged in Studio.

**Fallback.** A row false, a null clip module, a non-Mixamo source, a guard rig (`wrenReady` false), no kit move, or no
phase: weight 0, nothing sampled or written: today's pose bit for bit (tests (a), (a2)).

## 3. Toggle, table, base, merge path, Studio

**Toggle (Player Build's API; pushed on origin/feature/mixamo-on a9b96fe1a).** `src/anim/animSource.ts`:
`type AnimSource = 'hand' | 'cmu' | 'mixamo'`, `setAnimSource(s)` / `applyAnimSource` (resolved once per change; menu
Settings > Gameplay > Animation source, default CMU = today's game; the Studio has the switch and a Set filter). That head
does not hold mixamo-i3, so merging it into feature/mixamo-kit conflicts in Player's files; the lead has asked Player for
the stack order. Until a Player head holds both i3 and mixamo-on, the slice keeps the one-line stub (below); the merge of
that head and the stub swap land in the same commit (brief step 8); `MIXAMO.on` (mixamo.ts) true only under
the Mixamo source; `addMixamoResolver(fn: () => void)` (new in mixamo.ts on feature/mixamo-on) runs at the end of
`resolveMixamo` on load and every source change. The slice never reads the toggle directly.

**Per-rig source (orchestrator 00:55, Q39 / G400).** Each player's animation source rides that player's networked
animation state (Player Build builds the wire part in src/net with the toggle), so every screen draws a player with the
OWNER's choice. The kit clip follows the ACTING player's source as received: the local Wren = the local source; a remote
partner = the source received for that player. Design:
- Two tables, both resolved once per change by `resolveKit()` (registered with `addMixamoResolver`):
  `KIT_TABLES: readonly [KitTable, KitTable]`, index 0 = not Mixamo (every pose id null, `any` false: today's pose),
  index 1 = Mixamo (a pose id's clip when its `MIXAMO_ON` row is on, regardless of the local `MIXAMO.on`, since a remote
  player may be on Mixamo while this viewer is not). Same objects always.
- Per rig per frame, in `TeamPoser.begin`: `const src = kitSourceOf(rig)` (0 or 1), then `KIT_TABLES[src]` by index: no
  allocation, no string compare in the frame.
- Stub until Player names the per-rig field, ONE line in kitMixamo.ts:
  `export let kitSourceOf = (_rig: TeamRigIn): 0 | 1 => (MIXAMO.on ? 1 : 0); // STUB (mixamo-kit): Player's per-rig source`
  It returns the local source for the local rig and for a remote rig too (today's behaviour). A set-up-time test hook
  `setKitSourceOf(fn)` (called once, never per frame) lets tests give two rigs different sources. The swap = that line
  reads Player's field (e.g. `rig.animSource === 'mixamo' ? 1 : 0`), plus the optional field on `TeamRigIn`.
- Rows appended at the END of `MIXAMO_ON` (after the I3 rows): `kneeling_pull_up: true`, `pulling_up_to_a_ledge: true`,
  `lifting_heavy_object: true`, `crawling_prone: true`, and the per-phase keys `kit_pull_offer`, `kit_pull_hang`,
  `kit_shutter_offer`, `kit_shutter_drop`: false. One comment each.
- `src/anim/kitMixamo.ts`: `KIT_TABLES` (above; each a `KeyedClip | null` per kit pose id, plus `any`), rebuilt by
  `resolveKit()`: table 1 holds the clip when `MIXAMO_ON[slug]` (and the phase key for an optional phase), else null;
  table 0 is all null. `kitSourceOf` stub (above).
- Stub until Player's head lands, ONE line in kitMixamo.ts:
  `const addMixamoResolver = (fn: () => void): void => fn(); // STUB (mixamo-kit): swap for the mixamo.ts export`
  then `addMixamoResolver(resolveKit);`. Until the swap, tests call `resolveKit()` after `setMixamo(...)`. The swap =
  replace the stub line with `import { addMixamoResolver } from './mixamo';`.
- Wren only: the graph runs its block only when `this.wrenReady && KIT_TABLES[1].any`; guards never.

**Base (check item 1).** New branch `feature/mixamo-kit` in `C:/NightShift/Mobile-Coop-mixamo-kit` (G94): from
origin/feature/mission-engine 231bdbfbf, merged with origin/feature/mixamo-i3 b932d0311 (mission-engine has no
src/anim/mixamo.ts, the clips or allocPerCall; i3 is the stack tip with stanceShot). The merge conflicts in three files
(i3 carries a newer master). The LEAD MADE THE BASE: merge commit e61e6d6eb (parents 231bdbfbf / b932d0311, verified in
plan check 2: only the three conflicted files differ from git's automatic merge), then a9e7cbfa4 (docs only: coop.md drops
4 stale merge-base lines that master had replaced). The builder verifies it (step 0) and never merges i3 or mission-engine
again. The resolutions it carries, all unions, approved by Campaign Build:
- `src/net/coopHost.ts:18` (the protocol import): the import list takes both `markIntel` and `type UseOnlyGadget`.
- `src/game/takedownController.ts:476-481`: master's line
  `} else if (!g.puppet) g.hud.feedItem('Interrogated: nothing new'); // a client: the host's feed answers`
  then the engine's `revealIntel(g, e.pos, info, e.id)` line with its EN2 comment; the line both sides share stays
  unchanged.
- `docs/systems/coop.md`, both hunks (~304, ~514): master's text first ("Team moves (G180...)" / "(no markers: G339)"),
  then the engine's (mission NET) paragraph.
Before any slice work (step 0): `npm ci` (the worktree has no node_modules), `npm run typecheck:fast` and
`npx vitest run tests/kitNet.test.ts tests/kit tests/teamPose.test.ts tests/mixamoStance.test.ts tests/mixamoTraverse.test.ts tests/mixamoSwitch.test.ts`;
any failure: stop and report (no fixes).

**Merge path (check item 8).** The PR is a DRAFT to master, body line: "Not for the train: Campaign Build merges
feature/mixamo-kit into feature/mission-engine after #477 and mixamo-i3 are released on master." It holds the checker and
laptop statuses only. Slice size = `node scripts/pr-size.mjs --base e61e6d6eb --head HEAD` (the CI rule: docs, `*.md`,
`changes/**` and baked clips not counted), under 1.5k, reported in the PR body and to the lead (the PR's own diff to master
includes the engine and the stack and is not the slice's size). Player's toggle comes in by MERGE of a Player head that
holds both mixamo-i3 and mixamo-on (not a9b96fe1a alone), no rebase, no force push, with the stub swap in that same merge
commit. Dark twice in play: `?coopkit=1` (the kit) and the Mixamo source (default CMU, today's moves).

**Anim Studio.** Every kit clip already has a Studio loop (mocapSources.ts keyed rows 77 and 83-85 on master), playing
the take whole in place. `KIT_SHOT` is read by reference each frame, so an edit to it reaches play at once (a code edit in
this slice; the tuner bag and Studio pair loops for the pull and the shutter, plus tune rows `team.pull.a/b`,
`team.shutter.a/b` in `teamRowOfWire` (`src/anim/tuneMoveRows.ts:227-231`), are slice 2). studio.ts: no edit in this slice
(Player's file); if one seems needed, stop and report to the lead.

## 4. Claims, sizes, tests, e2e, builder brief

**Ownership (settled).** Player Build agreed: characterRig.ts (the four lines); animGraph.ts (section 2 "Graph scope");
team.ts (the KIT0 code, the `TeamPoseIn` / `TEAM_LINK` phase fields, `graph.kit` set / clear in TeamPoser and
`TeamRigIn.graph?`; small hunks, each commented "(mixamo-kit)"; off bit-identical by test; guards unchanged). studio.ts: no
edit. If one seems needed, stop and report to the lead. (feature/mixamo-on adds a Studio set filter there; it arrives by
the step 8 merge of a Player head holding both i3 and mixamo-on.)
mixamo.ts: the rows at the end only. Campaign's no-touch list (src/game/kit/**, teamController.ts, teamMoves.ts,
mapDef.ts, sectors.ts, sectorTeamDoors.ts, modes/sectorMode.ts, src/net/**, stealthSystems.ts) is respected by the slice's
own edits (the base merge's coopHost.ts resolution, approved by Campaign, is already in e61e6d6eb).

**File claims (slice, measured from the merge commit).**
| File | Change | Lines |
| --- | --- | --- |
| src/anim/kitMixamo.ts (new) | `KIT_SHOT`, `KIT_TABLES`, `resolveKit`, the two stub lines (`addMixamoResolver`, `kitSourceOf`) + `setKitSourceOf`, `KitShotIn` / `newKitShotIn`, pure clip-time maps (tau / g / k / distance -> clip time), the gap phase rule | ~240 |
| src/anim/mixamo.ts | 8 `MIXAMO_ON` rows at the end, a comment each | ~16 |
| src/anim/clips/team.ts | phase fields, link copies, wire phase derivation, TeamPoser kit writes, gap trend, hold / crawl clocks, hand targets, clear lines, `TeamRigIn.graph?` | ~200 |
| src/anim/animGraph.ts | declarations, one block, `kitShot()`, the hang skip | ~150 |
| src/player/characterRig.ts | the four agreed lines (`ks`) | ~12 |
| tests/kitMixamo.test.ts (new) | (a)-(i) and (c2) below | ~560 |
| tests/teamPose.test.ts | phase fields on the existing cases | ~40 |
| changes/feature-mixamo-kit.md, docs/mixamo-retarget/KIT-REPORT.md | fragment, A8 readings | ~70 |
| Total | | ~1,300 |
Not touched: player.ts, moveState.ts, gameState.ts, localMoveState.ts, remoteAvatar.ts, studio.ts, studioStage.ts.

**Tests (`tests/kitMixamo.test.ts`, vitest, headless Wren rig as mixamoStance / mixamoTraverse).**
- (a) Off is bit-identical: every frame, as float64 bits, every `RigTargets` field, the graph pose and the rig's bone
  transforms (mixamoStance (a) pattern), plus TeamPoser's reach / plant targets, root writes and `RigPose` fields, for
  every kit pose id at k 0 / 0.5 / 1 and gaps 0 / 0.45 / 0.9: Hand source and CMU source with the kit rows at their
  defaults (ON: the graph block runs, so bit-identity rests on kitShot doing nothing at weight 0, and on mixamoTrav not
  running under Hand / CMU), Mixamo source with every kit row false (including `pullJump` / `pullHang`: no hang skip,
  #477's hang capture as before), and after the source went Mixamo -> Hand. A guard graph (`wrenReady` false) under the
  Mixamo source too.
- (a2) Mixamo source, kit rows true, no kit move: bit-identical over the non-kit moves that share 'brace' / 'climbUp'
  (leg-up both roles, throw, hang-down, rope) and plain locomotion, including a hang-down and a lip hang straight after a
  pull (the capture hang plays, no skip).
- (b) On: each mapped pose id samples its clip at the table's time (`sampleKeyed` of the clip at the expected phase);
  optional rows false play today's pose; one row false leaves the others on; the `KIT_SHOT.holdGap` / `crawlGap` copies
  equal `SHUTTER.holdGap` / `crawlGap`.
- (c) Both screens match: for each pull phase, the holder's page (local `teamPoseOfState` + `KIT_POSE_LOCAL`, partner via
  `teamPoseOfWire` + `TEAM_LINK`) and the partner's page give the same (clip, clip time) for the same body to one frame;
  the shutter: a stepwise 20 Hz `s` on the remote page and a 60 Hz gap on the local page give the same phase every frame
  and clip time within one wire step; the crawl: both pages fed the same root path give the same phase.
- (c2) Per-rig source (G400): with `setKitSourceOf` giving two Wren rigs different sources in one frame (one Mixamo, one
  not) in the same kit phase, the Mixamo rig draws the clip and the other draws today's pose bit for bit; swapping the
  two sources swaps the result; in the pull hang the skip fires on BOTH rigs (kit rows on); a non-Mixamo (CMU) partner
  rig under a Mixamo viewer shows the hand-made HANG; still no allocation per frame. `setKitSourceOf` is reset to the stub
  after each case (afterEach), so a test source never leaks into later cases.
- (d) Timing kept: root path, capsule, `traverseT`, wire fields and `KIT_POSE_LOCAL` identical with the shot on and off
  over a full pull and a full shutter run.
- (e) Hang skip: under the Mixamo source the hand-made HANG plays for the local `pullJump` / `pullHang` AND for the remote
  avatar (`teamPoseOfWire` boost + 8, ph 0).
- (f) No pop (the I3 (d) measures, under the placeholder's own): shot entry and exit, each phase change, and a mid-move
  source flip Mixamo -> Hand -> Mixamo; palms on the bar within 1 cm through lift / hold; palm drift vs the lip in the
  scramble reported.
- (g) No allocation per frame, shot on and off, local and remote pose: `bytesPerCall` from `tests/helpers/allocPerCall`
  (mixamoTraverse.test.ts:282, mixamoStance.test.ts:31), 0 B over 600 frames.
- (h) A8 readings for KIT-REPORT.md per clip vs today's placeholder (bone step, velocity pop, elbow / knee ranges, planted
  slide). A clip is "visibly broken" when a joint jumps more than 2x the placeholder's, or a limb goes through the body:
  its row goes false with the reading as its comment (the I2 rule); else it stays true.
- (i) Stale state: `graph.kit` weight is 0 and `move` / `role` are `''` after a pull ends, aborts (partner gone) and
  misses, after a shutter ends, and on a non-kit move straight after a kit move (a hang-down and a lip hang after a pull
  play #477's capture hang).
- Sub-step checks: `npm run typecheck:fast` + `npx vitest run tests/kitMixamo.test.ts tests/teamPose.test.ts
  tests/mixamoStance.test.ts tests/mixamoTraverse.test.ts tests/mixamoSwitch.test.ts tests/kitNet.test.ts tests/kit`.

**Laptop e2e (check item 10).** Request on the PR head (no `--affected --list` step: on this branch it selects the whole
engine and stack):
`node scripts/laptop-queue/request.mjs --sha <head> --pr <n> --suites "e2e-coop e2e-netmove e2e-anim e2e-traverse e2e-studio anim-audit e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl" --set kitmix --requester "Night Shift | Marlow Build"`
(e2e-coop + e2e-netmove required by Player's term 3; wharf-tgc / tkl are the kit's own co-op suite, `coopkit=1`, the
pull; shutters SKIP there). No suite runs the kit under the Mixamo source, so the look video (1-2 min) covers it: the pull
and the shutter on BOTH screens under the Mixamo source; its path in the PR body.

**Builder brief (Opus 5.5 builder: animation code; strict).**
```
Night Shift | Marlow Build - builder: mixamo-kit slice 1 (Opus 5.5)
Read first: git show origin/master:CLAUDE.md, git show origin/master:docs/RULES.md, then
`git show origin/feature/mixamo-kit:docs/mixamo-kit/PLAN.md` sections 1-4 (this brief's ONE source of truth; the
scratch copy is not) and docs/mixamo-kit/STATE.md.
Worktree C:/NightShift/Mobile-Coop-mixamo-kit, branch feature/mixamo-kit. Branch guard before every write:
`test "$(git rev-parse --abbrev-ref HEAD)" = feature/mixamo-kit`.

0. Base (made by the lead at e61e6d6eb; VERIFY, do not redo, never merge i3 or mission-engine again).
   git fetch; branch guard; local feature/mixamo-kit = origin/feature/mixamo-kit (pull --ff-only), clean tree.
   Check: `git rev-parse e61e6d6eb^1 e61e6d6eb^2` = 231bdbfbf... / b932d0311...; `git merge-base --is-ancestor
   e61e6d6eb HEAD`; `git diff --stat $(git merge-tree --write-tree 231bdbfbf b932d0311 | head -1) e61e6d6eb` lists only
   docs/systems/coop.md, src/game/takedownController.ts, src/net/coopHost.ts.
   Check the lead's docs commit a9e7cbfa4 (coop.md's 4 stale merge-base lines removed): `git merge-base --is-ancestor
   a9e7cbfa4 HEAD`; `git show --stat a9e7cbfa4` touches docs/systems/coop.md only; coop.md no longer has the old
   "Team moves: brace and boost, human ladder, dual takedown" bullet, and the "snapshot's `info`. Objectives, markers and
   banners use the item and event mirror." line no longer follows master's "(no markers: G339)" line.
   node_modules is missing in this worktree: npm ci (nothing else installed).
   npm run typecheck:fast; npx vitest run tests/kitNet.test.ts tests/kit tests/teamPose.test.ts
   tests/mixamoStance.test.ts tests/mixamoTraverse.test.ts tests/mixamoSwitch.test.ts.
   Any mismatch or failure: stop and report, fix nothing (no new merge, no rebase, no force push).
   Slice size base = e61e6d6eb: `node scripts/pr-size.mjs --base e61e6d6eb --head HEAD` (docs, *.md, changes/** and
   baked clips not counted), under 1.5k.
1. src/anim/kitMixamo.ts: KIT_SHOT (plan 2 numbers; holdGap / crawlGap copies; crawlStretch 1.85), KIT_TABLES (index
   0 not Mixamo, 1 Mixamo), resolveKit, the ONE addMixamoResolver stub line + `addMixamoResolver(resolveKit)`, the ONE
   `kitSourceOf(rig)` stub line + `setKitSourceOf` test hook (plan 3 "Per-rig source"), pure clip-time maps, the gap
   phase rule. Confirm each
   segment against the clip keys (frame dump in the test); list changes in the PR body.
2. src/anim/mixamo.ts: the 8 MIXAMO_ON rows appended at the END. Nothing else there.
3. src/anim/clips/team.ts (Player's file, agreed): KIT0 code, the phase fields and graph.kit set / clear only (plan 4
   "Ownership"); small hunks, each commented "(mixamo-kit)"; `KitShotIn` = clip, time, weight, mode, mx, move, role;
   per rig per frame `KIT_TABLES[kitSourceOf(rig)]` by index (`mx` only picks the table); write move / role whenever
   KIT_TABLES[1].any, whatever the rig's source; the clear rule (plan 2: weight 0, mx false, move / role '' on every
   begin path and in end); hand targets only while the shot weight > 0. KIT_POSE_IDS, KIT_POSE_PLACEHOLDER, TeamState and wire names
   unchanged.
4. src/anim/animGraph.ts (Player's file): (a) additive declarations: public `kit`, `RigTargets.keyShot` + default 0,
   the private `kitShot` method and its private fields; (b) ONE block straight after the stanceShot call (~:2019)
   calling kitShot(o) under `this.wrenReady && KIT_TABLES[1].any`; kitShot eases its own weight over KIT_SHOT.flip
   (start, end, phase change, table swap), holding the last clip; no edit to the mxLast trigger. Commit. (c) The hang
   skip at the top of mixamoTrav (`KIT_TABLES[1].any && this.kit.move === 'pull' && this.kit.role === 'a'` -> return
   false; NOT gated on mx) in ITS
   OWN commit. Every hunk commented "(mixamo-kit)". Fields, no double arguments, no closures, no iterators.
5. src/player/characterRig.ts (agreed by Player Build for these lines only; all in applyTargets(t, dt, free) :2321):
   :2422 keep `kw`, add `const ks = free ? t.keyShot : 0`; :2610 trunk by `kw * t.keyTrunk + ks`; :2949 arms by
   `(kw > 0 ? t.keyArmW : 0) + ks` with the same gates; :2013 not needed (untouched). The pelvis stays on `kw`. Nothing
   else in src/player.
6. Tests (a), (a2), (b)-(i), (c2) in tests/kitMixamo.test.ts; tests/teamPose.test.ts updates; KIT-REPORT.md with the A8
   readings; a row goes false only by the plan's "visibly broken" rule, the reading as its comment.
7. changes/feature-mixamo-kit.md. studio.ts: no edit. If one seems needed, stop and report to the lead. KIT_SHOT stays
   out of the tuner bag. Player's Studio set filter arrives with step 8's merge.
8. The toggle is on origin/feature/mixamo-on a9b96fe1a, but that head does NOT hold mixamo-i3 (merging it here
   conflicts in Player's files): do NOT merge it. Keep the stub. Only when the lead hands over a Player head that holds
   BOTH mixamo-i3 and mixamo-on: `git merge <that head>` (no rebase, no force push), with the stub line swapped for
   `import { addMixamoResolver } from './mixamo';` in that same merge commit; any conflict in src: stop and report;
   rerun step 6.
Never: touch src/game/kit/**, teamController.ts, teamMoves.ts, mapDef.ts, sectors.ts, sectorTeamDoors.ts,
modes/sectorMode.ts, src/net/**, docs/systems/coop.md, stealthSystems.ts, player.ts, moveState.ts, gameState.ts,
localMoveState.ts, remoteAvatar.ts, studio.ts, studioStage.ts; read the animation-source toggle anywhere; change gameplay
timing, reach, capsule or wire; allocate per frame (hyp2 / hyp3, never Math.hypot); trace CT animation.
Per sub-step: npm run typecheck:fast; npx vitest run <plan 4 files>. Commit and push each sub-step (path-limited, never
git add -A), with the Co-Authored-By line the session's reminder gives.
Done = (a)-(i) and (c2) green; `npm run build` main chunk size before / after reported; DRAFT PR to master with the body line
"Not for the train: Campaign Build merges feature/mixamo-kit into feature/mission-engine after #477 and mixamo-i3 are
released on master"; the body lists: the catch reach vs the kneeling clip (PULL.catchDrop 1.8 m kept) as a Michael
tuning item, A1-A7, the rows on / off with readings, the stub swap line, the slice size
(`node scripts/pr-size.mjs --base e61e6d6eb --head HEAD`), the bundle size change, the look video path; the e2e
request posted (plan 4 list). Update docs/mixamo-kit/STATE.md's resume block at each sub-step. Report to the lead: head
sha, slice size, rows on / off, open questions.
```

## 5. Settled answers, risks, assumptions

Settled (check item 9):
- 5.1 Player Build agreed: the characterRig lines :2013 / :2422 / :2610 / :2949; the animGraph scope (declarations, one
  block after stanceShot, the hang skip in its own commit); team.ts (KIT0 code, phase fields, graph.kit set / clear,
  "(mixamo-kit)" comments, off bit-identical by test, guards unchanged); studio.ts zero edits (at most one hunk, Player
  told).
- 5.2 Player Build: the toggle API (animSource.ts, `addMixamoResolver`, `MIXAMO.on` only under Mixamo); the stub swap is
  one line, taken by merge.
- 5.3 Campaign Build: (a) `PULL.catchDrop` 1.8 m stays; the hands meet from the haul on; a Michael tuning item. (b) Build
  on the stacked base now; Campaign merges feature/mixamo-kit into feature/mission-engine after #477 and mixamo-i3 are on
  master; mission-engine does not carry the stack before that. (c) The three base merge resolutions (section 3) are
  approved exactly as written.
- 5.4 Q39 / G400 (orchestrator 00:55): a player is drawn with the OWNER's source on every screen; the kit clip follows
  the acting player's source as received (plan 3 "Per-rig source"); Player Build builds the wire part in src/net and
  names the per-rig field; the `kitSourceOf` stub is swapped in one line then. The old A5 (viewer's own source) is void.

Risks:
- The ledge take with its rise dropped may look like arm motion over the root path (I2 turned the anchored climb-up
  captures off for palm misses). Measured in (f); the row goes false only by the rule.
- crawling_prone at about 2x its speed with IK legs folding under a flat pelvis may read odd; Player says keep it on.
- Segment boundaries are read from the pelvis curves; the arm keys may shift them a few tenths of a second (the builder
  confirms; Michael tunes `KIT_SHOT`).
- The holder's haul and the partner's hang start one network trip apart; each screen is consistent with itself, as
  today's team moves. coop4 observers see the holder's offer pose, as today.
- Master-side changes in the base can break the build without a text conflict: step 0's typecheck and tests catch it
  before slice work.

Assumptions (to the orchestrator for Michael's next look; each undone by a row or a `KIT_SHOT` number unless said):
- A1 optional phases (pullOffer, pullHang, shutterOffer, shutterDrop) stay today's pose: rows false.
- A2 the crawl plays at a fixed stretch (`KIT_SHOT.crawlStretch` 1.85, about 2x the capture's speed), the rest as slide.
- A3 the shutter hold loop runs on each screen's own clock (a sub-second sway offset between screens).
- A4 the takes' pelvis height is dropped for the holder and the climber (the game's root and crouch stay).
- A5 (replaces the void "viewer's own source"): until Player names the per-rig source field, `kitSourceOf(rig)` returns
  the local source for every rig, so a remote partner is drawn in this viewer's source (today's behaviour). Undo: the
  one-line swap to Player's field (G400: the owner's source on every screen).
- A6 only if the builder finds the remote crawl path does not start at the crawl start: the per-page crawl phase offset.
- A7 g uses the default hold gap 0.9 m; a shutter whose spec lowers its hold gap would clamp the lift clip early (none
  does today). Undo: carry the device's hold gap to the pose.
