/**
 * DRY RUN: Echtes Turnier-Simulation
 * 8 Spieler, Gruppenphase + K.O., ohne Rückrunde, 2 Tische
 *
 * Ausführen: npx tsx scripts/dry-run.ts
 */

import { prisma } from '../src/lib/prisma';
import { generateGroupStageMatches } from '../src/lib/brackets';

// Simulierte Spielergebnisse (realistisch, keine Unentschieden in K.O.)
function simulateScore(isKO: boolean = false): [number, number] {
    const score1 = Math.floor(Math.random() * 6) + 5; // 5-10
    let score2 = Math.floor(Math.random() * 6) + 3; // 3-8

    // In K.O. kein Unentschieden
    if (isKO && score1 === score2) {
        score2 = score1 - 1;
    }

    return [score1, score2];
}

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 DRY RUN: Gruppenphase + K.O. mit 8 Spielern');
    console.log('='.repeat(70) + '\n');

    // 1. Hole 8 Spieler aus der Datenbank
    const players = await prisma.player.findMany({ take: 8 });

    if (players.length < 8) {
        console.log('❌ Nicht genug Spieler in der Datenbank! Brauche 8, habe:', players.length);
        console.log('   Erstelle Test-Spieler...\n');

        // Erstelle fehlende Test-Spieler
        for (let i = players.length + 1; i <= 8; i++) {
            const player = await prisma.player.create({
                data: {
                    name: `Test Spieler ${i}`,
                    nickname: `Tester${i}`,
                    isGuest: true
                }
            });
            players.push(player);
        }
    }

    console.log('👥 SPIELER:');
    players.forEach((p, i) => console.log(`   ${i + 1}. ${p.name} (${p.nickname || 'kein Nickname'})`));
    console.log();

    // 2. Erstelle Turnier
    const tournament = await prisma.tournament.create({
        data: {
            name: 'DRY RUN Turnier',
            date: new Date(),
            location: 'Test Location',
            type: 'GROUPS',
            status: 'PLANNED',
            hasReturnLeg: false,
            tableCount: 2,
            matchDurationMin: 15,
            mode: 'SOLO',
            isRanked: false, // Kein Einfluss auf echte Statistiken
            shortCode: 'DRYRUN'
        }
    });

    console.log(`🏆 TURNIER ERSTELLT: ${tournament.name} (ID: ${tournament.id})\n`);

    // 3. Füge Spieler zur Lobby hinzu (RSVPs)
    for (const player of players) {
        await prisma.rSVP.create({
            data: {
                tournamentId: tournament.id,
                playerId: player.id,
                status: 'YES'
            }
        });
    }
    console.log('✅ 8 Spieler zur Lobby hinzugefügt\n');

    // 4. Generiere Gruppenspiele
    const matchInputs = generateGroupStageMatches(tournament.id, players.map(p => p.id), false);

    // Erstelle Matches in der Datenbank
    for (const input of matchInputs) {
        await prisma.match.create({
            data: {
                tournamentId: input.tournamentId,
                round: input.round,
                position: input.position,
                stage: input.stage,
                player1Id: input.player1Id,
                player2Id: input.player2Id,
                isPlayed: false
            }
        });
    }

    // Update Tournament Status
    await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'IN_PROGRESS' }
    });

    // Hole alle Matches
    let matches = await prisma.match.findMany({
        where: { tournamentId: tournament.id },
        include: { player1: true, player2: true },
        orderBy: [{ stage: 'asc' }, { round: 'asc' }, { position: 'asc' }]
    });

    const group1Matches = matches.filter(m => m.stage === 'GROUP_1');
    const group2Matches = matches.filter(m => m.stage === 'GROUP_2');

    console.log('📊 GRUPPENPHASE GENERIERT:');
    console.log(`   Gruppe 1: ${group1Matches.length} Spiele`);
    console.log(`   Gruppe 2: ${group2Matches.length} Spiele`);
    console.log(`   Gesamt: ${matches.length} Spiele\n`);

    // 5. Spiele Gruppenphase durch
    console.log('🎮 GRUPPENPHASE SIMULATION:');
    console.log('-'.repeat(70));

    // Standings tracking
    const standings: Map<string, {
        playerId: string,
        name: string,
        group: string,
        played: number,
        won: number,
        drawn: number,
        lost: number,
        goalsFor: number,
        goalsAgainst: number
    }> = new Map();

    // Initialize standings
    for (const match of matches) {
        if (match.player1Id && !standings.has(match.player1Id)) {
            const player = players.find(p => p.id === match.player1Id);
            standings.set(match.player1Id, {
                playerId: match.player1Id,
                name: player?.name || 'Unknown',
                group: match.stage === 'GROUP_1' ? 'G1' : 'G2',
                played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
            });
        }
        if (match.player2Id && !standings.has(match.player2Id)) {
            const player = players.find(p => p.id === match.player2Id);
            standings.set(match.player2Id, {
                playerId: match.player2Id,
                name: player?.name || 'Unknown',
                group: match.stage === 'GROUP_1' ? 'G1' : 'G2',
                played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0
            });
        }
    }

    // Play group matches
    for (const match of matches) {
        if (!match.player1Id || !match.player2Id) continue;

        const [score1, score2] = simulateScore(false);
        const winnerId = score1 > score2 ? match.player1Id : score1 < score2 ? match.player2Id : null;

        await prisma.match.update({
            where: { id: match.id },
            data: { score1, score2, winnerId, isPlayed: true }
        });

        // Update standings
        const s1 = standings.get(match.player1Id)!;
        const s2 = standings.get(match.player2Id)!;

        s1.played++; s2.played++;
        s1.goalsFor += score1; s1.goalsAgainst += score2;
        s2.goalsFor += score2; s2.goalsAgainst += score1;

        if (score1 > score2) {
            s1.won++; s2.lost++;
        } else if (score2 > score1) {
            s2.won++; s1.lost++;
        } else {
            s1.drawn++; s2.drawn++;
        }

        console.log(`   ${match.stage}: ${match.player1?.name} ${score1}:${score2} ${match.player2?.name}`);
    }

    // 6. Zeige Gruppenstand
    console.log('\n📈 GRUPPENSTAND NACH GRUPPENPHASE:');
    console.log('-'.repeat(70));

    for (const group of ['G1', 'G2']) {
        console.log(`\n   GRUPPE ${group === 'G1' ? '1' : '2'}:`);
        console.log('   Pl | Spieler              | Sp | S | U | N | Tore  | Diff | Pkt');
        console.log('   ' + '-'.repeat(65));

        const groupStandings = Array.from(standings.values())
            .filter(s => s.group === group)
            .map(s => ({
                ...s,
                points: s.won * 3 + s.drawn,
                diff: s.goalsFor - s.goalsAgainst
            }))
            .sort((a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor);

        groupStandings.forEach((s, i) => {
            const name = s.name.padEnd(20);
            const goals = `${s.goalsFor}:${s.goalsAgainst}`.padStart(5);
            const diff = (s.diff >= 0 ? '+' : '') + s.diff;
            console.log(`   ${i + 1}. | ${name} | ${s.played}  | ${s.won} | ${s.drawn} | ${s.lost} | ${goals} | ${diff.padStart(4)} | ${s.points}`);
        });
    }

    // 7. Generiere Playoffs (Halbfinale, Finale, 3. Platz)
    console.log('\n\n⚔️  PLAYOFFS GENERIEREN:');
    console.log('-'.repeat(70));

    // Hole Top 2 aus jeder Gruppe
    const getTop2 = (group: string) => {
        return Array.from(standings.values())
            .filter(s => s.group === group)
            .map(s => ({
                ...s,
                points: s.won * 3 + s.drawn,
                diff: s.goalsFor - s.goalsAgainst
            }))
            .sort((a, b) => b.points - a.points || b.diff - a.diff || b.goalsFor - a.goalsFor)
            .slice(0, 2);
    };

    const top2G1 = getTop2('G1');
    const top2G2 = getTop2('G2');

    console.log(`   G1-1.: ${top2G1[0].name} (${top2G1[0].points} Pkt)`);
    console.log(`   G1-2.: ${top2G1[1].name} (${top2G1[1].points} Pkt)`);
    console.log(`   G2-1.: ${top2G2[0].name} (${top2G2[0].points} Pkt)`);
    console.log(`   G2-2.: ${top2G2[1].name} (${top2G2[1].points} Pkt)\n`);

    // Kreuz-Paarungen: G1-1 vs G2-2, G2-1 vs G1-2
    const sf1 = { p1: top2G1[0], p2: top2G2[1] };
    const sf2 = { p1: top2G2[0], p2: top2G1[1] };

    // Erstelle Halbfinale
    const semi1 = await prisma.match.create({
        data: {
            tournamentId: tournament.id,
            round: 1,
            position: 0,
            stage: 'BRACKET',
            player1Id: sf1.p1.playerId,
            player2Id: sf1.p2.playerId,
            isPlayed: false
        }
    });

    const semi2 = await prisma.match.create({
        data: {
            tournamentId: tournament.id,
            round: 1,
            position: 1,
            stage: 'BRACKET',
            player1Id: sf2.p1.playerId,
            player2Id: sf2.p2.playerId,
            isPlayed: false
        }
    });

    console.log('   HALBFINALE:');
    console.log(`   HF1: ${sf1.p1.name} vs ${sf1.p2.name}`);
    console.log(`   HF2: ${sf2.p1.name} vs ${sf2.p2.name}\n`);

    // Spiele Halbfinale
    const [sf1Score1, sf1Score2] = simulateScore(true);
    const sf1Winner = sf1Score1 > sf1Score2 ? sf1.p1 : sf1.p2;
    const sf1Loser = sf1Score1 > sf1Score2 ? sf1.p2 : sf1.p1;

    await prisma.match.update({
        where: { id: semi1.id },
        data: { score1: sf1Score1, score2: sf1Score2, winnerId: sf1Winner.playerId, isPlayed: true }
    });

    const [sf2Score1, sf2Score2] = simulateScore(true);
    const sf2Winner = sf2Score1 > sf2Score2 ? sf2.p1 : sf2.p2;
    const sf2Loser = sf2Score1 > sf2Score2 ? sf2.p2 : sf2.p1;

    await prisma.match.update({
        where: { id: semi2.id },
        data: { score1: sf2Score1, score2: sf2Score2, winnerId: sf2Winner.playerId, isPlayed: true }
    });

    console.log(`   HF1 Ergebnis: ${sf1.p1.name} ${sf1Score1}:${sf1Score2} ${sf1.p2.name} → ${sf1Winner.name} weiter`);
    console.log(`   HF2 Ergebnis: ${sf2.p1.name} ${sf2Score1}:${sf2Score2} ${sf2.p2.name} → ${sf2Winner.name} weiter\n`);

    // Erstelle Finale
    const final = await prisma.match.create({
        data: {
            tournamentId: tournament.id,
            round: 2,
            position: 0,
            stage: 'BRACKET',
            player1Id: sf1Winner.playerId,
            player2Id: sf2Winner.playerId,
            isPlayed: false
        }
    });

    // Erstelle 3. Platz Spiel
    const thirdPlace = await prisma.match.create({
        data: {
            tournamentId: tournament.id,
            round: 2,
            position: 1,
            stage: 'BRACKET',
            player1Id: sf1Loser.playerId,
            player2Id: sf2Loser.playerId,
            isPlayed: false
        }
    });

    console.log('   🏆 FINALE:');
    console.log(`   ${sf1Winner.name} vs ${sf2Winner.name}\n`);

    console.log('   🥉 SPIEL UM PLATZ 3:');
    console.log(`   ${sf1Loser.name} vs ${sf2Loser.name}\n`);

    // Spiele Finale
    const [fScore1, fScore2] = simulateScore(true);
    const champion = fScore1 > fScore2 ? sf1Winner : sf2Winner;
    const runnerUp = fScore1 > fScore2 ? sf2Winner : sf1Winner;

    await prisma.match.update({
        where: { id: final.id },
        data: { score1: fScore1, score2: fScore2, winnerId: champion.playerId, isPlayed: true }
    });

    // Spiele 3. Platz
    const [tpScore1, tpScore2] = simulateScore(true);
    const thirdPlaceWinner = tpScore1 > tpScore2 ? sf1Loser : sf2Loser;
    const fourthPlace = tpScore1 > tpScore2 ? sf2Loser : sf1Loser;

    await prisma.match.update({
        where: { id: thirdPlace.id },
        data: { score1: tpScore1, score2: tpScore2, winnerId: thirdPlaceWinner.playerId, isPlayed: true }
    });

    // Turnier abschließen
    await prisma.tournament.update({
        where: { id: tournament.id },
        data: { status: 'COMPLETED' }
    });

    // 8. Endergebnis
    console.log('\n' + '='.repeat(70));
    console.log('🎊 TURNIER BEENDET - ENDERGEBNIS:');
    console.log('='.repeat(70));
    console.log(`\n   Finale: ${sf1Winner.name} ${fScore1}:${fScore2} ${sf2Winner.name}`);
    console.log(`   3. Platz: ${sf1Loser.name} ${tpScore1}:${tpScore2} ${sf2Loser.name}\n`);
    console.log(`   🥇 1. Platz: ${champion.name}`);
    console.log(`   🥈 2. Platz: ${runnerUp.name}`);
    console.log(`   🥉 3. Platz: ${thirdPlaceWinner.name}`);
    console.log(`      4. Platz: ${fourthPlace.name}\n`);

    // Statistiken
    const allMatches = await prisma.match.findMany({
        where: { tournamentId: tournament.id }
    });

    console.log('📊 TURNIER-STATISTIK:');
    console.log(`   Gesamtspiele: ${allMatches.length}`);
    console.log(`   Gruppenspiele: ${allMatches.filter(m => m.stage !== 'BRACKET').length}`);
    console.log(`   K.O.-Spiele: ${allMatches.filter(m => m.stage === 'BRACKET').length}`);
    console.log(`   Tische: 2`);
    console.log(`   Geschätzte Dauer: ~2 Stunden\n`);

    console.log(`\n✅ Turnier kann in der App angesehen werden:`);
    console.log(`   http://localhost:3000/tournaments/${tournament.id}\n`);

    // Cleanup option
    console.log('🧹 Aufräumen? Führe aus:');
    console.log(`   npx tsx -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.match.deleteMany({where:{tournamentId:'${tournament.id}'}}).then(() => p.rSVP.deleteMany({where:{tournamentId:'${tournament.id}'}})).then(() => p.tournament.delete({where:{id:'${tournament.id}'}})).then(() => console.log('Gelöscht!')).finally(() => p.\\$disconnect())"\n`);
}

main()
    .catch(console.error)
    .finally(() => process.exit(0));
