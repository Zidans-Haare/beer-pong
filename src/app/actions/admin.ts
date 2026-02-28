'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

async function checkAdmin() {
    const session = await auth();
    if (!session?.user?.id || session.user.email !== process.env.ADMIN_EMAIL) {
        throw new Error('Unauthorized');
    }
    return session;
}

export async function getUsers() {
    await checkAdmin();
    try {
        const users = await prisma.user.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                _count: {
                    select: {
                        hostedTournaments: true,
                    }
                }
            }
        });
        return { success: true, users };
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return { success: false, error: 'Failed to fetch users' };
    }
}

export async function resetUserPassword(userId: string, newPassword: string) {
    await checkAdmin();

    if (newPassword.length < 6) {
        return { success: false, error: 'Passwort muss mindestens 6 Zeichen lang sein' };
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Also update the linked Player if needed (but Player model doesn't store password)

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to reset password:', error);
        return { success: false, error: 'Reset failed' };
    }
}

export async function deleteUser(userId: string) {
    await checkAdmin();
    try {
        await prisma.user.delete({ where: { id: userId } });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Delete failed' };
    }
}

export async function getSystemSettings() {
    await checkAdmin();
    try {
        const settings = await (prisma as any).systemSettings.findUnique({
            where: { id: 'default' }
        });
        if (!settings) {
            // Create default if not exists
            return await (prisma as any).systemSettings.create({
                data: { id: 'default', matchDurationMin: 15, tableCount: 1 }
            });
        }
        return settings;
    } catch (error) {
        console.error('Failed to get settings:', error);
        return { id: 'default', matchDurationMin: 15, tableCount: 1 };
    }
}

export async function getPublicSystemSettings() {
    try {
        const settings = await (prisma as any).systemSettings.findUnique({
            where: { id: 'default' }
        });
        if (!settings) {
            // Return default if not exists
            return { id: 'default', matchDurationMin: 15, tableCount: 1 };
        }
        return settings;
    } catch (error) {
        console.error('Failed to get settings:', error);
        return { id: 'default', matchDurationMin: 15, tableCount: 1 };
    }
}

export async function updateSystemSettings(formData: FormData) {
    await checkAdmin();

    const rawDuration = formData.get('matchDurationMin');
    const rawTableCount = formData.get('tableCount');

    const matchDurationMin = rawDuration ? parseInt(rawDuration as string) : 15;
    const tableCount = rawTableCount ? parseInt(rawTableCount as string) : 1;

    // Validation (ensure they are valid numbers and within reasonable range)
    const validDuration = isNaN(matchDurationMin) || matchDurationMin < 1 ? 15 : matchDurationMin;
    const validTableCount = isNaN(tableCount) || tableCount < 1 ? 1 : tableCount;

    try {
        await (prisma as any).systemSettings.upsert({
            where: { id: 'default' },
            update: { matchDurationMin: validDuration, tableCount: validTableCount },
            create: { id: 'default', matchDurationMin: validDuration, tableCount: validTableCount }
        });
        revalidatePath('/admin');
        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to update settings:', error);
        return { success: false, error: 'Update failed' };
    }
}

export async function getPlannedTournaments() {
    await checkAdmin();
    try {
        const tournaments = await prisma.tournament.findMany({
            where: { status: 'PLANNED' },
            orderBy: { date: 'asc' },
            include: {
                rsvps: {
                    where: { status: 'YES' },
                    include: { player: { select: { id: true, name: true } } }
                }
            }
        });
        return { success: true, tournaments };
    } catch (error) {
        console.error('Failed to fetch planned tournaments:', error);
        return { success: false, error: 'Failed to fetch tournaments' };
    }
}

export async function getRegisteredPlayers() {
    await checkAdmin();
    try {
        const players = await prisma.player.findMany({
            where: {
                userId: { not: null },
                isGuest: false
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                nickname: true,
                user: { select: { id: true, email: true } }
            }
        });
        return { success: true, players };
    } catch (error) {
        console.error('Failed to fetch players:', error);
        return { success: false, error: 'Failed to fetch players' };
    }
}

export async function adminAddPlayerToTournament(playerId: string, tournamentId: string) {
    await checkAdmin();

    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
        if (!tournament) return { success: false, error: 'Turnier nicht gefunden' };
        if (tournament.status !== 'PLANNED') return { success: false, error: 'Turnier ist nicht mehr in der Lobby-Phase' };

        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: { user: true }
        });
        if (!player || !player.userId) return { success: false, error: 'Spieler nicht gefunden oder kein registrierter Nutzer' };

        const existing = await prisma.rSVP.findUnique({
            where: {
                tournamentId_playerId: { tournamentId, playerId }
            }
        });

        if (existing?.status === 'YES') {
            return { success: false, error: `${player.name} ist bereits angemeldet` };
        }

        await prisma.rSVP.upsert({
            where: {
                tournamentId_playerId: { tournamentId, playerId }
            },
            update: { status: 'YES' },
            create: { tournamentId, playerId, status: 'YES' }
        });

        const { emitPlayerJoined } = await import('@/lib/realtime');
        emitPlayerJoined(tournamentId, { id: player.id, name: player.name });

        revalidatePath(`/tournaments/${tournamentId}`);
        revalidatePath('/admin/tournaments');
        return { success: true, playerName: player.name };
    } catch (error) {
        console.error('Failed to add player to tournament:', error);
        return { success: false, error: 'Fehler beim Hinzufügen' };
    }
}

export async function getPendingUsers() {
    await checkAdmin();
    try {
        const users = await prisma.user.findMany({
            where: { status: 'PENDING' },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                // createdAt not directly available but we can use emailVerified or skip
            }
        });
        return { success: true, users };
    } catch (error) {
        console.error('Failed to fetch pending users:', error);
        return { success: false, users: [], error: 'Failed to fetch pending users' };
    }
}

export async function approveUser(userId: string) {
    await checkAdmin();
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' },
        });

        const { createNotificationForUser } = await import('@/app/actions/notifications');
        await createNotificationForUser({
            userId,
            title: 'Account freigegeben!',
            message: 'Dein Account wurde vom Admin freigegeben. Du kannst dich jetzt einloggen.',
            link: '/login',
            type: 'SYSTEM',
        });

        revalidatePath('/admin/approvals');
        return { success: true };
    } catch (error) {
        console.error('Failed to approve user:', error);
        return { success: false, error: 'Approve failed' };
    }
}

export async function rejectUser(userId: string) {
    await checkAdmin();
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'REJECTED' },
        });

        revalidatePath('/admin/approvals');
        return { success: true };
    } catch (error) {
        console.error('Failed to reject user:', error);
        return { success: false, error: 'Reject failed' };
    }
}

export async function getPublicGlobalDurationStats() {
    try {
        const { getGlobalDurationStats } = await import('@/lib/duration');
        return await getGlobalDurationStats();
    } catch (error) {
        console.error('Failed to get duration stats:', error);
        return { averageSeconds: 720, averageMinutes: 12, matchCount: 0, isCalculated: false };
    }
}

