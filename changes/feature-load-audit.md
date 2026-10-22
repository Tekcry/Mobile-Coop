# Load audit
kind: patch
- Tests: load-only e2e failures fixed without weaker limits (load audit on 4.61.0 at E2E_JOBS=5, plus a static scan):
  every page of an e2e context (and smoke's own) gets the 120 s navigation default; e2e-desktop's crash step waits for
  the crash and closes the dead page before the crash-log page (it hung under load), with 60 s menu waits; e2e-move's
  sideways pace is measured over a game-time window (pace and end speed both over 2.15 m/s); e2e-coop's client grab latches on the client's match clock (4.5 s) with a
  per-frame host pin (the teleport window granted once per attempt, a generation token and try/finally end each
  attempt's pin); e2e-coop's client takedown lets the host settle on its match clock before a retry (a late knock-out
  no longer overwrites the start); e2e-mouse waits for frame-applied yaw, weapon swap and pace; e2e-ctcourse times its jam / lamp
  windows on the host clock (`waitHostSim`, which returns the elapsed game time, asserted at every call), station 3's
  camera freeze latched over 800 ms of each page's own clock with the host's jam still on at the client's last read,
  the lamp-off window latching both pages, and up to 3 re-jams when too little jam is left.
