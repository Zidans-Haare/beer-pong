import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasskeyAuthenticationOptions } from '@/lib/webauthn';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body as { email?: string };

    let credentialIds: string[] | undefined;

    // If email provided, get user's passkeys for allowCredentials
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          passkeys: {
            select: {
              credentialId: true,
            },
          },
        },
      });

      if (user?.passkeys.length) {
        credentialIds = user.passkeys.map((p) => p.credentialId);
      }
    }

    // Generate authentication options
    // If no email/passkeys, this allows discoverable credentials (resident keys)
    const options = await generatePasskeyAuthenticationOptions(credentialIds);

    // Store challenge in cookie
    const cookieStore = await cookies();
    cookieStore.set('passkey_auth_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 5, // 5 minutes
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Passkey auth start error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Starten der Authentifizierung' },
      { status: 500 }
    );
  }
}
