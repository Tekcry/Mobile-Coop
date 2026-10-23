# Hostage gait below 60 fps
kind: patch
- Co-op (host): a joiner's hostage no longer flickers his gait below 60 fps. The host placed him from the joiner's
  drawn body, which moves once per frame, while `holdAt` runs per fixed step (one step saw the whole move, the next
  none). The point now goes through `src/net/holdFeed.ts` (velocity from distinct drawn poses, predicted to each step,
  eased): his speed holds within 1% at 30 / 45 / 60 fps (was 14-15% CV with real frame jitter, and 21% slow at 30 fps);
  a stopped holder stops him within 0.1 s; a jump over 1 m snaps with no speed spike (was 42-64 m/s).
