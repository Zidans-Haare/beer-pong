import { randomBytes } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = path.join(root, 'e2e', '.auth');
const databasePath = path.join(fixtureDirectory, `isolated-${Date.now()}.db`);
const portArgument = process.argv.indexOf('--port');
const port = Number(portArgument >= 0 ? process.argv[portArgument + 1] : process.env.E2E_PORT || 3100);
const appUrl = `http://localhost:${port}`;

if (process.env.E2E_MODE && process.env.E2E_MODE !== 'isolated') {
    throw new Error('This server only supports E2E_MODE=isolated.');
}
if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 3000) {
    throw new Error('Use a dedicated E2E port between 1024 and 65535, not 3000.');
}
if (process.env.E2E_BASE_URL && process.env.E2E_BASE_URL !== appUrl) {
    throw new Error('The isolated test server cannot use an external or existing app URL.');
}

const environment = {
    ...process.env,
    E2E_MODE: 'isolated',
    DATABASE_URL: `file:${databasePath.replaceAll('\\', '/')}`,
    AUTH_URL: appUrl,
    AUTH_SECRET: randomBytes(32).toString('base64'),
    AUTH_TRUST_HOST: 'true',
    APP_URL: appUrl,
    NEXT_PUBLIC_APP_URL: appUrl,
    NEXT_PUBLIC_APP_NAME: 'Beer Pong',
    NEXT_PUBLIC_LOCALE: 'de',
    NEXT_PUBLIC_DEMO_MODE: 'false',
    DEMO_MODE: 'false',
    NEXT_DIST_DIR: port === 3101 ? '.next-e2e' : `.next-e2e-${port}`,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${path.join(root, 'scripts', 'e2e-network.cjs').replaceAll('\\', '/')}"`,
    ADMIN_EMAIL: 'admin@matchday.test',
    WEBAUTHN_RP_ID: 'localhost',
    WEBAUTHN_ORIGIN: appUrl,
    RESEND_API_KEY: '',
    GEMINI_API_KEY: '',
    GOOGLE_API_KEY: '',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '',
    VAPID_PRIVATE_KEY: '',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: '',
    SENTRY_DSN: '',
    NEXT_PUBLIC_SENTRY_DSN: '',
    SENTRY_AUTH_TOKEN: '',
    UPTIME_KUMA_URL: '',
    DEPLOY_SECRET: '',
    NEXT_TELEMETRY_DISABLED: '1',
};

if (process.argv.includes('--check')) {
    console.log(JSON.stringify({ mode: environment.E2E_MODE, url: appUrl, databaseIsIsolated: path.dirname(databasePath) === fixtureDirectory, externalRequestsBlocked: environment.NODE_OPTIONS.includes('e2e-network.cjs'), mailDisabled: !environment.RESEND_API_KEY, pushDisabled: !environment.VAPID_PRIVATE_KEY }));
    process.exit(0);
}

