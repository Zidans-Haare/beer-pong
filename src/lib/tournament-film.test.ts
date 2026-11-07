import { describe, it, expect } from 'vitest';
import { buildTournamentFilm, findFinal, lookFor, type FilmInput, type FilmMatch, type FilmParty, type Medal } from './tournament-film';

const party = (id: string): FilmParty => ({ ids: [id], names: [id], label: id });
const match = (a: string, b: string, s1: number, s2: number, extra: Partial<FilmMatch> = {}): FilmMatch => ({
    stage: 'LEAGUE', round: 1, completedAt: null, durationSeconds: null, score1: s1, score2: s2,
    side1: party(a), side2: party(b), winner: s1 > s2 ? 1 : 2, ...extra,
});
const t = (key: string, values?: Record<string, string | number>) => `${key}${values ? ` ${Object.values(values).join('|')}` : ''}`;

const podium = new Map<string, Medal>([['Nick', 'gold'], ['Moonzy', 'silver'], ['Heber', 'bronze']]);
const input: FilmInput = {
    name: ' Eaststreet ', date: new Date('2026-10-10T18:00:00Z'), playerCount: 4, podium,
    playerNames: new Map([['Nick', 'Nick'], ['Moonzy', 'Moonzy'], ['Heber', 'Heber']]),
    matches: [
        match('Nick', 'Moonzy', 4, 10),
        match('Nick', 'Heber', 10, 2, { durationSeconds: 900 }),
        match('Moonzy', 'Josie', 10, 9, { durationSeconds: 1500 }),
        match('Moonzy', 'Nick', 7, 10, { stage: 'BRACKET', round: 2 }),
        match('Heber', 'Josie', 10, 5, { stage: 'BRACKET', round: 2 }),
    ],
};

describe('findFinal', () => {
    it('nimmt das K.-o.-Spiel Gold gegen Silber, nicht das Ligaspiel', () => {
        const final = findFinal(input.matches, podium);
        expect(final?.stage).toBe('BRACKET');
        expect(final?.side1.label).toBe('Moonzy');
    });

    it('findet nichts, wenn Gold und Silber nie gegeneinander gespielt haben', () => {
        expect(findFinal([match('Nick', 'Heber', 10, 2)], podium)).toBeNull();
    });
});

describe('buildTournamentFilm', () => {
    const model = buildTournamentFilm(input, '#006b50', t, 'de-DE');

    it('stellt den Sieger nach vorn und übernimmt das Ergebnis aus seiner Sicht', () => {
        expect(model.final?.winner.label).toBe('Nick');
        expect(model.final?.loser.label).toBe('Moonzy');
        expect(model.final?.winnerScore).toBe(10);
        expect(model.final?.loserScore).toBe(7);
        expect(model.title).toBe('Eaststreet');
    });

    it('baut das Podium in der Reihenfolge der Plätze', () => {
        expect(model.podium.map(s => [s.place, s.label])).toEqual([[1, 'Nick'], [2, 'Moonzy'], [3, 'Heber']]);
    });

    it('nennt Becher, höchsten Sieg und längstes Spiel', () => {
        const text = model.facts.lines.join('\n');
        expect(model.facts.value).toBe('Nick');
        expect(text).toContain('factsGames 5|77');
        expect(text).toContain('factsTopScorer Moonzy|27');
        expect(text).toContain('factsBiggest Nick|10:2|Heber');
        expect(text).toContain('factsLongest 25|Moonzy|Josie');
    });

    it('kommt ohne Podium und ohne Ergebnisse aus', () => {
        const bare = buildTournamentFilm({ ...input, podium: new Map(), matches: [match('Nick', 'Heber', 0, 0, { winner: 1 })] }, '#006b50', t);
        expect(bare.final).toBeNull();
        expect(bare.podium).toEqual([]);
        expect(bare.facts.lines).toEqual(['factsGamesOnly 1']);
    });

    it('hält Teams auf dem Podium zusammen', () => {
        const team = (ids: string[]): FilmParty => ({ ids, names: ids, label: ids.join(' & ') });
        const teamInput: FilmInput = {
            ...input,
            podium: new Map<string, Medal>([['A', 'gold'], ['B', 'gold'], ['C', 'silver'], ['D', 'silver']]),
            matches: [{ ...match('x', 'y', 10, 6, { stage: 'BRACKET' }), side1: team(['A', 'B']), side2: team(['C', 'D']) }],
        };
        const film = buildTournamentFilm(teamInput, '#006b50', t);
        expect(film.podium.map(s => s.label)).toEqual(['A & B', 'C & D']);
        expect(film.podium[0].looks).toHaveLength(2);
        expect(film.final?.winner.names).toEqual(['A', 'B']);
    });
});

describe('lookFor', () => {
    it('gibt demselben Namen immer dasselbe Aussehen', () => {
        expect(lookFor('Nick')).toEqual(lookFor(' nick '));
        expect(lookFor('Nick', 3).shirt).not.toBe(lookFor('Nick').shirt);
    });

    it('zeichnet Moonzy immer dunkelhäutig, alle anderen hell', () => {
        expect(lookFor('Moonzy').skin).toBe('#7a4b2a');
        expect(lookFor(' moonzy ').skin).toBe('#7a4b2a');
        expect(lookFor('Nick').skin).toBe('#fbe3c0');
    });
});
