import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

// Hinweis auf der Startseite, sobald ein Rückblick veröffentlicht ist
export default function WrappedBanner({ title, text, cta }: { title: string; text: string; cta: string }) {
    return (
        <Link href="/wrapped" className="wrapped-banner">
            <span className="wrapped-banner-icon"><Sparkles size={22} aria-hidden="true" /></span>
            <span className="wrapped-banner-text">
                <strong>{title}</strong>
                <span>{text}</span>
            </span>
            <span className="wrapped-banner-cta">{cta} <ArrowRight size={16} aria-hidden="true" /></span>
        </Link>
    );
}
