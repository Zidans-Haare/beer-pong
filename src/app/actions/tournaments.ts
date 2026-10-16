'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { generateSingleEliminationBracket, generateRoundRobinMatches, generateGroupStageMatches } from '@/lib/brackets';
import { auth } from '@/auth';
import { broadcastNotification } from './notifications';
import { generateShortCode } from '@/lib/qrcode';
import { isDemoMode } from '@/lib/demo';
import { getUploadDir } from '@/lib/uploads';


export async function getTournaments() {
    try {
        const tournaments = await prisma.tournament.findMany({
            orderBy: { date: 'asc' },
        });
        return tournaments;
    } catch (error) {
        console.error('Failed to fetch tournaments:', error);
        throw new Error('Failed to fetch tournaments');
    }
}

export async function createTournament(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const name = formData.get('name') as string;
    const dateStr = formData.get('date') as string;
    const location = formData.get('location') as string;
    const type = formData.get('type') as string;
    const hasReturnLeg = formData.get('hasReturnLeg') === 'on';
    const startImmediately = formData.get('startImmediately') === 'on';
    const mode = (formData.get('mode') as string) || 'SOLO';  // SOLO or TEAM
    const isRanked = formData.get('isRanked') !== 'false';    // Default true

    const offersGuestRoom = formData.get('offersGuestRoom') === 'on' || formData.get('offersGuestRoom') === 'true';
    const guestRoomTitle = formData.get('guestRoomTitle') as string || null;
    const guestRoomCapacity = parseInt(formData.get('guestRoomCapacity') as string) || 1;
    const guestRoomDescription = formData.get('guestRoomDescription') as string || null;
    const offersBreakfast = formData.get('offersBreakfast') === 'true';
    const offersHalfBoard = formData.get('offersHalfBoard') === 'true';
    const usePaypal = formData.get('usePaypal') === 'on';

    let guestRoomImagePath = null;
    if (offersGuestRoom && !isDemoMode) {
        const guestRoomImageFile = formData.get('guestRoomImage') as File | null;
        if (guestRoomImageFile && guestRoomImageFile.size > 0) {
            // gleiche Regeln wie beim Spielerbild; SVG ist gesperrt
            const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' } as Record<string, string>)[guestRoomImageFile.type];
            if (!ext) return { success: false, error: 'Nur JPEG, PNG, WebP und GIF erlaubt' };
            if (guestRoomImageFile.size > 8 * 1024 * 1024) return { success: false, error: 'Bild zu groß (max 8MB)' };
            const buffer = Buffer.from(await guestRoomImageFile.arrayBuffer());
            const fileName = `room_${Date.now()}${ext}`;
            // in den Upload-Ordner, den /uploads ausliefert; der Build-Ordner wird bei jedem Update ersetzt
            await fs.writeFile(path.join(getUploadDir(), fileName), buffer);
            guestRoomImagePath = `/uploads/${fileName}`;
        }
    }

    const participantIds = formData.getAll('participants') as string[];

    const userId = session.user.id;

    if (!name || (!startImmediately && !dateStr) || !location) {
        return { success: false, error: 'Pflichtfelder fehlen (Name und Location erforderlich)' };
    }

    // If starting now, use current date
    const date = startImmediately ? new Date() : new Date(dateStr);

    // Fetch Host Player ID
    const hostPlayer = await prisma.player.findUnique({
        where: { userId: session.user.id }
    });

    if (hostPlayer && !participantIds.includes(hostPlayer.id)) {
        participantIds.push(hostPlayer.id);
    }

    // Fetch System Defaults
    const settings = await (prisma as any).systemSettings.findUnique({ where: { id: 'default' } });
    const matchDurationMin = settings?.matchDurationMin || 15;

    // Use user-specified table count or system default
    const formTableCount = formData.get('tableCount');
    const tableCount = formTableCount ? parseInt(formTableCount as string) : (settings?.tableCount || 1);

    try {
        // Generate unique short code
        let shortCode = generateShortCode();
        let attempts = 0;
        while (attempts < 10) {
            const existing = await prisma.tournament.findFirst({ where: { shortCode } });
            if (!existing) break;
            shortCode = generateShortCode();
            attempts++;
        }

        const result = await prisma.$transaction(async (tx: any) => {
            const tournament = await tx.tournament.create({
                data: {
                    name,
                    date,
                    location,
                    type: type || 'ELIMINATION',
                    status: 'PLANNED', // Even "Now" starts as PLANNED (Lobby)
                    hostId: userId,
                    shortCode,
                    hasReturnLeg,
                    matchDurationMin,
                    tableCount,
                    mode,      // SOLO or TEAM
                    isRanked,   // false for Spaß-Turniere
                    offersGuestRoom,
                    guestRoomTitle,
                    guestRoomCapacity,
                    guestRoomDescription,
                    guestRoomImage: guestRoomImagePath,
                    offersBreakfast,
                    offersHalfBoard,
                    usePaypal,
                },
            });

            // Add host as YES RSVP
            if (hostPlayer) {
                await tx.rSVP.create({
                    data: {
                        tournamentId: tournament.id,
                        playerId: hostPlayer.id,
                        status: 'YES'
                    }
                });
            }

            // Add directly selected players as YES RSVP
            for (const playerId of participantIds) {
                if (playerId === hostPlayer?.id) continue; // Host already added
                await tx.rSVP.create({
                    data: {
                        tournamentId: tournament.id,
                        playerId,
                        status: 'YES'
                    }
                });
            }

            return tournament;
        });

        revalidatePath('/tournaments');

        if (startImmediately) {
            // Immediate Broadcast for "Now" tournaments
            await broadcastNotification({
                title: 'Neues Turnier!',
                message: `${name} startet JETZT! Join die Lobby!`,
                link: `/tournaments/${result.id}`,
                type: 'TOURNAMENT'
            });
            return { success: true, redirectUrl: `/tournaments/${result.id}` };
        }

        // For planned tournaments, we might want to return all emails for the sharing dialog
        const allPlayers = await prisma.player.findMany({
            select: {
                email: true,
                user: { select: { email: true } }
            }
        });
        const participantEmails = allPlayers.map((p: any) => p.email || p.user?.email).filter(Boolean) as string[];

        return { success: true, tournament: result, participantEmails };
    } catch (error) {
        console.error('Failed to create tournament:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to create tournament' };
    }
}

