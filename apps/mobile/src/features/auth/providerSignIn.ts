import type { SignInBody } from '@panna/shared';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

/** The person closed the sheet. Not an error: the screen goes back to idle silently. */
export class SignInCancelled extends Error {}

/** The build carries no Google client id, so there is nothing to ask Google with. */
export class ProviderNotConfigured extends Error {}

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/**
 * The provider is given the hash and the API the raw value, so the token it issues
 * carries only the hash and cannot be presented by anyone who merely holds the token.
 * The API hashes what it receives and compares.
 */
async function newNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}

function googleIosClientId(): string | null {
  const value: unknown = Constants.expoConfig?.extra?.googleIosClientId;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Google's browser flow rather than its native SDK: the free native library cannot pass a
 * nonce, and 0003 requires one. An iOS client has no secret, so the code is exchanged
 * with PKCE alone.
 */
export async function signInWithGoogle(): Promise<SignInBody> {
  const clientId = googleIosClientId();
  if (clientId === null) throw new ProviderNotConfigured();

  const reversed = clientId.split('.').reverse().join('.');
  const redirectUri = `${reversed}:/oauthredirect`;
  const nonce = await newNonce();

  const authRequest = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ['openid', 'email', 'profile'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { nonce: nonce.hashed },
  });
  const result = await authRequest.promptAsync(GOOGLE_DISCOVERY);
  if (result.type === 'cancel' || result.type === 'dismiss') throw new SignInCancelled();
  if (result.type !== 'success') throw new Error(`Google sign-in ended with ${result.type}`);

  const code = result.params.code;
  if (code === undefined || authRequest.codeVerifier === undefined) {
    throw new Error('Google returned no authorisation code');
  }

  const tokens = await AuthSession.exchangeCodeAsync(
    { clientId, code, redirectUri, extraParams: { code_verifier: authRequest.codeVerifier } },
    GOOGLE_DISCOVERY,
  );
  if (tokens.idToken === undefined) throw new Error('Google returned no ID token');

  return { provider: 'google', idToken: tokens.idToken, nonce: nonce.raw };
}

export async function signInWithApple(): Promise<SignInBody> {
  const nonce = await newNonce();

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: nonce.hashed,
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ERR_REQUEST_CANCELED') {
      throw new SignInCancelled();
    }
    throw error;
  }

  if (credential.identityToken === null) throw new Error('Apple returned no identity token');

  // Apple sends the name on the very first authorisation only, so it is now or never.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ');

  return {
    provider: 'apple',
    idToken: credential.identityToken,
    nonce: nonce.raw,
    ...(name.length > 0 ? { displayName: name } : {}),
  };
}
