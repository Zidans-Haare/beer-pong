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
    const open = await prisma.miniGame.count({ where: { challengerId: player.id, status: 'PENDING' } });
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
    await prisma.miniGame.update({ where: { id }, data: { status: 'DECLINED', completedAt: new Date() } });
    if (game.challenger.userId) await sendPushToUser(game.challenger.userId, 'Duell abgelehnt', `${player.name.trim()} hat dein Duell abgelehnt.`, '/game');
    revalidatePath('/game');
    return { success: true };
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
    const game = await prisma.miniGame.findFirst({ where: { id, opponentId: player.id, status: 'PENDING' }, include: { challenger: { select: { userId: true } } } });
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
