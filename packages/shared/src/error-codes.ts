/**
 * The single list of error codes. The API throws with these and the mobile client
 * derives its translation keys from them, so a typo on either side is a type error
 * rather than a message that silently renders in the wrong language.
 *
 * A code is part of the API contract: never rename one once it has shipped.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  INTERNAL: 'INTERNAL',

  /** 0003. A token from Google or Apple failed any part of verification. */
  AUTH_PROVIDER_TOKEN_INVALID: 'AUTH_PROVIDER_TOKEN_INVALID',
  /** Our own access or refresh token is malformed, unknown, or not ours. */
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  /** Presented after revocation, which includes a whole chain revoked for reuse. */
  AUTH_TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  /** The development sign-in was given an email no user holds. It never creates one. */
  AUTH_DEV_USER_NOT_FOUND: 'AUTH_DEV_USER_NOT_FOUND',

  /** 0005. Also answers for a recipe that exists but belongs to someone else. */
  RECIPE_NOT_FOUND: 'RECIPE_NOT_FOUND',

  /** 0017. Only a ready recipe gets a link. */
  RECIPE_NOT_READY: 'RECIPE_NOT_READY',
  /** 0017. An unknown or revoked token: the two are the same to a reader, on purpose. */
  SHARE_NOT_FOUND: 'SHARE_NOT_FOUND',

  /** 0011. The bytes uploaded are not an image the resizer can read, or no file came. */
  IMAGE_UNSUPPORTED: 'IMAGE_UNSUPPORTED',
  /** A malformed key answers the same as an unknown one, so nothing about the store leaks. */
  IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
