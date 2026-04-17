'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// ── Color / text primitives ──────────────────────────────────────────────
type Color = 'magenta' | 'cyan' | 'green' | 'yellow' | 'red' | 'white' | 'dim' | 'default';

const COLOR_HEX: Record<Color, string> = {
    magenta: '#c778dd',
    cyan:    '#7fd1e3',
    green:   '#98c379',
    yellow:  '#e5c07b',
    red:     '#e06c75',
    white:   '#ffffff',
    dim:     '#6f7685',
    default: '#c8c8c8',
};

type Span = { text: string; color?: Color; bold?: boolean };

const s  = (text: string, color: Color = 'default', bold = false): Span => ({ text, color, bold });
const m  = (t: string, b = false) => s(t, 'magenta', b);
const c  = (t: string, b = false) => s(t, 'cyan', b);
const g  = (t: string, b = false) => s(t, 'green', b);
const y  = (t: string, b = false) => s(t, 'yellow', b);
const w  = (t: string, b = true)  => s(t, 'white', b);
const d  = (t: string) => s(t, 'dim');

// ── Frame types ──────────────────────────────────────────────────────────
type Frame =
    | { kind: 'line'; spans: Span[]; pause?: number }
    | { kind: 'blank'; pause?: number }
    | { kind: 'ask'; prompt: Span[]; answer: string; answerColor?: Color; typeMs?: number; pause?: number }
    | { kind: 'spinner'; step: [number, number]; label: string; durationMs: number; doneLabel: string; detail?: string; pause?: number };

// ── Script ───────────────────────────────────────────────────────────────
// All values below are obviously-fake placeholders. Do NOT put real data here.
const DEMO_DOMAIN       = 'beerping.example.com';
const DEMO_ADMIN_EMAIL  = 'demo-admin@example.com';
const DEMO_PORT         = '3000';
const DEMO_APP_NAME     = 'Beer Pong';
const DEMO_RESEND_KEY   = 're_xxxxxxxxxxxxxxxxxxxxxxxx';
const DEMO_SENTRY_DSN   = 'https://xxxxxxxxxxxxxxxxxxxxxxxx@o000000.ingest.sentry.io/000000';
const DEMO_MAPS_KEY     = 'AIzaSyD__example_placeholder_key__xxxx';

const W = 56;
const BOX_TOP = '┌' + '─'.repeat(W) + '┐';
const BOX_MID = '├' + '─'.repeat(W) + '┤';
const BOX_BOT = '└' + '─'.repeat(W) + '┘';

function boxLine(inner: Span[]): Span[] {
    return [m('│'), ...inner, m('│')];
}
function pad(spans: Span[], width: number): Span[] {
    const len = spans.reduce((n, sp) => n + sp.text.length, 0);
    const padding = Math.max(0, width - len);
    return [...spans, s(' '.repeat(padding))];
}
function center(spans: Span[], width: number): Span[] {
    const len = spans.reduce((n, sp) => n + sp.text.length, 0);
    const left = Math.max(0, Math.floor((width - len) / 2));
    const right = Math.max(0, width - len - left);
    return [s(' '.repeat(left)), ...spans, s(' '.repeat(right))];
}
function row(spans: Span[]): Span[] {
    return boxLine(center(spans, W));
}
function rowLeft(inner: Span[]): Span[] {
    return boxLine(pad(inner, W));
}

function line(...spans: Span[]): Frame { return { kind: 'line', spans, pause: 80 }; }
function blank(pause = 120): Frame { return { kind: 'blank', pause }; }

