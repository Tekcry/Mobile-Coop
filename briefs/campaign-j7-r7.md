status: done feature/mission-rules-r7 1fded85e8317c485d2ae3942818e9c62c5fe74f5

# campaign J7 R7: PR E e2e asserts (Sonnet 5.5 or Opus)

Base: origin/feature/mission-rules-net 09975841c (PR D + R4 two-player campaign start + R5 campaign revives). New
branch: feature/mission-rules-r7 (cut from that sha). Read docs/systems/agent-preamble.md (origin/master) first.
Only file: scripts/e2e-sectorops-wharf.mjs. Read the whole suite first and reuse its hooks (kill / damage, intel,
host / client pages, lobby).

## What to add (J7 plan, slice R7; the plan text is below, use it exactly)
(TGC W2, in this order) a knock-out of decoy Fenn (W2:7) changes no `ruleRestarts` and no `breaks`; a host knock-out of
Teale (W2:6) before tgc-3 -> SECTION RESTART, W2 restarts (`mission.ruleRestarts` +1, `breaks` still 0, `spook` -1, the
"man you need is down" line, tgc-3 open), Teale (alive, not knocked out) back at his reading-room table, more than 5 m
from the bolt point, and the mission row still the reading-room line; then, after the restart hold, a host kill of
Teale (through the suite's existing kill or damage hook on his Enemy id) -> RULE BROKEN, W2 restarts (`breaks` 1, the
"Named target broken" line, `spook` = tgc-3's index, tgc-3 open), Teale (alive) stands within 1 m of the bolt point
[65, 4.5, 76.75], and the mission row on host and client reads "Take the grey coat with the black umbrella in the
clock-mender's back loft"; then a decoy read of Garrow (W2:8, through the suite's interrogation hook or
`__mission.intel` with his Enemy id) -> RULE BROKEN again (`breaks` 2), Teale still within 1 m of the bolt point, the
moved line unchanged on both pages; (both TGC and TKL) no live guard of kind `dog`; the host alone (before the client
joins) cannot start: `session.startMatch()` returns null, `session.phase === 'lobby'`, the Start button shows the
blocked text, and the match then starts on its own once the client is in (the rest of the suite runs on it) - if the
current lobby code does not auto-start once the client is in, make the client ready / host press Start through the
suite's existing lobby helpers instead and say so in the report; `net.revivesLeft()` is 2 with the lobby on Realistic;
the W3 banner on TGC does not contain "ledger".
A knock-out is not a kill: the engine's kill test is `!alive && !ko`. Read the real field names from src (the mission
runner, coopHost, session) before writing asserts; never guess a name. Waits: use the suite's existing wait helpers
with their timeouts; no fixed sleeps.

## Checks (cloud)
`node --check scripts/e2e-sectorops-wharf.mjs`; `npm run typecheck:fast`. The e2e itself is pending PC run (the lead
requests e2e-sectorops:wharf-tgc and :wharf-tkl on the laptop queue).

## Done
Push feature/mission-rules-r7 (commits "mission-rules R7: ...", Co-Authored-By trailer); report (asserts added with
line numbers, any hook you had to choose, deviations) at the end of this brief. Never push to feature/mission-rules-net.

## Report
Built by Night Shift | Cloud Builder 2. Branch `feature/mission-rules-r7` (cut from 09975841c), one commit 1fded85e8317c485d2ae3942818e9c62c5fe74f5, only `scripts/e2e-sectorops-wharf.mjs` (+150 / -20).

