'use strict';

if (process.env.E2E_MODE === 'isolated') {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async function isolatedFetch(input, options) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
        if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
            return new Response(JSON.stringify({ message: 'External requests are disabled in isolated tests.' }), { status: 503, headers: { 'content-type': 'application/json' } });
        }
        return originalFetch(input, options);
    };
}