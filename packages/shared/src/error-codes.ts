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
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
