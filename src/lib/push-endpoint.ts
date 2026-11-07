// Nur echte Web-Push-Dienste: Der Server schickt Nachrichten an diese Adressen, beliebige Adressen wären SSRF
const ALLOWED = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^(.+\.)?push\.apple\.com$/, /^(.+\.)?notify\.windows\.com$/];

export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
    if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
    let url: URL;
    try { url = new URL(endpoint); } catch { return false; }
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && ALLOWED.some(r => r.test(host));
}
