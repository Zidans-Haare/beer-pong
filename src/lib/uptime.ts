import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

// Holt die Heartbeats von Uptime Kuma, speichert sie und liefert die letzten 7 Tage
export async function syncAndGetUptimeData() {
    const url = process.env.UPTIME_KUMA_URL ?? 'http://localhost:3001';
    const slug = process.env.UPTIME_KUMA_SLUG ?? 'bier';

    // Lokale Wartungsdaten aus maintenance-msg.txt lesen (geschrieben von maintenance-on.sh)
    let localMaintenance: { msg: string; start: string; end: string } | null = null;
    try {
        const raw = fs.readFileSync(path.join(process.cwd(), 'public', 'maintenance-msg.txt'), 'utf-8');
        localMaintenance = JSON.parse(raw);
    } catch { /* keine Wartung aktiv */ }

    // Öffentliche API für aktuelle Heartbeats
    let liveHeartbeats: any[] = [];
    let uptime24h = 1;
    try {
        const res = await fetch(`${url}/api/status-page/heartbeat/${slug}`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            const monitorId = Object.keys(data.heartbeatList ?? {})[0];
            liveHeartbeats = monitorId ? (data.heartbeatList[monitorId] ?? []) : [];
            uptime24h = monitorId ? (data.uptimeList?.[`${monitorId}_24`] ?? 1) : 1;
        }
    } catch { /* ignorieren */ }

    // Wartungs-Zeitfenster berechnen
    const maintStartMs = localMaintenance ? new Date(localMaintenance.start).getTime() : NaN;
    const maintEndMs = localMaintenance ? new Date(localMaintenance.end).getTime() : NaN;
    const maintStart = isNaN(maintStartMs) ? null : maintStartMs;
    const maintEnd = isNaN(maintEndMs) ? null : maintEndMs;

    // Neue Heartbeats in DB speichern (mit sofortigem Wartungsstatus)
    if (liveHeartbeats.length > 0) {
        await Promise.allSettled(liveHeartbeats.map((hb: any) => {
            const t = new Date(hb.time).getTime();
            const inMaint = maintStart !== null && maintEnd !== null && t >= maintStart && t <= maintEnd;
            return prisma.uptimeHeartbeat.upsert({
                where: { time: new Date(hb.time) },
                create: { time: new Date(hb.time), status: inMaint ? 3 : hb.status, ping: hb.ping ?? 0, msg: hb.msg ?? '' },
                update: {},
            });
        }));
        await prisma.uptimeHeartbeat.deleteMany({
            where: { time: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        });
    }

    // Wenn Wartung aktiv: bestehende DB-Einträge im Wartungsfenster dauerhaft als Status 3 speichern
    if (maintStart !== null && maintEnd !== null) {
        await prisma.uptimeHeartbeat.updateMany({
            where: { time: { gte: new Date(maintStart), lte: new Date(maintEnd) }, status: { not: 3 } },
            data: { status: 3 },
        });
    }

    // DB-Daten lesen
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stored = await prisma.uptimeHeartbeat.findMany({
        where: { time: { gte: since } },
        orderBy: { time: 'asc' },
    });

    // Wartungs-Zeitfenster anwenden
    const heartbeats = stored.map(h => {
        const t = h.time.getTime();
        const inMaint = maintStart !== null && maintEnd !== null && t >= maintStart && t <= maintEnd;
        return {
            status: inMaint ? 3 : h.status,
            time: h.time.toISOString(),
            msg: inMaint ? (localMaintenance!.msg || 'Wartung') : h.msg,
            ping: h.ping,
        };
    });

    const maintenanceList = localMaintenance ? [{
        title: 'Wartung',
        description: localMaintenance.msg || undefined,
        timeslotList: [{ startDate: localMaintenance.start, endDate: localMaintenance.end }],
    }] : [];

    return { heartbeats, uptime24h, maintenanceList };
}
