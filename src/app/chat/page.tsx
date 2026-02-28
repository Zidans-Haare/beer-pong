import { getChatMessages } from '@/app/actions/chat';
import { auth } from '@/auth';
import ChatWindow from './chat-window';
import ChatLayout from './chat-layout';

export default async function ChatPage() {
    const [messages, session] = await Promise.all([
        getChatMessages(50),
        auth(),
    ]);

    return (
        <ChatLayout>
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
        </ChatLayout>
    );
}
