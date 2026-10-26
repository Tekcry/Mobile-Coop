// Route-run cause reader (J13 R4a seam, docs/route-runs/PLAN.md "Seams"): turns the rises the in-page driver saw (a
// guard's alert level going up, a camera alarm) into detection and notice lines. Node side.
//   readCauses(ctx, since) -> { lines, next }
// `ctx.driver.rises(since)` gives the raw rises from index `since` on (the driver's shape, below); `next` is the index
// to pass next time. Each line is `{ kind: 'detection' | 'notice', t, robot, guard, sense, inferred, level, restart,
// guardAt, robotAt, space, inputs }` (R2's detection shape plus `kind`).
// R4a: the inference reader on R3's classifier (`inferCause`, every sense marked `inferred`). R7 owns this file next:
// it reads Guard AI's cause ring (`enemyMgr.causes`, feature-detected) and falls back to this inference; records and
// inferences never mix in one run.
//
// A raw rise (driver.mjs): `{ t, cls: 'detection' | 'notice', level, camera, guard: { id, kind, role, zone, x, y, z,
// yaw }, robots: [{ x, y, z, crouched, speed, light }], heard: [{ x, y, z, radius, kind }], told, body, space }`.
import { inferCause } from './progress.mjs';

/** Robot names by page slot (R4b adds the client). */
export const ROBOTS = ['host', 'client'];

const r2 = (v) => Math.round(v * 100) / 100;

/** One raw rise -> one line (pure; the CLI's tests call it). */
export function lineOf(rise) {
  const guard = rise.guard ?? {};
  const c = inferCause({ guard: { id: guard.id, kind: guard.kind, x: guard.x, y: guard.y, z: guard.z, yaw: guard.yaw }, robots: rise.robots ?? [], camera: rise.camera ?? null, heard: rise.heard ?? [], told: rise.told ?? null, body: !!rise.body });
  const robot = c.robot >= 0 ? c.robot : 0;
  const at = rise.robots?.[robot];
  let inputs = c.inputs;
  if (inputs) {
    inputs = { ...inputs };
    for (const k of Object.keys(inputs)) if (typeof inputs[k] === 'number') inputs[k] = r2(inputs[k]);
  }
  return {
    kind: rise.cls,
    t: r2(rise.t),
    robot: ROBOTS[robot] ?? `robot${robot}`,
    guard: { id: guard.id ?? null, kind: guard.kind ?? null, role: guard.role || null, zone: guard.zone || null },
    sense: c.sense,
    inferred: c.inferred,
    level: rise.level ?? null,
    restart: null,
    guardAt: typeof guard.x === 'number' ? [r2(guard.x), r2(guard.y), r2(guard.z)] : null,
    robotAt: at ? [r2(at.x), r2(at.y), r2(at.z)] : null,
    space: rise.space ?? null,
    inputs,
  };
}

/** The lines for the rises the driver logged from index `since` on. */
export async function readCauses(ctx, since) {
  const raw = await ctx.driver.rises(since);
  return { lines: raw.map(lineOf), next: since + raw.length };
}
