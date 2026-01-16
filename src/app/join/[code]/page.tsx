import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import GuestJoinForm from './GuestJoinForm';
import { isGuestForTournament } from '@/app/actions/guests';
import { autoJoinInstantTournament } from '@/app/actions/rsvp';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function JoinByCodePage({ params }: Props) {
  const { code } = await params;
  const session = await auth();

  // Find tournament by short code
  const tournament = await prisma.tournament.findFirst({
    where: {
      shortCode: {
        equals: code.toUpperCase(),
      },
    },
    select: {
      id: true,
      name: true,
      isRanked: true,
      status: true,
      mode: true,
      location: true,
      date: true,
      createdAt: true
    },
  });

  if (!tournament) {
    notFound();
  }

  // Check if this is an instant tournament (<1 hour between creation and date)
  const isInstantTournament = new Date(tournament.date).getTime() - new Date(tournament.createdAt).getTime() < 1000 * 60 * 60;

  // If user is logged in
  if (session?.user) {
    // For instant tournaments and ranked: auto-join (set RSVP=YES)
    if (isInstantTournament && tournament.isRanked) {
      await autoJoinInstantTournament(tournament.id);
    }
    // Redirect to tournament page
    redirect(`/tournaments/${tournament.id}`);
  }

  // Check if already a guest for this tournament
  const existingGuest = await isGuestForTournament(tournament.id);
  if (existingGuest) {
    redirect(`/tournaments/${tournament.id}`);
  }

  // For Liga-Turniere (ranked), require login
  if (tournament.isRanked) {
    // Redirect to login with callback URL
    const callbackUrl = encodeURIComponent(`/tournaments/${tournament.id}`);
    redirect(`/login?callbackUrl=${callbackUrl}&message=Liga-Turnier%20erfordert%20Anmeldung`);
  }

  // For Spaß-Turniere, show guest join form
  return (
    <div className="container" style={{ maxWidth: '500px', padding: 'var(--spacing-6)' }}>
      <div className="glass-panel" style={{ padding: 'var(--spacing-6)', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-4)' }}>🎉</div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-2)' }}>
          {tournament.name}
        </h1>
        <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-4)' }}>
          Spaß-Turnier • {tournament.mode === 'TEAM' ? '2v2 Teams' : '1v1'} • {tournament.location}
        </p>

        <div style={{
          background: 'rgba(155, 89, 182, 0.1)',
          border: '1px solid rgba(155, 89, 182, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--spacing-4)',
          marginBottom: 'var(--spacing-6)'
        }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>
            Bei diesem Spaß-Turnier kannst du als Gast teilnehmen - keine Anmeldung nötig!
          </p>
        </div>

        <GuestJoinForm tournamentId={tournament.id} />

        <div style={{ marginTop: 'var(--spacing-6)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-4)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-2)' }}>
            Schon einen Account?
          </p>
          <a
            href={`/login?callbackUrl=${encodeURIComponent(`/tournaments/${tournament.id}`)}`}
            className="btn"
            style={{ width: '100%', border: '1px solid var(--color-border)' }}
          >
            Einloggen
          </a>
        </div>
      </div>
    </div>
  );
}
