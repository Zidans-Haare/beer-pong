import 'server-only';
import { prisma } from '@/lib/prisma';
import { activeDecoration, isDecorationMode, type Decoration, type DecorationMode } from '@/lib/logo-decoration';

export async function getDecorationMode(): Promise<DecorationMode> {
    try {
        const settings = await prisma.systemSettings.findUnique({ where: { id: 'default' }, select: { logoDecoration: true } });
        return isDecorationMode(settings?.logoDecoration) ? settings.logoDecoration : 'auto';
    } catch {
        return 'auto';
    }
}

// Deko, die heute am Logo hängt
export async function getLogoDecoration(now = new Date()): Promise<Decoration | null> {
    return activeDecoration(now, await getDecorationMode());
}
