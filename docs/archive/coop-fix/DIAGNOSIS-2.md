# coop-fix - diagnosis 2: the invisible host (2026-10-20)

Read-only review of `feature/coop-fix` (master 4.13.0 + the fix commits). Nothing was built or run: no `node_modules`
here, and the heavy lock is another job's. Every claim below comes from the code and git history. The repro script
`scripts/repro-coop-avatar.mjs` was written but not run (`node --check` passes).

New fact (Michael): when the host was invisible on the joiner, the two windows were side by side and both visible. A
visible but unfocused Chromium window keeps full-rate rAF, so the hidden-window stall (DIAGNOSIS.md) does not explain
bug 1. The bg-tick fix stays useful, but it is not the cause.

## Summary
The two remote paths render the same way. The remote figure uses the same scene library, materials and LOD picker as
the local body, and nothing hides it. So the host can only be invisible on the joiner in two ways:
1. The remote update path never runs, so the host's LOD meshes are never switched on.
2. A LOD that only a remote ever shows is not drawn.

No single throwing line was found by reading. The repro traps every candidate site and names the one that fires.

## Ranked causes

### 1. An exception stops the joiner's partner path (confidence: medium, about 45 %)
**How the host becomes visible on the joiner.** It only happens through `RemoteAvatar.update`:
- The rig is disabled at construction (`src/net/remoteAvatar.ts:150`).
- It is enabled on the first sample (`:191-194`).
- The LOD meshes are switched on only by `partnerFigureFrame` (`:508`), through `OperatorFigure.update`
  (`src/operators/runtime/figure.ts:566-572`).
- No other code enables them.

**Where a throw on the way stops it.**
- **Per frame.** `GameState.frameUpdate` runs about 15 systems before `this.net?.frameUpdate(dt)`
  (`src/game/gameState.ts:2025-2039`). `CoopClient.frameUpdate` runs `clientCourseFrame` (`coopClient.ts:631`) before
  the avatar loop (`:634`). Inside `update`, `setWeapon`, the wall / grab / grip code and `rig.animate` all run before
  `partnerFigureFrame`.
  - A throw anywhere there, on every frame, means `figure.current` stays -1 and nothing of the host is drawn.
  - `App.hooks` swallows it (`src/core/app.ts:380-386`). It logs to the console and shows one toast,
    "Something went wrong - still running", once per page.
- **Per snapshot.** The avatar is created inside `onSnap` (`coopClient.ts:268-275`, constructor at `:227`). If the
  constructor or the push throws:
  - The rest of `onSnap` is skipped on every snapshot: puppets, items, doors and the objective. That also pins
    "Connecting to host…", even without the bug-2 cause.
  - Each retry leaks a half-built rig.
  - On WebRTC the throw goes into Trystero's handler, because `trysteroTransport.ts:32` has no try.
  - On `?net=local` the transport swallows it silently (`localTransport.ts:58`, `catch {}`). So no e2e can ever see it.
- **Host side.** The same applies to a throw in `GameState.fixedUpdate` before `this.net?.fixedUpdate(dt)`
  (`gameState.ts:1478-1680`), or in `CoopHost.fixedUpdate` before `snapshot()` (`coopHost.ts:1042-1107`). The host
  then sends no snapshots. It still sees the joiner, because pstates are handled in the message handler and remotes in
  frameUpdate. The host shows the same one-time toast.

**Why every suite misses it.**
- e2e-coop / e2e-ctcourse on master asserted only `avatars.size === 1`. The drawn asserts were added in this branch
  and have not run yet.
- The suites run `?gfx=min` (`scripts/e2e-lib.mjs:164`), a fresh profile and the swallowing local transport.
- Michael's run differed in four ways:
  - the full preset (LOD0 / LOD1, baked-lamp plugin, real shadows);
  - his real save, shared by both windows (loadout, settings);
  - Trystero;
  - a real pad.

