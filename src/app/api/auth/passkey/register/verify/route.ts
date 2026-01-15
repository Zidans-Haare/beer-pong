import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { verifyPasskeyRegistration } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const body = await request.json();
    const { response, friendlyName } = body as {
      response: RegistrationResponseJSON;
      friendlyName?: string;
    };

    // Get challenge from cookie
    const cookieStore = await cookies();
    const challenge = cookieStore.get('passkey_challenge')?.value;

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge abgelaufen. Bitte erneut versuchen.' },
        { status: 400 }
      );
    }

    // Verify registration
    const verification = await verifyPasskeyRegistration(response, challenge);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Passkey-Verifizierung fehlgeschlagen' },
        { status: 400 }
      );
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp,
    } = verification.registrationInfo;

    // Store passkey in database
    await prisma.passkey.create({
      data: {
        userId: session.user.id,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter: BigInt(counter),
        credentialDeviceType,
        credentialBackedUp,
        transports: response.response.transports
          ? JSON.stringify(response.response.transports)
          : null,
        friendlyName: friendlyName || 'Passkey',
      },
    });

    // Clear challenge cookie
    cookieStore.delete('passkey_challenge');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Passkey registration verify error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Passkey-Registrierung' },
      { status: 500 }
    );
  }
}
