# Guard brain upgrade - design (job guard-ai, 2026-10-23)

Spec: `docs/guard-ai/BRIEF.md` M1-M6 and goals 1-9. Base: `docs/archive/reviews/guards-review.md` (origin/feature/menu) plan
A-H, `docs/systems/ai.md`, code on feature/guard-ai (4.64.0 + g44-above). Prototype first: every number below is a
starting value. All new logic is pure (no Babylon import, `P2 = [x, z]` tuples, typed arrays), Vitest-tested; Enemy /
EnemyManager only feed it and act on its output.

## 0. Today, in one screen (what the design replaces)
- `EnemyManager.hear(pos, radius)`: every unalerted guard within `radius` (walls -> `MUFFLE` 0.45) gets `Enemy.hear`,
  which sets `heard = true`; `AlertMachine` makes each suspicious and after `hearLook` 2.4 s each investigates. Result:
  everyone in range walks over. `noise()` (loud gunfire) sends everyone within radius to combat, no walls.
- `lightsOut`: nearest calm guard within 25 m investigates, all within 14 m `notice`; no line of sight, no walls.
- Bodies: finder searches (revives a KO after `BODY.reviveTime` 3 s; `revive` builds a NEW `Enemy`), everyone within
  `RADIO` 22 m searches. Caution after combat is permanent per guard (`AlertMachine.fought`), else `cooldown` 45 s.
- Radio: sighting -> shout 8 m at once, `callIn` 2.5 s x reaction then `callAlert` to all within 22 m (any section),
  delays use `Math.random`. Spotter down first -> nobody told (keep this).
- Alarm: any alerted armed guard within 30 m of a panel runs to it (`assignAlarm`, 2 Hz) -> `onAlarm` -> reinforcements
  (Sector Ops: `perStage` per stage, grunt / heavy alternating, spawned alerted). No radio-raised alarm.
- Paces (x walkSpeed): patrol 1.1, investigate 1.2, search 1.3 (backwards). Combat: `pickCover`, `pickAdvance`, one
  flanker (`assignFlanker`), 16 `Math.random` uses in `enemy.ts` (combat jitter).
- Cameras (`SecuritySystem`) see players only. Barks: `ai/barks.ts`, host HUD only (not on the wire).

## 1. New modules (all `src/ai/`, pure)
| Module | Owns | Tick |
| --- | --- | --- |
| `hearing.ts` | audibility maths, ambient masking, thresholds | per noise event |
| `incidents.ts` | `IncidentBoard` per section: open incidents, dedupe, investigator choice, acks, escalation | 5 Hz |
| `awareness.ts` | guard keys, aware masks, caution per guard (timed / held) | 5 Hz (with the board) |
| `radioNet.ts` | voice + staggered section radio queue, call-in timers, report-gets-through | 10 Hz |
| `posts.ts` | post leash maths (clamp a goal to the leash, may-leave rules) | on demand |
| `squadRoles.ts` | role assignment and cover scoring for an engaged / searching group | 2 Hz per group |
| `guardAiData.ts` | map data types + `validateGuardAi` (map teams run it in their tests) | load |

`GuardBrain` (`src/ai/guardBrain.ts`, thin, Babylon-free) owns one board, one radio net and the awareness tables per
section and is what `EnemyManager` calls. Babylon-side glue (rays, nav lengths) is passed in as small interfaces
(`LosProbe`, `PathLen`) so tests use fakes.

## 2. Hearing (goal 1)
Loudness stays a reach in metres (every call site already passes one: steps, glass 15, suppressed 9.8, impact 4, door
2 / 10, gadget 16). Convert to dB-ish once: `Ls = 20 log10(reach)`; at the listener `margin = Ls - 20 log10(max(d, 1))
- wallDb - ambientDb`. In a quiet place with no wall `margin >= 0` iff `d < reach` (today's rule, so nothing shifts
until a map adds noisy things). The same thing as an effective reach (no log in the inner loop):
`reachEff = reach * 10^(-(wallDb + ambientDb) / 20)`; `WALL_DB` 6.9 reproduces `MUFFLE` 0.45.

