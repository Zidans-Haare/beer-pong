import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generatePasskeyAuthenticationOptions } from '@/lib/webauthn';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const { allowed, retryAfter } = await rateLimit(`passkey-start:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Zu viele Versuche. Bitte warte kurz.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

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
