# coop-fix - fix report (2026-10-20)

Implementer's report for the fixes in `DIAGNOSIS.md`. Nothing was compiled or run: `node_modules` is not installed
in this folder (no tsc, eslint or vitest). `node --check` passes on both edited e2e scripts. Every check below is
pending the job lead's run.

## Changes

### Bug 2: "Connecting to host…" never cleared
- `src/net/objectiveMirror.ts` (new, pure, no Babylon): `OBJ_CONNECTING`, `OBJ_WAITING`, `OBJ_STALL_S` (2 s),
  `objectiveOnSnap(shown, hostObj)` and `objectiveOnStall(shown, gotSnap, sinceSnap)`.
- `src/net/coopClient.ts:64`: the mirror `obj` starts as `OBJ_CONNECTING`, not `''`.
  - `:130-132`: the constructor shows that value.
  - The first snapshot carries `''` (course mode) or the host's text. Either one differs from the placeholder, so it
    replaces the label (`onSnap`, `objectiveOnSnap`).
- `src/net/coopHost.ts:199-200`: `hookHud` seeds `this.obj = hud.objectiveText` before wrapping the setter. Free
  Roam's objective, set in `GameState.create` before the hook, now reaches the client. `Hud` is only read; `src/ui`
  is unchanged.
- No wire change: `PROTOCOL_VERSION` is unchanged.

### Fix 3 (optional, taken): "Waiting for host…"
- `src/net/coopClient.ts:66-68, 583-589`:
  - Once a snapshot has arrived, 2 s of client sim without another shows "Waiting for host…" on the objective line.
  - It goes through the same mirror, so the next snapshot replaces it.
  - It is never shown before the first snapshot: "Connecting to host…" stays until then.
  - No `src/ui` change.

### Bug 1: a hidden host page stopped sending snapshots
- `src/core/bgTick.ts` (new, pure): `bgStepSeconds(input)` returns the seconds a tick steps. It is 0 when the page is
  visible, outside co-op, in manual mode, or within 1 s of a `stepHeadless` call. Otherwise it is the elapsed time,
  capped at 0.1 s. The tick rate is 30 Hz.
- `src/core/bgTickWorker.ts` (new): a module worker. It runs `setInterval` and posts `0` at 30 Hz. It is bundled by
  Vite through `new Worker(new URL(...), { type: 'module' })`, the same pattern as `voxel/workerPool.ts`, and uses no
  network.
- `src/core/loop.ts`:
  - `:39-44`: new fields. The input object and the bound handler are made once, so a tick allocates nothing beyond
    the browser's MessageEvent.
  - `:72-73`: `stepHeadless` records `lastExternal`.
  - `:100-153`:
    - `holdBackgroundTicks()` is counted and returns a once-only release. The next match's session can take the hold
      before the last match's dispose releases it.
    - The private `setBackgroundTicks(on)` creates or terminates the worker.
    - `bgTick()`:
      1. If the tick is off or the page is visible, it returns and leaves `lastT` alone.
      2. Otherwise it takes the elapsed time since `lastT` and sets `lastT = now`. The time is consumed even when the
         step is 0, so a held stretch is never stepped later.
      3. It calls `frame(ms, false)`.
  - `frame(intervalMs, render = true)`: the background path runs the same `beforeFrame`, accumulator, fixed steps,
    physics and `frameUpdate` as a rAF frame, and skips `scene.render()`.
  - `onFrameEnd` (the governor's and debug overlay's frame stats) is not called for ticks.
- `src/net/bgTicks.ts` (new): `keepSimInBackground(g)` returns `g.app.loop.holdBackgroundTicks()`. It does nothing
  under `?net=local`.
- `src/net/coopHost.ts:170-171` and `src/net/coopClient.ts:133-134`: the constructors push
  `keepSimInBackground(g)` onto `offs`, and `dispose()` releases it. Both ends are covered: host snapshots and client
  `pstate`s.

### Why it is safe
- Single player:
  - No worker is ever created; only `src/net` takes the hold.
  - `src/core` imports nothing from `src/net`. The new code in `src/net` reaches the loop through `g.app.loop`, and
    `src/net` is only loaded through the existing dynamic import behind `flags.coop`.
  - The rAF path is unchanged: `render` defaults to true.
