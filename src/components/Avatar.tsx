'use client';

import { useState } from 'react';

interface AvatarProps {
    src?: string | null;
    name: string;
    size?: number;
    isGuest?: boolean;
    style?: React.CSSProperties;
}

// Deterministic color based on name
function getAvatarColor(name: string): string {
    const colors = [
        "#006b50",
        "#28647a",
        "#c34232",
        "#08754b",
        "#94600b",
        "#36463e",
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 28, isGuest = false, style = {} }: AvatarProps) {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const hasSrc = !!src;
    const showFallback = !hasSrc || imgError;

    const containerStyle: React.CSSProperties = {
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: isGuest ? "var(--color-primary)" : getAvatarColor(name || ''),
        fontSize: size * 0.4,
        fontWeight: 600,
        color: 'white',
        position: 'relative',
        ...style
    };

    return (
        <div style={containerStyle}>
            {/* Always render fallback initial as background */}
            <span style={{
                position: hasSrc && imgLoaded && !imgError ? 'absolute' : 'static',
                opacity: hasSrc && imgLoaded && !imgError ? 0 : 1
            }}>
                {initial}
            </span>

            {/* Only render img if we have a src and no error */}
            {hasSrc && !imgError && (
                <img
                    src={src}
                    alt=""
                    onLoad={() => setImgLoaded(true)}
                    onError={() => setImgError(true)}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: imgLoaded ? 1 : 0,
                        transition: 'opacity 0.2s ease'
                    }}
                />
            )}
        </div>
    );
}
