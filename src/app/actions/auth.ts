'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { createNotificationForUser } from '@/app/actions/notifications';
import { headers } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';
import logger from '@/lib/logger';

export async function registerUser(formData: FormData) {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (!await checkRateLimit(`register:${ip}`, 5, 10 * 60_000)) {
        return { success: false, error: 'Zu viele Versuche. Bitte in 10 Minuten erneut versuchen.' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!name || !email || !password) {
        return { success: false, error: 'Alle Felder müssen ausgefüllt sein.' };
    }

    if (password.length < 8) {
        return { success: false, error: 'Passwort muss mindestens 8 Zeichen lang sein.' };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const isAdmin = email === process.env.ADMIN_EMAIL;

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                status: isAdmin ? 'ACTIVE' : 'PENDING',
            },
        });

        // Auto-create Player profile
        await prisma.player.create({
            data: {
                name: newUser.name || 'Unknown',
                email: newUser.email,
                userId: newUser.id,
            }
        });

        if (isAdmin) {
            // Admin registers: auto-login
            await signIn('credentials', {
                email,
                password,
                redirect: false,
            });
            return { success: true, pending: false };
        }

        // Notify the admin about the new registration
        const adminUser = await prisma.user.findUnique({
            where: { email: process.env.ADMIN_EMAIL },
        });
        if (adminUser) {
            await createNotificationForUser({
                userId: adminUser.id,
                title: 'Neue Registrierung',
                message: `${name} (${email}) wartet auf Freigabe.`,
                link: '/admin/approvals',
                type: 'SYSTEM',
            });
        }

        return { success: true, pending: true };
    } catch (error) {
        logger.error({ err: error }, 'Registration error');
        return { success: false, error: 'User konnte nicht erstellt werden (Email evtl. vergeben).' };
    }
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
    if (!await checkRateLimit(`login:${ip}`, 10, 60_000)) {
        return 'Zu viele Login-Versuche. Bitte warte eine Minute.';
    }

    const email = formData.get('email') as string;

    // Check user status before attempting sign-in
    if (email) {
        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                if (user.status === 'PENDING') {
                    return 'Dein Account wartet noch auf Admin-Freigabe.';
                }
                if (user.status === 'REJECTED') {
                    return 'Dein Account wurde abgelehnt.';
                }
            }
        } catch {
            // Fall through to signIn which will handle other errors
        }
    }

    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Ungültige Anmeldedaten.';
                default:
                    return 'Etwas ist schiefgelaufen.';
            }
        }
        throw error;
    }
}
