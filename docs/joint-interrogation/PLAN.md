# Joint interrogation (spare job 9) - plan

Branch `feature/joint-interrogation` off master 6b44efb8. Sources: G148 (DECISIONS.md:760, "Yes, non-violent", adds to
G23), bible 5.4 (design-bible.md:420), CT digests (levels-digest.md:40/494/508, moves-mechanics-digest.md:303/538),
SPEC.md:1255 (CR-S32: "host flags; the A8 officer"), COOP-INVENTORY.md:94 ("Not built"). One slice, prototype (G4).

## 1. Design
- **Roles (G148 x CT).** The holder (the player gripping the guard) reads his reaction: the existing INTERROGATE (1.5 s,
  `CQ.interrogate`). The partner bluffs: a new BLUFF row. CT's "both question the same captive; some intel only this
  way" = the guard gives his normal lines to anyone, and extra joint-only lines only when the read ends during a live bluff.
- **Start.** The partner within the team-takedown offer of a guard the other player holds (`assistPlan`, 1.8 m, any
  side; co-op only) holds A: the menu lists BLUFF above TEAM TAKEDOWN when the guard has joint info. Release on BLUFF
  sends it. The host accepts and tells both: feed line "Bluff on. Read his face now." The holder then holds A,
  INTERROGATE (either order works: only the end is checked).
- **Joint-only reward.** The read ends while the bluff is live (started <= `JOINT.window` 6 s ago, bluffer alive and
  within `JOINT.reach` 3 m of the guard): the host reveals the guard's `joint` lines to both, sets its `joint.flag`
  (course flag through the existing `onIntelCode`), counts `joints`.
- **Ends.** Success as above; or the window lapses (the read then gives the solo yield only); or the guard goes down.
- **Non-violent.** The joint mode adds no threat or strike row. BLUFF is speech only (no pose).
- **Assumptions** (each undoable):
  - A1 One chance: a solo interrogation spends all of a guard's info, joint part included (CT one-shot grab). Undo:
    `takeInfo` leaves `{ lines: [], joint }` and `hasInfo` also reads `joint`.
  - A2 The holder's RT finisher stays live during a bluff (it is the hold's, not a joint row) and ends the questioning.
    Undo: gate `grabTriggerPick` on `net.jointLive(hostage)`.
  - A3 No bluffer animation or lock; the bluffer may walk, the host checks reach only at the end. Undo: a speed cap.
  - A4 The holder's row keeps the label INTERROGATE (a client holder does not know the bluff state). Undo: label from
    `jointLive` on the host only.
  - A5 Joint lines show as radio subtitles + feed on both pages (as the client shows intel today), not the guard's voice.
  - A6 A denied bluff shows nothing (existing `tdDenied`, harmless for a partner-held puppet: coopClient.ts:765-771).
  - A7 Window 6 s, reach 3 m (= `TD_REACH`): starting values.

## 2. Host authority and the wire
- **Host state.** `CoopHost.bluffs = new Map<string, Bluff>()` keyed by bluffer id, `Bluff { eid; t0 }` (host `time`),
  beside `assists` (coopHost.ts:145). `joints = 0` counter beside `duals` (:337). Stale entries expire by time; no
  per-step work.
- **Client -> host.** `td { target, ph: 'start', lethal: false, kind: 'bluff' }`. `td.kind` is already a free id
  (protocol.ts:271, parse :894-898), so **protocol.ts is not edited**. A new kind is still a wire-semantics change (an
  older host would seize the guard), so the PR declares a wire path; the train bumps `PROTOCOL_VERSION`. The builder
  never edits the number.
- **Host checks** (`onBluff`): alive, `holderOf(e, r.id)` non-null (coopHost.ts:864, the assist rule), `hasJoint(e)`,
  distance <= `JOINT.reach`; else `tdDenied`. Accept: `bluffs.set`, `radioLine(JOINT_BLUFF_FEED)` + local feed.
- **Host -> clients.** Existing events only: `feed` (bluff on; the joint lines through the `intel` hook, coopHost.ts:284).
- **Hot paths.** Nothing per frame. The checks run on events (bluff start, read end). `jointFor` loops <= 3 map entries.

