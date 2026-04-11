'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { sendRoomReservationConfirmedEmail } from '@/lib/email';

export async function requestRoom(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });

        if (!tournament || !tournament.offersGuestRoom) {
            return { success: false, error: 'Turnier bietet kein Gästezimmer an' };
        }

        const existingRequest = await prisma.roomReservation.findFirst({
            where: { tournamentId, userId: session.user.id }
        });
        if (existingRequest) {
            return { success: false, error: 'Du hast bereits eine Anfrage gestellt' };
        }

        // Capacity check: count confirmed reservations
        const capacity = (tournament as any).guestRoomCapacity ?? 0;
        if (capacity > 0) {
            const confirmed = await prisma.roomReservation.count({
                where: { tournamentId, status: 'CONFIRMED' }
            });
            if (confirmed >= capacity) {
                return { success: false, error: 'Das Zimmer ist bereits ausgebucht' };
            }
        }

        await prisma.roomReservation.create({
            data: {
                tournamentId: tournamentId,
                userId: session.user.id,
                status: 'PENDING'
            }
        });

        revalidatePath(`/tournaments/${tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to request room:', error);
        return { success: false, error: 'Fehler beim Anfragen des Zimmers' };
    }
}

export async function acceptRoomRequest(reservationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const reservation = await prisma.roomReservation.findUnique({
            where: { id: reservationId },
            include: {
                tournament: true,
                user: true
            }
        });

        if (!reservation) return { success: false, error: 'Reservierung nicht gefunden' };

        if (reservation.tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann Reservierungen verwalten' };
        }

        const hostUser = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        await prisma.roomReservation.update({
            where: { id: reservationId },
            data: { status: 'CONFIRMED' }
        });

        // Send confirmation email
        if (reservation.user.email) {
            const baseDescription = (reservation.tournament as any).guestRoomDescription || 'Privatzimmer';
            let extrasStr = '';
            if (reservation.wantsBreakfast && reservation.wantsHalfBoard) extrasStr = ' (inkl. Frühstück & Halbpension)';
            else if (reservation.wantsHalfBoard) extrasStr = ' (inkl. Halbpension)';
            else if (reservation.wantsBreakfast) extrasStr = ' (inkl. Frühstück)';

            await sendRoomReservationConfirmedEmail(
                reservation.user.email,
                reservation.user.name || 'Gast',
                reservation.tournament.name,
                (reservation.tournament as any).guestRoomTitle || hostUser?.name || 'Dein Host',
                baseDescription + extrasStr,
                reservation.tournament.date,
                hostUser?.email || undefined
            );
        }

        revalidatePath(`/tournaments/${reservation.tournamentId}`);
        return { success: true };
    } catch (error) {
        console.error('Failed to accept room request:', error);
        return { success: false, error: 'Fehler beim Bestätigen' };
    }
}

export async function rejectRoomRequest(reservationId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const reservation = await prisma.roomReservation.findUnique({
            where: { id: reservationId },
            include: { tournament: true }
        });

        if (!reservation) return { success: false, error: 'Reservierung nicht gefunden' };

        if (reservation.tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann Reservierungen verwalten' };
        }

        await prisma.roomReservation.update({
            where: { id: reservationId },
            data: { status: 'REJECTED' }
        });

        revalidatePath(`/tournaments/${reservation.tournamentId}`);
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Fehler beim Ablehnen' };
    }
}
