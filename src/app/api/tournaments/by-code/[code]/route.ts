import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }

  const tournament = await prisma.tournament.findFirst({
    where: {
      shortCode: {
        equals: code.toUpperCase(),
      },
    },
    select: { id: true, name: true, status: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  return NextResponse.json({
    tournamentId: tournament.id,
    name: tournament.name,
    status: tournament.status,
  });
}
