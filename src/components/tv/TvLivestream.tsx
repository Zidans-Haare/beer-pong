'use client';

/**
 * Embeds any stream URL (YouTube Live, Twitch, etc.) in the TV view.
 */
export default function TvLivestream({ roomName }: { roomName: string }) {
    return (
        <iframe
            src={roomName}
            allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                background: '#000',
            }}
            title="Livestream"
        />
    );
}
