import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinByCodePage({ params }: Props) {
  const { code } = await params;

  // Find tournament by short code
  const tournament = await prisma.tournament.findFirst({
    where: {
      shortCode: {
        equals: code.toUpperCase(),
      },
    },
    select: { id: true },
  });

  if (!tournament) {
    notFound();
  }

  // Redirect to tournament page
  redirect(`/tournaments/${tournament.id}`);
}
