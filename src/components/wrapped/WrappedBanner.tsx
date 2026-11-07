import WrappedLink from './WrappedLink';
import { Sparkles, ArrowRight } from 'lucide-react';

// Hinweis auf der Startseite, sobald ein Rückblick veröffentlicht ist
// seen: schon angesehen, dann ruhig und ohne Animation
export default function WrappedBanner({ title, text, cta, seen = false }: { title: string; text: string; cta: string; seen?: boolean }) {
    return (
        <WrappedLink href="/wrapped" className={`wrapped-banner${seen ? ' is-seen' : ''}`}>
            <span className="wrapped-banner-icon"><Sparkles size={22} aria-hidden="true" /></span>
            <span className="wrapped-banner-text">
                <strong>{title}</strong>
                <span>{text}</span>
            </span>
            <span className="wrapped-banner-cta">{cta} <ArrowRight size={16} aria-hidden="true" /></span>
        </WrappedLink>
    );
}
