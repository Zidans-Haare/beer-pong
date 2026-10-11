'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push';
import { parseReplay, roundsOf, hitsOf } from '@/lib/minigame/replay';

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };

const HANDS = new Set(['rock', 'paper', 'scissors']);
const LEVELS = new Set(['easy', 'normal', 'hard']);
const SIZES = new Set(['small', 'medium', 'large']);
const sizeOf = (value: unknown) => (typeof value === 'string' && SIZES.has(value) ? value : 'small');
const clampInt = (value: unknown, max = 500) => (Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Math.round(Number(value)))) : 0);
const side = (value: unknown): 'CHALLENGER' | 'OPPONENT' | null => (value === 'CHALLENGER' || value === 'OPPONENT' ? value : null);

async function me() {
    const session = await auth();
    if (!session?.user?.id) return null;
    const player = await prisma.player.findUnique({ where: { userId: session.user.id }, select: { id: true, name: true, userId: true } });
    return player ? { ...player, userId: session.user.id } : null;
}

export interface CpuGameInput {
    difficulty: string;
    cupSize?: string;
    // Sicht des Spielers: mein Sieg, meine Runden und Treffer, die des Rechners
    won: boolean;
    rounds: number; hits: number; opponentRounds: number; opponentHits: number;
    nakedMile: 'me' | 'opp' | null;
}

// Ein Spiel gegen den Rechner für die Statistik festhalten
export async function recordCpuGame(input: CpuGameInput): Promise<Result> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    try {
        await prisma.miniGame.create({
            data: {
                mode: 'CPU', status: 'COMPLETED', difficulty: LEVELS.has(input.difficulty) ? input.difficulty : 'normal', cupSize: sizeOf(input.cupSize),
                challengerId: player.id,
                challengerRounds: clampInt(input.rounds, 200), challengerHits: clampInt(input.hits), opponentRounds: clampInt(input.opponentRounds, 200), opponentHits: clampInt(input.opponentHits),
                winner: input.won ? 'CHALLENGER' : 'OPPONENT',
                nakedMile: input.nakedMile === 'me' ? 'CHALLENGER' : input.nakedMile === 'opp' ? 'OPPONENT' : null,
                completedAt: new Date(),
            },
        });
        revalidatePath('/stats');
        return { success: true };
    } catch (error) {
        console.error('recordCpuGame failed:', error);
        return { success: false, error: 'Speichern fehlgeschlagen' };
    }
}

export interface DuelInput {
    opponentPlayerId: string;
    cupSize?: string;
    replay: string;
    starter: 'CHALLENGER' | 'OPPONENT';
    challengerHand: string;
    opponentHand: string;
}

// Der Herausforderer hat vorgelegt: Duell anlegen und den anderen benachrichtigen
export async function createDuel(input: DuelInput): Promise<Result<{ id: string }>> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const replay = parseReplay(input.replay);
    if (!replay || !side(input.starter) || !HANDS.has(input.challengerHand) || !HANDS.has(input.opponentHand)) return { success: false, error: 'Ungültige Daten' };
    const opponent = await prisma.player.findFirst({
        where: { id: input.opponentPlayerId, isGuest: false, userId: { not: null }, user: { status: 'ACTIVE' } },
        select: { id: true, userId: true },
    });
    if (!opponent || !opponent.userId || opponent.id === player.id) return { success: false, error: 'Gegner nicht gefunden' };

    // nicht beliebig viele offene Duelle gleichzeitig
    const open = await prisma.miniGame.count({ where: { challengerId: player.id, stage: 0, status: { in: ['PENDING', 'PLAYING'] } } });
    if (open >= 5) return { success: false, error: 'Du hast schon fünf offene Duelle. Warte, bis jemand nachzieht.' };

    try {
        const game = await prisma.miniGame.create({
            data: {
                mode: 'DUEL', status: 'PENDING', challengerId: player.id, opponentId: opponent.id, cupSize: sizeOf(input.cupSize),
                starter: input.starter, challengerHand: input.challengerHand, opponentHand: input.opponentHand,
                challengerRounds: roundsOf(replay), challengerHits: hitsOf(replay), replay: JSON.stringify(replay),
            },
        });
        await sendPushToUser(opponent.userId, 'Duell-Herausforderung', `${player.name.trim()} will ein Duell. Nimm es an!`, `/game?duel=${game.id}`);
        revalidatePath('/game');
        return { success: true, id: game.id };
    } catch (error) {
        console.error('createDuel failed:', error);
        return { success: false, error: 'Das Duell konnte nicht angelegt werden' };
    }
}

