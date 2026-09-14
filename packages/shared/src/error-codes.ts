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
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
