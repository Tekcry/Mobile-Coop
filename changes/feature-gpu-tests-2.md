# GPU test fixes 2
kind: patch
- Tests: e2e-studio's reads of the tuner panel's effect mode and Keys readout wait 300 ms of wall time first (the
  panel refreshes them every 250 / 100 ms; a few frames on a hardware GPU pass in ~50 ms), so the suite no longer
  fails at a shifting spot (:755, :854) on the GPU. Software GL is unchanged apart from the waits (~3.3 s total).
