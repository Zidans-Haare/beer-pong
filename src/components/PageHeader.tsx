import type { ReactNode } from 'react';

export default function PageHeader({ title, description, eyebrow, actions }: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
    return <header className="page-header">
        <div className="page-header-content">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h1>{title}</h1>
            {description && <div className="page-header-description">{description}</div>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
    </header>;
}