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