Added (line numbers at 1fded85e):
- :24-31 constants copied from src: `TWO_PLAYERS` (= `CAMPAIGN_TWO_PLAYERS`, campaign.ts:33), `PROTECTED_LINE` (missionText.ts:29), `NAMED_LINE` (`breakLine` of the `namedTarget` rule: "Named target broken. Back to the section checkpoint."), `READING_LINE` / `MOVED_LINE` (tgc-3 `text` / `boltText`, tallowWharfMissions.ts:69 / :79).
- :45-52 `join()`, both missions, before the client opens: host `session.setSettings('sector', 'tallowWharf', 'realistic', '')`; `session.startMatch()` returns null, `session.phase === 'lobby'`, `players.size === 1`; the Start button `.lobby-actions .btn[data-key="start"]` has class `blocked` and `data-locked` = "Campaign missions need exactly two players" (coopUi.ts `buildActions`, widgets.ts `button`).
- :338-353 the start (replaces `startMode`): if the room is still `lobby`, client `setReady(true)`, wait `allReady && campaignBlock === null`, host `startMatch()` (asserted non-null, mode sector, map tallowWharf, difficulty realistic); then startMode's own waits (match on both pages, client state, damageMul 0); `window.__app.current.net.revivesLeft() === 2` with `session.difficulty === 'realistic'` (CoopHost.revivesLeft, coopHost.ts:874).
- :360-364 host banner recorder: `g.hud.banner` wrapped, `window.__banners` holds [title, sub].
- :266-304 helpers: `noDogs` (`enemyMgr.enemies`, `e.alive && e.def.kind === 'dog'`), called at each mission start (:369) and in `cross()` after each section change (:266); `down(k, ko, who)` (slotEnemy[k].id -> `enemyMgr.enemies.find(id)` -> the TKL hook `applyDamage({... part 'head', kind 'bullet', attackerId 'local', nonLethal: ko })`, then waits `!alive && ko === ko`); `bannerCount`; `rowIs` (`.mission-hud .mh-row[data-step=<tgc-3 index>] .mh-text` on host and client); `guardAt`; `holdOver` (`!__mission.holding && !__mission.tracker.held`).
- :306-310 `restarted(i, cp, what, n = 1)`: waits `__sector.debug().restarts === n`, asserts `mission.ruleRestarts === n` (TKL calls unchanged, n 1).
- :414-476 TGC W2, in the brief's order (replaces the old Fenn decoy read):
  - Fenn (W2:7) knocked out: after `sim(1000)`, `restarts` 0, `mission.ruleRestarts` 0, `breaks` 0, `protectedRestarts` 0, `pending` false.
  - Teale (W2:6) knocked out: `protectedRestarts` 1, `line === PROTECTED_LINE`, `breaks` 0, `spook` -1, one SECTION RESTART banner with that line; restart (restarts / ruleRestarts 1, both players at the W1 connector checkpoint); `runner.isOpen(tgc-3)`; Teale alive, `!ko`, within 1.5 m of his slot (map `sectors[1].guards[6]` x / z) and > 5 m from the bolt point; the tgc-3 row reads the reading-room line on host and client.
  - after `holdOver`, Teale killed: `breaks` 1, `line === NAMED_LINE`, `spook` = tgc-3 index (`runner.stepIndex('tgc-3')`), one RULE BROKEN banner; restart (2); tgc-3 open; Teale alive and within 1 m (x / z, as the old assert) of `def.steps[tgc-3].bolt` [65, 4.5, 76.75]; the row reads the moved line on host and client.
  - after `holdOver`, Garrow (W2:8) read through the suite's `interrogate(8)` (`intel` event with his Enemy id): `breaks` 2, `NAMED_LINE`, `spook` tgc-3, a second RULE BROKEN banner; restart (3); Teale still within 1 m of the bolt point; moved line unchanged on both pages; tgc-3 not done, `tgc-courier` kept.
  - after `holdOver`, Teale asked: tgc-3 done, `tgc-chest`, `breaks` 2 (was 1).
- :483-487 TGC W3: the `SECTION 3` banner's title + sub do not contain "ledger" (case-insensitive).

Real field names and sources: `__sector.debug()` `restarts`, `index`, `phase`, `mission` (sectorMode.ts:1409-1443); `mission.breaks`, `protectedRestarts`, `line`, `ruleRestarts`, `pending`, `spook` (`SectorMission.debug`, sectorMission.ts:520-536); `SectorMission.holding`, `tracker.held` (ruleTracker.ts `held`), `runner.stepIndex`, `runner.isOpen` (missionRunner.ts); `Enemy.id`, `alive`, `ko`, `def.kind`, `applyDamage` / `nonLethal` (enemy.ts, damage.ts); `NetSession.startMatch`, `phase`, `allReady`, `campaignBlock`, `difficulty`, `setSettings` (session.ts); the protected / kill split `!alive && !ko` (sectorMission.ts `protectedCheck`).

Checks run: `node --check scripts/e2e-sectorops-wharf.mjs` OK; `npm run typecheck:fast` clean (after `npm ci`). eslint ignores scripts/ (ignore pattern). The e2e is pending PC run: e2e-sectorops:wharf-tgc and :wharf-tkl on the laptop queue.

Lobby on this base vs fix1: on 09975841c a room made with "Host a room" never starts on its own once the client is in (only `autoLocalCourse` and "Resume hosting" do anything automatic), so the suite takes the brief's fallback: client ready, host `startMatch()` (startMode's steps, kept on Realistic because `startMode` sets Normal). With `feature/mission-rules-net-fix1` (505fc066) this is the same: `startWhenUnblocked` is armed only in the "Resume hosting" path of `connect()`, not for a fresh hosted room, so the fallback still runs there. The start is guarded by `phase === 'lobby'`, so if a later lobby does auto-start, the suite logs it and runs on that match instead.

Deviations:
- The old TGC W2 block (Fenn decoy read -> breaks 1, then Teale asked with breaks 1) is replaced by the R7 sequence; the decoy read is now Garrow's and the final Teale ask expects breaks 2. Fenn's read had to go: with it first, spook is set before the Teale knock-out and "spook -1" could not hold.
- `startMode` is no longer imported; its steps are inlined so the lobby stays on Realistic.
- The section table (`SEC`) is now read after the match starts (:212, :366). Before, it was read outside the `try` while the pages were still in the lobby, where `window.__app.current` is null, so the suite would have failed at setup.
- "Teale back at his reading-room table" is checked as within 1.5 m of his W2:6 slot point (51, 75.4): the brief gives no tolerance.
- The PLAN STATE note "client banner for the Teale knock-out restart (R7 e2e checks it)" is not in the brief; not asserted (the SECTION RESTART banner is checked on the host only).
- Short non-event wait for the Fenn knock-out uses the suite's `sim(1000)` (waitSim); every other wait is `until` with a timeout.
