# Unreleased - sector-fixes-r2
- Sector Ops nav: a bolted team door shuts its doorway on the guards' nav grid (a runtime closure, `NavGrid.addClosure`
  / `setClosed`), so guards route round it instead of stalling at the locked door; unbolting opens it, a restart's
  re-bolt shuts it again, and guards mid-route and the flow field replan at once.