export async function startTournament(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });

        if (!tournament) throw new Error('Tournament not found');

        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann das Turnier starten.' };
        }

        if (tournament.status !== 'PLANNED') throw new Error('Tournament already started or completed');

        // Use the new Service
        const { TournamentService } = await import('@/lib/services/TournamentService');
        await TournamentService.startTournament(tournamentId);

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start tournament:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Failed to start tournament' };
    }
}

// Läuft für ein Turnier gerade das Anlegen der Playoffs? Verhindert, dass zwei schnelle Klicks die Spiele doppelt erzeugen.
const playoffsRunning = new Set<string>();

export async function startPlayoffs(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { matches: true }
        });

        if (!tournament || (tournament.type !== 'ROUND_ROBIN' && tournament.type !== 'GROUPS' && tournament.type !== 'GROUP_AND_KNOCKOUT')) {
            throw new Error('Dieses Turnier unterstützt keine Playoffs.');
        }

        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann Playoffs starten.' };
        }

        // Playoffs gibt es nur einmal: Sind schon Spiele der K.-o.-Runde da, wird nichts mehr angelegt
        if (tournament.matches.some((m: any) => m.stage === 'BRACKET')) {
            return { success: false, error: 'Die Playoffs wurden bereits erzeugt.' };
        }

        // Check if groups are actually done
        const unplayed = tournament.matches.filter((m: any) =>
            (m.stage === 'GROUP' || m.stage === 'GROUP_1' || m.stage === 'GROUP_2' || m.stage === 'LEAGUE') && !m.isPlayed
        );
        if (unplayed.length > 0) throw new Error('Alle Gruppenspiele müssen beendet sein.');

        if (playoffsRunning.has(tournamentId)) return { success: false, error: 'Die Playoffs werden gerade erzeugt.' };
        playoffsRunning.add(tournamentId);
        try {
            // Use the new Service
            const { TournamentService } = await import('@/lib/services/TournamentService');
            await TournamentService.generateKnockoutFromGroups(tournamentId);
        } finally {
            playoffsRunning.delete(tournamentId);
        }

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to start playoffs:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Fehler beim Starten der Playoffs' };
    }
}

