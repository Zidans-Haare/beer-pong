'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { primeFilmAudio } from '@/lib/tournament-audio';

// Play-Knopf zum Turnierfilm. Schaltet beim Tippen schon den Ton frei, damit er ab dem ersten Bild läuft.
export default function FilmLink({ tournamentId, title, text }: { tournamentId: string; title: string; text: string }) {
    return (
        <Link href={`/tournaments/${tournamentId}/film`} className="film-link" onClick={primeFilmAudio}>
            <span className="film-link-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
            <span className="film-link-text">
                <strong>{title}</strong>
                <span>{text}</span>
            </span>
        </Link>
    );
}
