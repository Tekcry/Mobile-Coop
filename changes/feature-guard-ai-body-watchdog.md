# Guard body compile watchdog
kind: patch
- Guard bodies: a slow body shader compile is left to finish (the watchdog recovers only a timed-out, failed or disposed compile, or one still unready after 45 s), and a recompile no longer flags the new body shader disposed (e2e-lightbake's console warnings on big Epic shaders).
