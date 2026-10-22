# lightField allocation check holds under load
kind: patch
- Tests only: the shared allocation helper (`tests/helpers/allocPerCall.ts`) tiers code up synchronously
  (`--no-concurrent-recompilation`, `--no-concurrent-osr`), so every heap check reads the optimized code on any machine
  instead of whatever tier a starved background compiler had reached. lightField "allocation-free under a loop" now
  reads levelAt 32.0, bodyLevel 64.8 (was 100-127 B in Sparkplug against its 128 B limit), control 272.0 B every run;
  same asserts and limits. `ALLOC_TRACE=1` logs each round with its optimization tier.
