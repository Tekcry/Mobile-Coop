# piano-knife S3: co-op knife kills (the client's kill through the host, the remote pair, the double)
Owner: Night Shift | Player Build. Status: current. Builder: Opus (`src/net`). Checkers: two independent Opus (`src/net`
and one line in `src/ai/enemy.ts`, RULES "The loop"). Branch `feature/piano-knife-s3` in
`C:/NightShift/Mobile-Coop-piano-knife-s3`, cut from origin/master once #614 (S1), #620 (S2) and #599 (coop-kit K0) are
all on master; PR base `master`. Est. ~1000 lines with tests.

Read first: `BRIEF.md` (A1, A2, A4, A5, A6, A10, A14, A16; "Michael said" and Q39 / G400), `PLAN.md` 2.1, 2.6, section
3 and S3 in section 4, `S1-BRIEF.md`, `S2-BRIEF.md`. Prototype mode: every number below is a starting value; no tuning,
one closest test set. Every design choice is made here; if the code does not match, stop and report to the lead, do not
improvise. Anchors are quoted text from the branch heads this brief was written on (S1+S2 = feature/piano-knife-s2
89f99b2b3, K0 = feature/coop-kit-k0 9cc70de2c); line numbers move after the merges: find the quoted text.

## Goal
Michael ~19:20: "I would like to make this coop also, make it very tense and quiet, with them brutally taking down guards
in the shadows." ~19:45: "Killing a guard should be a physical alteration between them both, 2 character animation if
possible." ~20:05: "Palm strike knockout disabled, only knife kills, and no slashing, only animations with the guard".
Q39 / G400: "yes players must look exact in everyones games".

With the knife switch on (Campaign's piano scene, map `thornbeckMill`), S3 makes the paired knife kill work in co-op:
- A client's knife kill runs through the host: the host seizes the guard only for a `td` start with kind `knife` and
  only while its own switch is on, kills him at the client's `done` (never a knockout), 1.2 m of noise.
- Every screen draws the same two bodies: the attacker's remote rig plays the same clip, knife in hand, his hands on
  the guard; the guard on that screen is attached to the drawn attacker with his clip, buckle and hands (PLAN 2.6).
- The host refuses, while its switch is on, a client's RT close strike and any non-knife takedown (PLAN-CHECK-3 items 3
  and 4), so no client can knock a guard out in the scene.
- The double (G5 + G6, A4): two ordinary knife kills inside `DUAL_WINDOW` raise the dual takedown as today, and the two
  bodies end clear of each other.
- The S1 / S2 checkers' polish that lands here: the knife tail seen by the remaining `takedown.active` gates, the
  client's fallback kill quiet on the host, the side kill's 180 degree spin.
With the switch off on both pages, every takedown, strike and wire message is exactly today's.