```ts
export const HEARING = {
  wallDb: 6.9,          // one wall between (head-height ray), = MUFFLE 0.45
  turnDb: 0,            // margin >= 0: turn the head (notice, no walk)
  investigateDb: 6,     // margin >= 6 (inside half the effective reach): may be sent to investigate
  combatDb: 12,         // loud gunfire with margin >= 12 (quarter reach): straight to combat; below: incident 'shots'
} as const;
export type HearTier = 0 | 1 | 2 | 3;           // ignore | turn | investigate-eligible | combat (gunfire only)

/** A noisy thing (map data): masks quieter sounds near it. Level in dB above the quiet floor at its centre. */
export interface NoisySource { id: string; x: number; z: number; y?: number; radius: number; db: number;
  /** Section index (Sector Ops) or zone id it belongs to; none = always on. */
  section?: number; label?: string /* 'generator' | 'vent' | 'press' ... for barks / debug */ }
/** Ambient dB at (x, z): max over sources of db * (1 - d / radius)^1 (linear fade to 0 at the rim). */
export function ambientDb(src: readonly NoisySource[], x: number, z: number, y?: number): number;
/** Effective reach after wall and ambient loss (both at the LISTENER: a guard by a generator is deaf-ish). */
export function effectiveReach(reach: number, walls: number, ambient: number): number;
export function hearTier(dist: number, reachEff: number, loud: boolean): HearTier;
```
- 6 dB halves the hearing reach, 12 dB quarters it. Suggested authoring values: vent 6 dB / 4 m, generator 12 dB / 8 m,
  press or compressor 18 dB / 10 m. Ambient also masks the PLAYER's footsteps near the thing (the CT "noisy area" read)
  and the player's light-meter sound bar can later read the same `ambientDb` (parity, not this job).
- `EnemyManager.hear(pos, reach)` becomes: for each live guard in the source's section (or all on a sectionless map):
  ambient at the guard; `reachEff0` without wall; skip if `d >= reachEff0`; one wall ray only when `d >= reachEff0 *
  10^(-wallDb/20)` (today's early-out); tier. Tier 1 -> `Enemy.hearTurn(x, z)` (look `hearLook`, meter bump to
  `noiseSuspicion` floor, NO `heard` flag, so it never walks over). Tier 2 -> `board.report('noise', ...)` with the list
  of tier-2 hearers (written into a reused `Int16Array`), and each turns as tier 1 while the board decides.
- `noise()` (unsuppressed gunfire): the same walk with `loud = true`; tier 3 -> today's `hearGunfire` (combat); tier
  1-2 -> incident `shots` (investigate + caution, no combat). Shots beyond walls in another building stop alerting all.
- `AlertMachine`: `heard` stops forcing `investigating` (review item A). New input `assigned: boolean` (set by the
  board): suspicious -> investigating needs `assigned || meter >= PERCEPTION.investigate`. Hunter / Free Roam (no
  board) keep the old rule behind `EnemyManager.coordinated = false`.
- Cost: one hear event = <= 32 guard distance tests + <= 32 ambient sums (map has <= ~12 sources per section) + only
  the near-threshold rays. No allocation (scratch typed arrays on the manager).

