/**
 * A1 the Gate (SPEC section 9 "A1 - Set 1, the Gate"; PLAN slice 1). STUB (slice 0d): an empty lit hall that walks
 * through to holding room one (`stub.ts`), plus the gate checker `a1-checker`: a passive grabbable role-player in the
 * first bay's squad (e2e-coop's bay-1 guard, SPEC 16 "Keeps") with one interrogation line. The set slice replaces
 * `buildStub` with the set (lounge, apron, boundary wall, wicket, cabin) inside `SET_BOX.a1Gate`, keeps the checker
 * (seated in his cabin, SPEC A1), keeps this function's name and signature, and drops `stub: true`.
 */
import type { GuardInfo } from '../../../ai/guardInfo';
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { buildStub } from './stub';
import type { SetPart } from './types';

/** The gate checker's squad slot id. */
export const A1_CHECKER = 'a1-checker';
/** What he gives up when held (true of the facility: the wall medkits are in holding rooms four and seven). */
export const A1_CHECKER_INFO: GuardInfo = { lines: ['All right! There is a medkit in holding room four, and one in the model room.'] };

export function buildA1Gate(b: LevelBuilder, _kit: FacilityKit): SetPart {
  return buildStub(b, 'a1Gate', (p) => {
    // standing on the apron's north side facing east (away from the lounge), so the grab from behind is clear
    p.squads[A1_CHECKER] = { kind: 'grunt', x: 10.5, z: 16.5, yaw: Math.PI / 2, passive: true, info: A1_CHECKER_INFO };
    p.bay.squad.push(A1_CHECKER);
  });
}