const SCRIPT: Frame[] = [
    blank(),
    line(m(BOX_TOP)),
    line(...row([])),
    line(...row([w('🍺  Beer Pong — Setup Wizard')])),
    line(...row([m('v1.0'), d('  ·  Self-hosting made easy')])),
    line(...row([])),
    line(m(BOX_BOT)),
    blank(),
    line(d('  Press '), w('Enter'), d(' to accept defaults  ·  '), w('Ctrl+C'), d(' to abort')),
    blank(300),

    // Mode select
    { kind: 'ask', prompt: [g('? '), w('Deployment target ')], answer: 'Production server', answerColor: 'yellow', pause: 200 },
    line(d('  full setup: nginx, SSL, PM2, cron')),
    blank(),

    { kind: 'ask', prompt: [g('? '), w('Language / Sprache '), d('(default: English) ')], answer: 'English', answerColor: 'cyan', pause: 150 },

    // Basic config
    blank(),
    line(m('  ⚙  '), w('Basic configuration')),
    line(m('  ' + '─'.repeat(W - 2))),
    { kind: 'ask', prompt: [g('? '), w('App name: ')], answer: DEMO_APP_NAME, answerColor: 'cyan', pause: 150 },

    blank(),
    line(d('  DNS — set these records at your domain registrar before continuing:')),
    line(d('  ┌─────────────────────────────────────────────────────┐')),
    line(d('  │  Type   Name        Value                           │')),
    line(d('  │  A      @           <your server IP>                │')),
    line(d('  │  A      www         <your server IP>   (optional)   │')),
    line(d('  └─────────────────────────────────────────────────────┘')),
    line(d('  SSL (certbot) requires the domain to already point to this server.')),
    blank(),

    { kind: 'ask', prompt: [g('? '), w('Domain (e.g. beerping.example.com): ')], answer: DEMO_DOMAIN, answerColor: 'cyan', pause: 150 },
    { kind: 'ask', prompt: [g('? '), w('App port: '), d('(default: 3000) ')], answer: DEMO_PORT, answerColor: 'cyan', pause: 100 },
    { kind: 'ask', prompt: [g('? '), w('Admin email: ')], answer: DEMO_ADMIN_EMAIL, answerColor: 'cyan', typeMs: 28, pause: 150 },
    { kind: 'ask', prompt: [g('? '), w('Confirm admin email: ')], answer: DEMO_ADMIN_EMAIL, answerColor: 'cyan', typeMs: 28, pause: 150 },

    // Database
    blank(),
    line(m('  🗄  '), w('Database')),
    line(m('  ' + '─'.repeat(W - 2))),
    { kind: 'ask', prompt: [g('? '), w('Weekly DB backup via cron? '), d('(Y/n) ')], answer: 'Yes', answerColor: 'green', pause: 150 },

    // Email
    blank(),
    line(m('  ✉  '), w('Email  (Resend)')),
    line(m('  ' + '─'.repeat(W - 2))),
    line(d('  Enables email notifications (e.g. account approval).')),
    line(d('  1. Create account at resend.com')),
    line(d('  2. Add & verify your domain → get SPF/DKIM DNS records')),
    line(d('  3. Create an API key with Sending access')),
    blank(),
    { kind: 'ask', prompt: [g('? '), w('Resend API key (leave empty to skip): ')], answer: DEMO_RESEND_KEY, answerColor: 'cyan', typeMs: 18, pause: 150 },
    { kind: 'ask', prompt: [g('? '), w('Sender email: '), d(`(default: noreply@${DEMO_DOMAIN}) `)], answer: `noreply@${DEMO_DOMAIN}`, answerColor: 'cyan', typeMs: 22, pause: 150 },

    // VAPID
    blank(),
    line(m('  🔔  '), w('Push Notifications  (VAPID)')),
    line(m('  ' + '─'.repeat(W - 2))),
    { kind: 'ask', prompt: [g('? '), w('Generate VAPID keys? '), d('(Y/n) ')], answer: 'Yes', answerColor: 'green', pause: 150 },

    // Sentry
    blank(),
    line(m('  🐛  '), w('Error Tracking  (Sentry)')),
    line(m('  ' + '─'.repeat(W - 2))),
    line(d('  Tracks runtime errors in production automatically.')),
    line(d('  1. Create account at sentry.io')),
    line(d('  2. New Project → Next.js → copy the DSN')),
    blank(),
    { kind: 'ask', prompt: [g('? '), w('Sentry DSN (leave empty to skip): ')], answer: DEMO_SENTRY_DSN, answerColor: 'cyan', typeMs: 12, pause: 150 },

    // Maps
    blank(),
    line(m('  🗺  '), w('Maps  (Google Maps)')),
    line(m('  ' + '─'.repeat(W - 2))),
    line(d('  Enables location autocomplete for tournaments (optional).')),
    line(d('  1. console.cloud.google.com → new project')),
    line(d('  2. Enable: Maps JavaScript API + Places API')),
    line(d('  3. Create API key → restrict to your domain')),
    blank(),
    { kind: 'ask', prompt: [g('? '), w('Google Maps API key (leave empty to skip): ')], answer: DEMO_MAPS_KEY, answerColor: 'cyan', typeMs: 14, pause: 200 },

    // Summary
    blank(),
    line(m(BOX_TOP)),
    line(...row([w('Summary')])),
    line(m(BOX_MID)),
    line(...rowLeft([d(' Mode       '), y('Production server')])),
    line(...rowLeft([d(' Domain     '), w(DEMO_DOMAIN)])),
    line(...rowLeft([d(' Port       '), w(DEMO_PORT)])),
    line(...rowLeft([d(' Admin      '), w(DEMO_ADMIN_EMAIL)])),
    line(...rowLeft([d(' Email      '), g('✓ Resend')])),
    line(...rowLeft([d(' VAPID      '), g('✓ generate')])),
    line(...rowLeft([d(' Sentry     '), g('✓ configured')])),
    line(...rowLeft([d(' DB backup  '), g('✓ weekly')])),
    line(m(BOX_BOT)),
    blank(300),

    { kind: 'ask', prompt: [g('? '), w('Start setup? '), d('(Y/n) ')], answer: 'Yes', answerColor: 'green', pause: 200 },
    blank(),

    // Progress steps
    { kind: 'spinner', step: [1, 8], label: 'Checking system dependencies…', doneLabel: 'System dependencies ready', durationMs: 1400 },
    { kind: 'spinner', step: [2, 8], label: 'Cloning repository…',           doneLabel: 'Repository ready', detail: '/home/demo/beer-pong', durationMs: 1600 },
    { kind: 'spinner', step: [3, 8], label: 'Generating .env…',              doneLabel: '.env ready', detail: '/home/demo/beer-pong/.env', durationMs: 1000 },
    { kind: 'spinner', step: [4, 8], label: 'Configuring nginx + SSL…',      doneLabel: 'Nginx configured', detail: `https://${DEMO_DOMAIN}`, durationMs: 2200 },
    { kind: 'spinner', step: [5, 8], label: 'Initializing database…',        doneLabel: 'Database initialized', durationMs: 1300 },
    { kind: 'spinner', step: [6, 8], label: 'Building app + PM2…',           doneLabel: 'App running', detail: `port ${DEMO_PORT}`, durationMs: 2600 },
    { kind: 'spinner', step: [7, 8], label: 'Setting up cron backup…',       doneLabel: 'Cron backup configured', detail: 'Sundays 02:00', durationMs: 900 },
    { kind: 'spinner', step: [8, 8], label: 'Installing shell aliases…',     doneLabel: 'Shell aliases installed', detail: 'run: source ~/.bashrc', durationMs: 800 },

    // Done
    blank(300),
    line(m(BOX_TOP)),
    line(...row([g('✓  Setup complete!', true)])),
    line(m(BOX_MID)),
    line(...row([])),
    line(...row([d('Next steps:')])),
    line(...row([w('  1.', true), d('  '), c('source ~/.bashrc'), d('  # activate bp-* commands')])),
    line(...row([w('  2.', true), d('  '), c(`https://${DEMO_DOMAIN}/register`)])),
    line(...row([d('      Create your admin account (email = ADMIN_EMAIL)')])),
    line(...row([])),
    line(m(BOX_MID)),
    line(...rowLeft([d('  bp-update               # update to latest version')])),
    line(...rowLeft([d('  bp-doctor               # check for issues')])),
    line(...rowLeft([d('  bp-doctor-fix           # check + auto-fix issues')])),
    line(...rowLeft([d('  bp-logs                 # view logs')])),
    line(...rowLeft([d('  bp-maint-on / off       # maintenance mode')])),
    line(...rowLeft([d('  bp-restart              # restart app')])),
    line(m(BOX_MID)),
    line(...row([w('Auto-Updates via GitHub Webhook')])),
    line(...row([])),
    line(...rowLeft([d('  In your GitHub repo → Settings → Webhooks:')])),
    line(...rowLeft([d('  Payload URL:  '), c(`https://${DEMO_DOMAIN}/api/deploy`)])),
    line(...rowLeft([d('  Content type: '), w('application/json')])),
    line(...rowLeft([d('  Secret:       '), w('DEPLOY_SECRET'), d(' from .env')])),
    line(...rowLeft([d('  Event:        '), w('Just the push event')])),
    line(...row([])),
    line(m(BOX_BOT)),
    blank(600),
    line(g('  ★ '), d('End of simulation — nothing was actually installed.')),
];

