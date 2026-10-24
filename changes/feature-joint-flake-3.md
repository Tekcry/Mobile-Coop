# Co-op interrogation read under host load
kind: patch
- Fix: co-op: a client's interrogation read is no longer lost when the host frame rate dips. The host counted the end
  only when one of its frames caught the read's last 0.3 s; it now counts any seen read whose bit drops while the hold
  goes on, and forgets it when the hold ends (the e2e-coop joint interrogation flake at x0.3 host speed).
- Tests: `interrogationEnded` cases for a read whose tail fell between host frames (ph 0.4 straight to the bit dropped).
