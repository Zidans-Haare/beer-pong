import type { Decoration } from '@/lib/logo-decoration';

// Kleine gezeichnete Deko am Logo (keine Emojis). `mark` hängt am Bierkrug, `text` sitzt hinter dem Schriftzug.
export function DecorationMark({ decoration }: { decoration: Decoration }) {
    if (decoration === 'christmas') {
        // Weihnachtsmütze schief auf dem Krug, der Bommel wippt
        return (
            <svg className="logo-deco logo-deco-hat" viewBox="0 0 40 34" aria-hidden="true">
                <path d="M7 26 C10 15 18 6 30 5 C27 12 27 19 30 26 Z" fill="#d62828" />
                <path d="M15 12 C18 9 22 7 26 6.5" stroke="#ff6b6b" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
                <rect x="4" y="23.5" width="29" height="8" rx="4" fill="#fdfdfd" stroke="#e5e5e5" strokeWidth="0.8" />
                <circle className="logo-deco-bobble" cx="31" cy="5.5" r="4.6" fill="#fdfdfd" stroke="#e5e5e5" strokeWidth="0.8" />
            </svg>
        );
    }
    if (decoration === 'newyear') {
        // gestreifter Partyhut
        return (
            <svg className="logo-deco logo-deco-party" viewBox="0 0 30 34" aria-hidden="true">
                <defs>
                    <clipPath id="party-cone"><path d="M4 30 L15 3 L26 30 Z" /></clipPath>
                </defs>
                <g clipPath="url(#party-cone)">
                    <rect x="0" y="0" width="30" height="34" fill="#7c3aed" />
                    {[0, 1, 2, 3].map(i => <rect key={i} x="-10" y={8 + i * 7} width="50" height="3.2" fill="#ffd23f" transform="rotate(-18 15 17)" />)}
                </g>
                <ellipse cx="15" cy="30" rx="11.5" ry="2.6" fill="#5b21b6" />
                <circle className="logo-deco-bobble" cx="15" cy="3" r="3.4" fill="#ff4fa3" />
            </svg>
        );
    }
    if (decoration === 'easter') {
        // ein Ei lehnt am Krug
        return <Egg className="logo-deco logo-deco-egg-mark" color="#7dd3fc" stripe="#0284c7" />;
    }
    return null;
}

export function DecorationText({ decoration }: { decoration: Decoration }) {
    if (decoration === 'easter') {
        return (
            <span className="logo-deco-row" aria-hidden="true">
                <Egg className="logo-deco logo-deco-egg" color="#fda4af" stripe="#e11d48" />
                <Egg className="logo-deco logo-deco-egg is-tilt" color="#fde68a" stripe="#d97706" dots />
                <Egg className="logo-deco logo-deco-egg" color="#a7f3d0" stripe="#059669" />
            </span>
        );
    }
    if (decoration === 'halloween') {
        return (
            <span className="logo-deco-row" aria-hidden="true">
                <svg className="logo-deco logo-deco-pumpkin" viewBox="0 0 34 30" aria-hidden="true">
                    <path d="M17 6 C17 3 18 1.5 20.5 1" stroke="#3f6212" strokeWidth="2.6" fill="none" strokeLinecap="round" />
                    <ellipse cx="10" cy="17" rx="8.5" ry="11" fill="#ea580c" />
                    <ellipse cx="24" cy="17" rx="8.5" ry="11" fill="#ea580c" />
                    <ellipse cx="17" cy="17" rx="8.5" ry="12" fill="#f97316" />
                    <path d="M10 14 L13 11 L15 14 Z M19 14 L21 11 L24 14 Z" fill="#1c1917" />
                    <path d="M9 19 Q17 27 25 19 L22 20 L20 18 L17 20.5 L14 18 L12 20 Z" fill="#1c1917" />
                </svg>
                <svg className="logo-deco logo-deco-bat" viewBox="0 0 40 18" aria-hidden="true">
                    <path d="M20 6 C18 3 17 3 16 5 C12 2 6 2 1 6 C5 7 7 9 8 12 C10 9 13 9 15 11 C16 9 18 9 20 10 C22 9 24 9 25 11 C27 9 30 9 32 12 C33 9 35 7 39 6 C34 2 28 2 24 5 C23 3 22 3 20 6 Z" fill="#292524" />
                </svg>
            </span>
        );
    }
    if (decoration === 'newyear') {
        return (
            <span className="logo-deco-row" aria-hidden="true">
                {[0, 1, 2].map(i => (
                    <svg key={i} className={`logo-deco logo-deco-spark is-${i}`} viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill={['#ffd23f', '#ff4fa3', '#38bdf8'][i]} />
                    </svg>
                ))}
            </span>
        );
    }
    if (decoration === 'oktoberfest') {
        return (
            <span className="logo-deco-row" aria-hidden="true">
                <svg className="logo-deco logo-deco-pretzel" viewBox="0 0 40 30" aria-hidden="true">
                    {/* großer Bogen oben, unten zwei überkreuzte Arme */}
                    <path d="M11 25 C3 22 3 10 10 6 C15 3 20 7 20 12 C20 7 25 3 30 6 C37 10 37 22 29 25 M11 25 Q19 21 24.5 12.5 M29 25 Q21 21 15.5 12.5" stroke="#92400e" strokeWidth="4.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8.5 9 C11 5.5 15 5 17.5 8 M22.5 8 C25 5 29 5.5 31.5 9" stroke="#c2741f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    {[[7, 14], [13, 7], [27, 7], [33, 14], [20, 19], [10, 21]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.9" fill="#fef3c7" />)}
                </svg>
                <svg className="logo-deco logo-deco-rauten" viewBox="0 0 24 16" aria-hidden="true">
                    <rect width="24" height="16" rx="2" fill="#ffffff" stroke="#bfdbfe" />
                    {[0, 1, 2].map(r => [0, 1, 2, 3].map(c => ((r + c) % 2 === 0 ? <path key={`${r}${c}`} d={`M${c * 6 + 3} ${r * 5.3} L${c * 6 + 6} ${r * 5.3 + 2.65} L${c * 6 + 3} ${r * 5.3 + 5.3} L${c * 6} ${r * 5.3 + 2.65} Z`} fill="#3b82f6" /> : null)))}
                </svg>
            </span>
        );
    }
    return null;
}

function Egg({ className, color, stripe, dots = false }: { className: string; color: string; stripe: string; dots?: boolean }) {
    return (
        <svg className={className} viewBox="0 0 16 20" aria-hidden="true">
            <path d="M8 0.8 C12.5 0.8 15.2 7 15.2 12 C15.2 16.6 12 19.2 8 19.2 C4 19.2 0.8 16.6 0.8 12 C0.8 7 3.5 0.8 8 0.8 Z" fill={color} />
            {dots
                ? [[5, 8], [10.5, 9], [7.5, 13.5], [4.5, 15], [11, 15]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.3" fill={stripe} />)
                : <path d="M1.2 10.5 L4 8.8 L6.5 10.8 L9.2 8.8 L12 10.8 L14.8 9" stroke={stripe} strokeWidth="1.6" fill="none" strokeLinejoin="round" />}
            <ellipse cx="5.2" cy="5.5" rx="1.6" ry="2.6" fill="#ffffff" opacity="0.55" />
        </svg>
    );
}