- No double speed:
  - The tick steps only while `document.hidden` is true.
  - rAF and the tick share `lastT`, so any stretch of real time is fed to the accumulator once, even if a hidden page
    still got a rAF frame.
  - The accumulator, the 4-step cap and the 0.1 s cap are the same code.
- The e2e pumps:
  - Every two-page suite (e2e-coop, e2e-ctcourse, e2e-course, e2e-netmove) runs over `?net=local`. On that transport
    no hold is taken, so the worker never starts and the suites keep exactly their old timing. No script needed an
    opt-out line.
  - Second guard, if the gate is ever removed: any `stepHeadless` call stands the tick down for 1 s, and the Node
    pumps call it every 40 ms. Manual mode also stands it down.
  - The cost of the gate: the background tick is not exercised by any e2e. Headless pages are never really occluded
    anyway, so this needs the hand check below.
- The "Waiting for host…" notice: no existing e2e reads the client's objective line, so a host that the tests leave
  unstepped for a while cannot fail an old assert. The new Infiltration check polls until it is neither placeholder.

## Tests added
- `tests/coopFix.test.ts` (Vitest, node):
  - `bgStepSeconds`: hidden plus co-op steps the elapsed time; the cap; a visible page, not enabled, manual mode or a
    recent external driver give 0; zero, negative or NaN time gives 0.
  - `GameLoop.holdBackgroundTicks` hold counting. `Worker` is undefined in node, so no worker is created.
  - `objectiveOnSnap` and `objectiveOnStall`: an empty host objective replaces the placeholder; an unchanged one is
    left; the stall notice is shown once and restored by the next snapshot; the placeholder stays before the first
    snapshot.
  - Source wiring guards: `src/core` does not import `src/net`; both co-op classes take the hold; the client's
    placeholder seed and the host's HUD seed are in place.
- `scripts/e2e-coop.mjs`:
  - `:18-49`: a new `avatarDrawn(P, side)` helper. On the client it turns the camera toward the host, waits two rAF
    frames (3 s fallback), reads the result, then restores the camera's yaw and pitch.
  - `:128-134`: after "client renders the host avatar", in Infiltration, it waits up to 20 s of sim for the host
    figure LOD. It then asserts:
    - the meshes are enabled and visible with bounds above 0.1;
    - the root is enabled and its position finite;
    - at least one mesh is in the active meshes and the camera frustum;
    - the HUD objective is not "Connecting to host".
  - `:631-634`: replaces `assert(true, …)` with a poll of up to 10 s until the objective is non-empty and is neither
    placeholder, then a real assert.
  - `:642-644`: after `startMode('sandbox', 'proving')`, a poll of up to 10 s for `/Free roam/` on the client. This
    covers the host seed.
- `scripts/e2e-ctcourse.mjs`:
  - `:51-80`: the same helper.
  - `:572-583`: after "client has the course state":
    - On the client: the host avatar exists, its figure LOD is shown, it is drawn and in view, and the objective is
      not "Connecting to host". This is Marlow Yard with no objective, the real bug case.
    - On the host: the mirror check, that the client avatar is drawn (no camera turn: its rAF is stalled).
- New waits, all inside the new asserts: the `until` polls for the avatar, the LOD and the objective, and the two-rAF
  wait in the helper. No existing wait was changed.

## Run, and not run
- Run: `node --check` on the two edited e2e scripts.
- Not run, pending the job lead:
  - `npx tsc --noEmit`, eslint and `vitest run tests/coopFix.test.ts` (no `node_modules`);
  - `npm run check`;
  - the slice suites: e2e:quick, e2e-ctcourse, e2e-coop, e2e-netmove.
- Pending a hand check on the PC, over WebRTC (the live `/preview/`, not `?net=local`):
  1. Host and join with one window maximised over the other.
  2. The host's figure appears and moves on the joiner.
  3. `window.__app.current.net.avatars.size === 1`.
  4. The objective line clears.
- Pending a GPU run: the `avatarDrawn` read on LOD0 / LOD1 (`E2E_GPU=1`).

## Open
- Pad input on a hidden host page is not read: Chromium gives a hidden page no gamepad data. The host's character
  only keeps its last input while covered. This is expected and out of scope.
- If the new frustum assert fails in e2e-ctcourse because the course's active camera is not the player camera at
  that point, drop that one assert. The drawn assert is the bug check.

