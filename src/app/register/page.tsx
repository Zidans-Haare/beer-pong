import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import RegisterForm from './register-form';

export default async function RegisterPage() {
    const session = await auth();

    if (session) {
        redirect('/');
    }

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', padding: 'var(--spacing-8) var(--spacing-4)' }}>
            <RegisterForm />
        </div>
    );
}
