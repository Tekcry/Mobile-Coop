// The train-ready rule (F16, #460 missed train 103): the rule's owner is docs/RULES.md "Getting to master"; watchdog
// and auto-train both apply it from here (watchdog: `labelReady`, the label it adds; auto-train: unlabelled PRs that
// meet it on their head). Pure, no imports: tests/trainReady.test.ts. A PR here is flat: { branch, draft, mergeable,
// labels: [name], check: 'success' | 'failure' | 'pending' | 'missing', statuses: { [context]: { state, description } } }.

export const LABEL = 'train-ready';
export const CHECKER_CONTEXT = 'checker';
export const AFFECTED_CONTEXT = 'affected-e2e'; // also the requester of the laptop service's auto affected requests (#356)
export const NO_AFFECTED_LABEL = 'no-affected-e2e';

export const isTrain = (branch) => /^train\/\d+$/.test(String(branch ?? ''));

/**
 * The commit statuses of a head's rollup (GraphQL `contexts.nodes`, or gh's `statusCheckRollup`): the newest
 * StatusContext per context (createdAt; gh names it startedAt) -> { [context]: { state, description, at } }, error ->
 * failure, expected -> pending. CheckRuns are not statuses (CI `check` is read with ciState).
 */
export function statusesFromRollup(rollup) {
  const statuses = {};
  for (const s of rollup ?? []) {
    if (s?.__typename !== 'StatusContext') continue;
    const at = Date.parse(s.createdAt || s.startedAt || '') || 0;
    if (statuses[s.context] && statuses[s.context].at > at) continue;
    const st = String(s.state).toLowerCase();
    statuses[s.context] = { state: st === 'error' ? 'failure' : st === 'expected' ? 'pending' : st, description: s.description ?? '', at };
  }
  return statuses;
}

const statusOf = (pr, ctx) => pr.statuses?.[ctx]?.state ?? 'missing';

/**
 * Whether a PR is train-ready on its current head (CI `check` + `checker` + `affected-e2e` success; the
 * `no-affected-e2e` label waives a missing `affected-e2e`) -> { ready, why, affectedMissing }.
 */
export function trainReady(pr, { requireAffected = true } = {}) {
  const no = (why, affectedMissing = false) => ({ ready: false, why, affectedMissing });
  if (isTrain(pr.branch)) return no('train PR');
  if (pr.draft) return no('draft');
  if (pr.mergeable === 'CONFLICTING') return no('conflicting');
  if (pr.check !== 'success') return no(`check ${pr.check}`);
  const checker = statusOf(pr, CHECKER_CONTEXT);
  if (checker !== 'success') return no(`${CHECKER_CONTEXT} ${checker}`);
  const aff = statusOf(pr, AFFECTED_CONTEXT);
  const waived = aff === 'missing' && !!pr.labels?.includes(NO_AFFECTED_LABEL);
  if (aff === 'missing' && requireAffected && !waived) return no(`${AFFECTED_CONTEXT} unavailable`, true);
  if (aff !== 'missing' && aff !== 'success') return no(`${AFFECTED_CONTEXT} ${aff}`);
  const desc = pr.statuses[CHECKER_CONTEXT].description;
  const affWhy = aff === 'success' ? `, ${AFFECTED_CONTEXT} success` : waived ? `, ${AFFECTED_CONTEXT} waived (${NO_AFFECTED_LABEL})` : '';
  return { ready: true, why: `check green, ${CHECKER_CONTEXT} success${desc ? ` (${desc})` : ''}${affWhy}` };
}

/**
 * An unlabelled PR that lost `train-ready` on its current head stays out (a drop, a left-out, a watchdog unlabel or a
 * human hold), until a new head: true when the label was removed (`unlabeledAt`, ms; null = never) at or after the
 * head was pushed (`headPushedAt`, ms; null = unknown: held, to be safe).
 */
export function heldOff({ unlabeledAt = null, headPushedAt = null } = {}) {
  if (unlabeledAt == null) return false;
  if (headPushedAt == null) return true;
  return unlabeledAt >= headPushedAt;
}