## 3. Incident coordinator (goals 4, 7; review B)
```ts
export type IncidentKind = 'noise' | 'shots' | 'light' | 'bodyDead' | 'bodyKo' | 'camBody' | 'witnessKill'
  | 'contact' | 'missing' | 'distraction';
export interface Incident {
  id: number;                // monotonic per match (seeds combat RNG, dedupe)
  kind: IncidentKind; section: number; x: number; z: number; y: number;
  t: number;                 // seconds open
  key: number;               // dedupe key: light id / circuit, body guardKey, -1 = by place
  investigators: Int16Array; // length 2, guard slot or -1
  cover: number;             // slot holding and facing the spot (escalation), -1
  aware: number;             // u32 mask over guard keys (section roster <= 32)
  downAware: number;         // aware keys now knocked out (rejoin `aware` if revived)
  reported: boolean;         // a radio report about it got through
  silentT: number;           // seconds the investigator has not reported back
  open: boolean;
}
export const INCIDENT = {
  perSection: 16,            // fixed pool, oldest closed first
  mergeR: 6, mergeT: 10,     // same kind (noise/shots/distraction) within 6 m and 10 s: one incident
  lightPairR: 15,            // a second guard within 15 m who perceived the light joins as partner
  ackLook: 3,                // others bark "Copy" and look this long, then carry on
  silentEscalate: 25,        // investigator silent 25 s -> cover guard + buddy pair search (G11)
  lightCheck: 8,             // seconds at the light + a 4-point ring at 2-6 m, then stand down
} as const;
export class IncidentBoard {
  report(kind: IncidentKind, x: number, z: number, y: number, key: number, hearers: Int16Array, n: number,
         now: number): number;          // incident id (new or merged)
  tick(dt: number, guards: GuardView): void;   // 5 Hz: assign, escalate, close
}
/** What the board reads per guard (struct of arrays filled by EnemyManager, no Enemy reference in pure code). */
export interface GuardView {
  n: number; x: Float32Array; z: Float32Array; y: Float32Array;
  level: Uint8Array;         // AlertLevel index
  kind: Uint8Array;          // EnemyKind index (dog, melee: never investigators)
  officer: Uint8Array; post: Int16Array /* post index or -1 */; busy: Uint8Array /* alarm run, takedown, carry */;
  key: Uint8Array;           // guard key (awareness roster)
}
```
Rules:
- One incident per event; dedupe by `key` (same light / body) or by place+time for noises. A merged report adds its
  hearers to `aware` and resets nothing else (no second investigator).
- Investigator choice, from the incident's perceivers first (heard at tier 2, saw the light go, found the body), else
  any calm guard in the section within 25 m: score = path length (A* via `PathLen`, only for the best 3 by straight
  distance) x (officer 1.6: he sends someone) x (cautious 0.8: already on edge); dogs and melee kinds excluded; a
  high-security post guard is excluded unless the spot is inside his leash (then he goes, clamped, section 6).
- Count: noise / shots / distraction 1; light 2 when a second perceiver is within `lightPairR`, else 1 (M1 exact);
  bodyKo 1 (the finder) + the waker's buddy if within voice; bodyDead / witnessKill: finder + up to 1 buddy, and a radio
  report (section 5); camBody 1 (2 if dead). Contact is not a board assignment: it hands over to `squadRoles`.
- Everyone else who perceived it: `ack` (bark "Copy" on radio only if they were radioed, else a glance), look
  `ackLook`, keep their task. This is the "not everyone walks over" fix.
- Investigator flow: bark `checking` -> walk at investigate pace -> look (`investigateLook`) -> for lights: inspect the
  fixture, sweep a 4-point ring 2-6 m round it (`lightCheck`) -> bark `standDown` on radio -> back to route (`rejoin`)
  -> caution none (light / noise) so they "return back to normal" (M1). Torch on in the dark (existing rule).
- Escalation: investigator down or silent `silentEscalate` -> the incident turns `missing`: nearest 2 calm guards go as
  a pair (one leads, one covers 4-6 m back, G11), the section turns cautious (held, aware = section) - CT's "he's not
  answering" beat. This reuses `radioCheckNow` miss logic, which today only runs in squads.
- Close: all investigators back and reported, or the incident becomes `contact` (combat owns it).

## 4. Awareness and caution (goals 2, 3)
Guard identity must survive a revive (`revive()` builds a new `Enemy`), so the roster uses a stable **guard key**: the
squad-slot index within the section (0-31, `MAX_ENEMIES` 32), stamped on `Enemy.key` and `Body.guardKey`, and
inherited by the revived `Enemy`. Reinforcements take free keys 24-31.
```ts
export type Caution = 0 | 1 | 2;     // none | timed (knockout) | held (death / intruder)
export const CAUTION = {
  koSearch: 60,        // the woken guard and the waker search round the spot (s)
  koCautious: 180,     // then cautious this long (M3 "a few minutes"), then normal
  sens: 1.3,           // sight-rate multiplier while cautious (= SENSITIVITY.cooldown)
  waitMul: 0.6,        // shorter patrol pauses, glances every 6 s
} as const;
export class Awareness {           // per section
  caution: Uint8Array; cautionT: Float32Array;   // by key
  held: number;                                   // u32: keys whose caution is held by an open death incident
  addAware(inc: Incident, key: number): void;     // sets bit; for held kinds also sets caution 2
  onDown(key: number, lethal: boolean): void;     // dead: clear bit from every incident; KO: move to downAware
  onRevived(key: number): void;                   // downAware -> aware again (he remembers)
  tick(dt: number): void;                         // timed caution counts down; held clears per rule below
}
```
- Who is aware of a death (`bodyDead`, `witnessKill`, `contact`, `missing`): witnesses (saw the kill: on `onKilled`, each
  calm guard in the section with the victim in the sight field within `BODY.range` and one LOS ray), the finder, guards
  in voice range of the finder's shout, and the section once his radio report gets through (section 5). Killing the
  finder before his report completes keeps the set to the finder + voice hearers.
