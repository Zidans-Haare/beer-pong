'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { isSceneTheme } from '@/lib/scene-theme';

// Hintergrund der Szenen speichern; gilt im Minispiel, in Wrapped und im Turnierfilm
export async function setSceneTheme(theme: unknown) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt' };
    if (!isSceneTheme(theme)) return { success: false, error: 'Unbekannter Hintergrund' };
    await prisma.user.update({ where: { id: session.user.id }, data: { sceneTheme: theme } });
    return { success: true };
}
