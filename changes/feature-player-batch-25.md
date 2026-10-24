# Co-op lamp guard and guard bake abort polish
kind: patch
- In co-op Sector Ops, a client's round at a lamp that reaches the host in the frame after a pause menu restart, before
  the host has noted the restart, is dropped quietly too. No wire change.
- Tools: when the offline guard bake (`scripts/operators/guard-bake.mjs`) stops a stage, the ABORT line now names the
  first lost job and its cause: a spawn error (ENOENT, EPERM, ...), exit 0xC0000142, or a quick failure with an empty
  log.