- Held caution clears **only when every key in `aware` is eliminated**: eliminated = dead, or knocked out and not yet
  revived (in `downAware`). A KO'd aware guard who is woken goes back into `aware`, so the incident reopens its hold. When
  `aware == 0` and the incident has no open work it closes, and keys with no other held incident drop to caution 0 (they
  were all eliminated, so in practice this only matters for reinforcements and later waves). This replaces the per-guard
  `fought` flag as the source of permanent caution (keep `fought` for combat stance only).
- Knockout (`bodyKo`): the finder walks over, bark `koFound`, wakes him (`BODY.reviveTime` 3 s; existing `reviving`).
  Both get caution 1: search `koSearch` round the spot as a pair, then cautious `koCautious`, then 0 and normal patrol
  (`AlertMachine` cooldown -> unaware is allowed again for caution 1). Radio: one line ("Found him out cold, he's okay.
  Checking around."), section `ack` only, nobody else turns cautious (M3).
- A KO'd guard who is found dead later (finished off) or a KO witnessed as a takedown? A witnessed takedown is contact
  if the player is seen, else `witnessKill` (held) - the witness does not know it was non-lethal.
- Dead body: finder bark `body`, search with a buddy, radio `deadReport` (section 5); on completion the section is aware
  and cautious (held). Whether a dead-body report also raises the alarm stage is open (Q1, default no).
- Cautious behaviour (caution >= 1): `SENSITIVITY` x `CAUTION.sens`, torch rule as searching, investigate pace, shorter
  waits, pairs keep 4-6 m on patrol if their routes already run together. Same patrol routes (G143: no new randomness).

## 5. Alert propagation (goal 5, M5)
```ts
export const RADIO = {
  voice: 12,            // voice reach (m) through the hearing model: walls cut it to ~5.4 m
  callIn: 2.5,          // x reaction x officer: caller holds the radio this long (existing ALERT.callIn)
  report: 4,            // x reaction: a command report (alarm, section 7) after a completed contact call
  staggerBase: 0.6, staggerStep: 0.5, staggerDist: 0.02, staggerMax: 4.5,   // per recipient, by distance order
  queue: 64,
} as const;
export class RadioNet {          // one per section; ring buffers, no allocation
  /** Start a call: returns a call id; nothing is sent until it completes. */
  startCall(caller: number, inc: number, kind: CallKind, holdS: number): number;
  /** Caller went down / seized / flashed / grabbed: the call (and its report) is lost. */
  cut(caller: number): void;
  /** 10 Hz: completed calls enqueue recipients at deterministic delays; due entries are delivered. */
  tick(dt: number, guards: GuardView, deliver: (slot: number, inc: number, kind: CallKind) => void): void;
}
export type CallKind = 'contact' | 'body' | 'ko' | 'light' | 'standDown' | 'missing' | 'command';
```
- Order: 1) voice: at the moment of the event the speaker's shout reaches guards whose hearing tier for a `voice`-reach
  noise is >= 2 (same model: walls, ambient); they get it at once (+0.3 s reaction). 2) radio: when `callIn` completes,
  every other live guard in the SAME section is queued, sorted by distance, delay `staggerBase + i * staggerStep + d *
  staggerDist` (cap `staggerMax`) x the receiver's reaction: 8 guards hear over ~4 s, never at once. No `Math.random`
  (the current `callAlert` jitter goes). No relay (kept). Other sections: nothing.
