/**
 * (G183) The build's commit, shown next to the version (pure; vite.config.ts feeds it). The checked-out folder's own
 * HEAD wins: every Pages slot build (live, dev, ct-movement, kestrel) runs in one workflow whose GITHUB_SHA is the
 * commit that triggered it (master), not the slot's branch. GITHUB_SHA is only the fallback when git is unavailable.
 */
export function pickBuildSha(gitHead: string | null, envSha: string | undefined): string {
  const head = (gitHead ?? '').trim();
  if (/^[0-9a-f]{7,40}$/i.test(head)) return head.slice(0, 7).toLowerCase();
  const env = (envSha ?? '').trim();
  if (/^[0-9a-f]{7,40}$/i.test(env)) return env.slice(0, 7).toLowerCase();
  return '';
}
