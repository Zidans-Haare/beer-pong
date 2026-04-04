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
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                {isDemoMode && <DemoLoginButton />}
                <LoginForm />
            </div>
        </div>
    );
}
