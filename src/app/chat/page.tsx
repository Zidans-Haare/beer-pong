import { getChatMessages } from '@/app/actions/chat';
import { auth } from '@/auth';
import ChatWindow from './chat-window';
import ChatLayout from './chat-layout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function ChatPage() {
    const [messages, session] = await Promise.all([
        getChatMessages(50),
        auth(),
    ]);

    return (
        <ChatLayout>
            {/* Compact header */}
            <div style={{ flexShrink: 0, marginBottom: 'var(--spacing-3)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-dim)', flexShrink: 0 }}>
                    <ArrowLeft size={20} />
                </Link>
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
