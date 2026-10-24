# AI6 e2e-coop failure triage (laptop run on 1b04e5bd)

Run: `C:/NightShift/scratch/laptop-queue/runs/20261024T083207-night-shift-guard-ai-1b04e5bd-0c2d/4189.log` (e2e-coop,
lines 1035-1049) and `rerun-e2e_coop.log`: identical. AI6 setup asserts pass; (1) and (3) time out on
"AI6: the host sees page 3 at -15.75, -24.75", (2) is skipped because (1) left no slot for B.

## Root cause: a test bug in the AI6 block (never run before this merge)

`scripts/e2e-coop.mjs:2378`, the client branch of `teleP`:

```js
await until(HA, ([id, x, z]) => { const r = window.__app.current.net.remotes.get(id); return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.speed < 0.15; }, ...);
```

`net.remotes` holds `RemotePlayer` objects (`src/net/coopHost.ts:146`, set at `:443`). `RemotePlayer` has no `speed`
member: the speed lives on its `TeamRef`, `r.ref.speed` (`src/net/remotePlayer.ts:80` creates it, `:144` writes it in
`accept`). `r.speed` is `undefined`, `undefined < 0.15` is `false`, so the wait can never pass for any client page and
always times out at 15 s. The first `teleP` on a client is D (`teleP(3, dHide)`, line 2458), hence "page 3" in both (1)
and (3); the position itself is fine.

The S23 / S24 / S26 blocks that the AI6 block copied (`e2e-coop.mjs:1282, 1432, 1611`) read `r.speed` on
`g.remotePlayers()[0]`, which returns the refs (`coopHost.ts:249`, `remoteRefs`), where `speed` exists. AI6 switched the
lookup to `net.remotes.get(id)` (needed to pick a page by id) and kept `r.speed`.

Why it showed up only now: the AI6 block (e7f0523b, `docs/coop4/checks/e2eai-build.md`) was written blind and guards
blocks (1)-(3) behind the guard-ai #319 hooks `em.coop4` / `em.intruders.find`. Before the merge `afc616f0` has no
`em.coop4()` (git grep: absent), so every earlier coop4 run printed SKIP for (1)-(3). The master merge 1b04e5bd brought
#319 (`src/ai/enemyManager.ts:2831 coop4()`), so (1)-(3) ran for the first time. No merge-port or master code is
involved: `RemotePlayer` never had `speed` (same on `afc616f0` and `origin/master`), and the remote position path
(`accept`, `teleportGrace`, `allowTeleport(3)`) is unchanged in behaviour for this case.

Not a product bug. Side: the test (coop4's own AI6 block).

## Proposed fix (not committed)

```diff
--- a/scripts/e2e-coop.mjs
+++ b/scripts/e2e-coop.mjs
@@ -2375,7 +2375,7 @@
         await GH(() => { for (const r of window.__app.current.net.remotes.values()) r.allowTeleport(3); });
         await P4[i].evaluate(tp, [x, y, z, yaw]);
-        await until(HA, ([id, x, z]) => { const r = window.__app.current.net.remotes.get(id); return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.speed < 0.15; }, [ids4[i], x, z], 15000, `AI6: the host sees page ${i} at ${f2(x)}, ${f2(z)}`);
+        await until(HA, ([id, x, z]) => { const r = window.__app.current.net.remotes.get(id); return !!r && Math.hypot(r.feet.x - x, r.feet.z - z) < 0.6 && r.ref.speed < 0.15; }, [ids4[i], x, z], 15000, `AI6: the host sees page ${i} at ${f2(x)}, ${f2(z)}`);
```

One line, scripts only. No other `net.remotes` read in the block uses a ref-only field (checked: `state`, `feet`,
`held`, `damageMul`, `allowTeleport` all exist on `RemotePlayer`).

## Risk

- The fix itself: none for the game (test script only); a laptop result on it still counts for the same src.
- Unmasking: (1)-(3) have never run past this wait. The build note lists blind first-run risks that this fix exposes next:
  room-3 / yard-lane hide spots, pad steering of C in (3), `seesIndex` slot vs list index, guards reaching `alert` by
  sight within 10 s (the block falls back to `e.alert()` by hand). One more to watch: (1)'s `minKnown` reads
  `e.knownPt` (`src/ai/enemy.ts:362`, a fixed `[0, 0]` array kept after the hunt), so it can carry a stale point; the
  rooms are 9 m+ from the origin, so a default `[0, 0]` does not trip the 3 m bound. Expect a possible second, different
  failure in (1)-(3); it would be a new first-run issue, not this one.
- Run time: (1)-(3) now add their full time to e2e-coop (233 s today with two 15 s timeouts); watch the 600 s suite cap.

## Reruns

- `e2e-coop` (the failing suite) on the fixed commit, `E2E_GPU=1`.
- `e2e-sectorops:8`: this run had parts 1-6 only. Part 8's AI6 legs (4)-(6) were also SKIP-guarded before the merge and
  now run for the first time (same blind-written origin; this note did not check them).
