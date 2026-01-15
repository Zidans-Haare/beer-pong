import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generatePasskeyRegistrationOptions } from '@/lib/webauthn';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    // Get existing passkeys for this user
    const existingPasskeys = await prisma.passkey.findMany({
      where: { userId: session.user.id },
      select: {
        credentialId: true,
      },
    });

    const existingCredentialIds = existingPasskeys.map((p) => p.credentialId);

    // Generate registration options
    const options = await generatePasskeyRegistrationOptions(
      session.user.id,
      session.user.email,
      session.user.name || session.user.email,
      existingCredentialIds
    );

    // Store challenge in cookie for verification
    const cookieStore = await cookies();
    cookieStore.set('passkey_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 5, // 5 minutes
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error('Passkey registration start error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Starten der Registrierung' },
      { status: 500 }
    );
  }
}