- `deliver` per kind: contact -> `alert()` with the LKP (combat roles join, section 8); body -> aware + held caution +
  1 more checker if the board wants a buddy; ko -> ack; light / standDown -> ack bark only.
- "Gets through": a call is a timer on the caller; `cut()` from `Enemy.die / knockOut / beginTakedown / blind`. Today's
  spotter rule ("take the spotter out first, nobody hears") becomes the general rule for every report.
- `callAlert` / `shout` in `AiContext` are rewired to the net; `EnemyManager.RADIO` 22 m stops being a range (section
  membership replaces it) on maps with sections; sectionless maps treat the whole map as one section.

## 6. Posts and high security (goal 7)
```ts
export interface PostDef {     // on SquadSlot (section 9)
  leash: number;               // metres: never leaves this circle round (x, z) (default 0 = no post rule)
  highSecurity?: boolean;      // protects a high-value item / security door: never assigned out of the leash,
                               // never runs the alarm panel outside it, never joins a search outside it
  guards?: string;             // what it guards, for barks/debug ('vault door', 'server cage')
}
export function clampToLeash(px: number, pz: number, post: PostDef, cx: number, cz: number, out: P2): P2;
export function mayLeave(post: PostDef | null, kind: IncidentKind): boolean;  // high security: always false
```
- Distraction still works (M1): a high-security guard hears and turns (tier 1), may walk to the clamped point inside
  his leash to look (tier 2), then returns to the post facing; a noisemaker at the leash edge pulls him to the edge,
  never past it. In combat he fights from inside the leash (as `Enemy.hold` does for a room; a circle variant), and
  radios rather than chases. A normal post (no flag) can be assigned out like any guard.

