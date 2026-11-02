/** (walk-test fix A3) Two-bone reach for the Mixamo arms (`mixamoBody.ts`: aimed, the hands reach the rig's gun). */
import { Vector3 } from '../core/babylon';

const eDir = new Vector3(), ePerp = new Vector3();

/**
 * The elbow (into `out`) for shoulder `S`, elbow now `E` and wrist target `T`, with upper / lower arm lengths `l1`, `l2`,
 * in the plane of S, E and T (the elbow keeps its side); a target out of reach is met by the straight arm pointing at
 * it. False (out untouched) when the arm lies along the target line (no plane). No allocation.
 */
export function reachElbow(S: Vector3, E: Vector3, T: Vector3, l1: number, l2: number, out: Vector3): boolean {
  T.subtractToRef(S, eDir);
  const d = eDir.length();
  if (d < 1e-6 || l1 < 1e-6 || l2 < 1e-6) return false;
  eDir.scaleInPlace(1 / d);
  E.subtractToRef(S, ePerp);
  const along = Vector3.Dot(ePerp, eDir);
  ePerp.addInPlaceFromFloats(-eDir.x * along, -eDir.y * along, -eDir.z * along);
  const pl = ePerp.length();
  if (pl < 1e-6) return false;
  ePerp.scaleInPlace(1 / pl);
  const dc = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, d));
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc)));
  const sinA = Math.sqrt(1 - cosA * cosA);
  out.set(S.x + (eDir.x * cosA + ePerp.x * sinA) * l1, S.y + (eDir.y * cosA + ePerp.y * sinA) * l1, S.z + (eDir.z * cosA + ePerp.z * sinA) * l1);
  return true;
}
