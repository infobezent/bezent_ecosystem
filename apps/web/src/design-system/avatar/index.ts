/**
 * BEZENT Avatar System — Public Module Barrel
 */

export * from './types';
export {
  VERIFIED_BASE_AVATARS,
  AVATAR_ALIASES,
  isValidAvatarId,
  getAvatarCatalog,
  getAvatarById,
  hasAvatar,
  registerAvatar,
  registerAvatars,
} from './catalog';
export * from './resolveAvatar';
