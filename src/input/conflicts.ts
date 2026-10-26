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

/** Pairs that may share an input (A3 split Y into jump and A into interact, G96). (optic-coop M2, Michael 2026-10-24
 *  "contextual: R3 pings normally and zooms only while aiming a scoped weapon (no ping while scoped)") Zoom and Ping:
 *  one press is one of them by context (`contextZoom` / `contextPing`), so the default R3 pair is not a conflict;
 *  any other verb on their input still is. */
export const ALLOWED_PAIRS: ReadonlyArray<readonly [string, string]> = [['zoom', 'ping']];

/** (optic-coop M2) Zoom on a press: only while aiming a scoped weapon (`PlayerWeapons`; normal aim never zooms, G29). */
export function contextZoom(scopedAim: boolean, zoom: boolean): boolean {
  return scopedAim && zoom;
}

/** (optic-coop M2) Ping on a press: a press that is also Zoom (their shared input, R3 by default) is Zoom only while
 *  aiming a scoped weapon, Ping otherwise. Ping on its own input (middle mouse) pings whatever the aim. */
export function contextPing(scopedAim: boolean, zoom: boolean, ping: boolean): boolean {
  return ping && !(scopedAim && zoom);
}

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
