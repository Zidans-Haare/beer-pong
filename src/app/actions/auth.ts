'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function registerUser(formData: FormData) {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!name || !email || !password) {
        return { success: false, error: 'Alle Felder müssen ausgefüllt sein.' };
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Auto-create Player profile
        await prisma.player.create({
            data: {
                name: newUser.name || 'Unknown',
                email: newUser.email,
                userId: newUser.id,
                // Default image or other fields can remain null
            }
        });

        // Auto Login after Registration
        await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        return { success: true };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'User konnte nicht erstellt werden (Email evtl. vergeben).' };
    }
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        await signIn('credentials', {
            ...Object.fromEntries(formData),
            redirectTo: '/',
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}
