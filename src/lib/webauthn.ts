/**
 * WebAuthn Configuration and Utilities
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

// Configuration - should match your domain
const rpName = process.env.WEBAUTHN_RP_NAME || 'Bier Pong';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN ||
  (process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:3000`);

export interface StoredPasskey {
  credentialId: string;
  credentialPublicKey: Uint8Array;
  counter: number;
  transports?: string[];
}

/**
 * Generate options for registering a new passkey
 */
export async function generatePasskeyRegistrationOptions(
  userId: string,
  userEmail: string,
  userName: string,
  existingCredentialIds: string[] = []
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: userEmail,
    userDisplayName: userName || userEmail,
    attestationType: 'none',
    excludeCredentials: existingCredentialIds.map((id) => ({
      id: Uint8Array.from(Buffer.from(id, 'base64url')),
      type: 'public-key' as const,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  });

  return options;
}

/**
 * Verify passkey registration response
 */
export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
}

/**
 * Generate options for authenticating with a passkey
 */
export async function generatePasskeyAuthenticationOptions(
  credentialIds?: string[]
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentialIds?.map((id) => ({
      id: Uint8Array.from(Buffer.from(id, 'base64url')),
      type: 'public-key' as const,
    })),
    userVerification: 'preferred',
  });

  return options;
}

/**
 * Verify passkey authentication response
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  passkey: StoredPasskey
): Promise<VerifiedAuthenticationResponse> {
  return verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    authenticator: {
      credentialID: Uint8Array.from(Buffer.from(passkey.credentialId, 'base64url')),
      credentialPublicKey: passkey.credentialPublicKey,
      counter: passkey.counter,
    },
  });
}

/**
 * Check if WebAuthn is supported (client-side)
 */
export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    'create' in PublicKeyCredential &&
    'get' in PublicKeyCredential
  );
}

/**
 * Check if platform authenticator is available (Face ID, Touch ID, Windows Hello)
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
