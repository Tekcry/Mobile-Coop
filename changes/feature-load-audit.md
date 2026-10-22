# Load audit
kind: patch
- Tests: load-only e2e failures fixed without weaker limits (load audit on 4.61.0 at E2E_JOBS=5, plus a static scan):
  every page of an e2e context (and smoke's own) gets the 120 s navigation default; e2e-desktop's crash step waits for
  the crash and closes the dead page before the crash-log page (it hung under load), with 60 s menu waits; e2e-move's
  sideways pace is measured over a game-time window; e2e-coop's client grab latches on the client's match clock with a
  per-frame host pin; e2e-mouse waits for frame-applied yaw, weapon swap and pace; e2e-ctcourse times its jam / lamp
  windows on the host clock (`waitHostSim`).