export async function deleteTournament(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt' };

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (!tournament) return { success: false, error: 'Turnier nicht gefunden' };

        if (tournament.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann das Turnier löschen.' };
        }

        await prisma.$transaction(async (tx: any) => {
            await tx.match.deleteMany({ where: { tournamentId } });
            await tx.rSVP.deleteMany({ where: { tournamentId } });
            await tx.tournament.delete({ where: { id: tournamentId } });
        });

        revalidatePath('/tournaments');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete tournament:', error);
        return { success: false, error: 'Turnier konnte nicht gelöscht werden' };
    }
}

export async function finishTournament(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (tournament?.hostId && tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann das Turnier beenden.' };
        }

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { status: 'COMPLETED' }
        });

        // Broadcast completion
        await broadcastNotification({
            title: 'Turnier beendet',
            message: `"${tournament?.name}" ist vorbei! Klicke hier für die Ergebnisse.`,
            link: `/tournaments/${tournamentId}`,
            type: 'TOURNAMENT'
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Fehler beim Abschließen' };
    }
}

export async function sendTournamentInviteEmails(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt' };

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                participants: {
                    include: { player: { select: { email: true, name: true } } }
                }
            }
        });

        if (!tournament) return { success: false, error: 'Turnier nicht gefunden' };

        const { sendTournamentInviteEmail } = await import('@/lib/email');

        const results = await Promise.allSettled(
            tournament.participants
                .filter(p => p.player?.email)
                .map(p => sendTournamentInviteEmail(p.player!.email!, p.player!.name ?? 'Spieler', {
                    id: tournament.id,
                    name: tournament.name,
                    date: tournament.date,
                    location: tournament.location,
                    type: tournament.type,
                }))
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return { success: true, sent, failed };
    } catch (error) {
        console.error('sendTournamentInviteEmails error:', error);
        return { success: false, error: 'Fehler beim Senden' };
    }
}
export async function setTournamentLiveStreamUrl(tournamentId: string, url: string | null) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt' };

    const userId = session.user.id;
    const isAdmin = session.user.email === process.env.ADMIN_EMAIL;

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { participants: { include: { player: true } } }
        });

        if (!tournament) return { success: false, error: 'Turnier nicht gefunden' };

        const isHost = tournament.hostId === userId;
        const isParticipant = tournament.participants.some(p => p.player?.userId === userId);

        if (!isHost && !isParticipant && !isAdmin) {
            return { success: false, error: 'Keine Berechtigung den Stream zu steuern.' };
        }

        // Stopping: only the person who started it (or admin) may stop
        if (url === null) {
            const current = tournament.liveStreamUrl ?? '';
            if (current.startsWith('__webrtc__:')) {
                const startedBy = current.split(':')[1];
                if (startedBy !== userId && !isAdmin) {
                    return { success: false, error: 'Nur derjenige der den Stream gestartet hat kann ihn beenden.' };
                }
            } else if (current === '__webrtc__') {
                // Legacy: no userId stored — only host or admin may stop
                if (tournament.hostId !== userId && !isAdmin) {
                    return { success: false, error: 'Nur derjenige der den Stream gestartet hat kann ihn beenden.' };
                }
            }
        }

        // Starting: embed userId so we know who started
        const storeUrl = url === '__webrtc__' ? `__webrtc__:${userId}` : url;

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { liveStreamUrl: storeUrl },
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        revalidatePath(`/tournaments/${tournamentId}/tv`);
        revalidatePath('/admin/tournaments');

        return { success: true };
    } catch (error) {
        console.error('setTournamentLiveStreamUrl error:', error);
        return { success: false, error: 'Fehler beim Speichern des Stream-Status' };
    }
}

