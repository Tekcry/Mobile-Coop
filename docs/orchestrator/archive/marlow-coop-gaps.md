# Marlow Yard - co-op engine gap list (orchestrator research, 2026-10-23 ~01:20)

For marlow-final (Menu Notes lead, Course Ready second builder). Read with DEVICE-INVENTORY.md
(origin/feature/marlow-bays docs/marlow-final-prep/) and COOP-INVENTORY.md (origin/feature/marlow-final); "covered" means
one of those already says it. Line numbers as of master 4.63.1. PROTOCOL_VERSION 29; nothing here needs a bump except a
second scanner pair (covered).

| Set piece | Exists (file:line) | Networked? | Gap | Size |
|---|---|---|---|---|
| 1 Timed light isolation | `LightRegistry.setGroup` lights.ts:239; switches + lights-out lure stealthSystems.ts:412-442; mains gate courseState.ts:194; EMP `disrupt` lights.ts:289 (radius, not group). BakedLamps re-uploads on `reg.version` (bakedLamps.ts:245-276); field, meter and guards read the same registry, so parity holds. | Course mode only: `lights.groups` / `dead` for groups named in `layout.groups` (courseMode.ts:730-734). | Breaker gate covered. New: the Yard's lamp loops (ctcourse.ts:400, 403) set no `group` - every lamp needs one. Switching is free at run time; adding lamps / strips changes the bake key (rebake). Restart fix (courseMode.ts:679-684) covered. | S |
| 2 Cameras, security room, loop | Covered. New: `looped` mode is already drawn (cameraCue.ts:48, 196; LED securityView.ts:23); only the setter and a timer are missing. | Console state rides course flags. | Timed console that sets `looped` for N s. | S |
| 3 Locks | Covered (gates). New: course devices always pass hold time 0 (courseMode.ts:251, 288). Keycard = shared `pickup` + `flag` gate (data only). | Yes, `course.locks`. | Timed gate, hold device: covered. | S |
| 4 Timed jammer | Covered. | Yes, `sec`. | Drill / HUD line: covered. | S |
| 5 Sync hack | Covered (one pair per map ctDevices.ts:358; ground level only :439; glow z hardcoded :426). | Yes, `sec.sc`. | Covered. | S-M |
| 6 Objective list per area, per-player lines | courseHud.ts:56-82 draws a drill table with P1 / P2 ticks; the step line is per player (`nextDrill(me)`); `DrillDef.who` both / lead / second / either (courseDef.ts:90-104). The Yard uses none: `drills: []`, one fixed `OBJECTIVE_TEXT` per bay (ctcourse.ts:274-283, 341, 347). | Yes: drill ticks in `course.s`, client draws from its mirror. | (a) drills tick only from verbs (courseState.ts:301): add a `flag:<id>` tick (S). (b) lead / second fixed by bay (`leadOf`), not by route: per-player lines on splits need a role claimed by first press or zone (S-M). (c) areas are bays, advanced only on airlock pads: an open facility needs zone-based advance (M). | S-M |
| 7 Sliding doors | Hinged only (anchors.ts:111-121); `Doors.write` rotates the leaf; collision body only while closed (`addBody`); light / sight door test uses the closed leaf plane (lightField.ts:336-345), fine for a slide. | Yes: snapshot `doors`, `course.locks`. | (a) `slide` flag + translated leaf in `write` (S). (b) committed open (doorOpen.ts), crack, peek, bash assume a swing: disable / adapt on slides (S). (c) no proximity open (only guards' `pushOpen`): automatic doors M. | S-M |
| 8 View-only glass gallery | `b.windowAt(..., {breakable:false})` (levelBuilder.ts:280): `G.STATIC` pane (breakables.ts:110-112) blocks movement, bullets, guard sight (`losClear` perception.ts:70), camera sight (securitySystem.ts:56); traversal refuses it (traversal.ts:273). Not in light shapes (lamps / moon pass). `fence` (levelBuilder.ts:305, `G.FENCE`) stops bodies only. | Static, nothing to sync. | (a) glass blocking sight breaks G45 (clear glass passes sight) - fine for a view-only gallery, log it for Michael. (b) each pane is also a window anchor (takedown, vault prompts): a plain glass-wall builder without the anchor (S). (c) no non-hostile NPC: passive grunts (enemy.ts:534) are armed, need nav, despawn per bay (courseMode.ts:637-650); posed figures exist only in the menu (menuPoses.ts). | S + M (figures) |
| 9 LED strips | Light-casting strip: `b.light({..., fixture:{model:'strip'}})` (lights.ts:51-63, fixtureModels.ts, lampMount.ts), dark with its group. Every electric lamp is a jam target (ctDevices.ts:345-350) and shootable (lights.ts:423); each costs bake time and a slot in the 48-light pool (`MAX_REAL_LIGHTS`, lightRig.ts:19). | Group state, yes. | No glow-only decor: `box` has no emissive option (levelBuilder.ts:140; only the menu uses `flatMat` emissive, materials.ts:6). Need a glow detail box outside the light shapes (S), linked to a group so it dims with the breaker (S) - unlinked glow breaks parity. Decor lamps `electric:false` or they become jam targets. | S |

Team moves (leg-up, ledge relay, throw, hang-down, rope, dual takedown, revive, pings): covered.

## Cheapest wow
1. Breaker blackout plus lure: timed group cut, the lights-out lure pulls a guard to the switch, mains door opens only while dark (S).
2. Loop the feed: console sets `looped` for N s; view fade and LED already show it (S).
3. Jammer relay chain: data only.
4. Scanner sync under a sweeping camera: data only, one pair.
5. Hang-down hack into a glass-walled room the instructors watch: data + an unbreakable pane.
6. Pair-press sliding vault door: `pair` gate + slide visual (S).
7. Pass zone brings the lights back: both in a box sets a flag (needs the breaker).
8. Dark room with a searching guard: guard torches are synced.

## Open risks
- Cameras ignore lamps (own IR, G240): light isolation beats guards and the meter, never cameras.
- Light sync is course-mode only and only for `layout.groups`; a client shooting a lamp relights within 2 s (covered). Build "players cut it" on switches and breakers, not shots.
- Objective lines follow progress only after the flag-tick change; without it, one static line per bay.
- The bay-and-airlock structure fights a flowing facility layout.
- Large unbreakable window anchors are untested: check takedown and vault prompts near them.
- If glass later passes sight (G45), a guard-type instructor behind it could detect players: keep them passive or static figures.
- More grouped lamps and strips: rebakes and pressure on the 48-light pool; check desktop frame time.
- Course guards run with `em.stealth` off, so "normal guards" do not radio or alarm (covered in COOP-INVENTORY).
