# Campus greybox: per-section v2 switch
kind: patch
- No player-visible change: Saltmarsh Park plays exactly as before.
- Sector Ops build plumbing for the signed-off S1-S5 re-plans: each campus section can now be built from a new,
  separate layout that stays off by default (`flags.campusV2`, `?campusv2=1,3` for test builds), so the five sections can be
  rebuilt in parallel and switched on one by one after each walk. The new layouts start as exact copies of today's.
