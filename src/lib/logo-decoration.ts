// Deko am Logo zu Anlässen im Jahr. Im Admin wählbar: automatisch nach Datum, aus, oder ein Anlass fest.
// Alle Tage gelten in deutscher Zeit, auch wenn der Server in UTC läuft.

export const DECORATIONS = ['christmas', 'newyear', 'easter', 'halloween', 'oktoberfest'] as const;
export type Decoration = typeof DECORATIONS[number];
export type DecorationMode = 'auto' | 'off' | Decoration;
export const DECORATION_MODES: readonly DecorationMode[] = ['auto', 'off', ...DECORATIONS];
export const isDecorationMode = (value: unknown): value is DecorationMode => typeof value === 'string' && (DECORATION_MODES as readonly string[]).includes(value);

// Tag als Zahl JJJJMMTT, damit sich Zeiträume einfach vergleichen lassen
type Day = number;
const day = (y: number, m: number, d: number): Day => y * 10000 + m * 100 + d;
const fromDate = (date: Date): Day => day(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
const addDays = (y: number, m: number, d: number, n: number) => new Date(Date.UTC(y, m - 1, d + n));

// Kalendertag in Berlin
export function berlinDay(date: Date): { y: number; m: number; d: number } {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const get = (type: string) => Number(parts.find(p => p.type === type)!.value);
    return { y: get('year'), m: get('month'), d: get('day') };
}

// Ostersonntag nach der Gaußschen Osterformel (gregorianisch)
export function easterSunday(y: number): Date {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), dayOfMonth = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, month - 1, dayOfMonth));
}

// Wiesn: beginnt am Samstag nach dem 15. September, endet am ersten Oktobersonntag, frühestens am 3. Oktober
export function oktoberfest(y: number): { start: Date; end: Date } {
    const sep16 = new Date(Date.UTC(y, 8, 16));
    const start = addDays(y, 9, 16, (6 - sep16.getUTCDay() + 7) % 7);
    const oct1 = new Date(Date.UTC(y, 9, 1));
    let end = addDays(y, 10, 1, (7 - oct1.getUTCDay()) % 7);
    if (end.getUTCDate() < 3) end = new Date(Date.UTC(y, 9, 3));
    return { start, end };
}

// Zeiträume eines Jahres (einschließlich erstem und letztem Tag)
export function decorationCalendar(y: number): { decoration: Decoration; start: Date; end: Date }[] {
    const easter = easterSunday(y);
    const wiesn = oktoberfest(y);
    const ey = easter.getUTCFullYear(), em = easter.getUTCMonth() + 1, ed = easter.getUTCDate();
    return [
        { decoration: 'newyear', start: new Date(Date.UTC(y - 1, 11, 27)), end: new Date(Date.UTC(y, 0, 6)) },
        { decoration: 'easter', start: addDays(ey, em, ed, -13), end: addDays(ey, em, ed, 1) },
        { decoration: 'oktoberfest', start: wiesn.start, end: wiesn.end },
        { decoration: 'halloween', start: new Date(Date.UTC(y, 9, 25)), end: new Date(Date.UTC(y, 9, 31)) },
        { decoration: 'christmas', start: new Date(Date.UTC(y, 11, 1)), end: new Date(Date.UTC(y, 11, 26)) },
        { decoration: 'newyear', start: new Date(Date.UTC(y, 11, 27)), end: new Date(Date.UTC(y + 1, 0, 6)) },
    ];
}

// Welche Deko heute gilt
export function activeDecoration(now: Date, mode: DecorationMode): Decoration | null {
    if (mode === 'off') return null;
    if (mode !== 'auto') return mode;
    const { y, m, d } = berlinDay(now);
    const today = day(y, m, d);
    const hit = decorationCalendar(y).find(e => today >= fromDate(e.start) && today <= fromDate(e.end));
    return hit?.decoration ?? null;
}