export async function declineDuel(id: string): Promise<Result> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const game = await prisma.miniGame.findFirst({ where: { id, opponentId: player.id, status: 'PENDING' }, include: { challenger: { select: { userId: true } } } });
    if (!game) return { success: false, error: 'Duell nicht gefunden' };
    // Eine Verlängerung gehört zu einem Duell, das schon läuft: Ablehnen geht nicht, nur spielen oder aufgeben
    if (game.stage > 0) return { success: false, error: 'Eine Verlängerung lässt sich nicht ablehnen.' };
    await prisma.miniGame.update({ where: { id }, data: { status: 'DECLINED', completedAt: new Date() } });
    if (game.challenger.userId) await sendPushToUser(game.challenger.userId, 'Duell abgelehnt', `${player.name.trim()} hat dein Duell abgelehnt.`, '/game');
    revalidatePath('/game');
    return { success: true };
}

// Der Nachziehende hat das Duell angenommen und fängt an. Ab jetzt gilt es als begonnen: Wer abbricht, hat verloren.
export async function startDuel(id: string): Promise<Result> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const started = await prisma.miniGame.updateMany({ where: { id, opponentId: player.id, status: 'PENDING' }, data: { status: 'PLAYING' } });
    return started.count === 1 ? { success: true } : { success: false, error: 'Duell nicht gefunden' };
}

// Aufgegeben oder mittendrin abgebrochen: Das Duell zählt als verloren, der Herausforderer hat gewonnen
export async function forfeitDuel(id: string): Promise<Result> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const game = await prisma.miniGame.findFirst({ where: { id, opponentId: player.id, status: 'PLAYING' }, include: { challenger: { select: { userId: true } } } });
    if (!game) return { success: false, error: 'Duell nicht gefunden' };
    const done = await prisma.miniGame.updateMany({
        where: { id, status: 'PLAYING' },
        data: { status: 'COMPLETED', completedAt: new Date(), winner: 'CHALLENGER', opponentHits: 0, opponentRounds: game.challengerRounds },
    });
    if (done.count === 1) await finishRoot(game, game.challengerId);
    if (done.count === 1 && game.challenger.userId) {
        await sendPushToUser(game.challenger.userId, 'Duell gewonnen', `${player.name.trim()} hat aufgegeben. Das Duell geht an dich!`, '/game');
    }
    revalidatePath('/game');
    revalidatePath('/stats');
    return { success: true };
}

// Eine Verlängerung ist entschieden: Das ursprüngliche Duell bekommt den Sieger (aus Sicht seiner Rollen) und gilt als beendet
async function finishRoot(game: { parentId: string | null }, winnerPlayerId: string | null) {
    if (!game.parentId || !winnerPlayerId) return;
    const root = await prisma.miniGame.findUnique({ where: { id: game.parentId }, select: { id: true, challengerId: true, status: true } });
    if (!root || root.status !== 'OVERTIME') return;
    await prisma.miniGame.update({
        where: { id: root.id },
        data: { status: 'COMPLETED', completedAt: new Date(), winner: winnerPlayerId === root.challengerId ? 'CHALLENGER' : 'OPPONENT' },
    });
}

