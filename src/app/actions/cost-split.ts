'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { sendCostSummaryEmail } from '@/lib/email';
import { isAdmin } from '@/lib/admin';

type Debt = { fromUserId: string; fromName: string; toUserId: string; toName: string; amount: number };

function computeSettlement(
    items: { userId: string; userName: string; price: number | null }[],
    participantUserIds: string[],
    participantNames: Record<string, string>,
) {
    const totalCost = items.reduce((s, i) => s + (i.price ?? 0), 0);
    const count = participantUserIds.length;
    if (totalCost === 0 || count === 0) return { totalCost: 0, perPerson: 0, debts: [] as Debt[] };

    const perPerson = Math.round((totalCost / count) * 100) / 100;

    const balance: Record<string, { name: string; amount: number }> = {};
    for (const uid of participantUserIds) {
        balance[uid] = { name: participantNames[uid] ?? uid, amount: -perPerson };
    }
    for (const item of items) {
        if (item.price != null && item.price > 0) {
            if (!balance[item.userId]) balance[item.userId] = { name: item.userName, amount: 0 };
            balance[item.userId].amount += item.price;
            balance[item.userId].name = item.userName;
        }
    }

    const cred = Object.entries(balance).filter(([, b]) => b.amount > 0.01)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([id, b]) => ({ id, name: b.name, amount: b.amount }));
    const debt = Object.entries(balance).filter(([, b]) => b.amount < -0.01)
        .sort((a, b) => a[1].amount - b[1].amount)
        .map(([id, b]) => ({ id, name: b.name, amount: -b.amount }));

    const debts: Debt[] = [];
    let ci = 0, di = 0;
    while (ci < cred.length && di < debt.length) {
        const pay = Math.round(Math.min(cred[ci].amount, debt[di].amount) * 100) / 100;
        if (pay > 0.01) {
            debts.push({ fromUserId: debt[di].id, fromName: debt[di].name, toUserId: cred[ci].id, toName: cred[ci].name, amount: pay });
        }
        cred[ci].amount -= pay;
        debt[di].amount -= pay;
        if (cred[ci].amount < 0.01) ci++;
        if (debt[di].amount < 0.01) di++;
    }

    return { totalCost, perPerson, debts };
}

export async function sendCostSummaryEmails(tournamentId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Nicht eingeloggt.' };

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            rsvps: {
                where: { status: 'YES' },
                include: { player: { include: { user: { select: { id: true, email: true, paypalMeUrl: true } } } } },
            },
            bringItems: true,
        },
    });

    if (!tournament) return { success: false, error: 'Turnier nicht gefunden.' };

    const isHost = tournament.hostId === session.user.id;
    if (!isHost && !isAdmin(session.user.email)) return { success: false, error: 'Keine Berechtigung.' };

    // Build participant map userId → {name, email, paypalMeUrl}
    const participants: Record<string, { name: string; email: string | null; paypalMeUrl: string | null }> = {};
    for (const rsvp of tournament.rsvps) {
        const uid = rsvp.player?.user?.id;
        if (!uid) continue;
        participants[uid] = {
            name: rsvp.player.name,
            email: rsvp.player.user?.email ?? rsvp.player.email ?? null,
            paypalMeUrl: rsvp.player.user?.paypalMeUrl ?? null,
        };
    }

    const participantUserIds = Object.keys(participants);
    const participantNames = Object.fromEntries(Object.entries(participants).map(([id, p]) => [id, p.name]));
    const paypalHandles = Object.fromEntries(
        Object.entries(participants).map(([id, p]) => [id, p.paypalMeUrl ?? ''])
    );

    const items = tournament.bringItems.map(i => ({ userId: i.userId, userName: i.userName, price: i.price, category: i.category, quantity: i.quantity }));
    const { totalCost, perPerson, debts } = computeSettlement(items, participantUserIds, participantNames);

    if (totalCost === 0) return { success: false, error: 'Keine Kosten eingetragen.' };

    const adminEmail = process.env.ADMIN_EMAIL;
    let sent = 0;
    const errors: string[] = [];

    // Send personalized email to each participant
    for (const [uid, participant] of Object.entries(participants)) {
        const email = participant.email;
        if (!email) continue;

        const myDebts = debts.filter(d => d.fromUserId === uid);
        const myCredits = debts.filter(d => d.toUserId === uid);

        try {
            await sendCostSummaryEmail({
                to: email,
                recipientName: participant.name,
                tournamentName: tournament.name,
                items,
                totalCost,
                perPerson,
                myDebts: myDebts.map(d => ({ toName: d.toName, amount: d.amount, paypalUrl: (tournament as any).usePaypal ? (paypalHandles[d.toUserId] ?? null) : null })),
                myCredits: myCredits.map(d => ({ fromName: d.fromName, amount: d.amount })),
                allDebts: debts,
            });
            sent++;
        } catch (e) {
            errors.push(`${participant.name}: ${e}`);
        }
    }

    // Send full summary to admin if not already a participant
    if (adminEmail && !Object.values(participants).some(p => p.email === adminEmail)) {
        try {
            await sendCostSummaryEmail({
                to: adminEmail,
                recipientName: 'Admin',
                tournamentName: tournament.name,
                items,
                totalCost,
                perPerson,
                myDebts: [],
                myCredits: [],
                allDebts: debts,
                isAdmin: true,
            });
            sent++;
        } catch (e) {
            errors.push(`Admin: ${e}`);
        }
    }

    return { success: true, sent, errors };
}
