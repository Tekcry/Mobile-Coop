/**
 * (locomotion step 18, D7) Binding conflicts (pure, unit-tested; pad and keyboard / mouse alike). Two verbs of one
 * group on the same input are a conflict unless the pair is allowed. Contextual verbs that share one input by design
 * (Y = jump + use + takedown, X = reload tap + next weapon hold while aiming, the context button, fire = shot or elbow strike) are a
 * single binding row, so they never show here. Menu actions are their own group: a menu key on a gameplay verb is
 * never a conflict. A conflict is a warning: the bindings still save.
 */

export interface Conflict {
  /** The two binding ids (in table order) and the first input they share. */
  a: string;
  b: string;
  input: string | number;
}

/** Pairs that may share an input (none: A3 split Y into jump and A into interact, G96). */
export const ALLOWED_PAIRS: ReadonlyArray<readonly [string, string]> = [];

function allowedPair(a: string, b: string, allowed: ReadonlyArray<readonly [string, string]>): boolean {
  for (const [x, y] of allowed) if ((x === a && y === b) || (x === b && y === a)) return true;
  return false;
}

/**
 * Every clashing pair once. `binds`: id -> inputs; `groups`: id -> group (missing = 'game'); ids in different groups
 * never clash.
 */
export function findConflicts(
  binds: Readonly<Record<string, readonly (string | number)[]>>,
  groups: Readonly<Record<string, string>> = {},
  allowed: ReadonlyArray<readonly [string, string]> = ALLOWED_PAIRS,
): Conflict[] {
  const ids = Object.keys(binds);
  const out: Conflict[] = [];
  for (let i = 0; i < ids.length; i++) {
    const a = ids[i]!;
    const la = binds[a]!;
    if (!la.length) continue;
    for (let j = i + 1; j < ids.length; j++) {
      const b = ids[j]!;
      if ((groups[a] ?? 'game') !== (groups[b] ?? 'game') || allowedPair(a, b, allowed)) continue;
      const shared = la.find((x) => binds[b]!.includes(x));
      if (shared !== undefined) out.push({ a, b, input: shared });
    }
  }
  return out;
}

/** The ids that are in at least one conflict (rows to mark). */
export function conflictIds(list: readonly Conflict[]): Set<string> {
  const s = new Set<string>();
  for (const c of list) {
    s.add(c.a);
    s.add(c.b);
  }
  return s;
}
