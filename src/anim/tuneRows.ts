/**
 * (marlow-bays T1a, COVERAGE gap 3) The tuner rows that used to be shared (pure, no imports: the registry's load and
 * import, the presets and the tests read it). A state that played through another state's row has its own row now:
 * crouch run (was crouch walk), aim standing still (was aim, the glides keep `aim`), crouched aim moving (was crouched
 * aim, which is now the still one), the crouched wall states (were the standing ones) and carrying a body (was the
 * hostage hold, `hold`). The armed states have a Joints row per gun too (`joint.rifle.<state>`, `joint.pistol.<state>`;
 * `joint.<state>` stays for the knife, the launcher and no weapon).
 *
 * Migration: a saved value, a preset or an export made before these rows (store / file version 1) gives each new row
 * the value of the row it shared, unless the new row has its own, so nothing tuned is lost and every state looks as it
 * did. A version 2 record is taken as saved (a new row reset on purpose stays reset).
 */

/** New body state -> the body state whose row it shared. */
export const BODY_ROW_FROM: Readonly<Record<string, string>> = {
  crouchRun: 'crouchWalk',
  aimStill: 'aim',
  aimCrouchMove: 'aimCrouch',
  wallCrouchIdle: 'wallIdle',
  wallCrouchSlide: 'wallSlide',
  wallCrouchPeek: 'wallPeek',
  carry: 'hold',
};

/** The armed states with a Joints row per gun, and the guns. */
export const ARMED_JOINT_STATES = ['lowReady', 'aimStill', 'aim', 'aimCrouch', 'aimCrouchMove'] as const;
export const JOINT_GUNS = ['rifle', 'pistol'] as const;
/** The per-gun Joints rows (`<gun>.<state>`), after the body states in the Joints table. */
export const JOINT_WEAPON_ROWS: readonly string[] = JOINT_GUNS.flatMap((w) => ARMED_JOINT_STATES.map((s) => `${w}.${s}`));
/** The weapons of the Hands & feet and Weapon rows (tuneHands HAND_WEAPONS; a test keeps them equal). */
export const ROW_WEAPONS = ['none', 'rifle', 'pistol', 'launcher', 'knife'] as const;

/** Every (new group, old group) pair, in the order they are applied (a new row first takes its body row's value). */
export const ROW_ALIASES: readonly (readonly [string, string])[] = (() => {
  const out: [string, string][] = [];
  for (const [n, o] of Object.entries(BODY_ROW_FROM)) {
    out.push([n, o]);
    out.push([`joint.${n}`, `joint.${o}`]);
    out.push([`ik.${n}`, `ik.${o}`]);
    for (const w of ROW_WEAPONS) {
      out.push([`hand.${w}.${n}`, `hand.${w}.${o}`]);
      out.push([`weapon.${w}.${n}`, `weapon.${w}.${o}`]);
    }
  }
  for (const w of JOINT_GUNS) for (const s of ARMED_JOINT_STATES) out.push([`joint.${w}.${s}`, `joint.${s}`]);
  return out;
})();

/** The version of a tuner record that has these rows (the store's snapshot, the presets file, the export). */
export const TUNE_ROWS_VERSION = 2;

type ValueMap = Record<string, Record<string, number>>;

/**
 * An old record's values (group -> slider -> value) with the new rows filled from the rows they shared, where the new
 * row has no value of its own. Returns a new map; `values` is untouched.
 */
export function migrateTuneRows(values: Readonly<Record<string, Readonly<Record<string, number>>>>): ValueMap {
  const out: ValueMap = {};
  for (const [g, v] of Object.entries(values)) if (v && typeof v === 'object' && g !== '__proto__' && g !== 'constructor' && g !== 'prototype') out[g] = { ...v };
  for (const [n, o] of ROW_ALIASES) if (out[o] && !out[n]) out[n] = { ...out[o]! };
  return out;
}

/** The same for an export's `changed` list (entries with `group`): the new rows' entries added after the list. */
export function migrateTuneChanged<T extends { group: string }>(changed: readonly T[]): T[] {
  const out = changed.slice();
  const has = new Set(changed.map((c) => c.group));
  for (const [n, o] of ROW_ALIASES) {
    if (has.has(n)) continue;
    const src = out.filter((c) => c.group === o);
    if (!src.length) continue;
    for (const c of src) out.push({ ...c, group: n });
    has.add(n);
  }
  return out;
}

/**
 * (anim-natural N3) Sliders that were split into several: (group, old id, new ids). An old record's value goes to every
 * new id that has no value of its own, at any record version (Michael's saved tuning and exports keep working). Applied
 * by the registry's load and import, the presets, the baked-reset plan and the bake script.
 * - Clip speed's single holster row (4.53.0) is one row per gun: rifle and pistol holster.
 */
export const ID_ALIASES: readonly (readonly [string, string, readonly string[]])[] = [['clip.gun', 'holster', ['holsterPrimary', 'holsterSidearm']]];

/** A values map with the split sliders filled from their old id (a copy of each touched group; `values` is untouched). */
export function aliasTuneValues<M extends Readonly<Record<string, Readonly<Record<string, number>>>>>(values: M): M {
  let out: Record<string, Record<string, number>> | null = null;
  for (const [g, old, ids] of ID_ALIASES) {
    const v = (out ?? values)[g];
    if (!v || typeof v !== 'object') continue;
    const x = v[old];
    if (typeof x !== 'number' || !Number.isFinite(x) || ids.every((n) => typeof v[n] === 'number')) continue;
    out ??= { ...(values as Record<string, Record<string, number>>) };
    const copy: Record<string, number> = { ...v };
    for (const n of ids) if (typeof copy[n] !== 'number') copy[n] = x;
    out[g] = copy;
  }
  return (out ?? values) as M;
}

/** An export's `changed` list with an entry per split slider added from its old id's entry (when it has none). */
export function aliasTuneChanged<T>(changed: readonly T[]): T[] {
  const out = changed.slice();
  for (const [g, old, ids] of ID_ALIASES) {
    const src = changed.find((c) => !!c && typeof c === 'object' && (c as { group?: unknown }).group === g && (c as { id?: unknown }).id === old);
    if (!src) continue;
    for (const n of ids) {
      if (changed.some((c) => !!c && typeof c === 'object' && (c as { group?: unknown }).group === g && (c as { id?: unknown }).id === n)) continue;
      out.push({ ...(src as object), id: n } as T);
    }
  }
  return out;
}
