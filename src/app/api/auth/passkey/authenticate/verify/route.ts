import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPasskeyAuthentication } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { encode } from 'next-auth/jwt';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = body as AuthenticationResponseJSON;

    // Get challenge from cookie
    const cookieStore = await cookies();
    const challenge = cookieStore.get('passkey_auth_challenge')?.value;

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge abgelaufen. Bitte erneut versuchen.' },
        { status: 400 }
      );
    }

    // Find the passkey by credential ID
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId: response.id },
      include: { user: true },
    });

    if (!passkey) {
      return NextResponse.json(
        { error: 'Passkey nicht gefunden' },
        { status: 404 }
      );
    }

    // Verify account is active
    if (passkey.user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account ist nicht aktiv oder wurde abgelehnt' },
        { status: 403 }
      );
    }

    // Verify authentication
    const verification = await verifyPasskeyAuthentication(response, challenge, {
      credentialId: passkey.credentialId,
      credentialPublicKey: new Uint8Array(passkey.credentialPublicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentifizierung fehlgeschlagen' },
        { status: 400 }
      );
    }

    // Update counter and last used timestamp
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Clear challenge cookie
    cookieStore.delete('passkey_auth_challenge');

    // Create session token
    const token = await encode({
      token: {
        sub: passkey.user.id,
        email: passkey.user.email,
        name: passkey.user.name,
      },
      secret: process.env.AUTH_SECRET!,
      salt: 'authjs.session-token',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Set session cookie
    cookieStore.set('authjs.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: passkey.user.id,
        email: passkey.user.email,
        name: passkey.user.name,
      },
    });
  } catch (error) {
    console.error('Passkey auth verify error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Authentifizierung' },
      { status: 500 }
    );
  }
}
