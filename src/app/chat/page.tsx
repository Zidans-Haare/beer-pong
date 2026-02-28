import { getChatMessages } from '@/app/actions/chat';
import { auth } from '@/auth';
import ChatWindow from './chat-window';

export default async function ChatPage() {
    const [messages, session] = await Promise.all([
        getChatMessages(50),
        auth(),
    ]);

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-4)' }}>
                Community Chat
            </h1>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)', fontSize: '0.9rem' }}>
                Der globale Chat für alle Beer-Pong-Spieler.
            </p>
            <ChatWindow
                initialMessages={messages}
                currentUserId={session?.user?.id ?? null}
                isLoggedIn={!!session?.user}
            />
        </div>
    );
}
