import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const { id } = await params;

    // Verify passkey belongs to user
    const passkey = await prisma.passkey.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!passkey) {
      return NextResponse.json({ error: 'Passkey nicht gefunden' }, { status: 404 });
    }

    // Delete passkey
    await prisma.passkey.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete passkey error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen' },
      { status: 500 }
    );
  }
}
