import type { PartFactory } from './characterRig';
import type { PartLibrary } from '../world/partLibrary';

/** Part factory for a player character (Wren): instanced parts from the shared library, named `name`. */
export function avatarFactory(parts: PartLibrary, name = 'avatar-part'): PartFactory {
  return (shape, hex) => parts.instance(shape, hex, name);
}
