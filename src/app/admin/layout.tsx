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
        <div className="admin-layout">
            <AdminNav pendingCount={pendingCount} />

            <div className="admin-main">
                {children}
            </div>
        </div>
    );
}
