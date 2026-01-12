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
