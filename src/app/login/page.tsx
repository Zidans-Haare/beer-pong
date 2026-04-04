import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoginForm from './login-form';
import { isDemoMode } from '@/lib/demo';
import DemoLoginButton from './demo-login-button';

export default async function LoginPage() {
    const session = await auth();

    if (session) {
        redirect('/');
    }

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            {isDemoMode && (
                <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center', marginBottom: 'var(--spacing-4)' }}>
                    <h1 className="title-gradient" style={{ fontSize: '2rem', marginBottom: 'var(--spacing-2)' }}>Beer Pong</h1>
                    <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginBottom: 'var(--spacing-6)' }}>
                        Tournament Manager — Demo
                    </p>
                </div>
            )}
            <div style={{ width: '100%', maxWidth: '400px' }}>
                {isDemoMode && <DemoLoginButton />}
                <LoginForm />
            </div>
        </div>
    );
}
