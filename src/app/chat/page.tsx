import { getChatMessages } from '@/app/actions/chat';
import { auth } from '@/auth';
import ChatWindow from './chat-window';

export default async function ChatPage() {
    const [messages, session] = await Promise.all([
        getChatMessages(50),
        auth(),
    ]);

    return (
        // On mobile: fill the full viewport minus the bottom nav (90px safe-area padding
        // already applied by layout-shell). We use dvh so browser chrome is excluded.
        // On desktop: max-width container with sensible height.
        <div style={{
            maxWidth: '700px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            // calc: 100dvh minus top-navbar (~60px) minus layout bottom-padding (90px) minus page vertical padding (48px)
            height: 'calc(100dvh - 198px)',
            minHeight: '400px',
        }}>
            {/* Compact header — stays slim so the chat gets maximum space */}
            <div style={{ flexShrink: 0, marginBottom: 'var(--spacing-3)' }}>
                <h1 className="title-gradient" style={{ fontSize: '1.3rem', margin: 0 }}>
                    Community Chat
                </h1>
            </div>

            {/* ChatWindow fills the rest */}
            <ChatWindow
                initialMessages={messages}
                currentUserId={session?.user?.id ?? null}
                isLoggedIn={!!session?.user}
            />
        </div>
    );
}
