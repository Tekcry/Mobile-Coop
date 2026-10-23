# dual-reward (spare 12) - brief and assumed decisions
Source: C:/NightShift/scratch/ctcore/briefs/spare-12-dual-reward.md (base origin/master 8e5dbd83). Decision 12: "co-op synced takedowns reward more than shooting". The reward itself (score, stars, unlocks) is section-rating's; this job gives it a counted, evented input.

## Assumed decisions
- A1 "Synced takedown" = the existing dual takedown (two players' finished takedowns within DUAL_WINDOW 1.5 s, host-judged). No new move, no new window. Undo: none (definition only).
- A2 No new immediate reward; the banner stays. Section-rating reads `StealthRating.duals` and the `dualTakedown` event. Undo: n/a.
- A3 A dual takedown no longer records an extra `takedownNonLethal` (it inflated `style.knockouts`, also when the takedowns were kills); it records `dualTakedown`. Undo: put back `this.g.style.record('takedownNonLethal', ...)` in `CoopHost.takedownDone`.
- A4 Host only: count and event live on the host; the client keeps the banner it gets today. Undo: n/a.

No wire change (PROTOCOL_VERSION stays 31), no save change, no src/ai change.
