/**
 * Apple and Google each specify their own button, but both give a range rather than a
 * single number: Apple asks for at least 44 points tall, Google for at least 40, and
 * both allow the corner radius to be chosen. Taking the top of both ranges lets the two
 * providers and the app's own Button line up exactly, which is what stops a sign-in
 * screen looking like three buttons borrowed from three places.
 *
 * 44 and 8 are also what the app's Button uses, so all three match by construction.
 */
export const PROVIDER_BUTTON = {
  height: 44,
  radius: 8,
} as const;
