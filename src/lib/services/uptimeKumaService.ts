import { io } from 'socket.io-client';

export interface KumaMaintenance {
    id: number;
    title: string;
    description: string;
    active: boolean;
    dateRange: string[];
    timeslotList: { startDate: string; endDate: string }[];
}

export interface KumaHeartbeat {
    status: number;
    time: string;
    msg: string;
    ping: number | null;
}

interface KumaData {
    maintenances: KumaMaintenance[];
    heartbeats: KumaHeartbeat[];
}

export let cache: KumaData | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000;

export async function getKumaData(monitorSlug: string): Promise<KumaData> {
    if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;

    const url = process.env.UPTIME_KUMA_URL ?? 'http://localhost:3001';
    const username = process.env.UPTIME_KUMA_USERNAME;
    const password = process.env.UPTIME_KUMA_PASSWORD;

    if (!username || !password) return { maintenances: [], heartbeats: [] };

    return new Promise((resolve) => {
        const socket = io(url, { transports: ['websocket'], timeout: 5000 });
        let done = false;
        let maintenances: KumaMaintenance[] = [];
        let heartbeats: KumaHeartbeat[] | null = null;
        let monitorId: string | null = null;

        const tryFinish = () => {
            if (done || heartbeats === null) return;
            done = true;
            clearTimeout(timer);
            socket.disconnect();
            const result = { maintenances, heartbeats };
            cache = result;
            cacheTime = Date.now();
            resolve(result);
        };

        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            socket.disconnect();
            resolve({ maintenances, heartbeats: heartbeats ?? [] });
        }, 8000);

        socket.on('connect', () => {
            socket.emit('login', { username, password }, (res: any) => {
                if (!res?.ok) { clearTimeout(timer); done = true; socket.disconnect(); resolve({ maintenances: [], heartbeats: [] }); }
            });
        });

        // Maintenance-Liste (kommt als Event nach Login)
        socket.on('maintenanceList', (data: Record<string, KumaMaintenance>) => {
            maintenances = Object.values(data ?? {});
        });

        // Monitor-Liste → finde Monitor-ID für unseren Slug
        socket.on('monitorList', (data: Record<string, any>) => {
            for (const [id, monitor] of Object.entries(data ?? {})) {
                // Suche nach dem Monitor der unsere URL überwacht
                if (monitor.url?.includes(monitorSlug) || monitor.name?.toLowerCase().includes(monitorSlug)) {
                    monitorId = id;
                    break;
                }
            }
            // Fallback: ersten Monitor nehmen
            if (!monitorId) monitorId = Object.keys(data ?? {})[0] ?? '1';
        });

        // Heartbeat-Liste
        socket.on('heartbeatList', (id: string, hbs: any[]) => {
            if (id === monitorId || (monitorId === null && id === '1')) {
                heartbeats = (hbs ?? []).map((h: any) => ({
                    status: h.status,
                    time: h.time,
                    msg: h.msg ?? '',
                    ping: h.ping ?? null,
                }));
                tryFinish();
            }
        });

        socket.on('connect_error', () => { clearTimeout(timer); done = true; resolve({ maintenances: [], heartbeats: [] }); });
    });
}

export function findMaintenanceForTime(
    time: string,
    maintenances: KumaMaintenance[]
): KumaMaintenance | null {
    const t = new Date(time.replace(' ', 'T')).getTime();
    if (isNaN(t)) return null;

    for (const m of maintenances) {
        for (const slot of m.timeslotList ?? []) {
            const start = new Date(slot.startDate.replace(' ', 'T')).getTime();
            const end = new Date(slot.endDate.replace(' ', 'T')).getTime();
            if (t >= start && t <= end) return m;
        }
        if (m.active && m.dateRange?.length === 2) {
            const start = new Date(m.dateRange[0].replace(' ', 'T')).getTime();
            const end = new Date(m.dateRange[1].replace(' ', 'T')).getTime();
            if (t >= start && t <= end) return m;
        }
    }
    return null;
}
