'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { auth } from '@/auth';

const GUEST_SESSION_COOKIE = 'bierpong_guest_session';
const GUEST_LIFETIME_HOURS = 24 * 7; // 7 Tage

/**
 * Creates a guest player for a Spaß-Turnier
 */
export async function createGuestPlayer(name: string, tournamentId: string) {
    if (!name || name.trim().length < 2) {
        return { success: false, error: 'Name muss mindestens 2 Zeichen haben' };
    }

    // Verify tournament exists and is a Spaß-Turnier
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId }
    });

    if (!tournament) {
        return { success: false, error: 'Turnier nicht gefunden' };
    }

    if (tournament.isRanked) {
        return { success: false, error: 'Gäste sind nur bei Spaß-Turnieren erlaubt' };
    }

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + GUEST_LIFETIME_HOURS * 60 * 60 * 1000);

    try {
        const guest = await prisma.guestPlayer.create({
            data: {
                name: name.trim(),
                tournamentId,
                sessionToken,
                expiresAt
            }
        });

        // Set cookie for browser re-identification
        const cookieStore = await cookies();
        cookieStore.set(GUEST_SESSION_COOKIE, sessionToken, {
            expires: expiresAt,
            maxAge: GUEST_LIFETIME_HOURS * 60 * 60,
            httpOnly: true,
            secure: false, // auch über http persistent (Entwicklung + lokales Netz)
            sameSite: 'lax',
            path: '/'
        });

        return { success: true, guest };
    } catch (error) {
        console.error('Failed to create guest player:', error);
        return { success: false, error: 'Gast konnte nicht erstellt werden' };
    }
}

/**
 * Get current guest from session cookie
 */
export async function getCurrentGuest() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value;

    if (!sessionToken) {
        return null;
    }

    const guest = await prisma.guestPlayer.findUnique({
        where: {
            sessionToken,
            expiresAt: { gt: new Date() }
        },
        include: {
            tournament: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            }
        }
    });

    return guest;
}

/**
 * Get guest by ID
 */
export async function getGuestById(guestId: string) {
    return prisma.guestPlayer.findUnique({
        where: { id: guestId },
        include: {
            tournament: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            }
        }
    });
}

/**
 * Get all guests for a tournament
 */
export async function getTournamentGuests(tournamentId: string) {
    return prisma.guestPlayer.findMany({
        where: {
            tournamentId,
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'asc' }
    });
}

/**
 * Update guest name
 */
export async function updateGuestName(guestId: string, name: string) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value;

    if (!sessionToken) {
        return { success: false, error: 'Keine Gast-Session gefunden' };
    }

    const guest = await prisma.guestPlayer.findUnique({
        where: { id: guestId }
    });

    if (!guest || guest.sessionToken !== sessionToken) {
        return { success: false, error: 'Nicht autorisiert' };
    }

    try {
        const updated = await prisma.guestPlayer.update({
            where: { id: guestId },
            data: { name: name.trim() }
        });
        return { success: true, guest: updated };
    } catch (error) {
        return { success: false, error: 'Fehler beim Aktualisieren' };
    }
}

/**
 * Clean up expired guest players
 * Call this periodically or on-demand
 */
export async function cleanupExpiredGuests() {
    try {
        const result = await prisma.guestPlayer.deleteMany({
            where: {
                expiresAt: { lt: new Date() }
            }
        });
        return { success: true, deletedCount: result.count };
    } catch (error) {
        console.error('Failed to cleanup guests:', error);
        return { success: false, error: 'Cleanup fehlgeschlagen' };
    }
}

/**
 * Remove guest from tournament (by host or self)
 */
export async function removeGuest(guestId: string) {
    const session = await auth();

    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    try {
        const guest = await prisma.guestPlayer.findUnique({
            where: { id: guestId },
            include: { tournament: true }
        });

        if (!guest) {
            return { success: false, error: 'Gast nicht gefunden' };
        }

        // Only host or an admin (which we assume only host matters here for now as admin has different path)
        if (guest.tournament.hostId !== session.user.id) {
            return { success: false, error: 'Nur der Host kann Gäste entfernen' };
        }

        await prisma.guestPlayer.delete({
            where: { id: guestId }
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to remove guest:', error);
        return { success: false, error: 'Gast konnte nicht entfernt werden' };
    }
}

/**
 * Check if current user is a guest for a specific tournament
 */
export async function isGuestForTournament(tournamentId: string) {
    const guest = await getCurrentGuest();
    return guest?.tournamentId === tournamentId ? guest : null;
}

/**
 * Securely leave a tournament as a guest
 */
export async function leaveTournamentAsGuest(guestId: string, tournamentId: string) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(GUEST_SESSION_COOKIE)?.value;

    if (!sessionToken) {
        return { success: false, error: 'Keine Gast-Session gefunden' };
    }

    try {
        const guest = await prisma.guestPlayer.findUnique({
            where: { id: guestId }
        });

        if (!guest || guest.sessionToken !== sessionToken || guest.tournamentId !== tournamentId) {
            return { success: false, error: 'Nicht autorisiert' };
        }

        await prisma.guestPlayer.delete({
            where: { id: guestId }
        });

        // Clear the cookie
        cookieStore.set(GUEST_SESSION_COOKIE, '', { maxAge: 0 });

        return { success: true };
    } catch (error) {
        console.error('Failed to leave tournament as guest:', error);
        return { success: false, error: 'Fehler beim Verlassen' };
    }
}