mkdirSync(fixtureDirectory, { recursive: true });
execFileSync(process.execPath, [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], { cwd: root, env: environment, stdio: 'inherit' });

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databasePath }) });
const password = await bcrypt.hash('Matchday-test-2026', 10);
const identities = [
    { id: 'e2e-admin', name: 'Alex', email: 'admin@matchday.test', status: 'ACTIVE' },
    { id: 'e2e-host', name: 'Sam', email: 'host@matchday.test', status: 'ACTIVE' },
    { id: 'e2e-player', name: 'Robin', email: 'player@matchday.test', status: 'ACTIVE' },
    { id: 'e2e-pending', name: 'Taylor', email: 'pending@matchday.test', status: 'PENDING' },
];
for (const identity of identities) {
    await prisma.user.create({ data: { ...identity, password, player: { create: { id: `${identity.id}-player`, name: identity.name, nickname: identity.name, email: identity.email } } } });
}
for (let index = 0; index < 8; index++) {
    await prisma.player.create({ data: { id: `e2e-extra-${index}`, name: ['Jamie', 'Morgan', 'Casey', 'Charlie', 'Jules', 'Drew', 'Avery', 'Maximilian Alexander'][index] } });
}
const now = Date.now();
for (const fixture of [
    { id: 'e2e-planned', name: 'Friday Club', status: 'PLANNED', mode: 'SOLO', type: 'ELIMINATION', shortCode: 'CLUB26', date: new Date(now + 86400000), isRanked: false, offersGuestRoom: true, guestRoomCapacity: 4, guestRoomTitle: 'Club stay' },
    { id: 'e2e-active', name: 'Matchday Open', status: 'ACTIVE', mode: 'SOLO', type: 'ELIMINATION', shortCode: 'OPEN26', date: new Date(now - 3600000), isRanked: true },
    { id: 'e2e-team', name: 'Doubles Club', status: 'ACTIVE', mode: 'TEAM', type: 'ELIMINATION', shortCode: 'TEAM26', date: new Date(now - 1800000), isRanked: false },
    { id: 'e2e-league', name: 'Club League', status: 'ACTIVE', mode: 'SOLO', type: 'ROUND_ROBIN', shortCode: 'LIGA26', date: new Date(now - 3600000), isRanked: true },
    { id: 'e2e-groups', name: 'Weekend Cup', status: 'PLANNED', mode: 'SOLO', type: 'GROUPS', shortCode: 'CUP026', date: new Date(now + 172800000), isRanked: false },
    { id: 'e2e-completed', name: 'Last Matchday', status: 'COMPLETED', mode: 'SOLO', type: 'ELIMINATION', shortCode: 'LAST26', date: new Date(now - 604800000), isRanked: true },
]) {
    await prisma.tournament.create({ data: { ...fixture, location: 'Club House', hostId: 'e2e-host', tableCount: 2, participants: { create: ['e2e-host-player', 'e2e-player-player', 'e2e-extra-0', 'e2e-extra-1'].map(playerId => ({ playerId })) }, rsvps: { create: ['e2e-host-player', 'e2e-player-player', 'e2e-extra-0', 'e2e-extra-1'].map(playerId => ({ playerId, status: 'YES' })) } } });
}
for (const tournamentId of ['e2e-active', 'e2e-league', 'e2e-completed']) {
    await prisma.match.createMany({ data: [
        { id: `${tournamentId}-match-1`, tournamentId, player1Id: 'e2e-host-player', player2Id: 'e2e-player-player', round: 1, position: 0, tableNumber: 1, isPlayed: true, score1: 10, score2: 6, winnerId: 'e2e-host-player', completedAt: new Date(now - 1200000) },
        { id: `${tournamentId}-match-2`, tournamentId, player1Id: 'e2e-extra-0', player2Id: 'e2e-extra-1', round: 1, position: 1, tableNumber: 2 },
        { id: `${tournamentId}-match-3`, tournamentId, player1Id: 'e2e-host-player', player2Id: 'e2e-extra-0', round: 2, position: 0, tableNumber: 1 },
    ] });
}
await prisma.team.createMany({ data: [
    { id: 'e2e-team-1', tournamentId: 'e2e-team', name: 'Baseline Club', player1Id: 'e2e-host-player', player2Id: 'e2e-player-player' },
    { id: 'e2e-team-2', tournamentId: 'e2e-team', name: 'Sidecourt', player1Id: 'e2e-extra-0', player2Id: 'e2e-extra-1' },
] });
await prisma.match.create({ data: { id: 'e2e-team-match', tournamentId: 'e2e-team', team1Id: 'e2e-team-1', team2Id: 'e2e-team-2', round: 1, position: 0, tableNumber: 1 } });
await prisma.chatMessage.createMany({ data: [
    { userId: 'e2e-host', text: 'Doors open at six. See you at the tables.', createdAt: new Date(now - 600000) },
    { userId: 'e2e-player', text: 'Ready for the next round.', createdAt: new Date(now - 300000) },
] });
await prisma.notification.create({ data: { userId: 'e2e-host', type: 'TOURNAMENT', title: 'Matchday Open', message: 'Your next match is ready.', link: '/tournaments/e2e-active' } });
await prisma.guestPlayer.create({ data: { id: 'e2e-guest', name: 'Guest Player', tournamentId: 'e2e-planned', sessionToken: 'isolated-guest-session', expiresAt: new Date(now + 86400000) } });
await prisma.roomReservation.create({ data: { tournamentId: 'e2e-planned', userId: 'e2e-player', status: 'PENDING', wantsBreakfast: true } });
await prisma.passkey.create({ data: { userId: 'e2e-host', credentialId: 'isolated-credential', credentialPublicKey: new Uint8Array([1, 2, 3]), friendlyName: 'Test phone' } });
await prisma.bringItem.create({ data: { tournamentId: 'e2e-planned', category: 'SNACKS', userId: 'e2e-player', userName: 'Robin', quantity: 2, price: 6.5 } });
await prisma.systemSettings.create({ data: { rulesText: 'Respect the table. Play fair. Ten cups, one winner.', tableCount: 2 } });
await prisma.$disconnect();
writeFileSync(path.join(fixtureDirectory, 'isolated.json'), JSON.stringify({ url: appUrl, databasePath, mode: 'isolated' }));
console.log(`Isolated fixtures ready: ${appUrl}`);

if (!process.argv.includes('--fixtures-only')) {
    const server = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '--hostname', 'localhost', '--port', String(port)], { cwd: root, env: environment, stdio: 'inherit' });
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.kill(signal));
    server.once('exit', code => process.exit(code ?? 0));
}