# coop-fix - diagnosis (2026-10-20)

Read-only review of master 4.13.0 (51af5ffb) on `feature/coop-fix`. Nothing was built or run (heavy lock held, no
`node_modules`); every claim is from the code and git history. GPU / visual confirmation is pending a PC run.

Michael (verbatim): "Note also that the host character was invisible in coop for the person joining. There was a
constant Connecting to host label on the person joining even in game also."

## Bug 2: "Connecting to host…" stays on the joiner's HUD (cause: high confidence)

### Cause
The label is the HUD objective line, not a lobby or connecting screen.

- `src/net/coopClient.ts:124`: the `CoopClient` constructor calls `g.hud.setObjective('Connecting to host…')`.
- `src/net/coopClient.ts:61`: `private obj = '';`
- `src/net/coopClient.ts:300-303`: a snapshot replaces the objective only when `m.obj !== this.obj`.
- `src/net/coopHost.ts:194-199`: the host sends `this.obj`, which only `hud.setObjective` calls made after `hookHud()`
  (`coopHost.ts:167`) set. It starts as `''` (`coopHost.ts:111`).
- Course mode (Marlow Yard, the live co-op flow, `coopUi.ts:574`) never calls `hud.setObjective`: no hit in
  `src/game/modes/courseMode.ts` or `src/game/course/`. Its HUD is `CourseHud`. So the host always sends `obj: ''`.
- The client compares `''` with its own `''`, sees no change, and never overwrites the label. It stays for the whole
  match.
- Free Roam (`sandbox`) does the same thing. `gameState.ts:676` sets "Free roam - …" on the host before `hookHud`
  wraps the setter, so the host's `obj` stays `''`.
- Infiltration works because its mode sets the objective after the hook. e2e-coop only runs Infiltration and Free
  Roam, and its only objective assert is `assert(true, …)` (`scripts/e2e-coop.mjs:594-595`), so the suite never
  catches this.

The lobby's `'Connecting to host…'` status (`src/net/coopUi.ts:380`) is a different string, on the lobby screen
only (`!s.hostId`), and it is not the in-game label.

### Fix (src/net only, no other job's files)
1. `src/net/coopClient.ts:124`:
   ```ts
   this.obj = 'Connecting to host…';
   g.hud.setObjective(this.obj);
   ```
   The first snapshot carries `obj: ''` (course) or the host's text. That differs from the placeholder, so it
   replaces the label.
2. `src/net/coopHost.ts:194` (`hookHud`): seed the mirror with what the HUD already shows, so an objective set before
   the hook (Free Roam) reaches the client: `this.obj = hud.objectiveText;` before wrapping (`Hud.objectiveText`
   exists, `src/ui/hud/hud.ts:287`; this only reads it).

### Verify
- e2e (below): the joiner's `hud.objectiveText` is not "Connecting to host…" after the first snapshot, in course mode
  and in Free Roam.
- By hand: host and join Marlow Yard. The label clears within about 0.1 s of the match starting.

## Bug 1: the joiner does not see the host's character (cause: medium confidence)

### Most likely cause: the host page's game loop stalls in a background window, so the joiner never gets a snapshot
- The joiner builds the host's avatar only when a snapshot arrives:
  - `coopClient.ts:265` `this.avatar(p)?.buf.push(...)` inside `onSnap`.
  - `coopClient.ts:211-219` creates the `RemoteAvatar` there.
  - `remoteAvatar.ts:150` disables the rig in the constructor.
  - `remoteAvatar.ts:192-195` enables it on the first buffer sample.
  - No snapshot means no avatar and nothing drawn.
- The host sends snapshots from its fixed step only: `coopHost.ts:1104-1107` (15 Hz) in `fixedUpdate`, called from
  `GameState.fixedUpdate` (`gameState.ts:1680`). The fixed step runs only inside
  `engine.runRenderLoop` (`src/core/loop.ts:55`), which is driven by requestAnimationFrame. There is no timer or worker
  path.
- Chromium stops rAF for a hidden page. On Windows that includes a window fully covered by other windows (native
  window occlusion, on by default) and a minimised window. Timers in a hidden page are throttled to about 1 Hz.
  Network message events still run. An unfocused window that is still visible keeps full-rate rAF.
- With two windows on one PC, playing the joiner usually means the joiner window covers the host window, especially
  when both are maximised. The host's sim then freezes: no snapshots, no guard updates, no course wire. The joiner
  keeps moving locally because client movement is client-side. If the host window was covered before its match loop
  first ticked (the host loads, Michael switches to the joiner), the joiner never receives a single snapshot. The host
  is then invisible, and "Connecting to host…" would stay even without Bug 2.
