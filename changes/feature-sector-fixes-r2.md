# Unreleased - sector-fixes-r2
- Sector Ops nav: a bolted team door shuts its doorway on the guards' nav grid (a runtime closure, `NavGrid.addClosure`
  / `setClosed`), so guards route round it instead of stalling at the locked door; unbolting opens it, a restart's
  re-bolt shuts it again, and guards mid-route and the flow field replan at once.
- Sector Ops team doors: "Unbolt" now reaches only across the door itself (half its width + 0.3 m, up to 1.2 m out),
  so the S1 mess back door can no longer be unbolted through the wall from the corridor; host and client prompts agree.