const editSchema = z.object({
    name: z.string().trim().min(1).max(100),
    // als ISO-Zeit mit Zeitzone vom Browser, damit die Uhrzeit nicht vom Server abhängt
    date: z.iso.datetime({ offset: true }),
    location: z.string().trim().min(1).max(200),
    tableCount: z.number().int().min(1).max(10),
    mode: z.enum(['SOLO', 'TEAM']),
    type: z.enum(['SINGLE_ELIMINATION', 'ELIMINATION', 'ROUND_ROBIN', 'GROUPS']),
    hasReturnLeg: z.boolean(),
    participantIds: z.array(z.string()).max(200),
});

export type TournamentEdit = z.infer<typeof editSchema>;

// Der Host bearbeitet sein Turnier, solange es noch nicht gestartet ist: Zeit, Ort, Modus, Tische und wer dabei ist
export async function editTournament(tournamentId: string, input: TournamentEdit) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt' };
    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Ungültige Angaben' };
    const data = parsed.data;

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { rsvps: true } });
        if (!tournament) return { success: false, error: 'Turnier nicht gefunden' };
        const isAdmin = session.user.email === process.env.ADMIN_EMAIL;
        if (tournament.hostId !== session.user.id && !isAdmin) return { success: false, error: 'Nur der Host kann das Turnier bearbeiten.' };
        if (tournament.status !== 'PLANNED') return { success: false, error: 'Das Turnier läuft schon und kann nicht mehr bearbeitet werden.' };

        // nur echte Spieler, keine Gäste
        const wanted = new Set(data.participantIds);
        const players = await prisma.player.findMany({ where: { id: { in: [...wanted] }, isGuest: false }, select: { id: true, userId: true, name: true } });
        const valid = new Set(players.map(p => p.id));
        const yes = new Set(tournament.rsvps.filter(r => r.status === 'YES').map(r => r.playerId));
        const added = players.filter(p => !yes.has(p.id));
        const removed = [...yes].filter(id => !valid.has(id));
        const date = new Date(data.date);
        const moved = date.getTime() !== tournament.date.getTime() || data.location !== tournament.location;

        await prisma.$transaction(async (tx: any) => {
            await tx.tournament.update({
                where: { id: tournamentId },
                data: { name: data.name, date, location: data.location, tableCount: data.tableCount, mode: data.mode, type: data.type, hasReturnLeg: data.hasReturnLeg },
            });
            for (const p of added) {
                await tx.rSVP.upsert({
                    where: { tournamentId_playerId: { tournamentId, playerId: p.id } },
                    update: { status: 'YES' },
                    create: { tournamentId, playerId: p.id, status: 'YES' },
                });
            }
            if (removed.length) await tx.rSVP.deleteMany({ where: { tournamentId, playerId: { in: removed } } });
            // Teams passen nicht mehr: ohne 2v2 gibt es keine, und wer raus ist, verlässt sein Team
            if (data.mode === 'SOLO') await tx.team.deleteMany({ where: { tournamentId } });
            else if (removed.length) await tx.team.deleteMany({ where: { tournamentId, OR: [{ player1Id: { in: removed } }, { player2Id: { in: removed } }] } });
        });

        const link = `/tournaments/${tournamentId}`;
        const { sendPushToUser } = await import('@/lib/push');
        for (const p of added) {
            if (p.userId && p.userId !== session.user.id) await sendPushToUser(p.userId, 'Du bist dabei!', `Du wurdest zu ${data.name} hinzugefügt.`, link);
        }
        // Zeit oder Ort geändert: alle Bisherigen bekommen Bescheid
        if (moved) {
            const informed = await prisma.player.findMany({ where: { id: { in: [...yes].filter(id => valid.has(id)) } }, select: { userId: true } });
            const when = date.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            for (const p of informed) {
                if (p.userId && p.userId !== session.user.id) await sendPushToUser(p.userId, 'Turnier geändert', `${data.name}: ${when} Uhr, ${data.location}`, link);
            }
        }

        revalidatePath(link);
        revalidatePath('/tournaments');
        return { success: true };
    } catch (error) {
        console.error('Failed to edit tournament:', error);
        return { success: false, error: 'Turnier konnte nicht gespeichert werden' };
    }
}