- The test suites already work around this:
  - `scripts/e2e-ctcourse.mjs:23-48` and `scripts/e2e-course.mjs:29-33` say "The host page is in the background once
    the client page opens: its rAF (and the game loop) stalls". They pump `loop.stepHeadless` from Node whenever the
    host's rAF did not run.
  - e2e-coop steps the host with `stepHeadless` and `waitSim`.
  - The e2e passes for that reason, and real play gets no such pump.
- On hide, the code only does this (`src/core/app.ts:132`, `onVisibility` `app.ts:285-296`): it saves, suspends
  audio, and opens the pause screen. In co-op that pause is `menuOpen`, with the sim not paused (`gameState.ts:1041-1043`).
  Nothing keeps the loop running.

The host seeing the joiner fine fits this. The host is the page in front while Michael plays it, and the joiner's
pstates arrive while the host page runs.

### What was ruled out (code review)
These were checked and none of them hides a remote figure:
- The remote figure path: `operatorRig` (`src/operators/runtime/playerFigure.ts:62-84`), `OperatorFigure.load` /
  `instance` / `update` / `setEnabled` (`src/operators/runtime/figure.ts:429-436, 461-529, 555-572, 642-647`),
  `pickLod` (`lodPick.ts`).
- The LOD meshes are enabled on the LOD switch with `this.enabled` (default true). `alwaysSelectAsActiveMesh` means no
  frustum culling.
- No layerMask or renderingGroup is set on figures.
- No code walks `rig.root.getChildMeshes()` after construction.
- The camera body fade (`shoulderCamera.ts:457-470`) and the head hide (`player.ts:488-489`) touch the local rig and
  figure only.
- The menu hero lives in its own `Scene` (`menuScene.ts:141`). Its dispose frees only its own instance meshes,
  skeletons and cloned glow material; the shared library assets stay.
- `PartnerTarget` and `PartnerBlocker` (course-only on the client) add hit volumes and a physics capsule only.
- Snapshot parsing (`protocol.ts:221-244`) clamps and does not drop the host's entry.
- `SnapshotBuffer.sample` never returns null once one state is in the buffer.
- The 4.10.0-4.13.0 diffs to `remoteAvatar.ts`, `coopClient.ts` and `coopHost.ts` add hold / wall / landing pose
  inputs. They introduce no enable or visibility toggles.

Code that is the same for both directions draws the joiner on the host fine, so no client-only render cause was
found. Two residual risks stay open until the e2e below runs:
- (a) A NaN in a new pose input (wall / grab / landing, `remoteAvatar.ts:236-252, 280-306`) would blank the figure.
- (b) Something visible only on a GPU build. The e2e uses `?gfx=min`, LOD2 only; real play also loads LOD0 and LOD1.
  The LOD distance is now measured from `rig[0]` = `rig.root`, which is correct.

### Fix
1. Keep the co-op sim running while the page is hidden. `src/core/loop.ts` is in core and not owned by another job.
   While `document.hidden` and the match has `net`:
   - Step the sim from a tick source that is not throttled. A small dedicated Worker (an in-repo module bundled by
     Vite, no CDN) posts about 30-60 Hz ticks, and the main thread calls `stepHeadless(elapsed)`, capped at
     0.1 s per tick.
   - On `visibilitychange` back to visible, stop the worker and let rAF resume.
   - Worker-posted messages are not timer-throttled, and a page with an open RTCDataChannel is exempt from
     Chrome's intensive throttling.
   - This covers both ends: host snapshots and joiner pstates.
   - Wire it from `GameState`, which knows `this.net`, or from `CoopHost` / `CoopClient` construction (`src/net`),
     through a `loop.setBackgroundTicks(on)` call.
2. Optional, `src/net/coopClient.ts`: if no snapshot arrives for 2 s in a match, show "Waiting for host…" on the
   objective line, through the fixed objective mirror. A stalled host is then visible as a state, not as a missing
   character.
3. Interim advice for playtests: put the two windows side by side, not overlapping, so neither is occluded.

No file under `src/player`, `src/anim` or `src/ui` needs changing for either fix. Bug 2 reads `Hud.objectiveText`
(`src/ui/hud/hud.ts`) only.

### Verify
- By hand: two windows, one maximised over the other.
  - Before the fix: the joiner's guards and the host stay frozen or missing, and `window.__app.current.net.avatars.size`
    is 0 on the joiner.
  - After the fix: the host appears and moves.
  - With the windows side by side before the fix: if the host is still invisible, the cause is a render bug. Run the
    e2e asserts below on a GPU build (`E2E_GPU=1`) to locate it.
- Ask Michael: were the two windows overlapping or maximised?

