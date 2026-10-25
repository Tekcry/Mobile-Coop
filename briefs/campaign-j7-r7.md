status: claimed Night Shift | Cloud Builder 2 2026-10-25T23:16:20+11:00

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