## 3. Content hook (Marlow Yard A8)
- `src/world/maps/ctcourseSets/a8Strongroom.ts:83-85`: `A8_OFFICER_INFO` becomes a `GuardIntel` with
  `joint: { lines: [...], flag: 'a8-joint' }`. Lines (true A8 facts, <= 90 chars, no dashes):
  - "The button inside the lobby, south wall. It opens the grille and keeps it open." (`A8_RTE_GATE_ON`, :111)
  - "Night two stops at the grille five seconds, every forty. Then back to the desk." (word the loop from
    `patrolPeriod(A8_N2_ROUTE ...)` rounded; fix the number if it differs).
- `a8Strongroom.ts:589-595` radio: add `{ at: 'a8-split', text: "The duty officer clams up with one of you. Two of you, he might say more." }`
  (spoken when A reaches the gallery: the teach).
- The flag `a8-joint` has no consumer yet (A8 has no keypad; a gate on the grille would cut the route). The reward is
  the radio subtitle + feed intel entry; the flag records it for tests and a later keypad (SPEC.md:1258, G143).
- A1 cost: B must reach the office (public stair or boost) before A interrogates; optional, A8's objectives unchanged.

## 4. Slice 1 (the only one)
**Files and steps**
1. NEW `src/game/jointInterrogation.ts` (Babylon-free, no allocation in its checks): `JOINT = { window: 6, reach: 3 }`,
   `JOINT_KIND = 'joint'`, `JOINT_BLUFF_LABEL = 'Bluff'`, `JOINT_BLUFF_FEED`, `interface JointIntel { lines; flag? }`,
   `interface Bluff { eid; t0 }`, `jointOf(info)`, `hasJoint(v: HasInfo)`, `bluffLive(b, eid, now, d)`,
   `jointLines(j)` (capped `INTEL.lineMax`), `checkJoint(j)` (line max `GUARD_INFO_LINE_MAX`, no dashes, flag non-empty).
2. `src/game/intel.ts:17-19`: `GuardIntel` gets `readonly joint?: JointIntel` (import type).
3. `src/game/intelReveal.ts` after :20: `revealJoint(g, at, j)`: for each `jointLines(j)` line `g.hud.feedItem` +
   `g.hud.barks.say('lantern', line, true)`; `j.flag` -> `g.mode?.onIntelCode?.(flag)`; emit `intel` (lines, codes).
4. `src/game/gameState.ts:225-228` NetAttachment: `jointBluff?(v: TakedownVictim): void` (host: check + store;
   client: send) and `jointLive?(v: TakedownVictim): boolean` (host only). `contextMenuStep` offer block :1377-1381,
   just before the TD_KIND row (BLUFF lists first):
   `if (o.plan.kind === 'assist' && hasJoint(o.e)) m.add(JOINT_KIND, 'bluff', -1, JOINT_BLUFF_LABEL)`. `ctxRun` :1433-1442: `JOINT_KIND` -> `this.net?.jointBluff?.(td.offer.e)`.