### 2. A LOD only a remote shows is not drawn (GPU only; confidence: low-medium, about 25 %)
- Remote bodies switch LOD by distance (`lodPick.ts`: LOD0 under 8 m, LOD1 8-25 m, LOD2 beyond, with 10 % hysteresis).
- The local body is always about 2-3 m from its camera, so it is always LOD0.
- The menu draws the hero. It parses the LOD1 file but never builds it (`playerFigure.ts` `loadMenuLods`, prefetch only).
- Logic e2e loads LOD2 only (`playerFigure.ts:90`, `MIN_LODS`).
- So LOD1, and LOD0 on a remote, are drawn by no logic test and by no local view. If their meshes never pass
  `isReady` (an effect that never compiles for that LOD's skin and morph-target defines) or their skinning collapses,
  the partner vanishes at those ranges.
- Against it: the host saw the joiner fine, through the same code. It would only fit if the host looked at the joiner
  in another distance band.
- The repro measures each band (3 / 12 / 30 m), including `isReady` per mesh, with `REPRO_GFX=high`.

### 3. The host is drawn but unreadable in the dark (confidence: low, about 15 %)
- Light and shadow is the core. The remote figure is lit like any body: shared PBR materials plus the baked-lamp
  plugin. Its goggle is stowed and dim (`partnerFigureFrame`, G73).
- In a dark bay the partner a few metres off can read as nothing, while your own body near the camera stays readable.
- No local-only fill light exists (no `includedOnlyMeshes` on any light), so this would be a readability issue, not
  a bug. The repro's screenshots at 3 / 12 / 30 m settle it.

### 4. The hidden-window rAF stall (confidence: low, about 10 % for this report)
Side by side rules out occlusion. It only remains if a window was minimised or covered at some point, for example
during the load. The bg-tick fix covers it.

### Leads checked and rejected

| Lead | Verdict | Evidence |
| --- | --- | --- |
| 1. Menu gate / hero shares or disposes assets the remote reuses | No | The menu has its own `Scene` (`menuScene.ts:141`) and its own `OperatorLibrary` (one per scene, `playerFigure.ts:42`). Its `exit` frees only its figure, its close camera and the parsed hero file (`menuScene.ts:484-490`). Only the CPU-side parsed GLB cache (`figure.ts` `MODELS`) is shared, and nothing mutates it. In the match, the local body and the remote share one library, materials and textures. There is no template, container or clone. |
| 1. The remote spawns before the clips / figure load | Handled | The avatar is built on the first snapshot. `loadPlayLods` starts at construction (`remoteAvatar.ts:147`). Each load only sets `have`, and the next `update` picks and enables the LOD (`figure.ts:566-572`). Animation is procedural (the rig); there are no keyed clips to wait for. |
| 1. The real lobby flow vs autostart | Same path | `?net=local&autostart` also runs `goToMenu()` and the lobby session (`main.ts` `autoLocalCourse`, `coopUi.ts:619-646`). The menu flow only adds clicks, the title and the full preset. |
| 2. Culling / bounds | No | Every figure mesh has `alwaysSelectAsActiveMesh` (`figure.ts:504`). No figure sets `layerMask`; only the shadow proxies have `PROXY_LAYER` (`world.ts:376`). No `renderingGroupId` on figures, no occlusion queries, no distance or room culling system. The camera fade and the head hide are local only. |
| 3. Same profile, same player id | No | The Trystero `selfId` is `genId(20)`, random per page at module load. The local transport uses `L` plus a random string per transport (`localTransport.ts:11`). The self skip (`coopClient.ts:268`) cannot fire for the host. |
| 3. Shared IndexedDB / BroadcastChannel cross-talk | No render effect | Settings and save are shared, which is harmless. The only BroadcastChannel is the local transport's, per room. Side finding: the crash-log heartbeat is in shared `localStorage` (`crashLog.ts`). A second window reads the first window's live beat as a crash and shows a false "The last session crashed" toast and note. This is cosmetic, for the polish list. |
| 4. Snapshot fields | Complete in both flows | Avatar creation needs `session.players` (from the lobby, before `start`) and a parsed player state. The parser checks the id regex (Trystero ids fit), finite x / y / z (clamped) and `w` in `WEAPON_IDS`; the host only holds those two weapons. Size stays well under the 64 000-character Trystero cap (`trysteroTransport.ts:25`), so nothing is missing until a later event. |
| git v4.9.0..4.13.0 (`remoteAvatar`, `coopClient`, `coopHost`) | No visibility change | Only new pose inputs: grab / KO hands, tense sneak, landing, wall turn and peek. `tenseNear` reads the client's puppets (they have `pos` / `alive` / `alerted`). v4.7.5..v4.9.0 (menu gate) touched only the menu scene and the load-screen wait. |

## Fix for the top cause (src/net only; no src/player, src/anim or src/ui)
1. **Make the partner path independent and loud.** In `src/net/coopClient.ts`:
   - Update the avatars first in `frameUpdate`, before `clientCourseFrame`.
   - Give each `a.update(dt, t)` its own try/catch that logs once per avatar with `console.error`, so the e2e error
     count catches it.
   - After a throw, still call the figure frame so the body is posed or at least shown at its last pose. That needs a
     small `RemoteAvatar.showFigure()` that calls `partnerFigureFrame`.
2. **One bad avatar must not cost the rest of the snapshot.** In `onSnap`, wrap the `this.avatar(p)?.buf.push(...)`
   block in try/catch with a single `console.error`. The puppets, items and objective still apply. If construction
   throws, keep a tombstone so it is not rebuilt (and leaked) 15 times a second.
3. **Stop hiding handler throws in the transports.** `src/net/localTransport.ts:58` swallows them and
   `trysteroTransport.ts:32` does not catch. Make both log the error with `console.error`, keeping the guard only
   for the JSON parse. Then e2e-coop / e2e-ctcourse fail on such a throw.
4. Run the repro. Fix the line its traps name (`snapErr` / `avatarErr` / `frameErr` / `app.report` stack). Keep the
   drawn asserts already in e2e-coop / e2e-ctcourse.
5. If cause 2 shows instead (a band with `drawn` false or `ready` false at 12 m or 3 m under `REPRO_GFX=high`):
   - This is a figure fix in `src/operators/runtime/figure.ts`, which no job owns.
   - Check the LOD1 / LOD0 meshes' `isReady(true)` and their effect error.
   - Prewarm all three LODs on the local body at load, so their effects compile during the loading screen.
   - Add a GPU e2e check of the partner at 12 m.

Ask Michael, which settles it fastest:
- Did a "Something went wrong - still running" toast appear on either window?
- Were the guards visible and moving on the joiner's screen?
- Was the joiner's own body visible?
- Which graphics preset was set?

## The repro (the job lead runs it)
`scripts/repro-coop-avatar.mjs`:
- Serves `dist/` itself.
- Runs the real menu flow on `?net=local&title=1&gfx=<REPRO_GFX>`: title press, main menu, Co-op, Host a room / Join
  with code (typed), Ready (clicked), Start mission (clicked) into Marlow Yard. There is no autostart.
- The menu flow uses the local transport when `?net=local` is set (`coopUi.ts:38-39`). WebRTC needs the public
  relays and is not run.
- Two variants:
  - `shared`: one context, so both windows share the same storage.
  - `separate`: two contexts, with the room's BroadcastChannel relayed through Node.
- In each variant it pumps any page whose rAF stalls, brings the measured page to front, and renders.
- It traps errors in the joiner's `onSnap`, `avatar()` and `frameUpdate`, plus `app.report` on both pages.
- On the joiner it reports:
  - the host avatar's existence, root position (finite) and enabled state;
  - LOD, loaded bits and `placed`;
  - per shown mesh: `isEnabled(true)`, `isVisible`, `visibility`, `layerMask` against the camera's, in active meshes,
    `camera.isInFrustum`, world bound size, `isReady`;
  - the same at 3 / 12 / 30 m;
  - both pages' player ids;
  - host snapshots sent and joiner snapshots seen.
- It also records the host's view of the joiner and the joiner's own body as a control.
- Output: a JSON summary on the last stdout line, exit 0; exit 2 on a setup failure.

Commands (Git Bash, from `C:/NightShift/Mobile-Coop-coop-fix`, after `npm ci` and `npm run build`, holding that
machine's `heavy.lock`, port freed before and after):
```
E2E_PORT=4191 timeout 900 node scripts/repro-coop-avatar.mjs both "$TEMP/repro-coop"
```
GPU and LOD bands (desktop, Michael's PC only):
```
E2E_GPU=1 E2E_PORT=4189 REPRO_GFX=high timeout 900 node scripts/repro-coop-avatar.mjs both "$TEMP/repro-coop-gpu"
```

**Reading the result:**

| Result | Points to |
| --- | --- |
| `snapsSeenByJoiner` 0 while `snapsSentByHost` > 0 | Transport or relay |
| Both 0 | The host's fixedUpdate (check `hostReported`) |
| A non-empty trap | Cause 1, with the stack |
| `avatarCreated` true, `lodShown` false | A LOD load failure (console `[operators]` warning) |
| `drawn` false in one band only | Cause 2 |
| Everything `drawn` and `inView`, but the screenshots show nothing visible | Cause 3 |
| Everything green in both variants | The bug lives only on WebRTC, the pad or Michael's save: next, run the same flow by hand on `/preview/` with the debug overlay and read `window.__app.current.net.avatars` |
