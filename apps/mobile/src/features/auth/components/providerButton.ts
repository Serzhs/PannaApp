/**
 * Apple and Google each specify their own button, but both give a range rather than a
 * single number: Apple asks for at least 44 points tall, Google for at least 40, and
 * both allow the corner radius to be chosen. Matching the app's own Button - 24 of line
 * height inside 12 of padding each side, and the medium radius - lets the providers and
 * the development sign-in line up exactly, which is what stops a sign-in screen looking
 * like three buttons borrowed from three places.
 */
export const PROVIDER_BUTTON = {
  height: 48,
  radius: 8,
  logo: 20,
} as const;
