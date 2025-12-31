import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import RegisterForm from './register-form';

export default async function RegisterPage() {
    const session = await auth();

    if (session) {
        redirect('/');
    }

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <RegisterForm />
        </div>
    );
}
