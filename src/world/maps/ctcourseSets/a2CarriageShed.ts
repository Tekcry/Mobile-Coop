/**
 * A2 the Carriage Shed (SPEC section 9 "A2 - Set 2, the Carriage Shed"; PLAN slice 2). STUB (slice 0d): an empty lit hall that walks through to the next room
 * (`stub.ts`). The set slice replaces `buildStub` with the set (greybox, lights, guards, devices, objective steps,
 * dressing) inside `SET_BOX.a2CarriageShed`, keeps this function's name and signature, and drops `stub: true`.
 */
import type { FacilityKit } from '../../kit/facilityKit';
import type { LevelBuilder } from '../../levelBuilder';
import { buildStub } from './stub';
import type { SetPart } from './types';

export function buildA2CarriageShed(b: LevelBuilder, _kit: FacilityKit): SetPart {
  return buildStub(b, 'a2CarriageShed');
}