## Fix round (job lead, after CHECK.md)
- CHECK.md item 1: the background-tick opt-out keys on `navigator.webdriver` (automated browsers, the e2e pumps), not
  on `?net=local`, so two-tab `?net=local` play (one tab always hidden) gets the fix too. Hand checks: a `?net=local`
  two-tab run with the host tab in the background, and a WebRTC run with one window over the other.

## Bug 1 root cause and fix

**Cause.** At gfx high and epic (GPU) the host was invisible on the joiner. `BakedLamps` (`src/world/bakedLamps.ts`)
attaches a `LampPlugin` to every PBR material in the scene, including the shared figure asset materials. A figure loaded
later clones its glow material (`src/operators/runtime/figure.ts:488`). `Material.clone` copies plugins by serialising
them and rebuilding by class name (`Tools.Instantiate("BABYLON.LampPlugin")`). `LampPlugin` is not registered with
Babylon, so the rebuild threw ("reading 'LampPlugin'"), and the whole partner figure load aborted ("[operators] Wren
failed to load"). No figure, nothing drawn. Lower presets never hit it: the lamp plugin is not attached before the
figure's materials are cloned there.

**Evidence.** `scripts/repro-coop-avatar.mjs` (the real menu flow, two pages, GPU) at gfx high showed the console error
and a host avatar with no meshes on the joiner. With the fix, the same run shows the host drawn and no errors
(`docs/coop-fix/DIAGNOSIS-2.md`).

**Fix.** `LampPlugin`'s constructor sets `this.doNotSerialize = true`. A cloned material carries no lamp plugin; the clone
is a new material in the scene, so `BakedLamps.frame` sees the material count change and attaches its own plugin.

**Tests.**
- `tests/lampPluginClone.test.ts` (NullEngine, runs in node): a PBR material with a `LampPlugin` clones without
  throwing, `doNotSerialize` is true, and the clone has no `BakedLamps` plugin.
- `scripts/e2e-coop-gpu.mjs` (GPU list, `npm run e2e:gpu`, `E2E_GPU=1`, port 4189), a GPU suite from the repro: menu
  flow at High (shared and separate contexts) and Epic (shared; `COOPGPU_ALL=1` adds separate). Fails on a "failed to
  load" console message, a host avatar with no meshes or no LOD shown, the host not drawn on the joiner (meshes enabled,
  visible, active, body bounds over 0.5 m), or "Connecting to host" still shown. Not run here (the GPU belongs to
  Michael's PC); `node --check` passes.

**Clone-path survey** (`src/`, outside the editor): the `doNotSerialize` fix covers every material clone; no path needs more.

| Path | Meets a material with a LampPlugin? |
| --- | --- |
| `operators/runtime/figure.ts:488` `materials[glow].clone()` | Yes, this was the bug. Covered by the fix. |
| `operators/runtime/figure.ts:230` `glowBase.clone()` | No, a `Color3`. |
| `operators/lab/lab.ts:437` `m.clone(..., wireSolid)` and `:761` `body.clone('silhouette')` | Mesh clones: the material is shared, not cloned or serialised; the lab scene has no `BakedLamps`. Dev lab only. |
| `voxel/voxelBody.ts:112` | A `Matrix` clone. |
| `vfx/vfx.ts` `createInstance` | Instances share the base material; no serialisation. |
| Guards (`ai/`), weapons, props, gadgets, `ui/screens/photoMode.ts`, menu hero (`world/menuScene.ts`) | Only `Vector3` / `Quaternion` clones. No material clone, `serialize`, `SerializationHelper`, `instantiateModelsToScene` or asset-container instantiate anywhere in `src/`. |

Any future material clone is covered by the same flag.

## GPU suite run (job lead, desktop, E2E_GPU=1, port 4189)
- shared/high and shared/epic: every check ok (host drawn on the joiner at LOD 1, body 1.0 m, no load error, label
  cleared). Before the fix the same flow logged "Wren failed to load ... LampPlugin" and the joiner's host had no meshes.
- separate/high: the first page load was refused (ERR_CONNECTION_REFUSED) twice, also run alone, though the repro's
  separate variant passed earlier; not diagnosed. Two-context variants are opt-in (`COOPGPU_ALL=1`). Open item.
