'use client';

import { useEffect, useRef } from 'react';

// Der Chat läuft als eigener Vollbild-Bildschirm wie in einer Messenger-App: ohne Kopf- und Fußleiste der Seite.
// Seine Höhe folgt dem sichtbaren Bereich (Visual Viewport). Fährt die Tastatur aus, wird der Chat kürzer und die
// Eingabe sitzt direkt über der Tastatur, statt dass die ganze Seite verrutscht.
export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.body.classList.add('chat-open');
        document.documentElement.classList.add('chat-open');
        return () => {
            document.body.classList.remove('chat-open');
            document.documentElement.classList.remove('chat-open');
        };
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const vv = window.visualViewport;
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const height = vv ? vv.height : window.innerHeight;
                // iOS schiebt beim Fokussieren das Fenster nach oben; der Chat folgt, damit er im Bild bleibt
                const top = vv ? vv.offsetTop : 0;
                el.style.height = `${Math.round(height)}px`;
                // Tastatur offen: der Abstand zum Home-Balken entfällt, die Eingabe sitzt direkt auf der Tastatur
                el.classList.toggle('keyboard-open', window.innerHeight - height > 120);
                el.style.transform = top ? `translateY(${Math.round(top)}px)` : '';
                window.dispatchEvent(new Event('chat-viewport'));
            });
        };
        update();
        vv?.addEventListener('resize', update);
        vv?.addEventListener('scroll', update);
        window.addEventListener('resize', update);
        return () => {
            cancelAnimationFrame(frame);
            vv?.removeEventListener('resize', update);
            vv?.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    return <div ref={ref} className="chat-screen">{children}</div>;
}
