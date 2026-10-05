import type { PartFactory } from '../player/characterRig';
import type { PartLibrary } from '../world/partLibrary';
import type { AvatarLook } from './avatarLook';

/** Pattern-bearing clothing slots. */
const PATTERNED = new Set(['torso', 'legs']);

/** Part factory for a customised avatar: instanced parts with the look's pattern on clothing. */
export function avatarFactory(parts: PartLibrary, look: AvatarLook, name = 'avatar-part'): PartFactory {
  const pattern = look.pattern !== 'solid' ? { name: look.pattern, color: look.colors.pattern, scale: 0.12 } : undefined;
  return (shape, hex, slot) => parts.instance(shape, hex, name, PATTERNED.has(slot) ? pattern : undefined);
}
