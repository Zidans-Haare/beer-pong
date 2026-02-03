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
        'linear-gradient(135deg, #FF6B6B 0%, #d946ef 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 28, isGuest = false, style = {} }: AvatarProps) {
    const [imgError, setImgError] = useState(false);

    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const showFallback = !src || imgError;

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
        background: showFallback
            ? (isGuest ? '#9b59b6' : getAvatarColor(name || ''))
            : 'transparent',
        fontSize: size * 0.4,
        fontWeight: 600,
        color: 'white',
        ...style
    };

    if (showFallback) {
        return (
            <div style={containerStyle}>
                {initial}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <img
                src={src!}
                alt=""
                onError={() => setImgError(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
        </div>
    );
}