## 7. Alarm and reinforcements (goal 6, M4)
- Alarm sources: (a) a panel worked (existing `assignAlarm` / `raiseAlarm`), (b) a `command` call that completes:
  after a contact call gets through, the caller (or the section's officer if alive and in voice range) holds a second
  call `RADIO.report` 4 s x reaction ("Command, contact, send backup.") -> `raiseAlarm`. Kill or KO the caller during
  either call -> no alarm from that call; the next guard in combat who has LOS-free cover becomes the caller after 3 s
  (one caller at a time per section). Panels and command calls both go through `EnemyManager.raiseAlarm` (one per
  section load stays).
- Camera / laser alarms stay as Sector Ops has them (they are panels by another name).
- Reinforcements spawn at `ReinforceEntry` points with an entry route into the section, alerted, profile `aggressive`:
```ts
export interface BehaviourProfile {
  id: 'standard' | 'aggressive' | 'post';
  advanceHold: number;    // seconds held between bounds (standard 2.5, aggressive 0.8)
  coverFirst: number;     // chance-free weight of going to cover on contact (standard 0.85, aggressive 0.3)
  runToContact: boolean;  // aggressive: runs bounds, last stretch at a jog not ADVANCE_PACE
  flankWeight: number;    // role weight for flanker (aggressive 2)
  suppress: boolean;      // suppressive fire while a squadmate moves
  knowsLkp: boolean;      // starts with the shared LKP (all reinforcements)
  neverCautious: boolean; // goes straight to search/combat, never calms
}
```
  (`coverFirst` is a weight, not a dice roll: with seeded RNG, section 8.)

## 8. Tactics (goal 8; review G)
Roles per engaged or searching group (the guards in combat or searching for one `contact` incident), assigned by
`squadRoles.assign` at 2 Hz on the host, applied by `Enemy.decide` through `role`:
```ts
export type Role = 'none' | 'point' | 'overwatch' | 'flank' | 'reporter' | 'search';
export interface RoleInput {     // filled into reused arrays
  n: number; slot: Int16Array; x: Float32Array; z: Float32Array; seesTarget: Uint8Array; inCover: Uint8Array;
  profile: Uint8Array; lkpX: number; lkpZ: number; targetCoverT: number; callerSlot: number;
}
export function assignRoles(i: RoleInput, out: Uint8Array /* Role index per member */): void;
export function scoreCover(cx: number, cz: number, nx: number, nz: number, low: boolean, gx: number, gz: number,
  lkpX: number, lkpZ: number, role: Role): number;   // -Infinity = unusable
```
- `reporter`: the caller (section 5): goes to the nearest cover facing away from the LKP, stays down while calling;
  this is "hide and report". `point`: the nearest guard with a cover path; bounds cover-to-cover toward the LKP (existing
  `pickAdvance`), one point moving at a time. `overwatch`: 1 per group, cover 8-15 m from the LKP with a clear view
  (one LOS ray per candidate, max 4 candidates), suppresses while point moves. `flank`: 1 per group of 3+ (the existing
  single flanker, generalised): cover whose bearing to the LKP is >= 60 deg off the point's. `search`: everyone else,
  ring sweep (existing `searchSlot`). Aggressive profiles fill point and flank first.
- Peek-and-report: a guard in cover who sees the target beyond 12 m and is not point fires or peeks 1-2 s, updates the
  LKP (`reportSighting`), ducks; it does not leave cover. No rushing: runs only between covers and on aggressive
  profiles; a group never has more than 1 point and 1 flanker moving at once.
- Cover data: `CoverPoint` (`pos`, `normal`, `low`, `seg`, `s`) from `World.level.cover` and `coverSegments`; ownership
  via the existing `reserveCover`. Add a load-time bucket grid (`CoverGrid`, 4 m cells, `Int32Array` heads / next) so a
  search touches ~10-30 points, not all. Score: protects (normal . dirToLkp >= 0.3), distance from me (shorter better),
  role band to the LKP (point 4-10 m, overwatch 8-15, reporter 10-20 away), not reserved, same storey.
- Determinism: G143 / bible 5.7 forbid randomness in patrols only. Combat may vary, but use `mulberry(matchSeed ^
  incidentId * 2654435761 ^ guardKey)` per guard per incident in place of `Math.random` (replayable tests, co-op host
  only). Patrols, posts, investigations and radio delays use no randomness at all.
- Budget (24 guards per section, 5 sections, 32 awake max): board 5 Hz + awareness 5 Hz + radio 10 Hz + roles 2 Hz per
  group, only for sections that have guards awake. Each tick is O(guards in section) with a few A* calls (best 3 only,
  when an incident opens) and <= 4 LOS rays per role pick, picks at most every 1.5 s per guard. Perception stays at
  ~4 Hz per guard. Estimate < 0.15 ms per tick at 24 guards. Zero allocation: SoA typed arrays sized 32, incident pool,
  ring queue, scratch `P2`s on the module.

## 9. Cameras see bodies (goal 9, M6, G240)
- `SecuritySystem` adds a body pass at 2 Hz per online camera: for each `Body` in the camera's section (present, not
  carried, not hidden, not already `camSeen`), `inFrame` + `camRange` + one `hitDistance` ray to the body's hips; IR,
  so no light term (G240). Emits `SecurityEvent { kind: 'body'; camera; bodyKey; lethal; x; z }`.
- `EnemyManager` turns it into a `camBody` incident: radio line from the camera ("Camera 3 has a man down, east bay."),
  the board sends the nearest 1 (KO) or 2 (dead) calm guards within 25 m by path in that section; KO -> wake (section
  4), dead -> finder rules (aware + report). No guard nearby -> the section turns cautious (held, aware = section).
  Looped / off / destroyed cameras see nothing.

## 10. Paces and barks (review D, story rule G82)
| Pace (x walkSpeed) | Now | New | Note |
| --- | --- | --- | --- |
| patrol | 1.1 | 1.1 | unchanged: `CHECK_PATROL_PACE` 1.1 and Sector isolation tests hold |
| cautious patrol | - | 0.95 | |
| investigate | 1.2 | 0.85 | stop 1 s at doorways (`findDoorways`) |
| search | 1.3 | 0.75 | stop 1-2 s every 4-6 m (fixed pattern, not random) |
| combat walk / advance | 1.0 / 1.15 | same | run only between covers, to an alarm panel, or aggressive |
Calm turn rate (60 deg/s) also for searching. New `BarkEvent`s (text, radio chirp where marked R, each <= 90 chars,
written to be voiced later; an optional `{room}` filled from `RoomRect.name`, else dropped):
`ack` R "Copy." / "Copy, holding." ; `checking` R "Checking it out, {room}." ; `lightOut` "Light's gone. Taking a
look." ; `standDown` R "Nothing here. Back to it." ; `koFound` "Hey. Hey! Wake up." ; `koReport` R "Found him out cold.
He's okay, checking around." ; `deadReport` R "Man down, {room}. Stay sharp." ; `camBody` R "Camera has a man down,
{room}." ; `holdPost` "Not leaving this door." ; `command` R "Command, contact. Send backup." ; `reinforce` R "Response
team moving in." ; `cover` "Covering!" ; `flank` "Going round." ; `reporter` R "Contact, he's at {room}." ; `missing` R
"He's not answering. Two of us, go." `BarkVoice` cooldowns stay; `ack` from more than 2 guards per incident is dropped.

