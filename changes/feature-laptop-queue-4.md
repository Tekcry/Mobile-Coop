# Laptop queue: dead-pid heavy.lock broken at the desktop gate, "CI running" in the auto-train status
kind: patch

### Changed
- Laptop queue: the desktop slot gate logs the slot lock's holder once per change ("4191 held by heavy.lock: <text>") and breaks a lock whose pid is dead on this host when its text is unchanged on a second read (logged; a lock with no pid or a live pid is respected). A train's slot-lock wait breaks such a lock too.
- Auto train: the status and log say "CI running" (was "CI missing" or "CI pending") while a CI run for the head has no conclusion yet; "CI missing" only when the head has no CI run or check at all.
