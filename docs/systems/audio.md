# Audio
Purpose: the audio engine, voices and game wiring.
Design authority: docs/design-bible.md (Section 5.2)

## Audio and quality (the audio part)
- `app.audio` (AudioEngine), `app.sfx` (Sfx voices), `app.music`. Every voice must early-out when the
  context is missing/suspended (before the first gesture). Game wiring lives in `audio/gameAudio.ts`.