## 11. Map data (two map teams: Course Ready / sector-redesign, Menu Notes / marlow-final)
Extend, never replace: every field optional, defaults reproduce today.
```ts
// src/world/rooms.ts - SquadSlot gains
  post?: PostDef;               // section 6; a slot with no route and no post = post with leash 0 (stands, as today)
  squad?: string;               // squad id in its section: radio checks, pairs, role groups ('s1-dock')
  profile?: 'standard' | 'aggressive';  // reinforcement-like guards placed by hand
  key?: number;                 // guard key override (else the slot index in its section)

// src/ai/guardAiData.ts
export interface GuardZone { id: string; section: number; rects: RoomRect[] }   // section areas on non-Sector maps
export interface ReinforceEntry { section: number; at: [number, number]; y?: number;
  route?: [number, number][];   // walked (run) into the section; none = straight to the LKP by nav
  yaw?: number }
export interface GuardAiLayout {
  zones?: GuardZone[];          // non-Sector maps; none = one section (0) for the whole map
  noisy?: NoisySource[];        // section 2
  entries?: ReinforceEntry[];   // section 7; none = today's MapLayout.reinforce / SectorDef.reinforce points
  squads?: { id: string; section: number; officer?: string /* slot id */ }[];
}
// src/world/mapDef.ts - MapLayout gains   guardAi?: GuardAiLayout;
// src/game/sectors.ts  - SectorDef gains  noisy?: NoisySource[]; entries?: ReinforceEntry[];  (section = its index)
export function validateGuardAi(l: GuardAiLayout, slots: readonly SquadSlot[]): string[];  // leash >= 0.5 when set,
// highSecurity needs a post, keys unique and < 32 per section, entries inside bounds, noisy db 0..30, radius 1..20
```
Alarm panels need nothing new (`MapLayout.alarms` / `section` already exist). Sector `guards` (`SectorGuard extends
SquadSlot`) inherit `post`, `squad`, `profile` for free. Marlow Yard: the station-1 training guard becomes `post: {
leash: 0 }` (passive stays passive). The shapes go to both teams by message before slice S5 lands.

## 12. Co-op wire (review H)
The brain is host-only (as today); clients already get `al` (level 0-3, seized, torch, protocol 25) in `EnemyState`.
Needed on the client: barks (radio text is the story channel, G82; today the client sees none) and a caution read for
the puppet's low-ready stance. Proposal, **protocol 32** (marlow-final holds 30, sector-redesign 31; rebase onto
whichever merges last):
- `NetEvent { e: 'bark'; id: string; b: number /* BarkEvent index */; n: number /* line index */; r: 0 | 1;
  room?: string }` - sent when the host shows a bark (rate-limited by `BarkVoice` already, <= ~2/s).
- `AL_CAUTION = 16` bit in `EnemyState.al` (`packAlert(level, seized, torch, cautious)`).
- Nothing else: incidents, roles, radio queues, aware sets stay on the host. Torch already rides `al`. Bump
  `PROTOCOL_VERSION` and the tests that assert it (`tests/protocol*.test.ts`, e2e-coop handshake).
If no time for S9, everything else is host-only and protocol-free.

