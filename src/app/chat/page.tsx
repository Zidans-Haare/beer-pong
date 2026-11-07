import { getChatMessages } from '@/app/actions/chat';
import { auth } from '@/auth';
import ChatWindow from './chat-window';
import ChatLayout from './chat-layout';

// So viele Nachrichten kommen beim Öffnen mit, ältere lädt der Chat beim Hochscrollen nach
const FIRST_PAGE = 50;

export default async function ChatPage() {
    const [messages, session] = await Promise.all([
        getChatMessages(FIRST_PAGE),
        auth(),
    ]);

    return (
        <ChatLayout>
            <ChatWindow
                initialMessages={messages}
                hasOlder={messages.length >= FIRST_PAGE}
                currentUserId={session?.user?.id ?? null}
                isLoggedIn={!!session?.user}
            />
        </ChatLayout>
    );
}
