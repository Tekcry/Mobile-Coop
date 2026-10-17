# Step 20 - bot partner (DROPPED)

Dropped (M12, Michael 2026-10-15). Nothing was built: no `src/net/bot/`, no `scripts/e2e-bot.mjs`, no `window.__bot`,
no debug-overlay "Add bot" button. Co-op is tested with the two-page `?net=local` e2e suites (e2e-netmove, e2e-coop),
anim-audit remote rows and two browser tabs by hand.

What it would have done, and where each piece went:
- Bot as a real client in a second page (A8): A8 is void.
- Scripted follow / stack / team moves / verbs over a dev BroadcastChannel: e2e-netmove and e2e-coop already script a
  second page (page B's inputs and window hooks); every team move and verb is exercised there (M12 replaces D8's
  "the bot partner exercises every team move and verb").
- e2e-bot suite (host view of the bot posed from MoveState < 10 cm): e2e-netmove cases (same 10 cm limit).
- Rerun of the "rerun after 20" checks: moved to the Block C end as two-page cases; list in STATE.md
  ("Block C end: former step 20 reruns (M12)").
- Carried items from step 08 (remote stance / weapon settle vs the owner's curve at t - lag; paired-move alignment
  palm vs ball-of-foot on both pages; harness remote runtime and 120 Hz jitter probe): step 30 (co-op batch).
- Bot command rows added by later steps (27 `drag`, 30 stack / pass-by): those steps add two-page e2e-netmove /
  e2e-coop cases instead.
- 4-player run (bot pages): step 30, as a 4-page `?net=local` e2e-coop case.
- Play check "with the bot partner" (D11 item 4): two browser tabs on one PC (`?net=local`), pad in the host tab.
- Bible 5.9 C20 and the Phase 3b row: proposal in BIBLE-PROPOSALS.md (M12).
