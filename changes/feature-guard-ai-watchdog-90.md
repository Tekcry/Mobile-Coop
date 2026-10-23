# Guard body compile cap 90 s
kind: patch
- Guard bodies: the last-resort cap for a body shader still compiling is now 90 s (was 45 s), so the bigger lighting shaders are never restarted while still compiling with several browsers at once.