## 13. Slices (each: unit tests + named e2e; ordered by what Michael sees first)
| # | Slice | Unit tests | e2e | Hours | Risk to existing tests |
| --- | --- | --- | --- | --- | --- |
| S1 | Hearing: `hearing.ts`, tiers, wall dB, `NoisySource` + `ambientDb`, `hearTurn`; `heard` no longer forces investigate; gunfire tiers | hearing.test (reach parity with MUFFLE, masking halves reach, tiers) | e2e-stealth-ai (noise, impact, door creak scenarios), e2e-stealth | 4-6 | medium: stealth-ai "noise -> investigating" must now come from an assignment (S1 ships a stub board: nearest tier-2 hearer is assigned) |
| S2 | Incident board: one investigator (2 for a light if 2 near), acks, dedupe, LOS for `lightsOut`, light check + stand down, barks `ack/checking/lightOut/standDown`, paces investigate 0.85 / search 0.75 | incidents.test (1 of 5 goes, light pair rule, merge, officer sends, dog never) | e2e-stealth-ai (lights, noise; new "one investigator" scenario), e2e-ct-warehouse | 8-10 | medium-high: stealth-ai lights / bodies timings; warehouse guard routes |
| S3 | Radio net: voice then staggered section radio, deterministic delays, call cut on down, sections | radioNet.test (order, stagger <= 4.5 s, cut, other section untouched) | e2e-stealth-ai (radio, radio window), e2e-sectorops | 5-7 | medium: radio scenario asserts `pending > 1.5` (kept) and the 22 m out-of-range guard (becomes section-based: test map is one section, so assert by a second zone) |
| S4 | Awareness + caution: guard keys survive revive, aware masks, held death caution, timed KO caution (wake, search 60 s, cautious 180 s), witnessed kill, body radio report | awareness.test (clear only when all aware down, KO revive rejoins, timed expiry) | e2e-stealth-ai (bodies), e2e-takedown (KO wake), e2e-sectorops | 8-10 | medium: `fought` semantics, bodies scenario expects all within 22 m to search |
| S5 | Posts + map data: `PostDef`, leash clamp, high security, `GuardAiLayout`, `validateGuardAi`, Sector passes `post/squad`, Marlow guard post | posts.test, guardAiData.test, sectors.test additions | e2e-ctcourse (guard never moves), e2e-sectorops, e2e-ct-warehouse | 4-6 | low-medium: sectors.test isolation unchanged (patrol pace kept) |
| S6 | Alarm by command call + aggressive reinforcements: report timer, caller cut, `BehaviourProfile`, `ReinforceEntry` routes | alarm.test additions (command call raises, cut stops), profile table test | e2e-stealth-ai (alarm), e2e-sectorops (stages, perStage) | 6-8 | medium: sectorops alarm stage counts |
| S7 | Cameras see bodies: body pass, `SecurityEvent body`, `camBody` incident | securitySystem body test (IR, frame, looped camera blind) | e2e-ct-warehouse or e2e-sectorops (camera scenario) | 3-5 | low |
| S8 | Squad roles + cover scoring + peek-and-report + seeded combat RNG (`CoverGrid`) | squadRoles.test (one point moving, overwatch band, flank bearing >= 60 deg, determinism) | e2e-stealth-ai (combat), e2e-ct-warehouse; wall flank / grenade checks in e2e-wall if touched | 12-16 | high: combat timings, existing flanker + grenade asserts |
| S9 | Co-op: protocol 32, `bark` event, `AL_CAUTION`, client bark view + low ready | protocol.test (version, packAlert) | e2e-coop, e2e-netmove | 3-5 | medium: protocol number collides with 30 / 31 in flight |
Total ~53-73 h. S1-S3 are the "not everyone hears, one goes, alerts spread over seconds" fixes Michael asked for first.
All suites run `E2E_GPU=1` by Character Build on the laptop (BRIEF).

## 14. Open questions (assumed defaults; log as A-entries in BRIEF.md)
- Q1: does a completed dead-body radio report raise an alarm stage (CT counts found bodies as alarms)? Default **no**:
  held caution only; alarm only by panel or command call (M4 read literally). Undo: `ALARM_ON_BODY_REPORT = true`.
- Q2: "eliminated" includes knocked out (until woken). Default **yes**, per M1 "eliminate any that are aware" with
  revive putting him back.
- Q3: KO caution length 60 s search + 180 s cautious ("a few minutes", M3). Tune at playtest.
- Q4: reinforcement kinds stay Sector Ops' grunt / heavy (G155 note on sector-redesign); profile aggressive for all.