// ── Rendered line type ───────────────────────────────────────────────────
type RenderedLine = {
    id: number;
    spans: Span[];
};

// ── Component ────────────────────────────────────────────────────────────
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function renderSpans(spans: Span[], keyPrefix: string) {
    return spans.map((sp, i) => (
        <span
            key={`${keyPrefix}-${i}`}
            style={{
                color: COLOR_HEX[sp.color ?? 'default'],
                fontWeight: sp.bold ? 700 : 400,
            }}
        >
            {sp.text}
        </span>
    ));
}

export default function WizardTerminal() {
    const [committed, setCommitted] = useState<RenderedLine[]>([]);
    const [active, setActive] = useState<Span[] | null>(null);
    const [spinnerIdx, setSpinnerIdx] = useState(0);
    const [speed, setSpeed] = useState<1 | 2 | 4>(1);
    const [playing, setPlaying] = useState(true);
    const [done, setDone] = useState(false);

    const speedRef  = useRef(speed);
    const playRef   = useRef(playing);
    const cancelRef = useRef(false);
    const nextIdRef = useRef(1);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { speedRef.current = speed; }, [speed]);
    useEffect(() => { playRef.current = playing; }, [playing]);

    // Spinner tick — drives the visible spinner character
    useEffect(() => {
        const int = setInterval(() => setSpinnerIdx((i) => (i + 1) % SPINNER_FRAMES.length), 80);
        return () => clearInterval(int);
    }, []);

    // Sleep that honours speed, pause, and cancellation. Elapsed time is only
    // accumulated while `playing` is true, so Pause actually pauses.
    const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
            const target = ms / speedRef.current;
            let elapsed = 0;
            let last = Date.now();
            const tick = () => {
                if (cancelRef.current) { resolve(); return; }
                const now = Date.now();
                if (playRef.current) {
                    elapsed += Math.min(100, now - last);
                }
                last = now;
                if (elapsed >= target) { resolve(); return; }
                setTimeout(tick, 40);
            };
            tick();
        });

    const appendLine = (spans: Span[]) => {
        const id = nextIdRef.current++;
        setCommitted((prev) => [...prev, { id, spans }]);
    };

    // Run the script once on mount
    useEffect(() => {
        let cancelled = false;
        cancelRef.current = false;

        (async () => {
            for (const frame of SCRIPT) {
                if (cancelled || cancelRef.current) return;

                if (frame.kind === 'line') {
                    appendLine(frame.spans);
                    await sleep(frame.pause ?? 80);
                } else if (frame.kind === 'blank') {
                    appendLine([s(' ')]);
                    await sleep(frame.pause ?? 80);
                } else if (frame.kind === 'ask') {
                    // Typewriter the answer after printing the prompt
                    const typeSpeed = frame.typeMs ?? 40;
                    const answerColor: Color = frame.answerColor ?? 'default';
                    let typed = '';
                    for (const ch of frame.answer) {
                        if (cancelled || cancelRef.current) return;
                        typed += ch;
                        setActive([...frame.prompt, s(typed, answerColor, true)]);
                        await sleep(typeSpeed);
                    }
                    // Small pause, then commit
                    await sleep(160);
                    appendLine([...frame.prompt, s(frame.answer, answerColor, true)]);
                    setActive(null);
                    await sleep(frame.pause ?? 120);
                } else if (frame.kind === 'spinner') {
                    const [n, total] = frame.step;
                    const prefix = `  [${n}/${total}] `;
                    const buildActive = (spinChar: string): Span[] => [
                        m('  '), m(spinChar), m(` [${n}/${total}] `), w(frame.label),
                    ];
                    // Use a live spinner via the shared spinnerIdx — but we need
                    // this frame to re-render with the current tick. We set active
                    // to a placeholder and rely on the outer render using spinnerIdx.
                    setActive(buildActive(SPINNER_FRAMES[0]));
                    await sleep(frame.durationMs);
                    if (cancelled || cancelRef.current) return;
                    appendLine([
                        g('  ✔', true), d(prefix), w(frame.doneLabel),
                        ...(frame.detail ? [d('  '), d(frame.detail)] : []),
                    ]);
                    setActive(null);
                    await sleep(frame.pause ?? 180);
                }
            }
            if (!cancelled) setDone(true);
        })();

        return () => {
            cancelled = true;
            cancelRef.current = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll on new content
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [committed, active]);

    // Active spinner line: if it contains a spinner placeholder we re-build it
    // with the current spinnerIdx so the braille dots animate.
    const liveActive = useMemo(() => {
        if (!active) return null;
        // Detect a spinner line by the shape: [m('  '), m('⠋'), m(' [x/y] '), w(label)]
        if (
            active.length >= 4 &&
            active[1].color === 'magenta' &&
            SPINNER_FRAMES.includes(active[1].text)
        ) {
            return [
                active[0],
                { ...active[1], text: SPINNER_FRAMES[spinnerIdx] },
                ...active.slice(2),
            ];
        }
        return active;
    }, [active, spinnerIdx]);

    function restart() {
        cancelRef.current = true;
        setCommitted([]);
        setActive(null);
        setDone(false);
        nextIdRef.current = 1;
        // Remount the effect by toggling a key on the wrapper? Simpler:
        // force a reload by navigating to the same route.
        window.location.reload();
    }

    return (
        <div>
            {/* Terminal window */}
            <div style={{
                background: '#0e0f13',
                border: '1px solid rgba(199, 120, 221, 0.25)',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
            }}>
                {/* Title bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: '#1a1c22',
                    borderBottom: '1px solid #2a2d36',
                }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
                    <span style={{
                        marginLeft: '12px',
                        color: '#8a8f9a',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.8rem',
                    }}>
                        demo@beer-pong ~ $  npx github:Zidans-Haare/beer-pong -- --mode server
                    </span>
                </div>

                {/* Body */}
                <div
                    ref={scrollRef}
                    style={{
                        padding: '14px 16px 18px 16px',
                        height: 'min(70vh, 620px)',
                        overflowY: 'auto',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontSize: '0.82rem',
                        lineHeight: 1.55,
                        whiteSpace: 'pre',
                        color: COLOR_HEX.default,
                        background: '#0e0f13',
                    }}
                >
                    {committed.map((l) => (
                        <div key={l.id}>{renderSpans(l.spans, `l${l.id}`)}</div>
                    ))}
                    {liveActive && (
                        <div>
                            {renderSpans(liveActive, 'active')}
                            <span
                                aria-hidden
                                style={{
                                    display: 'inline-block',
                                    width: '0.55em',
                                    height: '1em',
                                    marginLeft: '2px',
                                    background: COLOR_HEX.default,
                                    verticalAlign: '-2px',
                                    animation: 'blink 1s steps(2) infinite',
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--spacing-3)',
                alignItems: 'center',
                marginTop: 'var(--spacing-4)',
            }}>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPlaying((p) => !p)}
                    disabled={done}
                    style={{ minWidth: 96 }}
                >
                    {done ? 'Finished' : playing ? 'Pause' : 'Resume'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={restart}>
                    Restart
                </button>
                <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                    {[1, 2, 4].map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setSpeed(v as 1 | 2 | 4)}
                            className="btn"
                            style={{
                                padding: '6px 12px',
                                fontSize: '0.82rem',
                                background: speed === v ? 'var(--color-primary)' : 'var(--color-surface-hover)',
                                color: speed === v ? '#fff' : 'var(--color-text)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                            }}
                            aria-pressed={speed === v}
                        >
                            {v}×
                        </button>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes blink {
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
