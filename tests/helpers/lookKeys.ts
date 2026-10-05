import { defaultLook } from '../../src/cosmetics/avatarLook';
import { LOOK_FIELD } from '../../src/cosmetics/catalog';

/** Every catalogue category maps to a real AvatarLook field. */
export const AVATAR_KEYS_OK = Object.values(LOOK_FIELD).every((k) => k in defaultLook());
