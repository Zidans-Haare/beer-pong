import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import AdminNav from './admin-nav';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (session?.user?.email !== process.env.ADMIN_EMAIL) {
        redirect('/');
    }

    const pendingCount = await prisma.user.count({ where: { status: 'PENDING' } });

    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            <AdminNav pendingCount={pendingCount} />

            <main
                className="admin-main"
                style={{
                    flex: 1,
                    padding: 'var(--spacing-6)',
                    maxWidth: '900px',
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                }}
            >
                {children}
            </main>
        </div>
    );
}