## Throttle finding (summary)
- Chromium: a hidden page (another tab in front, minimised, or a fully occluded window on Windows) gets no rAF.
  Its timers are throttled to about 1 Hz, and after 5 minutes to 1 per minute unless the page is exempt (open WebRTC).
  Message and network events still run. A window that is only unfocused but visible runs at full rate.
- Night Shift: the whole sim and the net send (pstate, snapshots, events) run in the rAF render loop
  (`loop.ts:55`, `tick` → `frame`). The only net timers are the local transport's (test only, `localTransport.ts:65-81`)
  and the 15 s join timeout (`coopUi.ts:31, 578-585`, lobby only).
- A hidden host sends nothing. A hidden joiner sends no pstates, so its avatar freezes on the host, but it still
  receives and creates avatars (in message handlers) without rendering them.
- There is no heartbeat timeout, so neither side drops. The host also lands on its pause screen when hidden
  (`app.ts:292`).
- A throttled host explains both symptoms on its own. A host that is never stalled still shows Bug 2 in course mode
  because of the code bug above.

## Test plan (e2e)
The hooks already on `window`:
- `__app.current`: GameState, with `.scene`, `.hud`, `.net`, `.opts.mode`.
- On the joiner, `__app.current.net`: CoopClient, with `.avatars`, a `Map<id, RemoteAvatar>`.
- `RemoteAvatar`: `.rig.root`, `.figure` (OperatorFigure: `.current`, `.loaded`, `.renderMeshes`), `.pos`.
- `__app.loop.stepHeadless`.
- `hud.objectiveText` (getter).

No new hook is needed. Optionally, a `RemoteAvatar.shownMeshes` getter, test-only, returning the current LOD's meshes;
otherwise filter `figure.renderMeshes` by `isEnabled()`.

### 1. `scripts/e2e-ctcourse.mjs`, course mode, the live flow
After both pages are in the match and the host pump has run at least 1 s:
```js
await until(B, () => window.__app.current.net.avatars.size === 1, null, 10000, 'client has the host avatar');
await until(B, () => { const a = window.__app.current.net.avatars.values().next().value; return a.figure.current >= 0; }, null, 20000, 'host figure LOD shown on the client');
const vis = await GB(() => {
  const g = window.__app.current, a = g.net.avatars.values().next().value, cam = g.scene.activeCamera;
  const r = a.rig.root; r.computeWorldMatrix(true);
  const ms = a.figure.renderMeshes.filter((m) => m.isEnabled());
  const act = new Set(g.scene.getActiveMeshes().data);
  const info = ms.map((m) => { m.computeWorldMatrix(true); const bb = m.getBoundingInfo().boundingBox; return { en: m.isEnabled(), vis: m.isVisible && m.visibility > 0, active: act.has(m), inFrustum: cam.isInFrustum(m), size: bb.extendSizeWorld.length() }; });
  return { root: [r.position.x, r.position.y, r.position.z], rootEnabled: r.isEnabled(), lod: a.figure.current, n: ms.length, info };
});
assert(vis.root.every(Number.isFinite) && vis.rootEnabled && vis.n > 0 && vis.info.every((i) => i.en && i.vis && i.size > 0.1), `host avatar drawn on the client (${JSON.stringify(vis)})`);
```
- Turn the client's camera to face the host first (set `player.cam.yaw` toward `a.pos`, step 2 frames), then assert
  `vis.info.some((i) => i.inFrustum && i.active)`.
- Then the objective:
  ```js
  const objB = await GB(() => window.__app.current.hud.objectiveText);
  assert(!/Connecting to host/.test(objB), `connecting label gone once in game (${objB})`);
  ```
- Mirror check on the host page: the same `vis` read on `net.remotes.values().next().value.avatar`.

### 2. `scripts/e2e-coop.mjs`
- After `'client renders the host avatar'` (line 96-97): the same `vis` block (Infiltration).
- Replace the `assert(true, …)` at line 595 with `assert(!/Connecting to host/.test(obj) && obj.length > 0, …)`.
- After `startMode('sandbox', 'proving')` (line 602): wait for one client snapshot, then assert that
  `hud.objectiveText` on B matches `/Free roam/`. This covers the host-side seed fix.

### 3. Stalled-host regression (optional, logic only, course or coop suite)
- Stop the host pump and do not step the host.
- After 2 s of client sim, if fix 2 is taken, the client's objective reads "Waiting for host…".
- Restart the pump: the label clears and the avatar moves.
- The background-tick fix itself (a Worker) cannot be proven in headless Playwright, where pages are never occluded.
  Check it by hand with two windows, one maximised over the other.

Tier: `src/net` plus `src/core` change, so a slice runs `e2e:quick` + `e2e-ctcourse` + `e2e-coop` + `e2e-netmove`. The
GPU `vis` read (LOD0 / LOD1 on a hardware build) is pending a PC run (`E2E_GPU=1`).
