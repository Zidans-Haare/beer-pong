/**
 * Returns ICE server config (STUN + optionally Cloudflare TURN).
 * If CF_TURN_KEY_ID and CF_TURN_API_TOKEN are set, fetches temporary
 * TURN credentials from Cloudflare Calls API.
 */
export async function GET() {
    const keyId = process.env.CF_TURN_KEY_ID;
    const apiToken = process.env.CF_TURN_API_TOKEN;

    // Always include Google STUN as fallback
    const fallback = [{ urls: 'stun:stun.l.google.com:19302' }];

    if (!keyId || !apiToken) {
        return Response.json({ iceServers: fallback });
    }

    try {
        const res = await fetch(
            `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ttl: 86400 }),
            }
        );

        if (!res.ok) {
            console.error('Cloudflare TURN error:', res.status, await res.text());
            return Response.json({ iceServers: fallback });
        }

        const data = await res.json();
        // Cloudflare returns { iceServers: { urls: [...stun+turn...], username, credential } }
        // Wrap in array as RTCPeerConnection expects RTCIceServer[]
        return Response.json({ iceServers: [data.iceServers] });
    } catch (e) {
        console.error('Failed to fetch TURN credentials:', e);
        return Response.json({ iceServers: fallback });
    }
}
