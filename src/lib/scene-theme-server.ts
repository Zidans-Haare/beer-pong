import 'server-only';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DEFAULT_THEME, isSceneTheme, type SceneTheme } from '@/lib/scene-theme';

// Gewählter Hintergrund der angemeldeten Person; ohne Anmeldung das Stadion
export async function getSceneTheme(userId?: string | null): Promise<SceneTheme> {
    const id = userId ?? (await auth())?.user?.id;
    if (!id) return DEFAULT_THEME;
    const user = await prisma.user.findUnique({ where: { id }, select: { sceneTheme: true } });
    return isSceneTheme(user?.sceneTheme) ? user.sceneTheme : DEFAULT_THEME;
}