5. `src/game/takedownController.ts:469-476` (host / solo holder's read ends): keep `info` before `takeInfo`; when
   `!g.puppet && g.net?.jointLive?.(e)`, also `revealJoint(g, e.pos, jointOf(info))`.
6. `src/net/coopHost.ts`: :145 `bluffs`; :337 `joints`; :831 branch `m.kind === 'bluff'` -> `onBluff` (before the seize
   path); near :871 `jointBluff(v)` (the host's own bluff, `by = selfId`, same checks), `jointLive(v)` (a bluff by
   another player), private `jointFor(eid, holder): boolean` (bluffer feet: `remotes.get(id).feet` or
   `g.player.position`); :1541-1544 the client holder's read end: `const joint = this.jointFor(eid, s.by)` before
   `takeInfo`, then `revealJoint` when true; on success `bluffs.delete`, `joints++`.
7. `src/net/coopClient.ts` after :622: `jointBluff(v)` -> `toHost({ t: 'td', target: v.id, ph: 'start', lethal: false, kind: 'bluff' })`.
8. The A8 data and radio line (section 3).

**Tests**
- Unit, NEW `tests/jointInterrogation.test.ts`: `bluffLive` (window edge, reach edge, wrong guard, own hold),
  `jointOf`/`hasJoint` (none, spent), `jointLines` cap, `checkJoint` on `A8_OFFICER_INFO.joint` (empty errors), the A8
  joint flag set, `td` kind `bluff` round-trips `parseMsg` (no protocol edit needed).
- `tests/ctcourse.test.ts:161`: also iterate `(s.info as GuardIntel).joint?.lines` (radio length, no dashes).
- e2e, `scripts/e2e-coop.mjs` in the client-hostage block, after "the client grab menu opens" (:984), before the team
  takedown: step **"joint interrogation: host bluffs, client reads"**: give guard `gg` joint info on both pages (host
  `e.info`, client `puppet.info` = `{ lines: ['e2e solo'], joint: { lines: ['e2e joint'], flag: 'e2e-joint' } }`);
  host (already beside him) checks the BLUFF row is listed (`ctxMenu.opts`) then `net.jointBluff(e)`; client
  `grabMenu.sel = GRAB_INTERROGATE` + an A press (or `takedown.menuPick = 'interrogate'`); assert host `net.joints`
  +1, `.hud-feed` on both pages contains `e2e joint`, the client still holds him (the team takedown step follows).
  Second assert: the client bluffs a guard nobody holds -> `net.bluffs.size` stays 0.
- Laptop (BelowNormal, `E2E_JOBS=1`, heavy.lock): `npm run check`; `npx vitest run tests/jointInterrogation.test.ts
  tests/ctcourse.test.ts tests/guardInfo.test.ts tests/intel.test.ts tests/intelPartB.test.ts tests/grabMenu.test.ts`;
  `node scripts/run-e2e.mjs e2e-coop e2e-takedown e2e-ctcourse:4` (coop: the new step; takedown: `grab-interrogate-intel`
  solo regression; ctcourse part 4: A7-A8 load with the new data).
- Docs: `docs/systems/coop.md` :175-181 (after the team takedown paragraph) a joint-interrogation paragraph (the `td`
  kind `bluff`, `bluffs`, the checks, the yield at :208-211's read end) and the protocol history line :24 ("a `td`
  kind `bluff`"); `docs/systems/takedowns.md` after :97 (BLUFF row, roles, window, A1-A2); `TESTING.md` after :134 one
  line ("co-op: partner beside a held A8 officer, hold A, BLUFF; holder INTERROGATE within 6 s: both see the two
  joint lines; a solo read gives only his two lines"); `changes/feature-joint-interrogation.md` fragment (kind: minor);
  `docs/marlow-final/COOP-INVENTORY.md:94` "Built (joint-interrogation)"; SPEC.md:1255 marked built.

## 5. Risks and checker focus
- Wire: `kind: 'bluff'` must branch before the seize path in `onTakedown` (coopHost.ts:830); a fall-through seizes a
  partner's hostage. PR must declare the wire path for the train bump; no number edited anywhere.
- Double reveal: the client-holder path (coopHost.ts:1541) and the host-holder path (takedownController.ts:476) must
  never both run for one read (`!g.puppet` guard stays; `jointFor` excludes the holder as bluffer).
- `holderOf` reads `takedown.hostage` (`grab.hold`): confirm it stays non-null while the host interrogates.
- Single player: no `src/net` import; the BLUFF row needs `plan.kind === 'assist'`, which only `net.partnerHolds` makes.
- A client bluffer's stale puppet info (A1) may list BLUFF on a spent guard: the host denies; acceptable.
- No allocation added to `contextMenuStep` (`hasJoint` is a field read) or the seized loop.
- Files shared with open branches: coopHost.ts (sector-fixes-r2 / hang-down, spare-jobs.md:9), gameState.ts,
  a8Strongroom.ts (marlow-final has no changes there since its merge base): rebase before the PR.
- Checker: the e2e step really drives the menu row and the client read (not just calling `revealJoint`); line lengths;
  the N2 loop number in the line matches `patrolPeriod`; G146 rating unaffected (no kill, no alarm).
