import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { parseReplay } from '@/lib/minigame/replay';
import BeerPongGame, { type DuelInfo } from '@/components/game/BeerPongGame';
import { loadFigureMap } from '@/lib/figure-server';

export const dynamic = 'force-dynamic';

type Hand = 'rock' | 'paper' | 'scissors';
const isHand = (value: string | null): value is Hand => value === 'rock' || value === 'paper' || value === 'scissors';

// Minispiel: gegen den Rechner oder als Duell mit einem angemeldeten Mitspieler
export default async function GamePage({ searchParams }: { searchParams: Promise<{ duel?: string }> }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect('/login');
    const { duel: duelParam } = await searchParams;

    const players = await prisma.player.findMany({
        where: { isGuest: false, userId: { not: null }, user: { status: 'ACTIVE' } },
        select: { id: true, name: true, userId: true },
        orderBy: { name: 'asc' },
    });
    const me = players.find(p => p.userId === userId);
    const others = players.filter(p => p.userId !== userId).map(p => ({ id: p.id, name: p.name.trim() }));

    // offene Duelle: für mich zum Nachziehen und von mir, auf die noch gewartet wird
    const [incoming, outgoing, invited] = me
        ? await Promise.all([
            prisma.miniGame.findMany({ where: { opponentId: me.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, challenger: { select: { name: true } } } }),
            prisma.miniGame.findMany({ where: { challengerId: me.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, opponent: { select: { name: true } } } }),
            duelParam ? prisma.miniGame.findFirst({ where: { id: duelParam, opponentId: me.id, status: 'PENDING' }, include: { challenger: { select: { name: true } } } }) : null,
        ])
        : [[], [], null];

    let duel: DuelInfo | null = null;
    const replay = invited ? parseReplay(invited.replay) : null;
    if (invited && replay && (invited.starter === 'CHALLENGER' || invited.starter === 'OPPONENT') && isHand(invited.challengerHand) && isHand(invited.opponentHand)) {
        duel = { id: invited.id, cupSize: invited.cupSize === 'medium' || invited.cupSize === 'large' ? invited.cupSize : 'small', challengerName: invited.challenger.name.trim(), starter: invited.starter, challengerHand: invited.challengerHand, opponentHand: invited.opponentHand, replay };
    }

    return (
        <BeerPongGame
            key={duel?.id ?? 'start'}
            meName={me?.name.trim() ?? session?.user?.name?.trim() ?? 'Du'}
            players={others}
            incoming={incoming.map(d => ({ id: d.id, name: d.challenger.name.trim() }))}
            outgoing={outgoing.map(d => ({ id: d.id, name: d.opponent?.name.trim() ?? '' }))}
            duel={duel}
            figures={await loadFigureMap()}
            backHref="/"
        />
    );
}