## Out of scope (do not build)
No `knifeKill.ts` edit (S2's table; S3 reads it). No IK, solver or contact work on `knifePair.ts` beyond the one helper
below, no `KNOWN_MISS` change (A16). No new message, no new `cdeny` reason, no `cmove` lethal bit (PLAN-CHECK-3 item 3),
no `PROTOCOL_VERSION` bump (the train does it). No `flags.ts`, `pianoScene.ts`, map, intro or EMP edit; the revive cap,
the client's intro end and the two-page `e2e-piano` are Campaign S4's (PLAN 3 overlap 2). No intro pose (S4b). No change
to the `gameState` frame order. No guard AI change beyond the one `releaseTakedown` line.

## Setup (once)
1. Start check (Git Bash): `git -C C:/NightShift/Mobile-Coop fetch origin master && git -C C:/NightShift/Mobile-Coop cat-file -e origin/master:src/game/knifePair.ts && git -C C:/NightShift/Mobile-Coop show origin/master:src/game/knifeKill.ts | grep -q attackerFrom && git -C C:/NightShift/Mobile-Coop cat-file -e origin/master:src/net/kitNet.ts`.
   Exit non-zero: stop and tell the lead (#614 / #620 / #599 not all on master yet).
2. `git -C C:/NightShift/Mobile-Coop worktree add -b feature/piano-knife-s3 C:/NightShift/Mobile-Coop-piano-knife-s3 origin/master`,
   then `npm ci` in it (600 s timeout).
3. Guard before every write:
   `cd /c/NightShift/Mobile-Coop-piano-knife-s3 && test "$(git rev-parse --abbrev-ref HEAD)" = feature/piano-knife-s3 && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-piano-knife-s3"`
4. Commit and push each numbered file group below on its own (`git add <its files>`, never `-A` or `.`;
   `git push origin feature/piano-knife-s3`).

## Wire (no new message, no new field, no version bump)
| What | Writer | Reader |
|---|---|---|
| `td.kind` value `'knife'` on `start`, `done` and `abort` (the field and its parse exist: `id(raw.kind)`) | a client page whose switch is on (`coopClient` `tdOut`) | the host (`onTakedown`) |
| MoveState `takedown` `sub` bit 2 `TAKEDOWN_SUB_KNIFE`: a knife kill under way, the knife shown | every page for its own player (`localMoveState`) | `RemoteAvatar` (attacker), the client's knife-puppet loop, the host's frame and seized step (victim) |
| MoveState `takedown` `sub` bits 4-16: the row, `(sub >> 2) & 7` (0-3 = `KNIFE_KILLS` index, 7 = `KNIFE_ROW_NONE`: the switch-on move without a row, today's move with the knife shown) | as above | as above |
| MoveState `takedown` `ph` with the knife bit and a row: `kt / knifeSpan(row)` (0..1 over the move plus the tail: `seconds + KNIFE.blendOut`); with row 7: the blow phase as today | as above | as above |
| MoveState `takedown` `s` with the knife bit and a row: the approach progress 0..1 (`a.t / plan.approach`, 1 with no approach, 1 in the tail); 0 otherwise (today's value) | as above | as above |
| `cdeny` reason `'busy'` (existing) for a strike while the host's switch is on | the host | the client's `StrikeController.denied` (as today) |
An older peer reads a knife `takedown` as today's lethal approach (no `TAKEDOWN_SUB_BLOW`: no arc) and `kind: 'knife'` as
an ordinary lethal takedown; the train's bump covers it. The PR body names the wire change for the train.

## Files and exact behaviour

### 1. `src/player/moveState.ts` (beside `export const TAKEDOWN_SUB_BLOW = 1;`)
- `/** (piano-knife S3) takedown sub bit: a knife kill (the knife in hand); bits 4-16 its row (KNIFE_KILLS index, 7 =
  KNIFE_ROW_NONE: the switch-on move without a row); ph the move's phase over knifeSpan, s the approach's progress. */`
  `export const TAKEDOWN_SUB_KNIFE = 2;` `export const KNIFE_ROW_NONE = 7;`
- `export function knifeSub(row: number): number` = `TAKEDOWN_SUB_KNIFE | ((row >= 0 && row < KNIFE_ROW_NONE ? row : KNIFE_ROW_NONE) << 2)`.
- `export function knifeRowOfSub(sub: number): number` = -1 when `(sub & TAKEDOWN_SUB_KNIFE) === 0`, else `(sub >> 2) & 7`.
- `poseFromMoveState` `case 'takedown'` is unchanged (the knife bit adds no arc; row 7 carries `TAKEDOWN_SUB_BLOW` as today).

### 2. `src/game/knifePair.ts` (one helper, nothing else)
`export function knifeSpan(row: KnifeKillRow): number { return row.seconds + KNIFE.blendOut; }` (the wire's `ph` span:
the move and its tail, `knifeTail` ends at `seconds + blendOut`).

### 3. `src/game/takedownController.ts`
- Getters / fields for the wire (no allocation): `get knifeOn(): boolean { return this.kOn; }`; `knifeTid = ''` (set
  to `e.id` in `knifeStart`, cleared in `knifeEnd`); `get knifeApproach(): number` = with `active`:
  `plan.approach > 0 ? Math.min(1, active.t / plan.approach) : 1`, else 1.
- Side spin (S1 CHECK-A polish 2 / CHECK-B 4). In `knifeStart`, replace
  `this.kFromYaw = plan.kind === 'front' ? plan.faceYaw + Math.PI : plan.faceYaw;` with `this.kFromYaw = e.yaw;` (the
  grab eases from his real facing: no snap at the press on any row). And for `plan.kind === 'side'` the row is picked
  here by his facing, not `pickKnifeKill`'s fixed front row: `Math.abs(wrapPi(e.yaw - plan.faceYaw)) < Math.PI / 2`
  (his back more towards her) -> `crouched ? 1 : 0`, else 3. Every other kind keeps `pickKnifeKill`. His turn over the
  grab is then at most 90 degrees (was 180).
- Nothing else in the controller changes; the client now runs knife rows on puppets because `EnemyPuppet` gets
  `knifeVictim` (file 7).

### 4. `src/game/localMoveState.ts`
Right before `const td = g.takedown.active;` add the knife branch (it must also cover the tail, when `active` is null):
```
const tk = g.takedown;
if (tk.knifeOn) {
  out.m = 'takedown';
  out.tid = tk.knifeTid;
  if (tk.kr >= 0) {
    const R = KNIFE_KILLS[tk.kr]!;
    out.sub = knifeSub(tk.kr);
    out.ph = Math.max(0, Math.min(1, tk.kt / knifeSpan(R)));
    out.s = tk.knifeApproach;
  } else {
    out.sub = knifeSub(-1) | (tk.blowPh >= 0 ? TAKEDOWN_SUB_BLOW : 0);
    out.ph = Math.max(0, Math.min(1, tk.blowPh));
  }
  delete out.c;
  return out;
}
```
`tk.knifeOn` undefined on a fake game (`tests/poseParity.test.ts`) is falsy: those tests stay as they are. Switch off:
`kOn` is never set, so the MoveState is today's.

### 5. `src/net/remoteKnife.ts` (new; Babylon only through the rigs it is given, no allocation per call)
One per `RemoteAvatar`: a remote player's knife kill posed from its MoveState, the game's own code (`killDrive`,
`knifePair`, `knifeKill` helpers) on the wire's clock.
```
export interface KnifeVictimSide { knifeVictim(clip: KeyedClip | null, ph: number, buckle: number): void }
export class RemoteKnife {
  row = -1;          // -1 none; KNIFE_ROW_NONE: knife shown, today's move; 0-3 a row (clips ready)
  tid = '';
  kt = 0;            // s into the move (ph x knifeSpan)
  ap = 0;            // the approach's progress (s)
  rootOn = false;    // `root` holds this frame's victim root (the host's seized step reads it)
  readonly root: RootOut = { x: 0, y: 0, z: 0, yaw: 0 };
  read(mv: MoveState | null): boolean;
  attacker(ar: CharacterRig, vr: CharacterRig | null, knife: KnifeTip | null): void;
  get posesVictim(): boolean;
  victim(ar: CharacterRig, vr: CharacterRig, v: KnifeVictimSide): void;
  off(ar: CharacterRig): void;
}
```
Private: `drive = newKillDrive()`, `track = newPairTrack()`, `fromX`, `fromZ`, `fromYaw`, `fromSet`.
- `read(mv)`: `r = mv && mv.m === 'takedown' ? knifeRowOfSub(mv.sub) : -1`. -1: `row = -1`, return false. A row 0-3
  with `!knifeClipsReady()`: `void loadKnifeClips()` (idempotent, lazy chunk) and `row = KNIFE_ROW_NONE` until ready;
  a row past `KNIFE_KILLS.length` is `KNIFE_ROW_NONE`. A new move (`mv.tid !== tid`, or `row` changed, or `kt`
  decreased by more than 0.05 s): `resetPairTrack(track)`, `fromSet = false`, `rootOn = false`. Then `tid = mv.tid`;
  with a row `kt = mv.ph * knifeSpan(R)`, `ap = mv.s`. Returns true.
- `attacker(ar, vr, knife)` (render frame, before `ar` animates). With a row (`R = KNIFE_KILLS[row]`,
  `contactT = R.contact * R.seconds`, `limpT = R.limp * R.seconds`):
  - drive: `clip = knifeClip(row, false)`, `phase = attackerPhase(R, kt / R.seconds)`, `w = kt <= 0 ? 0 : kt < R.seconds ?
    Math.min(1, kt / KNIFE.blendIn) : Math.max(0, 1 - (kt - R.seconds) / KNIFE.blendOut)` (the local `runKnife` /
    `knifeTail` values); `ar.graph.kill = drive`.
  - hands: `wGrip = kt >= limpT ? 1 - ease((kt - limpT) / KNIFE.release) : handsAt(ap, 1)` (the local `knifeFrame`:
    `handsAt` and `grabAt` read only `t / approach`, so `(ap, 1)` gives the owner's numbers). `vr` null or `wGrip <= 0`:
    `pairHandsOff(ar, null)`; else `attackerHands(R, kt / R.seconds, kt - contactT, ar, vr, knife, wGrip, track)`.
  - Row `KNIFE_ROW_NONE`: no drive (`ar.graph.kill` cleared if it is ours), hands off; the knife is shown by the avatar.
- `posesVictim`: `row >= 0 && row < KNIFE_ROW_NONE && grabAt(ap, 1) > 0` (the local victim is untouched before the
  grab, as `runKnife`).
- `victim(ar, vr, v)` (render frame, after `ar` animated): first call of a move: `fromX/fromZ = vr.root.position.x/z`,
  `fromYaw = vr.root.rotation.y`, `fromSet = true`. Then `victimRoot(R, ar.root.position.x, .y, .z,
  ar.root.rotation.y, grabAt(ap, 1), fromX, fromZ, fromYaw, root)`; `vr.root.position.set(root.x, root.y, root.z)`,
  `vr.root.rotation.y = root.yaw`, `rootOn = true`; `v.knifeVictim(knifeClip(row, true), victimPhase(R, kt / R.seconds),
  buckleAt(kt - contactT) * bucklePitchOf(R))` (with `ap < 1`: `victimPhase(R, 0)` and buckle 0, as `runKnife`);
  `victimHands(R, kt - contactT, ar, vr, track)`. After `limp` it carries on the same way (his clip clamped at
  `victimTo`, his hands going out by `victimHandsW`) until the owner stops calling it: the guard dies on that screen
  when the host's death arrives (Doubt 2).
- `off(ar)`: if `ar.graph.kill === drive` clear it, `drive.clip = null`, `pairHandsOff(ar, null)`, `row = -1`,
  `tid = ''`, `rootOn = false`, `fromSet = false`.
- If `buckleAt` / `victimPhase` box their numbers here (the S1 finding in `runKnife`), inline them as `runKnife` does;
  the allocation test decides.

### 6. `src/net/remoteAvatar.ts`
- Fields: `readonly knife = new RemoteKnife();` `private knifeModel: KnifeModel | null = null;` and
  `victimRigOf: ((tid: string) => CharacterRig | null) | null = null;` (set once by the owner: file 8 / 9).
- In `update`, right before `// (anim-n4b, track A) a team move: the holder's working body`:
  `const kOn = !!mv && !rp && !this.dead && this.knife.read(mv);`. On: the knife model built on first use
  (`new KnifeModel(this.world.scene, this.rig, WREN_HANDS.R, (m) => this.world.addShadowCaster(m))`, as
  `studioStage.ts` builds the Studio's) and `show(true)` when not shown; `this.knife.attacker(this.rig,
  this.victimRigOf?.(this.knife.tid) ?? null, this.knifeModel)`. Off after on: `this.knife.off(this.rig)`,
  `this.knifeModel?.show(false)`. `show` sets `rig.holdingKnife`, so the gun hand hold steps aside as for the owner;
  the weapon is already holstered from the owner's `dw`.
- `dispose()`: `this.knifeModel?.dispose()` before `this.rig.dispose()`.
- Order: the grab hands block and the carry hands block run before this point and leave the hands alone while a knife
  kill runs (neither is active in a knife `takedown`).

### 7. `src/net/enemyPuppet.ts` (the client's guard: both its own kill on him and the partner's)
- `knifeVictim(clip: KeyedClip | null, ph: number, buckle: number): void`, as `Enemy.knifeVictim` (`src/ai/enemy.ts`
  "(piano-knife S1) His side of a paired knife kill"): a `KillDriveState` allocated on first use (`clip`, `phase = ph`,
  `w = 1`, `buckle = 1`, `bucklePitch = buckle`) on `rig.graph.kill`; `knifePinned = true`; the struggle emote off when
  it is `cqEmote`; his gun hidden. Null `clip` (or no rig): drive off if ours, `knifePinned = false`, both reach
  weights 0, the gun shown again unless `taken` or `remoteHold`.
- `update`: while `knifePinned`, leave the drawn root (skip `r.position.copyFrom(this.pos); r.rotation.y = this.yaw;`:
  the takedown's `frameLate` or the remote pair placed it); `rp.speed = 0`, `rp.localX = 0`, `rp.localZ = 1` (feet
  planted, as the kill drive); `rp.aim` 0 (add `|| this.knifePinned` to `rp.aim = this.def.melee || this.taken ||
  this.remoteHold ? 0 : this.aim;`); the gun carry not applied (`if (!this.taken && !this.remoteHold && !this.knifePinned)
  gc.apply(cs);`); the emote step's held flag also true while pinned. Hit boxes keep syncing from `pos` (the host's).
- Cleared (`knifeVictim(null, 0, 0)` when pinned or the drive is ours): at the top of `die()` (before the rig is handed
  to the ragdoll: it keeps the last drawn pose), in `deny()`, `releaseTakedown()` and `dispose()`.

### 8. `src/net/coopClient.ts`
- `export function tdOut(target: string, ph: 'start' | 'done' | 'abort', lethal: boolean, knife: boolean, courseKind:
  string): Extract<Msg, { t: 'td' }>`: `kind` = `knife ? 'knife' : ph === 'done' ? courseKind : ''`; the message has
  `kind` only when it is non-empty. `np.onTakedown = (ph, lethal) => this.s.toHost(tdOut(np.id, ph, lethal,
  g.takedown.knife, this.tdKind));` (same closure count as today). With the switch off the messages are byte-for-byte
  today's (`tdKind` stays course-only).
- `private readonly knifeRigOf = (tid: string): CharacterRig | null => { const p = this.puppets.get(tid); return p && p.alive
  && !p.taken ? p.bodyRig : null; };` and `a.victimRigOf = this.knifeRigOf;` right after
  `a = new RemoteAvatar(g.world, g.vfx, g.ballistics, info);`.
- `frameUpdate`: right after the held-puppet loop (`if (this.heldPuppet && this.heldPuppet !== held) this.heldPuppet.remoteHeld(-1, 0);`
  / `this.heldPuppet = held;`) and before the puppets update:
  ```
  let kp: EnemyPuppet | null = null;
  for (const a of this.avatars.values()) {
    if (!a.knife.posesVictim) continue;
    const p = this.puppets.get(a.knife.tid);
    if (!p || !p.alive || p.taken) continue;
    a.knife.victim(a.rig, p.bodyRig, p);
    kp = p;
    break;
  }
  if (this.knifePuppet && this.knifePuppet !== kp && this.knifePuppet.alive && !this.knifePuppet.taken) this.knifePuppet.knifeVictim(null, 0, 0);
  this.knifePuppet = kp;
  ```
  (one partner: `break`, as the held-puppet loop; `private knifePuppet: EnemyPuppet | null = null;`, nulled where
  `heldPuppet` is reset on leave.)

### 9. `src/net/coopHost.ts`
- Imports: `KNIFE` from `../game/knifeKill`, `knifeRowOfSub` from `../player/moveState`.
- `onTakedown` (`private onTakedown(r: RemotePlayer, m: Extract<Msg, { t: 'td' }>): void {`), before `if (m.kind === 'assist') {`:
  `const kOn = this.g.takedown.knife;` and on `m.ph === 'start'`: `if (m.kind === 'knife' ? !kOn : kOn && m.kind !== 'bluff')
  { deny(); return; }` (a knife start with the host's switch off, or any other takedown start with it on, assist
  included: PLAN-CHECK-3 item 4. A bluff is speech, never a seize: unchanged).
- In the seize (`e.beginTakedown(!m.lethal, contactDelay(...))`): with `kOn`, `beginTakedown(false, ...)` (the lethal
  struggle).
- At `done`: `const lethal = m.lethal || kOn;` replaces `m.lethal` in `if (m.lethal) e.applyDamage(hit); else e.knockOut(hit);`
  (no knockout while the switch is on); the noise line becomes
  `this.g.enemyMgr?.hear(r.feet, kOn ? KNIFE.noise : m.lethal ? 3 : 1.2, 'noise', null, r.ref.id);` (A5, and the S1
  CHECK-B polish 3 for the client: every piano kill quiet). `takedownDone` and `onRemoteTakedown` unchanged.
- At `abort` and in `release(eid)`: nothing new (file 10 clears the pin in `releaseTakedown`).
- RT strike (PLAN-CHECK-3 item 3): in `onCommitted`, before `const why = checkCommitted({`: `if (kind === 'strike' &&
  this.g.takedown.knife) { this.commitLast.set(by, now); this.s.send({ t: 'cdeny', a: by, id, kind, reason: 'busy' });
  if (self) this.g.strike.denied(id, 'busy'); return; }` (any requester; the host's own RT is already gated off in
  `gameState`). No `strikes` entry, so `runStrikes` never knocks anyone out.
- The partner throw's knockout (A10, "only knife kills"): `throwKnockOut` returns at once while `this.g.takedown.knife`
  (Changed from PLAN item 6).
- Remote pair, victim side: `private readonly knifeRigOf = (tid: string): CharacterRig | null` (an index loop over
  `this.g.enemyMgr?.enemies`, the alive one with that id, its `bodyRig`; no closure per call), set in `addRemote` right
  after `const avatar = new RemoteAvatar(g.world, g.vfx, g.ballistics, p);`: `avatar.victimRigOf = this.knifeRigOf;`.
  In `frameUpdate`, right after `r.avatar.update(dt, now);`:
  `const kn = r.avatar.knife; if (kn.posesVictim) { const e = <the alive enemy with id kn.tid, index loop>; if (e && this.seized.get(e.id)?.by === r.id) kn.victim(r.avatar.rig, e.bodyRig, e); }`
  (`Enemy.knifeVictim` pins him; `Enemy.frame` then leaves the root. The enemies posed earlier in this frame, so his
  clip phase and hands are one frame behind the drawn client: Doubt 1.)
- Seized step (the fixed-step loop `for (const [eid, s] of this.seized) {`): before `s.hfOn = false;` (the fall-through
  after the grab block):
  `if (by && by.alive && mv?.m === 'takedown' && mv.tid === eid && knifeRowOfSub(mv.sub) >= 0 && by.avatar.knife.rootOn) { const e = <alive enemy eid>; if (e) e.holdAt(by.avatar.knife.root.x, by.avatar.knife.root.y, by.avatar.knife.root.z, by.avatar.knife.root.yaw); }`
  then fall through as today (no `continue`; `TD_MAX` 6 s is far over the 1.65 s move). His sim feet then follow the
  drawn pair, so the body lies where he fell (`bodyLie`, the host's `Body`) and his snapshots carry the same place to
  the client.

### 10. `src/ai/enemy.ts` (one line; tell Guard AI in the PR body)
In `releaseTakedown(stagger = 0.6): void {`, after `if (!this.taken) return;`:
`if (this.knifePinned || (this.killDrv && this.rig.graph.kill === this.killDrv)) this.knifeVictim(null, 0, 0);`
(a client's knife kill aborted on the host, the client gone, `TD_MAX`: every release path unpins him; the local
controller already does this before `releaseTakedown`, so it is a no-op there).

### 11. The knife tail seen by the remaining gates (S2 CHECK polish 2 and 3; the `busy` getter landed in S2)
`g.takedown.active` -> `g.takedown.busy` (identical with the switch off: `busy === (active !== null)` when `kOn` is
false) at:
- `src/game/modes/sectorMode.ts` `if (g.takedown.active) g.takedown.reset();` (section unload) and the three
  `if (g.takedown.active) g.takedown.reset();` in `src/game/modes/courseMode.ts`;
- `src/game/gadgetSystem.ts` `const busy = g.takedown.active !== null || ...` -> `g.takedown.busy || ...`;
- `src/game/teamController.ts` `if (!mates.length || g.takedown.active || g.strike.active) return false;`;
- `src/game/gameState.ts` `if (this.takedown.offer || this.takedown.active || this.carrier?.busy) {` and
  `const end = !d || !pl.alive || hurt || this.takedown.active !== null || ...` (`this.takedown.busy`).
Leave every other `active` read (the offer prompt, `localMoveState`, the client's abort sites) as it is.

### 12. Docs
- `docs/systems/takedowns.md` "## Knife kills (piano scene; piano-knife S1, S2, `docs/piano-knife/`)": add S3 to the
  heading and a "Co-op" paragraph: the host's gate (knife start only with its switch on, no other takedown, no RT
  strike, no throw knockout while on), the wire (the table above, short), the remote pair (`RemoteKnife`; the host's
  victim one frame behind), the double.
- `src/net/protocol.ts`: comment only on the `td` line: `kind` values now include `'knife'` (piano-knife S3).
- `changes/feature-piano-knife-s3.md`: `# Piano scene: co-op knife kills` / `kind: minor` / one bullet: "Co-op (piano
  scene, still hidden): both players' knife kills look the same on both screens; the host checks every takedown in the
  scene is a knife kill."

## Changed from PLAN (the lead updates PLAN 2.6 and 3)
1. `ph` is the move's phase over `knifeSpan` (the move plus the tail), not the drive phase, so the remote attacker plays
   the tail too (`active` is null in it, so today's branch would drop the knife 0.3 s early); `s` carries the approach
   progress (the grab's ease and the hands' weight on the remote come from it). Row 7 = the switch-on move without a
   row (knife shown on every screen).
2. The remote pair is a new `src/net/remoteKnife.ts` driving `knifePair` / `killDrive` / `knifeKill` helpers;
   `knifePair.ts` gets only `knifeSpan`. `protocol.ts` gets a comment only (the `td` kind field already carries any id).
3. On the host the victim of a client's kill is posed after the enemies posed (the `gameState` frame order), one
   frame behind; no reorder (Doubt 1). The seized step `holdAt`s him off the drawn pair (not in PLAN: keeps his sim
   feet, body lie and snapshots on the drawn spot).
4. The host also refuses `assist` starts with its switch on (PLAN-CHECK-3 item 4: "any non-knife takedown").
5. RT refusal uses the existing `cdeny` reason `busy` (no new reason: a new one would be a parse change for the client).
6. Added under A10: the partner throw's knockout is off while the switch is on (lead to confirm: Doubt 5).
7. Added files: `src/net/remoteKnife.ts`, `src/ai/enemy.ts` (one line), the polish gates in `sectorMode.ts`,
   `courseMode.ts`, `gadgetSystem.ts`, `teamController.ts`, `gameState.ts`; `takedownController.ts` (wire getters,
   side row, `kFromYaw`). The S1 checker polish "fallback kills loud" landed in S2 for the solo / host kill; S3 adds
   the client's on the host.
8. e2e: the lead requests `e2e-coop` + `e2e-netmove`; `e2e-ctcourse` comes with the PR head's `affected-e2e` (the
   co-op group, `src/net`), not a separate request.

## Tests (one closest set, run once; a red test gets one fix and one rerun)
New `tests/knifeWire.test.ts`:
1. Bits: `knifeSub` / `knifeRowOfSub` for rows 0-3, -1 (-> 7) and a sub without the bit (-> -1); a knife MoveState
   through `packMoveState` -> `sanitizeMoveState` keeps `sub`, `ph` and `s` (3 decimals); `poseFromMoveState` of a
   knife row gives `melee` -1, of row 7 with `TAKEDOWN_SUB_BLOW` the arc (`killWarp`) as today.
2. `localMoveState` (the `tests/poseParity.test.ts` fake game, plus `knifeOn`, `knifeTid`, `kr`, `kt`,
   `knifeApproach`): approach (kt 0, `s` 0.5), move and tail (`active` null) write `m` 'takedown', the tid, `knifeSub(kr)`,
   `ph = kt / knifeSpan`, `s`; the -1 path writes row 7 and the blow bit from `blowPh`; `knifeOn` false = today's
   output.
3. Host gate (the `Object.create(CoopHost.prototype)` harness of `tests/dogTakedown.test.ts`, `g.takedown.knife`
   toggled): switch off + `kind: 'knife'` start -> `tdDenied`, nothing seized; switch on + `knife` start -> seized,
   `beginTakedown(false, ...)`; switch on + no kind / `assist` start -> `tdDenied`; switch on + `done` with `lethal`
   false -> `applyDamage`, never `knockOut`, `hear` radius 1.2; switch off + `done` lethal -> radius 3, non-lethal ->
   `knockOut` and 1.2 (today).
4. Strike: switch on, a client's `cmove` strike -> `cdeny` `busy`, no `strikes` entry, no `applyHit`; switch off ->
   `cstart` as today. Throw: switch on, `throwKnockOut` knocks nobody out.
5. `tdOut`: switch on -> `kind: 'knife'` on start, done and abort; switch off -> no kind except `done` with a course
   kind (today's messages).
6. `EnemyPuppet` (`Object.create(EnemyPuppet.prototype)` with a fake rig: `graph.kill`, `reachL/R.w`, `emote`, `root`,
   `animate`): `knifeVictim` pins and sets the drive; `update` (with `taken` set, so no snapshot buffer is needed)
   keeps a pinned root where it was put; `die`, `deny`, `releaseTakedown`, `dispose` and `knifeVictim(null)`
   clear drive, pin and hands.
7. The double (pure `victimRoot`, row 0, the attacker at `guard - facing x TAKEDOWN.standoff` at the end of the
   approach): two guards side by side 1 m and 2 m apart and one 1.5 m behind the other, both facing the same way: the
   two victim roots end at least 0.5 m apart; `DualClock` pairs the host's knife `done` event and a client's `td done`
   1.0 s apart (dual) and 1.6 s apart (not).
8. Remote parity on headless rigs (`tests/helpers/knifePairRun.ts` gains `via: 'local' | 'wire-client' | 'wire-host'`;
   `'local'` is today's run): `wire-*` feeds the same attacker root track through a MoveState per frame (`knifeSub`,
   `ph` rounded to 3 decimals, `s`) into a `RemoteKnife` (client order: attacker hands, she poses, `victim`, he poses;
   host order: he poses first, then her hands, she poses, `victim`). For each row: the victim root within 1 mm
   (client) / 1 cm (host) of `victimRoot` off her drawn root; her right wrist, the knife tip and his head within 3 cm of
   the local run at every frame (G400); each contact no worse than the local run's maximum + 2 cm (host) / + 0.5 cm
   (client). `RemoteKnife.attacker` and `victim` allocate nothing per call (`bytesPerCall`, `tests/helpers/allocPerCall`).
Edited:
- `tests/knifeTakedown.test.ts`: a side kill starts from his real facing (`kFromYaw === e.yaw`), picks row 0 with his
  back towards her and row 3 facing her, and turns him at most 90 degrees over the grab; `busy` true through the tail
  at the gates of file 11 (one assert each where a fake game reaches it cheaply: `gadgetSystem`, `teamController`).
- `tests/moveState.test.ts`: the two new constants are distinct from `TAKEDOWN_SUB_BLOW` and every bit a `takedown`
  sub had before.
Existing, must stay green: `tests/protocolConst.test.ts`, `tests/elbowStrike.test.ts`, `tests/dualTakedown.test.ts`,
`tests/poseParity.test.ts`, `tests/dogTakedown.test.ts`, `tests/coopWalkFixes.test.ts`, `tests/jointInterrogation.test.ts`,
`tests/coopGuardAi.test.ts`, `tests/knifePair.test.ts`, `tests/knifeKill.test.ts`, `tests/takedownAlloc.test.ts`,
`tests/grabMenu.test.ts`, `tests/animN4dKill.test.ts`.

## Checks
- `npm run typecheck:fast`
- `npx vitest run tests/knifeWire.test.ts tests/knifeTakedown.test.ts tests/moveState.test.ts tests/protocolConst.test.ts
  tests/elbowStrike.test.ts tests/dualTakedown.test.ts tests/poseParity.test.ts tests/dogTakedown.test.ts
  tests/coopWalkFixes.test.ts tests/jointInterrogation.test.ts tests/coopGuardAi.test.ts tests/knifePair.test.ts
  tests/knifeKill.test.ts tests/takedownAlloc.test.ts tests/grabMenu.test.ts tests/animN4dKill.test.ts`
- Laptop: the PR head's `affected-e2e` (the co-op group: `e2e-coop` + `e2e-netmove` + `e2e-ctcourse`); the lead also
  requests `e2e-coop` + `e2e-netmove` as the checker gate (`node scripts/laptop-queue/request.mjs --sha <full sha> --pr <n>
  --suites "e2e-coop e2e-netmove" --set pk-s3-coop --requester "Night Shift | Player Build"`). The checkers pass only
  when both are green. The two-page scene run is Campaign S4's `e2e-piano`.
- Two independent Opus checkers. Each confirms: with the switch off on both pages every `td`, `cmove`, MoveState and
  noise is today's (the tests in item 3-5 and 2); `src/net` is reached only through the existing dynamic import (no
  static `src/net` import from `src/game`, `src/player`, `src/ai`); `remoteKnife.ts` and the avatar / puppet / host
  frame paths allocate nothing per frame; the host can never knock a guard out while its switch is on (strike, `td`,
  assist, throw); every pin is cleared on every end (done, abort, deny, release, death, dispose, the wire leaving the
  knife state); no `knifeKill.ts` edit, no new wire field, no version bump.

## Size
| Part | Lines |
|---|---|
| `remoteKnife.ts` | ~170 |
| `remoteAvatar.ts` + `enemyPuppet.ts` | ~85 |
| `coopClient.ts` + `coopHost.ts` | ~95 |
| `moveState.ts` + `localMoveState.ts` + `knifePair.ts` + `takedownController.ts` + `enemy.ts` | ~65 |
| Polish gates (file 11) | ~8 |
| `knifeWire.test.ts` | ~380 |
| `knifePairRun.ts` (`via`) + `knifeTakedown` / `moveState` test edits | ~140 |
| Docs + fragment | ~25 |
| Total | ~970 |

## Done looks like
- Two pages in the piano scene (switches on): the client's knife kill on a guard plays on the host's screen as on the
  client's: her stab clip, the knife in her hand, his body attached to hers with his clip, buckle and hands on her
  forearm, then his body; the same for the host's kill on the client's screen.
- G5 + G6 taken together inside 1.5 s give the dual takedown banner and two bodies apart.
- With the switch on the host never knocks a guard out (RT strike, a non-knife or assist `td`, a throw); a client's
  kill makes 1.2 m of noise on the host.
- With the switch off nothing changes anywhere.

## PR
`gh pr create --base master --head feature/piano-knife-s3 --title "Piano scene: co-op knife kills (dark, piano-knife S3)"`.
Body: what was built, the wire change (the table, for the train's bump), files, commits, tests and results, the
Guard AI line ("`Enemy.releaseTakedown` now also clears the knife pin (piano-knife S3)"), the e2e results, the attribution
lines your session gives. For Campaign (PR body and the lead's message): both pages must call
`takedown.setKnifeScene(...)` at play start and `setKnifeScene(false)` at the end (the host gates a client's kill on
its own switch, the client sends `knife` only with its own on).

## Doubts
1. Host frame order: `gameState` poses the enemies before `net.frameUpdate` poses the remote avatars, so on the host's
   screen the victim of a client's kill takes his clip phase and hands one frame (~17 ms) behind the drawn client (his
   root is placed this frame). Test 8 bounds it (+2 cm over the local run). A reorder of `gameState.frameUpdate` is
   out of scope; a polish item if Michael sees it.
2. The guard's death on a remote screen arrives with the host's kill (snapshot / `kill` event), up to a round trip
   after the attacker's `limp` there; until then he keeps his clip (clamped at `victimTo`) on the drawn attacker, then
   the ragdoll takes that pose. On the client's own kill the puppet holds its last knife pose (pinned) from its
   `limp` until the host's death arrives.
3. Campaign must call `setKnifeScene` on both pages. If the client's page never does, every client takedown is a
   non-knife start and the host denies it (the client cannot take anyone down); if only the client's is on, the host
   denies its knife starts. Named in the PR for Campaign S4.
4. A client is still offered a guard the partner is mid-kill on (the puppet is not `taken` on the client); the host
   denies the start and the client aborts at once. No fix in S3.
5. The throw knockout (`throwKnockOut`) is not in PLAN; turned off under A10 ("Palm strike knockout disabled, only knife
   kills"). The lead confirms or drops that one line.
6. A client's RT strike already started before the host's switch came on still lands (`runStrikes` is not gated): a
   window under 0.5 s at play start.
7. A page that has not loaded the knife clips (its own switch off or still loading) shows the first knife kill it sees
   as row 7 (knife in hand, today's lethal approach) until they load (`read` starts the load).
8. When the guard dies on a remote screen his rig leaves the resolver, so the attacker's hands drop at once instead of
   easing out over `KNIFE.release` (0.15 s); cosmetic.
9. The side kill still turns him up to 90 degrees over the ~0.1 s grab; a walk note.
10. Contacts on remote screens inherit S2's `KNOWN_MISS` / `OVER_CEILING` (A16: accepted until Michael plays).