// Beide haben alles abgeräumt: Wer gerade spielt, hat seine Verlängerung (drei Becher) allein gespielt. Daraus entsteht ein neues Spiel,
// in dem der andere gegen diese Aufzeichnung nachziehen muss. Das ursprüngliche Duell bleibt offen, bis eine Verlängerung entschieden ist.
export async function createOvertime(id: string, replayJson: string, partial?: { rounds: number; hits: number }): Promise<Result<{ id: string }>> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const replay = parseReplay(replayJson);
    if (!replay) return { success: false, error: 'Ungültige Daten' };
    const game = await prisma.miniGame.findFirst({ where: { id, opponentId: player.id, status: 'PLAYING' }, include: { challenger: { select: { userId: true } } } });
    if (!game) return { success: false, error: 'Duell nicht gefunden' };
    const root = game.parentId ? await prisma.miniGame.findUnique({ where: { id: game.parentId } }) : game;
    if (!root) return { success: false, error: 'Duell nicht gefunden' };
    if (game.stage >= 20) return { success: false, error: 'Zu viele Verlängerungen' };
    // Wer im Duell angefangen hat, fängt auch in jeder Verlängerung an
    const starterPlayerId = root.starter === 'OPPONENT' ? root.opponentId : root.challengerId;
    try {
        const next = await prisma.$transaction(async tx => {
            // Nur wer das laufende Spiel wirklich noch hält, darf die Verlängerung anlegen: Ein zweiter, gleichzeitiger Aufruf scheitert hier
            const claimed = await tx.miniGame.updateMany({
                where: { id, opponentId: player.id, status: 'PLAYING' },
                data: game.stage === 0
                    ? { status: 'OVERTIME', opponentRounds: clampInt(partial?.rounds, 200), opponentHits: clampInt(partial?.hits) }
                    : { status: 'COMPLETED', completedAt: new Date() },
            });
            if (claimed.count !== 1) throw new Error('Spiel nicht mehr offen');
            return tx.miniGame.create({
                data: {
                    mode: 'DUEL', status: 'PENDING', stage: game.stage + 1, parentId: root.id,
                    challengerId: player.id, opponentId: game.challengerId, cupSize: game.cupSize,
                    starter: starterPlayerId === player.id ? 'CHALLENGER' : 'OPPONENT',
                    challengerHand: 'rock', opponentHand: 'rock',
                    challengerRounds: roundsOf(replay), challengerHits: hitsOf(replay), replay: JSON.stringify(replay),
                },
            });
        });
        if (game.challenger.userId) {
            await sendPushToUser(game.challenger.userId, 'Verlängerung!', `${player.name.trim()} und du habt beide alles abgeräumt. Jetzt zieht ihr in der Verlängerung nach: Du bist dran!`, `/game?duel=${next.id}`);
        }
        revalidatePath('/game');
        return { success: true, id: next.id };
    } catch (error) {
        console.error('createOvertime failed:', error);
        return { success: false, error: 'Die Verlängerung konnte nicht angelegt werden' };
    }
}

export interface DuelResult {
    // Sicht des Nachziehenden
    won: boolean;
    rounds: number; hits: number;
    // Treffer und Runden des Herausforderers im gespielten Duell
    challengerRounds: number; challengerHits: number;
    nakedMile: 'me' | 'opp' | null;
}

// Der Nachziehende ist fertig: Ergebnis speichern und den Herausforderer benachrichtigen
export async function completeDuel(id: string, result: DuelResult): Promise<Result> {
    const player = await me();
    if (!player) return { success: false, error: 'Nicht angemeldet' };
    const game = await prisma.miniGame.findFirst({ where: { id, opponentId: player.id, status: { in: ['PENDING', 'PLAYING'] } }, include: { challenger: { select: { userId: true } } } });
    if (!game) return { success: false, error: 'Duell nicht gefunden' };
    try {
        await prisma.miniGame.update({
            where: { id },
            data: {
                status: 'COMPLETED', completedAt: new Date(),
                opponentRounds: clampInt(result.rounds, 200), opponentHits: clampInt(result.hits),
                // Der Herausforderer behält seine Zahlen vom Vorlegen für die Bestenliste
                winner: result.won ? 'OPPONENT' : 'CHALLENGER',
                nakedMile: result.nakedMile === 'me' ? 'OPPONENT' : result.nakedMile === 'opp' ? 'CHALLENGER' : null,
            },
        });
        // Gehört das Spiel zu einer Verlängerung, entscheidet es das ursprüngliche Duell
        await finishRoot(game, result.won ? game.opponentId : game.challengerId);
        if (game.challenger.userId) {
            const name = player.name.trim();
            await sendPushToUser(
                game.challenger.userId,
                result.won ? 'Duell verloren' : 'Duell gewonnen',
                result.won ? `${name} hat nachgezogen und dein Duell gewonnen.` : `${name} hat nachgezogen, aber du hast das Duell gewonnen!`,
                '/game',
            );
        }
        revalidatePath('/game');
        revalidatePath('/stats');
        return { success: true };
    } catch (error) {
        console.error('completeDuel failed:', error);
        return { success: false, error: 'Speichern fehlgeschlagen' };
    }
}
