import { notFound } from 'next/navigation';
import { isDemoMode } from '@/lib/demo';
import WizardTerminal from './terminal';

export const metadata = {
    title: 'Setup Wizard — Demo',
};

export default function DemoWizardPage() {
    if (!isDemoMode) {
        notFound();
    }

    return (
        <div className="container" style={{ maxWidth: '920px', paddingTop: 'var(--spacing-6)', paddingBottom: 'var(--spacing-8)' }}>
            <h1 className="title-gradient" style={{ marginBottom: 'var(--spacing-2)' }}>
                Setup Wizard
            </h1>
            <p style={{ color: 'var(--color-text-dim)', marginBottom: 'var(--spacing-6)', lineHeight: 1.5 }}>
                This is how self-hosting looks end-to-end. All values shown are placeholders for
                demo purposes — no real keys, domains, or emails.
            </p>
            <WizardTerminal />
        </div>
    );
}
